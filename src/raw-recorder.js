import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
export class RawRecorder {
 constructor(root,store){this.root=root;this.store=store;this.pending=0;this.maxPending=64;}
 registerExisting(input){const raw={rawId:randomUUID(),recordingId:input.recordingId,format:input.format,method:input.method,mode:'replay',runtimeNamespace:input.runtimeNamespace,sourceType:null,anchorUid:null,originalSequence:input.originalSequence,indexMsgId:input.indexMsgId,receivedAt:new Date().toISOString(),persistedAt:new Date().toISOString(),durabilityLevel:'existing-read-only-input',byteBoundary:'existing-business-payload',contentHash:createHash('sha256').update(input.bytes).digest('hex'),size:input.bytes.length};return this.store.addRaw(raw,input.filePath);}
 async append(input){
  if(input.bytes.length>8*1024*1024)throw new Error('RAW_TOO_LARGE');
  if(this.pending>=this.maxPending)throw new Error('RAW_BACKPRESSURE');
  input={...input,bytes:Buffer.from(input.bytes)};
  this.pending++;try{return await this.persist(input);}finally{this.pending--;}
 }
 async persist(input){
  const rawId=randomUUID(),recordingId=input.recordingId||input.captureId||'manual';
  const metadata={rawId,recordingId,receivedAt:input.receivedAt||new Date().toISOString(),persistedAt:null,sourceType:input.sourceType||'LiveHookSource',sourceEpoch:input.sourceEpoch||'1',sourceConnectionId:input.sourceConnectionId||null,captureInputSeq:input.captureInputSeq||null,observedRoomId:input.observedRoomId||null,transport:input.transport||null,direction:input.direction||null,mode:input.mode||'live',runtimeNamespace:input.runtimeNamespace||'live',format:input.format||'frame',method:input.method||null,anchorUid:input.anchorUid||null,processName:input.processName||null,urlPath:input.urlPath||null,httpStatus:input.httpStatus??null,byteBoundary:input.byteBoundary||input.format||'frame',contentHash:createHash('sha256').update(input.bytes).digest('hex'),size:input.bytes.length};
  try{await fs.mkdir(this.root,{recursive:true});const file=path.join(this.root,`${rawId}.bin`);const handle=await fs.open(file,'wx');try{await handle.writeFile(input.bytes);await handle.sync();}finally{await handle.close();}metadata.persistedAt=new Date().toISOString();metadata.durabilityLevel='file-fsync-and-sqlite-full';this.store.addRaw(metadata,file);return metadata;}
  catch{throw new Error('RAW_PERSIST_FAILED');}
 }
}
