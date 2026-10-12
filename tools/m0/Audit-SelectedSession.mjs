// Read-only corpus diagnostics. Never copies payloads or prints decoded identities.
// Output is aggregate evidence plus hash/line based golden locators.
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const [sampleArg, parserArg, outputArg, mode = 'audit'] = process.argv.slice(2);
if (!sampleArg || !parserArg || !outputArg) throw new Error('Usage: node Audit-SelectedSession.mjs <selected session> <isolated protobuf-live> <report.json> [audit|inspect|verify]');
const root = await fs.realpath(sampleArg), output = path.resolve(outputArg);
const foldPath = (p) => process.platform==='win32' ? p.toLowerCase() : p;
const within = (p) => foldPath(p) === foldPath(root) || foldPath(p).startsWith(foldPath(root + path.sep));
if (within(output)) throw new Error('Report must be outside selected sample.');
let outputAncestor=path.dirname(output);
while(true) {
  try { if(within(await fs.realpath(outputAncestor)))throw new Error('Report ancestor resolves into selected sample.');break; }
  catch(error) { if(error.code!=='ENOENT')throw error;const parent=path.dirname(outputAncestor);if(parent===outputAncestor)throw error;outputAncestor=parent; }
}
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const norm = (key) => key.replaceAll('_', '').toLowerCase();
const safeKey = (key) => /^\d+$/.test(key) ? '{index}' : /^[A-Za-z_][A-Za-z_0-9]{0,63}$/.test(key) ? key : '{dynamic-key}';
const parse = (line) => JSON.parse(line.replace(/^\uFEFF/, ''), (_k, value, context) =>
  typeof value === 'number' && !Number.isSafeInteger(value) && /^-?\d+$/.test(context?.source || '') ? context.source : value);
