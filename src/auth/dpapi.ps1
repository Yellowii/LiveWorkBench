$ErrorActionPreference='Stop'
try {
  Add-Type -AssemblyName System.Security
  $requestText=[Console]::In.ReadToEnd()
  $requestData=$requestText | ConvertFrom-Json
  $privateBytes=[Convert]::FromBase64String($requestData.data)
  $purposeBytes=[Text.Encoding]::UTF8.GetBytes('LiveWorkbench.LoginVault.v1')
  if($requestData.action -eq 'protect') {
    $resultBytes=[Security.Cryptography.ProtectedData]::Protect($privateBytes,$purposeBytes,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  } elseif($requestData.action -eq 'unprotect') {
    $resultBytes=[Security.Cryptography.ProtectedData]::Unprotect($privateBytes,$purposeBytes,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  } else {throw 'Invalid action'}
  [Console]::Out.Write([Convert]::ToBase64String($resultBytes))
} catch { [Console]::Error.Write('AUTH_PROTECTION_FAILED');exit 1 }
