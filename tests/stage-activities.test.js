import test from 'node:test';
import assert from 'node:assert/strict';
import {messageView} from '../src/messages/message-view.js';
import {StageModel} from '../public/stage-model.js';
const event=(id,type,data={},extra={})=>messageView({eventId:String(id),eventSeq:String(id),eventType:'Webcast'+type,runtimeNamespace:'live',captureId:'c',mode:'live',payload:{official:{common:{room_id:'100'},...data}},...extra});
test('short touch uses type identity, accessible text and bounded dimensions without executing container content',()=>{
 const v=event(1,'ShortTouchAreaMessage',{message_type:1,short_touch_area_data:{type:8,short_touch_info:{accessible_name:'活动说明',width:99999,height:48,img_url:'https://p3.douyinpic.com/card.png',short_touch_url_pc:'javascript:evil()'},container_payload:'<script>evil()</script>'}});
 assert.equal(v.content.activity.name,'活动说明');assert.equal(v.content.activity.width,120);assert.equal(v.content.activity.height,48);assert.equal(v.resources.find(x=>x.kind==='activity')?.url,'https://p3.douyinpic.com/card.png');assert.doesNotMatch(JSON.stringify(v),/evil|javascript:/);
 const m=new StageModel();m.push([v]);m.step(1);assert.equal(m.active.length,1);
 m.push([event(2,'ShortTouchAreaMessage',{message_type:1,short_touch_area_data:{type:8,name:'新版'}})]);assert.equal(m.active[0].view.content.activity.name,'新版');
 m.push([event(3,'ShortTouchAreaMessage',{message_type:2,short_touch_area_data:{type:8}})]);assert.equal(m.active.length,0);
 m.push([event(1,'ShortTouchAreaMessage',{message_type:1,short_touch_area_data:{type:8}})]);m.step(1);assert.equal(m.active.length,0);
});
test('red packet end updates exact box only; refresh/filtered/missing IDs do not invent cards',()=>{
 const m=new StageModel(),start=event(1,'LuckyBoxMessage',{box_id:'7',title:'合成红包',user:{id:'4',nickname:'发送者'},description_list:[{text:'参与说明',number:'3',gift_id:'8'}]});
 assert.equal(start.content.activity.descriptions[0].giftId,'8');m.push([start]);m.step(1);assert.equal(m.active.length,1);
 m.push([event(2,'LuckyBoxEndMessage',{box_id:'7'},{captureId:'other'}),event(3,'LuckyBoxTempStatusMessage'),event(4,'LuckyBoxMessage',{box_id:'8',box_status:1})]);m.step(1);assert.equal(m.active.length,1);assert.equal(m.active[0].view.content.activity.status,'unknown');
 m.push([event(5,'LuckyBoxEndMessage',{box_id_str:'7'})]);assert.equal(m.active[0].view.content.activity.status,'ended');assert.equal(m.active[0].view.actor.name,'发送者');assert.equal(m.active[0].view.eventId,'5');
 m.push([event(6,'LuckyBoxMessage',{box_id:'7'})]);assert.equal(m.active[0].view.content.activity.status,'ended');
 m.push([event(7,'LuckyBoxMessage',{}),event(8,'LuckyBoxMessage',{box_id:'0'})]);m.step(1);assert.equal(m.queue.length,0);assert.equal(m.active.length,1);
});
test('bounded state remembers removals against a late older event and clears for a new query domain',()=>{
 const m=new StageModel();m.push([event(20,'ShortTouchAreaMessage',{message_type:2,short_touch_area_data:{type:9}})]);m.push([event(19,'ShortTouchAreaMessage',{message_type:1,short_touch_area_data:{type:9,name:'过期更新'}})]);m.step(1);assert.equal(m.active.length,0);
 for(let i=30;i<1200;i++)m.push([event(i,'ShortTouchAreaMessage',{message_type:2,short_touch_area_data:{type:i}})]);assert.equal(m.states.size,1000);assert.equal(m.seen.size,1000);m.clear();assert.equal(m.states.size,0);
});
test('activity removal is isolated by mode/room/capture and handles queued cards',()=>{
 const m=new StageModel();for(let i=1;i<=4;i++)m.push([event(i,'ShortTouchAreaMessage',{message_type:1,short_touch_area_data:{type:i,name:'卡'+i}})]);m.step(1);assert.equal(m.active.length,2);assert.equal(m.queue.length,2);
 m.push([event(5,'ShortTouchAreaMessage',{message_type:2,short_touch_area_data:{type:3}}),event(6,'ShortTouchAreaMessage',{message_type:2,short_touch_area_data:{type:1},common:{room_id:'200'}}),event(7,'ShortTouchAreaMessage',{message_type:2,short_touch_area_data:{type:2}},{mode:'replay'})]);assert.equal(m.queue.length,1);assert.equal(m.active.length,2);
 m.paused=true;m.step(1000);assert.equal(m.active.length,2);m.paused=false;for(let i=0;i<31;i++)m.step(1000);assert.ok(m.active.length<=2);
});
test('admin enum is a sourced symbol, never an assertion of current viewer permissions',()=>{
 const v=event(1,'AdminPrivilegeMessage',{data:{op:1,privilege:13}});assert.equal(v.content.activity.privilegeSymbol,'AdminDanmakuPrivilege');assert.match(v.summary,/管理员弹幕/);assert.doesNotMatch(v.summary,/您|你/);
 const m=new StageModel();m.push([v]);m.step(1);assert.equal(m.active[0].view.category,'admin');for(let i=0;i<9;i++)m.step(1000);assert.equal(m.active.length,0);
});
