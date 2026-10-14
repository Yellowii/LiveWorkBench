// Isolated synthetic GUI + loopback WSS, using live domain only in this temporary repository.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {WebSocketServer} from 'ws';
import {createGateway} from '../src/server.js';
import {WebSource} from '../src/web-source.js';
import {WebConnectionResolver} from '../src/capture/websource/connection-resolver.js';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-handoff-gui-')),output=path.resolve('artifacts/room-handoff');await fs.mkdir(output,{recursive:true});
const app=await createGateway({dataDir:dir,port:0}),r=app.runtime;
const wss=new WebSocketServer({host:'127.0.0.1',port:0});await new Promise(resolve=>wss.once('listening',resolve));
let maxPeers=0,sequence=0;const encode=(name,value)=>{const t=r.parser.native.root.lookupType('webcast.im.'+name);return t.encode(t.fromObject(value)).finish();};
wss.on('connection',(ws,req)=>{maxPeers=Math.max(maxPeers,wss.clients.size);const roomId=new URL(req.url,'http://localhost').searchParams.get('room_id'),id=String(++sequence);ws.send(encode('PushFrame',{payload:encode('Response',{messages:[{method:'WebcastChatMessage',payload:encode('ChatMessage',{common:{room_id:roomId,msg_id:id},content:'synthetic room '+roomId}),msg_id:id}]})}));});
const localRuntime=new Proxy(r,{get(target,key){if(key==='ingest')return input=>target.ingest({...input,mode:'live',runtimeNamespace:'live'});const v=Reflect.get(target,key);return typeof v==='function'?v.bind(target):v;}});
app.sources.web=new WebSource(localRuntime,{allowLocalTest:true,mode:'test'});
const identity=p=>({roomId:p.target.value==='123'?'100':'101',anchorUid:'200',web_rid:p.target.value,checkedAt:new Date().toISOString()});
app.sources.connectionResolver=new WebConnectionResolver({allowLocalTest:true,mode:'test',directProvider:async(p,e)=>({...e,url:'ws://127.0.0.1:'+wss.address().port+'/?room_id='+e.roomId,expiresAt:Date.now()+60000})});
app.sources.resolveProfile=async p=>identity(p);app.monitor.adapter={probe:async p=>({...identity(p),state:'LIVE',source:'synthetic'})};
const a=app.profiles.create({name:'synthetic A',target:{type:'web_rid',value:'123'},enabled:true,confirmations:1}),b=app.profiles.create({name:'synthetic B',target:{type:'web_rid',value:'124'},enabled:true,confirmations:1});
const old=r.sessions.observe({roomId:'100',anchorUid:'200',live:true});r.activeRoom='100';r.interruptCapture();
const browser=await chromium.launch({executablePath:process.env.LW_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),page=await browser.newPage({viewport:{width:1365,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
const wait=async check=>{const deadline=Date.now()+8000;while(!check()){if(Date.now()>deadline)throw Error('HANDOFF_TIMEOUT');await new Promise(resolve=>setTimeout(resolve,20));}};
try{
 await page.goto(app.url);await page.locator('#dashboardProfile').selectOption(b.profileId);await page.locator('#profileStart').click();await page.waitForFunction(()=>document.querySelector('#coordinateSummary').textContent.includes('监听已开始'));await wait(()=>r.store.countEvents()===1);assert.equal(r.store.events().items[0].roomId,'101');assert.equal(r.sessions.find('100').sessionId,old.sessionId);assert.equal(r.sessions.find('100').sessionState,'LIVE');
 await page.locator('#dashboardProfile').selectOption(a.profileId);page.once('dialog',dialog=>dialog.accept());await page.locator('#profileStart').click();await wait(()=>r.store.countEvents()===2);assert.equal(r.store.events().items[0].roomId,'100');assert.equal(r.sessions.find('100').sessionId,old.sessionId);assert.equal(maxPeers,1);
 await page.locator('#profileStop').click();await page.waitForFunction(()=>document.querySelector('#coordinateSummary').textContent.includes('已停止'));await page.locator('#dashboardProfile').selectOption(b.profileId);await page.locator('#profileStart').click();await wait(()=>r.store.countEvents()===3);assert.equal(r.store.countRaw(),3);assert.equal(r.store.events().items[0].roomId,'101');assert.equal(maxPeers,1);
 await page.locator('[data-page="messages"]').click();await page.waitForFunction(()=>document.querySelector('#mvRows').textContent.includes('synthetic room 101'));await page.screenshot({path:path.join(output,'two-rooms.png'),fullPage:true});
 await page.route('**/api/v1/coordinator',async route=>{const response=await route.fetch(),json=await response.json();json.data.reason='SOURCE_ROOM_BUSY';await route.fulfill({response,json});});await page.reload();await page.waitForFunction(()=>document.querySelector('#coordinateSummary').textContent.includes('SOURCE_ROOM_BUSY'));assert.match(await page.locator('#coordinateSummary').textContent(),/旧直播间/);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({synthetic:true,distinctRooms:2,events:r.store.countEvents(),raw:r.store.countRaw(),maximumPeers:maxPeers,oldSessionPreserved:true,stoppedAndConfirmedSwitch:true,errorVisible:true,browserErrors:errors.length,productionTouched:false}));
}finally{await browser.close();await app.close();for(const ws of wss.clients)ws.terminate();await new Promise(resolve=>wss.close(resolve));await fs.rm(dir,{recursive:true,force:true});}
