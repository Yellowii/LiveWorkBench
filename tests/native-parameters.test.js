import test from 'node:test';
import assert from 'node:assert/strict';

test('HTTP discovery uses a fresh official odin device identity; native parameters have no historical cursor or browser dependency',async()=>{
 const {NativeParameterProvider}=await import('../src/capture/websource/native-parameters.js');let discoveries=0,signatures=0;
 const provider=new NativeParameterProvider({credentialsFor:async()=>({storageState:{cookies:[{name:'session',value:'SYNTHETIC_NATIVE',domain:'.douyin.com',path:'/',expires:-1}]}}),discovery:{discover:async(_p,o)=>{assert.equal(o.parameters,true);discoveries++;return {roomId:'100',anchorUid:'200',web_rid:'123',userUniqueId:'300'};}},signer:{sign:async(u,ua)=>{assert.equal(u.searchParams.get('room_id'),'100');assert.equal(u.searchParams.get('user_unique_id'),'300');assert.ok(ua);return 'SYNTHETIC_'+(++signatures);}}});
 const first=await provider.resolve({},{roomId:'100',anchorUid:'200'}),next=await provider.resolve({},{roomId:'100',anchorUid:'200'});
 assert.equal(discoveries,2);assert.notEqual(first.url,next.url);assert.equal(first.parameterDiscovery,'http');assert.equal(first.modern,true);assert.ok(first.expiresAt>Date.now()+5000);
 assert.equal(new URL(first.url).searchParams.has('cursor'),false);assert.equal(new URL(first.url).searchParams.has('internal_ext'),false);assert.equal(first.cookie,'session=SYNTHETIC_NATIVE');
 await assert.rejects(()=>provider.resolve({},{roomId:'101',anchorUid:'200'}),/TARGET_IDENTITY_CHANGED/);
});
test('device identity extraction rejects competing official odin identities and unrelated visitor fields',async()=>{
 const {officialDeviceIdentity}=await import('../src/capture/websource/http-room-discovery.js');
 assert.equal(officialDeviceIdentity([{initialState:{userStore:{odin:{user_unique_id:'300'}}}}]),'300');
 assert.equal(officialDeviceIdentity([{odin:{user_unique_id:'300'}},{odin:{user_unique_id:'301'}}]),null);
 assert.equal(officialDeviceIdentity([{user_unique_id:'300'},{owner:{id:'200'}}]),null);
});
test('native failure diagnostics distinguish exhausted retries, persistence failure and cleared login',async()=>{
 const {webFailureReason}=await import('../src/web-source.js');
 assert.equal(webFailureReason({reason:'达到重试上限；等待人工检查'}),'WEB_RETRY_LIMIT_REACHED');
 assert.equal(webFailureReason({reason:'RAW_COMMIT_FAILED'}),'WEB_RAW_COMMIT_FAILED');
 assert.equal(webFailureReason({reason:'DYNAMIC_PARAMETERS_UNAVAILABLE'},'AUTH_LOGIN_REQUIRED'),'AUTH_LOGIN_REQUIRED');
});
