"""Unit tests for the pure-python parts of HW-12 (no OpenCL, no Blender): scrubbing, statistics, timing loop, size planning, error names,
PCIe decoding, inventory parsing with fake command output, summary and report logic with fake Radeon-like data, Blender log parsing,
the STEPLIST, and the package rules (no pycache, checksums). Run: python3 -B tests/test_pure.py"""
import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.join(HERE, '..', 'hw12_pkg')
sys.path.insert(0, PKG)
sys.dont_write_bytecode = True
import hw12_common as H       # noqa: E402
import gpu_inventory as GI    # noqa: E402
import run_all as RA          # noqa: E402


def read(p):
    with open(p) as fh:
        return fh.read()


class Scrub(unittest.TestCase):
    def test_home_and_user(self):
        t = H.scrub('/Users/harry/Desktop/x and /home/bob/y; user harry here; C:\\Users\\Ann\\z', extra=['harry'])
        self.assertNotIn('harry', t)
        self.assertNotIn('bob', t)
        self.assertNotIn('Ann', t)
        self.assertIn('/Users/USER/Desktop/x', t)

    def test_serial_uuid_mac(self):
        t = H.scrub('Serial Number (system): C02XYZ123\nHardware UUID: 8A7B1C2D-0000-1111-2222-333344445555\nen0 aa:bb:cc:dd:ee:ff')
        self.assertNotIn('C02XYZ123', t)
        self.assertNotIn('8A7B1C2D', t)
        self.assertNotIn('aa:bb:cc', t)

    def test_ioreg_serial(self):
        self.assertNotIn('F5K', H.scrub('"IOPlatformSerialNumber" = "F5KABC123"'))

    def test_scrub_obj_nested(self):
        o = H.scrub_obj({'a': ['/Users/zed/q'], 'b': {'c': '/home/zed/z'}, 'n': 3})
        self.assertEqual(o['a'][0], '/Users/USER/q')
        self.assertEqual(o['n'], 3)

    def test_none_and_plain(self):
        self.assertIsNone(H.scrub(None))
        self.assertEqual(H.scrub('Radeon VII 16 GB'), 'Radeon VII 16 GB')


class Stats(unittest.TestCase):
    def test_median(self):
        self.assertEqual(H.median([3, 1, 2]), 2)
        self.assertEqual(H.median([4, 1, 2, 3]), 2.5)

    def test_measure_warmup_runs_and_cap(self):
        calls = []
        t = [0.0]

        def clock():
            return t[0]

        def fn():
            calls.append(1)
            t[0] += 3.0
            return 10.0 + len(calls)
        r = H.measure(fn, runs=5, warm=1, cap_s=8.0, clock=clock)
        # warm-up takes 3 s, run 1 at 3 s, run 2 at 6 s, run 3 at 9 s -> cap hit before run 4
        self.assertTrue(r['capped'])
        self.assertEqual(r['runs'], len(calls) - 1)
        self.assertGreaterEqual(r['runs'], 1)

    def test_measure_at_least_one_run(self):
        t = [0.0]

        def fn():
            t[0] += 100.0
            return 1.0
        r = H.measure(fn, runs=5, warm=1, cap_s=8.0, clock=lambda: t[0])
        self.assertEqual(r['runs'], 1)

    def test_autotune_grows_then_stops(self):
        n, t = H.autotune(lambda n: n * 1000.0, 1, target=40e6, max_n=1 << 30)
        self.assertGreaterEqual(t, 40e6)
        n2, t2 = H.autotune(lambda n: 1.0, 4, target=1e9, max_n=64)
        self.assertEqual(n2, 64)

    def test_rel_err(self):
        self.assertAlmostEqual(H.rel_err([1.0, 2.0], [1.0, 2.0002]), 0.0002 / 2.0002, places=9)

    def test_detect_spill(self):
        self.assertIsNone(H.detect_spill([1.0] * 20))
        self.assertEqual(H.detect_spill([1.0] * 10 + [5.0, 5.0]), 10)
        self.assertIsNone(H.detect_spill([1.0, 9.0]))


