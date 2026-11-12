# Primitiva privada de borrador encontrada y adaptador exacto

Se amplió la búsqueda desde los entries de servicio a sus helpers privados. **Sí existe una primitiva parcial** en QA-lab: `concierge_invite_private.write_property_capture_v1`, fuente `writer-integration/private-mutations-UNAPPLIED.sql` en ce5c747c (blob f41c40d0b490b8cd57dddc13fe50c799f717331c). El parser es `fencing/property-review.mjs`, blob 06deafb507d84c57687c71ccfb7f7feb5472b319. Son fuentes no aplicadas; no instalación o ejecución acreditadas.

## Subconjunto compatible

El writer tiene 11 argumentos: user/session/expiry, member/role/revision, account/intent/key, address/floor. Exige principal y owner privados exactos, READ COMMITTED, fence advisory, autoridad property_create, intención/key y límites de texto. En fuente comprueba slot o propiedad ya existente, inserta propiedad draft y slot CABA en la misma transacción prevista, y conserva address/floor en una tabla de captura para comparar intención repetida.

No se declara unicidad SQL observada: faltan laboratorio, participación de todos los writers/revocadores, catálogo y COMMIT. No se ejecuta ni copia un instalador; sólo se conserva extracto fuente .source.txt.

property-capture-adapter.mjs ejecuta **sólo parsePrivatePropertyCapture original** en VM con las funciones de descriptor/tipo originales. No instancia createPrivatePropertyReview ni suministra writeDraft/readDraft. Exige dirección estructurada aportada como tal: street/number/floor/unit; nunca adivina esos campos partiendo del string libre del formulario.

| Campo de la interfaz nueva | Representación exacta en la fuente de captura |
|---|---|
| internalName | Sólo `Primera propiedad` |
| address | street + espacio + number, sin reparseo o normalización con pérdida |
| floorOrUnit | Formato original Piso/Unidad, o null |
| cityLabel | CABA del parser; writer fija Buenos Aires y slot CABA en fuente, sin relajar guard |
| buildingId | Sólo null; no existe argumento de building |
| propertyType / language / horarios | Sólo apartment / es / 15:00 / 10:00, según defaults de esquema revisado; catálogo instalado aún no acreditado |
| status | draft fijado por writer; no lo decide el formulario |

El adaptador compara todos los campos; nombre/tipo/idioma/horarios/unidad diferentes devuelven CONFIGURATION_NOT_REPRESENTABLE, sin descartarlos. Una coincidencia da BUSINESS_SUBSET_REVIEWED_HELD, no un plan de despacho. Conserva privado el texto de dirección; sólo fixtures ficticias en memoria, sin persistencia.

## Recibos y privilegios: por qué sigue cerrado

El adapter histórico createPrivatePropertyReview convierte un receipt.state=COMMITTED en DURABLE_EFFECT. No acredita el COMMIT externo de la conexión: **no se reutiliza ese settlement positivo**. El nuevo write default es HELD y read default UNKNOWN, incluso con un ACK COMMITTED del cliente.

property_receipt_v1 exige el mismo session_user private_mutation_backend y current_user private_mutation_owner que el writer. No es un reader efectivo de credenciales sin escritura. Haría falta sucesor de lectura compatible y evidencia de ACL/roles/conexión, no cambiar un booleano readOnly en JavaScript. No se modifican roles reales ni grants.

El contrato nuevo también exige versión de entidad, auditoría, restricciones/floors, original/attempt y COMMIT/readback/journal/witness que este recibo no representa. La tabla de captura duplica address/floor: su finalidad/custodia/retención operativas no están acreditadas; no se usa con datos reales. El key de mutación es de intención, no se calcula un hash de dirección ni se genera firma.

Resultado: puede reutilizarse la captura inicial bajo ese subconjunto exacto, como candidato retenido. Configuración completa, modificación/revisión/pausa/archivo y fuentes/recibos protegidos requieren ABI sucesor. Este hallazgo corrige la conclusión provisional de ausencia de toda primitiva: faltaba inspeccionar el helper privado, no inventar un POST o usar DML general.
