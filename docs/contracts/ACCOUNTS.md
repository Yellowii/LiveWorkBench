# 观看账号与日常监听命令

当前规则以文末“单观看账号 v2”为准；以下 v1 是原实现的历史说明，逐房间绑定与多账号写接口已由用户新需求撤销。

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

### 登录页面资源与诊断（2026-10-13兼容补充）

可见登录窗口使用正常Chromium交互，不安装采集优化、播放重写、自动暂停或按资源类型/名称过滤。CSS、JS、图片、字体、普通媒体、XHR/Fetch、页面跳转和SDK连接保持正常；login-resource-policy只保留网络安全边界。此前对登录页媒体和遥测的限制由本次用户新要求撤销。BrowserSource仅优化已识别直播流，见MONITOR_PROFILES。TLS、代理路由、安全直连/DNS固定地址、IP限制和目标/直连WSS白名单保留。

资源权限以实际官方页面请求为证据。原10个精确登录/安全CDN主机之外，匿名页面已观察的lf-static.applogcdn.com、mon.zijieapi.com、mcs.zijieapi.com、tnc0-aliec2.zijieapi.com、tnc0-alisc1.zijieapi.com、lf3-config.bytetcc.com、lf3-static.bytednsdoc.com、lf3-short.ibytedapm.com、unpkg.byted-static.com、api.feelgood.cn追加为精确HTTPS资源权限；观察到的v数字-rh.douyinvod.com及pull-flv/pull-hls节点.douyinliving.com按受限投递服务角色允许HTTPS加载，不泛化放行任意域名/子域/IP。未知不安全域拒绝与媒体优化分别诊断，遥测不作为过滤理由。

账号DTO兼容新增可选pageLoad，账号区“账号网络与开发诊断”通过原REST/WS展示。内容为网络模式/实际路由/DNS委托或固定地址策略/TLS模式、资源分类统计、pageErrors/consoleErrors及overflow。resources项仅有脱敏domain、resourceType、outcome、reasonCode、httpStatus和count；不含路径/查询参数、Cookie、身份、响应/二维码内容、控制台或异常原文。未知域名不直接披露；已知公共域只留域根，必要固定资源主机保留完整域名。关闭后保留本次诊断于宿主内存，重启不冒充当前加载状态。

DOMAIN_POLICY_DENIED、LOGIN_MEDIA_BLOCKED与HTTP_ERROR、PROXY_CONNECTION_FAILED、NETWORK_TIMEOUT、DNS_RESOLUTION_FAILED、TLS_VALIDATION_FAILED、REQUEST_CANCELLED、NETWORK_REQUEST_FAILED、PAGE_SCRIPT_EXCEPTION、BROWSER_CONSOLE_ERROR分别记账。主动阻断不重复算网络失败；最多80种聚合记录，溢出计数。每种失败首条以AUTH_LOGIN_RESOURCE_DIAGNOSTIC和账号/operationId写入既有受保护日志，其余聚合计数。页面非成功HTTP、脚本/console异常不会自动声称未登录或登录成功，认证仍只以official-self-api证据判定。

新增LoginAccountEvidence独立验证层，不改固定AccountMonitor或Parser：只接收受信任HTTPS当前账号接口的HTTP200、合法JSON和原生normalizer确认；失败/未知形状、二维码消失、URL不变、Cookie存在均不是认证成功。失败的并发查询不能压过已验证认证响应；失败诊断单独保留。原getMe查询无有效网络证据时，补充调用当前官方SDK已加载的profile/self构建器，仍需观察真正HTTP响应，不构造签名URL或以SDK缓存返回值冒充网络认证。pageLoad.authentication只含响应/失败/访客/确认计数与状态、原因和时间，不含账号ID/原文。

账号状态兼容追加SAVING：新鲜官方确认→storageState/过滤检查→用户rememberLogin时DPAPI写入→读回同一快照验证→关闭自有窗口→AUTHENTICATED。保存/读回失败维持ERROR和窗口，不能宣称remembered成功。成功DTO追加saveVerified与cookieCount/originCount，仅计数。未记住仍只在宿主内存共享；文件存在不证明重启后有效，真实复用需重新官方确认。十分钟等待仅提示AUTH_LOGIN_STILL_WAITING，不自动关闭正在交互的窗口；用户close、窗口自闭或宿主关闭仍释放资源。LOGIN_MEDIA_BLOCKED仅属于旧报告，新登录不再产生该码。

本地合成资源/真实代理失败与真实匿名页面加载分别验收。真实探针node tools/probe-login-page.mjs <本地报告标签> [visible] [layout]仅使用独立临时上下文和现有网络设置，不读已存账号、不写登录态；可点击登录入口，输出脱敏聚合及可选已遮蔽文本/二维码的布局截图到忽略的.local/login-page。观察结束后释放自有临时浏览器。真实扫码、验证码交互、账号确认/保存仍由用户在更新后的正式工作台完成，不能以二维码出现替代登录成功。

