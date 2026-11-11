# Cierre siguiente de seguridad: contratos y conexiones pendientes

**Lectura dirigida de contratos existentes, no nueva auditoría general ni prueba de ejecución.**
Web técnico `5f70ab215d52f9820a1af256ab36e092feb9ffd7`; backend sin cambios `9beb837a621f9a8f06601043afa64b3bba317cb5`; laboratorio `ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a`. Todos los gates siguen cerrados. Las referencias y hashes de 14 evidencias recuperadas están en REUSED-EVIDENCE.json. No se ejecutó ninguna suite histórica, SQL, restore ni Auth remoto.

## 1. JWT emitido antes de revocar

En el backend seleccionado, `concierge-manager-auth-session.js` verifica el bearer exacto contra `/auth/v1/user` antes de interpretar claims; relaciona `sub`, `session_id`, emisor, audiencia, rol, anonimato y vencimiento. Después requiere comprobantes independientes frescos y correlacionados y el RPC `concierge_auth_session_live_v1`. La liveness vuelve a comprobarse en lecturas y el writer debe mantener autoridad transaccional. Éstos son caminos de fuente: el runtime real permanece retenido antes de ellos.

**Conexión faltante concreta:** la fábrica define `getRecoveryProof=async()=>null` y `expectedJournalId=null`, y el export seleccionado sólo proporciona `writeProtocol:'durable-v2'`. No se acreditó un custodio operativo conectado. Levantar el HOLD por sí solo no satisface el verificador, ni está autorizado. La ausencia de filas o un JWT todavía no vencido no conceden autoridad.

El lab Native17 declara Auth **sintético** y triggers futuros `installed:false` en `AUTH-LAB-SHAPE.json`; no prueba GoTrue, JWT ni revocación administrada. Los revocadores, cambios de rol/propiedad, soporte/admin y restore tienen que participar en una autoridad común acreditada; la existencia de un advisory lock no demuestra esa cobertura.

Fuentes backend: `concierge-manager-auth-session.js:145`, `:175`, `:185`, `:313`; `ops/drafts/AUTH-SESSION-LIVENESS-QA-DO-NOT-APPLY.sql:32`; `ops/drafts/AUTH-MANAGED-FENCE-QA-DO-NOT-APPLY.sql`. Evidencias lab: `AUTH-LAB-SHAPE.json`, `WRITER-AUTH-COVERAGE.md`, `REMAINING-BLOCKERS.md`.

## 2. Refresh, logout y sesiones distintas

El frontend seleccionado toma `access_token` del login y guarda sólo el access token en sessionStorage. La fuente no implementa `grant_type=refresh_token` ni guarda un refresh token. `restoreSession()` verifica la sesión del token existente: **no es refresh**. Logout invoca `/auth/v1/logout?scope=local` y primero oculta el panel/limpia el estado local. No se afirma que logout anule por sí mismo un access token ya emitido.

No se añade refresh automático en este lote. Su necesidad funcional y su diseño quedan separados de demostrar la revocación efectiva. Un token nuevo, una respuesta tardía o el mismo usuario con otra sesión no autorizan reutilizar el binding privado anterior ni recuperar permisos retirados. Se necesita evidencia del proveedor y su coordinación con el fence; no se puede obtener con claims ficticios.

Fuentes web: `manager-auth-v1.js:194`, `:594`, `:712`; backend: `concierge-manager-auth-session.js:168`, `:194`, `:216`. La corrección de feedback sólo evita atribuir vencimiento a una verificación desconocida; no cambia estos contratos.

## 3. Operación iniciada antes de revocación

La fuente del gateway comprueba expiración/hold antes del despacho y después del resultado, conserva el estado `dispatched` y devuelve `MANAGER_WRITE_OUTCOME_UNKNOWN` con reconciliación tras incertidumbre posterior. Esto no revierte un COMMIT ni prueba un orden entre transacciones. Los borradores SQL requieren el fence compartido y una revisión de autoridad bajo ese lock, pero no fueron compilados ni ejecutados aquí.

El criterio futuro debe fijar el punto de orden: si la revocación adquiere la autoridad primero, no admitir el efecto posterior; si el efecto ya confirmó antes de la revocación, preservar su historia y volver a comprobar la autoridad antes de revelar un resultado. No interpretar una pérdida de ACK como rollback. Falta demostrar el orden con todos los escritores/revocadores reales y conexiones separadas, bajo autorización específica.

Fuentes: `concierge-manager-auth-session.js:243`, `:268`, `:274`, `:298`; borradores `MANAGER-WRITE-FENCE` y `AUTH-MANAGED-FENCE`; lab `WRITER-AUTH-COVERAGE.md`.

## 4. Idempotencia SQL: dos protocolos que no deben confundirse

