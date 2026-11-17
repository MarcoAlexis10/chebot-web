#!/usr/bin/env python3
"""Read pinned files only. Reports byte integrity, never native readiness."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat

ROOT=Path(__file__).resolve().parents[1]

def inspect_source(base, path, expected_blob):
    relative=PurePosixPath(path)
    if relative.is_absolute() or '..' in relative.parts or str(relative)!=path:
        raise ValueError('SOURCE_PATH_UNSAFE')
    base=Path(base).absolute()
    full=base/path
    if any(x.is_symlink() for x in [full,*full.parents]):
        raise ValueError('SOURCE_SYMLINK_UNREVIEWED')
    fd=os.open(full,os.O_RDONLY|os.O_NOFOLLOW)
    try:
        before=os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or before.st_size>2097152:
            raise ValueError('SOURCE_TYPE_OR_SIZE')
        chunks=[];remaining=before.st_size
        while remaining:
            chunk=os.read(fd,min(65536,remaining))
            if not chunk:raise ValueError('SOURCE_TRUNCATED')
            chunks.append(chunk);remaining-=len(chunk)
        if os.read(fd,1):raise ValueError('SOURCE_GREW')
        after=os.fstat(fd)
        if (before.st_mtime_ns,before.st_ctime_ns,before.st_size)!=(after.st_mtime_ns,after.st_ctime_ns,after.st_size):
            raise ValueError('SOURCE_CHANGED_DURING_READ')
        data=b''.join(chunks)
    finally:os.close(fd)
    blob=hashlib.sha1(('blob '+str(len(data))+'\0').encode()+data).hexdigest()
    return dict(path=path,expectedBlob=expected_blob,observedBlob=blob,
                matches=blob==expected_blob,sha256=hashlib.sha256(data).hexdigest())

def verify(pins,checkouts):
    rows=[]
    for source in pins:
        try:row=inspect_source(checkouts[source['checkout']],source['path'],source['gitBlob'])
        except (OSError,ValueError,KeyError) as error:
            row=dict(path=source['path'],matches=False,error=type(error).__name__+': '+str(error))
        rows.append(dict(repository=source['repository'],ref=source['ref'],**row))
    return dict(classification='LOCAL_BYTES_VS_PINNED_GIT_BLOBS_ONLY',allSourceBytesMatch=all(r['matches'] for r in rows),
                sources=rows,nativeExecution=False,originOrHostAccreditation=False,installationAuthorized=False)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for name in ['web','backend','lab']:p.add_argument('--'+name,type=Path,required=True)
    args=p.parse_args()
    result=verify(json.loads((ROOT/'SOURCE-PINS.json').read_text())['sources'],vars(args))
    print(json.dumps(result,indent=2))
    raise SystemExit(0 if result['allSourceBytesMatch'] else 1)
