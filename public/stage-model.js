// Presentation-only clocks and queues. Dropping a visual never drops an event.
export class StageModel{
 constructor(){this.time=0;this.queue=[];this.active=[];this.seen=new Set();this.dropped=0;this.paused=false;}
 push(items){for(const view of [...items].sort((a,b)=>BigInt(a.eventSeq||0)<BigInt(b.eventSeq||0)?-1:1)){
  if(!view.eventId||this.seen.has(view.eventId)||!['chat','gift','lottery'].includes(view.category))continue;
  this.seen.add(view.eventId);if(this.seen.size>1000)this.seen.delete(this.seen.values().next().value);
  const gift=view.content?.gift,activity=view.content?.activity;
  if(view.category==='gift'&&(gift?.trayEligible===false||gift?.comboState==='ended'))continue;
  const key=view.category==='gift'&&view.actor?.id&&gift?.giftId&&gift?.groupId?[view.runtimeNamespace,view.captureId,view.actor.id,gift.giftId,gift.groupId,gift.trayText||''].join(':'):view.category==='lottery'&&activity?.lotteryId?[view.runtimeNamespace,view.captureId,'lottery',activity.lotteryId].join(':'):view.eventId;
  const existing=[...this.active,...this.queue].find(x=>x.key===key);
  if(existing){
   if(view.category==='gift'){
    const count=v=>v.content.gift.displayCount||v.content.gift.repeatCount||v.content.gift.comboCount;
    const next=count(view),previous=count(existing.view);
    if(!/^\d+$/.test(next)||!/^\d+$/.test(previous)||BigInt(next)<=BigInt(previous))continue;
   }
   existing.view=view;existing.updated=this.time;existing.updateVersion++;continue;
  }
  this.queue.push({view,key,updated:this.time,updateVersion:0});if(this.queue.length>100){this.queue.shift();this.dropped++;}
 }}
 step(delta){if(this.paused)return;this.time+=Math.max(0,Math.min(delta,1000));
  this.active=this.active.filter(x=>this.time-(x.view.category==='chat'?x.started:x.updated)<(x.view.category==='chat'?15000:x.view.category==='gift'?2500:30000));
  for(let i=0;i<this.queue.length;){const item=this.queue[i],category=item.view.category,limit={chat:6,gift:2,lottery:1}[category],same=this.active.filter(x=>x.view.category===category);if(same.length>=limit){i++;continue;}
   item.span=category==='chat'?(item.view.content?.privilegeStyle==='supreme'?3:item.view.messageType==='EmojiChatMessage'?2:1):1;
   const lanes=category==='chat'?new Set(same.flatMap(x=>Array.from({length:x.span||1},(_,n)=>x.lane+n))):new Set();
   const lane=category==='chat'?Array.from({length:7-item.span},(_,n)=>n).find(n=>Array.from({length:item.span},(_,j)=>n+j).every(j=>!lanes.has(j))):0;
   if(lane===undefined){i++;continue;}
   this.queue.splice(i,1);item.started=this.time;item.updated=this.time;item.lane=lane;this.active.push(item);
  }
 }
 clear(){this.queue=[];this.active=[];this.seen.clear();this.time=0;this.dropped=0;}
}
