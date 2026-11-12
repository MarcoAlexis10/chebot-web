# Bootstrap de primera propiedad — cierre QA, 12/11/2026

**Beta V1 NO-GO.** Se implementó una proyección SQL candidata de hechos pre-property sin dependencia de launch/trial activo, su binding con la captura original, la revisión exacta del reader existente y controles de presentación frente a respuestas tardías. El productor protegido real sigue ausente; no se habilitó escritura, Auth o infraestructura.

## HEADs y checkpoints

| Repositorio/rama QA | Inicial verificado antes de escribir | Final funcional verificado |
|---|---|---|
| chebot-web · qa/cheveni-integral-held-20261111 | f1a073a9ca951025c951139d61d695b841cdc98e | 3c775bc1233295a743589190ca225963d0dfbe28 |
| chebot-backend · misma rama QA | 9beb837a621f9a8f06601043afa64b3bba317cb5 | Sin cambios, mismo SHA |
| cheveni-qa-lab · qa/cheveni-native17-policy-closure-20261106 | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a | Sin cambios, mismo SHA |

El commit que contiene este documento es el HEAD de publicación documental, identificable en el enlace inmutable final y comprobado después de publicar. Se distingue del HEAD funcional de la tabla.

Checkpoints publicados [skip ci]:

1. f6a8ae209b6eee5461ebb1972ce14d4a60663423 — proyección de hechos pre-property y binding de admisión/captura retenidos.
2. 03f5b43f1fafe38e058f150428be26ed028706b3 — mapeo read/2, barrera de generación/secuencia, custodia y overlays inertes.
3. 3c775bc1233295a743589190ca225963d0dfbe28 — adaptación bigint segura, fuentes/manifiesto/verificador y delta nativo.

Sólo se publicaron los dos nuevos prefijos `qa/property-bootstrap-20261112-v1/` y `qa/reviews/property-bootstrap-20261112/`. Se preservaron todos los blobs previos, backend/QA-lab sólo lectura. En cada publicación: ref, fuentes/blobs y workflows revisados; ambos workflows web excluyen esta rama. Sin ramas nuevas, force-push, merge, PR a main o ejecución Actions.

## Código reutilizable y límites

[Paquete](../../property-bootstrap-20261112-v1/README.md).

- `bootstrap-facts-DO-NOT-APPLY.sql` prepara una consulta concreta con las tablas originales: identidad activa única → miembro owner activo → cuenta; recuenta propiedades/slot/owner no revocado sin filtrar propiedades archivadas. No necesita propiedad activa, manage_stays, launch o trial iniciado. **Aborto exterior y guard incondicional interior conservados.** SECURITY INVOKER, sin grants, roles, DML o sustitución del productor vacío. Nunca se ejecutó/instaló ni se validó con parser PostgreSQL.
- `bootstrap.mjs` reutiliza parser, defaults y comparador anteriores. Exige facts de cero propiedades/slots, owner único, cuenta válida y ambas fechas del trial NULL, más bindings de request/intención/attempt/originalRef/key y revisiones. Los contadores bigint admiten número seguro o texto decimal canónico acotado, sin coerción con pérdida. Founding_manager no se trata como autoridad real: faltan fuentes protegidas y se devuelve HELD.
- El writer se conserva en sus once argumentos. Attempt y originalRef no están representados: el candidato los exige en una admisión separada, **sintética/no durable**. No se descartan ni se envía una operación incompleta.
- `read-binding.mjs` usa el ABI read/2 existente de **26 parámetros**, con posición/tipo/procedencia y cuatro bytea de 32 bytes comprobados en memoria. No crea otro ABI ni statement/driver. Falta p_account: exige que la cuenta se derive por el original protegido y scope actual. Las cuatro revisiones suplementarias y el key no se deducen de un GET; los productores reales permanecen pendientes. Devuelve sólo metadatos, no argumentos privados o propertyId.
- `view-epoch.mjs` reutiliza el patrón authGeneration para el nuevo recorrido QA y agrega secuencia por lectura: respuestas viejas/duplicadas no pisan una vista nueva. Distingue 401/403/429/503 de transporte ilegible sin afirmar expiración JWT o rollback. No hay IO, tokens, persistencia o autoridad. Cambiar scope/logout limpia la vista y conserva UNKNOWN si pudo existir un efecto; no habilita reenvío.
- `candidate.mjs` compone estos módulos con las fronteras anteriores. Dos overlays HTML añaden elegibilidad previa y mensajes coherentes, sobre los generadores existentes; los otros 16 archivos/assets permanecen idénticos. Formularios inertes, sin red. El controlador es revisión Node, no una integración de eventos reales del panel ni prueba de navegador.

## Pruebas ejecutadas de verdad

| Área | Casos nuevos únicos finales | Clasificación |
|---|---:|---|
| Bootstrap/captura/tipos bigint | 3 PASS | Código QA con DTOs sintéticos y aserciones de fuente SQL; no motor/driver |
| Binding read/2 | 2 PASS | Mapeo de tipos/posiciones/fuentes en memoria; no SQL ni reader físico |
| Compatibilidad de custodia | 1 PASS | Codec/fuentes inspeccionados; no firma o custodia acreditada |
| Intercalaciones de vista | 2 PASS | Modelo JavaScript; no carrera SQL/Auth/navegador |
| Composición/overlays | 1 PASS | Puertos retenidos, HTML/enlaces/CSP; no end-to-end operativo |
| **Total único** | **9 PASS, 0 FAIL final** | Repeticiones/subaserciones no sumadas |

