# Recuperación y siguiente acción concreta

Leer CLOSURE, OWNER-DECISION, NATIVE17-READINESS, SQL-REVIEW, TEST-EVIDENCE, PACKAGE-MANIFEST y FILE-HASHES. El HEAD final es el commit contenedor del cierre; comparar con GitHub antes de escribir. Backend 9beb837a621f9a8f06601043afa64b3bba317cb5 y Native17 ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a se conservaron sólo lectura. Conciliar avances, nunca reset/force/merge.

El paquete de entrada del 11/11 en web 4d4467042560a56ac7af0633e7c93064d2fad2b0 permanece intacto. Su sucesor es qa/native17-readiness-20261112-v1. El generador verifica 20 inputs y deriva los siete SQL, sin motor. Las correcciones no deben aplicarse a los archivos anteriores ni al producto. CBF1 sigue create_stay-only; no se agrega un protocolo o firma nueva.

Pruebas a conservar: cinco casos nuevos (cuatro estáticos y uno de await con dobles), cinco FAIL de esos mismos casos contra fuentes anteriores, y una regresión previa de ABI directamente afectada PASS contra el sucesor. No sumar ejecuciones como casos distintos. No repetir la suite previa de 17, los 22+2 o 31/66/14/18/17 históricos sin cambio directo. Los chequeos de generación/hashes/calls/plan son estáticos adicionales, no pruebas nativas.

**Siguiente acción desbloqueante:** identificar un host preexistente gratuito autorizado que cumpla H0 y obtener las fuentes protegidas/custodia/revocadores que faltan en D1–D8. No crear un host, reparar aislamiento, descargar/iniciar PostgreSQL o contactar servicios para llenar ese vacío. El resultado actual es HOST_NOT_AVAILABLE dentro del alcance inspeccionado, no un inventario de todas las máquinas del propietario.

Antes de siquiera pedir autorización para ejecutar: preparar una materialización nueva por hash, con loader/fixtures/roles/entries y barreras explícitas. Los siete SQL aquí son DO NOT APPLY, no un instalador al que se quitan líneas. Source RLS/floor/proveedor/original permanecen false/cero filas/raise. Las nuevas policies son restrictivas; una baseline permisiva aplicable debe revisarse, nunca reemplazarse por true. Los entries legacy quedan denegatorios.

Cerrar el orden real de revocadores: tomar fence transaccional **antes de emitir DML/DDL/TRUNCATE**, no deducirlo de BEFORE STATEMENT. Revisar GoTrue y journal fuera de PostgreSQL como participantes externos, sin pretender atomicidad por dos consultas. El catálogo debe detectar changes/bypass y las pruebas alcanzar el control específico; no aceptar un guard genérico como PASS de N02–N12.

Cuando exista ese paquete y host acreditables, una autorización posterior deberá fijar ID/versión/binarios/hashes/roles/credenciales ficticias/casos concretos/límites/ventana/metadatos/descarte y cero gasto. Ninguna autorización genérica actual cubre eso. No hay native runner, workflow, timer o job de este lote que lo ejecute. No pedir un GO comercial para suplirlo.

Puede continuar offline la revisión de fuentes del attestor/custodia/adaptador JSON SQL↔JS (sin relabel de KNOWN), fronteras de journal existentes, privacidad original/D02-A e interfaces A2. Sin originales confiables no reconstruir desde digest/snapshot del cliente; tras reinicio/ACK perdido conservar UNKNOWN y nunca reenviar mutación. La proyección providerRef nueva no prueba efecto ni COMMIT por sí sola.

A2 sigue integral (PostgreSQL, GoTrue, Vault, Storage, claves/configuración, journal/witness y floors posteriores al backup), restauraciones hipotéticas en cuarentena. No ejecutar restore ni bajar floors. Chromium AF_UNIX/EPERM y sus cuatro tests esperan otro laboratorio, sin nuevas combinaciones o flags. Auth sintético no prueba JWT/refresh/GoTrue administrados.

Publicación sólo en rama web qa/cheveni-integral-held-20261111, revisar triggers/HEAD/blob, expected_sha y [skip ci]. Sin ramas backend, Actions/cron/CI4/Native34 o servicios. Activación/reversión siguen descriptivas: mantener admisión cerrada; ante incertidumbre conservar historia/UNKNOWN y conciliar. Volver a un commit/backup no revierte efectos o revocaciones.

Beta V1 NO-GO: CABA, un manager fundador, una propiedad, 30 días gratis, sin cobro automático; Free en otras ciudades. No fijar fecha, enviar invitación o habilitar una operación.
