"""Tests for the sky smoothness check (blender/picture_guard.py: check_sky_smooth). Pure python + numpy + PIL, no Blender.
Run: python3 games/living-islands/tests/test_sky_smooth.py        (also works under pytest)
Fixtures (tests/fixtures/sky, 400 px JPEGs): old_* are Blender 3.6 hardware pictures from HW-6 (a flat band with a hard lower edge, must FAIL);
new_* are the HW-11 renders of the same seeds and views with the new sky (must PASS). Thresholds are in picture_guard.py and in SKY_FIX.md."""
import glob, os, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BL = os.path.join(ROOT, 'blender')
FIX = os.path.join(HERE, 'fixtures', 'sky')
sys.path.insert(0, BL)
import numpy as np
from PIL import Image
import picture_guard as PG

_fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: _fails.append(msg)

def synthetic(w=800, h=533, horizon=0.25, fade_rows=0, island=0.0, seed=0):
    """a sky above a sea: the sky is a gradient, the sea is darker, the change at the horizon takes fade_rows rows (0 = a hard edge); island = fraction of the width covered by a dark land block from the horizon down"""
    rng = np.random.default_rng(seed)
    hz = int(h * horizon)
    i = np.arange(h, dtype=float)
    if fade_rows > 0:
        t = np.clip((i - (hz - fade_rows / 2.0)) / fade_rows, 0, 1); t = t * t * (3 - 2 * t)      # smoothstep from sky to sea over fade_rows rows
    else:
        t = (i >= hz).astype(float)
    sky = np.array([235.0, 205.0, 160.0])[None, :] * (1 - 0.18 * np.minimum(i, hz) / hz)[:, None]
    sea = np.array([55.0, 75.0, 105.0])[None, :] + 20 * (np.maximum(i - hz, 0) / h)[:, None]
    rows = sky * (1 - t)[:, None] + sea * t[:, None]
    a = np.repeat(rows[:, None, :], w, axis=1) + rng.normal(0, 1.5, (h, w, 3))
    if island > 0:
        a[hz:, :int(w * island)] = [40, 55, 35]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

def run_on(im, name='t.png'):
    d = tempfile.mkdtemp(); p = os.path.join(d, name); im.save(p)
    return PG.check_sky_smooth(p)

def test_synthetic():
    ok, msg, st = run_on(synthetic(fade_rows=100))
    check(ok, 'a smooth gradient sky with a 100-row soft horizon passes (biggest step %.1f)' % st['horizon_step'])
    ok, msg, st = run_on(synthetic(fade_rows=0))
    check(not ok and st['horizon_step'] > 50, 'the same picture with a hard horizon fails (step %.1f)' % st['horizon_step'])
    ok, msg, st = run_on(synthetic(fade_rows=100, island=0.45))
    check(ok, 'a soft horizon with an island covering 45%% of the width passes (the island is not a band): step %.1f' % st['horizon_step'])
    ok, msg, st = run_on(synthetic(fade_rows=0, island=0.45))
    check(not ok, 'a hard band edge still fails with an island in front of 45%% of it (step %.1f)' % st['horizon_step'])
    ok1, _, s1 = run_on(synthetic(w=800, h=533, fade_rows=0)); ok2, _, s2 = run_on(synthetic(w=2400, h=1600, fade_rows=0))
    check(s1['horizon_step'] > 100 and s2['horizon_step'] > 100 and not ok1 and not ok2, 'render size does not matter (hard edge at 800 and 2400 px: %.1f and %.1f)' % (s1['horizon_step'], s2['horizon_step']))
    ok1, _, s1 = run_on(synthetic(w=800, h=533, fade_rows=100)); ok2, _, s2 = run_on(synthetic(w=2400, h=1600, fade_rows=300))
    check(ok1 and ok2, 'a soft horizon passes at 800 and at 2400 px (%.1f and %.1f)' % (s1['horizon_step'], s2['horizon_step']))

