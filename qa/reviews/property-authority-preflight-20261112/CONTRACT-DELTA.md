# Cambios específicos frente al cierre de primera propiedad

| Incompatibilidad de fuente | Resolución candidata QA | Pendiente |
|---|---|---|
| scope_v2 exige p no NULL, manage_stays y propiedad activa | Se rechaza su composición para property_create; no se cambia el codec create_stay | Nuevo productor protegido de primera propiedad |
| manager_scope usa launch con propiedad activa y beta_started_at vigente | No iniciar un trial para resolver una circularidad técnica; no reutilizar launch | Fuente de fundador/cupo/jurisdicción independiente del lanzamiento |
| auth_live/fence sólo admiten pares service_* | Perfil read/2 no llama esos helpers con su principal nuevo; no SET ROLE ni ampliación implícita | Entry Auth/fence compatible, ACL transitivas y revocadores acreditados |
| Captura histórica y recibo llaman property_create | Read/2 declara permiso separado property_capture_read y consulta slot ocupado; no vuelve a reclamar cupo libre | Productor de lectura actual, sin EXECUTE de writer |
| Original atado a sesión/revisión histórica vs lectura nueva | Histórico inmutable y corte actual separados; nuevo request de lectura ligado a su sesión/iat/exp | Auth real y custodia de original/procedencia |
| Dos observaciones locales iguales pueden ser anteriores a un floor vigente | Reutilización de reviewRevisionCut con floors separados antes/después; ausencia/drift rechaza la consistencia del modelo | Custodia y fuente real independiente de floors |
| Recibo histórico tiene nueve argumentos y no representa originalRef/attempt/floors | readAbi() especifica 26 argumentos exactos propuestos, sin statement ni instalación | Materialización autorizada, ABI de original/COMMIT/journal/witness |
| Key por intención no contiene dirección/unidad | Referencia opaca no acredita igualdad: se exige comparador del original, sin digest personal nuevo | Custodia/minimización/retención específica D02-A |

readAbi() conserva el nombre property-capture-independent-read/2 propuesto en el cierre anterior y concreta su firma de revisión; no afirma que ese entry exista. Sus UUID/digests deben ser obtenidos por el gateway/custodio protegido, nunca un formulario. p_dataset/p_key/p_inventory_digest/p_restriction_digest son bytea de 32 bytes en el contrato futuro; las revisiones bigint deben ser enteros seguros >0. p_issuer sólo QA, p_expiry/iat en segundos y p_role owner derivado de fuente. No se entrega un decoder de cliente, driver, SQL o fallback.

El lector no recibe dirección ni snapshot. La propiedad se resuelve por original→resultado→slot→cuenta bajo la fuente protegida; un ID del cliente no selecciona otra propiedad. Sólo campos identificadores/de estado previstos en el perfil anterior, sin SELECT de property_capture_v1.address/floor. Faltan contexto RLS protegido, políticas selectivas y dependencias EXECUTE transitivas: conservar profile HELD, no añadir USING(true), BYPASSRLS u ownership de tablas para salvar el permiso.

No se implementa settlement: función/ACK, COMMIT externo, efecto, reader, journal y witness conservan funciones separadas. No se introdujo otro protocolo de firma. Una cadena de UUID/modelos no acredita custodia o independencia física. Tras reinicio, si no existe original protegido, recover devuelve UNKNOWN y no NEW. Una revocación no borra historia ni autoriza revelar resultados privados.
