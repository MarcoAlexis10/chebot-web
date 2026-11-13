# Integración comprobada y frontera conservada

Fuentes: web `bca48ca6d32bbca15a1357114db46cf2fa0c23fa`, backend `9beb837a621f9a8f06601043afa64b3bba317cb5`. `qa/pilot-integration-20261112-v1/SOURCE-PINS.json` fija 57 archivos con blob Git y SHA-256. Las tablas siguientes son comparación de fuentes; no transporte HTTP ejecutado.

| Paso / consumidor real web | Backend real | Contrato y estado en este lote |
|---|---|---|
| Alta/invitación del manager: manager-signup-v1.js, manager-signup-admin-v1.js | index.js → signup-request / signup-admin | Alta administrativa y decisiones conservan guards. Sin usuarios ni invitaciones. |
| Login/restauración: manager-auth-v1.js | GET /api/concierge/manager/session → concierge-manager-session.js | `{ok,session:{account_id,member_id,role}}`. Token sintético en pruebas de UI; Auth administrado NO ejecutado. |
| Propiedades: manager-auth-v1.js | GET /api/concierge/manager/properties → concierge-manager-properties.js | Mismo DTO session + properties. Candidato compara contexto antes de renderizar. **No POST de creación**. |
| Estadías: manager-auth-v1.js | GET /api/concierge/manager/stays → concierge-manager-stays.js | Mismo DTO session + stays, con stay_id/property_id y fechas. Sin creación/modificación/cancelación/checkout web implementados por este GET. |
| Solicitudes: manager-requests-v1.js + manager-request-actions-v1.js | GET requests / POST requests/decision → concierge-manager-requests.js | Lectura `{ok,requests,meta:{account_id,member_id,member_role,count}}`; decisión `{request_id,decision,approved_at_time?}` e Idempotency-Key. Nueva comparación de meta con panel; mutación HELD. |
| Incidencias: manager-incidents-v1.js + manager-incident-actions-v1.js | GET incidents / POST incidents/state → concierge-manager-incidents.js | meta incluye cuenta/miembro/rol y enriquecimientos; estado usa incident_id/new_status/event_summary y manager_message cuando corresponde. Se valida también el contexto de la lectura de conocimiento complementaria. Mutación HELD. |
| Conocimiento: manager-knowledge-v1.js | GET/POST knowledge → concierge-manager-knowledge.js | Lectura knowledge + meta; decisión action/knowledge_item_id/version_id e Idempotency-Key. Deadline cubre headers y JSON, preserva UNKNOWN. No activación habilitada. |
| Invitación huésped: manager-invite-v1.js | POST invites/send → index.js | `{stay_id}`; recibo con id/stay_id/status/already_sent. BFCache sólo permite nuevos controles tras recarga del panel. Sigue guard prelegal/privacidad; no envío real. |
| Cambio de teléfono | POST guest-phone-change → concierge-manager-stays.js → concierge-manager-guest-phone-change.js | Ruta adicional existente; no se añadió un consumidor ni se habilitó. Fuera de las nueve rutas principales anteriores. |

Todas las rutas conservan CORS/Auth/guards existentes. Un 401/403 legible se diferencia de fallo de fetch o cuerpo ilegible; 403 de secciones conserva su significado de permiso rechazado. No se probó CORS en navegador ni se interpretó un error de transporte como rollback. 429/503 no autorizan repetición de una mutación incierta. El backend sigue verificando su propio contexto actual: el predicado nuevo de UI **no es autoridad**.

## Huésped y calendario: fuentes preservadas, sin nueva ejecución histórica

El recorrido privado del huésped está en `backend/index.js`: loadConciergeGuestContext → conciergeGuestWindowCurrent → sendConciergeGuestScopedReply. Relaciona sesión, cuenta, propiedad, estadía, miembro e identidad activa; vuelve a cargar contexto antes del envío. La ventana escrita es `max(check_in_at,access_from) <= now < min(check_out_at,access_until)`. El guard de reply compara binding y rol, y las fechas/dirección para respuestas tipadas. Eso describe código, no revocación transaccional ni entrega de WhatsApp acreditadas.

No existe un portal web privado de huésped integrado en las pantallas manager inspeccionadas. No se fabricó uno para afirmar logout/limpieza de secretos del huésped. El pre-arrival conserva la plantilla global pública; sigue ausente el productor de aprobación pública por propiedad. No se reutiliza el loader privado antes del check-in. Che Vení Free permanece separado.

Se reutilizan los contratos retenidos de stay-lifecycle: borrador sin huésped, asociación, confirmación, fechas, cancelación, checkout e historia son operaciones distintas, sin recodificarlas como create_stay. CBF1 histórico exige sus argumentos originales, incluido huésped. Las pruebas de calendario/CABA/consecutividad previamente publicadas no se repitieron: no cambiaron sus validadores ni SQL. Las nuevas correcciones afectan vistas y respuestas pendientes, no exclusión de reservas o revocación nativa.

## Composición

`materialize.mjs` parte del recorrido/property-bootstrap más reciente y sustituye sólo cinco scripts corregidos. Conserva sus formularios retenidos, plantilla pública, navegación y contratos. No agrega endpoints ni otra aplicación. Los cinco overlays se regeneran localmente y se verifican por OVERLAY-MANIFEST; no se duplican sus cuerpos en Git. La comprobación estática cubrió 8 HTML, 6 JS, 3 scripts inline y 103 referencias locales con sus anclas. CSP connect-src/form-action siguen none. No se conectó el candidato al build operativo.
