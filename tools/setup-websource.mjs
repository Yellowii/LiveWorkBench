import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {prepareParser} from './setup-parser.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceHash='d72a2440bc6b07ab6586e199a54917d109f30b826fc3f2268771a7342f87d865';
const args=process.argv.slice(2),at=args.indexOf('--source');
await prepareParser({sourceDir:at>=0?path.join(path.resolve(args[at+1]),'src'):path.join(root,'references/douyinprotobuf/protobuf-live/src'),targetDir:path.join(root,'src/parser'),manifest:[{file:'live.js',sha256:sourceHash}],download:args.includes('--fetch')});
let text=(await fs.readFile(path.join(root,'src/parser/live.js'),'utf8')).replaceAll('\r\n','\n');
function replaceOnce(before,after){if(text.split(before).length!==2)throw new Error('WEB_PATCH_SOURCE_CHANGED');text=text.replace(before,after);}
replaceOnce('      this.emit("raw", Buffer.from(bytes));','      const receivedAt = new Date().toISOString(), connectionAttempt = this.status.attempts;\n      this.emit("raw", Buffer.from(bytes));');
replaceOnce('        .then(async () => {\n          if (g !== this.generation) return;',`        .then(async () => {
          if (this.options.rawCommit) {
            try { await this.options.rawCommit(Buffer.from(bytes), g, receivedAt, connectionAttempt); }
            catch {
              this.generation++; this.ws?.terminate();
              this.update("blocked", { reason: "RAW_COMMIT_FAILED" });
              this.emit("failure", { stage: "raw", error: "RAW_COMMIT_FAILED" });
              return;
            }
          }
          if (g !== this.generation) return;`);
replaceOnce('            const packet = decodePacket(this.p, Buffer.from(bytes), {\n              modernAck: this.config.modern,\n            });',`            const packet = this.options.packetDecoder
              ? await this.options.packetDecoder({ modernAck: this.config.modern })
              : decodePacket(this.p, Buffer.from(bytes), { modernAck: this.config.modern });`);
replaceOnce('      const delay =\n        Math.max(', '      const delay = this.options.allowLocalTest && this.options.testRetryDelayMs\n        ? this.options.testRetryDelayMs : Math.max(');
const output=`// Local WebSource adaptation v4; upstream ${sourceHash}; official Parser unchanged.\n${text}`;
const target=path.join(root,'src/parser/live-raw-first-v4.js');
let existing;try{existing=await fs.readFile(target,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
if(existing&&existing!==output)throw new Error('WEB_ADAPTATION_CHANGED');
if(!existing)await fs.writeFile(target,output,{flag:'wx'});
console.log(JSON.stringify({sourceHash,patchVersion:'raw-first-v4',sha256:createHash('sha256').update(output).digest('hex')}));
