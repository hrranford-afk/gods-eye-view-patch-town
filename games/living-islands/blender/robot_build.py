"""ROBOT BUILD: a robot recipe (blender/robot_recipe.py) becomes a GLB (hero, live, far) through the part functions of collector_model.py. Pure python + numpy, no Blender.
    python3 robot_build.py --seed N --out DIR [--lods hero,live] [--force-generic]      writes robot_seedN_hero.glb, robot_seedN_live.glb (and the recipe json)
    write_robot(rec, path, lod) -> the stats dict of collector_model.write_glb;   build_robot(rec, lod) -> the node dict.
How it works: collector_model.py is left as it is (v2 defaults unchanged). Its dimensions are module constants, so `applied(rec)` changes them for the length of one build and puts them back:
the shell dict, the bin dict, the wheel list, the head pod dict, the arm lengths, the track offsets, the paint colours (MATS), the wear multipliers (collector_tex.WEAR), the lamp colours, the node list.
The overall size, the length and width stretch and the head size and shape are node scales in the GLB (the page rotates nodes by name, so scale is free). What is new here: wide wheels (part_wheels),
visor styles, grippers, extra arm joints, lid styles, cross seams on the shell, the seedling bed, the grow light, the compost tray and four new quirks. Every new part is a function that draws into a node.
The legacy recipe (seed 1) skips all of it and calls collector_model.build, so it is the committed hero byte for byte; --force-generic runs the same values through this builder instead (a test compares them)."""
import sys, os, math, json, argparse, copy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import collector_model as CM
import collector_tex as TX
import robot_recipe as RR

NEW_MATS = {                 # key -> (glTF material for the far level, linear rgb); plants and earth go through the organic branch of the body shader, the grow light panel through the lens branch of the glass shader
    'leaf': ('Plastic', (0.045, 0.20, 0.040)), 'soil': ('Cord', (0.050, 0.032, 0.022)), 'clay': ('Paint', (0.36, 0.14, 0.07)), 'glight': ('Lens', (0.34, 0.075, 0.30)),
}
NEW_GROUP = {'leaf': 'body', 'soil': 'body', 'clay': 'body', 'glight': 'glass'}
NEW_NODES = ['module_seedbed', 'module_grow_light', 'module_compost', 'part_ears', 'part_blade', 'part_bins', 'part_tools', 'quirk_tape', 'quirk_antenna', 'quirk_extra_shell', 'quirk_plant_pot']


def dirt_seed(seed):
    """the seed of the dirt, the litter and the rust runs (design is the recipe's): seed 1 is the committed 7"""
    return CM.SEED + 17 * (int(seed) - 1)


