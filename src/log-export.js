import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export class LogExports {
 constructor(runtime,project){this.runtime=runtime;this.project=project;this.root=path.join(runtime.dataDir,'log-exports');}
 async create(filters={}){
  const page=this.runtime.store.logPage({...filters,limit:10000,cursor:null}),exportId=randomUUID(),file=path.join(this.root,exportId+'.jsonl');
  const text=page.items.map(item=>JSON.stringify(this.project(item))).join('\n')+'\n';
  await fs.mkdir(this.root,{recursive:true});await fs.writeFile(file,text,{flag:'wx',mode:0o600});
  const meta={exportId,file,rows:page.items.length,truncated:page.hasMore,expiresAt:new Date(Date.now()+900000).toISOString()};
  this.runtime.store.setState('log-export:'+exportId,meta);return {exportId,rows:meta.rows,truncated:meta.truncated,expiresAt:meta.expiresAt};
 }
 async read(id){const meta=this.runtime.store.getState('log-export:'+id);if(!meta||Date.parse(meta.expiresAt)<Date.now())throw new Error('RESOURCE_NOT_FOUND');if(path.dirname(meta.file)!==this.root)throw new Error('RESOURCE_NOT_FOUND');return fs.readFile(meta.file);}
}
