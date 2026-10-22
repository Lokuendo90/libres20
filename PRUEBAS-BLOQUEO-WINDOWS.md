# Comprobación concreta del anuncio de YouTube en Gravity 1.1.2

1. Cierra Gravity y respalda `%APPDATA%\gravity-directo`. Descomprime esta beta en otra carpeta.
2. Ejecuta `INICIAR-GRAVITY-WINDOWS.bat`. Ve a Menú → Ajustes; comprueba que **Escudos** estén activos y no haya una excepción para `https://www.youtube.com`.
3. Selecciona **Actualizar listas públicas de protección** si no hay filtros externos; se realiza una descarga desde EasyList/EasyPrivacy, **no** de tu historial. La renovación automática también existe.
4. Pulsa `Ctrl + R` en YouTube, reproduce un vídeo y anota: si salió anuncio antes del vídeo, si apareció a la derecha, si se reprodujo audio del anuncio, y si el vídeo normal funcionó.
5. Abre una página normal que conoces y usa. Verifica que menús, enlaces, inicios de sesión y vídeos legítimos siguen funcionando. Si un sitio se rompe, usa la excepción específica de ese sitio, no apagues toda la protección.
6. Ejecuta `COMPROBAR-BLOQUEO-WINDOWS.bat`: verifica reglas Node, y si está instalado Electron, una prueba de bloqueo real **solo en localhost**, sin navegar por webs desconocidas y sin usar tu perfil.
7. Si falla la prueba de Windows, haz una captura **sin datos privados** de la consola y comparte el resultado. No compartas contraseñas, cookies ni el archivo del perfil.

**Cuidado:** no existe un algoritmo que garantice eliminar todos los anuncios insertados por terceros. Cambios de YouTube pueden requerir nuevas reglas. Tampoco deben bloquearse los CDN de vídeo normales porque eso interrumpe la reproducción.