# ------------------------------------------------------------------------------------------------- changing and restoring the collector_model constants
class applied:
    """with applied(rec): ...  changes the constants of collector_model (and collector_tex) to the recipe's values and restores them on exit."""
    def __init__(self, rec):
        self.rec = rec; self.saved = []

    def _dict(self, d, new):
        self.saved.append(('dict', d, dict(d))); d.update(new)

    def _attr(self, mod, name, value):
        self.saved.append(('attr', mod, name, getattr(mod, name))); setattr(mod, name, value)

    def _arr(self, a, value):
        self.saved.append(('arr', a, a.copy())); a[:] = value

    def __enter__(self):
        r = self.rec; b = r['body']; sh = b['shell']; dr = b['drive']; hd = b['head']; ar = b['arm']; hp = b['hopper']; pal = r['paint']; wr = r['wear']; lp = r['lamp']
        a = sh['half_length']
        self._dict(CM.SHELL, dict(xc=round(0.29 - a, 4), a=a, b=sh['half_width'], c=sh['dome_h'], y0=sh['slot_half'], e2=sh['shape_e2']))
        self._dict(CM.HOP, dict(x0=hp['x0'], x1=hp['x1'], w=hp['width'], z0=hp['z0'], z1=hp['z1']))
        self.saved.append(('list', CM.WHEELS, list(CM.WHEELS))); CM.WHEELS[:] = [(round(0.285 - dr['track_axle_m'], 4), 0.112, 0.10), (0.285, 0.127, 0.115)]
        self._dict(CM.POD, dict(e1=hd['e1'], e2=hd['e2']))
        self._attr(CM, 'ARM_L1', ar['upper_m']); self._attr(CM, 'ARM_L2', ar['fore_m'])
        self._arr(CM.ELBOW_STOW, CM.SHOULDER + np.array([-ar['upper_m'], 0, 0])); self._arr(CM.WRIST_STOW, CM.ELBOW_STOW + np.array([ar['fore_m'], 0, 0]))
        reach = ar['upper_m'] + ar['fore_m'] - 0.005 + 0.024
        self._attr(CM, 'GRAB_TARGET', (round(0.03 + 0.97 * reach * math.cos(math.radians(22.0)), 4), round(0.97 * reach * math.sin(math.radians(22.0)), 4), 0.115))
        self._attr(CM, 'TRACK_Y', dr['track_y']); self._attr(CM, 'TRACK_W', dr['track_width'])
        # the paint
        new = {}
        for k in ('paint', 'paint2', 'arm', 'patch', 'patch2'): new[k] = (CM.MATS[k][0], tuple(pal[k]))
        for k, (g, c) in NEW_MATS.items(): new[k] = (g, c)
        self._dict(CM.MATS, new); self.saved.append(('del', CM.MATS, [k for k in NEW_MATS if k not in self.saved[-1][2]]))
        self._dict(CM.KEYGROUP, NEW_GROUP); self.saved.append(('del', CM.KEYGROUP, [k for k in NEW_GROUP if k not in self.saved[-1][2]]))
        self._dict(TX.WEAR, dict(age=wr['age_f'], chips=wr['chips'], rust=wr['rust'], salt=wr['salt']))
        # the lamp colour code (the patterns and strengths stay)
        self._attr(CM, 'LAMP_BASE', list(lp['search']))
        lc = copy.deepcopy(CM.LAMP_CODE); self.saved.append(('attr', CM, 'LAMP_CODE', CM.LAMP_CODE))
        for st, key in (('search', 'search'), ('found', 'found'), ('low_charge', 'low_charge')): lc['states'][st]['colour'] = list(lp[key])
        lc['code_name'] = lp['code']; CM.LAMP_CODE = lc
        # the shell groove: one plate has no spine groove
        orig = CM.dome_z; G = 0.03 if sh['split_count'] == 1 else 0.16
        self.saved.append(('attr', CM, 'dome_z', orig))
        def dz(x, y, S=CM.SHELL, gd=None, gw=0.05): return orig(x, y, S, G if gd is None else gd, gw)
        CM.dome_z = dz
        # nodes and quirk slots of this machine
        self.saved.append(('list', CM.NODES, list(CM.NODES))); CM.NODES[:] = [n for n in CM.NODES if not n.startswith('quirk_')] + NEW_NODES[:7] + ['quirk_' + q for q in RR.QUIRK_NAMES]
        self.saved.append(('dict', CM.QUIRKS, dict(CM.QUIRKS))); CM.QUIRKS.clear()
        for q in r['quirks']:
            par, cat, note = RR.QUIRK_NOTES['quirk_' + q]; CM.QUIRKS['quirk_' + q] = dict(parent=par, category=cat, note=note)
        self.saved.append(('dict', CM.AXES, dict(CM.AXES)))
        for q, d in CM.QUIRKS.items(): CM.AXES[q] = dict(axis=None, quirk=True, category=d['category'], slot=q, optional=True, default_visible=True, note=d['note'] + '; hide or delete the node to take the quirk off')
        for m, note in (('module_seedbed', 'a seedling bed in the bin: soil and sprouts (repurposed module)'), ('module_grow_light', 'a grow light on two posts over the bin (repurposed module; the panel is not emissive)'),
                        ('module_compost', 'a compost tray bolted to the back of the bin (repurposed module)'), ('part_ears', 'a pair of floppy ears on the head (the scout)'), ('part_blade', 'a push blade at the front (the hauler)'),
                        ('part_bins', 'two sorting bins strapped to the sides of the bin (the sorter)'), ('part_tools', 'a rack of hand tools on the bin (the maintenance robot)')):
            CM.AXES[m] = dict(axis=None, module=m.startswith('module'), part=m.startswith('part'), optional=True, note=note)
        self._attr(CM, 'EXTRA_SCENE', {'robot_recipe': r, 'robot_note': 'built by blender/robot_build.py from the recipe in this key; body scale, length and width stretch and the head scale are node scales'})
        return self

    def __exit__(self, *e):
        for it in reversed(self.saved):
            kind = it[0]
            if kind == 'dict': it[1].clear(); it[1].update(it[2])
            elif kind == 'del':
                for k in it[2]: it[1].pop(k, None)
            elif kind == 'attr': setattr(it[1], it[2], it[3])
            elif kind == 'arr': it[1][:] = it[2]
            elif kind == 'list': it[1][:] = it[2]
        return False


# ------------------------------------------------------------------------------------------------- small helpers
def shift_node(nd, d):
    """move the geometry a node holds by the vector d (the old quirk functions were drawn for the default bin); the node pivot is set by the caller"""
    d = np.asarray(d, float)
    if np.abs(d).max() < 1e-9: return
    for bk in nd.b.buckets.values(): bk[0][:] = [v + d for v in bk[0]]
    nd.b.fix[:] = [p + d for p in nd.b.fix]; nd.feats[:] = [(k, tuple(np.asarray(p) + d)) for k, p in nd.feats]


# ------------------------------------------------------------------------------------------------- part: wide wheels (instead of tracks)
def part_wheels(nd, side, L, xs, r, yc, width, dent=False):
    """a side of wide wheels in node nd (pivot at the wheel row): tyre with lugs, steel rim, hub bolts, a fender. xs = wheel centres, r = radius."""
    b = nd.b; y = side * yc; seg = 24 if L['fine'] else (14 if not L['simple'] else 10); fine = L['fine']
    for i, x in enumerate(xs):
        z = r
        b.cyl_y('rubber', (x, y, z), 2 * r, width, seg=seg)
        if not L['simple']:
            n = 18 if fine else 8
            for k in range(n):
                a = 2 * math.pi * k / n + (0.08 if side > 0 else 0.0); ang = -(math.degrees(a) + 90.0)
                b.box('rubber', (x + (r + 0.005) * math.cos(a), y, z + (r + 0.005) * math.sin(a)), (0.030, width * 0.95, 0.011), (0, ang, 0), skip=(0,))
            for sg in (-1, 1):
                ys = y + sg * (width / 2 + 0.004)
                if not fine and sg < 0: continue
                b.cyl_y('metal', (x, ys, z), 2 * r * 0.64, 0.010, seg=seg)
                b.cyl_y('hub', (x, ys + sg * 0.006, z), 2 * r * 0.30, 0.012, seg=10 if fine else 8)
                if fine:
                    for k in range(8):
                        a = 2 * math.pi * k / 8 + 0.2; b.cyl_y('bolt', (x + 0.60 * r * 0.78 * math.cos(a), ys + sg * 0.009, z + 0.60 * r * 0.78 * math.sin(a)), 0.011, 0.008, seg=6)
                b.cyl_y('bolt', (x, ys + sg * 0.014, z), 2 * r * 0.13, 0.010, seg=6)
    x0, x1 = min(xs), max(xs)
    if not L['simple']:
        b.box('guard', ((x0 + x1) / 2, y, 2 * r + 0.014), (x1 - x0 + 2 * r * 1.18, width + 0.03, 0.010))        # one long fender over the row
        if fine:
            b.rod('grime', (x0, y - side * width / 2, z * 0.9), (x1, y - side * width / 2, z * 0.9), 0.02, 0.02, seg=6)      # an axle bar seen from the open side
    if dent: b.box('guard', (x1 + 0.03, y, r * 1.5), (0.06, width + 0.04, 0.02), (0, -12, 0))


