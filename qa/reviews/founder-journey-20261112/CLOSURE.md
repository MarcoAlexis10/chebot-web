# Che Vení — candidato de experiencia del manager fundador

12 de noviembre de 2026. **Cinco casos nuevos PASS y tres regresiones focalizadas PASS, exclusivamente Node/QA offline. Beta V1 NO-GO.** Se corrigieron fallos del frontend derivado y se trazó el recorrido real frontend/backend. No se acreditó una integración funcional operativa, Auth administrado, navegador, SQL o recuperación real.

## Versiones y publicaciones

Se leyó el cierre 426eae627154f5bff011335d1c5e688e32ca7d59, OWNER-DECISION, NEXT-EXECUTION, GO-NO-GO y TEST-EVIDENCE. HEADs iniciales remotos comprobados antes de escribir:

| Repositorio/rama | HEAD inicial | HEAD de fuentes al consolidar |
|---|---|---|
| Web / qa/cheveni-integral-held-20261111 | 426eae627154f5bff011335d1c5e688e32ca7d59 | 45b09f50e62e9275c12f2eb6717d2b98bf0766db y commit contenedor final |
| Backend / qa/cheveni-integral-held-20261111 | 9beb837a621f9a8f06601043afa64b3bba317cb5 | Igual, sólo lectura |
| Native17 / qa/cheveni-native17-policy-closure-20261106 | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a | Igual, sólo lectura |

