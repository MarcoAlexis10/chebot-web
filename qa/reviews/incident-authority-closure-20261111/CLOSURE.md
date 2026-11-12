# Che Vení — cierre de incidencias y autoridad

11 de noviembre de 2026. **Resultado: sucesor QA ampliado, exclusivamente offline. Beta V1 NO-GO.** Se implementaron la frontera fail-closed de CurrentResolution, la admisión por puertos de intención/original/claim, el writer incident-only propuesto y el reader separado. No existe todavía un productor SQL protegido acreditado ni integración funcional con Auth, PostgreSQL o journal/witness.

## HEADs y commits

| Repositorio / rama | HEAD inicial verificado antes de escribir | HEAD de fuentes al consolidar |
|---|---|---|
| chebot-web / qa/cheveni-integral-held-20261111 | a53c698c6f78f25520ef2b07f8d728caeae93677 | 3a99a8dcc34036c8f489f59c36b62c6df6726860 |
| chebot-backend / qa/cheveni-integral-held-20261111 | 9beb837a621f9a8f06601043afa64b3bba317cb5 | Igual; sólo lectura |
| cheveni-qa-lab / qa/cheveni-native17-policy-closure-20261106 | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a | Igual; sólo lectura |

Publicaciones incrementales en la rama web existente, todas con `[skip ci]`:

- [4bf2964c1a9a4b798fcea792dbec50243ffd2290](https://github.com/MarcoAlexis10/chebot-web/commit/4bf2964c1a9a4b798fcea792dbec50243ffd2290): frontera protegida de revisión y puertos de admisión durable; primer checkpoint con logs.
- [bc0ba377a15fe3b2826b0a488797228bac4db63c](https://github.com/MarcoAlexis10/chebot-web/commit/bc0ba377a15fe3b2826b0a488797228bac4db63c): SQL incident-only retenido, roles/grafo, declaraciones y tratamiento de KNOWN histórico.
- [3a99a8dcc34036c8f489f59c36b62c6df6726860](https://github.com/MarcoAlexis10/chebot-web/commit/3a99a8dcc34036c8f489f59c36b62c6df6726860): conserva UNKNOWN ante scope original contradictorio y hace visibles permisos duplicados en la proyección.

El HEAD final documental es el commit contenedor de este CLOSURE y sus manifiestos. Su SHA se verifica después de publicar y aparece en el enlace directo de entrega; no se introduce un hash circular en su propio contenido. Las fuentes ejecutadas quedan fijadas por 3a99a8dc y los hashes de PACKAGE-MANIFEST.

Se verificaron nuevamente los tres HEADs al consolidar. No hubo avances concurrentes que sobrescribir. La comparación con a53c698c acreditó cambios sólo en los dos directorios QA nuevos y en dos archivos compartidos QA: incident-successor.mjs/.d.mts, para exportar el compilador que exige el proof SDK original. Producto, build y workflows sin cambios. Sin nuevas ramas, force/reset/merge, escritura backend/Native17 o Actions. [PUBLICATION-CHECKS.json](PUBLICATION-CHECKS.json) fija leases, blobs y límites; no se consultaron runs ni se afirma una observación de Actions inexistente.

## Código y problemas concretos resueltos

Paquete: [qa/incident-authority-closure-20261111-v1](../../incident-authority-closure-20261111-v1/README.md). [PACKAGE-MANIFEST.json](PACKAGE-MANIFEST.json) fija **18 archivos nuevos del paquete y dos archivos QA compartidos** por SHA256 y Git blob. SOURCE-PINS conserva el catálogo Native17 exacto, cinco extractos adicionales y los inputs anteriores del compilador. No se reconstruyó el proyecto ni se creó un protocolo firmado paralelo.

| Incompatibilidad o error detectado | Cambio implementado | Qué sigue sin acreditar |
|---|---|---|
| manager_scope no emite revisión; private_mutation_authority declara revisión pero devuelve cero filas | Productor por defecto incondicionalmente HELD; frontera de revisión que exige fuente configurada, filas únicas y revisiones/floors | Productor SQL protegido y proveedor reales |
| Un objeto CurrentResolution del caller o claims JWT podría aparentar contexto suficiente | Capacidad local WeakMap ligada a proof SDK/bearer/comando; joins y permisos del source, sin usar user_metadata | Firma JWT/GoTrue y procedencia protegida del source |
| Rol cambiado sin avance de authorityVersion | Se reproduce FAIL y se rechaza la contradicción contra la observación anterior | Incremento atómico de revisiones por todos los revocadores nativos |
| Ausencia de Map tras reinicio podía parecer una intención nueva | admit decide NEW/KNOWN desde un puerto explícito; loadOriginal usa referencia del source; KNOWN nunca despacha | CAS/claim, persistencia y unicidad SQL entre procesos |
| KNOWN histórico tenía intento/sesión distintos de la solicitud nueva | Se conserva el binding histórico, sin renombrarlo; argumentos diferentes frente a original válido producen CONFLICT | Historia durable y autenticada; no se implementa rebind operativo |
| Original y scope actual contradictorios se confundían con conflicto de argumentos | FAIL reproducido; ahora UNKNOWN en reviewer y propuesta SQL | Custodia/procedencia del original y reconciliación autorizada |
| Login de servicio amplio admite checkout/suspend y helpers antiguos exigen otros callers | Entry y principal incident-only nuevos; reutiliza sólo la función de negocio exacta; sin fallback manager_action/REST | Catálogo real y ABI/grants nativos revisados |
| Reader/floors podían omitir dataset/inventario/journal o validación final | Comparación completa de scope/floor antes y después; reader sin mutaciones; claim faltante queda explícitamente false | SQL ejecutado, COMMIT y reader físicamente independiente |
| Autorizador histórico usa LIMIT 1 para permisos de propiedad | Join explícito de permisos en la proyección propuesta para contar duplicados antes de aceptar una fila | No se observó cardinalidad del catálogo instalado; hallazgo estático |

El SQL es **DO NOT APPLY**: aborto incondicional antes del DDL, rollback final, native_gate siempre denegatorio, revisiones con cero filas, original bajo excepción y dispatch_claim=false. No se crean roles ni se emiten los grants owner-only/columnas/RLS necesarios para habilitarlo. No es instalable quitando el primer aborto. Las propuestas conservan las restricciones de transición, privacidad, legal/prelegal y launch; no abren el endpoint de incidencias.

## Pruebas ejecutadas y evidencia

Node **24.22.1**. Se usó el launcher original con entorno vacío y namespaces nuevos de usuario/red, sin loopback, sin rutas externas y probe rechazado ENETUNREACH=101. Ningún servidor, SQL, Auth, navegador o infraestructura levantado. [TEST-EVIDENCE.json](TEST-EVIDENCE.json) conserva comandos, nombres, clasificación, totales y SHA256 de cada log.

| Grupo | Resultado final | Tipo de evidencia |
|---|---|---|
| CurrentResolution | **9 PASS** en contracts-final.tap | Node con getClaims, filas, revisiones y floors ficticios |
| Intención/claim/readback | **9 PASS** en durable-final.tap | Node con custodio Map compartido y transportes ficticios; no durabilidad real |
| SQL y perfil | **4 casos únicos PASS** en sql-profile-sealed.tap y repeticiones focales de los casos afectados | Texto SQL y grafo declarado; ningún motor SQL, ACL o rol observado |
| Regresiones anteriores afectadas | **2 PASS** en shared-compiler-regression.tap | Sólo mapping de incidencias y guard original tras extraer el compilador |
| Sintaxis JS | **PASS estático**, static-syntax.log/final-syntax.log | node --check, no integración adicional |
| TypeScript | **NOT_COMPILED** | .d.mts preparadas; tsc ausente, sin instalación |
| PostgreSQL/Auth real/JWT firmado/COMMIT/journal/witness/A2 | **NOT_RUN** | Sin acreditación nativa u operacional nueva |
| Chromium | **4 casos previos NOT_RUN** | No se repitió AF_UNIX/EPERM ni se degradó el host |

**22 casos nuevos únicos PASS = 18 con dobles + 4 estáticos; además 2 regresiones focalizadas PASS.** No se suman pasadas completas, repeticiones o FAIL corregidos como casos nuevos. Se conservan **seis aserciones FAIL intermedias**, todas corregidas, sobre rol/revisión, floor/claim, historia KNOWN y scope original contradictorio. Los logs antes/después permanecen en logs/.

Cobertura negativa nueva: cero/dos filas idénticas, getters/extras/request incorrecto, cada relación entre cuenta/miembro/propiedad/estadía/incidencia, manage_incidents ausente incluso para owner, sesión/issuer DEV/expiry inválidos, JWT metadata sin autoridad, revisión o floor ausentes/antiguos/contradictorios, expiración durante awaits, capacidades de otra instancia/bearer/argumentos, claim ACK perdido, write ACK perdido, KNOWN tras reinicio, original ausente o contradictorio, dos instancias contra un custodio ficticio, revocación durante claim/readback, correlación de efecto/binding y mutadores indirectos del reader.

No se repitieron las 21 pruebas previas completas ni las suites históricas 31/66/14/18/17 con 67 HTTPS, las 3 de feedback, las 18 de composición o las 15 declaradas del cierre Native17 parcial. Este lote produjo cero intercambios HTTP/HTTPS de integración nuevos. Las lecturas/hash/GitHub y los casos con dobles no se presentan como integración funcional o prueba nativa.

## Garantías que permanecen pendientes

[CONTRACTS.md](CONTRACTS.md) especifica la frontera, los puertos y el perfil. La separación lógica está implementada; la de conexión, credenciales y mínimo privilegio efectivo no está acreditada. Los siete roles propuestos, tres entries y RLS/ACL de columnas necesitan captura nativa completa y pruebas negativas, incluidas dependencias transitivas, casts/operators/policies y owners. Los hooks históricos tampoco cubren automáticamente las dos tablas nuevas. No se ejecutó PostgreSQL ni se tocaron roles reales.

Los Maps, IDs, revisiones, ACKs y objetos del fixture no prueban CAS durable, COMMIT, unicidad entre procesos, firma JWT o independencia de journal/witness. El reader modelado devuelve REVIEW_EFFECT_OBSERVED con actualProviderVerified/actualSqlVerified/actualJournalVerified/operationalApproval=false. El resultado SQL propuesto OUTCOME_REQUIRES_COMMIT_OBSERVATION tampoco prueba el commit externo.

Una pérdida de ACK conserva UNKNOWN sin reenvío. La revocación no recupera autoridad por conservar un JWT anterior. Se reobserva después del claim y antes/después de leer; una historia confirmada no se borra ni se expone a una sesión revocada. Reconcile tras reinicio carece del contexto confiable y sigue UNKNOWN; no acepta snapshot del cliente ni reconstruye argumentos a partir de un digest. La admisión no se basa en ausencia de memoria.

No se agregó persistencia de resúmenes, nombres, teléfonos, frames o hashes personales. El SQL propone sólo referencias opacas e IDs/metadatos, que también requieren finalidad, minimización, acceso, custodia y retención D02-A antes de cualquier aplicación real. El original sólo existe como fixture volátil; las excepciones se convierten en códigos fijos sin filtrar payloads. Supresión/retención operativa y guards originales continúan cerrados.

CBF1 sigue representando create_stay, no incidencias; no se reinterpretaron campos o enums. Falta el dominio y transcript de evidencia compatible con journal/witness y el binding exacto del proveedor al claim. No se generaron claves, firmas, grants o autorizaciones.

Native17 y A2 conservan el cierre parcial previo. A2 requiere PostgreSQL, GoTrue, Vault, Storage, claves/configuración, restricciones independientes y journal/witness/floors posteriores al backup. No se restauró nada ni se adoptó un floor anterior como vigente. No se ensayó Chromium: requiere otro laboratorio seguro compatible.

## Candidato, recuperación y siguiente paso

[RELEASE-CANDIDATE.json](RELEASE-CANDIDATE.json) mantiene **un único candidato integral retenido**, con versiones, hashes, inventario de dependencias y variables descriptivas sin secretos. [GO-NO-GO.md](GO-NO-GO.md) conserva las once mutaciones históricas operativamente HELD y cero migraciones reales. No se habilitó el endpoint ni usuarios/invitaciones/cobros/comunicaciones.

Próxima acción concreta: **implementar y acreditar el productor protegido de revisiones/floors y el vínculo de identidad del proveedor con el claim de despacho**, junto con custodia del original y ACL/RLS/fence de las dos tablas nuevas. Las interfaces y fallos están definidos; llenar los puertos con valores ficticios no cierra esa dependencia. El motor PostgreSQL 17.11, Auth administrado y custodias necesitan el laboratorio y autorización separados que este lote no tiene.

Si Work se interrumpe, consultar el HEAD remoto y este commit contenedor, verificar PACKAGE-MANIFEST/FILE-HASHES y continuar desde [NEXT-EXECUTION.md](NEXT-EXECUTION.md), sin reiniciar ni repetir casos acreditados. PROGRESS.md es sólo el checkpoint anterior. Las tres publicaciones técnicas ya preservan el trabajo incremental. Activación/reversión siguen siendo procedimientos descriptivos, no ejecutados.

Sin DEV, producción, main, DNS, Vercel, Supabase remoto, ASUS, SQL ejecutado, infraestructura nueva, gastos, Actions, cron, comunicaciones, datos/credenciales reales o levantamiento de guards. Che Vení Concierge: CABA, un manager fundador, una propiedad, 30 días gratis, sin cobro automático; Free separado en otras ciudades. Sin fecha prometida. **Beta V1 continúa NO-GO.**