class Planning(unittest.TestCase):
    def test_bandwidth_sizes(self):
        s = H.plan_bandwidth_sizes(4 * H.GB, 16 * H.GB)
        self.assertEqual(s, [256 * H.MB, 512 * H.MB, 1 * H.GB, 2 * H.GB, 4 * H.GB])
        self.assertEqual(H.plan_bandwidth_sizes(1 * H.GB, 16 * H.GB), [256 * H.MB, 512 * H.MB, 1 * H.GB])
        self.assertEqual(H.plan_bandwidth_sizes(8 * H.GB, 4 * H.GB), [256 * H.MB, 512 * H.MB, 1 * H.GB])  # two copies must fit 90% of memory
        self.assertEqual(H.plan_bandwidth_sizes(64 * H.MB, 16 * H.GB), [])
        self.assertEqual(H.plan_bandwidth_sizes(4 * H.GB, 16 * H.GB, smoke=True), [1 * H.MB, 4 * H.MB])

    def test_transfer_sizes(self):
        self.assertEqual(H.plan_transfer_sizes(4 * H.GB), [1 * H.MB, 4 * H.MB, 16 * H.MB, 64 * H.MB, 256 * H.MB, 1024 * H.MB])
        self.assertEqual(H.plan_transfer_sizes(100 * H.MB), [1 * H.MB, 4 * H.MB, 16 * H.MB, 64 * H.MB])

    def test_max_buffer_never_over_cap(self):
        s = H.plan_max_buffer_sizes(100 * H.GB)
        self.assertLessEqual(max(s), H.VRAM_CAP_BYTES)
        self.assertEqual(s, sorted(s))
        self.assertIn(4 * H.GB, H.plan_max_buffer_sizes(4 * H.GB))

    def test_vram_chunks_cap(self):
        chunk, n = H.plan_vram_chunks()
        self.assertEqual(chunk, 256 * H.MB)
        self.assertEqual(n, 62)
        self.assertLessEqual(chunk * n, 15.5 * H.GB)

    def test_blender_limits_from_ram(self):
        self.assertAlmostEqual(H.plan_blender_limits(16 * 2 ** 30), 17.2, delta=0.1)
        self.assertEqual(H.plan_blender_limits(128 * 2 ** 30, 85.0), 85.0)
        self.assertEqual(H.plan_blender_limits(0, 40.0), 40.0)


class Errors(unittest.TestCase):
    def test_names(self):
        self.assertEqual(H.error_name(-4), 'CL_MEM_OBJECT_ALLOCATION_FAILURE')
        self.assertEqual(H.error_name(-11), 'CL_BUILD_PROGRAM_FAILURE')
        self.assertEqual(H.error_name(-54), 'CL_INVALID_WORK_GROUP_SIZE')
        self.assertEqual(H.error_name(-61), 'CL_INVALID_BUFFER_SIZE')
        self.assertEqual(H.error_name(0), 'CL_SUCCESS')
        self.assertTrue(H.error_name(-1234).startswith('CL_UNKNOWN_ERROR'))

    def test_no_duplicate_values_and_complete_range(self):
        codes = sorted(H.ERROR_NAMES)
        for c in list(range(-19, 1)) + list(range(-68, -29)):
            self.assertIn(c, codes)


class PCIe(unittest.TestCase):
    def test_decode(self):
        d = H.decode_pcie_link_status(0x0043)      # 8 GT/s x4: what a Thunderbolt 3 eGPU shows
        self.assertEqual((d['gts'], d['width']), (8.0, 4))
        self.assertAlmostEqual(d['gbs_raw'], 3.94, places=2)
        d = H.decode_pcie_link_status(0x1104)     # 16 GT/s x16 (internal slot)
        self.assertEqual((d['gts'], d['width']), (16.0, 16))
        self.assertIsNone(H.decode_pcie_link_status(0)['gts'])


DISPLAYS = """Graphics/Displays:

    AMD Radeon VII:

      Chipset Model: AMD Radeon VII
      Type: GPU
      Bus: PCIe
      PCIe Lane Width: x4
      VRAM (Total): 16 GB
      Vendor: AMD (0x1002)
      Device ID: 0x66af
      Metal Support: Metal 3
      External GPU: Yes

    Intel UHD Graphics 630:

      Chipset Model: Intel UHD Graphics 630
      Type: GPU
      Bus: Built-In
      VRAM (Dynamic, Max): 1536 MB
      Vendor: Intel
      Metal Support: Metal 3
"""

