// Presentation of independent evidence; never used to start/stop a collector.
export function roomPresentation(profile,status={},now=Date.now()){
 const m=(status.monitor||[]).find(x=>x.profileId===profile.profileId),age=now-Date.parse(m?.checkedAt),fresh=Number.isFinite(age)&&age>=0&&age<profile.pollMs*2,version=m?.profileVersion===profile.version;
 let platform='开播状态未知';
 if(m?.checkedAt&&!version)platform='目标配置已变更，待重新检测';
 else if(m?.checkedAt&&!fresh)platform='开播状态未知（检测已过期）';
 else if(fresh&&version&&['LIVE','ENDED'].includes(m.queryState)){
  const label=m.queryState==='LIVE'?'已开播':'已下播';
  platform=m.confirmedState===m.queryState&&m.confirmationCount>=profile.confirmations?label:`检测到${label}，待连续确认 ${m.confirmationCount||0}/${profile.confirmations}`;
 }
 const ended=status.coordinator?.lastEnded;if(ended?.profileId===profile.profileId&&!(fresh&&version&&m.queryState==='LIVE'&&Date.parse(m.lastTransitionAt)>Date.parse(ended.endedAt)))platform='已下播';
 const active=status.coordinator?.active?.profileId===profile.profileId,capture=status.capture||{},proof=status.captureEvidence,elapsed=now-Date.parse(proof?.lastMessageAt);
 let flow='未监听，消息数据流未检测';
 if(capture.captureState==='STOPPED')flow='监听已停止，当前无采集数据流';
 else if(active){
  flow=capture.captureState==='CONNECTED'?'连接已建立，尚未确认近期数据流':`采集状态 ${capture.captureState||'未知'}，近期数据流未确认`;
  if(capture.captureState==='CONNECTED'&&proof?.profileId===profile.profileId&&proof.received>0&&elapsed>=0&&elapsed<=30000)flow='有消息数据流（30秒内 RAW 已落盘）';
  else if(proof?.profileId===profile.profileId&&proof.received>0&&elapsed>30000)flow='近期未收到消息数据（不等于下播）';
 }
 return {platform,flow,checkedAt:m?.checkedAt||null,lastMessageAt:active&&proof?.profileId===profile.profileId&&proof.received>0?proof.lastMessageAt:null,source:m?.evidence?.source||null,errorCode:m?.errorCode||null,lastConfirmed:m?.confirmedState||'UNKNOWN'};
}
