import {EventStore} from './event-store.js';
import {MessageDeduplicator} from './message-deduplicator.js';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {CursorCodec,decimalSequence} from './cursor.js';
import {logRecord} from './log-record.js';
import {ProtoIndex} from './proto-index.js';

export class Store {
  constructor(dir){
    this.cursors=new CursorCodec(dir);
    this.db=new DatabaseSync(path.join(dir,'workbench.sqlite'));this.closed=false;
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS raw(id TEXT PRIMARY KEY,recording TEXT,seq INTEGER,metadata TEXT,file TEXT);
      CREATE INDEX IF NOT EXISTS raw_recording ON raw(recording,seq);
      CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE,dedup TEXT UNIQUE,mode TEXT,namespace TEXT,method TEXT,json TEXT);
      CREATE INDEX IF NOT EXISTS event_domain ON events(mode,namespace,seq);
      CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,key TEXT UNIQUE,json TEXT);
      CREATE TABLE IF NOT EXISTS logs(seq INTEGER PRIMARY KEY AUTOINCREMENT,json TEXT);`);
    this.db.exec('CREATE TABLE IF NOT EXISTS runtime_state(key TEXT PRIMARY KEY,json TEXT); CREATE INDEX IF NOT EXISTS event_identity ON events(namespace,method,json_extract(json,\'$.roomId\'),json_extract(json,\'$.msgId\'));');
    this.protos=new ProtoIndex(this.db);this.eventStore=new EventStore(this.db,new MessageDeduplicator());
  }
  rawTrace(rawId,namespace){return this.protos.trace(rawId,namespace);}
  protoCount(){return this.protos.count();}
  bigStatement(sql){const statement=this.db.prepare(sql);statement.setReadBigInts(true);return statement;}
  getState(key){const row=this.db.prepare('SELECT json FROM runtime_state WHERE key=?').get(key);return row?JSON.parse(row.json):null;}
  setState(key,value){this.db.prepare('INSERT INTO runtime_state VALUES(?,?) ON CONFLICT(key) DO UPDATE SET json=excluded.json').run(key,JSON.stringify(value));}
  addRaw(meta,filePath){const seq=this.db.prepare('SELECT count(*)+1 AS n FROM raw WHERE recording=?').get(meta.recordingId).n;meta.captureSeq=String(seq);this.db.prepare('INSERT INTO raw VALUES(?,?,?,?,?)').run(meta.rawId,meta.recordingId,seq,JSON.stringify(meta),filePath);return meta;}
  raw(id){const row=this.db.prepare('SELECT metadata,file FROM raw WHERE id=?').get(id);return row?{...JSON.parse(row.metadata),filePath:row.file}:null;}
  rawFor(recording){return this.db.prepare('SELECT id FROM raw WHERE recording=? ORDER BY seq').all(recording).map(x=>this.raw(x.id));}
  rawPage(recording,{limit=50,cursor}={}){limit=Math.max(1,Math.min(200,Math.floor(Number(limit)||50)));const filters={kind:'raw',recordingId:recording};let before=null,snapshot=String(this.bigStatement('SELECT coalesce(max(seq),0) AS n FROM raw WHERE recording=?').get(recording).n);if(cursor){const decoded=this.cursors.decode(cursor,filters);before=decoded.before;snapshot=decoded.snapshot;}const rows=this.bigStatement(`SELECT metadata,seq FROM raw WHERE recording=? AND seq<=? ${before===null?'':'AND seq<?'} ORDER BY seq DESC LIMIT ?`).all(recording,BigInt(snapshot),...(before===null?[]:[BigInt(before)]),limit+1);const hasMore=rows.length>limit;rows.length=Math.min(rows.length,limit);return {items:rows.map(x=>JSON.parse(x.metadata)),hasMore,snapshot,nextCursor:hasMore?this.cursors.encode({filters,before:String(rows.at(-1).seq),snapshot}):null};}
  recordings(){return this.db.prepare('SELECT recording,count(*) AS records FROM raw GROUP BY recording').all().map(x=>({recordingId:x.recording,records:x.records}));}
  addEvent(event,key){const result=this.eventStore.save(event,key);if(this.history){this.history.sync();result.event=this.history.event(result.event.eventId);}return result;}
  eventHighWatermark(){if(this.history){this.history.sync();return this.history.high();}return String(this.bigStatement('SELECT coalesce(max(seq),0) AS n FROM events').get().n);}
  events({limit=50,cursor,mode,namespace,method,afterSeq}={}){
    if(this.history){this.history.sync();return Store.prototype.events.call(this.history.context(),{limit,cursor,mode,namespace,method,afterSeq});}
    limit=Math.max(1,Math.min(200,Math.floor(Number(limit)||50)));let boundary=null,snapshot;
    const filters={kind:'events',mode:mode||null,namespace:namespace||null,method:method||null,afterSeq:afterSeq===undefined||afterSeq===null?null:decimalSequence(afterSeq)};
    if(cursor){const c=this.cursors.decode(cursor,filters);boundary=c.before;snapshot=c.snapshot;}
    else snapshot=this.eventHighWatermark();
    const where=['seq<=?'];const values=[BigInt(snapshot)];
    if(boundary!==null){where.push('seq<?');values.push(BigInt(boundary));}
    if(filters.afterSeq!==null){where.push('seq>?');values.push(BigInt(filters.afterSeq));}
    for(const field of ['mode','namespace','method'])if(filters[field]){where.push(`${field}=?`);values.push(filters[field]);}
    const rows=this.bigStatement(`SELECT json,seq FROM events WHERE ${where.join(' AND ')} ORDER BY seq DESC LIMIT ?`).all(...values,limit+1);
    const hasMore=rows.length>limit;rows.length=Math.min(rows.length,limit);
    const nextCursor=hasMore?this.cursors.encode({filters,before:String(rows.at(-1).seq),snapshot}):null;
    return {items:rows.map(x=>({...JSON.parse(x.json),eventSeq:String(x.seq)})),hasMore,nextCursor,snapshot:String(snapshot)};
  }
  event(id){if(this.history){this.history.sync();return this.history.event(id);}const row=this.bigStatement('SELECT json,seq FROM events WHERE id=?').get(id);return row?{...JSON.parse(row.json),eventSeq:String(row.seq)}:null;}
  sessions(){return this.db.prepare('SELECT json FROM sessions').all().map(x=>JSON.parse(x.json));}
  saveSession(key,state){this.db.prepare('INSERT INTO sessions VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET json=excluded.json').run(state.sessionId,key,JSON.stringify(state));}
  log(code,details={}){const log=logRecord(code,details);const result=this.bigStatement('INSERT INTO logs(json) VALUES(?)').run(JSON.stringify(log));return {...log,logSeq:String(result.lastInsertRowid)};}
  logPage({module,level,code,operationId,limit=100,cursor}={}){
    if(this.history){this.history.sync();return Store.prototype.logPage.call(this.history.context(),{module,level,code,operationId,limit,cursor});}
    const filters={kind:'logs',module:module||null,level:level||null,code:code||null,operationId:operationId||null};
    limit=Math.max(1,Math.min(10000,Math.floor(Number(limit)||100)));let before=null,snapshot=String(this.bigStatement('SELECT coalesce(max(seq),0) AS n FROM logs').get().n);
    if(cursor){const decoded=this.cursors.decode(cursor,filters);before=decoded.before;snapshot=decoded.snapshot;}
    const where=['seq<=?'],args=[BigInt(snapshot)];if(before!==null){where.push('seq<?');args.push(BigInt(before));}
    for(const field of ['module','level','code','operationId'])if(filters[field]){where.push(`json_extract(json,'$.${field}')=?`);args.push(filters[field]);}
    const rows=this.bigStatement(`SELECT json,seq FROM logs WHERE ${where.join(' AND ')} ORDER BY seq DESC LIMIT ?`).all(...args,limit+1),hasMore=rows.length>limit;rows.length=Math.min(rows.length,limit);
    return {items:rows.map(row=>({...JSON.parse(row.json),logSeq:String(row.seq)})),hasMore,snapshot,nextCursor:hasMore?this.cursors.encode({filters,before:String(rows.at(-1).seq),snapshot}):null};
  }
  logs(){return this.logPage().items;}
  countRaw(){return this.db.prepare('SELECT count(*) AS n FROM raw').get().n;}
  countEvents(){return this.db.prepare('SELECT count(*) AS n FROM events').get().n;}
  close(){if(!this.closed){this.closed=true;this.db.close();}}
}

export {RawRecorder} from './raw-recorder.js';
