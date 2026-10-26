# Che Vení — continuidad técnica 26/10/2026

Estado: **NO-GO comercial**. Código web comprobado en `50654abff69fb5de7ae620d3c2b96ed35f6bc989`, rama `qa/cheveni-release-20261025`; base preservada `6fe06c03f284d36bc5b8df9819e361fde8c5ad01`.

Se corrigieron la confirmación del cambio de contraseña y su timeout completo: la respuesta debe corresponder al usuario Auth validado; un HTTP200 vacío, de otro usuario, ilegible o tardío no confirma el cambio ni habilita retry. El formulario se oculta ante incertidumbre y se intenta logout solo de la sesión de recuperación. Ocho casos nuevos aprobaron y se ejecutaron únicamente cuatro casos históricos directamente afectados por el cambio del lector/timeout. Ninguna de las siete pruebas de alta aprobadas se repitió.

Evidencia: [reset-results.json](evidence/reset-results.json), [ocho casos nuevos](evidence/reset-receipt-final.tap), [cuatro regresiones seleccionadas](evidence/reset-affected-four.tap). Los casos ejecutan el script generado en VM con fetch/storage/timers ficticios. No prueban correo recibido, Auth administrado o navegación visual real. No se ejecutó build general ni se modificó Vercel. `git.deploymentEnabled:false` y gate legal permanecen cerrados.

El cierre integral y los cinco commits de código están en [el informe backend](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/technical-followup-20261026/CONTINUIDAD.md). Candidato backend de código: `ee8c8f34115e9eb4744fddb738062e8fedbb1739`. Ese informe distingue validaciones ficticias de bloqueos nativos/operativos y fija el próximo paso. El commit que contiene este documento agrega evidencia; no es un release ni habilita managers.
