@echo off
chcp 65001 >nul
echo LiveWorkbench 本地工作台
echo [1] 启动  [2] 停止  [3] 更新  [0] 退出
echo 请选择：
choice /c 1230 /n
if errorlevel 4 exit /b 0
if errorlevel 3 goto update
if errorlevel 2 goto stop
call "%~dp0tools\workbench-action.bat" Start
exit /b %ERRORLEVEL%
:stop
call "%~dp0tools\workbench-action.bat" Stop
exit /b %ERRORLEVEL%
:update
call "%~dp0tools\workbench-action.bat" Update
exit /b %ERRORLEVEL%
