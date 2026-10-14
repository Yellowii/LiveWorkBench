import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {createGateway} from '../src/server.js';
import {Runtime} from '../src/runtime.js';
import {LoginVault} from '../src/auth/login-vault.js';
import {WebSocketServer} from 'ws';
import {WebSource} from '../src/web-source.js';
import {WebConnectionResolver} from '../src/capture/websource/connection-resolver.js';
import {LoginBrowserSession} from '../src/auth/login-browser-session.js';
import {chromium} from 'playwright-core';
import http from 'node:http';
let AuthProfileStore,LoginManager;
try{({AuthProfileStore}=await import('../src/auth/auth-profile-store.js'));({LoginManager}=await import('../src/auth/login-manager.js'));}catch{}
const snapshot={cookies:[{name:'synthetic_session',value:'SYNTHETIC_AUTH_SESSION_VALUE',domain:'.douyin.com',path:'/',expires:-1,httpOnly:true,secure:true,sameSite:'Lax'}],origins:[]};
class LoginFixture extends EventEmitter{
 async open(){this.context={storageState:async()=>structuredClone(snapshot)};}
 async check(){return {state:'UNKNOWN'};}
 async close(){this.emit('closed');}
 confirm(source='official-self-api'){this.emit('status',{state:'AUTHENTICATED',source,checkedAt:new Date().toISOString()});}
}
const until=async fn=>{const deadline=Date.now()+10000;while(!await fn()){if(Date.now()>deadline)throw new Error('TEST_TIMEOUT');await new Promise(resolve=>setTimeout(resolve,20));}};
test('watching login works without rooms or source selection, autosaves only official evidence and restores across rooms',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-independent-accounts-'));let app=await createGateway({dataDir:dir,port:0});t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
 assert.ok(app.loginManager,'independent account manager required');app.loginManager.clientFactory=()=>new LoginFixture();
 let cookie=(await fetch(app.url)).headers.get('set-cookie').split(';')[0];const post=async(p,body)=>{const res=await fetch(app.url+'/api/v1/'+p,{method:'POST',headers:{Cookie:cookie,Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({commandId:crypto.randomUUID(),...body})});return {status:res.status,...await res.json()};};
 const opened=await post('viewer/actions',{action:'login',expectedVersion:(await app.viewer.get()).version});assert.equal(opened.status,200);const id=app.accounts.all()[0].authProfileId;assert.equal(app.profiles.all().length,0);assert.equal(app.sources.view().selectedSource,'LiveHookSource');assert.equal(app.sources.view().captureState,'STOPPED');
 const repeat=await post('viewer/actions',{action:'login',expectedVersion:(await app.viewer.get()).version});assert.equal(repeat.status,409);assert.equal(app.accounts.all().length,1);assert.ok(repeat.error.nextAction.includes('当前登录窗口'));
 app.loginManager.active.client.confirm('unverified');await new Promise(resolve=>setTimeout(resolve,50));assert.equal((await app.loginManager.view(id)).configured,false);
 app.loginManager.active.client.confirm();await until(async()=>!(app.loginManager.active)&&(await app.loginManager.view(id)).configured);assert.equal((await app.loginManager.view(id)).login.state,'AUTHENTICATED');
 const bytes=await fs.readFile(app.loginManager.vault.file(id));assert.ok(!bytes.includes(Buffer.from('SYNTHETIC_AUTH_SESSION_VALUE')));
 const one=await post('profiles',{profile:{target:{type:'web_rid',value:'123'}}}),two=await post('profiles',{profile:{target:{type:'web_rid',value:'124'},authProfileId:id}});assert.equal(one.data.authProfileId,null);assert.equal(two.data.authProfileId,null);assert.equal((await app.loginManager.view(id)).boundProfileIds.length,0);
 const response=await (await fetch(app.url+'/api/v1/accounts',{headers:{Cookie:cookie}})).json();assert.ok(!JSON.stringify(response).includes('SYNTHETIC_AUTH_SESSION_VALUE'));assert.equal(app.runtime.store.sessions().length,0);
 await app.close();app=await createGateway({dataDir:dir,port:0});cookie=(await fetch(app.url)).headers.get('set-cookie').split(';')[0];assert.equal((await app.loginManager.view(id)).login.state,'UNKNOWN');
 for(const p of app.profiles.all())assert.equal((await app.loginManager.credentialsFor(p)).storageState.cookies[0].value,'SYNTHETIC_AUTH_SESSION_VALUE');
 const stale=await post('viewer/actions',{action:'logout',expectedVersion:'99'});assert.equal(stale.error.code,'STATE_CONFLICT');assert.equal((await app.loginManager.view(id)).configured,true);
});
test('empty authenticated snapshot cannot replace prior credentials or report a remembered login',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-account-empty-')),runtime=await Runtime.open({dataDir:dir}),accounts=new AuthProfileStore(runtime.store),vault=new LoginVault(dir),manager=new LoginManager({accounts,vault,clientFactory:()=>new LoginFixture()});t.after(async()=>{await manager.close();await runtime.close();await fs.rm(dir,{recursive:true,force:true});});
 const p=accounts.create({rememberLogin:true});await vault.save(p.authProfileId,snapshot,true);const before=await fs.readFile(vault.file(p.authProfileId));await manager.login(p.authProfileId);manager.active.client.context.storageState=async()=>({cookies:[],origins:[]});manager.active.client.confirm();await until(async()=>!manager.active||(await manager.view(p.authProfileId)).login.state==='ERROR');assert.equal((await manager.view(p.authProfileId)).login.state,'ERROR');assert.deepEqual(await fs.readFile(vault.file(p.authProfileId)),before);
});
test('independent login and credential clear leave an actual active WSS capture connected',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-account-live-')),app=await createGateway({dataDir:dir,port:0}),wss=new WebSocketServer({host:'127.0.0.1',port:0});await new Promise(resolve=>wss.once('listening',resolve));let peer;wss.on('connection',ws=>{peer=ws;});
 app.sources.web=new WebSource(app.runtime,{allowLocalTest:true,mode:'test'});app.sources.state.selectedSource='WebSource';app.sources.save();app.loginManager.clientFactory=()=>new LoginFixture();t.after(async()=>{await app.close();for(const ws of wss.clients)ws.terminate();await new Promise(resolve=>wss.close(resolve));await fs.rm(dir,{recursive:true,force:true});});
 await app.sources.web.start({url:'ws://127.0.0.1:'+wss.address().port});await until(()=>app.sources.web.status.captureState==='CONNECTED');const account=app.accounts.create({rememberLogin:true});await app.loginManager.login(account.authProfileId);app.loginManager.active.client.confirm();await until(()=>!app.loginManager.active);await app.loginManager.clear(account.authProfileId,'1');assert.equal(app.sources.web.status.captureState,'CONNECTED');assert.equal(peer.readyState,1);
 const type=app.runtime.parser.native.root.lookupType('webcast.im.PushFrame'),packet=type.encode(type.fromObject({payload_type:'hb'})).finish();peer.send(packet);await until(()=>app.runtime.store.countRaw()===1);assert.equal(app.runtime.store.sessions().length,0);
});
test('one explicit listen intent selects its configured idle source and confirms before capture; background monitoring still cannot switch',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-room-intent-')),app=await createGateway({dataDir:dir,port:0}),wss=new WebSocketServer({host:'127.0.0.1',port:0});await new Promise(resolve=>wss.once('listening',resolve));t.after(async()=>{await app.close();for(const peer of wss.clients)peer.terminate();await new Promise(resolve=>wss.close(resolve));await fs.rm(dir,{recursive:true,force:true});});
 app.sources.web=new WebSource(app.runtime,{allowLocalTest:true,mode:'test'});app.sources.connectionResolver=new WebConnectionResolver({allowLocalTest:true,mode:'test',directProvider:async()=>({url:'ws://127.0.0.1:'+wss.address().port+'/?room_id=100',expiresAt:Date.now()+30000,roomId:'100',anchorUid:'200'})});app.sources.resolveProfile=async()=>({roomId:'100',anchorUid:'200',web_rid:'123',checkedAt:new Date().toISOString(),parameterDiscovery:'http'});app.monitor.adapter={probe:async()=>({state:'LIVE',roomId:'100',anchorUid:'200',web_rid:'123',source:'synthetic'})};
 const profile=app.profiles.create({enabled:true,target:{type:'web_rid',value:'123'}});await app.monitor.check(profile.profileId);await app.monitor.check(profile.profileId);await app.coordinator.evaluate();assert.equal(app.sources.view().selectedSource,'LiveHookSource');
 const cookie=(await fetch(app.url)).headers.get('set-cookie').split(';')[0],response=await fetch(app.url+'/api/v1/profiles/'+profile.profileId+'/actions',{method:'POST',headers:{Cookie:cookie,Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({commandId:crypto.randomUUID(),action:'listen',expectedVersion:'1'})});assert.equal(response.status,200);assert.equal(app.sources.view().selectedSource,'WebSource');await until(()=>app.sources.web.status.captureState==='CONNECTED');assert.equal(wss.clients.size,1);
});
test('real isolated Chromium official-self fixture confirms, autosaves and closes its own browser without a room',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-account-browser-')),runtime=await Runtime.open({dataDir:dir}),accounts=new AuthProfileStore(runtime.store),vault=new LoginVault(dir);const sockets=new Set(),proxy=http.createServer((_req,res)=>{res.writeHead(403);res.end();});proxy.on('connect',(_req,socket)=>socket.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n'));proxy.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));let session;
 const manager=new LoginManager({accounts,vault,clientFactory:()=>session=new LoginBrowserSession({launchBrowser:options=>chromium.launch({...options,headless:true}),prepareContext:async context=>{await context.addCookies(snapshot.cookies);await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.pathname==='/webcast/user/me/')return route.fulfill({contentType:'application/json',body:JSON.stringify({status_code:0,data:{id_str:'900'}})});return route.fulfill({contentType:'text/html',body:'<script>fetch("/webcast/user/me/")</script>'});});}})});
 t.after(async()=>{await manager.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>proxy.close(resolve));await runtime.close();await fs.rm(dir,{recursive:true,force:true});});const p=accounts.create({rememberLogin:true,networkPolicy:{mode:'custom',proxyUrl:'http://127.0.0.1:'+proxy.address().port}});await manager.login(p.authProfileId);await until(async()=>!manager.active&&(await manager.view(p.authProfileId)).configured);assert.equal((await manager.view(p.authProfileId)).login.source,'official-self-api');assert.equal(session.browser.isConnected(),false);assert.equal((await vault.load(p.authProfileId)).cookies[0].value,'SYNTHETIC_AUTH_SESSION_VALUE');assert.equal(runtime.store.countRaw(),0);
});
test('opt-out remains memory-only; cancellation and late confirmation preserve previous vault bytes',async t=>{
 assert.ok(LoginManager,'login lifecycle required');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-account-cancel-')),runtime=await Runtime.open({dataDir:dir}),accounts=new AuthProfileStore(runtime.store),vault=new LoginVault(dir),manager=new LoginManager({accounts,vault,clientFactory:()=>new LoginFixture()});t.after(async()=>{await manager.close();await runtime.close();await fs.rm(dir,{recursive:true,force:true});});
 const account=accounts.create({name:'temporary account',rememberLogin:false});await manager.login(account.authProfileId);manager.active.client.confirm();await until(()=>!manager.active);assert.equal((await manager.view(account.authProfileId)).configured,false);assert.equal((await manager.credentialsFor({authProfileId:account.authProfileId})).storageState.cookies.length,1);await assert.rejects(()=>fs.access(vault.file(account.authProfileId)));
 await vault.save(account.authProfileId,snapshot,true);const before=await fs.readFile(vault.file(account.authProfileId));await manager.login(account.authProfileId);const cancelled=manager.active.client;await manager.cancel(account.authProfileId);cancelled.confirm();await new Promise(resolve=>setTimeout(resolve,50));assert.deepEqual(await fs.readFile(vault.file(account.authProfileId)),before);assert.equal(manager.active,null);
 await manager.close();await assert.rejects(()=>manager.createAndLogin({name:'late login'}),/AUTH_MANAGER_CLOSED/);assert.equal(accounts.all().length,1);
});
