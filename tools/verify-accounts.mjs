import {openGuiPage,expandGuiPanel} from './gui-navigation.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {chromium} from 'playwright-core';
import {createGateway} from '../src/server.js';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-accounts-ui-')),app=await createGateway({dataDir:dir,port:0});
class Session extends EventEmitter{diagnostics(){return {network:{mode:'custom',route:'http-connect-proxy',dns:'delegated-to-proxy'},resources:[{domain:'live.douyin.com',resourceType:'stylesheet',outcome:'http-success',httpStatus:200,count:1}]};}async open(){this.context={storageState:async()=>({cookies:[{name:'synthetic',value:'SYNTHETIC_UI_SESSION',domain:'.douyin.com',path:'/',expires:-1,httpOnly:true,secure:true,sameSite:'Lax'}],origins:[]})};}async close(){}async check(){}confirm(){this.emit('status',{state:'AUTHENTICATED',source:'official-self-api',checkedAt:new Date().toISOString()});}}
app.loginManager.clientFactory=()=>new Session();const browser=await chromium.launch({executablePath:process.env.LW_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(app.url);await openGuiPage(page,'accounts');await page.waitForFunction(()=>document.getElementById('accountLogin')&&!document.getElementById('accountLogin').disabled);
 await page.locator('#accountName').fill('synthetic shared account');await page.locator('#accountRemember').check();await page.locator('#accountLogin').click();await page.waitForFunction(()=>document.getElementById('accountSummary').textContent.includes('扫码'));
 assert.match(await page.locator('#accountState').textContent(),/stylesheet/);assert.match(await page.locator('#accountState').textContent(),/delegated-to-proxy/);
 assert.equal(app.profiles.all().length,0);assert.equal(app.sources.view().selectedSource,'LiveHookSource');app.loginManager.active.client.confirm();await page.waitForFunction(()=>document.getElementById('accountSummary').textContent.includes('已登录'));
 await openGuiPage(page,'rooms');await expandGuiPanel(page,'profileAdvanced');let count=0;for(const target of ['123','124']){await page.locator('#profileSelect').selectOption('');await page.locator('#targetType').selectOption('web_rid');await page.locator('#targetInput').fill(target);await page.locator('#profileSave').click();await page.waitForFunction(n=>document.getElementById('profileSelect').options.length===n+1,++count);}
 assert.equal(app.profiles.all().length,2);assert.equal(new Set(app.profiles.all().map(p=>p.authProfileId)).size,1);assert.ok(app.profiles.all()[0].authProfileId);assert.equal(app.sources.view().selectedSource,'LiveHookSource');
 const other=app.accounts.create({name:'synthetic second account'});await openGuiPage(page,'accounts');await page.locator('#accountReload').click();await openGuiPage(page,'rooms');await page.waitForFunction(()=>document.getElementById('profileAuth').options.length===3);await page.locator('#profileSelect').selectOption('');await page.locator('#targetType').selectOption('web_rid');await page.locator('#targetInput').fill('125');await page.locator('#profileAuth').selectOption(other.authProfileId);await page.locator('#profileSave').click();await page.waitForFunction(()=>document.getElementById('profileSelect').options.length===4);assert.equal(app.profiles.all()[2].authProfileId,other.authProfileId);
 await openGuiPage(page,'accounts');await expandGuiPanel(page,'accountDanger');page.once('dialog',d=>d.accept());await page.locator('#accountClear').click();await page.waitForFunction(()=>document.getElementById('accountSummary').textContent.includes('尚未登录'));assert.equal((await app.loginManager.list()).items[0].configured,false);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({independentLogin:true,automaticOptInSave:true,twoRoomsShareAccount:true,manualSourcePreserved:true,browserErrors:0}));
}finally{await browser.close();await app.close();await fs.rm(dir,{recursive:true,force:true});}
