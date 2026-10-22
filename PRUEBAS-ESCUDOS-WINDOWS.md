# Pruebas de Gravity 1.1.1: privacidad, YouTube y búsqueda (Windows)

**Antes de empezar:** cierra Gravity y haz copia de `%APPDATA%\gravity-directo`. Extrae la nueva versión en otra carpeta. No compartas la carpeta de perfil ni capturas que enseñen tokens, contraseñas o sesiones.

1. Ejecuta `INICIAR-GRAVITY-WINDOWS.bat`. Abre Menú > Ajustes de Gravity; verifica que **Escudos** y **bloqueo de cookies de terceros** están habilitados. Los perfiles antiguos conservan las decisiones anteriores, así que puede que tengas que activar el primer ajuste.
2. Abre sitios con anuncios y comprueba que algunas solicitudes publicitarias se bloquean. Si algunos anuncios aparecen, eso es esperado: la versión beta no es equivalente a Brave. Si falla una página legítima, prueba la opción de excepción específica del sitio y anota el error sin compartir datos privados.
3. Si lo deseas, selecciona **Actualizar listas públicas de protección**. Verifica la advertencia de consentimiento, completa la descarga y recarga un sitio. Comprueba que el navegador sigue funcionando aun si la descarga falla.
4. Escribe `youtube` en la barra de direcciones y pulsa Intro; debe abrir YouTube. Escribe `facebook` y debe abrir Facebook. Escribe `videos de astronomía` y debe realizar una búsqueda general. Usa la acción «Buscar en varios motores» para abrir explícitamente Google, Bing y DuckDuckGo.
5. Prueba Gmail, YouTube y WhatsApp Web y confirma que funcionan los inicios de sesión. Si bloqueas cookies entre sitios, ciertos accesos integrados pueden requerir una excepción.
6. Verifica que **«Eliminar datos de sitios al cerrar Gravity»** esté desactivado por defecto. Si decides activarlo, confirma que advierte sobre cierre de sesiones; úsalo solo tras guardar todo tu trabajo. Al reiniciar, las cookies locales deben desaparecer, aunque favoritos e historial permanezcan.
7. Abre un dominio de prueba con punycode o una dirección HTTP por IP pública. Gravity debe advertir señales limitadas de riesgo; la ausencia de alerta NO significa que el sitio sea seguro. No visites sitios maliciosos reales para hacer pruebas caseras.
8. Descarga un archivo inocuo (por ejemplo, texto) y comprueba el gestor. Si deseas probar el escaneo con Microsoft Defender, utiliza archivos de prueba inocuos y revisa el estado en Seguridad de Windows. Nunca abras software malicioso intencionadamente.
9. Ejecuta `VERIFICAR-GRAVITY-WINDOWS.bat` y los comprobadores nativos anteriores. Mide memoria y uso de CPU con las mismas páginas, mismo tiempo de espera y número de pestañas, antes y después, para obtener comparaciones válidas.
10. Vuelve a comprobar el planeta, fondo, menús, grupos de pestañas, favoritos, historial, PDF, capturas, modo lectura, pestañas privadas y el audio de YouTube. No borres la versión anterior hasta finalizar.

**Límites:** el navegador no puede fingir una IP pública, no elimina consentimientos almacenados por los servidores, no hace invulnerable al usuario y todavía no cuenta con servicios de VPN ni reputación antimalware comercial. Tampoco hay instalador público firmado. Las pruebas anteriores deben realizarse en un equipo Windows real.

## Dos correcciones específicas de Gravity 1.1.1

11. En YouTube, entra a un vídeo y pulsa pantalla completa. El cuadro de «gravity-directo solicita fullscreen» no debería aparecer en la página principal HTTPS. No se alteran permisos para páginas de orígenes distintos.
12. Deja una lista de vídeos reproduciéndose y comprueba que el aviso «El video está en pausa. ¿Quieres seguir mirándolo?» desaparezca automáticamente cuando YouTube lo muestre. Detén un vídeo manualmente: no debe empezar solo. Los cambios futuros del sitio pueden requerir ajustes.
13. Verifica la opción de renovación automática de filtros en Ajustes. Puedes desactivarla sin apagar el bloqueo básico. No esperes que se eliminen todos los anuncios ni CAPTCHA de terceros.
