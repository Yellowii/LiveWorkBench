import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {chromium} from 'playwright-core';
import http from 'node:http';
let LiveStreamPolicy;
try{({LiveStreamPolicy}=await import('../src/capture/browser/live-stream-policy.js'));}catch{}

test('live stream evidence scopes FLV/HLS pulls and declared DASH/segments without generic media rules',()=>{
 assert.ok(LiveStreamPolicy,'separate stream classifier required');const policy=new LiveStreamPolicy();
 for(const url of ['https://live.douyin.com/a.mp4','https://v3-rh.douyinvod.com/normal.mp4','https://live.douyin.com/video/live.flv','https://live.douyin.com/log/live-video-event','https://pull-flv-t11.douyincdn.com/player.js','wss://live.douyin.com/webcast/im/push/'])assert.equal(policy.blocks(url,'media'),false,url);
 assert.equal(policy.blocks('https://pull-flv-t11.douyincdn.com/opaque.flv','fetch'),true);
 assert.equal(policy.blocks('https://pull-hls-l11-admin.douyincdn.com/opaque.m3u8','xhr'),true);
 assert.equal(policy.blocks('https://pull-flv-t11.douyincdn.com.evil.invalid/opaque.flv','fetch'),false);
 assert.equal(policy.blocks('https://live.douyin.com/assets/a.mpd','fetch'),false);
 assert.equal(policy.learn({stream_url:{dash_pull_url:'https://live.douyin.com/declared-stream/manifest.mpd'}}),1);
 assert.equal(policy.blocks('https://live.douyin.com/declared-stream/manifest.mpd','fetch'),true);
 assert.equal(policy.blocks('https://live.douyin.com/declared-stream/chunk.m4s','fetch'),true);
 assert.equal(policy.blocks('https://live.douyin.com/elsewhere/chunk.m4s','fetch'),false);
 assert.equal(policy.blocks('https://live.douyin.com/declared-stream/SDK.js','script'),false);
 const disabled=new LiveStreamPolicy({enabled:false});assert.equal(disabled.blocks('https://pull-flv-t11.douyincdn.com/opaque.flv','fetch'),false);
});

test('capture guard permits actual ordinary audio playback and blocks live stream download/playback',async t=>{
 const proxy=http.createServer(),sockets=new Set();proxy.on('connect',(_req,socket)=>socket.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n'));proxy.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,proxy:{server:'http://127.0.0.1:'+proxy.address().port}}),context=await browser.newContext(),policy=new LiveStreamPolicy();t.after(async()=>{await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>proxy.close(resolve));});
 const wav=Buffer.alloc(24044,128);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(8000,28);wav.writeUInt16LE(1,32);wav.writeUInt16LE(8,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
 let blocked=0,deliveredLive=0;await policy.install(context);await context.route('**/*',route=>{const request=route.request();if(policy.blocks(request.url(),request.resourceType())){blocked++;return route.abort('blockedbyclient');}if(new URL(request.url()).pathname==='/')return route.fulfill({contentType:'text/html',body:'<audio id="ordinary" src="/tutorial.wav"></audio><video id="stream" src="https://pull-flv-t11.douyincdn.com/opaque.flv"></video><button onclick="Promise.all([ordinary.play().then(()=>window.normal=true),stream.play().catch(e=>window.liveError=e.name),fetch(stream.src).catch(()=>window.downloadBlocked=true)]).then(()=>window.done=true)">play</button>'});if(request.url().includes('opaque.flv'))deliveredLive++;return route.fulfill({contentType:'audio/wav',body:wav});});
 const page=await context.newPage();await page.goto('https://live.douyin.com/');await page.getByRole('button').click();await page.waitForFunction(()=>window.done);assert.equal(await page.evaluate(()=>window.normal),true);assert.equal(await page.evaluate(()=>window.liveError),'NotAllowedError');assert.equal(await page.evaluate(()=>window.downloadBlocked),true);assert.equal(deliveredLive,0);assert.ok(blocked>=1);assert.equal(await page.locator('#ordinary').evaluate(e=>e.paused),false);
});

test('ordinary media response stays connected; uncertain responses are counted rather than treated as capture failure',async()=>{
 const {BrowserSource}=await import('../src/capture/browser/browser-source.js');let responseHandler;
 class Fixture extends EventEmitter{constructor(_parser,options){super();this.options=options;}async start(){const context={on:(name,fn)=>{if(name==='response')responseHandler=fn;},route:async()=>{},addInitScript:async()=>{},pages:()=>[]};await this.options.prepareContext(context);this.emit('status',{state:'connected'});}async stop(){}}
 const source=new BrowserSource({parser:{native:{}},interruptCapture:()=>{},log:()=>{},gaps:{record:async()=>{}}},{clientFactory:Fixture});
 try{await source.start({roomUrl:'https://live.douyin.com/123',roomId:'100'});await responseHandler({url:()=> 'https://live.douyin.com/tutorial.mp4',headers:()=>({'content-type':'video/mp4'}),status:()=>200,request:()=>({resourceType:()=> 'media'})});assert.equal(source.status.captureState,'CONNECTED');assert.equal(source.metrics().unclassifiedMediaResponses,1);await responseHandler({url:()=> 'https://live.douyin.com/ordinary-video.mp4',headers:()=>({'content-type':'video/mp4'}),status:()=>403,request:()=>({resourceType:()=> 'media'})});assert.equal(source.status.captureState,'CONNECTED');assert.equal(source.metrics().rawBeforeAck,false);}finally{await source.stop();}
});
