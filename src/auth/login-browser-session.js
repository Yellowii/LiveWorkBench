import {EventEmitter} from 'node:events';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {NetworkTransport} from '../network/transport.js';
import {loginResourceDecision} from './login-resource-policy.js';
import {LoginLoadDiagnostics} from './login-load-diagnostics.js';
import {LoginAccountEvidence} from './login-account-evidence.js';
import {queryOfficialProfile} from './official-account-query.js';

// A login window owns no capture source, room, recorder or upstream barrage client.
export class LoginBrowserSession extends EventEmitter {
  constructor({launchBrowser=options=>chromium.launch(options),prepareContext=async()=>{},transport=new NetworkTransport()}={}){super();this.launchBrowser=launchBrowser;this.prepareContext=prepareContext;this.transport=transport;}
  async open({storageState,networkPolicy,headless=false}={}){
    const {AccountMonitor,normalizeAccount}=await import('../parser/browser-vendor/account.js');
    const {createLoginContext}=await import('../parser/browser-vendor/login-config.js');
    const candidates=[process.env.BROWSER_EXECUTABLE,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);let executablePath;
    for(const file of candidates)try{await fs.access(file);executablePath=file;break;}catch{}
    if(!executablePath)throw new Error('BROWSER_NOT_PREPARED');
    this.network=await this.transport.browserRoute('https://live.douyin.com/',networkPolicy||{mode:'system'});
    try{
      this.browser=await this.launchBrowser({executablePath,headless,...this.network.launch});
      this.context=await createLoginContext(this.browser,{storageState});
      this.loadDiagnostics=new LoginLoadDiagnostics(this.context,entry=>this.emit('diagnostic',entry));
      this.context.on('response',response=>{const url=new URL(response.url());if(response.status()===200&&url.hostname==='live.douyin.com'&&response.request().resourceType()==='document'){this.network.diagnostic.connectionState='page-response-received';this.network.diagnostic.errorCode=null;}});
      this.evidence=new LoginAccountEvidence(this.context,normalizeAccount);this.evidence.on('status',status=>this.emit('status',status));
      await this.prepareContext(this.context);
      await this.context.route('**/*',route=>{const request=route.request(),decision=loginResourceDecision(request.url(),request.resourceType());if(!decision.allowed){this.loadDiagnostics.blocked(request,decision.reasonCode);return route.abort('blockedbyclient');}return route.fallback();});
      this.page=await this.context.newPage();this.account=new AccountMonitor();
      this.account.on('status',value=>{if(['checking','unknown'].includes(value.state))this.emit('status',{state:value.state.toUpperCase(),reasonCode:'AUTH_CONFIRMATION_PENDING'});});
      this.account.attach(this.page,{schedule:false});
      this.page.once('close',()=>{if(!this.closing)this.emit('closed');});
      this.browser.once('disconnected',()=>{if(!this.closing)this.emit('closed');});
      this.timer=setInterval(()=>void this.check().catch(()=>{}),15000);this.timer.unref();
      // The command returns once the window exists; QR/verification proceeds asynchronously.
      void this.page.goto('https://live.douyin.com/',{waitUntil:'domcontentloaded',timeout:30000}).then(()=>this.check()).catch(()=>{if(!this.closing)this.emit('status',{state:'ERROR',reasonCode:'AUTH_LOGIN_PAGE_UNAVAILABLE'});});
    }catch{await this.close();throw new Error('AUTH_LOGIN_OPEN_FAILED');}
  }
  async check(){const sequence=this.evidence?.sequence,result=await this.account?.check({force:true});
    await this.evidence?.settled();
    // A primary response may look anonymous to the pinned normalizer while the
    // validation layer rejects its shape. That is not a reason to skip the
    // independent current-account endpoint. Its actual HTTP response is proof.
    const fallback=result?.state==='error'||['UNKNOWN','ERROR'].includes(this.evidence?.last?.state);
    if(!this.closing&&fallback&&Date.now()-(this.lastProfileCheck||0)>=15000){this.lastProfileCheck=Date.now();await queryOfficialProfile(this.page).catch(()=>false);}
    if(!this.closing&&this.evidence?.sequence===sequence&&result?.state==='error')this.emit('status',{state:'ERROR',reasonCode:'AUTH_OFFICIAL_QUERY_UNAVAILABLE'});return this.evidence?.last||{state:'UNKNOWN'};
  }
  diagnostics(){const network=this.network?.diagnostic;return {network:network?{mode:network.mode,route:network.route,dns:network.dns,localDnsUsed:network.localDnsUsed,tls:network.tls,connectionState:network.connectionState,errorCode:network.errorCode||null}:null,authentication:this.evidence?.snapshot()||null,...(this.loadDiagnostics?.snapshot()||{resources:[]})};}
  async close(){this.closing=true;clearInterval(this.timer);this.evidence?.close();this.account?.stop();this.loadDiagnostics?.close();await this.context?.close().catch(()=>{});await this.browser?.close().catch(()=>{});await this.network?.close();}
}
