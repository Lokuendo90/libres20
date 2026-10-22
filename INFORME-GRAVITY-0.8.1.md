# Informe técnico | Gravity 0.8.1-beta.1

Fecha: 21/10/2026. Alcance: **ampliaciones no destructivas**, sin refactorizaciones estructurales ni sustitución de funciones existentes.

## Cambios nuevos

| Módulo | Acción | Seguridad de los datos |
|---|---|---|
| `main.cjs` | Duplicar pestaña; copiar URL | No modifica la pestaña anterior; no cambia el perfil. |
| `session-io.cjs` | Exportar e importar colecciones JSON | Pestañas privadas excluidas; validación de URL, tamaño y esquema; sin importar contraseñas/cookies. |
| `main.cjs` | Exportar página a PDF | Archivo elegido por el usuario; contenido generado por Chromium; guardado mediante archivo temporal. |
| `app/ui.js` | Cinco entradas en el menú preexistente | Sin cambio en la portada, barra, tipografía, colores ni recursos. |
| `scripts/test-session-io.cjs`, `scripts/test-smoke.cjs` | Casos adicionales de regresión | Duplicados, no reemplazo de pestañas, límite de 30, PDF simulado. |
| `package.json` | 0.8.1 beta y `session-io.cjs` incluido en build | Sin nuevas dependencias ni servicios externos. |

## Archivos visuales protegidos

Sin cambios respecto a 0.8.0: `app/index.html`, `app/style.css`, `app/motion.js`, los 13 recursos `app/assets/`, `build/gravity.ico`. Se comprueba por SHA-256. `app/ui.js` cambia únicamente para mostrar opciones adicionales en el menú de herramientas, reutilizando el estilo aprobado.

## Comprobaciones realizadas

1. `npm test`: suite completa en Node.js con Electron simulado (incluye acciones nuevas). Aprobada.
2. `npm run test:visual`: coincidencia de los 16 archivos cubiertos por `VISUAL-BASELINE.json`. Aprobada.
3. Integración: exportar/importar pestañas, copiar enlace, duplicar, guardar PDF simulado y rechazar importaciones sin capacidad. Aprobada.
4. Versión `0.8.1-beta.1`; release-guard sigue impidiendo publicar la beta como si fuese estable. Aprobada.
5. Integridad del ZIP: manifiesto de SHA-256 revisado después de extraer.

## Limitaciones y pendientes de certificación

No se pudo comprobar el comportamiento de Electron real en Windows, servicios con sesión iniciada ni impresión PDF de sitios externos. La prueba integrada de PDF utiliza una respuesta simulada con cabecera `%PDF-`, por lo que **no verifica el renderizado PDF real**. El ZIP no contiene Electron binario, `node_modules`, un `.exe` firmado ni actualizaciones habilitadas. No confundir más funciones con preparación para un lanzamiento público.

## Uso responsable y reversión

Descomprimir en una carpeta distinta, mantener la versión funcional anterior y respaldar el perfil de `%APPDATA%\gravity-directo` antes de ejecutar la beta. Los conjuntos exportados pueden contener URLs con parámetros sensibles; no se suben a ningún servidor y su envío debe ser decisión del usuario. No eliminar archivos de Gravity 0.8.0 hasta terminar pruebas.
