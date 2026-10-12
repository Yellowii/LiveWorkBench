import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createGateway} from '../src/server.js';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-profiles-ui-')),app=await createGateway({dataDir:dir,port:0});
const browser=await chromium.launch({executablePath:process.env.LW_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(app.url);await page.waitForFunction(()=>!document.getElementById('profileSave').disabled);
 await page.locator('#profileName').fill('synthetic GUI');await page.locator('#targetType').selectOption('web_rid');await page.locator('#targetInput').fill('123');await page.locator('#profileEnabled').check();await page.locator('#profileSave').click();
 await page.waitForFunction(()=>document.getElementById('profileState').textContent.includes('synthetic GUI'));assert.equal(await page.locator('#targetInput').inputValue(),'');
 app.monitor.adapter={probe:async()=>({state:'LIVE',roomId:'9876543210123456789',anchorUid:'456',web_rid:'123',source:'synthetic'})};
 await page.locator('#profileCheck').click();await page.waitForFunction(()=>document.getElementById('profileState').textContent.includes('"confirmationCount": 1'));
 await page.locator('#profileCheck').click();await page.waitForFunction(()=>document.getElementById('profileState').textContent.includes('"confirmedState": "LIVE"'));
 await page.locator('#profileStart').click();await page.waitForFunction(()=>document.getElementById('coordinateState').textContent.includes('NO_MATCHING_READY_PROFILE'));assert.equal(app.sources.view().captureState,'STOPPED');
 await page.locator('#profileName').fill('synthetic edited');await page.locator('#profileSave').click();await page.waitForFunction(()=>document.getElementById('profileState').textContent.includes('synthetic edited'));
 await page.locator('#persistLogin').check();await page.locator('#authOptIn').click();await page.waitForFunction(()=>document.getElementById('profileState').textContent.includes('"persistLogin": true'));
 await page.locator('#authCheck').click();await page.waitForFunction(()=>document.getElementById('authState').textContent.includes('"validity": "UNKNOWN"'));assert.equal(app.profiles.all()[0].persistLogin,true);
 await page.locator('#hookMatchReload').click();await page.waitForFunction(()=>document.getElementById('hookMatch').textContent.includes('profileMatch'));assert.equal(app.bridge.status.hookReady,false);
 await page.locator('#browserStatsReload').click();await page.waitForFunction(()=>document.getElementById('browserStats').textContent.includes('"rawBeforeAck": false'));
 assert.equal(app.profiles.all()[0].target.value,'123');assert.equal(app.sources.view().selectedSource,'LiveHookSource');
 await page.locator('#profileDelete').click();await page.waitForFunction(()=>document.getElementById('profileSelect').options.length===1);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({profileCRUD:true,monitorConfirmed:true,inputWriteOnly:true,manualSourcePreserved:true,browserErrors:0}));
}finally{await browser.close();await app.close();await fs.rm(dir,{recursive:true,force:true});}
