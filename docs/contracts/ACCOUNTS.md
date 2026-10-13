# 独立账号与日常监听命令 v1

2026-10-13 用户正式任务增量1，owner本对话，串行main。复用官方AccountMonitor/createLoginContext及现有LoginVault/DPAPI，不改官方输出或references。任务附件明确授权实现独立账号、确认后自动保存及简化操作；不另加总体设计审批或派工。

AuthProfile只有本地名称、authProfileId、版本、rememberLogin、networkPolicy与必要时间；登录身份/头像/原始响应不写普通配置。LoginManager拥有独立临时官方首页窗口，与SourceController/roomId/MonitorProfile分离；只由显式login命令打开。检测到official-self-api认证后，rememberLogin=true才自动DPAPI保存，同次快照保存在内存供本次宿主使用，随后关闭自有窗口。匿名/验证码/失败/取消不能覆盖已有凭据；重启后的保存状态有效性仍UNKNOWN，不能以文件存在当已登录。

MonitorProfile新增可选authProfileId，可多个配置共享同账号；未指定时使用已登记默认账号，显式null不绑定。旧authRef/profileId vault引用保持可读，不搬移、覆盖或自动扫描旧凭据。账号清除与重新登录不停止现有采集；已经运行的浏览器上下文由其采集生命周期管理。

受认证API追加GET/POST /accounts、POST /accounts/{id}/actions，动作login/check/update/clear/close。创建并登录可用一次POST /accounts {action:login,account:{name,rememberLogin,networkPolicy}}；版本化更新/清除，命令沿用commandId幂等。只返回配置与状态/中文下一步、绑定的配置ID，不返回storageState/Cookie/用户资料或文件路径。account.updated供工作台刷新。

增量实现步骤（用户已要求本会话直接执行）：

- [x] tests/accounts.test.js先验证没有直播间/Source时登录、官方确认后自动保存、opt-out/取消不写、重启共享、登录不影响实际回环采集；先运行失败。
- [x] src/auth/auth-profile-store.js、login-browser-session.js、login-manager.js复用已有能力并通过测试。
- [x] Gateway追加账号端口，Profile绑定与Source内部凭据读取；旧接口保留。public账号区/绑定选择/中文错误经正式API操作。
- [x] 实际Edge合成官方self响应验证确认/保存/窗口关闭；API/GUI/既有链路回归。更新STATUS、公开审查、提交推送。

日常“开始监听”作为明确用户命令，可在空闲资源下选择该配置声明的来源、检查目标并启动；这是用户主动来源选择，后台Monitor仍禁止自动切全局来源/抢占其他房间。内部WSS/browser自动优先策略与可靠真实直连属于后续增量，不能在本增量声明完成。

窗口/账号流程的合成验证和真实扫码/平台鉴权分开；长期18783启动/重启已有审批拒绝，不自动重试或绕过。RAW-first、Browser rawBeforeAck=false、单活动来源、Session/Replay隔离不变。

实施补充：创建并登录及已有账号配置更新/登录在LoginManager同一队列内执行；忙时拒绝而不留重复账号。关闭后的迟到命令拒绝、不再写配置。官方确认的空登录态不能覆盖旧文件；持久化与自有浏览器释放完成后才报告AUTHENTICATED。保存开关控制后续写入，取消该开关不会擅自删除旧保存内容，显式clear才清除。

Profile actions新增listen {expectedVersion}，由明确用户意图串行检查单活动资源、选择配置来源、连续确认后启动；不可抢占当前房间。持久化requestedProfileId/版本使未确认时后续监控仍针对该用户选择；配置版本变更失效，手动停止/切源清除意图并保留既有抑制规则。后台evaluate依旧不能切全局来源。HTTP/UNKNOWN不下播。旧start与诊断接口兼容。

system/status新增accounts.count/loginWindowOpen；手动部署助手在独立登录窗口仍打开时拒绝停止宿主。普通失败返回中文message/nextAction和诊断code。旧Profile登录动作转到独立首页，不再先解析room或抑制Coordinator；已有私人vault仅在用户明确登录时登记原引用，不扫描/搬移文件。共享账号的旧保存/清除入口引导到账号管理，避免误伤其他绑定。

验收覆盖：tests/accounts.test.js（真实DPAPI、本机WS、实际Edge合成官方self响应）；tools/verify-accounts.mjs（含默认共享与非默认账号选择）、verify-profiles.mjs（完整等待新listen结果）、verify-history.mjs（合成历史/回放）。真实扫码、真实账号过期、平台直连与兜底恢复尚未验收。当前第一增量没有实现可靠动态参数发现或新的内部自动模式协调器；后续增量继续WSS优先、隐藏兜底/恢复和字典联动。
