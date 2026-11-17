# Native17 post-ASUS — candidato retenido

No instala ni inicia infraestructura. `lab/lab.py` imprime un plan por defecto;
`--execute`, el ejecutor de FD y el controlador interno terminan cerrados.
Ningún JSON o variable de entorno los habilita. No es todavía un lanzador
autorizado ni una reproducción observada de A57.

## Inspección permitida sin iniciar servicios

Desde la raíz de un checkout web completo:

```sh
python3 -B qa/native17-post-asus-20261117-v1/lab/lab.py --dry-run --config qa/native17-post-asus-20261117-v1/lab/config.review.json
python3 qa/integral-held-v1/run-isolated.py -- python3 -B qa/native17-post-asus-20261117-v1/checks/lab_test.py
python3 qa/integral-held-v1/run-isolated.py -- node qa/native17-post-asus-20261117-v1/checks/sql-contracts.cjs --writer=../qa-lab/qa/cheveni-beta-release-candidate-v1/writer-integration/private-mutations-UNAPPLIED.sql
```

El último comando exige qa-lab completo en el SHA fijado, sólo lectura. Las
pruebas procesan archivos sintéticos y texto; no llaman Docker, systemd, bwrap
ni PostgreSQL. El launcher ya existente acredita una red sin rutas para estos
procesos de prueba, no el aislamiento físico de la ASUS.

`--inspect-local` es una opción separada de consultas de metadatos para el
propietario físicamente presente en ASUS; Work no la ejecutó. Rechaza UID 0,
overrides Docker y endpoints distintos de Unix local. Un image ID o RepoDigest
observado no acredita por sí solo origen, revisión de bibliotecas o firma.
No descarga imágenes. El archivo config permanece sin UID/image ID/run ID:
deben obtenerse de observaciones nuevas, nunca copiar el directorio efímero A57.

## Ingeniería implementada

* Plan de exportación de imagen local por ID, sin iniciar el contenedor;
  spool de bytes acotado, archivo privado exclusivo y evidencia parcial
  retenida ante exceso o error (sin sobreescritura ni borrado automático);
  extracción acotada con rechazo de traversal, tipos especiales, hardlinks,
  symlinks escapados o usados como directorios. No usa `extractall`.
* Receta Bubblewrap de montajes explícitos, red separada, socket Unix privado,
  sin Windows, socket Docker ni entorno heredado. Preparar mountpoints antes
  de sellar payload; una imagen legítima incompatible se rechaza sin fallback.
* Filtro binario x86_64 de laboratorio y verificación de FD/hash. La apertura
  debe ocurrir dentro de la unidad systemd: un FD arbitrario no se transmite
  automáticamente por D-Bus. La CLI de ese helper sigue deshabilitada.
* Comparación de límites efectivos, barrera antes de initdb y receta de
  inicio/consulta/detención. `fsync`, `synchronous_commit`, `full_page_writes`
  propuestos ON; tmpfs sigue siendo volátil, sin garantía durable.
* Decisión conservadora de recuperación: estado de COMMIT incierto conserva
  UNKNOWN, evidencia y prohibición de redispatch/descarte automático.
* Cuatro SQL copiados desde la versión reparada. Sólo 01 cambia el formato de
  journal a `^qa_[a-z0-9_-]{1,61}$`: prefijo QA, ASCII compatible con backend,
  máximo total 64. No cambia autoridad ni instala fuentes.

## Límites que deben revisarse antes de una ejecución futura

Faltan observación ASUS de esta receta exacta, binarios/librerías y sus hashes,
proveniencia, soporte de opciones, mapeo de UID, propiedades efectivas, prueba
del montaje y cuota de staging host. Los límites tmpfs no son una cuota dura
del staging en `/tmp`. El filtro ptrace + arquitectura/x32 es limitado, no una
política de producción. No se asume independencia frente a procesos host del
mismo UID; staging privado, archivo sin escritores y custodia siguen exigidos.

No hay ejecutor de limpieza automática ni reinstalación/reanudación. Ante error
no usar `docker prune`, `pkill`, borrado global ni repetir la mutación. Sólo una
intervención posterior autorizada puede detener la unidad exacta registrada,
verificar cgroup/procesos/contenedor y decidir descarte dirigido. Si hubo una
operación protegida posible, preservar originales/evidencia hasta conciliación.

Los SQL conservan abortos exteriores e interiores y ROLLBACK. No son un orden
de instalación; sus fuentes protegidas, ACL transitivas y revocadores siguen
HELD. No concatenarlos ni quitar guards. Beta V1 NO-GO.

## Materialización y captura futuras

`MATERIALIZATION.json` ordena objetos, no archivos completos: 04 declara roles
que necesitan existir antes que 01, pero sus ALTER/POLICY necesitan objetos
posteriores. Las migraciones originales 20/25/127 contienen permisos históricos
y dependencias adicionales; no ejecutarlas como instalador de este paquete.
El ledger histórico también requiere `companion_binding_v1` por FK; la rama de
propiedad no elimina esa dependencia de definición.

`checks/materialization.py` inventaría sólo el subconjunto SQL conocido y
separa TYPE de FUNCTION. Informó diez puertos sin implementación y ausencia de
grants USAGE/EXECUTE transitivos. No compila PL/pgSQL ni evalúa ACL efectivas.
`checks/source_integrity.py` compara bytes con blobs fijados y detecta copias
alteradas. Los hashes prueban integridad de fuentes, no procedencia de la imagen
ni instalación, custodia, autoridad o autorización.

```sh
python3 -B qa/native17-post-asus-20261117-v1/checks/materialization.py
python3 -B qa/native17-post-asus-20261117-v1/checks/source_integrity.py --web . --backend ../backend --lab ../qa-lab
```

`NATIVE-BINDINGS.json` enlaza los IDs existentes N/BPF/F, actores, barreras,
consultas parametrizadas del observador y evidencia necesaria. No crea runner
ni nueva suite. F07 necesita la entrada de admisión retenida y el reader actual;
el recibo histórico que exige bootstrap no resuelve lectura posterior al alta.
F10 sigue siendo de invitaciones; para propiedad se conservan N08/BPF04.
F12 continúa retenido por custodia/A2. Los límites propuestos del smoke no
autorizan ni dimensionan automáticamente los ensayos de concurrencia.

`sql/catalog-capture-DO-NOT-APPLY.sql` conserva aborto antes de SELECT y propone
sólo metadatos acotados; incluye hashes de cuerpos/definiciones, no argumentos
de triggers ni datos privados. No es una acreditación completa de catálogo:
hay que reutilizar el cierre existente para dependencias, expresiones RLS,
constraints/indexes y revocadores. Límite alcanzado o permiso insuficiente
significa INCOMPLETE/ABORT. No ejecutar ahora.
