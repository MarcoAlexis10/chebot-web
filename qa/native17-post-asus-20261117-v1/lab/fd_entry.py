#!/usr/bin/env python3
"""Dormant unit-local FD preparation. CLI is disabled, no exec in this batch."""
import hashlib
import os
from pathlib import Path
import stat


def checked_filter(path, expected_sha256, uid):
    p = Path(path)
    if any(x.is_symlink() for x in [p, *p.parents]):
        raise ValueError('FILTER_SYMLINK')
    fd = os.open(p, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_uid != uid or stat.S_IMODE(info.st_mode) != 0o600 or info.st_nlink != 1:
            raise ValueError('FILTER_OWNER_OR_MODE')
        data = os.read(fd, 4097)
        if len(data) > 4096 or not data or len(data) % 8 or hashlib.sha256(data).hexdigest() != expected_sha256:
            raise ValueError('FILTER_BYTES_OR_HASH')
        os.lseek(fd, 0, os.SEEK_SET)
        return fd
    except BaseException:
        os.close(fd)
        raise


if __name__ == '__main__':
    # Future approved materialization must add explicit argument validation,
    # dup2(fd,3,inheritable=True) INSIDE the unit and exec the fixed bwrap argv.
    # Neither a flag nor an environment variable authorizes that here.
    raise SystemExit('HELD: unit FD executor not authorized')
