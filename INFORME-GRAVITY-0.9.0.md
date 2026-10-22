# GRAVITY PRO 0.9.0-beta.1 | Informe de incorporación y control de regresiones

## Alcance

**Fuente:** Gravity PRO 0.8.1 beta, actualizada de forma incremental. Se agregaron las ocho capacidades solicitadas (la recuperación de pestañas cerradas ya existía y fue ampliada). No se removieron controles, perfiles antiguos ni funciones anteriores. No hubo modificaciones a `app/index.html`, `app/style.css`, `app/motion.js`, `app/assets/*` ni `build/gravity.ico`.

## Cambios y archivos

| Función | Implementación | Privacidad / alcance |
|---|---|---|
| Fijadas | `main.cjs`, `pro-tab-state.cjs`, `app/ui.js` | Protegidas contra cierre accidental, conservadas entre reinicios |
| Grupos | `pro-tab-state.cjs`, `main.cjs`, `app/ui.js` | Datos locales en el perfil, límite de 12 grupos, no cierra pestañas |
| Reabrir cierre | `main.cjs` | Pila normal ampliada a 25; no persiste datos de pestañas privadas |
| Traductor | `page-tools.cjs`, `main.cjs`, `app/ui.js` | Usa Google Translate en pestaña nueva, confirmación obligatoria antes de enviar URL completa |
| Captura visible/completa/recorte | `main.cjs`, `page-tools.cjs`, `crop-preload.cjs`, `app/crop.html`, `app/crop.js` | Guarda PNG localmente, límite de 28 MP para captura completa, editor recorte con IPC autenticado |
| Lectura | `page-tools.cjs`, `main.cjs`, `app/reader.html`, `app/reader.js` | Texto extraído y mostrado localmente, ventana separada sin Node ni red |
| Perfiles | `profiles.cjs`, `main.cjs`, `app/ui.js` | Partición de Chromium y directorio `userData` exclusivos por perfil, preservación del original |
| Credenciales | `credential-vault.cjs`, `main.cjs`, `app/ui.js` | HTTPS, cifrado nativo Electron safeStorage, sin rellenado automático, denegación si no hay cifrado seguro |

## Verificaciones efectuadas

- `npm test`: suite de regresión automatizada de Node.js, módulo de ocho funciones, IPC con simulaciones de Electron, perfiles, privacidad, cierres, favoritos, importaciones, audio, descargas y restauración: **APROBADA**.
- `scripts/test-pro-features.cjs`: topes de grupos, orden de fijados, rutas de perfiles, aislamiento de carpetas, credenciales cifradas, rechazo de HTTP, traducción con URL escapada, lectura y validación de recortes: **APROBADA**. El test usa AES-GCM de prueba en vez del almacén real del sistema; el cifrado de Electron debe validarse en Windows.
- `scripts/test-smoke.cjs`: llamadas reales al manejador IPC de Gravity (con Electron simulado), incluyendo editor de captura, credenciales y recuperación: **APROBADA**.
- `npm run test:visual`: 16 archivos base aprobados iguales por SHA-256: **APROBADA**.
- Comparación visual de portada estática 0.8.1 vs. 0.9.0 en Chromium a 1000×680, 1366×768, 1440×900 y 1920×1080: **CERO DIFERENCIAS** bajo condiciones controladas de prueba. El modo de lectura y el editor de recortes son ventanas independientes.
- `npm run test:release-policy`: impide publicar automáticamente una beta sin permisos de lanzamiento: **APROBADA**.

## Riesgos y límites pendientes

- **No** se ha podido arrancar Electron 0.9.0 de forma nativa ni ejecutar el instalador en Windows desde este entorno. Debe probarse en tu equipo.
- La traducción se efectúa **mediante Google Translate** con autorización explícita; no hay motor de traducción local y no todas las páginas admiten traducción por URL.
- Captura completa depende del protocolo Chromium; algunas páginas con DRM o contenidos inusuales pueden bloquear o producir resultados parciales. El modo visible es independiente.
- Modo lectura usa extracción de artículo de la página actual: sitios SPA complejos, formularios y páginas sin estructura de artículo pueden no tener resultado.
- safeStorage de Electron 44 ofrece cifrado de datos local vinculado al usuario del sistema, **no** aislamiento frente a malware con los mismos privilegios ni un gestor de contraseñas completamente auditado. No hay autocompletado; evita enviar credenciales a páginas distintas del origen exacto.
- No existe sincronización en la nube; la selección de perfil relanza el navegador para aislar la partición de sesión.
- Sin instalador público compilado/firmado ni actualizaciones seguras habilitadas. Esta edición sigue siendo **BETA PRIVADA**, no una certificación de lanzamiento 1.0.

## Guía

`LEEME-PRIMERO.md` y `docs/PRUEBAS-GRAVITY-0.9.0-WINDOWS.md`. Proteger el perfil original `%APPDATA%\gravity-directo` y conservar una copia funcional de 0.8.1 mientras se valida.
