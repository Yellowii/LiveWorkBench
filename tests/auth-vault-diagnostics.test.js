import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';import {LoginVault} from '../src/auth/login-vault.js';
const snapshot={cookies:[{name:'synthetic',value:'PRIVATE_SYNTHETIC_COOKIE_NEVER_LOG',domain:'.douyin.com',path:'/',expires:-1}],origins:[]};
test('successful DPAPI restore emits scalar diagnostics without credentials or vault identity',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-vault-diag-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const entries=[],v=new LoginVault(dir,{diagnostic:x=>entries.push(x)}),id='PRIVATE-VAULT-ID';await v.save(id,snapshot,true);assert.deepEqual(await v.load(id),snapshot);
 const read=entries.find(x=>x.operation==='read'&&x.result==='ok');assert.ok(read);assert.ok(read.durationMs>=0);assert.doesNotMatch(JSON.stringify(entries),/PRIVATE[_-]|cookies|\.vault|storageState/);
});
test('corrupt ciphertext retains the public error but records the actual DPAPI failure privately',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-vault-fail-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const entries=[],v=new LoginVault(dir,{diagnostic:x=>entries.push(x)}),id='PRIVATE-VAULT-ID';await fs.mkdir(v.directory);const original=Buffer.from('PRIVATE_CIPHERTEXT_NEVER_LOG');await fs.writeFile(v.file(id),original);
 await assert.rejects(()=>v.load(id),/AUTH_STATE_UNAVAILABLE/);assert.equal(entries.length,1);assert.equal(entries[0].stage,'decrypt');assert.equal(entries[0].result,'failed');assert.equal(entries[0].reason,'AUTH_DPAPI_UNPROTECT_FAILED');assert.equal(entries[0].exitCode,1);assert.doesNotMatch(JSON.stringify(entries),/PRIVATE[_-]|storageState|cookies/);assert.deepEqual(await fs.readFile(v.file(id)),original);
});
test('diagnostic callback failures cannot replace the actual credential read result',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-vault-observer-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const v=new LoginVault(dir,{diagnostic:()=>{throw Error('OBSERVER_FAILURE');}});assert.equal(await v.load('missing'),null);await v.save('synthetic',snapshot,true);assert.deepEqual(await v.load('synthetic'),snapshot);
});

test('the external helper diagnoses existing hosts without changing stdout or logging credentials',async t=>{
 const dir=await fs.mkdtemp(path.resolve('.local/lw-helper-diag-')),previous=process.env.LW_DATA_DIR;t.after(async()=>{if(previous===undefined)delete process.env.LW_DATA_DIR;else process.env.LW_DATA_DIR=previous;await fs.rm(dir,{recursive:true,force:true});});process.env.LW_DATA_DIR=dir;
 const v=new LoginVault(dir),id='PRIVATE-VAULT-ID';await v.save(id,snapshot,true);assert.deepEqual(await v.load(id),snapshot);await fs.writeFile(v.file(id),Buffer.from('PRIVATE_CIPHERTEXT_NEVER_LOG'));await assert.rejects(()=>v.load(id),/AUTH_STATE_UNAVAILABLE/);
 const file=path.join(dir,'diagnostics','auth-dpapi-v1.jsonl'),text=await fs.readFile(file,'utf8'),entries=text.trim().split('\n').map(x=>JSON.parse(x));assert.ok(entries.some(x=>x.result==='ok'&&x.action==='unprotect'));assert.ok(entries.some(x=>x.reason==='AUTH_DPAPI_UNPROTECT_FAILED'));assert.doesNotMatch(text,/PRIVATE|cookies|storageState/);
 await fs.writeFile(file,'x'.repeat(65530));await fs.writeFile(v.file(id),Buffer.from('PRIVATE_CIPHERTEXT_NEVER_LOG'));await assert.rejects(()=>v.load(id),/AUTH_STATE_UNAVAILABLE/);assert.ok((await fs.stat(file)).size<65536);assert.ok((await fs.stat(file+'.1')).size<=65536);
});

test('DPAPI consumes a complete bounded request without waiting for parent stdin EOF',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-vault-frame-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const v=new LoginVault(dir);await v.save('synthetic',snapshot,true);const bytes=await fs.readFile(v.file('synthetic'));
 const result=await new Promise(resolve=>{const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('../src/auth/dpapi.ps1',import.meta.url))],{windowsHide:true,stdio:['pipe','pipe','pipe']});let output='',timedOut=false;const timer=setTimeout(()=>{timedOut=true;child.kill();},2500);child.stdout.on('data',b=>output+=b);child.stderr.resume();child.stdin.on('error',()=>{});child.on('close',code=>{clearTimeout(timer);resolve({code,timedOut,output});});child.stdin.write(JSON.stringify({action:'unprotect',data:bytes.toString('base64')}));});
 assert.equal(result.timedOut,false,'helper waited for EOF after receiving the entire JSON request');assert.equal(result.code,0);const decoded=JSON.parse(Buffer.from(result.output.trim(),'base64').toString('utf8'));assert.deepEqual(decoded.storageState,snapshot);
});
