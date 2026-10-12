import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';

const domains=new Set(['live.douyin.com','www.douyin.com','v.douyin.com','m.douyin.com','www.iesdouyin.com']);
export function trustedUrl(value){
 let u;try{u=new URL(value);}catch{throw new Error('TARGET_INVALID');}
 if(u.protocol!=='https:'||!domains.has(u.hostname)||u.username||u.password||(u.port&&u.port!=='443')||u.href.length>2048)throw new Error('TARGET_INVALID');
 return u;
}
export function publicAddress(address){
 if(net.isIPv4(address)){const [a,b]=address.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0))||(a===198&&(b===18||b===19||b===51))||(a===203&&b===0));}
 // Only ordinary globally routed IPv6; exclude mapped IPv4 and special/reserved ranges.
 return net.isIPv6(address)&&/^2[0-9a-f]{3}:/i.test(address)&&!/^2001:(?:db8|0|10|20):/i.test(address)&&!/^2002:/i.test(address);
}
export class SafeDouyinHttp{
 constructor({lookup=dns.lookup,maxRedirects=4,maxBytes=2*1024*1024}={}){this.lookup=lookup;this.maxRedirects=maxRedirects;this.maxBytes=maxBytes;}
 async get(value,{timeoutMs=10000,signal}={}){
  let u=trustedUrl(value);const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  const timer=setTimeout(abort,timeoutMs);
  try{for(let n=0;n<=this.maxRedirects;n++){
   const addresses=await Promise.race([this.lookup(u.hostname,{all:true}),new Promise((_,reject)=>{if(controller.signal.aborted)reject(new Error('MONITOR_TIMEOUT'));else controller.signal.addEventListener('abort',()=>reject(new Error('MONITOR_TIMEOUT')),{once:true});})]);
   if(!addresses.length||addresses.some(x=>!publicAddress(x.address)))throw new Error('TARGET_PRIVATE_ADDRESS');
   const pinned=addresses[0];const result=await new Promise((resolve,reject)=>{
    const request=https.get(u,{signal:controller.signal,agent:false,lookup:(_host,options,cb)=>cb(null,options.all?[pinned]:pinned.address,pinned.family),headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html,application/json','Accept-Encoding':'identity'}},res=>{
     if([301,302,303,307,308].includes(res.statusCode)){const location=res.headers.location;res.destroy();resolve({location});return;}
     if(res.statusCode!==200){res.destroy();reject(new Error([401,403,429].includes(res.statusCode)?'MONITOR_ACCESS_BLOCKED':'MONITOR_HTTP_FAILED'));return;}
     if(res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){res.destroy();reject(new Error('MONITOR_ENCODING_UNSUPPORTED'));return;}
     const chunks=[];let size=0;res.on('data',b=>{size+=b.length;if(size>this.maxBytes){res.destroy(new Error('MONITOR_RESPONSE_TOO_LARGE'));return;}chunks.push(b);});res.on('error',reject);res.on('end',()=>resolve({text:Buffer.concat(chunks).toString('utf8'),url:u.href}));
    });request.on('error',()=>reject(new Error(controller.signal.aborted?'MONITOR_TIMEOUT':'MONITOR_HTTP_FAILED')));
   });
   if(!result.location)return result;if(n===this.maxRedirects)throw new Error('TARGET_REDIRECT_LIMIT');u=trustedUrl(new URL(result.location,u).href);
  }}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }
}
