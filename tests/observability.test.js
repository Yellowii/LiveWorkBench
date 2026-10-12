import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createGateway} from '../src/server.js';
async function setup(t,settings={}){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-observe-')),app=await createGateway({dataDir:dir,port:0,settings});t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});const cookie=(await fetch(app.url)).headers.get('set-cookie').split(';')[0];return {app,headers:{Cookie:cookie,Origin:app.url,'Content-Type':'application/json'}};}

test('structured logs filter and page without mixing modules or new inserts',async t=>{
 const {app,headers}=await setup(t);app.runtime.log('RAW_PERSIST_FAILED',{operationId:'synthetic-operation'});app.runtime.log('SOURCE_SELECTION_CHANGED');app.runtime.log('PARSE_FAILED');
 const response=await fetch(app.url+'/api/v1/logs?module=raw&limit=1',{headers});const page=(await response.json()).data;
 assert.equal(page.items.length,1);assert.equal(page.items[0].code,'RAW_PERSIST_FAILED');assert.equal(page.items[0].level,'error');assert.equal(page.items[0].module,'raw');
});

test('log export is authenticated and redacted even in a local private view',async t=>{
 const {app,headers}=await setup(t,{allowPrivateDetails:true});app.runtime.log('RAW_PERSIST_FAILED',{nickname:'synthetic viewer',nested:{token:'synthetic credential'},operationId:'synthetic-operation'});
 const command={commandId:'synthetic-export',filters:{module:'raw'},format:'jsonl'};
 const anonymous=await fetch(app.url+'/api/v1/logs/exports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});assert.equal(anonymous.status,403);
 const response=await fetch(app.url+'/api/v1/logs/exports',{method:'POST',headers,body:JSON.stringify(command)});assert.equal(response.status,202);
 const operation=(await response.json()).data;let result;
 for(let n=0;n<100;n++){result=(await (await fetch(app.url+'/api/v1/operations/'+operation.operationId,{headers})).json()).data;if(result.status==='complete')break;await new Promise(resolve=>setTimeout(resolve,10));}
 assert.equal(result.status,'complete');
 const download=await fetch(app.url+'/api/v1/logs/exports/'+result.result.exportId,{headers});assert.equal(download.status,200);const text=await download.text();
 assert.ok(text.includes('RAW_PERSIST_FAILED'));assert.equal(text.includes('synthetic viewer'),false);assert.equal(text.includes('synthetic credential'),false);
});

test('RAW and parsing timings report measured work rather than invented module CPU',async t=>{
 const {app,headers}=await setup(t);await app.runtime.ingest({bytes:Buffer.from([255]),format:'business-payload',method:'Unknown'});
 const data=(await (await fetch(app.url+'/api/v1/metrics/modules',{headers})).json()).data;
 assert.ok(data.timings,'Measured timing data is required');assert.equal(data.timings.rawCommit.count,1);assert.equal(data.timings.parse.count,1);
 assert.ok(data.timings.rawCommit.totalMs>=0);assert.ok(data.timings.parse.maxMs>=0);assert.equal(data.moduleCpu.available,false);assert.equal(data.moduleCpu.value,null);
});

test('replay rejects changed RAW without modifying the original or publishing a replay event',async t=>{
 const {app}=await setup(t);const raw=await app.runtime.ingest({bytes:Buffer.from([1]),format:'business-payload',method:'Unknown'});
 const replay=await app.runtime.createReplay({recordingId:raw.recordingId});
 await fs.writeFile(app.runtime.store.raw(raw.rawId).filePath,Buffer.from([2]));
 await assert.rejects(app.runtime.replayAction(replay.replayId,'step'),/RAW_HASH_MISMATCH/);
 assert.equal(app.runtime.store.events({mode:'replay'}).items.length,0);
});
