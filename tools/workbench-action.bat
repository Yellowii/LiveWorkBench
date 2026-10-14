@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."
set "WORKBENCH_ACTION=%~1"
if "%WORKBENCH_ACTION%"=="Start" goto valid
if "%WORKBENCH_ACTION%"=="Stop" goto valid
if "%WORKBENCH_ACTION%"=="Update" goto valid
echo 无效工作台操作。
exit /b 2
:valid
echo LiveWorkbench 本地工作台管理：%WORKBENCH_ACTION%
echo 保留现有账号、登录态、SQLite、RAW 和历史数据。
if "%WORKBENCH_ACTION%"=="Start" goto prerequisites
echo 停止或更新前，请先停止采集并完成或关闭临时登录窗口。
:prerequisites
where powershell.exe >nul 2>&1
if errorlevel 1 goto missing
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-dev-workbench.ps1" -Action %WORKBENCH_ACTION%
set "WORKBENCH_EXIT=%ERRORLEVEL%"
if "%WORKBENCH_EXIT%"=="0" goto success
echo 操作未成功，请查看上面的中文原因与诊断代码。
goto finish
:success
if "%WORKBENCH_ACTION%"=="Start" goto started
if "%WORKBENCH_ACTION%"=="Stop" goto stopped
echo 本地版本检查已完成，请刷新工作台页面。
goto finish
:started
echo 启动检查已完成，打开 http://127.0.0.1:18783 查看工作台。
goto finish
:stopped
echo 工作台停止检查已完成。
goto finish
:missing
echo 找不到 Windows PowerShell。
set "WORKBENCH_EXIT=1"
:finish
pause
exit /b %WORKBENCH_EXIT%
