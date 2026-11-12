# ASUS: preflight manual de sólo lectura, pendiente para esta noche

**NOT_RUN / HOST_NOT_AVAILABLE / Native17 NO-GO.** Preparado el 12/11/2026, hora de Buenos Aires. No se ejecutó en Work ni en otra máquina. La disponibilidad física de ASUS esta noche no acredita un laboratorio ni autoriza PostgreSQL. N01–N12 permanecen NOT_AUTHORIZED/NOT_RUN.

Antecedentes aportados: Windows 11, WSL2, Ubuntu 26.04.1, Docker Desktop 4.96.0/Engine 29.9.1; seccomp/cgroups observados históricamente y userns/rootless sin acreditar. No son mediciones actuales. Archivos ZIP/.cmd previamente bloqueados permanecen sin ejecutar.

## Cómo usarlo

Ejecutar **un solo comando**, revisar su resultado y su condición antes de pasar al siguiente. No pegar todo el documento. PowerShell normal, sin admin, scripts, cambios de ExecutionPolicy, UAC o protecciones. Ante error, permiso denegado, contexto desconocido o resultado inesperado: detener sólo esa rama y conservar NO-GO. No aplicar reparaciones automáticas.

No abrir Docker Desktop o una distribución Stopped para completar esta fase. Los bloques Linux sólo corresponden a una terminal Ubuntu ya abierta y Running en la ASUS. No se usa Work como sustituto. No env ni historial completo, .env, Docker config/TLS, claves, directorios personales o credenciales. Compartir sólo los campos filtrados, ocultando cualquier nombre personal inesperado; no subir capturas crudas a GitHub.

El catálogo JSON vinculado contiene los mismos comandos y gates, sin runner. Se comprobó su contenido estáticamente; **ninguno de los comandos siguientes fue ejecutado aquí**.

### W01 — PowerShell normal

Condición: ASUS física, sesión local sin elevar permisos.

```powershell
Get-CimInstance -ClassName Win32_OperatingSystem | Select-Object Version,BuildNumber,FreePhysicalMemory,TotalVisibleMemorySize
```

Revisar: Version/build y memoria; no nombre de equipo, serie o usuario.

### W02 — PowerShell normal

Condición: W01 revisado.

```powershell
Get-MpComputerStatus | Select-Object AMServiceEnabled,AntivirusEnabled,RealTimeProtectionEnabled,IsTamperProtected
```

Revisar: Estado de protección. Si hay error o protección desactivada, detener; no modificar ni escalar.

### W03 — PowerShell normal

Condición: W02 revisado.

```powershell
wsl --version
```

Revisar: Versión instalada de WSL/kernel; no instalar ni actualizar.

### W04 — PowerShell normal

Condición: W03 revisado.

```powershell
wsl --status
```

Revisar: Configuración actual; no modificar versiones predeterminadas.

### W05 — PowerShell normal

Condición: W04 revisado.

```powershell
wsl --list --verbose
```

Revisar: Distribuciones y Running/Stopped/WSL2. Ocultar nombres personales antes de compartir; no iniciar distribuciones Stopped.

### W06 — PowerShell normal

Condición: W05 revisado.

```powershell
Get-CimInstance -ClassName Win32_ComputerSystem | Select-Object TotalPhysicalMemory,NumberOfLogicalProcessors,HypervisorPresent
```

Revisar: Capacidad del equipo, no límites acreditados del laboratorio.

### W07 — PowerShell normal

Condición: W06 revisado.

```powershell
Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID,Size,FreeSpace
```

Revisar: Espacio disponible local; sin etiquetas, paths de usuario o inventario de archivos.

### D01 — PowerShell normal

Condición: W07 revisado.

```powershell
[pscustomobject]@{DockerHostSet=[bool]$env:DOCKER_HOST;DockerContextSet=[bool]$env:DOCKER_CONTEXT;DockerTLSVerifySet=[bool]$env:DOCKER_TLS_VERIFY;DockerCertPathSet=[bool]$env:DOCKER_CERT_PATH}
```

Revisar: Sólo flags, nunca valores. Si cualquiera es True detener Docker: no borrar/cambiar variables ni consultar un daemon desconocido.

### D02 — PowerShell normal

Condición: D01: todos False.

```powershell
docker --version
```

Revisar: Cliente instalado; no consulta daemon ni descarga.

### D03 — PowerShell normal

Condición: D02 revisado.

```powershell
Get-Process -Name 'Docker Desktop','com.docker.backend' -ErrorAction SilentlyContinue | Select-Object ProcessName
```

Revisar: Sólo procesos locales de Desktop ya activos. Si no está ejecutándose, detener esta rama; no iniciarlo.

### D04 — PowerShell normal

Condición: D03: Desktop ya ejecutándose.

```powershell
docker context show
```

