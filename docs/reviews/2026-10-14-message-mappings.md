# 指定官方插件到 MessageView 的静态转写

用户授权只读的 cdn-chunks-20261008/files、css；先查 plugin-list.csv、css-list.csv、《模块分析.md》，只读取8个指定插件、3个辅助块和7份对应CSS。AdminPrivilege没有清单中的独立CSS。完整哈希、相对文件名、字符串定位见 message-plugin-sources.json。源码是Webpack分块；没有运行这些文件，没有下载CDN，没有复制第三方代码/图标/内嵌图片到仓库。

可信等级：official-schema 表示当前官方Parser字段结构；static-source 表示下表源码可复查的消费/展示线索；unknown 表示依赖/枚举/语义未确认；真实记录检查只证明该样本形状，不能提升为全平台业务验证。当前Parser为既有douyinprotobuf-e9e6cec-business-v1，字段号由其运行时反射获得，不维护第二套协议。

| 消息/资源 | 消费与真实字段 | 独立转写及边界 |
|---|---|---|
| Chat / ScreenChat / PrivilegeScreenChat | Danmaku监听三类；Canvas X生成器读取payload.content / rtf_content_v2.pieces；string_value、user_value.user.nickname及左右附文、image_value.image.url_list | 保持文字/片段顺序，资源单独列出；未知片段显式占位；管理弹幕标记仅该消息，不把用户永久设为管理员。Privilege.style依赖外部枚举，保留数字不编等级。 |
| EmojiChat | 两个弹幕块读取emoji_content.pieces[0].image_value.image.url_list[0]；表情目录另经emoji_list接口按display_name映射 | 使用消息实际图片；未获得目录时保留[表情名]纯文本，不造表情URL/固定ID库。 |
| Gift | Danmaku/Canvas读取gift.name/describe/icon.url_list、user.nickname，外部x_决定group_count或repeat_count；GiftTray读取tray.combo/target、user/gift，并依赖外部转换store | 展示单条repeat/group/combo字段，精确保留64位字符串，不相加、不把累计当增量；repeat_end=1结束，combo未证实不猜进行状态。官方RoomMessageConsume跳过repeat_end的托盘推送，但本项目历史保留该消息。 |
| GiftMenu | giftStore.giftList与插件gifts按id匹配，icon/name/price用于菜单 | 仅参考消息已带name/icon；目录、分类函数、价格不是本批静态常量，不发起送礼请求、不推导人民币价值。 |
| Like | LiveLike监听LikeMessage，payload.total单调更新房间点赞显示；count字段由官方schema确认 | 本条count与total独立显示，不据total差值制造点赞事件。 |
| Member | RoomMessageConsume按action分支处理BLOCK/KICK_OUT/LEAVE；EnterAndLeave负责页面用户进出HTTP，与所有Member动作不等价 | 优先common.display_text原生文案；未确认动作不写“进入”。没有默认把每条Member当入场。 |
| Admin | AdminPrivilege syncOn：payload.data.op=1增加privilege，2移除；Member action=5设管理员/6取消并重新查询当前用户资料 | 只展示事件当时权限/任免，不操作用户、不赋予持续角色、不翻译未确认privilege数字。 |
| 红包 | syncOn LuckyBoxMessage/TempStatus/End，字段box_id、box_status、title、description_list、send_time、delay_time、display_duration；End按box_id移除/置Empty | 显示红包消息、刷新信号、结束消息与原生内容；不把End断言为自己领取成功；状态枚举外部依赖不猜。 |
| 福袋 | LotteryEventNew / Candidate / DrawResult；转换lottery_status/current_time/draw_time/id，内部明确Initial0/Inprogress1/Completed2/UnCompleted3/Reviewing4/NotApproved5 | 仅事件时点状态；参与成功看participate_success，不把收到候选消息当中奖；结果user_ids不推断当前观看者中奖。不实现参与/领取。 |
| ShortTouch | message_type=1按short_touch_area_data.type新增/替换，2按type移除；name、load_type等来自payload | 安全展示活动名称与更新/移除，不执行container_payload/JSB/Lynx/WebView，不发起活动跳转。 |

视觉规律：Danmaku为横排文本/图标与圆角标记，Canvas根层pointer-events:none、与Worker绘制是专属播放器机制，第一版不复制；GiftTray头像40px、名称粗体/省略、数量突出；GiftMenu图标28px、名称与资料分层；ShortTouch纵向卡片；红包/福袋36px图标与圆角状态标记。重新编写本工作台网格、32px图标、文字层次和分类色，适配浅色工作台，不搬背景素材、动画或Canvas播放器。

原生富文本模板的数字占位按已有GiftTray片段替换思路实现；未知索引保留明确占位，格式/资源缺失不编造。原文全部textContent，官方颜色/HTML/链接不直接注入DOM。