const integer = (v) => v != null && /^-?\d+$/.test(String(v)) ? BigInt(String(v)).toString() : null;
const inc = (obj, key, amount = 1) => { obj[key] = (obj[key] || 0) + amount; };
async function read(relative) {
  const resolved = path.resolve(root, relative), real = await fs.realpath(resolved);
  if (!within(resolved) || !within(real)) throw new Error('Reference escapes selected session.');
  return fs.readFile(real);
}
async function* lines(name) {
  const resolved = await fs.realpath(path.join(root, name));
  if (!within(resolved)) throw new Error('Index escapes selected session.');
  let n = 0;
  for await (const line of readline.createInterface({ input: createReadStream(resolved, { encoding: 'utf8' }), crlfDelay: Infinity })) {
    n++; if (line.trim()) yield [n, parse(line)];
  }
}
async function inventory(dir) {
  const found = [];
  async function walk(relative) {
    for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('Symlink/reparse entry not accepted.');
      const name = path.join(relative, entry.name);
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile()) {
        const b = await read(name), s = await fs.stat(path.join(root, name));
        found.push({ relative: name.replaceAll('\\', '/'), bytes: b.length, sha256: sha(b), mtimeMs: s.mtimeMs });
      }
    }
  }
  await walk(dir); return found.sort((a,b) => a.relative.localeCompare(b.relative));
}
function wire(bytes) {
  const fields = []; let pos = 0;
  const varint = () => {
    let value = 0n;
    for (let i=0; i<10; i++) {
      if (pos >= bytes.length) throw new Error('truncated-varint');
      const b = bytes[pos++]; if (i===9 && b>1) throw new Error('uint64-overflow');
      value |= BigInt(b & 127) << BigInt(i*7); if (!(b&128)) return value;
    }
    throw new Error('invalid-varint');
  };
  while (pos<bytes.length) {
    const tag=varint(), number=Number(tag>>3n), w=Number(tag&7n);
    if (!number || tag>0xffffffffn) throw new Error('invalid-tag');
    const f={number,wire:w};
    if(w===0) f.value=varint();
    else if(w===1 || w===5) { const n=w===1?8:4; if(pos+n>bytes.length)throw new Error('truncated-fixed');f.data=bytes.subarray(pos,pos+n);pos+=n; }
    else if(w===2) { const n=varint();if(n>BigInt(bytes.length-pos))throw new Error('truncated-length');f.data=bytes.subarray(pos,pos+Number(n));pos+=Number(n); }
    else throw new Error('group-or-invalid-wire-requires-review');
    fields.push(f);
  }
  return fields;
}
const {loadParser}=await import(pathToFileURL(path.join(parserArg,'src/parser.js')));
const {decodeBusiness,resolveBusiness}=await import(pathToFileURL(path.join(parserArg,'src/decode.js')));
const parser=await loadParser();
const keywords=['会员','星守护'];
function keywordPaths(value, prefix='', out=[]) {
  if (typeof value==='string') { const terms=keywords.filter(k=>value.includes(k));if(terms.length)out.push({path:prefix,terms}); }
  else if(value && typeof value==='object') for(const [k,v]of Object.entries(value))keywordPaths(v,prefix?prefix+'.'+safeKey(k):safeKey(k),out);
  return out;
}
function schemaWire(bytes,type,at='',out={unknown:{},conflicts:{},observed:{},root:[]},depth=0) {
  if(depth>40)throw new Error('schema-depth-limit');
  const fields=wire(bytes), byId=new Map(type?.fields?.map(f=>[f.id,f])||[]);
  for(const raw of fields) {
    const f=byId.get(raw.number), key=at?at+'.'+raw.number:String(raw.number);
    if(depth===0)out.root.push({number:raw.number,wire:raw.wire,bytes:raw.data?.length??null,name:f?.name??null,type:f?.type??null});
    if(!f){inc(out.unknown,key+'|wire'+raw.wire);continue;}
    const nested=parser.types.get(f.type), expected=(nested||f.keyType||['string','bytes'].includes(f.type))?2:['double','fixed64','sfixed64'].includes(f.type)?1:['float','fixed32','sfixed32'].includes(f.type)?5:0;
    const packed=f.repeated && expected!==2 && raw.wire===2;
    if(raw.wire!==expected && !packed)inc(out.conflicts,key+':'+f.name+' expected'+expected+' observed'+raw.wire);
    inc(out.observed,key+':'+f.name+'|wire'+raw.wire);
    if(nested && raw.wire===2 && !f.keyType) schemaWire(raw.data,nested,key,out,depth+1);
  }
  return out;
}
function compareAliases(old, current, at='', result={aliases:{},conflicts:{},oldOnly:{},officialOnly:{}}) {
  if(!old||!current||typeof old!=='object'||typeof current!=='object')return result;
  if(Array.isArray(old)||Array.isArray(current)) {
    if(Array.isArray(old)&&Array.isArray(current))for(let i=0;i<Math.min(old.length,current.length);i++)compareAliases(old[i],current[i],at+'[]',result);
    return result;
  }
  const lookup=new Map(Object.keys(current).map(k=>[norm(k),k]));
  for(const [k,v]of Object.entries(old)) {
    if(k.startsWith('_'))continue;
    const matched=lookup.get(norm(k)), p=at?at+'.'+safeKey(k):safeKey(k);
    if(matched===undefined){inc(result.oldOnly,p);continue;}
    if(k!==matched)inc(result.aliases,p+' -> '+safeKey(matched));
    const newer=current[matched];
    if(v && newer && typeof v==='object' && typeof newer==='object')compareAliases(v,newer,p,result);
    else if(v!=null && newer!=null && (integer(v)!==null && integer(newer)!==null ? integer(v)!==integer(newer) : JSON.stringify(v)!==JSON.stringify(newer)))inc(result.conflicts,p);
  }
  // Non-default official values only. These are comparison candidates, not
  // assertions that every official field is correct or was absent on the wire.
  const oldKeys=new Set(Object.keys(old).map(norm));
  for(const [k,v]of Object.entries(current))if(!oldKeys.has(norm(k))&&v!=null&&v!==''&&v!==false&&v!==0&&v!=='0'&&(!Array.isArray(v)||v.length)&&(!(typeof v==='object')||Object.keys(v).length))inc(result.officialOnly,at?at+'.'+safeKey(k):safeKey(k));
  return result;
}
function businessIds(bytes) {
  const common=wire(bytes).find(f=>f.number===1&&f.wire===2);
  if(!common)return {};
  const c=wire(common.data), find=(n)=>c.find(f=>f.number===n&&f.wire===0)?.value?.toString();
  const m=c.find(f=>f.number===1&&f.wire===2)?.data?.toString('utf8');
  return {method:m,msgId:find(2),roomId:find(3)};
}
const indexes=new Map(), indexStats={rows:0,invalid:0,duplicateSeq:0,duplicateRefs:0,duplicateMethodMsgId:0,seqGaps:0,nonMonotonicSeq:0,zeroMsgId:0,beyondJsSafeRange:0};
const refs=new Set(), methodIds=new Set();let previous=0;
for await(const [line,o]of lines('raw_proto_index.jsonl')) {
  indexStats.rows++;const seq=Number(o.seq);
  if(indexes.has(seq))indexStats.duplicateSeq++;
  if(refs.has(o.file))indexStats.duplicateRefs++;refs.add(o.file);
  const mid=integer(o.msg_id),mk=o.method+'|'+mid;
  if(methodIds.has(mk))indexStats.duplicateMethodMsgId++;methodIds.add(mk);
  if(mid==='0')indexStats.zeroMsgId++;
  if(mid && BigInt(mid)>9007199254740991n)indexStats.beyondJsSafeRange++;
  if(previous && seq!==previous+1)indexStats.seqGaps+=Math.max(0,seq-previous-1);
  if(seq<=previous)indexStats.nonMonotonicSeq++;previous=seq;
  indexes.set(seq,{...o,msg_id:mid,line});
}
if(mode==='inspect') {
  const result={sampleAlias:'M0-R01',scope:'selected field correlations, no decoded identities',oldDictionarySource:'not available in selected directory',matches:{},idDifferences:{oldCommonVsIndex:0,within2048:0,sameDouble:0,byMethod:{},commonMethodMsgIdDuplicates:0},gift:{groups:0,maxCountsSum:0,largestGroupCount:0,groupsWithEnd:0,maxInterMessageGapMs:0,gapAbove10SecondsGroups:0},cases:[]};
  const rawKeys=new Set(),groups=new Map();
  const focused=['WebcastRoomStatsMessage','WebcastGiftMessage','WebcastMemberMessage','WebcastLikeMessage','WebcastChatMessage','WebcastFansclubMessage','WebcastRoomMessage','WebcastSocialMessage','WebcastEmojiChatMessage'];
  const seenCases=new Set();
  for await(const [_line,o]of lines('parsed.jsonl')) {
    const old=o.parsed||{},row=indexes.get(Number(o.seq));if(!row)continue;
    const commonId=integer(old.common?.msgId);
    if(commonId && commonId!==row.msg_id){const d=BigInt(row.msg_id)-BigInt(commonId);result.idDifferences.oldCommonVsIndex++;if(d>=-2048n&&d<=2048n)result.idDifferences.within2048++;if(Number(row.msg_id)===Number(commonId))result.idDifferences.sameDouble++;inc(result.idDifferences.byMethod,o.method);}
    if(commonId){const k=o.method+'|'+commonId;if(rawKeys.has(k))result.idDifferences.commonMethodMsgIdDuplicates++;rawKeys.add(k);}
    if(!focused.includes(o.method)||old._error||old._unknown)continue;
    const b=await read(row.file),d=decodeBusiness(parser,o.method,b).data;if(!d)continue;
    const type=resolveBusiness(parser,o.method);
    for(const [prefix,oldObj,newObj,newType]of [['root',old,d,type],['user',old.user,d.user,parser.types.get(type.fields.find(f=>f.name==='user')?.type)]]) {
      if(!oldObj||!newObj)continue;
      const keys=prefix==='user'?['idStr','subscribeStatus','badgeFlags','teamIdStr','secUserId','userLevel']:o.method==='WebcastRoomStatsMessage'?['fanTicketCount','giftDiamondCount','enterCount','followCount']:o.method==='WebcastGiftMessage'?['eventTime','roomId','itemType']:[];
      for(const oldKey of keys) {
        const v=oldObj[oldKey];if(v==null)continue;const k=o.method+':'+prefix+'.'+oldKey;
        if(!result.matches[k])result.matches[k]={observations:0,emptyOrZero:0,candidates:{}};
        const stats=result.matches[k];stats.observations++;if(v===''||v===0||v==='0')stats.emptyOrZero++;
        for(const f of newType?.fields||[])if(newObj[f.name]!=null&&typeof newObj[f.name]!=='object'&&String(v)===String(newObj[f.name]))inc(stats.candidates,`field${f.id}:${f.name}:${f.type}`);
      }
    }
    if(o.method==='WebcastGiftMessage') {
      const key=[d.common?.room_id,d.gift_id,d.group_id,d.user?.id].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push({count:Number(d.repeat_count),end:Number(d.repeat_end),ts:o.ts,seq:o.seq});
      if(old.roomId!=null && !seenCases.has('gift-root-room')){seenCases.add('gift-root-room');result.cases.push({kind:'gift-root-room',seq:o.seq,oldRootRoomEqualsRawCommonRoom:String(old.roomId)===d.common?.room_id,oldRootRoomEqualsField33SendTime:String(old.roomId)===d.send_time,oldRootRoomDigits:String(old.roomId).length,rawCommonRoomDigits:d.common?.room_id?.length});}
    }
    if(o.seq===1601) {
      const commonType=parser.types.get(type.fields.find(f=>f.name==='common')?.type),textType=parser.types.get(commonType.fields.find(f=>f.name==='display_text')?.type);
      result.cases.push({kind:'star-template',seq:o.seq,wirePath:'1.8.'+textType.fields.find(f=>f.name==='default_pattern')?.id,declaredType:'string',tokens:['成为','星守护'].filter(k=>d.common?.display_text?.default_pattern?.includes(k)),templateKey:d.common?.display_text?.key});
    }
  }
  for(const g of groups.values()) {
    result.gift.groups++;result.gift.maxCountsSum+=Math.max(...g.map(x=>x.count));result.gift.largestGroupCount=Math.max(result.gift.largestGroupCount,...g.map(x=>x.count));if(g.some(x=>x.end===1))result.gift.groupsWithEnd++;
    const gap=Math.max(0,...g.slice(1).map((x,i)=>x.ts-g[i].ts));result.gift.maxInterMessageGapMs=Math.max(result.gift.maxInterMessageGapMs,gap);if(gap>10000)result.gift.gapAbove10SecondsGroups++;
  }
  await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({sampleAlias:result.sampleAlias,idDifferences:result.idDifferences,gift:result.gift,cases:result.cases,outputContainsDecodedIdentities:false}));process.exit(0);
}
if(mode==='verify') {
  const expected=parse(await fs.readFile(output,'utf8'));let checked=0;
  if(expected.selectedRootHash!==sha(root))throw new Error('Golden selected directory mismatch.');
  const wanted=new Set(expected.golden.map(g=>g.seq)),oldRows=new Map();
  for await(const [line,o]of lines('parsed.jsonl'))if(wanted.has(Number(o.seq)))oldRows.set(Number(o.seq),{line,o});
  for(const g of expected.golden) {
    const row=indexes.get(g.seq);if(!row||row.method!==g.method||row.line!==g.indexLine)throw new Error('Golden index identity mismatch.');
    const b=await read(row.file);if(sha(b)!==g.rawSha256)throw new Error('Golden payload hash changed.');
    const d=decodeBusiness(parser,row.method,b);
    if(d.status!==g.officialStatus || sha(JSON.stringify(d.data??null))!==g.officialResultHash)throw new Error('Golden official observation changed.');
    const w=schemaWire(b,resolveBusiness(parser,row.method));
    if(sha(JSON.stringify(w.root))!==g.rootWireHash)throw new Error('Golden wire structure changed.');
    const old=oldRows.get(g.seq);
    if(!old||old.line!==g.parsedLine||sha(JSON.stringify(old.o.parsed||{}))!==g.oldResultHash)throw new Error('Golden old output changed.');
    if(g.jsonLeafHash && sha(await read(old.o.json_file))!==g.jsonLeafHash)throw new Error('Golden JSON leaf changed.');
    checked++;
  }
  console.log(JSON.stringify({mode,checked,failures:0,sampleModified:false}));process.exit(0);
}
const metaNames=['session.json','raw_proto_index.jsonl','parsed.jsonl'];
const metaBefore={};for(const n of metaNames){const b=await read(n),s=await fs.stat(path.join(root,n));metaBefore[n]={bytes:b.length,sha256:sha(b),mtimeMs:s.mtimeMs};}
const protoFiles=await inventory('proto'),jsonFiles=await inventory('json');
const protoByPath=new Map(protoFiles.map(f=>[f.relative,f])),jsonByPath=new Map(jsonFiles.map(f=>[f.relative,f]));
const session=parse((await read('session.json')).toString('utf8'));
const report={sampleAlias:'M0-R01',auditVersion:'1',selectedRootHash:sha(root),inputKind:'real archived business payloads; transport/capture provenance unverified',parserReferenceCommit:'e9e6cec4a2076dc5aacf94a0ca85ede33274544c',parserTypes:parser.types.size,
  session:{archiveFormat:session.archive?.format,rawProtoEnabled:session.archive?.rawProtoEnabled,createdAtUTC:new Date(session.createdAt).toISOString(),captureSource:'unknown',collectorVersion:'unknown',oldDictionaryVersion:'unknown',metadataKeys:Object.keys(session)},
  inventory:{proto:{files:protoFiles.length,bytes:protoFiles.reduce((n,f)=>n+f.bytes,0)},json:{files:jsonFiles.length,bytes:jsonFiles.reduce((n,f)=>n+f.bytes,0)},metadata:metaBefore},index:indexStats,
  consistency:{parsedRows:0,missingIndex:0,indexMismatch:0,indexMismatchByField:{},indexParsedTimestampDeltaMs:{},missingProto:0,missingJson:0,jsonLeafMismatch:0,parsedRawRefMismatch:0,rawMethodMismatch:0,rawMsgIdMismatch:0,rawIdStringifiedFloatMatchesIndex:0,oldCommonIdPresent:0,oldCommonIdMatchesRaw:0,rawRoomVsSessionMismatch:0,wireInvalid:0,zeroBytes:0,orphanProto:0,orphanJson:0},methods:{},keywordCandidates:[],numericMappingComparisons:{},userIdExtension:{present:0,matchesNativeNumericId:0,nativeStringIdEmpty:0},gift:{rows:0,repeatEnd:{},repeatCount:{},groups:0,groupsWithMultipleRows:0,groupsWithEnding:0,groupsWithBackwardCounts:0,groupsWithSameCount:0,groupsWithoutPositiveId:0,endHigherThanPrior:0,endFirst:0},control:[],golden:[],comparisonCaveats:['Only aliases with normalized key names are paired. Unmatched names are candidates, not proven wrong.','Official defaults may lack on-wire presence; consult numeric wire paths.','Original dictionary source/version not in selected directory.','No full transport frames, gzip, HTTP lifecycle or durable recorder proof.']};
