import fs from 'node:fs/promises';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {randomUUID,createHash} from 'node:crypto';
import {Store,RawRecorder} from './storage.js';
import {OfficialParser} from './parser/index.js';
import {SessionManager} from './session-manager.js';
import {TransportUnpacker} from './transport-unpacker.js';
import {parserExtensions} from './parser/extensions.js';
import {CaptureGaps} from './capture-gaps.js';

export class Runtime extends EventEmitter {
  static async open({dataDir}={}){const r=new Runtime();r.dataDir=path.resolve(dataDir||'data');await fs.mkdir(r.dataDir,{recursive:true});r.store=new Store(r.dataDir);r.gaps=new CaptureGaps(r.store.db,r.dataDir);r.recorder=new RawRecorder(path.join(r.dataDir,'raw'),r.store);r.parser=await OfficialParser.open();r.unpacker=new TransportUnpacker({native:r.parser.native,index:r.store.protos,payloadDirectory:path.join(r.dataDir,'proto'),readRaw:async(raw,{pathOnly=false}={})=>{const file=r.store.raw(raw.rawId)?.filePath;if(!file)throw new Error('RESOURCE_NOT_FOUND');return pathOnly?file:fs.readFile(file);}});r.sessions=new SessionManager(r.store);r.replays=new Map();r.operations=new Map();r.metrics={inputs:0,decoded:0,unknown:0,failed:0,duplicates:0,events:0};const current=r.store.sessions().filter(s=>s.mode==='live'&&s.sessionState!=='ENDED');r.activeRoom=current.length===1?current[0].roomId:null;if(current.length>1)r.log('SESSION_SELECTION_REQUIRES_RECONCILIATION');return r;}
  log(code,details={}){const log=this.store.log(code,details);this.emit('log.appended',log);}
  timing(stage,started,error=false){this.metrics.timings??={};const value=this.metrics.timings[stage]??={count:0,errors:0,totalMs:0,maxMs:0};const duration=performance.now()-started;value.count++;value.errors+=error?1:0;value.totalMs+=duration;value.maxMs=Math.max(value.maxMs,duration);value.lastMs=duration;}
  async ingest(input,ack){
    const started=performance.now();let raw;try{raw=await this.recorder.append(input);}catch(error){await this.gaps.record({...input,reason:error.message,stage:'raw',size:input.bytes.length,contentHash:createHash('sha256').update(input.bytes).digest('hex')});try{this.log(error.message,{recordingId:input.recordingId});}catch{}throw error;}finally{this.timing('rawCommit',started,!raw);}this.metrics.inputs++;if(ack)await ack(raw);
    if(input.deferTransport)return raw;
    await this.process(raw,input.bytes);return raw;
  }
  async process(raw,bytes,transport){
    const started=performance.now();let error=false;
    try{
      if(raw.format==='http-json'){const persisted=await this.unpacker.readRaw(raw);if(createHash('sha256').update(persisted).digest('hex')!==raw.contentHash)throw new Error('RAW_HASH_MISMATCH');return this.httpEvidence(raw,persisted);}
      const unpacked=await this.unpacker.unpack(raw,{transport});
      if(unpacked.status==='error'){error=true;this.log(unpacked.errorCode,{rawId:raw.rawId,stage:unpacked.stage});this.publish(raw,{method:'ParseFailed',status:'error'});return;}
      for(const indexed of unpacked.messages){
        const {message,attempt}=await this.parseProto(indexed,raw.runtimeNamespace,'pipeline');
        if(message.status==='error')error=true;const event=this.publish(raw,message);
        this.store.protos.update(indexed.protoId,{parseStatus:message.status,errorCode:message.errorCode,eventId:event?.eventId||null,attemptId:attempt.attemptId},raw.runtimeNamespace);
      }
    }catch{error=true;this.log('PARSE_FAILED',{rawId:raw.rawId});this.publish(raw,{method:'ParseFailed',status:'error'});}finally{this.timing('parse',started,error);}
  }
  async parseProto(indexed,runtimeNamespace,origin){
    let message;const started=performance.now();
    try{message=this.parser.parseBusiness(indexed,await this.unpacker.readPayload(indexed.protoId));}
    catch(error){message={method:indexed.method,msg_id:indexed.msgId,status:'error',data:null,errorCode:error.message==='PROTO_PAYLOAD_HASH_MISMATCH'?error.message:'PROTO_PAYLOAD_READ_FAILED',parserVersion:this.parser.version};}
    this.timing('businessParse',started,message.status==='error');
    const attempt=this.store.protos.attempt({protoId:indexed.protoId,rawId:indexed.rawId,runtimeNamespace,origin,parseStatus:message.status,errorCode:message.errorCode,parserVersion:message.parserVersion,payloadHash:indexed.payloadHash,official:message.data});
    return {message,attempt};
  }
  protoDetail(id){const indexed=this.store.protos.get(id);if(!indexed)throw new Error('RESOURCE_NOT_FOUND');const {payloadFile,...metadata}=indexed;return {...metadata,attempts:this.store.protos.attempts(id)};}
  async reparseMessage(id){const indexed=this.store.protos.get(id);if(!indexed)throw new Error('RESOURCE_NOT_FOUND');const {message,attempt}=await this.parseProto(indexed,indexed.runtimeNamespace,'manual-reparse');this.log('PROTO_REPARSED',{protoId:id,rawId:indexed.rawId,parseStatus:message.status});return attempt;}
  httpEvidence(raw,bytes){
    let data;try{data=JSON.parse(bytes.toString('utf8'),(_key,value,context)=>typeof value==='number'&&!Number.isSafeInteger(value)&&/^-?\d+$/.test(context?.source||'')?context.source:value);}catch{this.metrics.failed++;this.log('HTTP_PARSE_FAILED',{rawId:raw.rawId});return;}
    if(raw.processName!=='直播伴侣'||raw.httpStatus!==200)return;
    if(data.status_code!==0)return;
    const room=data.data;const isCreate=raw.urlPath?.endsWith('/room/create');
    const roomId=isCreate?room?.id_str:room?.owner?.own_room?.room_ids_str?.[0];
    if(!roomId)return;
    const anchorUid=room.owner?.id_str||null;
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
    const roomId=commonRoom||raw.observedRoomId||context?.roomId||null;
    const anchorUid=raw.anchorUid||context?.anchorUid||null;
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
    const msgId=common.msg_id?String(common.msg_id):message.msg_id&&message.msg_id!=='0'?String(message.msg_id):null;
    const key=message.method==='RoomCreatedObserved'||message.method==='PlatformLiveEndObserved'?JSON.stringify([raw.runtimeNamespace,roomId,message.method]):msgId&&msgId!=='0'&&roomId?JSON.stringify([raw.runtimeNamespace,session?.anchorUid||raw.anchorUid,roomId,message.method,msgId]):null;
    const {extensions,occurredAt}=parserExtensions({official,raw,message,roomId,commonRoom,isControlEnd,associatedEnd});
    const event={schemaVersion:'1',eventType:message.method,producer:'OfficialParser',origin:raw.format==='http-json'?'derived':'platform',mode:raw.mode,runtimeNamespace:raw.runtimeNamespace,streamId:raw.runtimeNamespace,sourceType:raw.sourceType,sourceEpoch:raw.sourceEpoch,captureId:raw.recordingId,anchorUid:session?.anchorUid||null,roomId,sessionId:session?.sessionId||null,msgId,userId:official?.user?.id_str||official?.user?.id||null,receivedAt:raw.receivedAt,occurredAt,rawRefs:[raw.rawId],payload:{decodeStatus:message.status,official,extensions}};
    if(raw.mode==='live'&&roomId===this.activeRoom&&(extensions.lifecycleCandidate==='platform-ended'||message.method==='PlatformLiveEndObserved'))this.activeRoom=null;
    const saved=this.store.addEvent(event,key);if(saved.duplicate){this.metrics.duplicates++;return saved.event;}
    if(message.status==='decoded')this.metrics.decoded++;else if(message.status==='unknown')this.metrics.unknown++;else if(message.status==='error')this.metrics.failed++;
    this.metrics.events++;this.emit('events.appended',saved.event);return saved.event;
  }
  interruptCapture(){this.sessions.interrupt();this.log('CAPTURE_INTERRUPTED');}
  async createReplay({recordingId}){
    const items=this.store.rawFor(recordingId);if(!items.length)throw new Error('RESOURCE_NOT_FOUND');
    const replayId=randomUUID(),state={replayId,runtimeNamespace:`replay:${replayId}`,position:0,total:items.length,status:'paused',stateVersion:'1',speed:1};
    this.replays.set(replayId,{...state,items,timer:null,generation:0,actions:Promise.resolve(),inFlight:null});return state;
  }
  replayView(id){const r=this.replays.get(id);if(!r)return null;const{items,timer,generation,actions,inFlight,...view}=r;return view;}
  async replayAction(id,action,target,expectedVersion,speed){
    const r=this.replays.get(id);if(!r)throw new Error('RESOURCE_NOT_FOUND');
    const task=r.actions.catch(()=>{}).then(()=>{if(expectedVersion&&expectedVersion!==r.stateVersion)throw new Error('STATE_CONFLICT');if(speed!==undefined)r.speed=Math.max(0.1,Math.min(100,Number(speed)||1));return this.controlReplay(r,action,target);});
    r.actions=task;return task;
  }
  async controlReplay(r,action,target){
    if(this.closed)throw new Error('RUNTIME_CLOSED');
    const id=r.replayId;r.generation++;
    clearTimeout(r.timer);r.timer=null;
    if(r.inFlight)await r.inFlight;
    if(action==='pause'||action==='stop'){r.status=action==='stop'?'stopped':'paused';}
    else if(action==='step'){await this.replayStep(r);r.status='paused';}
    else if(action==='seek'||action==='rebuild'){
      const end=Math.max(0,Math.min(r.total,Number(target)||0));r.runtimeNamespace=`replay:${id}:rebuild:${randomUUID()}`;r.position=0;r.status='rebuilding';
      while(r.position<end&&!this.closed)await this.replayStep(r);r.status='paused';
    }else if(action==='play'){r.status='playing';this.play(r);}
    else throw new Error('INVALID_ARGUMENT');
    r.stateVersion=String(Number(r.stateVersion)+1);const view=this.replayView(id);this.emit('replay.updated',view);return view;
  }
  async replayStep(r){if(r.position>=r.total){r.status='finished';return;}const original=r.items[r.position];const bytes=await fs.readFile(original.filePath);if(createHash('sha256').update(bytes).digest('hex')!==original.contentHash){r.status='failed';r.stateVersion=String(BigInt(r.stateVersion)+1n);this.log('REPLAY_RAW_HASH_MISMATCH',{rawId:original.rawId,replayId:r.replayId});this.emit('replay.updated',this.replayView(r.replayId));throw new Error('RAW_HASH_MISMATCH');}await this.process({...original,mode:'replay',runtimeNamespace:r.runtimeNamespace},bytes);r.position++;}
  play(r){const generation=r.generation;r.timer=setTimeout(async()=>{if(this.closed||r.status!=='playing'||generation!==r.generation)return;r.inFlight=this.replayStep(r);try{await r.inFlight;if(r.position>=r.total)r.status='finished';this.emit('replay.updated',this.replayView(r.replayId));if(!this.closed&&generation===r.generation&&r.status==='playing')this.play(r);}catch{r.status='failed';this.log('REPLAY_FAILED',{replayId:r.replayId});}finally{r.inFlight=null;}},Math.max(1,100/Math.max(0.1,Number(r.speed)||1)));}
  async close(){if(this.closed)return;this.closed=true;for(const r of this.replays.values()){r.generation++;clearTimeout(r.timer);}await Promise.allSettled([...this.replays.values()].flatMap(r=>[r.actions,r.inFlight].filter(Boolean)));this.store.close();}
}
