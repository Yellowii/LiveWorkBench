import {StageModel} from './stage-model.js';
import {StageResources} from './stage-resources.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function createMessageStage({container,canvas,cards,status,diagnostics,select,images}){
 const model=new StageModel(),resources=new StageResources(),ctx=canvas.getContext('2d');let last=0,frame=0,visible=true,boxes=[],failed=false,legacyMapping=false;
 const dom=new Map(),gifts=el('div',undefined,'stage-gifts'),activities=el('div',undefined,'stage-activities');cards.replaceChildren(gifts,activities);
 function imageNode(source,kind,cls){const slot=el('span',undefined,'stage-image '+(cls||'')),item=resources.get(source,kind);if(!source){slot.title='消息没有提供该资源或图片显示未开启';slot.dataset.resourceState='mapping-missing';return slot;}slot.dataset.resourceState=item?.state||'unavailable';if(item?.image){const img=item.image.cloneNode();img.alt=kind;slot.append(img);if(item.fallback)slot.title=`首选图片失败，备用地址已加载（第${item.attempts}个）`;}else slot.title=item?.reason||'资源加载中';return slot;}
 function renderCard(item){const v=item.view,b=el('button',undefined,'stage-card stage-'+v.category);b.type='button';b.dataset.updated=String(item.updateVersion>0);b.dataset.eventId=v.eventId;b.onclick=()=>select(v.eventId);
  if(v.category==='gift'){const tray=el('span',undefined,'stage-tray'),info=el('span',undefined,'stage-gift-info'),gift=v.content.gift||{};const bgSource=(images()?v.resources.find(x=>x.kind==='trayBackground'):null)||'/api/v1/local/assets/gift-tray-bg',bg=resources.get(bgSource,'托盘背景');if(bg?.state==='loaded')tray.style.backgroundImage='url('+JSON.stringify(bg.image.src)+')';
   tray.append(imageNode(images()?v.resources.find(x=>x.kind==='avatar'):null,'头像','stage-avatar'));info.append(el('span',v.actor?.name||'未提供昵称','stage-gift-name'),el('span',gift.trayText||(gift.name?'送出'+gift.name:'礼物名称未提供'),'stage-gift-text'));tray.append(info,imageNode(images()?v.resources.find(x=>x.kind==='gift'):null,'礼物图标','stage-gift-icon'));const dynamic=images()?v.resources.find(x=>x.kind==='giftDynamic'):null;if(dynamic)tray.append(imageNode(dynamic,'动态礼物','stage-gift-dynamic'));b.append(tray);
   const combo=el('span',undefined,'stage-combo');combo.append(el('span','x','stage-times'),el('span',gift.displayCount||gift.repeatCount||gift.comboCount||'—','stage-number'));b.append(combo);b.title=(gift.comboState==='ended'?'连击结束':gift.comboState==='ongoing'?'连击中':'连击状态未确认')+'；数字为本条字段，不相加';
  }else if(v.category==='lottery'){const icon=el('span',undefined,'stage-lottery-icon'),a=v.content.activity||{};icon.append(imageNode('/api/v1/local/assets/lottery-icon','福袋图标','stage-lottery-art'));
   const seconds=a.observedRemainingSeconds,clock=Number.isInteger(seconds)?String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'):null;
   icon.append(el('span',a.statusValue==='1'&&clock?clock:a.status||'未知','stage-lottery-state'));b.append(icon);b.setAttribute('aria-label',v.summary);b.title=v.summary+'；'+(clock?'事件时点剩余 '+clock+'，并非当前倒计时':'消息时点状态')+'；点击查看原始详情';
  }else if(v.category==='redpacket'){
   const a=v.content.activity||{},icon=el('span',undefined,'stage-redpacket-icon');
   icon.append(imageNode((images()?v.resources.find(x=>x.kind==='redpacket'):null)||'/api/v1/local/assets/redpacket-notice','红包通知图','stage-redpacket-art'));
   if(images()&&v.resources.some(x=>x.kind==='avatar'))icon.append(imageNode(v.resources.find(x=>x.kind==='avatar'),'发送者头像','stage-redpacket-avatar'));
   icon.append(el('span',a.status==='ended'?'已结束':'通知','stage-redpacket-state'));b.append(icon);b.dataset.ended=String(a.status==='ended');b.setAttribute('aria-label',v.summary);b.title=v.summary+'；消息时点状态，点击查看内容与原始详情';
  }else if(v.category==='activity'){
   const a=v.content.activity||{},url=images()?v.resources.find(x=>x.kind==='activity'):null;
   if(url){const image=imageNode(url,'活动图片','stage-activity-art');image.style.width=(a.width||48)+'px';image.style.height=(a.height||48)+'px';b.append(image);}
   else{const missing=el('span',a.name||'活动内容未提供','stage-activity-name');b.append(missing);b.dataset.resourceState=images()?'mapping-missing':'disabled';}
   b.setAttribute('aria-label',v.summary);b.title=v.summary+(a.requiresContainer?'；原活动依赖Lynx/WebView，仅显示已提供图片和文案':'')+'；点击查看详情';
   b.style.order=String(-Math.min(Number(a.priority||0),2147483647));
  }else if(v.category==='giftmenu'){
   const menu=v.content.giftMenu;b.append(el('span','礼物菜单 · 消息资料','stage-menu-heading'));
   for(const g of menu.gifts.slice(0,2)){const row=el('span',undefined,'stage-menu-row'),info=el('span',undefined,'stage-menu-info');row.append(imageNode(images()?g.icon:null,'菜单礼物图','stage-menu-icon'));info.append(el('span',g.name||'名称未提供','stage-menu-name'));if(g.price!==null&&g.price!=='0')info.append(el('span','消息价格字段 '+g.price,'stage-menu-price'));row.append(info);b.append(row);}
   b.append(el('span',`共${menu.total}项 · 点击查看详情`,'stage-menu-more'));b.title='本条菜单消息；只读资料，不提供赠送操作';
  }else if(v.category==='member'){
   b.append(imageNode(images()?v.resources.find(x=>x.kind==='entryBadge'):null,'入场徽章','stage-entry-badge'),el('span',v.summary,'stage-entry-text'));
   const bg=images()?resources.get(v.resources.find(x=>x.kind==='entryBackground'),'入场背景'):null;if(bg?.image)b.style.backgroundImage='url('+JSON.stringify(bg.image.src)+')';
   b.title='原生入场 type8 文案和资源；本地展示5秒，非官方动画时长。点击查看详情';
  }else if(v.category==='admin'){
   // AdminPrivilege has no dedicated official DOM. This is a workbench notice.
   b.append(el('span',v.actor?.name?v.actor.name+' · '+v.summary:v.summary,'stage-admin-text'));b.title='本条管理员消息；不代表观看账号当前权限。点击查看详情';
  }

  return b;
 }
 function render(){const width=container.clientWidth,height=container.clientHeight,dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);boxes=[];
  for(const item of model.active.filter(x=>x.view.category==='chat'))boxes.push(drawDanmaku(ctx,item,{width,time:model.time,resources,images:images()}));
  const active=model.active.filter(x=>x.view.category!=='chat'),keep=new Set(active.map(x=>x.key));for(const [key,entry]of dom)if(!keep.has(key)){entry.node.remove();dom.delete(key);}
  const resourceVersion=[...resources.cache.values()].map(x=>x.state).join(',')+String(images());for(const item of active){const old=dom.get(item.key),version=item.updateVersion+resourceVersion;if(old?.version===version)continue;const node=renderCard(item);if(old)old.node.replaceWith(node);else (['gift','member'].includes(item.view.category)?gifts:activities).append(node);dom.set(item.key,{node,version});}
  status.textContent=`${model.paused?'展示已暂停':'舞台运行'} · 展示 ${model.active.length} · 等待 ${model.queue.length} · 过载略过 ${model.dropped}（原始事件仍在列表）${legacyMapping?' · 当前服务仍有旧版映射，增强字段需安全更新后端':''}`;
  diagnostics.textContent=`资源缓存 ${resources.cache.size}/128 · 加载中 ${resources.running} · 备用地址成功 ${[...resources.cache.values()].filter(x=>x.fallback).length} · ${resources.failures.map(x=>x.kind+'：'+x.reason).join('；')||'暂无加载失败'}。空图片位表示消息未提供资源或“显示消息图片”未开启。`;
 }
 function tick(now){frame=0;if(!visible||failed)return;try{model.step(last?now-last:0);last=now;render();}catch{failed=true;status.textContent='舞台展示异常，采集和消息列表不受影响';}if(!failed)frame=requestAnimationFrame(tick);}
 canvas.onclick=e=>{const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,b=boxes.find(b=>x>=b.x&&x<=b.x+b.width&&y>=b.y&&y<=b.y+b.height);if(b)select(b.id);};
 return {push:items=>{try{legacyMapping=items.some(v=>v.mappingVersion&&v.mappingVersion!=='message-view-20261017-session-emoji');model.push(items);}catch{status.textContent='某条展示转换失败；请在列表查看原始记录';}},pause:value=>{model.paused=value;container.dataset.paused=String(value);},clear:()=>{model.clear();},visible:value=>{visible=value;last=0;if(!visible){cancelAnimationFrame(frame);frame=0;}else if(!frame)frame=requestAnimationFrame(tick);},model,resources};
}

