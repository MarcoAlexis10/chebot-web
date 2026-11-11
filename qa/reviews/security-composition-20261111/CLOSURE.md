# Che Vení — composición candidata del cierre de seguridad

**11/11/2026 · QA OFFLINE · CANDIDATO RETENIDO · BETA V1 NO-GO.**

Se preparó una composición candidata que reutiliza SDK, revisión de autoridad, codec CBF1 y puertos privados existentes. Se corrigió el contrato de readback para exigir otra conexión configurada y se ejercitaron revocación, cambio de sesión, ACK perdido, conflicto y conciliación con dobles ficticios. **18 casos nuevos aprobaron.** No se ejecutaron SQL, Auth, journal firmado ni servicios reales y no se levantaron los holds.

## Estado recuperado y commits

Se leyó primero el CLOSURE de `chebot-web@0e552f4bddec3e5b7de38c1de4e03d833ffb2834`. Los HEADs actuales coincidieron con los conocidos antes de crear archivos. Se volvieron a consultar antes de la entrega.

| Componente | HEAD recuperado | Resultado de este lote |
| --- | --- | --- |
| chebot-web | `0e552f4bddec3e5b7de38c1de4e03d833ffb2834` | Candidato y evidencias QA publicados incrementalmente |
| chebot-backend | `9beb837a621f9a8f06601043afa64b3bba317cb5` | Sin modificaciones ni nueva rama |
| cheveni-qa-lab | `ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a` | Fuentes reutilizadas, sin modificaciones ni ejecución nativa |

Rama web existente: **`qa/cheveni-integral-held-20261111`**. No se creó ninguna rama.

