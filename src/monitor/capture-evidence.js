// One indexed read of the existing RAW ledger; does not alter capture state.
export function committedCaptureEvidence(store,source){
 if(!source?.captureId)return null;
 const raw=store.rawPage(source.captureId,{limit:1}).items[0];
 if(!raw||raw.recordingId!==source.captureId||raw.mode!=='live'||raw.runtimeNamespace!=='live')return null;
 return {profileId:raw.profileId||null,captureId:source.captureId,received:raw.captureSeq,lastMessageAt:raw.receivedAt};
}
