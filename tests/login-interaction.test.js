import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {chromium} from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {LoginBrowserSession} from '../src/auth/login-browser-session.js';
import {LoginManager} from '../src/auth/login-manager.js';
import {AuthProfileStore} from '../src/auth/auth-profile-store.js';
import {LoginVault} from '../src/auth/login-vault.js';
import {Runtime} from '../src/runtime.js';
import {LoginAccountEvidence} from '../src/auth/login-account-evidence.js';
import {normalizeAccount} from '../src/parser/browser-vendor/account.js';
const until=async fn=>{const deadline=Date.now()+12000;while(!await fn()){if(Date.now()>deadline)throw new Error('TEST_TIMEOUT');await new Promise(resolve=>setTimeout(resolve,25));}};
const snapshot={cookies:[{name:'synthetic_session',value:'SYNTHETIC_INTERACTION_VALUE',domain:'.douyin.com',path:'/',expires:-1,httpOnly:true,secure:true,sameSite:'Lax'}],origins:[]};

test('a failed concurrent probe cannot suppress a successful official authentication response',async()=>{
 const evidence=new LoginAccountEvidence(new EventEmitter(),normalizeAccount);let release;
 const pending=evidence.observe({url:()=> 'https://www.douyin.com/aweme/v1/web/user/profile/self/',status:()=>200,text:()=>new Promise(resolve=>release=resolve)});
 await evidence.observe({url:()=> 'https://live.douyin.com/webcast/user/me/',status:()=>200,text:async()=>'<html>synthetic unsupported response</html>'});release(JSON.stringify({status_code:0,user:{uid:'900'}}));await pending;assert.equal(evidence.last.state,'AUTHENTICATED');
 await evidence.observe({url:()=> 'https://live.douyin.com/webcast/user/me/',status:()=>503});assert.equal(evidence.last.state,'AUTHENTICATED');assert.equal(evidence.snapshot().httpFailures,1);evidence.close();
});

test('same-page interaction requires successful official self HTTP evidence before snapshot/save/close',async t=>{
 const sockets=new Set(),proxy=http.createServer();proxy.on('connect',(_req,socket)=>socket.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n'));proxy.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
 let status=500;const events=[],session=new LoginBrowserSession({launchBrowser:options=>chromium.launch({...options,headless:true}),prepareContext:async context=>{await context.addCookies(snapshot.cookies);await context.route('**/*',route=>{if(new URL(route.request().url()).pathname==='/webcast/user/me/')return route.fulfill({status,contentType:'application/json',body:JSON.stringify({status_code:0,data:{id_str:'900'}})});return route.fulfill({contentType:'text/html',body:'<button onclick="fetch(\'/webcast/user/me/\').then(()=>document.body.dataset.feedback=\'yes\')">confirm</button>'});});}});session.on('status',state=>events.push(state));t.after(async()=>{await session.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>proxy.close(resolve));});
 await session.open({networkPolicy:{mode:'custom',proxyUrl:'http://127.0.0.1:'+proxy.address().port}});await session.page.getByRole('button').click();await session.page.waitForFunction(()=>document.body.dataset.feedback==='yes');await session.page.waitForTimeout(100);
 assert.equal(events.some(x=>x.state==='AUTHENTICATED'),false,'HTTP500 cannot establish official authentication');assert.equal(session.browser.isConnected(),true);
 status=200;await session.page.getByRole('button').click();await until(()=>events.some(x=>x.state==='AUTHENTICATED'));assert.equal(session.page.url(),'https://live.douyin.com/');assert.equal((await session.context.storageState()).cookies[0].value,'SYNTHETIC_INTERACTION_VALUE');assert.ok(session.diagnostics().authentication.httpFailures>=1);assert.ok(session.diagnostics().authentication.confirmed>=1);
});

test('DPAPI readback failure keeps the login window available and cannot report remembered success',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-login-proof-')),runtime=await Runtime.open({dataDir:dir}),accounts=new AuthProfileStore(runtime.store),vault=new LoginVault(dir);let closed=false;
 class Fixture extends EventEmitter{async open(){this.context={storageState:async()=>snapshot};}async close(){closed=true;}confirm(){this.emit('status',{state:'AUTHENTICATED',source:'official-self-api',checkedAt:new Date().toISOString()});}}
 const manager=new LoginManager({accounts,vault,clientFactory:()=>new Fixture()});t.after(async()=>{await manager.close();await runtime.close();await fs.rm(dir,{recursive:true,force:true});});const p=accounts.create({rememberLogin:true});const load=vault.load.bind(vault);await manager.login(p.authProfileId);vault.load=async()=>null;manager.active.client.confirm();await until(async()=>!manager.active||(await manager.view(p.authProfileId)).login.state==='ERROR');assert.equal(closed,false);assert.equal((await manager.view(p.authProfileId)).login.reasonCode,'AUTH_SAVE_VERIFY_FAILED');vault.load=load;
});

test('waiting timeout notifies without closing an unfinished interactive login',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-login-wait-')),runtime=await Runtime.open({dataDir:dir}),accounts=new AuthProfileStore(runtime.store);let closed=false;
 class Fixture extends EventEmitter{async open(){}async close(){closed=true;}}
 const manager=new LoginManager({accounts,vault:new LoginVault(dir),waitingTimeoutMs:30,clientFactory:()=>new Fixture()});t.after(async()=>{await manager.close();await runtime.close();await fs.rm(dir,{recursive:true,force:true});});const p=accounts.create({rememberLogin:false});await manager.login(p.authProfileId);await until(async()=>(await manager.view(p.authProfileId)).login.reasonCode==='AUTH_LOGIN_STILL_WAITING');assert.equal(closed,false);assert.ok(manager.active);
});

test('official SDK self builder supplies network evidence when the primary query is unavailable',async t=>{
 const proxy=http.createServer(),sockets=new Set();proxy.on('connect',(_req,socket)=>socket.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n'));proxy.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
 const session=new LoginBrowserSession({launchBrowser:options=>chromium.launch({...options,headless:true}),prepareContext:async context=>{await context.route('**/*',route=>{if(new URL(route.request().url()).pathname.endsWith('/profile/self/'))return route.fulfill({contentType:'application/json',body:JSON.stringify({status_code:8})});return route.fulfill({contentType:'text/html',body:`<script>const getSelf=()=>fetch("/aweme/v1/web/user/profile/self/").then(r=>r.json());window.webpackChunkdouyin_live_v2=[[[],{self:function(){return "/aweme/v1/web/user/profile/self/"}}]];window.webpackChunkdouyin_live_v2.push=function(entry){Array.prototype.push.call(this,entry);entry[2](()=>({getSelf}));};</script>`});});}});const states=[];session.on('status',status=>states.push(status));t.after(async()=>{await session.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>proxy.close(resolve));});await session.open({networkPolicy:{mode:'custom',proxyUrl:'http://127.0.0.1:'+proxy.address().port}});await until(()=>states.some(x=>x.state==='ANONYMOUS'));assert.equal(session.diagnostics().authentication.anonymous,1);assert.equal(states.some(x=>x.state==='AUTHENTICATED'),false);
});
