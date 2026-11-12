# Primera propiedad y preparación ASUS — cierre QA diurno, 12/11/2026

**Beta V1 NO-GO.** Se concretó el sucesor retenido de autoridad/lectura de primera propiedad, se corrigió una omisión de floor en su revisión QA y se preparó el diagnóstico ASUS para esta noche. No se resolvió un productor protegido real ni se acreditó SQL, Auth o laboratorio.

## HEADs y checkpoints

| Repositorio/rama | Inicial verificado antes de escribir | Final funcional verificado |
|---|---|---|
| chebot-web · qa/cheveni-integral-held-20261111 | 427ec580c8562a4bd1591f392b2ec17e001f1c1f | ae541954bc2352263cef0366a1b8c7c4cf36f170 |
| chebot-backend · misma rama QA | 9beb837a621f9a8f06601043afa64b3bba317cb5 | Mismo SHA, sólo lectura |
| cheveni-qa-lab · qa/cheveni-native17-policy-closure-20261106 | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a | Mismo SHA, sólo lectura |

La publicación documental añade el commit que contiene este CLOSURE; su HEAD exacto es el del enlace inmutable de entrega, comprobado después de publicar. No se confunde con el HEAD funcional anterior.

Checkpoints publicados, todos [skip ci]:

1. 94903faa2c2c95e8853d1147e3d0a8a643944998 — incompatibilidad de autoridad circular y caller pairs, fuente fijada.
2. 6d74363081df8d71c2e3b823157bb8b273edcee5 — read/2 post-captura, corte actual separado de historia/floor, referencia original y composición.
3. fa13808171f8865ba907ec680b001fe4512722fd — ASUS-PREFLIGHT y catálogo manual NOT_RUN, sin ejecución del equipo.
4. ae541954bc2352263cef0366a1b8c7c4cf36f170 — hashes, verificador y evidencia de pruebas/fallos.

Sólo los nuevos directorios `qa/property-authority-preflight-20261112-v1/` y `qa/reviews/property-authority-preflight-20261112/` se publicaron. Se conservaron todos los blobs anteriores. Antes de publicar se verificaron ref/blobs y ambos workflows web: sus filtros no corresponden a esta rama. Sin ramas nuevas, force-push, merge o APIs de ejecución Actions.

## Trabajo técnico y compatibilidad

[Paquete y reproducción](../../property-authority-preflight-20261112-v1/README.md). [Delta de contratos](CONTRACT-DELTA.md).

- `authority-source.mjs` inspecciona nueve extractos exactos de fuente original. scope_v2 exige propiedad activa no NULL y manage_stays; manager_scope pasa por launch, que además requiere trial iniciado. Es una dependencia circular para crear la primera propiedad. Se rechaza esa composición; no se inicia un trial ni se altera el codec create_stay.
- auth_live/fence contienen pares service_* que no admiten directamente los principals privados de captura/read/2. Se reutilizan como contratos de referencia, no ampliando grants o inventando identidad. El productor private_mutation_authority_v1 sigue WHERE false. La frontera operativa se reutiliza del paquete anterior y permanece cerrada.
- `read-cut.mjs` concreta read/2: 26 argumentos propuestos, sin generar SQL o conectar un driver. La consulta usa permiso property_capture_read y slot ocupado coherente; no cupo libre/property_create. Conserva original histórico y compara por separado usuario/sesión/iat/exp/request/corte actuales, antes y después. Un cambio de sesión/revisión no reescribe la historia ni permite usar claims anteriores como permiso.
- Se exige floor independiente antes/después reutilizando reviewRevisionCut, con igualdad de dataset/epoch/autoridad/restricciones/inventario/digests y procedencias. Los modelos de prueba son explícitamente sintéticos y no acreditan productores o custodia externos. Aun con consistencia completa, resultado UNKNOWN, propertyId NULL y ningún reenvío.
- `original-reference.mjs` demuestra que mismo key por intención y UUID de original no detectan por sí solos una unidad diferente. Se conserva la comparación de argumentos existente y se exige comparador protegido; no se elimina la copia ni añade otro snapshot/hash personal. [Matriz D02-A de datos/finalidad/acceso/custodia/decisiones](D02A-DATA-MATRIX.json). La decisión general D02-A previa se conserva; no se inventan plazos o aprobación específica.
- `candidate.mjs` compone fundador → solicitud → admisión retenida → lectura/recover UNKNOWN → preparación de configuración HELD. Ignora callbacks/roles/recibos positivos y originales del cliente. Reutiliza la UI/generadores inertes previos; no crea otra aplicación, endpoint, build o vista operacional.

## Evidencia realmente ejecutada

| Área | Casos nuevos únicos | Clasificación |
|---|---:|---|
| Reutilización de fuente de autoridad | 1 PASS | Fuente estática inspeccionada en Node y frontera cerrada |
| Reader post-captura, historia/corte/floor actual | 2 PASS | Modelos ficticios de permisos, relaciones, reloj y revocación; no carrera SQL |
| Original/referencia opaca/minimización | 1 PASS | Comparador QA de argumentos ficticios; no almacenamiento |
| Composición del recorrido retenido | 1 PASS | Puertos cerrados; no integración operacional |
| Catálogo ASUS | 1 PASS | Revisión estática en Node; no comando del equipo ejecutado |
| **Total** | **6 PASS, 0 FAIL final** | No se suman repeticiones o subaserciones |

