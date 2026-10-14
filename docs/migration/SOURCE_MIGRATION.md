# 参考源码审计、提取计划与兼容性

2026-10-12；本文件集中承载 **SOURCE_INVENTORY / EXTRACTION_PLAN / COMPATIBILITY**，不另建等价报告。主架构见 [CORE_DEVELOPMENT](../architecture/CORE_DEVELOPMENT.md)，契约见 [CORE_CONTRACTS](../contracts/CORE_CONTRACTS.md)。

## 1. 状态与证据规则

`PRESENT` = 本地文件/仓库存在；`STATIC` = 已局部阅读到代码路径；`BASELINE` = 指定环境原版运行通过；`INTEGRATED` = 第一方适配及回归通过。M0/R01 旧证据保留。按最新用户指令，完整原版验收不再是所有工程的前置；已有首批 INTEGRATED 子能力，具体范围及未验证真实伴侣部分见 [STATUS 第11节](../progress/STATUS.md#11-首个可运行工程增量2026-10-12)。下文原版基线/审计章节属于历史记录，不要求重复开展。

首批迁移：`src/capture/BarrageGrab` 保留 HTTP/WS、protobuf-net 外层与 gzip，改第一方入口/loopback、关闭自动证书信任、移除可达系统代理/伴侣修改，早期 RAW ACK 后解包。明确修复 WS 握手识别及跨回调分片组合，已有受控网络回归。`src/parser` 提取 douyinprotobuf 的 parser/decode/wire/vendor，原文件 hash 不变；正式桥接在外层适配。成熟源码来源/commit/MIT 与官方资源 provenance 分别保留于 THIRD_PARTY_NOTICES、采集 LICENSE 及 parser/extraction.json。一次性提取工具拒绝覆盖后续第一方改造。

2026-10-13 P0-A 第一阶段：修复 Titanium 3.2.2-beta TLS 运行缺少 BouncyCastle.Cryptography 2.0.0 引用及 RSA PFX/CSP 兼容；保留原1.8.8并用alias隔离新引用。单个RSA文件CA/内存私钥签名、临时叶证书EphemeralKeySet、独立127.0.0.1:18827的HTTPS/分片WSS→RAW→C#→官方Parser→测试场次子能力已受控验证；不等于真实伴侣基线。具体工具、证据和未授权边界见 [第一阶段记录](../reviews/2026-10-13-livehook-stage1.md)，references 无改动。

后续PIPELINE增量：C#protobuf-net/GZip解包提到TransportUnpacker.cs，Node复用官方传输types/wire建立独立ProtoIndex，业务parseBusiness与ParserExtensions分开。Web适配v4保留原心跳/ACK/有限重连，注入仅传输packetDecoder；原live.js固定SHA不变、v2/v3保留，v4本地忽略。RawRecorder、缺口、总线/去重/事件存储、历史读模型/Replay物理工作区等为第一方封装，非重写原采集/重新启用原广播服务。进度与测试范围见STATUS14/PROCESSING_PIPELINE v1，真实环境授权没有扩大。

参考 README 的历史测试结论不是本次复验，不自动计入 LiveWorkbench 进度。代码存在也不证明当前伴侣/平台版本兼容，尤其进程恢复、HTTP 字段语义和完整 RAW。

## 2. 本地 references 快照

| 参考 | origin / 本地提交 | 存在与本次检查 |
|---|---|---|
| DouyinBarrageGrab | `https://github.com/ape-byte/DouyinBarrageGrab.git`；`c9343da287cf77ce637c11e32333b2a511cd62e9` | 本地 Git、README、工程与相关 C# 代码存在；局部 STATIC；工作树干净 |
| douyin-live-monitor | `https://github.com/joylyboy/douyin-live-monitor.git`；`167aa51a475bd87fffc04f0edd7a249b16cf9248` | README、monitor.py 存在；局部 STATIC；工作树干净 |
| douyinprotobuf | `https://github.com/Yellowii/douyinprotobuf.git`；`e9e6cec4a2076dc5aacf94a0ca85ede33274544c` | protobuf-live 的官方模块、Parser、采集、Journal 等存在；局部 STATIC；工作树干净 |
| Bark API | `references/api-docs/Bark/{tutorial,params,batch,API_V2}.md` | 四文件均存在，标题/参数段与正文检查通过；下载来源见本地 gitreferences.txt；不宣称远端最新 |
| ntfy API | `references/api-docs/ntfy/{publish,subscribe-api,config}.md` | 三文件均存在，发布/订阅/配置文档正文检查通过；同样不宣称最新 |

`gitreferences.txt` 是已有初始化脚本文本，本次只读，不执行下载/环境配置。它记录了计划来源，并不能单独证明下载成功；上述状态依据实际文件和 Git 元数据。

主仓库忽略 references，未跟踪其中任何文件。引用路径/行号以下均相对于本地参考仓库快照；仓库更新后需重新核对，不使用过期行号当证据。

## 3. SOURCE_INVENTORY：BarrageGrab

| 能力 | 本地证据位置 | 静态发现与限制 | 映射与建议边界 |
|---|---|---|---|
| 工程宿主 | `BarrageGrab/WssBarrageService.csproj` 的 TargetFrameworkVersion | 目标 .NET Framework 4.6.2；独立副本 Debug 构建退出 0、6 警告，见 6.1 | 先保留原宿主基线，运行/桥接技术待决策 |
| 代理与采集事件 | `BarrageGrab/Proxy/ISystemProxy.cs:10`、`SystemProxy.cs:76`、`TitaniumProxy.cs:705` | 有 WS/HTTP/伴侣 action 事件，proxy Start/Dispose；未验证当前系统效果 | 主要复用基础，Source 封装，RAW 优先观察早期入口 |
| Hook 设置 | `BarrageGrab/Utility/LiveCompanHelper.cs:148`、`:208` | 会读写伴侣 resources/app/index.js、备份并设置代理参数/改动检测相关逻辑；不是已验证的独立 daemon | 先评估安装版本、副作用与恢复；本次没有调用，不能视为可直接安全运行 |
| HTTP 生命周期 | `BarrageGrab/Proxy/TitaniumProxy.cs:227`、`:280` | create/anchor_finish_info 检查伴侣、HTTP 200 并生成 Action 1/2 | 提取为证据，不直接作为正式场次/通知 |
| create 解析结果码 | `BarrageGrab/Modles/RoomInfo.cs:617`、`:640`、`:665` | 合成输入复现：平台码 12345 仍返回本地 0；空 data/显示人数非整数可抛异常；IsLive 仅比较 data.status==2 | 复用房间解析，加校验；解析码≠平台业务码，创建≠实际推流 |
| WSS 原始入口 | `BarrageGrab/Proxy/TitaniumProxy.cs:632`、`SystemProxy.cs:76` | WSS decoder 后触发 bytes 事件；有帧重组处理 | 记录捕获边界；优先在该入口加 recorder；帧跨回调重组等需基线测试，不先定论 |
| HTTP 弹幕入口 | `BarrageGrab/Server/WssBarrageGrab.cs:137` | OnFetchResponse 的 payload 反序列化 Response 并调 DoMessage | Recorder 要早于这些解析/过滤；生命周期 HTTP 原始保存可能需另设观察端口 |
| 解压与 Protobuf | `BarrageGrab/Server/WssBarrageGrab.cs:87`、`:106`、`:125` | GZip、WssResponse/Response、实体消息解码；有格式/压缩检查及提前 return | 保留成熟传输处理，官方权威字段路线按契约适配；原始不能在 return 后才保存 |
| MsgId 去重 | `BarrageGrab/Server/WssBarrageGrab.cs:151` | method→List<long>，每种方法最多 300；未按主播/roomId 细分 | 改造上下文 key/状态边界；不承诺原 300 容量覆盖全部重传 |
| 类型映射 | `BarrageGrab/Server/WssBarrageGrab.cs:181` | switch 将支持 method 解码/发送到实体事件 | 用作业务参考；完整 RAW 与未知类型保存必须放在其前面 |
| 礼物连击 | `BarrageGrab/Server/WsBarrageServer.cs:359` | roomId/giftId/groupId 缓存，repeatCount-lastCount 作为增量，repeatEnd/乱序分支 | 复用语义并用真实连击/重连样本验证；不可每条累计再次相加 |
| WSS 下播 | `BarrageGrab/Server/WsBarrageServer.cs:547` | ControlMessage.Status==3，经房间过滤生成结束包 | 转结束候选，SessionManager 关联与幂等 |
| 下游 WS | `BarrageGrab/Server/WsBarrageServer.cs:78`、`:579` | 有 WS 服务、实体映射、过滤/广播；伴侣 action 的 MsgId 取当前 ticks | 可作兼容端；不是全量 RAW，也不能拿合成 MsgId 当场次幂等键；LAN 入口必须受控 |
| 网页无操作行为 | `BarrageGrab/Proxy/TitaniumProxy.cs:473` 及 README 更新/配置 | 有脚本 Hook 路径，README 声称维护无操作检测；本次未穷举脚本 | 仅网页路径参考，具体脚本/心跳需局部审计及运行验证；不套用于伴侣 |

许可证文件存在，BarrageGrab 的 LICENSE 标题为 MIT License。本次只记录文件观察，不完成所有依赖/素材/官方资源许可审计；提取时继续保留适用来源与许可证，不复制整仓进入主项目。

### 3.1 M0 局部复核新增事实

依据同一 commit 的原版程序集离线调用及静态路径，未修改第三方源文件；完整机器证据见 [M0-20261012.json](evidence/M0-20261012.json)。所有探针输入标为 `synthetic`，没有真实 RAW。

- `WssBarrageGrab` 字段初始化就构造 `TitaniumProxy`，后者 `:101` 调用 `TrustRootCertificate(true)`；不能用“只 new 一下采集器”作为无副作用测试。探针用未初始化对象，只配置方法所需内存状态，跳过全部代理/服务器构造和 `AppRuntime.Init()`。
- `TitaniumProxy.cs:632—688` 的入口提供 WebSocket decoder 后的 payload，既不是 TLS 字节也不是完整网络帧；`messageData` 在每次回调中新建，按 `OpCode.Continuation` 累积而未检查 FIN。跨回调/首帧+续帧行为仍须实际片段样本验证，不宣称已正确重组。
- HTTP fetch 的 `GetResponseBody()`→`:379` 事件保留的是代理库取得的响应主体；是否已做 HTTP content-encoding 解压尚未实测。create/finish 使用 `GetResponseBodyAsString()` 后直接解析，未输出生命周期原始主体的 recorder 端口。
- 原版没有“先持久 RAW 再解析”的实现。WSS 在进程、首字节 `0x08`、压缩头检查时提前返回；HTTP fetch 随后解码；方法去重在业务反序列化之前缓存 msgId。失败后相同 msgId 的有效重试也会丢弃。未知方法会占去重缓存但不会产生实体输出。
- 合成探针复现 method 内跨房间同 msgId 碰撞、msgId=0 合并、300 条淘汰后旧消息再接收。连接/sourceType 不在 key 中；同一对象保留内存状态与新对象重建状态的恢复效果尚未真实运行验证。
- 礼物 key 为 roomId/giftId/groupId，没有发送者；合成 `1→3→2→结束5` 仅输出增量 `[1,2]`，结束包先清缓存并 return；再次直接投递结束5 输出 5，总和变 8。两发送者使用相同 groupId 的合成输入发生碰撞。是否真实平台会出现这些组合、groupId 唯一域及超时后重传，仍需真实样本。不能据此自行定义正式业务规则。
- `ControlMessage.status=3` handler 直接重复调用会输出两次结束包；相同 MsgId 经原版上游可能去重，但 HTTP finish 与 WSS 结束之间没有场次幂等。create action 即使 `RoomInfo.IsLive=false` 也输出“开播”，同房间两次 action 输出两次并生成新的 ticks MsgId。必须交给 SessionManager 关联，不能沿用该输出作为正式开播事实。
- `common.roomId`（C# 属性）与官方 `common.room_id`（原生结果）在相同合成字节上均为房间 101；MsgId `9007199254740993` 通过官方输出精确字符串。这是字段对照，尚未验证中途接入/HTTP 补上下文/同场恢复。
- `WsBarrageServer.cs:78` 和 `TitaniumProxy.cs:110` 实际分别固定绑定 `0.0.0.0` 与 `IPAddress.Any`；所核查构造没有使用 `ListenAny`。`listenAny=false` 不能据此保证本机监听。下游 WS 仍受类型、房间、连击、pushFilter 等过滤，不能代替 RAW。监听/连接测试本次未运行。

## 4. SOURCE_INVENTORY：其他参考

| 参考位置 | 已见能力 | LiveWorkbench 使用边界 |
|---|---|---|
| monitor.py:248、:307、:341 | 页面/接口判断、RoomId 提取、UNKNOWN 返回路径 | 提取单主播本地 Web monitor；状态未知不按未播处理 |
| monitor.py:353、:361、:397 | 状态文件、批量目标、对比上次结果、直接 Bark | 状态观察与通知解耦；不迁入云端定时器/多房间调度，Bark 改统一 Dispatcher |
| protobuf-live/src/live.js:109、:120 | 二进制消息发 raw 事件后进入解码；WebSocket/ACK 等 | WebSource 与官方解析参考；raw emit 不等于持久化 ACK，不能直接宣称满足 RAW 门槛 |
| protobuf-live/src/parser.js:141、:370 | 官方模块/descriptor 加载与结构约束 | 保留官方基线、来源/哈希；不以人工 proto 替代权威字段 |
| protobuf-live/src/decode.js:50、:101、:210 | 业务/外层解码、压缩类型处理、heartbeat | 依据实际字节格式复用；心跳限定所属网页连接 |
| protobuf-live/src/journal.js:44、:58 | 有界保存队列、raw bytes+metadata 写入 | FileStorage 参考；确认 ACK/错误/退出排空与先保存顺序后再使用 |
| protobuf-live/README.md | RAW 模式、批量解析、历史测试/样本说明 | 本次未重跑，不将其数十项通过声明算主项目通过 |
| Bark API_V2.md / ntfy publish.md、subscribe-api.md | 推送请求参数和订阅形式 | 只维护本地 adapter；不合入对端服务；当前非完整 P0 实施 |

## 5. EXTRACTION_PLAN：按职责分类

| 分类 | 能力/模块 | 需要完成的工作与进入条件 |
|---|---|---|
| 复用 | BarrageGrab 原代理、Hook、HTTP/WSS、传输解包 | 原版基线通过后薄封装，保留稳定宿主；不得先重写 |
| 提取/封装 | LiveHookSource、WebSource、Listener、HTTP Evidence Extractor | 从已审计入口输出语言中立 CaptureInput/证据；保持原版兼容；不直接消费过滤后的 WS 作为 RAW |
| 改造 | RAW 记录门槛、上下文去重、连击、敏感日志与旧 WS 暴露 | 在原始入口先可靠记录；必要上下文/幂等；受控 Gateway；每项与原版对照 |
| 新增 | daemon 就绪/进程观察/诊断协调 | 复用已有重捕获能力，补齐状态及恢复协调；不重写代理、不自动切源、不从进程判开闭播 |
| 新增 | 独立 SessionManager | 状态轴、场次身份、证据去重、缺事件/恢复与核对策略 |
| 新增或整合 | EventStore、ReplayEngine、Gateway、LogService、MetricsService、开发 GUI | 契约明确后分模块实施；真实 RAW/分页/隔离/回归证据支持 |
| 后续预留 | ActionDispatcher、OBS/Stream Dock、Bark/ntfy 与业务服务 | 只留 ExternalIntegration 契约，不占 P0 采集/回放/历史任务 |

迁移顺序：建立不修改参考区的原版测试副本 → 记录环境和原版基线 → 完成能力映射与边界审查 → 冻结本次实现采用的契约版本 → 一次改造一条可验证链路 → 与原版比较 → 统一集成。

逻辑模块可在同一进程/程序集；是否提取成库、服务、sidecar 或进程间 IPC，需要基线和维护成本证据，不能按文档树机械切分。

### 5.1 M0 支持的边界与待审查候选

| 分类 | 本次证据支持的最小边界 | 尚缺门槛 |
|---|---|---|
| 复用 | .NET Framework 4.6.2 工程、现有 Titanium 捕获和传输解包候选；原版源码可构建，不需为能编译先迁移框架 | 当前伴侣真实 HTTP/WSS、退出恢复、证书及代理隔离运行 |
| 提取 | decoder payload/fetch body 的早期只读观察端口，HTTP 生命周期主体需在字符串解析前加独立观察点；附进程/连接/路径/状态元数据 | 确认字节边界/片段重组、范围过滤位置、持久 ACK，保留失败及重复 |
| 改造 | 平台码和字段形状校验、RAW 门槛、房间上下文去重、连击、loopback/敏感日志、旧代理配置恢复 | 真实样本、统一语义审核；不在 M0 改原版源码或公共契约 |
| 新增 | SessionManager、HookReady/进程观察/恢复协调和正式 Gateway | 原版 action 不足以充当权威场次；重启只改变 captureState |

宿主候选 A：保留 Windows C#/.NET Framework 薄采集宿主，通过受控本地 IPC 将已落盘 RAW 引用与元数据交给 Node 官方 Parser；本机具备两侧运行工具，合成 HTTP Response/gzip PushFrame 同字节对照可用。IPC、背压、ACK、故障恢复尚未实施，不开放旧内部 WS 给前端。

候选 B：审核后将成熟 C# 捕获层提取为库/同宿主组件，仍单独运行官方模块适配；需要把代理构造与证书/启动副作用分离。直接迁到现代 .NET 的 COM、WinForms、Titanium/Fody 兼容性未测；不因本机有 .NET 10 就自动升级。

候选 C：以官方模块/descriptor 的受审桥接避免长期双进程。当前官方参考执行器依赖 Node >=24、VM/JS 模块和 protobufjs；本次未证明可等价移植到 C#。手写 proto/原版旧实体只能用于传输/对照，不能取代官方业务权威。

以上都是交由主架构/集成负责人审查的候选，未冻结语言、宿主、IPC 或公共接口。源仓库 MIT 文件、70 个 NuGet 固定版本、官方模块 provenance 已定位；依赖/官方脚本再分发许可全审计仍未完成。

## 6. COMPATIBILITY：基线与回归计划

**实际原版运行基线：未执行。** M0 在主仓库外测试副本执行依赖还原、Debug 构建、合成输入离线探针和官方 Parser 部分离线测试；没有启动原版 Main/代理/捕获，未改系统代理/证书/伴侣安装文件或发送通知。参考仓库未修改，详见 6.1—6.4。

基线记录必须包括：参考 commit、依赖/框架、Windows/伴侣版本、代理/Hook 配置、证书/权限、原始格式、采集范围、退出清理与环境恢复。测试使用独立副本和明确的测试房间/已选真实 RAW，避免 references 被日志/依赖污染。

| 基线/回归项 | 输入与观察 | 通过标准 | 当前 |
|---|---|---|---|
| 原版可运行 | 指定宿主构建/启动与依赖 | 可复现启动/退出，依赖/配置记录 | Debug 构建通过；启动/退出未执行 |
| 顺序/伴侣恢复 | 代理先开、伴侣已开、同场崩溃重启 | 正确提示与重捕获证据；不凭进程终止场次 | 未执行 |
| HTTP 生命周期 | 真实 create/finish 响应及失败变体 | 解析码/业务码/创建/在播/推流语义分清 | 合成 create/action 观察已执行；真实 create/finish 未执行 |
| WSS/HTTP 原始完整性 | 支持、未知、失败、重复及片段包 | 原始入口均先落盘；缺口/字节边界可查 | 未执行 |
| 官方字段一致性 | 同一 RAW 经原版与官方 Parser | 官方为标准字段权威；差异保留，不双发业务 | 3 份合成对照；R01 的 14,588 个真实业务载荷与旧结果审计见 6.5，未作 BarrageGrab 全量对照 |
| 去重/连击 | 同 msgId、跨房间、跨连接、乱序/结束连击 | 不误合不同房间、不重复累计，原始全保留 | 原版合成局限已复现；R01 有真实连击，缺跨房间/跨连接/重传证据；未实施修复 |
| 原版下游兼容 | 常见实体、WS、停止/清理 | 输出兼容变化可解释；不泄露内部端口或凭据 | 未执行 |
| ReplayEngine | 指定真实 RAW 播放/暂停/单步/跳转/重建 | 正式库/通知/OBS/Stream Dock 全隔离 | 未执行 |
| Gateway/历史回滚 | 大量持久化事件、游标、WS 重连/分页竞态 | 无重复遗漏；前端有限缓存不跳底部 | 未执行 |
| 日志/指标/GUI | 错误样本、缺指标 provider、交互操作 | 脱敏日志可查；指标无伪造；GUI 可验证核心 | 未执行 |

下一步先完成上述原版基线与真实 RAW 边界，再决定提取宿主及 Parser 桥接。不要把本次静态审计写成“BarrageGrab 已充分验证且可直接拆分”。

### 6.1 可复现环境与执行证据（2026-10-12）

独立副本/完整日志：`C:/project/LiveWorkbench-baselines/M0-20261012/`。使用参考 commit 的 `git archive`，不复制嵌套 Git；没有首个主提交，因此未建 worktree，也未 stage/commit。这里只隔离源码/依赖目录及输出，**不是 VM 或系统环境隔离**。

环境：Windows 11 专业版 `10.0.26200` x64；Visual Studio Community 2026 `18.5.2 / 18.5.11723.231`；MSBuild `18.5.4.18101`；已装 v4.6.2 目标程序集，Framework 运行时 `4.8.09221 / Release 533509`；.NET SDK `10.0.203`；Node `24.15.0`、npm `11.12.1`、Python `3.12.10`。构建不依赖 PATH 上的 msbuild/nuget，用 VS 完整路径。`packages.config` 固定 70 个包（包含 net48 标注）；本次完整 Framework 构建及所调用方法能运行，不能外推所有 API 兼容。

| 等级/执行 | 可复查结果 | 证据 |
|---|---|---|
| 静态/环境 | 三个 commit 与记录一致；实际伴侣路径版本 13.0.5（注册表显示旧 11.9.5）；进程扫描未见伴侣，已有 WssBarrageServer PID 18644 占用 8827/8888；WinINET 代理启用，WinHTTP Direct | [环境、版本与完整性摘要](evidence/M0-20261012.json)；外部 environment.json |
| 原版构建 | Restore 退出 0；Debug Build 退出 0、6 警告（CS0168×3、CS0162、CS4014、CS0414）；PostBuildEvent 以参数置空，源文件未改；生成 WssBarrageServer.exe SHA256 `2123CAC0D4028964823F3BA841E168376924E241426CC89C75AB8A4365B0A967` | [本次构建日志](evidence/M0-20261012-build.log)；外部 restore.log |
| 原版离线方法 | 24 项合成输入行为观察，探针退出 0；记录的是当前行为，包括已复现缺陷，不代表迁移验收通过。探针编译有 CS1702 System.Memory 版本假定，沿用原版 config 的重定向后执行成功 | [探针源](../../tools/m0/OriginalOfflineProbe.cs)、[运行入口](../../tools/m0/Invoke-OriginalOfflineProbe.ps1)、JSON 的 originalOffline |
| 官方参考离线 | core.test.js + pipeline.test.js 共 8 测试、8 通过、0 失败；没有重跑其全部测试，也不引用历史 README 数量 | [测试日志](evidence/M0-20261012-parser-tests.log) |
| 同输入对照 | HTTP Response、gzip PushFrame、无 SeqID 的 gzip PushFrame 共 3 份合成字节；官方均读出 Chat/room_id/精确 MsgId。第三份原版首字节门槛丢弃、官方成功；2726 类型；两个 vendor SHA256 与 provenance 相符 | [对照入口](../../tools/m0/Compare-OfficialParser.mjs)、JSON 的 crossParser |
| 真实运行 / RAW / 集成 | **全部未执行**；已选真实 RAW 0，项目 samples/capture 和 samples/raw_packets 仅有 .gitkeep；没有有效真实输入覆盖或声称模拟为真实 | JSON 的 realRaw/neverExecuted；见 6.3 |

复现构建（先在全新外部目录归档同 commit，目录不得放入 references；以下 `$baselineRoot` 指该目录）：

```powershell
$baselineRoot = 'C:/project/LiveWorkbench-baselines/M0-20261012'
$buildTool = 'C:/Program Files/Microsoft Visual Studio/18/Community/MSBuild/Current/Bin/MSBuild.exe'
Push-Location "$baselineRoot/DouyinBarrageGrab"
& $buildTool BarrageService.sln /t:Restore /p:RestorePackagesConfig=true /p:RestoreSources=https://api.nuget.org/v3/index.json /p:NuGetAudit=false /v:minimal /nologo
& $buildTool BarrageService.sln /t:Build /p:Configuration=Debug /p:PostBuildEvent= /v:minimal /nologo
Pop-Location
& ./tools/m0/Invoke-OriginalOfflineProbe.ps1 -BaselineRoot $baselineRoot
node ./tools/m0/Compare-OfficialParser.mjs "$baselineRoot/douyinprotobuf/protobuf-live" $baselineRoot
```

官方测试依赖在独立副本以 `npm ci --ignore-scripts --no-audit --no-fund --cache <baselineRoot>/npm-cache` 安装；从 `protobuf-live` 目录执行 `node --test src/tests/core.test.js src/tests/pipeline.test.js`，TEMP/TMP 指向 `<baselineRoot>/temp`。`Compare-OfficialParser` 必须在依赖安装及原版探针后运行。原版 NuGet 包还原写测试副本 packages，本次首次还原也可能使用用户默认 NuGet 缓存；没有安装系统组件。新一轮可将 NuGet 缓存环境变量指向该轮外部目录。未执行在线漏洞审计，不能把 no-audit 解释为安全/许可通过。

### 6.2 启动副作用与具体回退方案（只审计，未执行）

| 范围 | 原版行为 / 当前证据 | 真实运行前的保护与回退 |
|---|---|---|
| 系统代理 | RegisterSystemProxy 改 HKCU Internet Settings 的 ProxyEnable/ProxyServer；Dispose 改为关闭且写 localhost；watchdog 在父进程结束后调用 WinApi.CloseSystemProxy，关闭并清空 Server。没有保存旧值。本机已有启用代理与正在使用的服务 | 先在受限本地位置按值名、原值、类型、是否存在备份 ProxyEnable/ProxyServer/ProxyOverride/AutoConfigURL；避免同时运行。清理主进程及其 watchdog 完成后，逐值恢复原值/删除本轮新增值，读回核对；不能只“关闭代理”代替恢复，不自动停已有服务 |
| 根证书 / 文件 | Titanium 构造读取/创建根证书、TrustRootCertificate(true)，SaveFakeCertificates=true、有效期 10 年。可能写测试工作目录 PFX/crts 与用户/机器证书存储；实际依赖落点尚未通过启动验证 | 优先可恢复的隔离 Windows 环境；启动前记录 CurrentUser/LocalMachine Root 等相关存储的 thumbprint 集合和证书文件，运行后比较，只回退明确由本轮新建的证书/文件。不得移除已有信任根。无权限/提示时由用户操作；Dispose 没有显式撤销信任 |
| 伴侣安装文件 | Hook=true 时读取 exe 相邻 resources/app/index.js；首次才建 index.js.bak；注入 proxy-server `127.0.0.1:<port>,direct://`，按两种正则替换完整性检查。当前 13.0.5 index.js SHA256 `F22238711C8C098972D2E2A550659923BA25FDEFF2BC9454050BB8E1CD9DFE56`，已有 .bak、已有 proxy switch、no-sandbox 匹配 1、两完整性正则匹配 0 | 不信任旧 .bak 是当前版本原文件，先另外备份本次 index.js 和 .bak 的精确字节及哈希；明确用户允许的安装版本和修改范围后才执行。只恢复本次备份，并确认伴侣未更新版本。不自动关闭/启动/重启伴侣 |
| 本地监听 / 采集范围 | 原版代理和 WS 固定 Any；现有 8827/8888 都由 PID 18644 占用；配置 ListenAny 不足以约束 loopback。进程过滤包含多个浏览器，capture 覆盖范围不是选定单房间的 RAW 策略 | 使用明确授权且网络受限的隔离环境/专用端口与进程范围；保持一个指定测试房间。没有此环境证据不启动。不要通过关闭防火墙解决 |
| 工作目录 / 退出 | 日志在 basedir/logs；可能生成证书等；Release 的 PostBuildEvent 包含删除 xml/pdb/pfx/crts，M0 已跳过。没有看到退出恢复 index.js 或证书的代码 | 原版正常退出、异常退出、watchdog 均须分别测；之后比对监听/进程/代理/证书/伴侣文件。仅凭 Dispose 代码不标清理验证通过；保留测试目录证据供复核 |

Hook=false、sysProxy=false 也不能消除构造阶段的证书信任与 Any 监听，不能作为本机安全启动证明。已完成独立检查后，真实运行还需要用户明确选择测试房间/环境，以及安装文件、代理、证书的具体操作范围。

### 6.3 上一轮真实 RAW 输入缺口（R01 选定前）

上一轮只检查本项目两个指定样本目录（均只有占位文件），没有扫描其他项目/私人目录，也未消费正在运行服务的 WS；该轮证据中已选 RAW 为 0。用户随后明确选定一个既有场次，R01 的有限只读审计见 6.5；不能继续用旧的 0 表示当前选定输入。

最小样本包需要原始二进制或保留 receive opcode2 的 HAR，以及来源/参考版本/采集时间、字节边界、进程/连接、已知房间上下文；HTTP create/anchor_finish_info 需要响应主体和 HTTP 状态/路径。Cookie/Token 不进入公开报告；原样敏感主体留在受限本地选定目录，若脱敏须另留原始哈希、转换说明，不能仍称原样字节。

| 需要覆盖 | 当前数量 / 未执行原因 |
|---|---|
| HTTP fetch 与 WSS 正常/重复/未知/失败/跨回调片段 | 0 / 无指定真实主体；尚不能验证字节边界与全量持久化 |
| create 成功/平台失败、anchor_finish_info、status=3 | 0 / 合成只证明代码行为，不证明平台语义、在播或实际推流 |
| 礼物累计/结束/乱序/重传，跨发送者与跨房间 | 0 / groupId 唯一域、最后增量及超时重传规则未定 |
| 同场伴侣退出/重启与重捕获、HTTP/WSS 同场重复证据 | 0 / 需要用户按代理先就绪→人工启动/重启的顺序提供运行环境与对应录制 |
| 原版 WS、正式 Replay/Gateway/存储隔离 | 未执行 / 未启动原版监听；第一方模块尚不存在 |

### 6.4 完整性与下一阶段最小任务

复核三个参考仓库 71/62/8 个已跟踪文件的 SHA256：0 变化、工作树均干净、commit 一致；主索引没有 references；原 staged `.gitignore` diff 与任务前相同，现有 unstaged `.gitignore`、README/AGENTS/architecture/contracts/decisions 的字节未改。只新增验证工具/证据并改 migration/STATUS；没有首提交、stage、commit、派工或消息其他对话。环境只读快照的证书集合摘要是在离线探针之后记录，**没有任务开始时的证书基线**，不声称已证明证书存储前后完全一致；本次没有调用其写入路径。

交接顺序：先补 M0 选定真实 RAW 与隔离原版启动/退出、伴侣恢复证据；再由负责人审核 5.1 候选。M2a 最小垂直链建议为“选定 LiveHook 早期端口→RAW 写入 ACK→官方 Parser→上下文去重→EventStore→状态/日志→仅经 Gateway 的开发 GUI”，生命周期先保留候选证据，正式场次转换交给独立 SessionManager。原版已有 WS 仅做兼容对照，不能跳过 RAW 门槛。本任务未进入这条功能链的编码。

### 6.5 R01：用户指定真实场次的有限只读审计

任务 `M0-R01-20261012`；样本别名 **M0-R01（暂定）**。唯一输入为用户在本 M0 对话明确给出的、2026-08-15 19:09 创建的场次目录；不把主播身份、平台房间 ID 或完整私人路径写入可版本控制证据。工具必须通过显式参数接收该目录，报告仅保存目录哈希、行号/seq、方法、字节哈希及脱敏统计。没有扫描同级场次、旧项目源码或其他私人目录，也没有修改或复制原始数据。

本节依用户要求，以原始字段编号、wire type、结构及取值对照为技术证据。当前官方模块与旧结果都是对照对象，业务命名差异不自动判错；官方结果保持原生，验证后的旧成果通过独立 Proto Patch / Dictionary Extension 迁移。未改变公共契约或实际实现 Parser 补丁。

#### 6.5.1 结构、来源与完整性

| 文件/目录 | 本次实际观察 | 范围限制 |
|---|---|---|
| proto/ | 14,588 个 .bin，64,337,001 bytes，单条 49—17,366 bytes；按 index.method 解码为**业务消息 payload**；根字段 1 为 Common 子消息，Common 方法与索引全匹配 | 不是完整 WSS PushFrame/HTTP Response/网络帧；没有 gzip/连接/原始 HTTP 主体证据。不能称为解析前全传输 RAW |
| raw_proto_index.jsonl | 14,588 行；seq 连续 1—14,588，无重复 seq/文件引用/method+索引 MsgId，无空/缺失/孤立 proto | 不含采集进程/连接/sourceEpoch/transport/字节边界、源校验和及采集程序版本 |
| json/ | 14,588 个 JSON，77,585,829 bytes；每条除汇总专有 json_file 字段外与 parsed.jsonl 对应对象一致 | 是旧派生输出，不是额外原始采集层 |
| parsed.jsonl | 14,588 行，53,109,444 bytes；与 index 的 method/MsgId/RAW 引用全一致；全部 json/proto 可关联 | 3,518 条 ts 比索引晚 1—10 ms，11,070 条相等；两个 ts 的确切阶段未记录，不当作断链或平台发生时间 |
| session.json | 778 bytes；archive.format=`livedash-compatible-session-v1`，rawProtoEnabled=true；createdAt 对应 2026-08-15 19:09:08.028（Asia/Shanghai） | 标题/主播/平台 ID 不输出；未提供采集来源、程序/字典/协议版本、在播/实际推流或结束事实 |

观察时间范围为 2026-08-15 19:09:08.326—2026-08-16 01:44:42.119（Asia/Shanghai，取记录 ts），不是已确认的直播起止。采集来源/程序版本/旧字典版本 **未知**；目录名和 archive 格式仅是归档线索，不能据此认定 BarrageGrab、LiveHook 或浏览器采集。

完整性检查：原始 Protobuf 外层及所遍历的已知子结构未发现截断、非法 wire、字段 wire type 冲突；map 项未作独立未知字段枚举。14,588 个载荷全部被当前官方参考模块解码，33 个方法均能解析。这证明当前样本语法/结构兼容，不能证明业务语义全部正确、采集无丢包、未预过滤、先持久后解析或 fsync 门槛。

两轮有目的的审计各自记录读前/读后全部 proto、json 和三个元数据文件的 SHA256/大小/mtime，内容及文件集合一致；源文件没有写入/复制。派生 JSON 只存统计和 Golden 定位/hash，没有原始字节、完整旧解析、昵称、头像、Cookie/Token。证据：[R01 机器审计与 Golden](evidence/M0-R01-audit.json)、[字段相关性复核](evidence/M0-R01-field-evidence.json)。

#### 6.5.2 实际方法覆盖、会员/星守护和连击

| 主要覆盖 | 数量 / 观察 |
|---|---|
| WebcastMemberMessage | 2,629；记录为进场类，不等同付费会员 |
| WebcastLikeMessage / RoomUserSeqMessage / RoomStatsMessage | 2,338 / 2,278 / 2,214 |
| RanklistHourEntranceMessage / InRoomBannerMessage / RoomRankMessage | 2,216 / 1,667 / 186 |
| ChatMessage / EmojiChatMessage / SocialMessage | 474 / 22 / 21 |
| GiftMessage / GiftPlayEventMessage / FansclubMessage | 252 / 8 / 16；粉丝团消息不自动等同付费会员或星守护 |
| RoomMessage / RoomDataSyncMessage | 150 / 76 |
| ControlMessage | 1；seq 14,587，字段 2 wire0 varint=3；旧 status=3，官方 action="3" |
| 其他方法 | 共 33 种，余项精确数量见机器证据 methods，包含榜单、抽奖、活动表情、特效和游戏信息 |

星守护：seq **1,601**（Golden G035）的 WebcastRoomMessage，在原始路径 **1.8.2**（Common.display_text.default_pattern，wire2 string）同时由旧/官方解出“成为”“星守护”两个词，模板 key=`live_signal_msg_special_key`，含占位符。只输出脱敏词组“成为…星守护”，不输出模板中的用户参数。已确认的是**平台样式房间消息含该模板**；付费成功、会员期限、权益、价格、续费与成员身份/账本事实仍待人工/其他证据核验。

显式“会员”词样本未发现；旧 user.subscribeStatus、badgeFlags、badgeList 等仅是旧命名/字段候选，未把其值解释为付费状态。Fansclub action/text 有覆盖，但通知的细分业务含义未冻结。

礼物：repeat_count（根字段 5，wire0 int64）范围 1—52；repeat_end（字段 9，wire0 int32）在 74 条出现 1，另外 178 条未出现该字段、官方默认 0。以 raw Common 房间/gift_id/group_id/user.id 作诊断分组，共 146 组、76 组多条、74 组含结束标记；本样本没有累计倒退，74 次相同累计值为结束相关重复。所有结束都与组内上一条累计相同，没有“结束时增量更大”或“首次只收到结束”。最长同组相邻记录间隔 5,173 ms，未超过原版 10 秒缓存窗口；分组最大累计值之和 394 仅为字段诊断，**不是交易/礼物结算**。不能据此覆盖乱序、重传、超时清缓存、跨连接、跨房间或同一组跨发送者情况。

控制消息可做结束候选字段验收；没有 HTTP create/anchor_finish_info、伴侣/推流观察与权威场次状态，不能把它单独标为 SessionManager 生命周期通过。

#### 6.5.3 新旧差异分类与独立迁移边界

当前对照版本：douyinprotobuf commit `e9e6cec4a2076dc5aacf94a0ca85ede33274544c`，Node 24.15.0，2,726 类型；两个 vendor 文件哈希与 provenance 相符，来源记录捕获于 2026-10-07。样本记录于 2026-08-15/16，版本间隔也可能影响命名；未联网替换 Parser。旧字典源文件不在本次授权目录内，因此“相关值匹配”不自动成为旧字典字段号的最终证明。

| 分类 | 原始技术证据与对照结果 | 迁移处理 |
|---|---|---|
| 字段别名（确认） | Common 字段 2 wire0 uint64/int64 字节可精确读出 MsgId；旧 common.msgId 的 14,217 个可用值全部一致。roomId/room_id 与相应 Common 字段 3 一致；Gift repeatCount/repeat_count 等 camel/snake 名称可对照 | 在独立 Dictionary Extension 做名字/整数字符串归一化，不改原始字节或官方字段 |
| 字段别名 / 身份命名（确认取值，语义待定） | 旧 user.idStr 是非数字字符串；5,535 个相关可用用户结果与 **User 字段 73 wire2 string（官方 webcast_uid）** 一致，不等于 User 数字 id，也不是当前原生 id_str（字段 1028） | 可保留 legacy.user.idStr→webcast_uid 别名来源；两个身份域不可互换，禁止覆盖 native id/id_str |
| 业务命名（待确认） | RoomStats 旧 fanTicketCount/enterCount 与当前 #2/#3/#5/#9 的值都相同，来源不唯一；旧 giftDiamondCount 与 #6（display_version，wire0 int64）一致；followCount 与 #10（display_type，wire0 int64）一致 | 保留 legacy 名字和相关性，不能凭旧“钻/关注”等名称计算收益或权益；需要旧字典来源/业务解释 |
| 自定义扩展候选 | 旧 Text.piecesV2、badge/subscribe/team/secUser 等命名，及额外根 roomId/eventTime 可能是重命名、投影、渲染或上下文增强；本次没有发现已遍历结构中官方未声明的字段号 | 不机械按 officialOnly/oldOnly 判错；逐项给源字段号/转换与语义证据后，才进入版本化 Proto Patch 或 Dictionary Extension。本次未确认“官方缺失字段”的实际 Proto Patch |
| 缺失（确认输出覆盖） | 旧结果 364 条 _error（Member 187、RoomUserSeq 133、RoomRank 30、Chat 13、RoomIntro 1）及 7 条 _unknown（ActivityEmojiGroups 1、AssetEffectUtil 2、HotChat 2、GiftSort 2），对应 .bin 都存在，当前模块均解码 | 旧错误不能当作 RAW 丢失；保留失败标记/字节与新结果分别。恢复旧丢失字段属于解析覆盖改进，不证明所有新语义正确 |
| 同名冲突（确认来源差异） | 旧 Common.priorityScore 的 4,858 个值全部等于原始 **1.10**（当前 anchor_fold_type），全部不等于 **1.11**（当前 priority_score）。原生字段号不同 | 独立 legacy extension 可保留 field10 的旧名字，明确原始来源；不覆写官方 priority_score，业务含义先人工审核 |
| 同名冲突（确认值域） | Gift 旧根 roomId 的 247 个值全部等于根 **33 wire0 int64**（官方 send_time）；seq62 是 13 位整数，与 Common 字段3的19位房间 ID 不同 | 房间关联只用已验证 Common 上下文；保留 legacy 字段33映射，不能按旧根 roomId 关联房间。时间单位/旧意图仍待核验 |
| 待确认（两套 MsgId） | 索引与 parsed 顶层 MsgId 相同，但与原始 Common MsgId 在 4,968 条不同，恰为全部 RoomUserSeq 2,278、RanklistHourEntrance 2,216、Chat 474；旧可用 common 的 4,822 对差异均不是 ±2,048 内或相同 double，不能简单归因浮点舍入 | 两个 ID 分别保留；缺外层 Response/采集代码，不能断言索引就是外层 ID或任一方错误。去重选择需明确来源；14,585 个索引数超 JS 安全整数，本工具按原词法字符串保精度 |

自动匹配列表中的 valueConflictCandidates、oldOnlyCandidates、officialOnlyNonDefaultCandidates **只是候选**；官方默认值可能根本没有在 wire 上出现，数组/map/投影也可能改变层次。不得把整张候选列表当作已确认错误表。比如旧 idStr 与默认空的原生 id_str 不同，但其实际有效来源是字段73，不能据此删除旧成果。

下一阶段补丁提案只包括证据已足够的别名和显式 legacy namespace，记录 sample/hash/字段路径、适用版本及测试：Control #2 的 status/action 兼容命名；Common/礼物 camel/snake；User #73 的旧 idStr；冲突字段保留旧源号而不覆写 native。会员候选的中文映射作为 Dictionary Extension，保持“文本观察/业务推断/人工确认”分层，不直接触发权益、账本、通知。尚未实施，也未批准公共字段含义变更。

#### 6.5.4 Golden 清单、重复验证与缺口

59 个 Golden 定位项覆盖全部 33 个方法、旧错误/未知、不同礼物累计值、星守护和 Control；只保留 seq/索引行/旧解析行、方法、RAW SHA256、payload 长度、根字段号/type、旧/新结果哈希和类别，不复制 RAW/旧 JSON。G001/seq1 普通房间，G002/seq2 旧错误，G004/seq5 旧未知，G006/seq7 RoomStats 命名，G008/seq10 Common/User 别名与冲突，G009/seq13 两套 MsgId，G018/seq62 礼物房间字段冲突，G019/seq98 粉丝团，G035/seq1601 星守护模板，G059/seq14587 Control。

| Golden 验证层 | 可重复断言 | 本次结果 |
|---|---|---|
| RAW/关联 | seq/方法/索引行匹配；原字节 hash/根 wire hash 不变 | 59 项复跑通过 |
| 原生解析 | 固定 vendor 哈希下的 status 和原生结果 hash 匹配，精确整数不被 JSON Number 舍入 | 59 项复跑通过；全 corpus 解码 14,588 |
| 旧输出 | 旧行号及 parsed 对象 hash 匹配；全 corpus json 叶子与汇总对应 | 59 项复跑通过；全 corpus 叶子对照 14,588 |
| 业务事实 | 已确认字段值、路径、模板词组及连击数字结构 | 本节逐项记录；不把类名/模板当支付事实 |
| 旧推断 / 人工核验 | 用户 ID 空间、会员/星守护付费/期限/权益、RoomStats 名字、冲突字段意图、两套 MsgId 来源 | 尚未确认，不设虚假通过断言 |

复查入口：[Audit-SelectedSession.mjs](../../tools/m0/Audit-SelectedSession.mjs)。在主仓库中给 `$selectedSampleRoot` 赋用户已选的唯一目录，使用原独立 Parser 副本：

```powershell
$parserCopy = 'C:/project/LiveWorkbench-baselines/M0-20261012/douyinprotobuf/protobuf-live'
$reportFile = 'C:/project/LiveWorkBench/docs/migration/evidence/M0-R01-audit.json'
node ./tools/m0/Audit-SelectedSession.mjs $selectedSampleRoot $parserCopy $reportFile audit
node ./tools/m0/Audit-SelectedSession.mjs $selectedSampleRoot $parserCopy 'C:/project/LiveWorkBench/docs/migration/evidence/M0-R01-field-evidence.json' inspect
node ./tools/m0/Audit-SelectedSession.mjs $selectedSampleRoot $parserCopy $reportFile verify
```

工具禁止报告写入样本目录，拒绝逃逸的文件引用；JSONL 流式读，不把全文放入 AI 上下文；`audit` 是选定场次内的全关联/结构统计，`inspect` 是字段相关性，`verify` 只重验 59 条 RAW 与对应旧结果。source 文件均以读方式打开。没有执行旧项目/通知/设备/实时网络。

未覆盖：完整传输 RAW、gzip/HTTP fetch/create/finish、重复包保存与持久 ACK、独立采集源身份/version、字典源文件/version、跨房间/连接/恢复/乱序/连击超时、真实业务会员权益、正式 ReplayEngine 或 SessionManager。已存在一个结束候选，仍缺开播/HTTP/推流及同场恢复证据。**M0 未完成**；下一步先按本 Golden 做独立别名/冲突隔离设计审查，生命周期另补选定真实输入，不为缺失开播而否定当前互动样本的测试价值。

## 2026-10-13 Profile/Monitor迁移增量

聚焦复用：douyin-live-monitor@167aa51 的monitor.py get_live_via_page/get_live_via_api用于输入语义/状态证据参考；未导入ab_sign、通知、房间清单或凭据。新targets/monitor适配器独立、结构化匹配，未知不猜测。真实页面形态与UID映射未验收。

douyinprotobuf@e9e6cec的BrowserLive/AccountMonitor/createLoginContext经tools/setup-browser.mjs四固定哈希准备至忽略的src/parser/browser-vendor，不覆写已有parser/paths.js。本地v3只改准备钩子/目标匹配/RAW后解析与诊断边界；官方页面SDK拥有签名/心跳/ACK。新BrowserSource/媒体策略/DPAPI/login API属第一方；原浏览器资源不因复用获得公开再分发授权。Web直连原live.js保留，v5增加每次连接新参数回调，未补不存在的签名算法。

2026-10-13独立账号增量复用同一AccountMonitor/createLoginContext，第一方LoginBrowserSession仅持有独立官方首页窗口与受控网络策略，LoginManager负责官方确认后按用户opt-in自动DPAPI保存/窗口释放及共享引用。没有调用上游.env明文保存类，不改四原资源，未另复制SDK/签名实现。接口/证据见ACCOUNTS与STATUS17；真实扫码和平台动态连接发现仍待，不把合成官方响应当真实鉴权通过。

合成验证位置：tests/monitor、profile-api、coordinator、automatic-source、browser-source、hook-profile、monitor-session.test.js；实际Edge网络事件/回环WS/DPAPI属于受控离线集成，不是平台生产验收。完整状态与剩余项见STATUS第15节。

## 2026-10-14 原生 WSS 参数补齐

| 能力 | 来源与负责位置 | 验收范围 |
| --- | --- | --- |
| 真实 HTTP 房间/观看设备身份 | 官方当前 Pace/Next 数据；第一方 http-room-discovery.js、native-parameters.js，复用既有 TargetResolver/SafeDouyinHttp 和观看 vault | 当前目标独立 HTTP → Node WSS，无 Chromium；不是主播 UID 替代设备 ID |
| 每次连接动态签名 | saermart/DouyinLiveWebFetcher@40a904bdb0561a5a9c958a95634a29681cc4fbf4/sign.js；哈希/本地忽略/准备入口见 THIRD_PARTY_NOTICES；第一方 native-signer.js | 平台接受初连与参数刷新后的重连；不复制旧例的固定 cursor/internal_ext/身份，不上传签名脚本 |
| 原生接收/心跳/ACK/RAW | 继续复用固定 douyinprotobuf LiveClient raw-first-v6、现有 RAW/官方 Parser/Proto/EventStore | 实际 ACK/heartbeat、RAW/Proto 增长、unknown-range 中断记录；核心模块没有重写 |
| 后台兜底、媒体与回收 | 既有 BrowserLive v5 + 第一方 BrowserSource/LiveStreamPolicy/SourceController | 真实流请求拦截14次；该目标无头 SDK 空体仍失败；串行暂停其 context，真实原生恢复稳定后关闭独占进程 |

本轮实时与合成证据在 STATUS 27 分开。不同目标、长期挂机、平台后续签名变化与所有流协议逐型实测尚未完成；不扩大 M0/伴侣恢复的通过范围。references 未变更。
# 2026-10-14 官方消息展示规则转写

用户指定 cdn-chunks-20261008 的8个Webpack插件、3个辅助块与7份CSS通过已有清单定位。只读静态核查，不运行第三方分块，不下载/提交原JS/CSS/资源；21份指定输入（包含3份清单/分析文档）哈希和定位记录在 [message-plugin-sources.json](message-plugin-sources.json)。规则、字段、中文解释、未确认依赖见 [转写记录](../reviews/2026-10-14-message-mappings.md)。

实现为第一方src/messages与独立简易页面，纯查询转换复用现有官方Parser反射/事件/RAW/Proto索引，不移植播放器、Worker、活动接口或完整插件系统。礼物目录与分类函数未闭合，不建立固定礼物ID/价格表；表情目录未获取，不猜资源映射。原生字段保持事实，未知枚举/依赖显式标注。真实事件抽样与合成GUI验证在STATUS28分开记录，不将静态源码视为业务验收。
