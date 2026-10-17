# User-invoked deployment only. Dot sourcing defines shared guards without deploying.
[CmdletBinding()]
param([int]$ExpectedPid=0,[string]$ExpectedCommit='',[string]$CaptureExecutable='')

function Get-LwPortListeners {
    param($Context)
    try { return @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -eq $Context.Port }) }
    catch { throw 'PORT_STATUS_UNAVAILABLE' }
}

function New-LwDeploymentContext {
    param([string]$WorkspaceRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')),[int]$Port=18783)
    $workspace=[IO.Path]::GetFullPath($WorkspaceRoot)
    if ($Port -lt 1 -or $Port -gt 65535 -or $workspace -match '[\\/]references(?:[\\/]|$)') { throw 'DEPLOY_CONTEXT_INVALID' }
    return [pscustomobject]@{Root=$workspace;Port=$Port;Base="http://127.0.0.1:$Port";Node=(Get-Command node.exe -ErrorAction Stop).Source;Data=(Join-Path $workspace 'data/pipeline-20261013');Logs=(Join-Path $workspace '.local/deployment')}
}

function Get-LwWorkspaceTarget {
    param($Context)
    $json=& $Context.Node (Join-Path $Context.Root 'src/workspace-state.js') $Context.Root 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'WORKSPACE_GIT_UNAVAILABLE' }
    try { $workspace=$json | ConvertFrom-Json } catch { throw 'WORKSPACE_GIT_UNAVAILABLE' }
    if ($workspace.commit -notmatch '^[a-f0-9]{40,64}$' -or $null -eq $workspace.runtimeDirty) { throw 'WORKSPACE_GIT_UNAVAILABLE' }
    if ($workspace.runtimeDirty -ne $false) { throw 'WORKSPACE_DIRTY' }
    if ($workspace.dirty) { Write-Host '保留未提交的 Markdown 文档；运行代码与配置已核对为已提交版本。' }
    return [string]$workspace.commit
}

function Get-LwWorkbenchState {
    param($Context)
    try {
        $null=Invoke-WebRequest -Uri ($Context.Base+'/') -UseBasicParsing -TimeoutSec 5 -SessionVariable taskSession
        $state=(Invoke-RestMethod -Uri ($Context.Base+'/api/v1/system/status') -TimeoutSec 5 -WebSession $taskSession).data
        $health=(Invoke-RestMethod -Uri ($Context.Base+'/api/v1/health') -TimeoutSec 5 -WebSession $taskSession).data
        if (-not $state.instance -or -not $state.capture -or -not $state.accounts) { throw 'INVALID_STATE' }
        return [pscustomobject]@{Instance=$state.instance;CaptureState=$state.capture.captureState;LoginWindowOpen=$state.accounts.loginWindowOpen;BackendReady=$state.backendReady;Health=$health.status}
    } catch { throw 'WORKBENCH_STATUS_UNAVAILABLE' }
}

function Get-LwDataOwner {
    param($Context)
    $file=Join-Path $Context.Data '.instance.sqlite'
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw 'DATA_DIRECTORY_OWNER_MISMATCH' }
    $probe=@'
import {DatabaseSync} from 'node:sqlite';
const db=new DatabaseSync(process.argv[1],{readOnly:true});const owner=db.prepare('SELECT pid FROM owner WHERE id=1').get();db.close();console.log(owner?.pid||0);
'@
    $owner=& $Context.Node --disable-warning=ExperimentalWarning --input-type=module -e $probe $file 2>$null
    if ($LASTEXITCODE -ne 0 -or "$owner" -notmatch '^\d+$') { throw 'DATA_DIRECTORY_OWNER_MISMATCH' }
    return [int]$owner
}

