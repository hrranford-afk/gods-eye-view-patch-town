"""HW-12 shared pure-python helpers: scrubbing, statistics, timing loops, size planning, error-code names,
summary logic and report text. No OpenCL, no Blender, nothing outside the standard library here, so it can be unit-tested anywhere."""
import json
import math
import os
import re
import sys
import time

sys.dont_write_bytecode = True  # no __pycache__ in the package folder

MB = 1024 * 1024
GB = 1024 * MB
VRAM_CAP_BYTES = int(15.5 * GB)   # hard cap for any allocation probe (the card has 16 GB)
SECTION_CAP_S = 8.0               # hard cap for one measurement

# Radeon VII reference numbers, used only to flag results that look wrong (not to pass or fail anything).
THEORY = {'fp32_gflops': 13440.0, 'fp64_ratio': 4.0, 'hbm_gbs': 1024.0, 'vram_gb': 16.0, 'tb3_gbs_max': 4.0}

SCENE_ORDER = ['tri_1M', 'tri_5M', 'tri_20M', 'tex_4K_x4', 'tex_4K_x16', 'tex_8K_x4', 'tex_8K_x16', 'glass_volume']

# exit codes shared by the scripts
EXIT_OK, EXIT_FAILED_STEP, EXIT_STOP, EXIT_SOME_FAILED, EXIT_NO_OPENCL = 0, 1, 2, 3, 5


# ---------------------------------------------------------------- scrubbing
def scrub(text, extra=()):
    """Hide home folders, user names and other identifying text in a string. Safe to call on any text."""
    if text is None:
        return text
    t = str(text)
    names = set(extra)
    for k in ('USER', 'LOGNAME', 'USERNAME'):
        if os.environ.get(k):
            names.add(os.environ[k])
    home = os.path.expanduser('~')
    if home and home not in ('/', '~'):
        t = t.replace(home, '~')
    t = re.sub(r'/Users/[^/\s\'"]+', '/Users/USER', t)
    t = re.sub(r'/home/[^/\s\'"]+', '/home/USER', t)
    t = re.sub(r'C:\\Users\\[^\\\s]+', r'C:\\Users\\USER', t)
    t = re.sub(r'/private/var/folders/\S+', '/private/var/folders/TMP', t)
    t = re.sub(r'\b[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\b', '<uuid>', t)
    t = re.sub(r'(?i)(serial number[^:\n]*:\s*)\S+', r'\1<hidden>', t)
    t = re.sub(r'(?i)("?IOPlatform(?:SerialNumber|UUID)"?\s*=\s*)"[^"]*"', r'\1"<hidden>"', t)
    t = re.sub(r'(?i)(hardware uuid:\s*)\S+', r'\1<hidden>', t)
    t = re.sub(r'(?i)(provisioning udid:\s*)\S+', r'\1<hidden>', t)
    t = re.sub(r'\b(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}\b', '<mac>', t)
    for n in sorted(names, key=len, reverse=True):
        if len(n) >= 3:
            t = re.sub(r'(?<![A-Za-z0-9])' + re.escape(n) + r'(?![A-Za-z0-9])', 'USER', t)
    return t


