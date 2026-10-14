import https from 'node:https';
import dns from 'node:dns/promises';

import {trustedUrl} from '../network/target-policy.js';
import {NetworkTransport} from '../network/transport.js';
import {cookieHeader} from '../auth/request-cookies.js';
export {trustedUrl,publicAddress} from '../network/target-policy.js';
export class SafeDouyinHttp{
 constructor({lookup=dns.lookup,maxRedirects=4,maxBytes=2*1024*1024,transport}={}){this.transport=transport||new NetworkTransport({lookup});this.maxRedirects=maxRedirects;this.maxBytes=maxBytes;}
 async get(value,{timeoutMs=10000,signal,networkPolicy={mode:'system'},storageState}={}){
  let u=trustedUrl(value);const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  const timer=setTimeout(abort,timeoutMs);
  try{for(let n=0;n<=this.maxRedirects;n++){
   let connection;try{connection=await this.transport.options(u.href,networkPolicy,{signal:controller.signal});}catch(error){if(error.message==='NETWORK_DNS_NOT_PUBLIC')error.message='TARGET_PRIVATE_ADDRESS';throw error;}
   const result=await new Promise((resolve,reject)=>{
    const cookie=cookieHeader(u.href,storageState);
    const request=https.get(u,{...connection.request,signal:controller.signal,headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html,application/json','Accept-Encoding':'identity',...(cookie?{Cookie:cookie}:{})}},res=>{
     if([301,302,303,307,308].includes(res.statusCode)){const location=res.headers.location;res.destroy();resolve({location});return;}
     connection.diagnostic.connectionState='connected';
     if(res.statusCode!==200){res.destroy();const code=[401,403,429].includes(res.statusCode)?'MONITOR_ACCESS_BLOCKED':'MONITOR_HTTP_FAILED';reject(Object.assign(new Error(code),{network:{...connection.diagnostic,httpStatus:res.statusCode,errorCode:code}}));return;}
     if(res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){res.destroy();reject(Object.assign(new Error('MONITOR_ENCODING_UNSUPPORTED'),{network:{...connection.diagnostic,errorCode:'MONITOR_ENCODING_UNSUPPORTED'}}));return;}
     const chunks=[];let size=0;res.on('data',b=>{size+=b.length;if(size>this.maxBytes){res.destroy(new Error('MONITOR_RESPONSE_TOO_LARGE'));return;}chunks.push(b);});res.on('error',reject);res.on('end',()=>resolve({text:Buffer.concat(chunks).toString('utf8'),url:u.href,network:connection.diagnostic}));
    });request.on('error',error=>{const code=controller.signal.aborted?'MONITOR_TIMEOUT':/CERT|TLS|SSL/.test(error.code||'')?'NETWORK_TLS_VERIFICATION_FAILED':connection.route.kind==='direct'?'NETWORK_CONNECT_FAILED':'NETWORK_PROXY_CONNECT_FAILED';reject(Object.assign(new Error(code),{network:{...connection.diagnostic,connectionState:'failed',errorCode:code}}));});
   });
   if(!result.location)return result;if(n===this.maxRedirects)throw new Error('TARGET_REDIRECT_LIMIT');u=trustedUrl(new URL(result.location,u).href);
  }}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }
}
