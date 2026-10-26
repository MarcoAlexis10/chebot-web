# Che Vení — integración web y preparación ASUS/WSL

26/10/2026. **Beta NO-GO.** Rama `qa/cheveni-release-20261025`.

## Continuidad exacta

Inicio verificado en GitHub: `ad27d89084a844c0e5257c12ae3bce56b9d604c0`. Commit funcional nuevo: `b7b90369ba54b59ca9642d06975f492efec4a38a`. El commit que contiene este informe agrega evidencia/continuidad; conservar cualquier sucesor QA.

Backend: adaptador local inicial `6dfaf2d86cc60988714d397e19a4a0287c948fa8`, limpieza de construcción parcial `e4522160c94fca1055c6f4203e96f30ef5c40a4e`, paquete y procedimiento `38df6cac7ee7b08e5f4128c2eda7e7d01f12dffd`.

## Corrección nueva comprobada

El generador real `manager-invite-v1.js` permitía utilizar desde una fila vieja el token de una sesión reemplazada. No comprobaba que el marcador guardado antes del POST se pudiera leer; tampoco invalidaba una respuesta tardía por pagehide o checkout. Un 4xx no clasificado podía retirar el marcador de conciliación y una expresión demasiado amplia aceptaba IDs mal formados.

Ahora el control captura token/generación/fila/estadía/checkout al renderizar y vuelve a comprobarlos al despachar y al recibir. Comprueba persistencia antes de enviar, trata el fallo de lectura de storage como bloqueo y conserva la intención ante respuestas tardías, ambigüedad o errores no revisados. Solo una denegación explícita anterior al despacho con combinación HTTP/código revisada permite un nuevo intento deliberado. Los UUID del recibo deben tener forma canónica.

Esto corrige código candidato QA detrás de bloqueos existentes; no se acredita explotación real ni se modificó el backend de envío. El marcador es local a la sesión de pestaña, no lock durable o entre dispositivos. La reserva SQL y los permisos vigentes al despacho siguen siendo requisitos operativos pendientes.

## Evidencia nueva

**Nueve casos nuevos únicos: antes 1 aprobado / 8 fallos; después 9/9 aprobados.** Solo VM con generador real y DOM/storage/tiempo/fetch ficticios; ningún correo/WhatsApp, Auth o servicio real.

Archivo: `qa/security/invite-session-asusprep-delta.test.cjs`. Comando: `node --test --test-timeout=3000 --test-reporter=tap qa/security/invite-session-asusprep-delta.test.cjs`.

Casos: persistencia silenciosamente perdida; token reemplazado; respuesta tardía tras pagehide; 4xx desconocido; checkout cruzado después de render; fallo de lectura de storage; fila reciclada; UUID mal formado; recibo válido en la misma sesión. Logs y conteos: [invite-session-results.json](evidence/invite-session-results.json), before/after TAP. Los reruns de desarrollo no suman casos.

No se repitieron las 33 de la sesión anterior ni otras suites históricas, nueve nativos o consulta Auth. Sin build general, navegador conectado o configuración de servicios.

## Integración y cierre

Se revisaron el mapa de rutas y los consumidores de sesión, propiedades, estadías, conocimiento, solicitudes, incidencias, invitación, alta/admin y reset. [Revisión fuente backend](https://github.com/MarcoAlexis10/chebot-backend/blob/38df6cac7ee7b08e5f4128c2eda7e7d01f12dffd/ops/release/asus-wsl-prep-20261026/evidence/integration-review.json). Revisión estática más pruebas focalizadas, no recorrido desplegado completo. La interfaz de lectura no acredita alta/configuración operativa de propiedad.

[Cinco blobs publicados](evidence/source-publication.json) coinciden con sus bytes locales; [controles sin cambios](evidence/unchanged-controls.json) y [SHA256SUMS](SHA256SUMS). Los archivos fuente conservan despliegue Git deshabilitado y gate legal cerrado. Actions sigue con último run 40148316684 completado, sin dispatch nuevo.

Borradores jurídicos y decisiones D01/D02-A se conservaron; se actualizan únicamente las referencias operativas existentes en backend para evitar duplicación.

## Paquete y próxima acción del propietario

[Paquete QA e índice](https://github.com/MarcoAlexis10/chebot-backend/blob/38df6cac7ee7b08e5f4128c2eda7e7d01f12dffd/ops/release/asus-wsl-prep-20261026/PACKAGE.json). **Preparado, no probado en ASUS.** Los siete casos nativos permanecen sin ejecutar y requieren autorización posterior propia, separada de la acreditación de aislamiento.

Primera acción esta noche, cuando esté disponible: descargar solamente el ZIP QA desde el informe/índice backend. Después se indicará una sola acción por vez: extracción y, tras revisión, el launcher de metadatos. No hay intervención requerida ahora.

[Cola priorizada y bloqueos](https://github.com/MarcoAlexis10/chebot-backend/blob/38df6cac7ee7b08e5f4128c2eda7e7d01f12dffd/ops/release/no-asus-20261026/MATRIZ-LANZAMIENTO.md) y [procedimiento único del primer manager](https://github.com/MarcoAlexis10/chebot-backend/blob/38df6cac7ee7b08e5f4128c2eda7e7d01f12dffd/ops/release/no-asus-20261026/PRIMER-MANAGER-Y-ACCIONES-NOCHE.md). Mantener NO-GO por nativo 17.11, Auth/registro independiente, autorización transaccional, A2 integral, canales reales autorizados y cierre legal/operativo. Sin alta, despliegue, servicios, mensajes o gastos.
