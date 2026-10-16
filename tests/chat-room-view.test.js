import test from 'node:test';import assert from 'node:assert/strict';
import {messageView} from '../src/messages/message-view.js';
import {audienceSnapshot} from '../public/audience-model.js';
const image=(type=1,name='')=>({url_list:['https://p3.douyinpic.com/synthetic.png'],image_type:type,content:{name}});
const event=(type,data,seq='1',room='100')=>({eventType:'Webcast'+type,eventId:seq,eventSeq:seq,captureId:'capture',mode:'live',runtimeNamespace:'live',receivedAt:'2026-10-16T12:00:00Z',payload:{official:{common:{room_id:room},...data}}});
test('implausible platform timestamp falls back to recorded reception without changing stored facts',()=>{
 const e={...event('RoomStatsMessage',{display_middle:'100'}),occurredAt:'+058761-02-01T12:00:00.000Z'},before=JSON.stringify(e),v=messageView(e);assert.equal(v.time,e.receivedAt);assert.equal(v.timeSource,'receivedAt');assert.equal(JSON.stringify(e),before);
});
test('ordered official badges take precedence; nine-slice/name are explicit and DSL is not invented',()=>{
 const v=messageView(event('ChatMessage',{content:'你好',user:{nickname:'合成观众',badge_image_list:[image()],public_area_badge_info:{badge_list:['b','a'],badge_info_map:{a:image(1),b:image(51,'合成灯牌')},webcast_dsl_badge_list:[{}]}}}));
 assert.equal(v.actor.visualBadges[0].name,'合成灯牌');assert.equal(v.actor.visualBadges[0].layout,'nine-slice');assert.equal(v.actor.visualBadges.length,2);assert.equal(v.actor.badgeRule,'base-list-dsl-unresolved');
});
test('display templates preserve order, text and user/image runs; entry type8 is mapped without executing effects',()=>{
 const text={default_pattern:'欢迎{1:user}，{0:string}！',pieces:[{string_value:'你好'},{user_value:{user:{nickname:'合成观众',badge_image_list:[image()]}}}]};
 const view=messageView(event('RoomMessage',{common:{room_id:'100',display_text:text}}));assert.equal(view.category,'system');assert.equal(view.content.runs.map(r=>r.text||r.actor?.name||'').join(''),'欢迎合成观众，你好！');
 const entry=messageView(event('MemberMessage',{enter_effect_config:{type:'8',text,badge:image(),text_icon:image()}}));assert.equal(entry.content.entry.type,'8');assert.match(entry.summary,/欢迎合成观众/);assert.ok(entry.resources.some(x=>x.kind==='entryBadge'));
 const unknown=messageView(event('MemberMessage',{enter_effect_config:{type:'9'}}));assert.equal(unknown.content.entry.advancedUnsupported,true);
});
test('online snapshots stay room/capture scoped, respect platform version/incremental/hidden rules, ranks are partial',()=>{
 const stats=(seq,version,value,extra={},room='100')=>messageView(event('RoomStatsMessage',{display_middle:value+'人在线',display_value:String(value),display_version:String(version),...extra},String(seq),room));
 const views=[stats(1,2,100),stats(2,1,999),stats(3,2,90,{incremental:true}),stats(4,4,800,{},'200')];
 const s=audienceSnapshot(views,'live','100','capture');assert.equal(s.stats.content.audience.display,'100人在线');
 const hidden=audienceSnapshot([...views,stats(5,3,120,{is_hidden:true})],'live','100','capture');assert.equal(hidden.stats.content.audience.hidden,true);
 const ranks=messageView(event('RoomUserSeqMessage',{ranks:[{user:{nickname:'合成一',id:'5'},rank:'1'},{is_hidden:true,user:{nickname:'不能展示'}}],total:'999'},'6'));
 assert.equal(ranks.content.audience.users.length,2);assert.equal(ranks.content.audience.users[1].actor,null);assert.equal(ranks.content.audience.partial,true);assert.equal(ranks.content.audience.display,undefined);
});
