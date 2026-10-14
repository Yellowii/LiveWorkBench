import test from 'node:test';
import assert from 'node:assert/strict';
import {messageView} from '../src/messages/message-view.js';
import {localOfficial,resourceUrl} from '../src/messages/privacy.js';
import {messageFields} from '../src/messages/dictionary.js';
import {OfficialParser} from '../src/parser/index.js';
const event=(type,official)=>({eventId:'test-event',eventSeq:'1',eventType:'Webcast'+type,mode:'live',runtimeNamespace:'live',rawRefs:['raw-test'],payload:{decodeStatus:'decoded',official}});
test('chat, rich pieces, emoji and privilege preserve readable text without executing markup',()=>{
 const raw=event('ChatMessage',{user:{nickname:'合成观众'},content:'<img onerror=alert(1)>你好'}),before=JSON.stringify(raw),view=messageView(raw);
 assert.equal(view.summary,'<img onerror=alert(1)>你好');assert.equal(view.actor.name,'合成观众');assert.equal(JSON.stringify(raw),before);
 assert.equal(messageView(event('ChatMessage',{content:'备用',rtf_content_v2:{pieces:[{string_value:'你好 '},{user_value:{user:{nickname:'小明'},left_additional_content:'@'}},{image_value:{image:{url_list:['https://p3.douyinpic.com/test.png']}}}]}})).summary,'你好 @小明[图片]');
 assert.equal(messageView(event('EmojiChatMessage',{default_content:'开心',emoji_content:{pieces:[{image_value:{image:{url_list:['https://p3.douyinpic.com/emoji.png']}}}]}})).resources[0].kind,'emoji');
 assert.equal(messageView(event('PrivilegeScreenChatMessage',{content:'合成特权'})).category,'chat');
});
test('gift quantities are exact independent observations, never summed or guessed from gift ID',()=>{
 const v=messageView(event('GiftMessage',{gift:{name:'合成礼物',combo:true},repeat_count:'9007199254740993',group_count:'2',combo_count:'4',repeat_end:1}));
 assert.match(v.summary,/合成礼物/);assert.match(v.summary,/9007199254740993/);assert.equal(v.content.gift.repeatCount,'9007199254740993');assert.equal(v.content.gift.groupCount,'2');assert.equal(v.content.gift.comboState,'ended');
 assert.equal(messageView(event('GiftMessage',{gift_id:'999'})).content.gift.name,null);
 assert.equal(messageView(event('GiftMessage',{repeat_end:0})).content.gift.comboState,'unknown');
});
test('like and member retain evidence; absent or unknown member action never invents entry',()=>{
 assert.equal(messageView(event('LikeMessage',{count:'3',total:'100'})).summary,'点赞 ×3');
 assert.equal(messageView(event('MemberMessage',{common:{display_text:{default_pattern:'{0}进入直播间',pieces:[{user_value:{user:{nickname:'合成观众'}}}]}}})).summary,'合成观众进入直播间');
 assert.doesNotMatch(messageView(event('MemberMessage',{action:'999'})).summary,/进入/);
 assert.doesNotMatch(messageView(event('MemberMessage',{})).summary,/进入/);
});
test('local projection blocks credentials, embedded URLs, opaque JSON and untrusted resources at any depth',()=>{
 const out=localOfficial({content:'你好 https://x.invalid/?signature=SYN_SECRET cookie=SYN_SECRET',cookie:'SYN_SECRET',nested:{auth_token:'SYN_SECRET',extra:'{"password":"SYN_SECRET"}',unknown:'SYN_SECRET'},user:{nickname:'合成观众'},count:'2'});
 assert.doesNotMatch(JSON.stringify(out),/SYN_SECRET/);assert.equal(out.user.nickname,'合成观众');assert.equal(out.count,'2');
 const credentialUrl=new URL('https://p3.douyinpic.com/a');credentialUrl.username='synthetic';credentialUrl.password='synthetic';
 for(const u of ['javascript:alert(1)','http://p3.douyinpic.com/a','https://p3.douyinpic.com.evil.test/a',credentialUrl.href,'https://127.0.0.1/a','https://p3.douyinpic.com/a?signature=synthetic'])assert.equal(resourceUrl(u),null);
 assert.equal(resourceUrl('https://p3.douyinpic.com/a.png'),'https://p3.douyinpic.com/a.png');
 assert.deepEqual(localOfficial({'https://example.invalid/?x=private':1,'private arbitrary map key':2}),{});
});
test('unknown, invalid and malformed input degrade locally without mutating original facts',()=>{
 const v=messageView(event('FutureMessage',{status:7,content:'原生可读文本',opaque:'SYN_SECRET'}));assert.equal(v.summary,'原生可读文本');assert.equal(v.category,'other');
 assert.doesNotMatch(messageView(event('FutureMessage',{opaque:'SYN_SECRET',count:2})).summary,/SYN_SECRET/);
 assert.equal(messageView({}).category,'other');
 const broken={eventType:'WebcastChatMessage',get payload(){throw Error('SYN_SECRET');}};assert.equal(messageView(broken).mappingStatus,'failed');
});
test('dictionary resolves exact nested JSON path to official field numbers; unknown paths remain unknown',async()=>{
 const parser=await OfficialParser.open(),out=messageFields(parser.native,'WebcastChatMessage',{user:{nickname:'test'},content:'test',unverified:1});
 assert.equal(out.fields.find(x=>x.path==='content').number,3);const nick=out.fields.find(x=>x.path==='user.nickname');assert.equal(nick.number,3);assert.equal(nick.type,'string');assert.match(nick.label,/昵称/);
 assert.equal(out.fields.find(x=>x.path==='unverified').number,null);assert.equal(out.fields.find(x=>x.path==='unverified').confidence,'unknown');
});
