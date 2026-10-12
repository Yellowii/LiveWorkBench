# LiveHook 分阶段联调：第一阶段

按2026-10-13用户授权执行只读预检、私有备份、独立回环代理与本地 TLS 测试。真实伴侣安装文件、Windows 系统代理、证书信任和旧服务均未改变；没有关闭或重启伴侣。下一阶段须分别授权 CA 信任和安装入口参数替换。

实际入口为 CaptureHost → TitaniumProxy，StartupObject 不调用旧 Program、AppRuntime.Init、SwitchSetup 或系统代理注册/关闭方法。保留所需显式代理与证书机制，ProxyServer 三个自动信任选项为 false；Start(false)，ForwardToUpstreamGateway=false，仅 IPAddress.Loopback。旧环境操作方法仍是提取源码的一部分，不能因存在就宣称已调用或移除整个 Hook 能力。

新增可运行验证：`tools/create-livehook-test-certificates.py` 只创建文件 CA/加密私钥与合成回环服务证书，目录 ACL 仅当前用户和 SYSTEM。RSA PFX 在内存解析并使用不持久化的 CSP 签名器；Titanium 临时叶证书启用 EphemeralKeySet，不存假证书。当前证书输入范围是单个 RSA CA 的兼容 PFX，不宣称任意 EC/多密钥/现代 PFX 均已验证。EphemeralKeySet 的内存语义见 [Microsoft 文档](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.x509certificates.x509keystorageflags?view=netframework-4.8.1)。

真实发现并修复：Titanium 3.2.2-beta 所需 BouncyCastle.Cryptography 2.0.0 未进入程序集引用；明文测试未触发此依赖。增加独立 alias 引用后，避免与原 BouncyCastle.Crypto 1.8.8 混淆；修复默认 PFX 私钥类型与签名器的不兼容。networkSmoke 能显式加载测试证书；上游合成证书精确匹配只在 test/smoke 可用，正式来源/API 不提供该绕过入口。客户端始终 rejectUnauthorized=true，错误/缺失 CA 拒绝连接。

`tools/livehook-tls-probe.mjs` 启动实际 C# 代理和自有 HTTPS/WSS 服务，经 CONNECT/TLS 验证 HTTPS Protobuf 与 gzip PushFrame/分片 WSS。保留代理 HTTP 主体和重组 WS 消息，不把它们称作 TCP/加密线上原包。RAW 内容哈希/逐字节匹配、C# 解包、官方 Parser、同一测试 Session、无 live 事件均检查；HookReady=false。测试停止其自有代理和服务，拒绝复用已有 probe-data 目录。

环境快照入口 `tools/livehook-environment-snapshot.ps1`：读取指定安装文件/版本/ACL、伴侣进程、8827/8888/18827监听、当前用户与本机 Root/My 公钥指纹、WinINET/Connections/WinHTTP；完整值只写本项目忽略的私有目录。Verify 逐项比较，遇到变化只报告，不自动“恢复”他人的环境。曾发现字典序列化顺序造成的假差异，按键排序比较后重新验证一致，未因此改系统设置。

只读文件预览与私有原字节备份由 `prepareHookBackup` 完成，和授权后的 apply 分开。合成测试另发现 rename 不能保留目标 ACL，Windows 替换改用 File.Replace(ignoreMetadataErrors=false)，应用/恢复均验证原 ACL；其属性/ACL 合并说明见 [Microsoft 文档](https://learn.microsoft.com/en-us/dotnet/api/system.io.file.replace?view=netframework-4.8.1)。真实安装入口没有调用 apply/restore；已有用户编辑时哈希保护拒绝覆盖。

复查命令（每次使用新的私有目录；真实安装文件只读）：

```powershell
npm run build:capture -- -OutputDirectory C:/project/LiveWorkBench/.local/livehook-stage-build
$env:LW_CAPTURE_EXE='C:/project/LiveWorkBench/.local/livehook-stage-build/LiveWorkbench.CaptureHost.exe'
npm test
pwsh -NoProfile -File tools/livehook-environment-snapshot.ps1 -RunDirectory C:/project/LiveWorkBench/.local/livehook/new-run
python tools/create-livehook-test-certificates.py C:/project/LiveWorkBench/.local/livehook/new-run/certificates
node tools/livehook-tls-probe.mjs C:/project/LiveWorkBench/.local/livehook/new-run 18827
pwsh -NoProfile -File tools/livehook-environment-snapshot.ps1 -RunDirectory C:/project/LiveWorkBench/.local/livehook/new-run -Verify
```

环境工具与 TLS 用例需 PowerShell 7、Python 3.12/cryptography 46；可用 LW_PYTHON 指定 Python。构建备用输出解决旧只读 observer 占用默认 exe 的失败，不关闭18780/18781/18782或旧服务。LW_CAPTURE_EXE 只选进程路径，不写工作台配置。

本机证据：`.local/livehook/stage1-20261013-b` 的环境前/后报告、CA/备份/权限、TLS 结果与私有 REPORT.md。证书指纹、私钥路径、真实目标完整路径/哈希、唯一参数差异、影响、未来信任/撤销及文件恢复命令在该私有清单，不进入 Git。中间诊断证书未加入信任，也不作为下一阶段目标。

最终这一阶段确认伴侣13.0.5、11个进程；旧8827/8888仍由PID18644监听。18827只由自有测试子进程短暂绑定127.0.0.1，完成后关闭。Root/My 共四库、WinINET/Connections/WinHTTP、安装内容及ACL、伴侣进程/旧监听归属比较通过；伴侣→旧8827连接前后均10条，这是已有路由仍存在的证据，不能证明旧服务业务解析或完整直播捕获正确。

未执行：真实伴侣 HTTP/WSS、真实开闭播、长时间采集/伴侣重启恢复、CA信任导入/移除和安装入口应用/恢复。当前未导入本次信任，无需移除任何证书。未来实际信任与文件恢复只处理本次授权新增对象，匹配指纹/哈希，发生更新器或人工编辑则停止恢复并报告；不覆盖其他变化。P0-A/P0 不标完成。
