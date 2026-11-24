"""Game-level ballistics and wall-damage toy for Living Islands forts. numpy only, deterministic.
Real physics: gravity, quadratic air drag, wind as air velocity, a heightfield ground, ray-box hits.
Invented (TUNING): every weapon, material and hit-point number, the damage rules, the duel rules.
Units: metres, seconds. x east, y up, z south (same axes as landform world windows).
See FORTIFY_MODEL.md. No real weapon specs live here on purpose."""
import json, math, os
import numpy as np

G = 9.81
DT = 0.02
WORLDS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'landform', 'worlds')

# ---------------------------------------------------------------- terrain
class Terrain:
    """Bilinear heightfield. h[row, col], row 0 is north, centred on (0, 0)."""
    def __init__(self, h, dx):
        self.h = np.asarray(h, dtype=float); self.dx = float(dx)
        self.n = self.h.shape[0]; self.half = (self.n - 1) / 2.0
    @classmethod
    def flat(cls, n=129, dx=2.0, y=0.0):
        return cls(np.full((n, n), y), dx)
    @classmethod
    def from_world(cls, seed):
        d = os.path.join(WORLDS, 'seed%04d' % seed)
        m = json.load(open(os.path.join(d, 'manifest.json')))
        a = m['arrays']['height']; nx = m['nx']
        raw = open(os.path.join(d, 'world.bin'), 'rb').read()[a['offset']:a['offset'] + a['bytes']]
        h = np.frombuffer(raw, dtype='<i2').reshape(nx, nx) / float(m['height_scale'])
        return cls(h, m['dx'])
    def at(self, x, z):
        u = x / self.dx + self.half; v = z / self.dx + self.half
        if u < 0 or v < 0 or u >= self.n - 1 or v >= self.n - 1:
            return -50.0                      # off the table is open sea
        i = int(u); j = int(v); fu = u - i; fv = v - j; h = self.h
        return (h[j, i] * (1 - fu) * (1 - fv) + h[j, i + 1] * fu * (1 - fv)
                + h[j + 1, i] * (1 - fu) * fv + h[j + 1, i + 1] * fu * fv)
    def extent(self):
        return self.half * self.dx

def line_of_sight(terr, a, b, eye=1.6, step=1.0, clearance=0.0):
    """True if a ray from a (x,z) to b (x,z), eyes `eye` m above ground at both ends, clears the ground."""
    ya = terr.at(*a) + eye; yb = terr.at(*b) + eye
    d = math.hypot(b[0] - a[0], b[1] - a[1]); n = max(2, int(d / step))
    for k in range(1, n):
        t = k / n
        x = a[0] + (b[0] - a[0]) * t; z = a[1] + (b[1] - a[1]) * t
        if terr.at(x, z) > ya + (yb - ya) * t + clearance:
            return False
    return True

