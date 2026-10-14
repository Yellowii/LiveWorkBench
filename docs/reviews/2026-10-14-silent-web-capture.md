# 静默监听最短修复边界

基线 main 0ae7d11；复用现有 Node LiveClient、RAW 屏障、官方解码与观看账号凭据。18783 不重启，正式数据与配置不写入。

1. 先补 HTTP 房间身份发现，凭据只在匹配域名/path/有效期的请求中使用。人工监听允许使用新鲜、匹配目标的身份证据，不等待周期确认数；自动监听仍要求 LIVE 确认。
2. 自动浏览器兜底固定无头，显式浏览器诊断配置才允许正常窗口。动态参数缺失和真实超时分别报告；不能把超时称为验证码。
3. 在 HTML/room 响应交给页面前学习本目标的真实 stream_url、live_core_sdk_data 流地址，精确拦截 FLV/HLS/DASH 与关联分片。登录浏览器不接此策略。提供实测请求、阻断、完成响应字节及失败统计，未知/未采样不当作节流成功。
4. 针对性用例、隔离 GUI 与真实 HTTP/无头诊断分开记录。仅在正式采集停止时做隔离真实诊断；发现正式采集恢复立即结束自己的诊断。

定位结果：固定上游 LiveClient 只接受签名 URL，BarrageGrab 是代理捕获；其成熟接收、心跳、ACK 和 RAW 屏障继续复用。新 provider 从本目标的官方 HTTP/Pace 房间证据获得 roomId/owner，与请求身份逐项核对；从官方 odin.user_unique_id 获得设备身份，不用主播 UID 或猜测访客 ID。每次连接/重连重新请求并在独立 Node VM 调用固定哈希的签名实现；无历史 cursor/internal_ext/wrds_v，无持久化签名或签名 URL。expiresAt 的 30 秒是本地新鲜度上限，不承诺平台授权时长。

签名资源仅本地准备、保持忽略。来源 saermart/DouyinLiveWebFetcher 40a904bdb0561a5a9c958a95634a29681cc4fbf4/sign.js，SHA256 81fb78a5e8728af99ffb9d20625b01bcedc43a82b05e3bef79e2bc0d29ccff5d；没有发明再分发许可。通过 tools/setup-wss-signer.mjs --source 或 --fetch 准备，哈希不匹配/未准备时明确 WEB_SIGNATURE_PROVIDER_UNAVAILABLE。VM 无 Node 权限，签名原始脚本不上传。

原生失败后，仅明确开启 browserFallback 才串行排空旧来源并启动无头 BrowserSource。RAW/凭据/身份错误不自动切换逃避错误。浏览器方式下每五分钟做一次 HTTP/签名恢复探测；用户 stop、配置版本变化或关闭宿主撤销任务。转回原生时先关闭浏览器 context/WSS，保留独占进程待确认原生至少 30 秒稳定且收到至少两包、最近 30 秒有实际输入，再释放浏览器；90 秒未达条件回退。切换留 unknown-range 缺口，不承诺无丢包。周期监控仍有原 LIVE 确认与身份门控，只有人工 listen 可使用新鲜身份证据尝试连接。

真实证据与合成回归见 STATUS 27；当前房间无头 SDK 初始化依旧空体，不能宣称无头 SDK 弹幕捕获成功。原生 HTTP/WSS 可以独立接收，兜底失败会如实显示。其他房间、长期稳定性和平台签名变化仍需持续验收。

完成记录在 STATUS 第 27 节。
