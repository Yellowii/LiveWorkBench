import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
let prepareParser;
try { ({prepareParser}=await import('../tools/setup-parser.mjs')); } catch {}

test('parser preparation checks every source before writing and preserves existing files',async t=>{
  assert.equal(typeof prepareParser,'function','A verified local parser preparation entry is required');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-prepare-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const sourceDir=path.join(dir,'source'),targetDir=path.join(dir,'target');
  await fs.mkdir(sourceDir);await fs.mkdir(targetDir);
  const text='synthetic parser fixture';
  const manifest=[{file:'parser.js',sha256:createHash('sha256').update(text).digest('hex')}];
  await fs.writeFile(path.join(sourceDir,'parser.js'),'altered');
  await assert.rejects(prepareParser({sourceDir,targetDir,manifest}),/PARSER_SOURCE_HASH_MISMATCH/);
  assert.deepEqual(await fs.readdir(targetDir),[]);
  await fs.writeFile(path.join(sourceDir,'parser.js'),text);
  await prepareParser({sourceDir,targetDir,manifest});
  assert.equal(await fs.readFile(path.join(targetDir,'parser.js'),'utf8'),text);
  await fs.writeFile(path.join(targetDir,'parser.js'),'local change');
  await assert.rejects(prepareParser({sourceDir,targetDir,manifest}),/PARSER_TARGET_CHANGED/);
  assert.equal(await fs.readFile(path.join(targetDir,'parser.js'),'utf8'),'local change');
});
