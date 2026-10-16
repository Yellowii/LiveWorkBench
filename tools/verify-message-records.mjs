// Read-only, bounded sample of existing real events. No text/identity/URLs in the report.
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {messageView,mappingVersion} from '../src/messages/message-view.js';
import {messageFields} from '../src/messages/dictionary.js';
import {localOfficial} from '../src/messages/privacy.js';
import {OfficialParser} from '../src/parser/index.js';
const file=process.argv[2];if(!file)throw Error('Provide explicitly authorized existing workbench.sqlite');
const db=new DatabaseSync(path.resolve(file),{readOnly:true}),parser=await OfficialParser.open(),report={mappingVersion,readOnly:true,synthetic:false,coverage:[],absent:[],total:0,failures:0,sourceClaim:'existing live records; not new platform capture or full business validation'};
try{
 for(const method of ['ChatMessage','EmojiChatMessage','ScreenChatMessage','PrivilegeScreenChatMessage','GiftMessage','LikeMessage','MemberMessage','AdminPrivilegeMessage','LuckyBoxMessage','LuckyBoxTempStatusMessage','LuckyBoxEndMessage','LotteryEventNewMessage','LotteryCandidateEventMessage','LotteryDrawResultEventMessage','ShortTouchAreaMessage','GroupLiveContainerChangeMessage']){
  const records=db.prepare('SELECT id,json FROM events WHERE mode=? AND method=? ORDER BY seq DESC LIMIT 12').all('live','Webcast'+method);
  if(!records.length){report.absent.push(method);continue;}const summary={method,samples:records.length,readable:0,fallback:0,failed:0,unknownFields:0,hasRaw:0};
  for(const row of records){const e=JSON.parse(row.json),v=messageView(e),schema=messageFields(parser.native,e.eventType,localOfficial(e.payload?.official));summary[v.mappingStatus==='failed'?'failed':v.mappingStatus==='fallback'?'fallback':'readable']++;summary.unknownFields+=schema.fields.filter(f=>f.number===null).length;if(v.rawRefs.length)summary.hasRaw++;assert.equal(JSON.stringify(e),row.json);assert.equal(db.prepare('SELECT json FROM events WHERE id=?').get(row.id).json,row.json);}
  report.coverage.push(summary);report.total+=records.length;report.failures+=summary.failed;
 }
 assert.ok(report.total>0,'No authorized real records found');assert.equal(report.failures,0);
 await fs.mkdir('artifacts/messages',{recursive:true});await fs.writeFile('artifacts/messages/real-records-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{db.close();}
