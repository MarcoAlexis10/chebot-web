# Che Vení Concierge Beta V1 — recuperación e integración integral QA

**11 de noviembre de 2026 · OFFLINE / HELD · BETA V1 NO-GO.**

Se ejecutaron las dos prioridades pendientes: **31/31** casos Node de altas administrativas y **66/66** pruebas de las siete suites del runner backend original. Además, se importó realmente `index.js` y se conectó el JavaScript administrativo generado con los handlers originales mediante HTTPS local. **No se acredita navegador funcional, autenticación admitida, SQL nativo ni aptitud para lanzamiento.**

## Versiones recuperadas y publicaciones

Se leyeron primero WORK-HANDOFF.md y CLOSURE.md en `chebot-web@c8fe4939a9901cbd5774ed9a7d4fab0157b2e470`. Los tres HEADs remotos de origen coincidían con el handoff antes de modificar archivos.

| Componente | Base remota recuperada | Commit técnico publicado en rama nueva |
| --- | --- | --- |
| chebot-web | `c8fe4939a9901cbd5774ed9a7d4fab0157b2e470` | [`f79d5543ac69469dbcf44b1e76f422cd86a49e00`](https://github.com/MarcoAlexis10/chebot-web/commit/f79d5543ac69469dbcf44b1e76f422cd86a49e00) |
| chebot-backend | `569612e82c54f8f0bec5bd42e3a2aca47c70cb13` | [`9beb837a621f9a8f06601043afa64b3bba317cb5`](https://github.com/MarcoAlexis10/chebot-backend/commit/9beb837a621f9a8f06601043afa64b3bba317cb5) |
| cheveni-qa-lab | `ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a` | Sin modificaciones; cierre PARCIAL leído, Native17 no ejecutado |

Rama nueva en web y backend: **`qa/cheveni-integral-held-20261111`**. Commits con `[skip ci]`, sin merges ni force-push. El commit que contiene este documento añade la consolidación documental al commit técnico web; no se atribuye a este archivo un hash de commit autorreferencial.

El clone web recuperó los **243 archivos originales**. El clon privado backend falló por autenticación: se recuperó el árbol completo con el conector, aprovechando archivos locales sólo cuando coincidían por Git blob y obteniendo los restantes 359 desde GitHub. Se verificaron **2076/2076 archivos originales**, se reconstruyó su árbol Git `68ff123c7dc7035c96ee5e93f55d2ff2bf7fea3f` y el commit original exacto. No se sustituyeron imports por fuentes aisladas o shims para ejecutar las suites.

## Ejecuciones efectivas y correcciones

Node **v24.22.1**. Los comandos finales y hashes de sus logs están en [TEST-EVIDENCE.json](TEST-EVIDENCE.json).

| Ejecución | PASS | FAIL final | SKIP | Alcance real |
| --- | ---: | ---: | ---: | --- |
| Suite administrativa Node pendiente | 31 | 0 | 0 | Fuente real fijada, clasificador extraído por el test original; no navegador |
| Runner original: siete suites backend | 66 | 0 | 0 | Sucesores QA retenidos y signup original; sin SQL ni autenticación activa |
| Regresiones del guard del runner | 14 | 0 | 0 | Repetición justificada por modificación del ejecutor |
| Regresiones web administrativas afectadas | 18 | 0 | 0 | Build y ciclo de vida administrativo; DOM/transportes de fixture |
| Cadena original conjunta nueva | 17 | 0 | 4 | Imports reales, HTTPS local, inline JS generado en VM; navegador bloqueado |

Son **146 resultados PASS finales**, no 146 pruebas históricas nuevas ni un total acumulado entre intentos. Hubo fallos intermedios, conservados en [FAILURE-HISTORY.json](FAILURE-HISTORY.json) y los logs correspondientes.

**Runner:** la primera ejecución sí lanzó sus siete suites y reportó 66 pruebas aprobadas, pero produjo resumen con contadores `null`: Node eligió un reporter humano y el ejecutor sólo analizaba TAP. La primera shell no conservó por separado el exit del runner. Se corrigió únicamente la selección explícita `--test-reporter=tap`, y se actualizó el pin dependiente en su test de guard. La repetición cerró con resumen `66/66, fail=0, skipped=0, exitCode=0`. No se alteraron manifiestos, pins de módulos/suites, verificaciones de entorno ni guards para obtener PASS.

**Fixtures administrativos:** inicialmente hubo tres fallos; tras completar fixtures de navegador quedaron dos, y después cerraron 18/18. Faltaban `window.crypto.randomUUID`, URL, webOrigin y metadata válida de capacidad. El ensayo de respuesta tardía iniciaba un GET durante un POST, cuando la consola real lo suprime correctamente; ahora inicia la lectura antes de la mutación. No se cambió código de negocio de la consola.

**Build original:** `npm run build` terminó con exit 0 usando únicamente configuración pública ficticia, dentro de namespace sin egress. Produjo 33 archivos; compilaron 13 scripts generados de managers. La puerta legal devolvió `NO_OWNER_LEGAL_PUBLICATION_APPROVAL`; no se creó ningún manifiesto de aprobación. Hashes en [BUILD-OUTPUTS.json](BUILD-OUTPUTS.json).

## Aislamiento acreditado

Las ejecuciones se realizaron bajo `unshare --user --map-root-user --net` y entorno saneado. El launcher reproducible [run-isolated.py](../../integral-held-v1/run-isolated.py) registra namespace padre/hijo distintos, ausencia de rutas externas y rechazo del socket externo con **ENETUNREACH, errno 101**. Sólo para HTTPS local habilita loopback mediante ioctl; no agrega rutas externas. Su evidencia aparece al principio de `original-chain-final.tap` y `generated-syntax.log`.

No se heredaron credenciales operativas. Antes de importar los módulos originales se verificaron **37 archivos del cierre backend y 14 fuentes web** fijadas en [SOURCE-PINS.json](../../integral-held-v1/SOURCE-PINS.json). La frontera de transporte de proveedor se instrumentó adicionalmente para fallar ante cualquier intento; se observaron **cero intentos de proveedor**. No se sustituyó ningún handler, Auth ni guard legal original.

## Integración comprobada y límites

La suite nueva interpreta **localmente** las coincidencias exactas de `backend/vercel.json`, importa sus destinos originales y sirve HTTPS en `127.0.0.1` dentro del namespace. **No ejecuta la plataforma Vercel** ni acredita sus rewrites, despliegue o infraestructura.

Se verificaron las nueve URLs presentes en el frontend generado: `session`, `properties`, `stays`, `invites/send`, `incidents`, `requests`, `knowledge`, `incidents/state` y `requests/decision`. Se probaron GET, POST, OPTIONS, PUT, DELETE y HEAD bajo los guards actuales. Las ocho rutas con envoltura externa permanecen en 503 antes del método/Auth/payload; la ruta de invitación conserva 204 OPTIONS, 503 POST por privacidad y 405 para métodos no admitidos. **La retención de operaciones no demuestra que los caminos activos posteriores sean compatibles.**

También se comprobó la cadena original `signup-request -> vercel.json -> index.js -> concierge-manager-signup.js`, mediante import e invocación reales. El path es `/api/concierge/manager/signup-request`, no `/signup`. Su preflight Preview devuelve 204 para el origen canónico fijo, 403 para el origen ficticio del build, y las peticiones al handler permanecen en 503 legal. `signup-admin` pasa realmente por `index.js` y conserva el rechazo externo con o sin clave de intención.

Hubo **67 intercambios HTTPS locales**, **cero lecturas de `req.body`** en los handlers retenidos, cero admisiones y cero llamadas a proveedores. El verificador Auth original y el binding de escritura rechazaron las credenciales/contexto ficticios; no se probó Auth exitoso, refresh, revocación real ni acceso privado.

El **inline JavaScript administrativo completo del build** consumió respuestas de HTTPS y `index.js` originales en una VM Node con DOM simulado. Se comprobó ocultamiento ante el 503, persistencia de identidad durable antes de enviar, limpieza ante rechazo exacto y conservación/bloqueo de reenvío si se pierde el comprobante. Los submits son eventos sintéticos sobre una pantalla que sigue oculta. El transporte Node permite leer cabeceras/cuerpo y **no aplica CORS de navegador**. No se verificó idempotencia SQL ni una operación de negocio admitida.

**CORS:** por HTTP, ocho rutas devuelven el 503 externo sin `Access-Control-Allow-Origin`, incluido OPTIONS; `signup-admin` presenta el mismo comportamiento. `invites/send` conserva sus cabeceras originales. El origen fijo de signup-request tampoco coincide con el build ficticio. No se abrió ni se relajó CORS. La visibilidad real en navegador queda pendiente.

**Chromium:** se intentó arrancar dentro del aislamiento y falló antes de ejecutar aserciones por `ProcessSingleton socket() failed: Operation not permitted`. La primera versión produjo 18 fallos de hook compartido, no 18 fallos de aplicación; se separó el resultado de HTTP del bloqueo ambiental. Los cuatro casos preparados de navegador están **SKIP / NOT_EXECUTED**. Detalle en [OBSERVATIONS.json](../../integral-held-v1/OBSERVATIONS.json). No se salió del aislamiento para intentar hacerlos pasar.

## Registro automático de Actions, sin job ejecutado

La revisión previa a crear la rama backend omitió un trigger heredado **`create`** de `cheveni-native-ci-only.yml`; `[skip ci]` no evita ese evento. GitHub registró automáticamente el [run 43030384144](https://github.com/MarcoAlexis10/chebot-backend/actions/runs/43030384144) sobre la base `569612e8…`. La condición de rama del job era falsa: **conclusion=skipped, runner_name=null, steps=[]**. No hubo dispatch manual, runner asignado, pasos ni PostgreSQL ejecutados. Web devolvió cero registros de runs para esta rama al consultar. No se afirma que backend tenga cero registros. Evidencia en [ACTIONS-EVENT.json](ACTIONS-EVENT.json) y [WORKFLOW-REVIEW.json](WORKFLOW-REVIEW.json). No se crearon más ramas backend después de detectar este evento ni se modificaron workflows.

## Candidato offline y decisión GO/NO-GO

[RELEASE-CANDIDATE.json](RELEASE-CANDIDATE.json) fija commits/árboles, resultados y alcance del candidato **retenido, no desplegable**. [ENVIRONMENT-REFERENCE.json](ENVIRONMENT-REFERENCE.json) contiene configuración pública ficticia y nombres de variables, sin valores secretos. El identificador DEV exigido por el build original es una limitación de fuente, no un target remoto autorizado. [MIGRATION-INVENTORY.json](MIGRATION-INVENTORY.json) enumera 310 SQL con hashes: **no es un orden de instalación, no hay bundle aprobado y no se ejecutó SQL**.

| Condición | Estado |
| --- | --- |
| Dos suites pendientes prioritarias y cierre HTTP original retenido | Completados dentro del alcance descrito |
| Frontend original en navegador y CORS efectivo | Pendientes; Chromium bloqueado y cabeceras observadas incompatibles con lectura desde el browser |
| Auth vigente, revocación y fences transaccionales | No acreditados por pruebas que fallan cerrado antes de admitir operaciones |
| Idempotencia SQL / concurrencia / reconciliación real | Pendientes; sólo intención cliente y no reenvío comprobados aquí |
| Native17, scope independiente, roles/owners/ACL/RLS | Cierre parcial; preflight NO-GO, autorización separada requerida |
| Recuperación integral A2, retención D02-A y legal | Sin nuevo cierre integral; no se repitieron auditorías ni se levantaron bloqueos |
| Bundle/destino real, comunicaciones y operación comercial | No autorizados ni ejecutados |

El [CHECKLIST.md](CHECKLIST.md) incluye las condiciones y una secuencia futura de activación/reversión **descriptiva, no ejecutable**. No se tocaron main, DEV, producción, DNS, Vercel remoto, Supabase remoto o ASUS. No despliegues, cron, mensajes, correos, datos personales de prueba, cobros, firmas de autorización ni contratación de servicios.

**Próximo paso de mayor valor:** ejecutar los cuatro casos de navegador ya preparados en un laboratorio que permita Chromium y conserve aislamiento acreditado. Después, resolver el desacuerdo CORS/destino y obtener evidencia independiente de los caminos activos bajo revisión separada; no abrir guards para completar QA. Native17 no se puede ejecutar con esta autorización. Evitar otra auditoría general o repetir los 31/66 casos sin cambio que lo justifique.

El piloto sigue limitado a **CABA, un manager fundador, una propiedad y 30 días gratuitos sin cobro automático**; Che Vení Free queda separado. **Beta V1 continúa NO-GO.** Integridad de los archivos de entrega en [FILE-HASHES.json](FILE-HASHES.json).
