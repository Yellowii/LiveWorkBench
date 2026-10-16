import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../src/storage.js';
import {ProfileStore} from '../src/profiles/profile-store.js';
import {LiveMonitor} from '../src/monitor/live-monitor.js';
let MonitorCoordinator,WebConnectionResolver;
try{({MonitorCoordinator}=await import('../src/coordinator/monitor-coordinator.js'));({WebConnectionResolver}=await import('../src/capture/websource/connection-resolver.js'));}catch{}
async function fixture(t){assert.ok(MonitorCoordinator,'independent coordinator required');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-coordinate-')),store=new Store(dir),profiles=new ProfileStore(store),monitor=new LiveMonitor(profiles);let starts=0,stops=0;const sources={state:{selectedSource:'LiveHookSource',captureState:'STOPPED',stateVersion:'1'},view(){return {...this.state};},async startProfile(p,e){starts++;this.state.captureState='CONNECTED';return {...this.state};},async stopProfile(){stops++;this.state.captureState='STOPPED';}};const coordinator=new MonitorCoordinator({profiles,monitor,sources});t.after(async()=>{await coordinator.close();await monitor.close();store.close();await fs.rm(dir,{recursive:true,force:true});});return {profiles,monitor,sources,coordinator,counts:()=>({starts,stops})};}
function live(f,p,{state='LIVE',roomId='100'}={}){f.profiles.setState(p.profileId,{profileId:p.profileId,profileVersion:p.version,confirmedState:state,queryState:state,stateVersion:'1',roomId,anchorUid:'200',checkedAt:new Date().toISOString(),web_rid:'123'});}
test('automatic coordinator cannot switch source, preempt busy room or repeat the same connection',async t=>{
 const f=await fixture(t),p=f.profiles.create({target:{type:'web_rid',value:'123'},enabled:true,autoStart:true});live(f,p);
 await f.coordinator.evaluate();assert.equal(f.counts().starts,0);assert.equal(f.sources.state.selectedSource,'LiveHookSource');
 f.sources.state.selectedSource='WebSource';f.sources.state.captureState='CONNECTED';await f.coordinator.evaluate();assert.equal(f.counts().starts,0);
 f.sources.state.captureState='STOPPED';await Promise.all([f.coordinator.evaluate(),f.coordinator.evaluate()]);assert.equal(f.counts().starts,1);
 await f.coordinator.evaluate();assert.equal(f.counts().starts,1);
});
test('equal priorities wait for choice; manual stop suppresses this live state; UNKNOWN never auto-stops',async t=>{
 const f=await fixture(t);f.sources.state.selectedSource='WebSource';const input={target:{type:'web_rid',value:'123'},enabled:true,autoStart:true,autoStop:true};const a=f.profiles.create(input),b=f.profiles.create(input);live(f,a);live(f,b,{roomId:'101'});
 await f.coordinator.evaluate();assert.equal(f.coordinator.view().reason,'PROFILE_SELECTION_REQUIRED');assert.equal(f.counts().starts,0);
 await f.coordinator.start(a.profileId);assert.equal(f.counts().starts,1);
 f.profiles.setState(a.profileId,{...f.monitor.view(a.profileId),queryState:'UNKNOWN'});await f.coordinator.evaluate();assert.equal(f.counts().stops,0);
 await f.coordinator.manualStop();assert.equal(f.counts().stops,1);live(f,a);await f.coordinator.evaluate();assert.equal(f.counts().starts,1);
});
test('confirmed END only stops matching owned profile; highest priority wins and failure circuit is bounded',async t=>{
 const f=await fixture(t);f.sources.state.selectedSource='WebSource';const a=f.profiles.create({target:{type:'web_rid',value:'123'},enabled:true,autoStart:true,autoStop:true,priority:4}),b=f.profiles.create({target:{type:'web_rid',value:'124'},enabled:true,autoStart:true,priority:1});live(f,a);live(f,b,{roomId:'101'});
 await f.coordinator.evaluate();assert.equal(f.coordinator.view().active.profileId,a.profileId);
 f.profiles.setState(a.profileId,{...f.monitor.view(a.profileId),confirmedState:'ENDED',queryState:'ENDED',stateVersion:'2'});await f.coordinator.evaluate();assert.equal(f.counts().stops,1);
 f.sources.startProfile=async()=>{throw new Error('WEB_DYNAMIC_PARAMETERS_UNAVAILABLE');};await f.coordinator.evaluate();await f.coordinator.evaluate();assert.equal(f.coordinator.view().reason,'WEB_DYNAMIC_PARAMETERS_UNAVAILABLE');
});
test('direct connection resolver never invents signatures; browser fallback is explicitly opt-in',async()=>{
 assert.ok(WebConnectionResolver);const resolver=new WebConnectionResolver();
 await assert.rejects(()=>resolver.resolve({connectionMode:'direct',browserFallback:false},{roomId:'100',anchorUid:'200',web_rid:'123'}),/WEB_DYNAMIC_PARAMETERS_UNAVAILABLE/);
 const config=await resolver.resolve({connectionMode:'direct',browserFallback:true},{roomId:'100',anchorUid:'200',web_rid:'123'});assert.equal(config.kind,'browser');assert.equal(config.roomUrl,'https://live.douyin.com/123');
 await assert.rejects(()=>resolver.resolve({connectionMode:'browser'},{roomId:'100',anchorUid:'200'}),/TARGET_MAPPING_REQUIRED/);
});
test('explicit listen attempts a freshly matched room without LIVE confirmation; automatic selection stays blocked',async t=>{
 const f=await fixture(t);f.sources.state.selectedSource='WebSource';const p=f.profiles.create({target:{type:'web_rid',value:'123'},enabled:true,autoStart:true});
 f.monitor.adapter={probe:async()=>({state:'UNKNOWN',errorCode:'MONITOR_EVIDENCE_UNAVAILABLE'})};
 f.sources.resolveProfile=async()=>({roomId:'100',anchorUid:'200',web_rid:'123',queryState:'UNKNOWN',confirmedState:'UNKNOWN',parameterDiscovery:'http'});
 await f.coordinator.evaluate();assert.equal(f.counts().starts,0);
 await f.coordinator.listen(p.profileId,p.version);assert.equal(f.counts().starts,1);assert.equal(f.monitor.view(p.profileId).confirmedState,'UNKNOWN');
});

test('associated platform end stops Web even with idle monitor/legacy autoStop disabled; stale end cannot stop new epoch',async t=>{
 const f=await fixture(t);f.sources.state.selectedSource='WebSource';const p=f.profiles.create({target:{type:'web_rid',value:'123'},enabled:true,autoStart:true,autoStop:false});live(f,p);
 f.coordinator.sessionFor=()=>({roomId:'100',anchorUid:'200',sessionId:'synthetic',sessionState:'ENDED',lastSourceEpoch:'old'});
 f.sources.state.sourceEpoch='new';await f.coordinator.start(p.profileId);await f.coordinator.evaluate();assert.equal(f.counts().stops,0);
 f.coordinator.sessionFor=()=>({roomId:'100',anchorUid:'200',sessionId:'synthetic',sessionState:'ENDED',lastSourceEpoch:'new'});
 await f.coordinator.evaluate();assert.equal(f.counts().stops,1);assert.equal(f.coordinator.view().active,null);
 await f.coordinator.evaluate();assert.equal(f.counts().starts,1,'old LIVE probe must not auto-restart the ended session');
});
