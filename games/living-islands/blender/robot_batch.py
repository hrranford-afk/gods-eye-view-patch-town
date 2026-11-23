#!/usr/bin/env python3
"""Batch driver for the robot recipes, in the manner of batch.py (python standard library only). For each seed it writes, inside --out only:
  recipes   (no Blender, instant)        robot_recipe_seedN.json from blender/robot_recipe.py
  models    (python3 + numpy, no Blender) robot_seedN_hero.glb and robot_seedN_live.glb through blender/robot_build.py (about 40 s for a hero, 5 s for a live, per robot; --jobs runs several at once)
  previews  (Blender)                     robot_seedN.png: a three-quarter view on sand rendered from the GLB (blender/robot_shots.py), checked by the picture guard (picture_guard.py)
  variety   (no Blender, run last)        blender/variety_judge.py on the robot_seed*.png of this batch -> variety.json, variety.txt
  sheet     (no Blender, optional)        robot_sheet.png: the first --sheet-n pictures with a label each (seed, role, quirks)
Default: 60 seeds (1 to 60), phases recipes,models,previews,variety. Fully deterministic: the same seeds give the same recipes, the same GLB bytes and (on the same renderer) the same pictures.
It does not delete anything, use the network, or touch anything outside --out. Stops at the first failure unless --keep-going, at the deadline, or after --max-minutes. results.json holds timings, sizes and SHA-256.
  python3 robot_batch.py --blender /path/to/blender --out OUTDIR [--seeds 1,2,3 | --count 60] [--device GPU --gpu-name Radeon --require-gpu] [--phases recipes,models]
--radical (default off) makes the same batch for the radical recipes (robot_recipe_for(seed, radical=True): the ear scout and the six new body plans, built by robot_radical.py, previews framed per plan); everything else is unchanged.
An order for hardware would run: python3 robot_batch.py --phases recipes,models (any python3 with numpy), then the same command with --phases previews,variety,sheet and --blender (it reuses the GLBs already in --out)."""
import argparse, hashlib, json, os, subprocess, sys, time, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import picture_guard as PG
import robot_recipe as RR

ap = argparse.ArgumentParser(description='Robot recipe batch: recipes, GLB models, preview pictures, variety.')
ap.add_argument('--blender', default='', help='path to blender (needed for the previews phase only)')
ap.add_argument('--out', required=True)
ap.add_argument('--seeds', default='', help='comma separated integers (default: 1 to --count)')
ap.add_argument('--count', type=int, default=60, help='number of seeds when --seeds is not given (default 60: seeds 1 to 60)')
ap.add_argument('--phases', default='recipes,models,previews,variety', help='comma list from: recipes,models,previews,variety,sheet')
ap.add_argument('--lods', default='hero,live', help='models phase: levels of detail to write (hero, live, far)')
ap.add_argument('--preview-lod', default='hero', choices=['hero', 'live', 'far'], help='which GLB the previews are rendered from')
ap.add_argument('--jobs', type=int, default=2, help='models phase: robots built at the same time')
ap.add_argument('--device', default='CPU', choices=['CPU', 'GPU'])
ap.add_argument('--gpu-name', default='', help='only use a GPU whose name contains this text (case-insensitive), e.g. Radeon')
ap.add_argument('--require-gpu', action='store_true', help='stop instead of falling back to the CPU, and check every job log shows the wanted GPU')
ap.add_argument('--list-devices', action='store_true', help='read-only: list the compute devices Blender can see, then exit')
ap.add_argument('--w', type=int, default=640); ap.add_argument('--h', type=int, default=420); ap.add_argument('--samples', type=int, default=24)
ap.add_argument('--radical', action='store_true', help='make the radical recipes (the ear scout and the six new plans: walker, pontoon, spotter, roller, snail, crab) instead of the committed family; default off')
ap.add_argument('--zoom', type=float, default=None, help='previews: camera distance factor (below 1 = further out; default 0.96, or with --radical a distance per plan: tall machines are framed further out); the same camera line for every robot, so the size differences are real (the bottle on the sand is for scale)')
ap.add_argument('--keep-going', action='store_true', help='a black or flat picture or a failed job is logged and the batch carries on (default: stop at the first failure)')
ap.add_argument('--deadline', default='', help='local time HH:MM; no new job starts after it')
ap.add_argument('--max-minutes', type=float, default=480)
ap.add_argument('--variety-thr', type=float, default=0.90, help='variety phase: similarity at or above which two pictures are look-alikes')
ap.add_argument('--sheet-n', type=int, default=12, help='sheet phase: how many pictures (the first seeds)')
a = ap.parse_args()

seeds = [int(x) for x in a.seeds.split(',') if x.strip()] if a.seeds else list(range(1, a.count + 1))
phases = [x.strip() for x in a.phases.split(',') if x.strip()]
os.makedirs(a.out, exist_ok=True)
t_start = time.time()
dl = None
if a.deadline:
    h, m = [int(x) for x in a.deadline.split(':')]
    now = datetime.datetime.now(); dl = now.replace(hour=h, minute=m, second=0, microsecond=0)
    if dl <= now: dl += datetime.timedelta(days=1)
