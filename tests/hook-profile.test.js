import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Runtime} from '../src/runtime.js';
import {ProfileStore} from '../src/profiles/profile-store.js';
import {SourceController} from '../src/source-controller.js';
import {LiveHookDaemon} from '../src/live-hook-daemon.js';
import {MonitorCoordinator} from '../src/coordinator/monitor-coordinator.js';
import {LiveMonitor} from '../src/monitor/live-monitor.js';
let HookTargetMatcher;
try{({HookTargetMatcher}=await import('../src/targets/hook-target-matcher.js'));}catch{}
async function fixture(t){assert.ok(HookTargetMatcher,'capture profile matcher required');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-hook-profile-')),r=await Runtime.open({dataDir:dir}),profiles=new ProfileStore(r.store),matcher=new HookTargetMatcher(profiles);r.captureTargets=matcher;r.selectedSource='LiveHookSource';r.activeSourceEpoch='1';t.after(async()=>{await r.close();await fs.rm(dir,{recursive:true,force:true});});return {r,profiles,matcher};}
const create=(room,uid)=>Buffer.from(JSON.stringify({status_code:0,data:{id_str:room,status:2,owner:{id_str:uid}}}));
const input={sourceType:'LiveHookSource',sourceEpoch:'1',recordingId:'synthetic-hook',processName:'直播伴侣'};
const ws=(r,room,id)=>{const type=r.parser.native.root.lookupType('webcast.im.ChatMessage');return type.encode(type.fromObject({common:{room_id:room,msg_id:id},content:'synthetic hook'})).finish();};
test('unmatched companion identity retains RAW/proto but cannot select a session; room create is not stream-ready',async t=>{
 const {r,profiles,matcher}=await fixture(t);profiles.create({target:{type:'anchorUid',value:'200'},sourceType:'LiveHookSource',enabled:true});
 await r.ingest({...input,bytes:create('101','201'),format:'http-json',httpStatus:200,urlPath:'/webcast/room/create'});
 await r.ingest({...input,bytes:ws(r,'101','1'),format:'business-payload',method:'WebcastChatMessage'});assert.equal(r.store.countRaw(),2);assert.equal(r.store.countEvents(),0);assert.equal(r.activeRoom,null);
 await r.ingest({...input,bytes:create('100','200'),format:'http-json',httpStatus:200,urlPath:'/webcast/room/create'});assert.equal(matcher.view().streamReady,false);assert.equal(r.store.sessions()[0].pushState,'UNKNOWN');
});
test('actual matched companion frame adopts existing source; process exit/reconnect retains session and needs new stream evidence',async t=>{
 const {r,profiles,matcher}=await fixture(t),p=profiles.create({target:{type:'anchorUid',value:'200'},sourceType:'LiveHookSource',enabled:true,autoStart:true}),bridge={status:{proxyBound:true,proxyReadyAt:new Date().toISOString(),captureState:'CONNECTED',hookReady:false},async start(){throw new Error('MUST_NOT_START_PROXY');},async stop(){}};
 const controller=new SourceController(r,bridge,{}),daemon=new LiveHookDaemon(r,bridge);controller.hookMatcher=matcher;matcher.on('match.updated',e=>daemon.targetObserved(e));t.after(async()=>{await daemon.close();await controller.close();});
 daemon.observe({observedAt:new Date().toISOString(),processes:[{pid:1,startedAt:new Date(Date.now()-1000).toISOString(),hasMainWindow:true}]});assert.equal(daemon.status.hookReady,false);
 await r.ingest({...input,bytes:create('100','200'),format:'http-json',httpStatus:200,urlPath:'/webcast/room/create'});
 const frameType=r.parser.native.root.lookupType('webcast.im.PushFrame'),responseType=r.parser.native.root.lookupType('webcast.im.Response');const frame=frameType.encode(frameType.fromObject({payload:responseType.encode(responseType.fromObject({messages:[{method:'WebcastChatMessage',payload:ws(r,'100','2'),msg_id:'2'}]})).finish()})).finish();
 await r.ingest({...input,sourceConnectionId:'synthetic-connection-1',bytes:frame,format:'frame'});assert.equal(matcher.view().streamReady,true);assert.equal(daemon.status.hookReady,true);
 const sessionId=r.store.sessions()[0].sessionId;await controller.startProfile(profiles.get(p.profileId),{roomId:'100',anchorUid:'200'},controller.view().stateVersion);assert.equal(controller.web.client,undefined);
 const monitor=new LiveMonitor(profiles),coordinator=new MonitorCoordinator({profiles,monitor,sources:controller});await coordinator.evaluate();assert.equal(coordinator.view().active.profileId,p.profileId);await coordinator.close();await monitor.close();
 daemon.observe({observedAt:new Date().toISOString(),processes:[]});assert.equal(daemon.status.hookReady,false);assert.notEqual(r.store.sessions()[0].sessionState,'ENDED');
 await r.ingest({...input,sourceConnectionId:'synthetic-connection-2',bytes:frame,format:'frame'});assert.equal(r.store.sessions()[0].sessionId,sessionId);assert.equal(r.store.countRaw(),3);
 const control=r.parser.native.root.lookupType('webcast.im.ControlMessage');await r.ingest({...input,bytes:control.encode(control.fromObject({common:{room_id:'100',msg_id:'3'},action:3})).finish(),format:'business-payload',method:'WebcastControlMessage'});assert.equal(matcher.view().platformLiveState,'ENDED');assert.equal(controller.hookEndedEvidence(profiles.get(p.profileId)).confirmedState,'ENDED');
});
test('same-room wrong owner is a conflict and identity is never taken from chatting viewer',async t=>{
 const {r,profiles,matcher}=await fixture(t);profiles.create({target:{type:'anchorUid',value:'200'},sourceType:'LiveHookSource',enabled:true});
 await r.ingest({...input,bytes:create('100','200'),format:'http-json',httpStatus:200,urlPath:'/webcast/room/create'});
 const before=r.store.countEvents();await r.ingest({...input,bytes:create('100','201'),format:'http-json',httpStatus:200,urlPath:'/webcast/room/create'});assert.equal(r.store.countEvents(),before);assert.equal(matcher.view().reason,'HOOK_IDENTITY_CONFLICT');
});
