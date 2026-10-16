# 开播证据与聊天、观众、入场接入

owner 本会话→用户，基线 c827995。本轮只改查询/展示层及隔离验证工具，不改 Parser、RAW、EventStore、SessionManager、SourceController 或监控调度规则。复用已有 worktree；未派工。根目录已有调查文档改动保留，不代为提交。

## 状态判定

平台状态沿用 LiveMonitor：目标身份匹配的官方结构化 room.status=2/4，连续 confirmations 次相同状态/房间/身份后确认 LIVE/ENDED。前端另外要求 profileVersion 一致、最新 queryState 与确认状态相同、确认数达到阈值、检测不超过两次 pollMs；过期、错误、目标变更明确显示未知/待确认，不沿用旧 LIVE 作当前事实。首页所有已保存配置显示房间名称、判定、检测时间、周期监控开关。

消息数据流独立展示。system/status 只增加 captureEvidence：以当前 WebSource/BrowserSource 的 captureId 对既有 RAW 索引做 limit=1 查询，必须为 live/live、对应当前 recording，再返回 profileId/captureId/captureSeq/receivedAt。不能用已经递增但尚未提交的 frameSeq、旧 status.lastMessageAt 或全局计数证明持久化。仅当前活动 profile、CONNECTED 且30秒内已有 RAW 才显示“有消息数据流”；其他房间、停止、恢复中、过期或无证据明确区分。它是消息流，不证明音视频实际推流；也不参与自动启停。

## 页面实际接入

- 在线观众：受认证 MessageView 增加 RoomStats 与 RoomUserSeq 投影。人数优先原生 display_middle，保留隐藏状态；消费 display_version，并按官方规则拒绝旧版本及 incremental 值不增长的更新。total 不被当作在线人数。榜单仅显示原 ranks 顺序的最多30条片段，隐身者不显示身份；不是完整普通观众名单，不推算离场。房间/capture/mode/namespace 分域，页面显示接收时间和历史边界。当前为已加载最多500条历史的快照，不保证完整房间状态缓存。
- 聊天：有序徽章优先 public_area_badge_info 基础 badge_list→badge_info_map，缺对象才使用旧 badge_image_list；最多12个。51/55/56 的明确名称使用九宫格背景，7使用图片叠加名称，其他使用真实图片。DSL条件尚未还原，存在时明确标注基础列表降级。图片HTTPS候选沿用既有安全边界，失败显示固定尺寸缺图框，不把文字撑出列表。
- 房间/粉丝团提示：content 或 common.display_text，按模板顺序组合纯文本、用户、徽章和图片。不硬编码“加分”或“升级”行为。粉丝团事件不假设用户权益。JSON/Proto/中文解释/RAW详情继续可达。
- 入场：已核实 enter_effect_config.type=8 的 text/badge/text_icon进入独立DOM提示，共用原MessageView和详情。有界队列、最多1个、5秒本地展示，不声称官方动画时长。type9保留原生详情并提示装扮播放器未实现，不执行脚本/ZIP或调用装扮接口。
- 时间：已有真实事件中观察到异常超远未来 occurredAt；仅展示层在超出合理范围时回退 receivedAt，并标记 timeSource；原生事件不改写。观众卡直接标记接收时间，不误称当前在线时间。

## 静态来源与未验证项

只读使用2026-10-16本机已保存资料，未执行原Webpack分块，未复制原版JS/CSS/图片到公开仓库。

| 文件 | SHA-256 | 已使用位置 |
|---|---|---|
| ChatRoom.b626dcc2.js | 20cc399c1b7449c0359d8f3b270673b365cfde159e6902872826e0594490c32f | 936755 入场8、观众来源 |
| island_237ab.480da559.js | c928d02de5cbf7efdd4027e2630f605c098863594f92fed4e873be0956b24b58 | 146686 模板与徽章 |
| island_237ab.640950cb.css | f3471a79e3dac9dc4a859bc69c4a1034631e68899c4925b38bd1583918ffdc99 | 徽章、昵称布局；工作台18px适配 |
| RoomMessageConsume.1e33b586.js | b7387e639b28e03a5f280b6c4b8a6bdc37809f69deb084518be22308854002c2 | 196276 人数版本及增量消费 |

可信等级：静态源码已核查 + 部分真实历史样本GUI；没有与官方页面逐条同步，不声称像素级还原、当前在线全名单或实时平台验收。缺失普通 audience 成功响应；未实现授权HTTP快照正式持久化、全图集、DSL解释器、type9/NotifyEffect高级动画及入场聚合。所有来源不替代业务验收。

## 验证与本机应用

针对性41/41通过；新增8项判定/投影测试先失败后实现。命令：`node --test tests/capture-evidence.test.js tests/room-presentation.test.js tests/chat-room-view.test.js tests/gift-menu.test.js tests/stage-resources.test.js tests/stage-activities.test.js tests/message-fidelity.test.js tests/stage-model.test.js tests/message-view.test.js tests/message-activities.test.js tests/message-api.test.js tests/message-pagination.test.js`。

`node tools/verify-chat-room.mjs`：隔离合成RAW→官方Parser→EventStore→真实GUI，验证独立状态/数据流、人数版本顺序、房间隔离、隐身、聊天XSS文本、入场、原生JSON/RAW详情、导航保留状态及480/700/1440截图/点击。报告和截图在私有 artifacts/chat-room。合成状态不代表真实WSS验收。

`node tools/verify-chat-history.mjs <授权已有SQLite> <已有私有图片资料目录>`：只读抽取34条真实历史事件，复制到无账号、无profile、无监控的隔离库；3条type8、16条带徽章、6条人数和6条榜单。通过Gateway做GUI查询，来源原生对象不改。Playwright只使用已有本地图片缓存，未缓存的外部资源请求阻断；原RAW未复制，所以此预览不作RAW链真实验证。真实RAW/Proto验证仍以之前调查证据为准。私有报告/screenshots在artifacts/chat-room-history；可选 --serve 保留该隔离预览，默认不加载远程图片。

原消息GUI回归1171条合成RAW/事件通过，历史分页、Replay与鉴权边界保留；活动GUI通过。正式18783本轮只读检查未监听；发现保存的两项自动监控/监听配置，因用户担心影响其他代理/服务，未启动正式服务。隔离预览不加载账号或profile，不会启动自动监听；系统网络、其他服务和采集浏览器均未操作。