env = dict(os.environ, LI_DEVICE=a.device, LI_GPU_NAME=a.gpu_name, LI_REQUIRE_GPU='1' if a.require_gpu else '')
if a.list_devices:
    sys.exit(subprocess.run([a.blender, '-b', '--python', os.path.join(HERE, 'list_devices.py')], env=env).returncode)


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


results = {'radical': a.radical, 'started': datetime.datetime.now().isoformat(timespec='seconds'), 'device_requested': a.device, 'seeds': seeds, 'phases': phases, 'jobs': [], 'stopped_because': 'finished'}
def save():
    with open(os.path.join(a.out, 'results.json'), 'w') as f: json.dump(results, f, indent=1)

def stop(reason):
    results['stopped_because'] = reason; save(); sys.exit(0 if reason in ('deadline', 'max-minutes') else 1)

def late():
    if dl and datetime.datetime.now() >= dl: stop('deadline')
    if (time.time() - t_start) / 60 > a.max_minutes: stop('max-minutes')

def file_info(paths):
    return {os.path.relpath(p, a.out): {'bytes': os.path.getsize(p), 'sha256': sha(p)} for p in paths if os.path.exists(p)}


# ------------------------------------------------------------------------------------------------- recipes
if 'recipes' in phases:
    for s in seeds:
        RR.write_recipe(RR.robot_recipe_for(s, radical=a.radical), os.path.join(a.out, 'robot_recipe_seed%d.json' % s))
    results['jobs'].append({'label': 'recipes', 'returncode': 0, 'seconds': 0, 'device': '', 'files': {'robot_recipe_seed%d.json' % s: {} for s in seeds}}); save()

# ------------------------------------------------------------------------------------------------- models: python3 + numpy, a few robots at a time
if 'models' in phases:
    lods = [x.strip() for x in a.lods.split(',') if x.strip()]; todo = list(seeds); running = []; done_fail = None
    def launch(s):
        log = os.path.join(a.out, 'models_seed%d.log' % s); lf = open(log, 'w')
        cmd = [sys.executable, os.path.join(HERE, 'robot_radical.py' if a.radical else 'robot_build.py'), '--seed', str(s), '--out', a.out, '--lods', ','.join(lods)]
        if os.name == 'posix' and os.path.exists('/usr/bin/nice'): cmd = ['/usr/bin/nice', '-n', '10'] + cmd
        return (s, time.time(), lf, subprocess.Popen(cmd, stdout=lf, stderr=subprocess.STDOUT))
    while todo or running:
        while todo and len(running) < max(1, a.jobs) and not done_fail:
            late(); running.append(launch(todo.pop(0)))
        time.sleep(0.5); still = []
        for (s, t0, lf, p) in running:
            rc = p.poll()
            if rc is None: still.append((s, t0, lf, p)); continue
            lf.close(); files = file_info([os.path.join(a.out, 'robot_seed%d_%s.glb' % (s, l)) for l in lods])
            r = {'label': 'models_seed%d' % s, 'returncode': rc, 'seconds': round(time.time() - t0, 1), 'device': '', 'files': files, 'picture_check': 'n/a'}
            results['jobs'].append(r); save()
            if rc != 0 or len(files) != len(lods):
                if a.keep_going: results.setdefault('failed_models', []).append(s); save()
                else: done_fail = 'failure in models_seed%d' % s
        running = still
        if done_fail and not running: stop(done_fail)

# ------------------------------------------------------------------------------------------------- previews: Blender, one picture per robot
def run_blender(label, args, outputs):
    cmd = [a.blender, '-b', '--python', os.path.join(HERE, 'robot_shots.py'), '--'] + args
    if os.name == 'posix' and os.path.exists('/usr/bin/nice'): cmd = ['/usr/bin/nice', '-n', '10'] + cmd
    t = time.time(); log = os.path.join(a.out, label + '.log')
    with open(log, 'w') as lf: rc = subprocess.run(cmd, stdout=lf, stderr=subprocess.STDOUT, env=env).returncode
    device_line = ''
    try:
        with open(log) as lf:
            for line in lf:
                if line.startswith(('LI_DEVICE_USED', 'LI_DEVICE_FALLBACK_CPU', 'LI_DEVICE_CPU')): device_line = line.strip()
    except OSError: pass
    bad = ''
    for o in outputs:       # ground truth: a file that exists is not a good picture (mean luminance, lit fraction, spread)
        if o.lower().endswith(('.png', '.jpg', '.jpeg')) and os.path.exists(o):
            ok, msg, st = PG.check_picture(o)
            if not ok:
                bad = msg; rc = rc or 4
                with open(log, 'a') as lf: lf.write('\n' + msg + '\n')
    return {'label': label, 'returncode': rc, 'seconds': round(time.time() - t, 1), 'device': device_line, 'files': file_info(outputs), 'picture_check': bad or 'ok'}

