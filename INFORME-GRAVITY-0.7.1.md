# Gravity PRO 0.7.1-beta.1 — corrección urgente de audio

## Incidencia reproducida

En Gravity 0.7.0, el manejador `audio-state-changed` leía `details.audible` desde el segundo argumento. En Electron, el dato documentado es `event.audible` en el propio objeto Event. Si `details` era `undefined`, se producía `TypeError` en el proceso principal, como en la captura aportada por el usuario.

## Corrección aplicada

- Nuevo módulo `audio-state.cjs` con lectura defensiva del estado audible.
- Manejo del evento documentado (`event.audible`).
- Compatibilidad defensiva con una firma alternativa booleana.
- Respaldo opcional con `webContents.isCurrentlyAudible()`.
- Si el estado no está disponible, conserva el último valor conocido en vez de lanzar una excepción.
- Pruebas automatizadas para `true`, `false`, argumentos ausentes, método de respaldo que falla, firma alternativa y retirada del listener.
- El nuevo módulo está incluido en el empaquetado y en la comprobación de sintaxis.

## Verificación realizada en este entorno

- Prueba unitaria específica del evento de audio: aprobada.
- `scripts/check.cjs`: aprobada.
- Pruebas de regresión del proyecto: se ejecutan individualmente; los resultados se registran en `CAMBIOS-Y-PRUEBAS.md`.
- Integridad SHA-256 del paquete: se regenera tras la edición.
- Recursos visuales originales: se comparan contra la versión 0.7.0 y no se editan en este hotfix.

## Límites

Este hotfix se ha probado con Node y eventos simulados, pero no puede certificarse hasta ejecutar Gravity con Electron real en Windows. La corrección se dirige a la excepción indicada; no demuestra por sí sola compatibilidad total con YouTube ni reproducción multimedia.
