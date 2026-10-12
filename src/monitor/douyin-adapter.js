import {TargetResolver} from '../targets/resolver.js';
export const losslessJson=text=>JSON.parse(text,(_key,value,context)=>typeof value==='number'&&!Number.isSafeInteger(value)&&/^-?\d+$/.test(context?.source||'')?context.source:value);
function documents(text){const values=[];try{values.push(losslessJson(text));}catch{}
 for(const match of text.matchAll(/<script\b[^>]*(?:id=["'](?:RENDER_DATA|__NEXT_DATA__)["']|type=["']application\/json["'])[^>]*>([\s\S]*?)<\/script>/gi))try{values.push(losslessJson(match[1].trim().startsWith('%')?decodeURIComponent(match[1].trim()):match[1]));}catch{}
 // Next flight embeds JSON strings. Only parse literals; never evaluate script.
 for(const match of text.matchAll(/self\.__next_f\.push\(\[\d+,\s*("(?:\\.|[^"\\])*")\s*\]\)/g))try{const inner=JSON.parse(match[1]);for(const line of inner.split('\n')){const start=line.indexOf(':');try{values.push(losslessJson(line.slice(start+1)));}catch{}}}catch{}
 return values;
}
export function extractRoomEvidence(text,target){
 const matches=[];const walk=(node,depth=0)=>{if(!node||typeof node!=='object'||depth>30)return;
  const roomId=node.roomId||node.room_id||node.id_str,web_rid=node.web_rid,owner=node.owner||node.anchor||{},anchorUid=owner.id_str||owner.id||owner.uid,secUid=owner.sec_uid||owner.secUid;
  const matched=target.web_rid?String(web_rid||'')===target.web_rid:target.secUid?secUid===target.secUid:target.anchorUid?String(anchorUid||'')===target.anchorUid:target.roomId?String(roomId||'')===target.roomId:false;
  if(matched&&roomId&&/^[1-9]\d*$/.test(String(roomId))&&[2,4].includes(Number(node.status)))matches.push({state:Number(node.status)===2?'LIVE':'ENDED',roomId:String(roomId),anchorUid:anchorUid?String(anchorUid):null,secUid:secUid||null,web_rid:web_rid?String(web_rid):target.web_rid||null,source:'douyin-structured-room',pushState:'UNKNOWN'});
  for(const value of Object.values(node))if(typeof value==='object')walk(value,depth+1);
 };for(const doc of documents(text))walk(doc);
 const unique=new Map(matches.map(x=>[JSON.stringify(x),x]));return unique.size===1?[...unique.values()][0]:{state:'UNKNOWN',source:'douyin-structured-room',pushState:'UNKNOWN',errorCode:unique.size?'TARGET_EVIDENCE_CONFLICT':'MONITOR_EVIDENCE_UNAVAILABLE'};
}
export class DouyinMonitorAdapter{
 constructor({resolver=new TargetResolver()}={}){this.resolver=resolver;}
 async probe(profile,{signal}={}){
  try{const target=await this.resolver.resolve(profile.target,{timeoutMs:profile.timeoutMs,signal});
   // UID and actual roomId cannot safely be used as a page web_rid.
   const identifier=target.web_rid||target.secUid;if(!identifier)return {state:'UNKNOWN',resolved:target,errorCode:'TARGET_MAPPING_REQUIRED'};
   const response=await this.resolver.http.get('https://live.douyin.com/'+encodeURIComponent(identifier),{timeoutMs:profile.timeoutMs,signal});
   return {...extractRoomEvidence(response.text,target),resolved:target};
  }catch(error){const code=/^(MONITOR_|TARGET_)/.test(error.message)?error.message:'MONITOR_HTTP_FAILED';return {state:'UNKNOWN',errorCode:code,pushState:'UNKNOWN'};}
 }
}
