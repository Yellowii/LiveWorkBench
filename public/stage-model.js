// Presentation-only clocks and queues. Dropping a visual never drops an event.
export class StageModel{
 constructor({now=()=>performance.now()}={}){this.now=now;this.time=0;this.queue=[];this.active=[];this.likes=[];this.seen=new Set();this.states=new Map();this.dropped=0;this.paused=false;}
 expireLikes(){this.likes=this.likes.filter(x=>this.now()-x.updatedAt<3000);}
 push(items){this.expireLikes();for(let view of [...items].sort((a,b)=>BigInt(a.eventSeq||0)<BigInt(b.eventSeq||0)?-1:1)){
  if(!view.eventId||this.seen.has(view.eventId)||!['gift','lottery','redpacket','activity','admin','giftmenu','member','like'].includes(view.category))continue;
  this.seen.add(view.eventId);if(this.seen.size>1000)this.seen.delete(this.seen.values().next().value);
  if(view.category==='member'&&view.content?.entry?.type!=='8')continue;
  const gift=view.content?.gift,activity=view.content?.activity,menu=view.content?.giftMenu;
  if(view.category==='giftmenu'&&!['replace','hide'].includes(menu?.action))continue;
  if(view.category==='gift'&&(gift?.trayEligible===false||gift?.comboState==='ended'))continue;
  const scope=[view.mode,view.runtimeNamespace,view.captureId,view.roomId,view.sessionId];
  if(view.category==='like'){
   const key=JSON.stringify([...scope,'like',view.actor?.id&&view.actor.id!=='0'?view.actor.id:view.eventId]),existing=this.likes.find(x=>x.key===key);
   if(existing&&/^\d+$/.test(view.eventSeq)&&/^\d+$/.test(existing.view.eventSeq)&&BigInt(view.eventSeq)<=BigInt(existing.view.eventSeq))continue;
   if(existing){existing.view=view;existing.updatedAt=this.now();existing.updateVersion++;}else this.likes.push({key,view,updatedAt:this.now(),updateVersion:0});
   if(this.likes.length>32){this.likes.shift();this.dropped++;}continue;
  }
  if(view.category==='activity'&&(!activity?.areaType||activity.areaType==='0'||!['1','2'].includes(activity.action)))continue;
  if(view.category==='redpacket'&&(!activity?.boxId||activity.boxId==='0'||activity.stageEligible===false))continue;
  const identity=view.category==='gift'&&view.actor?.id&&gift?.giftId&&gift?.groupId?['gift',view.actor.id,gift.giftId,gift.groupId,gift.trayText||'']:view.category==='lottery'&&activity?.lotteryId?['lottery',activity.lotteryId]:view.category==='redpacket'?['redpacket',activity.boxId]:view.category==='activity'?['activity',activity.areaType]:null;
  const key=view.category==='giftmenu'?JSON.stringify([...scope,'giftmenu']):identity?JSON.stringify([...scope,...identity]):view.eventId;
  // Remember recent removals/ends even if their visual expired. Never let a stale
  // history batch resurrect a card, or a different room/replay close it.
  if(['activity','redpacket','giftmenu'].includes(view.category)){
   const sequence=/^\d+$/.test(String(view.eventSeq))?BigInt(view.eventSeq):null,previous=this.states.get(key);
   if(previous&&(previous.ended||sequence!==null&&previous.sequence!==null&&sequence<=previous.sequence))continue;
   this.states.delete(key);this.states.set(key,{sequence,ended:view.category==='redpacket'&&activity.status==='ended'});if(this.states.size>1000)this.states.delete(this.states.keys().next().value);
   if(view.category==='activity'&&activity.action==='2'||view.category==='giftmenu'&&menu.action==='hide'){this.active=this.active.filter(x=>x.key!==key);this.queue=this.queue.filter(x=>x.key!==key);continue;}
  }
  const existing=[...this.active,...this.queue].find(x=>x.key===key);
  if(existing){
   if(view.category==='gift'){
    const count=v=>v.content.gift.displayCount||v.content.gift.repeatCount||v.content.gift.comboCount;
    const next=count(view),previous=count(existing.view);
    if(!/^\d+$/.test(next)||!/^\d+$/.test(previous)||BigInt(next)<=BigInt(previous))continue;
   }
   if(view.category==='redpacket'&&activity.status==='ended')view={...view,actor:existing.view.actor,resources:existing.view.resources,content:{...view.content,activity:{...existing.view.content.activity,...Object.fromEntries(Object.entries(activity).filter(([,v])=>v!==null&&(!Array.isArray(v)||v.length)))}}};
   existing.view=view;existing.updated=this.time;existing.updateVersion++;continue;
  }
  if(view.category==='redpacket'&&activity.status==='ended')continue;
  this.queue.push({view,key,updated:this.time,updateVersion:0});if(this.queue.length>100){this.queue.shift();this.dropped++;}
 }}
 step(delta){this.expireLikes();if(this.paused)return;this.time+=Math.max(0,Math.min(delta,1000));
  this.active=this.active.filter(x=>this.time-x.updated<({gift:2500,admin:8000,member:5000}[x.view.category]||30000));
  const priority=x=>BigInt(x.view.content?.activity?.priority||0),sorted=this.queue.filter(x=>x.view.category==='activity').sort((a,b)=>priority(a)>priority(b)?-1:priority(a)<priority(b)?1:0);let activityIndex=0;this.queue=this.queue.map(x=>x.view.category==='activity'?sorted[activityIndex++]:x);
  while(this.queue.length&&this.active.length<12){const item=this.queue.shift();item.started=this.time;item.updated=this.time;this.active.push(item);
  }
 }
 clear(){this.queue=[];this.active=[];this.likes=[];this.seen.clear();this.states.clear();this.time=0;this.dropped=0;}
}
