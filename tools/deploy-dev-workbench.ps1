# User-invoked local deployment; no Git pull or system configuration changes.
[CmdletBinding()]
param()
. (Join-Path $PSScriptRoot 'restart-dev-workbench.ps1')

function Test-LwRuntime {
    param($Context)
    $log=Join-Path $Context.Logs ('runtime-'+[Guid]::NewGuid().ToString('N')+'.log')
    $program=@'
import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';
const root=process.argv[2],directory=await fs.mkdtemp(path.join(root,'.local','deploy-runtime-'));
let runtime;
try {await import('ws');await import('playwright-core');const {Runtime}=await import(pathToFileURL(path.join(root,'src/runtime.js')));runtime=await Runtime.open({dataDir:directory});await runtime.close();runtime=null;console.log('NODE_RUNTIME_VALIDATED');}
catch(error){console.error('NODE_RUNTIME_VALIDATION_FAILED',error.code||error.name);process.exitCode=1;}
finally {if(runtime)await runtime.close().catch(()=>{});await fs.rm(directory,{recursive:true,force:true}).catch(()=>{});}
'@
    $before=Get-Location
    try {
        Set-Location -LiteralPath $Context.Root
        $program | & $Context.Node --disable-warning=ExperimentalWarning --input-type=module - $Context.Root *> $log
        if ($LASTEXITCODE -ne 0) { throw 'NODE_RUNTIME_VALIDATION_FAILED' }
    } catch { Write-Host ('运行依赖诊断文件：'+$log);throw 'NODE_RUNTIME_VALIDATION_FAILED' }
    finally { Set-Location -LiteralPath $before.Path }
}

function Invoke-LwDeployment {
    param($Context,[int]$StartupTimeoutSeconds=30)
    $lock=Open-LwDeploymentLock $Context
    try {
        Write-Host '[1/6] 读取当前工作区版本和工作台实例状态。'
        $target=Get-LwWorkspaceTarget $Context;$state=Get-LwWorkbenchState $Context
        $null=Assert-LwOwnedInstance $Context $state
        Write-Host ("工作区 HEAD：{0}`n已加载版本：{1}`n当前 PID：{2}；采集状态：{3}" -f $target,$state.Instance.commit,$state.Instance.pid,$state.CaptureState)
        if ($state.Instance.commit -eq $target) { Write-Host '当前实例已是目标版本且健康，无需构建或重启。';return [pscustomobject]@{status='unchanged';pid=$state.Instance.pid;commit=$target;url=$Context.Base} }
        $null=Assert-LwOwnedInstance $Context $state -RequireIdle
        Write-Host '[2/6] 构建独立 CaptureHost，不覆盖旧服务正在使用的文件。'
        $output=Join-Path $Context.Root ('.local/deploy-builds/'+[Guid]::NewGuid().ToString('N'))
        $buildLog=Join-Path $Context.Logs ('build-'+[Guid]::NewGuid().ToString('N')+'.log')
        try { & (Join-Path $Context.Root 'tools/build-capture.ps1') -OutputDirectory $output *> $buildLog }
        catch { Write-Host ('构建诊断文件：'+$buildLog);throw 'CAPTURE_BUILD_FAILED' }
        Write-Host '[3/6] 验证 CaptureHost 的标准输入输出握手及正常退出。'
        $exe=Join-Path $output 'LiveWorkbench.CaptureHost.exe';$hash=Test-LwCaptureHost $Context $exe
        Write-Host '核验 Node 依赖、官方解析器及隔离 SQLite 初始化。'
        Test-LwRuntime $Context
        if ((Get-LwWorkspaceTarget $Context) -ne $target) { throw 'WORKSPACE_HEAD_CHANGED' }
        return Invoke-LwProtectedRestart $Context -ExpectedPid $state.Instance.pid -ExpectedCommit $state.Instance.commit -ExpectedInstanceId $state.Instance.instanceId -TargetCommit $target -CaptureExecutable $exe -CaptureSha256 $hash -StartupTimeoutSeconds $StartupTimeoutSeconds
    } finally { $lock.Dispose() }
}

