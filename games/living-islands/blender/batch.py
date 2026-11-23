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
  landform : for every seed, a hero of the best island of the land formation tool's world (landform_scene.py) for each province in --lf-provinces
             (and a wide view with --lf-wide); the seed is the tool's world seed here, not the legacy island seed
  recipes  : (no Blender) write recipe_seed<N>.json for every seed from blender/recipe.py: island type, rock, trees, what is there, time, weather, camera
  variety  : (no Blender, run last) blender/variety_judge.py on the hero_seed*.png of this batch -> variety.json and variety.txt (similarity of pictures, look-alike pairs, recipe spread)
Every picture job is checked after it runs (picture_guard.py: mean luminance, lit fraction, spread); a black or flat picture is a failed job (returncode 4, message in the log and results.json). --keep-going logs it and carries on.
The previews, hires and top/close views are built from each seed's recipe (hero_render.py); --legacy-scene gives the old camp picture on every seed instead (the HW-3 look).
Default --phases previews,bakes (the original behaviour was hero + bake per seed).
"""
import argparse, hashlib, json, os, subprocess, sys, time, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import picture_guard as PG
ap = argparse.ArgumentParser()
ap.add_argument('--blender', required=True)
ap.add_argument('--seeds', required=True, help='comma separated integers')
ap.add_argument('--out', required=True)
ap.add_argument('--deadline', default='', help='local time HH:MM; no new job starts after it')
ap.add_argument('--max-minutes', type=float, default=480)
ap.add_argument('--device', default='CPU', choices=['CPU', 'GPU'])
ap.add_argument('--lf-provinces', default='A', help='landform phase: comma list from A,B,C (gneiss, sandstone, basalt)')
ap.add_argument('--lf-samples', type=int, default=64); ap.add_argument('--lf-wide', action='store_true', help='landform phase: also a wide view of each world')
ap.add_argument('--keep-going', action='store_true', help='a black or flat picture fails its job and is logged, but the batch carries on with the next job (default: stop at the first failure)')
ap.add_argument('--hero-samples', type=int, default=100)
ap.add_argument('--bake-samples', type=int, default=32)
ap.add_argument('--hero-w', type=int, default=1200); ap.add_argument('--hero-h', type=int, default=800)
ap.add_argument('--tex', type=int, default=2048)
ap.add_argument('--no-bake', action='store_true')
ap.add_argument('--gpu-name', default='', help='only use a GPU whose name contains this text (case-insensitive), e.g. Radeon')
ap.add_argument('--require-gpu', action='store_true', help='stop instead of falling back to the CPU, and check every job log shows the wanted GPU')
ap.add_argument('--list-devices', action='store_true', help='read-only: list the compute devices Blender can see, then exit')
ap.add_argument('--phases', default='previews,bakes', help='comma list from: recipes,previews,bakes,hires,rocks,landform,variety (variety last)')
ap.add_argument('--menu', default='', help='hero phases and recipes: put a menu item (fish_hut, seabird_hut, playset_wreck, boat_house, any) in every recipe (default: none)')
ap.add_argument('--legacy-scene', action='store_true', help='hero phases: the old camp picture on every seed (no recipe variety), for comparison')
ap.add_argument('--variety-thr', type=float, default=0.90, help='variety phase: similarity at or above which two pictures are look-alikes')
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
env = dict(os.environ, LI_DEVICE=a.device, LI_GPU_NAME=a.gpu_name, LI_REQUIRE_GPU='1' if a.require_gpu else '')
if a.list_devices:
    rc = subprocess.run([a.blender, '-b', '--python', os.path.join(HERE, 'list_devices.py')], env=env).returncode
    sys.exit(rc)

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
    device_line = ''
    try:
        with open(log) as lf:
            for line in lf:
                if line.startswith('LI_DEVICE_USED') or line.startswith('LI_DEVICE_FALLBACK_CPU') or line.startswith('LI_DEVICE_CPU'):
                    device_line = line.strip()
    except OSError:
        pass
    files = {}
    for o in outputs:
        if os.path.exists(o):
            files[os.path.relpath(o, a.out)] = {'bytes': os.path.getsize(o), 'sha256': sha(o)}
    # ground truth: a file that exists is not a good picture. Every png/jpg output is checked (mean luminance, lit fraction, spread); black or flat = failed job
    bad_pic = ''
    for o in outputs:
        if o.lower().endswith(('.png', '.jpg', '.jpeg')) and os.path.exists(o):
            ok, msg, st = PG.check_picture(o)
            if not ok:
                bad_pic = msg; rc = rc or 4
                with open(log, 'a') as lf:
                    lf.write('\n' + msg + '\n')
    return {'label': label, 'returncode': rc, 'seconds': sec, 'device': device_line, 'files': files, 'picture_check': bad_pic or 'ok'}

results = {'started': datetime.datetime.now().isoformat(timespec='seconds'), 'device_requested': a.device, 'seeds': seeds, 'jobs': [], 'stopped_because': 'finished'}
def save():
    with open(os.path.join(a.out, 'results.json'), 'w') as f:
        json.dump(results, f, indent=1)

def stop(reason):
    results['stopped_because'] = reason; save(); sys.exit(0 if reason in ('deadline', 'max-minutes') else 1)

LEG = (['--legacy'] if a.legacy_scene else []) + (['--menu', a.menu] if a.menu else [])

def queue():
    phases = [x.strip() for x in a.phases.split(',') if x.strip()]
    hi = [int(x) for x in a.hi_seeds.split(',') if x.strip()] or seeds[:6]
    rocks = [int(x) for x in a.rock_seeds.split(',') if x.strip()]
    for ph in phases:
        if ph == 'previews':
            for s in seeds:
                png = os.path.join(a.out, 'hero_seed%d.png' % s)
                yield ('hero_seed%d' % s, 'hero_render.py', ['--seed', str(s), '--w', str(a.hero_w), '--h', str(a.hero_h), '--samples', str(a.hero_samples), '--grid', '257', '--out', png] + LEG, [png])
                for v in ('top', 'close'):
                    png = os.path.join(a.out, '%s_seed%d.png' % (v, s))
                    yield ('%s_seed%d' % (v, s), 'hero_render.py', ['--seed', str(s), '--view', v, '--w', str(a.hero_w), '--h', str(a.hero_h), '--samples', str(a.hero_samples), '--grid', '257', '--out', png] + LEG, [png])
        elif ph == 'bakes' and not a.no_bake:
            for s in seeds:
                d = os.path.join(a.out, 'bake_seed%d' % s)
                yield ('bake_seed%d' % s, 'bake_land.py', ['--seed', str(s), '--out', d, '--samples', str(a.bake_samples), '--tex', str(a.tex)], [os.path.join(d, 'island_land.glb'), os.path.join(d, 'bake_info.json')])
        elif ph == 'hires':
            for s in hi:
                png = os.path.join(a.out, 'hires_seed%d.png' % s)
                yield ('hires_seed%d' % s, 'hero_render.py', ['--seed', str(s), '--w', str(a.hi_w), '--h', str(a.hi_h), '--samples', str(a.hi_samples), '--grid', '257', '--out', png] + LEG, [png])
        elif ph == 'landform':
            for s in seeds:
                for pv in [x.strip().upper() for x in a.lf_provinces.split(',') if x.strip()]:
                    for view in (['hero', 'wide'] if a.lf_wide else ['hero']):
                        png = os.path.join(a.out, 'landform_%s_%s_seed%d.png' % (view, pv, s))
                        yield ('landform_%s_%s_seed%d' % (view, pv, s), 'landform_scene.py', ['--province', pv, '--seed', str(s), '--view', view, '--w', str(a.hero_w), '--h', str(a.hero_h), '--samples', str(a.lf_samples), '--out', png], [png])
        elif ph == 'rocks':
            for s in rocks:
                d = os.path.join(a.out, 'rock_seed%d' % s)
                yield ('rock_seed%d' % s, 'rock_asset.py', ['--seed', str(s), '--out', d, '--samples', '32'], [os.path.join(d, 'rock_01.glb')])

if 'recipes' in a.phases.split(','):
    sys.path.insert(0, HERE)
    import recipe as RC
    for s_ in seeds:
        RC.write_recipe(RC.recipe_for(s_, legacy_scene=a.legacy_scene, menu=(a.menu or None)), os.path.join(a.out, 'recipe_seed%d.json' % s_))
    results['jobs'].append({'label': 'recipes', 'returncode': 0, 'seconds': 0, 'device': '', 'files': {'recipe_seed%d.json' % s_: {} for s_ in seeds}}); save()

for label, script, args, outputs in queue():
    if dl and datetime.datetime.now() >= dl:
        stop('deadline')
    if (time.time() - t_start) / 60 > a.max_minutes:
        stop('max-minutes')
    r = run(label, script, args, outputs)
    results['jobs'].append(r); save()
    if a.require_gpu and a.device == 'GPU' and not (r['device'].startswith('LI_DEVICE_USED') and (not a.gpu_name or a.gpu_name.lower() in r['device'].lower())):
        stop('wrong device in ' + label + ': ' + (r['device'] or 'no device line in the log'))
    if r['returncode'] != 0 or not r['files']:
        if a.keep_going and r.get('picture_check', 'ok') != 'ok':
            results.setdefault('bad_pictures', []).append({'label': label, 'message': r['picture_check']}); save(); continue
        stop('failure in ' + label + (': ' + r['picture_check'] if r.get('picture_check', 'ok') != 'ok' else ''))
if 'variety' in a.phases.split(','):
    vj = os.path.join(HERE, 'variety_judge.py'); vout = os.path.join(a.out, 'variety.txt')
    with open(vout, 'w') as vf:
        rc = subprocess.run([sys.executable, vj, a.out, '--glob', 'hero_seed*.png', '--thr', str(a.variety_thr), '--json', os.path.join(a.out, 'variety.json')], stdout=vf, stderr=subprocess.STDOUT).returncode
    results['jobs'].append({'label': 'variety', 'returncode': rc, 'seconds': 0, 'device': '', 'files': {'variety.txt': {}, 'variety.json': {}}}); save()
results['finished'] = datetime.datetime.now().isoformat(timespec='seconds')
results['total_minutes'] = round((time.time() - t_start) / 60, 1)
save()
