import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WebSocketServer} from 'ws';
import {Runtime} from '../src/runtime.js';
let WebSource,SourceController;
try {({WebSource}=await import('../src/web-source.js'));({SourceController}=await import('../src/source-controller.js'));}catch{}
const wait=async check=>{const deadline=Date.now()+6000;while(!check()){if(Date.now()>deadline)throw new Error('SOURCE_TEST_TIMEOUT');await new Promise(resolve=>setTimeout(resolve,20));}};
async function setup(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-source-')),r=await Runtime.open({dataDir:dir});t.after(async()=>{await r.close();await fs.rm(dir,{recursive:true,force:true});});return r;}
function frame(r){const encode=(name,value)=>{const type=r.parser.native.root.lookupType('webcast.im.'+name);return type.encode(type.fromObject(value)).finish();};return encode('PushFrame',{SeqID:'2',LogID:'3',payload:encode('Response',{need_ack:true,internal_ext:'fixture',messages:[{method:'WebcastChatMessage',payload:encode('ChatMessage',{common:{room_id:'100',msg_id:'41'},content:'synthetic source'}),msg_id:'41'}]})});}

test('WebSource waits for durable RAW before upstream decoder and event persistence',async t=>{
 assert.equal(typeof WebSource,'function','A RAW-first WebSource adapter is required');
 const r=await setup(t),wss=new WebSocketServer({host:'127.0.0.1',port:0});await new Promise(resolve=>wss.once('listening',resolve));
 const businessType=r.parser.native.types.get('webcast.im.ChatMessage').original,decode=businessType.decode;let businessDecodes=0;businessType.decode=function(...args){businessDecodes++;return decode.apply(this,args);};
 const source=new WebSource(r,{allowLocalTest:true,mode:'test'});t.after(async()=>{await source.stop();for(const ws of wss.clients)ws.terminate();await new Promise(resolve=>wss.close(resolve));});
 const append=r.recorder.append.bind(r.recorder);let entered=false,release;const gate=new Promise(resolve=>{release=resolve;});
 r.recorder.append=async input=>{entered=true;await gate;return append(input);};
 let acks=0;t.after(()=>release());wss.on('connection',ws=>{ws.on('message',()=>acks++);ws.send(frame(r));});
 await source.start({url:`ws://127.0.0.1:${wss.address().port}`,sourceEpoch:'2'});await wait(()=>entered);
 await new Promise(resolve=>setTimeout(resolve,60));assert.equal(source.client.status.received,0);assert.equal(r.store.countEvents(),0);assert.equal(acks,0);
 release();await wait(()=>r.store.countEvents()===1);
 const raw=r.store.rawFor(source.captureId)[0];assert.equal(raw.sourceType,'WebSource');assert.equal(raw.sourceEpoch,'2');assert.equal(raw.byteBoundary,'reassembled-websocket-message');
 assert.equal(r.store.events({mode:'test'}).items[0].payload.official.content,'synthetic source');
 await wait(()=>acks===1);await source.stop();
 assert.equal(businessDecodes,1,'Protocol ACK handling must not perform a second business decode');
});

test('selected WebSource interruption changes capture state without ending the session',async t=>{
 const r=await setup(t);r.selectedSource='WebSource';
 r.sessions.observe({roomId:'100',anchorUid:'200',live:true});
 const source=new WebSource(r);source.update('CONNECTED');source.update('RECOVERING');
 const state=r.store.sessions()[0];assert.equal(state.captureState,'INTERRUPTED');assert.equal(state.sessionState,'LIVE');
 assert.equal(state.pushState,'UNKNOWN');await source.stop();
});

test('stale epochs retain RAW and roomless IDs are never forced into a shared dedup key',async t=>{
 const r=await setup(t),controller=new SourceController(r,{async stop(){},status:{captureState:'STOPPED'}},{});t.after(()=>controller.close());
 const type=r.parser.native.root.lookupType('webcast.im.ChatMessage'),bytes=type.encode(type.fromObject({common:{msg_id:'43'},content:'synthetic missing context'})).finish();
 await r.ingest({bytes,format:'business-payload',method:'WebcastChatMessage',sourceType:'LiveHookSource',sourceEpoch:'0'});
 assert.equal(r.store.countRaw(),1);assert.equal(r.store.countEvents(),0);
 for(let n=0;n<2;n++)await r.ingest({bytes,format:'business-payload',method:'WebcastChatMessage',sourceType:'LiveHookSource',sourceEpoch:controller.view().sourceEpoch});
 assert.equal(r.store.countRaw(),3);assert.equal(r.store.countEvents(),2);assert.ok(r.store.logs().some(x=>x.code==='STALE_SOURCE_RAW_RETAINED'));
});

test('manual selection survives reload and version races cannot switch twice',async t=>{
 assert.equal(typeof SourceController,'function','Manual single-source control is required');
 const r=await setup(t),controller=new SourceController(r,{async stop(){},status:{captureState:'STOPPED'}},{});
 const original=controller.view();
 const results=await Promise.allSettled([controller.action({action:'switch',sourceType:'WebSource',expectedVersion:original.stateVersion}),controller.action({action:'switch',sourceType:'LiveHookSource',expectedVersion:original.stateVersion})]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.find(x=>x.status==='rejected').reason.message,'STATE_CONFLICT');
 assert.equal(controller.view().selectedSource,'WebSource');assert.equal(controller.view().captureState,'STOPPED');
 const restored=new SourceController(r,{async stop(){},status:{captureState:'STOPPED'}},{});
 assert.equal(restored.view().selectedSource,'WebSource');assert.equal(r.store.logs().filter(x=>x.code==='SOURCE_SELECTION_CHANGED').length,1);
 assert.equal(r.store.sessions().length,0);await controller.close();await restored.close();
});

test('anchor completion during a manual source switch does not double-count a message',async t=>{
 assert.equal(typeof SourceController,'function','Manual source control is required');
 const r=await setup(t),controller=new SourceController(r,{async stop(){},status:{captureState:'STOPPED'}},{});t.after(()=>controller.close());
 const type=r.parser.native.root.lookupType('webcast.im.ChatMessage'),bytes=type.encode(type.fromObject({common:{room_id:'100',msg_id:'42'},content:'synthetic duplicate'})).finish();
 await r.ingest({bytes,method:'WebcastChatMessage',format:'business-payload',sourceType:'LiveHookSource',sourceEpoch:controller.view().sourceEpoch});
 const before=r.store.sessions()[0].sessionId;
 await controller.action({action:'switch',sourceType:'WebSource',expectedVersion:controller.view().stateVersion});
 await r.ingest({bytes,method:'WebcastChatMessage',format:'business-payload',sourceType:'WebSource',sourceEpoch:controller.view().sourceEpoch,anchorUid:'200'});
 assert.equal(r.store.countRaw(),2);assert.equal(r.store.countEvents(),1);assert.equal(r.store.sessions()[0].sessionId,before);assert.equal(r.store.sessions()[0].anchorUid,'200');
});
test('WebSource keeps protocol heartbeat and ACK across a local reconnect without duplicating events',{timeout:12000},async t=>{
 const r=await setup(t),wss=new WebSocketServer({host:'127.0.0.1',port:0});await new Promise(resolve=>wss.once('listening',resolve));
 const source=new WebSource(r,{allowLocalTest:true,mode:'test',testOptions:{heartbeatMs:30,minConnectMs:10,testRetryDelayMs:50}});let connects=0,acks=0,heartbeats=0;
 t.after(async()=>{await source.stop();for(const ws of wss.clients)ws.terminate();await new Promise(resolve=>wss.close(resolve));});
 const type=r.parser.native.root.lookupType('webcast.im.PushFrame');
 wss.on('connection',ws=>{const attempt=++connects;ws.on('message',bytes=>{const value=type.decode(bytes);if(value.payload_type==='ack'){acks++;if(attempt===1)ws.terminate();}if(value.payload_type==='hb')heartbeats++;});ws.send(frame(r));if(attempt===2)ws.ping('synthetic');});
 await source.start({url:`ws://127.0.0.1:${wss.address().port}`,sourceEpoch:'2'});await wait(()=>connects>=2&&acks>=2&&heartbeats>=1&&r.store.countRaw()===2);
 const inputs=r.store.rawFor(source.captureId);assert.notEqual(inputs[0].sourceConnectionId,inputs[1].sourceConnectionId);assert.equal(r.store.countEvents(),1);assert.ok(source.controlFrames>=1);assert.ok(r.gaps.page().items.some(x=>x.reason==='WEB_CONNECTION_INTERRUPTED'));
});