- [6957b627b23644c4da81d2addf28e6bf0625677a](https://github.com/MarcoAlexis10/chebot-web/commit/6957b627b23644c4da81d2addf28e6bf0625677a): correcciones de experiencia, cadena original y materializado retenido, `[skip ci]`.
- [45b09f50e62e9275c12f2eb6717d2b98bf0766db](https://github.com/MarcoAlexis10/chebot-web/commit/45b09f50e62e9275c12f2eb6717d2b98bf0766db): recorrido, piloto/A2 y verificador de trazabilidad, `[skip ci]`.
- El commit que contiene este CLOSURE añade el caso focal ampliado, sus evidencias, manifiestos y cierre con `[skip ci]`. Es el **HEAD final web**, verificado después de publicar y fijado en el enlace directo de entrega; se evita un SHA circular en su propio contenido.

SOURCE-PINS fija 17 inputs web y 28 backend con SHA256/blobs contrastados con los árboles remotos de esos commits. PRODUCTO, build operativo, workflows y paquetes anteriores no se modificaron: sólo `qa/founder-journey-20261112-v1/` y este directorio de revisión. Sin avances concurrentes detectados, leases expected_sha, sin ramas nuevas, merge/reset/force/PR. Los dos workflows web conservan sus blobs y no disparan push/create en esta rama; no se invocó Actions API ni se afirmaron runs a partir de consultas inexistentes. Backend y Native17 permanecen intactos.

## Cambios funcionales concretos en el candidato QA

El [paquete](../../founder-journey-20261112-v1/README.md) ejecuta **los once generadores originales** en una VM con filesystem virtual y configuración ficticia `.invalid`. Aplica deltas mínimos sobre cuatro generadores; no crea una arquitectura, backend o autoridad alternativos. `compose.cjs` y las salidas generadas permiten revisar el código efectivo; el build operativo no importa este paquete.

| Fallo demostrado | Corrección QA | Evidencia ejecutada |
|---|---|---|
| Cualquier session no vacía permitía mostrar sesión verificada y empezar lecturas, sin IDs/rol válidos | verifyManagerSession exige el DTO real de backend: account_id/member_id UUID y role owner/manager/co_manager; sin default de autoridad por forma malformada | Respuestas vacías/incompletas/tipo incorrecto/IDs inválidos/operativo como manager no abren panel ni consultan listas |
| Un HTTP 503 o 429 del ingreso se convertía en “Email o contraseña incorrectos” | Error de servicio no confirmado separado; rate limit pide esperar; credenciales/estado de cuenta se presentan sin acusación falsa | Un intento, sin retry; panel cerrado y sin token persistido |
| Invitación 401 no invalidaba la vista privada como otros módulos | Denegación del bearer actual propaga el evento existente de cierre, sin resolver ni borrar marcador pendiente | Un POST ficticio, cierre de vista y no reenvío |
| Esperar JSON podía demorar indefinidamente esa invalidación | Invalidar desde headers 401 legibles antes de esperar cuerpo | JSON que nunca llega no conserva una vista autorizada; deadline mantiene revisión |
| Los errores de propiedades/estadías/solicitudes/incidencias afirmaban sesión activa sin evidencia | Mensaje de sección no confirmada, sin declarar permisos o vigencia | Se ejecutaron los cuatro renderers reales con DOM doble |

Además se amplió y repitió sólo el caso de invitación afectado: **un 401 de bearer viejo no invalida una vista nueva**, y su marcador original sigue pendiente. No se suma como sexto caso. La validación del DTO frontend es compatibilidad de respuesta, nunca verificación JWT o autoridad actual del servidor.

## Recorrido implementado, faltante y retenido

[JOURNEY-MATRIX.md](JOURNEY-MATRIX.md) / [JSON](JOURNEY-MATRIX.json) contienen **18 pasos** ligados a archivos y funciones reales, con ejecución de este lote separada de revisión de fuente. Hallazgos que impiden llamar al candidato un piloto completo:

- Propiedades y estadías web son lectura GET. **No hay formulario/contrato web de alta/configuración de propiedad o creación/gestión de estadía**. La ruta WhatsApp de pending create_stay está localizada y frenada por el hard stop prelegal; no se ejecutó, no se inventó un POST ni se simuló una creación.
- Backend web admite owner/manager/co_manager; co_manager depende de flags por propiedad. **Operational es otro modo**, ligado a persona/tarea/propiedad en Migration 12; no se renombra como manager ni se le otorga el panel.
- Invitaciones de huéspedes son owner-only y permanecen detenidas por privacidad/prelegal. Signup mantiene el guard legal false y no activa cuentas. Los once cambios históricos siguen HELD, incluido el endpoint de incidencias.
- El loader privado de huésped exige cuenta/propiedad/reserva/miembro/identidad actuales y ventana de estadía. La información no sensible de propiedad antes de check-in **todavía no está demostrada por ese recorrido**; no se relajó el límite de secretos para completar el requisito.
- El build y backend originales siguen fijados a DEV, mientras la composición privada distingue QA/DEV. `.invalid` sirve al laboratorio offline; **no acredita compatibilidad de destino/emisor**. No se reescribieron tokens/issuer ni se tocaron esos guards.

El candidato materializa **12 archivos** de la cadena original, con CSP `connect-src 'none'` al principio del head, recursos web externos retirados, formularios `inert` y aviso QA. Incluye panel, reset, activación retenida y altas administrativas. No es una preview desplegada o una sesión habilitada. LegalPublication.approved=false proviene del guard original, sin manifest de aprobación añadido. No se ingresaron datos reales ni se inició un servidor/browser.

## Auth, privacidad, huésped y A2

Se preservaron generación de sesión/BFCache, limpieza al salir, no diagnóstico de expiración/CORS ante respuesta ilegible y marcador UNKNOWN previo al despacho. Las tres regresiones anteriores de restore (ilegible/503/401) pasaron contra el Auth generado cambiado. **No hubo respuesta positiva de autorización de backend**: se usaron respuestas denegadas o deliberadamente malformadas; para invitación se modeló sólo una vista preexistente a invalidar.

En fuentes, las estadías proyectan IDs/propiedad/fechas/ventanas/estado, sin nombres/teléfonos del huésped en ese DTO. `loadConciergeGuestContext`, `conciergeGuestWindowCurrent`, `conciergeHandleAccess` y el receipt privado se identificaron como defensas de reserva/identidad/permisos/ventana; checkout es límite duro y Free tiene ruta/catálogo independiente. **No se ejecutó nuevamente el flujo de reservas consecutivas, secreto, checkout o Free**, ni se acredita su garantía nativa por leer esas funciones. Las lecturas vigentes y la revocación de sesiones/refresh siguen requiriendo evidencia real.

[A2-INVENTORY.json](A2-INVENTORY.json) fija ocho componentes e interfaces existentes: PostgreSQL/catálogo; Auth/GoTrue; Vault; Storage/objetos/políticas; claves/configuración; restricciones/floors posteriores al backup; journal/witness/COMMIT independientes; original confiable y cuarentena. Los módulos antiguos de witness/keys/restore se leyeron como fuentes, **no se importaron o ejecutaron**. Claves/canarios ficticios previos no prueban servicios administrados. No restore, SQL, firmas o generación/lectura de claves privadas; un floor de backup no se adoptó como vigente.

Sin nueva persistencia de huéspedes, payloads, frames, hashes personales o tokens en logs. Marcadores de incertidumbre conservan sólo identidad de operación/estado ya previstos; no se agregan datos para facilitar conciliación. D02-A y guard de retención permanecen; no se inventan plazos, aprobación legal o permiso de purge.

## Pruebas y evidencia

[TEST-EVIDENCE.json](TEST-EVIDENCE.json) fija comandos, nombres, conteos y hashes de logs. Node 24.22.1, launcher existente con user/net namespace fresco, entorno sin credenciales heredadas, sin loopback/rutas externas y rechazo ENETUNREACH=101. Es aislamiento de las pruebas Node, no acreditación de un host Native17.

| Clase | Resultado |
|---|---|
| Casos nuevos de experiencia | **5 PASS / 0 FAIL / 0 SKIP finales**: cuatro ejecutan scripts completos generados y uno funciones de renderer extraídas, todos con DOM/storage/transportes dobles |
| Fallos anteriores a correcciones | **5 FAIL únicos conservados**, en logs incrementales; no cinco defectos nativos ni nuevos casos por repetición |
| Regresiones previas directamente afectadas | **3 PASS**, restore ilegible/503/401; no se suman como nuevas |
| Ampliación focal de caso invitación | **1 PASS repetido**, comprobación de bearer viejo/nueva vista dentro del mismo caso, no incremento de únicos |
| Generación y verificador | Once generadores, doce salidas; 45 inputs/anchors, contratos del piloto/A2 y hashes; ocho scripts parseados sin browser, sintaxis CJS verificada |
| SQL/Auth administrado/COMMIT/journal/A2 | **NOT_RUN**, sin nueva acreditación operacional |
| Navegador/CORS | **NOT_RUN**; cuatro casos Chromium anteriores conservados, no reintentados |

No suites históricas 31/66/14/18/17, 22+2, Native17 o restauraciones repetidas. Cero pruebas HTTP/HTTPS de transporte nuevas: los fetch de los casos son funciones dobles, no conexiones locales o externas. Los comandos de logs intermedios corresponden al estado del archivo en ese momento; la cobertura final usa experience-sections-final y el caso ampliado en invite-generation-final. No se cuentan ejecuciones como casos nuevos.

## Piloto, bloqueos y siguiente acción

[PILOT-CHECKLIST.md](PILOT-CHECKLIST.md) / [JSON](PILOT-CHECKLIST.json) separan **16 condiciones** entre ejecución offline, fuentes, entorno pendiente y decisión humana. Un solo candidato retenido en RELEASE-CANDIDATE.json: CABA, un manager fundador, una propiedad, 30 días desde primera estadía real verificada, sin conversión/cobro automáticos; Free separado para otras ciudades. No hay IDs de cohorte seleccionados, reloj/trial iniciado, invitación emitida, usuario o cobro. El alcance 1/1 no se presenta como unicidad SQL ya probada.

[GO-NO-GO.md](GO-NO-GO.md) conserva todos los bloqueos legales/prelegales/Auth/privacidad/retención. Native17 **HOST_NOT_AVAILABLE confirmado**: no se investigó otra vez el runtime, descargó PostgreSQL, generó otro paquete SQL, inició infraestructura o ejecutó N01–N12. D1–D8 se conservan por referencia al cierre anterior, sin nueva evidencia positiva. Chromium tampoco se intenta.

Siguiente trabajo funcional concreto: **cerrar el contrato real de alta/configuración de la propiedad única y el de alta/gestión de estadías para el panel**, reutilizando el flujo protegido existente donde sea compatible. Preparar UI retenida sólo sobre contrato aprobado, sin inventar endpoint/recibo positivo o recopilar PII. Reconciliar también el requisito prearrival no sensible con su fuente autorizada. Auth/SQL/Native17/journal/A2/browser o decisiones humanas que falten se documentan y no se sustituyen por simulaciones.

Para recuperar una interrupción, verificar HEADs/manifiestos y seguir [NEXT-EXECUTION.md](NEXT-EXECUTION.md). PROGRESS.md es un checkpoint anterior, no el estado final. PACKAGE-MANIFEST y FILE-HASHES fijan código/salidas/evidencias; el árbol remoto acredita sus propios blobs. Publicación sólo QA web; sin DEV/PROD/main/DNS/Vercel/Supabase remoto/ASUS/Actions/cron/CI4/Native34, gastos, mensajes, firmas o servicios. Sin ZIP.

**Beta V1 continúa NO-GO. No se promete fecha ni se habilita el piloto.**
