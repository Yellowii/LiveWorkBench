# M1 离线契约与 M2a-O 首轮审查稿

2026-10-12；taskId：`M1-M2AO-REVIEW-20261012`；状态：**设计已记录，待审查；产品实现未开始**。

需求依据：用户提供的下一任务文件，以及权威 [核心 B26](../architecture/CORE_DEVELOPMENT.md)、[PUBLIC_API 10](../contracts/PUBLIC_API.md)、[STATUS 9](../progress/STATUS.md)、[R01 证据](../migration/evidence/M0-R01-audit.json)。核心文档当前 v1.2，内部/公共契约 0.1。本文维护本任务的具体接口差异和设计提案；公共契约正文由负责人审核后同步。

## 1. 本轮结果与验收范围

用户从一个本机页面选择已登记 R01 或 R01-Golden，启动真实解析任务，能停止、分页查看输入记录、定位官方/增强/旧结果差异及关联日志；数字来自任务执行。首轮同时建立 Gateway、只读输入边界、隔离派生存储和任务身份，不再让页面调用 CLI 或直接读文件。

首轮支持“开始解析/停止解析”，以后增加播放、暂停、单步、倍速和跳转。停止任务不是结束直播；本轮不创建生产 Session。已有 59 Golden 和 14,588/33 的完整样本统计作为验证依据，旧 364 错误/7 未知仅作历史对照。

写入路径提案：新增 `src/offline/`、`src/gateway/`、`web/validation/`、`tests/offline/`、`scripts/`、第一方 package 文件和使用说明；只在批准后同步本次公共接口条目。现有审计 CLI、证据及第三方 reference 保留。私人原样本和所有录制主体保持原位置；新派生库、日志和私有配置放在独立 runtime 目录，默认 `C:/project/LiveWorkbench-runtime/offline/`，不纳入主 Git。

## 2. 实现方式比较与推荐

| 方案 | 复用与代价 | 结论 |
|---|---|---|
| A：Node 24、官方 Parser adapter、Worker、SQLite、同源简单页面 | 已验证 Parser/审计代码为 JS，少一层桥接；从第一次可用版本就持久分页、任务/日志关联。SQLite 驱动版本需固定并做事务/取消测试 | **推荐，仅冻结离线台范围** |
| B：Node + JSONL 派生存储 | 初版写入简单；分页索引、命令幂等、事务检查点和后续恢复还需要另一套持久结构 | 不优先 |
| C：C# Gateway/存储 + Node Parser | 后续 Windows 核心可能更统一；首轮需 IPC、两侧构建/生命周期和字段桥接 | 作为后续整体宿主审查候选 |

本机只读核查：Node `24.15.0`，内置 SQLite `3.51.3`，Worker 可用；候选端口 18765/18766 当前未见监听。这里只查询环境，没有绑定端口、打开数据库或安装产品依赖。

