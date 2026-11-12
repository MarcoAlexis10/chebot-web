# Productor de primera propiedad y read/2 — candidato retenido

Extensión estrecha del paquete first-property-20261112-v1. No conecta SQL, red, provider, writer, custodia o build. Beta NO-GO.

- authority-source.mjs inspecciona extractos fijados de los componentes existentes y reutiliza la frontera protegida anterior. scope_v2/manager_scope/launch no pueden crear una primera propiedad sin circularidad; los pares de caller tampoco coinciden. No se agregan grants o respuestas de autoridad.
- read-cut.mjs separa intención histórica de la autorización de una lectura actual. La lectura post-captura requiere un slot ocupado coherente, no cupo libre ni permiso property_create. Se revalida el corte actual antes/después y se reutiliza reviewRevisionCut para comparar floors independientes. Todo es OFFLINE_VECTOR; incluso la consistencia completa conserva UNKNOWN y propertyId NULL.
- readAbi() detalla 26 argumentos propuestos de read/2 y dependencias aún sin grants. No genera un statement o instala una firma. read-abi.d.mts describe los tipos pero no se compiló TypeScript.
- original-reference.mjs no almacena dirección, frame, snapshot o hash personal. La referencia opaca sólo tiene revisión de forma; no sustituye el comparador protegido. El key original por intención no detecta una unidad distinta. Sin custodio, se retiene la eliminación de la copia y la conciliación queda UNKNOWN.
- candidate.mjs añade esas fronteras cerradas al recorrido existente. No produce otra aplicación ni recibos positivos; recover no reconstruye desde cliente.

Los TXT son extractos de fuente inmóvil, nunca archivos para ejecutar. SOURCE-PINS hereda los pines anteriores; NATIVE-SOURCE-PINS fija los blobs íntegros de origen. Las pruebas son Node/modelos/dobles y comprobación de fuentes, no PostgreSQL/Auth/browser. No se repiten suites históricas.

Reproducción focal desde el padre de web/backend, sólo si un cambio lo justifica:

```sh
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/property-authority-preflight-20261112-v1/authority.test.mjs
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/property-authority-preflight-20261112-v1/read.test.mjs
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/property-authority-preflight-20261112-v1/custody.test.mjs web/qa/property-authority-preflight-20261112-v1/integration.test.mjs
```

ASUS-PREFLIGHT.md del cierre es un procedimiento manual pendiente para el equipo físico. No se ejecutó aquí, no autoriza un motor o cambia HOST_NOT_AVAILABLE.
