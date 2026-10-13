import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {WebSocketServer} from 'ws';
import {Runtime} from '../src/runtime.js';
let BrowserSource,blockRequest,LoginVault;
try{({BrowserSource,blockRequest}=await import('../src/capture/browser/browser-source.js'));({LoginVault}=await import('../src/auth/login-vault.js'));}catch{}
test('browser network policy preserves normal resources and blocks identified live pulls only',()=>{
 assert.ok(blockRequest,'media filter required');
 for(const [url,type] of [['https://live.douyin.com/webcast/room/web/enter/','fetch'],['https://live.douyin.com/webcast/user/me/','fetch'],['https://lf-cdn.example.test/SDK.js','script'],['wss://live.douyin.com/webcast/im/push/','websocket']])assert.equal(blockRequest(url,type,true),false);
 for(const [url,type] of [['https://media.example.test/live.flv','fetch'],['https://media.example.test/live.m3u8','xhr'],['https://media.example.test/segment.ts','fetch'],['https://media.example.test/audio','media'],['https://p3.douyinpic.com/image.png','image'],['https://fonts.bytedance.com/font.woff','font'],['https://live.douyin.com/player/live-video.js','script']])assert.equal(blockRequest(url,type,true),false);
 assert.equal(blockRequest('https://pull-flv-t11.douyincdn.com/synthetic.flv','fetch',true),true);
 assert.equal(blockRequest('https://pull-hls-l11-admin.douyincdn.com/synthetic.m3u8','fetch',true),true);
 assert.equal(blockRequest('https://pull-flv-t11.douyincdn.com/synthetic.flv','fetch',false),false);
});
test('current-user DPAPI persists only explicit opt-in, filters domains and never writes plaintext',async t=>{
 assert.ok(LoginVault,'protected login vault required');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-vault-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const vault=new LoginVault(dir);
 const storageState={cookies:[{name:'synthetic_session',value:'SYNTHETIC_PRIVATE_VALUE',domain:'.douyin.com',path:'/',expires:-1,httpOnly:true,secure:true,sameSite:'Lax'},{name:'other',value:'private',domain:'.unrelated.invalid',expires:-1}],origins:[]};
 await assert.rejects(()=>vault.save('synthetic-profile',storageState,false),/AUTH_PERSIST_NOT_ENABLED/);
 await vault.save('synthetic-profile',storageState,true);const bytes=await fs.readFile(path.join(dir,'auth','synthetic-profile.vault'));assert.ok(!bytes.includes(Buffer.from('SYNTHETIC_PRIVATE_VALUE')));
 const loaded=await new LoginVault(dir).load('synthetic-profile');assert.equal(loaded.cookies.length,1);assert.equal(loaded.cookies[0].value,'SYNTHETIC_PRIVATE_VALUE');
 assert.equal((await vault.status('synthetic-profile')).validity,'UNKNOWN');await vault.clear('synthetic-profile');assert.equal(await vault.load('synthetic-profile'),null);
});
test('browser accepted frames use existing recorder and parser; SDK ACK boundary is explicitly weaker',async t=>{
 assert.ok(BrowserSource,'browser adapter required');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-browser-source-')),r=await Runtime.open({dataDir:dir});
 class BrowserFixture extends EventEmitter{constructor(_parser,options){super();this.options=options;this.status={state:'stopped'};this.account={status:{state:'unknown'}};}async start(){this.status.state='connected';this.emit('status',this.status);}async stop(){this.status.state='stopped';this.emit('status',this.status);}}
 const source=new BrowserSource(r,{clientFactory:BrowserFixture});t.after(async()=>{await source.stop();await r.close();await fs.rm(dir,{recursive:true,force:true});});
 r.selectedSource='WebSource';r.activeSourceEpoch='2';await source.start({roomUrl:'https://live.douyin.com/123',roomId:'100',anchorUid:'200',sourceEpoch:'2'});
 const type=r.parser.native.root.lookupType('webcast.im.PushFrame');const bytes=type.encode(type.fromObject({payload_type:'hb'})).finish();
 await source.client.options.rawCommit(bytes,new Date().toISOString(),'fixture-connection');await source.client.options.rawCommit(bytes,new Date().toISOString(),'fixture-connection');
 assert.equal(r.store.countRaw(),2);assert.equal(r.store.rawFor(source.captureId)[0].ackBoundary,'official-sdk-uncontrolled');assert.equal(source.status.rawBeforeAck,false);assert.equal(r.store.countEvents(),0);
});

test('migrated browser module captures synthetic network WS through Chromium and blocks media',async t=>{
 const {BrowserLive}=await import('../src/parser/browser-vendor/browser-raw-first-v5.js');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-browser-network-')),r=await Runtime.open({dataDir:dir}),wss=new WebSocketServer({host:'127.0.0.1',port:0});await new Promise(resolve=>wss.once('listening',resolve));let blockedMedia=0;const browserConsole=[];
 const encode=(name,value)=>{const type=r.parser.native.root.lookupType('webcast.im.'+name);return type.encode(type.fromObject(value)).finish();};const bytes=encode('PushFrame',{payload:encode('Response',{messages:[{method:'WebcastChatMessage',payload:encode('ChatMessage',{common:{room_id:'100',msg_id:'61'},content:'synthetic browser'}),msg_id:'61'}]})});
 wss.on('connection',ws=>setTimeout(()=>ws.send(bytes),30));
 class BrowserFixture extends BrowserLive{constructor(parser,options){const original=options.prepareContext;super(parser,{...options,prepareContext:async context=>{await original(context);await context.grantPermissions(['local-network-access'],{origin:'https://live.douyin.com'});context.on('page',page=>page.on('console',message=>browserConsole.push(message.text())));await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.pathname==='/123')return route.fulfill({contentType:'text/html',body:`<script>window.fixtureWs=new WebSocket("ws://127.0.0.1:${wss.address().port}/webcast/im/push/?room_id=100");fetch("https://pull-flv-t11.douyincdn.com/synthetic.flv").catch(()=>document.body.dataset.blocked="yes")</script><body></body>`});if(url.pathname.endsWith('.flv')){blockedMedia++;return route.fallback();}return route.fulfill({body:''});});}});}}
 const source=new BrowserSource(r,{clientFactory:BrowserFixture,allowLocalTest:true,mode:'test'});r.selectedSource='WebSource';r.activeSourceEpoch='3';t.after(async()=>{await source.stop();for(const ws of wss.clients)ws.terminate();await new Promise(resolve=>wss.close(resolve));await r.close();await fs.rm(dir,{recursive:true,force:true});});
 await source.start({roomUrl:'https://live.douyin.com/123',roomId:'100',anchorUid:'200',sourceEpoch:'3',blockMedia:true});const deadline=Date.now()+6000;while((r.store.countEvents()<1||source.status.captureState!=='CONNECTED')&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(r.store.countRaw(),1,JSON.stringify({source:source.status.captureState,browser:source.client.status.state,pending:source.client.pending,blockedMedia,browserConsole,connected:wss.clients.size,wsState:await source.client.page.evaluate(()=>window.fixtureWs?.readyState)}));assert.equal(r.store.countEvents(),1);assert.equal(r.store.events({}).items[0].payload.official.content,'synthetic browser');await source.sampleMetrics();assert.equal(source.metrics().memory.available,true);assert.ok(source.metrics().memory.bytes>0);assert.equal(source.status.rawBeforeAck,false);assert.equal(blockedMedia,1);await source.client.page.waitForFunction(()=>document.body.dataset.blocked==='yes');
});
