# Che Vení — candidato offline retenido, no activable

Fecha: 11/11/2026. Decisión: **Beta V1 NO-GO**. No es un paquete aprobado para desplegar.

## Evidencia completada en esta ejecución

- [x] Recuperar HEADs remotos de las tres ramas y leer el handoff/cierres.
- [x] Web completo: 243 archivos originales, checkout Git al HEAD indicado.
- [x] Backend completo: 2076 archivos recuperados y verificados, árbol Git original reconstruido; sin sustituir imports por fuentes sueltas.
- [x] Ejecutar suite Node administrativa pendiente: 31/31.
- [x] Ejecutar runner original de siete suites en namespace sin egress: 66/66, tras corregir selección explícita de TAP.
- [x] Regresiones del runner: 14/14; administrativas: 18/18, con fixtures actualizados.
- [x] Build web original con configuración pública ficticia: exit 0, 33 outputs; 13 scripts generados compilan.
- [x] Importar realmente los módulos originales y `index.js`; 67 intercambios HTTPS locales.
- [x] Verificar nueve rutas, métodos bajo HOLD, cabeceras CORS recibidas, rechazo Auth y ausencia de lectura de cuerpos.
- [x] Conectar inline JS administrativo generado con HTTPS/handler original mediante VM Node, con DOM simulado: intención durable, rechazo exacto, pérdida de respuesta y bloqueo de reenvío.
- [x] Conservar guards, configuración de despliegue y hashes de negocio originales; publicar sólo en ramas QA nuevas con `[skip ci]`.

## Condiciones que siguen impidiendo lanzamiento

- [ ] **Navegador:** Chromium no arrancó en el namespace (socket interno EPERM). Cuatro casos preparados, no ejecutados. Obtener un entorno que permita navegador y mantenga aislamiento acreditado; nunca ejecutar fuera del aislamiento para salvar este bloqueo.
- [ ] **CORS:** ocho rutas retornan 503 antes de aplicar CORS, incluido OPTIONS. Es cabecera observada por HTTP; falta validación efectiva en navegador. La ruta invites/send aplica su CORS original; signup-request sólo admite su origen Preview fijo. No abrir ni relajar CORS para hacer pasar QA.
- [ ] **Auth/autoridad vigente:** sólo se comprobó rechazo bajo HOLD; no se acreditan autenticación exitosa, revocación JWT efectiva, refresh ni fences transaccionales.
- [ ] **Native17:** cierre parcial. Host aislado, políticas, roles/owners/ACL/RLS, scope protegido independiente y Auth real siguen pendientes. No ejecutar SQL nativo sin autorización separada.
- [ ] **Idempotencia de negocio:** persistencia del cliente y no reenvío probados; unicidad SQL, concurrencia y reconciliación de operaciones reales no probadas por estas pruebas retenidas.
- [ ] **Recuperación A2 / retención D02-A / legal:** siguen sin cierre integral acreditado. No se revisaron ni repitieron ensayos históricos en esta ejecución. No levantar guards ni prometer plazos legales.
- [ ] **Migraciones:** inventario de 310 SQL solamente; ningún conjunto de instalación u orden aprobado. No tratar el inventario como plan de aplicación.
- [ ] **Destino de release:** build original exige un identificador DEV. No es un target de lanzamiento autorizado. Resolver con un artefacto QA/producción revisado y aprobado por separado.
- [ ] **Operación y comunicaciones:** sin pruebas con personas, mensajes, emails, WhatsApp, cobros o datos reales. Permisos operativos y hosting comercial pendientes de evidencia/decisión propia.
- [ ] **Piloto:** confirmar manager fundador, propiedad CABA, 30 días gratis, sin cobro automático y guía Free separada. Esta lista no habilita su alta real.

## Secuencia futura de activación — descriptiva, no ejecutable

1. Conservar y revisar los commits exactos del manifiesto; conciliar cualquier avance posterior antes de componer otro candidato.
2. Completar el navegador en laboratorio aislado y resolver los desacuerdos observados sin conceder autoridad ni modificar preventivos para pasar pruebas.
3. Bajo autorización independiente, acreditar las condiciones Native17/Auth/SQL, recuperación, privacidad/legal y operación. Seleccionar después un único paquete de migraciones, con revisión, captura y reversión correspondientes.
4. Preparar otro manifiesto con destino, hashes y configuración real protegida. Obtener GO explícito del propietario sobre ese resultado concreto.
5. Sólo otra ejecución autorizada podría activar servicios/despliegue y validar operación. Este repositorio no contiene un comando de activación.

## Reversión — descriptiva, no ejecutable

En este lote no se desplegó ni se aplicó SQL: no hay reversión de servicios que ejecutar. Para descartar el candidato, conservar sus evidencias y continuar desde las bases inmutables indicadas en RELEASE-CANDIDATE.json, sin reset ni force-push sobre ramas con avances posteriores. Una futura activación deberá definir su propia versión anterior, fences de acceso, tratamiento de operaciones UNKNOWN y recuperación de datos antes de obtener GO; no asumir que volver archivos revierte operaciones o datos ya escritos.