function Assert-LwOwnedInstance {
    param($Context,$State,[switch]$RequireIdle,[int]$ExpectedPid=0,[string]$ExpectedCommit='',[string]$ExpectedInstanceId='')
    $ownerPid=$State.Instance.pid
    if (-not $State.BackendReady -or $State.Health -ne 'ok' -or $ownerPid -le 0 -or $State.Instance.commit -notmatch '^[a-f0-9]{40,64}$' -or (($State.Instance.dirty -ne $false -or $State.Instance.runtimeDirty -eq $true) -and -not ($State.Instance.dirty -eq $true -and $State.Instance.runtimeDirty -eq $false))) { throw 'OWNED_INSTANCE_INVALID' }
    if (($ExpectedPid -and $ownerPid -ne $ExpectedPid) -or ($ExpectedCommit -and $State.Instance.commit -ne $ExpectedCommit) -or ($ExpectedInstanceId -and $State.Instance.instanceId -ne $ExpectedInstanceId)) { throw 'OWNED_INSTANCE_CHANGED' }
    if ($RequireIdle) {
        if ($State.CaptureState -ne 'STOPPED') { throw 'CAPTURE_NOT_STOPPED' }
        if ($State.LoginWindowOpen -ne $false) { throw 'LOGIN_WINDOW_OPEN' }
    }
    $listeners=@(Get-LwPortListeners $Context)
    if (-not $listeners.Count -or @($listeners | Where-Object { $_.OwningProcess -ne $ownerPid -or $_.LocalAddress -ne '127.0.0.1' }).Count) { throw 'PORT_OWNER_MISMATCH' }
    $info=Get-CimInstance Win32_Process -Filter "ProcessId=$ownerPid" -ErrorAction Stop
    $server=[regex]::Escape((Join-Path $Context.Root 'src/server.js').Replace('/','\'))
    $argument='(?:^|\s)(?:"'+$server+'"|'+$server+'|"?src[/\\]server\.js"?)\s*$'
    if (-not $info -or $info.Name -ne 'node.exe' -or $info.ExecutablePath -ne $Context.Node -or $info.CommandLine -notmatch $argument) { throw 'OWNED_PROCESS_MISMATCH' }
    try { $owner=Invoke-CimMethod -InputObject $info -MethodName GetOwnerSid -ErrorAction Stop }
    catch { throw 'PROCESS_OWNER_UNVERIFIED' }
    if ($owner.ReturnValue -ne 0 -or $owner.Sid -ne [Security.Principal.WindowsIdentity]::GetCurrent().User.Value) { throw 'PROCESS_OWNER_MISMATCH' }
    if ((Get-LwDataOwner $Context) -ne $ownerPid) { throw 'DATA_DIRECTORY_OWNER_MISMATCH' }
    return $info
}

function Get-LwFileSha256 {
    param([string]$Path)
    $stream=[IO.File]::OpenRead($Path);$sha=[Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','').ToLowerInvariant() }
    finally { $sha.Dispose();$stream.Dispose() }
}

function Test-LwCaptureHost {
    param($Context,[string]$Executable)
    $file=[IO.Path]::GetFullPath($Executable)
    if (-not $file.StartsWith($Context.Root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or $file -match '[\\/]references(?:[\\/]|$)' -or -not (Test-Path -LiteralPath $file -PathType Leaf)) { throw 'CAPTURE_BUILD_REQUIRED' }
    $info=New-Object Diagnostics.ProcessStartInfo
    $info.FileName=$file;$info.Arguments='--stdio --smoke';$info.WorkingDirectory=[IO.Path]::GetDirectoryName($file)
    $info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
    $probe=New-Object Diagnostics.Process;$probe.StartInfo=$info
    try {
        $null=$probe.Start();$line=$probe.StandardOutput.ReadLineAsync();$errors=$probe.StandardError.ReadToEndAsync()
        # Existing stdio smoke mode binds no proxy and exits through its normal stop/EOF.
        $probe.StandardInput.WriteLine('{"kind":"stop"}');$probe.StandardInput.Close()
        if (-not $line.Wait(5000) -or -not $probe.WaitForExit(5000)) { throw 'CAPTURE_VALIDATION_TIMEOUT' }
        $ready=$line.Result | ConvertFrom-Json
        if ($probe.ExitCode -ne 0 -or $ready.kind -ne 'ready' -or $ready.proxyBound -ne $false -or $ready.hookReady -ne $false -or $ready.smoke -ne $true) { throw 'CAPTURE_VALIDATION_FAILED' }
        return Get-LwFileSha256 $file
    } catch { if ($_.Exception.Message -eq 'CAPTURE_VALIDATION_TIMEOUT') { throw };throw 'CAPTURE_VALIDATION_FAILED' }
    finally { $probe.Dispose() }
}

function Open-LwDeploymentLock {
    param($Context)
    $null=New-Item -ItemType Directory -Path $Context.Logs -Force
    try { return [IO.File]::Open((Join-Path $Context.Logs 'deploy.lock'),[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None) }
    catch { throw 'DEPLOY_BUSY' }
}

function Assert-LwNoRunningInstance {
    param($Context)
    if (Get-LwPortListeners $Context) { throw 'PORT_ALREADY_IN_USE' }
    $lease=Join-Path $Context.Data '.instance.sqlite'
    if (Test-Path -LiteralPath $lease -PathType Leaf) {
        $leasePid=Get-LwDataOwner $Context
        if ($leasePid) {
            try { $owner=Get-CimInstance Win32_Process -Filter "ProcessId=$leasePid" -ErrorAction Stop }
            catch { throw 'DATA_DIRECTORY_OWNER_MISMATCH' }
            if ($owner) { throw 'DATA_DIRECTORY_STILL_OWNED' }
        }
    }
    try { $nodes=@(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction Stop) }
    catch { throw 'PROCESS_SCAN_UNAVAILABLE' }
    $entry=[regex]::Escape((Join-Path $Context.Root 'src/server.js').Replace('/','\'))
    foreach ($node in $nodes) {
        if (-not $node.CommandLine) { throw 'PROCESS_SCAN_UNAVAILABLE' }
        if ($node.CommandLine -match ('(?:^|\s)(?:"'+$entry+'"|'+$entry+')\s*$')) { throw 'OWNED_INSTANCE_NOT_LISTENING' }
        if ($node.CommandLine -match '(?:^|\s)"?(?:\.[/\\])?src[/\\]server\.js"?\s*$') { throw 'NODE_ENTRY_AMBIGUOUS' }
    }
}

function Get-LwOptionalWorkbenchState {
    param($Context)
    if (Get-LwPortListeners $Context) {
        $state=Get-LwWorkbenchState $Context
        $null=Assert-LwOwnedInstance $Context $state
        return $state
    }
    Assert-LwNoRunningInstance $Context
    return $null
}

function Invoke-LwProtectedStop {
    param($Context,$PreviousState)
    $ExpectedPid=$PreviousState.Instance.pid
    $ExpectedCommit=$PreviousState.Instance.commit
    $ExpectedInstanceId=$PreviousState.Instance.instanceId
    $state=Get-LwWorkbenchState $Context
    $identity=Assert-LwOwnedInstance $Context $state -RequireIdle -ExpectedPid $ExpectedPid -ExpectedCommit $ExpectedCommit -ExpectedInstanceId $ExpectedInstanceId
    $oldProcess=Get-Process -Id $ExpectedPid -ErrorAction Stop
    if ([Math]::Abs(($oldProcess.StartTime.ToUniversalTime()-$identity.CreationDate.ToUniversalTime()).TotalMilliseconds) -gt 1) { throw 'OWNED_INSTANCE_CHANGED' }
    Write-Host '[4/6] 安全条件通过，停止已核对的旧工作台并等待退出。'
    # The only production stop operation, retained from the original helper.
    # No -Force, taskkill, process-name stop, elevation or fallback is used.
    Stop-Process -InputObject $oldProcess -ErrorAction Stop
    if (-not $oldProcess.WaitForExit(10000)) { throw 'OLD_PROCESS_EXIT_TIMEOUT' }
    if (Get-LwPortListeners $Context) { throw 'PORT_NOT_RELEASED' }
    $leasePid=Get-LwDataOwner $Context
    if ($leasePid -and (Get-Process -Id $leasePid -ErrorAction SilentlyContinue)) { throw 'DATA_DIRECTORY_STILL_OWNED' }

    return [pscustomobject]@{status='stopped';pid=$ExpectedPid;commit=$ExpectedCommit;url=$Context.Base}
}

function Invoke-LwVerifiedStart {
    param($Context,[string]$TargetCommit,[string]$CaptureExecutable,[string]$CaptureSha256,[int]$StartupTimeoutSeconds=30,[int]$ExpectedPid=0)
    if ((Get-LwWorkspaceTarget $Context) -ne $TargetCommit) { throw 'WORKSPACE_HEAD_CHANGED_AFTER_STOP' }
    if ((Get-LwFileSha256 $CaptureExecutable) -ne $CaptureSha256) { throw 'CAPTURE_BUILD_CHANGED' }
    Assert-LwNoRunningInstance $Context
    $tag=[Guid]::NewGuid().ToString('N')
    $stdout=Join-Path $Context.Logs ($tag+'.stdout.log');$stderr=Join-Path $Context.Logs ($tag+'.stderr.log')
    $previous=@{};foreach ($key in @('LW_PORT','LW_DATA_DIR','LW_CAPTURE_EXE')) { $previous[$key]=[Environment]::GetEnvironmentVariable($key,'Process') }
    try {
        $env:LW_PORT=[string]$Context.Port;$env:LW_DATA_DIR=$Context.Data;$env:LW_CAPTURE_EXE=$CaptureExecutable
        Write-Host '[5/6] 启动新版工作台；数据目录保持不变。'
        $newProcess=Start-Process -FilePath $Context.Node -ArgumentList ('"'+(Join-Path $Context.Root 'src/server.js')+'"') -WorkingDirectory $Context.Root -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    } finally { foreach ($key in $previous.Keys) { [Environment]::SetEnvironmentVariable($key,$previous[$key],'Process') } }
    $deadline=[DateTime]::UtcNow.AddSeconds($StartupTimeoutSeconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        $newProcess.Refresh();if ($newProcess.HasExited) { throw 'NEW_PROCESS_EXITED' }
        $current=$null;try { $current=Get-LwWorkbenchState $Context } catch { $newProcess.Refresh();if ($newProcess.HasExited) { throw 'NEW_PROCESS_EXITED' };Start-Sleep -Milliseconds 250;continue }
        if ($current.Instance.pid -ne $newProcess.Id -or $current.Instance.pid -eq $ExpectedPid) { throw 'NEW_PID_MISMATCH' }
        if ($current.Instance.commit -ne $TargetCommit) { throw 'NEW_COMMIT_MISMATCH' }
        $null=Assert-LwOwnedInstance $Context $current
        if ((Get-LwWorkspaceTarget $Context) -ne $TargetCommit) { throw 'WORKSPACE_HEAD_CHANGED_AFTER_START' }
        Write-Host '[6/6] 已验证新 PID、实际加载版本、健康状态与数据目录租约。'
        return [pscustomobject]@{status='deployed';pid=$newProcess.Id;commit=$current.Instance.commit;captureSha256=$CaptureSha256;url=$Context.Base;stdout=$stdout;stderr=$stderr}
    }
    $newProcess.Refresh();if ($newProcess.HasExited) { throw 'NEW_PROCESS_EXITED' }
    throw 'NEW_SERVICE_START_TIMEOUT'
}


function Invoke-LwProtectedRestart {
    param($Context,[int]$ExpectedPid,[string]$ExpectedCommit,[string]$ExpectedInstanceId,[string]$TargetCommit,[string]$CaptureExecutable,[string]$CaptureSha256,[int]$StartupTimeoutSeconds=30)
    if ((Get-LwWorkspaceTarget $Context) -ne $TargetCommit) { throw 'WORKSPACE_HEAD_CHANGED' }
    if ((Get-LwFileSha256 $CaptureExecutable) -ne $CaptureSha256) { throw 'CAPTURE_BUILD_CHANGED' }
    $state=Get-LwWorkbenchState $Context
    $null=Assert-LwOwnedInstance $Context $state -RequireIdle -ExpectedPid $ExpectedPid -ExpectedCommit $ExpectedCommit -ExpectedInstanceId $ExpectedInstanceId
    $null=Invoke-LwProtectedStop $Context $state
    return Invoke-LwVerifiedStart $Context -TargetCommit $TargetCommit -CaptureExecutable $CaptureExecutable -CaptureSha256 $CaptureSha256 -StartupTimeoutSeconds $StartupTimeoutSeconds -ExpectedPid $ExpectedPid
}

if ($MyInvocation.InvocationName -ne '.') {
    $ErrorActionPreference='Stop';$lock=$null
    try {
        if ($ExpectedPid -le 0 -or $ExpectedCommit -notmatch '^[a-f0-9]{40,64}$') { throw 'EXPECTED_INSTANCE_REQUIRED' }
        $context=New-LwDeploymentContext;$lock=Open-LwDeploymentLock $context
        $target=Get-LwWorkspaceTarget $context
        if (-not $CaptureExecutable) { $CaptureExecutable=Join-Path $context.Root '.local/pipeline-capture-build/LiveWorkbench.CaptureHost.exe' }
        $hash=Test-LwCaptureHost $context $CaptureExecutable
        $state=Get-LwWorkbenchState $context
        $result=Invoke-LwProtectedRestart $context -ExpectedPid $ExpectedPid -ExpectedCommit $ExpectedCommit -ExpectedInstanceId $state.Instance.instanceId -TargetCommit $target -CaptureExecutable $CaptureExecutable -CaptureSha256 $hash
        Write-Host ("更新成功：PID {0}，版本 {1}，{2}" -f $result.pid,$result.commit,$result.url)
    } catch { Write-Host ('更新失败：'+$_.Exception.Message) -ForegroundColor Red;exit 1 }
    finally { if ($lock) { $lock.Dispose() } }
}
