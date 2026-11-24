"""Tests for the numpy reference (ocean_cpu.py, flood_cpu.py). Run: python3 gpusim/test_cpu.py  (or python3 -m unittest test_cpu in this folder).
These prove the REFERENCE is sane, so that 'the GPU agrees with it' means something."""
import unittest
import numpy as np
from ocean_cpu import step_pipes, gauss, run_ocean, ocean_config, F32
import flood_cpu

def total(d, dx): return float(d.astype(np.float64).sum()) * dx * dx

class Reference(unittest.TestCase):
    def test_lake_at_rest_stays_flat(self):
        n = 64; d = np.full((n, n), 2.0, F32); f = np.zeros((4, n, n), F32); bed = np.zeros((n, n), F32)
        for _ in range(200): d, f = step_pipes(d, f, bed, 1/60, 9.81, 1.0, 0.9995, np.zeros((n, n), F32))
        self.assertEqual(float(np.abs(d - 2.0).max()), 0.0)

    def test_closed_box_conserves_volume(self):
        n = 64; rng = np.random.default_rng(1); d = (2 + 0.3 * rng.random((n, n))).astype(F32); f = np.zeros((4, n, n), F32); bed = np.zeros((n, n), F32)
        v0 = total(d, 1.0)
        for _ in range(500): d, f = step_pipes(d, f, bed, 1/60, 9.81, 1.0, 0.9995, np.zeros((n, n), F32))
        self.assertLess(abs(total(d, 1.0) - v0) / v0, 1e-6)

    def test_sources_add_exactly_their_volume(self):
        n = 64; d = np.full((n, n), 2.0, F32); f = np.zeros((4, n, n), F32); bed = np.zeros((n, n), F32); v0 = total(d, 1.0)
        src = gauss(n, 32, 32, 4, 0.05); added = 0.0
        for _ in range(300):
            d, f = step_pipes(d, f, bed, 1/60, 9.81, 1.0, 0.9995, src); added += float(src.astype(np.float64).sum()) / 60
        self.assertLess(abs(total(d, 1.0) - (v0 + added)) / (v0 + added), 1e-6)

    def test_stable_2000_steps_no_nan(self):
        d, f, cfg = run_ocean(64, 2000)
        self.assertTrue(np.isfinite(d).all()); self.assertTrue(np.isfinite(f).all()); self.assertGreaterEqual(float(d.min()), 0.0); self.assertLess(float(d.max()), 3.0)

    def test_deterministic_same_machine(self):
        a, _, _ = run_ocean(64, 300); b, _, _ = run_ocean(64, 300)
        self.assertTrue(np.array_equal(a, b))

    def test_mirror_symmetry(self):
        n = 64; d = np.full((n, n), 2.0, F32); f = np.zeros((4, n, n), F32); bed = np.zeros((n, n), F32); src = gauss(n, 32, 32, 3, 0.05)   # centre of the grid (cell edge at 32)
        for _ in range(100): d, f = step_pipes(d, f, bed, 1/60, 9.81, 1.0, 0.9995, src)
        self.assertLess(float(np.abs(d - d[:, ::-1]).max()), 1e-5); self.assertLess(float(np.abs(d - d[::-1, :]).max()), 1e-5)

    def test_wave_speed_close_to_sqrt_gd(self):
        n = 256; dx = 1.0; xs = np.arange(n) + 0.5; dt = 1/60
        d = (2.0 + 0.01 * np.exp(-(xs[None, :] - 128.0) ** 2 / (2 * 6.0 ** 2)) * np.ones((n, 1))).astype(F32); f = np.zeros((4, n, n), F32); bed = np.zeros((n, n), F32)
        for _ in range(300): d, f = step_pipes(d, f, bed, dt, 9.81, dx, 1.0, np.zeros((n, n), F32))
        r = (d[128] - 2.0).astype(np.float64); k = 128 + int(np.argmax(r[128:])); m = slice(k - 12, k + 13)
        speed = ((xs[m] * r[m]).sum() / r[m].sum() - 128.0) / (300 * dt)     # centroid of the right-going lump
        self.assertAlmostEqual(speed, np.sqrt(9.81 * 2.0), delta=0.45)   # 4.43 m/s in theory; the scheme runs a few percent fast (see GPUSIM.md)

    def test_cfl_documented(self):
        for n in (256, 1024):
            c = ocean_config(n); courant = np.sqrt(c['g'] * c['d0']) * c['dt'] / c['dx']; self.assertLess(courant, 0.7)

class Flood(unittest.TestCase):
    def test_world_loads_and_resamples(self):
        man, h = flood_cpu.load_world(153); self.assertEqual(h.shape, (129, 129))
        r = flood_cpu.resample(h, 129); self.assertLess(float(np.abs(r - h).max()), 1e-12)   # same size = identity
        r2 = flood_cpu.resample(h, 256); self.assertAlmostEqual(r2[0, 0], h[0, 0]); self.assertAlmostEqual(r2[-1, -1], h[-1, -1])

    def test_sea_at_rest_is_well_balanced(self):
        bed, d0, cfg = flood_cpu.setup(153, 128); d = d0.copy(); f = np.zeros((4, 128, 128), F32)
        for _ in range(200): d, f = step_pipes(d, f, bed, cfg['dt'], cfg['g'], cfg['dx'], cfg['damp'], np.zeros((128, 128), F32))
        self.assertLess(float(np.abs(d - d0).max()), 1e-4)   # still water must stay still on a real coastline

    def test_rain_runs_downhill_and_volume_balances(self):
        n = 128; bed, d0, cfg = flood_cpu.setup(153, n); d = d0.copy(); f = np.zeros((4, n, n), F32); v0 = total(d, cfg['dx']); added = 0.0
        for s in range(1200):
            src = flood_cpu.flood_sources(cfg, s); d, f = step_pipes(d, f, bed, cfg['dt'], cfg['g'], cfg['dx'], cfg['damp'], src); added += float(src.astype(np.float64).sum()) * cfg['dt'] * cfg['dx'] ** 2
        self.assertLess(abs(total(d, cfg['dx']) - (v0 + added)) / (v0 + added), 1e-5)
        self.assertTrue(np.isfinite(d).all())
        land = bed > 0.5; land_at_end_of_rain = float(d[land].astype(np.float64).sum())
        for s in range(1200, 2700):
            d, f = step_pipes(d, f, bed, cfg['dt'], cfg['g'], cfg['dx'], cfg['damp'], np.zeros((n, n), F32))
        self.assertGreater(land_at_end_of_rain, 0.0)
        self.assertLess(float(d[land].astype(np.float64).sum()), land_at_end_of_rain)   # water has run off the high land toward the sea

if __name__ == '__main__':
    unittest.main(verbosity=2)
