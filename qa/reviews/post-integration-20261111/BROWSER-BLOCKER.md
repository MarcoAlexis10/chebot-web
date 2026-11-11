# Chromium: diagnóstico acotado y salida segura

El cierre anterior registró `ProcessSingleton socket() failed: Operation not permitted` antes de cualquier aserción de navegador. Este lote investigó la operación concreta sin ejecutar las 17 pruebas anteriores.

`chromium-diagnostic.py` usa el binario empaquetado existente `/usr/lib/chromium/chromium`, perfil temporal nuevo, sin wrapper de distribución, sin descargas y con sandbox habilitado. Compara dos namespaces nuevos: mapeo root y mapeo del usuario actual. En ambos verifica un namespace de red distinto, ausencia de rutas externas y ENETUNREACH hacia una IP externa. No establece conexiones externas.

| Observación | Mapeo root | Mapeo usuario actual |
| --- | --- | --- |
| AF_UNIX stream/datagram | EPERM | EPERM |
| AF_NETLINK stream/datagram | EPERM | EPERM |
| AF_INET stream/datagram | socket creado, sin egress | socket creado, sin egress |
| socketpair AF_UNIX stream/datagram | creado | creado |
| Seccomp / NoNewPrivs observados | 2 / 1 | 2 / 1 |
| Arranque Chromium con sandbox habilitado | Rechaza ejecutar como root | Aborta por el mismo ProcessSingleton socket EPERM |

La denegación se reproduce al crear AF_UNIX, antes de bind/connect o de considerar una URL del panel. Cambiar perfil, wrapper o UID no la resolvió. Seccomp está activo, pero no se inspeccionó su filtro ni se atribuye con certeza la denegación a una regla particular o a un propietario concreto de política.

**Resultado:** no hay solución autorizada acreditada con el binario y las capacidades de este entorno. No se quitaron filtros, no se deshabilitó sandbox, no se usó single-process/LD_PRELOAD, no se instaló otro navegador ni se ejecutó fuera del aislamiento. El diagnóstico terminó correctamente; los dos arranques del navegador fallaron. Un exit 0 del diagnóstico no es un PASS de Chromium.

Las cuatro pruebas preparadas siguen **NOT_EXECUTED en este lote**, no cuatro nuevos PASS ni una repetición del SKIP anterior. No se hizo una nueva validación de CORS en navegador. Las observaciones HTTP anteriores se conservan como evidencia anterior, no como una ejecución nueva.

Para un intento futuro se necesita un laboratorio que permita el IPC Unix requerido por Chromium y su sandbox manteniendo cero rutas externas, perfil efímero, ausencia de credenciales y sólo servicios locales de fixture. Eso es una condición del laboratorio, no una autorización para modificar la política del host actual, crear infraestructura, usar ASUS o activar Actions. El bootstrap debe aprobar antes de intentar las pruebas del panel.

Evidencia exacta: `../../post-integration-20261111-v1/CHROMIUM-DIAGNOSTIC.json` y `post-chromium-diagnostic.log`. CORS efectivo y Beta V1 siguen sin GO.