- [`a2aa88b4847a9c7856df2ee0d9da7f63d5d3937f`](https://github.com/MarcoAlexis10/chebot-web/commit/a2aa88b4847a9c7856df2ee0d9da7f63d5d3937f): composición y puertos separados, primer lote verificable de pruebas/evidencias.
- [`dd701f3a3151728ae24ac0d727281c55992c8091`](https://github.com/MarcoAlexis10/chebot-web/commit/dd701f3a3151728ae24ac0d727281c55992c8091): emisor, ambos guards originales, evidencia final y dependencias Native17/A2.

El commit contenedor de este CLOSURE agrega la consolidación documental. Todos los commits usan `[skip ci]`, con actualización de ref condicionada al HEAD esperado. No merges, resets o force-push.

## Incompatibilidades concretas y cambio preparado

| Antes / fuente existente | Composición candidata | Límite que sigue abierto |
| --- | --- | --- |
| El puerto SQL fija un solo backend esperado para inspect/write/readback | Dos instancias del puerto original: write por una y scope/readback por otra, con PIDs y callbacks distintos y ACK propio | Es configuración comprobada con dobles; no acredita conexión física, COMMIT o aislamiento real |
| RPC histórico con once operaciones; CBF1 acepta únicamente create_stay | Se retienen las once sin mapping; envelope tipado de creación y CBF1 estricto, sin coerción o fallback | No se migraron requests/knowledge/signup/phone. El RPC histórico no admite ese create_stay y /stays raíz es de lectura |
| Backend raíz fijo a emisor DEV; SDK/codec privado fijo al QA | Se rechaza el emisor DEV en la composición privada; no se modifica un JWT ni se intenta otro destino | El corte de emisor/proyecto/configuración necesita revisión propia; no se hizo aquí |
| Objetos/argumentos podían ser confundidos entre un envelope genérico y el frame privado | Snapshot antes de awaits; usuario, sesión, expiración, member y propiedad cotejados con SDK/autoridad actuales; representaciones CBF1 exactas | La identidad del proveedor y la autoridad SQL del test son dobles, no evidencia administrada |
| ACK perdido o estado local perdido no ofrecen un resultado seguro | UNKNOWN, sin reenvío; readback explícito y reautorización actual. Sin snapshot confiable, UNKNOWN sin nueva escritura | Faltan resolver/custodia de intención original y journal/witness actuales para recuperación real |

[OPERATION-MATRIX.json](OPERATION-MATRIX.json) fija la intersección vacía de las once operaciones históricas con el único tipo del codec privado. El servicio Native17 manager_action tiene otro ABI/dominio, no se transforma mediante un simple renombrado. No se inventó un mapeo entre incident_id y stay/property/actor ni se publicaron helpers.

## Código compuesto y preservación de seguridad

El paquete [private-writer-composition-20261111-v1](../../private-writer-composition-20261111-v1/README.md) contiene dos superficies separadas:

1. **Candidato real retenido:** `createHeldPrivateStayCandidate` conserva `managerLegalAdmissionReady() === false` y el hard stop prelegal original antes de leer configuración, token o comando. No admite un override de held. Su conexión futura utiliza el gateway/mapper existentes y los nuevos puertos; no está registrada en ningún handler, router o build.
2. **Revisión OFFLINE_FIXTURE:** conecta las piezas reales con callbacks/estado ficticios y devuelve como máximo **REVIEW_MATCHED**, siempre con `operationalApproval=false`, `actualProviderVerified=false`, `actualSqlVerified=false`, `actualJournalVerified=false` y sin IDs de efecto. No devuelve CONFIRMED ni sustituye el gateway criptográfico real.

Se copiaron **16 dependencias seleccionadas** tras cotejar sus blobs con el árbol actual de qa-lab y el guard legal original del backend. El gateway recibió sólo el overlay histórico previamente sellado: SHA-256 de salida **`a318815ed08c64069347f5334e4bbfc650894b30a7027378da7099dac2ecf26e`**. Los verificadores y holds históricos no se alteraron. [UPSTREAM-PINS.json](../../private-writer-composition-20261111-v1/UPSTREAM-PINS.json) distingue fuente y salida materializada; [PACKAGE-MANIFEST.json](PACKAGE-MANIFEST.json) fija los bytes actuales.

La frontera SQL sólo expone las tres sentencias constantes originales scope_v2/write_v2/readback_v2, frames y ACKs correlacionados COMMIT/IDLE. No hay driver, URL, credenciales o conexión por defecto, SQL arbitrario, REST histórico o DML general. Los roles generales, mismo PID y mismo callback de transporte se rechazan.

**Advertencia de alcance del contrato, no permiso nuevo:** ambos PIDs del modelo usan el cliente exigido por el SQL histórico; ese principal también tiene EXECUTE sobre write_v2. El flag readOnly no demuestra READ ONLY nativo y no existe una credencial readback-only acreditada. Cambiar ese principal sin revisar el session_user/ABI no arregla el problema. No se modificaron grants o roles para hacerlo pasar.

Las reservas son locales y los ACK/datos SQL vienen de funciones ficticias; un Map simula la historia. Los intent/attempt/effect se codifican con CBF1 real, pero el contexto de restricciones del reviewer es **UNSIGNED** y no se presenta como prueba de journal. No se creó clave ni firma. GetClaims es un doble y los tokens son strings ficticios: **no se verificó una firma JWT real**. El gateway completo firmado sigue pendiente por falta de custodia/transcript compatible.

## Ejecución nueva acreditada

Node **v24.22.1**, con el launcher de aislamiento anterior: namespace de red nuevo, sin rutas externas, entorno saneado y rechazo `ENETUNREACH` antes del test. Evidencia de kernel al principio de los TAP. No se inició un servidor, motor SQL, navegador o infraestructura adicional.

```sh
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/private-writer-composition-20261111-v1/composition.test.mjs
```

**Suite nueva: 18 PASS / 0 FAIL / 0 SKIP, exit 0.** Después de retener también el guard legal original se repitió sólo el caso directamente afectado: **1/1 PASS**. Son **18 casos únicos**, no 19 ni la suma de pasadas.

La primera pasada obtuvo 16 PASS y un fallo por ruta del checkout hermano. Se corrigió y pasó focalmente; al añadir el pin de ese input se corrigió otro path del harness. Luego el cambio del proveedor compartido de claims para el caso de emisor justificó repetir esta suite nueva como 18/18. Se conservan todos los logs, incluidos fallos, en [TEST-EVIDENCE.json](TEST-EVIDENCE.json).

La cobertura del nuevo contrato incluye:

- Ambos defaults retenidos antes de leer input/configuración y composición de los módulos originales.
- PIDs separados y pin correcto por operación; rechazo de rol general, transporte compartido, ACK del writer en readback y dispatch binding alterado.
- Once operaciones históricas rechazadas sin llamar SDK/SQL; campos de actor/sesión/member/expiración o argumentos no revisados rechazados.
- Token no vencido con sesión revocada o permiso retirado; cambio de sesión durante admisión; revocación durante scope antes del write.
- Escritura ya iniciada con revocación/expiración tardía: UNKNOWN, sin publicar resultado obsoleto.
- ACK perdido sin reenvío, readback explícito desde el otro puerto y sesión nueva reautorizada sin reutilizar el binding de escritura.
- Intención repetida con argumentos distintos: CONFLICT; dos callers concurrentes locales: un solo write del doble.
- Pérdida del snapshot local tras reinicio simulado: UNKNOWN sin inferir rollback; cancelación, SDK tardío o silencioso sin avanzar a nuevas fases.
- Emisor DEV rechazado por el boundary QA, sin reescritura de token.

**No se repitieron** 31/31, 66/66, 14/14, 18/18 administrativas, las 17 integrales con 67 solicitudes HTTPS, ni las tres regresiones de feedback del último cierre. La coincidencia del número 18 con otra suite anterior no las convierte en la misma suite. No se ejecutaron las suites históricas del código materializado.

## Native17, A2 y Chromium

[NATIVE17-A2-DEPENDENCIES.md](NATIVE17-A2-DEPENDENCIES.md) reutiliza las 14 evidencias seleccionadas del cierre anterior y define las fuentes que faltan: driver/pins físicos, perfil de login/readback, Auth/revocadores bajo fence, custodia firmada, resolver de intención original y recuperación de floors. No repite auditorías o restaura componentes.

El frame contiene nombre/hash guest: su persistencia futura requiere una política de minimización, custodia/cifrado y retención D02-A. No se agregó un almacén que copie frames personales a disco o GitHub. Sin una fuente confiable de intención, el candidato no acepta un snapshot restaurado por el caller ni reconstruye argumentos desde digests.

Native17 sigue con políticas/roles/Auth sintéticos o no aprobados; los PIDs y serverVersion=170011 de los tests son datos del doble. No se ejecutó PostgreSQL/PGlite, migración, restore o Auth remoto. A2 integral sigue pendiente para el release exacto, Auth/Vault/Storage/config/claves y journal/witness/floors actuales. No se genera aceptación, firma o evidencia de custodia para suplir esa dependencia.

**Chromium no se intentó de nuevo.** AF_UNIX/EPERM permanece como dependencia de otro laboratorio seguro compatible. Se conservan las cuatro pruebas pendientes, sin nuevos PASS o SKIP de navegador.

## Manifiesto, límites y siguiente paso

[RELEASE-CANDIDATE.json](RELEASE-CANDIDATE.json) fija el código QA en **`dd701f3a3151728ae24ac0d727281c55992c8091`**, backend **`9beb837a621f9a8f06601043afa64b3bba317cb5`** y Native17 **`ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a`**. La matriz [GO-NO-GO.md](GO-NO-GO.md) mantiene la separación entre contrato offline comprobado y garantías operativas faltantes.

Se cotejaron por versión **14 fuentes de producto web y 37 del cierre backend**, sin cambios respecto del cierre anterior; es comprobación de integridad, no otra ejecución de esas suites. No se cambiaron configuración de build, rutas, target, variables, guards, retención o servicios. Evidencia en [PRODUCT-SOURCE-COMPATIBILITY.json](PRODUCT-SOURCE-COMPATIBILITY.json).

No se crearon ramas ni se modificaron workflows; se continuó sobre la rama QA existente y sus filtros de push conservados. No se invocaron herramientas/dispatch de Actions o cron. Sin DEV/producción/main/DNS/Vercel/Supabase remoto/ASUS, despliegues, gasto iniciado, SQL remoto/nativo, datos personales, credenciales reales, mensajes, correos, altas, cobros o comprobantes firmados.

**Siguiente paso concreto:** revisar la integración por dominio de las once mutaciones pendientes y cerrar el perfil/ABI readback-only y el driver privado real sin fallback. Las comprobaciones físicas Native17/Auth/A2 necesitan artefacto/host/roles y autorización separada; el positivo criptográfico necesita evidencia compatible preexistente, no firmas fabricadas. No repetir pruebas ya acreditadas sin un cambio que las afecte.

El piloto se conserva en **CABA, un manager fundador, una propiedad y 30 días gratuitos sin cobro automático**, con Free separado. **Beta V1 continúa NO-GO.** Integridad de esta entrega: [FILE-HASHES.json](FILE-HASHES.json).
