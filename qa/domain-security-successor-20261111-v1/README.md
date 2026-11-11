# Sucesor de integración de seguridad — QA / HELD

Paquete separado del router y del build. `createHeldIncidentCandidate` mantiene los guards legales y prelegales originales antes de inspeccionar opciones o entradas. Ningún resultado habilita una mutación real.

`incident-successor.mjs` implementa una traducción estricta de los cuatro argumentos históricos de cambio de estado a los ocho parámetros del `manager_action` Native17 fijado en SOURCE-PINS.json. Incidencia, estadía, propiedad, cuenta, miembro y permiso se toman de un resolver actual confiable obligatorio. El paquete **no implementa ni acredita ese resolver SQL**. Preserva el resumen completo; valida longitud por caracteres Unicode y el trim de espacios del SQL. Conserva las restricciones de transición y nunca permite `resolved` por el manager.

El parámetro nativo `p_request` representa la intención estable. El intento original se conserva por separado, nunca se pierde para aparentar compatibilidad. El SQL existente no guarda esa correlación, ni entrega COMMIT/journal/witness independientes: `requiredEvidenceAbi` deja explícito el sucesor faltante. El fingerprint local ordenado permite comparar argumentos en el modelo; no es CBF1, ni el hash `jsonb::text` de PostgreSQL, ni un comprobante criptográfico.

`createIncidentContractReview` exige `OFFLINE_FIXTURE`. Reutiliza el boundary SDK original, con getClaims ficticio en las pruebas; no verifica firmas JWT reales. Ejecuta sólo callbacks suministrados por el laboratorio. Revalida autoridad antes de despachar y antes/después del readback, conserva UNKNOWN tras efectos posibles, reserva localmente antes de awaits, impide reenvío automático y rechaza evidencia incompleta o contradictoria. Un bearer distinto, incluso con los mismos claims, requiere un binding nuevo que no está implementado. Una sesión revocada no puede leer historia privada. REVIEW_MATCHED conserva actualProviderVerified/actualSqlVerified/actualJournalVerified/operationalApproval=false.

La memoria del reviewer conserva temporalmente el snapshot original con resumen y digest del bearer; no escribe archivos, journal ni logs privados. No es almacén durable, está destinada sólo a fixtures ficticios. Una instancia nueva no puede reconciliar sin ese snapshot; no acepta snapshots del cliente ni reconstruye argumentos desde hashes. La exclusión entre procesos, admisión durable NEW/KNOWN, reconciliación tras reinicio, custodia y política D02-A siguen pendientes. No conectar este reviewer a un driver real.

`readback-v3-DO-NOT-APPLY.sql` conserva el ABI CBF1 de lectura con un principal distinto y elimina la llamada al dispatcher mutador compartido. Aborta incondicionalmente antes del DDL, termina con ROLLBACK y conserva un scope que siempre deniega. No es una migración instalable. Faltan scope/fence/Auth/restricciones, ACL de columnas, RLS y acreditación nativa. `role-profile.mjs` compara propuestas y rechaza capacidades indirectas; nunca afirma haber observado privilegios efectivos.

Las fuentes SQL en `sources/` son extractos de revisión, no SQL instalado. SOURCE-PINS fija sus archivos completos por Git blob/SHA256 y sus rangos; no reemplaza Native17. Las pruebas `source-profile` son verificaciones estáticas sobre esas fuentes.

Ejecución nueva, sin servicios:

```sh
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/domain-security-successor-20261111-v1/incident-successor.test.mjs web/qa/domain-security-successor-20261111-v1/source-profile.test.mjs
```

El launcher original acredita namespace de red distinto, sin rutas externas y ENETUNREACH. No levanta PostgreSQL, Chromium, servidores, Auth ni infraestructura. No se repiten suites históricas. Ver los logs del nuevo cierre, incluidos dos fallos adversariales corregidos: mensajes del proveedor expuestos en el reviewer y expiración durante la última revalidación.
