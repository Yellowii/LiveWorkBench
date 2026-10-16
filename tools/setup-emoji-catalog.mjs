// Import an explicitly chosen official response into private local display assets.
// Source stays read-only. No directory or image bytes are published to Git.
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {EmojiCatalog} from '../src/messages/emoji-catalog.js';
const args=process.argv.slice(2),get=name=>args[args.indexOf(name)+1];if(!args.includes('--source')||!args.includes('--sha256'))throw Error('Explicit --source and --sha256 required');
const bytes=await fs.readFile(get('--source')),hash=createHash('sha256').update(bytes).digest('hex');if(hash!==get('--sha256'))throw Error('SOURCE_HASH_MISMATCH');
const catalog=new EmojiCatalog();catalog.install(JSON.parse(bytes.toString('utf8')),{observedAt:args.includes('--observed-at')?get('--observed-at'):new Date().toISOString(),sourceSha256:hash});
const folder=new URL('../.local/message-assets/',import.meta.url);await fs.mkdir(folder,{recursive:true});await fs.writeFile(new URL('emoji-catalog.json',folder),JSON.stringify(catalog.snapshot()),{mode:0o600});console.log(JSON.stringify({...catalog.view(),sourceReadOnly:true,privateLocalOnly:true}));