# ------------------------------------------------------------------------------------------------- shell extras
def shell_cross_seam(nd, side, S, x_off=0.0):
    """a dark seam across the dome of one half (the shell counts as two plates a side): a thin strip hugging the surface at x = xc + x_off"""
    b = nd.b; x = S['xc'] + x_off; ym = S['b'] * max(1 - abs((x - S['xc']) / S['a']) ** (2 / S['e2']), 1e-6) ** (S['e2'] / 2); ys = np.linspace(S['y0'], ym * 0.985, 14); V = []
    for y in ys:
        z, _ = CM.dome_z(np.array([x]), np.array([y]), S); zz = S['z0'] + z[0] + 0.0016
        for dx in (-0.0045, 0.0045):
            z2, _ = CM.dome_z(np.array([x + dx]), np.array([y]), S); V.append((x + dx, side * y, S['z0'] + z2[0] + 0.0016))
    F = [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(len(ys) - 1)]
    if side > 0: F = [tuple(reversed(q)) for q in F]
    b.raw('grime', False, V, F)
    for k in (0.3, 0.65):                                     # two rivets on the seam
        y = ys[0] + (ys[-1] - ys[0]) * k; z, _ = CM.dome_z(np.array([x]), np.array([y]), S); b.cyl('bolt', (x, side * y, S['z0'] + z[0] + 0.003), 0.013, 0.006, seg=6)


# ------------------------------------------------------------------------------------------------- head: visor styles
VISOR_RECTS = {      # style -> windows (y0, y1, z0, z1); the plate covers the committed band (z 0.2785 to 0.3355) and the windows stand on it
    'twin': [(-0.066, -0.012, 0.292, 0.326), (0.012, 0.062, 0.292, 0.326)],
    'trio': [(-0.070, -0.036, 0.294, 0.324), (-0.017, 0.017, 0.294, 0.324), (0.036, 0.066, 0.294, 0.324)],
    'slit': [(-0.074, 0.068, 0.3035, 0.3125)],
    'tall': [(-0.022, 0.036, 0.2830, 0.3330)],
}

def head_visor_style(nd, L, style):
    """a plate over the committed visor band and a different window pattern on it: no round eyes anywhere (squares, a slit, one tall window)"""
    if style == 'band' or L['simple']: return
    b = nd.b; plate = (-0.083, 0.074, 0.2785, 0.3355); lift = 0.0062
    def rect(mat, y0, y1, z0, z1, lf):
        CM._strip_grid(b, mat, np.linspace(y0, y1, 9 if L['fine'] else 4), lambda y: z0, lambda y: z1, 2 if L['fine'] else 1, lf)
    rect('paint', *plate, lift)
    for (y0, y1, z0, z1) in VISOR_RECTS[style]: rect('visor', y0, y1, z0, z1, lift + 0.0016)


# ------------------------------------------------------------------------------------------------- arm: joints and grippers
def arm_extras(n_base, n_mid, n_tip, n_fl, n_fr, L, joints, gripper):
    S = CM.SHOULDER; E = CM.ELBOW_STOW; W = CM.WRIST_STOW; dy = CM.ARM_DY; Wp = W + np.array([0, -dy, 0]); f0 = E + np.array([0, -dy, 0]); f1 = W + np.array([0, -dy, 0])
    if joints == 4:                  # an extra swivel collar and a brace across the forearm (a look, not a joint: the clips are the three-joint ones)
        c = f0 + (f1 - f0) * 0.5; n_mid.b.cyl_y('hub', tuple(c), 0.055, 0.052, seg=L['seg']); n_mid.b.cyl_y('bolt', tuple(c + np.array([0, -0.028, 0])), 0.022, 0.010, seg=6)
        if L['fine']: n_mid.b.rod('metal', tuple(f0 + (f1 - f0) * 0.18 + np.array([0, -0.036, 0.03])), tuple(f0 + (f1 - f0) * 0.52 + np.array([0, -0.036, 0.034])), 0.010, 0.010, seg=5)
    elif joints == 2:                # a rubber boot over the wrist: it reads as a stiff wrist
        n_tip.b.cyl_x('rubber', tuple(Wp + np.array([0.0, 0, 0])), 0.066, 0.075, seg=L['seg'])
    if gripper == 'wide_pad':
        for nd, s in ((n_fl, 1), (n_fr, -1)):
            pv = Wp + np.array([0.08, s * 0.026, 0.0]); nd.b.box('rubber', tuple(pv + np.array([0.075, -s * 0.010, 0.0])), (0.050, 0.012, 0.062))
    elif gripper == 'scoop':
        n_tip.b.sq('metal', tuple(Wp + np.array([0.17, 0.0, -0.035])), (0.15, 0.115, 0.045), (0, 0, 0), e1=0.5, e2=0.9, nu=3, nv=8, smooth=False, half=True)
        n_tip.b.box('metal', tuple(Wp + np.array([0.10, 0.0, -0.012])), (0.05, 0.045, 0.026))
        if L['fine']: CM.bolts_y(n_tip.b, [tuple(Wp + np.array([0.10, 0.0, -0.012]))], 0.012)
    elif gripper == 'brush':
        n_tip.b.box('metal', tuple(Wp + np.array([0.12, 0.0, -0.032])), (0.07, 0.095, 0.018))
        for k in range(7 if L['fine'] else 3):
            yy = (k - (3 if L['fine'] else 1)) * 0.0135; n_tip.b.rod('rubber', tuple(Wp + np.array([0.12, yy, -0.04])), tuple(Wp + np.array([0.135, yy, -0.092])), 0.010, 0.006, seg=4)


