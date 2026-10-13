import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {LoginBrowserSession} from '../src/auth/login-browser-session.js';

// Anonymous, short-lived probe: no saved login state, no QR/cookie/URL/body logging.
const label=process.argv[2]||'current';if(!/^[a-z0-9-]+$/.test(label))throw new Error('PROBE_LABEL_INVALID');
const failedDomains=new Map(),scriptErrorKinds=new Map();
const session=new LoginBrowserSession({launchBrowser:options=>chromium.launch({...options,headless:process.argv[3]!=='visible'}),prepareContext:async context=>{
 context.on('requestfailed',request=>{const host=new URL(request.url()).hostname;if(!host.split('.').every(label=>/^[a-z][a-z0-9-]{0,39}$/.test(label)))return;const key=host+' '+request.resourceType();failedDomains.set(key,(failedDomains.get(key)||0)+1);});
 context.on('page',page=>page.on('pageerror',error=>{const text=String(error.message),kind=/chunk|loading chunk/i.test(text)?'CHUNK_LOAD_ERROR':/media|play|video|audio/i.test(text)?'MEDIA_EXCEPTION':/Failed to fetch|network/i.test(text)?'NETWORK_EXCEPTION':/abort/i.test(text)?'ABORT_EXCEPTION':/undefined|null|is not defined/i.test(text)?'REFERENCE_EXCEPTION':'SCRIPT_EXCEPTION';scriptErrorKinds.set(kind,(scriptErrorKinds.get(kind)||0)+1);}));
}});
let report;
try{
 await session.open({networkPolicy:{mode:'system'}});await session.page.waitForLoadState('domcontentloaded',{timeout:35000}).catch(()=>{});await session.page.waitForTimeout(10000);
 const dom=await session.page.evaluate(()=>({styleSheets:document.styleSheets.length,externalStyles:document.querySelectorAll('link[rel="stylesheet"]').length,bodyFont:getComputedStyle(document.body).fontFamily,bodyBackground:getComputedStyle(document.body).backgroundColor,scripts:document.scripts.length}));
 let loginEntryClicked=false;const candidates=session.page.getByText('登录',{exact:true});for(let i=0;i<await candidates.count();i++){const item=candidates.nth(i);if(await item.isVisible()){await item.click({timeout:5000});loginEntryClicked=true;break;}}
 await session.page.waitForTimeout(15000);
 for(const text of ['立即登录','登录/注册']){const locator=session.page.getByText(text,{exact:true});for(let i=0;i<await locator.count();i++){if(await locator.nth(i).isVisible()){await locator.nth(i).click({timeout:5000});break;}}}
 await session.page.waitForTimeout(10000);
 const qrTab=session.page.getByText('扫码登录',{exact:true});for(let i=0;i<await qrTab.count();i++){if(await qrTab.nth(i).isVisible()){await qrTab.nth(i).click({timeout:5000});break;}}
 await session.page.waitForTimeout(5000);
 const login=await session.page.evaluate(()=>({dialogCount:document.querySelectorAll('[role="dialog"]').length,qrPromptVisible:[...document.querySelectorAll('div,span,p')].some(e=>e.textContent.trim().length<80&&/扫码.*登录|登录.*扫码/.test(e.textContent.trim())&&e.getBoundingClientRect().width>0),qrImages:[...document.images].filter(e=>(/qrcode|qr_code|二维码/i.test(e.alt+' '+e.src)||e.src.startsWith('data:image/'))&&e.naturalWidth>=100&&e.getBoundingClientRect().width>=100).length,canvasCount:document.querySelectorAll('canvas').length,playingMedia:[...document.querySelectorAll('video,audio')].filter(e=>!e.paused).length,autoplayMedia:document.querySelectorAll('video[autoplay],audio[autoplay]').length}));
 report={at:new Date().toISOString(),...session.diagnostics(),failedDomains:[...failedDomains],scriptErrorKinds:[...scriptErrorKinds],dom,login:{...login,loginEntryClicked},authenticated:session.account.status.state==='authenticated',credentialsUsed:false};
 await fs.mkdir('.local/login-page',{recursive:true});await fs.writeFile('.local/login-page/'+label+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 if(process.argv.includes('layout')){
  // Redact DOM before screenshot: no recommended user text, avatars or QR pixels.
  await session.page.evaluate(()=>{const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){if(/^(登录|扫码登录|验证码登录|二维码已失效|刷新|打开抖音APP扫码登录)$/.test(node.textContent.trim()))continue;node.textContent=node.textContent.replace(/\S/g,'▮');}for(const el of document.querySelectorAll('*'))if(getComputedStyle(el).backgroundImage!=='none')el.style.backgroundImage='none';});
  await session.page.locator('img,canvas,svg,video,iframe,input').evaluateAll(elements=>elements.forEach(e=>e.style.visibility='hidden'));
  await session.page.screenshot({path:'.local/login-page/'+label+'.png'});
 }
}finally{await session.close();}
