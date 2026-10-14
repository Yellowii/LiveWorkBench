import test from 'node:test';
import assert from 'node:assert/strict';
import {messageView} from '../src/messages/message-view.js';
const view=(type,official)=>messageView({eventType:'Webcast'+type,payload:{official}});
test('admin operations and member appointment are message-local facts, unknown privileges retain numbers',()=>{
 assert.match(view('AdminPrivilegeMessage',{data:{op:1,privilege:999}}).summary,/授予.*999/);
 assert.match(view('AdminPrivilegeMessage',{data:{op:2,privilege:999}}).summary,/撤销.*999/);
 assert.match(view('AdminPrivilegeMessage',{data:{op:99}}).summary,/未确认/);
 assert.equal(view('MemberMessage',{action:'5',user:{nickname:'测试'}}).category,'admin');
 assert.match(view('MemberMessage',{action:'6'}).summary,/取消管理员/);
 assert.doesNotMatch(view('MemberMessage',{action:'7'}).summary,/管理员|进入/);
});
test('red packet messages distinguish notification, refresh and end without claiming receipt or amount units',()=>{
 const v=view('LuckyBoxMessage',{title:'测试红包',box_status:99,diamond_count:'50',description_list:[{text:'测试说明'}]});
 assert.equal(v.category,'redpacket');assert.match(v.summary,/测试红包/);assert.match(v.summary,/测试说明/);assert.equal(v.content.activity.status,'unknown');
 assert.match(view('LuckyBoxTempStatusMessage',{}).summary,/刷新/);assert.match(view('LuckyBoxEndMessage',{box_id:'1'}).summary,/结束/);
 assert.doesNotMatch(JSON.stringify(v),/已领取|人民币|已中奖/);
});
test('lottery state is from this event, no fabricated win, countdown or participation action',()=>{
 assert.match(view('LotteryEventNewMessage',{lottery_status:1,award_name:'测试奖品',lottery_draw_time:'900'}).summary,/进行中.*测试奖品/);
 assert.match(view('LotteryEventNewMessage',{lottery_status:999}).summary,/未确认/);
 assert.match(view('LotteryCandidateEventMessage',{participate_success:true}).summary,/参与成功/);
 assert.match(view('LotteryCandidateEventMessage',{participate_success:false}).summary,/未确认参与成功/);
 const result=view('LotteryDrawResultEventMessage',{user_ids:['1','2'],extra:'{"cookie":"SYN_SECRET"}'});assert.match(result.summary,/开奖结果.*2/);assert.doesNotMatch(JSON.stringify(result),/SYN_SECRET|你已中奖/);
});
test('short touch update/remove only renders safe name, never interprets container payload',()=>{
 assert.match(view('ShortTouchAreaMessage',{message_type:1,short_touch_area_data:{type:8,name:'测试活动',container_payload:'SYN_SECRET'}}).summary,/更新.*测试活动/);
 assert.match(view('ShortTouchAreaMessage',{message_type:2,short_touch_area_data:{type:8}}).summary,/移除/);
 assert.match(view('ShortTouchAreaMessage',{message_type:999}).summary,/未确认/);
});
