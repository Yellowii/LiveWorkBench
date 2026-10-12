import {EventEmitter} from 'node:events';
import {randomUUID} from 'node:crypto';
const signalKey=(p,s)=>JSON.stringify([p.profileId,p.version,s.stateVersion,s.anchorUid,s.roomId]);
const terminal=new Set(['WEB_DYNAMIC_PARAMETERS_UNAVAILABLE','WEB_DYNAMIC_PARAMETERS_EXPIRED','WEB_HANDSHAKE_OR_POLICY_BLOCKED','TARGET_MAPPING_REQUIRED','TARGET_IDENTITY_UNRESOLVED','BROWSER_NOT_PREPARED','LIVEHOOK_ENVIRONMENT_NOT_READY']);
export class MonitorCoordinator extends EventEmitter{
 constructor({profiles,monitor,sources,onPlatformEvidence=()=>{},log=()=>{}}){super();this.profiles=profiles;this.monitor=monitor;this.sources=sources;this.onPlatformEvidence=onPlatformEvidence;this.log=log;this.queue=Promise.resolve();this.closed=false;this.state=profiles.repository.getState('coordinator-v1')||{active:null,suppressed:{},attempts:{},history:[],reason:null};
  this.changed=()=>{clearTimeout(this.timer);this.timer=setTimeout(()=>this.evaluate().catch(()=>this.record('COORDINATOR_FAILED')),30);this.timer.unref();};monitor.on('monitor.updated',this.changed);
 }
 view(){const {suppressed,attempts,...publicState}=this.state;return structuredClone(publicState);}
 save(){this.profiles.repository.setState('coordinator-v1',this.state);this.emit('coordinator.updated',this.view());}
 record(code,details={}){this.state.reason=code;this.state.history.push({operationId:randomUUID(),code,...details,at:new Date().toISOString()});this.state.history=this.state.history.slice(-100);this.log(code,details);this.save();}
 serialize(fn){const task=this.queue.catch(()=>{}).then(()=>{if(this.closed)throw new Error('COORDINATOR_CLOSED');return fn();});this.queue=task;return task;}
 evaluate(){return this.serialize(()=>this.run());}
 async run(choice){
  const source=this.sources.view(),active=this.state.active;
  if(active){let p;try{p=this.profiles.get(active.profileId);}catch{}const evidence=this.monitor.view(active.profileId);
   if(source.selectedSource!==active.sourceType){this.state.active=null;this.record('PROFILE_SOURCE_CHANGED',{profileId:active.profileId});return;}
   if(p?.autoStop&&evidence.queryState==='ENDED'&&evidence.confirmedState==='ENDED'&&evidence.roomId===active.roomId&&evidence.anchorUid===active.anchorUid){await this.sources.stopProfile(active.sourceVersion);this.onPlatformEvidence({...evidence,origin:'monitor',profileId:p.profileId});this.state.active=null;this.record('PROFILE_ENDED_STOP',{profileId:p.profileId});return;}
   if(!['STOPPED','FAILED'].includes(source.captureState))return this.view();
   if(source.captureState==='FAILED'&&this.sources.failureReason?.()==='WEB_HANDSHAKE_OR_POLICY_BLOCKED'){const attempt=this.state.attempts[active.profileId];if(attempt)attempt.terminal=true;this.state.active=null;this.record('WEB_HANDSHAKE_OR_POLICY_BLOCKED',{profileId:active.profileId});return this.view();}
   if(p&&!p.autoReconnect){this.record('PROFILE_RECONNECT_DISABLED',{profileId:p.profileId});return;}this.state.active=null;this.save();
  }
  if(!['STOPPED','FAILED'].includes(source.captureState)){this.state.reason='SOURCE_BUSY';this.save();return this.view();}
  const candidates=this.profiles.all().filter(p=>p.enabled&&(choice?p.profileId===choice:p.autoStart)&&p.sourceType===source.selectedSource).map(p=>({p,s:this.monitor.view(p.profileId)})).filter(({p,s})=>s.confirmedState==='LIVE'&&s.queryState==='LIVE'&&s.profileVersion===p.version&&s.roomId&&s.anchorUid&&Date.now()-Date.parse(s.checkedAt)<p.pollMs*2&&this.state.suppressed[p.profileId]!==signalKey(p,s));
  candidates.sort((a,b)=>b.p.priority-a.p.priority);
  if(!candidates.length){this.state.reason='NO_MATCHING_READY_PROFILE';this.save();return this.view();}
  if(!choice&&candidates.length>1&&candidates[0].p.priority===candidates[1].p.priority){this.record('PROFILE_SELECTION_REQUIRED',{profileIds:candidates.filter(x=>x.p.priority===candidates[0].p.priority).map(x=>x.p.profileId)});return this.view();}
  const {p,s}=candidates[0],key=signalKey(p,s),attempt=this.state.attempts[p.profileId];
  if(attempt?.key===key&&(attempt.terminal||attempt.count>p.retryLimit||Date.now()<attempt.nextAt))return this.view();
  const op={key,count:attempt?.key===key?attempt.count+1:1,nextAt:Date.now()+p.cooldownMs};this.state.attempts[p.profileId]=op;this.save();
  try{
   const result=await this.sources.startProfile(p,s,source.stateVersion,()=>this.profiles.get(p.profileId).version===p.version);
   this.state.active={profileId:p.profileId,profileVersion:p.version,anchorUid:s.anchorUid,roomId:s.roomId,stateVersion:s.stateVersion,sourceType:p.sourceType,sourceVersion:result.stateVersion};this.record('PROFILE_LISTEN_STARTED',{profileId:p.profileId});
  }catch(error){const code=/^(?:WEB_|BROWSER_|LIVEHOOK_|SOURCE_|STATE_|TARGET_|PROFILE_)[A-Z_]+$/.test(error.message)?error.message:'PROFILE_START_FAILED';op.terminal=terminal.has(code);op.nextAt=Date.now()+Math.min(3600000,p.cooldownMs*2**Math.min(op.count-1,6));this.record(code,{profileId:p.profileId});}
  return this.view();
 }
 start(id){return this.serialize(async()=>{const p=this.profiles.get(id);delete this.state.suppressed[id];delete this.state.attempts[id];if(!p.enabled)throw new Error('PROFILE_DISABLED');return this.run(id);});}
 suppress(){for(const p of this.profiles.all()){const s=this.monitor.view(p.profileId);if(s.confirmedState==='LIVE')this.state.suppressed[p.profileId]=signalKey(p,s);}this.state.active=null;this.record('PROFILE_MANUAL_STOP');}
 manualStop(){return this.serialize(async()=>{await this.sources.stopProfile();this.suppress();return this.view();});}
 async close(){this.closed=true;clearTimeout(this.timer);this.monitor.off('monitor.updated',this.changed);await this.queue.catch(()=>{});}
}
