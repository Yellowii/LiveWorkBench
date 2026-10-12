import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
let CaptureBridge;
try{({CaptureBridge}=await import('../src/capture-bridge.js'));}catch{}
import {Runtime} from '../src/runtime.js';

test('concurrent capture starts reserve a single owned child',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-start-')),r=await Runtime.open({dataDir:dir}),bridge=new CaptureBridge(r);
  t.after(async()=>{await bridge.stop();await r.close();await fs.rm(dir,{recursive:true,force:true});});
  const outcomes=await Promise.allSettled([bridge.start({stdio:true,mode:'test'}),bridge.start({stdio:true,mode:'test'})]);
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(outcomes.find(x=>x.status==='rejected').reason.message,'SOURCE_BUSY');
});

test('migrated C# gzip/protobuf path waits for RAW ACK then reaches official Parser and SQLite',async t=>{
  assert.ok(CaptureBridge,'Migrated C# capture bridge must be wired to the runtime');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-capture-'));const r=await Runtime.open({dataDir:dir});const bridge=new CaptureBridge(r);
  t.after(async()=>{await bridge.stop();await r.close();await fs.rm(dir,{recursive:true,force:true});});
  const type=r.parser.native.root.lookupType('webcast.im.ChatMessage');const business=type.encode(type.fromObject({common:{msg_id:'9007199254740993',room_id:'101'},content:'bridge'})).finish();
  const responseType=r.parser.native.root.lookupType('webcast.im.Response');
  const response=responseType.encode(responseType.fromObject({messages:[{method:'WebcastChatMessage',payload:business,msg_id:'9007199254740993'}]})).finish();
  const {gzipSync}=await import('node:zlib');const frameType=r.parser.native.root.lookupType('webcast.im.PushFrame');
  const frame=frameType.encode(frameType.fromObject({SeqID:'1',payload:gzipSync(response),headers:[{key:'compress_type',value:'gzip'}]})).finish();
  await bridge.start({stdio:true,mode:'test'});bridge.inject(frame,'frame');
  const deadline=Date.now()+10000;while(r.store.countEvents()===0&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(r.store.countRaw(),1);assert.equal(r.store.countEvents(),1);assert.equal(r.store.events({mode:'test'}).items[0].payload.official.content,'bridge');
  assert.equal(bridge.stats.csharpTransport,1,'C# transport unpacker must be reused, not silently bypassed');
});

test('owned loopback proxy captures an HTTP protobuf response without configuring Windows proxy',async t=>{
  const {createServer}=await import('node:http');const {createServer:createTcp}=await import('node:net');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-network-'));const r=await Runtime.open({dataDir:dir});const bridge=new CaptureBridge(r);
  const type=r.parser.native.root.lookupType('webcast.im.ChatMessage');const payload=type.encode(type.fromObject({common:{msg_id:'72',room_id:'101'},content:'network-capture'})).finish();
  const responseType=r.parser.native.root.lookupType('webcast.im.Response');const bytes=responseType.encode(responseType.fromObject({messages:[{method:'WebcastChatMessage',payload,msg_id:'72'}]})).finish();
  const upstream=createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'application/protobuffer'});res.end(bytes);});await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  const probe=createTcp();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  t.after(async()=>{await bridge.stop();await new Promise(resolve=>upstream.close(resolve));await r.close();await fs.rm(dir,{recursive:true,force:true});});
  await bridge.start({networkSmoke:true,mode:'test',port});
  const {request}=await import('node:http');await new Promise((resolve,reject)=>{request({host:'127.0.0.1',port,path:`http://127.0.0.1:${upstream.address().port}/webcast/im/fetch`,method:'GET'},res=>{res.resume();res.on('end',resolve);}).on('error',reject).end();});
  const deadline=Date.now()+10000;while(r.store.countEvents()===0&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(r.store.countRaw(),1);assert.equal(r.store.events({mode:'test'}).items[0].payload.official.content,'network-capture');
});

for(const fragmented of [false,true])test(`owned proxy captures ${fragmented?'fragmented':'binary'} WebSocket PushFrame through C# gzip and official parsing`,async t=>{
  const {createServer,request}=await import('node:http');const {createServer:createTcp}=await import('node:net');const {WebSocketServer}=await import('ws');const {gzipSync}=await import('node:zlib');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-ws-')),r=await Runtime.open({dataDir:dir}),bridge=new CaptureBridge(r);
  const encode=(name,value)=>{const type=r.parser.native.root.lookupType('webcast.im.'+name);return type.encode(type.fromObject(value)).finish();};
  const payload=encode('ChatMessage',{common:{msg_id:'73',room_id:'101'},content:'websocket-capture'});
  const response=encode('Response',{messages:[{method:'WebcastChatMessage',payload,msg_id:'73'}]});
  const frame=encode('PushFrame',{SeqID:'2',payload:gzipSync(response),headers:[{key:'compress_type',value:'gzip'}]});
  const upstream=createServer(),wss=new WebSocketServer({server:upstream,perMessageDeflate:false});
  wss.on('connection',ws=>setTimeout(()=>{if(ws.readyState!==1)return;if(!fragmented)ws.send(frame);else{const half=Math.floor(frame.length/2);ws.send(frame.subarray(0,half),{fin:false});setTimeout(()=>{if(ws.readyState===1)ws.send(frame.subarray(half),{fin:true});},80);}},50));
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  const probe=createTcp();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  let client;
  t.after(async()=>{client?.destroy();for(const ws of wss.clients)ws.terminate();await bridge.stop();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>upstream.close(resolve));await r.close();await fs.rm(dir,{recursive:true,force:true});});
  await bridge.start({networkSmoke:true,mode:'test',port});
  await new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port,path:`http://127.0.0.1:${upstream.address().port}/webcast/im/push/v2/`,headers:{Connection:'Upgrade',Upgrade:'websocket','Sec-WebSocket-Key':'dGhlIHNhbXBsZSBub25jZQ==','Sec-WebSocket-Version':'13'}});req.on('upgrade',(_res,socket)=>{client=socket;socket.on('data',()=>{});resolve();});req.on('response',()=>reject(new Error('WEBSOCKET_UPGRADE_FAILED')));req.on('error',reject);req.setTimeout(10000,()=>req.destroy(new Error('UPGRADE_TIMEOUT')));req.end();});
  const deadline=Date.now()+10000;while(r.store.countEvents()===0&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(r.store.countRaw(),1);assert.equal(r.store.events({mode:'test'}).items[0]?.payload.official?.content,'websocket-capture');assert.equal(bridge.stats.csharpTransport,1);
});
