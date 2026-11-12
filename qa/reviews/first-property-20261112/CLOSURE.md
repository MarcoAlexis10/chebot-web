# Primera propiedad — cierre QA offline, 12/11/2026

**Beta V1 NO-GO.** Se integró el subset exacto de captura de primera propiedad con el candidato funcional existente, sin writer, SQL o servicios. Diez casos nuevos únicos PASS en Node; ningún alta, efecto o COMMIT real acreditado.

## HEADs y publicaciones

| Repositorio | HEAD inicial verificado | HEAD funcional final verificado |
|---|---|---|
| chebot-web, qa/cheveni-integral-held-20261111 | f2b5819829fcb8668e698c934add058efbb3746a | 0a327637e64d17c215eca244fb3de5a88e13e0d6 |
| chebot-backend, misma rama QA | 9beb837a621f9a8f06601043afa64b3bba317cb5 | Sin cambios, mismo SHA |
| cheveni-qa-lab, qa/cheveni-native17-policy-closure-20261106 | ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a | Sin cambios, mismo SHA |

El HEAD de publicación documental es el commit que contiene este CLOSURE, identificable en el enlace inmutable de entrega; no se confunde con el HEAD funcional de la tabla. Se comprueba después de publicar. Sólo se añaden/actualizan los dos directorios nuevos de este lote; todos los blobs anteriores se conservaron. Sin cambios operativos o ramas nuevas.

Checkpoints publicados y recuperables, todos con [skip ci]:

1. f98af7365e045933f1c46abf902721da05c82be1 — contrato exacto property_create, captura/defaults y negativas.
2. a9e206a044c5f6cd060794edd419d3f29065f49e — UNKNOWN frente a ACK, read/2, privilegios propuestos y privacidad.
3. a1363d89241d3be0a8cb88a4bb556882be0d3e79 — composición de UI inerte y binding separado de expiración del token.
4. 0a327637e64d17c215eca244fb3de5a88e13e0d6 — manifiesto de bytes, verificador reproducible y evidencia de pruebas/fallos.

Antes de cada publicación se consultó el ref, compararon blobs y leyeron ambos workflows web. Sus filtros de rama no coinciden con la rama QA utilizada; no se activaron workflows ni se usaron APIs de ejecución. Backend y QA-lab permanecen sólo lectura.

## Código e incompatibilidades resueltas

Paquete: [first-property-20261112-v1](../../first-property-20261112-v1/README.md). [Contrato y alcance](PROPERTY-CAPTURE.md).

- `capture-contract.mjs` reutiliza el parser privado original y la comparación del dominio ya existente. Exige property_create, target NULL, una fila exacta owner/member/account/revision, fuente de fundador separada y referencias actuales de cupo/jurisdicción/dataset/epoch. Rechaza building no representable y cambios de defaults; no elimina campos para forzar compatibilidad.
- La comparación de intención incluye comando/intento/sesión, binding completo del dominio, revisión de fundador, key y captura privada estructurada. Se corrigieron dependencia del orden de claves y omisión de scopeRevision. Es comparación sintética, no admisión durable ni conflicto SQL.
- `ProviderTokenObservation` distingue issuer/user/session/revisión/iat/exp de la frescura de observación. p_expiry coincide exactamente con exp en segundos; cambios de token alteran el binding. El contrato anterior no aportaba expiración JWT verificable: no se inventa desde expiresAtMs. Sigue siendo observación ficticia, no JWT verificado.
- `reconciliation.mjs` separa resultado de función/ACK de COMMIT externo, efecto, journal y readback. Se reprodujo con un doble que el adapter original transforma COMMITTED en DURABLE_EFFECT; el sucesor conserva UNKNOWN, propertyId NULL y prohíbe reenvío. Incluso una cadena sintética consistente permanece UNKNOWN. No se usa el adapter original en la composición.
- `reader-profile.mjs` y declaraciones tipadas preparan read/2 y perfil independiente. El reader antiguo exige la misma identidad que el writer; no se reutiliza vía SET ROLE. Se rechazan propuestas con DML, herencia del writer, PUBLIC EXECUTE, ownership de tablas, BYPASSRLS o helpers sin revisar. [ABI y privilegios](READER-ABI.md). No SQL generado/instalado ni ACL efectiva acreditada.
- `candidate.mjs` compone las fronteras anteriores con el recorrido existente. `materialize.mjs` sustituye el formulario incompatible de dirección libre por street/number/floor/unit, todos vacíos, disabled e inert. Enlaza revisión → borrador HELD/no creado → lectura UNKNOWN → configuración HELD; no fabrica propertyId o revisiones. Los diez assets JS/CSS previos se conservan idénticos. Dieciocho salidas QA, sin build operativo, red o servidor.

