import fs from 'node:fs/promises';
import {fieldAt} from './dictionary.js';
export function nativeField(runtime,id,pointer){const event=runtime.store.event(id);if(!event)throw Error('RESOURCE_NOT_FOUND');try{return fieldAt(runtime.parser.native,event.eventType,pointer);}catch{return {path:pointer,confidence:'unknown',label:'Proto 对应关系未确认'};}}
// Only event-linked business bytes, never HTTP request/response headers or vault files.
export async function messageBinary(runtime,id,params){
 const event=runtime.store.event(id);if(!event)throw Error('RESOURCE_NOT_FOUND');
 const rawId=params.get('rawId'),protoId=params.get('protoId');if(!event.rawRefs?.includes(rawId))throw Error('RESOURCE_NOT_FOUND');
 const trace=runtime.rawDetail(event.captureId,rawId,event.runtimeNamespace),owner=runtime.owner(event.runtimeNamespace);
 let file=trace.filePath,hash=trace.contentHash;
 if(protoId){if(!trace.processing?.messages?.some(x=>x.protoId===protoId&&x.eventId===id))throw Error('RESOURCE_NOT_FOUND');const item=owner.store.protos.get(protoId);if(!item||item.rawId!==rawId)throw Error('RESOURCE_NOT_FOUND');file=item.payloadFile;hash=item.payloadHash;}
 else if(!['business-payload','frame'].includes(trace.format))throw Error('CAPABILITY_UNAVAILABLE');
 const offset=Number(params.get('offset')||0),limit=Number(params.get('limit')||4096);if(!Number.isSafeInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>65536)throw Error('CURSOR_MISMATCH');
 const handle=await fs.open(file,'r');try{const {size}=await handle.stat();if(offset>size)throw Error('CURSOR_MISMATCH');const buffer=Buffer.alloc(Math.min(limit,size-offset)),{bytesRead}=await handle.read(buffer,0,buffer.length,offset),bytes=buffer.subarray(0,bytesRead);return {rawId,protoId,size,offset,hash,hashScope:'persisted-index-not-recomputed-for-slice',hex:bytes.toString('hex'),base64:bytes.toString('base64'),nextOffset:offset+bytesRead<size?offset+bytesRead:null};}finally{await handle.close();}
}
