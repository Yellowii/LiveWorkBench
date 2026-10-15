// First-party loader lifecycle adapter. Pinned upstream and official decoders stay unchanged.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
const sourceHash='006757a1491821de2245a74658868ba41f1ca26852374f5daa6cd14784b2119c';
let prepared;
async function prepare(){
 const original=new URL('./parser.js',import.meta.url),bytes=await fs.readFile(original);
 if(createHash('sha256').update(bytes).digest('hex')!==sourceHash)throw Error('PARSER_LOADER_VERSION_UNSUPPORTED');
 let source=bytes.toString('utf8').replaceAll('\r\n','\n');
 const boundary='  root.resolveAll();\n  return { root, types, enums, sources, missingFields, scalar };';
 if(source.split(boundary).length!==2)throw Error('PARSER_LOADER_BOUNDARY_CHANGED');
 source=source.replace(boundary,'  sandbox.__capture = table => table;\n  captures.length = 0;\n'+boundary);
 source=source.replace('from "./paths.js"','from '+JSON.stringify(new URL('./paths.js',import.meta.url).href));
 const directory=new URL('../../.local/parser-loader-v1/',import.meta.url);await fs.mkdir(directory,{recursive:true});
 const hash=createHash('sha256').update(source).digest('hex'),file=path.join(fileURLToPath(directory),hash+'.mjs');
 try{await fs.writeFile(file,source,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;if(createHash('sha256').update(await fs.readFile(file)).digest('hex')!==hash)throw Error('PARSER_LOADER_CACHE_CHANGED');}
 return import(pathToFileURL(file).href);
}
export async function loadBoundedParser(...args){prepared??=prepare().catch(e=>{prepared=null;throw e;});return (await prepared).loadParser(...args);}
