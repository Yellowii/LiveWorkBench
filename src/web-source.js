import {EventEmitter} from 'node:events';
import {randomUUID} from 'node:crypto';
import {webProtocolPacket} from './web-protocol.js';
import {NetworkTransport} from './network/transport.js';
export function webFailureReason(status,parameterCode){
  if(status.reason==='RAW_COMMIT_FAILED')return 'WEB_RAW_COMMIT_FAILED';
  if(status.reason==='DYNAMIC_PARAMETERS_UNAVAILABLE')return parameterCode||'WEB_DYNAMIC_PARAMETERS_UNAVAILABLE';
  if(/^达到重试上限/.test(status.reason||''))return 'WEB_RETRY_LIMIT_REACHED';
  return 'WEB_HANDSHAKE_OR_POLICY_BLOCKED';
}

export class WebSource extends EventEmitter {
  constructor(runtime,{allowLocalTest=false,mode='live',testOptions={},networkTransport}={}){
    super();if(allowLocalTest&&mode!=='test')throw new Error('TEST_MODE_REQUIRED');
    if(networkTransport&&mode!=='test')throw new Error('TEST_MODE_REQUIRED');this.networkTransport=networkTransport;this.runtime=runtime;this.allowLocalTest=allowLocalTest;this.mode=mode;this.queue=Promise.resolve();
    if(Object.keys(testOptions).length&&!allowLocalTest)throw new Error('TEST_MODE_REQUIRED');this.testOptions=testOptions;this.controlFrames=0;
    this.status={captureState:'STOPPED',sourceType:'WebSource',hookReady:false,reason:null};
  }
  update(captureState,reason=null){if(this.mode==='live'&&this.runtime.selectedSource==='WebSource'&&this.status.captureState==='CONNECTED'&&['RECOVERING','FAILED'].includes(captureState))this.runtime.interruptCapture();if(this.status.network&&captureState==='CONNECTED')this.status.network.connectionState='connected';this.status={...this.status,captureState,reason};this.emit('status',this.status);}
  async start(config){
    if(this.client)throw new Error('SOURCE_BUSY');
    let module;try{module=await import('./parser/live-raw-first-v6.js');}catch{throw new Error('WEB_SOURCE_NOT_PREPARED');}
    try{module.validateTarget(config.url,{allowLocalTest:this.allowLocalTest});}catch{throw new Error('WEB_TARGET_INVALID');}
    this.captureId=randomUUID();this.committed=[];this.frameSeq=0;this.parameterFailureCode=null;
    const transport=this.networkTransport||new NetworkTransport();
    const client=this.client=new module.LiveClient(this.runtime.parser.native,{...this.testOptions,allowLocalTest:this.allowLocalTest,maxAttempts:config.autoReconnect===false?1:(config.retryLimit??5),connectionRefresh:config.refreshConnection?async()=>{try{const result=await config.refreshConnection();this.parameterFailureCode=null;return result;}catch(error){this.parameterFailureCode=/^(?:AUTH|TARGET|WEB|NETWORK|STATE)_[A-Z_]+$/.test(error.message)?error.message:'WEB_DYNAMIC_PARAMETERS_UNAVAILABLE';throw error;}}:undefined,networkOptions:async url=>{if(this.allowLocalTest)return {};try{const route=await transport.options(url,config.networkPolicy||{mode:'system'});this.status.network=route.diagnostic;return route.request;}catch(error){this.status.network=error.network||{mode:config.networkPolicy?.mode||'system',route:'unavailable',dns:'unavailable',connectionState:'not-attempted',errorCode:error.message.startsWith('NETWORK_')?error.message:'NETWORK_POLICY_FAILED'};throw error;}},
      packetDecoder:async options=>webProtocolPacket(this.runtime.parser.native,await this.runtime.unpacker.protocolEnvelope(this.protocolRaw),options),
      rawCommit:async(bytes,g,receivedAt,connectionAttempt)=>{
        const raw=await this.runtime.ingest({bytes,format:'frame',deferTransport:true,receivedAt,profileId:config.profileId,operationId:config.operationId,monitorOperationId:config.monitorOperationId,monitorStateVersion:config.monitorStateVersion,captureInputSeq:String(++this.frameSeq),connectionMode:'direct',sourceType:'WebSource',sourceEpoch:config.sourceEpoch||'1',sourceConnectionId:`${this.captureId}:${connectionAttempt}`,captureId:this.captureId,recordingId:this.captureId,mode:this.mode,runtimeNamespace:this.mode==='test'?`test:${this.captureId}`:'live',anchorUid:config.anchorUid||null,observedRoomId:config.roomId||null,byteBoundary:'reassembled-websocket-message',transport:this.allowLocalTest?'ws-test':'wss',direction:'server-to-client'});
        this.status.lastMessageAt=raw.receivedAt;this.status.received=this.frameSeq;
        this.protocolRaw=raw;
        // Process every committed input, including an old connection draining at stop.
        this.queue=this.queue.then(()=>this.runtime.process(raw,bytes)).catch(()=>this.runtime.log('WEB_PUBLICATION_FAILED',{rawId:raw.rawId}));
      }});
    client.on('status',status=>{const states={connected:'CONNECTED',connecting:'STARTING',waiting:'RECOVERING',blocked:'FAILED',stopped:'STOPPED'};const next=states[status.state]||'UNKNOWN';if(this.status.captureState==='CONNECTED'&&['RECOVERING','FAILED'].includes(next))this.runtime.gaps.record({reason:'WEB_CONNECTION_INTERRUPTED',scope:'unknown-range',sourceType:'WebSource',recordingId:this.captureId,sourceConnectionId:`${this.captureId}:${status.attempts}`});if(status.state==='connected'){client.ws.on('ping',()=>this.controlFrames++);client.ws.on('pong',()=>this.controlFrames++);}this.update(next,status.state==='blocked'?webFailureReason(status,this.parameterFailureCode):null);});
    client.on('failure',failure=>{
      if(this.status.network&&failure.stage!=='raw'&&failure.stage!=='queue'){this.status.network.connectionState='failed';this.status.network.errorCode||=failure.stage==='handshake'?'WEB_HANDSHAKE_FAILED':'WEB_TRANSPORT_FAILED';}
      this.runtime.log(failure.stage==='raw'?'RAW_PERSIST_FAILED':failure.stage==='queue'?'WEB_CAPTURE_GAP':'WEB_SOURCE_FAILED',{stage:failure.stage});
      this.runtime.gaps.record({reason:failure.stage==='queue'?'WEB_CAPTURE_BACKPRESSURE':failure.stage==='raw'?'WEB_RAW_COMMIT_FAILED':'WEB_TRANSPORT_FAILED',stage:failure.stage,scope:'unknown-range',sourceType:'WebSource',recordingId:this.captureId});
    });
    try{await client.start(config);}catch{await this.stop();throw new Error('WEB_SOURCE_START_FAILED');}
    return this.status;
  }
  async stop(){if(this.client){await this.client.stop();this.client=null;}await this.queue;this.committed=[];this.update('STOPPED');}
}
