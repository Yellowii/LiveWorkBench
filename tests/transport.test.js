import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Runtime} from '../src/runtime.js';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function setup(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-transport-')),r=await Runtime.open({dataDir:dir});t.after(async()=>{await r.close();await fs.rm(dir,{recursive:true,force:true});});return r;}
function encode(r,name,value){const type=r.parser.native.root.lookupType('webcast.im.'+name);return Buffer.from(type.encode(type.fromObject(value)).finish());}
test('persisted gzip frame indexes every known, unknown and damaged business payload before deduplication',async t=>{
 const r=await setup(t),chat=encode(r,'ChatMessage',{common:{room_id:'101',msg_id:'9007199254740993'},content:'synthetic'}),unknown=Buffer.from([8,7]),damaged=Buffer.from([255]);
 const response=encode(r,'Response',{messages:[{method:'WebcastChatMessage',msg_id:'9007199254740993',payload:chat},{method:'FutureMethod',msg_id:'9007199254740994',payload:unknown},{method:'WebcastChatMessage',msg_id:'9007199254740995',payload:damaged}]});
 const frame=encode(r,'PushFrame',{payload:gzipSync(response),headers:[{key:'compress_type',value:'gzip'}]});
 const first=await r.ingest({bytes:frame,format:'frame',recordingId:'synthetic',sourceConnectionId:'fixture:1'});
 const trace=r.store.rawTrace(first.rawId);assert.equal(trace.transport.status,'unpacked');assert.equal(trace.messages.length,3);
 assert.deepEqual(trace.messages.map(x=>x.messageIndex),[0,1,2]);assert.deepEqual(trace.messages.map(x=>x.parseStatus),['decoded','unknown','error']);
 assert.equal(trace.messages[0].msgId,'9007199254740993');assert.equal(trace.messages[1].payloadHash,sha(unknown));assert.equal(trace.messages[2].errorCode,'BUSINESS_PROTO_INVALID');
 for(const [index,bytes]of [chat,unknown,damaged].entries()){assert.deepEqual(await r.unpacker.readPayload(trace.messages[index].protoId),bytes);assert.equal(trace.messages[index].rawOffset,null);assert.ok(trace.messages[index].eventId);}
 await r.ingest({bytes:frame,format:'frame',recordingId:'synthetic',sourceConnectionId:'fixture:1'});
 assert.equal(r.store.countRaw(),2);assert.equal(r.store.protoCount(),6);assert.equal(r.store.events({method:'WebcastChatMessage'}).items.filter(x=>x.payload.decodeStatus==='decoded').length,1);
 assert.equal(r.store.rawTrace(first.rawId).messages[0].payloadHash,sha(chat));
});
for(const kind of ['invalid-outer','invalid-gzip'])test(`${kind} preserves its parent RAW and records the failing transport stage`,async t=>{
 const r=await setup(t),bytes=kind==='invalid-outer'?Buffer.from([255]):encode(r,'PushFrame',{payload:Buffer.from([1,2,3]),payload_encoding:'gzip'});
 const raw=await r.ingest({bytes,format:'frame'}),trace=r.store.rawTrace(raw.rawId);
 assert.equal(r.store.countRaw(),1);assert.deepEqual(await fs.readFile(r.store.raw(raw.rawId).filePath),bytes);
 assert.equal(trace.transport.status,'error');assert.equal(trace.transport.errorCode,kind==='invalid-gzip'?'TRANSPORT_DECOMPRESS_FAILED':'TRANSPORT_ENVELOPE_INVALID');assert.equal(trace.messages.length,0);
});
test('unpacking reads durable bytes and verifies their hash instead of accepting replacement caller bytes',async t=>{
 const r=await setup(t),bytes=encode(r,'Response',{messages:[{method:'FutureMethod',payload:Buffer.from([8,1])}]}),raw=await r.ingest({bytes,format:'response',deferTransport:true});
 await r.process(raw,Buffer.from([255]));assert.equal(r.store.rawTrace(raw.rawId).messages.length,1);
 const file=r.store.raw(raw.rawId).filePath;await fs.writeFile(file,Buffer.from([255]));
 await r.process(raw,bytes);assert.equal(r.store.rawTrace(raw.rawId).transport.errorCode,'RAW_HASH_MISMATCH');
});
