import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

export class CaptureBridge {
  constructor(runtime){this.runtime=runtime;this.child=null;this.pending=new Map();this.stats={csharpTransport:0,fallback:0};this.status={hookReady:false,proxyBound:false,captureState:'STOPPED',reason:'TLS_CERTIFICATE_REQUIRED'};this.queue=Promise.resolve();}
  async start({stdio=false,networkSmoke=false,mode='live',port=18827,certificatePath,certificatePassword,sourceEpoch='1'}={}){
    if(this.child||this.starting)throw new Error('SOURCE_BUSY');if(networkSmoke&&mode!=='test')throw new Error('TEST_MODE_REQUIRED');if(!stdio&&!networkSmoke&&!certificatePath)throw new Error('TLS_CERTIFICATE_REQUIRED');
    this.starting=true;this.cancelStart=false;
    try{
    const exe=path.join(root,'src/capture/BarrageGrab/bin/Debug/LiveWorkbench.CaptureHost.exe');await fs.access(exe);
    if(this.cancelStart)throw new Error('CAPTURE_START_CANCELLED');
    const args=stdio?['--stdio','--smoke']:networkSmoke?['--smoke','--port',String(port)]:['--port',String(port),'--certificate',certificatePath];
    this.captureId=randomUUID();this.mode=mode;this.sourceEpoch=sourceEpoch;
    this.child=spawn(exe,args,{cwd:path.dirname(exe),windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,LW_CERT_PASSWORD:certificatePassword||''}});
    this.status={...this.status,captureState:'STARTING'};
    this.child.stdin.on('error',()=>{}); // Exit/readiness handler owns process-failure reporting.
    this.child.stderr.on('data',()=>{}); // Original diagnostics may contain private URLs; never publish them.
    this.child.on('error',()=>{this.status.captureState='FAILED';this.runtime.log('CAPTURE_PROCESS_FAILED');});
    const ownedChild=this.child;
    this.child.once('exit',()=>{if(this.child!==ownedChild)return;this.child=null;this.rejectReady?.(new Error('CAPTURE_PROCESS_EXITED'));this.status={...this.status,proxyBound:false,hookReady:false,captureState:'STOPPED'};if(!this.runtime.store.closed){this.runtime.interruptCapture();this.runtime.emit('capture.updated',this.status);}});
    const ready=new Promise((resolve,reject)=>{this.resolveReady=resolve;this.rejectReady=reject;});
    this.lines=createInterface({input:this.child.stdout});
    this.lines.on('line',line=>{this.queue=this.queue.then(async()=>{
      let message;try{message=JSON.parse(line);}catch{return;}
      if(message.kind==='ready'){this.status={...this.status,...message,proxyReadyAt:message.proxyBound?new Date().toISOString():null,captureState:'CONNECTED'};this.resolveReady?.(this.status);this.runtime.emit('capture.updated',this.status);return;}
      if(message.kind==='diagnostic'){this.runtime.log(message.code);this.rejectReady?.(new Error(message.code));return;}
      if(message.kind==='raw'){
        try{
          const raw=await this.runtime.ingest({bytes:Buffer.from(message.payloadBase64,'base64'),format:message.format,receivedAt:message.receivedAt,urlPath:message.urlPath,httpStatus:message.httpStatus,processName:message.processName,captureId:this.captureId,recordingId:this.captureId,sourceType:'LiveHookSource',sourceEpoch:this.sourceEpoch,mode:this.mode,runtimeNamespace:this.mode==='live'?'live':`test:${this.captureId}`,deferTransport:['frame','response'].includes(message.format)},commit=>{this.pending.set(message.id,commit);this.send({kind:'ack',id:message.id,ok:true});});
          if(raw.format==='http-json')this.pending.delete(message.id);
        }catch{this.send({kind:'ack',id:message.id,ok:false});this.runtime.log('RAW_PERSIST_FAILED');}
      }
      if(message.kind==='transport'||message.kind==='transport-fallback'){
        const raw=this.pending.get(message.id);if(!raw)return;this.pending.delete(message.id);
        const bytes=await fs.readFile(this.runtime.store.raw(raw.rawId).filePath);
        if(message.kind==='transport'){this.stats.csharpTransport++;await this.runtime.process(raw,bytes,message.messages);}
        else{this.stats.fallback++;await this.runtime.process(raw,bytes);}
      }
    }).catch(()=>this.runtime.log('CAPTURE_BRIDGE_FAILED'));});
    const timeout=setTimeout(()=>this.rejectReady?.(new Error('CAPTURE_START_TIMEOUT')),10000);
    try{return await ready;}catch(e){await this.stop();throw e;}finally{clearTimeout(timeout);}
    }finally{this.starting=false;}
  }
  send(value){if(this.child?.stdin.writable)this.child.stdin.write(JSON.stringify(value)+'\n');}
  inject(bytes,format='response'){this.send({kind:'inject',format,payloadBase64:Buffer.from(bytes).toString('base64')});}
  async stop(){this.cancelStart=true;const child=this.child;if(child){this.send({kind:'stop'});await Promise.race([new Promise(resolve=>child.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,2000))]);if(this.child===child){child.kill();this.child=null;}}await this.queue;this.pending.clear();this.status={...this.status,proxyBound:false,hookReady:false,captureState:'STOPPED'};this.runtime.emit('capture.updated',this.status);}
}
