import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync,inflateSync,zstdDecompressSync} from 'node:zlib';
import {validateWire} from './parser/wire.js';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=code=>{throw new Error(code);};
export class TransportUnpacker {
 constructor({native,index,payloadDirectory,readRaw}){this.native=native;this.index=index;this.directory=payloadDirectory;this.readRaw=readRaw;this.version='transport-v1';}
 envelope(raw,bytes){
  if(raw.format==='business-payload')return {messages:[{method:raw.method||'',msg_id:raw.indexMsgId||'0',payload:bytes}],compression:'none',adapter:'historical-business-reference'};
  let body=bytes,compression='none',frame=null;
  const decode=(name,input)=>{const type=this.native.types.get('webcast.im.'+name);validateWire(input,this.native,type);return type.original.decode(input);};
  if(raw.format==='frame'){
   try{frame=decode('PushFrame',bytes);}catch{fail('TRANSPORT_ENVELOPE_INVALID');}
   if(['hb','ack','heartbeat','pong','ping','close'].includes((frame.payload_type||'').toLowerCase()))return {messages:[],kind:'control',compression,adapter:'official-transport-types'};
   const headers=Object.fromEntries((frame.headers||[]).map(x=>[x.key,x.value]));compression=headers.compress_type||headers['compress-type']||frame.payload_encoding||'none';body=Buffer.from(frame.payload||[]);
   if(body[0]===31&&body[1]===139)compression='gzip';
   try{const options={maxOutputLength:32*1024*1024};if(compression==='gzip')body=gunzipSync(body,options);else if(['zlib','deflate'].includes(compression))body=inflateSync(body,options);else if(compression==='zstd')body=zstdDecompressSync(body,options);else if(!['pb','protobuf','none','identity',''].includes(compression))fail('TRANSPORT_COMPRESSION_UNSUPPORTED');}
   catch(error){fail(error.message==='TRANSPORT_COMPRESSION_UNSUPPORTED'?error.message:'TRANSPORT_DECOMPRESS_FAILED');}
  }else if(raw.format!=='response')fail('TRANSPORT_FORMAT_UNSUPPORTED');
  try{const response=decode('Response',body);return {messages:response.messages||response.messages_list||[],compression,adapter:'official-transport-types'};}catch{fail('TRANSPORT_ENVELOPE_INVALID');}
 }
 async unpack(raw,{transport}={}){
  let bytes;
  try{
   bytes=await this.readRaw(raw);if(sha(bytes)!==raw.contentHash)fail('RAW_HASH_MISMATCH');
   if(!bytes.length)fail('TRANSPORT_EMPTY_INPUT');
   const existing=this.index.transport(raw.rawId);if(existing?.status==='unpacked'||existing?.status==='control')return {...existing,messages:this.index.forRaw(raw.rawId)};
   const envelope=this.envelope(raw,bytes),messages=[];
   for(const [messageIndex,item]of envelope.messages.entries()){
    const payload=Buffer.from(item.payload||[]),payloadHash=sha(payload),protoId=sha(`${raw.rawId}:${messageIndex}`);
    let file;if(raw.format==='business-payload')file=(await this.readRaw(raw,{pathOnly:true}));
    else{await fs.mkdir(this.directory,{recursive:true});file=path.join(this.directory,payloadHash+'.bin');try{const handle=await fs.open(file,'wx');try{await handle.writeFile(payload);await handle.sync();}finally{await handle.close();}}catch(error){if(error.code!=='EEXIST')throw error;if(sha(await fs.readFile(file))!==payloadHash)fail('PROTO_PAYLOAD_HASH_MISMATCH');}}
    const message={protoId,rawId:raw.rawId,recordingId:raw.recordingId,messageIndex,method:item.method||'',msgId:String(item.msg_id||'0'),payloadHash,payloadSize:payload.length,rawOffset:null,payloadBoundary:raw.format==='business-payload'?'existing-business-payload':'derived-business-payload',parseStatus:'pending',eventId:null};
    this.index.add(message,file);messages.push(message);
   }
   const csharpAgreement=transport?transport.length===messages.length&&transport.every((x,i)=>x.method===messages[i].method&&String(x.msgId??'0')===messages[i].msgId&&sha(Buffer.from(x.payloadBase64||'','base64'))===messages[i].payloadHash):null;
   const result={rawId:raw.rawId,status:envelope.kind==='control'?'control':'unpacked',stage:'transport',version:this.version,inputHash:raw.contentHash,compression:envelope.compression,adapter:envelope.adapter,messageCount:messages.length,csharpAgreement,completedAt:new Date().toISOString()};
   this.index.saveTransport(raw.rawId,result);return {...result,messages:this.index.forRaw(raw.rawId)};
  }catch(error){const errorCode=['RAW_HASH_MISMATCH','TRANSPORT_EMPTY_INPUT','TRANSPORT_ENVELOPE_INVALID','TRANSPORT_DECOMPRESS_FAILED','TRANSPORT_COMPRESSION_UNSUPPORTED','TRANSPORT_FORMAT_UNSUPPORTED','PROTO_PAYLOAD_HASH_MISMATCH'].includes(error.message)?error.message:'PROTO_INDEX_PERSIST_FAILED';const result={rawId:raw.rawId,status:'error',stage:errorCode.startsWith('PROTO_')?'proto-index':'transport',version:this.version,errorCode,completedAt:new Date().toISOString()};this.index.saveTransport(raw.rawId,result);return {...result,messages:[]};}
 }
 async readPayload(protoId){const message=this.index.get(protoId);if(!message)fail('RESOURCE_NOT_FOUND');const bytes=await fs.readFile(message.payloadFile);if(sha(bytes)!==message.payloadHash)fail('PROTO_PAYLOAD_HASH_MISMATCH');return bytes;}
}
