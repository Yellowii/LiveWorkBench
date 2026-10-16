import test from 'node:test';import assert from 'node:assert/strict';import {StageResources} from '../public/stage-resources.js';
test('image fallback tries trusted candidates once, preserves cause and shares the bounded cache',async()=>{
 const prior=globalThis.Image,requests=[];globalThis.Image=class{set src(url){this.url=url;requests.push(url);queueMicrotask(()=>{if(url.endsWith('/good.png')){this.naturalWidth=40;this.naturalHeight=40;this.onload?.();}else this.onerror?.();});}};
 try{const r=new StageResources(),a='https://p3.douyinpic.com/bad.png',b='https://p3.douyinpic.com/good.png',item=r.get(a,'礼物',[a,'https://evil.invalid/x',b]);await new Promise(resolve=>setTimeout(resolve,20));assert.equal(item.state,'loaded');assert.equal(item.attempts,2);assert.equal(item.fallback,true);assert.equal(item.attemptFailures[0],'REQUEST_OR_DECODE_FAILED');assert.equal(item.reason,null);assert.deepEqual(requests,[a,b]);assert.equal(r.get(a,'礼物'),item);assert.equal(r.running,0);
 }finally{globalThis.Image=prior;}
});
test('all failures remain explicit, forbidden credential URLs are never requested',async()=>{
 const prior=globalThis.Image,requests=[];globalThis.Image=class{set src(url){requests.push(url);queueMicrotask(()=>this.onerror?.());}};
 try{const r=new StageResources();assert.equal(r.get('https://p3.douyinpic.com/x?token=SYN_SECRET','图'),null);const item=r.get('https://p3.douyinpic.com/a','图',['https://p3.douyinpic.com/b']);await new Promise(resolve=>setTimeout(resolve,20));assert.equal(item.state,'failed');assert.equal(item.attempts,2);assert.equal(item.reason,'REQUEST_OR_DECODE_FAILED');assert.equal(requests.length,2);assert.equal(r.running,0);assert.doesNotMatch(JSON.stringify(r.failures),/SYN_SECRET/);
 }finally{globalThis.Image=prior;}
});
