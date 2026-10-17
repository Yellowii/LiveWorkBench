import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {workspaceState} from './workspace-state.js';
export class InstanceLease{
 static acquire(directory){const db=new DatabaseSync(path.join(directory,'.instance.sqlite'));db.exec('PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS owner(id INTEGER PRIMARY KEY,pid INTEGER,token TEXT); BEGIN IMMEDIATE');
  const token=randomUUID();try{const old=db.prepare('SELECT * FROM owner WHERE id=1').get();if(old){let alive=true;try{process.kill(old.pid,0);}catch(e){alive=e.code!=='ESRCH';}if(alive)throw new Error('DATA_DIRECTORY_BUSY');}
   db.prepare('INSERT INTO owner VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET pid=excluded.pid,token=excluded.token').run(process.pid,token);db.exec('COMMIT');return new InstanceLease(db,token);
  }catch(error){db.exec('ROLLBACK');db.close();throw error;}
 }
 constructor(db,token){this.db=db;this.token=token;}
 release(){if(!this.db)return;this.db.prepare('DELETE FROM owner WHERE token=?').run(this.token);this.db.close();this.db=null;}
}
export function loadedInstance(){const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),digest=createHash('sha256');for(const file of ['src/instance.js','src/workspace-state.js','src/server.js','src/run-diagnostics.js','src/parser/load-bounded.js','src/messages/activities.js','src/messages/native-detail.js','src/messages/query.js','src/messages/message-view.js','src/messages/privacy.js','src/messages/dictionary.js','src/runtime.js','src/source-controller.js','src/coordinator/monitor-coordinator.js','src/web-source.js','src/capture/websource/native-parameters.js','src/capture/websource/native-signer.js','src/capture/websource/connection-resolver.js','src/capture/websource/http-room-discovery.js','src/auth/request-cookies.js','src/targets/safe-http.js','src/capture/browser/browser-source.js','src/capture/browser/live-stream-policy.js','src/replay-engine.js','src/raw-recorder.js','src/public-projection.js','src/auth/verify-saved.js','src/auth/display-info.js','src/monitor/douyin-adapter.js','src/auth/viewer-account.js','src/targets/resolver.js','src/auth/auth-profile-store.js','src/auth/login-manager.js','src/auth/login-browser-session.js','src/auth/login-resource-policy.js','src/auth/login-load-diagnostics.js','src/auth/login-account-evidence.js','src/auth/official-account-query.js','src/network/target-policy.js','src/profiles/profile-store.js'])digest.update(file).update(fs.readFileSync(path.join(root,file)));
 const {commit,dirty,runtimeDirty}=workspaceState(root);
 return {instanceId:randomUUID(),pid:process.pid,startedAt:new Date().toISOString(),commit,dirty,runtimeDirty,codeFingerprint:digest.digest('hex'),nodeVersion:process.version};
}