# ------------------------------------------------------------------------------------------------- hopper: lid styles
def hopper_lid_style(hl, L, style):
    """the committed flat lid is replaced by another one: domed, slatted, grille, or none (an open bin)"""
    H = CM.HOP; sx = H['x1'] - H['x0']; cx = (H['x0'] + H['x1']) / 2; w = H['w']; lz = H['z1'] + 0.012; px = hl.pivot[0]
    if style == 'flat' or L['simple']: return
    if style == 'domed':
        hl.b.sq('paint2', (cx - 0.005, 0, lz + 0.020), (sx * 0.86, w * 0.84, 0.085), (0, 0, 0), e1=0.7, e2=0.7, nu=3, nv=8, smooth=True, half=True); return
    old = hl.b; hl.b = CM.MB()
    if style == 'none': return
    b = hl.b; b.cyl_y('metal', (px, 0, lz), 0.026, w * 0.9, seg=8)
    if style == 'slatted':
        n = 4
        for k in range(n): b.box('paint2', (H['x0'] + 0.014 + (sx - 0.028) * (k + 0.5) / n, 0, lz + 0.004), ((sx - 0.03) / n * 0.82, w + 0.012, 0.014))
        for sy in (-1, 1): b.box('metal', (cx, sy * (w / 2 - 0.02), lz + 0.014), (sx - 0.01, 0.014, 0.010))
    elif style == 'grille':
        for sy in (-1, 1): b.box('metal', (cx, sy * (w / 2 - 0.012), lz + 0.004), (sx + 0.01, 0.016, 0.014))
        for k in range(5 if L['fine'] else 3):
            yy = -w / 2 + 0.03 + (w - 0.06) * k / (4 if L['fine'] else 2); b.box('metal', (cx, yy, lz + 0.004), (sx, 0.010, 0.010))
        for k in range(3): b.box('metal', (H['x0'] + 0.03 + (sx - 0.06) * k / 2, 0, lz + 0.004), (0.010, w, 0.010))


# ------------------------------------------------------------------------------------------------- repurposed modules
def module_seedbed(nd, L, seed):
    """soil in the bin with rows of sprouts, divided by thin ribs: the lid is gone"""
    H = CM.HOP; b = nd.b; wall = 0.022; cx = (H['x0'] + H['x1']) / 2; sx = H['x1'] - H['x0'] - 2 * wall - 0.004; w = H['w'] - 2 * wall - 0.004; ztop = H['z1'] - 0.034
    b.box('soil', (cx, 0, ztop - 0.03), (sx, w, 0.06))
    rng = np.random.default_rng(seed + 5); rows = 4 if L['fine'] else 3; cols = 3 if L['fine'] else 2
    if L['fine']:
        for k in range(rows + 1): b.box('metal', (H['x0'] + wall + 0.002 + sx * k / rows, 0, ztop + 0.002), (0.005, w, 0.020))
    for i in range(rows):
        for j in range(cols):
            x = H['x0'] + wall + 0.002 + sx * (i + 0.5) / rows; y = -w / 2 + w * (j + 0.5) / cols; h = 0.03 + 0.05 * rng.random(); lean = rng.uniform(-14, 14)
            b.rod('leaf', (x, y, ztop), (x + 0.004 * lean / 14, y, ztop + h), 0.0055, 0.004, seg=4)
            for sg in ((-1, 1) if L['fine'] else (1,)):
                if L['simple']: continue
                b.sq('leaf', (x, y + sg * 0.014, ztop + h), (0.040, 0.020, 0.010), (0, sg * 18, rng.uniform(-30, 30)), e1=0.8, e2=0.8, nu=2, nv=6, half=True)
    return nd

def module_grow_light(nd, L, seed):
    """two posts at the bin's rim and a flat purple LED panel face down over it, with a thin cable; the panel is not emissive (the only light on a robot is the lamp)"""
    H = CM.HOP; b = nd.b; cx = (H['x0'] + H['x1']) / 2; sx = H['x1'] - H['x0']; w = H['w']; zt = H['z1'] + 0.27
    for sy in (-1, 1):
        for xx in (H['x0'] + 0.03, H['x1'] - 0.03):
            b.rod('metal', (xx, sy * (w / 2 - 0.012), H['z1'] - 0.02), (xx, sy * (w / 2 - 0.012), zt), 0.016, 0.016, seg=6)
    b.box('metal', (cx, 0, zt + 0.004), (sx + 0.03, w + 0.03, 0.016))
    b.box('glight', (cx, 0, zt - 0.006), (sx * 0.86, w * 0.9, 0.007))
    if not L['simple']:
        for k in range(3): b.box('grime', (cx, -w * 0.3 + w * 0.3 * k, zt - 0.0105), (sx * 0.86, 0.006, 0.0025))
        b.rod('rubber', (cx - sx * 0.3, w / 2 - 0.02, zt + 0.012), (CM.HOP['x1'] + 0.01, w / 2 - 0.012, H['z1'] - 0.02), 0.011, 0.011, seg=5)
        CM.bolts(b, [(cx - sx * 0.35, 0, zt + 0.014), (cx + sx * 0.35, 0, zt + 0.014)], 0.012)
    return nd

