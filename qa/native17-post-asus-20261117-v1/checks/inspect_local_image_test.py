"""Offline contract for the ASUS image selector; no Docker or network is executed."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

MODULE = Path(__file__).resolve().parents[1] / 'lab' / 'lab.py'
SPEC = importlib.util.spec_from_file_location('cheveni_native17_lab_local_selector', MODULE)
lab = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(lab)

OBSERVED_IMAGE = 'postgres:17.11-bookworm'
OBSERVED_ID = 'sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826'


def simulated_readonly_probe(endpoint='unix:///var/run/docker.sock', arch='amd64', has_image=True):
    calls = []
    expected = {
        ('docker', 'context', 'show'): 'default',
        ('docker', 'context', 'inspect', 'default', '--format', '{{json .Endpoints.docker.Host}}'): json.dumps(endpoint),
        ('bwrap', '--version'): 'bubblewrap 0.11',
        ('systemd-run', '--version'): 'systemd 259\n',
    }
    image_command = ('docker', '--context', 'default', 'image', 'inspect', OBSERVED_IMAGE)
    if has_image:
        expected[image_command] = json.dumps([
            {'Id': OBSERVED_ID, 'Os': 'linux', 'Architecture': arch,
             'RepoDigests': ['postgres@' + OBSERVED_ID]}
        ])

    def fake_run(argv, **kwargs):
        assert kwargs.get('capture_output') is True
        assert kwargs.get('text') is True
        assert kwargs.get('timeout') == 10
        assert kwargs.get('check') is False
        calls.append(tuple(argv))
        reply = expected.get(tuple(argv))
        if reply is None:
            return subprocess.CompletedProcess(argv, 1, '', 'not available')
        return subprocess.CompletedProcess(argv, 0, reply, '')
    return fake_run, calls


class OfflineImageSelector(unittest.TestCase):
    def inspect(self, fake_run):
        with patch.object(lab.os, 'getuid', return_value=1000), patch.dict(
            os.environ,
            {'DOCKER_HOST': '', 'DOCKER_CONTEXT': '', 'DOCKER_TLS_VERIFY': '', 'DOCKER_CERT_PATH': ''},
        ):
            return lab.inspect_local(run=fake_run)

    def test_accepts_exact_cold_cache_image_observed_on_asus(self):
        self.assertEqual(lab.LOCAL_IMAGE_TAG, OBSERVED_IMAGE)
        fake_run, calls = simulated_readonly_probe()
        result = self.inspect(fake_run)
        self.assertEqual(result['imageId'], OBSERVED_ID)
        self.assertTrue(result['dockerLocalUnix'])
        self.assertFalse(result['provenanceAccredited'])
        self.assertFalse(result['nativeTestsAuthorized'])
        self.assertIn(('docker', '--context', 'default', 'image', 'inspect', OBSERVED_IMAGE), calls)
        self.assertNotIn(('docker', '--context', 'default', 'image', 'inspect', 'postgres:17.11'), calls)
        self.assertTrue(all(call[0] in ('docker', 'bwrap', 'systemd-run') for call in calls))

    def test_rejects_remote_endpoint_even_with_valid_local_image(self):
        fake_run, _ = simulated_readonly_probe(endpoint='tcp://example.invalid:2375')
        with self.assertRaisesRegex(ValueError, 'DOCKER_ENDPOINT_NOT_APPROVED_LOCAL_UNIX'):
            self.inspect(fake_run)

    def test_rejects_missing_tag_without_pull_or_fallback(self):
        fake_run, calls = simulated_readonly_probe(has_image=False)
        with self.assertRaisesRegex(ValueError, 'READONLY_PREFLIGHT_UNCONFIRMED'):
            self.inspect(fake_run)
        self.assertTrue(all('pull' not in call and 'run' not in call for call in calls))

    def test_rejects_unexpected_architecture(self):
        fake_run, _ = simulated_readonly_probe(arch='arm64')
        with self.assertRaisesRegex(ValueError, 'LOCAL_IMAGE_METADATA_UNCONFIRMED'):
            self.inspect(fake_run)


if __name__ == '__main__':
    unittest.main(verbosity=2)
