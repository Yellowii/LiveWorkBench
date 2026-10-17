import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {workspaceState} from '../src/workspace-state.js';
const git=(dir,...args)=>execFileSync('git',['-C',dir,...args],{stdio:'pipe'});
test('workspace state retains dirty truth but permits only Markdown documentation',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-workspace-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));await fs.mkdir(path.join(dir,'docs'));
 await fs.writeFile(path.join(dir,'docs','tracked.md'),'initial');await fs.writeFile(path.join(dir,'app.js'),'initial');git(dir,'init','-q');git(dir,'add','.');git(dir,'-c','user.name=Fixture','-c','user.email=f@example.invalid','commit','-qm','initial');
 assert.equal(workspaceState(dir).dirty,false);await fs.writeFile(path.join(dir,'docs','tracked.md'),'user draft');await fs.writeFile(path.join(dir,'docs','中文 draft.md'),'untracked draft');
 assert.equal(workspaceState(dir).dirty,true);assert.equal(workspaceState(dir).runtimeDirty,false);
 for(const file of ['docs/evil.js','docs/script.md.js','package.json','public.js']){await fs.writeFile(path.join(dir,file),'changed');assert.equal(workspaceState(dir).runtimeDirty,true,file);await fs.unlink(path.join(dir,file));}
 await fs.writeFile(path.join(dir,'app.js'),'staged edit');git(dir,'add','app.js');await fs.writeFile(path.join(dir,'app.js'),'initial');assert.equal(workspaceState(dir).runtimeDirty,true,'staged code must still block');git(dir,'reset','-q','HEAD','app.js');
 await fs.rename(path.join(dir,'app.js'),path.join(dir,'docs','renamed.md'));assert.equal(workspaceState(dir).runtimeDirty,true,'renaming code to documentation must block');
});
test('unverifiable Git is fail closed',async t=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-no-git-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));assert.deepEqual(workspaceState(dir),{commit:null,dirty:null,runtimeDirty:null});});