def scrub_obj(o, extra=()):
    if isinstance(o, str):
        return scrub(o, extra)
    if isinstance(o, dict):
        return {k: scrub_obj(v, extra) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [scrub_obj(v, extra) for v in o]
    return o


# ---------------------------------------------------------------- statistics and timing
def median(vals):
    v = sorted(vals)
    if not v:
        return float('nan')
    m = len(v) // 2
    return v[m] if len(v) % 2 else 0.5 * (v[m - 1] + v[m])


def measure(fn, runs=5, warm=1, cap_s=SECTION_CAP_S, clock=time.perf_counter):
    """Call fn() (returns a duration, any unit) with warm-up, up to `runs` timed calls, stopping when the wall-clock cap is hit.
    Returns {'median','min','max','runs','capped'}. At least one timed run is always made."""
    t0 = clock()
    for _ in range(warm):
        fn()
    vals, capped = [], False
    for _ in range(runs):
        if vals and clock() - t0 > cap_s:
            capped = True
            break
        vals.append(fn())
    return {'median': median(vals), 'min': min(vals), 'max': max(vals), 'runs': len(vals), 'capped': capped}


def autotune(run, start, target=40e6, max_n=1 << 24):
    """Grow n until run(n) (returns ns) reaches `target` ns, so each timed kernel is long enough to time but short enough to be safe.
    Returns (n, ns)."""
    n = max(1, int(start))
    while True:
        t = run(n)
        if t >= target or n >= max_n:
            return n, t
        scale = 2.0 if t <= 0 else min(16.0, max(2.0, 1.2 * target / t))
        n = min(max_n, int(n * scale))


def rel_err(a, b):
    """max |a-b| / max |b|, for two sequences of numbers (or numpy arrays)."""
    try:
        import numpy as np
        a = np.asarray(a, dtype=np.float64)
        b = np.asarray(b, dtype=np.float64)
        den = float(np.max(np.abs(b))) or 1.0
        return float(np.max(np.abs(a - b))) / den
    except ImportError:
        den = max((abs(x) for x in b), default=1.0) or 1.0
        return max((abs(x - y) for x, y in zip(a, b)), default=0.0) / den


def detect_spill(times, factor=3.0, warm=6):
    """Index of the first fill time that is `factor` times slower than the median of the first `warm`, or None. Used to spot
    allocations that are being served from host memory instead of VRAM."""
    if len(times) <= warm:
        return None
    base = median(times[:warm])
    if base <= 0:
        return None
    for i in range(warm, len(times)):
        if times[i] > factor * base:
            return i
    return None


# ---------------------------------------------------------------- size planning
def plan_bandwidth_sizes(max_alloc, global_mem, smoke=False, need_buffers=2):
    """Buffer sizes in bytes for the bandwidth tests: 256 MB doubling up to 4 GB, never above max single allocation, never so that
    need_buffers copies exceed 15.5 GB or 90 percent of global memory. Smoke mode: 1 MB and 4 MB."""
    if smoke:
        return [s for s in (1 * MB, 4 * MB) if s <= max_alloc]
    lim = min(max_alloc, 4 * GB, VRAM_CAP_BYTES // need_buffers, int(0.9 * global_mem) // need_buffers if global_mem else 4 * GB)
    out, s = [], 256 * MB
    while s <= lim:
        out.append(s)
        s *= 2
    return out


def plan_transfer_sizes(max_alloc, smoke=False):
    """1 MB to 1 GB in steps of 4x (1, 4, 16, 64, 256, 1024 MB), limited to the max single allocation. Smoke: 1, 4 MB."""
    if smoke:
        return [s for s in (1 * MB, 4 * MB) if s <= max_alloc]
    return [s for s in (1 * MB, 4 * MB, 16 * MB, 64 * MB, 256 * MB, 1024 * MB) if s <= max_alloc]


def plan_max_buffer_sizes(max_alloc, smoke=False):
    """Ascending single-buffer sizes to try: 256 MB .. 12 GB, the reported maximum, all under the 15.5 GB cap."""
    if smoke:
        return [1 * MB, 4 * MB]
    cands = {256 * MB, 512 * MB, 1 * GB, 2 * GB, 4 * GB, 8 * GB, 12 * GB, 15 * GB}
    if max_alloc:
        cands.add(int(max_alloc))
    return sorted(s for s in cands if s <= VRAM_CAP_BYTES)


def plan_vram_chunks(chunk=256 * MB, cap=VRAM_CAP_BYTES, smoke=False):
    """How many 256 MB chunks the VRAM probe may take at most (62 for the 15.5 GB cap; 4 x 1 MB in smoke mode)."""
    if smoke:
        return 1 * MB, 4
    return chunk, int(cap // chunk)


def plan_blender_limits(ram_bytes, requested_max_mtris=85.0, bytes_per_tri=500, ram_fraction=0.5):
    """Highest triangle count (in millions) the Blender steps may build, from host RAM: ram_fraction of RAM / bytes_per_tri.
    500 bytes per triangle is measured: Blender 4.2 on CPU Cycles used 5.3 GB peak for 10.5 million triangles."""
    if not ram_bytes:
        return float(requested_max_mtris)
    return min(float(requested_max_mtris), ram_bytes * ram_fraction / bytes_per_tri / 1e6)


# ---------------------------------------------------------------- Blender log parsing
_UNIT = {'K': 1 / 1024.0, 'M': 1.0, 'G': 1024.0, '': 1.0}


def parse_cycles_log(text):
    """Peak memory and trouble signs from a Blender -b log. Blender prints 'Mem:123.4M (Peak 234.5M)' for the host and
    'Mem:12.3M, Peak:23.4M' for the render device. Returns {'host_peak_mb','device_peak_mb','oom_lines','device_lines'} (None if absent)."""
    host = dev = None
    for m in re.finditer(r'\(Peak ([0-9.]+)([KMG]?)\)', text):
        v = float(m.group(1)) * _UNIT[m.group(2)]
        host = v if host is None else max(host, v)
    for m in re.finditer(r'Mem:[0-9.]+[KMG]?, Peak:([0-9.]+)([KMG]?)', text):
        v = float(m.group(1)) * _UNIT[m.group(2)]
        dev = v if dev is None else max(dev, v)
    oom = [l.strip()[:200] for l in text.splitlines() if re.search(r'(?i)out of (gpu |device |video )?memory|failed to allocate|cannot allocate', l)]
    devs = [l.strip()[:200] for l in text.splitlines() if l.startswith('HW12_DEVICE_USED') or l.startswith('HW12_DEVICE_NOT_FOUND')]
    return {'host_peak_mb': None if host is None else round(host, 1), 'device_peak_mb': None if dev is None else round(dev, 1),
            'oom_lines': oom[:5], 'device_lines': devs[:3]}


# ---------------------------------------------------------------- OpenCL error names
ERROR_NAMES = {
    0: 'CL_SUCCESS', -1: 'CL_DEVICE_NOT_FOUND', -2: 'CL_DEVICE_NOT_AVAILABLE', -3: 'CL_COMPILER_NOT_AVAILABLE',
    -4: 'CL_MEM_OBJECT_ALLOCATION_FAILURE', -5: 'CL_OUT_OF_RESOURCES', -6: 'CL_OUT_OF_HOST_MEMORY',
    -7: 'CL_PROFILING_INFO_NOT_AVAILABLE', -8: 'CL_MEM_COPY_OVERLAP', -9: 'CL_IMAGE_FORMAT_MISMATCH',
    -10: 'CL_IMAGE_FORMAT_NOT_SUPPORTED', -11: 'CL_BUILD_PROGRAM_FAILURE', -12: 'CL_MAP_FAILURE',
    -13: 'CL_MISALIGNED_SUB_BUFFER_OFFSET', -14: 'CL_EXEC_STATUS_ERROR_FOR_EVENTS_IN_WAIT_LIST',
    -15: 'CL_COMPILE_PROGRAM_FAILURE', -16: 'CL_LINKER_NOT_AVAILABLE', -17: 'CL_LINK_PROGRAM_FAILURE',
    -18: 'CL_DEVICE_PARTITION_FAILED', -19: 'CL_KERNEL_ARG_INFO_NOT_AVAILABLE',
    -30: 'CL_INVALID_VALUE', -31: 'CL_INVALID_DEVICE_TYPE', -32: 'CL_INVALID_PLATFORM', -33: 'CL_INVALID_DEVICE',
    -34: 'CL_INVALID_CONTEXT', -35: 'CL_INVALID_QUEUE_PROPERTIES', -36: 'CL_INVALID_COMMAND_QUEUE',
    -37: 'CL_INVALID_HOST_PTR', -38: 'CL_INVALID_MEM_OBJECT', -39: 'CL_INVALID_IMAGE_FORMAT_DESCRIPTOR',
    -40: 'CL_INVALID_IMAGE_SIZE', -41: 'CL_INVALID_SAMPLER', -42: 'CL_INVALID_BINARY', -43: 'CL_INVALID_BUILD_OPTIONS',
    -44: 'CL_INVALID_PROGRAM', -45: 'CL_INVALID_PROGRAM_EXECUTABLE', -46: 'CL_INVALID_KERNEL_NAME',
    -47: 'CL_INVALID_KERNEL_DEFINITION', -48: 'CL_INVALID_KERNEL', -49: 'CL_INVALID_ARG_INDEX',
    -50: 'CL_INVALID_ARG_VALUE', -51: 'CL_INVALID_ARG_SIZE', -52: 'CL_INVALID_KERNEL_ARGS',
    -53: 'CL_INVALID_WORK_DIMENSION', -54: 'CL_INVALID_WORK_GROUP_SIZE', -55: 'CL_INVALID_WORK_ITEM_SIZE',
    -56: 'CL_INVALID_GLOBAL_OFFSET', -57: 'CL_INVALID_EVENT_WAIT_LIST', -58: 'CL_INVALID_EVENT',
    -59: 'CL_INVALID_OPERATION', -60: 'CL_INVALID_GL_OBJECT', -61: 'CL_INVALID_BUFFER_SIZE',
    -62: 'CL_INVALID_MIP_LEVEL', -63: 'CL_INVALID_GLOBAL_WORK_SIZE', -64: 'CL_INVALID_PROPERTY',
    -65: 'CL_INVALID_IMAGE_DESCRIPTOR', -66: 'CL_INVALID_COMPILER_OPTIONS', -67: 'CL_INVALID_LINKER_OPTIONS',
    -68: 'CL_INVALID_DEVICE_PARTITION_COUNT',
}


def error_name(code):
    return ERROR_NAMES.get(int(code), 'CL_UNKNOWN_ERROR_%d' % int(code))


# ---------------------------------------------------------------- PCIe link decoding
def decode_pcie_link_status(value):
    """PCI Express Link Status register: bits 3:0 current speed code (1 = 2.5, 2 = 5, 3 = 8, 4 = 16, 5 = 32 GT/s), bits 9:4 negotiated width.
    Returns {'gts': float, 'width': int, 'gbs_raw': approximate one-way GB/s after encoding overhead}."""
    v = int(value)
    code, width = v & 0xF, (v >> 4) & 0x3F
    gts = {1: 2.5, 2: 5.0, 3: 8.0, 4: 16.0, 5: 32.0}.get(code)
    if gts is None or width == 0:
        return {'gts': None, 'width': width or None, 'gbs_raw': None}
    eff = 0.8 if gts <= 5.0 else 128.0 / 130.0
    return {'gts': gts, 'width': width, 'gbs_raw': round(gts * eff * width / 8.0, 2)}


# ---------------------------------------------------------------- summary logic
def _g(d, *path, default=None):
    for p in path:
        if isinstance(d, dict) and p in d:
            d = d[p]
        else:
            return default
    return d


def fmt(x, nd=1):
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return 'n/a'
    if isinstance(x, float):
        return ('%.' + str(nd) + 'f') % x
    return str(x)


def yes_no(c):
    return 'YES' if c else 'NO'


def build_summary(res):
    """From the combined results dict, build plain-language rows [(question, answer, detail)] and a list of flags (things that look wrong).
    Works with any missing part: a missing measurement gives 'not measured'."""
    rows, flags = [], []
    smoke = bool((res.get('meta') or {}).get('smoke'))      # tiny sizes on any machine: paper-number flags make no sense
    ocl = res.get('opencl') or {}
    sec = ocl.get('sections') or {}

    def ok(name):
        return isinstance(sec.get(name), dict) and sec[name].get('status') == 'PASSED'

    def sect(name):
        return sec[name] if ok(name) else {}

    dev = ocl.get('device') or {}
    if dev:
        rows.append(('Card as seen by OpenCL', '%s' % dev.get('name', '?'),
                     '%s compute units, %s MHz, %s GB, max single buffer %s GB' % (
                         dev.get('compute_units'), dev.get('clock_mhz'), fmt((dev.get('global_mem') or 0) / GB),
                         fmt((dev.get('max_alloc') or 0) / GB))))

    # FP32 and FP64
    f32 = sect('fma_f32').get('gflops')
    f64 = sect('fma_f64').get('gflops')
    if f32:
        rows.append(('Raw FP32 speed', '%s GFLOPS' % fmt(f32, 0), 'about %s percent of the card\'s 13.4 TFLOPS paper figure' % fmt(100 * f32 / THEORY['fp32_gflops'], 0)))
        if not smoke and f32 > THEORY['fp32_gflops'] * 1.1:
            flags.append('FP32 %.0f GFLOPS is above the card\'s paper maximum: timing or clock reading is suspect' % f32)
        if not smoke and f32 < THEORY['fp32_gflops'] * 0.3:
            flags.append('FP32 %.0f GFLOPS is under 30 percent of the paper figure: card may be throttled, shared with another job, or on a slow path' % f32)
    else:
        rows.append(('Raw FP32 speed', 'not measured', _g(sec, 'fma_f32', 'error', default='step failed or skipped')))
    if f32 and f64:
        r = f32 / f64
        rows.append(('FP64 vs FP32 raw', ('FP64 is %s times slower' % fmt(r, 1)) if r >= 1.05 else 'FP64 is about as fast as FP32', '%s GFLOPS in double precision' % fmt(f64, 0)))
        if not smoke and (r < 1.5 or r > 40):
            flags.append('FP64/FP32 ratio %.1f is outside what a Radeon VII should show (about 4)' % r)
    elif ok('fma_f64') is False:
        rows.append(('Raw FP64 speed', 'not supported or not measured', _g(sec, 'fma_f64', 'error', default='')))

    # hydrology precision question
    sw = sect('shallow_water')
    sw_rows = sw.get('rows') or []
    r32 = {r['n']: r for r in sw_rows if r.get('dtype') == 'fp32' and r.get('steps_per_s')}
    r64 = {r['n']: r for r in sw_rows if r.get('dtype') == 'fp64' and r.get('steps_per_s')}
    both = sorted(set(r32) & set(r64))
    if both:
        n = 2048 if 2048 in both else both[-1]
        slow = r32[n]['steps_per_s'] / r64[n]['steps_per_s']
        chk = sw.get('check') or {}
        e32 = chk.get('fp32_err_long')
        worth = slow <= 4.0 or (e32 is not None and e32 > 1e-3)
        rows.append(('FP64 for hydrology (water flow)', '%s: FP64 is %s times %s than FP32 on a %d x %d water grid' % (yes_no(worth), fmt(slow if slow >= 1 else 1 / slow, 1), 'slower' if slow >= 1 else 'faster', n, n),
                     'FP32 drift from the float64 truth after the long check run: %s (relative). Rule: worth it if FP64 costs 4x or less, or FP32 drifts above 0.001.' % (
                         ('%.2e' % e32) if e32 is not None else 'n/a')))
        if chk and chk.get('passed') is False:
            flags.append('shallow-water correctness check failed: ' + str(chk.get('why', '')))
    elif r32:
        rows.append(('FP64 for hydrology (water flow)', 'not measured', 'FP64 shallow-water not available on this card/driver'))

    # world grids
    for r in sorted(r32.values(), key=lambda r: r['n']):
        rows.append(('World grid %d x %d (water, FP32)' % (r['n'], r['n']), '%s steps per second' % fmt(r['steps_per_s'], 0),
                     '60 steps per second: %s; %s GB/s effective' % (yes_no(r['steps_per_s'] >= 60), fmt(r.get('eff_gbs'), 0))))
    for name, label in (('diffusion', 'Moisture/heat diffusion (5-point)'), ('flow_accum', 'River flow accumulation')):
        s = sect(name)
        for r in s.get('rows') or []:
            if r.get('passes_per_s') or r.get('steps_per_s'):
                v = r.get('steps_per_s') or r.get('passes_per_s')
                rows.append(('%s %d x %d' % (label, r['n'], r['n']), '%s %s per second' % (fmt(v, 0), 'steps' if name == 'diffusion' else 'passes'),
                             '%s GB/s effective' % fmt(r.get('eff_gbs'), 0)))
        if name == 'flow_accum' and s.get('check') and s['check'].get('passed') is False:
            flags.append('flow accumulation result differs from the numpy reference')
        if name == 'diffusion' and s.get('check') and s['check'].get('passed') is False:
            flags.append('diffusion result differs from the numpy reference')

    # agents
    ag = sect('agents')
    for r in ag.get('rows') or []:
        if r.get('steps_per_s'):
            rows.append(('Agents: %s' % format(r['n'], ',d'), '%s updates per second (each agent)' % fmt(r['steps_per_s'], 0),
                         'can run %s agents at 60 updates per second: %s (%s million agent-updates per second)' % (
                             format(r['n'], ',d'), yes_no(r['steps_per_s'] >= 60), fmt(r['n'] * r['steps_per_s'] / 1e6, 0))))
    if ag.get('check') and ag['check'].get('passed') is False:
        flags.append('agent update differs from the numpy reference')

    # memory
    mb = sect('mem_bw')
    best = mb.get('best') or {}
    if best:
        rows.append(('Video memory speed', 'copy %s GB/s, read %s GB/s, write %s GB/s' % (fmt(best.get('copy'), 0), fmt(best.get('read'), 0), fmt(best.get('write'), 0)),
                     'paper maximum is about 1024 GB/s'))
        for k in ('copy', 'read', 'write'):
            if not smoke and (best.get(k) or 0) > THEORY['hbm_gbs'] * 1.1:
                flags.append('memory %s %.0f GB/s is above the HBM2 paper maximum: result is probably cached or mis-timed' % (k, best[k]))
        if not smoke and 0 < (best.get('copy') or 0) < 0.3 * THEORY['hbm_gbs']:
            flags.append('memory copy %.0f GB/s is under 30 percent of paper: card may be throttled, shared, or run at a low memory clock' % best['copy'])
    lb = sect('local_bw').get('gbs')
    if lb:
        rows.append(('On-chip (local) memory', '%s GB/s' % fmt(lb, 0), 'with barriers; per whole card'))

    # link
    tr = sect('transfer')
    h2d, d2h = tr.get('h2d_best_gbs'), tr.get('d2h_best_gbs')
    if h2d:
        rows.append(('Link speed to the card (Thunderbolt)', 'to card %s GB/s, from card %s GB/s' % (fmt(h2d, 2), fmt(d2h, 2)),
                     'filling 16 GB of card memory takes about %s seconds; reading it all back about %s seconds' % (fmt(16.0 / h2d, 0), fmt(16.0 / d2h, 0) if d2h else 'n/a')))
        if not smoke and h2d > THEORY['tb3_gbs_max']:
            flags.append('host-to-card %.2f GB/s is above what Thunderbolt 3 can carry: the card may not be on the Thunderbolt link, or host memory is being cached' % h2d)
        if not smoke and h2d < 0.4:
            flags.append('host-to-card %.2f GB/s is very slow: the link may have trained at a low speed' % h2d)

    # launch latency
    la = sect('latency')
    if la.get('single_us') is not None:
        rows.append(('Kernel launch delay', '%s microseconds (one launch, waited for)' % fmt(la['single_us'], 0),
                     '%s microseconds each when 1000 are queued together' % fmt(la.get('batched_us'), 1)))

    # memory capacity
    vr = sect('vram')
    if vr:
        rows.append(('Video memory you can actually use', '%s GB' % fmt(vr.get('total_gb'), 2),
                     ('hit the 15.5 GB test cap without a failure' if vr.get('cap_reached') else 'allocation failed after that') +
                     ('; SPILL SUSPECTED at %s GB (fills slowed down: memory may be coming from host RAM)' % fmt(vr.get('spill_at_gb'), 1) if vr.get('spill_at_gb') is not None else '')))
        if vr.get('spill_at_gb') is not None:
            flags.append('VRAM probe slowed down at %.1f GB: the driver may be paging to host memory' % vr['spill_at_gb'])
        if vr.get('verify_bad'):
            flags.append('VRAM probe read back %d wrong values: memory errors' % vr['verify_bad'])
        if not smoke and (vr.get('total_gb') or 99) < 12.0:
            flags.append('only %.1f GB of video memory could be allocated: something else may be using the card' % vr['total_gb'])
    mxb = sect('max_buffer')
    if mxb:
        rows.append(('Biggest single buffer', '%s GB' % fmt(mxb.get('largest_ok_gb'), 2), 'driver says max is %s GB' % fmt(mxb.get('reported_max_gb'), 2)))

    # reduction and scan
    rd = sect('reduction')
    if rd:
        rows.append(('Sum of 64 million numbers', '%s ms' % fmt(rd.get('ms'), 2), '%s GB/s; float error %.1e; integer sum exact: %s' % (fmt(rd.get('gbs'), 0), rd.get('float_rel_err', float('nan')), rd.get('int_exact'))))
        if rd.get('int_exact') is False:
            flags.append('integer reduction was not exact: kernel or device is wrong')
    sc = sect('scan')
    for r in sc.get('rows') or []:
        rows.append(('Prefix sum of %s numbers' % format(r['n'], ',d'), '%s ms' % fmt(r.get('ms'), 2), '%s million numbers per second; exact: %s' % (fmt(r.get('mps'), 0), r.get('exact'))))
        if r.get('exact') is False:
            flags.append('prefix sum of %d numbers is not exact' % r['n'])

    # Blender
    bl = res.get('blender') or {}
    for name, b in sorted((bl.get('scenes') or {}).items(), key=lambda kv: (SCENE_ORDER.index(kv[0]) if kv[0] in SCENE_ORDER else 99, kv[0])):
        for rr in b.get('renders') or []:
            if rr.get('seconds') is not None:
                rows.append(('Cycles %s %s' % (name, rr.get('resolution', '')), '%s s' % fmt(rr['seconds'], 1),
                             '%s frames-worth of samples per second (%s samples per pixel); device %s; peak memory %s' % (fmt(rr.get('samples_per_s'), 2), rr.get('samples', '?'), rr.get('device', '?'), rr.get('peak_mem', 'n/a'))))
            if rr.get('device_ok') is False:
                flags.append('Blender %s did not run on the Radeon' % name)
            if rr.get('black'):
                flags.append('Blender %s %s came out black: probably out of memory' % (name, rr.get('resolution', '')))
        if b.get('status') == 'FAILED':
            rows.append(('Cycles %s' % name, 'FAILED', str(b.get('error', ''))[:160]))
    gr = bl.get('growth')
    if gr:
        rows.append(('Biggest triangle count that rendered', '%s million triangles' % fmt(gr.get('largest_ok_mtris'), 1), gr.get('stopped_because', '')))
    return rows, flags


def make_report_md(res):
    rows, flags = build_summary(res)
    L = ['# HW-12 Radeon VII benchmark report', '']
    meta = res.get('meta') or {}
    L.append('Generated %s. Mode: %s. Order HW-12 from CAIRN.' % (meta.get('finished', 'n/a'), 'SMOKE (tiny sizes)' if meta.get('smoke') else 'full'))
    L.append('')
    steps = res.get('steps') or []
    if steps:
        L += ['## Steps', '', '| Step | Status | Seconds | Note |', '|---|---|---|---|']
        for s in steps:
            L.append('| %s | %s | %s | %s |' % (s.get('name'), s.get('status'), fmt(s.get('seconds'), 0), str(s.get('error', '') or '')[:100].replace('|', '/').replace('\n', ' ')))
        L.append('')
    L += ['## What the numbers mean', '', '| Question | Answer | Detail |', '|---|---|---|']
    for q, a, d in rows:
        L.append('| %s | %s | %s |' % (q, str(a).replace('|', '/'), str(d).replace('|', '/')))
    L.append('')
    L += ['## Things that look wrong', '']
    L += ['- ' + f for f in flags] if flags else ['- nothing flagged']
    L.append('')
    inv = res.get('inventory') or {}
    if inv:
        L += ['## Machine', '', '- macOS: %s; host: %s; RAM: %s GB' % (_g(inv, 'host', 'macos', default='n/a'), _g(inv, 'host', 'model', default='n/a'), fmt((_g(inv, 'host', 'memsize', default=0) or 0) / GB, 0)),
              '- GPU lines: %s' % ('; '.join(_g(inv, 'gpu', 'names', default=[])) or 'n/a'),
              '- PCIe link (ioreg): %s' % (_g(inv, 'gpu', 'pcie_link_decoded', default='not exposed')),
              '- Thunderbolt lines: %s' % ('; '.join((_g(inv, 'thunderbolt', 'link_lines', default=[]) or [])[:4]) or 'not exposed'),
              '- OpenCL framework present: %s, loadable: %s' % (_g(inv, 'opencl', 'exists'), _g(inv, 'opencl', 'loadable')),
              '- Blender: %s' % (_g(inv, 'blender', 'version_line', default='not found')), '']
    return scrub('\n'.join(L)) + '\n'


def write_json(path, obj):
    with open(path, 'w') as f:
        json.dump(scrub_obj(obj), f, indent=1, sort_keys=True, default=str)
