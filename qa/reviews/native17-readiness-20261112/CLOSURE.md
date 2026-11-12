# Che Vení — cierre de prerrequisitos Native17, 12/11/2026

**Resultado: HOST_NOT_AVAILABLE / validación nativa NOT_AUTHORIZED y NOT_RUN / Beta V1 NO-GO.** Se corrigieron incompatibilidades reales del candidato QA y se preparó la decisión técnica del propietario. No se acreditó ni inició un laboratorio PostgreSQL, Auth real o integración operacional.

## Versiones y recuperación

Se leyó íntegramente el cierre anterior al SHA indicado, sus prerrequisitos/NEXT/delta/artefactos/evidencia/GO-NO-GO y el paquete. Los 20 archivos de entrada coincidieron con SHA256 y blobs remotos. Se releyeron las evidencias originales de aislamiento y cierre Native17 parcial al SHA ce5c747c, sin repetir sus comprobaciones históricas. La ruta correcta del cierre Native17 recuperado es `native17-policy-closure-20261107`; la ruta 20261106 devolvió 404 y no se utilizó como evidencia.

| Repositorio/rama | HEAD inicial antes de escribir | HEAD al sellar fuentes/decisión |
|---|---|---|
| Web / qa/cheveni-integral-held-20261111 | 4d4467042560a56ac7af0633e7c93064d2fad2b0 | a6e191e90649484425f35cb78ad7368594ce9894, más commit contenedor final descrito debajo |
| Backend / qa/cheveni-integral-held-20261111 | 9beb837a621f9a8f06601043afa64b3bba317cb5 | Igual, sólo lectura |
| Native17 / qa/cheveni-native17-policy-closure-20261106 | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a | Igual, sólo lectura |

