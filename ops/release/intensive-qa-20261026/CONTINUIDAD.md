# Che Vení — continuidad web, ejecución intensiva sin ASUS

26/10/2026, Argentina. **Beta NO-GO.** Punto inicial verificado en GitHub: `0fa89e3cd7df32430e059b7c2653fe64d0303b4d`, rama `qa/cheveni-release-20261025`. Se conservaron todos sus avances. Cabecera funcional de esta ejecución: `9cbc285beb8d4aef746e7124da28a949fdb97975`; este informe queda en un commit posterior de la misma rama, identificable desde GitHub.

| Commit nuevo | Finalidad | Casos nuevos únicos |
| --- | --- | --- |
| `868762bcce173f6482e5bde02ccb87f2961fa49a` | Consola de altas: intención previa persistida y comprobada, recarga/GET tardío, validación de capacidad y sesión antes de copiar | 10/10 |
| `9cbc285beb8d4aef746e7124da28a949fdb97975` | Conocimiento: intención por elemento/versión, sesión y generación del botón, recibo compatible, rechazo conservador de resultados ambiguos, limpieza de DOM privado | 11/11 |

**21/21 nuevos web.** Son scripts realmente generados evaluados en VM con DOM/storage/transporte ficticios; no navegador o Auth administrado. No build general, despliegue, mensajes ni servicios. Los 29/33 y demás históricos no se repitieron. Los casos se ejecutaron antes/después de corregirlos; esos ciclos no se suman como pruebas distintas.

Evidencias: `evidence/admin-intent-{before,after}.tap`, `admin-intent-results.json`, `knowledge-intent-{before,after}.tap`, `knowledge-intent-results.json`; `source-publication.json` compara los 10 archivos funcionales/evidencias ya publicados con sus blobs GitHub y conserva controles. `SHA256SUMS` fija los archivos locales de este informe y evidencia.

Cinco casos adicionales en backend conectan este script de conocimiento con el handler backend real y el wrapper de hold real. Fuente web SHA-256 `0d0f3d1c75ffb0e71961024ad9d9c0a2956d6fc2f6b3c98d08c87cc5138f6695`, backend funcional `03c4f69221ec18be50ac360e224f42cca3f9f36e`. Auth, GET de lista y SQL siguen ficticios; se cuentan una sola vez en backend, no otra vez aquí.

Límites: sessionStorage no es exclusión durable del servidor ni entre dispositivos. Un recibo válido conserva por prudencia el marcador de esa versión; una operación incierta requiere conciliación operativa, sin borrar el marcador para forzar retries. Validar recibos no cierra permisos SQL transaccionales ni la carrera revocación/lectura. Los holds y `git.deploymentEnabled:false` permanecen intactos.

Informe maestro y única matriz de lanzamiento en backend QA:

- [Continuidad intensiva](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/intensive-qa-20261026/CONTINUIDAD.md).
- [Matriz G01–G11](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/no-asus-20261026/MATRIZ-LANZAMIENTO.md).

Para otra sesión: verificar ambas cabeceras y leer ese informe; no rehacer los 21 casos salvo regresión nueva directamente afectada. Primera acción reservada para ASUS: descargar solamente el ZIP QA fijado en el informe maestro. Sigue preparado, no probado en la ASUS; los siete nativos no están autorizados ni ejecutados.
