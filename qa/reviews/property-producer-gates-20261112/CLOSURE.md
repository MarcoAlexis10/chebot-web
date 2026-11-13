# Productor de primera propiedad — límite de la ejecución offline

**Beta V1 NO-GO. No hubo una nueva corrección de código ni pruebas nuevas.** La revisión focal no encontró una primitiva protegida adicional que permita completar property_create con las fuentes disponibles. No se creó otro candidato, SQL, runner, fixture o suite para aparentar avance. Se publica únicamente este cierre solicitado.

## HEADs y alcance

| Repositorio/rama | HEAD verificado antes de escribir |
|---|---|
| chebot-web · qa/cheveni-integral-held-20261111 | 542566416dec51ab64075602d06f9d0aa8facc5e |
| chebot-backend · misma rama QA | 9beb837a621f9a8f06601043afa64b3bba317cb5 |
| cheveni-qa-lab · qa/cheveni-native17-policy-closure-20261106 | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a |

El candidato funcional conserva esos bytes; el único avance del ref web es el commit documental que contiene este archivo, identificable por el enlace inmutable de entrega y verificado después de publicar. Backend y QA-lab sólo lectura. Ref/blobs y ambos workflows web comprobados antes de publicar; sus filtros no incluyen esta rama. Mensaje [skip ci], sin force-push, merge, ramas nuevas o ejecución Actions.

Recuperados el CLOSURE anterior, NEXT-EXECUTION, NATIVE-DELTA, ORIGINAL-CUSTODY-DELTA y TEST-EVIDENCE. Las nueve pruebas previas se conservan acreditadas en su cierre; **no se reejecutaron**, tampoco suites históricas, SQL, Auth, navegador o comandos ASUS. En este lote sólo se leyeron fuentes y comprobaron hashes; eso no es ejecución nativa.

## Por qué la proyección de hechos no completa la autoridad

Se partió de bootstrap-facts-DO-NOT-APPLY.sql, sin buscar de nuevo la captura ni cambiar sus dos guards. Su SHA-256 permanece `6ab635bb2f2af5497eed2635dba2ee63788eb5ae40957375c63a07b3e871f274`.

| Fuente existente | Límite que todavía impide producir autoridad |
|---|---|
| Identidad web → miembro → cuenta, migración 127 | Resuelve relaciones desde auth_user_id; no verifica por sí misma JWT, sesión, exp, revisiones o procedencia de una autorización property_create |
| auth_live / auth_live_v1 del sucesor Native17 | Consultan users/sessions y restringen pares de caller distintos de los perfiles privados propuestos. Un requestId reflejado en LIVE no acredita una verificación del proveedor ni revisiones. No se amplían callers ni se usa SET ROLE |
| founding_manager y owner no revocado, migración 20 | El booleano y el índice de owner son por cuenta; no constituyen una asignación protegida y única del fundador a escala del piloto, con revisión y revocación |
| beta_property_slot_v1 y contadores de la proyección | La PK por account_id permite un slot por cuenta, no un único fundador global. Cero filas visibles bajo RLS no prueba inventario completo; tampoco acredita exclusión entre procesos |
| timezone/city/launch | No son acreditación pre-property de jurisdicción. launch exige propiedad activa y trial iniciado; no se reutiliza ni se inicia el trial para salvar la circularidad |
| private_mutation_authority_v1 | Sigue WHERE false. Faltan productor actual de revisiones, restricciones/floors independientes y cobertura verificable de todos los revocadores antes de los locks de filas |
| manager_result_v1 / captura / read/2 | El resultado histórico liga principal+intent, pero no contiene el sidecar durable de request/attempt/originalRef/revisiones. Read/2 propuesto no equivale a entry instalado o resolver protegido |

El productor operativo sigue HELD. Completarlo exige implementaciones y procedencias concretas, además de validación nativa; no basta ajustar nombres de campos, usar claims o hacer coincidir dos metadatos sintéticos. No se encontró una corrección local adicional respaldada por las fuentes inspeccionadas.

## BPF01–BPF04: qué falta para alcanzar la rama relevante

Se conserva el plan original, sin nuevos IDs o duplicación de N01–N12. Todos siguen **NOT_AUTHORIZED / NOT_RUN**; executableMaterializationSha continúa NULL.

