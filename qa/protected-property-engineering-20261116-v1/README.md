# Primera propiedad · ingeniería protegida retenida

Estado: REVIEW_ONLY_NOT_EXECUTED / NO-GO. No es un instalador ni un productor operativo.
Se extiende bootstrap-facts y el writer privado original; no se reimplementa otra captura.
Los cuatro SQL abortan antes de DDL y cada función tiene un guard incondicional interior.
Faltan dependencias deliberadamente no sustituidas por callbacks, constantes o fixtures.

## Componentes preparados
- 01-bootstrap: fuentes propuestas no sembradas para asignación global del fundador y CABA ligada al original; relación exacta user/owner/member/account, inventario completo, ambas fechas de trial NULL y target NULL. La cuenta debe estar active; testing/onboarding no se promueven automáticamente. Se conserva el booleano histórico como condición adicional, nunca como unicidad global.
- 02-admission: ledger de metadatos y contexto efímero por full transaction ID + backend PID; wrapper conserva los once argumentos originales. Binding resuelve la incompatibilidad de request/attempt/originalRef sin SET ROLE. La credencial del writer debe conservar el nombre histórico; el nuevo login lector es distinto. No se acredita aislamiento físico a partir de IDs.
- La rama KNOWN compara el original protegido y, si existe captura histórica, sus valores exactos de dirección/unidad. Nunca vuelve a llamar al writer. Un key igual no acredita argumentos iguales. El original completo se valida con parser/subset anteriores; defaults no representables, building u otros campos se rechazan, no se descartan.
- Ausencia de sidecar tras reinicio/restore exige una prueba independiente de historia completa antes de NEW. Si existe resultado/captura histórica sin ledger, UNKNOWN. No hay API de resume/claim ni reenvío automático.
- 03-read2: exactamente el ABI property-capture-independent-read/2 ya revisado, 26 parámetros, sin account adicional. Deriva cuenta desde original, coteja ledger/resultado/slot/propiedad y compara original exacto dentro del custodio. Revalida sesión y floors antes/después. No actualiza datos ni retorna dirección/propertyId; effectObservedInTransaction no es COMMIT o SUCCESS.
- 04-role-rls: propuesta concreta de owners NOLOGIN, columna por columna y RLS. No emite EXECUTE a logins de aplicación ni crea credenciales. Falta la clausura completa USAGE/tipos/EXECUTE/default ACL/catálogo. Policies using(true) sólo para owners NOLOGIN con columnas limitadas y entradas protegidas; no acceso directo al cliente. Un filtro RLS no probado impide acreditar inventario completo.

PORTS-AND-ROLES identifica diez productores/verificadores ausentes y sus responsables/procedencias.
La asignación real del fundador y la acreditación CABA requieren decisión/fuente confiable; no hay fila
predeterminada ni endpoint de autoasignación. El antiguo private_mutation_authority_v1 sigue vacío
en sus fuentes instalables originales; su reemplazo de revisión está bloqueado y sólo contempla
property_create dentro del contexto protegido, nunca las once otras mutaciones.

## Privacidad, recuperación y autoridad
Los metadatos de usuario/sesión/intención pueden ser personales vinculables; no se tratan como anónimos.
La nueva persistencia queda retenida hasta decisión específica D02-A sobre finalidad/acceso/custodia/
cifrado/retención/supresión y backups. No se agregó una segunda copia de dirección/unidad al ledger.
La copia histórica no se elimina. Resolver una referencia exige original exacto inmutable y procedencia;
UUID/key/digest/cliente no bastan. No se crean firmas, nuevos frames CBF1 o protocolos de journal.
A2 sigue integral y con cuarentena/floors/revocaciones independientes posteriores al backup.

## Evidencia y reproducción
El entorno local de ejecución estuvo unavailable. Node, parser SQL, PostgreSQL, Auth, navegador,
COMMIT y restore NO ejecutados. artifact-review.cjs es un verificador puro de coherencia TEXTUAL;
se ejecutó sólo con V8 de la herramienta de orquestación, no como prueba Node/nativa.
Recibe los artefactos como strings, el SQL histórico fijado y la lista read/2 existente.
No hace IO ni produce autoridad. Sus controles negativos sólo prueban ese verificador textual.
No se repitieron las cuatro aceptaciones/tres controles del selector ni los 12+5 anteriores.

En un checkout futuro, sin ejecutar SQL, se puede cargar el CJS y llamar review(files,originalWriter,readSpec).
Antes de cualquier ensayo nativo se necesitan fuentes reales, aprobación de custodia, catálogo,
host PostgreSQL 17.11 acreditado y autorización específica de materialización/operaciones.
Un aborto exterior es TARGET_NOT_REACHED, nunca PASS nativo.

Referencias de ingeniería: PostgreSQL 17, Row Security Policies, Explicit Locking y CREATE FUNCTION,
consultadas sólo como documentación; no se cambió la versión objetivo ni se instaló un motor.
