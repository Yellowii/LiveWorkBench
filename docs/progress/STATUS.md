# 全局进度与任务交接

最新交接：2026-10-15 P0 见第30节；正在隔离环境进行六小时测试，正式 18783 未启动。旧章节仅描述当时验收。

更新：2026-10-12。此文件是主项目真实状态的唯一台账；架构/契约正文在各自权威文件，不在此重复。

## 1. 当前事实

- 用户确认以本对话原文档为修订来源，迁入 `docs/architecture/CORE_DEVELOPMENT.md`；原输出位置改为指引。
- 修订前主根只有 `.gitignore` 和 `references/`，Git 分支 main 尚无提交，`.gitignore` 已由用户阶段暂存；主项目没有核心源码。
- 三个参考 Git 仓库与 Bark/ntfy 本地文档存在；既有 M0/R01 审计保留，不重复开展。最新用户指令取消完整原版验收作为全部开发前置门槛。
- 已建立正式核心源码、采集宿主、Gateway 与简易 GUI；首增量及运行验证见第11节。其他章节的“未开发”是历史交接状态，不能覆盖第11节当前事实。
- 上一轮文档修订没有安装/运行；本轮 M0 在主仓库外还原依赖、构建并调用原版离线方法，未启动原版 Main/代理或操作证书/伴侣安装文件，未发送通知，未开发核心功能。

## 2. 状态口径

未开始 → 设计已记录 → 静态已核查 → 开发中 → 实现待验收 → 验证通过。各状态属于不同证据等级，不必每个模块都按同一线性序列；运行通过必须记录实际输入、环境、版本、执行结果与报告位置。

| 模块/工作 | 当前状态 | 证据 | 未完成部分 |
|---|---|---|---|
| 架构/协作文档修订 | 已完成文档调整；校验结果见本次交接 | 核心文档、AGENTS、契约、决策 | 不代表代码完成 |
| references 核查 / M0 | 开发中；静态、构建、合成离线与 R01 业务载荷审计有结果 | SOURCE_MIGRATION 3.1/6.1—6.5、M0/R01 证据 | 原版启动/退出、完整传输 RAW、伴侣恢复未执行；来源/许可全审计未完成 |
| 源码能力映射 | 首批已提取 | src/capture、src/parser、THIRD_PARTY_NOTICES | 按下一实际需求增量提取 |
| 技术栈/宿主/IPC | 首增量已实施 | C# Framework + RAW ACK IPC + 官方 Node Parser/SQLite | 完整进程恢复/升级部署 |
| LiveHook/Web Source | 两来源受控测试及人工切换通过 | C# HTTP/WS/分片；Web RAW优先/ACK；版本竞争/GUI切换 | 真实伴侣路由/授权证书、真实网页鉴权/重连 |
| RAW Recorder/FileStorage | fsync/SQLite FULL/ACK 及失败阻断通过 | tests/core、capture | 崩溃孤立文件恢复、保留策略/磁盘预算 |
| Parser/补丁/Dedup/连击 | 官方 Parser/上下文持久去重已接入 | 产品 Golden 59/59；精确 ID/重复/未知测试 | 连击结算、完整补丁版本系统仍未实施 |
| LiveHookDaemon | 只读进程观察、先后顺序和退出/重启诊断已接入 | C# --observe；daemon 4测试；GUI 实测 | 实际 Hook 就绪探针、自动恢复本项目捕获端/客户端路由验证 |
| SessionManager | 连续性/重复证据/捕获上下文补全已验证 | 重启/切源保留scene；缺room仅继承同捕获证据；推流UNKNOWN | 真实 HTTP 语义、漏事件/同 room 复用 |
| EventBus/EventStore | Node 增量总线 + SQLite 事件库已实现 | 跨重启去重、快照游标、域隔离 | 正式消费者/outbox/独立业务出口 |
| ReplayEngine | 播放/暂停/单步/停止/跳转重建已实现 | API 并发版本与 GUI 单步/seek | 检查点、按采集时间调度；当前固定间隔倍速 |
| Gateway/开发 GUI | 首个可运行子集与浏览器测试通过 | tools/verify-workbench.mjs；API 认证测试 | 完整 API/RBAC/LAN/WS 高水位恢复 |
| LogService | 结构化/过滤/签名分页/受认证脱敏导出及GUI通过 | tests/observability；verify-observability | 旧日志结构迁移、完整trace模型/保留预算 |
| MetricsService | 解析/去重/事件/捕获计数、本进程 RSS 已实现 | metrics/modules、processes | 整机/GPU/历史 provider 未实现 |
| 弹幕无限回滚 | 签名快照分页、可见行/500缓存、上翻锚点、断线补查已实现 | history测试；160条GUI恢复 | 长时间/大于500缺口、保留期/多设备压力 |
| ExternalIntegration/业务 | 后续预留 | 核心 B3/公共契约边界 | 不纳入当前 P0 实现完成率 |

## 3. 里程碑与依赖

| 阶段 | 范围 | 进入/完成门槛 | 当前 |
|---|---|---|---|
| M0 | 能力审计及原版运行基线 | 局部源码位置+完整环境/原版运行/真实 RAW 证据 | 开发中；环境/Debug 构建/合成及 R01 业务载荷离线已执行；原版运行/完整传输/恢复门槛未达成 |
| M1 | 映射、边界、契约与技术栈 | 负责人审核基线差异、复用边界、宿主/桥接、采用契约版本 | 文档草案已记录；下一步先审查 R01 离线适配/验证台范围；整体实时决策未冻结 |
| M2a-O | 离线最小链与简易验证台 | 真实 Golden→官方解析→隔离事件库→Gateway→GUI | 首增量验证通过，59/59；不代表实时生产验收 |
| M2a | 最小垂直链与开发 GUI | LiveHook 接入→RAW ACK→官方解析/去重→事件存储→状态/日志→GUI | 源码已运行；受控 HTTP/WS/分片链通过，实际伴侣待授权 |
| M2b | 独立场次、Web 人工切换、Replay、历史回滚、基础指标 | 模块真实输入与接口验证 | Replay/历史/最小场次/基础指标已接；Web/完整恢复待开发 |
| M3 | P0 集成与回归 | 迁移 COMPATIBILITY+核心 B18+公共 API 验收通过 | 未执行 |
| 后续 | 完整性能监控、正式 GUI、通知/设备/业务 | 不挤占 P0；独立规则和契约审查 | 预留 |

下一步继续实际工程：在用户授权具体 TLS 证书与客户端路由/重启范围后接入真实 LiveHook，并补 daemon 观察/恢复及人工 Source 切换。不会重新审计 R01 或等待完整 M0 才写其他核心代码；未获环境授权时可继续开发 Web/事件消费者的可测试部分。

## 4. 当前待确认技术问题

1. 原版 Debug 构建已复现；真实启动/捕获设置/退出恢复仍待验证。实际伴侣 13.0.5 与旧卸载记录 11.9.5 不同，已有弹幕服务和系统代理不能被覆盖。
2. C# 宿主/IPC 与官方 Node Parser 已接通；剩余为完整 daemon 恢复、启动/部署和异常补偿。
3. create 的解析结果码与平台码、在播/推流证据语义；漏上下播、同 RoomId 复用策略。
4. RAW durability、文件/事件库一致性、录制/事件/日志保留策略与敏感信息保存边界。
5. 去重容量、无 MsgId、连击乱序/结束、跨房间与恢复情况。
6. SQLite EventStore 与快照分页已接通；剩余跨场语义、游标签名/有效期与 WS 高水位续传。
7. LAN 认证部署、GPU/显存等实测 provider；未实施能力不得伪报可用。

这些未定项不影响文档交付，但限制下一阶段的自动行为；不能用猜测填补。

## 5. 上一轮文档修订交接（保留）

任务：修订权威核心文档、参考迁移策略、契约及多对话规范；不开发功能。

变更：核心文档从原输出迁入并升 v1.1；主根 README/AGENTS；contracts 两文件；migration/progress/decisions 各一文件；`.gitignore` 保留原 `/references/` 并明确第三方源码/文档/嵌套 Git 的只读说明。

验证结果：8 份第一方 Markdown 的 UTF-8/结构校验通过，19 处本地链接有效；人看版 12 图、全文 13 张 Mermaid 均解析和渲染成功，并抽查数据流与场次图可读性。`git diff --check` 退出码 0；六个 reference/嵌套 Git 路径命中忽略规则，8 份第一方文档均未被忽略；主索引无 references 文件，原 staged `.gitignore` 内容保留。三个参考仓库的 commit 与最初观察一致，工作树均干净。旧输出位置已无竞争性架构正文。以上仅文档/静态核查，不代表功能验收。

未执行：编译、运行基线、实际捕获/HTTP 字段复验、真实 RAW Replay、API/GUI/功能测试。没有开启其他模块对话、派工、stage/commit 或修改 references。

下一任务建议：在独立测试副本建立 BarrageGrab 原版 Windows 基线，记录依赖/代理/Hook 与真实 RAW；完成 create/finish/连击/恢复证据后冻结提取及桥接边界。

## 6. 后续任务交接最小字段

每个模块任务在本文件更新自己的状态，交接保留：taskId、owner/负责对话、允许写路径、依赖契约版本、变更文件、实现证据、实际验证和未执行项、问题、公共契约变更提案、下一步/交接对象。负责人统一更新全局里程碑，不另起一份竞争性总进度表。

## 7. M0 本次交接：原版构建与离线验证（2026-10-12）

- taskId：`M0-20261012`；owner：用户指定的本 M0 负责对话；交接对象：发起此任务的主架构/集成负责对话，未自动发送消息。
- 状态：**开发中，M0 未完成**。原版启动/退出、真实 RAW 与恢复门槛均未达成；没有 BASELINE/INTEGRATED 模块，未把参考 README 历史测试算作本项目结果。
- 允许写入/实际变更：`docs/migration/SOURCE_MIGRATION.md` 对应审计/提取/兼容章节；本文件；`tools/m0/OriginalOfflineProbe.cs`、`Invoke-OriginalOfflineProbe.ps1`、`Compare-OfficialParser.mjs`；`docs/migration/evidence/M0-20261012.json`、`M0-20261012-build.log`、`M0-20261012-parser-tests.log`。独立测试副本、依赖与原始日志保留在 `C:/project/LiveWorkbench-baselines/M0-20261012/`，不在主 Git 内。
- 依赖契约：CORE_CONTRACTS 0.1、PUBLIC_API 0.1 文档基线、核心 v1.1；未改公共接口、决策或其他模块。

实际验证与可复查输入：

| 检查 | 本次结果 | 证据 / 复现 |
|---|---|---|
| Windows/构建工具/伴侣 | Windows 11 `10.0.26200` x64；VS `18.5.2` / MSBuild `18.5.4.18101`；Framework 4.6.2 targeting pack 与 4.8 运行时；Node `24.15.0`；伴侣实际 13.0.5，旧注册表 11.9.5；现有服务 PID 18644 占 8827/8888，WinINET 代理已开启 | [M0 证据](../migration/evidence/M0-20261012.json)、SOURCE_MIGRATION 6.1 |
| 原版独立副本 | 三个参考 commit 再核对；git archive 到主仓库外，未复制 .git；70 个 NuGet 固定包还原退出 0；Debug 构建退出 0、6 警告；未改原版源码，跳过 PostBuildEvent 清理 | [构建日志](../migration/evidence/M0-20261012-build.log)、迁移 6.1 的完整命令 |
| 原版方法离线 | 24 项合成输入行为观察，探针退出 0；确认平台码被忽略/错误形状异常、跨房间去重/0/300 淘汰/失败重试、gzip/HTTP、连击、重复状态 action | [探针](../../tools/m0/Invoke-OriginalOfflineProbe.ps1)、JSON originalOffline；异常行为是已复现缺陷，不是功能验收通过 |
| 官方 Parser | 仅 core/pipeline 8 测试、8 通过、0 失败；3 份同字节合成输入对照，精确大 ID/common.room_id；无 SeqID 帧原版丢弃而官方解码；2726 类型、两 vendor 哈希匹配 provenance | [测试日志](../migration/evidence/M0-20261012-parser-tests.log)、[对照工具](../../tools/m0/Compare-OfficialParser.mjs)、JSON crossParser |
| 参考区与原有工作 | 三参考 71/62/8 个跟踪文件 SHA256 均不变，Git 工作树干净；原 staged `.gitignore` diff 保留；未改原有 unstaged `.gitignore` 和非本任务文档；未 stage/commit、派工或消息其他对话 | JSON referencesIntegrity/existingIndexPreserved；独立目录保存任务前文件哈希及 staged diff |

未执行：原版 Main/代理/证书信任/监听；真实 HTTP/WSS、create/anchor_finish_info/status=3 录制；下游 WS 连接；伴侣人工启动/退出/重启后的捕获恢复；RAW 持久 ACK/片段/同场幂等；第一方 Replay/Gateway/GUI/功能集成；完整依赖许可与在线漏洞审计。项目两个 RAW 样本目录只有 .gitkeep，真实已选样本 **0**；已询问明确样本位置，本次交接未收到，不扫其他服务或私人目录。

发现与影响：原版构造就可能写入/信任证书；代理与 WS 固定 Any；默认端口已被现有服务占用；退出及 watchdog 不恢复原代理，Hook 修改 index.js 不自动还原，现有 .bak 不能证明对应当前版本。合成探针还复现 create 未在播仍输出开播、重复 create action 生成不同 ticks、连击结束增量丢失及清缓存后重计。详细副作用范围、按原值/类型/存在性恢复代理及按本轮备份/新增指纹回退文件/证书的方案在 SOURCE_MIGRATION 6.2，均未执行。不声称本机现状可安全启动原版。

待输入/决策：明确的一组真实 RAW 与来源/版本/元数据；一个测试房间和可恢复的隔离 Windows 运行环境，或用户明确允许的代理/证书/安装文件操作范围；用户人工按“代理就绪→伴侣启动/重启”配合。同场身份/实际推流/platform status 语义及 groupId 唯一域仍待真实证据；宿主/官方 Parser 桥接只提出候选，不冻结接口。

交接校验：两份修订文档 UTF-8/代码围栏及 14 个本地链接检查通过；证据 JSON 可解析，24/8/3 项计数与执行结果相符；原有非本任务文件及 141 个参考文件哈希复核通过；working/cached `git diff --check` 均退出 0，新增工具/JSON/日志未被忽略。探针拒绝主仓库根作为输出目录的保护验证通过；最终再运行仍为 24 项观察、0 探针失败。离线后记录的代理状态、index.js 与两 Root 证书集合摘要在最后核对时一致；这仅覆盖快照之后的区间，不能补出任务开始前的证书证据。以上仅交付/静态完整性验证，不证明真实运行。

下一步：先补齐上述 M0 实际运行与真实样本矩阵，再统一审查 SOURCE_MIGRATION 5.1 的 C# 薄采集宿主+官方 Node Parser 等候选。后续 M2a 的最小链建议为早期采集→RAW ACK→官方解析→上下文去重→EventStore→状态/日志→Gateway 开发 GUI；本轮没有实施功能链。文档和辅助工具交付不能把 M0 标为完成。

## 8. R01 交接：用户指定真实场次有限审计（2026-10-12）

taskId：`M0-R01-20261012`；owner：本 M0 负责对话；交接对象：用户/主架构集成负责对话，未自动消息其他对话。唯一私人输入为用户指定的一个既有场次，暂定别名 **M0-R01**；不扫描同级/其他私人目录，不读旧项目源码，不修改或复制原数据。依赖核心 v1.1、contracts/API 0.1，依用户本次要求按原始字段技术证据对照新旧命名；未修改公共契约、官方 Parser 或实施功能/业务补丁。

状态：**静态与真实业务载荷离线审计已核查；M0 继续开发中**。这次已选输入不是 0：14,588 个真实归档业务 payload；上一节及 M0-20261012.json 的 0 是上一次交接的历史状态。样本来源/采集程序/旧字典版本未知，不等于已建立原版捕获 BASELINE。

变更：SOURCE_MIGRATION 6.5 与相关状态、本文件；只读工具 `tools/m0/Audit-SelectedSession.mjs`；脱敏证据 `docs/migration/evidence/M0-R01-audit.json`（包含 59 个 Golden 定位项）及 `M0-R01-field-evidence.json`。完整本地执行摘要日志在原外部 baseline 目录的 selected-session-*.log；没有复制任何原始 .bin/.json/.jsonl/session.json 到主仓库或测试副本。

| 交付/验证 | 实际结果 / 证据 |
|---|---|
| 结构与关联 | proto/json 各 14,588；索引/parsed 各 14,588；33 方法，seq 连续；缺失/孤立/空 RAW/叶子 JSON 不一致均 0。索引与 parsed 的 3,518 个 ts 差为 1—10 ms，不是 method/ID/引用断链 |
| 原始格式/来源 | .bin 是逐业务消息 Protobuf，14,588 个可被当前模块解码，遍历结构无 wire 错误/冲突；不能冒充完整 PushFrame/gzip/HTTP。archive 格式 livedash-compatible-session-v1；记录时间 2026-08-15 19:09—08-16 01:44（Asia/Shanghai），采集来源/程序/字典版本未知 |
| 会员/星守护 | 2,629 进场、252 礼物、474 聊天、22 表情、16 粉丝团。seq1601 的原始路径 1.8.2 为“成为…星守护”模板，两侧一致；仅确认文本事实，未确认付费/期限/权益；没有显式“会员”词，subscribeStatus/badge 命名不作权益证据 |
| 连击 | repeat_count 1—52；146 诊断组，76 多条，74 有结束；无倒退/结束增量更大/首次结束。最长相邻间隔 5,173 ms；不能外推乱序、重传、缓存超时/跨连接或结算 |
| 新旧差异 | 14,217 个旧 common.msgId 与原 varint 全匹配；旧 user.idStr 对应 User #73 webcast_uid，独立别名可保留。priorityScore 的 4,858 个值来自 Common #10 而非当前 #11；Gift 根 roomId 的 247 个值对应 #33，与 Common 房间不同。364 旧错误/7 未知对应 RAW 保留且当前模块可解码。业务名字和自定义扩展按 SOURCE_MIGRATION 6.5.3 分六类，不一概判错 |
| 两套 ID | 4,968 个索引 MsgId 与 RAW Common MsgId 不同，集中于 RoomUserSeq/RanklistHourEntrance/Chat；缺外层/采集代码，不断言任一错或简单浮点舍入；分别留证据。索引中 14,585 个 ID 超 JS 安全整数，诊断按原词法转字符串 |
| Golden | 59 定位项覆盖 33 方法、旧失败/未知、连击、星守护、Control；用同一工具 verify 模式复跑：59 检查、0 失败，验证 RAW/字段结构/原生与旧结果 hash |
| 来源完整性 | 全 corpus 读前/读后字节 hash 与 proto/json 文件集合/mtime 一致，元数据 hash 一致；没有原始内容进入 AI 上下文。当前官方参考 commit 和两个 vendor 哈希固定，未更新参考源码 |