# ---------------------------------------------------------------- tables (all TUNING)
# kind: how the damage table treats it. drag_k: per metre of air (0.5 rho Cd A / m).
WEAPONS = {
    'thrower': dict(v0=40.0, drag_k=0.004, amin=25, amax=70, branch='high', dmg=13.0, splash_r=3.2, splash=10.0, reload=7.0,  sigma=0.9, cost=20, kind='lob'),
    'cannon':  dict(v0=75.0, drag_k=0.0015, amin=-25, amax=40, branch='low', dmg=10.0, splash_r=1.0, splash=2.0,  reload=5.5,  sigma=0.35, cost=30, kind='shot'),
    'mortar':  dict(v0=60.0, drag_k=0.0020, amin=45, amax=82, branch='high', dmg=16.0, splash_r=4.5, splash=12.0,  reload=7.0,  sigma=0.8, cost=35, kind='shell'),
    'heavy':   dict(v0=95.0, drag_k=0.0010, amin=-25, amax=40, branch='low', dmg=32.0, splash_r=3.0, splash=8.0,  reload=14.0, sigma=0.25, cost=55, kind='shot'),
}
# hp_per_m: hit points per part per metre of thickness. vs: damage multiplier by weapon kind.
# splash_vuln: multiplier on splash damage. cost_m3: build cost per cubic metre. tmax: thickest sensible build (m).
# fail: how a part fails, for drawing. rubble: height left after failure (fraction of the wall height).
BUNKER_VS = dict(lob=1.0, shot=1.0, shell=1.0)   # the bunker is one plain pool of hit points (TUNING)
BUNKER_SPLASH = 0.8
MATERIALS = {
    'timber':   dict(hp_per_m=24, vs=dict(lob=1.2, shot=1.3, shell=1.0), splash_vuln=1.2, cost_m3=0.9, tmax=1.2, fail='planks splinter', rubble=0.15),
    'earth':    dict(hp_per_m=30, vs=dict(lob=1.3, shot=0.55, shell=1.0), splash_vuln=1.4, cost_m3=0.28, tmax=3.5, fail='earth slumps', rubble=0.35),
    'stone':    dict(hp_per_m=52, vs=dict(lob=1.1, shot=1.1, shell=0.9), splash_vuln=0.8, cost_m3=0.95, tmax=2.5, fail='stones fall', rubble=0.25),
    'concrete': dict(hp_per_m=85, vs=dict(lob=0.6, shot=0.9, shell=0.45), splash_vuln=0.5, cost_m3=2.3, tmax=3.0, fail='concrete cracks and spalls', rubble=0.2),
}
SLOPE_RICOCHET_DEG = 72.0    # beyond this angle of incidence a shot glances off (TUNING)
RICOCHET_FACTOR = 0.12

# ---------------------------------------------------------------- flight
def simulate(terr, pos, vel, drag_k=0.0, wind=(0.0, 0.0), boxes=(), tmax=60.0, dt=DT, record=False):
    """Fly one shot. RK2 (midpoint), exact for constant acceleration. Wind is air velocity (x, z).
    Plain floats for speed. Returns dict(kind 'ground'|'box'|'none', point, box, normal, t, vel, path)."""
    px, py, pz = float(pos[0]), float(pos[1]), float(pos[2])
    vx, vy, vz = float(vel[0]), float(vel[1]), float(vel[2])
    wx, wz = float(wind[0]), float(wind[1])
    near = [(b, float(np.linalg.norm(b.h)) + 1.0) for b in boxes]
    path = [np.array([px, py, pz])] if record else None
    t = 0.0
    at = terr.at
    while t < tmax:
        rx, rz = vx - wx, vz - wz; s = math.sqrt(rx * rx + vy * vy + rz * rz)
        ax, ay, az = -drag_k * s * rx, -G - drag_k * s * vy, -drag_k * s * rz
        mx, my, mz = vx + 0.5 * dt * ax, vy + 0.5 * dt * ay, vz + 0.5 * dt * az
        rx, rz = mx - wx, mz - wz; s = math.sqrt(rx * rx + my * my + rz * rz)
        ax, ay, az = -drag_k * s * rx, -G - drag_k * s * my, -drag_k * s * rz
        qx = px + vx * dt + 0.5 * ax * dt * dt; qy = py + vy * dt + 0.5 * ay * dt * dt; qz = pz + vz * dt + 0.5 * az * dt * dt
        nvx, nvy, nvz = vx + ax * dt, vy + ay * dt, vz + az * dt
        best = None
        if near:
            p0 = np.array([px, py, pz]); p1 = np.array([qx, qy, qz])
            for b, rad in near:
                cx, cy, cz = b.c
                if abs(qx - cx) > rad + 1 and abs(px - cx) > rad + 1: continue
                if abs(qz - cz) > rad + 1 and abs(pz - cz) > rad + 1: continue
                r = b.segment_hit(p0, p1)
                if r is not None and (best is None or r[0] < best[0]):
                    best = (r[0], b, r[1])
        tg = None
        if qy <= at(qx, qz):
            if py <= at(px, pz):
                tg = 0.0
            else:
                lo, hi = 0.0, 1.0
                for _ in range(20):
                    m = (lo + hi) / 2
                    if py + (qy - py) * m <= at(px + (qx - px) * m, pz + (qz - pz) * m): hi = m
                    else: lo = m
                tg = hi
        if best is not None and (tg is None or best[0] <= tg):
            f = best[0]; pt = np.array([px + (qx - px) * f, py + (qy - py) * f, pz + (qz - pz) * f])
            if record: path.append(pt)
            return dict(kind='box', point=pt, box=best[1], normal=best[2], t=t + f * dt, vel=np.array([vx, vy, vz]), path=path)
        if tg is not None:
            f = tg; pt = np.array([px + (qx - px) * f, py + (qy - py) * f, pz + (qz - pz) * f])
            if record: path.append(pt)
            return dict(kind='ground', point=pt, box=None, normal=None, t=t + f * dt, vel=np.array([vx, vy, vz]), path=path)
        px, py, pz, vx, vy, vz = qx, qy, qz, nvx, nvy, nvz; t += dt
        if record: path.append(np.array([px, py, pz]))
        if py < -200: break
    return dict(kind='none', point=np.array([px, py, pz]), box=None, normal=None, t=t, vel=np.array([vx, vy, vz]), path=path)

