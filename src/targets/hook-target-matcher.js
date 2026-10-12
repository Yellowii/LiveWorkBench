import {EventEmitter} from 'node:events';
export class HookTargetMatcher extends EventEmitter{
 constructor(profiles){super();this.profiles=profiles;this.proofs=profiles.repository.getState('hook-target-evidence-v1')||{};this.status={streamReady:false,reason:'HOOK_STREAM_NOT_OBSERVED',profileId:null,pushState:'UNKNOWN'};}
 view(){return {...this.status};}
 update(value){const semantic=state=>{const {lastObservedAt,lastRawId,identityEvidenceRawId,...fields}=state;return JSON.stringify(fields);};const before=semantic(this.status);this.status={...this.status,...value};if(before!==semantic(this.status))this.emit('match.updated',this.view());}
 required(){return this.profiles.all().some(p=>p.enabled&&p.sourceType==='LiveHookSource');}
 observeHttp(raw,{roomId,anchorUid,secUid,platformLiveState}){
  if(raw.mode!=='live'||raw.sourceType!=='LiveHookSource'||raw.processName!=='直播伴侣'||!roomId||!anchorUid)return;
  const old=this.proofs[roomId];if(old&&old.anchorUid!==anchorUid){this.proofs[roomId]={...old,conflict:true};this.update({streamReady:false,reason:'HOOK_IDENTITY_CONFLICT',roomId});}
  else this.proofs[roomId]={roomId,anchorUid,secUid:secUid||old?.secUid||null,platformLiveState,stateVersion:old?.stateVersion||'1',rawId:raw.rawId,observedAt:raw.receivedAt,recordingId:raw.recordingId};
  const entries=Object.entries(this.proofs).slice(-100);this.proofs=Object.fromEntries(entries);this.profiles.repository.setState('hook-target-evidence-v1',this.proofs);
 }
 match(raw,{roomId,anchorUid,businessDecoded=false}){
  if(!this.required())return {allowed:true,roomId,anchorUid};
  const proof=this.proofs[roomId];if(proof?.conflict||(proof?.anchorUid&&anchorUid&&proof.anchorUid!==anchorUid)){this.update({streamReady:false,reason:'HOOK_IDENTITY_CONFLICT',roomId});return {allowed:false};}
  if(!proof||!this.profiles.repository.raw(proof.rawId)){this.update({streamReady:false,reason:'HOOK_IDENTITY_EVIDENCE_REQUIRED'});return {allowed:false};}
  const matches=this.profiles.all().filter(p=>p.enabled&&p.sourceType==='LiveHookSource').filter(p=>{const target=this.profiles.resolver.classify(p.target);if(target.anchorUid)return target.anchorUid===proof.anchorUid;if(target.secUid)return target.secUid===proof.secUid;if(target.roomId)return target.roomId===roomId;const resolved=this.profiles.state(p.profileId)?.evidence;return target.web_rid&&resolved?.web_rid===target.web_rid&&resolved?.anchorUid===proof.anchorUid&&resolved?.roomId===roomId;}).sort((a,b)=>b.priority-a.priority);
  if(!matches.length){this.update({streamReady:false,reason:'HOOK_PROFILE_UNMATCHED',roomId});return {allowed:false};}
  if(matches.length>1&&matches[0].priority===matches[1].priority){this.update({streamReady:false,reason:'PROFILE_SELECTION_REQUIRED',roomId});return {allowed:false};}
  const profile=matches[0],stream=raw.format==='frame'&&raw.processName==='直播伴侣'&&businessDecoded;
  this.update({profileId:profile.profileId,profileVersion:profile.version,roomId,anchorUid:proof.anchorUid,stateVersion:proof.stateVersion||'1',identityEvidenceRawId:proof.rawId,streamReady:stream||Boolean(this.status.streamReady&&this.status.roomId===roomId),reason:stream?'HOOK_MATCHED_STREAM':this.status.streamReady?'HOOK_MATCHED_STREAM':'HOOK_IDENTITY_MATCHED',platformLiveState:proof.platformLiveState||'UNKNOWN',pushState:'UNKNOWN',sourceConnectionId:raw.sourceConnectionId||null,recordingId:raw.recordingId,sourceEpoch:raw.sourceEpoch,lastRawId:raw.rawId,lastObservedAt:raw.receivedAt});
  return {allowed:true,roomId,anchorUid:proof.anchorUid,profileId:profile.profileId};
 }
 interrupt(){this.update({streamReady:false,reason:'HOOK_CONNECTION_UNCERTAIN'});}
 ended(raw,roomId,anchorUid){const proof=this.proofs[roomId];if(!proof||proof.anchorUid!==anchorUid)return;proof.platformLiveState='ENDED';proof.stateVersion=String(BigInt(proof.stateVersion||'1')+1n);this.profiles.repository.setState('hook-target-evidence-v1',this.proofs);if(this.status.roomId===roomId)this.update({platformLiveState:'ENDED',stateVersion:proof.stateVersion,streamReady:false,reason:'HOOK_PLATFORM_ENDED',lastObservedAt:raw.receivedAt,lastRawId:raw.rawId});}
}
