import test from 'node:test';
import assert from 'node:assert/strict';
import {roomPresentation} from '../public/room-status.js';
const now=Date.parse('2026-10-16T12:00:00Z'),at=new Date(now-1000).toISOString();
const profile={profileId:'a',version:'2',name:'房间一',pollMs:60000,confirmations:2};
const evidence={profileId:'a',profileVersion:'2',checkedAt:at,queryState:'LIVE',confirmedState:'LIVE',confirmationCount:2,evidence:{source:'douyin-structured-room'}};
test('platform confirmation and committed RAW activity are separate, room scoped facts',()=>{
 const status={monitor:[evidence],coordinator:{active:{profileId:'a'}},capture:{captureState:'CONNECTED'},captureEvidence:{profileId:'a',received:3,lastMessageAt:at}};
 assert.equal(roomPresentation(profile,status,now).platform,'已开播');assert.match(roomPresentation(profile,status,now).flow,/有消息数据流/);
 assert.match(roomPresentation({...profile,profileId:'b'},status,now).flow,/未监听/);
 assert.match(roomPresentation(profile,{...status,capture:{captureState:'STOPPED'}},now).flow,/已停止/);
 assert.equal(roomPresentation(profile,{...status,monitor:[]},now).platform,'开播状态未知');
});
test('failed, stale, wrong version and incomplete checks never pretend to be current live evidence',()=>{
 for(const patch of [{queryState:'UNKNOWN'},{profileVersion:'1'},{checkedAt:new Date(now-121000).toISOString()},{checkedAt:new Date(now+10000).toISOString()}])assert.notEqual(roomPresentation(profile,{monitor:[{...evidence,...patch}]},now).platform,'已开播');
 assert.match(roomPresentation(profile,{monitor:[{...evidence,queryState:'ENDED',confirmationCount:1}]},now).platform,/待连续确认/);
 assert.equal(roomPresentation(profile,{monitor:[{...evidence,queryState:'ENDED',confirmedState:'ENDED'}]},now).platform,'已下播');
});
test('socket alone, old frames, future frames and other profile never imply flowing data',()=>{
 for(const captureEvidence of [{profileId:'a',received:0,lastMessageAt:at},{profileId:'a',received:2,lastMessageAt:new Date(now-31000).toISOString()},{profileId:'b',received:2,lastMessageAt:at},{profileId:'a',received:2,lastMessageAt:new Date(now+10000).toISOString()}])assert.doesNotMatch(roomPresentation(profile,{coordinator:{active:{profileId:'a'}},capture:{captureState:'CONNECTED'},captureEvidence},now).flow,/有消息数据流/);
});
