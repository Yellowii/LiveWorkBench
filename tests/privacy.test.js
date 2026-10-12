import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
import {createGateway} from '../src/server.js';
import {publicProjection} from '../src/public-projection.js';

test('default REST and WS projections hide identities and text while native storage stays intact',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-privacy-')),app=await createGateway({dataDir:dir,port:0});
 t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
 const cookie=(await fetch(app.url)).headers.get('set-cookie').split(';')[0];
 const ws=new WebSocket(app.url.replace('http:','ws:')+'/api/v1/ws',{headers:{Cookie:cookie,Origin:app.url}});
 t.after(()=>ws.terminate());await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
 const packet=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('WS_EVENT_TIMEOUT')),5000);ws.on('message',bytes=>{const value=JSON.parse(bytes);if(value.channel==='events.appended'){clearTimeout(timer);resolve(value.data);}});});
 const type=app.runtime.parser.native.root.lookupType('webcast.im.ChatMessage');
 const content='synthetic confidential conversation',nickname='synthetic private viewer';
 await app.runtime.ingest({bytes:type.encode(type.fromObject({common:{room_id:'8000000000000000002',msg_id:'9007199254740993'},user:{id:'7000000000000000001',nickname},content})).finish(),format:'business-payload',method:'WebcastChatMessage'});
 const native=app.runtime.store.events({}).items[0];
 assert.equal(native.payload.official.content,content);assert.equal(native.payload.official.user.nickname,nickname);
 const response=await fetch(app.url+'/api/v1/events',{headers:{Cookie:cookie}});const data=(await response.json()).data;
 const event=data.items[0],push=await packet;
 for(const view of [event,push]){
  const text=JSON.stringify(view);for(const privateValue of [content,nickname,'8000000000000000002','7000000000000000001'])assert.equal(text.includes(privateValue),false);
  assert.equal(view.payload.official.content,'[text]');assert.match(view.roomId,/^room:/);
 }
 assert.equal(event.roomId,push.roomId);assert.equal(event.eventId,native.eventId);
 app.runtime.log('SYNTHETIC_LOG',{nested:{cookie:'local credential',authorization:'local credential',filePath:dir,content}});
 const logs=JSON.stringify((await (await fetch(app.url+'/api/v1/logs',{headers:{Cookie:cookie}})).json()).data);
 assert.equal(logs.includes('local credential'),false);assert.equal(logs.includes(dir),false);assert.equal(logs.includes(content),false);
});

test('explicit local private view still strips credentials and physical paths',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-private-view-')),app=await createGateway({dataDir:dir,port:0,settings:{allowPrivateDetails:true}});
 t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
 const cookie=(await fetch(app.url)).headers.get('set-cookie').split(';')[0];
 app.runtime.log('LOCAL_VIEW',{nickname:'synthetic viewer',nested:{token:'local credential',filePath:dir}});
 const data=(await (await fetch(app.url+'/api/v1/logs',{headers:{Cookie:cookie}})).json()).data;
 assert.equal(data.items[0].nickname,'synthetic viewer');assert.equal(JSON.stringify(data).includes('local credential'),false);assert.equal(JSON.stringify(data).includes(dir),false);
});

test('unknown native string and byte fields cannot bypass the public projection',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-native-view-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const projection=await publicProjection(dir);
 const input={payload:{official:{pieces:[{string_value:'synthetic hidden identity'}],unrecognized_bytes:'c3ludGhldGljIHNlY3JldA==',action:'3',repeat_count:'52'}}};
 const output=projection.project(input);
 assert.equal(JSON.stringify(output).includes('synthetic hidden identity'),false);
 assert.equal(JSON.stringify(output).includes('c3ludGhldGljIHNlY3JldA=='),false);
 assert.equal(output.payload.official.action,'3');assert.equal(output.payload.official.repeat_count,'52');
});
