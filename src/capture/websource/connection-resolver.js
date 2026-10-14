// The pinned upstream LiveClient accepts signed URLs but does not generate them.
// A first-party provider may supply fresh parameters; no URL is cached here.
export class WebConnectionResolver{
 constructor({directProvider,allowLocalTest=false,mode='live'}={}){if(allowLocalTest&&mode!=='test')throw new Error('TEST_MODE_REQUIRED');this.directProvider=directProvider;this.allowLocalTest=allowLocalTest;}
 async resolve(profile,evidence){
  if(!evidence.roomId||!evidence.anchorUid)throw new Error('TARGET_IDENTITY_UNRESOLVED');
  let connectionReason=profile.connectionMode==='browser'?'BROWSER_EXPLICITLY_SELECTED':'WEB_DYNAMIC_PARAMETERS_UNAVAILABLE';
  if(profile.connectionMode!=='browser'&&this.directProvider)try{
   const config=await this.directProvider(profile,evidence);
   if(!config||!Number.isFinite(config.expiresAt)||config.expiresAt<=Date.now()+5000||String(config.roomId)!==evidence.roomId||String(config.anchorUid)!==evidence.anchorUid)throw new Error('WEB_DYNAMIC_PARAMETERS_EXPIRED');
   let u;try{u=new URL(config.url);}catch{throw new Error('WEB_DYNAMIC_PARAMETERS_INVALID');}
   const local=this.allowLocalTest&&u.protocol==='ws:'&&u.hostname==='127.0.0.1';
   if(!local&&(u.protocol!=='wss:'||!u.hostname.endsWith('.douyin.com')||(u.port&&u.port!=='443')||!/^\/webcast\/im\/push(?:\/v2)?\/$/.test(u.pathname)||!u.searchParams.get('signature'))||u.username||u.password||u.searchParams.getAll('room_id').length!==1||u.searchParams.get('room_id')!==evidence.roomId||u.href.length>16384||/[\r\n]/.test((config.cookie||'')+(config.userAgent||'')))throw new Error('WEB_DYNAMIC_PARAMETERS_INVALID');
   return {...config,kind:'direct',connectionReason:'WEB_NATIVE_PARAMETERS_READY'};
  }catch(error){if(/^(?:TARGET|AUTH)_[A-Z_]+$/.test(error.message))throw error;connectionReason=/^(?:WEB_(?:DYNAMIC_PARAMETERS_(?:EXPIRED|INVALID|UNAVAILABLE)|SIGNATURE_PROVIDER_UNAVAILABLE|DEVICE_IDENTITY_UNAVAILABLE)|NETWORK_[A-Z_]+)$/.test(error.message)?error.message:'WEB_DYNAMIC_PARAMETERS_UNAVAILABLE';}
  if(profile.connectionMode!=='browser'&&!profile.browserFallback)throw new Error(connectionReason);
  if(!evidence.web_rid||!/^\d+$/.test(evidence.web_rid))throw new Error('TARGET_MAPPING_REQUIRED');
  return {kind:'browser',headless:profile.connectionMode!=='browser'||profile.browserHeadless!==false,connectionReason,roomUrl:'https://live.douyin.com/'+evidence.web_rid,roomId:evidence.roomId,anchorUid:evidence.anchorUid,blockMedia:profile.blockMedia,persistLogin:profile.persistLogin,authRef:profile.authRef};
 }
}