IOREG = """+-o GFX0@0  <class IOPCIDevice, id 0x100000a1f, registered, matched, active, busy 0, retain 30>
    | {
    |   "IOName" = "display"
    |   "vendor-id" = <02100000>
    |   "device-id" = <af660000>
    |   "class-code" = <00000300>
    |   "IOPCIExpressLinkStatus" = 67
    |   "IOPCIExpressLinkCapabilities" = 4170579
    | }
+-o XHC1@14  <class IOPCIDevice, id 0x100000a20, registered>
    | {
    |   "vendor-id" = <86800000>
    |   "class-code" = <00300c00>
    | }
"""

TB = """Thunderbolt/USB4:

    Thunderbolt Bus 1:

      Vendor Name: Apple Inc.
      Device Name: Mac
      Status: Device connected
      Link Status: 0x2
      Speed: Up to 40 Gb/s x2
"""


def fake_runner(argv, timeout=60):
    c = argv[0]
    if c == 'system_profiler' and argv[1] == 'SPDisplaysDataType':
        return 0, DISPLAYS
    if c == 'system_profiler':
        return 0, TB
    if c == 'ioreg':
        return 0, IOREG
    if c == 'sw_vers':
        return 0, 'ProductName:\t\tmacOS\nProductVersion:\t\t13.6.7\nBuildVersion:\t\t22G720\n'
    if c == 'sysctl':
        return 0, 'hw.model: iMac19,1\nhw.memsize: 34359738368\nhw.ncpu: 16\nmachdep.cpu.brand_string: Intel(R) Core(TM) i9\nkern.osrelease: 22.6.0\n'
    if c == 'uname':
        return 0, 'x86_64\n'
    if c.endswith('Blender') or c.endswith('blender'):
        return 0, 'Blender 3.6.5\n\tbuild date: x\n'
    return 127, 'command not found'


class Inventory(unittest.TestCase):
    def test_parse_displays(self):
        cards = GI.parse_displays(DISPLAYS)
        self.assertEqual(len(cards), 2)
        self.assertEqual(cards[0]['chipset'], 'AMD Radeon VII')
        self.assertIn('16 GB', cards[0]['vram'])
        self.assertIn('x4', cards[0]['link'])
        self.assertEqual(cards[1]['bus'], 'Built-In')

    def test_ioreg_nodes_only_amd_display(self):
        nodes = GI.parse_ioreg_gpu_nodes(IOREG)
        self.assertEqual(len(nodes), 1)
        link = GI.decode_link_from_props(nodes[0]['props'])
        self.assertEqual((link['gts'], link['width']), (8.0, 4))

    def test_thunderbolt_lines(self):
        lines = GI.parse_thunderbolt(TB)
        self.assertTrue(any('40 Gb/s' in l for l in lines))

    def test_blender_version(self):
        self.assertEqual(GI.parse_blender_version('Blender 3.6.5\n x')['version'], '3.6.5')
        self.assertIsNone(GI.parse_blender_version('nothing')['version'])

    def test_find_blender_order(self):
        self.assertEqual(GI.find_blender('/x/B'), '/x/B')
        self.assertEqual(GI.find_blender(None, which=lambda n: '/usr/bin/blender', exists=lambda p: False), '/usr/bin/blender')
        self.assertEqual(GI.find_blender(None, which=lambda n: None, exists=lambda p: p == GI.BLENDER_GUESSES[0]), GI.BLENDER_GUESSES[0])
        self.assertIsNone(GI.find_blender(None, which=lambda n: None, exists=lambda p: False))

    def test_opencl_status_fakes(self):
        d = GI.opencl_status(exists=lambda p: False, loader=lambda p: object())
        self.assertFalse(d['exists'])
        self.assertTrue(d['loadable'])           # macOS 11+: not on disk, still loads
        self.assertIn('note', d)
        d = GI.opencl_status(exists=lambda p: False, loader=lambda p: (_ for _ in ()).throw(OSError('nope')))
        self.assertFalse(d['loadable'])
        d = GI.opencl_status(exists=lambda p: True, loader=lambda p: object())
        self.assertTrue(d['loadable'])

        def boom(p):
            raise OSError('image not found')
        d = GI.opencl_status(exists=lambda p: True, loader=boom)
        self.assertFalse(d['loadable'])
        self.assertIn('image not found', d['error'])

    def test_collect_fake_machine_scrubbed(self):
        inv = GI.collect(runner=fake_runner, blender='/Applications/Blender.app/Contents/MacOS/Blender',
                         opencl={'exists': True, 'loadable': True, 'path': GI.OPENCL_FRAMEWORK}, which=lambda n: None, exists=lambda p: False)
        self.assertEqual(inv['host']['model'], 'iMac19,1')
        self.assertEqual(inv['host']['memsize'], 32 * 2 ** 30)
        self.assertIn('13.6.7', inv['host']['macos'])
        self.assertEqual(inv['gpu']['pcie_link']['width'], 4)
        self.assertIn('8.0 GT/s x4', inv['gpu']['pcie_link_decoded'])
        self.assertEqual(inv['blender']['version'], '3.6.5')
        self.assertNotIn('/Users/', json.dumps(inv))

    def test_collect_all_commands_missing(self):
        inv = GI.collect(runner=lambda a, timeout=60: (127, 'command not found'), which=lambda n: None, exists=lambda p: False,
                         opencl={'exists': False, 'loadable': False})
        self.assertEqual(inv['gpu']['names'], [])
        self.assertEqual(inv['gpu']['pcie_link_decoded'], 'not exposed by ioreg')
        self.assertIsNone(inv['blender']['version'])
        self.assertIn('displays', inv['errors'])

    def test_commands_are_read_only(self):
        for argv in GI.COMMANDS.values():
            self.assertIn(argv[0], ('system_profiler', 'ioreg', 'sw_vers', 'sysctl', 'uname'))
            self.assertFalse(any(w in argv for w in ('-w', 'set', 'write')) and argv[0] == 'sysctl')


