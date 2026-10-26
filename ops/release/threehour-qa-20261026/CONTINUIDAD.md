# Che Vení — continuidad web, ejecución sin ASUS

26/10/2026, Argentina. **Beta NO-GO.** Rama `qa/cheveni-release-20261025`; inicio verificado `4f46ae2e15d79d196309aea0d745bdc469a63c66`. Cabecera funcional nueva `1aaab878744bcc4e17c4a5dd0f6d3dca219a1b03`. Este informe se publica en un commit documental posterior de la misma rama.

Ese commit corrige la confirmación de invitaciones: exige recibo ligado a `stay_id` y `already_sent` booleano, limita headers/cuerpo a un deadline aun si el adaptador ignora abort, conserva revisión ante respuestas contradictorias y comprueba la retirada del marcador local. Un recibo de backend antiguo sin `stay_id` queda en revisión: usar el par QA identificado por el informe maestro, no un alias desplegado por su nombre.

**Ocho casos nuevos, 8/8 aprobados**, en `qa/security/invite-contract-threehour-new.test.cjs`. Antes: 1 pasa / 7 fallan. Script realmente generado en VM, con DOM, storage, transporte y timers ficticios. Logs y alcance en `evidence/invite-contract-*`; no navegador o proveedor real. No se ejecutaron las 62 ni otras pruebas históricas.

Se adaptaron únicamente los datos ficticios/globals de tres harnesses existentes a `stay_id`, booleano, `ok:false` y deadline: `invite-session-asusprep-delta`, `invite-predispatch-new` y la parte de invitación de `test/manager-uncertain-actions.test.cjs`. Sus aserciones no se cambiaron; **no se ejecutaron ni se cuentan** como nuevas pruebas. Las evidencias históricas permanecen en sus commits.

Backend añade cuatro integraciones nuevas que cruzan este script con handler, sender y `dispatchInviteOnce` reales; Auth, REST, RPC y proveedor siguen ficticios. Solo se cuentan en backend. SHA-256 web: `8c9e86ec0dcd8d3581c17ea75aac32bf80fa483f1585c58979c8852ee24fc12a`.

`evidence/source-publication.json` compara ocho archivos publicados con blobs GitHub y conserva 13 controles. `SHA256SUMS` fija informe y evidencia. No se hizo build general, deploy, envío, consulta Auth o cambio de servicio. El marcador sigue siendo local a la pestaña; no acredita idempotencia de servidor ni entre dispositivos. Los holds comerciales/legales siguen cerrados.

- [Informe maestro](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/threehour-qa-20261026/CONTINUIDAD.md).
- [Matriz única de lanzamiento](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/no-asus-20261026/MATRIZ-LANZAMIENTO.md).

Retomar verificando cabeceras y preservando lo posterior; no repetir estas pruebas salvo futura autorización/regresión justificada. ASUS sigue preparada, sin prueba física ni siete ejecutados. Primera acción futura: descargar solamente el ZIP existente fijado en el informe maestro, sin ejecutarlo.
