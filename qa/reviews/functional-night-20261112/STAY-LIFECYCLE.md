# Estadías: operaciones distintas y revisión de calendario

stay-lifecycle.mjs reutiliza los estados exactos de Migration 03, el validador de calendario CABA anterior y la frontera de contexto compartida. No llama pending, writer, SQL o WhatsApp. CBF1/concierge_manager_create_stay y el intake histórico siguen sin cambios y siguen exigiendo huésped. operation_id de WhatsApp no se convierte en intentId web.

| Operación de revisión | Regla propuesta | Falta para efecto real |
|---|---|---|
| stay.draft.create | sin stayId/snapshot/revisión; cuatro fechas; → draft, sin huésped | Tabla permite draft sin miembro huésped obligatorio, pero no existe primitiva privada compatible inspeccionada |
| stay.guest.bind | draft, sin binding previo; protectedGuestBindingRef válido | Fuente protegida de identidad/reserva, privacidad y recibo; UUID no prueba identidad |
| stay.confirm | draft con binding; inicio futuro; → scheduled | Autoridad, readiness/restricciones, exclusión transaccional y COMMIT |
| stay.dates.change | draft/scheduled, revisión vigente; cuatro fechas completas | CAS/fence y revocación/revisión de invitaciones/autorizaciones existentes |
| stay.cancel | draft/scheduled antes del inicio; → cancelled | Revocar accesos y conciliar efectos, sin borrar historia |
| stay.checkout | scheduled/active al checkout o después; → completed | Revocación atómica, secrets/sesiones, reader/journal; checkout temprano no se inventa |
| stay.history.read | snapshot/revisión de cuenta y propiedad actuales | Nueva autorización vigente para historia; no reutilizar autorización anterior |

Todas son propuestas HELD con receipt=null, sin materializar estancia o binding. createStayPorts no acepta writer ni callback operativo. Una decisión de negocio todavía requiere contrato aprobado; el esquema no acredita por sí solo estas transiciones.

## Incompatibilidad corregida

El reviewStayPlan anterior rechazaba los estados SQL draft/revoked como inventario inválido. Se conserva el baseline FAIL. El sucesor reconoce los seis estados draft/scheduled/active/completed/cancelled/revoked y sólo considera scheduled/active para solapamiento, como el predicado escrito del esquema. Editar excluye el propio registro únicamente si id, cuenta, propiedad, revisión, estado y ventanas coinciden exactamente. Si falta el registro editado, hay IDs duplicados o el inventario contradice el snapshot, cierra la revisión; nunca escoge la primera fila.

La revisión de ventanas es [accessFrom,accessUntil), sin recortar ventanas ampliadas a fechas: salida de A igual a entrada B es adyacencia; un minuto superpuesto es conflicto. Sólo se revisa el inventario suministrado, acotado a 100 filas y al ámbito exacto. Que no haya cruces en ese vector no demuestra inventario completo, SQL EXCLUDE, unicidad o ausencia de carreras entre workers.

## Calendario y vigencia comprobados en Node

Leap day 2028 válido; 2027-02-29 inválido; límites de mes/año y conversión local CABA→UTC (15:00→18:00Z y 23:30→día UTC siguiente). Orden de entrada/salida/acceso e intersección estrictos. Cambio de fecha al inicio ya ocurrido se cierra. La revisión de fechas exige expectedSessionId/sessionRevision, autoridad, restricciones, entidad e inventario actuales; no permite cambiar propiedad usando una respuesta antigua.

La ventana privada no se amplía: el loader existente y el clock guard conservan max(check-in,access_from) <= now < min(checkout,access_until). El secuenciador de vista descarta una respuesta si alcanza checkout durante await. Son modelos Node, no reloj nativo, revocación o SQL efectivos.

## Incertidumbre y recibos

Intención/attempt/operación permanecen distintos; no se fabrica huésped para CBF1 ni se recodifica cancelar/modificar como create_stay. Los comandos no se convierten en frames CBF1 incompatibles. Todavía faltan admisión NEW/KNOWN durable, original protegido, custodio D02-A, binding real del proveedor, comparación canónica aprobada, writer de mínimo privilegio y evidencia externa COMMIT/readback/journal/witness. No se utiliza REST histórico como fallback.

createFunctionalHeldCandidate.reconcile reutiliza la frontera anterior y mantiene UNKNOWN incluso con ACK/snapshot del cliente. Un reinicio sin original no crea NEW, no reconstruye argumentos desde digest y no reenvía. Los marcadores de la vista son memoria local efímera, no idempotencia SQL ni recuperación durable. N01–N12 siguen NOT_AUTHORIZED/NOT_RUN.
