# GRAVITY 1.1.2 | ESCUDOS REFORZADOS (BETA PRIVADA)

**Novedad principal:** corrección del bloqueo insuficiente de anuncios de Gravity 1.1.1. Se amplió el filtrado de red/cosmético y se añadió un manejador limitado de anuncios detectados en YouTube. Consulta `INFORME-GRAVITY-1.1.2.md` y `PRUEBAS-BLOQUEO-WINDOWS.md`. No se ha tocado el diseño ni se garantiza eliminar todos los anuncios de YouTube.

# GRAVITY PRO 1.1.1 BETA | LEER ANTES DE INICIAR

**Esta es la versión nueva sobre Gravity 1.1.0.** Conserva absolutamente todos los recursos visuales, el perfil anterior y las funciones. Corrige la ventana de permiso de fullscreen para páginas principales seguras, añade continuidad del aviso de inactividad de YouTube (solo ese aviso) y actualiza automáticamente las listas HTTPS de Escudos, opción que puedes desactivar.

**Instalación:** cierra Gravity, respalda `%APPDATA%\gravity-directo`, extrae el ZIP en una CARPETA NUEVA y abre `INICIAR-GRAVITY-WINDOWS.bat`. Nunca ejecutes simultáneamente dos versiones que compartan perfil. Guía: `ACTUALIZACION-GRAVITY-1.1.1.md`.

**No se eliminan CAPTCHA de terceros**, no se garantiza cero publicidad en los vídeos de YouTube y no se desactivan los avisos críticos sobre malware o permisos de cámara/micrófono. **Todavía es una beta privada, no un instalador público firmado.**

---

# GRAVITY PRO 1.0.0 RC · CANDIDATA PRIVADA A LANZAMIENTO

Este paquete **continúa directamente desde Gravity 0.9.5**. Conserva sus herramientas y diseño, pero NO es una versión estable certificada. No incluye instalador `.exe` firmado. La preparación de actualizaciones viene DESACTIVADA hasta tener un dominio y editor firmante real.

**Para abrirlo en Windows:** descomprime en una carpeta NUEVA, cierra 0.9.5, guarda copia de `%APPDATA%\gravity-directo`, ejecuta `INICIAR-GRAVITY-WINDOWS.bat`. Conserva tu instalación anterior hasta completar pruebas.

**Para probarlo:** ejecuta `VERIFICAR-GRAVITY-WINDOWS.bat` y, voluntariamente, `COMPROBAR-SITIOS-WINDOWS.bat` y `COMPROBAR-CAMARA-MICROFONO-WINDOWS.bat`. Después abre `REVISAR-RESULTADOS-WINDOWS.bat`.

**Para generar instalador NSIS privado:** ejecuta `GENERAR-INSTALADOR-BETA-WINDOWS.bat` con Node.js 22+, npm y conexión a Internet. No lo distribuyas al público hasta que supere la validación de firma y compatibilidad.

Consulta `docs/GRAVITY-1.0-RC-ESTADO.md`, `docs/PASOS-PARA-VALIDAR-WINDOWS.md` y `docs/ACTIVACION-SEGURA-DE-ACTUALIZACIONES.md`.

---

# GRAVITY PRO 1.0.0-rc.1 | Optimización y endurecimiento

**Esta es una actualización INCREMENTAL de Gravity 0.9.0, no una reconstrucción.** Se mantienen las ocho funciones de 0.9.0, favoritos, historial, descargas, perfil, navegación, PDF, audio, capturas, lector, bóveda y todas las herramientas anteriores. La identidad visual original es intocable.

## 1. Cómo actualizar sin perder nada en Windows

1. **Cierra Gravity y verifica que no quede ninguna ventana abierta.** No abras dos versiones a la vez.
2. Crea una **copia privada** de `%APPDATA%\gravity-directo` con Gravity cerrado. El directorio contiene datos personales, cookies e historial: no lo envíes por chat ni lo publiques.
3. Extrae este ZIP en una **carpeta nueva** llamada `Gravity-PRO-0.9.5`. No sustituyas directamente los archivos de la versión anterior.
4. Haz doble clic en **`INICIAR-GRAVITY-WINDOWS.bat`**. Requiere Node.js 22 o superior y npm para el modo desarrollo; si faltan dependencias, necesitará Internet.
5. Abre el menú y revisa Configuración: el **ahorro automático de memoria está DESACTIVADO** por defecto. Es opcional y solicita consentimiento al activarse.
6. Comprueba tus funciones diarias (YouTube, favoritos, descargas, perfiles, grupos, capturas, PDF, lector, historial). Conserva tu Gravity 0.9.0 hasta comprobar la nueva versión.

## 2. Mejoras reales de la versión 0.9.5

