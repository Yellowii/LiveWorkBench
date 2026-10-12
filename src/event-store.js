import {createHash,randomUUID} from 'node:crypto';
export class EventStore {
 constructor(db,deduplicator){this.db=db;this.deduplicator=deduplicator;}
 statement(sql){const statement=this.db.prepare(sql);statement.setReadBigInts(true);return statement;}
 save(event,key){
  const old=this.deduplicator.find(this,event,key);if(old)return {event:old,duplicate:true};
  event.eventId=key?createHash('sha256').update(key).digest('hex'):randomUUID();event.persistedAt=new Date().toISOString();
  const result=this.statement('INSERT INTO events(id,dedup,mode,namespace,method,json) VALUES(?,?,?,?,?,?)').run(event.eventId,key,event.mode,event.runtimeNamespace,event.eventType,JSON.stringify(event));
  return {event:{...event,eventSeq:String(result.lastInsertRowid)},duplicate:false};
 }
}
