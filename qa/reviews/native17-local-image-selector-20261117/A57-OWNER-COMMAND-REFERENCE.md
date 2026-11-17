# A57 — referencia de comando suministrado en la conversación

**Clasificación:** TEXTO_DEL_COMANDO_ENTREGADO_POR_EL_ASISTENTE, NO EJECUTADO POR WORK.

Este bloque reproduce el comando A57 ofrecido al propietario en la conversación de Che Vení. Las capturas posteriores del propietario muestran una ejecución exitosa, pero esta referencia NO es una exportación byte a byte del historial de su shell ni una verificación independiente por Work. No ejecutar como automatismo.

## Comando de referencia A57 (histórico)

```bash
systemd-run --user --scope --collect --expand-environment=no \
  -p MemoryMax=1G -p TasksMax=32 -p CPUQuota=100% \
  /usr/bin/python3 - "$lab" <<'PY'
import ctypes as c
import os, pathlib, stat, subprocess, sys

lab = pathlib.Path(sys.argv[1])
usr = lab / "debian-rootfs/usr"
identity = lab / "identity"

if not (
    str(lab).startswith("/tmp/cheveni-native17-")
    and lab.is_dir()
    and not lab.is_symlink()
    and lab.stat().st_uid == os.getuid()
    and stat.S_IMODE(lab.stat().st_mode) == 0o700
    and usr.is_dir() and not usr.is_symlink()
    and identity.is_dir() and not identity.is_symlink()
):
    raise RuntimeError("LABORATORIO_NO_VALIDO")

cg = open("/proc/self/cgroup").read().split("::", 1)[1].strip()
base = "/sys/fs/cgroup" + cg

for name, expected in (
    ("memory.max", "1073741824"),
    ("pids.max", "32"),
    ("cpu.max", "100000 100000"),
):
    actual = open(base + "/" + name).read().strip()
    print(name + ":", actual, flush=True)
    if actual != expected:
        raise RuntimeError("LIMITE_NO_APLICADO")

s = c.CDLL("libseccomp.so.2")
s.seccomp_init.argtypes = [c.c_uint32]
s.seccomp_init.restype = c.c_void_p
s.seccomp_syscall_resolve_name.argtypes = [c.c_char_p]
s.seccomp_syscall_resolve_name.restype = c.c_int
s.seccomp_rule_add.argtypes = [
    c.c_void_p, c.c_uint32, c.c_int, c.c_uint
]
s.seccomp_rule_add.restype = c.c_int
s.seccomp_export_bpf.argtypes = [c.c_void_p, c.c_int]
s.seccomp_export_bpf.restype = c.c_int
s.seccomp_release.argtypes = [c.c_void_p]

ctx = s.seccomp_init(0x7fff0000)
if not ctx:
    raise RuntimeError("SECCOMP_NO_DISPONIBLE")

fd = None
try:
    nr = s.seccomp_syscall_resolve_name(b"ptrace")
    if nr < 0 or s.seccomp_rule_add(ctx, 0x00050001, nr, 0):
        raise RuntimeError("REGLA_SECCOMP_FALLIDA")

    fd = os.memfd_create("cheveni-a57")
    if s.seccomp_export_bpf(ctx, fd):
        raise RuntimeError("FILTRO_BPF_FALLIDO")
    os.lseek(fd, 0, os.SEEK_SET)

    script = r'''
set -eu

pg=/usr/lib/postgresql/17/bin
for bin in postgres initdb pg_ctl psql; do
    test -x "$pg/$bin" || {
        echo "BINARIO_FALTANTE: $bin"
        exit 3
    }
done

test ! -e /mnt/c
mkdir -m 700 /scratch/pgdata

"$pg/initdb" -D /scratch/pgdata \
    --username=pgqa \
    --encoding=UTF8 \
    --locale=C \
    --auth-local=peer \
    --auth-host=reject \
    --no-sync \
    --no-instructions >/scratch/initdb.log

cleanup() {
    "$pg/pg_ctl" -D /scratch/pgdata \
        -m immediate -w -t 10 stop \
        >/dev/null 2>&1 || true
}
trap cleanup EXIT

if ! "$pg/pg_ctl" -D /scratch/pgdata \
    -l /scratch/postgres.log \
    -w -t 20 \
    -o "-c listen_addresses= -c unix_socket_directories=/scratch -c unix_socket_permissions=0700 -c port=55432 -c max_connections=8 -c shared_buffers=16MB -c dynamic_shared_memory_type=mmap -c fsync=off" \
    start; then
    echo ARRANQUE_FALLIDO
    sed -n '1,20p' /scratch/postgres.log
    exit 4
fi

out=$("$pg/psql" -X -w \
    -h /scratch -p 55432 \
    -U pgqa -d postgres -Atqc \
    "select current_setting('server_version_num'), current_setting('listen_addresses'), current_user")

printf 'RESPUESTA_LOCAL=%s\n' "$out"

test "$out" = '170011||pgqa' || {
    echo VALIDACION_FALLIDA
    exit 5
}

"$pg/pg_ctl" -D /scratch/pgdata \
    -m fast -w -t 20 stop

echo SERVIDOR_FICTICIO_DETENIDO
'''

    cmd = [
        "bwrap",
        "--unshare-user", "--unshare-pid",
        "--unshare-net", "--unshare-ipc", "--unshare-uts",
        "--die-with-parent", "--new-session",
        "--clearenv", "--setenv", "PATH", "/usr/bin",
        "--setenv", "LANG", "C",
        "--ro-bind", str(usr), "/usr",
        "--symlink", "usr/bin", "/bin",
        "--symlink", "usr/lib", "/lib",
        "--symlink", "usr/lib64", "/lib64",
        "--dir", "/etc",
        "--ro-bind", str(identity), "/etc",
        "--proc", "/proc", "--dev", "/dev",
        "--size", "67108864", "--tmpfs", "/tmp",
        "--size", "536870912", "--perms", "0700",
        "--tmpfs", "/scratch",
        "--chdir", "/scratch",
        "--seccomp", str(fd),
        "/usr/bin/sh", "-c", script
    ]

    result = subprocess.run(cmd, pass_fds=(fd,))
    print("RESULTADO_A57:", result.returncode)
    sys.exit(result.returncode)
finally:
    s.seccomp_release(ctx)
    if fd is not None:
        os.close(fd)
PY
```

