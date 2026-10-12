import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Runtime} from '../src/runtime.js';
import {createGateway} from '../src/server.js';
test('a data directory has one owner and is reusable after orderly close',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-instance-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const first=await Runtime.open({dataDir:dir});
 let duplicate;try{await assert.rejects(async()=>{duplicate=await Runtime.open({dataDir:dir});},/DATA_DIRECTORY_BUSY/);}finally{await duplicate?.close();await first.close();}
 const next=await Runtime.open({dataDir:dir});await next.close();
});
test('new Gateway identifies its loaded backend and actual module state',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-instance-api-')),app=await createGateway({dataDir:dir,port:0});t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
 const cookie=(await fetch(app.url)).headers.get('set-cookie').split(';')[0],response=await fetch(app.url+'/api/v1/system/status',{headers:{Cookie:cookie}}),data=(await response.json()).data;
 assert.ok(data.instance?.instanceId,'loaded backend identity required');assert.match(data.instance.codeFingerprint,/^[a-f0-9]{64}$/);assert.ok(data.instance.startedAt);assert.ok(Array.isArray(data.profiles));assert.ok(Array.isArray(data.monitor));assert.equal(data.sourceControl.captureState,'STOPPED');assert.equal(data.coordinator.active,null);
});
