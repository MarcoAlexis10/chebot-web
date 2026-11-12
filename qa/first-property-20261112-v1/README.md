# Primera propiedad — integración retenida

Continúa desde write_property_capture_v1 y el parser original ya fijados. No busca otra arquitectura, no conecta writer/driver y no ejecuta SQL. Se conservan los defaults exactos del cierre anterior y los datos no representables se rechazan.

capture-contract.mjs revisa la ABI property_create con target null, owner/cuenta/miembro/revisión exactos, fuente de fundador separada y duración de token en segundos. Reutiliza reviewPropertyCapture y todo su binding/cupo/jurisdicción/revisiones. nativeArgumentNames tiene los once parámetros del writer, sin devolver dirección o plan de despacho. La autoridad SQL original tiene WHERE false: ninguna fila o aprobación operativa está disponible. Las observaciones positivas de forma son vectores sintéticos, nunca Auth verificado.

compareIntentReview es sólo comparación de revisión, sin canonicalización o digest SQL nuevo. Considera también attempt/session/cuenta/revisión/key y no confunde el key de intención con prueba del original privado. Los defaults protegidos ignoran callbacks; read conserva UNKNOWN. No se genera un key, firma o grant real.

Comando de reproducción (no repetir sin cambio afectado):

```sh
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/first-property-20261112-v1/capture.test.mjs
```

Tres casos únicos iniciales PASS; una repetición focal corrige orden de claves del comparador nuevo, con FAIL/PASS conservados. No se repiten 20 ni 19 + tres del historial. Native17 HOST_NOT_AVAILABLE, N01–N12 NOT_AUTHORIZED/NOT_RUN; Chromium no se reintenta. Beta V1 NO-GO.
