import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {EventEmitter} from 'node:events';
import {chromium} from 'playwright-core';
import {LoginBrowserSession} from '../src/auth/login-browser-session.js';
import {blockRequest} from '../src/capture/browser/browser-source.js';
import {networkTarget,trustedUrl} from '../src/network/target-policy.js';
import {LoginLoadDiagnostics,requestFailureReason} from '../src/auth/login-load-diagnostics.js';
// Self-authored two-glyph TrueType fixture (FontBuilder; no third-party font).
const font=Buffer.from('AAEAAAAKAIAAAwAgT1MvMkUAQ9EAAAEoAAAAYGNtYXAAdABbAAABkAAAADxnbHlmAAAAAAAAAdQAAAABaGVhZF8WQOAAAACsAAAANmhoZWEDIgEuAAAA5AAAACRobXR4AfQAAAAAAYgAAAAGbG9jYQAAAAAAAAHMAAAABm1heHAAAwACAAABCAAAACBuYW1lNopRggAAAdgAAAECcG9zdAAHAAAAAALcAAAAJgABAAAAAQAA5S7sOF8PPPUAAwPoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwACAAAAAAAAAAEAAAMg/zgAAAH0AAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAEAAAACAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAwH0AZAABQAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAPz8/PwAAACAAQQMg/zgAAAMgAMgAAAAAAAAAAAAAAAAAAAAgAAAB9AAAAAAAAAAAAAIAAAADAAAAFAADAAEAAAAUAAQAKAAAAAYABAABAAIAIABB//8AAAAgAEH////h/8AAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAfgABAAAAAAABAAwAAAABAAAAAAACAAcADAABAAAAAAADAA4AEwABAAAAAAAEAAwAAAABAAAAAAAGAAsAIQADAAEECQABABgALAADAAEECQACAA4ARAADAAEECQADABwAUgADAAEECQAEABgALAADAAEECQAGABYAbkxXIFN5bnRoZXRpY1JlZ3VsYXJMVy1TeW50aGV0aWMtMUxXU3ludGhldGljAEwAVwAgAFMAeQBuAHQAaABlAHQAaQBjAFIAZQBnAHUAbABhAHIATABXAC0AUwB5AG4AdABoAGUAdABpAGMALQAxAEwAVwBTAHkAbgB0AGgAZQB0AGkAYwAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAMAAA==','base64');

test('observed official page CDN hosts are browser assets only; arbitrary and deceptive hosts remain denied',()=>{
 for(const host of ['lf-webcast-platform.bytetos.com','lf-c-flwb.bytetos.com','lf-cdn-tos.bytescm.com','lf-security.bytegoofy.com','lf3-webcast.bytetos.com','security.zijieapi.com','lf-ucenter-web.yhgfb-cn-static.com','lf-rc1.yhgfb-cn-static.com','lf-rc2.yhgfb-cn-static.com','vcs.zijieapi.com']){
  assert.doesNotThrow(()=>networkTarget('https://'+host+'/asset.css',{browserAsset:true}));
  assert.throws(()=>networkTarget('https://'+host+'/asset.css'),/NETWORK_TARGET_INVALID/);
  assert.throws(()=>networkTarget('wss://'+host+'/socket',{browserAsset:true}),/NETWORK_TARGET_INVALID/);
  assert.throws(()=>trustedUrl('https://'+host+'/asset.css'),/TARGET_INVALID/);
 }
 for(const host of ['unknown.bytetos.com','lf-webcast-platform.bytetos.com.evil.invalid','127.0.0.1'])assert.throws(()=>networkTarget('https://'+host+'/a.css',{browserAsset:true}),/NETWORK_TARGET_INVALID/);
});

