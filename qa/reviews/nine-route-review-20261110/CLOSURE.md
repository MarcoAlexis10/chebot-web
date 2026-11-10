# Che Vení Concierge Beta V1 — CLOSURE: contrato web QA de nueve rutas

**Fecha:** 10 de noviembre de 2026. **Estado:** `QA REVIEW ONLY / NODE 10/10 PASS / BETA V1 NO-GO`.

**Repositorio:** `MarcoAlexis10/chebot-web`  
**Rama nueva:** `qa/cheveni-nine-route-review-20261110`  
**Base fija:** `01b05e7e77626b8b4a5b636a3cd0516b8d7eef48` (`qa/cheveni-manager-qa-target-contract-20261109`).

## Hallazgo real y alcance de la corrección

La fuente web original contiene dos operaciones del panel que faltaban del fixture de revisión QA de siete rutas:

- `manager-incident-actions-v1.js`, Git blob `a0e4f24bbd184d3e931c053c81d82e14d52f4b57`: usa `config.apiUrl('incidents/state')`.
- `manager-request-actions-v1.js`, Git blob `902f02823b14f80ab6e5e52b2c808889d7718693`: usa `config.apiUrl('requests/decision')`.

El fixture existente `qa/cheveni-manager-qa-target-v1/qa-manager-review.cjs` (Git blob `a814d9f3bd2c226b1e8eddf18178809d6a4cbe81`) enumera siete rutas. En `chebot-backend` la revisión anterior ya había identificado esas otras dos rutas y las mantenía retenidas mediante el adaptador de nueve rutas, pero el contrato web QA no reflejaba esa cobertura.

Se creó **un sucesor QA no instalable**, sin modificar el fixture previo ni el build productivo:

- `qa/cheveni-manager-qa-target-v1/qa-manager-nine-route-review.cjs` — Git blob **`e63e31ceeed7faccc07ee7f78b58bc4e071555e7`**.
- `qa/cheveni-manager-qa-target-v1/qa-manager-nine-route-review.test.cjs` — Git blob **`a98933b4a7a2651949f51979c12fcbb25be9d15e`**.

El sucesor **importa el fixture original auténtico**, verifica su blob antes de ejecutarlo, preserva los siete endpoints existentes y añade únicamente `incidents/state` y `requests/decision`. El DTO resultante es inmutable y sigue con `HELD`, `buildWired=false`, `backendConnected=false`, `authVerified=false`, `mayDeploy=false`, `mayInviteRealGuest=false`, `mayWrite=false` y `releaseApproved=false`.

La configuración sólo permite orígenes inertes `*.example` y el marcador publicable ficticio ya definido; rechaza DEV, otros proyectos Supabase, endpoints operativos, claves privadas, variables de automatización y flags de activación incluso vacías o falsas. **No configura un navegador ni realiza ninguna solicitud de red**.

## Ejecución comprobada en Node real

El archivo del fixture anterior se reconstruyó localmente y se comparó con su Git blob `a814d9f3bd2c226b1e8eddf18178809d6a4cbe81`. Los dos archivos nuevos se ejecutaron en **Node v22.16.0**:

```sh
node --test qa/cheveni-manager-qa-target-v1/qa-manager-nine-route-review.test.cjs
```

**Resultado: 10/10 PASS, 0 FAIL, 0 SKIP, exit 0.**  
Log TAP local SHA-256: `300ceef0c23c0fcd8a2ed1bac8c497279d26f4dfbe4ace646e3b88ad2972df4b`.

Pruebas ejecutadas: pin del archivo fuente auténtico; nueve rutas y dos acciones; preservación de siete URLs; propiedades HELD e inmutabilidad; rechazo de hosts reales; rechazo de Supabase DEV u otros proyectos; claves y contextos operativos incluso vacíos; selector y claves de liberación rechazados; orígenes inválidos; ausencia de configuración no puede generar un contrato activo.

**Los Git blobs de los dos archivos publicados se cotejaron con los bytes exactos ejecutados localmente (2/2 coincidencias).** No se recontaron como nuevas las 11 pruebas del fixture anterior ni otras suites históricas.

## Fuente real versus integración pendiente

El `package.json` web original (Git blob `2fcc14494f8130625cc9acc514568d7d719e1282`) sigue invocando `manager-build-config.cjs`, que permanece anclado a DEV. El `vercel.json` original (Git blob `620ee85530ae3a417ee925e0f81e347a1dbec399`) conserva `git.deploymentEnabled=false`. **El sucesor QA de nueve rutas NO está conectado al build real ni al backend Vercel.** La prueba no acredita API HTTP de nueve rutas, Auth administrado, permisos SQL, seguridad de mutaciones ni funcionamiento del manager en navegador.

## Próxima tarea con mayor impacto

1. En un checkout QA íntegro, ejecutar las siete suites backend pendientes y validar el contrato de las nueve rutas con los handlers originales en un proceso HTTP local, preservando el 503.
2. Preparar, sin instalar, un sucesor de build web que use **explícitamente** el proyecto QA sin modificar ni habilitar la configuración DEV, con siete lecturas y dos acciones protegidas.
3. Mantener **NO-GO** hasta PostgreSQL 17.11 real (H07/H10/RLS/ACL), Auth y revocación JWT, recuperación A2, privacidad D02-A/legal, WhatsApp con consentimiento y GO comercial del propietario.

**Restricciones:** sin DEV/PROD/main/DNS, Supabase remoto, Vercel, SQL, GitHub Actions, cron, datos reales, claves, correos, WhatsApp, gastos ni ASUS. Beta comercial CABA: un manager fundador, una propiedad, 30 días gratis sin cobro automático; Che Vení Free aislado. **BETA V1 NO-GO.**
