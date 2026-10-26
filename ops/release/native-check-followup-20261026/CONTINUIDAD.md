# Che Vení — continuación QA tras comprobación nativa, 26/10/2026

**Beta NO-GO. Validación nativa de siete casos NO ejecutada.**

Base web verificada: `806c9cba48fd6b0e099121ad63626f092d3c22d4`. Código actualizado y probado: `1e11a2736ac8e5f8c066e2b9c30a453eba325cca`, rama `qa/cheveni-release-20261025`. Se conservan reset, signup y evidencias anteriores.

El generador de acciones de solicitudes registra ahora la intención de la decisión antes de POST. Si no puede guardar y comprobar ese bloqueo local, no envía. Reload, render repetido y respuestas de otra sesión/generación no reabren una operación incierta. Una respuesta HTTP200 con conciliación pendiente o con decisión opuesta se rechaza como confirmación. Solo errores explícitos y revisados previos al despacho permiten retirar el marcador para una corrección deliberada; errores desconocidos siguen bloqueados.

**Once casos NUEVOS aprobados, cero fallos finales.** Archivo `qa/security/request-dispatch-intent-delta.test.cjs`. Ejecuta el generador base y el generador de acciones reales en VM con DOM/storage/fetch ficticios; no registra suites anteriores. Los nueve casos iniciales mostraron ocho fallos y un pass antes del cambio. Después se añadieron dos casos de respuesta tardía y aprobaron 11/11. Los totales no suman ejecuciones intermedias.

Evidencias: [before](evidence/request-intent-before.tap), [after](evidence/request-intent-after.tap), [resultados](evidence/request-intent-results.json).

Límites: sessionStorage conserva el bloqueo en la misma pestaña/reload; no es un bloqueo durable de servidor ni entre dispositivos. La conciliación de operaciones debe hacerse con el registro operativo autorizado. No se afirma cobertura equivalente para todas las otras acciones del manager. Ningún test prueba Auth administrado, correo o WhatsApp reales.

Backend de código emparejado: `9e90175231ca2ada481240c0b7d805b955b5a709`. Informe integral y próximo paso: [continuidad backend](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/native-check-followup-20261026/CONTINUIDAD.md).

No se repitieron las 40 pruebas aprobadas, 45 nocturnas, nueve nativos o consulta Auth. No se activaron workflows, build general, despliegues, servicios, envíos ni admisiones. La configuración fuente conserva `git.deploymentEnabled:false`. El contrato nativo sigue pendiente de un laboratorio real, aislamiento acreditado, coste incremental cero y autorización específica de sus siete casos; no se solicita encender la ASUS en esta sesión.
