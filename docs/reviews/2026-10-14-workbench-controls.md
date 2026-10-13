# 简易工作台控件迁移清单

基线 `1473ba35bc0966ca836d2b12fd56b14b86dfd45d`。实施前依据 `public/index.html` / `public/app.js` 建立；原生页面整理，不改变 API、后端和数据模型。

| 原控件 ID / 事件 | 原处理函数 / 指令 | 整理后入口 |
| --- | --- | --- |
| accountSelect / accountName / accountRemember | editAccount、账号 patch | 账号管理：列表与选中详情 |
| accountLogin / accountCheck / accountReload / accountClose / accountClear | login / check / loadAccounts / close / clear | 账号管理；clear 确认后才发送 |
| accountNetworkMode / accountProxy / accountState | 登录 patch / showAccount | 账号管理：折叠网络与诊断 |
| profileSelect / profileReload / profileSave / profileDelete | editProfile / loadProfiles / create-update / delete | 直播间；删除确认 |
| profileName / targetInput / profileAuth / profileEnabled / monitorEnabled / autoStart / autoStop | 原 profile patch | 直播间：日常配置 |
| targetType / profileSource / pollSeconds / profilePriority / profileMode / browserFallback / blockMedia | 原 profile patch | 直播间：折叠技术配置 |
| profileCheck / profileResolve / profileState | check / resolve / 脱敏详情 | 直播间：折叠技术配置 |
| profileStart / profileStop / coordinateSummary | listen（旧能力 start）/ stop / showCoordinator | 工作台：唯一日常监听按钮组 |
| coordinateReload / coordinateState | loadCoordinator | 开发诊断：监听调度 |
| sourceSelect / sourceSwitch / captureStart / captureStop / status / captureNote | capture/actions switch-start-stop / refresh | 开发诊断：折叠底层来源控制，保留原安全约束 |
| persistLogin / authOptIn / authCheck / authLogin / authSave / authClear / authState | 原兼容账号指令 | 开发诊断：旧配置登录兼容；clear 确认 |
| networkMode / networkProxy / networkSave | update networkPolicy | 直播间：折叠网络高级配置 |
| networkCheck / networkDiagnostic | networkCheck | 开发诊断：实际网络路径 |
| browserStatsReload / browserStats | sources/browser | 开发诊断：浏览器资源 |
| daemonNote / daemon / hookMatchReload / hookMatch | showDaemon / hook/status | 开发诊断：Hook 与伴侣观察 |
| golden / r01 / cancel / operation | startR01 / operations stop | 开发诊断：Golden 与 R01 |
| recording / createReplay / data-action play-pause-step-stop-seek / speed / position / replay | 原 Replay 指令 | 数据记录：录制与隔离回放 |
| mode / method / reload / older / follow / latest / unread / messageScroll / messages | events / showRows / recoverLatest | 数据记录：消息历史与筛选 |
| 消息行点击 / detail / protoSelect / inspectProto / reparseProto / protoDetail | detail / proto 查询与 reparse | 数据记录：单条 RAW/Proto 追踪 |
| browseRaw / rawOlder / rawSelect / inspectRaw / rawPage | browseRaw / RAW 查询 | 数据记录：RAW 分页与处理链 |
| loadGaps / gaps / connectionHealth | capture/gaps / health | 开发诊断：缺口与连接健康 |
| logModule / logLevel / logOperation / logReload / logOlder / logExport / metrics / logs | loadLogs / exportLogs / metrics | 开发诊断：日志与指标 |
| connection / notice / WS 回调 / 定时 refresh | 原连接/任务/错误状态 | 全局常驻；切页不中断 |

切页仅切换 `hidden`，不销毁节点、不 reload、不发采集命令。工作台摘要使用真实 API / WS 数据；编辑表单、回放位置、异步 operation 保存在原节点与原 JS 状态中。原 ID 和指令入口全部保留，新增导航与摘要不承担新的业务规则。

实施边界：`dashboardProfile` 是原 `profileSelect` 的同步选择入口；不建立第二份配置或监听状态。日常停止仍发原 `profiles/{id}/actions stop`，存在活动调度时取该活动配置 ID，避免刷新后未选择配置导致无法停止。底层 capture 指令只在开发诊断折叠区可见。状态通知移入固定侧栏，避免原 sticky 底栏遮住长页面的控件。隐藏消息页保留已渲染行及滚动位置，重新打开按现有缓存渲染；历史锚点与断线补查沿用原机制。

验收工具 `node tools/verify-navigation.mjs before|after` 使用隔离 Gateway/SQLite、合成账号与平台证据、实际回环 WSS、官方 Parser 和合成 59 Golden。不会访问真实账号或已有 RAW；报告/截图与合成输入均在忽略目录中。Golden 清单固定路径仅允许在无私人清单的隔离 worktree 创建，存在时拒绝覆盖。

`before` 通过 Git 读取基线 HTML/CSS/JS，只替换隔离 Gateway 的这三个静态 HTTP 响应；原 API、会话 Cookie、WS、数据库及处理链仍由同一隔离 Gateway 提供。`after` 直接使用当前静态文件。原账号/房间/历史/工作台探针只追加导航与折叠操作，保留原断言。

验收结果：整理前首页可见按钮 46 个；整理后 7 个（5 个导航、1 组开始/停止）。整理前中心点检查观察到 2 个被旧状态栏遮挡的控件；整理后在 1365/1024/700 宽度逐页检查无溢出、按钮重叠或中心点遮挡，截图已人工查看。两阶段 GUI 核心路径与 59 条合成 Golden 均通过，浏览器脚本错误 0。账号、房间、160 条合成历史/断线补查探针通过；完整 `npm test` 为 139/139，通过时使用既有已验证 `.local/login-boundary/capture-build/LiveWorkbench.CaptureHost.exe`，未修改或重建 C# 源码。

报告位于 `artifacts/navigation/{before,after}/report.json`，截图与合成数据均忽略、不提交。主工作区保留，正式 18783 未部署此 UI；真实扫码、真实 WSS、真实 R01 私人输入和长期服务正式部署不在本轮验证结果内。原 `verify-workbench.mjs` 已适配导航，但本轮未运行其私人 R01 路径；本轮 Golden 是明确的合成夹具。
