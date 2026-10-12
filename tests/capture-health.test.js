import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Runtime} from '../src/runtime.js';
import {createGateway} from '../src/server.js';
import {WebSocket} from 'ws';
async function setup(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-health-')),r=await Runtime.open({dataDir:dir});t.after(async()=>{await r.close();await fs.rm(dir,{recursive:true,force:true});});return r;}
test('RAW backpressure and write failure record traceable gaps without successful ACK',async t=>{
 const r=await setup(t);r.recorder.maxPending=1;let release,entered=false;const gate=new Promise(resolve=>release=resolve),persist=r.recorder.persist.bind(r.recorder);
 r.recorder.persist=async input=>{entered=true;await gate;return persist(input);};t.after(()=>release());
 const input={bytes:Buffer.from([8,1]),format:'business-payload',method:'Future',recordingId:'synthetic',sourceConnectionId:'fixture:1'};
 const pending=r.ingest(input);while(!entered)await new Promise(resolve=>setTimeout(resolve,10));let ack=false;
 await assert.rejects(r.ingest(input,()=>{ack=true}),/RAW_BACKPRESSURE/);assert.equal(ack,false);release();await pending;
 const blocker=path.join(r.dataDir,'blocked');await fs.writeFile(blocker,'x');r.recorder.root=blocker;
 await assert.rejects(r.ingest(input,()=>{ack=true}),/RAW_PERSIST_FAILED/);assert.equal(ack,false);
 const reasons=r.gaps.page().items.map(x=>x.reason);assert.ok(reasons.includes('RAW_BACKPRESSURE'));assert.ok(reasons.includes('RAW_PERSIST_FAILED'));assert.equal(r.store.countRaw(),1);
});
test('empty binary RAW is retained while oversize RAW is rejected with a gap record',async t=>{
 const r=await setup(t);let acknowledgments=0;const raw=await r.ingest({bytes:Buffer.alloc(0),format:'frame'},()=>acknowledgments++);
 assert.equal(r.store.raw(raw.rawId).size,0);assert.equal(r.store.rawTrace(raw.rawId).transport.errorCode,'TRANSPORT_EMPTY_INPUT');
 await assert.rejects(r.ingest({bytes:Buffer.alloc(8*1024*1024+1),format:'frame'},()=>acknowledgments++),/RAW_TOO_LARGE/);
 assert.equal(acknowledgments,1);assert.equal(r.gaps.page().items[0].reason,'RAW_TOO_LARGE');
});
test('Gateway ping/pong keeps responsive clients and terminates silent clients',{timeout:10000},async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-ws-health-')),app=await createGateway({dataDir:dir,port:0,settings:{gatewayHeartbeat:{intervalMs:20,timeoutMs:80}}});const clients=[];
 t.after(async()=>{clients.forEach(x=>x.terminate());await app.close();await fs.rm(dir,{recursive:true,force:true});});
 assert.ok(app.socketHub,'Gateway heartbeat component required');
 const cookie=(await fetch(app.url)).headers.get('set-cookie').split(';')[0],url=app.url.replace('http','ws')+'/api/v1/ws';
 const responsive=new WebSocket(url,{headers:{Cookie:cookie}}),silent=new WebSocket(url,{headers:{Cookie:cookie},autoPong:false});clients.push(responsive,silent);
 await Promise.all(clients.map(ws=>new Promise(resolve=>ws.once('open',resolve))));await new Promise(resolve=>silent.once('close',resolve));
 assert.equal(responsive.readyState,1);assert.equal(app.socketHub.view().timeouts,1);assert.ok(app.socketHub.view().pongs>0);
});
test('failure records fall back to a durable private journal if their SQLite write fails',async t=>{
 const r=await setup(t),prepare=r.gaps.db.prepare.bind(r.gaps.db);
 r.gaps.db.prepare=function(sql){if(sql.startsWith('INSERT INTO capture_gaps'))throw new Error('synthetic journal database failure');return prepare(sql);};
 const gap=await r.gaps.record({reason:'RAW_PERSIST_FAILED',recordingId:'synthetic',size:3});
 assert.equal(gap.reason,'RAW_PERSIST_FAILED');const saved=JSON.parse((await fs.readFile(r.gaps.file,'utf8')).trim());assert.equal(saved.gapId,gap.gapId);assert.equal(r.gaps.page().fallbackEntries.length,1);
});
test('RAW persistence owns an immutable byte snapshot even if a producer reuses its buffer',async t=>{
 const r=await setup(t),bytes=Buffer.from([8,1]),persist=r.recorder.persist.bind(r.recorder);let release;const gate=new Promise(resolve=>release=resolve);r.recorder.persist=async input=>{await gate;return persist(input);};t.after(()=>release());
 const pending=r.ingest({bytes,format:'business-payload',method:'Future'});bytes.fill(255);release();const raw=await pending;
 assert.deepEqual(await fs.readFile(r.store.raw(raw.rawId).filePath),Buffer.from([8,1]));assert.equal(r.store.rawTrace(raw.rawId).messages[0].parseStatus,'unknown');
});
