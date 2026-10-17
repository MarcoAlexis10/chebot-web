# Che Vení — revisión del panel, 17 de octubre de 2026

Base: `MarcoAlexis10/chebot-web`, `qa284-che-veni-brand-copy-preview`, commit `4d84891666d670e12f355116bb01e3abfa73be79`. Candidato aislado para revisión; no se actualizan referencias ni se publica.

`manager-invite-v1.js` bloquea el reenvío ante pérdida de respuesta, recibo incompleto, error ambiguo o reconciliación pendiente. Conserva el bloqueo por ID opaco de estadía en sessionStorage al recargar. Distingue envío registrado de entrega y evita el doble clic.

`manager-request-actions-v1.js` bloquea aprobar y rechazar ante un resultado desconocido, una petición ya procesada o un fallo de refresco después de confirmar la mutación. Conserva la marca por ID opaco de solicitud al recargar; solo permite reintentar denegaciones conocidas sin escritura. Los errores de autorización se muestran en español comprensible.

`manager-auth-v1.js` presenta “Estadía registrada” en lugar de una etiqueta interna de DEV. No se alteran assets, directorio, credenciales o endpoints.

Validación: build completo con configuración pública ficticia aprobado; **45 pruebas aprobadas, 0 fallidas**. Las 11 nuevas ejecutan los scripts generados reales del panel con DOM mínimo e incluyen timeout, recarga, recibos ambiguos, aceptación sin entrega, doble clic, decisión desconocida y refresco fallido. No equivalen a una sesión de navegador ni a Auth real.

En las rutas revisadas no se encontró un formulario que escriba estadías o teléfonos directamente en las tablas. El panel utiliza las APIs del backend. Su endpoint existente todavía corresponde al preview de concierge-v3-design; desplegar estos objetos de código sin coordinar el backend no valida el flujo conjunto.

La publicación legal permanece cerrada; no se fabrica un manifiesto de aprobación. No se incorporan personas ni se envían mensajes reales. Se requiere revisión del candidato de backend, pruebas nativas concurrentes, aprobación legal y autorización específica de DEV/preview antes de una instalación coordinada. Producción y onboarding real permanecen **NO-GO**.
