#!/usr/bin/env python3
"""Build the HW-12 package: write STEPLIST.txt and SHA256SUMS.txt in hw12_pkg/ and zip it (no pycache, no tests).
  python3 -B build_package.py ZIP_PATH
Cloud-side tool, not shipped in the zip."""
import hashlib
import os
import sys
import zipfile

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.join(HERE, 'hw12_pkg')
sys.path.insert(0, PKG)
import run_all  # noqa: E402


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


def main():
    zip_path = sys.argv[1]
    for root, dirs, files in os.walk(PKG):
        assert '__pycache__' not in dirs, 'pycache in package'
        assert not [f for f in files if f.endswith('.pyc')], 'pyc in package'
    with open(os.path.join(PKG, 'STEPLIST.txt'), 'w') as f:
        f.write('\n'.join(run_all.steplist_lines()) + '\n')
    names = sorted(n for n in os.listdir(PKG) if n != 'SHA256SUMS.txt' and os.path.isfile(os.path.join(PKG, n)))
    with open(os.path.join(PKG, 'SHA256SUMS.txt'), 'w') as f:
        for n in names:
            f.write('%s  ./%s\n' % (sha(os.path.join(PKG, n)), n))
    if os.path.exists(zip_path):
        os.remove(zip_path)
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for n in names + ['SHA256SUMS.txt']:
            zi = zipfile.ZipInfo('hw12_pkg/' + n, date_time=(2026, 11, 24, 12, 0, 0))
            zi.compress_type = zipfile.ZIP_DEFLATED
            zi.external_attr = (0o644 << 16)
            with open(os.path.join(PKG, n), 'rb') as src:
                z.writestr(zi, src.read())
    print('wrote', zip_path, len(names) + 1, 'files')


if __name__ == '__main__':
    main()
