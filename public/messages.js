const features=(await (await fetch('/api/v1/capabilities',{cache:'no-store'})).json()).data?.features||{};
const nativeTree=features.completeLocalBusiness?(await import('./native-tree.js')).nativeTree:(container,value)=>{container.textContent='当前服务仍为旧版安全投影，完整业务详情需在安全时段更新服务。\n'+JSON.stringify(value,null,2);};
const createMessageStage=features.messageStage?(await import('./message-stage.js')).createMessageStage:()=>({push(){},pause(){},clear(){},visible(){}});
if(features.messageStage){const style=document.createElement('link');style.rel='stylesheet';style.href='/message-stage.css';document.head.append(style);}else{document.getElementById('stageEnabled').checked=false;document.getElementById('stageEnabled').disabled=true;document.getElementById('stagePaused').disabled=true;document.getElementById('stageStatus').textContent='当前服务未加载消息舞台，请在安全时段更新服务。';}
// Local readable views only. No payload is sent to public sockets or diagnostic exports.
const $=id=>document.getElementById(id),height=84,maxCache=500;
let rows=[],cursor=null,historyAnchor=null,high='0',busy=false,generation=0,detailGeneration=0,selected=null,detail=null,tab='content',pending=null,initialized=false;
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
const status=text=>{$('mvStatus').textContent=text;};
async function read(route){const r=await fetch('/api/v1/local/messages'+route,{headers:{'X-LW-Local-View':'1'},cache:'no-store'});if(!r.ok)throw Error(r.status===404?'当前服务尚未加载实时弹幕模块，请在安全时段更新服务。':r.status===403?'本机认证失效，请刷新工作台。':'读取失败；可重试，原始记录仍保留。');return (await r.json()).data;}
function query(){return new URLSearchParams({mode:$('mvMode').value,limit:'100'});}
const stage=createMessageStage({container:$('messageStage'),canvas:$('stageCanvas'),cards:$('stageCards'),status:$('stageStatus'),diagnostics:$('stageDiagnostics'),select,images:()=>$('mvImages').checked});
function stageVisibility(){stage.visible(visible()&&$('stageEnabled').checked&&!document.hidden);$('messageStage').hidden=!$('stageEnabled').checked;}
$('stageEnabled').onchange=stageVisibility;$('stagePaused').onchange=()=>stage.pause($('stagePaused').checked);document.addEventListener('visibilitychange',stageVisibility);
function visible(){return !$('page-messages').hidden;}
function filtered(){const category=$('mvCategory').value;return rows.filter(x=>!category||x.category===category).slice().reverse();}
function readable(view,tag,cls){
 const target=node(tag,undefined,cls);
 if(view.category!=='chat'||!view.content?.runs?.length||!$('mvImages').checked){target.textContent=view.summary;return target;}
 for(const run of view.content.runs){if(run.type==='image'){const img=node('img',undefined,'mv-inline-image');img.src=run.url;img.alt=run.alt||'[图片]';img.referrerPolicy='no-referrer';img.loading='lazy';img.onerror=()=>img.replaceWith(node('span','[图片不可用]'));target.append(img);}else target.append(document.createTextNode(run.text||''));}
 return target;
}
function render(){
 if(!visible())return;
 const list=filtered(),scroll=$('mvScroll');if($('mvFollow').checked)scroll.scrollTop=Math.max(0,list.length*height-scroll.clientHeight);
 const top=$('mvFollow').checked?Math.max(0,list.length*height-scroll.clientHeight):Math.min(scroll.scrollTop,Math.max(0,list.length*height-scroll.clientHeight)),start=Math.max(0,Math.floor(top/height)-2),end=Math.min(list.length,start+Math.ceil(scroll.clientHeight/height)+5);
 const out=document.createDocumentFragment(),spacer=n=>{const el=node('div');el.style.height=n+'px';out.append(el);};spacer(start*height);
 for(const item of list.slice(start,end)){
  const button=node('button',undefined,'mv-row mv-'+item.category);button.type='button';button.dataset.eventId=item.eventId;button.setAttribute('aria-pressed',String(item.eventId===selected));
  const body=node('div',undefined,'mv-body'),date=new Date(item.time),time=Number.isNaN(date.getTime())?'时间未知':date.toLocaleTimeString('zh-CN',{hour12:false});
  body.append(node('div',`${time} · ${item.label} · ${item.actor?.name||'未提供用户'}${item.actor?.badges?.length?' · '+item.actor.badges.join(' / '):''}${item.mode==='replay'?' · 隔离回放':''}`,'mv-meta'),readable(item,'div','mv-text'));
  const symbol=node('span',undefined,'mv-symbol');symbol.title=item.label;if($('mvImages').checked){const resource=item.resources.find(x=>x.kind==='gift')||item.resources.find(x=>x.kind==='avatar');if(resource){const img=node('img');img.alt=item.label;img.src=resource.url;img.referrerPolicy='no-referrer';img.onerror=()=>img.remove();symbol.append(img);}}button.append(symbol,body);button.onclick=()=>select(item.eventId);out.append(button);
 }
 spacer(Math.max(0,list.length-end)*height);$('mvRows').replaceChildren(out);$('mvRows').dataset.cachedCount=String(rows.length);
 if($('mvFollow').checked)scroll.scrollTop=scroll.scrollHeight-scroll.clientHeight;
 $('mvOlder').disabled=(!cursor&&!historyAnchor)||busy;
}
function report(){status(`${$('mvMode').value==='replay'?'隔离回放':'实时与历史'} · 已载入 ${rows.length} 条，分类匹配 ${filtered().length} 条 · ${$('mvFollow').checked?'自动跟随':'浏览历史'}。分类筛选已载入记录，可继续读取更早记录。`);}
async function latest(){
 const gen=++generation;pending=null;historyAnchor=null;busy=true;
 try{const data=await read('?'+query());if(gen!==generation)return;rows=data.items;stage.clear();stage.push(rows.slice(0,12));cursor=data.nextCursor;high=data.snapshot;initialized=true;render();report();}
 catch(e){if(gen===generation)status(e.message);}finally{if(gen===generation){busy=false;render();}}
}
async function older(){
 if(busy||(!cursor&&!historyAnchor))return;$('mvFollow').checked=false;pending=null;const gen=++generation;busy=true;
 try{const q=query();q.set(historyAnchor?'beforeEventId':'cursor',historyAnchor||cursor);const data=await read('?'+q);if(gen!==generation)return;const oldCount=filtered().length,seen=new Set(rows.map(x=>x.eventId));rows=[...rows,...data.items.filter(x=>!seen.has(x.eventId))].slice(-maxCache);cursor=data.nextCursor;historyAnchor=null;render();$('mvScroll').scrollTop=Math.max(0,(filtered().length-oldCount)*height);report();}
 catch(e){status(e.message);}finally{if(gen===generation){busy=false;render();}}
}
async function poll(){
 if(!visible()||busy||!$('mvFollow').checked)return;if(!initialized)return latest();const gen=generation;busy=true;
 try{
  pending??={after:high,cursor:null,items:[],snapshot:null};
  // Bounded work per tick. Keep the signed snapshot across ticks until completely drained.
  for(let n=0;n<3;n++){
   const q=query();q.set('afterSeq',pending.after);if(pending.cursor)q.set('cursor',pending.cursor);
   const data=await read('?'+q);if(gen!==generation)return;
   pending.items=[...pending.items,...data.items].slice(0,maxCache);pending.cursor=data.nextCursor;pending.snapshot=data.snapshot;
   if(!data.hasMore){const seen=new Set(pending.items.map(x=>x.eventId)),merged=[...pending.items,...rows.filter(x=>!seen.has(x.eventId))];stage.push(pending.items);rows=merged.slice(0,maxCache);if(merged.length>maxCache||pending.items.length===maxCache)historyAnchor=rows.at(-1)?.eventId;high=pending.snapshot;pending=null;render();report();break;}
  }
 }catch(e){if(gen===generation)status(e.message);}finally{if(gen===generation){busy=false;render();}}
}
function renderContent(){
 if(!detail)return;const v=detail.view,body=$('mv-content');body.replaceChildren(node('p',`${v.label} · ${v.actor?.name||'未提供用户'} · ${v.mode==='replay'?'隔离回放':'实时记录'}`));
 for(const badge of v.actor?.badges||[])body.append(node('span',badge,'mv-badge'));
 body.append(readable(v,'p','mv-fulltext'));
 if($('mvImages').checked){const images=node('div',undefined,'mv-images');for(const resource of v.resources){const image=node('img',undefined,'mv-image mv-image-'+resource.kind);image.src=resource.url;image.alt={gift:'礼物',avatar:'头像',badge:'徽章',emoji:'表情',inline:'消息图片'}[resource.kind]||'图片';image.referrerPolicy='no-referrer';image.loading='lazy';image.onerror=()=>{image.replaceWith(node('span','图片不可用'));};images.append(image);}body.append(images);}
 if(v.content.gift){const g=v.content.gift,card=node('div',undefined,'mv-gift-fact'),info=node('div'),resource=v.resources.find(x=>x.kind==='gift');
  if($('mvImages').checked&&resource){const image=node('img');image.src=resource.url;image.alt='礼物图标';image.referrerPolicy='no-referrer';image.onerror=()=>image.replaceWith(node('span','图片不可用'));card.append(image);}
  info.append(node('div',g.name||'礼物名称未提供','mv-gift-fact-name'),node('div',`ID ${g.giftId||'未提供'} · 本条数量 ${g.displayCount||'未提供'} · ${g.comboState==='ended'?'连击结束':g.comboState==='ongoing'?'连击中':'连击未确认'}`,'mv-gift-fact-meta'));card.append(info);body.append(card);
 }
 const a=v.content.activity;if(a){
  if(a.title)body.append(node('p',a.title));for(const part of a.descriptions||[])body.append(node('p',[part.text,part.number?'数量字段 '+part.number:'',part.giftId?'礼物 ID '+part.giftId:''].filter(Boolean).join(' · ')));
  if(a.boxId)body.append(node('p',`红包 ID ${a.boxId}；${a.status==='ended'?'本条为结束通知':'消息时点通知，不代表当前可领取'}`));
  if(a.requiresContainer)body.append(node('p','原活动依赖 Lynx/WebView 容器；此处展示已提供的图片和文案，容器交互尚未还原。'));
 }
 const enhanced=v.content.gift||a;if(enhanced){const extra=node('details');extra.append(node('summary','增强映射字段（非原生 JSON）'),node('pre',JSON.stringify(enhanced,null,2)));body.append(extra);}
 body.append(node('p',`映射版本 ${v.mappingVersion}；${detail.privacy}`));
 for(const p of v.provenance)body.append(node('p',`${p.source||'未确认来源'} · ${p.confidence} · ${p.notes.join('；')}`));
}
async function select(id){
 const gen=++detailGeneration;selected=id;detail=null;for(const id of ['mv-content','mvJson','mvProto','mvMapping','mvRaw','mvBinary'])$(id).replaceChildren();$('mvFieldLocator').hidden=true;render();$('mvTitle').textContent='读取消息详情…';
 try{const data=await read('/'+encodeURIComponent(id));if(gen!==detailGeneration)return;detail=data;$('mvTitle').textContent=data.view.label+' · 消息详情';renderContent();
  nativeTree($('mvJson'),data.official,async path=>{try{const field=await read('/'+encodeURIComponent(id)+'/field?'+new URLSearchParams({path}));if(gen===detailGeneration)fieldInfo(field);}catch(e){$('mvFieldInfo').textContent=e.message;}});$('mvProto').textContent=JSON.stringify({parserVersion:data.parserVersion,rootType:data.schema.rootType,fields:data.schema.dictionary},null,2);
  $('mvMapping').textContent=JSON.stringify({provenance:data.view.provenance,fields:data.schema.fields,truncated:data.schema.truncated},null,2);
  $('mvRaw').textContent=JSON.stringify({eventId:data.view.eventId,rawRefs:data.view.rawRefs,raw:data.raw,protos:data.protos,traceTruncated:data.traceTruncated},null,2);
  renderBinary(data,id,gen);
  $('mvField').replaceChildren(...data.schema.fields.map(f=>{const option=node('option',f.path);option.value=f.path;return option;}));showField();showTab(tab);
 }catch(e){if(gen===detailGeneration)$('mvTitle').textContent=e.message;}
}
function fieldInfo(f){$('mvFieldInfo').textContent=f?`${f.path||'$'} → ${f.parentType||'类型未确认'} / #${f.number??'未知'} / ${f.type||'类型未确认'}${f.repeated?' / repeated':''}${f.keyType?' / map<'+f.keyType+'>':''} · ${f.label} · ${f.confidence}`:'当前字段无可靠对应关系';}
function showField(){fieldInfo(detail?.schema.fields.find(f=>f.path===$('mvField').value));}
function renderBinary(data,id,gen){
 if(!features.completeLocalBusiness){$('mvBinary').textContent='当前服务未加载原始字节详情。';return;}
 for(const ref of [...data.view.rawRefs.map(rawId=>({rawId})),...data.protos.filter(p=>p.protoId&&p.rawId).map(p=>({rawId:p.rawId,protoId:p.protoId}))]){const {rawId,protoId}=ref;const section=node('details'),summary=node('summary',(protoId?'读取 Proto 业务载荷 ':'读取 RAW 业务字节 ')+(protoId||rawId)),output=node('pre'),next=node('button','读取下一页');let offset=0;section.append(summary,output,next);$('mvBinary').append(section);
 const readPage=async()=>{next.disabled=true;try{const page=await read('/'+encodeURIComponent(id)+'/binary?'+new URLSearchParams({rawId,...(protoId?{protoId}:{}),offset:String(offset),limit:'4096'}));if(gen!==detailGeneration)return;output.textContent=JSON.stringify(page,null,2);offset=page.nextOffset;next.hidden=offset===null;}catch(e){output.textContent=e.message;}finally{next.disabled=false;}};
 let loaded=false;section.ontoggle=()=>{if(section.open&&!loaded){loaded=true;readPage();}};next.onclick=readPage;
 }
}
function showTab(name){tab=name;for(const el of document.querySelectorAll('[data-mv-tab]'))el.setAttribute('aria-pressed',String(el.dataset.mvTab===name));for(const key of ['content','json','proto','mapping','raw'])$('mv-'+key).hidden=key!==name;$('mvFieldLocator').hidden=!detail||!['json','proto','mapping'].includes(name);}
for(const el of document.querySelectorAll('[data-mv-tab]'))el.onclick=()=>showTab(el.dataset.mvTab);
$('mvField').onchange=showField;$('mvImages').onchange=()=>{renderContent();render();};
$('mvMode').onchange=()=>{stage.clear();detailGeneration++;detail=null;selected=null;rows=[];initialized=false;$('mvTitle').textContent='选中一条消息查看详情';for(const id of ['mv-content','mvJson','mvProto','mvMapping','mvRaw','mvBinary'])$(id).replaceChildren();$('mvFieldLocator').hidden=true;latest();};
$('mvCategory').onchange=()=>{render();report();};$('mvLatest').onclick=()=>{$('mvFollow').checked=true;latest();};$('mvOlder').onclick=older;
$('mvFollow').onchange=()=>{if($('mvFollow').checked)poll();render();report();};
$('mvScroll').onscroll=()=>{if(!visible())return;const el=$('mvScroll');if(el.scrollHeight-el.scrollTop-el.clientHeight>height*2)$('mvFollow').checked=false;render();};
new MutationObserver(()=>{stageVisibility();if(visible()){if(!initialized)latest();else{render();poll();}}}).observe($('page-messages'),{attributes:true,attributeFilter:['hidden']});
stageVisibility();if(visible())latest();
setInterval(()=>poll(),1500);
