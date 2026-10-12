import {randomUUID} from 'node:crypto';
export class SessionManager {
  constructor(store){this.store=store;}
  find(roomId,namespace='live'){return this.store.sessions().find(x=>x.key===`${namespace}:${roomId}`)||null;}
  observe({roomId,anchorUid,mode='live',namespace='live',created=false,live=false,ended=false,evidenceRef,observedAt=new Date().toISOString()}){
    if(!roomId)return null;
    const key=`${namespace}:${roomId}`;let state=this.find(roomId,namespace);
    if(!state)state={key,sessionId:randomUUID(),roomId:String(roomId),anchorUid:anchorUid||null,mode,runtimeNamespace:namespace,sessionState:'UNRESOLVED',roomState:'UNKNOWN',platformLiveState:'UNKNOWN',pushState:'UNKNOWN',captureState:'CONNECTED',stateVersion:'0',startEvidenceMissing:true,startedAt:null,endedAt:null};
    const semantic=()=>JSON.stringify([state.anchorUid,state.sessionState,state.roomState,state.platformLiveState,state.pushState,state.captureState,state.startedAt,state.endedAt,state.startEvidenceMissing]);
    const before=semantic();
    if(state.anchorUid&&anchorUid&&state.anchorUid!==anchorUid)throw new Error('CONTEXT_CONFLICT');
    state.anchorUid=anchorUid||state.anchorUid;
    if(created&&state.sessionState!=='ENDED'){state.roomState='CREATED';if(state.sessionState==='UNRESOLVED')state.sessionState='CREATED';}
    if(live&&state.sessionState!=='ENDED'){state.platformLiveState='LIVE';state.sessionState='LIVE';state.startEvidenceMissing=false;state.startedAt??=new Date().toISOString();}
    if(ended){state.sessionState='ENDED';state.platformLiveState='ENDED';state.roomState='ENDED';state.endedAt??=new Date().toISOString();}
    if(state.sessionState!=='ENDED')state.captureState='CONNECTED';
    state.firstObservedAt??=observedAt;state.lastObservedAt=observedAt;
    state.evidenceRefs=[...new Set([...(state.evidenceRefs||[]),evidenceRef].filter(Boolean))].slice(-100);
    if(before!==semantic()||state.stateVersion==='0')state.stateVersion=String(BigInt(state.stateVersion)+1n);
    this.store.saveSession(key,state);return state;
  }
  interrupt(){for(const state of this.store.sessions().filter(x=>x.mode==='live'&&x.sessionState!=='ENDED'&&x.captureState!=='INTERRUPTED')){state.captureState='INTERRUPTED';state.stateVersion=String(BigInt(state.stateVersion)+1n);this.store.saveSession(state.key,state);}}
}
