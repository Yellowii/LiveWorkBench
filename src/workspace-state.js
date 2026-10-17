import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
// Only inert documentation is exempt. Unknown paths and unverifiable Git fail closed.
export function workspaceState(root){
 try{
  const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore'],maxBuffer:8*1024*1024,timeout:10000});
  const commit=git('rev-parse','HEAD').trim();if(!/^[a-f0-9]{40,64}$/.test(commit))throw new Error('INVALID_HEAD');
  const files=new Set([...git('diff','--no-ext-diff','--no-renames','--name-only','-z').split('\0'),...git('diff','--cached','--no-ext-diff','--no-renames','--name-only','-z').split('\0'),...git('ls-files','--others','--exclude-standard','-z').split('\0')].filter(Boolean));
  return {commit,dirty:files.size>0,runtimeDirty:[...files].some(file=>!(file==='README.md'||/^docs\/(?:[^/]+\/)*[^/]+\.md$/.test(file)))};
 }catch{return {commit:null,dirty:null,runtimeDirty:null};}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(workspaceState(process.argv[2])));
