import {resolveBusiness} from '../parser/decode.js';
import {mappingVersion} from './message-view.js';
const labelFor=(name,type)=>{
 if(name==='style'&&type?.endsWith('.PrivilegeScreenChatMessage'))return '特权弹幕样式（1基础/2高级/3至尊；静态枚举）';
 if(type?.endsWith('.LuckyBoxMessage')){const text={send_time:'红包发送时间（毫秒；静态插件计算）',delay_time:'红包等待时长（秒）',display_duration:'红包展示时长（秒）'}[name];if(text)return text;}
 if(type?.endsWith('.ShortTouchArea')&&name==='type')return '活动类型（原插件更新/移除使用此键）';
 if(type?.endsWith('.GroupLiveContainerData')){const text={type:'容器类型（6为GiftMenu消费类型，其他含义未确认）',container_payload:'容器原生字符串（type=6按有界JSON提取菜单；内部没有Proto字段号）'}[name];if(text)return text;}
 return labels[name];
};
const labels={content:'正文',default_content:'备用正文',nickname:'昵称',common:'公共消息信息',user:'用户',gift:'礼物资料',gift_id:'礼物 ID',repeat_count:'重复数量字段（非增量）',group_count:'组数字段',combo_count:'连击计数字段',repeat_end:'连击结束标记',count:'本条数量',total:'总数量字段',name:'名称',describe:'原生描述',description:'原生描述',default_pattern:'原生文案模板',pieces:'富文本片段',string_value:'文字片段',user_value:'用户片段',image_value:'图片片段',rtf_content_v2:'富文本 v2',emoji_content:'表情内容',tray_display_text:'礼物托盘文案',action:'动作值（含义依消息类型）',avatar_thumb:'头像缩略图',badge_image_list:'徽章图片',url_list:'资源地址列表'};
Object.assign(labels,{op:'权限操作（1授予/2撤销）',privilege:'权限编号（部分符号已静态核对，不代表当前有效权限）',is_admin:'本条消息的管理员标记',box_id:'红包 ID',box_status:'红包状态值（枚举未确认）',description_list:'红包说明片段',diamond_count:'平台数量字段（不换算金额）',lottery_id:'福袋 ID',lottery_status:'福袋状态（静态枚举已核对）',lottery_draw_time:'平台开奖时间字段',lottery_current_time:'平台当前时间字段',award_name:'奖品名称',award_description:'奖品说明',participate_success:'参与成功标记',user_ids:'开奖结果用户列表',message_type:'活动卡片动作（1更新/2移除）',short_touch_area_data:'活动卡片资料',short_touch_info:'活动展示配置'});
Object.assign(labels,{tray_info:'礼物托盘配置',tray_base_img:'托盘背景图片',tray_dynamic_img:'托盘动态图（55px展示）',tray_type:'托盘类型（枚举依赖尚未确认）',group_id:'礼物连击组 ID',image:'图片资料',left_additional_content:'用户片段前文',right_additional_content:'用户片段后文'});
export function messageFields(parser,method,data){
 const root=resolveBusiness(parser,method||''),fields=[];let truncated=false;
 function walk(value,type,prefix='',depth=0){if(!value||typeof value!=='object')return;if(depth>12){truncated=true;return;}
  for(const [key,v]of Object.entries(value)){if(fields.length>=500){truncated=true;return;}const f=type?.fields.find(x=>x.name===key),p=prefix?prefix+'.'+key:key;
   fields.push({path:p,number:f?.id??null,type:f?.type??null,parentType:type?.fullName??null,repeated:Boolean(f?.repeated),keyType:f?.keyType||null,label:labelFor(key,type?.fullName)||'中文含义未确认',confidence:f?'official-schema':'unknown',mappingConfidence:labelFor(key,type?.fullName)?'field-name-and-static-source':'unknown'});
   if(f?.repeated&&Array.isArray(v)){for(let i=0;i<Math.min(v.length,20);i++)walk(v[i],parser.types.get(f.type),`${p}[${i}]`,depth+1);if(v.length>20)truncated=true;}
   else if(f?.keyType&&v&&typeof v==='object'){for(const [k,item]of Object.entries(v).slice(0,20))walk(item,parser.types.get(f.type),`${p}[${JSON.stringify(k)}]`,depth+1);}
   else walk(v,parser.types.get(f?.type),p,depth+1);
  }
 }
 walk(data,root);
 return {rootType:root?.fullName||null,mappingVersion,fields,truncated,dictionary:root?.fields.map(f=>({name:f.name,number:f.id,type:f.type,repeated:Boolean(f.repeated),keyType:f.keyType||null,label:labelFor(f.name,root?.fullName)||'中文含义未确认'}))||[]};
}

// Resolve an exact JSON pointer independently of the bounded overview index.
export function fieldAt(parser,method,pointer){
 const parts=pointer===''?[]:pointer.slice(1).split('/').map(x=>x.replaceAll('~1','/').replaceAll('~0','~'));
 if(pointer!==''&&!pointer.startsWith('/'))throw Error('CURSOR_MISMATCH');
 let type=resolveBusiness(parser,method||''),field=null,parent=type;
 for(let i=0;i<parts.length;i++){
  parent=type;field=type?.fields.find(x=>x.name===parts[i]);if(!field)return {path:pointer,confidence:'unknown',label:'Proto 对应关系未确认'};
  type=parser.types.get(field.type);if((field.repeated||field.keyType)&&i+1<parts.length)i++;
 }
 return {path:pointer,parentType:parent?.fullName||null,number:field?.id??null,type:field?.type||type?.fullName||null,repeated:Boolean(field?.repeated),keyType:field?.keyType||null,label:labelFor(field?.name,parent?.fullName)||'中文含义未确认',confidence:field?'official-schema':'unknown'};
}
