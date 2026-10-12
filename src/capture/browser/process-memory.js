import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export async function browserMemory(browser){if(process.platform!=='win32'||!browser?.isConnected?.())return {available:false,bytes:null,reason:'BROWSER_NOT_RUNNING'};
 let session;try{session=await browser.newBrowserCDPSession();const {processInfo}=await session.send('SystemInfo.getProcessInfo'),ids=processInfo.map(x=>x.id).filter(x=>Number.isSafeInteger(x)&&x>0);
  if(!ids.length)return {available:false,bytes:null,reason:'PROCESS_LIST_UNAVAILABLE'};
  return await new Promise(resolve=>{const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('./process-memory.ps1',import.meta.url))],{windowsHide:true,stdio:['pipe','pipe','pipe']});let output='';const timer=setTimeout(()=>child.kill(),5000);child.stdout.on('data',b=>{if(output.length<4096)output+=b;});child.stderr.resume();child.on('error',()=>{clearTimeout(timer);resolve({available:false,bytes:null,reason:'PROCESS_MEMORY_UNAVAILABLE'});});child.on('close',code=>{clearTimeout(timer);try{const value=JSON.parse(output);if(code!==0||!value.processCount)throw new Error();resolve({available:true,bytes:value.bytes,processCount:value.processCount,scope:'dedicated-browser-working-set-sum',sampledAt:new Date().toISOString()});}catch{resolve({available:false,bytes:null,reason:'PROCESS_MEMORY_UNAVAILABLE'});}});child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(ids));});
 }catch{return {available:false,bytes:null,reason:'BROWSER_CDP_UNAVAILABLE'};}finally{await session?.detach().catch(()=>{});}
}
