import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Runtime} from '../src/runtime.js';
import {createGateway} from '../src/server.js';
import {LiveHookDaemon} from '../src/live-hook-daemon.js';
import {CaptureBridge} from '../src/capture-bridge.js';
test('a data directory has one owner and is reusable after orderly close',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-instance-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const first=await Runtime.open({dataDir:dir});
 let duplicate;try{await assert.rejects(async()=>{duplicate=await Runtime.open({dataDir:dir});},/DATA_DIRECTORY_BUSY/);}finally{await duplicate?.close();await first.close();}
 const next=await Runtime.open({dataDir:dir});await next.close();
});
test('new Gateway identifies its loaded backend and actual module state',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-instance-api-')),app=await createGateway({dataDir:dir,port:0});t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
 const cookie=(await fetch(app.url)).headers.get('set-cookie').split(';')[0],response=await fetch(app.url+'/api/v1/system/status',{headers:{Cookie:cookie}}),data=(await response.json()).data;
 assert.ok(data.instance?.instanceId,'loaded backend identity required');assert.match(data.instance.codeFingerprint,/^[a-f0-9]{64}$/);assert.ok(data.instance.startedAt);assert.equal(typeof data.instance.runtimeDirty,'boolean');assert.ok(Array.isArray(data.profiles));assert.ok(Array.isArray(data.monitor));assert.equal(data.sourceControl.captureState,'STOPPED');assert.equal(data.coordinator.active,null);
});

test('daemon uses the selected CaptureHost build and observes without binding a capture proxy',async t=>{
 const root=path.resolve(''),dir=await fs.mkdtemp(path.join(root,'.local','deployment-daemon-'));
 const seed=path.dirname(process.env.LW_CAPTURE_EXE||path.join(root,'src/capture/BarrageGrab/bin/Debug/LiveWorkbench.CaptureHost.exe'));
 for(const item of await fs.readdir(seed))if(/\.(exe|dll|config)$/i.test(item))await fs.copyFile(path.join(seed,item),path.join(dir,item));
 const previous=process.env.LW_CAPTURE_EXE,exe=path.join(dir,'LiveWorkbench.CaptureHost.exe');process.env.LW_CAPTURE_EXE=exe;
 const runtime=await Runtime.open({dataDir:path.join(dir,'data')}),bridge=new CaptureBridge(runtime),daemon=new LiveHookDaemon(runtime,bridge);
 t.after(async()=>{await daemon.close();await runtime.close();if(previous===undefined)delete process.env.LW_CAPTURE_EXE;else process.env.LW_CAPTURE_EXE=previous;await fs.rm(dir,{recursive:true,force:true});});
 await daemon.start();assert.equal(daemon.child?.spawnfile,exe);assert.equal(daemon.status.available,true);assert.equal(bridge.status.captureState,'STOPPED');
});