Revisar: Lectura local del contexto. Este procedimiento sólo continúa si es desktop-linux; cualquier otro nombre requiere revisar antes de consultar daemon.

### D05 — PowerShell normal

Condición: D04: exactamente desktop-linux.

```powershell
docker context inspect desktop-linux --format '{{.Endpoints.docker.Host}}'
```

Revisar: Continuar sólo si endpoint local npipe:////./pipe/dockerDesktopLinuxEngine. TCP/SSH/otro endpoint: detener sin consultar servidor. No inspeccionar TLSMaterial o config.json.

### D06 — PowerShell normal

Condición: D01 sin overrides, D03 activo, D05 endpoint local exacto, resultados revisados.

```powershell
docker --context desktop-linux info --format 'Server={{.ServerVersion}};OS={{.OSType}};Platform={{.OperatingSystem}};CPUs={{.NCPU}};MemoryBytes={{.MemTotal}};Cgroup={{.CgroupVersion}};Driver={{.CgroupDriver}};Security={{json .SecurityOptions}}'
```

Revisar: Debe identificar Linux/Docker Desktop. Seccomp/cgroup no equivalen a rootless o userns real; ausencia de remapeo/rootless conserva NO-GO. No imprimir info completa/proxies/rutas.

### D07 — PowerShell normal

Condición: D06 Linux/Docker Desktop local confirmado; sólo inventario de ese tag.

```powershell
docker --context desktop-linux image ls postgres:17.11 --digests --no-trunc --format '{{.Repository}}:{{.Tag}} {{.Digest}} {{.ID}}'
```

Revisar: Metadata de caché, sin pull/run. Sin filas: binario no disponible. Tag/ID/digest no acreditan por sí solos un servidor PostgreSQL 17.11 ejecutado.

### L01 — Terminal Ubuntu ya abierta

Condición: W05 muestra esa Ubuntu Running y hay terminal ya abierta; si no, detener rama Linux.

```bash
cat /etc/os-release
```

Revisar: Distribución observada; no iniciar WSL ni servicios para completar diagnóstico.

### L02 — Terminal Ubuntu ya abierta

Condición: L01 revisado.

```bash
uname -r
```

Revisar: Kernel instalado, no prueba de namespaces del futuro worker.

### L03 — Terminal Ubuntu ya abierta

Condición: L02 revisado.

```bash
id -u
```

Revisar: UID efectivo del shell. UID distinto de cero por sí solo no demuestra remapeo/container rootless.

### L04 — Terminal Ubuntu ya abierta

Condición: L03 revisado.

```bash
cat /proc/self/uid_map
```

Revisar: Mapping del shell observado, no el del futuro proceso PostgreSQL.

### L05 — Terminal Ubuntu ya abierta

Condición: L04 revisado.

```bash
readlink /proc/self/ns/user /proc/self/ns/pid /proc/self/ns/net /proc/self/ns/mnt
```

Revisar: IDs en orden user/pid/net/mnt. Sin proceso aislado de comparación no hay acreditación.

### L06 — Terminal Ubuntu ya abierta

Condición: L05 revisado.

```bash
awk '/^NoNewPrivs:|^Seccomp:|^CapEff:/{print}' /proc/self/status
```

Revisar: Flags del shell únicamente. No relajar seccomp, capacidades o NoNewPrivs.

### L07 — Terminal Ubuntu ya abierta

Condición: L06 revisado.

```bash
findmnt -T /tmp -n -o FSTYPE,OPTIONS
```

Revisar: Filesystem que alberga /tmp; no demuestra montaje privado del futuro laboratorio.

### L08 — Terminal Ubuntu ya abierta

Condición: L07 revisado.

```bash
findmnt -n -o TARGET,FSTYPE,OPTIONS /mnt/c
```

Revisar: Acceso a disco Windows: si es visible, el shell no es un filesystem aislado. No listar archivos, tocar montajes o modificar configuración.

### L09 — Terminal Ubuntu ya abierta

Condición: L08 revisado.

```bash
free -b
```

Revisar: Memoria actual de WSL, no límites de un cgroup de laboratorio.

### L10 — Terminal Ubuntu ya abierta

Condición: L09 revisado.

```bash
cat /sys/fs/cgroup/cgroup.controllers
```

Revisar: Controladores disponibles. Ausencia/permiso denegado: evidencia faltante; no cambiar cgroups.

### L11 — Terminal Ubuntu ya abierta

Condición: L10 revisado.

```bash
df -B1 /tmp
```

Revisar: Espacio del filesystem temporal, no cuota ni capacidad reservada.

## Criterios objetivos: diagnóstico no es habilitación

