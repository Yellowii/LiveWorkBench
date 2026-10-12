# Processing Pipeline v1（内部增量接口）

2026-10-13。保留CORE_CONTRACTS与PUBLIC_API 0.1已有路由/字段，本页定义当前授权的分层实现，不新增网络服务。RawRecorder.append → RawCommit 后才能ACK；TransportUnpacker.unpack(rawCommit) → transport结果与ProtoRef；OfficialParser接独立业务payload；ParserExtensions独立增强；随后去重/事件总线/存储。

TransportUnpacker从已落盘RAW读取并校验SHA256，不解释业务、不去重。Node复用官方传输类型/wire校验；C#复用protobuf-net/GZip，并对照其输出。差异留证据，不让IPC输出替代RAW。解包失败有稳定阶段/错误码，父RAW保留。HTTP生命周期JSON独立留证据，不能替代Proto。

ProtoIndex关联recordingId/rawId/messageIndex/method/msgId/payloadHash/size/parseStatus/eventId。压缩数据rawOffset=null，采用逻辑消息索引。派生payload在本数据域独立fsync文件；已有历史业务payload只引用原只读文件，不复制用户样本。payload路径只供后端内部使用。重复输入逐条留RAW/ProtoRef，重复事件可链接已有eventId。

第一增量仅给现有GET recording RAW详情新增processing传输/消息元数据；GUI原详情经正式接口展示。旧库CREATE TABLE IF NOT EXISTS加入索引，不重写既有RAW/事件/文件。新增解析/重新解析REST在对应增量同步PUBLIC_API。未知/失败类型保留payload引用，自定义增强不修改native。Replay后续拆出物理隔离仓库；当前namespace隔离不冒充数据库隔离。

RAW边界是代理HTTP响应主体、重组WS二进制消息或历史业务payload，不是TCP/TLS原包。应用控制PushFrame有RAW/control记录；WS Ping/Pong单独统计，不当业务Proto。无法保存必须留缺口，不把异常全文、原始字节或凭据返回API。