| Aserción existente | Dependencias y artefactos que faltan |
|---|---|
| BPF01 · pre-property/pre-trial | Binding de identidad realmente verificada y sesión actual; productor de asignación/elegibilidad del fundador y CABA; revisión/floor actual; contexto RLS de lectura completa. Hace falta una materialización revisada por SHA que alcance el productor real. Ejecutar los SQL retenidos sólo encontraría los guards, no esa rama |
| BPF02 · cupo/concurrencia/original | Asignación global del fundador con garantía transaccional; admisión durable ligada al original exacto; inventario completo por cuenta, incluyendo draft/paused/archived; constraints y revocadores bajo el fence 1129728581/1 antes del DML/locks de filas; schedule entre conexiones independientes y observación externa de COMMIT. Un slot por cuenta o exclusión JS no cierran esta aserción |
| BPF03 · reader y privilegios | Definición materializada del entry read/2, roles independientes, owner/RLS/contexto y ACL/EXECUTE transitivos/PUBLIC/default ACL capturados. La subobservación negativa de privilegios puede verificarse sin un efecto comercial una vez aprobado ese catálogo; debe demostrar rechazo por privilegio del objeto, no función inexistente o guard interno. La lectura funcional requiere además original→resultado→slot→cuenta, las 26 vinculaciones y autoridad/floor vigentes antes y después de revelar |
| BPF04 · ACK/reinicio/conciliación | Custodio y comparador protegido del original, sidecar de attempt/originalRef, tratamiento específico D02-A, efecto/COMMIT externo y journal/witness independientes. El verificador de invitación inspeccionado devuelve false; CBF1 actual no admite intent de propiedad. Referencias/ACK COMMITTED no sustituyen esos artefactos; ausencia del original conserva UNKNOWN y prohíbe reenvío |

Un rechazo genérico por guard legal/SQL/caller, una tabla vacía o una firma declarada en un fixture son TARGET_NOT_REACHED, no PASS. Las observaciones parciales de catálogo/ACL no acreditarían automáticamente BPF01–BPF04 completos, Auth administrado o A2.

## Fuentes fijadas y comprobadas

- [Consulta candidata y guards, web 5425664](https://github.com/MarcoAlexis10/chebot-web/blob/542566416dec51ab64075602d06f9d0aa8facc5e/qa/property-bootstrap-20261112-v1/bootstrap-facts-DO-NOT-APPLY.sql): blob `cf3591fa532059147b4c6745ec5a0cac70a0983c`.
- [Cuentas/miembros, backend 9beb837](https://github.com/MarcoAlexis10/chebot-backend/blob/9beb837a621f9a8f06601043afa64b3bba317cb5/20-MIGRACION-01-ACCOUNTS-MEMBERS.sql): blob `94d872b3ce13873567c86d85a0ee4924f4b01b5f`.
- [Identidad web, backend 9beb837](https://github.com/MarcoAlexis10/chebot-backend/blob/9beb837a621f9a8f06601043afa64b3bba317cb5/127-MIGRACION-15-MANAGER-WEB-AUTH-TENANT-GUARD.sql): blob `7c7ee0ece4c227a8fedfac68dc0b3eebf31e3e70`.
- [Sucesor Native17, QA-lab ce5c747](https://github.com/MarcoAlexis10/cheveni-qa-lab/blob/ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a/qa/native17-closure-v1/service-successor-REVIEW-ONLY.sql): blob `dbaa9df6389768169412bb4500c69084463ef594`.
- [Captura privada, mismo QA-lab](https://github.com/MarcoAlexis10/cheveni-qa-lab/blob/ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a/qa/cheveni-beta-release-candidate-v1/writer-integration/private-mutations-UNAPPLIED.sql): blob `f41c40d0b490b8cd57dddc13fe50c799f717331c`.
- [Plan BPF conservado](https://github.com/MarcoAlexis10/chebot-web/blob/542566416dec51ab64075602d06f9d0aa8facc5e/qa/reviews/property-bootstrap-20261112/NATIVE-DELTA.json): blob `1704f6ecd61c2eba7bf786a1f475fd86fbb2e3fb`.

## Próximo paso después del diagnóstico ASUS

Usar el ASUS-PREFLIGHT existente, físicamente y con revisión manual, sin considerar el equipo acreditado por su disponibilidad. Aquí no se accedió a ASUS ni se ejecutó ese procedimiento.

Si falta aislamiento/versión/recursos/descarte verificables, conservar HOST_NOT_AVAILABLE y no iniciar PostgreSQL. Si el diagnóstico resulta viable, preparar la autorización concreta del laboratorio y una materialización por SHA con sus productores, roles, datos sintéticos, alcance, límites y descarte. **Un host satisfactorio no completa por sí solo la autoridad ausente** ni autoriza quitar guards, instalar roles o ejecutar BPF/N01–N12.

La prioridad técnica sigue siendo la fuente protegida de elegibilidad/asignación/CABA/revisiones y la admisión/original confiables; D02-A general permanece vigente, sin inventar aprobación de esa custodia específica. No se crearon pruebas, commits funcionales o interfaces extra para reemplazar estas dependencias.

Sin cambios en servicios, código operativo, guards, datos, permisos o infraestructura. Sin gastos, mensajes, altas, claves o firmas. CABA, un manager fundador, una propiedad, 30 días gratuitos desde la primera estadía real verificada; sin cobro/conversión automática y Free separado. Sin GO comercial.