def radeon_results():
    sec = {
        'fma_f32': {'status': 'PASSED', 'gflops': 12900.0},
        'fma_f64': {'status': 'PASSED', 'gflops': 3400.0},
        'mem_bw': {'status': 'PASSED', 'best': {'copy': 780.0, 'read': 860.0, 'write': 800.0}},
        'local_bw': {'status': 'PASSED', 'gbs': 9000.0},
        'transfer': {'status': 'PASSED', 'h2d_best_gbs': 2.7, 'd2h_best_gbs': 2.9},
        'latency': {'status': 'PASSED', 'single_us': 60.0, 'batched_us': 8.0},
        'shallow_water': {'status': 'PASSED', 'check': {'passed': True, 'fp32_err_long': 3e-5, 'fp64_err_long': 1e-14},
                          'rows': [{'n': 2048, 'dtype': 'fp32', 'steps_per_s': 900.0, 'eff_gbs': 600.0},
                                   {'n': 2048, 'dtype': 'fp64', 'steps_per_s': 300.0, 'eff_gbs': 400.0},
                                   {'n': 4096, 'dtype': 'fp32', 'steps_per_s': 40.0, 'eff_gbs': 700.0}]},
        'agents': {'status': 'PASSED', 'rows': [{'n': 100000, 'steps_per_s': 5000.0}, {'n': 1000000, 'steps_per_s': 140.0}, {'n': 4000000, 'steps_per_s': 20.0}]},
        'vram': {'status': 'PASSED', 'total_gb': 15.5, 'cap_reached': True, 'verify_bad': 0, 'spill_at_gb': None},
        'max_buffer': {'status': 'PASSED', 'largest_ok_gb': 4.0, 'reported_max_gb': 4.0},
        'reduction': {'status': 'PASSED', 'ms': 0.4, 'gbs': 640.0, 'float_rel_err': 1e-7, 'int_exact': True},
        'scan': {'status': 'PASSED', 'rows': [{'n': 1048576, 'ms': 0.2, 'mps': 5000.0, 'exact': True}]},
    }
    return {'meta': {'smoke': False}, 'opencl': {'device': {'name': 'AMD Radeon VII Compute Engine', 'compute_units': 60, 'clock_mhz': 1801, 'global_mem': 16 * H.GB, 'max_alloc': 4 * H.GB}, 'sections': sec},
            'blender': {'scenes': {'tri_5M': {'renders': [{'resolution': '1920x1080', 'seconds': 40.0, 'samples_per_s': 3.2, 'samples': 128, 'device': 'AMD Radeon VII', 'device_ok': True, 'peak_mem': 'device 900 MB'}]}},
                        'growth': {'largest_ok_mtris': 21.0, 'stopped_because': 'memory safety limit'}},
            'steps': [{'name': 'init', 'status': 'PASSED', 'seconds': 0.1}], 'inventory': {'host': {'macos': 'macOS 13', 'model': 'x', 'memsize': 32 * H.GB}}}


