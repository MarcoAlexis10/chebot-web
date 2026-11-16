# Che Vení · candidato mínimo del primer piloto · 16/11/2026

**Beta V1 NO-GO.** Se conserva el candidato funcional retenido anterior. No apareció una corrección nueva de producto respaldada por los contratos inspeccionados; no se modificaron sus cinco consumidores, el build operativo ni las fuentes de backend. El avance técnico es una aceptación seleccionable, con puentes ejecutados entre las proyecciones originales y los consumidores del panel, y bloqueo explícito de ensayos externos.

## Versiones y publicaciones

| Repositorio / rama | HEAD inicial | HEAD al cerrar el código |
|---|---|---|
| chebot-web · qa/cheveni-integral-held-20261111 | bb27835e18d6c2f2f2656b46c1deb450b211213f | d6bf8e72d49157f463750036550e8ee3d8d0cf5f |
| chebot-backend · qa/cheveni-integral-held-20261111 | 9beb837a621f9a8f06601043afa64b3bba317cb5 | 9beb837a621f9a8f06601043afa64b3bba317cb5 |
| cheveni-qa-lab · qa/cheveni-native17-policy-closure-20261106 | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a |

El commit documental final es el que contiene este archivo en su enlace inmutable; su padre identifica el código final anterior. No se incorpora una referencia circular al hash del propio CLOSURE.