扫码确认排障补充：pageLoad.loginFlow按qr-create、qr-poll、challenge、ticket-guard及passport-other记录请求/响应/失败计数、时间、HTTP状态、固定协议状态与数值错误码；其他扫码状态只显示unrecognized。这些流程信号不作为认证依据，不保存二维码、重定向URL、参数、Cookie或官方错误原文。pageLoad.authentication.lastResponse追加固定endpoint分类、数值responseCode和账号结构类别；官方拒绝明确为AUTH_OFFICIAL_REJECTED，不再混作未知结构。原生账号查询与响应验证异步执行时，等待已收到响应的验证结束，再判断是否补充profile/self查询；未知主接口结构同样允许备用官方查询，但必须由该接口的新鲜HTTP证据确认，不能猜测嵌套字段即已登录。


## 单观看账号 v2（2026-10-14，用户明确收敛）

观看身份与直播间独立。ViewerAccount 是现有 LoginManager/AuthProfileStore/LoginVault 的薄适配层，保存唯一 selectedId、迁移选择版本和显式退出标记；不改变 DPAPI、官方确认门槛、捕获宿主或数据库模式。所有房间由 LoginManager.credentialsFor 读取同一槽位，Gateway 的 ProfileStore 忽略旧 authProfileId/persistLogin 配置，旧字段不用批量改写。后台 MonitorCoordinator、SourceController、RAW/Parser/EventStore/Session 与浏览器兜底规则保持。

首次登录按需建立内部记录，名称不要求用户输入，默认 rememberLogin=true。可见 Chromium 仍正常完整交互；重新登录打开不带旧 storageState 的临时上下文，成功前保留旧 vault。仅可信当前账号 self API 的新鲜认证证据可触发快照、DPAPI 保存、读回验证与窗口关闭。取消/失败不覆盖已有状态。服务重启可读取保存状态，但有效性 UNKNOWN，不以文件存在宣称已登录。头像/昵称/ID 只从官方 normalizer 的已确认身份中获取，当前宿主内存保存；重启未重新官方确认时不编造身份资料。

退出：LoginManager 同一队列内关闭本槽位的临时登录窗口、清除对应 DPAPI 文件、所有同 vault 引用的内存会话/有效性/页面报告并移除记录，持久化 loggedOut，避免下次启动悄悄选用另一个旧凭据。不调用采集停止，不清理采集浏览器当前上下文；已运行连接可继续，后续新连接或重连可能需要重新登录。清理非当前凭据须显式 candidateIds；拒绝当前槽位/同文件别名/正在登录的候选。所有写命令 expectedVersion 与 commandId 检查仍有效。

迁移只检查已登记账号及旧 profile authRef/profileId 引用，不扫描凭据目录。唯一已保存/内存可用候选可原地复用，多个候选返回 migration.required，由用户在界面选择。采用只登记原引用，不搬移/覆写/删除其他凭据；未选状态提供独立确认清理。文件存在仅表示配置，不能证明有效。无凭据、无内存会话、无登录窗口的空元数据在明确登录时可清理；退出后没有空账号列表条目。

受认证的 GET /viewer、POST /viewer/actions 为日常入口，动作 login/check/close/logout/adopt/cleanup。check 只检查已打开的临时窗口，不将离线文件检查当作官方有效性验收。GET /accounts 保留脱敏只读诊断；旧多账号创建/修改/clear/login 及逐房间认证写动作返回 AUTH_USE_ACCOUNT_MANAGEMENT 引导新入口，避免旧 authClear 关闭活动采集。旧 authCheck 只读兼容查询同一观看槽位，不再查询逐房间凭据。

本机受认证 REST 的 viewer.identity 和 Profile details.roomInfo 是用户明确要求的固定字段展示例外：仅有限长度身份、已匹配房间的 URL/ID/标题/简介及受限 CDN HTTPS 头像。头像移除查询串、fragment、用户信息与自定义端口；页面 referrerpolicy=no-referrer，CSP 限定头像 CDN。Cookie/storageState/响应原文/路径不返回，日志、WS、导出与 RAW/事件投影仍脱敏，例外不扩展到它们。

统一房间输入为 auto，接受单个可信 HTTPS URL（包括分享文本内一个 URL）或明确 web_rid:/uid:/anchorUid:/roomId:/secUid: 前缀。无前缀数字返回 PENDING_TYPE，不猜 UID 为网页房号。已有显式 target 类型继续可读。details 使用现有安全 HTTP/TargetResolver/官方结构证据，不改变 monitor 确认计数；只有严格匹配目标且唯一的房间证据才展示资料，外观字段冲突显示未知、不改变 LIVE/ENDED 语义。不能可靠解析时明确说明缺失，字段未知不补假数据。

日常切换仍由用户明确点击开始：活动房间不同则确认停止、等待完成后再 listen；编辑活动目标也先确认停止，再保存和 listen。各步失败保留真实错误，不并行启动两个来源。导航不发切换/停止指令。能力 viewerAccount=false 的旧加载后端会禁用新登录/房间写入/开始入口并提示安全更新，仍保留既有停止与诊断入口；不自动重启。

停止后的Web目标接续（2026-10-15）：历史未结束场次不是活动连接占用。startProfile仅在STOPPED/FAILED、目标参数验证通过时排空旧Web/Browser输入并取消恢复计划，再次检查配置版本后递增sourceEpoch、绑定已验证的新房间。仍在连接时拒绝SOURCE_BUSY；旧epoch输入先保存RAW后拒绝发布，新epoch的异房间输入仍拒绝。保留旧SessionManager场次，不制造下播，不因换房新建旧房间场次；返回旧房间继续其原sessionId。LiveHook既有流收养与身份约束不放宽。
