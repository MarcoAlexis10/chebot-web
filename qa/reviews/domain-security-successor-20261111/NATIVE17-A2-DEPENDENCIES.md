# Dependencias concretas, sin ejecución nativa

Se reutilizan las 14 referencias inmutables de [REUSED-EVIDENCE.json](../post-integration-20261111/REUSED-EVIDENCE.json). No se repiten sus suites o auditorías. El cierre Native17 recuperado en ce5c747c es PARCIAL: sus 15 comprobaciones históricas son una declaración conservada sin logs completos; esa recuperación acreditó integridad, no una nueva ejecución. Sigue sin fuente acreditada de INDEPENDENT_PROTECTED_SCOPE, Auth sólo sintético y privilegios/RLS sin aprobación nativa.

Fuentes centrales: [Native17 parcial](https://github.com/MarcoAlexis10/cheveni-qa-lab/blob/ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a/qa/reviews/native17-policy-closure-20261107/CLOSURE.md), [A2 matriz](https://github.com/MarcoAlexis10/cheveni-qa-lab/blob/ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a/qa/reviews/intensive-closure-20261030/A2-MATRIX.md). Se leyeron esas evidencias, no se ejecutó su contenido.

## Paquete que deberá producir un laboratorio Native17 autorizado

| Pieza | Contrato exacto de este lote | Evidencia requerida, todavía ausente |
|---|---|---|
| Perfil de fuente | Catálogo policy blob 00a201bc5e3959e23f0524672d4d63c4bb1258a3 y PRIVILEGES-SUCCESSOR blob 084a5dcae15cb522884c6fc0af636043177b0140 | Instalación revisada exacta, sin mezclar writer_client histórico con writer_backend_v3 |
| Transporte | manager_action de ocho parámetros; scope/write/readback CBF1 de la fuente actual; nuevo readback_v3 y lector incidente retenidos | Driver confiable, identidad de conexión observada y sentencias fijas; versión 170011 real; transacción y resultado COMMIT externo, no sólo ACK de callback |
| Roles/ACL/RLS | Matriz ROLE-ABI; reader sin write/run/helpers mutadores, owner NOLOGIN sin ownership de datos | Catálogo completo y ACL efectivas transitivas/PUBLIC/membresías/SET; búsqueda negativa de DML, RLS por SELECT y pruebas negativas con cada login |
| Fence/locks | advisory_xact_lock(1129728581,1), READ COMMITTED; check_fences_v2 fijado por body hash, hooks exactos | Orden nativo Auth/revocador/fence/business/binding/COMMIT; locks de incidencia y comandos; no deadlock ni ventana fuera del fence; todos los revocadores/admin/restore participantes |
| Autoridad de incidentes | Resolución actual incident→stay→property→account→member, manage_incidents, sesión/exp, revisiones de autoridad/restricciones | Fuente protegida de cardinalidad exacta y revisión monotónica; el manager_scope actual no emite la revisión; doble JS no acredita esto |
| Identidad e idempotencia | Intención estable distinta del intento; caso mismo intent/otros argumentos; prohibición de resend | Registro durable de cada intento/session/versión/dispatch y unicidad SQL entre procesos. commands actual sólo (user,request,op,digest,result) no basta |
| Readback/COMMIT | Binding CBF1 leído sin dispatcher mutador; incidente requiere efecto/commit/journal/witness y autoridad actual | Canal lector sin escritura, snapshot original privado admisible, COMMIT nativo y correlación con el efecto original; readback no puede invocar manager_action ni reconstruir payload |
| ABI criptográfico | CBF1 existente intacto; incident domain aún no representable | Dominio de intención/efecto revisado y vectores SQL/JS, transcript real de restricciones/claim/terminal/checkpoint, inventario/floors y custodias independientes |

Nada de esta tabla autoriza a preparar roles reales o ejecutar las propuestas. El SQL nuevo tiene abortos y scope denegatorio, no es un instalador listo para ejecución. La próxima autorización nativa deberá identificar host PostgreSQL 17.11 aislado, gratuito y descartable, alcance y artefacto exactos; no se propone usar DEV, Supabase remoto o ASUS para eludir ese requisito.

## A2 conserva el alcance integral

| Componente | Requisito antes de salir de cuarentena |
|---|---|
| PostgreSQL | Backup coherente, versión/extensiones, datos, constraints, índices, owners, ACL/RLS, hooks y cuerpos revisados; COMMIT y rollback reales |
| Auth/GoTrue | Estado, configuración/proveedores y claves originales recuperables; revocación efectiva de JWT previo, refresh y sesiones. Tablas auth ficticias no equivalen a GoTrue |
| Vault | Metadata/ciphertext más custodia de la clave correcta y recuperación demostrada sin exponerla |
| Storage | Bytes de objetos más inventario de tamaño/digest/IDs, buckets, metadata y políticas; un dump SQL no incluye esos bytes |
| Claves y configuración | KID/versiones/custodia y referencias por entorno, sin despertar SMTP/Meta/cron/outbox ni publicar secretos |
| Restricciones independientes | Inventario completo y floors vigentes externos posteriores al backup; aplicar revocaciones/erase antes de admitir cualquier lectura o write |
| Journal/witness | Historia durable completa con CAS/claims, intent/attempt/effect, secuencias/epochs y custodias que sobrevivan a la pérdida del backend |
| Reconciliación | Fuente original confiable y minimizada bajo D02-A; verificar contra compromisos independientes actuales. No aceptar snapshot del cliente ni floor anterior al backup |

No se ejecutó A1, restore, dump, migración, SQL nativo/remoto, Auth remoto, instalación, firma o infraestructura. Ningún componente está recuperado por este lote. Toda restauración hipotética permanece en cuarentena con canales/admisión cerrados hasta comparar todos los pisos de seguridad vigentes; una restauración sólo de tablas sigue siendo A2 NO-GO.

## Navegador

Los cuatro casos conservados siguen NOT_RUN por AF_UNIX/EPERM. No se ejecutó Chromium, se cambiaron flags o se degradó el aislamiento. Requieren otro laboratorio seguro compatible acreditado. Las pruebas Node y verificaciones de fuentes de este lote no acreditan CORS ni comportamiento real del navegador.
