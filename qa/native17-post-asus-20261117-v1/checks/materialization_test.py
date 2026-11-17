"""Tests of review tooling, not native SQL tests or authority fixtures."""
import importlib.util
import json
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('materialization',ROOT/'checks/materialization.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class MaterializationInventory(unittest.TestCase):
    def test_type_or_comment_cannot_implement_a_protected_resolver(self):
        name='property_original_metadata_v1'
        files={'only-type.sql':'create type concierge_invite_private.'+name+' as (original_ref uuid);\n-- create function concierge_invite_private.'+name+'(x uuid) returns void'}
        profile={'requiredMissingPorts':[{'name':name+'(uuid)','status':'MISSING_CUSTODIAN','requirements':['exact original']}]}
        r=m.review(files,profile)
        self.assertEqual(len(r['unresolvedProtectedFunctions']),1)
        self.assertEqual(r['state'],'HELD')
        self.assertFalse(r['installationAuthorized'])

    def test_current_candidates_expose_missing_dependency_and_privilege_closure(self):
        r=m.main([])
        self.assertEqual(len(r['unresolvedProtectedFunctions']),10)
        self.assertEqual(set(r['closure'].values()),{False})
        reader=next(d for d in r['definitions'] if d['kind']=='function' and d['name'].endswith('.read_property_capture_v2'))
        self.assertEqual(len(reader['parameters']),26)
        self.assertFalse(any(d['name'].endswith('.bootstrap_current_cut_v1') for d in r['definitions']))

    def test_unsupported_shape_cannot_silently_pass_inventory(self):
        for sql in ['/* unresolved nested comments */ create table public.x(a uuid);', 'create function "private".f() returns void']:
            with self.assertRaises(ValueError):m.inventory({'unknown.sql':sql})

if __name__=='__main__':unittest.main(verbosity=2)
