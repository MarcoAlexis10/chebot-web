# Proyección pública antes de la llegada

Fuente inspeccionada: Migration 09 y presentación/preview anteriores. Knowledge jerarquiza property > building > account; sus categorías incluyen arrival, checkin y wifi, y sus versiones contienen content libre con estados draft/approved/superseded/rejected. **Ni category=arrival ni status=approved/risk_level=normal certifican contenido público sin secretos.** No se conecta concierge_resolve_knowledge o loadConciergeGuestContext a una ruta pública.

public-projection.mjs implementa la frontera de revisión de una proyección distinta del row de conocimiento: sólo accountId/propertyId, item/version IDs, content/approval/revocation revisions, estado de propuesta, observación/expiración y templateKey. No admite content, HTML, URL, dirección, unidad, nombre, teléfono, hash personal, código o Wi-Fi. El único template permitido sigue siendo la copia pública global ya existente; no hay filtro por palabras intentando sanear texto privado.

El expectedCatalog debe coincidir en cinco referencias/revisiones; se contrasta cuenta/propiedad con el vector de reserva. El preview anterior verifica las siete relaciones de identidad/sesión/cuenta/propiedad/estadía/miembro/invitación y generación/revisión. PROPOSED_PUBLIC_TEMPLATE_ONLY es explícitamente un estado de modelo. Incluso al coincidir, sourceApprovalAccredited=false, producerPresent=false, actualAuthVerified=false y operationalApproval=false. No es una aprobación real ni endpoint.

| Fase | Salida QA | Condición operativa que sigue faltando |
|---|---|---|
| Pre-check-in | Sólo plantilla global si el vector de relaciones y proyección es coherente; de otro modo copy=null | Productor protegido de catálogo aprobado, revisión/retirada y binding vigente del proveedor |
| Ventana privada | PUBLIC_PROJECTION_HELD, sin copy de reserva ni secretos | Puerto privado y restricciones actuales, identidad, tiempo y fuente aprobados; loader intacto |
| Checkout/revocación/expiración | Cierra proyección de reserva; no fallback a contenido de otra estadía | Revocación real concurrente, Auth/SQL/journal; no acreditados |
| Free | Método explícito independiente con título público global | No hereda datos, autorizaciones o bindings de reserva; no es conciliación |

Pruebas nuevas: raw content privado/URL javascript/campos extra/aprobación del cliente/getters rechazados; versiones distintas, retirada, fuente de otra cuenta/propiedad, expiración, refresh/sesión distinta, cambio de revisión y checkout cierran salida. Los resultados no incluyen IDs de reserva. La página QA contiene sólo plantilla global; no se publica una bienvenida específica de propiedad ni se persiste contenido.

Falta productor read-only con proyección mínima separada del almacén privado, aprobación independiente por propiedad, autoridad/revisiones/floors actuales y política de publicación/retirada. D02-A y decisiones legales de finalidad/custodia/retención no se inventan. No se agrega almacenamiento de nombres, teléfonos, hashes o frames para conciliar.