- [4a1c3f6020183cd8d4c204d07b0ea8298d134114](https://github.com/MarcoAlexis10/chebot-web/commit/4a1c3f6020183cd8d4c204d07b0ea8298d134114): proyecciones originales de solicitudes/incidencias → panel; selector aislado y controles negativos.
- [d6bf8e72d49157f463750036550e8ee3d8d0cf5f](https://github.com/MarcoAlexis10/chebot-web/commit/d6bf8e72d49157f463750036550e8ee3d8d0cf5f): parser de propiedad/proyección de estadías → panel; aceptación del mínimo piloto y alcance posponible.

HEAD/blobs/workflows comprobados antes de publicar; ref con expected_sha y [skip ci], sin force, merge o ramas nuevas. Los dos workflows web no incluyen esta rama en push. Ningún blob existente al inicio se cambió; backend y QA-lab permanecieron sólo lectura. Sin activación de workflows o servicios.

## Qué quedó implementado

Código y reproducción: [README del paquete](../../minimal-beta-20261116-v1/README.md).

1. `acceptance.mjs` selecciona exclusivamente IDs offline de una tabla fija, verifica 67 fuentes por SHA-256 y usa el launcher de aislamiento Node existente. No acepta shell, comandos arbitrarios, endpoints, SQL, --all ni flags para autorizar infraestructura.
2. [ACCEPTANCE-MATRIX.json](../../minimal-beta-20261116-v1/ACCEPTANCE-MATRIX.json) contiene 16 filas: cuatro puentes offline nuevos, cuatro grupos de regresión previamente acreditados, seis condiciones externas y dos decisiones humanas. Cada una especifica precondiciones, resultado y evidencia. **No son 16 pruebas aprobadas**. Los grupos históricos exigen una razón de impacto directo para seleccionarlos; no se ejecutan por defecto.
3. Casos nuevos ejecutan el parser original de propiedades, la proyección inline original de estadías y requestForClient/incidentForClient originales. Sus DTOs serializados llegan a los consumidores conservados del panel en un DOM sintético. No se importan ni ejecutan handlers, Auth, queries o escritores para fabricar una autorización.
4. Un caso EXTERNAL/HUMAN devuelve BLOCKED y código 3 sin ejecutor; una regresión sin impacto declarado devuelve código 2. El CLI no contiene implementación de Native17, navegador, Auth administrado, HTTP, COMMIT o restore.

La composición sigue siendo [pilot-integration-20261112-v1/materialize.mjs](../../pilot-integration-20261112-v1/materialize.mjs), con formularios retenidos y CSP sin red/formularios. No se generó otra aplicación, productor property_create, reader equivalente, gateway o variante SQL.

## Compatibilidad revisada y límites

| Frontera | Fuente original usada | Comprobación de este lote |
|---|---|---|
| Manager → propiedad | concierge-manager-property-receipt.js / parseManagerPropertyReceipt; renderProperties de manager-auth-v1.js | Recibo exacto con property_id/property_status/member_role y seis permisos; campo extra rechazado; borrador y rol visibles. GET únicamente. |
| Propiedad → estadías | Proyección staysPayload.map de concierge-manager-stays.js; renderStays de manager-auth-v1.js | Dos stay_id distintos, misma propiedad, checkout de A igual a check-in de B, fechas/horas CABA e identidad de fila conservadas. GET únicamente. |
| Estadía → solicitudes | concierge-manager-requests.js / requestForClient; manager-requests-v1.js y acciones ya compuestas | DTO con datos conserva property_id/stay_id y contenido visible; campos no seleccionados no pasan a DTO/UI. Sin decisión ni mutación. |
| Estadía → incidencias | concierge-manager-incidents.js / incidentForClient; manager-incidents-v1.js y acciones ya compuestas | DTO con datos conserva propiedad/estadía/estado/resumen; campos ajenos no aparecen. Sin cambio de estado, aprendizaje o comunicación. |
| Huésped → checkout | Guard/contexto privado y lifecycle retenidos del cierre anterior | Sin cambio ni nueva ejecución: acceso temporal y revocación reales todavía necesitan Auth/SQL/fences. No se probó un portal privado inexistente ni se simuló checkout real. |

Se comprobó en fuentes que las respuestas vacías de stays/requests/incidents conservan session/meta según exige la corrección anterior. No se justificó relajar la comprobación de contexto. Las pruebas nuevas usan recibos poblados: complementan las anteriores sobre cambio de contexto sin repetirlas.

No se identificó una regresión reproducible de los cinco consumidores en estas fronteras. Esta conclusión está acotada a lo inspeccionado/ejecutado, no es una afirmación de ausencia universal de defectos ni de integración operativa.

## Resultados realmente ejecutados

| Evidencia | Resultado | Qué demuestra |
|---|---|---|
| evidence/projectors.tap | 2 PASS, 0 FAIL/SKIP | Proyecciones originales requests/incidents → consumidor; Node/VM/DOM/fetch sintéticos |
| evidence/property-stays.tap | 2 PASS, 0 FAIL/SKIP | Parser de propiedad/proyección de estadías → consumidor; IDs/consecutividad/visualización, sin SQL |
| evidence/acceptance-controls-final.tap | 3 PASS, 0 FAIL/SKIP | Seguridad del selector y límites de ejecución; **herramienta QA, no funcionalidad del piloto** |
| evidence/selection-executed.log | 1 PASS repetido | CLI seleccionó únicamente el caso requests y usó el launcher existente; no es otro caso único |
| evidence/native-selection-blocked.log | BLOCKED, código 3 esperado | No existe ejecución nativa en el selector |
| evidence/historical-selection-blocked.log | BLOCKED, código 2 esperado | No se repiten casos históricos sin razón de impacto |

**Cuatro casos funcionales offline nuevos y tres controles de herramienta**, contados por separado. Los tres controles se repitieron al ampliar la tabla de selección a propiedad/estadías y se cuentan una sola vez. Los 12 casos y cinco regresiones del cierre anterior se conservaron sin ejecutarlos de nuevo. No hubo un baseline de producto fallido ni una corrección de producto que acreditar en este lote.

Node v24.22.1. El launcher verificó namespace de usuario/red nuevo, ausencia de rutas externas, rechazo externo errno 101 y ninguna credencial heredada. Esto acredita aislamiento de esos procesos Node, no un host PostgreSQL o navegador. Datos, tokens y filas son sintéticos; ninguno verifica identidad o autoridad real.

[TEST-EVIDENCE.json](TEST-EVIDENCE.json) distingue resultados/repeticiones/NOT_RUN. [SOURCE-PINS.json](../../minimal-beta-20261116-v1/SOURCE-PINS.json) fija 67 entradas coincidentes con GitHub. [PACKAGE-MANIFEST.json](PACKAGE-MANIFEST.json) fija código y logs. No sumar filas de matriz, controles del selector o ejecuciones repetidas como pruebas operativas.

**NOT_RUN / sin acreditar:** navegador y CORS real, Auth administrado/JWT/refresh/revocación, SQL/PostgreSQL, N01–N12, BPF01–BPF04, COMMIT externo, journal/witness y A2. No se investigó el host, reintentó Chromium ni utilizó ASUS.

## Mínimo obligatorio y funcionalidades posponibles

Pueden posponerse la UI de publicación de aprendizaje, UI de co-manager/operativo temporal, autoservicio de cambio telefónico, contenido pre-arrival personalizado, multi-propiedad/multi-ciudad Concierge, altas masivas y automatización de cobros. Es una delimitación del candidato, no una habilitación o cambio comercial ejecutado.

Condiciones: conservar los roles y denegaciones distintos; un operativo no se transforma en manager. Un teléfono revocado no recupera acceso por conveniencia. Pre-arrival conserva sólo la plantilla pública global, sin secretos ni loader privado. No posponer identidad vigente, alcance de propiedad/reserva, aislamiento entre reservas, revocación al checkout, UNKNOWN/readback, custodia o recuperación A2. Las once mutaciones históricas y altas comerciales siguen HELD.

Contrato comercial intacto: CABA, un manager fundador, una propiedad; 30 días gratis desde la primera estadía real verificada, no iniciados; sin cobro/conversión automática ni fecha prometida; Free separado.

## Bloqueos priorizados para incorporar al primer manager

1. **Fuentes protegidas de admisión/primera propiedad:** elegibilidad del fundador, owner/member/account actuales, cupo completo, CABA, revisiones/restricciones/floors y property_create sin propiedad activa ni trial iniciado. Siguen ausentes; no se repitió su búsqueda ni se creó un sustituto positivo.
2. **Original, escritura y conciliación durables:** custodia/procedencia, intención/attempt, admisión NEW/KNOWN, exclusión SQL/fences/revocadores, reader independiente con mínimo privilegio, COMMIT externo y journal/witness. ACK COMMITTED no demuestra éxito; UNKNOWN no permite reenvío.
3. **Auth real y revocación:** proveedor verificando identidad/sesión/issuer/expiración, JWT previo a revocar, refresh, cambios de sesión y revalidación antes de despacho/readback. Una respuesta sintética con session/meta no satisface esto.
4. **Privacidad/legal/prelegal y permiso comercial:** conservar D02-A general ya decidido; faltan decisiones/evidencia específicas de custodia/minimización/retención de originales y captura, además de las condiciones legales/prelegales y autorización de incorporación real. Sin plazos o aprobaciones inventados.
5. **Laboratorios/evidencia nativa y de navegador:** PostgreSQL 17.11 exacto y aislamiento/costo/descarte acreditados con autorización por artefacto/operación; navegador compatible para CORS, BFCache y carreras reales. Un host disponible no completa los productores ausentes ni autoriza ensayos.
6. **A2 integral:** PostgreSQL, GoTrue/Auth, Vault, Storage, configuración/claves, revocaciones independientes, journal/witness y floors posteriores al backup; cuarentena hasta reconciliación. No sustituirlo por restaurar tablas ni recuperar permisos antiguos.

## Secuencia preparada y recuperación

La matriz conserva el NATIVE-PLAN anterior por referencia, con sus N01–N12 y separación de Auth sintético/administrado. No crea runner o SQL sucesor. Secuencia condicional: fuentes y privacidad específicas → autorización/laboratorios para Native17, Auth y navegador según sus dependencias → COMMIT/readback/journal → recuperación A2 → decisión comercial. Cada ensayo requiere alcanzar su rama relevante; un rechazo del guard exterior no acredita la invariante buscada.

Para continuar, leer este cierre y ejecutar únicamente `acceptance.mjs --list` o `--plan <ID>` si no hay cambios. Los dos archivos nuevos de casos se pueden seleccionar con OFF-PROPERTY-DTO, OFF-STAY-DTO, OFF-REQUEST-DTO u OFF-INCIDENT-DTO detrás del launcher; no repetirlos por rutina. REG-* exige impacto directo declarado. EX-* y H-* permanecen bloqueados en este programa incluso si se aporta una razón.

La siguiente acción de mayor valor requiere **evidencia externa y productores protegidos reales**, no otro catálogo de fixtures: resolver el primer bloqueo y acreditar/autorizar el laboratorio y proveedor precisos antes de los ensayos correspondientes. No se identificó otra corrección de producto segura justificada por las fuentes examinadas. Se conserva NO-GO sin inventar trabajo o resultados operativos.