## Salida observada en capturas del propietario

```text
memory.max: 1073741824
pids.max: 32
cpu.max: 100000 100000
waiting for server to start.... done
server started
RESPUESTA_LOCAL=170011||pgqa
waiting for server to shut down.... done
server stopped
SERVIDOR_FICTICIO_DETENIDO
RESULTADO_A57: 0
```

El propietario también reportó A58 sin procesos/unidad de systemd y A59 sin contenedores QA; la extracción Debian local ocupaba aproximadamente 466 MB. No se comprobó durabilidad de COMMIT ni procedencia independiente. Todas estas son observaciones reportadas por capturas, no ejecuciones de Work.

## Diferencias que NO deben borrarse al revisar la receta nueva

| Aspecto | A57 histórico | Receta QA posterior de Work |
|---|---|---|
| Identidad | UID 1000; identidad ficticia `pgqa` | propuesta UID 65534, pendiente de acreditar mapeos |
| Sistema de archivos | `/usr` Debian local en solo lectura; `identity` en `/etc` | payload raíz separado con montaje y directorios propuestos |
| Almacenamiento | tmpfs `/scratch` 512 MiB y `/tmp` 64 MiB | tmpfs `/data`, `/tmp`, `/socket`, `/run`, `/sys` |
| Socket / puerto | `/scratch` / `55432` | `/socket` / `6543` |
| Durabilidad | `initdb --no-sync` y `fsync=off` | propone `fsync/synchronous_commit/full_page_writes=on`, pero aún tmpfs |
| Seccomp | libseccomp exportado a memfd y transmitido por `pass_fds` de subprocess al bwrap | BPF candidato + FD abierto dentro de systemd, sin ejecución |
| Unidades | `systemd-run --user --scope --collect` | unidad de servicio propuesta pendiente de observación |
| Evidencia | initdb+start+SQL SELECT+stop, A57=0, capturas | plan/dry run y tests offline, sin PostgreSQL ejecutado por Work |

Las dos recetas NO son equivalentes ni se deben interpretar como sustitutas observadas. No retirar guards de `inside-smoke.sh` o `lab.py`; cualquier prueba sobre la ASUS requiere una revisión y autorización exactas. Beta V1 permanece NO-GO.