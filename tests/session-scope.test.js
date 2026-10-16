import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../src/storage.js';
import {SessionManager} from '../src/session-manager.js';
import {messagePage} from '../src/messages/query.js';

test('room/session filters bind snapshots and eviction anchors, including legacy rows',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-scopes-')),store=new Store(dir);t.after(async()=>{store.close();await fs.rm(dir,{recursive:true,force:true});});
 for(const [roomId,sessionId] of [['100','old'],['200','other'],['100','new'],['100','new']])store.addEvent({roomId,sessionId,mode:'live',runtimeNamespace:'live',eventType:'WebcastChatMessage',payload:{official:{content:'synthetic'}}},null);
 const runtime={store},q=new URLSearchParams({mode:'live',roomId:'100',sessionId:'new',limit:'1'}),page=messagePage(runtime,q);
 assert.equal(page.items.length,1);assert.equal(page.items[0].sessionId,'new');assert.equal(page.items[0].roomId,'100');assert.ok(page.nextCursor);
 assert.throws(()=>messagePage(runtime,new URLSearchParams({mode:'live',roomId:'200',sessionId:'new',cursor:page.nextCursor})),/CURSOR_MISMATCH/);
 assert.throws(()=>messagePage(runtime,new URLSearchParams({mode:'live',roomId:'100',sessionId:'old',beforeEventId:page.items[0].eventId})),/CURSOR_MISMATCH/);
 const next=messagePage(runtime,new URLSearchParams({...Object.fromEntries(q),cursor:page.nextCursor}));assert.equal(next.items.length,1);assert.equal(next.items[0].sessionId,'new');
});

test('ended archive is idempotent; only fresh confirmed official transition may start another generation',()=>{
 const memory=new Map(),sessions=new SessionManager({sessions:()=>[...memory.values()].map(x=>structuredClone(x)),saveSession:(k,s)=>memory.set(k,structuredClone(s))});
 const first=sessions.observe({roomId:'100',anchorUid:'200',live:true,observedAt:'2026-10-16T10:00:00Z'});
 sessions.observe({roomId:'100',anchorUid:'200',ended:true,observedAt:'2026-10-16T11:00:00Z'});
 assert.equal(sessions.find('100').archiveState,'PENDING');
 sessions.archive(first.sessionId,'synthetic-end');sessions.archive(first.sessionId,'synthetic-end');assert.equal(sessions.find('100').archiveState,'COMPLETE');
 assert.equal(sessions.observe({roomId:'100',anchorUid:'200',live:true}).sessionId,first.sessionId);
 const evidence={roomId:'100',anchorUid:'200',queryState:'LIVE',confirmedState:'LIVE',checkedAt:'2026-10-16T12:00:00Z',lastTransitionAt:'2026-10-16T12:00:00Z',stateVersion:'3',evidence:{source:'douyin-structured-room'}};
 assert.equal(sessions.beginConfirmed({...evidence,lastTransitionAt:'2026-10-16T10:00:00Z'}).sessionId,first.sessionId);
 const second=sessions.beginConfirmed(evidence);assert.notEqual(second.sessionId,first.sessionId);assert.equal(second.sessionState,'LIVE');assert.equal(memory.size,2);
 assert.equal(sessions.beginConfirmed(evidence).sessionId,second.sessionId);assert.equal(sessions.observe({roomId:'100'}).sessionId,second.sessionId);
 assert.equal([...memory.values()].find(x=>x.sessionId===first.sessionId).archiveState,'COMPLETE');
});
