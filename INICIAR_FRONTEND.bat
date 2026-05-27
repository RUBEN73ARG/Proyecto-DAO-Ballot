@echo off
echo ========================================================
echo   Iniciando el servidor de desarrollo de Web3 Ballot
echo ========================================================
echo.
echo Cambiando al directorio del proyecto...
cd /d "%~dp0"

echo Abriendo el navegador web...
start http://localhost:5173

echo Iniciando Vite...
npm run dev

pause
