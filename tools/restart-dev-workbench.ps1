# Manual deployment only. This script is not invoked by the application or AI tools.
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][int]$ExpectedPid,
    [Parameter(Mandatory=$true)][string]$ExpectedCommit
)
$ErrorActionPreference='Stop'
$workspaceRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$captureExecutable=Join-Path $workspaceRoot '.local/pipeline-capture-build/LiveWorkbench.CaptureHost.exe'
$taskNodeExecutable=(Get-Command node.exe -ErrorAction Stop).Source
if (-not (Test-Path -LiteralPath $captureExecutable -PathType Leaf)) { throw 'CAPTURE_BUILD_REQUIRED' }
$base='http://127.0.0.1:18783'
$null=Invoke-WebRequest -Uri ($base+'/') -UseBasicParsing -SessionVariable workbenchSession
$state=(Invoke-RestMethod -Uri ($base+'/api/v1/system/status') -WebSession $workbenchSession).data
if ($state.instance.pid -ne $ExpectedPid -or $state.instance.commit -ne $ExpectedCommit -or $state.capture.captureState -ne 'STOPPED' -or $state.accounts.loginWindowOpen) { throw 'OWNED_INSTANCE_NOT_IDLE_OR_CHANGED' }
$processInfo=Get-CimInstance Win32_Process -Filter "ProcessId=$ExpectedPid"
if ($processInfo.Name -ne 'node.exe' -or $processInfo.CommandLine -notmatch 'src[/\\]server.js') { throw 'OWNED_PROCESS_MISMATCH' }
$leaseProbe=@'
import {DatabaseSync} from 'node:sqlite';
const db=new DatabaseSync(process.argv[1],{readOnly:true});const owner=db.prepare('SELECT pid FROM owner WHERE id=1').get();db.close();console.log(owner?.pid||0);
'@
$leaseFile=Join-Path $workspaceRoot 'data/pipeline-20261013/.instance.sqlite'
$leasePid=& $taskNodeExecutable --input-type=module -e $leaseProbe $leaseFile
if ($LASTEXITCODE -ne 0 -or [int]$leasePid -ne $ExpectedPid) { throw 'DATA_DIRECTORY_OWNER_MISMATCH' }
# Only the explicitly identified idle 18783 Node host is stopped; SQLite WAL/data remain.
Stop-Process -Id $ExpectedPid -ErrorAction Stop
Set-Location -LiteralPath $workspaceRoot
$env:LW_PORT='18783'
$env:LW_DATA_DIR=Join-Path $workspaceRoot 'data/pipeline-20261013'
$env:LW_CAPTURE_EXE=$captureExecutable
& $taskNodeExecutable 'src/server.js'
exit $LASTEXITCODE
