# ADICIONES 0.8.1 (PARA VERIFICAR EN WINDOWS)

- [ ] Probar PDF auténtico de páginas estáticas y dinámicas, no solo simulación.
- [ ] Comprobar importación/exportación voluntaria de colecciones, sin fuga de privadas.
- [ ] Probar copiado/duplicado y persistencia del perfil real.

---

# GRAVITY 0.8.0 | Requisitos de salida pública

## Comprobado en entorno de desarrollo (NO equivale a una certificación)

- [x] Diseño base sin cambios en HTML, CSS, JS de interfaz, animaciones y recursos gráficos.
- [x] Prueba del error `audio-state-changed` que apareció en YouTube y fue reparado en el equipo del desarrollador.
- [x] Pruebas unitarias y smoke simulado de descargas ejecutables, consentimiento, guardado de perfil, restauración, modo privado, audio y cierre con descargas activas.
- [x] Mensajes de estado de pestañas combinados con prueba de ráfagas de eventos.
- [x] Política de publicación en modo beta sin canal de updates; prueba que el guardarraíl de publicación falla como debe.
- [x] Script de prueba local Electron nativo preparado (no ejecutado aquí).

## Pendientes de validación real

- [ ] Ejecutar `COMPROBAR-GRAVITY-NATIVO-WINDOWS.bat` sobre Windows 10 y 11.
- [ ] Reproducir/pause vídeo YouTube sin regresión durante sesiones prolongadas, audio y pantalla completa.
- [ ] Gmail, WhatsApp Web, Meet, Docs, OAuth, QR, cámara/micrófono, pantalla compartida, PDF y DRM con cuentas de laboratorio.
- [ ] Medir RAM/CPU con 1/10/30 pestañas, y fugas tras múltiples aperturas/cierres.
- [ ] Descargar ejecutables de prueba: confirma y cancela correctamente; comprobar detección antivirus del sistema.
- [ ] Probar avisos al cerrar con descargas activas, pausadas y al sufrir errores de red.
- [ ] Probar recuperación de sesión con cierres abruptos en perfil de laboratorio (sin arriesgar datos personales).
- [ ] TLS, certificados inválidos, dominios IDN, ventanas OAuth, permisos de iframe y redirecciones externas.
- [ ] Ejecutar auditoría de dependencias, amenazas y navegación por contenido remoto sin confianza.
- [ ] Producir `package-lock.json` auténtico en Windows, subirlo al repositorio privado y compilar con `npm ci`.
- [ ] Generar e instalar NSIS beta en Windows limpio sin Node.js en equipo receptor; probar desinstalación.
- [ ] Identidad legal, derechos de recursos, firma de código Authenticode, actualizaciones HTTPS con control de integridad y reversión.
- [ ] Política de privacidad, soporte, reporte de vulnerabilidades y plan de respuesta a actualizaciones del motor Chromium/Electron.

**No publicar Gravity 1.0 antes de terminar los puntos críticos.** Un navegador de Internet que procesa contenido no confiable requiere un nivel de seguridad especialmente alto.


## Gravity 0.9.0: validación nueva antes de Gravity 1.0

- [x] Ocho funciones aditivas integradas (la reapertura ya existía y fue mejorada).
- [x] Integridad de interfaz original comprobada mediante SHA-256 y capturas estáticas Chromium.
- [x] Test de seguridad: bóveda requiere cifrado del sistema; traducción exige consentimiento y no acepta pestañas privadas.
- [ ] Pruebas nativas reales en Windows de las ocho funciones; especialmente safeStorage/DPAPI, recortes, CDP y selección de perfiles.
- [ ] Firma de código e instalador de Windows en máquina limpia.
- [ ] Sistema de actualizaciones verificadas, control de versiones y soporte al usuario.
- [ ] Pruebas con YouTube, Gmail, Meet, WhatsApp Web y compatibilidad multimedia; auditoría de seguridad independiente antes del lanzamiento público.

## Estado adicional de Gravity 0.9.5-beta.1

- [x] Diseño 0.9.0 protegido por hash, portada idéntica en cuatro resoluciones estáticas.
- [x] Protecciones nuevas de orígenes de permisos y dispositivos no autorizados en el código.
- [x] Ahorro de memoria opcional (desactivado al instalar), con límites conservadores y tests unitarios.
- [x] Test de regresión de 1/10 pestañas sintéticas, test voluntario de 30, portada pública y multimedia local preparados.
- [ ] Ejecutar tests NATIVOS en Windows y corregir fallos reales de compatibilidad.
- [ ] Medir RAM/CPU con páginas de trabajo reales y comparar con 0.9.0.
- [ ] Verificar cámara/micrófono, reproducción de vídeo, OAuth, WhatsApp QR, Meet y pantalla compartida bajo consentimiento.
- [ ] Crear lockfile real (`npm install` en Windows con conexión), probar instalador `.exe` en Windows limpio y firmarlo.
- [ ] Implementar infraestructura segura de actualizaciones, respuesta de vulnerabilidades y validación independiente.
