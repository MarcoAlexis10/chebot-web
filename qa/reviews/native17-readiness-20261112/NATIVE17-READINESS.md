# Native17 — readiness verificable, 12/11/2026

**HOST_NOT_AVAILABLE / materialización ejecutable inexistente / NOT_AUTHORIZED / NOT_RUN / NO-GO.** Hay un sucesor de revisión, no un instalador ni un ensayo nativo ejecutado. [OWNER-DECISION.md](OWNER-DECISION.md) responde los diez puntos para la decisión; [SQL-REVIEW.md](SQL-REVIEW.md) explica correcciones comprobadas y límites.

## Laboratorio disponible

Se leyó metadata del runtime Work actual y las evidencias Native17 fijadas en ce5c747c. No aparece un host preexistente gratuito acreditado. PostgreSQL no se ubicó en PATH/directorios conocidos; no se ejecutaron binarios para su versión. El UID/NoNewPrivs/seccomp/capacidades/rutas/mounts observados no prueban aislamiento de filesystem/procesos/recursos o descarte. Cgroups sin límites expuestos y rlimits de CPU/AS/FSIZE ilimitados no satisfacen el contrato del laboratorio. No se inspeccionó Supabase, ASUS, DEV, PROD, Actions o facturación. No se crearon VM, namespace adicional de laboratorio, contenedor, cluster o recursos.

El launcher existente sólo acreditó user/net namespace y ausencia de rutas para los procesos Node de las pruebas. No prueba montaje privado, PID aislado, binario PostgreSQL 17.11, independencia/custodia o costo cero. El descarte nativo aún no puede demostrarse porque no hay ID/volumen/PID/lab identificado. No se intenta ejecutar un motor para descubrirlo. Ver HOST-OBSERVATION y logs de TEST-EVIDENCE.

La VM preexistente del diseño anterior nunca fue un host observado. Supabase QA histórico no constituye autorización reutilizable. Los documentos originales de aislamiento y cierre Native17 parcial fueron releídos al SHA, sin repetir ensayos ni certificar sus 15 declaraciones históricas con nuevos logs.

## Dependencias precisas

La fuente normativa detallada es [DEPENDENCIES.json](../../native17-readiness-20261112-v1/DEPENDENCIES.json). Todas tienen operationallyAccredited=false.

| ID | Contrato | Estado actual |
|---|---|---|
| D1 | Protected authority revision producer / `current_revisions_v1(uuid,uuid,uuid)` | Clock source in review text; producer bootstrap and external corroboration absent. |
| D2 | Independent restrictions, inventory and floors / `protected_floor_v2()` | Bridge returns zero rows; no new signed protocol or fixture source. |
| D3 | Verified provider identity to durable claim / `provider_binding_v2(uuid)` | WeakMap proof remains in-process review only. SQL bridge returns zero rows; response ABI adapter/custody not wired. |
| D4 | Trusted immutable original custody / `original_reference_v2(uuid,uuid,uuid) + original_intent_v1(uuid,uuid,uuid)` | Both original producers raise. Admission now checks protected scope and KNOWN original ref before history, but no storage implemented. |
| D5 | Protected source RLS context / `source_row_visible_v2(text,uuid[])` | Source function returns false. No positive callback or USING(true). FORCE/ENABLE are proposed text only. |
| D6 | Effect providerRef projection / `intent_binding / attempt_binding / admission_v2` | Review text projection and composite constraints prepared; not installed, no SQL uniqueness proof. |
| D7 | All revokers and fence order / `revision_before_v2 / revision_step_v2 / hooks` | 30 proposed hooks reused; no new attested pre-DML revoker entries. Races and deadlock freedom unproved. |
| D8 | External COMMIT and independent readback / `read_effect_bound_v2 + external commit observer` | SQL response says OUTCOME_REQUIRES_COMMIT_OBSERVATION/EFFECT_OBSERVED, neither proves outer COMMIT or independent custody. No observer implemented or fake signed receipt. |