[TEST-EVIDENCE.json](TEST-EVIDENCE.json) contiene comandos/filtros, resultados exactos, hashes y logs. Se conservan dos fallos intermedios: primero, un error de preparación del fixture al ampliar la prueba sin haber agregado floor; segundo, la aserción específica que detectó la consistencia incorrecta del modelo sin floor independiente. Tras corregir el contrato se ejecutaron únicamente los dos casos reader afectados y aprobaron. La salida operacional permaneció UNKNOWN incluso antes de esa corrección.

No se repitieron los diez casos del cierre anterior, los veinte anteriores o suites históricas. Node v24.22.1, launcher existente con namespace de red separado, sin rutas IPv4, conexión externa errno101 y sin credenciales heredadas. Esa evidencia corresponde a Node, no acredita un host Native17.

Verificación estática adicional PASS, sin contar como casos nuevos: 226 fuentes locales por bytes/SHA-256/git blob (pines heredados), siete blobs Native17 de origen y nueve extractos exactos, 17 archivos del paquete y sintaxis de nueve MJS. TypeScript no compilado. No se presenta un hash como prueba de comportamiento SQL ni como SHA de todas las versiones intermedias.

## ASUS esta noche: preparación, no laboratorio acreditado

[ASUS-PREFLIGHT.md](ASUS-PREFLIGHT.md) prepara consultas manuales de Windows/WSL/Docker/Ubuntu, con gates y revisión **una por vez**. El [catálogo NOT_RUN](../../property-authority-preflight-20261112-v1/ASUS-MANUAL-PLAN.json) tiene 25 consultas condicionales, ninguna ejecutada aquí o en otro runtime. Se consultaron referencias oficiales de Microsoft/Docker para su sintaxis/alcance; eso no prueba el estado de ASUS.

El procedimiento evita datos personales/credenciales, frena ante overrides o contexto Docker remoto, no inicia servicios/distribuciones detenidas, no cambia protecciones o ejecuta archivos bloqueados, y sólo inventaría metadata de una imagen ya local. No descarga o inicia PostgreSQL. Los criterios separan capacidad del host de aislamiento real de worker, privilegios, red, mounts, procesos, límites y descarte. Ver un marcador rootless o seccomp no basta.

Native17 continúa HOST_NOT_AVAILABLE; N01–N12 NOT_AUTHORIZED/NOT_RUN. Una autorización posterior debe especificar host observado, método/acciones faltantes, binario 17.11 y procedencia, artefactos SHAs, roles/datos ficticios, ensayos, límites/ventana/costo cero y descarte. No se solicita ni concede un GO genérico en este cierre.

## Lo que sigue retenido

[BLOCKERS.md](BLOCKERS.md) resume las dependencias actuales. Faltan productor protegido de autoridad/revisiones/fundador/cupo/jurisdicción y cobertura de revocadores; original confiable y decisión específica D02-A; reader/RLS/ACL/transitivas; Auth administrado; COMMIT externo y journal/witness independientes; PostgreSQL 17.11 autorizado; A2 integral; navegador compatible; evidencias y autorizaciones legales/comerciales. Las once mutaciones históricas siguen HELD.

No SQL/roles/grants instalados, servicios activados, datos reales, firmas, comunicaciones, gastos o cambios en DEV/PROD/main. No se sondeó nuevamente Work para PostgreSQL ni se reintentó Chromium. Los cuatro casos de navegador históricos siguen NOT_RUN. Función/ACK/COMMIT/efecto/reader/journal/witness siguen separados y ninguna ausencia de ACK significa rollback.

## Recuperación y próximo paso concreto

[Pasos de continuación](NEXT-EXECUTION.md). PACKAGE-MANIFEST SHA-256 `d44a8329ad0d1f5cae9c91f04a0fe46a8a9b30aacb586a0f192f5e9e0f18e551`; fuentes y blobs en SOURCE-PINS/NATIVE-SOURCE-PINS del paquete. El candidato funcional integral permanece retenido; este módulo amplía los contratos del anterior sin conectar el build.

Esta noche: observar ASUS físicamente con W01 y revisar antes de seguir, sin reparar o instalar para hacer pasar el preflight. En código: resolver una fuente protegida específica property_create compatible con NULL target y sin trial iniciado; read/2 requiere su propia autoridad de consulta y original/floors confiables. Sin esas fuentes, no agregar resultados positivos o generar un instalador equivalente al que ya está bloqueado.

Piloto sin cambios: sólo CABA, un manager fundador, una propiedad, 30 días gratuitos desde la primera estadía real verificada; sin cobro/conversión automática, Free separado. No se inició el trial ni se habilitaron usuarios. Sin fecha prometida. No ZIP.
