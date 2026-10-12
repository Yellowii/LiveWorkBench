import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let Runtime;
try { ({Runtime}=await import('../src/runtime.js')); } catch {}
const encode=(r,method,data)=>{const type=r.parser.native.root.lookupType('webcast.im.'+method.replace(/^Webcast/,''));return type.encode(type.fromObject(data)).finish();};
const setup=async t=>{
  assert.ok(Runtime,'Runtime must connect persistent RAW, Parser and EventStore');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-core-'));
  const r=await Runtime.open({dataDir:dir});
  t.after(async()=>{await r.close();await fs.rm(dir,{recursive:true,force:true});});
  return {r,dir};
};

test('duplicate input is saved twice but produces one persistent event across restart',async t=>{
  const {r,dir}=await setup(t);
  const bytes=encode(r,'WebcastChatMessage',{common:{msg_id:'9007199254740993',room_id:'8000000000000000001'},content:'hello'});
  const input={bytes,format:'business-payload',method:'WebcastChatMessage',anchorUid:'123',sourceType:'LiveHookSource',mode:'live'};
  await r.ingest(input);await r.ingest(input);
  assert.equal(r.store.countRaw(),2);assert.equal(r.store.countEvents(),1);
  const event=r.store.events({limit:20}).items[0];assert.equal(event.msgId,'9007199254740993');
  assert.equal(event.roomId,'8000000000000000001');assert.equal(event.payload.official.content,'hello');
  await r.close();const reopened=await Runtime.open({dataDir:dir});
  await reopened.ingest(input);assert.equal(reopened.store.countEvents(),1);assert.equal(reopened.store.countRaw(),3);
  await reopened.close();
});

test('parser and capture ACK can only run after bytes are committed',async t=>{
  const {r}=await setup(t);let observed=false;
  await r.ingest({bytes:Buffer.from([255]),format:'business-payload',method:'NotKnown',mode:'live'},async commit=>{
    const bytes=await fs.readFile(r.store.raw(commit.rawId).filePath);
    assert.deepEqual(bytes,Buffer.from([255]));assert.ok(commit.persistedAt);observed=true;
    assert.equal(r.store.countEvents(),0);
  });
  assert.ok(observed);assert.equal(r.store.countRaw(),1);assert.equal(r.store.events({}).items[0].payload.decodeStatus,'unknown');
});

test('RAW failure prevents ACK and all downstream processing',async t=>{
  const {r}=await setup(t);const blocker=path.join(r.dataDir,'blocked');await fs.writeFile(blocker,'x');r.recorder.root=blocker;
  let ack=false;await assert.rejects(r.ingest({bytes:Buffer.from([1]),format:'business-payload',method:'NoSuch'},()=>{ack=true}),/RAW_PERSIST_FAILED/);
  assert.equal(ack,false);assert.equal(r.store.countEvents(),0);
});

test('HTTP create keeps CREATED state and process interruption does not end or recreate it',async t=>{
  const {r}=await setup(t);
  const bytes=Buffer.from(JSON.stringify({status_code:0,data:{id_str:'100',status:1,owner:{id_str:'200'}}}));
  await r.ingest({bytes,format:'http-json',urlPath:'/webcast/room/create',httpStatus:200,processName:'直播伴侣',mode:'live'});
  const before=r.store.sessions()[0];assert.equal(before.sessionState,'CREATED');assert.equal(before.pushState,'UNKNOWN');
  r.interruptCapture();assert.equal(r.store.sessions()[0].sessionState,'CREATED');
  await r.ingest({bytes,format:'http-json',urlPath:'/webcast/room/create',httpStatus:200,processName:'直播伴侣',mode:'live'});
  assert.equal(r.store.sessions().length,1);assert.equal(r.store.sessions()[0].sessionId,before.sessionId);
});

test('replay uses a separate namespace and leaves live events and session unchanged',async t=>{
  const {r}=await setup(t);
  const bytes=encode(r,'WebcastChatMessage',{common:{msg_id:'5',room_id:'100'},content:'hello'});
  await r.ingest({bytes,format:'business-payload',method:'WebcastChatMessage',mode:'live'});
  const live=r.store.events({mode:'live'}).items;
  const replay=await r.createReplay({recordingId:r.store.recordings()[0].recordingId});
  await r.replayAction(replay.replayId,'step');
  assert.equal(r.store.events({mode:'replay'}).items.length,1);assert.deepEqual(r.store.events({mode:'live'}).items,live);
  assert.equal(r.replays.get(replay.replayId).position,1);
});

test('event cursor is stable when new events arrive and never returns the boundary twice',async t=>{
  const {r}=await setup(t);
  for(let i=1;i<=5;i++)await r.ingest({bytes:encode(r,'WebcastChatMessage',{common:{msg_id:String(i),room_id:'100'},content:String(i)}),format:'business-payload',method:'WebcastChatMessage'});
  const first=r.store.events({limit:2});assert.deepEqual(first.items.map(x=>x.msgId),['5','4']);
  await r.ingest({bytes:encode(r,'WebcastChatMessage',{common:{msg_id:'6',room_id:'100'},content:'6'}),format:'business-payload',method:'WebcastChatMessage'});
  const next=r.store.events({limit:2,cursor:first.nextCursor});assert.deepEqual(next.items.map(x=>x.msgId),['3','2']);
  assert.equal(next.snapshot,first.snapshot);
});

test('concurrent replay steps are serialized and shutdown waits for playback',async t=>{
  const {r}=await setup(t);
  for(let i=1;i<=2;i++)await r.ingest({bytes:encode(r,'WebcastChatMessage',{common:{msg_id:String(i),room_id:'100'}}),format:'business-payload',method:'WebcastChatMessage',mode:'live'});
  const replay=await r.createReplay({recordingId:r.store.recordings()[0].recordingId});
  await Promise.all([r.replayAction(replay.replayId,'step'),r.replayAction(replay.replayId,'step')]);
  assert.equal(r.replayView(replay.replayId).position,2);
  assert.equal(r.store.events({mode:'replay'}).items.length,2);
  await r.replayAction(replay.replayId,'seek',0);
  await r.replayAction(replay.replayId,'play');
  await r.close();
});

test('unrepresentable official timestamp preserves decoded data with unknown occurredAt',async t=>{
  const {r}=await setup(t);
  await r.ingest({bytes:encode(r,'WebcastChatMessage',{common:{msg_id:'9',room_id:'100',create_time:'9000000000000000000'},content:'timestamp'}),format:'business-payload',method:'WebcastChatMessage'});
  const event=r.store.events({}).items[0];
  assert.equal(event.eventType,'WebcastChatMessage');assert.equal(event.payload.decodeStatus,'decoded');
  assert.equal(event.occurredAt,null);assert.equal(event.payload.official.common.create_time,'9000000000000000000');
  assert.equal(r.metrics.failed,0);
});

test('observed live end releases the accepted room for a later room',async t=>{
  const {r}=await setup(t);
  for(const [method,data]of [['WebcastChatMessage',{common:{room_id:'100',msg_id:'1'}}],['WebcastControlMessage',{common:{room_id:'100',msg_id:'2'},action:3}],['WebcastControlMessage',{common:{room_id:'100',msg_id:'2'},action:3}],['WebcastChatMessage',{common:{room_id:'101',msg_id:'3'}}]])await r.ingest({bytes:encode(r,method,data),method,format:'business-payload',mode:'live'});
  assert.equal(r.store.events({mode:'live'}).items.length,3);
  assert.equal(r.store.sessions().find(x=>x.roomId==='100').sessionState,'ENDED');
  assert.equal(r.metrics.duplicates,1);
});
