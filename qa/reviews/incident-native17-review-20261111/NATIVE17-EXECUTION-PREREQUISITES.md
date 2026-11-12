# Native17 — prerrequisitos de una ejecución futura, NO AUTORIZADA

Este documento no concede permiso de ejecutar SQL, iniciar procesos PostgreSQL, crear un laboratorio, usar servicios o gastar dinero. El lote actual sólo genera fuentes retenidas. Los archivos DO NOT APPLY abortan antes del DDL y terminan en ROLLBACK. No son un instalador: no corresponde quitar el aborto o sustituir un gate por true para obtener un PASS.

## 1. Entorno requerido

PostgreSQL **17.11 exacto** (`server_version_num=170011`, procedencia y hash del binario acreditados); clúster nuevo, vacío y descartable, sin datos o credenciales reales. Conservar configuración/versión de extensiones y rowtypes exactas del plan Native17 fijado en ce5c747c. No confundir un valor configurado en un fixture con la versión observada. PGlite, un parser SQL o un PostgreSQL distinto no acreditan este ensayo.

Se necesita un host identificado por el propietario, con aislamiento acreditado y sin conexión a DEV/producción/Supabase remoto. **No se identificó ni acreditó ese host en este lote.** ASUS está excluida. Tampoco se autoriza crear infraestructura externa o ejecutar Actions/CI4/Native34.

Auth del laboratorio será únicamente la forma sintética auth.users/auth.sessions ya revisada, con identidades ficticias y claves operativas ausentes. Su prueba nativa SQL no equivale a GoTrue, firma JWT, refresh o revocación administrada reales. Esa validación de proveedor continuará separada y bloqueada.

## 2. Aislamiento que debe observarse antes de initdb o SQL

- UID no privilegiado, namespace de usuario/procesos/red y filesystem descartable acreditados; sin mounts de repositorios operativos, home personal, Docker socket, credenciales, secretos, agentes SSH o directorios remotos.
- Namespace de red distinto del host, sin rutas/interfaces externas ni DNS/provider alcanzables; prueba negativa de egress desde **el mismo contenedor de procesos** que usarán postgres y clientes. Si se necesita TCP, sólo loopback dentro de ese namespace y puerto privado; sin publicación al host. No se presupone que AF_UNIX o el IPC de PostgreSQL funcionen aquí. No se prueba de nuevo Chromium ni se desactivan sus restricciones.
- Seccomp/NoNewPrivs/capacidades y límites reales de memoria/CPU/PIDs/tiempo/disco, directorio temporal propio y proceso de descarte. Si el host no permite esas garantías, no iniciar el motor. No obtener root ni desactivar protecciones para completar el ensayo.
- Entorno vacío, sin URLs o contraseñas heredadas; SQL/clientes sin posibilidad de usar otro PGHOST/PGSERVICE/proveedor. Fijar cwd, binarios y paths exactos. TLS/IPC y autenticación local deben ser del laboratorio; nunca reutilizar credenciales reales.

Los namespaces acreditados para Node en este lote **no prueban** aislamiento de mounts/procesos/recursos apto para PostgreSQL. Son evidencia insuficiente para admitir el motor.

## 3. Artefactos que requieren aprobación por hash

1. Fuentes Native17 originales y su manifiesto/source-lock en ce5c747c, incluida la fundación, rowtypes, Auth sintético, runtime, políticas y fences. El cierre parcial no acredita una instalación conjunta. No ejecutar de nuevo sus suites históricas por rutina.
2. Paquete nuevo completo: roles, base de incidencias anterior sellada, contador y hooks, admisión, entries ligados al proveedor, ACL/RLS, EXPECTED-CATALOG, HOOK-MATRIX y captura metadata-only. Los hashes exactos quedan en PACKAGE-MANIFEST/FILE-HASHES del cierre contenedor.
3. Una **materialización de laboratorio nueva, revisada por separado**, con inputs/transformaciones/hashes precisos y sólo fixtures ficticios. Debe conservar guards comerciales, legales, prelegales y de privacidad. Los puertos de floor, proveedor, original y scope hoy cerrados no se vuelven permisivos por una autorización genérica. Definir expresamente qué adaptador sintético se usa para cada ensayo y qué garantía real no demuestra.
4. Bootstrap de contador desde evidencia original confiable y floor independiente; sin default 1, reseed de versiones o floor tomado del backup. La política de custodia/retención debe aprobar incluso IDs/metadatos vinculables. No hay permiso para almacenar resúmenes, nombres, teléfonos, frames o hashes personales.