test('login page renders CSS, JS, images and fonts while media and unsafe domains are denied; capture remains restrictive',async t=>{
 const sockets=new Set(),proxy=http.createServer((_req,res)=>{res.writeHead(403);res.end();});proxy.on('connect',(_req,socket)=>socket.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n'));proxy.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
 const bodies=new Map([
  ['/',{contentType:'text/html',body:'<link rel="stylesheet" href="https://lf-webcast-platform.bytetos.com/login.css"><script src="https://lf-webcast-platform.bytetos.com/login.js"></script><body><button id="login">登录</button><span>A</span><img src="https://p3.douyinpic.com/qr.png"><video autoplay src="/live.flv"></video><script>window.results={};Promise.all([["image","https://p3.douyinpic.com/qr.png"],["font","https://fonts.bytedance.com/login.woff2"],["media","https://live.douyin.com/live.flv"],["unsafe","https://untrusted.invalid/x.js?token=SYNTHETIC_LOGIN_LEAK"]].map(async ([key,url])=>{try{const r=await fetch(url);results[key]=r.ok}catch{results[key]=false}})).then(()=>window.requestsDone=true)</script></body>'}],
  ['/login.css',{contentType:'text/css',body:'#login{color:rgb(18,52,86);display:inline-flex;padding:12px}@font-face{font-family:login-fixture;src:url(https://fonts.bytedance.com/login.woff2)}body{font-family:login-fixture}'}],
  ['/login.js',{contentType:'text/javascript',body:'window.loginSdkLoaded=true'}],
  ['/qr.png',{contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><path d="M0 0h1v1H0z"/></svg>'}],
  ['/login.woff2',{contentType:'font/ttf',body:font}]
 ]);
 let deliveredMedia=0;const session=new LoginBrowserSession({launchBrowser:options=>chromium.launch({...options,headless:true}),prepareContext:async context=>{
  // Fulfill only after the production policy decision has accepted the request.
  await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname.endsWith('.flv'))deliveredMedia++;const value=bodies.get(u.pathname);if(value)return route.fulfill(value);return route.fulfill({body:''});});
 }});
 t.after(async()=>{await session.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>proxy.close(resolve));});
 await session.open({networkPolicy:{mode:'custom',proxyUrl:'http://127.0.0.1:'+proxy.address().port}});await session.page.waitForFunction(()=>window.requestsDone);assert.equal(await session.page.locator('#login').evaluate(e=>getComputedStyle(e).color),'rgb(18, 52, 86)');assert.equal(await session.page.evaluate(()=>window.loginSdkLoaded),true);
 const results=await session.page.evaluate(()=>window.results);assert.deepEqual(results,{image:true,font:true,media:false,unsafe:false});assert.equal(deliveredMedia,0);
 assert.equal(await session.page.evaluate(async()=>{await document.fonts.load('16px login-fixture','A');return document.fonts.check('16px login-fixture','A');}),true);
 assert.equal(await session.page.locator('img').evaluate(e=>e.naturalWidth),1);
 assert.deepEqual(await session.page.locator('video').evaluate(e=>({paused:e.paused,autoplay:e.autoplay})),{paused:true,autoplay:false});
 const report=session.diagnostics();for(const type of ['stylesheet','script','image','font'])assert.ok(report.resources.some(x=>x.resourceType===type&&x.outcome==='http-success'&&x.httpStatus===200));
 assert.ok(report.resources.some(x=>x.reasonCode==='LOGIN_MEDIA_BLOCKED'));assert.ok(report.resources.some(x=>x.reasonCode==='DOMAIN_POLICY_DENIED'));assert.equal(JSON.stringify(report).includes('SYNTHETIC_LOGIN_LEAK'),false);
 assert.equal(blockRequest('https://p3.douyinpic.com/qr.png','image'),true);assert.equal(blockRequest('https://fonts.bytedance.com/login.woff2','font'),true);assert.equal(blockRequest('https://live.douyin.com/live.flv','media'),true);
});

