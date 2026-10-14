import {localOfficial,resourceUrl,safeText} from './privacy.js';
export const mappingVersion='message-view-20261014-a1';
const shortType=value=>typeof value==='string'&&/^(?:Webcast)?[A-Za-z][A-Za-z0-9]{0,100}$/.test(value)?value.replace(/^Webcast/,''):'UnknownMessage';
const decimal=value=>/^(?:0|[1-9]\d{0,39})$/.test(String(value))?String(value):null;
const positive=value=>decimal(value)&&BigInt(value)>0n?String(value):null;
const source={chat:'CanvasDanmakuPlugin.364e9be4.js',gift:'DanmakuPlugin.7c702aa1.js',like:'LiveLike.bfb78734.js',member:'RoomMessageConsume.e41a863a.js',other:null};
export function messageView(event){
 try{return convert(event||{});}catch{return {messageType:'UnknownMessage',category:'other',label:'无法展示',icon:'?',summary:'展示转换失败；原始记录保留',actor:null,content:{},resources:[],fields:[],provenance:[],mappingVersion,mappingStatus:'failed',eventId:null,rawRefs:[]};}
}
function convert(e){
 const type=shortType(e.eventType),raw=e.payload?.official||{},d=localOfficial(raw),resources=[],notes=[];
 const addImage=(image,kind,field)=>{const list=image?.url_list;if(!Array.isArray(list))return;const url=list.map(resourceUrl).find(Boolean);if(url&&resources.length<12)resources.push({kind,url,field});};
 const rich=(text,field,kind='inline')=>{
  if(!text||typeof text!=='object')return '';
  const pieces=(Array.isArray(text.pieces)?text.pieces:[]).slice(0,60).map((p,i)=>{
   if(p.string_value)return safeText(p.string_value);
   if(p.user_value?.user)return safeText(p.user_value.left_additional_content)+safeText(p.user_value.user.nickname)+safeText(p.user_value.right_additional_content);
   if(p.image_value?.image){addImage(p.image_value.image,kind,`${field}.pieces[${i}].image_value.image`);return '[图片]';}
   notes.push('富文本片段映射未确认');return '[未识别片段]';
  });
  const pattern=safeText(text.default_pattern);
  return (pattern?pattern.replace(/\{(\d+)(?::[^}]*)?\}/g,(_,i)=>pieces[Number(i)]??'[未识别片段]'):pieces.join('')).slice(0,2000);
 };
 const nativeText=()=>rich(raw.common?.display_text,'common.display_text')||safeText(d.content)||safeText(d.common?.describe);
 const actor=d.user?{name:safeText(d.user.nickname)||'未提供昵称',badges:[]}:null;
 addImage(raw.user?.avatar_thumb,'avatar','user.avatar_thumb');
 for(const image of (Array.isArray(raw.user?.badge_image_list)?raw.user.badge_image_list:[]).slice(0,3))addImage(image,'badge','user.badge_image_list');
 const view={messageType:type,category:'other',label:'其他消息',icon:'•',summary:'',actor,content:{},resources,fields:[],provenance:[],mappingVersion,mappingStatus:'mapped',eventId:e.eventId||null,eventSeq:e.eventSeq||null,rawRefs:e.rawRefs||[],captureId:e.captureId||null,runtimeNamespace:e.runtimeNamespace||null,mode:e.mode||null,time:e.occurredAt||e.receivedAt||e.persistedAt||null};
 if(['ChatMessage','EmojiChatMessage','ScreenChatMessage','PrivilegeScreenChatMessage'].includes(type)){
  Object.assign(view,{category:'chat',label:type==='EmojiChatMessage'?'表情':type==='ScreenChatMessage'?'管理弹幕':type==='PrivilegeScreenChatMessage'?'特权弹幕':'弹幕',icon:'聊'});
  view.summary=rich(raw.rtf_content_v2,'rtf_content_v2')||safeText(d.content)||rich(raw.emoji_content,'emoji_content','emoji')||safeText(d.default_content)||nativeText();
  if(type==='ScreenChatMessage'&&actor)actor.badges.push('管理弹幕');
  if(type==='PrivilegeScreenChatMessage')view.content.style=decimal(d.style); // Style enum dependency not verified.
 }else if(type==='GiftMessage'){
  Object.assign(view,{category:'gift',label:'礼物',icon:'礼'});
  const name=safeText(d.gift?.name)||null,repeatCount=positive(d.repeat_count),groupCount=positive(d.group_count),comboCount=positive(d.combo_count);
  const comboState=Number(d.repeat_end)===1?'ended':raw.gift?.combo===true&&Number(d.repeat_end)===0?'ongoing':'unknown';
  view.content.gift={name,repeatCount,groupCount,comboCount,comboState,giftId:decimal(d.gift_id)};
  addImage(raw.gift?.icon,'gift','gift.icon');
  view.summary=rich(raw.tray_display_text,'tray_display_text')||safeText(d.gift?.describe)||(name?`送出${name}`:nativeText()||'收到礼物消息（名称未提供）');
  if(repeatCount)view.summary+=` · 重复数量 ${repeatCount}`;
  if(groupCount)view.summary+=` · 组数 ${groupCount}`;
  if(comboCount)view.summary+=` · 连击字段 ${comboCount}`;
  if(comboState==='ended')view.summary+=' · 连击结束';
  if(comboState==='ongoing')view.summary+=' · 连击中';
  notes.push('group/repeat/combo 为单条消息字段，不相加，不推断最终赠送总数；礼物分类依赖未确认');
 }else if(type==='LikeMessage'){
  Object.assign(view,{category:'like',label:'点赞',icon:'赞'});view.content.count=positive(d.count);view.content.total=decimal(d.total);
  view.summary=nativeText()||`点赞${view.content.count?' ×'+view.content.count:''}`;
 }else if(type==='MemberMessage'){
  Object.assign(view,{category:'member',label:'成员 / 入场',icon:'人'});view.content.action=decimal(d.action);view.summary=nativeText()||safeText(d.action_description)||'成员消息（动作含义未确认）';
 }else view.summary=nativeText();
 if(!view.summary){view.mappingStatus='fallback';const values=Object.entries(d).filter(([,v])=>typeof v==='boolean'||typeof v==='number'||typeof v==='string'&&/^-?\d+$/.test(v)).slice(0,5);view.summary=`${type}${values.length?' · '+values.map(([k,v])=>`${k}=${v}`).join('，'):' · 暂无可靠可读内容'}`;}
 view.summary=view.summary.slice(0,2400);view.content.text=view.summary;
 for(const key of ['count','total','action','repeat_count','group_count','combo_count','repeat_end','style'])if(d[key]!==undefined)view.fields.push({path:key,value:d[key],confidence:'official-field',meaning:'具体解释见统一详情；不推断缺失业务语义'});
 view.provenance=[{source:source[view.category],confidence:source[view.category]?'static-source':'unknown',scope:'展示规则；不等于真实业务验收',notes}];
 return view;
}
