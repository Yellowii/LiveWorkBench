import fs from 'node:fs/promises';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';

export class Store {
  constructor(dir){
    this.db=new DatabaseSync(path.join(dir,'workbench.sqlite'));this.closed=false;
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS raw(id TEXT PRIMARY KEY,recording TEXT,seq INTEGER,metadata TEXT,file TEXT);
      CREATE INDEX IF NOT EXISTS raw_recording ON raw(recording,seq);
      CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE,dedup TEXT UNIQUE,mode TEXT,namespace TEXT,method TEXT,json TEXT);
      CREATE INDEX IF NOT EXISTS event_domain ON events(mode,namespace,seq);
      CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,key TEXT UNIQUE,json TEXT);
      CREATE TABLE IF NOT EXISTS logs(seq INTEGER PRIMARY KEY AUTOINCREMENT,json TEXT);`);
    this.db.exec('CREATE TABLE IF NOT EXISTS runtime_state(key TEXT PRIMARY KEY,json TEXT); CREATE INDEX IF NOT EXISTS event_identity ON events(namespace,method,json_extract(json,\'$.roomId\'),json_extract(json,\'$.msgId\'));');
  }
  getState(key){const row=this.db.prepare('SELECT json FROM runtime_state WHERE key=?').get(key);return row?JSON.parse(row.json):null;}
  setState(key,value){this.db.prepare('INSERT INTO runtime_state VALUES(?,?) ON CONFLICT(key) DO UPDATE SET json=excluded.json').run(key,JSON.stringify(value));}
  addRaw(meta,filePath){const seq=this.db.prepare('SELECT count(*)+1 AS n FROM raw WHERE recording=?').get(meta.recordingId).n;meta.captureSeq=String(seq);this.db.prepare('INSERT INTO raw VALUES(?,?,?,?,?)').run(meta.rawId,meta.recordingId,seq,JSON.stringify(meta),filePath);return meta;}
  raw(id){const row=this.db.prepare('SELECT metadata,file FROM raw WHERE id=?').get(id);return row?{...JSON.parse(row.metadata),filePath:row.file}:null;}
  rawFor(recording){return this.db.prepare('SELECT id FROM raw WHERE recording=? ORDER BY seq').all(recording).map(x=>this.raw(x.id));}
  recordings(){return this.db.prepare('SELECT recording,count(*) AS records FROM raw GROUP BY recording').all().map(x=>({recordingId:x.recording,records:x.records}));}
  addEvent(event,key){
    // Room identity is validated by SessionManager before this lookup; anchor enrichment cannot change identity.
    const old=key?(this.db.prepare('SELECT json,seq FROM events WHERE dedup=?').get(key)||(event.roomId&&event.msgId?this.db.prepare("SELECT json,seq FROM events WHERE namespace=? AND method=? AND json_extract(json,'$.roomId')=? AND json_extract(json,'$.msgId')=? LIMIT 1").get(event.runtimeNamespace,event.eventType,event.roomId,event.msgId):null)):null;
    if(old)return {event:{...JSON.parse(old.json),eventSeq:String(old.seq)},duplicate:true};
    event.eventId=key?createHash('sha256').update(key).digest('hex'):randomUUID();event.persistedAt=new Date().toISOString();
    const result=this.db.prepare('INSERT INTO events(id,dedup,mode,namespace,method,json) VALUES(?,?,?,?,?,?)').run(event.eventId,key,event.mode,event.runtimeNamespace,event.eventType,JSON.stringify(event));
    event.eventSeq=String(result.lastInsertRowid);return {event,duplicate:false};
  }
  events({limit=50,cursor,mode,namespace,method}={}){
    limit=Math.max(1,Math.min(500,Number(limit)||50));let boundary=Number.MAX_SAFE_INTEGER,snapshot;
    const filters={mode:mode||null,namespace:namespace||null,method:method||null};
    if(cursor){let c;try{c=JSON.parse(Buffer.from(cursor,'base64url'));}catch{throw new Error('CURSOR_MISMATCH');}if(JSON.stringify(c.filters)!==JSON.stringify(filters))throw new Error('CURSOR_MISMATCH');boundary=c.before;snapshot=c.snapshot;}
    else snapshot=this.db.prepare('SELECT coalesce(max(seq),0) AS n FROM events').get().n;
    const where=['seq<=?','seq<?'];const values=[snapshot,boundary];
    for(const [field,value]of Object.entries(filters))if(value){where.push(`${field}=?`);values.push(value);}
    const rows=this.db.prepare(`SELECT json,seq FROM events WHERE ${where.join(' AND ')} ORDER BY seq DESC LIMIT ?`).all(...values,limit+1);
    const hasMore=rows.length>limit;rows.length=Math.min(rows.length,limit);
    const nextCursor=hasMore?Buffer.from(JSON.stringify({filters,before:rows.at(-1).seq,snapshot})).toString('base64url'):null;
    return {items:rows.map(x=>({...JSON.parse(x.json),eventSeq:String(x.seq)})),hasMore,nextCursor,snapshot:String(snapshot)};
  }
  event(id){const row=this.db.prepare('SELECT json,seq FROM events WHERE id=?').get(id);return row?{...JSON.parse(row.json),eventSeq:String(row.seq)}:null;}
  sessions(){return this.db.prepare('SELECT json FROM sessions').all().map(x=>JSON.parse(x.json));}
  saveSession(key,state){this.db.prepare('INSERT INTO sessions VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET json=excluded.json').run(state.sessionId,key,JSON.stringify(state));}
  log(code,details={}){const log={at:new Date().toISOString(),code,...details};this.db.prepare('INSERT INTO logs(json) VALUES(?)').run(JSON.stringify(log));return log;}
  logs(){return this.db.prepare('SELECT json FROM logs ORDER BY seq DESC LIMIT 100').all().map(x=>JSON.parse(x.json));}
  countRaw(){return this.db.prepare('SELECT count(*) AS n FROM raw').get().n;}
  countEvents(){return this.db.prepare('SELECT count(*) AS n FROM events').get().n;}
  close(){if(!this.closed){this.closed=true;this.db.close();}}
}

export class RawRecorder {
  constructor(root,store){this.root=root;this.store=store;}
  registerExisting(input){
    // Historical payload already resides on disk. Keep a private reference, never copy the source.
    const raw={rawId:randomUUID(),recordingId:input.recordingId,format:input.format,method:input.method,mode:'replay',runtimeNamespace:input.runtimeNamespace,sourceType:null,anchorUid:null,originalSequence:input.originalSequence,indexMsgId:input.indexMsgId,receivedAt:new Date().toISOString(),persistedAt:new Date().toISOString(),durabilityLevel:'existing-read-only-input',contentHash:createHash('sha256').update(input.bytes).digest('hex'),size:input.bytes.length};
    return this.store.addRaw(raw,input.filePath);
  }
  async append(input){
    const rawId=randomUUID(),recordingId=input.recordingId||input.captureId||'manual';
    const receivedAt=input.receivedAt||new Date().toISOString();
    const metadata={rawId,recordingId,receivedAt,persistedAt:null,sourceType:input.sourceType||'LiveHookSource',sourceEpoch:input.sourceEpoch||'1',sourceConnectionId:input.sourceConnectionId||null,observedRoomId:input.observedRoomId||null,transport:input.transport||null,direction:input.direction||null,mode:input.mode||'live',runtimeNamespace:input.runtimeNamespace||'live',format:input.format||'frame',method:input.method||null,anchorUid:input.anchorUid||null,processName:input.processName||null,urlPath:input.urlPath||null,httpStatus:input.httpStatus??null,byteBoundary:input.byteBoundary||input.format||'frame',contentHash:createHash('sha256').update(input.bytes).digest('hex'),size:input.bytes.length};
    if(input.bytes.length>8*1024*1024)throw new Error('RAW_TOO_LARGE');
    try{
      await fs.mkdir(this.root,{recursive:true});const file=path.join(this.root,`${rawId}.bin`);
      const handle=await fs.open(file,'wx');try{await handle.writeFile(input.bytes);await handle.sync();}finally{await handle.close();}
      metadata.persistedAt=new Date().toISOString();metadata.durabilityLevel='file-fsync-and-sqlite-full';
      this.store.addRaw(metadata,file);return metadata;
    }catch{throw new Error('RAW_PERSIST_FAILED');}
  }
}
