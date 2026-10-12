import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Runtime} from '../src/runtime.js';
test('monitor END is separate typed evidence, scoped to existing matching session and idempotent',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-monitor-session-')),r=await Runtime.open({dataDir:dir});t.after(async()=>{await r.close();await fs.rm(dir,{recursive:true,force:true});});
 assert.equal(typeof r.observePlatformEvidence,'function','formal platform evidence command required');
 const evidence={confirmedState:'ENDED',queryState:'ENDED',roomId:'100',anchorUid:'200',profileId:'synthetic-profile',stateVersion:'2',checkedAt:new Date().toISOString(),evidence:{source:'douyin-structured-room'}};
 assert.equal(r.observePlatformEvidence(evidence),null);assert.equal(r.store.sessions().length,0);
 const initial=r.sessions.observe({roomId:'100',anchorUid:'200',live:true});r.activeRoom='100';r.interruptCapture();
 assert.equal(r.observePlatformEvidence({...evidence,queryState:'UNKNOWN'}),null);assert.equal(r.observePlatformEvidence({...evidence,anchorUid:'201'}),null);assert.notEqual(r.store.sessions()[0].sessionState,'ENDED');
 const ended=r.observePlatformEvidence(evidence);assert.equal(ended.sessionId,initial.sessionId);assert.equal(ended.sessionState,'ENDED');assert.equal(ended.pushState,'UNKNOWN');assert.equal(r.activeRoom,null);assert.equal(r.store.countEvents(),1);
 r.observePlatformEvidence(evidence);assert.equal(r.store.countEvents(),1);assert.equal(r.store.events({}).items[0].producer,'MonitorCoordinator');assert.equal(r.store.events({}).items[0].payload.official,null);
});
