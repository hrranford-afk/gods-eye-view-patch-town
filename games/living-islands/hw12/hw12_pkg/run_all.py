#!/usr/bin/env python3
"""HW-12 order runner. Runs the fixed steps in order (or one step), each in its own process with a time cap, records PASSED / FAILED /
BLOCKED with the exact error text, and builds results.json, REPORT.md and a send-back zip.
  python3 run_all.py --out OUT [--blender BLENDER] [--smoke] [--device GPU] [--gpu-name Radeon]      all steps in order
  python3 run_all.py --out OUT --step NAME [--blender BLENDER]                                         one step (what STEPLIST.txt does)
  python3 run_all.py --list                                                                            steps, caps and expected times
Exit codes: 0 all passed, 1 a step failed or was blocked (recorded; carry on with the next step), 2 STOP (disk floor, folder exists,
numpy or PIL missing, nothing was run). OUT must not exist yet; everything is written to OUT/hw12. --smoke uses tiny sizes (any machine).
Nothing is installed, downloaded, deleted or sent anywhere."""
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
import time
import zipfile

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import hw12_common as H  # noqa: E402

# name, kind, argument, cap seconds, expected seconds, what it does
STEPS = [
    ('init', 'init', None, 30, 2, 'make the new output folder, check the 30 GB disk floor, numpy and PIL'),
    ('inventory', 'inventory', None, 120, 15, 'read-only facts: GPU, Thunderbolt link, OS, OpenCL, Blender'),
    ('opencl_basic', 'opencl', 'basic', 420, 120, 'device info, launch latency, FP32/FP64/FP16/integer speed, memory bandwidth, local memory'),
    ('opencl_transfer', 'opencl', 'transfer', 240, 40, 'host to card and card to host speed, 1 MB to 1 GB (the Thunderbolt limit)'),
    ('opencl_sim', 'opencl', 'sim', 900, 300, 'world simulation: shallow water 512-4096 squared in FP32 and FP64, flow accumulation, diffusion, 100k/1M/4M agents'),
    ('opencl_parallel', 'opencl', 'parallel', 180, 30, 'reduction and prefix sum'),
    ('opencl_vram', 'opencl', 'vram', 300, 60, 'biggest single buffer and total allocatable video memory (stops at 15.5 GB)'),
    ('disk_check', 'disk', None, 30, 1, 'disk floor 30 GB again, before the Blender steps (STOP if under)'),
    ('blender_tri_1M', 'blender', 'tri_1M', 900, 150, 'Cycles on the Radeon: 1.3 million triangles, 1080p and 4K, 128 samples'),
    ('blender_tri_5M', 'blender', 'tri_5M', 1200, 300, 'Cycles: 5.2 million triangles'),
    ('blender_tri_20M', 'blender', 'tri_20M', 1800, 600, 'Cycles: 21 million triangles (skipped by the script if the Mac has too little RAM)'),
    ('blender_tex_4K_x4', 'blender', 'tex_4K_x4', 900, 150, 'Cycles: four 4K textures'),
    ('blender_tex_4K_x16', 'blender', 'tex_4K_x16', 1200, 300, 'Cycles: sixteen 4K textures'),
    ('blender_tex_8K_x4', 'blender', 'tex_8K_x4', 1200, 300, 'Cycles: four 8K textures'),
    ('blender_tex_8K_x16', 'blender', 'tex_8K_x16', 1800, 600, 'Cycles: sixteen 8K textures (about 4.3 GB of textures)'),
    ('blender_glass_volume', 'blender', 'glass_volume', 1200, 300, 'Cycles: glass spheres in a volume'),
    ('blender_growth', 'growth', None, 3000, 900, 'memory growth: more and more triangles until a render fails or the safety cap'),
    ('finalize', 'finalize', None, 60, 5, 'build results.json, REPORT.md and the send-back zip'),
]
STEP_BY_NAME = {s[0]: s for s in STEPS}
GROWTH_LEVELS = [(1, 10), (2, 10), (4, 10), (6, 10), (8, 10), (12, 10), (16, 10)]   # (spheres, subdivisions); 5.2 million triangles each sphere
GROWTH_SMOKE = [(1, 3), (2, 3)]


def tris_m(nsph, k):
    return nsph * 20 * 4 ** (k - 1) / 1e6


def steplist_lines():
    """The plain one-command-per-line list, in execution order, with {OUT} and {BLENDER} to be filled in."""
    out = []
    for name, kind, arg, cap, exp, _ in STEPS:
        extra = ' --blender {BLENDER}' if kind in ('blender', 'growth') else ''
        out.append('python3 run_all.py --out {OUT} --step %s%s' % (name, extra))
    return out


