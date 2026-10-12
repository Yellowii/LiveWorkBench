import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);

test('file-only CA verifies HTTPS and fragmented WSS through the owned proxy, RAW and official parser',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lw-tls-'));
 t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await run(process.env.LW_PYTHON||'python',['tools/create-livehook-test-certificates.py',path.join(dir,'certificates')]);
 const {probeTLS}=await import('../tools/livehook-tls-probe.mjs');
 const result=await probeTLS({directory:dir});
 assert.equal(result.httpsVerified,true);assert.equal(result.wssVerified,true);
 assert.equal(result.untrustedClientRejected,true);assert.equal(result.loopbackOnly,true);
 assert.equal(result.rawByteMatches,2);assert.equal(result.events,2);
 assert.equal(result.csharpTransport,2);assert.equal(result.sameSession,true);
 assert.equal(result.liveEvents,0);assert.equal(result.hookReady,false);
 assert.equal(result.proxyStopped,true);
});
test('local upstream certificate pins cannot be enabled in live mode',async()=>{
 const {CaptureBridge}=await import('../src/capture-bridge.js');
 const bridge=new CaptureBridge({});
 await assert.rejects(bridge.start({testUpstreamCertificate:'fixture.cer',mode:'live',certificatePath:'fixture.pfx'}),/TEST_MODE_REQUIRED/);
 await assert.rejects(bridge.start({testUpstreamCertificate:'fixture.cer',mode:'test',certificatePath:'fixture.pfx'}),/TEST_MODE_REQUIRED/);
});