Separación lógica, de conexiones, de credenciales y mínimo privilegio efectivo son cuatro propiedades distintas. Este paquete fija roles/entries y restricciones; no observó ninguna conexión nativa. Un callback/PID distinto no las prueba. Reader propuesto sin write/DML/SET no equivale a READ ONLY observado; en el futuro cada conexión debe verificar su transacción y principal real.

## Siete SQL y manifiesto

Se verificaron por hash los inputs previos y se generaron sucesores separados, sin modificar los siete originales o sus abortos. Los siete nuevos también abortan antes de DDL/consultas y terminan en ROLLBACK. Roles 8; funciones 33; entries 5 para tres logins; 30 hooks heredados. Grants, policies y constraints son texto retenido. [PACKAGE-MANIFEST.json](PACKAGE-MANIFEST.json) fija el paquete y [DERIVATION.json](../../native17-readiness-20261112-v1/DERIVATION.json) cada before/after.

| SQL sucesor | SHA256 |
|---|---|
| [00-roles-DO-NOT-APPLY.sql](../../native17-readiness-20261112-v1/sql/00-roles-DO-NOT-APPLY.sql) | `d87a057789e119270a21ec76b823deced8c78fd99adcd022fd00c195d25ab921` |
| [00-source-base-DO-NOT-APPLY.sql](../../native17-readiness-20261112-v1/sql/00-source-base-DO-NOT-APPLY.sql) | `9cc64597c3477c81a13973c52d4c6fbd240f2c048b3219436d9d8a36543a3520` |
| [01-revisions-DO-NOT-APPLY.sql](../../native17-readiness-20261112-v1/sql/01-revisions-DO-NOT-APPLY.sql) | `a5d42b509a3a9cd8827ad538c8e56f95bee75b0025c71e711175246f3df18cd1` |
| [02-admission-DO-NOT-APPLY.sql](../../native17-readiness-20261112-v1/sql/02-admission-DO-NOT-APPLY.sql) | `953a00641f20e002bac4918240b8c51c6408e65057f2f4c6e540066fdd879e49` |
| [03-bound-entries-DO-NOT-APPLY.sql](../../native17-readiness-20261112-v1/sql/03-bound-entries-DO-NOT-APPLY.sql) | `dab85a19191fb4b9b2d49953be5d91e4dcd57f1df8b7ceff65406b81de780d73` |
| [04-acl-rls-DO-NOT-APPLY.sql](../../native17-readiness-20261112-v1/sql/04-acl-rls-DO-NOT-APPLY.sql) | `e41c26697e2f62912f2388d4b47766688ab775e71637755b3f3079d2615d6417` |
| [05-catalog-capture-NOT-RUN.sql](../../native17-readiness-20261112-v1/sql/05-catalog-capture-NOT-RUN.sql) | `47aec502fa10154eb907e29084960040584a67023b313358366243a8626cfd0c` |

## N01–N12, todos NOT_RUN / NOT_AUTHORIZED

[NATIVE-PLAN.json](../../native17-readiness-20261112-v1/NATIVE-PLAN.json) contiene para cada caso artefactos, dependencias, actores/roles, precondiciones, resultado, evidencia, aborto, costo/aislamiento y garantías excluidas. No contiene comandos para iniciar infraestructura o SQL.

Condiciones comunes: host H0 y materialización por hash aún ausentes; autorización futura específica; cero gastos; binario exacto, uid/pid/mount/net y límites observados; fuentes/loader/custodia aprobados; descarte dirigido por ID. Los límites heredados (2 vCPU/4 GiB/8 GiB/8 conexiones/60 min) son propuesta no acreditada ni permiso de consumo. Si falta cualquiera, no iniciar. Cerrar admisión ante drift, conservar UNKNOWN y nunca reenviar.

**No vacuidad:** cada resultado futuro debe demostrar que alcanzó el control que pretende probar. Un guard exterior que rechaza siempre, timeout, falta de permisos incidental o cero efectos sin trazabilidad NO equivalen a PASS. N03/N04/N06 necesitan barreras/sesiones reales; N12 debe detectar explícitamente el catálogo alterado. Los productores vacíos actuales impiden ensayos positivos: requieren otra materialización revisada, sin convertir fixtures en autoridad real o levantar guards comerciales.

