import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export class InstanceLease{
 static acquire(directory){const db=new DatabaseSync(path.join(directory,'.instance.sqlite'));db.exec('PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS owner(id INTEGER PRIMARY KEY,pid INTEGER,token TEXT); BEGIN IMMEDIATE');
  const token=randomUUID();try{const old=db.prepare('SELECT * FROM owner WHERE id=1').get();if(old){let alive=true;try{process.kill(old.pid,0);}catch(e){alive=e.code!=='ESRCH';}if(alive)throw new Error('DATA_DIRECTORY_BUSY');}
   db.prepare('INSERT INTO owner VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET pid=excluded.pid,token=excluded.token').run(process.pid,token);db.exec('COMMIT');return new InstanceLease(db,token);
  }catch(error){db.exec('ROLLBACK');db.close();throw error;}
 }
 constructor(db,token){this.db=db;this.token=token;}
 release(){if(!this.db)return;this.db.prepare('DELETE FROM owner WHERE token=?').run(this.token);this.db.close();this.db=null;}
}
export function loadedInstance(){const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),digest=createHash('sha256');for(const file of ['src/server.js','src/runtime.js','src/source-controller.js','src/coordinator/monitor-coordinator.js','src/capture/browser/browser-source.js','src/replay-engine.js','src/raw-recorder.js'])digest.update(file).update(fs.readFileSync(path.join(root,file)));
 let commit=null,dirty=null;try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,windowsHide:true,stdio:['ignore','pipe','ignore']}).toString().trim();dirty=Boolean(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,windowsHide:true,stdio:['ignore','pipe','ignore']}).toString().trim());}catch{}
 return {instanceId:randomUUID(),pid:process.pid,startedAt:new Date().toISOString(),commit,dirty,codeFingerprint:digest.digest('hex'),nodeVersion:process.version};
}
