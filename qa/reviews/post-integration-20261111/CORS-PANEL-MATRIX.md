# Panel y CORS — estado actualizado de la evidencia

No se ejecutó una nueva prueba de navegador ni se repitieron los 67 intercambios HTTPS anteriores. Esta matriz reutiliza el contrato observado en el cierre integral `f2944f76…`, cuyos handlers, routing y guards backend no cambiaron. Las observaciones HTTP no se presentan como resultados Chromium.

| Ruta manager | Métodos usados por frontend | Evidencia HTTP anterior | Navegador de este lote |
| --- | --- | --- | --- |
| session | GET | 503 antes de CORS, incluido OPTIONS | NOT_EXECUTED |
| properties | GET | 503 antes de CORS, incluido OPTIONS | NOT_EXECUTED |
| stays | GET | 503 antes de CORS, incluido OPTIONS | NOT_EXECUTED |
| invites/send | POST | OPTIONS 204 para origen configurado; POST 503 privacidad con CORS original | NOT_EXECUTED |
| incidents | GET | 503 antes de CORS, incluido OPTIONS | NOT_EXECUTED |
| requests | GET | 503 antes de CORS, incluido OPTIONS | NOT_EXECUTED |
| knowledge | GET / POST | 503 antes de CORS, incluido OPTIONS | NOT_EXECUTED |
| incidents/state | POST | 503 antes de CORS, incluido OPTIONS | NOT_EXECUTED |
| requests/decision | POST | 503 antes de CORS, incluido OPTIONS | NOT_EXECUTED |
| signup-request | POST | Index/handler originales: preflight del origen canónico fijo 204, origen ficticio del build 403; POST retenido legalmente | NOT_EXECUTED; formulario del build sigue retenido |
| signup-admin | GET / POST | Index/handler originales: 503 externo sin CORS, incluido OPTIONS | NOT_EXECUTED |

**Dos afirmaciones distintas:** el servidor puede haber rechazado una petición, mientras el navegador carece de una respuesta legible. Una excepción de fetch no identifica por sí sola CORS, caída de red, timeout, proxy o pérdida del comprobante. Tampoco demuestra que una mutación no ocurrió. No se transforman excepciones en un rechazo seguro ni se limpian intenciones durables por ellas.

La corrección de `manager-auth-v1.js` limita el texto de restauración de sesión a lo observado. Antes, cualquier error terminaba en “Tu sesión venció”. Ahora, una comprobación desconocida mantiene el panel cerrado con “No pudimos comprobar tu sesión. El panel sigue cerrado por seguridad.” Los 401/403 actuales legibles siguen en el manejo existente de `fetchAuth`; no se reabren secciones ni se retiene el access token tras el fallo. No se cambió CORS, Auth, privacidad, admisión, reintentos o protocolo de mutaciones.

**Validación nueva ejecutada:** tres casos sobre el JavaScript completo generado por el build, en VM Node con DOM y transporte simulados: fetch ilegible, HTTP 503 legible y HTTP 401 legible. Antes del cambio fallaban los dos primeros y aprobaba el tercero; después aprobaron 3/3. Esto valida el feedback y la retirada local de datos, **no reproduce el motor CORS ni acredita un navegador**.

El build completo produjo los mismos 33 archivos y sólo cambió `manager/manager-auth.js`. Las URLs, métodos, CSP y headers de los otros outputs permanecen por hash. El SOURCE-PINS histórico se conserva; el pin actualizado del frontend está en el manifiesto de este lote, sin modificar el test antiguo para forzar un PASS.

No se aplica una “corrección CORS” sin el navegador ni se agrega un proxy que haga parecer legible un rechazo. El desacuerdo sigue registrado para la revisión acotada cuando exista un laboratorio de navegador acreditado.
