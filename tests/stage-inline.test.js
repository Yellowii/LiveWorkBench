import test from 'node:test';import assert from 'node:assert/strict';import {StageModel} from '../public/stage-model.js';
const view=(id,category,extra={})=>({eventId:String(id),eventSeq:String(id),category,mode:'live',runtimeNamespace:'live',roomId:'100',sessionId:'s',captureId:'c',content:{},...extra});
test('chat never enters the interaction stage; entries and gifts display concurrently within a bounded total',()=>{
 const m=new StageModel();m.push(Array.from({length:200},(_,i)=>view(i,'chat')));assert.equal(m.queue.length,0);assert.equal(m.seen.size,0);
 m.push(Array.from({length:8},(_,i)=>view(201+i,'member',{content:{entry:{type:'8'}}})));m.push(Array.from({length:4},(_,i)=>view(220+i,'gift')));m.step(1);assert.equal(m.active.length,12);assert.equal(m.queue.length,0);
 m.push(Array.from({length:200},(_,i)=>view(300+i,'gift')));m.step(1);assert.equal(m.active.length,12);assert.equal(m.queue.length,100);assert.equal(m.dropped,100);
});
test('likes bypass queue, coalesce only by real user in the same domain, and expire three seconds after latest trigger',()=>{
 let now=0;const m=new StageModel({now:()=>now});m.push([view(1,'like',{actor:{id:'a'},content:{count:'2'}})]);m.step(1);assert.equal(m.active.length,0);assert.equal(m.queue.length,0);assert.equal(m.likes.length,1);
 now=2000;m.push([view(2,'like',{actor:{id:'a'},content:{count:'5'}}),view(3,'like',{actor:{id:'b'}})]);assert.equal(m.likes.length,2);assert.equal(m.likes[0].view.content.count,'5','latest native count, never a guessed sum');
 now=4999;m.step(1);assert.equal(m.likes.length,2);now=5000;m.step(1);assert.equal(m.likes.length,0);
});
test('likes expire even when stage is paused, missing user IDs are not merged by nickname, and clear removes all transient state',()=>{
 let now=0;const m=new StageModel({now:()=>now});m.push([view(1,'like',{actor:{name:'同名'}}),view(2,'like',{actor:{name:'同名'}}),view(3,'like',{actor:{id:'a'}}),view(4,'like',{actor:{id:'a'},sessionId:'other'})]);assert.equal(m.likes.length,4);
 m.paused=true;now=3000;m.step(1);assert.equal(m.likes.length,0);m.push([view(5,'like')]);m.clear();assert.equal(m.likes.length,0);assert.equal(m.seen.size,0);
});
test('stale likes never extend lifetime and footer state stays bounded',()=>{
 let now=0;const m=new StageModel({now:()=>now});m.push([view(2,'like',{actor:{id:'7'}})]);now=2000;m.push([view(1,'like',{actor:{id:'7'}})]);now=3000;m.step(1);assert.equal(m.likes.length,0);
 m.push(Array.from({length:50},(_,i)=>view(i+3,'like',{actor:{id:'0'}})));assert.equal(m.likes.length,32);assert.equal(m.queue.length,0);assert.equal(m.dropped,18);
});
