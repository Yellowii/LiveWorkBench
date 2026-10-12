import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const commit='e9e6cec4a2076dc5aacf94a0ca85ede33274544c';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

export async function prepareParser({sourceDir,targetDir,manifest,download=false}){
  const prepared=[];
  for(const entry of manifest){
    if(path.isAbsolute(entry.file)||entry.file.split(/[\\/]/).includes('..'))throw new Error('PARSER_MANIFEST_PATH_INVALID');
    const file=path.join(targetDir,entry.file);
    let existing;try{const stat=await fs.lstat(file);if(stat.isSymbolicLink())throw new Error('PARSER_TARGET_CHANGED');existing=await fs.readFile(file);}catch(e){if(e.code!=='ENOENT')throw e;}
    if(existing){if(hash(existing)!==entry.sha256)throw new Error('PARSER_TARGET_CHANGED');continue;}
    let bytes;
    if(download){
      const response=await fetch(`https://raw.githubusercontent.com/Yellowii/douyinprotobuf/${commit}/protobuf-live/src/${entry.file}`,{signal:AbortSignal.timeout(30000)});
      if(!response.ok)throw new Error('PARSER_DOWNLOAD_FAILED');
      bytes=Buffer.from(await response.arrayBuffer());
    }else bytes=await fs.readFile(path.join(sourceDir,entry.file));
    if(hash(bytes)!==entry.sha256)throw new Error('PARSER_SOURCE_HASH_MISMATCH');
    prepared.push({file,bytes});
  }
  // Verify all sources first and never overwrite existing adaptations.
  for(const {file,bytes} of prepared){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes,{flag:'wx'});}
  return {verified:manifest.length,created:prepared.length,commit};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),download=args.includes('--fetch'),at=args.indexOf('--source');
  const sourceDir=at>=0?path.join(path.resolve(args[at+1]),'src'):path.join(root,'references/douyinprotobuf/protobuf-live/src');
  const records=JSON.parse(await fs.readFile(path.join(root,'src/parser/extraction.json'),'utf8'));
  const manifest=records.map(entry=>({file:entry.target.replaceAll('\\','/').replace(/^src\/parser\//,''),sha256:entry.sha256}));
  console.log(JSON.stringify(await prepareParser({sourceDir,targetDir:path.join(root,'src/parser'),manifest,download})));
}