test('load diagnostics distinguish failures, omit URL and error contents, aggregate and stay bounded',()=>{
 const context=new EventEmitter(),notifications=[],diagnostics=new LoginLoadDiagnostics(context,entry=>notifications.push(entry));
 const req=(url,type='script',errorText='')=>({url:()=>url,resourceType:()=>type,failure:()=>({errorText})});
 const request=req('https://live.douyin.com/secret?token=SYNTHETIC_LOGIN_LEAK','script','net::ERR_TUNNEL_CONNECTION_FAILED');
 context.emit('requestfailed',request);context.emit('requestfailed',request);
 const privateUrl=new URL('https://SYNTHETIC-LOGIN-LEAK.douyinpic.com/path');privateUrl.searchParams.set('signature','SYNTHETIC_LOGIN_LEAK');
 const blocked=req(privateUrl.href,'image','net::ERR_BLOCKED_BY_CLIENT');diagnostics.blocked(blocked,'DOMAIN_POLICY_DENIED');context.emit('requestfailed',blocked);
 context.emit('response',{request:()=>request,status:()=>503});const page=new EventEmitter();context.emit('page',page);page.emit('pageerror',new Error('SYNTHETIC_LOGIN_LEAK'));page.emit('console',{type:()=> 'error',text:()=> 'SYNTHETIC_LOGIN_LEAK'});
 const report=diagnostics.snapshot();assert.equal(report.resources.find(x=>x.reasonCode==='PROXY_CONNECTION_FAILED').count,2);assert.equal(report.resources.filter(x=>x.reasonCode==='DOMAIN_POLICY_DENIED').length,1);assert.equal(report.resources.find(x=>x.httpStatus===503).reasonCode,'HTTP_ERROR');assert.equal(report.pageErrors,1);assert.equal(report.consoleErrors,1);
 assert.equal(notifications.filter(x=>x.reasonCode==='PROXY_CONNECTION_FAILED').length,1);assert.doesNotMatch(JSON.stringify(report)+JSON.stringify(notifications),/SYNTHETIC|secret|signature|token/);
 for(const [message,reason] of [['net::ERR_TIMED_OUT','NETWORK_TIMEOUT'],['net::ERR_CERT_AUTHORITY_INVALID','TLS_VALIDATION_FAILED'],['net::ERR_NAME_NOT_RESOLVED','DNS_RESOLUTION_FAILED'],['net::ERR_ABORTED','REQUEST_CANCELLED'],['SYNTHETIC_LOGIN_LEAK','NETWORK_REQUEST_FAILED']])assert.equal(requestFailureReason(message),reason);
 for(let status=400;status<500;status++)context.emit('response',{request:()=>request,status:()=>status});assert.equal(diagnostics.snapshot().resources.length,80);assert.ok(diagnostics.snapshot().overflow>0);diagnostics.close();const before=diagnostics.snapshot();context.emit('requestfailed',request);assert.deepEqual(diagnostics.snapshot(),before);
});

test('real Chromium requestfailed reports proxy and timeout separately from HTTP and script errors',async t=>{
 const sockets=new Set(),proxy=http.createServer();proxy.on('connect',(_req,socket)=>socket.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n'));proxy.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
 const session=new LoginBrowserSession({launchBrowser:options=>chromium.launch({...options,headless:true}),prepareContext:async context=>{
  await context.route('**/*',route=>{const path=new URL(route.request().url()).pathname;if(path==='/proxy-failure')return route.continue();if(path==='/timeout')return route.abort('timedout');if(path==='/http-failure')return route.fulfill({status:503,body:''});if(path==='/')return route.fulfill({contentType:'text/html',body:'<script>console.error("SYNTHETIC_LOGIN_LEAK");Promise.all(["/proxy-failure","/timeout","/http-failure"].map(url=>fetch(url).catch(()=>{}))).then(()=>window.done=true);setTimeout(()=>{throw new Error("SYNTHETIC_LOGIN_LEAK")},0)</script>'});return route.fulfill({contentType:'application/json',body:'{}'});});
 }});
 t.after(async()=>{await session.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>proxy.close(resolve));});await session.open({networkPolicy:{mode:'custom',proxyUrl:'http://127.0.0.1:'+proxy.address().port}});await session.page.waitForFunction(()=>window.done);await session.page.waitForTimeout(50);
 const report=session.diagnostics();for(const code of ['PROXY_CONNECTION_FAILED','NETWORK_TIMEOUT','HTTP_ERROR','PAGE_SCRIPT_EXCEPTION','BROWSER_CONSOLE_ERROR'])assert.ok(report.resources.some(x=>x.reasonCode===code),code);assert.doesNotMatch(JSON.stringify(report),/SYNTHETIC|proxy-failure|http-failure/);
});
