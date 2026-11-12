# Frontera protegida y admisión de incidencias — QA HELD

Extensión del candidato anterior, sin router, build, driver, provider, claves o servicios. Se reutilizan snapshot, guard legal/prelegal, boundary SDK y compilador de manager_action. El nuevo writer **no** ejecuta manager_action: exige el principal incident-only propuesto y una sentencia específica. No se disfraza ese principal como el servicio amplio histórico.

`createProtectedCurrentResolution` devuelve siempre HELD sin inspeccionar opciones. No existe el productor SQL protegido de revisiones/floors. `createCurrentResolutionReview` exige OFFLINE_FIXTURE y valida dos observaciones de fuente con cardinalidad única, todos los joins/estatus/permisos, identidad SDK ligada al bearer, revisiones y floors de dos callbacks distintos, correlación de request y frescura después de awaits. Sólo emite una capacidad local no fabricable desde el cliente. Sus flags de acreditación reales permanecen false. El productor de datos usado por tests es un doble, no Auth o SQL acreditados.

`createDurableIncidentReview` prepara puertos admit/loadOriginal/claimDispatch para un custodio independiente. No contiene almacenamiento durable. El source decide NEW/KNOWN; ausencia del Map local nunca decide NEW. El original viene del source por una referencia opaca, no del cliente ni de un digest. El journal de admisión no recibe el resumen. Antes de escribir hay una nueva autorización después del ACK del claim. UNKNOWN conserva toda incertidumbre y no habilita un segundo despacho; el reader usa otra sentencia, siempre sin mutación.

Los fixtures usan un Map compartido para modelar el custodio entre instancias. Esto **no prueba** durabilidad, unicidad SQL, procesos nativos, claim/COMMIT/journal o independencia física. Una instancia nueva puede consultar KNOWN para impedir un resend, pero no recupera una capacidad de lectura privada ni autoriza un rebind: reconcile sin contexto original confiable permanece UNKNOWN.

KNOWN conserva el intento, sesión, expiración y revisiones históricos. Se compara el original bajo autorización actual para responder CONFLICT cuando cambian los argumentos, pero nunca se reetiqueta esa historia como una nueva admisión. La ausencia o contradicción del original conserva UNKNOWN.

Las revisiones/floors y la procedencia de los snapshots requieren productor protegido, política/custodia D02-A, journal/witness y Native17 acreditados. No se agrega almacenamiento de resúmenes, teléfonos, nombres, frames o hashes personales. Los únicos snapshots y hashes de bearer nuevos viven en memoria con datos ficticios. El gateway criptográfico de incidentes sigue sin dominio CBF1 compatible; no se firman ni inventan comprobantes.

`incident-only-DO-NOT-APPLY.sql` propone tres entries, siete roles y dos tablas de metadatos con referencia original opaca. No crea roles; aborta antes del DDL y termina en ROLLBACK. El gate nativo siempre deniega, revisiones devuelve cero filas, custodia levanta excepción y dispatch_claim devuelve false. Los grants de helpers/columnas/RLS siguen ausentes deliberadamente. No instalar, no quitar gates: se necesita un artefacto nuevo revisado cuando esas dependencias puedan acreditarse. `ROLE-PROFILE.json` y `profile-check.mjs` comparan únicamente una propuesta declarada, no ACL efectivas.

```sh
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/incident-authority-closure-20261111-v1/current-resolution.test.mjs web/qa/incident-authority-closure-20261111-v1/durable-incident.test.mjs
```

No repetir los 21 casos anteriores. Sólo se ejecutan las dos regresiones directamente afectadas por extraer el compilador seguro; las suites de este paquete son nuevas. Los logs incluyen un fallo adversarial corregido: cambio de rol sin avance de la revisión de autoridad. La comprobación en memoria no reemplaza un incremento de revisión atómico y durable por cada revocador.

El cierre conserva también fallos de comparación de floors, claim faltante, KNOWN con intento histórico y scope original contradictorio. Se corrigieron sin cambiar UNKNOWN por un desenlace terminal. La proyección SQL hace visibles permisos duplicados que el LIMIT 1 del autorizador histórico podría ocultar. Ver CONTRACTS.md y TEST-EVIDENCE.json del nuevo cierre para límites y comandos exactos.
