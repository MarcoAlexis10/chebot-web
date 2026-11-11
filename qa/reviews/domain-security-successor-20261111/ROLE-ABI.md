# Roles y ABI — propuesta retenida, no instalada

Fuentes: SOURCE-PINS.json del paquete nuevo. Se cotejaron los blobs completos de ocho fuentes y ocho extractos de funciones. Las observaciones siguientes describen **fuentes de revisión**, no un catálogo instalado.

| Perfil | session_user exigido por fuente | current_user dentro del entry/helper | Entradas/capacidades previstas | Estado |
|---|---|---|---|---|
| Writer histórico usado por la composición anterior | cheveni_writer_client_v1 | cheveni_writer_executor_v1 | scope_v2, write_v2, readback_v2 | Contrato histórico; no es el login sucesor Native17 |
| Writer del catálogo Native17 sucesor | cheveni_writer_backend_v3 | cheveni_writer_executor_v1 | Las tres entradas anteriores; auth_live cambia al owner cheveni_writer_auth_owner_v3 | Fuente actual fijada; ejecución no acreditada |
| Servicio manager Native17 | cheveni_service_manager_backend_v2 | cheveni_service_write_owner_v2 | manager_action admite checkout, suspend e incident_state | Sirve de base para traducción; permiso más amplio que incidentes |
| Reader de servicio existente | cheveni_service_reader_backend_v2 | cheveni_service_read_owner_v2 | manager_case | No es un reader del historial commands/intentos/COMMIT; no se reutiliza por similitud |
| Reader CBF1 propuesto | cheveni_writer_readback_backend_v4 | cheveni_writer_readback_owner_v4 | Sólo readback_v3(bytea,bytea) | Nuevo contrato HELD, scope no implementado |
| Reader de evidencia de incidencias propuesto | cheveni_incident_readback_backend_v1 | cheveni_incident_readback_owner_v1 | Readback exacto de intención/intento/efecto | Interfaz tipada y doble; entry SQL aún inexistente |

La primera incompatibilidad es de versión: la composición anterior configura writer_client_v1 para ambos puertos; Native17 declara ese rol NOLOGIN y el sucesor writer_backend_v3 LOGIN. El catálogo valida el session_user nuevo en check_fences_v2 y auth_live_v1. Cambiar sólo un pin JS no cierra las demás dependencias. La segunda incompatibilidad es de privilegios: entries de PRIVILEGES-SUCCESSOR concede al writer_backend_v3 tanto write_v2 como readback_v2. Cambiar PID no elimina EXECUTE.

`session_user` representa normalmente la identidad que abrió la conexión; `current_user` cambia durante SECURITY DEFINER. SET ROLE no convierte el session_user en el login lector esperado. La propuesta distingue el current_user observado al conectar (igual al login, sin SET ROLE) del owner observado dentro del entry. No se simula un login lector mediante membresía en el writer ni se modifica el helper original para aceptar cualquier caller.

| Garantía | Qué prepara el candidato | Evidencia faltante |
|---|---|---|
| Separación lógica | Callbacks writer/reader distintos y operaciones fijas | Sólo contrato/código |
| Separación de conexión | El paquete previo exige PIDs configurados distintos; el nuevo no afirma PIDs observados | Dos canales autenticados, PID/start/db/server_version y estado de transacción obtenidos del driver confiable |
| Separación de credenciales | Nombres de principals diferentes en la propuesta | Credenciales distintas bajo custodias separadas; no se consultaron ni crearon |
| Mínimo privilegio efectivo | Comparador de cierre ACL rechaza writer, helpers mutadores, PUBLIC, membresías y ownership de datos | Catálogo nativo completo: roles, ACL efectivas incluidas herencias/PUBLIC/SET, owners, dependencias transitivas, RLS, secdef y defaults |

## Reader CBF1 sucesor

`readback-v3-DO-NOT-APPLY.sql` elimina run_v2(opb,ab,false): el dispatcher compartido también tiene rama write y exige identidad writer. La nueva entrada conserva los dos argumentos bytea y el codec original, exige modo READBACK, compara intent/key/attempt/binding/legacy/effect y sólo devuelve BINDING_OBSERVED. Nunca convierte una observación de filas en COMMIT confirmado ni en confirmación del journal.

