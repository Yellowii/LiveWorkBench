import fs from 'node:fs';
import {WebSource} from './web-source.js';
import {WebConnectionResolver} from './capture/websource/connection-resolver.js';
import {HttpRoomDiscovery} from './capture/websource/http-room-discovery.js';
import {NativeParameterProvider} from './capture/websource/native-parameters.js';
import {BrowserSource} from './capture/browser/browser-source.js';
import {LoginVault} from './auth/login-vault.js';

export class SourceController {
  constructor(runtime,bridge,settings,{loginManager,profiles}={}){
    this.runtime=runtime;this.bridge=bridge;this.settings=settings;this.web=new WebSource(runtime);this.queue=Promise.resolve();
    this.roomDiscovery=new HttpRoomDiscovery();
    this.nativeParameters=new NativeParameterProvider({credentialsFor:profile=>this.credentialsFor(profile),discovery:this.roomDiscovery});
    this.connectionResolver=new WebConnectionResolver({directProvider:(profile,evidence)=>this.nativeParameters.resolve(profile,evidence)});
    this.browser=new BrowserSource(runtime);this.vault=new LoginVault(runtime.dataDir);this.loginManager=loginManager;this.profiles=profiles;this.webMode='direct';
    this.browser.on('status',()=>runtime.emit('source.updated',this.view()));
    this.state=runtime.store.getState('source-control')||{selectedSource:'LiveHookSource',sourceEpoch:'1',stateVersion:'1'};
    runtime.selectedSource=this.state.selectedSource;runtime.activeSourceEpoch=this.state.sourceEpoch;
    this.web.on('status',status=>{runtime.emit('source.updated',this.view());const plan=this.webPlan;if(status.captureState==='FAILED'&&this.ownsPlan(plan)&&this.webMode==='direct'&&plan.profile.browserFallback&&!/^(?:AUTH_|TARGET_|STATE_|WEB_RAW_|WEB_CAPTURE_)/.test(status.reason||''))void this.enqueuePlan(plan,()=>this.startBrowserFallback(plan,status.reason||'WEB_TRANSPORT_FAILED')).catch(()=>{});});
  }
  currentWeb(){return this.webMode==='browser'?this.browser:this.web;}
  async credentialsFor(profile){return this.loginManager?this.loginManager.credentialsFor(profile):{storageState:await this.vault.load(profile.authRef||profile.profileId)};}
  view(){return {...this.state,connectionMode:this.webMode,...(this.state.selectedSource==='WebSource'?this.connectionDetail:{}),recoveryPending:Boolean(this.ownsPlan(this.webPlan)&&this.webMode==='browser'&&this.webPlan.profile.connectionMode==='direct'&&this.webPlan.profile.autoReconnect),captureState:this.state.selectedSource==='WebSource'?this.currentWeb().status.captureState:this.bridge.status.captureState};}
  async resolveProfile(profile){return this.roomDiscovery.discover(profile,await this.credentialsFor(profile));}
  capabilities(){return {liveHook:{implemented:true,available:Boolean(this.settings.certificatePath),reason:this.settings.certificatePath?null:'TLS_CERTIFICATE_REQUIRED'},webSource:{implemented:true,available:Boolean(this.settings.webSource?.url)&&fs.existsSync(new URL('./parser/live-raw-first-v6.js',import.meta.url)),reason:!this.settings.webSource?.url?'WEB_TARGET_NOT_CONFIGURED':fs.existsSync(new URL('./parser/live-raw-first-v6.js',import.meta.url))?null:'WEB_SOURCE_NOT_PREPARED'}};}
  failureReason(){return this.currentWeb().status.reason;}
  ownsPlan(plan){try{return Boolean(plan&&!this.closing&&this.webPlan===plan&&this.state.selectedSource==='WebSource'&&this.state.sourceEpoch===plan.epoch&&this.state.stateVersion===plan.version&&plan.stillCurrent());}catch{return false;}}
  enqueuePlan(plan,fn){const task=this.queue.catch(()=>{}).then(async()=>{if(!this.ownsPlan(plan)){await this.releaseParked(plan);return;}try{return await fn();}finally{if(!this.ownsPlan(plan))await this.releaseParked(plan);}});this.queue=task;return task;}
  async releaseParked(plan){if(plan&&this.parkedBrowserFor===plan){this.clearRecovery();await this.browser.stop();this.parkedBrowserFor=null;}}
  clearRecovery(){clearTimeout(this.directProbeTimer);clearTimeout(this.nativeStableTimer);}
  scheduleProbe(plan){clearTimeout(this.directProbeTimer);if(!this.ownsPlan(plan)||plan.profile.connectionMode==='browser'||!plan.profile.autoReconnect)return;this.directProbeTimer=setTimeout(()=>void this.probeNative(plan).catch(()=>{}),300000);this.directProbeTimer.unref();}
  async startNative(plan,config){await this.web.start({...config,profileId:plan.profile.profileId,operationId:plan.evidence.operationId,monitorOperationId:plan.evidence.monitorOperationId,monitorStateVersion:plan.evidence.stateVersion,networkPolicy:plan.profile.networkPolicy||{mode:'system'},autoReconnect:plan.profile.autoReconnect,retryLimit:plan.profile.retryLimit,refreshConnection:async()=>{if(!this.ownsPlan(plan))throw new Error('STATE_CONFLICT');return this.connectionResolver.resolve({...plan.profile,browserFallback:false},plan.evidence);},sourceEpoch:plan.epoch});}
  async startBrowserFallback(plan,reason){
    if(!this.ownsPlan(plan))return;this.clearRecovery();await this.web.stop();await this.browser.stop();this.parkedBrowserFor=null;if(!this.ownsPlan(plan))return;
    const config=await new WebConnectionResolver().resolve({...plan.profile,connectionMode:'browser',browserHeadless:true},plan.evidence);
    await this.runtime.gaps.record({reason:'WEB_BROWSER_HANDOFF',scope:'unknown-range',sourceType:'WebSource'});this.webMode='browser';this.connectionDetail={connectionReason:reason,parameterDiscovery:'http',browserHeadless:true};this.save();
    try{await this.browser.start({...config,connectionReason:reason,networkPolicy:plan.profile.networkPolicy||{mode:'system'},profileId:plan.profile.profileId,operationId:plan.evidence.operationId,monitorOperationId:plan.evidence.monitorOperationId,monitorStateVersion:plan.evidence.stateVersion,...await this.credentialsFor(plan.profile),autoReconnect:plan.profile.autoReconnect,sourceEpoch:plan.epoch});}catch{this.browser.update('FAILED','BROWSER_START_FAILED');}
    this.scheduleProbe(plan);this.save();
  }
  probeNative(plan){return this.enqueuePlan(plan,async()=>{
    if(this.webMode!=='browser')return;
    let config;try{config=await this.connectionResolver.resolve({...plan.profile,browserFallback:false},plan.evidence);}catch(error){this.connectionDetail.lastDirectProbe=/^(?:AUTH|TARGET|STATE|WEB|NETWORK)_[A-Z_]+$/.test(error.message)?error.message:'WEB_DYNAMIC_PARAMETERS_UNAVAILABLE';this.scheduleProbe(plan);this.save();return;}
    if(!this.ownsPlan(plan))return;this.clearRecovery();await this.browser.park();this.parkedBrowserFor=plan;this.runtime.interruptCapture();if(!this.ownsPlan(plan))return;
    await this.runtime.gaps.record({reason:'WEB_NATIVE_RECOVERY_HANDOFF',scope:'unknown-range',sourceType:'WebSource'});this.webMode='direct';this.nativeStableAt=Date.now();this.connectionDetail={connectionReason:'WEB_NATIVE_RECOVERY_PROBING',parameterDiscovery:'http',browserHeadless:null};this.save();
    try{await this.startNative(plan,config);}catch{await this.startBrowserFallback(plan,'WEB_NATIVE_RECOVERY_FAILED');return;}
    this.nativeStableTimer=setTimeout(()=>void this.settleNative(plan).catch(()=>{}),30000);this.nativeStableTimer.unref();
  });}
  settleNative(plan){return this.enqueuePlan(plan,async()=>{
    if(this.webMode!=='direct')return;
    if(this.web.status.captureState==='FAILED'&&/^(?:AUTH_|TARGET_|STATE_|WEB_RAW_|WEB_CAPTURE_)/.test(this.web.status.reason||'')){this.clearRecovery();await this.browser.stop();this.webPlan=null;this.save();return;}
    if(this.web.status.captureState==='CONNECTED'&&(this.web.client?.status.received||0)>=2&&Date.now()-Date.parse(this.web.status.lastMessageAt)<30000&&Date.now()-this.nativeStableAt>=30000){await this.browser.stop();this.parkedBrowserFor=null;this.connectionDetail.connectionReason='WEB_NATIVE_PARAMETERS_READY';this.save();return;}
    if(Date.now()-this.nativeStableAt>=90000){await this.startBrowserFallback(plan,'WEB_NATIVE_STABILITY_TIMEOUT');return;}
    this.nativeStableTimer=setTimeout(()=>void this.settleNative(plan).catch(()=>{}),10000);this.nativeStableTimer.unref();
  });}
  adoptable(profile){const match=this.hookMatcher?.view();return profile?.sourceType==='LiveHookSource'&&this.bridge.status.hookReady&&match?.streamReady&&match.profileId===profile.profileId;}
  hookEvidence(profile){const match=this.hookMatcher?.view();return this.adoptable(profile)&&match.platformLiveState==='LIVE'?{profileId:profile.profileId,profileVersion:profile.version,queryState:'LIVE',confirmedState:'LIVE',roomId:match.roomId,anchorUid:match.anchorUid,stateVersion:match.stateVersion,checkedAt:match.lastObservedAt,evidenceSource:'companion-raw'}:null;}
  hookEndedEvidence(profile){const match=this.hookMatcher?.view();return profile?.sourceType==='LiveHookSource'&&match?.platformLiveState==='ENDED'&&match.profileId===profile.profileId?{profileId:profile.profileId,profileVersion:profile.version,queryState:'ENDED',confirmedState:'ENDED',roomId:match.roomId,anchorUid:match.anchorUid,stateVersion:match.stateVersion,checkedAt:match.lastObservedAt,evidence:{source:'companion-raw'}}:null;}
  save(){this.runtime.store.setState('source-control',this.state);this.runtime.selectedSource=this.state.selectedSource;this.runtime.activeSourceEpoch=this.state.sourceEpoch;this.runtime.emit('source.updated',this.view());}
  action(body){const task=this.queue.catch(()=>{}).then(()=>this.control(body));this.queue=task;return task;}
  startProfile(profile,evidence,expectedVersion,stillCurrent=()=>true){const task=this.queue.catch(()=>{}).then(async()=>{
    if(expectedVersion!==this.state.stateVersion||!stillCurrent())throw new Error('STATE_CONFLICT');
    if(profile.sourceType!==this.state.selectedSource)throw new Error('SOURCE_SELECTION_MISMATCH');
    if(profile.sourceType==='LiveHookSource'){
      if(this.runtime.activeRoom&&this.runtime.activeRoom!==evidence.roomId)throw new Error('SOURCE_ROOM_BUSY');
      const match=this.hookMatcher?.view();if(!this.bridge.status.proxyBound||!this.bridge.status.hookReady||!match?.streamReady)throw new Error('LIVEHOOK_ENVIRONMENT_NOT_READY');
      if(match.profileId!==profile.profileId||match.anchorUid!==evidence.anchorUid||match.roomId!==evidence.roomId)throw new Error('LIVEHOOK_PROFILE_MISMATCH');
      this.activeProfileId=profile.profileId;this.runtime.log('LIVEHOOK_EXISTING_STREAM_ADOPTED',{profileId:profile.profileId});return this.view();
    }
    if(!['STOPPED','FAILED'].includes(this.view().captureState))throw new Error('SOURCE_BUSY');
    const config=await this.connectionResolver.resolve(profile,evidence);if(this.closing||!stillCurrent())throw new Error('STATE_CONFLICT');
    // A retained unfinished session is not an active transport. Drain before handing
    // the selected room to a new epoch; SessionManager keeps both rooms' history.
    await this.stopActive();if(this.closing||!stillCurrent())throw new Error('STATE_CONFLICT');
    this.state.sourceEpoch=String(BigInt(this.state.sourceEpoch)+1n);this.state.stateVersion=String(BigInt(this.state.stateVersion)+1n);this.runtime.activeRoom=evidence.roomId;this.save();
    this.webMode=config.kind==='browser'?'browser':'direct';this.activeProfileId=profile.profileId;
    this.connectionDetail={connectionReason:config.connectionReason,parameterDiscovery:config.parameterDiscovery||evidence.parameterDiscovery||'monitor',browserHeadless:config.kind==='browser'?config.headless:null};
    const plan=this.webPlan={profile,evidence,stillCurrent,epoch:this.state.sourceEpoch,version:this.state.stateVersion};
    if(config.kind==='browser')await this.browser.start({...config,networkPolicy:profile.networkPolicy||{mode:'system'},profileId:profile.profileId,operationId:evidence.operationId,monitorOperationId:evidence.monitorOperationId,monitorStateVersion:evidence.stateVersion,...await this.credentialsFor(profile),autoReconnect:profile.autoReconnect,sourceEpoch:this.state.sourceEpoch});
    else await this.startNative(plan,config);if(config.kind==='browser')this.scheduleProbe(plan);this.save();return this.view();
  });this.queue=task;return task;}
  stopProfile(expectedVersion){return this.action({action:'stop',expectedVersion});}
  loginProfile(profile,resolved){const task=this.queue.catch(()=>{}).then(async()=>{
    if(this.loginManager){let id=profile.authProfileId;if(!id){const ref=profile.authRef||profile.profileId,saved=await this.vault.inspect(ref);const item=saved.configured?this.loginManager.accounts.adoptLegacy(ref,{name:'已有登录态',rememberLogin:profile.persistLogin,networkPolicy:profile.networkPolicy||{mode:'system'}}):this.loginManager.accounts.get(this.loginManager.accounts.defaultId()||this.loginManager.accounts.create({name:'登录账号',rememberLogin:profile.persistLogin,networkPolicy:profile.networkPolicy||{mode:'system'}}).authProfileId);id=item.authProfileId;this.profiles?.update(profile.profileId,{authProfileId:id},profile.version);}return this.loginManager.login(id);}
    if(this.state.selectedSource!=='WebSource'||profile.sourceType!=='WebSource')throw new Error('SOURCE_SELECTION_MISMATCH');
    if(!['STOPPED','FAILED'].includes(this.view().captureState))throw new Error('SOURCE_BUSY');
    if(!resolved.web_rid)throw new Error('TARGET_MAPPING_REQUIRED');if(this.runtime.activeRoom&&this.runtime.activeRoom!==resolved.roomId)throw new Error('SOURCE_ROOM_BUSY');
    await this.stopActive();this.webMode='browser';this.activeProfileId=profile.profileId;this.state.sourceEpoch=String(BigInt(this.state.sourceEpoch)+1n);this.state.stateVersion=String(BigInt(this.state.stateVersion)+1n);this.save();
    await this.browser.start({roomUrl:'https://live.douyin.com/'+resolved.web_rid,roomId:resolved.roomId,anchorUid:resolved.anchorUid,blockMedia:profile.blockMedia,networkPolicy:profile.networkPolicy||{mode:'system'},headless:false,storageState:await this.vault.load(profile.authRef||profile.profileId),sourceEpoch:this.state.sourceEpoch});return this.view();
  });this.queue=task;return task;}
  async authStatus(profile){if(profile.authProfileId&&this.loginManager){const view=await this.loginManager.view(profile.authProfileId);return {configured:view.configured,savedAt:view.savedAt,validity:'UNKNOWN',account:{state:view.login.state},authProfileId:profile.authProfileId};}const saved=await this.vault.status(profile.authRef||profile.profileId),account=this.activeProfileId===profile.profileId?await this.browser.account():{state:'UNKNOWN'};return {...saved,account};}
  async saveLogin(profile){if(profile.authProfileId)throw new Error('AUTH_USE_ACCOUNT_MANAGEMENT');if(!profile.persistLogin)throw new Error('AUTH_PERSIST_NOT_ENABLED');if(this.activeProfileId!==profile.profileId||!this.browser.client?.context)throw new Error('AUTH_BROWSER_REQUIRED');const account=await this.browser.account();if(account.state!=='AUTHENTICATED')throw new Error('AUTH_CONFIRMATION_REQUIRED');return this.vault.save(profile.authRef||profile.profileId,await this.browser.client.context.storageState(),true);}
  async clearLogin(profile){if(profile.authProfileId)throw new Error('AUTH_USE_ACCOUNT_MANAGEMENT');const result=await this.vault.clear(profile.authRef||profile.profileId);if(this.activeProfileId===profile.profileId&&this.webMode==='browser')await this.stopProfile();return result;}
  async control({action,sourceType,expectedVersion}){
    if(expectedVersion!==undefined&&expectedVersion!==this.state.stateVersion)throw new Error('STATE_CONFLICT');
    if(action==='switch'){
      if(expectedVersion===undefined)throw new Error('STATE_CONFLICT');
      if(!['LiveHookSource','WebSource'].includes(sourceType))throw new Error('CAPABILITY_UNAVAILABLE');
      if(sourceType===this.state.selectedSource)return this.view();
      const from=this.state.selectedSource;await this.stopActive();
      this.state={...this.state,selectedSource:sourceType,sourceEpoch:String(BigInt(this.state.sourceEpoch)+1n),stateVersion:String(BigInt(this.state.stateVersion)+1n)};this.save();
      this.runtime.log('SOURCE_SELECTION_CHANGED',{from,to:sourceType,sourceEpoch:this.state.sourceEpoch});return this.view();
    }
    if(action==='stop'){await this.stopActive();this.state.stateVersion=String(BigInt(this.state.stateVersion)+1n);this.save();return this.view();}
    if(action!=='start')throw new Error('CAPABILITY_UNAVAILABLE');
    const capabilities=this.capabilities(),web=this.state.selectedSource==='WebSource';
    if(!capabilities[web?'webSource':'liveHook'].available)throw new Error(capabilities[web?'webSource':'liveHook'].reason);
    if(!['STOPPED','FAILED'].includes(this.view().captureState))throw new Error('SOURCE_BUSY');
    if(this.view().captureState==='FAILED')await this.stopActive();
    this.state.sourceEpoch=String(BigInt(this.state.sourceEpoch)+1n);this.state.stateVersion=String(BigInt(this.state.stateVersion)+1n);this.save();
    if(web){this.webMode='direct';await this.web.start({...this.settings.webSource,sourceEpoch:this.state.sourceEpoch});}
    else await this.bridge.start({port:this.settings.capturePort||18827,certificatePath:this.settings.certificatePath,certificatePassword:this.settings.certificatePassword,sourceEpoch:this.state.sourceEpoch});
    this.save();return this.view();
  }
  async stopActive(){this.webPlan=null;this.clearRecovery();if(this.state.selectedSource==='WebSource'){await this.web.stop();await this.browser.stop();}else await this.bridge.stop();this.runtime.interruptCapture();}
  async close(){this.closing=true;this.webPlan=null;this.clearRecovery();await this.queue.catch(()=>{});await this.web.stop();await this.browser.stop();await this.bridge.stop();}
}
