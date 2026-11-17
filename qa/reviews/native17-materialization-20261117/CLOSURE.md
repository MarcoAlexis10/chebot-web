# Che Vení — ingeniería Native17, 17/11/2026

**Cierre QA/offline completo. Beta V1 NO-GO. Materialización HELD.**
Se publicaron correcciones de código y verificaciones reproducibles. No se ejecutó
PostgreSQL, SQL protegido, infraestructura, ASUS, Auth, comunicaciones o cobros.
No se retiró ningún guard ni se inventaron fuentes, permisos o custodios.

## 1. Código implementado

Paquete: [native17-materialization-20261117-v1](../../native17-materialization-20261117-v1/README.md).

* Sucesores retenidos de los cuatro SQL de primera propiedad, con 01 preservado
  byte a byte. 04 se separó en declaraciones de roles (00) y cambios sobre objetos
  (04); no se concatenan los archivos para instalarlos.
* 02 compara request/primer intento/sesión/revisión históricos en KNOWN y vuelve
  a corroborar el current read cut y floor después de consultar/comparar el original.
* 03 verifica el floor independiente antes de consultar metadatos del original.
* 05 expresa USAGE de schema/tipos y EXECUTE transitivo conocido, acotado a los
  owners declarados. No emite EXECUTE de entrada para LOGIN de aplicación.
* 06 prepara el sucesor retenido del checker histórico de nueve argumentos:
  VOLATILE, SECURITY INVOKER, una observación de autoridad con cardinalidad y
  expiración comprobada después de la consulta. Limitado a property_create;
  los otros dominios fallan cerrado. No se aplica a instalaciones compartidas.
* `review.py`: inventario léxico, firmas/tipos separados, verificación de guards,
  hashes/rutas/tamaños y reporte sin capacidad de mutar. Rechaza conjunto de
  puertos vacío/alterado, symlinks, traversal, archivos extra y deriva de entradas.
* `compare_lab.py`: comparación mediante AST del texto A57 y el plan puro,
  comprobando antes los blobs de las fuentes externas que carga. No ejecuta A57.

Writer histórico=11 argumentos, reader/2=26. No hay SET ROLE, principal lector
compartido con writer, nueva ruta REST o nuevo primitivo de captura.

## 2. Defectos y endurecimientos concretos

El detector ejecutado encuentra cinco diferencias verificables en las fuentes
anteriores y ninguna de esas cinco en los candidatos:

| Hallazgo de fuente anterior | Corrección candidata |
|---|---|
| Consulta metadata antes del primer floor explícito del lector | Floor antes de resolver metadata; revalidación final conservada. |
| KNOWN no compara explícitamente request/attempt/sesión/revisión con el ledger | Comparación completa de la vinculación histórica, sin sustituirla por la sesión nueva. |
| KNOWN retorna tras custodia/comparación sin recargar el current cut | Reload/shape/floor y comparación del cut antes del retorno UNKNOWN/KNOWN. |
| Checker histórico declarado STABLE para una fuente/contexto que cambia | Sucesor VOLATILE; comportamiento MVCC nativo aún NOT_RUN. |
| Count y valor de autoridad provienen de dos invocaciones | Una consulta, con count(*) OVER y rechazo si cardinalidad no es uno. |

