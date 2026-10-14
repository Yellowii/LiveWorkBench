import {resolveBusiness} from '../parser/decode.js';
import {mappingVersion} from './message-view.js';
const labels={content:'正文',default_content:'备用正文',nickname:'昵称',common:'公共消息信息',user:'用户',gift:'礼物资料',gift_id:'礼物 ID',repeat_count:'重复数量字段（非增量）',group_count:'组数字段',combo_count:'连击计数字段',repeat_end:'连击结束标记',count:'本条数量',total:'总数量字段',name:'名称',describe:'原生描述',description:'原生描述',default_pattern:'原生文案模板',pieces:'富文本片段',string_value:'文字片段',user_value:'用户片段',image_value:'图片片段',rtf_content_v2:'富文本 v2',emoji_content:'表情内容',tray_display_text:'礼物托盘文案',action:'动作值（含义依消息类型）',avatar_thumb:'头像缩略图',badge_image_list:'徽章图片',url_list:'资源地址列表（受隐私过滤）'};
Object.assign(labels,{op:'权限操作（1授予/2撤销）',privilege:'权限编号（具体权限未确认）',is_admin:'本条消息的管理员标记',box_id:'红包 ID',box_status:'红包状态值（枚举未确认）',description_list:'红包说明片段',diamond_count:'平台数量字段（不换算金额）',lottery_id:'福袋 ID',lottery_status:'福袋状态（静态枚举已核对）',lottery_draw_time:'平台开奖时间字段',lottery_current_time:'平台当前时间字段',award_name:'奖品名称',award_description:'奖品说明',participate_success:'参与成功标记',user_ids:'开奖结果用户列表',message_type:'活动卡片动作（1更新/2移除）',short_touch_area_data:'活动卡片资料',short_touch_info:'活动展示配置'});
export function messageFields(parser,method,data){
 const root=resolveBusiness(parser,method||''),fields=[];let truncated=false;
 function walk(value,type,prefix='',depth=0){if(!value||typeof value!=='object')return;if(depth>12){truncated=true;return;}
  for(const [key,v]of Object.entries(value)){if(fields.length>=500){truncated=true;return;}const f=type?.fields.find(x=>x.name===key),p=prefix?prefix+'.'+key:key;
   fields.push({path:p,number:f?.id??null,type:f?.type??null,parentType:type?.fullName??null,repeated:Boolean(f?.repeated),keyType:f?.keyType||null,label:labels[key]||'中文含义未确认',confidence:f?'official-schema':'unknown',mappingConfidence:labels[key]?'field-name-and-static-source':'unknown'});
   if(f?.repeated&&Array.isArray(v)){for(let i=0;i<Math.min(v.length,20);i++)walk(v[i],parser.types.get(f.type),`${p}[${i}]`,depth+1);if(v.length>20)truncated=true;}
   else if(f?.keyType&&v&&typeof v==='object'){for(const [k,item]of Object.entries(v).slice(0,20))walk(item,parser.types.get(f.type),`${p}[${JSON.stringify(k)}]`,depth+1);}
   else walk(v,parser.types.get(f?.type),p,depth+1);
  }
 }
 walk(data,root);
 return {rootType:root?.fullName||null,mappingVersion,fields,truncated,dictionary:root?.fields.map(f=>({name:f.name,number:f.id,type:f.type,repeated:Boolean(f.repeated),keyType:f.keyType||null,label:labels[f.name]||'中文含义未确认'}))||[]};
}
