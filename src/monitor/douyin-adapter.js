import {displayAvatar,displayText,displayId} from '../auth/display-info.js';
import {TargetResolver} from '../targets/resolver.js';
export const losslessJson=text=>JSON.parse(text,(_key,value,context)=>typeof value==='number'&&!Number.isSafeInteger(value)&&/^-?\d+$/.test(context?.source||'')?context.source:value);
export function roomDocuments(text){const values=[];try{values.push(losslessJson(text));}catch{}
 for(const match of text.matchAll(/<script\b[^>]*(?:id=["'](?:RENDER_DATA|__NEXT_DATA__)["']|type=["']application\/json["'])[^>]*>([\s\S]*?)<\/script>/gi))try{values.push(losslessJson(match[1].trim().startsWith('%')?decodeURIComponent(match[1].trim()):match[1]));}catch{}
 // Observed Next/Pace flight embeds JSON strings. Only parse literals; never
 // evaluate script or accept arbitrary global stream names.
 for(const match of text.matchAll(/self\.(?:__next_f|__pace_f)\.push\(\[\d+,\s*("(?:\\.|[^"\\])*")\s*\]\)/g))try{const inner=JSON.parse(match[1]);for(const line of inner.split('\n')){const start=line.indexOf(':');try{values.push(losslessJson(line.slice(start+1)));}catch{}}}catch{}
 return values;
}
export function extractRoomEvidence(text,target,{identityOnly=false}={}){
 const matches=[];const candidate=node=>{
  const roomId=node.roomId||node.room_id||node.id_str||node.id,web_rid=node.web_rid,owner=node.owner||node.anchor||{},anchorUid=owner.id_str||owner.id||owner.uid,secUid=owner.sec_uid||owner.secUid;
  const constraints=[target.web_rid?String(web_rid||'')===target.web_rid:null,target.secUid?secUid===target.secUid:null,target.anchorUid?String(anchorUid||'')===target.anchorUid:null,target.roomId?String(roomId||'')===target.roomId:null].filter(x=>x!==null),matched=constraints.length&&constraints.every(Boolean);
  if(matched&&roomId&&/^[1-9]\d*$/.test(String(roomId))&&(identityOnly&&/^[1-9]\d*$/.test(String(anchorUid))||[2,4].includes(Number(node.status))))matches.push({state:Number(node.status)===2?'LIVE':Number(node.status)===4?'ENDED':'UNKNOWN',roomId:String(roomId),anchorUid:anchorUid?String(anchorUid):null,secUid:secUid||null,web_rid:web_rid?String(web_rid):target.web_rid||null,source:'douyin-structured-room',pushState:'UNKNOWN',roomInfo:{url:web_rid?'https://live.douyin.com/'+encodeURIComponent(web_rid):null,roomId:displayId(String(roomId)),anchorUid:anchorUid?displayId(String(anchorUid)):null,secUid:displayId(secUid),web_rid:web_rid?displayId(String(web_rid)):null,nickname:displayText(owner.nickname),avatar:displayAvatar((owner.avatar_thumb||owner.avatar_medium||owner.avatar_large)?.url_list?.[0]),title:displayText(node.title),description:displayText(node.description)}});
 };const walk=(node,depth=0)=>{if(!node||typeof node!=='object'||depth>30)return;
  candidate(node);if(node.room&&typeof node.room==='object')candidate({...node,...node.room,web_rid:node.room.web_rid||node.web_rid,owner:node.room.owner||node.owner||node.anchor});
  for(const value of Object.values(node))if(typeof value==='object')walk(value,depth+1);
 };for(const doc of roomDocuments(text))walk(doc);
 const unique=new Map();for(const x of matches){const {roomInfo,...core}=x,key=identityOnly?JSON.stringify([x.roomId,x.anchorUid,x.web_rid]):JSON.stringify(core),old=unique.get(key);unique.set(key,identityOnly?{roomId:x.roomId,anchorUid:x.anchorUid,web_rid:x.web_rid,state:'UNKNOWN',pushState:'UNKNOWN',source:x.source}:old&&JSON.stringify(old.roomInfo)!==JSON.stringify(roomInfo)?{...core,roomInfo:null}:x);}return unique.size===1?[...unique.values()][0]:{state:'UNKNOWN',source:'douyin-structured-room',pushState:'UNKNOWN',errorCode:unique.size?'TARGET_EVIDENCE_CONFLICT':'MONITOR_EVIDENCE_UNAVAILABLE'};
}
export class DouyinMonitorAdapter{
 constructor({resolver=new TargetResolver()}={}){this.resolver=resolver;}
 async probe(profile,{signal}={}){
  try{const target=await this.resolver.resolve(profile.target,{timeoutMs:profile.timeoutMs,signal,networkPolicy:profile.networkPolicy||{mode:'system'}});
   // UID and actual roomId cannot safely be used as a page web_rid.
   const identifier=target.web_rid||target.secUid;if(!identifier)return {state:'UNKNOWN',resolved:target,missingConditions:target.missingConditions,errorCode:'TARGET_MAPPING_REQUIRED'};
   const response=await this.resolver.http.get('https://live.douyin.com/'+encodeURIComponent(identifier),{timeoutMs:profile.timeoutMs,signal,networkPolicy:profile.networkPolicy||{mode:'system'}});
   let current=target;try{const page=this.resolver.classify({type:'url',value:response.url});if(page.web_rid)current={...target,web_rid:page.web_rid};}catch{}
   return {...extractRoomEvidence(response.text,current),resolved:current,network:response.network};
  }catch(error){const code=/^(MONITOR_|TARGET_|NETWORK_)/.test(error.message)?error.message:'MONITOR_HTTP_FAILED';return {state:'UNKNOWN',errorCode:code,pushState:'UNKNOWN',network:error.network||{mode:profile.networkPolicy?.mode||'system',route:'unavailable',dns:'unavailable',errorCode:code}};}
 }
}
