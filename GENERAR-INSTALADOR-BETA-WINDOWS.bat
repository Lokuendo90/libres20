@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title GRAVITY 1.0 RC - INSTALADOR DE PRUEBA
cls
echo ================================================================
echo    GRAVITY 1.0 RC - INSTALADOR DE ENSAYO (NO PUBLICAR)
echo ================================================================
echo Esta compilacion incluye el motor Electron y no exige Node.js
 echo en el equipo donde se instale, pero esta RC NO esta firmada.
echo Para preparar el instalador necesitas Node.js y conexion a npm.
echo.
where node >nul 2>nul
if errorlevel 1 goto missing
where npm >nul 2>nul
if errorlevel 1 goto missing
node -e "if(Number(process.versions.node.split('.')[0])<22)process.exit(1)"
if errorlevel 1 goto missing
if not exist "package-lock.json" (
  echo Creando package-lock.json real desde npm oficial...
  call npm install --package-lock-only --ignore-scripts --no-audit --no-fund
  if errorlevel 1 goto fail
  echo NOTA: Conserva este package-lock.json en el proyecto.
)
echo Instalando exactamente las dependencias del bloqueo...
call npm ci --no-audit --no-fund
if errorlevel 1 goto fail
echo Verificando vulnerabilidades altas de dependencias de ejecucion...
call npm audit --omit=dev --audit-level=high
if errorlevel 1 (
  echo ERROR: Audita y corrige dependencias criticas/altas antes de empaquetar.
  goto fail
)
echo Ejecutando todas las pruebas de codigo y regresion...
call npm test
if errorlevel 1 goto fail
echo Probando la interfaz aislada en Electron real...
call npm run native:ui
if errorlevel 1 goto fail
echo Probando navegacion, recuperacion y 10 pestanas locales...
call npm run native:regression
if errorlevel 1 goto fail
echo Construyendo instalador privado Windows x64...
call npm run pack:win:beta
if errorlevel 1 goto fail
echo.
echo Instalador de prueba listo en dist\Gravity-Setup-1.0.0-rc.1-x64.exe
echo IMPORTANTE: esta RC puede carecer de firma digital. No publicar.
echo Probar instalacion, desinstalacion y preservacion del perfil en VM.
pause
exit /b 0
:missing
echo ERROR: Instala Node.js 22 o superior con npm antes de continuar.
pause
exit /b 1
:fail
echo ERROR: Se cancelo la construccion por fallo en una comprobacion.
echo Tu Gravity anterior y su perfil NO se han borrado.
pause
exit /b 1
