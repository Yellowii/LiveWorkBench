const meanings={
  AUTH_LOGIN_BUSY:['另一个账号正在登录。','完成或关闭当前登录窗口，再登录其他账号。'],
  AUTH_LOGIN_OPEN_FAILED:['登录窗口未能打开，已有登录态已保留。','检查浏览器准备状态及账号网络模式后重试。'],
  AUTH_STATE_UNAVAILABLE:['保存的登录态当前无法读取。','重新登录；不要手动复制或上传凭据文件。'],
  AUTH_PROFILE_INVALID:['账号配置格式不正确。','检查名称、记住登录开关和网络设置。'],
  AUTH_USE_ACCOUNT_MANAGEMENT:['此直播间使用共享账号。','请在账号管理中更新或清除登录态。'],
  AUTH_CONFIRMATION_REQUIRED:['官方接口尚未确认已登录。','在登录窗口完成扫码或验证后再试。'],
  STATE_CONFLICT:['配置或采集状态已被更新。','刷新状态后重新操作。'],
  SOURCE_BUSY:['已有直播间正在采集。','先停止当前监听，再开始另一个直播间。'],
  SOURCE_SELECTION_MISMATCH:['当前活动来源与直播间配置不同。','使用该配置的开始监听命令，或在诊断区手动选择来源。'],
  PROFILE_DISABLED:['该直播间配置尚未启用。','启用并保存配置后开始监听。'],
  TARGET_MAPPING_REQUIRED:['尚未获得可靠的直播间映射。','填写当前有效的完整直播间 URL，再检测。'],
  WEB_DYNAMIC_PARAMETERS_UNAVAILABLE:['尚未获得可用的直连参数。','当前可使用已配置的浏览器兼容方式；真实直连仍待验证。'],
  NETWORK_DNS_NOT_PUBLIC:['直连解析得到非公共地址或 Fake-IP。','保留网络环境，选择系统或自定义代理模式。'],
  TARGET_PRIVATE_ADDRESS:['直连解析得到非公共地址或 Fake-IP。','选择系统或自定义代理模式后重新检测。'],
  NETWORK_PROXY_CONNECT_FAILED:['无法经选定代理建立连接。','检查该代理是否运行，并查看网络诊断。'],
  NETWORK_TLS_VERIFICATION_FAILED:['目标 TLS 证书校验失败。','检查网络诊断；不要关闭证书校验。'],
  NETWORK_SYSTEM_PAC_UNSUPPORTED:['当前版本不能解析系统 PAC 配置。','明确配置可用代理，或使用已验证的直连。'],
  RESOURCE_NOT_FOUND:['请求的配置或记录已不存在。','刷新列表后重新选择。']
};
export function errorMeaning(code){const [message,nextAction]=meanings[code]||['操作未完成。','查看开发诊断中的错误码和日志后重试。'];return {message,nextAction};}
