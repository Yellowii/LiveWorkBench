import fs from 'node:fs/promises';
import path from 'node:path';
import {createHmac,randomBytes} from 'node:crypto';

export async function publicProjection(dataDir,{allowPrivateDetails=false}={}){
  const file=path.join(dataDir,'privacy.key');let key;
  try {key=await fs.readFile(file);} catch(e){
    if(e.code!=='ENOENT')throw e;
    const candidate=randomBytes(32);
    try {await fs.writeFile(file,candidate,{flag:'wx',mode:0o600});key=candidate;}
    catch(error){if(error.code!=='EEXIST')throw error;key=await fs.readFile(file);}
  }
  if(key.length!==32)throw new Error('PRIVACY_KEY_INVALID');
  const pseudonym=(value,domain)=>`${domain}:${createHmac('sha256',key).update(`${domain}:${value}`).digest('hex').slice(0,32)}`;
  const project=(value,field='',native=false)=>{
    if(Array.isArray(value))return value.map(item=>project(item,field,native));
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value)
      .filter(([name])=>!/cookie|token|password|secret|credential|authorization|file_?path|payload_?base64|^key$|^identity$/i.test(name))
      .map(([name,item])=>[name,project(item,name,native||name==='official')]));
    if(typeof value==='string'&&(/^[A-Z]:[\\/]/i.test(value)||/^\\\\/.test(value)||/^https?:\/\//i.test(value)))return '[location]';
    if(value===null||value===undefined||allowPrivateDetails)return value;
    if(/^(?:content|text|nickname|nick_name|default_pattern|defaultPattern|display_name|displayName|description|signature)$/i.test(field)&&typeof value==='string')return '[text]';
    if(/^(?:web_?rid|room_?id|room_?id_?str|anchor_?uid|anchor_?id|user_?id|user_?uid|uid|sec_?uid|webcast_?uid|id_?str|id|unique_?id|display_?id|short_?id|msg_?id|index_?msg_?id|userIdAlias)$/i.test(field)){
      const domain=/room/i.test(field)?'room':/msg/i.test(field)?'message':'identity';
      return pseudonym(String(value),domain);
    }
    if(typeof value==='string'&&/^\d{15,}$/.test(value)&&!/time|seq|version/i.test(field))return pseudonym(value,'identifier');
    if(native&&typeof value==='string'&&!(/^(?:action|.*_count|.*_time|duration|status)$/i.test(field)&&/^-?\d+$/.test(value)))return '[value]';
    return value;
  };
  return {project,mode:allowPrivateDetails?'local-private':'redacted',version:'1'};
}
