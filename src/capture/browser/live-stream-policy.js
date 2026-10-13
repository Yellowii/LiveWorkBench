// Self-contained so the identical matcher can run inside the capture page.
// Evidence: official homepage requests to pull-flv/pull-hls delivery namespaces,
// and exact URLs declared in an official room response's stream_url fields.
export function identifiedLiveStream(raw,knownUrls=[]){
  let url;try{url=new URL(raw);}catch{return false;}
  if(url.protocol!=='https:')return false;
  const key=url.origin+url.pathname;
  if(knownUrls.includes(key))return true;
  if(/^pull-flv-[a-z0-9-]+\.(?:douyincdn|douyinliving)\.com$/.test(url.hostname)&&/\.flv$/i.test(url.pathname))return true;
  if(/^pull-hls-[a-z0-9-]+\.(?:douyincdn|douyinliving)\.com$/.test(url.hostname)&&/\.m3u8$/i.test(url.pathname))return true;
  if(!/\.(?:ts|m4s)$/i.test(url.pathname))return false;
  return knownUrls.some(value=>{let manifest;try{manifest=new URL(value);}catch{return false;}if(!/\.(?:m3u8|mpd)$/i.test(manifest.pathname))return false;const dir=manifest.pathname.slice(0,manifest.pathname.lastIndexOf('/')+1);return dir!=='/'&&manifest.origin===url.origin&&url.pathname.startsWith(dir);});
}

export class LiveStreamPolicy {
  constructor({enabled=true}={}){this.enabled=enabled;this.urls=new Set();}
  identifies(url,type){return !['script','stylesheet','image','font','websocket','document'].includes(type)&&identifiedLiveStream(url,[...this.urls]);}
  blocks(url,type){return this.enabled&&this.identifies(url,type);}
  learn(body){
    if(body?.status_code!==undefined&&body.status_code!==0)return 0;
    let added=0;
    const collect=(value,depth=0)=>{if(this.urls.size>=256||depth>10)return;if(typeof value==='string'){try{const u=new URL(value);if(u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')){const key=u.origin+u.pathname;if(!this.urls.has(key)){this.urls.add(key);added++;}}}catch{}return;}if(value&&typeof value==='object')for(const item of Object.values(value).slice(0,32))collect(item,depth+1);};
    const visit=(value,depth=0)=>{if(depth>10||!value||typeof value!=='object')return;const stream=value.stream_url;if(stream&&typeof stream==='object')for(const key of ['flv_pull_url','hls_pull_url','hls_pull_url_map','dash_pull_url'])collect(stream[key]);for(const item of Object.values(value).slice(0,40))visit(item,depth+1);};
    visit(body);return added;
  }
  snapshot(){return {knownUrls:[...this.urls]};} // Internal page guard only; never log/export URLs.
  async install(context){
    if(!this.enabled)return;
    const install=`(()=>{const match=(${identifiedLiveStream.toString()});const native=HTMLMediaElement.prototype.play;window.__LW_STREAM_URLS__=[];const blocked=media=>match(media.currentSrc||media.src,window.__LW_STREAM_URLS__);HTMLMediaElement.prototype.play=function(...args){if(!blocked(this))return native.apply(this,args);this.pause();return Promise.reject(new DOMException('Identified live stream disabled','NotAllowedError'));};const stop=()=>document.querySelectorAll('video,audio').forEach(media=>{if(blocked(media)){media.autoplay=false;media.preload='none';media.pause();}});window.__LW_STREAM_POLICY_UPDATE__=urls=>{window.__LW_STREAM_URLS__=urls;stop();};new MutationObserver(stop).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['src','autoplay']});document.addEventListener('loadedmetadata',stop,true);})();`;
    await context.addInitScript(install);
  }
  async publish(context){if(!this.enabled)return;for(const page of context.pages())await page.evaluate(urls=>window.__LW_STREAM_POLICY_UPDATE__?.(urls),[...this.urls]).catch(()=>{});}
}