def test_stripe_in_sky():
    im = synthetic(fade_rows=100); a = np.asarray(im).astype(float).copy()
    a[40:] += 0; a[40:50] -= 40            # a darker 10-row stripe inside the sky
    ok, msg, st = run_on(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)))
    check(not ok, 'a dark stripe inside a smooth sky fails (%s)' % msg.split(': ', 1)[-1][:80])

def test_bad_inputs():
    ok, msg, st = PG.check_sky_smooth(os.path.join(tempfile.gettempdir(), 'no_such_picture_xyz.png'))
    check(not ok and 'cannot measure' in msg, 'a missing file is a failed check, not an exception')

def test_fixtures():
    olds = sorted(glob.glob(os.path.join(FIX, 'old_*.jpg'))); news = sorted(glob.glob(os.path.join(FIX, 'new_*.jpg')))
    check(len(olds) >= 6 and len(news) >= 6, 'fixtures present: %d old, %d new' % (len(olds), len(news)))
    worst_new = 0.0; best_old = 1e9
    for p in olds:
        ok, msg, st = PG.check_sky_smooth(p)
        best_old = min(best_old, st.get('horizon_step', 0))
        check(not ok, 'old (HW-6, Blender 3.6) %s fails: step %.1f' % (os.path.basename(p), st.get('horizon_step', 0)))
    for p in news:
        ok, msg, st = PG.check_sky_smooth(p)
        worst_new = max(worst_new, st.get('horizon_step', 0), st.get('sky_step', 0))
        check(ok, 'new (HW-11) %s passes: step %.1f, in sky %.1f' % (os.path.basename(p), st.get('horizon_step', 0), st.get('sky_step', 0)))
    print('calibration: weakest old band step %.1f, biggest new step %.1f, limits %.1f (edge) and %.1f (inside the sky)' % (best_old, worst_new, PG.SKY_MAX_HORIZON_STEP, PG.SKY_MAX_SKY_STEP))
    check(worst_new < PG.SKY_MAX_HORIZON_STEP and best_old > PG.SKY_MAX_HORIZON_STEP, 'the limit sits between the new pictures and the old ones')

def test_cli():
    olds = sorted(glob.glob(os.path.join(FIX, 'old_*.jpg'))); news = sorted(glob.glob(os.path.join(FIX, 'new_*.jpg')))
    if not olds or not news:
        check(False, 'cli test needs fixtures'); return
    r_bad = subprocess.run([sys.executable, '-I', os.path.join(BL, 'picture_guard.py'), '--sky', olds[0]], capture_output=True, text=True)
    r_ok = subprocess.run([sys.executable, '-I', os.path.join(BL, 'picture_guard.py'), '--sky', news[0]], capture_output=True, text=True)
    check(r_bad.returncode == 3 and 'SKY_SMOOTH FAIL' in r_bad.stdout, 'picture_guard.py --sky exits 3 on an old band picture')
    check(r_ok.returncode == 0 and 'SKY_SMOOTH ok' in r_ok.stdout, 'picture_guard.py --sky exits 0 on a new picture')

def test_existing_guard_unchanged():
    d = tempfile.mkdtemp(); p = os.path.join(d, 'black.png'); Image.new('RGB', (200, 100), (0, 0, 0)).save(p)
    ok, msg, st = PG.check_picture(p)
    check(not ok, 'the black-picture check still fails a black picture')
    q = os.path.join(d, 'ok.png'); Image.fromarray((np.random.default_rng(1).random((100, 200, 3)) * 255).astype(np.uint8)).save(q)
    check(PG.check_picture(q)[0], 'the black-picture check still passes a normal picture')

if __name__ == '__main__':
    for name, fn in list(globals().items()):
        if name.startswith('test_') and callable(fn):
            fn()
    print('%d failed' % len(_fails)); sys.exit(1 if _fails else 0)
