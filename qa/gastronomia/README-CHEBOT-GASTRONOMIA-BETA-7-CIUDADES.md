# Chebot Concierge Beta V1 — Catálogo gastronómico, siete ciudades

**Estado:** catálogo DEV en staging; lectura selectiva conectada al Backend **Preview** para registros con especialidad respaldada y horarios semanales publicados vigentes. Aún requiere prueba WhatsApp real y NO está en producción.
**Fecha del corte:** 2026-10-08.
**Origen:** [Matriz CSV de 159 restaurantes](./CHEBOT-MATRIZ-7-CIUDADES-22-BARRIOS-159-RESTAURANTES-2026-10-08.csv) en esta rama.

## Evidencia verificada en las integraciones

- Directorio web: **318 locales**, repartidos en **159 restaurantes + 159 bares**, siete ciudades y 22 barrios.
- Matriz gastronómica: **159 filas** y **29 columnas**.
- Especialidades con enlaces de evidencia registrados: **47**; pendientes de verificación por fuentes: **112**.
- Supabase **DEV solamente**: `public.concierge_gastronomy_catalog_staging` con **159 filas**, 7 ciudades y 22 barrios.
- Los `cuisine_tags` de DEV solo contienen etiquetas `source_backed`; los indicios derivados de nombres se guardan por separado en `cuisine_candidate_tags`, **no aptos para recomendar**.
- **19 restaurantes tienen un horario semanal publicado y registrado con fuente oficial**, pero **0 tienen confirmación de apertura real ni mesas reservables**. El dato semanal es revisable y no garantiza disponibilidad.
- La tabla de DEV tiene RLS activo. `anon` y `authenticated` no pueden consultarla; se reserva al rol de servicio.
- GitHub Backend, rama `concierge-v3-design`: `qa/gastronomia/DEV-ONLY-CONCIERGE-GASTRONOMY-STAGING-SCHEMA-2026-10-08.sql`, documento de referencia fuera de migraciones automáticas.

## Cobertura gastronómica por ciudad

| Ciudad | Barrios activos | Restaurantes | Con fuentes de especialidad | Pendientes |
|---|---:|---:|---:|---:|
| Buenos Aires | 10 | 63 | 16 | 47 |
| Madrid | 2 | 16 | 3 | 13 |
| Barcelona | 2 | 16 | 8 | 8 |
| Roma | 3 | 24 | 8 | 16 |
| Lisboa | 1 | 8 | 3 | 5 |
| Medellín | 2 | 16 | 6 | 10 |
| Río de Janeiro | 2 | 16 | 3 | 13 |
| **Total** | **22** | **159** | **47** | **112** |

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

## Advertencias operativas detectadas

- **Farinè la Pizza**, San Lorenzo (Roma): el sitio oficial anuncia cierre definitivo el 9 de agosto de 2026. En DEV staging el registro está `closed_permanently` y un constraint impide activarle horarios verificados. Debe excluirse también del directorio visible cuando se audite el sitio.
- **Veg World India**, Gràcia (Barcelona): su página oficial confirma **Carrer de Bruniquer 24**; hay fuentes que apuntan al 26. Revalidar ubicación exacta antes de recomendar una dirección.
- Horario semanal publicado = **compatibilidad teórica con franja horaria**. Nunca decir «hay mesa» ni afirmar apertura en tiempo real.
- La llamada de escritura de protección adicional al `index.js` fue bloqueada por controles de herramienta. El constraint de DEV impide que un local cerrado tenga `dinner_hours_status='verified'`, y Farinè no está habilitado para recomendaciones. Reintentar solo mediante una vía autorizada.
- No se han activado extensiones post-beta.

## Bloqueadores antes de activar esta experiencia en el Preview

- [ ] Completar fuentes verificables de especialidad para los **112** registros pendientes (o dejar sin clasificar donde no haya respaldo).
- [ ] Verificar horarios pertinentes al día y franja solicitados; marcar explícitamente qué no se pudo confirmar.
- [ ] Asegurar variedad real por barrio, sin duplicados ni promesas de cercanía.
- [x] Conectar lectura **Preview**, protegida por `VERCEL_ENV=preview` + referencia Supabase DEV, a fuentes de especialidad y horarios publicados recientes. Esta integración requiere prueba funcional final.
- [ ] Probar peticiones y seguimientos de WhatsApp en las siete ciudades, incluyendo **Demo Concierge #1**.
- [ ] Revisar que ningún cambio modifique `main`, `chebot-production` o los entornos de producción.

> **Regla de liberación:** los registros `pending` y `cuisine_candidate_tags` no habilitan una recomendación por especialidad. Esta preparación es solo staging/QA y no debe convertirse automáticamente en inventario público.

## Estado de la sesión

La carga a GitHub y a Supabase DEV está ejecutada y auditada. La lectura filtrada y el clasificador de especialidades en Preview están implementados; **NO hay todavía demostración completa de WhatsApp con tres estilos**, y no se declara aprobada Beta #1.
