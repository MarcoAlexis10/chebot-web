# Última continuación web — cierre técnico QA 27/10/2026

2026-10-27T12:50:07.970048-03:00, Argentina. **Beta NO-GO.** Inicio `83c0be589ebcdc75042fae0ef7949a1e671690a0`, código/pruebas `6f4f43b36363baf0248f6bf4542d780ce941a9a3`, rama `qa/cheveni-release-20261025`. Este apartado actualiza el informe existente y conserva debajo su versión histórica.

Commit funcional `6f4f43b36363baf0248f6bf4542d780ce941a9a3`: recuperación exige readback nulo al retirar token. Un fallo inicial impide llamadas; tras actualización confirmada o incierta advierte de limpieza local fallida y mantiene terminal el formulario. No promete revocación inmediata del JWT. El fixture anterior incorpora getItem; no cambian assertions históricas.

**Seis pruebas nuevas aprobadas, cero fallos finales**, antes una aprobaba/cinco fallaban. Ocho regresiones focalizadas de recibo/lifecycle aprobadas y no sumadas. Dos integraciones nuevas entre backend y web mantienen la consola cerrada ante JSON Auth detenido y respuesta tardía; se cuentan solo en backend, junto con otras cuatro integraciones de intake. Código generado y backend reales; DOM/storage/transportes/GoTrue/BD/timers ficticios. No validación administrada ni operación real.

Evidencias nuevas en `../closure-qa-20261027/`, logs antes/después/regresión, RESULTS.json, SHA256SUMS y comparación de siete archivos con GitHub. Cinco controles de release/paquetes/workflows conservados. No deploy, mensajes, datos reales, gastos, cambios ASUS ni ensayos nativos.

[Informe maestro actualizado: 37 casos nuevos, 31 backend + seis web y seis commits de código/pruebas](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/desktop-qa-20261027/CONTINUIDAD.md). [Matriz única](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/no-asus-20261026/MATRIZ-LANZAMIENTO.md). Los 37 y 77 previos se conservan; únicamente se regresaron subconjuntos directamente afectados y están declarados.

Quedan pendientes nativo/aislamiento, Auth/journal y autoridad transaccional administrados, A2/custodia, idempotencia/entrega operativa, privacidad/aceptación y permiso final. Sin nueva acción ASUS indispensable. Retomar desde refs actuales y preservar lo posterior.

---

# Histórico web conservado

# Che Vení — continuidad web, revisión Docker Desktop 27/10

**Beta NO-GO.** Rama `qa/cheveni-release-20261025`; inicio `0482065bc3c436ecd281deb29934cce1cb8c860e`, código/pruebas `afb667bcb3d837770659b187d4de1c05af743218`. Este informe se publica después en la misma QA.

Commits: `faf45d2e40cbec1eeca4d8f0be37a6a635d1dec2` comprueba persistencia y retirada de token y mantiene terminal la pestaña si storage falla; `afb667bcb3d837770659b187d4de1c05af743218` limita headers/JSON de login/restore/listas/reset/logout, conserva cancelación y oculta 401 actual antes del cuerpo detenido. No reintentos automáticos ni afirmación de que logout invalida inmediatamente JWT emitidos.

14 casos nuevos aprobados, cero fallos finales: seis storage y ocho deadlines/401. Los seis se regresaron por el transporte nuevo sin sumarlos de nuevo. Tres integraciones entre repositorios y cuatro integraciones backend se cuentan solo allí. Generadores/código reales, DOM/storage/transportes/Auth/BD/reloj ficticios. No HTTP server, motor SQL, correo o servicio real. Fixtures existentes reutilizadas sin ejecutar tests históricos; los 77 anteriores no se repiten.

11 archivos publicados verificados antes de este informe, controles de release/holds intactos. Evidencia/logs/resultados y SHA256SUMS en esta carpeta. No deploy, DNS, cron, mensajes, registros reales, gastos o cambios ASUS.

[Informe maestro con ambos repos, siete commits de código y 37 casos](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/desktop-qa-20261027/CONTINUIDAD.md). [Matriz única](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/no-asus-20261026/MATRIZ-LANZAMIENTO.md).

Docker Desktop existente sigue NO-GO para el laboratorio: no hay remapeo acreditado ni alternativa demostrada que cumpla todas las restricciones. ECI requiere Business/habilitación; no se asume licencia ni cambio autorizado. ZIP intacto, siete sin ejecutar, sin nueva acción ASUS indispensable. No repetir lookup ya completado sin ruta.

Retomar desde refs GitHub actuales, preservar avances y mantener admisión comercial cerrada.
