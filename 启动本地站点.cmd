@echo off
rem ---------------------------------------------------------------
rem  Balatro asset viewer - start the local site.
rem  Serves the local/ build when it exists (it carries the asset pack, so the
rem  viewer opens straight into the atlas - no file picking), otherwise the
rem  code-only docs/ build.
rem  All Chinese text is printed by serve.js (UTF-8), so this file
rem  stays pure ASCII and cannot be garbled by the console code page.
rem ---------------------------------------------------------------
cd /d "%~dp0"
title Balatro Viewer - local site

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is required to start the local site.
  echo   Download: https://nodejs.org/  then open this file again.
  echo.
  echo   No Node? Just double-click BalatroAssetViewer\BalatroViewer.html
  echo   -- the single-file version has exactly the same features.
  echo.
  pause
  exit /b 1
)

node ".work\serve.js" --open --ask
echo.
pause
