# Checkpoint 1

Refs iniciales verificados: web f2b5819829fcb8668e698c934add058efbb3746a, backend 9beb837a621f9a8f06601043afa64b3bba317cb5, QA-lab ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a. Sin avances posteriores al recuperar. Backend y QA-lab sólo lectura.

Fuente exacta private-mutations-UNAPPLIED.sql confirma private_mutation_authority_v1 con SELECT NULL WHERE false. check_private_mutation_authority_v1 exige una fila y la tupla account/member/role/revision exacta, property_create owner y target null. Reader histórico exige principal del writer. Esto no se sustituye por filas positivas ficticias de autoridad real.

Código nuevo: capture-contract.mjs, tipos y tres casos Node nuevos. Validación explícita de operación/target, identidad/sesión, founder separado, revisión/cupo/jurisdicción/epoch y defaults del parser anterior. No writer descriptor, sin IO. Orden de claves en comparador de intención corregido con FAIL/PASS focal (mismo caso, no test adicional). Defaults protegidos HELD/UNKNOWN e ignoran callbacks.

Próximo: sucesor concreto de lectura independiente, separación función/ACK/COMMIT/efecto/journal/original, política D02-A para duplicado address/floor y composición de preparación de configuración sin una propiedad creada ficticiamente.

Antes de publicar: el comparador nuevo también se fijó al scope/revisiones completos reutilizando createDomainAbiReview. Se conserva un segundo FAIL/PASS focal del mismo caso al cambiar founder.scopeRevision. Los dos fallos son del candidato nuevo, sin efecto operativo ni casos únicos adicionales. Extractos de autoridad/receipt/tabla desde el blob f41c40d... se conservan como texto .source.txt, no SQL ejecutable.

## Checkpoint reader y privacidad

Primer commit publicado: f98af7365e045933f1c46abf902721da05c82be1. Se agregan ABI read/2, parser de recibos conservador, revisión de cadena sintética, perfil de reader y propuesta D02-A específica. Siete casos únicos nuevos PASS acumulados (tres captura, tres conciliación y uno perfil). En conciliación se corrigieron datasetId tipado incorrectamente como número (fuente: digest string) y una lectura previa a validar un accessor: FAIL/PASS conservados. Nunca se convirtieron esos errores en permiso o efecto. Los getters se rechazan antes de acceder a campos anidados. Ningún SQL generado/ejecutado. Próximo: composición del recorrido con captura estructurada inerte, lectura UNKNOWN y preparación de configuración HELD.

## Checkpoint de composición

Segundo commit: a9e206a044c5f6cd060794edd419d3f29065f49e. Se compone el candidato existente con las nuevas fronteras cerradas. La pantalla privada reutiliza los diez assets previos intactos, reemplaza sólo el formulario incompatible de dirección libre por street/number/floor/unit inertes y enlaza revisión, borrador no creado, lectura UNKNOWN y configuración HELD. Dos casos de composición nuevos PASS.

Se agregó un caso nuevo que demostró que p_expiry no estaba ligado al contrato del token: FAIL conservado, corrección con ProviderTokenObservation sintético separado y cuatro casos de captura PASS (tres son regresiones focalizadas propias, no casos nuevos). No se confunde expiresAtMs de una observación con expiración JWT. Dos casos de reader reejecutados porque se extendió su binding de sesión/issuer/iat/exp: PASS. Total único del lote: diez casos nuevos PASS, sin contar repeticiones ni subaserciones. Dieciocho archivos QA materializados con el launcher sin red; no navegador, SQL o Auth administrado.
