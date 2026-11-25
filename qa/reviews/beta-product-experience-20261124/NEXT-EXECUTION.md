# Continuación del producto QA

Rama nueva: `qa/cheveni-beta-product-experience-20261124` (no existía; sin colisión).
Base web `791c0b509b7557d1f44e8011a3900ceb51f13c53`.
Código final: [e2924b3a7bc667b56077b7b0a159a3f5f40a5377](https://github.com/MarcoAlexis10/chebot-web/commit/e2924b3a7bc667b56077b7b0a159a3f5f40a5377).
El cierre documental es posterior: verificar HEAD/permalink entregado antes de retomar.

Leer CLOSURE, PRODUCT-DELTA, PILOT-ACCEPTANCE, REMAINING-GAPS y TEST-EVIDENCE.
Reutilizar `qa/pilot-integration-20261112-v1/materialize.mjs`, no crear otra demo o panel.
Las ocho pruebas nuevas y seis regresiones seleccionadas ya tienen evidencia;
no repetirlas sin otro cambio. Las suites históricas excluidas siguen sin ejecutar.

La opción `--review` genera el mismo candidato para file:// sin servidor; abrir
`review/manager/recorrido/index.html` dentro del paquete pilot-integration.
Comandos/precondiciones exactos en PRODUCT-DELTA. Usa fuentes backend fijadas
como checkout hermano sólo lectura y herramientas ya instaladas. No ejecutar
build operativo ni instalar herramientas para revisar. Los outputs no se duplican
en GitHub; hashes y código permiten reproducirlos. No se incluyen datos reales.

Siguiente ejecución útil: revisión visual/móvil/accesible de estas mismas páginas
con navegador compatible ya disponible, sin debilitar seguridad. Registrar
viewport, ruta/commit, captura sintética y resultado; diferenciar inspección manual
de test automatizado. El panel permanece cerrado hasta autorización; no saltarlo
para producir una captura positiva. No repetir demo ASUS ni su infraestructura.

Backend `a86fe1cff70121838795a40139b5762c6b308b37` y QA-lab
`ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a` sólo lectura. D1/D2/custodia,
Auth real, Native17/COMMIT/A2 y privacidad operativa siguen pendientes. Ninguna
mejora visual habilita alta, secretos, checkout, reenvío o trial.

Vercel continúa fuera de alcance, sin presumir pago/disponibilidad. No recursos,
gastos, despliegues, mensajes o servicios. Beta V1 continúa NO-GO.
