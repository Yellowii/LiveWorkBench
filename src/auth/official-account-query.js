// Reuse the already-loaded official SDK builder for the observed self endpoint.
// Never construct/replay signed URLs or accept a returned object as HTTP proof.
export async function queryOfficialProfile(page){
  return page.evaluate(async()=>{
    const path='/aweme/v1/web/user/profile/self/',chunks=window.webpackChunkdouyin_live_v2;if(!Array.isArray(chunks))return false;
    const key=Symbol.for('webcast-workbench-require');if(!window[key])chunks.push([['workbench-self-'+Date.now()],{},require=>window[key]=require]);const require=window[key];if(!require)return false;
    for(const chunk of chunks)for(const [id,factory] of Object.entries(chunk[1]||{})){
      if(typeof factory!=='function'||!factory.toString().includes(path))continue;
      let exports;try{exports=require(id);}catch{continue;}if(!exports||typeof exports!=='object')continue;
      const query=Object.values(exports).find(value=>typeof value==='function'&&value.toString().includes(path));if(!query)continue;
      return Promise.race([Promise.resolve().then(()=>query()).then(()=>true,()=>false),new Promise(resolve=>setTimeout(()=>resolve(false),8000))]);
    }
    return false;
  });
}
