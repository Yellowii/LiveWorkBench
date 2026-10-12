import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {Runtime} from '../src/runtime.js';

async function setup(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-session-'));const r=await Runtime.open({dataDir:dir});t.after(async()=>{await r.close();await fs.rm(dir,{recursive:true,force:true});});return {r,dir};}
const httpCreate=(roomId='100',status=2)=>({bytes:Buffer.from(JSON.stringify({status_code:0,data:{id_str:roomId,status,owner:{id_str:'200'}}})),format:'http-json',urlPath:'/webcast/room/create',httpStatus:200,processName:'直播伴侣',mode:'live'});
function message(r,method,roomId,msgId,extra={}){const type=r.parser.native.root.lookupType('webcast.im.'+method.replace(/^Webcast/,''));return {bytes:type.encode(type.fromObject({common:{room_id:roomId,msg_id:msgId},...extra})).finish(),format:'business-payload',method,mode:'live'};}

test('duplicate lifecycle evidence keeps session version and records immutable RAW references',async t=>{
 const {r}=await setup(t);await r.ingest(httpCreate());const first=r.store.sessions()[0];
 await r.ingest(httpCreate());const repeated=r.store.sessions()[0];
 assert.equal(repeated.stateVersion,first.stateVersion);
 assert.equal(repeated.sessionId,first.sessionId);assert.equal(r.store.countRaw(),2);
 assert.ok(repeated.firstObservedAt);assert.ok(repeated.lastObservedAt);
 assert.equal(new Set(repeated.evidenceRefs).size,2);
 assert.equal(r.store.events({}).items.filter(x=>x.eventType==='RoomCreatedObserved').length,1);
});

test('stale create after end cannot lock selection against the next actual room',async t=>{
 const {r}=await setup(t);await r.ingest(httpCreate());
 await r.ingest(message(r,'WebcastControlMessage','100','1',{action:3}));
 await r.ingest(httpCreate());
 await r.ingest(message(r,'WebcastChatMessage','101','2'));
 assert.ok(r.store.events({}).items.some(x=>x.roomId==='101'));
 assert.equal(r.store.sessions().find(x=>x.roomId==='100').sessionState,'ENDED');
 assert.equal(r.activeRoom,'101');
});

test('unassociated HTTP finish is retained without manufacturing a completed session',async t=>{
 const {r}=await setup(t);await r.ingest(httpCreate());
 await r.ingest({bytes:Buffer.from(JSON.stringify({status_code:0,data:{owner:{id_str:'300',own_room:{room_ids_str:['999']}}}})),format:'http-json',urlPath:'/webcast/anchor_finish_info',httpStatus:200,processName:'直播伴侣',mode:'live'});
 assert.equal(r.store.countRaw(),2);assert.equal(r.store.sessions().length,1);
 assert.equal(r.store.sessions()[0].sessionState,'LIVE');
 assert.ok(r.store.logs().some(x=>x.code==='LIFECYCLE_CONTEXT_UNRESOLVED'));
});

test('restart restores selection and interrupted session resumes with the same identity',async t=>{
 const {r,dir}=await setup(t);await r.ingest(httpCreate());const sessionId=r.store.sessions()[0].sessionId;
 r.interruptCapture();await r.close();const next=await Runtime.open({dataDir:dir});
 try {
 assert.equal(next.activeRoom,'100');
 await next.ingest(message(next,'WebcastChatMessage','100','3'));
 const state=next.store.sessions()[0];assert.equal(state.sessionId,sessionId);
 assert.equal(state.captureState,'CONNECTED');assert.equal(state.sessionState,'LIVE');
 assert.equal(state.pushState,'UNKNOWN');
 } finally {await next.close();}
});

test('repeated control end is idempotent and does not recreate an ended room',async t=>{
 const {r}=await setup(t);await r.ingest(httpCreate());const end=message(r,'WebcastControlMessage','100','5',{action:3});
 await r.ingest(end);const first=r.store.sessions()[0];await r.ingest(end);
 assert.equal(r.store.sessions()[0].stateVersion,first.stateVersion);
 assert.equal(r.store.sessions()[0].endedAt,first.endedAt);
 assert.equal(r.activeRoom,null);assert.equal(r.store.countRaw(),3);
});

test('roomless messages inherit only a previously evidenced capture context',async t=>{
 const {r}=await setup(t);await r.ingest({...httpCreate(),recordingId:'capture-A'});
 const type=r.parser.native.root.lookupType('webcast.im.ChatMessage');
 const bytes=type.encode(type.fromObject({common:{msg_id:'8'},content:'synthetic context'})).finish();
 await r.ingest({bytes,format:'business-payload',method:'WebcastChatMessage',recordingId:'capture-A'});
 const bound=r.store.events({method:'WebcastChatMessage'}).items[0];assert.equal(bound.roomId,'100');assert.equal(bound.anchorUid,'200');
 assert.equal(bound.payload.official.common.room_id,'0');assert.equal(bound.payload.extensions.roomContextSource,'capture-evidence');
 await r.ingest({bytes,format:'business-payload',method:'WebcastChatMessage',recordingId:'capture-B'});
 const unbound=r.store.events({method:'WebcastChatMessage'}).items[0];assert.equal(unbound.roomId,null);assert.equal(unbound.sessionId,null);
});
