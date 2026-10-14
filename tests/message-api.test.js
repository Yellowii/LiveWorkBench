import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createGateway} from '../src/server.js';
test('readable API requires explicit local session; original public projections and pipeline facts stay intact',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-message-api-')),app=await createGateway({dataDir:dir,port:0});
 try{
  const response=await fetch(app.url),cookie=response.headers.get('set-cookie').split(';')[0],headers={Cookie:cookie,'X-LW-Local-View':'1'};
  const native=app.runtime.parser.native.root.lookupType('webcast.im.ChatMessage'),bytes=native.encode(native.fromObject({common:{room_id:'100',msg_id:'9001'},user:{nickname:'合成本机昵称'},content:'合成本机正文'})).finish();
  await app.sources.action({action:'switch',sourceType:'WebSource',expectedVersion:app.sources.view().stateVersion});
  await app.runtime.ingest({bytes,format:'business-payload',method:'WebcastChatMessage',sourceType:'WebSource',sourceEpoch:app.sources.view().sourceEpoch,mode:'live'});
  const original=app.runtime.store.events({mode:'live'}).items[0];assert.ok(original);
  assert.equal((await fetch(app.url+'/api/v1/local/messages')).status,403);
  assert.equal((await fetch(app.url+'/api/v1/local/messages',{headers:{Cookie:cookie}})).status,403);
  assert.equal((await fetch(app.url+'/api/v1/local/messages',{headers:{...headers,Origin:'https://evil.invalid'}})).status,403);
  const page=await (await fetch(app.url+'/api/v1/local/messages?mode=live',{headers})).json();assert.equal(page.data.items[0].summary,'合成本机正文');assert.equal(page.data.items[0].actor.name,'合成本机昵称');
  const detail=await (await fetch(app.url+'/api/v1/local/messages/'+original.eventId,{headers})).json();assert.equal(detail.data.official.content,'合成本机正文');assert.ok(detail.data.schema.fields.some(f=>f.path==='content'&&f.number===3));assert.equal(detail.data.raw.length,1);assert.ok(detail.data.protos.length);
  const publicData=await (await fetch(app.url+'/api/v1/events/'+original.eventId,{headers:{Cookie:cookie}})).text();assert.doesNotMatch(publicData,/合成本机/);
  assert.equal(JSON.stringify(app.runtime.store.event(original.eventId)),JSON.stringify(original));assert.equal(app.runtime.store.countRaw(),1);
 }finally{await app.close();await fs.rm(dir,{recursive:true,force:true});}
});
