# Contratos implementados y límites del sucesor

Fuentes fijadas: [SOURCE-PINS](../../incident-authority-closure-20261111-v1/SOURCE-PINS.json), catálogo Native17 ce5c747c blob 00a201bc5e3959e23f0524672d4d63c4bb1258a3; cuatro extractos adicionales y los pins anteriores en a53c698c. Se releen sólo las funciones necesarias: auth_live, fence, launch, manager_scope, acción y función de negocio de incidentes, y el puerto privado de autoridad. No se ejecuta su SQL ni se repiten auditorías.

## CurrentResolution

La fuente manager_scope actual retorna memberId/accountId/role sin revisión; private_mutation_authority_v1 declara authority_revision pero devuelve cero filas. No hay un productor protegido compatible que pueda activarse aquí. `createProtectedCurrentResolution` permanece incondicionalmente HELD sin leer opciones/clientes. El camino de revisión exige OFFLINE_FIXTURE; no crea una autoridad real.

La frontera de revisión obtiene la identidad del boundary SDK existente sobre el bearer exacto, copia el comando con snapshot estricto y solicita únicamente user/session/expiry/incident/request a callbacks configurados por el laboratorio. No acepta member/role/permission/version desde el JWT o el body para decidir autoridad.

Dos observaciones requieren una única fila cada una, aun si dos filas duplicadas fueran idénticas. Se validan explícitamente session→user, identity→member/account, member→account, property→account, stay→account/property e incident→account/property/stay; estados, revocación, email y permiso manage_incidents. El rol owner no permite omitir ese permiso. El SQL propuesto usa además el autorizador Native17 específico del dominio; no reemplaza manage_incidents por manage_stays.

Las revisiones y el floor actual se obtienen de callbacks separados, correlacionados por request/scope. Deben coincidir exactamente antes y después: autoridad, restricciones, dataset, recovery epoch, inventario, journal y digest de restricciones. El cache local sólo rechaza regresiones observadas y cambios de rol sin avance de revisión; no acredita un floor externo ni persistencia. Los productores reales de esos datos y su independencia siguen faltando.

Se revalida expiración tras awaits y antes de usar la capacidad. Una capacidad es un handle WeakMap de esa instancia, bearer y comando; copiar un objeto con los mismos campos no crea una capacidad. No se exponen filas privadas a través del handle. La fuente SQL propuesta también deniega si hay cero/múltiples filas o revisión ausente. Todos los flags de acreditación del camino positivo con dobles son false.

## Admisión y vínculo durable

| Fase | Contrato de revisión | Garantía pendiente |
|---|---|---|
| Autoridad inicial | Nueva CurrentResolution válida | Provider y fuente protegida reales |
| admit | Custodio decide NEW/KNOWN; no usa ausencia del Map local | CAS/claim durable y único entre procesos |
| loadOriginal | Original del source por referencia opaca, user/intent/scope/operación/argumentos exactos | Custodia independiente, política D02-A y procedencia acreditadas |
| KNOWN | Conserva intento/sesión/expiry/revisiones originales; si argumentos difieren CONFLICT; nunca write | Registro histórico nativo y autenticado |
| claimDispatch | ACK exacto del vínculo intento/sesión/autoridad/dispatch; pérdida deja UNKNOWN sin llamar writer | Comprobante durable independiente y vinculación exacta al proveedor/JWT |
| Reautorización | Se resuelve otra vez después del claim y antes de enviar | Orden nativo fence/revocadores/COMMIT |
| Writer | Sentencia fija change_state_v1, login exclusivo; argumentos originales sin pérdida | Driver SQL, ACL/RLS y COMMIT externos observados |
| Readback | Sentencia fija read_effect_v1, sin mutación; referencia/efecto/binding/floor exactos y nueva autoridad final | Canal físico/credencial/privilegios observados, custodia de journal/witness |

admit/claim sólo reciben metadatos; no resumen, frame, nombre, teléfono o digest de argumentos. El original no se reconstruye desde un hash ni se recibe del cliente. Los fixtures sí mantienen un original inventado y un Map compartido entre instancias, expresamente como dobles. Una instancia nueva que obtiene KNOWN no puede reenviar la mutación; reconcile sin contexto confiable local conserva UNKNOWN, aun si el caller adjunta un snapshot. No se implementó una recuperación durable positiva ficticia.

