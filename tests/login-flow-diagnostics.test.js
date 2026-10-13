import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {LoginLoadDiagnostics} from '../src/auth/login-load-diagnostics.js';

test('QR flow diagnostics locate polling and exchange failures without exposing credentials or authenticating',async()=>{
 const context=new EventEmitter(),reports=[],d=new LoginLoadDiagnostics(context,x=>reports.push(x));
 const req=(path,errorText='')=>({url:()=> 'https://sso.douyin.com'+path+'?token=SYNTHETIC_PRIVATE',resourceType:()=> 'xhr',failure:()=>({errorText})});
 const create=req('/passport/web/get_qrcode/'),poll=req('/passport/web/check_qrconnect/'),callback=req('/passport/web/synthetic_exchange/');
 const response=(request,body,status=200)=>({request:()=>request,status:()=>status,text:async()=>JSON.stringify(body)});
 for(const request of [create,poll,callback])context.emit('request',request);
 context.emit('response',response(create,{message:'success',data:{error_code:0,token:'SYNTHETIC_PRIVATE',qrcode:'SYNTHETIC_PRIVATE'}}));
 context.emit('response',response(poll,{message:'success',data:{status:'scanned',error_code:0,user:{nickname:'SYNTHETIC_PRIVATE'}}}));
 context.emit('requestfailed',callback);await new Promise(resolve=>setImmediate(resolve));
 let report=d.snapshot();assert.equal(report.loginFlow.find(x=>x.phase==='qr-poll').last.pollStatus,'scanned');assert.equal(report.loginFlow.find(x=>x.phase==='passport-other').failed,1);
 context.emit('response',response(poll,{message:'error',data:{error_code:1001,description:'SYNTHETIC_PRIVATE'}}));await new Promise(resolve=>setImmediate(resolve));
 report=d.snapshot();assert.equal(report.loginFlow.find(x=>x.phase==='qr-poll').last.errorCode,1001);assert.equal(report.loginFlow.find(x=>x.phase==='qr-poll').last.reasonCode,'AUTH_FLOW_OFFICIAL_REJECTED');
 context.emit('response',response(poll,{data:{status:'SYNTHETIC_PRIVATE'}}));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(d.snapshot().loginFlow.find(x=>x.phase==='qr-poll').last.pollStatus,'unrecognized');
 assert.doesNotMatch(JSON.stringify(d.snapshot())+JSON.stringify(reports),/SYNTHETIC|token|qrcode|nickname|AUTHENTICATED/);
 d.close();
});

test('flow body arriving after close is ignored; arbitrary domains cannot create official flow evidence',async()=>{
 const context=new EventEmitter(),d=new LoginLoadDiagnostics(context);let finish;
 const request={url:()=> 'https://sso.douyin.com/passport/web/check_qrconnect/',resourceType:()=> 'xhr'};
 context.emit('response',{request:()=>request,status:()=>200,text:()=>new Promise(resolve=>finish=resolve)});
 d.close();const before=d.snapshot();finish('{"message":"success","data":{"status":"confirmed"}}');await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(d.snapshot(),before);
 const second=new LoginLoadDiagnostics(context);context.emit('response',{request:()=>({...request,url:()=> 'https://sso.douyin.com.evil.invalid/passport/web/check_qrconnect/'}),status:()=>200,text:async()=>'{"message":"success"}'});await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(second.snapshot().loginFlow,[]);second.close();
});
