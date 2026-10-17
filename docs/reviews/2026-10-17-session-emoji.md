# 房间场次隔离与官方表情接入

2026-10-17；owner本会话→用户；用户已同意先做场次隔离/结束归档和表情，优先官方逻辑。基线1e46a44；顺序使用既有codex/stability-data-stage worktree，未派工。

## 来源与取舍

只读比较[LiveMngSys](https://github.com/Yellowii/LiveMngSys/tree/cd5d83bb1fa7287c766f78b440fea3c6ec373c9b)，未运行或复制整仓：emoji_assets.py使用官方emoji/list建立名称/图片目录及失败保留缓存；event_store.py消费文字表情及会员图片；service.py结束停止及切换清视图；wss_client.py按房间/场次保存。复用这些思路，不移植凭时间自行分场、从二进制猜URL或把所有非LIVE状态均当下播的策略。

更高优先级依据是本机只读官方ChatRoom.b626dcc2.js的setEmojiReflex/display_name消费和568771接口模块。hide只影响输入面板，接收展示仍保留映射。授权的emoji/list响应平台0、214项、version=1766572369433，观察时间2026-10-16T06:27:28.755Z，SHA256=cb4fb89913872aaca65dd0c1cbcefc6af276122714842153e8db9777df516a17。源响应、提取目录和图片均只放忽略的私有目录。

此前三个真实EmojiChatMessage的原生图片使用lf3/5/6-webcastcdn-tos.douyinstatic.com，旧白名单全部拒绝；普通ChatMessage缺少名称目录。两种原因分别修复，不按名称猜会员等级或构造资源URL。

## A：场次与下播闭环

查询游标、历史锚点绑定mode/namespace/roomId/sessionId。实时页默认当前场；下播后清空当前列表/舞台/详情，历史显式选择；切换房间/场次、迟到响应和旧游标不得串入。首页最近事件同样只取当前场；通用数据记录保留跨场历史查询。

保留SessionManager唯一权威：关联当前sourceEpoch的官方Control.action=3，或身份一致、连续确认且检测时间晚于当前连接开始的官方status=4，才停止Web监听。活动连接保留低频HTTP探测，空闲周期监控开关不再导致已下播仍收心跳。UNKNOWN、网络错误、没有弹幕不结束场次；前一代缓存END不能停止新连接。

结束事件持久化后标archiveState=COMPLETE/archiveFormat=indexed-events-v1，即索引归档，RAW不搬迁、不重写。启动时只给已有持久结束证据的旧记录补归档状态。同场重连保留sessionId；已结束的同roomId，必须有结束后新确认的官方LIVE转换才建立下一代；普通消息不复活旧场。可信新代去重与旧场分开，旧事实保留。

## B：官方表情

独立EmojiCatalog查询增强，官方Parser不变。精确display_name替换、未知留原文、原生会员图片优先；有界缓存/版本/观察时间/来源哈希，官方固定HTTP刷新失败保留旧缓存，Replay不联网刷新。消息图片默认显示并保存用户关闭选择，失败显示原生文字及诊断；候选回退共用列表/Canvas/详情。

新增共享HTTPS图片策略只放行已核实的douyinstatic图片主机/路径；不传观看Cookie、不放开外部脚本或connect。完整业务JSON与Proto/RAW关系不受转换成功与否影响；公共WS、日志和导出未增加可读内容。

## 验证与运行边界

针对性单元覆盖跨房/跨场游标、结束幂等、同场重连、可信新代、旧END拒绝、目录匹配/隐藏标志/未知文本、URL拒绝、缓存恢复/失败保留及Replay无刷新。

隔离Playwright：session-scopes GUI经过真实官方Parser处理5条合成RAW/5事件、0解析失败，覆盖两房、迟到响应、结束停止/归档、历史和同roomId新场；emoji GUI覆盖普通及会员图片、第一候选失败后第二成功、未知文字、JSON/Proto/RAW和480/1440布局。另复核既有消息/舞台GUI。报告及截图仅在artifacts/session-scopes、artifacts/emoji-official等私有目录。

真实历史GUI只读抽取34条既有事件并复制到新隔离库，未复制账号、配置或原RAW；使用已有私有徽章缓存，仅额外允许原生会员表情的确切官方图片URL。最终3次官方图片请求、3张会员表情均加载成功，0页面错误；已有缓存命中5次，其余未缓存图片227次由测试主动阻断，不算平台失败。报告及截图artifacts/chat-room-history/report.json、real-history-chat.png。该验证证明历史字段和实际CDN图片可显示，不代表新平台扫码、在线换房或真实下播验收。

最终既有消息GUI1172 RAW/1172事件、0页面错误通过。场次GUI一度只等待WebSource状态即提前断言SourceController完成，暴露异步停止的测试等待竞态；改为等待受保护状态中的SourceController STOPPED和coordinator.active为空后通过，未绕过停止检查。正式业务代码未为该测试竞态增加延时或放松约束。

全套回归首次因worktree缺少C#捕获宿主失败，随后在第一方忽略目录构建，未改引用区或运行服务。并发4的复跑有一个accounts.test.js测试进程退出，未获得根因；该文件单独6/6通过。最终并发2回归235项：234通过，唯一失败是部署冷启动fixture的Windows进程扫描返回PROCESS_SCAN_UNAVAILABLE；只重跑该用例1/1通过。保留原始失败，不宣称单次全套全绿，也未修改部署安全保护来绕过扫描失败。完整日志在私有artifacts/session-emoji-final-regression.log。

运行中的55976不是可清理预览：用户已经加入真实账号、房间并监听，PID27884仍加载0ae7760。只读看到场次已ENDED而旧采集继续CONNECTED，是本次待部署修复的现场证据；磁盘提交不会更新该后端。本轮未停止它、未重启18783、未关闭浏览器、未改变代理/DNS/CA/伴侣。正式服务更新和真实下播闭环仍待用户安排，不能以隔离合成GUI代替。

未完成：活动组专属表情目录缺少本地完整消费证据，不猜映射；完整官方动效、全量在线观众、真实新平台下播/再开播及六小时稳定性不在本次通过范围。

## 用户授权后的55976本机更新

用户明确允许安全更新55976后，先核对原PID27884、实例ID、同一Windows用户、准确启动命令、仅loopback端口及私有数据租约。旧入口是历史预览工具，未重复运行该工具或复制任何历史片段；只对这个已核对的旧入口做一次性受限迁移，通用部署保护未改。Gateway停止监听并确认SourceController STOPPED、Coordinator无active、RAW/解码pending均0后，私有SQLite备份完成，再结束该空闲PID。复用既有预检/验证启动函数，以标准server.js隐藏后台启动，同一端口/同一数据目录/原设置；无新浏览器、Hook或代理操作。

2026-10-17 08:04核实新PID17640、实际加载7c2502c、指纹70e0d194f29076866206710c0ae8b887ba24a19cecd08c6ff2e67b1087664161。租约属于新PID，health正常；4428 RAW/2060事件/1场次与停止后完全一致。DPAPI文件、账号记录及完整房间配置哈希前后相同；原ENDED场次已归档COMPLETE，current为空，历史可查。原空闲monitor/autoStart均false保持，未重新连接已结束场次。停止请求到启动后验证完成46.317秒，记录为维护窗口，不冒充精确网络停机时长或零消息缺口。

刷新用户已有IAB页并实际操作当前/历史、会员表情详情、完整JSON、Proto字段和RAW。当前渲染快照47张图加载；普通ChatMessage的[戳手手]和EmojiChatMessage原生图片均实测naturalWidth>0。会员图片URL定位为webcast.data.Image #1 repeated string。截图、私有备份和部署统计在.local/deployment/update-55976-20261017；截图不上传。没有新扫码、在线换房、真实新下播或长期验收，18783未启停。
