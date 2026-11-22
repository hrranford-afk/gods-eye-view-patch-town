#!/usr/bin/env python3
"""Overnight batch runner for Living Islands world variations. Python standard library only.
Runs, for each seed, a hero still and a baked land with Blender in the background, one job at a time, at low priority.
Stops at the first failure, when the deadline passes, or after --max-minutes. Writes results.json (timings, sizes, SHA-256).
It only writes inside --out. It does not delete anything, use the network, or touch anything else.
  python3 batch.py --blender /path/to/blender --seeds 1122,2001,2002 --out OUTDIR --deadline 07:00 --max-minutes 480 [--device CPU|GPU]
"""
import argparse, hashlib, json, os, subprocess, sys, time, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('--blender', required=True)
ap.add_argument('--seeds', required=True, help='comma separated integers')
ap.add_argument('--out', required=True)
ap.add_argument('--deadline', default='', help='local time HH:MM; no new job starts after it')
ap.add_argument('--max-minutes', type=float, default=480)
ap.add_argument('--device', default='CPU', choices=['CPU', 'GPU'])
ap.add_argument('--hero-samples', type=int, default=100)
ap.add_argument('--bake-samples', type=int, default=32)
ap.add_argument('--hero-w', type=int, default=1200); ap.add_argument('--hero-h', type=int, default=800)
ap.add_argument('--tex', type=int, default=2048)
ap.add_argument('--no-bake', action='store_true')
a = ap.parse_args()

seeds = [int(x) for x in a.seeds.split(',') if x.strip()]
os.makedirs(a.out, exist_ok=True)
t_start = time.time()
dl = None
if a.deadline:
    h, m = [int(x) for x in a.deadline.split(':')]
    now = datetime.datetime.now()
    dl = now.replace(hour=h, minute=m, second=0, microsecond=0)
    if dl <= now:
        dl += datetime.timedelta(days=1)
env = dict(os.environ, LI_DEVICE=a.device)

def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()

def run(label, script, args, outputs):
    cmd = [a.blender, '-b', '--python', os.path.join(HERE, script), '--'] + args
    if os.name == 'posix' and os.path.exists('/usr/bin/nice'):
        cmd = ['/usr/bin/nice', '-n', '10'] + cmd
    t = time.time()
    log = os.path.join(a.out, label + '.log')
    with open(log, 'w') as lf:
        rc = subprocess.run(cmd, stdout=lf, stderr=subprocess.STDOUT, env=env).returncode
    sec = round(time.time() - t, 1)
    files = {}
    for o in outputs:
        if os.path.exists(o):
            files[os.path.relpath(o, a.out)] = {'bytes': os.path.getsize(o), 'sha256': sha(o)}
    return {'label': label, 'returncode': rc, 'seconds': sec, 'files': files}

results = {'started': datetime.datetime.now().isoformat(timespec='seconds'), 'device_requested': a.device, 'seeds': seeds, 'jobs': [], 'stopped_because': 'finished'}
def save():
    with open(os.path.join(a.out, 'results.json'), 'w') as f:
        json.dump(results, f, indent=1)

for s in seeds:
    for kind in ('hero', 'bake'):
        if kind == 'bake' and a.no_bake:
            continue
        if dl and datetime.datetime.now() >= dl:
            results['stopped_because'] = 'deadline'; save(); sys.exit(0)
        if (time.time() - t_start) / 60 > a.max_minutes:
            results['stopped_because'] = 'max-minutes'; save(); sys.exit(0)
        label = '%s_seed%d' % (kind, s)
        if kind == 'hero':
            png = os.path.join(a.out, 'hero_seed%d.png' % s)
            r = run(label, 'hero_render.py', ['--seed', str(s), '--w', str(a.hero_w), '--h', str(a.hero_h), '--samples', str(a.hero_samples), '--grid', '257', '--out', png], [png])
        else:
            d = os.path.join(a.out, 'bake_seed%d' % s)
            r = run(label, 'bake_land.py', ['--seed', str(s), '--out', d, '--samples', str(a.bake_samples), '--tex', str(a.tex)], [os.path.join(d, 'island_land.glb'), os.path.join(d, 'bake_info.json')])
        results['jobs'].append(r); save()
        if r['returncode'] != 0 or not r['files']:
            results['stopped_because'] = 'failure in ' + label; save(); sys.exit(1)
results['finished'] = datetime.datetime.now().isoformat(timespec='seconds')
results['total_minutes'] = round((time.time() - t_start) / 60, 1)
save()
