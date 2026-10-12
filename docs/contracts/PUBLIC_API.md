# 公共 REST / WebSocket 契约

版本：0.1 目标契约；2026-10-12。首增量已有部分接口，完整规范仍未全部落地。API Gateway 是逻辑边界，可以与核心同进程。内部数据见 [CORE_CONTRACTS](CORE_CONTRACTS.md)，实现状态见 [STATUS](../progress/STATUS.md)。

## 当前可运行子集

Node 同源 Gateway 默认 127.0.0.1:18780，首页设置 HttpOnly/SameSite Strict 会话；REST/WS 均认证，控制命令要求 commandId。匿名控制拒绝，LAN 未启用。当前有 system/status、health、capabilities、hook/status、events/详情、recordings、sessions、logs、operations、replays 与基础模块/进程指标。system/history 指标返回 unavailable。

开发入口 `POST /api/v1/development/r01-runs` 输入 `{commandId,goldenOnly}`，返回 operation；原目录仅由本地私有设置登记，不接受前端任意文件路径。`POST /api/v1/replays` 输入 recordingId；`POST /replays/{id}/actions` 支持 play/pause/step/stop/seek/rebuild、expectedVersion/speed/target。`GET /sources` 返回选中来源/sourceEpoch/stateVersion。`POST /capture/actions` 支持 start/stop/switch；switch携带sourceType及expectedVersion，停止旧来源后仅选择新来源，需要再次人工start；默认禁止自动故障切换。LiveHook start 缺证书返回 TLS_CERTIFICATE_REQUIRED，Web start 缺配置/准备模块返回明确不可用原因。

system/status 与 hook/status 包含只读 daemon 状态，WS 增量为 daemon.updated；字段有 available/state/reason/restartRequired/companionRunning/processInstances/lastObservedAt/stateVersion。proxyBound、进程顺序与 HookReady 分开；进程观察不产生开闭播事件，不提供终止或自动重启伴侣命令。

事件分页为降序快照游标，绑定 mode/namespace/method，最大 500。WS 输出 events/log/session/operation/replay/capture 增量，超队列关闭要求补查持久化历史；完整订阅过滤、断线高水位续传、持久命令幂等、日志导出、RAW 元数据详情和正式 RBAC 尚未实现。命令缓存仅当前进程，不跨重启；上述目标章节不能当作已实现保证。

## 1. 访问、版本与权限

- REST 使用 `/api/v1`；WebSocket 使用 `/api/v1/ws`。接口 schemaVersion 为 `1`，与协议 Parser 版本不同。
- 默认绑定 loopback。其他电脑/手机/平板访问须用户明确启用受认证 LAN 入口；不能直接放开代理、BarrageGrab 原版下游 WS 或数据库。
- 权限逻辑名：`system.read`、`capture.read/control`、`sessions.read/control`、`events.read`、`recordings.read`、`replay.control`、`logs.read/export`、`metrics.read`、`integration.control`、`admin`。认证方案与部署技术待决策，不能把这些逻辑名当成已实现角色系统。
- Gateway 从可信认证上下文确定 actor 与权限；前端传入的 actor/mode 不产生权限。WS 订阅前也完成认证，禁止将长期秘钥放 URL。
- Cookie/Token/第三方软件凭据不出现在 DTO、日志、错误或性能接口。RAW 只暴露不透明 ID 和元数据，不提供物理文件路径/内部代理地址。
- REST 输入尺寸、分页大小、WS 订阅数与消息队列有上限；具体部署限值通过 capabilities 返回，不写死于前端。日志导出和长操作有超时/取消边界。
- 兼容新增可选字段维持 v1；破坏性类型或语义变更需版本/兼容方案，经公共契约负责人审核。客户端不能依赖未列入契约的内部字段。

## 2. 请求、结果与错误

同步查询示例（值为结构示意，不代表运行状态）：

```json
{"schemaVersion":"1","requestId":"req-id","data":{},"serverTime":"2026-10-12T00:00:00Z"}
```

错误结构：

```json
{
  "schemaVersion":"1",
  "requestId":"req-id",
  "error":{
    "code":"STATE_CONFLICT",
    "message":"状态已变化，请刷新后重试",
    "retryable":false,
    "details":{"resourceType":"capture","currentVersion":"12"}
  }
}
```

