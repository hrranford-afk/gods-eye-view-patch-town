"""Tests of the order runner's control flow with fake Blender programs and a missing OpenCL library: STOP rules, BLOCKED / FAILED recording,
exit codes, time cap kill, continue-after-failure, finalize with partial data. No GPU needed. Run: python3 -B tests/test_run_all.py"""
import json
import os
import stat
import subprocess
import sys
import tempfile
import time
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.abspath(os.path.join(HERE, '..', 'hw12_pkg'))
sys.path.insert(0, PKG)
sys.dont_write_bytecode = True
import run_all as RA  # noqa: E402

try:
    import numpy, PIL  # noqa: F401, E401
    HAVE = True
except ImportError:
    HAVE = False


def fake(path, body):
    with open(path, 'w') as f:
        f.write('#!/bin/bash\n' + body + '\n')
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)
    return path


def run(args, env=None):
    e = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
    e.update(env or {})
    return subprocess.run([sys.executable, os.path.join(PKG, 'run_all.py')] + args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=e, timeout=600)


def steps_of(out):
    with open(os.path.join(out, 'hw12', 'steps.json')) as f:
        return {s['name']: s for s in json.load(f)}


@unittest.skipUnless(HAVE, 'needs numpy and PIL')
class Runner(unittest.TestCase):
    def test_init_stops_if_folder_exists(self):
        with tempfile.TemporaryDirectory() as d:
            p = run(['--out', d, '--step', 'init', '--smoke'])
            self.assertEqual(p.returncode, 2)
            self.assertIn('already exists', p.stdout.decode())

    def test_init_stops_under_disk_floor(self):
        with tempfile.TemporaryDirectory() as d:
            p = run(['--out', os.path.join(d, 'o'), '--step', 'init', '--min-free-gb', '999999999'])
            self.assertEqual(p.returncode, 2)
            self.assertIn('floor', p.stdout.decode())
            self.assertFalse(os.path.exists(os.path.join(d, 'o')))

    def test_step_before_init_is_blocked(self):
        with tempfile.TemporaryDirectory() as d:
            p = run(['--out', os.path.join(d, 'o'), '--step', 'inventory', '--smoke'])
            self.assertEqual(p.returncode, 2)
            self.assertIn('BLOCKED', p.stdout.decode())

    def test_disk_check_stops_blender_steps(self):
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, 'o')
            self.assertEqual(run(['--out', out, '--step', 'init', '--smoke']).returncode, 0)
            p = run(['--out', out, '--step', 'disk_check', '--min-free-gb', '999999999'])
            self.assertEqual(p.returncode, 2)
            self.assertEqual(steps_of(out)['disk_check']['status'], 'BLOCKED')
            self.assertIn('STOP', steps_of(out)['disk_check']['error'])
            p = run(['--out', out, '--step', 'blender_tri_1M', '--blender', '/bin/true', '--min-free-gb', '999999999'])
            self.assertEqual(p.returncode, 2)

    def test_all_failures_recorded_and_run_continues(self):
        with tempfile.TemporaryDirectory() as d:
            bl = fake(os.path.join(d, 'blender_no_gpu'), 'echo "HW12_DEVICE_NOT_FOUND wanted a GPU whose name contains Radeon; seen []"; exit 4')
            out = os.path.join(d, 'o')
            p = run(['--out', out, '--smoke', '--blender', bl], {'HW12_OPENCL_LIB': '/nonexistent/OpenCL'})
            self.assertEqual(p.returncode, 1, p.stdout.decode())
            s = steps_of(out)
            self.assertEqual(s['init']['status'], 'PASSED')
            self.assertEqual(s['inventory']['status'], 'PASSED')
            for n in ('opencl_basic', 'opencl_transfer', 'opencl_sim', 'opencl_parallel', 'opencl_vram'):
                self.assertEqual(s[n]['status'], 'BLOCKED', n)
                self.assertIn('/nonexistent/OpenCL', s[n]['error'])
            self.assertEqual(s['disk_check']['status'], 'PASSED')
            for n in ('blender_tri_1M', 'blender_glass_volume'):
                self.assertEqual(s[n]['status'], 'BLOCKED', n)
                self.assertIn('Radeon', s[n]['error'])
            self.assertEqual(s['finalize']['status'], 'PASSED')
            # every step ran: nothing aborted the order
            self.assertEqual(set(s), {x[0] for x in RA.STEPS})
            hw = os.path.join(out, 'hw12')
            for f in ('results.json', 'REPORT.md', 'HW12_RESULT_DRAFT.md', 'HW12_send_back.zip'):
                self.assertTrue(os.path.exists(os.path.join(hw, f)), f)
            self.assertIn('BLOCKED', open(os.path.join(hw, 'HW12_RESULT_DRAFT.md')).read())

    def test_blender_crash_is_failed_with_error_text(self):
        with tempfile.TemporaryDirectory() as d:
            bl = fake(os.path.join(d, 'blender_crash'), 'echo "Error: Python: Traceback boom"; exit 1')
            out = os.path.join(d, 'o')
            self.assertEqual(run(['--out', out, '--step', 'init', '--smoke']).returncode, 0)
            p = run(['--out', out, '--step', 'blender_tri_5M', '--blender', bl, '--smoke'])
            self.assertEqual(p.returncode, 1)
            st = steps_of(out)['blender_tri_5M']
            self.assertEqual(st['status'], 'FAILED')
            self.assertIn('boom', st['error'])

    def test_missing_blender_is_blocked(self):
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, 'o')
            self.assertEqual(run(['--out', out, '--step', 'init', '--smoke']).returncode, 0)
            p = run(['--out', out, '--step', 'blender_tex_4K_x4', '--blender', '/no/such/Blender', '--smoke'])
            self.assertEqual(p.returncode, 1)
            self.assertEqual(steps_of(out)['blender_tex_4K_x4']['status'], 'BLOCKED')

    def test_log_is_scrubbed(self):
        with tempfile.TemporaryDirectory() as d:
            bl = fake(os.path.join(d, 'blender_chatty'), 'echo "Saved: /Users/harry/Desktop/secret.png serial Serial Number (system): ABC12345"; exit 1')
            out = os.path.join(d, 'o')
            run(['--out', out, '--step', 'init', '--smoke'])
            run(['--out', out, '--step', 'blender_tri_5M', '--blender', bl, '--smoke'])
            log = open(os.path.join(out, 'hw12', 'logs', 'blender_tri_5M.log')).read()
            self.assertNotIn('harry', log)
            self.assertNotIn('ABC12345', log)
            self.assertIn('FAILED', json.dumps(steps_of(out)['blender_tri_5M']))
            self.assertNotIn('harry', json.dumps(steps_of(out)))

    def test_time_cap_kills_step(self):
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, 'o')
            run(['--out', out, '--step', 'init', '--smoke'])

            class A:
                pass
            a = A()
            a.out, a.smoke, a.python, a.min_free_gb = out, True, None, 30.0
            c = RA.Ctx(a)
            t = time.time()
            rc, text, sec, timed_out = c.sub('captest', ['sleep', '30'], 1)
            self.assertTrue(timed_out)
            self.assertEqual(rc, 124)
            self.assertLess(time.time() - t, 10)
            self.assertIn('TIMED OUT', text)

    def test_list_and_steplist_cli(self):
        p = run(['--list'])
        self.assertEqual(p.returncode, 0)
        text = p.stdout.decode()
        for n, *_ in RA.STEPS:
            self.assertIn(n, text)
        with tempfile.TemporaryDirectory() as d:
            f = os.path.join(d, 'S.txt')
            self.assertEqual(run(['--write-steplist', f]).returncode, 0)
            self.assertEqual(open(f).read().strip().split('\n'), RA.steplist_lines())

    def test_no_bytecode_written_by_runs(self):
        for root, dirs, files in os.walk(PKG):
            self.assertNotIn('__pycache__', dirs)


if __name__ == '__main__':
    unittest.main(verbosity=1)
