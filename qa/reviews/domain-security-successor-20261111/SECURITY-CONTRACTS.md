# Contratos de integración retenidos

## Composición implementada y frontera que falta

El nuevo paquete reutiliza el boundary SDK, codec CBF1 y los guards originales, fijados por la composición previa; no cambia sus enums, emisores, verificadores o claves. La revisión de incidencias usa el boundary SDK con callbacks ficticios, un resolver actual obligatorio, una traducción exacta a manager_action y un reader separado propuesto. Es una integración de **código y contratos**, con dobles; no es integración funcional con Auth/SQL/journal.

El reviewer de autoridad anterior sólo admite property_create/stay_create/companion_prepare/invite_receipt/invite_dispatch; no acredita manage_incidents. manager_scope Native17 comprueba ese permiso pero devuelve memberId/accountId/role sin revisión de autoridad. Por eso no se reutiliza el permiso manageStays ni se inventa una revisión a partir del JWT. El nuevo CurrentResolution exige cuenta, miembro, rol, propiedad, estadía e incidencia actuales; active/manageIncidents, authorityVersion, restrictionVersion y observación acotada. Falta un productor confiable de ese contrato bajo el fence. Un objeto del cliente jamás puede ser ese productor operativo.

## Traducción de incidencias

Se preservan p_incident_id, p_account_member_id, p_new_status y p_event_summary. El actor debe coincidir con el miembro resuelto; la incidencia debe coincidir exactamente, con estadía/propiedad/cuenta no nulas. SQL debe volver a validar las relaciones actuales, no sólo aceptar IDs válidos. La intención estable se usa como p_request del servicio nativo; p_request_id histórico se conserva como attemptId/dispatchId en el plan de revisión. El servicio actual no conserva ese binding durable: la traducción no elimina esa carencia.

El resumen no se trunca ni normaliza silenciosamente en JS. La validación replica trim de espacios y longitud Unicode del negocio SQL; las secuencias UTF-16 inválidas y NUL se rechazan. El SQL original sigue normalizando el resumen al persistirlo. closed/learning_pending conservan sus precondiciones y resolved sigue reservado a la confirmación del huésped.

El handler raíz agrega notificación en waiting_guest y propuesta de aprendizaje en learning_pending después del RPC. No se trasladan esas llamadas al candidato, no se envían comunicaciones y no se afirma equivalencia del recorrido HTTP completo. manager_action añade audit y commands; tampoco se confunde esa fila con un journal firmado.

## Autoridad, JWT, refresh y orden

1. Snapshot estricto de entrada antes de awaits; rechazo de extras/accessors y de operaciones no mapeadas.
2. Boundary SDK del emisor QA exacto; usuario/sesión/exp del comando iguales a la identidad verificada por ese boundary. El getClaims de las pruebas es ficticio: ninguna firma JWT real acreditada.
3. Resolver vigente, permiso de incidencias y restricciones actuales. Reserva local de intención antes de nuevos awaits, nueva observación inmediatamente antes del despacho; cualquier cambio de versión/binding bloquea el envío.
4. Tras el despacho posible, errores/timeout/revocación no prueban rollback. UNKNOWN y ausencia de reenvío.
5. Antes del readback y antes de exponer el resultado de revisión, nueva comprobación de identidad y autoridad, incluyendo expiración ocurrida durante los awaits finales. No se revela el efecto privado si el actor pierde permiso.
6. Un bearer nuevo, refresh, cambio de sesión/exp o cambio de revisión requiere binding nuevo. Este candidato no implementa rebind; conserva UNKNOWN. No reescribe tokens DEV a QA.

El orden SQL necesario es fence compartido → observar Auth/autoridad/restricciones frescas bajo READ COMMITTED → locks de negocio en orden revisado → binding/effect/commit → revalidación antes de respuesta. Los hooks de revocación/admin/restore deben participar en el mismo fence, con reloj que avance tras esperar. Un write confirmado antes de revocar conserva su historia; la sesión revocada no recibe historia privada. Las intercalaciones JS prueban decisiones del modelo, no serialización nativa.

## Conciliación y evidencia mínima

