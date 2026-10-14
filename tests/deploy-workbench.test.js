import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const powershell='powershell.exe';
const git=(dir,...args)=>execFileSync('git',['-C',dir,...args],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
const until=async fn=>{const end=Date.now()+15000;while(!await fn()){if(Date.now()>end)throw new Error('FIXTURE_TIMEOUT');await new Promise(r=>setTimeout(r,80));}};
const quote=value=>"'"+value.replaceAll("'","''")+"'";
async function fixture(t,{capture='STOPPED',login=false,same=false,build='ok',foreign=false,start='ok',leaseMatch=true,ownerMatch=true,running=true,action='Update',unbound=false,portReadable=true}={}){
 const dir=await fs.mkdtemp(path.join(root,'.local','deploy-test-'));await fs.mkdir(path.join(dir,'tools'));await fs.mkdir(path.join(dir,'src'));await fs.mkdir(path.join(dir,'.local'));
 for(const name of ['restart-dev-workbench.ps1','deploy-dev-workbench.ps1'])await fs.copyFile(path.join(root,'tools',name),path.join(dir,'tools',name));
 await fs.writeFile(path.join(dir,'.gitignore'),'.local/\ndata/\n');
 const server=`import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {DatabaseSync} from 'node:sqlite';
 const data=process.env.LW_DATA_DIR;fs.mkdirSync(data,{recursive:true});const db=new DatabaseSync(path.join(data,'.instance.sqlite'));db.exec('CREATE TABLE IF NOT EXISTS owner(id INTEGER PRIMARY KEY,pid INTEGER,token TEXT)');db.prepare('INSERT OR REPLACE INTO owner VALUES(1,?,?)').run(process.pid,'fixture');
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),old=process.env.LW_FIXTURE_COMMIT,commit=old||head;const flags=()=>JSON.parse(fs.readFileSync('.local/flags.json','utf8'));
 if(!old&&process.env.LW_FIXTURE_START==='exit')process.exit(7);
 const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Set-Cookie','lw_session=SYNTHETIC_DEPLOY; HttpOnly; SameSite=Strict');res.end('fixture');return;}res.setHeader('Content-Type','application/json');const f=flags();let data;if(req.url==='/api/v1/system/status')data={backendReady:true,instance:{pid:process.pid,commit:!old&&process.env.LW_FIXTURE_START==='wrong'? '0'.repeat(40):commit,dirty:false,instanceId:String(process.pid)},capture:{captureState:f.capture},accounts:{loginWindowOpen:f.login}};else if(req.url==='/api/v1/health')data={status:'ok'};else{res.statusCode=404;data=null;}res.end(JSON.stringify({data}));});if(process.env.LW_FIXTURE_UNBOUND)setInterval(()=>{},1000);else server.listen(Number(process.env.LW_PORT),'127.0.0.1');`;
 await fs.writeFile(path.join(dir,'src','server.js'),server);if(foreign)await fs.writeFile(path.join(dir,'src','other.js'),server);
 await fs.writeFile(path.join(dir,'src','runtime.js'),build==='runtime-fail'?'throw new Error("SYNTHETIC_RUNTIME_FAILURE");':'export class Runtime {static async open(){return {async close(){}};}}');
 const seed=path.dirname(process.env.LW_CAPTURE_EXE||path.join(root,'.local','login-boundary','capture-build','LiveWorkbench.CaptureHost.exe'));
 const builder=`param([string]$OutputDirectory)\n$ErrorActionPreference='Stop'\nSet-Content -LiteralPath (Join-Path $PSScriptRoot '../.local/built') 'yes'\nif (${quote(build)} -eq 'fail') { throw 'SYNTHETIC_BUILD_FAILED' }\n$null=New-Item -ItemType Directory -Path $OutputDirectory -Force\nGet-ChildItem -LiteralPath ${quote(seed)} -File | Where-Object {$_.Extension -in '.exe','.dll','.config'} | Copy-Item -Destination $OutputDirectory\nif (${quote(build)} -eq 'changed') { Add-Content -LiteralPath (Join-Path $PSScriptRoot '../src/server.js') '// source changed during build' }\nif (${quote(build)} -eq 'busy') { Set-Content -LiteralPath (Join-Path $PSScriptRoot '../.local/flags.json') '{"capture":"CONNECTED","login":false}' }\n`;
 await fs.writeFile(path.join(dir,'tools','build-capture.ps1'),builder);
 git(dir,'init','-q');git(dir,'add','.');git(dir,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','old');const old=git(dir,'rev-parse','HEAD');
 await fs.writeFile(path.join(dir,'revision.txt'),'new\n');git(dir,'add','revision.txt');git(dir,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','new');const head=git(dir,'rev-parse','HEAD');
 const sock=net.createServer();await new Promise(r=>sock.listen(0,'127.0.0.1',r));const port=sock.address().port;await new Promise(r=>sock.close(r));
 const data=path.join(dir,'data','pipeline-20261013');await fs.mkdir(data,{recursive:true});await fs.writeFile(path.join(data,'preserve.bin'),'SYNTHETIC_PRIVATE_DATA_DO_NOT_REPLACE');await fs.writeFile(path.join(dir,'.local','flags.json'),JSON.stringify({capture,login}));
 const child=spawn(process.execPath,[path.join(dir,'src',foreign?'other.js':'server.js')],{cwd:dir,windowsHide:true,stdio:'ignore',env:{...process.env,LW_PORT:String(port),LW_DATA_DIR:data,LW_FIXTURE_COMMIT:same?head:old,LW_FIXTURE_UNBOUND:unbound?'1':''}});
 const children=[child];t.after(async()=>{for(const c of children)c.kill();const lease=path.join(data,'.instance.sqlite');try{const {DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(lease,{readOnly:true});const pid=db.prepare('SELECT pid FROM owner WHERE id=1').get()?.pid;db.close();if(pid&&pid!==child.pid){const info=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`],{encoding:'utf8',windowsHide:true});if(info.includes(dir))process.kill(pid);}}catch{}await new Promise(r=>setTimeout(r,300));if(process.env.LW_KEEP_DEPLOY_FIXTURE!=='1')await fs.rm(dir,{recursive:true,force:true});});
 if(unbound)await until(async()=>{try{return (await fs.stat(path.join(data,'.instance.sqlite'))).size>0;}catch{return false;}});
 else await until(async()=>{try{return (await fetch('http://127.0.0.1:'+port)).ok;}catch{return false;}});
 if(!running){child.kill();await until(()=>child.exitCode!==null||child.signalCode!==null);}
 if(!leaseMatch){const {DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(path.join(data,'.instance.sqlite'));db.prepare('UPDATE owner SET pid=? WHERE id=1').run(process.pid);db.close();}
 const runner=path.join(dir,'.local','run.ps1');await fs.writeFile(runner,`$ErrorActionPreference='Stop'\n[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)\n. ${quote(path.join(dir,'tools','deploy-dev-workbench.ps1'))}\n${ownerMatch?'':'function Invoke-CimMethod {param($InputObject,$MethodName) return [pscustomobject]@{ReturnValue=0;Sid="SYNTHETIC_OTHER_OWNER"}}'}${portReadable?'':'function Get-NetTCPConnection { [CmdletBinding()] param($State,$LocalPort) Write-Error "SYNTHETIC_PORT_QUERY_DENIED" }'}\ntry { $context=New-LwDeploymentContext -WorkspaceRoot ${quote(dir)} -Port ${port}; $result=Invoke-LwDeployment -Context $context -Action ${action} -StartupTimeoutSeconds 4; Write-Output ('RESULT:'+($result | ConvertTo-Json -Compress -Depth 5)); exit 0 } catch { Write-Output ('FAIL:'+ $_.Exception.Message); exit 1 }\n`);
 const run=()=>new Promise(resolve=>{const p=spawn(powershell,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',runner],{cwd:dir,windowsHide:true,env:{...process.env,LW_FIXTURE_START:start}});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.on('exit',code=>resolve({code,output}));});
 return {dir,data,child,head,old,port,run};
}

for(const [name,options,reason] of [
 ['capture active',{capture:'CONNECTED'},'CAPTURE_NOT_STOPPED'],
 ['login open',{login:true},'LOGIN_WINDOW_OPEN'],
 ['foreign process',{foreign:true},'OWNED_PROCESS_MISMATCH'],
 ['data directory owner differs',{leaseMatch:false},'DATA_DIRECTORY_OWNER_MISMATCH'],
 ['Windows process owner differs',{ownerMatch:false},'PROCESS_OWNER_MISMATCH'],
 ['build fails',{build:'fail'},'CAPTURE_BUILD_FAILED'],
 ['runtime dependencies fail',{build:'runtime-fail'},'NODE_RUNTIME_VALIDATION_FAILED'],
 ['workspace changes during build',{build:'changed'},'WORKSPACE_DIRTY'],
 ['capture starts during build',{build:'busy'},'CAPTURE_NOT_STOPPED']
])test('one-click deployment preserves the old service when '+name,async t=>{
 const f=await fixture(t,options),r=await f.run();assert.equal(r.code,1,r.output);assert.ok(r.output.includes(reason),r.output);assert.equal(f.child.exitCode,null);assert.equal(await fs.readFile(path.join(f.data,'preserve.bin'),'utf8'),'SYNTHETIC_PRIVATE_DATA_DO_NOT_REPLACE');
});

for(const action of ['Start','Update'])test('cold '+action.toLowerCase()+' validates and starts with a stale, dead lease without replacing data',async t=>{
 const f=await fixture(t,{running:false,action}),r=await f.run();assert.equal(r.code,0,r.output);const result=JSON.parse(r.output.split('RESULT:')[1].trim());assert.equal(result.commit,f.head);assert.ok(result.pid>0);assert.equal(await fs.readFile(path.join(f.data,'preserve.bin'),'utf8'),'SYNTHETIC_PRIVATE_DATA_DO_NOT_REPLACE');
});

test('start of an existing healthy instance keeps its PID even when a newer HEAD exists',async t=>{
 const f=await fixture(t,{action:'Start',build:'fail'}),r=await f.run();assert.equal(r.code,0,r.output);assert.equal(f.child.exitCode,null);assert.ok(r.output.includes('unchanged'));await assert.rejects(fs.access(path.join(f.dir,'.local','built')));
});

test('stop ends only the verified idle instance and leaves data; repeating stop is harmless',async t=>{
 const f=await fixture(t,{action:'Stop',build:'fail'}),r=await f.run();assert.equal(r.code,0,r.output);await until(()=>f.child.exitCode!==null);assert.ok(r.output.includes('stopped'));assert.equal(await fs.readFile(path.join(f.data,'preserve.bin'),'utf8'),'SYNTHETIC_PRIVATE_DATA_DO_NOT_REPLACE');assert.equal((await f.run()).code,0);await assert.rejects(fs.access(path.join(f.dir,'.local','built')));
});

for(const [name,options,reason]of [['capture',{capture:'CONNECTED'},'CAPTURE_NOT_STOPPED'],['login',{login:true},'LOGIN_WINDOW_OPEN'],['foreign',{foreign:true},'OWNED_PROCESS_MISMATCH']])test('stop refuses '+name+' without terminating the process',async t=>{
 const f=await fixture(t,{...options,action:'Stop'}),r=await f.run();assert.equal(r.code,1,r.output);assert.ok(r.output.includes(reason),r.output);assert.equal(f.child.exitCode,null);
});

test('cold start refuses a live lease owner even when the port is free',async t=>{
 const f=await fixture(t,{running:false,leaseMatch:false,action:'Start'}),r=await f.run();assert.equal(r.code,1,r.output);assert.ok(r.output.includes('DATA_DIRECTORY_STILL_OWNED'),r.output);await assert.rejects(fs.access(path.join(f.dir,'.local','built')));
});

test('an owned process that has not bound its port is not treated as stopped',async t=>{
 const f=await fixture(t,{unbound:true,action:'Start'}),r=await f.run();assert.equal(r.code,1,r.output);assert.ok(r.output.includes('DATA_DIRECTORY_STILL_OWNED'),r.output);assert.equal(f.child.exitCode,null);
});

test('an already loaded target version keeps its PID and skips build/restart',async t=>{
 const f=await fixture(t,{same:true,build:'fail'}),r=await f.run();assert.equal(r.code,0,r.output);assert.ok(r.output.includes('unchanged'),r.output);assert.equal(f.child.exitCode,null);await assert.rejects(fs.access(path.join(f.dir,'.local','built')));
});

test('protected deployment validates a real stdio CaptureHost, waits for old exit, then verifies the new PID/commit/data owner',async t=>{
 const f=await fixture(t),r=await f.run();assert.equal(r.code,0,r.output);await until(()=>f.child.exitCode!==null);const result=JSON.parse(r.output.split('RESULT:')[1].trim());assert.equal(result.commit,f.head);assert.notEqual(result.pid,f.child.pid);assert.equal(result.status,'deployed');assert.match(result.captureSha256,/^[a-f0-9]{64}$/);assert.equal(await fs.readFile(path.join(f.data,'preserve.bin'),'utf8'),'SYNTHETIC_PRIVATE_DATA_DO_NOT_REPLACE');
});

for(const mode of ['exit','wrong'])test('startup '+mode+' cannot be reported as a successful deployment',async t=>{
 const f=await fixture(t,{start:mode}),r=await f.run();assert.equal(r.code,1,r.output);assert.ok(r.output.includes(mode==='exit'?'NEW_PROCESS_EXITED':'NEW_COMMIT_MISMATCH'),r.output);assert.equal(await fs.readFile(path.join(f.data,'preserve.bin'),'utf8'),'SYNTHETIC_PRIVATE_DATA_DO_NOT_REPLACE');
});

test('double-click BAT keeps Chinese progress/errors visible and preserves the PowerShell exit code',async t=>{
 const dir=await fs.mkdtemp(path.join(root,'.local','bat-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));await fs.mkdir(path.join(dir,'tools'));await fs.copyFile(path.join(root,'tools/workbench-action.bat'),path.join(dir,'tools/workbench-action.bat'));
 for(const [name,action,success,choice]of [['一键更新工作台.bat','Update','本地版本检查已完成'],['启动工作台.bat','Start','启动检查已完成'],['停止工作台.bat','Stop','停止检查已完成'],['工作台管理.bat','Start','启动检查已完成','1'],['工作台管理.bat','Stop','停止检查已完成','2'],['工作台管理.bat','Update','本地版本检查已完成','3']]){
  const bat=path.join(dir,name);await fs.copyFile(path.join(root,name),bat);
  for(const exit of [0,3]){await fs.writeFile(path.join(dir,'tools','deploy-dev-workbench.ps1'),'\ufeffparam([string]$Action)\r\n[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)\r\nWrite-Host "中文执行进度：隔离入口测试"\r\nWrite-Host "ACTION:$Action"\r\nWrite-Host "失败原因：合成测试"\r\nexit '+exit+'\r\n');const result=await new Promise(resolve=>{const c=spawn('cmd.exe',['/d','/c','call',bat],{cwd:dir,windowsHide:true});let output='';c.stdout.on('data',b=>output+=b);c.stderr.on('data',b=>output+=b);c.stdin.end(choice?choice+'\r\n\r\n':'\r\n');c.on('exit',code=>resolve({code,output}));});assert.equal(result.code,exit,result.output);assert.ok(result.output.includes('中文执行进度'),result.output);assert.ok(result.output.includes('ACTION:'+action),result.output);assert.ok(result.output.includes(exit===0?success:'操作未成功'),result.output);}
 }
});

test('port inspection failure is never interpreted as an idle service',async t=>{
 const f=await fixture(t,{running:false,action:'Start',portReadable:false}),r=await f.run();assert.equal(r.code,1,r.output);assert.ok(r.output.includes('PORT_STATUS_UNAVAILABLE'),r.output);await assert.rejects(fs.access(path.join(f.dir,'.local','built')));
});
