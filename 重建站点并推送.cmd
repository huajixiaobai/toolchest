@echo off
rem ---------------------------------------------------------------
rem  Toolchest - rebuild the site (docs/) and push. Double-click me.
rem  Use this after editing anything under .work/ or the viewer.
rem
rem  The site name / URL / repo URL come from site.config.json, so this
rem  file stays pure ASCII and cannot be garbled by the console code page.
rem ---------------------------------------------------------------
cd /d "%~dp0"
title Toolchest - rebuild and push

set GIT=git
where git >nul 2>nul
if errorlevel 1 (
  if exist "E:\Git\cmd\git.exe" (set GIT=E:\Git\cmd\git.exe) else (
    echo   git not found. Install it first.
    pause
    exit /b 1
  )
)

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is required to rebuild the site.
  echo   Download: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

echo.
echo   ==== rebuilding the site ====
node ".work\site.js"
if errorlevel 1 (
  echo.
  echo   Build failed - nothing was pushed.
  echo.
  pause
  exit /b 1
)

echo.
echo   ==== what changed ====
"%GIT%" status --short
echo.
set /p MSG=Commit message (Enter = "update the site"):
if "%MSG%"=="" set MSG=update the site

"%GIT%" add -A
"%GIT%" commit -m "%MSG%"
if errorlevel 1 (
  echo.
  echo   Nothing to commit - the site was already up to date.
  echo.
  pause
  exit /b 0
)

"%GIT%" push
if errorlevel 1 (
  echo.
  echo   Push failed - see the message above.
  echo.
) else (
  echo.
  echo   Done. Live in a minute or two.
  echo.
)
pause
