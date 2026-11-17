# Che Vení — Native17 post-ASUS, 17/11/2026

**Beta V1 NO-GO.** Se publicó código QA reutilizable para preparar el laboratorio,
una corrección concreta del SQL retenido y herramientas de integridad/dependencias.
No se ejecutó PostgreSQL, SQL protegido, Auth ni infraestructura desde Work.
Los ejecutores del paquete siguen deshabilitados; no es un instalador ni un
lanzador autorizado listo para operar.

## Recuperación y commits

| Repositorio / rama | HEAD inicial verificado | HEAD final de implementación verificado |
|---|---|---|
| web / qa/cheveni-integral-held-20261111 | afe70b7a5de3e769fbcc48d60e4207b3b6e929aa | 6b57e0027cbcbc1f1d2a6ccf4b59cd14e47bcf94 |
| backend / qa/cheveni-integral-held-20261111 | 9beb837a621f9a8f06601043afa64b3bba317cb5 | sin cambios |
| qa-lab / qa/cheveni-native17-policy-closure-20261106 | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a | sin cambios |

Checkpoints publicados y verificados con actualización de ref por SHA esperado:

* [4554b361 — receta cerrada y corrección del journal](https://github.com/MarcoAlexis10/chebot-web/commit/4554b361579aeaebccdd613df446df96e7f804a2).
* [133de915 — fuentes exactas, dependencias y casos existentes](https://github.com/MarcoAlexis10/chebot-web/commit/133de9156cdac927e8ed4c04399ef1d950de88da).
* [6b57e002 — exportación acotada y evidencia sellada](https://github.com/MarcoAlexis10/chebot-web/commit/6b57e0027cbcbc1f1d2a6ccf4b59cd14e47bcf94).

El commit que contiene este CLOSURE añade únicamente el cierre y NEXT-EXECUTION;
su SHA se identifica en el enlace inmutable de entrega. La tabla fija el HEAD
final del código y la evidencia, sin pretender incluir un hash autorreferente.
Todos los commits usan `[skip ci]`. Se verificaron HEAD, blobs y los dos workflows
web; esta rama queda fuera de sus triggers push. No se despacharon workflows.
Se preservaron todos los blobs existentes al iniciar; sólo se añadieron/actualizaron
los dos directorios QA nuevos. Sin cambios en consumidores/build operativo.

## Código útil implementado

Paquete: [qa/native17-post-asus-20261117-v1](../../native17-post-asus-20261117-v1/README.md).
Inventario exacto de archivos, tamaños, SHA256 y blobs: [PACKAGE-MANIFEST.json](PACKAGE-MANIFEST.json).

* `lab/lab.py`: plan puro por defecto; exportación propuesta de imagen local
  por ID con pull prohibido y contenedor nunca iniciado. Spool binario acotado,
  creación exclusiva 0600, extracción sin extractall, inventario limitado,
  rechazo de traversal, hardlinks, tipos especiales y symlinks peligrosos.
  Errores dejan material incompleto privado, sin sobreescribir ni limpiar solo.
* Plan Bubblewrap/systemd con montajes mínimos, red separada, cero entorno
  heredado dentro del aislamiento, sin Windows/socket Docker. Memoria, swap,
  CPU, tareas y runtime propuestos; tamaños explícitos de tmpfs para data,
  tmp, socket, run y sys. Comparador de propiedades efectivas y barrera antes
  de initdb. Configuración permanece sin UID/run ID/image ID observados.
* `lab/fd_entry.py`: validación local de filtro, propietario, modo, symlinks y
  hash. La receta abre el FD dentro de la unidad: no presupone que FD 3 cruce
  D-Bus. Su CLI permanece cerrada; su materialización/exec definitivo requiere
  revisión posterior, no activar con una variable de entorno.
* `lab/inside-smoke.sh`: receta detenida al inicio por guard. Describe initdb,
  arranque, consulta exacta 170011, socket privado, parada y error UNKNOWN;
  propone fsync/synchronous_commit/full_page_writes ON. No se ejecutó.
* `checks/source_integrity.py`: verifica archivos acotados contra blobs fijados
  y rechaza rutas/symlinks no revisados. `checks/materialization.py`: inventario
  del subconjunto conocido, diferencia TYPE de FUNCTION y declara brechas;
  no es un parser PostgreSQL ni genera un instalador.
* `MATERIALIZATION.json`, `NATIVE-BINDINGS.json` y captura de catálogo abortada:
  orden por objetos, dependencias, roles/ACL, actores, barreras y evidencia
  esperada usando N01–N12, BPF01–BPF04 y F01–F12 existentes. Sin runner nuevo.

## Defecto SQL corregido y límites de revisión

El patrón reconstruido `^qa_[a-z_]{1,64}$` rechazaba IDs QA con dígitos/guiones
admitidos por el formato del backend y permitía longitud total hasta 67.
El caso Node falló contra ese patrón. El nuevo candidato usa
`^qa_[a-z0-9_-]{1,61}$`: conserva prefijo QA y límite total 64 para los vectores
ASCII revisados. Esto **no** valida identidad de journal, firma, procedencia,
floor ni semántica/collation del regex en PostgreSQL.

Se reutilizó 01 ya reparado estructuralmente; no se recuperó la versión corrupta.
El único cambio final en 01 es ese patrón. 02/03/04 son byte a byte idénticos a
sus fuentes fijadas. Todos conservan abortos exteriores/interiores y ROLLBACK.
El writer mantiene once argumentos y el reader /2 veintiséis. Sin fallback REST,
SET ROLE, DML general, nuevos permisos operativos o exposición de payload.
Véase [delta exacto](evidence/protected-sql-delta.diff).

La verificación de hashes detectó un LF extra añadido durante la recuperación
local y una fuente seleccionada aún ausente. Se restauraron bytes exactos
contra blobs; se conservaron el fallo y la corrección. No se alteraron originales
remotos. El NATIVE-DELTA histórico todavía señala un blob antiguo de 01: el
paquete nuevo fija explícitamente el blob estructural reparado y no usa ese
registro obsoleto para seleccionar un instalador.

## Evidencia obtenida por Work

[TEST-EVIDENCE.json](TEST-EVIDENCE.json) contiene comandos/clases, resultados y logs.

| Comprobación realmente ejecutada | Resultado | Alcance |
|---|---|---|
| Python: contratos de laboratorio/archivos/recuperación/exportación | 9 PASS | funciones y archivos sintéticos; no procesos de infraestructura |
| Python: herramientas de inventario e integridad | 5 PASS | texto y fixtures de archivos |
| Node: incompatibilidad del journal | baseline FAIL → candidato PASS | modelo ASCII, no regex PostgreSQL |
| Regresión del reviewer SQL reparado | PASS | texto/estructura y ABI writer11/read26 |
| Regresión de receta tras acotar run/sys | PASS | repetición focal de un caso ya incluido, no caso nuevo |
| Fuentes seleccionadas | 25/25 blobs coinciden | snapshots parciales verificados; no checkout integral acreditado |
| Dry-run y sintaxis Python/JSON/sh/Node | PASS | sin Docker, systemd, bwrap o PostgreSQL del candidato |
| SQL parse/compile/runtime; casos N/BPF/F | NOT_AUTHORIZED / NOT_RUN | no se sustituyen por modelos |
| Auth administrado, COMMIT externo, journal/witness, A1/A2, navegador | NOT_RUN | dependencias/autorizaciones pendientes |

Python 3.12.14; Node v24.22.1. Las pruebas de código usaron el launcher existente
con namespace de red distinto, sin rutas y ENETUNREACH; no heredan credenciales.
Esto acredita ese perímetro de pruebas de Work, no el host ASUS. Hubo un fallo
inicial de la tabla de prueba que esperaba rechazar swap=0, valor válido; se
corrigió la aserción sin debilitar el control. Los logs lo distinguen del defecto
SQL. Reejecuciones focales no se cuentan como casos únicos adicionales.
No se repitieron suites históricas ni Chromium.

## ASUS: observaciones del propietario y límites

[OWNER-OBSERVATIONS.json](../../native17-post-asus-20261117-v1/lab/OWNER-OBSERVATIONS.json)
registra el smoke reportado: versión 170011, consulta `170011||pgqa`, inicio y
parada correctos, A57=0, A58 sin procesos/unidad residual y A59 sin contenedor
auxiliar. Work no accedió a ASUS ni acreditó independientemente esos resultados.
No se recuperó un bloque literal completo A29/A54/A57; la nueva receta es una
propuesta revisable, no una reproducción observada de sus flags/límites/UID.

El antiguo `/tmp/cheveni-native17-pWSZJnLP` no se reutiliza ni borra automáticamente.
El smoke nuevo también propone tmpfs: aun con fsync ON no acredita persistencia
ante reinicio/pérdida eléctrica. El filtro ptrace con guardas arquitectura/x32
es limitado y no una política completa de producción. No se probó en ASUS.
Faltan cuota dura del staging host, hashes/procedencia de binarios/bibliotecas,
compatibilidad real de opciones/montajes/UID y observación efectiva de la receta.
La importación estricta puede rechazar una imagen legítima; no hay fallback.

## Brechas de materialización y primera propiedad

El inventario ejecutado encuentra **diez funciones protegidas sin implementación**,
con requisitos exactos reutilizados en MATERIALIZATION.json. Los tipos del
original no implementan el resolver. No se añadieron productores positivos.

Además del proveedor/cut actual, siguen pendientes floors/restricciones y
catálogo completos, custodia/resolución/comparación del original, historia
independiente de despacho y avance de revisión de todos los revocadores.
Asignación única global del fundador y jurisdicción vinculada al original
siguen sin ingress protegido/procedencia aprobados. No existe autoridad real
property_create por tener una cuenta marcada founding_manager.

El ledger histórico manager_result referencia companion_binding por FK; no se
puede omitir su cierre de definición ni ejecutar a ciegas ALTERs ajenos. 04 mezcla
roles previos con owners/policies posteriores: el orden por archivo no instala
el paquete. Faltan USAGE de esquema/tipo y EXECUTE transitivos, owners/ACL/RLS
efectivos y cobertura completa de revocadores. FALSE RLS de Auth sintético no
acredita acceso a fuentes, y no se evade con un permiso general.

F07 requiere la admisión retenida y un lector actual; property_receipt usa
autoridad bootstrap y no reemplaza read/2 después del alta. F10 sigue siendo
de invitación; para pérdida de ACK de propiedad se usan N08/BPF04. F12 continúa
retenido por witness/A2. Un guard exterior, undefined_function, tabla ausente,
timeout o permiso denegado antes de la rama relevante significa TARGET_NOT_REACHED.

## Bloqueos priorizados y próximo paso

1. Implementar fuentes protegidas y custodia reales con procedencia verificable:
   identidad/sesión actual, owner/member/account, fundador global, CABA,
   revisiones/floors, originales y revocadores. Sin fixtures positivos.
2. Revisar y sellar una materialización separada por hash con cierre de dependencias,
   privilegios mínimos y reader LOGIN distinto del writer. Los SQL actuales no
   se aplican ni se habilitan cambiando guards.
3. Revisar esta receta con el A57 literal y metadatos actuales de ASUS. Luego,
   sólo con autorización específica de host/artefacto/casos/límites/descarte,
   observar N01 y ramas BPF/N/F pertinentes. El smoke reportado no lo autoriza.
4. Acreditar COMMIT/effect/readback y journal/witness independientes. ACK
   COMMITTED o function_returned no son éxito durable. Ante pérdida de ACK o
   reinicio sin original/historia: UNKNOWN, sin redispatch ni limpieza automática.
5. Resolver decisión específica D02-A: conservar copia histórica dirección/unidad
   o referencia protegida sólo si existe original exacto recuperable/comparable;
   definir finalidad, acceso, custodia/cifrado, retención, supresión coordinada y
   backups. No se creó persistencia ni se inventaron plazos/aprobaciones.
6. Auth real/revocación/refresh, recuperación A2 integral (PostgreSQL, GoTrue,
   Vault, Storage, claves/configuración, floors/revocaciones posteriores al backup,
   journal/witness), legal/prelegal y navegador permanecen pendientes.

La siguiente tarea prioritaria está en [NEXT-EXECUTION.md](NEXT-EXECUTION.md).
El cierre de fuentes no puede acreditarse offline con los datos actuales;
las interfaces permanecen HELD. No se tocaron servicios, datos reales, cuentas,
propiedades, estadías, invitaciones, trial, comunicaciones ni cobros.

CABA, un manager fundador, una propiedad, 30 días desde la primera estadía real
verificada, sin cobro ni conversión automática; Free separado y sin fecha
prometida. No hay autorización de incorporación del primer manager ni GO comercial.
