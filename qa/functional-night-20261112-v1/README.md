# Candidato funcional nocturno — HELD

Reutiliza el codec/validadores, funciones de tiempo y generadores QA anteriores. No es una aplicación operativa, instalador SQL o nuevo gateway. No hay transporte, credenciales, persistencia privada o endpoints nuevos.

property-lifecycle.mjs y stay-lifecycle.mjs implementan revisión pura, versionada, de comandos y transiciones. Sus contextos/snapshots son vectores sintéticos, no productores de autoridad. Una transición válida es sólo una propuesta HELD; los puertos por defecto ignoran argumentos y no aceptan adapters positivos. lifecycle-abi.d.mts documenta tipos y evidencia externa necesaria, sin generar recibos o firmas.

Corregido respecto del revisor anterior: estados SQL draft/revoked válidos en inventario; exclusión del propio registro sólo con revisión y snapshot exactos; un inventario contradictorio/incompleto se cierra. Las propuestas no acreditan unicidad SQL ni COMMIT. El esquema permite draft sin fila de huésped, pero no existe la primitiva privada instalada para crearlo: ningún huésped ficticio completa CBF1.

Desde el checkout padre con web/ y backend/ hermanos:

```sh
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/functional-night-20261112-v1/property.test.mjs web/qa/functional-night-20261112-v1/stay.test.mjs
```

No repetir suites anteriores por rutina. Primer bloque: seis casos únicos nuevos PASS; baseline de inventario FAIL conservado. Son Node/vectores, no SQL/Auth/browser. Recuperar desde el último commit QA y leer el directorio qa/reviews/functional-night-20261112/; revisar HEADs y fuentes antes de continuar. Native17 HOST_NOT_AVAILABLE, N01–N12 NOT_AUTHORIZED/NOT_RUN. Beta V1 NO-GO.
