# 本机实时弹幕 MessageView v1

本次用户明确授权的展示层增量，基线 c8613b6。原始 RAW、Proto、官方 JSON、EventStore、去重和场次不修改。

`GET /api/v1/local/messages` 接受现有 limit/cursor/mode/namespace/method/afterSeq，复用签名快照分页，默认 mode=live，最大200。另支持 beforeEventId：从指定已存事件之前开始历史快照，必须匹配查询域，不能与 cursor/afterSeq 同用，否则 CURSOR_MISMATCH；后续仍用返回的签名 cursor。此入口用于实时缓存淘汰后的连续历史读取。返回 MessageView 与原有分页字段。`GET /api/v1/local/messages/{eventId}` 返回 view、official（完整原生业务对象，仅event.payload.official）、schema（有界概览500字段/12层）、raw、protos。2026-10-15起不再截断official字段、数组或未知字符串；详情按需查询，前端折叠树每次展开100项、长字符串分段显示。原生JSON、中文字段解释和MessageView增强独立。映射失败仍返回原始业务和事件引用。

`GET /api/v1/local/messages/{eventId}/field?path=<JSON Pointer>` 精确查找任意嵌套字段的当前官方Proto编号、类型及独立中文注释，未确认返回unknown。`.../binary?rawId=...&protoId=...&offset=0&limit=4096` 按字节分页返回hex/base64（limit 1..65536）；必须是该事件的RAW引用，指定Proto还须与事件处理链关联。直接RAW仅支持业务载荷/帧，不开放HTTP头或认证存储；禁止传入路径。返回size/nextOffset及持久索引hash，分片本身不声称重算整文件哈希。上述子路由同样要求loopback、会话、同源与显式本机请求头。

两个接口除现有 loopback Host、会话 Cookie、Origin 检查外，还要求 loopback peer、`X-LW-Local-View: 1`，浏览器 Fetch-Site 只能 same-origin/none。不提供 CORS、导出或可读WS。未知字符串默认隐藏；仅文案字段白名单和标量保留，嵌入网络地址/明显凭据字符串清理。资源单独经过HTTPS图片域、无查询/凭据校验；默认不加载图片，用户可在本地启用。无法识别的正文中人为粘贴的无标签秘密无法从普通文字语义识别，故这些响应仍严格限本机认证读取，不复用为外部消费者数据。

MessageView：messageType、category、label/icon、summary、actor、content、resources、fields、provenance、mappingVersion、mappingStatus、eventId/rawRefs，以及 time/eventSeq/mode/runtimeNamespace/captureId。纯转换仅发生在查询时；单条映射异常转为失败提示，不连接采集总线、不写存储。原有公共事件/日志/WS/导出继续原脱敏投影。官方JSON的安全投影不是新的权威解析结果。

前端最多缓存500条，虚拟列表只渲染可视区域；分类过滤已载入数据，可继续逐页查看历史。跟随通过认证REST持久化高水位补查，每轮最多3页，未读完的签名快照保留到下轮；切页保留缓存/详情。历史浏览暂停跟随，回到最新为显式操作。Replay按mode隔离查询，具体namespace显示于详情；不驱动回放或业务副作用。

映射来源：[指定插件静态规则](../reviews/2026-10-14-message-mappings.md)及[快照哈希](../migration/message-plugin-sources.json)。中文注释来自第一方独立解释，未确认者明确未知；字段号必须来自运行中官方Parser，不能用命名近似猜测。新页面能力不代表18783已更新。
