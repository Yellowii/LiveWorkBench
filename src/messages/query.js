import {messageView,mappingVersion} from './message-view.js';

import {messageFields} from './dictionary.js';
export function messagePage(runtime,params){
 const mode=params.get('mode')||'live',namespace=params.get('namespace'),method=params.get('method'),anchorId=params.get('beforeEventId');const roomId=params.get('roomId'),sessionId=params.get('sessionId');let cursor=params.get('cursor');
 if(anchorId){
  if(cursor||params.has('afterSeq'))throw Error('CURSOR_MISMATCH');
  const anchor=runtime.store.event(anchorId);
  if(!anchor||anchor.mode!==mode||(namespace&&anchor.runtimeNamespace!==namespace)||(method&&anchor.eventType!==method)||(roomId&&anchor.roomId!==roomId)||(sessionId&&anchor.sessionId!==sessionId))throw Error('CURSOR_MISMATCH');
  cursor=runtime.store.cursors.encode({filters:{kind:'events',mode,namespace:namespace||null,method:method||null,afterSeq:null,...(roomId?{roomId}:{}),...(sessionId?{sessionId}:{})},before:String(anchor.eventSeq),snapshot:runtime.store.eventHighWatermark()});
 }
 const page=runtime.store.events({limit:params.get('limit')||50,cursor,mode,namespace,method,afterSeq:params.get('afterSeq'),roomId,sessionId});
 return {...page,items:page.items.map(viewFor),mappingVersion,scope:'authenticated-local-only'};
}
export function messageDetail(runtime,id,publicSafe){
 const event=runtime.store.event(id);if(!event)throw Error('RESOURCE_NOT_FOUND');
 const view=viewFor(event),official=event.payload?.official??null,raw=[],protos=[];
 for(const rawId of (event.rawRefs||[]).slice(0,10)){
  try{const trace=runtime.rawDetail(event.captureId,rawId,event.runtimeNamespace);raw.push(publicSafe(trace));
   for(const ref of (trace.processing?.messages||[]).filter(x=>x.eventId===event.eventId).slice(0,10)){
    try{const metadata=runtime.protoDetail(ref.protoId,event.runtimeNamespace);protos.push(publicSafe({...metadata,attempts:metadata.attempts.map(({official,...attempt})=>attempt)}));}catch{protos.push({protoId:ref.protoId,unavailable:true});}
   }
  }catch{raw.push({rawId,unavailable:true});}
 }
 return {view,official,schema:safeFields(runtime,event,official),raw,protos,parserVersion:runtime.parser.version,privacy:'完整原生业务 JSON，仅本机认证访问；中文解释与增强映射独立，登录凭据不从认证存储加载',traceTruncated:(event.rawRefs||[]).length>10};
}

function safeFields(runtime,event,official){try{return messageFields(runtime.parser.native,event.eventType,official);}catch{return {rootType:null,fields:[],dictionary:[],truncated:false,error:'SCHEMA_MAPPING_UNAVAILABLE'};}}

function viewFor(event){return {...messageView(event),eventId:event.eventId,rawRefs:event.rawRefs||[],captureId:event.captureId,roomId:event.roomId,sessionId:event.sessionId,sessionGeneration:event.sessionGeneration||0,runtimeNamespace:event.runtimeNamespace,mode:event.mode,eventSeq:event.eventSeq};}
