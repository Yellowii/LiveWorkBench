import {audienceSnapshot} from './audience-model.js';
const features=(await (await fetch('/api/v1/capabilities',{cache:'no-store'})).json()).data?.features||{};
const nativeTree=features.completeLocalBusiness?(await import('./native-tree.js')).nativeTree:(container,value)=>{container.textContent='当前服务仍为旧版安全投影，完整业务详情需在安全时段更新服务。\n'+JSON.stringify(value,null,2);};
const createMessageStage=features.messageStage?(await import('./message-stage.js')).createMessageStage:()=>({push(){},pause(){},clear(){},visible(){}});
if(features.messageStage){const style=document.createElement('link');style.rel='stylesheet';style.href='/message-stage.css';document.head.append(style);}else{document.getElementById('stageEnabled').checked=false;document.getElementById('stageEnabled').disabled=true;document.getElementById('stagePaused').disabled=true;document.getElementById('stageStatus').textContent='当前服务未加载消息舞台，请在安全时段更新服务。';}
// Local readable views only. No payload is sent to public sockets or diagnostic exports.
const $=id=>document.getElementById(id),maxCache=500;let height=32;
const rowHeights=new Map();let measuredWidth=0,layoutFrame=0;
function offsets(list){const out=[0];for(const v of list)out.push(out.at(-1)+(rowHeights.get(v.eventId)||height));return out;}
let scope=null,scopeItems=[],scopeReady=false,scopeLoading=null;
let rows=[],cursor=null,historyAnchor=null,high='0',busy=false,generation=0,detailGeneration=0,selected=null,detail=null,tab='content',pending=null,initialized=false;
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
const status=text=>{$('mvStatus').textContent=text;};
try{const saved=localStorage.getItem('lw-message-images');if(saved!==null)$('mvImages').checked=saved==='true';}catch{}
async function read(route){const r=await fetch(route==='@scopes'?'/api/v1/local/message-scopes':'/api/v1/local/messages'+route,{headers:{'X-LW-Local-View':'1'},cache:'no-store'});if(!r.ok)throw Error(r.status===404?'当前服务尚未加载实时弹幕模块，请在安全时段更新服务。':r.status===403?'本机认证失效，请刷新工作台。':'读取失败；可重试，原始记录仍保留。');return (await r.json()).data;}
function query(){return new URLSearchParams({mode:$('mvMode').value,limit:'100',...($('mvMode').value==='live'&&$('mvScopeMode').value==='current'?{scope:'current'}:{}),roomId:scope.roomId,sessionId:scope.sessionId,namespace:scope.namespace});}
const stage=createMessageStage({container:$('messageStage'),canvas:$('stageCanvas'),cards:$('stageCards'),status:$('stageStatus'),diagnostics:$('stageDiagnostics'),select,images:()=>$('mvImages').checked});
function applyScope(next){
 if(scope?.scopeKey===next?.scopeKey&&scopeReady)return;scopeReady=true;scope=next;generation++;detailGeneration++;rows=[];cursor=null;historyAnchor=null;pending=null;high='0';initialized=false;busy=false;selected=null;detail=null;rowHeights.clear();stage.clear();
 $('mvTitle').textContent='选中一条消息查看详情';for(const id of ['mv-content','mvJson','mvProto','mvMapping','mvRaw','mvBinary'])$(id).replaceChildren();$('mvFieldLocator').hidden=true;render();
}
async function updateScope(){
 if(!features.sessionScopes){status('当前后端尚未加载场次隔离，请在安全时段更新服务。为避免混房，本页不查询全库。');return;}
 if(scopeLoading)return scopeLoading;
 scopeLoading=(async()=>{const data=await read('@scopes'),mode=$('mvMode').value,history=$('mvScopeMode').value==='history'||mode==='replay',previous=$('mvSession').value;
 scopeItems=data.items.filter(s=>s.mode===mode);$('mvSessionLabel').hidden=!history;
 $('mvSession').replaceChildren(...scopeItems.map(s=>{const o=node('option',s.name+' · '+new Date(s.startedAt).toLocaleString('zh-CN',{hour12:false})+' · '+(s.sessionState==='ENDED'?'已下播 / '+(s.archiveState==='COMPLETE'?'已归档':'待归档'):'未结束')+' · '+s.sessionId.slice(0,8));o.value=s.scopeKey;return o;}));if(scopeItems.some(s=>s.scopeKey===previous))$('mvSession').value=previous;
 const next=history?scopeItems.find(s=>s.scopeKey===$('mvSession').value):data.current;applyScope(next||null);
 $('mvScopeStatus').textContent=next?(history?'历史查看：':'当前监听：')+next.name+' · 场次 '+next.sessionId.slice(0,8)+(next.sessionState==='ENDED'?' · 已下播 / '+(next.archiveState==='COMPLETE'?'已归档':'待归档'):''):data.ended?'直播间已下播 · '+(data.ended.archiveState==='COMPLETE'?'已归档，可选择历史场次查看':'归档待完成'):'当前没有活动监听场次；历史内容请切换“历史场次”。';
 if(!next)status('当前视图无消息；其他直播间和上一场内容不会自动加载。');
 })();try{await scopeLoading;}finally{scopeLoading=null;}
}
const contextVersions=new Map();window.addEventListener('lw:context',event=>{const {channel,data}=event.detail,version=channel==='session.updated'?JSON.stringify([data.sessionId,data.sessionState]):channel==='source.updated'?JSON.stringify([data.sourceEpoch,data.selectedSource,data.captureState]):JSON.stringify([data.active?.profileId,data.active?.sourceEpoch,data.lastEnded?.sessionId]);if(contextVersions.get(channel)===version)return;contextVersions.set(channel,version);if(visible()&&$('mvMode').value==='live'&&$('mvScopeMode').value==='current'){applyScope(null);updateScope().then(()=>{if(scope)latest();}).catch(e=>status(e.message));}});
$('mvScopeMode').onchange=()=>{applyScope(null);updateScope().then(()=>{if(scope)latest();}).catch(e=>status(e.message));};
$('mvSession').onchange=()=>{applyScope(scopeItems.find(s=>s.scopeKey===$('mvSession').value)||null);if(scope)latest();};
function stageVisibility(){stage.visible(visible()&&$('stageEnabled').checked&&!document.hidden);$('messageStage').hidden=!$('stageEnabled').checked;}
$('stageEnabled').onchange=stageVisibility;$('stagePaused').onchange=()=>stage.pause($('stagePaused').checked);document.addEventListener('visibilitychange',stageVisibility);
function visible(){return !$('page-messages').hidden;}
function filtered(){const category=$('mvCategory').value;return rows.filter(x=>category==='conversation'?['chat','gift','member','like','system','admin','redpacket','lottery','activity'].includes(x.category):!category||x.category===category).slice().reverse();}
// Resource URLs passed the authenticated MessageView policy. Reuse a successful
// stage fallback, or try at most three declared candidates in this DOM image.
function businessImage(resource,alt,cls){
 const img=node('img',undefined,cls),cached=stage.resources?.cache.get(resource.url),urls=cached?.image?[cached.image.src]:[...new Set([resource.url,...(resource.urls||[])])].filter(Boolean).slice(0,3);let index=0;
 img.alt=alt;img.referrerPolicy='no-referrer';img.loading='lazy';img.onerror=()=>{if(++index<urls.length)img.src=urls[index];else{const missing=node('span',undefined,(cls||'')+' mv-image-missing');missing.title='图片加载失败：已尝试全部候选地址；原始地址在 JSON 中保留';missing.setAttribute('aria-label','图片不可用');if(alt&&cls?.includes('inline'))missing.textContent=alt;img.replaceWith(missing);}};if(urls.length)img.src=urls[0];return img;
}
function badges(actor){
 const wrap=node('span',undefined,'mv-visual-badges');if(!$('mvImages').checked)return wrap;
 for(const b of actor?.visualBadges||[]){const slot=node('span',undefined,'mv-visual-badge mv-badge-'+b.layout),img=businessImage(b,'徽章','mv-badge-image');slot.title=b.field+(actor.badgeRule==='base-list-dsl-unresolved'?' · DSL条件未核实，使用原始基础列表':'');
 if(b.layout==='nine-slice'){img.onload=()=>{slot.style.borderImageSource='url('+JSON.stringify(img.src)+')';slot.dataset.loaded='true';};slot.append(img,node('span',b.name,'mv-badge-name'));}
 else{slot.append(img);if(b.layout==='overlay')slot.append(node('span',b.name,'mv-badge-name'));}wrap.append(slot);
 }return wrap;
}
function audience(){
 const picker=$('mvRoomScope'),previous=picker.value,scopes=new Map();for(const v of rows)if(v.roomId&&v.captureId){const key=JSON.stringify([v.mode,v.roomId,v.captureId,v.runtimeNamespace]);if(!scopes.has(key))scopes.set(key,v);}
 picker.replaceChildren(...[...scopes].map(([key,v])=>{const o=node('option',`房间 ${v.roomId} · ${v.mode==='replay'?'回放':'实时记录'} · ${v.captureId.slice(0,8)}`);o.value=key;return o;}));if(scopes.has(previous))picker.value=previous;
 $('mvAudienceUsers').replaceChildren();if(!picker.value){$('mvAudienceStats').textContent='已载入记录中暂无观众统计。';return;}
 const [mode,room,capture,namespace]=JSON.parse(picker.value),{stats,ranks}=audienceSnapshot(rows,mode,room,capture,namespace),a=stats?.content.audience;
 const time=v=>v?.receivedAt?new Date(v.receivedAt).toLocaleString('zh-CN',{hour12:false}):'无记录';
 $('mvAudienceStats').textContent=(a?(a.hidden?'平台隐藏人数':a.display||'官方未提供人数文案'):'人数暂无证据')+' · 统计接收时间：'+time(stats)+' · 榜单接收时间：'+time(ranks)+'（历史记录，不代表此刻在线）';
 if(stats){const b=node('button','查看人数原始消息');b.onclick=()=>select(stats.eventId);$('mvAudienceUsers').append(b);}
 for(const u of ranks?.content.audience.users||[]){const b=node('button',undefined,'mv-audience-user');b.type='button';if($('mvImages').checked&&u.actor?.avatar)b.append(businessImage(u.actor.avatar,'观众头像','mv-audience-avatar'));b.append(badges(u.actor),node('span',u.hidden?'隐身用户':u.actor?.name||'未提供昵称'));b.title='本条榜单片段，点击查看原始 JSON';b.onclick=()=>select(ranks.eventId);$('mvAudienceUsers').append(b);}
 if(!ranks)$('mvAudienceUsers').append(node('p','当前已载入记录没有榜单片段；可读取更早记录，不表示无人在线。'));
}
$('mvRoomScope').onchange=audience;
function readable(view,tag,cls){
 const target=node(tag,undefined,cls);
 if(!view.content?.runs?.length){target.textContent=view.summary;return target;}
 for(const run of view.content.runs){if(run.type==='image')target.append($('mvImages').checked?businessImage(run,run.alt||'[图片]','mv-inline-image'):document.createTextNode(run.alt||'[图片]'));else if(run.type==='user')target.append(badges(run.actor),node('span',run.actor?.name||'未提供昵称','mv-user-name'));else target.append(node('span',run.text||'',run.emphasis?'mv-emphasis':undefined));}
 return target;
}
// ChatRoom 490793: inline badges, cyan nickname, then native message content.
// This presentation never applies official UI filters to stored events.
function chatLine(view){
 const line=node('div',undefined,'mv-chat-line');
 const hasUser=view.content?.runs?.some(r=>r.type==='user');
 const namedEntry=view.category==='member'&&view.actor?.name&&view.summary.startsWith(view.actor.name);
 if(namedEntry){line.append(badges(view.actor),node('span',view.actor.name,'mv-chat-name'),node('span',view.summary.slice(view.actor.name.length)));if(view.mode==='replay')line.append(node('span',' · 隔离回放','mv-chat-kind'));return line;}
 if(!hasUser&&view.actor?.name)line.append(badges(view.actor),node('span',view.actor.name+'：','mv-chat-name'));
 if(view.category==='gift'&&view.content?.gift){const g=view.content.gift;line.append(node('span',g.trayText||view.summary));const icon=view.resources.find(r=>r.kind==='gift');if($('mvImages').checked&&icon)line.append(businessImage(icon,'礼物','mv-inline-image'));if(g.displayCount)line.append(node('span',' ×'+g.displayCount,'mv-chat-count'));}
 else line.append(readable(view,'span','mv-chat-content'));
 if(!['chat','gift','member','like','system'].includes(view.category))line.prepend(node('span',view.label+' · ','mv-chat-kind'));
 if(view.mode==='replay')line.append(node('span',' · 隔离回放','mv-chat-kind'));
 return line;
}
function render(){
 if(!visible())return;
 $('page-messages').dataset.appearance=$('mvAppearance').value;
 audience();
 const list=filtered(),scroll=$('mvScroll');
 if(measuredWidth!==scroll.clientWidth){measuredWidth=scroll.clientWidth;rowHeights.clear();}
 const before=offsets(list),following=$('mvFollow').checked,top=following?Math.max(0,before.at(-1)-scroll.clientHeight):Math.min(scroll.scrollTop,Math.max(0,before.at(-1)-scroll.clientHeight));
 let anchor=0;while(anchor<list.length&&before[anchor+1]<=top)anchor++;
 const start=Math.max(0,anchor-2);let end=anchor;while(end<list.length&&before[end]<top+scroll.clientHeight)end++;end=Math.min(list.length,end+3);
 const out=document.createDocumentFragment(),spacer=n=>{const el=node('div');el.style.height=n+'px';out.append(el);return el;},head=spacer(before[start]);
 for(const item of list.slice(start,end)){
  const button=node('button',undefined,'mv-row mv-'+item.category);button.type='button';button.dataset.eventId=item.eventId;button.dataset.messageType=item.messageType;button.setAttribute('aria-pressed',String(item.eventId===selected));
  const body=node('div',undefined,'mv-body'),date=new Date(item.time),time=Number.isNaN(date.getTime())?'时间未知':date.toLocaleTimeString('zh-CN',{hour12:false});
  body.append(node('div',`${time} · ${item.label} · ${item.actor?.name||'未提供用户'}${item.actor?.badges?.length?' · '+item.actor.badges.join(' / '):''}${item.mode==='replay'?' · 隔离回放':''}`,'mv-meta'));if($('mvAppearance').value==='analysis')body.append(badges(item.actor),readable(item,'div','mv-text'));
  const symbol=node('span',undefined,'mv-symbol');symbol.title=item.label;if($('mvImages').checked&&$('mvAppearance').value==='analysis'){const resource=item.resources.find(x=>x.kind==='gift')||item.resources.find(x=>x.kind==='giftMenu')||item.resources.find(x=>x.kind==='avatar');if(resource)symbol.append(businessImage(resource,item.label));}const chat=$('mvAppearance').value==='chat'?chatLine(item):node('span');button.title=time+' · '+item.label+' · '+item.summary;button.append(symbol,body,chat);button.onclick=()=>select(item.eventId);out.append(button);
 }
 const tail=spacer(before.at(-1)-before[end]);$('mvRows').replaceChildren(out);$('mvRows').dataset.cachedCount=String(rows.length);
 let changed=false;for(const el of $('mvRows').querySelectorAll('.mv-row')){const actual=el.getBoundingClientRect().height;if(actual>0&&actual!==(rowHeights.get(el.dataset.eventId)||height)){rowHeights.set(el.dataset.eventId,actual);changed=true;}}
 if(rowHeights.size>maxCache){const retained=new Set(rows.map(v=>v.eventId));for(const id of rowHeights.keys())if(!retained.has(id))rowHeights.delete(id);}
 const after=offsets(list);head.style.height=after[start]+'px';tail.style.height=(after.at(-1)-after[end])+'px';
 scroll.scrollTop=following?scroll.scrollHeight-scroll.clientHeight:Math.max(0,top+after[anchor]-before[anchor]);
 if(changed&&!layoutFrame)layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;render();});
 $('mvOlder').disabled=(!cursor&&!historyAnchor)||busy;
}
function report(){status(`${$('mvMode').value==='replay'?'隔离回放':'实时与历史'} · 已载入 ${rows.length} 条，分类匹配 ${filtered().length} 条 · ${$('mvFollow').checked?'自动跟随':'浏览历史'}。分类筛选已载入记录，可继续读取更早记录。`);}
async function latest(){
 try{await updateScope();}catch(e){status(e.message);return;}if(!scope)return;
 const gen=++generation;pending=null;historyAnchor=null;busy=true;
 try{const data=await read('?'+query());if(gen!==generation)return;if(data.scopeChanged){applyScope(null);await updateScope();return;}rows=data.items;stage.clear();stage.push(rows.slice(0,12));cursor=data.nextCursor;high=data.snapshot;initialized=true;render();report();}
 catch(e){if(gen===generation)status(e.message);}finally{if(gen===generation){busy=false;render();}}
}
async function older(){
 if(busy||(!cursor&&!historyAnchor))return;$('mvFollow').checked=false;pending=null;const gen=++generation;busy=true;
 try{const q=query();q.set(historyAnchor?'beforeEventId':'cursor',historyAnchor||cursor);const data=await read('?'+q);if(gen!==generation)return;const oldSize=offsets(filtered()).at(-1),seen=new Set(rows.map(x=>x.eventId));rows=[...rows,...data.items.filter(x=>!seen.has(x.eventId))].slice(-maxCache);cursor=data.nextCursor;historyAnchor=null;render();$('mvScroll').scrollTop=Math.max(0,offsets(filtered()).at(-1)-oldSize);report();}
 catch(e){status(e.message);}finally{if(gen===generation){busy=false;render();}}
}
async function poll(){
 if(!visible())return;try{await updateScope();}catch(e){status(e.message);return;}if(!scope||busy||!$('mvFollow').checked)return;if(!initialized)return latest();const gen=generation;busy=true;
 try{
  pending??={after:high,cursor:null,items:[],snapshot:null};
  // Bounded work per tick. Keep the signed snapshot across ticks until completely drained.
  for(let n=0;n<3;n++){
   const q=query();q.set('afterSeq',pending.after);if(pending.cursor)q.set('cursor',pending.cursor);
   const data=await read('?'+q);if(gen!==generation)return;if(data.scopeChanged){applyScope(null);await updateScope();return;}
   pending.items=[...pending.items,...data.items].slice(0,maxCache);pending.cursor=data.nextCursor;pending.snapshot=data.snapshot;
   if(!data.hasMore){const seen=new Set(pending.items.map(x=>x.eventId)),merged=[...pending.items,...rows.filter(x=>!seen.has(x.eventId))];stage.push(pending.items);rows=merged.slice(0,maxCache);if(merged.length>maxCache||pending.items.length===maxCache)historyAnchor=rows.at(-1)?.eventId;high=pending.snapshot;pending=null;render();report();break;}
  }
 }catch(e){if(gen===generation)status(e.message);}finally{if(gen===generation){busy=false;render();}}
}
function renderContent(){
 if(!detail)return;const v=detail.view,body=$('mv-content');body.replaceChildren(node('p',`${v.label} · ${v.actor?.name||'未提供用户'} · ${v.mode==='replay'?'隔离回放':'实时记录'}`));
 body.append(node('p','消息时间：'+(v.time?new Date(v.time).toLocaleString('zh-CN',{hour12:false}):'未提供')));
 for(const badge of v.actor?.badges||[])body.append(node('span',badge,'mv-badge'));
 body.append(badges(v.actor),readable(v,'p','mv-fulltext'));
 if(v.content.entry?.advancedUnsupported)body.append(node('p','高级入场装扮未执行；原始配置保留在官方 JSON。'));
 if(v.actor?.badgeRule==='base-list-dsl-unresolved')body.append(node('p','徽章使用官方基础有序列表；DSL筛选条件尚未还原。'));
 if($('mvImages').checked){const images=node('div',undefined,'mv-images');for(const resource of v.resources)images.append(businessImage(resource,{gift:'礼物',avatar:'头像',badge:'徽章',emoji:'表情',inline:'消息图片'}[resource.kind]||'图片','mv-image mv-image-'+resource.kind));body.append(images);}
 if(v.content.gift){const g=v.content.gift,card=node('div',undefined,'mv-gift-fact'),info=node('div'),resource=v.resources.find(x=>x.kind==='gift');
  if($('mvImages').checked&&resource)card.append(businessImage(resource,'礼物图标'));
  info.append(node('div',g.name||'礼物名称未提供','mv-gift-fact-name'),node('div',`ID ${g.giftId||'未提供'} · 本条数量 ${g.displayCount||'未提供'} · ${g.comboState==='ended'?'连击结束':g.comboState==='ongoing'?'连击中':'连击未确认'}`,'mv-gift-fact-meta'));card.append(info);body.append(card);
 }
 const a=v.content.activity;if(a){
  if(a.title)body.append(node('p',a.title));for(const part of a.descriptions||[])body.append(node('p',[part.text,part.number?'数量字段 '+part.number:'',part.giftId?'礼物 ID '+part.giftId:''].filter(Boolean).join(' · ')));
  if(a.boxId)body.append(node('p',`红包 ID ${a.boxId}；${a.status==='ended'?'本条为结束通知':'消息时点通知，不代表当前可领取'}`));
  if(a.requiresContainer)body.append(node('p','原活动依赖 Lynx/WebView 容器；此处展示已提供的图片和文案，容器交互尚未还原。'));
 }
 const menu=v.content.giftMenu;if(menu){
  body.append(node('p',menu.action==='hide'?'本条通知隐藏菜单。':menu.action==='unknown'?'菜单结构未确认，舞台保留前次状态；原生字符串仍可在官方 JSON 查看。':`本条菜单共 ${menu.total} 项${menu.truncated?'，摘要显示前20项，其余见官方 JSON':''}。价格仅为消息字段，未查询礼物目录补价。`));
  const list=node('div',undefined,'mv-menu-list');for(const g of menu.gifts){const row=node('div',undefined,'mv-gift-fact'),info=node('div');if($('mvImages').checked&&g.icon){const img=node('img');img.src=g.icon;img.alt='菜单礼物图';img.referrerPolicy='no-referrer';img.onerror=()=>img.replaceWith(node('span','图片不可用'));row.append(img);}info.append(node('div',g.name||'名称未提供','mv-gift-fact-name'),node('div',`ID ${g.id||'未提供'}${g.price!==null?' · 消息价格字段 '+g.price:''}`,'mv-gift-fact-meta'));row.append(info);list.append(row);}body.append(list);
  body.append(node('p','菜单项来自 container_payload 内 JSON 字符串；Proto 只能定位到该字符串字段，内层 id/name/icon/price 没有可确认的 Proto 字段号。'));
 }
 const enhanced=v.content.gift||menu||a;if(enhanced){const extra=node('details');extra.append(node('summary','增强映射字段（非原生 JSON）'),node('pre',JSON.stringify(enhanced,null,2)));body.append(extra);}
 body.append(node('p',`映射版本 ${v.mappingVersion}；${detail.privacy}`));
 for(const p of v.provenance)body.append(node('p',`${p.source||'未确认来源'} · ${p.confidence} · ${(p.notes||[]).join('；')}`));
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
$('mvField').onchange=showField;$('mvImages').onchange=()=>{try{localStorage.setItem('lw-message-images',String($('mvImages').checked));}catch{}rowHeights.clear();renderContent();render();};
$('mvMode').onchange=()=>{applyScope(null);scopeReady=false;stage.clear();detailGeneration++;detail=null;selected=null;rows=[];initialized=false;$('mvTitle').textContent='选中一条消息查看详情';for(const id of ['mv-content','mvJson','mvProto','mvMapping','mvRaw','mvBinary'])$(id).replaceChildren();$('mvFieldLocator').hidden=true;latest();};
$('mvAppearance').onchange=()=>{height=$('mvAppearance').value==='chat'?32:84;rowHeights.clear();render();};
$('mvCategory').onchange=()=>{render();report();};$('mvLatest').onclick=()=>{$('mvFollow').checked=true;latest();};$('mvOlder').onclick=older;
$('mvFollow').onchange=()=>{if($('mvFollow').checked)poll();render();report();};
$('mvScroll').onscroll=()=>{if(!visible())return;const el=$('mvScroll');if(el.scrollHeight-el.scrollTop-el.clientHeight>height*2)$('mvFollow').checked=false;render();};
new MutationObserver(()=>{stageVisibility();if(visible()){if(!initialized)latest();else{render();poll();}}}).observe($('page-messages'),{attributes:true,attributeFilter:['hidden']});
new ResizeObserver(()=>{if(visible())render();}).observe($('mvScroll'));
stageVisibility();if(visible())latest();
setInterval(()=>poll(),1500);