- **Rendimiento:** modo opcional para suspender *hasta dos* pestañas sencillas por ciclo, tras **30 minutos sin usarlas**, con revisión del contenido antes de liberarlas. Se omiten pestañas fijadas, privadas, con multimedia, formularios/iframes, servicios de trabajo conocidos, descargas activas o sonido. No se activa sin decisión explícita. La liberación MANUAL de memoria también protege ahora pestañas fijadas.
- **Diagnóstico CPU/RAM:** se muestran mediciones puntuales aproximadas de procesos y número de pestañas activas y suspendidas en el panel que ya tenía Gravity. La suma de memoria por procesos puede incluir memoria compartida; NO es una medición de ahorro garantizado.
- **Seguridad:** las solicitudes y comprobaciones de permisos verifican coherencia entre orígenes de página y marco. Se rechazan autorizaciones implícitas WebUSB/HID/Serial (si la API de la versión de Electron lo admite). No cambia el tratamiento seguro de Node.js, sandbox, CSP y puente IPC.
- **Estabilidad:** se registran localmente eventos de fallos de subprocesos y fallos del ahorrador sin URLs, búsquedas, contenido ni contraseñas. Se conserva la recuperación tras fallos del renderizador y las copias del perfil existentes.
- **Pruebas Windows:** nueva regresión nativa SIN Internet usando páginas sintéticas, con perfiles temporales y mediciones de 1/10 pestañas; prueba ampliada de 30 pestañas opcional; comprobador de sitios públicos con consentimiento y perfil temporal; comprobador local de cámara y micrófono bajo acción expresa del usuario.
- **Calidad:** nuevos tests unitarios de memoria y de permisos, CI con prueba de Electron en Windows cuando se pueda instalar la dependencia, protección de recursos visuales y pruebas existentes preservadas.

**Importante:** el reposo automático no puede garantizar conservar el estado de todas las aplicaciones modernas, por eso queda apagado por defecto. Si trabajas con formularios o páginas críticas, mantenlo desactivado. La liberación manual requiere confirmación como antes.

## 3. Ejecutar las comprobaciones

- **`COMPROBAR-GRAVITY-NATIVO-WINDOWS.bat`**: prueba el aislamiento de Electron y hasta 10 pestañas locales; no inicia sesión ni usa Internet. Genera un reporte en `Documentos\Gravity-Diagnosticos`.
- **`COMPROBAR-30-PESTANAS-WINDOWS.bat`**: prueba OPCIONAL más exigente de 30 pestañas sintéticas en un perfil temporal. Puede usar mucha RAM. Guarda tu trabajo antes.
- **`COMPROBAR-SITIOS-WINDOWS.bat`**: prueba VOLUNTARIA de carga pública (YouTube, Gmail, WhatsApp Web, Google Meet, Google Docs, etc.), **SIN autenticarte**. Requiere conexión a Internet y tu aceptación.
- **`COMPROBAR-CAMARA-MICROFONO-WINDOWS.bat`**: abre una ventana LOCAL independiente. Solo solicita permisos si haces clic en Probar cámara, micrófono o ambos; no graba ni envía datos. Cierra la ventana o pulsa Detener cuando termines.

Los tres primeros requieren Electron instalado en la carpeta (`node_modules\electron\dist\electron.exe`), normalmente tras iniciar Gravity por primera vez. Los informes contienen solo resultados técnicos, pero conviene revisarlos antes de compartirlos.

## 4. Qué está verificado y qué todavía no

- **Verificado en este entorno:** `npm test` completo (código y Electron simulado), verificación de recursos visuales por hash, comparación estática de la portada en Chromium a 1000×680, 1366×768, 1440×900 y 1920×1080, empaquetado y verificación SHA-256 del ZIP.
- **NO verificado aquí:** arranque real de Gravity 1.0 RC en Electron de Windows, RAM/CPU reales, compatibilidad con cuentas de Gmail/WhatsApp, reproducción DRM, videollamadas y cámara/micrófono reales, firma digital y actualizaciones del instalador. El registro npm es inaccesible en este entorno (`EAI_AGAIN`).

**Esta entrega es código completo + iniciador de desarrollo, no un instalador `.exe` firmado ni una versión pública 1.0.** No contiene actualizaciones automáticas habilitadas ni publica datos o paquetes en un servidor.

## 5. Próximo requisito para lanzamiento

Tras comprobar 0.9.5 en Windows, corregir fallos reales detectados y registrar métricas de RAM/CPU sobre navegación real, habrá que ejecutar pruebas de regresión con servicios de uso diario, revisar periódicamente la seguridad de Electron/Chromium, construir y firmar el instalador y preparar actualizaciones HTTPS verificadas. **No borrar ni rehacer Gravity:** esas tareas complementan el código que ya existe.
