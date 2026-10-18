# 2026-10-19 当前场次查询阻塞与登录态读取超时

状态：查询修正与诊断回归通过；正式 WSS 恢复待验收。基线 714279e。

## 证据与边界

10 月 17 日正式进程加载 010364b，开播检测曾确认 LIVE，连接在动态参数刷新读取登录态时报告 AUTH_STATE_UNAVAILABLE，connectionAttempts/RAW/events 为 0。独立读取凭据和 HTTP 参数发现成功，不能据此认定登录失效，也不能把 HTTP 成功当 WSS 成功。助手跟踪显示失败调用曾停在输入读取，改为完整 JSON 帧后仍停在解密后输出阶段；仅改变输入读取并未恢复正式连接。

本轮只读 EXPLAIN 与计时核查本机历史库。首页 /events?scope=current 只补 roomId/sessionId，遗漏已知 namespace（mode 也可能为空）。原 SQL 只能按 mode 搜索 event_domain，需逐条解析 JSON，并临时排序。无匹配房间/场次的查询首次约 7530ms，随后约 1620/1641ms；加入完整作用域后使用现有 event_scope 全部前缀，约 0.709/0.062/0.059ms。数据库为约 3.3GB 的既有库，查询只读，无索引/模式或业务记录修改。测量针对无匹配范围，不冒充正式服务的端到端延迟。

隔离复现实验使用真实 DPAPI、合成大登录态与只读历史查询，不使用真实 Cookie，也不连接平台 WSS。8 次旧查询连续阻塞约 13136ms，读取失败 AUTH_DPAPI_TIMEOUT；完整作用域下 8 次查询合计不足 1ms，读取约 617ms 成功。小合成登录态的对照曾虽阻塞 13 秒仍成功，说明管道数据量/调度也会影响结果，不能简单说任何慢查询必然超时。此实验复现了“主线程被同步查询占用 → 管道不能及时收发 → 读取超时”路径，与旧进程长事件循环延迟、第四次大凭据刷新失败吻合；正式实例尚未加载新版，不能认定原故障唯一原因已经排尽。

## 最小修改

- Gateway 当前场次查询从权威 scope 同时取 mode、namespace、roomId、sessionId，使用现有索引；普通历史查询保持原过滤和游标规则。不修改 Store/EventStore、RAW、Parser、SessionManager 或 WSS 流程。
- DPAPI 辅助输入按有上限的完整 JSON 对象读取，避免等待父进程关闭输入；加密用途与 CurrentUser、凭据文件格式不变。
- LoginVault 和运行诊断记录读取阶段、耗时及有限错误码。外部辅助记录限本项目私有数据目录、两文件各 64KiB；宿主仍使用原有滚动诊断。只写标量，不写凭据、异常原文、用户标识、URL、业务消息；诊断写入失败不影响凭据结果。

## 验证

新 Gateway 查询回归先失败（mode/namespace 缺失）后通过，含空场次和冲突查询参数；权威当前作用域优先。DPAPI 完整帧测试此前先失败后通过，包含输入句柄保持打开。执行：

```
node --test --test-concurrency=1 tests/current-event-query.test.js tests/auth-vault-diagnostics.test.js tests/run-diagnostics.test.js tests/session-scope.test.js tests/room-handoff.test.js tests/accounts.test.js tests/instance.test.js
```

使用已有独立 CaptureHost 构建，23/23、退出 0、约 33 秒。覆盖真实 Windows DPAPI 的合成凭据、损坏密文不变、回调失败隔离、诊断滚动/脱敏、账号清除不影响回环 WSS、房间/场次/游标隔离与数据目录租约。账号浏览器用合成官方 self 响应；不是实际抖音扫码或官方认证验收。公开扫描 295 文件无发现，diff 检查通过。私有 .local/auth-read-investigation-20261017 保留前序尝试与 lag-check.json，不上传。

## 运行交接

本轮检查 18783 未监听。旧 PID3260 当前是另一启动时间的 svchost，不能误认旧 Node。旧诊断最后记录为 2026-10-17T15:23:47.450Z（北京时间23:23:47），STOPPED、RAW/events/parseFailures 为 0；Windows LastBootUpTime 为 23:24:19。没有找到本轮所查启动 stderr 中的异常记录，不能宣称 Node 崩溃或推断重启原因。

没有启动/重启/停止18783或55976，没有修改代理/证书/DNS/伴侣，没有关闭用户浏览器。账号、SQLite、RAW和历史保留。尚待用户安排加载新版后，确认正式登录态读取、官方 WSS、RAW/事件增长和无可见浏览器采集；本轮无新增真实平台和长期运行验收。用户原36行STATUS、6行迁移及三份调查不提交。
