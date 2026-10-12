# 配置与监控接口 v1

2026-10-13用户要求的增量接口，追加到PUBLIC_API 0.1；既有采集/RAW/Parser/Session/Replay契约不变。最新指令允许独立监控多配置，包括LiveHook配置；替代早期C06仅Web监控的限制，但不允许另建LiveHook网页弹幕连接。

ProfileStore仅通过repository.getState/setState持久化普通配置。目标输入为typed string：auto/url/anchorUid/secUid/web_rid/roomId，数字auto返回PENDING_TYPE，不推断身份。profileId/版本十进制字符串；启用与自动监听默认false。最多100配置，周期至少10秒，超时最多30秒。凭据仅不透明authRef，禁止凭据内容进入Profile。

TargetResolver.classify/resolve分开；只允许固定Douyin HTTPS域、4次跳转、整体超时与2MiB主体。网络采用[NETWORK_TRANSPORT v1](NETWORK_TRANSPORT.md)：system/custom代理侧解析；direct仅公共DNS并固定连接地址。不请求媒体，不执行页面脚本。UID/实际roomId无可靠网页映射返回TARGET_MAPPING_REQUIRED；不将其当作web_rid。页面只认与目标匹配的结构化room/status/owner证据；推荐位/单个流URL不推断开播。当前确认status=2在播、status=4结束，其余UNKNOWN；语义待真实目标核验。

LiveMonitor.probe输入Profile，输出state/evidence；监控连接不采集弹幕。连续confirmations次相同状态/房间/身份才发MonitorEvent。UNKNOWN/HTTP错误重置候选、保留已确认状态及最后成功时间，并指数退避；不能触发停止。持久化确认版本/最后转换时间，重启同场不重复转换。pushState始终UNKNOWN。MonitorEvent含profileId/profileVersion/stateVersion/operationId/anchorUid/roomId/来源时间；不直接调用SessionManager或创建业务场次。

受认证本机API：GET /profiles与/monitor；POST /profiles {profile,commandId}；POST /profiles/{profileId}/actions {action:update/delete/check/resolve,expectedVersion,patch,commandId}。update/delete要求版本；输入仅写，编辑留空保留；返回目标类型/是否已登记与脱敏解析结果，不返回value/URL/authRef。WS monitor.updated输出同一脱敏投影。API禁止输入任意私有路径；LAN仍不可用。

普通配置保存不会切源或开始采集；自动调度与浏览器后续增量单独记录。真实身份解析/平台状态与生产长期监控尚待实机验收。

## 自动调度增量 B

MonitorCoordinator订阅monitor.updated/Event后的已确认状态，串行选取enabled/autoStart、当前人工选中来源、可信身份/roomId、最新成功检测且配置版本匹配的候选。仅STOPPED/FAILED资源可启动，不抢占活动room；最高priority优先，同最高等级冲突PROFILE_SELECTION_REQUIRED，手动start指定候选。operation/profile/version/room/identity/stateVersion与持久化尝试/绑定确保重复检查不建第二条连接。失败有冷却/次数限制；参数失效/鉴权策略等终止原因需人工重试。手动stop/switch抑制当前已确认直播信号；手动start重新启用。UNKNOWN不停止；确认END只停止本调度拥有且身份/room匹配的连接。SessionManager仍独立；此阶段stop是采集停止，不直接伪造场次结束。

GET /coordinator返回脱敏状态与最近100操作。Profile actions新增start/stop。SourceController.startProfile是内部串行入口，不能在REST传入WSS/Cookie；同一控制队列复查来源、版本、房间占用。WebConnectionResolver只接受新鲜且匹配身份/room的受控provider参数；公开上游没有动态签名获取，默认直连返回WEB_DYNAMIC_PARAMETERS_UNAVAILABLE。显式browser或browserFallback才产生官方页面目标；浏览器未准备时BROWSER_NOT_PREPARED。

WebSource本地v5适配每次连接/重连调用参数刷新，失败停止且不重用旧URL；生产原15秒心跳/指数抖动/403与429策略停止保留。用户autoReconnect/retryLimit传入原客户端。不修改Parser、上游live.js、既有v4或references。

## 浏览器与凭据增量 C

