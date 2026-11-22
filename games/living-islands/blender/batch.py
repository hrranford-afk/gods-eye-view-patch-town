#!/usr/bin/env python3
"""Overnight batch runner for Living Islands world variations. Python standard library only.
Runs, for each seed, a hero still and a baked land with Blender in the background, one job at a time, at low priority.
Stops at the first failure, when the deadline passes, or after --max-minutes. Writes results.json (timings, sizes, SHA-256).
It only writes inside --out. It does not delete anything, use the network, or touch anything else.
  python3 batch.py --blender /path/to/blender --seeds 1122,2001,2002 --out OUTDIR --deadline 07:00 --max-minutes 480 [--device CPU|GPU]
Night plan (--phases): jobs are queued in phases so that if the deadline arrives, the most useful work is already done:
  previews : for every seed, a hero still, a top-down plan view and a camp close-up (low cost)
  bakes    : for every seed, the baked land GLB
  hires    : a large, high-sample hero for the seeds in --hi-seeds (default: the first 6)
  rocks    : layered rock variations for seeds --rock-seeds (rock_asset.py)
Default --phases previews,bakes (the original behaviour was hero + bake per seed).
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
ap.add_argument('--phases', default='previews,bakes', help='comma list from: previews,bakes,hires,rocks')
ap.add_argument('--hi-seeds', default='', help='comma list for the hires phase (default: first 6 of --seeds)')
ap.add_argument('--hi-w', type=int, default=2400); ap.add_argument('--hi-h', type=int, default=1600); ap.add_argument('--hi-samples', type=int, default=256)
ap.add_argument('--rock-seeds', default='', help='comma list for the rocks phase')
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

def stop(reason):
    results['stopped_because'] = reason; save(); sys.exit(0 if reason in ('deadline', 'max-minutes') else 1)

def queue():
    phases = [x.strip() for x in a.phases.split(',') if x.strip()]
    hi = [int(x) for x in a.hi_seeds.split(',') if x.strip()] or seeds[:6]
    rocks = [int(x) for x in a.rock_seeds.split(',') if x.strip()]
    for ph in phases:
        if ph == 'previews':
            for s in seeds:
                png = os.path.join(a.out, 'hero_seed%d.png' % s)
                yield ('hero_seed%d' % s, 'hero_render.py', ['--seed', str(s), '--w', str(a.hero_w), '--h', str(a.hero_h), '--samples', str(a.hero_samples), '--grid', '257', '--out', png], [png])
                for v in ('top', 'close'):
                    png = os.path.join(a.out, '%s_seed%d.png' % (v, s))
                    yield ('%s_seed%d' % (v, s), 'hero_render.py', ['--seed', str(s), '--view', v, '--w', str(a.hero_w), '--h', str(a.hero_h), '--samples', str(a.hero_samples), '--grid', '257', '--out', png], [png])
        elif ph == 'bakes' and not a.no_bake:
            for s in seeds:
                d = os.path.join(a.out, 'bake_seed%d' % s)
                yield ('bake_seed%d' % s, 'bake_land.py', ['--seed', str(s), '--out', d, '--samples', str(a.bake_samples), '--tex', str(a.tex)], [os.path.join(d, 'island_land.glb'), os.path.join(d, 'bake_info.json')])
        elif ph == 'hires':
            for s in hi:
                png = os.path.join(a.out, 'hires_seed%d.png' % s)
                yield ('hires_seed%d' % s, 'hero_render.py', ['--seed', str(s), '--w', str(a.hi_w), '--h', str(a.hi_h), '--samples', str(a.hi_samples), '--grid', '257', '--out', png], [png])
        elif ph == 'rocks':
            for s in rocks:
                d = os.path.join(a.out, 'rock_seed%d' % s)
                yield ('rock_seed%d' % s, 'rock_asset.py', ['--seed', str(s), '--out', d, '--samples', '32'], [os.path.join(d, 'rock_01.glb')])

for label, script, args, outputs in queue():
    if dl and datetime.datetime.now() >= dl:
        stop('deadline')
    if (time.time() - t_start) / 60 > a.max_minutes:
        stop('max-minutes')
    r = run(label, script, args, outputs)
    results['jobs'].append(r); save()
    if r['returncode'] != 0 or not r['files']:
        stop('failure in ' + label)
results['finished'] = datetime.datetime.now().isoformat(timespec='seconds')
results['total_minutes'] = round((time.time() - t_start) / 60, 1)
save()
