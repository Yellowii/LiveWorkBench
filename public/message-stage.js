import {StageModel} from './stage-model.js';
import {StageResources} from './stage-resources.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function createMessageStage({container,canvas,cards,status,diagnostics,select,images}){
 const model=new StageModel(),resources=new StageResources(),ctx=canvas.getContext('2d');let last=0,frame=0,visible=true,boxes=[],failed=false;
 const dom=new Map();
 function imageNode(url,kind,cls){const slot=el('span',undefined,'stage-image '+(cls||'')),item=resources.get(url,kind);if(!url){slot.title='消息没有提供该资源';slot.dataset.resourceState='mapping-missing';return slot;}slot.dataset.resourceState=item?.state||'unavailable';if(item?.image){const img=item.image.cloneNode();img.alt=kind;slot.append(img);}else slot.title=item?.reason||'资源加载中';return slot;}
 function renderCard(item){const v=item.view,b=el('button',undefined,'stage-card stage-'+v.category);b.type='button';b.dataset.updated=String(item.updateVersion>0);b.dataset.eventId=v.eventId;b.onclick=()=>select(v.eventId);
  if(v.category==='gift'){const tray=el('span',undefined,'stage-tray'),info=el('span',undefined,'stage-gift-info'),gift=v.content.gift||{};const bg=resources.get('/api/v1/local/assets/gift-tray-bg','托盘背景');if(bg?.state==='loaded')tray.style.backgroundImage='url(/api/v1/local/assets/gift-tray-bg)';
   tray.append(imageNode(images()?v.resources.find(x=>x.kind==='avatar')?.url:null,'头像','stage-avatar'));info.append(el('span',v.actor?.name||'未提供昵称','stage-gift-name'),el('span',gift.name?'送出 '+gift.name:'礼物名称未提供','stage-gift-text'));tray.append(info,imageNode(images()?v.resources.find(x=>x.kind==='gift')?.url:null,'礼物图标','stage-gift-icon'));b.append(tray);
   const combo=el('span',undefined,'stage-combo');combo.append(el('span','×','stage-times'),el('span',gift.repeatCount||gift.comboCount||'—','stage-number'));b.append(combo);b.title=(gift.comboState==='ended'?'连击结束':gift.comboState==='ongoing'?'连击中':'连击状态未确认')+'；数字为本条字段，不相加';
  }else{const icon=el('span',undefined,'stage-lottery-icon');icon.append(imageNode('/api/v1/local/assets/lottery-icon','福袋图标','stage-lottery-art'));const a=v.content.activity||{};icon.append(el('span',a.status||'未知','stage-lottery-state'));const info=el('span',undefined,'stage-lottery-info');info.append(el('span','福袋','stage-lottery-title'),el('span',v.summary.replace(/^福袋 · /,''),'stage-lottery-text'));b.append(icon,info);b.title='消息时点状态；30秒舞台展示时间不代表活动结束';}
  return b;
 }
 function render(){const width=container.clientWidth,height=container.clientHeight,dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);boxes=[];
  for(const item of model.active.filter(x=>x.view.category==='chat')){const v=item.view,privileged=v.messageType==='PrivilegeScreenChatMessage',text=(v.actor?.name?v.actor.name+'：':'')+v.summary,emoji=images()?v.resources.find(x=>['emoji','inline'].includes(x.kind)):null,img=emoji?resources.get(emoji.url,'表情'):null;
   ctx.font='400 20px Arial, "Microsoft YaHei", sans-serif';const w=ctx.measureText(text).width+(img?.image?24:0)+(privileged?20:0),x=width-(width+w)*(model.time-item.started)/15000,y=40+item.lane*40;
   if(privileged){ctx.fillStyle='rgba(0,0,0,.08)';ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x,y-24,w+10,34,20);ctx.fill();ctx.stroke();}
   ctx.lineWidth=2;ctx.strokeStyle='rgba(0,0,0,.8)';ctx.fillStyle='#fff';ctx.strokeText(text,x+10,y);ctx.fillText(text,x+10,y);if(img?.image)ctx.drawImage(img.image,x+w-20,y-20,20,20);boxes.push({x,y:y-25,width:w+10,height:36,id:v.eventId});
  }
  const active=model.active.filter(x=>x.view.category!=='chat'),keep=new Set(active.map(x=>x.key));for(const [key,entry]of dom)if(!keep.has(key)){entry.node.remove();dom.delete(key);}
  const resourceVersion=[...resources.cache.values()].map(x=>x.state).join(',')+String(images());for(const item of active){const old=dom.get(item.key),version=item.updateVersion+resourceVersion;if(old?.version===version)continue;const node=renderCard(item);if(old)old.node.replaceWith(node);else cards.append(node);dom.set(item.key,{node,version});}
  status.textContent=`${model.paused?'展示已暂停':'舞台运行'} · 展示 ${model.active.length} · 等待 ${model.queue.length} · 过载略过 ${model.dropped}（原始事件仍在列表）`;
  diagnostics.textContent=`资源缓存 ${resources.cache.size}/128 · 加载中 ${resources.running} · ${resources.failures.map(x=>x.kind+'：'+x.reason).join('；')||'暂无加载失败'}。空图片位表示消息未提供资源或“显示消息图片”未开启。`;
 }
 function tick(now){frame=0;if(!visible||failed)return;try{model.step(last?now-last:0);last=now;render();}catch{failed=true;status.textContent='舞台展示异常，采集和消息列表不受影响';}if(!failed)frame=requestAnimationFrame(tick);}
 canvas.onclick=e=>{const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,b=boxes.find(b=>x>=b.x&&x<=b.x+b.width&&y>=b.y&&y<=b.y+b.height);if(b)select(b.id);};
 return {push:items=>{try{model.push(items);}catch{status.textContent='某条展示转换失败；请在列表查看原始记录';}},pause:value=>{model.paused=value;},clear:()=>{model.clear();},visible:value=>{visible=value;last=0;if(!visible){cancelAnimationFrame(frame);frame=0;}else if(!frame)frame=requestAnimationFrame(tick);},model,resources};
}
