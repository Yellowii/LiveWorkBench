// Request-local credentials only; never return these headers through Gateway/logs.
export function cookieHeader(raw,state){
 const u=new URL(raw),host=u.hostname;
 if(u.protocol!=='https:'||!(host==='douyin.com'||host.endsWith('.douyin.com')))return '';
 const cookies=(state?.cookies||[]).filter(c=>{
  const domain=c.domain?.replace(/^\./,''),p=c.path||'/';
  return domain&&(host===domain||c.domain.startsWith('.')&&host.endsWith('.'+domain))&&(u.pathname===p||u.pathname.startsWith(p.endsWith('/')?p:p+'/'))&&(c.expires===-1||c.expires>Date.now()/1000);
 });
 if(cookies.some(c=>!/^[-!#$%&'*+.^_`|~0-9a-z]+$/i.test(c.name)||typeof c.value!=='string'||/[;\r\n\x00-\x1f\x7f]/.test(c.value)))throw new Error('AUTH_STATE_INVALID');
 const header=cookies.map(c=>c.name+'='+c.value).join('; ');if(header.length>32768)throw new Error('AUTH_STATE_TOO_LARGE');return header;
}
