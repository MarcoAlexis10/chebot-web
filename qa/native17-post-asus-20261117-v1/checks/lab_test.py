"""Offline file/contract tests. No Docker/systemd/bwrap/PG call is permitted."""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import struct
import tarfile
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
def module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'lab' / (name + '.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result
lab, fd_entry = module('lab'), module('fd_entry')

def member(name, kind=tarfile.REGTYPE, size=0, link=''):
    item = tarfile.TarInfo(name)
    item.type, item.size, item.linkname = kind, size, link
    return item

class LabContracts(unittest.TestCase):
    def test_disabled_executor_and_pure_default(self):
        with patch.object(lab.subprocess, 'run', side_effect=AssertionError('EXTERNAL_COMMAND_FORBIDDEN')):
            self.assertFalse(lab.main([])['executionEnabled'])
            self.assertFalse(lab.main(['--dry-run'])['bindingsComplete'])
            with self.assertRaisesRegex(ValueError, 'NOT_AUTHORIZED'):
                lab.main(['--execute'])

    def test_export_attack_paths_types_and_links(self):
        attacks = [[member('../escape')], [member('/etc/passwd')],
                   [member('device', tarfile.CHRTYPE)], [member('hard', tarfile.LNKTYPE, link='a')],
                   [member('a'), member('a')], [member('link', tarfile.SYMTYPE, link='../../escape')],
                   [member('link', tarfile.SYMTYPE, link='/mnt/c')],
                   [member('a', tarfile.SYMTYPE, link='b'), member('a/secret')],
                   [member('a/secret'), member('a', tarfile.SYMTYPE, link='b')]]
        for payload in attacks:
            with self.subTest(names=[x.name for x in payload]), self.assertRaises(ValueError):
                lab.archive_inventory(payload)
        with self.assertRaisesRegex(ValueError, 'TOTAL_SIZE'):
            lab.archive_inventory([member('a', size=6), member('b', size=6)], limit_bytes=10)

    def test_private_export_extraction_and_archive_permissions(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            archive, dest = root / 'export.tar', root / 'payload'
            dest.mkdir(mode=0o700)
            with tarfile.open(archive, 'w') as out:
                data = b'synthetic-binary-only'
                item = member('usr/bin/probe', size=len(data)); item.mode = 0o755
                out.addfile(item, io.BytesIO(data))
                out.addfile(member('probe', tarfile.SYMTYPE, link='usr/bin/probe'))
            archive.chmod(0o600)
            result = lab.extract_reviewed_export(archive, dest, os.getuid())
            self.assertEqual(result['expandedBytes'], len(data))
            self.assertEqual((dest / 'probe').read_bytes(), data)
            self.assertEqual((dest / 'usr/bin/probe').stat().st_mode & 0o777, 0o700)
            other = root / 'other'; other.mkdir(mode=0o700); archive.chmod(0o644)
            with self.assertRaisesRegex(ValueError, 'ARCHIVE_OWNER_MODE'):
                lab.extract_reviewed_export(archive, other, os.getuid())
            self.assertFalse(any(other.iterdir()))

    def test_filter_bytes_and_fd_are_checked_without_installing_filter(self):
        data = lab.seccomp_candidate('amd64')
        instructions = [struct.unpack('<HBBI', data[i:i+8]) for i in range(0, len(data), 8)]
        self.assertEqual(len(instructions), 9)
        self.assertEqual(instructions[0], (0x20, 0, 0, 4))
        self.assertEqual(instructions[1][3], 0xC000003E)
        self.assertEqual(instructions[-1][3], 0x7FFF0000)
        with self.assertRaises(ValueError): lab.seccomp_candidate('arm64')
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'policy.bpf'; path.write_bytes(data); path.chmod(0o600)
            fd = fd_entry.checked_filter(path, hashlib.sha256(data).hexdigest(), os.getuid())
            try: self.assertEqual(os.read(fd, len(data)), data)
            finally: os.close(fd)
            with self.assertRaisesRegex(ValueError, 'HASH'):
                fd_entry.checked_filter(path, '0'*64, os.getuid())
            link = Path(tmp) / 'alias'; link.symlink_to(path)
            with self.assertRaisesRegex(ValueError, 'SYMLINK'):
                fd_entry.checked_filter(link, hashlib.sha256(data).hexdigest(), os.getuid())

    def test_effective_resource_properties_must_match_not_just_configure(self):
        values = dict(MemoryMax='1073741824', MemorySwapMax='0', TasksMax='64',
                      CPUQuotaPerSecUSec='1s', RuntimeMaxUSec='2min')
        self.assertTrue(lab.verify_effective_limits(values))
        for key in values:
            for value in [None, 'infinity', 'wrong', '999999']:
                with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                    lab.verify_effective_limits(dict(values, **{key: value}))

    def test_bound_recipe_no_network_mounts_or_implicit_fd_transfer(self):
        p = lab.plan(dict(hostUid=1000, runId='a'*32, imageId='sha256:'+'b'*64, architecture='amd64'))
        self.assertTrue(p['bindingsComplete'])
        create = p['phases'][0]['argv']
        self.assertIn('--pull=never', create); self.assertIn('--network=none', create)
        unit = next(x['argv'] for x in p['phases'] if x['id'] == 'local-unit')
        self.assertLess(unit.index('/usr/bin/python3'), unit.index('bwrap'))
        self.assertIn('--seccomp', unit); self.assertIn('--unshare-net', unit)
        self.assertFalse(any('/mnt/' in x or 'docker.sock' in x for x in unit))
        self.assertFalse(p['hostStagingHardQuotaAccredited'])
        with self.assertRaises(ValueError): lab.root_name('/tmp/cheveni-native17-pWSZJnLP', 1000)
        with self.assertRaises(ValueError): lab.root_name(p['root'], 0)

    def test_uncertain_commit_never_becomes_discard_or_retry(self):
        clean = dict(unitEmpty=True, processesAbsent=True, containerAbsent=True, rootVerified=True)
        for outcome in ['COMMITTED', 'ACK_LOST', 'ROLLBACK_UNCONFIRMED', 'UNKNOWN']:
            result = lab.recovery(dict(clean, commitOutcome=outcome))
            self.assertEqual(result['result'], 'UNKNOWN')
            self.assertFalse(result['discard']); self.assertFalse(result['redispatch'])
        self.assertFalse(lab.recovery({})['discard'])
        self.assertTrue(lab.recovery(dict(clean, commitOutcome='NO_MUTATION_SMOKE'))['discard'])

if __name__ == '__main__':
    unittest.main(verbosity=2)
