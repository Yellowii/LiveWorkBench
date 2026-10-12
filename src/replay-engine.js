import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {HistoryQuery} from './history-query.js';
import {existsSync} from 'node:fs';
export class ReplayEngine {
 constructor(runtime,factory){this.runtime=runtime;this.factory=factory;this.jobs=new Map();this.workers=new Map();this.ui=new EventEmitter();this.closed=false;if(existsSync(path.join(runtime.dataDir,'history-view.sqlite')))this.enableHistory();}
 enableHistory(){if(!this.history){this.history=new HistoryQuery(path.join(this.runtime.dataDir,'history-view.sqlite'),this.runtime.store);this.runtime.store.history=this.history;}}
 async create({recordingId}){
  const items=this.runtime.store.rawFor(recordingId);if(!items.length)throw new Error('RESOURCE_NOT_FOUND');this.enableHistory();
  const replayId=randomUUID(),namespace=`replay:${replayId}`,worker=await this.factory(path.join(this.runtime.dataDir,'replays',replayId));
  this.workers.set(namespace,worker);worker.on('events.appended',event=>{this.history.sync();this.ui.emit('events.appended',this.history.appendEvent(event));});worker.on('log.appended',log=>this.ui.emit('log.appended',this.history.appendLog(replayId,log.logSeq,log)));worker.on('session.updated',state=>this.ui.emit('session.updated',state));
  const job={replayId,runtimeNamespace:namespace,position:0,total:items.length,status:'paused',stateVersion:'1',speed:1,items,worker,timer:null,generation:0,actions:Promise.resolve(),inFlight:null};this.jobs.set(replayId,job);return this.view(replayId);
 }
 view(id){const job=this.jobs.get(id);if(!job)return null;const {items,worker,timer,generation,actions,inFlight,...view}=job;return view;}
 action(id,action,target,expectedVersion,speed){const job=this.jobs.get(id);if(!job)throw new Error('RESOURCE_NOT_FOUND');const task=job.actions.catch(()=>{}).then(()=>{if(expectedVersion&&expectedVersion!==job.stateVersion)throw new Error('STATE_CONFLICT');if(speed!==undefined)job.speed=Math.max(.1,Math.min(100,Number(speed)||1));return this.control(job,action,target);});job.actions=task;return task;}
 async control(job,action,target){if(this.closed)throw new Error('RUNTIME_CLOSED');job.generation++;clearTimeout(job.timer);job.timer=null;if(job.inFlight)await job.inFlight;
  if(action==='pause'||action==='stop')job.status=action==='pause'?'paused':'stopped';
  else if(action==='step'){await this.step(job);job.status='paused';}
  else if(action==='seek'||action==='rebuild'){const end=Math.max(0,Math.min(job.total,Number(target)||0));job.runtimeNamespace=`replay:${job.replayId}:rebuild:${randomUUID()}`;this.workers.set(job.runtimeNamespace,job.worker);job.position=0;job.status='rebuilding';while(job.position<end&&!this.closed)await this.step(job);job.status='paused';}
  else if(action==='play'){job.status='playing';this.play(job);}else throw new Error('INVALID_ARGUMENT');
  job.stateVersion=String(BigInt(job.stateVersion)+1n);const view=this.view(job.replayId);this.ui.emit('replay.updated',view);return view;
 }
 async step(job){if(job.position>=job.total){job.status='finished';return;}const original=job.items[job.position],bytes=await fs.readFile(original.filePath);
  if(createHash('sha256').update(bytes).digest('hex')!==original.contentHash){job.status='failed';job.stateVersion=String(BigInt(job.stateVersion)+1n);job.worker.log('REPLAY_RAW_HASH_MISMATCH',{rawId:original.rawId,replayId:job.replayId});this.ui.emit('replay.updated',this.view(job.replayId));throw new Error('RAW_HASH_MISMATCH');}
  const raw={...original,mode:'replay',runtimeNamespace:job.runtimeNamespace};if(!job.worker.store.raw(raw.rawId))job.worker.store.addRaw(raw,original.filePath);
  await job.worker.process(raw);job.position++;
 }
 play(job){const generation=job.generation;job.timer=setTimeout(async()=>{if(this.closed||job.status!=='playing'||generation!==job.generation)return;job.inFlight=this.step(job);try{await job.inFlight;if(job.position>=job.total)job.status='finished';this.ui.emit('replay.updated',this.view(job.replayId));if(!this.closed&&generation===job.generation&&job.status==='playing')this.play(job);}catch{job.status='failed';job.worker.log('REPLAY_FAILED',{replayId:job.replayId});}finally{job.inFlight=null;}},Math.max(1,100/Math.max(.1,Number(job.speed)||1)));}
 async close(){this.closed=true;for(const job of this.jobs.values()){job.generation++;clearTimeout(job.timer);}await Promise.allSettled([...this.jobs.values()].flatMap(job=>[job.actions,job.inFlight].filter(Boolean)));await Promise.all([...new Set(this.workers.values())].map(worker=>worker.close()));this.history?.close();}
}
