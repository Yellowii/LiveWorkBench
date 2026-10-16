# 剩余插件展示增量（2026-10-16）

owner：本会话；交接：用户。基线229966e，复用现有codex/stability-data-stage工作区。用户确认“继续实现剩余插件”；没有加载/重启正式18783。范围仅第一方MessageView、舞台、详情、固定本机图片入口和验证工具，不改采集与持久化核心。

## 核实的规则与适配

| 来源（cdn-chunks-20261008） | 静态证据 | 本轮实现及边界 |
| --- | --- | --- |
| ShortTouchPlugin.e0f9c39f.js，约10890、14308 | message_type=1按area.type替换或插入，2按type移除；short_touch_info含尺寸/accessible_name/PC容器地址 | 同类型更新、移除活动组件；展示可信img_url或纯文本，24—120px有界适配。缺少类型不猜身份。Lynx/WebView、JSB、container_payload不执行；这部分互动未还原 |
| RedPacketShortTouchPlugin.f3e74f45.js，约23084、24580、29618 | box_status=1过滤；发送时间毫秒，等待/展示秒；End按box_id更新；TempStatus只有刷新通知；通知图模块958467，Ready图465197，Empty图外部引用 | 通知、结束、发送者、说明片段、数量及礼物ID进入详情；同box结束更新原卡，刷新不生成假卡。没有平台校准，故不倒计时、不显示“可领取”、不调用rush接口；原内部State枚举不等于box_status |
| Redpacket.bf8a34ff.js，模块819094/436507 | 内部红包状态、描述text/image/gift_id/number映射 | 补充可读片段和资源，状态语义不推测用户资格、金额单位、中奖或领取事实 |
| AdminPrivilegePlugin.3e987bfa.js；2722.7dc4edab.js模块580568 | op=1/2；Member action=5/6；部分权限符号；插件返回null，无独立视觉DOM | 8秒工作台管理员提示、已确认符号/独立中文解释；不写观看账号权限，不对任意Member声称“您被任命”。提示样式为第一方，不称原版卡片 |
| GiftMenuPlugin.277c15b4.js及99b3f6cb.css | 礼物目录依赖store，图标28px/名称12px/说明10px | 选中礼物展示本条真实名称、ID、数量和连击状态的资料卡；不是送礼菜单。完整目录、分类、价格和发送功能未移植 |

来源25项哈希在message-plugin-sources.json。新增公共块只通过analysis.json模块索引定位并读取指定模块，没有扫描无关文件、修改快照或执行官方JS。

## 状态、资源与安全

- 共用MessageView与原有JSON/Proto/中文映射/RAW详情，原生事实不修改。映射版本message-view-20261016-activities；roomId加入展示键，与mode/namespace/capture共同隔离活动更新。相同红包的结束通知保留前一条图像/发送者用于展示，点击仍指向结束事件，详情不会伪造原始结束字段。
- 舞台最多红包1、活动2、管理员1；聊天6、礼物2、福袋1仍保留。队列100、去重1000、状态记忆1000。活动/红包30秒是本地展示TTL，不代表平台活动过期；8秒管理员提示同理。移除即时清理活动/排队项；有限状态记忆拒绝迟到的旧更新和已结束红包复活。暂停/隐藏只作用展示时钟，切模式清空展示域。
- 本机通知PNG只从哈希核验后的模块958467提取至忽略目录.local/message-assets。固定认证图片入口增加redpacket-notice；不接受路径或任意资源名称。准备命令：`node tools/setup-message-assets.mjs --source <授权快照根目录>`。未准备或旧服务无此路由时报告资源失败，不把占位文字冒充原图。
- Empty状态引用的两份文件未下载：media/ttlive_red_packet_sti_empty_hide.26730d2fcc8e67d7.png、media/ttlive_red_packet_sti_empty_more.de9800ae1b8e692a.png。runtime-index已给public_path，但本轮不联网下载。结束态暂淡化通知图并标“已结束”，不能称原版Empty图已还原。Ready动画/实时校准、80×96大卡及领取接口仍未实现。
- 通用活动容器内容取决于未运行的Lynx/JSB远端资源，静态img_url不保证存在。缺失图片显示可读名称；没有名称则明确提示。原地址和payload只可在受认证原生JSON详情读取，不执行/自动跳转。
- 原生JSON、独立中文说明和增强映射明确分开；增强JSON默认折叠。用户文本使用textContent；图片经过既有域/凭据参数检查；未改变公共WS、日志、导出内容策略。

## 验证证据

- 新增tests/stage-activities.test.js先失败后实现；覆盖更新/移除、排队移除、终止记忆、ID缺失、房间/Replay/capture隔离、管理员提示期限和有界状态。
- `node tools/verify-stage-activities.mjs`：8条合成官方编码输入经RAW→Parser→EventStore→GUI，8事件、解析失败0、页面错误0；实际点击红包/活动/管理员/礼物，查看JSON字段号/中文单位、Proto、RAW；暂停、切导航、XSS纯文本和480/700/1024/1440卡片边界/不重叠/可点击通过。私有artifacts/stage-activities/report.json。
- 原CSS仅加载到隔离参照页、DOM按源码独立重建。红包容器36×36、图48×48、头像14+边框、状态条36×12，共8项宽高比较一致。截图original-css-reference.png与implementation-stage.png。不是抖音运行截图；活动内部合成图和管理员第一方样式不作为官方视觉还原证据。
- 原三组件`verify-message-stage.mjs`再次通过；`verify-messages.mjs`1171 RAW/1171事件通过，保留历史分页、Replay隔离、统一详情、XSS、布局和旧服务兼容。真实历史只读抽样63条全部映射成功；未找到管理员权限、红包和ShortTouch真实样本，新增三类不标真实平台验收通过。

不包含新平台采集、扫码、长期压力测试或正式服务更新。六小时测试之前的未通过结论不变。完整八插件还原仍未完成，以上未还原功能是明确边界，不用合成图或静态规则替代真实平台证据。
