import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('loader reflection finishes before live decoding; forced-GC heap remains bounded',()=>{
 const program=`import {loadBoundedParser} from './src/parser/load-bounded.js';const p=await loadBoundedParser(),type=p.root.lookupType('webcast.im.ChatMessage'),bytes=type.encode(type.fromObject({common:{room_id:'100',msg_id:'1'},user:{nickname:'synthetic'},content:'synthetic'})).finish(),decode=p.types.get('webcast.im.ChatMessage').original.decode;for(let n=0;n<500;n++)decode(bytes);global.gc();const before=process.memoryUsage().heapUsed;for(let n=0;n<5000;n++)decode(bytes);global.gc();console.log(JSON.stringify({growth:process.memoryUsage().heapUsed-before,content:decode(bytes).content,fields:p.types.get('webcast.im.ChatMessage').fields.length}));`;
 const result=JSON.parse(execFileSync(process.execPath,['--expose-gc','--input-type=module','-e',program],{encoding:'utf8',windowsHide:true}));assert.ok(result.growth<12*1024*1024,JSON.stringify(result));assert.equal(result.content,'synthetic');assert.ok(result.fields>5);
});
