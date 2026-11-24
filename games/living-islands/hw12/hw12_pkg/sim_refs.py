"""numpy reference versions (and start states) of the HW-12 world-simulation kernels, used to check the GPU results. numpy only."""
import sys
import numpy as np

sys.dont_write_bytecode = True

GRAV, HMIN = 9.81, 1e-3
SW_DT, SW_C = 0.05, 0.025     # dt, dt / (2 dx) with dx = 1
DIFF_K = 0.2
AGENT_FN = 256
AGENT_DT = 0.01


# ---------------------------------------------------------------- shallow water
def sw_init(n, dtype=np.float64):
    """h, hu, hv, b, s on an n x n grid (float64 first, then cast)."""
    xs = (np.arange(n, dtype=np.float64) + 0.5) / n
    X, Y = np.meshgrid(xs, xs)
    h = 1.0 + 0.5 * np.exp(-((X - 0.4) ** 2 + (Y - 0.55) ** 2) / 0.01)
    hu = np.zeros((n, n))
    hv = np.zeros((n, n))
    b = 0.1 * np.sin(2 * np.pi * X) * np.cos(2 * np.pi * Y)
    s = 1e-5 * (X > 0.5)
    return [np.ascontiguousarray(a.astype(dtype)) for a in (h, hu, hv, b, s)]


def sw_step(h, hu, hv, b, s, dtype=np.float64):
    """One Lax-Friedrichs shallow-water step, same formulas as the kernel, in `dtype` arithmetic."""
    c, dt = dtype(SW_C), dtype(SW_DT)
    g, half, hmin = dtype(GRAV), dtype(0.5), dtype(HMIN)

    def sh(a):
        p = np.pad(a, 1, mode='edge')
        return p[1:-1, 2:], p[1:-1, :-2], p[2:, 1:-1], p[:-2, 1:-1]   # E, W, N, S
    hE, hW, hN, hS = sh(h)
    pE, pW, pN, pS = sh(hu)
    qE, qW, qN, qS = sh(hv)
    bE, bW, bN, bS = sh(b)
    hcl = [np.maximum(a, hmin) for a in (hE, hW, hN, hS)]
    cE, cW, cN, cS = hcl
    hc = np.maximum(h, hmin)
    fp_E = pE * pE / cE + half * g * cE * cE
    fp_W = pW * pW / cW + half * g * cW * cW
    fq_E, fq_W = pE * qE / cE, pW * qW / cW
    gp_N, gp_S = pN * qN / cN, pS * qS / cS
    gq_N = qN * qN / cN + half * g * cN * cN
    gq_S = qS * qS / cS + half * g * cS * cS
    q4 = dtype(0.25)
    nh = q4 * (hE + hW + hN + hS) - c * (pE - pW) - c * (qN - qS) + dt * s
    npp = q4 * (pE + pW + pN + pS) - c * (fp_E - fp_W) - c * (gp_N - gp_S) - c * g * hc * (bE - bW)
    nq = q4 * (qE + qW + qN + qS) - c * (fq_E - fq_W) - c * (gq_N - gq_S) - c * g * hc * (bN - bS)
    return np.maximum(nh, hmin).astype(dtype), npp.astype(dtype), nq.astype(dtype)


def sw_run(n, steps, dtype=np.float64):
    h, hu, hv, b, s = sw_init(n, dtype)
    for _ in range(steps):
        h, hu, hv = sw_step(h, hu, hv, b, s, dtype)
    return h, hu, hv


# ---------------------------------------------------------------- flow accumulation
def fa_terrain(n, seed=3):
    """Rough tilted terrain in float32 with no exact ties."""
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    z = (0.02 * xx + 0.01 * yy).astype(np.float32) + rng.random((n, n), dtype=np.float32) * np.float32(0.5)
    return np.ascontiguousarray(z, dtype=np.float32)


def fa_receivers(z):
    """D8 receiver index per cell (-1 = sink), identical comparison order and float32 arithmetic to the kernel."""
    n = z.shape[0]
    nx = ny = n
    rec = np.full((ny, nx), -1, dtype=np.int32)
    best = np.zeros((ny, nx), dtype=np.float32)
    idx = np.arange(nx * ny, dtype=np.int32).reshape(ny, nx)
    zp = np.pad(z, 1, mode='constant', constant_values=np.nan)
    ip = np.pad(idx, 1, mode='constant', constant_values=-1)
    d = np.float32(0.70710678)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0:
                continue
            zn = zp[1 + dy:1 + dy + ny, 1 + dx:1 + dx + nx]
            inn = ip[1 + dy:1 + dy + ny, 1 + dx:1 + dx + nx]
            w = d if (dx != 0 and dy != 0) else np.float32(1.0)
            with np.errstate(invalid='ignore'):
                drop = ((z - zn) * w).astype(np.float32)
                take = (drop > best) & (inn >= 0)
            best = np.where(take, drop, best).astype(np.float32)
            rec = np.where(take, inn, rec)
    return rec


