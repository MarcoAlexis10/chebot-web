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
