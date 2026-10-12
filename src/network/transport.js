import dns from 'node:dns/promises';
import {HttpsProxyAgent} from 'https-proxy-agent';
import {SocksProxyAgent} from 'socks-proxy-agent';
import {ProxyPolicy} from './proxy-policy.js';
import {networkTarget,publicAddress} from './target-policy.js';
export class NetworkTransport{
 constructor({proxyPolicy=new ProxyPolicy(),lookup=dns.lookup,allowLocalTest=false,mode='live',tlsCa}={}){if((allowLocalTest||tlsCa)&&mode!=='test')throw new Error('TEST_MODE_REQUIRED');this.proxyPolicy=proxyPolicy;this.lookup=lookup;this.allowLocalTest=allowLocalTest;this.tlsCa=tlsCa;}
 async options(value,policy={mode:'system'},{signal=AbortSignal.timeout(10000),browserAsset=false}={}){
  const u=networkTarget(value,{browserAsset}),route=await this.proxyPolicy.resolve(policy,u.href),request={rejectUnauthorized:true,servername:u.hostname};if(this.tlsCa)request.ca=this.tlsCa;
  const diagnostic={mode:route.mode,targetHost:u.hostname,proxyOrigin:route.origin||null,route:route.kind==='direct'?'direct':route.kind==='socks5'?'socks5-proxy':'http-connect-proxy',dns:route.kind==='direct'?'pending-public-verification':'delegated-to-proxy',localDnsUsed:false,connectionState:'pending',tls:'verify-host-and-chain',errorCode:null};
  if(route.kind==='direct'){
   let addresses,abort;diagnostic.localDnsUsed=true;
   try{addresses=await Promise.race([this.lookup(u.hostname,{all:true}),new Promise((_,reject)=>{abort=()=>reject(new Error('NETWORK_TIMEOUT'));if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});})]);}catch(error){const code=error.message==='NETWORK_TIMEOUT'?'NETWORK_TIMEOUT':'NETWORK_DNS_FAILED';throw Object.assign(new Error(code),{network:{...diagnostic,dns:'failed',connectionState:'not-attempted',errorCode:code}});}finally{signal.removeEventListener('abort',abort);}
   if(!addresses.length||addresses.some(x=>!publicAddress(x.address)))throw Object.assign(new Error('NETWORK_DNS_NOT_PUBLIC'),{network:{...diagnostic,dns:'nonpublic-or-fake-ip-rejected',connectionState:'not-attempted',errorCode:'NETWORK_DNS_NOT_PUBLIC'}});const pinned=addresses[0];request.agent=false;request.lookup=(_host,options,cb)=>cb(null,options.all?[pinned]:pinned.address,pinned.family);diagnostic.dns='verified-and-pinned-public';diagnostic.pinnedAddress=pinned.address;
  }else{request.agent=route.kind==='socks5'?new SocksProxyAgent(route.server,{timeout:10000}):new HttpsProxyAgent(route.server);const proxy=new URL(route.server);diagnostic.proxy={protocol:proxy.protocol.slice(0,-1),host:proxy.hostname,port:proxy.port||'default'};}
  return {request,diagnostic,route};
 }
 async browserRoute(value,policy){networkTarget(value);const route=await this.proxyPolicy.resolve(policy,value);if(route.kind!=='direct'){const proxy=new URL(route.server);return {launch:{proxy:{server:route.server.replace('socks5h:','socks5:')}},diagnostic:{mode:route.mode,proxyOrigin:route.origin,route:route.kind==='socks5'?'socks5-proxy':'http-connect-proxy',dns:'delegated-to-proxy',localDnsUsed:false,connectionState:'pending',proxy:{protocol:proxy.protocol.slice(0,-1),host:proxy.hostname,port:proxy.port||'default'},tls:'browser-verify-host-and-chain'},close:async()=>{}};}
  const diagnostic={mode:route.mode,route:'direct-via-local-pinning-tunnel',dns:'pending-public-verification',localDnsUsed:true,connectionState:'pending',tls:'browser-end-to-end-verification'};
  const {DirectBrowserTunnel}=await import('./direct-browser-tunnel.js');const tunnel=new DirectBrowserTunnel(this,result=>Object.assign(diagnostic,result));await tunnel.start();return {launch:{proxy:{server:tunnel.url,bypass:'<-loopback>'}},diagnostic,close:()=>tunnel.close()};
 }
}
