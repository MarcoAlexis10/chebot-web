# Integración original retenida — QA offline

Requiere Linux con namespaces de usuario/red, Node >=20, Python, OpenSSL y dos checkouts completos hermanos llamados `web` y `backend`. Los pins de SOURCE-PINS.json deben coincidir. No usa SQL, Supabase ni credenciales. El build conserva la puerta legal original cerrada.

La prueba interpreta localmente las rutas exactas de `backend/vercel.json`, importa sus destinos reales, incluido `index.js`, y los sirve por HTTPS sólo en loopback de un namespace nuevo. Eso no ejecuta Vercel. Un transporte Node conecta el inline JavaScript administrativo completo del build con esos handlers; no aplica CORS de navegador y usa DOM simulado/eventos sintéticos. No es una autenticación ni una operación admitida.

El launcher borra el entorno heredado, verifica cambio de namespace, ausencia de rutas externas y ENETUNREACH. Sólo la opción loopback levanta `lo` mediante ioctl para el servidor local. No modificarlo para permitir egress.

Desde el directorio padre de ambos checkouts, después del build offline original:

```sh
python web/qa/integral-held-v1/run-isolated.py --loopback -- node --test --test-reporter=tap web/qa/integral-held-v1/original-chain.test.mjs
```

Chromium/Playwright pertenecen al entorno de ejecución; no se instalan dependencias ni se descargan navegadores. En este entorno Chromium falla antes de arrancar por socket interno EPERM; los cuatro casos de navegador quedan SKIP y no se contabilizan como aprobados. La salida OBSERVATIONS.json conserva el error, intercambios HTTP, lecturas de cuerpo e intentos de proveedor. Un exit 0 con SKIP no satisface el requisito de navegador para GO.

La corrección del runner backend sólo fija `--test-reporter=tap`; sus pins de módulos/suites y guards permanecen. No repetir pruebas ya acreditadas salvo una modificación o fallo que lo justifique. El cierre único y la decisión están en `../reviews/integral-held-20261111/CLOSURE.md`.
