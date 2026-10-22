# Gravity: qué significa «ponerlo en un servidor» en el futuro

## Hoy

Gravity es una **aplicación de escritorio Electron** que integra Chromium y se ejecuta en el PC del usuario. No se instala en un servidor para que funcione como navegador común, ni su diseño se convierte automáticamente en una web.

## Cuando llegue la publicación

1. **Sitio oficial HTTPS**: presentación del producto, documentación y enlace oficial al instalador de Windows.
2. **Distribución de archivos**: un servidor web, CDN o repositorio público puede alojar instaladores firmados, sus hashes y notas de lanzamiento.
3. **Actualizaciones seguras**: opcionalmente, más adelante, introducir un actualizador que verifique firma del editor y autenticidad del manifiesto; las claves privadas nunca deben vivir en el repositorio ni en el cliente.
4. **Servicios opcionales**: un backend propio solo si se quiere sincronizar favoritos, preferencias, cuentas u otros datos. Requerirá consentimiento, cifrado, retención, gestión de incidentes y controles de seguridad adicionales.

En Gravity 0.7.0-beta.1 no se ha conectado ningún servidor de sincronización o de actualizaciones; los registros permanecen locales. La copia local funciona sin cuentas ni sincronización.

**Flujo conceptual:** Equipo del usuario (Gravity) → HTTPS → sitios web. En el futuro, de forma separada: web oficial / descargas / servicio de actualizaciones verificadas; backend opcional solo si se justifica.


## Punto de control Gravity 0.8.0

El navegador sigue siendo una aplicación local de Windows: el servidor futuro solo alojaría descargas, versiones y metadatos de actualización por HTTPS. No se activa sincronización ni telemetría ni conexión remota desde esta beta. Antes de configurar electron-updater debe existir firma de código comprobada, HTTPS legítimo, artefactos verificados y proceso de reversión probado.