def launch(weapon, origin, bearing_deg, elev_deg):
    """Muzzle velocity vector. bearing 0 = +x (east), 90 = +z (south)."""
    b = math.radians(bearing_deg); e = math.radians(elev_deg)
    s = weapon['v0']
    return np.array([s * math.cos(e) * math.cos(b), s * math.sin(e), s * math.cos(e) * math.sin(b)])

# ---------------------------------------------------------------- walls and boxes
class Box:
    """Oriented box standing on the ground. `face` is the yaw (deg, as a bearing) of the outward normal of the
    front face. `slope_deg` leans that front face back (its normal tilts up by that angle). TUNING: the slope
    only changes the normal used for the angle of incidence; the volume stays a box."""
    def __init__(self, cx, cz, base, length, height, thick, face_deg, slope_deg=0.0):
        self.c = np.array([cx, base + height / 2.0, cz]); self.base = base
        self.h = np.array([thick / 2.0, height / 2.0, length / 2.0])   # local x = thickness, z = along the wall
        self.full_h = height
        self.face = math.radians(face_deg); self.slope = math.radians(slope_deg)
        cf, sf = math.cos(self.face), math.sin(self.face)
        self.ax = np.array([cf, 0, sf]); self.az = np.array([-sf, 0, cf])   # local x axis points out of the front face
    def set_height_factor(self, f):
        H = max(self.full_h * f, 0.0); self.h[1] = H / 2.0; self.c[1] = self.base + H / 2.0
    def to_local(self, q):
        d = q - self.c
        return np.array([d @ self.ax, d[1], d @ self.az])
    def segment_hit(self, p0, p1):
        if self.h[1] <= 1e-6: return None
        a = self.to_local(p0); b = self.to_local(p1); d = b - a
        t0, t1 = 0.0, 1.0; n_in = None
        for k in range(3):
            if abs(d[k]) < 1e-12:
                if abs(a[k]) > self.h[k]: return None
                continue
            ta = (-self.h[k] - a[k]) / d[k]; tb = (self.h[k] - a[k]) / d[k]
            sgn = -1.0
            if ta > tb: ta, tb = tb, ta; sgn = 1.0
            if ta > t0: t0 = ta; n_in = (k, sgn)
            t1 = min(t1, tb)
            if t0 > t1: return None
        if n_in is None:
            return (0.0, np.array([0.0, 1.0, 0.0]))     # started inside
        k, sgn = n_in
        nl = np.zeros(3); nl[k] = sgn
        n = nl[0] * self.ax + nl[1] * np.array([0, 1.0, 0]) + nl[2] * self.az
        # front face is local +x: a shot coming from the front enters through the +x plane (sgn = +1)
        if k == 0 and sgn > 0 and self.slope > 0:
            n = math.cos(self.slope) * self.ax + math.sin(self.slope) * np.array([0, 1.0, 0])
        return (t0, n)

