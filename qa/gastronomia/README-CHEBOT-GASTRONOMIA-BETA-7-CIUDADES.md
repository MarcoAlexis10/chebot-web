# Chebot Concierge Beta V1 — Catálogo gastronómico, siete ciudades

**Estado:** catálogo DEV en staging y recomendaciones gastronómicas conectadas a **Backend Preview**. La Demo #1 validó respuestas, elección directa, Maps, «Elegir otro» y cambio de barrios; queda regresión de diversidad Palermo y cobertura del resto de ciudades. NO está en producción.
**Fecha del corte:** 2026-10-08 (ampliación Palermo y criterio de variedad).
**Origen:** [Matriz CSV de 159 restaurantes](./CHEBOT-MATRIZ-7-CIUDADES-22-BARRIOS-159-RESTAURANTES-2026-10-08.csv) en esta rama.

## Evidencia verificada en las integraciones

- Directorio web: **318 locales**, repartidos en **159 restaurantes + 159 bares**, siete ciudades y 22 barrios.
- Matriz gastronómica: **159 filas** y **29 columnas**.
- Especialidades con enlaces de evidencia registrados en DEV: **50**; pendientes de verificación por fuentes: **112** (base inicial + tres verificaciones nuevas).
- Supabase **DEV solamente**: `public.concierge_gastronomy_catalog_staging` con **162 filas** = **159 de la matriz original + 3 suplementos verificados en Palermo**; 7 ciudades y 22 barrios.
- Los `cuisine_tags` de DEV solo contienen etiquetas `source_backed`; los indicios derivados de nombres se guardan por separado en `cuisine_candidate_tags`, **no aptos para recomendar**.
- **25 restaurantes tienen horarios semanales publicados registrados con fuentes**; **0 tienen confirmación de apertura en tiempo real ni mesas reservables**. El horario puede diferir del cierre real de cocina.
- La tabla de DEV tiene RLS activo. `anon` y `authenticated` no pueden consultarla; se reserva al rol de servicio.
- GitHub Backend, rama `concierge-v3-design`: `qa/gastronomia/DEV-ONLY-CONCIERGE-GASTRONOMY-STAGING-SCHEMA-2026-10-08.sql`, documento de referencia fuera de migraciones automáticas.

## Avance en Recoleta

En la Demo #1 se mostraba solo Roux. Ahora **Piegari Ristorante, Elena y Duhau Restaurante y Vinoteca** tienen horarios de cena publicados por sus respectivas páginas oficiales para el barrio de Recoleta. Las especialidades principales son pastas italianas (Piegari) y parrilla/carnes (Elena y Duhau); Roux ya tenía información de horarios en el seed del backend. Esto habilita una prueba de WhatsApp con más de una opción sin inventar horarios, pero **no confirma mesas ni apertura real**.

