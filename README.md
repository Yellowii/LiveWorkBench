# LiveWorkbench

Windows 本地直播工作台。默认 LiveHookSource，WebSource 由人工选择；同一时刻一个直播间、一个活动实时来源。局域网多设备前端通过受控 API Gateway 访问本地后端，不建立云端监控系统。

**当前状态（2026-10-12）：已交付首个可运行核心与简易开发 GUI。C# HTTP 捕获/传输解包/解压 → RAW 落盘 ACK → 官方 Parser → 去重事件库 → API/WS → GUI 已通过受控本地测试。真实伴侣接入与恢复仍需环境授权及实测，不能把此测试视为生产直播验收。**

## 运行与验证

需要 Node 24.15+、Windows .NET Framework 4.8 运行时和 .NET Framework 4.6.2 构建工具。采集构建复用本机既有 NuGet 缓存；路径参数见 `tools/build-capture.ps1`。依赖不会安装到 references。

```powershell
npm ci
npm run setup:parser -- --fetch
npm run setup:websource -- --fetch
npm run build:capture
npm test
npm start
```

打开 <http://127.0.0.1:18780>。提供持久化消息分页、官方结果脱敏投影/独立增强/RAW 引用、日志与基础指标、隔离回放的播放/暂停/单步/跳转，以及伴侣进程/启动顺序/退出重启提示。可人工选择 LiveHookSource/WebSource，再独立启动；切换停止旧来源并保留场次，不自动故障切换。真实连接、完整 daemon 恢复、通知与业务消费者仍待相应验证。

本轮持续开发实例为 <http://127.0.0.1:18782>，使用独立 `data/continuous-20261012`。旧18780/18781实例保留。可用 LW_PORT/LW_DATA_DIR 配置独立实例，避免覆盖已有进程。

已授权历史样本路径仅登记在忽略的 `.local/settings.json`：`{"r01Root":"用户已授权的单个 R01 目录"}`。界面可运行 59 Golden 或载入完整 R01，原数据只读且不复制；历史 payload 不冒充新采集的完整 HTTP/WSS RAW。浏览器验收命令为 `node tools/verify-workbench.mjs`，需要本机 Edge；结果在忽略的 `artifacts/`。

采集默认停止。真实 TLS 捕获还需要本地配置已授权的 `certificatePath`、可选 `certificatePassword`、`capturePort`（默认 18827）及人工客户端路由/伴侣重启。本项目不自动改变系统代理、信任证书、关闭伴侣或修改安装文件；密码不得放入公开文档或提交。第三方来源与许可见 [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md)。

2026-10-13已补实际C#回环HTTPS/分片WSS的文件CA测试、环境前后核对与不写安装文件的私有备份；[分阶段记录与复查命令](docs/reviews/2026-10-13-livehook-stage1.md)。真实伴侣接入/恢复仍待单独授权。默认exe被只读观察进程占用时可用 build:capture 的 -OutputDirectory 构建到本项目独立目录，并用 LW_CAPTURE_EXE 选择该构建，不必停止旧工作台。

## 权威入口

WebSource 的 WSS URL/Cookie/User-Agent 只登记在 `.local/settings.json` 的 `webSource` 对象；可选 `roomId` 是平台实际 roomId，不能拿网页短房号代替。配置不经公共 API 传入或返回。默认目标仅接受 douyin.com 下标准443端口WSS，回连/心跳/ACK复用固定上游实现，RAW提交前不会解码或ACK。入站二进制WebSocket消息为采集范围；队列上限触发显式缺口诊断，不能宣称保存了TCP/所有控制帧。

公开仓库不包含真实 RAW、R01 Golden 定位清单、历史证据及运行数据；原本地文件保留。官方解析器与协议资源因再分发授权未确认，也不进入 Git；准备命令从固定上游版本下载六个文件并验证哈希。已有本地参考源码时可使用 `npm run setup:parser -- --source <protobuf-live 目录>`。真实样本回归需要在受控本机单独登记样本及本地 Golden 清单，公开自动化测试仅使用合成输入。

| 文件 | 唯一职责 |
|---|---|
| [AGENTS.md](AGENTS.md) | AI 开发、读写边界、多对话协作与交接规则 |
| [核心功能开发文档](docs/architecture/CORE_DEVELOPMENT.md) | Mermaid 人看版及开发者架构规格；承接原对话文档 |
| [内部数据契约](docs/contracts/CORE_CONTRACTS.md) | RAW、事件、场次、就绪与内部端口 |
| [公共 API](docs/contracts/PUBLIC_API.md) | REST、WebSocket、权限、错误、分页、续传、日志和指标 |
| [源码审计与迁移](docs/migration/SOURCE_MIGRATION.md) | SOURCE_INVENTORY、EXTRACTION_PLAN、COMPATIBILITY 集中维护 |
| [真实进度与交接](docs/progress/STATUS.md) | 里程碑、模块状态、验证证据与任务交接 |
| [决策记录](docs/decisions/DECISION_LOG.md) | 已定选择与待决策项，引用权威正文 |

这里的接口、目录和里程碑描述目标规范，不等于功能已可调用。没有第二份核心架构正文；原对话输出位置仅指向迁入后的权威文件。

## 实际项目结构

```text
LiveWorkBench/
├── .gitignore
├── AGENTS.md
├── README.md
├── package.json、package-lock.json
├── src/                          # 正式核心源码
│   ├── capture/、capture-bridge.js # 提取 C# 捕获 + RAW ACK IPC
│   ├── parser/                    # 官方 Parser，保留来源
│   ├── runtime.js、storage.js、session-manager.js
│   └── server.js、historical-source.js
├── public/                       # 非正式开发 GUI，仅经 Gateway
├── tests/、tools/                # 自动回归、构建、浏览器验证
├── docs/
│   ├── architecture/CORE_DEVELOPMENT.md
│   ├── contracts/CORE_CONTRACTS.md、PUBLIC_API.md
│   ├── migration/SOURCE_MIGRATION.md
│   ├── progress/STATUS.md
│   └── decisions/DECISION_LOG.md
└── references/                    # 本地只读，不纳入主 Git
    ├── DouyinBarrageGrab/
    ├── douyin-live-monitor/
    ├── douyinprotobuf/
    └── api-docs/Bark/、ntfy/
```

## 开发顺序

提取已有能力 → 解耦 → 重组 → 扩展 → 交付可运行核心；每阶段同时交付可执行验证和实际结果。

主要采集基础为 DouyinBarrageGrab，保留成熟 C#，结合 douyinprotobuf 官方解析实现。只做必要冒烟，明确失败再排查，不以完整原版验收作为所有开发的前置门槛。正式业务 GUI 后续建设。

下一段工程接入为真实 LiveHook 客户端路由与启动/重启观察，在用户授权环境后验证完整 HTTP/WSS；继续按契约补 daemon、人工 Source 切换及消费者，R01 只作为回归输入，不重复审计。现有场次、RAW 优先及回放隔离规则保持。

references 中源码和官方 API 文档已经存在，但本地存在、静态代码路径、实际运行通过是不同状态。详细证据与下一步见迁移和进度文档。
