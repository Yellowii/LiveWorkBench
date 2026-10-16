import {resourceUrl,safeText} from './privacy.js';
const decimal=x=>/^(0|[1-9]\d{0,39})$/.test(String(x))?String(x):null;
export const imageRef=(image,field)=>{const urls=[...new Set((Array.isArray(image?.url_list)?image.url_list:[]).slice(0,16).map(resourceUrl).filter(Boolean))].slice(0,3);return urls.length?{url:urls[0],urls,field}:null;};
export function chatActor(user){
 if(!user)return null;
 const info=user.public_area_badge_info,visualBadges=[],list=info?(Array.isArray(info.badge_list)?info.badge_list:[]).map(key=>info.badge_info_map?.[key]):user.badge_image_list;
 for(const [i,b]of (Array.isArray(list)?list:[]).slice(0,12).entries()){
  const ref=imageRef(b,info?`user.public_area_badge_info.badge_info_map.${info.badge_list[i]}`:`user.badge_image_list[${i}]`);if(!ref)continue;
  const name=safeText(b.content?.name),type=Number(b.image_type),layout=[51,55,56].includes(type)&&name?'nine-slice':type===7&&name?'overlay':'image';
  visualBadges.push({...ref,name,layout,imageType:type});
 }
 return {id:decimal(user.id_str||user.id),name:safeText(user.nickname)||'未提供昵称',badges:user.user_attr?.is_admin===true?['管理员（本条标记）']:[],visualBadges,badgeRule:info?.webcast_dsl_badge_list?.length?'base-list-dsl-unresolved':info?'official-base-list':'legacy-image-list',avatar:imageRef(user.avatar_thumb,'user.avatar_thumb')};
}
export function templateRuns(text){
 const pieces=Array.isArray(text?.pieces)?text.pieces.slice(0,60):[],pattern=safeText(text?.default_pattern),out=[];
 const piece=(index,kind)=>{const p=pieces[index];if(!p)return [{type:'text',text:'[未识别片段]'}];
  if(p.user_value?.user)return [{type:'text',text:safeText(p.user_value.left_additional_content)},{type:'user',actor:chatActor(p.user_value.user)},{type:'text',text:safeText(p.user_value.right_additional_content)}];
  if(p.image_value?.image){const ref=imageRef(p.image_value.image,`common.display_text.pieces[${index}].image_value.image`);return ref?[{type:'image',...ref,alt:'[图片]'}]:[{type:'text',text:'[图片不可用]'}];}
  if(p.string_value!==undefined)return [{type:'text',text:safeText(p.string_value),emphasis:kind==='pref'}];
  return [{type:'text',text:'[未识别片段]'}];
 };
 if(!pattern)return pieces.flatMap((_,i)=>piece(i)).slice(0,120);
 let offset=0;for(const match of pattern.matchAll(/\{(\d+)(?::([^}]*))?\}/g)){out.push({type:'text',text:pattern.slice(offset,match.index)},...piece(Number(match[1]),match[2]));offset=match.index+match[0].length;}out.push({type:'text',text:pattern.slice(offset)});return out.slice(0,120);
}
export const runText=runs=>runs.map(r=>r.type==='user'?r.actor?.name:r.type==='image'?'[图片]':r.text).join('');
export function roomAudience(type,raw){
 if(type==='RoomStatsMessage')return {kind:'stats',display:safeText(raw.display_middle)||safeText(raw.display_long)||safeText(raw.display_short),value:decimal(raw.display_value),version:decimal(raw.display_version),hidden:raw.is_hidden===true,incremental:raw.incremental===true};
 if(type==='RoomUserSeqMessage')return {kind:'ranks',partial:true,totalField:decimal(raw.total),users:(Array.isArray(raw.ranks)?raw.ranks:[]).slice(0,30).map((r,i)=>({position:i,rank:decimal(r.rank),hidden:r.is_hidden===true||r.user?.is_anonymous===true,actor:r.is_hidden===true||r.user?.is_anonymous===true?null:chatActor(r.user)})),truncated:(raw.ranks?.length||0)>30};
 return null;
}
