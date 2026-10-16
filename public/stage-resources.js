const localAsset=url=>/^\/api\/v1\/local\/assets\/(lottery-icon|gift-tray-bg|redpacket-notice)$/.test(url);
function allowed(url){
 if(localAsset(url))return true;
 try{const u=new URL(url);return url.length<=8192&&u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&/\.(?:douyinpic|byteimg|ibyteimg)\.com$/i.test(u.hostname)&&![...u.searchParams.keys()].some(k=>/^(cookie|token|authorization|password|secret|signature|sessionid|msToken)$/i.test(k))&&!/cookie|token|password|secret|credential|authorization|signature|(?:^|_)sign(?:_|$)|payload|base64|schema|scheme|url|uri|file_?path|^key$|openid|sec_uid/i.test(u.pathname);}catch{return false;}
}
export class StageResources{
 constructor(onChange=()=>{}){this.cache=new Map();this.pending=[];this.running=0;this.failures=[];this.onChange=onChange;this.rejected=new Set();}
 get(url,kind,alternatives=[]){
  if(url&&typeof url==='object'){alternatives=url.urls;url=url.url;}
  if(!url)return null;if(this.cache.has(url))return this.cache.get(url);
  if(!allowed(url)){if(!this.rejected.has(url)){this.rejected.add(url);if(this.rejected.size>128)this.rejected.delete(this.rejected.values().next().value);this.failure(kind,'URL_POLICY_REJECTED');}return null;}
  if(this.cache.size>=128){const key=[...this.cache].find(([,v])=>v.state!=='loading'&&v.state!=='queued')?.[0];if(key)this.cache.delete(key);else return null;}
  const urls=[...new Set([url,...(Array.isArray(alternatives)?alternatives.slice(0,3):[])].filter(allowed))].slice(0,3),item={state:'queued',kind,image:null,attempts:0,attemptFailures:[],fallback:false,reason:null};
  this.cache.set(url,item);this.pending.push({urls,item});this.pump();return item;
 }
 failure(kind,reason){this.failures.push({kind,reason});this.failures=this.failures.slice(-20);this.onChange();}
 pump(){while(this.running<6&&this.pending.length){
  const {urls,item}=this.pending.shift();this.running++;item.state='loading';let ended=false,image;
  const detach=()=>{if(image){image.onload=null;image.onerror=null;}};
  const finish=(ok,reason)=>{if(ended)return;ended=true;clearTimeout(timer);detach();item.state=ok?'loaded':'failed';item.image=ok?image:null;item.reason=ok?null:reason;item.fallback=ok&&item.attempts>1;this.running--;if(!ok)this.failure(item.kind,reason);this.onChange();this.pump();};
  // One total deadline and one concurrency slot across all candidate URLs.
  const timer=setTimeout(()=>{finish(false,'REQUEST_TIMEOUT');if(image)image.src='';},10000);
  const attempt=()=>{
   detach();const url=urls[item.attempts++];image=new Image();image.referrerPolicy='no-referrer';
   const fail=reason=>{if(ended)return;item.attemptFailures.push(reason);if(item.attempts<urls.length)attempt();else finish(false,reason);};
   image.onload=()=>image.naturalWidth>0?finish(true):fail('IMAGE_DECODE_FAILED');
   image.onerror=async()=>{let reason='REQUEST_OR_DECODE_FAILED';if(localAsset(url))try{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(5000)});reason=r.status===404?'LOCAL_ASSET_NOT_PREPARED':r.status===403?'LOCAL_SESSION_EXPIRED':'IMAGE_DECODE_FAILED';}catch{}fail(reason);};
   image.src=url;
  };attempt();
 }}
}
