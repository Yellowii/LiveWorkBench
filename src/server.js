import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {WebSocketServer} from 'ws';
import {Runtime} from './runtime.js';
import {CaptureBridge} from './capture-bridge.js';
import {runHistorical} from './historical-source.js';
import {LiveHookDaemon} from './live-hook-daemon.js';
import {publicProjection} from './public-projection.js';
import {SourceController} from './source-controller.js';
import {LogExports} from './log-export.js';
import {GatewaySocketHub} from './gateway-websocket.js';
import {ProfileStore} from './profiles/profile-store.js';
import {LiveMonitor} from './monitor/live-monitor.js';
import {MonitorCoordinator} from './coordinator/monitor-coordinator.js';
import {HookTargetMatcher} from './targets/hook-target-matcher.js';
import {loadedInstance} from './instance.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publicDir=path.join(root,'public');
export async function createGateway({dataDir,port=18780,settings={}}={}){
  const instance=loadedInstance();
  const runtime=await Runtime.open({dataDir:dataDir||path.join(root,'data')}),bridge=new CaptureBridge(runtime),daemon=new LiveHookDaemon(runtime,bridge);await daemon.start();
  const projection=await publicProjection(runtime.dataDir,{allowPrivateDetails:settings.allowPrivateDetails===true}),publicSafe=projection.project;
  const sources=new SourceController(runtime,bridge,settings);
  const profiles=new ProfileStore(runtime.store),monitor=new LiveMonitor(profiles);
  const hookMatcher=new HookTargetMatcher(profiles);runtime.captureTargets=hookMatcher;sources.hookMatcher=hookMatcher;
  monitor.on('monitor.updated',data=>runtime.emit('monitor.updated',data));
  monitor.on('monitor.event',data=>runtime.log('MONITOR_STATE_CHANGED',{profileId:data.profileId,state:data.state,stateVersion:data.stateVersion,operationId:data.operationId}));
  monitor.on('monitor.error',data=>runtime.log(data.code,{profileId:data.profileId}));
  const coordinator=new MonitorCoordinator({profiles,monitor,sources,onPlatformEvidence:e=>runtime.observePlatformEvidence(e),log:(code,details)=>runtime.log(code,details)});
  coordinator.on('coordinator.updated',data=>runtime.emit('coordinator.updated',data));
  hookMatcher.on('match.updated',data=>{daemon.targetObserved(data);runtime.emit('hook.match.updated',data);coordinator.changed();});
  const exportsProjection=await publicProjection(runtime.dataDir),logExports=new LogExports(runtime,exportsProjection.project);
  const token=randomUUID();const commands=new Map(),jobs=new Set();let url;
  const ok=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({schemaVersion:'1',requestId:randomUUID(),data:publicSafe(data),serverTime:new Date().toISOString()}));};
  const fail=(res,code,status=400)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({schemaVersion:'1',error:{code,message:code,retryable:false}}));};
  const authorized=req=>(req.headers.cookie||'').split(';').some(x=>x.trim()===`lw_session=${token}`);
  const operation=(kind,fn)=>{const item={operationId:randomUUID(),kind,status:'running',createdAt:new Date().toISOString(),processed:0};runtime.operations.set(item.operationId,item);const job=new Promise(resolve=>setImmediate(resolve)).then(async()=>{try{item.result=await fn(item);item.status=item.cancelled?'cancelled':'complete';}catch(e){item.status='failed';item.error={code:['R01_NOT_CONFIGURED','INPUT_PATH_ESCAPE'].includes(e.message)?e.message:'OPERATION_FAILED'};runtime.log(item.error.code,{operationId:item.operationId});}item.updatedAt=new Date().toISOString();runtime.emit('operation.updated',item);});jobs.add(job);job.finally(()=>jobs.delete(job));return item;};
  const server=http.createServer(async(req,res)=>{
    let command;
    try{
      if(!req.headers.host?.match(/^(127\.0\.0\.1|localhost):\d+$/))return fail(res,'FORBIDDEN',403);
      const u=new URL(req.url,url||'http://127.0.0.1');
      if(!u.pathname.startsWith('/api/')){
        const assets={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/app.css':['app.css','text/css']};const asset=assets[u.pathname];if(!asset)return fail(res,'RESOURCE_NOT_FOUND',404);
        const headers={'Content-Type':asset[1]+'; charset=utf-8','Content-Security-Policy':"default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'",'Cache-Control':'no-store'};
        if(u.pathname==='/')headers['Set-Cookie']=`lw_session=${token}; HttpOnly; SameSite=Strict; Path=/`;
        const bytes=await fs.readFile(path.join(publicDir,asset[0]));res.writeHead(200,headers);res.end(bytes);return;
      }
      if(!authorized(req))return fail(res,'FORBIDDEN',403);
      if(req.headers.origin&&req.headers.origin!==url)return fail(res,'FORBIDDEN',403);
      const p=u.pathname;
      if(req.method==='GET'){
        if(p==='/api/v1/profiles')return ok(res,{items:profiles.list().map(item=>({...item,monitor:monitor.view(item.profileId)}))});
        if(p==='/api/v1/monitor')return ok(res,{items:monitor.list(),platformEvidenceOnly:true});
        if(p==='/api/v1/coordinator')return ok(res,coordinator.view());
        if(p==='/api/v1/sources/browser')return ok(res,sources.browser.metrics());
        if(p==='/api/v1/system/status')return ok(res,{instance,profiles:profiles.list(),monitor:monitor.list(),coordinator:coordinator.view(),backendReady:true,selectedSource:sources.view().selectedSource,sourceControl:sources.view(),capture:sources.view().selectedSource==='WebSource'?sources.currentWeb().status:bridge.status,daemon:daemon.status,sessions:runtime.store.sessions(),metrics:runtime.metrics,privacy:{mode:projection.mode,projectionVersion:projection.version},liveEnvironmentAuthorized:Boolean(settings.certificatePath)});
        if(p==='/api/v1/health')return ok(res,{status:'ok',storage:'sqlite-wal-full',parser:'official',gatewayWebsocket:socketHub.view()});
        if(p==='/api/v1/capture/gaps')return ok(res,runtime.gaps.page({limit:u.searchParams.get('limit')}));
        if(p==='/api/v1/capabilities')return ok(res,{...sources.capabilities(),features:{networkPolicy:true,browserMetrics:true,profiles:true,monitor:true,eventHighWatermark:true,signedCursors:true,eventSummaries:true,protoTrace:true,rawPaging:true,captureGapTrace:true,reparse:true,replayPhysicalIsolation:true},limits:{eventPage:200,frontCache:500},replay:{implemented:true},r01:{available:Boolean(settings.r01Root),inputFormat:'business-payload'},lan:{enabled:false}});
        if(p==='/api/v1/sources')return ok(res,{...sources.view(),items:['LiveHookSource','WebSource']});
        if(p==='/api/v1/hook/status')return ok(res,{...bridge.status,daemon:daemon.status,profileMatch:hookMatcher.view()});
        if(p==='/api/v1/events'){const page=runtime.store.events({limit:u.searchParams.get('limit'),cursor:u.searchParams.get('cursor'),mode:u.searchParams.get('mode'),namespace:u.searchParams.get('namespace'),method:u.searchParams.get('method'),afterSeq:u.searchParams.get('afterSeq')});return ok(res,{...page,items:page.items.map(event=>({...event,payload:{decodeStatus:event.payload?.decodeStatus,official:{content:event.payload?.official?.content||null},extensions:{lifecycleCandidate:event.payload?.extensions?.lifecycleCandidate||null}},detailAvailable:true}))});}
        if(p.startsWith('/api/v1/events/')){const item=runtime.store.event(p.split('/').at(-1));return item?ok(res,item):fail(res,'RESOURCE_NOT_FOUND',404);}
        if(p==='/api/v1/recordings')return ok(res,{items:runtime.store.recordings(),historicalInputs:settings.r01Root?[{inputId:'M0-R01',format:'business-payload',readOnly:true}]:[]});
        if(/^\/api\/v1\/protos\/[^/]+$/.test(p))return ok(res,runtime.protoDetail(decodeURIComponent(p.split('/')[4]),u.searchParams.get('namespace')));
        if(/^\/api\/v1\/recordings\/[^/]+\/raw$/.test(p))return ok(res,runtime.store.rawPage(decodeURIComponent(p.split('/')[4]),{limit:u.searchParams.get('limit'),cursor:u.searchParams.get('cursor')}));
        if(/^\/api\/v1\/recordings\/[^/]+\/raw\/[^/]+$/.test(p))return ok(res,runtime.rawDetail(decodeURIComponent(p.split('/')[4]),decodeURIComponent(p.split('/')[6]),u.searchParams.get('namespace')));
        if(p==='/api/v1/sessions')return ok(res,{items:runtime.store.sessions()});
        if(p==='/api/v1/logs')return ok(res,runtime.store.logPage({module:u.searchParams.get('module'),level:u.searchParams.get('level'),code:u.searchParams.get('code'),operationId:u.searchParams.get('operationId'),cursor:u.searchParams.get('cursor'),limit:Math.min(200,Number(u.searchParams.get('limit'))||100)}));
        if(p.startsWith('/api/v1/logs/exports/')){const bytes=await logExports.read(p.split('/').at(-1));res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Content-Disposition':'attachment; filename="liveworkbench-logs.jsonl"','Cache-Control':'no-store'});res.end(bytes);return;}
        if(p==='/api/v1/metrics/modules')return ok(res,{...runtime.metrics,timings:runtime.metrics.timings||{},timingProvider:'performance.now wall duration',queues:{awaitingTransport:bridge.pending.size,webDecode:sources.currentWeb().client?.pending??0,websocketClients:wss.clients.size},moduleCpu:{available:false,value:null,reason:'MODULE_ATTRIBUTION_NOT_IMPLEMENTED'},capture:bridge.stats,gatewayWebsocket:socketHub.view(),rawPending:runtime.recorder.pending,webControlFrames:sources.currentWeb().controlFrames,browser:sources.browser.metrics()});
        if(p==='/api/v1/metrics/processes')return ok(res,{pid:process.pid,memoryBytes:process.memoryUsage().rss});
        if(p==='/api/v1/metrics/system'||p==='/api/v1/metrics/history')return ok(res,{available:false,reason:'PROVIDER_NOT_IMPLEMENTED'});
        if(p.startsWith('/api/v1/operations/'))return ok(res,runtime.operations.get(p.split('/').at(-1))||null);
        if(p.startsWith('/api/v1/replays/'))return ok(res,runtime.replayView(p.split('/').at(-1)));
        return fail(res,'RESOURCE_NOT_FOUND',404);
      }
      if(req.method!=='POST')return fail(res,'INVALID_ARGUMENT');
      let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>64*1024)return fail(res,'PAYLOAD_TOO_LARGE',413);chunks.push(chunk);}
      let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return fail(res,'INVALID_ARGUMENT');}
      if(!body.commandId)return fail(res,'INVALID_ARGUMENT');
      const fingerprint=JSON.stringify({p,body});const old=commands.get(body.commandId);
      if(old){if(old.fingerprint!==fingerprint)return fail(res,'COMMAND_CONFLICT',409);await old.done;return old.error?fail(res,old.error.code,old.error.status):ok(res,old.result,old.status);}
      let release;command={fingerprint,done:new Promise(resolve=>{release=resolve;})};command.release=release;
      if(commands.size>1000){const removable=[...commands].find(([,v])=>v.finished);if(removable)commands.delete(removable[0]);else return fail(res,'SOURCE_BUSY',409);}
      commands.set(body.commandId,command);
      let result,status=200;
      if(p==='/api/v1/profiles'){
        result=profiles.create(body.profile);monitor.sync();
      }else if(/^\/api\/v1\/profiles\/[^/]+\/actions$/.test(p)){
        const id=p.split('/')[4];
        if(body.action==='update')result=profiles.update(id,body.patch,body.expectedVersion);
        else if(body.action==='delete')result=profiles.delete(id,body.expectedVersion);
        else if(body.action==='check')result=await monitor.check(id);
        else if(body.action==='start')result=await coordinator.start(id);
        else if(body.action==='stop')result=await coordinator.manualStop();
        else if(body.action==='authCheck')result=await sources.authStatus(profiles.get(id));
        else if(body.action==='networkCheck'){const profile=profiles.get(id),diagnostic=await monitor.adapter.probe(profile);result={profileId:id,networkPolicy:{mode:profile.networkPolicy?.mode||'system'},network:diagnostic.network||null,errorCode:diagnostic.errorCode||null,queryState:diagnostic.state,missingConditions:diagnostic.missingConditions||[],monitorStateUnchanged:true};}
        else if(body.action==='authSave'){const p=profiles.get(id);if(body.expectedVersion!==p.version)throw new Error('STATE_CONFLICT');result=await sources.saveLogin(p);}
        else if(body.action==='authClear'){const p=profiles.get(id);if(body.expectedVersion!==p.version)throw new Error('STATE_CONFLICT');coordinator.suppress();result=await sources.clearLogin(p);}
        else if(body.action==='login'){const p=profiles.get(id);if(body.expectedVersion!==p.version)throw new Error('STATE_CONFLICT');coordinator.suppress();const resolved=await monitor.adapter.resolver.resolve(p.target,{timeoutMs:p.timeoutMs,networkPolicy:p.networkPolicy||{mode:'system'}});result=await sources.loginProfile(p,{...resolved,...monitor.view(id).evidence});}
        else if(body.action==='resolve')result=await monitor.adapter.resolver.resolve(profiles.get(id).target,{timeoutMs:profiles.get(id).timeoutMs,networkPolicy:profiles.get(id).networkPolicy||{mode:'system'}});
        else throw new Error('CAPABILITY_UNAVAILABLE');monitor.sync();
      }else if(p==='/api/v1/capture/actions'){
        result=await sources.action(body);
        if(['stop','switch'].includes(body.action))coordinator.suppress();
      }else if(p==='/api/v1/logs/exports'){
        if(body.format&&body.format!=='jsonl')throw new Error('CAPABILITY_UNAVAILABLE');result=operation('logs.export',()=>logExports.create(body.filters||{}));status=202;
      }else if(p==='/api/v1/development/r01-runs'){
        result=operation(body.goldenOnly?'golden':'r01',op=>runHistorical(runtime,settings,{goldenOnly:Boolean(body.goldenOnly)},op));status=202;
      }else if(/^\/api\/v1\/protos\/[^/]+\/actions$/.test(p)){
        if(body.action!=='reparse')throw new Error('CAPABILITY_UNAVAILABLE');result=await runtime.reparseMessage(decodeURIComponent(p.split('/')[4]),body.runtimeNamespace);
      }else if(p==='/api/v1/replays'){result=await runtime.createReplay(body);}
      else if(p.match(/^\/api\/v1\/replays\/[^/]+\/actions$/)){
        const id=p.split('/')[4];
        result=await runtime.replayAction(id,body.action,body.target,body.expectedVersion,body.speed);
      }else if(p.match(/^\/api\/v1\/operations\/[^/]+\/actions$/)){const op=runtime.operations.get(p.split('/')[4]);if(!op)throw new Error('RESOURCE_NOT_FOUND');op.cancelled=true;result=op;}
      else throw new Error('RESOURCE_NOT_FOUND');
      command.result=structuredClone(result);command.status=status;ok(res,result,status);
    }catch(e){const code=/^NETWORK_[A-Z_]+$/.test(e.message)?e.message:['AUTH_PERSIST_NOT_ENABLED','AUTH_BROWSER_REQUIRED','AUTH_CONFIRMATION_REQUIRED','AUTH_STATE_UNAVAILABLE','AUTH_PROTECTION_FAILED','SOURCE_SELECTION_MISMATCH','SOURCE_ROOM_BUSY','PROFILE_DISABLED','TARGET_MAPPING_REQUIRED','BROWSER_NOT_PREPARED','BROWSER_START_FAILED','PROFILE_INVALID','PROFILE_LIMIT','TARGET_INVALID','TARGET_PRIVATE_ADDRESS','TARGET_REDIRECT_LIMIT','MONITOR_TIMEOUT','MONITOR_HTTP_FAILED','MONITOR_ACCESS_BLOCKED','CURSOR_MISMATCH','CURSOR_EXPIRED','SOURCE_BUSY','RESOURCE_NOT_FOUND','TLS_CERTIFICATE_REQUIRED','STATE_CONFLICT','CAPABILITY_UNAVAILABLE','WEB_TARGET_NOT_CONFIGURED','WEB_SOURCE_NOT_PREPARED','WEB_TARGET_INVALID','WEB_SOURCE_START_FAILED','RAW_HASH_MISMATCH'].includes(e.message)?e.message:'INTERNAL_ERROR';const status=code==='RESOURCE_NOT_FOUND'?404:code==='CURSOR_EXPIRED'?410:code==='CAPABILITY_UNAVAILABLE'?501:['SOURCE_BUSY','STATE_CONFLICT','TLS_CERTIFICATE_REQUIRED','WEB_TARGET_NOT_CONFIGURED','WEB_SOURCE_NOT_PREPARED','RAW_HASH_MISMATCH','AUTH_PERSIST_NOT_ENABLED','AUTH_BROWSER_REQUIRED','AUTH_CONFIRMATION_REQUIRED','SOURCE_SELECTION_MISMATCH','SOURCE_ROOM_BUSY','PROFILE_DISABLED','TARGET_MAPPING_REQUIRED'].includes(code)?409:400;if(command)command.error={code,status};fail(res,code,status);}finally{if(command){command.finished=true;command.release();}}
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:65536});
  const socketHub=new GatewaySocketHub(wss,runtime,settings.gatewayHeartbeat);
  server.on('upgrade',(req,socket,head)=>{if(req.url!=='/api/v1/ws'||!authorized(req)||(req.headers.origin&&req.headers.origin!==url)){socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');return;}wss.handleUpgrade(req,socket,head,ws=>{wss.emit('connection',ws,req);ws.send(JSON.stringify({channel:'subscription.ready',data:{latestEventSeq:runtime.store.eventHighWatermark(),resume:'GET /events with afterSeq and snapshot cursor',live:true}}));});});
  for(const channel of ['hook.match.updated','coordinator.updated','monitor.updated','events.appended','log.appended','session.updated','operation.updated','replay.updated','capture.updated','daemon.updated','source.updated'])runtime.on(channel,data=>socketHub.publish(channel,publicSafe(data)));
  for(const channel of ['events.appended','log.appended','session.updated','replay.updated'])runtime.replayEngine.ui.on(channel,data=>socketHub.publish(channel,publicSafe(data)));
  try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});}catch(error){await daemon.close();await sources.close();await runtime.close();throw error;}url=`http://127.0.0.1:${server.address().port}`;
  runtime.log('GATEWAY_STARTED');
  monitor.sync();
  return {runtime,bridge,daemon,sources,profiles,monitor,coordinator,url,server,wss,socketHub,async close(){for(const op of runtime.operations.values())op.cancelled=true;await coordinator.close();await monitor.close();await daemon.close();await sources.close();socketHub.close();await new Promise(resolve=>server.close(resolve));await Promise.allSettled([...jobs]);await runtime.close();}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let settings={};try{settings=JSON.parse(await fs.readFile(path.join(root,'.local/settings.json'),'utf8'));}catch{}
  const app=await createGateway({port:Number(process.env.LW_PORT||18780),dataDir:process.env.LW_DATA_DIR,settings});console.log(`LiveWorkbench ${app.url} (capture stopped; no system/companion modifications)`);
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});
}
