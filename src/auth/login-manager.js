import {EventEmitter} from 'node:events';
import {randomUUID} from 'node:crypto';
import {filterState} from './login-vault.js';
import {LoginBrowserSession} from './login-browser-session.js';

export class LoginManager extends EventEmitter {
  constructor({accounts,vault,clientFactory=()=>new LoginBrowserSession(),profiles=()=>[],log=()=>{}}){
    super();this.accounts=accounts;this.vault=vault;this.clientFactory=clientFactory;this.profiles=profiles;this.log=log;this.queue=Promise.resolve();this.active=null;this.sessions=new Map();this.statuses=new Map();
  }
  serial(fn){const task=this.queue.catch(()=>{}).then(()=>{if(this.closed)throw new Error('AUTH_MANAGER_CLOSED');return fn();});this.queue=task;return task;}
  async view(id){const p=this.accounts.get(id),saved=await this.vault.inspect(p.vaultRef);return {authProfileId:id,name:p.name,version:p.version,rememberLogin:p.rememberLogin,networkPolicy:{mode:p.networkPolicy.mode,proxyConfigured:Boolean(p.networkPolicy.proxyUrl)},createdAt:p.createdAt,updatedAt:p.updatedAt,savedAt:saved.configured?p.savedAt||null:null,configured:saved.configured,protection:'Windows-DPAPI-CurrentUser',boundProfileIds:this.profiles().filter(x=>x.authProfileId===id).map(x=>x.profileId),login:this.statuses.get(id)||{state:'UNKNOWN',reasonCode:saved.configured?'AUTH_SAVED_STATE_UNVERIFIED':'AUTH_LOGIN_REQUIRED',requiresUserAction:!saved.configured}};}
  async list(){return {items:await Promise.all(this.accounts.all().map(p=>this.view(p.authProfileId))),defaultAuthProfileId:this.accounts.defaultId()};}
  changed(id,value){this.statuses.set(id,value);this.log(value.reasonCode||'AUTH_STATE_CHANGED',{authProfileId:id,state:value.state,operationId:value.operationId});void this.view(id).then(view=>this.emit('account.updated',view)).catch(()=>{});}
  login(id,options={}){return this.serial(()=>this.open(id,options));}
  createAndLogin(input){return this.serial(async()=>{if(this.active)throw new Error('AUTH_LOGIN_BUSY');const item=this.accounts.create(input);return this.open(item.authProfileId);});}
  async open(id,{patch,expectedVersion}={}){
    if(this.closed)throw new Error('AUTH_MANAGER_CLOSED');let p=this.accounts.get(id);
    if(expectedVersion!==undefined&&expectedVersion!==p.version)throw new Error('STATE_CONFLICT');
    if(this.active&&this.active.id!==id)throw new Error('AUTH_LOGIN_BUSY');
    if(patch)p=this.accounts.update(id,patch,expectedVersion);
    if(this.active){if(this.active.id===id)return this.view(id);throw new Error('AUTH_LOGIN_BUSY');}
    let storageState=this.sessions.get(id);if(!storageState)try{storageState=await this.vault.load(p.vaultRef);}catch{this.log('AUTH_STATE_UNAVAILABLE',{authProfileId:id});}
    const client=this.clientFactory(),active={id,client,operationId:randomUUID()};this.active=active;
    client.on('status',status=>{void this.serial(()=>this.accept(active,status)).catch(()=>{});});
    client.on('closed',()=>{void this.serial(()=>this.cancelActive(active,'AUTH_LOGIN_WINDOW_CLOSED')).catch(()=>{});});
    this.changed(id,{state:'OPENING',operationId:active.operationId,requiresUserAction:true});
    try{await client.open({storageState,networkPolicy:p.networkPolicy});this.changed(id,{state:'WAITING_FOR_LOGIN',operationId:active.operationId,requiresUserAction:true});active.timer=setTimeout(()=>{void this.serial(()=>this.cancelActive(active,'AUTH_LOGIN_TIMEOUT')).catch(()=>{});},600000);active.timer.unref();}
    catch{await this.cancelActive(active,'AUTH_LOGIN_OPEN_FAILED');throw new Error('AUTH_LOGIN_OPEN_FAILED');}
    return this.view(id);
  }
  async accept(active,status){
    if(this.active!==active||this.closed)return;
    const verified=status.state==='AUTHENTICATED'&&status.source==='official-self-api'&&Date.now()-Date.parse(status.checkedAt)>=0&&Date.now()-Date.parse(status.checkedAt)<60000;
    if(!verified){if(status.state==='AUTHENTICATED')return;this.changed(active.id,{state:status.state||'UNKNOWN',operationId:active.operationId,reasonCode:status.reasonCode||(['ANONYMOUS','ERROR'].includes(status.state)?'AUTH_LOGIN_OR_VERIFICATION_REQUIRED':null),requiresUserAction:true});return;}
    try{
      const snapshot=filterState(await active.client.context.storageState()),p=this.accounts.get(active.id);
      if(!snapshot.cookies.length&&!snapshot.origins.some(x=>x.localStorage.length))throw new Error('AUTH_STATE_EMPTY');
      if(p.rememberLogin){await this.vault.save(p.vaultRef,snapshot,true);this.accounts.markSaved(active.id);}
      this.sessions.set(active.id,snapshot);clearTimeout(active.timer);await active.client.close();this.active=null;
      this.changed(active.id,{state:'AUTHENTICATED',checkedAt:status.checkedAt,source:'official-self-api',operationId:active.operationId,remembered:p.rememberLogin,requiresUserAction:false});
    }catch{this.changed(active.id,{state:'ERROR',reasonCode:'AUTH_SAVE_FAILED',operationId:active.operationId,requiresUserAction:true});}
  }
  async cancelActive(active,reasonCode){if(this.active!==active)return;this.active=null;clearTimeout(active.timer);await active.client.close();this.changed(active.id,{state:'UNKNOWN',reasonCode,requiresUserAction:true});}
  cancel(id){return this.serial(async()=>{if(this.active?.id===id)await this.cancelActive(this.active,'AUTH_LOGIN_CANCELLED');return this.view(id);});}
  check(id){return this.serial(async()=>{this.accounts.get(id);if(this.active?.id===id)await this.active.client.check();else await this.vault.status(this.accounts.get(id).vaultRef);return this.view(id);});}
  update(id,patch,version){return this.serial(async()=>{this.accounts.update(id,patch,version);return this.view(id);});}
  clear(id,version){return this.serial(async()=>{const p=this.accounts.get(id);if(p.version!==version)throw new Error('STATE_CONFLICT');if(this.active?.id===id)await this.cancelActive(this.active,'AUTH_LOGIN_CANCELLED');await this.vault.clear(p.vaultRef);this.sessions.delete(id);this.changed(id,{state:'UNKNOWN',reasonCode:'AUTH_LOGIN_REQUIRED',requiresUserAction:true});return this.view(id);});}
  async credentialsFor(profile){if(profile.authProfileId){const p=this.accounts.get(profile.authProfileId);return {storageState:this.sessions.get(p.authProfileId)||await this.vault.load(p.vaultRef)};}return {storageState:profile.profileId?await this.vault.load(profile.authRef||profile.profileId):null};}
  async close(){this.closed=true;await this.queue.catch(()=>{});if(this.active)await this.cancelActive(this.active,'AUTH_LOGIN_CANCELLED');this.sessions.clear();}
}
