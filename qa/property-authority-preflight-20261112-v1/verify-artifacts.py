"""Byte/syntax verification only. Never executes the ASUS catalog or SQL."""
import hashlib
import json
import pathlib
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
WEB = HERE.parents[1]
ROOTS = {"web": WEB, "backend": WEB.parent / "backend"}


def verify(base, item):
    file = (base / item["path"]).resolve()
    file.relative_to(base.resolve())
    content = file.read_bytes()
    assert len(content) == item["bytes"], item["path"]
    assert hashlib.sha256(content).hexdigest() == item["sha256"], item["path"]
    if "gitBlob" in item:
        assert hashlib.sha1(b"blob " + str(len(content)).encode() + b"\0" + content).hexdigest() == item["gitBlob"], item["path"]


pins = json.loads((HERE / "SOURCE-PINS.json").read_text())
inherited = json.loads((WEB / pins["inherits"]).read_text())
for item in pins["sources"] + inherited["sources"]:
    verify(ROOTS[item["repo"]], item)
manifest = json.loads((HERE / "PACKAGE-MANIFEST.json").read_text())
syntax_count = 0
for item in manifest["files"]:
    verify(HERE, item)
    file = HERE / item["path"]
    if file.suffix == ".json":
        json.loads(file.read_text())
    if file.suffix == ".mjs":
        process = subprocess.run(["node", "--check", str(file)], capture_output=True)
        assert process.returncode == 0, item["path"]
        syntax_count += 1
print(json.dumps({"result": "PASS", "classification": "STATIC_BYTES_SYNTAX_NOT_NATIVE",
                  "localSourcePins": len(pins["sources"]) + len(inherited["sources"]),
                  "packageFiles": len(manifest["files"]), "syntaxFiles": syntax_count,
                  "nodeVersion": subprocess.check_output(["node", "--version"], text=True).strip(),
                  "asusCommandsExecuted": 0, "sqlExecuted": False,
                  "browserExecuted": False, "typescriptCompiled": False}))
