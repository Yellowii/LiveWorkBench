export function logRecord(code,details){
 const clean=value=>Array.isArray(value)?value.map(clean):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!/cookie|token|password|secret|credential|authorization/i.test(key)).map(([key,item])=>[key,clean(item)])):value;
 const module=/^RAW_|STALE_SOURCE_RAW/.test(code)?'raw':/^PARSE_|HTTP_PARSE/.test(code)?'parser':/^SOURCE_|WEB_/.test(code)?'source':/^REPLAY_/.test(code)?'replay':/^COMPANION_|CAPTURE_|HOOK_|RESTART_|AWAITING_|WAITING_/.test(code)?'capture':/^ROOM_|SESSION_|LIFECYCLE_|OTHER_ROOM_|ENDED_ROOM_/.test(code)?'session':/^GATEWAY_/.test(code)?'gateway':'core';
 const level=/FAILED|ERROR|MISMATCH/.test(code)?'error':/REQUIRED|UNRESOLVED|REJECTED|INTERRUPTED|GAP|CONFLICT/.test(code)?'warn':'info';
 return {...clean(details),at:new Date().toISOString(),code,module,level};
}
