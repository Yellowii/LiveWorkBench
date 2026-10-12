import test from 'node:test';
import assert from 'node:assert/strict';
import {extractRoomEvidence,DouyinMonitorAdapter} from '../src/monitor/douyin-adapter.js';
import {TargetResolver} from '../src/targets/resolver.js';
test('nested roomInfo binds owner and status to the same target and retains exact IDs',()=>{
 const room={id:'9876543210123456789',status:2,owner:{id_str:'200',sec_uid:'MS4wLjABAAAA_SYNTHETIC'}},html='<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:{roomStore:{roomInfo:{roomId:room.id,web_rid:'123',room}}}}})+'</script>';
 const evidence=extractRoomEvidence(html,{web_rid:'123'});assert.equal(evidence.state,'LIVE');assert.equal(evidence.anchorUid,'200');assert.equal(evidence.roomId,room.id);
 assert.equal(extractRoomEvidence(html,{web_rid:'123',anchorUid:'201'}).state,'UNKNOWN');
});
test('valid HTTPS page redirects provide current web_rid, while a pinned secUid must still match',async()=>{
 const resolver=new TargetResolver({http:{get:async()=>({url:'https://live.douyin.com/123',text:'<script id="RENDER_DATA">'+JSON.stringify({room:{id_str:'100',web_rid:'123',status:2,owner:{id_str:'200',sec_uid:'MS4wLjABAAAA_SYNTHETIC'}}})+'</script>'})}}),adapter=new DouyinMonitorAdapter({resolver});
 const result=await adapter.probe({target:{type:'secUid',value:'MS4wLjABAAAA_SYNTHETIC'},timeoutMs:1000});assert.equal(result.state,'LIVE');assert.equal(result.web_rid,'123');
 const missing=await adapter.probe({target:{type:'anchorUid',value:'123'},timeoutMs:1000});assert.equal(missing.state,'UNKNOWN');assert.ok(missing.missingConditions.includes('stable-page-mapping'));
 const room=resolver.classify({type:'roomId',value:'123'});assert.equal(room.web_rid,null);assert.ok(room.missingConditions.includes('stable-page-mapping'));
});
