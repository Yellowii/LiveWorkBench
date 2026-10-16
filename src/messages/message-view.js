import {localOfficial,resourceUrl,safeText} from './privacy.js';
import {activityView} from './activities.js';
import {giftMenu} from './gift-menu.js';
import {chatActor,templateRuns,runText,roomAudience} from './chat-room.js';
export const mappingVersion='message-view-20261017-session-emoji';
const shortType=value=>typeof value==='string'&&/^(?:Webcast)?[A-Za-z][A-Za-z0-9]{0,100}$/.test(value)?value.replace(/^Webcast/,''):'UnknownMessage';
const decimal=value=>/^(?:0|[1-9]\d{0,39})$/.test(String(value))?String(value):null;
const positive=value=>decimal(value)&&BigInt(value)>0n?String(value):null;
const source={chat:'CanvasDanmakuPlugin.364e9be4.js',gift:'DanmakuPlugin.7c702aa1.js',giftmenu:'GiftMenuPlugin.277c15b4.js',like:'LiveLike.bfb78734.js',member:'RoomMessageConsume.e41a863a.js',other:null};
export function messageView(event,{emojiCatalog}={}){
 try{return convert(event||{},emojiCatalog);}catch{return {messageType:'UnknownMessage',category:'other',label:'无法展示',icon:'?',summary:'展示转换失败；原始记录保留',actor:null,content:{},resources:[],fields:[],provenance:[],mappingVersion,mappingStatus:'failed',eventId:null,rawRefs:[]};}
}
function convert(e,emojiCatalog){
 const type=shortType(e.eventType),raw=e.payload?.official||{},d=localOfficial(raw),resources=[],notes=[];
 const imageUrls=image=>Array.isArray(image?.url_list)?[...new Set(image.url_list.slice(0,16).map(resourceUrl).filter(Boolean))].slice(0,3):[];
 const addImage=(image,kind,field)=>{const urls=imageUrls(image);if(urls.length&&resources.length<32)resources.push({kind,url:urls[0],urls,field});};
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
 const runs=(pieces,field,kind='inline')=>(Array.isArray(pieces)?pieces:[]).slice(0,60).flatMap((p,i)=>{
  const out=[];if(p.string_value)out.push({type:'text',text:safeText(p.string_value)});
  if(p.image_value?.image){const urls=imageUrls(p.image_value.image);if(urls.length){addImage(p.image_value.image,kind,`${field}.pieces[${i}].image_value.image`);out.push({type:'image',url:urls[0],urls,alt:'[图片]'});}else out.push({type:'text',text:'[图片不可用]'});}
  if(p.user_value?.user)out.push({type:'text',text:safeText(p.user_value.left_additional_content)+safeText(p.user_value.user.nickname)+safeText(p.user_value.right_additional_content)});
  return out.length?out:[{type:'text',text:'[未识别片段]'}];
 });
 const nativeText=()=>rich(raw.common?.display_text,'common.display_text')||safeText(d.content)||safeText(d.common?.describe);
 const actor=chatActor(raw.user);
 addImage(raw.user?.avatar_thumb,'avatar','user.avatar_thumb');
 for(const image of (Array.isArray(raw.user?.badge_image_list)?raw.user.badge_image_list:[]).slice(0,3))addImage(image,'badge','user.badge_image_list');
 const view={messageType:type,category:'other',label:'其他消息',icon:'•',summary:'',actor,content:{},resources,fields:[],provenance:[],mappingVersion,mappingStatus:'mapped',eventId:e.eventId||null,eventSeq:e.eventSeq||null,rawRefs:e.rawRefs||[],captureId:e.captureId||null,runtimeNamespace:e.runtimeNamespace||null,mode:e.mode||null,time:e.occurredAt||e.receivedAt||e.persistedAt||null};
 const occurred=Date.parse(e.occurredAt),received=Date.parse(e.receivedAt);
 view.timeSource=Number.isFinite(occurred)&&occurred>=Date.UTC(2000,0,1)&&occurred<=(Number.isFinite(received)?received:Date.now())+86400000?'occurredAt':e.receivedAt?'receivedAt':'persistedAt';
 view.time=e[view.timeSource]||null;view.receivedAt=e.receivedAt||null;
 if(['ChatMessage','EmojiChatMessage','ScreenChatMessage','PrivilegeScreenChatMessage'].includes(type)){
  Object.assign(view,{category:'chat',label:type==='EmojiChatMessage'?'表情':type==='ScreenChatMessage'?'管理弹幕':type==='PrivilegeScreenChatMessage'?'特权弹幕':'弹幕',icon:'聊'});
  view.summary=rich(raw.rtf_content_v2,'rtf_content_v2')||safeText(d.content)||rich(raw.emoji_content,'emoji_content','emoji')||safeText(d.default_content)||nativeText();
  if(type==='ScreenChatMessage'&&actor)actor.badges.push('管理弹幕');
  view.content.runs=type==='EmojiChatMessage'?runs(raw.emoji_content?.pieces,'emoji_content','emoji'):runs(raw.rtf_content_v2?.pieces,'rtf_content_v2');
  if(!view.content.runs.length)view.content.runs=[{type:'text',text:view.summary}];
  if(type==='EmojiChatMessage')view.content.runs=view.content.runs.map(r=>r.type==='image'?{...r,alt:safeText(d.default_content)||'[表情]'}:r);
  if(emojiCatalog){view.content.runs=emojiCatalog.expand(view.content.runs);view.content.emojiCatalog=emojiCatalog.view();for(const r of view.content.runs)if(r.type==='image'&&r.source==='official-emoji-directory'&&resources.length<32)resources.push({kind:'emoji',url:r.url,urls:r.urls,field:'content',source:r.source});notes.push('文字表情按官方display_name目录精确匹配；hide只用于输入面板，不隐藏已接收内容');}
  if(type==='PrivilegeScreenChatMessage'){
   view.content.style=decimal(d.style);view.content.privilegeStyle=({1:'base',2:'advanced',3:'supreme'})[view.content.style]||'unknown';
   notes.push('特权样式枚举：426.e4be7020.js模块217785；仅视觉等级，不推断用户权益');
  }
 }else if(type==='GiftMessage'){
  Object.assign(view,{category:'gift',label:'礼物',icon:'礼'});
  const name=safeText(d.gift?.name)||null,repeatCount=positive(d.repeat_count),groupCount=positive(d.group_count),comboCount=positive(d.combo_count);
  const comboState=Number(d.repeat_end)===1?'ended':raw.gift?.combo===true&&Number(d.repeat_end)===0?'ongoing':'unknown';
  const trayText=rich(raw.tray_display_text,'tray_display_text'),displayCount=repeatCount||comboCount;
  view.content.gift={name,repeatCount,groupCount,comboCount,comboState,giftId:decimal(d.gift_id||d.gift?.id),groupId:decimal(d.group_id),displayCount,trayText:trayText||(name?'送出'+name:''),trayEligible:Number(d.repeat_end||0)===0&&Boolean(displayCount&&name&&actor?.id),trayType:decimal(raw.tray_info?.tray_type)};
  addImage(raw.gift?.image?.url_list?.some(resourceUrl)?raw.gift.image:raw.gift?.icon,'gift',raw.gift?.image?.url_list?.some(resourceUrl)?'gift.image':'gift.icon');
  addImage(raw.tray_info?.tray_base_img,'trayBackground','tray_info.tray_base_img');
  addImage(raw.tray_info?.tray_dynamic_img,'giftDynamic','tray_info.tray_dynamic_img');
  view.summary=trayText||safeText(d.gift?.describe)||(name?`送出${name}`:nativeText()||'收到礼物消息（名称未提供）');
  if(repeatCount)view.summary+=` · 重复数量 ${repeatCount}`;
  if(groupCount)view.summary+=` · 组数 ${groupCount}`;
  if(comboCount)view.summary+=` · 连击字段 ${comboCount}`;
  if(comboState==='ended')view.summary+=' · 连击结束';
  if(comboState==='ongoing')view.summary+=' · 连击中';
  notes.push('group/repeat/combo 为单条消息字段，不相加，不推断最终赠送总数；礼物分类依赖未确认');
  notes.push('托盘repeat/combo及tray_info映射来自426.e4be7020.js模块508899；结束通知仅保留在列表/详情，不新建或续期托盘');
 }else if(type==='LikeMessage'){
  Object.assign(view,{category:'like',label:'点赞',icon:'赞'});view.content.count=positive(d.count);view.content.total=decimal(d.total);
  view.summary=nativeText()||`点赞${view.content.count?' ×'+view.content.count:''}`;
 }else if(type==='MemberMessage'){
  Object.assign(view,{category:'member',label:'成员 / 入场',icon:'人'});view.content.action=decimal(d.action);view.summary=nativeText()||safeText(d.action_description)||'成员消息（动作含义未确认）';
 }else view.summary=nativeText();
 if(['RoomMessage','ExhibitionChatMessage','FansclubMessage'].includes(type)){
  view.category='system';view.label=type==='FansclubMessage'?'粉丝团消息':'房间提示';
  view.content.runs=safeText(raw.content)?[{type:'text',text:safeText(raw.content)}]:templateRuns(raw.common?.display_text);view.summary=runText(view.content.runs)||nativeText();
 }
 if(type==='MemberMessage'&&raw.enter_effect_config){
  const entry=raw.enter_effect_config;view.content.entry={type:decimal(entry.type),advancedUnsupported:String(entry.type)!=='8'};
  if(String(entry.type)==='8'){
   view.content.runs=templateRuns(entry.text);view.summary=runText(view.content.runs)||view.summary;
   addImage(entry.badge,'entryBadge','enter_effect_config.badge');addImage(entry.text_icon,'entryBackground','enter_effect_config.text_icon');
  }else notes.push('高级入场装扮/资源播放器未实现；原始配置可在详情查看');
 }
 const audience=roomAudience(type,raw);
 if(audience){view.category='audience';view.label='观众统计';view.content.audience=audience;view.summary=audience.kind==='stats'?(audience.hidden?'平台隐藏人数':audience.display||'人数文案未提供'):`本条观众榜单片段 · ${audience.users.length} 条（非完整在线名单）`;}
 view.roomId=decimal(raw.common?.room_id);
 if(type==='GroupLiveContainerChangeMessage'){
  const menu=giftMenu(raw);if(menu){Object.assign(view,{category:'giftmenu',label:'礼物菜单',icon:'礼',summary:menu.action==='hide'?'礼物菜单隐藏':menu.action==='replace'?`礼物菜单更新 · ${menu.total} 项`:'礼物菜单内容无法确认；保留原始详情'});view.content.giftMenu=menu;if(menu.action==='unknown')view.mappingStatus='fallback';for(const g of menu.gifts)if(g.icon)addImage({url_list:[g.icon]},'giftMenu',`data[${raw.data.length-1}].container_payload.data[${g.index}].icon`);notes.push('仅解析末项type=6的有界JSON数据；价格仅取本条明确字段，不补giftStore价格、不提供赠送命令；最多20项，其余见原生JSON');}
 }
 const activity=activityView(type,d,nativeText,raw);
 if(activity){Object.assign(view,{category:activity.category,label:activity.label,icon:activity.icon,summary:activity.summary});view.content.activity=activity.activity;notes.push('仅表示本条事件时点，不代表当前参与资格、领取或中奖结果');}
 if(type==='LuckyBoxMessage'){
  addImage(raw.lucky_icon,'redpacket','lucky_icon');
  for(const [i,part] of (Array.isArray(raw.description_list)?raw.description_list:[]).slice(0,6).entries())addImage(part.image,'description',`description_list[${i}].image`);
  notes.push('box_status=1不进入原插件展示；send_time毫秒、delay_time/display_duration秒。未同步平台时钟，不推断当前可领取状态；结束图资源缺失时保留通知图并标明结束');
 }
 if(type==='ShortTouchAreaMessage'){addImage({url_list:[raw.short_touch_area_data?.short_touch_info?.img_url]},'activity','short_touch_area_data.short_touch_info.img_url');notes.push('按area.type更新/移除；仅静态图片和文案，Lynx/WebView与JSB容器不执行。尺寸限制24—120px为工作台适配');}
 if(type==='AdminPrivilegeMessage')notes.push('权限符号来自2722.7dc4edab.js模块580568；中文为独立解释，不推断当前观看账号拥有该权限');
 if(!view.summary){view.mappingStatus='fallback';const values=Object.entries(d).filter(([,v])=>typeof v==='boolean'||typeof v==='number'||typeof v==='string'&&/^-?\d+$/.test(v)).slice(0,5);view.summary=`${type}${values.length?' · '+values.map(([k,v])=>`${k}=${v}`).join('，'):' · 暂无可靠可读内容'}`;}
 view.summary=view.summary.slice(0,2400);view.content.text=view.summary;
 for(const key of ['count','total','action','repeat_count','group_count','combo_count','repeat_end','style'])if(d[key]!==undefined)view.fields.push({path:key,value:d[key],confidence:'official-field',meaning:'具体解释见统一详情；不推断缺失业务语义'});
 view.provenance=[{source:activity?.source||source[view.category],sourceVersion:'cdn-chunks-20261008',confidence:activity?.source||source[view.category]?'static-source':'unknown',scope:'展示规则；不等于真实业务验收',notes}];
 if(view.content.emojiCatalog)view.provenance.push({source:'ChatRoom.b626dcc2 / 568771 / official emoji/list',sourceVersion:view.content.emojiCatalog.version,confidence:'official-directory',scope:'仅展示增强；原生正文不变',notes:[]});
 if(actor?.visualBadges?.length||['system','member','audience'].includes(view.category))view.provenance.push({source:'ChatRoom.b626dcc2 / island_237ab.480da559 #146686 / RoomMessageConsume.1e33b586 #196276',sourceVersion:'local-observation-20261016',confidence:'static-source',scope:'徽章基础列表、模板、入场8与观众消息投影；DSL筛选和完整普通榜单尚未验证',notes:[]});
 return view;
}
