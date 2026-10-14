import {HttpRoomDiscovery} from './http-room-discovery.js';
import {NativeSigner} from './native-signer.js';
import {cookieHeader} from '../../auth/request-cookies.js';
export const NATIVE_USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
// Protocol constants observed on the official SDK's fresh initialization request.
// Cursor/internal_ext/history positions are deliberately absent, never invented.
export class NativeParameterProvider{
 constructor({credentialsFor,discovery=new HttpRoomDiscovery(),signer=new NativeSigner()}={}){this.credentialsFor=credentialsFor;this.discovery=discovery;this.signer=signer;}
 async resolve(profile,evidence){
  const credentials=await this.credentialsFor(profile);if(!credentials.storageState?.cookies?.length)throw new Error('AUTH_LOGIN_REQUIRED');
  const identity=await this.discovery.discover(profile,{...credentials,parameters:true});
  if(identity.roomId!==evidence.roomId||identity.anchorUid!==evidence.anchorUid)throw new Error('TARGET_IDENTITY_CHANGED');
  const url=new URL('wss://webcast100-ws-web-lq.douyin.com/webcast/im/push/v2/');
  url.search=new URLSearchParams({app_name:'douyin_web',version_code:'180800',live_id:'1',aid:'6383',did_rule:'3',endpoint:'live_pc',support_wrds:'1',user_unique_id:identity.userUniqueId,identity:'audience',room_id:identity.roomId,device_platform:'web',cookie_enabled:'true',need_persist_msg_count:'15',insert_task_id:'',live_reason:'',browser_language:'zh-CN',browser_platform:'Win32',browser_name:'Mozilla',browser_version:NATIVE_USER_AGENT.slice(8),browser_online:'true',screen_width:'1280',screen_height:'720',tz_name:'Asia/Shanghai'}).toString();
  url.searchParams.set('signature',await this.signer.sign(url,NATIVE_USER_AGENT));
  const cookie=cookieHeader('https://'+url.hostname+'/',credentials.storageState),current=await this.credentialsFor(profile);
  if(!current.storageState?.cookies?.length)throw new Error('AUTH_LOGIN_REQUIRED');
  if(cookieHeader('https://'+url.hostname+'/',current.storageState)!==cookie)throw new Error('AUTH_STATE_CHANGED');
  return {url:url.href,cookie,userAgent:NATIVE_USER_AGENT,roomId:identity.roomId,anchorUid:identity.anchorUid,expiresAt:Date.now()+30000,modern:true,parameterDiscovery:'http'};
 }
}
