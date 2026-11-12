# Propiedad, estadía y pre-arrival — candidato QA retenido

Sólo revisión offline. No está conectado a build.js ni a endpoints. Beta V1 NO-GO.

- contracts.mjs reutiliza el codec CBF1 original y el gateway createStayCommandReview con sus adaptadores ausentes por defecto. Nunca configura writer, SQL, Auth ni transporte.
- time-review.cjs extrae únicamente dos funciones puras de backend/index.js en una VM; no importa el servidor. Agrega validación de calendario antes de la conversión CABA. El backend operativo permanece sin cambios.
- prearrival.mjs revisa vectores sintéticos con relaciones y versiones estrictas. Su única salida de contenido es una plantilla pública global, sin datos de reserva. No representa autoridad ni una bienvenida aprobada de una propiedad.
- materialize.cjs reutiliza los once generadores y las correcciones del cierre fundador. Escribe 17 archivos sólo en generated/. Conserva el guard legal, orígenes .invalid, CSP connect-src/form-action none y formularios inert; añade tres páginas retenidas, un script sin lectura de inputs y CSS local. No inicia servidor o navegador.
- fixtures.mjs contiene sólo datos explícitamente ficticios. No claves ni firmas. Los frames CBF1 se revisan en memoria y se sobrescribe el buffer; no hay almacenamiento de nombres, hashes telefónicos ni frames para conciliación. Las cadenas JS no permiten una garantía de borrado físico.

## Recuperación y ejecución focalizada

Desde el checkout completo padre que contiene web/ y backend/ en los SHA de SOURCE-PINS.json:

```sh
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/property-stay-prearrival-20261112-v1/contracts.test.mjs web/qa/property-stay-prearrival-20261112-v1/prearrival.test.mjs web/qa/property-stay-prearrival-20261112-v1/time.test.cjs
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/property-stay-prearrival-20261112-v1/ui.test.cjs
python web/qa/integral-held-v1/run-isolated.py -- node web/qa/property-stay-prearrival-20261112-v1/materialize.cjs
```

Son ocho casos únicos nuevos: siete Node sobre contratos/tiempo y uno Node con VM/DOM mínimo y fuentes HTML. Los logs guardan el fallo de calendario original, un error inicial de ruta del fixture y el fallo de navegación corregido. No son pruebas de navegador, Auth administrado, SQL, COMMIT ni transporte HTTPS. No repetir por rutina. Las suites históricas y cinco + tres del cierre fundador se conservan sin reejecución.

La ausencia de huésped o un cambio/cancelación/checkout no se transforma en create_stay. pending operation_id no se convierte automáticamente en intentId CBF1. Ventanas de acceso no representables se rechazan, sin pérdida silenciosa. UNKNOWN nunca se transforma en permiso para reenviar.
