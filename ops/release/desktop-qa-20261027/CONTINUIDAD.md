# Che Vení — cupo administrado investigado y bloqueos de código corregidos

**2026-10-27T19:24:32.427828-03:00, Argentina. Beta NO-GO. G01 conserva 7/7 nativo, no repetido.** Esta sección es el cierre vigente; el historial anterior se conserva debajo. Ramas existentes verificadas directamente en GitHub, sin reinicio ni descarte de avances.

| Repositorio / rama QA | Inicio comprobado | Código/pruebas final |
| --- | --- | --- |
| Backend / qa/cheveni-native-nine-preflight-20261025 | `abf7815213ac45d9941585efc85b5867c81b70cb` | `45302573b148a4654035de45a59c1ebf3e9eb152` |
| Web / qa/cheveni-release-20261025 | `42fe73e565b9da72d4f274266fd3d8917fb3e03e` | `42fe73e565b9da72d4f274266fd3d8917fb3e03e` (sin cambio de código web) |

Las cabeceras iniciales coincidían con las informadas. Commits documentales posteriores contienen este informe; sus SHA finales se entregan externamente al cierre, sin autorreferencia ficticia. Se releyó QA antes de cambios/publicación y se usó actualización no forzada con parent esperado.

## Organización, precio y capacidad: resultado real de solo lectura

Se identificó **Chebot**, organización `litbipybnwftrvegqhrg`, plan Free. Sus dos proyectos visibles están ACTIVE_HEALTHY en sa-east-1: `chebot-production` (`ykfpzqpiaxevpkhpaxpg`) y `chebot-concierge-dev` (`tyvwgsdzqipusodxtydv`). Solo se consultaron metadatos de control: list_organizations, list_projects, get_organization y get_cost(project). No consultas SQL, Auth, logs de personas, secretos ni cambios de recursos. El inventario/precio se refrescó antes de guardar su snapshot, con hora real de lectura.

