import {EventEmitter} from 'node:events';
import {randomUUID} from 'node:crypto';
import {webProtocolPacket} from './web-protocol.js';

export class WebSource extends EventEmitter {
  constructor(runtime,{allowLocalTest=false,mode='live'}={}){
    super();if(allowLocalTest&&mode!=='test')throw new Error('TEST_MODE_REQUIRED');
    this.runtime=runtime;this.allowLocalTest=allowLocalTest;this.mode=mode;this.queue=Promise.resolve();
    this.status={captureState:'STOPPED',sourceType:'WebSource',hookReady:false,reason:null};
  }
  update(captureState,reason=null){if(this.mode==='live'&&this.runtime.selectedSource==='WebSource'&&this.status.captureState==='CONNECTED'&&['RECOVERING','FAILED'].includes(captureState))this.runtime.interruptCapture();this.status={...this.status,captureState,reason};this.emit('status',this.status);}
  async start(config){
    if(this.client)throw new Error('SOURCE_BUSY');
    let module;try{module=await import('./parser/live-raw-first-v3.js');}catch{throw new Error('WEB_SOURCE_NOT_PREPARED');}
    try{module.validateTarget(config.url,{allowLocalTest:this.allowLocalTest});}catch{throw new Error('WEB_TARGET_INVALID');}
    this.captureId=randomUUID();this.committed=[];
    const client=this.client=new module.LiveClient(this.runtime.parser.native,{allowLocalTest:this.allowLocalTest,
      packetDecoder:async options=>webProtocolPacket(this.runtime.parser.native,await this.runtime.unpacker.protocolEnvelope(this.protocolRaw),options),
      rawCommit:async(bytes,g,receivedAt,connectionAttempt)=>{
        const raw=await this.runtime.ingest({bytes,format:'frame',deferTransport:true,receivedAt,sourceType:'WebSource',sourceEpoch:config.sourceEpoch||'1',sourceConnectionId:`${this.captureId}:${connectionAttempt}`,captureId:this.captureId,recordingId:this.captureId,mode:this.mode,runtimeNamespace:this.mode==='test'?`test:${this.captureId}`:'live',anchorUid:config.anchorUid||null,observedRoomId:config.roomId||null,byteBoundary:'reassembled-websocket-message',transport:this.allowLocalTest?'ws-test':'wss',direction:'server-to-client'});
        this.protocolRaw=raw;
        // Process every committed input, including an old connection draining at stop.
        this.queue=this.queue.then(()=>this.runtime.process(raw,bytes)).catch(()=>this.runtime.log('WEB_PUBLICATION_FAILED',{rawId:raw.rawId}));
      }});
    client.on('status',status=>{const states={connected:'CONNECTED',connecting:'STARTING',waiting:'RECOVERING',blocked:'FAILED',stopped:'STOPPED'};this.update(states[status.state]||'UNKNOWN',status.state==='blocked'?'WEB_HANDSHAKE_OR_POLICY_BLOCKED':null);});
    client.on('failure',failure=>{
      this.runtime.log(failure.stage==='raw'?'RAW_PERSIST_FAILED':failure.stage==='queue'?'WEB_CAPTURE_GAP':'WEB_SOURCE_FAILED',{stage:failure.stage});
    });
    try{await client.start(config);}catch{await this.stop();throw new Error('WEB_SOURCE_START_FAILED');}
    return this.status;
  }
  async stop(){if(this.client){await this.client.stop();this.client=null;}await this.queue;this.committed=[];this.update('STOPPED');}
}