Node 24.15 的 `node:sqlite` 处于 release candidate，`DatabaseSync` API 是同步的；方案 A 将解析/数据库工作放到工作线程，Gateway 保持响应控制请求。平台 ID/顺序按字符串或 BigInt 处理，不经 Number 丢精度。[版本固定的官方 SQLite 文档](https://nodejs.org/download/release/v24.15.0/docs/api/sqlite.html)、[Worker 文档](https://nodejs.org/download/release/v24.15.0/docs/api/worker_threads.html)。这是离线用驱动候选，不能宣称已通过恢复测试。

首轮从受控外部依赖目录加载既有 Parser，不复制完整参考仓库或官方脚本进主 Git。固定 commit `e9e6cec4a2076dc5aacf94a0ca85ede33274544c`，两个 vendor 哈希与 R01 证据一致；启动核验缺失/漂移时返回 DEPENDENCY_UNAVAILABLE。后续实际提取源码/再分发需补来源和许可审计。C# 捕获宿主没有变更。

## 3. 服务边界与数据流

```text
受控 InputRegistry → ArchiveReader（只读业务载荷）
 → 固定官方 Parser → 独立 Enhancement / LegacyDiff
 → ValidationStore（输入追踪、派生观察、任务、日志）
 → Gateway /api/v1 → 同源验证页面
```

- InputRegistry 仅接受启动配置中的已授权 R01 根目录，登记 R01 和它的 59 序号子集；UI 只传不透明 inputId。配置路径不进入 DTO/错误/日志。目录 realpath、大小、索引词法和引用范围检查复用审计的已核查规则，拒绝越界/junction 引用；不枚举兄弟场次。
- ArchiveReader 每次读取一条索引及对应 payload；保存 opaque rawId、hash、原 seq 和关联信息。它不生成 CaptureInput.sourceType、captureId/sourceEpoch 或实时 RawCommit，不捏造来源/传输/持久 ACK。
- Parser adapter 复用 `loadParser(directory)`、`decodeBusiness(parser, method, bytes)`、`resolveBusiness`；不调用 decodePacket 伪造外层，不加载旧业务执行器。旧结果按已登记的单条 JSON 引用只读查看，不把 parsed.jsonl 全文塞入上下文或复制进派生库。
- 先固定原生结果和 hash，再创建增强副本；增强不回写 native。错误/未知记录也持久留追踪，不把原 payload/base64 放到公共详情或工作日志。详情是明确标注的脱敏视图，原生 hash 的计算对象保持原样。
- Store 仅含 replay namespace 的新派生结果、记录定位/hash、任务/幂等和日志；不连接正式业务库/通知/设备。分页只查询已提交的记录，不重跑解析。
- Gateway 的工作线程 RPC 只有固定操作名及 DTO；前端不能传脚本、SQL、模块路径、文件路径或任意命令。页面渲染文字/JSON，远程头像/资源 URL 作为文本，不自动下载。

## 4. 必须审查的内部输入差异

现有 CaptureInput/RawCommit 用于实时采集门槛。历史 business-payload 需要独立只读描述：

```text
HistoricalInputRecord {
  schemaVersion: "1", inputId, rawId, originalSequence: decimalString,
  inputFormat: "business-payload", byteBoundary: "archived-business-message",
  method, contentHash, byteLength,
  indexedMsgId: decimalString, commonMsgId?: decimalString,
  observedRoomId?: decimalString, anchorUid: null,
  archiveRecordedAt?, timestampRole: "unclassified-archive-ts",
  sourceType: null, sourceVersion: null, oldDictionaryVersion: null,
  immutableSourceRef: internalOnly, legacyResultRef?: internalOnly,
  mode: "replay", runtimeNamespace
}
```

internalOnly 引用是注册表/库内受控 locator，不向前端返回物理路径。历史文件已存在与读取 hash 是本轮依据；不是新 Recorder 的先持久 ACK。UTC 时间可表示归档 ts，但 occurredAt 仍未知，不把归档创建时间当开播时间。索引/原始 Common 两套 MsgId 分开保留，不能先统一选“正确的一方”。

本轮正式消息去重不启用：主播身份来源和两套 ID 的正式策略尚未冻结。可实际统计 `roomId + method + Common.msgId` 的**本任务重复候选**，但全部输入追踪保留，`suppressedCount=0`，policy 明示 `observe-only-unresolved-anchor`；UI 不把候选检测显示成生产去重已完成。此范围请负责人确认，后续正式 key 仍服从 CORE_CONTRACTS 的主播/房间/方法/MsgId 规则。

登记时只核对已审计的 session/index 指纹、路径范围和 Golden 清单，不再次跑全目录业务审计；Golden 条目在读取时核对已记录 RAW hash。非 Golden 的 R01 输入在真实解析时记录本轮 hash/文件状态，已知指纹或读前/读后状态变化使任务失败。它不是对所有原文件拥有原始采集时校验和的保证；完整 corpus 指纹回归仍由明确的全量检查任务执行。

## 5. PUBLIC_API 0.1 的具体扩展提案

继续采用 `/api/v1`、公共响应/错误/Page/operation/log 结构；新增字段和资源经审核发布，不建立临时 /debug 接口。下列资源只属于离线验证，不复用 RecordingDTO 的实时采集语义，也不把验证任务硬当 ReplayEngine。

### 5.1 DTO

| 新增或扩展 | 具体字段 / 约束 |
|---|---|
| HistoricalInputDTO（新增） | inputId、label（R01/R01-Golden）、inputFormat、byteBoundary、origin="historical-archive"、readOnly=true、parentInputId?、expectedInputCount、methodsCount、observedRange、timestampRole、parserVersionRefs、availability/reason；sourceType/sourceVersion/oldDictionaryVersion=null，明确 missingMetadata；不含路径 |
| SystemDTO.offline（新增可选） | mode="replay"、controllerVersion、activeValidationId?、workerState、ready/reason。live/hook/session 字段如未实现用 capability/未知表示，不伪造 connected/live |
| ValidationRunDTO（新增） | validationId、operationId、inputId、runtimeNamespace、mode="replay"、stateVersion、status、createdAt/updatedAt、versions、counters、lastCommittedInputSequence?、streamId、reportId? |
| ValidationMessageDTO（新增） | messageId、validationId、messageSeq、originalSequence、method、rawId/hash、bytes、officialStatus、legacyStatus、differenceCategories[]、index/common ID 的来源标识、normalizedEventRefs[]；列表不含完整结果 |
| MessageTraceDTO（新增） | 单条 metadata、officialView/enhancementView/legacyView、各层原样 hash、projectionVersion、redactedFields、field-number evidence、six-category differences。视图与原生存储明确区分，不返回原始字节/路径/凭据 |
| VerificationReportDTO（新增） | reportId、validationId、kind=parse-summary/golden、inputCoverage、版本/来源缺口、counters、checks executed/passed/failed/skipped、failureLocators（messageId/rawId/originalSequence/checkCode）、endedReason、partial、startedAt/completedAt。未执行的检查不能计 passed |
| OperationDTO（复用） | kind="validation.parse" 或 "validation.golden"，result 仅给 validationId/reportId。queued/running/cancelling/completed/cancelled/failed/interrupted；状态/报告不等同实时/业务验收 |

所有平台 ID 和序号为十进制字符串。counter 为非负安全整数，首轮硬上限 20,000 输入；登记的 R01/R01-Golden 预期各为 14,588/59，实际读数不符则报覆盖差异。elapsedMs 等耗时是实际单调时钟测量。记录、标准化、候选重复、实际事件提交分别计数；失败输入仍有 ValidationMessage。首轮派生事件为 `validation.message.observed`，保留原 method，不发送生产业务事件。

### 5.2 路由差异

| 路由 | 与当前表的差异、输入/输出 | 权限 |
|---|---|---|
| GET `/api/v1/validation-inputs` | 新增；Page<HistoricalInputDTO>，只列服务端登记项，不提供路径注册/扫描 | recordings.read |
| POST `/api/v1/validation-runs` | 新增；commandId、expectedVersion（offline.controllerVersion）、inputId、kind=parse/golden、server-approved versionRefs；202 返回 validationId/operationId | replay.control |
| GET `/api/v1/validation-runs/{validationId}` | 新增；ValidationRunDTO，刷新只读恢复任务 | replay.control |
| POST `/api/v1/validation-runs/{validationId}/actions` | 新增；commandId、expectedVersion（run.stateVersion）、action=stop；202 返回 operationId。pause/step/seek 尚未实现时 501 | replay.control |
| GET `/api/v1/validation-runs/{validationId}/messages` | 新增；method?/status?/category?、cursor?/limit?/snapshot?；稳定 Page<ValidationMessageDTO> | events.read |
| GET `/api/v1/validation-runs/{validationId}/messages/{messageId}` | 新增；单条 MessageTraceDTO，只读已提交记录和受控旧引用 | events.read |
| GET `/api/v1/validation-reports/{reportId}` | 新增；VerificationReportDTO，不给物理导出路径 | replay.control |
| GET status/capabilities/operations/logs | 复用已有路径/结构，补对应离线能力、任务 kind、关联 ID；不用另一套日志/查询协议 | 现有权限 |
| POST `/api/v1/auth/local-session` | 待审查本机开发认证入口；Host/Origin 必须与所绑定回环地址一致，发行 HttpOnly/SameSite=Strict、8 小时有效的 lwb_dev_session cookie，204 空响应；不允许请求指定 actor/权限 | 仅受控本机 bootstrap |

首轮服务 `127.0.0.1:18765`，同端口提供静态页面与 Gateway；端口占用即明确失败，不改已有服务或静默切换端口。认证策略只授予本机验证所需的既有权限，cookie/签名密钥不进 DTO/日志/URL；所有 mutation 校验 Host/Origin，限制 JSON body。CLI/HTTP 测试使用同一授权流程。此认证范围也须审查，LAN 身份认证仍未实施。

本机验证 actor 固定为 local-dev，cookie 随 Gateway 启动生成/轮换，避免更换浏览器 cookie 导致同一 commandId 的持久幂等失效。JSON body 上限 16KiB；cookie 值使用 32-byte 随机凭据，日志不打印。授权不是正式多用户身份体系；远程/LAN 启用时需要另审认证，不能外推本机 bootstrap。

当前 RecordingDTO 和 POST /replays 的 recordingIds 保持原语义。下一增量可提出 POST /replays 的 inputIds/sourceKind 兼容扩展，把本 HistoricalInput 引入真正的 ReplayEngine；首轮不提前启用未实现播放动作。GET /events 在事件服务具备已审查能力时启用，不把失败/去重后的输入记录误当业务事件。

## 6. 任务、分页和取消的具体行为

- 同时最多一项活动离线任务；冲突返回 409 SOURCE_BUSY，并指出 opaque activeValidationId。commandId + actor + 命令内容 hash 持久幂等，相同内容返回同任务，不同内容返回 COMMAND_CONFLICT。
- 工作线程读取/解码/提交一条输入时使用事务：输入追踪、新派生结果/观察、统计检查点一起提交。单条失败计失败并保留追踪；索引逃逸、输入发生变化、DB/版本错误使任务 failed，不继续冒充完整结果。
- stop 先进入 cancelling，Worker 在输入边界停止，确认已提交的最后序号后再给 cancelled 与 partial report；停止后不再追加。5 秒未响应则中止 Worker 并将任务标 interrupted/worker-cancel-timeout；不能把强制终止伪报成功停止。任务后续状态从持久检查点读回。
- Gateway 重启后，未终态作业标 interrupted；前端刷新只 GET 已有任务，localStorage 只保存 opaque validationId，不自动 POST 新任务或自动续跑。
- 首轮以 500ms 的状态/增量查询替代 WS，capabilities 明示 WS 未实现。状态/日志按已持久化序号读取；后续使用同一 Gateway 实现 WS，不变更前端直读边界。
- Page 默认 50、最多 200；snapshot 固定本 run 的上界 messageSeq，cursor 绑定 run/filter/order/上界/边界并签名。限期 24 小时，签名密钥存独立 runtime；过期/过滤不符按既有错误返回。解析继续追加不改变已固定的历史页。
- 前端列表只保留最多 500 个摘要、渲染当前页；上翻不被后台查询拉回底部，新记录只更新计数，一键最新才跟随。单条 trace 按需加载、响应最多 1MiB；不一次返回 14,588 条或整个原生树。输入 payload 上限首轮 256KiB，覆盖已审计的 17,366-byte 最大值；超限属于输入变化/失败，不能截断后解析。
- UI 分为输入/控制、真实统计、分页消息、三层详情/差异、关联日志；未支持 Hook/推流/播放等显示原因并禁用。统计取后端 counters，不硬编码成功率；记录时间与平台发生时间分列，未知不变成 0 或“未播”。

## 7. 首轮适配的精确白名单

| 来源 | 增强层处理 | 保持的限制 |
|---|---|---|
| Common #2/#3、Gift #2/#4/#5/#6/#9/#11 | 十进制字符串与 camel/snake 兼容别名，附 tag/wire/sourceVersion | 原生字段/MsgId 不重写；结束数字不是场次转换 |
| User #73（webcast_uid） | legacy-compatible idStr 别名及独立身份来源，标准 user.id 仍来自自己的数字字段 | 不把 webcast_uid/id_str/user.id 互换 |
| Control #2（action） | 旧 status 兼容视图，raw varint=3 时标 end-candidate observation | 不确认实际推流/场次结束 |
| Common #10 与 #11 | legacy.commonPriorityScore 来源 #10、nativePriorityScore 来源 #11 并列，显示冲突 | 不覆写 native，不给未经确认的优先级业务规则 |
| Gift 根 #33 与 Common #3 | legacy.giftRootRoomId 来源 #33、roomContext 来源 Common #3；示来源冲突 | 不按旧根 roomId 关联房间；时间单位/旧意图仍未冻结 |
| 归档 index.msg_id 与 Common #2 | idEvidence 两项并列，candidate differences 留记录 | 不宣判索引是外层 ID，不统一覆写 |
| 星守护模板 | membershipCandidate{kind:"text-observation", rawPath:"1.8.2", terms:[...], confirmedEntitlement:false} | 只检测已知模板词组；不授予会员/计费/权益，也不将进场类当会员 |

有证据的别名在独立 `dictionary-extension`，同名来源冲突放在 `legacy` 命名域。首轮没有已确认的新字段号 Proto Patch，patchVersions 返回空并说明原因；未知业务名/价格权益不实施。旧未命中字段只归 difference candidate，不能机械以一方字段名判错。

## 8. 验收和后续顺序

首轮的必测输入/条件：

1. R01-Golden 从页面触发真实 Worker；59 条 RAW/hash/原生/旧结果检查可定位，失败样本只用单独合成 fixture，不改原样本。
2. R01 全量运行真实读取 14,588 条、33 方法，decode/normalize/candidate-dedup/event/write 计数来自执行；旧失败/未知不照抄作新失败。
3. 进行中停止、停止后不追加；重复 commandId、不一致命令、刷新重连/后端重启；DB 写入失败和 Worker 超时有真实 partial/interrupted 报告。
4. 分页过滤/上界期间追加、游标过期、有限缓存和阅读锚点；响应里的 opaque locator 不能变为文件访问入口。
5. 超 2^53 的 ID、两个 MsgId、User #73、两项同名冲突；原生 JSON/hash 不受扩展影响；错误/未知/超限输入仍可追踪。
6. 指定目录读前/读后 hash、越界/符号链接、凭据/私有路径不在 DTO/日志；无生产库/通知/设备/外网资源副作用；未授权控制被拒绝。

交付实际启动/操作说明、API/页面检查证据、版本/结果/未覆盖项。通过首轮只说明离线验证工作台可操作，不能把 M0/实时/P0 标完成。

实现顺序提案：①审批本离线输入/任务/认证 DTO 与方案 A；②按审批后的规格形成详细实现计划并审查；③同一对话串行实施首轮，先落真实可操作链再验收；④随后逐轮加入播放/暂停/单步、WS/历史恢复，再加跳转重建/回归面板。当前无主提交，文档审查直接在主根最小改动；不擅自首提交来创建 worktree，不自动派工。

## 9. 本次审查请求与未执行项

请求批准的具体内容：方案 A 的**离线用**栈、历史输入与 Recording 分离、上列新增 DTO/路由/本机认证、首轮 observe-only 去重、适配白名单及首轮边界。批准后由负责人同步公共契约，再完成详细计划；本文件本身不使接口生效。

本轮只读核对公共文档、既有 R01/Golden 报告与 Parser API/依赖，没有重审整个私人场次，没有监听/运行产品、安装产品依赖、生成 DB、实现 UI、修改 references 或原 staged/unstaged 工作。没有新功能通过的声明。
