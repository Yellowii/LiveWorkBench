@echo off
setlocal
cd /d "%~dp0.."
where powershell.exe >nul 2>&1
if errorlevel 1 goto missing
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0workbench-launcher.ps1" -Action %~1
set "WORKBENCH_EXIT=%ERRORLEVEL%"
goto finish
:missing
echo Windows PowerShell was not found.
set "WORKBENCH_EXIT=1"
:finish
pause
exit /b %WORKBENCH_EXIT%
