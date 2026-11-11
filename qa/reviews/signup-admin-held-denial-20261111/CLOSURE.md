# Che Vení Concierge Beta V1 — CLOSURE: alta administrativa y respuesta HOLD

**Fecha:** 11 de noviembre de 2026. **Estado:** `QA ONLY / EXACT GUARD REJECTION CLASSIFIED / BETA V1 NO-GO`.

**Repositorio:** `MarcoAlexis10/chebot-web`  
**Rama QA independiente:** `qa/cheveni-signup-admin-held-denial-20261111`  
**Base:** `35d2c10215a143ef750c6c6eca4b9cc6948ee98b` (incidencias HELD del 10/11).

## Problema reproducible desde el código original

El endpoint administrativo de invitaciones `chebot-backend/concierge-manager-signup-admin.js` exporta `withManagerReleaseHold(withManagerHttpIntent(signupAdminHandler))`. Con los dos hard-stops originales en su estado actual, la envoltura externa devuelve **HTTP 503** con el cuerpo:

```json
{"ok":false,"error":"MANAGER_OPERATIONS_NOT_RELEASED"}
```

Sin embargo, `manager-signup-admin-v1.js`, generador real de la consola web, sólo consideraba rechazos revisados cuando `knownDenial(resp.status,data.code)` devolvía verdadero. Como la envoltura usa `error` y no `code`, ese rechazo inequívocamente pre-dispatch quedaba clasificado como resultado incierto, preservando innecesariamente el intento durable del administrador.

No confundimos un 503 genérico con rechazo seguro; las respuestas inciertas deben seguir requiriendo conciliación y bloqueo de reintentos.

## Corrección publicada

Se modificó **únicamente en la nueva rama QA** el generador real `manager-signup-admin-v1.js`.

- Git blob antes: `8b5f8be1473924567cd4e9fd3163c092338c935b`.
- Git blob después: **`6a2b4cdfc0a4b27a6987e913a596ea14b19dfe88`**.
- Agregado: un reconocimiento estrecho de `releaseHeld`, que exige simultáneamente `resp.status===503`, `!resp.ok`, `data.ok===false`, `data.error==='MANAGER_OPERATIONS_NOT_RELEASED'`, `data.reconciliation_required!==true` y **únicamente las claves `error|ok`**, sin campos adicionales.
- El clasificador `knownDenial(status,code)` previo sigue intacto, junto con sus reglas 400/401/403/409/503. No se cambió el algoritmo durable, Auth, JWT, el backend ni los guards.
- Un proxy sin cuerpo, una excepción de red, un 500/502, un 503 distinto o una respuesta ambigua **no** se convierte en rechazo previo seguro.

La consola administrativa no fue enlazada ni desplegada; el build original `package.json` continúa en el blob `2fcc14494f8130625cc9acc514568d7d719e1282` y `vercel.json` sigue en `620ee85530ae3a417ee925e0f81e347a1dbec399` con `git.deploymentEnabled=false`.

## Evidencia ejecutada y límites

Se recuperó el generador real publicado desde GitHub, se confirmó el hash del blob modificado y se compiló el archivo completo en V8 sin ejecutarlo. Se extrajeron del **texto real** de ese mismo archivo la función `knownDenial` y el nuevo cálculo `releaseHeld/denied`.

**30 escenarios JavaScript sobre el código extraído: 30/30 coincidentes con las expectativas, cero fallos.** Cobertura: guard exacto; rechazos conocidos anteriores; 503 ambiguos; 500/502; campos faltantes y extra; cuerpo nulo/string/array; reconciliación obligatoria; `resp.ok` contradictorio; statuses anteriores 400/401/403/409.

Además, se realizó una comprobación local focalizada de 10 escenarios con **Node v22.16.0**, sobre la expresión de clasificación reproducida, 10/10 correctos; no es una ejecución del archivo completo del repositorio.

Se publicó un test Node con **31 casos preparados (1 pin de fuente + 30 escenarios)**:

`qa/security/signup-admin-held-denial-20261111.test.cjs`, Git blob **`745c5f6ae923ab72622baddb71f1d625aa260f8f`**.

**El test Node completo permanece `NOT_EXECUTED`** por ausencia de checkout privado completo en este contenedor y falta de acceso DNS a GitHub. No presentar los 31 casos como ejecutados. No se ejecutó navegador, no hubo pruebas de intercambio real con Vercel ni operaciones de signup.

**CORS:** una llamada del navegador bloqueada en preflight puede impedir leer incluso este rechazo exacto. En tal caso el frontend seguirá correctamente en modo incierto; esta corrección no modifica ni relaja las cabeceras CORS del servidor.

## Prioridad para el siguiente Work

1. Recuperar el **checkout completo** de `chebot-web` desde este HEAD y ejecutar el test Node nuevo contra el generador real; después las regresiones web afectadas, sin desplegar.
2. Recuperar un checkout completo de `chebot-backend` desde `569612e82c54f8f0bec5bd42e3a2aca47c70cb13`, verificar aislamiento físico/lógico del entorno antes de intentar correr **las siete suites integradas** del runner original.
3. Unificar comprobaciones de rutas y CORS entre frontend/backend **sin abrir** los hard-stops y sin alterar configuración DEV.
4. Dejar informe CLOSURE único, manifiesto de versiones y lista GO/NO-GO, sin atribuir pruebas no realizadas.

Puntos de referencia adicionales: `cheveni-qa-lab` Native17 policy `ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a` es cierre parcial documentado, no ensayo nativo instalado.

## Límites de seguridad y conclusión

No se tocaron DEV/PROD/main/DNS, Supabase, Auth, servicios externos, cron, Actions, despliegues, mensajes, datos personales, pagos ni el ASUS. No se alteró el hard-stop legal o de retención, ni se autorizó el laboratorio Native17 o el release.

**Beta V1: NO-GO.** CABA, un manager fundador y una propiedad, 30 días gratuitos sin cobro automático; Che Vení Free fuera del Concierge comercial.
