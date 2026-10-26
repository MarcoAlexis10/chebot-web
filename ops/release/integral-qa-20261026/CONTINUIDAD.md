# Che Vení — continuidad web integral sin ASUS

26/10/2026, Argentina. **Beta NO-GO.** Rama `qa/cheveni-release-20261025`; inicio confirmado en GitHub `4773a9620b4968984b5f37f61bb929645f6dfb31`. Se preservó todo lo anterior. Cabecera funcional nueva `6fb4cbf7e597bcd6d34c19b3549428a9cbfb8592`; este informe se publica en un commit posterior de la misma rama, visible en GitHub.

| Commit exacto | Cambio | Casos nuevos |
| --- | --- | --- |
| `6b98ce0dda6f2ead57e270d475aa06347f4c7f12` | Registro: intención persistida antes del envío, reabrir enlace no pierde incertidumbre, feedback fuera del formulario oculto, deadline que cubre cuerpo aunque el adaptador ignore abort, resumen D01 sin extensión opcional | 12/12 |
| `6fb4cbf7e597bcd6d34c19b3549428a9cbfb8592` | Solicitudes: botón ligado a sesión/generación de render, revalidación tras confirmación, recibo tipado y refresh ligado a propiedad/estadía/estado; no repintar tras pagehide/denegación | 9/9 |

**21/21 nuevos web, distintos de los 21 de la ejecución anterior.** Scripts realmente generados y transformados evaluados en VM con DOM, almacenamiento, transporte y reloj/timers ficticios. No navegador, build general, Auth, SQL, deploy, correo o WhatsApp. No se ejecutaron las 56 pruebas anteriores ni otras suites históricas.

Pruebas: `qa/security/signup-intent-integral-new.test.cjs`, `qa/security/request-session-integral-new.test.cjs`. Logs antes/después y JSON de resultados en `evidence/`. Las iteraciones sobre estos mismos casos no se suman como casos distintos.

Backend añade cinco integraciones nuevas del signup script con su handler real y JSON real, usando sentinel SQL ficticio; solo se cuentan en backend. El resultado aceptado sigue **pendiente de revisión del propietario**, sin provisión Auth ni propiedad ni cuenta activa. El hold inmutable real bloquea antes del RPC en la prueba correspondiente. No se instaló un manifiesto legal aprobado.

Límites: sessionStorage mantiene continuidad local de pestaña; no es bloqueo de servidor ni entre dispositivos. Una solicitud incierta no se repite borrando su marcador. Un refresh válido no demuestra autorización SQL transaccional. D01 sigue siendo la decisión ya confirmada; el texto de la pantalla no valida el evento inicial real ni el reloj comercial.

`evidence/source-publication.json` compara los 11 archivos funcionales/tests/logs publicados con GitHub y conserva 13 controles del inicio. `SHA256SUMS` fija este informe, resultados y evidencia. Holds, gate legal, workflows y `git.deploymentEnabled:false` permanecen intactos.

Referencias únicas de cierre en backend QA:

- [Informe maestro integral](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/integral-qa-20261026/CONTINUIDAD.md).
- [Matriz G01–G11 y cinco clases de pendientes](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/no-asus-20261026/MATRIZ-LANZAMIENTO.md).

Próxima sesión: verificar ambas cabeceras y leer ese informe; preservar lo posterior, no repetir estos 21 casos sin regresión nueva justificada. ASUS/WSL sigue preparado pero no probado físicamente; siete nativos, validaciones administradas, recuperación integral y autorización comercial pendientes. Primera acción futura: descargar solamente el ZIP QA fijado por el informe maestro, sin ejecutarlo.
