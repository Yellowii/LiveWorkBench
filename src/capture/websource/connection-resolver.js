// The pinned upstream LiveClient accepts signed URLs but does not generate them.
// A first-party provider may supply fresh parameters; no URL is cached here.
export class WebConnectionResolver{
 constructor({directProvider}={}){this.directProvider=directProvider;}
 async resolve(profile,evidence){
  if(!evidence.roomId||!evidence.anchorUid)throw new Error('TARGET_IDENTITY_UNRESOLVED');
  if(profile.connectionMode!=='browser'&&this.directProvider){const config=await this.directProvider(profile,evidence);if(!config||config.expiresAt<=Date.now()+5000||String(config.roomId)!==evidence.roomId||String(config.anchorUid)!==evidence.anchorUid)throw new Error('WEB_DYNAMIC_PARAMETERS_EXPIRED');return {...config,kind:'direct'};}
  if(profile.connectionMode!=='browser'&&!profile.browserFallback)throw new Error('WEB_DYNAMIC_PARAMETERS_UNAVAILABLE');
  if(!evidence.web_rid||!/^\d+$/.test(evidence.web_rid))throw new Error('TARGET_MAPPING_REQUIRED');
  return {kind:'browser',headless:profile.browserHeadless!==false,roomUrl:'https://live.douyin.com/'+evidence.web_rid,roomId:evidence.roomId,anchorUid:evidence.anchorUid,blockMedia:profile.blockMedia,persistLogin:profile.persistLogin,authRef:profile.authRef};
 }
}
