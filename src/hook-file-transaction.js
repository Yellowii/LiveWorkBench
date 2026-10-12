import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function durableWrite(file,bytes){const handle=await fs.open(file,'wx');try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}}
async function replaceFile(file,bytes){
 const temporary=file+'.lwb-'+randomUUID()+'.tmp';await durableWrite(temporary,bytes);
 try{
  // Windows ReplaceFile preserves the destination ACL; rename inherits the temp ACL.
  if(process.platform==='win32')await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop';[IO.File]::Replace($env:LW_HOOK_TEMP,$env:LW_HOOK_TARGET,[NullString]::Value,$false)"],{windowsHide:true,env:{...process.env,LW_HOOK_TEMP:temporary,LW_HOOK_TARGET:file}});
  else await fs.rename(temporary,file);
 }catch(error){await fs.unlink(temporary).catch(()=>{});throw error;}
}
export async function planHookPatch(file,port){
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('INVALID_PROXY_PORT');
 file=await fs.realpath(file);const before=await fs.readFile(file),text=before.toString('utf8');
 if(!Buffer.from(text).equals(before))throw new Error('HOOK_ENCODING_UNCONFIRMED');
 const regex=/appendSwitch\((["'])proxy-server\1\s*,\s*(["'])([^"']+)\2\)/g,matches=[...text.matchAll(regex)];
 if(matches.length!==1||! /^(?:127\.0\.0\.1|localhost):\d+,direct:\/\/$/.test(matches[0][3]))throw new Error('HOOK_PATTERN_UNCONFIRMED');
 const match=matches[0],offset=match.index+match[0].indexOf(match[3]),target=`127.0.0.1:${port},direct://`;
 const after=Buffer.from(text.slice(0,offset)+target+text.slice(offset+match[3].length));
 return {file,beforeHash:sha(before),afterHash:sha(after),oldProxy:match[3],newProxy:target,before,after};
}
export async function applyHookPatch(plan,journalRoot,{authorized=false}={}){
 if(!authorized)throw new Error('ENVIRONMENT_AUTHORIZATION_REQUIRED');
 if(sha(await fs.readFile(plan.file))!==plan.beforeHash)throw new Error('HOOK_FILE_CHANGED');
 const folder=path.join(path.resolve(journalRoot),randomUUID());await fs.mkdir(folder,{recursive:true});const backup=path.join(folder,'index-original.bin');
 await durableWrite(backup,plan.before);
 const journal={file:plan.file,backup,beforeHash:plan.beforeHash,afterHash:plan.afterHash,preparedAt:new Date().toISOString()};
 await durableWrite(path.join(folder,'transaction.json'),JSON.stringify(journal));
 if(sha(await fs.readFile(plan.file))!==plan.beforeHash)throw new Error('HOOK_FILE_CHANGED');
 await replaceFile(plan.file,plan.after);return journal;
}
// Stage-one preparation is deliberately separate from applying the patch.
export async function prepareHookBackup(plan,journalRoot){
 if(sha(await fs.readFile(plan.file))!==plan.beforeHash||sha(plan.before)!==plan.beforeHash)throw new Error('HOOK_FILE_CHANGED');
 const folder=path.join(path.resolve(journalRoot),randomUUID());await fs.mkdir(folder,{recursive:true});
 const backup=path.join(folder,'index-original.bin');await durableWrite(backup,plan.before);
 const journal={file:plan.file,backup,beforeHash:plan.beforeHash,afterHash:plan.afterHash,oldProxy:plan.oldProxy,newProxy:plan.newProxy,preparedAt:new Date().toISOString(),applied:false};
 await durableWrite(path.join(folder,'prepared.json'),JSON.stringify(journal,null,2));
 return journal;
}
export async function restoreHookPatch(journal){
 if(sha(await fs.readFile(journal.file))!==journal.afterHash)throw new Error('HOOK_FILE_CHANGED');
 const bytes=await fs.readFile(journal.backup);if(sha(bytes)!==journal.beforeHash)throw new Error('HOOK_BACKUP_CHANGED');
 await replaceFile(journal.file,bytes);return {restored:true,contentHash:journal.beforeHash};
}
