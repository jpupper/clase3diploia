@echo off
cd /d "%~dp0"
echo.
echo  === Instalando dependencias ===
echo.
call npm install
echo.
echo  === Instalacion completa ===
echo.
pause