**get_cost cotiza US$0 mensual**, pero eso no acredita elegibilidad ni un cupo. Supabase documenta dos proyectos gratuitos activos, límite compartido entre organizaciones de owners/admins, y proyectos pausados fuera del conteo. Con dos activos protegidos, **no hay un tercer cupo gratuito acreditado**. No se intentó crear para probarlo ni se pausó/borró/traspasó nada. Otra organización no se propone como evasión del límite global. [Evidencia fechada](../managed-closure-20261027/evidence/supabase-capacity.json), [fuente oficial](https://supabase.com/docs/guides/platform/billing-on-supabase), [FAQ](https://supabase.com/docs/guides/platform/billing-faq).

La propuesta anterior de simplemente autorizar un proyecto Free queda superada por este hallazgo. [managed-next-authorization.json](../operational-candidate-20261026/managed-next-authorization.json) ya fija organización, inventario, precio, bloqueo y consulta de excepción gratuita. No se promete que Supabase conceda esa excepción; su texto técnico está preparado y **no enviado**. No se solicita pagar ni sacrificar DEV/PROD.

`qa/release/managed-auth-plan.mjs` es preparación ejecutable **inerte**: diferencia cotización de disponibilidad, rechaza snapshot viejo/incompleto, gasto no cero, scope ausente y target DEV/PROD/existente. Nunca crea ni conecta. Incluso un plan ficticio preparado conserva creationAuthorized:false, executionAuthorized:false y providerEligibilityVerified:false. Enumera ocho comprobaciones reales pendientes: GoTrue login/refresh, session_id/JWT revocado, autoridad por propiedad, revocación contra escritura, invitaciones, aislamiento entre estadías/checkout, conciliación durable y cuarentena/restricciones de restore. No son pruebas operativas aprobadas.

## Correcciones publicadas

| Repositorio | SHA exacto | Finalidad |
| --- | --- | --- |
| chebot-backend | `49c6c500a73525e523c84c88398dde0b3af8750b` | fix(qa): protect owner invitation administration and final one-time credential responses |
| chebot-backend | `43f8a68f04ef4295fd549da3687ab3198ec8e781` | test(qa): integrate protected owner invitation responses with generated manager web |
| chebot-backend | `83a3e5ba68518aba2a6d508a233abadfc0566fbe` | feat(qa): prepare fail-closed managed Auth plans without treating price as free capacity |
| chebot-backend | `c4f668cdd4831f0645de88494f861e35fbc96cb5` | fix(qa): recheck guest invitation expiry authority and recipient graph after reservation |
| chebot-backend | `deff17a32522e1de81ff53ab57d803f4126930d0` | test(qa): verify affected guest invitation route and web contracts against current sender |
| chebot-backend | `45302573b148a4654035de45a59c1ebf3e9eb152` | fix(qa): preserve owner admin nosniff protection on revalidated success responses |

- **Owner e invitaciones de manager:** `concierge-manager-signup-admin.js` revalida contexto owner al devolver la lista y después de issue/screen/followup/revoke exitosos. Pérdida de rol/vínculo tras commit devuelve 503 y conciliación; no revela la URL/token ni permite presentar un nuevo intento como corrección segura. La preparación válida conserva HTTP201 y credencial visible una vez, sin enviar ni provisionar.
- **Minimización del feed administrativo:** copia exclusivamente columnas seleccionadas, rechaza filas ambiguas/IDs inválidos/duplicados y screenings ajenos/duplicados/expandidos antes de devolver emails/nombres/estados. La PK invite_id del screening capturado confirma la cardinalidad esperada. No se declara que el feed esté desplegado o que la admisión legal se haya conectado.
- **Respuesta común:** `concierge-manager-auth-session.js` permite únicamente HTTP200/201 para el éxito del checkpoint postcommit, manteniendo el 200 por defecto. Se preserva nosniff en todas las respuestas del admin; una regresión de ese header detectada al integrar el helper se corrigió en `45302573b148a4654035de45a59c1ebf3e9eb152`. No agrega un caso al conteo.
- **Invitación del huésped tras reserva:** `index.js` rechaza cipher_version no soportada antes de reservar; vuelve a comprobar finalidad autorizada y a leer invitación/miembro/estadía/propiedad/identidad/canal después de esperar la reserva durable. Vencimiento de invitación, checkout, rechazo, revocación, cambio de número/canal o revisión del texto/estadía impiden usar el snapshot viejo. Se conserva/finaliza como unknown la reserva y no hay retry automático. Es checkpoint de aplicación: falta fence transaccional al despacho real del proveedor.

Runtime modificado: esos tres módulos backend; no código web, SQL, workflows ni configuración de servicios. Nuevos tests/fixture y preparación inerte constan por ruta en [RESULTS.json](../managed-closure-20261027/RESULTS.json). Todos los cambios de código se verificaron y publicaron antes del cierre documental.

## Pruebas y evidencia

**20 nuevas únicas, 20 aprobadas, cero fallos finales; todas contabilizadas en backend.** Dos son integraciones nuevas entre repositorios. **Nueve regresiones históricas directamente afectadas aprobadas**, sin contarlas de nuevo.

| Grupo nuevo | Casos | Alcance |
| --- | --- | --- |
| Owner/lista/credencial administrativa | 6 | Ruta, bindings Auth, criptografía del token y Ed25519 reales; servicios/negocio ficticios |
| Owner backend → panel generado | 2 | POST handler real y JavaScript generado; GoTrue/SQL/GET list/DOM ficticios |
| Preparación de capacidad administrada | 5 | Solo planificación inerte, ningún servicio ni proyecto creado |
| Invitación tras reserva | 7 | Sender y consumidor del contrato de reserva reales; RPC/BD/proveedor ficticios |

Las nueve regresiones fueron: un caso de statuses administrativos (las cuatro acciones), uno de éxito postcommit por defecto HTTP200, tres de hold/checkout/sender de invitación y cuatro de integración histórica invitación/panel. Se ejecutaron con test-name-pattern cuando correspondía. Los fixtures históricos solo recibieron el puerto nuevo/metadato cipher_version y se actualizó el pin del sender revisado; assertions conservadas. Se repasaron seis casos nuevos al extraer el fixture para integración y uno al restaurar nosniff; no suman casos nuevos ni regresiones históricas adicionales.

Los logs de reproducción antes/después se conservan, incluidos los rechazos previos y el header detectado en esta integración. **No** se ejecutaron los siete nativos, nueve históricos, A1, consulta Auth consumida, laboratorios descartados, suites generales ni nuevos envíos. Ninguna de estas 20 pruebas usa PostgreSQL nativo o valida GoTrue real. Ningún fallo final pendiente. [Logs/metadata](../managed-closure-20261027/evidence/), [SHA256SUMS](../managed-closure-20261027/SHA256SUMS).

## Candidato y bloqueos restantes

Se actualizó el candidato único: [source-lock](../operational-candidate-20261026/source-lock.json), [candidate.json](../operational-candidate-20261026/candidate.json), [procedimiento](../operational-candidate-20261026/NEXT-VALIDATION.md). Auditor estático **source_coherent_held**, 62 fuentes backend y 17 web cotejadas con GitHub. No nuevo build, despliegue ni migración aplicada. Los cuatro SQL y las 38 fuentes/ZIP ASUS permanecen intactos; G01 conserva evidencia inmutable #40589102672 y no se reabre su autorización consumida.

| Frente | Avance comprobado | Lo que sigue impidiendo GO |
| --- | --- | --- |
| G01 instalación | 7/7 histórico real conservado | No repetir; PASS acotado a sus fuentes, no GoTrue administrado |
| G02 Auth / destino | Organización/plan/proyectos/precio reales identificados; guard de preparación | Cupo gratuito adicional confirmado y destino aislado autorizado; soporte de perfil/hook/roles y GoTrue real |
| G03/G04 autorización e idempotencia | Owner/credencial y envío tras reserva reforzados, incertidumbre segura | Autorización SQL por propiedad, carreras, fence real del proveedor, journal/ACK durable y todos los escritores; sessionStorage no es lock de servidor |
| G05 recuperación A2 | Sobres/testigos/cuarentena y fuentes existentes conservados | Restore PostgreSQL/roles/FKs, Auth/GoTrue, Vault, Storage/objetos/políticas/API y configuración/claves externas/custodia; rollback de instalación no es restore A2 |
| G06/G09/G10 primer manager | Contratos de preparación/invitación y aceptación web comprobados en código | Provisionado/aceptación y propiedad realmente conectados, un recorrido ficticio completo autorizado, facultades/soporte y evento D01 real |
| G07 comunicaciones | Sender no usa invitación/canal preparados ya obsoletos | Elegibilidad/destino/redirects, callbacks/entrega y conciliación controlados con permiso específico; cero mensajes reales |
| G08 privacidad | Feed minimizado y menos exposición tras pérdida de autoridad | Textos/hechos/periodos/fundamentos por categoría y derechos/supresión verificables; sin borrado real ni nuevos plazos legales |
| G11 lanzamiento | Candidato/pins/reversión y matriz existentes actualizados | Resto de requisitos acreditados y autorización comercial final; holds siguen cerrados |

**Cerrados en QA:** los defectos descritos, no G02–G11 operativos. El hallazgo de capacidad esclarece un bloqueo, no lo elimina. [Matriz única](../no-asus-20261026/MATRIZ-LANZAMIENTO.md) actualizada, sin nueva matriz paralela. El origen sigue DEV y el proveedor de proof por defecto no está conectado; un env/checkbox o más mocks no habilita admisión.

Se revisaron controles A2/retención y el procedimiento consolidado de derechos existente; no se identificó otro defecto nuevo demostrable que justificara rehacer componentes o repetir laboratorios aprobados. No se verificó normativa nueva ni se dio vigencia a borradores. D01/D02-A se conservan: un manager/una propiedad CABA, 30 días desde primera estadía real verificada, sin cobro automático; sin archivo general de chats postcheckout y con evidencia excepcional mínima separada y fundada. El checklist único de aceptación, soporte/incidentes, activación y reversión continúa en NEXT-VALIDATION y documentos consolidados, pendiente de evidencia operativa.

## Camino mínimo y única decisión pendiente

1. Conseguir confirmación de un cupo QA gratuito adicional soportado, conservando ambos proyectos protegidos y coste cero. Precio US$0 por sí solo no lo consigue.
2. Con capacidad y autorización exactas: preparar destino independiente, verificar perfil real y migración soportada sin instalar el baseline Auth ficticio; validar Auth/sesiones/journal/escritores y recuperación/custodia.
3. Ejecutar un solo circuito ficticio conectado (manager → propiedad → invitación/verificación → pre-arrival → check-in → información privada/turismo → incidencia → checkout/revocación → Free). Correo/WhatsApp solo con autorización operativa propia posterior.
4. Completar aceptación/privacidad/facultades/soporte y revisar release/reversión para el permiso comercial final. No sumar Cloudflare, cron o plataforma de múltiples propiedades como requisitos.

**Única decisión propuesta al propietario:** autorizar una consulta a Supabase sobre una excepción gratuita de cupo QA. Texto, límites y contexto exactos están en [managed-next-authorization.json](../operational-candidate-20261026/managed-next-authorization.json); **no se envió**. No garantizar respuesta/concesión, no pedir cambiar de plan ni liberar cupo pausando/borrando DEV/PROD. La instrucción vigente prohíbe mensajes reales y cambios de servicios, por lo que esa gestión externa requiere autorización propia. No hace falta ASUS ni elegir otra vez la organización. Si la excepción no existe, el entorno administrado sigue NO-GO bajo las restricciones actuales.

## Publicación y recuperación

Se comparan cambios publicados, 79 fuentes, manifests y refs; [source-publication.json](../managed-closure-20261027/evidence/source-publication.json), [control-refs](../managed-closure-20261027/evidence/control-refs.json). Main backend `bc82c2cd7c8470bfc2255dcad48fd40c7900435a` y web `eb0dbf6261bc612bf548ec35e8b814a39738824e` intactos. Cero workflows disparados por los commits funcionales. Ningún servicio creado, pausado, borrado o modificado; ninguna consulta a BD/Auth real ni secreto leído.

Retomar desde cabeceras finales GitHub, este informe y source-lock, preservando lo posterior. No repetir estos 20 casos ni las nueve regresiones sin cambio afectado. No se promete trabajo en segundo plano ni horas no realizadas. **Beta NO-GO.**

---

# Histórico conservado: siete nativos y cierre anterior

# Che Vení — siete nativos aprobados y cierre de controles QA

**2026-10-27T19:00:54.281517-03:00, Argentina. Beta comercial NO-GO. G01 cerrado para las fuentes SQL fijadas.** Esta es la continuidad vigente. Se recuperaron ambas ramas desde GitHub sin reiniciar ni repetir ensayos aprobados. La evidencia de Billing aportada por el propietario permitió consumir una vez la autorización condicional.

| Repositorio / rama | Inicio real | Código/pruebas final |
| --- | --- | --- |
| Backend / `qa/cheveni-native-nine-preflight-20261025` | `95ffcc0a1b5b7896e7453c1f5d49081724bb6230` | `c85cf5d04c231a1a4d22095de20476acbe77227b` |
| Web / `qa/cheveni-release-20261025` | `eb7ca2f806129c1d4919dd297523fc46bbaf3fbb` | `eb7ca2f806129c1d4919dd297523fc46bbaf3fbb` (código web conservado) |

Los commits documentales posteriores contienen esta sección; sus cabeceras exactas se entregan externamente al terminar para evitar inventar autorreferencias SHA. Se verificó ref antes de editar/publicar y se usó actualización no forzada con parent esperado. No se descartó trabajo ajeno.

## Resultado nativo real

- **Workflow:** 398755400, `.github/workflows/cheveni-combined-installation-once.yml`.
- **Run:** [40589102672](https://github.com/MarcoAlexis10/chebot-backend/actions/runs/40589102672), evento push QA, **run_attempt 1**, conclusión success.
- **Job:** 122488345423, GitHub-hosted `ubuntu-latest`, runner `GitHub Actions 1000001065`.
- **Commit ejecutado:** `7f09308e5159e1c51e79796b06228e42c6d1f394`; parent revisado `95ffcc0a1b5b7896e7453c1f5d49081724bb6230`.
- **Inicio/fin:** 27/10/2026 18:43:12–18:43:49 Argentina (**37 segundos**). Timeout configurado ocho minutos. Sin rerun ni retries de casos.
- **Motor comprobado por consulta del laboratorio:** PostgreSQL `170011` (17.11), base/usuario ficticios, sin relaciones/event triggers/esquemas de aplicación preexistentes.

| Caso nuevo de instalación conjunta | Resultado real |
| --- | --- |
| atomic_four_component_install_and_rollback | PASS |
| partial_failure_restores_catalog_roles_and_grants | PASS |
| combined_exact_managed_auth_metadata | PASS |
| combined_consumer_permissions | PASS |
| least_privilege_executor_role_profiles | PASS |
| full_schema_liveness_and_serial_session_revocation | PASS |
| reinstall_rejected_without_partial_change | PASS |

**7/7, cero fallos.** Son los siete pendientes; no se importaron ni repitieron los nueve históricos #40253292525. El caso de metadata Auth usa el catálogo ficticio en PostgreSQL nativo, no un GoTrue administrado; la revocación es serial y no declara nuevas carreras universales aprobadas.

El canary pasó **antes de DDL/ensayos**, con versión exacta, cero casos ejecutados y separación efectiva de namespaces/red/procesos. Se verificaron Docker network none, sin puertos/mounts/socket del host, usuario postgres, rootfs readonly, cap-drop/no-new-privileges y límites CPU/memoria/PIDs. También pasó parada de proceso, fallo controlado y limpieza del canary preservando solo imagen propia. Después de los siete pasó limpieza final de todos los recursos con lease/labels propios y el fallback always. No limpieza global ni recursos compartidos. El perfil acreditado es este runner descartable, no Docker Desktop ASUS.

[Bloque de evidencia nativa](../native-execution-20261027/evidence/native-execution.json), [logs depurados](../native-execution-20261027/evidence/sanitized-native.log), [eventos estructurados](../native-execution-20261027/evidence/sanitized-native-events.json), [metadata y steps](../native-execution-20261027/evidence/workflow-run.json). Se conserva SHA-256 del log decodificado original; se omiten tokens enmascarados del checkout y ruido de setup. Checkout privado con permiso contents:read y sin persistir credenciales; ningún secreto de aplicación o proveedor se pasó al contenedor.

## Presupuesto, autorización consumida y retiro

La evidencia del propietario del 27/10 informa 1004/2000 minutos, **996 disponibles**, Actions US$0, Stop usage activado, facturable US$0 y sin método de pago. Se revalidó fecha, producto, aritmética y margen sobre ocho minutos; el control US$0 corresponde a esa evidencia del propietario, **no a un refresh directo de Billing por API**, que la conexión no ofrece. No se cambió configuración de cuenta. No se afirma saldo ni factura posterior al job. [Registro exacto](../native-execution-20261027/evidence/billing-evidence.json).

La activación contenía solamente workflow QA y marker ligados al parent/event/commit, run_attempt 1, sources/pins y runner alojado. Los workflows existentes fueron inspeccionados: ninguno se dispara por ese push en esta rama. El permiso fino de publicación dejó de ser supuesto: el workflow se publicó y corrió realmente desde QA sin main. No se instaló en main ni se activaron cron/despliegues.

Tras éxito se retiraron workflow y marker en **`49d3ab4a0fec085c716d80499038d5d529c29144`**. El commit de activación preserva sus bytes como evidencia inmutable. Permiso **CONSUMIDO**, cero ejecuciones adicionales autorizadas; no repetir canary/siete/nueve por rutina. El template actual conserva approved:false y CONSUMED_DO_NOT_REUSE. Las 38 fuentes/ZIP ASUS y 23 fuentes de instalación permanecen intactas.

## Correcciones funcionales publicadas

| Repositorio | SHA exacto | Finalidad |
| --- | --- | --- |
| chebot-backend | `7f09308e5159e1c51e79796b06228e42c6d1f394` | Single combined-native activation |
| chebot-backend | `49d3ab4a0fec085c716d80499038d5d529c29144` | Archive native seven PASS and retire activation |
| chebot-backend | `b2dff5111b6aaf770ab14d6d52235b7380088abd` | fix(qa): bind incident learning to an unchanged tenant case and resolution source |
| chebot-backend | `a9b4ad129b58c843ff11a990985e14487ca1c9f9` | fix(qa): revalidate final manager authority before returning a learned draft |
| chebot-backend | `8d061ce73f10496a007d2b532e395ee2e31cc230` | test(qa): fix signed-authority fixture dependency and verify final learning responses |
| chebot-backend | `c85cf5d04c231a1a4d22095de20476acbe77227b` | fix(qa): recheck final manager authority on phone-change proposal and approval receipts |

**Fuentes del aprendizaje:** `concierge-manager-incidents.js` ya no acepta una primera fila cualquiera para construir el borrador. Vincula cuenta/incidencia, protocolo y categoría, evento manager_response y texto primitivo; rechaza duplicados y respuestas ajenas. Relee incidente con updated_at, versión del protocolo y última resolución antes de mutar. Si cambian o el servicio falla, exige conciliación sin crear ni activar conocimiento. Esta relectura es checkpoint de aplicación: falta comprobar el bloqueo/versionado de fuente dentro de una transacción administrada.

**Respuesta de borrador:** el endpoint autónomo de aprendizaje revalida el binding real de sesión y cuenta/miembro/rol antes de devolver la propuesta ya registrada. Pérdida de autoridad tras commit no revela el recibo ni afirma rollback: 503 y conciliación, sin otra escritura.

**Cambio de teléfono:** `concierge-manager-guest-phone-change.js` aplica el mismo checkpoint final a propuesta y aprobación exitosas. Mantiene recibos, normalización/HMAC y denegaciones conocidos; una autoridad cambiada/no verificable no devuelve change_id ni invita a repetir. Los holds sensibles y de admisión siguen cerrados.

Archivos runtime modificados: únicamente esos dos módulos backend. También se agregaron tres archivos de pruebas focalizadas y se ajustaron puertos/metadatos de dos fixtures históricos, sin cambiar sus assertions. Web mantiene su implementación; solo se actualiza continuidad. Rutas y lista completa de archivos por commit constan en [RESULTS.json](../native-execution-20261027/RESULTS.json).

## Pruebas: distinguir nativo de servicios ficticios

| Clase | Nuevas | Aprobadas | Fallidas finales |
| --- | --- | --- | --- |
| PostgreSQL nativo 17.11: los siete pendientes | 7 | 7 | 0 |
| JS de código: fuente/ámbito de aprendizaje | 8 | 8 | 0 |
| JS de código: autoridad final del borrador | 3 | 3 | 0 |
| JS de código: autoridad final de propuesta/aprobación telefónica | 3 | 3 | 0 |
| Regresiones históricas directamente afectadas (no nuevas) | 0 | 8 | 0 |

Son **siete nativos y 14 casos JS nuevos**, separados; canary/limpieza son controles previos/posteriores, no se suman como casos de negocio nuevos. Las ocho regresiones son siete del aprendizaje tras cambiar recibos/columnas y una de éxito telefónico con ambas acciones (test-name-pattern). No se corrieron suites completas, los 32/186 anteriores ni nuevas pruebas web históricas. No nuevas integraciones entre repositorios en esta sesión; se conserva la compatibilidad de fuentes y las anteriores.

En los 14 JS son reales los módulos/handlers, validadores, bindings Auth, HMAC y Ed25519 donde se indican; GoTrue, SQL/PostgREST, receipts de negocio, proveedor de proof y red son ficticios. En las pruebas de autoridad final el negocio completado es un puerto ficticio; las ocho de fuente ejercitan el builder real. Estos archivos usan sufijo de esta ejecución pero **no son ensayos PostgreSQL nativos**. No se declaran comunicaciones ni integración operativa aprobadas.

Incidente de validación reconocido: publiqué un fixture nuevo sin inyectar assert, causando ReferenceError en tres casos nuevos en el commit `a9b4ad129b58c843ff11a990985e14487ca1c9f9`. Lo corregí en `8d061ce73f10496a007d2b532e395ee2e31cc230`; tres casos pasan y el log inicial se conserva. Después de corregir el fixture se reprodujo el comportamiento viejo contra el commit anterior inmutable y se verificó la corrección. No afecta el run nativo ni agrega casos al conteo. Ningún fallo final pendiente.

## Candidato y matriz: cierre real frente a pendientes

El candidato existente fue actualizado con los IDs/resultados nativos y pins actuales: [candidate.json](../operational-candidate-20261026/candidate.json), [source-lock.json](../operational-candidate-20261026/source-lock.json), [procedimiento único](../operational-candidate-20261026/NEXT-VALIDATION.md). Auditor estático `source_coherent_held`, 62 fuentes backend/17 web comparadas con GitHub. No build histórico repetido. Los cuatro SQL y baseline siguen siendo componentes QA: un PASS nativo no autoriza instalarlos sobre Auth administrado. No migración operativa ni despliegue.

| Frente | Estado verificable | Pendiente obligatorio |
| --- | --- | --- |
| Instalación nativa / G01 | **CERRADO**, siete reales, canary/ACL/roles/rollback/limpieza | Ninguna repetición; conservar pins. No extiende el PASS a otros motores/destinos |
| Auth administrado / G02 | Catálogo nativo ficticio y código de respuesta reforzados | GoTrue soportado, hooks/roles y destino autorizado, login/refresh/revocación efectivos |
| Autorización e idempotencia / G03–G04 | Ámbito/fuente y respuestas postcommit mejorados | Transacción por propiedad/fuente, carreras, journal durable y todos los escritores, conciliación y fence real de proveedor |
| Recuperación A2 / G05 | Controles/sobres/testigos previos conservados, sin A1 ni restore repetido | Restore de PostgreSQL/roles/FKs, Auth/GoTrue, Vault, Storage API/objetos/políticas y claves/configuración/custodia. Rollback de instalación no es restore A2 |
| Privacidad / G08 | D01/D02-A intactas; fuentes ajenas no se convierten en conocimiento | Texto/aceptación y periodos/fundamentos por categoría, derechos y supresión propia/proveedores/copias; revisión pertinente |
| Comunicaciones / G07 | Recibos/estados inciertos conservados, cero mensajes | Correo/Meta, redirects/destinatarios/callbacks/entrega y conciliación con permiso específico |
| Primer manager / G06/G09/G10 | Candidato para una propiedad, UI sin cambios incompatibles | Admisión/aceptación y propiedad conectadas, recorrido ficticio completo en destino autorizado, facultades/soporte y evento D01 real |
| Lanzamiento / G11 | Procedimiento/reversión y matriz única actualizados | Resto de gates acreditados y autorización comercial final; holds cerrados |

La [matriz única](../no-asus-20261026/MATRIZ-LANZAMIENTO.md) reemplaza los antiguos pendientes nativos por el resultado real, sin crear otra matriz. Se cerró G01 y los defectos de código descritos; G02–G11 siguen abiertos o parciales. El puerto de proof por defecto continúa sin proveedor real, origen Auth sigue fijado a DEV y admisión legal cerrada. No se habilitan cambiando env o un booleano.

## Camino mínimo y próxima intervención indispensable

1. **Ya hecho:** siete nativos una vez, retirar activación y guardar evidencia. No volver a pedir Billing ni otro permiso equivalente para ese intento consumido.
2. **Siguiente bloqueo real:** disponer de un destino Supabase QA administrado independiente, expresamente autorizado y de coste cero, para comprobar Auth/journal/escritores/recuperación soportados. [Propuesta concreta](../operational-candidate-20261026/managed-next-authorization.json): un proyecto Free descartable `cheveni-beta-auth-qa-20261027`, región propuesta sa-east-1, organización elegida por el propietario, cotización/cupo cero antes de crear. No se consultó ni creó ningún recurso Supabase en esta ejecución.
3. Un único recorrido ficticio conectado: invitación → verificación → pre-arrival → check-in → turismo/privado → incidencia/manager → checkout/revocación → Free; comunicaciones reales solo con autorización acotada posterior.
4. Completar en paralelo aceptación/privacidad/facultades/soporte y revisión del release/reversión para permiso comercial final. No cron, Cloudflare ni expansión a varios managers/propiedades como nuevos requisitos.

**Única decisión ahora:** autorizar ese alcance de proyecto QA Free aislado e indicar en qué organización Supabase. Si no hay cupo/cotización US$0, detener sin crear, pausar o borrar proyectos existentes. Alcance, riesgos y reversión están listos para revisar en el JSON. Los límites actuales prohíben crear/modificar servicios reales y por eso este paso no se ejecutó autónomamente. No hace falta ASUS. No se pide volver a ejecutar catálogo Auth de DEV ni recapturar A1.

D01: un manager fundador, una propiedad CABA, 30 días desde primera estadía real verificada, sin cobro automático; estadías ya verificadas hasta checkout salvo baja/revocación justificada. D02-A: sin archivo general de conversaciones después del checkout; evidencia excepcional mínima separada por finalidad/obligación concreta, sin plazos legales inventados ni supresión real.

## Publicación y punto de recuperación

Se cotejaron archivos publicados y 79 fuentes con blobs GitHub; [verificación](../native-execution-20261027/evidence/source-publication.json), [SHA256SUMS](../native-execution-20261027/SHA256SUMS), [fuentes inmutables](../native-execution-20261027/evidence/immutable-sources.json). Main backend `bc82c2cd7c8470bfc2255dcad48fd40c7900435a` y web `eb0dbf6261bc612bf548ec35e8b814a39738824e` permanecen intactos. La activación de un uso ya no existe en la cabecera y ningún push posterior originó otro job nativo.

No se tocaron DEV/PROD/chebot-production, Auth/Vault/Storage reales, cuentas, DNS, cron, despliegues, pagos, Windows ni ASUS. Ninguna consulta Auth real, captura A1, correo o WhatsApp real. Retomar desde refs finales GitHub, este informe, source-lock y run 40589102672; preservar lo posterior y no repetir los siete, los 14 nuevos o las ocho regresiones sin cambio directamente afectado. No continuidad en segundo plano ni horas ficticias de trabajo. **Beta NO-GO.**

---

# Histórico conservado: cierre condicionado anterior (32 casos)

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