El archivo aborta incondicionalmente antes de DDL y termina en ROLLBACK. No crea roles. scope_v3 es una dependencia que siempre deniega: faltan fence íntegro, Auth vivo, autoridad actual, restricciones independientes y floors. No se copió una autorización permisiva para hacer pasar la revisión. No se ejecutó ni parseó con PostgreSQL; las verificaciones son textuales.

Propuesta de permisos, aún sin GRANT efectivo:

- Login nuevo: CONNECT a la única base QA prevista, USAGE del schema reader, EXECUTE sólo del entry readback. Cero tabla/sequence/DML/CREATE/membresías/SET a owners/writers; sin SUPERUSER, BYPASSRLS, CREATEROLE, CREATEDB, REPLICATION ni INHERIT.
- Owner reader: NOLOGIN con los mismos atributos cerrados, dueño sólo de su código/schema. No dueño de tablas, sin permisos de escritura, sin membresía en data/code owners mutadores.
- SELECT por columna en bindings: user_id, intent_id, intent_digest, intent_key_digest, dispatch_attempt_digest, effect_frame, effect_digest, legacy_intent_digest, legacy_authority_digest, legacy_receipt_digest. SELECT en intents: auth_user_id, intent_id, intent_digest, authority_digest, receipt_digest. Sus tipos/constraints provienen del contrato histórico fijado; revisar traducción a catálogo sucesor antes de instalar.
- Codec owner/ACL/cuerpos fijados; EXECUTE únicamente parse/digest/frame/validate y sus dependencias puras. No EXECUTE run/write/reconcile histórico ni helpers de publicación/DML.
- RLS SELECT específica para owner reader en cada relación, junto con filtro por user/intención y scope vigente dentro del entry. No alterar políticas existentes en este lote. Auth/autoridad requerirán un bridge lector específico; no se emite un GRANT de tablas administradas ni una política genérica USING(true) aquí.

El bridge Auth requerirá al menos sessions(id,user_id,not_after) y users(id,email_confirmed_at,banned_until), con semántica del helper fijado; eso no cubre todos los revocadores de GoTrue ni sus epochs. El scope debe resolver web identities, members, accounts, properties y property permissions con las columnas exactas del catálogo protegido, incluir revisiones y no quedar abierto por una fila Auth viva. Las proyecciones/RLS Native17 existentes siguen retenidas; no se afirman SELECT/grants ya admisibles.

## Incidencias: ABI faltante específico

El servicio actual acepta ocho parámetros, deduplica por (user_id,request_id) y guarda operation/digest/result. Ese digest SQL usa jsonb_build_array(property,stay,op,value)::text. No incluye session, intento o versión de autoridad, ni equivale al fingerprint JS. Un wrapper incident-only no puede limitar el login existente sin revisar los guards session_user de manager_action/manager_scope/auth_live/fence/launch y sus ACL transitivas. SET ROLE o un SECURITY DEFINER externo no resuelven ese contrato.

Se necesita un entry de dominio que admita únicamente incident_state, relacione la intención estable con cada intento/session/authority/restriction/dispatch, resuelva la incidencia actual dentro del fence y conserve el recibo de negocio original más la evidencia de commit. El reader independiente necesita consultar esa historia con autoridad vigente, nunca ejecutar manager_action para provocar un replay. Cero/múltiples relaciones, scope expirado o restricción no acreditada deben denegar. Esto es una dependencia nativa concreta, no una función instalada por este lote.

Referencias primarias consultadas para distinguir identidades y privilegios: PostgreSQL 17 [session information](https://www.postgresql.org/docs/17/functions-info.html), [privileges](https://www.postgresql.org/docs/17/ddl-priv.html), [row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html). PUBLIC concede EXECUTE por defecto a funciones y debe cerrarse en la misma transacción; el owner de tabla/BYPASSRLS no se confunde con un lector sujeto a RLS.
