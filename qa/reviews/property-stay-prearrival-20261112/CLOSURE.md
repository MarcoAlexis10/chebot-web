# Che Vení Concierge — propiedades, estadías y pre-arrival

**12/11/2026 · QA offline · Beta V1 NO-GO.** Candidato retenido, sin conectar al build operativo. Ocho casos nuevos únicos PASS en Node aislado; ningún ensayo SQL, navegador, Auth administrado o integración operacional ejecutado. No se habilitó ninguna propiedad, estadía, invitación ni usuario.

## Versiones y publicación

| Repositorio / rama | HEAD inicial verificado | Estado final |
|---|---|---|
| chebot-web / qa/cheveni-integral-held-20261111 | 8cacefa024d2377e31915a9092ae4ea86f493732 | Código y contratos publicados en **6af713d4d73bb6c00f2230b863da4dcb23434db4**; cierre y manifiesto en el commit que contiene este archivo |
| chebot-backend / qa/cheveni-integral-held-20261111 | 9beb837a621f9a8f06601043afa64b3bba317cb5 | **9beb837a621f9a8f06601043afa64b3bba317cb5**, sólo lectura; ref revalidado después de publicar código |
| cheveni-qa-lab / qa/cheveni-native17-policy-closure-20261106 | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a | **ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a**, sólo lectura; ref revalidado |

El SHA del commit que contiene este cierre se obtiene de su URL inmutable y de la entrega final; no se inserta una autorreferencia hash imposible dentro del propio commit. SOURCE-PINS.json fija 62 fuentes por SHA-256 y blob Git contra árboles remotos completos. PACKAGE-MANIFEST.json fija todos los archivos del lote salvo su propio manifiesto; GENERATED-MANIFEST.json fija los 17 outputs. Es integridad de bytes, no ejecución de esas fuentes.

Commits incrementales, ambos `[skip ci]`:

- [3783393f50c2cca4004ffb71ac0aaf18dc5181b9](https://github.com/MarcoAlexis10/chebot-web/commit/3783393f50c2cca4004ffb71ac0aaf18dc5181b9): módulos, siete pruebas de contrato/calendario y una de navegación, formularios inertes, logs y checkpoint; 37 blobs publicados verificados.
- [6af713d4d73bb6c00f2230b863da4dcb23434db4](https://github.com/MarcoAlexis10/chebot-web/commit/6af713d4d73bb6c00f2230b863da4dcb23434db4): enlaces del panel original hacia planificación QA, idioma/tipos de propiedad, revisión focal de UI, fuentes fijadas, contratos y checklist; 20 blobs añadidos/modificados verificados.

Se revisaron los dos workflows de web antes de cada publicación: no tienen push a esta rama ni create. No se crearon ramas backend, dispararon workflows manuales, ni se usaron servicios de despliegue. Actualización de ref con expected_sha; sin force/reset/merge. Los únicos archivos publicados pertenecen a los dos prefijos nuevos de este lote.

## Cambios de código e incompatibilidades concretas

Paquete: [qa/property-stay-prearrival-20261112-v1](https://github.com/MarcoAlexis10/chebot-web/tree/6af713d4d73bb6c00f2230b863da4dcb23434db4/qa/property-stay-prearrival-20261112-v1).

1. **Propiedad:** interfaz inerte con datos mínimos del esquema, sin códigos o campos de huésped. reviewPropertyShape valida sólo forma; revisión sintética de duplicado conserva separación por cuenta/unidad. No existe ABI privado acreditado para alta/configuración/revocación: continúa HELD. El guard histórico exige city=`Buenos Aires`; la UI CABA no lo convierte en autoridad ni modifica ese guard. Las claves únicas del esquema no acreditan una propiedad física única o el cupo 1/1.
2. **Estadía:** se reutiliza el codec CBF1 original y el gateway existente con adaptadores ausentes por defecto. Se compara pending con CBF1 sin perder argumentos. El pending fija acceso a check-in/checkout; un frame con ventanas diferentes se rechaza, sin normalización silenciosa. Su operation_id de procedencia WhatsApp no se equipara a intentId web. Ambos contratos exigen huésped; crear con fechas y asociarlo después necesita ABI sucesor. Modificar, cancelar y checkout no se reinterpretan como create_stay.
3. **Fechas:** se reprodujo que el conversor puro original transforma 2027-02-29 en marzo. La corrección QA valida calendario antes de convertir con zona CABA. El servidor original no se importa ni modifica. Las ventanas [inicio,fin) y cruces se revisan sobre inventario ficticio; no garantizan exclusión SQL entre procesos.
4. **Pre-arrival:** plantilla pública global fija, reutilizando la separación de presentación existente; no dirección, unidad, teléfono, nombre, texto libre o secretos. Vectores negativos verifican siete relaciones exactas, revisiones, expiración y revocación. Incluso el vector compatible está marcado fixtureOnly/held y actualAuthVerified=false. Falta productor aprobado por propiedad y binding protegido real. El loader privado que exige check-in sigue intacto. Free es explícito e independiente.
5. **Experiencia:** tres páginas nuevas de propiedad/estadía/pre-arrival, navegación local a rutas/anchors reales y enlace de planificación desde las secciones originales. La prueba detectó rutas nuevas inexistentes; se corrigieron. Los formularios están en blanco, inert/disabled; el script no lee inputs ni usa fetch/storage. CSP connect-src/form-action none, orígenes ficticios .invalid. Ocho scripts/estilos anteriores permanecen idénticos; no se repitieron sus suites.
6. **Incertidumbre:** la frontera lifecycle sigue cerrada. Un ACK del cliente o callback no configura autoridad ni transforma UNKNOWN en éxito/denegación/reenvío. Readback no vuelve a ejecutar mutación. No se añadió persistencia durable del original, frames o hashes personales.

Estos son cambios funcionales de módulos y de una interfaz retenida; **no acreditan el recorrido frontend→backend→SQL en un sistema real**.

## Pruebas realmente ejecutadas

| Evidencia | Resultado | Clasificación |
|---|---|---|
| logs/contracts-first.tap | 7 PASS, 0 FAIL, 0 SKIP | Node: cuatro casos de contratos, dos de pre-arrival y uno de calendario; vectores sintéticos |
| ui-final.tap | 1 PASS, 0 FAIL, 0 SKIP | Node VM con DOM mínimo y comprobación de HTML/enlaces; sin navegador |
| logs/calendar-source-before.tap | FAIL previo conservado | Conversor original puro normaliza fecha imposible |
| logs/calendar-after.tap | PASS focal | Mismo caso tras guard QA; no suma un caso único |
| ui-first.tap / ui-after.tap | FAIL → PASS | Enlaces a rutas supuestas corregidos; ui-final repite ese caso por cambio posterior de enlaces/idioma |
| logs/calendar-before.tap | FAIL de setup | Primera ruta relativa del fixture incorrecta; no fallo del producto; se conserva |
| static-final.log / syntax.log | PASS estático | 62 fuentes, 17 outputs, ocho scripts/estilos previos idénticos y sintaxis de 11 archivos nuevos |

Total único nuevo: **8 PASS / 0 FAIL finales / 0 SKIP**. Node v24.22.1. Launcher existente: namespace de usuario/red nuevo, entorno sin credenciales heredadas, conexión externa rechazada ENETUNREACH=101; detalle en cada log. Esta evidencia no acredita un host Native17. TEST-EVIDENCE.json contiene comandos, nombres, hashes y distinción de repeticiones.

Cierre fundador cinco casos + tres regresiones preservados sin repetir. Suites históricas 31/66/14/18/17, Native17 y Chromium no se ejecutaron. Transporte HTTP/HTTPS local nuevo: cero. COMMIT/journal/SQL/firmas/restores reales: cero. No se invocó autoridad backend positiva ficticia como sustituto de una autorización real.

## Contratos, piloto y bloqueos

- [PROPERTY-CONTRACT.md](PROPERTY-CONTRACT.md): identidad/cuenta/miembro, permisos, jurisdicción, unicidad y lifecycle pendientes.
- [STAY-CONTRACT.md](STAY-CONTRACT.md): argumentos y pérdidas de representación pending/CBF1; creación sin huésped, modificación/cancelación/checkout retenidos.
- [PREARRIVAL-PRIVACY.md](PREARRIVAL-PRIVACY.md): fuente pública independiente, binding, ventana privada, privacidad y A2.
- [JOURNEY-MATRIX.md](JOURNEY-MATRIX.md), [PILOT-CHECKLIST.md](PILOT-CHECKLIST.md) y [GO-NO-GO.md](GO-NO-GO.md): secuencia implementada/retenida y aceptación pendiente.

Native17 sigue HOST_NOT_AVAILABLE; N01–N12 NOT_AUTHORIZED/NOT_RUN. No se reinvestigó runtime, creó SQL equivalente, descargó PostgreSQL o inició infraestructura. D1 revisiones, D2 restricciones/floors, D3 proveedor/binding, D4 original/custodia, D5 RLS, D6 providerRef, D7 revocadores y D8 COMMIT/readback/journal continúan pendientes. Los once cambios históricos siguen HELD, sin endpoint de incidencias habilitado.

Faltan Auth administrado y revocación JWT/refresh, autoridad vigente y carreras nativas, mínimo privilegio efectivo, original confiable y custodia D02-A, COMMIT externo/reader/journal/witness, A2 integral y navegador/CORS en laboratorio seguro. A2 incluye Auth-GoTrue/Vault/Storage/claves/configuración/revocaciones/floors posteriores al backup; restaurar tablas no basta y no elimina cuarentena. No se inventa plazo de retención ni se relajan guards.

Piloto invariante: CABA, un manager fundador, una propiedad, 30 días gratuitos desde primera estadía real verificada, sin cobro automático; Free separado. No se inició período comercial ni se fijó fecha. Alta real requiere evidencias anteriores, decisiones humanas y autorización comercial expresa.

## Próxima acción y recuperación

Próximo trabajo offline: cerrar el ABI de propiedad y estadía sin huésped con productores protegidos existentes, y el contrato de catálogo público aprobado por propiedad. No existe una operación segura que permita completar esas garantías sólo repitiendo fixtures. Para validación nativa hace falta entorno y autorización específica adicionales; este cierre no los concede ni solicita GO genérico.

Recuperar desde el commit inmutable de este enlace y leer [NEXT-EXECUTION.md](NEXT-EXECUTION.md). Verificar refs y manifiestos; conservar avances concurrentes. Los dos prefijos QA contienen código, fuentes fijadas, outputs y logs; PROGRESS.md permite recuperar el primer checkpoint. No ZIP, despliegue, SQL, servicio operativo o comunicación real. **Beta V1 permanece NO-GO.**
