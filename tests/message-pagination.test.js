import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {Store} from '../src/storage.js';
import {messagePage} from '../src/messages/query.js';
test('history resumes exactly before the oldest retained row after live cache eviction, with domain-bound snapshot',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-message-cursor-')),store=new Store(dir),runtime={store};
 try{
  for(let n=1;n<=720;n++)store.addEvent({eventType:'WebcastChatMessage',mode:'live',runtimeNamespace:'live',payload:{official:{content:'synthetic '+n}}},'synthetic-'+n);
  const newest=store.events({limit:200}).items,anchor=newest.at(-1);
  const page=messagePage(runtime,new URLSearchParams({beforeEventId:anchor.eventId,mode:'live',limit:'100'}));
  assert.equal(BigInt(page.items[0].eventSeq),BigInt(anchor.eventSeq)-1n);assert.equal(page.items.length,100);assert.ok(page.nextCursor);
  assert.throws(()=>messagePage(runtime,new URLSearchParams({beforeEventId:anchor.eventId,mode:'replay'})),/CURSOR_MISMATCH/);
  assert.throws(()=>messagePage(runtime,new URLSearchParams({beforeEventId:anchor.eventId,afterSeq:'0'})),/CURSOR_MISMATCH/);
  store.addEvent({eventType:'WebcastChatMessage',mode:'live',runtimeNamespace:'live',payload:{official:{content:'new'}}},'new');
  const older=messagePage(runtime,new URLSearchParams({mode:'live',cursor:page.nextCursor,limit:'100'}));assert.equal(older.snapshot,page.snapshot);assert.equal(BigInt(older.items[0].eventSeq),BigInt(page.items.at(-1).eventSeq)-1n);
 }finally{store.close();await fs.rm(dir,{recursive:true,force:true});}
});
