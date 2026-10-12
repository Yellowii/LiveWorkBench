# 配置与监控接口 v1

2026-10-13用户要求的增量接口，追加到PUBLIC_API 0.1；既有采集/RAW/Parser/Session/Replay契约不变。最新指令允许独立监控多配置，包括LiveHook配置；替代早期C06仅Web监控的限制，但不允许另建LiveHook网页弹幕连接。

ProfileStore仅通过repository.getState/setState持久化普通配置。目标输入为typed string：auto/url/anchorUid/secUid/web_rid/roomId，数字auto返回PENDING_TYPE，不推断身份。profileId/版本十进制字符串；启用与自动监听默认false。最多100配置，周期至少10秒，超时最多30秒。凭据仅不透明authRef，禁止凭据内容进入Profile。

TargetResolver.classify/resolve分开；只允许固定Douyin HTTPS域、公共DNS且连接固定DNS结果、4次跳转、整体超时与2MiB主体。不请求媒体，不执行页面脚本。UID/实际roomId无可靠网页映射返回TARGET_MAPPING_REQUIRED；不将其当作web_rid。页面只认与目标匹配的结构化room/status/owner证据；推荐位/单个流URL不推断开播。当前确认status=2在播、status=4结束，其余UNKNOWN；语义待真实目标核验。

LiveMonitor.probe输入Profile，输出state/evidence；监控连接不采集弹幕。连续confirmations次相同状态/房间/身份才发MonitorEvent。UNKNOWN/HTTP错误重置候选、保留已确认状态及最后成功时间，并指数退避；不能触发停止。持久化确认版本/最后转换时间，重启同场不重复转换。pushState始终UNKNOWN。MonitorEvent含profileId/profileVersion/stateVersion/operationId/anchorUid/roomId/来源时间；不直接调用SessionManager或创建业务场次。

受认证本机API：GET /profiles与/monitor；POST /profiles {profile,commandId}；POST /profiles/{profileId}/actions {action:update/delete/check/resolve,expectedVersion,patch,commandId}。update/delete要求版本；输入仅写，编辑留空保留；返回目标类型/是否已登记与脱敏解析结果，不返回value/URL/authRef。WS monitor.updated输出同一脱敏投影。API禁止输入任意私有路径；LAN仍不可用。

普通配置保存不会切源或开始采集；自动调度与浏览器后续增量单独记录。真实身份解析/平台状态与生产长期监控尚待实机验收。