def module_compost(nd, L, seed):
    """a shallow tray bolted to the back of the bin: dark compost with wrack scraps and a couple of pale shell bits"""
    H = CM.HOP; b = nd.b; wt = 0.28 if H['w'] > 0.28 else H['w']; zc = H['z0'] + 0.055; xc = H['x0'] - 0.07; rng = np.random.default_rng(seed + 9)
    b.box('paint2', (xc, 0, zc - 0.028), (0.11, wt, 0.014)); b.box('paint2', (xc - 0.052, 0, zc), (0.012, wt, 0.07))
    for sy in (-1, 1): b.box('paint2', (xc, sy * (wt / 2 - 0.006), zc), (0.11, 0.012, 0.07))
    b.box('soil', (xc + 0.004, 0, zc - 0.002), (0.088, wt - 0.03, 0.050))
    for sy in (-1, 1):
        b.rod('metal', (H['x0'] - 0.005, sy * (wt / 2 - 0.02), zc + 0.02), (xc + 0.04, sy * (wt / 2 - 0.02), zc + 0.02), 0.012, 0.012, seg=5)
    if not L['simple']:
        for k in range(5 if L['fine'] else 2):
            b.box('leaf', (xc + rng.uniform(-0.03, 0.03), rng.uniform(-wt / 2 + 0.03, wt / 2 - 0.03), zc + 0.026), (0.040, 0.014, 0.004), (rng.uniform(-20, 20), rng.uniform(-20, 20), rng.uniform(0, 180)))
        for k in range(2): b.cyl('lit_white', (xc + rng.uniform(-0.02, 0.02), rng.uniform(-wt / 2 + 0.04, wt / 2 - 0.04), zc + 0.026), 0.020, 0.008, r=(rng.uniform(-30, 30), 0, 0), seg=6)
    return nd


# ------------------------------------------------------------------------------------------------- the part that goes with the job
def part_ears(nd, L, seed):
    """two floppy ears on the head: one stands up, one has folded over (a head node child, so they scale with the head)"""
    b = nd.b; seg = 5 if L['simple'] else 6
    b.rod('paint2', (0.395, 0.070, 0.356), (0.385, 0.108, 0.462), 0.050, 0.020, seg=seg); b.rod('paint2', (0.395, -0.070, 0.356), (0.372, -0.150, 0.402), 0.050, 0.018, seg=seg)
    if not L['simple']:
        b.cyl('metal', (0.395, 0.070, 0.352), 0.040, 0.014, seg=8); b.cyl('metal', (0.395, -0.070, 0.352), 0.040, 0.014, seg=8)
        b.rod('rubber', (0.392, 0.074, 0.372), (0.386, 0.098, 0.440), 0.020, 0.009, seg=5)
    return nd

def part_blade(nd, L, seed):
    """a push blade low at the front on two arms: a slab of dull steel, tilted forward, with bolts"""
    b = nd.b; w = 0.50
    b.box('guard', (0.455, 0, 0.105), (0.026, w, 0.13), (0, -14, 0)); b.box('metal', (0.462, 0, 0.040), (0.050, w, 0.020), (0, -14, 0))
    for sy in (-1, 1): b.rod('metal', (0.30, sy * 0.19, 0.17), (0.45, sy * 0.19, 0.115), 0.032, 0.032, seg=6)
    if not L['simple']: CM.bolts_x(b, [(0.470, sy * 0.19, 0.115) for sy in (-1, 1)] + [(0.468, sy * 0.10, 0.08) for sy in (-1, 1)], 0.018)
    return nd