Actualmente faltan la materialización aprobable del host y los productores protegidos. Por eso no existe un SHA de instalador operativo autorizado. Aprobar sólo este documento o el SQL abortado no permite ejecutar pruebas positivas del writer.

## 4. Roles y operaciones mínimas

Tres LOGIN separados: scope, writer de incidencias y readback; owners Scope/Writer/Reader/Data/Revision NOLOGIN. Nombres/atributos exactos en EXPECTED-CATALOG. Sin SUPERUSER/BYPASSRLS/INHERIT/CREATEROLE/CREATEDB/REPLICATION, membresías o SET hacia owners. Cero DML/CREATE directo para los logins. El operador efímero de montaje del clúster es exclusivamente del laboratorio y no es un principal de backend.

Operaciones propuestas: current_resolution; admit/claim; change_state_bound (17 argumentos); read_effect_bound (10); loader/revocador de fixtures estrictamente acotado al laboratorio y capturado como participante del fence. Helpers sólo para owners necesarios; grants por columnas, no SELECT/UPDATE/INSERT generales. El reader no puede alcanzar writer, revision_step, helpers mutadores o grants indirectos. Verificar ACL **efectiva**, incluyendo PUBLIC, defaults, herencias y contexto real SECURITY INVOKER/DEFINER.

El contador se incrementa con cambios de autoridad/relaciones, no con la actualización normal de status del incidente. Las tres tablas de bookkeeping reciben fence pero no incrementan la misma revisión que valida el writer. La lectura exige el cut exacto confirmado por fuente independiente; un commit de revocación puede dejar admisión retenida mientras falta la observación del witness.

## 5. Ensayos nativos focalizados propuestos

| ID | Ensayo futuro | Resultado requerido |
|---|---|---|
| N01 | Captura previa, identidad del host/base/canales y catálogo completo | Coincidencia de binario, roles, owners, columnas/ACL/RLS, cuerpos y hooks; ninguna entrada/permiso inesperado |
| N02 | Clock sin bootstrap, floor ausente/NULL/vencido o de otro dataset/epoch | HELD; cero efectos; ninguna revisión inventada |
| N03 | Cambio de rol/permisos/Auth o relación antes de que el writer gane el fence | Avance de revisión real; writer bloqueado al reobservar; orden de locks capturado |
| N04 | Writer obtiene fence y confirma antes del revocador | Historia conservada, revocación posterior efectiva; sesión revocada sin lectura privada |
| N05 | Status-only frente a cambio de account/property/stay, más INSERT/DELETE/TRUNCATE | Hook correcto; no auto-invalidación por bookkeeping/status; revisión avanza en cambios protegidos |
| N06 | Dos clientes/procesos independientes admiten la misma intención | Una reserva efectiva; KNOWN con historia original; una escritura como máximo; constraints/locks observados |
| N07 | Misma intención con otros argumentos o scope original contradictorio | CONFLICT sólo con original válido y argumentos distintos; scope/recibo incierto permanece UNKNOWN |
| N08 | ACK de admisión/claim/write perdido y crash del cliente | UNKNOWN, sin reenvío; readback independiente del efecto original después del COMMIT observado |
| N09 | Reinicio del proceso y estado restaurado/ledger incompleto | Sin original/cut/claim confiables: cuarentena; no NEW por ausencia local ni snapshot del cliente |
| N10 | Refresh/cambio de sesión/expiración durante waits | Binding del proveedor incompatible rechazado; no declarar firma JWT/GoTrue real con datos sintéticos |
| N11 | Reader y scope intentan write/DML/SET/otro entry; permisos transitivos | Rechazo efectivo con cada credencial; cero capacidad de mutar desde readback |
| N12 | Revocador bypass, trigger deshabilitado/cambiado, ownership/ACL/RLS inesperados | Denegación antes del efecto; catálogo posterior conserva evidencia del fallo |

