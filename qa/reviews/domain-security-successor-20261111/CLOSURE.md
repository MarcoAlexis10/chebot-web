# Che Vení — integración de seguridad por dominio, cierre QA

11 de noviembre de 2026. **Resultado: candidato offline ampliado; Beta V1 NO-GO.** Se implementó una traducción tipada de incident_state al servicio Native17, se preparó un reader privado sucesor que permanece cerrado y se corrigieron dos fallos adversariales del nuevo reviewer. No se acredita integración funcional con SQL/Auth/journal ni una operación comercial migrada.

## Versiones y publicaciones

| Repositorio/rama | HEAD inicial verificado antes de editar | HEAD de fuentes al consolidar |
|---|---|---|
| chebot-web / qa/cheveni-integral-held-20261111 | 8c85ea251cac217fcd61ab820c670e4d5fa14ca4 | 54391b6dae94dbf824301cdabe1f4c371a8dac3a |
| chebot-backend / qa/cheveni-integral-held-20261111 | 9beb837a621f9a8f06601043afa64b3bba317cb5 | Igual, sólo lectura |
| cheveni-qa-lab / qa/cheveni-native17-policy-closure-20261106 | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a | Igual, sólo lectura |

Commits incrementales publicados en la rama web existente:

- [a7ff4f80e6cb3f04d289d58a18009a2c1a4f0f3a](https://github.com/MarcoAlexis10/chebot-web/commit/a7ff4f80e6cb3f04d289d58a18009a2c1a4f0f3a): candidato de incidencias, puertos de revisión, pruebas/logs y reader SQL retenido, `[skip ci]`.
- [54391b6dae94dbf824301cdabe1f4c371a8dac3a](https://github.com/MarcoAlexis10/chebot-web/commit/54391b6dae94dbf824301cdabe1f4c371a8dac3a): matriz completa, interfaces .d.mts, perfil preciso y contratos de seguridad/Native17/A2, `[skip ci]`.
- El commit contenedor de este CLOSURE publica el sello documental/manifiestos, también con `[skip ci]`. Es el HEAD final documental; su SHA exacto se verifica en GitHub después de publicar y está en el enlace directo de entrega. No se introduce un hash circular dentro de su propio contenido.

Se volvieron a consultar los tres HEADs al consolidar. La comparación del árbol web con 8c85ea25 mostró cambios exclusivamente en los dos directorios QA nuevos; archivos operativos y workflows conservan sus blobs. No se detectaron avances concurrentes que conciliar. Se usaron actualizaciones con expected_sha; sin force/reset/merge o nuevas ramas. Backend y Native17 no se modificaron. [PUBLICATION-CHECKS.json](PUBLICATION-CHECKS.json) fija controles y workflows: los dos push triggers apuntan a otras ramas, sin create configurado aquí. No se invocaron Actions ni sus APIs, jobs, dispatch o cron; no se afirma una consulta de runs que no se hizo.

## Incompatibilidades demostradas y alcance de la corrección

| Problema concreto | Resultado implementado | Límite vigente |
|---|---|---|
| Once mutaciones históricas frente a CBF1 que sólo representa create_stay | [OPERATION-MATRIX.json](OPERATION-MATRIX.json) conserva argumentos, autoridad, efectos y recibos de las once, agrupadas en cinco dominios; rechazo explícito de operaciones no mapeadas | No se cambia el enum ni se interpreta una mutación como alta de estadía |
| Incidencia histórica sin property/stay en sus argumentos | Traducción estricta desde los cuatro argumentos originales a los ocho parámetros de manager_action, usando relaciones actuales suministradas por un resolver confiable obligatorio | Ese productor protegido aún no existe/acredita su ABI de revisión. No se inventan relaciones desde IDs o nombres |
| Servicio deduplicado por request, sin intento separado | Se usa la intención estable como command ID nativo y se conserva el intento por separado. Se exige evidencia de binding adicional, sin perder campos | commands actual no guarda intento/session/authority/restriction/dispatch ni COMMIT independiente. Falta sucesor durable, no sólo un cambio de nombres |
| Adaptador anterior exige writer_client_v1; catálogo Native17 exige writer_backend_v3 | Se fijan ambos perfiles/owners y se prueba su incompatibilidad a partir de fuentes | No se cambia un pin para aparentar conexión compatible; catálogo/login nativo pendiente |
| Reader configurado conserva capacidad write_v2 | Propuesta readback_v3 separada del dispatcher mutador, login/owner propios y comparador de ACL sin write/roles indirectos | SQL DO NOT APPLY aborta antes del DDL y scope siempre deniega; no se acredita READ ONLY o mínimo privilegio nativo |
| Mensajes del proveedor expuestos por el reviewer nuevo | Se reproduce FAIL con sentinel ficticio y se reemplaza excepción externa por código fijo | Sin logs/payloads privados; PASS corregido conservado |
| Expiración durante la última observación de autoridad | Se reproduce FAIL; se reutiliza verifiedIdentity después del await y se liga el bearer exacto al snapshot | Refresh/bearer distinto exige rebind no implementado y conserva UNKNOWN; JWT real no verificado |

El dominio elegido fue **incidencias**: existe un entry Native17 que comprueba incidente→estadía→propiedad→cuenta y llama a la función de negocio exacta. Es una base más concreta que renombrar operaciones. La selección no declara cierre nativo: el servicio también admite checkout/suspend, sus permisos no son incident-only y su recibo no representa el binding completo. El candidato no se conecta al router, build, RPC REST histórico o servicios.

Código nuevo: [README del paquete](../../domain-security-successor-20261111-v1/README.md), incident-successor.mjs, declaraciones .d.mts, role-profile.mjs, SQL lector retenido, ocho extractos de funciones fijados y dos archivos de pruebas. [PACKAGE-MANIFEST.json](PACKAGE-MANIFEST.json) acredita los **18 archivos del paquete** por SHA256 y Git blob. SOURCE-PINS fija ocho fuentes completas y reutiliza los pins de las dependencias SDK/codec/guards del cierre anterior.

## Operaciones todavía HELD

Las once siguen **HELD para ejecución real**, con cero migraciones operacionales. Sólo incident_state tiene traducción candidata probada con dobles.

| Dominio | Operaciones | Dependencia que impide habilitarlo |
|---|---|---|
| Solicitudes | decide_request | Resolver y permiso approve_requests, ABI de valores/tiempos, efecto en estadía y readback durable |
| Incidencias | set_incident_state | Resolver protegido con revisiones, entry de mínimo privilegio, binding durable/COMMIT/reader y dominio criptográfico |
| Conocimiento | activate_knowledge_version, reject_knowledge_version, propose_incident_learning | Resolución item/version/incident y permisos propios/dobles, historia/privacidad y recibos de dominio |
| Reemplazo telefónico | request_guest_phone_replacement, approve_guest_phone_replacement | Identidad/generación/stay-member/cambio exactos, publicación de heads, privacidad y lectura independiente |
| Administración de managers | record_manager_signup_screening, resolve_manager_signup_followup, prepare_signup_invite, revoke_signup_invite | Puerto owner-only con contrato de aplicación/invitación, recibos escalares/filas y retención; sin provisioning/envíos |

La matriz JSON incluye los nombres completos concierge_* y cada argumento/recibo. No se añaden fallback REST, DML general, helpers expuestos, permisos instalados ni comunicaciones del handler original. waiting_guest y learning_pending no implican que este candidato envíe avisos o proponga aprendizaje.

## Pruebas efectivamente ejecutadas

Node observado: **v24.22.1**. Se usó el launcher existente con entorno vacío y namespace nuevo de usuario/red, sin loopback, sin rutas externas y probe rechazado ENETUNREACH=101. No se levantó servidor o infraestructura. [TEST-EVIDENCE.json](TEST-EVIDENCE.json) contiene comandos exactos, nombres de casos, SHA256 y límites; los logs íntegros están en logs/.

| Evidencia | Resultado final | Qué demuestra |
|---|---|---|
| incident-final.tap | **17 PASS, 0 FAIL, 0 SKIP** | Guards, traducción/argumentos, roles configurados, autoridad/revocación/refresh/expiry modelados, ACK perdido, conflicto, intercalación local y readback con dobles |
| Fuentes/perfil en successor-second.tap, más dos repeticiones focales tras cambios | **4 casos únicos PASS** | Hashes de extractos, incompatibilidad de principals/ABI, codec real rechazando incidente y propuesta reader cerrada/ACL comparadas estáticamente |
| privacy-before.tap y expiry-before.tap | **2 FAIL intermedios corregidos** | Reproducción de dos fallos del candidato nuevo; no son fallos finales ni casos adicionales al total único |
| static-syntax.log y static-artifacts.json | **PASS estático** | Sintaxis de los cuatro .mjs; matriz de once conjuntos exactos de argumentos/cinco dominios y hashes de ocho extractos |
| Declaraciones TypeScript | **SKIP compilación** | .d.mts preparada; tsc no disponible, no se instaló ni se afirma compilación |
| PostgreSQL/Auth/JWT firmado/journal/witness/COMMIT/A2 | **NOT_RUN** | Ninguna acreditación nativa/operacional nueva |
| Chromium | **4 casos NOT_RUN** | Se conservan para otro laboratorio seguro; no se volvió a intentar AF_UNIX/EPERM |

**Total nuevo: 21 casos únicos PASS = 17 con dobles + 4 de fuentes/perfiles.** Las pasadas completas previas y las repeticiones focales no se suman como casos nuevos. REVIEW_MATCHED tiene actualProviderVerified/actualSqlVerified/actualJournalVerified/operationalApproval=false; no entrega IDs de efecto privado ni autoriza lanzamiento. Los ACK/UUID de commit/journal/witness del fixture son datos ficticios, no recibos reales. La reserva de Map no acredita unicidad entre procesos o SQL.

No se repitieron las suites históricas: 31 administrativas, 66 backend, 14 regresiones runner, 18 administrativas, 17 integraciones originales con 67 HTTPS locales, 3 de feedback ni 18 de composición privada. Se conservan sus evidencias referenciadas en [RELEASE-CANDIDATE.json](RELEASE-CANDIDATE.json). Este lote produjo **cero intercambios HTTPS de integración nuevos**.

## Bloqueos que quedan y evidencia necesaria

[ROLE-ABI.md](ROLE-ABI.md) distingue separación lógica, de conexión, de credenciales y mínimo privilegio efectivo; [SECURITY-CONTRACTS.md](SECURITY-CONTRACTS.md) fija autoridad, privacidad y conciliación; [DEPENDENCY-ABI.json](DEPENDENCY-ABI.json) conserva los campos del checkpoint CBF1 sin inventar un transcript de incidencias.

Faltan fuente protegida de autoridad/restricciones, login/owner/ACL/RLS observados, canales reales distintos, fence con todos los revocadores, registro durable de intentos y COMMIT nativo. Un ACK perdido permanece UNKNOWN; el mismo intent no se reenvía. Readback requiere autoridad vigente antes y después. Reiniciar sin snapshot confiable deja UNKNOWN y no se acepta uno del cliente; no se reconstruyen argumentos desde hashes. El reviewer no es un journal durable ni una admisión operacional de intenciones tras reinicio.

CBF1 intent/effect no representan incidencias; el gateway firmado existente necesita claim/terminal/checkpoint y custodias independientes. No se generó otro protocolo firmado, claves, firmas o autorizaciones. El fingerprint JS sólo compara argumentos del modelo; no equivale al digest JSONB SQL.

No se agregó persistencia durable de resúmenes, nombres, teléfonos/hashes o frames. Sólo hay snapshots ficticios volátiles del reviewer; la finalidad/minimización/acceso/cifrado/custodia y D02-A deben acreditarse antes de diseñar almacenamiento real. Supresión/retención operativa y guards legales/prelegales continúan cerrados.

[NATIVE17-A2-DEPENDENCIES.md](NATIVE17-A2-DEPENDENCIES.md) reutiliza las evidencias parciales existentes y especifica la captura del laboratorio PostgreSQL 17.11 autorizado que falta. No se ejecutaron sus 15 comprobaciones históricas, migraciones, SQL, restores o Auth remoto. A2 sigue incluyendo PostgreSQL, GoTrue, Vault, Storage, claves/configuración, restricciones independientes, journal/witness y floors posteriores al backup. Recuperar tablas no recupera ese sistema; todo restore queda en cuarentena sin floors actuales acreditados.

## Candidato y próximo paso

Se conserva un único candidato integral **retenido**, con versiones/hash de frontend/backend/Native17 y paquete QA, matriz, contratos, variables descriptivas sin secretos y procedimiento futuro de activación/reversión no ejecutado. Ver [GO-NO-GO.md](GO-NO-GO.md) y [NEXT-EXECUTION.md](NEXT-EXECUTION.md).

Próximo paso concreto: **cerrar el productor protegido de resolución de incidencias y el registro durable intento/sesión/autoridad/dispatch dentro del fence**, seguido del reader independiente de mínimo privilegio. Las dependencias del motor/Auth/laboratorio requieren autorización separada; no se las elude con otro fixture. Mientras falten, ni esta traducción ni el SQL de revisión están listos para conectar servicios.

Para recuperar tras una interrupción: verificar el HEAD remoto y este commit contenedor, leer TEST-EVIDENCE y PACKAGE-MANIFEST, comparar hashes y continuar desde NEXT-EXECUTION. No reiniciar el proyecto, repetir pruebas históricas o recrear ramas backend. El trabajo técnico ya está publicado en los dos commits incrementales; el cierre y sus manifiestos se conservan en este commit documental.

Sin cambios en producción, DEV, main, DNS, Vercel, Supabase remoto o ASUS; sin despliegues, SQL nativo/remoto, servicios, gasto, usuarios/invitaciones/cobros/comunicaciones reales, datos/credenciales reales, firmas o levantamiento de guards. Che Vení Concierge: CABA, un manager fundador, una propiedad, 30 días gratis, sin cobro automático; Free separado para otras ciudades. Sin fecha prometida. **Beta V1 permanece NO-GO.**
