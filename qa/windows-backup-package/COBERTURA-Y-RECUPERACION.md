# Che Veni A1: respaldo portable, alcance y limites

Este paquete prepara un respaldo futuro. No contiene datos ni accesos de DEV. No ejecutamos el respaldo real ni aprobamos recuperacion integral. El primer arranque solo diagnostica Windows y Docker; las opciones posteriores son explicitas.

## Requisitos y secuencia futura

Windows x64 privado; PowerShell 5.1; Docker Desktop con motor Linux local, virtualizacion/WSL2 y espacio suficiente. Docker Desktop es gratuito para uso personal y empresas que cumplan su licencia; verificar si el equipo es corporativo. No se instala Docker, activa WSL ni modifica el sistema automaticamente. Node 24.21.0 y Supabase CLI 2.121.0 se descargan desde sus distribuidores oficiales con SHA256 fijados; PostgreSQL 17.11 usa imagen oficial fijada por digest. Los modulos JavaScript necesarios ya estan incluidos. Internet es necesario para herramientas e imagenes.

1. Extraer el ZIP completo en una carpeta privada; doble clic en `00-INICIAR.cmd`. El diagnostico no consulta DEV ni pide secretos. `LEEME-PRIMERO.txt` explica el menu.
2. Si faltan requisitos, instalar/activar Docker Linux segun sus instrucciones oficiales. Reinicio/administracion de Windows pueden requerir intervencion humana. No hay promesa de respaldo con un solo clic.
3. Opcion 2 ensaya SOLO datos ficticios y destruye sus recursos locales. No usar datos reales en CI.
4. Antes de la opcion 3, el propietario debe preparar privadamente certificado CA, accesos existentes, registro independiente actual de revocaciones y configuracion externa. Completar las plantillas: sus valores bloqueados no son una aprobacion. Establecer una ventana coherente de solo lectura mediante procedimientos autorizados fuera de este paquete. Nunca falsear recibos.
5. Opcion 3 requiere escribir `RESPALDAR DEV`. Solo lee el proyecto DEV exacto; no crea/migra/modifica datos, roles o credenciales. Cualquier cierre de escritores o cambio remoto exige autorizacion aparte. Direct host o Session pooler 5432, TLS verify-full y CA explicita; no transaction pooler ni TLS inseguro.
6. Separar respaldo `.cva`, clave CIFRADA `.cclave` (preferiblemente USB) y frase de 20+ caracteres custodiada fuera del equipo. El ZIP nunca contiene estos archivos. No ponerlos en Git, carpetas compartidas ni sincronizacion automatica. Conservar al menos dos copias privadas verificadas de cada archivo cifrado, en ubicaciones independientes; no almacenar la frase junto a ellas. Perder la frase o la clave cifrada hace irrecuperable el respaldo.
7. Opcion 4 abre la clave y verifica GCM, formato, todos los componentes y sus SHA256 sin exportar texto plano. Probar tambien desde la copia separada antes de considerar el respaldo util.
8. Opcion 5 solo permite un destino Docker aleatorio descartable propio, red interna, puertos 127.0.0.1, verificacion de propiedad y limpieza. Requiere registro independiente ACTUAL identico: cambios posteriores bloquean restauracion; reconciliar/reaplicar las revocaciones exige revision humana aparte, nunca retroceder al registro viejo. No hay opcion de restaurar en DEV/PROD.

## Que se incluye y que se puede recuperar

| Componente | Captura futura | Restauracion y limites |
|---|---|---|
| PostgreSQL | `pg_dump` custom completo directo, mas archivo de esquemas de aplicacion, datos administrados y catalogo. Una snapshot MVCC exportada compartida. | Ensayo nuevo comprueba tabla, identidad, FK, RLS, propietario, funcion y ACL; NO replica fisica del servicio ni prueba de todos los objetos reales. Dependencias externas, otras bases, foreign tables y large objects bloquean; no se omiten silenciosamente. |
| Roles | Atributos, membresias/grantors y `pg_dumpall --roles-only --no-role-passwords`. | Solo crea roles adicionales NOLOGIN sin privilegios administrativos en laboratorio. LOGIN, passwords/hashes y roles administrados requieren reconstruccion/reconciliacion privada. Nunca reejecutar roles-ddl a ciegas. |
| Auth | Datos explicitos de TODO `auth`, DDL de referencia y dump completo. Incluye datos sensibles y hashes SOLO dentro del respaldo cifrado futuro. | Ensayo nuevo crea usuario local mediante Auth y recupera sus filas/FK. No prueba inicio de sesion real de DEV ni continuidad de sesiones/JWT. JWT signing keys/legacy JWT secret, proveedores OAuth, SMTP, URL/redirects, plantillas, MFA/SAML/passkeys y sus claves externas requieren inventario, custodia y ensayo propio. Tras incidente, reautenticar y reconciliar revocaciones. |
| Vault | `vault.secrets`, dump completo y root_key existente por GET administrativo Supabase experimental. | Ensayo recupera filas cifradas usando la raiz local original y comprueba descifrado. Raiz ausente/inaccesible bloquea; dump sin raiz no permite prometer descifrado. Otros usos pgsodium, versiones y claves externas requieren prueba especifica. No se cambia la raiz administrada de DEV. |
| Storage | Datos de esquema y catalogo mas buckets y bytes originales por API, paginacion y SHA256 por objeto. | Los bytes NO estan en pg_dump. Ensayo anterior aprobado probo objetos locales; la nueva exportacion prueba paginacion con fixtures. Restaurador nuevo bloquea TODO bucket no vacio hasta reconciliar IDs, propietarios, metadatos, RLS, versiones y objetos via servicio local. No afirma recuperacion integral de Storage real. Buckets especiales/S3 versionado, objetos >128 MiB acumulados, mas de 10000 objetos y archivos grandes requieren exportador streaming privado adicional. |
| DDL administrado | DDL Auth/Storage y dump completo preservan referencia de triggers/policies/customizaciones. | Comparacion estricta con destino; si difiere, se detiene. No elimina customizaciones ni reejecuta DDL administrado como superusuario. Default ACL y extensiones requieren revision independiente; los defaults omitidos del replay no se declaran restaurados. |
| Configuracion externa | JSON privado revisado se incorpora cifrado. La plantilla publica solo enumera referencias pendientes. | No exporta automaticamente secretos de hosting, Edge Functions, proveedores, DNS, webhooks, cron, cuotas ni infraestructura administrada. Codigo versionado no equivale a secretos/configuracion recuperables. No se restaura ningun proveedor durante el ensayo. |
| Registro independiente | Copia cifrada y referencia de cierre. | No sustituye el registro actual; comparacion de hash bloquea revocaciones posteriores. |