const mappings={
  WebcastRoomStatsMessage:[['fanTicketCount','display_short',2],['giftDiamondCount','display_middle',3],['enterCount','display_long',4],['followCount','display_value',5]],
  WebcastGiftMessage:[['eventTime','trace_id',35],['roomId','send_time',33],['itemType','client_gift_source',30]],
  WebcastControlMessage:[['status','action',2]],
};
const usedProto=new Set(),usedJson=new Set(),giftGroups=new Map(),selected=new Map(),selectReasons=new Map(),specialClasses=new Set(),giftCountsSelected=new Set();let minTs=Infinity,maxTs=0;
const select=(o,why)=>{if(!selected.has(o.seq)&&selected.size<90)selected.set(o.seq,o);if(!selectReasons.has(o.seq))selectReasons.set(o.seq,new Set());selectReasons.get(o.seq).add(why);};
let parsedLine=0;
for await(const [line,o]of lines('parsed.jsonl')) {
  parsedLine++; report.consistency.parsedRows++;const row=indexes.get(Number(o.seq)),m=o.method,old=o.parsed||{};
  if(!row){report.consistency.missingIndex++;continue;}
  if(row.method!==m||row.msg_id!==integer(o.msg_id)||row.ts!==o.ts)report.consistency.indexMismatch++;
  for(const key of ['method','msg_id','ts'])if((key==='msg_id'?row.msg_id:row[key])!==(key==='msg_id'?integer(o[key]):o[key]))inc(report.consistency.indexMismatchByField,key);
  inc(report.consistency.indexParsedTimestampDeltaMs,String(row.ts-o.ts));
  if(row.file!==o.rawproto_file)report.consistency.parsedRawRefMismatch++;
  const rawRef=String(row.file).replaceAll('\\','/'),jsonRef=String(o.json_file||'').replaceAll('\\','/');
  usedProto.add(rawRef);usedJson.add(jsonRef);
  if(!protoByPath.has(rawRef)){report.consistency.missingProto++;continue;}
  if(!jsonByPath.has(jsonRef)){report.consistency.missingJson++;continue;}
  const leaf=parse((await read(jsonRef)).toString('utf8'));
  const comparable={...o};delete comparable.json_file;
  if(JSON.stringify(leaf)!==JSON.stringify(comparable))report.consistency.jsonLeafMismatch++;
  const b=await read(rawRef);if(!b.length)report.consistency.zeroBytes++;
  const t=resolveBusiness(parser,m),official=decodeBusiness(parser,m,b);
  if(!report.methods[m])report.methods[m]={rows:0,official:{},old:{},rawCommonPresent:0,wireUnknown:{},wireConflicts:{},wireObserved:{},aliases:{},valueConflictCandidates:{},oldOnlyCandidates:{},officialOnlyNonDefaultCandidates:{}};
  const stats=report.methods[m];stats.rows++;inc(stats.official,official.status);const oldStatus=old._error?'error':old._unknown?'unknown':'decoded';inc(stats.old,oldStatus);
  let w,ids;
  try {w=schemaWire(b,t);ids=businessIds(b);if(ids.method)stats.rawCommonPresent++;if(ids.method&&ids.method!==m)report.consistency.rawMethodMismatch++;if(ids.msgId&&ids.msgId!==row.msg_id)report.consistency.rawMsgIdMismatch++;if(ids.roomId&&String(session.roomId)!==ids.roomId)report.consistency.rawRoomVsSessionMismatch++;}
  catch {report.consistency.wireInvalid++;w={unknown:{},conflicts:{},observed:{},root:[]};ids={};}
  if(ids.msgId && String(Number(ids.msgId))===row.msg_id)report.consistency.rawIdStringifiedFloatMatchesIndex++;
  if(old.common?.msgId!=null && ids.msgId){report.consistency.oldCommonIdPresent++;if(integer(old.common.msgId)===ids.msgId)report.consistency.oldCommonIdMatchesRaw++;}
  if(old.user?.idStr!=null && official.data?.user){report.userIdExtension.present++;if(integer(old.user.idStr)===integer(official.data.user.id))report.userIdExtension.matchesNativeNumericId++;if(!official.data.user.id_str)report.userIdExtension.nativeStringIdEmpty++;}
  for(const [oldKey,currentKey,number]of mappings[m]||[])if(old[oldKey]!=null && official.data?.[currentKey]!=null){const key=m+':'+oldKey+' -> field'+number+':'+currentKey;if(!report.numericMappingComparisons[key])report.numericMappingComparisons[key]={observations:0,equal:0,oldTypes:{},nativeTypes:{}};const c=report.numericMappingComparisons[key];c.observations++;inc(c.oldTypes,typeof old[oldKey]);inc(c.nativeTypes,typeof official.data[currentKey]);if(String(old[oldKey])===String(official.data[currentKey]))c.equal++;}
  if(old.common?.priorityScore!=null && official.data?.common){const rawCommon=wire(b).find(f=>f.number===1&&f.wire===2),rawFields=rawCommon?wire(rawCommon.data):[];for(const num of [10,11]){const value=rawFields.find(f=>f.number===num&&f.wire===0)?.value;const key='Common:old.priorityScore -> field'+num;if(!report.numericMappingComparisons[key])report.numericMappingComparisons[key]={observations:0,equal:0};const c=report.numericMappingComparisons[key];c.observations++;if(value!=null && integer(old.common.priorityScore)===value.toString())c.equal++;}}
  for(const [k,n]of Object.entries(w.unknown))inc(stats.wireUnknown,k,n);
  for(const [k,n]of Object.entries(w.conflicts))inc(stats.wireConflicts,k,n);
  for(const [k,n]of Object.entries(w.observed))inc(stats.wireObserved,k,n);
  if(official.data && oldStatus==='decoded') {
    const c=compareAliases(old,official.data);
    for(const [k,n]of Object.entries(c.aliases))inc(stats.aliases,k,n);
    for(const [k,n]of Object.entries(c.conflicts))inc(stats.valueConflictCandidates,k,n);
    for(const [k,n]of Object.entries(c.oldOnly))inc(stats.oldOnlyCandidates,k,n);
    for(const [k,n]of Object.entries(c.officialOnly))inc(stats.officialOnlyNonDefaultCandidates,k,n);
  }
  minTs=Math.min(minTs,o.ts);maxTs=Math.max(maxTs,o.ts);
  const feature={seq:Number(o.seq),indexLine:row.line,parsedLine:line,method:m,rawSha256:sha(b),jsonLeafHash:jsonByPath.get(jsonRef)?.sha256,payloadBytes:b.length,officialStatus:official.status,officialResultHash:sha(JSON.stringify(official.data??null)),oldStatus,oldResultHash:sha(JSON.stringify(old)),rootWireHash:sha(JSON.stringify(w.root)),rootWire:w.root,keywordPathsOld:keywordPaths(old),keywordPathsOfficial:keywordPaths(official.data)};
  if(stats.rows===1)select(feature,'method-first');
  if(oldStatus!=='decoded'&&!specialClasses.has(m+'|old-'+oldStatus)){select(feature,'old-'+oldStatus);specialClasses.add(m+'|old-'+oldStatus);}
  if(official.status!=='decoded'&&!specialClasses.has(m+'|official-'+official.status)){select(feature,'official-'+official.status);specialClasses.add(m+'|official-'+official.status);}
  if(feature.keywordPathsOld.length||feature.keywordPathsOfficial.length){const display=official.data?.common?.display_text;report.keywordCandidates.push({seq:feature.seq,method:m,old:feature.keywordPathsOld,official:feature.keywordPathsOfficial,templateActions:['开通','加入','成为','续费'].filter(x=>display?.default_pattern?.includes(x)),hasTemplatePlaceholder:/[{}%<>]/.test(display?.default_pattern||''),displayTextKey:/^[A-Za-z_0-9.-]{1,120}$/.test(display?.key||'')?display.key:'redacted-or-empty'});select(feature,'membership-keyword');}
  if(m==='WebcastFansclubMessage' && old.displayText && official.data){const key='Fansclub:old.displayText.defaultPattern comparisons';if(!report.numericMappingComparisons[key])report.numericMappingComparisons[key]={observations:0,commonTemplateEqual:0,rootContentEqual:0,userNicknameEqual:0};const c=report.numericMappingComparisons[key];c.observations++;if(old.displayText.defaultPattern===official.data.common?.display_text?.default_pattern)c.commonTemplateEqual++;if(old.displayText.defaultPattern===official.data.content)c.rootContentEqual++;if(old.displayText.defaultPattern===official.data.user?.nickname)c.userNicknameEqual++;}
  if(m==='WebcastControlMessage'){report.control.push({seq:feature.seq,oldStatus:old.status??null,officialAction:official.data?.action??null,rawField2:wire(b).find(f=>f.number===2&&f.wire===0)?.value?.toString()??null});select(feature,'control');}
  if(m==='WebcastGiftMessage') {
    const p=official.data||old;report.gift.rows++;const count=Number(p.repeat_count??p.repeatCount??0),end=Number(p.repeat_end??p.repeatEnd??0),group=String(p.group_id??p.groupId??'0');
    inc(report.gift.repeatEnd,String(end));inc(report.gift.repeatCount,String(count));
    const key=[ids.roomId,p.gift_id??p.giftId,group,p.user?.id??p.user?.Id].join('|');
    if(!giftGroups.has(key))giftGroups.set(key,[]);giftGroups.get(key).push({seq:feature.seq,count,end,group,feature});
    if(count>1 && !giftCountsSelected.has(count)){select(feature,'gift-repeat');giftCountsSelected.add(count);}
  }
}
for(const group of giftGroups.values()) {
  report.gift.groups++;if(group.length>1)report.gift.groupsWithMultipleRows++;if(group.some(g=>g.end===1))report.gift.groupsWithEnding++;
  if(group.some((g,i)=>i&&g.count<group[i-1].count))report.gift.groupsWithBackwardCounts++;
  if(group.some((g,i)=>i&&g.count===group[i-1].count))report.gift.groupsWithSameCount++;
  if(group[0].group==='0')report.gift.groupsWithoutPositiveId++;
  for(let i=0;i<group.length;i++)if(group[i].end===1){if(i===0){report.gift.endFirst++;if(!specialClasses.has('gift-end-first')){select(group[i].feature,'gift-end-first');specialClasses.add('gift-end-first');}}else if(group[i].count>group[i-1].count){report.gift.endHigherThanPrior++;if(!specialClasses.has('gift-end-higher')){select(group[i-1].feature,'gift-end-prior');select(group[i].feature,'gift-end-higher');specialClasses.add('gift-end-higher');}}}
}
report.consistency.orphanProto=protoFiles.filter(f=>!usedProto.has(f.relative)).length;
report.consistency.orphanJson=jsonFiles.filter(f=>!usedJson.has(f.relative)).length;
report.observedRangeUTC=[new Date(minTs).toISOString(),new Date(maxTs).toISOString()];
report.golden=[...selected.values()].sort((a,b)=>a.seq-b.seq).map((g,i)=>({id:'G'+String(i+1).padStart(3,'0'),...g,reasons:[...selectReasons.get(g.seq)]}));
// Metadata and content hashes are checked again, without writing the source.
const afterProto=await inventory('proto'),afterJson=await inventory('json');
report.integrity={protoFilesUnchanged:JSON.stringify(protoFiles)===JSON.stringify(afterProto),jsonFilesUnchanged:JSON.stringify(jsonFiles)===JSON.stringify(afterJson),metadataUnchanged:true,manifestSHA256:sha(JSON.stringify({protoFiles,jsonFiles,metaBefore}))};
for(const n of metaNames)if(sha(await read(n))!==metaBefore[n].sha256)report.integrity.metadataUnchanged=false;
if(!report.integrity.protoFilesUnchanged||!report.integrity.jsonFilesUnchanged||!report.integrity.metadataUnchanged)throw new Error('Selected input changed during audit.');
report.parserProvenance=[];
for(const item of parse(await fs.readFile(path.join(parserArg,'src/vendor/provenance.json'),'utf8'))) {
  const actual=sha(await fs.readFile(path.join(parserArg,'src/vendor',item.file)));if(actual!==item.sha256)throw new Error('Parser vendor hash mismatch.');report.parserProvenance.push({file:item.file,sha256:actual,capturedAt:item.captured_at});
}
await fs.mkdir(path.dirname(output),{recursive:true});
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sampleAlias:report.sampleAlias,index:report.index,consistency:report.consistency,methods:Object.fromEntries(Object.entries(report.methods).map(([m,s])=>[m,{rows:s.rows,official:s.official,old:s.old,unknownWirePaths:Object.keys(s.wireUnknown).length,wireConflictPaths:Object.keys(s.wireConflicts).length,valueConflictPaths:Object.keys(s.valueConflictCandidates).length}])),keywordCandidates:report.keywordCandidates,gift:report.gift,control:report.control,integrity:report.integrity,goldenCount:report.golden.length}));
