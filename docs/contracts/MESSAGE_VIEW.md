# 本机实时弹幕 MessageView v1

本次用户明确授权的展示层增量，基线 c8613b6。原始 RAW、Proto、官方 JSON、EventStore、去重和场次不修改。

`GET /api/v1/local/messages` 接受现有 limit/cursor/mode/namespace/method/afterSeq，复用签名快照分页，默认 mode=live，最大200。另支持 beforeEventId：从指定已存事件之前开始历史快照，必须匹配查询域，不能与 cursor/afterSeq 同用，否则 CURSOR_MISMATCH；后续仍用返回的签名 cursor。此入口用于实时缓存淘汰后的连续历史读取。返回 MessageView 与原有分页字段。`GET /api/v1/local/messages/{eventId}` 返回 view、official（完整原生业务对象，仅event.payload.official）、schema（有界概览500字段/12层）、raw、protos。2026-10-15起不再截断official字段、数组或未知字符串；详情按需查询，前端折叠树每次展开100项、长字符串分段显示。原生JSON、中文字段解释和MessageView增强独立。映射失败仍返回原始业务和事件引用。

`GET /api/v1/local/messages/{eventId}/field?path=<JSON Pointer>` 精确查找任意嵌套字段的当前官方Proto编号、类型及独立中文注释，未确认返回unknown。`.../binary?rawId=...&protoId=...&offset=0&limit=4096` 按字节分页返回hex/base64（limit 1..65536）；必须是该事件的RAW引用，指定Proto还须与事件处理链关联。直接RAW仅支持业务载荷/帧，不开放HTTP头或认证存储；禁止传入路径。返回size/nextOffset及持久索引hash，分片本身不声称重算整文件哈希。上述子路由同样要求loopback、会话、同源与显式本机请求头。

所有本机业务详情接口除现有 loopback Host、会话 Cookie、Origin 检查外，还要求 loopback peer、`X-LW-Local-View: 1`，浏览器 Fetch-Site 只能 same-origin/none。不提供 CORS、导出或可读WS。MessageView摘要仍只保留已映射文案并过滤明显凭据，完整official不使用此摘要规则。图片资源单独经过HTTPS图片域和凭据参数检查；保留图片CDN的x-expires/x-signature等变换/有效期参数，拒绝通用cookie/token/authorization/signature等凭据参数。默认不加载远程图片，用户可在本地启用。无法识别的正文中人为粘贴的无标签秘密无法从普通文字语义识别，故这些响应仍严格限本机认证读取，不复用为外部消费者数据。

MessageView：messageType、category、label/icon、summary、actor、content、resources、fields、provenance、mappingVersion、mappingStatus、eventId/rawRefs，以及 time/eventSeq/mode/runtimeNamespace/captureId。纯转换仅发生在查询时；单条映射异常转为失败提示，不连接采集总线、不写存储。原有公共事件/日志/WS/导出继续原脱敏投影。MessageView是增强展示，完整official才是该条持久官方输出。

前端最多缓存500条，虚拟列表只渲染可视区域；分类过滤已载入数据，可继续逐页查看历史。跟随通过认证REST持久化高水位补查，每轮最多3页，未读完的签名快照保留到下轮；切页保留缓存/详情。历史浏览暂停跟随，回到最新为显式操作。Replay按mode隔离查询，具体namespace显示于详情；不驱动回放或业务副作用。

映射来源：[指定插件静态规则](../reviews/2026-10-14-message-mappings.md)及[快照哈希](../migration/message-plugin-sources.json)。中文注释来自第一方独立解释，未确认者明确未知；字段号必须来自运行中官方Parser，不能用命名近似猜测。新页面能力不代表18783已更新。

2026-10-15 舞台首批：`public/message-stage.js`、`stage-model.js`、`stage-resources.js` 独立负责Canvas、DOM和有界展示时钟/资源缓存，共用本机MessageView，不进入采集链。actor增加可确认的数字ID，gift增加groupId以避免跨人/跨组更新。只实现普通/通用特权弹幕、礼物托盘和福袋；其他类别仍走列表详情。`GET /api/v1/local/assets/{lottery-icon|gift-tray-bg}` 仅允许固定本地PNG、会话及同源loopback图片读取，不接受路径，不支持外部脚本。私有原图不入Git。静态依据、未还原项与截图见 [三组件核查](../reviews/2026-10-15-message-stage.md)。

2026-10-15 第二轮映射 `message-view-20261015-fidelity2`：content.runs保存有界、有序的纯文本/已校验图片片段；content.privilegeStyle使用静态核实的base/advanced/supreme，其他为unknown。gift新增displayCount/trayText/trayEligible/trayType；resources新增trayBackground/giftDynamic。trayEligible只决定托盘展示，repeat_end原始事件与详情不丢弃；递增数量才更新同组托盘。activity.observedRemainingSeconds仅为有效平台draw/current时间之差（0—86400秒），不承诺当前倒计时。新增字段向后兼容；旧运行服务无这些字段时页面降级，不把磁盘新代码当作已加载的新映射。官方Parser与原始JSON不变。

2026-10-16 `message-view-20261016-activities`：新增roomId作为展示域身份；红包activity增加title/descriptions（纯文本、数量字段、礼物ID）及stageEligible，资源种类redpacket/description。ShortTouch补name或accessible_name、24—120px适配尺寸、containerType/requiresContainer/priority；资源种类activity，不执行任何容器payload或URL。管理员补已核实的privilegeSymbol与独立中文privilegeLabel，其余编号仍未知。舞台新增红包/活动/管理员有界组件；活动按areaType更新/移除，红包按boxId更新结束，mode/namespace/capture/room隔离。仅固定认证图片入口增加redpacket-notice。原生JSON和查询授权不变；原版互动、资源缺失和验证边界见[本轮核查](../reviews/2026-10-16-activity-stage.md)。