- [5f22a62fae741745a85127ddad48e945386e8fde](https://github.com/MarcoAlexis10/chebot-web/commit/5f22a62fae741745a85127ddad48e945386e8fde): correcciones de binding/SQL cruzado y primer checkpoint, `[skip ci]`.
- [a6e191e90649484425f35cb78ad7368594ce9894](https://github.com/MarcoAlexis10/chebot-web/commit/a6e191e90649484425f35cb78ad7368594ce9894): ocho contratos de dependencias, doce fichas nativas y verificador estático, `[skip ci]`.
- El commit que contiene este archivo añade el verificador final de firmas/EXECUTE/contextos, la decisión, manifiestos y cierre, también `[skip ci]`. **Ese es el HEAD final web**, verificado tras publicar en el enlace directo de entrega; no se introduce un SHA circular dentro de su propio contenido.

Los tres HEADs se volvieron a leer antes del sello. Sin avances concurrentes detectados. Publicaciones con expected_sha, sin ramas nuevas, force, reset, merge o PR. Los dos workflows web conservan sus blobs y sólo tienen push a otras ramas explícitas/manual; no se usó Actions API ni se afirmaron runs a partir de una consulta inexistente. Producto, workflows y paquetes anteriores intactos; sólo los dos nuevos directorios QA de este lote. Ver PUBLICATION-CHECKS.json y SOURCE-PINS.json.

## Laboratorio: decisión verificable

La observación actual de Work es de **metadata en lectura**, no acreditación nativa. No se localizaron postgres/initdb/pg_ctl/psql en PATH o tres directorios conocidos; no se ejecutó ningún binario PostgreSQL para observar su versión. UID 1000, capacidades cero, NoNewPrivs=1/seccomp y mounts/rutas/rlimits se registraron sin leer credenciales. No hay límites cgroup expuestos verificables; AS/CPU/FSIZE estaban ilimitados. No se acreditó filesystem/procesos/recursos/descarte privado para un laboratorio 17.11.

El launcher acreditó sólo el aislamiento user/net de los procesos Node y su rechazo de egress, no un perímetro PostgreSQL. No hay ID de host/volumen/lab elegido, evidencia de binario 17.11, custodia o costo cero. La VM mencionada en el diseño anterior era hipotética. No se inspeccionaron Supabase remoto, ASUS, DEV/PROD, Actions, proveedores de infraestructura o facturación; no se creó, modificó, reservó o inició infraestructura.

Por ello se registra **HOST_NOT_AVAILABLE dentro de los recursos autorizados inspeccionables**, sin afirmar que no exista alguna máquina fuera de ese alcance. [HOST-OBSERVATION.json](HOST-OBSERVATION.json) contiene la captura reproducible, y [REUSED-EVIDENCE.json](REUSED-EVIDENCE.json) fija los documentos Native17 releídos. La recomendación expresa es **NO-GO para ejecutar**; no se improvisaron permisos o un host alternativo.

## Código nuevo y correcciones

Paquete [native17-readiness-20261112-v1](../../native17-readiness-20261112-v1/README.md), **21 archivos**. Deriva siete SQL sucesores conservando todos los abortos, un binding corregido y sus tipos; incluye generador, verificador cruzado, observador de host, pruebas, catálogo esperado y contratos/plan. Queda fuera del build/runtime real. Los originales no se sobrescribieron.

| Incompatibilidad | Corrección candidata y evidencia | Límite |
|---|---|---|
| Intent history FOR UPDATE sin UPDATE propuesto | SELECT sin row lock bajo fence obligatorio; sin ampliar UPDATE al historial | Fence/uniqueness entre procesos no ensayados |
| Policies permisivas podían combinarse con otras más amplias; enforcement source no explícito | AS RESTRICTIVE y ENABLE/FORCE propuestos para todas las tablas alcanzadas | Sin baseline permisiva aprobada sigue denegado; source producer false |
| ProviderRef ausente de filas de efecto | NOT NULL/FKs compuestas, proyección del writer, matching del reader y grants/policies/orden de columnas coherentes | Texto retenido; no persistencia, backfill ni constraints nativos |
| KNOWN sin comparar original protegido actual | Validar operación/scope/ref antes de devolver historia; contradicción queda UNKNOWN/closed | Custodia/original y comparador de argumentos siguen dependiendo de fuente privada |
| Binding SQL sin revalidación final después de lecturas | assert_provider al final de writer y reader | Sin reloj/carrera/transacción nativa observados |
| Binding JS vencía durante await de resolución | Caso nuevo falla contra código anterior y pasa con recheck posterior al await | Doble offline, no JWT/GoTrue real |
| Captura sin EXECUTE efectivo de owners/schema y algunas capacidades de tabla | Captura propuesta amplía esos metadatos | Consulta abortada, no captura real |
| Entries legacy sin provider incompatibles con proyección | Bodies antiguos denegados expresamente; sin grants al LOGIN ni fallback | Las once operaciones continúan HELD |

[SQL-REVIEW.md](SQL-REVIEW.md) detalla el cruce de los siete archivos; [DERIVATION.json](../../native17-readiness-20261112-v1/DERIVATION.json) y [PACKAGE-MANIFEST.json](PACKAGE-MANIFEST.json) fijan hashes. La comprobación de regeneración dio **11 artefactos generados idénticos**, no SQL ejecutado.

Se preservan ocho roles propuestos, 33 funciones, cinco entries para tres logins y 30 hooks. El verificador de fuentes contrasta firmas/owners/cuerpos/security/calls, 29 grants de columna, 25 EXECUTE, 27 contextos efectivos desde entries y columnas/orden de cuatro tablas. **No es parser SQL ni prueba privilegios efectivos instalados**, dependencias de operadores/casts, seguridad completa o mínimo privilegio nativo.

Un límite nuevo queda documentado sin fabricar solución: BEFORE STATEMENT no acredita que el fence preceda los locks implícitos de tabla, especialmente TRUNCATE/DDL. Hace falta entry de revocador que tome el fence antes de emitir el comando, cobertura de todos los participantes y observación real de barreras/locks. No se reemplazó por una GUC o un chequeo de PIDs/pg_locks que simule autoridad.

## Dependencias y doce ensayos futuros

[DEPENDENCIES.json](../../native17-readiness-20261112-v1/DEPENDENCIES.json) fija ocho fronteras concretas: productor protegido de revisión; restricciones/floors independientes; proveedor→claim; original privado; RLS source; proyección providerRef; revocadores/fence; COMMIT/readback externo. Todas siguen operationallyAccredited=false. El trabajo de proyección/correlación y las validaciones se preparó donde había evidencia de fuente; **no se sustituyeron productores ausentes por callbacks positivos, revisiones constantes o claims JWT**.

Clock sin seed, floor/provider sin filas, original con raise, source RLS false y guards originales siguen cerrados. Se conserva UNKNOWN ante ACK perdido/evidencia incompleta; no hay reenvío automático, recuperación de argumentos desde digest ni snapshot del cliente después de reinicio. KNOWN no crea otro efecto. EFFECT_OBSERVED/OUTCOME_REQUIRES_COMMIT_OBSERVATION no acreditan outer COMMIT o journal independiente.

[NATIVE17-READINESS.md](NATIVE17-READINESS.md) contiene la matriz legible y [NATIVE-PLAN.json](../../native17-readiness-20261112-v1/NATIVE-PLAN.json) las doce fichas completas con artefactos/dependencias/roles/precondiciones/resultados/evidencia/abortos/costo/aislamiento/garantías excluidas. **N01–N12: cero ejecutados, todos NOT_RUN/NOT_AUTHORIZED.** Auth sintético queda separado de futuras pruebas administradas de JWT, refresh y revocación.

Se exige demostrar que cada ensayo alcanza el control específico: un rechazo genérico del guard exterior no vale como PASS de autoridad/idempotencia/readback. No existe SHA de materialización ejecutable (null), loader nativo autorizado ni job/runner que inicie el laboratorio. No corresponde quitar los abortos para crear uno. [OWNER-DECISION.md](OWNER-DECISION.md) responde los diez puntos solicitados; no pide un GO genérico ni autorización prematura.

## Pruebas ejecutadas y límites

| Clase | Resultado real |
|---|---|
| Node sobre fuentes SQL/ACL/captura | **4 casos nuevos PASS**, estáticos; no parser/motor |
| Node de expiración durante await | **1 caso nuevo PASS**, con dobles y tiempo modelado; no carrera SQL |
| Regresión previa afectada | **1 PASS**, caso exacto de transporte ABI extraído para el binding cambiado; no caso nuevo |
| Mismos cinco casos contra fuentes anteriores | **0 PASS / 5 FAIL**, conservados como evidencia anterior a la corrección; no cinco pruebas únicas adicionales |
| Generación/verificador/firmas/sintaxis | PASS estático, sin incrementar contador; TypeScript NOT_COMPILED |
| N01–N12 / PostgreSQL / Auth real / COMMIT externo / journal / A2 | **NOT_RUN**, cero acreditación operacional nueva |
| Chromium/CORS real | **Cuatro casos previos NOT_RUN**, no se repitió AF_UNIX/EPERM |

**Cinco casos nuevos únicos aprobados = cuatro estáticos + uno con dobles; una regresión previa focalizada aparte.** Las 19 instancias textuales en siete categorías del informe cruzado no se presentan como 19 defectos PostgreSQL ni como nuevos tests. Ver [TEST-EVIDENCE.json](TEST-EVIDENCE.json) para comandos, nombres, conteos y hashes de logs.

Node 24.22.1 mediante launcher existente: namespace nuevo user/net, env sin credenciales heredadas, sin loopback/rutas externas y probe ENETUNREACH=101. No se levantaron servicios o conexiones de integración HTTP/HTTPS. No se reejecutó completa la suite anterior de 17: sólo un caso de transporte por cambio directo. Cero de los 22+2, las suites 31/66/14/18/17 o los ensayos Native17 históricos.

## Decisión comercial, próximos pasos y continuidad

[GO-NO-GO.md](GO-NO-GO.md) y [RELEASE-CANDIDATE.json](RELEASE-CANDIDATE.json) mantienen un único candidato retenido y once mutaciones HELD. Sin endpoint operativo de incidencias. No se modificaron servicios, roles reales, DEV/producción/main/DNS/Vercel/Supabase/ASUS, guards legales/prelegales/Auth/privacidad/retención o workflows. Sin gastos nuevos, datos/credenciales reales, firmas/claves privadas, comunicaciones, invitaciones, altas, cobros, SQL o restores.

No hay persistencia nueva de PII, payloads, frames, hashes personales o tokens. Incluso referencias/IDs propuestos necesitan finalidad, minimización, acceso, cifrado/custodia y retención D02-A antes de aplicación. No se fabricaron comprobantes ni otro protocolo; CBF1 sigue create_stay-only. A2 mantiene PostgreSQL/GoTrue/Vault/Storage/claves/configuración y journal/witness/floors vigentes posteriores al backup; sin restaurar ni salir de cuarentena.

Siguiente acción concreta: **identificar un host preexistente gratuito acreditable y aportar las fuentes protegidas/custodia/entries de revocador faltantes; después preparar una materialización revisable por hash**. Sólo con esos elementos podrá solicitarse autorización adicional por host/casos/roles/límites/descarte, distinta de este trabajo offline. Hasta entonces pueden continuar fuentes de Auth/custodia, interfaces de journal/A2 y privacidad sin activar servicios. Repetir fixtures o cambiar flags de Chromium no resuelve esos bloqueos.

Para recuperar una interrupción, seguir [NEXT-EXECUTION.md](NEXT-EXECUTION.md): leer HEADs/hashes, conciliar avances, conservar pruebas y no tomar PROGRESS.md como el estado final. FILE-HASHES fija los artefactos; el árbol Git final acredita su propio manifiesto. Activación/reversión siguen descriptivas, nunca ejecutadas: cerrar admisión y preservar UNKNOWN/historia hasta conciliación; volver a un commit/backup no revierte efectos o revocaciones.

Che Vení Concierge Beta V1: sólo CABA, un manager fundador, una propiedad, 30 días gratis, sin cobro automático; Che Vení Free separado para otras ciudades. No se promete fecha. **Beta V1 NO-GO.**
