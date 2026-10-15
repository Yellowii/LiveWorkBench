import test from 'node:test';
import assert from 'node:assert/strict';
import {messageView} from '../src/messages/message-view.js';
import {StageModel} from '../public/stage-model.js';
import {danmakuRows} from '../public/message-stage.js';
const event=(type,official,id='1')=>({eventType:'Webcast'+type,eventId:id,eventSeq:id,captureId:'capture',runtimeNamespace:'live',payload:{official}});
test('chat keeps rich image order; verified privilege enum does not style unknown values',()=>{
 const raw=event('ChatMessage',{user:{nickname:'发言者'},content:'fallback',rtf_content_v2:{pieces:[{string_value:'前'},{image_value:{image:{url_list:['https://p3.douyinpic.com/emoji.png']}}},{user_value:{user:{nickname:'被提及者'},left_additional_content:'@'}},{string_value:'后'}]}}),before=JSON.stringify(raw),v=messageView(raw);
 assert.deepEqual(v.content.runs.map(x=>x.type),['text','image','text','text']);assert.equal(v.content.runs[2].text,'@被提及者');assert.equal(JSON.stringify(raw),before);
 for(const [style,expected]of [[1,'base'],[2,'advanced'],[3,'supreme'],[999,'unknown']])assert.equal(messageView(event('PrivilegeScreenChatMessage',{style,content:'特权'})).content.privilegeStyle,expected);
});
test('gift tray uses actual display text and per-message background/dynamic icon without guessing classification',()=>{
 const v=messageView(event('GiftMessage',{user:{id:'7'},gift_id:'8',group_id:'9',gift:{name:'花',image:{url_list:['https://p3.douyinpic.com/gift.png']}},repeat_count:'3',repeat_end:0,tray_display_text:{default_pattern:'送给{0}',pieces:[{string_value:'主播'}]},tray_info:{tray_base_img:{url_list:['https://p3.douyinpic.com/bg.png']},tray_dynamic_img:{url_list:['https://p3.douyinpic.com/dynamic.png']}}}));
 assert.equal(v.content.gift.trayText,'送给主播');assert.equal(v.content.gift.displayCount,'3');assert.equal(v.content.gift.trayEligible,true);assert.ok(v.resources.some(x=>x.kind==='trayBackground'));assert.ok(v.resources.some(x=>x.kind==='giftDynamic'));assert.equal(v.resources.find(x=>x.kind==='gift').field,'gift.image');
});
test('terminal gift records stay readable but never create or prolong an official-style tray',()=>{
 const gift={user:{id:'7'},gift_id:'8',group_id:'9',gift:{name:'花',combo:true},repeat_count:'3',repeat_end:0},m=new StageModel();m.push([messageView(event('GiftMessage',gift))]);m.step(1);assert.equal(m.active.length,1);m.step(1000);m.step(1000);
 const end=messageView(event('GiftMessage',{...gift,repeat_end:1},'2'));assert.equal(end.content.gift.comboState,'ended');m.push([end]);m.step(501);assert.equal(m.active.length,0);m.push([end]);assert.equal(m.queue.length,0);
});
test('out-of-order counts and duplicate counts do not regress a tray or keep it alive',()=>{
 const make=(id,count)=>messageView(event('GiftMessage',{user:{id:'7'},gift_id:'8',group_id:'9',gift:{name:'花'},repeat_count:count,repeat_end:0},id)),m=new StageModel();m.push([make('1','8')]);m.step(1);m.step(1000);m.push([make('2','3'),make('3','8')]);assert.equal(m.active[0].view.content.gift.repeatCount,'8');m.step(1000);m.step(501);assert.equal(m.active.length,0);
});
test('lottery mapping preserves exact observed countdown and does not guess clock from local now',()=>{
 const a=messageView(event('LotteryEventNewMessage',{lottery_id:'3',lottery_status:1,lottery_current_time:'100',lottery_draw_time:'185'})).content.activity;assert.equal(a.observedRemainingSeconds,85);
 assert.equal(messageView(event('LotteryEventNewMessage',{lottery_status:1,lottery_draw_time:'185'})).content.activity.observedRemainingSeconds,null);
});
test('Canvas ordinary comments omit sender; privilege and emoji use their verified structures',()=>{
 const v=messageView(event('ChatMessage',{user:{nickname:'观众'},content:'正文'}));assert.deepEqual(danmakuRows(v)[0].runs,[{type:'text',text:'正文'}]);
 const special=messageView(event('PrivilegeScreenChatMessage',{user:{nickname:'观众'},content:'正文',style:3}));assert.equal(danmakuRows(special).length,3);assert.equal(danmakuRows(special)[1].runs[0].text,'观众:  ');
 assert.equal(danmakuRows(messageView(event('ScreenChatMessage',{content:'管理正文'})))[0].style,'admin');
 const m=new StageModel();m.push([special,messageView(event('ChatMessage',{content:'下一条'},'2'))]);m.step(1);assert.equal(m.active[0].span,3);assert.equal(m.active[1].lane,3);
});
