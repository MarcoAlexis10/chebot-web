# Alcance provisional y evidencias

Este paquete no tiene una ruta habilitada para conexiones remotas. El modulo
future-dev-plan.mjs valida solamente la forma de un futuro origen DEV, puerto
5432 y TLS verify-full. La CA y la conexion reales siguen pendientes; ningun
booleano, argumento o variable habilita captura real en esta version.

El sobre conserva source=FICTIONAL_QA_ONLY, writersClosed=false e
integralRecoveryVerified=false. Vault root, roles globales, Storage bytes,
revocaciones y configuracion externa no se capturan. Una instantanea DB no
congela secuencias o servicios externos ni revierte mensajes enviados.

Origen aprobado: backend 4c3992318e6f92bb4b01e906a4592c575c4d0ec4;
laboratorio PostgreSQL 17.11, 16/16, workflow 39614197274. No se vuelve a ejecutar.
La especificacion de esta entrega parte de backend
7e033009a8a442a08fe12e6cb07a22f26a2d6a2d. Las pruebas focalizadas de este paquete
y su resultado se registran en el informe QA separado, con hashes de fuentes.

El laboratorio nuevo verifica transporte/archivos de este paquete con tablas
ficticias. No instala GoTrue/Vault/S3 ni prueba recuperar un Supabase real.
La apertura autenticada de archives se limita a 64 MiB de plaintext en memoria;
pg_dump falla al exceder ese limite y siempre debe terminar con exit 0.
El transporte nuevo impone 35 segundos totales, statement_timeout de 30 segundos
y espera maxima de bloqueo DDL de 2 segundos; no reintenta la captura.
No repetir ni ampliar la captura para saltar un limite.

En Windows se comprueban ACL NTFS reales: propietario actual y unicamente acceso
para ese usuario, SYSTEM y Administradores; mode 0600 no se usa como sustituto.
No protege frente a administradores del sistema ni al equipo comprometido.
Los directorios privados nuevos llevan un marcador de pertenencia. La limpieza
rechaza marcadores copiados, enlaces o archivos inesperados en un pendiente.
Una caida abrupta puede dejar staging cifrado; no lo considera una copia completa.
La eliminacion de fixtures no promete borrado fisico seguro del disco.

Las carpetas data/keys del ensayo estan separadas dentro de un directorio temporal
privado. Todos los datos y frases del ensayo son ficticios y se retiran al acabar.
Las operaciones de verificacion/restauracion no borran los archivos seleccionados.
La publicacion usa creacion exclusiva y enlaces en el mismo volumen; el soporte
entre volumenes distintos no esta validado y fallara cerrado.

Un runner Windows estandar permite probar PowerShell 5.1, CMD, Node firmado,
NTFS y contratos npipe; eso NO demuestra Docker Desktop Linux real en la ASUS.
Esa comprobacion queda para un diagnostico local y un ensayo SOLO ficticio si
fuera necesario. No usar CI ni este paquete para datos reales.

Herramientas aceptadas: Node 24.19.0 segun la especificacion y 24.21.0, usado por
el paquete previo aprobado. No se cambian versiones del equipo automaticamente.
Sin descarga de herramientas, adaptadores reales o autorizacion operativa.

Referencias: PostgreSQL 17 pg_dump/pg_restore; Microsoft Get-AuthenticodeSignature
y DirectorySecurity; Docker CLI contexts/npipe. Informe QA y fuente se conservan
en ramas aisladas; main, chebot-production y el ZIP integral quedan intactos.
