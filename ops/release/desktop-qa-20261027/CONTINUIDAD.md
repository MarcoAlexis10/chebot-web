# Che Vení — cierre técnico QA con autorización nativa condicionada

**2026-10-27T13:55:41.277867-03:00, Argentina. Beta comercial NO-GO.** Se conservó el proyecto y todo el historial publicado. La autorización de un único intento nativo está registrada; no se consumió porque cuota incluida y bloqueo de gasto adicional US$0 no pudieron acreditarse. No se pidieron permisos rutinarios ni se utilizó ASUS.

| Repositorio / rama QA | Cabecera inicial real | Cabecera de código/pruebas al cierre |
| --- | --- | --- |
| chebot-backend / `qa/cheveni-native-nine-preflight-20261025` | `4b6601e58950031a45e374f4fe361b8388ce548f` | `3c5e9dc4fd6d8932674bc448d50994fc510ebf97` |
| chebot-web / `qa/cheveni-release-20261025` | `a10c4cf5ca487b11c7addaea99c52f19065e776a` | `cdcee63e3b5abaa81bdd472c05b217866f33a4b1` |

Ocho commits de código/pruebas y dos de continuidad posteriores. Las cabeceras iniciales coincidían con las informadas. Se verificó QA antes de modificar/publicar, con actualización no forzada y lease contra el parent revisado. El commit documental final backend es el que contiene esta sección; sus SHA exactos y el de web se entregan en el cierre externo para evitar autorreferencias imposibles.

| Repo | SHA exacto | Cambio |
| --- | --- | --- |
| chebot-backend | `5bd8e938294bdfae83b29dbd2a87b3145f9660ed` | fix(qa): bind private knowledge feed to tenant property and version receipts |
| chebot-backend | `d0389ec58ff52b1cfba43692ded77f57ba564dcd` | fix(qa): discard prepared knowledge after property permission changes |
| chebot-web | `cdcee63e3b5abaa81bdd472c05b217866f33a4b1` | fix(qa): bound private knowledge reads and isolate replaced manager sessions |
| chebot-backend | `f6a75fd632e6862f5e9a345dcb44fe061c0e931a` | test(qa): connect private knowledge reads to generated manager panel |
| chebot-backend | `5bb0561145ed7de65bbb8e0ef76021b40a662489` | fix(qa): require bound incident event receipts before confirming notification |
| chebot-backend | `03727fe5e0ea41fbd037f9ad99ab86a397caf86e` | test(qa): preserve panel replay guards for unconfirmed incident recording |
| chebot-backend | `680836d730a658e9d95a9d5b9cff5c39f5fa4ca6` | fix(qa): bind final private responses to the current manager account member and role |
| chebot-backend | `3c5e9dc4fd6d8932674bc448d50994fc510ebf97` | test(qa): pin current knowledge candidate and verify affected decisions and fixture wiring |

## Correcciones terminadas en QA

1. **Conocimiento privado:** `concierge-manager-knowledge.js` valida la forma escalar y la cuenta de propiedades, permisos, items, versiones y edificios. Los permisos corresponden al miembro y capacidad correctos; versiones al item seleccionado; IDs/versiones duplicados o current_version ajena/ausente no permiten sustituir contenido. Conserva scopes account/building/property válidos y filtra el ámbito del co-manager.
2. **Revocación durante lectura:** después de cargar el conocimiento, relee permiso y relación propiedad/edificio. Revocación, reasignación, cambio de estado o servicio no verificable retiran el DTO preparado. Es checkpoint de aplicación, no una garantía transaccional entre sentencias.
3. **Panel de conocimiento:** `manager-knowledge-v1.js` retira datos de la sesión anterior antes de esperar su reemplazo; limita headers y JSON juntos a ocho segundos incluso si el transporte ignora abort. Resultado privado tardío no renderiza. Un permiso perdido no se anuncia como sesión confirmada activa. Respuesta de decisión de una sesión anterior conserva intent y no modifica/alerta la nueva vista.
4. **Incidencias y registro:** `concierge-manager-incidents.js` exige representación de una sola fila insertada, ligada a cuenta/incidencia/autor/tipo/texto exactos antes de intentar el aviso. Un HTTP 201 vacío o recibo ajeno/duplicado no certifica registro. Si el proveedor acepta y el registro posterior no queda confirmado, devuelve `accepted_status_unconfirmed`, `communicated_at:null` y conciliación sin reenvío. Aceptación no equivale a entrega.
5. **Auth y vínculo vigente:** `concierge-manager-auth-session.js` recibe una copia del contexto esperado en sesión, propiedades, estadías, conocimiento, solicitudes e incidencias. Al terminar la revalidación de sesión compara cuenta/miembro/rol actuales; un JWT todavía vigente no basta después de una reasignación o reducción de rol. Fallo de contexto no devuelve datos privados. Tras commit, el fallo exige conciliación y no otra escritura. El puerto SQL/GoTrue sigue ficticio en pruebas y sin proveedor operativo por defecto.

