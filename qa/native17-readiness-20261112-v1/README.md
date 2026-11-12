# Native17 readiness — candidato retenido, 12/11/2026

Sucesor del paquete `incident-native17-review-20261111-v1` sellado en web `4d4467042560a56ac7af0633e7c93064d2fad2b0`; backend `9beb837a621f9a8f06601043afa64b3bba317cb5`, Native17 `ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a`, ambos sólo lectura. Este directorio no participa del build ni del runtime operativo.

`build_review.py` verifica los 20 archivos de origen y genera siete SQL sucesores abortados, EXPECTED-CATALOG, DERIVATION y el binding JS corregido. Nunca invoca un motor, parser, cliente SQL o shell. No quita los abortos, abre gates o provee respuestas positivas de autoridad. El source base anterior se conserva intacto en su directorio; el sucesor deniega expresamente los entries antiguos sin proveedor.

Cambios: historial inmutable sin FOR UPDATE/permisos UPDATE; original protegido validado antes de devolver KNOWN; providerRef proyectado como metadato y vinculado por claves compuestas; políticas restrictivas y ENABLE/FORCE propuestos para todas las tablas alcanzadas; revalidación final del proveedor; captura de privilegios efectivos de owners/schema; binding JS revalida expiración después de awaits.

Sólo hay policies restrictivas nuevas. Sin una policy permisiva aplicable aprobada, el acceso sigue denegado incluso con predicados verdaderos. No se agrega USING(true) para completar el ensayo. Scope/floor/proveedor/original y gates siguen cerrados. Proyección y constraints son texto de revisión, no unicidad SQL observada. No hay persistencia real; incluso IDs/referencias necesitarán finalidad, custodia y retención D02-A.

`coherence.mjs` revisa incompatibilidades textuales delimitadas entre archivos; no es un parser SQL ni demuestra ausencia de otras incompatibilidades. `host-observation.py` sólo lee metadatos del entorno actual y ubica binarios sin ejecutarlos; no acredita un host PostgreSQL ni escanea otros hosts. El launcher existente sólo se usa para Node sin red. N01–N12 permanecen NOT_AUTHORIZED / NOT_RUN.

Ejecutables offline permitidos, desde la raíz de este checkout:

```sh
python web/qa/native17-readiness-20261112-v1/build_review.py
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/native17-readiness-20261112-v1/coherence.test.mjs web/qa/native17-readiness-20261112-v1/provider-expiry.test.mjs
```

`--conditions=baseline` en Node reproduce los fallos contra las fuentes anteriores, no debe usarse como resultado final. Ningún comando de este README autoriza SQL, infraestructura o servicios. Ver el [cierre y decisión](../reviews/native17-readiness-20261112/CLOSURE.md). **HOST_NOT_AVAILABLE / Beta V1 NO-GO.**
