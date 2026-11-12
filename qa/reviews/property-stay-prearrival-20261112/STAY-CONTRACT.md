# Estadías: reutilización exacta y operaciones retenidas

Backend fijado en `9beb837a621f9a8f06601043afa64b3bba317cb5`; vendor CBF1 de web `8cacefa024d2377e31915a9092ae4ea86f493732`. No SQL ejecutado.

## Dos contratos que no son intercambiables

`concierge-guarded-intake.js` prepara `concierge_create_guarded_pending_stay_v1` con diez argumentos: p_operation_id, p_manager_id, p_account_id, p_property_id, p_received_at, p_guest_phone_hash, p_guest_display_name, p_check_in_at, p_check_out_at y p_language. operation_id deriva del manager y mensaje WhatsApp mediante HMAC; este lote no ejecuta ese HMAC ni usa claves. El draft SQL `ops/drafts/GUEST-INTAKE-ATOMIC-V1-PRELEGAL-DO-NOT-APPLY.sql` fija access_from=check_in_at y access_until=check_out_at; exige nombre/hash del huésped. Ejecutar pending llama al create_stay histórico con privacidad/readiness y hard stop prelegal, y devuelve pending/stay/invite. No se reutiliza como fallback REST privado.

CBF1 exige exactamente quince campos: projectRef, intentId, operation, userId, accountId, memberId, memberRole, propertyId, guestPhoneHash, guestDisplayName, checkInAt, checkOutAt, accessFrom, accessUntil, language. Única operación: `concierge_manager_create_stay`. El proyecto QA no autoriza reescribir emisores DEV ni token. El frame contiene nombre/hash: no es un mero digest anónimo.

`comparePendingAndCbf1` compara los ocho campos de negocio comunes sin omitirlos y rechaza diferencias de cuenta/miembro/propiedad/huésped/fechas/idioma. Rechaza explícitamente ventanas de acceso distintas de las representables por pending. Un match sigue HELD: operation_id ≠ binding web intentId acreditado; p_received_at, antigüedad de autoridad, restricciones, procedencia e identidad web no quedan certificados por comparar campos. No se despacha nada.

## Qué puede reutilizarse

- Codec original: snapshot/frame/parse estrictos y formato canónico en memoria. El buffer se sobrescribe; no se escribe nombre, hash o frame para conciliar. El borrado físico de cadenas JS no está garantizado.
- `createStayCommandReview` original, sólo con sus adaptadores ausentes por defecto. No se suministra autoridad ficticia positiva, writer o transporte. reconcile permanece UNKNOWN.
- Funciones puras `conciergeDateParts` y `conciergeZonedLocalToIso` extraídas en VM, sin importar el servidor. El conversor original normaliza 2027-02-29 a marzo: el log baseline falla. La corrección mínima QA comprueba el calendario antes de convertir a America/Argentina/Buenos_Aires. Backend original intacto.
- Inventario sintético de ventanas: detección local de posible solapamiento usando intervalos [access_from,access_until), sólo scheduled/active y misma propiedad. Checkout de A igual a inicio de B no se solapa; un minuto sí. No acredita unicidad, locks ni exclusión SQL entre procesos.

## ABI que falta

| Operación prevista | Estado y contrato necesario |
|---|---|
| Seleccionar propiedad | GET/permiso existe como fuente; candidato usa selector sin opciones hasta productor protegido vigente. No inventa propiedad autorizada |
| Crear sólo con fechas | HELD: CBF1 y pending exigen huésped. Hace falta operación protegida específica con semántica y efectos aprobados, no rellenar huésped ficticio ni usar create_stay |
| Asociación posterior del huésped | HELD: binding de identidad/reserva, privacidad, unicidad y recibo específico ausentes |
| Modificar/cancelar | HELD: versión esperada, estado, exclusión, revocación y recibos propios; no reinterpretar como create_stay |
| Checkout | HELD: revocar acceso privado, sesiones/secrets y reservas consecutivas; preservar historia. No basta cambiar el estado visible |
| Resultado incierto/reinicio | UNKNOWN sin reenvío; original confiable y custodia D02-A, intento/sesión/autoridad, efecto/COMMIT, reader independiente y journal. No snapshots del cliente ni reconstrucción desde digest |

El SQL histórico de create_stay en fixture documenta vínculos, invitación/identidad y consultas de cruces por ventanas. Leerlo no acredita instalación, COMMIT, ausencia de carreras o revocación concurrente. N01–N12 siguen NOT_RUN/NOT_AUTHORIZED. No se crean estadías, asociaciones ni invitaciones reales.
