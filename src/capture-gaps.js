import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export class CaptureGaps {
 constructor(db,directory){this.db=db;this.file=path.join(directory,'capture-failures.jsonl');this.fallback=[];this.unavailable=0;db.exec('CREATE TABLE IF NOT EXISTS capture_gaps(seq INTEGER PRIMARY KEY AUTOINCREMENT,json TEXT)');}
 async record(input){
  const gap={gapId:randomUUID(),at:new Date().toISOString(),reason:/^[A-Z][A-Z0-9_]{1,63}$/.test(input.reason||'')?input.reason:'CAPTURE_FAILURE_UNCLASSIFIED',stage:input.stage||'capture',scope:input.scope||'input',recordingId:input.recordingId||input.captureId||null,rawId:input.rawId||null,sourceType:input.sourceType||null,sourceEpoch:input.sourceEpoch||null,sourceConnectionId:input.sourceConnectionId||null,captureInputSeq:input.captureInputSeq||null,size:input.size??null,contentHash:input.contentHash||null,rawPreserved:Boolean(input.rawId)};
  try{this.db.prepare('INSERT INTO capture_gaps(json) VALUES(?)').run(JSON.stringify(gap));return gap;}
  catch{try{const handle=await fs.open(this.file,'a');try{await handle.writeFile(JSON.stringify(gap)+'\n');await handle.sync();}finally{await handle.close();}this.fallback.push({...gap,persistence:'private-fallback-journal'});this.fallback=this.fallback.slice(-100);return gap;}catch{this.unavailable++;process.stderr.write('CAPTURE_GAP_JOURNAL_UNAVAILABLE\n');return {...gap,persistence:'unavailable'};}}
 }
 page({limit=100}={}){limit=Math.max(1,Math.min(200,Number(limit)||100));return {items:this.db.prepare('SELECT json FROM capture_gaps ORDER BY seq DESC LIMIT ?').all(limit).map(x=>JSON.parse(x.json)),fallbackEntries:this.fallback,unavailable:this.unavailable};}
}
