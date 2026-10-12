import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createGateway} from '../src/server.js';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-log-ui-')),app=await createGateway({dataDir:dir,port:0});
const browser=await chromium.launch({executablePath:process.env.LW_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 app.runtime.log('RAW_PERSIST_FAILED',{nickname:'synthetic confidential viewer'});app.runtime.log('SOURCE_SELECTION_CHANGED');
 await page.goto(app.url);await page.waitForFunction(()=>document.getElementById('logs').textContent.includes('RAW_PERSIST_FAILED'));
 await page.locator('#logModule').selectOption('raw');await page.locator('#logReload').click();
 await page.waitForFunction(()=>{try{const rows=JSON.parse(document.getElementById('logs').textContent);return rows.length===1&&rows[0].module==='raw';}catch{return false;}});
 const downloadPromise=page.waitForEvent('download');await page.locator('#logExport').click();const download=await downloadPromise;const file=path.join(dir,'download.jsonl');await download.saveAs(file);
 const text=await fs.readFile(file,'utf8');assert.ok(text.includes('RAW_PERSIST_FAILED'));assert.equal(text.includes('synthetic confidential viewer'),false);assert.equal(text.includes('SOURCE_SELECTION_CHANGED'),false);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({logFilter:true,authenticatedRedactedDownload:true,browserErrors:0}));
}finally{await browser.close();await app.close();await fs.rm(dir,{recursive:true,force:true});}
