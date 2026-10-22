# Gravity PRO 1.1.2 beta: Escudos reforzados y anuncios de YouTube

## Base preservada

Partiendo de Gravity 1.1.1 (incluye todo lo anterior: pestañas, grupos, perfiles, favoritos, lector, capturas, descargas, seguridad, privacidad, etc.). No se modificaron `app/index.html`, `app/style.css`, `app/motion.js`, imágenes, iconos ni recursos visuales. El perfil continúa en `%APPDATA%\gravity-directo`.

## Problema reproducido por la captura del usuario

YouTube mostraba un anuncio de ClickUp dentro del reproductor y un anuncio acompañante a la derecha. Esto evidencia una limitación: el motor de Gravity 1.1.1 solo interpretaba reglas simples tipo `||dominio^`. La mayoría de los filtros por ruta, tipo de recurso y selector visual de EasyList/EasyPrivacy se descartaban. Además, un banner cosmético no elimina el anuncio que ya se está reproduciendo en el vídeo.

## Cambios implementados

1. **Filtrado ABP ampliado (parcial)**: reglas de URL/ruta, `*` y `^`, excepciones `@@`, filtros por tipo de recurso, `$domain=`, `$third-party` y `$~third-party`. Otros tipos de directiva más complejos se rechazan de manera conservadora. Se mantiene un único interceptor de Electron por evento, junto con la protección de cookies.
2. **Filtros cosméticos**: reglas genéricas `##selector`, específicas de dominio y exclusiones `#@#`. Se insertan por página mediante `insertCSS`, sin modificar la interfaz del navegador ni ejecutar scriptlets de terceros. Se limita tamaño, complejidad y número de reglas aplicadas.
3. **YouTube**: nueva detección de `ad-showing` que intenta utilizar el botón oficial para saltar un anuncio; como mejor esfuerzo, puede silenciar/acelerar anuncios identificados y recuperar el audio y la velocidad al volver el vídeo normal. No toca vídeos pausados manualmente ni intenta saltar CAPTCHA.
4. **Anuncios acompañantes**: CSS reforzado para elementos promocionales de YouTube y otros espacios publicitarios conocidos, sin ocultar el reproductor ni la columna principal de contenido.
5. **Protección por defecto**: migración única para encender Escudos en perfiles antiguos; si el usuario los desactiva posteriormente, su decisión permanece guardada. Los datos del perfil no se borran.
6. **Filtros actualizables**: versión 2 de caché; si existe caché v1, se renueva al siguiente intento HTTPS permitido por el límite de frecuencia. Un conjunto básico de reglas funciona desconectado.
7. **Prueba en Windows**: `COMPROBAR-BLOQUEO-WINDOWS.bat` comprueba las reglas mediante Node y, con Electron disponible, bloquea una imagen publicitaria local y mantiene otra imagen normal. No visita la web ni toca el perfil real.

## Limitaciones honestas

- **No garantiza cero anuncios en todos los sitios**, incluido YouTube. Algunos anuncios se entregan junto con el contenido o mediante métodos cambiantes del servicio. Un filtrado de calidad comparable a Brave/uBlock requiere un motor completo de scriptlets, listas y pruebas continuas. Este proyecto implementa solo un subconjunto seguro de ABP.
- **No se bloquearon** `googlevideo.com`, `/youtubei/v1/player` ni el reproductor completo: bloquearlos rompería vídeos normales.
- El control de anuncios de YouTube es heurístico: si YouTube cambia sus controles, puede dejar de funcionar o necesitar ajustes.
- No hay promesa de protección total contra malware ni anonimato de IP; la infraestructura de protección anterior se conserva.
- En este entorno **no se pudo ejecutar Electron Windows ni abrir YouTube real**, por lo que la reproducción real de anuncios necesita comprobación del usuario.
- Las listas descargadas provienen de EasyList/EasyPrivacy por HTTPS, con límites de tamaño y sin transmitir historial. Los servidores de las listas pueden ver la IP de descarga.

## Verificación

- `npm test`: suite completa, incluidos casos añadidos de filtro avanzado, selectores por origen, excepciones, preservación de vídeo normal y restauración de audio.
- Sin archivos visuales anteriores modificados; comprobado por los hashes SHA-256.
- Nuevos tests sintéticos de rendimiento: 2.500 filtros por dominio, 500 consultas.
- La validación en Electron Windows se suministra como archivo ejecutable, pero su resultado real queda pendiente.

## Instalación de prueba en Windows

1. Cerrar Gravity 1.1.1, respaldar `%APPDATA%\gravity-directo`.
2. Extraer el ZIP de Gravity 1.1.2 en **una carpeta distinta**.
3. Abrir `INICIAR-GRAVITY-WINDOWS.bat`. El instalador de dependencias requiere Node.js 22+ e Internet la primera vez.
4. En el menú Ajustes comprobar que **Escudos** están activados. Después de 20 segundos, si hay Internet, las listas pueden renovarse. También está disponible la acción manual **Actualizar listas públicas de protección**.
5. **Recargar YouTube** para iniciar una página con las reglas nuevas. Probar una lista musical y comprobar anuncios iniciales, anuncios laterales y contenido normal.
6. Ejecutar `COMPROBAR-BLOQUEO-WINDOWS.bat` para la prueba local; guardar una captura de la salida si falla.
7. Conservar la versión antigua como respaldo. No ejecutar dos versiones que compartan perfil al mismo tiempo.

Esta es una **beta privada**, no una versión certificada para distribución pública ni una garantía de navegación sin publicidad.
