import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Runtime} from '../src/runtime.js';
import {SourceController} from '../src/source-controller.js';
const profile={profileId:'synthetic-room',sourceType:'WebSource',connectionMode:'direct',browserFallback:false};
const evidence=roomId=>({roomId,anchorUid:'200',web_rid:'123'});
async function fixture(t,{restart=false}={}){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-room-handoff-'));let runtime=await Runtime.open({dataDir:dir});
 const initial=runtime.sessions.observe({roomId:'100',anchorUid:'200',live:true});runtime.activeRoom='100';runtime.interruptCapture();
 if(restart){await runtime.close();runtime=await Runtime.open({dataDir:dir});}
 const controller=new SourceController(runtime,{status:{captureState:'STOPPED'},stop:async()=>{}},{});await controller.action({action:'switch',sourceType:'WebSource',expectedVersion:controller.view().stateVersion});
 let starts=0;controller.web.start=async()=>{starts++;controller.web.status.captureState='CONNECTED';};
 controller.connectionResolver={resolve:async(_p,e)=>({...e,kind:'direct',url:'synthetic-unused'})};
 t.after(async()=>{await controller.close();await runtime.close();await fs.rm(dir,{recursive:true,force:true});});
 let sequence=0;const ingest=async(roomId,epoch=controller.view().sourceEpoch)=>{const type=runtime.parser.native.root.lookupType('webcast.im.ChatMessage'),bytes=type.encode(type.fromObject({common:{room_id:roomId,msg_id:String(++sequence)},content:'synthetic handoff'})).finish();await runtime.ingest({bytes,format:'business-payload',method:'WebcastChatMessage',mode:'live',sourceType:'WebSource',sourceEpoch:epoch,anchorUid:'200'});};
 return {runtime,controller,initial,ingest,starts:()=>starts};
}
test('stopped or restarted capture can select a different room without ending the old session',async t=>{
 const f=await fixture(t,{restart:true}),{runtime:r,controller:c}=f,oldEpoch=c.view().sourceEpoch;
 await c.startProfile(profile,evidence('101'),c.view().stateVersion);assert.equal(r.activeRoom,'101');await f.ingest('101');
 const other=r.sessions.find('101');assert.ok(other);assert.equal(r.sessions.find('100').sessionId,f.initial.sessionId);assert.equal(r.sessions.find('100').sessionState,'LIVE');assert.equal(r.sessions.find('100').captureState,'INTERRUPTED');
 await f.ingest('100',oldEpoch);await f.ingest('100');assert.equal(r.store.countRaw(),3);assert.equal(r.store.countEvents(),1);
 await c.stopProfile();await c.startProfile(profile,evidence('100'),c.view().stateVersion);await f.ingest('100');assert.equal(r.sessions.find('100').sessionId,f.initial.sessionId);assert.equal(r.sessions.find('101').sessionId,other.sessionId);assert.equal(r.sessions.find('101').sessionState,'UNRESOLVED');assert.equal(r.store.countEvents(),2);
});
test('active transport and invalid parameters cannot change room selection',async t=>{
 const f=await fixture(t),c=f.controller;c.web.status.captureState='CONNECTED';
 await assert.rejects(()=>c.startProfile(profile,evidence('101'),c.view().stateVersion),/SOURCE_BUSY/);assert.equal(f.runtime.activeRoom,'100');assert.equal(f.starts(),0);
 c.web.status.captureState='STOPPED';c.connectionResolver.resolve=async()=>{throw Error('TARGET_IDENTITY_UNRESOLVED');};
 await assert.rejects(()=>c.startProfile(profile,evidence('101'),c.view().stateVersion),/TARGET_IDENTITY_UNRESOLVED/);assert.equal(f.runtime.activeRoom,'100');assert.equal(f.starts(),0);
});
test('handoff drains old inputs before rebinding and rejects profile changes during the drain',async t=>{
 const f=await fixture(t),c=f.controller;let current=true,drains=0;
 c.web.stop=async()=>{drains++;await f.ingest('100');current=false;c.web.status.captureState='STOPPED';};
 await assert.rejects(()=>c.startProfile(profile,evidence('101'),c.view().stateVersion,()=>current),/STATE_CONFLICT/);assert.equal(drains,1);assert.equal(f.runtime.activeRoom,'100');assert.equal(f.starts(),0);assert.equal(f.runtime.store.countEvents(),1);
 c.web.stop=async()=>{c.web.status.captureState='STOPPED';};
});