Archivos de ejecución modificados: los siete módulos backend anteriores (Auth + session/properties/stays/knowledge/requests/incidents) y `manager-knowledge-v1.js`. Pruebas, fixtures, logs y rutas exactas por commit están en [RESULTS.json](../conditional-native-qa-20261027/RESULTS.json). No se aplicó ninguna migración, no se modificaron SQL ni se retiró ningún hold.

## Resultados y límites

**32 casos nuevos únicos aprobados, cero fallos finales: 27 backend y cinco web.** Incluyen **siete integraciones nuevas entre repositorios**, contabilizadas una vez en backend. **19 regresiones históricas directamente afectadas aprobadas**, sin sumarlas como nuevas.

| Grupo | Nuevos | Aprobados finales | Alcance |
| --- | --- | --- | --- |
| Conocimiento backend | 10 | 10 | Ámbito, relación de versiones y pérdida de permiso/grafo durante lectura |
| Conocimiento web | 5 | 5 | DOM, deadline headers/JSON, error y respuesta de otra sesión |
| Registro de incidencia | 5 | 5 | Escritor de evento, AES de canal y parser Meta reales con transporte ficticio |
| Contexto Auth vigente | 5 | 5 | Binding real y Ed25519; remapeo, rol, pérdida de contexto y post-commit |
| Integración GET conocimiento/panel | 3 | 3 | Handler/DTO y browser generado reales |
| Integración registro de incidencia/panel | 2 | 2 | Notifier/escritor reales y protección de reintento web |
| Integración sesión/Auth/panel | 2 | 2 | Handler, binding Auth, registro firmado y browser reales |

Regresiones: 11 de intents/conocimiento web por cambios de sesión/DOM; cinco de decisiones conocimiento backend/web por modificar el candidato y sus pins; tres de la integración sesión/Auth/web al añadir la consulta final de contexto. Los tres últimos comparten archivo con dos casos nuevos: se separan los conteos. Veinte de los casos nuevos se repasaron tras extraer fixtures reutilizables y conectar contexto; no se suman de nuevo. No se ejecutó una suite histórica completa.

En reproducción, 24 assertions rojas y un positivo antes de las correcciones. Una primera ejecución de la integración incidencia/panel tuvo un fallo de fixture: esperaba alert, pero el producto usa revisión inline y deshabilita controles. Se corrigió esa assertion conforme al comportamiento real; el log inicial se conserva, dos casos finales pasan. No se alteró el producto para satisfacer ese supuesto.

**Simulado:** GoTrue/HTTP/Supabase/PostgREST/SQL, propiedad y personas, custodia/lookup externo de journal, proveedor Meta y entrega, timers y DOM. Criptografía, bindings, parsers, handlers indicados y JavaScript generado sí son código real. En las dos integraciones de incidencia/panel el recibo de cambio de estado y el refresco de lista son ficticios, no un circuito transaccional completo. No HTTP server, base nativa, PGlite, mensajes, despliegues o servicios reales nuevos. Las 186 pruebas anteriores, nueve nativos, siete pendientes, consulta Auth consumida y A1 se preservaron.

Evidencias: [RESULTS](../conditional-native-qa-20261027/RESULTS.json), [logs y verificaciones](../conditional-native-qa-20261027/evidence/), [SHA256SUMS](../conditional-native-qa-20261027/SHA256SUMS). Las huellas de logs de integración identifican la revisión ejecutada; el posterior cableado de contexto motivó la revalidación focalizada en `affected-current-fixtures-final.log`.

## Siete nativos: NO-GO sin consumir el intento

[Preflight](../conditional-native-qa-20261027/evidence/native-preflight.json): **0/7 ejecutados, canary NO ejecutado, workflow ID/run ID no existen para esta ejecución**. Cada caso consta NOT_EXECUTED; no PASS por preparación. No recursos creados, por lo que no hay limpieza nativa que acreditar.

