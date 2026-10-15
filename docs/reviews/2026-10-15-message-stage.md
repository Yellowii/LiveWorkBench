# 三类消息舞台静态依据与验收边界（2026-10-15）

## 第二轮校正：依赖追踪与真实 CSS 对照

本节取代首版“通用特权”“Worker缺失/枚举未确认”和自写参照的结论。通过已有 analysis.json 的 module_ids 定点定位 `426.e4be7020.js` 和 `live-canvas-danmaku.88b4e7e3.js`，完整SHA进入来源清单。模块217785（偏移32950）明确 Admin=0/Base=1/Advanced=2/Supreme=3；模块508899（35446）提供礼物/托盘转换。文件原本已下载，首版未完成依赖追踪，不能称为资源不存在。始终只读，未执行原JS。

- 富文本按pieces顺序保留文字、用户片段与图片；Canvas、列表及详情共用runs。普通Canvas不强加昵称，ScreenChat独立“管理”前缀，Emoji图40px。Base青色胶囊、Advanced浅金到青色、Supreme三行金色重复结构依据Canvas选项重新实现；未知style不套用等级。三行占三轨、表情占两轨，保留15秒移动；未移植Worker优先级抢占、本人消息保护或播放器遮罩。
- 礼物使用tray_display_text、gift.image（缺省再用icon）、tray_base_img和55px tray_dynamic_img。repeat_count优先、combo_count回退，保留十进制字符串；只更新同用户/礼物/组/采集域/文案的递增数量。RoomMessageConsume明确过滤repeat_end：结束记录仍留在列表详情，不生成或续期托盘。重复/倒退计数不延长2500ms寿命。礼物类型、banned位掩码、冠名等依赖模块120740不在现有索引中，不猜常量，不声称完整分流/特效已复刻。
- 福袋常规入口恢复36px小图位与48px图片，不把摘要塞入自创宽卡；draw_time-current_time生成**事件时点**mm:ss，缺有效时间显示原状态，不虚构当前倒计时。专属活动文字来自接口，不凭奖品名代替配置。恢复700ms缩放；位置仍为工作台布局，未证明原播放器父容器定位。
- 托盘300ms左入、两行布局；暂停时稳定入场位置，修复真实GUI发现的“暂停后卡片停在左边界外、被侧栏拦截点击”。400px最小舞台高度分开窄屏六轨与底部托盘。展示异常不进入采集链。

`tools/message-style-reference.mjs` 在隔离页直接加载三份**原本地CSS**，DOM按原组件结构独立重建；生产只用第一方CSS。`artifacts/stage-fidelity-v2/original-css-reference.png` 仍不是官方运行截图。实测12项尺寸/行高/字号/颜色一致；数字字宽原14.8125px/本地13.359375px，字体回退差异保留，不宣称像素一致。Canvas与DOM是不同渲染路径，Canvas另按静态选项/截图核查，DOM测量不能证明Canvas像素还原。

验证：消息/舞台/API/分页21/21；舞台GUI覆盖四种弹幕、行内图、动态图、连击与结束过滤、福袋时间/状态、暂停切页、详情/Proto和1440/1024/700截图；已有消息GUI1171条合成RAW→事件、XSS、历史、Replay通过。真实只读63条、0转换失败、原记录不变；真实舞台GUI每类最多查50条后选Chat/Gift/Lottery进私有副本，头像100px/礼物168px/福袋96px加载并实际点击JSON/Proto。没有真实特权样本，不声称新平台采集或全量业务验收。

尚未对齐：原字体、完整播放器坐标/轨道策略、Supreme完整调度及全部动效细节、本人发送优先级、礼物分类/冠名/特殊连击、福袋官方资格/实时校准/大卡接口及其余插件。状态为“已确认规则进一步对齐，静态与GUI局部验证通过”，完整原版视觉验收未通过。以下保留首版调查记录供追溯。

来源固定为用户只读 `cdn-chunks-20261008`；完整文件SHA在 `docs/migration/message-plugin-sources.json`。下面位置为UTF-8解码后的零基字符串偏移，样式用原类名定位。没有运行任何官方Webpack分块；没有原版网页运行截图，`static-reference.png` 是独立重建的静态参照，不是原版截图。

