# Che Vení Concierge — integración de contratos funcionales

**12/11/2026 · exclusivamente QA/offline · Beta V1 NO-GO.** Se encontró una primitiva privada real en las fuentes QA para crear un borrador de propiedad y se preparó su adaptación restringida, reutilizando el parser original. No se instaló ni ejecutó SQL, no se habilitó un writer y no se acreditó integración operacional.

Resultado del lote: **20 casos nuevos únicos PASS, 0 FAIL finales, 0 SKIP**. Las 19 pruebas y tres regresiones anteriores no se repitieron. Hay cuatro checkpoints publicados de código/evidencia y este cierre con manifiesto final.

## HEADs y commits

| Repositorio / rama | HEAD inicial verificado antes de escribir | Estado final |
|---|---|---|
| chebot-web / qa/cheveni-integral-held-20261111 | 5856a2ffdc8efac4683b390a45888aa9cbce891d | Código y evidencia en **4bbbf99634d1996f7658ab84c272ac00309d90c1**; cierre final en el commit de la URL inmutable de este archivo |
| chebot-backend / qa/cheveni-integral-held-20261111 | 9beb837a621f9a8f06601043afa64b3bba317cb5 | **9beb837a621f9a8f06601043afa64b3bba317cb5**, sólo lectura, ref revalidado |
| cheveni-qa-lab / qa/cheveni-native17-policy-closure-20261106 | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a | **ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a**, sólo lectura, ref revalidado |

El commit de cierre se verifica después de publicar y se identifica por la URL entregada; no se incluye una autorreferencia hash imposible dentro del propio commit. SOURCE-PINS.json fija **147 archivos locales contra sus blobs remotos y cuatro blobs Native**, 151 fuentes en total. GENERATED-MANIFEST.json fija 18 outputs; PACKAGE-MANIFEST.json incluye todos los archivos del lote salvo sí mismo.

