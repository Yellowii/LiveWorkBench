// Test-only local reference: official CSS read at runtime, reconstructed DOM.
// Never ships proprietary CSS/assets or executes third-party JavaScript.
import fs from 'node:fs/promises';
import path from 'node:path';
export async function verifyOriginalStyles({browser,page,app,out,svg}){
 const root='C:/project/protodict/protobuf-live/output/cdn-chunks-20261008/css';
 const reference=await browser.newPage({viewport:{width:1080,height:560},bypassCSP:true});
 try{
  await reference.route('https://p3.douyinpic.com/lw-test-rose.png?x-expires=123',r=>r.fulfill({status:200,contentType:'image/svg+xml',body:svg}));await reference.goto(app.url);
  await reference.setContent(`<html><body style="margin:0;background:#f0f3f8;font:14px Arial"><p>原 CSS + 按源码重建 DOM · 合成样本 · 非官方运行截图</p><div class="reference-stage" style="height:440px;position:relative;background:#17191f;color:white;overflow:hidden">
  <div class="z2QtPUSr" style="position:absolute;top:40px;left:100px;font-size:20px">普通弹幕 · 内容不强加昵称</div>
  <div class="OdzW3fJK" style="position:absolute;top:100px;left:200px;font-size:20px"><div class="XDooTqWt DGKkdU_v"><span class="R46ylZSO">测试观众:  基础特权弹幕</span></div></div>
  <div class="OdzW3fJK" style="position:absolute;top:155px;left:240px;font-size:20px"><div class="XDooTqWt _5O4XcyPe"><span class="R46ylZSO">测试观众:  高级特权弹幕</span></div></div>
  <div class="OdzW3fJK" style="position:absolute;top:210px;left:160px;font-size:20px"><div class="_YmyQZh1"><div class="KVcBS34O MxPjozpP"><div class="XDooTqWt ENI4Pyn2"><span class="R46ylZSO">测试观众:  至尊弹幕</span></div></div></div></div>
  <div class="SO2bIXOF"><div class="VlwWb5NC"><div class="FI6OvUAZ"><div class="L2b9fZRi Xb3RWVGo"><div class="btjeRr_1"><div class="jM0ftSmS"><img src="https://p3.douyinpic.com/lw-test-rose.png?x-expires=123"></div><div class="w7ExHwcb"><div class="R3NQhqW2"><div class="P8WJFHfQ">测试观众</div></div><div class="H1X5W105"><span class="UYA_fu_6">送出测试玫瑰</span></div></div><div class="rUafhWtz"></div><div class="OMSjxG76"><img src="https://p3.douyinpic.com/lw-test-rose.png?x-expires=123"></div></div><div class="H3d4pQzL"><div class="i2wdcJrD"><span class="Mu_P4zFQ">x</span><span class="PcBvEQw9">8</span></div></div></div></div></div></div>
  <div style="position:absolute;left:20px;top:8px"><div class="LMUtLyr9"><div class="dVxrjT_h"><img class="KXLj31kc" src="${app.url}/api/v1/local/assets/lottery-icon"><div class="ycjwPFJI">01:25</div></div></div></div>
  </div><p>容器位置仅为对照夹具；原播放器定位上下文、字体及官方运行效果仍需核验。</p></body></html>`);
  for(const name of ['GiftTrayPlugin.ad979c7b.css','DanmakuPlugin.bf02df37.css','LotteryShortTouchPlugin.9d6a7ee6.css'])await reference.addStyleTag({content:await fs.readFile(path.join(root,name),'utf8')});
  await reference.waitForTimeout(900);await reference.screenshot({path:path.join(out,'original-css-reference.png'),fullPage:true});
  // Measure actual original styles; compare against the implementation snapshot
  // captured earlier while all three components were present.
  const original=await reference.evaluate(()=>Object.fromEntries([
   ['.stage-avatar','.jM0ftSmS'],['.stage-gift-icon','.rUafhWtz'],['.stage-gift-name','.P8WJFHfQ'],['.stage-number','.PcBvEQw9'],['.stage-lottery-icon','.dVxrjT_h']
  ].map(([key,selector])=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),s=getComputedStyle(e);return [key,{width:r.width,height:r.height,fontSize:s.fontSize,color:s.color}];})));
  return {original,source:'three original local CSS files, no original JS',limits:['reconstructed DOM','local font fallback','no official running-page screenshot','Canvas rendering has separate source-based assertions']};
 }finally{await reference.close();}
}
