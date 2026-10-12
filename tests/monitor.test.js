import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../src/storage.js';
let ProfileStore,TargetResolver,LiveMonitor,extractRoomEvidence,SafeDouyinHttp;
try{({ProfileStore}=await import('../src/profiles/profile-store.js'));({TargetResolver}=await import('../src/targets/resolver.js'));({LiveMonitor}=await import('../src/monitor/live-monitor.js'));({extractRoomEvidence}=await import('../src/monitor/douyin-adapter.js'));({SafeDouyinHttp}=await import('../src/targets/safe-http.js'));}catch{}
async function fixture(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-monitor-'));const store=new Store(dir);t.after(async()=>{store.close();await fs.rm(dir,{recursive:true,force:true});});return store;}
test('profile versions, write-only input and restart preserve independent source selection',async t=>{
 assert.ok(ProfileStore,'persistent Profile component required');const store=await fixture(t);store.setState('source-control',{selectedSource:'LiveHookSource'});
 const profiles=new ProfileStore(store);const p=profiles.create({name:'synthetic',target:{type:'web_rid',value:'123'},sourceType:'WebSource',enabled:true});
 assert.equal(p.version,'1');assert.equal(p.target.inputPresent,true);assert.equal(p.target.value,undefined);
 assert.throws(()=>profiles.update(p.profileId,{name:'changed'},'0'),/STATE_CONFLICT/);
 profiles.update(p.profileId,{name:'changed'},'1');assert.equal(new ProfileStore(store).get(p.profileId).target.value,'123');
 assert.equal(store.getState('source-control').selectedSource,'LiveHookSource');
 assert.throws(()=>profiles.create({target:{type:'roomId',value:9007199254740993}}),/PROFILE_INVALID/);
});
test('resolver separates UID, secUid, web_rid and actual roomId and bounds share redirects',async()=>{
 assert.ok(TargetResolver,'independent resolver required');const resolver=new TargetResolver({http:{get:async()=>({url:'https://live.douyin.com/123',text:''})}});
 assert.equal(resolver.classify({type:'roomId',value:'9876543210123456789'}).roomId,'9876543210123456789');
 assert.equal(resolver.classify({type:'anchorUid',value:'123'}).web_rid,null);
 assert.equal(resolver.classify({type:'auto',value:'123'}).status,'PENDING_TYPE');
 assert.equal(resolver.classify({type:'auto',value:'MS4wLjABAAAA_SYNTHETIC'}).secUid,'MS4wLjABAAAA_SYNTHETIC');
 const resolved=await resolver.resolve({type:'url',value:'https://v.douyin.com/synthetic/'});assert.equal(resolved.web_rid,'123');assert.equal(resolved.roomId,null);
 assert.throws(()=>resolver.classify({type:'url',value:'http://live.douyin.com/123'}),/TARGET_INVALID/);
});
test('HTTPS resolver rejects private DNS answers and untrusted target domains',async()=>{
 assert.ok(SafeDouyinHttp,'SSRF-safe HTTP adapter required');
 for(const address of ['127.0.0.1','10.2.3.4','192.168.1.1','169.254.169.254','::1','::ffff:127.0.0.1','fc00::1']){
  const http=new SafeDouyinHttp({lookup:async()=>[{address,family:address.includes(':')?6:4}]});await assert.rejects(()=>http.get('https://live.douyin.com/123'),/TARGET_PRIVATE_ADDRESS/);
 }
 await assert.rejects(()=>new SafeDouyinHttp().get('https://live.douyin.com.evil.test/123'),/TARGET_INVALID/);
});
test('only target-matched structured room evidence determines live state, preserves large IDs',()=>{
 assert.ok(extractRoomEvidence,'structured evidence extractor required');
 const html='<script id="RENDER_DATA" type="application/json">'+encodeURIComponent(JSON.stringify({roomInfo:{room:{id_str:'9876543210123456789',web_rid:'123',status:2,owner:{id_str:'456',sec_uid:'MS4wLjABAAAA_SYNTHETIC'}}}}))+'</script>';
 const e=extractRoomEvidence(html,{web_rid:'123'});assert.equal(e.state,'LIVE');assert.equal(e.roomId,'9876543210123456789');assert.equal(e.anchorUid,'456');assert.equal(e.pushState,'UNKNOWN');
 assert.equal(extractRoomEvidence(html,{web_rid:'999'}).state,'UNKNOWN');
 assert.equal(extractRoomEvidence('<div>https://media.invalid/recommended.flv</div>',{web_rid:'123'}).state,'UNKNOWN');
});
test('confirmed monitor transitions persist; failure is unknown, restart does not repeat live event',async t=>{
 assert.ok(LiveMonitor,'independent monitor required');const profiles=new ProfileStore(await fixture(t));const p=profiles.create({target:{type:'web_rid',value:'123'},enabled:true,monitorEnabled:true,confirmations:2});
 let evidence={state:'LIVE',anchorUid:'456',roomId:'9876543210123456789',web_rid:'123',source:'synthetic-structured'};
 const monitor=new LiveMonitor(profiles,{probe:async()=>evidence}),events=[];monitor.on('monitor.event',e=>events.push(e));
 await monitor.check(p.profileId);assert.equal(events.length,0);await monitor.check(p.profileId);assert.equal(events.length,1);assert.equal(events[0].pushState,'UNKNOWN');
 evidence={state:'UNKNOWN',errorCode:'MONITOR_HTTP_FAILED'};await monitor.check(p.profileId);assert.equal(monitor.view(p.profileId).confirmedState,'LIVE');assert.equal(monitor.view(p.profileId).queryState,'UNKNOWN');
 const restored=new LiveMonitor(profiles,{probe:async()=>({...evidence,state:'LIVE',anchorUid:'456',roomId:'9876543210123456789',web_rid:'123'})});restored.on('monitor.event',e=>events.push(e));await restored.check(p.profileId);assert.equal(events.length,1);
 evidence={state:'ENDED',anchorUid:'456',roomId:'9876543210123456789',web_rid:'123'};await monitor.check(p.profileId);await monitor.check(p.profileId);assert.equal(events.length,2);assert.equal(events[1].state,'ENDED');
 monitor.adapter={probe:async()=>{throw new Error('synthetic private adapter exception');}};await monitor.check(p.profileId);assert.equal(monitor.view(p.profileId).queryState,'UNKNOWN');assert.equal(monitor.view(p.profileId).errorCode,'MONITOR_ADAPTER_FAILED');
});
