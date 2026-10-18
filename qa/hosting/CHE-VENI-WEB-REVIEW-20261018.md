# Che Vení — panel candidato de revisión, 18 de octubre de 2026

Continúa el candidato anterior. Rama `qa/cheveni-web-local-review-20261018`, código validado `54b1c78c5c74362c04f6f2b5646e8a46b1d32579`. Mantiene los controles de incertidumbre de invitaciones y solicitudes, el bloqueo de doble clic y la persistencia por ID opaco al recargar.

`866ef2f` corrige un desbordamiento móvil de 9 px: conserva el wrapping de los enlaces de navegación. `54b1c78` aplica la misma protección a incidencias y propuestas de aprendizaje: una respuesta perdida, un recibo incompleto, un recurso incorrecto, un refresco fallido o una aceptación incierta de WhatsApp requieren revisión. Las denegaciones conocidas sin escritura conservan un reintento seguro. No se guardan instrucciones ni datos del huésped en las marcas de revisión.

Validación: **55 pruebas aprobadas, cero fallidas**, incluidas diez regresiones nuevas del script generado de incidencias; build completo aprobado con configuración pública ficticia.

**Ocho comprobaciones adicionales en Chrome real**, [run 39139610353](https://github.com/MarcoAlexis10/chebot-backend/actions/runs/39139610353), backend `c0d62f7`: login con Supabase Auth real local, carga de todas las listas autorizadas, ancho 360/390/1280 sin desbordamiento, respuesta perdida después de confirmar solicitudes e incidencias en SQL, doble clic, recarga, logout y acceso revocado. El mismo run aprueba diez pruebas de Supabase y 17 recorridos de aplicación.

El backend conserva una captura reproducible de nueve assets generados desde este commit, con hashes de fuentes y salida. Los hosts técnicos se interceptan y solo se conecta al stack descartable en localhost. No se accede a previews existentes ni a bases compartidas. WhatsApp está simulado; no se envían emails ni mensajes reales. La apertura de recuperación se prueba en UI; su redirect y entrega de correo reales requieren el entorno autorizado.

Los despliegues de Git permanecen deshabilitados. No cambia endpoints, credenciales, políticas, manifiestos legales ni producción. La publicación legal sigue cerrada. Falta una instalación coordinada y autorizada para verificar DNS/TLS, CORS y redirects reales. Operación con personas reales: **NO-GO** hasta las aprobaciones de datos y del verificador independiente, la política de retención/eliminación y la validación del entorno.
