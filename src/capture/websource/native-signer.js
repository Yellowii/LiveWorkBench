import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
export const SIGNER_HASH='81fb78a5e8728af99ffb9d20625b01bcedc43a82b05e3bef79e2bc0d29ccff5d';
const keys='live_id,aid,version_code,webcast_sdk_version,room_id,sub_room_id,sub_channel_id,did_rule,user_unique_id,device_platform,device_type,ac,identity'.split(',');
export class NativeSigner{
 async sign(url,userAgent){
  let source;try{source=await fs.readFile(new URL('../../parser/wss-sign-v1.js',import.meta.url),'utf8');}catch{throw new Error('WEB_SIGNATURE_PROVIDER_UNAVAILABLE');}
  if(createHash('sha256').update(source).digest('hex')!==SIGNER_HASH)throw new Error('WEB_SIGNATURE_PROVIDER_UNAVAILABLE');
  try{
   const context=vm.createContext({});vm.runInContext(source,context,{timeout:3000});context.navigator.userAgent=userAgent;
   context.stub=createHash('md5').update(keys.map(k=>k+'='+(url.searchParams.get(k)||'')).join(',')).digest('hex');
   const result=vm.runInContext('get_sign(stub)',context,{timeout:3000});
   if(typeof result!=='string'||!result.length||result.length>2048||!/^[a-zA-Z0-9_+/=-]+$/.test(result))throw new Error();
   return result;
  }catch{throw new Error('WEB_SIGNATURE_PROVIDER_UNAVAILABLE');}
 }
}
