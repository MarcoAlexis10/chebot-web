# Che Vení — autoridad protegida y paquete Native17 retenido

11 de noviembre de 2026. **Resultado: avance de código/contratos exclusivamente offline. Beta V1 NO-GO.** Se prepararon revisión de autoridad derivada de estado protegido, admisión separada del efecto, binding del proveedor y un paquete SQL/ACL/RLS/captura retenido. Ninguna operación quedó habilitada ni se acreditó una integración real Auth–SQL–journal.

## Versiones y publicaciones

| Repositorio/rama | HEAD inicial verificado antes de escribir | HEAD de fuentes al consolidar |
|---|---|---|
| chebot-web / qa/cheveni-integral-held-20261111 | a5922972fa76a09fc210f553abbed53e2970d3bc | 2869f5793c600c9dc74655fd1ab7633009b05fdd |
| chebot-backend / qa/cheveni-integral-held-20261111 | 9beb837a621f9a8f06601043afa64b3bba317cb5 | Igual; sólo lectura |
| cheveni-qa-lab / qa/cheveni-native17-policy-closure-20261106 | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a | Igual; sólo lectura |

- [c14d7868c05e1f5eb897fb62f99594a987fbff52](https://github.com/MarcoAlexis10/chebot-web/commit/c14d7868c05e1f5eb897fb62f99594a987fbff52): primer checkpoint de binding, contador/hook y admisión, `[skip ci]`.
- [2869f5793c600c9dc74655fd1ab7633009b05fdd](https://github.com/MarcoAlexis10/chebot-web/commit/2869f5793c600c9dc74655fd1ab7633009b05fdd): cierre de ACL/contextos, transporte ligado al proveedor y prerrequisitos, `[skip ci]`.
- El commit contenedor de este CLOSURE añade el sello final y manifiestos, también con `[skip ci]`. Es el HEAD final documental; su SHA se verifica después de publicar y figura en el enlace directo de entrega, evitando un hash circular en su propio contenido.

Se volvieron a leer los tres HEADs al consolidar. No se detectaron avances concurrentes. La comparación con a5922972 mostró cambios sólo en los dos directorios QA nuevos: producto, paquetes anteriores y workflows intactos. Backend y Native17 no se escribieron. Sin ramas nuevas, merges, resets, force o Actions; leases expected_sha y triggers verificados antes de publicar. Ver [PUBLICATION-CHECKS.json](PUBLICATION-CHECKS.json).

## Código y dependencias reducidas

Paquete [incident-native17-review-20261111-v1](../../incident-native17-review-20261111-v1/README.md): **20 archivos**, incluidos siete SQL retenidos, dos generadores de texto, binding/compilador, política de revisiones, tipos, pruebas y expectativas de catálogo/hooks. [PACKAGE-MANIFEST.json](PACKAGE-MANIFEST.json) fija SHA256 y Git blobs; [SQL-ARTIFACTS.json](SQL-ARTIFACTS.json) enumera orden, firmas y límites de aprobación.

| Problema concreto | Implementación candidata | Límite vigente |
|---|---|---|
| current_revisions anterior sólo devuelve cero filas | Clock sin seed/default, incremento atómico y lectura que exige cut externo exacto con provenance/frescura | Bootstrap, witness y bridge protegidos no acreditados; gates permanecen cerrados |
| Cambiar el status del incidente podría invalidar su propio write si incrementara autoridad indiscriminadamente | Comparación de columnas de relación en transiciones, hooks conservadores de autoridad y fences sin incremento para bookkeeping | Orden real de revocadores/locks y COMMIT no ensayados |
| Reservar intent_binding antes del efecto haría que el writer confundiera la primera ejecución con un replay | admission_v2 separado: NEW/KNOWN y claim conservan historia antes de crear bindings del efecto | CAS/constraints entre procesos y custodia original pendientes |
| ABI 16/9 no representa la referencia del proveedor; p_floor no permite campos extra | Entries y compilador 17/10 derivados de la fuente anterior, preservando argumentos/floor y añadiendo sólo providerBindingRef | Attestor/canal/driver reales faltantes; sin fallback al entry antiguo |
| Una referencia del original elegida por el caller no prueba procedencia | Lookup privado por user/intent; capacidad SDK efímera, no token/hash/payload en metadatos durables | Custodia/D02-A y attestor reales no implementados |
| Grants calculados por owner ignoraban el contexto conservado por SECURITY INVOKER | FAIL estático reproducido y corregido: propagación transitiva del rol efectivo y cambio de contexto sólo en SECURITY DEFINER | Catálogo/ACL efectivas reales y dependencia completa aún pendientes |
| El autorizador y el negocio invoker necesitan columnas no incluidas en la propuesta anterior | SELECT de los seis flags y del miembro/permisos bajo los owners correctos; policies por SELECT/INSERT/UPDATE | Source context RLS sigue denegatorio; no se amplían permisos instalados |
| Un cut del modelo podía omitir provenance/COMMIT/frescura | FAIL reproducido y corregido; NULL/futuro/vencido/dataset/epoch/versiones distintos quedan HELD | Eso no verifica una firma, witness o COMMIT real |

[CONTRACT-DELTA.md](CONTRACT-DELTA.md) desarrolla las relaciones y el orden. El paquete declara **ocho roles**, **33 funciones** de revisión/base, **cinco entries** para tres logins y **30 hooks** propuestos. Los tres owners de código, Data y Revision son NOLOGIN; el reader no recibe DML o entries de escritura. Los grants son por columna y por contexto efectivo, sin membresías/SET a owners.

Las revisiones no se inventan ni provienen de metadata JWT. Una revisión de autoridad no equivale a restrictionSequence. El COMMIT de un revocador tampoco actualiza mágicamente un witness independiente: hasta observar el cut exacto, la admisión se retiene. El orden de GoTrue/journal externos aún necesita un puente acreditado; las observaciones antes/después no prueban atomicidad entre sistemas.

## Ensayo Native17 preparado, no autorizado

Se publicó [NATIVE17-EXECUTION-PREREQUISITES.md](NATIVE17-EXECUTION-PREREQUISITES.md), con los diez puntos solicitados: PostgreSQL 17.11 exacto, aislamiento, artefactos por hash, roles/operaciones, ensayos N01–N12, prohibiciones, evidencia, descarte, condición de costo cero y autorización adicional necesaria.

No se identificó un host apto ni se acreditó que ese laboratorio pueda ejecutarse gratuitamente. No se crearon recursos o gastos. Los namespaces que sirvieron para Node no prueban aislamiento de filesystem/PIDs/recursos apto para PostgreSQL. La guía no agenda ni autoriza procesos, SQL, Actions o servicios.

Los siete SQL **DO NOT APPLY/NOT RUN** abortan antes de DDL/consultas y terminan en rollback. No constituyen un instalador ni corresponde quitar líneas para ejecutarlos. El native gate original y las nuevas precondiciones siguen denegando; los bridges de floor/proveedor/original y RLS source context no están acreditados. Las policies de efecto sin providerRef mantienen denegación explícita por NULL. Hace falta una nueva materialización de laboratorio revisada por separado, con adaptadores sintéticos identificados y guards comerciales conservados.

La captura de catálogo es sólo texto no ejecutado: roles/SET/INHERIT/defaults/PUBLIC, owners, hashes de cuerpos, columnas/ACL/RLS, constraints/hooks, privilegios efectivos y dependencias. No consulta filas Auth/passwords/tokens. pg_depend no cubre por sí solo todas las referencias tardías de PL/pgSQL, operadores, casts o policies. No se afirma mínimo privilegio nativo por coincidir un JSON esperado.

## Pruebas efectivamente ejecutadas

Node **24.22.1**, launcher existente con entorno vacío y namespace nuevo de usuario/red, sin loopback/rutas externas y probe rechazado ENETUNREACH=101. No se levantaron servidores o infraestructura. [TEST-EVIDENCE.json](TEST-EVIDENCE.json) contiene comandos exactos, clasificación, nombres, conteos y SHA256 de los logs.

| Grupo | Resultado final | Alcance |
|---|---|---|
| Binding/proveedor/transporte | **9 casos únicos PASS** | Node con getClaims, attestor y CurrentResolution ficticios; no firma JWT real |
| Política de revisión/cut | **2 casos únicos PASS** | Funciones puras sobre datos sintéticos; no productor de autoridad real ni carrera SQL |
| SQL/ACL/hooks/captura | **6 casos únicos PASS** | Texto generado y expectativas estáticas; ningún parser/motor PostgreSQL |
| Generación | PASS estático, diez artefactos idénticos al regenerar | Hashes de texto, sin SQL ejecutado |
| Sintaxis | PASS estático JS/Python | node --check y generadores; TypeScript NOT_COMPILED, sin instalar dependencias |
| PostgreSQL/Auth real/COMMIT/journal/witness/A2 | **NOT_RUN** | Sin nueva acreditación nativa u operacional |
| Chromium | **Cuatro casos previos NOT_RUN** | No se repitió AF_UNIX/EPERM |

**17 casos nuevos únicos PASS = 9 con dobles + 2 de política pura + 6 estáticos.** Las repeticiones focalizadas no se suman. El nuevo transporte quedó comprobado contra las sentencias y todos los argumentos anteriores, sin perder providerRef, y rechaza receipt falsificado, bearer/attempt/floor alterados, getters y segundo write local. Esa reserva local no equivale a unicidad SQL.

Se conservan todos los fallos intermedios: ocho FAIL de fixture por colisión entre contador y objeto de claims, corregidos; un FAIL del cálculo transitivo de grants y uno del contrato de frescura/provenance, corregidos. No se los presenta como diez defectos operativos ni como nuevos casos. La evidencia final usa provider-abi-final y native-review-final, con los casos cambiados repetidos en bound-abi-focused, rls-invoker-final y cut-freshness-after.

No se repitieron los 22 casos ni las dos regresiones del cierre anterior, ni suites históricas. Sólo se importaron bibliotecas/fixtures fijados. Cero intercambios HTTP/HTTPS de integración nuevos. REVIEW_BOUND_CLAIM, REVIEW_BOUND_SQL_REQUEST y REVIEW_CUT_MATCHED conservan held/fixtureOnly y flags de acreditación falsos; ninguno habilita una operación comercial.

## Bloqueos y candidato

Quedan sin acreditar la fuente independiente de autoridad/restricciones, los revocadores participantes y su orden, el binding real del proveedor y su custodia/transporte, original/D02-A, source context RLS, proyección de providerRef de los efectos, drivers/canales/ACL efectivas, COMMIT externo y journal/witness. El fixture getClaims no verifica un JWT real; la capacidad WeakMap no es un comprobante SQL transportable. No se generan claves, firmas o protocolos firmados nuevos; CBF1 sigue siendo create_stay-only.

No se implementó persistencia real de datos personales o sus hashes. Los SQL proponen sólo IDs/referencias/metadatos, que también requieren finalidad, minimización, acceso y retención antes de aplicación. El original se obtiene de fuente privada; no se reconstruye desde digest ni se acepta un snapshot del cliente. KNOWN conserva intento/sesión/refs originales, no produce otra escritura y no elimina UNKNOWN ante evidencia incompleta, revocación o ACK perdido.

A2 permanece integral y en cuarentena: PostgreSQL, GoTrue, Vault, Storage, claves/configuración, restricciones independientes y journal/witness/floors posteriores al backup. No se restauró nada ni se adoptó un floor de backup como vigente. Native17 parcial y sus evidencias anteriores se reutilizan, no se reensayan. El navegador espera otro laboratorio seguro compatible.

[RELEASE-CANDIDATE.json](RELEASE-CANDIDATE.json) conserva un único candidato retenido, con versiones, hashes y variables descriptivas sin secretos. [GO-NO-GO.md](GO-NO-GO.md) mantiene las once mutaciones históricas HELD y cero operaciones habilitadas. No se modificó producto, DEV, producción, main, DNS, Vercel, Supabase remoto, ASUS, Actions/cron, servicios o guards; sin gastos, comunicaciones, datos/credenciales reales, invitaciones, cobros, SQL o firmas ejecutadas.

Próximo paso: **revisar las fuentes protegidas y la materialización/host exigidos por el documento de prerrequisitos; sólo después solicitar la autorización nativa específica por hash y alcance**. Si esas piezas no existen, no iniciar el laboratorio ni convertir un bridge vacío en un fixture positivo presentado como autoridad real. Para recuperar una interrupción, verificar HEADs/hashes y seguir [NEXT-EXECUTION.md](NEXT-EXECUTION.md); PROGRESS.md es el checkpoint anterior. Activación/reversión continúan descriptivas y no ejecutadas.

Che Vení Concierge: CABA, un manager fundador, una propiedad, 30 días gratis, sin cobro automático; Free separado para otras ciudades. Sin fecha prometida. **Beta V1 continúa NO-GO.**
