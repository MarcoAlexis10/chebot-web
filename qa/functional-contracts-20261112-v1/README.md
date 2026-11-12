# Integración de contratos funcionales — QA retenida

Extiende los validadores y componentes existentes. No instala un ABI SQL/HTTP, emite una autorización o conecta al build. Beta V1 NO-GO.

evidence-binding.mjs implementa el sucesor mínimo de binding entre comando, proveedor/miembro, revisiones/floor independientes, cupo/jurisdicción/building/decisión y referencia de huésped. Son observaciones sintéticas explícitas, no productores protegidos. Las formas están en evidence-abi.d.mts; no se concede autoridad con metadata JWT o account_id del formulario.

El handle es local a una instancia WeakMap y guarda sólo el snapshot sintético revisado en memoria. No es original confiable, admisión NEW/KNOWN, idempotencia SQL o custodia durable. No devuelve argumentos privados y permite release; no garantiza borrado físico de cadenas JS. No usar datos reales ni persistir snapshots/frames/hashes personales. La comparación tipada de argumentos ignora orden de claves; no es canonicalización/digest SQL o protocolo cripto nuevo.

Los puertos protegidos por defecto ignoran argumentos y callbacks y permanecen HELD. Toda inspección de recibo del cliente permanece UNKNOWN, aunque coincida en campos y contenga referencias llamadas commit/readback/journal. No hay COMMIT o firma observado. Cuatro casos nuevos Node PASS, sin repetir las 19 + tres anteriores.

Reproducción desde checkout padre con web/backend hermanos:

```sh
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/functional-contracts-20261112-v1/binding.test.mjs
```

Fuentes/HEADs y comandos efectivos en qa/reviews/functional-contracts-20261112/. Native17 HOST_NOT_AVAILABLE; N01–N12 NOT_AUTHORIZED/NOT_RUN; Chromium no se reintenta. Próximo: compatibilidad exacta del checkout Native17 (suspend no es property.pause), efectos/revocaciones y productor mínimo de catálogo.
