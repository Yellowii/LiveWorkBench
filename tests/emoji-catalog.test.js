import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {messageView} from '../src/messages/message-view.js';import {resourceUrl} from '../src/messages/privacy.js';
let EmojiCatalog;try{({EmojiCatalog}=await import('../src/messages/emoji-catalog.js'));}catch{}
const url='https://lf5-webcastcdn-tos.douyinstatic.com/obj/webcast/emoji-synthetic.png';
const event=(type,official,mode='live')=>({eventType:'Webcast'+type,mode,runtimeNamespace:mode==='live'?'live':'replay:test',roomId:'100',sessionId:'synthetic',payload:{official}});
const payload={status_code:0,version:'42',emoji_list:[{display_name:'[合成]',hide:0,emoji_url:{url_list:[url]}},{display_name:'[隐藏]',hide:1,emoji_url:{url_list:[url]}}]};
test('recorded membership emoji CDN is allowed consistently; credentials and unrelated hosts remain refused',()=>{
 assert.equal(resourceUrl(url),url);assert.equal(resourceUrl(url.replace('lf5-webcastcdn-tos.douyinstatic.com','evil.douyinstatic.com')),null);assert.equal(resourceUrl(url+'?token=secret'),null);assert.equal(resourceUrl('https://127.0.0.1/obj/webcast/emoji.png'),null);
 const raw={emoji_content:{pieces:[{image_value:{image:{url_list:[url]}}}]},default_content:'[会员表情]'},view=messageView(event('EmojiChatMessage',raw));assert.equal(view.content.runs[0].type,'image');assert.equal(view.resources[0].url,url);assert.deepEqual(raw,{emoji_content:{pieces:[{image_value:{image:{url_list:[url]}}}]},default_content:'[会员表情]'});
});
test('official display-name map enriches only text, including hide flag; unknown tokens remain native text',()=>{
 assert.ok(EmojiCatalog);const catalog=new EmojiCatalog();catalog.install(payload,{observedAt:new Date().toISOString()});
 const raw={content:'你好[合成][未知][隐藏]<img onerror=1>'},view=messageView(event('ChatMessage',raw),{emojiCatalog:catalog});assert.equal(view.content.runs.filter(x=>x.type==='image').length,2);assert.ok(view.content.runs.some(x=>x.type==='text'&&x.text.includes('[未知]')));assert.equal(raw.content,'你好[合成][未知][隐藏]<img onerror=1>');assert.equal(view.content.emojiCatalog.version,'42');
 const image={type:'image',url,alt:'[原生]'};assert.deepEqual(catalog.expand([image]),[image]);
});
test('cache survives restart and failed refresh; Replay cannot request a refresh',async()=>{
 assert.ok(EmojiCatalog);const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-emoji-cache-')),file=path.join(dir,'catalog.json');let calls=0;
 const http={get:async()=>{calls++;if(calls>1)throw Error('synthetic outage');return {text:JSON.stringify(payload)};}};
 try{const catalog=new EmojiCatalog({file,http});await catalog.refresh();assert.equal(catalog.view().count,2);await catalog.refresh();assert.equal(catalog.view().count,2);assert.equal(catalog.view().status,'CACHE_RETAINED');const restored=await EmojiCatalog.open({file,http});assert.equal(restored.view().count,2);await restored.refreshIfNeeded({mode:'replay'});assert.equal(calls,2);await restored.close();await catalog.close();}finally{await fs.rm(dir,{recursive:true,force:true});}
});
