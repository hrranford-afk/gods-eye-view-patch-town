"""Runs the real OpenCL kernels and the ctypes wrapper through pocl (a CPU OpenCL implementation) in a private test virtualenv, and checks the
kernel MATH against numpy: FP32 against float64 truth, FP64 against float64 truth, exact integer results, flow accumulation, prefix sums,
reductions. It also checks the failure paths (no library, bad kernel source, missing device) and that a deliberately broken kernel is CAUGHT.
Needs: numpy, pocl (pip install pocl-binary-distribution pyopencl, TESTING ONLY, never on the Mac) and these environment variables:
  HW12_OPENCL_LIB=<path to the libOpenCL shipped inside pyopencl/.libs>   OCL_ICD_FILENAMES=<path to libpocl*.so>
Without them every test here is skipped. Run: HW12_OPENCL_LIB=... OCL_ICD_FILENAMES=... python3 -B tests/test_kernels_pocl.py"""
import json
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.abspath(os.path.join(HERE, '..', 'hw12_pkg'))
sys.path.insert(0, PKG)
sys.dont_write_bytecode = True

AVAILABLE = bool(os.environ.get('HW12_OPENCL_LIB')) and os.path.exists(os.environ.get('HW12_OPENCL_LIB', ''))
try:
    import numpy as np
except ImportError:
    AVAILABLE = False

if AVAILABLE:
    import opencl_ctypes as OC
    import opencl_bench as OB
    import opencl_kernels as K
    import hw12_common as H
    import sim_refs as R


