@echo off
cd /d "%~dp0"

echo.
echo  === VISUAL SYNTH SHADER v1.0 ===
echo.

REM Matar proceso anterior en puerto 3541
echo  Deteniendo servidor anterior...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3541" ^| findstr "LISTENING"') do (
    echo  Matando proceso PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo  Iniciando servidor...
echo.
echo  🎛  Control:  http://localhost:3541
echo  🖥  Visual:   http://localhost:3541/visual.html
echo.
echo  Presiona Ctrl+C para detener
echo.
node server.js
pause
