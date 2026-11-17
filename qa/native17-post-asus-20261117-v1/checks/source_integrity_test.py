import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('source_integrity',Path(__file__).with_name('source_integrity.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class SourceIntegrity(unittest.TestCase):
    def test_source_drift_is_not_a_verified_materialization(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'source.sql';data=b'-- synthetic source, no DDL\n';path.write_bytes(data)
            blob=hashlib.sha1(('blob '+str(len(data))+'\0').encode()+data).hexdigest()
            self.assertTrue(m.inspect_source(tmp,'source.sql',blob)['matches'])
            path.write_bytes(data+b'-- drift\n')
            self.assertFalse(m.inspect_source(tmp,'source.sql',blob)['matches'])

    def test_symlink_or_path_escape_is_not_a_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp)/'real').write_text('fixture');(Path(tmp)/'link').symlink_to('real')
            for path in ['../real','/etc/passwd','link']:
                with self.subTest(path=path),self.assertRaises(ValueError):m.inspect_source(tmp,path,'0'*40)

if __name__=='__main__':unittest.main(verbosity=2)
