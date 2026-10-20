# Actualizacion A1 - 2026-10-20

Continuacion de los commits backend 9a2f72fbe6787a891c27c58c15b2cadd6cb8c666 y 6ba053682ec4d8a9c88c739861a7cf118b3bc448. Rama de revision en backend y laboratorio web: `qa/cheveni-a1-ipv6-loopback-fix-20261020`. Los antecedentes siguientes siguen conservados; no son ejecuciones nuevas.

Se completo tambien el control previo al aislamiento: ambos puntos usan `validateLoopbackPorts`. Direcciones activas permitidas exactamente 127.0.0.1/::1. Un HostIp declarado vacio requiere el default explicito 127.0.0.1 de nuestra red; un HostIp activo vacio se rechaza. Se conservan propiedad, nombre aleatorio, red interna unica y controles de restauracion. Se agrega una prueba Docker con publicaciones reales dual loopback y rechazo de comodines sobre inspect.

Las 13 pruebas previas mas 2 regresiones nuevas constituyen 15 casos, sin contar reejecuciones como casos adicionales. La evidencia de la ejecucion nueva y sus limites esta en EVIDENCIA-QA.md. El diagnostico Windows no comprueba el hardware ASUS a distancia.

A1 real sigue NO-GO hasta respaldo privado y recuperacion real comprobados; Storage no vacio, DDL/ACL administrados y servicios externos conservan los limites documentados. A2/A3 mantienen su preparacion anterior sin instalacion, despliegue ni SMTP real.

---

# Continuidad de Che Veni Concierge Beta V1

Bases de esta entrega: backend QA `dd9de42b332e3258eb6029c94e7ecb05a489b9cc`; laboratorio web QA `6698a88065bd09bcf4bb3807b6601a97fc8b9c5f`. No se reinicio el proyecto. No se ejecutaron las suites generales ya aprobadas, migraciones, despliegues, mensajes, SMTP ni respaldo real de DEV.

Se agrega una rama QA aislada por repositorio. El laboratorio publico contiene codigo generico, datos generados exclusivamente en memoria y evidencia sanitizada; no incluye fuente privada de la aplicacion ni archivos reales. No se generan artifacts/caches de respaldos en CI. Los recursos Docker propios se identifican por nombre aleatorio y etiqueta; la limpieza no usa prune global.

La suite anterior del laboratorio (12 fases + 5 controles, run 39189212437) se conserva como aprobada y NO se repitio. La nueva suite de este paquete verifica la interfaz/formato/guardas nuevos; su ensayo no equivale a prueba del DEV actual. Los fallos de desarrollo y sus correcciones quedan en commits/evidencia; ninguna ejecucion fallida habilita GO.

A2 sigue preparado en el runbook canonico del backend y su plan estructurado, condicionados al cierre real de A1 y autorizacion operativa posterior. Se conserva la numeracion W01-W10. A3 sigue separado: proveedor y configuracion privada pendientes; sin envios ni cambios de credenciales. Las ramas de esta entrega NO son candidatas de despliegue.

La decision y lista unica de intervenciones necesarias estan en COBERTURA-Y-RECUPERACION.md. Los resultados y enlaces concretos estan en EVIDENCIA-QA.md.
