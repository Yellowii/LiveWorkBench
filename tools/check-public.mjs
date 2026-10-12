import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
const files=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean))];
const prohibited=/(?:^|\/)(?:references|node_modules|data|artifacts|\.local|\.superpowers|sessions|raw|proto|__snapshots__)(?:\/|$)|^docs\/migration\/evidence\/|\.(?:bin|jsonl|sqlite(?:-wal|-shm)?|db|pfx|pem|key|p12|log|har|pcap)$/i;
const findings=[];
for(const rawName of files){
  const name=rawName.replaceAll('\\','/');
  if(prohibited.test(name)||/(?:^|\/)\.env(?:\.|$)/.test(name)&&!name.endsWith('.env.example')){findings.push({file:name,category:'private-artifact'});continue;}
  const bytes=await fs.readFile(rawName);
  if(['.ico','.png','.jpg'].includes(path.extname(name)))continue;
  const text=bytes.toString('utf8');
  const patterns=[['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['private-capture-path',/[A-Z]:[\\/]Proj[\\/]LiveMngSys[\\/]/i],['identity-url',/https?:\/\/[^\s"']+(?:sec_uid|access_token|auth_token|signature)=[A-Za-z0-9_%+-]{12,}/i],['credential',/(?:authorization|password|api_key|access_token|secret)\s*[=:]\s*["'][A-Za-z0-9_+/=-]{24,}["']/i]];
  for(const [category,regex] of patterns){const match=regex.exec(text);if(match)findings.push({file:name,category,line:text.slice(0,match.index).split('\n').length});}
}
console.log(JSON.stringify({files:files.length,findings},null,2));
if(findings.length)process.exitCode=1;
