import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
let planHookPatch,applyHookPatch,restoreHookPatch;
try {({planHookPatch,applyHookPatch,restoreHookPatch}=await import('../src/hook-file-transaction.js'));}catch{}
test('Hook file changes only the proxy argument and refuses to overwrite later edits',async t=>{
 assert.equal(typeof planHookPatch,'function','A reviewable reversible Hook patch is required');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-hook-fixture-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const file=path.join(dir,'index.js'),original='app.commandLine.appendSwitch("proxy-server","127.0.0.1:8827,direct://");keepIntegrity();';
 await fs.writeFile(file,original);const plan=await planHookPatch(file,18827);
 assert.equal(await fs.readFile(file,'utf8'),original);
 await assert.rejects(applyHookPatch(plan,path.join(dir,'journal')),/ENVIRONMENT_AUTHORIZATION_REQUIRED/);
 const journal=await applyHookPatch(plan,path.join(dir,'journal'),{authorized:true});
 assert.equal(await fs.readFile(file,'utf8'),'app.commandLine.appendSwitch("proxy-server","127.0.0.1:18827,direct://");keepIntegrity();');
 await fs.writeFile(file,'subsequent user edit');await assert.rejects(restoreHookPatch(journal),/HOOK_FILE_CHANGED/);
 assert.equal(await fs.readFile(file,'utf8'),'subsequent user edit');
 await fs.writeFile(file,'app.commandLine.appendSwitch("proxy-server","127.0.0.1:18827,direct://");keepIntegrity();');
 await restoreHookPatch(journal);assert.equal(await fs.readFile(file,'utf8'),original);
});