[TEST-EVIDENCE.json](TEST-EVIDENCE.json): comandos, filtros, hashes, PASS/FAIL y logs. Se conservan los fallos intermedios: matcher estático que incluyó un comentario; binding propio que no comparaba originalRef/request con admisión independiente; respuesta vieja dentro del mismo scope que pisaba estado nuevo; rechazo del bigint textual canónico. Se corrigieron con regresiones sólo de los casos nuevos afectados. En ningún momento se produjo autoridad o efecto real.

No se repitieron las 6/10/20/19 suites previas ni históricos. Node v24.22.1 con launcher existente: user/net namespaces separados, sin rutas IPv4, conexión externa errno101, sin credenciales heredadas. No acredita filesystem/PID/recursos Native17. El fixture previo reading se extrajo sin ejecutar sus tests.

Verificación estática adicional PASS, sin sumar casos: 248 fuentes locales por hashes, 31 blobs directos contra GitHub, seis blobs Native17 de origen, extracto de custodia exacto, 23 archivos de paquete, sintaxis de 13 MJS y dos overlays. No TypeScript compilado, parser SQL nativo, pg driver, motor PostgreSQL, HTTP local nuevo, navegador, Auth administrado, COMMIT externo, firma o restore ejecutados. Las versiones pg/pg-types se leyeron del lockfile; el caso de contadores usa DTOs sintéticos, no su parser real.

## Original confiable y privacidad

[Delta de custodia/D02-A](ORIGINAL-CUSTODY-DELTA.md). Los contratos inspeccionados no aportan un custodio compatible: el intent CBF1 sólo admite create_stay y el verificador de custodia de invitación es select false. No se rellena huésped ficticio, cambia operación o inventa otro protocolo firmado. Se conserva parser/comparador privado y la copia histórica hasta aprobar una alternativa que compare el original exacto. UUID/key/digest no lo sustituyen.

Sin almacenamiento nuevo, datos reales, claves, firmas, snapshots del cliente, hashes personales, eliminación o plazo inventado. Decisión general D02-A preservada; custodia/minimización/retención específicas y A2 permanecen pendientes. Si falta original tras reinicio o ACK perdido: UNKNOWN, nunca NEW/reenvío.

## Bloqueos y transición ASUS

| Dependencia | Estado verdadero |
|---|---|
| Productor bootstrap | Falta Auth/procedencia actual, asignación única de fundador, cupo completo bajo RLS, CABA, revisiones/floors y revocadores. private_mutation_authority_v1 sigue WHERE false |
| Captura/admisión | Subset representable revisado; writer HELD, sidecar durable de attempt/originalRef inexistente |
| Reader | ABI/mapeo preparados; faltan resolver del original, contexto RLS/ACL/EXECUTE transitivos, credenciales independientes y fuente de revisiones |
| Efecto durable | ACK, COMMIT, efecto, reader y journal/witness separados; ninguno acreditado por modelos o IDs |
| Native17/ASUS | HOST_NOT_AVAILABLE; N01–N12 NOT_AUTHORIZED/NOT_RUN; ASUS no accedida |
| A2/Auth/privacidad/legal | Pendientes las evidencias integrales; guards conservados, sin habilitación comercial |
| Navegador | Chromium no reintentado; cuatro casos históricos NOT_RUN |

[NATIVE-DELTA.json](NATIVE-DELTA.json) prepara cuatro aserciones propias de primera propiedad: pre-trial, cupo/original concurrentes, read/2 con privilegios mínimos, y ACK/reinicio con original exacto. Todas **NOT_AUTHORIZED/NOT_RUN**. No nuevo runner/instalador ni eliminación de abortos. Su materialización ejecutable SHA sigue NULL; denegar en el primer guard no demostraría la rama deseada. Auth sintético local no prueba el proveedor administrado.

ASUS-PREFLIGHT anterior y su catálogo de 25 consultas se preservaron por hash, sin rehacerlos o ejecutarlos en Work. El futuro ensayo requiere host/binary 17.11/aislamiento/costo cero observados, productores y roles revisados, custodias, artefactos SHAs, alcance/límites/ventana y descarte dirigido aprobados. Este cierre no concede esa autorización.

## Recuperación y siguiente acción

[NEXT-EXECUTION.md](NEXT-EXECUTION.md). PACKAGE-MANIFEST SHA-256: `3093c49d0799a00e342074dd35fa81033e50dc118d47009c8982c5ef8ebfb2fe`. Sources/Native-sources y overlays tienen hashes reproducibles; los commits permiten continuar sin repetir trabajo.

La próxima acción crítica es implementar/acreditar las fuentes protegidas que la proyección de hechos no sustituye, y la admisión/original durables. Antes de probar nativamente, observar ASUS bajo el preflight existente y autorizar una materialización concreta; no basta quitar guards o recibir un ACK.

Sin cambios en DEV/PROD/main/DNS/Vercel/Supabase remoto/ASUS, sin gastos, servicios, SQL, comunicaciones, altas o cobros. Las once mutaciones históricas siguen retenidas. CABA, un manager fundador, una propiedad y 30 días gratuitos desde la primera estadía real verificada, sin conversión/cobro automático; Free separado. Sin fecha prometida. No ZIP.
