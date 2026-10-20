# Evidencia del paquete Windows A1 - 2026-10-20

GO para el paquete corregido y el ensayo ficticio. NO-GO para declarar recuperacion integral real de DEV. No se contacto DEV/PROD, no se usaron datos reales y no se desplego ni envio correo/mensaje. El ensayo uso runners estandar del repositorio publico, sin servicios pagos, secretos, caches ni artefactos con datos.

## Revision y correccion

Se revisaron ambos commits backend de la rama `qa/cheveni-a1-ipv6-loopback-fix-20261020`:
- `9a2f72fbe6787a891c27c58c15b2cadd6cb8c666`: admite exactamente ::1 en validateDiscardable, conservando rechazo de comodines.
- `6ba053682ec4d8a9c88c739861a7cf118b3bc448`: agrega cobertura IPv6 al caso unitario existente.

Faltaba corregir el control previo al aislamiento en isolateBootstrap. Ahora ambos puntos usan validateLoopbackPorts. Los bindings activos admiten exclusivamente 127.0.0.1 y ::1. Los declarados vacios exigen el default explicito 127.0.0.1 de la red propia. Un binding activo vacio, comodin IPv4/IPv6, direccion de LAN, hostname o direccion ambigua se rechaza, incluso mezclado con bindings seguros. Se revisan NetworkSettings.Ports y HostConfig.PortBindings.

Se conservan los controles de motor Docker local, propiedad/nombres aleatorios, escritores detenidos, red interna unica antes de cargar datos, integridad/cifrado, journal actual, compatibilidad del catalogo y rechazo de restauraciones inseguras. No se desactivo ningun control de seguridad.

## Pruebas ejecutadas

Workflow completo SUCCESS: https://github.com/MarcoAlexis10/chebot-web/actions/runs/39444813781

Commit de codigo ejecutado: `7deccef577953c1031e092095a02d4983b9a28af`, laboratorio web, misma rama QA. Codigo operativo del ZIP final identico; despues solo se actualizaron instrucciones y evidencia. El empaquetado final se reaudito sin repetir las suites aprobadas.

- Unitarias: 15/15 local y 15/15 en QA Linux, cero fallos/omitidas. Son las 13 existentes y 2 regresiones nuevas; no se suman reejecuciones como casos adicionales. Cubren direcciones inseguras en ambas fuentes, bindings mixtos, herencia explicita y bindings activos vacios.
- Windows nativo: extraccion del ZIP, verificacion del manifest y diagnostico PowerShell SUCCESS. Job https://github.com/MarcoAlexis10/chebot-web/actions/runs/39444813781/job/118703790474 . Este runner tiene Docker Linux no disponible; el job prueba diagnostico/paquete, no una restauracion Docker en Windows ni el hardware ASUS.
- Docker real IPv4/IPv6: contenedor efimero sin base inicializada, secretos ni volumen, publicado explicitamente en 127.0.0.1 y ::1; ambas direcciones se comprobaron en inspect. isolateBootstrap paso y validateDiscardable aprobo la red interna resultante. Rechazo de 0.0.0.0/:: comprobado sobre copias del inspect real en ambas fuentes. `PACKAGE_LAB_DUAL_LOOPBACK_PASS` y `PACKAGE_LAB_DUAL_LOOPBACK_CLEANUP_OK`.
- Recuperacion integral ficticia 6/6: job https://github.com/MarcoAlexis10/chebot-web/actions/runs/39444813781/job/118703789985 . Bootstrap vacio; fixtures Auth/FK/RLS/rol/Vault; captura y cifrado CVA2/CVK2; rechazo de manipulacion/frase incorrecta/journal posterior; destruccion comprobada de origen y volumenes, recreacion vacia; restauracion y comparacion de datos/Auth/Vault, FK, RLS, funciones y ACL.
- Limpieza: `PACKAGE_LAB_CLEANUP_OK` y `PACKAGE_WORKFLOW_CLEANUP_OK`. Solo recursos propios; no prune global.

Resultado sanitizado: `checks=6`, `success=true`, `realDevContacted=false`, `realDataUsed=false`, `fullDevRecoveryVerified=false`, `paidServices=0`.

## Paquete final

Nombre: CHE-VENI-A1-WINDOWS-20261020.zip. Raiz plana salvo dependencias runtime necesarias. MANIFEST.json actualizado con longitud y SHA-256 de cada archivo distribuido. Se verifican todos los archivos, estructura, ausencia de respaldos/claves/dumps/PEM/logs y patrones de credenciales. El CLI extraido abre material cifrado ficticio por entrada privada. El hash SHA-256 del ZIP final se entrega fuera del ZIP para evitar referencia circular.

Las dependencias y herramientas fijadas anteriormente se conservaron. build-package.py y windows-package-audit.py estan en QA; no hay instaladores adicionales ni credenciales dentro del ZIP. Instrucciones de reemplazo en LEEME-PRIMERO.txt: extraer en carpeta nueva y conservar la custodia fuera del paquete, sin reinstalar los requisitos ya aprobados en ASUS.

## Antecedentes conservados y limites

No se repitieron las suites generales de la aplicacion. Las pruebas nativas previas del canal privado Windows y AES/CVK2 permanecen aprobadas: https://github.com/MarcoAlexis10/chebot-web/actions/runs/39208116958/job/117915288736 . El ensayo previo 39210500913 es antecedente, no la evidencia nueva de IPv6. Los resultados aportados desde ASUS son evidencia del operador; este cierre no opera esa notebook a distancia.

Storage del ensayo nuevo esta vacio. Paginacion/binarios/rutas de Storage se prueban con mocks; esto no demuestra restauracion de buckets reales. El restaurador sigue bloqueando Storage no vacio y diferencias administradas que requieren reconciliacion privada. Auth funcional real, claves/servicios gestionados, ACL globales/administradas y configuracion/proveedores externos no se declaran recuperados. La matriz y unica lista de intervenciones permanecen en COBERTURA-Y-RECUPERACION.md.

A1 real solo podra cerrarse despues de una captura privada real y su recuperacion comprobada, con todos los componentes reconciliados. A2/A3 conservan su preparacion anterior sin instalar, desplegar ni enviar SMTP.