BrowserSource复用固定上游BrowserLive/AccountMonitor/createLoginContext，独立临时Chromium会话，只捕获匹配本次room_id的Douyin WebCast WSS，不主动建第二条上游连接。可选媒体/图片/字体阻断；任何模式均禁止媒体类型/流后缀/已知拉流主机，并阻止HTMLMediaElement.play。保留SDK脚本、弹幕WSS、房间状态与账号接口。官方SDK负责签名/心跳/ACK/连接恢复，工程不自动刷新或无限重启浏览器。

RAW边界为browser-websocket-network-event、connectionMode=browser、ackBoundary=official-sdk-uncontrolled、状态rawBeforeAck=false；只是浏览器网络事件可观察字节，无TCP/TLS或所有控制/FIN承诺。提交后才使用本项目解包Parser；SDK ACK可能早于提交。超大/队列拒绝留hash/大小缺口。来源仍WebSource。业务未知/重复/失败保留。

LoginVault位于私有data/auth，仅当前用户Windows DPAPI密文。仅persistLogin=true且明确authSave、官方账号确认AUTHENTICATED后保存过滤的Douyin状态；普通启用/自动连接不保存。authRef为内部引用；默认profileId分隔凭据。状态文件存在不能证明登录有效，独立UNKNOWN；有效性来自官方self API，界面不返回账号资料/密文/明文。关闭删除临时浏览器上下文；清除保存状态也停止对应本项目会话。未操作日常浏览器。

Profile actions新增authCheck/authSave/authClear/login。保存/清除/可见登录窗口要求expectedVersion。login是用户明确命令，要求人工选中WebSource及空闲资源；不自动切源。它可以在尚未确定roomId时只提供账号登录页面，拒绝该未知房间弹幕接入。自动监听始终headless，只有此命令可见。只有构建与合成验收，真实平台SDK/鉴权/恢复仍待。

## LiveHook配置协同增量 D

HookTargetMatcher使用已提交RAW的成功伴侣HTTP room/create owner作为主播身份证据；聊天user是观众，不能当主播。证据在私有库持久化并链接RAW；同room换owner标冲突，拒绝猜测。根据typed目标或经确认的web_rid映射匹配enabled LiveHook配置；未匹配时RAW/业务payload/解析尝试保留，但不建立或选中业务场次。HTTP创建只留房间/平台状态，pushState UNKNOWN。已有未结束同room身份依据可用于重启关联，新的流仍要重新观察。

仅本次录制/来源epoch、实际匹配伴侣WSS解码数据、当前代理与伴侣观察均就绪时Daemon标HOOK_READY；端口绑定/进程启动/HTTP创建单独不够。进程退出、重启、观察失败撤销HookReady，不能结束场次。SourceController.startProfile的Hook分支仅接管现有匹配流，不启动代理、不建WebClient、不改环境；调度允许此类既有资源接管。GET /hook/status新增profileMatch，WS hook.match.updated仅语义改变时推送。

已有明确HTTP/Control结束仍由SessionManager裁决。可信monitor的已确认ENDED、成功查询、douyin-structured-room来源并与调度拥有的已存在live场次身份/room一致时，Runtime.observePlatformEvidence正式命令记录独立platform-ended证据并结束同一场次；不新建场次，不补推流状态，不伪造官方解析结果/RAW引用。此项追加生命周期输入，事件producer=MonitorCoordinator、origin=monitor、rawRefs=[]、payload.official=null、独立extensions.platformEvidence。重复幂等。普通停止/断线/UNKNOWN仍不下播。此前B采集停止规则保持，新增可信END的场次证据处理。

阶段E2：Browser v4收到并持久化二进制网络事件后才报告CONNECTED；仅创建WebSocket不清除有效流等待计时。鉴权/访问/429/验证需求进入需人工操作状态并终止该状态自动重试；浏览器退出与WSS90秒无恢复是有界恢复原因。GET /sources/browser与metrics/modules.browser返回接收/连接/中断/队列/媒体阻断与自有浏览器进程工作集之和，无法读取明确unavailable/null。SDK心跳/控制帧细节未可观察，不以0冒充测量。RAW增加profileId/operationId/monitorOperationId/monitorStateVersion，最终事件通过独立extensions.processingContext关联；不保存URL、Cookie或账号资料到指标/公共日志。
