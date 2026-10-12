// Derived indexes only. Payload files are private; callers get metadata projections.
import {randomUUID} from 'node:crypto';
export class ProtoIndex {
 constructor(db){this.db=db;db.exec(`CREATE TABLE IF NOT EXISTS transport_stages(raw_id TEXT PRIMARY KEY,json TEXT);
 CREATE TABLE IF NOT EXISTS proto_messages(id TEXT PRIMARY KEY,raw_id TEXT,ordinal INTEGER,json TEXT,payload_file TEXT,UNIQUE(raw_id,ordinal));
 CREATE INDEX IF NOT EXISTS proto_parent ON proto_messages(raw_id,ordinal);
 CREATE TABLE IF NOT EXISTS proto_parse_attempts(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE,proto_id TEXT,namespace TEXT,json TEXT);
 CREATE INDEX IF NOT EXISTS proto_attempt_parent ON proto_parse_attempts(proto_id,seq);`);}
 transport(rawId){const row=this.db.prepare('SELECT json FROM transport_stages WHERE raw_id=?').get(rawId);return row?JSON.parse(row.json):null;}
 saveTransport(rawId,value){this.db.prepare('INSERT INTO transport_stages VALUES(?,?) ON CONFLICT(raw_id) DO UPDATE SET json=excluded.json').run(rawId,JSON.stringify(value));}
 add(message,file){this.db.prepare('INSERT INTO proto_messages VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING').run(message.protoId,message.rawId,message.messageIndex,JSON.stringify(message),file);}
 get(id){const row=this.db.prepare('SELECT json,payload_file FROM proto_messages WHERE id=?').get(id);return row?{...JSON.parse(row.json),payloadFile:row.payload_file}:null;}
 forRaw(rawId){return this.db.prepare('SELECT json FROM proto_messages WHERE raw_id=? ORDER BY ordinal').all(rawId).map(row=>JSON.parse(row.json));}
 update(id,changes,namespace){const current=this.get(id);if(!current)return;if(namespace&&current.runtimeNamespace&&namespace!==current.runtimeNamespace)return current;const {payloadFile,...metadata}=current;Object.assign(metadata,changes);this.db.prepare('UPDATE proto_messages SET json=? WHERE id=?').run(JSON.stringify(metadata),id);return metadata;}
 attempt(value){const attempt={...value,attemptId:randomUUID(),parsedAt:new Date().toISOString()};this.db.prepare('INSERT INTO proto_parse_attempts(id,proto_id,namespace,json) VALUES(?,?,?,?)').run(attempt.attemptId,attempt.protoId,attempt.runtimeNamespace,JSON.stringify(attempt));return attempt;}
 attempts(protoId){return this.db.prepare('SELECT json FROM proto_parse_attempts WHERE proto_id=? ORDER BY seq DESC LIMIT 50').all(protoId).map(x=>JSON.parse(x.json));}
 count(){return this.db.prepare('SELECT count(*) AS n FROM proto_messages').get().n;}
 trace(rawId){return {transport:this.transport(rawId),messages:this.forRaw(rawId)};}
}
