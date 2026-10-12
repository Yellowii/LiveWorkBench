# 内部数据与模块契约

版本：0.1 目标契约；2026-10-12。首个工程增量已实现其中 RAW ACK、官方解析、隔离事件/场次与回放子集；其余不能推定可用。架构责任见 [核心文档](../architecture/CORE_DEVELOPMENT.md)，外部 DTO 与路由见 [PUBLIC_API](PUBLIC_API.md)，实际范围见 [STATUS 第11节](../progress/STATUS.md#11-首个可运行工程增量2026-10-12)。

当前实现边界：C# → 标准输入输出 JSON IPC；RAW 文件 write/fsync 后 SQLite FULL 提交，再 ACK；SQLite 事件唯一键覆盖 namespace/anchor/room/method/msgId，无 ID 不强制去重。历史 R01 仅登记只读文件引用，durability 为 existing-read-only-input，不称新捕获。官方输出原样保存，扩展独立；超出日期范围的原始 create_time 保留，occurredAt 为 null。Replay/测试与 live 使用不同 namespace、去重键及场次键；首版未接任何真实业务/通知/设备出口。物理存储共用一个 SQLite，查询与幂等隔离；独立业务总线/执行端仍待接入时验证。

## 1. 通用约定

- 语言中立；跨语言/JSON 的平台编号和 64 位顺序均为十进制字符串。
- 时间为 UTC ISO-8601，前端按用户时区展示；发生、接收、落盘时间分别保存。耗时使用单调时钟。
- 每个运行域有 `runtimeNamespace` 与 `mode: live | replay | test`；正式和回放数据、幂等及出口隔离。
- 未知用 `null` 与 `availability/reason` 表示，不用 0、false 或空字符串冒充确定值。
- 输入尺寸、队列容量、超时、保留策略均有显式上限，参数待选择技术栈与基线后冻结。

## 2. CaptureInput 与 RAW Recorder

```text
CaptureInput {
  schemaVersion, rawId, captureId, sourceType, sourceEpoch,
  processInstanceId?, sourceConnectionId?, runtimeNamespace, mode,
  receivedAt, captureSeq, transport, direction, byteBoundary,
  bytes, observedContext, metadata
}
RawCommit {
  rawId, recordingId, rawRef, contentHash, persistedAt,
  durabilityLevel, captureSeq
}
```

`sourceType` 为 LiveHookSource/WebSource；ReplaySource 读取既有 RAW，不建立伪造实时录制。`captureSeq` 在 capture 内递增；`byteBoundary` 明确网络帧/重组消息/桥接 payload，不能声称比捕获后端提供的更原始。

RAW Recorder 必须先对采集范围内输入完成持久化，再返回 RawCommit，后续 Parser/HTTP Evidence Extractor 才能处理。排队成功不是 RawCommit；崩溃恢复需验证帧/分段完整性。ACK 的 durabilityLevel 至少描述文件写入完成，最终是否要求 flush/fsync、段提交和掉电恢复由基线与存储决策明确；未达声明等级不能 ACK。

录制范围之外的数据不采集；已进入范围的未知、重复、失败输入不能因支持类型/去重而跳过保存。旧 epoch 帧仍归旧 capture 保存，但不发布到当前实时业务。

observedContext 可不完整，包含采集当时已知 anchorUid/roomId、身份来源、上下文版本及证据引用；后续补全用关联索引，不改原始字节。HTTP 用同一 recorder 保留相关原始主体，进程、路径、HTTP 状态等作为元数据关联。

写入失败返回结构化存储错误并暂停下游，开启有限缓冲/重试；缓冲耗尽记录实际缺口。不要继续生成不可靠结算后才发现原始证据不存在。

原始文件本身可能包含私人信息，置于受限本地存储。原始 Cookie/Token/Header 不出现在工作日志、公共 DTO、WS、导出日志中；RawDetail 对外只返回脱敏元数据和不透明 recordingId/rawId，不返回物理路径或原始认证内容。

## 3. ParserOutput 与增强

```text
ParserOutput {
  rawId, officialVersion, dictionaryVersion, decodeStatus,
  officialResultRef?, extensionsRef?, patchVersion?,
  failures[], decodedAt
}
```

decodeStatus 区分 decoded/partial/unknown/failed。官方结果、扩展结果、中文/标准事件增强独立保存；官方结果不可回写。未知类型保留 payload/rawRef 与错误依据，不伪造字段。

复用 BarrageGrab 传输层/解压或 protobuf 实现时，明确“传输解包”和“权威业务字段解析”的边界。官方 WebcastParser 仍是标准业务字段基线；不要让两个解析器各自产生一次有副作用的业务流。采用哪种桥接/等价实现需有字段对照和真实 RAW 一致性证据。

## 4. EventEnvelope 与 EventStore

```text
EventEnvelope {
  schemaVersion, eventId, eventSeq, streamId, producer, origin, eventType,
  runtimeNamespace, mode, sourceType?, sourceEpoch?, captureId?,
  anchorUid?, roomId?, sessionId?, sessionKey?, contextVersion?,
  msgId?, userId?, occurredAt?, receivedAt, persistedAt?,
  rawRefs[], causationId?, correlationId?, versionRefs, payload
}
```

eventId 是稳定逻辑事件 ID，不因 WS 重发或分页改变。eventSeq 是 EventStore 在 streamId 内提交的单调递增顺序，字符串表示；不是平台 MsgId 或时间戳。对业务事件的重复发布由 EventStore 唯一约束/幂等写抑制，不能重复生成新 eventId 规避去重。

streamId 标识一次选定的事件域（live/replay、房间/场次或查询作用域）；历史包含多场时使用明确的聚合索引顺序，不把每场 eventSeq 直接混排。具体索引类型不冻结，但公共游标必须稳定。

EventBus 不等于持久化 EventStore。普通历史查询读取 EventStore；RAW 只为重解析/回放提供输入。可信原始记录已落盘后，重要事件、场次转换及待发布记录采用可恢复日志/事务，消费者幂等。正式业务等待场次关联，不能读取当前可变全局房间给历史事件归属。

去重键使用主播+roomId+method+有效 msgId；不包含 sourceType/连接/epoch 导致切源重复计数。无 msgId、缓存窗口和礼物连击规则在 SOURCE_MIGRATION 记录待验证条件，关键账本使用独立持久幂等。

## 5. SessionRecord 与证据

```text
SessionRecord {
  sessionId, anchorUid, roomId, sessionKey?, generation?, stateVersion,
  sessionState, roomState, platformLiveState, pushState, captureState,
  startedAt?, endedAt?, firstObservedAt, lastObservedAt,
  startEvidenceMissing, evidenceRefs[], notificationIntentRefs[],
  archiveState, runtimeNamespace, mode
}
```

sessionId 为本地内部场次/归档记录标识。同场切源、刷新、Hook 重连保留它；captureId、connectionId 可以变化。不因获得新连接自动创建新 sessionId。不同平台 RoomId 或同 RoomId 复用需要明确新场证据/规则；存在冲突时 NEEDS_RECONCILIATION。

状态轴：

| 字段 | 值域 | 不能替代的事实 |
|---|---|---|
| sessionState | UNRESOLVED / CREATED / LIVE / ENDED / NEEDS_RECONCILIATION | 不是连接布尔值 |
| roomState | UNKNOWN / CREATED / ENDED | 创建不直接证明推流 |
| platformLiveState | UNKNOWN / LIVE / ENDED | 平台在播不自动证明持续推流 |
| pushState | UNKNOWN / PUSHING / NOT_PUSHING | 不从伴侣进程存在推导 |
| captureState | CONNECTED / INTERRUPTED / RECOVERING / STOPPED | 中断/停止不等于场次结束 |
| archiveState | NOT_REQUESTED / PENDING / RUNNING / COMPLETE / FAILED | 归档失败不复活已结束场次 |

Evidence 包含 kind、anchorUid?/roomId?、进程/连接/epoch、observedAt、platformTime?、rawRefs、具体校验结果、可信范围；持久化后才能用于转换。

HTTP create → RoomCreatedObserved。参考 TryParse 返回的 0 是解析结果，平台业务码另存且显式校验。`data.status == 2` 的在播语义与其他实际推流字段仍需真实样本验证。有效 HTTP 下播、`ControlMessage.status == 3` 与当前场关联后才作结束候选。

common.roomId/common.room_id 按实际 Parser 字段提取并归一化；补房间不等于新开播。缺上下播证据时保留未知/中途接入标记，不造准确开始时间，不自动重复通知。Lifecycle 转换+幂等记录+待发布事件可靠提交，重复证据不重复转换。

## 6. HookReady 与控制端口

```text
HookStatus {
  hookReady, readinessPhase, dependenciesReady, proxyBound,
  setupVerified, companionState, processInstanceId?, restartRequired,
  captureState, lastRawAt?, reasonCode?, updatedAt
}
```

HookReady 的前置条件是所选捕获方式的依赖可用、接收端确实已启动、必要设置已核查；不是进程启动成功的同义词，也不要求已经开播或收到首包。setupVerified 表示明确的核查结果；未知必须 false/unknown，不擅自执行伴侣安装文件修改。具体探针及失败原因须原版基线收敛。

| 逻辑端口 | 输入 | 输出／错误 | 边界 |
|---|---|---|---|
| SourceControl | commandId、expectedVersion、目标来源/主播 | operationId、状态、SOURCE_BUSY/CONFLICT | 串行人工命令，单源 |
| RawRecorder.append | CaptureInput | RawCommit / RAW_PERSIST_FAILED | ACK 前不解析 |
| Parser.decode | RawCommit、指定版本 | ParserOutput | 官方/补丁隔离 |
| SessionManager.observe | 已关联 Evidence | 状态版本、生命周期事件 | 唯一场次权威 |
| EventStore.append/query | 稳定事件/过滤与游标 | 唯一事件/稳定页 | 不重解析 RAW |
| ReplayEngine.control | replayId、commandId、action、expectedVersion | operationId、隔离状态 | 单步/跳转重建，无真实出口 |
| ExternalIntegration | 标准事件或命令、actor、mode | 受控动作结果 | 当前预留，非 P0 设备控制 |

commandId 重试沿用同一 ID；内容不一致返回冲突。公共输入校验后才进入这些端口；内部调用也验证运行域，不能只靠前端的 mode 字段阻断回放副作用。

## 7. 日志、指标与扩展版本

LogRecord 包含 logId、时间、级别、模块、消息代码、脱敏文案、correlationId/operationId、有限 allowlist details；默认不带整个 payload、请求 Header 或配置。日志与 RAW/事件库各有职责，不在全链每阶段打印完整弹幕。

MetricSample 包含 sampledAt、scope/system/process/module、name、value/null、unit、availability、reason、source；操作系统实测与应用计数/耗时标明 provider。GPU/显存不支持时 null，不推测；模块 CPU/GPU 无独立测量时 unavailable。

契约兼容性：增加可选字段可维持 v1；删除/改类型/语义需新版本或明确兼容迁移。schemaVersion 与 Parser/patch/rule/API 版本各自保留。公共变更先给输入输出例、影响模块和验证方案，经统一审查再落地。
