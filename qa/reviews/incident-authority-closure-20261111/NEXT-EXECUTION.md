# Recuperación y siguiente acción

Leer CLOSURE.md, TEST-EVIDENCE.json, PACKAGE-MANIFEST.json y CONTRACTS.md. Verificar HEADs remotos y comparar cambios concurrentes antes de escribir. Usar la rama web QA existente con expected_sha y [skip ci]; no crear ramas backend ni activar workflows. El checkpoint PROGRESS.md es anterior al cierre y no debe hacer repetir tareas completadas.

Conservar los 22 casos nuevos (18 con dobles, 4 estáticos) y las dos regresiones focales justificadas. Los cinco FAIL intermedios están corregidos y sus logs conservados. No sumarlos ni sumar las repeticiones como casos nuevos. No repetir las 21 pruebas anteriores ni las suites históricas por rutina. Al cambiar un contrato, repetir sólo casos directamente afectados.

Próxima dependencia concreta: implementar y acreditar el productor protegido de revisiones/floors y el vínculo de identidad del proveedor al claim de despacho, usando las proyecciones Native17 y custodia existentes. manager_scope sigue sin revisión y private_mutation_authority_v1 sigue sin filas. No llenar la revisión con 1, deducirla del JWT ni quitar el gate para obtener un pase. Resolver también la procedencia y minimización del original bajo D02-A antes de persistirlo.

Para el SQL de incidencias: preparar un nuevo artefacto revisado con ACL/columnas/RLS y cobertura de hooks de las dos tablas de metadatos. El actual DO NOT APPLY tiene cuatro dependencias denegatorias y no es un instalador. No llamar al helper amplio histórico bajo un login nuevo ni dar write al lector.

Sólo un laboratorio PostgreSQL 17.11 aislado y específicamente autorizado podrá acreditar las conexiones, roles/owners/ACL/RLS, constraints, locks, revocación entre procesos y COMMIT/readback. Auth administrado, journal/witness, A2 integral y Chromium siguen requiriendo evidencia propia; este lote no concede esa autorización. No usar DEV, Supabase remoto, ASUS, gastos o infraestructura nueva.

La recuperación A2 sigue incluyendo PostgreSQL, GoTrue, Vault, Storage, claves/configuración y restricciones/journal/witness independientes posteriores al backup. No adoptar un floor antiguo ni salir de cuarentena con tablas restauradas solamente. Se reutiliza [la dependencia anterior](https://github.com/MarcoAlexis10/chebot-web/blob/a53c698c6f78f25520ef2b07f8d728caeae93677/qa/reviews/domain-security-successor-20261111/NATIVE17-A2-DEPENDENCIES.md), sin nuevos ensayos.

Navegador: conservar los cuatro casos NOT_RUN por AF_UNIX/EPERM para otro laboratorio seguro compatible; no repetir configuraciones o degradar protecciones.

Activación/reversión siguen siendo sólo el procedimiento descriptivo anterior: mantener admisión/canales cerrados, acreditar release/servicios/privacidad/recuperación, solicitar GO separado; ante fallo cerrar admisión, conservar UNKNOWN/evidencia y conciliar antes de cualquier reversión. Volver a código o backup anterior no deshace un efecto ni restablece permisos revocados. No se activó ni revirtió nada.

Che Vení Concierge sólo CABA: un manager fundador, una propiedad, 30 días gratis, sin cobro automático; Free separado en otras ciudades. Sin fecha prometida ni usuarios reales. Beta V1 NO-GO.
