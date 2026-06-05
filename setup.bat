@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

echo.
echo === PrepForge Setup ===
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not found.
  echo Install from https://nodejs.org then run this file again.
  pause
  exit /b 1
)

echo Node: 
node -v
echo npm:
call npm -v
echo.

echo [1/3] npm install...
call npm install
if errorlevel 1 goto fail

echo.
echo [2/3] prisma generate...
call npx prisma generate
if errorlevel 1 goto fail

echo.
echo [3/3] prisma db push (Supabase tables)...
call npx prisma db push
if errorlevel 1 (
  echo.
  echo WARNING: Database push failed. Check DATABASE_URL and DIRECT_URL in .env
  echo AI grading still works without DB. Fix Supabase URLs and run setup again.
)

echo.
echo === Setup complete ===
echo Run dev.bat to start the app.
echo.
pause
exit /b 0

:fail
echo.
echo Setup failed. See errors above.
pause
exit /b 1
