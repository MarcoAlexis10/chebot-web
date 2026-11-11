# Recuperación y siguiente ejecución

1. Leer CLOSURE.md, RELEASE-CANDIDATE.json y TEST-EVIDENCE.json de este directorio. Verificar HEADs remotos web/backend/Native17 antes de modificar; conciliar avances sin force/reset/merge. Mantener backend y QA-lab sólo lectura, sin crear ramas backend.
2. Conservar los 21 casos únicos de este lote: 17 reviewer/contrato con dobles y 4 sobre fuentes/perfil. Hay dos fallos adversariales conservados y corregidos; no sumarlos como casos nuevos ni repetir suites históricas. Los comandos, logs y hashes están en TEST-EVIDENCE y PACKAGE-MANIFEST.
3. Antes de cualquier implementación adicional del dominio, resolver el ABI faltante indicado en ROLE-ABI/SECURITY-CONTRACTS: productor protegido de CurrentResolution con revisiones reales, entry incident-only y registro durable intent/attempt/session/authority/dispatch. No convertir manageStays en manageIncidents ni reutilizar service writer amplio como si fuese mínimo privilegio.
4. Completar el scope lector sucesor únicamente como propuesta QA cerrada, reutilizando las proyecciones y fuente protegida Native17 cuando existan. No quitar el aborto o el scope denegatorio para obtener un pase. No otorgar al lector EXECUTE sobre write/run/reconcile histórico.
5. Un laboratorio Native17 PostgreSQL 17.11 y Auth administrado requieren autorización específica y acreditación del entorno. Cuando existan, fijar un artefacto nuevo exacto (el SQL actual DO NOT APPLY no es instalable), obtener catálogo/canales efectivos y ejecutar sólo los casos afectados de revocación, unicidad entre procesos y conciliación/COMMIT. En este lote no se solicitó ni usó esa autorización.
6. Para el puente firmado de incidentes, revisar la incompatibilidad irreducible de schemas CBF1 antes de elegir un sucesor. Exigir vectores SQL/JS, claim y terminal, journal/witness/custodia actuales. No generar firmas para reemplazar esas dependencias.
7. Chromium permanece pendiente de otro laboratorio seguro compatible; no repetir configuraciones que fallan AF_UNIX/EPERM. A2 permanece integral/en cuarentena; no restaurar únicamente tablas ni adoptar floors antiguos.

Prioridad técnica concreta: cerrar el productor protegido de resolución de incidencias y su registro durable de intentos dentro del fence. Ese contrato habilita después probar el reader independiente sin reinterpretar operaciones y sin perder UNKNOWN. La ejecución nativa necesaria sigue bloqueada; mientras tanto sólo corresponde completar fuentes/adaptadores QA que puedan justificarse sin inventar autoridades o evidencias.

## Futura activación/reversión — descriptiva, NO EJECUTADA

Mantener admisión/canales cerrados → verificar release y entorno autorizado → comprobar Auth/roles/ACL/RLS/fence/driver/COMMIT/journal y floors → validar recorrido completo incluido navegador y política legal/privacidad → revisión y GO explícito → activación separada, nunca desde un flag del reviewer. No copiar estos fixtures a configuración operativa.

Ante fallo futuro: cerrar admisión y canales → preservar evidencia/UNKNOWN sin reenvío → revocar bindings/sesiones afectados mediante mecanismo autorizado → volver al artefacto previamente acreditado sólo después de conciliar estados/floors actuales. Volver a código anterior o a un backup no deshace efectos ni restablece permisos revocados. No hay rollback, activación o reversión ejecutados en esta sesión.
