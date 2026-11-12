# Checkpoint 1 — binding de fuentes y recibos

HEADs iniciales remotos: web 5856a2ffdc8efac4683b390a45888aa9cbce891d; backend 9beb837a621f9a8f06601043afa64b3bba317cb5; QA-lab ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a. Coinciden; ninguna escritura en backend/qa-lab.

Código nuevo: evidence-binding.mjs, interfaces tipadas y cuatro casos Node PASS. Vincula usuario/sesión/miembro exactos, cardinalidad, fuente de cuota/jurisdicción/building, decisión/referencia de huésped, revisiones/floor/dataset/epoch e intención/attempt. Bloquea revisiones que desbordarían el incremento. Son modelos de ABI, sin productor acreditado; defaults HELD, recibos UNKNOWN y sin IO. Snapshot sintético sólo efímero en WeakMap, no original confiable.

Descubrimiento concreto en fuentes Native17: manager_action ofrece checkout/suspend/incident_state. checkout tiene revocación y caso-only postcheckout, pero su ABI no transporta la revisión de entidad/restricciones/autoridad esperada del sucesor. suspend pausa launch_control, no concierge_properties: no se puede mapear a property.pause. No se afirma ejecución o compatibilidad operacional.

Próximo: codificar ese delta y la matriz de efectos/revocaciones; luego productor de catálogo mínimo sin texto libre y composición del recorrido retenido. No repetir las 19 pruebas/tres regresiones históricas ni Native17/Chromium. Publicar sólo dos prefijos nuevos en rama QA web existente, [skip ci] y CAS.

## Checkpoint 2 — efectos y productor candidato

Cuatro casos adicionales de effects.test.mjs PASS, con un baseline FAIL nuevo: stay.dates.change tenía revocationRequired=false. El sucesor exige CAS/exclusión, invalidación de bindings, conciliación de invitaciones y floor de revocación. Creación/binding/confirmación/cancelación/checkout/history tienen planes semánticos distintos, sin efecto o envío automático.

Native17 checkout sólo tiene proyección de negocio: p_request es intención estable, p_exp es exp del proveedor en segundos, no vencimiento de observación en ms. No se emite plan de despacho: no caben entidad/sesión/autoridad/restricciones/inventario esperados, original/attempt y recibo independiente. suspend modifica launch_control, no propiedad. El extracto exacto de manager_action es texto fuente .source.txt, no SQL para aplicar o ejecutar.

public-catalog-producer.mjs construye una proyección interna mínima desde fuente/revisión/retirada independientes y la consume mediante reviewPublicProjection anterior. No devuelve DTO con IDs ni texto libre; sólo plantilla global y flags HELD. Tres casos nuevos PASS. Productor protegido default ausente, no acepta adapters.

Total único al checkpoint: 11 PASS nuevos, cero suites anteriores repetidas. Siguiente: selección real DTO de properties/stays frente a revisiones privadas (no inferir revisión desde updated_at), composición del recorrido inerte y consolidación de evidence.

## Checkpoint 3 — DTO originales y revalidación completa

read-selection.mjs reutiliza parseManagerPropertyReceipt real y compara los DTO exactos de GET properties/stays con el suplemento privado de revisión. El DTO no contiene revisión de entidad, cupo, emisor/session_id ni binding de huésped; no se derivan desde updated_at o primera fila. Selección explícita, account/member/role/estado/permisos y ventanas exactos, tipos y cardinalidad coherentes. Tres casos nuevos PASS. ISO con offset o fracción .000000 exactamente representable se convierte a UTC canónico; microsegundos no representables e imposibles se rechazan, sin truncar. Son vectores de forma, no GET real o Auth positivo.

Se amplió un caso de propiedad para detectar dos filas distintas frente al piloto de una sola propiedad: FAIL intermedio del adaptador nuevo, corregido con cierre; no toma el listado como contador de cupo protegido.

Nueva prueba de revalidación detectó que la versión inicial del binding omitía generación del huésped, revisión del building y revisor de decisión. Se fijaron en el binding, FAIL intermedio conservado y cinco pruebas de binding finales PASS (cuatro repetidas por el cambio, una nueva). Sin efecto operativo ni autoridad acreditada en ninguna versión.

Total único: 15 nuevos PASS. Próximo: ensamblar contratos con el candidato retenido existente y validar salida navegable sin modificar scripts compartidos; consolidar matriz corta de dependencias y cierre. No repetir 19 + tres del cierre anterior.

## Checkpoint 4 — composición y formato Native17

candidate.mjs reutiliza las fronteras operativas existentes y agrega los productores protegidos ausentes; ninguna etapa acepta callbacks. materialize.mjs conserva 18 outputs, diez assets JS/CSS anteriores idénticos y formularios/CSP cerrados; agrega sólo compatibilidad/efectos en HTML. integration-first.tap contiene un caso nuevo PASS de composición Node/HTML, no end-to-end operacional.

La comprobación final encontró que datasetId había sido tipado UUID en el nuevo ABI, mientras el contrato existente exige hex de 64 caracteres junto con inventoryDigest, restrictionJournalId y restrictionDigest. Se reutilizó reviewRevisionCut (y sus referencias de bootstrap/commit) en lugar de crear otro comparador. FAIL previo conservado, un caso nuevo y 12 regresiones propias directamente afectadas PASS en binding-native-format-final.tap; nada de Native17 nativo ejecutado.

Total único final: 17 nuevos PASS, cero FAIL finales; las 19 pruebas y tres regresiones anteriores no se repitieron. 147 fuentes locales + dos blobs Native fijados, verificación estática y 18 outputs. Siguiente: cierre/manifiesto y verificación remota final; quedan productores protegidos y evidencia externa, no un permiso pendiente para activar algo ahora.

## Hallazgo de captura privada y cierre técnico

La inspección de helpers privados encontró write_property_capture_v1 y el parser CHEVENI_PROPERTY_CAPTURE_1. Hay primitiva de borrador con slot en fuente, pero sólo dirección estructurada, nombre fijo/defaults, sin building ni configuración completa. property-capture-adapter.mjs reutiliza el parser original; compara todos los campos sin pérdidas y no instancia el adaptador histórico que promueve ACK COMMITTED a DURABLE_EFFECT. Reader histórico usa el principal del writer; la tabla captura address/floor, con custodia/retención no acreditadas. Defaults nuevos write HELD/read UNKNOWN.

capture-first.tap: tres casos nuevos PASS. capture-integration-final.tap repite esos tres tras agregar flags explícitos y el caso de composición por el nuevo puerto/HTML. Total único final actualizado: **20 nuevos PASS**, sin repetir 19 + tres anteriores. 147 fuentes locales y cuatro blobs Native, 18 outputs y diez JS/CSS previos idénticos. Ver PROPERTY-CAPTURE-COMPATIBILITY.md para el alcance exacto; no se mantiene la conclusión provisional de ausencia de toda primitiva.
