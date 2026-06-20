@echo off
title Biker Society - Servidor local
cd /d "%~dp0"
echo.
echo  ====================================================
echo    Iniciando Biker Society en local...
echo    URL: http://localhost:5500
echo  ====================================================
echo.
echo  (No cierres esta ventana mientras trabajas)
echo.
REM Abre el navegador despues de 2 segundos
start "" /min cmd /c "timeout /t 2 >nul & start http://localhost:5500"
node serve.js
echo.
echo  El servidor se detuvo. Pulsa una tecla para salir.
pause >nul
