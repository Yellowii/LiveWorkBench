import {openGuiPage,expandGuiPanel} from './gui-navigation.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createGateway} from '../src/server.js';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-profiles-ui-')),app=await createGateway({dataDir:dir,port:0});
const browser=await chromium.launch({executablePath:process.env.LW_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
app.monitor.adapter={probe:async()=>({state:'UNKNOWN',errorCode:'SYNTHETIC_OFFLINE'})};
try{
 await page.goto(app.url);await openGuiPage(page,'rooms');await expandGuiPanel(page,'profileAdvanced');await page.waitForFunction(()=>!document.getElementById('profileSave').disabled);
 await page.locator('#profileName').fill('synthetic GUI');await page.locator('#targetInput').fill('web_rid:123');await page.locator('#profileEnabled').check();await page.locator('#profileSave').click();
 await page.waitForFunction(()=>document.getElementById('profileState').textContent.includes('synthetic GUI'));assert.equal(await page.locator('#targetInput').inputValue(),'');
 app.monitor.adapter={probe:async()=>({state:'LIVE',roomId:'9876543210123456789',anchorUid:'456',web_rid:'123',source:'synthetic',network:{mode:'direct',route:'direct',dns:'verified-and-pinned-public',connectionState:'connected'}})};
 await page.locator('#profileCheck').click();await page.waitForFunction(()=>document.getElementById('profileState').textContent.includes('"confirmationCount": 1'));
 await page.locator('#profileCheck').click();await page.waitForFunction(()=>document.getElementById('profileState').textContent.includes('"confirmedState": "LIVE"'));
 await openGuiPage(page,'workbench');await page.locator('#profileStart').click();await page.waitForFunction(()=>document.getElementById('coordinateState').textContent.includes('WEB_DYNAMIC_PARAMETERS_UNAVAILABLE'));assert.equal(app.sources.view().captureState,'STOPPED');
 await openGuiPage(page,'rooms');await page.locator('#profileName').fill('synthetic edited');await page.locator('#profileSave').click();await page.waitForFunction(()=>document.getElementById('profileState').textContent.includes('synthetic edited'));
 await openGuiPage(page,'diagnostics');
 await page.locator('#hookMatchReload').click();await page.waitForFunction(()=>document.getElementById('hookMatch').textContent.includes('profileMatch'));assert.equal(app.bridge.status.hookReady,false);
 await openGuiPage(page,'rooms');await expandGuiPanel(page,'networkAdvanced');await page.locator('#networkMode').selectOption('direct');await page.locator('#networkSave').click();await page.waitForFunction(()=>document.getElementById('profileState').textContent.includes('\"mode\": \"direct\"'));assert.equal(app.profiles.all()[0].networkPolicy.mode,'direct');
 await openGuiPage(page,'diagnostics');await page.locator('#networkCheck').click();await page.waitForFunction(()=>document.getElementById('networkDiagnostic').textContent.includes('verified-and-pinned-public'));assert.ok((await page.locator('#networkDiagnostic').textContent()).includes('monitorStateUnchanged'));
 await page.locator('#browserStatsReload').click();await page.waitForFunction(()=>document.getElementById('browserStats').textContent.includes('"rawBeforeAck": false'));
 assert.equal(app.profiles.all()[0].target.value,'web_rid:123');assert.equal(app.sources.view().selectedSource,'WebSource');
 await openGuiPage(page,'rooms');page.once('dialog',d=>d.accept());await page.locator('#profileDelete').click();await page.waitForFunction(()=>document.getElementById('profileSelect').options.length===1);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({profileCRUD:true,monitorConfirmed:true,inputWriteOnly:true,manualListenIntent:true,browserErrors:0}));
}finally{await browser.close();await app.close();await fs.rm(dir,{recursive:true,force:true});}
