import {safeText,resourceUrl} from './privacy.js';
const number=v=>/^(?:0|[1-9]\d{0,39})$/.test(String(v))?String(v):null;
// GiftMenuPlugin.277c15b4.js consumes only the last container item, type 6.
// JSON is data, never a script or an arbitrary object merged into application state.
export function giftMenu(raw){
 const last=Array.isArray(raw.data)?raw.data.at(-1):null;if(Number(last?.type)!==6)return null;
 const unknown=reason=>({action:'unknown',gifts:[],total:0,truncated:false,reason});
 if(last.container_payload===undefined||last.container_payload===null||last.container_payload==='')return {action:'hide',gifts:[],total:0,truncated:false};
 if(typeof last.container_payload!=='string'||last.container_payload.length>32768)return unknown('PAYLOAD_LIMIT');
 let payload;try{payload=JSON.parse(last.container_payload,(_k,v,context)=>typeof v==='number'&&!Number.isSafeInteger(v)&&/^-?\d+$/.test(context?.source||'')?context.source:v);}catch{return unknown('INVALID_JSON');}
 if(!Array.isArray(payload?.data)||!payload.data.length)return unknown('NO_MENU_ITEMS');
 const gifts=payload.data.slice(0,20).filter(x=>x&&typeof x==='object'&&!Array.isArray(x)).map((x,index)=>({index,id:number(x.id),name:safeText(x.name,160)||null,icon:resourceUrl(x.icon),price:number(x.price)}));
 return gifts.length?{action:'replace',gifts,total:payload.data.length,truncated:payload.data.length>20,reason:null}:unknown('NO_MENU_ITEMS');
}
