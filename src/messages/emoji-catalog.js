import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
import {SafeDouyinHttp} from '../targets/safe-http.js';import {resourceUrl} from './privacy.js';
export const emojiListUrl='https://live.douyin.com/aweme/v1/web/emoji/list';
// Official ChatRoom 568771 / setEmojiReflex: all display_name values enter the
// display map. `hide` is an input-picker flag, not permission to erase received text.
export class EmojiCatalog{
 constructor({file,http=new SafeDouyinHttp(),networkPolicy={mode:'system'}}={}){this.file=file;this.http=http;this.networkPolicy=networkPolicy;this.items=new Map();this.status='MISSING';this.nextAttempt=0;this.closed=false;}
 static async open(options={}){const catalog=new EmojiCatalog(options);for(const file of [options.file,options.seedFile].filter(Boolean)){try{catalog.install(JSON.parse(await fs.readFile(file,'utf8')));break;}catch{}}return catalog;}
 install(payload,{observedAt,sourceSha256}={}){
  const snapshot=payload?.format==='lw-emoji-catalog-v1';if(!snapshot&&payload?.status_code!==0)throw Error('EMOJI_CATALOG_INVALID');
  const values=snapshot?payload.items:payload.emoji_list;if(!Array.isArray(values)||values.length>1024)throw Error('EMOJI_CATALOG_INVALID');
  const items=new Map();for(const item of values.slice(0,512)){
   const name=snapshot?item.name:item.display_name,candidates=snapshot?item.urls:item.emoji_url?.url_list;if(typeof name!=='string'||!/^\[[^\[\]\r\n]{1,64}\]$/.test(name))continue;
   const urls=[...new Set((Array.isArray(candidates)?candidates:[]).slice(0,16).map(resourceUrl).filter(Boolean))].slice(0,3);if(urls.length)items.set(name,{name,urls,hide:item.hide===true||item.hide===1});
  }
  if(!items.size)throw Error('EMOJI_CATALOG_EMPTY');this.items=items;this.version=String(payload.version||'unknown').slice(0,80);const recordedAt=Date.parse(observedAt||payload.observedAt);this.observedAt=Number.isFinite(recordedAt)?new Date(Math.min(recordedAt,Date.now())).toISOString():new Date().toISOString();this.sourceSha256=sourceSha256||payload.sourceSha256||null;this.status='READY';this.nextAttempt=Date.parse(this.observedAt)+86400000;
 }
 snapshot(){return {format:'lw-emoji-catalog-v1',version:this.version,observedAt:this.observedAt,sourceSha256:this.sourceSha256,items:[...this.items.values()]};}
 view(){return {version:this.version||null,observedAt:this.observedAt||null,sourceSha256:this.sourceSha256||null,count:this.items.size,status:this.status};}
 expand(runs){let images=0;return runs.flatMap(run=>{
  if(run.type!=='text')return [run];const text=run.text||'',out=[];let offset=0;
  for(const match of text.matchAll(/\[[^\[\]\r\n]{1,64}\]/g)){const entry=this.items.get(match[0]);if(!entry||images>=32)continue;if(match.index>offset)out.push({...run,text:text.slice(offset,match.index)});out.push({type:'image',url:entry.urls[0],urls:entry.urls,alt:entry.name,source:'official-emoji-directory',field:'content'});images++;offset=match.index+match[0].length;}
  if(!out.length)return [run];if(offset<text.length)out.push({...run,text:text.slice(offset)});return out;
 });}
 refreshIfNeeded({mode='live'}={}){if(this.closed||mode==='replay'||Date.now()<this.nextAttempt)return Promise.resolve();return this.refresh();}
 refresh(){if(this.closed)return Promise.resolve();if(this.job)return this.job;this.nextAttempt=Date.now()+300000;this.controller=new AbortController();
  this.job=(async()=>{try{const result=await this.http.get(emojiListUrl,{timeoutMs:10000,signal:this.controller.signal,networkPolicy:this.networkPolicy});if(this.closed)return;const payload=JSON.parse(result.text);this.install(payload,{sourceSha256:createHash('sha256').update(result.text).digest('hex')});if(this.file){await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.writeFile(this.file+'.tmp',JSON.stringify(this.snapshot()),{mode:0o600});await fs.rename(this.file+'.tmp',this.file);}}catch{this.status=this.items.size?'CACHE_RETAINED':'UNAVAILABLE';this.nextAttempt=Date.now()+300000;}finally{this.job=null;}})();return this.job;
 }
 async close(){this.closed=true;this.controller?.abort();await this.job;}
}