details 为白名单 DTO，不返回堆栈、Cookie、请求原文、秘钥或本地私有路径。用户可通过 requestId/operationId 找到权限范围内的脱敏日志。

| HTTP | code 示例 | 使用条件 |
|---|---|---|
| 400 | INVALID_ARGUMENT / CURSOR_MISMATCH | 参数无效、游标与过滤不匹配 |
| 401 / 403 | UNAUTHENTICATED / FORBIDDEN | 身份缺失或权限不足 |
| 404 | RESOURCE_NOT_FOUND | 不可见/不存在的资源 |
| 409 | STATE_CONFLICT / SOURCE_BUSY / COMMAND_CONFLICT | 版本冲突、并发操作、同 commandId 不同内容 |
| 410 | CURSOR_EXPIRED / HISTORY_GAP | 查询窗口或续传范围已被保留策略移除 |
| 413 / 429 | PAYLOAD_TOO_LARGE / RATE_LIMITED | 上限或节流 |
| 501 | CAPABILITY_UNAVAILABLE | 能力未实现/平台不支持，并提供 reason |
| 503 | RAW_PERSIST_FAILED / DEPENDENCY_UNAVAILABLE | 存储/依赖失败，明确 retryable |
| 500 | INTERNAL_ERROR | 脱敏错误及关联 ID |

控制命令携带稳定 `commandId` 与 `expectedVersion`。相同命令 ID/相同内容重试返回同一结果，不重复操作；不同内容使用同 ID 返回冲突。幂等保留期经 capabilities 明确，不承诺永远保存。

长操作 `202 Accepted` 返回 `{operationId,status}`，由查询或 `operation.updated` 观察；不把“已受理”当“操作成功”。operation DTO：operationId、kind、status、createdAt、updatedAt、result?、脱敏 error?、progress?。无法可靠估算进度时 progress=null，而不是虚构百分比。

## 3. REST 路由

下表所有路由均待实施；没有因为文档列出就启用网络监听。

| 方法与完整路径 | 输入 | 输出要点 | 权限 |
|---|---|---|---|
| GET `/api/v1/system/status` | 无 | backendReady、selectedSource、hookReady、restartRequired、captureState、当前 sessionId/anchorUid/roomId、状态版本、原因 | system.read |
| GET `/api/v1/health` | 无 | 总体及各依赖 health、checkedAt；不暴露配置 | system.read |
| GET `/api/v1/capabilities` | 无 | API/schema 版本、各 feature 的 implemented/enabled/available/reason、限制、支持模块和指标 | system.read |
| GET `/api/v1/sources` | 无 | 允许来源、当前选择、状态版本 | capture.read |
| GET `/api/v1/hook/status` | 无 | HookStatus 外部 DTO；就绪前置条件与 restartRequired | capture.read |
| POST `/api/v1/capture/actions` | commandId、expectedVersion、action=start/stop/switch、sourceType?、targetAnchor? | operationId；人工单源控制 | capture.control |
| GET `/api/v1/operations/{operationId}` | 路径 ID | 当前任务状态、结果与错误 | 继承任务对应权限 |
| GET `/api/v1/sessions` | anchorUid?、state?、cursor?、limit? | 场次摘要稳定页 | sessions.read |
| GET `/api/v1/sessions/{sessionId}` | 路径 ID | SessionDTO，状态轴、证据摘要、归档状态 | sessions.read |
| POST `/api/v1/sessions/{sessionId}/actions` | commandId、expectedVersion、action=confirm/reconcile/archive、reason、指定候选? | 受控核对/归档结果；策略未收敛时能力不可用 | sessions.control |
| GET `/api/v1/events` | streamId 或 sessionId、type?、userId?、时间过滤?、cursor?、limit?、snapshot? | 事件 DTO、稳定分页信息 | events.read |
| GET `/api/v1/recordings` | anchorUid?/sessionId?/captureId?、cursor?、limit? | RAW 录制元数据页 | recordings.read |
| GET `/api/v1/recordings/{recordingId}` | 路径 ID | 覆盖时段、计数、字节数、缺口、完整性、版本与上下文状态；无文件路径/认证原文 | recordings.read |
| POST `/api/v1/replays` | commandId、recordingIds、指定 Parser/patch/rule 版本、恢复模式 | replayId、operationId、独立 namespace | replay.control |
| GET `/api/v1/replays/{replayId}` | 路径 ID | ReplayDTO、位置、状态、重建进度、版本、数据缺口 | replay.control |
| POST `/api/v1/replays/{replayId}/actions` | commandId、expectedVersion、action=play/pause/step/seek/rebuild/stop、target?/speed? | operationId 与隔离状态 | replay.control |
| GET `/api/v1/logs` | 模块/级别/时间/correlationId/operationId、cursor?、limit? | 脱敏工作日志页 | logs.read |
| POST `/api/v1/logs/exports` | commandId、过滤、格式 | operationId，随后给受权限/期限限制的导出句柄 | logs.export |
| GET `/api/v1/logs/exports/{exportId}` | 路径 ID | 导出状态或授权下载；无公开永久链接 | logs.export |
| GET `/api/v1/diagnostics` | module?、operationId? | 脱敏错误、队列、覆盖缺口、相关 ID | system.read；敏感范围需 admin |
| GET `/api/v1/metrics/system` | 无 | 整机指标与 availability | metrics.read |
| GET `/api/v1/metrics/processes` | 项目 processId? | 项目进程指标，不默认枚举全机进程命令行 | metrics.read |
| GET `/api/v1/metrics/modules` | module? | 内部耗时/吞吐/队列/失败率 | metrics.read |
| GET `/api/v1/metrics/history` | scope/name、from/to、cursor?、limit?、resolution? | 已支持的历史样本；未实现返回 unavailable | metrics.read |