Fuentes: [Piegari](https://www.piegari.com.ar/), [Elena (Four Seasons)](https://www.fourseasons.com/buenosaires/dining/restaurants/elena.html/), [Duhau (Hyatt)](https://www.hyatt.com/park-hyatt/es-ES/bueph-palacio-duhau-park-hyatt-buenos-aires/dining).

## Ampliación de Palermo y separación de «pareja» vs cocina

**Hallazgo de Demo #1:** una búsqueda «cenar en Palermo con mi pareja; sorprendeme con variedad» devolvía dos parrillas, y antes un bar con gastronomía. El atributo «pareja» describe compañía/ocasión, **no una categoría gastronómica**.

- Backend `concierge-v3-design`: la petición explícita de comer/cenar se interpreta como plan `food`; `companions=couple` se conserva independientemente. Un plan de cita sin comida explícita aún puede tener `plan=date`. Se mantiene la exclusión de bares en las búsquedas de cena.
- El motor prioriza **tres especialidades con fuente** distintas cuando existen entre locales que cumplen horario, ciudad y barrio. No asigna un «estilo» a locales sin especialidad comprobada ni inventa una tercera alternativa.
- A hora muy tardía «esta noche» requiere horario publicado todavía compatible y tiempo suficiente para cenar; no promete que la cocina o las reservas sigan funcionando.
- Al haber solo uno o dos estilos, lo dice de manera natural y ofrece otro horario o ampliar zona.
- Nuevos **suplementos de DEV** (no incorporados a la matriz CSV original ni al directorio web):
  1. **Cucina Paradiso Palermo Soho** — Armenia 1610; italiana y pastas, todos los días 09:00–00:00 según [sitio oficial](https://www.cucinaparadiso.com/); no debería figurar a las 23:50 como una cena completa.
  2. **SushiClub Las Cañitas (RESTÓ)** — Báez 268; sushi y cocina japonesa, horarios de salón publicados hasta las 01:30 el jueves y las 02:00 viernes/sábado según [locales oficiales](https://www.sushiclub.com.ar/nuestros_espacios.php?provincia=2). **No confundir con SushiClub Palermo Deli & Take (Charcas 3673)**.
  3. **Isla Negra Palermo** — Gurruchaga 1450; cocina de autor de origen regional, pescados y pastas, cierre 00:00 habitual y 01:00 viernes/sábado según [web oficial](https://islanegraresto.com/menu).
- La ampliación es **solo staging/Preview**. No implica reserva ni servicio de cocina confirmados; la selección por horario depende de día, hora y evidencia.
- Los criterios generales se aplican a las siete ciudades, pero **no se considera verificada la variedad completa en los 22 barrios**.

## Cobertura gastronómica por ciudad

| Ciudad | Barrios activos | Restaurantes | Con fuentes de especialidad | Pendientes |
|---|---:|---:|---:|---:|
| Buenos Aires | 10 | 66 | 19 | 47 |
| Madrid | 2 | 16 | 3 | 13 |
| Barcelona | 2 | 16 | 8 | 8 |
| Roma | 3 | 24 | 8 | 16 |
| Lisboa | 1 | 8 | 3 | 5 |
| Medellín | 2 | 16 | 6 | 10 |
| Río de Janeiro | 2 | 16 | 3 | 13 |
| **Total DEV** | **22** | **162** | **50** | **112** |

## Contrato vigente en Preview del flujo «Sorprendeme con variedad»

1. Entender **cena/almuerzo/ahora** y fecha ya mencionados; no repetir preguntas innecesarias.
2. Conservar ciudad, barrio, compañía, presupuesto y preferencias durante las respuestas.
3. Interpretar especialidades (`pizza`, `hamburguesas`, `parrilla_carnes`, `pastas_italiana`, `sushi_japonesa`, `bodegon_casera`, etc.) y ocasión por separado. Adaptar comida típica local en cada ciudad.
4. Para «Sorprendeme», elegir **hasta tres locales válidos de especialidades diferentes**, si existen. Nunca inventar tres para completar cuota.
5. Para búsquedas «esta noche», aplicar **horarios verificables y vigentes**. No interpretar un horario publicado como mesa reservable. En horario dudoso, comunicar incertidumbre y ofrecer otro barrio o día.
6. Si solo queda una opción verificable, mostrar una sola sin preguntar «¿Cuál de las tres te gusta?».
7. Vegano, celíaco/sin gluten o necesidades especiales: considerar solo a pedido explícito, no atribuir aptitud sanitaria sin respaldo.
8. Cuando falte barrio o cobertura, ofrecer «Ver barrios». Nunca inventar proximidad o precios.
9. Mantener diferenciados filtros gastronómicos y seguridad/accesos del alojamiento Concierge.
10. Los textos y los botones deben contemplar español, inglés, italiano y portugués.

## Advertencias operativas detectadas

- **Farinè la Pizza**, San Lorenzo (Roma): el sitio oficial anuncia cierre definitivo el 9 de agosto de 2026. En DEV staging el registro está `closed_permanently` y un constraint impide activarle horarios verificados. Debe excluirse también del directorio visible cuando se audite el sitio.
- **Veg World India**, Gràcia (Barcelona): su página oficial confirma **Carrer de Bruniquer 24**; hay fuentes que apuntan al 26. La dirección del directorio coincide con la oficial, pero se deja aviso QA para reconfirmar el acceso.
- Horario semanal publicado = **compatibilidad teórica con franja horaria**. Nunca decir «hay mesa» ni afirmar apertura en tiempo real.
- El Backend Preview filtra explícitamente `operational_status=neq.closed_permanently` además del constraint de Supabase DEV; esto impide recomendar el local cerrado de Roma desde el staging. Mantener la exclusión al auditar el directorio público.
- No se han activado extensiones post-beta.

## Verificaciones pendientes para cerrar esta experiencia en Beta

- [ ] Completar fuentes verificables de especialidad para los **112** registros pendientes (o dejar sin clasificar donde no haya respaldo).
- [ ] Verificar horarios pertinentes al día y franja solicitados; marcar explícitamente qué no se pudo confirmar.
- [ ] Asegurar variedad real por barrio, sin duplicados ni promesas de cercanía.
- [x] Conectar lectura **Preview**, protegida por `VERCEL_ENV=preview` + referencia Supabase DEV, a fuentes de especialidad y horarios publicados recientes. Esta integración requiere prueba funcional final.
- [x] Probar recomendaciones en Recoleta, selección, Maps, volver a elegir, «Más opciones» y cambio a Palermo dentro de la Demo Concierge #1.
- [ ] Repetir prueba en Palermo con **carne, sushi y pastas** en una franja de cena compatible; verificar que a las 23:50 no ofrezca una cocina cuyo horario ya termina a medianoche.
- [ ] Probar peticiones y seguimientos de WhatsApp para las otras seis ciudades y los casos sin horarios respaldados.
- [ ] Revisar que ningún cambio modifique `main`, `chebot-production` o los entornos de producción.

> **Regla de liberación:** los registros `pending` y `cuisine_candidate_tags` no habilitan una recomendación por especialidad. Esta preparación es solo staging/QA y no debe convertirse automáticamente en inventario público.

## Estado de la sesión

La ampliación y la separación de compañía/plan están implementadas en Backend Preview. La Demo #1 ya verificó recomendaciones, selección y navegación por WhatsApp, pero **todavía falta validar la combinación de tres estilos en una sesión real de Palermo**, además de otros flujos Concierge. No se declara aprobada toda la Beta #1.
