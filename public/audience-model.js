// Bounded loaded-history projection. No joining rooms, captures or replay domains.
export function audienceSnapshot(items,mode,roomId,captureId,namespace){
 const ordered=items.filter(x=>x.mode===mode&&x.roomId===roomId&&x.captureId===captureId&&x.category==='audience'&&(!namespace||x.runtimeNamespace===namespace)).slice().sort((a,b)=>BigInt(a.eventSeq)<BigInt(b.eventSeq)?-1:1);
 let stats=null,ranks=null;
 for(const item of ordered){const a=item.content.audience;if(a.kind==='ranks'){ranks=item;continue;}const old=stats?.content.audience;
  if(old&&(BigInt(a.version||0)<BigInt(old.version||0)||a.incremental&&BigInt(a.value||0)<=BigInt(old.value||0)))continue;
  stats=item;
 }
 return {stats,ranks};
}
