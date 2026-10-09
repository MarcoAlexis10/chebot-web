# Chebot Concierge Beta V1 — Catálogo gastronómico, siete ciudades

**Estado:** catálogo DEV en staging y recomendaciones gastronómicas conectadas a **Backend Preview**. La Demo #1 validó respuestas, elección directa, Maps, «Elegir otro» y cambio de barrios; queda regresión de diversidad Palermo y cobertura del resto de ciudades. NO está en producción.
**Fecha del corte:** 2026-10-09 (reconciliación DEV ↔ matriz QA, con tres incorporaciones respaldadas para Palermo).
**Origen actual:** [Matriz CSV de 162 restaurantes (09/10/2026)](./CHEBOT-MATRIZ-7-CIUDADES-22-BARRIOS-162-RESTAURANTES-2026-10-09.csv). Se conserva intacta la [matriz anterior de 159](./CHEBOT-MATRIZ-7-CIUDADES-22-BARRIOS-159-RESTAURANTES-2026-10-08.csv) para auditoría; las tres incorporaciones existen también en Supabase DEV, no en el directorio público.

## Evidencia verificada en las integraciones

- Directorio web: **318 locales**, repartidos en **159 restaurantes + 159 bares**, siete ciudades y 22 barrios.
- Matriz gastronómica QA actual: **162 filas** y **29 columnas**, con los 159 registros originales preservados y tres registros nuevos en Palermo; relectura GitHub sin columnas desalineadas.
- Especialidades con enlaces de evidencia registrados en DEV: **50**; pendientes de verificación por fuentes: **112** (base inicial + tres verificaciones nuevas).
- Supabase **DEV solamente**: `public.concierge_gastronomy_catalog_staging` con **162 filas** = **159 del directorio original + 3 incorporaciones QA en Palermo**; 7 ciudades y 22 barrios. La matriz QA actual se reconcilió contra esas 162 filas.
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
- El motor prioriza **carne + pasta + sushi** para pedidos explícitos de «variedad» **si las tres especialidades pasan los filtros** de barrio, horario y evidencia; si falta una, completa con otra cocina verificada cuando puede. Esta preferencia no excluye pizza, bodegón, cocina local, autor ni otras especialidades. No asigna un «estilo» a locales sin especialidad comprobada ni inventa una tercera alternativa.
- **QA algoritmo 09/10/2026:** `index.js` usa ahora todas las etiquetas respaldadas de cada restaurante para elegir especialidades diferentes (commit Backend `f30e53e`); conserva la preferencia inicial carne/pasta/sushi solo si pasan las reglas. Validación previa al commit con las rutinas actuales y cuatro registros horarios de DEV: viernes 21:00 ⇒ carnes+pastas+sushi; viernes 23:50 ⇒ carnes+sushi+autor; sábado 00:10 ⇒ sushi. Misma elegibilidad con `companions=couple` y `friends`. Tres regresiones adicionales persistidas en `test/dated-restaurant-selection.test.js` (commit `ba7a6f3`). Esto es simulación técnica, **no prueba de respuesta por WhatsApp real**, ni disponibilidad de mesa.
- A hora muy tardía «esta noche» requiere horario publicado todavía compatible y tiempo suficiente para cenar; no promete que la cocina o las reservas sigan funcionando.
- Al haber solo uno o dos estilos, lo dice de manera natural y ofrece otro horario o ampliar zona.
- Tres **suplementos de DEV**, ahora incorporados en la **matriz QA de 162** (no en el directorio público ni en la matriz histórica de 159):
  1. **Cucina Paradiso Palermo Soho** — Armenia 1610; italiana y pastas, todos los días 09:00–00:00 según [sitio oficial](https://www.cucinaparadiso.com/); no debería figurar a las 23:50 como una cena completa.
  2. **SushiClub Las Cañitas (RESTÓ)** — Báez 268; sushi y cocina japonesa, horarios de salón publicados hasta las 01:30 el jueves y las 02:00 viernes/sábado según [locales oficiales](https://www.sushiclub.com.ar/nuestros_espacios.php?provincia=2). **No confundir con SushiClub Palermo Deli & Take (Charcas 3673)**.
  3. **Isla Negra Palermo** — Gurruchaga 1450; cocina de autor de origen regional, pescados y pastas, cierre 00:00 habitual y 01:00 viernes/sábado según [web oficial](https://islanegraresto.com/menu).
- **QA técnica 2026-10-09:** a las 21:00 del viernes, las franjas publicadas de La Cabrera, Cucina Paradiso Palermo Soho y SushiClub Las Cañitas cubren al menos una hora (además de Isla Negra). Verificación de coincidencia horaria por Supabase DEV; **no es apertura real ni mesa confirmada**. La rutina de diversidad fue probada con casos de tres, dos y una sola cocina, y sin locales inventados. **Falta confirmación por WhatsApp real**.
- La ampliación es **solo staging/Preview**. No implica reserva ni servicio de cocina confirmados; la selección por horario depende de día, hora y evidencia. Las Cañitas figura operacionalmente bajo el área Palermo para recomendaciones, aunque conviene tratarlo como subzona explícita en UI; se validó que SushiClub Báez 268 es RESTÓ, distinto de la sucursal Deli & Take.
- Los criterios generales se aplican a las siete ciudades, pero **no se considera verificada la variedad completa en los 22 barrios**.

## Evidencia WhatsApp real — Palermo, viernes 09/10/2026

- **Resultado: APROBADO para variedad de tres especialidades y botones nativos.**
- Evidencia: dos capturas de WhatsApp proporcionadas en la conversación de QA, hora visualizada **00:52** (Argentina), con petición exacta: «Quiero cenar el 9/10/2026 a las 21:00 en Palermo con mi pareja. Sorprendeme con variedad.»
- Respuesta observada: **1. Don Julio — parrilla y carnes; 2. Cucina Paradiso Palermo Soho — pastas italianas; 3. SushiClub Las Cañitas — sushi y japonés**. Cada uno con breve descripción amistosa.
- Incluyó advertencia «Horarios publicados: confirmá antes de ir. Mesas sin confirmar.» y **tres botones nativos** «1. Don Julio», «2. Cucina Paradiso», «3. SushiClub Las» (el tercero abreviado por el límite de título de WhatsApp; nombre completo en el texto).
- **Diferencia esperada vs observada:** la simulación técnica con staging puro seleccionó La Cabrera como parrilla; WhatsApp eligió Don Julio. Ambos pertenecen al mismo estilo. Es compatible con el ranking combinado (seed + staging) y **no requiere forzar un nombre** para aprobar diversidad.
- Esta captura verifica generación, entrega y presentación de la lista y botones; **no** verifica pulsación de esos botones en esta ejecución, confirmación de cocina/mesa, ni la búsqueda tardía a las **23:50**. Selección y Maps sí tienen evidencia de regresiones anteriores de Recoleta.
- Mantener abierta Demo #1 por incidencias, solicitudes y regresiones de flujos Concierge. No inferir cobertura homogénea de las siete ciudades.

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
- [x] Ejecutar prueba técnica de `rankVenues` con datos staging: tres estilos a las 21:00; excluir pastas con margen insuficiente a las 23:50; limitar a sushi a las 00:10. Evidencia de prueba aislada 09/10/2026.
- [x] Prueba **WhatsApp real** del 09/10/2026 a las 21:00 en Palermo con pareja y variedad: Don Julio (carne), Cucina Paradiso (pastas), SushiClub Las Cañitas (sushi), tres botones nativos y textos descriptivos; capturas verificadas.
- [ ] Prueba **WhatsApp real** de cena tardía (p. ej. 23:50): no sugerir restaurantes sin tiempo suficiente respecto del cierre publicado; diferenciar horario general, cocina y mesas.
- [ ] Probar peticiones y seguimientos de WhatsApp para las otras seis ciudades y los casos sin horarios respaldados.
- [x] Reconciliar las tres incorporaciones de Supabase DEV en la matriz QA 162, conservando intacta la versión original de 159. Commit `de2b9f9` en rama `concierge-manager-web-v1` (09/10/2026).
- [ ] Revisar que ningún cambio modifique `main`, `chebot-production` o los entornos de producción.

> **Regla de liberación:** los registros `pending` y `cuisine_candidate_tags` no habilitan una recomendación por especialidad. Esta preparación es solo staging/QA y no debe convertirse automáticamente en inventario público.

## Estado de la sesión

La ampliación y la separación de compañía/plan están implementadas en Backend Preview. La Demo #1 ya verificó recomendaciones, selección y navegación por WhatsApp en Recoleta, **y la combinación de tres estilos y botones nativos por WhatsApp real en Palermo** (09/10/2026). Siguen pendientes la regresión de horario tardío y otros flujos operativos Concierge; no se declara cerrada Demo #1 ni toda la Beta V1.
