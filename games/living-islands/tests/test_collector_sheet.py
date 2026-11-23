"""Tests for blender/collector_sheet.py (the beach collector concept sheet). Pure python + numpy, no Blender.
Run: python3 games/living-islands/tests/test_collector_sheet.py        (also works under pytest)"""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BL = os.path.join(ROOT, 'blender')
sys.path.insert(0, BL)
import numpy as np
import collector_sheet as CS

SRC_PATH = os.path.join(BL, 'collector_sheet.py')
DOC_PATH = os.path.join(ROOT, 'COLLECTOR_SHEET.md')
_fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: _fails.append(msg)

def _bbox(key):
    b = CS.Builder(); CS.BUILD[key](b)
    v = np.concatenate([np.concatenate(bk[0]) for (m, sm), bk in b.buckets.items() if m not in ('sand', 'twine')])
    return b, v.min(0), v.max(0)

def test_args():
    a = CS.parse_args(['--out', 'x'])
    check(a.out == 'x' and a.w == 960 and a.h == 640 and a.samples == 48 and a.only == 'ABCD', 'defaults: 960x640, 48 samples, all four designs')
    check(a.views == ('3q', 'side', 'front'), 'default views are three-quarter, side, front')
    a = CS.parse_args(['--out', 'd', '--w', '640', '--h', '420', '--samples', '24', '--only', 'cb'])
    check((a.w, a.h, a.samples, a.only) == (640, 420, 24, 'CB'), 'overrides parse, --only is upper-cased and filtered')
    check(CS.parse_args(['--out', 'x', '--only', 'zz']).only == 'ABCD', 'an empty --only falls back to all designs')
    for bad in ([], ['--out', 'x', '--w', '10'], ['--out', 'x', '--samples', '0']):
        try:
            CS.parse_args(bad); ok = False
        except SystemExit:
            ok = True
        check(ok, 'bad arguments are refused: %s' % (bad,))

def test_source_clean():
    src = open(SRC_PATH).read()
    banned = ['import requests', 'import urllib', 'urllib.', 'import socket', 'import http', 'http.client', 'import subprocess', 'subprocess.', 'os.system', 'os.popen',
              'os.remove', 'os.unlink', 'os.rmdir', 'shutil.rmtree', 'shutil.', 'rmtree', 'eval(', 'exec(', 'ftplib', 'smtplib', 'webbrowser']
    hits = [w for w in banned if w in src]
    check(not hits, 'no network, subprocess or delete calls in the script %s' % (hits,))
    check(not re.search(r'https?://|www\.', src), 'no web addresses in the script')
    pat = re.compile(r'\b(' + '|'.join(('gore', 'blood', 'corpse', 'dead body', 'skeleton', 'skull', 'murder', 'kill', 'weapon', 'gun', 'brand', 'logo')) + r')\b', re.I)
    m = pat.search(src + open(DOC_PATH).read() if os.path.exists(DOC_PATH) else src)
    check(not m, 'no forbidden words in the script or its note %s' % (m.group(0) if m else ''))
    check(not re.search(r'/(tmp|home|root|Users)/\w', src), 'no private or absolute paths in the script')
    check(not re.search(r'(api[_-]?key|secret|password|token)\s*=', src, re.I), 'no secrets in the script')
    check(os.path.exists(DOC_PATH) and not re.search(r'/(tmp|home|root|Users)/\w', open(DOC_PATH).read()), 'COLLECTOR_SHEET.md exists and has no private paths')

def test_designs():
    for k in CS.DESIGNS:
        b, mn, mx = _bbox(k); size = mx - mn
        check(0.9 <= size[0] <= 1.25 and 0.5 <= size[1] <= 0.8, '%s is dog-sized: %.2f m long, %.2f m wide' % (k, size[0], size[1]))
        check(0.45 <= size[2] <= 0.72, '%s height %.2f m (about 0.5 to 0.7 incl. arm, ears or lamp)' % (k, size[2]))
        check(mn[2] > -0.03, '%s stands on the ground (lowest point %.3f)' % (k, mn[2]))
        keys = {m for (m, sm) in b.buckets}
        check({'solar', 'solar_scute'} & keys, '%s has a solar shell' % k)
        links = sum(len(bk[1]) for (m, sm), bk in b.buckets.items() if m == 'link')
        check(links >= 400, '%s has modelled tread links (%d link and arm faces)' % (k, links))
        lamp_v = sum(len(np.concatenate(bk[0])) for (m, sm), bk in b.buckets.items() if m == 'lamp')
        one = len(CS.unit_superq(5, 10, 0.9, 0.9, True)[0])
        check(lamp_v == one, '%s has exactly one status lamp' % k)
        check('grime' in keys and 'paint' in keys and 'lens' in keys, '%s has a bin interior, painted panels and a lens' % k)
        b2 = CS.Builder(); CS.BUILD[k](b2)
        same = all(np.array_equal(np.concatenate(b.buckets[kk][0]), np.concatenate(b2.buckets[kk][0])) for kk in b.buckets) and set(b.buckets) == set(b2.buckets)
        check(same, '%s geometry is deterministic' % k)

def test_distinct_silhouettes():
    """the four concepts must differ: compare side-view occupancy masks (x,z), they must not be near duplicates"""
    masks = {}
    for k in CS.DESIGNS:
        b, mn, mx = _bbox(k); g = np.zeros((60, 40), bool)
        for (m, sm), bk in b.buckets.items():
            if m in ('sand', 'twine'): continue
            for v in bk[0]:
                ix = np.clip(((v[:, 0] + 0.7) / 1.5 * 59).astype(int), 0, 59); iz = np.clip((v[:, 2] / 0.8 * 39).astype(int), 0, 39); g[ix, iz] = True
        masks[k] = g
    for i, p in enumerate(CS.DESIGNS):
        for q in CS.DESIGNS[i + 1:]:
            a, c = masks[p], masks[q]; iou = (a & c).sum() / max(1, (a | c).sum())
            check(iou < 0.8, 'designs %s and %s differ in side occupancy (overlap %.2f)' % (p, q, iou))

def test_font_and_sheet_helpers():
    img = np.zeros((40, 80, 3), np.float32)
    CS.draw_text(img, 2, 2, 'A B C D', 2, 1.0)
    check(img.sum() > 0, 'the caption font draws pixels')
    check(all(ch in CS.FONT for name in CS.NAMES.values() for ch in name) and all(ch in CS.FONT for _, c in CS.VIEWS for ch in c), 'the font covers every caption letter')

TESTS = [test_args, test_source_clean, test_designs, test_distinct_silhouettes, test_font_and_sheet_helpers]
if __name__ == '__main__':
    for t in TESTS: t()
    print('\n%d failures' % len(_fails)); sys.exit(1 if _fails else 0)
