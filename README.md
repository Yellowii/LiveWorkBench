# LiveWorkbench

2026-10-14 新增独立「实时弹幕」：文字/表情、礼物数量、点赞、成员与管理员消息，以及红包、福袋、活动消息的本机可读展示。支持分类、自动跟随、历史分页和内容/官方JSON/Proto字典/中文映射/RAW处理链统一详情。数据通过本机认证专用REST读取，现有公共广播、日志和导出仍脱敏。原始记录与采集链不改变；图片默认不加载，未知资源/动作/价格不猜测。规则与限制见 [MessageView](docs/contracts/MESSAGE_VIEW.md)。运行中的旧服务不会因Git提交自动更新，需在用户安排的安全时段更新；页面会显示“实时弹幕（需更新）”。

Windows 本地直播工作台。默认 LiveHookSource，WebSource 由人工选择；同一时刻一个直播间、一个活动实时来源。局域网多设备前端通过受控 API Gateway 访问本地后端，不建立云端监控系统。

**当前状态（2026-10-12）：已交付首个可运行核心与简易开发 GUI。C# HTTP 捕获/传输解包/解压 → RAW 落盘 ACK → 官方 Parser → 去重事件库 → API/WS → GUI 已通过受控本地测试。真实伴侣接入与恢复仍需环境授权及实测，不能把此测试视为生产直播验收。**

## 运行与验证

需要 Node 24.15+、Windows .NET Framework 4.8 运行时和 .NET Framework 4.6.2 构建工具。采集构建复用本机既有 NuGet 缓存；路径参数见 `tools/build-capture.ps1`。依赖不会安装到 references。

```powershell
npm ci
npm run setup:parser -- --fetch
npm run setup:websource -- --fetch
npm run setup:wss-signer -- --fetch
npm run setup:browser -- --fetch
npm run build:capture
npm test
npm start
```

打开 <http://127.0.0.1:18780>。提供持久化消息分页、官方结果脱敏投影/独立增强/RAW 引用、日志与基础指标、隔离回放的播放/暂停/单步/跳转，以及伴侣进程/启动顺序/退出重启提示。可人工选择 LiveHookSource/WebSource，再独立启动；切换停止旧来源并保留场次，不自动故障切换。真实连接、完整 daemon 恢复、通知与业务消费者仍待相应验证。

本轮持续开发实例为 <http://127.0.0.1:18782>，使用独立 `data/continuous-20261012`。旧18780/18781实例保留。可用 LW_PORT/LW_DATA_DIR 配置独立实例，避免覆盖已有进程。

已授权历史样本路径仅登记在忽略的 `.local/settings.json`：`{"r01Root":"用户已授权的单个 R01 目录"}`。界面可运行 59 Golden 或载入完整 R01，原数据只读且不复制；历史 payload 不冒充新采集的完整 HTTP/WSS RAW。浏览器验收命令为 `node tools/verify-workbench.mjs`，需要本机 Edge；结果在忽略的 `artifacts/`。

采集默认停止。真实 TLS 捕获还需要本地配置已授权的 `certificatePath`、可选 `certificatePassword`、`capturePort`（默认 18827）及人工客户端路由/伴侣重启。本项目不自动改变系统代理、信任证书、关闭伴侣或修改安装文件；密码不得放入公开文档或提交。第三方来源与许可见 [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md)。

2026-10-13已补实际C#回环HTTPS/分片WSS的文件CA测试、环境前后核对与不写安装文件的私有备份；[分阶段记录与复查命令](docs/reviews/2026-10-13-livehook-stage1.md)。真实伴侣接入/恢复仍待单独授权。默认exe被只读观察进程占用时可用 build:capture 的 -OutputDirectory 构建到本项目独立目录，并用 LW_CAPTURE_EXE 选择该构建，不必停止旧工作台。

