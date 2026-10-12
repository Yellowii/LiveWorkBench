import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const lossless=line=>JSON.parse(line.replace(/^\uFEFF/,''),(_key,value,context)=>typeof value==='number'&&!Number.isSafeInteger(value)&&/^-?\d+$/.test(context?.source||'')?context.source:value);

export async function runHistorical(runtime,settings,{goldenOnly=false}={},operation){
  if(!settings.r01Root)throw new Error('R01_NOT_CONFIGURED');
  const root=await fs.realpath(settings.r01Root),fold=p=>process.platform==='win32'?p.toLowerCase():p;
  const safe=async relative=>{const requested=path.resolve(root,relative),real=await fs.realpath(requested);if(!fold(real).startsWith(fold(root+path.sep)))throw new Error('INPUT_PATH_ESCAPE');return real;};
  const golden=JSON.parse(await fs.readFile(path.resolve('docs/migration/evidence/M0-R01-audit.json'),'utf8')).golden;
  const expected=new Map(golden.map(g=>[g.seq,g]));
  const input=createInterface({input:createReadStream(await safe('raw_proto_index.jsonl'),{encoding:'utf8'}),crlfDelay:Infinity});
  const namespace=`replay:R01:${randomUUID()}`;let processed=0,checks=0,failures=0;
  try{
    for await(const line of input){
      if(operation.cancelled)break;if(!line.trim())continue;
      const row=lossless(line),g=expected.get(Number(row.seq));if(goldenOnly&&!g)continue;
      const file=await safe(row.file),bytes=await fs.readFile(file);
      if(g){const result=runtime.parser.decode({format:'business-payload',method:row.method,bytes})[0];checks++;if(sha(bytes)!==g.rawSha256||result.status!==g.officialStatus||sha(JSON.stringify(result.data??null))!==g.officialResultHash)failures++;}
      const raw=runtime.recorder.registerExisting({bytes,filePath:file,format:'business-payload',method:row.method,mode:'replay',runtimeNamespace:namespace,recordingId:namespace,sourceType:null,originalSequence:String(row.seq),indexMsgId:row.msg_id==null?null:String(row.msg_id)});
      runtime.metrics.historicalInputs=(runtime.metrics.historicalInputs||0)+1;
      await runtime.process(raw,bytes);processed++;
      if(processed%50===0){operation.processed=processed;operation.result={checks,failures,runtimeNamespace:namespace};runtime.emit('operation.updated',operation);await new Promise(resolve=>setImmediate(resolve));}
    }
  }finally{input.close();}
  operation.processed=processed;operation.result={inputFormat:'business-payload',source:'unknown',processed,checks,failures,runtimeNamespace:namespace};
  runtime.log('HISTORICAL_RUN_FINISHED',{operationId:operation.operationId,processed,checks,failures});return operation.result;
}
