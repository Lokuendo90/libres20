@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Gravity 1.1.2 - Diagnostico de bloqueo local
where node >nul 2>nul
if errorlevel 1 (
 echo Error: Instala Node.js 22 o superior.
 pause
 exit /b 1
)
echo.
echo [1/3] Validando filtros, excepciones y YouTube (sin visitar sitios externos)...
call npm run test:adblock-advanced
if errorlevel 1 goto :fail
call npm run test:youtube-ad-handler
if errorlevel 1 goto :fail
echo.
echo [2/3] Comprobando el motor real de Electron con recursos locales...
if not exist node_modules\electron\dist\electron.exe (
 echo No se encontro Electron. Abre primero INICIAR-GRAVITY-WINDOWS.bat para instalar dependencias.
 goto :fail
)
call node_modules\.bin\electron.cmd scripts\native-adblock-smoke.cjs
if errorlevel 1 goto :fail
echo.
echo [3/3] PRUEBA APROBADA: bloqueo de red y cosmetico real en Electron.
echo NOTA: esto NO garantiza eliminar todos los anuncios reales de YouTube.
pause
exit /b 0
:fail
echo.
echo NO APROBADO. Guarda esta ventana o toma una captura antes de seguir.
pause
exit /b 1