El dump completo es archivo de preservacion, no un comando de restauracion ciego. `supabase db dump` excluye esquemas administrados por defecto; este paquete invoca `pg_dump` directamente y toma copias explicitas. Un error de permisos, incompatibilidad o limite aborta; no se declara un respaldo completo por tener un archivo parcial.

## Coherencia entre base, objetos y proveedores

MVCC no congela Storage, escritores externos ni roles. Los recibos W01-W10 deben identificar, con evidencia privada, cierre coordinado de: W01 web, W02 backend, W03 tareas/cron/colas, W04 Auth/sesiones, W05 Storage/subidas, W06 webhooks/proveedores, W07 operadores/SQL, W08 Edge Functions, W09 migraciones/roles/DDL y W10 revocaciones/configuracion externa. Este paquete NO efectua esos cierres. El control de roles vuelve a leer en una transaccion nueva; los recibos y revision independiente siguen siendo necesarios. No producir constancias ficticias para desbloquear el capturador.

## Cifrado y manejo de secretos

CVA2 usa AES-256-GCM, nonce aleatorio de 96 bits y contexto autenticado. Los 13 componentes tienen longitud y SHA256 autenticados dentro del archivo. Clave aleatoria de 256 bits; CVK2 protege esa clave con scrypt N=131072,r=8,p=1, sal aleatoria de 128 bits y AES-GCM. La frase NO se guarda. La clave clara solo cruza una tuberia privada entre procesos locales, no argumentos, registros ni archivos. Los accesos se piden ocultos; no los pegar en comandos, chats o tickets. El certificado CA publico es el unico temporal de conexion. El motor recibe password mediante entorno por nombre, nunca argumentos con valor.

Durante respaldo/restauracion hay datos claros en RAM y dentro de contenedores locales descartables. No es una sala criptografica: administrador del equipo, malware, crash dumps, hibernacion, swap o Docker host pueden acceder. Usar equipo privado actualizado y cifrado de disco; no transcripcion de PowerShell, grabadores ni agentes remotos. Borrar un contenedor no garantiza borrado fisico seguro de disco; destruir equipo/volumen cifrado o aplicar procedimiento local segun sensibilidad. No ejecutar datos reales en runners compartidos ni GitHub Actions; el programa bloquea captura real en CI.

Limites conservadores de memoria: hasta 128 MiB por componente/Storage y 400 MiB acumulados antes de envolver; archivo validado hasta 512 MiB. Si DEV excede, NO-GO hasta adaptar streaming cifrado y probarlo. Archivos creados con nombres nuevos y sin sobrescribir; paquete fuente separado de la custodia. MANIFEST detecta corrupcion, no reemplaza autenticidad del canal; verificar el SHA256 del ZIP informado en la entrega.

## A2 y A3

A2 conserva la preparacion previa: inventario, orden de instalacion y rollback. Esta entrega no instala cambios en DEV, no reabre pruebas aprobadas y no habilita promocion. A3 conserva preparacion SMTP; exportar privadamente parametros/proveedor/secretos con sus recibos, verificar dominio y ensayar solo con sumidero local. No enviamos correos ni cambiamos SMTP. Recuperar la base no habilita automaticamente A2/A3.

## GO / NO-GO

GO para distribuir y ensayar este paquete con datos ficticios, sujeto a la evidencia incluida. NO-GO para declarar recuperable integralmente el DEV actual: aun no se ha capturado su respaldo ni probado su restauracion, Storage/roles/configuracion administrada y externa requieren reconciliacion real. La alternativa mas economica es captura manual privada cifrada + copias separadas + restauracion descartable del respaldo real antes de autorizar cambios. El plan Free no impide esa captura logica, pero no aporta por si mismo un respaldo integral.

Bloqueos reales que requieren al propietario (lista unica):
1. Equipo privado con Docker Linux disponible, o entorno remoto privado cuya gratuidad/ausencia de cobro haya verificado en su cuenta.
2. Accesos existentes y CA, raiz Vault legible, inventario/secretos externos bajo custodia, registro actual independiente, ventana coherente W01-W10 y ubicaciones separadas de respaldo/clave/frase.
3. Ejecutar captura y ensayo PRIVADOS reales; resolver con evidencia cualquier incompatibilidad administrada, roles, Storage, limite o proveedor detectado. Sin ese ensayo A1 sigue abierto; no pagar un plan vuelve automatica la recuperacion de los componentes externos.

Fuentes oficiales consultadas 2026-10-19:
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/reference/cli/supabase-db-dump
- https://supabase.com/docs/reference/api/v1-get-pgsodium-config
- https://docs.docker.com/desktop/setup/install/windows-install/
- https://docs.docker.com/subscription/desktop-license/
