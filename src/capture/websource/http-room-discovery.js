import {TargetResolver} from '../../targets/resolver.js';
import {extractRoomEvidence,roomDocuments} from '../../monitor/douyin-adapter.js';
export {cookieHeader} from '../../auth/request-cookies.js';
export function officialDeviceIdentity(documents){
 const ids=new Set(),walk=(node,depth=0)=>{if(depth>30||!node||typeof node!=='object')return;const value=node.odin?.user_unique_id;if(typeof value==='string'&&/^[1-9]\d{0,19}$/.test(value))ids.add(value);for(const v of Object.values(node))walk(v,depth+1);};
 for(const doc of documents)walk(doc);return ids.size===1?[...ids][0]:null;
}
export class HttpRoomDiscovery{
 constructor({resolver=new TargetResolver()}={}){this.resolver=resolver;}
 async discover(profile,{storageState,parameters=false}={}){
  const options={networkPolicy:profile.networkPolicy||{mode:'system'},timeoutMs:profile.timeoutMs||10000};
  const target=await this.resolver.resolve(profile.target,options),identifier=target.web_rid||target.secUid;
  if(!identifier)throw new Error('TARGET_MAPPING_REQUIRED');
  const response=await this.resolver.http.get('https://live.douyin.com/'+encodeURIComponent(identifier),{...options,storageState});
  const identity=extractRoomEvidence(response.text,target,{identityOnly:true});
  if(!identity.roomId||!identity.anchorUid||!identity.web_rid)throw new Error('TARGET_IDENTITY_UNRESOLVED');
  const userUniqueId=parameters?officialDeviceIdentity(roomDocuments(response.text)):null;
  if(parameters&&!userUniqueId)throw new Error('WEB_DEVICE_IDENTITY_UNAVAILABLE');
  return {roomId:identity.roomId,anchorUid:identity.anchorUid,web_rid:identity.web_rid,state:identity.state,parameterDiscovery:'http',checkedAt:new Date().toISOString(),...(parameters?{userUniqueId}:{})};
 }
}
