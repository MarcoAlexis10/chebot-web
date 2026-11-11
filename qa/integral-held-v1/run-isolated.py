#!/usr/bin/env python3
"""Linux QA launcher: fresh user/network namespace, empty environment, no egress.

Run: python run-isolated.py [--loopback] -- command arg ...
The optional loopback supports local HTTP/Chromium only; no external routes.
Does not launch infrastructure, SQL or services outside this process tree.
"""
import errno
import fcntl
import json
import os
from pathlib import Path
import socket
import struct
import subprocess
import sys


def inside(loopback, command):
    current = os.readlink('/proc/self/ns/net')
    parent = os.environ.pop('CHEVENI_PARENT_NETNS')
    if current == parent:
        raise RuntimeError('NETWORK_NAMESPACE_NOT_CHANGED')
    routes = Path('/proc/net/route').read_text()
    if any(line.strip() for line in routes.splitlines()[1:]):
        raise RuntimeError('EXTERNAL_IPV4_ROUTE_PRESENT')
    ipv6 = Path('/proc/net/ipv6_route').read_text()
    if any(line.split()[-1] != 'lo' for line in ipv6.splitlines() if line.strip()):
        raise RuntimeError('EXTERNAL_IPV6_INTERFACE_PRESENT')
    if loopback:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            result = fcntl.ioctl(sock, 0x8913, struct.pack('16sh', b'lo', 0))
            flags = struct.unpack('16sh', result[:18])[1]
            fcntl.ioctl(sock, 0x8914, struct.pack('16sh', b'lo', flags | 1))
    with socket.socket() as sock:
        sock.settimeout(0.5)
        try:
            sock.connect(('1.1.1.1', 443))
        except OSError as error:
            if error.errno != errno.ENETUNREACH:
                raise RuntimeError('NETWORK_DENIAL_NOT_PROVEN') from error
            denial = error.errno
        else:
            raise RuntimeError('EXTERNAL_NETWORK_REACHABLE')
    print('QA_KERNEL_ISOLATION ' + json.dumps({
        'parentNetns': parent, 'childNetns': current,
        'differentNamespace': True, 'ipv4Routes': routes,
        'ipv6Routes': ipv6, 'externalConnectErrno': denial,
        'loopbackOnly': loopback, 'inheritedCredentials': False,
        'uidMap': Path('/proc/self/uid_map').read_text(),
    }), flush=True)
    result = subprocess.run(command, env=dict(os.environ))
    return result.returncode if result.returncode >= 0 else 128 - result.returncode


def main():
    args = sys.argv[1:]
    child = '--inside' in args
    loopback = '--loopback' in args
    separator = args.index('--')
    command = args[separator + 1:]
    if not command:
        raise RuntimeError('COMMAND_REQUIRED')
    if child:
        return inside(loopback, command)
    env = {'PATH': os.environ.get('PATH', '/usr/bin:/bin'),
           'HOME': '/tmp', 'TZ': 'UTC', 'LANG': 'C.UTF-8',
           'CHEVENI_PARENT_NETNS': os.readlink('/proc/self/ns/net')}
    argv = ['unshare', '--user', '--map-root-user', '--net', sys.executable,
            str(Path(__file__).resolve()), '--inside']
    if loopback:
        argv.append('--loopback')
    return subprocess.run([*argv, '--', *command], env=env).returncode


if __name__ == '__main__':
    sys.exit(main())
