# Che Vení — panel candidato de revisión, 18 de octubre de 2026

Continúa el candidato anterior. Rama `qa/cheveni-web-local-review-20261018`, código validado `02fe3721338bb92ef5739de0a8146a9c63178f29`. Mantiene los controles de incertidumbre de invitaciones y solicitudes, el bloqueo de doble clic y la persistencia por ID opaco al recargar.

`866ef2f` corrige un desbordamiento móvil de 9 px: conserva el wrapping de los enlaces de navegación. `54b1c78` aplica la misma protección a incidencias y propuestas de aprendizaje: una respuesta perdida, un recibo incompleto, un recurso incorrecto, un refresco fallido o una aceptación incierta de WhatsApp requieren revisión. Las denegaciones conocidas sin escritura conservan un reintento seguro. No se guardan instrucciones ni datos del huésped en las marcas de revisión.

Validación: **55 pruebas aprobadas, cero fallidas**, incluidas diez regresiones nuevas del script generado de incidencias; build completo aprobado con configuración pública ficticia.

**Once comprobaciones en Chrome real**, [run 39165135964](https://github.com/MarcoAlexis10/chebot-backend/actions/runs/39165135964), backend `2cf191e`: login con Auth real local, todas las listas, 360/390/1280 px sin desbordamiento, respuestas perdidas después de COMMIT en solicitudes e incidencias, doble clic, recarga, logout y revocación. Incluye recuperación completa de contraseña con enlaces emitidos/verificados por Auth local sin SMTP: token inválido rechazado, fragmento eliminado de la URL, un nuevo enlace en la misma pestaña, ambos botones de contraseña, confirmación desigual sin escritura, actualización única, rechazo de la contraseña anterior y login con la nueva.

`02fe372` corrige una navegación real de Chrome: al abrir un nuevo enlace sobre una pestaña de recuperación existente, solo cambiaba el fragmento y el script conservaba el estado anterior. Ahora recarga y valida de nuevo el bearer, sin guardarlo ni enviarlo al backend de Che Vení. El test fallaba antes de esa corrección y pasó con el panel generado corregido.

El backend captura diez assets del commit fijado, incluido `reset-password/index.html`, con hashes de fuentes y salida. Las solicitudes se interceptan antes de DNS y solo van a localhost; no se accede a previews ni bases compartidas. WhatsApp está simulado; no se envían emails ni mensajes reales. La emisión y consumo de recuperación están probados contra Auth real descartable; faltan entrega de correo y redirects del entorno autorizado.

Los despliegues de Git permanecen deshabilitados. No cambia endpoints, credenciales, políticas, manifiestos legales ni producción. La publicación legal sigue cerrada. Falta una instalación coordinada y autorizada para verificar DNS/TLS, CORS y redirects reales. Operación con personas reales: **NO-GO** hasta las aprobaciones de datos y del verificador independiente, la política de retención/eliminación y la validación del entorno.
