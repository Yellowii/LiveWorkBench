# 全局进度与任务交接

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
