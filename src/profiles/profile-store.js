import {randomUUID} from 'node:crypto';
import {TargetResolver} from '../targets/resolver.js';
const defaults={name:'监听配置',enabled:false,sourceType:'WebSource',monitorEnabled:false,autoStart:false,autoStop:false,autoReconnect:true,retryLimit:5,cooldownMs:30000,pollMs:60000,timeoutMs:10000,confirmations:2,priority:0,connectionMode:'direct',browserFallback:false,blockMedia:true,persistLogin:false,authRef:null,errorPolicy:'backoff'};
export class ProfileStore{
 constructor(repository){this.repository=repository;this.resolver=new TargetResolver();}
 all(){return this.repository.getState('profiles-v1')||[];}
 get(id){const p=this.all().find(x=>x.profileId===id);if(!p)throw new Error('RESOURCE_NOT_FOUND');return p;}
 save(items){this.repository.setState('profiles-v1',items);}
 validate(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('PROFILE_INVALID');
  const allowed=new Set([...Object.keys(defaults),'target']);if(Object.keys(value).some(k=>!allowed.has(k)))throw new Error('PROFILE_INVALID');
  const p={...defaults,...value};try{this.resolver.classify(p.target);}catch{throw new Error('PROFILE_INVALID');}
  if(Object.keys(p.target).some(k=>!['type','value'].includes(k))||typeof p.name!=='string'||p.name.length>80||!['WebSource','LiveHookSource'].includes(p.sourceType)||!['direct','browser'].includes(p.connectionMode)||p.errorPolicy!=='backoff'||(p.authRef!==null&&!/^[a-zA-Z0-9-]{1,64}$/.test(p.authRef)))throw new Error('PROFILE_INVALID');
  for(const k of ['enabled','monitorEnabled','autoStart','autoStop','autoReconnect','browserFallback','blockMedia','persistLogin'])if(typeof p[k]!=='boolean')throw new Error('PROFILE_INVALID');
  for(const [k,min,max] of [['pollMs',10000,3600000],['timeoutMs',1000,30000],['cooldownMs',1000,3600000],['retryLimit',0,10],['confirmations',1,5],['priority',0,100]])if(!Number.isInteger(p[k])||p[k]<min||p[k]>max)throw new Error('PROFILE_INVALID');
  p.target={type:p.target.type||'auto',value:p.target.value.trim()};return p;
 }
 create(input){const items=this.all();if(items.length>=100)throw new Error('PROFILE_LIMIT');const now=new Date().toISOString();const p={...this.validate(input),profileId:randomUUID(),version:'1',createdAt:now,updatedAt:now};items.push(p);this.save(items);return this.view(p);}
 update(id,patch,expectedVersion){const items=this.all(),index=items.findIndex(p=>p.profileId===id);if(index<0)throw new Error('RESOURCE_NOT_FOUND');const old=items[index];if(expectedVersion!==old.version)throw new Error('STATE_CONFLICT');const {profileId,version,createdAt,updatedAt,...config}=old;
  const p={...this.validate({...config,...patch}),profileId,version:String(BigInt(version)+1n),createdAt,updatedAt:new Date().toISOString()};items[index]=p;this.save(items);if(patch.target){this.repository.setState('monitor:'+id,null);}return this.view(p);
 }
 delete(id,expectedVersion){const p=this.get(id);if(p.version!==expectedVersion)throw new Error('STATE_CONFLICT');this.save(this.all().filter(x=>x.profileId!==id));this.repository.setState('monitor:'+id,null);return {profileId:id,deleted:true};}
 view(p){const {target,authRef,...view}=p;return {...view,target:{type:target.type,inputPresent:true},authConfigured:Boolean(authRef),resolved:this.resolver.classify(target)};}
 list(){return this.all().map(p=>this.view(p));}
 state(id){return this.repository.getState('monitor:'+id);}
 setState(id,value){this.repository.setState('monitor:'+id,value);}
}
