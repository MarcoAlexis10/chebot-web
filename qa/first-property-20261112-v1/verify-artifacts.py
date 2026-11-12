"""Read-only local byte/syntax check. No SQL, browser, network or services."""
import hashlib
import json
import pathlib
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
WEB = HERE.parents[1]
ROOTS = {"web": WEB, "backend": WEB.parent / "backend"}


def verify(base, entry):
    file = (base / entry["path"]).resolve()
    file.relative_to(base.resolve())
    content = file.read_bytes()
    assert len(content) == entry["bytes"], entry["path"]
    assert hashlib.sha256(content).hexdigest() == entry["sha256"], entry["path"]
    if "gitBlob" in entry:
        header = b"blob " + str(len(content)).encode() + b"\0"
        assert hashlib.sha1(header + content).hexdigest() == entry["gitBlob"], entry["path"]


pins = json.loads((HERE / "SOURCE-PINS.json").read_text())
for item in pins["sources"]:
    verify(ROOTS[item["repo"]], item)
manifest = json.loads((HERE / "PACKAGE-MANIFEST.json").read_text())
for item in manifest["files"]:
    verify(HERE, item)
generated = json.loads((HERE / "GENERATED-MANIFEST.json").read_text())
for item in generated["files"]:
    verify(HERE, item)
syntax_count = 0
for item in manifest["files"]:
    file = HERE / item["path"]
    if file.suffix in (".mjs", ".js", ".cjs"):
        check = subprocess.run(["node", "--check", str(file)], capture_output=True)
        assert check.returncode == 0, item["path"]
        syntax_count += 1
print(json.dumps({"result": "PASS", "classification": "STATIC_BYTES_AND_SYNTAX_ONLY",
                  "localSourcePins": len(pins["sources"]), "packageFiles": len(manifest["files"]),
                  "generatedFiles": len(generated["files"]), "syntaxFiles": syntax_count,
                  "externalNativeBlobsCheckedHere": False, "typescriptCompiled": False,
                  "nativeSqlExecuted": False, "browserExecuted": False, "authVerified": False}))