RAW 字节获取/下载不是 P0 公共 API 必需项；若后续增加，单独审核原始内容权限和敏感信息处理，不能把现有 recording 元数据路由变成任意文件读取器。

ExternalIntegration 的 action、OBS/Stream Dock 和通知路由当前仅预留逻辑端口，不伪造已完成公共控制 API；capabilities 对未实施能力返回 implemented=false。

## 4. 对外 DTO 与枚举

| DTO | 基本字段 | 不暴露内容 |
|---|---|---|
| SystemDTO | sourceType、HookReady、采集/场次状态、版本、最后数据时间、operationId? | 内部实例、代理凭据 |
| SessionDTO | sessionId、anchorUid、roomId、stateVersion、各状态轴、起止时间/未知原因、证据摘要 | Cookie/Token、原始 HTTP 全体 |
| EventDTO | eventId、eventSeq、streamId、sessionId?、type、用户可见 payload、发生/接收时间、sourceType、可追踪 rawId | 物理 rawRef/文件路径、非白名单认证字段 |
| RecordingDTO | recordingId、captureId、来源、覆盖时间、bytes/计数、上下文、gapCount、完整性/版本 | 物理路径、请求 Headers |
| ReplayDTO | replayId、namespace、stateVersion、status、position、speed、恢复模式、版本/缺口 | 正式仓库 handle、真实执行端 |
| LogDTO | logId/seq、时间、模块、级别、代码、脱敏文案、关联 ID | 完整弹幕/敏感异常原文 |
| MetricDTO | sampledAt、scope、name、value/null、unit、availability、reason、provider | 凭据或虚构精确归因 |

SessionDTO 状态值沿用内部契约，缺省字段说明未知。创建房间与实际推流分别展示；前端不能把 roomState=CREATED 或伴侣进程存在自行渲染成“正在推流”。

Replay control：step 以一条持久化输入记录为默认单位，需返回明确的 inputSequence/事件边界；若一个输入产生多条事件，全部归同一步。seek/rebuild 在独立域恢复状态后返回新 position，不将 live 时间倒退。速度上下限待 capabilities 明确。

## 5. 历史分页与无限回滚

列表通用输出：

```text
Page {items[], nextCursor?, hasMore, snapshot, order, earliestAvailable?}
EventSnapshot {streamId, upperBoundSeq, filterFingerprint, issuedAt}
```