Las dos mejoras KNOWN son defensas explícitas; no se afirma haber reproducido
un exploit contra un custodio real inexistente. El cambio de volatilidad se
basa en las [reglas oficiales de PostgreSQL 17](https://www.postgresql.org/docs/17/xfunc-volatility.html):
STABLE conserva el snapshot de la consulta llamadora; VOLATILE obtiene snapshots
actuales para sus consultas. Su interacción real con el writer debe observarse.
Volatilidad no serializa Auth remoto ni demuestra COMMIT.

Además se corrigió la mezcla de fases roles/objetos en el plan y se expresaron
permisos transitivos faltantes. Son propuestas SQL guardadas, no ACL efectivas.
No se atribuye una corrección de sintaxis PostgreSQL sin parser/compilación.

## 3. Dependencias protegidas resueltas: 0 de 10

El análisis individual está en [PORT-TRACE.json](../../native17-materialization-20261117-v1/PORT-TRACE.json),
con firma requerida, retorno, fuente/productor, autoridad, revocación, dependencias
y comportamiento UNKNOWN. No se añadieron implementaciones aparentes.

| Función requerida | Fuente que todavía falta |
|---|---|
| bootstrap_current_cut_v1(uuid,text,uuid) | Ingreso QA protegido que vincule verificación real del proveedor, request y revisiones actuales. El WeakMap backend existente no es una capability SQL serializable. |
| bootstrap_require_independent_floor_v1(property_current_cut_v1) | Custodio independiente actual de dataset/época/restricciones/inventario/floors. El verificador Ed25519 existente no lo produce. |
| bootstrap_require_complete_catalog_v1() | Baseline exacto aprobado, catálogo efectivo completo y cobertura de fuentes/revocadores. Una consulta pg_catalog no define por sí sola la política esperada. |
| property_original_payload_v1(uuid,property_current_cut_v1) | Original exacto e inmutable, procedencia, custodia y reload protegido actual; el TYPE/parser no es el productor. |
| property_original_metadata_v1(uuid,property_current_cut_v1) | Mismo original/custodio con proyección metadata-only y sin acceso del reader al payload. |
| property_require_original_equal_v1(uuid,uuid) | Comparador protegido de originales exactos; el puerto JS existente devuelve UNKNOWN. |
| property_require_original_cut_v1(uuid,property_current_cut_v1) | Cut histórico protegido del original y corroboración actual, sin rebinding. |
| property_require_capture_matches_original_v1(uuid,uuid,uuid) | Custodio que compare address/unit del efecto con el original, sin exponerlos al reader. |
| property_require_no_prior_dispatch_v1(uuid,uuid,bytea) | Historia independiente completa de admisión/despacho y época actual tras recuperación. |
| bootstrap_begin_revision_change_v1(text,text,text) | Avance/invalidation de revisiones y protocolo completo de revocadores locales/remotos bajo el fence acordado. |

Los retornos void/raises son requisitos de contrato, no funciones compiladas.
Se reutilizaron las fuentes fijadas, no fixtures positivos, JWT ficticios ni
valores constantes de autorización. Las diez interfaces siguen HELD.

## 4. Materialización y dependencias

[PHASE-PLAN.json](../../native17-materialization-20261117-v1/PHASE-PLAN.json) ordena
roles/schema, objetos históricos/keys, tipos/tablas nuevos, validator, productores,
funciones y owners/ACL/RLS. El archivo 01/02 no equivale a una sola fase.
P00 detiene cualquier futura mutación y P40 explicita los diez puertos ausentes.
No hay pasos ejecutables, instalador ni mecanismo para habilitarlo con un JSON.

El grafo preserva doce relaciones y la FK histórica manager_result →
companion_binding, incluyendo sus dependencias transitivas; no omite el dominio
guest para hacer pasar una instalación de propiedad. Las fuentes están fijadas
por ref/blob/SHA256; no se afirma que esos objetos existan en un catálogo nativo.

Quedan pendientes owners de tipos/fuentes, default ACL, políticas efectivas,
triggers y avance de todos los revocadores. La forma Auth sintética con RLS FALSE
no se evade. Los grants propuestos no proporcionan autoridad de negocio.

## 5. Pruebas realmente ejecutadas

[TEST-EVIDENCE.json](TEST-EVIDENCE.json) y [logs finales](evidence/new-review-tests-final.log).

| Ejecución | Resultado y alcance |
|---|---|
| Nueva ingeniería: regresiones de fuente, límites léxicos, guards, FK, integridad, conjunto de puertos y A57 | 13 casos únicos PASS. |
| Cuatro casos del selector de imagen escritos en la rama anterior y todavía NOT_RUN | 4 PASS ahora, con subprocess/Docker simulados. |
| Comparación A57 por AST y plan puro | Ejecutada; siete diferencias, HELD_RECIPES_NOT_EQUIVALENT. |
| Revisor e inventario completo | Ejecutados; STOP_BEFORE_ANY_MUTATION, 0/10, mutationSteps=[]. |
| Python AST y JSON | PASS, únicamente sintaxis de esos formatos. |

**17 casos únicos aprobados en total.** Revisiones intermedias de 9/12 casos no
se suman de nuevo. Se repitieron focalmente al cambiar el nuevo código de
integridad/comparación. No se ejecutaron suites históricas ni A01–A59.
El launcher existente mostró namespace de red distinto, sin rutas y ENETUNREACH,
con ambiente sin credenciales heredadas. Esto corresponde a Work, no a ASUS.

## 6. Sin probar

No había pglast/pg_query disponible en el runtime consultado; no se descargó ni
instaló nada. El lexer no es un parser PostgreSQL. SQL grammar, PL/pgSQL compile,
dependencias efectivas, RLS/ACL, snapshot, concurrencia y runtime: NOT_RUN.

N01–N12, BPF01–BPF04, F01–F12, Docker/systemd/bwrap reales, ASUS, Auth real,
revocación/refresh, COMMIT externo, journal/witness, navegador, A1/A2/Native34:
NOT_RUN. Guard/objeto ausente/denegación antes de la rama es TARGET_NOT_REACHED.
El estado UNKNOWN y cero redispatch se conservan.

## 7. Esta noche con ASUS, sujeto a autorización

[ASUS-SESSION.md](../../native17-materialization-20261117-v1/ASUS-SESSION.md) prepara
únicamente lectura de archivos, revisor/comparador y, si se autoriza, inspección
local de la imagen existente. No necesita repetir A01–A59. A57=0 no acredita
la receta nueva: cambian UID, FD, unidad, montajes, límites y socket.
Ningún caso protegido está listo para ejecutar mientras falten sus productores.
Una revisión parcial de host no es N01 PASS. No ejecutar PostgreSQL o SQL todavía.

## 8. Bloqueos Beta V1

Ingreso protegido de identidad/revisiones, fuentes independientes/floors,
fundador global y CABA vinculada al original, custodia/comparación/historia,
materialización aprobada con privilegios/revocadores completos, evidencia nativa,
COMMIT/readback/journal/witness, Auth real y A2 integral permanecen pendientes.
La D02-A histórica de conversaciones no se reabre: no cubre automáticamente
una nueva custodia persistente del original address/unit. Faltan decisiones
específicas de acceso, finalidad, conservación, supresión y backups para ella.
No se inventaron plazos ni se activaron los controles legales/prelegales.

CABA, un manager fundador y una propiedad; prueba de 30 días desde la primera
estadía real verificada, sin cobro ni conversión automática. No hay GO comercial.

## 9. Publicación recuperable y HEAD

Rama: `qa/cheveni-native17-materialization-20261117`, derivada de
`da08acf0142b11348aaaebbb869b4433e74e7574`, sin rebase/force/merge/PR.

* [910111592e0b1e9d5ffeb31ee76bd4da0d8d5e97](https://github.com/MarcoAlexis10/chebot-web/commit/910111592e0b1e9d5ffeb31ee76bd4da0d8d5e97): SQL retenido, trazabilidad y revisor inicial.
* [4eef1b3202bfad01ef61254f09c40dbc2c1fe260](https://github.com/MarcoAlexis10/chebot-web/commit/4eef1b3202bfad01ef61254f09c40dbc2c1fe260): comparación A57, hardening y verificación final de código.

HEAD del código verificado: `4eef1b3202bfad01ef61254f09c40dbc2c1fe260`.
El HEAD final es el commit posterior que añade este CLOSURE, NEXT-EXECUTION y
evidencia de publicación; se entrega con su SHA completo y permalink inmutable
en la respuesta final. No se intenta introducir un SHA autorreferente en su
propio contenido. [Historial de la rama](https://github.com/MarcoAlexis10/chebot-web/commits/qa/cheveni-native17-materialization-20261117).

Se compararon 1.028 blobs preexistentes: cero modificaciones. Los 21 archivos
del paquete nuevo coinciden con los blobs publicados. Backend y qa-lab fueron
fuentes de sólo lectura. Los dos workflows web siguen intactos; la rama nueva
queda fuera de sus triggers push y todos los commits incluyen [skip ci].
No se despachó ningún workflow. No hay trabajo de código pendiente de publicar.

Próxima tarea: [NEXT-EXECUTION.md](NEXT-EXECUTION.md).
