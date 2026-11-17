import copy
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch
import checks
import review

ROOT=Path(__file__).resolve().parent
PRIOR=ROOT.parent/'native17-post-asus-20261117-v1/sql'

class ReviewRegression(unittest.TestCase):
    def test_baseline_defects_are_detected_and_candidates_close_source_findings(self):
        historical=ROOT.parents[2]/'qa/private-writer-composition-20261111-v1/vendor/qa/cheveni-beta-release-candidate-v1/writer-integration/private-mutations-UNAPPLIED.sql'
        # This pinned legacy source is stored as a bounded review excerpt below.
        legacy=(ROOT/'LEGACY-CHECK-SOURCE.sql.txt').read_text()
        old=checks.findings((PRIOR/'02-admission-DO-NOT-APPLY.sql').read_text(),(PRIOR/'03-read2-DO-NOT-APPLY.sql').read_text(),legacy)
        self.assertEqual(set(old),{'KNOWN_HISTORICAL_BINDING_NOT_EXPLICIT','KNOWN_CURRENT_CUT_NOT_RECHECKED','METADATA_BEFORE_INDEPENDENT_FLOOR','CURRENT_AUTH_CHECK_STABLE_SNAPSHOT','AUTHORITY_CARDINALITY_AND_VALUE_FROM_DIFFERENT_CALLS'})
        self.assertEqual(checks.findings((ROOT/'sql/02-admission-DO-NOT-APPLY.sql').read_text(),(ROOT/'sql/03-read2-DO-NOT-APPLY.sql').read_text(),(ROOT/'sql/06-legacy-check-DO-NOT-APPLY.sql').read_text()),[])

    def test_semicolons_in_bodies_strings_identifiers_and_nested_comments(self):
        sql='/* outer /* nested ; */ */ begin; -- ignored ;\ndo $x$begin raise exception \'x;\';end$x$; select \'a;\'\'b\',"x;y"; rollback;'
        self.assertEqual(len(review.segments(sql)),4)

    def test_malformed_or_unsupported_sql_never_produces_review(self):
        for sql in ["select 'unterminated;",'do $x$begin;$y$;', '/* unclosed', 'select 1', "select E'a\\\'x';"]:
            with self.subTest(sql=sql),self.assertRaises(ValueError):review.segments(sql)

    def test_guard_or_rollback_removal_is_rejected(self):
        sql=(ROOT/'sql/02-admission-DO-NOT-APPLY.sql').read_text()
        for broken in [sql.replace("raise exception 'PROPERTY_ADMISSION_REVIEW_ONLY';",'null;',1),sql.replace('rollback;','commit;'),sql.replace('begin;','',1)]:
            with self.assertRaises(ValueError):review.check_guards(broken)

    def test_type_and_overload_cannot_satisfy_protected_function(self):
        defs=review.declarations('create type x.same as (id uuid); create function x.same(p text) returns void language plpgsql as $$begin return;end$$;')
        self.assertEqual([d['kind'] for d in defs],['type','function'])
        self.assertEqual(defs[1]['argumentTypes'],['text'])
        result=review.assess()
        self.assertEqual((result['protectedResolved'],result['protectedRequired']),(0,10))
        self.assertTrue(all(not p['declarationInCandidate'] for p in result['ports']))

    def test_integrity_drift_added_sql_and_symlink_stop_before_read(self):
        with tempfile.TemporaryDirectory() as temp:
            target=Path(temp)/'review';shutil.copytree(ROOT,target)
            f=target/'PORT-TRACE.json';original=f.read_bytes()
            f.write_bytes(original+b' ')
            with self.assertRaisesRegex(ValueError,'INPUT_HASH_MISMATCH'):review.assess(target)
            f.write_bytes(original)
            extra=target/'sql/99-unreviewed.sql';extra.write_text('select 1;')
            with self.assertRaisesRegex(ValueError,'SQL_FILE_SET_DRIFT'):review.assess(target)
            extra.unlink();f.unlink();f.symlink_to(ROOT/'PORT-TRACE.json')
            with self.assertRaisesRegex(ValueError,'INPUT_SYMLINK'):review.assess(target)

    def test_fk_closure_preserves_companion_and_rejects_cycle(self):
        closure=json.loads((ROOT/'HISTORICAL-FK-CLOSURE.json').read_text())
        names=[r['name'] for r in closure['order']]
        self.assertLess(names.index('concierge_invite_private.companion_binding_v1'),names.index('concierge_invite_private.manager_result_v1'))
        self.assertLess(names.index('concierge_invite_private.manager_result_v1'),names.index('concierge_invite_private.property_capture_v1'))
        rows=[dict(name='a',foreignKeysRequire=['b'],createTableEvidence=[]),dict(name='b',foreignKeysRequire=['a'],createTableEvidence=[])]
        with self.assertRaisesRegex(ValueError,'CYCLE'):review.foreign_key_closure(rows,['a'])

    def test_plan_has_roles_before_objects_and_no_mutation_path(self):
        plan=json.loads((ROOT/'PHASE-PLAN.json').read_text())
        done=set()
        for phase in plan['phases']:
            self.assertTrue(set(phase['depends'])<=done);done.add(phase['id'])
        for p in (ROOT/'sql').glob('*.sql'):review.check_guards(p.read_text())
        roles=(ROOT/'sql/00-roles-DO-NOT-APPLY.sql').read_text()
        late=(ROOT/'sql/04-object-acl-rls-DO-NOT-APPLY.sql').read_text()
        self.assertNotIn('alter table',roles.lower());self.assertNotIn('create role',late.lower())
        result=review.assess();self.assertFalse(result['executionEnabled']);self.assertFalse(result['installable']);self.assertEqual(result['mutationSteps'],[])

    def test_no_process_or_database_client_in_review_and_reader_abi_preserved(self):
        import ast
        tree=ast.parse((ROOT/'review.py').read_text())
        modules={n.names[0].name for n in ast.walk(tree) if isinstance(n,ast.Import)}
        self.assertTrue(modules<={'argparse','hashlib','json','re'})
        read=review.declarations((ROOT/'sql/03-read2-DO-NOT-APPLY.sql').read_text())
        self.assertEqual(len(read[0]['argumentTypes']),26)
        self.assertEqual(read[0]['name'],'concierge_invite_private.read_property_capture_v2')
        self.assertNotIn('grant execute', (ROOT/'sql/04-object-acl-rls-DO-NOT-APPLY.sql').read_text().lower())

if __name__=='__main__':unittest.main(verbosity=2)