## 首批三个组件

| 组件 | 可核查依据 | 本次独立实现 | 未验证/未还原 |
|---|---|---|---|
| 普通/特权弹幕 | Canvas JS 1744/1773：20px字体、40px轨道、15秒duration、100条上限；3332：白色Arial400；5584：宽度与duration决定速度。Canvas CSS `.xTOyXrTr` 顶部40px。Danmaku CSS `.z2QtPUSr.Yx33DOc5` 白边/20px圆角/5px 10px内边距 | Canvas 2D按时间移动，普通白字描边，特权使用可确认的通用白边，不猜style等级；表情使用消息图片；点击命中关联详情，同一消息在列表可键盘选择 | 原Worker chunk 7573、公屏遮罩/播放器轨道策略、高等级金色渐变与style枚举绑定未确认；复杂表情目录和高级动画未还原 |
| 礼物托盘 | GiftTray JS 1269：达到target后2500ms结束、comboGap250ms；5537：相同user/gift且combo增加的更新；CSS `.jM0ftSmS/.rUafhWtz` 40px、`.P8WJFHfQ`14px600/24px行高、`.PcBvEQw9`24px斜体700；两行48px+8px间隔；`.RK96cfjC` 300ms缩放1.3 | 40px真实头像/礼物图、80px文本栏、14px昵称、24px数量；明确actor/gift/group/capture/namespace才更新同托盘，不加总；最后更新后2500ms释放；最多2条并排队，数量更新300ms缩放。原背景只从本地CSS提取到私有目录 | 上游store的tray.target/x_礼物分类转换未确认，不能按250ms伪造中间数量；命名礼物、动态55px图、特殊连击特效与兑换/送礼交互不实现 |
| 福袋卡 | Lottery JS 5851类映射、11418内嵌PNG；CSS `.LMUtLyr9`20%黑背景/10px圆角、`.dVxrjT_h`36px、`.KXLj31kc`48px且左偏40%、底部12px状态条；状态映射见前一轮静态报告 | 真实内嵌图标、36px容器/48px图像、状态文字与奖品；相同lotteryId更新，保持消息时点语义。30秒是本地展示TTL，不声称活动结束或当前中奖；点击查看详情 | 原0.7秒弹入、倒计时/大卡/参与资格/中奖确认流程未还原；历史事件不能伪装当前剩余时间 |

调度与资源边界：100条待展示队列、最多6条Canvas弹幕/2个托盘/1个福袋；过载仅略过视觉队列，事件列表/存储不丢弃。1000个已见事件ID与128个图片缓存均有界，最多6个并发图片请求、10秒超时，错误列表最多20条。暂停只冻结展示时钟；导航隐藏暂停绘制并保留状态。资源失败和动画异常不接触采集。列表不再用“聊/礼”等字作为假官方图标；有图时展示图，无图仅显示工作台分类点。

## 其余指定插件核查（本批不扩展组件）

- GiftMenu：JS 1928起是overlay→menu→list→item；CSS `.wTbpFWXg`图28px、名称12px、资料10px、纵向12px间距、300ms左侧淡入。giftStore动态目录/价格/分类不是静态常量；本批只使用实际消息gift.name/icon，不建设送礼菜单。
- AdminPrivilege：原块没有独立DOM/CSS组件，负责权限状态及Member变更监听；列表已有语义标记，完整官方管理UI依赖未提供，不凭该块编造管理员卡片。
- ShortTouch：JS 4078是300×300的portal大卡，外部Lynx/JSB/container依赖；CSS `.fB4hUkQz`纵向结构、`.CBE2hjvG`1秒左入、`.VtyCQk6R`500ms缩小移除，依播放器状态定位。保留原列表/详情，本轮不执行容器代码，也不伪造活动内容。
- RedPacket：CSS `.Y1z3SMAG`36px卡/48px图、14px头像、底部12px倒计时；`.aMdKup4D`1秒摆动3次，80×96大卡依平台状态；JS 29618按状态选择图片，媒体资源与枚举依赖见缺失项。按用户要求首批选福袋，红包仍为可读列表与详情，尚无还原舞台组件。