| Contrato | Backend seleccionado | Candidato privado del laboratorio |
| --- | --- | --- |
| Transporte previsto | REST público `/rest/v1/rpc/concierge_manager_write_idempotent_v2` | Puertos privados `concierge_writer_contract_v2.scope_v2`, `write_v2`, `readback_v2` |
| Entrada | UUIDs, operation, args JSON, expiración | Frames CBF1 en bytea con identidad/attempt/efecto y bindings propios |
| Principal | La fuente histórica utiliza service key y borradores `service_role` | Cliente writer mínimo; helpers/tablas no concedidos al backend general |
| Identidad durable | Root HTTP v4 → ID v8 por operación; no incluye argumentos, para detectar conflictos en SQL | Intent/key y hashes CBF1; hashes JSONB históricos conservados por separado |
| Repetición | El borrador devuelve DENIED, CONFLICT o RECONCILIATION_REQUIRED; nunca vuelve a emitir resultado privado cacheado | Readback con sesión/contexto actuales y mapping correlacionado; no crea ni repite un intent |
| Garantía actual | Sólo fuente y ejecución retenida histórica | Candidato UNAPPLIED; Native17 no aprobado ni ejecutado |

**No hay equivalencia por llamarse ambos “v2”.** El backend raíz no está conectado a esos tres puertos privados. No se propone publicar helpers, conceder DML general, cambiar hashes para hacerlos equivalentes ni agregar fallback al RPC histórico. La composición futura debe seleccionar un protocolo y un driver existentes y acreditar su wiring, roles, commit/readback y custodio antes de admitir operaciones.

`withManagerHttpIntent`/WeakMap y `mutationClaims` impiden ciertos replays locales; no son unicidad durable entre workers, procesos o reinicios. Esa garantía requiere PK/locks/transacción reales y datos persistidos. Nada de ello se probó en PostgreSQL en este lote.

Fuentes: `concierge-manager-http-intent.js:15`, `:35`; `concierge-manager-auth-session.js:250`, `:263`, `:275`; borrador `MANAGER-DURABLE-INTENT-QA-DO-NOT-APPLY.sql`; lab `writer-contract-v2/README.md`, `PACKAGE.json` y SQL leído como texto. Los overlays Native17 posteriores siguen retenidos; el add-on histórico por sí solo no es un bundle actual de instalación.

## 5. Reconciliación después de ACK perdido

El backend conserva `reconciliation_required:true` cuando ya pudo despachar. En las fuentes seleccionadas no hay una ruta HTTP de reconciliación en `vercel.json` ni una llamada a ella en el gateway Auth raíz. El borrador SQL `concierge_manager_reconcile_intent_v2` existe, pero **un borrador no es una ruta conectada**. Su ausencia de fila retorna UNRESOLVED, no permiso para repetir; un COMMITTED exige luego una lectura privada con autoridad vigente.

El laboratorio separa COMMIT externo, readback desde otra sesión y comprobación de journal. Un retorno COMMITTED de una función no acredita que la transacción externa confirmó. No se crea un “botón reintentar” para resolver UNKNOWN ni se infiere no efecto por falta de comprobante. El siguiente cierre debe correlacionar intención, args, actor/contexto, intento de despacho y resultado persistido mediante la conexión privada revisada.

Fuentes: `concierge-manager-auth-session.js:279–306`; `ops/drafts/MANAGER-INTENT-RECONCILE-V2-QA-DO-NOT-APPLY.sql:49`; lab `writer-contract-v2/README.md` y `SQL-CONTRACT.md`.

## 6. A2 y floors posteriores al backup

Se recuperaron las evidencias existentes, sin repetirlas. El expediente A2 post-COMMIT describe una reconstrucción de fixture en otro destino, con 12 comprobaciones históricas declaradas, y especifica `realA2RollbackVerified=false`, `authFunctionalRestoreVerified=false`, Vault/Storage no restaurados y revocaciones independientes no reconciliadas. Su JSON es una normalización de logs históricos, no un nuevo ensayo ni el log bruto.

Los archivos A2-MATRIX y A2-PRIVACY mantienen fuera de la garantía operativa: Auth/GoTrue/configuración, claves JWT/raíz, Vault, bytes de Storage, roles administrados, recuperación del release exacto y journal/witness actuales. Un restore de aplicación no puede restaurar un floor antiguo como si fuera vigente.

El verificador `bindIndependentRestrictions` mantiene floor/clock/challenges en memoria y parte de un mínimo configurado; eso no acredita custodia durable entre procesos o tras perder el host. La recuperación necesita un mínimo/inventario externo protegido y restricciones posteriores al backup antes de cualquier reapertura. No se generan claves, firmas o comprobantes para suplir esa dependencia.

## Secuencia del siguiente cierre, sin activación

1. Acreditar un entorno de navegador con IPC AF_UNIX, sandbox funcional y egress nulo. Ejecutar sólo los cuatro casos pendientes y las regresiones causadas por la corrección del frontend, sin repetir por rutina las suites acreditadas.
2. Resolver la composición entre el backend raíz y el protocolo privado elegido; mantener HOLD, sin fallback REST/DML general y sin producir pruebas ficticias de custodia.
3. Preparar una revisión acotada de exactos drivers/puertos, revocadores y readback. Los escenarios de ACCEPTANCE-REQUIREMENTS.json son requisitos, **no tests ejecutados**.
4. Sólo con artefacto/host/roles aprobados y autorización separada, ejecutar la evidencia nativa/administrada necesaria. No se solicita ni se consume esa autorización aquí.
5. Conciliar A2, legal/retención y operación antes del GO comercial. La presente autorización offline no permite ninguno de esos pasos operativos.

**Native17 y Beta V1 siguen NO-GO.**
