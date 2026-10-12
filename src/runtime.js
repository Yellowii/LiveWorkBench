import fs from 'node:fs/promises';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {randomUUID} from 'node:crypto';
import {Store,RawRecorder} from './storage.js';
import {OfficialParser} from './parser/index.js';
import {SessionManager} from './session-manager.js';

export class Runtime extends EventEmitter {
  static async open({dataDir}={}){const r=new Runtime();r.dataDir=path.resolve(dataDir||'data');await fs.mkdir(r.dataDir,{recursive:true});r.store=new Store(r.dataDir);r.recorder=new RawRecorder(path.join(r.dataDir,'raw'),r.store);r.parser=await OfficialParser.open();r.sessions=new SessionManager(r.store);r.replays=new Map();r.operations=new Map();r.metrics={inputs:0,decoded:0,unknown:0,failed:0,duplicates:0,events:0};const current=r.store.sessions().filter(s=>s.mode==='live'&&s.sessionState!=='ENDED');r.activeRoom=current.length===1?current[0].roomId:null;if(current.length>1)r.log('SESSION_SELECTION_REQUIRES_RECONCILIATION');return r;}
  log(code,details={}){const log=this.store.log(code,details);this.emit('log.appended',log);}
  async ingest(input,ack){
    const raw=await this.recorder.append(input);this.metrics.inputs++;if(ack)await ack(raw);
    if(input.deferTransport)return raw;
    await this.process(raw,input.bytes);return raw;
  }
  async process(raw,bytes,transport){
    try{
      if(raw.format==='http-json')return this.httpEvidence(raw,bytes);
      const messages=transport?this.parser.decodeTransport(transport):this.parser.decode({...raw,bytes});
      for(const message of messages)this.publish(raw,message);
    }catch{this.metrics.failed++;this.log('PARSE_FAILED',{rawId:raw.rawId});this.publish(raw,{method:'ParseFailed',status:'error'});}
  }
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
    const official=message.data||null;const common=official?.common||{};
    const roomId=common.room_id?String(common.room_id):null;
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
    const session=this.sessions.observe({roomId,anchorUid:raw.anchorUid,mode:raw.mode,namespace:raw.runtimeNamespace,...evidence,ended:Boolean(evidence.ended||associatedEnd),evidenceRef:raw.rawId,observedAt:raw.receivedAt});
    if(session)this.emit('session.updated',session);
    const msgId=common.msg_id?String(common.msg_id):message.msg_id&&message.msg_id!=='0'?String(message.msg_id):null;
    const key=message.method==='RoomCreatedObserved'||message.method==='PlatformLiveEndObserved'?JSON.stringify([raw.runtimeNamespace,roomId,message.method]):msgId&&msgId!=='0'?JSON.stringify([raw.runtimeNamespace,session?.anchorUid||raw.anchorUid,roomId,message.method,msgId]):null;
    const extensions={};if(official?.user?.webcast_uid)extensions.userIdAlias=official.user.webcast_uid;
    const seconds=Number(common.create_time),milliseconds=seconds*1000;
    const validTime=Number.isFinite(milliseconds)&&Math.abs(milliseconds)<=8.64e15&&Number.isSafeInteger(seconds)&&seconds>0;
    const occurredAt=validTime?new Date(milliseconds).toISOString():null;
    if(common.create_time&&!validTime)extensions.occurredAtReason='OFFICIAL_TIME_NOT_REPRESENTABLE_AS_SECONDS';
    if(raw.originalSequence)extensions.originalSequence=raw.originalSequence;
    if(raw.indexMsgId)extensions.indexMsgId=raw.indexMsgId;
    if(isControlEnd)extensions.lifecycleCandidate=associatedEnd?'platform-ended':'unassociated-platform-end';
    const event={schemaVersion:'1',eventType:message.method,producer:'OfficialParser',origin:raw.format==='http-json'?'derived':'platform',mode:raw.mode,runtimeNamespace:raw.runtimeNamespace,streamId:raw.runtimeNamespace,sourceType:raw.sourceType,sourceEpoch:raw.sourceEpoch,captureId:raw.recordingId,anchorUid:session?.anchorUid||null,roomId,sessionId:session?.sessionId||null,msgId,userId:official?.user?.id_str||official?.user?.id||null,receivedAt:raw.receivedAt,occurredAt,rawRefs:[raw.rawId],payload:{decodeStatus:message.status,official,extensions}};
    if(raw.mode==='live'&&roomId===this.activeRoom&&(extensions.lifecycleCandidate==='platform-ended'||message.method==='PlatformLiveEndObserved'))this.activeRoom=null;
    const saved=this.store.addEvent(event,key);if(saved.duplicate){this.metrics.duplicates++;return;}
    if(message.status==='decoded')this.metrics.decoded++;else if(message.status==='unknown')this.metrics.unknown++;
    this.metrics.events++;this.emit('events.appended',saved.event);
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
  async replayStep(r){if(r.position>=r.total){r.status='finished';return;}const original=r.items[r.position];const bytes=await fs.readFile(original.filePath);await this.process({...original,mode:'replay',runtimeNamespace:r.runtimeNamespace},bytes);r.position++;}
  play(r){const generation=r.generation;r.timer=setTimeout(async()=>{if(this.closed||r.status!=='playing'||generation!==r.generation)return;r.inFlight=this.replayStep(r);try{await r.inFlight;if(r.position>=r.total)r.status='finished';this.emit('replay.updated',this.replayView(r.replayId));if(!this.closed&&generation===r.generation&&r.status==='playing')this.play(r);}catch{r.status='failed';this.log('REPLAY_FAILED',{replayId:r.replayId});}finally{r.inFlight=null;}},Math.max(1,100/Math.max(0.1,Number(r.speed)||1)));}
  async close(){if(this.closed)return;this.closed=true;for(const r of this.replays.values()){r.generation++;clearTimeout(r.timer);}await Promise.allSettled([...this.replays.values()].flatMap(r=>[r.actions,r.inFlight].filter(Boolean)));this.store.close();}
}
