# GRAVITY 1.1.1-BETA.1 · Correcciones de YouTube y Escudos

Esta entrega es una actualización **incremental de Gravity 1.1.0**, nunca un rediseño. Se han preservado el perfil histórico `%APPDATA%\gravity-directo`, pestañas fijadas, grupos, recuperación, favoritos, modo privado, contraseñas protegidas, PDF, lector, capturas, descargas y las demás funciones existentes.

## Cambios comprobados en código

1. **Pantalla completa:** solicitudes `fullscreen` del marco principal HTTP local o HTTPS de origen coherente ya no disparan cuadros de permiso. Chromium sigue exigiendo la activación necesaria para fullscreen. Las peticiones desde iframes distintos, sitios HTTP públicos e `automatic-fullscreen` no se conceden sin autorización. Cámara, micrófono y geolocalización siguen protegidos.
2. **YouTube sin pausa de inactividad:** el módulo `youtube-continuity.cjs` detecta solamente la pregunta *«El vídeo está en pausa. ¿Quieres seguir mirándolo?»* (y la variante inglesa) en el diálogo de confirmación de YouTube y confirma su continuación automáticamente. **No reanuda vídeos pausados manualmente**, no manipula CAPTCHA y no captura credenciales. Instalación en mundo JavaScript aislado si Electron lo ofrece.
3. **Escudos:** además del bloqueo integrado ya activo en perfiles nuevos, se ocultarán contenedores publicitarios conocidos de YouTube sin ocultar el reproductor. Esto **no garantiza bloquear todos los anuncios de vídeo**.
4. **Listas públicas:** activada por defecto la renovación en segundo plano de listas HTTPS EasyList/EasyPrivacy, cuando se necesitan y como máximo cada siete días tras una descarga satisfactoria (con espera mínima de seis horas tras un intento fallido). Usa URLs fijas que NO incluyen historial, búsquedas, ni páginas visitadas. Puede desactivarse en Menú > Ajustes. El proveedor de filtros sí ve tu IP al conectar y puede tener sus propios registros. Si no hay Internet, siguen funcionando los dominios integrados y la última lista guardada.
5. **Menús:** se añade solo una casilla en Ajustes de Gravity; no se modifica ningún archivo de la portada, estilos, planetas, fondo, iconos ni animaciones originales.

## Descargar, actualizar y probar en Windows

1. Cierra Gravity; guarda copia local y privada de `%APPDATA%\gravity-directo` y de tu carpeta anterior de código.
2. Descomprime en **carpeta nueva**. Ejecuta `INICIAR-GRAVITY-WINDOWS.bat`. No abras versiones anteriores al mismo tiempo, ya que comparten el perfil principal.
3. Abre un vídeo de YouTube, usa el botón habitual de pantalla completa y comprueba que no sale el diálogo de permiso. Si el vídeo está pausado manualmente, debe permanecer pausado.
4. Reproduce una lista de YouTube mientras trabajas en otras pestañas y comprueba que, cuando el sitio presente el mensaje de inactividad, Gravity responde solo a esa pregunta. Puede variar entre sesiones, países y versiones de YouTube. No es posible garantizar que YouTube nunca cambie el aviso.
5. Menú > Ajustes de Gravity: verifica Escudos y cookies de terceros; revisa la opción nueva de actualización automática. Recuerda que un perfil viejo puede conservar una decisión explícita de desactivar Escudos.
6. Prueba navegación, pestañas, Gmail, WhatsApp Web, descargas, cámara/micrófono cuando los necesites, y `VERIFICAR-GRAVITY-WINDOWS.bat`. Mantén el código anterior como respaldo hasta completar las pruebas.

## Limitaciones que no se deben ocultar

- Los CAPTCHA son verificaciones del **servidor del sitio**, no cuadros de Gravity. No es viable garantizar que desaparezcan y Gravity no intenta evadirlos. Mantener cookies legítimas de primera parte puede evitar repeticiones innecesarias.
- Los avisos críticos de malware/archivos ejecutables, permisos sensibles o phishing **no se han eliminado**, porque ocultarlos perjudicaría a los usuarios.
- Las reglas publicitarias son parciales: no somos equivalentes a Brave Shields ni eliminamos necesariamente anuncios incrustados en el vídeo.
- Gravity no proporciona una VPN, no cambia la IP pública ni garantiza inmunidad frente a ataques.
- La suite Node y Electron simulado no sustituyen pruebas nativas en Windows. Todavía no hay instalador firmado, antivirus universal, servidor de actualizaciones autorizado ni pruebas completas de redes reales.

## Fuentes evaluadas, no copiadas

- Brave adblock-rust: https://github.com/brave/adblock-rust (MPL-2.0; motor de Rust con filtrado cosmético y de red, **no integrado** por depender de compilación y auditoría de compatibilidad).
- uBlock Origin uAssets: https://github.com/uBlockOrigin/uAssets (listas GPL-3.0; **no se ha copiado** su código ni asumido compatibilidad con su sintaxis avanzada).
- Electron: https://github.com/electron/electron/blob/main/docs/tutorial/security.md (lista oficial de medidas de protección).
- StevenBlack hosts: https://github.com/StevenBlack/hosts (referencia de listas públicas; **no integrada** como antivirus ni bloqueador principal).
- Recomendaciones de gestión de permisos: https://www.electronjs.org/docs/latest/api/session.

**Estado:** BETA PRIVADA 1.1.1. El objetivo inmediato es verificar estas dos correcciones en el Windows del propietario antes de un lanzamiento público.
