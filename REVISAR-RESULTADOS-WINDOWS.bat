@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title GRAVITY 1.0 RC - INFORME DE VALIDACION
echo GRAVITY - REVISION DE EVIDENCIA NATIVA
echo Requiere haber ejecutado las pruebas de 10/30 pestanas y sitios.
echo.
where node >nul 2>nul
if errorlevel 1 (echo No se encontro Node.js 22+.& pause& exit /b 1)
for /f "usebackq delims=" %%D in (`powershell -NoProfile -Command "[Environment]::GetFolderPath('MyDocuments')"`) do set "GRAVITY_REPORT_DIR=%%D\Gravity-Diagnosticos"
echo Buscando informes en: "%GRAVITY_REPORT_DIR%"
call npm run release:evidence
if errorlevel 1 (
 echo.
 echo NO APROBADO: revisa los motivos anteriores. Ningun dato personal fue modificado.
) else (
 echo.
 echo INFORMES TECNICOS DISPONIBLES. Sigue pendiente la validacion manual y firma.
)
pause
