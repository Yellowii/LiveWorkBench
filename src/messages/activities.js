import {safeText} from './privacy.js';
const number=v=>/^(?:0|[1-9]\d{0,39})$/.test(String(v))?String(v):null;
// Enum values below are visible in the selected plugin snapshot; external enums stay unknown.
const lotteryStates={0:'初始',1:'进行中',2:'已完成',3:'未完成',4:'审核中',5:'未通过审核'};
export function activityView(type,d,nativeText){
 if(type==='AdminPrivilegeMessage'){
  const op=number(d.data?.op),privilege=number(d.data?.privilege),verb=op==='1'?'授予':op==='2'?'撤销':'操作未确认';
  return {category:'admin',label:'管理员权限',icon:'管',summary:`管理员权限${verb}${privilege?' · 权限编号 '+privilege:''}`,activity:{op,privilege},source:'AdminPrivilegePlugin.3e987bfa.js'};
 }
 if(type==='MemberMessage'&&['5','6'].includes(number(d.action)))return {category:'admin',label:'管理员任免',icon:'管',summary:nativeText()||(number(d.action)==='5'?'设置为管理员':'取消管理员'),activity:{action:number(d.action)},source:'AdminPrivilegePlugin.3e987bfa.js'};
 if(['LuckyBoxMessage','LuckyBoxTempStatusMessage','LuckyBoxEndMessage'].includes(type)){
  const status=type==='LuckyBoxEndMessage'?'ended':type==='LuckyBoxTempStatusMessage'?'refresh':'unknown';
  const title=safeText(d.title),descriptions=(Array.isArray(d.description_list)?d.description_list:[]).slice(0,6).map(x=>safeText(x.text)).filter(Boolean).join(' · ');
  return {category:'redpacket',label:'红包',icon:'包',summary:status==='ended'?'红包结束消息':status==='refresh'?'红包状态刷新消息':['红包消息',title,descriptions,nativeText()].filter(Boolean).join(' · '),activity:{status,boxId:number(d.box_id),boxStatus:number(d.box_status),diamondCount:number(d.diamond_count),sendTime:number(d.send_time),delayTime:number(d.delay_time),displayDuration:number(d.display_duration)},source:'RedPacketShortTouchPlugin.f3e74f45.js'};
 }
 if(['LotteryEventNewMessage','LotteryCandidateEventMessage','LotteryDrawResultEventMessage'].includes(type)){
  let summary,status,extra={};
  if(type==='LotteryEventNewMessage'){status=lotteryStates[number(d.lottery_status)]||'状态未确认';summary=['福袋 · '+status,safeText(d.award_name),safeText(d.award_description),nativeText()].filter(Boolean).join(' · ');extra={statusValue:number(d.lottery_status),drawTime:number(d.lottery_draw_time),currentTime:number(d.lottery_current_time),prizeType:number(d.prize_type),prizeCount:number(d.prize_count),luckyCount:number(d.lucky_count)};}
  else if(type==='LotteryCandidateEventMessage'){status=d.participate_success===true?'participated':'unknown';summary=d.participate_success===true?'福袋参与成功消息':'福袋候选消息 · 未确认参与成功';}
  else {status='result';summary=`福袋开奖结果已收到 · 结果用户数 ${Array.isArray(d.user_ids)?d.user_ids.length:0}`;extra={resultListMayBeTruncated:Array.isArray(d.user_ids)&&d.user_ids.length>=80};}
  const current=number(d.lottery_current_time),draw=number(d.lottery_draw_time);
  const remaining=current&&current!=='0'&&draw?BigInt(draw)-BigInt(current):null;
  extra.observedRemainingSeconds=remaining!==null&&remaining>=0n&&remaining<=86400n?Number(remaining):null;
  return {category:'lottery',label:'福袋 / 抽奖',icon:'福',summary,activity:{lotteryId:number(d.lottery_id),status,...extra},source:'LotteryShortTouchPlugin.dff12b10.js'};
 }
 if(type==='ShortTouchAreaMessage'){
  const action=number(d.message_type),name=safeText(d.short_touch_area_data?.name),verb=action==='1'?'更新':action==='2'?'移除':'动作未确认';
  return {category:'activity',label:'活动卡片',icon:'活',summary:`活动卡片${verb}${name?' · '+name:''}`,activity:{action,areaType:number(d.short_touch_area_data?.type),name:name||null},source:'ShortTouchPlugin.e0f9c39f.js'};
 }
 return null;
}
