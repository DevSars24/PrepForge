@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not found. Install from https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo node_modules missing. Run setup.bat first.
  pause
  exit /b 1
)

echo Starting PrepForge at http://localhost:3000
echo Faculty console: http://localhost:3000/evaluate
echo Press Ctrl+C to stop.
echo.

call npm run dev