def fa_accumulate(z):
    rec = fa_receivers(z).ravel()
    order = np.argsort(-z.ravel(), kind='stable')
    acc = np.ones(rec.size, dtype=np.int64)
    for i in order:
        r = rec[i]
        if r >= 0:
            acc[r] += acc[i]
    return rec, acc.astype(np.int32)


# ---------------------------------------------------------------- diffusion
def diffuse_step(u, k=DIFF_K):
    p = np.pad(u, 1, mode='edge')
    return u + np.float64(k) * (p[1:-1, 2:] + p[1:-1, :-2] + p[2:, 1:-1] + p[:-2, 1:-1] - 4.0 * u)


def diffuse_init(n, dtype=np.float32):
    xs = (np.arange(n, dtype=np.float64) + 0.5) / n
    X, Y = np.meshgrid(xs, xs)
    return np.ascontiguousarray((np.exp(-((X - 0.3) ** 2 + (Y - 0.6) ** 2) / 0.005) + 0.1 * np.sin(8 * np.pi * X) * np.cos(6 * np.pi * Y)).astype(dtype))


# ---------------------------------------------------------------- agents
def agent_field(fn=AGENT_FN):
    xs = (np.arange(fn, dtype=np.float64) + 0.5) / fn
    X, Y = np.meshgrid(xs, xs)
    return np.ascontiguousarray((np.sin(6.0 * X) * np.cos(5.0 * Y) + 0.5 * np.exp(-((X - 0.5) ** 2 + (Y - 0.5) ** 2) / 0.05)).astype(np.float32))


def agent_init(n, seed=11):
    rng = np.random.default_rng(seed)
    x = rng.random(n, dtype=np.float32)
    y = rng.random(n, dtype=np.float32)
    vx = ((rng.random(n, dtype=np.float32) - 0.5) * 0.1).astype(np.float32)
    vy = ((rng.random(n, dtype=np.float32) - 0.5) * 0.1).astype(np.float32)
    return x, y, vx, vy


def agent_step(x, y, vx, vy, fld, dt=AGENT_DT):
    """float32 reference of the agent kernel."""
    f32 = np.float32
    n, fn = x.size, fld.shape[0]
    fx = x * f32(fn) - f32(0.5)
    fy = y * f32(fn) - f32(0.5)
    flx, fly = np.floor(fx), np.floor(fy)
    tx, ty = fx - flx, fy - fly
    ix0 = np.clip(flx.astype(np.int64), 0, fn - 1)
    iy0 = np.clip(fly.astype(np.int64), 0, fn - 1)
    ix1, iy1 = np.minimum(ix0 + 1, fn - 1), np.minimum(iy0 + 1, fn - 1)
    f00, f10, f01, f11 = fld[iy0, ix0], fld[iy0, ix1], fld[iy1, ix0], fld[iy1, ix1]
    gx = (f10 - f00) * (f32(1) - ty) + (f11 - f01) * ty
    gy = (f01 - f00) * (f32(1) - tx) + (f11 - f10) * tx
    sx = np.zeros(n, dtype=np.float32)
    sy = np.zeros(n, dtype=np.float32)
    for k in range(1, 17):
        j = (np.arange(n) + k) % n
        dx, dy = x - x[j], y - y[j]
        d2 = dx * dx + dy * dy + f32(1e-6)
        w = f32(1e-6) / d2
        sx = sx + dx * w
        sy = sy + dy * w
    ux = f32(0.98) * vx + f32(dt) * (-gx * f32(4.0) + sx)
    uy = f32(0.98) * vy + f32(dt) * (-gy * f32(4.0) + sy)
    nx = x + f32(dt) * ux
    ny = y + f32(dt) * uy
    nx = nx - np.floor(nx)
    ny = ny - np.floor(ny)
    return nx.astype(np.float32), ny.astype(np.float32), ux.astype(np.float32), uy.astype(np.float32)


# ---------------------------------------------------------------- scan input
def scan_input(n, seed=5):
    return np.random.default_rng(seed).integers(0, 16, size=n, dtype=np.uint32)