if 'previews' in phases:
    if not a.blender: print('previews need --blender'); stop('no blender given for the previews phase')
    empty = os.path.join(a.out, 'robot_empty.png')          # the same scene with no robot: the variety phase uses it to look at the robots alone
    if not os.path.exists(empty):
        late(); r = run_blender('robot_empty', ['--glb', 'none', '--out', empty, '--w', str(a.w), '--h', str(a.h), '--samples', str(a.samples), '--zoom', str(a.zoom if a.zoom is not None else 0.96)], [empty]); results['jobs'].append(r); save()
    for s in seeds:
        late()
        glb = os.path.join(a.out, 'robot_seed%d_%s.glb' % (s, a.preview_lod)); png = os.path.join(a.out, 'robot_seed%d.png' % s)
        if not os.path.exists(glb): stop('missing %s: run the models phase first' % os.path.basename(glb))
        zoom, tz = (a.zoom if a.zoom is not None else 0.96), 0.30
        if a.radical:
            import robot_radical as RAD
            vz, tz = RAD.preview_view(RR.robot_recipe_for(s, radical=True)); zoom = a.zoom if a.zoom is not None else vz
        r = run_blender('robot_seed%d' % s, ['--glb', glb, '--out', png, '--w', str(a.w), '--h', str(a.h), '--samples', str(a.samples), '--zoom', str(zoom), '--target-z', str(tz)], [png])
        results['jobs'].append(r); save()
        if a.require_gpu and a.device == 'GPU' and not (r['device'].startswith('LI_DEVICE_USED') and (not a.gpu_name or a.gpu_name.lower() in r['device'].lower())):
            stop('wrong device in robot_seed%d: %s' % (s, r['device'] or 'no device line in the log'))
        if r['returncode'] != 0 or not r['files']:
            if a.keep_going: results.setdefault('bad_pictures', []).append({'label': r['label'], 'message': r['picture_check']}); save(); continue
            stop('failure in ' + r['label'] + (': ' + r['picture_check'] if r['picture_check'] != 'ok' else ''))

# ------------------------------------------------------------------------------------------------- variety and sheet
if 'variety' in phases:
    vj = os.path.join(HERE, 'variety_judge.py'); vout = os.path.join(a.out, 'variety.txt')
    with open(vout, 'w') as vf:
        rc = subprocess.run([sys.executable, vj, a.out, '--glob', 'robot_seed*.png', '--thr', str(a.variety_thr), '--json', os.path.join(a.out, 'variety.json')], stdout=vf, stderr=subprocess.STDOUT).returncode
    results['jobs'].append({'label': 'variety', 'returncode': rc, 'seconds': 0, 'device': '', 'files': {'variety.txt': {}, 'variety.json': {}}}); save()
    # the pictures are mostly the same sand and sky, so the headline number is high for any set of robots. Second number: only the pixels that differ from the empty scene (robot and its shadow), the rest flat grey.
    empty = os.path.join(a.out, 'robot_empty.png')
    if os.path.exists(empty) and not a.radical:      # with --radical every plan has its own framing, so the empty scene is not the same picture: this second number is skipped
        from PIL import Image
        import numpy as np
        bg = np.asarray(Image.open(empty).convert('RGB')).astype(int)
        for s_ in seeds:
            f = os.path.join(a.out, 'robot_seed%d.png' % s_)
            if not os.path.exists(f): continue
            im = np.asarray(Image.open(f).convert('RGB')).astype(int); diff = np.abs(im - bg).max(2) > 14
            out = np.where(diff[:, :, None], im, 128).astype(np.uint8); Image.fromarray(out).save(os.path.join(a.out, 'robot_only_seed%d.png' % s_))
        with open(os.path.join(a.out, 'variety_robot_only.txt'), 'w') as vf:
            subprocess.run([sys.executable, vj, a.out, '--glob', 'robot_only_seed*.png', '--thr', str(a.variety_thr), '--json', os.path.join(a.out, 'variety_robot_only.json')], stdout=vf, stderr=subprocess.STDOUT)
        results['jobs'].append({'label': 'variety_robot_only', 'returncode': 0, 'seconds': 0, 'device': '', 'files': {'variety_robot_only.txt': {}, 'variety_robot_only.json': {}}}); save()
if 'sheet' in phases:
    import robot_sheet as RS
    RS.sheet(a.out, seeds[:a.sheet_n], os.path.join(a.out, 'robot_sheet.png'))
    results['jobs'].append({'label': 'sheet', 'returncode': 0, 'seconds': 0, 'device': '', 'files': {'robot_sheet.png': {}}}); save()
results['finished'] = datetime.datetime.now().isoformat(timespec='seconds')
results['total_minutes'] = round((time.time() - t_start) / 60, 1)
save()
