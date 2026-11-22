"""Exports the shared scene as 0.8 m voxel columns (voxels.json) + a water lookup (water.png: R depth/16 m, G shore distance/12 m)."""
import json, os, numpy as np
from PIL import Image
import heightmap as HM, scene2d as S
HERE = os.path.dirname(os.path.abspath(__file__))
VS = 0.8; X0, X1, Z0, Z1 = -112.0, 112.0, -100.0, 112.0
sc = S.build()
nx = int((X1 - X0) / VS); nz = int((Z1 - Z0) / VS)
xs = X0 + (np.arange(nx) + .5) * VS; zs = Z0 + (np.arange(nz) + .5) * VS
X, Z = np.meshgrid(xs.astype(np.float32), zs.astype(np.float32))
T = S.bil(sc['T'], X, Z); G = S.bil(sc['G'], X, Z); A = S.bil(sc['A'], X, Z); E = S.bil(sc['E'], X, Z); D = S.bil(sc['D'], X, Z)
# chunkier conifers: re-stamp tiered cones wider than the shared 0.25 m scene so they survive 0.8 m voxels
js0 = json.load(open(os.path.join(HERE, 'island.json')))
Tm = T.copy(); Am = A.copy(); Pm = np.zeros(T.shape, bool)
for c in js0['conifers']:
    Hh = c['h']; Rr = max(.30 * Hh, 1.3)
    r = np.hypot(X - c['x'], Z - c['z']); m = r < Rr
    t = np.clip(1 - r / Rr, 0, 1); tier = np.floor(t * 4) / 4 * .65 + t * .35
    topc = c['y'] + 1.0 + (Hh - 1.0) * tier
    sel = m & (topc > Tm)
    Tm = np.where(sel, topc, Tm); Pm |= sel
    shade = (.62 + .5 * t)[..., None] * np.array([.12, .34, .17], np.float32)
    Am = np.where(sel[..., None], shade, Am)
T = Tm; A = Am
top = np.floor(np.maximum(T, -14) / VS).astype(int)          # top voxel layer index (voxel [k*VS,(k+1)*VS) is solid for k<=top-1)
top = np.where(T > .05, np.maximum(top, 1) if False else top, top)
prop = (((T - G) > .35) | Pm).astype(int)
col = np.clip(A * 255, 0, 255).astype(int); packed = (col[..., 0] << 16) | (col[..., 1] << 8) | col[..., 2]
flame = (E > .5).astype(int)
js = dict(vs=VS, nx=nx, nz=nz, x0=X0, z0=Z0, top=top.ravel().tolist(), col=packed.ravel().tolist(), prop=prop.ravel().tolist(), flame=flame.ravel().tolist())
json.dump(js, open(os.path.join(HERE, 'voxels.json'), 'w'), separators=(',', ':'))
w = np.zeros((nz, nx, 4), np.uint8); w[..., 0] = np.clip(-G / 16 * 255, 0, 255); w[..., 1] = np.clip(D / 12 * 255, 0, 255); w[..., 3] = 255
Image.fromarray(w, 'RGBA').save(os.path.join(HERE, 'water.png'))
print(nx, nz, top.min(), top.max(), os.path.getsize(os.path.join(HERE, 'voxels.json')))
