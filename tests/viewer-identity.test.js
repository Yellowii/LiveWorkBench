import test from 'node:test';
import assert from 'node:assert/strict';
import {displayAvatar} from '../src/auth/display-info.js';
import {AuthProfileStore} from '../src/auth/auth-profile-store.js';
import {LoginManager} from '../src/auth/login-manager.js';
const at=new Date().toISOString();
test('saved identity survives manager reload without asserting current authentication; recheck and clear are distinct',async()=>{
 const states=new Map(),accounts=new AuthProfileStore({getState:k=>states.get(k),setState:(k,v)=>states.set(k,structuredClone(v))}),p=accounts.create({rememberLogin:true});
 const vault={inspect:async()=>({configured:true}),load:async()=>({cookies:[],origins:[]}),clear:async()=>{}};
 const m=new LoginManager({accounts,vault});m.rememberIdentity(p.authProfileId,{identity:{id:'789',nickname:'测试资料',account:'sample',avatar:'https://p3.douyinpic.com/a.jpg?x-expires=123&x-signature=asset'},checkedAt:at});
 const next=new LoginManager({accounts,vault,verifySaved:async()=>({state:'AUTHENTICATED',source:'official-self-api',checkedAt:new Date().toISOString(),identity:{id:'789',nickname:'已验证'}})});
 let v=await next.view(p.authProfileId);assert.equal(v.login.state,'UNKNOWN');assert.equal(v.identity.nickname,'测试资料');assert.equal(v.lastVerifiedAt,at);
 await next.check(p.authProfileId);v=await next.view(p.authProfileId);assert.equal(v.login.state,'AUTHENTICATED');assert.equal(v.identity.nickname,'已验证');
 next.verifySaved=async()=>({state:'ERROR',reasonCode:'AUTH_OFFICIAL_QUERY_UNAVAILABLE'});await next.check(p.authProfileId);v=await next.view(p.authProfileId);assert.equal(v.login.state,'ERROR');assert.equal(v.identity.nickname,'已验证');
 await next.clear(p.authProfileId,p.version);assert.equal((await next.view(p.authProfileId)).identity,null);await m.close();await next.close();
});
test('allowed avatar retains image CDN query and rejects other hosts/userinfo',()=>{assert.equal(displayAvatar('https://p3.douyinpic.com/a.jpg?x-expires=123&x-signature=asset#x'),'https://p3.douyinpic.com/a.jpg?x-expires=123&x-signature=asset');assert.equal(displayAvatar('https://evil.invalid/a'),null);assert.equal(displayAvatar('https://u:p@p3.douyinpic.com/a'),null);});
