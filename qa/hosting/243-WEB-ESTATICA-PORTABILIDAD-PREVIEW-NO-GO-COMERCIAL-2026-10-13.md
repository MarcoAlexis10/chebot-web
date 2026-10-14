# QA243 — Hosting alternativo: Web portable, Backend no migrado
Fecha 13/10/2026 · Estado: SOLO PRUEBAS Y DOCUMENTACIÓN · NO-GO COMERCIAL.
Rama: MarcoAlexis10/chebot-web @ concierge-manager-web-v1.

## Evidencia técnica
- package.json genera archivos estáticos en dist; vercel.json usa outputDirectory dist.
- Rutas críticas con su propio index.html: /, /manager/, /manager/reset-password/, /manager/activar/, /manager/altas/. No se presupone comportamiento de SPA catch-all.
- Actualmente Web tiene llamadas explícitas a chebot-backend-git-concierge-v3-design-chebot.vercel.app en login/signup/consola. Mover archivos web **no reemplaza Backend Vercel**, ni equivale a tener hosting comercial.
- Auth recupera por Supabase DEV y fragmento URL. Un nuevo origen requiere verificar redirect de recuperación, CORS, CSP, sesión, token y políticas de dominio; no incorporar credenciales privadas en assets.
- Las páginas especiales de privacidad/condiciones Concierge siguen ausentes por falta de aprobación del abogado y titular; no hay manifiesto legal de publicación. Signup permanece cerrado incluso con invitación de formato válido.

## Prueba automatizada QA243
- Archivo test/manager-static-host-readiness.test.cjs: comprueba offline rutas estáticas, assets, enlaces legales, cierre por falta de aprobación y dependencia del Backend antiguo; NO finge que Backend está migrado.
- Se agregó la prueba a .github/workflows/concierge-manager-preview-build-only.yml con variables de build ficticias y sin despliegues.
- PASS de QA243 será solo indicio de compatibilidad estructural de Web; no prueba funcionamiento en cuenta/proveedor alternativo, ni 24/7, E2E, DNS, Meta, términos comerciales o seguridad real.

## Opciones de hosting en 2026
| Servicio | Evidencia | STOP/precaución |
| --- | --- | --- |
| Netlify Free | USD 0; 300 créditos mensuales; hard limit con posibilidad de pausa de todos los sitios de la cuenta al agotarse. Soporta dist, Pretty URLs y redirects. Soporte de Netlify aceptó proyectos comerciales en 2025; verificar condiciones vigentes al registrar. | Una web estática es candidata; Backend sin adaptar ni probar. No asumir 24/7 sin verificar créditos. |
| Cloudflare Pages estático | Assets estáticos gratuitos sin contabilizar como Pages Functions; compatibilidad de URLs/redirects verificable en un deployment aislado. | No da por sí solo Backend ni resuelve Auth/WhatsApp. |
| Cloudflare Workers como Backend | Desde 04/08/2026 mejoró compatibilidad Node: incluye node:crypto y node:http por defecto con fechas modernas. | Diferencias con HTTP Node; requiere adapter req/res, firma Meta con body raw, Supabase, límites CPU, callbacks P5, tests y rollback. NO es migración trivial. |
| Vercel Hobby actual | Condiciones restringen el uso a personal o no comercial. | No usar como hosting comercial garantizado, aunque Beta sea gratuita. |

Documentación oficial consultada:
- https://www.netlify.com/pricing/
- https://answers.netlify.com/t/can-we-use-netlify-free-plan-for-commercial-purposes/41545
- https://docs.netlify.com/manage/routing/redirects/overview/
- https://developers.cloudflare.com/pages/configuration/redirects/
- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/changelog/post/2026-08-04-nodejs-compat-default/
- https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/
- https://vercel.com/legal/terms

## Secuencia real futura — aún sin permiso
1. Solo con elección y autorización del proveedor, hacer despliegue de Web a URL temporal aislada y analizar rutas, CSS/JS, autenticación, CSP, CORS y recuperación.
2. Resolver Backend comercial de forma separada: adapter Node, webhook Meta GET/POST/firma con body raw y seguridad de tenant; probar en entorno DEV con datos sintéticos. No mover DNS, cron o webhook actual.
3. Aprobar términos por abogado/titular, fiscal por contador, y permisos A contacto, B altas, C avisos periódicos independientes.
4. Revalidar QA P1–P7 con evidencias y guardia humana antes de cualquier manager o huésped real.

STOP: no insertar secretos, no contactar candidatos, no pagar servicios, no generar manifiesto legal, no tocar main ni chebot-production, no confundir build-only QA con GO.
