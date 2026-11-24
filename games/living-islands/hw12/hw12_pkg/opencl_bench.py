#!/usr/bin/env python3
"""HW-12 OpenCL benchmark of the Radeon VII, using only ctypes against the system OpenCL framework (no pyopencl, nothing installed).
  python3 opencl_bench.py --out DIR [--group basic|transfer|sim|parallel|vram|all] [--smoke] [--device-match Radeon]
Writes DIR/opencl_<group>.json. Exit 0 = every section passed or was honestly unsupported; 3 = a section failed (others still ran);
5 = the OpenCL framework could not be loaded or no matching device was found (nothing was run). Never crashes on an OpenCL error:
the exact error text goes into the JSON. Needs python3 + numpy. Writes only inside --out."""
import argparse
import ctypes as C
import json
import os
import struct
import sys
import time
import traceback

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import hw12_common as H          # noqa: E402
import opencl_ctypes as OC       # noqa: E402
import opencl_kernels as K       # noqa: E402

try:
    import numpy as np
    import sim_refs as R
except ImportError as e:         # numpy is part of the Mac's setup; fail clearly if not
    np = None
    R = None
    NUMPY_ERR = str(e)

GBS = 1e9  # bandwidth numbers are decimal GB per second


def f(x, nd=3):
    return None if x is None else round(float(x), nd)