## 本地资源与缺失项

`node tools/setup-message-assets.mjs --source C:/project/protodict/protobuf-live/output/cdn-chunks-20261008` 只读取已知两文件并核对SHA，提取内嵌PNG到忽略的 `.local/message-assets/`。不下载CDN、不改原目录、不上传原PNG或代码。Gateway只按固定名称通过受认证、同源loopback接口提供PNG；跨站/无会话不可用。

| 资源 | 已确认来源/状态 |
|---|---|
| 福袋小图标 | Lottery JS偏移11418；96×97 PNG，SHA `c2df6568b052754f2e0ed24c51c5c108ef775dba912be4a9351446cd9e8f7d9c`，已私有准备，实际加载96px |
| 礼物托盘背景 | GiftTray CSS偏移79；168×44 PNG，SHA `c46327f75656a7d078e382eb92802b2611760a6ea6f23923f91da6b4dc188acd`，已私有准备 |
| 用户头像/礼物/表情/徽章 | 消息中实际url_list，保留可信图片CDN变换/有效期参数；真实历史样本头像100px、礼物280px均加载成功。未知映射留空并说明，不猜URL |
| 特殊连击WebP | GiftTray JS3788，`https://lf1-webcastcdn-tos.douyinstatic.com/obj/live-android/ttlive_gift_tray_special_effect.webp`，本轮未下载/未加载，效果不声明还原 |
| 福袋大卡 | Lottery JS2380，`media/lottery_big_card.924927b149964142.png`；已明确检查快照media及files/media位置均无该文件；Webpack publicPath尚未绑定，未猜完整URL |
| 红包空状态图片 | RedPacket JS19585/19685，`media/ttlive_red_packet_sti_empty_hide.26730d2fcc8e67d7.png` / `media/ttlive_red_packet_sti_empty_more.de9800ae1b8e692a.png`，仅定位引用，尚未准备/绑定publicPath |
| 字体 | CSS引用PingFang SC、Helvetica Neue、DFPKingGothicGB-Regular；未获得可分发字体资源，使用本机可用字体与Microsoft YaHei/Arial回退，不宣称字形完全一致 |

浏览器跨域img失败无法可靠区分403、过期、断网或解码错误时统一明确 `REQUEST_OR_DECODE_FAILED`，不伪报具体HTTP码；同源私有素材404可确认 `LOCAL_ASSET_NOT_PREPARED`。政策拒绝/超时/缺少映射分别标注；采用固定40px object-fit:contain避免礼物被裁剪。福袋图的偏移/容器裁剪来自核实的CSS规则。

## 可复查验收

- `node --test tests/stage-model.test.js tests/message-view.test.js`：9/9；有界队列、暂停时钟、生命周期、精确连击上下文、福袋更新与原映射回归。
- `node tools/verify-message-stage.mjs`：可操作GUI通过。合成数据经官方编码/RAW/Parser/EventStore进入组件，非直灌DOM；验证图片加载/失败、暂停切页、连击结束、状态更新、点击详情和Proto、1440/1024/700布局。静态参照单独页面允许测试夹具内联CSS，正式工作台CSP未放宽。
- 私有对照图：`artifacts/stage-first-three/static-reference.png`、`implementation-stage.png`、`implementation-1440.png`、`three-components-700.png`、`lottery-completed.png`。人工检查确认三组件尺寸、排版、颜色与图像裁剪；并非像素级官方运行对照。
- 另只读选取本机最新Chat/Gift/Lottery各一条进入隔离历史展示，真实资源均加载；`artifacts/stage-real-history/real-stage.png`。本机没有选到Privilege历史样本，特权只有合成/静态验证。未执行新的平台直播采集或中奖业务。
- GUI发现并回归修复：暂停切页后绘制循环未恢复；空id_str被摘要占位值遮蔽导致连击key缺失。修复不进入原采集模块。

三组件交付后停止扩展，等待用户查看效果；其他插件及高级样式保留上述明确边界。
