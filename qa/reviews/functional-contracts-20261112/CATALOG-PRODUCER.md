# Productor candidato de catálogo público

public-catalog-producer.mjs conecta una proyección mínima al reviewPublicProjection existente. No conecta knowledge privado, loader de check-in, SQL o endpoint público.

Entrada propuesta separa tres observaciones con expiración propia:

1. source: cuenta/propiedad/item/versión, revisión de contenido/fuente y templateKey.
2. review: mismos IDs y revisión de contenido, reviewRef, revisión de aprobación y de su autoridad. Estado exclusivamente PUBLIC_TEMPLATE_REVIEW_CANDIDATE: no firma ni aprobación real.
3. withdrawal: misma cuenta/propiedad/item, piso de retirada y revisiones actuales de contenido/aprobación; withdrawn=true cierra el productor.

Todas deben coincidir con expectativas actuales y el binding de reserva anterior. Se vinculan también reviewRef y sourceRevision: no basta copiar approved=true o un número de versión. Se calcula la vigencia común mínima y se pasa el DTO interno estricto al consumidor existente; no se devuelve esa proyección con IDs al cliente.

Único contenido permitido: la plantilla global pública ya existente, public_guide. No admite content libre, HTML, URL, dirección, códigos, Wi-Fi, teléfono, nombre, hash personal o campos desconocidos/getters. No hay filtrado por palabras intentando convertir texto privado en público. during/check-out/session mismatch/retirada/expiración cierran la salida; Free continúa como método explícito independiente, sin fallback de datos de reserva.

El productor protegido default está ausente y no acepta adapters del cliente: produce retorna copy=null/HELD. La página QA sólo presenta la plantilla general. sourceApprovalAccredited=false y protectedProducerPresent=false incluso en un vector compatible. No se crea aprobación, almacenamiento o fuente de autoridad. Faltan custodia, fuente de aprobación y retirada independientes acreditadas, publicación mínima y D02-A aplicable antes de cualquier dato real.
