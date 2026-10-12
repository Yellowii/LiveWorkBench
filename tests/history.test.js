import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {Runtime} from '../src/runtime.js';
async function setup(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-history-'));const r=await Runtime.open({dataDir:dir});t.after(async()=>{await r.close();await fs.rm(dir,{recursive:true,force:true});});return r;}
async function append(r,n){const type=r.parser.native.root.lookupType('webcast.im.ChatMessage');await r.ingest({bytes:type.encode(type.fromObject({common:{room_id:'100',msg_id:String(n)},content:'synthetic history'})).finish(),format:'business-payload',method:'WebcastChatMessage'});}

test('history cursor rejects forged boundaries and keeps a stable snapshot',async t=>{
 const r=await setup(t);for(let n=1;n<=4;n++)await append(r,n);
 const first=r.store.events({limit:2});
 const [encoded,signature]=first.nextCursor.split('.');const body=JSON.parse(Buffer.from(encoded,'base64url'));body.before='999';
 const forged=Buffer.from(JSON.stringify(body)).toString('base64url')+(signature?'.'+signature:'');
 assert.throws(()=>r.store.events({limit:2,cursor:forged}),/CURSOR_MISMATCH/);
 await append(r,5);const next=r.store.events({limit:2,cursor:first.nextCursor});assert.deepEqual(next.items.map(e=>e.msgId),['2','1']);assert.equal(next.snapshot,'4');
});

test('high-watermark queries return only the persisted gap and bind it to the cursor',async t=>{
 const r=await setup(t);for(let n=1;n<=5;n++)await append(r,n);
 const page=r.store.events({afterSeq:'2',limit:2});assert.deepEqual(page.items.map(e=>e.msgId),['5','4']);
 const next=r.store.events({afterSeq:'2',limit:2,cursor:page.nextCursor});assert.deepEqual(next.items.map(e=>e.msgId),['3']);
 assert.throws(()=>r.store.events({afterSeq:'0',cursor:page.nextCursor}),/CURSOR_MISMATCH/);
});

test('event sequence and snapshot remain exact beyond JavaScript safe integers',async t=>{
 const r=await setup(t);const event={eventId:'synthetic-high-event',eventType:'Synthetic',mode:'test',runtimeNamespace:'test:large'};
 r.store.db.prepare('INSERT INTO events(seq,id,mode,namespace,method,json) VALUES(?,?,?,?,?,?)').run(9007199254740993n,event.eventId,event.mode,event.runtimeNamespace,event.eventType,JSON.stringify(event));
 assert.equal(r.store.events({}).snapshot,'9007199254740993');assert.equal(r.store.event(event.eventId).eventSeq,'9007199254740993');
});
