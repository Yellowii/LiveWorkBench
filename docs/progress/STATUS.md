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
