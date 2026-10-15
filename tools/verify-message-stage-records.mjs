// Bounded read-only real-history sample. Copies only selected events into a private GUI fixture.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {chromium} from 'playwright-core';import {createGateway} from '../src/server.js';import {messageView} from '../src/messages/message-view.js';
const sourcePath=process.argv[2];if(!sourcePath)throw Error('Explicit authorized workbench.sqlite path required');
const out=path.resolve('artifacts/stage-fidelity-real'),dir=await fs.mkdtemp(path.join((await fs.mkdir(out,{recursive:true}),out),'data-'));
const db=new DatabaseSync(path.resolve(sourcePath),{readOnly:true}),rows=[],coverage=[];
try{for(const method of ['ChatMessage','PrivilegeScreenChatMessage','GiftMessage','LotteryEventNewMessage']){
 const candidates=db.prepare('SELECT * FROM events WHERE mode=? AND method=? ORDER BY seq DESC LIMIT 50').all('live','Webcast'+method);
 const row=candidates.find(r=>{const v=messageView(JSON.parse(r.json));return v.mappingStatus!=='failed'&&(method!=='GiftMessage'||v.content.gift.trayEligible);});
 coverage.push({method,found:Boolean(row),examined:candidates.length});if(row)rows.push(row);
}}finally{db.close();}
assert.ok(rows.some(r=>r.method==='WebcastGiftMessage'),'No eligible real gift sample; do not fabricate one');
const app=await createGateway({dataDir:dir,port:0});let browser;
try{
 for(const row of rows)app.runtime.store.db.prepare('INSERT INTO events VALUES(?,?,?,?,?,?,?)').run(row.seq,row.id,row.dedup,row.mode,row.namespace,row.method,row.json);
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(app.url);await page.locator('[data-page=messages]').click();await page.locator('#mvImages').check();await page.locator('.stage-gift').waitFor();await page.locator('#stagePaused').check();
 await page.waitForFunction(()=>[...document.querySelectorAll('.stage-gift img')].length>=2&&[...document.querySelectorAll('.stage-gift img')].every(i=>i.complete&&i.naturalWidth>0),{},{timeout:15000});
 assert.ok(await page.locator('.stage-gift').evaluate(e=>e.getBoundingClientRect().left>=document.querySelector('#messageStage').getBoundingClientRect().left),'Paused tray must remain inside stage');
 await page.screenshot({path:path.join(out,'real-history.png'),fullPage:true});await page.locator('.stage-gift').screenshot({path:path.join(out,'real-gift.png')});
 await page.locator('.stage-gift').click();await page.getByRole('button',{name:'官方 JSON',exact:true}).click();await page.locator('#mvJson button').filter({hasText:/^gift$/}).click();assert.match(await page.locator('#mvFieldInfo').textContent(),/webcast/);
 const images=await page.locator('#stageCards img').evaluateAll(xs=>xs.map(i=>({kind:i.alt,loaded:i.complete&&i.naturalWidth>0,width:i.naturalWidth})));assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({realHistorical:true,newPlatformCapture:false,coverage,images,errors,limits:['event-only private fixture; RAW chain already covered by API regression','no real privilege sample unless coverage says found']},null,2));console.log(JSON.stringify({result:'REAL_STAGE_FIDELITY_PASS',coverage,images,errors}));
}finally{await browser?.close();await app.close();}
