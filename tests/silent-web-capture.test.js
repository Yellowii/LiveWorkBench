import test from 'node:test';
import assert from 'node:assert/strict';
import {WebConnectionResolver} from '../src/capture/websource/connection-resolver.js';
import {LiveStreamPolicy} from '../src/capture/browser/live-stream-policy.js';
import {extractRoomEvidence} from '../src/monitor/douyin-adapter.js';
import {BrowserSource} from '../src/capture/browser/browser-source.js';
import {EventEmitter} from 'node:events';

const evidence={roomId:'100',anchorUid:'200',web_rid:'123'};
test('automatic fallback never opens a visible browser even with a legacy headed preference',async()=>{
 const result=await new WebConnectionResolver().resolve({connectionMode:'direct',browserFallback:true,browserHeadless:false},evidence);
 assert.equal(result.headless,true);assert.equal(result.connectionReason,'WEB_DYNAMIC_PARAMETERS_UNAVAILABLE');
 assert.equal((await new WebConnectionResolver().resolve({connectionMode:'browser',browserHeadless:false},evidence)).headless,false);
});
test('capture intercepts inline streams before delivering HTML and reports observed bytes without claiming savings',async()=>{
 let context,handler;const events={};
 class Fixture extends EventEmitter{
  constructor(_p,options){super();this.options=options;}
  async start(){context={on:(n,fn)=>events[n]=fn,route:async(_pattern,fn)=>handler=fn,addInitScript:async()=>{},pages:()=>[]};await this.options.prepareContext(context);this.emit('status',{state:'connecting'});}
  async stop(){}
 }
 const source=new BrowserSource({parser:{native:{}},interruptCapture:()=>{},log:()=>{},gaps:{record:async()=>{}}},{clientFactory:Fixture});
 try{
  await source.start({roomUrl:'https://live.douyin.com/123',...evidence,headless:true});
  const request={url:()=> 'https://live.douyin.com/123',resourceType:()=> 'document'};
  await handler({request:()=>request,fetch:async()=>({status:()=>200,text:async()=>JSON.stringify({room:{id_str:'100',owner:{id_str:'200'},stream_url:{flv_pull_url:{HD:'https://pull-live.bytecdn.cn/100.flv'}}}})}),fulfill:async()=>assert.equal(source.streamPolicy.blocks('https://pull-live.bytecdn.cn/100.flv','fetch'),true),continue:async()=>assert.fail('document must learn before delivery')});
  let aborted=false;await handler({request:()=>({url:()=> 'https://pull-live.bytecdn.cn/100.flv',resourceType:()=> 'fetch'}),abort:async()=>aborted=true});assert.equal(aborted,true);
  assert.equal(source.metrics().blockedMediaRequests,1);assert.equal(source.metrics().networkBytes,null);
  let continued=false;await handler({request:()=>request,fetch:async()=>{throw new Error('SYNTHETIC_METADATA_TRANSPORT_FAILURE');},continue:async()=>continued=true});assert.equal(continued,true);assert.equal(source.metrics().streamDiscoveryFailures,1);
  await events.requestfinished({...request,sizes:async()=>({responseBodySize:128,responseHeadersSize:24})});assert.equal(source.metrics().networkBytes,152);
  source.client.emit('status',{state:'blocked'});assert.equal(source.status.reason,'BROWSER_WSS_NOT_OBSERVED');assert.equal(source.status.requiresUserAction,false);
 }finally{await source.stop();}
});
test('manual room identity discovery does not invent platform LIVE evidence',()=>{
 const body=JSON.stringify({room:{id_str:'100',web_rid:'123',owner:{id_str:'200'},status:0}});
 assert.equal(extractRoomEvidence(body,{web_rid:'123'}).roomId,undefined);
 const identity=extractRoomEvidence(body,{web_rid:'123'},{identityOnly:true});assert.equal(identity.roomId,'100');assert.equal(identity.state,'UNKNOWN');
 assert.equal(extractRoomEvidence(body,{web_rid:'124'},{identityOnly:true}).roomId,undefined);
 const repeated=JSON.stringify({one:{room:{id_str:'100',web_rid:'123',owner:{id_str:'200'},status:0}},two:{room:{id_str:'100',web_rid:'123',owner:{id_str:'200',sec_uid:'synthetic'},status:2}}});
 assert.equal(extractRoomEvidence(repeated,{web_rid:'123'},{identityOnly:true}).roomId,'100');
});
test('HTTP credentials are scoped by host, cookie path and expiry; discovery rechecks current target',async()=>{
 const {cookieHeader,HttpRoomDiscovery}=await import('../src/capture/websource/http-room-discovery.js');
 const state={cookies:[{name:'session',value:'SYNTHETIC_PRIVATE',domain:'.douyin.com',path:'/',expires:-1},{name:'path',value:'private',domain:'live.douyin.com',path:'/private',expires:-1},{name:'expired',value:'private',domain:'.douyin.com',path:'/',expires:1},{name:'other',value:'private',domain:'.other.invalid',path:'/',expires:-1}]};
 assert.equal(cookieHeader('https://live.douyin.com/123',state),'session=SYNTHETIC_PRIVATE');assert.equal(cookieHeader('https://www.iesdouyin.com/',state),'');
 const resolver={resolve:async()=>({web_rid:'123'}),http:{get:async(_url,opts)=>{assert.equal(opts.storageState,state);return {text:JSON.stringify({room:{id_str:'100',web_rid:'123',status:0,owner:{id_str:'200'}}})};}}};
 const identity=await new HttpRoomDiscovery({resolver}).discover({target:{type:'web_rid',value:'123'}},{storageState:state});assert.equal(identity.roomId,'100');assert.equal(identity.parameterDiscovery,'http');assert.equal(identity.state,'UNKNOWN');
});
test('provider failures allow explicit hidden fallback, while disabled fallback returns a safe error',async()=>{
 const resolver=new WebConnectionResolver({directProvider:async()=>{throw new Error('WEB_SIGNATURE_PROVIDER_UNAVAILABLE');}});
 const result=await resolver.resolve({connectionMode:'direct',browserFallback:true},evidence);assert.equal(result.kind,'browser');assert.equal(result.connectionReason,'WEB_SIGNATURE_PROVIDER_UNAVAILABLE');
 await assert.rejects(()=>resolver.resolve({connectionMode:'direct',browserFallback:false},evidence),/WEB_SIGNATURE_PROVIDER_UNAVAILABLE/);
});
test('fresh direct parameters must bind the actual WSS room and cannot carry a non-platform target',async()=>{
 const resolve=url=>new WebConnectionResolver({directProvider:async()=>({...evidence,url,expiresAt:Date.now()+60000})}).resolve({connectionMode:'direct'},evidence);
 await assert.rejects(()=>resolve('wss://live.douyin.com/webcast/im/push/v2/?room_id=101'),/WEB_DYNAMIC_PARAMETERS_INVALID/);
 await assert.rejects(()=>resolve('wss://unrelated.invalid/webcast/im/push/v2/?room_id=100'),/WEB_DYNAMIC_PARAMETERS_INVALID/);
});
test('local unsigned WS fixtures require two explicit test flags; production resolver remains strict',async()=>{
 assert.throws(()=>new WebConnectionResolver({allowLocalTest:true}),/TEST_MODE_REQUIRED/);
 const resolver=new WebConnectionResolver({allowLocalTest:true,mode:'test',directProvider:async()=>({...evidence,url:'ws://127.0.0.1:12345/?room_id=100',expiresAt:Date.now()+60000})});
 assert.equal((await resolver.resolve({connectionMode:'direct'},evidence)).kind,'direct');
});
test('inline Pace stream evidence is learned only for the requested room, including nested SDK stream_data',()=>{
 const policy=new LiveStreamPolicy();const room={id_str:'100',owner:{id_str:'200'},stream_url:{live_core_sdk_data:{pull_data:{stream_data:JSON.stringify({data:{origin:{main:{flv:'https://pull-live.bytecdn.cn/stream/100.flv?private=synthetic',hls:'https://pull-live.bytecdn.cn/stream/100.m3u8'}}}})}}}};
 const other={...room,id_str:'101',stream_url:{flv_pull_url:{FULL_HD1:'https://pull-live.bytecdn.cn/stream/101.flv'}}};
 const html='<script>self.__pace_f.push([1,'+JSON.stringify('0:'+JSON.stringify({roomStore:{room,web_rid:'123'},other})+'\n')+'])</script>';
 assert.equal(typeof policy.learnDocument,'function');policy.learnDocument(html,evidence);
 assert.equal(policy.blocks('https://pull-live.bytecdn.cn/stream/100.flv?private=refreshed','fetch'),true);
 assert.equal(policy.blocks('https://pull-live.bytecdn.cn/stream/100.m3u8','xhr'),true);
 assert.equal(policy.blocks('https://pull-live.bytecdn.cn/stream/chunk.ts','fetch'),true);
 assert.equal(policy.blocks('https://pull-live.bytecdn.cn/stream/101.flv','fetch'),false);
 assert.equal(policy.blocks('https://pull-live.bytecdn.cn/stream/100.flv','script'),false);
});
test('official HTTP pull URLs also identify the browser HTTPS upgrade before media download',()=>{
 const p=new LiveStreamPolicy();p.learn({room:{id_str:'100',owner:{id_str:'200'},stream_url:{flv_pull_url:{HD:'http://pull-flv-f11.douyincdn.com/live/stream.flv?synthetic=1'},hls_pull_url:'http://pull-hls-f11.douyinliving.com/live/stream.m3u8'}}},evidence);
 assert.equal(p.blocks('https://pull-flv-f11.douyincdn.com/live/stream.flv','fetch'),true);
 assert.equal(p.blocks('http://pull-flv-f11.douyincdn.com/live/stream.flv','fetch'),true);
 assert.equal(p.blocks('https://pull-hls-f11.douyinliving.com/live/part.ts','fetch'),true);
 assert.equal(p.blocks('https://unrelated.invalid/live/stream.flv','fetch'),false);
});
