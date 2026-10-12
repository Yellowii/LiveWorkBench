import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Runtime} from '../src/runtime.js';
async function setup(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-business-')),r=await Runtime.open({dataDir:dir});t.after(async()=>{await r.close();await fs.rm(dir,{recursive:true,force:true});});return r;}
function encode(r,name,data){const type=r.parser.native.root.lookupType('webcast.im.'+name);return type.encode(type.fromObject(data)).finish();}
test('business parsing uses its payload interface, stores native output and separates extension fields',async t=>{
 const r=await setup(t);r.parser.decode=()=>{throw new Error('Legacy mixed packet parser must not be called');};
 const bytes=encode(r,'ChatMessage',{common:{msg_id:'91',room_id:'101'},user:{webcast_uid:'999'},content:'synthetic native'});
 const raw=await r.ingest({bytes,format:'business-payload',method:'WebcastChatMessage'});
 const message=r.store.rawTrace(raw.rawId).messages[0],detail=r.protoDetail(message.protoId);
 assert.equal(detail.attempts[0].official.content,'synthetic native');assert.equal(detail.attempts[0].official.user.webcast_uid,'999');
 assert.equal(detail.attempts[0].official.userIdAlias,undefined);assert.equal(r.store.events({}).items[0].payload.extensions.userIdAlias,'999');
});
test('manual message reparse appends a result without touching events, live sessions or RAW',async t=>{
 const r=await setup(t),raw=await r.ingest({bytes:encode(r,'ChatMessage',{common:{room_id:'101',msg_id:'92'}}),method:'WebcastChatMessage',format:'business-payload'});
 const proto=r.store.rawTrace(raw.rawId).messages[0],events=r.store.events({}),sessions=r.store.sessions(),rawCount=r.store.countRaw();
 const result=await r.reparseMessage(proto.protoId);
 assert.equal(result.parseStatus,'decoded');assert.equal(r.protoDetail(proto.protoId).attempts.length,2);
 assert.deepEqual(r.store.events({}),events);assert.deepEqual(r.store.sessions(),sessions);assert.equal(r.store.countRaw(),rawCount);
 assert.equal(r.store.rawTrace(raw.rawId).messages[0].eventId,proto.eventId);
});
test('a damaged derived payload cannot abort parsing the remaining messages',async t=>{
 const r=await setup(t),response=encode(r,'Response',{messages:[{method:'FutureMethod',payload:Buffer.from([8,1])},{method:'WebcastChatMessage',payload:encode(r,'ChatMessage',{common:{room_id:'101',msg_id:'93'}})}]});
 const raw=await r.ingest({bytes:response,format:'response',deferTransport:true});const indexed=await r.unpacker.unpack(raw);
 await fs.writeFile(r.store.protos.get(indexed.messages[0].protoId).payloadFile,Buffer.from([255]));await r.process(raw);
 const messages=r.store.rawTrace(raw.rawId).messages;assert.equal(messages[0].errorCode,'PROTO_PAYLOAD_HASH_MISMATCH');assert.equal(messages[1].parseStatus,'decoded');assert.ok(messages[1].eventId);
});
test('replay parsing does not replace the original live Proto event linkage',async t=>{
 const r=await setup(t),raw=await r.ingest({bytes:encode(r,'ChatMessage',{common:{room_id:'101',msg_id:'94'}}),format:'business-payload',method:'WebcastChatMessage'});
 const before=r.store.rawTrace(raw.rawId).messages[0];const replay=await r.createReplay({recordingId:raw.recordingId});await r.replayAction(replay.replayId,'step');
 assert.equal(r.store.rawTrace(raw.rawId).messages[0].eventId,before.eventId);
});
