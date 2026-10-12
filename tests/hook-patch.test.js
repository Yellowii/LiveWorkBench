import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
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
test('approved synthetic replacement and rollback preserve the installation file ACL',async t=>{
 if(process.platform!=='win32')return t.skip('Windows file security metadata');
 const run=promisify(execFile),dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-hook-acl-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const file=path.join(dir,'index.js');await fs.writeFile(file,'app.commandLine.appendSwitch("proxy-server","127.0.0.1:8827,direct://");');
 const ps=code=>run('pwsh',['-NoProfile','-NonInteractive','-Command',code],{env:{...process.env,LW_ACL_TEST:file}});
 await ps("$p=$env:LW_ACL_TEST;$a=Get-Acl -LiteralPath $p;$a.SetAccessRuleProtection($true,$false);$a.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.WindowsIdentity]::GetCurrent().User,'FullControl','Allow'));Set-Acl -LiteralPath $p -AclObject $a");
 const before=(await ps('(Get-Acl -LiteralPath $env:LW_ACL_TEST).Sddl')).stdout.trim();
 const journal=await applyHookPatch(await planHookPatch(file,18827),path.join(dir,'journal'),{authorized:true});
 assert.ok((await ps('(Get-Acl -LiteralPath $env:LW_ACL_TEST).Sddl')).stdout.trim()===before,'original ACL must survive patch');
 await restoreHookPatch(journal);
 assert.ok((await ps('(Get-Acl -LiteralPath $env:LW_ACL_TEST).Sddl')).stdout.trim()===before,'original ACL must survive rollback');
});
test('a prepared private backup writes no installation bytes and detects drift before later approval',async t=>{
 const {prepareHookBackup}=await import('../src/hook-file-transaction.js');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-hook-prepare-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const file=path.join(dir,'index.js'),original='app.commandLine.appendSwitch("proxy-server","127.0.0.1:8827,direct://");';
 await fs.writeFile(file,original);const plan=await planHookPatch(file,18827);
 const journal=await prepareHookBackup(plan,path.join(dir,'private'));
 assert.equal(await fs.readFile(file,'utf8'),original);
 assert.equal(await fs.readFile(journal.backup,'utf8'),original);
 assert.equal(journal.applied,false);
 await fs.writeFile(file,'later user change');
 await assert.rejects(prepareHookBackup(plan,path.join(dir,'next')),/HOOK_FILE_CHANGED/);
});