// First-party Canvas renderer. Static rules: CanvasDanmakuPlugin + module 217785.
// No official scripts, external runtime, or arbitrary message styles are executed.
export function danmakuRows(view){
 const runs=view.content?.runs?.length?view.content.runs:[{type:'text',text:view.summary||''}];
 const withName=view.actor?.name?[{type:'text',text:view.actor.name+':  '},...runs]:runs;
 const style=view.content?.privilegeStyle;
 if(view.messageType==='ScreenChatMessage')return [{runs,font:20,style:'admin'}];
 if(view.messageType==='EmojiChatMessage')return [{runs,font:20,imageHeight:40,style:'normal'}];
 if(view.messageType!=='PrivilegeScreenChatMessage'||!['base','advanced','supreme'].includes(style))return [{runs,font:20,style:'normal'}];
 if(style!=='supreme')return [{runs:withName,font:20,style}];
 const length=runs.reduce((n,r)=>n+(r.type==='text'?r.text.length:1),0),copies=Math.max(4-Math.floor((length-1)/5),2);
 const repeat=(count,opacity=()=>1)=>Array.from({length:count},(_,i)=>runs.map(r=>({...r,opacity:opacity(i)}))).flatMap((r,i)=>i?[{type:'gap',width:24},...r]:r);
 return [{runs:repeat(copies,i=>(i&2)?.5:1),font:14,style:'echo',offset:70},{runs:withName,font:20,style:'supreme',tail:repeat(copies-1)},{runs:repeat(copies,i=>i===0?.8:.5),font:14,style:'echo',offset:50}];
}
const palette={base:{color:'#c9f8ff',border:'rgba(255,255,255,.4)',fill:'rgba(0,0,0,.1)',stroke:'rgba(0,0,0,.34)'},advanced:{colors:['#ffeab2','#cdf9ff'],border:'rgba(173,219,228,.3)',fill:'rgba(173,219,228,.3)'},supreme:{colors:['#ffe8ac','#ffefc6','#ffe8ac'],border:'#ffd686',fillColors:['rgba(244,211,162,.3)','rgba(233,187,118,.3)','rgba(244,211,162,.3)'],stroke:'rgba(114,55,0,.5)'},echo:{colors:['#ffe8ac','#ffefc6','#ffe8ac'],stroke:'rgba(114,55,0,.5)'}};
function font(ctx,size,weight=400){ctx.font=`${weight} ${size}px Arial, "Microsoft YaHei", sans-serif`;ctx.textBaseline='alphabetic';}
function gradient(ctx,colors,x,width){const g=ctx.createLinearGradient(x,0,x+Math.max(1,width),0);colors.forEach((c,i)=>g.addColorStop(colors.length===2?(i===0?.25:.95):i/(colors.length-1),c));return g;}
export function drawDanmaku(ctx,item,{width,time,resources,images}){
 const v=item.view,rows=danmakuRows(v),prepared=rows.map(row=>{
  font(ctx,row.font,['supreme','echo'].includes(row.style)?500:400);
  const prepare=runs=>runs.map(run=>{if(run.type==='gap')return run;if(run.type!=='image')return {...run,width:ctx.measureText(run.text).width};const resource=images?resources.get(run.url,'表情',run.urls):null,height=row.imageHeight||row.font;return {...run,image:resource?.image,width:resource?.image?height*resource.image.naturalWidth/resource.image.naturalHeight:height,height};});
  const runs=prepare(row.runs);font(ctx,14,500);const tail=prepare(row.tail||[]),sum=a=>a.reduce((n,r)=>n+r.width,0);
  return {...row,runs,tail,bodyWidth:sum(runs),width:sum(runs)+sum(tail)+(tail.length?24:0)+20+(row.style==='admin'?60:0),height:Math.max(row.font,row.imageHeight||0)+10};
 });
 const totalWidth=Math.max(...prepared.map(r=>r.width+(r.offset||0))),totalHeight=prepared.reduce((n,r)=>n+r.height,0),x=width-(width+totalWidth)*(time-item.started)/15000;
 let top=40+item.lane*40;
 for(const row of prepared){
  ctx.save();font(ctx,row.font,['supreme','echo'].includes(row.style)?500:400);ctx.globalAlpha=row.opacity??1;
  const p=palette[row.style]||{},left=x+(row.offset||0),baseline=top+6+row.font;
  if(p.border){ctx.beginPath();ctx.roundRect(left,top,row.bodyWidth+20,row.height,row.height/2);ctx.fillStyle=p.fillColors?gradient(ctx,p.fillColors,left,row.bodyWidth):p.fill;ctx.fill();ctx.lineWidth=1;ctx.strokeStyle=p.border;ctx.stroke();}
  let cursor=left+10;
  if(row.style==='admin'){ctx.beginPath();ctx.roundRect(left,top,60,30,15);ctx.fillStyle='rgba(0,0,0,.1)';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#fff';ctx.fillText('管理',cursor,baseline);cursor+=64;}
  const paint=(runs,line=baseline)=>{for(const run of runs){ctx.globalAlpha=run.opacity??row.opacity??1;if(run.type==='gap'){cursor+=run.width;continue;}if(run.type==='image'){if(run.image)ctx.drawImage(run.image,cursor,top+5,run.width,run.height);else{ctx.strokeStyle='#aaa';ctx.lineWidth=1;ctx.strokeRect(cursor,top+5,run.width,run.height);}}else{ctx.lineWidth=row.style==='normal'?2:1;ctx.strokeStyle=p.stroke||'rgba(0,0,0,.8)';ctx.strokeText(run.text,cursor,line);ctx.fillStyle=p.colors?gradient(ctx,p.colors,left,row.bodyWidth):p.color||'#fff';ctx.fillText(run.text,cursor,line);}cursor+=run.width;}};
  paint(row.runs);if(row.tail.length){cursor+=24;font(ctx,14,500);paint(row.tail,baseline-3);}ctx.restore();top+=row.height;
 }
 return {x,y:40+item.lane*40,width:totalWidth,height:totalHeight,id:v.eventId};
}