- 普通事件历史来自 EventStore，不执行 RAW 解析。按已持久化 eventSeq 排序，接收时间/平台时间只作可选筛选和展示。
- 首次查询返回上界 snapshot。之后向上翻旧弹幕沿用同一 snapshot/filter，不受新追加消息改变页边界。
- 游标为服务端不透明令牌，绑定资源域、排序方向、上界、边界事件、过滤指纹、版本/有效期；不能把 SQL 或本地路径交给前端。
- 重复请求同游标得到一致范围；边界使用严格大于/小于。相同时间戳不靠时间值去重；eventId 做最终合并键。
- 上限建议按部署配置提供，前端不能一次请求全部历史。缓存淘汰不删除服务端事件，后续按需重新加载。
- 保留策略移除旧数据或游标过期，明确 HISTORY_GAP/CURSOR_EXPIRED 与 earliestAvailable；不返回空页冒充“从来没有”。
- 用户查看旧消息时维持可见 eventId 与像素锚点，新消息持续合并/保存并显示计数；一键最新才恢复跟随。虚拟列表只渲染可见区域，不能让消息增长导致 DOM/内存无限增长。

## 6. WebSocket 订阅、顺序与续传

认证通过后客户端提交：

```text
subscribe {
  subscriptionId, channels[], streamId?, filters?,
  resumeAfterSeq?, snapshot?, requestedRate?
}
```

服务器信封：

```text
WsMessage {
  schemaVersion, subscriptionId, channel, messageId,
  streamId?, streamSeq?, serverTime, correlationId?, data
}
```

| channel | 内容 | 恢复语义 |
|---|---|---|
| subscription.ready | 已接受过滤、快照上界/续传起点、实际节流 | 明确增量边界 |
| events.appended | 去重后已持久化 EventDTO | EventStore 顺序续传，eventId 合并 |
| capture.updated / hook.updated | 当前采集/Hook 状态版本 | 重连给当前快照 |
| session.updated | 场次版本及证据摘要 | 当前快照；生命周期事件在事件库可查 |
| replay.updated / operation.updated | 任务/回放版本状态 | 重连查询对应 resource |
| log.appended | 脱敏日志/日志序号 | 支持范围内经日志库补查 |
| metrics.updated | 指标采样与 availability | 允许合并最新采样；历史支持以 capabilities 为准 |
| resync.required | 原因、earliestAvailable、推荐查询域 | 明确缺口并分页补查 |

各 channel 的 streamSeq 属于其自身持久化流，不能拿事件序号续传日志/指标。状态流可以只保留最新版本；不可因此假定已完整接收全部生命周期事件。

初始历史与 WS 的竞态按一个受控上界处理：订阅建立时取得上界 H 并开始缓冲 H 后的增量 → 客户端加载不超过 H 的初始页 → 按 eventId 合并缓存与 >H 增量。具体批量握手顺序可调整，但必须证明 H 附近无遗漏/重复。

断线后从客户端已确认的序号续传，服务端在保留范围内补发；消费者幂等。若积压越过队列/保留上限，发 resync.required 并补查数据库，不静默丢包后显示完整。高频日志/指标限速/合并不能应用于需要完整持久化的事件数据。

WS 心跳维护由 Gateway 负责，与采集 WSS 心跳是不同连接。心跳超时只更新客户端连接状态，不能结束直播场次。前端刷新重订阅不重开采集。

## 7. P0 工作日志

LogService 持久化系统、采集、RAW、Parser、Dedup、EventBus/EventStore、SessionManager、存储、Replay、API 及模块异常。字段见内部契约；支持模块/级别/时间/关联过滤、实时查看、导出和错误追踪。

严重故障必须有一条明确工作日志与影响范围，高频成功路径用计数/采样摘要。完整消息由 RAW/事件库保存，不把各处理阶段的整个包都重复输出。脱敏在持久化日志之前执行，并在导出/DTO 层再次做白名单检查。

日志保留、滚动和导出大小有上限，容量紧张时报告缺口与告警。应用模块日志和请求日志用统一关联 ID，未经权限校验的请求内容不直接进入详细日志。

## 8. 性能监控分阶段

| 范围 | P0 基础 | 后续完整 | 表达约束 |
|---|---|---|---|
| system | 可支持的整机 CPU/内存、存储可用容量 | GPU、显存、详细磁盘/网络等 | 实测 provider、单位、时间、availability |
| processes | 本项目及受控辅助进程 CPU/内存、存活 | 更完整资源/设备采样 | 不输出任意进程命令行或敏感环境 |
| modules | 接收/落盘/解析/去重吞吐、耗时分布、队列长度、失败计数/率 | 更完整 tracing 与历史对比 | 内部应用统计，不冒充 OS 模块占用 |
| history | 能力契约、可选有限基础样本 | 长期保留、分辨率/聚合查询 | 未实现明确返回 unavailable |

