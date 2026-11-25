# Cierre · experiencia de producto Beta QA

24/11/2026 · **Beta V1 NO-GO**. Se mejoró la composición funcional existente para
el manager y la explicación del recorrido del huésped, sin crear otra aplicación,
portal operativo, demo ASUS o backend positivo. Ninguna operación real habilitada.

## Publicación recuperable

Rama nueva: `qa/cheveni-beta-product-experience-20261124`, creada al verificar que
no existía. HEAD inicial `791c0b509b7557d1f44e8011a3900ceb51f13c53`.
Checkpoints, todos [skip ci]:

- [123c9da1a252efb2e3f29fe6f5917a18172eb1e3 — recorrido y presentación](https://github.com/MarcoAlexis10/chebot-web/commit/123c9da1a252efb2e3f29fe6f5917a18172eb1e3).
- [d942bbf4421441e08ca3a57e4338bb0c4a241a78 — selector y revisión file://](https://github.com/MarcoAlexis10/chebot-web/commit/d942bbf4421441e08ca3a57e4338bb0c4a241a78).
- [847bcf5a82b3c42a2a885659af5fb1ffd8a52933 — corrección de claims Auth heredados](https://github.com/MarcoAlexis10/chebot-web/commit/847bcf5a82b3c42a2a885659af5fb1ffd8a52933).
- [e2924b3a7bc667b56077b7b0a159a3f5f40a5377 — código final y mensaje de sesión sin jerga](https://github.com/MarcoAlexis10/chebot-web/commit/e2924b3a7bc667b56077b7b0a159a3f5f40a5377).

El HEAD final documental es el commit que contiene este archivo; se entrega su
SHA/permalink exacto tras readback remoto. Backend `a86fe1cff70121838795a40139b5762c6b308b37`
y QA-lab `ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a` verificados, sólo lectura.
Ramas históricas, raíz operativa, workflows y build de producción permanecen intactos.
Los filtros push de los dos workflows no incluyen la rama nueva; no se activaron.

## Trabajo funcional implementado

[PRODUCT-DELTA](PRODUCT-DELTA.md) detalla fuentes/cambios y cómo abrir la revisión.
Se extendieron compose/materialize/verificador del piloto y el selector/matriz/pins
mínimos existentes. Reutiliza los 18 assets, ocho páginas, el mismo formulario
privado estructurado, CSS, consumidores de listas y DOM harness. No se duplicó una
aplicación o conjunto de componentes; sólo se generan localmente sus overlays.

| Recorrido | Cambio real |
|---|---|
| Manager | Incorporación pendiente, revisión humana, navegación clara y mensajes de acceso/resultado. Labels dinámicos y HTML inicial dejan de afirmar identidad verificada, datos reales o envío de contraseña en QA. |
| Primera propiedad | Misma captura inerte/vacía: obligatoriedad de calle/número, piso/unidad opcionales, defaults admitidos visibles y explicación de revisión/no creación. Sin edificio inventado, segunda propiedad o pérdida de campos. |
| Estadías | Cancelación/revocación/finalización/llegada pendiente expresadas sin tratar fechas como autorización. Fechas inválidas no se imprimen literalmente. IDs de reservas consecutivas y respuesta tardía conservan separación. |
| Huésped | La página prearrival existente explica invitación, antes de llegar, check-in, estadía y salida; Free separado. No hay portal privado, códigos, Wi-Fi o contenido personalizado nuevo. |
| Check-in/checkout | Presentación y explicación: check-in requiere autorización, checkout no hereda acceso a otra reserva. No relojes operativos/jobs ni revocación Auth real. Acciones siguen bloqueadas. |
| Solicitudes/incidencias | Vacíos neutrales para revisar; resultado sin confirmar y no reenviar en el submit retenido. Mediación, decisiones y marcadores existentes intactos. No ACK elevado a éxito o aprendizaje automático. |
| Móvil/accesibilidad | Navegación a Conocimiento/Cuenta, enlace al contenido, foco visible, tamaños mínimos, wrap y cabecera flexible. Un CSS compartido existente; confirmación visual/lectores de pantalla pendiente. |

Se encontraron carencias reproducibles: ventana etiquetada como acceso aun tras
cancelación/salida, valor de fecha inválida mostrado crudo, claims de datos/identidad
real en QA, vacíos engañosos y navegación móvil incompleta. La copia de estados de
propiedad y huésped era técnica; se reemplazó sin alterar protocolos o permisos.
El mensaje incierto conserva su significado sin UNKNOWN/JWT visibles innecesarios.

La salida opcional file:// remapea únicamente referencias locales de las mismas
páginas; no servidor o servicio nuevo. El panel mantiene su gate de acceso, sin
identidad ficticia insertada para abrirlo. Esta vista no inicia trial, registra
manager, designa fundador, invita huéspedes o crea/guarda propiedades.

## Evidencia efectivamente ejecutada

**Ocho casos nuevos únicos: seis VM/DOM sintéticos y dos de fuente.** Baseline
final: 8 FAIL; versión corregida: 8 PASS. Se conservan baseline inicial de siete
casos y fallos posteriores de copy estático/sesión, sin sumarlos como casos nuevos.
Las aserciones de copy visible excluyen atributos internos del protocolo, que
siguen retenidos. Refinar ese alcance no quitó los ocho fallos del baseline.

**Tres regresiones de consumidores y tres de herramienta**, separadas de producto:
contexto DTO compatible, 403 y respuesta tardía de otra sesión; controles del
selector ampliado. Aprobadas. Seleccionar MARKUP ejecutó sus mismos dos casos,
no dos pruebas adicionales. EX-NATIVE siguió BLOCKED/código 3.

Verificación adicional sin contar como casos: 57 inputs históricos del compositor,
72 pins actuales del selector, sintaxis JS/inline, 103 referencias de la composición,
120 enlaces/anclas file://, formularios inertes/CSP y 18 hashes reproducibles. El
checker existente comprueba también los outputs de revisión. El cambio final de
copy de sesión sólo altera el asset Auth; los HTML del grafo verificado son idénticos.

Node v24.22.3, Python 3.12.14; launcher existente con namespace de red distinto,
sin rutas externas útiles, conexión externa rechazada errno101 y sin credenciales
heredadas. Dobles de DTO/fetch/tiempo no prueban identidad, revocación o autoridad.
[TEST-EVIDENCE](TEST-EVIDENCE.json) y [logs](evidence/) fijan resultados y hashes.

No se repitieron por rutina Native17, G2–G4, original/privacidad, demo ASUS,
A01–A59, A2 o infraestructura. Sólo las seis regresiones justificadas arriba.
**Navegador/inspección visual real NOT_RUN**; no se reintentó Chromium previamente
bloqueado ni se debilitó el entorno. DOM y CSS fuente no acreditan móvil, contraste,
foco efectivo, BFCache, lector de pantalla o accesibilidad completa.

## Aceptación y pendientes

[PILOT-ACCEPTANCE](PILOT-ACCEPTANCE.md) usa la matriz/selector anteriores con tres
selecciones nuevas, separando VM/DOM, fuente, inerte y gates externos. Las cuatro
filas DTO históricas pasan a NOT_RERUN; sus evidencias originales no se reescriben.
La aceptación de fuente o demostración no es extremo a extremo.

Siguen inertes captura/configuración, altas, invitaciones, check-in/checkout y
decisiones protegidas. Auth necesita proveedor/sesión/cuenta/miembro y permisos
actuales. Primera propiedad requiere D1, D2, original recuperable, CABA y designación
auténticas; Native17 permanece 0/10. COMMIT/readback, revocación y A2 no se acreditaron.
No se volvió a investigar esa arquitectura o el recurso D2.

Antes del primer manager real faltan esas fuentes, privacidad/legal operativa,
pruebas nativas/navegador y autorización comercial. Puede posponerse autoservicio
de teléfono, UI de aprendizaje/co-manager/operativo y bienvenida personalizada,
conservando controles/denegaciones. No posponer aislamiento, checkout o incertidumbre.

Siguiente trabajo útil sin Vercel: revisión visual/móvil/accesible de esta misma
composición local con un navegador ya compatible y datos sintéticos; corregir sólo
lo observado. [REMAINING-GAPS](REMAINING-GAPS.md) y [NEXT-EXECUTION](NEXT-EXECUTION.md).
No hace falta reabrir la demo ASUS ni usar su infraestructura para este paso.

Vercel potencialmente indisponible por débito fallido USD20 comunicado; factura,
suspensión/pago no comprobados. No acceso operativo, despliegue, gasto, recurso,
migración, facturación o tarea automática para 1/12. Presupuesto nuevo USD0.

Contrato intacto: un manager fundador, una propiedad CABA, 30 días desde la primera
estadía real verificada, sin cobro/conversión automática ni fecha prometida.
Huéspedes: invitación/verificación, acceso por reserva, secretos desde check-in
autorizado, revocación checkout, aislamiento consecutivo y guía pública posterior.
**Beta V1 continúa NO-GO.**
