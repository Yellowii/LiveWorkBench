param(
    [Parameter(Mandatory=$true)][string]$RunDirectory,
    [string]$IndexPath='C:/Program Files (x86)/webcast_mate/13.0.5.502287990/resources/app/index.js',
    [switch]$Verify
)
$ErrorActionPreference='Stop'
$workspace=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$privateRoot=[IO.Path]::GetFullPath((Join-Path $workspace '.local'))
$run=[IO.Path]::GetFullPath($RunDirectory)
if (!$run.StartsWith($privateRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'RunDirectory must be inside this workspace .local.' }
function Hash-Bytes([byte[]]$Bytes) {
    $hasher=[Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($hasher.ComputeHash($Bytes))).Replace('-','').ToLowerInvariant() } finally { $hasher.Dispose() }
}
function Read-Registry([string]$Path,[string[]]$Names) {
    $key=[Microsoft.Win32.Registry]::CurrentUser.OpenSubKey($Path,$false)
    try {
        $result=[ordered]@{}
        foreach ($name in $Names) {
            if ($key -and $key.GetValueNames() -contains $name) {
                $value=$key.GetValue($name,$null,[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
                if ($value -is [byte[]]) { $value=[Convert]::ToBase64String($value) }
                $result[$name]=@{kind=$key.GetValueKind($name).ToString();value=$value}
            } else { $result[$name]=$null }
        }
        return $result
    } finally { if($key){$key.Dispose()} }
}
function Read-Environment {
    $bytes=[IO.File]::ReadAllBytes($IndexPath)
    $match=[regex]::Matches([Text.Encoding]::UTF8.GetString($bytes),'appendSwitch\((["''])proxy-server\1\s*,\s*(["''])([^"'']+)\2\)')
    if($match.Count -ne 1){throw 'HOOK_PATTERN_UNCONFIRMED'}
    $exe=Get-Item -LiteralPath (Join-Path (Split-Path (Split-Path (Split-Path $IndexPath))) '直播伴侣.exe')
    $certificates=[ordered]@{}
    foreach ($location in 'CurrentUser','LocalMachine') {
        foreach ($name in 'Root','My') {
            $store=[Security.Cryptography.X509Certificates.X509Store]::new($name,$location)
            try {
                $store.Open([Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
                $certificates["$location/$name"]=@($store.Certificates | ForEach-Object { Hash-Bytes $_.RawData } | Sort-Object)
            } finally {$store.Close();$store.Dispose()}
        }
    }
    $listeners=@(Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 8827,8888,18827 | Sort-Object LocalPort,LocalAddress | ForEach-Object {
        $process=Get-Process -Id $_.OwningProcess
        [ordered]@{address=$_.LocalAddress;port=$_.LocalPort;pid=$_.OwningProcess;process=$process.ProcessName;startedAt=$process.StartTime.ToUniversalTime().ToString('o')}
    })
    $companion=@(Get-Process -Name '直播伴侣' -ErrorAction SilentlyContinue | Sort-Object Id | ForEach-Object { [ordered]@{pid=$_.Id;path=$_.Path;startedAt=$_.StartTime.ToUniversalTime().ToString('o')} })
    $routeConnections=@(Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue | Where-Object { $_.RemotePort -eq 8827 -and $_.RemoteAddress -in '127.0.0.1','::1' -and $_.OwningProcess -in $companion.pid } | Select-Object LocalAddress,LocalPort,RemoteAddress,RemotePort,OwningProcess)
    $winhttp=(& netsh winhttp show proxy | Out-String).Trim()
    if($LASTEXITCODE -ne 0){throw 'WINHTTP_READ_FAILED'}
    return [ordered]@{
        observedAt=[DateTime]::UtcNow.ToString('o')
        installation=@{path=$IndexPath;hash=(Hash-Bytes $bytes);proxy=$match[0].Groups[3].Value;sddl=(Get-Acl -LiteralPath $IndexPath).Sddl}
        companionVersion=@{fileVersion=$exe.VersionInfo.FileVersion;productVersion=$exe.VersionInfo.ProductVersion;exe=$exe.FullName;hash=(Get-FileHash -LiteralPath $exe.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
        companion=$companion;oldRouteConnections=$routeConnections;listeners=$listeners;certificates=$certificates
        wininet=(Read-Registry 'Software\Microsoft\Windows\CurrentVersion\Internet Settings' @('ProxyEnable','ProxyServer','ProxyOverride','AutoConfigURL','AutoDetect'))
        wininetConnections=(Read-Registry 'Software\Microsoft\Windows\CurrentVersion\Internet Settings\Connections' @('DefaultConnectionSettings','SavedLegacySettings'))
        winhttp=$winhttp
    }
}
function Canonical-Json($Value) {
    if($null -eq $Value){return 'null'}
    if($Value -is [Collections.IDictionary]) {
        $parts=@(foreach($key in @($Value.Keys | Sort-Object)) { (ConvertTo-Json -InputObject ([string]$key) -Compress)+':'+(Canonical-Json $Value[$key]) })
        return '{'+($parts -join ',')+'}'
    }
    if($Value -is [Collections.IEnumerable] -and $Value -isnot [string]) {
        $parts=@(foreach($item in $Value){Canonical-Json $item})
        return '['+($parts -join ',')+']'
    }
    return ConvertTo-Json -InputObject $Value -Depth 20 -Compress
}
function Json-Hash($Value){Hash-Bytes ([Text.Encoding]::UTF8.GetBytes((Canonical-Json $Value)))}
if (!$Verify) {
    if(Test-Path -LiteralPath $run){throw 'PRIVATE_RUN_ALREADY_EXISTS'}
    New-Item -ItemType Directory -Path $run | Out-Null
    $acl=Get-Acl -LiteralPath $run
    $acl.SetAccessRuleProtection($true,$false)
    $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'))
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-5-18'),'FullControl','ContainerInherit,ObjectInherit','None','Allow'))
    Set-Acl -LiteralPath $run -AclObject $acl
    $state=Read-Environment
    if(@($state.listeners | Where-Object port -eq 18827).Count){throw 'TEST_PROXY_PORT_BUSY'}
    $state | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $run 'environment-before.json') -Encoding utf8
    (Get-Acl -LiteralPath $run).Sddl | Set-Content -LiteralPath (Join-Path $run 'private-directory-acl.txt') -Encoding utf8
    [pscustomobject]@{prepared=$true;companionVersion=$state.companionVersion.fileVersion;companionProcesses=$state.companion.Count;indexHash=$state.installation.hash;oldProxy=$state.installation.proxy;port18827Free=$true;certificateCounts=@($state.certificates.GetEnumerator() | ForEach-Object { @{store=$_.Key;count=$_.Value.Count} });trustModified=$false} | ConvertTo-Json -Depth 8 -Compress
} else {
    $before=Get-Content -LiteralPath (Join-Path $run 'environment-before.json') -Raw | ConvertFrom-Json -AsHashtable
    $after=Read-Environment
    $checks=[ordered]@{}
    foreach($part in 'installation','certificates','wininet','wininetConnections','winhttp') { $checks[$part]=(Json-Hash $before[$part]) -eq (Json-Hash $after[$part]) }
    $checks.oldServices=(Json-Hash @($before.listeners | Where-Object port -in 8827,8888)) -eq (Json-Hash @($after.listeners | Where-Object port -in 8827,8888))
    $checks.testProxyStopped=(@($after.listeners | Where-Object port -eq 18827).Count -eq 0)
    $checks.companionProcesses=(Json-Hash $before.companion) -eq (Json-Hash $after.companion)
    $caPath=Join-Path $run 'certificates/ca.cer'
    if(Test-Path -LiteralPath $caPath){$caHash=Hash-Bytes ([IO.File]::ReadAllBytes($caPath));$checks.testCaAbsentFromStores=(@($after.certificates.Values | ForEach-Object {$_} | Where-Object {$_ -eq $caHash}).Count -eq 0)}
    $report=@{checks=$checks;oldRouteConnectionsBefore=@($before.oldRouteConnections).Count;oldRouteConnectionsAfter=@($after.oldRouteConnections).Count;realRoutingVerified=$false;after=$after}
    $report | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $run 'environment-verification.json') -Encoding utf8
    [pscustomobject]@{checks=$checks;oldRouteConnectionsBefore=$report.oldRouteConnectionsBefore;oldRouteConnectionsAfter=$report.oldRouteConnectionsAfter;realRoutingVerified=$false} | ConvertTo-Json -Depth 8 -Compress
    if($checks.Values -contains $false){throw 'ENVIRONMENT_DRIFT_DETECTED: inspect private journal; no automatic restoration attempted.'}
}
