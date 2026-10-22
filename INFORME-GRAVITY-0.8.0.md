# GRAVITY PRO 0.8.0-beta.1 | Informe de progreso profesional

**Fecha:** 21 de octubre de 2026. **Fase:** pre-distribución de ensayo; beta privada, no lanzamiento público.

## Qué mejora

- Descargas ejecutables o con nombre engañoso: consentimiento explícito antes de guardar. Sigue sin disponer de antivirus ni reputación de sitios.
- Cierre durante transferencias: diálogo para evitar interrupciones accidentales.
- Rendimiento: reducción de mensajes IPC repetidos cuando las pestañas emiten muchos eventos y preservación de descargas durante el reposo manual.
- Mantenimiento: pruebas separadas para audio, descargas, política de publicación y autodiagnóstico real opcional con perfil temporal.
- Empaquetado: flujo local que exige `npm ci` para construir un instalador beta reproducible **después de generar un bloqueo npm genuino en Windows**.

## Qué no cambió

- Navegador basado en Electron 44.9.3, motor sin actualizar para evitar regresiones no probadas.
- Perfil en `%APPDATA%\gravity-directo`.
- Colores negro/dorado, planeta, logotipo, animaciones, HTML, CSS, JavaScript de UI e imágenes originales.
- Sin cuentas, sincronización en nube, actualizaciones automáticas ni telemetría remota nuevas.

## Alcance de la validación

La prueba del audio en YouTube **sí fue confirmada por el usuario en su Windows** para la versión parcheada anterior. Gravity 0.8.0 contiene ese mismo manejador de audio y pasa las pruebas simuladas, pero **todavía no se ha ejecutado la nueva versión 0.8.0 en Windows**.

Se ejecutó `npm test` en Node.js 22.16.0 (Linux) y se verificaron los recursos visuales por hash. La red del entorno no permite acceder a npm (`EAI_AGAIN`), así que no se descargaron Electron ni electron-builder y no se compiló ni firmó un instalador.

La política de lanzamiento sigue bloqueando la salida pública. Las comprobaciones reales de compatibilidad, seguridad, RAM/CPU, OAuth y distribución son la prioridad.

## Instrucciones breves

Cierra la versión anterior, haz copia de `%APPDATA%\gravity-directo`, descomprime el ZIP en carpeta nueva y ejecuta `INICIAR-GRAVITY-WINDOWS.bat`. Después, ejecuta `COMPROBAR-GRAVITY-NATIVO-WINDOWS.bat` y sigue la matriz en `docs/PRUEBAS-GRAVITY-0.8.0-WINDOWS.md`. Si una función falla, vuelve a 0.7.0 parcheada con el respaldo del perfil disponible.
