# Che Vení — continuidad web, revisión Docker Desktop 27/10

**Beta NO-GO.** Rama `qa/cheveni-release-20261025`; inicio `0482065bc3c436ecd281deb29934cce1cb8c860e`, código/pruebas `afb667bcb3d837770659b187d4de1c05af743218`. Este informe se publica después en la misma QA.

Commits: `faf45d2e40cbec1eeca4d8f0be37a6a635d1dec2` comprueba persistencia y retirada de token y mantiene terminal la pestaña si storage falla; `afb667bcb3d837770659b187d4de1c05af743218` limita headers/JSON de login/restore/listas/reset/logout, conserva cancelación y oculta 401 actual antes del cuerpo detenido. No reintentos automáticos ni afirmación de que logout invalida inmediatamente JWT emitidos.

14 casos nuevos aprobados, cero fallos finales: seis storage y ocho deadlines/401. Los seis se regresaron por el transporte nuevo sin sumarlos de nuevo. Tres integraciones entre repositorios y cuatro integraciones backend se cuentan solo allí. Generadores/código reales, DOM/storage/transportes/Auth/BD/reloj ficticios. No HTTP server, motor SQL, correo o servicio real. Fixtures existentes reutilizadas sin ejecutar tests históricos; los 77 anteriores no se repiten.

11 archivos publicados verificados antes de este informe, controles de release/holds intactos. Evidencia/logs/resultados y SHA256SUMS en esta carpeta. No deploy, DNS, cron, mensajes, registros reales, gastos o cambios ASUS.

[Informe maestro con ambos repos, siete commits de código y 37 casos](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/desktop-qa-20261027/CONTINUIDAD.md). [Matriz única](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/no-asus-20261026/MATRIZ-LANZAMIENTO.md).

Docker Desktop existente sigue NO-GO para el laboratorio: no hay remapeo acreditado ni alternativa demostrada que cumpla todas las restricciones. ECI requiere Business/habilitación; no se asume licencia ni cambio autorizado. ZIP intacto, siete sin ejecutar, sin nueva acción ASUS indispensable. No repetir lookup ya completado sin ruta.

Retomar desde refs GitHub actuales, preservar avances y mantener admisión comercial cerrada.