class Summary(unittest.TestCase):
    def setUp(self):
        self.rows, self.flags = H.build_summary(radeon_results())
        self.text = '\n'.join('%s | %s | %s' % r for r in self.rows)

    def test_agents_yes_no(self):
        self.assertIn('can run 1,000,000 agents at 60 updates per second: YES', self.text)
        self.assertIn('can run 4,000,000 agents at 60 updates per second: NO', self.text)

    def test_grid_rows(self):
        self.assertIn('World grid 4096 x 4096 (water, FP32) | 40 steps per second', self.text)
        self.assertIn('60 steps per second: NO', self.text)

    def test_fp64_answer(self):
        self.assertIn('FP64 for hydrology (water flow) | YES: FP64 is 3.0 times slower', self.text)
        self.assertIn('FP64 is 3.8 times slower', self.text)

    def test_link_row(self):
        self.assertIn('filling 16 GB of card memory takes about 6 seconds', self.text)

    def test_no_flags_for_healthy_card(self):
        self.assertEqual(self.flags, [])

    def test_flags_for_wrong_numbers(self):
        r = radeon_results()
        s = r['opencl']['sections']
        s['fma_f32']['gflops'] = 20000.0
        s['mem_bw']['best']['copy'] = 2000.0
        s['transfer']['h2d_best_gbs'] = 9.0
        s['vram'].update(total_gb=9.0, spill_at_gb=8.0, verify_bad=2)
        s['scan']['rows'][0]['exact'] = False
        _, flags = H.build_summary(r)
        j = ' '.join(flags)
        for key in ('paper maximum', 'Thunderbolt 3', 'only 9.0 GB', 'slowed down', 'wrong values', 'prefix sum'):
            self.assertIn(key, j)

    def test_hydrology_no_when_64_much_slower_and_fp32_fine(self):
        r = radeon_results()
        r['opencl']['sections']['shallow_water']['rows'][1]['steps_per_s'] = 50.0
        rows, _ = H.build_summary(r)
        self.assertTrue(any(q.startswith('FP64 for hydrology') and a.startswith('NO') for q, a, d in rows))
        r['opencl']['sections']['shallow_water']['check']['fp32_err_long'] = 0.05
        rows, _ = H.build_summary(r)
        self.assertTrue(any(q.startswith('FP64 for hydrology') and a.startswith('YES') for q, a, d in rows))

    def test_empty_results_do_not_crash(self):
        rows, flags = H.build_summary({})
        self.assertEqual(flags, [])
        self.assertIn('# HW-12', H.make_report_md({}))

    def test_failed_sections_are_not_measured(self):
        r = radeon_results()
        r['opencl']['sections']['fma_f32'] = {'status': 'FAILED', 'error': 'CL_BUILD_PROGRAM_FAILURE'}
        rows, _ = H.build_summary(r)
        self.assertTrue(any(q == 'Raw FP32 speed' and a == 'not measured' for q, a, d in rows))

    def test_report_markdown(self):
        md = H.make_report_md(radeon_results())
        self.assertIn('## What the numbers mean', md)
        self.assertIn('nothing flagged', md)
        self.assertIn('Cycles tri_5M 1920x1080', md)
        self.assertIn('21.0 million triangles', md)

    def test_report_scrubbed(self):
        r = radeon_results()
        r['steps'].append({'name': 'x', 'status': 'FAILED', 'seconds': 1, 'error': 'failed in /Users/harry/Desktop/zzz'})
        self.assertNotIn('harry', H.make_report_md(r))


