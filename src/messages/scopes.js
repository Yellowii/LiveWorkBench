// Only served by the authenticated loopback MessageView API. IDs here are query
// identities, never derived from a display label or a mutable selected room.
export function messageScopes(runtime,{coordinator,sources,profiles}){
 const state=coordinator.view(),active=state.active,capture=sources.view().captureState;
 const records=[...runtime.store.sessions(),...[...new Set(runtime.replayEngine?.workers.values()||[])].flatMap(worker=>worker.store.sessions())];
 const items=records.sort((a,b)=>String(b.firstObservedAt||'').localeCompare(String(a.firstObservedAt||''))).slice(0,200).map(s=>{
  const profileId=active?.roomId===s.roomId?active.profileId:state.lastEnded?.roomId===s.roomId?state.lastEnded.profileId:null;
  const name=profiles.all().find(p=>p.profileId===profileId)?.name||'直播间 '+s.roomId;
  return {scopeKey:JSON.stringify([s.mode,s.runtimeNamespace,s.roomId,s.sessionId]),name,roomId:s.roomId,sessionId:s.sessionId,mode:s.mode,namespace:s.runtimeNamespace,sessionState:s.sessionState,archiveState:s.archiveState||'NOT_REQUESTED',startedAt:s.startedAt||s.firstObservedAt,endedAt:s.endedAt||null};
 });
 const roomId=active?.roomId||runtime.activeRoom,current=items.find(s=>s.mode==='live'&&s.sessionState!=='ENDED'&&s.sessionId===runtime.sessions.find(roomId)?.sessionId&&s.roomId===roomId);
 const ended=items.find(s=>s.mode==='live'&&s.sessionState==='ENDED'&&(s.sessionId===state.lastEnded?.sessionId||s.roomId===active?.roomId));
 return {current:['STOPPED','FAILED'].includes(capture)?null:current||null,ended:ended||null,items};
}