N03/N04/N06 requieren sesiones realmente distintas y barreras instrumentadas, no sleeps como prueba de intercalación ni PIDs configurados. No repetir los 22+2 anteriores o los históricos 7/9/15/31/66/etc. salvo que un cambio materializado afecte el contrato específico. Estos N01–N12 **no fueron ejecutados** aquí.

## 6. Prohibiciones que siguen vigentes

Nada en DEV, producción, main, DNS, Supabase remoto, Vercel, ASUS, Actions/cron/CI4/Native34; sin nuevas compras o servicios. Sin datos/identidades/credenciales reales, comunicaciones, invitaciones, altas, cobros, firmas, claves privadas, permisos operativos o levantamiento de guards. No restore A1 ni A2 real. No usar registros del backup para rebajar pisos vigentes. No publicar helpers privados como API ni habilitar el endpoint de incidencias.

## 7. Evidencia que demostraría éxito, con alcance limitado

Logs crudos de cada proceso/cliente y su comando/hash, captura de aislamiento previa, manifest y versión observada; identidad real de las conexiones y estados de transacción; catálogo antes/después con ACL efectivas y cuerpos/rowtypes/hooks exactos; schedule de locks y barreras; constraints y filas sintéticas mínimas; correlación original→intent→attempt→providerRef→dispatch→efecto→COMMIT→readback, incluyendo fallos y UNKNOWN.

COMMIT debe observarse fuera del ACK de la conexión fallida. El source privado/journal/witness y sus floors deben corresponder a la historia actual, no a dos callbacks al mismo estado restaurado. La captura pg_depend se combina con fuentes y análisis transitivo: sola no prueba referencias tardías de PL/pgSQL, operadores, casts o políticas. Truncamiento, dependencias desconocidas o evidencia contradictoria conservan NO-GO.

Un PASS nativo con Auth/original/floor sintéticos acreditará únicamente propiedades SQL ensayadas. No acreditará Auth administrado, firma JWT, custodia real, independencia operacional, A2 integral, navegador o lanzamiento. El candidato comercial continúa NO-GO hasta esas evidencias y autorización expresa.

## 8. Descarte completo

Antes de iniciar, fijar un ID de laboratorio y rutas/PIDs/namespaces exclusivos creados para él. Después: cerrar clientes y admisión, detener sólo el proceso postgres identificado, comprobar fin de todos sus hijos/listeners, destruir el namespace/volumen temporal y credenciales efímeras, eliminar exclusivamente las rutas creadas para ese ID. No usar globs, procesos por nombre o limpieza sobre otros clústeres. Verificar ausencia de procesos, sockets, puertos, mounts y archivos del laboratorio; conservar sólo logs/metadatos sintéticos minimizados con hashes. Si no puede acreditarse el descarte, el ensayo no se admite.

## 9. Gastos

**Cero gastos nuevos es una condición, todavía no acreditada para un host concreto.** Puede ser viable sólo si un entorno ya disponible incluye binarios 17.11 y aislamiento/recursos suficientes sin provisionar o comprar nada. No se contrataron recursos, descargaron imágenes o revisaron cuentas de facturación. Si no existe ese entorno gratuito aprobado, el ensayo queda bloqueado; no se convierte la autorización en permiso para gastar o usar servicios remotos.

## 10. Autorización adicional que falta

El propietario tendría que identificar y aprobar: host gratuito descartable y evidencia de aislamiento; versión/binario; SHA de la materialización SQL/fixtures y su loader; roles/credenciales ficticias; IDs N01–N12 concretos, procesos/límites/ventana; captura de catálogo; tratamiento de metadatos; procedimiento de descarte. Debe mantener las prohibiciones anteriores y reconocer las limitaciones de Auth sintético y custodias no acreditadas.

No se pide esa autorización mediante este archivo ni se presume otorgada. No hay ejecución programada, recordatorio, workflow o job preparado para iniciarse automáticamente. **Native17 NOT_AUTHORIZED / NOT_STARTED. Beta V1 NO-GO.**
