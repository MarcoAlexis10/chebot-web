# Recuperación y siguiente paso

Leer CLOSURE, TEST-EVIDENCE, PACKAGE-MANIFEST, CONTRACT-DELTA y NATIVE17-EXECUTION-PREREQUISITES. Verificar los tres HEADs y preservar avances concurrentes. Sólo rama QA web existente, [skip ci], expected_sha; sin nuevas ramas backend, merges, resets, force o workflows.

Conservar los 17 casos nuevos: nueve del binding con dobles, dos de política pura de revisiones y seis estáticos de SQL/ACL/hooks/captura. No sumar pasadas o fallos intermedios. Los errores iniciales del fixture eran una colisión de nombre entre contador y objeto de claims (ocho FAIL conservados); los dos fallos de contrato reproducidos fueron grants transitivos SECURITY INVOKER y freshness/provenance del cut del modelo. Todos están corregidos. No repetir los 22+2 o suites históricas sin impacto concreto; no se ejecutaron en este lote.

Prioridad pendiente: acreditar productor independiente del cut de autoridad/restricciones y attestor del proveedor/original. La revisión local no se sustituye por restrictionSequence y el witness no avanza por COMMIT automáticamente. Falta resolver el orden de todos los revocadores, incluido GoTrue/journal fuera de PostgreSQL. Los gates, RLS source context y bridges siguen cerrados; no quitar abortos o cambiar false por true.

Para Native17, el propietario aún debe identificar un host gratuito descartable con aislamiento completo y aprobar por hash una materialización de laboratorio distinta de estos archivos abortados. El documento de prerrequisitos define N01–N12, roles, evidencia, límites y descarte; no concede autorización. Si ese host o esos artefactos no existen, no iniciar motor, no contratar infraestructura y continuar sólo tareas de fuente justificadas.

Revisar EXPECTED-CATALOG y SQL-ARTIFACTS: sólo cinco entries para tres logins, owners NOLOGIN, grants de columna y políticas denegatorias donde falta contexto protegido. La proyección de providerRef de las tablas de efecto no está implementada. pg_depend es insuficiente para demostrar el cierre de referencias tardías. No declarar mínimo privilegio hasta observar el catálogo y los rechazos reales.

A2 permanece integral y en cuarentena: PostgreSQL, GoTrue, Vault, Storage, claves/configuración, restricciones independientes, journal/witness e inventarios/floors posteriores al backup. No restaurar tablas como si recuperaran el sistema ni adoptar pisos antiguos. No repetir Chromium AF_UNIX/EPERM; sus cuatro casos esperan otro laboratorio seguro compatible. CBF1 permanece create_stay-only y no se firma un protocolo nuevo.

Activación/reversión sólo descriptivas: conservar admisión/canales cerrados hasta evidencias completas y GO separado. Ante un fallo futuro, cerrar admisión, preservar UNKNOWN/historia y conciliar antes de revertir; volver a código/backup anterior no revierte efectos ni permisos revocados. Ninguna activación/reversión ejecutada.

Che Vení Concierge: CABA, un manager fundador, una propiedad, 30 días gratis, sin cobro automático; Free en otras ciudades. Sin fecha prometida. Beta V1 NO-GO.
