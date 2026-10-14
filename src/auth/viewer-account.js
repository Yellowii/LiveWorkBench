// One watching identity, independent of room profiles. Vault encryption and login
// confirmation remain owned by LoginVault and LoginManager.
export class ViewerAccount {
 constructor(manager,repository,profiles){this.manager=manager;this.repository=repository;this.profiles=profiles;manager.viewer=this;}
 state(){return this.repository.getState('watching-account-v1')||{version:'0',selectedId:null,resolved:false,loggedOut:false};}
 save(patch){const old=this.state(),next={...old,...patch,version:String(BigInt(old.version)+1n)};this.repository.setState('watching-account-v1',next);return next;}
 async inventory(){
  const m=this.manager,items=new Map();
  for(const p of m.accounts.all())if(!items.has(p.vaultRef)||p.authProfileId===this.state().selectedId)items.set(p.vaultRef,{candidateId:p.authProfileId,label:p.name,ref:p.vaultRef,id:p.authProfileId});
  for(const p of this.profiles())if(!p.authProfileId){const ref=p.authRef||p.profileId;if(!items.has(ref))items.set(ref,{candidateId:ref,label:'旧直播间登录态：'+p.name,ref,id:null});}
  const result=[];for(const p of items.values()){const configured=(await m.vault.inspect(p.ref)).configured;if(configured||m.sessions.has(p.id)||m.active?.id===p.id)result.push({...p,configured});}return result;
 }
 async resolve(){let s=this.state();if(!s.resolved){const candidates=await this.inventory();if(candidates.length===1){const p=candidates[0],item=p.id?this.manager.accounts.get(p.id):this.manager.accounts.adoptLegacy(p.ref,{name:'观看账号',rememberLogin:true});s=this.save({selectedId:item.authProfileId,resolved:true});}}return s;}
 async view(){const s=await this.resolve(),m=this.manager,p=m.accounts.all().find(x=>x.authProfileId===s.selectedId),v=p?await m.view(p.authProfileId):null,candidates=await this.inventory();return {version:s.version,configured:v?.configured||false,authenticated:v?.login?.state==='AUTHENTICATED',identity:v?.login?.identity||null,login:v?.login||{state:'UNKNOWN',reasonCode:'AUTH_LOGIN_REQUIRED'},windowOpen:Boolean(p&&m.active?.id===p.authProfileId),networkPolicy:v?.networkPolicy||{mode:'system'},pageLoad:v?.pageLoad||null,migration:{required:!s.resolved&&candidates.length>1,candidates:candidates.filter(x=>x.id!==s.selectedId).map(({candidateId,label,configured})=>({candidateId,label,configured}))},clearImpact:'只清除保存和可复用登录态；当前采集浏览器保留，后续新连接或重连可能需要重新登录。'};}
 get(){return this.manager.serial(()=>this.view());}
 credentials(){return this.manager.serial(async()=>{const s=await this.resolve();if(!s.resolved&&(await this.inventory()).length>1)throw new Error('AUTH_VIEWER_MIGRATION_REQUIRED');if(!s.selectedId||s.loggedOut)return {storageState:null};const m=this.manager,p=m.accounts.get(s.selectedId);return {storageState:m.sessions.get(p.authProfileId)||await m.vault.load(p.vaultRef)};});}
 async removeRefs(refs){const m=this.manager;for(const ref of refs){const records=m.accounts.all().filter(p=>p.vaultRef===ref);if(records.some(p=>m.active?.id===p.authProfileId))await m.cancelActive(m.active,'AUTH_LOGIN_CANCELLED');await m.vault.clear(ref);for(const p of records){m.sessions.delete(p.authProfileId);m.statuses.delete(p.authProfileId);m.loadReports.delete(p.authProfileId);}m.accounts.remove(records.map(p=>p.authProfileId));}}
 action(body){return this.manager.serial(async()=>{
  const s=await this.resolve(),m=this.manager;if(body.expectedVersion!==s.version)throw new Error('STATE_CONFLICT');
  if(body.action==='adopt'){if(m.active)throw new Error('AUTH_LOGIN_BUSY');const candidate=(await this.inventory()).find(x=>x.candidateId===body.candidateId);if(!candidate)throw new Error('RESOURCE_NOT_FOUND');const p=candidate.id?m.accounts.get(candidate.id):m.accounts.adoptLegacy(candidate.ref,{name:'观看账号',rememberLogin:true});this.save({selectedId:p.authProfileId,resolved:true,loggedOut:false});}
  else if(body.action==='cleanup'){const candidates=await this.inventory(),ids=body.candidateIds;if(!Array.isArray(ids)||!ids.length||ids.length>100||new Set(ids).size!==ids.length)throw new Error('AUTH_PROFILE_INVALID');const refs=ids.map(id=>{const p=candidates.find(x=>x.candidateId===id);const selected=m.accounts.all().find(x=>x.authProfileId===s.selectedId);if(!p||p.ref===selected?.vaultRef)throw new Error('STATE_CONFLICT');if(m.active&&m.accounts.get(m.active.id).vaultRef===p.ref)throw new Error('AUTH_LOGIN_BUSY');return p.ref;});await this.removeRefs(refs);this.save({});}
  else if(body.action==='logout'){const p=m.accounts.all().find(x=>x.authProfileId===s.selectedId);if(p)await this.removeRefs([p.vaultRef]);this.save({selectedId:null,resolved:true,loggedOut:true});}
  else if(body.action==='login'){
   if(!s.resolved&&(await this.inventory()).length>1)throw new Error('AUTH_VIEWER_MIGRATION_REQUIRED');if(m.active)throw new Error('AUTH_LOGIN_BUSY');
   let p=m.accounts.all().find(x=>x.authProfileId===s.selectedId);
   if(!p){const inUse=new Set((await this.inventory()).map(x=>x.id));m.accounts.remove(m.accounts.all().filter(x=>!inUse.has(x.authProfileId)).map(x=>x.authProfileId));p=m.accounts.create({name:'观看账号',rememberLogin:true});}
   if(body.networkPolicy||!p.rememberLogin)p=m.accounts.update(p.authProfileId,{rememberLogin:true,...(body.networkPolicy?{networkPolicy:body.networkPolicy}:{})},p.version);
   this.save({selectedId:p.authProfileId,resolved:true,loggedOut:false});await m.open(p.authProfileId,{fresh:true});
  }else if(body.action==='close'){if(m.active?.id===s.selectedId)await m.cancelActive(m.active,'AUTH_LOGIN_CANCELLED');}
  else if(body.action==='check'){if(m.active?.id===s.selectedId)await m.active.client.check();}
  else throw new Error('CAPABILITY_UNAVAILABLE');return this.view();
 });}
}
