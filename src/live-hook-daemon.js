import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export class LiveHookDaemon {
  constructor(runtime,bridge){this.runtime=runtime;this.bridge=bridge;this.child=null;this.observed=null;this.status={available:false,state:'UNKNOWN',reason:'PROCESS_OBSERVER_NOT_STARTED',hookReady:false,restartRequired:false,companionRunning:null,processInstances:[],stateVersion:'0'};this.captureChanged=()=>this.refresh();runtime.on('capture.updated',this.captureChanged);}
  observe(observed){const wasRunning=this.status.companionRunning,oldRoot=this.rootInstance;this.observed=observed;this.status.available=true;this.refresh();if(wasRunning===true&&!this.status.companionRunning){this.runtime.interruptCapture();this.runtime.log('COMPANION_EXIT_OBSERVED');}else if(oldRoot&&this.rootInstance&&oldRoot!==this.rootInstance){this.runtime.interruptCapture();this.runtime.log('COMPANION_RESTART_OBSERVED');}}
  refresh(){if(!this.observed)return;const processes=[...(this.observed.processes||[])].sort((a,b)=>a.pid-b.pid),main=processes.filter(p=>p.hasMainWindow),candidates=main.length?main:processes;
    const primary=[...candidates].sort((a,b)=>(Date.parse(a.startedAt)||0)-(Date.parse(b.startedAt)||0)||a.pid-b.pid)[0];this.rootInstance=primary?`${primary.pid}:${primary.startedAt||'unknown'}`:null;
    const proxy=this.bridge.status,ready=Date.parse(proxy.proxyReadyAt),running=processes.length>0;
    const restartRequired=running&&(!proxy.proxyBound||!Number.isFinite(ready)||candidates.some(p=>!p.startedAt||Date.parse(p.startedAt)<ready));
    const state=restartRequired?'RESTART_REQUIRED':!proxy.proxyBound?'AWAITING_CAPTURE':!running?'WAITING_COMPANION':'AWAITING_ROUTE_PROBE';
    const semantic={available:true,state,reason:restartRequired?'COMPANION_STARTED_BEFORE_CAPTURE':running?'CLIENT_ROUTING_NOT_VERIFIED':'WAITING_FOR_MANUAL_COMPANION_START',hookReady:false,restartRequired,companionRunning:running,processInstances:processes.map(p=>({processInstanceId:`${p.pid}:${p.startedAt||'unknown'}`,pid:p.pid,startedAt:p.startedAt||null})),proxyBound:Boolean(proxy.proxyBound)};
    const {lastObservedAt,stateVersion,...old}=this.status;const changed=JSON.stringify(old)!==JSON.stringify(semantic);
    this.status={...semantic,lastObservedAt:this.observed.observedAt,stateVersion:String(Number(stateVersion||0)+(changed?1:0))};
    if(changed){this.runtime.emit('daemon.updated',this.status);this.runtime.log(state,{restartRequired});}
  }
  observationFailed(){this.observed=null;this.rootInstance=null;this.status={...this.status,available:false,state:'UNKNOWN',reason:'PROCESS_OBSERVATION_FAILED',companionRunning:null,processInstances:[],stateVersion:String(Number(this.status.stateVersion)+1)};this.runtime.emit('daemon.updated',this.status);}
  async start(){const exe=path.join(root,'src/capture/BarrageGrab/bin/Debug/LiveWorkbench.CaptureHost.exe');
    return new Promise(resolve=>{let settled=false;const finish=()=>{if(!settled){settled=true;clearTimeout(timer);resolve(this.status);}};const fail=()=>{this.observationFailed();finish();};
      const child=this.child=spawn(exe,['--observe'],{cwd:path.dirname(exe),windowsHide:true,stdio:['pipe','pipe','pipe']});const timer=setTimeout(finish,3000);
      child.stdin.on('error',()=>{});
      child.stderr.on('data',()=>{});child.on('error',fail);child.once('exit',()=>{if(this.child===child){this.child=null;if(!this.stopped)fail();}});
      this.lines=createInterface({input:child.stdout});this.lines.on('line',line=>{if(this.child!==child||this.stopped)return;try{const data=JSON.parse(line);if(data.kind==='process-observed'){this.observe(data);finish();}else if(data.kind==='diagnostic')fail();}catch{fail();}});
    });
  }
  async close(){this.stopped=true;this.runtime.off('capture.updated',this.captureChanged);this.lines?.close();const child=this.child;if(child){child.stdin.end(JSON.stringify({kind:'stop'})+'\n');await Promise.race([new Promise(resolve=>child.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,1000))]);if(this.child===child){child.kill();this.child=null;}}}
}
