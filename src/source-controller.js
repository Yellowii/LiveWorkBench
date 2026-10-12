import fs from 'node:fs';
import {WebSource} from './web-source.js';

export class SourceController {
  constructor(runtime,bridge,settings){
    this.runtime=runtime;this.bridge=bridge;this.settings=settings;this.web=new WebSource(runtime);this.queue=Promise.resolve();
    this.state=runtime.store.getState('source-control')||{selectedSource:'LiveHookSource',sourceEpoch:'1',stateVersion:'1'};
    runtime.selectedSource=this.state.selectedSource;runtime.activeSourceEpoch=this.state.sourceEpoch;
    this.web.on('status',()=>runtime.emit('source.updated',this.view()));
  }
  view(){return {...this.state,captureState:this.state.selectedSource==='WebSource'?this.web.status.captureState:this.bridge.status.captureState};}
  capabilities(){return {liveHook:{implemented:true,available:Boolean(this.settings.certificatePath),reason:this.settings.certificatePath?null:'TLS_CERTIFICATE_REQUIRED'},webSource:{implemented:true,available:Boolean(this.settings.webSource?.url)&&fs.existsSync(new URL('./parser/live-raw-first-v4.js',import.meta.url)),reason:!this.settings.webSource?.url?'WEB_TARGET_NOT_CONFIGURED':fs.existsSync(new URL('./parser/live-raw-first-v4.js',import.meta.url))?null:'WEB_SOURCE_NOT_PREPARED'}};}
  save(){this.runtime.store.setState('source-control',this.state);this.runtime.selectedSource=this.state.selectedSource;this.runtime.activeSourceEpoch=this.state.sourceEpoch;this.runtime.emit('source.updated',this.view());}
  action(body){const task=this.queue.catch(()=>{}).then(()=>this.control(body));this.queue=task;return task;}
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
    if(web)await this.web.start({...this.settings.webSource,sourceEpoch:this.state.sourceEpoch});
    else await this.bridge.start({port:this.settings.capturePort||18827,certificatePath:this.settings.certificatePath,certificatePassword:this.settings.certificatePassword,sourceEpoch:this.state.sourceEpoch});
    this.save();return this.view();
  }
  async stopActive(){if(this.state.selectedSource==='WebSource')await this.web.stop();else await this.bridge.stop();this.runtime.interruptCapture();}
  async close(){await this.queue.catch(()=>{});await this.web.stop();await this.bridge.stop();}
}
