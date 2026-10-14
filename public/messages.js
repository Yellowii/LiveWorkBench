// Local readable views only. No payload is sent to public sockets or diagnostic exports.
const $=id=>document.getElementById(id),height=84,maxCache=500;
let rows=[],cursor=null,high='0',busy=false,generation=0,detailGeneration=0,selected=null,detail=null,tab='content',pending=null,initialized=false;
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
const status=text=>{$('mvStatus').textContent=text;};
async function read(route){const r=await fetch('/api/v1/local/messages'+route,{headers:{'X-LW-Local-View':'1'},cache:'no-store'});if(!r.ok)throw Error(r.status===404?'当前服务尚未加载实时弹幕模块，请在安全时段更新服务。':r.status===403?'本机认证失效，请刷新工作台。':'读取失败；可重试，原始记录仍保留。');return (await r.json()).data;}
function query(){return new URLSearchParams({mode:$('mvMode').value,limit:'100'});}
function visible(){return !$('page-messages').hidden;}
function filtered(){const category=$('mvCategory').value;return rows.filter(x=>!category||x.category===category).slice().reverse();}
function render(){
 if(!visible())return;
 const list=filtered(),scroll=$('mvScroll');if($('mvFollow').checked)scroll.scrollTop=Math.max(0,list.length*height-scroll.clientHeight);
 const top=$('mvFollow').checked?Math.max(0,list.length*height-scroll.clientHeight):scroll.scrollTop,start=Math.max(0,Math.floor(top/height)-2),end=Math.min(list.length,start+Math.ceil(scroll.clientHeight/height)+5);
 const out=document.createDocumentFragment(),spacer=n=>{const el=node('div');el.style.height=n+'px';out.append(el);};spacer(start*height);
 for(const item of list.slice(start,end)){
  const button=node('button',undefined,'mv-row mv-'+item.category);button.type='button';button.dataset.eventId=item.eventId;button.setAttribute('aria-pressed',String(item.eventId===selected));
  const body=node('div',undefined,'mv-body'),date=new Date(item.time),time=Number.isNaN(date.getTime())?'时间未知':date.toLocaleTimeString('zh-CN',{hour12:false});
  body.append(node('div',`${time} · ${item.label} · ${item.actor?.name||'未提供用户'}${item.mode==='replay'?' · 隔离回放':''}`,'mv-meta'),node('div',item.summary,'mv-text'));
  button.append(node('span',item.icon,'mv-symbol'),body);button.onclick=()=>select(item.eventId);out.append(button);
 }
 spacer(Math.max(0,list.length-end)*height);$('mvRows').replaceChildren(out);$('mvRows').dataset.cachedCount=String(rows.length);
 if($('mvFollow').checked)scroll.scrollTop=scroll.scrollHeight-scroll.clientHeight;
 $('mvOlder').disabled=!cursor||busy;
}
function report(){status(`${$('mvMode').value==='replay'?'隔离回放':'实时与历史'} · 已载入 ${rows.length} 条，分类匹配 ${filtered().length} 条 · ${$('mvFollow').checked?'自动跟随':'浏览历史'}。分类筛选已载入记录，可继续读取更早记录。`);}
async function latest(){
 const gen=++generation;pending=null;busy=true;
 try{const data=await read('?'+query());if(gen!==generation)return;rows=data.items;cursor=data.nextCursor;high=data.snapshot;initialized=true;render();report();}
 catch(e){if(gen===generation)status(e.message);}finally{if(gen===generation){busy=false;render();}}
}
async function older(){
 if(busy||!cursor)return;$('mvFollow').checked=false;pending=null;const gen=++generation;busy=true;
 try{const q=query();q.set('cursor',cursor);const data=await read('?'+q);if(gen!==generation)return;const oldCount=filtered().length,seen=new Set(rows.map(x=>x.eventId));rows=[...rows,...data.items.filter(x=>!seen.has(x.eventId))].slice(-maxCache);cursor=data.nextCursor;render();$('mvScroll').scrollTop=Math.max(0,(filtered().length-oldCount)*height);report();}
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
   if(!data.hasMore){const seen=new Set(pending.items.map(x=>x.eventId));rows=[...pending.items,...rows.filter(x=>!seen.has(x.eventId))].slice(0,maxCache);high=pending.snapshot;pending=null;render();report();break;}
  }
 }catch(e){if(gen===generation)status(e.message);}finally{if(gen===generation){busy=false;render();}}
}
function renderContent(){
 if(!detail)return;const v=detail.view,body=$('mv-content');body.replaceChildren(node('p',`${v.label} · ${v.actor?.name||'未提供用户'} · ${v.mode==='replay'?'隔离回放':'实时记录'}`));
 for(const badge of v.actor?.badges||[])body.append(node('span',badge,'mv-badge'));
 body.append(node('p',v.summary,'mv-fulltext'));
 if($('mvImages').checked){const images=node('div',undefined,'mv-images');for(const resource of v.resources){const image=node('img',undefined,'mv-image mv-image-'+resource.kind);image.src=resource.url;image.alt={gift:'礼物',avatar:'头像',badge:'徽章',emoji:'表情',inline:'消息图片'}[resource.kind]||'图片';image.referrerPolicy='no-referrer';image.loading='lazy';image.onerror=()=>{image.replaceWith(node('span','图片不可用'));};images.append(image);}body.append(images);}
 body.append(node('p',`映射版本 ${v.mappingVersion}；${detail.privacy}`));if(v.content.gift)body.append(node('pre',JSON.stringify(v.content.gift,null,2)));
 for(const p of v.provenance)body.append(node('p',`${p.source||'未确认来源'} · ${p.confidence} · ${p.notes.join('；')}`));
}
async function select(id){
 const gen=++detailGeneration;selected=id;render();$('mvTitle').textContent='读取消息详情…';
 try{const data=await read('/'+encodeURIComponent(id));if(gen!==detailGeneration)return;detail=data;$('mvTitle').textContent=data.view.label+' · 消息详情';renderContent();
  $('mvJson').textContent=JSON.stringify(data.official,null,2);$('mvProto').textContent=JSON.stringify({parserVersion:data.parserVersion,rootType:data.schema.rootType,fields:data.schema.dictionary},null,2);
  $('mvMapping').textContent=JSON.stringify({provenance:data.view.provenance,fields:data.schema.fields,truncated:data.schema.truncated},null,2);
  $('mvRaw').textContent=JSON.stringify({eventId:data.view.eventId,rawRefs:data.view.rawRefs,raw:data.raw,protos:data.protos,traceTruncated:data.traceTruncated},null,2);
  $('mvField').replaceChildren(...data.schema.fields.map(f=>{const option=node('option',f.path);option.value=f.path;return option;}));showField();showTab(tab);
 }catch(e){if(gen===detailGeneration)$('mvTitle').textContent=e.message;}
}
function showField(){const f=detail?.schema.fields.find(f=>f.path===$('mvField').value);$('mvFieldInfo').textContent=f?`${f.path} → ${f.parentType||'类型未确认'} / #${f.number??'未知'} / ${f.type||'类型未确认'}${f.repeated?' / repeated':''}${f.keyType?' / map<'+f.keyType+'>':''} · ${f.label} · ${f.confidence}`:'当前字段无可靠对应关系';}
function showTab(name){tab=name;for(const el of document.querySelectorAll('[data-mv-tab]'))el.setAttribute('aria-pressed',String(el.dataset.mvTab===name));for(const key of ['content','json','proto','mapping','raw'])$('mv-'+key).hidden=key!==name;$('mvFieldLocator').hidden=!detail||!['json','proto','mapping'].includes(name);}
for(const el of document.querySelectorAll('[data-mv-tab]'))el.onclick=()=>showTab(el.dataset.mvTab);
$('mvField').onchange=showField;$('mvImages').onchange=renderContent;
$('mvMode').onchange=()=>{detailGeneration++;detail=null;selected=null;rows=[];initialized=false;$('mvTitle').textContent='选中一条消息查看详情';for(const id of ['mv-content','mvJson','mvProto','mvMapping','mvRaw'])$(id).replaceChildren();$('mvFieldLocator').hidden=true;latest();};
$('mvCategory').onchange=()=>{render();report();};$('mvLatest').onclick=()=>{$('mvFollow').checked=true;latest();};$('mvOlder').onclick=older;
$('mvFollow').onchange=()=>{if($('mvFollow').checked)poll();render();report();};
$('mvScroll').onscroll=()=>{if(!visible())return;const el=$('mvScroll');if(el.scrollHeight-el.scrollTop-el.clientHeight>height*2)$('mvFollow').checked=false;render();};
new MutationObserver(()=>{if(visible()){if(!initialized)latest();else{render();poll();}}}).observe($('page-messages'),{attributes:true,attributeFilter:['hidden']});
setInterval(()=>poll(),1500);