| Garantía requerida | Evidencia futura necesaria | NO-GO si falta |
|---|---|---|
| Host e identidad | ASUS física observada, distribución/daemon local exactos, sin overrides remotos | Reporte de otro runtime, contexto TCP/SSH, identidad dudosa |
| Usuario | Worker sin root real, mapping UID/GID observado y aislamiento de usuario; daemon/permisos sin vía a root/host | Sólo UID de Ubuntu o flags seccomp/cgroups; Docker socket/host accesible al worker |
| Procesos | Namespace PID propio, ausencia de visibilidad/control de procesos del host | Sólo VM WSL o shell con namespace desconocido |
| Red | Futuro worker sin salida externa, interfaces/rutas y bloqueo verificable; sin puertos publicados o acceso a servicios reales | Modo por defecto de Docker/WSL, conectividad no acotada o no observada |
| Filesystem | Mount privado limitado al laboratorio, sin discos Windows, home, Docker socket, credenciales o bind mounts amplios | /mnt/c u otros paths del host alcanzables desde el worker |
| Recursos | Límites efectivos CPU/memoria/PIDs/tiempo/disco por ID de laboratorio, con margen del host | Sólo capacidad total o cgroups sin límites observados |
| Descarte | ID/paths/volúmenes/procesos exclusivos; plan revisado para verificar ausencia final sin tocar otros recursos | Requiere prune global, borrar WSL, limpiar por nombres/globs o afectar datos existentes |
| PostgreSQL | Binario 17.11 exacto por procedencia/digest/arquitectura y versión observada en futuro ensayo autorizado | Sólo tag postgres:17.11, otro minor o binario ausente |
| Costo | Todo recurso/procedencia/licencia/espacio ya disponible y sin cargos nuevos, confirmado | Requiere comprar Business/ECI, VM/hosting o descargar/provisionar sin permiso |
| Autorización | Alcance concreto de pruebas, artefactos SHA, roles ficticios, límites/ventana/descarte aprobados | GO genérico o asumir que este preflight autoriza N01–N12 |

El diagnóstico actual sólo puede producir `METADATA_REVIEW_PENDING` o `NO-GO`; no acredita los namespaces de un proceso que todavía no existe. Ver un marcador rootless/ECI tampoco basta: se requieren observaciones del worker, montajes, red, permisos y descarte. No se compra ni habilita ECI o cambia backend. La documentación Docker distingue rootless de userns-remap; su configuración no queda autorizada aquí.

Referencia de recursos heredada: propuesta de laboratorio 2 vCPU/4 GiB/8 GiB de disco/8 conexiones/60 minutos, no recursos reservados, configuración probada o permiso de consumo. Hay que observar margen y límites reales antes de autorizar. No se cambian aquí WSL, Docker, cgroups o límites del host.

## PostgreSQL y siguiente autorización concreta

No ejecutar postgres/psql/initdb/pg_ctl, contenedores, probes con unshare, SQL, restores o descargas para verificar una versión. D07 sólo comprueba si hay metadata de una imagen local; una etiqueta puede ser incorrecta. Faltan procedencia/hash/arquitectura del binario, aislamiento completo y SHA de materialización ejecutable revisada: los SQL anteriores siguen abortados DO NOT APPLY.

Si el diagnóstico identifica una vía viable gratuita, preparar una solicitud específica con: host ASUS/distribución/daemon observados; método de aislamiento y permisos exactos; artefactos/binarios y SHAs; necesidad de cualquier descarga o creación de entorno; roles/datos ficticios; Nxx concretos; límites/ventana; catálogo/evidencia; descarte sólo del laboratorio. Primero se autoriza concretamente lo que falte para acreditar el laboratorio, y después los ensayos nativos que correspondan. No quitar abortos SQL ni reinterpretar esta preparación como permiso de instalación.

Auth sintético no prueba Auth administrado; PostgreSQL solo no acredita A2, Vault/Storage/claves, custodia de journal/witness, legal/D02-A o Beta comercial. Si ASUS no puede aislarse sin cambios fuera de autorización, mantener NO-GO y no bajar protecciones para lograr un resultado.

## Referencias oficiales consultadas (lectura web, no prueba del equipo)

- [WSL: comandos de consulta](https://learn.microsoft.com/en-us/windows/wsl/basic-commands)
- [PowerShell Get-CimInstance local](https://learn.microsoft.com/en-us/powershell/module/cimcmdlets/get-ciminstance)
- [Get-MpComputerStatus](https://learn.microsoft.com/en-us/powershell/module/defender/get-mpcomputerstatus)
- [Docker context show](https://docs.docker.com/reference/cli/docker/context/show/) y [inspect](https://docs.docker.com/reference/cli/docker/context/inspect/)
- [Docker info](https://docs.docker.com/reference/cli/docker/system/info/) y [image ls](https://docs.docker.com/reference/cli/docker/image/ls/)
- [Rootless](https://docs.docker.com/engine/security/rootless/), [userns-remap](https://docs.docker.com/engine/security/userns-remap/) y [limitaciones ECI/WSL](https://docs.docker.com/desktop/enterprise/hardened-desktop/enhanced-container-isolation/limitations/)
