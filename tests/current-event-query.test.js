import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createGateway} from '../src/server.js';

test('current event polling uses the authoritative complete scope even with no messages',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-current-query-'));
 const app=await createGateway({dataDir:dir,port:0});
 t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
 const session=app.runtime.sessions.observe({roomId:'100',anchorUid:'200',live:true});
 const originalSources=app.sources.view.bind(app.sources),originalCoordinator=app.coordinator.view.bind(app.coordinator);
 app.sources.view=()=>({...originalSources(),captureState:'STARTING'});
 app.coordinator.view=()=>({...originalCoordinator(),active:{roomId:'100'}});
 const calls=[],events=app.runtime.store.events.bind(app.runtime.store);
 app.runtime.store.events=filters=>{calls.push(filters);return events(filters);};
 const cookie=(await fetch(app.url)).headers.get('set-cookie').split(';')[0];
 for(const suffix of ['', '&mode=replay&namespace=other']){
  const response=await fetch(app.url+'/api/v1/events?scope=current&limit=6'+suffix,{headers:{Cookie:cookie}});
  assert.equal(response.status,200);assert.equal((await response.json()).data.items.length,0);
  assert.equal(calls.at(-1).roomId,'100');assert.equal(calls.at(-1).sessionId,session.sessionId);
  assert.equal(calls.at(-1).mode,'live');assert.equal(calls.at(-1).namespace,session.runtimeNamespace);
 }
 app.sources.view=originalSources;app.coordinator.view=originalCoordinator;
});
