export class StageResources{
 constructor(onChange=()=>{}){this.cache=new Map();this.pending=[];this.running=0;this.failures=[];this.onChange=onChange;}
 get(url,kind){if(!url)return null;if(this.cache.has(url))return this.cache.get(url);const local=/^\/api\/v1\/local\/assets\/(lottery-icon|gift-tray-bg|redpacket-notice)$/.test(url);let valid=local;try{const u=new URL(url);valid=valid||u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['douyinpic.com','byteimg.com','ibyteimg.com'].some(d=>u.hostname===d||u.hostname.endsWith('.'+d));}catch{}
  if(!valid){this.failure(kind,'URL_POLICY_REJECTED');return null;}
  if(this.cache.size>=128){const key=[...this.cache].find(([,v])=>v.state!=='loading'&&v.state!=='queued')?.[0];if(key)this.cache.delete(key);else return null;}
  const item={state:'queued',kind,image:null};this.cache.set(url,item);this.pending.push({url,item,local});this.pump();return item;
 }
 failure(kind,reason){this.failures.push({kind,reason});this.failures=this.failures.slice(-20);this.onChange();}
 pump(){while(this.running<6&&this.pending.length){const {url,item,local}=this.pending.shift();this.running++;item.state='loading';const image=new Image();image.referrerPolicy='no-referrer';let ended=false;const finish=(ok,reason)=>{if(ended)return;ended=true;clearTimeout(timer);image.onload=null;image.onerror=null;item.state=ok?'loaded':'failed';item.image=ok?image:null;item.reason=reason;this.running--;if(!ok)this.failure(item.kind,reason);this.onChange();this.pump();};const timer=setTimeout(()=>{finish(false,'REQUEST_TIMEOUT');image.src='';},10000);image.onload=()=>finish(image.naturalWidth>0,'IMAGE_DECODE_FAILED');image.onerror=async()=>{let reason='REQUEST_OR_DECODE_FAILED';if(local)try{const r=await fetch(url,{cache:'no-store'});reason=r.status===404?'LOCAL_ASSET_NOT_PREPARED':r.status===403?'LOCAL_SESSION_EXPIRED':'IMAGE_DECODE_FAILED';}catch{}finish(false,reason);};image.src=url;}}
}