def part_bins(nd, L, seed):
    """two small open bins strapped to the outside of the big one, each sorted: glass bits in one, caps in the other"""
    H = CM.HOP; b = nd.b; rng = np.random.default_rng(seed + 13); w = H['w']; cx = H['x0'] + 0.075; zc = H['z0'] + 0.13
    for sg, mats in ((1, ('lit_glass', 'lit_blue')), (-1, ('lit_orange', 'lit_white'))):
        yc = sg * (w / 2 + 0.065)
        b.box('paint2', (cx, yc, zc - 0.045), (0.12, 0.10, 0.012)); b.box('paint2', (cx, yc + sg * 0.044, zc), (0.12, 0.012, 0.10)); b.box('paint2', (cx - 0.054, yc, zc), (0.012, 0.10, 0.10)); b.box('paint2', (cx + 0.054, yc, zc), (0.012, 0.10, 0.10))
        b.box('paint2', (cx, yc - sg * 0.044, zc - 0.012), (0.12, 0.012, 0.076))
        b.box('grime', (cx, yc, zc - 0.036), (0.10, 0.08, 0.004))
        for k in range(4 if L['fine'] else 2): b.cyl(mats[k % 2], (cx + rng.uniform(-0.035, 0.035), yc + rng.uniform(-0.025, 0.025), zc - 0.025 + 0.012 * (k // 2)), 0.030, 0.012, r=(rng.uniform(-20, 20), rng.uniform(-20, 20), 0), seg=7)
        b.rod('metal', (cx - 0.04, sg * (w / 2 + 0.005), zc + 0.02), (cx - 0.04, yc - sg * 0.04, zc + 0.02), 0.012, 0.012, seg=5); b.rod('metal', (cx + 0.04, sg * (w / 2 + 0.005), zc + 0.02), (cx + 0.04, yc - sg * 0.04, zc + 0.02), 0.012, 0.012, seg=5)
    return nd

def part_tools(nd, L, seed):
    """a rack of three hand tools standing in clamps on the right wall of the bin: a wrench, a screwdriver and a hammer"""
    H = CM.HOP; b = nd.b; y = -(H['w'] / 2 + 0.024); zb = H['z1'] - 0.10; cx = (H['x0'] + H['x1']) / 2 + 0.01
    b.box('metal', (cx, y + 0.012, zb + 0.02), (0.20, 0.008, 0.045))
    for k, dx in enumerate((-0.07, 0.0, 0.07)):
        x = cx + dx; top = zb + 0.20 + 0.03 * (k % 2)
        b.rod('metal' if k != 1 else 'arm', (x, y, zb - 0.01), (x, y, top), 0.014, 0.014, seg=5)
        if k == 0: b.box('metal', (x, y, top + 0.018), (0.034, 0.012, 0.050))
        elif k == 1: b.cyl('arm', (x, y, zb + 0.07), 0.030, 0.10, seg=6)
        else: b.box('metal', (x, y, top + 0.012), (0.075, 0.018, 0.034))
        b.cyl_y('metal', (x, y + 0.008, zb + 0.015), 0.026, 0.014, seg=7); b.cyl('tape', (x, y, zb + 0.10), 0.026, 0.012, seg=7)
    return nd

# ------------------------------------------------------------------------------------------------- the four new quirks (the other four are the committed ones, moved to this bin)
def quirk_tape(nd, L, seed):
    b = nd.b; c = np.array((0.3675, 0.095, 0.215))
    b.box('tape', tuple(c), (0.004, 0.125, 0.022), (36, 0, 0)); b.box('tape', tuple(c + np.array([0.0006, 0, 0])), (0.004, 0.125, 0.022), (-36, 0, 0))
    b.box('grime', tuple(c + np.array([-0.002, 0, 0])), (0.002, 0.07, 0.006), (-36, 0, 0))              # the crack underneath
    if not L['simple']: b.box('tape', tuple(c + np.array([0.012, 0.062, -0.05])), (0.004, 0.012, 0.045), (10, 0, 0), pivot=tuple(c + np.array([0.012, 0.062, -0.028])), prot=(0, -34, 0))      # a loose curling end
    return nd

def quirk_antenna(nd, L, seed):
    H = CM.HOP; b = nd.b; base = np.array((H['x1'] - 0.02, -(H['w'] / 2 - 0.016), H['z1'] + 0.004)); kink = base + np.array([0.0, 0.0, 0.17]); tip = kink + np.array([-0.045, -0.085, 0.07])
    b.cyl('metal', tuple(base + np.array([0, 0, 0.004])), 0.030, 0.012, seg=7)
    b.rod('metal', tuple(base), tuple(kink), 0.009, 0.007, seg=5); b.rod('metal', tuple(kink), tuple(tip), 0.007, 0.005, seg=5)
    b.cyl('tape', tuple(kink), 0.020, 0.022, seg=7)
    b.sq('lit_orange', tuple(tip + np.array([0, 0, 0.004])), (0.020, 0.020, 0.020), e1=1.0, e2=1.0, nu=3, nv=6, smooth=True)
    return nd

def quirk_extra_shell(nd, L, seed):
    H = CM.HOP; b = nd.b; zc = (H['z0'] + H['z1']) / 2 + 0.09; xc = H['x0'] - 0.06; w = min(H['w'] * 0.72, 0.26); hgt = min(0.26, (H['z1'] - H['z0']) * 0.9 + 0.05)
    b.sq('paint', (xc, 0, zc), (0.11, w, hgt), (0, -90, 0), e1=0.65, e2=0.7, nu=4 if L['fine'] else 2, nv=10 if L['fine'] else 6, smooth=True, half=True)
    if not L['simple']:
        for j in (-1, 0, 1):
            for k in (-1, 1): b.box('cell', (xc - 0.052, j * w * 0.28, zc + k * hgt * 0.22), (0.006, w * 0.22, hgt * 0.34))
        for sy in (-1, 1): b.rod('twine', (H['x0'] - 0.02, sy * w * 0.35, H['z1'] - 0.005), (xc - 0.01, sy * w * 0.35, zc - hgt * 0.30), 0.0045, 0.0045, seg=4)
    return nd

def quirk_plant_pot(nd, L, seed):
    H = CM.HOP; b = nd.b; lz = H['z1'] + 0.012 + 0.0225; c = np.array(((H['x0'] + H['x1']) / 2 + 0.03, 0.095, lz)); rng = np.random.default_rng(seed + 3)
    b.cyl('clay', tuple(c + np.array([0, 0, 0.026])), 0.066, 0.052, seg=10 if L['fine'] else 6, taper=0.72); b.cyl('clay', tuple(c + np.array([0, 0, 0.054])), 0.074, 0.010, seg=10 if L['fine'] else 6)
    b.cyl('soil', tuple(c + np.array([0, 0, 0.057])), 0.058, 0.006, seg=8)
    for k in range(3):
        a = 2 * math.pi * k / 3 + rng.uniform(0, 1); p0 = c + np.array([0.008 * math.cos(a), 0.008 * math.sin(a), 0.058]); p1 = p0 + np.array([0.02 * math.cos(a), 0.02 * math.sin(a), 0.05 + 0.02 * k])
        b.rod('leaf', tuple(p0), tuple(p1), 0.006, 0.004, seg=4)
        if not L['simple']: b.sq('leaf', tuple(p1), (0.045, 0.022, 0.010), (0, 20, math.degrees(a)), e1=0.8, e2=0.8, nu=2, nv=6, half=True)
    if not L['simple']: b.cyl('twine', tuple(c + np.array([0, 0, 0.036])), 0.070, 0.008, seg=8)       # tied on with twine
    return nd


# ------------------------------------------------------------------------------------------------- the whole machine
def _node(nodes, name, parent, pivot):
    n = CM.Node(name, parent, pivot, CM.AXES.get(name)); nodes[name] = n; return n

def build_robot(rec, lod='hero', pose='rest'):
    """the node dict of one machine. Call it inside `with applied(rec)`; write_robot does."""
    L = CM.LOD[lod]; b = rec['body']; seed = dirt_seed(rec['seed']); nodes = {}; N = lambda name, parent, pivot: _node(nodes, name, parent, pivot)
    S = CM.SHELL; H = CM.HOP; sh = b['shell']; dr = b['drive']; hd_ = b['head']; ar = b['arm']; hp = b['hopper']
    root = N('collector', None, (0, 0, 0))
    sc = (b['scale'] * b['length_f'], b['scale'] * b['width_f'], b['scale'])
    root.scale = None if sc == (1.0, 1.0, 1.0) else sc
    ch = N('chassis', 'collector', (0, 0, 0)); yc = dr['track_y']
    tl = N('track_l', 'collector', (0, yc, 0.112 if dr['type'] == 'tracks' else dr['wheel_radius'])); tr = N('track_r', 'collector', (0, -yc, 0.112 if dr['type'] == 'tracks' else dr['wheel_radius']))
    sl = N('shell_l', 'collector', CM.HINGE + np.array([0, 0.175, 0])); sr = N('shell_r', 'collector', CM.HINGE + np.array([0, -0.175, 0]))
    hd = N('head', 'collector', CM.HEAD_PIVOT); lp = N('lamp', 'head', CM.LAMP_AT); ld = N('lamp_dome', 'lamp', CM.LAMP_AT)
    ab = N('arm_base', 'collector', CM.SHOULDER); am = N('arm_mid', 'arm_base', CM.ELBOW_STOW.copy()); at = N('arm_tip', 'arm_mid', CM.WRIST_STOW + np.array([0, -CM.ARM_DY, 0]))
    fl = N('finger_l', 'arm_tip', CM.WRIST_STOW.copy()); fr = N('finger_r', 'arm_tip', CM.WRIST_STOW.copy())
    hp_ = N('hopper', 'collector', (H['x1'], 0, H['z1'])); hl = N('hopper_lid', 'hopper', (H['x1'], 0, H['z1'] + 0.012))
    CM.part_chassis(ch, L, seed)
    if dr['type'] == 'tracks':
        CM.part_tracks(tl, 1, L, wheels=CM.WHEELS, yc=yc, width=dr['track_width'], dent=0.0); CM.part_tracks(tr, -1, L, wheels=CM.WHEELS, yc=yc, width=dr['track_width'], dent=(-13 if L['fine'] else 0.0))
    else:
        n = dr['wheels_per_side']; xr = 0.27 - min(dr['track_axle_m'], 0.58); xs = [round(0.27 - (0.27 - xr) * k / (n - 1), 4) for k in range(n)]
        part_wheels(tl, 1, L, xs, dr['wheel_radius'], yc, dr['track_width'] + 0.03); part_wheels(tr, -1, L, xs, dr['wheel_radius'], yc, dr['track_width'] + 0.03, dent=L['fine'])
    LS = L if sh.get('finish', 'solar') == 'solar' else dict(L, cells=(0, 0, 0))      # painted shells have no solar cells
    CM.part_shell_half(sl, 1, LS, seed, patch=False, crack=True, tape_strip=True); CM.part_shell_half(sr, -1, LS, seed, patch=True, crack=False, tape_strip=False)
    if sh['split_count'] == 4 and not L['simple']:
        shell_cross_seam(sl, 1, S, 0.06); shell_cross_seam(sr, -1, S, -0.06)
    CM.part_head(hd, L, seed); head_visor_style(hd, L, hd_['visor']); CM.part_lamp(lp, ld, CM.LAMP_AT, L)
    CM.part_arm(ab, am, at, fl, fr, L, seed); arm_extras(ab, am, at, fl, fr, L, ar['joints'], ar['gripper'])
    L2 = dict(L, litter=0) if 'seedbed' in rec['modules'] else L
    CM.part_hopper(hp_, hl, L2, seed); hopper_lid_style(hl, L, hp['lid'])
    if H['x0'] < -0.60 and not L['simple']:      # a long bin hangs behind the tub on two struts
        for sy in (-1, 1): hp_.b.rod('metal', (-0.50, sy * 0.14, 0.215), (H['x0'] + 0.06, sy * 0.14, H['z0'] + 0.01), 0.026, 0.026, seg=6)
    # modules
    cx = (H['x0'] + H['x1']) / 2
    mods = rec['modules']
    if 'seedbed' in mods: module_seedbed(N('module_seedbed', 'hopper', (cx, 0, H['z1'] - 0.05)), L, seed)
    if 'grow_light' in mods: module_grow_light(N('module_grow_light', 'collector', (cx, 0, H['z1'] + 0.27)), L, seed)
    if 'compost_tray' in mods: module_compost(N('module_compost', 'hopper', (H['x0'] - 0.07, 0, H['z0'] + 0.05)), L, seed)
    for pt in rec.get('parts', []):
        if L['simple'] and pt in ('side_bins', 'tool_rack'): continue      # the far level keeps only the silhouette parts
        if pt == 'ears': part_ears(N('part_ears', 'head', (0.395, 0, 0.356)), L, seed)
        elif pt == 'blade': part_blade(N('part_blade', 'collector', (0.455, 0, 0.105)), L, seed)
        elif pt == 'side_bins': part_bins(N('part_bins', 'hopper', (H['x0'] + 0.075, 0, H['z0'] + 0.13)), L, seed)
        elif pt == 'tool_rack': part_tools(N('part_tools', 'hopper', ((H['x0'] + H['x1']) / 2, -(H['w'] / 2 + 0.024), H['z1'] - 0.10)), L, seed)
    # quirks
    for q in rec['quirks']:
        name = 'quirk_' + q; par = RR.QUIRK_NOTES[name][0]
        piv = {'patch': (H['x0'] + 0.085, -0.1935 - (H['w'] - 0.38) / 2, 0.255 + (H['z0'] + H['z1']) / 2 - 0.275), 'mirror': (0.455, 0.078, 0.368), 'trinket': (H['x0'] + 0.085, -0.075, H['z1'] + 0.0345), 'panel': (H['x0'] + 0.085, 0.1985 + (H['w'] - 0.38) / 2, 0.30 + (H['z0'] + H['z1']) / 2 - 0.275),
               'tape': (0.3675, 0.095, 0.215), 'antenna': (H['x1'] - 0.02, -(H['w'] / 2 - 0.016), H['z1']), 'extra_shell': (H['x0'] - 0.06, 0, (H['z0'] + H['z1']) / 2 + 0.09), 'plant_pot': ((H['x0'] + H['x1']) / 2 + 0.03, 0.095, H['z1'] + 0.0345)}[q]
        nd = N(name, par, piv); dz = (H['z0'] + H['z1']) / 2 - 0.275
        if q == 'patch': CM.part_quirk_patch(nd, L, seed); shift_node(nd, (0, -(H['w'] - 0.38) / 2, dz))
        elif q == 'panel': CM.part_quirk_panel(nd, L, seed); shift_node(nd, (0, (H['w'] - 0.38) / 2, dz))
        elif q == 'mirror': CM.part_quirk_mirror(nd, L, seed)
        elif q == 'trinket': CM.part_quirk_trinket(nd, L, seed)
        else: {'tape': quirk_tape, 'antenna': quirk_antenna, 'extra_shell': quirk_extra_shell, 'plant_pot': quirk_plant_pot}[q](nd, L, seed)
    # rest tilts and the cocked head
    nodes['shell_l'].q = CM.rot_seq([('y', sh['tilt_l_deg'])]) if sh['tilt_l_deg'] else nodes['shell_l'].q
    nodes['shell_r'].q = CM.rot_seq([('y', sh['tilt_r_deg'])]) if sh['tilt_r_deg'] else nodes['shell_r'].q
    if hd_['roll_deg']: nodes['head'].q = CM.rot_seq([('x', hd_['roll_deg'])])
    if hp['lid_prop_deg']: nodes['hopper_lid'].q = CM.rot_seq([('y', hp['lid_prop_deg'])])
    hs = tuple(hd_['scale']); nodes['head'].scale = None if hs == (1.0, 1.0, 1.0) else hs
    for k, seq in CM.pose_rotations(pose).items():
        if k in nodes: nodes[k].q = CM.rot_seq(seq)
    return nodes


def write_robot(rec, path, lod='hero', pose='rest', force_generic=False):
    """build the machine of this recipe and write the GLB. The legacy recipe (seed 1) goes through collector_model.build unless force_generic."""
    if rec.get('legacy') and not force_generic:
        nodes = CM.build(lod, pose, CM.SEED); return CM.write_glb(path, nodes, lod, pose, CM.SEED)
    with applied(rec):
        nodes = build_robot(rec, lod, pose)
        return CM.write_glb(path, nodes, lod, pose, dirt_seed(rec['seed']))


def main(argv=None):
    ap = argparse.ArgumentParser(description='Build the GLB files of a robot recipe (python3 + numpy, no Blender).')
    ap.add_argument('--seed', type=int, required=True); ap.add_argument('--out', required=True); ap.add_argument('--lods', default='hero,live')
    ap.add_argument('--pose', default='rest'); ap.add_argument('--force-generic', action='store_true', help='seed 1: run the legacy values through this builder instead of collector_model.build')
    a = ap.parse_args(argv); os.makedirs(a.out, exist_ok=True); rec = RR.robot_recipe_for(a.seed)
    RR.write_recipe(rec, os.path.join(a.out, 'robot_recipe_seed%d.json' % a.seed)); rep = {}
    for lod in [x.strip() for x in a.lods.split(',') if x.strip()]:
        fn = os.path.join(a.out, 'robot_seed%d_%s.glb' % (a.seed, lod)); st = write_robot(rec, fn, lod, a.pose, a.force_generic)
        rep[lod] = dict(triangles=st['triangles'], vertices=st['vertices'], bytes=st['bytes'])
        print('GLB', fn, 'triangles', st['triangles'], 'vertices', st['vertices'], 'KB', round(st['bytes'] / 1024.0, 1), flush=True)
    with open(os.path.join(a.out, 'robot_report_seed%d.json' % a.seed), 'w') as f: json.dump(rep, f, indent=1, sort_keys=True)


if __name__ == '__main__':
    main()
