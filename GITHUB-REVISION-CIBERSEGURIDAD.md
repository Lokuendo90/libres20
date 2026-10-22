# Revisión selectiva de proyectos públicos de ciberseguridad en GitHub · 21/10/2026

No existe una única biblioteca que convierta automáticamente cualquier navegador en inmune a ataques. El desarrollo debe comparar licencias, mantenimiento, costes, compatibilidad con la versión de Electron, y riesgos de introducir dependencias externas.

| Fuente | Qué aporta | Decisión en Gravity 1.1.1 |
|---|---|---|
| `electron/electron` / Security Checklist | Aislamiento de contexto, sandbox, permisos, navegación, ventanas, CSP | Conservar el endurecimiento vigente y añadir fullscreen de marco principal sin modal, sin abrir permisos sensibles. |
| `brave/adblock-rust` | Motor de filtros de red/cosméticos con sintaxis ampliada y buen rendimiento | Evaluado. NO incorporado sin pruebas de compilación para Electron y licencia. |
| `uBlockOrigin/uAssets` | Reglas comunitarias para anuncios, vídeo, antirrastreo y compatibilidad | Evaluado. No asumir que el motor parcial de Gravity soporta todo su formato. |
| `StevenBlack/hosts` | Dominios agregados de publicidad y malware con aportaciones de terceros | Evaluado. No importar a ciegas dominios falsos positivos; revisar atribuciones de sus sublistas. |
| `hagezi/dns-blocklists` | Listas DNS que bloquean dominios según niveles de intensidad | Evaluado. No insertar millones de reglas sin medir memoria, falsos positivos y licencias. |

**Implementado ahora:** autorización silenciosa selectiva de fullscreen, continuidad acotada para aviso de inactividad de YouTube, elementos cosméticos conocidos de anuncios y renovación HTTPS opcional (activa inicialmente) con frecuencia controlada, sin enviar historial.

**Pendiente de una siguiente auditoría real:** motor compatible con sintaxis completa EasyList/uBO, filtrado por proceso, reputación de dominios con fuentes autorizadas y licencia, control contra fugas de DNS/WebRTC, integración real con servicio de VPN si se decide incluirlo, evaluaciones de seguridad en Windows, pruebas reales de anuncios de vídeo, y revisión de dependencias del instalador.

**Nunca prometer:** «cero CAPTCHA», «cero anuncios en todas las páginas», «IP inventada», «100 % libre de malware» ni «imposible de hackear». Estas afirmaciones no pueden sostenerse técnicamente.
