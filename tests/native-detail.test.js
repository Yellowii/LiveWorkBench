import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createGateway} from '../src/server.js';
test('native business strings, large arrays, unknown values and binary pages survive local view without public leakage',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-native-')),app=await createGateway({dataDir:dir,port:0});try{
 await app.sources.action({action:'switch',sourceType:'WebSource',expectedVersion:app.sources.view().stateVersion});const type=app.runtime.parser.native.root.lookupType('webcast.im.ChatMessage'),bytes=type.encode(type.fromObject({content:'原生正文',user:{nickname:'测试用户'},common:{msg_id:'987',room_id:'123'}})).finish();await app.runtime.ingest({bytes,method:'WebcastChatMessage',format:'business-payload',sourceType:'WebSource',sourceEpoch:app.sources.view().sourceEpoch,mode:'live'});
 const original=app.runtime.store.events({mode:'live'}).items[0],official={...original.payload.official,unfamiliar:'未知字符串必须完整',items:Array.from({length:1200},(_,i)=>({text:'第'+i,extra:'<script>untrusted</script>'})),image_url:'https://p3.douyinpic.com/a.jpg?x-signature=ASSET',long_text:'中'.repeat(100000)};
 const event=app.runtime.store.addEvent({...original,eventId:undefined,msgId:'988',payload:{official}},'native-full-test');
 const id=event.event.eventId,cookie=(await fetch(app.url)).headers.get('set-cookie').split(';')[0],headers={Cookie:cookie,'X-LW-Local-View':'1'},read=async route=>(await (await fetch(app.url+'/api/v1/local/messages/'+route,{headers})).json()).data;
 assert.deepEqual((await read(id)).official,official);const f=await read(id+'/field?path=/user/nickname');assert.equal(f.number,3);assert.equal(f.label,'昵称');assert.equal((await read(id+'/field?path=/unfamiliar')).confidence,'unknown');
 const first=await read(original.eventId+'/binary?rawId='+original.rawRefs[0]+'&limit=4');assert.equal(first.hex,Buffer.from(bytes).subarray(0,4).toString('hex'));assert.equal(first.nextOffset,4);
 assert.equal((await fetch(app.url+'/api/v1/local/messages/'+id+'/binary?rawId=unrelated',{headers})).status,404);
 assert.equal((await fetch(app.url+'/api/v1/local/messages/'+id+'/field?path=/user',{headers:{Cookie:cookie}})).status,403);
 const publicView=await (await fetch(app.url+'/api/v1/events/'+id,{headers})).text();assert.ok(!publicView.includes('未知字符串必须完整'));assert.ok(!publicView.includes('ASSET'));
 }finally{await app.close();await fs.rm(dir,{recursive:true,force:true});}
});