class Part:
    def __init__(self, box, material, thick):
        self.box = box; self.mat = material; self.thick = thick
        self.max_hp = MATERIALS[material]['hp_per_m'] * thick; self.hp = self.max_hp
    def state(self):
        if self.hp <= 0: return 'failed'
        return 'damaged' if self.hp <= 0.5 * self.max_hp else 'intact'
    def hurt(self, amount):
        if self.hp <= 0: return
        self.hp -= amount
        if self.hp <= 0:
            self.hp = 0.0
            self.box.set_height_factor(MATERIALS[self.mat]['rubble'])

class Wall:
    """A straight wall made of short parts (stones fall, planks splinter ... one part at a time)."""
    def __init__(self, terr, cx, cz, face_deg, length=14.0, height=3.0, thick=1.0, material='stone', slope_deg=0.0, part_len=2.0):
        self.material = material; self.thick = thick; self.slope = slope_deg
        n = max(1, int(round(length / part_len))); self.parts = []
        f = math.radians(face_deg); along = np.array([-math.sin(f), math.cos(f)])
        for i in range(n):
            off = (i - (n - 1) / 2.0) * part_len
            x = cx + along[0] * off; z = cz + along[1] * off
            base = terr.at(x, z)
            self.parts.append(Part(Box(x, z, base, part_len, height, thick, face_deg, slope_deg), material, thick))
    def boxes(self): return [p.box for p in self.parts]
    def standing(self): return sum(1 for p in self.parts if p.hp > 0) / len(self.parts)
    def volume(self): return sum(p.box.full_h * p.thick * 2 * p.box.h[2] for p in self.parts)

class Bunker:
    """The thing you protect. One box, one pool of hit points."""
    def __init__(self, terr, cx, cz, face_deg, hp=45.0, size=4.0, height=3.0):
        self.box = Box(cx, cz, terr.at(cx, cz), size, height, size, face_deg)
        self.max_hp = hp; self.hp = hp
        self.mat = 'concrete'
    def hurt(self, a): self.hp = max(0.0, self.hp - a)
    @property
    def alive(self): return self.hp > 0

def incidence_deg(vel, normal):
    v = np.asarray(vel, float); s = np.linalg.norm(v)
    if s < 1e-9: return 0.0
    c = float(np.clip(-(v / s) @ normal, -1, 1))
    return math.degrees(math.acos(c))

def hit_damage(weapon, material, vel, normal):
    """Damage to one part from a direct hit. Cosine of the angle of incidence, glancing blows ricochet."""
    inc = incidence_deg(vel, normal)
    f = RICOCHET_FACTOR if inc > SLOPE_RICOCHET_DEG else max(math.cos(math.radians(inc)), 0.0)
    mult = MATERIALS[material]['vs'][weapon['kind']] if material in MATERIALS else BUNKER_VS[weapon['kind']]
    return weapon['dmg'] * mult * f

def resolve_shot(terr, weapon, origin, vel, wind, walls, bunker):
    """Fly a shot and apply direct and splash damage. Returns a small result dict."""
    parts = [p for w in walls for p in w.parts]
    boxes = [p.box for p in parts if p.hp > 0] + ([bunker.box] if bunker is not None and bunker.alive else [])
    r = simulate(terr, origin, vel, weapon['drag_k'], wind, boxes)
    out = dict(kind=r['kind'], point=r['point'], hit=None)
    if r['kind'] == 'none': return out
    P = r['point']
    if r['kind'] == 'box':
        b = r['box']
        if bunker is not None and b is bunker.box:
            bunker.hurt(hit_damage(weapon, None, r['vel'], r['normal'])); out['hit'] = 'bunker'
        else:
            for p in parts:
                if p.box is b:
                    p.hurt(hit_damage(weapon, p.mat, r['vel'], r['normal'])); out['hit'] = 'wall'; break
    # splash
    R = weapon['splash_r']
    if R > 0:
        for p in parts:
            if p.hp <= 0: continue
            d = np.linalg.norm(P - p.box.c)
            if d < R:
                p.hurt(weapon['splash'] * (1 - d / R) * MATERIALS[p.mat]['splash_vuln'])
        if bunker is not None and bunker.alive:
            d = np.linalg.norm(P - bunker.box.c)
            if d < R + 1.5:
                bunker.hurt(weapon['splash'] * max(0.0, 1 - d / (R + 1.5)) * BUNKER_SPLASH)
                if out['hit'] is None: out['hit'] = 'splash'
    return out

