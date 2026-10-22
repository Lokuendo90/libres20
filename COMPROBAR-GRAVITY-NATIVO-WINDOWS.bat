@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title GRAVITY - PRUEBA NATIVA LOCAL
cls
echo ====================================================
echo  GRAVITY 1.0 RC - PRUEBA NATIVA (SIN ABRIR INTERNET)
echo ====================================================
echo Este examen NO usa tu perfil personal ni tus cuentas.
echo Cierra Gravity antes de iniciarlo.
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js 22 o superior no encontrado.
  pause
  exit /b 1
)
if not exist "node_modules\electron\dist\electron.exe" (
  echo ERROR: Electron no esta instalado.
  echo Inicia Gravity con INICIAR-GRAVITY-WINDOWS.bat primero.
  pause
  exit /b 1
)
call npm run native:ui
if errorlevel 1 (
  echo.
  echo ERROR: La prueba nativa fallo. Guarda una captura de esta ventana.
  pause
  exit /b 1
)
echo.
echo.
echo Ahora se prueban paginas sinteticas con Electron y un perfil temporal.
echo El reporte se guardara en Documentos\Gravity-Diagnosticos.
call npm run native:regression
if errorlevel 1 (
 echo.
 echo ERROR: La prueba de navegacion nativa fallo. Guarda una captura.
 pause
 exit /b 1
)
echo Pruebas locales aprobadas. Esto NO valida logins ni videollamadas reales.
pause
endlocal
