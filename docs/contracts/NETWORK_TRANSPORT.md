# 网络策略 v1

2026-10-13 用户授权的应用内网络增量。RAW、Parser、Session、监控确认和人工切源规则不变；不操作 Clash、Windows DNS、系统代理、TUN、证书信任或伴侣。

Profile 增加 `networkPolicy: {mode: system|direct|custom, proxyUrl?}`，旧配置缺省为 system。`connectionMode: direct|browser` 仍表示采集实现，两者独立。更新沿用 expectedVersion；custom 留空保留已有地址，切到 system/direct 清除该地址。代理地址只写，不在 Profile DTO 返回；此版本拒绝用户名/密码，返回 NETWORK_PROXY_AUTH_UNSUPPORTED，不能把凭据放进普通配置。

`ProxyPolicy.resolve` 决定有效路径；`NetworkTransport.options` 返回 Node TLS 请求选项及脱敏诊断。TargetResolver、Monitor、WebSource WSS、BrowserSource 和显式登录窗口使用同一 Profile 策略。没有自动故障切换或因请求失败退回直连。

| 模式 | 实际路径与解析 | 安全边界 |
| --- | --- | --- |
| system | 只读当前用户 WinINET 静态代理/排除规则；无静态代理时读取进程代理环境变量；均无代理才安全直连 | PAC 尚不支持，明确报 NETWORK_SYSTEM_PAC_UNSUPPORTED；读取失败报错，不猜测 |
| custom | HTTP/HTTPS CONNECT 或 SOCKS5 domain 请求 | SOCKS5 规范化为 socks5h；目标域名交给代理，不先查询本地目标 DNS |
| direct | 每次校验全部 DNS 答案，固定本次公共 IP 后连接 | Fake-IP 198.18/15、私有/保留/非允许地址拒绝；无 DoH 或硬编码地址兜底 |

Node HTTPS/WSS 保持目标域名 SNI、证书链和主机名校验。HTTP 目标/跳转仍只允许既有 Douyin 固定域、标准 HTTPS 443、4 次跳转、总超时及 2MiB 主体；WSS 校验平台域、443，禁止任意 IP 目标。direct 固定 lookup 结果且不复用另一个目标的池化连接，防止验证后再次 DNS 解析。

Chromium system/custom 显式使用选中代理；direct 通过本项目独有的 127.0.0.1 临时 CONNECT 隧道，逐连接验证平台/SDK/CDN 域及公共 DNS 后固定 IP。隧道仅转发字节、不解密 TLS、不安装 CA，浏览器端到端验证目标证书。HTTP 请求/跳转另有平台资源域名单和媒体阻断。隧道随自有浏览器停止而关闭，不改系统路由。SDK 心跳/ACK 所有权及 rawBeforeAck=false 保持。

诊断 `mode / proxyOrigin / route / dns / localDnsUsed / connectionState / tls / errorCode` 区分选择的路径、已连接与未尝试；代理路径 DNS 标记 delegated-to-proxy，表示委托解析，不能证明其解析到了公网，也不能把端口启动当 HookReady。direct 不合格 DNS 标记 nonpublic-or-fake-ip-rejected。代理 host/port 可用于本机排障，不披露目标 URL、代理凭据或业务内容。

Profile actions 新增 `networkCheck`：探测已登记目标并返回网络/查询状态与缺失条件，**不写监控确认状态、不触发 Coordinator、不创建场次或弹幕连接**。普通 `check` 保持原监控语义。GUI 保存网络模式与独立诊断只通过正式 API。

验证入口：`node --test tests/network-policy.test.js tests/network-integration.test.js tests/profile-api.test.js tests/target-evidence.test.js` 与 `node tools/verify-profiles.mjs`。本地模拟 DNS 返回 198.18/19、HTTP CONNECT/SOCKS5 代理及 HTTPS/WSS 服务，正式 WebSource/Edge 接收合成 Proto，检查 RAW/事件及媒体阻断。临时 CA 仅传给 test-mode 请求；测试浏览器仅使用该叶证书 SPKI pin，不导入 Windows 信任、不修改生产 TLS 策略；所有端点仅回环，代理拒绝无关后台请求，资源按拥有者清理。

真实平台网络可达、身份语义、官方 SDK 鉴权和持续恢复需单独记录；本地通过不等于真实直播验收。若现有 DNS 在 direct 模式只能得到 Fake-IP，该模式明确失败，用户可选择已有代理模式。
