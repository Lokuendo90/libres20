# Gravity 1.0.0-rc.1 | Informe técnico de la siguiente fase
**Fecha de preparación:** 21 de octubre de 2026.

## Alcance
Se continuó desde Gravity 0.9.5, manteniendo los archivos de diseño y recursos originales. No se reconstruyó el navegador. Se priorizaron mejoras para una distribución pública futura: seguridad de actualizaciones, protección de datos, robustez de pestañas, evaluación con evidencias reales, instalador y controles para impedir una publicación prematura.

## Cambios efectivos, no solo propuestas

1. **Suspensión segura de pestañas:** tanto el modo automático como el manual exigen una respuesta booleana estricta sobre la seguridad de suspender la página. El modo manual evita sitios protegidos y comprueba de nuevo descargas/actividad antes de suspender. Se redujo el riesgo de perder texto de formularios; no puede garantizarse conservar el estado interno de todas las SPA.
2. **Actualizaciones automáticas preparadas pero apagadas:** nuevo módulo `update-service.cjs`, basado en `electron-updater` fijado a `6.8.10`. Verifica que sea un Windows empaquetado, que exista un canal oficial HTTPS y que coincida la identidad del editor. En un futuro instalador firmado y con servidor válido, consultará cada seis horas, podrá descargar actualizaciones y solicitará autorización antes de reiniciar. **Esta RC no se conecta a ningún servidor de actualización.**
3. **Mejor comprobación de calidad:** se añadió un evaluador que lee informes recientes, reales y numéricos de 10 y 30 pestañas y carga pública de YouTube, Gmail, WhatsApp Web, Google Meet y Docs. Nunca acepta `npm test` simulado como prueba de compatibilidad real. Sin evidencia, no aprueba el lanzamiento.
4. **Seguridad del sistema de distribución:** bloqueo de publicación si faltan autenticación del editor, firma Authenticode, configuración HTTPS coherente, dependencias fijadas, auditoría de seguridad y pruebas nativas de Windows. El nuevo camino `scripts/build-release.cjs` no permite publicar automáticamente.
5. **Compilación del instalador de ensayo:** `GENERAR-INSTALADOR-BETA-WINDOWS.bat` utiliza `npm ci`, ejecuta `npm audit`, `npm test`, smoke de Electron real y crea un instalador NSIS con `electron-builder`, todo en Windows y sin tocar el perfil existente.
6. **Automatización de las comprobaciones:** `VERIFICAR-GRAVITY-WINDOWS.bat`, `REVISAR-RESULTADOS-WINDOWS.bat`, matrices de sitios y diagnósticos conservados/extendidos. Se modernizó la CI para impedir subida pública automática y retener solo artefactos de ensayo privados.
7. **Regresión:** nuevos tests para canales HTTPS, bloqueo de instalaciones sin consentimiento, resultados nativos caducados/incompletos, recuperación de perfiles corruptos, exclusión de secretos de registros y suspensión segura.
8. **Identidad preservada:** la portada, el CSS, las animaciones, 13 archivos de recursos y el icono de instalación suman **17 archivos idénticos byte por byte** a los de la versión 0.9.5. Solo se añadió un control al panel «Acerca de Gravity» para consultar actualizaciones cuando exista un canal oficial; no cambia la portada ni la distribución visual.

## Comprobaciones realizadas en este entorno

- `npm test`: **aprobado** después de las modificaciones. Incluye pruebas de módulos anteriores, seguridad, perfiles, pestañas, contraseñas, capturas, PDF, audio, privacidad y nuevas políticas.
- Integridad de recursos visuales contra 0.9.5: **17 archivos idénticos**.
- Prueba de bloqueo de publicación: **aprobada**, se negó a autorizar un lanzamiento sin documentación, firma e informes nativos.
- Se comprobaron versiones estables mediante fuentes oficiales; el proyecto continúa con Electron **44.9.3**, sin migraciones arriesgadas de motor.
- **npm registry no accesible en este entorno (`EAI_AGAIN`)**: no se ha podido generar un `package-lock.json` real, descargar Electron ni compilar un instalador Windows. El script incluido puede generar el lockfile real en un equipo Windows con Internet.
- No se ejecutó Electron de Windows, ni autenticación/DRM/videollamadas reales, ni una instalación o actualización firmada. No se inventan resultados.

## Puntos bloqueantes para lanzar como «Gravity 1.0 estable»

**Requieren acceso a equipo/certificado/servicios reales:** (1) medición y compatibilidad Windows 10/11, (2) archivos de dependencia bloqueados y auditoría, (3) instalador `.exe` real en PC de prueba, (4) certificado Authenticode legítimo, (5) dominio oficial HTTPS y un canal de actualización validado, (6) revisión de seguridad y privacidad antes de distribuir a terceros. El proyecto bloquea expresamente su publicación mientras falten estos requisitos.

## No se eliminó

Pestañas fijadas y grupos, restauración, perfiles, modo incógnito, traducción, capturas, lector, favoritos, historial, contraseñas cifradas, descargas, páginas PDF, panel de diagnóstico, búsqueda, navegación, animaciones e interfaz original. Se conserva también el directorio histórico del perfil de Windows: `%APPDATA%\gravity-directo`.

## Instrucciones

Abrir `LEEME-PRIMERO.md` o `docs/PASOS-PARA-VALIDAR-WINDOWS.md`. Conservar Gravity 0.9.5 mientras se prueba este paquete.
