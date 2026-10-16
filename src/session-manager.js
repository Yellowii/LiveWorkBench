import {randomUUID} from 'node:crypto';
export class SessionManager {
  constructor(store){this.store=store;}
  find(roomId,namespace='live'){return this.store.sessions().filter(x=>x.roomId===String(roomId)&&x.runtimeNamespace===namespace).sort((a,b)=>(b.generation||0)-(a.generation||0))[0]||null;}
  beginConfirmed(evidence,sourceEpoch){
    const old=this.find(evidence.roomId),trusted=evidence.confirmedState==='LIVE'&&evidence.queryState==='LIVE'&&evidence.evidence?.source==='douyin-structured-room';
    if(!trusted||!evidence.anchorUid)return old;
    if(old?.anchorUid&&old.anchorUid!==evidence.anchorUid)throw Error('CONTEXT_CONFLICT');
    const ended=old?.sessionState==='ENDED';
    if(ended&&!(Date.parse(evidence.lastTransitionAt)>Date.parse(old.endedAt)&&Date.parse(evidence.checkedAt)>=Date.parse(evidence.lastTransitionAt)))return old;
    return this.observe({roomId:evidence.roomId,anchorUid:evidence.anchorUid,live:true,sourceEpoch,newGeneration:ended,evidenceRef:`monitor-start:${evidence.profileId||'room'}:${evidence.stateVersion}`,observedAt:evidence.checkedAt});
  }
  archive(sessionId,endEventId){
    const state=this.store.sessions().find(x=>x.sessionId===sessionId);
    if(!state||state.sessionState!=='ENDED'||state.archiveState==='COMPLETE')return state;
    state.archiveState='COMPLETE';state.archivedAt=new Date().toISOString();state.archiveFormat='indexed-events-v1';state.endEventId=endEventId;
    state.stateVersion=String(BigInt(state.stateVersion)+1n);this.store.saveSession(state.key,state);return state;
  }
  observe({roomId,anchorUid,mode='live',namespace='live',created=false,live=false,ended=false,evidenceRef,sourceEpoch,newGeneration=false,observedAt=new Date().toISOString()}){
    if(!roomId)return null;
    let state=this.find(roomId,namespace);const generation=newGeneration?(state?.generation||0)+1:state?.generation||0,key=state&&!newGeneration?state.key:`${namespace}:${roomId}${generation?':'+generation:''}`;
    if(newGeneration)state=null;
    if(!state)state={key,generation,sessionId:randomUUID(),roomId:String(roomId),anchorUid:anchorUid||null,mode,runtimeNamespace:namespace,sessionState:'UNRESOLVED',roomState:'UNKNOWN',platformLiveState:'UNKNOWN',pushState:'UNKNOWN',captureState:'CONNECTED',archiveState:'NOT_REQUESTED',stateVersion:'0',startEvidenceMissing:true,startedAt:null,endedAt:null};
    const semantic=()=>JSON.stringify([state.anchorUid,state.sessionState,state.roomState,state.platformLiveState,state.pushState,state.captureState,state.startedAt,state.endedAt,state.startEvidenceMissing]);
    const before=semantic();
    if(state.anchorUid&&anchorUid&&state.anchorUid!==anchorUid)throw new Error('CONTEXT_CONFLICT');
    state.anchorUid=anchorUid||state.anchorUid;
    if(created&&state.sessionState!=='ENDED'){state.roomState='CREATED';if(state.sessionState==='UNRESOLVED')state.sessionState='CREATED';}
    if(live&&state.sessionState!=='ENDED'){state.platformLiveState='LIVE';state.sessionState='LIVE';state.startEvidenceMissing=false;state.startedAt??=observedAt;}
    if(ended){state.sessionState='ENDED';state.platformLiveState='ENDED';state.roomState='ENDED';state.endedAt??=observedAt;state.archiveState??='NOT_REQUESTED';if(state.archiveState!=='COMPLETE')state.archiveState='PENDING';}
    if(sourceEpoch)state.lastSourceEpoch=sourceEpoch;
    if(state.sessionState!=='ENDED')state.captureState='CONNECTED';
    state.firstObservedAt??=observedAt;state.lastObservedAt=observedAt;
    state.evidenceRefs=[...new Set([...(state.evidenceRefs||[]),evidenceRef].filter(Boolean))].slice(-100);
    if(before!==semantic()||state.stateVersion==='0')state.stateVersion=String(BigInt(state.stateVersion)+1n);
    this.store.saveSession(key,state);return state;
  }
  interrupt(){for(const state of this.store.sessions().filter(x=>x.mode==='live')){const next=state.sessionState==='ENDED'?'STOPPED':'INTERRUPTED';if(state.captureState===next)continue;state.captureState=next;state.stateVersion=String(BigInt(state.stateVersion)+1n);this.store.saveSession(state.key,state);}}
}
