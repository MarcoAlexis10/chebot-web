# Dependencias restantes, sin instalación ni nueva autorización

Se reutiliza REUSED-EVIDENCE.json del cierre `chebot-web@0e552f4b…`: 14 entradas Native17/A2 con referencias inmutables a `cheveni-qa-lab@ce5c747c…` y `chebot-backend@9beb837a…`. No se repiten sus auditorías, SQL, restores, suites o mediciones. El presente lote añade contratos JavaScript y pruebas con dobles; no cambia la decisión Native17/A2.

| Dependencia | Preparación concreta de este lote | Evidencia aún necesaria |
| --- | --- | --- |
| Transporte privado | Dos puertos originales, sentencias fijas scope/write/readback, dos callbacks y PIDs configurados distintos; ACK correlacionado COMMIT/IDLE | Driver nativo real, identidad obtenida de canal confiable y conexiones distintas observadas, versión 17.11, estado de transacción y COMMIT externo efectivos |
| Privilegios | Rechazo de roles generales y rol cliente exacto del contrato existente; no SQL arbitrario o DML general desde el puerto | ACL/RLS/owners/login efectivos. El SQL histórico exige session_user writer_client y concede write también a ese principal: separar una credencial readback-only necesita revisión del ABI/perfil, no sólo cambiar el nombre del login ni SET ROLE |
| Fuente de autoridad | Boundary SDK y revisión actual existentes, doble observación, vínculo user/session/member/property y permisos antes/después de IO | SDK/GoTrue real y observaciones SQL autenticadas actuales; flags del fixture no prueban fence o proveedor |
| Revocadores | Contratos de rechazo de JWT anterior, refresh/cambio de sesión, revocación durante scope o escritura y vencimiento tardío | Orden nativo de todos los escritores/revocadores, Auth administrado, soporte/admin/restore bajo el fence revisado |
| Protocolos y operaciones | Envelopes estrictos, CBF1 original, bloqueo de once operaciones sin mapping; servicio Native17 manager_action tratado como dominio distinto | Puertos de dominio para requests/knowledge/signup/phone y resolución actual incidente→reserva/propiedad antes de cualquier mapping manager_action. No basta renombrar operaciones |
| Emisor/destino | Rechazo del emisor DEV por el boundary QA; no reescritura de tokens ni fallback | Corte de emisor/proyecto/keys/config expresamente revisado. Este candidato no cambia el target DEV de la aplicación |
| Journal y witness | UNKNOWN, no reenvío y readback explícito; resultado sólo de revisión | Restricciones/checkpoint/claim/terminal reales, frescos, correlacionados y con custodia independiente. No se genera transcript o firma para fabricar el pase completo |
| Intención tras reinicio | Sin snapshot confiable, reconcile queda UNKNOWN sin consultar o repetir write | Resolver privado de intención original, con provenance/commitment independiente y autoridad actual. El ledger de digests no reconstruye los argumentos por sí solo |
| Privacidad de snapshot | Sólo Map volátil de datos ficticios en tests; no nuevo almacén persistente | El frame contiene nombre/hash guest. Antes de persistirlo se requiere finalidad, minimización, custodia/cifrado y retención D02-A aprobadas; no volcar frames reales a GitHub, logs o un backup sin esa política |
| A2 integral | Fuente histórica de fixture reutilizada, ausencia tras pérdida de memoria tratada como UNKNOWN | Restore del release exacto, Auth/Vault/Storage/config/claves y floors/inventario/witness externos actuales. No restaurar un mínimo antiguo como vigente |

No se instaló un rol, función, trigger, política, pool o driver. No se ejecutó PostgreSQL/PGlite. Los valores serverVersion=170011 y backend PID de los tests son datos del doble, no mediciones de un servidor. La separación de puerto no certifica un aislamiento de credenciales.

## Contrato mínimo del resolver futuro de reconciliación

La fuente debe ser un componente privado previamente acreditado, no un body del cliente ni un token decodificado. Debe devolver la intención canónica original y su correlación inmutable con intent/key/dispatch/efecto, bajo política de tratamiento aprobada y frente a un commitment independiente actual. No puede inventar argumentos a partir del digest o seleccionar una historia conveniente. Cero/múltiples filas, cambios de versión, falta de custodia o floor antiguo conservan UNKNOWN.

Ese resolver sólo permite readback tras reautenticar y reautorizar el actor/propiedad actuales. No entrega un permiso de escribir, repetir la operación o abrir tráfico. No se implementa una fuente positiva falsa mientras falta la evidencia independiente. La API candidata actual no acepta un snapshot restaurado por el caller.

## Chromium

AF_UNIX/EPERM queda como dependencia del laboratorio descrito en el cierre anterior. No se hizo un nuevo intento ni se cambió sandbox, kernel, red o navegador. Se conservan los cuatro casos existentes para un entorno seguro compatible.

**Native17 PRE-FLIGHT NO-GO · A2 integral NO-GO · Beta V1 NO-GO.**
