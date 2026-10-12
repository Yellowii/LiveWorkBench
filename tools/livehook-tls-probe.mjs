import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import net from 'node:net';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {WebSocket,WebSocketServer} from 'ws';
import {pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Runtime} from '../src/runtime.js';
import {CaptureBridge} from '../src/capture-bridge.js';
const listen=server=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const wait=async predicate=>{const deadline=Date.now()+10000;while(!predicate()){if(Date.now()>deadline)throw new Error('TLS_PROBE_TIMEOUT');await new Promise(resolve=>setTimeout(resolve,25));}};
export async function probeTLS({directory,port=0}){
 for(const name of ['probe-data','tls-result.json']){if(await fs.stat(path.join(directory,name)).then(()=>true,()=>false))throw new Error('TLS_PROBE_DIRECTORY_ALREADY_USED');}
 const certDir=path.join(directory,'certificates'),ca=await fs.readFile(path.join(certDir,'ca.pem'));
 const password=await fs.readFile(path.join(certDir,'password.txt'),'utf8');
 const runtime=await Runtime.open({dataDir:path.join(directory,'probe-data')}),bridge=new CaptureBridge(runtime);
 const encode=(name,value)=>{const type=runtime.parser.native.root.lookupType('webcast.im.'+name);return type.encode(type.fromObject(value)).finish();};
 const response=msg=>encode('Response',{messages:[{method:'WebcastChatMessage',msg_id:String(msg),payload:encode('ChatMessage',{common:{msg_id:String(msg),room_id:'101'},content:'synthetic tls fixture'})}]});
 const httpBytes=response(81),frame=encode('PushFrame',{SeqID:'3',payload:gzipSync(response(82)),headers:[{key:'compress_type',value:'gzip'}]});
 const upstream=https.createServer({key:await fs.readFile(path.join(certDir,'upstream-key.pem')),cert:await fs.readFile(path.join(certDir,'upstream.pem')),passphrase:password},(_req,res)=>{res.writeHead(200,{'Content-Type':'application/protobuffer'});res.end(httpBytes);});
 const wss=new WebSocketServer({server:upstream,perMessageDeflate:false});let websocket;const sockets=new Set(),diagnostics=[];
 wss.on('connection',ws=>setTimeout(()=>{if(ws.readyState!==1)return;const half=Math.floor(frame.length/2);ws.send(frame.subarray(0,half),{fin:false});setTimeout(()=>{if(ws.readyState===1)ws.send(frame.subarray(half),{fin:true});},50);},50));
 let result;
 try{
  await listen(upstream);
  if(!port){const probe=net.createServer();await listen(probe);port=probe.address().port;await new Promise(resolve=>probe.close(resolve));}
  await bridge.start({networkSmoke:true,mode:'test',port,certificatePath:path.join(certDir,'ca.pfx'),certificatePassword:password,testUpstreamCertificate:path.join(certDir,'upstream.cer')});
  bridge.child.stderr.on('data',chunk=>diagnostics.push(chunk));
  const proxyPid=bridge.child.pid;
  const {stdout}=await promisify(execFile)('pwsh',['-NoProfile','-NonInteractive','-Command',`@(Get-NetTCPConnection -LocalPort ${port} -State Listen | Select-Object LocalAddress,OwningProcess) | ConvertTo-Json -Compress`]);
  const value=JSON.parse(stdout),listeners=Array.isArray(value)?value:[value];assert.ok(listeners.length);assert.ok(listeners.every(x=>x.LocalAddress==='127.0.0.1'&&x.OwningProcess===proxyPid));
  const connect=(trust=ca)=>new Promise((resolve,reject)=>{
   const req=http.request({host:'127.0.0.1',port,method:'CONNECT',path:`localhost:${upstream.address().port}`});req.setTimeout(10000,()=>req.destroy(new Error('CONNECT_TIMEOUT')));
   req.on('error',reject);req.on('connect',(res,socket,head)=>{if(res.statusCode!==200){socket.destroy();return reject(new Error('CONNECT_REJECTED'));}if(head.length)socket.unshift(head);
    const secure=tls.connect({socket,servername:'localhost',ca:trust,rejectUnauthorized:true});sockets.add(secure);secure.setTimeout(10000,()=>secure.destroy(new Error('TLS_TIMEOUT')));secure.once('error',error=>{secure.destroy();reject(error);});secure.once('secureConnect',()=>{assert.equal(secure.authorized,true);resolve(secure);});
   });req.end();
  });
  await assert.rejects(connect([]),error=>['SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT_LOCALLY'].includes(error.code));
  const httpSocket=await connect();
  const agent=new https.Agent({keepAlive:false});agent.createConnection=()=>httpSocket;
  const received=await new Promise((resolve,reject)=>{https.get({host:'localhost',port:upstream.address().port,path:'/webcast/im/fetch',agent},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve(Buffer.concat(chunks)));res.on('error',reject);}).on('error',reject);});
  assert.deepEqual(received,Buffer.from(httpBytes));agent.destroy();
  const wsSocket=await connect();
  const wsReceived=new Promise((resolve,reject)=>{websocket=new WebSocket(`wss://localhost:${upstream.address().port}/webcast/im/push/v2/`,{ca,rejectUnauthorized:true,perMessageDeflate:false,createConnection:()=>wsSocket,handshakeTimeout:10000});websocket.once('message',resolve);websocket.once('error',reject);});
  assert.deepEqual(Buffer.from(await wsReceived),Buffer.from(frame));
  await wait(()=>runtime.store.countEvents()===2);
  const events=runtime.store.events({mode:'test'}).items,raw=runtime.store.rawFor(bridge.captureId);
  const expected=new Map([['response',Buffer.from(httpBytes)],['frame',Buffer.from(frame)]]);
  for(const input of raw){const bytes=await fs.readFile(input.filePath);assert.deepEqual(bytes,expected.get(input.format));assert.equal(input.contentHash,createHash('sha256').update(bytes).digest('hex'));assert.equal(input.sourceType,'LiveHookSource');assert.equal(input.mode,'test');}
  assert.equal(raw.length,2);assert.equal(bridge.status.hookReady,false);
  result={httpsVerified:true,wssVerified:true,untrustedClientRejected:true,loopbackOnly:true,rawByteMatches:raw.length,events:events.length,csharpTransport:bridge.stats.csharpTransport,sameSession:events[0].sessionId===events[1].sessionId&&!!events[0].sessionId,liveEvents:runtime.store.events({mode:'live'}).items.length,hookReady:bridge.status.hookReady,proxyPort:port,proxyPid};
 }finally{
  websocket?.terminate();for(const socket of sockets)socket.destroy();for(const ws of wss.clients)ws.terminate();
  await bridge.stop();await fs.writeFile(path.join(directory,'proxy-diagnostics.log'),Buffer.concat(diagnostics));upstream.closeAllConnections();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>upstream.close(resolve));await runtime.close();
 }
 result.proxyStopped=!bridge.child;await fs.writeFile(path.join(directory,'tls-result.json'),JSON.stringify(result,null,2),{flag:'wx'});return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){probeTLS({directory:path.resolve(process.argv[2]),port:Number(process.argv[3]||18827)}).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.code||error.message);process.exitCode=1;});}
