# CHE VENÍ CONCIERGE BETA V1 — WORK HANDOFF · 11/11/2026

**Decisión:** BETA V1 NO-GO. Este archivo es un checkpoint de continuidad, no un permiso para activar infraestructura.

## 1. Tres referencias verificadas y evidencia de recuperación

| Componente | Repositorio | Rama QA | HEAD base observado |
| --- | --- | --- | --- |
| Frontend de managers | `MarcoAlexis10/chebot-web` | `qa/cheveni-signup-admin-held-denial-20261111` | `480f3b66a738411af699d4e78038402491abf2cc` (cierre actual antes de añadir este handoff) |
| Backend | `MarcoAlexis10/chebot-backend` | `qa/cheveni-signup-route-contract-20261110` | `569612e82c54f8f0bec5bd42e3a2aca47c70cb13` |
| Native17 y laboratorio | `MarcoAlexis10/cheveni-qa-lab` | `qa/cheveni-native17-policy-closure-20261106` | `ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a` |

**Primero consultar HEADs reales en GitHub.** Work puede encontrar commits posteriores; nunca resetear, sobrescribir ni hacer force-push. No tocar main, PROD, DEV, DNS, Vercel ni Supabase.

Evidencia de origen prioritaria:

- `chebot-web/qa/reviews/signup-admin-held-denial-20261111/CLOSURE.md` — cambio QA nuevo, 30 escenarios V8 aprobados; 31 Node casos preparados, **NO EJECUTADOS**.
- `chebot-web/qa/reviews/incident-held-denial-20261110/CLOSURE.md` — 20 escenarios V8, Node no ejecutado.
- `chebot-web/qa/reviews/nine-route-review-20261110/CLOSURE.md` — fixture 9 rutas, Node 10/10 ejecutado en entorno local, no conectado al build.
- `chebot-backend/qa/reviews/signup-route-contract-20261110/CLOSURE.md` — 14/14 Node sobre ruta signup-request con QA-shim, no index.js real.
- `chebot-backend/qa/reviews/one-batch-context-guard-20261110/CLOSURE.md` — guard runner Node 14/14, siete suites **NOT_EXECUTED_TOGETHER**.
- `cheveni-qa-lab/qa/reviews/native17-policy-closure-20261107/CLOSURE.md` — recuperación parcial documentada; **NO RE-EJECUTAR** las 15 verificaciones históricas ni asumir que el laboratorio PG17.11 quedó aprobado.

## 2. Primera tarea de Work: integración real, sin trabajo duplicado

1. Verificar HEADs y leer cierres con el conector de GitHub.
2. Obtener un **checkout completo** de frontend y backend, sin copiar fuentes sueltas para simular imports. Si falla autenticación, no gastar el turno en bucles de login: reportar bloqueo y avanzar sólo en tareas offline disponibles.
3. **Ejecutar en checkout web**:
   `node --test qa/security/signup-admin-held-denial-20261111.test.cjs`.
   Confirmar su pin de fuente y los **31 casos** (si se ejecutan); ejecutar después regresiones específicamente afectadas, no suites históricas repetidas.
4. **Ejecutar las siete suites backend** a través del runner original `qa/cheveni-manager-held-qa-successors-v1/run-held-batch.mjs --review-only` **únicamente después de comprobar aislamiento de egress de red por medios externos al script** y cumplir todas sus verificaciones. No cambiar hashes, flags, RLS, Auth o guardas para forzar un PASS.
5. Si el entorno no garantiza aislamiento, **NO ejecutar** el runner: registrar la causa y continuar con revisión de fuente/fixtures e integración segura de build QA. Nunca inventar resultados de la suite.
6. Preparar una prueba real de la cadena `frontend -> vercel routing contract -> original handler` en checkout aislado, respetando el hard-stop legal. El original `index.js` del backend de ~477 KB todavía **NO ha sido importado ni ejecutado** en la QA local previa. No llamar E2E al adaptador QA que sólo reproduce su pathname.
7. Confirmar que el endpoint original de signup usa **`/api/concierge/manager/signup-request`** (no `/signup`), y que los nueve endpoints del panel coinciden entre backend y frontend, inclusive `incidents/state` y `requests/decision`.
8. Revisar con pruebas de navegador verdaderas, si es seguro, la visibilidad CORS de los rechazos HELD. Ante respuesta no legible por el navegador, mantener la intención en revisión. No abrir CORS ni relajar hard-stops para hacer pasar la prueba.
9. Sólo después, consolidar candidato release QA offline: manifiesto web/backend y versiones de migraciones, variables sin secretos, guía de activación/reversión **no ejecutable**, matriz GO/NO-GO del piloto CABA.

## 3. Límites que Work debe respetar sin excepciones

No hay autorización para modificar DEV/PROD/main/chebot-production/DNS; desplegar; activar workflows, cron o CI4/Native34; ejecutar SQL remoto ni Supabase; usar ASUS, Docker externo, Work para correos/WhatsApp reales; gastos adicionales; datos privados; claves; registros, invitados o cobros reales; firmar permisos; levantar el 503 prelegal/retención.

No inventar compatibilidad PostgreSQL 17.11, concurrencia nativa, JWT/Auth, recuperación A2 ni D02-A/legal. Native17 sigue **PRE-FLIGHT NO-GO** hasta haber satisfecho sus condiciones de aislamiento, roles/ACL/RLS, políticas y autorización separada.

## 4. Cómo comunicar resultados

Trabajar en ramas QA nuevas desde HEADs observados, sin merges. Asegurar que no hay trigger de Actions en la rama antes de publicar, y usar `[skip ci]` en commits. Publicar incrementalmente hallazgos verificables, para recuperación si Work termina por cuota.

Entregar **un único `CLOSURE.md` final con enlace directo**, HEADs, hashes, comandos ejecutados, totales PASS/FAIL/SKIP, evidencias de aislamiento, diferencias corregidas y bloqueos restantes. Separar expresamente los casos que corrieron de los diseñados pero no ejecutados. No ZIP.

**Objetivo comercial invariable:** primer manager fundador en CABA, una propiedad, 30 días gratis sin cobro automático, Che Vení Free aislado. No comunicar GO hasta cerrar requisitos técnicos, legales y de operación.
