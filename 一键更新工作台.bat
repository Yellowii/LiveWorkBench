@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo LiveWorkbench 一键本地更新
echo 保留现有账号、登录态、SQLite、RAW 和历史数据。
echo 请先停止本项目采集，并完成或关闭临时登录窗口。
echo.
where powershell.exe >nul 2>&1
if errorlevel 1 (
  echo 更新失败：找不到 Windows PowerShell。
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\deploy-dev-workbench.ps1"
set "DEPLOY_EXIT=%ERRORLEVEL%"
echo.
if not "%DEPLOY_EXIT%"=="0" (
  echo 更新未成功，请查看上面的中文原因与诊断代码。
) else (
  echo 本地版本检查已完成，请刷新工作台页面。
)
pause
exit /b %DEPLOY_EXIT%