class BlenderLog(unittest.TestCase):
    LOG = ("Fra:1 Mem:621.39M (Peak 1118.40M) | Time:00:07.91 | Mem:1500.5M, Peak:2048.0M | Sample 16/16\n"
           "HW12_DEVICE_USED METAL ['AMD Radeon VII (Metal)']\nSystem is out of GPU memory\n")

    def test_parse(self):
        d = H.parse_cycles_log(self.LOG)
        self.assertEqual(d['host_peak_mb'], 1118.4)
        self.assertEqual(d['device_peak_mb'], 2048.0)
        self.assertEqual(len(d['oom_lines']), 1)
        self.assertIn('Radeon', d['device_lines'][0])

    def test_parse_empty(self):
        d = H.parse_cycles_log('')
        self.assertIsNone(d['host_peak_mb'])


class StepList(unittest.TestCase):
    def test_steplist_matches_steps(self):
        lines = RA.steplist_lines()
        self.assertEqual(len(lines), len(RA.STEPS))
        self.assertTrue(lines[0].endswith('--step init'))
        self.assertTrue(lines[-1].endswith('--step finalize'))
        self.assertTrue(all(l.startswith('python3 run_all.py --out {OUT} --step ') for l in lines))
        self.assertTrue(all('{BLENDER}' in l for l in lines if 'blender' in l.split('--step ')[1].split()[0]))

    def test_every_step_has_cap_and_expected(self):
        for n, kind, arg, cap, exp, desc in RA.STEPS:
            self.assertGreater(cap, exp, n)
            self.assertTrue(desc)

    def test_disk_check_before_blender(self):
        names = [s[0] for s in RA.STEPS]
        self.assertLess(names.index('disk_check'), min(i for i, n in enumerate(names) if n.startswith('blender')))

    def test_steplist_file_in_package_matches(self):
        p = os.path.join(PKG, 'STEPLIST.txt')
        if os.path.exists(p):
            self.assertEqual(read(p), '\n'.join(RA.steplist_lines()) + '\n')

    def test_growth_levels(self):
        self.assertAlmostEqual(RA.tris_m(1, 10), 5.24288)
        self.assertAlmostEqual(RA.tris_m(4, 10), 20.97152)

    def test_tri_scene_counts(self):
        import math
        for nsph, k, lo, hi in ((4, 8, 1.3, 1.4), (4, 9, 5.2, 5.3), (4, 10, 20.9, 21.0)):
            self.assertTrue(lo < RA.tris_m(nsph, k) < hi)


class PackageRules(unittest.TestCase):
    def test_no_bytecode_or_pycache_in_package(self):
        for root, dirs, files in os.walk(PKG):
            self.assertNotIn('__pycache__', dirs)
            self.assertFalse([f for f in files if f.endswith('.pyc')])

    def test_python_files_only_import_allowed_modules(self):
        allowed = {'argparse', 'ctypes', 'json', 'os', 'sys', 'time', 'struct', 'traceback', 'math', 're', 'glob', 'shutil', 'subprocess',
                   'zipfile', 'numpy', 'hw12_common', 'opencl_ctypes', 'opencl_kernels', 'sim_refs', 'gpu_inventory', 'bpy', 'mathutils',
                   'resource', 'PIL'}
        import re
        for fn in os.listdir(PKG):
            if fn.endswith('.py'):
                src = read(os.path.join(PKG, fn))
                for m in re.finditer(r'^\s*(?:import|from)\s+([A-Za-z_][\w]*)', src, flags=re.M):
                    mod = m.group(1)
                    if mod in ('run_all', 'opencl_bench', 'blender_cycles_bench'):
                        continue
                    self.assertIn(mod, allowed, '%s imports %s' % (fn, mod))
                self.assertFalse(re.search(r'^\s*(import|from)\s+pyopencl', src, flags=re.M), fn)

    def test_no_network_or_install_calls(self):
        import re
        bad = re.compile(r'\b(urllib|requests|socket|http\.client|pip install|rmtree|os\.remove|os\.unlink|shutil\.move)\b')
        for fn in os.listdir(PKG):
            if fn.endswith('.py'):
                for i, line in enumerate(read(os.path.join(PKG, fn)).splitlines(), 1):
                    if line.lstrip().startswith('#') or '"""' in line:
                        continue
                    self.assertIsNone(bad.search(line), '%s:%d %s' % (fn, i, line.strip()))


if __name__ == '__main__':
    unittest.main(verbosity=1)
