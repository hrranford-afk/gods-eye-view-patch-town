"""Compare a depth dump from the GPU page (raw little-endian float32, n*n, row-major [y][x]) with the numpy reference.
usage: cpu_compare.py ocean|flood n steps dumpfile seed
Tolerances (stated, not tuned after the fact): max abs error < 1e-3 m AND mean abs error < 1e-5 m on a field whose waves are about 0.05 m;
for the flood: max abs error < 2e-3 m, mean abs < 2e-5 m. Exit code 0 = within tolerance."""
import sys
import numpy as np
from ocean_cpu import run_ocean
from flood_cpu import run_flood

kind, n, steps, path, seed = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], int(sys.argv[5])
gpu = np.fromfile(path, dtype='<f4').reshape(n, n)
if kind == 'ocean':
    d, f, cfg = run_ocean(n, steps); tol_max, tol_mean = 1e-3, 1e-5
else:
    d, f, bed, cfg = run_flood(seed, n, steps); tol_max, tol_mean = 2e-3, 2e-5
err = np.abs(gpu.astype(np.float64) - d.astype(np.float64))
print('%s n=%d steps=%d: max abs err %.3e m, mean abs err %.3e m, field range %.4f..%.4f, tolerance max %.0e mean %.0e' % (kind, n, steps, err.max(), err.mean(), float(d.min()), float(d.max()), tol_max, tol_mean))
sys.exit(0 if (err.max() < tol_max and err.mean() < tol_mean and np.isfinite(gpu).all()) else 1)
