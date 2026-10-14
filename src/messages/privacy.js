// This local-only view is separate from publicProjection. Never use it for WS/logs/exports.
const sensitive=/cookie|token|password|secret|credential|authorization|signature|(?:^|_)sign(?:_|$)|payload|base64|schema|scheme|url|uri|file_?path|^key$|openid|sec_uid/i;
const readable=new Set(['content','default_content','nickname','desensitized_nickname','name','title','describe','description','award_name','award_description','default_pattern','string_value','left_additional_content','right_additional_content','action_description','pop_str','text']);
export function safeText(value,max=2000){
 if(typeof value!=='string')return '';
 return value.slice(0,max).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'')
  .replace(/(?:https?|wss?):\/\/[^\s<>"']+/gi,'[链接已隐藏]')
  .replace(/(?:cookie|token|authorization|password|secret|signature|sessionid|msToken)\s*[=:]\s*[^\s,;]+/gi,'[凭据已隐藏]');
}
export function resourceUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&/\.(?:douyinpic|byteimg|ibyteimg)\.com$/i.test(u.hostname)&&!sensitive.test(u.pathname)?u.href:null;}catch{return null;}
}
export function localOfficial(value){
 let left=4096;
 function visit(v,key='',depth=0){
  if(--left<0||depth>14)return '[展示截断]';
  if(v===null||v===undefined)return null;
  if(Array.isArray(v))return v.slice(0,80).map(x=>visit(x,key,depth+1));
  if(typeof v==='object'){const out={};for(const [k,x]of Object.entries(v).slice(0,200)){if(!sensitive.test(k)&&!['__proto__','constructor','prototype'].includes(k))out[k]=visit(x,k,depth+1);}return out;}
  if(typeof v==='number')return Number.isFinite(v)?v:null;
  if(typeof v==='boolean')return v;
  if(typeof v==='string'){if(/^-?\d{1,40}$/.test(v))return v;return readable.has(key)?safeText(v):'[未公开文本]';}
  return null;
 }
 return visit(value);
}