@unittest.skipUnless(AVAILABLE, 'pocl not configured (set HW12_OPENCL_LIB and OCL_ICD_FILENAMES)')
class Kernels(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cl = OC.CL()
        dev, info, seen = OB.pick_device(cls.cl, '', True)
        cls.cl.open(dev)
        cls.B = OB.Bench(cls.cl, info, True)

    @classmethod
    def tearDownClass(cls):
        cls.cl.close()

    def run_sec(self, fn, budget=60):
        self.B.start_section(budget)
        return fn(self.B)

    def test_device_description(self):
        d = self.B.dev
        self.assertGreater(d['compute_units'], 0)
        self.assertGreater(d['global_mem'], 0)
        self.assertGreater(d['max_wg'], 0)
        self.assertIsInstance(d['extensions'], list)
        self.assertIn('fp64', d)
        self.assertEqual(set(d['preferred_vector_width']), {'char', 'short', 'int', 'long', 'float', 'double', 'half'})

    def test_queue_api_used(self):
        self.assertIn(self.cl.queue_api, ('clCreateCommandQueue', 'clCreateCommandQueueWithProperties'))

    def test_every_prototype_resolved(self):
        self.assertEqual(self.cl.lib._hw12_missing, [])

    def test_fma_f32_matches_closed_form(self):
        r = self.run_sec(OB.sec_fma_f32)
        self.assertEqual(r['status'], 'PASSED', r)
        self.assertLess(r['check']['max_rel_err'], 1e-3)
        self.assertGreater(r['gflops'], 0)

    def test_fma_f64_matches_closed_form_tightly(self):
        if not self.B.dev['fp64']:
            self.skipTest('no fp64')
        r = self.run_sec(OB.sec_fma_f64)
        self.assertEqual(r['status'], 'PASSED', r)
        self.assertLess(r['check']['max_rel_err'], 1e-12)

    def test_int_ops_runs(self):
        r = self.run_sec(OB.sec_int_ops)
        self.assertEqual(r['status'], 'PASSED', r)
        self.assertGreater(r['giops'], 0)

    def test_shallow_water_fp32_fp64_against_numpy_truth(self):
        r = self.run_sec(OB.sec_shallow_water, 120)
        self.assertEqual(r['status'], 'PASSED', r)
        c = r['check']
        self.assertLess(c['fp32_err_long'], 1e-2)
        self.assertGreater(c['fp32_err_long'], 1e-9, 'FP32 should not be bit-identical to the float64 truth')
        if 'fp64_err_long' in c:
            self.assertLess(c['fp64_err_long'], 1e-12)
            self.assertLess(c['fp64_err_long'], c['fp32_err_long'] / 100)

    def test_shallow_water_kernel_matches_numpy_float32_reference_too(self):
        n, steps = 48, 30
        got = OB._sw_gpu_run(self.B, n, steps, np.float32)
        ref = R.sw_run(n, steps, np.float32)
        for g, t in zip(got, ref):
            self.assertLess(H.rel_err(g, t), 1e-4)

    def test_flow_accumulation_exact(self):
        r = self.run_sec(OB.sec_flow_accum, 120)
        self.assertEqual(r['status'], 'PASSED', r)
        self.assertTrue(r['check']['receivers_match'])
        self.assertTrue(r['check']['accumulation_match'])
        self.assertGreater(r['check']['max_accumulation'], 1)

    def test_diffusion_against_numpy(self):
        r = self.run_sec(OB.sec_diffusion)
        self.assertEqual(r['status'], 'PASSED', r)
        self.assertLess(r['check']['fp32_max_rel_err'], 1e-5)

    def test_agents_against_numpy(self):
        r = self.run_sec(OB.sec_agents)
        self.assertEqual(r['status'], 'PASSED', r)
        self.assertLess(r['check']['max_position_err'], 1e-4)

    def test_reduction_exact_integer(self):
        r = self.run_sec(OB.sec_reduction)
        self.assertEqual(r['status'], 'PASSED', r)
        self.assertTrue(r['int_exact'])
        self.assertLess(r['float_rel_err'], 1e-5)

    def test_prefix_sum_exact(self):
        r = self.run_sec(OB.sec_scan)
        self.assertEqual(r['status'], 'PASSED', r)
        self.assertTrue(all(x['exact'] for x in r['rows']))
        self.assertGreaterEqual(max(x['levels'] for x in r['rows']), 3)   # a size that needs three scan levels was tested

    def test_memory_sections(self):
        for fn in (OB.sec_mem_bw, OB.sec_local_bw, OB.sec_transfer, OB.sec_latency, OB.sec_max_buffer, OB.sec_vram):
            r = self.run_sec(fn)
            self.assertIn(r['status'], ('PASSED', 'UNSUPPORTED'), (fn.__name__, r))

    def test_vram_probe_verifies_and_frees(self):
        before = len(self.cl.buffers)
        r = self.run_sec(OB.sec_vram)
        self.assertEqual(r['verify_bad'], 0)
        self.assertEqual(r['chunks'], 4)
        self.assertEqual(len(self.cl.buffers), before)    # everything released

    def test_vram_probe_stops_at_first_failure(self):
        real = self.cl.buffer
        calls = {'n': 0}

        def flaky(nbytes, flags=OC.CL_MEM_READ_WRITE):
            calls['n'] += 1
            if calls['n'] > 2:
                raise OC.CLError(-4, 'clCreateBuffer(%d bytes)' % nbytes)
            return real(nbytes, flags)
        self.cl.buffer = flaky
        try:
            r = self.run_sec(OB.sec_vram)
        finally:
            self.cl.buffer = real
        self.assertEqual(r['chunks'], 2)
        self.assertFalse(r['cap_reached'])
        self.assertIn('CL_MEM_OBJECT_ALLOCATION_FAILURE', r['stopped'])
        self.assertEqual(calls['n'], 3)      # stopped at the first failure, no retry

    def test_build_error_has_log_and_name(self):
        with self.assertRaises(OC.CLError) as cm:
            self.cl.build('__kernel void k(__global int* p) { this is not C }', name='bad')
        self.assertEqual(cm.exception.name, 'CL_BUILD_PROGRAM_FAILURE')
        self.assertIn('error', cm.exception.detail.lower())

    def test_invalid_work_group_error_name(self):
        k = self.B.kernel('arith', K.ARITH, 'nop')
        buf = self.cl.buffer(256)
        with self.assertRaises(OC.CLError) as cm:
            self.cl.run(k, (7,), (3,), [buf])       # 7 is not a multiple of 3
        self.assertIn(cm.exception.name, ('CL_INVALID_WORK_GROUP_SIZE', 'CL_INVALID_GLOBAL_WORK_SIZE'))
        self.cl.free(buf)

    def test_buffer_too_large_error_name(self):
        with self.assertRaises(OC.CLError) as cm:
            self.cl.buffer(1 << 60)
        self.assertIn(cm.exception.name, ('CL_INVALID_BUFFER_SIZE', 'CL_MEM_OBJECT_ALLOCATION_FAILURE', 'CL_OUT_OF_HOST_MEMORY', 'CL_INVALID_VALUE'))

    def test_a_section_error_is_recorded_not_raised(self):
        def boom(B):
            raise OC.CLError(-5, 'clEnqueueNDRangeKernel(x)')
        orig = OB.SECTIONS
        OB.SECTIONS = [('boom', 'basic', boom, 5)] + [s for s in orig if s[0] == 'latency']
        try:
            out = OB.run_sections(self.B, ['boom', 'latency'], True)
        finally:
            OB.SECTIONS = orig
        self.assertEqual(out['boom']['status'], 'FAILED')
        self.assertIn('CL_OUT_OF_RESOURCES', out['boom']['error'])
        self.assertEqual(out['latency']['status'], 'PASSED')      # the next section still ran

    def test_broken_kernel_is_caught_by_the_checks(self):
        """Mutation test: change the gravity constant in the shallow-water kernel. The numpy comparison must FAIL."""
        orig = K.SHALLOW
        K.SHALLOW = orig.replace('((REAL)9.81)', '((REAL)7.0)')
        saved = dict(self.B.kern)
        self.B.kern = {k: v for k, v in self.B.kern.items() if not k[0].startswith('sw')}
        self.B.progs = {k: v for k, v in self.B.progs.items() if not k[0].startswith('sw')}
        try:
            r = self.run_sec(OB.sec_shallow_water, 120)
        finally:
            K.SHALLOW = orig
            self.B.kern = saved
            self.B.progs = {k: v for k, v in self.B.progs.items() if not k[0].startswith('sw')}
            self.B.kern = {k: v for k, v in self.B.kern.items() if not k[0].startswith('sw')}
        self.assertEqual(r['status'], 'FAILED', 'a wrong constant in the kernel must be detected')

    def test_broken_scan_is_caught(self):
        orig = K.PARALLEL
        K.PARALLEL = orig.replace('if (blk > 0 && g < n) out[g] += sums_scanned[blk - 1];', 'if (blk > 0 && g < n) out[g] += sums_scanned[blk];')
        saved = dict(self.B.kern)
        self.B.kern = {k: v for k, v in self.B.kern.items() if k[0] != 'par'}
        self.B.progs = {k: v for k, v in self.B.progs.items() if k[0] != 'par'}
        try:
            r = self.run_sec(OB.sec_scan)
        finally:
            K.PARALLEL = orig
            self.B.kern = {k: v for k, v in saved.items() if k[0] != 'par'}
            self.B.progs = {k: v for k, v in self.B.progs.items() if k[0] != 'par'}
        self.assertEqual(r['status'], 'FAILED')


@unittest.skipUnless(AVAILABLE, 'pocl not configured')
class CommandLine(unittest.TestCase):
    def run_cli(self, args, env_extra=None):
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
        env.update(env_extra or {})
        return subprocess.run([sys.executable, os.path.join(PKG, 'opencl_bench.py')] + args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env, timeout=300)

    def test_missing_library_exit_code_and_message(self):
        with tempfile.TemporaryDirectory() as d:
            p = self.run_cli(['--out', d, '--smoke', '--group', 'basic'], {'HW12_OPENCL_LIB': '/nonexistent/OpenCL'})
            self.assertEqual(p.returncode, 5, p.stdout.decode())
            j = json.load(open(os.path.join(d, 'opencl_basic.json')))
            self.assertIn('/nonexistent/OpenCL', j['fatal'])
            self.assertEqual(j['exit_code'], 5)

    def test_no_matching_device_exit_code(self):
        with tempfile.TemporaryDirectory() as d:
            p = self.run_cli(['--out', d, '--smoke', '--group', 'basic', '--device-match', 'Radeon'])
            self.assertEqual(p.returncode, 5, p.stdout.decode())
            j = json.load(open(os.path.join(d, 'opencl_basic.json')))
            self.assertIn('no OpenCL device matching', j['fatal'])
            self.assertTrue(j['devices_seen'])

    def test_smoke_group_runs_and_writes_json(self):
        with tempfile.TemporaryDirectory() as d:
            p = self.run_cli(['--out', d, '--smoke', '--group', 'parallel'])
            self.assertEqual(p.returncode, 0, p.stdout.decode())
            j = json.load(open(os.path.join(d, 'opencl_parallel.json')))
            self.assertEqual(j['sections']['scan']['status'], 'PASSED')
            self.assertNotIn(os.path.expanduser('~'), json.dumps(j))


if __name__ == '__main__':
    if not AVAILABLE:
        print('SKIP: pocl not configured (HW12_OPENCL_LIB / OCL_ICD_FILENAMES)')
    unittest.main(verbosity=1)
