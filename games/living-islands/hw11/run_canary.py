#!/usr/bin/env python3
"""HW-11 SKY CANARY: render 11 fixed pictures at 800 px with the new sky, run the sky smoothness check on them, pack the pictures in one zip.
  python3 run_canary.py --blender /path/to/blender --out NEW_EMPTY_FOLDER [--device GPU --gpu-name Radeon] [--min-free-gb 30]
One job at a time, low priority, stops at the first failure. No network, no downloads, nothing installed. Writes only inside --out (which must not exist yet).
Needs Python 3 with numpy and PIL (as in HW-4 to HW-10). Exit 0 = all 11 rendered and passed both checks; 2 = bad arguments or disk; 3 = a job failed; 4 = rendered but the sky check failed."""
import argparse, datetime, hashlib, json, os, shutil, subprocess, sys, time, zipfile
sys.dont_write_bytecode = True      # no __pycache__ in the package folder

HERE = os.path.dirname(os.path.abspath(__file__))
BL = os.path.join(HERE, 'blender')
# label, seed, view, width, height, samples. Nine seeds with a band in HW-6 (close-ups, the worst) and the two large seeds (2009 dark strip, 2014 gold slab) as wide views.
JOBS = [('close_seed%d' % s, s, 'close', 800, 533, 32) for s in (1122, 2004, 2005, 2008, 2015, 2016, 2021, 2025, 2029)] + \
       [('wide_seed%d' % s, s, 'hero', 800, 533, 32) for s in (2009, 2014)]

ap = argparse.ArgumentParser()
ap.add_argument('--blender', required=True)
ap.add_argument('--out', required=True, help='a folder that does not exist yet; it is created here')
ap.add_argument('--device', default='CPU', choices=['CPU', 'GPU'])
ap.add_argument('--gpu-name', default='')
ap.add_argument('--min-free-gb', type=float, default=30.0)
a = ap.parse_args()
if os.path.exists(a.out):
    print('STOP: %s already exists; give a new folder name' % a.out); sys.exit(2)
parent = os.path.dirname(os.path.abspath(a.out)) or '.'
def free_gb(): return shutil.disk_usage(parent).free / 1e9
if free_gb() < a.min_free_gb:
    print('STOP: only %.1f GB free, floor is %.0f GB' % (free_gb(), a.min_free_gb)); sys.exit(2)
try:
    import numpy, PIL  # noqa: F401
except ImportError:
    print('STOP: Python needs numpy and PIL for the sky check (nothing is installed by this script)'); sys.exit(2)
os.makedirs(a.out)
sys.path.insert(0, BL)
import picture_guard as PG

env = dict(os.environ, LI_DEVICE=a.device, LI_GPU_NAME=a.gpu_name, LI_REQUIRE_GPU='1' if (a.device == 'GPU' and a.gpu_name) else '', PYTHONDONTWRITEBYTECODE='1')
res = {'started': datetime.datetime.now().isoformat(timespec='seconds'), 'device_requested': a.device, 'jobs': [], 'stopped_because': 'finished'}
def save():
    with open(os.path.join(a.out, 'results.json'), 'w') as f: json.dump(res, f, indent=1)

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''): h.update(c)
    return h.hexdigest()

pics = []
for label, seed, view, w, h, spp in JOBS:
    if free_gb() < a.min_free_gb:
        res['stopped_because'] = 'disk floor'; save(); print('STOP: disk below floor'); sys.exit(2)
    png = os.path.join(a.out, label + '.png'); log = os.path.join(a.out, label + '.log')
    cmd = [a.blender, '-b', '--python', os.path.join(BL, 'hero_render.py'), '--', '--seed', str(seed), '--view', view, '--w', str(w), '--h', str(h), '--samples', str(spp), '--out', png]
    if os.path.exists('/usr/bin/nice'): cmd = ['/usr/bin/nice', '-n', '10'] + cmd
    t = time.time()
    with open(log, 'w') as lf:
        rc = subprocess.run(cmd, stdout=lf, stderr=subprocess.STDOUT, env=env).returncode
    sec = round(time.time() - t, 1)
    dev = ''
    with open(log, errors='replace') as lf:
        for line in lf:
            if line.startswith('LI_DEVICE'): dev = line.strip()
    job = {'label': label, 'seed': seed, 'view': view, 'returncode': rc, 'seconds': sec, 'device': dev}
    if rc == 0 and os.path.exists(png):
        ok1, m1, _ = PG.check_picture(png)
        ok2, m2, st2 = PG.check_sky_smooth(png)
        job.update(picture_ok=ok1, sky_ok=ok2, sky=st2, sha256=sha(png)); pics.append(png)
        print('%-16s %6.1fs  picture %s  sky %s (biggest step %s at row %s, in sky %s)' % (label, sec, 'ok' if ok1 else 'FAIL', 'ok' if ok2 else 'FAIL', st2.get('horizon_step'), st2.get('horizon_row'), st2.get('sky_step')))
        if not ok1:
            res['jobs'].append(job); res['stopped_because'] = 'black or flat picture in ' + label; save(); print(m1); break
    else:
        res['jobs'].append(job); res['stopped_because'] = 'job failed: ' + label; save(); print('STOP: %s failed (return code %s), see %s' % (label, rc, log)); break
    res['jobs'].append(job); save()

sky_bad = [j['label'] for j in res['jobs'] if j.get('sky_ok') is False]
res['sky_failed'] = sky_bad
res['verdict'] = 'PASSED' if (res['stopped_because'] == 'finished' and len(pics) == len(JOBS) and not sky_bad) else ('FAILED sky check: ' + ', '.join(sky_bad) if (sky_bad and res['stopped_because'] == 'finished') else 'FAILED')
save()
# one zip with the pictures and results.json (no logs: they name folders)
zp = os.path.join(a.out, 'HW11_sky_canary_result.zip')
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in pics: z.write(p, os.path.basename(p))
    z.write(os.path.join(a.out, 'results.json'), 'results.json')
print('VERDICT', res['verdict'], '| zip:', zp)
sys.exit(0 if res['verdict'] == 'PASSED' else (4 if sky_bad and res['stopped_because'] == 'finished' else 3))
