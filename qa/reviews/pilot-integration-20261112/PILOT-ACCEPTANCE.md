# Aceptación del primer piloto — NO-GO

| Clase | Evidencia / condición | Estado |
|---|---|---|
| A · offline ejecutado | DTO session/meta coherente entre cinco consumidores y panel; rechazo de cambio de cuenta/miembro/rol; read complementario de incidencias | PASS Node + DOM sintético; no autentica al manager |
| A · offline ejecutado | Deadline de decisión de conocimiento con headers/JSON detenidos; late ACK no libera UNKNOWN ni reenvía | PASS dobles; no escritura/COMMIT |
| A · offline ejecutado | 403 conserva diagnóstico de permiso; logout/denial limpian filas/labels sin borrar intención incierta | PASS; tres regresiones Auth previas seleccionadas |
| A · offline ejecutado | BFCache invalida binding anterior, permite filas nuevas y conserva UNKNOWN; 401 viejo no borra sesión nueva | PASS DOM; dos regresiones previas de invitación seleccionadas |
| A · estático | 57 fuentes por hash, composición, sintaxis y enlaces, CSP sin red/formularios | PASS; no navegador ni HTTP |
| B · preparado sin ejecutar | Cuatro casos de navegador existentes, BFCache real y CORS legible/ilegible | NOT_RUN; no reintentar Chromium en este host |
| B · preparado sin ejecutar | Auth administrado, JWT anterior a revocar, refresh, checkout concurrente | NOT_RUN; se necesita proveedor/entorno/autorización específicos |
| B · preparado sin ejecutar | Native17 N01–N12 y BPF01–BPF04 | NOT_AUTHORIZED / NOT_RUN; host no acreditado aquí |
| C · fuente/evidencia ausente | property_create pre-property, cupo/CABA/revisiones/floors; captura/original/readback/journal | HELD; no buscar otro productor ficticio |
| C · fuente/evidencia ausente | Admisión y original durable, COMMIT externo, reader de menor privilegio, revocadores y custodia | HELD; ACK no demuestra efecto durable |
| C · fuente/evidencia ausente | Creación/gestión web de estadía, asociación posterior e invitación con autoridad actual | HELD; GET de stays no proporciona esas mutaciones |
| D · decisión humana | Finalidad/custodia/retención D02-A de datos concretos; legal/prelegal; autorización comercial | Pendiente; no se inventan aprobaciones ni plazos |
| E · posponible | Publicación/activación de aprendizaje, cambio de teléfono desde panel, expansión multi-propiedad/ciudad | Fuera del primer piloto; no suprimir identidad, revocación o privacidad para posponerlos |

Invariantes del piloto: CABA, un manager fundador, una propiedad; 30 días gratuitos desde primera estadía real verificada; sin cobro ni conversión automática. No hay manager elegido, trial iniciado ni fecha comprometida. Las categorías A no satisfacen B/C/D.
