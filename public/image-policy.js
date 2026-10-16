// Shared, credential-free image URL policy. This grants no script/connect access.
export function businessImageUrl(value){
 try{const u=new URL(value),standard=/\.(?:douyinpic|byteimg|ibyteimg)\.com$/i.test(u.hostname),emoji=/^lf\d+-webcastcdn-tos\.douyinstatic\.com$/i.test(u.hostname)&&/^\/obj\/(?:webcast|live-emoji)\//.test(u.pathname);
  return typeof value==='string'&&value.length<=8192&&u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&(standard||emoji)&&![...u.searchParams.keys()].some(k=>/^(cookie|token|authorization|password|secret|signature|sessionid|msToken)$/i.test(k))&&!/cookie|token|password|secret|credential|authorization|signature|(?:^|_)sign(?:_|$)|payload|base64|schema|scheme|url|uri|file_?path|^key$|openid|sec_uid/i.test(u.pathname)?u.href:null;
 }catch{return null;}
}
