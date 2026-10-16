// Local history UI check. Read-only source; bounded event excerpts in an isolated
// private directory. Never copies accounts/configuration or starts collection.
import fs from 'node:fs/promises';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';import {createGateway} from '../src/server.js';import {messageView} from '../src/messages/message-view.js';
const source=process.argv[2],mediaRoot=process.argv[3];if(!source||!mediaRoot)throw Error('Supply authorized existing database and local evidence package');
const out=path.resolve('artifacts/chat-room-history');await fs.mkdir(out,{recursive:true});const db=new DatabaseSync(path.resolve(source),{readOnly:true}),events=[],sessions=[];
try{
 const entry=db.prepare("SELECT json FROM events WHERE mode='live' AND method='WebcastMemberMessage' AND json_extract(json,'$.payload.official.enter_effect_config.type')='8' ORDER BY seq DESC LIMIT 1").get();if(!entry)throw Error('No recorded type8 entry');const capture=JSON.parse(entry.json).captureId;
 for(const name of ['ChatMessage','EmojiChatMessage','MemberMessage','RoomMessage','RoomStatsMessage','RoomUserSeqMessage','LikeMessage'])for(const row of db.prepare("SELECT json FROM events WHERE mode='live' AND method=? AND json_extract(json,'$.captureId')=? ORDER BY seq DESC LIMIT 6").all('Webcast'+name,capture))events.push(JSON.parse(row.json));
 if(!events.some(x=>x.eventId===JSON.parse(entry.json).eventId))events.push(JSON.parse(entry.json));
 for(const id of new Set(events.map(e=>e.sessionId).filter(Boolean))){const row=db.prepare('SELECT json FROM sessions WHERE id=?').get(id);if(row)sessions.push(JSON.parse(row.json));}
}finally{db.close();}
events.sort((a,b)=>Date.parse(a.receivedAt)-Date.parse(b.receivedAt));
const app=await createGateway({dataDir:await fs.mkdtemp(path.join(out,'data-')),port:0});
for(const s of sessions)app.runtime.store.saveSession(s.key,s);
for(const e of events)app.runtime.store.addEvent(structuredClone(e),'history-preview:'+e.eventId);
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1150}}),errors=[];
const manifest=JSON.parse(await fs.readFile(path.join(mediaRoot,'media-manifest.json'),'utf8')),images=new Map(manifest.results.filter(x=>x.httpStatus===200).map(x=>[x.url,x]));const permittedEmoji=new Set(events.flatMap(e=>messageView(e,{emojiCatalog:app.runtime.emojiCatalog}).resources.filter(r=>r.kind==='emoji').flatMap(r=>r.urls||[r.url])));let externalEmojiRequests=0,cachedImages=0,blockedRequests=0;
page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',async route=>{const u=route.request().url();if(u.startsWith(app.url))return route.continue();const saved=images.get(u);if(saved){cachedImages++;return route.fulfill({contentType:saved.contentType,body:await fs.readFile(path.join(mediaRoot,saved.file))});}if(process.argv.includes('--allow-emoji')&&permittedEmoji.has(u)){externalEmojiRequests++;return route.continue();}blockedRequests++;return route.abort();});
try{
 await page.goto(app.url);await page.locator('[data-page=messages]').click();await page.locator('#mvScopeMode').selectOption('history');await page.locator('#mvImages').check();await page.waitForFunction(()=>document.querySelectorAll('.mv-row').length>0);await page.waitForTimeout(500);await page.locator('#stagePaused').check();
 await page.locator('#mvCategory').selectOption('chat');const row=page.locator('.mv-row').first();await row.click();await page.waitForFunction(()=>document.querySelector('#mvTitle').textContent.includes('消息详情'));
 await page.getByRole('button',{name:'官方 JSON',exact:true}).click();assert.ok((await page.locator('#mvJson').textContent()).includes('content'));await page.getByRole('button',{name:'内容',exact:true}).click();
 if(process.argv.includes('--allow-emoji'))await page.waitForFunction(()=>[...document.querySelectorAll('.mv-row[data-message-type=EmojiChatMessage] .mv-inline-image')].every(i=>i.naturalWidth>0)&&document.querySelectorAll('.mv-row[data-message-type=EmojiChatMessage] .mv-inline-image').length>0);
 const membershipImagesLoaded=await page.locator('.mv-row[data-message-type=EmojiChatMessage] .mv-inline-image').evaluateAll(items=>items.filter(i=>i.naturalWidth>0).length);
 await page.screenshot({path:path.join(out,'real-history-chat.png'),fullPage:true});
 await page.locator('#mvCategory').selectOption('member');await page.locator('.mv-row').first().click();await page.waitForTimeout(200);await page.screenshot({path:path.join(out,'real-history-entry.png'),fullPage:true});
 const views=events.map(e=>messageView(e,{emojiCatalog:app.runtime.emojiCatalog}));assert.equal(views.filter(x=>x.mappingStatus==='failed').length,0);assert.deepEqual(errors,[]);
 const report={existingRealHistory:true,newPlatformCapture:false,sourceReadOnly:true,copiedEventCount:events.length,originalRawNotCopied:true,loadedImagesFromPrivateCache:cachedImages,externalRequestsSent:externalEmojiRequests,membershipImagesLoaded,officialEmojiNetworkEnabled:process.argv.includes('--allow-emoji'),uncachedImageRequestsBlocked:blockedRequests,entry8:views.filter(x=>x.content.entry?.type==='8').length,badgeMessages:views.filter(x=>x.actor?.visualBadges.length).length,stats:views.filter(x=>x.content.audience?.kind==='stats').length,ranks:views.filter(x=>x.content.audience?.kind==='ranks').length,errors};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();if(!process.argv.includes('--serve'))await app.close();}
if(process.argv.includes('--serve')){await fs.writeFile(path.join(out,'preview.json'),JSON.stringify({url:app.url,pid:process.pid,dataDir:app.runtime.dataDir,commit:app.instance.commit,source:'isolated existing-history excerpts',noAccounts:true,noProfiles:true}));console.log('ISOLATED_HISTORY_PREVIEW '+app.url);for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});}
