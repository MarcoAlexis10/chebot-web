# Composición privada candidata — offline y retenida

Este paquete no se importa desde el build, handlers o router. No tiene driver de red, SQL instalado, cliente Auth, credenciales o valores por defecto que conecten servicios. `createHeldPrivateStayCandidate` conserva el hard stop prelegal original **antes de leer opciones, token o comando**. No acepta un override de held. Un resultado de revisión nunca concede aprobación operativa.

## Conexión nueva

`independent-ports.mjs` compone dos instancias del puerto SQL original: escritura por un backend fijado y scope/readback por otro. Exige PIDs configurados distintos, callbacks explícitos distintos, misma base/version esperada y el principal privado exacto del contrato histórico. Cada instancia conserva validación propia de requestId, operation, backend, COMMIT/IDLE, frames y deadline. No hay SQL arbitrario, REST, service_role ni fallback.

Los PIDs/roles son **pins de configuración**, no observaciones físicas acreditadas. El campo readOnly es un contrato con el driver; no demuestra una transacción nativa READ ONLY. Ambos logins del modelo usan el cliente exigido por el SQL histórico, que también tiene EXECUTE sobre write_v2: una credencial readback-only requiere cerrar el perfil/ABI SQL por separado, sin ampliar grants aquí. No se afirma mínimo privilegio efectivo ni independencia física antes de Native17.

El codec privado sólo admite `concierge_manager_create_stay`. Las once operaciones del RPC histórico no se pueden reinterpretar como esa operación: el adaptador las retiene, sin descartar campos o inventar una traducción. El envelope de creación usado por el reviewer es una propuesta **con la forma del envelope histórico**, no una operación que el RPC raíz actual ya admita. El listado /stays raíz actual es de lectura.

## Revisión explícita con dobles

`createPrivateWriterContractReview` exige `OFFLINE_FIXTURE`. Reutiliza los boundaries SDK y autoridad existentes; verifica identidad/sesión/expiry y scope vigentes, observa el scope privado mediante el codec real, vuelve a verificar autoridad inmediatamente antes de escribir y valida el readback independiente y la autoridad final. Snapshotea los argumentos antes de awaits, liga actor/member/property y conserva representaciones CBF1 exactas.

El driver de tests devuelve ACKs ficticios y un Map simula historia. Los JWT son strings ficticios y getClaims es un doble: **no se verifica una firma JWT real**. Los frames usan un contexto de restricciones explícitamente **UNSIGNED**, no una prueba de journal. No se crea ninguna clave ni firma. La ruta de revisión devuelve como máximo REVIEW_MATCHED con actualProviderVerified/actualSqlVerified/actualJournalVerified/operationalApproval=false. No devuelve CONFIRMED ni IDs de efecto. No puede sustituir el gateway criptográfico real.

ACK perdido deja UNKNOWN; el mismo intent no se vuelve a escribir. Reconcile sólo puede consultar el snapshot confiable ya guardado en esa instancia, reautoriza el token actual y usa READBACK desde la otra conexión. Una sesión nueva puede consultar sólo tras autorización actual completa; no reutiliza el binding anterior. Cambios de sesión dentro de una misma operación o lectura no se heredan. Tras perder el snapshot, ausencia queda UNKNOWN: no se reconstruye por conjetura ni se reenvía.

Las reservas locales y el Map ficticio **no acreditan** unicidad SQL, concurrencia de procesos, persistencia tras reinicio, COMMIT/rollback nativos, RLS, grants, proveedor o A2. El gateway real heredado sigue necesitando restricciones/checkpoint/claim/terminal firmados; no hay transcript compatible para un pase positivo completo y no se fabricó.

## Fuentes y ejecución

Se materializaron 16 dependencias seleccionadas, cotejadas con el árbol GitHub `cheveni-qa-lab@ce5c747c…`. Sólo el gateway recibe el overlay histórico ya sellado, cuyo resultado es `a318815e…`; no se cambiaron sus verificadores o holds. UPSTREAM-PINS.json separa fuente original y salida del overlay. No se ejecutaron tests upstream, generadores de claves, PGlite o SQL.

Con checkouts hermanos `web`/`backend` y fuentes fijadas:

```sh
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/private-writer-composition-20261111-v1/composition.test.mjs
```

La ejecución de este lote obtuvo 16 PASS y un fallo de path de fixture; el caso afectado se corrigió y pasó focalmente. Luego se fijó también el blob de ese input; su path de pin tuvo un fallo corregido y el caso volvió a pasar. **17 casos únicos acreditados mediante 16 + 1**, no una suite completa final de 17 reejecutada ni 18/19 pruebas nuevas. Los logs conservan los fallos y repeticiones focalizadas.

Para repetir sólo el caso corregido se utilizó `--test-name-pattern='eleven historical'`. No repetir suites antiguas por rutina. Chromium permanece pendiente de otro laboratorio; no se intentó aquí.
