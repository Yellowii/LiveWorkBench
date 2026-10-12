$ErrorActionPreference='Stop'
try {
 $proxySettings=Get-ItemProperty -LiteralPath 'HKCU:/Software/Microsoft/Windows/CurrentVersion/Internet Settings'
 [Console]::Out.Write((@{enabled=($proxySettings.ProxyEnable -eq 1);server=[string]$proxySettings.ProxyServer;bypass=[string]$proxySettings.ProxyOverride;pac=[string]$proxySettings.AutoConfigURL}|ConvertTo-Json -Compress))
} catch {[Console]::Error.Write('NETWORK_SYSTEM_PROXY_UNAVAILABLE');exit 1}
