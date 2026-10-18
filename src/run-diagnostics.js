import fs from 'node:fs';
import path from 'node:path';
import {monitorEventLoopDelay} from 'node:perf_hooks';
const code=x=>typeof x==='string'&&/^[A-Z][A-Z0-9_]{0,80}$/.test(x)?x:null;
const count=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
// Scalar-only snapshots: never serialize errors, platform bodies, URLs, env or account state.
export class RunDiagnostics{
 constructor(app,{directory=path.join(app.runtime.dataDir,'diagnostics'),intervalMs=15000,maxBytes=512*1024,files=6,processEvents=true}={}){
  this.app=app;this.directory=directory;this.maxBytes=maxBytes;this.files=files;this.failureCount=0;this.startedAt=new Date().toISOString();this.file=path.join(directory,'runtime.jsonl');try{fs.mkdirSync(directory,{recursive:true});}catch{this.failureCount++;}
  this.delay=monitorEventLoopDelay({resolution:20});this.delay.enable();this.write('START',{commit:app.instance?.commit||null,fingerprint:app.instance?.codeFingerprint||null});
  this.listener=x=>this.write('TRANSITION',{capture:code(x?.captureState),reason:code(x?.reason),selected:code(x?.selectedSource)});app.runtime.on('source.updated',this.listener);
  this.authListener=x=>this.write('AUTH_VAULT_READ',{operation:x?.operation==='read'?'read':null,result:['ok','failed'].includes(x?.result)?x.result:null,stage:['file','decrypt','decode'].includes(x?.stage)?x.stage:null,reason:code(x?.reason),systemCode:code(x?.systemCode),exitCode:count(x?.exitCode),signal:code(x?.signal),hresult:count(x?.hresult),durationMs:count(x?.durationMs)});app.runtime.on('auth.diagnostic',this.authListener);
  this.logListener=x=>{if(x?.level==='error'||x?.level==='warn')this.write('PIPELINE_WARNING',{code:code(x.code)});};app.runtime.on('log.appended',this.logListener);
  this.timer=setInterval(()=>this.sample(),intervalMs);this.timer.unref();
  this.exception=(error,origin)=>this.write('FATAL_EXCEPTION',{origin:origin==='unhandledRejection'?'UNHANDLED_REJECTION':'UNCAUGHT_EXCEPTION',errorCode:code(error?.code),errorName:code(error?.name?.toUpperCase())});
  this.exit=exitCode=>this.write('PROCESS_EXIT',{exitCode});if(processEvents){process.on('uncaughtExceptionMonitor',this.exception);process.on('exit',this.exit);this.processEvents=true;}
 }
 write(kind,data={}){try{const text=JSON.stringify({at:new Date().toISOString(),pid:process.pid,startedAt:this.startedAt,kind,...data})+'\n';if(fs.existsSync(this.file)&&fs.statSync(this.file).size+Buffer.byteLength(text)>this.maxBytes){for(let n=this.files-1;n>=1;n--){const dest=this.file+'.'+n,src=n===1?this.file:this.file+'.'+(n-1);if(fs.existsSync(dest))fs.unlinkSync(dest);if(fs.existsSync(src))fs.renameSync(src,dest);}}fs.appendFileSync(this.file,text);}catch{this.failureCount++;}}
 sample(){try{const {runtime:r,sources:s,wss}=this.app,web=s.currentWeb(),browser=s.browser.metrics(),memory=process.memoryUsage(),state=s.view();this.write('SAMPLE',{uptimeSeconds:process.uptime(),memory:{rss:memory.rss,heapUsed:memory.heapUsed,heapTotal:memory.heapTotal,external:memory.external,arrayBuffers:memory.arrayBuffers},eventLoop:{meanMs:count(this.delay.mean/1e6),maxMs:count(this.delay.max/1e6),p99Ms:count(this.delay.percentile(99)/1e6)},capture:code(state.captureState),mode:state.connectionMode,reason:code(web.status.reason),webSocketClients:wss.clients.size,rawPending:r.recorder.pending,webPending:count(web.client?.pending)||0,connectionAttempts:count(web.client?.status?.attempts),browserProcesses:browser.memory?.processCount??(browser.memory?.reason==='BROWSER_NOT_RUNNING'?0:null),inputs:r.metrics.inputs,events:r.metrics.events,parseFailures:r.metrics.failed,duplicates:r.metrics.duplicates,diagnosticWriteFailures:this.failureCount});this.delay.reset();}catch{this.write('SAMPLE_FAILED');}}
 close(){if(this.closed)return;this.closed=true;clearInterval(this.timer);this.delay.disable();this.app.runtime.off('source.updated',this.listener);this.app.runtime.off('auth.diagnostic',this.authListener);this.app.runtime.off('log.appended',this.logListener);this.write('ORDERLY_CLOSE');if(this.processEvents){process.off('uncaughtExceptionMonitor',this.exception);process.off('exit',this.exit);}}
}
