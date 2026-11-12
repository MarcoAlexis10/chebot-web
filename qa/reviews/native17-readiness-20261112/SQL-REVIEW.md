# Revisión cruzada de siete artefactos — fuentes, no motor

Origen inmutable: web `4d4467042560a56ac7af0633e7c93064d2fad2b0`. Los siete SHA256 anteriores y sucesores están en [DERIVATION.json](../../native17-readiness-20261112-v1/DERIVATION.json). Los 20 inputs del paquete anterior coincidieron en SHA256 y blob remoto; no se modificaron. Se reutiliza la base Native17 `ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a`, sin reensayar sus comprobaciones históricas.

| Cruce | Incompatibilidad observada en fuentes | Corrección retenida / límite |
|---|---|---|
| 00-source-base / 03-bound / 04-ACL | FOR UPDATE de intent_binding exige UPDATE, que no está propuesto para el historial inmutable | SELECT sin row lock bajo el fence obligatorio del entry; no conceder UPDATE al historial. La cobertura real del fence sigue pendiente |
| 04-ACL y policies preexistentes | Policies permisivas falsas no constituyen una restricción frente a otra policy permisiva amplia; sólo metadatos tenían ENABLE/FORCE explícitos | Todas las policies nuevas AS RESTRICTIVE, con ENABLE/FORCE propuestos para fuentes/efectos. No agregar una permisiva true. Sin baseline permisiva aprobada, acceso sigue denegado |
| 00-source-base / 02-admission / 03-bound / 04-ACL | Efectos sin providerRef obligaban a policies con NULL; faltaba enlace íntegro a admisión | NOT NULL en intención e intento; claves compuestas user/intent/original/provider hacia intención/admisión; writer proyecta el ref y reader contrasta ambas filas; grants/policies/column order actualizados. Nada instalado o backfilled |
| 02-admission / original protegido | KNOWN devolvía historia sin comparar la referencia original obtenida para la solicitud actual | Comparación de referencia y validación del original protegido/operación/scope antes de NEW/KNOWN. Original contradictorio queda UNKNOWN/closed, no CONFLICT fabricado. La función original sigue denegatoria |
| 03-bound y tiempo de proveedor | Binding se verificaba antes de lecturas finales pero no después de ellas | assert_provider al final de writer y reader, además de los controles de autoridad/floor. Propuesta SQL no ejecutada |
| provider-binding.mjs y await de resolución | Prueba Node nueva reprodujo compilación tras vencer el binding durante await | Revalidación de expiresAtMs después del await; se comprueba write/read en el caso nuevo y ABI correcto en una regresión previa focalizada |
| 05-catalog / roles efectivos | Captura EXECUTE sólo de logins y sin privilegios de schema ni DELETE/TRUNCATE/TRIGGER/REFERENCES | Incluir owners y schema owner/ACL/USAGE/CREATE, privilegios de tabla antes omitidos. Sigue siendo captura abortada y no ejecutada |
| Base legacy y proyección sucesora | Entries antiguos sin providerRef no son compatibles con las nuevas columnas | Ambos bodies legacy quedan en denegación explícita LEGACY_UNBOUND_ENTRY_HELD y sin grants al LOGIN; no inferir ref ni fallback |

[COHERENCE-REPORT.json](COHERENCE-REPORT.json) registra 19 instancias textuales en siete categorías SQL, agrupadas en cuatro casos nuevos estáticos, antes de corregir. Varias instancias son el mismo patrón en diferentes tablas. **No son 19 fallos PostgreSQL ni 19 pruebas nuevas.** El quinto caso nuevo es el await modelado con dobles, que también falló antes de la corrección.

El verificador independiente de revisión contrasta siete hashes, 33 cuerpos/owners/security/calls, 29 grants de columnas, 25 EXECUTE declarados, 27 contextos efectivos de llamadas desde entries y las columnas/orden de cuatro tablas. Su gramática es deliberadamente la de estos fuentes sellados: no es un parser SQL, no prueba resolución nativa de operadores/casts/defaults ni completa pg_depend. Ningún PASS estático acredita ACL efectiva instalada.

## Dependencias irreducibles retenidas

Los hooks BEFORE no pueden presentarse como prueba de fence anterior a cualquier lock de tabla: PostgreSQL adquiere locks implícitos para DML/TRUNCATE/DDL. Se necesita un entry del revocador que adquiera el fence **antes de emitir el comando** y observar el orden real en N03/N05/N12. El hook conserva valor como backstop; no se eliminó. No se implementó un chequeo pg_locks que confunda un advisory lock de sesión con uno transaccional, ni una GUC del cliente como prueba.

No hay productor acreditado del scope source, floor independiente, proveedor o original. Clock sin seed y todas las funciones denegatorias siguen así. Políticas restrictivas, llaves y metadatos no aportan esa autoridad. La proyección nueva no autoriza persistir IDs/ref en un sistema real: también requieren finalidad, minimización, acceso, cifrado/custodia y retención D02-A.

El ABI binario/criptográfico existente no se altera. CBF1 sigue create_stay-only. Los entries SQL de incidencias mantienen ABI 17/10; los de admisión/claim siguen 11/9. Sus respuestas JSON de metadatos no son automáticamente el contrato camelCase de un attestor JS: falta un adaptador privado acreditado, sin relabel de KNOWN ni pérdida del original. No se conectó el candidato al runtime.

Readback no recibe DML ni invoca el negocio. EFFECT_OBSERVED y OUTCOME_REQUIRES_COMMIT_OBSERVATION no prueban outer COMMIT; journal/witness e independencia de credenciales/canal/custodia no están observados. ACK perdido sigue UNKNOWN, sin reenvío automático o recuperación desde snapshot del cliente.

Referencias primarias consultadas en lectura: [PG17 SELECT](https://www.postgresql.org/docs/17/sql-select.html), [PG17 CREATE POLICY](https://www.postgresql.org/docs/17/sql-createpolicy.html), [PG17 Explicit Locking](https://www.postgresql.org/docs/17/explicit-locking.html). No se abrió ningún motor ni conexión de base de datos para revisarlas.
