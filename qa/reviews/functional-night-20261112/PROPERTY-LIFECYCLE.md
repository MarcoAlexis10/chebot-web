# Propiedad: ABI de revisión implementado, puertos retenidos

Código: property-lifecycle.mjs y lifecycle-abi.d.mts del paquete funcional nocturno. SHA exactos en PACKAGE-MANIFEST.json; fuentes originales en SOURCE-PINS.json (web dd1b41fe, backend 9beb837a). Este ABI es una propuesta QA, no RPC, endpoint o protocolo firmado instalado.

## Primitivas y compatibilidad

Migration 02 define la propiedad y su relación compuesta con account/building; Migration 15 resuelve identidad web y acciones vigentes por miembro/propiedad. El listado histórico puede consultar propiedades permitidas. ROOT-DOMAIN-FUNCTIONS.json acota la búsqueda a SQL raíz: no acredita catálogo instalado ni ausencia universal de otra función. Ninguna primitiva inspeccionada proporciona el lifecycle privado propuesto con revisión, cupo y recibos compatibles. El acceso DML histórico de service_role no se usa como adaptación ni se amplía. El CBF1 existente sólo admite create_stay.

Los estados del esquema se reutilizan; las siguientes transiciones son reglas conservadoras **propuestas**, sin autorización operativa:

| Operación de revisión | Estado previo → propuesto | Entrada permitida / condición |
|---|---|---|
| property.draft.create | ausencia → draft | configuración y buildingId opcional; owner en vector, cupo modelado 0, IDs/revisión de propiedad null |
| property.read | estado existente → mismo | cuenta/propiedad exactas, revisión actual; co_manager necesita viewProperty |
| property.configure | draft → draft | configuración completa; mismo building, sin rebind |
| property.submit | draft → ready_for_review | payload vacío; revisar no equivale a activar |
| property.decision | ready_for_review → active o draft | decision approve/return_to_draft, reviewRef y reviewedRevision exactos; productor de decisión ausente |
| property.pause | active → paused | propuesta exige revocación de accesos vinculados |
| property.archive | no archived → archived | propuesta exige revocación; no liberación automática de cupo ni borrado de historia |

Sólo owner puede proponer mutaciones en este modelo; no se deduce una nueva facultad de alta de los permisos históricos. Esa elección conservadora aún requiere acuerdo del contrato y productor protegido. manager conserva lectura histórica; co_manager usa asignación por propiedad. Un UUID de reviewRef o buildingId no acredita su procedencia, aprobación o pertenencia: por eso los puertos no despachan.

## Validación ejecutable

Comando exacto: abi/operation, intentId/attemptId, expectedSessionId/expectedSessionRevision, propertyId/expectedRevision, expectedAuthorityRevision/expectedRestrictionsRevision y payload. No recibe account_id, rol, status o activated_at elegidos en formulario. El contexto separado sólo se acepta con mode=OFFLINE_VECTOR; es un doble explícito, jamás autoridad.

El snapshot comprueba cuenta/propiedad exactas, revisión positiva, estado y activatedAt coherentes, building de la misma cuenta. El contexto exige miembro/sesión activos, vencimiento, no revocación, siete flags con tipos booleanos y revisiones; el comando debe coincidir con su sesión/revisiones. CABA_ATTESTATION_REQUIRED no certifica jurisdicción; el guard histórico Buenos Aires permanece intacto. cohortCount 0/1 es un dato de modelo, no contador protegido o garantía transaccional.

Se reutiliza reviewPropertyShape del cierre anterior y se añade rechazo de Unicode mal formado. El baseline anterior aceptaba un surrogate aislado; Node demuestra que su roundtrip UTF8 altera el texto. No se normaliza silenciosamente ni se ejecuta SQL. Sí se conserva emoji válido. Extras, getters, secretos y cambios de autoridad/cuenta/rol se rechazan.

Salida compatible: PROPERTY_TRANSITION_REVIEWED_HELD, from/to propuestos, receipt=null, sourceProducerPresent=false, cohortGuarantee=false, privatePayloadRetained=false y todos los flags operativos false. Una revisión rechazada no es DENIED de una escritura anterior. createPropertyPorts ignora adapters/payloads: todos sus métodos devuelven PROPERTY_PORT_HELD sin callback, IO o recibo positivo.

## Contrato externo pendiente

Faltan proveedor Auth y vínculo actual user/sub/session/member/account, restricciones y floors independientes, fuente protegida de cupo/jurisdicción/building y decisión, CAS/locks/revisión transaccionales, original confiable y custodia D02-A, serialización aprobada y binding exacto de argumentos, COMMIT externo, reader sin write y journal/witness independientes. La evidencia futura deberá correlacionar intento, intento de transporte, sesión, operación, original, argumentos, revisiones, despacho, efecto y COMMIT; RequiredExternalEvidence sólo declara los campos necesarios, no los fabrica ni define un protocolo cripto nuevo.

No existe persistencia de dirección, nombre o unidad real en este lote. Formularios vacíos/inertes. Archivo/pausa no se consideran realizados por cambiar un rótulo. Ante posible efecto sin evidencia: UNKNOWN, sin reenvío, sin convertir un error de red en rollback.
