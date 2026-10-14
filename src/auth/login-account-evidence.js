import {EventEmitter} from 'node:events';
const paths=new Set(['/webcast/user/me/','/aweme/v1/web/user/profile/self/']);

// Validation layer around the pinned AccountMonitor, not a change to its source.
// Login redirects/QR disappearance/Cookie existence are never authentication proof.
export class LoginAccountEvidence extends EventEmitter {
  constructor(context,normalize){
    super();this.context=context;this.normalize=normalize;this.active=true;this.sequence=0;this.pending=new Set();this.counts={responses:0,httpFailures:0,invalidResponses:0,anonymous:0,confirmed:0};
    this.listener=response=>{const task=this.observe(response);this.pending.add(task);task.finally(()=>this.pending.delete(task));};context.on('response',this.listener);
  }
  async observe(response){
    let url;try{url=new URL(response.url());}catch{return;}
    if(!this.active||url.protocol!=='https:'||!(url.hostname==='douyin.com'||url.hostname.endsWith('.douyin.com'))||!paths.has(url.pathname))return;
    const sequence=++this.sequence;this.counts.responses++;
    if(response.status()!==200){this.counts.httpFailures++;return this.publish(sequence,{state:'ERROR',reasonCode:'AUTH_OFFICIAL_HTTP_FAILED',httpStatus:response.status()});}
    let normalized,responseCode=null;
    try{const text=await response.text();if(text.length>1024*1024)throw new Error();const body=JSON.parse(text);normalized=this.normalize(body,url.pathname);responseCode=Number.isSafeInteger(body?.status_code)?body.status_code:null;
      this.lastResponse={endpoint:url.pathname==='/webcast/user/me/'?'webcast-me':'profile-self',httpStatus:200,responseCode,accountShape:body?.data?.user?'nested-user':body?.user?'user':body?.data?'data':'absent',checkedAt:new Date().toISOString()};
      if(body?.status_code===0&&body?.data?.user&&normalized.state==='anonymous')normalized={state:'unknown'};
    }catch{this.counts.invalidResponses++;return this.publish(sequence,{state:'ERROR',reasonCode:'AUTH_OFFICIAL_RESPONSE_INVALID'});}
    if(normalized.state==='authenticated'){this.counts.confirmed++;return this.publish(sequence,{state:'AUTHENTICATED',source:'official-self-api',httpStatus:200,identity:normalized.user||null});}
    if(normalized.state==='anonymous'){this.counts.anonymous++;return this.publish(sequence,{state:'ANONYMOUS',reasonCode:'AUTH_LOGIN_REQUIRED'});}
    if(normalized.state==='error')return this.publish(sequence,{state:'ERROR',reasonCode:'AUTH_OFFICIAL_REJECTED',responseCode});
    this.publish(sequence,{state:'UNKNOWN',reasonCode:'AUTH_OFFICIAL_SHAPE_UNCONFIRMED'});
  }
  publish(sequence,status){
    if(!this.active)return;const reliable=['AUTHENTICATED','ANONYMOUS'].includes(status.state);
    if(reliable){if(sequence<(this.reliableSequence||0))return;this.reliableSequence=sequence;}
    else{this.lastProbeFailure={...status,checkedAt:new Date().toISOString()};if(sequence<(this.reliableSequence||0)||(this.last?.state==='AUTHENTICATED'&&Date.now()-Date.parse(this.last.checkedAt)<60000))return;}
    this.last={...status,checkedAt:new Date().toISOString()};this.emit('status',this.last);
  }
  snapshot(){return {...this.counts,last:this.last||null,lastResponse:this.lastResponse||null,lastProbeFailure:this.lastProbeFailure||null};}
  async settled(){await Promise.allSettled([...this.pending]);}
  close(){this.active=false;this.context.off('response',this.listener);}
}
