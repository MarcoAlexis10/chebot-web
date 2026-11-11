#!/usr/bin/env python3
"""Bounded local Chromium diagnosis; no downloads, security bypass or egress.

Compare root/current-user mappings in fresh user+network namespaces. The
browser probe uses the existing direct binary with its sandbox ENABLED.
No --no-sandbox, --single-process, LD_PRELOAD or policy changes are allowed.
"""
import errno
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
BROWSER = '/usr/lib/chromium/chromium'


def inside(mapping):
    parent = os.environ.pop('CHEVENI_PARENT_NETNS')
    current = os.readlink('/proc/self/ns/net')
    routes = Path('/proc/net/route').read_text()
    ipv6 = Path('/proc/net/ipv6_route').read_text()
    assert parent != current, 'NAMESPACE_NOT_CHANGED'
    assert not any(line.strip() for line in routes.splitlines()[1:]), 'EXTERNAL_IPV4_ROUTE'
    assert all(line.split()[-1] == 'lo' for line in ipv6.splitlines() if line.strip()), 'EXTERNAL_IPV6_INTERFACE'
    with socket.socket() as sock:
        sock.settimeout(0.5)
        try:
            sock.connect(('1.1.1.1', 443))
        except OSError as error:
            assert error.errno == errno.ENETUNREACH, 'NETWORK_ISOLATION_NOT_PROVEN'
        else:
            raise RuntimeError('EXTERNAL_NETWORK_REACHABLE')
    result = {'mapping': mapping, 'uid': os.getuid(), 'parentNetns': parent,
              'childNetns': current, 'externalConnectErrno': errno.ENETUNREACH,
              'ipv4Routes': routes, 'ipv6Routes': ipv6, 'socketResults': {},
              'controls': {}, 'browserAssertionsExecuted': False}
    for line in Path('/proc/self/status').read_text().splitlines():
        name, _, value = line.partition(':')
        if name in ('Seccomp', 'Seccomp_filters', 'NoNewPrivs', 'CapEff'):
            result['controls'][name] = value.strip()
    for family in (socket.AF_UNIX, socket.AF_INET, socket.AF_NETLINK):
        for kind in (socket.SOCK_STREAM, socket.SOCK_DGRAM):
            label = f'{family.name}:{kind.name}'
            try:
                with socket.socket(family, kind):
                    result['socketResults'][label] = {'created': True}
            except OSError as error:
                result['socketResults'][label] = {'created': False, 'errno': error.errno}
    for kind in (socket.SOCK_STREAM, socket.SOCK_DGRAM):
        left, right = socket.socketpair(socket.AF_UNIX, kind)
        left.close()
        right.close()
        result['socketResults']['socketpair:' + kind.name] = {'created': True}
    # Fresh profile and direct packaged executable remove stale-profile and
    # distro-launcher variables. No sandbox or web-security bypass is used.
    with tempfile.TemporaryDirectory(prefix='cheveni-browser-probe-') as profile:
        command = [BROWSER, '--headless', '--dump-dom', '--no-first-run',
                   '--no-proxy-server', '--disable-background-networking',
                   '--user-data-dir=' + profile, 'about:blank']
        result['browserCommandWithoutProfilePath'] = [x for x in command if not x.startswith('--user-data-dir=')]
        try:
            run = subprocess.run(command, capture_output=True, text=True, timeout=12)
            result['browser'] = {'exitCode': run.returncode, 'stdout': run.stdout[:4000],
                                 'stderr': run.stderr[:10000], 'timedOut': False}
        except subprocess.TimeoutExpired as error:
            result['browser'] = {'exitCode': None, 'timedOut': True,
                                 'stdout': str(error.stdout or '')[:4000],
                                 'stderr': str(error.stderr or '')[:10000]}
    print(json.dumps(result))


def main():
    if len(sys.argv) == 3 and sys.argv[1] == '--inside':
        inside(sys.argv[2])
        return
    results = []
    for mapping, flag in [('root', '--map-root-user'), ('current', '--map-current-user')]:
        env = {'PATH': os.environ.get('PATH', '/usr/bin:/bin'), 'HOME': '/tmp',
               'TZ': 'UTC', 'LANG': 'C.UTF-8',
               'CHEVENI_PARENT_NETNS': os.readlink('/proc/self/ns/net')}
        run = subprocess.run(['unshare', '--user', flag, '--net', sys.executable,
                              str(Path(__file__).resolve()), '--inside', mapping],
                             env=env, capture_output=True, text=True, timeout=25)
        if run.returncode != 0:
            results.append({'mapping': mapping, 'diagnosticExit': run.returncode,
                            'error': run.stderr, 'browserAssertionsExecuted': False})
        else:
            results.append(json.loads(run.stdout))
    output = {'scope': 'diagnostic only, NOT browser application tests',
              'networkPolicyChanged': False, 'sandboxDisabled': False,
              'binarySha256': hashlib.sha256(Path(BROWSER).read_bytes()).hexdigest(),
              'headlessShellInstalled': bool(shutil.which('chromium-headless-shell') or shutil.which('chrome-headless-shell')),
              'attempts': results}
    (HERE / 'CHROMIUM-DIAGNOSTIC.json').write_text(json.dumps(output, indent=2) + '\n')
    print(json.dumps(output, indent=2))


if __name__ == '__main__':
    main()
