# Informe de desarrollo: Gravity PRO 0.6.1-beta.1

**Fecha:** 21 de octubre de 2026  
**Base:** Gravity PRO 0.6.0-beta.1  
**Objetivo:** corregir riesgos concretos de la auditoría sin alterar la interfaz aprobada.

## Resumen ejecutivo

Esta versión contiene correcciones reales en código y pruebas automatizadas de regresión para el guardado de favoritos, aislamiento de sesiones privadas y cuotas de ventanas emergentes. Se preservó el perfil histórico `gravity-directo`, la interfaz negro/dorado, el HTML, CSS, animaciones y recursos gráficos de 0.6.0.

| Hallazgo anterior | Resultado actual | Cómo se comprobó |
|---|---|---|
| G-01, desaparición de >1.000 favoritos | CORREGIDO EN CÓDIGO | Importación, exportación, persistencia y reapertura simuladas con 1.006 entradas; exportación 20.000 en prueba de unidad |
| G-02, controladores privados acumulados | CONTROLADORES Y REFERENCIAS RETIRADOS | 26 ciclos de abrir/navegar/cerrar sin listeners/permisos retenidos por Gravity, comprobación de limpieza asíncrona simulada |
| G-03, popups ilimitados | CUOTAS AGREGADAS | Tests de límites por pestaña, globales, por minuto y cierre forzado |
| G-04, publicación no verificada | PREPARACIÓN PARCIAL | Script Authenticode, CI manual beta y prueba del guardarraíl de publicación |
| Identidad visual | NO MODIFICADA | Test SHA-256 de 16 archivos originales; comparación binaria con 0.6.0 |

### Aspectos técnicos de interés

- Límite de favoritos para **nuevas** importaciones/adiciones: 20.000. No se destruyen datos de perfiles anteriores que ya lo superen. El formato HTML de importación admite hasta 16 MB; exportaciones por encima de ese tamaño se rechazan con aviso, no se recortan en silencio.
- Las acciones sobre favoritos solicitan guardado sin demora y no confirman éxito si el guardado falla. Sigue existiendo un límite del perfil local JSON de 8 MB para proteger de archivos desmesurados; para mayor escala se aconseja migración transaccional a SQLite antes de la 1.0.
- Se pueden permitir hasta cuatro ventanas emergentes reales, como máximo dos por pestaña, con límite de solicitudes por minuto. Hay que validar flujos OAuth/3DS/pagos para ajustar la política sin exponer al usuario a abusos.
- La limpieza de sesiones privadas retira las referencias gestionadas por Gravity. No equivale a afirmar que Chromium libera toda la RAM inmediatamente ni que se ha probado una sesión privada real en Windows.
- `npm run release:guard` sigue bloqueando el lanzamiento público y `npm run verify:signature` exige que el instalador generado tenga firma Authenticode válida. Ninguna credencial de firma forma parte del código.

## Evidencia y limitaciones

En este entorno pasaron `npm test`, `npm run release:guard` (bloqueando correctamente) y verificaciones de integridad. **No se ejecutó Electron nativo ni se creó un instalador .exe firmado en Windows**. `npm install --package-lock-only` falló porque el entorno no podía resolver el dominio de npm. El paquete es fuente completa para usar con Node.js y un iniciador BAT, no una distribución pública lista para instalar.

Se recomienda probar 0.6.1 en carpeta separada y con copia del directorio `%APPDATA%\\gravity-directo` realizada con la aplicación cerrada. Ver `docs/PRUEBAS-REALES-WINDOWS.md` y `CHECKLIST-LANZAMIENTO-PUBLICO.md`.

## Dictamen

**Nivel: beta avanzada, fase 4 (corrección de estabilidad y preparación).** No se puede declarar nivel profesional final hasta completar validación nativa, firma, políticas de actualización, revisión de seguridad y soporte. Se mantuvo la identidad visual sin rediseño.

## Documentación oficial de referencia

- https://www.electronjs.org/docs/latest/tutorial/security
- https://www.electronjs.org/docs/latest/api/session
- https://www.electronjs.org/docs/latest/api/web-request
- https://www.electron.build/v26/docs/win/
- https://www.electron.build/docs/features/auto-update/
