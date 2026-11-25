# Aceptación del piloto: misma matriz y selector

Se amplió [ACCEPTANCE-MATRIX.json](../../minimal-beta-20261116-v1/ACCEPTANCE-MATRIX.json)
y su selector existente; no se creó una suite paralela de aceptación.
Seleccionar una fila no concede autorización operativa.

| Selección / área | Evidencia actual | Qué falta |
|---|---|---|
| OFF-PRODUCT-STAYS | Tres casos VM/DOM: presentación de ventanas/estados, fecha inválida y respuesta tardía con reservas consecutivas | Navegador y tiempo/autoridad reales; no prueba permisos de huésped o exclusión SQL. |
| OFF-PRODUCT-MESSAGES | Tres casos VM/DOM: labels QA, vacíos de solicitudes/incidencias y submit inerte con resultado sin confirmar | Confirmaciones auténticas de backend y transporte. No hay mutación ni envío. |
| OFF-PRODUCT-MARKUP | Dos casos de fuente: formulario/copias y navegación/CSS móvil | Inspección visual, zoom, teclado/foco y lector de pantalla reales. |
| OFF-*-DTO previos | Evidencia histórica preservada, no reejecutada | No atribuirles una nueva ejecución en este lote. |
| REG-PANEL / REG-SECTION | Tres casos previos seleccionados por cambio de consumidores: matching DTO, 403 y respuesta tardía de sesión anterior | Siguen siendo dobles de UI, no Auth. Resto de casos históricos no se repitió. |
| Controles del selector | Tres regresiones de herramienta aprobadas por ampliación de registro | No son funcionalidad del piloto. EX-/H- continúan bloqueados. |
| Propiedad/configuración/estadía/check-in/checkout | Representación inerte, misma captura y valores admitidos | Fuente protegida, autorización vigente, implementación compatible, confirmación durable. |
| Huésped/secretos | Recorrido explicado, sin portal privado positivo ni payload | Invitación/identidad y ventana de reserva reales; revocación checkout y aislamiento de reservas. |
| EX-SOURCES/AUTH/NATIVE/COMMIT/A2 | Sin ejecutar; permanecen retenidos | Productores/custodios/catálogo y autorización específica. |
| H-PRIVACY/H-COMMERCIAL | Condiciones operativas pendientes | A/B/C de diseño QA no habilitan datos reales ni lanzamiento. |

Ocho casos nuevos únicos: **seis VM/DOM sintéticos y dos de fuente**, no ocho
ensayos de navegador. Tres regresiones de consumidores y tres del selector se
contabilizan aparte. Repeticiones/baselines/selección ejecutada no se suman.

Ejemplo opcional, desde el checkout web, sólo cuando otro cambio lo justifique:

```text
node qa/minimal-beta-20261116-v1/acceptance.mjs --plan OFF-PRODUCT-STAYS
node qa/minimal-beta-20261116-v1/acceptance.mjs --run OFF-PRODUCT-MARKUP
```

MARKUP se informa como NODE_SOURCE_CHECK_NOT_BROWSER. Los tests de producto se
ejecutan detrás del launcher aislado existente. EX-NATIVE sigue devolviendo código
3/BLOCKED sin ejecutor; REG-* exige razón de impacto. No opciones de endpoint,
SQL, comandos arbitrarios, --all o autorización de servicios.

## Mínimo antes del primer manager real

La aceptación externa necesita identidad actual, cuenta/member y permiso expreso,
fundador único y CABA acreditada; original/version recuperables, reserva/claim y
resultado comprobables; invitación/huésped por estadía; revocación, privacidad,
recuperación y materialización nativa. Luego revisión de navegador sobre el
candidato conectado bajo autorización y decisión comercial expresa.

Puede posponerse autoservicio de cambio de teléfono, publicación de aprendizaje,
UI de co-manager/operativo temporal y personalización de bienvenida. Deben
mantenerse sus denegaciones y separación de roles. Multi-propiedad/multi-ciudad
Concierge, altas masivas y automatización de cobros permanecen fuera de Beta V1.
No posponer check-in autorizado, checkout, aislamiento, confirmación de resultados
o recuperación segura para facilitar la experiencia.