CPU 指标需注明整机占比/进程相对整机等口径；内存/显存/磁盘用 bytes，时延 ms，吞吐 records/s 或 bytes/s，计数与率分别定义，不能混算。缺失采样返回 null 而不是 0；进程已退出与暂不可采样分别留 reason。

共享宿主模块 CPU/GPU 没有精确测量证据时不提供伪造占比；用队列、吞吐、耗时和错误率定位。metrics.updated 有实际采样周期与节流信息，不给未实现 GPU 指标生成“正常”值。

## 9. 契约验收（尚未执行）

实施后验证：未认证远程请求拒绝；默认无 LAN 监听；控制幂等/冲突返回正确；DTO/错误/日志无凭据和私有 RAW 路径；RAW 失败不继续解析；并发新增/相同时间戳/重连时分页无遗漏；上翻不跳底部；缓存淘汰可再加载；队列溢出明确补查；Replay 各动作无真实出口；不支持指标返回 unavailable；开发 GUI 能操作核心功能。

版本发布前给出真实持久化样本、输入边界、API/WS 输出与回归证据；本次只创建契约，不宣称网络服务或这些验收已存在。

## 10. 简易验证工作台的分批落地

2026-10-12 用户要求边开发边测试。首版范围以核心文档 B26 为准；前端从第一版就经 Gateway 使用真实后端能力，不直读样本、数据库或运行任意脚本。没有要求一次实现全部公共路由，也不新增另一套临时接口绕过本契约。

首批优先落地 status/capabilities、后端已登记的输入元数据、异步 operation、可查消息和日志、replay 控制；随后补游标历史、WS 增量、单步/跳转和重建。未支持动作返回明确能力状态并在 UI 禁用，不用假成功或固定进度替代后端执行。

R01 是历史业务载荷，不是完整传输录制。实现前需给历史输入描述提出明确 DTO（例如输入格式、来源缺失、原序号、旧/新 IDs 的证据来源、原数据只读），与 RecordingDTO 的实时录制语义区分；契约负责人审查后再加字段/注册端口。前端只提交后端登记 ID，不提供任意文件读取路径。既有控制端口不因样本登记直接触发实时捕获。

Golden/全量检查面板通过后端 operation 显示实际验证结果；实现前明确其任务 kind、报告 DTO 和失败定位契约。通用 operation 状态与日志查询保持复用，后端不得声称尚未执行的 59/59。历史分页只读已持久化派生事件，不能每翻页重新跑 14,588 条解析。

首版仅本机，不提前开放 LAN 或接入真实通知/OBS/Stream Dock。后端允许的日志/指标/任务执行边界与认证约束保持有效。

### 本机公开投影（2026-10-12 实现）

REST/WS 默认返回 redacted 投影，system/status.privacy 记录 mode/projectionVersion。房间/用户/消息标识为数据域内稳定HMAC别名，原生字符串/字节字段只披露必要数值/结构；事件自身不透明ID和RAW引用保留。原生 Parser 输出和RAW仍保存在本地，官方结果投影不能作为原生结果哈希。受控本地诊断可在私有 settings 中显式设置 allowPrivateDetails=true；此模式仍不返回凭据和物理路径。该设置不经API开放，不代表LAN认证/RBAC已经实现。

### 当前历史/追踪子集（2026-10-12）

GET /events增加 afterSeq 十进制字符串（仅seq>afterSeq）；limit默认50/最多200。快照/页边界字符串精确支持SQLite有符号64位序号。nextCursor现为HMAC签名、24小时有效、绑定kind/过滤/afterSeq/快照，篡改或条件不匹配CURSOR_MISMATCH，过期CURSOR_EXPIRED/410；旧无签名游标必须重新查询。WS subscription.ready.data.latestEventSeq提供已持久化高水位，断线缺口通过正式查询补查。

事件列表是摘要，GET /events/{id}提供单条脱敏结果；GET /recordings/{recordingId}/raw/{rawId}新增RAW元数据查询，校验所属关系，只返回大小/hash/来源/时刻/边界/不透明引用等投影，不提供原始字节或路径。GUI向上续页、可见行渲染和500条缓存；跟随重连补查最新500条，历史阅读不被强制回底。
