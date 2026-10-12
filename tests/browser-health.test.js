import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {EventEmitter} from 'node:events';
import {Runtime} from '../src/runtime.js';
import {BrowserSource} from '../src/capture/browser/browser-source.js';
test('browser crash and platform rejection are distinct, observable and contain no response secrets',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-browser-health-')),runtime=await Runtime.open({dataDir:dir});
 class Client extends EventEmitter{constructor(p,options){super();this.options=options;this.status={};this.account=new EventEmitter();this.account.status={state:'unknown'};this.connected=true;this.browser={isConnected:()=>this.connected};}async start(){await this.options.prepareContext(this.context=new EventEmitter());this.emit('status',{state:'connecting'});}async stop(){this.connected=false;}}
 const source=new BrowserSource(runtime,{clientFactory:Client});t.after(async()=>{await source.stop();await runtime.close();await fs.rm(dir,{recursive:true,force:true});});
 // Minimal context surface; the adapter's network health comes from responses.
 Client.prototype.start=async function(){this.context=new EventEmitter();this.context.route=async()=>{};this.context.addInitScript=async()=>{};await this.options.prepareContext(this.context);this.emit('status',{state:'connecting'});};
 await source.start({roomUrl:'https://live.douyin.com/123',roomId:'100',anchorUid:'200'});
 source.client.connected=false;source.client.emit('status',{state:'blocked'});assert.equal(source.status.reason,'BROWSER_PROCESS_EXITED');
 await source.stop();await source.start({roomUrl:'https://live.douyin.com/123',roomId:'100',anchorUid:'200'});
 source.client.context.emit('response',{url:()=> 'https://live.douyin.com/webcast/room/web/enter/?token=synthetic-private',status:()=>429});
 assert.equal(source.status.reason,'BROWSER_PLATFORM_RATE_LIMITED');assert.equal(source.status.requiresUserAction,true);assert.ok(!JSON.stringify(source.status).includes('synthetic-private'));
 assert.equal(typeof source.metrics,'function');assert.equal(source.metrics().heartbeatOwner,'official-page-sdk');assert.equal(source.metrics().rawBeforeAck,false);
});
test('browser recording includes profile/operation evidence to trace monitor-to-event without credential exposure',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-browser-correlation-')),runtime=await Runtime.open({dataDir:dir});class Client extends EventEmitter{constructor(p,options){super();this.options=options;}async start(){this.emit('status',{state:'connected'});}async stop(){}}
 const source=new BrowserSource(runtime,{clientFactory:Client});t.after(async()=>{await source.stop();await runtime.close();await fs.rm(dir,{recursive:true,force:true});});
 await source.start({roomUrl:'https://live.douyin.com/123',roomId:'100',anchorUid:'200',profileId:'synthetic-profile',operationId:'synthetic-operation',monitorStateVersion:'2'});
 const encode=(name,value)=>{const type=runtime.parser.native.root.lookupType('webcast.im.'+name);return type.encode(type.fromObject(value)).finish();};const bytes=encode('PushFrame',{payload:encode('Response',{messages:[{method:'WebcastChatMessage',payload:encode('ChatMessage',{common:{room_id:'100',msg_id:'77'},content:'synthetic correlation'}),msg_id:'77'}]})});await source.client.options.rawCommit(bytes,new Date().toISOString(),'1');
 const raw=runtime.store.rawFor(source.captureId)[0];assert.equal(raw.profileId,'synthetic-profile');assert.equal(raw.operationId,'synthetic-operation');assert.equal(raw.monitorStateVersion,'2');assert.equal(source.metrics().receivedMessages,1);assert.equal(runtime.store.events({}).items[0].payload.extensions.processingContext.operationId,'synthetic-operation');
});
