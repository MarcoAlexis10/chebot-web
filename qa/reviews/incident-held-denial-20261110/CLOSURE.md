# Che Vení Concierge Beta V1 — CLOSURE · Clasificación segura del bloqueo 503 en incidencias

**Fecha:** 10/11/2026 · **Resultado:** `QA STATIC-FUNCTION V8 PASS 20/20 / NODE SUITE PREPARED NOT RUN / BETA V1 NO-GO`.

**Repo:** `MarcoAlexis10/chebot-web`  
**Nueva rama:** `qa/cheveni-incident-held-denial-20261110`  
**Base:** `eac60ae1a6cdcca2e91ec7d405dc6fb3aa840813`  
**Cambios:** únicamente `manager-incident-actions-v1.js` en esta rama y una suite QA nueva. No modificó servicios ni entornos.

## Hallazgo

El backend original `chebot-backend/concierge-manager-incidents.js` está exportado como `withManagerReleaseHold(withManagerHttpIntent(handler))`: el bloqueo legal `withManagerReleaseHold`, fuente original con Git blob `a4b793d2ed357fe3dda342c58439f9fae81b16da`, responde antes de despachar cualquier handler con **503** y cuerpo exacto `{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED'}`. La barrera `managerLegalAdmissionReady() = false` y `conciergePrelegalSensitiveHold() = true` siguen intactas.

El frontend de decisiones de solicitudes ya reconoce `503 MANAGER_OPERATIONS_NOT_RELEASED` como rechazo predispatch, sin exigir conciliación. En cambio, el frontend de **incidencias** sólo incluía 400/401/403/404/409 en su clasificador, con lo que un bloqueo 503 recibido en forma confiable se trataba como incertidumbre; podía conservar innecesariamente el intento en estado de revisión.

## Cambio en QA

Se modificó sólo `manager-incident-actions-v1.js`, Git blob anterior **`a0e4f24bbd184d3e931c053c81d82e14d52f4b57`**, nuevo Git blob **`de4e788b944f3c8d3f8ba115e4c54ace6ddecf70`**.

La función interna `knownPreDispatchDenial(response,body)` ahora añade exclusivamente la combinación exacta:

- `response.status === 503`
- `body.ok === false`
- `body.error === 'MANAGER_OPERATIONS_NOT_RELEASED'`
- `body.reconciliation_required !== true`
- `body.learning?.reconciliation_required !== true`

**Cualquier 503 diferente, 500/502, respuesta marcada para conciliación o cuerpo inválido permanece incierto y debe conservar el intento para revisión.** La lista anterior de errores conocidos 400/401/403/404/409 se conserva, sin otras relajaciones. Se verificó que esta función es utilizada por **dos flujos** del panel: propuesta de aprendizaje y modificación de estado de incidencia.

El archivo nuevo `qa/cheveni-manager-qa-target-v1/incident-held-denial-review.test.cjs` (Git blob **`d914cb72400030e9b2ba9baf6cfb2c173c6c0e84`**) extrae la función del **archivo real** fijado por Git blob SHA y prepara 21 pruebas Node (1 de integridad + 20 escenarios). No requiere ni invoca API, navegador, SQL ni red.

## Evidencia ejecutada, con límites exactos

Se recuperó desde GitHub el archivo modificado y se comparó su hash Git SHA con el contenido publicado. Sobre la **función real extraída de ese archivo** se ejecutaron **20 casos de V8/JavaScript: 20 PASS / 0 FAIL**. Se compiló sintácticamente el archivo completo en V8, sin ejecutar su generador ni modificar `dist`. Se comprobaron las **dos** llamadas al clasificador y que `package.json` conserva su blob original `2fcc14494f8130625cc9acc514568d7d719e1282`, `vercel.json` conserva `git.deploymentEnabled=false`.

**No se ejecutó el archivo Node `*.test.cjs` completo en el contenedor:** éste carece del checkout web local; queda `PREPARED_NOT_EXECUTED`. No sumar 21 pruebas Node aprobadas. La evidencia 20/20 corresponde a V8 sobre la función publicada, con datos ficticios, no a integración HTTP ni al navegador.

## Precaución crítica sobre CORS

El `503` que produce el guard backend externo puede carecer de encabezados CORS de ese handler. Si el navegador recibe un fallo de preflight o bloqueo CORS, **no tendrá acceso a ese cuerpo JSON** y seguirá correctamente en modo de incertidumbre. Esta corrección QA no asegura que el rechazo llegue a ser visible en una aplicación real ni justifica modificar el guard o abrir CORS de operaciones. Para evaluar el resultado funcional será necesaria una prueba de navegador contra el router completo y las políticas CORS originales; **no alterar las políticas de seguridad para forzar el test**.

## Siguiente prioridad de lanzamiento

Ejecutar las siete suites backend en un checkout íntegro y entorno aislado, posteriormente probar navegador y nueve rutas manager end-to-end con origen QA, sin habilitar la barrera legal. Las puertas Native17 PostgreSQL 17.11/RLS/ACL/H07/H10/concurrencia, revocación JWT, recuperación A2, D02-A/legal, WhatsApp con consentimiento y GO del fundador siguen `NO-GO`.

**Límites respetados:** nada de DEV/PROD/main, despliegues, DNS, GitHub Actions, cron, claves, datos reales, Supabase remoto, pagos, mensajes, ASUS ni gastos. Piloto previsto: CABA, un manager fundador, una propiedad, 30 días de prueba sin cobro automático y Free separado.
