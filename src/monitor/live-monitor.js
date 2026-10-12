import {EventEmitter} from 'node:events';
import {randomUUID} from 'node:crypto';
import {DouyinMonitorAdapter} from './douyin-adapter.js';
export class LiveMonitor extends EventEmitter{
 constructor(profiles,adapter=new DouyinMonitorAdapter()){super();this.profiles=profiles;this.adapter=adapter;this.pending=new Map();this.tasks=new Map();this.closed=false;}
 view(id){const {candidate,...view}=this.profiles.state(id)||{profileId:id,confirmedState:'UNKNOWN',queryState:'UNKNOWN',stateVersion:'0',failures:0,pushState:'UNKNOWN'};return view;}
 list(){return this.profiles.all().map(p=>this.view(p.profileId));}
 check(id){if(this.pending.has(id))return this.pending.get(id);const job=this.detect(id).finally(()=>this.pending.delete(id));this.pending.set(id,job);return job;}
 async detect(id){const profile=this.profiles.get(id),previous=this.profiles.state(id)||this.view(id),evidence=await this.adapter.probe(profile,{signal:this.tasks.get(id)?.controller.signal});if(this.closed)return this.view(id);
  let current;try{current=this.profiles.get(id);}catch{return previous;}if(current.version!==profile.version)return this.view(id);
  const now=new Date().toISOString();let next={...previous,profileId:id,profileVersion:profile.version,checkedAt:now,queryState:evidence.state,pushState:'UNKNOWN',errorCode:evidence.errorCode||null};let changed=false;
  if(!['LIVE','ENDED'].includes(evidence.state)){next.failures=(previous.failures||0)+1;next.candidate=null;next.confirmationCount=0;}
  else{
   next.failures=0;next.lastSuccessAt=now;next.evidence={source:evidence.source||'unknown',anchorUid:evidence.anchorUid||null,secUid:evidence.secUid||null,roomId:evidence.roomId||null,web_rid:evidence.web_rid||null,pushState:'UNKNOWN'};
   const candidate=JSON.stringify([evidence.state,evidence.roomId,evidence.anchorUid]);next.confirmationCount=previous.candidate===candidate?(previous.confirmationCount||0)+1:1;next.candidate=candidate;
   if(next.confirmationCount>=profile.confirmations&&(previous.confirmedState!==evidence.state||previous.roomId!==evidence.roomId||previous.anchorUid!==evidence.anchorUid)){
    next={...next,confirmedState:evidence.state,roomId:evidence.roomId||null,anchorUid:evidence.anchorUid||null,web_rid:evidence.web_rid||null,lastTransitionAt:now,stateVersion:String(BigInt(previous.stateVersion||'0')+1n)};changed=true;
   }
  }
  next.nextDelayMs=Math.min(3600000,profile.pollMs*2**Math.min(next.failures,6));this.profiles.setState(id,next);this.emit('monitor.updated',this.view(id));
  if(changed)this.emit('monitor.event',{schemaVersion:'1',operationId:randomUUID(),profileId:id,profileVersion:profile.version,stateVersion:next.stateVersion,state:next.confirmedState,anchorUid:next.anchorUid,roomId:next.roomId,web_rid:next.web_rid,observedAt:now,pushState:'UNKNOWN',evidence:next.evidence});return this.view(id);
 }
 sync(){if(this.closed)return;const enabled=new Set(this.profiles.all().filter(p=>p.enabled&&p.monitorEnabled).map(p=>p.profileId));for(const [id,task] of this.tasks)if(!enabled.has(id)){clearTimeout(task.timer);task.controller.abort();this.tasks.delete(id);}
  for(const id of enabled)if(!this.tasks.has(id)){const task={controller:new AbortController()};this.tasks.set(id,task);const tick=async()=>{if(this.closed||this.tasks.get(id)!==task)return;try{await this.check(id);}catch{this.emit('monitor.error',{profileId:id,code:'MONITOR_TASK_FAILED'});}if(!this.closed&&this.tasks.get(id)===task){task.timer=setTimeout(tick,this.view(id).nextDelayMs||this.profiles.get(id).pollMs);task.timer.unref();}};task.timer=setTimeout(tick,100);task.timer.unref();}
 }
 async close(){this.closed=true;for(const task of this.tasks.values()){clearTimeout(task.timer);task.controller.abort();}this.tasks.clear();await Promise.allSettled([...this.pending.values()]);}
}
