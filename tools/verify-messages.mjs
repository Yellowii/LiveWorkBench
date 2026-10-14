// Synthetic official protobuf through a private Gateway. Never operates production services.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createGateway} from '../src/server.js';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-messages-gui-')),output=path.resolve('artifacts/messages');await fs.mkdir(output,{recursive:true});
const app=await createGateway({dataDir:dir,port:0}),browser=await chromium.launch({executablePath:process.env.LW_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
let sequence=1;
async function ingest(name,data){const type=app.runtime.parser.native.root.lookupType('webcast.im.'+name),bytes=type.encode(type.fromObject({common:{room_id:'100',msg_id:String(sequence++)},...data})).finish();return app.runtime.ingest({bytes,method:'Webcast'+name,format:'business-payload',sourceType:'WebSource',sourceEpoch:app.sources.view().sourceEpoch,mode:'live'});}
const go=name=>page.locator(`[data-page="${name}"]`).click();
try{
 await app.sources.action({action:'switch',sourceType:'WebSource',expectedVersion:app.sources.view().stateVersion});
 for(let n=0;n<515;n++)await ingest('ChatMessage',{content:'合成历史消息 '+n,user:{nickname:'合成观众'}});
 await ingest('LikeMessage',{count:'3',total:'100'});
 await ingest('MemberMessage',{common:{room_id:'100',msg_id:String(sequence++),display_text:{default_pattern:'{0}进入直播间',pieces:[{user_value:{user:{nickname:'合成新观众'}}}]}},action:'999'});
 await ingest('GiftMessage',{user:{nickname:'合成送礼人'},gift:{name:'合成礼物',combo:true},repeat_count:'8',repeat_end:1});
 await ingest('ChatMessage',{user:{nickname:'合成可读昵称'},content:'你好 <img src=x onerror="window.pwned=true">'});
 await page.goto(app.url);await go('messages');await page.waitForFunction(()=>document.querySelector('#mvRows')?.textContent.includes('合成可读昵称'));
 assert.equal(await page.evaluate(()=>window.pwned),undefined);assert.equal(await page.locator('#mvRows img').count(),0);
 await page.locator('.mv-row').last().click();await page.getByRole('button',{name:'官方 JSON',exact:true}).click();await page.locator('#mvField').selectOption('user.nickname');assert.match(await page.locator('#mvFieldInfo').textContent(),/#3.*string.*昵称/);
 await page.getByRole('button',{name:'Proto 字典',exact:true}).click();assert.match(await page.locator('#mvProto').textContent(),/ChatMessage/);
 await page.getByRole('button',{name:'RAW / 处理链',exact:true}).click();assert.match(await page.locator('#mvRaw').textContent(),/protoId/);
 await go('rooms');await page.locator('#profileName').fill('未保存草稿');await go('messages');assert.match(await page.locator('#mvRaw').textContent(),/protoId/);await go('rooms');assert.equal(await page.locator('#profileName').inputValue(),'未保存草稿');await go('messages');
 await page.locator('#mvCategory').selectOption('gift');await page.locator('.mv-row').click();await page.getByRole('button',{name:'内容',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#mv-content').textContent.includes('合成礼物'));assert.match(await page.locator('#mv-content').textContent(),/连击结束/);
 await page.locator('#mvCategory').selectOption('');await page.locator('#mvFollow').uncheck();
 for(let n=0;n<5;n++){await page.locator('#mvOlder').click();await page.waitForFunction(()=>!document.querySelector('#mvOlder').disabled||document.querySelector('#mvStatus').textContent.includes('500'));await page.waitForTimeout(150);}
 assert.equal(Number(await page.locator('#mvRows').getAttribute('data-cached-count')),500);assert.ok(await page.locator('.mv-row').count()<25);
 await page.locator('#mvLatest').click();await page.waitForFunction(()=>document.querySelector('#mvStatus').textContent.includes('自动跟随'));
 await ingest('ChatMessage',{user:{nickname:'合成新增'},content:'持续新增可读消息'});await page.waitForFunction(()=>document.querySelector('#mvRows').textContent.includes('持续新增可读消息'));
 for(const width of [1440,1024,700]){await page.setViewportSize({width,height:980});await page.screenshot({path:path.join(output,'messages-'+width+'.png'),fullPage:true});const issues=await page.evaluate(()=>[...document.querySelectorAll('#page-messages button,#page-messages select')].filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return r.width<8||r.left<0||r.right>innerWidth+1;}).map(e=>e.id||e.textContent));assert.deepEqual(issues,[]);}
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({synthetic:true,checks:['readable content','XSS plain text','nested Proto field','RAW processing trace','navigation drafts','gift fields','history >500','virtual DOM <25','live polling','1440/1024/700 layout'],errors},null,2));console.log('MESSAGE_GUI_PASS',JSON.stringify({errors:errors.length,raw:app.runtime.store.countRaw(),events:app.runtime.store.countEvents()}));
}finally{await browser.close();await app.close();await fs.rm(dir,{recursive:true,force:true});}
