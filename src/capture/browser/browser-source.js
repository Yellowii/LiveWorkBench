import {EventEmitter} from 'node:events';
import {randomUUID,createHash} from 'node:crypto';
import {browserMemory} from './process-memory.js';
import {NetworkTransport} from '../../network/transport.js';
import {networkTarget} from '../../network/target-policy.js';
import {LiveStreamPolicy} from './live-stream-policy.js';
export function blockRequest(raw,type,enabled=true){return new LiveStreamPolicy({enabled}).blocks(raw,type);}
export class BrowserSource extends EventEmitter{
 constructor(runtime,{clientFactory,allowLocalTest=false,mode='live'}={}){super();if(allowLocalTest&&mode!=='test')throw new Error('TEST_MODE_REQUIRED');this.runtime=runtime;this.clientFactory=clientFactory;this.allowLocalTest=allowLocalTest;this.mode=mode;this.status={captureState:'STOPPED',sourceType:'WebSource',connectionMode:'browser',hookReady:false,rawBeforeAck:false,ackBoundary:'official-sdk-uncontrolled'};this.controlFrames=0;}
 update(state,reason=null){const prior=this.status.captureState;if(this.network&&state==='CONNECTED')Object.assign(this.network.diagnostic,{connectionState:'capturing',errorCode:null});if(this.network&&state==='FAILED')Object.assign(this.network.diagnostic,{connectionState:'failed',errorCode:reason});this.status={...this.status,captureState:state,reason};if(prior==='CONNECTED'&&['RECOVERING','FAILED'].includes(state))this.runtime.interruptCapture();this.emit('status',this.status);}
 async start(config){
  if(this.client)throw new Error('SOURCE_BUSY');let Factory=this.clientFactory;if(!Factory)try{Factory=(await import('../../parser/browser-vendor/browser-raw-first-v5.js')).BrowserLive;}catch{throw new Error('BROWSER_NOT_PREPARED');}
  this.captureId=randomUUID();this.frameSeq=0;const sourceEpoch=config.sourceEpoch||'1';
  const network=await new NetworkTransport().browserRoute(config.roomUrl,config.networkPolicy||{mode:'system'});this.network=network;
  this.streamPolicy=new LiveStreamPolicy({enabled:config.blockMedia!==false});
  this.stats={receivedMessages:0,connections:0,disconnections:0,blockedMediaRequests:0,blockedOtherRequests:0,mediaRequests:0,mediaResponses:0,mediaNetworkBytes:null,networkBytes:null,byteMeasurementScope:'completed-browser-http-responses-only; excludes route.fetch transfers, unfinished transfers and WSS',failedResourceRequests:0,streamDiscoveryFailures:0,imFetchResponses:0,imFetchEmptyResponses:0,mediaPolicyGaps:0,unclassifiedMediaResponses:0,resourceRequests:0,knownStreamTargets:0,heartbeatOwner:'official-page-sdk',rawBeforeAck:false,memory:{available:false,bytes:null,reason:'NOT_SAMPLED'}};this.operationId=config.operationId;this.profileId=config.profileId;this.monitorStateVersion=config.monitorStateVersion;this.monitorOperationId=config.monitorOperationId;this.policyReason=null;this.status.connectionReason=config.connectionReason||null;this.status.headless=config.headless!==false;this.status.parameterDiscovery=config.parameterDiscovery||null;
  const blockedRequests=new WeakSet(),mediaRequests=new WeakSet(),noteMedia=request=>{if(!mediaRequests.has(request)){mediaRequests.add(request);this.stats.mediaRequests++;}};
  const learn=(text,context)=>{const count=this.streamPolicy.learnDocument(text,{roomId:config.roomId,anchorUid:config.anchorUid});this.stats.knownStreamTargets=this.streamPolicy.urls.size;if(count)void this.streamPolicy.publish(context);};
  this.client=new Factory(this.runtime.parser.native,{
   autoReconnect:config.autoReconnect,
   allowLocalTest:this.allowLocalTest,
   captureRejected:bytes=>{void this.runtime.gaps.record({reason:'BROWSER_CAPTURE_BACKPRESSURE',size:bytes.length,contentHash:createHash('sha256').update(bytes).digest('hex'),sourceType:'WebSource',recordingId:this.captureId});},
   acceptConnection:url=>((url.protocol==='wss:'&&url.hostname.endsWith('.douyin.com'))||(this.allowLocalTest&&url.protocol==='ws:'&&url.hostname==='127.0.0.1'))&&url.searchParams.get('room_id')===config.roomId,
   prepareContext:async context=>{
    context.on('response',async response=>{let u;try{u=new URL(response.url());}catch{return;}const mime=response.headers?.()['content-type']||'';
      if(/^(?:video\/|audio\/|application\/(?:vnd\.apple\.mpegurl|x-mpegurl|dash\+xml))/i.test(mime)){this.stats.mediaResponses++;const request=response.request?.();if(request)noteMedia(request);const identified=this.streamPolicy.identifies(u.href,request?.resourceType()||'media');if(identified&&this.streamPolicy.enabled){this.stats.mediaPolicyGaps++;if(this.stats.mediaPolicyGaps<=3)this.runtime.log('BROWSER_LIVE_STREAM_POLICY_MISS',{profileId:this.profileId,captureId:this.captureId});}else if(!identified)this.stats.unclassifiedMediaResponses++;}
      if(!u.hostname.endsWith('.douyin.com'))return;const code=response.status(),authContext=response.request?.().resourceType()==='document'||/^\/webcast\/(?:room|user|im)\//.test(u.pathname)||u.pathname==='/aweme/v1/web/user/profile/self/';if([401,403,429].includes(code)&&authContext)this.block(code===429?'BROWSER_PLATFORM_RATE_LIMITED':'BROWSER_AUTH_OR_ACCESS_REQUIRED');
      if(code===200&&/^\/webcast\/room\//.test(u.pathname))try{learn(await response.text(),context);}catch{this.stats.streamDiscoveryFailures++;}
      if(/^\/webcast\/im\/fetch\/?$/.test(u.pathname)){this.stats.imFetchResponses++;if(code===200)try{if((await response.body()).length===0)this.stats.imFetchEmptyResponses++;}catch{}}
    });
    context.on('requestfinished',async request=>{try{const sizes=await request.sizes(),bytes=sizes.responseBodySize+sizes.responseHeadersSize;if(!Number.isFinite(bytes))return;this.stats.networkBytes=(this.stats.networkBytes??0)+bytes;if(mediaRequests.has(request))this.stats.mediaNetworkBytes=(this.stats.mediaNetworkBytes??0)+bytes;}catch{}});
    context.on('requestfailed',request=>{if(!blockedRequests.has(request))this.stats.failedResourceRequests++;});
    await context.route('**/*',async route=>{
     const request=route.request(),raw=request.url(),type=request.resourceType();this.stats.resourceRequests++;
     if(this.streamPolicy.identifies(raw,type))noteMedia(request);
     if(this.streamPolicy.blocks(raw,type)){this.stats.blockedMediaRequests++;blockedRequests.add(request);return route.abort('blockedbyclient');}
     let u;try{u=networkTarget(raw,{browserAsset:true});}catch{this.stats.blockedOtherRequests++;blockedRequests.add(request);return route.abort('blockedbyclient');}
     // Learn before delivering the document/room response: scripts and players
     // cannot start a stream between receipt of HTML and response observation.
     if(this.streamPolicy.enabled&&u.hostname==='live.douyin.com'&&(type==='document'&&u.href===config.roomUrl||/^\/webcast\/room\//.test(u.pathname))&&(!request.method||request.method()==='GET')){
      try{const response=await route.fetch({maxRedirects:0,maxRetries:0,timeout:30000});if(response.status()===200)learn(await response.text(),context);return await route.fulfill({response});}catch{this.stats.streamDiscoveryFailures++;return route.continue();} // Preserve the browser's own TLS checks and report incomplete stream discovery.
     }
     return route.continue();
    });
    await this.streamPolicy.install(context);
   },
   rawCommit:async(bytes,receivedAt,connection)=>{const raw=await this.runtime.ingest({bytes,format:'frame',receivedAt,profileId:this.profileId,operationId:this.operationId,monitorStateVersion:this.monitorStateVersion,monitorOperationId:this.monitorOperationId,mode:this.mode,runtimeNamespace:this.mode==='test'?`test:${this.captureId}`:'live',sourceType:'WebSource',sourceEpoch,sourceConnectionId:`${this.captureId}:${connection}`,captureInputSeq:String(++this.frameSeq),recordingId:this.captureId,observedRoomId:config.roomId,anchorUid:config.anchorUid,byteBoundary:'browser-websocket-network-event',ackBoundary:'official-sdk-uncontrolled',connectionMode:'browser',transport:this.allowLocalTest?'ws-test':'wss',direction:'server-to-client'});this.status.lastMessageAt=raw.receivedAt;this.status.received=this.frameSeq;return {messages:this.runtime.store.protos.forRaw(raw.rawId)};}
  });
  const client=this.client;client.on('status',status=>{if(status.state==='connected'){this.stats.connections++;clearTimeout(this.recoveryTimer);}if(status.state==='waiting'){this.stats.disconnections++;clearTimeout(this.recoveryTimer);this.recoveryTimer=setTimeout(()=>{void this.stop().then(()=>this.update('FAILED','BROWSER_WSS_TIMEOUT'));},90000);this.recoveryTimer.unref();}const reason=this.policyReason||(status.state==='blocked'?(client.browser?.isConnected?.()===false?'BROWSER_PROCESS_EXITED':this.stats.imFetchEmptyResponses?'BROWSER_IM_FETCH_EMPTY':'BROWSER_WSS_NOT_OBSERVED'):null);this.status.requiresUserAction=['BROWSER_VERIFICATION_REQUIRED','BROWSER_AUTH_OR_ACCESS_REQUIRED','BROWSER_PLATFORM_RATE_LIMITED'].includes(reason);this.update(this.policyReason?'FAILED':({connected:'CONNECTED',connecting:'STARTING',waiting:'RECOVERING',blocked:'FAILED',stopped:'STOPPED'})[status.state]||'UNKNOWN',reason);});
  client.on('failure',failure=>{this.runtime.log('BROWSER_CAPTURE_FAILED',{stage:failure.stage});void this.runtime.gaps.record({reason:'BROWSER_CAPTURE_GAP',scope:'unknown-range',stage:failure.stage,sourceType:'WebSource',recordingId:this.captureId});});
  try{await client.start({roomUrl:config.roomUrl,headless:config.headless!==false,storageState:config.storageState,networkLaunch:network.launch});}catch{network.diagnostic.connectionState='failed';network.diagnostic.errorCode||='BROWSER_START_FAILED';await this.stop();throw new Error('BROWSER_START_FAILED');}this.memoryTimer=setInterval(()=>void this.sampleMetrics(),10000);this.memoryTimer.unref();void this.sampleMetrics();return this.status;
 }
 block(reason){this.policyReason=reason;this.status.requiresUserAction=true;this.update('FAILED',reason);this.runtime.log(reason,{profileId:this.profileId,operationId:this.operationId,captureId:this.captureId});void this.client?.stop().catch(()=>{});}
 metrics(){return {network:this.network?.diagnostic||null,memory:{available:false,bytes:null,reason:'BROWSER_NOT_RUNNING'},...this.stats,memory:this.client?.browser?this.stats?.memory||{available:false,bytes:null,reason:'NOT_SAMPLED'}:{available:false,bytes:null,reason:'BROWSER_NOT_RUNNING'},receivedMessages:this.frameSeq||0,queuePending:this.client?.pending||0,captureState:this.status.captureState,reason:this.status.reason,lastMessageAt:this.status.lastMessageAt||null,rawBeforeAck:false,heartbeatOwner:'official-page-sdk',controlFrames:{available:false,reason:'BROWSER_CONTROL_FRAMES_NOT_OBSERVABLE'}};}
 async sampleMetrics(){if(this.sampling)return this.sampling;this.sampling=browserMemory(this.client?.browser).then(value=>{if(this.stats)this.stats.memory=value;}).finally(()=>{this.sampling=null;});return this.sampling;}
 async account(){if(!this.client?.account)return {state:'UNKNOWN'};const value=await this.client.account.check?.({force:true})||this.client.account.status;return {state:String(value.state||'unknown').toUpperCase(),checkedAt:value.checked_at||null,source:value.source||null};}
 async park(){clearTimeout(this.recoveryTimer);const client=this.client;if(!client)return;client.account?.stop?.();client.generation++;clearTimeout(client.wait);await client.context?.close();client.context=null;client.page=null;await client.queue;this.update('STOPPED');} // Keep only the owned process while native stability is checked; no page/WSS remains active.
 async stop(){clearTimeout(this.recoveryTimer);clearInterval(this.memoryTimer);const client=this.client;if(client)await client.stop();if(this.client===client)this.client=null;await this.network?.close();await this.sampling;this.status.requiresUserAction=false;this.update('STOPPED');}
}
