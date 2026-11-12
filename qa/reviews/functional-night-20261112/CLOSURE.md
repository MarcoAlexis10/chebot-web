# Che Vení Concierge — operación nocturna funcional QA

**12 de noviembre de 2026 · Beta V1 NO-GO.** Se publicaron cuatro checkpoints de implementación/evidencia y este cierre. Resultado: **19 casos nuevos únicos PASS + 3 regresiones previas afectadas PASS**, cero FAIL finales, cero SKIP dentro de esos casos. Son Node, modelos sintéticos y VM/DOM mínimo; no navegador, HTTP real, SQL, Auth administrado, COMMIT o integración operacional.

## HEADs y recuperación

| Repositorio / rama | HEAD inicial verificado antes de escribir | HEAD al consolidar |
|---|---|---|
| chebot-web / qa/cheveni-integral-held-20261111 | dd1b41fe8cbea9dda6da24d50b95c23916cb6475 | **6d67eaf1335d8aa04bfa70497f51493f04f5004c** contiene código/evidencia; el commit de cierre final es el de la URL inmutable de este archivo |
| chebot-backend / qa/cheveni-integral-held-20261111 | 9beb837a621f9a8f06601043afa64b3bba317cb5 | **9beb837a621f9a8f06601043afa64b3bba317cb5**, sólo lectura, ref revalidado |
| cheveni-qa-lab / qa/cheveni-native17-policy-closure-20261106 | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a | **ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a**, sólo lectura, ref revalidado |

El SHA del cierre se resuelve de la URL final y se verifica después de publicar; no se introduce una autorreferencia hash dentro del propio commit. SOURCE-PINS.json fija **105 fuentes** por SHA-256/blob contra árboles GitHub completos; incluye ambos candidatos previos y dependencias transitivas reutilizadas. PACKAGE-MANIFEST.json fija cada archivo del lote salvo sí mismo. La integridad de bytes no acredita ejecución funcional de esas fuentes.

Todos los cambios de este lote están en `qa/functional-night-20261112-v1/` y `qa/reviews/functional-night-20261112/`. Los blobs previos se preservan. Backend y qa-lab no recibieron commits. No se tocó código operativo ni el build real.

## Checkpoints publicados

