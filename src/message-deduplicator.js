export class MessageDeduplicator {
 key({namespace,roomId,anchorUid,method,msgId}){return ['RoomCreatedObserved','PlatformLiveEndObserved'].includes(method)?JSON.stringify([namespace,roomId,method]):msgId&&msgId!=='0'&&roomId?JSON.stringify([namespace,anchorUid,roomId,method,msgId]):null;}
 find(repository,event,key){if(!key)return null;const row=repository.statement('SELECT json,seq FROM events WHERE dedup=?').get(key)||(event.roomId&&event.msgId?repository.statement("SELECT json,seq FROM events WHERE namespace=? AND method=? AND json_extract(json,'$.roomId')=? AND json_extract(json,'$.msgId')=? LIMIT 1").get(event.runtimeNamespace,event.eventType,event.roomId,event.msgId):null);return row?{...JSON.parse(row.json),eventSeq:String(row.seq)}:null;}
}
