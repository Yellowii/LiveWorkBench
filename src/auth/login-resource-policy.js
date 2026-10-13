import {networkTarget} from '../network/target-policy.js';

// Visible authentication needs images/fonts (QR and challenges), unlike capture.
// Check media URLs as well as resourceType: players often download via fetch/XHR.
export function loginResourceDecision(url,type){
  let target;
  try{target=networkTarget(url,{browserAsset:true});}
  catch{return {allowed:false,reasonCode:'DOMAIN_POLICY_DENIED'};}
  if(type==='media'||/\.(?:flv|m3u8|mp4|m4s|mp3|aac|ts|webm|ogg)(?:$|\/)/i.test(target.pathname)||/(?:livepull|pull-flv|pull-hls|liveplay)/i.test(target.hostname))return {allowed:false,reasonCode:'LOGIN_MEDIA_BLOCKED'};
  return {allowed:true};
}
