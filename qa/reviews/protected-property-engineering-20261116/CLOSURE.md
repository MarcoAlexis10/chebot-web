# Che Vení · ingeniería de primera propiedad · 16/11/2026

**Beta V1 NO-GO.** Se prepararon candidatos concretos de bootstrap, admisión y reader privados,
sin instalar fuentes, ejecutar SQL, habilitar usuarios o producir autoridad real.
El entorno local de ejecución estuvo unavailable: **Node y PostgreSQL no se ejecutaron**.

## HEADs y checkpoints recuperables

| Repositorio / rama QA | Inicial | Final del código |
|---|---|---|
| chebot-web · qa/cheveni-integral-held-20261111 | affb445ddb478b49ceef7c80c6d2a26f907de443 | 9eacd437d7d8534b09dc223bc8a1f4327143d0f3 |
| chebot-backend · qa/cheveni-integral-held-20261111 | 9beb837a621f9a8f06601043afa64b3bba317cb5 | sin cambios |
| cheveni-qa-lab · qa/cheveni-native17-policy-closure-20261106 | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a | sin cambios |

El HEAD documental final es el commit que contiene este archivo en el enlace inmutable de entrega;
se distingue del código para no introducir una referencia circular al propio hash.

- [f97ed1eca243a5f8e8adbf4f7dee62ea4f07a660](https://github.com/MarcoAlexis10/chebot-web/commit/f97ed1eca243a5f8e8adbf4f7dee62ea4f07a660): SQL retenido de bootstrap/admisión/read2/roles, fuentes y comprobador textual.
- [9eacd437d7d8534b09dc223bc8a1f4327143d0f3](https://github.com/MarcoAlexis10/chebot-web/commit/9eacd437d7d8534b09dc223bc8a1f4327143d0f3): validación estricta de cut, orden de autorización del original y delta nativo por IDs existentes.

Ref, blobs y ambos workflows web verificados antes de publicar; los filtros push no incluyen esta
rama. [skip ci], expected_sha, sin force, merge, PR o ramas nuevas. Todos los blobs existentes al
inicio permanecen iguales. Backend/lab sólo lectura. No se activaron Actions ni servicios.

## A. Código nuevo útil, exclusivamente de revisión

[Paquete y condiciones](../../protected-property-engineering-20261116-v1/README.md).
Los cuatro SQL son **REVIEW_ONLY_NOT_EXECUTED**, con aborto antes del DDL, ROLLBACK y guards
incondicionales dentro de cada función. No son instaladores ni SQL compilado/acreditado.

| Archivo | Implementación preparada | Qué falta para poder utilizarla |
|---|---|---|
| 01-bootstrap-DO-NOT-APPLY.sql | Asignación global singleton del fundador, CABA ligada al original; joins exactos de identidad/owner/member/account; inventario completo, target NULL, trial NULL y fence histórico antes de locks. Validador explícito de cut/issuer/vigencia/revisiones/bytea. | Asignación/elegibilidad y jurisdicción confiables sin sembrar una fila; proveedor, revisiones/floors y catálogo/RLS completos. Cuenta active; no promoción automática de testing/onboarding. |
| 02-admission-DO-NOT-APPLY.sql | Ledger de referencias/versiones, fases de despacho y binding por backend PID/full transaction ID. Composición con write_property_capture_v1 y sus once argumentos originales. KNOWN nunca vuelve a escribir; conflicto de original/key/argumentos separado de UNKNOWN. | Original/custodio exactos, historia independiente de ausencia de despacho, políticas específicas D02-A y fuentes/ACL instaladas bajo autorización nativa. |
| 03-read2-DO-NOT-APPLY.sql | El mismo property-capture-independent-read/2 de 26 parámetros. Cuenta derivada del original; original→ledger→resultado→slot→propiedad; sesión/floors antes y después. Metadata sin payload. | Productores y comparadores protegidos, reader físico independiente, catálogo real y evidencia externa de COMMIT/journal/witness. |
| 04-role-rls-DO-NOT-APPLY.sql | Owners NOLOGIN separados, grants por columna y propuestas RLS. Reader sin DML, payload, ownership de tablas o membresía writer. | Clausura completa USAGE/tipos/EXECUTE/default ACL/memberships y RLS real capturados; no EXECUTE de aplicación emitido aquí. |

### Incompatibilidades tratadas en el candidato

El writer histórico exige session_user cheveni_private_mutation_backend_v1 y current_user
cheveni_private_mutation_owner_v1. Un login nuevo con otro nombre sería incompatible.
Se propone conservar ese login exclusivamente detrás de un wrapper de propiedad y usar un owner
intermedio; el writer histórico permanece sin cambios. **No SET ROLE ni alias de credencial**.
La autorización de revisión sólo devuelve filas property_create dentro del contexto protegido de
esa transacción; otras operaciones permanecen cerradas. El productor original WHERE false no se
modificó en sus fuentes existentes ni se instaló su sucesor.

Request, intent, attempt, originalRef y key no se pierden al proyectar a los once argumentos.
El ledger no contiene dirección/unidad. La rama KNOWN conserva la historia y compara el original
protegido, más la dirección/unidad históricas cuando existen. Igual key no equivale a igual
argumento. Si falta historia confiable tras reinicio/restore, no se transforma la ausencia local
en NEW; hace falta una prueba independiente de no-despacho. No hay endpoint de resume/reintento.

El original se obtiene **después** del permiso específico: creación para NEW, lectura actual para
KNOWN y reader. El composite SQL no es una capacidad ni un comprobante; el custodio debe
recargar/corroborar el binding protegido antes de devolver payload o metadata.
La validación de forma/issuer/fecha no verifica JWT ni crea autoridad.

El reader conserva los 26 parámetros y no añade un account elegido por cliente. Historia y permiso
actual permanecen distintos: una sesión nueva necesita su cut actual y no reescribe la sesión del
original. La observación SQL devuelve UNKNOWN, privateResult NULL y, como máximo, una observación
provisional del efecto; no revela propertyId/dirección ni declara COMMIT o SUCCESS.

[PORTS-AND-ROLES.json](../../protected-property-engineering-20261116-v1/PORTS-AND-ROLES.json)
detalla diez puertos todavía ausentes, sus owners/procedencia y ACL transitivas. También fija la
incompatibilidad de Auth existente: su composición por defecto es DEV, sus WeakMaps no se pueden
serializar como un DTO y su writer RPC histórico no es el puerto de captura privada.
No se reescribieron tokens ni se añadió fallback REST, otro gateway, firmas o frames CBF1.

## B. Evidencia efectivamente obtenida

[TEST-EVIDENCE.json](TEST-EVIDENCE.json) y logs JSON de evidence separan ejecución de propuesta.

- Fuentes recuperadas por GitHub y 14 blobs originales fijados/comprobados en SOURCE-PINS.
  Los nuevos blobs publicados se recuperaron y compararon con sus textos preparados.
- artifact-review.cjs se ejecutó como JavaScript puro en **V8 de la herramienta de orquestación**:
  cotejo textual de firma/orden de once argumentos, ABI read/2 de 26, guards, fases y perfil lector.
  Resultado de coherencia textual PASS. **No es Node, parser PostgreSQL ni prueba funcional SQL.**
- Mutaciones textuales negativas rechazadas: parámetro de cuenta añadido al reader, aborto exterior
  retirado, permiso de escritura al perfil lector y dirección/unidad intercambiadas en el writer.
  Son controles del comprobador, no cuatro garantías operativas.
- Fallo intermedio del nuevo comprobador por regex sobre-escapadas: corregido y conservado en
  evidence/artifact-review-intermediate.json. La revisión manual detectó acceso al original antes
  del permiso específico; orden corregido, con registro en authorization-order-review.json.
  Ninguno fue un fallo observado de PostgreSQL.
- **0 ejecuciones Node, SQL, Native17, Auth administrado, navegador, HTTP, COMMIT/witness o restore**.
  El único intento local fue pwd y respondió que no había entorno utilizable; no se repitió ni
  se creó infraestructura como sustituto. No se acreditó un laboratorio con V8.
- No se repitieron las cuatro aceptaciones funcionales/tres controles del selector, 12+5 anteriores,
  suites históricas, N01–N12, BPF01–BPF04 o Chromium. La matriz existente de 16 filas no cambió.

[PACKAGE-MANIFEST.json](PACKAGE-MANIFEST.json) contiene hashes Git de los ocho archivos de fuente
del paquete; identifica bytes, no prueba instalación o eficacia de sus permisos.

## C. Bloqueos eliminados y límites verdaderos

**Ningún bloqueo operativo queda acreditado como eliminado.** Se reemplazó parte del vacío de
implementación por cuerpos SQL revisables: unicidad global propuesta, admisión ligada al original,
contexto privado que completa el ABI histórico y lectura provisional con privilegios separados.
Esto reduce trabajo de implementación pendiente, pero no demuestra unicidad SQL, autoridad,
COMMIT, aislamiento físico, RLS eficaz o custodia real.

No se buscaron de nuevo productores existentes ni se fabricaron callbacks/constantes autorizantes.
Los diez puertos faltantes no están implementados con fixtures positivos. La asignación del fundador
no tiene fila predeterminada ni autoasignación. Falta la decisión/fuente confiable.

## D. Bloqueos vigentes

1. Proveedor/ingreso protegido de request, identidad/sesión actuales y revisiones D1.
   auth_live/request echo o claims/DTO del cliente no sustituyen verificación real.
2. Asignación única/elegibilidad del fundador y CABA del original, fuentes independientes D2,
   catálogo/inventario completo bajo RLS y participación de todos los revocadores.
3. Custodio original exacto/metadata/comparadores y prueba independiente de historia completa.
   Los metadatos UUID/sesión/key son potencialmente identificables, no anónimos.
4. Decisión específica D02-A: finalidad, minimización, acceso, cifrado/custodia, retención,
   supresión coordinada y backups. No hay plazos nuevos ni aprobación inventada. La copia
   histórica de dirección/unidad no se elimina y no se agrega otra al ledger.
5. Materialización revisada y host PostgreSQL 17.11 acreditado/costo cero, autorización concreta,
   roles/login/catálogo/grants/RLS y concurrencia nativos. ASUS no accedida ni presumida apta.
6. COMMIT externo, reader/journal/witness independientes, Auth administrado y navegador seguro.
   ACK, resultado de función, efecto SQL y comprobante durable son capas distintas.
7. A2 integral: PostgreSQL, Auth/GoTrue, Vault, Storage, claves/config, floors/revocaciones y
   journal/witness posteriores al backup. Estado restaurado permanece en cuarentena; una copia
   antigua no vuelve a autorizar personas o despachos. Sin restore ejecutado.

Primera estadía/borrador/asociación/invitación/checkout no reciben otro escritor o endpoint:
su integración real sigue dependiendo de estas fuentes y de contratos ya retenidos. No se usa
create_stay como comando genérico, no se crea un portal huésped ni se postergan revocaciones.

## E. Próxima ejecución y recuperación

[NATIVE-DELTA.json](NATIVE-DELTA.json) vincula estos artefactos por hash con BPF01–BPF04/N01–N12
existentes, sin otra batería/runner o autorización. Especifica precondición, rama que debe
alcanzarse, resultado esperado, abortos y evidencia externa. Rechazar por guard exterior o por
función ausente es TARGET_NOT_REACHED, nunca PASS del ensayo.

[NEXT-EXECUTION.md](NEXT-EXECUTION.md): recuperar checkpoints y fuentes sin repetir el trabajo.
Offline aún puede continuarse la revisión/implementación de puertos cuando se aporten sus fuentes
confiables y decisiones; con un runtime permitido disponible podrá verificarse sintaxis/semántica
sin atribuirle efectos nativos. No hay código seguro que convierta datos no acreditados en esas
fuentes. No usar callbacks positivos para completar la demostración.

La siguiente acción crítica es aportar la procedencia/asignación/custodia e ingreso de Auth que
faltan y revisar una materialización concreta. Antes de cualquier motor/DDL/ensayo real se requiere
entorno acreditado y autorización específica. Un host por sí solo no completa la autoridad.

Se conserva el mínimo: un fundador, una propiedad CABA, 30 días gratuitos desde la primera estadía
real verificada, no iniciada; sin cobro/conversión automática, Free separado y sin fecha prometida.
Las funciones secundarias posponibles de la matriz anterior no se desarrollaron. Sin servicios,
gastos, comunicaciones, datos reales, firmas o levantamiento de guards. **NO-GO.**
