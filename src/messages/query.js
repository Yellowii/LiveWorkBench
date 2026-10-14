import {messageView,mappingVersion} from './message-view.js';
import {localOfficial} from './privacy.js';
import {messageFields} from './dictionary.js';
export function messagePage(runtime,params){
 const mode=params.get('mode')||'live',namespace=params.get('namespace'),method=params.get('method'),anchorId=params.get('beforeEventId');let cursor=params.get('cursor');
 if(anchorId){
  if(cursor||params.has('afterSeq'))throw Error('CURSOR_MISMATCH');
  const anchor=runtime.store.event(anchorId);
  if(!anchor||anchor.mode!==mode||(namespace&&anchor.runtimeNamespace!==namespace)||(method&&anchor.eventType!==method))throw Error('CURSOR_MISMATCH');
  cursor=runtime.store.cursors.encode({filters:{kind:'events',mode,namespace:namespace||null,method:method||null,afterSeq:null},before:String(anchor.eventSeq),snapshot:runtime.store.eventHighWatermark()});
 }
 const page=runtime.store.events({limit:params.get('limit')||50,cursor,mode,namespace,method,afterSeq:params.get('afterSeq')});
 return {...page,items:page.items.map(messageView),mappingVersion,scope:'authenticated-local-only'};
}
export function messageDetail(runtime,id,publicSafe){
 const event=runtime.store.event(id);if(!event)throw Error('RESOURCE_NOT_FOUND');
 const view=messageView(event),official=localOfficial(event.payload?.official),raw=[],protos=[];
 for(const rawId of (event.rawRefs||[]).slice(0,10)){
  try{const trace=runtime.rawDetail(event.captureId,rawId,event.runtimeNamespace);raw.push(publicSafe(trace));
   for(const ref of (trace.processing?.messages||[]).filter(x=>x.eventId===event.eventId).slice(0,10)){
    try{const metadata=runtime.protoDetail(ref.protoId,event.runtimeNamespace);protos.push(publicSafe({...metadata,attempts:metadata.attempts.map(({official,...attempt})=>attempt)}));}catch{protos.push({protoId:ref.protoId,unavailable:true});}
   }
  }catch{raw.push({rawId,unavailable:true});}
 }
 return {view,official,schema:messageFields(runtime.parser.native,event.eventType,official),raw,protos,parserVersion:runtime.parser.version,privacy:'本机可读投影；凭据、URL及未知字符串受过滤，原始存储未修改',traceTruncated:(event.rawRefs||[]).length>10};
}
