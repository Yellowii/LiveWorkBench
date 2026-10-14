import test from 'node:test';
import assert from 'node:assert/strict';
import {SourceController} from '../src/source-controller.js';
const evidence={roomId:'100',anchorUid:'200',web_rid:'123',parameterDiscovery:'http'};
function fixture(){
 const calls=[],runtime={dataDir:'artifacts/synthetic-fallback-unused',store:{getState:()=>null,setState:()=>{}},emit:()=>{},interruptCapture:()=>{},gaps:{record:async e=>calls.push(e.reason)},parser:{},log:()=>{}},profile={profileId:'synthetic',version:'1',sourceType:'WebSource',connectionMode:'direct',browserFallback:true,autoReconnect:true};
 const controller=new SourceController(runtime,{status:{captureState:'STOPPED'},stop:async()=>{}},{},{profiles:{get:()=>profile}});controller.state.selectedSource='WebSource';controller.credentialsFor=async()=>({storageState:null});
 controller.web.start=async()=>{calls.push('native-start');controller.web.status.captureState='CONNECTED';};controller.web.stop=async()=>{calls.push('native-stop');controller.web.status.captureState='STOPPED';};controller.browser.start=async config=>{calls.push('browser-start');assert.equal(config.headless,true);controller.browser.status.captureState='CONNECTED';controller.browser.client={};};controller.browser.stop=async()=>{calls.push('browser-stop');controller.browser.client=null;controller.browser.status.captureState='STOPPED';};controller.browser.park=async()=>{calls.push('browser-park');controller.browser.status.captureState='STOPPED';};
 controller.connectionResolver={resolve:async()=>({...evidence,kind:'direct',url:'SYNTHETIC',connectionReason:'WEB_NATIVE_PARAMETERS_READY',parameterDiscovery:'http'})};return {controller,profile,calls};
}
test('native terminal failure drains the old source before an explicitly permitted hidden fallback',async t=>{
 const f=fixture();t.after(()=>f.controller.close());await f.controller.startProfile(f.profile,evidence,'1');f.controller.web.status={captureState:'FAILED',reason:'WEB_HANDSHAKE_OR_POLICY_BLOCKED'};f.controller.web.emit('status',f.controller.web.status);await f.controller.queue;
 assert.equal(f.controller.view().connectionMode,'browser');assert.equal(f.controller.view().connectionReason,'WEB_HANDSHAKE_OR_POLICY_BLOCKED');assert.ok(f.calls.indexOf('native-stop')<f.calls.indexOf('browser-start'));
});
test('RAW failure never triggers browser fallback and a queued retry cannot revive manual stop',async t=>{
 const f=fixture();t.after(()=>f.controller.close());await f.controller.startProfile(f.profile,evidence,'1');f.controller.web.status={captureState:'FAILED',reason:'WEB_RAW_COMMIT_FAILED'};f.controller.web.emit('status',f.controller.web.status);await f.controller.queue;assert.ok(!f.calls.includes('browser-start'));
 await f.controller.stopProfile();await f.controller.probeNative(f.controller.webPlan);assert.equal(f.controller.view().captureState,'STOPPED');assert.equal(f.calls.filter(x=>x==='native-start').length,1);
});
test('recovery parks the browser transport, starts one native source and releases browser only after stability',async t=>{
 const f=fixture();t.after(()=>f.controller.close());await f.controller.startProfile(f.profile,evidence,'1');f.controller.web.status={captureState:'FAILED',reason:'WEB_HANDSHAKE_OR_POLICY_BLOCKED'};f.controller.web.emit('status',f.controller.web.status);await f.controller.queue;
 await f.controller.probeNative(f.controller.webPlan);assert.ok(f.calls.indexOf('browser-park')<f.calls.lastIndexOf('native-start'));assert.ok(f.controller.browser.client);f.controller.web.client={status:{received:3}};f.controller.web.status.lastMessageAt=new Date().toISOString();f.controller.nativeStableAt=Date.now()-31000;await f.controller.settleNative(f.controller.webPlan);assert.equal(f.controller.browser.client,null);assert.equal(f.controller.view().connectionMode,'direct');
});
test('editing a profile during native stability cancels recovery and releases the parked owned browser',async t=>{
 const f=fixture();let current=true;t.after(()=>f.controller.close());await f.controller.startProfile(f.profile,evidence,'1',()=>current);f.controller.web.status={captureState:'FAILED',reason:'WEB_HANDSHAKE_OR_POLICY_BLOCKED'};f.controller.web.emit('status',f.controller.web.status);await f.controller.queue;await f.controller.probeNative(f.controller.webPlan);const plan=f.controller.webPlan;assert.ok(f.controller.browser.client);current=false;await f.controller.settleNative(plan);assert.equal(f.controller.browser.client,null);
});
