const exactHosts=new Set(['live.douyin.com','lf-webcast-platform.bytetos.com','lf-c-flwb.bytetos.com','lf-cdn-tos.bytescm.com','lf-security.bytegoofy.com','lf3-webcast.bytetos.com','security.zijieapi.com','lf-ucenter-web.yhgfb-cn-static.com','lf-rc1.yhgfb-cn-static.com','lf-rc2.yhgfb-cn-static.com','vcs.zijieapi.com']);
const publicRoots=new Set(['douyin.com','iesdouyin.com','douyinstatic.com','douyincdn.com','douyinpic.com','byteimg.com','ibyteimg.com','bytedance.com','bytedance.net','bytedns.net','bytegecko.com','bytecdn.cn','pstatp.com','amemv.com','snssdk.com','volcengine.com','bytetos.com','bytescm.com','bytegoofy.com','applogcdn.com','zijieapi.com','douyinvod.com','douyinliving.com','bytetcc.com','bytednsdoc.com','ibytedapm.com','byted-static.com','feelgood.cn']);
const types=new Set(['document','stylesheet','script','image','font','media','xhr','fetch','websocket','other']);
const flowPhases=new Map([['/passport/web/get_qrcode/','qr-create'],['/passport/web/check_qrconnect/','qr-poll'],['/passport/web/challenge/','challenge'],['/passport/ticket_guard/get_client_cert/','ticket-guard']]);
const pollStates=new Set(['new','scanned','confirmed','expired','success','failed','cancelled','canceled','refused']);
function flowPhase(request){try{const u=new URL(request.url());if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!(u.hostname==='douyin.com'||u.hostname.endsWith('.douyin.com')))return null;return flowPhases.get(u.pathname)||(u.pathname.startsWith('/passport/')?'passport-other':null);}catch{return null;}}
function resource(request){
  let domain='[untrusted-domain]';
  try{const host=new URL(request.url()).hostname,root=host.split('.').slice(-2).join('.');domain=exactHosts.has(host)?host:publicRoots.has(root)?root:'[untrusted-domain]';}catch{}
  return {domain,resourceType:types.has(request.resourceType())?request.resourceType():'other'};
}
export function requestFailureReason(text=''){
  if(/ERR_(?:PROXY_CONNECTION_FAILED|TUNNEL_CONNECTION_FAILED|SOCKS_CONNECTION_FAILED|NO_SUPPORTED_PROXIES)/.test(text))return 'PROXY_CONNECTION_FAILED';
  if(/ERR_(?:TIMED_OUT|CONNECTION_TIMED_OUT)/.test(text))return 'NETWORK_TIMEOUT';
  if(/ERR_(?:CERT_|SSL_)/.test(text))return 'TLS_VALIDATION_FAILED';
  if(/ERR_NAME_NOT_RESOLVED/.test(text))return 'DNS_RESOLUTION_FAILED';
  if(/ERR_ABORTED/.test(text))return 'REQUEST_CANCELLED';
  return 'NETWORK_REQUEST_FAILED';
}

// Only bounded aggregates leave this component. Never retain URL, body, headers,
// script error text or console text, which may contain credentials and identities.
export class LoginLoadDiagnostics {
  constructor(context,notify=()=>{}){
    this.entries=new Map();this.flow=new Map();this.policy=new WeakMap();this.notify=notify;this.context=context;this.listeners=[];this.active=true;this.overflow=0;this.pageErrors=0;this.consoleErrors=0;
    this.listen(context,'request',request=>{const entry=this.flowEntry(request);if(entry){entry.started++;entry.lastRequestAt=new Date().toISOString();}});
    this.listen(context,'requestfailed',request=>{const reason=this.policy.get(request)||requestFailureReason(request.failure()?.errorText);if(!this.policy.has(request))this.add(request,'failed',reason);const entry=this.flowEntry(request);if(entry){entry.failed++;entry.last={reasonCode:reason,checkedAt:new Date().toISOString()};}});
    this.listen(context,'response',response=>{this.add(response.request(),response.status()<400?'http-success':'http-error',response.status()<400?null:'HTTP_ERROR',response.status());void this.flowResponse(response);});
    this.listen(context,'page',page=>{
      this.listen(page,'pageerror',()=>{this.pageErrors++;this.add(null,'script-error','PAGE_SCRIPT_EXCEPTION');});
      this.listen(page,'console',message=>{if(message.type()==='error'){this.consoleErrors++;this.add(null,'console-error','BROWSER_CONSOLE_ERROR');}});
    });
  }
  listen(emitter,event,callback){const handler=(...args)=>{if(this.active)callback(...args);};emitter.on(event,handler);this.listeners.push([emitter,event,handler]);}
  flowEntry(request){const phase=flowPhase(request);if(!phase)return null;let entry=this.flow.get(phase);if(!entry){entry={phase,started:0,responses:0,failed:0};this.flow.set(phase,entry);}return entry;}
  async flowResponse(response){
    const entry=this.flowEntry(response.request());if(!entry)return;const sequence=++entry.responses;
    const last={httpStatus:response.status(),reasonCode:response.status()>=400?'HTTP_ERROR':null,checkedAt:new Date().toISOString()};
    // Passport JSON is inspected only for fixed protocol status fields. No QR,
    // redirect URL, token, cookie, user object or free-form error text is retained.
    if(['qr-create','qr-poll','challenge'].includes(entry.phase)&&response.status()===200){
      try{const text=await response.text();if(text.length>128*1024)throw new Error();const body=JSON.parse(text),data=body?.data;
        last.errorCode=Number.isSafeInteger(data?.error_code)?data.error_code:null;
        last.result=['success','error'].includes(body?.message)?body.message:'unrecognized';
        if(entry.phase==='qr-poll')last.pollStatus=pollStates.has(data?.status)?data.status:'unrecognized';
        if(last.result==='error'||(last.errorCode!==null&&last.errorCode!==0))last.reasonCode='AUTH_FLOW_OFFICIAL_REJECTED';
      }catch{last.reasonCode='AUTH_FLOW_RESPONSE_INVALID';}
    }
    if(!this.active||sequence!==entry.responses)return;entry.last=last;
    const signature=JSON.stringify([last.httpStatus,last.reasonCode,last.errorCode,last.result,last.pollStatus]);if(entry.signature!==signature){entry.signature=signature;this.notify({phase:entry.phase,...last});}
  }
  blocked(request,reasonCode){this.policy.set(request,reasonCode);this.add(request,'blocked',reasonCode);}
  add(request,outcome,reasonCode,httpStatus=null){
    if(!this.active)return;
    const target=request?resource(request):{domain:'[page]',resourceType:'script'},key=JSON.stringify([target.domain,target.resourceType,outcome,reasonCode,httpStatus]);
    let entry=this.entries.get(key);
    if(!entry){if(this.entries.size>=80){this.overflow++;return;}entry={...target,outcome,reasonCode,httpStatus,count:0};this.entries.set(key,entry);}
    entry.count++;
    if(entry.count===1&&reasonCode)this.notify({...entry});
  }
  snapshot(){return {resources:[...this.entries.values()].map(x=>({...x})),loginFlow:[...this.flow.values()].map(({signature,...entry})=>({...entry,last:entry.last?{...entry.last}:undefined})),pageErrors:this.pageErrors,consoleErrors:this.consoleErrors,overflow:this.overflow};}
  close(){this.active=false;for(const [emitter,event,handler] of this.listeners)emitter.off(event,handler);this.listeners=[];}
}