Un ACK perdido después del envío no acredita rollback; después del claim tampoco se presume que la admisión no ocurrió. UNKNOWN permanece UNKNOWN ante incertidumbre de transporte, fuente original ausente, revocación, expiración o evidencia contradictoria. Un efecto confirmado antes de revocar no se borra ni se vuelve a emitir; la sesión desautorizada no recibe lectura privada. No existe un botón de reintento.

## SQL, roles y privileges — DO NOT APPLY

| Login propuesto | Owner del entry | Único entry del login |
|---|---|---|
| cheveni_incident_scope_backend_v1 | cheveni_incident_scope_owner_v1 | current_resolution_v1(uuid,uuid,bigint,uuid,uuid) |
| cheveni_incident_writer_backend_v1 | cheveni_incident_writer_owner_v1 | change_state_v1: 16 parámetros, sin selector checkout/suspend |
| cheveni_incident_readback_backend_v1 | cheveni_incident_readback_owner_v1 | read_effect_v1: 9 parámetros, sólo lectura |

El cuarto owner, cheveni_incident_data_owner_v1, es NOLOGIN y dueño explícito de las tablas nuevas. Los tres owners de código son NOLOGIN y no son dueños de tablas. Ningún login tiene DML, CREATE, membresías o SET hacia owners/writers. Se proponen atributos sin SUPERUSER/BYPASSRLS/INHERIT/CREATEROLE/CREATEDB/REPLICATION, PUBLIC EXECUTE vacío y RLS ENABLE+FORCE. El archivo no crea ninguno de esos roles.

Los logins históricos writer_client_v1/writer_backend_v3 y el servicio manager amplio no son aceptados por estos entries. Los helpers antiguos auth/fence/launch/manager_scope exigen otros pares session_user/current_user; envolverlos con SECURITY DEFINER o SET ROLE no soluciona esa incompatibilidad. Se propone una nueva frontera nativa cerrada para los pares exactos, sin ampliar las ACL de los helpers viejos.

El writer llama sólo a la función de negocio original de incidentes bajo owner privado y permisos futuros por columna; no al manager_action que admite checkout/suspend. El reader no alcanza esa función, INSERT/UPDATE o replay. El comparador recorre el grafo declarado e identifica mutadores directos/indirectos, helpers desconocidos/cíclicos, PUBLIC, herencias/SET, owners incorrectos y RLS lector distinto de SELECT. No descubre un catálogo nativo: casts, operators, triggers, RLS y dependencias completas requieren la captura real pendiente.

Las tablas propuestas guardan únicamente IDs y metadatos: intención única por user/intent, referencia original única, vínculo de intento/dispatch/session/expiración/versiones y estado EFFECT_RECORDED. La FK incluye la referencia original. No guardan argumentos, resúmenes o hashes personales. Hasta esos IDs vinculables requieren aprobación de finalidad/acceso/retención antes de persistir algo real. Los grants owner-only de helpers, columnas y las políticas RLS exactas **no se emiten** mientras falte su acreditación; no se usa USING(true) para completar la propuesta.

El archivo aborta incondicionalmente antes del DDL y termina con rollback. Además native_gate siempre levanta excepción, current_revisions devuelve cero filas, original_intent deniega y dispatch_claim devuelve false. No es instalable quitando una línea. Faltan revisión protegida, custodia del original/claim, todos los revocadores y hooks de las dos tablas nuevas, launch/legal/privacidad y ACL/RLS completas. El orden previsto es fence compartido 1129728581/1 → intención → intento → fila de negocio; los revocadores necesitan el mismo orden. Se verifican scope y floor completos antes y después del trabajo. Ese orden no está ensayado en PostgreSQL.

OUTCOME_REQUIRES_COMMIT_OBSERVATION y EFFECT_OBSERVED no constituyen recibos de COMMIT/journal. El driver futuro debe distinguir resultado SQL, ACK externo y COMMIT auténtico; el fixture los modela sin acreditarlos. CBF1 permanece create_stay-only y no se inventa un frame firmado de incidencias. Provider binding, canonicalización, journal/witness y transcript siguen pendientes.

Referencias primarias para revisión del perfil: [PostgreSQL 17 CREATE FUNCTION](https://www.postgresql.org/docs/17/sql-createfunction.html) y [Privileges](https://www.postgresql.org/docs/17/ddl-priv.html). No se cambiaron permisos instalados o configuración Supabase.
