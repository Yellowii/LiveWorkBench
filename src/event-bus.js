import {EventEmitter} from 'node:events';
export class EventBus extends EventEmitter {
 commit(event,key,repository){const result=repository.addEvent(event,key);if(!result.duplicate)this.emit('events.appended',result.event);return result;}
 emit(channel,...values){
  const listeners=this.rawListeners(channel);for(const listener of listeners){try{const result=listener.apply(this,values);if(result?.catch)result.catch(()=>this.subscriberFailure(channel));}catch{this.subscriberFailure(channel);}}
  return listeners.length>0;
 }
 subscriberFailure(channel){if(channel==='log.appended')return;try{this.log?.('EVENT_SUBSCRIBER_FAILED',{channel});}catch{}}
}
