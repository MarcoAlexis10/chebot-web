# Compatibilidad real de lecturas y lifecycle

read-selection.mjs usa el helper original backend/concierge-manager-property-receipt.js y las formas exactas producidas por concierge-manager-properties.js y concierge-manager-stays.js. No ejecuta sus handlers, Auth, GET o REST. Las respuestas son vectores de forma, sin autorización positiva.

| Lectura existente | Campos que puede reutilizar el revisor | Qué NO puede inferirse |
|---|---|---|
| properties | property_id/internal_name/property_status/member_role y seis flags, sesión account/member/role | revisión privada, cupo, building, jurisdicción, issuer/session_id o permiso nuevo de alta |
| stays | stay_id/property_id, cuatro ventanas, estado, etiquetas y created_at/updated_at | revisión de entidad, fuente protegida de original o referencia/identidad del huésped |

El suplemento privado sigue siendo un vector explícito de ABI, no productor acreditado. Sin suplemento, devuelve WEB_PRIVATE_REVISION_SOURCE_MISSING. Se compara cuenta/miembro/rol, ID elegido, estado, flags y ventanas con la revisión suministrada; no se elige la primera fila, no se inventa revisión 0/1 ni se usa updated_at como contador. Dos propiedades distintas contradicen el candidato de piloto único y cierran la selección; el listado nunca sustituye el contador protegido de cupo.

La selección de estadía acepta timestamps con offset y fracciones exactamente representables: 15:00-03:00 equivale a 18:00Z y .123000 equivale a .123. Rechaza fracciones con microsegundos no nulos más allá de tres dígitos, fechas imposibles y segundos no representables. Node demuestra que Date.parse trunca .001234 a .001; el nuevo adaptador no hace esa conversión con pérdida. Es compatibilidad de representación, no prueba de lo que devolvió un PostgreSQL real o del digest SQL del original.

Los DTO no se transforman en comandos de escritura. revisionSourceAccredited=false, propertyDtoAuthorizes=false y guestBindingFromDto=false permanecen en las salidas. Las etiquetas privadas no se devuelven a la página pública. La UI conserva formularios vacíos/inertes y todos los scripts JS/CSS del candidato anterior sin cambios.
