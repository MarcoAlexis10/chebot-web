# Che Vení — reparación estructural del bootstrap retenido — 16/11/2026

**Beta V1: NO-GO.** Corrección limitada a QA/offline. No se ejecutaron Node, PostgreSQL, SQL, Auth, navegador, COMMIT, infraestructura ni comandos ASUS. Backend y qa-lab permanecieron intactos.

## Fuente y defecto observado

Origen inmutable: `eabe70797f8c160870a66bffb95a508fd5606643`, cierre `qa/reviews/protected-property-engineering-20261116/CLOSURE.md`.

`qa/protected-property-engineering-20261116-v1/01-bootstrap-DO-NOT-APPLY.sql` contenía:
- Función de validación con `as $` y `end$;` en lugar de delimitadores completos.
- Predicado `restriction_journal !~` truncado.
- Un bloque duplicado de resolución y revocación incrustado entre la condición incompleta y el final de la primera función.
- Cuatro `CREATE FUNCTION` y dos `ROLLBACK` en vez de tres funciones y un rollback.

La revisión anterior había marcado PASS textual buscando fragmentos internos válidos; no era un parser PostgreSQL ni detectaba esa corrupción.

## Cambios QA

1. [`292e74cdd1909c476d8c19d6ce6d334a61d29da3`](https://github.com/MarcoAlexis10/chebot-web/commit/292e74cdd1909c476d8c19d6ce6d334a61d29da3): quita el bloque duplicado, completa delimitadores `$$`, restituye un predicado estricto `^qa_[a-z_]{1,64}$` como **propuesta pendiente de revisión de semántica**, y mantiene la llamada a `validate_property_cut_review_v1` en el resolver que se conserva. No retira guards incondicionales ni la clasificación DO NOT APPLY.
2. [`87fd2225ab23bb021adc9b532636a10b093ed9d9`](https://github.com/MarcoAlexis10/chebot-web/commit/87fd2225ab23bb021adc9b532636a10b093ed9d9): amplía `artifact-review.cjs` para rechazar cantidad incorrecta de funciones, cuerpos/delimitadores incompletos, más de un rollback y ausencia de conexión al validador del cut. Incluye la terminación del bloque DO inicial en el conteo.

## Evidencia efectivamente obtenida

Comprobación estructural JavaScript en V8 de orquestación sobre archivos recuperados por GitHub:
- Original roto: detectado por función duplicada, rollback duplicado y delimitador `as $`.
- Corrección: 3 declaraciones de función, 3 cuerpos de función y 1 DO abortivo, 1 rollback, ningún `as $` o `end$;`, una llamada integrada al validador.
- Los cuatro SQL retenidos pasan esos controles estructurales limitados. Se verificaron los cuatro abortos incondicionales del bootstrap reparado.
- No se ejecutó el checker CJS completo en Node, ni se efectuó parseo SQL, CREATE, DDL, RLS, Auth, writer o reader. **No declarar SQL_VALID ni PASS nativo.**

Los otros tres SQL no fueron modificados. No hay nueva autoridad producida ni puerto faltante implementado. Se preservan cuatro SQL REVIEW_ONLY_NOT_EXECUTED y los diez puertos ausentes.

## Continuación

Antes de una futura materialización, realizar revisión semántica del regex reconstruido, análisis completo de sintaxis PostgreSQL y dependencias, catálogo/roles/RLS, fuentes D1/D2 y custodio original con decisiones específicas D02-A. El runtime/laboratorio PostgreSQL 17.11 y las operaciones N01-N12/BPF01-BPF04 siguen sin acreditación ni autorización. Un rechazo por guard no demuestra las invariantes.

El próximo trabajo de infraestructura empieza con el preflight ASUS de solo lectura, con el propietario presente y pasos individuales. No utilizar SQL `DO NOT APPLY` como instalador. CABA, un manager fundador, una propiedad, trial 30 días desde estadía real verificada y sin cobro automático siguen intactos.

**NO-GO.**