| Caso | Actor | Dependencias | Resultado y evidencia exigidos | No demuestra |
|---|---|---|---|---|
| N01: Version, connections and closed catalog | LAB_CAPTURE_OPERATOR, SCOPE_LOGIN, WRITER_LOGIN, READER_LOGIN | H0 + catálogo/materialización aprobados | Observed 170011, exact roles/owners/function bodies/ACL/RLS/defaults/memberships/schema/table capabilities; unknown dependency retains NO-GO. Evidencia: Before/after raw metadata, external host identity, connection identities, full closure without truncation. | Managed Auth, business write correctness, custody independence, A2 or browser. |
| N02: Missing or stale independent authority cut | SCOPE_LOGIN | D1, D2, D5 | Missing/NULL/stale/future/dataset/epoch/revision contradictions deny with no fabricated revision/effect. Evidencia: Branch/error trace, exact synthetic cut inputs and no effects; bootstrap provenance. | Real witness signatures/custody, managed authority, monotonicity across all systems. |
| N03: Revoker wins before writer fence | LAB_REVOCATION_ACTOR, WRITER_LOGIN | D1, D2, D3, D5, D7 | Revision advances; writer re-observes and denies old authority with zero effect. Evidencia: Barrier schedule, pg_locks trace, revision transition, denied writer, independent effect absence. | JavaScript scheduling or synthetic Auth does not prove GoTrue revocation/refresh. |
| N04: Writer commits before revocation | WRITER_LOGIN, LAB_REVOCATION_ACTOR, READER_LOGIN, COMMIT_OBSERVER | D1, D2, D3, D4, D5, D6, D7, D8 | Original history preserved after externally observed commit; subsequent revoked session cannot read private effect. Evidencia: Commit corroboration, effect/original bindings, later revision/denial, independent readback traces. | Operational managed Auth/journal, full A2 or launch. |
| N05: Relationship and bookkeeping hooks | LAB_REVOCATION_ACTOR, WRITER_LOGIN | D1, D5, D7 | Relation/Auth/permission changes advance authority; status-only and bookkeeping do not invalidate their own effect. INSERT/DELETE/TRUNCATE covered. Evidencia: Transition-table values, trigger invocation/locks, exact counter deltas and unchanged no-op/status path. | Coverage of unlisted external revokers, implicit table lock order from BEFORE alone. |
| N06: Concurrent admission and write uniqueness | WRITER_LOGIN, COMMIT_OBSERVER | D1, D2, D3, D4, D5, D6, D7, D8 | At most one NEW/claim/effect; KNOWN keeps original refs/session/attempt, never emits another mutation. Evidencia: Both schedules, constraints/FK/CAS outcomes, native effect cardinality and external commit/readback. | Memory Map exclusion, configured PIDs or fixture ACKs do not prove this property. |
| N07: Argument conflict vs contradictory provenance | WRITER_LOGIN | D1, D2, D3, D4, D5, D6 | Valid original and differing args: CONFLICT without another effect. Untrusted/contradictory original: UNKNOWN/closed without history disclosure. Evidencia: Trusted original provenance, exact request correlation, result classification and zero extra effects. | Admission metadata API alone has no argument payload: protected original/writer and server comparator remain required. |
| N08: ACK loss and crash around COMMIT | WRITER_LOGIN, READER_LOGIN, COMMIT_OBSERVER | D1, D2, D3, D4, D5, D6, D7, D8 | UNKNOWN after loss; committed original identified without mutating again; no success merely from ACK/result string. Evidencia: Crash/fault timestamps, connection identity/transaction record, external commit and original readback/journal correlation. | Real independent journal/witness custody or recovery of a managed provider. |
| N09: Restart or restored incomplete history | WRITER_LOGIN, READER_LOGIN, LAB_CAPTURE_OPERATOR | D1, D2, D3, D4, D6, D8 | Without trusted original/current floor, remain quarantined UNKNOWN, never NEW due to memory absence or client snapshot. Evidencia: Pre/post restart durable rows and external floors, rejection of client replacements, zero re-dispatch. | A1/A2 restore, Auth/Vault/Storage/keys recovery or floor from backup as current. |
| N10: Session/refresh and expiry while waiting | LAB_AUTH_SYNTHETIC_ACTOR, WRITER_LOGIN, READER_LOGIN | D1, D2, D3, D4, D5, D7 | Old binding cannot dispatch or disclose after session/authority/expiry drift; lost ACK remains UNKNOWN. Evidencia: Actual SQL transaction timings and branch checks, synthetic auth row mutations, no effects or private result. | JWT cryptographic verification, real refresh protocol or GoTrue revocation. Those need separate managed-provider evidence. |
| N11: Effective least privilege | SCOPE_LOGIN, WRITER_LOGIN, READER_LOGIN, LAB_CAPTURE_OPERATOR | D5, D6, D7 | Reader/scope cannot write, mutate helpers, SET owners, CREATE, TRIGGER or TRUNCATE; no broad historical entry reachable. Evidencia: Actual denied commands and catalog for PUBLIC/defaults/transitive EXECUTE/column/table/schema/membership privileges. | Native read-only from only different callbacks/PIDs or JSON expected grants. |
| N12: Revoker bypass and catalog mutation | LAB_CAPTURE_OPERATOR, LAB_REVOCATION_ACTOR, WRITER_LOGIN | D1, D2, D3, D5, D7, D8 | Attested gate rejects changed catalog/unsupported revoker before effect. If gate cannot detect change, FAIL; never credit timeout or outer generic HELD. Evidencia: Sealed before/fault/after catalog, exact validation branch and locks, independent effect absence, cleanup verification. | Production tamper resistance, malicious superuser protection, GoTrue/journal order or complete A2. |

