# Chebot Concierge Beta V1 — Catálogo gastronómico, siete ciudades

**Estado:** catálogo en staging para QA. **No publicado en el motor de WhatsApp.**
**Fecha del corte:** 2026-10-08.
**Origen:** [Matriz CSV de 159 restaurantes](./CHEBOT-MATRIZ-7-CIUDADES-22-BARRIOS-159-RESTAURANTES-2026-10-08.csv) en esta rama.

## Evidencia verificada en las integraciones

- Directorio web: **318 locales**, repartidos en **159 restaurantes + 159 bares**, siete ciudades y 22 barrios.
- Matriz gastronómica: **159 filas** y **22 columnas**.
- Especialidades con enlaces de evidencia registrados: **22**; pendientes de verificación por fuentes: **137**.
- Supabase **DEV solamente**: `public.concierge_gastronomy_catalog_staging` con **159 filas**, 7 ciudades y 22 barrios.
- Los `cuisine_tags` de DEV solo contienen etiquetas `source_backed`; los indicios derivados de nombres se guardan por separado en `cuisine_candidate_tags`, **no aptos para recomendar**.
- **0 restaurantes tienen la apertura de esta noche confirmada mediante esta matriz**. Los 22 registros respaldados por fuentes describen su gastronomía; no comprueban apertura ni mesas.
- La tabla de DEV tiene RLS activo. `anon` y `authenticated` no pueden consultarla; se reserva al rol de servicio.
- GitHub Backend, rama `concierge-v3-design`: `qa/gastronomia/DEV-ONLY-CONCIERGE-GASTRONOMY-STAGING-SCHEMA-2026-10-08.sql`, documento de referencia fuera de migraciones automáticas.

## Cobertura gastronómica por ciudad

| Ciudad | Barrios activos | Restaurantes | Con fuentes de especialidad | Pendientes |
|---|---:|---:|---:|---:|
| Buenos Aires | 10 | 63 | 6 | 57 |
| Madrid | 2 | 16 | 3 | 13 |
| Barcelona | 2 | 16 | 3 | 13 |
| Roma | 3 | 24 | 3 | 21 |
| Lisboa | 1 | 8 | 2 | 6 |
| Medellín | 2 | 16 | 3 | 13 |
| Río de Janeiro | 2 | 16 | 2 | 14 |
| **Total** | **22** | **159** | **22** | **137** |

## Contrato del futuro flujo «Sorprendeme con variedad»

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

## Bloqueadores antes de activar esta experiencia en el Preview

- [ ] Completar fuentes verificables de especialidad para los **137** registros pendientes (o dejar sin clasificar donde no haya respaldo).
- [ ] Verificar horarios pertinentes al día y franja solicitados; marcar explícitamente qué no se pudo confirmar.
- [ ] Asegurar variedad real por barrio, sin duplicados ni promesas de cercanía.
- [ ] Integrar el catálogo curado con el motor de recomendaciones de **Preview**, usando solo etiquetas aprobadas y horas confiables.
- [ ] Probar peticiones y seguimientos de WhatsApp en las siete ciudades, incluyendo **Demo Concierge #1**.
- [ ] Revisar que ningún cambio modifique `main`, `chebot-production` o los entornos de producción.

> **Regla de liberación:** los registros `pending` y `cuisine_candidate_tags` no habilitan una recomendación por especialidad. Esta preparación es solo staging/QA y no debe convertirse automáticamente en inventario público.

## Estado de la sesión

La carga a GitHub y a Supabase DEV está ejecutada y auditada. La funcionalidad completa de variedad gastronómica en WhatsApp **no está implementada ni validada todavía**, por lo que no se declara aprobada Beta #1.
