"""CPU reference for gpusim/flood_gpgpu.html: the real exported world heightfield (landform/worlds/seedNNNN/world.bin),
resampled to an n x n grid, with a rain pulse. Same scheme as ocean_cpu.py (imports step_pipes)."""
import json, os
import numpy as np
from ocean_cpu import step_pipes, gauss, F32

HERE = os.path.dirname(os.path.abspath(__file__))
WORLDS = os.path.join(HERE, '..', 'landform', 'worlds')
SEA_FLOOR_CAP = -8.0   # metres: deeper sea bed is clamped (keeps the wave speed, and so the time step, small)


def load_world(seed):
    d = os.path.join(WORLDS, 'seed%04d' % seed)
    man = json.load(open(os.path.join(d, 'manifest.json')))
    nx = man['nx']
    h = np.fromfile(os.path.join(d, 'world.bin'), dtype='<i2', count=nx * nx).reshape(nx, nx).astype(np.float64) / man['height_scale']
    return man, h   # h[row][col], row 0 = north edge, metres


def resample(h, n):
    """Bilinear, corner aligned: sample u = i * (nx-1)/(n-1). Computed in float64 then cast to float32 (the page does the same)."""
    nx = h.shape[0]
    u = np.arange(n, dtype=np.float64) * (nx - 1) / (n - 1)
    i0 = np.minimum(np.floor(u).astype(int), nx - 2)
    t = u - i0
    rows = h[i0, :] * (1 - t)[:, None] + h[i0 + 1, :] * t[:, None]
    out = rows[:, i0] * (1 - t)[None, :] + rows[:, i0 + 1] * t[None, :]
    return out


def flood_config(seed, n, man):
    return dict(seed=seed, n=n, dx=man['window_m'] / (n - 1), dt=0.04, g=9.81, damp=0.995, rainSigmaM=60.0, rainRate=0.012, rainSteps=900)


def setup(seed=153, n=256):
    man, h = load_world(seed)
    bed = np.maximum(resample(h, n), SEA_FLOOR_CAP).astype(F32)
    d0 = np.maximum(F32(0), -bed).astype(F32)       # sea at rest at level 0: surface (bed + depth) is 0 in the sea
    cfg = flood_config(seed, n, man)
    # rain cell centre: the highest land cell (first in row-major order if tied)
    j, i = np.unravel_index(np.argmax(bed), bed.shape)
    cfg['rainCx'], cfg['rainCy'] = float(i) + 0.5, float(j) + 0.5
    return bed, d0, cfg


def flood_sources(cfg, step):
    n = cfg['n']
    if step >= cfg['rainSteps']:
        return np.zeros((n, n), dtype=F32)
    return gauss(n, cfg['rainCx'], cfg['rainCy'], cfg['rainSigmaM'] / cfg['dx'], cfg['rainRate'])


def run_flood(seed, n, steps):
    bed, d0, cfg = setup(seed, n)
    d = d0.copy(); f = np.zeros((4, n, n), dtype=F32)
    for s in range(steps):
        d, f = step_pipes(d, f, bed, cfg['dt'], cfg['g'], cfg['dx'], cfg['damp'], flood_sources(cfg, s))
    return d, f, bed, cfg


if __name__ == '__main__':
    import sys, time
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 153
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 256
    k = int(sys.argv[3]) if len(sys.argv) > 3 else 300
    t = time.time(); d, f, bed, cfg = run_flood(seed, n, k)
    land = bed > 0
    print('seed', seed, 'n', n, 'steps', k, 'volume m3', float(d.astype(np.float64).sum()) * cfg['dx'] ** 2, 'land depth max', float(d[land].max()), 's', round(time.time() - t, 2))
