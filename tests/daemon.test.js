import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
let LiveHookDaemon;try{({LiveHookDaemon}=await import('../src/live-hook-daemon.js'));}catch{}
const setup=()=>{assert.ok(LiveHookDaemon,'Daemon must expose read-only process/order observations');const runtime=new EventEmitter();runtime.log=()=>{};runtime.interruptCapture=()=>{runtime.interruptions=(runtime.interruptions||0)+1;};const bridge={status:{proxyBound:false,hookReady:false}};return {runtime,bridge,daemon:new LiveHookDaemon(runtime,bridge)};};
test('daemon detects companion-first and clears restart hint only after a new process instance',()=>{
  const {daemon,bridge}=setup();
  daemon.observe({observedAt:'2026-10-12T01:00:01Z',processes:[{pid:1,startedAt:'2026-10-12T01:00:00Z',hasMainWindow:true}]});
  assert.equal(daemon.status.restartRequired,true);assert.equal(daemon.status.hookReady,false);
  bridge.status={proxyBound:true,proxyReadyAt:'2026-10-12T01:00:02Z',hookReady:false};daemon.refresh();assert.equal(daemon.status.state,'RESTART_REQUIRED');
  daemon.observe({observedAt:'2026-10-12T01:00:04Z',processes:[{pid:1,startedAt:'2026-10-12T01:00:03Z',hasMainWindow:true}]});
  assert.equal(daemon.status.restartRequired,false);assert.equal(daemon.status.state,'AWAITING_ROUTE_PROBE');assert.equal(daemon.status.hookReady,false);
});

test('daemon keeps unknown process birth or missing proxy readiness conservative',()=>{
  const {daemon,bridge}=setup();bridge.status={proxyBound:true};
  daemon.observe({observedAt:'2026-10-12T01:00:04Z',processes:[{pid:3,startedAt:null}]});
  assert.equal(daemon.status.restartRequired,true);assert.equal(daemon.status.hookReady,false);
});
test('daemon process exit interrupts capture once without manufacturing a live-ended event',()=>{
  const {daemon,runtime,bridge}=setup();const events=[];runtime.on('events.appended',e=>events.push(e));
  bridge.status={proxyBound:true,proxyReadyAt:'2026-10-12T01:00:00Z',hookReady:false};
  daemon.observe({observedAt:'2026-10-12T01:00:02Z',processes:[{pid:2,startedAt:'2026-10-12T01:00:01Z'}]});
  daemon.observe({observedAt:'2026-10-12T01:00:03Z',processes:[]});daemon.observe({observedAt:'2026-10-12T01:00:04Z',processes:[]});
  assert.equal(runtime.interruptions,1);assert.equal(events.length,0);assert.equal(daemon.status.state,'WAITING_COMPANION');
});

test('observer failure cannot be revived by a capture update using stale process data',()=>{
  const {daemon,runtime,bridge}=setup();daemon.observe({observedAt:'2026-10-12T01:00:01Z',processes:[]});
  daemon.observationFailed();bridge.status={proxyBound:true,proxyReadyAt:'2026-10-12T01:00:02Z'};runtime.emit('capture.updated',bridge.status);
  assert.equal(daemon.status.available,false);assert.equal(daemon.status.companionRunning,null);assert.equal(daemon.status.state,'UNKNOWN');
});

test('companion exit cannot interrupt the manually selected WebSource',()=>{
 const {daemon,runtime}=setup();runtime.selectedSource='WebSource';
 daemon.observe({processes:[{pid:5,startedAt:'2026-10-12T01:00:01Z'}]});
 daemon.observe({processes:[]});assert.equal(runtime.interruptions||0,0);
});
