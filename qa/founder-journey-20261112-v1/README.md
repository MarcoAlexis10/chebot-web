# Manager fundador — candidato de experiencia QA retenido

Derivado de frontend web `426eae627154f5bff011335d1c5e688e32ca7d59` y contratos backend `9beb837a621f9a8f06601043afa64b3bba317cb5`. Sólo este directorio QA; sin cambios de producto/build operativo, backend o Native17.

`compose.cjs` ejecuta los once generadores originales en VM con filesystem en memoria, configuración ficticia `.invalid` y resultado real del guard legal existente (debe permanecer false). Cambia sólo las incompatibilidades demostradas: DTO de sesión, mensajes de login/lecturas e invalidación de invitación 401 en headers. No aporta una autoridad, claim, permiso o respuesta positiva del backend. El backend real conserva sus guards.

`materialize.cjs` genera exclusivamente `generated/manager/` en este paquete. CSP `connect-src 'none'`, forms `inert` y aviso QA en todas las páginas. No se inicia servidor; no es una preview desplegada ni un recorrido autenticado habilitado. Los módulos todavía contienen el recorrido original y sus bloqueos de incertidumbre; sus destinos son exclusivamente ficticios. No introducir credenciales o datos reales.

```sh
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/founder-journey-20261112-v1/experience.test.cjs
python web/qa/integral-held-v1/run-isolated.py -- node web/qa/founder-journey-20261112-v1/materialize.cjs
```

`--conditions=baseline` en Node conserva el comportamiento original para reproducir errores. Las pruebas usan DOM/storage/transportes dobles: respuestas malformadas/denegadas o vista previa preexistente modelada. **No prueban un navegador, CORS o autorización del backend**, ni SQL/Auth administrado. No crean usuarios, reservas, permisos, invitaciones o comunicaciones.

El panel no tiene formularios reales de alta/configuración de propiedad o creación de estadía; sus GET no se reinterpretan como POST. Esos faltantes y el rol operativo separado de manager están en la matriz del cierre. El candidato no equivale a un piloto completo, y ninguna operación queda habilitada.

Native17 permanece HOST_NOT_AVAILABLE; D1–D8 y N01–N12 se conservan sin reexaminar el runtime, generar SQL o ejecutar ensayos. Chromium tampoco se intenta. CABA / un manager / una propiedad / 30 días gratuitos / sin cobro automático; Free separado para otras ciudades. **Beta V1 NO-GO.**
