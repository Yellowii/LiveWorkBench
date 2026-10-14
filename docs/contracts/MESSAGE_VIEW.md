# 本机实时弹幕 MessageView v1

本次用户明确授权的展示层增量，基线 c8613b6。原始 RAW、Proto、官方 JSON、EventStore、去重和场次不修改。

`GET /api/v1/local/messages` 接受现有 limit/cursor/mode/namespace/method/afterSeq，复用签名快照分页，默认 mode=live，最大200。返回 MessageView 与原有分页字段。`GET /api/v1/local/messages/{eventId}` 返回 view、official（安全投影）、schema（实际存在的 JSON 路径、当前 Parser 字段编号/类型/嵌套父类型、根字典）、raw、protos。限制字段500、深度12；原生安全投影限制4096节点/14层/数组80项，截断明确标注。RAW只含元数据/处理链，不公开文件、原始字节或可用签名URL。

两个接口除现有 loopback Host、会话 Cookie、Origin 检查外，还要求 loopback peer、`X-LW-Local-View: 1`，浏览器 Fetch-Site 只能 same-origin/none。不提供 CORS、导出或可读WS。未知字符串默认隐藏；仅文案字段白名单和标量保留，嵌入网络地址/明显凭据字符串清理。资源单独经过HTTPS图片域、无查询/凭据校验；默认不加载图片，用户可在本地启用。无法识别的正文中人为粘贴的无标签秘密无法从普通文字语义识别，故这些响应仍严格限本机认证读取，不复用为外部消费者数据。

MessageView：messageType、category、label/icon、summary、actor、content、resources、fields、provenance、mappingVersion、mappingStatus、eventId/rawRefs，以及 time/eventSeq/mode/runtimeNamespace/captureId。纯转换仅发生在查询时；单条映射异常转为失败提示，不连接采集总线、不写存储。原有公共事件/日志/WS/导出继续原脱敏投影。官方JSON的安全投影不是新的权威解析结果。

前端最多缓存500条，虚拟列表只渲染可视区域；分类过滤已载入数据，可继续逐页查看历史。跟随通过认证REST持久化高水位补查，每轮最多3页，未读完的签名快照保留到下轮；切页保留缓存/详情。历史浏览暂停跟随，回到最新为显式操作。Replay按mode隔离查询，具体namespace显示于详情；不驱动回放或业务副作用。

映射来源：[指定插件静态规则](../reviews/2026-10-14-message-mappings.md)及[快照哈希](../migration/message-plugin-sources.json)。中文注释来自第一方独立解释，未确认者明确未知；字段号必须来自运行中官方Parser，不能用命名近似猜测。新页面能力不代表18783已更新。