| Checkpoint `[skip ci]` | Trabajo publicado |
|---|---|
| [0f9f8673ad2433264e9ec266a19632ddfeb007c3](https://github.com/MarcoAlexis10/chebot-web/commit/0f9f8673ad2433264e9ec266a19632ddfeb007c3) | ABI de binding de fuentes/argumentos/recibos, interfaces y cuatro casos nuevos |
| [62d7c958af60a37e4a91cd8cbb7c94be5f7ccbdd](https://github.com/MarcoAlexis10/chebot-web/commit/62d7c958af60a37e4a91cd8cbb7c94be5f7ccbdd) | Efectos/revocaciones, límite Native checkout/suspend y productor candidato de catálogo; siete casos adicionales |
| [18b14d8970aa7ff0ffc09feba1b812b6be6c525f](https://github.com/MarcoAlexis10/chebot-web/commit/18b14d8970aa7ff0ffc09feba1b812b6be6c525f) | DTO de lecturas reales, timestamps sin pérdida y revalidación de generación/revisiones |
| [4bbbf99634d1996f7658ab84c272ac00309d90c1](https://github.com/MarcoAlexis10/chebot-web/commit/4bbbf99634d1996f7658ab84c272ac00309d90c1) | Captura privada encontrada y adaptada en subconjunto exacto, revisión Native17 reutilizada, composición inerte y evidencia consolidada |

Antes de publicar: HEAD/blobs/workflows verificados, actualizaciones con expected_sha; sin force/reset/merge o ramas backend. Los workflows web no tienen push a esta rama ni create. Sólo se añadieron los prefijos qa/functional-contracts-20261112-v1/ y qa/reviews/functional-contracts-20261112/; todos los blobs anteriores se conservan. Sin despliegue o activación de Actions.

## 1. Propiedad: primitiva encontrada y compatibilidad cerrada de argumentos

La búsqueda de entries de servicio no bastaba: el helper privado **write_property_capture_v1** existe en `writer-integration/private-mutations-UNAPPLIED.sql` de QA-lab (blob f41c40d0b490b8cd57dddc13fe50c799f717331c). Su parser está en `fencing/property-review.mjs` (blob 06deafb507d84c57687c71ccfb7f7feb5472b319).

En fuente, crea propiedad draft y slot, exige owner/autoridad property_create, fence y principal privados, comprueba intención repetida y conserva address/floor. No se acredita instalación, participación de todos los writers, unicidad SQL o COMMIT. La literal Buenos Aires y el slot CABA tampoco prueban jurisdicción real.

**property-capture-adapter.mjs ejecuta sólo el parser original** en VM y compara cada campo del nuevo comando. Requiere entrada estructurada street/number/floor/unit; no divide una dirección libre ni inventa relaciones. Subconjunto exacto: nombre `Primera propiedad`, building null, tipo apartment, idioma es y horarios 15:00/10:00 según defaults de esquema revisado, con dirección/unidad formadas por el parser. Cambios de nombre/tipo/idioma/horario/unidad/building se rechazan sin perderlos. Defaults de catálogo instalado todavía requieren prueba.

No se usa el adaptador histórico createPrivatePropertyReview, que promueve un ACK COMMITTED a DURABLE_EFFECT. El nuevo write default permanece HELD y read default UNKNOWN. El reader histórico exige el principal del writer: no acredita credenciales de sólo lectura. La tabla de captura duplica address/floor; finalidad/custodia/retención operativas no están acreditadas y no se usa con datos reales.

Esto corrige la conclusión provisional de ausencia de toda primitiva: **hay captura privada parcial reutilizable; no hay lifecycle completo compatible acreditado**. Configurar/revisar/decidir/pausar/archivar, versiones/auditoría/recibos/original y privilegios siguen retenidos. Ver [PROPERTY-CAPTURE-COMPATIBILITY.md](PROPERTY-CAPTURE-COMPATIBILITY.md).

## 2. ABI, estadías, efectos y recibos

**evidence-binding.mjs / evidence-abi.d.mts** vinculan comandos existentes a proveedor/miembro único, cuenta/sesión/rol, restricciones/floor, dataset/epoch/inventario, cupo/jurisdicción/building/decisión y generación de huésped. Son observaciones sintéticas explícitas; no productor de autoridad ni JWT verificado. El protected default ignora argumentos/callbacks y nunca despacha.

Se corrigieron dos incompatibilidades del candidato nuevo: revalidación que omitía generación del huésped/revisión de building/revisor, y datasetId tratado como UUID. Ahora se reutiliza el **reviewRevisionCut original** con dataset/inventory/restriction digests de 64 hex, journal y procedencias bootstrap/commit. La comparación de forma no acredita pisos actuales, independencia física o productor SQL.

Los snapshots del review son ficticios y efímeros en WeakMap, no originales confiables o admisión NEW/KNOWN durable. No se devuelven argumentos privados; release retira referencias, sin promesa de borrado físico JS. Comparar objetos tipados sin depender del orden de claves no crea un digest SQL o protocolo firmado. inspectReceipt siempre conserva **UNKNOWN**, aun con correlación de campos o referencias llamadas COMMIT/readback/journal/witness.

**effect-plan.mjs** separa borrador sin huésped, asociación, confirmación, fechas, cancelación, checkout e historia. Se demostró que el revisor anterior no marcaba revocación al cambiar fechas; el sucesor exige CAS/exclusión, invalidar bindings previos, conciliar invitaciones y publicar floor. No se crea huésped ficticio para CBF1 ni se envían invitaciones automáticamente.

Native17 `manager_action` contempla checkout, con revocación de acceso de propiedad y conservación autorizada de bindings sólo de caso postcheckout. Su ABI/recibo no representa todas las revisiones esperadas, original/attempt y COMMIT/readback independientes: la proyección mantiene **dispatchPlan=null**. p_request es intención estable; p_exp son segundos del proveedor, no expiresAtMs de observación. **suspend pausa launch_control, no concierge_properties**: no se mapea a property.pause. No fallback REST o DML general. Ver [ABI-SUCCESSOR.md](ABI-SUCCESSOR.md) y EFFECTS-REVOCATIONS.json.

## 3. Pre-arrival y lecturas reales

**public-catalog-producer.mjs** construye una proyección mínima desde fuente, revisión de plantilla y retirada independientes y la pasa al consumidor existente. Vincula IDs/versión/revisiones/expectativas y vigencia mínima. No admite content libre, URL/HTML, dirección, Wi-Fi, códigos, nombre/teléfono o aprobación del cliente. Sólo devuelve la plantilla global pública. Estado de review no equivale a aprobación; protectedProducerPresent/sourceApprovalAccredited=false. Loader privado intacto y Free explícito independiente. Ver [CATALOG-PRODUCER.md](CATALOG-PRODUCER.md).

**read-selection.mjs** reutiliza parseManagerPropertyReceipt de producto y las formas exactas GET properties/stays. Estos DTO no contienen revisión privada, cupo, session_id/emisor o referencia de huésped; no se inventan desde updated_at o primera fila. Selección y scope exactos, contra suplemento de revisión todavía no acreditado. Dos propiedades distintas frente al piloto único cierran la revisión; el listado no se convierte en contador protegido.

Timestamps con offset/fracciones exactamente representables pasan a UTC canónico; microsegundos no representables y fechas imposibles se rechazan. Node demuestra que Date.parse trunca .001234 a .001; el adaptador evita esa pérdida. Es una prueba de representación con fixtures, no una respuesta observada de PostgreSQL. Ver [DTO-COMPATIBILITY.md](DTO-COMPATIBILITY.md).

## 4. Recorrido integrado QA y pruebas ejecutadas

candidate.mjs reutiliza las fronteras existentes de incidencias/solicitudes/conciliación y agrega productores protegidos ausentes y captura cerrada. Propiedad → estadía → catálogo/huésped → incidencias → checkout sigue HELD; ningún recibo del cliente abre el recorrido o permite reenvío. No se rehace el gateway de incidencias ni se habilitan las once mutaciones históricas.

materialize.mjs extiende el mismo candidato fundador: **18 outputs, diez assets JS/CSS anteriores idénticos**, formularios vacíos/inertes y CSP connect-src/form-action none. Sólo agrega compatibilidad/efectos y alcance de captura al HTML; enlaces/anchors locales verificados. No browser, Auth o backend funcional real.

| Casos únicos nuevos | PASS | Evidencia final / clasificación |
|---|---:|---|
| Binding y revisiones | 6 | binding-native-format-final: Node, comparador original reutilizado y vectores sintéticos |
| Efectos/Native ABI | 4 | mismo log; incluye un caso sólo de assertions sobre fuente SQL, no motor |
| Selección DTO/timestamps | 3 | mismo log; helper puro real de producto con DTO ficticio, no GET/Auth |
| Productor catálogo | 3 | catalog-first: Node, proyección mínima al consumidor anterior |
| Captura privada | 3 | capture-integration-final: parser original VM, contratos y fuente; no writer |
| Composición del recorrido | 1 | mismo log; puertos cerrados y HTML/JS/anchors, no navegador |
| **Total único** | **20** | **0 FAIL finales / 0 SKIP** |

Cuatro FAIL intermedios conservados: revocación de fechas anterior; generación/building/revisor omitidos en nuevo binding; contradicción de dos propiedades en nuevo selector; formato Native de dataset incompatible en nuevo ABI. Cada caso queda cubierto por PASS posterior. Repeticiones propias por cambios concretos se justifican en TEST-EVIDENCE.json y no aumentan el total.

Node v24.22.1, launcher existente con namespace de usuario/red nuevo, sin credenciales heredadas y egress ENETUNREACH=101. No acredita un host Native17 completo. Sintaxis de 14 archivos, fuentes, parser original y outputs verificados estáticamente; declaraciones d.mts sin compilador TypeScript ejecutado.

No se repitieron las 19 pruebas/tres regresiones previas ni suites históricas. Auth administrado/JWT real, HTTP/HTTPS, SQL, COMMIT, browser/Chromium, firmas y restores: **cero**. Cuatro casos de navegador previos preparados NOT_RUN; N01–N12 NOT_AUTHORIZED/NOT_RUN. No end-to-end operacional.

## 5. Bloqueos y próximo paso

[EXTERNAL-BLOCKERS.md](EXTERNAL-BLOCKERS.md) resume Native17, Auth, D02-A, legal/prelegal, journal/witness, A2 y navegador. HOST_NOT_AVAILABLE no se reinvestigó; no infraestructura, descargas PG, SQL o reintentos Chromium. Todos los guards se conservan. Sin persistencia privada nueva, datos reales, claves, comunicaciones, altas, trial o cobros.

RELEASE-CANDIDATE.json conserva inventario A2 PostgreSQL/Auth-GoTrue/Vault/Storage/claves/configuración/revocaciones/journal/witness/floors posteriores al backup, sin restore o recuperación acreditados. Cuarentena no se levanta por tablas recuperadas.

**Siguiente acción concreta:** reutilizar la captura privada encontrada bajo su subconjunto exacto, acreditando autoridad property_create/cupo/jurisdicción y preparando sólo el delta faltante de auditoría/revisiones/original/reader sin escritura y COMMIT. Si se necesita configuración distinta, requiere ABI específico; no perderla para encajar. Resolver custodia/retención de la tabla de captura antes de cualquier dato real. No aprobar un GO genérico ni conectar el helper no aplicado a servicios.

Recuperar desde la URL inmutable final y [NEXT-EXECUTION.md](NEXT-EXECUTION.md); verificar refs/manifiestos y conservar avances concurrentes. CABA, un fundador, una propiedad, 30 días desde primera estadía real verificada, sin cobro/conversión automática, Free separado y sin fecha prometida. Se requiere autorización comercial expresa después de las evidencias necesarias. **Beta V1 permanece NO-GO.**
