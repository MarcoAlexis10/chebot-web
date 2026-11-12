# Recuperación y siguiente acción

1. Leer CLOSURE.md y TEST-EVIDENCE.json de este cierre. Consultar HEAD actual de la rama web qa/cheveni-integral-held-20261111 y preservar cualquier avance posterior. Backend y QA-lab sólo lectura.
2. Recuperar `qa/first-property-20261112-v1/`, SOURCE-PINS y PACKAGE-MANIFEST. El verificador requiere web y backend hermanos; no instalar dependencias ni ejecutar scripts de producto. Ejecutar verify-artifacts.py sólo para verificar los bytes recuperados, no repetir suites aprobadas por rutina.
3. El siguiente bloqueo técnico es un productor protegido específico property_create: identidad QA verificada, sesión/revocación vigente, una fila owner/member/account, founder/cupo/jurisdicción con revisiones y orden de fence/revocadores. El productor original WHERE false debe seguir cerrado. No reutilizar CurrentResolution de incidencias por similitud nominal ni rellenar con fixtures/claims.
4. En paralelo, cerrar la decisión específica de custodia/minimización de la copia address/floor y la procedencia del original. Sin ella no preparar persistencia nueva. El key original es por intención: no permite reconstruir/validar dirección ni resolver conflictos sin el original.
5. Sólo tras esas fuentes: revisar la admisión nativa que añade attempt/revisiones/procedencia sin cambiar el significado del writer. KNOWN nunca debe producir una nueva mutación. Preparar implementación de read/2 con principal independiente, políticas RLS y ACL transitivas revisadas; no invocar property_receipt_v1 mediante credenciales del writer.
6. Un futuro laboratorio requiere autorización específica y host acreditado. Native17 sigue HOST_NOT_AVAILABLE; N01–N12 NOT_AUTHORIZED/NOT_RUN. No PostgreSQL, descargas, infraestructura, Actions ni SQL. No investigar el mismo runtime ni reintentar Chromium.

## Reproducción focal, únicamente cuando un cambio lo justifique

Desde el padre de los checkout web/backend:

```sh
python web/qa/integral-held-v1/run-isolated.py -- python web/qa/first-property-20261112-v1/verify-artifacts.py
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/first-property-20261112-v1/capture.test.mjs
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/first-property-20261112-v1/reconciliation.test.mjs
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/first-property-20261112-v1/profile.test.mjs
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/first-property-20261112-v1/integration.test.mjs
```

Son comandos de reproducción, no una ejecución adicional acreditada en este cierre. Los comandos efectivamente usados, filtros, resultados y fallos están en TEST-EVIDENCE.json. Los 20 casos anteriores y todas las suites históricas se conservan sin repetir.

La vista generada usa rutas /manager/ relativas a su propio root generated; es artefacto QA retenido, no desplegar o montar en producto. No levantar servidor para este lote. No ingresar datos reales ni convertir un link a configuración en autorización. Mantener UNKNOWN después de posible despacho o pérdida del original y no mostrar un propertyId a sesión revocada.
