import test from 'node:test';import assert from 'node:assert/strict';
import {messageView} from '../src/messages/message-view.js';import {StageModel} from '../public/stage-model.js';
const event=(id,data,extra={})=>({eventId:String(id),eventSeq:String(id),mode:'live',captureId:'c',runtimeNamespace:'live',eventType:'WebcastGroupLiveContainerChangeMessage',payload:{official:{common:{room_id:'100'},data}},...extra});
const menu=(id,payload)=>messageView(event(id,[{type:6,container_payload:payload}]));
test('actual GiftMenu container payload is parsed as bounded data with exact IDs and no credential leakage',()=>{
 const source=event(1,[{type:6,container_payload:'{"data":[{"id":9007199254740993,"name":"<b>合成礼物</b>","icon":"https://p3.douyinpic.com/menu.png","price":3,"token":"SYN_SECRET"}]}'}]),before=JSON.stringify(source),v=messageView(source);
 assert.equal(v.category,'giftmenu');assert.equal(v.content.giftMenu.action,'replace');assert.equal(v.content.giftMenu.gifts[0].id,'9007199254740993');assert.equal(v.content.giftMenu.gifts[0].name,'<b>合成礼物</b>');assert.equal(v.content.giftMenu.gifts[0].price,'3');assert.doesNotMatch(JSON.stringify(v),/SYN_SECRET/);assert.equal(JSON.stringify(source),before);assert.equal(v.resources[0].kind,'giftMenu');
});
test('only last type6 is consumed; empty payload hides, empty list and malformed payload leave prior menu alone',()=>{
 assert.notEqual(messageView(event(1,[{type:6,container_payload:'{"data":[{}]}'},{type:7}])).category,'giftmenu');
 assert.equal(menu(2,'').content.giftMenu.action,'hide');
 for(const payload of ['{','{"data":[]}','{"data":"bad"}','x'.repeat(32769)]){const v=menu(3,payload);assert.equal(v.content.giftMenu.action,'unknown');assert.equal(v.mappingStatus,'fallback');}
 const v=menu(4,JSON.stringify({data:Array.from({length:40},(_,i)=>({id:i+1,name:'礼物'+i,icon:'javascript:evil()'}))}));assert.equal(v.content.giftMenu.gifts.length,20);assert.equal(v.content.giftMenu.total,40);assert.equal(v.content.giftMenu.truncated,true);assert.equal(v.resources.length,0);
});
test('menu replaces and hides in its own room/domain without stale resurrection',()=>{
 const m=new StageModel();m.push([menu(1,'{"data":[{"id":1,"name":"礼物A"}]}')]);m.step(1);assert.equal(m.active.length,1);
 m.push([menu(2,'{')]);assert.equal(m.active[0].view.content.giftMenu.gifts[0].name,'礼物A');m.push([menu(4,'')]);assert.equal(m.active.length,0);m.push([menu(3,'{"data":[{"id":1}]}')]);m.step(1);assert.equal(m.active.length,0);
 m.push([messageView(event(5,[{type:6,container_payload:'{"data":[{"id":2}]}'}],{captureId:'another'}))]);m.step(1);assert.equal(m.active.length,1);
});
test('activity priority is descending, including queued items, without changing source events',()=>{
 const views=[1,2,3].map(id=>({eventId:String(id),eventSeq:String(id),category:'activity',content:{activity:{areaType:String(id),action:'1',priority:String(id*10)}}})),original=JSON.stringify(views),m=new StageModel();m.push(views);m.step(1);assert.deepEqual(m.active.map(x=>x.view.eventId),['3','2']);assert.equal(m.queue[0].view.eventId,'1');assert.equal(JSON.stringify(views),original);
});
test('image candidates retain up to three unique trusted URLs in platform order',()=>{
 const v=messageView({eventType:'WebcastGiftMessage',payload:{official:{gift:{name:'合成',image:{url_list:['https://p3.douyinpic.com/a.png','https://p3.douyinpic.com/a.png','https://evil.invalid/private','https://p3.douyinpic.com/b.png','https://p3.douyinpic.com/c.png','https://p3.douyinpic.com/d.png']}}}}});
 assert.deepEqual(v.resources[0].urls,['https://p3.douyinpic.com/a.png','https://p3.douyinpic.com/b.png','https://p3.douyinpic.com/c.png']);
});
