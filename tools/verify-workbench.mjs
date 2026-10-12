import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createGateway} from '../src/server.js';

const settings=JSON.parse(await fs.readFile('.local/settings.json','utf8'));
assert.ok(settings.r01Root,'Register the authorized R01 input in .local/settings.json');
const external=process.argv[2];
if(external){const target=new URL(external);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.protocol,'http:');const deadline=Date.now()+15000;while(true){try{const response=await fetch(external);if(response.ok)break;}catch{}if(Date.now()>=deadline)throw new Error('LOCAL_GATEWAY_NOT_READY');await new Promise(resolve=>setTimeout(resolve,100));}}
const dir=external?null:await fs.mkdtemp(path.join(os.tmpdir(),'lw-gui-'));
const app=external?null:await createGateway({dataDir:dir,port:0,settings});
const browser=await chromium.launch({executablePath:process.env.LW_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({viewport:{width:1365,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const wait=fn=>page.waitForFunction(fn,null,{polling:100,timeout:30000});
try{
  await page.goto(external||app.url);
  await wait(()=>document.getElementById('connection').textContent==='实时增量已连接');
  assert.equal(await page.locator('#captureStart').isDisabled(),true);
  await wait(()=>document.getElementById('daemon').textContent.includes('processInstances'));
  await page.locator('#golden').click();
  await wait(()=>{try{return JSON.parse(document.getElementById('operation').textContent).status==='complete';}catch{return false;}},{},{timeout:30000});
  const operation=JSON.parse(await page.locator('#operation').textContent());
  assert.equal(operation.result.processed,59);assert.equal(operation.result.checks,59);assert.equal(operation.result.failures,0);
  if(app){assert.equal(app.runtime.metrics.decoded,59);assert.equal(app.runtime.metrics.failed,0);}
  await wait(()=>Number(document.getElementById('messages').dataset.cachedCount)===50);
  await page.locator('#messages tr[data-event-id]').first().click();
  await wait(()=>document.getElementById('detail').textContent.includes('\"eventId\"'));
  const detail=JSON.parse(await page.locator('#detail').textContent());
  assert.equal(detail.mode,'replay');assert.ok(detail.rawRefs.length);assert.ok(detail.payload.official);
  await page.locator('#older').click();
  await wait(()=>Number(document.getElementById('messages').dataset.cachedCount)>50);
  assert.equal(await page.locator('#follow').isChecked(),false);
  await page.locator('#createReplay').click();
  await wait(()=>document.getElementById('replay').textContent.includes('"replayId"'));
  await page.locator('[data-action="step"]').click();
  await wait(()=>{try{return JSON.parse(document.getElementById('replay').textContent).position===1;}catch{return false;}});
  await page.locator('#position').fill('3');await page.locator('[data-action="seek"]').click();
  await wait(()=>{try{return JSON.parse(document.getElementById('replay').textContent).position===3;}catch{return false;}});
  await page.locator('#sourceSelect').selectOption('WebSource');await page.locator('#sourceSwitch').click();
  await wait(()=>document.getElementById('status').textContent.includes('来源 WebSource'));
  assert.equal(await page.locator('#captureStart').isDisabled(),true);
  await page.reload();await wait(()=>document.getElementById('status').textContent.includes('来源 WebSource'));
  assert.equal(await page.locator('#sourceSelect').inputValue(),'WebSource');
  await page.locator('#sourceSelect').selectOption('LiveHookSource');await page.locator('#sourceSwitch').click();
  await wait(()=>document.getElementById('status').textContent.includes('来源 LiveHookSource'));
  assert.deepEqual(errors,[]);
  const result={at:new Date().toISOString(),golden:operation.result.processed,checks:operation.result.checks,failures:operation.result.failures,browserErrors:errors.length,verified:['real Golden through GUI/API/parser/store','persistent history pagination','redacted official projection and RAW trace','isolated step and seek','manual source switching and refresh continuity','live capture disabled without configuration']};
  await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/workbench-verification.json',JSON.stringify(result,null,2));
  await page.locator('#detail').evaluate(el=>{el.textContent='已验证官方结果、独立扩展与 RAW 引用；截图隐藏样本内容。';});
  await page.screenshot({path:'artifacts/workbench.png',fullPage:true,mask:[page.locator('#messages'),page.locator('#logs'),page.locator('#operation'),page.locator('#replay')]});
  console.log(JSON.stringify(result));
}catch(error){console.error(JSON.stringify({error:error.message,notice:await page.locator('#notice').textContent({timeout:1000}).catch(()=>null),replay:await page.locator('#replay').textContent({timeout:1000}).catch(()=>null),browserErrors:errors}));throw error;}finally{await browser.close();if(app)await app.close();if(dir)await fs.rm(dir,{recursive:true,force:true});}


