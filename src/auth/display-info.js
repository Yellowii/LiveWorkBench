// Local, authenticated UI only. Never forward platform response bodies, cookies,
// or arbitrary remote image URLs. CDN image transformations/signatures are preserved.
export const displayText=value=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,200):null;
export const displayId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,256}$/.test(value)?value:null;
export function displayAvatar(value){try{const u=new URL(value);if(typeof value!=='string'||value.length>8192||u.protocol!=='https:'||u.username||u.password||u.port||!['douyinpic.com','byteimg.com','ibyteimg.com'].some(d=>u.hostname===d||u.hostname.endsWith('.'+d)))return null;u.hash='';return u.href;}catch{return null;}}
export function displayIdentity(value){return value?{id:displayId(value.id),nickname:displayText(value.nickname),account:displayText(value.account),avatar:displayAvatar(value.avatar)}:null;}
