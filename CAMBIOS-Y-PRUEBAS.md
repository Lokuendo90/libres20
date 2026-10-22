# GRAVITY 1.1.2 | BLOQUEO REFORZADO (AGREGADO)

**Se corrige la cobertura incompleta del parser de filtros 1.1.1**. Se amplían condiciones ABP (rutas, comodines, excepciones, tipos, dominio), se integran reglas cosméticas con exclusiones, un manejador específico de anuncios identificados en YouTube y caché de filtros v2. Los Escudos se activan una sola vez en perfiles heredados que los tenían desactivados; el usuario puede desactivarlos posteriormente. No se tocó la interfaz ni las funciones anteriores. Revisa `INFORME-GRAVITY-1.1.2.md`.

**Verificación:** `npm test`, `scripts/test-visual.cjs`, prueba CSS en Chromium y ZIP SHA-256. **Pendiente:** YouTube real y motor Electron Windows. Este bloqueador no garantiza eliminación total de anuncios.

---

# NOTA DE GRAVITY 0.8.1-beta.1 (AGREGADA)

Cinco funciones opcionales añadidas al menú: duplicar, copiar URL, exportar conjunto de pestañas, importar conjunto sin reemplazo y guardar PDF. Se preservaron los recursos visuales y el comportamiento anterior. Véase `INFORME-GRAVITY-0.8.1.md`.

---

# Gravity PRO 0.8.0-beta.1 | Registro de cambios controlados

## Base

Versión origen: Gravity 0.7.1-beta.1, que integra el arreglo al evento `audio-state-changed` probado por el desarrollador en YouTube después de aplicar el parche.

## Cambios de código

1. `download-safety.cjs`: sanitización de nombres para Windows, detección de extensiones ejecutables y avisos de riesgo **antes de descargar**. Si no se puede mostrar un diálogo de confirmación, se cancela el archivo ejecutable. No inspecciona malware.
2. `main.cjs`: combina mensajes IPC de estado dentro del mismo ciclo de eventos; sigue enviando el estado más reciente, no elimina funciones ni datos del snapshot.
3. `main.cjs`: no permite cerrar con descargas pendientes sin mostrar una confirmación; incluye descargas pausadas o temporalmente interrumpidas que aún tienen un DownloadItem activo.
4. `main.cjs`: mantiene visibles en el gestor las descargas activas incluso cuando el historial supera 80 entradas, y no permite borrarlas mientras siguen activas.
5. `main.cjs`: comprueba `isCurrentlyAudible()` además del estado guardado antes de poner una pestaña en reposo manual.
6. `main.cjs`: bloquea `will-attach-webview` globalmente. El navegador usa `WebContentsView`, no elementos `<webview>`.
7. `scripts/native-ui-smoke.cjs`: prueba voluntaria sin red del renderizador local y otra vista aislada en Electron real, usando un perfil temporal, no el histórico.
8. `GENERAR-INSTALADOR-BETA-WINDOWS.bat`: genera el bloqueo de dependencias con npm real, prueba mediante `npm ci` y empaqueta con NSIS sin publicar.
9. CI Windows: antes del empaquetado beta exige `package-lock.json` subido al repositorio privado y pasa la prueba nativa de Electron.
10. Pruebas ampliadas en `test-smoke.cjs`, `test-download-safety.cjs`, `test-release-policy.cjs`.

## Archivos visuales

Intactos: `app/index.html`, `app/style.css`, `app/ui.js`, `app/motion.js`, todos los SVG/PNG/JPG de `app/assets/` y `build/gravity.ico`. Las pruebas de hash verifican contenido de la misma referencia visual; no representan reproducción real en Windows ni pruebas de animación.

## Entorno, resultados y limitaciones

Comprobación de código: Node.js 22.16.0 Linux con Electron simulado; versión fijada de Electron: 44.9.3 (no se ha actualizado el motor). La suite `npm test` pasa en este entorno.

Límites **NO superados**: registro npm inaccesible (`EAI_AGAIN`), por lo que aquí no se descargó Electron, no se obtuvo `package-lock.json`, no se construyó un `.exe`, no se ejecutó la prueba nativa en Windows y no se auditó la seguridad del motor con fuentes externas o usuarios reales. Se mantienen los controles que bloquean la publicación pública.


---
## Gravity PRO 0.9.0-beta.1 (ampliación aditiva)

Ocho funciones: pestañas fijadas, grupos de pestañas, pila de reapertura ampliada, traducción externa con consentimiento, captura visible/completa/región, modo lectura local, perfiles independientes y almacén de credenciales cifrado con safeStorage.

Sin cambios a HTML/CSS/animaciones/activos originales. `npm test` y comparación visual en cuatro resoluciones aprobados. **Electron real y Windows siguen pendientes.** Detalle en `INFORME-GRAVITY-0.9.0.md`.

---
## Gravity 0.9.5 beta (optimización interna aditiva)

Protección de permisos de origen cruzado, denegación de WebUSB/HID/Serial por defecto, ahorro automático opt-in tras 30 min con exclusiones, respeto por pestañas fijadas en reposo manual, métricas CPU/RAM aproximadas y registros privados de fallos de subprocesos. Herramientas para pruebas de Electron nativo, cámara/micrófono y sitios públicos con perfiles temporales. Ver `INFORME-GRAVITY-0.9.5.md` y `docs/PRUEBAS-GRAVITY-0.9.5-WINDOWS.md`. No se cambió el diseño original ni se eliminaron funciones previas.