## Pruebas efectivamente ejecutadas

| Área | Casos nuevos únicos al finalizar | Evidencia y límites |
|---|---:|---|
| Captura/autoridad/defaults/intención/token | 4 PASS | Vectores ficticios y parser original; no Auth/SQL |
| ACK y conciliación | 3 PASS | Un doble del adapter histórico y modelos de correlación/revocación/reloj; no carreras nativas |
| Perfil de reader | 1 PASS | Fuente y propuesta estáticas; no catálogo/ACL real |
| Composición y UI | 2 PASS | Puertos cerrados, HTML/enlaces/CSP y sintaxis JS; no navegador o DOM real |
| **Total único** | **10 PASS, 0 FAIL final** | Repeticiones/subaserciones no sumadas |

[TEST-EVIDENCE.json](TEST-EVIDENCE.json) conserva comandos, filtros, hashes y logs. Hay cinco ejecuciones con fallos intermedios propios, corregidos: orden de claves, scopeRevision, tipo string de datasetId (dos casos fallaron en esa ejecución), accessor de efecto leído antes de validación y token-expiry sin binding. Sus FAIL/PASS se conservan; no representan fallos operativos observados ni se borraron del informe.

Regresiones sólo de este paquete afectado: tres casos de captura tras añadir token binding y dos de reader al ampliar identidad/sesión/iat/exp, más las reejecuciones focales de corrección. Los 20 casos anteriores, 19+3 y suites históricas 31/66/14/18/17 no se repitieron.

Verificación adicional ejecutada, **sin contar como nuevos tests**: 188 archivos fuente locales por bytes/SHA-256/git blob; cuatro blobs Native17 por árbol GitHub inmutable; 37 archivos del paquete, 18 salidas y sintaxis de 16 JS/MJS. Python verificador reproducible y log incluidos. Las declaraciones TypeScript no fueron compiladas. Los hashes finales del manifiesto no pretenden acreditar el SHA de cada versión intermedia antes de su corrección.

Launcher existente run-isolated.py: namespace de red separado, sin rutas IPv4, conexión externa rechazada errno101, sin credenciales heredadas. Esto acredita el perímetro de esas ejecuciones Node, no un host Native17 ni independencia física. No SQL, HTTP local nuevo, navegador, JWT administrado, firma, COMMIT o restore ejecutados en este lote.

## Retenciones y bloqueos concretos

La fuente fijada `private_mutation_authority_v1` contiene WHERE false y devuelve cero filas. No se sustituyó por constantes, claims o callbacks positivos. Writer prepare/write permanecen cerrados y el reader UNKNOWN. Faltan productor protegido del fundador/cupo/jurisdicción, procedencia del original, admisión con attempt/revisiones, reader/RLS/ACL independientes y comprobantes externos.

La tabla property_capture_v1 duplica dirección/unidad para comparar el intento original. [Propuesta D02-A específica](PRIVACY-D02A.md): finalidad, minimización, acceso, custodia y retención pendientes, sin inventar plazos/aprobaciones ni persistir datos reales. El key por intención no reemplaza los argumentos privados; si se pierde el original no se reconstruye desde cliente/digest y no se reenvía.

Native17 HOST_NOT_AVAILABLE; N01–N12 NOT_AUTHORIZED/NOT_RUN. Auth administrado, revocación/concurrencia, COMMIT, journal/witness, A2 integral, D02-A específica y legal/prelegal siguen pendientes. Chromium AF_UNIX/EPERM no se reintentó; cuatro casos históricos NOT_RUN. Las once mutaciones históricas siguen operativamente retenidas. [Matriz NO-GO](GO-NO-GO.md).

## Recuperación y próxima acción

[RELEASE-CANDIDATE.json](RELEASE-CANDIDATE.json) fija fuentes/candidato e inventario A2 sin secretos. PACKAGE-MANIFEST SHA-256: `a201ee2f197e436bd61d687b70fa1d32cad2043ea69cbed33f467a223d577904`. SOURCE-PINS conserva repos/SHAs y blobs. No ZIP.

[Pasos concretos y reproducción focal](NEXT-EXECUTION.md). Prioridad siguiente: productor protegido property_create con procedencia Auth actual y relación owner/member/account, founder/cupo/jurisdicción bajo fence/revocadores, más decisión específica de custodia del original. Sin esas dependencias no agregar otro resultado positivo o instalar un reader que herede permisos de escritura. Una validación nativa necesita autorización separada y host acreditado; este cierre no la concede.

El piloto conserva sólo CABA, un manager fundador, una propiedad y 30 días gratuitos desde la primera estadía real verificada; sin cobro/conversión automática. No se inició el trial, contactó usuarios o habilitó operaciones. Che Vení Free separado. No hay fecha ni autorización de lanzamiento.
