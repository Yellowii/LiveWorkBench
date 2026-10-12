import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {Runtime} from '../src/runtime.js';
async function setup(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-isolation-')),r=await Runtime.open({dataDir:dir});t.after(async()=>{await r.close();await fs.rm(dir,{recursive:true,force:true});});const type=r.parser.native.root.lookupType('webcast.im.ChatMessage');const raw=await r.ingest({bytes:type.encode(type.fromObject({common:{room_id:'101',msg_id:'96'},content:'synthetic'})).finish(),format:'business-payload',method:'WebcastChatMessage'});return {r,raw};}
const snapshot=r=>r.store.db.prepare("SELECT (SELECT count(*) FROM events) events,(SELECT count(*) FROM sessions) sessions,(SELECT count(*) FROM logs) logs,(SELECT count(*) FROM raw) raw,(SELECT count(*) FROM proto_parse_attempts) attempts").get();
test('Replay uses independent SQLite and bus while compatibility queries still return replay events',async t=>{
 const {r,raw}=await setup(t),before=snapshot(r),sessions=r.store.sessions();let liveBusMessages=0;r.on('events.appended',()=>liveBusMessages++);
 const replay=await r.createReplay({recordingId:raw.recordingId});await r.replayAction(replay.replayId,'step');
 assert.deepEqual(snapshot(r),before);assert.deepEqual(r.store.sessions(),sessions);assert.equal(liveBusMessages,0);
 assert.equal(r.store.events({mode:'replay',namespace:replay.runtimeNamespace}).items.length,1);
 const job=r.replays.get(replay.replayId);assert.ok(job.worker);assert.notEqual(job.worker.store.db,r.store.db);assert.ok(job.worker.dataDir.startsWith(path.join(r.dataDir,'replays')));
});
test('isolated replay seek and failure leave live repositories unchanged and retain traceability',async t=>{
 const {r,raw}=await setup(t),before=snapshot(r),replay=await r.createReplay({recordingId:raw.recordingId});
 await r.replayAction(replay.replayId,'seek',1);const event=r.store.events({mode:'replay'}).items[0];assert.ok(event);
 await fs.writeFile(r.store.raw(raw.rawId).filePath,Buffer.from([255]));await r.replayAction(replay.replayId,'seek',0);
 await assert.rejects(r.replayAction(replay.replayId,'step'),/RAW_HASH_MISMATCH/);assert.deepEqual(snapshot(r),before);
 assert.ok(r.store.logs().some(x=>x.code==='REPLAY_RAW_HASH_MISMATCH'));
});
test('EventBus isolates a faulty subscriber without interrupting other consumers or RAW indexing',async t=>{
 const {r}=await setup(t);let delivered=false;r.on('events.appended',()=>{throw new Error('synthetic consumer failure');});r.on('events.appended',()=>delivered=true);
 await r.ingest({bytes:Buffer.from([8,1]),format:'business-payload',method:'Future'});assert.equal(delivered,true);assert.equal(r.store.countRaw(),2);assert.ok(r.store.logs().some(x=>x.code==='EVENT_SUBSCRIBER_FAILED'));
});
test('mixed live and isolated replay history keeps signed snapshots, unique sequence and persisted read views',async t=>{
 const {r,raw}=await setup(t),replay=await r.createReplay({recordingId:raw.recordingId});await r.replayAction(replay.replayId,'step');
 const first=r.store.events({limit:1});assert.ok(first.nextCursor);assert.equal(first.snapshot,'2');
 const type=r.parser.native.root.lookupType('webcast.im.ChatMessage');await r.ingest({bytes:type.encode(type.fromObject({common:{room_id:'101',msg_id:'97'}})).finish(),format:'business-payload',method:'WebcastChatMessage'});
 const next=r.store.events({limit:1,cursor:first.nextCursor});assert.equal(next.snapshot,'2');assert.equal(next.items[0].mode,'live');assert.equal(r.store.events({afterSeq:'2'}).items[0].eventSeq,'3');
 const child=r.replays.get(replay.replayId).worker,indexed=child.store.rawTrace(raw.rawId).messages[0];assert.equal(r.protoDetail(indexed.protoId,replay.runtimeNamespace).attempts[0].origin,'pipeline');
 const original=r.store.raw(raw.rawId);assert.equal((await r.rawDetail(raw.recordingId,raw.rawId,replay.runtimeNamespace)).mode,'replay');assert.equal(r.store.raw(raw.rawId).mode,original.mode);
 await r.close();const reopened=await Runtime.open({dataDir:r.dataDir});try{assert.equal(reopened.store.events({mode:'replay'}).items.length,1);assert.equal(reopened.store.events({mode:'live'}).items.length,2);}finally{await reopened.close();}
});
