"""Static bytes/syntax only; never SQL, a driver, browser or ASUS command."""
import hashlib
import json
import pathlib
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
WEB = HERE.parents[1]
ROOTS = {"web": WEB, "backend": WEB.parent / "backend"}
seen = {}
visited = set()


def check(base, item):
    path = (base / item["path"]).resolve()
    path.relative_to(base.resolve())
    data = path.read_bytes()
    assert len(data) == item["bytes"], item["path"]
    assert hashlib.sha256(data).hexdigest() == item["sha256"], item["path"]
    assert hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest() == item["gitBlob"], item["path"]


def pins(file):
    file = file.resolve()
    if file in visited:
        return
    visited.add(file)
    body = json.loads(file.read_text())
    for item in body["sources"]:
        key = item["repo"], item["path"]
        if key in seen:
            assert seen[key] == item["gitBlob"], key
        else:
            check(ROOTS[item["repo"]], item)
            seen[key] = item["gitBlob"]
    inherits = body.get("inherits", [])
    for source in [inherits] if isinstance(inherits, str) else inherits:
        pins(WEB / source)


pins(HERE / "SOURCE-PINS.json")
manifest = json.loads((HERE / "PACKAGE-MANIFEST.json").read_text())
syntax = 0
for item in manifest["files"]:
    check(HERE, item)
    file = HERE / item["path"]
    if file.suffix == ".json":
        json.loads(file.read_text())
    if file.suffix == ".mjs":
        result = subprocess.run(["node", "--check", str(file)], capture_output=True)
        assert result.returncode == 0, item["path"]
        syntax += 1
overlay = json.loads((HERE / "OVERLAY-MANIFEST.json").read_text())
for item in overlay["files"]:
    data = (HERE / item["path"]).read_bytes()
    assert len(data) == item["bytes"] and hashlib.sha256(data).hexdigest() == item["sha256"]
plan = json.loads((WEB / "qa/reviews/property-bootstrap-20261112/NATIVE-DELTA.json").read_text())
assert plan["executableMaterializationSha"] is None and plan["abortsMustRemain"]
assert all(x["state"] == "NOT_AUTHORIZED_NOT_RUN" for x in plan["newPropertySpecificAssertions"])
print(json.dumps({"status": "PASS", "classification": "STATIC_BYTES_SYNTAX_NOT_NATIVE",
                  "localSources": len(seen), "packageFiles": len(manifest["files"]),
                  "syntaxMjs": syntax, "htmlOverlays": len(overlay["files"]),
                  "nodeVersion": subprocess.check_output(["node", "--version"], text=True).strip(),
                  "typescriptCompiled": False, "sqlParsedByNativeEngine": False,
                  "sqlExecuted": False, "pgDriverExecuted": False, "browserExecuted": False,
                  "asusExecuted": False}))
