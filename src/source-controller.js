import fs from 'node:fs';
import {WebSource} from './web-source.js';
import {WebConnectionResolver} from './capture/websource/connection-resolver.js';
import {BrowserSource} from './capture/browser/browser-source.js';
import {LoginVault} from './auth/login-vault.js';

export class SourceController {
  constructor(runtime,bridge,settings){
    this.runtime=runtime;this.bridge=bridge;this.settings=settings;this.web=new WebSource(runtime);this.queue=Promise.resolve();
    this.connectionResolver=new WebConnectionResolver();
    this.browser=new BrowserSource(runtime);this.vault=new LoginVault(runtime.dataDir);this.webMode='direct';
    this.browser.on('status',()=>runtime.emit('source.updated',this.view()));
    this.state=runtime.store.getState('source-control')||{selectedSource:'LiveHookSource',sourceEpoch:'1',stateVersion:'1'};
    runtime.selectedSource=this.state.selectedSource;runtime.activeSourceEpoch=this.state.sourceEpoch;
    this.web.on('status',()=>runtime.emit('source.updated',this.view()));
  }
  currentWeb(){return this.webMode==='browser'?this.browser:this.web;}
  view(){return {...this.state,connectionMode:this.webMode,captureState:this.state.selectedSource==='WebSource'?this.currentWeb().status.captureState:this.bridge.status.captureState};}
  capabilities(){return {liveHook:{implemented:true,available:Boolean(this.settings.certificatePath),reason:this.settings.certificatePath?null:'TLS_CERTIFICATE_REQUIRED'},webSource:{implemented:true,available:Boolean(this.settings.webSource?.url)&&fs.existsSync(new URL('./parser/live-raw-first-v6.js',import.meta.url)),reason:!this.settings.webSource?.url?'WEB_TARGET_NOT_CONFIGURED':fs.existsSync(new URL('./parser/live-raw-first-v6.js',import.meta.url))?null:'WEB_SOURCE_NOT_PREPARED'}};}
  failureReason(){return this.currentWeb().status.reason;}
  adoptable(profile){const match=this.hookMatcher?.view();return profile?.sourceType==='LiveHookSource'&&this.bridge.status.hookReady&&match?.streamReady&&match.profileId===profile.profileId;}
  hookEvidence(profile){const match=this.hookMatcher?.view();return this.adoptable(profile)&&match.platformLiveState==='LIVE'?{profileId:profile.profileId,profileVersion:profile.version,queryState:'LIVE',confirmedState:'LIVE',roomId:match.roomId,anchorUid:match.anchorUid,stateVersion:match.stateVersion,checkedAt:match.lastObservedAt,evidenceSource:'companion-raw'}:null;}
  hookEndedEvidence(profile){const match=this.hookMatcher?.view();return profile?.sourceType==='LiveHookSource'&&match?.platformLiveState==='ENDED'&&match.profileId===profile.profileId?{profileId:profile.profileId,profileVersion:profile.version,queryState:'ENDED',confirmedState:'ENDED',roomId:match.roomId,anchorUid:match.anchorUid,stateVersion:match.stateVersion,checkedAt:match.lastObservedAt,evidence:{source:'companion-raw'}}:null;}
  save(){this.runtime.store.setState('source-control',this.state);this.runtime.selectedSource=this.state.selectedSource;this.runtime.activeSourceEpoch=this.state.sourceEpoch;this.runtime.emit('source.updated',this.view());}
  action(body){const task=this.queue.catch(()=>{}).then(()=>this.control(body));this.queue=task;return task;}
  startProfile(profile,evidence,expectedVersion,stillCurrent=()=>true){const task=this.queue.catch(()=>{}).then(async()=>{
    if(expectedVersion!==this.state.stateVersion||!stillCurrent())throw new Error('STATE_CONFLICT');
    if(profile.sourceType!==this.state.selectedSource)throw new Error('SOURCE_SELECTION_MISMATCH');
    if(this.runtime.activeRoom&&this.runtime.activeRoom!==evidence.roomId)throw new Error('SOURCE_ROOM_BUSY');
    if(profile.sourceType==='LiveHookSource'){
      const match=this.hookMatcher?.view();if(!this.bridge.status.proxyBound||!this.bridge.status.hookReady||!match?.streamReady)throw new Error('LIVEHOOK_ENVIRONMENT_NOT_READY');
      if(match.profileId!==profile.profileId||match.anchorUid!==evidence.anchorUid||match.roomId!==evidence.roomId)throw new Error('LIVEHOOK_PROFILE_MISMATCH');
      this.activeProfileId=profile.profileId;this.runtime.log('LIVEHOOK_EXISTING_STREAM_ADOPTED',{profileId:profile.profileId});return this.view();
    }
    if(!['STOPPED','FAILED'].includes(this.view().captureState))throw new Error('SOURCE_BUSY');
    const config=await this.connectionResolver.resolve(profile,evidence);if(!stillCurrent())throw new Error('STATE_CONFLICT');
    if(this.view().captureState==='FAILED')await this.stopActive();
    this.state.sourceEpoch=String(BigInt(this.state.sourceEpoch)+1n);this.state.stateVersion=String(BigInt(this.state.stateVersion)+1n);this.save();
    this.webMode=config.kind==='browser'?'browser':'direct';this.activeProfileId=profile.profileId;
    if(config.kind==='browser')await this.browser.start({...config,networkPolicy:profile.networkPolicy||{mode:'system'},profileId:profile.profileId,operationId:evidence.operationId,monitorOperationId:evidence.monitorOperationId,monitorStateVersion:evidence.stateVersion,storageState:await this.vault.load(profile.authRef||profile.profileId),autoReconnect:profile.autoReconnect,sourceEpoch:this.state.sourceEpoch});
    else await this.web.start({...config,networkPolicy:profile.networkPolicy||{mode:'system'},autoReconnect:profile.autoReconnect,retryLimit:profile.retryLimit,refreshConnection:async()=>{if(!stillCurrent())throw new Error('STATE_CONFLICT');return this.connectionResolver.resolve(profile,evidence);},sourceEpoch:this.state.sourceEpoch});this.save();return this.view();
  });this.queue=task;return task;}
  stopProfile(expectedVersion){return this.action({action:'stop',expectedVersion});}
  loginProfile(profile,resolved){const task=this.queue.catch(()=>{}).then(async()=>{
    if(this.state.selectedSource!=='WebSource'||profile.sourceType!=='WebSource')throw new Error('SOURCE_SELECTION_MISMATCH');
    if(!['STOPPED','FAILED'].includes(this.view().captureState))throw new Error('SOURCE_BUSY');
    if(!resolved.web_rid)throw new Error('TARGET_MAPPING_REQUIRED');if(this.runtime.activeRoom&&this.runtime.activeRoom!==resolved.roomId)throw new Error('SOURCE_ROOM_BUSY');
    await this.stopActive();this.webMode='browser';this.activeProfileId=profile.profileId;this.state.sourceEpoch=String(BigInt(this.state.sourceEpoch)+1n);this.state.stateVersion=String(BigInt(this.state.stateVersion)+1n);this.save();
    await this.browser.start({roomUrl:'https://live.douyin.com/'+resolved.web_rid,roomId:resolved.roomId,anchorUid:resolved.anchorUid,blockMedia:profile.blockMedia,networkPolicy:profile.networkPolicy||{mode:'system'},headless:false,storageState:await this.vault.load(profile.authRef||profile.profileId),sourceEpoch:this.state.sourceEpoch});return this.view();
  });this.queue=task;return task;}
  async authStatus(profile){const saved=await this.vault.status(profile.authRef||profile.profileId),account=this.activeProfileId===profile.profileId?await this.browser.account():{state:'UNKNOWN'};return {...saved,account};}
  async saveLogin(profile){if(!profile.persistLogin)throw new Error('AUTH_PERSIST_NOT_ENABLED');if(this.activeProfileId!==profile.profileId||!this.browser.client?.context)throw new Error('AUTH_BROWSER_REQUIRED');const account=await this.browser.account();if(account.state!=='AUTHENTICATED')throw new Error('AUTH_CONFIRMATION_REQUIRED');return this.vault.save(profile.authRef||profile.profileId,await this.browser.client.context.storageState(),true);}
  async clearLogin(profile){const result=await this.vault.clear(profile.authRef||profile.profileId);if(this.activeProfileId===profile.profileId&&this.webMode==='browser')await this.stopProfile();return result;}
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
  async stopActive(){if(this.state.selectedSource==='WebSource'){await this.web.stop();await this.browser.stop();}else await this.bridge.stop();this.runtime.interruptCapture();}
  async close(){await this.queue.catch(()=>{});await this.web.stop();await this.browser.stop();await this.bridge.stop();}
}
