# Che Vení — continuidad web sin ASUS

26/10/2026. **Beta NO-GO.** Rama `qa/cheveni-release-20261025`.

## Punto exacto

Cabecera verificada al inicio: `ceca956c7e12304337ad986b0b801415e8deb33b`. Se conservaron todos sus avances. Commit funcional nuevo: `b2579d37ddd709fb6d320744bd03a2de4c542ff8`. El commit que contiene este informe agrega evidencia y continuidad; continuar desde él o una cabecera posterior verificada.

Backend coordinado: incidencias `904a54549cd1e1ce4196f2ad19b24bdfeb4843d5`, aprendizaje `31aabb6a5467fa59cc45536a83b12a224a9daf4b`, A2 ficticia `617ea0669b48070e08d5a4a79fd46f0429e11775`, preparación/documentos `00ad218897f0a4f940a9e2c21b7148dc8186e7b1`.

## Defectos corregidos y alcance

`manager-incident-actions-v1.js` ahora persiste y comprueba la intención antes de POST de estado o propuesta de aprendizaje. Un fallo de almacenamiento impide despachar. Reload/render con marcador existente, respuesta tardía tras pagehide o token/generación reemplazados y resultados inciertos mantienen la acción bloqueada para conciliación.

Antes, el aprendizaje se infería por clave compartida/versión/cantidad. Ahora exige una coincidencia única de propiedad, categoría, draft, origen y marcador del incidente. La confirmación de una propuesta exige además los IDs del recibo y la lectura fresca del borrador. Una propiedad distinta, otro incidente, ambigüedad o simple HTTP200 no desbloquean el intento. Un cambio de estado normal solo retira el marcador tras lectura fresca coincidente; incertidumbre del aprendizaje automático lo conserva. Solo denegaciones explícitas previas al despacho revisadas permiten un nuevo intento deliberado.

**Límite:** sessionStorage es evidencia local de esa sesión de pestaña, no registro durable de servidor ni lock entre dispositivos. No reemplaza el control SQL por propiedad, el journal independiente ni la conciliación operativa. Los gates legales/comerciales permanecen cerrados.

## Pruebas nuevas

**16 casos nuevos únicos aprobados; cero fallos finales.** DOM, almacenamiento y fetch ficticios ejecutan los generadores reales de incidencias y acciones. No se hizo build general, navegador conectado ni prueba de servicios.

- Primeros 13: antes 1 pass / 12 fail; después 13/13.
- Tres casos añadidos: 3/3 ejecutando únicamente su selección por nombre, sin repetir los 13 ya aprobados.
- Comando principal: `node --test --test-reporter=tap qa/security/incident-intent-noasus-delta.test.cjs`.
- Selección posterior: `node --test --test-reporter=tap --test-name-pattern='known pre-dispatch incident|unclassified incident|late learning receipt' qa/security/incident-intent-noasus-delta.test.cjs`.

Logs y conteos en [evidence/incident-intent-results.json](evidence/incident-intent-results.json), `incident-intent-before.tap`, `incident-intent-after.tap` y `incident-intent-additional.tap`. Los reruns de desarrollo no son casos nuevos adicionales. No se ejecutaron suites históricas.

## Publicación y límites

Se compararon los seis blobs de código/prueba/evidencia publicados con sus bytes locales: todos coinciden, detalle en [source-publication.json](evidence/source-publication.json). [SHA256SUMS](SHA256SUMS) fija esos archivos; no se incluye a sí mismo ni este informe. [unchanged-controls.json](evidence/unchanged-controls.json) acredita que `vercel.json` y el gate legal conservan sus blobs. `git.deploymentEnabled:false` sigue presente.

La lectura de Actions conserva como último run web 40148316684, completado; no hubo dispatch nuevo. No se tocaron main/chebot-production ni servicios reales; sin mensajes, altas, datos personales reales, paquetes o costes nuevos.

## Continuidad

Consultar [matriz de lanzamiento](https://github.com/MarcoAlexis10/chebot-backend/blob/00ad218897f0a4f940a9e2c21b7148dc8186e7b1/ops/release/no-asus-20261026/MATRIZ-LANZAMIENTO.md), [procedimiento del primer manager y acciones de la noche](https://github.com/MarcoAlexis10/chebot-backend/blob/00ad218897f0a4f940a9e2c21b7148dc8186e7b1/ops/release/no-asus-20261026/PRIMER-MANAGER-Y-ACCIONES-NOCHE.md) y [revisión D01/D02-A](https://github.com/MarcoAlexis10/chebot-backend/blob/00ad218897f0a4f940a9e2c21b7148dc8186e7b1/ops/release/no-asus-20261026/REVISION-DOCUMENTAL-D01-D02A.md).

Pendientes obligatorios: instalación conjunta PostgreSQL nativo 17.11, compatibilidad Auth administrado, autorización transaccional por propiedad y registro independiente, recuperación integral/custodia, entregas reales autorizadas, revisión final documental y cobertura humana. No reintentar el laboratorio Work descartado, los nueve históricos, la consulta Auth consumida, A1 ni suites aprobadas. No activar .disabled.

Esta noche, cuando el propietario esté disponible: acreditar un ejecutor compatible/aislado/coste cero; si requiere adaptación ASUS/WSL, prepararla y revisarla antes de autorizar los siete casos. No hay paquete local acreditado listo para ejecutar ni permiso implícito de servicios. D01/D02-A no se reabren. La Beta sigue NO-GO.
