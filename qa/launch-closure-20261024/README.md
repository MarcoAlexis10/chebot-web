# Cierre de lanzamiento: composición nueva, solo QA ficticia

Base legal privada: 343d37df5eaac1b2e51124ca3ec7f399c9e59952. No migración ni autorización operativa.

- `LIFECYCLE-FICTIONAL-DO-NOT-INSTALL.sql`: composición transaccional de autoridad legal vigente, identidad/scope, acceso temporal, cierre, baja, solicitud de supresión y reloj ficticio. Reutiliza como dependencia el kernel QA legal ya aprobado; no ejecuta sus suites.
- `provider-boundary.mjs`: candidato de salida estructurada para catálogo público. Sin texto libre, contactos, URLs, claves ni Meta. Transporte inyectado falso; no integración real con proveedores.
- `qa/lifecycle-postgres.mjs`: casos nuevos con PostgreSQL 17.11, contenedor propio `network=none`, sin puertos, fixture efímera y limpieza independiente. Solo puede abrir sesiones dentro de la fixture creada por el mismo proceso. No acepta DSN.
- `qa/provider-boundary.test.mjs`: 10 casos nuevos locales, sin red.
- `qa/workflow.yml`: ensayo gratuito en laboratorio público existente, solo nuevo código ficticio. No copia código de la aplicación privada, textos jurídicos definitivos ni información personal. Sin secretos, despliegues o conexiones a Supabase.

La fila `SUPERVISED_FIXTURE` solo se crea por bootstrap de la fixture. No existe operación de aprobación real. Todas las salidas dicen `operationalApproval:false`. No se importa este módulo desde rutas productivas. Los bloqueos preventivos del proyecto se conservan.

El reloj nuevo es un contrato de composición ficticio, NO reemplaza ni certifica la función histórica `concierge_begin_beta_on_first_verified_stay`. Esta sigue su propio estado staged/instalación histórica y necesita integración autorizada independiente. La política propuesta bloquea trabajo nuevo al vencer 30×24 horas, permite terminar una estadía ya verificada solo dentro de su propia ventana y mantiene salida/ayuda. Aún requiere decisión operativa del propietario; no extiende ni factura.

`outbox` es una cola transaccional local PENDING. No es un registro independiente durable, ni acredita propagación, baja externa o supresión. Una solicitud de supresión conserva evidencia mínima para revisión; no afirma destrucción total. La atención de derechos posterior a revocación/expiración se realiza por el canal privado de derechos, pendiente de operación verificada: no exige reactivar o reaceptar términos.

Reproducción exclusivamente descartable: usar dependencias fijadas del repositorio, cargar primero kernel `qa_legal`, y ejecutar `node …/qa/lifecycle-postgres.mjs`. Nunca aplicar SQL a DEV/PROD. Las suites anteriores no se ejecutan. Si un caso nuevo falla, `CHEVENI_QA_FROM=N` permite continuar desde ese caso tras corregirlo; los logs deben conservar el resultado y SHA de cada tramo. No sumar dos veces un caso ni considerar aprobados los omitidos.

Beta V1 y recuperación integral: NO-GO. A1 permanece CONSUMED_NO_RETRY; no borrar claim, reintentar ni pedir otra autorización de captura. ASUS puede permanecer apagada.
