@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title GRAVITY - CAMARA Y MICROFONO LOCAL
cls
echo ===============================================
echo  PRUEBA PRIVADA DE CAMARA Y MICROFONO
 echo ===============================================
echo 1. No graba, no almacena y no transmite multimedia.
echo 2. No usa el perfil de Gravity ni tus cuentas.
echo 3. Los permisos se solicitan tras pulsar un boton.
echo 4. Puedes detener dispositivos en cualquier momento.
echo.
choice /c SN /n /m "Abrir prueba local (S/N)? "
if errorlevel 2 exit /b 0
if not exist "node_modules\electron\dist\electron.exe" (
 echo Electron no instalado. Ejecuta primero el iniciador de Gravity.
 pause
 exit /b 1
)
call npm run native:media
if errorlevel 1 (
 echo La prueba dio un error. Toma una captura de esta ventana.
 pause
 exit /b 1
)
echo Prueba finalizada.
pause
endlocal
