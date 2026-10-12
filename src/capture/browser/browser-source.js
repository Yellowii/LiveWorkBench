import {EventEmitter} from 'node:events';
import {randomUUID,createHash} from 'node:crypto';
export function blockRequest(raw,type,broad=true){let u;try{u=new URL(raw);}catch{return true;}
 if(type==='websocket'||type==='script'||/\/webcast\/(?:im|room|user)\//.test(u.pathname)||/\/user\/profile\/self\//.test(u.pathname))return false;
 return type==='media'||/\.(?:flv|m3u8|mp4|m4s|mp3|aac|ts|webm|ogg)(?:$|\/)/i.test(u.pathname)||/(?:livepull|pull-flv|pull-hls|liveplay)/i.test(u.hostname)||(broad&&['image','font'].includes(type));
}
export class BrowserSource extends EventEmitter{
 constructor(runtime,{clientFactory,allowLocalTest=false,mode='live'}={}){super();if(allowLocalTest&&mode!=='test')throw new Error('TEST_MODE_REQUIRED');this.runtime=runtime;this.clientFactory=clientFactory;this.allowLocalTest=allowLocalTest;this.mode=mode;this.status={captureState:'STOPPED',sourceType:'WebSource',connectionMode:'browser',hookReady:false,rawBeforeAck:false,ackBoundary:'official-sdk-uncontrolled'};this.controlFrames=0;}
 update(state,reason=null){const prior=this.status.captureState;this.status={...this.status,captureState:state,reason};if(prior==='CONNECTED'&&['RECOVERING','FAILED'].includes(state))this.runtime.interruptCapture();this.emit('status',this.status);}
 async start(config){
  if(this.client)throw new Error('SOURCE_BUSY');let Factory=this.clientFactory;if(!Factory)try{Factory=(await import('../../parser/browser-vendor/browser-raw-first-v3.js')).BrowserLive;}catch{throw new Error('BROWSER_NOT_PREPARED');}
  this.captureId=randomUUID();this.frameSeq=0;const sourceEpoch=config.sourceEpoch||'1';
  this.client=new Factory(this.runtime.parser.native,{
   autoReconnect:config.autoReconnect,
   allowLocalTest:this.allowLocalTest,
   captureRejected:bytes=>{void this.runtime.gaps.record({reason:'BROWSER_CAPTURE_BACKPRESSURE',size:bytes.length,contentHash:createHash('sha256').update(bytes).digest('hex'),sourceType:'WebSource',recordingId:this.captureId});},
   acceptConnection:url=>((url.protocol==='wss:'&&url.hostname.endsWith('.douyin.com'))||(this.allowLocalTest&&url.protocol==='ws:'&&url.hostname==='127.0.0.1'))&&url.searchParams.get('room_id')===config.roomId,
   prepareContext:async context=>{await context.route('**/*',route=>blockRequest(route.request().url(),route.request().resourceType(),config.blockMedia!==false)?route.abort('blockedbyclient'):route.continue());await context.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){this.muted=true;return Promise.resolve();};});},
   rawCommit:async(bytes,receivedAt,connection)=>{const raw=await this.runtime.ingest({bytes,format:'frame',receivedAt,mode:this.mode,runtimeNamespace:this.mode==='test'?`test:${this.captureId}`:'live',sourceType:'WebSource',sourceEpoch,sourceConnectionId:`${this.captureId}:${connection}`,captureInputSeq:String(++this.frameSeq),recordingId:this.captureId,observedRoomId:config.roomId,anchorUid:config.anchorUid,byteBoundary:'browser-websocket-network-event',ackBoundary:'official-sdk-uncontrolled',connectionMode:'browser',transport:this.allowLocalTest?'ws-test':'wss',direction:'server-to-client'});this.status.lastMessageAt=raw.receivedAt;this.status.received=this.frameSeq;return {messages:this.runtime.store.protos.forRaw(raw.rawId)};}
  });
  const client=this.client;client.on('status',status=>this.update(({connected:'CONNECTED',connecting:'STARTING',waiting:'RECOVERING',blocked:'FAILED',stopped:'STOPPED'})[status.state]||'UNKNOWN',status.state==='blocked'?'BROWSER_CONNECTION_BLOCKED':null));
  client.on('failure',failure=>{this.runtime.log('BROWSER_CAPTURE_FAILED',{stage:failure.stage});void this.runtime.gaps.record({reason:'BROWSER_CAPTURE_GAP',scope:'unknown-range',stage:failure.stage,sourceType:'WebSource',recordingId:this.captureId});});
  try{await client.start({roomUrl:config.roomUrl,headless:config.headless!==false,storageState:config.storageState});}catch{await this.stop();throw new Error('BROWSER_START_FAILED');}return this.status;
 }
 async account(){if(!this.client?.account)return {state:'UNKNOWN'};const value=await this.client.account.check?.({force:true})||this.client.account.status;return {state:String(value.state||'unknown').toUpperCase(),checkedAt:value.checked_at||null,source:value.source||null};}
 async stop(){const client=this.client;if(client)await client.stop();if(this.client===client)this.client=null;this.update('STOPPED');}
}