详细交付与重复命令统一在 [SOURCE_MIGRATION 6.5](../migration/SOURCE_MIGRATION.md#65-r01用户指定真实场次的有限只读审计)；[审计/Golden](../migration/evidence/M0-R01-audit.json)、[字段证据](../migration/evidence/M0-R01-field-evidence.json)、[只读验证入口](../../tools/m0/Audit-SelectedSession.mjs)。Golden 已确认字段事实、旧推断与待人工业务核验分层；真实结束候选为 seq14587、Control 字段2 varint=3（旧 status/官方 action），不直接证明推流结束。

未执行与缺口：HTTP create/anchor_finish_info、传输外层/gzip/原始采集元数据/持久 ACK、伴侣恢复、跨房间/连接/重复传输/连击乱序超时、旧字典源和版本审计、会员权益确认、正式 SessionManager/ReplayEngine/GUI 验证、独立 Proto Patch / Dictionary Extension 实施。原版启动副作用范围仍需用户另行明确；本次真实目录授权只用于只读审计。

交付校验：最终 verify 退出 0，59 检查/0 失败；报告写入样本目录的保护测试拒绝写入且未产生文件。21 个本地链接、JSON 计数/类型覆盖和字段73的 5,535 对相关值核对通过；6,813 个旧用户身份字符串的精确输出检查未发现泄漏；原元数据 hash/mtime 与审计前一致，141 个参考文件及原有非本任务文件未变，原 staged `.gitignore` 保留。工具哈希与校验范围记录在 R01 证据 deliveryVerification。以上只证明本次只读审计/Golden 与交付完整性，不证明生产链或完整生命周期。

下一步：用 Golden 审核独立别名（Common/Gift camel-snake、User #73、Control #2）和 legacy 冲突隔离，保留官方原生输出；需要旧字典源/版本或用户语义说明后才能认可 RoomStats/subscribe/badge 等业务名及价格权益。完整开闭播与 SessionManager 生命周期用另选真实数据继续验收，不要求本互动样本强行具备开播事件。M0 尚未完成，不擅自扩大目录访问或开发范围。

## 9. 简易验证工作台补充与下一任务（2026-10-12）

taskId：`DOC-DEV-BENCH-20261012`；owner：本主文档协调对话。用户补充“需要边做边测试的简易前端，非正式 UI”。本次只补范围/顺序，不启动新开发对话或实现源码，不重跑 R01 审计，不把未验证能力标为可用。

更新：核心升 v1.2，B26 给定持续可操作验证台、A13 图解；PUBLIC_API 10 给定分批落地与待审查输入/验证 DTO；决策 D013/D014；本文件增加 M2a-O；README 修正已完成构建/R01 审计的过期状态；AGENTS 补增量 GUI 与离线/实时验收边界。R01 证据及 tools/m0 不改。

**建议的下一开发任务**：M1 离线适配范围审查 → M2a-O 验证台第一轮。任务内先用 59 Golden 明确已证实别名/冲突隔离及采用的契约，再交付可启动的本机 Gateway+简易页面：选择已登记 R01/Golden，开始/停止解析，消息/官方与增强差异可查，任务日志与实际统计可见。下一增量加隔离播放/暂停/单步、持久化历史/续传，随后加跳转重建和回归面板。完整目录访问范围仍是用户已选 R01，不扫描其他私人输入。

不在下一任务首批范围：真实 Hook/代理/证书/伴侣修改、完整推流判定、LAN 开放、正式主题/业务 UI、真实通知/OBS/Stream Dock。这些能力显示未实现/未验证原因，M0 补证门槛保持。

验收依据：按核心 B26.4 逐增量给启动/操作方式和真实结果；59 Golden 可重复，R01 数量/方法覆盖可核对；记录输入/解码/去重/事件数分别统计；官方输出纯净、源只读、原状态与 references 完整、回放副作用隔离。此处是待实施设计，不宣称验证台完成。

本次文档校验：8 份第一方 Markdown 与 38 处本地链接通过，13 张人看版图/全文 14 张 Mermaid 均解析和渲染成功；Git diff/忽略边界、原 staged `.gitignore`、三参考仓库 commit/干净状态核对通过。没有执行新功能验证或重新审计私人样本。

## 10. M1/M2a-O 离线范围审查稿（2026-10-12）

taskId：`M1-M2AO-REVIEW-20261012`；owner：用户在本 M0/R01 对话提供下一任务文档，本对话负责准备审查稿；交接对象：用户/公共契约负责对话，未自动发送消息或派工。允许写入：本节和 `docs/reviews/2026-10-12-m2ao-offline-contract-review.md`。依赖核心 v1.2、CORE_CONTRACTS/PUBLIC_API 0.1、B26/API10、R01/59 Golden 既有证据。

状态：**设计已记录，待审查；产品开发未开始**。[具体审查稿](../reviews/2026-10-12-m2ao-offline-contract-review.md)提出 HistoricalInput 与 Recording/RawCommit 分离、ValidationRun/MessageTrace/VerificationReport DTO、复用 operation/log/Page 的新增 v1 资源、本机开发认证、首轮只观测重复候选及独立别名/legacy 冲突隔离。推荐 Node 24/Worker/隔离 SQLite/同源简单页面，仅为离线用栈候选，不冻结实时 C# 宿主或更改公共契约。

已核对：下一任务文件、当前 B26/API10/STATUS9/决策、R01 既有报告和 Parser 的 loadParser/decodeBusiness 接口；没有重新扫描私人样本。Node 24.15.0 的运行时报告 SQLite 3.51.3/Worker 可用，候选 18765/18766 未见监听；查询官方固定版本文档确认 node:sqlite 为 release candidate、DatabaseSync 同步。没有打开数据库、监听服务或安装产品依赖。

本轮变更只有审查稿与本节；未改 README/AGENTS/architecture/contracts/migration/decisions、既有工具/证据和原 staged/unstaged `.gitignore`，未提交。无首个主提交，文档审查在当前根做最小改动，不为 worktree 擅自创建首提交。

待审查：首轮栈候选、历史输入/任务/认证接口差异、observe-only 去重和适配白名单。PUBLIC_API 10 要求契约负责人审查后再加字段/注册端口；审批后同步权威契约并形成详细实现计划，后续仍由本对话串行实施。此处不把“任务建议”自动视为新接口已获批准。

未执行：产品脚手架/依赖安装、Gateway/DB/Worker/UI、真实任务运行与新功能测试、正式去重/ReplayEngine/实时链。M0 与 M2a-O 的功能状态保持原记录，不标通过。

交付校验：审查稿和本台账的 UTF-8/围栏、14 个本地链接及新增文件空白检查通过；TBD/TODO 占位扫描无命中；本轮前记录的非 STATUS 权威文档、工具和 R01 证据 hash 未变，三参考 Git 工作树干净，原 staged `.gitignore` 内容保留，working/cached diff 检查无错误。仅文档校验，未运行产品验收。

## 11. 首个可运行工程增量（2026-10-12）

taskId：`CORE-VERTICAL-01`；owner：当前主协调对话。按用户最新指令直接提取、编译、接入与验证，不再把完整 M0 原版验收作为所有开发前置。没有重新开展 R01 结构/历史统计审计，没有消息其他用户对话或提交 Git。

实际复用：DouyinBarrageGrab 的 C# Titanium 捕获、HTTP/WS 原始观察、protobuf-net 外层模型和 GZip；douyinprotobuf 的官方 parser/decode/wire 与 vendor 原样迁入正式源码，业务适配独立。只读 references 无改动，MIT/来源提交/vendor hash 保留；douyinprotobuf 未发现顶层授权文件的事实保留在 THIRD_PARTY_NOTICES，不虚构许可证。

正式模块：`src/capture/BarrageGrab/CaptureHost.cs`、`capture-bridge.js`；`storage.js` RAW 文件 fsync + SQLite FULL/唯一事件/快照分页；`parser/`；`runtime.js` 总线/统一事件/隔离回放；`session-manager.js`；`historical-source.js`；`server.js` 受认证本机 REST/WS；`public/` 简易工作台。构建/测试入口为 package.json、tools/build-capture.ps1、tests 和 tools/verify-workbench.mjs。密码/历史目录登记、RAW/数据库、依赖、产物均忽略。

| 可执行验证 | 实际运行结果 |
|---|---|
| `npm run build:capture` | .NET Framework 捕获 exe 构建成功；6 项旧代码/未用入口相关警告，无错误 |
| `npm test` | **20/20 通过**：实际本地 HTTP、二进制/跨回调分片 WebSocket 捕获、C# gzip/外层解包、RAW ACK、RAW 失败阻断、跨重启去重、大 ID、快照分页、场次局部规则、回放隔离/并发控制、匿名拒绝、命令幂等/版本竞争、daemon 启动顺序/未知时间/退出不下播/观察失效 |
| `node tools/verify-workbench.mjs` | 真实 **59 Golden / 59 检查 / 0 失败** 经产品 GUI/API/解析/持久化链；官方解码 59、解析失败 0；历史分页/官方详情/RAW 引用/回放单步和跳转通过，浏览器错误 0 |
| `node tools/verify-workbench.mjs http://127.0.0.1:18780` | 已启动产品实例同样59/59，数据实际写入本项目 data；无需复跑原审计工具 |

运行：`npm start`，工作台 <http://127.0.0.1:18780>。当前服务已由本任务启动，采集停止。GUI 可运行 Golden、载入全 R01、停止任务、分页追踪、回放播放/暂停/单步/停止/跳转与查看日志指标。当前只执行59回归，**未重新执行全量14,588结构统计**；全量按钮是解析输入操作，不是审计。截图和脱敏验证 JSON 位于忽略的 artifacts。

针对明确失败修复：默认 ProxyServer 自动信任已用三个 false 参数显式关闭；WS 握手识别及按连接保存 FIN 分片已修复；超大官方时间字段保留原值、occurredAt=null；并发 capture start/重复回放控制/状态版本竞争与关闭队列已修复。一次只读代码审查完成，具体问题均针对性回归。

未验证/未实现边界：未操作真实伴侣、系统代理、证书信任、安装文件或已有弹幕服务；受控明文 WS 测试不证明真实 WSS/TLS 与伴侣版本兼容。HookReady 保持 false，不由代理已绑定伪报；完整 daemon 观察/恢复、WebSource/人工切换、HTTP 生命周期真实语义、业务/通知/设备出口、连击结算、物理独立回放库、崩溃 RAW 孤立文件恢复、完整 WS 高水位/RBAC/日志导出/性能历史均未完成。RAW 为后端提供的 HTTP body/重组 WS message，非 TCP 原始包；回放当前固定间隔倍速。M0 和整体 P0 不标完成。

下一可直接接入能力：围绕已提取 LiveCompanHelper/代理接口补 daemon 的只读进程观察、启动顺序提示与恢复协调；修改 Hook 安装文件或真实客户端路由之前另行说明具体影响并请求用户授权。其余代码继续增量实现，不用新研究报告替代交付。

用户要求“继续”后的增量：新增 `src/live-hook-daemon.js` 和 C# `--observe` 独立只读模式，只按“直播伴侣”进程名读取 PID/启动时间/主窗口存在性；不调用 GetExePath、SwitchSetup、代理或证书对象。每2秒观察，pid+startedAt 作为进程实例；先开伴侣时提示人工重启，代理先就绪后的新实例只标路由待验证，HookReady 仍 false。退出/新实例只更新采集中断与诊断，不生成直播结束。REST 状态、hook/status、daemon.updated 和工作台提示均已接入；4个针对性测试通过，浏览器真实观察通过；失效后清除旧观察，采集状态变化不能伪造恢复。

当前新版工作台为 <http://127.0.0.1:18781>，独立数据目录 `data/daemon-increment`。工具自动审批拒绝停止本任务旧18780进程，仅返回 blocked by policy、未给具体原因；没有改用其他终止手段，旧进程保留，新版在空闲端口独立启动。新实例已重新完成 GUI Golden 59/59。默认 `npm start` 仍为18780，可用环境变量 LW_PORT/LW_DATA_DIR 启动独立实例。真实伴侣/系统代理/安装文件未操作。


## 12. GitHub 首次同步与持续开发（2026-10-12）

任务 `CORE-CONTINUE-20261012`，owner：本对话，按用户授权串行开发并提交到 main；不自动派工。阶段一核实远程 Public 仓库为空，本地主分支无 HEAD，18780/18781 既有实例保留。原 staged/unstaged 文件按授权纳入首次正式基线，不执行清理、强制覆盖或强推。

公开范围：第一方源码/GUI/合成测试、MIT C# 提取源码、架构/契约/进度/工具；排除私人 RAW、真实样本/Golden 证据、数据库、日志、密钥/证书/环境配置及构建缓存。未确认再分发授权的官方解析器及 vendor 六文件保持本地且忽略；新增 setup-parser 固定源版本/哈希准备入口，不替换官方实现。真实样本的房间编号已从合成测试替换为独立虚构值。隐私扫描只报告文件/类别/行号，不输出敏感内容。

验证：原工程 C# 构建退出0；20/20 测试；GUI 实际59 Golden/59检查/0失败、浏览器错误0。新增准备入口测试先失败再通过；六文件从固定上游重新下载到临时目录，全部哈希通过，当前已有六文件核验通过且未覆盖。公开扫描无发现。后续阶段优先修复 SessionManager 的重复证据/场次连续性，再补 API 隐私和运行观察；真实代理/证书/伴侣操作仍须用户具体授权。

本阶段不代表真实伴侣或 P0 整体验证通过。历史证据文档在本机保留，公开链接可能指向被排除的本地证据。

场次连续性增量：`src/session-manager.js`、`src/runtime.js` 和 `tests/session-continuity.test.js`。重复 HTTP create/Control end 不再增加场次状态版本或重复生命周期事件；RAW 仍逐条保留。补 first/lastObservedAt 和最近100个 RAW evidenceRefs；采集中断版本只在变化时递增。重启从唯一未结束 live 场次恢复选中 room，同场恢复保留 sessionId。未知房间结束响应仅留 RAW/诊断；已结束房间的迟到 create 不抢占新房间，同 RoomId 复用继续要求人工核对。HTTP 业务码必须明确成功，超安全整数保留十进制原文；推流状态仍 UNKNOWN。

验证：5项新增回归先全部失败，修复后全套26/26通过；真实59 Golden再次经 GUI/API 完成59检查、0失败，浏览器错误0。场次测试的 Windows SQLite 清理顺序已修正，不把清理锁冲突误报为功能成功。仍未执行真实 HTTP 开闭播/WSS 环境验证，证据Refs窗口之外的完整 Evidence 索引及匿名主播补全后的历史去重迁移尚待补齐。

首个公开基线 `230301cdd95b01ce93edb5503ab91309b06b6337` 已推送并核对 origin/main；独立干净检出完成 npm依赖、六文件哈希准备、NuGet自动还原、C#编译（6项既有警告）和21项测试。未操作18780/18781进程或真实伴侣。本轮用户授权覆盖串行 main 提交，无并行 worktree/对话。

默认脱敏增量：新增 `src/public-projection.js`、`tests/privacy.test.js`，Gateway REST/WS 统一使用投影，GUI 明示官方结果为脱敏投影。每个本地数据域保存独立32字节私钥，对房间/用户/消息标识做稳定 HMAC 别名；昵称/正文及未知原生字符串/字节字段默认隐藏，原生 Parser 与 RAW/事件库字节不改。凭据、物理路径始终剔除，局部受控查看须本地私有配置 allowPrivateDetails=true，不能经API启用。

验证：REST/WS 泄露回归及未知原生字符串回归先失败，再修复通过；全套29/29，GUI真实59 Golden/59检查/0失败、浏览器错误0。未把脱敏投影作为原生结果哈希。下一段接人工单源控制与 WebSource；当前无授权TLS证书/WebSource配置，真实连接尚未尝试。

WebSource/人工单源增量：新增 `src/web-source.js`、`source-controller.js`、`tools/setup-websource.mjs` 和 `tests/source.test.js`。正式 GET /sources、POST /capture/actions switch/start/stop 与 source.updated/GUI 已接；版本串行化防双选，选择跨重启持久化，默认STOPPED且无自动切源。切换先排空/停止旧来源，更新epoch并记录审计，保持Session；进程观察不能打断选中的WebSource。

固定上游 live.js 连接/鉴权域名验证、心跳、ACK、同来源有限重连均复用；独立 raw-first-v2 适配加入可等待持久化回调和接收时刻/连接尝试快照，官方 Parser 保持原样。准备入口校验上游 SHA256 d72a2440bc6b07ab6586e199a54917d109f30b826fc3f2268771a7342f87d865，生成适配 SHA256 07272bc085d036eaeddf52078e0b4a6848b7761f25b627b87c8015ed42814028。源文件和生成适配均因许可未确认保持本地忽略，不上传。Web范围为入站二进制重组WS消息，不宣称TCP/全部控制帧；队列上限记录WEB_CAPTURE_GAP。捕获中断/同来源恢复只变采集轴，等待新证据恢复连接，不创造开闭播。

去重补全：Session先验证主播/房间身份，EventStore再按namespace/room/method/msgId查既有事件，兼容旧dedup键，避免匿名主播补全后重复计数。缺room不强制去重；旧source/epoch输入仍先留RAW再拒绝当前发布。仅同namespace/source/epoch/connection或capture已留证据的上下文可补缺room；原生缺字段默认0仍原样保留，补全来源写独立extensions，不用可变全局房间给历史归属。

验证：37/37自动化；C#构建退出0；GUI实际59 Golden/59检查/0失败、浏览器错误0，并验证人工双向切换、刷新不切回、未配置时启动禁用；受控Web连接确认RAW提交前received和ACK均0，提交后才解析/ACK。新增失败用例均按缺失行为复现后修复；原生room默认0的断言按已固定Parser事实修正。真实伴侣/TLS、真实Web凭据/长时间重连仍未执行，无外部副作用。

历史/消息追踪增量：新增 `src/cursor.js`、`tests/history.test.js` 和 `tools/verify-history.mjs`；Store使用BigInt读取/写入事件顺序，快照/序号跨JSON始终精确字符串。游标用数据域独立密钥HMAC签名、绑定过滤/快照/afterSeq，24小时过期；旧无签名游标需重新查询。GET /events 支持 afterSeq 缺口查询，WS ready 提供 latestEventSeq，列表返回摘要，单条详情再取完整脱敏投影及只含元数据的RAW引用；RAW详情校验 recording所属且不返回字节/物理路径。

GUI按时间从旧到新展示，向上自动续页，最多500缓存且仅渲染可见行/缓冲；上翻停止跟随，追加仅提示新消息，跟随状态重连从稳定历史分页补查最新500；历史阅读状态重连保持位置并提示补查。此处不承诺前端内存保留无限消息，超缓存历史继续经签名页查询。

验证：新增篡改/高水位/超JS安全整数回归先失败，修复后全套41/41；GUI真实59 Golden/59检查/0失败；160条合成事件浏览器用例确认可见DOM有界、历史锚点不移动、79条断线消息补查，浏览器错误0。SQLite setReadBigInts 返回void的误用已在验证中修正，不保留失败实现。私人RAW和官方Parser未修改。

伴侣环境：用户明确允许尝试启动后自动审批拒绝该启动动作，仅返回blocked by policy，无具体规则；未改用其他启动方式。用户随后手动启动，观察到12个伴侣进程，工作台 companionRunning=true、RESTART_REQUIRED、capture STOPPED、HookReady=false。当前只验证进程观察，不是TLS/真实直播验收；证书/系统代理/安装文件未改。

日志/指标/回放完整性增量：新增 log-record.js/log-export.js/tests/observability.test.js/tools/verify-observability.mjs；日志带module/level/logSeq，凭据在写日志前剔除。GET /logs支持module/level/code/operationId/签名页；异步 POST /logs/exports及受认证下载导出JSONL，最多10000、15分钟句柄，即使local-private界面也强制脱敏，落地文件仅在忽略的data。GUI筛选、继续页和实际下载验证通过，阅读旧日志时周期刷新不覆盖。记录RAW提交/解析处理链单调时钟墙耗时、错误次数及实际队列；模块CPU无归因时明确unavailable/null，不用耗时伪造CPU。原生/传输MsgId分别保留，C#边界明确是代理HTTP主体或重组WS消息。Replay每次读取检查SHA256，变化则失败/留诊断/不发布，不改原字节；只有合成临时测试文件被测试用例改动。

验证：4项新增行为先失败、后通过；全套45/45、C#构建退出0、真实59 Golden/59检查/0失败；日志筛选/认证脱敏下载、160消息历史GUI均浏览器错误0。并发全套+两个浏览器测试曾出现一次capture.test.js进程级退出（没有具体栈，43项中42通过）；单独采集5/5、随后全套45/45、再次相同并发负载45/45均通过，原因未复现定位，保留为稳定性待观察，不能据此宣布M3/实机采集稳定性通过。日志在.local保留，不上传。

运行部署只停止本对话创建的18782/PID49192（事先确认监听归属与node名称），不停止18780/18781、旧8827/8888或用户伴侣；新版继续同一独立数据域。完整P0仍未完成：真实TLS/伴侣路由与长时间恢复、真实Web鉴权/重连、同room复用/异常核对、崩溃孤立RAW恢复、业务/设备执行出口尚待。下一步是具体授权范围下的LiveHook环境准备及实机回归，不反复审计R01。

LiveHook环境审查准备：新增 hook-file-transaction.js 和合成hook-patch测试，实际index只读预览（未写入）证实将既有127.0.0.1:8827,direct://替换18827参数的一处差异。授权门禁、独立本次备份/fsync、当前/备份哈希保护、拒绝覆盖后续用户修改及原字节恢复已在合成临时文件执行。具体真实影响/证书信任边界/旧8827流量改变/手动重启与恢复步骤见 docs/reviews/2026-10-12-livehook-environment-authorization.md；真实文件及证书仍未改。该辅助事务没有公开环境写入API，实际应用需要用户明确授权。

## 13. P0-A 分阶段真实环境联调：第一阶段（2026-10-13）

taskId：`P0A-STAGE1-20261013`；owner/交接：本对话→用户。允许写入本项目采集桥接、TLS测试/私有准备工具、文件事务辅助及对应README/迁移/本节；公共API/核心契约0.1未变。用户授权只读环境预检、专用私有备份、127.0.0.1:18827本地测试、自动环境副作用排查和代码修正；CA信任、真实index写入、关闭/重启伴侣、旧服务/配置操作仍不在本阶段授权内。没有自动派工或消息其他对话。

实际交付：`capture-bridge.js`、`CaptureHost.cs`、`Proxy/TitaniumProxy.cs`、csproj补上实际TLS缺失依赖/文件RSA CA的内存CSP兼容与叶证书EphemeralKeySet；保留HTTP/WSS必要代理机制，自动信任三个false、Start(false)、仅loopback、无系统代理/安装修改调用。测试上游证书精确匹配仅test/smoke，正式SourceController/Gateway不传此设置。新增`tools/create-livehook-test-certificates.py`、`livehook-tls-probe.mjs`、`livehook-environment-snapshot.ps1`；新TLS用例从“未解密未入RAW”失败、依赖缺失、RSA私钥类型错误定位后修复，未靠导入证书解决。

准备与恢复：`prepareHookBackup`只写本次私有原字节备份及未应用journal；不调用apply。合成回归发现rename丢目标ACL，授权后应用/恢复改用Windows File.Replace且不忽略元数据错误，ACL/哈希/后续编辑保护验证通过。真实index hash/ACL始终未改。`build-capture.ps1 -OutputDirectory`支持本项目独立构建，LW_CAPTURE_EXE选择测试程序；默认构建曾因旧observer占用失败，不停止旧进程，以独立构建成功解决。

| 验证输入/命令 | 当前结果及范围 |
|---|---|
| `npm run build:capture -- -OutputDirectory C:/project/LiveWorkBench/.local/livehook-stage-build` | 构建退出0；完整编译6个既有警告，无新增错误；.NET4.8运行时/4.6.2目标、Titanium3.2.2-beta |
| `$env:LW_CAPTURE_EXE=...; npm test` | **50/50通过**，包括HTTPS/分片WSS、无CA客户端拒绝、live禁用合成上游pin、私有备份不写入口、文件应用/恢复ACL保留；Node24.15/Python3.12.10/cryptography46.0.7/PowerShell7.6.5 |
| `node tools/livehook-tls-probe.mjs <本次私有目录> 18827` | 实际127.0.0.1:18827自有C#代理；HTTPS与gzip/分片WSS各一条、RAW字节/哈希2/2、C#传输2、官方事件2、同test Session；live事件0，HookReady=false；代理已停止 |
| `pwsh -File tools/livehook-environment-snapshot.ps1 -RunDirectory <本次私有目录> -Verify` | 内容/ACL、Root/My四库、WinINET/Connections/WinHTTP、旧监听、伴侣实例、本次CA不在库、18827已关闭均通过。初版字典键顺序误报已修正并重新核对；没有自动写回快照 |

实机只读事实：伴侣13.0.5（实际13.0.5.502287990目录），11个原进程；8827/8888始终原PID18644监听，18780/18781/18782保留；本次18827只由自有测试子进程监听回环。伴侣到8827既有连接前后各10条，证明现有路由仍存在，不证明旧业务捕获正确。Root CurrentUser/LocalMachine各51，My分别5/4，前后指纹一致；本次CA从未导入，不执行任何证书删除。

证据完整值、CA指纹/私钥位置与NTFS权限、目标路径/hash/唯一参数diff、备份及后续授权动作/影响/恢复命令都在忽略的`.local/livehook/stage1-20261013-b/REPORT.md`和操作记录；不进公开Git。脱敏工程说明见 [分阶段记录](../reviews/2026-10-13-livehook-stage1.md)。RAW仍仅本地，未读/复制R01/真实捕获，官方Parser与references未改。

状态：**该受控TLS增量验证通过；P0-A真实伴侣链仍实现待验收，P0未完成**。没有重新跑59Golden/全样本审计；本次未改变Parser/场次业务规则，复用已有回归和新合成TLS检验。现有18782工作台仍采集STOPPED/未登记本次证书，不宣称已部署新版TLS给该运行进程。

下一步/阻塞：交付本次具体清单后，等待用户分别批准所选CA的CurrentUser Root信任与单一伴侣代理参数变更；不因时间经过视为批准。随后用户手动重启、真实HTTP/WSS/RAW/解析/场次关联/重启恢复和最终旧路由业务回切须实测；恢复只能处理本次授权新增对象，哈希冲突则保留后续修改并报告。本阶段没有这些真实验收证据。

## 14. RAW/解包/解析分层持续增量（2026-10-13）

任务`PIPELINE-20261013`，owner本对话，用户明确要求串行实现并逐增量提交main。references只读、环境授权边界延续；不停止现有工作台/伴侣/旧服务、不导入CA、不改index或系统代理。内部接口见PROCESSING_PIPELINE v1，PUBLIC_API0.1保留兼容并记录新增字段。

第一增量：`TransportUnpacker`（Node/C#）、`ProtoIndex`正式组件；RAW读取/哈希核对后，独立外层PushFrame/Response/压缩处理与逐条业务payload派生索引。不认识method仍提取，包内业务失败彼此隔离；压缩payload采用messageIndex/rawOffset=null。C#protobuf-net/GZip成熟路径独立提取，Node复用官方传输类型/wire并记录C#输出对照结果，不用IPC/解析JSON冒充RAW。历史business-payload只引用原只读文件；没有复制R01。

WebSource每条已提交RAW直接进入同一组件，即使连接代次在排空时变化仍可留索引；原Web主动心跳/ACK/重试代码保持。GET recording RAW详情兼容新增processing，现有GUI详情展示完整RAW→Proto→event关联，路径/字节仍隐藏。旧库仅加表，不重写数据；Parser/重解析的独立接口及Replay物理隔离将在后续增量完成，不宣称已完成。

第一增量验证：4项新回归先失败后通过（混合method/未知/损坏业务/gzip/外层损坏/大ID/重复索引/从持久化RAW读字节及哈希异常）；C#独立目录构建退出0、6项既有警告；全套54/54；160合成事件GUI验证含ProtoRef/payloadHash详情、历史锚点/有界滚动/断线补查，浏览器错误0。源码/验证工具正式位于本项目；公开扫描与推送在增量提交时核对。未经真实伴侣验证，不声明零丢包。

第一增量已推送214425c397abf0bf0a6d877d5e75eb3d44970ad5，远程main相同。

第二增量：正式parseBusiness接口、parser/extensions.js独立字段增强、append-only解析尝试、逐消息失败隔离、protoDetail/reparseMessage，以及受认证GET /protos/{id}和POST actions reparse。GUI可查看历史尝试并重新解析；命令重试只产生一次新尝试，不改事件/场次/RAW。单个派生文件哈希损坏留错误且继续其他消息。Replay解析不覆盖原实时Proto eventId。WebSource固定v3独立适配注入传输packetDecoder/ACK编码，业务只解码一次，官方六文件及原live.js/v2未修改。

第二增量验证：5项新用例先失败后通过，含native与extensions分离、重新解析无副作用、单条损坏隔离、Replay链接、认证/脱敏/幂等API；既有Web测试增加实际业务decode计数=1。GUI160合成事件验证Proto详情/重解析及历史功能，浏览器错误0。完整构建/回归结果与推送在完成时补记；Replay物理库隔离及捕获缺口/连接健康继续下一增量。

第二增量完成验证：C#独立构建退出0、全套**59/59自动化测试**（不是R01 Golden复跑），GUI历史/Proto详情/重新解析浏览器错误0；官方Parser/vendor六文件保持固定哈希，未扫描真实样本。v3准备入口验证上游/生成哈希，不覆盖v2或references。

第二增量已推送3b3abd3b843c13ec2d99ea7fd7c0bfbc7e72b814，远程main相同。

第三增量开发：RawRecorder独立、64项背压/8MiB上限/零字节保存；CaptureGaps保存失败/未知范围中断，SQLite失败回退本地fsync journal，双重失败明确unavailable/stderr。C#记录连接/输入序号、控制帧统计，超大或不完整分片有缺口；只按自有代理连接端点的TCP状态观测，Close/中断/停止不生成下播。GatewaySocketHub独立Ping/Pong/超时/积压管理；GET /capture/gaps、健康计数与GUI查询。WebSource v4仅测试允许短重试，生产原延迟/心跳/ACK维持。

新增可复查验证：RAW失败/背压无成功ACK、空/超大输入、SQLite失败journal；实际本机LiveHook Ping/Pong透传与3字节未结束分片在TCP关闭后留WS_INCOMPLETE_FRAGMENT（不伪造完整RAW）；本机Web两次连接/两个ACK/主动心跳/Ping控制帧/重复事件只一条、不同connectionId；Gateway无Pong客户端超时、正常客户端保持。一次单文件capture-health测试出现file-level退出无具体栈，Windows未见匹配node应用崩溃事件；立即TAP单跑4/4通过，尚无复现定位，不称根因已解决。最终全套及GUI结果在提交时补记，延续既有稳定性观察项。

第三增量完成验证：独立C#构建退出0、**65/65全套自动化通过**；GUI160合成事件/Proto重解析/捕获缺口与连接健康查询/历史补查均通过、浏览器错误0。Node/C#双侧有界接收，C#传输阶段中断可补处理已持久化RAW；实际真实直播、长时间压力与磁盘彻底耗尽场景未执行，不声明零丢包。崩溃孤立RAW及fallback journal跨重启查询仍待后续。

第三增量最终C#代理异常也改为稳定PROXY_TRANSPORT_FAILED缺口，针对实际HTTP/WS/TLS重新验证8/8通过；解析/存储及GUI未再变更。

第三增量已推送0d1cab0b561dfb11942e40afba594081bd3f1686，远程main一致。

第四增量：新增processing-pipeline/event-bus/event-store/history-query/replay-engine/log-service/metrics-service/message-deduplicator正式组件，保留Runtime/Store/API兼容入口，按数据流/隔离职责拆分。Replay有独立SQLite/索引/总线、没有Source/网络/设备实例，父RAW只读引用。统一查询读模型是另一个history-view.sqlite，保留现有分页/高水位/查询eventSeq，不把Replay写入live库；Gateway直接订阅隔离UI emitter，实时业务总线没有Replay消息。新增namespace上下文追踪/重解析、录制RAW签名分页和GUI无业务RAW检查；修正入口Buffer重用可能影响RAW的风险，Recorder保存独立快照。

第四增量新回归先失败后通过：Replay单步/重建/失败前后直接SQL核对live events/sessions/logs/raw/attempts行数不变、live总线零Replay事件；消费者故障隔离；混合历史签名快照/唯一序号/重启读模型；调用者重用Buffer仍保留原字节。GUI160合成事件验证RAW浏览、隔离Replay单步及Proto详情，浏览器错误0。最终全套/部署/公开审核在提交时记录。

剩余边界：真实伴侣HTTP/WSS及长时间恢复、真实Web凭据未测；磁盘彻底耗尽只能stderr告警，不能承诺保存输入；崩溃孤立RAW恢复/fallback journal跨重启查询、Replay控制job重启恢复与长期保留/资源上限仍待。没有真实直播验收或零丢包证据。第一方与参考文件边界不变，不操作CA信任/index/代理/旧实例，不重跑R01审计或上传原始数据。

第四增量完成验证：C#独立构建退出0；全套**70/70自动化通过**。API/GUI实际160条合成事件的历史锚点/虚拟行/断线补查、RAW浏览、Proto结果/重新解析、隔离Replay单步/Proto追踪、缺口/连接健康，以及日志筛选/受认证脱敏导出均通过，两个浏览器验证错误0。直接SQL/live总线隔离证据在tests/replay-isolation.test.js；测试日志在忽略的.local/pipeline-stage4-tests.log。API兼容新增能力标志，旧18782后端不支持的新GUI按钮禁用。

运行限制：尝试启动新版独立18783/data/pipeline-20261013时自动工具审批拒绝，只有blocked by policy，无具体原因；整条启动命令未执行，未改用其他方式绕过。新版未作为长期实例部署，18780/18781/18782与8827/8888保留；用户可在空闲18783手动启动后复查健康/能力。编译、临时自有GUI/API服务验证通过与长期部署/真实伴侣验证明确分开。

## 15. 配置驱动监控与自动监听（2026-10-13）

任务MONITOR-20261013，owner/交接本对话→用户，串行main，不派工。用户附件授权实现A—D；禁止系统代理/CA/index/伴侣或旧服务操作，也不绕过自动长期启动审批拒绝。新增接口见MONITOR_PROFILES v1，沿用PUBLIC_API0.1与现有RAW/Session/Replay接口。最新允许多Profile独立监控（包括LiveHook），更新早期C06范围，不授权Web弹幕来源自动切换。

A交付：profiles/profile-store、targets/resolver/safe-http、monitor/douyin-adapter/live-monitor，以及server/Profile正式API与DevWorkbench编辑面板。普通配置持久化、严格类型/版本、敏感输入只写；DNS检查并固定公共地址、限定HTTPS域/跳转/超时/主体。结构化目标匹配证据、连续确认、UNKNOWN保留已确认状态、失败退避和重启不重复转换；monitor不创建场次或弹幕连接。

A验证：新增6项回归先失败后通过；独立C#构建退出0，全套76/76；node tools/verify-profiles.mjs实际Edge headless经正式API创建/编辑/删除、检测两次确认、输入不回传、来源保持，浏览器错误0。公开检查142文件0发现。测试只用合成数据、临时自有网关，已关闭。真实目标未提供，因此真实身份映射/平台页面形态/长期监控未验收；UID及实际roomId没有可靠映射时返回TARGET_MAPPING_REQUIRED，不伪造web_rid。当前Parser/RAW/Replay不改。

后续B/C/D继续；直连上游没有动态签名发现入口，不能把静态URL作为自动连接已完成。浏览器按Profile显式启用，私有登录保护及SDK ACK边界需独立实现/验证。长期18783启动依然未部署，旧18782后端不支持Profile面板时禁用。

独立待办保留：孤立RAW崩溃恢复、fallback journal跨重启查询、Replay控制job重启恢复；均未在此增量标完成。

A已推送11f0b741598720927495729d0185f8044da34fbc，远程main一致。

B交付：coordinator/monitor-coordinator、capture/websource/connection-resolver、SourceController内部profile启动/停止、REST/GUI调度入口；单源/单房/最高优先级/同级人工选择、重复状态幂等、手动停止抑制、UNKNOWN不停止、匹配END停止自有连接、失败冷却/有界重试。WebSource v5每次重连刷新参数，失效不复用原URL；原15秒心跳/协议ACK与RAW优先仍复用。原六文件/v4/参考仓库未改。

B新验证先失败后通过：4项调度/参数回归、1项实际本机WSS自动连接→RAW→官方Parser/未知检测保持/确认END停止、1项参数刷新失效停止，现有重连心跳/ACK测试复用。真实动态签名获取仍未实现（上游仅接受签名URL）；默认显示WEB_DYNAMIC_PARAMETERS_UNAVAILABLE，不能声称纯ID直连生产可用。浏览器开关允许的路径继续C。最终全套/GUI/构建结果在提交时追加。

B完成验证：全套82/82；Profile/调度GUI与既有160事件历史/RAW/Proto/Replay GUI均浏览器错误0，C#保持A独立成功构建（本增量未改C#）。v5固定源/输出哈希准备命令成功。未启动长期实例、未连接真实平台或伴侣。调度实现通过合成验收，真实直接自动连接仍有上述参数缺口。

B已推送413d22d4ecb9cbb9ade4eacb135ad2fe7b112d5c，远程main一致。

C交付：capture/browser/browser-source、auth/login-vault/dpapi.ps1、setup-browser固定上游四文件/独立v3适配、SourceController浏览器选择、官方账号确认与DPAPI凭据入口、GUI手动登录/保存/清除。媒体阻断保留SDK/状态/认证；不主动复制签名URL或创建额外连接。原第一方paths.js与上游参考未改；第一次准备检测同名hash冲突后改用独立browser-vendor目录，不覆盖。SDK ACK不可控，RAW/状态明确rawBeforeAck=false，不冒充严格ACK屏障或完整TCP/FIN捕获。

C新回归先失败后通过：媒体策略、当前用户实际DPAPI opt-in/过滤/重启解密/清除/磁盘无明文、同录制重复控制RAW保留，以及实际Edge网络WebSocket→RAW→官方Chat事件与媒体请求阻断。最初routeWebSocket模拟没有原生网络事件；改实际回环WS后定位到ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS，只有自有临时测试上下文grantPermissions，正式路径未授予内网权限/未修改系统。测试target是合成页面，全部HTTP由fixture拦截；不是抖音身份/签名/登录实机验收。最终全套/GUI结果在提交时补记。

C完成验证：全套86/86、配置/调度/登录保存开关/状态GUI与既有160条历史/RAW/Proto/Replay均浏览器错误0；独立C#构建沿用A结果（此阶段未改C#）。setup:browser四原文件哈希及v3适配生成核验成功，公开扫描151文件0发现。临时测试浏览器/网关已退出；没有启动长期18783或操作真实平台/伴侣。浏览器传输/DPAPI合成验证通过，真实账号/平台SDK/长期恢复与Direct动态签名仍待。

C已推送3b8d83981bf80837c57bc2cee74b4f8c0e5a9d2e，远程main一致。

D交付：targets/hook-target-matcher、Daemon/SourceController/Coordinator协同，以及Runtime在RAW/Proto之后的匹配门禁。伴侣HTTP owner→RAW引用的身份依据，实际匹配WSS数据确认HookReady；不匹配/冲突仍保留RAW与Proto，但不自动选场。既有匹配流可以调度接管，Hook路径没有bridge.start或WebClient启动。进程退出/重启/观察失败不下播，新连接重新观察且同sessionId连续。GUI经hook/status展示匹配结果；RAW-first/官方Parser/Replay隔离仍维持。

D补正式observePlatformEvidence命令：仅明确可信monitor END且匹配已存在live身份/房间，结束原场次并记录独立监控事件，不伪造官方Parser结果或RAW。修复监控适配器抛异常未产生UNKNOWN诊断、协调关闭后迟到事件可再排队的问题。4项新增回归先失败后通过，包含不匹配保留、HTTP创建不Ready、真实合成Proto帧匹配/既有流接管/进程退出同场恢复/Control结束、owner冲突与监控END来源/范围/幂等/推流仍UNKNOWN。此处均合成输入，未接真实伴侣流。

D最终验证/公开核查/推送在完成时补记。待实机：明确测试目标的真实身份/页面形态、浏览器官方SDK鉴权/签名/长期恢复、真实伴侣HTTP/WSS/重启连续性；纯UID及实际roomId映射、直接WSS参数发现仍缺可靠实现，按UNKNOWN/不可用报告而不伪造。A—D是安全实现与合成验证，并不等于附件最终生产验收全部通过。

D完成验证：独立C#构建退出0，全套90/90（.local/monitor-d-tests.log）；配置/监控/调度/登录设置/Hook匹配GUI、160条历史/RAW/Proto/Replay GUI、日志筛选与受认证脱敏实际导出，三组浏览器错误均0。Parser六原文件哈希核对6/6且created=0；三参考仓库git状态干净。公开扫描154文件0发现。限定端口复查18780/18781/18782 PID仍为50636/8868/46464，旧8827/8888仍18644；18783/18827无监听。没有绕过旧长期启动拒绝，当前长期18782仍旧后端、新面板按能力禁用；新代码已在临时自有网关通过测试但未长期部署。

## 16. 阶段E：闭环与运行可靠性（2026-10-13）

任务E-20261013，owner本对话，按用户E1→E5串行实现/提交；当前基线d793771。真实目标及账号只由用户在本机GUI输入；不读取其他账号或历史样本，不派工，不更改CA/代理/index/伴侣。功能验证与真实平台持续运行分别留证。

E1新增src/instance.js单数据域SQLite进程租约：第二个活宿主拒绝、正常退出释放，崩溃宿主PID已不存在时新进程可原子接管；活PID复用或权限未知保守拒绝。system/status增加加载时instanceId/commit/dirty/codeFingerprint/startedAt与实际Profiles/Monitor/Coordinator状态；GUI展示实例与加载后端commit，避免静态新页面冒充新版后端。Runtime初始化失败释放租约。

E1验证：2项新增回归先失败后通过，租约/实例API与Replay物理隔离针对回归、Profile GUI进行核查；Parser六原文件6/6、Web v5/Browser v3固定准备核验、C#独立构建退出0。本次启动前18783空闲且data/pipeline-20261013不存在；18780/18781/18782本轮检查已无监听（未由本任务停止），旧8827/8888仍PID18644。长期启动结果在后续段记录，不把临时GUI网关当部署。

E1已推送f381be85a198d1fd907400b35c867c58cc9c168e。用户本轮明确授权后一次启动成功，18783/PID48276、instanceId c8aebdc5-59dd-49d9-bbc8-2270134eb8e6，加载f381be8/dirty=false，初始Profiles0/采集STOPPED/默认LiveHookSource。旧监听服务未操作；没有审批拒绝或绕过。用户随后在本地GUI登记目标，AI只读取脱敏配置状态/错误码，不读取其账号与真实RAW。

E2交付开发：浏览器异常区分退出/鉴权访问/429/验证需求，策略失败熔断不自动循环；WSS恢复90秒界限，SDK先处理原连接恢复。Browser v4只有已提交接收RAW后才报告CONNECTED，网络连接创建不冒充有效捕获。Browser实例CDP枚举自有进程→Windows工作集之和、真实接收/重连/队列/媒体阻断统计（共享页重复计入，不是独占内存）；GET sources/browser与GUI。monitor操作ID→调度ID→RAW/Proto/event独立extensions关联，不改变官方输出。针对7项Browser/自动连接回归通过，含实际Edge回环网络及内存读取、HTTP429无敏感响应、真实链路关联；配置/指标GUI浏览器错误0。真实平台尚未通过。

E2已推送ed82dc867428046ef39be912d7fc3950df544c97；其完成时18783仍加载f381be8，明确区分已提交源码与已部署后端。

E3/用户追加网络任务：第一方src/network新增ProxyPolicy、NetworkTransport、只读WinINET助手、域名/地址策略和自有浏览器直连CONNECT隧道。Profile networkPolicy缺省system，与采集connectionMode独立；TargetResolver/Monitor/直接WSS/浏览器/登录窗口统一使用。system/custom目标DNS交给对应HTTP CONNECT/SOCKS5代理，不将本机198.18/15映射作为目标公共地址；direct继续拒绝Fake-IP/内网，固定全部已验证公共DNS答案中的本次地址并保持TLS域名/链验证。不读取Clash私有文件、不改Clash/DNS/系统代理/TUN/CA/伴侣/旧服务，不全局放宽地址策略。PAC/带凭据代理本版本明确不支持，不静默直连兜底。

新版Web v6与Browser v5仅加入请求策略注入；官方六解析原文件/上游live.js与四浏览器资源hash保持。既有心跳/ACK/RAW屏障、Browser rawBeforeAck=false、去重/场次/Replay/自动调度规则未修改。目标解析补明确missingConditions、嵌套roomInfo.room及所有已指定身份约束同时匹配；仅结构化证据，无法确认仍UNKNOWN。网络诊断GUI/API分别展示mode、DNS委托/公共验证、实际route/connectionState/TLS/error；networkCheck为独立探测，不推进Monitor/Coordinator。自定义地址只写且跨重启保存。

验证：全套**101/101自动化通过**（.local/e-network-tests.log）；Parser6/6、Web v6及Browser v5准备固定hash核验；C#本增量无变更，沿用E1独立成功构建。真实回环HTTP CONNECT/SOCKS5/HTTPS/WSS加模拟198.18与198.19，目标DNS调用0、TLS主机名错误拒绝、direct/混合DNS/浏览器CONNECT拒绝Fake-IP，正式WebSource及Edge→合成RAW/业务事件/媒体阻断均通过。首次扩展测试因模拟代理未处理浏览器后台CONNECT及遗漏连接清理而等待；修正拒绝无关请求并按所有权清理。另修测试RAW先提交而事件尚未完成的等待条件，不把RAW行已出现当整个业务链完成。

Profile/网络诊断GUI与160合成事件历史锚点/虚拟滚动/断线补查均浏览器错误0。一次既有verify-workbench附带59Golden复跑通过及GUI/隔离回放检查，未重新审计全量样本，原始数据未复制/上传；Golden不证明业务语义或实时采集正确。公开扫描169文件0发现；只有源码、合成fixture生成器及契约/进度拟提交，临时证书/RAW/SQLite/日志均忽略。代码核查与本地回归状态验证通过；真实平台/官方SDK持续监听尚未通过。

部署前18783采集STOPPED、人工选择LiveHookSource，用户已有一配置保留（monitorEnabled/autoStart均false）。旧8827/8888仍PID18644；18780/18781/18782/18827无监听且未由本任务停止。下一步提交后更新自有18783，核对实际加载commit/配置恢复，再对用户本地登记目标做不触发监听的代理路径诊断。E4孤立RAW/journal/Replay job/协调重启恢复与真实持续验收仍待，不能以代理可达或模拟成功标E完成。

网络功能增量已推送29cc6d7b58e1123073b98ec8b4a725226b29b0af，远程main相同。随后自有18783停止/启动的整条命令被自动审批以blocked by policy拒绝；无更详细原因，整条未执行，未尝试替代启动路径。复查18783仍PID48276/f381be8，旧8827/8888仍PID18644。提供只供用户手动执行的tools/restart-dev-workbench.ps1，核对PID/完整加载commit/STOPPED及Node入口后沿用同数据目录，不把磁盘新界面当新版后端。

无需重启的真实网络只读验证：只从指定本项目SQLite的用户已登记Profile读取目标/超时/网络模式（不读取登录态、Cookie或RAW），新代码独立probe、不写监控/业务状态。2026-10-13北京时间07:43:48，880ms，经现有Windows静态回环HTTP CONNECT代理、代理侧DNS、正常目标TLS验证取得页面成功；localDnsUsed=false、connectionState=connected、网络errorCode=null，RAW/events/sessions计数不变。结构化房间证据仍MONITOR_EVIDENCE_UNAVAILABLE/UNKNOWN；这证明当前代理网络可达，不能证明真实开播、身份映射、官方SDK/WSS捕获或持续恢复。报告只保留脱敏摘要.local/e-network-real-summary.json，页面正文/用户身份未输出/上传。下一步由用户手动更新18783并在GUI选用系统网络/浏览器采集及人工WebSource选择，真实闭环及E4继续待验收。

## 17. 独立账号与日常流程（2026-10-13）

任务ACCOUNT-20261013增量1，owner本对话，基线核对本地/远程e21c4caa140a211a8e8b0b5ec91de2f6fef717c4，工作区初始干净。用户附件明确要求直接实现，不派工、不重复总体审计；新增兼容接口见[ACCOUNTS v1](../contracts/ACCOUNTS.md)。后续内部Web直连/browser自动切换已获用户授权，但本增量不把该功能或真实直连标完成。

已交付源码：auth/auth-profile-store、login-manager、login-browser-session独立账号/临时窗口生命周期；复用官方AccountMonitor/createLoginContext及现有LoginVault/DPAPI。登录无需Profile/roomId/全局Source，无直播间亦可；official-self-api新鲜确认、有效快照、用户rememberLogin后自动保存；保存与自有窗口释放完成才报告AUTHENTICATED。匿名/未经验证/空快照/取消/迟到回调不覆盖旧凭据，重复创建登录不会留下多余账号；关闭后拒绝迟到命令。未记住时只在进程内保存会话，重启已有保存状态仍UNKNOWN。多个MonitorProfile共享authProfileId，Browser采集读取共享或旧vault；旧私有文件只登记原引用，不搬移或扫描其他账号文件。

Gateway新增accounts查询/版本化命令/WS状态及中文错误message/nextAction；公开DTO不含Cookie/用户资料/登录快照。简易GUI增加独立账号区、记住/重新登录/查看/清除/关闭、直播间账号选择和中文状态摘要，保留底层诊断。开始监听为单一listen命令：版本/串行/单资源检查后由用户意图选择配置来源并连续确认，不抢占其他采集；未开播的用户选择供后续监控使用，停止/切源清除并保持同场抑制。后台Monitor仍不切全局Source。账号登录/清除不关闭已有采集。旧共享账号保存/清除入口引导到账号管理，避免按某个房间误清除共享凭据。

验证通过（合成/本机范围）：6项新回归先失败后通过，覆盖无目标/LiveHook选择下独立登录、真实DPAPI密文/重启共享、opt-out、取消/晚回调/空快照/重复创建/关闭后拒写、实际回环WSS在账号登录和清除后继续收RAW、用户一次listen真实本机WS连通、实际Edge合成官方self响应后保存并关闭。完整**107/107自动化通过**（.local/accounts-tests.log），另实例hash针对2/2通过。C#独立.local/accounts-capture-build编译退出0（.local/accounts-build.log）；Parser6原文件及Browser4资源固定hash核对，原Parser输出/references未改。账号GUI、配置/监听意图GUI均浏览器错误0；包含两房共享默认账号及另一个非默认账号显式选择。160合成事件历史锚点/虚拟滚动/断线补查及隔离Replay GUI通过、浏览器错误0。公开扫描177文件0发现，临时证书/SQLite/登录密文/RAW/运行日志不进Git，不读取R01。

真实运行事实：用户已将18783手动更新至e21c4ca，当前只读检查PID52652、采集FAILED、选中WebSource、有两配置；没有accounts能力，不能把新磁盘页面当该进程已支持新账号。8827/8888仍PID18644，本任务没有重试此前被拒绝的长期启动/重启动作，没有停止伴侣或旧服务、修改代理/DNS/TUN/CA。手动部署助手新增独立登录窗口占用保护，脚本仅静态语法核对、未执行；用户先停止本项目采集，再按实际PID/完整加载commit更新。

交接/未执行：第一增量实现及合成验收通过，真实扫码、官方页面账号有效性/过期与共享登录态在真实采集中仍待用户更新宿主后验证。直连动态参数与身份映射真实证据、内部自动无头兜底/恢复直连/释放/同场连续性、Proto字典联动和E4孤立RAW/journal/Replay恢复均未完成；不以107测试或WSS代码存在代替真实弹幕接入。下一增量继续WSS优先的可信ConnectionResolver与账号复用，无法可靠直连保持明确不可用并按已授权自动兜底策略推进，不猜测签名或平台语义。

## 18. Chromium登录页加载修复（2026-10-13）

任务LOGIN-PAGE-20261013，owner/交接本对话→用户，基线本地/远程b9a72a9c6f892416eb44c100f66a8068746e96fa，开始时工作区干净。暂停WSS第二增量，串行main，不派工，不改系统网络、references、伴侣、旧服务或已有登录/RAW/数据库/配置。允许写入本任务auth资源/加载诊断、精确网络白名单、加载版本指纹、合成测试/探针及本契约/进度。

根因已用真实匿名页面复现：原策略主动拒绝lf-webcast-platform.bytetos.com的12个CSS和16个脚本，原页面仅3个stylesheet、计算字体Times New Roman；不是图片/字体过滤单独造成CSS丢失。独立登录窗口同时误用了采集端图片/字体过滤，会影响二维码及验证素材。恢复页面CSS后，点击登录还发现按需登录/验证组件的精确CDN主机被拒绝，逐层补证而未全域放行。

已交付：login-resource-policy分离可见登录与后台采集策略；network/target-policy只扩充10个已观察的精确HTTPS资源主机，TLS/代理端DNS/安全直连与目标/WSS策略保留。login-load-diagnostics对主动拒绝、HTTP、代理、超时、DNS/TLS、脚本/console异常作有界脱敏聚合；LoginManager通过既有账号DTO/pageLoad和受保护日志提供查询，关闭后仍可查看本次结果。instance指纹覆盖新组件，避免旧后端页面冒充新实现。源码/证据入口：src/auth/login-browser-session.js、login-resource-policy.js、login-load-diagnostics.js、login-manager.js、src/network/target-policy.js、src/instance.js、tests/login-page.test.js、tools/probe-login-page.mjs、tools/verify-accounts.mjs及[ACCOUNTS](../contracts/ACCOUNTS.md)。正式认证/opt-in DPAPI保存/自动关闭、共享登录态与采集生命周期保持原规则。

本轮可复查验证：

- 新资源回归先失败（CSS未渲染、精确CDN拒绝）再通过；4项针对测试以实际本机Chromium验证CSS样式、JS执行、图片naturalWidth、自制字体解码、媒体不下载/不播放、不安全域拒绝；真实回环CONNECT拒绝/超时与HTTP503、脚本/console异常分别分类，URL/签名/异常原文不进入诊断，80项上限/聚合生效。
- 独立构建命令powershell -NoProfile -ExecutionPolicy Bypass -File tools/build-capture.ps1 -OutputDirectory C:\project\LiveWorkBench\.local\login-page\capture-build退出0。首次npm test使用默认bin/Debug旧2026-10-12产物时有3项采集失败；构建并设置LW_CAPTURE_EXE为该新产物后，失败项所在capture/livehook-tls8/8通过，全套npm test **111/111通过**（.local/login-page/final-tests.log）。不修改原采集逻辑，不把旧构建失败隐瞒为全程通过。复查命令如下：

  ```powershell
  $env:LW_CAPTURE_EXE='C:/project/LiveWorkBench/.local/login-page/capture-build/LiveWorkbench.CaptureHost.exe'
  npm test
  ```
- setup:parser核对6原文件，setup:browser核对4资源/v5，未改官方Parser/references。node tools/verify-accounts.mjs账号GUI（含pageLoad经API展示/共享账号）浏览器错误0；node tools/verify-history.mjs的160合成事件、虚拟行/锚点/断线补查及隔离Replay通过、浏览器错误0。C#本地TLS证书仅测试文件，没有Windows信任导入。
- 真实匿名可见Chromium：node tools/probe-login-page.mjs final-visible visible layout，通过现有system HTTP CONNECT代理、代理端DNS、正常TLS验证访问官方首页；2026-10-13 11:44（Asia/Shanghai）采样stylesheet21、正常系统字体，点击登录后扫码提示可见、二维码图像1、播放媒体0、autoplay0、authenticated=false、credentialsUsed=false。布局截图在.local/login-page/final-visible.png，全部身份文本/图片/二维码遮蔽；真实请求聚合只留本地final-visible.json。已有无头复测也有扫码/二维码证据。
- 官方页面仍有被阻断的非必要媒体/遥测请求，console68及pageerror24（探针分类为网络异常）；不宣称页面所有请求成功或零错误。登录/安全CDN、扫码图像已实际加载，不通过开放遥测域或关TLS来消除计数。验证码完整交互及真实扫码尚待人工。

部署边界：本轮仅只读核对18783仍PID29036、加载b9a72a9、capture STOPPED、独立登录窗口关闭；8827/8888仍PID18644。本项目自有短期测试实例/浏览器结束后释放，没有操作18783或旧服务。新版待用户手动调用tools/restart-dev-workbench.ps1 -ExpectedPid 29036 -ExpectedCommit b9a72a9c6f892416eb44c100f66a8068746e96fa（需先在GUI停止采集并关闭旧登录窗口；若实际版本/PID改变，助手拒绝继续，不应强行结束进程）。更新后强制刷新，核对新commit，点击账号登录并按需记住/完成扫码，只有官方确认后才保存关闭。

真实验收状态：官方匿名页面布局/登录入口/二维码加载验证通过；正式18783中的用户扫码、验证码、真实账号DPAPI保存/共享到真实采集待用户手动更新后验收。RAW/Parser/Source/Session/Replay自动化回归通过，不等于真实弹幕或LiveHook恢复验收；WSS第二增量仍暂停，先等待实际登录反馈。

提交前公开检查node tools/check-public.mjs：181文件、0发现；git diff --check通过。报告、遮蔽截图、合成运行数据库/RAW/证书及独立构建产物均被忽略，不入公开Git。本次只提交上述第一方修复、合成验证和必要文档。

## 19. 登录交互与直播流优化边界修复（2026-10-13）

任务LOGIN-INTERACTION-20261013，owner本对话→用户，基线8b6ec862f38a5cb33a75bb1752bbde573c1b156c，初始工作区干净，串行main、不派工。用户新要求替代第18节旧媒体优化范围：登录窗口不作采集优化，后台只拦已识别直播流。允许写入auth验证/保存流程、BrowserSource流策略、基于实际请求的资源权限、已有账号状态文案、测试/探针、加载版本指纹和相关契约；RAW/EventStore/Parser/references/系统网络/伴侣/旧服务不改，WSS第二增量暂停。

定位证据：只读核对正式18783 PID25388、加载8b6ec86、STOPPED、无登录窗口。旧账号诊断有direct/system固定地址隧道失败，也有页面200后DOMAIN_POLICY_DENIED与LOGIN_MEDIA_BLOCKED，两者分别处理；不把代理失败归为过滤错误。匿名system模式实际解析为HTTP CONNECT代理/远端DNS，TLS正常。真实请求再次证实pull-flv-t11.douyincdn.com的FLV与pull-hls-l11-admin.douyincdn.com的HLS下载；仅保留主机、资源类型、路径类别/后缀和计数，不记录完整流URL/参数/身份。旧代码全局play改写/自动pause、按所有媒体及图片/字体拦截和任意媒体MIME停采集，与本轮需求不符。

已交付代码：

- login-browser-session/login-resource-policy移除播放重写、自动暂停、资源类型/名称优化；login-load-diagnostics保留脱敏失败/网络信息。根据官方页面真实已观察请求补充精确遥测/配置/包资源权限和受限投递服务角色，未全局放开任意域、IP、端口、TLS或TargetResolver/直连WSS。
- login-account-evidence独立验证固定AccountMonitor的输出，必须受信任当前账号接口HTTP200、JSON及原生normalizer确认。HTTP500伪成功、未知形状、页面变化/Cookie存在不算认证。并发失败查询不会丢弃真正认证响应。实际匿名页面getMe出现HTTP200非JSON；official-account-query复用当前官方SDK已加载profile/self构建器补查询，已实际得到HTTP200/status_code8访客证据；不构造签名URL或把缓存对象当网络证明。
- LoginManager增加SAVING及DPAPI写入后的快照读回比对，未通过不关闭窗口/不报告remembered；成功返回saveVerified和Cookie/origin计数。十分钟未完成只提示，不强制关窗。public/app.js只更新已有账号状态提示，无新主题。现有共享账号、opt-out/取消/空快照保护及采集不中断保留。
- capture/browser/live-stream-policy独立分类/保护：受证实拉流服务的FLV/HLS、成功room响应声明的精确stream_url及其manifest目录ts/m4s分片；不凭通用后缀/资源类型/live或video关键词拦截。普通播放调用原生方法，已识别流才阻止下载与播放。普通/不确定媒体继续并计数，普通媒体403不停止采集。blockMedia=false关闭优化，rawBeforeAck=false保留。URLs只存当前策略内存、最多256；未知流/缓存/MSE/blob关联、规则生效前的字节不承诺全部阻断，未声明零带宽/零丢包。

主要文件：src/auth/login-browser-session.js、login-resource-policy.js、login-account-evidence.js、official-account-query.js、login-manager.js、login-load-diagnostics.js；src/capture/browser/browser-source.js、live-stream-policy.js；src/network/target-policy.js、src/instance.js；public/app.js；tests/login-interaction.test.js、live-stream-policy.test.js、login-page.test.js、browser-source.test.js、network-integration.test.js；tools/probe-login-page.mjs。契约同步ACCOUNTS/MONITOR_PROFILES，均为本任务兼容补充。

可复查验证与实际状态：

1. 针对性回归先失败再通过：原登录拦截普通媒体；原检测接受HTTP500的成功JSON；原保存不读回即关闭；并发失败可能覆盖认证；任意普通媒体会停止来源。现验证同一URL页面按钮正常反馈、原生播放未改、有效/无效官方证据区分、失败保留窗口、等待超时不关窗、SDK补查询、真实DPAPI及既有共享/重启数据复用、普通音频实际播放，直播播放与fetch下载分别拒绝。
2. 独立C#构建退出0：powershell -NoProfile -ExecutionPolicy Bypass -File tools/build-capture.ps1 -OutputDirectory C:\project\LiveWorkBench\.local\login-boundary\capture-build。设置LW_CAPTURE_EXE为其LiveWorkbench.CaptureHost.exe后npm test **120/120通过**，日志.local/login-boundary/final-tests.log。首次全套118/119，唯一失败是旧代理集成测试要求阻断任意/video.flv；已改为证实的拉流服务合成URL，HTTP CONNECT/SOCKS远端DNS/TLS/WSS/RAW联测复验通过，未放宽生产媒体规则来迁就旧断言。
3. Parser6固定文件、Browser4/v5资源hash核对成功，未修改官方代码。node tools/verify-accounts.mjs和verify-history.mjs均浏览器错误0；账号共享/自动保存与160合成事件、历史锚点、虚拟滚动、重连补查、隔离Replay通过。公开检查186文件0发现、diff校验通过；运行证据、RAW/SQLite/证书/账号状态均不入Git。
4. 真实匿名页面A/B：boundary-before脚本异常24、媒体播放0；移除优化并允许已观察普通资源后boundary-after脚本异常0、原生媒体播放4，扫码提示/二维码图像1。SDK补查询后boundary-auth-query脚本异常0、扫码图像1、正常媒体播放3、HTTP200/status_code8访客两次，confirmed=0；这是正常登录页行为，不能当后台优化失效。摘要仅本地.local/login-page/boundary-*.json，无真实账号/Cookie保存。平台仍有请求取消/隧道等诊断，不能宣称所有请求成功。工具追加visible --wait-for-user控制调试模式，不改DOM、不限时关闭、不持久化凭据，人工关闭后输出脱敏诊断；不能与layout遮蔽模式混用。

真实用户验收：用户本轮明确回复“完成后我手动更新并扫码”。因此代码、本机/合成和匿名平台加载验证通过；真实扫码后页面反馈、官方确认、DPAPI保存及真实账号重启复用仍待用户在正式新版18783完成，不以合成或访客页面冒充。必要诊断可在账号pageLoad.authentication、login/saveVerified与受保护日志查看，不需发送身份/Cookie/二维码。

部署/交接：未停止或重启18783，8827/8888仍PID18644；Windows代理/Clash/TUN/DNS/CA、伴侣和原数据不操作。用户在GUI停止采集并关闭旧登录窗口后，手动执行tools/restart-dev-workbench.ps1 -ExpectedPid 25388 -ExpectedCommit 8b6ec862f38a5cb33a75bb1752bbde573c1b156c；若归属/PID/版本改变助手拒绝继续。刷新核对新加载commit后登录、扫码并按需记住；窗口只有官方确认和必要保存/读回完成才自动关闭。后续先收集真实反馈；若官方形状/隧道仍失败保留窗口与原因，不继续WSS第二增量或猜测认证成功。

部署补记（2026-10-13 20:19，北京时间）：用户随后明确授权由本任务重启18783。预检发现18783已无监听、原PID25388不存在，因此沿用data/pipeline-20261013及既有捕获构建启动新版，无需停止进程。新PID49944实际加载c666da9a9ce0b141fa10e92370f09c846acaf98c，启动时dirty=false，绑定127.0.0.1:18783。经首页取得本机会话后查询/api/v1/system/status与/api/v1/health：backendReady=true、health=ok、capture=STOPPED、登录窗口关闭；首页/app.js/app.css均HTTP200。旧8827/8888仍PID18644，未操作其他服务或系统环境。运行日志位于忽略的.local/deployment/。此项只确认新版部署与接口健康；真实扫码、官方认证、保存及重启复用仍待人工验收。后续刷新工作台后继续扫码反馈，第二增量WSS仍暂停。

## 20. 手机确认后停留排障（2026-10-13）

用户真实反馈：扫码进入“需在手机上进行确认”，手机同意后无后续；用户按F5刷新后又回到初次访问。正式c666da9/18783本次脱敏诊断显示系统HTTP代理、代理侧DNS、正常TLS、页面已响应、pageErrors=0；官方账号响应仍未确认登录，保存未配置。zijieapi.com有少量脚本域名拒绝，但尚无证据表明其导致登录失败，未猜测添加白名单。扫码/回调环节缺少诊断，不能把当前阻塞直接归为保存失败或声称根因全部解决。

本次第一方修复：login-browser-session等待已收到账号响应的验证结束，未支持的主接口结构也可触发现有官方SDK的profile/self备用查询；login-account-evidence将官方拒绝与未知结构区分，追加不含身份的固定接口/结构/数值错误码。login-load-diagnostics追加扫码生成、轮询、challenge/ticket及其他passport请求的有限状态诊断；信号只用于排障，不用于认证。未修改官方Parser/AccountMonitor、网络策略、媒体策略、RAW/Storage或系统设置。

自动化：新回归先失败后通过，复现主接口未知结构跳过备用查询以及异步验证竞态；验证官方拒绝不误标结构、扫码错误可定位、隐私字段不输出、关闭后迟到响应无效。针对性14/14通过；沿用本轮已构建且未改的C#捕获宿主设置LW_CAPTURE_EXE后执行npm test，完整124/124通过（.local/login-flow-regression.log）。本轮无C#源码变更，未重复构建。真实匿名页面仅验证扫码接口可响应；真实手机确认、网页登录态落地及保存仍待更新后的再次扫码，不能由合成测试替代。下一步在用户已授权的18783重启范围内部署，保留已有账号/配置/数据，再读取本地脱敏流程证据继续排障。

20:38匿名实测：沿现有system代理，ticket-guard/challenge/qr-create均HTTP200；qr-poll四次HTTP200、errorCode=0、pollStatus=new；profile/self为HTTP200/responseCode=8访客、confirmed=0，pageErrors=0。新流程诊断在真实官方匿名页面已生效，未读取或保存真实账号；本地脱敏报告.local/login-flow-anonymous.json。公开检查187文件0发现。

修复提交47b408976ef5e070511f6429abe5ee1eb3060c2b已推送并核对远程main一致。随后在用户已明确授权的范围内尝试关闭未完成的临时登录窗口、调用现有部署助手重启18783；整条命令在执行前被自动审批拒绝，仅返回blocked by policy，没有更详细原因。没有重试或改换启动方式绕过。只读复查仍是原PID49944/c666da9、capture=STOPPED，窗口已关闭；被拒绝的整条命令未执行。已向用户提供先在GUI关闭临时登录窗口，再手动运行tools/restart-dev-workbench.ps1 -ExpectedPid 49944 -ExpectedCommit c666da9a9ce0b141fa10e92370f09c846acaf98c的步骤。当前阻塞是新版部署/再次真实扫码；后续以新pageLoad.loginFlow与authentication.lastResponse定位，不能把已推送源码当成已部署或已修复真实扫码。

## 21. 一键本地部署（2026-10-14）

用户明确要求新增一键入口，未授权本轮重启长期18783。owner本会话，串行main；写入根BAT、tools/deploy-dev-workbench.ps1及原restart助手、针对测试/README/STATUS。另有live-hook-daemon一行复用现有LW_CAPTURE_EXE，使观察器与CaptureBridge选择本次构建；没有修改其采集/HookReady语义或公共API。账号与扫码诊断仍维持前节状态，未开展第二增量WSS。

实现：BAT双击后以UTF8中文显示阶段、失败原因、诊断代码及保留窗口；PS1自动取得受认证API的实际PID/Commit/采集/登录/健康状态及Git HEAD，不固定旧PID/Commit。复用原restart助手的唯一受保护Stop-Process位置，增加监听端口/Node入口/同Windows用户/SQLite只读租约、进程创建时间及实例nonce核查，构建后再校验。使用独立.local/deploy-builds输出和现有build-capture；--stdio --smoke验证ready、proxyBound=false、hookReady=false与退出0，再以临时独立Runtime验证Node依赖/官方Parser/SQLite。旧PID退出和端口释放后才启动新实例，沿用data/pipeline-20261013，核查新PID、实际Commit、健康、租约以及构建期间Git变化；同版本健康时不重启。部署文件锁阻止并发部署；不提权、不使用-Force/taskkill、不删除租约或数据、不绕过审批、不修改系统网络/证书/伴侣/其他服务。原带ExpectedPid/ExpectedCommit的手动入口仍可用，现在验证后在后台运行并返回，而非占用终端一直等待。

失败边界：采集/登录/身份/目录归属、工作区未提交修改、构建/验证失败时保留旧进程。首次启动或状态不可读取时拒绝，由用户按README先启动已有实例；不拿任意端口进程当可结束目标。旧实例已经退出后发生启动失败/目标版本不符，明确报告失败，保留私有运行日志和数据，不声称已回滚/保住旧进程，不强制清理未知进程。文件系统没有复制或删除账号、Cookie、事件库或真实RAW；临时验证数据与测试输入独立。

验证进度：部署回归先失败后通过；实际cmd.exe运行BAT的合成入口验证中文与退出码0/3，Windows PowerShell 5.1测试覆盖采集/登录占用、异项目Node、错误Windows用户、错误数据租约、构建/运行依赖失败、源码/采集在构建期间变化、同版本、旧退出/新启动/新Commit不符，真实CaptureHost用于stdio验证。真实MSBuild独立构建与Test-LwCaptureHost/Test-LwRuntime退出0（.local/deploy-builds/verify-7ebc72a2359447188b9ae6b754803649，exe SHA256 ebe2a4928b812142c2207e892fc5791f06b274102882791a2a57efcaa223d8aa）。只读预检实际18783归属通过，仍PID49944/c666da9/STOPPED、登录窗口关闭；没有执行正式部署。

首次全套138项135通过/3失败：browser-source的DPAPI AUTH_STATE_UNAVAILABLE、浏览器WSS等待，以及capture的中断分片缺口等待；三项单独复查均通过。新增PowerShell/CIM部署测试与Chromium/C#并行时产生明显延迟；未更改生产超时或放宽断言，将npm test限制为4个测试文件并发后重新验证。最终完整回归/公开审查结果在完成时补记。正式双击长期实例部署、真实扫码确认/DPAPI保存与真实捕获尚未验收；不能用隔离部署通过替代。

最终验证通过（自动化/本机隔离范围）：设置LW_CAPTURE_EXE为上述本次构建后执行npm test，**139/139通过**（.local/deployment/bounded-regression.log，约171秒）；包含14项部署/BAT回归及观察器选用本次构建的回归。源码diff校验通过，公开检查190文件0发现；PS1以UTF8 BOM/CRLF保留Windows PowerShell中文兼容，BAT以UTF8无BOM/CRLF验证中文入口。完成时只读复查18783仍PID49944/c666da9/STOPPED、登录窗口关闭，同Windows用户/端口/租约核查通过；8827/8888仍PID18644。Node启动路径与现有Shell匹配。没有运行正式BAT/完整部署来重启18783，也没有重试上次被拒绝的长期重启操作。下一步由用户双击根BAT部署当前HEAD，刷新并核对实际加载Commit，再继续真实扫码排障；本工具只解决本地部署操作，不代表扫码/真实采集已验收。

## 22. 简易工作台操作分层（2026-10-14）

任务UI-NAV-20261014，owner本会话→用户。基线1473ba35bc0966ca836d2b12fd56b14b86dfd45d，主工作区main初始干净。用户明确要求原生HTML/CSS/JS低风险整理与实际GUI验收，禁止后端/API/数据库/业务规则改动及长期服务操作。使用本聊天附加的隔离worktree与codex/workbench-navigation分支，避免开发中的静态资源被长期实例读取；未派工或消息其他聊天。

实施前建立[原控件与处理函数映射](../reviews/2026-10-14-workbench-controls.md)，原控件ID和后端指令均保留。交付左侧固定五导航与右侧卡片，工作台只显示房间/绑定账号/连接/开始停止/最近实时事件；账号使用列表及详情，清除共享登录态、旧兼容登录态及删除房间须确认。房间日常字段默认展开，身份/连接与网络高级字段折叠；RAW/Proto/历史/Replay归数据记录，Golden/R01、Hook、来源底层控制、旧账号兼容、调度、网络、日志/资源/缺口归开发诊断。底层capture start/stop作为折叠调试入口保留，日常监听只有工作台的一组按钮。切页只切hidden，保留原节点、草稿、WS、异步任务、回放位置和历史锚点；通知移入常驻侧栏，避免遮挡内容。

变更文件：public/index.html、app.css、app.js；tools/gui-navigation.mjs、verify-navigation.mjs，以及既有verify-accounts/verify-profiles/verify-history/verify-workbench四个探针的导航适配；本节和控件映射。src/、API契约、数据库、Parser、SourceController/LoginManager/MonitorCoordinator、references均未修改。未改主题系统或引入框架。

验证通过（本机隔离/合成范围）：

- 原账号/房间/历史探针在整理前后均通过，浏览器脚本错误0；160合成事件、虚拟行、历史锚点（含隐藏页面收到消息）和断线补查保留。node tools/verify-accounts.mjs、verify-profiles.mjs、verify-history.mjs为复查入口。
- node tools/verify-navigation.mjs before / after覆盖账号login/check/reload/close及真实DPAPI保存与清除确认/取消、房间创建修改删除与共享账号、草稿保留、原listen/stop指令、实际回环WebSocket→RAW→官方Parser/存储、人工切源安全、RAW/Proto详情/重新解析、Replay创建/播放/暂停/单步/跳转/停止、59条合成Golden及R01入口/任务保留、日志查询与导出、网络保存与合成路径探针、Hook/资源/健康查询。无未连接或模拟前端控件；平台、账号确认与Golden输入为明确合成夹具，不是生产验收。
- 首页可见按钮46→7（含5导航与开始/停止）。整理前命中2处旧sticky状态栏遮挡；整理后1365/1024/700宽度逐页检查无溢出、重叠或可见启用按钮/折叠入口中心点遮挡，已人工查看截图。报告与截图位于隔离worktree的artifacts/navigation/{before,after}/，忽略且不上传。
- 沿用本机已验证C#产物，设置LW_CAPTURE_EXE=C:/project/LiveWorkBench/.local/login-boundary/capture-build/LiveWorkbench.CaptureHost.exe后npm test **139/139通过**，约95秒，.local/ui-full-regression.log。无C#修改/重建；公开扫描193文件0发现，git diff --check与前端语法检查通过。既有verify-workbench私人R01路径本轮未运行，合成59Golden不冒充真实R01复验。

运行边界/交接：未运行正式部署BAT、停止/重启命令或真实平台登录/采集。收尾只读检查发现18783已无监听、原PID49944不存在；退出原因未核查，不声称由本任务解决或恢复。8827/8888仍PID18644。只在main仍干净且18783仍无监听时允许快进同步本前端提交回主工作区；不自动启动服务。若占用/主工作区变化则保留隔离分支。下一步回到真实登录确认/保存与WSS可信直连及隐藏Chromium兜底主线，不继续扩展UI；真实扫码、真实WSS/恢复及正式长期实例部署尚未验收，需先根据实际服务状态与用户授权接续。

同步补记：实现提交3175d426aee48a3782d31b261efe1e66a84913ff已完成；再次核对main干净、HEAD仍为1473ba3、18783无监听后，以git merge --ff-only将同一已验证提交同步回C:/project/LiveWorkBench。没有执行服务部署、启动或重启。隔离worktree保留本地合成报告和截图；这些证据不进入Git。后续界面/后端实际加载版本仍需在用户授权启动后核对，不能把main代码更新当作服务运行通过。

GitHub同步未完成：git push origin main首次返回Connection was reset，同命令重试返回github.com:443连接失败；未修改代理/Clash/DNS/TUN或绕过网络策略。代码与交接已在本地main提交，远程同步结果未确认，网络可达后可重试同一推送命令。此阻塞不改变本机隔离GUI与139项回归的已验证结果。

## 23. 一键启动、停止、更新（2026-10-14）

任务WORKBENCH-LIFECYCLE-20261014，owner本会话→用户；用户明确“补上”三个管理入口，基线69d01cccb25cb2f79fd32995d9984d6d801c272f，主工作区干净。在既有隔离worktree建立codex/workbench-lifecycle分支，未派工；允许修改管理脚本、BAT、测试、README及本节，不修改src/、public/、API契约、数据库模式和自动监听/单来源/账号复用规则。

实现：根目录新增启动工作台.bat、停止工作台.bat、工作台管理.bat（启动/停止/更新菜单）；一键更新工作台.bat转到同一个tools/workbench-action.bat，统一调用deploy-dev-workbench.ps1的Start/Stop/Update。启动遇到健康的自有实例返回实际PID/版本、不重复启动；未运行时构建/stdio smoke/Runtime预检后启动当前干净HEAD。停止只处理已核对的空闲实例，已停止时无操作；采集未停止或登录窗口未关闭时拒绝。更新运行时受保护重启，未运行时构建验证后直接启动；默认动作仍Update，旧ExpectedPid/Commit重启入口保留。

复用原restart助手的保护，拆成Invoke-LwProtectedStop/Invoke-LwVerifiedStart，仍只有一个生产Stop-Process位置，没有-Force/taskkill/按名称杀进程。检查当前Windows用户、Node入口、实例nonce/创建时间、端口、只读SQLite租约、实际Commit和健康状态；端口检查失败不当作空闲，存活租约/未监听的自有进程/无法归属的相对入口/进程信息不可读均拒绝冷启动。陈旧死PID租约由既有Runtime接管，不删账号、租约或历史。构建失败不停止旧实例；旧实例退出后新启动失败保留日志/数据并明确失败，不强制清理未知进程。Node启动为隐藏后台窗口，日志仍在.local/deployment。不会自动拉Git、修改全局依赖或系统代理/Clash/DNS/TUN/CA、操作伴侣/旧服务或新增开始监听指令。

验证通过（本机隔离）：tests/deploy-workbench.test.js追加10项生命周期/保护回归，实际PowerShell 5.1操作自有合成服务、随机端口和隔离数据，验证冷Start/Update、保留数据、既有实例不重复启动、Stop/重复Stop、采集/登录/异项目拒绝、活动租约/未绑定端口拒绝及端口查询失败拒绝。旧14项部署回归保留；BAT实际cmd.exe验证三个直接入口及菜单三个动作的中文、分发与退出码0/3。首次完整148项147通过，唯一BAT中文条件行被cmd截断，改为独立标签/提示行后针对BAT通过；最终设置LW_CAPTURE_EXE为既有本机验证产物执行npm test，**149/149通过**，约159秒，.local/lifecycle-final-tests.log。新增冷Update曾按预期返回WORKBENCH_STATUS_UNAVAILABLE后通过；初次测试夹具等待Windows signalCode遗漏已修正，不将其归为业务故障。PS1保留UTF8 BOM/CRLF，BAT UTF8无BOM/CRLF；PowerShell5.1语法、git diff --check和公开扫描197文件0发现通过。

交接：只读调用新Get-LwOptionalWorkbenchState核对正式C:/project/LiveWorkBench，结果FORMAL_READONLY_NOT_RUNNING_PROVEN；未启动、停止或更新正式18783，未跑真实平台扫码/WSS。本轮实际启停验证针对合成服务，正式目录/账号/历史保留，首次正式双击启动仍由用户执行并核对实际加载版本。下一步回到真实登录与可信WSS主线，不扩展UI或管理工具。

同步补记：实现提交d22bba643bd6d75b38fe3e6d081bcd4ae7097f0f已快进同步到本地主工作区，并成功推送GitHub main（1473ba3→d22bba6），包含第22节此前未同步的UI和交接提交。此前网络推送阻塞已解除，未修改网络设置。正式工作台仍未执行启停；用户现在可双击根目录启动工作台.bat，或工作台管理.bat选择操作。


## 24. 单观看账号与独立直播间（2026-10-14）

任务 SINGLE-VIEWER-20261014，owner 本会话→用户；基线 aedb61d8af85d7db6c57ef3ba05f77835482e1dc，主工作区干净；复用已附加隔离 worktree 的 codex/single-viewer 分支，不派工。用户明确撤销多账号名称/记住开关/切换/逐房间绑定，允许最小账号兼容调整，禁止擅自重启18783及采集架构重构。实现已交付，真实平台验收待执行；自动化结果见下。

实现：薄 ViewerAccount 适配现有 LoginManager/AuthProfileStore/LoginVault，唯一内部观看槽位默认自动保存，重新登录用正常可见 Chromium 的新临时上下文；官方 self 证据、DPAPI 保存/读回验证成功后关闭窗口。成功前保留旧凭据。退出同队列清理文件、所有同引用内存会话/有效性/页面报告及记录，持久化退出标记避免重启误选其他旧身份；不调用停止采集。旧唯一凭据原地采用，多个候选由用户选；其他凭据保留，清理勾选与确认分开，选中槽位/同文件别名受保护。仅检查已登记引用，不扫描私有目录。

账号页只保留登录/重新登录、退出两种日常操作，临时窗口 check/close、网络与页面诊断折叠保留。旧列表、名称、rememberLogin、profileAuth 和重复 authPanel 移除。GET /accounts、旧房间 authCheck 保留只读；旧认证写入口引导统一槽位，防止旧 authClear 停止采集。房间统一 targetInput 接 URL/分享文本/明确 ID 前缀，无前缀数字明确待指定类型；现有 TargetResolver/安全HTTP读取严格匹配的房间身份与资料，未知/冲突不猜测。当前资料展示仅本机受认证 REST 的固定白名单；avatar 去查询串，identity 不进入通用投影/WS/日志/导出。

新房间无账号绑定，既有绑定字段不批量改写或重建监控版本。日常跨房间及活动目标编辑显式确认 stop→保存/选择→listen，原 Coordinator/Source 控制串行与单来源规则不改。切页保留节点/草稿/WS/任务；数据、RAW/Proto、历史、Replay、Golden、Hook、日志/网络/资源诊断原入口保留。旧加载后端缺 viewerAccount 能力时提示安全更新、禁用新登录/房间写入/开始，原停止/诊断仍可用，不自动部署。

变更路径：src/auth/viewer-account.js、display-info.js、auth-profile-store.js、login-manager.js、login-account-evidence.js；src/server.js、instance.js、public-projection.js、profiles/profile-store.js、targets/resolver.js、monitor/douyin-adapter.js、api/error-messages.js；public/index.html/app.js；tests/viewer.test.js/accounts.test.js/profile-api.test.js；三个对应 GUI 验证脚本；README、ACCOUNTS/PUBLIC_API/MONITOR_PROFILES 与控件映射 docs/reviews/2026-10-14-single-viewer.md。SourceController、MonitorCoordinator、BrowserSource 策略、RAW/Parser/EventStore/Session、SQLite schema、references 未修改。

验证（全部隔离，本机实际 DPAPI/Edge/回环网络，官方响应与账户数据为合成）：

- 新 viewer 用例先失败后实现通过；覆盖自动保存/读回、重启复用、跨房间读取、清理文件/缓存/记录、退出后不误选、迟到回调、旧多候选选择与不改 vault 字节、旧 profile 引用原地迁移、同文件别名防误删、认证/幂等/隐私、明确 ID 类型及目标匹配资料。旧 LoginManager 生命周期与实际 Chromium 合成官方 self 证据测试保留。
- 最终设置 LW_CAPTURE_EXE 为现有本机捕获宿主产物，node --test --test-concurrency=4 tests/*.test.js：157/157通过，约162秒，artifacts/viewer-release-tests.txt；Node v24.15.0，代码 fingerprint f0e000a70b13ffe3a4f5a795bc65b0b36cbe1066ae6d15f0c7cfda6cafc5f580。中间旧逐房间 authSave 断言已按新契约更新，authCheck 只读兼容保留；另一次全量有本机网络夹具 ECONNRESET，单独复测及最终完整复跑通过，未修改网络实现。
- tools/verify-accounts.mjs 实际 Playwright 操作旧凭据选择、取消/确认删除、自动保存、昵称/ID、两房间共用登录态、取消/确认切换（最大同时连接1）、采集中退出仍 CONNECTED 并继续 RAW、无空账号条目与旧后端能力提示；0浏览器错误。tools/verify-profiles.mjs 房间 CRUD、确认监控、网络设置/诊断/资源查询通过。
- tools/verify-navigation.mjs after 全数据与诊断路径通过：实际回环 WS/RAW/官方 Parser、事件/历史/RAW/Proto/重解析、Replay、59/59 合成 Golden、Hook/网络、日志查询/导出、资源/健康。5导航、首页7按钮；1365/1024/700宽度无溢出/重叠/遮挡，已人工检查单账号与窄屏截图。移除控件按新单账号规格显式列入允许清单，未删除数据或采集诊断功能。
- 公开扫描201文件0发现、git diff --check通过。报告与截图保存在隔离 worktree 的 artifacts/viewer、artifacts/navigation/after、artifacts/viewer-*.txt，均忽略且不上传。

未验证：真实扫码（需人完成官方验证）、真实账号过期/资料形状、真实分享URL/主播资料及同观看账号实际多房间访问、平台动态 WSS 参数/直连、隐藏浏览器真实兜底/恢复、正式账号迁移及长期采集压力；不能用合成 HTTP/WS/Golden 替代。重启后保存状态可复用不等于当下已官方确认，身份信息在再次确认前不伪造。退出保留活动采集上下文，后续新连接或重连可能需要登录，界面确认与说明已准确列出。

服务边界：任务开始只读观察18783 PID29792；结束前复查已无监听且该PID不存在，停止原因未知，本任务没有执行正式端口/进程启停。仅启停随机端口隔离服务及部署测试自己的夹具；没有修改系统代理/Clash/TUN/DNS/CA、操作伴侣/旧监听或读取正式 Cookie/RAW/数据库。代码提交不代表正式加载版本更新。下一步回真实登录/可信 WSS 主线，不继续扩展 UI；正式启动/重启仍由用户明确安排。

Git同步：实现及验收提交551a8f30e473bbe31d50eadab3f768e5bf129b62已快进同步到主工作区main并成功推送GitHub（aedb61d→551a8f3）。中间fetch/push曾连接重置或443不可达，普通重试恢复，未调整系统网络。交接补记随本段文档提交同步；代码更新与正式服务运行验收仍分开。


## 25. 真实监听阻塞定位与 Pace 页面兼容（2026-10-14）

任务 MONITOR-PACE-20261014，owner 本会话→用户，基线2970a28012d2392c34608d22bfeeb3fa077c8080，隔离 codex/monitor-pace。用户报告观看账号已登录，但点击监听后 STOPPED/NO_MATCHING_READY_PROFILE。先只读核查18783：PID42296实际加载2970a28、dirty=false；观看槽位已官方确认；目标解析已到 RESOLVED_PAGE，周期监控已开启，但检测6次失败，MONITOR_EVIDENCE_UNAVAILABLE，网络direct/TLS成功；选择 direct 且 browserFallback=false。

真实根因：当前官方页面使用 self.__pace_f.push 承载 Flight 数据，旧 documents 只支持 __next_f。仅查询 runtime_state 中选中 profile 的目标配置（SQLite只读，不读账号/RAW/事件），用既有安全HTTP读取匿名官方页面，不保存响应，不打印或提交真实房号/UID/昵称/流URL。观察27个Pace字符串帧、5个可解析JSON文档及 roomStore.roomInfo.room。相同页面旧提取 UNKNOWN/MONITOR_EVIDENCE_UNAVAILABLE，兼容提取 LIVE，room/anchor非空且web_rid严格匹配目标。该证据证明开播检测兼容问题，不证明登录态、WSS连接、RAW链或推流语义全面验收。

最小修复：src/monitor/douyin-adapter.js 的 Flight 字符串白名单新增明确 __pace_f；仍不eval或执行页面脚本，不改变所有目标身份约束、冲突、状态、单活动来源与连续确认。未修改 SourceController/MonitorCoordinator/BrowserSource/网络/登录/RAW/Parser/EventStore。tests/target-evidence.test.js增加真实形状的合成用例，先2项失败再修复，通过Pace/Next、错误房号/UID拒绝、未知global和表达式不执行、跨流主房间冲突UNKNOWN。

验收：node --test tests/target-evidence.test.js tests/monitor.test.js tests/coordinator.test.js tests/profile-api.test.js tests/monitor-session.test.js，16/16通过（约6.6秒），隔离 artifacts/pace-tests.txt；tools/verify-profiles.mjs 实际Edge GUI通过、0页面错误，artifacts/pace-profiles.txt。真实匿名页面复测旧UNKNOWN/新LIVE，未运行采集；公开扫描201文件0发现，git diff --check通过。本轮仅改检测兼容、相关测试及必要契约/进度，不重新执行无关架构审计或完整历史读取。

剩余独立阻塞：WebConnectionResolver 尚无生产 directProvider，当前房间关闭浏览器兜底。即使检测修复加载，纯direct仍会返回 WEB_DYNAMIC_PARAMETERS_UNAVAILABLE。应由用户明确启用现有浏览器兜底/浏览器方式后实际验收；不能以强行放行UNKNOWN或虚构直连参数解决。现18783进程未启停、配置未改变、采集未启动；新代码仅提交，不代表服务已加载。按用户“不得擅自重启18783”约束，加载修复及启用该房间兜底需用户确认。下一步在确认后保留数据与登录态受保护更新，再验证真实隐藏浏览器/WSS/RAW；可信真实直连继续作为未完成主线。


## 26. 用户授权直接操作与真实浏览器模式复核（2026-10-14）

用户随后明确“直接操作”，授权本次加载修复、调整选中房间兜底并实际监听。沿既有受保护Update流程确认STOPPED/无登录窗口、独立构建/stdio/Runtime预检，将18783从PID42296/2970a28更新到PID20740/d038024，数据与观看槽位保留。选中房间browserFallback=true；匿名监控LIVE与身份匹配已通过，真实初次无头浏览器失败，未产生正式RAW或事件。

继续单活动来源排查：停止失败的项目浏览器连接后，分别使用应用direct及现有system路由复测，后者仅修改该房间networkPolicy，不改Windows/Clash/DNS/TUN/CA。正常页面能播放；隔离诊断用同一DPAPI状态，官方profile/self两次确认authenticated，未出现可见验证码；无头窗口/webcast/im/fetch/返回HTTP200、空体，只观察到无关frontier连接。不是已确认“需验证码”。同一配置正常可见窗口返回application/protobuffer约85KB，并观察到webcast100-ws-web-lq.douyin.com /webcast/im/push/v2/带room_id、29帧。未输出Cookie/账号ID/签名URL、未把frontier流当直播弹幕；诊断截图及一次空响应RAW仅在忽略的.local/listen-diagnostic，RAW保存后才检查，不修改正式历史。

最小兼容：ProfileStore增加默认true的browserHeadless布尔值，WebConnectionResolver把显式false传给既有BrowserSource，SourceController/MonitorCoordinator和浏览器SDK/媒体策略未改。只为该房间选择正常窗口，其他房间默认后台不变；仍需原兜底开关。instance fingerprint增加连接解析文件。两项用例先失败后实现，相关27/27回归通过（约10.6秒）、verify-profiles真实GUI通过0错误、公开201文件0发现、差异检查通过。正常窗口正式监听/RAW结果在后续交接补记，不把诊断帧当已接通生产采集。


正式采集交接补记：用户授权范围内再次受保护Update到PID41096，实际加载6eb4a075085468814d4bada5e49a21d8cb6b16d9，fingerprint df83684705110d79b3cab3c21bdd7d01781b86429f972423a1ac7d2104dd55da。选中房间版本9，system网络、browserFallback=true、browserHeadless=false、blockMedia=true；不改其他房间、系统环境、伴侣或旧监听。正常窗口正式采集已CONNECTED，匹配房间的真实直播WSS只有1条连接；两次受认证Gateway快照RAW提交77→230、事件109→327，failed=0、queuePending=0。实际Member/Like/Chat事件可查询，单条live事件同时关联RAW与Proto。正常浏览器窗口留给采集继续运行，没有在交接时停止它；用户关闭窗口会断开采集。

这次真实验证覆盖已保存观看态复用、真实开播结构兼容、正常窗口官方WSS、RAW先保存/官方解析/事件持久化和查询的当前房间路径。它是browser采集，不是尚未实现的纯Node真实WSS直连provider。长期恢复/压力、其他房间与无头模式成功仍未验收；媒体限制配置保留，但实际blockedMedia=0、unclassifiedMedia=2，不能声明本目标的媒体优化已验证。私有诊断与真实RAW/SQLite不上传，公开视频帧/头像/签名URL不写公共进度。

实现d038024（Pace）与6eb4a07（单房间正常窗口）均已推送GitHub main；网络临时push失败后普通重试与ls-remote核对恢复，未变更代理/DNS。后续仅追加本交接文档，不为文档提交重启正在采集的18783。当前问题已在真实平台实证接通，下一步继续可信直连与后台模式/恢复主线，不扩展UI。

## 27. HTTP 参数发现、原生 WSS 与静默兜底修复（2026-10-14）

基线本地 main 0ae7d11，复用已附加隔离 worktree，本轮单会话完成，没有派工或架构重审。开始时只读确认18783为PID41096、实际加载6eb4a075、fingerprint df83684705110d79b3cab3c21bdd7d01781b86429f972423a1ac7d2104dd55da、STOPPED；与Git HEAD不同。整个任务不重启/停止该服务，不写正式配置/凭据/SQLite，不操作旧监听、伴侣或系统代理/DNS/TUN/CA。隔离真实采集前确认正式STOPPED，期间守卫正式状态；测试仅结束自己创建的实例/连接/浏览器。

实现：新 http-room-discovery/native-parameters/native-signer 补生产 directProvider；使用唯一观看态、按域/path/过期时间发送Cookie，严格核对官方房间/owner和odin.user_unique_id。每次连接/重连重新HTTP发现、调用固定哈希本地资源签名，并再次核对凭据；不缓存签名URL，不造访客ID、历史cursor/internal_ext/wrds_v。30秒expiresAt仅本地新鲜度限制。签名来源与准备见 THIRD_PARTY_NOTICES、tools/setup-wss-signer.mjs；资源只本地忽略，不上传未知许可源码。原LiveClient v6的心跳/ACK/等待RAW持久化/有限重连复用；Parser、RAW、EventStore、SessionManager未改。WebSource只补操作元数据和准确失败码。

控制：人工listen可用新鲜、匹配的HTTP身份证据尝试，不等待周期LIVE确认数，不伪造LIVE/MonitorEvent；自动规则保持。原生失败仅按browserFallback启用隐藏兜底，旧browserHeadless=false不会让direct自动弹窗；显式browser诊断和登录仍可正常窗口。RAW/凭据/身份错误不逃避。后台5分钟探测恢复，先关闭浏览器context/WSS，单独保留进程待原生30秒/至少两包/近期输入稳定，再释放；90秒不稳定回退。stop/关闭/配置变化撤销任务，版本变化也释放已暂停的浏览器。转换不换全局来源，不结束/新建同场，未知消息缺口保留。既有异房间SOURCE_ROOM_BUSY与单活动来源规则未放宽。

媒体根因与修复：原策略遗漏HTML/Pace中的stream_url，且真实声明是HTTP地址、Chromium升级HTTPS后不匹配。现在在HTML/room响应交给脚本前学习匹配本房间的地址，支持SDK嵌套stream_data、FLV/HLS/DASH与关联分片；保留普通资源/鉴权/弹幕WSS和完整登录页。记录真实请求/阻断/失败/未分类/完成的浏览器响应字节。字节范围不含route.fetch参数传输、未完成传输和WSS，不计算节省带宽；未采样null。关闭后内存不沿用旧采样。没有增加UI入口，只在既有状态文本显示实际模式/原因。

真实平台（独立私有live数据，不是合成测试）：

- 先做受限连接试验，再落实纯HTTP provider。生产同路径的隔离Gateway经人工listen：browserLaunches=0，CONNECTED；RAW 5→8→10，Proto 26→46→52，事件8→9，全部事件room匹配；实际ACK4→8、heartbeat1→2。受控终止自己的socket后RECOVERING，记录WEB_CONNECTION_INTERRUPTED/unknown-range，重新HTTP发现/签名后CONNECTED。没有浏览器负责接收或保持窗口。
- 独立无头媒体复核：修复前blocked=0、两次未分类媒体；修复后14次真实流请求在下载前阻断，mediaResponses=0、unclassifiedMedia=0、mediaPolicyGaps=0，knownStreamTargets=26。约32.2MB是当时完成的浏览器响应计量，不是节省量。FLV/HLS/DASH全部类型逐型验收仍未完成。
- 该目标官方无头SDK弹幕初始化仍HTTP200空体（26次），RAW/事件0，准确标BROWSER_IM_FETCH_EMPTY，不称验证码或SDK捕获成功。另一次受控中断、将隔离配置重试限为1，实际进入无头兜底；提前调用同一恢复探测入口，浏览器context关闭/进程保留；真实原生稳定后进程关闭，RAW7→14、目标关联仍正确，记录两次模式转换unknown-range。此验证覆盖恢复执行和释放，不等于已经等待完整5分钟周期或长期恢复验收。

自动化/GUI（合成输入）：npm test 全量记录于忽略 artifacts；最后结果在本节交接补记。新增用例先失败后修复；原生参数新鲜度/身份冲突、明确无头兜底、停止/版本竞态、RAW失败不逃避、真实回环WS/Chromium暂停排空与释放均覆盖。tools/verify-profiles.mjs、tools/verify-navigation.mjs after通过：账号、房间编辑、监听/停止、RAW/Proto/reparse、Replay、59条合成Golden、日志/网络/Hook/资源均实际GUI点击，0页面错误/0布局发现，1365/1024/700截图人工核查。59合成Golden不冒充真实平台输入。

变更边界：src/capture/websource新增三模块、src/auth/request-cookies、SafeDouyinHttp/监控只增身份证据读取；SourceController/Coordinator/WebSource/BrowserSource薄适配；既有状态文案；固定资源准备、指纹、相关测试/GUI工具与文档。没有新前端框架或管理系统。

交接：当前目标原生HTTP/WSS初连、RAW/Proto/事件、ACK/心跳、参数刷新重连、媒体请求拦截、暂停浏览器后原生稳定释放为验证通过。更多真实直播间切换、长期挂机/限流/真实凭据过期、完整5分钟周期、所有媒体协议仍待实测；现有跨目标占用门控保留，本轮未证明任意两个仍在播房间可切换。18783未加载本轮修复，仍是上述旧实例；需要用户另行允许安全加载，不因本轮代码提交而重启。下一步留在真实登录/WSS主线，不继续UI扩展。私有报告、真实RAW/SQLite/账号、Cookie/Token/签名URL和签名原始资源不提交。

最终验证补记：npm test 178/178通过（128.1秒；artifacts/native-final-release.txt），GUI两工具通过，额外Chromium暂停/排空/关闭后的内存状态及版本取消竞态已通过。check:public公开210文件0发现，git diff --check通过；提交前只读确认正式PID41096/6eb4a075/fingerprint不变，STOPPED、inputs1480/events2528未受测试影响。固定签名原始文件与所有真实报告均确认被Git忽略；已保存认证、references和核心Parser/RAW/EventStore/SessionManager/Runtime/LoginManager无差异。

## 28. 实时弹幕独立展示层（2026-10-14—15，第一版及合成回归验证通过）

owner本会话→用户；基线c8613b6，复用已附加隔离worktree的codex/readable-messages，未派工。明确文件清单静态分析，无CDN下载/执行第三方分块，来源目录严格只读。正式18783只读核对PID41096/6eb4a075，RAW1480/事件2528；没有启停服务或浏览器。

A增量已实现并通过针对性验证：src/messages纯MessageView/隐私过滤/字典定位/查询；Gateway本机会话与专用头受控REST；public/messages独立导航、虚拟列表500缓存、分类、历史游标、自动跟随、5类统一详情。Chat/Emoji/特权、Gift原始数量、Like、Member原生文案可读，未知动作/分类不猜。没有修改官方Parser/RAW/EventStore/SessionManager/采集规则；默认公共接口/WS/日志/导出保持脱敏。

A增量提交5d05697：7项新增单元/API测试通过；tools/verify-messages.mjs当时通过实际Edge GUI、520条合成官方编码→RAW→Parser→事件、中文/XSS、字段号/类型、RAW/Proto链、500缓存历史/虚拟DOM、切页草稿、持续新增及1440/1024/700截图，0页面错误。

B增量实现：新增activities纯转换，管理员权限操作/成员任免、红包通知/刷新/结束、福袋状态/参与/开奖结果、ShortTouch更新/移除；对应分类、文字卡片及静态来源可信等级。仅展示事件当时事实，不推断实际领取/中奖、权限枚举或缺失礼物分类。七份CSS只参考已核对的尺寸/排列/视觉角色并独立实现，无原始插件/CSS/资源入库。旧后端能力不足时禁用新入口，不请求不存在的脚本；账号、房间、数据和开发诊断入口保留。发现并修复实时缓存超过500条后的历史游标跳段：当前最旧事件作为起点，服务端验证域后签发快照游标。

真实已有记录：tools/verify-message-records.mjs以只读SQLite、每类最多12条抽样，50条（Chat12、Emoji2、Gift12、Like12、Member12），50可读/0转换失败/0未匹配字段，原JSON未改且均有RAW引用。本地报告artifacts/messages/real-records-report.json只记录统计，不上传正文/昵称。没有新增真实采集；管理员、红包、福袋、活动卡及特权消息没有抽到真实样本，不能以源码线索或合成结果代替真实业务验收。

既有GUI回归：verify-accounts、verify-profiles、verify-navigation after均通过，0页面错误；包含账号迁移选择/自动保存/清除、同观看态配置、房间编辑、监听控制、RAW/Proto/reparse、Replay、59条合成Golden、日志、网络/Hook/资源。账号脚本仅修正过时夹具的本地WSS参数/身份发现，不修改生产模块，亦不证明任意两个真实开播房间可切换。最终全量与新增GUI结果在本节验证补记。

边界与交接：新实现只在src/messages、Gateway只读接口/能力、实例指纹、public展示与测试/文档；官方Parser、RAW、EventStore、SessionManager、SourceController及登录/监控模块无差异。来源目录指定21个文件哈希复核未变。2026-10-15只读复查18783已无监听，原PID41096不存在，退出原因未核查；本任务没有停止/重启正式服务或关闭采集浏览器。提交不会自动加载功能。第一版交付后停止扩展UI，等待用户依据实际展示调整；真实扫码/长期WSS/更多房间验收仍与本轮合成验证分开。

最终验证补记：npm test 190/190通过，0跳过，133.65秒（artifacts/messages-release-tests.txt）；新增历史用例先复现720/520边界错误，修复后通过。最终tools/verify-messages.mjs通过1171条合成RAW/事件，640条离页补查、500缓存淘汰后连续历史、真实隔离Replay引擎/详情、表情图片默认关闭及显式启用、9种管理员/活动路径、旧后端能力降级，0页面错误。1440/1024/700截图已生成，宽/窄截图人工核查；按钮边界、重叠和点击命中检查0发现。一次GUI脚本在历史模式切回live后错误等待屏外最新行超时，改为实际点击“回到最新”，复跑通过，未掩盖产品异常。公开扫描228文件0发现；git diff --check通过。报告及截图在忽略artifacts/messages，原始插件/资源、真实记录/SQLite/账号凭据均未入提交。

## 29. 停止后换房被旧场次占用误拦截（2026-10-15，修复及当前真实目标验证通过）

owner本会话→用户；基线f5aa98c，复用隔离worktree的codex/stopped-room-switch，无派工。只读Gateway确认18783 PID53028实际加载f5aa98c、dirty=false、STOPPED，coordinator.active=null、reason=SOURCE_ROOM_BUSY；选中目标queryState/confirmedState均LIVE、无检测错误。历史仅一个未结束场次，captureState=INTERRUPTED，roomId与当前目标不同。观看凭据configured=true、有效性UNKNOWN不是已确认失效。本轮未操作正式采集、服务启停或浏览器。

根因：Runtime为连续场次恢复activeRoom；SourceController.startProfile在检查实际连接前，用该历史roomId无条件拒绝新房间，因此尚未执行WSS参数provider就报SOURCE_ROOM_BUSY。UI未映射此码，只显示“状态未确认”。此前账号GUI使用两个配置但相同roomId，未覆盖不同房间身份；STATUS27/28已将真实跨房间验收列为未完成，本轮补足该边界。

最小修复：仅SourceController的Web startProfile在STOPPED/FAILED且连接参数确认后，停止并排空旧Web/Browser、取消恢复计划，二次校验配置有效性，递增epoch并切换接收目标；保留旧场次且不造下播。活动连接仍拒绝，LiveHook身份门控不变。Runtime/SessionManager/Parser/RAW/EventStore/登录/监控/数据库结构无改动。首页补明确占用提示及未知错误码，API错误字典同步。

验证：tests/room-handoff.test.js三项先复现失败后通过，覆盖重启恢复后的换房、回旧房保留sessionId、旧epoch及同epoch异房间RAW保留但不发布、活动连接/无效身份拒绝、排空中配置变化拒绝；相关26/26通过。tools/verify-room-handoff.mjs实际Edge点击两个不同roomId，真实回环WSS收取3条合成RAW/官方解析事件，最多1连接、旧场次保留、停止后换房及确认切换、实时弹幕显示、错误提示可见均通过，0页面错误。脚本仅将隔离临时库输入放入live域以覆盖真实门控，不是抖音真实验收。截图及报告在忽略artifacts/room-handoff；全量结果待本节补记。

待完成：正式18783加载修复并重新尝试当前目标后，才能确认真实WSS、RAW/事件连续增长。用户明确禁止擅自重启，必须在代码与回归就绪后取得本次更新授权；本轮没有据UNKNOWN要求重新扫码，也没有清空历史场次、修改系统网络或绕过单活动来源。

最终回归：npm test 193/193通过，0跳过，134.68秒（artifacts/room-handoff-full.txt）；GUI报告artifacts/room-handoff-gui.txt，截图人工检查通过。check:public 230文件0发现，git diff --check通过。提交前只读复查正式仍PID53028/f5aa98c/STOPPED/SOURCE_ROOM_BUSY，无活动coordinator；目标LIVE、历史场次INTERRUPTED且身份不同。修复代码可合入，正式加载和真实跨房间WSS验收仍待用户授权，不把回环测试写成平台成功。

真实验收补记：用户随后明确“允许，不用问我”，授权本次更新与当前目标重试。执行tools/deploy-dev-workbench.ps1 -Action Update，核对旧实例STOPPED/无登录窗口，经构建、stdio及隔离Runtime预检，从PID53028/f5aa98c安全更新为PID41524，实际加载c6ddfc3cde43ab4869b888d5eea8ed907b6ca633，正式数据目录及观看凭据保留。经受认证Gateway对原请求目标发送listen，旧SOURCE_ROOM_BUSY消失；使用既有观看态，HTTP身份发现与原生参数就绪，随后真实WSS CONNECTED，无需重新扫码或启动采集浏览器。

三个真实快照（UTC 2026-10-14 21:09:10—21:09:41，本地2026-10-15）：RAW输入66→105→140，官方解析事件310→406→489，failed=0、rawPending=0、webDecode队列0；每次最新20条当前epoch事件均匹配活动目标，并可生成本机可读展示。抽查真实事件RAW处理链含对应protoId/eventId。采集BrowserSource全程STOPPED/BROWSER_NOT_RUNNING。另用独立无头Edge仅访问本地工作台，实际选择当前配置、打开实时弹幕及RAW/处理链，页面CONNECTED/原生WSS、9条可视行、0页面错误；仅关闭测试自己的本地工作台浏览器，正式WSS保持运行。

私有统计与真实GUI截图在忽略的.local/room-handoff-acceptance，不上传消息正文、用户身份或凭据。此验证证明停止状态下从旧房间转向当前不同真实房间、原生WSS/RAW/官方解析/事件/GUI可用；长期稳定及真实平台来回切换多轮未做，单连接及返回旧sessionId由上述隔离回归覆盖。交接时保留正式采集，不为本次文档提交再次重启；运行代码仍为c6ddfc3。后续按用户已授权范围继续操作，不重复征询同一次更新/重试。

## 30. 2026-10-15 P0 长时间退出调查与最小修复

- 基线 main `748a3eb`，原工作区干净；复用已附属 worktree，在 `codex/stability-data-stage` 实施。正式 18783 当前无监听，不把 Git HEAD 当作在运行版本；没有启动或停止正式采集。
- 私有部署日志 `4104e4ff4a5d42229207c6147752e35e.stderr.log`：PID 24000 于北京时间 10月15日05:26:14启动，07:25:35记录 `Ineffective mark-compacts near heap limit / JavaScript heap out of memory`，堆约4090MB。最后 RAW 时间07:25:33.565，说明这是服务进程退出，不仅是前端失联。约运行1小时59分21秒。日志没有保留进程退出码。
- WER 05:53:51记录 node.exe `RADAR_PRE_LEAK_64`，但没有可关联PID，不能作为同进程或OS主动结束的证据。相关系统事件未提供主动终止证据。没有故障前完整内存曲线或堆快照，不能量化全部内存来源。
- 已复现一个确定的保留路径：固定版本原 loader 的 schema 反射 `__capture` 回调在反射完成后继续收集每次解码的字段表。强制GC后，1000/2000/3000/4000/5000条带嵌套用户的合成Chat，heapUsed约59.8/79.5/100.0/120.4/140.9MB。它能解释持续增长；未宣称已排除其他长期问题。
- 修复：第一方 `load-bounded.js` 校验原文件SHA，在私有生成副本中仅于反射结束停用探针并清空表引用；原 loader、官方解码、RAW/EventStore/SessionManager不改。5000次相同解码GC后增长小于12MB回归通过。
- 轻量诊断：每15秒私有 `dataDir/diagnostics/runtime.jsonl`，最多6×512KiB；记录PID/启动时间/版本指纹、内存、事件循环、连接与待处理数、浏览器进程数、错误代码和状态变化。无消息正文、账号、URL、异常原文或凭据。JS未捕获异常/拒绝与正常退出可记录；原生OOM或OS强杀可能不触发JS退出钩子，仍需部署stderr/Windows记录。未加入自动重启。
- 验证：`node --test tests/parser-loader-lifetime.test.js`通过；诊断/消息API/来源针对回归9/9通过。全套195项中194通过，部署cold-start一项遇到 `PROCESS_SCAN_UNAVAILABLE`；相同单项重跑通过（Windows查询瞬态问题，未改部署脚本）。私有报告 `artifacts/stability-full.txt`、`stability-deploy-recheck.txt`。
- 长测：`node --max-old-space-size=512 tools/soak-workbench.mjs 21600 artifacts/soak-six-hour-20261015` 于北京时间08:05:08启动，独立PID52860，真实回环WS + 合成官方编码消息 + RAW/解析/事件链，每10分钟触发断线重连。6秒冒烟实际7.09秒通过。六小时测试进行中，不能标为长期通过；报告保存在该目录，不提交真实数据。24小时及真实平台长测未执行。
- 交接：P0代码已实现，六小时结果待补；继续P1账号持久展示/官方复验和完整本机业务JSON，再做限定三种P2舞台组件。不会重启正式18783。

## 31. 2026-10-15 P1 单观看账号资料与完整本机业务详情

- 第一方登录适配新增最小资料缓存（现有runtime_state，无数据库schema变化），保存官方成功响应的头像/昵称/抖音号/用户ID/时间。重启仅恢复资料和历史验证时间，当前认证状态仍为UNKNOWN；退出清除缓存、内存和凭据。`displayAvatar`保留可信图片CDN所需查询参数。账号页和工作台摘要直接展示资料、保存状态及当前验证结果，内部JSON仍折叠。
- “验证登录状态”复用现有官方self证据链，在临时无头登录上下文中读取保存凭据；不接管采集、不重写凭据、不打开可见窗口。正常扫码窗口仍完整可见。首次真实探测页面初始化异常、没有self响应，45秒超时正确保留UNKNOWN；第二次以及GUI按钮重试收到官方profile-self HTTP200/status_code=0。不能将间歇性页面失败写成已修复。
- 真实GUI验收：仅复制选中账号的DPAPI凭据到私有隔离数据目录，08:22:56官方确认；昵称/抖音号/平台ID均存在，真实头像naturalWidth=100且加载成功。截图 `artifacts/p1-real-preview/real-account-verified.png` 含私人资料，不上传。正式18783与正式凭据未修改。持久恢复、失败不覆盖历史成功时间、清除资料使用合成测试；本轮未要求重新扫码或退出真实账号。
- 本机受认证 `/local/messages/:id` 的official现在直接来自持久事件的原生业务对象，不再套用localOfficial的字符串/字段/数组截断。消息摘要仍有长度限制；不改变原始事实。树按展开分页构建DOM，长字符串分段显示；完整对象只在选择消息时读取，不是推送到公开WS/日志/导出。
- 新增字段JSON Pointer精确定位 `/field?path=...`，独立于有界字段概览；无法映射显式unknown。新增关联事件的 `/binary?rawId=...&protoId=...&offset=...&limit=...`，每页最多64KiB；只允许关联业务Proto或非HTTP业务RAW，不接受任意文件路径。UI RAW页可翻页查看hex/base64。哈希来自持久索引，分片读取不冒充重新校验整个文件。
- 安全：沿用loopback、会话、同源和本机显式请求头；原生对象只从event.payload.official取值，不读取认证存储。昵称、正文、资源URL和未知业务字段不再人为隐藏，所有前端内容均textContent。映射失败不影响原始JSON读取。
- 验证：账号针对性10/10；消息本机API/身份3/3；大数组1200项、10万字字符串、未知字段、URL完整性、越权字节拒绝与Proto定位回归通过。既有MessageView GUI完整回归通过（1171条合成输入，历史分页/Replay隔离/XSS/三种宽度，0页面异常）。另只读选择100条真实历史事件及关联RAW复制到隔离目录，真实JSON/Proto/RAW GUI通过，截图real-json.png、real-raw.png；不是新增真实采集或长期平台验收。
- 正式服务未启动；隔离预览PID37568，地址记录于私有preview.json。P0六小时进程仍运行，结果待补。下一阶段限定三类视觉组件。

## 32. 2026-10-15 P2 三组件舞台与阶段验收

- 已实施独立Canvas/DOM舞台，共用MessageView；本轮只交付普通/通用特权弹幕、礼物托盘、福袋。未执行官方Webpack块，不扩展成插件平台。资源与调度均有界，页面暂停/隐藏不发采集命令；点击组件进入既有JSON/Proto/中文映射/RAW详情。
- 静态依据、尺寸/布局/颜色、字段与更新规则、缺失资源和未还原项详见 `docs/reviews/2026-10-15-message-stage.md`。没有原版运行截图，参照图明确为独立静态重建。福袋小图标与托盘背景仅私有提取原内嵌PNG；图片/源码不上传，公开的是哈希校验提取工具与第一方组件。
- 首批GUI通过：三组件、真实图像加载机制与请求失败、连击同组更新/结束、福袋状态变化、暂停切页、选中详情、Proto、1440/1024/700布局。修复实测发现的暂停切页绘制恢复和空id_str遮蔽问题。纯调度/映射回归9/9。已有消息GUI再跑1171条合成输入通过，0页面异常，历史分页/Replay/XSS保留。
- 真实历史验收：只读选本机最新Chat/Gift/Lottery各一条到隔离库，真实头像100px、礼物图280px、福袋图96px均加载。私有 `artifacts/stage-real-history/real-stage.png` 和report.json；不是新的平台采集。未找到特权历史样本，特权仅合成/静态验证。原图与真实资料截图不提交。
- 全套 `npm test`：201/201通过，375.7秒，报告 `artifacts/stability-p1-p2-full.txt`。正式代理/证书/伴侣与18783未操作。后续仅新增能力协商保护并针对GUI回归：旧加载进程缺少messageStage/completeLocalBusiness能力时继续显示兼容列表/详情，禁用新舞台并提示安全更新，不加载不存在的JS。实际旧P1隔离进程GUI兼容通过；不把磁盘新版本当成已加载版本。
- 新增Proto载荷分页入口到RAW详情；账号文案改为“最近官方验证成功”，不承诺未来仍有效。真实资料重新由一个新LoginManager从私有缓存读取，头像/昵称/ID和上次成功时间仍在，当前状态为UNKNOWN；这是新管理器读回验证，不声称重启正式服务。
- P0六小时测试仍运行：08:05:08开始，截至约08:43已38分钟、2248 RAW/6744事件、3次主动重连、解析失败0；RSS约139MiB、heapUsed约70MiB。只是阶段读数，不是六小时结果；加载的是P0修复工作树指纹 `d6cdb509c5952d399e09cfb31c94840053fa9ff8593fd387c434c33b72b2fb3b`，不是之后P1/P2版本。实际完成需读取报告endedAt/status，24小时及真实平台长测待验收。
- 自动审批拦截了本轮隔离预览进程的停止操作，以及随后一个合并执行的测试/新预览命令，仅返回blocked by policy、未给具体原因；未执行这些命令、未换方式结束进程。后续使用正常自建自关的隔离GUI测试继续。私有旧预览PID37568仍保留，不能当作最新服务。正式18783仍未启动。
- 接续范围：完成P0有限长测并补充真实时长/结果；第一批三组件等待用户实际效果反馈后再决定后续插件，不继续扩大UI范围。主线原生WSS/RAW/解析/Session规则未重写。

### P0 收尾复核补充

诊断目录创建失败也必须与采集隔离：已将创建错误转为诊断写入失败计数，避免附加诊断让已启动Gateway异常退出。新增不可写目的地回归，诊断专项2/2通过（artifacts/diagnostics-io-failure.txt）。这是201项全套之后的单点变更，未将全套数字擅自增加为重新全跑202项。浏览器进程指标当前仅覆盖采集浏览器，不覆盖用户其它Chrome或临时self验证浏览器。

### 2026-10-15 16:05 长测中断核实与续测

- 本地 main 已快进到 `d75bb4d`，P0/P1/P2分别提交；GitHub HTTPS 443连接超时，两次推送均失败，不能称为已推送。正式18783仍无监听，没有启动服务。
- 当前时间/PID复核推翻了此前“仍运行”的表述：首轮报告最后写入08:51:46，elapsedSeconds=2797.915（约46分38秒）、2758 RAW/8274事件、4次重连、解析失败0，status虽为running但PID52860已不存在，endedAt缺失。诊断最后一条为08:51:46、2759 RAW/8277事件。没有stderr异常或正常退出记录，六小时验收未通过，不能按现在时间补算持续时长。
- Windows System记录13:24:53人工计划外重启请求、13:27:36系统升级计划重启，当前开机时间13:27:53；它们能证明机器重启，不能解释08:51至13:24间为何不再写入，首轮测试中断的直接原因仍未定位。旧隔离预览PID37568也已不存在；本会话未结束它。
- 保留首轮证据；16:04:17启动一次新的有限六小时隔离测试，PID23248、隐藏启动器PID3308，目录 `artifacts/soak-six-hour-20261015-retry`，基线 `d75bb4d`、指纹 `5000d560105442adc1250988c92e4704f489950f93392bcca3b48a53a289bf97`。启动器另记退出码；不自动重启、不使用平台/账号/正式数据。预计22:04后才可能完成，必须以最终报告及退出码为准。
- 已建立本会话小时检查自动化 `liveworkbench`：正常未完成时静默；完成或中断后核对实际时长与指标、补STATUS、尝试同步main并报告，随后暂停。不能把后续自动化当作已完成验收；24小时和真实平台长测仍未执行。P2止于首批三个组件，等待实际效果反馈。


## 33. 2026-10-15 解析展示与原版视觉第二轮校正

owner本会话→用户；基线d1ad615，在已附属codex/stability-data-stage工作区独立完成，无派工。用户授权从原插件目录读取必要依赖。只读现有索引定位426公共块和Canvas Worker，发现先前所谓缺失的特权枚举/Worker实际已下载；纠正首版依赖调查不足。没有执行原JS、下载CDN或修改原目录。

实现：MessageView富文本有序runs/三档特权枚举/托盘原文、背景、动态图/事件时点福袋剩余时间；独立中文字段说明与Proto定位。Canvas去掉普通弹幕强加昵称，补管理标记、40px表情、三档特权颜色/结构与占轨。托盘结束通知只保留列表详情，重复/倒退数量不续期；同组文案也参与区分。福袋恢复紧凑原小入口，活动额外文案/当前倒计时不猜。列表和详情共用行内图文。未改官方Parser、RAW、EventStore、SessionManager及WSS/账号规则。

验证：针对性21/21；舞台GUI通过，原CSS参照实测12项尺寸/字号/颜色一致，字体字宽差异保留；1171条既有消息GUI覆盖RAW/解析/历史分页/Replay/XSS通过。真实63条历史只读转换0失败；真实Chat/Gift/Lottery副本GUI头像/礼物/福袋图成功，并实际选中官方JSON与Proto。发现并修复真实暂停入场卡在左边界外无法点击的问题。私有报告artifacts/fidelity-*.txt、stage-fidelity-v2及stage-fidelity-real，真实截图不上传。原CSS只加载到隔离参照页，不随第一方产品分发。

未验证：没有官方运行截图、真实特权样本、完整礼物分类/冠名/特殊特效、福袋资格/实时校准和原字体；原播放器整体布局/Worker抢占与高级动效未完整移植。完整原版视觉还原仍未通过，不能用12项局部一致取代整体验收。审查详情在docs/reviews/2026-10-15-message-stage.md第二轮章节。

运行事实：调查时正式18783已由现有实例PID28656运行，实际加载d1ad615/指纹007cfb5fdd306bc02749edfe5f0df672f18ad8f06201a030871a3fd1ec58a2db，原生WSS CONNECTED。本轮没有启停它，提交也不使其后端加载新映射。六小时隔离长测PID23248继续运行于原d75bb4d，最后阶段核对约44分钟、解析失败0、4次重连；不把本轮GUI或当前阶段时长写成六小时通过。原自动化继续负责有限长测收尾。

提交前复核：来源清单23项哈希均未改变；公开检查252文件0发现、diff检查通过。最后Canvas字号/24px重复间距/透明度细化后舞台9项及GUI再次通过。正式服务旧映射提示与前端降级保留，未加入需要旧后端无法提供的新静态脚本路由。

## 34. 2026-10-16 六小时测试中断收尾（未通过长期验收）

本次自动化只读取既有证据并更新文档；未重跑、修改产品/测试代码或操作18783。此前视觉校正及P0/P1提交已于上一阶段推送main，最新代码6cc07a4。

- 第二轮仍是d75bb4d/指纹5000d560105442adc1250988c92e4704f489950f93392bcca3b48a53a289bf97的隔离合成测试，不能当作之后视觉版本或真实平台长测。开始10月15日16:04:17.198，最后report.json写入17:00:18.916，elapsedSeconds=3361.718（56分1.718秒）；endedAt为空。10月16日07:46复核，PID23248及启动器3308均不存在；启动器记录亦停留running/exitCode=null，stdout/stderr无结束或异常记录。不能将陈旧running字段、经过的自然时间或两次测试时长相加视为六小时通过。
- **采集链先于进程消失停止**：最后增长快照16:54:46.215，2999 RAW/8997事件；16:54:53诊断已是FAILED/WEB_RETRY_LIMIT_REACHED、connectionAttempts=5。之后至末次报告计数不再增长。4次重连确已发生；parseFailures=0只表示解析未报错，不代表连接仍健康。有效增长证据约50分29秒，后续约5分33秒只是进程采样。
- **已定位测试配置问题**：tools/soak-workbench.mjs把maxAttempts=100放在testOptions，但src/web-source.js创建client时后续的maxAttempts取start配置retryLimit（默认5），覆盖了该值。有限测试在周期断线后耗尽5次连接尝试。另发现测试最终成功判据只检查解析失败为0且事件数大于0，不能发现已停止收数；后续需修正启动重试配置、增加持续增长/连接失败/停滞判据后另行验收。本次依用户自动化指令不修改代码、不自动重跑。
- **进程消失原因仍未定位**：没有endedAt/退出码/JS致命异常或OOM输出。Windows当前开机仍为10月15日13:27:53；本次查询16:50之后的重启/关机及Node Application Error/WER未获得相关证据，不能沿用首轮的重启解释，也不能断言由内存或OS强杀导致。
- 223份报告采样：heapUsed约63.6—74.3MiB；启动RSS峰值约295.5MiB，首分钟后峰值约137.8MiB，最后约120.4MiB。226行有界诊断无解析或诊断写入失败，RAW/解码pending采样峰值均1；无退出记录。该短时曲线未呈现前次线性保留特征，但不足以证明长期修复完成。
- 私有证据原样保留在worktree的artifacts/soak-six-hour-20261015-retry、启动器JSON及stdout/stderr。自动化liveworkbench已暂停，不无限检查或恢复。P0六小时与24小时、真实平台长期验收仍未通过；下一项应先修正有限长测工具的配置及判据，再由用户安排续测。

## 35. 2026-10-16 剩余插件展示增量

用户明确选择“继续实现剩余插件”，本会话在已有codex/stability-data-stage工作区基于干净229966e实施，无派工；正式服务未启停。已实现红包通知/结束卡、ShortTouch按类型更新/移除的图片或文本卡、管理员消息提示，以及选中礼物的资料卡。共用现有MessageView、Canvas/DOM舞台、统一详情；原生JSON与中文说明/增强字段分开。新增有界状态记忆，按mode/namespace/capture/room区分更新；未知ID不猜，过期/移除旧消息不复活。官方Parser、RAW、EventStore、SessionManager、WSS与账号逻辑未修改。

原目录只读，通过既有analysis索引局部核查Redpacket/2722相关模块，25项来源哈希一致。红包内嵌通知图只私有提取；固定认证图片入口增加redpacket-notice。未执行官方Webpack、Lynx/JSB、领取或送礼接口，未提交原JS/CSS/PNG。完整规则、资源缺项及命令见docs/reviews/2026-10-16-activity-stage.md。

验证：针对性26/26通过（活动测试先失败后实现）；新增隔离GUI实际8 RAW/8事件、解析失败0、页面错误0，覆盖红包/活动/管理员/礼物资料的点击、JSON字段与Proto/RAW、暂停/切页、XSS、480/700/1024/1440无卡片重叠和可点击。原CSS重建参照8项红包宽高一致；截图与报告在私有artifacts/stage-activities。原三组件GUI重跑通过；1171 RAW/1171事件的既有消息GUI通过，保留历史分页和Replay隔离。只读63条真实历史转换0失败；没有找到红包/AdminPrivilege/ShortTouch真实样本，新增这些类别只标合成GUI和静态已验证，不标真实平台通过。

未还原：红包实时校准/Ready动效/80×96大卡与领取交互，Empty两张外部图片未下载（当前淡化通知图并标结束）；ShortTouch原Lynx容器内部布局/交互；GiftMenu完整礼物目录/分类/价格/送礼；管理员没有原版独立DOM，提示为工作台自有样式。没有官方运行截图，局部CSS对照不等于整套插件还原。P0长测未通过结论不变。

本轮只读运行核对：18783 PID31460、启动2026-10-15T10:24:25.960Z、实际加载6cc07a4/指纹93637e82a07081cc790ee4fe58ecfae7304dc91098c1efcbc01db5f355d7f7ce、capture STOPPED。新提交不等于后端已更新，旧映射提示保留；静态页面刷新可能读取新文件，新增后端字段/资源入口仍需用户安排安全更新。下一步根据真实红包/活动消息效果校正；本轮不扩大采集或插件平台范围。

交付补充：功能提交7b3d6ca已快进同步本地main，主目录私有redpacket-notice PNG已由哈希校验工具准备。公开检查255文件0发现、diff检查通过，两处工作区干净。git push origin main返回curl 28 / GitHub 443约21秒连接超时及sideband中断；末尾虽有Everything up-to-date，仍不能视为成功，origin/main本地追踪仍229966e。本次功能及此交付记录尚待成功推送，不修改系统网络、不无限重试。

## 36. 2026-10-16 GiftMenu真实消费链与图片恢复加强

owner本会话→用户，基线be02b78，继续在已有worktree实施；没有派工。纠正此前GiftMenu调查遗漏：实际菜单由GroupLiveContainerChangeMessage末项type=6的container_payload.data提供，giftStore仅补价。新增第一方gift-menu.js做有界JSON数据提取，接入只读舞台菜单、分类和详情；消息隐藏/替换、错误保留、迟到拒绝均与房间/采集域隔离。没有执行原脚本、任意容器、送礼或平台活动接口。

视觉与数据：28px菜单图标、12px名称、8px图文间距及悬停价格状态参考原CSS；舞台前两项、详情最多20项，更多内容原生JSON完整可读。只展示消息提供的价格字段，不补目录价格或货币单位。Proto明确只能定位到container_payload #3字符串，不伪造其内JSON字段号。ShortTouch优先级用于等待队列与页面降序，仍不抢占当前展示项；img_layers缺少可靠消费代码，未猜测多层布局。

资源增强：每图最多3个可信候选地址、舞台共享128缓存/6并发/10秒总期限；首图失败后尝试备用，失败原因和成功回退数可见，仍不将远程Image错误谎报为明确HTTP状态。托盘背景、Canvas/DOM、列表和详情使用成功图片，修复舞台回退后详情仍用坏图的不一致。单条资源上限32；默认不加载外部图、原生数据、公共WS和凭据边界不变。

验证：针对性33/33通过（新增菜单/资源用例先失败后实现）；菜单GUI7条合成RAW/7事件、解析失败0、页面错误0，实际操作分类、更新/隐藏、坏JSON保留、图片备用/全失败、悬停、JSON #3/RAW详情，480/700/1440无卡片重叠且可点击；4项原CSS局部对照一致。上轮活动GUI通过；最终三组件GUI及1171 RAW/1171事件消息GUI通过，历史分页/Replay/原详情保持。真实历史只读抽样66条转换0失败，仍无菜单、红包、ShortTouch、AdminPrivilege真实样本；新增类别不标真实平台验收。私有报告/截图artifacts/gift-menu-resources，调查与限制在docs/reviews/2026-10-16-gift-menu-resources.md。25项来源哈希未变，公开检查260文件0发现、diff检查通过。

运行核对：正式18783已由现有操作更新至be02b78，PID29180，启动2026-10-16T04:52:18.428Z；本轮结束前CONNECTED、2882输入/4318事件。这只证明当次服务状态，不证明本轮新菜单已加载或长期稳定。本会话没有启停服务、切房或操作浏览器；提交/同步磁盘后仍需区分旧后端和新静态页。P0长期验收、原Lynx交互、红包领取/大卡/缺失图、完整目录与高级动画仍未完成，不继续扩展框架。

交付：49ad878已快进同步本地main并成功推送GitHub，远端确认229966e..49ad878 main→main，因此上一轮7b3d6ca/be02b78的待推送问题也已解除。本机和worktree均无未提交变更；正式进程未因提交重启。


## 40. 开播证据、观众聊天与入场本机接入（2026-10-17）

owner本会话→用户；代码0ae7760已快进到本地main。已实现：各配置独立显示平台开播/下播/未知/待确认、检测时间与监控开关；当前活动房间的消息数据流仅使用当前capture既有RAW已提交记录和30秒新鲜度，不以连接或全局计数冒充。新增captureEvidence只读DTO，不改变监控确认、人工切源、场次或采集规则。

实时弹幕接入RoomStats人数文案/版本/隐藏、RoomUserSeq部分榜单（不作全在线名单）、有序真实徽章/九宫格名称、房间/粉丝团富文本模板和type8入场DOM提示。接收时间可见；异常超远未来occurredAt只在显示层回退，不改原生事件。所有视图复用原本机认证详情，原始Parser/RAW/EventStore/SessionManager不变。详细边界见[本轮核查](../reviews/2026-10-17-room-chat-application.md)。

验证：针对性41/41通过；新GUI7条合成RAW、6条事件、解析失败0，实际操作状态、榜单、隐身、分类、入场、JSON/RAW详情、导航保留和480/700/1440截图。不同房间/采集/Replay隔离另有纯投影测试，不将丢弃的跨房合成事件算作新真实采集。既有消息GUI1171 RAW/1171事件和活动GUI通过。真实历史只读34条GUI：type8为3条、带徽章16条、人数/榜单各6条，无页面错误；使用已有本机图片缓存，未缓存资源阻断，没有发出外部页面资源请求。另73条既有真实事件转换0失败。公开扫描270文件0发现，diff检查通过；所有正文、图像、截图和测试库仍在忽略目录。

本机运行：18783本轮检查未监听，未启动/重启/停止正式服务。保存配置中两项自动监控/监听仍保留；用户对代理及其他服务影响有顾虑后，仅启动随机本机端口的隔离历史预览。预览加载0ae7760、PID27884、127.0.0.1:55976；数据是34条真实历史片段，没有观看账号/profile/自动监控，采集STOPPED。私有artifacts/chat-room-history/preview.json记录实例与路径。预览图片默认关闭；GUI验证使用私有图片缓存的结果，不意味着浏览器预览已缓存全部外部资源。正式账号、正式数据与系统网络设置未修改。

未完成：普通观众HTTP成功榜单及快照持久化、完整图片目录、徽章DSL条件、type9/NotifyEffect动画、聚合入场、与官方逐条同步视觉对齐、新版真实在线验收；P0六小时也未因此完成。根目录原有STATUS第37—39节、SOURCE_MIGRATION及三份调查报告保持用户未提交状态，本提交只含本节增量，不代为提交其他变更。

交付补记：代码0ae7760、进度1d5cf22已同步本地main/worktree。git push origin main实际失败：github.com:443连接约21秒超时；origin/main仍c827995，待网络恢复再推送，不改代理或反复重试。预览通过认证状态接口再次核实PID27884/加载0ae7760、STOPPED、profiles/accounts/monitor均0。根目录原有调查改动36行STATUS/6行迁移及三份报告仍未提交。

## 41. 聊天展示向官方样式靠齐（2026-10-17）

owner本会话→用户，代码f684189已快进本地main。用户指出“原版不还原”后，将范围收敛到真实聊天呈现：深色聊天区、徽章/昵称/正文同行，消息礼物图/数量，入场去除重复昵称，默认聊天互动筛选；全部技术记录、分析列表、JSON/Proto/RAW仍可达。行高按DOM测量，保留500条虚拟缓存、分页与Replay；观众快照在聊天顶部，窄窗口导航让出宽度，首页初次选择活动配置且不覆盖编辑草稿。没有修改任何后端模块或API。

原ChatRoom与共享暗色CSS在隔离参照页直接加载，重建合成DOM；14px字号、20px行高、6px上下间距、青色昵称四项测量一致，徽章18px/九宫格slice保持。不是整套原插件或像素级还原。来源哈希、限制和截图路径见[交付核查](../reviews/2026-10-17-chat-presentation.md)。

验证：chat-room GUI 7合成RAW/6事件/0解析失败，聊天/分析、入场、图片、JSON/RAW、XSS、480/700/1440操作和原CSS对照通过；messages GUI 1172合成RAW/事件通过，含长文换行、500条缓存、历史补查及Replay；usability GUI 364/480/1440无横向溢出、草稿保留、无采集命令通过。真实历史34条只读GUI无页面错误；缓存缺失造成的测试拦截不算平台图片失败。当前页面另实测28张真实图已加载、缺图占位0，并点击消息详情保存本机截图。公开检查272文件0发现、diff检查通过。

运行交接修正：55976现已由用户配置真实观看账号/房间并开启采集，不能继续当空预览或清理该数据目录。本会话只刷新静态页面，PID27884/加载0ae7760未变，结束核对CONNECTED，输入4119→4142；事件2026未增长，不据此声称当前有新增业务消息。未启停18783、关闭采集浏览器或修改系统网络。高级入场、完整徽章DSL/表情目录、复杂活动交互、HTTP全量观众及长期稳定性仍待完成。用户原STATUS36行、迁移6行及三份调查文档继续保留未提交，本提交只含本节。

交付补记：功能f684189、记录7094fa9已成功推送GitHub main（远端确认c827995..7094fa9），此前GitHub 443待推送问题已解除。主目录用户未提交调查仍保留，运行进程未因提交改变。


## 42. 2026-10-17 房间场次隔离与可信下播归档

owner本会话→用户；基线1e46a44，用户同意后实施，优先官方逻辑。A提交848aa90，B中的补充竞态保护5026c96；两批均已快进本地main。只读参考LiveMngSys cd5d83bb1fa7287c766f78b440fea3c6ec373c9b的目录缓存、停止与视图清理思路，未移植其按时间分场或把全部非LIVE当下播的策略。SessionManager仍唯一权威，官方Parser/RAW事实及WSS连接实现未重写。

已实现：查询roomId/sessionId及namespace绑定签名游标/历史锚点；实时默认当前监听场次，切房/换场清列表、舞台、详情和游标并拒绝迟到响应，服务端再核验current域。下播后当前清空，历史明确选择（场次下拉最近200项，通用记录仍可完整查询）。同场重连保留身份，结束后同roomId须新的官方确认LIVE转换才分代，普通消息不复活旧场，新代去重不跨旧场。

关联当前sourceEpoch的官方Control.action=3或身份一致、连续确认且晚于当前连接的官方status=4触发停止；UNKNOWN/断网/无弹幕不判下播。活动Web保留低频HTTP检测，与空闲监控开关分开，旧autoStop=false不再让可信下播后继续收心跳。前一代缓存END不能停止新连接。结束事件持久化后索引归档COMPLETE，不搬RAW；启动仅为已有持久结束证据的旧场补归档。

验证：场次GUI真实Parser处理5条合成RAW/5事件，0解析失败，覆盖两房、迟到响应、RAW详情、结束停止/归档、历史及同roomId新代重复msgId、480/1440布局。停止断言等待SourceController STOPPED且Coordinator active为空，避免WebSource先停止的异步等待竞态。针对性和同场连续性通过；真实平台新下播/再开播未执行，不以合成通过代替。详情、命令与边界见docs/reviews/2026-10-17-session-emoji.md和docs/superpowers/plans/2026-10-17-session-emoji.md。

## 43. 2026-10-17 官方普通/会员表情与交付

B提交5026c96。普通表情接官方emoji/list精确display_name目录，hide仅控制输入面板，不删已接收显示；未知保留原文。会员优先原生emoji_content图片，修复真实lf数字-webcastcdn-tos.douyinstatic.com被旧资源白名单拒绝的问题。列表/Canvas/详情共用候选回退；图片默认显示且本机记住用户关闭选择，全部失败有原生文字/诊断。完整业务JSON/Proto/RAW不变，公共WS/日志/导出未增加可读内容，鉴权/同源/loopback不放宽。

本机私有目录已核对官方响应SHA准备214项、version1766572369433、观察2026-10-16T06:27:28.755Z。最多512项/每项3候选，24小时后仅真实活动Web的本机消息读取触发官方固定HTTP刷新，失败保留缓存、至少5分钟重试，Replay不刷新。没有提交源响应、原JS/CSS、图片、真实消息或凭据；会员活动组完整消费证据不足，未猜权益/补URL。

验证：表情/消息/资源针对性17/17、最终coordinator7/7；表情GUI2合成RAW、0解析失败，默认显示/关闭、普通映射、会员原图、第一候选失败第二成功、未知原文、JSON/Proto/RAW、Replay与480/1440通过。既有消息GUI1172 RAW/1172事件、0页面错误；舞台GUI通过。34条真实历史只读GUI实际3次官方图片请求、3张会员表情全部加载，已有私有缓存命中5次、其他未缓存图227次为测试主动阻断，0页面错误；不是新平台在线采集。私有截图artifacts/chat-room-history/real-history-chat.png、artifacts/emoji-official，报告原样保留。

全套最终并发2回归235项：234通过、1项部署fixture因Windows进程扫描PROCESS_SCAN_UNAVAILABLE失败，单独复跑1/1通过；不宣称单次全绿。前次并发4有accounts测试进程退出、原因未定位，单独6/6和最终全套该文件通过。最初缺少C#宿主，已在第一方worktree私有测试目录构建后验证，未更新正式二进制。公开检查282文件0发现，diff检查通过。六小时/24小时、完整原版动效、全量观众及活动组表情仍未验收。

运行只读核对：55976 PID27884仍加载0ae7760，CONNECTED/active=true，RAW4398、事件2026；该旧实例已记录场次于2026-10-16T19:08:33.677Z结束但未归档，不能当仍在播或可清理的空预览。此次没有启停它或18783、关闭浏览器、操作代理/DNS/CA/伴侣。新代码尚未由该进程加载；更新它需遵守用户禁止擅自启停的限制，等待明确安排。下一步安全加载新版后验证真实结束/归档及下一场，不扩大UI/插件范围。

交付：本地main=5026c96，git push origin main实际失败，github.com:443约21秒连接超时；远端未确认本轮提交，不改网络、不无限重试。本节记录另提交。根目录原有STATUS36行、SOURCE_MIGRATION6行及三份调查报告保持未提交，仅暂存本会话新增42—43节；既有运行数据及测试证据不清理。


## 44. 2026-10-17 用户授权安全更新55976（本机加载与GUI验证通过）

用户明确答复“允许安全更新55976”。本次只部署已提交版本，无产品源码修改。经Gateway停止当前原生WSS、确认SourceController STOPPED/Coordinator无active/RAW和解码pending为0；核对原PID27884准确预览启动命令、同一Windows用户、127.0.0.1:55976归属及data-QBxoNB租约，创建本机私有SQLite备份后，仅结束该已空闲进程。未重新运行历史预览工具，不重导数据；复用既有预检/启动验证，在同一端口、同一数据目录启动标准server.js后台进程。通用部署保护、系统代理、DNS、CA、伴侣与18783均未操作，采集浏览器未关闭，未新开浏览器。

实际版本：新PID17640，2026-10-17T00:04:11.303Z启动，加载7c2502c/指纹70e0d194f29076866206710c0ae8b887ba24a19cecd08c6ff2e67b1087664161；启动后验证health正常、loopback及SQLite租约均属于新PID。停止后与更新后4428 RAW/2060事件/1场次完全一致，DPAPI凭据、账号记录、房间配置哈希前后不变。已有ENDED场次补归档COMPLETE，当前场次查询为空，历史可查。原monitorEnabled=false/autoStart=false保留，当前STOPPED/active=null，不自动重连已结束场次。

用户已有页面刷新后，实际操作当前监听空视图、历史已下播/已归档、会员表情详情、官方JSON、Proto字段定位及RAW处理链。当前渲染快照47张图已加载，普通[戳手手]与会员原生图均naturalWidth>0；对应会员图片字段为Image #1 repeated string。页面保留历史供用户查看，不将其称为当前直播内容。停止请求到启动后验证完成46.317秒，是维护窗口而非精确服务断网时长；未知消息缺口明确保留，不宣称零丢包。

私有证据在worktree的.local/deployment/update-55976-20261017，含before/stopped/verified/gui/deployment/interruption统计、SQLite备份和history-emoji.png；不上传账号、业务正文、截图或原版图片。详细说明追加docs/reviews/2026-10-17-session-emoji.md。真实新扫码、在线换房、下播/再开播与长期稳定性仍未执行；本次只证明已加载新版和既有真实历史GUI可用。根目录原有36行STATUS、6行SOURCE_MIGRATION及三份调查继续保留未提交，本提交只含本节和部署核查增量。


## 45. 2026-10-17 消息容器内交互与3秒点赞（展示验证通过）

owner本会话→用户，基线7447a39；按用户四项具体要求实施，无派工。在主工作区先验证，未提前改55976所在worktree静态文件；完成后仅快进同步文件，不启停服务。只改public前端、展示测试/GUI工具、MessageView说明及本节；官方Parser、RAW、EventStore、SourceController、SessionManager、账号和API均不变。原STATUS36行、SOURCE_MIGRATION6行和三份调查报告继续保留未提交。

已完成：舞台不再实例化Canvas或接收chat，移到同一消息容器内、滚动聊天上方。入场/礼物/活动等DOM卡纵向正常布局，最多12条并发，等待队列100，240px区域内可滚动查看；更新、移除、连击数量和域隔离保留。type8背景由旧100% 100%非等比拉伸改为官方静态CSS的center/cover、24px圆角、2px 8px内边距与600字重；模板昵称独立限90px，后缀文案保留。来源796494及island_af08d.322fa203.css只读，原资源不上传，非完整原版动画还原。

点赞独立在容器底部，默认一行、不同用户向上增行；同域同ID更新本条原生数量与最后触发后的3秒期限，不相加、旧序号不续期，未知/0 ID不按同名合并。最多32行、有界160px区域；暂停或隐藏交互卡仍到期。点赞不进入舞台队列、聊天滚动列表及其500条缓存；完整事件继续保存，数据记录与3秒提示点击详情均可达。房间/场次/Replay切换清临时状态。

验证：新增4项队列/点赞单元用例先失败后实现，针对性35/35通过；GUI追加点赞缓存断言先复现16中含3条点赞，再修复为13条滚动缓存。最终inline-stage GUI17合成RAW/17事件、0解析失败/页面错误，实际操作6入场+3礼物+3活动并发、单行及按用户向上点赞、3秒到期（含暂停/隐藏）、JSON/RAW详情、364/480/700/1440布局/点击。既有礼物舞台GUI及1172 RAW/1172事件消息GUI通过，保留历史分页/Replay/XSS。私有artifacts/inline-stage含截图与报告。

真实历史只读GUI34条，3条type8、3张会员表情实际加载，入场背景加载成功；8次精确已校验官方表情/入场图片请求，私有缓存命中4次，163次其他未缓存图为测试主动拦截，0页面错误。新布局下懒加载图片需滚到消息区才检查，未改变产品lazy策略；较新历史首次检查图片等待超时保留为失败，最终固定旧证据集通过，不冒充在线采集。真实三条入场截图artifacts/chat-room-history/real-history-interactions.png；原DB只读、不复制账号或RAW。公开检查288文件0发现，diff检查通过；完整边界见docs/reviews/2026-10-17-inline-stage.md。

运行事实：本轮只读核实55976与18783均未监听，旧PID17640不存在；私有目录最后诊断2026-10-17T03:16:02.034Z（北京时间11:16:02）仍CONNECTED、解析/诊断写入失败0，尾部没有退出记录、stderr为空。原因未定位，不能推断崩溃、人工停止、OS或内存问题；本轮没有重启/恢复服务、关闭浏览器或操作系统网络。新版仅同步本地文件，运行服务热加载、真实新平台并发/下播与长期稳定性未验收。

交付补记：功能提交6a59933已同步本地main与既有worktree，用户原有调查改动仍为未提交。git push origin main实际失败：github.com:443约21秒连接超时；本轮远端未交付，不修改网络、不无限重试。此记录仅补充文档，不代表有运行服务加载新版。


## 46. 2026-10-17 双击启动乱码与文档检查修复（隔离验证通过）

owner本会话→用户，基线38170e3。用户提供Start报错后只读核对：原BAT已是UTF-8无BOM/CRLF，但在真实CMD隔离入口复现中文提示尾部被当作命令；原测试遗漏额外错误。当前未提交的是STATUS36行、SOURCE_MIGRATION6行及三份调查Markdown，原部署将其一并拦截。没有提交、覆盖或清理这些用户文档，也不修改系统代理、DNS、证书、伴侣、浏览器或正式数据。

修复：BAT保留ASCII调用，中文菜单与提示迁至带BOM的PowerShell，Start/Stop/Update、退出码及窗口结果保留。共享workspaceState检查暂存/工作树/未跟踪文件，只允许README.md和docs/下Markdown保留未提交；代码、配置、未知路径及构建期间修改继续阻止部署。实例dirty仍保留全部改动事实，新增runtimeDirty区分纯文档，旧版dirty=true且无该字段仍拒绝自动处置。采集空闲、登录窗口、PID/Windows用户/端口/SQLite租约与版本复查不放宽。无Parser/RAW/EventStore/SessionManager或采集业务变更。文件与原因见[本轮核查](../reviews/2026-10-17-startup-guards.md)。

验证：加强BAT断言先复现用户原错误，修复后六条入口、成功/失败共十二种调用通过，中文和空格目录另复查通过。最终node --test --test-concurrency=1 tests/workspace-state.test.js tests/deploy-workbench.test.js tests/instance.test.js为32/32、退出0，约194秒；涵盖文档保留/启动/停止、已改及未跟踪代码拒绝、构建期间变化、忙碌采集/登录/归属/端口/数据租约拒绝、加载版本与独立CaptureHost smoke。只用测试目录与合成服务，不能当真实WSS或长期稳定性验收。私有.local/startup-fix-20261017/regression.log保留；公开扫描292文件0发现、diff检查通过。原五项用户文档在追加本节前SHA核对不变，STATUS仅新增本节并独立暂存。

运行交接：18783和55976均未监听，本轮未启动、重启或停止正式服务。根双击入口默认18783/data/pipeline-20261013；最近55976使用另一worktree中的既有data-QBxoNB，不能静默合并或改用另一套凭据。已询问用户要恢复哪套数据，选择前仅修复入口。真实账号/SQLite/RAW/历史原目录均保留；本机脚本验证不代表服务已加载本轮提交。后续按用户选择核对同一数据目录并受保护启动，不扩大UI或采集架构。

交付补记：修复13f041f已快进同步本地main和既有worktree；主工作区实际Get-LwWorkspaceTarget在保留五项文档改动时通过，dirty=true/runtimeDirty=false。git push origin main实际失败：github.com:443约21秒无法连接，不修改网络、不反复重试；本轮未获远端交付确认。最终两端口仍未监听，用户原有36行STATUS/6行迁移及三份调查继续保留。


## 47. 2026-10-17 日常实例统一18783（约定已记录，启动待配置选择）

用户明确表示当前及以后只需18783。只读核对本地主工作区和原55976 worktree均为3e99ce8；七项已准备的WSS签名/直连/浏览器适配、表情目录和卡片图资源SHA一致，没有两套产品功能的必要。差异为数据及本机配置：18783有R01离线定位，55976无；18783两个房间启用自动监控/自动开始，其中一项允许可见浏览器兜底，55976监控均关闭。两边各有一个账号条目和一个持久凭据文件，只检查存在性，不解密或宣称同一账号/认证有效。

日常约定已加入README首部：主工作区、18783、既有data/pipeline-20261013为唯一日常入口；启动/停止/更新脚本原已使用此配置。55976退出日常使用、旧数据原地保留，不自动合并或删除；测试继续用隔离临时端口。README基础启动命令同步改为受保护Start，历史18780/18782标注为早期记录。没有修改业务源码、自动监听规则、账号、房间配置、数据库或RAW。

实际预检：18783/55976均未监听；以既有保护核验18783无活动进程/端口/数据租约冲突，独立构建CaptureHost并完成stdio smoke（不绑定代理）、Node/官方Parser及隔离SQLite初始化，当前HEAD复查通过。私有.local/primary-18783-20261017保存脱敏比较、构建日志和preflight.json；serviceStarted=false。公开检查292文件0发现、diff检查通过；本轮仅文档调整，不把上轮32项回归重复计作新验证，也不作为真实WSS或账号有效性验收。

启动边界：已告知旧配置可能在服务启动后自动采集并打开可见兜底，提出“改手动/无头后启动、保留旧配置启动、暂不启动”三项选择。等待明确选择前不更改配置或启动正式服务，不能把用户选定日常端口解释成同意这些尚未告知的旧行为。不会重新启动55976、修改系统代理/DNS/证书/伴侣或关闭浏览器；原用户STATUS36行、迁移6行与三份调查保持未提交。
