# ABI sucesor mínimo y límites acreditados

Web base 5856a2ffdc8efac4683b390a45888aa9cbce891d; backend 9beb837a621f9a8f06601043afa64b3bba317cb5; Native17 ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a. Blobs y hashes: SOURCE-PINS.json. Código: evidence-binding.mjs, evidence-abi.d.mts y effect-plan.mjs. No ABI SQL/HTTP instalado.

## Propiedad y autoridad

Se reutilizan las siete operaciones del lifecycle anterior, sin renombrarlas a create_stay. El comando no recibe account_id/rol/status de formulario; el contexto de revisión se vincula a observaciones separadas de proveedor, único miembro vigente, restricciones/floor, jurisdicción, cupo, building y decisión cuando corresponda. Ninguna observación sintética es una autoridad real. createProtectedDomainPorts devuelve HELD antes de leer argumentos o callbacks.

Requisitos implementados de forma/correlación:

- Proveedor QA exacto, user/session/sessionRevision y no revocación; un emisor DEV se rechaza. No se llama getClaims ficticio ni se verifica JWT real.
- Cardinalidad de miembro igual a uno; usuario/sesión/cuenta/miembro/rol y revisiones exactos, cuenta active/testing e identidad/miembro activos.
- Dos observaciones de restricciones/floor coincidentes en cuenta/propiedad, dataset/epoch, revisiones, inventario y procedencias, con vencimiento. blocked debe ser false en el vector.
- Se reutiliza **reviewRevisionCut** existente: datasetId/inventoryDigest/restrictionDigest son hex de 64 caracteres, restrictionJournalId tiene su formato original y se exigen referencias bootstrap/commit. No se generan hashes personales o comprobantes. La adaptación de nombres authorityRevision→authorityVersion es sólo correlación escalar de modelo, no evidencia de alcance/autoridad física.
- Jurisdicción CABA y cuota observadas separadamente del rótulo UI/listado, revisión de inventario exacta; ninguna garantiza contador transaccional. No se modifica el guard histórico Buenos Aires.
- Building actual de la cuenta, revisión de decisión y revisor, referencia/generación actual del huésped; no basta un UUID. La revalidación compara también sus revisiones/generaciones, no sólo IDs.
- Observaciones con TTL <=5 segundos; revalidar después de un await puede cerrar por cambio, expiración o piso distinto. La entidad necesita todavía un productor protegido real y fence/CAS.

El sucesor rechazaba inicialmente un dataset con formato Native17 correcto porque había tipado datasetId como UUID. El nuevo caso FAIL/PASS y el comparador original corrigen esa incompatibilidad. También se corrigió la omisión de generación de huésped/revisión de building/revisor al revalidar. Son defectos del candidato QA, nunca una autorización o efecto operativo.

## Original, argumentos y recibos

El review guarda un snapshot **sintético y efímero** en un WeakMap por instancia; no es original confiable, NEW/KNOWN durable o custodia D02-A. No devuelve dirección/configuración/frames; release elimina la referencia. No hay garantía de borrado físico de cadenas JS. Sólo datos ficticios, sin persistencia nueva. No reconstruye un original al reiniciar.

La comparación de objetos tipados no depende del orden de claves; no se inventa un digest SQL o protocolo firmado. Cambiar argumentos produce mismatch HELD de revisión, no un DENIED/CONFLICT operacional ni permiso de reenvío.

inspectReceipt correlaciona intención/attempt/operación/sesión/cuenta/miembro/propiedad/revisiones y referencias de original/despacho/COMMIT/readback/journal/witness, pero **siempre devuelve UNKNOWN**. Coincidencia de campos o IDs distintos no demuestra COMMIT, firmas, custodia o independencia física. Los puertos y el candidato compuesto conservan UNKNOWN y sin retry incluso ante ACK o snapshot del cliente.

## Primitivas inspeccionadas

| Fuente real | Alcance | Frontera |
|---|---|---|
| GET properties / parseManagerPropertyReceipt | Lectura de DTO/flags por propiedad | No revisión privada, cupo, building, jurisdicción o autoridad de mutación |
| DML en esquema/fixtures | Restricciones escritas de tablas y escenarios | No se usa DML general como primitiva privada ni se ejecutan fixtures SQL |
| Private write_property_capture_v1 | Borrador, dirección estructurada y defaults fijos; slot previsto | Subconjunto exacto revisable, no lifecycle completo, catálogo/COMMIT/reader/retención acreditados. Ver PROPERTY-CAPTURE-COMPATIBILITY.md |
| Native17 manager_scope | Sesión/miembro/acción sobre propiedad existente dentro de launch | No crea borrador ni resuelve propiedad inexistente o draft de fundador |
| Native17 manager_action checkout | Efecto checkout y revocaciones escritos en fuente | ABI/recibo parcial; no se emite plan de despacho |
| Native17 manager_action suspend | Pausa launch_control | No es property.pause; mapeo explícitamente rechazado |
| CBF1 privado | Sólo concierge_manager_create_stay, con huésped | No incorpora lifecycle de propiedad/estadía por fallback |

Faltan productor protegido de cuenta/fundador antes de existir propiedad, cuota/jurisdicción/building/decisión, serialización aprobada para nuevas operaciones, admisión/original, writer mínimo, COMMIT externo, reader sin write y journal/witness. El contrato tipado prepara esos límites; no los instala ni certifica.
