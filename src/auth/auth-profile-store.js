import {randomUUID} from 'node:crypto';
import {validateNetworkPolicy} from '../network/proxy-policy.js';

export class AuthProfileStore {
  constructor(repository){this.repository=repository;}
  all(){return this.repository.getState('accounts-v1')?.items||[];}
  defaultId(){return this.repository.getState('accounts-v1')?.defaultAuthProfileId||null;}
  get(id){const item=this.all().find(p=>p.authProfileId===id);if(!item)throw new Error('RESOURCE_NOT_FOUND');return item;}
  save(items,defaultAuthProfileId=this.defaultId()){this.repository.setState('accounts-v1',{items,defaultAuthProfileId});}
  validate(input){
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['name','rememberLogin','networkPolicy'].includes(k)))throw new Error('AUTH_PROFILE_INVALID');
    const p={name:'登录账号',rememberLogin:false,networkPolicy:{mode:'system'},...input};
    if(typeof p.name!=='string'||!p.name.trim()||p.name.length>80||typeof p.rememberLogin!=='boolean')throw new Error('AUTH_PROFILE_INVALID');
    return {...p,name:p.name.trim(),networkPolicy:validateNetworkPolicy(p.networkPolicy)};
  }
  create(input){
    const items=this.all();if(items.length>=20)throw new Error('AUTH_PROFILE_LIMIT');
    const id=randomUUID(),now=new Date().toISOString(),item={...this.validate(input),authProfileId:id,vaultRef:id,version:'1',createdAt:now,updatedAt:now};
    items.push(item);this.save(items,this.defaultId()||id);return item;
  }
  update(id,patch,expectedVersion){
    const old=this.get(id);if(old.version!==expectedVersion)throw new Error('STATE_CONFLICT');
    const config=this.validate({name:old.name,rememberLogin:old.rememberLogin,networkPolicy:old.networkPolicy,...patch,networkPolicy:patch.networkPolicy?{...old.networkPolicy,...patch.networkPolicy}:old.networkPolicy});
    const item={...old,...config,version:String(BigInt(old.version)+1n),updatedAt:new Date().toISOString()};
    this.save(this.all().map(p=>p.authProfileId===id?item:p));return item;
  }
  markSaved(id){const now=new Date().toISOString();this.save(this.all().map(p=>p.authProfileId===id?{...p,savedAt:now}:p));}
  adoptLegacy(ref,input){const existing=this.all().find(p=>p.vaultRef===ref);if(existing)return existing;const item=this.create(input);item.vaultRef=ref;this.save(this.all().map(p=>p.authProfileId===item.authProfileId?item:p));return item;}
}
