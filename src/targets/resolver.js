import {SafeDouyinHttp,trustedUrl} from './safe-http.js';
const numeric=value=>typeof value==='string'&&/^[1-9]\d{0,24}$/.test(value);
export class TargetResolver{
 constructor({http=new SafeDouyinHttp()}={}){this.http=http;}
 classify({type='auto',value}={}){
  if(typeof value!=='string'||!value.trim()||value.length>2048)throw new Error('TARGET_INVALID');value=value.trim();
  const result={status:'PENDING_MAPPING',anchorUid:null,secUid:null,web_rid:null,roomId:null,missingConditions:['platform-room-and-owner-evidence']};
  if(type==='auto'){type=value.startsWith('https://')?'url':/^MS4wLjAB[A-Za-z0-9_-]+$/.test(value)?'secUid':'ambiguous';}
  if(type==='ambiguous')return {...result,status:'PENDING_TYPE',missingConditions:['explicit-id-type']};
  if(['anchorUid','web_rid','roomId'].includes(type)){if(!numeric(value))throw new Error('TARGET_INVALID');return {...result,[type]:value,status:type==='web_rid'?'RESOLVED_PAGE':'PENDING_MAPPING',missingConditions:type==='web_rid'?result.missingConditions:['stable-page-mapping']};}
  if(type==='secUid'){if(!/^[A-Za-z0-9_-]{12,256}$/.test(value))throw new Error('TARGET_INVALID');return {...result,secUid:value};}
  if(type!=='url')throw new Error('TARGET_INVALID');const u=trustedUrl(value);
  if(u.hostname==='live.douyin.com'&&/^\/\d+\/?$/.test(u.pathname))return {...result,web_rid:u.pathname.split('/')[1],status:'RESOLVED_PAGE'};
  if(u.hostname==='www.douyin.com'&&/^\/user\/[A-Za-z0-9_-]{12,256}\/?$/.test(u.pathname))return {...result,secUid:u.pathname.split('/')[2]};
  if(u.hostname==='v.douyin.com'&&/^\/[A-Za-z0-9_-]+\/?$/.test(u.pathname))return {...result,status:'PENDING_REDIRECT'};
  const sec=u.searchParams.get('sec_uid');if(sec&&/^[A-Za-z0-9_-]{12,256}$/.test(sec))return {...result,secUid:sec};
  throw new Error('TARGET_INVALID');
 }
 async resolve(target,options){const result=this.classify(target);if(result.status!=='PENDING_REDIRECT')return result;
  const response=await this.http.get(target.value,options);const final=this.classify({type:'url',value:response.url});return final.status==='PENDING_REDIRECT'?{...result,status:'PENDING_MAPPING'}:final;
 }
}
