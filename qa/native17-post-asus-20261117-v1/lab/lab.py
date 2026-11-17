#!/usr/bin/env python3
"""Review-only local PG17 laboratory recipe. Default: pure dry-run, no effects.

No execute path is enabled by a flag, environment variable or supplied JSON.
Readonly --inspect-local is for a physically present operator on the ASUS.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import struct
import subprocess
import tarfile

EXECUTION_ENABLED = False
PREFIX = 'cheveni-native17-run-'
TARGET_VERSION = 170011
LIMITS = dict(memoryBytes=1073741824, swapBytes=0, cpuQuotaPercent=100,
              tasks=64, runtimeSeconds=120, dataBytes=536870912,
              tmpBytes=67108864, socketBytes=1048576,
              payloadBytes=1073741824, archiveMembers=40000, evidenceBytes=1048576)


def fail(reason):
    raise ValueError(reason)


def root_name(root, uid):
    p = Path(root)
    if not isinstance(uid, int) or isinstance(uid, bool) or uid < 1:
        fail('HOST_UID_MUST_BE_NONROOT')
    if not p.is_absolute() or p.parent != Path('/tmp') or not re.fullmatch(PREFIX + '[a-f0-9]{32}', p.name):
        fail('UNAPPROVED_ROOT')
    return p


def verify_root(root, uid):
    p = root_name(root, uid)
    if Path('/tmp').is_symlink():
        fail('TMP_SYMLINK')
    info = p.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != uid or stat.S_IMODE(info.st_mode) != 0o700:
        fail('ROOT_OWNER_MODE_OR_SYMLINK')
    return p


def archive_inventory(members, limit_bytes=None):
    """Validate the WHOLE untrusted export before extraction; no tar.extractall.

    Relative internal symlinks may exist but no member may traverse one.
    Absolute/escaping links, hardlinks, devices, sparse and duplicate entries
    fail closed. Rejection can include a legitimate image: never relax silently.
    """
    ceiling = LIMITS['payloadBytes'] if limit_bytes is None else limit_bytes
    entries, links, total = {}, set(), 0
    for m in members:
        if len(entries) >= LIMITS['archiveMembers']:
            fail('ARCHIVE_MEMBER_LIMIT')
        name = m.name.rstrip('/')
        parts = PurePosixPath(name).parts
        if not name or name.startswith('/') or '..' in parts or any(ord(c) < 32 for c in name):
            fail('ARCHIVE_PATH')
        name = str(PurePosixPath(name))
        if name in entries or not (m.isdir() or m.isreg() or m.issym()) or getattr(m, 'sparse', None):
            fail('ARCHIVE_TYPE_OR_DUPLICATE')
        if m.size < 0 or m.size > ceiling:
            fail('ARCHIVE_SIZE')
        total += m.size
        if total > ceiling:
            fail('ARCHIVE_TOTAL_SIZE')
        if m.issym():
            if not m.linkname or m.linkname.startswith('/'):
                fail('ARCHIVE_LINK')
            target = list(PurePosixPath(name).parent.parts)
            for part in PurePosixPath(m.linkname).parts:
                if part == '..':
                    if not target:
                        fail('ARCHIVE_LINK_ESCAPE')
                    target.pop()
                elif part != '.':
                    target.append(part)
            links.add(name)
        entries[name] = m
    for name in entries:
        parents = list(PurePosixPath(name).parents)[:-1]
        if any(str(parent) in links for parent in parents):
            fail('ARCHIVE_SYMLINK_PARENT')
    return dict(files=len(entries), expandedBytes=total, entries=entries)


def extract_reviewed_export(tar_path, destination, uid):
    """Only local file processing. Destination must be private, new and empty.
    No Docker, mount, namespace or PostgreSQL is invoked by this function.
    """
    dest = Path(destination)
    st = dest.lstat()
    if not stat.S_ISDIR(st.st_mode) or st.st_uid != uid or stat.S_IMODE(st.st_mode) != 0o700 or any(dest.iterdir()):
        fail('EXTRACTION_DESTINATION')
    # Reject symlinked ancestors too, not merely the destination's final inode.
    if any(p.is_symlink() for p in [dest, *dest.parents]):
        fail('EXTRACTION_SYMLINK_PARENT')
    archive_fd = os.open(tar_path, os.O_RDONLY | os.O_NOFOLLOW)
    before = os.fstat(archive_fd)
    if not stat.S_ISREG(before.st_mode) or before.st_uid != uid or stat.S_IMODE(before.st_mode) != 0o600 or before.st_nlink != 1 or before.st_size > LIMITS['payloadBytes'] + LIMITS['archiveMembers'] * 2048:
        os.close(archive_fd)
        fail('ARCHIVE_OWNER_MODE_OR_LINK')
    with os.fdopen(archive_fd, 'rb') as archive_stream, tarfile.open(fileobj=archive_stream, mode='r:') as archive:
        checked = archive_inventory(iter(archive))
        # Require an immutable private archive and trusted operator; no shared
        # writer may replace it between inventory/extraction. Files use O_EXCL.
        for name, item in checked['entries'].items():
            out = dest / name
            out.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            if item.isdir():
                out.mkdir(exist_ok=True, mode=0o700)
            elif item.isreg():
                flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW
                fd = os.open(out, flags, 0o700 if item.mode & 0o111 else 0o600)
                try:
                    remaining = item.size
                    with archive.extractfile(item) as source:
                        while remaining:
                            chunk = source.read(min(65536, remaining))
                            if not chunk:
                                fail('ARCHIVE_TRUNCATED')
                            view = memoryview(chunk)
                            while view:
                                written = os.write(fd, view)
                                if written < 1:
                                    fail('ARCHIVE_SHORT_WRITE')
                                view = view[written:]
                            remaining -= len(chunk)
                finally:
                    os.close(fd)
        # Create links last, after all regular files. No path may descend one.
        for name in checked['entries']:
            item = checked['entries'][name]
            if item.issym():
                os.symlink(item.linkname, dest / name)
        after = os.fstat(archive_stream.fileno())
        if (before.st_size, before.st_mtime_ns, before.st_ctime_ns) != (after.st_size, after.st_mtime_ns, after.st_ctime_ns):
            fail('ARCHIVE_CHANGED')
    return {k: checked[k] for k in ['files', 'expandedBytes']}


def seccomp_candidate(architecture):
    """x86_64-only BPF: architecture/x32 guard, ptrace EPERM, allow others.
    Limited laboratory policy, NOT a complete production syscall allowlist.
    This builds bytes; it does not install a kernel filter.
    """
    if architecture != 'amd64':
        fail('SECCOMP_ARCHITECTURE_UNREVIEWED')
    instructions = [(0x20, 0, 0, 4), (0x15, 1, 0, 0xC000003E),
                    (0x06, 0, 0, 0x80000000), (0x20, 0, 0, 0),
                    (0x45, 0, 1, 0x40000000), (0x06, 0, 0, 0x80000000),
                    (0x15, 0, 1, 101), (0x06, 0, 0, 0x00050001),
                    (0x06, 0, 0, 0x7FFF0000)]
    return b''.join(struct.pack('<HBBI', *i) for i in instructions)


def verify_effective_limits(values):
    def duration(value):
        m = re.fullmatch(r'(\d+)(us|ms|s|min)', str(value))
        if not m:
            fail('UNCONFIRMED_TIME_LIMIT')
        return int(m[1]) * {'us': 1, 'ms': 1000, 's': 1000000, 'min': 60000000}[m[2]]
    expected = dict(MemoryMax=LIMITS['memoryBytes'], MemorySwapMax=0, TasksMax=LIMITS['tasks'])
    for key, number in expected.items():
        if str(values.get(key)) != str(number):
            fail('EFFECTIVE_LIMIT_MISMATCH_' + key)
    if duration(values.get('CPUQuotaPerSecUSec')) != 1000000 or duration(values.get('RuntimeMaxUSec')) != 120000000:
        fail('EFFECTIVE_CPU_OR_RUNTIME_LIMIT')
    return True


def plan(config):
    uid, run_id = config.get('hostUid'), config.get('runId')
    bound = isinstance(uid, int) and uid > 0 and isinstance(run_id, str) and bool(re.fullmatch('[a-f0-9]{32}', run_id))
    root = root_name('/tmp/' + PREFIX + run_id, uid) if bound else Path('/tmp/' + PREFIX + '<NEW_RUN_ID>')
    image = config.get('imageId')
    image_bound = isinstance(image, str) and bool(re.fullmatch('sha256:[a-f0-9]{64}', image))
    arch = config.get('architecture')
    if image is not None and not image_bound:
        fail('IMAGE_ID_MUST_BE_CONTENT_ADDRESSED')
    if arch not in [None, 'amd64']:
        fail('ARCHITECTURE_UNREVIEWED')
    image = image if image_bound else '<PINNED_LOCAL_IMAGE_ID>'
    unit = 'cheveni-native17-' + (run_id if bound else '<NEW_RUN_ID>')
    container = unit + '-export'
    bwrap = ['bwrap', '--unshare-user', '--uid', '65534', '--gid', '65534',
             '--unshare-pid', '--unshare-net', '--unshare-ipc', '--unshare-uts',
             '--unshare-cgroup', '--die-with-parent', '--new-session', '--cap-drop', 'ALL',
             '--clearenv', '--setenv', 'PATH', '/usr/lib/postgresql/17/bin:/usr/bin:/bin',
             '--setenv', 'HOME', '/home/pgqa', '--setenv', 'USER', 'pgqa',
             '--setenv', 'PGHOST', '/socket', '--setenv', 'PGPORT', '6543',
             '--setenv', 'PGUSER', 'pgqa', '--setenv', 'PGDATABASE', 'postgres',
             '--ro-bind', str(root / 'payload'), '/', '--proc', '/proc', '--dev', '/dev',
             '--size', str(LIMITS['dataBytes']), '--tmpfs', '/data',
             '--size', str(LIMITS['tmpBytes']), '--tmpfs', '/tmp',
             '--size', str(LIMITS['socketBytes']), '--tmpfs', '/socket',
             '--tmpfs', '/run', '--tmpfs', '/sys', '--dir', '/home/pgqa',
             '--ro-bind', str(root / 'control/inside-smoke.sh'), '/runner/inside-smoke.sh',
             '--ro-bind', str(root / 'control/passwd'), '/etc/passwd',
             '--ro-bind', str(root / 'control/group'), '/etc/group',
             '--chdir', '/data', '--seccomp', '3', '--', '/bin/sh', '/runner/inside-smoke.sh']
    # Arbitrary FD 3 does NOT cross the systemd D-Bus service boundary. Open the
    # checked filter INSIDE the unit, then exec bwrap with an inherited FD 3.
    policy_hash = hashlib.sha256(seccomp_candidate('amd64')).hexdigest()
    unit_child = ['/usr/bin/python3', str(root / 'control/fd_entry.py'),
                  '--filter', str(root / 'control/ptrace.bpf'), '--sha256', policy_hash, '--'] + bwrap
    scope = ['systemd-run', '--user', '--wait', '--pipe', '--collect', '--unit=' + unit,
             '--property=MemoryMax=' + str(LIMITS['memoryBytes']), '--property=MemorySwapMax=0',
             '--property=CPUQuota=100%', '--property=TasksMax=64', '--property=RuntimeMaxSec=120',
             '--property=NoNewPrivileges=yes', '--property=KillMode=control-group',
             '--property=LimitCORE=0', '--'] + unit_child
    return dict(classification='REVIEW_ONLY_RECIPE', executionEnabled=False,
                bindingsComplete=bound and image_bound and arch == 'amd64', root=str(root), unit=unit,
                limits=LIMITS, hostStagingHardQuotaAccredited=False,
                durability='VOLATILE_TMPFS_SMOKE_ONLY_NOT_DURABLE_COMMIT',
                phases=[
                    dict(id='local-image-export', argv=['docker', 'create', '--pull=never', '--network=none', '--read-only', '--label', 'cheveni.qa.run=' + unit, '--name', container, image]),
                    dict(id='export-no-start', argv=['docker', 'export', container], stdout='private bounded archive; validate complete inventory before extraction'),
                    dict(id='remove-only-recorded-stopped-container', argv=['docker', 'rm', '--volumes', container], gate='verify exact container ID, label, image, state=created, no Windows mounts; never prune'),
                    dict(id='prepare-private-payload', operation='safe archive inventory/extraction; create all mountpoint directories BEFORE sealing readonly payload; hash binary/library/shell/policy; preserve no inherited env'),
                    dict(id='local-unit', argv=scope, passFd=3, gate='fd_entry opens O_NOFOLLOW and verifies bytes inside unit; not an assumed D-Bus FD transfer'),
                    dict(id='observe-before-release', argv=['systemctl', '--user', 'show', unit, '--property=MemoryMax,MemorySwapMax,CPUQuotaPerSecUSec,TasksMax,RuntimeMaxUSec,ActiveState,MainPID'], gate='compare effective numeric limits while helper awaits release; unknown/ignored property => abort'),
                    dict(id='release-after-observation', operation='write exact RELEASE_SMOKE newline to waiting stdin only after measured namespaces/mounts/caps/seccomp/limits match'),
                    dict(id='postflight', operation='prove unit absent/inactive with empty cgroup; no matching tracked processes/container/volume; compare files and evidence quota'),
                    dict(id='discard', operation='directed private-root discard only after exact manifest/UID/mode/no-symlink and postflight proof; unknown => retain')])


def recovery(state):
    """Decision only: no stop, delete, SQL or retry is executed here."""
    if state.get('commitOutcome') not in [None, 'NO_MUTATION_SMOKE']:
        return dict(result='UNKNOWN', redispatch=False, discard=False, next='independent authorized COMMIT/readback/journal reconciliation')
    clean = state.get('unitEmpty') is True and state.get('processesAbsent') is True and state.get('containerAbsent') is True and state.get('rootVerified') is True
    return dict(result='POSTFLIGHT_VERIFIED' if clean else 'UNKNOWN', redispatch=False, discard=clean,
                next='directed discard candidate' if clean else 'stop only exact recorded unit; recapture state; preserve evidence/root')


def inspect_local(run=subprocess.run):
    """Read-only operator preflight. Never called by default or by Work tests."""
    if os.getuid() == 0:
        fail('HOST_ROOT_FORBIDDEN')
    if any(os.environ.get(k) for k in ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']):
        fail('DOCKER_ENV_OVERRIDE_UNREVIEWED')
    def probe(argv):
        result = run(argv, text=True, capture_output=True, timeout=10, check=False)
        if result.returncode or len(result.stdout) > 65536:
            fail('READONLY_PREFLIGHT_UNCONFIRMED')
        return result.stdout.strip()
    context = probe(['docker', 'context', 'show'])
    endpoint = json.loads(probe(['docker', 'context', 'inspect', context, '--format', '{{json .Endpoints.docker.Host}}']))
    if not isinstance(endpoint, str) or not endpoint.startswith('unix:///') or '/mnt/' in endpoint:
        fail('DOCKER_ENDPOINT_NOT_APPROVED_LOCAL_UNIX')
    image = json.loads(probe(['docker', '--context', context, 'image', 'inspect', 'postgres:17.11']))
    if len(image) != 1 or image[0].get('Os') != 'linux' or image[0].get('Architecture') != 'amd64' or not re.fullmatch('sha256:[a-f0-9]{64}', image[0].get('Id', '')):
        fail('LOCAL_IMAGE_METADATA_UNCONFIRMED')
    return dict(classification='OWNER_LOCAL_READONLY_OBSERVATION_NOT_ACCREDITATION', uid=os.getuid(),
                dockerLocalUnix=True, imageId=image[0]['Id'], repoDigests=image[0].get('RepoDigests', []),
                architecture=image[0]['Architecture'], provenanceAccredited=False,
                bwrapVersion=probe(['bwrap', '--version']), systemdVersion=probe(['systemd-run', '--version']).splitlines()[0],
                nativeTestsAuthorized=False)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--dry-run', action='store_true')
    mode.add_argument('--inspect-local', action='store_true')
    mode.add_argument('--execute', action='store_true')
    parser.add_argument('--config', type=Path)
    args = parser.parse_args(argv)
    if args.execute:
        fail('EXECUTION_NOT_AUTHORIZED_REQUIRES_REVIEWED_MATERIALIZATION')
    if args.inspect_local:
        return inspect_local()
    config = json.loads(args.config.read_text()) if args.config else {}
    return plan(config)


if __name__ == '__main__':
    try:
        print(json.dumps(main(), indent=2))
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        print(json.dumps(dict(state='HELD', error=str(error), executionEnabled=False)))
        raise SystemExit(78)