# ---------------------------------------------------------------- aiming
def landing(terr, weapon, origin, bearing, elev, wind=(0.0, 0.0)):
    r = simulate(terr, origin, launch(weapon, origin, bearing, elev), weapon['drag_k'], wind)
    return r

def solve_elevation(terr, weapon, origin, target, wind=(0.0, 0.0), muzzle=1.5):
    """Find the elevation that lands on `target` (x, z) on the ground, terrain only (walls ignored, as a player would aim).
    Uses the weapon's preferred branch. Returns (elev_deg, bearing_deg, miss_m)."""
    ox, oz = target[0] - origin[0], target[1] - origin[1]
    bearing = math.degrees(math.atan2(oz, ox)); want = math.hypot(ox, oz)
    start = np.array([origin[0], terr.at(*origin) + muzzle, origin[1]])
    def miss(el):
        r = landing(terr, weapon, start, bearing, el, wind)
        return math.hypot(r['point'][0] - target[0], r['point'][2] - target[1]) * \
            (1.0 if math.hypot(r['point'][0] - origin[0], r['point'][2] - origin[1]) >= want else -1.0)
    els = np.arange(weapon['amin'], weapon['amax'] + 1e-9, 1.0)
    vals = [miss(e) for e in els]
    roots = []
    for i in range(len(els) - 1):
        if vals[i] == 0 or vals[i] * vals[i + 1] < 0:
            lo, hi = els[i], els[i + 1]; flo = vals[i]
            for _ in range(22):
                mid = (lo + hi) / 2; fm = miss(mid)
                if fm * flo <= 0: hi = mid
                else: lo = mid; flo = fm
            if miss((lo + hi) / 2) < 3.0: roots.append((lo + hi) / 2)     # a jump at a ridge edge is not a root
    if roots:
        el = roots[-1] if weapon['branch'] == 'high' else roots[0]
        return el, bearing, abs(miss(el))
    k = int(np.argmin(np.abs(vals)))
    return float(els[k]), bearing, abs(vals[k])

# ---------------------------------------------------------------- styles and duels
STYLES = {
    'palisade':  dict(material='timber',   slope=0.0),    # earth-and-timber era
    'rampart':   dict(material='earth',    slope=35.0),   # banked earth with a leaning face
    'stone':     dict(material='stone',    slope=0.0),    # plain stone wall
    'bastion':   dict(material='stone',    slope=30.0),   # angled stone face (the bastion idea)
    'concrete':  dict(material='concrete', slope=20.0),   # concrete with a cast slope
}
BUDGET = 150.0

def build_side(terr, style, weapon_name, bunker_xz, enemy_xz, budget=BUDGET, wall_gap=7.0, length=14.0, height=3.0):
    st = STYLES[style]; mat = MATERIALS[st['material']]; wp = WEAPONS[weapon_name]
    face = math.degrees(math.atan2(enemy_xz[1] - bunker_xz[1], enemy_xz[0] - bunker_xz[0]))
    f = math.radians(face)
    wx, wz = bunker_xz[0] + math.cos(f) * wall_gap, bunker_xz[1] + math.sin(f) * wall_gap
    spend = max(budget - wp['cost'], 5.0)
    thick = float(np.clip(spend / (mat['cost_m3'] * length * height), 0.3, mat['tmax']))
    wall = Wall(terr, wx, wz, face, length, height, thick, st['material'], st['slope'])
    bunker = Bunker(terr, bunker_xz[0], bunker_xz[1], face)
    return dict(style=style, weapon=weapon_name, wall=wall, bunker=bunker, thick=thick, xz=bunker_xz)

def pick_sites(terr, rng, dmin=70.0, dmax=130.0, hmin=2.0, tries=4000):
    ext = terr.extent() - 12
    for _ in range(tries):
        a = rng.uniform(-ext, ext, 2); ang = rng.uniform(0, 2 * math.pi); d = rng.uniform(dmin, dmax)
        b = a + d * np.array([math.cos(ang), math.sin(ang)])
        if abs(b[0]) > ext or abs(b[1]) > ext: continue
        if terr.at(*a) < hmin or terr.at(*b) < hmin: continue
        if not line_of_sight(terr, a, b, eye=4.0): continue
        return (float(a[0]), float(a[1])), (float(b[0]), float(b[1]))
    raise RuntimeError('no duel sites')