La propuesta existente cumple estáticamente runner GitHub-hosted, imagen PostgreSQL 17.11 fijada, canary antes de DDL, intento único, job máximo ocho minutos y limpieza selectiva. Se comprobaron sus 23 fuentes; no se instaló el workflow ni el marker. Las 38 fuentes ASUS y ZIP SHA-256 `a55f3c4bbe1f3268adfc9e554ea8c7740b6c18651973cabda96107232e111ce7` siguen intactos. Nada se ejecutó en ASUS ni se cambió Docker.

El repositorio es privado. La conexión no expone cuota ni presupuesto/stop-usage de la cuenta: no se intentó eludirlo por endpoints sensibles o sesión de navegador. Una autorización condicional no prueba cuota ni configura facturación; tampoco lo hacen permisos push/admin ni runs antiguos. GitHub documenta [cuota y consumo privado](https://docs.github.com/en/actions/concepts/billing-and-usage) y [la diferencia entre alerta y detención efectiva](https://docs.github.com/en/billing/how-tos/set-up-budgets). Scope fino para escribir workflows aún no acreditado; no se probó instalando uno. La vía preparada es push QA, sin main, no workflow_dispatch.

La propuesta y template de aprobación registran ahora el permiso condicional recibido. El flag ejecutable sigue false porque faltan condiciones externas; no se pide otra autorización equivalente. Un futuro ejecutor debe releer el parent QA vigente y regenerar el plan, no usar una lease vieja de este informe. Si falta coste, canary, fuente o permiso, detener sin consumir pruebas ni buscar atajos.

## Estado verificable del candidato y ocho frentes

[Fuente fijada](../operational-candidate-20261026/source-lock.json): 62 archivos backend y 17 web comparados con blobs GitHub; [candidate.json](../operational-candidate-20261026/candidate.json), [procedimiento único actualizado](../operational-candidate-20261026/NEXT-VALIDATION.md). El auditor estático existente indica `source_coherent_held`; no equivale a build, migración lista ni operación conectada. Variables sin secretos, cuatro componentes SQL/baseline sin aplicar, aceptación mínima y reversión conservados.

| Frente | Cierre verificable actual | Pendiente que impide GO |
| --- | --- | --- |
| Base de datos | 23 fuentes nativas y candidato intactos | Canary y siete reales 17.11; coste/permiso; posterior migración operativa específica |
| Auth | Revalidación sesión + cuenta/miembro/rol y salida post-commit seguras en código | GoTrue, hooks/roles soportados, journal/custodia y todos los escritores reales |
| Autorización / idempotencia | Scope de conocimiento y recibos/estados inciertos reforzados | SQL transaccional por propiedad, carreras reales, exclusión durable y fence al despacho del proveedor |
| Recuperación A2 | Sobres/testigos, cuarentena y controles previos conservados; sin A1 ni restore repetido | Restauración PostgreSQL/roles/FKs, Auth/GoTrue, Vault, Storage API/objetos/políticas y configuración/claves externas/custodia |
| Privacidad | Menos exposición por ámbito/sesión; D01/D02-A intactas | Textos/hechos/fundamentos/periodos por categoría y derechos/supresión propia/proveedores/copias verificables, revisión pertinente |
| Comunicaciones | No se confirma registro sin fila; aceptación incierta conserva revisión | Correo/redirects/Meta, permiso/destinatario/callback/entrega y conciliación en prueba acotada autorizada |
| Primer manager / panel | Siete integraciones nuevas y recibos compatibles en QA | Admisión/aceptación y propiedad realmente conectadas, recorrido completo autorizado, soporte/suspensión y evento D01 real |
| Lanzamiento | Candidato fijado, reversión y matriz única actualizados | G01–G10 acreditados sobre release exacto y autorización comercial final G11 |

**Cerrados:** los defectos de código descritos. **Parcialmente cerrados:** preparación nativa, revocación/autorización, conciliación e integración de código. **Abiertos operativamente:** los ocho frentes de la tabla; ningún gate comercial completo se levanta mediante mocks. No se encontró en la revisión A2 un defecto adicional demostrable que justificara modificar sus componentes o repetir un laboratorio: se conserva su evidencia y su NO-GO integral. La matriz única G01–G11 enlaza el detalle, sin nueva matriz paralela.

## Camino mínimo y única intervención inmediata

1. Acreditar cuota/freno US$0 actuales; ejecutar una vez los siete con canary y limpieza en QA si TODAS las condiciones se cumplen. Un fallo detiene, sin rerun.
2. Autorizar el destino/prueba administrada estrictamente acotados para instalación soportada, Auth/revocación/journal/escritores y recuperación integral, sin usar DEV/PROD como laboratorio. Esta autorización aún no existe; no se ejecutó ni se presume concedida.
3. Un recorrido ficticio conectado de una propiedad: invitación/verificación → pre-arrival → check-in → conocimiento privado/turismo → incidencia/intervención → checkout/revocación → Free. Comunicación controlada solo con autorización específica y evidencia de entrega/conciliación. No repetir QA general.
4. Completar en paralelo aceptación/privacidad/facultades/soporte de una unidad CABA y revisar release/reversión para autorización comercial final. 30 días desde primera estadía real verificada, sin cobro automático; no Cloudflare, cron ni plataforma empresarial como requisitos adicionales.

**Única acción ahora para el propietario:** aportar evidencia actual y depurada de GitHub Billing de cuota incluida suficiente para este job Linux estándar de hasta ocho minutos y presupuesto aplicable de gasto adicional US$0 con Stop usage activado. Solo lectura, sin cambios de cuenta. No hace falta ASUS ni reiterar el permiso de los siete. Hasta entonces permanece NO-GO nativo.

## Publicación y recuperación

[Verificación de fuentes](../conditional-native-qa-20261027/evidence/source-publication.json): 30 archivos backend y cinco web publicados antes del cierre documental, 79 fuentes del candidato comparadas con Git blobs. [Actions/main](../conditional-native-qa-20261027/evidence/actions-and-main.json): cero runs asociados a los ocho commits funcionales, main backend `bc82c2cd7c8470bfc2255dcad48fd40c7900435a` y web `eb0dbf6261bc612bf548ec35e8b814a39738824e` intactos. Se verifican nuevamente refs y documentos desde GitHub después de publicarlos.

No cambios a main, chebot-production, DEV/PROD, servicios, DNS/cron/configuración global, credenciales o personas reales. No envíos, gastos, despliegues, eliminación real ni acciones ASUS. Código/SQL de holds y fuentes nativas intactos. Retomar desde las cabeceras finales publicadas, este informe y source-lock, preservando lo posterior; no repetir los 32 nuevos ni las regresiones salvo afectación justificada. No se promete trabajo en segundo plano ni horas no realizadas. **Beta NO-GO.**

---

# Histórico conservado: desbloqueo anterior y autorizaciones anteriores

# Último cierre web — desbloqueo QA, 27/10/2026

2026-10-27T13:26:15.776192-03:00, Argentina. **Beta NO-GO.** Inicio `00f7957f06ae317e87bec11913a2c531b079419d`, código/pruebas `522d148b7d406c5973b6fa3899d798c9d8028f1e`, rama `qa/cheveni-release-20261025`. Última sección; historial conservado debajo.

Commit `522d148b7d406c5973b6fa3899d798c9d8028f1e`: muestra aviso de conciliación de notificación tras decisión registrada; una sesión vieja no puede abrir alertas o modificar la nueva vista desde catch. Intent persistido y prohibición de replay intactos. Tres casos nuevos pasan (antes uno/dos); nueve regresiones directamente afectadas pasan, no se suman. Tres integraciones nuevas backend/web se cuentan solo en backend, con Auth/SQL/proveedores/DOM ficticios; no validación operativa.

Fuentes emparejadas en candidato backend: backend `b93cb29b1eba5bd2f0422c737b9e0a414b0f223d`, web `522d148b7d406c5973b6fa3899d798c9d8028f1e`. Se fijan 17 fuentes web; no se repite build histórico ni despliega. Logs/resultados/hashes en `../unlock-qa-20261027/`.

[Informe maestro actualizado](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/desktop-qa-20261027/CONTINUIDAD.md) y [candidato/procedimiento único](https://github.com/MarcoAlexis10/chebot-backend/blob/qa/cheveni-native-nine-preflight-20261025/ops/release/operational-candidate-20261026/NEXT-VALIDATION.md). Siete nativos, cuota/freno US$0, Auth transaccional/journal, A2/custodia, comunicaciones y aceptación/operación siguen pendientes. Ninguna acción ASUS ni permiso de lanzamiento implícito.

---

# Histórico web conservado

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
