# Che Vení — continuidad web nocturna, 27/10/2026

**Beta NO-GO.** Rama `qa/cheveni-release-20261025`. Inicio GitHub `58bb6954303ce328e4791bdbf46cbbad5695c4de`; código/pruebas finales `e8c247f9edca39a44093500d34dff7a8a2094ca8`. Esta continuidad se guarda después en la misma QA; el SHA del commit que contiene este archivo es la cabecera documental final.

Dos commits de aplicación: `4fab92df0f3c80a4797f428f4f00d3ef8158bb7c` exige evidencia separada de notificación y una relectura única de la misma estadía, muestra no-envío conocido y conserva revisión para incertidumbre; `e8c247f9edca39a44093500d34dff7a8a2094ca8` limita headers/cuerpo de solicitudes e incidencias, incluso si el adaptador ignora abort. No repite POST ni confunde timeout con rechazo confirmado.

**15 casos nuevos / 15 aprobados / cero fallos finales**: ocho en `qa/security/incident-confirmation-night-new.test.cjs`, siete en `qa/security/manager-deadline-night-new.test.cjs`. Los ocho se regresaron por el nuevo deadline sin contarlos otra vez. Cinco integraciones reales de código con backend se cuentan solo allí. DOM/storage/temporizadores/Auth/BD/autoridad/proveedor ficticios; aceptación no es entrega. No HTTP server, SQL o servicios reales.

Solo se reutilizan fábricas de fixtures anteriores, antes del primer test(); no sus casos. Se añadieron globals ficticios de navegador a harnesses históricos, sin ejecutar sus suites. No se hicieron build general, deploy, mensajes, consultas Auth, activaciones comerciales o cambios de servicios. Holds y configuración pública/release se preservan. Marcadores de pestaña no acreditan idempotencia entre dispositivos.

Se verificaron 17 archivos modificados contra GitHub antes de esta continuidad. Logs/resultados/source-publication y SHA256SUMS están en esta carpeta. Informe completo, ambos repositorios, 77 casos nuevos, commits y ocho frentes de lanzamiento: [continuidad maestra](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/night-qa-20261027/CONTINUIDAD.md). [Matriz única G01–G11](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/no-asus-20261026/MATRIZ-LANZAMIENTO.md).

ASUS/WSL sigue NO-GO: seccomp/cgroupns sin userns/rootless acreditados, ZIP intacto/no validado físicamente como laboratorio apto. Primera acción futura única: `wsl -d Ubuntu -- sh -c 'command -v dockerd-rootless.sh'` en PowerShell; es lookup local, no instalación/ejecución del binario. Si falla/no hay salida, detenerse. Siete casos sin ejecutar y servicios reales solo con autorizaciones exactas posteriores.

Retomar leyendo refs actuales y el informe maestro, preservar avances y no repetir estos 15 ni los 54 previos salvo regresión nueva justificada. D01/D02-A y admisión cerrada intactos.
