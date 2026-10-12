import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {prepareParser} from './setup-parser.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2);
const manifest=[{file:'browser.js',sha256:'ccf20ef9a555753985a6dcc1001024c2e18f7d0594495ac0099c1ccf60f3ac50'},{file:'account.js',sha256:'b4dcadbba8479759de702bc4b3a5145378b8ad3ec9fb17786c7770357eae4c79'},{file:'login-config.js',sha256:'4f5c6da6ba86026e931a064754a682231f7e9ba19cb8772aae6a106dcf31f77e'},{file:'paths.js',sha256:'3b4b2da3573598eef951a2d9ac73be5f0f9b4adef2845962c345180d0529bfab'}];
const vendor=path.join(root,'src/parser/browser-vendor');
await prepareParser({sourceDir:path.join(root,'references/douyinprotobuf/protobuf-live/src'),targetDir:vendor,manifest,download:args.includes('--fetch')});
let text=(await fs.readFile(path.join(vendor,'browser.js'),'utf8')).replaceAll('\r\n','\n');
function replaceOnce(before,after){if(text.split(before).length!==2)throw new Error('BROWSER_PATCH_SOURCE_CHANGED');text=text.replace(before,after);}
replaceOnce('from "./decode.js"','from "../decode.js"');
replaceOnce('  constructor(p) {','  constructor(p, options = {}) {');replaceOnce('    this.p = p;','    this.p = p;\n    this.options = options;\n    this.connectionSeq = 0;');
replaceOnce('      if (g !== this.generation) {','      await this.options.prepareContext?.(context);\n      if (g !== this.generation) {');
replaceOnce('          !url.hostname.endsWith(".douyin.com") ||','          (this.options.acceptConnection && !this.options.acceptConnection(url)) ||\n          !url.hostname.endsWith(".douyin.com") ||');
replaceOnce('          !url.hostname.endsWith(".douyin.com") ||','          !(url.hostname.endsWith(".douyin.com") || (this.options.allowLocalTest && url.protocol === "ws:" && url.hostname === "127.0.0.1")) ||');
replaceOnce('        this.update("connected", {','        const connection = String(++this.connectionSeq);\n        this.update("connected", {');
replaceOnce('          this.emit("raw", Buffer.from(event.payload));','          const receivedAt = new Date().toISOString();\n          this.emit("raw", Buffer.from(event.payload));');
replaceOnce('            .then(() => {\n              if (g !== this.generation) return;', '            .then(async () => {');
replaceOnce('                const packet = decodePacket(this.p, event.payload);',`                const packet = await this.options.rawCommit(Buffer.from(event.payload), receivedAt, connection);`);
replaceOnce('            this.emit("failure", {\n              stage: "browser-queue",','            this.options.captureRejected?.(Buffer.from(event.payload));\n            this.emit("failure", {\n              stage: "browser-queue",');
replaceOnce('                  stage: "browser-decode",','                  stage: "browser-pipeline",');
replaceOnce('        this.update("connected", {','        this.update("connecting", {');
replaceOnce('        clearTimeout(this.wait);','        // Connection creation alone does not prove usable captured traffic.');
replaceOnce('                packet.received_at = new Date().toISOString();','                clearTimeout(this.wait);\n                if (this.status.state !== "connected") this.update("connected");\n                packet.received_at = new Date().toISOString();');
replaceOnce('          if (g === this.generation)\n            this.update("waiting", {','          if (g === this.generation && this.options.autoReconnect === false) { void this.stop(); return; }\n          if (g === this.generation)\n            this.update("waiting", {');
const output='// Local browser RAW adaptation v4; fixed upstream e9e6cec; SDK ACK remains outside recorder control.\n'+text,target=path.join(vendor,'browser-raw-first-v4.js');let existing;try{existing=await fs.readFile(target,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
if(existing&&existing!==output)throw new Error('BROWSER_ADAPTATION_CHANGED');if(!existing)await fs.writeFile(target,output,{flag:'wx'});
console.log(JSON.stringify({verified:manifest.length,patchVersion:'browser-raw-first-v4',sha256:createHash('sha256').update(output).digest('hex')}));
