# Candidato mínimo · aceptación seleccionable QA

Continúa el candidato `qa/pilot-integration-20261112-v1/materialize.mjs`, sin otra aplicación, gateway o productor. No se cambian sus cinco consumidores ni el build operativo. `ACCEPTANCE-MATRIX.json` vincula cada caso a entradas, precondiciones, resultado esperado y evidencia; sus 14 filas no son 14 pruebas aprobadas.

Desde el checkout con web/backend hermanos:

```text
node web/qa/minimal-beta-20261116-v1/acceptance.mjs --list
node web/qa/minimal-beta-20261116-v1/acceptance.mjs --plan OFF-REQUEST-DTO
node web/qa/minimal-beta-20261116-v1/acceptance.mjs --run OFF-REQUEST-DTO
node web/qa/minimal-beta-20261116-v1/acceptance.mjs --run OFF-INCIDENT-DTO
```

Sólo IDs offline de la tabla fija pueden generar un proceso Node detrás del launcher de aislamiento existente. Se verifican hashes de 67 fuentes antes de ejecutar. No se aceptan comandos, endpoints, SQL, flags de autorización o `--all`. Los casos históricos exigen `--repeat-reason` con un impacto real; esta ejecución no los repitió. La razón no se imprime. `--run EX-NATIVE` devuelve código 3 BLOCKED; no posee un ejecutor nativo. Repetición histórica sin razón devuelve 2. Un caso offline exitoso devuelve 0 y NODE_CHECK_PASS, nunca GO.

`projector-consumers.test.cjs` ejecuta las funciones puras originales requestForClient/incidentForClient, serializa sus DTOs y los entrega a los consumidores conservados en un DOM simulado. Comprueba IDs, propiedad/estadía, contenido visible, omisión de canarios sintéticos no seleccionados y ausencia de mutaciones. El resto del handler, su Auth, sus queries y sus controles SQL NO se ejecutan ni se sustituyen por una autoridad positiva.

Pruebas nuevas de herramientas de aceptación:

```text
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/minimal-beta-20261116-v1/acceptance-control.test.mjs
```

Tres controles del selector; no contarlos como evidencia funcional, de Auth o de SQL. Dos casos funcionales Node nuevos; uno se repitió para verificar la selección completa por CLI y se cuenta una sola vez. No hay nueva corrección de producto respaldada por estas comprobaciones. Beta NO-GO.
