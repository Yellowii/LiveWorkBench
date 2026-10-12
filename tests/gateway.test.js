import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
let createGateway;
try{({createGateway}=await import('../src/server.js'));}catch{}

test('local Gateway exposes persistent events and rejects unauthenticated control',async t=>{
  assert.ok(createGateway,'A runnable API Gateway is required');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-api-'));const app=await createGateway({dataDir:dir,port:0});
  t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
  const anonymous=await fetch(app.url+'/api/v1/capture/actions',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"action":"start"}'});assert.equal(anonymous.status,403);
  const page=await fetch(app.url);const cookie=page.headers.get('set-cookie').split(';')[0];
  const status=await fetch(app.url+'/api/v1/system/status',{headers:{Cookie:cookie}});assert.equal(status.status,200);assert.equal((await status.json()).data.backendReady,true);
  const result=await fetch(app.url+'/api/v1/events',{headers:{Cookie:cookie}});assert.equal(result.status,200);assert.equal((await result.json()).data.items.length,0);
  const blocked=await fetch(app.url+'/api/v1/capture/actions',{method:'POST',headers:{Cookie:cookie,Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({action:'start',commandId:'without-cert'})});
  assert.equal(blocked.status,409);assert.equal((await blocked.json()).error.code,'TLS_CERTIFICATE_REQUIRED');
});

test('concurrent retries advance replay once and competing versions conflict',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-command-')),app=await createGateway({dataDir:dir,port:0});
  t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
  for(let n=1;n<=3;n++)await app.runtime.ingest({bytes:Buffer.from([n]),format:'business-payload',method:'Unknown'});
  const replay=await app.runtime.createReplay({recordingId:'manual'}),cookie=(await fetch(app.url)).headers.get('set-cookie').split(';')[0];
  const post=body=>fetch(`${app.url}/api/v1/replays/${replay.replayId}/actions`,{method:'POST',headers:{Cookie:cookie,Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const body={commandId:'same-step',action:'step',expectedVersion:'1'};
  const same=await Promise.all([post(body),post(body)]);assert.deepEqual(same.map(x=>x.status),[200,200]);
  assert.equal(app.runtime.replayView(replay.replayId).position,1);
  const different=await Promise.all([post({...body,commandId:'step-a',expectedVersion:'2'}),post({...body,commandId:'step-b',expectedVersion:'2'})]);
  assert.deepEqual(different.map(x=>x.status).sort(),[200,409]);assert.equal(app.runtime.replayView(replay.replayId).position,2);
});

test('formal capture switch is manual, versioned, authenticated and preserves session identity',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-switch-api-')),app=await createGateway({dataDir:dir,port:0});
 t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
 const cookie=(await fetch(app.url)).headers.get('set-cookie').split(';')[0],headers={Cookie:cookie,Origin:app.url,'Content-Type':'application/json'};
 const sourcesResponse=await fetch(app.url+'/api/v1/sources',{headers});assert.equal(sourcesResponse.status,200);
 const source=(await sourcesResponse.json()).data;
 assert.equal(source.selectedSource,'LiveHookSource');
 const session=app.runtime.sessions.observe({roomId:'100',anchorUid:'200'});
 const response=await fetch(app.url+'/api/v1/capture/actions',{method:'POST',headers,body:JSON.stringify({commandId:'manual-switch',expectedVersion:source.stateVersion,action:'switch',sourceType:'WebSource'})});
 assert.equal(response.status,200);assert.equal((await response.json()).data.selectedSource,'WebSource');
 assert.equal(app.runtime.store.sessions()[0].sessionId,session.sessionId);assert.notEqual(app.runtime.store.sessions()[0].sessionState,'ENDED');
 const stale=await fetch(app.url+'/api/v1/capture/actions',{method:'POST',headers,body:JSON.stringify({commandId:'stale-switch',expectedVersion:source.stateVersion,action:'switch',sourceType:'LiveHookSource'})});assert.equal(stale.status,409);
 const status=(await (await fetch(app.url+'/api/v1/system/status',{headers})).json()).data;assert.equal(status.selectedSource,'WebSource');
});
