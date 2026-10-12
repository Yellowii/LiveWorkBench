import {randomUUID} from 'node:crypto';
export class SessionManager {
  constructor(store){this.store=store;}
  observe({roomId,anchorUid,mode='live',namespace='live',created=false,live=false,ended=false}){
    if(!roomId)return null;
    const key=`${namespace}:${roomId}`;let state=this.store.sessions().find(x=>x.key===key);
    if(!state)state={key,sessionId:randomUUID(),roomId:String(roomId),anchorUid:anchorUid||null,mode,runtimeNamespace:namespace,sessionState:'UNRESOLVED',roomState:'UNKNOWN',platformLiveState:'UNKNOWN',pushState:'UNKNOWN',captureState:'CONNECTED',stateVersion:'0',startEvidenceMissing:true,startedAt:null,endedAt:null};
    if(state.anchorUid&&anchorUid&&state.anchorUid!==anchorUid)throw new Error('CONTEXT_CONFLICT');
    state.anchorUid=anchorUid||state.anchorUid;
    if(created&&state.sessionState!=='ENDED'){state.roomState='CREATED';if(state.sessionState==='UNRESOLVED')state.sessionState='CREATED';}
    if(live&&state.sessionState!=='ENDED'){state.platformLiveState='LIVE';state.sessionState='LIVE';state.startEvidenceMissing=false;state.startedAt??=new Date().toISOString();}
    if(ended){state.sessionState='ENDED';state.platformLiveState='ENDED';state.roomState='ENDED';state.endedAt??=new Date().toISOString();}
    state.captureState='CONNECTED';state.stateVersion=String(Number(state.stateVersion)+1);this.store.saveSession(key,state);return state;
  }
  interrupt(){for(const state of this.store.sessions().filter(x=>x.mode==='live')){state.captureState='INTERRUPTED';this.store.saveSession(state.key,state);}}
}
