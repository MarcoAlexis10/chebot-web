# Recorrido integral retenido

Fuentes y hashes exactos: SOURCE-PINS.json del paquete. Todas las páginas nuevas están sólo bajo QA/generated; no se cambia el build ni se crea endpoint. Ninguna fila equivale a un piloto operativo.

| Paso | Función o archivo real | Implementación nueva / evidencia | Frontera pendiente |
|---|---|---|---|
| Registro retenido | manager-signup-v1.js → manager/activar/ | Navegación apunta a ruta existente; guard legal intacto | Invitación/identidad/aprobaciones y Auth reales |
| Inicio/restauración | manager-auth-v1.js y compositor fundador | Script generado idéntico al cierre anterior; cinco + tres preservadas sin rerun | Auth administrado, revocación/refresh/expiración/CORS reales |
| Propiedad | Migration 02, Migration 15; manager-v1.js propiedades | Revisión de shape/duplicado sintético; página inerte; enlace Administrar deja de volver a su propia sección | ABI de alta/configuración/revocación, jurisdicción, cupo 1/1 y unicidad nativa |
| Estadía | concierge-guarded-intake.js, draft SQL; codec CBF1; conciergeZonedLocalToIso | Detección de incompatibilidad y ventanas, calendario corregido QA, planificación sin datos del huésped; enlace existente dirige al plan retenido | Alta sin huésped y lifecycle ausentes; writer/COMMIT/privacidad |
| Huésped/invitación | manager-invite-v1.js; handleConciergeManagerInviteSend | Enlace a sección estadías existente, script anterior idéntico; sin envío | Invitación/identidad/canal/readiness y permisos reales |
| Pre-arrival | presentation.mjs; nuevo previewPrearrivalVector | Plantilla pública fija, sin loader privado ni fuente libre; pruebas de binding/versiones negativas | Productor aprobado por propiedad, Auth real y contexto actual |
| Secretos | loadConciergeGuestContext, conciergeGuestWindowCurrent | No se relaja ventana ni se incluyen secretos en nuevas páginas | SQL/autoridad/secrets/retención reales |
| Solicitudes/incidencias | manager-request-actions-v1.js, manager-incident-actions-v1.js | Navegación a anchors reales; scripts compartidos intactos | Once mutaciones históricas HELD, Native17 D1–D8 |
| Modificar/cancelar/checkout | createHeldLifecycleCandidate; effectiveStayStatus original | Métodos explícitamente HELD; UX explica UNKNOWN y no reenvío | ABI propio, revocación atómica, reader/journal y motor nativo |
| Después de checkout/Free | freeGuidePreview; conciergePastCheckoutStayEligibleForFreeNotice | Free explícito sin herencia de datos de reserva; sólo plantilla | Concurrencia/reservas consecutivas y revocación reales |
| Recuperación | boundary original, D02-A, A2 | Sin persistencia privada nueva ni reintentos | Original confiable, COMMIT y recuperación integral acreditados |

Correcciones efectivas QA: rechazo de fechas imposibles antes de la conversión original, rechazo de adaptación pending con pérdida de access window y enlaces nuevos a rutas inexistentes sustituidos por rutas/anchors existentes. Detección local de duplicado/solapamiento sigue siendo un indicio sobre vectores, nunca autoridad o exclusión SQL. Registro→sesión→propiedad→estadía→huésped→solicitudes/incidencias→checkout puede recorrerse como interfaz retenida; no se probó navegador ni funcionamiento backend extremo a extremo.