Todos los ensayos de Auth de esta matriz usan exclusivamente forma sintética auth.users/auth.sessions revisada. Ninguno prueba JWT firmado, refresh ni revocación GoTrue real. Esos cuatro ámbitos de proveedor se enumeran por separado en managedProviderTests y permanecen no autorizados; no se contacta proveedor para completarlos.

## Evidencia de este lote

Cinco casos nuevos PASS (cuatro Node sobre texto estático y uno Node con dobles/intercalación temporal), una regresión previa focalizada PASS por cambio de transporte. Los cinco fallaron primero contra fuentes anteriores y sus logs se conservan. No se suman repeticiones. La suite previa de 17 no se reejecutó completa: sólo el caso de ABI de transporte afectado; cero de los 22+2 y de las suites históricas. Ningún motor/parser SQL, proceso PostgreSQL, Auth real, COMMIT externo, journal, A2 o Chromium.

El chequeo estático adicional contrasta hashes/cuerpos/owners/calls/ACL/columnas y plan, no incrementa el contador de pruebas ni acredita seguridad instalada. TypeScript queda sin compilar; no se instalaron dependencias. Fuentes completas, comandos y logs en TEST-EVIDENCE.

## Para autorizar de verdad

Hace falta host preexistente/costo cero acreditado, productores/custodia concretos, inventario completo de revocadores/pre-DML fence, baseline RLS compatible, materialización ejecutable distinta de estos SQL abortados, roles y alcance Nxx/ventana/descarte. El SHA de ese instalador sigue null. Sólo cuando esos elementos sean concretos se podrá solicitar la autorización adicional; hoy la recomendación es NO-GO, sin pregunta genérica al propietario.

A2 sigue integral, con PostgreSQL/GoTrue/Vault/Storage/claves/configuración y floors/journal/witness independientes posteriores al backup. Sin restore ni salida de cuarentena. Chromium AF_UNIX/EPERM no se repitió. Las once operaciones históricas siguen HELD, sin endpoint de incidencias habilitado. Beta comercial NO-GO.