def list_text():
    rows = ['%-22s cap %5d s  expected about %4d s   %s' % (n, c, e, d) for n, _, _, c, e, d in STEPS]
    return '\n'.join(rows) + '\n\nTotal if every step runs to its expected time: about %d minutes. Caps in all: about %d minutes.\n' % (
        sum(s[4] for s in STEPS) // 60, sum(s[3] for s in STEPS) // 60)


def free_gb(path):
    p = path
    while p and not os.path.exists(p):
        p = os.path.dirname(p)
    return shutil.disk_usage(p or '.').free / 1e9


def ram_bytes(hwdir):
    try:
        with open(os.path.join(hwdir, 'inventory.json')) as f:
            v = json.load(f).get('host', {}).get('memsize')
        if v:
            return int(v)
    except Exception:
        pass
    try:
        return os.sysconf('SC_PAGE_SIZE') * os.sysconf('SC_PHYS_PAGES')
    except Exception:
        return 0


def load_json(path, default=None):
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return default


def tail(text, n=12):
    return H.scrub('\n'.join(text.strip().splitlines()[-n:]))


class Ctx:
    def __init__(self, a):
        self.a = a
        self.out = os.path.abspath(a.out)
        self.hw = os.path.join(self.out, 'hw12')
        self.logs = os.path.join(self.hw, 'logs')
        self.bl = os.path.join(self.hw, 'blender')
        self.py = a.python or sys.executable
        self.env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
        self.cap_limit = 180 if a.smoke else None

    def cap(self, cap):
        return min(cap, self.cap_limit) if self.cap_limit else cap

    def record(self, name, status, seconds, error='', **extra):
        path = os.path.join(self.hw, 'steps.json')
        steps = load_json(path, [])
        steps = [s for s in steps if s.get('name') != name]
        steps.append(dict(name=name, status=status, seconds=round(seconds, 1), error=H.scrub(error)[:1500] if error else '', **extra))
        order = {s[0]: i for i, s in enumerate(STEPS)}
        steps.sort(key=lambda s: order.get(s['name'], 99))
        H.write_json(path, steps)
        print('%-22s %-8s %7.1fs  %s' % (name, status, seconds, (error or '').splitlines()[0][:110] if error else ''), flush=True)

    def sub(self, name, argv, cap, nice=False):
        """Run argv with a time cap; log scrubbed to logs/<name>.log. Returns (rc, text, seconds, timed_out)."""
        os.makedirs(self.logs, exist_ok=True)
        if nice and os.path.exists('/usr/bin/nice'):
            argv = ['/usr/bin/nice', '-n', '10'] + argv
        t0 = time.time()
        timed_out = False
        try:
            p = subprocess.run(argv, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=self.cap(cap), env=self.env, cwd=HERE)
            rc, text = p.returncode, p.stdout.decode('utf-8', 'replace')
        except subprocess.TimeoutExpired as e:
            rc, timed_out = 124, True
            text = (e.stdout or b'').decode('utf-8', 'replace') + '\nTIMED OUT after %d seconds (cap), process killed' % self.cap(cap)
        except FileNotFoundError as e:
            rc, text = 127, 'cannot start: %s' % e
        sec = time.time() - t0
        with open(os.path.join(self.logs, name + '.log'), 'w') as f:
            f.write(H.scrub(text))
        return rc, text, sec, timed_out


# ---------------------------------------------------------------- the step kinds
def step_init(c):
    a = c.a
    if os.path.exists(c.out):
        print('STOP: %s already exists; give a new folder name' % a.out)
        return 2
    if free_gb(os.path.dirname(c.out) or '.') < a.min_free_gb and not a.smoke:
        print('STOP: only %.1f GB free, the floor is %.0f GB' % (free_gb(os.path.dirname(c.out) or '.'), a.min_free_gb))
        return 2
    try:
        import numpy  # noqa: F401
        import PIL  # noqa: F401
    except ImportError as e:
        print('STOP: Python needs numpy and PIL (nothing is installed by this script): %s' % e)
        return 2
    os.makedirs(c.hw)
    H.write_json(os.path.join(c.hw, 'meta.json'), {'started': time.strftime('%Y-%m-%dT%H:%M:%S'), 'smoke': a.smoke, 'device': a.device,
                                                    'gpu_name': a.gpu_name, 'min_free_gb': a.min_free_gb, 'python': sys.version.split()[0]})
    c.record('init', 'PASSED', 0.0)
    return 0


def need_folder(c):
    if not os.path.isdir(c.hw):
        print('BLOCKED: %s does not exist; run the init step first' % c.hw)
        return False
    return True


def step_inventory(c, name, cap):
    b = find_blender(c)
    argv = [c.py, os.path.join(HERE, 'gpu_inventory.py'), '--out', c.hw] + (['--blender', b] if b else [])
    rc, text, sec, to = c.sub(name, argv, cap)
    c.record(name, 'PASSED' if rc == 0 else 'FAILED', sec, '' if rc == 0 else tail(text))
    return 0 if rc == 0 else 1


def step_opencl(c, name, group, cap):
    argv = [c.py, os.path.join(HERE, 'opencl_bench.py'), '--out', c.hw, '--group', group] + (['--smoke'] if c.a.smoke else [])
    if c.a.device_match is not None:
        argv += ['--device-match', c.a.device_match]
    rc, text, sec, to = c.sub(name, argv, cap)
    data = load_json(os.path.join(c.hw, 'opencl_%s.json' % group), {})
    secs = data.get('sections', {})
    failed = {k: v.get('error') for k, v in secs.items() if v.get('status') == 'FAILED'}
    if rc == 0:
        st, err = 'PASSED', ''
    elif rc == H.EXIT_NO_OPENCL:
        st, err = 'BLOCKED', data.get('fatal') or tail(text)
    elif to:
        st, err = 'FAILED', 'timed out after %d s (cap); sections done so far: %s' % (c.cap(cap), ', '.join(secs) or 'none')
    else:
        st, err = 'FAILED', '; '.join('%s: %s' % (k, v) for k, v in failed.items()) or tail(text)
    c.record(name, st, sec, err, sections={k: v.get('status') for k, v in secs.items()})
    return 0 if st == 'PASSED' else 1


def step_disk(c, name):
    g = free_gb(c.out)
    if g < c.a.min_free_gb and not c.a.smoke:
        c.record(name, 'BLOCKED', 0.0, 'disk floor: only %.1f GB free, floor %.0f GB. STOP, nothing in the Blender steps was run' % (g, c.a.min_free_gb))
        return 2
    c.record(name, 'PASSED', 0.0, '', free_gb=round(g, 1))
    return 0


def blender_argv(c, scene, extra=()):
    a = c.a
    return [c.blender_path, '-b', '--python', os.path.join(HERE, 'blender_cycles_bench.py'), '--', '--scene', scene, '--out', c.bl,
            '--device', a.device, '--gpu-name', a.gpu_name, '--max-mtris', '%.1f' % c.max_mtris] + (['--smoke'] if a.smoke else []) + list(extra)


def find_blender(c):
    import gpu_inventory as GI
    b = GI.find_blender(c.a.blender)
    if b and os.path.exists(b):
        return os.path.abspath(b)
    if b and shutil.which(b):
        return shutil.which(b)
    return None


def prepare_blender(c):
    c.blender_path = find_blender(c)
    c.max_mtris = H.plan_blender_limits(ram_bytes(c.hw), c.a.max_mtris)
    os.makedirs(c.bl, exist_ok=True)


def attach_log(c, scene_json, log_text, device_gpu):
    d = load_json(scene_json)
    if d is None:
        return None
    info = H.parse_cycles_log(log_text)
    d['log'] = info
    peak = []
    if info['device_peak_mb'] is not None:
        peak.append('device %.0f MB' % info['device_peak_mb'])
    if info['host_peak_mb'] is not None:
        peak.append('host %.0f MB' % info['host_peak_mb'])
    for r in d.get('renders', []):
        r['peak_mem'] = ' / '.join(peak) + (' (whole run)' if peak else '') if peak else 'n/a'
        if device_gpu:
            r['device_ok'] = any('Radeon' in l or 'AMD' in l for l in info['device_lines'])
        else:
            r['device_ok'] = True
    if info['oom_lines']:
        d['oom_lines'] = info['oom_lines']
        if d.get('status') == 'PASSED':
            d['note'] = 'log mentions out of memory but the pictures were not black'
    H.write_json(scene_json, d)
    return d


def step_blender(c, name, scene, cap):
    prepare_blender(c)
    if not c.blender_path:
        c.record(name, 'BLOCKED', 0.0, 'Blender not found (give --blender PATH); nothing was run')
        return 1
    if free_gb(c.out) < c.a.min_free_gb and not c.a.smoke:
        c.record(name, 'BLOCKED', 0.0, 'disk floor: only %.1f GB free. STOP' % free_gb(c.out))
        return 2
    rc, text, sec, to = c.sub(name, blender_argv(c, scene), cap, nice=True)
    d = attach_log(c, os.path.join(c.bl, scene + '.json'), text, c.a.device == 'GPU')
    st = (d or {}).get('status')
    if rc == 0 and st == 'PASSED':
        c.record(name, 'PASSED', sec)
        return 0
    if rc == 0 and st == 'SKIPPED':
        c.record(name, 'BLOCKED', sec, d.get('error', 'skipped for safety'))
        return 1
    if rc == 4:
        c.record(name, 'BLOCKED', sec, 'the Radeon was not found by Blender (no CPU fallback is allowed): ' + ' | '.join((d or {}).get('log', {}).get('device_lines', []) or [tail(text, 4)]))
        return 1
    err = ('timed out after %d s (cap), Blender killed' % c.cap(cap)) if to else ((d or {}).get('error') or tail(text))
    c.record(name, 'FAILED', sec, err)
    return 1


def step_growth(c, name, cap):
    prepare_blender(c)
    if not c.blender_path:
        c.record(name, 'BLOCKED', 0.0, 'Blender not found (give --blender PATH); nothing was run')
        return 1
    levels = GROWTH_SMOKE if c.a.smoke else GROWTH_LEVELS
    t0 = time.time()
    res = {'levels': [], 'largest_ok_mtris': None, 'stopped_because': 'reached the end of the list', 'ram_limit_mtris': round(c.max_mtris, 1)}
    for nsph, k in levels:
        tm = tris_m(nsph, k)
        if tm > c.max_mtris:
            res['stopped_because'] = 'next step (%.1f million triangles) is above the memory safety limit of %.1f million for this machine' % (tm, c.max_mtris)
            break
        if free_gb(c.out) < c.a.min_free_gb and not c.a.smoke:
            res['stopped_because'] = 'disk floor'
            break
        if time.time() - t0 > c.cap(cap) - 60:
            res['stopped_because'] = 'time cap of the step'
            break
        sub_name = 'growth_%dx%d' % (nsph, k)
        rc, text, sec, to = c.sub(sub_name, blender_argv(c, 'growth', ['--nsph', str(nsph), '--k', str(k)]), 900, nice=True)
        d = attach_log(c, os.path.join(c.bl, sub_name + '.json'), text, c.a.device == 'GPU')
        ok = (rc == 0 and d and d.get('status') == 'PASSED')
        res['levels'].append({'spheres': nsph, 'subdivisions': k, 'mtris': round(tm, 2), 'ok': bool(ok), 'seconds': round(sec, 1),
                              'peak': (d or {}).get('renders', [{}])[0].get('peak_mem') if d and d.get('renders') else None,
                              'error': None if ok else ((d or {}).get('error') or tail(text, 6))})
        if not ok:
            res['stopped_because'] = 'render failed at %.1f million triangles: %s' % (tm, res['levels'][-1]['error'])
            break
        res['largest_ok_mtris'] = round(tm, 2)
    H.write_json(os.path.join(c.hw, 'growth.json'), res)
    ran = len(res['levels'])
    good = res['largest_ok_mtris'] is not None
    c.record(name, 'PASSED' if good else 'FAILED', time.time() - t0,
             '' if good else res['stopped_because'], largest_ok_mtris=res['largest_ok_mtris'], stopped_because=res['stopped_because'], levels_run=ran)
    return 0 if good else 1


def collect_results(c):
    hw = c.hw
    res = {'meta': dict(load_json(os.path.join(hw, 'meta.json'), {}), finished=time.strftime('%Y-%m-%dT%H:%M:%S'))}
    res['steps'] = load_json(os.path.join(hw, 'steps.json'), [])
    res['inventory'] = load_json(os.path.join(hw, 'inventory.json'), {})
    ocl = {'sections': {}}
    for p in sorted(glob.glob(os.path.join(hw, 'opencl_*.json'))):
        d = load_json(p, {})
        if d.get('device') and 'device' not in ocl:
            ocl['device'] = d['device']
        if d.get('fatal'):
            ocl.setdefault('fatal', []).append(d['fatal'])
        ocl['sections'].update(d.get('sections', {}))
        if d.get('devices_seen'):
            ocl['devices_seen'] = d['devices_seen']
    res['opencl'] = ocl
    scenes = {}
    for p in sorted(glob.glob(os.path.join(c.bl, '*.json'))):
        d = load_json(p, {})
        key = d.get('scene') or os.path.basename(p)[:-5]
        if key.startswith('growth_'):
            continue
        scenes[key] = d
    res['blender'] = {'scenes': scenes}
    g = load_json(os.path.join(hw, 'growth.json'))
    if g:
        res['blender']['growth'] = g
    return res


def draft_result_md(res):
    L = ['# HW12_RESULT (draft written by run_all.py; the hardware Claude edits and signs it)', '',
         'Status words: PASSED, FAILED, BLOCKED. Times are seconds.', '',
         '| Step | Status | Seconds | Exact error text |', '|---|---|---|---|']
    for s in res.get('steps', []):
        L.append('| %s | %s | %s | %s |' % (s['name'], s['status'], s.get('seconds'), (s.get('error') or '').replace('|', '/').replace('\n', ' // ')))
    L += ['', 'Disk: free GB at the disk check: %s (floor 30).' % next((s.get('free_gb') for s in res.get('steps', []) if s['name'] == 'disk_check'), 'n/a'), '',
          'NEEDS HARRY: (fill in; write "nothing" if none)', '']
    return H.scrub('\n'.join(L))


def step_finalize(c, name):
    t0 = time.time()
    res = collect_results(c)
    # the finalize step itself is passed if we get this far
    H.write_json(os.path.join(c.hw, 'results.json'), res)
    rows, flags = H.build_summary(res)
    res['summary'] = {'rows': rows, 'flags': flags}
    H.write_json(os.path.join(c.hw, 'results.json'), res)
    with open(os.path.join(c.hw, 'REPORT.md'), 'w') as f:
        f.write(H.make_report_md(res))
    with open(os.path.join(c.hw, 'HW12_RESULT_DRAFT.md'), 'w') as f:
        f.write(draft_result_md(res) + '\n')
    zp = os.path.join(c.hw, 'HW12_send_back.zip')
    with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
        for pat in ('results.json', 'REPORT.md', 'HW12_RESULT_DRAFT.md', 'inventory.json', 'steps.json', 'growth.json', 'opencl_*.json', 'meta.json',
                    'blender/*.json', 'blender/*.png', 'logs/*.log'):
            for p in sorted(glob.glob(os.path.join(c.hw, pat))):
                z.write(p, os.path.relpath(p, c.hw))
    c.record(name, 'PASSED', time.time() - t0, '', flags=len(flags))
    # refresh results with the finalize step recorded
    res = collect_results(c)
    res['summary'] = {'rows': rows, 'flags': flags}
    H.write_json(os.path.join(c.hw, 'results.json'), res)
    print('wrote %s, REPORT.md, HW12_RESULT_DRAFT.md and HW12_send_back.zip; %d flag(s)' % (os.path.join(c.hw, 'results.json'), len(flags)))
    return 0


def run_step(c, name):
    _, kind, arg, cap, exp, _ = STEP_BY_NAME[name]
    if kind == 'init':
        return step_init(c)
    if not need_folder(c):
        return 2
    if kind == 'inventory':
        return step_inventory(c, name, cap)
    if kind == 'opencl':
        return step_opencl(c, name, arg, cap)
    if kind == 'disk':
        return step_disk(c, name)
    if kind == 'blender':
        return step_blender(c, name, arg, cap)
    if kind == 'growth':
        return step_growth(c, name, cap)
    if kind == 'finalize':
        return step_finalize(c, name)
    raise SystemExit('unknown step kind ' + kind)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--out')
    ap.add_argument('--step', default=None, choices=[s[0] for s in STEPS])
    ap.add_argument('--blender', default=None)
    ap.add_argument('--smoke', action='store_true')
    ap.add_argument('--device', default='GPU', choices=['GPU', 'CPU'], help='CPU is for tests only; the order uses GPU')
    ap.add_argument('--gpu-name', default='Radeon')
    ap.add_argument('--device-match', default=None)
    ap.add_argument('--min-free-gb', type=float, default=30.0)
    ap.add_argument('--max-mtris', type=float, default=85.0, help='ceiling for triangle count in millions (also limited by RAM)')
    ap.add_argument('--python', default=None, help='python to run the sub-steps with (default: this one)')
    ap.add_argument('--list', action='store_true')
    ap.add_argument('--write-steplist', default=None)
    a = ap.parse_args(argv)
    if a.list:
        print(list_text())
        return 0
    if a.write_steplist:
        with open(a.write_steplist, 'w') as f:
            f.write('\n'.join(steplist_lines()) + '\n')
        return 0
    if not a.out:
        ap.error('--out is required')
    c = Ctx(a)
    if a.step:
        return run_step(c, a.step)
    worst = 0
    for name, *_ in STEPS:
        if name == 'finalize':
            break
        rc = run_step(c, name)
        if rc == 2:
            print('STOP at step %s' % name)
            if name != 'init' and os.path.isdir(c.hw):
                run_step(c, 'finalize')
            return 2
        worst = max(worst, rc)
    run_step(c, 'finalize')
    return worst


if __name__ == '__main__':
    sys.exit(main())
