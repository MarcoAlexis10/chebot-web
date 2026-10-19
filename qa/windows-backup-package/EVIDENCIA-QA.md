# Evidencia del paquete Windows A1 - 2026-10-19

Este archivo describe pruebas ficticias. No contiene datos ni configuracion real de DEV. Decisiones: GO para preparacion/ensayo ficticio; NO-GO para recuperacion integral del DEV actual. No se capturo DEV ni se modifico DEV/PROD. No se enviaron correos/mensajes ni se contrataron servicios.

## Evidencia conservada

- Bases: backend `dd9de42b332e3258eb6029c94e7ecb05a489b9cc`; laboratorio web `6698a88065bd09bcf4bb3807b6601a97fc8b9c5f`.
- Las suites generales anteriores NO se repitieron. El ensayo anterior aprobado (12 fases + 5 controles, run 39189212437) permanece como antecedente, no como prueba del paquete nuevo ni del DEV real.
- Controles nuevos de paquete: 9/9 base (cifrado/clave/inventario/destino/CI/recibos/Storage/revocaciones), mas 4/4 casos agregados focalizados: atributos de roles no predeterminados, equivalencia de catalogo entre transportes rechazo de rutas ambiguas de Storage y rechazo de otorgantes/privilegios ACL no admitidos. Los casos de red/puertos y paginacion Storage se revalidaron al cambiar sus controles. No se suman reejecuciones como casos nuevos.
- Windows nativo PowerShell 5.1 desde ZIP extraido: helpers/manifest, creacion de clave, recuperacion por tuberia UTF-8 con caracter no ASCII y CLI 2.121.0 verificada. Job SUCCESS: https://github.com/MarcoAlexis10/chebot-web/actions/runs/39208116958/job/117915288736 . El workflow completo de ese commit fallo por el ensayo Linux en desarrollo; no confundir ambos alcances.
- Ultimo preflight Windows del lector/paquete modificado: SUCCESS, https://github.com/MarcoAlexis10/chebot-web/actions/runs/39209567391/job/117919716673 . Verifica ZIP y diagnostico; no certifica Docker ni hardware de la ASUS, actualmente apagada.
- Python privado: tuberia UTF-8, recuperacion de clave cifrada e integridad del manifest comprobados localmente con material efimero ficticio. No se aprovisiono Codespace ni se certifico facturacion/cuota de la cuenta.
- Empaquetado: allowlist explicita de archivos operativos, dependencias JavaScript runtime y licencias. Se verifica inventario completo, SHA256/longitudes, estructura plana, ausencia de archivos de respaldo/clave/dump/PEM/log y patrones de credenciales. El CLI extraido abre un archivo cifrado ficticio por entrada privada. El SHA256 final del ZIP se entrega fuera del ZIP para evitar referencia circular.

## Ensayo nuevo de captura y recuperacion

SUCCESS: https://github.com/MarcoAlexis10/chebot-web/actions/runs/39210500913/job/117922570551 . Commit ejecutado: `9040118398ecd40316f33d1b8d7f98df4ac0d081`. Ambos jobs del workflow finalizaron SUCCESS; preflight Windows final: job `117922570304` del mismo run.

Las seis fases comprobaron bootstrap propio vacio con puertos loopback; fixtures Auth/FK/RLS/rol/Vault y cierre de escritores; captura NUEVA y formatos CVA2/CVK2; rechazo de manipulacion/frase equivocada/journal posterior; destruccion del origen y volumenes y recreacion vacia; restauracion NUEVA con datos, descifrado Vault, roles, funciones y ACL exactas de objetos. El destino de restauracion se aislo en una sola red interna antes de recibir datos.

Resultado sanitizado: `checks=6`, `success=true`, `realDevContacted=false`, `realDataUsed=false`, `fullDevRecoveryVerified=false`, `paidServices=0`. Limpieza del propio laboratorio y limpieza final del workflow SUCCESS; se comprobo ausencia de sus contenedores/volumenes. Los archivos y valores ficticios de claves no se adjuntan.

Las comprobaciones de RLS de este paquete cubren flags y DDL restaurado del fixture; las pruebas funcionales amplias de la aplicacion conservan sus ejecuciones aprobadas previas. No se certifican politicas reales ni acceso de personas. Despues de este commit solo se actualizo documentacion/evidencia; no se repitio la integracion aprobada.

## Correcciones probadas durante preparacion

Se corrigieron compatibilidad .NET/PowerShell y marca UTF-8, argumentos propios de pg_dumpall, inicializacion de bootstrap antes del aislamiento, vinculacion loopback heredada de Docker, comparacion estable del catalogo con tipos explicitos, sin filtrado por privilegios y con el mismo search_path de deparse, cierre de ACL por objeto dentro de la transaccion, y comprobacion de eliminacion de contenedores/volumenes propios. Los errores de desarrollo quedan en la historia de la rama QA; no se ignoraron errores para obtener un resultado exitoso.

Las comparaciones conservan valores, columnas, propietarios, RLS, funciones y ACL. Los archivos de DDL administrado se renderizan con el mismo cliente fijado para comparar definiciones, sin ejecutar DDL administrado arbitrario. Se bloquean configuraciones reales incompatibles; no se suprimen controles de recuperacion para obtener GO.

## Limites que permanecen

El ensayo de paquete usa Storage vacio. Exportacion con paginacion/binarios y rutas inseguras se prueba con mocks; el ensayo Storage no vacio anterior no se repite y no se presenta como restauracion del DEV. El restaurador nuevo bloquea buckets reales hasta reconciliacion privada. Auth funcional completo, claves gestionadas, rol/configuracion global y proveedores reales no se certifican con este paquete. La cobertura y lista unica de intervenciones estan en COBERTURA-Y-RECUPERACION.md.

Copia de preparacion backend: `ops/recovery/windows-package`, rama `qa/windows-backup-package-20261019`, sobre la base dd9de42b; no modifica el codigo de la aplicacion ni sus fuentes aprobadas.

Codigo reproducible del laboratorio: rama `qa/windows-backup-package-20261019`, directorio `qa/windows-backup-package` del laboratorio web; `build-package.py` y `qa/windows-package-audit.py` permanecen en QA como herramientas de construccion/verificacion. Las dependencias estan fijadas por package-lock y el ZIP contiene runtime JavaScript. Los binarios oficiales y la imagen PostgreSQL se validan contra los hashes fijados, sin accesos a servicios pagos.
