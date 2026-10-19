# Continuidad de Che Veni Concierge Beta V1

Bases de esta entrega: backend QA `dd9de42b332e3258eb6029c94e7ecb05a489b9cc`; laboratorio web QA `6698a88065bd09bcf4bb3807b6601a97fc8b9c5f`. No se reinicio el proyecto. No se ejecutaron las suites generales ya aprobadas, migraciones, despliegues, mensajes, SMTP ni respaldo real de DEV.

Se agrega una rama QA aislada por repositorio. El laboratorio publico contiene codigo generico, datos generados exclusivamente en memoria y evidencia sanitizada; no incluye fuente privada de la aplicacion ni archivos reales. No se generan artifacts/caches de respaldos en CI. Los recursos Docker propios se identifican por nombre aleatorio y etiqueta; la limpieza no usa prune global.

La suite anterior del laboratorio (12 fases + 5 controles, run 39189212437) se conserva como aprobada y NO se repitio. La nueva suite de este paquete verifica la interfaz/formato/guardas nuevos; su ensayo no equivale a prueba del DEV actual. Los fallos de desarrollo y sus correcciones quedan en commits/evidencia; ninguna ejecucion fallida habilita GO.

A2 sigue preparado en el runbook canonico del backend y su plan estructurado, condicionados al cierre real de A1 y autorizacion operativa posterior. Se conserva la numeracion W01-W10. A3 sigue separado: proveedor y configuracion privada pendientes; sin envios ni cambios de credenciales. Las ramas de esta entrega NO son candidatas de despliegue.

La decision y lista unica de intervenciones necesarias estan en COBERTURA-Y-RECUPERACION.md. Los resultados y enlaces concretos estan en EVIDENCIA-QA.md.
