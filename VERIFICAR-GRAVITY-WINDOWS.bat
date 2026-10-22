@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title GRAVITY 1.0 RC - AUDITORIA WINDOWS
cls
echo ====================================================
echo  GRAVITY 1.0 RC - PRUEBAS EN WINDOWS SIN TU PERFIL
 echo ====================================================
echo No abre ni borra tus favoritos, cookies o contrasenas.
echo Las pruebas usan un perfil TEMPORAL aislado.
echo.
if not exist "node_modules\electron\dist\electron.exe" (
  echo Falta Electron. Abre primero INICIAR-GRAVITY-WINDOWS.bat.
  pause
  exit /b 1
)
call npm test
if errorlevel 1 goto fail
call npm run native:ui
if errorlevel 1 goto fail
call npm run native:regression
if errorlevel 1 goto fail
call npm run native:regression:30
if errorlevel 1 goto fail
echo.
echo PRUEBAS LOCALES: aprobadas.
echo Ahora usa COMPROBAR-SITIOS-WINDOWS.bat para la red real.
echo Despues ejecuta REVISAR-RESULTADOS-WINDOWS.bat.
pause
exit /b 0
:fail
echo ERROR: Una prueba fallo. No distribuir Gravity.
pause
exit /b 1
