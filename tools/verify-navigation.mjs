// Isolated GUI regression. No production services, accounts, RAW or platform requests.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright-core';
import {WebSocketServer} from 'ws';
import {createGateway} from '../src/server.js';
import {WebSource} from '../src/web-source.js';
import {WebConnectionResolver} from '../src/capture/websource/connection-resolver.js';

const phase=process.argv[2]||'after',after=phase==='after';
assert.ok(['before','after'].includes(phase));
const output=path.resolve('artifacts/navigation',phase),dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-navigation-'));
let evidenceOwned=false;
const evidence=path.resolve('docs/migration/evidence/M0-R01-audit.json');
// runHistorical has a fixed evidence path. Never replace a user's private Golden list.
await fs.access(evidence).then(()=>{throw new Error('EXISTING_GOLDEN_LIST_REFUSED_USE_ISOLATED_WORKTREE');},e=>{if(e.code!=='ENOENT')throw e;});
await fs.mkdir(path.dirname(evidence),{recursive:true});await fs.mkdir(output,{recursive:true});
const app=await createGateway({dataDir:path.join(dir,'runtime'),port:0,settings:{r01Root:path.join(dir,'golden')}});
const wss=new WebSocketServer({host:'127.0.0.1',port:0});await new Promise(resolve=>wss.once('listening',resolve));
const browser=await chromium.launch({executablePath:process.env.LW_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({viewport:{width:1365,height:1000}}),errors=[],commands=[],checks=[];
const layoutFindings=[];
const socketErrors=[];
page.on('websocket',socket=>socket.on('socketerror',error=>socketErrors.push(String(error))));
const upgradeChecks=[];
app.server.on('upgrade',req=>upgradeChecks.push({pathMatches:req.url==='/api/v1/ws',originMatches:req.headers.origin===app.url,hasSession:/(?:^|;\s*)lw_session=/.test(req.headers.cookie||'')}));
page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
if(!after){
 // Serve only the original three assets over real HTTP. Keep API/WS handlers intact.
 const assets=new Map(),handler=app.server.listeners('request')[0];
 for(const [url,file]of [['/','index.html'],['/app.js','app.js'],['/app.css','app.css']]){
  const body=execFileSync('git',['show',`1473ba35bc0966ca836d2b12fd56b14b86dfd45d:public/${file}`],{encoding:'utf8',windowsHide:true});
  const response=await fetch(app.url+url),headers={};
  for(const name of ['content-type','content-security-policy','cache-control','set-cookie'])if(response.headers.has(name))headers[name]=response.headers.get(name);
  await response.arrayBuffer();assets.set(url,{body,headers});
 }
 app.server.removeListener('request',handler);app.server.on('request',(req,res)=>{const asset=req.method==='GET'&&assets.get(req.url);if(!asset)return handler(req,res);res.writeHead(200,asset.headers);res.end(asset.body);});
}
page.on('request',r=>{if(r.method()==='POST')commands.push({route:new URL(r.url()).pathname,body:r.postDataJSON()});});
const encode=(name,value)=>{const type=app.runtime.parser.native.root.lookupType('webcast.im.'+name);return type.encode(type.fromObject(value)).finish();};
let initialButtonCount=0;
const sha=value=>createHash('sha256').update(value).digest('hex');
class LoginFixture extends EventEmitter{
 diagnostics(){return {authentication:{state:'AUTHENTICATED'},resources:[]};}
 async open(){this.context={storageState:async()=>({cookies:[{name:'synthetic',value:'SYNTHETIC_NAVIGATION_ONLY',domain:'.douyin.com',path:'/',expires:-1,httpOnly:true,secure:true,sameSite:'Lax'}],origins:[]})};}
 async check(){} async close(){}
 confirm(){this.emit('status',{state:'AUTHENTICATED',source:'official-self-api',checkedAt:new Date().toISOString()});}
}
app.loginManager.clientFactory=()=>new LoginFixture();
app.sources.web=new WebSource(app.runtime,{allowLocalTest:true,mode:'test'});
app.sources.connectionResolver=new WebConnectionResolver({allowLocalTest:true,mode:'test',directProvider:async()=>({url:`ws://127.0.0.1:${wss.address().port}/?room_id=100`,roomId:'100',anchorUid:'200',expiresAt:Date.now()+60000})});
app.sources.resolveProfile=async()=>({roomId:'100',anchorUid:'200',web_rid:'123',checkedAt:new Date().toISOString(),parameterDiscovery:'http'});
app.monitor.adapter={resolver:{resolve:async()=>({classification:'synthetic',roomId:'100',anchorUid:'200',web_rid:'123'})},probe:async()=>({state:'LIVE',roomId:'100',anchorUid:'200',web_rid:'123',source:'synthetic',network:{mode:'direct',route:'direct',dns:'verified-and-pinned-public',connectionState:'connected'}})};
let peers=0;
wss.on('connection',ws=>{peers++;ws.send(encode('PushFrame',{payload:encode('Response',{messages:[{method:'WebcastChatMessage',payload:encode('ChatMessage',{common:{room_id:'100',msg_id:'9001'},content:'synthetic navigation capture'}),msg_id:'9001'}]})}));});
async function go(name){if(after)await page.locator(`[data-page="${name}"]`).click();}
async function openDetails(id){if(after&&!await page.locator(`#${id}`).evaluate(el=>el.open))await page.locator(`#${id}>summary`).click();}
async function jsonAt(id,predicate){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const value=JSON.parse(await page.locator('#'+id).textContent());if(predicate(value))return value;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('GUI_JSON_TIMEOUT:'+id);}
async function screenshot(name){const top=await page.evaluate(()=>scrollY);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});await page.evaluate(y=>window.scrollTo(0,y),top);}
async function safeLayout(name){
 const problems=await page.evaluate(()=>{
  const visible=el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
  const controls=[...document.querySelectorAll('button,input,select,summary')].filter(visible),issues=[];
  for(const el of controls){const r=el.getBoundingClientRect();if(r.width<8||r.left<0||r.right>innerWidth+1)issues.push('overflow:'+el.id);}
  const buttons=controls.filter(el=>el.tagName==='BUTTON');
  for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){const a=buttons[i].getBoundingClientRect(),b=buttons[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)issues.push('overlap:'+buttons[i].id+':'+buttons[j].id);}
  return issues;
 });if(after)assert.deepEqual(problems,[],name);else layoutFindings.push(...problems.map(problem=>name+': '+problem));
 const controls=page.locator('button:visible:not(:disabled),summary:visible');
 for(let n=0;n<await controls.count();n++){
  const control=controls.nth(n);await control.scrollIntoViewIfNeeded();
  const clear=await control.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return hit===el||el.contains(hit);});
  if(after)assert.equal(clear,true,`${name}: control covered ${await control.textContent()}`);
  else if(!clear){layoutFindings.push(`${name}: control covered ${await control.textContent()}`);await control.evaluate(el=>el.scrollIntoView({block:'center'}));}
 }
 await screenshot(name);
}
try{
 const golden=[],index=[];await fs.mkdir(path.join(dir,'golden'));
 for(let n=1;n<=59;n++){const bytes=encode('ChatMessage',{common:{room_id:'100',msg_id:String(n)},content:'synthetic golden '+n}),file=n+'.bin',result=app.runtime.parser.decode({format:'business-payload',method:'WebcastChatMessage',bytes})[0];await fs.writeFile(path.join(dir,'golden',file),bytes);index.push(JSON.stringify({seq:n,file,method:'WebcastChatMessage',msg_id:String(n)}));golden.push({seq:n,rawSha256:sha(bytes),officialStatus:result.status,officialResultHash:sha(JSON.stringify(result.data??null))});}
 await fs.writeFile(path.join(dir,'golden/raw_proto_index.jsonl'),index.join('\n'));await fs.writeFile(evidence,JSON.stringify({golden}),{flag:'wx'});evidenceOwned=true;
 await page.goto(app.url);await page.waitForFunction(()=>document.getElementById('connection').textContent==='实时增量已连接');
 await screenshot('initial');
 initialButtonCount=await page.locator('button:visible').count();
 if(after){assert.equal(await page.locator('[data-page]').count(),5);assert.equal(await page.locator('#profileStart').isVisible(),true);assert.equal(await page.locator('#captureStart').isVisible(),false);assert.equal(await page.locator('#accountLogin').isVisible(),false);}
 await go('accounts');await page.locator('#accountLogin').click();await page.waitForFunction(()=>document.getElementById('accountSummary').textContent.includes('扫码'));app.loginManager.active.client.confirm();await page.waitForFunction(()=>document.getElementById('accountSummary').textContent.includes('已登录'));assert.equal((await app.loginManager.list()).items[0].configured,true);
 await openDetails('accountAdvanced');await page.locator('#accountReload').click();
 const account=app.accounts.all()[0];
 if(after){let dialogs=0;page.once('dialog',async d=>{dialogs++;assert.match(d.message(),/观看账号/);await d.dismiss();});await page.locator('#accountClear').click();assert.equal(dialogs,1);assert.equal((await app.loginManager.view(account.authProfileId)).configured,true);}
 await page.locator('#accountLogin').click();await page.waitForFunction(()=>document.getElementById('accountSummary').textContent.includes('扫码'));await page.locator('#accountClose').click();await page.waitForFunction(()=>document.getElementById('accountSummary').textContent.includes('已有受保护'));
 if(after){await openDetails('accountAdvanced');await page.locator('#accountProxy').fill('http://127.0.0.1:19999');await go('workbench');await go('accounts');assert.equal(await page.locator('#accountProxy').inputValue(),'http://127.0.0.1:19999');}
 await safeLayout('accounts');checks.push('login/check/reload/close/DPAPI + clear cancel');
 await go('rooms');await page.locator('#profileName').fill('synthetic room');await openDetails('profileAdvanced');await page.locator('#targetInput').fill('web_rid:123');await page.locator('#profileSave').click();await page.waitForFunction(()=>document.getElementById('profileState').textContent.includes('synthetic room'));assert.equal(app.profiles.all()[0].authProfileId,null);
 await page.locator('#profileName').fill('edited draft');await page.locator('#targetInput').fill('web_rid:123');
 if(after){await go('diagnostics');await go('accounts');await go('rooms');assert.equal(await page.locator('#profileName').inputValue(),'edited draft');assert.equal(await page.locator('#targetInput').inputValue(),'web_rid:123');}
 await page.locator('#profileSave').click();await page.waitForFunction(()=>document.getElementById('profileState').textContent.includes('edited draft'));
 await page.locator('#profileCheck').click();await page.waitForFunction(()=>document.getElementById('profileState').textContent.includes('confirmationCount'));
 await page.locator('#profileResolve').click();await page.waitForFunction(()=>document.getElementById('profileState').textContent.includes('classification'));
 await safeLayout('rooms');checks.push('room create/update/shared account + navigation draft');
 await go('workbench');await page.locator('#profileStart').click();await page.waitForFunction(()=>document.getElementById('coordinateSummary').textContent.includes('监听已开始'));await page.waitForFunction(()=>document.getElementById('status').textContent.includes('CONNECTED'));assert.equal(peers,1);assert.equal(app.sources.view().selectedSource,'WebSource');assert.equal(app.runtime.store.countRaw(),1);
 if(after){await app.runtime.ingest({mode:'live',sourceType:'WebSource',sourceEpoch:app.sources.view().sourceEpoch,bytes:encode('ChatMessage',{common:{room_id:'100',msg_id:'9002'},content:'synthetic dashboard event'}),format:'business-payload',method:'WebcastChatMessage'});assert.equal(app.runtime.store.events({mode:'live'}).items.length,1);await page.waitForFunction(()=>document.getElementById('recentEvents').textContent.includes('WebcastChatMessage'));assert.ok(!await page.locator('#recentEvents').textContent().then(text=>text.includes('synthetic dashboard event')));}
 const sessions=app.runtime.store.sessions().length,postCount=commands.length;
 if(after){for(const name of ['accounts','rooms','data','diagnostics','workbench'])await go(name);assert.equal(app.sources.view().captureState,'CONNECTED');assert.equal(commands.length,postCount);assert.equal(app.runtime.store.sessions().length,sessions);}
 await safeLayout('workbench-connected');if(after)await page.locator('#dashboardProfile').selectOption('');await page.locator('#profileStop').click();await page.waitForFunction(()=>document.getElementById('coordinateSummary').textContent.includes('已停止'));assert.equal(app.sources.view().captureState,'STOPPED');if(after)await page.locator('#dashboardProfile').selectOption(app.profiles.all()[0].profileId);checks.push('listen/stop actual loopback WebSocket/RAW/Parser + navigation continuity');
 await go('diagnostics');await openDetails('sourceAdvanced');await page.locator('#sourceSelect').selectOption('LiveHookSource');await page.locator('#sourceSwitch').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('来源 LiveHookSource'));await page.locator('#captureStop').click();assert.equal(await page.locator('#captureStart').isDisabled(),true);
 await page.locator('#coordinateReload').click();await page.locator('#hookMatchReload').click();await page.waitForFunction(()=>document.getElementById('hookMatch').textContent.includes('profileMatch'));await page.locator('#browserStatsReload').click();await page.waitForFunction(()=>document.getElementById('browserStats').textContent.includes('rawBeforeAck'));
 await page.locator('#networkCheck').click();await page.waitForFunction(()=>document.getElementById('networkDiagnostic').textContent.includes('monitorStateUnchanged'));
 await go('rooms');await openDetails('networkAdvanced');await page.locator('#networkMode').selectOption('direct');await page.locator('#networkSave').click();await page.waitForFunction(()=>document.getElementById('profileState').textContent.includes('"mode": "direct"'));
 await go('diagnostics');
 await page.locator('#logReload').click();await page.waitForFunction(()=>document.getElementById('logs').textContent.includes('code'));const download=page.waitForEvent('download');await page.locator('#logExport').click();await (await download).saveAs(path.join(output,'logs.jsonl'));
 await page.locator('#loadGaps').click();await page.waitForFunction(()=>document.getElementById('connectionHealth').textContent.includes('ok'));await safeLayout('diagnostics');checks.push('source safety/Hook/resources/network save+check/log query+export/health');
 await go('data');await page.locator('#mode').selectOption('test');await page.locator('#reload').click();await page.waitForFunction(()=>document.querySelectorAll('#messages tr[data-event-id]').length>0);await page.locator('#messages tr[data-event-id]').first().click();await page.waitForFunction(()=>document.getElementById('detail').textContent.includes('protoId'));await page.locator('#inspectProto').click();await page.waitForFunction(()=>document.getElementById('protoDetail').textContent.includes('attempts'));
 const eventCount=app.runtime.store.countEvents();await page.locator('#reparseProto').click();await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('已追加'));assert.equal(app.runtime.store.countEvents(),eventCount);
 await page.locator('#browseRaw').click();await page.waitForFunction(()=>document.getElementById('rawPage').textContent.includes('byteBoundary'));await page.locator('#inspectRaw').click();await page.waitForFunction(()=>document.getElementById('rawPage').textContent.includes('processing'));
 await page.locator('#createReplay').click();await jsonAt('replay',v=>Boolean(v.replayId));await page.locator('[data-action="step"]').click();await jsonAt('replay',v=>v.position===1);
 const beforeNav=await page.locator('#replay').textContent();if(after){await go('rooms');await go('data');assert.equal(await page.locator('#replay').textContent(),beforeNav);}
 await page.locator('#position').fill('0');await page.locator('[data-action="seek"]').click();await jsonAt('replay',v=>v.position===0);await page.locator('[data-action="play"]').click();await jsonAt('replay',v=>['playing','finished'].includes(v.status));await page.locator('[data-action="pause"]').click();await jsonAt('replay',v=>v.status==='paused');await page.locator('[data-action="stop"]').click();await jsonAt('replay',v=>v.status==='stopped');await safeLayout('data');checks.push('persistent event query/RAW/Proto/reparse + Replay actions/state');
 await go('diagnostics');await page.locator('#golden').click();const op=await jsonAt('operation',v=>v.status==='complete');assert.equal(op.result.checks,59);assert.equal(op.result.failures,0);checks.push('59 synthetic Golden actual GUI/API/Parser');
 await page.locator('#r01').click();const running=await jsonAt('operation',v=>v.operationId!==op.operationId);if(after){await go('accounts');await go('diagnostics');assert.equal(JSON.parse(await page.locator('#operation').textContent()).operationId,running.operationId);}await jsonAt('operation',v=>v.status==='complete'&&v.operationId===running.operationId);
 await page.locator('#cancel').click();
 await go('data');await page.locator('#mode').selectOption('replay');await page.locator('#reload').click();await page.waitForFunction(()=>Number(document.getElementById('messages').dataset.cachedCount)===50);await page.locator('#older').click();await page.waitForFunction(()=>Number(document.getElementById('messages').dataset.cachedCount)>50);await page.locator('#latest').click();
 if(after){for(const width of [1365,1024,700]){await page.setViewportSize({width,height:1000});for(const name of ['workbench','accounts','rooms','data','diagnostics']){await go(name);await safeLayout(`${name}-${width}`);}}
  const ids=await page.evaluate(()=>[...document.querySelectorAll('[id]')].map(el=>el.id));assert.equal(new Set(ids).size,ids.length);
  const originalHtml=execFileSync('git',['show','1473ba35bc0966ca836d2b12fd56b14b86dfd45d:public/index.html'],{encoding:'utf8',windowsHide:true});
  const removed=new Set(['accountSelect','accountName','accountRemember','profileAuth','targetType','authPanel','authAdvanced','persistLogin','authOptIn','authCheck','authLogin','authSave','authClear','authState']);for(const match of originalHtml.matchAll(/id="([^"]+)"/g))if(!removed.has(match[1]))assert.ok(ids.includes(match[1]),'diagnostic control retained: '+match[1]);
 }
 await go('accounts');if(after)page.once('dialog',d=>d.accept());await page.locator('#accountClear').click();await page.waitForFunction(()=>document.getElementById('accountSummary').textContent.includes('尚未登录'));assert.equal((await app.viewer.get()).configured,false);assert.equal(app.accounts.all().length,0);
 await go('rooms');if(after)page.once('dialog',d=>d.accept());await page.locator('#profileDelete').click();await page.waitForFunction(()=>document.getElementById('profileSelect').options.length===1);
 assert.deepEqual(errors,[]);const report={phase,initialButtonCount,checks,layoutFindings,browserErrors:errors.length,syntheticGolden:59,realPlatformVerified:false,productionServiceTouched:false,screenshots:output};await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){await screenshot('failure').catch(()=>{});console.error(JSON.stringify({phase,error:error.message,notice:await page.locator('#notice').textContent().catch(()=>null),errors,socketErrors,upgradeChecks,acceptedConnections:app.socketHub.view().connections}));throw error;}
finally{await browser.close();await app.close();for(const ws of wss.clients)ws.terminate();await new Promise(resolve=>wss.close(resolve));if(evidenceOwned)await fs.unlink(evidence);assert.equal(path.dirname(dir),path.resolve(os.tmpdir()));assert.ok(path.basename(dir).startsWith('lw-navigation-'));await fs.rm(dir,{recursive:true,force:true});}