def duel(terr, rng, style_a, weapon_a, style_b, weapon_b, max_time=300.0, visibility=1.0):
    """One duel. Both sides fire at the other bunker until one falls. Returns dict with winner 'A', 'B' or 'draw'."""
    pa, pb = pick_sites(terr, rng)
    A = build_side(terr, style_a, weapon_a, pa, pb); B = build_side(terr, style_b, weapon_b, pb, pa)
    wspeed = rng.uniform(0, 5); wdir = rng.uniform(0, 2 * math.pi)
    wind = (wspeed * math.cos(wdir), wspeed * math.sin(wdir))
    est_err = 1.0 + rng.uniform(-0.3, 0.3)
    side = [A, B]; nxt = [0.0, 0.25]; shots = [0, 0]
    t = 0.0
    while t < max_time and A['bunker'].alive and B['bunker'].alive:
        for i in (0, 1):
            me, foe = side[i], side[1 - i]
            if t + 1e-9 < nxt[i]: continue
            w = WEAPONS[me['weapon']]
            if 'aim' not in me:
                est = (wind[0] * est_err, wind[1] * est_err)     # the player's guess of the wind, not the truth
                me['aim'] = solve_elevation(terr, w, me['xz'], foe['xz'], est, muzzle=3.2)
            el, br, _ = me['aim']
            el += rng.normal(0, w['sigma'] / max(visibility, 0.2)); br += rng.normal(0, w['sigma'] / max(visibility, 0.2))
            origin = np.array([me['xz'][0], terr.at(*me['xz']) + 3.2, me['xz'][1]])   # fired from the top of the bunker
            resolve_shot(terr, w, origin, launch(w, origin, br, el), wind, [foe['wall']], foe['bunker'])
            shots[i] += 1; nxt[i] = t + w['reload']
            if not foe['bunker'].alive: break
        t += 0.5
    a, b = A['bunker'], B['bunker']
    win = 'A' if (not b.alive and a.alive) else 'B' if (not a.alive and b.alive) else 'draw'
    return dict(winner=win, time=t, shots=shots, a=(style_a, weapon_a), b=(style_b, weapon_b),
                hp=(round(a.hp, 3), round(b.hp, 3)), thick=(round(A['thick'], 3), round(B['thick'], 3)))

def run_duels(seed_world=5, n=60, seed=7):
    terr = Terrain.from_world(seed_world); rng = np.random.default_rng(seed)
    styles = list(STYLES); weps = list(WEAPONS); out = []
    for _ in range(n):
        out.append(duel(terr, rng, styles[rng.integers(len(styles))], weps[rng.integers(len(weps))],
                        styles[rng.integers(len(styles))], weps[rng.integers(len(weps))]))
    return out

def win_rates(results):
    tally = {'style': {}, 'weapon': {}}
    for r in results:
        for side, key in (('A', 'a'), ('B', 'b')):
            if r['winner'] == 'draw': kind = 'd'
            else: kind = 'w' if r['winner'] == side else 'l'
            for k, v in (('style', r[key][0]), ('weapon', r[key][1])):
                t = tally[k].setdefault(v, dict(w=0, l=0, d=0)); t[kind] += 1
    rates = {}
    for k in tally:
        rates[k] = {}
        for name, t in tally[k].items():
            n = t['w'] + t['l'] + t['d']
            rates[k][name] = dict(n=n, wins=t['w'], draws=t['d'], rate=round(t['w'] / n, 3) if n else None)
    return rates

if __name__ == '__main__':
    import sys
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    res = run_duels(n=n)
    print(json.dumps(win_rates(res), indent=1, sort_keys=True))
    print('draws', sum(r['winner'] == 'draw' for r in res), 'median time', float(np.median([r['time'] for r in res])))