El puerto modelado exige igualdad exacta de intentId, attemptId, userId, sessionId, operation, argsFingerprint, authorityVersion, restrictionVersion y dispatchId; además commitId, journalRecordId y witnessRecordId separados, tiempos válidos y efecto exacto incidente/estado. El fingerprint es únicamente una comparación local de un array ordenado con los argumentos originales. No se compara con JSONB ni se denomina comprobante CBF1. Los UUID del doble no demuestran COMMIT/journal/witness. Incluso al coincidir, el resultado es REVIEW_MATCHED con todos los flags de acreditación false.

| Escenario | Comportamiento implementado en revisión | Pendiente operacional |
|---|---|---|
| ACK perdido | UNKNOWN, sin readback automático ni reenvío | Durabilidad del despacho y clasificador independiente |
| COMMIT con respuesta perdida | Reconcile explícito puede observar el efecto ficticio original sin write | COMMIT real observado fuera de la conexión fallida, correlación nativa |
| Reinicio/snapshot perdido | Reconcile UNKNOWN sin consultar reader; tercer argumento del cliente no se usa | Resolver original privado, custodia y admisión durable NEW/KNOWN; el reviewer no sirve de journal tras reinicio |
| Dos intentos | Reserva de Map antes de await; una llamada en el modelo local | Unicidad/CAS/locks SQL entre procesos, intentos y crash windows |
| Misma intención, otros argumentos | CONFLICT; conserva primer plan; cero reenvío | Restricción única e historia inmutable nativa, comparación bajo fence |
| Revocación antes/durante readback | UNKNOWN sin datos de efecto | Todos los revocadores y reader Auth actual bajo control acreditado |
| Evidencia parcial/contradictoria/vencida | UNKNOWN; no DENIED/SUCCESS inferidos | Custodios/epochs/transcript y reloj protegidos |

No existe un botón de reintento ni recuperación a partir de un digest. Una instancia nueva del reviewer sólo modela fixtures nuevos: no debe conectarse a una base real porque no puede acreditar la admisión durable de intenciones ya conocidas.

## Journal, CBF1 y custodia

CBF1 intent fija quince campos de create_stay, incluidos nombre/hash del huésped; effect fija cuatro IDs de alta. No representa incidentId/status/summary. Los comprobantes firmados existentes vinculan digest de esos frames, claim, secuencia, restricciones y checkpoint bajo sus dominios/versiones. Cambiar sólo operation o meter JSON en guestDisplayName sería una colisión semántica deliberada y queda prohibido.

El candidato no crea otro protocolo firmado. El plan usa la interfaz nativa de incidencias y marca INCIDENT_EVIDENCE_SUCCESSOR_NOT_INSTALLED. Para un puente criptográfico hacen falta un dominio de intención/efecto revisado, canonicalización SQL/JS acreditada con vectores, intento y binding actual, claim durable previo, terminal posterior a COMMIT y journal/witness independientes con secuencia/epoch/floors vigentes. CI4/CI-GRANT/2 no conceden permisos de negocio ni sustituyen esas piezas. No se ejecutaron, firmaron, generaron autorizaciones, custodiaron claves ni fabricaron transcripts.

Se separan expresamente body del cliente, identidad verificada por proveedor, observación actual de autoridad, prueba SQL/COMMIT y comprobante firmado del journal. La coincidencia de un JSON del doble no atraviesa ninguna de esas fronteras operacionales.

## Privacidad y retención

No se agregó persistencia durable. El Map temporal del reviewer sólo conserva fixtures ficticios, plan/resumen original y fingerprint del bearer para impedir reutilizar bindings; no se escriben tokens, frames o payloads privados en logs. Las excepciones externas se convierten en códigos fijos para que un proveedor no pueda filtrar sus mensajes. Los logs de fallo contienen sólo sentinels inventados.

Antes de cualquier almacén durable del snapshot: finalidad limitada a conciliar una mutación incierta; metadatos mínimos separados de resumen/PII; acceso sólo por servicio privado y autoridad actual; cifrado y custodia independiente; integridad/provenance verificable y política D02-A aplicable con borrado/retención técnica y legal acreditados. Un hash de teléfono o del bearer no se vuelve anónimo por ser hash. No copiar frames completos a GitHub o al journal para simplificar el reinicio. Sin esa política y esas evidencias, no se implementa persistencia de payloads.

No se inventan plazos legales. La supresión/retención operativa y las admisiones legales/prelegales siguen bloqueadas.