class Bench:
    def __init__(self, cl, dev, smoke):
        self.cl, self.dev, self.smoke = cl, dev, smoke
        self.progs = {}
        self.kern = {}
        self.deadline = None
        self.truncated = False

    # ----- program and kernel cache
    def prog(self, key, source, options=''):
        k = (key, options)
        if k not in self.progs:
            self.progs[k] = self.cl.build(source, options, name=key)
        return self.progs[k]

    def kernel(self, prog_key, source, name, options=''):
        k = (prog_key, options, name)
        if k not in self.kern:
            self.kern[k] = self.prog(prog_key, source, options).kernel(name)
        return self.kern[k]

    # ----- time budget per section
    def start_section(self, seconds):
        self.deadline = time.perf_counter() + seconds
        self.truncated = False

    def out_of_time(self):
        if self.deadline is not None and time.perf_counter() > self.deadline:
            self.truncated = True
            return True
        return False

    # ----- sizes
    def wg(self, want=256):
        w = self.dev['max_wg']
        return want if w >= want else max(1, 1 << (w.bit_length() - 1))

    def round_up(self, n, m):
        return ((int(n) + m - 1) // m) * m

    def tile2d(self):
        w = self.dev['max_wg']
        if w >= 256:
            return (16, 16)
        if w >= 64:
            return (8, 8)
        return (1, 1)

    def global_threads(self, mult=2560, lo=65536):
        return self.round_up(max(lo, self.dev['compute_units'] * mult), self.wg())

    # ----- buffers
    def upload(self, arr):
        arr = np.ascontiguousarray(arr)
        b = self.cl.buffer(arr.nbytes)
        self.cl.write(b, arr.ctypes.data, arr.nbytes)
        return b

    def download(self, buf, shape, dtype):
        out = np.empty(shape, dtype=dtype)
        self.cl.read(buf, out.ctypes.data, out.nbytes)
        return out

    # ----- kernel timing
    def run_ns(self, kernel, gs, ls, args):
        ev = self.cl.run(kernel, gs, ls, args, event=True)
        self.cl.finish()
        ns = ev.ns()
        ev.release()
        return ns

    def batch_s(self, enqueue, count):
        """Enqueue `count` kernels via enqueue(i, want_event); return (device seconds, wall seconds). Events only on the first and last."""
        t0 = time.perf_counter()
        first = enqueue(0, True)
        last = first
        for i in range(1, count):
            ev = enqueue(i, i == count - 1)
            if ev is not None:
                last = ev
        self.cl.finish()
        wall = time.perf_counter() - t0
        a = first.times()[2]
        b = last.times()[3]
        first.release()
        if last is not first:
            last.release()
        dev_s = (b - a) * 1e-9
        if dev_s <= 0 or dev_s > wall * 1.5:
            dev_s = wall
        return dev_s, wall


# ================================================================ sections
def sec_info(B):
    return {'status': 'PASSED', 'device': B.dev, 'queue_api': B.cl.queue_api, 'library': getattr(B.cl.lib, '_hw12_path', ''),
            'missing_functions': getattr(B.cl.lib, '_hw12_missing', [])}


def fma_expected(gid, iters, a, b):
    """Closed form of the 8 fma chains for one work item (float64): x_n = a^n x0 + b (1 - a^n) / (1 - a), summed over the 8 chains."""
    x0 = gid * 1e-7 + 0.1
    an = a ** iters
    return sum(an * (x0 + d) + b * (1.0 - an) / (1.0 - a) for d in (0, .1, .2, .3, .4, .5, .6, .7))


def _fma_bench(B, kernel, outbytes, args_fn, flops_per_iter, check=None, name=''):
    gs = B.global_threads()
    out = B.cl.buffer(gs * outbytes)
    ls = (B.wg(),)

    def run(iters):
        return B.run_ns(kernel, (gs,), ls, [out] + args_fn(iters))
    run(8)  # warm-up / first launch
    iters, ns = H.autotune(run, 64, target=40e6, max_n=1 << 20)
    m = H.measure(lambda: run(iters), runs=7, warm=1)
    gflops = gs * iters * flops_per_iter / m['median']          # flops per ns = GFLOPS
    res = {'status': 'PASSED', 'threads': gs, 'iters': iters, 'median_ms': f(m['median'] / 1e6, 3), 'runs': m['runs'],
           'gflops': f(gflops, 1), 'spread': f((m['max'] - m['min']) / m['median'], 3)}
    if check:
        res['check'] = check(out, gs, iters)
    B.cl.free(out)
    return res


def sec_fma_f32(B):
    k = B.kernel('arith', K.ARITH, 'fma_f32')
    a, b = 0.9995, 0.0005

    def chk(out, gs, iters):
        got = B.download(out, (gs,), np.float32)
        ids = [0, gs // 2, gs - 1]
        errs = [abs(float(got[i]) - fma_expected(i, iters, a, b)) / max(1e-9, abs(fma_expected(i, iters, a, b))) for i in ids]
        return {'max_rel_err': f(max(errs), 8), 'passed': bool(max(errs) < 1e-3 and np.all(np.isfinite(got)))}
    r = _fma_bench(B, k, 4, lambda it: [OC.arg_i(it), OC.arg_f(a), OC.arg_f(b)], 16, chk)
    if not r['check']['passed']:
        r['status'] = 'FAILED'
        r['error'] = 'FP32 FMA result does not match the closed form: %s' % r['check']
    return r


def sec_fma_f64(B):
    if not B.dev['fp64']:
        return {'status': 'UNSUPPORTED', 'error': 'device does not list cl_khr_fp64'}
    k = B.kernel('arith64', K.ARITH, 'fma_f64', '-D USE_FP64')
    a, b = 0.9995, 0.0005

    def chk(out, gs, iters):
        got = B.download(out, (gs,), np.float64)
        ids = [0, gs // 2, gs - 1]
        errs = [abs(float(got[i]) - fma_expected(i, iters, a, b)) / max(1e-9, abs(fma_expected(i, iters, a, b))) for i in ids]
        return {'max_rel_err': f(max(errs), 14), 'passed': bool(max(errs) < 1e-9 and np.all(np.isfinite(got)))}
    r = _fma_bench(B, k, 8, lambda it: [OC.arg_i(it), OC.arg_d(a), OC.arg_d(b)], 16, chk)
    if not r['check']['passed']:
        r['status'] = 'FAILED'
        r['error'] = 'FP64 FMA result does not match the closed form: %s' % r['check']
    return r


def sec_fma_f16(B):
    if not B.dev['fp16']:
        return {'status': 'UNSUPPORTED', 'error': 'device does not list cl_khr_fp16 (normal on macOS)'}
    k = B.kernel('arith16', K.ARITH, 'fma_f16', '-D USE_FP16')

    def chk(out, gs, iters):
        got = B.download(out, (gs,), np.float32)
        return {'finite': bool(np.all(np.isfinite(got))), 'passed': bool(np.all(np.isfinite(got)))}
    return _fma_bench(B, k, 4, lambda it: [OC.arg_i(it), OC.arg_f(0.9995), OC.arg_f(0.0005)], 32, chk)


def sec_int_ops(B):
    k = B.kernel('arith', K.ARITH, 'int_ops')
    r = _fma_bench(B, k, 4, lambda it: [OC.arg_i(it), OC.arg_u(1664525), OC.arg_u(1013904223)], 32)
    r['giops'] = r.pop('gflops')
    r['note'] = 'multiply, add, shift, xor counted as 4 operations per chain pass'
    return r


def sec_latency(B):
    k = B.kernel('arith', K.ARITH, 'nop')
    buf = B.cl.buffer(256)
    cl = B.cl
    n1, n2 = (30, 200) if B.smoke else (200, 2000)
    cl.run(k, (1,), None, [buf])
    cl.finish()
    singles, queued = [], []
    for _ in range(n1):
        t = time.perf_counter()
        ev = cl.run(k, (1,), None, [buf], event=True)
        cl.finish()
        singles.append((time.perf_counter() - t) * 1e6)
        tm = ev.times()
        queued.append((tm[2] - tm[0]) / 1e3)
        ev.release()
    t = time.perf_counter()
    for _ in range(n2):
        cl.run(k, (1,), None, [buf])
    cl.finish()
    batched = (time.perf_counter() - t) / n2 * 1e6
    cl.free(buf)
    return {'status': 'PASSED', 'single_us': f(H.median(singles), 1), 'single_us_min': f(min(singles), 1), 'batched_us': f(batched, 2),
            'queued_to_start_us': f(H.median(queued), 1), 'launches_single': n1, 'launches_batched': n2}


def sec_mem_bw(B):
    sizes = H.plan_bandwidth_sizes(B.dev['max_alloc'], B.dev['global_mem'], B.smoke)
    kc = B.kernel('mem', K.MEM, 'mem_copy')
    kr = B.kernel('mem', K.MEM, 'mem_read')
    kw = B.kernel('mem', K.MEM, 'mem_write')
    rows, best, stopped = [], {'copy': 0.0, 'read': 0.0, 'write': 0.0}, None
    gs_cap = 1 << 21
    for size in sizes:
        if B.out_of_time():
            break
        try:
            a = B.cl.buffer(size)
            b = B.cl.buffer(size)
        except OC.CLError as e:
            stopped = str(e)
            break
        n4 = size // 16
        gs = B.round_up(min(n4, gs_cap), 256)
        part = B.cl.buffer(gs * 4)
        ls = (256,)
        v = 1.5
        B.run_ns(kw, (gs,), ls, [a, OC.arg_ul(n4), OC.arg_f(v)])
        row = {'size_mb': size // H.MB}
        for name, kern, args, moved in (
                ('copy', kc, [a, b, OC.arg_ul(n4)], 2 * size), ('read', kr, [a, part, OC.arg_ul(n4)], size),
                ('write', kw, [b, OC.arg_ul(n4), OC.arg_f(v)], size)):
            m = H.measure(lambda: B.run_ns(kern, (gs,), ls, args), runs=7, warm=1)
            gb = moved / m['median']
            row[name] = f(gb, 1)
            row[name + '_runs'] = m['runs']
            best[name] = max(best[name], gb)
        want = struct.pack('4f', v, v + 1, v + 2, v + 3)
        row['verified'] = bool(B.cl.read_bytes(b, 16) == want and B.cl.read_bytes(b, 16, size - 16) == want)
        rows.append(row)
        for x in (a, b, part):
            B.cl.free(x)
    if not rows:
        return {'status': 'FAILED', 'error': stopped or 'no size could be run', 'rows': []}
    res = {'status': 'PASSED', 'rows': rows, 'best': {k: f(v, 1) for k, v in best.items()}, 'stopped': stopped, 'truncated': B.truncated}
    if not all(r['verified'] for r in rows):
        res['status'] = 'FAILED'
        res['error'] = 'copied data did not read back correctly'
    return res


def sec_local_bw(B):
    k = B.kernel('mem', K.MEM, 'local_bw')
    if B.dev['max_wg'] < 256 or B.dev['local_mem'] < 1024:
        return {'status': 'UNSUPPORTED', 'error': 'needs work-group 256 and 1 KB local memory'}
    gs = B.global_threads(mult=2560, lo=65536)
    out = B.cl.buffer(gs * 4)

    def run(iters):
        return B.run_ns(k, (gs,), (256,), [out, OC.arg_i(iters)])
    run(8)
    iters, ns = H.autotune(run, 64, target=40e6, max_n=1 << 20)
    m = H.measure(lambda: run(iters), runs=7, warm=1)
    B.cl.free(out)
    return {'status': 'PASSED', 'gbs': f(gs * iters * 12.0 / m['median'], 1), 'iters': iters, 'threads': gs, 'note': 'two reads and one write per pass, with barriers'}


def sec_transfer(B):
    sizes = H.plan_transfer_sizes(B.dev['max_alloc'], B.smoke)
    if not sizes:
        return {'status': 'FAILED', 'error': 'no transfer size fits the max allocation'}
    top = sizes[-1]
    host = np.empty(top, dtype=np.uint8)
    host.view(np.uint8)[:] = 0xA5
    host[::4096] = np.arange(0, top, 4096, dtype=np.uint64).astype(np.uint8)  # touch every page, not all one value
    dbuf = B.cl.buffer(top)
    ptr = host.ctypes.data
    rows = []
    for size in sizes:
        if B.out_of_time():
            break

        def h2d():
            t = time.perf_counter()
            B.cl.write(dbuf, ptr, size)
            return time.perf_counter() - t

        def d2h():
            t = time.perf_counter()
            B.cl.read(dbuf, ptr, size)
            return time.perf_counter() - t
        a = H.measure(h2d, runs=5, warm=1)
        b = H.measure(d2h, runs=5, warm=1)
        rows.append({'size_mb': size // H.MB, 'h2d_gbs': f(size / a['median'] / GBS, 3), 'd2h_gbs': f(size / b['median'] / GBS, 3),
                     'h2d_runs': a['runs'], 'd2h_runs': b['runs']})
    B.cl.free(dbuf)
    big = [r for r in rows if r['size_mb'] >= 64] or rows
    return {'status': 'PASSED', 'rows': rows, 'h2d_best_gbs': max(r['h2d_gbs'] for r in big), 'd2h_best_gbs': max(r['d2h_gbs'] for r in big),
            'note': 'wall-clock around blocking clEnqueueWriteBuffer/ReadBuffer from ordinary (pageable) host memory; 1 GB = 1e9 bytes',
            'truncated': B.truncated}


# ----- shallow water
def _sw_options(dtype):
    return '-D REAL=double -D USE_FP64' if dtype == np.float64 else '-D REAL=float'


def _sw_state(B, n, dtype):
    h, hu, hv, b, s = R.sw_init(n, dtype)
    bufs = {'h': B.upload(h), 'hu': B.upload(hu), 'hv': B.upload(hv), 'b': B.upload(b), 's': B.upload(s)}
    bufs['h2'] = B.cl.buffer(h.nbytes)
    bufs['hu2'] = B.cl.buffer(h.nbytes)
    bufs['hv2'] = B.cl.buffer(h.nbytes)
    return bufs


def _sw_enqueue(B, kern, st, n, dtype, ls):
    gs = (B.round_up(n, ls[0]), B.round_up(n, ls[1]))
    rd = dtype.__name__ == 'float64'
    cv = OC.arg_d if rd else OC.arg_f
    state = {'cur': ('h', 'hu', 'hv'), 'nxt': ('h2', 'hu2', 'hv2')}

    def enqueue(i, want_event):
        c, x = state['cur'], state['nxt']
        ev = B.cl.run(kern, gs, ls, [st[c[0]], st[c[1]], st[c[2]], st['b'], st['s'], st[x[0]], st[x[1]], st[x[2]],
                                     OC.arg_i(n), OC.arg_i(n), cv(R.SW_C), cv(R.SW_DT)], event=want_event)
        state['cur'], state['nxt'] = x, c
        return ev
    return enqueue, state


def _sw_gpu_run(B, n, steps, dtype):
    kern = B.kernel('sw' + dtype.__name__, K.SHALLOW, 'sw_step', _sw_options(dtype))
    st = _sw_state(B, n, dtype)
    enq, state = _sw_enqueue(B, kern, st, n, dtype, B.tile2d())
    for i in range(steps):
        enq(i, False)
    B.cl.finish()
    cur = state['cur']
    out = [B.download(st[k], (n, n), dtype) for k in cur]
    for b in st.values():
        B.cl.free(b)
    return out


def sec_shallow_water(B):
    sizes = [32, 64] if B.smoke else [512, 1024, 2048, 4096]
    cn, short, long_ = (32, 40, 200) if B.smoke else (64, 200, 2000)
    chk = {'grid': cn, 'steps_short': short, 'steps_long': long_}
    truth = {}
    for steps in (short, long_):
        truth[steps] = R.sw_run(cn, steps, np.float64)
    dtypes = [('fp32', np.float32)] + ([('fp64', np.float64)] if B.dev['fp64'] else [])
    for name, dt in dtypes:
        for steps, tag in ((short, 'short'), (long_, 'long')):
            got = _sw_gpu_run(B, cn, steps, dt)
            err = max(H.rel_err(g, t) for g, t in zip(got, truth[steps]))
            chk['%s_err_%s' % (name, tag)] = err if err == err else None
    ok32 = chk['fp32_err_long'] is not None and chk['fp32_err_long'] < 1e-2
    ok64 = ('fp64_err_long' not in chk) or (chk['fp64_err_long'] is not None and chk['fp64_err_long'] < 1e-8)
    chk['passed'] = bool(ok32 and ok64)
    if not chk['passed']:
        chk['why'] = 'FP32 long error %s (limit 0.01), FP64 long error %s (limit 1e-8)' % (chk.get('fp32_err_long'), chk.get('fp64_err_long'))
    rows = []
    for name, dt in dtypes:
        for n in sizes:
            if B.out_of_time():
                break
            try:
                kern = B.kernel('sw' + dt.__name__, K.SHALLOW, 'sw_step', _sw_options(dt))
                st = _sw_state(B, n, dt)
            except OC.CLError as e:
                rows.append({'n': n, 'dtype': name, 'error': str(e)})
                break
            enq, state = _sw_enqueue(B, kern, st, n, dt, B.tile2d())
            B.batch_s(enq, 2)
            per, _ = B.batch_s(enq, 4)
            per /= 4.0
            nb = int(min(400, max(4, 0.25 / per))) if per > 0 else 100
            m = H.measure(lambda: B.batch_s(enq, nb)[0], runs=3, warm=0)
            sps = nb / m['median']
            rows.append({'n': n, 'dtype': name, 'steps_per_s': f(sps, 2), 'ms_per_step': f(1000.0 / sps, 4),
                         'eff_gbs': f(n * n * 8 * np.dtype(dt).itemsize * sps / GBS, 1), 'batch': nb, 'runs': m['runs']})
            for b in st.values():
                B.cl.free(b)
    return {'status': 'PASSED' if chk['passed'] else 'FAILED', 'check': chk, 'rows': rows, 'truncated': B.truncated,
            'error': None if chk['passed'] else chk.get('why'),
            'note': 'Lax-Friedrichs, fields h, hu, hv, bed, source; effective GB/s counts 5 fields read + 3 written per cell per step'}


# ----- flow accumulation
def _fa_gpu(B, z, passes=None, until_stable=False, cap=800):
    n = z.shape[0]
    kr = B.kernel('flow', K.FLOW, 'fa_receiver')
    kp = B.kernel('flow', K.FLOW, 'fa_pull')
    ls = B.tile2d()
    gs = (B.round_up(n, ls[0]), B.round_up(n, ls[1]))
    zb = B.upload(z)
    rec = B.cl.buffer(n * n * 4)
    a = B.upload(np.ones((n, n), dtype=np.int32))
    b = B.cl.buffer(n * n * 4)
    B.cl.run(kr, gs, ls, [zb, rec, OC.arg_i(n), OC.arg_i(n)])
    B.cl.finish()
    prev = None
    done = 0
    for p in range(passes if passes else cap):
        B.cl.run(kp, gs, ls, [rec, a, b, OC.arg_i(n), OC.arg_i(n)])
        a, b = b, a
        done += 1
        if until_stable and p % 4 == 3:
            cur = B.download(a, (n, n), np.int32)
            if prev is not None and np.array_equal(cur, prev):
                break
            prev = cur
    B.cl.finish()
    out = B.download(a, (n, n), np.int32)
    recv = B.download(rec, (n, n), np.int32)
    for x in (zb, rec, a, b):
        B.cl.free(x)
    return recv, out, done


def sec_flow_accum(B):
    cn = 24 if B.smoke else 48
    z = R.fa_terrain(cn)
    rec_ref, acc_ref = R.fa_accumulate(z)
    recv, acc, passes = _fa_gpu(B, z, until_stable=True, cap=6000)
    chk = {'grid': cn, 'passes_to_converge': passes, 'receivers_match': bool(np.array_equal(recv.ravel(), rec_ref)),
           'accumulation_match': bool(np.array_equal(acc.ravel(), acc_ref)), 'max_accumulation': int(acc_ref.max())}
    chk['passed'] = chk['receivers_match'] and chk['accumulation_match']
    rows = []
    if chk['passed']:
        sizes = [64, 128] if B.smoke else [1024, 2048, 4096]
        kr = B.kernel('flow', K.FLOW, 'fa_receiver')
        kp = B.kernel('flow', K.FLOW, 'fa_pull')
        for n in sizes:
            if B.out_of_time():
                break
            try:
                ls = B.tile2d()
                gs = (B.round_up(n, ls[0]), B.round_up(n, ls[1]))
                zb = B.upload(np.random.default_rng(7).random((n, n), dtype=np.float32))
                rec = B.cl.buffer(n * n * 4)
                a = B.upload(np.ones((n, n), dtype=np.int32))
                b = B.cl.buffer(n * n * 4)
            except OC.CLError as e:
                rows.append({'n': n, 'error': str(e)})
                break
            rec_ms = B.run_ns(kr, gs, ls, [zb, rec, OC.arg_i(n), OC.arg_i(n)]) / 1e6
            st = {'a': a, 'b': b}

            def enq(i, ev, st=st):
                x = B.cl.run(kp, gs, ls, [rec, st['a'], st['b'], OC.arg_i(n), OC.arg_i(n)], event=ev)
                st['a'], st['b'] = st['b'], st['a']
                return x
            B.batch_s(enq, 2)
            per, _ = B.batch_s(enq, 4)
            per /= 4.0
            nb = int(min(200, max(4, 0.25 / per))) if per > 0 else 50
            m = H.measure(lambda: B.batch_s(enq, nb)[0], runs=3, warm=0)
            pps = nb / m['median']
            rows.append({'n': n, 'passes_per_s': f(pps, 2), 'receiver_ms': f(rec_ms, 3), 'eff_gbs': f(n * n * 12 * pps / GBS, 1), 'batch': nb})
            for x in (zb, rec, a, b):
                B.cl.free(x)
    return {'status': 'PASSED' if chk['passed'] else 'FAILED', 'check': chk, 'rows': rows, 'truncated': B.truncated,
            'error': None if chk['passed'] else 'GPU flow accumulation differs from numpy reference',
            'note': 'one pass is one pull step; a full accumulation needs as many passes as the longest flow path (see passes_to_converge on the small check)'}


# ----- diffusion
def sec_diffusion(B):
    kern = B.kernel('diff', K.DIFFUSE, 'diffuse')
    cn, csteps = (32, 10) if B.smoke else (128, 50)
    u0 = R.diffuse_init(cn, np.float32)
    truth = u0.astype(np.float64)
    for _ in range(csteps):
        truth = R.diffuse_step(truth)
    ls = B.tile2d()
    gs = (B.round_up(cn, ls[0]), B.round_up(cn, ls[1]))
    a, b = B.upload(u0), B.cl.buffer(u0.nbytes)
    for _ in range(csteps):
        B.cl.run(kern, gs, ls, [a, b, OC.arg_i(cn), OC.arg_i(cn), OC.arg_f(R.DIFF_K)])
        a, b = b, a
    B.cl.finish()
    got = B.download(a, (cn, cn), np.float32)
    err = H.rel_err(got, truth)
    B.cl.free(a)
    B.cl.free(b)
    chk = {'grid': cn, 'steps': csteps, 'fp32_max_rel_err': err, 'passed': bool(err < 1e-4)}
    rows = []
    if chk['passed']:
        for n in ([64, 128] if B.smoke else [512, 1024, 2048, 4096, 8192]):
            if B.out_of_time():
                break
            try:
                ls = B.tile2d()
                gs = (B.round_up(n, ls[0]), B.round_up(n, ls[1]))
                a = B.upload(np.random.default_rng(3).random((n, n), dtype=np.float32))
                b = B.cl.buffer(n * n * 4)
            except OC.CLError as e:
                rows.append({'n': n, 'error': str(e)})
                break
            st = {'a': a, 'b': b}

            def enq(i, ev, st=st):
                x = B.cl.run(kern, gs, ls, [st['a'], st['b'], OC.arg_i(n), OC.arg_i(n), OC.arg_f(R.DIFF_K)], event=ev)
                st['a'], st['b'] = st['b'], st['a']
                return x
            B.batch_s(enq, 2)
            per, _ = B.batch_s(enq, 4)
            per /= 4.0
            nb = int(min(2000, max(4, 0.25 / per))) if per > 0 else 100
            m = H.measure(lambda: B.batch_s(enq, nb)[0], runs=3, warm=0)
            sps = nb / m['median']
            rows.append({'n': n, 'steps_per_s': f(sps, 2), 'eff_gbs': f(n * n * 8 * sps / GBS, 1), 'batch': nb})
            B.cl.free(a)
            B.cl.free(b)
    return {'status': 'PASSED' if chk['passed'] else 'FAILED', 'check': chk, 'rows': rows, 'truncated': B.truncated,
            'error': None if chk['passed'] else 'diffusion differs from numpy reference'}


# ----- agents
def _circ(d):
    d = np.abs(d)
    return np.minimum(d, 1.0 - d)


def sec_agents(B):
    kern = B.kernel('agents', K.AGENTS, 'agent_step')
    fld = R.agent_field()
    fn = fld.shape[0]

    def state(n):
        x, y, vx, vy = R.agent_init(n)
        bufs = [B.upload(a) for a in (x, y, vx, vy)] + [B.cl.buffer(n * 4) for _ in range(4)]
        return (x, y, vx, vy), bufs
    cn, csteps = (500, 3) if B.smoke else (2000, 5)
    (x, y, vx, vy), bufs = state(cn)
    fb = B.upload(fld)
    cur, nxt = bufs[:4], bufs[4:]
    gsz = B.round_up(cn, 256)
    for _ in range(csteps):
        B.cl.run(kern, (gsz,), (256,), cur + nxt + [fb, OC.arg_i(fn), OC.arg_i(cn), OC.arg_f(R.AGENT_DT)])
        cur, nxt = nxt, cur
    B.cl.finish()
    got = [B.download(b, (cn,), np.float32) for b in cur]
    ref = (x, y, vx, vy)
    for _ in range(csteps):
        ref = R.agent_step(*ref, fld)
    perr = max(float(np.max(_circ(got[0] - ref[0]))), float(np.max(_circ(got[1] - ref[1]))))
    verr = max(float(np.max(np.abs(got[2] - ref[2]))), float(np.max(np.abs(got[3] - ref[3]))))
    chk = {'agents': cn, 'steps': csteps, 'max_position_err': perr, 'max_velocity_err': verr, 'passed': bool(perr < 1e-3 and verr < 1e-3)}
    for b in bufs:
        B.cl.free(b)
    rows = []
    if chk['passed']:
        for n in ([2000, 8000] if B.smoke else [100000, 1000000, 4000000]):
            if B.out_of_time():
                break
            try:
                _, bufs = state(n)
            except OC.CLError as e:
                rows.append({'n': n, 'error': str(e)})
                break
            gsz = B.round_up(n, 256)
            st = {'cur': bufs[:4], 'nxt': bufs[4:]}

            def enq(i, ev, st=st, n=n, gsz=gsz):
                x_ = B.cl.run(kern, (gsz,), (256,), st['cur'] + st['nxt'] + [fb, OC.arg_i(fn), OC.arg_i(n), OC.arg_f(R.AGENT_DT)], event=ev)
                st['cur'], st['nxt'] = st['nxt'], st['cur']
                return x_
            B.batch_s(enq, 2)
            per, _ = B.batch_s(enq, 4)
            per /= 4.0
            nb = int(min(2000, max(4, 0.25 / per))) if per > 0 else 50
            m = H.measure(lambda: B.batch_s(enq, nb)[0], runs=3, warm=0)
            sps = nb / m['median']
            rows.append({'n': n, 'steps_per_s': f(sps, 2), 'ms_per_step': f(1000.0 / sps, 4), 'million_updates_per_s': f(n * sps / 1e6, 1), 'batch': nb})
            for b in bufs:
                B.cl.free(b)
    B.cl.free(fb)
    return {'status': 'PASSED' if chk['passed'] else 'FAILED', 'check': chk, 'rows': rows, 'truncated': B.truncated,
            'error': None if chk['passed'] else 'agent update differs from numpy reference',
            'note': 'each agent samples a 256x256 potential field (bilinear gradient) and separates from 16 index neighbours, float32'}


# ----- reduction and scan
def sec_reduction(B):
    n = (1 << 20) if B.smoke else (1 << 26)
    kf = B.kernel('par', K.PARALLEL, 'fill_iota_f32')
    ku = B.kernel('par', K.PARALLEL, 'fill_iota_u32')
    rf = B.kernel('par', K.PARALLEL, 'red_f32')
    ru = B.kernel('par', K.PARALLEL, 'red_u32')
    groups = 256 if B.smoke else 2048
    gs = groups * 256
    xf, xu = B.cl.buffer(n * 4), B.cl.buffer(n * 4)
    pf, pu = B.cl.buffer(groups * 4), B.cl.buffer(groups * 8)
    B.run_ns(kf, (gs,), (256,), [xf, OC.arg_ul(n)])
    B.run_ns(ku, (gs,), (256,), [xu, OC.arg_ul(n)])
    mf = H.measure(lambda: B.run_ns(rf, (gs,), (256,), [xf, pf, OC.arg_ul(n), OC.LocalMem(256 * 4)]), runs=7, warm=1)
    mu = H.measure(lambda: B.run_ns(ru, (gs,), (256,), [xu, pu, OC.arg_ul(n), OC.LocalMem(256 * 8)]), runs=7, warm=1)
    partf = B.download(pf, (groups,), np.float32)
    partu = B.download(pu, (groups,), np.uint64)
    one = (np.arange(1024, dtype=np.float32) * np.float32(0.001)).astype(np.float64).sum() * (n // 1024)
    got = float(partf.astype(np.float64).sum())
    exact_int = (n // 1024) * (1023 * 1024 // 2)
    res = {'status': 'PASSED', 'n': n, 'ms': f(mf['median'] / 1e6, 3), 'gbs': f(n * 4 / mf['median'], 1), 'u32_ms': f(mu['median'] / 1e6, 3),
           'float_sum': got, 'float_expected': float(one), 'float_rel_err': abs(got - one) / one, 'int_sum': int(partu.sum()),
           'int_expected': int(exact_int), 'int_exact': bool(int(partu.sum()) == exact_int)}
    if not res['int_exact'] or res['float_rel_err'] > 1e-3:
        res['status'] = 'FAILED'
        res['error'] = 'reduction wrong: float error %.2e, integer exact %s' % (res['float_rel_err'], res['int_exact'])
    for x in (xf, xu, pf, pu):
        B.cl.free(x)
    return res


def _scan_plan(n):
    sizes = [n]
    while sizes[-1] > 256:
        sizes.append((sizes[-1] + 255) // 256)
    return sizes


def sec_scan(B):
    kb = B.kernel('par', K.PARALLEL, 'scan_block')
    ka = B.kernel('par', K.PARALLEL, 'scan_add')
    rows = []
    for n in ([4096, 70000] if B.smoke else [1 << 20, 1 << 22, 1 << 24]):
        if B.out_of_time():
            break
        data = R.scan_input(n)
        sizes = _scan_plan(n)
        ins = [B.upload(data)]
        outs, sums = [], []
        for lv, sz in enumerate(sizes):
            outs.append(B.cl.buffer(max(sz, 1) * 4))
            nxt = (sz + 255) // 256 if sz > 256 else 1
            sums.append(B.cl.buffer(nxt * 4))
            if lv + 1 < len(sizes):
                ins.append(sums[-1])

        def enq_all(want_first_last):
            evs = []
            for lv, sz in enumerate(sizes):
                g = B.round_up(sz, 256)
                e = B.cl.run(kb, (g,), (256,), [ins[lv], outs[lv], sums[lv], OC.arg_u(sz)], event=want_first_last and lv == 0)
                if e:
                    evs.append(e)
            for lv in range(len(sizes) - 2, -1, -1):
                g = B.round_up(sizes[lv], 256)
                e = B.cl.run(ka, (g,), (256,), [outs[lv], outs[lv + 1], OC.arg_u(sizes[lv])], event=want_first_last and lv == 0)
                if e:
                    evs.append(e)
            return evs

        def once():
            evs = enq_all(True)
            B.cl.finish()
            a = evs[0].times()[2]
            b = evs[-1].times()[3]
            for e in evs:
                e.release()
            return float(b - a)
        once()
        m = H.measure(once, runs=7, warm=1)
        got = B.download(outs[0], (n,), np.uint32)
        exact = bool(np.array_equal(got, np.cumsum(data, dtype=np.uint32)))
        rows.append({'n': n, 'ms': f(m['median'] / 1e6, 3), 'mps': f(n / m['median'] * 1e3, 1), 'gbs': f(n * 12.0 / m['median'], 1), 'levels': len(sizes), 'exact': exact})
        for x in set(ins + outs + sums):
            B.cl.free(x)
    bad = [r for r in rows if not r['exact']]
    return {'status': 'FAILED' if bad or not rows else 'PASSED', 'rows': rows, 'truncated': B.truncated,
            'error': ('prefix sum is not exact for n=%s' % [r['n'] for r in bad]) if bad else (None if rows else 'no size ran')}


# ----- allocation probes
def _fill(B, buf, size, value):
    k = B.kernel('mem', K.MEM, 'mem_write')
    n4 = size // 16
    gs = B.round_up(min(n4, 1 << 21), 256)
    B.cl.run(k, (gs,), (256,), [buf, OC.arg_ul(n4), OC.arg_f(value)])
    B.cl.finish()


def sec_max_buffer(B):
    sizes = H.plan_max_buffer_sizes(B.dev['max_alloc'], B.smoke)
    rows, largest, stopped = [], 0, None
    for s in sizes:
        t = time.perf_counter()
        try:
            buf = B.cl.buffer(s)
            _fill(B, buf, s, 3.0)
            want = struct.pack('4f', 3.0, 4.0, 5.0, 6.0)
            ok = B.cl.read_bytes(buf, 16) == want and B.cl.read_bytes(buf, 16, s - 16) == want
            B.cl.free(buf)
        except OC.CLError as e:
            rows.append({'size_mb': s // H.MB, 'ok': False, 'error': str(e)})
            stopped = str(e)
            break
        rows.append({'size_mb': s // H.MB, 'ok': bool(ok), 'seconds': f(time.perf_counter() - t, 3)})
        if not ok:
            stopped = 'buffer of %d MB did not read back correctly' % (s // H.MB)
            break
        largest = s
    return {'status': 'PASSED' if largest else 'FAILED', 'rows': rows, 'largest_ok_gb': f(largest / H.GB, 3), 'reported_max_gb': f(B.dev['max_alloc'] / H.GB, 3),
            'reported_max_ok': bool(largest >= B.dev['max_alloc']), 'stopped': stopped, 'error': None if largest else 'no buffer size could be allocated'}


def sec_vram(B):
    chunk, maxn = H.plan_vram_chunks(smoke=B.smoke)
    bufs, fills, stopped = [], [], None
    for i in range(maxn):
        t = time.perf_counter()
        try:
            b = B.cl.buffer(chunk)
            _fill(B, b, chunk, float(i + 1))
        except OC.CLError as e:
            stopped = str(e)
            break
        fills.append(time.perf_counter() - t)
        bufs.append(b)
    bad = 0
    for i, b in enumerate(bufs):
        want = struct.pack('4f', *[float(i + 1) + d for d in range(4)])
        try:
            if B.cl.read_bytes(b, 16) != want or B.cl.read_bytes(b, 16, chunk - 16) != want:
                bad += 1
        except OC.CLError:
            bad += 1
    count = len(bufs)
    for b in bufs:
        B.cl.free(b)
    spill = H.detect_spill(fills)
    return {'status': 'PASSED' if count else 'FAILED', 'chunks': count, 'chunk_mb': chunk // H.MB, 'total_gb': f(count * chunk / H.GB, 3),
            'cap_reached': stopped is None, 'stopped': stopped, 'verify_bad': bad,
            'spill_at_gb': f(spill * chunk / H.GB, 2) if spill is not None else None,
            'fill_ms_first': f(fills[0] * 1e3, 2) if fills else None, 'fill_ms_median': f(H.median(fills) * 1e3, 2) if fills else None,
            'fill_ms_last': f(fills[-1] * 1e3, 2) if fills else None, 'error': None if count else (stopped or 'first 256 MB allocation failed')}


# name, group, function, time budget in seconds
SECTIONS = [
    ('info', 'basic', sec_info, 20),
    ('latency', 'basic', sec_latency, 30),
    ('fma_f32', 'basic', sec_fma_f32, 40),
    ('fma_f64', 'basic', sec_fma_f64, 40),
    ('fma_f16', 'basic', sec_fma_f16, 40),
    ('int_ops', 'basic', sec_int_ops, 40),
    ('mem_bw', 'basic', sec_mem_bw, 120),
    ('local_bw', 'basic', sec_local_bw, 30),
    ('transfer', 'transfer', sec_transfer, 150),
    ('shallow_water', 'sim', sec_shallow_water, 300),
    ('flow_accum', 'sim', sec_flow_accum, 150),
    ('diffusion', 'sim', sec_diffusion, 150),
    ('agents', 'sim', sec_agents, 200),
    ('reduction', 'parallel', sec_reduction, 40),
    ('scan', 'parallel', sec_scan, 80),
    ('max_buffer', 'vram', sec_max_buffer, 90),
    ('vram', 'vram', sec_vram, 120),
]
GROUPS = ['basic', 'transfer', 'sim', 'parallel', 'vram']


def run_sections(B, names, smoke):
    out = {}
    for name, group, fn, budget in SECTIONS:
        if name not in names:
            continue
        t0 = time.perf_counter()
        B.start_section(15 if smoke else budget)
        nbuf = len(B.cl.buffers)
        try:
            r = fn(B)
        except OC.CLError as e:
            r = {'status': 'FAILED', 'error': str(e), 'build_log': e.detail[-1500:] if e.detail else ''}
        except Exception as e:  # keep going: one broken section must not stop the others
            r = {'status': 'FAILED', 'error': '%s: %s' % (type(e).__name__, e), 'trace': traceback.format_exc()[-1200:]}
        try:
            for b in list(B.cl.buffers)[nbuf:]:
                B.cl.free(b)
            B.cl.finish()
        except Exception:
            pass
        r['seconds'] = f(time.perf_counter() - t0, 2)
        out[name] = r
        print('%-14s %-11s %6.1fs  %s' % (name, r.get('status'), r['seconds'], H.scrub(str(r.get('error') or ''))[:160]), flush=True)
    return out


def pick_device(cl, match, smoke):
    """Return (device handle, description) of the first device whose name or vendor contains `match` (case-insensitive).
    With an empty match, the first GPU, else the first device. Returns (None, list of seen names) if nothing matches."""
    seen, cands = [], []
    for p in cl.platforms():
        for d in cl.devices(p):
            info = cl.describe_device(d)
            seen.append('%s | %s | type %d' % (info['name'], info['vendor'], info['type']))
            cands.append((d, info))
    m = (match or '').lower()
    for d, info in cands:
        if m and (m in info['name'].lower() or m in info['vendor'].lower()):
            return d, info, seen
    if not m:
        for d, info in cands:
            if info['type'] & OC.CL_DEVICE_TYPE_GPU:
                return d, info, seen
        if cands:
            return cands[0][0], cands[0][1], seen
    return None, None, seen


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--group', default='all', choices=GROUPS + ['all'])
    ap.add_argument('--smoke', action='store_true')
    ap.add_argument('--device-match', default=None, help='text in the device name or vendor; default Radeon (any device in --smoke)')
    ap.add_argument('--only', default='', help='comma list of section names')
    a = ap.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)
    match = a.device_match if a.device_match is not None else ('' if a.smoke else 'Radeon')
    path = os.path.join(a.out, 'opencl_%s.json' % a.group)
    res = {'schema': 1, 'group': a.group, 'smoke': a.smoke, 'started': time.strftime('%Y-%m-%dT%H:%M:%S'), 'sections': {}}

    def finish(code, why=None):
        if why:
            res['fatal'] = H.scrub(why)
            print('OPENCL SKIPPED:', res['fatal'], flush=True)
        res['exit_code'] = code
        H.write_json(path, res)
        return code
    if np is None:
        return finish(H.EXIT_NO_OPENCL, 'numpy is not importable: %s' % NUMPY_ERR)
    try:
        cl = OC.CL()
    except OC.OpenCLUnavailable as e:
        return finish(H.EXIT_NO_OPENCL, str(e))
    except Exception as e:
        return finish(H.EXIT_NO_OPENCL, 'OpenCL load failed: %s: %s' % (type(e).__name__, e))
    try:
        dev, info, seen = pick_device(cl, match, a.smoke)
    except OC.CLError as e:
        return finish(H.EXIT_NO_OPENCL, 'device discovery failed: %s' % e)
    res['devices_seen'] = seen
    if dev is None:
        return finish(H.EXIT_NO_OPENCL, 'no OpenCL device matching %r; devices seen: %s' % (match, seen))
    try:
        cl.open(dev)
    except OC.CLError as e:
        res['device'] = info
        return finish(H.EXIT_NO_OPENCL, 'context or queue creation failed: %s' % e)
    res['device'] = info
    B = Bench(cl, info, a.smoke)
    names = [n for n, g, _, _ in SECTIONS if (a.group == 'all' or g == a.group)]
    if a.only:
        names = [n for n in names if n in a.only.split(',')]
    print('device: %s (%d CU, %d MB)' % (info['name'], info['compute_units'], info['global_mem'] // H.MB), flush=True)
    res['sections'] = run_sections(B, names, a.smoke)
    try:
        cl.close()
    except Exception:
        pass
    failed = [n for n, r in res['sections'].items() if r.get('status') == 'FAILED']
    res['finished'] = time.strftime('%Y-%m-%dT%H:%M:%S')
    return finish(H.EXIT_SOME_FAILED if failed else H.EXIT_OK)


if __name__ == '__main__':
    sys.exit(main())
