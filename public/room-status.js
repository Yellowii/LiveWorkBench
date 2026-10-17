// Presentation of independent evidence; never used to start/stop a collector.
export function roomPresentation(profile,status={},now=Date.now()){
 const m=(status.monitor||[]).find(x=>x.profileId===profile.profileId),age=now-Date.parse(m?.checkedAt),fresh=Number.isFinite(age)&&age>=0&&age<profile.pollMs*2,version=m?.profileVersion===profile.version;
 let platform='开播状态未知';
 if(m?.checkedAt&&!version)platform='目标配置已变更，待重新检测';
 else if(m?.queryState==='UNKNOWN'&&m.errorCode==='MONITOR_TIMEOUT')platform=fresh?'本次检测超时，开播状态待确认':'检测超时且结果已过期';
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
 const confirmedTime=Date.parse(m?.lastTransitionAt),lastConfirmedAt=version&&['LIVE','ENDED'].includes(m?.confirmedState)&&Number.isFinite(confirmedTime)&&confirmedTime<=now?m.lastTransitionAt:null;
 return {platform,flow,monitoring:profile.monitorEnabled?'周期监控已开启':active&&status.coordinator.active.sourceType==='WebSource'?'监听期间开播检测已开启':'周期监控未开启（开播状态不会自动刷新）',lastConfirmedAt,checkedAt:m?.checkedAt||null,lastMessageAt:active&&proof?.profileId===profile.profileId&&proof.received>0?proof.lastMessageAt:null,source:m?.evidence?.source||null,errorCode:m?.errorCode||null,lastConfirmed:m?.confirmedState||'UNKNOWN'};
}
export function captureFailureText(capture){
 if(capture?.captureState!=='FAILED')return null;
 const code=/^[A-Z][A-Z0-9_]{0,100}$/.test(capture.reason||'')?capture.reason:null;
 const known={AUTH_STATE_UNAVAILABLE:'保存的登录态读取失败；凭据未因此清除',AUTH_LOGIN_REQUIRED:'当前没有可用的观看登录态',AUTH_STATE_CHANGED:'观看登录态已变化',MONITOR_TIMEOUT:'连接准备时请求超时',WEB_HANDSHAKE_OR_POLICY_BLOCKED:'弹幕握手或平台策略校验失败'};
 return '监听连接失败：'+(known[code]||'请查看开发诊断')+(code?'（'+code+'）':'')+'。这不代表直播间已下播。';
}
