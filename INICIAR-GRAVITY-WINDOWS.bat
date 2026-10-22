@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Gravity PRO 1.1.2 ESCUDOS REFORZADOS BETA

echo.
echo =============================================
echo            GRAVITY PRO 1.1 PRIVACIDAD BETA
echo =============================================
echo.
where node >nul 2>nul
if errorlevel 1 (
 echo ERROR: Instala Node.js LTS 22 o superior desde https://nodejs.org
 pause
 exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<22)process.exit(1)"
if errorlevel 1 (
 echo ERROR: Actualiza Node.js a la version 22 o superior.
 pause
 exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
 echo ERROR: No se encontro npm. Reinstala Node.js incluyendo npm.
 pause
 exit /b 1
)
if not exist "node_modules\electron\dist\electron.exe" (
 echo Preparando Electron y las herramientas de compilacion por primera vez...
 echo Esta instalacion requiere conexion a Internet.
 call npm install --no-audit --no-fund
 if errorlevel 1 (
  echo ERROR: No fue posible instalar las dependencias.
  pause
  exit /b 1
 )
)
call npm run check
if errorlevel 1 (
 echo ERROR: Falta un archivo o existe un problema de sintaxis.
 pause
 exit /b 1
)
echo.
echo Iniciando Gravity PRO...
call npm start
if errorlevel 1 (
 echo Gravity se ha detenido con un error.
 pause
 exit /b 1
)
endlocal
