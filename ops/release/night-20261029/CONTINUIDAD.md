# Continuidad del panel — cierre nocturno solicitado para 29/10/2026

Ejecución efectuada el 28/10/2026 (America/Buenos_Aires); no se infiere una noche transcurrida por el nombre pedido. Beta NO-GO. Código funcional en d5c50b5159a618838f5373156b81d9d8599b4fe0.

Se corrigieron cuatro generadores: un HTTP 403 de la generación/sesión actual oculta y limpia todo el panel privado como el 401; una respuesta de la generación anterior no cierra una sesión nueva. No se altera el contrato de mutaciones, sus marcadores de UNKNOWN ni se elimina el cierre de privacidad.

Siete casos nuevos: cinco fallaban antes, siete aprobaron después. Dieciséis regresiones justificadas de 401, generación y almacenamiento aprobaron al completar el DOM ficticio; una prueba de regresión fallaba también en la fuente base por falta de replaceChildren/style/append. Sus expectativas se conservaron. Todos los intentos y fallos están en evidence, no eliminarlos ni confundirlos con GoTrue real.

La generación offline ejecutó 11 generadores, compiló los scripts e hizo cleanup propio, sin ejecutar el navegador, conectar servicios, aceptar personas ni publicar Vercel. Rebranding Che Vení conservado. Configuración de destino sigue en DEV y holds cerrados: no dirigir automáticamente a QA ni liberar admisión.

Pendientes: Auth real con identidades ficticias por canal seguro; revocación de JWT ya emitido; permisos transaccionales/recorrido conectado; reset/enlaces/sesiones anteriores con proveedor bajo alcance sin mensajes; correo y WhatsApp requieren autorización acotada de envío posterior, hoy prohibida. No repetir suites aprobadas por continuidad.
