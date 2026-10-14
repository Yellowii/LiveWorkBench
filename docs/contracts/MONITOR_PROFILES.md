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

BrowserSource复用固定上游BrowserLive/AccountMonitor/createLoginContext，独立临时Chromium会话，只捕获匹配本次room_id的Douyin WebCast WSS，不主动建第二条上游连接。blockMedia仅表示后台已识别直播流优化；false关闭该优化。图片、字体、普通媒体、脚本、遥测及普通XHR/Fetch不做采集资源过滤。固定官方投递服务的FLV/HLS请求，以及成功官方room响应stream_url声明的精确拉流URL可拦截；HLS/DASH仅关联已声明manifest的同目录ts/m4s分片，不因任意媒体类型、扩展名或live/video关键词误判。未知媒体允许通过并计数；普通媒体HTTP失败不等于账号失败/来源失败。

网络请求拦截发生在已识别直播流下载前，播放保护只作用于匹配的直播元素；普通HTMLMediaElement.play仍调用原生行为。单纯pause不作为省带宽证据。诊断提供resourceRequests、blockedMediaRequests、unclassifiedMediaResponses、knownStreamTargets、mediaPolicyGaps；未识别的流、缓存/MSE/blob来源及规则生效前已到达的数据不承诺被完全阻断。参数/流URL仅在当前浏览器策略内存中，不进入日志/接口/Git。登录窗口完全不装此优化。rawBeforeAck=false与official-sdk-uncontrolled边界保留；官方SDK负责签名/心跳/ACK/恢复，业务RAW/Proto/Session不改。

RAW边界为browser-websocket-network-event、connectionMode=browser、ackBoundary=official-sdk-uncontrolled、状态rawBeforeAck=false；只是浏览器网络事件可观察字节，无TCP/TLS或所有控制/FIN承诺。提交后才使用本项目解包Parser；SDK ACK可能早于提交。超大/队列拒绝留hash/大小缺口。来源仍WebSource。业务未知/重复/失败保留。

LoginVault位于私有data/auth，仅当前用户Windows DPAPI密文。仅persistLogin=true且明确authSave、官方账号确认AUTHENTICATED后保存过滤的Douyin状态；普通启用/自动连接不保存。authRef为内部引用；默认profileId分隔凭据。状态文件存在不能证明登录有效，独立UNKNOWN；有效性来自官方self API，界面不返回账号资料/密文/明文。关闭删除临时浏览器上下文；清除保存状态也停止对应本项目会话。未操作日常浏览器。

Profile actions新增authCheck/authSave/authClear/login。保存/清除/可见登录窗口要求expectedVersion。login是用户明确命令，要求人工选中WebSource及空闲资源；不自动切源。它可以在尚未确定roomId时只提供账号登录页面，拒绝该未知房间弹幕接入。自动监听始终headless，只有此命令可见。只有构建与合成验收，真实平台SDK/鉴权/恢复仍待。

## LiveHook配置协同增量 D

HookTargetMatcher使用已提交RAW的成功伴侣HTTP room/create owner作为主播身份证据；聊天user是观众，不能当主播。证据在私有库持久化并链接RAW；同room换owner标冲突，拒绝猜测。根据typed目标或经确认的web_rid映射匹配enabled LiveHook配置；未匹配时RAW/业务payload/解析尝试保留，但不建立或选中业务场次。HTTP创建只留房间/平台状态，pushState UNKNOWN。已有未结束同room身份依据可用于重启关联，新的流仍要重新观察。

仅本次录制/来源epoch、实际匹配伴侣WSS解码数据、当前代理与伴侣观察均就绪时Daemon标HOOK_READY；端口绑定/进程启动/HTTP创建单独不够。进程退出、重启、观察失败撤销HookReady，不能结束场次。SourceController.startProfile的Hook分支仅接管现有匹配流，不启动代理、不建WebClient、不改环境；调度允许此类既有资源接管。GET /hook/status新增profileMatch，WS hook.match.updated仅语义改变时推送。

已有明确HTTP/Control结束仍由SessionManager裁决。可信monitor的已确认ENDED、成功查询、douyin-structured-room来源并与调度拥有的已存在live场次身份/room一致时，Runtime.observePlatformEvidence正式命令记录独立platform-ended证据并结束同一场次；不新建场次，不补推流状态，不伪造官方解析结果/RAW引用。此项追加生命周期输入，事件producer=MonitorCoordinator、origin=monitor、rawRefs=[]、payload.official=null、独立extensions.platformEvidence。重复幂等。普通停止/断线/UNKNOWN仍不下播。此前B采集停止规则保持，新增可信END的场次证据处理。

阶段E2：Browser v4收到并持久化二进制网络事件后才报告CONNECTED；仅创建WebSocket不清除有效流等待计时。鉴权/访问/429/验证需求进入需人工操作状态并终止该状态自动重试；浏览器退出与WSS90秒无恢复是有界恢复原因。GET /sources/browser与metrics/modules.browser返回接收/连接/中断/队列/媒体阻断与自有浏览器进程工作集之和，无法读取明确unavailable/null。SDK心跳/控制帧细节未可观察，不以0冒充测量。RAW增加profileId/operationId/monitorOperationId/monitorStateVersion，最终事件通过独立extensions.processingContext关联；不保存URL、Cookie或账号资料到指标/公共日志。


## 单观看账号兼容收敛（2026-10-14）

用户当前需求覆盖旧逐配置凭据规则：Gateway ProfileStore 新建/编辑时 authProfileId=null、persistLogin=false，既有字段保留但不参与登录选择。观看槽位由 LoginManager 统一读取，不批量改房间版本/监控状态。统一 target auto 支持分享文本与明确 ID 前缀，无法确定类型仍 PENDING_TYPE。actions.details 仅安全查询与展示严格匹配的结构证据，未知资料返回 null；账号与资料的 REST 展示白名单见 ACCOUNTS v2。旧 authCheck 只读兼容查询观看槽位，authSave/authClear/login 写命令引导统一入口，避免旧清除路径停止浏览器采集。Coordinator、SourceController、人工单来源、确认与抑制规则没有改动。


### 当前页面 Pace Flight 兼容（2026-10-14）

真实目标页面只读观察到 self.__pace_f.push 的字符串 Flight 承载 roomStore.roomInfo；现有读取仅支持 __next_f，因而网络200也返回 MONITOR_EVIDENCE_UNAVAILABLE。documents 现明确支持已观察的 __next_f/__pace_f 两种名称，仍只 JSON.parse 字符串字面量及独立 JSON 行，不执行脚本，不泛化任意 stream global。目标匹配、roomId/anchorUid、冲突 UNKNOWN、连续确认与连接控制规则保持。真实页面修复前 UNKNOWN、修复后 LIVE 的只读证据不等于已连接 WSS 或完成真实 RAW 采集；直连参数 provider 仍未实施，browserFallback 必须用户明确配置。


### 单房间正常浏览器窗口（2026-10-14）

明确配置 browserHeadless=false 时，既有浏览器兜底传递 headless=false，使用正常 Chromium 窗口；默认 true，未修改房间仍为原后台模式。仅增加窗口选择布尔值，仍需原 browserFallback/connectionMode 允许，不改变来源选择、身份验证、单活动来源、RAW先保存、音视频限制或系统代理。用户授权本次直接操作，真实平台复核无头窗口弹幕初始化HTTP200空体、正常窗口返回Protobuf并建立匹配路径的WSS；这只解释该房间实际行为，不笼统认定验证码或无头模式普遍不可用。
