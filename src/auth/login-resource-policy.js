import {networkTarget} from '../network/target-policy.js';

// Login has no capture optimization: only the independent network safety boundary.
export function loginResourceDecision(url,type){
  try{networkTarget(url,{browserAsset:true});}
  catch{return {allowed:false,reasonCode:'DOMAIN_POLICY_DENIED'};}
  return {allowed:true};
}
