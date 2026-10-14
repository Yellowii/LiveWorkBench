# 单观看账号收敛：控件与处理入口

任务 SINGLE-VIEWER-20261014，owner 本会话→用户；基线 aedb61d8af85d7db6c57ef3ba05f77835482e1dc，codex/single-viewer 隔离工作树。按用户明确规格执行，不派工、不重启长期服务、不开展整体架构重构。

| 基线操作/处理函数 | 当前可达入口/处理 | 变化依据 |
|---|---|---|
| accountSelect/name/remember、selectedAccount/editAccount/accountOptions | 单观看账号摘要、身份、accountLogin→viewerAction(login) | 不再要求建名、记住开关或切换多个账号 |
| profileAuth / Profile.authProfileId | 所有房间经 LoginManager.credentialsFor 读取同一槽位 | 观看身份与房间独立 |
| accountClear→旧 clear（保留空记录） | accountClear→logout，明确确认 | 同时清文件、会话、有效性、别名记录；不停止采集 |
| 旧 authPanel 的 optIn/login/save/clear | 日常重复入口移除；临时窗口 check/close、网络与诊断保留于 accountAdvanced | 自动保存；旧清除写接口引导新入口 |
| targetType + targetInput | targetInput，auto URL/分享文本/显式前缀；profileResolve/check 保留 | 不猜无前缀数字类型 |
| profileSave/update/create | 原保存入口，目标资料 details，活动目标确认 stop→update→listen | 不重写业务调度 |
| profileStart/Stop | 工作台原唯一日常监听控制，跨目标确认 stop→listen | 不并发启动两个实时来源 |
| 新迁移与清理 | viewerMigration/select/adopt；viewerCleanup/checkbox/delete | 只登记旧引用，未选凭据保留；清理明确确认 |
| RAW/Proto/历史/Replay/Golden/Hook/日志/网络/资源 | 原数据记录与开发诊断 ID/处理函数保留 | 采集主线和诊断不扩展重构 |

实现边界：ViewerAccount 只适配现有账号记录/序列队列/DPAPI；新增 KV 选择状态，不改 SQLite schema。SourceController/MonitorCoordinator/BrowserSource/RAW/Parser/EventStore/Session 无变更。正常登录浏览器不加资源优化，原采集浏览器策略保留。官方身份/房间资料为受认证本机 REST 固定白名单；identity 不能进入通用 WS/日志/导出投影。

验证依次包括新登录生命周期失败用例→实现、DPAPI/重启/迁移与别名保护、实际 Playwright 操作（合成官方证据）、回环 WS 单来源/退出不断流/RAW、旧后端能力提示，以及既有数据/Replay/Golden/历史/诊断路径。真实抖音扫码和真实动态 WSS 签名不由合成证据替代，实际结果见 STATUS 第24节。
