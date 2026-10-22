@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title GRAVITY - 30 PESTANAS - PERFIL TEMPORAL
cls
echo Prueba opcional de 30 paginas sinteticas locales.
echo Puede consumir mucha RAM. Guarda trabajos antes de ejecutarla.
echo No emplea el perfil real ni cuentas personales.
echo.
choice /c SN /n /m "Ejecutar estres con 30 pestanas (S/N)? "
if errorlevel 2 exit /b 0
if not exist "node_modules\electron\dist\electron.exe" (
 echo Falta Electron. Ejecuta el iniciador primero.
 pause
 exit /b 1
)
call npm run native:regression:30
if errorlevel 1 (
 echo Error en prueba. Toma una captura y conserva el reporte.
 pause
 exit /b 1
)
echo Prueba completada. Revisa Documentos\Gravity-Diagnosticos.
pause
endlocal