当前RAW分层增量：独立RawRecorder/TransportUnpacker/ProtoIndex、业务Parser/扩展、去重/总线/事件存储、历史查询、Replay、日志/指标与Gateway连接健康。每条业务payload可定位/查看解析尝试/重新解析，未知、重复、失败输入保留；RAW控制/传输失败可经录制分页检查。Replay有独立SQLite/总线及只读父RAW，查询读模型维持原API分页兼容。阶段E已在18783及本项目独立data/pipeline-20261013启动；界面显示后端实际加载版本，后续代码提交不会自动更新活进程。旧服务保留，部署和真实平台验收分别记录。采集默认停止。接口和限制见 [PROCESSING_PIPELINE](docs/contracts/PROCESSING_PIPELINE.md) 与 [STATUS第14节](docs/progress/STATUS.md#14-raw解包解析分层持续增量2026-10-13)。

已构建后，在独立终端手动启动新版（不停止旧实例，不改系统代理/证书/伴侣）：

```powershell
Set-Location C:\project\LiveWorkBench
$env:LW_PORT='18783'
$env:LW_DATA_DIR='C:/project/LiveWorkBench/data/pipeline-20261013'
$env:LW_CAPTURE_EXE='C:/project/LiveWorkBench/.local/pipeline-capture-build/LiveWorkbench.CaptureHost.exe'
npm start
```

打开 <http://127.0.0.1:18783>；若端口或该数据目录已被其他工作占用，先核对归属再选择独立值。此命令不会授权真实采集环境变更。

日常启停和部署：双击根目录 **工作台管理.bat** 选择启动、停止、更新，也可直接双击 **启动工作台.bat**、**停止工作台.bat** 或 **一键更新工作台.bat**，无需填写 PID 或 Commit。命令行入口为 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/deploy-dev-workbench.ps1 -Action Start`（或 `Stop` / `Update`，省略参数默认更新）。

启动：已有健康且归属已核对的实例时显示实际版本，不重复启动或更新；未运行时构建并验证当前干净工作区 HEAD，再启动独立后台进程。停止：只结束已核对的本项目空闲实例，已停止时直接返回；采集尚未停止或临时登录窗口打开时拒绝。更新：运行时独立构建并验证，再受保护重启；未运行时验证后直接启动；同版本且健康时直接返回。启动/更新前先保存并提交正式文件，停止/更新前在 GUI 停止采集并完成或关闭登录窗口。不自动拉取 Git，不把启动工作台当作新增开始监听指令；原监控恢复和自动监听策略保持。

构建与预检核对 CaptureHost、Node/Parser/隔离 SQLite；启动后核对 PID、实际 Commit、健康接口及同一数据目录租约。已有 `data/pipeline-20261013` 及保存的账号状态、RAW、历史文件保留。

端口被占用、活动数据租约、未监听的本项目进程、无法归属的相对 Node 入口，以及进程/当前 Windows 用户/登录/采集状态或构建无法核对时明确拒绝，不以状态接口不可达直接推断服务已停止。陈旧且 PID 已不存在的租约由既有 Runtime 正常接管，不删除租约。构建/预检失败保留旧服务；旧实例退出后若新启动失败，明确报告失败并保留数据与 `.local/deployment/` 日志，不自动结束未知进程、回滚代码或强制重试。不会修改系统代理/证书/伴侣或其他服务，不自动提权。BAT中文窗口保留结果，成功后核对页面实际加载版本。

## 权威入口

独立账号入口：无需添加直播间或选择Source，点击“登录 / 重新登录”，在本项目临时官方首页扫码或完成验证。勾选记住登录后，仅官方账号确认与有效快照才自动DPAPI保存并关闭窗口；否则会话只在本次宿主内使用。同一账号可供多个直播间共享，新增配置默认选已有默认账号，也可显式选择其他账号或访客。账号操作不停止已有采集。真实扫码及生产直连仍待验收，接口见[ACCOUNTS](docs/contracts/ACCOUNTS.md)。

“开始监听选中直播间”是一条后端命令，在资源空闲时将该配置来源视为用户主动选择、检查目标并启动，后台监控不自动切来源。不具备可信开播/连接信息时继续显示未确认或不可用，不能把添加URL当已连上真实弹幕。

新增监听Profile与开播监控：经工作台保存ID/URL、来源及策略，身份输入只写，查询显示脱敏结果；已启用配置在后端启动时恢复监控，但不自动切源。纯数字应指定类型。当前真实身份映射与平台页面需要实测；不能确定则显示UNKNOWN。接口及增量范围见 [MONITOR_PROFILES](docs/contracts/MONITOR_PROFILES.md) 与STATUS第15节。

Web配置可显式选择浏览器或允许兜底，使用独立临时Edge/Chrome会话和官方页面SDK，经浏览器网络事件保存RAW并进入同一解析链。SDK ACK不受RAW提交控制，该模式不承诺严格RAW-before-ACK。默认禁止直播媒体播放/下载；登录态仅启用并主动保存后以当前用户DPAPI保护。直连动态签名参数尚缺可靠公开发现实现，显示不可用并遵守所选兜底策略。可见登录窗口只由“打开独立登录窗口”命令启动；现有伴侣和日常浏览器不操作。

WebSource 的 WSS URL/Cookie/User-Agent 只登记在 `.local/settings.json` 的 `webSource` 对象；可选 `roomId` 是平台实际 roomId，不能拿网页短房号代替。配置不经公共 API 传入或返回。默认目标仅接受 douyin.com 下标准443端口WSS，回连/心跳/ACK复用固定上游实现，RAW提交前不会解码或ACK。入站二进制WebSocket消息为采集范围；队列上限触发显式缺口诊断，不能宣称保存了TCP/所有控制帧。

公开仓库不包含真实 RAW、R01 Golden 定位清单、历史证据及运行数据；原本地文件保留。官方解析器与协议资源因再分发授权未确认，也不进入 Git；准备命令从固定上游版本下载六个文件并验证哈希。已有本地参考源码时可使用 `npm run setup:parser -- --source <protobuf-live 目录>`。真实样本回归需要在受控本机单独登记样本及本地 Golden 清单，公开自动化测试仅使用合成输入。

| 文件 | 唯一职责 |
|---|---|
| [AGENTS.md](AGENTS.md) | AI 开发、读写边界、多对话协作与交接规则 |
| [核心功能开发文档](docs/architecture/CORE_DEVELOPMENT.md) | Mermaid 人看版及开发者架构规格；承接原对话文档 |
| [内部数据契约](docs/contracts/CORE_CONTRACTS.md) | RAW、事件、场次、就绪与内部端口 |
| [公共 API](docs/contracts/PUBLIC_API.md) | REST、WebSocket、权限、错误、分页、续传、日志和指标 |
| [源码审计与迁移](docs/migration/SOURCE_MIGRATION.md) | SOURCE_INVENTORY、EXTRACTION_PLAN、COMPATIBILITY 集中维护 |
| [真实进度与交接](docs/progress/STATUS.md) | 里程碑、模块状态、验证证据与任务交接 |
| [决策记录](docs/decisions/DECISION_LOG.md) | 已定选择与待决策项，引用权威正文 |

这里的接口、目录和里程碑描述目标规范，不等于功能已可调用。没有第二份核心架构正文；原对话输出位置仅指向迁入后的权威文件。

## 实际项目结构

```text
LiveWorkBench/
├── .gitignore
├── AGENTS.md
├── README.md
├── package.json、package-lock.json
├── src/                          # 正式核心源码
│   ├── capture/、capture-bridge.js # 提取 C# 捕获 + RAW ACK IPC
│   ├── parser/                    # 官方 Parser，保留来源
│   ├── runtime.js、storage.js、session-manager.js
│   └── server.js、historical-source.js
├── public/                       # 非正式开发 GUI，仅经 Gateway
├── tests/、tools/                # 自动回归、构建、浏览器验证
├── docs/
│   ├── architecture/CORE_DEVELOPMENT.md
│   ├── contracts/CORE_CONTRACTS.md、PUBLIC_API.md
│   ├── migration/SOURCE_MIGRATION.md
│   ├── progress/STATUS.md
│   └── decisions/DECISION_LOG.md
└── references/                    # 本地只读，不纳入主 Git
    ├── DouyinBarrageGrab/
    ├── douyin-live-monitor/
    ├── douyinprotobuf/
    └── api-docs/Bark/、ntfy/
```

## 开发顺序

提取已有能力 → 解耦 → 重组 → 扩展 → 交付可运行核心；每阶段同时交付可执行验证和实际结果。

主要采集基础为 DouyinBarrageGrab，保留成熟 C#，结合 douyinprotobuf 官方解析实现。只做必要冒烟，明确失败再排查，不以完整原版验收作为所有开发的前置门槛。正式业务 GUI 后续建设。

下一段工程接入为真实 LiveHook 客户端路由与启动/重启观察，在用户授权环境后验证完整 HTTP/WSS；继续按契约补 daemon、人工 Source 切换及消费者，R01 只作为回归输入，不重复审计。现有场次、RAW 优先及回放隔离规则保持。

references 中源码和官方 API 文档已经存在，但本地存在、静态代码路径、实际运行通过是不同状态。详细证据与下一步见迁移和进度文档。

应用内 networkPolicy 支持 system/direct/custom，监控、目标解析、WSS 与浏览器共享策略。系统模式只读已有静态代理，自定义支持 HTTP/HTTPS CONNECT、SOCKS5 域名请求；直连拒绝 Fake-IP 并固定公共 DNS 地址，不修改系统环境。保存模式和独立诊断见工作台及 [NETWORK_TRANSPORT](docs/contracts/NETWORK_TRANSPORT.md)。

已有18783宿主需要更新时，用户可手动运行 `powershell -NoProfile -File tools/restart-dev-workbench.ps1 -ExpectedPid <界面PID> -ExpectedCommit <界面完整Commit>`。脚本先核对实际加载版本、PID、Node入口和采集STOPPED，再停止该自有宿主、沿用同数据目录于当前终端启动；状态变化时拒绝操作。它不由应用自动执行，不停止其他端口或修改系统环境。TLS模拟测试另需Python3及cryptography，可通过LW_PYTHON指定可执行路径；临时证书不进入系统信任。


观看账号现已收敛为一个登录身份，与所有直播间独立。账号页点击“登录抖音”，在正常 Chromium 窗口扫码，官方确认后自动保护保存并关闭临时窗口；重启可复用保存状态，当前有效性仍以官方确认结果为准。重新登录不覆盖尚未确认的新状态；“退出并清除登录态”同时清除文件、内存与对应记录，不停止当前采集，后续新连接可能需要重新登录。旧多个保存状态需明确选择保留一个，其余默认保留，清理需确认。

房间统一输入接受分享/完整 URL 与 web_rid:、uid:、roomId:、secUid: 等明确前缀；无前缀数字不会猜测类型。更换房间复用同一观看登录态，开始不同房间前确认停止旧监听再连接。可靠官方证据可展示目标 URL、身份与房间资料；无法确认的字段明确未知。见 [观看账号约束](docs/contracts/ACCOUNTS.md)。当前运行进程不会因代码更新自动重启；旧后端未加载新能力时界面提示安全更新并保留停止/诊断入口。
