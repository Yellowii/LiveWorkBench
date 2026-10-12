import {ProcessingPipeline} from './processing-pipeline.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {EventBus} from './event-bus.js';
import {ReplayEngine} from './replay-engine.js';
import {MessageDeduplicator} from './message-deduplicator.js';
import {MetricsService} from './metrics-service.js';
import {LogService} from './log-service.js';
import {createHash} from 'node:crypto';
import {Store,RawRecorder} from './storage.js';
import {OfficialParser} from './parser/index.js';
import {SessionManager} from './session-manager.js';
import {TransportUnpacker} from './transport-unpacker.js';
import {parserExtensions} from './parser/extensions.js';
import {CaptureGaps} from './capture-gaps.js';

export class Runtime extends EventBus {
  static async open({dataDir,parser,replayWorker=false}={}){
    const r=new Runtime();r.dataDir=path.resolve(dataDir||'data');await fs.mkdir(r.dataDir,{recursive:true});
    r.store=new Store(r.dataDir);r.gaps=new CaptureGaps(r.store.db,r.dataDir);r.recorder=new RawRecorder(path.join(r.dataDir,'raw'),r.store);
    r.parser=parser||await OfficialParser.open();
    r.unpacker=new TransportUnpacker({native:r.parser.native,index:r.store.protos,payloadDirectory:path.join(r.dataDir,'proto'),readRaw:async(raw,{pathOnly=false}={})=>{
      const file=r.store.raw(raw.rawId)?.filePath;if(!file)throw new Error('RESOURCE_NOT_FOUND');return pathOnly?file:fs.readFile(file);
    }});
    r.sessions=new SessionManager(r.store);r.operations=new Map();r.replays=new Map();
    r.metricsService=new MetricsService();r.metrics=r.metricsService.values;r.logService=new LogService(r.store,r);
    r.deduplicator=new MessageDeduplicator();r.pipeline=new ProcessingPipeline(r);
    if(!replayWorker){r.replayEngine=new ReplayEngine(r,dir=>Runtime.open({dataDir:dir,parser:r.parser,replayWorker:true}));r.replays=r.replayEngine.jobs;}
    const current=r.store.sessions().filter(s=>s.mode==='live'&&s.sessionState!=='ENDED');r.activeRoom=current.length===1?current[0].roomId:null;
    if(current.length>1)r.log('SESSION_SELECTION_REQUIRES_RECONCILIATION');return r;
  }
  log(code,details={}){return this.logService.write(code,details);}
  timing(stage,started,error=false){this.metricsService.timing(stage,started,error);}
  async ingest(input,ack){
    const started=performance.now();let raw;try{raw=await this.recorder.append(input);}catch(error){await this.gaps.record({...input,reason:error.message,stage:'raw',size:input.bytes.length,contentHash:createHash('sha256').update(input.bytes).digest('hex')});try{this.log(error.message,{recordingId:input.recordingId});}catch{}throw error;}finally{this.timing('rawCommit',started,!raw);}this.metrics.inputs++;if(ack)await ack(raw);
    if(input.deferTransport)return raw;
    await this.process(raw,input.bytes);return raw;
  }
  process(...args){return this.pipeline.process(...args);}
  parseProto(...args){return this.pipeline.parseProto(...args);}
  owner(namespace){if(!namespace||namespace==='live')return this;return this.replayEngine?.workers.get(namespace)||this;}
  rawDetail(recordingId,id,namespace){const owner=this.owner(namespace),raw=owner.store.raw(id);if(!raw||raw.recordingId!==recordingId||(namespace&&owner===this&&this.replayEngine&&raw.runtimeNamespace!==namespace))throw new Error('RESOURCE_NOT_FOUND');return {...raw,processing:owner.store.rawTrace(id,namespace)};}
  protoDetail(id,namespace){const owner=this.owner(namespace);if(owner!==this)return owner.protoDetail(id,namespace);const indexed=this.store.protos.get(id);if(!indexed)throw new Error('RESOURCE_NOT_FOUND');const {payloadFile,...metadata}=indexed;return {...metadata,...this.store.protos.contextLink(id,namespace||indexed.runtimeNamespace),attempts:this.store.protos.attempts(id).filter(x=>!namespace||x.runtimeNamespace===namespace)};}
  async reparseMessage(id,namespace){const owner=this.owner(namespace);if(owner!==this)return owner.reparseMessage(id,namespace);const indexed=this.store.protos.get(id);if(!indexed)throw new Error('RESOURCE_NOT_FOUND');const {message,attempt}=await this.parseProto(indexed,namespace||indexed.runtimeNamespace,'manual-reparse');this.log('PROTO_REPARSED',{protoId:id,rawId:indexed.rawId,parseStatus:message.status});return attempt;}
  httpEvidence(raw,bytes){
    let data;try{data=JSON.parse(bytes.toString('utf8'),(_key,value,context)=>typeof value==='number'&&!Number.isSafeInteger(value)&&/^-?\d+$/.test(context?.source||'')?context.source:value);}catch{this.metrics.failed++;this.log('HTTP_PARSE_FAILED',{rawId:raw.rawId});return;}
    if(raw.processName!=='直播伴侣'||raw.httpStatus!==200)return;
    if(data.status_code!==0)return;
    const room=data.data;const isCreate=raw.urlPath?.endsWith('/room/create');
    const roomId=isCreate?room?.id_str:room?.owner?.own_room?.room_ids_str?.[0];
    if(!roomId)return;
    const anchorUid=room.owner?.id_str||null;
    if(isCreate)this.captureTargets?.observeHttp(raw,{roomId:String(roomId),anchorUid:anchorUid?String(anchorUid):null,secUid:room.owner?.sec_uid||null,platformLiveState:room.status===2?'LIVE':'UNKNOWN'});
    const known=this.sessions.find(String(roomId),raw.runtimeNamespace);
    const ended=!isCreate&&raw.urlPath?.endsWith('/anchor_finish_info');
    if(!isCreate&&!ended)return;
    if(ended&&!known){this.log('LIFECYCLE_CONTEXT_UNRESOLVED',{rawId:raw.rawId});return;}
    if(isCreate&&known?.sessionState==='ENDED'){this.log('ROOM_REUSE_REQUIRES_RECONCILIATION',{rawId:raw.rawId});return;}
    this.publish({...raw,anchorUid:anchorUid||raw.anchorUid},{method:isCreate?'RoomCreatedObserved':'PlatformLiveEndObserved',status:'decoded',data:{common:{room_id:String(roomId)},platformStatus:room.status??null}},{created:isCreate,live:isCreate&&room.status===2,ended:Boolean(ended)});
  }
  publish(raw,message,evidence={}){
    if(raw.mode==='live'&&this.activeSourceEpoch&&(raw.sourceEpoch!==this.activeSourceEpoch||raw.sourceType!==this.selectedSource)){this.log('STALE_SOURCE_RAW_RETAINED',{rawId:raw.rawId});return;}
    const official=message.data||null;const common=official?.common||{};
    this.contexts??=new Map();
    const contextKey=JSON.stringify([raw.mode,raw.runtimeNamespace,raw.sourceType,raw.sourceEpoch,raw.sourceConnectionId||raw.recordingId]);
    const context=this.contexts.get(contextKey),commonRoom=common.room_id&&common.room_id!=='0'?String(common.room_id):null;
    let roomId=commonRoom||raw.observedRoomId||context?.roomId||null;
    let anchorUid=raw.anchorUid||context?.anchorUid||null;
    if(raw.mode==='live'&&raw.sourceType==='LiveHookSource'&&this.captureTargets){const match=this.captureTargets.match(raw,{roomId,anchorUid,businessDecoded:message.status==='decoded'});if(!match.allowed){this.log('HOOK_PROFILE_INPUT_RETAINED',{rawId:raw.rawId,reason:this.captureTargets.view().reason});return;}roomId=match.roomId;anchorUid=match.anchorUid;}
    if(raw.observedRoomId&&common.room_id&&common.room_id!=='0'&&String(common.room_id)!==raw.observedRoomId){this.log('ROOM_CONTEXT_CONFLICT',{rawId:raw.rawId});return;}
    const known=this.sessions.find(roomId,raw.runtimeNamespace);
    const isControlEnd=message.method==='WebcastControlMessage'&&Number(official?.action)===3;
    if(raw.mode==='live'&&roomId){
      if(this.activeRoom&&this.activeRoom!==roomId){this.log('OTHER_ROOM_REJECTED',{rawId:raw.rawId});return;}
      if(known?.sessionState==='ENDED'){
        if(isControlEnd){this.metrics.duplicates++;return;}
        this.log('ENDED_ROOM_INPUT_RETAINED',{rawId:raw.rawId});return;
      }
      if(!isControlEnd&&!evidence.ended)this.activeRoom=roomId;
    }
    const associatedEnd=isControlEnd&&Boolean(known)&&(raw.mode!=='live'||this.activeRoom===roomId);
    if(isControlEnd&&!known)this.log('LIFECYCLE_CONTEXT_UNRESOLVED',{rawId:raw.rawId});
    const session=this.sessions.observe({roomId,anchorUid,mode:raw.mode,namespace:raw.runtimeNamespace,...evidence,ended:Boolean(evidence.ended||associatedEnd),evidenceRef:raw.rawId,observedAt:raw.receivedAt});
    if(session&&session.sessionState!=='ENDED'){this.contexts.set(contextKey,{roomId,anchorUid:session.anchorUid});if(this.contexts.size>1024)this.contexts.delete(this.contexts.keys().next().value);}
    if(session)this.emit('session.updated',session);
    if(session?.sessionState==='ENDED'&&raw.mode==='live'&&raw.sourceType==='LiveHookSource')this.captureTargets?.ended(raw,roomId,session.anchorUid);
    const msgId=common.msg_id?String(common.msg_id):message.msg_id&&message.msg_id!=='0'?String(message.msg_id):null;
    const key=this.deduplicator.key({namespace:raw.runtimeNamespace,roomId,anchorUid:session?.anchorUid||raw.anchorUid,method:message.method,msgId});
    const {extensions,occurredAt}=parserExtensions({official,raw,message,roomId,commonRoom,isControlEnd,associatedEnd});
    const event={schemaVersion:'1',eventType:message.method,producer:'OfficialParser',origin:raw.format==='http-json'?'derived':'platform',mode:raw.mode,runtimeNamespace:raw.runtimeNamespace,streamId:raw.runtimeNamespace,sourceType:raw.sourceType,sourceEpoch:raw.sourceEpoch,captureId:raw.recordingId,anchorUid:session?.anchorUid||null,roomId,sessionId:session?.sessionId||null,msgId,userId:official?.user?.id_str||official?.user?.id||null,receivedAt:raw.receivedAt,occurredAt,rawRefs:[raw.rawId],payload:{decodeStatus:message.status,official,extensions}};
    if(raw.mode==='live'&&roomId===this.activeRoom&&(extensions.lifecycleCandidate==='platform-ended'||message.method==='PlatformLiveEndObserved'))this.activeRoom=null;
    const saved=this.commit(event,key,this.store);if(saved.duplicate){this.metrics.duplicates++;return saved.event;}
    if(message.status==='decoded')this.metrics.decoded++;else if(message.status==='unknown')this.metrics.unknown++;else if(message.status==='error')this.metrics.failed++;
    this.metrics.events++;return saved.event;
  }
  interruptCapture(){this.sessions.interrupt();this.log('CAPTURE_INTERRUPTED');}
  observePlatformEvidence(evidence){
    if(evidence.confirmedState!=='ENDED'||evidence.queryState!=='ENDED'||evidence.evidence?.source!=='douyin-structured-room')return null;
    const known=this.sessions.find(evidence.roomId,'live');if(!known||known.mode!=='live'||known.anchorUid!==evidence.anchorUid||this.activeRoom!==evidence.roomId)return null;
    if(known.sessionState==='ENDED')return known;
    const reference=`monitor:${evidence.profileId}:${evidence.stateVersion}`,state=this.sessions.observe({roomId:evidence.roomId,anchorUid:evidence.anchorUid,ended:true,evidenceRef:reference,observedAt:evidence.checkedAt});this.activeRoom=null;this.emit('session.updated',state);
    this.commit({schemaVersion:'1',eventType:'PlatformLiveEndObserved',producer:'MonitorCoordinator',origin:'monitor',mode:'live',runtimeNamespace:'live',streamId:'live',sourceType:this.selectedSource||null,sourceEpoch:this.activeSourceEpoch||null,captureId:null,anchorUid:state.anchorUid,roomId:state.roomId,sessionId:state.sessionId,msgId:null,userId:null,receivedAt:evidence.checkedAt,occurredAt:evidence.checkedAt,rawRefs:[],payload:{official:null,extensions:{lifecycleCandidate:'platform-ended',platformEvidence:{source:evidence.evidence.source,profileId:evidence.profileId,stateVersion:evidence.stateVersion,reference}}}},`monitor-end:${state.sessionId}`,this.store);return state;
  }
  createReplay(input){return this.replayEngine.create(input);}
  replayView(id){return this.replayEngine.view(id);}
  replayAction(...args){return this.replayEngine.action(...args);}
  async close(){if(this.closed)return;this.closed=true;await this.replayEngine?.close();this.store.close();}
}
