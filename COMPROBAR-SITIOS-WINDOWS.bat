@echo off
setlocal
cd /d "%~dp0"
echo.
echo GRAVITY 1.0 RC - PRUEBA NATIVA VOLUNTARIA DE SITIOS
 echo Este comprobador abrira sitios publicos sin iniciar sesion.
echo No prueba camara, microfono, contrasenas ni reuniones reales.
echo NO usa el perfil personal normal de Gravity.
echo Reporte en Documentos\Gravity-Diagnosticos.
echo.
set /p CONSENT=Escribe SI para probar el acceso a Internet: 
if /I not "%CONSENT%"=="SI" exit /b 1
if not exist node_modules\electron\dist\electron.exe (
  echo No se encontro Electron. Instala las dependencias con npm install.
  pause
  exit /b 1
)
call npm run native:sites
pause
endlocal
