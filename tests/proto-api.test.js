import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createGateway} from '../src/server.js';
test('Proto detail and reparse are authenticated, redacted and leave live events unchanged',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-proto-api-')),app=await createGateway({dataDir:dir,port:0});t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
 const type=app.runtime.parser.native.root.lookupType('webcast.im.ChatMessage'),raw=await app.runtime.ingest({bytes:type.encode(type.fromObject({common:{room_id:'101',msg_id:'95'},content:'private synthetic'})).finish(),format:'business-payload',method:'WebcastChatMessage'});
 const id=app.runtime.store.rawTrace(raw.rawId).messages[0].protoId,before=app.runtime.store.countEvents();
 assert.equal((await fetch(app.url+'/api/v1/protos/'+id)).status,403);
 const cookie=(await fetch(app.url)).headers.get('set-cookie').split(';')[0];
 const view=await (await fetch(app.url+'/api/v1/protos/'+id,{headers:{cookie}})).json();assert.equal(view.data.attempts[0].official.content,'[text]');assert.equal(JSON.stringify(view).includes('payloadFile'),false);
 const body=JSON.stringify({commandId:'proto-reparse-fixture',action:'reparse'});
 for(let n=0;n<2;n++){const reply=await fetch(app.url+`/api/v1/protos/${id}/actions`,{method:'POST',headers:{cookie,'Content-Type':'application/json'},body});assert.equal(reply.status,200);assert.equal((await reply.json()).data.parseStatus,'decoded');}
 assert.equal(app.runtime.store.protos.attempts(id).length,2);assert.equal(app.runtime.store.countEvents(),before);
});