function Get-LwDeploymentFailureMessage {
    param([string]$Code)
    $messages=@{
        WORKSPACE_DIRTY='工作区有未提交或未跟踪的正式文件。请先保存并提交；不会覆盖这些修改。'
        WORKSPACE_GIT_UNAVAILABLE='无法取得当前项目的 Git HEAD。'
        WORKBENCH_STATUS_UNAVAILABLE='无法读取 18783 工作台的状态或健康接口；请先启动已有工作台。'
        CAPTURE_NOT_STOPPED='采集尚未停止。请在工作台停止监听后再运行。'
        LOGIN_WINDOW_OPEN='临时登录窗口仍打开。请先完成或关闭登录窗口。'
        OWNED_INSTANCE_INVALID='当前实例身份或健康状态无法可靠确认。'
        OWNED_INSTANCE_CHANGED='构建期间实例已变化，已取消更新。'
        OWNED_PROCESS_MISMATCH='18783 对应进程不是已核对的本项目 Node 工作台。'
        PROCESS_OWNER_MISMATCH='工作台进程不属于当前 Windows 用户；不会跨用户停止进程或请求提权。'
        PROCESS_OWNER_UNVERIFIED='无法核对工作台进程的 Windows 用户归属，已停止部署。'
        PORT_OWNER_MISMATCH='18783 的监听地址或进程归属不符合本机工作台要求。'
        DATA_DIRECTORY_OWNER_MISMATCH='data/pipeline-20261013 的 SQLite 租约不属于当前实例。'
        CAPTURE_BUILD_FAILED='CaptureHost 构建失败；旧工作台保持运行。详见本地构建诊断文件。'
        CAPTURE_BUILD_REQUIRED='未找到项目内有效的 CaptureHost 构建。'
        CAPTURE_VALIDATION_FAILED='CaptureHost 验证失败；旧工作台保持运行。'
        CAPTURE_VALIDATION_TIMEOUT='CaptureHost 未按期响应或退出；部署停止，不强制终止。'
        NODE_RUNTIME_VALIDATION_FAILED='Node 依赖、官方解析器或隔离数据库初始化失败；旧工作台保持运行。'
        CAPTURE_BUILD_CHANGED='验证后的 CaptureHost 文件发生变化，已取消更新。'
        DEPLOY_BUSY='另一个本地部署正在进行。'
        WORKSPACE_HEAD_CHANGED='构建期间工作区 HEAD 已变化，已取消更新。'
        OLD_PROCESS_EXIT_TIMEOUT='旧实例未按期退出；不会强制终止或启动竞争实例。'
        PORT_NOT_RELEASED='旧实例停止后端口仍被占用；不会结束其他进程。'
        DATA_DIRECTORY_STILL_OWNED='旧实例停止后数据目录仍有活动所有者；不会删除租约。'
        NEW_PROCESS_EXITED='新版进程启动后退出，更新未成功。数据保留，错误日志位于 .local/deployment。'
        NEW_PID_MISMATCH='状态接口返回的 PID 不属于本次启动进程，更新未成功。'
        NEW_COMMIT_MISMATCH='新版实际加载的 Commit 与目标 HEAD 不一致，更新未成功。'
        NEW_SERVICE_START_TIMEOUT='新版未按期通过状态检查，更新未成功。'
        WORKSPACE_HEAD_CHANGED_AFTER_STOP='旧实例停止后源码版本变化；停止部署，数据保留。'
        WORKSPACE_HEAD_CHANGED_AFTER_START='新实例启动期间源码版本变化；不会宣称更新成功。'
    }
    if ($messages.ContainsKey($Code)) { return $messages[$Code] }
    return '环境或权限检查失败，部署已停止。未执行提权、强制终止或修改系统设置。'
}

if ($MyInvocation.InvocationName -ne '.') {
    $ErrorActionPreference='Stop'
    [Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
    try {
        $result=Invoke-LwDeployment (New-LwDeploymentContext)
        Write-Host ("完成：PID {0}；实际加载版本 {1}`n工作台：{2}" -f $result.pid,$result.commit,$result.url) -ForegroundColor Green
        exit 0
    } catch {
        $code=$_.Exception.Message
        Write-Host ('部署失败：'+(Get-LwDeploymentFailureMessage $code)) -ForegroundColor Red
        Write-Host ('诊断代码：'+$code)
        Write-Host '请处理提示后再双击运行；本工具不会绕过审批或自动请求管理员权限。'
        exit 1
    }
}
