import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
const douyin=host=>host==='douyin.com'||host.endsWith('.douyin.com');
export function filterState(state){if(!state||!Array.isArray(state.cookies)||!Array.isArray(state.origins))throw new Error('AUTH_STATE_INVALID');return {cookies:state.cookies.filter(c=>typeof c.domain==='string'&&douyin(c.domain.replace(/^\./,''))&&typeof c.name==='string'&&typeof c.value==='string'&&(c.expires===-1||c.expires>Date.now()/1000)),origins:state.origins.filter(o=>{try{const u=new URL(o.origin);return u.protocol==='https:'&&douyin(u.hostname)&&!u.port&&Array.isArray(o.localStorage);}catch{return false;}})};}
const dpapiReasons=new Set(['AUTH_DPAPI_ASSEMBLY_FAILED','AUTH_DPAPI_INPUT_FAILED','AUTH_DPAPI_PROTECT_FAILED','AUTH_DPAPI_UNPROTECT_FAILED','AUTH_DPAPI_ACTION_INVALID','AUTH_DPAPI_OUTPUT_FAILED']);
async function protect(action,bytes){
 if(process.platform!=='win32')throw new Error('AUTH_PROTECTION_UNAVAILABLE');
 return new Promise((resolve,reject)=>{
  const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('./dpapi.ps1',import.meta.url))],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  const chunks=[];let size=0,stderr='',timedOut=false,oversized=false;
  const fail=(reason,extra={})=>Object.assign(new Error('AUTH_PROTECTION_FAILED'),{diagnostic:{reason,...extra}});
  const timer=setTimeout(()=>{timedOut=true;child.kill();},10000);
  child.stdout.on('data',b=>{size+=b.length;if(size>4*1024*1024){oversized=true;child.kill();}else chunks.push(b);});
  child.stderr.on('data',b=>{if(stderr.length<512)stderr+=b.toString('utf8').slice(0,512-stderr.length);});
  child.on('error',error=>{clearTimeout(timer);reject(fail('AUTH_DPAPI_SPAWN_FAILED',{systemCode:/^[A-Z_]{1,40}$/.test(error.code||'')?error.code:null}));});
  child.on('close',(exitCode,signal)=>{
   clearTimeout(timer);
   if(exitCode!==0||timedOut||oversized){
    let detail;try{detail=JSON.parse(stderr);}catch{}
    const reason=timedOut?'AUTH_DPAPI_TIMEOUT':oversized?'AUTH_DPAPI_OUTPUT_LIMIT':dpapiReasons.has(detail?.code)?detail.code:'AUTH_DPAPI_PROCESS_FAILED';
    reject(fail(reason,{exitCode:Number.isInteger(exitCode)?exitCode:null,signal:['SIGTERM','SIGKILL'].includes(signal)?signal:null,hresult:Number.isInteger(detail?.hresult)?detail.hresult:null}));
   }else resolve(Buffer.from(Buffer.concat(chunks).toString('utf8').trim(),'base64'));
  });
  child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({action,data:bytes.toString('base64')}));
 });
}
export class LoginVault{
 constructor(dataDir,{diagnostic=()=>{}}={}){this.directory=path.join(dataDir,'auth');this.queue=Promise.resolve();this.diagnostic=diagnostic;}
 note(value){try{this.diagnostic(value);}catch{}}
 file(id){if(!/^[a-zA-Z0-9-]{1,64}$/.test(id))throw new Error('AUTH_REF_INVALID');return path.join(this.directory,id+'.vault');}
 serial(fn){const job=this.queue.catch(()=>{}).then(fn);this.queue=job;return job;}
 save(id,state,optIn){return this.serial(async()=>{if(optIn!==true)throw new Error('AUTH_PERSIST_NOT_ENABLED');const value={version:1,savedAt:new Date().toISOString(),storageState:filterState(state)},plain=Buffer.from(JSON.stringify(value));if(plain.length>1024*1024)throw new Error('AUTH_STATE_TOO_LARGE');const encrypted=await protect('protect',plain);plain.fill(0);await fs.mkdir(this.directory,{recursive:true});const target=this.file(id),temp=target+'.'+randomUUID()+'.tmp';try{const handle=await fs.open(temp,'wx',0o600);try{await handle.writeFile(encrypted);await handle.sync();}finally{await handle.close();}await fs.rename(temp,target);}finally{await fs.rm(temp,{force:true});}return {saved:true,protection:'Windows-DPAPI-CurrentUser'};});}
 async read(id){
  const started=performance.now();let stage='file';
  try{
   const encrypted=await fs.readFile(this.file(id));if(encrypted.length>2*1024*1024)throw new Error('AUTH_STATE_TOO_LARGE');
   stage='decrypt';const plain=await protect('unprotect',encrypted);
   try{stage='decode';const value=JSON.parse(plain.toString('utf8'));this.note({operation:'read',result:'ok',stage,durationMs:Math.round(performance.now()-started)});return value;}finally{plain.fill(0);}
  }catch(error){
   if(error.code==='ENOENT')return null;
   const reason=error.diagnostic?.reason||(stage==='file'?'AUTH_VAULT_FILE_READ_FAILED':stage==='decode'?'AUTH_VAULT_DECODE_FAILED':'AUTH_DPAPI_PROCESS_FAILED');
   this.note({operation:'read',result:'failed',stage,reason,durationMs:Math.round(performance.now()-started),systemCode:/^[A-Z_]{1,40}$/.test(error.code||'')?error.code:null,exitCode:error.diagnostic?.exitCode??null,signal:error.diagnostic?.signal??null,hresult:error.diagnostic?.hresult??null});
   throw new Error('AUTH_STATE_UNAVAILABLE');
  }
 }
 async load(id){const saved=await this.read(id);return saved?filterState(saved.storageState):null;}
 async status(id){const saved=await this.read(id);return {configured:Boolean(saved),savedAt:saved?.savedAt||null,protection:'Windows-DPAPI-CurrentUser',validity:'UNKNOWN',reason:'Official account check required; saved state alone is not authentication evidence'};}
 async inspect(id){try{const entry=await fs.stat(this.file(id));return {configured:entry.isFile()};}catch(error){if(error.code==='ENOENT')return {configured:false};throw new Error('AUTH_STATE_UNAVAILABLE');}}
 clear(id){return this.serial(async()=>{await fs.rm(this.file(id),{force:true});return {cleared:true,validity:'UNKNOWN'};});}
}
