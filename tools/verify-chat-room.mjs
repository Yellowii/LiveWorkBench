import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';import {createGateway} from '../src/server.js';
const out=path.resolve('artifacts/chat-room');await fs.mkdir(out,{recursive:true});const app=await createGateway({dataDir:await fs.mkdtemp(path.join(out,'data-')),port:0});
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1150}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
const image={url_list:['https://p3.douyinpic.com/lw-chat-synthetic.png'],width:'80',height:'20'},badge={...image,image_type:51,content:{name:'合成灯牌'}},user={id:'500',nickname:'合成观众',avatar_thumb:image,public_area_badge_info:{badge_list:['1'],badge_info_map:{1:badge}},badge_image_list:[badge]};let seq=8000,currentProfile=null;
await page.route(image.url_list[0],r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="20"><rect width="160" height="20" rx="6" fill="#6743a5"/></svg>'}));
async function ingest(name,data,room='100'){const t=app.runtime.parser.native.root.lookupType('webcast.im.'+name);await app.runtime.ingest({bytes:t.encode(t.fromObject({common:{room_id:room,msg_id:String(++seq)},...data})).finish(),method:'Webcast'+name,format:'business-payload',sourceType:'WebSource',sourceEpoch:app.sources.view().sourceEpoch,recordingId:'synthetic-chat-room',profileId:currentProfile,mode:'live'});}
try{
 await app.sources.action({action:'switch',sourceType:'WebSource',expectedVersion:app.sources.view().stateVersion});
 const profile=app.profiles.create({name:'合成房间一',target:{type:'auto',value:'https://live.douyin.com/123456'},enabled:true});
 currentProfile=profile.profileId;app.profiles.setState(profile.profileId,{profileId:profile.profileId,profileVersion:profile.version,checkedAt:new Date().toISOString(),queryState:'LIVE',confirmedState:'LIVE',confirmationCount:2,evidence:{source:'douyin-structured-room'}});
 await ingest('RoomStatsMessage',{display_middle:'123人在线',display_value:'123',display_version:'2'});
 await ingest('RoomUserSeqMessage',{ranks:[{user,rank:'1'},{user:{nickname:'不应显示'},is_hidden:true}],total:'900'});
 await ingest('RoomStatsMessage',{display_middle:'999人在线',display_value:'999',display_version:'1'});
 await ingest('ChatMessage',{user,content:'<img onerror=window.__chatUnsafe=1> 你好'});
 await ingest('RoomMessage',{common:{room_id:'100',msg_id:String(++seq),display_text:{default_pattern:'{0:user}为主播加了{1:string}分',pieces:[{user_value:{user}},{string_value:'10'}]}}});
 await ingest('MemberMessage',{user,enter_effect_config:{type:'8',text:{default_pattern:'欢迎{0:user}来了',pieces:[{user_value:{user}}]},badge,text_icon:image}});
 await ingest('RoomStatsMessage',{display_middle:'555人在线',display_value:'555',display_version:'5'},'200');
 await page.goto(app.url);await page.waitForFunction(()=>document.querySelector('#roomLiveStates')?.textContent.includes('合成房间一'));
 assert.match(await page.locator('#roomLiveStates').textContent(),/已开播/);assert.match(await page.locator('#roomLiveStates').textContent(),/监听已停止/);assert.match(await page.locator('#roomLiveStates').textContent(),/检测时间/);
 // Synthetic status only: no network connection is opened by this assertion.
 app.sources.currentWeb().captureId='synthetic-chat-room';app.sources.currentWeb().status.captureState='CONNECTED';app.coordinator.state.active={profileId:profile.profileId};
 await page.waitForFunction(()=>document.querySelector('#roomLiveStates').textContent.includes('有消息数据流'));await page.screenshot({path:path.join(out,'room-status.png'),fullPage:true});
 app.sources.currentWeb().status.captureState='STOPPED';app.coordinator.state.active=null;

 await page.locator('[data-page=messages]').click();await page.locator('#mvImages').check();await page.waitForFunction(()=>document.querySelector('.stage-member'));
 await page.locator('#stagePaused').check();
 const option=await page.locator('#mvRoomScope option').evaluateAll(nodes=>nodes.find(n=>n.textContent.includes('房间 100')).value);await page.locator('#mvRoomScope').selectOption(option);
 assert.match(await page.locator('#mvAudienceStats').textContent(),/123人在线/);assert.doesNotMatch(await page.locator('#mvAudienceStats').textContent(),/555|999|900/);assert.equal(await page.locator('.mv-audience-user').count(),2);assert.match(await page.locator('#mvAudienceUsers').textContent(),/隐身用户/);assert.doesNotMatch(await page.locator('#mvAudienceUsers').textContent(),/不应显示/);
 await page.locator('.stage-member').click();await page.waitForFunction(()=>document.querySelector('#mv-content')?.textContent.includes('来了'));
 await page.getByRole('button',{name:'官方 JSON',exact:true}).click();assert.ok(await page.locator('#mvJson').textContent().then(x=>x.includes('enter_effect_config')));
 await page.getByRole('button',{name:'RAW / 处理链',exact:true}).click();assert.match(await page.locator('#mvRaw').textContent(),/protoId/);
 await page.locator('#mvCategory').selectOption('system');await page.locator('.mv-row').click();await page.waitForFunction(()=>document.querySelector('#mvTitle')?.textContent.includes('房间提示'));await page.getByRole('button',{name:'内容',exact:true}).click();assert.match(await page.locator('#mv-content').textContent(),/为主播加了10分/);
 await page.locator('#mvCategory').selectOption('chat');assert.equal(await page.evaluate(()=>window.__chatUnsafe),undefined);assert.match(await page.locator('.mv-row').textContent(),/<img onerror=/);
 await page.waitForFunction(()=>document.querySelector('.mv-row .mv-badge-nine-slice')?.dataset.loaded==='true');
 const badgeStyle=await page.locator('.mv-row .mv-badge-nine-slice').evaluate(e=>({height:getComputedStyle(e).height,slice:getComputedStyle(e).borderImageSlice}));assert.equal(badgeStyle.height,'18px');assert.equal(badgeStyle.slice,'0 28 0 60 fill');
 for(const width of [1440,700,480]){await page.setViewportSize({width,height:1150});await page.screenshot({path:path.join(out,`implementation-${width}.png`),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const b=await page.locator('.stage-member').boundingBox(),stage=await page.locator('#messageStage').boundingBox();assert.ok(b.x>=stage.x&&b.x+b.width<=stage.x+stage.width+1&&b.y>=stage.y&&b.y+b.height<=stage.y+stage.height+1);await page.locator('.stage-member').click();}
 await page.locator('[data-page=rooms]').click();await page.locator('[data-page=messages]').click();assert.equal(await page.locator('#stagePaused').isChecked(),true);assert.equal(await page.locator('#mvRoomScope').inputValue(),option);
 assert.deepEqual(errors,[]);assert.equal(app.runtime.metrics.failed,0);
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({synthetic:true,raw:app.runtime.store.countRaw(),events:app.runtime.store.countEvents(),parseFailures:app.runtime.metrics.failed,errors,badgeStyle,checks:['platform status versus stopped capture','timestamp labels','version ordering of audience stats','room/capture scoped snapshots','partial and hidden ranks','template user badge and ordered text','entry8 stage and JSON/RAW detail','XSS plain text','480/700/1440 GUI','navigation preserves presentation state']},null,2));console.log('CHAT_ROOM_GUI_PASS');
}catch(e){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});throw e;}finally{await browser.close();await app.close();}
