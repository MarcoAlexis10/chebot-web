# Che Vení — continuación posterior a integración · 11/11/2026

**QA OFFLINE · DELTA COMPLETADO · CHROMIUM BLOQUEADO · BETA V1 NO-GO.**

Se investigó el bloqueo de Chromium sin desactivar sandbox ni habilitar egress. No quedó resuelto en este entorno y **no se ejecutaron las cuatro pruebas de navegador**. Se corrigió un defecto real del feedback del panel y se consolidó el siguiente cierre dirigido de seguridad, recuperando Native17/A2 sin repetir sus pruebas.

## Versiones y publicación

Se leyó primero el cierre integral de `f2944f76af51b979f8d268ab445460b723adecbd`. Antes de modificar archivos, los HEADs remotos coincidían con los tres indicados por el propietario. Se volvieron a consultar durante la consolidación.

| Repositorio | HEAD de entrada | Resultado |
| --- | --- | --- |
| chebot-web | `f2944f76af51b979f8d268ab445460b723adecbd` | Delta técnico publicado en [`5f70ab215d52f9820a1af256ab36e092feb9ffd7`](https://github.com/MarcoAlexis10/chebot-web/commit/5f70ab215d52f9820a1af256ab36e092feb9ffd7) |
| chebot-backend | `9beb837a621f9a8f06601043afa64b3bba317cb5` | Sin modificaciones ni nueva rama |
| cheveni-qa-lab | `ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a` | Sólo lectura dirigida; sin modificaciones o SQL |

Se continuó sobre la rama QA web existente **`qa/cheveni-integral-held-20261111`**, sin crear ramas, merges o force-push. El commit contenedor de este documento añade el cierre/manifiestos al commit técnico anterior; no se inventa un hash de commit autorreferencial.

## 1. Chromium: investigación y límite encontrado

El diagnóstico reproducible [chromium-diagnostic.py](../../post-integration-20261111-v1/chromium-diagnostic.py) compara dos namespaces nuevos: root y usuario actual. En ambos acredita namespace de red distinto, ausencia de rutas externas y `ENETUNREACH` al intentar conectar a una IP externa. Las llamadas `socket(AF_UNIX, SOCK_STREAM/DGRAM)` y AF_NETLINK reciben **EPERM**; AF_INET y socketpair funcionan. Seccomp=2 y NoNewPrivs=1 están observados, pero no se atribuye la denegación a una regla concreta cuyo filtro no se inspeccionó.

Se intentó el **binario instalado directamente**, con perfil temporal nuevo y sandbox habilitado. Con mapeo root rechaza ejecutar sin desactivar sandbox; con usuario actual aborta por el mismo **`ProcessSingleton socket() failed: Operation not permitted`**. No es una comprobación del panel ni de CORS: el fallo ocurre antes.

No se quitaron filtros, no se usó `--no-sandbox`, single-process, LD_PRELOAD o un proxy, no se descargó otro navegador ni se ejecutó fuera del aislamiento. El diagnóstico tiene exit 0 porque pudo medir y guardar el fallo; **los dos bootstraps de Chromium fallaron**. Los cuatro casos anteriores siguen **NOT_EXECUTED en este lote**, no cuatro PASS ni nuevos SKIP ejecutados. Detalle y requisitos del próximo laboratorio en [BROWSER-BLOCKER.md](BROWSER-BLOCKER.md), con resultados exactos en [CHROMIUM-DIAGNOSTIC.json](../../post-integration-20261111-v1/CHROMIUM-DIAGNOSTIC.json).

## 2. Defecto real corregido en el panel

`restoreSession()` convertía cualquier fallo de verificación en **“Tu sesión venció”**, incluso un fetch ilegible o un HTTP 503 retenido. Esos resultados no prueban expiración.

Se cambió únicamente ese feedback por **“No pudimos comprobar tu sesión. El panel sigue cerrado por seguridad.”** Los 401/403 legibles actuales conservan el manejo existente de rechazo en `fetchAuth`. El ocultamiento del panel, limpieza del token/datos, generación de página, Auth, CORS, privacidad, guards y protocolos no se modificaron. No se diagnostica CORS a partir de un TypeError.

Git blob del generador `manager-auth-v1.js`: **`1199d0fa8aa80a6ed452f3f108ae570dcdc238a5` → `e6addc4602c28cf0d057a529927be563a2a9c8e4`**. SHA-256 corregido: **`4c02487ee3983f9f0c7b80e23338328433694719314314dfe5b744677360545a`**.

El build offline completo con la configuración pública ficticia terminó con **exit 0**, mantuvo 33 outputs y cambió por hash **sólo `manager/manager-auth.js`**. La puerta legal sigue en `NO_OWNER_LEGAL_PUBLICATION_APPROVAL`. El pin histórico no se alteró para forzar pruebas antiguas: [SOURCE-DELTA.json](SOURCE-DELTA.json) y [SOURCE-PINS.json](SOURCE-PINS.json) describen el candidato nuevo.

## 3. Pruebas ejecutadas y heredadas

| Ejecución nueva | Resultado | Alcance |
| --- | --- | --- |
| Diagnóstico de sockets y dos bootstraps seguros | Diagnóstico exit 0; Chromium no arrancó | Medición de entorno, cero aserciones del panel |
| Regresión focalizada antes del fix | 1 PASS / 2 FAIL | Reprodujo mensaje falso para fetch ilegible y 503 |
| Misma regresión después del fix | **3 PASS / 0 FAIL / 0 SKIP**, exit 0 | JavaScript completo generado, VM Node con DOM/transporte simulados |
| Build original offline | Exit 0; 33 outputs, uno modificado | Artefactos reales del frontend, sin despliegue |

Los tres casos comprueban fetch ilegible, 503 legible y 401 legible; mantienen cerrado el panel, limpian el token/datos y realizan sólo la verificación GET ficticia. **No son pruebas Chromium ni un motor CORS.** Node v24.22.1. Comandos y hashes de logs en [TEST-EVIDENCE.json](TEST-EVIDENCE.json).

**No se repitieron** las suites acreditadas 31/31, 66/66, 14/14, 18/18 o las 17 pruebas con 67 intercambios HTTPS. Esa evidencia sigue vinculada al cierre/commits originales. No se contabiliza otra vez como pruebas nuevas ni se afirma una nueva validación completa del candidato modificado.

La [CORS-PANEL-MATRIX.md](CORS-PANEL-MATRIX.md) conserva las nueve rutas y signup: ocho rutas, más signup-admin, tenían 503 externo antes de CORS; invites/send conserva su comportamiento original; signup-request conserva origen Preview fijo y HOLD legal. Son **observaciones HTTP heredadas**, no resultados de navegador de hoy. No se abrió ni se relajó CORS.

## 4. Cierre dirigido de seguridad preparado

Se recuperaron **14 evidencias seleccionadas** de Native17/A2, cotejadas con sus blobs actuales, y se fijaron 13 fuentes concretas del gateway/SQL/frontend. No se recorrieron otra vez las suites ni se repitió una auditoría general. Referencias: [REUSED-EVIDENCE.json](REUSED-EVIDENCE.json), [SECURITY-SOURCE-PINS.json](SECURITY-SOURCE-PINS.json) y [SECURITY-CONTRACTS.md](SECURITY-CONTRACTS.md).

Hallazgos que impiden atribuir seguridad operativa al candidato:

- **Revocación JWT:** el gateway contiene las verificaciones y checkpoints, pero su export seleccionado no conecta `getRecoveryProof` ni un journal esperado; permanecen valores cerrados por defecto. Native17 declara Auth sintético y triggers futuros no instalados. No se acreditó Auth administrado ni cobertura de todos los revocadores.
- **Refresh:** el frontend toma access_token; no implementa grant_type=refresh_token ni almacena refresh token. Restaurar la sesión del token existente no es refresh. No se implementó ni probó refresh automático o su interacción con revocación.
- **Concurrencia:** los borradores describen fences y las respuestas UNKNOWN tras despacho. No se probó el orden entre revocación, efectos y COMMIT nativos. Un lock declarado no demuestra que todos los actores participen.
- **Protocolos distintos:** el backend seleccionado apunta al RPC público histórico `concierge_manager_write_idempotent_v2`, mientras el lab propone puertos privados `scope_v2/write_v2/readback_v2` y frames CBF1. **No son equivalentes por llamarse “v2” y no están conectados.** No se propuso fallback REST, publicación de helpers o DML general.
- **Reconciliación:** existe borrador SQL; en el router/gateway raíz seleccionados no hay una ruta conectada que lo convierta en un servicio acreditado. Ausencia de receipt/fila mantiene UNRESOLVED, no autoriza reenviar. COMMIT externo y readback con autoridad actual siguen pendientes.
- **A2:** la evidencia histórica post-COMMIT corresponde a un fixture y un JSON de logs normalizados; sus 12 comprobaciones declaradas no son pruebas nuevas. Auth funcional, Vault, Storage y revocaciones independientes no quedaron restaurados por ese ensayo. Los documentos A2 mantienen pendiente recuperación integral del release exacto y floors/witness externos actuales.

[ACCEPTANCE-REQUIREMENTS.json](ACCEPTANCE-REQUIREMENTS.json) delimita ocho requisitos de evidencia para JWT previo, refresh, carrera revocación/escritura, unicidad durable, conflicto, ACK perdido, expiración tardía y restore/floors. **Son requisitos preparados, no tests ejecutados ni una autorización de PostgreSQL/Auth.**

## 5. Candidato integral y condiciones de salida

[RELEASE-CANDIDATE.json](RELEASE-CANDIDATE.json) fija web técnico **`5f70ab215d52f9820a1af256ab36e092feb9ffd7`**, backend **`9beb837a621f9a8f06601043afa64b3bba317cb5`** y laboratorio **`ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a`**. Su compatibilidad es **HELD_HTTP_CONTRACT_ONLY**, no operativa. No selecciona bundle SQL, no habilita despliegue y conserva la limitación DEV del build y el inventario de migraciones anterior.

La matriz [GO-NO-GO.md](GO-NO-GO.md) mantiene bloqueados navegador/CORS real, autoridad vigente/revocación, writer privado/COMMIT/idempotencia/reconciliación, Native17, A2, legal y operación. La corrección del texto del panel no resuelve esos gates.

## Publicación y límites

Los dos workflows web conservan sus triggers anteriores, filtrados a otras ramas; no se modificaron. No se crearon ramas backend ni de ningún otro repositorio, evitando repetir el evento create anterior. El commit técnico web devolvió **cero runs por head_sha** al consultar. No hubo dispatch, cambios de workflows, cron, despliegues o nueva infraestructura. El registro backend create/skipped del lote anterior se conserva como antecedente, no como evento nuevo de esta ejecución.

No se tocaron DEV, producción, main, DNS, Vercel/Supabase remotos, ASUS, datos personales o credenciales reales. No mensajes, correos, usuarios, invitaciones, cobros, gasto iniciado, SQL/restore, claves o firmas de autorización. No se desactivó ningún bloqueo legal/Auth/privacidad.

**Próximo paso concreto:** acreditar un laboratorio de navegador que permita IPC Unix y sandbox manteniendo aislamiento; aprobar su bootstrap antes de los cuatro casos pendientes. En paralelo, cerrar la composición concreta gateway/puertos privados con las fuentes ya fijadas. Native17/Auth/A2 operativos requieren su autorización y evidencia separadas; no se ejecutan por este cierre offline.

El piloto sigue siendo **CABA, un manager fundador, una propiedad, 30 días gratis sin cobro automático y Free separado**. **Beta V1 continúa NO-GO.** Los hashes de la entrega están en [FILE-HASHES.json](FILE-HASHES.json).
