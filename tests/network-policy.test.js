import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
let ProxyPolicy,NetworkTransport;
try{({ProxyPolicy}=await import('../src/network/proxy-policy.js'));({NetworkTransport}=await import('../src/network/transport.js'));}catch{}
test('system/custom proxy paths use remote DNS and direct refuses Fake-IP without disabling address checks',async()=>{
 assert.ok(ProxyPolicy,'explicit proxy policy required');assert.ok(NetworkTransport,'shared network transport required');let lookups=0;
 const policy=new ProxyPolicy({systemReader:async()=>({enabled:true,server:'127.0.0.1:7890',bypass:''})}),transport=new NetworkTransport({proxyPolicy:policy,lookup:async()=>{lookups++;return [{address:'198.18.0.42',family:4}];}});
 const system=await transport.options('https://live.douyin.com/123',{mode:'system'});assert.equal(system.diagnostic.route,'http-connect-proxy');assert.equal(system.diagnostic.dns,'delegated-to-proxy');assert.equal(lookups,0);
 const socks=await transport.options('wss://webcast5-ws-web-hl.douyin.com/webcast/im/push/',{mode:'custom',proxyUrl:'socks5://127.0.0.1:1080'});assert.equal(socks.diagnostic.route,'socks5-proxy');assert.equal(lookups,0);
 await assert.rejects(()=>transport.options('https://live.douyin.com/123',{mode:'direct'}),/NETWORK_DNS_NOT_PUBLIC/);assert.equal(lookups,1);
 await assert.rejects(()=>policy.resolve({mode:'custom',proxyUrl:'http://name:password@127.0.0.1:7890'},'https://live.douyin.com/123'),/NETWORK_PROXY_AUTH_UNSUPPORTED/);
});
test('direct browser tunnel refuses Fake-IP and untrusted CONNECT without dialing them',async()=>{
 const transport=new NetworkTransport({lookup:async()=>[{address:'198.19.0.7',family:4}]});const route=await transport.browserRoute('https://live.douyin.com/123',{mode:'direct'});
 const connect=host=>new Promise((resolve,reject)=>{const u=new URL(route.launch.proxy.server),socket=net.connect(Number(u.port),u.hostname,()=>socket.write('CONNECT '+host+':443 HTTP/1.1\r\nHost: '+host+':443\r\n\r\n'));let result='';socket.setTimeout(3000,()=>socket.destroy(new Error('TEST_TIMEOUT')));socket.on('data',chunk=>result+=chunk);socket.on('error',reject);socket.on('end',()=>resolve(result));});
 try{assert.match(await connect('live.douyin.com'),/403 Forbidden/);assert.equal(route.diagnostic.errorCode,'NETWORK_DNS_NOT_PUBLIC');assert.equal(route.diagnostic.connectionState,'not-attempted');assert.match(await connect('127.0.0.1'),/403 Forbidden/);assert.equal(route.diagnostic.errorCode,'NETWORK_TARGET_INVALID');}finally{await route.close();}
 const mixed=new NetworkTransport({lookup:async()=>[{address:'8.8.8.8',family:4},{address:'198.18.0.42',family:4}]});await assert.rejects(()=>mixed.options('https://live.douyin.com/123',{mode:'direct'}),/NETWORK_DNS_NOT_PUBLIC/);
});
test('direct uses a pinned verified address; system bypass and PAC are explicit rather than silently ignored',async()=>{
 assert.ok(NetworkTransport);const transport=new NetworkTransport({lookup:async()=>[{address:'8.8.8.8',family:4}]});const result=await transport.options('https://live.douyin.com/123',{mode:'direct'});
 const pinned=await new Promise((resolve,reject)=>result.request.lookup('live.douyin.com',{},(error,value)=>error?reject(error):resolve(value)));assert.equal(pinned,'8.8.8.8');assert.equal(result.request.rejectUnauthorized,true);
 const policy=new ProxyPolicy({systemReader:async()=>({enabled:true,server:'127.0.0.1:7890',bypass:'*.douyin.com'})});assert.equal((await policy.resolve({mode:'system'},'https://live.douyin.com/123')).kind,'direct');
 const pac=new ProxyPolicy({systemReader:async()=>({pac:'https://proxy.invalid/config.pac'})});await assert.rejects(()=>pac.resolve({mode:'system'},'https://live.douyin.com/123'),/NETWORK_SYSTEM_PAC_UNSUPPORTED/);
 await assert.rejects(()=>transport.options('https://127.0.0.1/private',{mode:'direct'}),/NETWORK_TARGET_INVALID/);
});
