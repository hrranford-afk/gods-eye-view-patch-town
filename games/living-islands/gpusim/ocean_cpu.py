"""CPU reference for gpusim/ocean_gpgpu.html: the same virtual-pipes shallow-water scheme in numpy float32.
Also the reference for flood_gpgpu.html (the scheme is shared): see flood_cpu.py, which imports step_pipes from here.
The operation order mirrors the shader so float32 results agree to a few ulp per step (the GPU may fuse multiply-add and uses its own exp)."""
import numpy as np

F32 = np.float32


def step_pipes(d, f, bed, dt, g, dx, damp, src):
    """One step. d: (n,n) depth, f: (4,n,n) outflow to W,E,S,N (axis 0 = x, axis 1 = y is NOT used: arrays are [y][x]).
    src: (n,n) float32 source rate in m/s (already evaluated). Returns new d, f."""
    n = d.shape[0]
    dt, g, dx, damp = F32(dt), F32(g), F32(dx), F32(damp)
    k = F32(dt * g)
    h = (d + bed).astype(F32)
    nb = np.broadcast_to(h, (4, n, n)).copy()          # outside the grid: the cell's own values (the flux there is masked to 0 anyway)
    nbed = np.broadcast_to(bed, (4, n, n)).copy()
    nb[0, :, 1:] = h[:, :-1]; nbed[0, :, 1:] = bed[:, :-1]    # west neighbour (x-1)
    nb[1, :, :-1] = h[:, 1:]; nbed[1, :, :-1] = bed[:, 1:]    # east (x+1)
    nb[2, 1:, :] = h[:-1, :]; nbed[2, 1:, :] = bed[:-1, :]    # south (y-1)
    nb[3, :-1, :] = h[1:, :]; nbed[3, :-1, :] = bed[1:, :]    # north (y+1)
    inside = np.ones((4, n, n), dtype=F32)
    inside[0, :, 0] = 0; inside[1, :, -1] = 0; inside[2, 0, :] = 0; inside[3, -1, :] = 0
    # face depth by hydrostatic reconstruction: highest surface minus highest bed of the two cells
    df = np.maximum(F32(0), np.maximum(h[None], nb) - np.maximum(bed[None], nbed)).astype(F32)
    fn = np.maximum(F32(0), f * damp + k * df * (h[None] - nb)).astype(F32) * inside
    tot = (fn[0] + fn[1] + fn[2] + fn[3]).astype(F32)
    with np.errstate(divide='ignore', invalid='ignore'):
        sc = np.where(tot > 0, np.minimum(F32(1), d * dx * dx / (tot * dt)), F32(1)).astype(F32)
    fn = (fn * sc[None]).astype(F32)
    infl = np.zeros((n, n), dtype=F32)
    infl[:, 1:] += fn[1][:, :-1]     # from the west neighbour: its flux toward +x
    infl[:, :-1] += fn[0][:, 1:]     # from the east neighbour: its flux toward -x
    infl[1:, :] += fn[3][:-1, :]     # from the south neighbour: its flux toward +y
    infl[:-1, :] += fn[2][1:, :]     # from the north neighbour: its flux toward -y
    out = (fn[0] + fn[1] + fn[2] + fn[3]).astype(F32)
    dn = (d + dt * (infl - out) / (dx * dx)).astype(F32)
    dn = np.maximum(F32(0), dn + dt * src).astype(F32)
    return dn, fn


def gauss(n, cx, cy, sigma, amp):
    """amp * exp(-r^2 / (2 sigma^2)) at cell centres (x = column + 0.5, y = row + 0.5)."""
    x = (np.arange(n, dtype=F32) + F32(0.5))[None, :]
    y = (np.arange(n, dtype=F32) + F32(0.5))[:, None]
    r2 = (x - F32(cx)) ** 2 + (y - F32(cy)) ** 2
    return (F32(amp) * np.exp(-r2 / F32(2 * sigma * sigma))).astype(F32)


def ocean_config(n):
    return dict(n=n, dx=256.0 / n, dt=1 / 60, g=9.81, damp=0.9995, d0=2.0, rainSigmaM=10, rainRate=0.05, rainSteps=1500,
                boatSigmaM=3, boatAmp=0.3, boatRadiusM=40, boatOmega=0.01)


def ocean_sources(cfg, step):
    """The same pure function of the step number as the page's sources(step). Returns (n,n) float32 rate in m/s."""
    n, dx = cfg['n'], cfg['dx']
    src = np.zeros((n, n), dtype=F32)
    if step < cfg['rainSteps']:
        u = (step % 1500) / 1500
        src += gauss(n, (0.12 + 0.76 * u) * n, (0.35 + 0.1 * np.sin(u * 6.2831853)) * n, cfg['rainSigmaM'] / dx, cfg['rainRate'])
    a = step * cfg['boatOmega']
    bx, by = 0.5 * n + (cfg['boatRadiusM'] / dx) * np.cos(a), 0.5 * n + (cfg['boatRadiusM'] / dx) * np.sin(a)
    sg = cfg['boatSigmaM'] / dx
    dxv, dyv = -np.sin(a) * 1.5 * sg, np.cos(a) * 1.5 * sg
    src += gauss(n, bx + dxv, by + dyv, sg, cfg['boatAmp']) - gauss(n, bx - dxv, by - dyv, sg, cfg['boatAmp'])
    return src.astype(F32)


def run_ocean(n, steps, cfg=None):
    cfg = cfg or ocean_config(n)
    d = np.full((n, n), cfg['d0'], dtype=F32)
    f = np.zeros((4, n, n), dtype=F32)
    bed = np.zeros((n, n), dtype=F32)
    for s in range(steps):
        d, f = step_pipes(d, f, bed, cfg['dt'], cfg['g'], cfg['dx'], cfg['damp'], ocean_sources(cfg, s))
    return d, f, cfg


if __name__ == '__main__':
    import sys, time
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 256
    k = int(sys.argv[2]) if len(sys.argv) > 2 else 200
    t = time.time(); d, f, cfg = run_ocean(n, k)
    print('n', n, 'steps', k, 'volume m3', float(d.astype(np.float64).sum()) * cfg['dx'] ** 2, 'max', float(d.max()), 's', round(time.time() - t, 2))
