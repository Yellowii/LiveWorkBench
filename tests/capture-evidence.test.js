import test from 'node:test';import assert from 'node:assert/strict';
import {committedCaptureEvidence} from '../src/monitor/capture-evidence.js';
test('in-flight frame counters and stale status timestamps cannot prove a committed current capture',()=>{
 const source={captureId:'new',frameSeq:1,status:{lastMessageAt:'2026-10-16T12:00:00Z'}};
 assert.equal(committedCaptureEvidence({rawPage:()=>({items:[]})},source),null);
 const raw={recordingId:'new',mode:'live',runtimeNamespace:'live',profileId:'p',captureSeq:'2',receivedAt:'2026-10-16T12:01:00Z'};
 assert.deepEqual(committedCaptureEvidence({rawPage:(id,{limit})=>{assert.equal(id,'new');assert.equal(limit,1);return {items:[raw]};}},source),{profileId:'p',captureId:'new',received:'2',lastMessageAt:raw.receivedAt});
 for(const extra of [{recordingId:'old'},{mode:'test'},{runtimeNamespace:'replay:x'}])assert.equal(committedCaptureEvidence({rawPage:()=>({items:[{...raw,...extra}]})},source),null);
});
