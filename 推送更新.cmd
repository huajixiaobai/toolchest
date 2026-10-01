@echo off
rem ---------------------------------------------------------------
rem  Toolchest - commit and push (double-click me).
rem  All messages are ASCII so the console code page cannot garble them.
rem ---------------------------------------------------------------
cd /d "%~dp0"
title Toolchest - push

set GIT=git
where git >nul 2>nul
if errorlevel 1 (
  if exist "E:\Git\cmd\git.exe" (
    set GIT=E:\Git\cmd\git.exe
  ) else (
    echo.
    echo   git not found. Install it, or run this from a shell that has it.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo   ==== what changed ====
"%GIT%" status --short
echo.
set /p MSG=Commit message (Enter = "update"):
if "%MSG%"=="" set MSG=update

"%GIT%" add -A
"%GIT%" commit -m "%MSG%"
if errorlevel 1 (
  echo.
  echo   Nothing to commit.
  echo.
  pause
  exit /b 0
)

echo.
echo   ==== pushing to GitHub ====
"%GIT%" push
if errorlevel 1 (
  echo.
  echo   Push failed. Usual causes:
  echo     - the repository does not exist yet on GitHub
  echo     - you have not signed in yet (a browser window should pop up)
  echo     - no internet
  echo.
) else (
  echo.
  echo   Done. GitHub Pages rebuilds in a minute or two.
  echo.
)
pause
