import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
export const decimalSequence=value=>{
 const text=String(value);if(!/^\d{1,19}$/.test(text)||BigInt(text)>9223372036854775807n)throw new Error('CURSOR_MISMATCH');return String(BigInt(text));
};
export class CursorCodec {
 constructor(dir){const file=path.join(dir,'cursor.key');try{this.key=fs.readFileSync(file);}catch(e){if(e.code!=='ENOENT')throw e;const key=randomBytes(32);try{fs.writeFileSync(file,key,{flag:'wx',mode:0o600});this.key=key;}catch(error){if(error.code!=='EEXIST')throw error;this.key=fs.readFileSync(file);}}if(this.key.length!==32)throw new Error('CURSOR_KEY_INVALID');}
 sign(text){return createHmac('sha256',this.key).update('cursor-v1:'+text).digest();}
 encode(data){const text=Buffer.from(JSON.stringify({version:1,...data,expiresAt:Date.now()+86400000})).toString('base64url');return text+'.'+this.sign(text).toString('base64url');}
 decode(cursor,filters){
  try{
   if(typeof cursor!=='string'||cursor.length>4096)throw new Error();const parts=cursor.split('.');if(parts.length!==2||parts.some(p=>!p||!/^[A-Za-z0-9_-]+$/.test(p)))throw new Error();
   const signature=Buffer.from(parts[1],'base64url'),expected=this.sign(parts[0]);if(signature.length!==expected.length||!timingSafeEqual(signature,expected))throw new Error();
   const value=JSON.parse(Buffer.from(parts[0],'base64url'));
   if(value.version!==1||JSON.stringify(value.filters)!==JSON.stringify(filters)||!Number.isSafeInteger(value.expiresAt))throw new Error();
   if(value.expiresAt<Date.now())throw new Error('CURSOR_EXPIRED');
   return {...value,before:decimalSequence(value.before),snapshot:decimalSequence(value.snapshot)};
  }catch(e){if(e.message==='CURSOR_EXPIRED')throw e;throw new Error('CURSOR_MISMATCH');}
 }
}
