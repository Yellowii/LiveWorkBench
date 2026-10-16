// Synthetic official RAW, real Parser/storage/Gateway/GUI; simulated connection
// state only. Never connects to Douyin or touches existing instances.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';import {createGateway} from '../src/server.js';
const out=path.resolve('artifacts/session-scopes');await fs.mkdir(out,{recursive:true});
const app=await createGateway({dataDir:await fs.mkdtemp(path.join(out,'data-')),port:0}),browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
let epoch,seq=100;const profiles=new Map();app.monitor.adapter={probe:async()=>({state:'UNKNOWN',errorCode:'SYNTHETIC_NO_NETWORK'})};
async function activate(room){const p=profiles.get(room);app.sources.state.sourceEpoch=String(Number(app.sources.state.sourceEpoch)+1);epoch=app.sources.state.sourceEpoch;app.runtime.activeSourceEpoch=epoch;app.runtime.activeRoom=room;app.sources.web.status.captureState='CONNECTED';app.coordinator.state.active={profileId:p.profileId,roomId:room,anchorUid:'200',sourceType:'WebSource',sourceEpoch:epoch};}
async function ingest(room,text,method='ChatMessage',id){const t=app.runtime.parser.native.root.lookupType('webcast.im.'+method),bytes=t.encode(t.fromObject({common:{room_id:room,msg_id:id||String(++seq)},user:{nickname:'合成观众'},content:text,action:method==='ControlMessage'?3:undefined})).finish();await app.runtime.ingest({bytes,method:'Webcast'+method,format:'business-payload',recordingId:'synthetic-'+room+'-'+epoch,sourceType:'WebSource',sourceEpoch:epoch,anchorUid:'200',mode:'live'});}
try{
 await app.sources.action({action:'switch',sourceType:'WebSource',expectedVersion:app.sources.view().stateVersion});
 for(const room of ['100','200'])profiles.set(room,app.profiles.create({name:'合成房间'+room,target:{type:'roomId',value:room},enabled:true}));
 await activate('200');await ingest('200','乙房第一场','ChatMessage','777');const oldB=app.runtime.sessions.find('200').sessionId;
 await activate('100');await ingest('100','甲房内容');
 await page.goto(app.url);await page.locator('[data-page=messages]').click();await page.waitForFunction(()=>document.querySelector('#mvRows').textContent.includes('甲房内容'));assert.doesNotMatch(await page.locator('#mvRows').textContent(),/乙房/);
 // Delay an old room response while the active capture changes underneath it.
 let release;const gate=new Promise(r=>release=r);let delayed;const observed=new Promise(r=>delayed=r);let blocked=false;
 await page.route('**/api/v1/local/messages?**',async route=>{if(!blocked&&new URL(route.request().url()).searchParams.get('roomId')==='100'){blocked=true;delayed();await gate;}await route.continue();});
 await observed;await activate('200');await ingest('200','乙房新增');await page.waitForFunction(()=>document.querySelector('#mvRows').textContent.includes('乙房新增'));release();await page.waitForTimeout(200);assert.doesNotMatch(await page.locator('#mvRows').textContent(),/甲房/);
 await page.locator('.mv-row').last().click();await page.getByRole('button',{name:'RAW / 处理链',exact:true}).click();assert.match(await page.locator('#mvRaw').textContent(),/protoId/);
 await ingest('200','','ControlMessage');await page.waitForFunction(()=>document.querySelector('#mvScopeStatus').textContent.includes('已下播'));assert.equal(app.sources.view().captureState,'STOPPED');assert.equal(app.runtime.sessions.find('200').archiveState,'COMPLETE');assert.equal(await page.locator('.mv-row').count(),0);assert.equal(await page.locator('.stage-card').count(),0);
 await page.screenshot({path:path.join(out,'ended-archived.png'),fullPage:true});
 await page.locator('#mvScopeMode').selectOption('history');await page.locator('#mvSession').selectOption(JSON.stringify(['live','live','200',oldB]));await page.waitForFunction(()=>document.querySelector('#mvRows').textContent.includes('乙房第一场'));assert.doesNotMatch(await page.locator('#mvRows').textContent(),/甲房/);
 const transition=new Date().toISOString();const e={roomId:'200',anchorUid:'200',confirmedState:'LIVE',queryState:'LIVE',checkedAt:transition,lastTransitionAt:transition,stateVersion:'3',evidence:{source:'douyin-structured-room'}};
 const next=app.runtime.sessions.beginConfirmed(e);assert.notEqual(next.sessionId,oldB);await activate('200');await ingest('200','乙房第二场','ChatMessage','777');
 await page.locator('#mvScopeMode').selectOption('current');await page.waitForFunction(()=>document.querySelector('#mvRows').textContent.includes('乙房第二场'));assert.doesNotMatch(await page.locator('#mvRows').textContent(),/第一场|甲房/);
 assert.equal(app.runtime.store.events({roomId:'200',sessionId:next.sessionId}).items.length,1,'same msgId in confirmed new generation is not deduplicated against old session');
 for(const width of [1440,480]){await page.setViewportSize({width,height:1000});await page.screenshot({path:path.join(out,'new-session-'+width+'.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
 assert.deepEqual(errors,[]);assert.equal(app.runtime.metrics.failed,0);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({synthetic:true,raw:app.runtime.store.countRaw(),events:app.runtime.store.countEvents(),parseFailures:app.runtime.metrics.failed,checks:['two rooms separated','late response rejected','scoped RAW detail','Control action3 stops matching source despite autoStop false','ended archive and empty current','explicit history','new generation same room/msgId','480/1440 GUI'],errors},null,2));console.log('SESSION_SCOPES_GUI_PASS');
}finally{await browser.close();await app.close();}