| Commit `[skip ci]` | Avance recuperable |
|---|---|
| [dace64bddb475dfff50ac0f5f6e48193046163f8](https://github.com/MarcoAlexis10/chebot-web/commit/dace64bddb475dfff50ac0f5f6e48193046163f8) | Lifecycle de propiedad/estadía, tipos y seis pruebas; compatibilidad de inventario de seis estados SQL; checkpoint inicial |
| [7d0adf950ff69c194a7a9e62ae1a8f1efac3ec31](https://github.com/MarcoAlexis10/chebot-web/commit/7d0adf950ff69c194a7a9e62ae1a8f1efac3ec31) | Proyección pública y roles; 403 y limpieza de etiquetas corregidos en Auth generado; siete casos nuevos adicionales y tres regresiones |
| [90cd364083650aadb3cfacdac4165207a2af4a18](https://github.com/MarcoAlexis10/chebot-web/commit/90cd364083650aadb3cfacdac4165207a2af4a18) | Vistas por sesión/propiedad/revisión, reloj y UNKNOWN; work-items con frontera de incidencias existente; 18 outputs inertes; Unicode y sesión/revisión de comandos |
| [6d67eaf1335d8aa04bfa70497f51493f04f5004c](https://github.com/MarcoAlexis10/chebot-web/commit/6d67eaf1335d8aa04bfa70497f51493f04f5004c) | Verificación explícita del roundtrip UTF8, matriz de permisos, contratos, manifiesto de 20 componentes, checklist y evidencia consolidada |

Antes de cada publicación se verificaron HEAD, blobs/fuentes y los dos workflows web: no incluyen push a esta rama ni create. Ref actualizado con expected_sha; sin force/reset/merge ni rama backend nueva. No se activaron Actions, cron o despliegues.

## Código útil implementado e incompatibilidades resueltas

**Propiedad:** property-lifecycle.mjs define siete operaciones distintas: draft.create, read, configure, submit, decision, pause y archive. Valida configuración mínima, relaciones cuenta/propiedad/building, estado, revisión, binding de sesión, autoridad/restricciones y cupo del vector. El payload no elige cuenta/rol/status/activatedAt. lifecycle-abi.d.mts especifica formas versionadas y campos de evidencia externa necesarios; es una declaración revisada estáticamente, sin compilación TypeScript. La decisión/owner/reviewRef/cupo del modelo no representan aprobación o autoridad reales. No se reutiliza DML general o create_stay como alta de propiedad.

Se demostró otra incompatibilidad del validador anterior: admitía un surrogate Unicode aislado en campos de propiedad. El sucesor lo rechaza, sin normalización con pérdida, y conserva emoji válido. El test ejecuta el roundtrip UTF8 de Node; no afirma observación de PostgreSQL.

**Estadía:** stay-lifecycle.mjs distingue draft sin huésped, asociación por referencia protegida, confirmación, cambio de fechas, cancelación, checkout e historial. La tabla original admite draft sin miembro huésped obligatorio; no existe una primitiva privada compatible inspeccionada para efectuar el nuevo flujo. Pending/CBF1 conservan sus argumentos de huésped; no se rellenan con identidad ficticia ni se convierte operation_id de WhatsApp en intentId web.

El comparador anterior rechazaba draft/revoked en el inventario, aunque son estados SQL válidos. El sucesor acepta los seis estados y sólo considera scheduled/active en cruces [inicio,fin). Editar excluye el propio registro únicamente con snapshot/revisión exactos; inventario incompleto, contradictorio o de otra propiedad se cierra. Fechas bisiestas, cambio de mes/año, UTC/CABA, adyacencia/superposición, revisión/sesión cambiadas e inicio/checkout se probaron con reloj ficticio. Nada acredita EXCLUDE/CAS o ausencia de carreras entre procesos.

**Pre-arrival:** public-projection.mjs agrega referencias y revisiones independientes de contenido/aprobación/retirada a la separación anterior. No acepta el content libre del knowledge privado, HTML, URL o campos privados. arrival/approved/normal del esquema histórico no significan contenido público seguro. Sólo permite la plantilla pública global ya existente; productor y aprobación por propiedad siguen ausentes. Loader privado intacto; durante la ventana privada o después del checkout no se habilita contenido de reserva. Free es explícito e independiente.

**Roles y vistas:** permissions.mjs modela las siete acciones reales del manager; co_manager necesita flag/asignación por propiedad. Operativo temporal permanece persona+tarea+propiedad+ventana, sin promoción a manager; aún faltan política de access point, autorización explícita y fuente real. Huésped sigue vinculado a su reserva. Todos los resultados mantienen accessAllowed=false.

view-lease.mjs reutiliza el patrón de generación de UI: descarta respuestas tras cambio de sesión/propiedad/estadía/revisión, solicitud más nueva, logout, expiración/checkout durante awaits o retroceso de reloj. Se conserva el fallo intermedio del reloj y su fuente previa. Tickets y UNKNOWN son memoria efímera; no admisión durable, evidencia de original o idempotencia SQL. privateViewAllowed=false siempre.

**Recorrido y trabajo pendiente:** work-items.mjs proyecta sólo estados y relaciones mínimas de solicitudes/incidencias, sin summary/PII. Learning es propuesta, nunca activación automática. createFunctionalHeldCandidate reutiliza createHeldIncidentAuthorityCandidate y la frontera UNKNOWN anterior; no rehace CurrentResolution/gateway/writer/readback ni habilita mutaciones históricas.

compose.cjs corrige dos fallos del Auth original generado: 403 informa rechazo de permisos sin afirmar revocación/expiración; limpiar panel retira también etiquetas de sesión/cuenta antes de await. Logout remoto puede quedar sin confirmar. Las respuestas tardías no reabren el panel y los marcadores de invitación incierta se conservan.

materialize.mjs extiende el mismo candidato anterior: 18 archivos QA, índice de recorrido y tablas de contratos, nueve assets anteriores idénticos y sólo Auth JS cambiado. Todos los enlaces/anchors locales resuelven; favicon ausente eliminado y enlaces a documentos legales no generados pasan a publicación retenida. Formularios vacíos, inert/disabled, CSP connect-src/form-action none. Sin servidor o navegador.

## Evidencia realmente ejecutada

| Casos únicos | Resultado final | Clasificación y cobertura |
|---|---|---|
| Propiedad, 4 | PASS | Estados, autoridad/revisión/cuenta/building/cupo adversariales, puertos cerrados y Unicode; property-unicode-final y roundtrip-final |
| Estadía, 3 | PASS | Inventario/edición, calendario/ventanas/revisiones, operaciones distintas; shared-permission-schema-final |
| Pre-arrival/permisos, 4 | PASS | Proyección sin datos privados, versiones/retirada, siete acciones y tarea/huésped separados; shared-permission-schema-final |
| Auth generado, 3 | PASS | 403, logout sin confirmar y respuesta tardía; script completo en VM/DOM mínimo, auth-first |
| Vistas/work-items, 4 | PASS | Scope/revisiones/checkout, UNKNOWN/reinicio sin original, ámbitos/learning y reloj; shared-permission-schema-final |
| Composición, 1 | PASS | HTML/enlaces/anchors, JS generado, inercia y reutilización; composition-first |
| Regresiones previas, 3 adicionales al total único nuevo | PASS | Restauración red ilegible/503/401; mismas aserciones anteriores, import dirigido al Auth generado modificado |

**19 nuevos + 3 regresiones.** No se suman las pasadas repetidas: TEST-EVIDENCE.json deduplica por nombre y contiene argv, logs, SHA-256 y justificación de cada repetición focalizada. Cinco FAIL intermedios conservados: inventario anterior (1), UX Auth anterior (2), reloj del modelo QA (1) y Unicode del validador anterior (1). Ninguno queda fallando en su cobertura final.

Node v24.22.1, launcher existente con namespace nuevo de usuario/red, entorno sin credenciales heredadas y egress rechazado ENETUNREACH=101. Esto no acredita el aislamiento completo de un host Native17. Sintaxis de 17 módulos/archivos y hashes de fuentes/outputs verificados estáticamente. Fuentes SQL se leyeron; ninguna sentencia SQL se ejecutó.

Las ocho pruebas del cierre anterior y las cinco del fundador no se repitieron. Sólo las tres regresiones anteriores directamente afectadas por Auth se ejecutaron de nuevo; suites históricas 31/66/14/18/17 y Native17, sin repetir. Cuatro casos de navegador previos: preparados, NOT_RUN. N01–N12: NOT_AUTHORIZED/NOT_RUN. HTTP/HTTPS real o local nuevo: cero; Auth administrado, SQL, COMMIT, firmas y restores: cero. No es end-to-end operativo.

## Qué sigue HELD y qué permite avanzar

La preparación reduce incompatibilidades de forma/estado/fechas/serialización, fija revisiones y sesiones en comandos, protege proyecciones y respuestas de UI, y permite revisar una primitiva futura con interfaces y pruebas concretas. Los contextos/counters/IDs de las fixtures no sustituyen productores protegidos. Los puertos siguen sin escritor, fuente de aprobación o recibo positivo; UNKNOWN no se transforma en DENIED/SUCCESS para permitir reenvío.

Faltan los ABI y productores privados reales de propiedad, estadía sin huésped y catálogo público aprobado; identidad/proveedor y autoridad/restricciones vigentes; cardinalidad/cupo/jurisdicción/building transaccionales; original confiable/custodia D02-A; writer mínimo, COMMIT externo, reader sin escritura, journal/witness independientes. Las once mutaciones históricas continúan HELD. No fallback REST, helper SQL público, DML amplio, snapshot cliente o nuevo protocolo firmado.

Native17 sigue HOST_NOT_AVAILABLE, sin reinspección, descarga, SQL o infraestructura. D1 revisiones; D2 restricciones/floors; D3 proveedor/binding; D4 original/custodia; D5 RLS; D6 providerRef; D7 revocadores/fence; D8 COMMIT/readback/journal, pendientes. Chromium no se reintentó.

RELEASE-CANDIDATE.json consolida 20 componentes: frontend/backend, property/stay/pre-arrival, roles/invitaciones/Auth, writer/reader, journal/witness, PostgreSQL, GoTrue, Vault, Storage, configuración/claves, restricciones/floors y privacidad/legal. A2 permanece sin ejecutar: incluye componentes externos y floors/revocaciones posteriores al backup; tablas restauradas no bastan ni autorizan salir de cuarentena. No nueva persistencia privada o plazo legal inventado.

Piloto: sólo CABA, un fundador, una propiedad, 30 días desde primera estadía real verificada, sin cobro/conversión automática; Free separado y sin fecha prometida. Sin trial, identidades, comunicaciones, altas o cobros reales. Requiere evidencias técnicas/legales/operativas y autorización comercial expresa.

## Próximo paso concreto

Usar PROPERTY-LIFECYCLE.md, STAY-LIFECYCLE.md y lifecycle-abi.d.mts para acordar una primitiva protegida compatible con current authority/cupo/revisión y efectos/recibos, sin adaptar operaciones al CBF1 equivocado. Avanzar el productor de catálogo público mínimo conservando la plantilla global hasta acreditarlo. Validación nativa/Auth/browser/A2 exige condiciones y autorización adicionales; este lote no las concede.

Recuperación: leer NEXT-EXECUTION.md, CHECKPOINT.md y TEST-EVIDENCE.json; verificar HEADs/manifiestos y preservar cambios concurrentes. El commit final enlazado contiene código, outputs, logs y contratos, sin ZIP. Nada está conectado a producción, DEV, Supabase remoto, DNS, Vercel, ASUS, Actions o cron. **Beta V1 permanece NO-GO.**
