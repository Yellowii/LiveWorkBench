# GiftMenu 实际消费链与资源恢复

本会话接续be02b78；仍在既有worktree实现，无派工。用户要求继续加强解析和视觉。范围限定MessageView/舞台/详情，不操作正式采集。采用已有的设计核对、测试先行和完成前验证流程；没有引入插件执行器或新框架。

## 修正上一轮调查遗漏

GiftMenuPlugin.277c15b4.js并非只有从giftStore读取礼物目录：它监听GroupLiveContainerChangeMessage，取最后一条消息payload.data的末项，type===6时解析container_payload内data数组，获得id/name/icon；giftStore只是为匹配礼物补price。没有payload则隐藏，有非空数组则替换/显示，空数组不更新。此前只给GiftMessage做资料卡，未接通这个真实消费入口，本轮已补齐。

新增第一方src/messages/gift-menu.js，只对该消息的末项type=6做有界JSON解析；不eval，不泛化执行其他容器，不展开未知payload。字符串最多32768个UTF-16单元、最多20项摘要，整数ID按JSON原始数字文本保真。仅提取id/name/icon/price；资源走原可信域检查，任意额外字段不进入MessageView。解析失败标fallback并保留原生详情，不改变采集或存储。空payload隐藏；空数组/无效JSON保留原舞台状态。新菜单加入同房间/模式/capture的版本记忆，迟到旧消息不能复活已隐藏菜单。

舞台只读菜单展示前两项与总数，点击查看最多20项详情；多余内容可在完整原生JSON中查看。按原CSS参考28px图片、12px名称、8px图文间距、12px行间距、300ms入场；价格在悬停/键盘聚焦时显示，只有消息明示的非零字段。没有giftStore数据时不补价、不推断货币单位，不提供赠送按钮。标题、背景、前两项折叠及点击详情为工作台适配，不声称原样复制整个菜单。显示期限仍为本地30秒，不代表平台菜单失效。

官方Proto在当前加载字典中：GroupLiveContainerChangeMessage.data #1，GroupLiveContainerData.container_payload #3/string。内部id/name/icon/price是字符串内JSON，不存在可确认的Proto字段编号，详情明确提示；原字符串可完整查看。

## 活动与资源

- ShortTouchPlugin约7405处按priority降序。已用于等待队列选入及活动卡CSS顺序；数量上限仍2，不抢占正在展示项。没有从type编号猜优先级。img_layers虽在Proto出现，但指定插件没有消费线索，当前索引也未定位可靠的层级处理代码；因此不按字段名猜叠图、裁剪或动画。
- MessageView资源增加urls候选数组：平台顺序、去重、最多3个通过原隐私规则的地址。单条资源项仍有界（32），完整原始url_list保留在原生JSON。Canvas/DOM舞台共用128缓存、6并发及每个资源10秒总期限，失败依次尝试候选，不无限重试。
- 诊断区显示备用地址成功数；资源记录尝试次数和有限失败原因。远程Image错误通常无法区分HTTP/CORS/解码，仍准确标REQUEST_OR_DECODE_FAILED，不假报404；本机固定资源可区分未准备/会话失效。拒绝URL不会逐帧刷失败；不把完整URL、凭据或正文写入日志。
- 托盘背景使用实际成功图片地址，避免图标回退成功而CSS背景仍引用失效首选。消息列表、富文本和详情复用舞台已成功地址，或至多尝试三项，保持图像一致性。菜单icon本身是单地址，不虚构备用地址。
- 原插件文件继续只读，25项来源哈希未变；只补来源位置记录。没有新增CDN下载、原始代码/图片提交或官方JS执行。

## 验证与剩余

新增gift-menu与stage-resources测试先观察失败再实现。覆盖JSON保真/限长、错误隔离、hide/replace、跨capture、迟到消息、活动排序、URL候选过滤、备用恢复和全失败。浏览器使用实际官方Proto编码的合成事件经RAW/Parser/事件库进入GUI；菜单点击、分类、更新/隐藏、JSON字段#3、RAW链、XSS纯文本、鼠标价格状态、坏图→备用图、托盘背景与详情地址一致、480/700/1440边界/不重叠已纳入tools/verify-gift-menu.mjs。私有报告/截图artifacts/gift-menu-resources；原CSS参照仅独立重建DOM，不执行原脚本。

只读真实历史抽样66条转换无失败；本次仍没有GroupLiveContainerChangeMessage、红包、ShortTouch或AdminPrivilege样本。菜单/新增备用请求场景属于合成验收，不是平台真实菜单验收。完整目录补价、赠送、Lynx活动容器、红包领取/大卡及缺失图片、专有字体和高级动画仍未还原；P0长期测试结论不变。
