# Che Vení · integración focalizada del piloto manager–huésped

Solicitud: 12/11/2026. Ejecución: 13/11/2026 UTC. **Beta V1 NO-GO.** Se implementaron correcciones reutilizables de consumidores originales, exclusivamente en un paquete QA. No se activaron servicios, usuarios, propiedad, estadías, invitaciones ni trial.

## HEADs y checkpoints publicados

| Repositorio / rama | HEAD inicial verificado | HEAD verificado al cerrar código |
|---|---|---|
| chebot-web · qa/cheveni-integral-held-20261111 | bca48ca6d32bbca15a1357114db46cf2fa0c23fa | cdb6a22dda827383b9ccae0f5160e4ca70b3774c |
| chebot-backend · qa/cheveni-integral-held-20261111 | 9beb837a621f9a8f06601043afa64b3bba317cb5 | 9beb837a621f9a8f06601043afa64b3bba317cb5 |
| cheveni-qa-lab · qa/cheveni-native17-policy-closure-20261106 | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a |

El HEAD documental final es el commit que contiene este archivo en su enlace inmutable; el manifiesto lo distingue del HEAD funcional para evitar una referencia circular al hash del propio archivo.

- [14fedee2f65c74ce05c805b5b3c3fdc9aa3b3948](https://github.com/MarcoAlexis10/chebot-web/commit/14fedee2f65c74ce05c805b5b3c3fdc9aa3b3948): contexto de propiedades/estadías y significado de 403.
- [65877f04ccc601828f65e98af9a721d1fedf8590](https://github.com/MarcoAlexis10/chebot-web/commit/65877f04ccc601828f65e98af9a721d1fedf8590): contexto de secciones/enriquecimiento, deadline de conocimiento y restauración de invitaciones.
- [cdb6a22dda827383b9ccae0f5160e4ca70b3774c](https://github.com/MarcoAlexis10/chebot-web/commit/cdb6a22dda827383b9ccae0f5160e4ca70b3774c): composición con recorrido retenido más reciente, fuentes fijadas, verificación estática y aceptación.

Antes de publicar se comprobaron HEAD, árboles/blobs y workflows. Los dos workflows web existentes no incluyen esta rama en sus triggers push; se conservaron sus blobs y se usó [skip ci]. Ref actualizado con expected_sha, sin force, ramas nuevas, merge ni PR. Todos los blobs existentes al inicio se preservaron. Backend y laboratorio permanecieron sólo lectura. No se activó Actions.

## Defectos reproducidos y correcciones QA

| Defecto en código fuente / candidato previo | Corrección implementada | Evidencia ejecutada |
|---|---|---|
| Propiedades/estadías aceptan session distinto del que abrió el panel | Comparación exacta account_id/member_id/role; cerrar vista y limpiar filas/labels ante diferencia o ausencia | context-before: 3 FAIL/1 PASS; context-after: 4 PASS |
| Requests/incidents/knowledge no cotejan meta con el panel; enriquecimiento de incidencias tampoco | Mismo contexto de UI para cinco consumidores; descartar respuestas de sesión anterior antes de evaluar meta; revalidar después del await de enriquecimiento | sections-before: 3 FAIL; enrichment-before-corrected-assertion: 1 FAIL; sections-final: 5 PASS |
| Secciones notifican 401 y 403 con el mismo evento sin conservar status | CustomEvent conserva HTTP status y Auth muestra rechazo de permisos para 403, sin afirmar expiración/revocación | Incluido en context: FAIL previo → PASS |
| Decisión de conocimiento sólo aborta; puede esperar indefinidamente headers/JSON si el transporte ignora abort | Deadline cubre fetch y cuerpo, respeta cancelación externa y excluye callbacks tardíos; conserva marcador/UNKNOWN y no reenvía | knowledge-before: 2 FAIL; knowledge-after: 2 PASS |
| Invitaciones quedan pageActive=false después de BFCache y también rechazan filas recién cargadas | pageshow persistido reabre sólo la generación nueva; controles/bindings anteriores siguen invalidados y UNKNOWN persiste | invite-before: 1 FAIL; invite-after: 1 PASS, DOM sintético |

Son defectos reproducibles de los consumidores bajo entradas/esperas controladas. No se afirma que se hayan explotado operacionalmente: los endpoints y efectos conservan sus guards.

Código: [paquete QA consolidado](../../pilot-integration-20261112-v1/README.md), `compose.cjs`, `materialize.mjs` y `verify-composition.mjs`. El predicado window.cheveniManagerPanelContextMatches comprueba consistencia de presentación; **no autentica ni produce autoridad**. El backend debe seguir verificando identidad/contexto/permiso actuales. El candidato no se conecta al build operativo.

La composición reutiliza property-bootstrap/primera propiedad y el recorrido anterior; reemplaza cinco scripts y conserva las pantallas retenidas. Se generan localmente cinco overlays, con hashes en OVERLAY-MANIFEST.json; no se duplicó la aplicación ni se publicaron cuerpos completos adicionales. Los formularios siguen inertes y CSP mantiene connect-src/form-action none.

## Pruebas y verificación efectivamente ejecutadas

**12 casos nuevos PASS; 5 regresiones previas seleccionadas PASS. Total: 17 casos únicos.** Node 24.22.1, VM, DOM/storage/fetch sintéticos, reloj/deadlines controlados. Sin JWT verificado ni autoridad real. El launcher existente acreditó namespace de usuario/red nuevo, rutas externas vacías, conexión externa rechazada con errno 101 y ausencia de credenciales heredadas.

- `checkpoint2.tap`: 16 PASS. `sections-final.tap`: 5 PASS; cuatro ya están en el primero. No sumar 21 ni ejecuciones anteriores como casos nuevos.
- Tres regresiones Auth por impacto en limpieza/contexto/eventos y dos de invitaciones por impacto en bindings/restauración: aserciones originales ejecutadas contra el compositor **nuevo**.
- Diez aserciones nuevas distintas fallan contra el baseline; dos controles de compatibilidad pasan. No son diez fallos pendientes del candidato.
- Se conservaron fallos intermedios de patch drift y de la primera aserción de enriquecimiento. La excepción quedaba atrapada por el código original; se corrigió la aserción al resultado/limpieza observables y se añadió el guard final antes de retornar incidencias. Ambos logs permanecen, sin contarlos como casos extra.
- Verificación estática PASS: 57 fuentes coinciden por blob Git/SHA-256 con los repositorios fijados; 8 HTML, 6 JS, 3 scripts inline y 103 enlaces/referencias locales con anclas; cinco salidas coinciden con manifiesto. Esto no es navegador ni end-to-end operativo.

[TEST-EVIDENCE.json](TEST-EVIDENCE.json) contiene nombres, clasificación, logs y hashes. [PACKAGE-MANIFEST.json](PACKAGE-MANIFEST.json) fija código/logs. [SOURCE-PINS.json](../../pilot-integration-20261112-v1/SOURCE-PINS.json) fija las fuentes. No se repitieron suites históricas ni pruebas de calendario/Native17 por rutina.

**NOT_RUN:** navegador/Chromium, transporte HTTP real/local, SQL/PostgreSQL, Auth administrado, COMMIT externo, custodia journal/witness y restore A2. Cuatro casos browser anteriores conservados; N01–N12 y BPF01–BPF04 siguen NOT_AUTHORIZED/NOT_RUN. No se investigó nuevamente el host ni se usó ASUS.

## Integraciones compatibles y límites del recorrido

[INTEGRATION-STATUS.md](INTEGRATION-STATUS.md) vincula consumidores, métodos, handlers, DTOs y efectos de las nueve rutas principales más signup y cambio de teléfono. Es comparación de fuentes y ejecución de consumidores con dobles; no acredita conexión frontend–backend real en este lote.

Manager: invitación/alta retenidas → login/restauración con panel cerrado hasta DTO admitido → lectura de propiedad/estadías con contexto coherente → solicitudes/incidencias/conocimiento con scope de UI consistente. Las vistas de creación/configuración, estadía, huésped, pre-arrival y checkout permanecen retenidas. No se inventó un POST para un recurso que sólo dispone de GET ni se usó create_stay como mutación genérica.

Huésped: se inspeccionaron y fijaron loadConciergeGuestContext, conciergeGuestWindowCurrent y sendConciergeGuestScopedReply. Conservan la relación sesión/cuenta/propiedad/estadía/miembro y la ventana max(check-in,access_from) <= now < min(checkout,access_until), con carga actual antes de enviar. No se ejecutó envío ni se acreditó revocación nativa. No se creó un portal privado ficticio para representar limpieza/logout del huésped. Pre-arrival conserva sólo plantilla global pública; secretos siguen fuera, sin productor de aprobación por propiedad inventado. Free permanece separado.

## Bloqueos y siguiente paso

[PILOT-ACCEPTANCE.md](PILOT-ACCEPTANCE.md) separa offline, preparado sin ejecutar, falta de fuente, decisión humana y posponible. [RELEASE-GAPS.md](RELEASE-GAPS.md) conserva la matriz NO-GO. [RELEASE-CANDIDATE.json](RELEASE-CANDIDATE.json) referencia el candidato anterior, sus componentes A2/privacidad y estas correcciones.

Property_create pre-property, captura/original protegido, reader independiente, autoridad vigente, cupo/CABA/revisiones/floors, admisión durable, SQL/COMMIT, revocadores, journal/witness, Auth, A2 y D02-A específico siguen sin acreditar. No se repitió la búsqueda agotada del productor ni se fabricaron respuestas positivas. Las once mutaciones históricas continúan HELD. ACK COMMITTED no se convirtió en éxito durable, ni UNKNOWN en DENIED/SUCCESS o en permiso de reenvío.

La siguiente acción de mayor valor es **incorporar evidencia externa acreditable del laboratorio y fuentes protegidas faltantes, fijando una autorización concreta antes de cualquier ensayo nativo**. El diagnóstico ASUS ocurre por separado: aquí no se presume su resultado. Un host apto no completa el productor ni autoriza SQL. El navegador seguro debe validar las carreras/BFCache/CORS reales antes de incorporar estas correcciones a un build habilitado. Las decisiones legales/prelegales/retención y comerciales siguen siendo necesarias.

Recuperación exacta y comandos: [NEXT-EXECUTION.md](NEXT-EXECUTION.md). Fuentes, casos, baseline fallido y checkpoints permiten retomar sin repetir la búsqueda ni las suites acreditadas. No hay datos privados, estado operativo o permisos reales que recuperar.

Che Vení Concierge Beta V1: CABA, un manager fundador, una propiedad, 30 días gratuitos desde la primera estadía real verificada; sin cobro/conversión automática ni fecha prometida. No se seleccionó identidad real ni se inició el trial. **NO-GO.**
