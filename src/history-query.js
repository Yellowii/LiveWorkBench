import {DatabaseSync} from 'node:sqlite';
// A separate read model lets the existing Gateway query live and replay repositories
// without writing replay events, sessions, logs or parser attempts into live SQLite.
export class HistoryQuery {
 constructor(file,root){this.root=root;this.eventPosition=0n;this.logPosition=0n;this.db=new DatabaseSync(file);this.db.exec(`PRAGMA journal_mode=WAL;PRAGMA synchronous=FULL;
 CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE,mode TEXT,namespace TEXT,method TEXT,json TEXT);
 CREATE INDEX IF NOT EXISTS event_scope ON events(mode,namespace,json_extract(json,'$.roomId'),json_extract(json,'$.sessionId'),seq);
 CREATE TABLE IF NOT EXISTS logs(seq INTEGER PRIMARY KEY AUTOINCREMENT,owner TEXT,native_seq TEXT,json TEXT,UNIQUE(owner,native_seq));`);this.sync();}
 statement(sql){const statement=this.db.prepare(sql);statement.setReadBigInts(true);return statement;}
 sync(){
  for(const row of this.root.bigStatement('SELECT seq,id,json FROM events WHERE seq>? ORDER BY seq').all(this.eventPosition)){
   this.eventPosition=row.seq;
   if(this.db.prepare('SELECT 1 FROM events WHERE id=?').get(row.id))continue;
   const event=JSON.parse(row.json);const max=this.high();
   if(BigInt(max)<row.seq)this.db.prepare('INSERT INTO events(seq,id,mode,namespace,method,json) VALUES(?,?,?,?,?,?)').run(row.seq,event.eventId,event.mode,event.runtimeNamespace,event.eventType,JSON.stringify(event));else this.appendEvent(event);
  }
  for(const row of this.root.bigStatement('SELECT seq,json FROM logs WHERE seq>? ORDER BY seq').all(this.logPosition)){this.logPosition=row.seq;this.appendLog('live',String(row.seq),JSON.parse(row.json));}
 }
 appendEvent(event){const {eventSeq,...metadata}=event;this.db.prepare('INSERT INTO events(id,mode,namespace,method,json) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING').run(event.eventId,event.mode,event.runtimeNamespace,event.eventType,JSON.stringify(metadata));return this.event(event.eventId);}
 appendLog(owner,seq,log){this.db.prepare('INSERT INTO logs(owner,native_seq,json) VALUES(?,?,?) ON CONFLICT(owner,native_seq) DO NOTHING').run(owner,seq,JSON.stringify(log));const row=this.statement('SELECT seq FROM logs WHERE owner=? AND native_seq=?').get(owner,seq);return {...log,logSeq:String(row.seq)};}
 high(){return String(this.statement('SELECT coalesce(max(seq),0) AS n FROM events').get().n);}
 event(id){const row=this.statement('SELECT json,seq FROM events WHERE id=?').get(id);return row?{...JSON.parse(row.json),eventSeq:String(row.seq)}:null;}
 context(){return {bigStatement:sql=>this.statement(sql),cursors:this.root.cursors,eventHighWatermark:()=>this.high()};}
 close(){this.db.close();}
}
