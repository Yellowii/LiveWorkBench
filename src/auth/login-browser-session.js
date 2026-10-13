import {EventEmitter} from 'node:events';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {NetworkTransport} from '../network/transport.js';
import {loginResourceDecision} from './login-resource-policy.js';
import {LoginLoadDiagnostics} from './login-load-diagnostics.js';

// A login window owns no capture source, room, recorder or upstream barrage client.
export class LoginBrowserSession extends EventEmitter {
  constructor({launchBrowser=options=>chromium.launch(options),prepareContext=async()=>{},transport=new NetworkTransport()}={}){super();this.launchBrowser=launchBrowser;this.prepareContext=prepareContext;this.transport=transport;}
  async open({storageState,networkPolicy}={}){
    const {AccountMonitor}=await import('../parser/browser-vendor/account.js');
    const {createLoginContext}=await import('../parser/browser-vendor/login-config.js');
    const candidates=[process.env.BROWSER_EXECUTABLE,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);let executablePath;
    for(const file of candidates)try{await fs.access(file);executablePath=file;break;}catch{}
    if(!executablePath)throw new Error('BROWSER_NOT_PREPARED');
    this.network=await this.transport.browserRoute('https://live.douyin.com/',networkPolicy||{mode:'system'});
    try{
      this.browser=await this.launchBrowser({executablePath,headless:false,...this.network.launch});
      this.context=await createLoginContext(this.browser,{storageState});
      this.loadDiagnostics=new LoginLoadDiagnostics(this.context,entry=>this.emit('diagnostic',entry));
      await this.prepareContext(this.context);
      await this.context.route('**/*',route=>{const request=route.request(),decision=loginResourceDecision(request.url(),request.resourceType());if(!decision.allowed){this.loadDiagnostics.blocked(request,decision.reasonCode);return route.abort('blockedbyclient');}return route.fallback();});
      await this.context.addInitScript(()=>{
        HTMLMediaElement.prototype.play=function(){this.muted=true;return Promise.resolve();};
        const stopMedia=()=>document.querySelectorAll('video,audio').forEach(media=>{media.autoplay=false;media.muted=true;media.pause();});
        new MutationObserver(stopMedia).observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['autoplay']});
      });
      this.page=await this.context.newPage();this.account=new AccountMonitor();
      this.account.on('status',value=>this.emit('status',{state:String(value.state||'unknown').toUpperCase(),source:value.source||null,checkedAt:value.checked_at||null}));
      this.account.attach(this.page,{schedule:false});
      this.page.once('close',()=>{if(!this.closing)this.emit('closed');});
      this.browser.once('disconnected',()=>{if(!this.closing)this.emit('closed');});
      this.timer=setInterval(()=>void this.check().catch(()=>{}),15000);this.timer.unref();
      // The command returns once the window exists; QR/verification proceeds asynchronously.
      void this.page.goto('https://live.douyin.com/',{waitUntil:'domcontentloaded',timeout:30000}).then(()=>this.check()).catch(()=>{if(!this.closing)this.emit('status',{state:'ERROR',reasonCode:'AUTH_LOGIN_PAGE_UNAVAILABLE'});});
    }catch{await this.close();throw new Error('AUTH_LOGIN_OPEN_FAILED');}
  }
  async check(){return this.account?.check({force:true});}
  diagnostics(){const network=this.network?.diagnostic;return {network:network?{mode:network.mode,route:network.route,dns:network.dns,localDnsUsed:network.localDnsUsed,tls:network.tls}:null,...(this.loadDiagnostics?.snapshot()||{resources:[]})};}
  async close(){this.closing=true;clearInterval(this.timer);this.account?.stop();this.loadDiagnostics?.close();await this.context?.close().catch(()=>{});await this.browser?.close().catch(()=>{});await this.network?.close();}
}
