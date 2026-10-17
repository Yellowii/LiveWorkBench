# Keep the CMD entry ASCII-only; Chinese prompts are decoded by PowerShell.
[CmdletBinding()]
param([ValidateSet('Start','Stop','Update','Menu')][string]$Action='Menu')
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
if ($Action -eq 'Menu') {
    Write-Host 'LiveWorkbench 本地工作台'
    Write-Host '[1] 启动  [2] 停止  [3] 更新  [0] 退出'
    $selection=Read-Host '请选择'
    switch ($selection) { '1' {$Action='Start'} '2' {$Action='Stop'} '3' {$Action='Update'} '0' {exit 0} default {Write-Host '无效工作台操作。';exit 2} }
}
Write-Host ('LiveWorkbench 本地工作台管理：'+$Action)
Write-Host '保留现有账号、登录态、SQLite、RAW 和历史数据。'
if ($Action -ne 'Start') { Write-Host '停止或更新前，请先停止采集并完成或关闭临时登录窗口。' }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'deploy-dev-workbench.ps1') -Action $Action
$result=$LASTEXITCODE
if ($result -ne 0) { Write-Host '操作未成功，请查看上面的中文原因与诊断代码。' }
elseif ($Action -eq 'Start') { Write-Host '启动检查已完成，打开 http://127.0.0.1:18783 查看工作台。' }
elseif ($Action -eq 'Stop') { Write-Host '工作台停止检查已完成。' }
else { Write-Host '本地版本检查已完成，请刷新工作台页面。' }
exit $result
