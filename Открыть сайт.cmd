@echo off
setlocal
cd /d "%~dp0"
set "PATH=%~dp0.tools\node-v22.16.0-win-x64;%PATH%"
title AI Study Planner
node scripts\launch.mjs
if errorlevel 1 pause
