$ErrorActionPreference='Stop'
$taskAuthStage='AUTH_DPAPI_ASSEMBLY_FAILED'
# This helper is read on every call, including by an already-running host.
# Never write input bytes, plaintext, account identifiers, paths or exception text.
function Write-LwAuthTrace {
  param([string]$Result,[string]$Reason,[Nullable[int]]$HResult,[string]$Phase='complete')
  try {
    if (-not $env:LW_DATA_DIR) { return }
    $taskRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..')).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)
    $taskData=[IO.Path]::GetFullPath($env:LW_DATA_DIR)
    if (-not $taskData.StartsWith($taskRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or $taskData -match '[\\/]references(?:[\\/]|$)') { return }
    $taskDirectory=Join-Path $taskData 'diagnostics'
    $null=[IO.Directory]::CreateDirectory($taskDirectory)
    $taskFile=Join-Path $taskDirectory 'auth-dpapi-v1.jsonl'
    $taskRotated=$taskFile+'.1'
    $taskAction=if ($requestData.action -in 'protect','unprotect') {$requestData.action} else {$null}
    $taskEntry=@{at=[DateTime]::UtcNow.ToString('o');kind='AUTH_DPAPI';version=1;pid=$PID;action=$taskAction;result=$Result;phase=$Phase;reason=$Reason;hresult=$HResult}
    $taskText=($taskEntry | ConvertTo-Json -Compress)+[Environment]::NewLine
    $taskEncoding=New-Object Text.UTF8Encoding($false)
    if ((Test-Path -LiteralPath $taskFile) -and (Get-Item -LiteralPath $taskFile).Length+$taskEncoding.GetByteCount($taskText) -gt 65536) {
      if (Test-Path -LiteralPath $taskRotated) { Remove-Item -LiteralPath $taskRotated }
      Move-Item -LiteralPath $taskFile -Destination $taskRotated
    }
    [IO.File]::AppendAllText($taskFile,$taskText,$taskEncoding)
  } catch { } # A diagnostic write must never change the cryptographic result.
}
try {
  Write-LwAuthTrace -Result 'progress' -Reason '' -HResult $null -Phase 'start'
  Add-Type -AssemblyName System.Security
  $taskAuthStage='AUTH_DPAPI_INPUT_FAILED'
  Write-LwAuthTrace -Result 'progress' -Reason '' -HResult $null -Phase 'input'
  # The IPC message is one bounded JSON object. Do not wait for EOF: Windows
  # pipe handles can remain open during the asynchronous connection refresh.
  $taskBuffer=New-Object Text.StringBuilder
  $taskQuoted=$false;$taskEscaped=$false;$taskDepth=0;$taskStarted=$false
  while ($true) {
    $taskCode=[Console]::In.Read()
    if ($taskCode -lt 0) { throw 'Incomplete request' }
    $taskChar=[char]$taskCode
    if ($taskBuffer.Length -ge 3145728) { throw 'Request too large' }
    $null=$taskBuffer.Append($taskChar)
    if ($taskQuoted) {
      if ($taskEscaped) { $taskEscaped=$false }
      elseif ($taskCode -eq 92) { $taskEscaped=$true }
      elseif ($taskCode -eq 34) { $taskQuoted=$false }
    } else {
      if ($taskCode -eq 34) { $taskQuoted=$true }
      elseif ($taskCode -eq 123) { $taskDepth++;$taskStarted=$true }
      elseif ($taskCode -eq 125) { $taskDepth--;if ($taskStarted -and $taskDepth -eq 0) { break } }
      elseif (-not $taskStarted -and -not [char]::IsWhiteSpace($taskChar)) { throw 'Invalid request' }
    }
  }
  $requestText=$taskBuffer.ToString()
  Write-LwAuthTrace -Result 'progress' -Reason '' -HResult $null -Phase 'input-read'
  $requestData=$requestText | ConvertFrom-Json
  $privateBytes=[Convert]::FromBase64String($requestData.data)
  Write-LwAuthTrace -Result 'progress' -Reason '' -HResult $null -Phase 'input-ready'
  $purposeBytes=[Text.Encoding]::UTF8.GetBytes('LiveWorkbench.LoginVault.v1')
  if($requestData.action -eq 'protect') {
    $taskAuthStage='AUTH_DPAPI_PROTECT_FAILED'
    $resultBytes=[Security.Cryptography.ProtectedData]::Protect($privateBytes,$purposeBytes,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  } elseif($requestData.action -eq 'unprotect') {
    $taskAuthStage='AUTH_DPAPI_UNPROTECT_FAILED'
    $resultBytes=[Security.Cryptography.ProtectedData]::Unprotect($privateBytes,$purposeBytes,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  } else {$taskAuthStage='AUTH_DPAPI_ACTION_INVALID';throw 'Invalid action'}
  Write-LwAuthTrace -Result 'progress' -Reason '' -HResult $null -Phase 'crypto-ready'
  $taskAuthStage='AUTH_DPAPI_OUTPUT_FAILED'
  [Console]::Out.Write([Convert]::ToBase64String($resultBytes))
  Write-LwAuthTrace -Result 'ok' -Reason '' -HResult $null
} catch {
  $taskAuthCause=$_.Exception
  while ($taskAuthCause.InnerException) { $taskAuthCause=$taskAuthCause.InnerException }
  Write-LwAuthTrace -Result 'failed' -Reason $taskAuthStage -HResult $taskAuthCause.HResult
  [Console]::Error.Write((@{code=$taskAuthStage;hresult=$taskAuthCause.HResult} | ConvertTo-Json -Compress));exit 1
}
