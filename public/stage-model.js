// Presentation-only clocks and queues. Dropping a visual never drops an event.
export class StageModel{
 constructor(){this.time=0;this.queue=[];this.active=[];this.seen=new Set();this.states=new Map();this.dropped=0;this.paused=false;}
 push(items){for(let view of [...items].sort((a,b)=>BigInt(a.eventSeq||0)<BigInt(b.eventSeq||0)?-1:1)){
  if(!view.eventId||this.seen.has(view.eventId)||!['chat','gift','lottery','redpacket','activity','admin','giftmenu'].includes(view.category))continue;
  this.seen.add(view.eventId);if(this.seen.size>1000)this.seen.delete(this.seen.values().next().value);
  const gift=view.content?.gift,activity=view.content?.activity,menu=view.content?.giftMenu;
  if(view.category==='giftmenu'&&!['replace','hide'].includes(menu?.action))continue;
  if(view.category==='gift'&&(gift?.trayEligible===false||gift?.comboState==='ended'))continue;
  const scope=[view.mode,view.runtimeNamespace,view.captureId,view.roomId];
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
 step(delta){if(this.paused)return;this.time+=Math.max(0,Math.min(delta,1000));
  this.active=this.active.filter(x=>this.time-(x.view.category==='chat'?x.started:x.updated)<({chat:15000,gift:2500,admin:8000}[x.view.category]||30000));
  const priority=x=>BigInt(x.view.content?.activity?.priority||0),sorted=this.queue.filter(x=>x.view.category==='activity').sort((a,b)=>priority(a)>priority(b)?-1:priority(a)<priority(b)?1:0);let activityIndex=0;this.queue=this.queue.map(x=>x.view.category==='activity'?sorted[activityIndex++]:x);
  for(let i=0;i<this.queue.length;){const item=this.queue[i],category=item.view.category,limit={chat:6,gift:2,lottery:1,redpacket:1,activity:2,admin:1,giftmenu:1}[category],same=this.active.filter(x=>x.view.category===category);if(same.length>=limit){i++;continue;}
   item.span=category==='chat'?(item.view.content?.privilegeStyle==='supreme'?3:item.view.messageType==='EmojiChatMessage'?2:1):1;
   const lanes=category==='chat'?new Set(same.flatMap(x=>Array.from({length:x.span||1},(_,n)=>x.lane+n))):new Set();
   const lane=category==='chat'?Array.from({length:7-item.span},(_,n)=>n).find(n=>Array.from({length:item.span},(_,j)=>n+j).every(j=>!lanes.has(j))):0;
   if(lane===undefined){i++;continue;}
   this.queue.splice(i,1);item.started=this.time;item.updated=this.time;item.lane=lane;this.active.push(item);
  }
 }
 clear(){this.queue=[];this.active=[];this.seen.clear();this.states.clear();this.time=0;this.dropped=0;}
}
