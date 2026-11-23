"""ROBOT RADICAL: six new body plans for the collector family (python3 + numpy, no Blender), built through the part functions of collector_model.py plus new parts.
    python3 robot_radical.py --seed N --out DIR [--lods hero,live]      writes robot_seedN_hero.glb and _live.glb for a radical recipe (robot_recipe_for(N, radical=True))
    write_radical(rec, path, lod) -> the stats dict of collector_model.write_glb;   build_radical(rec, lod) -> the node dict.
The plans (recipe field `plan`): walker (4 or 6 jointed legs with a gait, a shell on top), pontoon (twin floats, a flat deck, paddle wheels or props), spotter (tall stilts or a telescoping mast, tiny body, a lookout pod and the lamp),
roller (a big ball-like wheel, a small cab on a long neck, a tail with a bin), snail (a long low body on one wide belly track and a coiled shell that is the bin), crab (a wide low body, two sorting claws, a sideways stance).
The seventh plan, 'scout', is the favourite ear scout (small, three wheels a side, big ears, mustard paint most of the time) and goes through the ordinary robot_build.py builder with that look forced.
Family language kept on every plan: the head pod with its visor and the amber status lamp (colour code of the recipe), the tip-up solar shell halves (shell_l, shell_r), a cargo bin with its lid, the quirk slots, the role parts and
modules where they fit, the same paint palettes and baked wear. The 16 committed node names exist on every plan (an unused one is an empty node) so that the committed clips still run; every plan adds its own nodes and clips (leg gait, paddle wheels, roll, claws).
collector_model.py is not changed: `RadApplied` changes its module constants for the length of one build (through robot_build.applied) and restores them."""
import sys, os, math, json, argparse, copy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import collector_model as CM
import robot_recipe as RR
import robot_build as RB

PLAN_NODES = {     # plan -> its own nodes, (name, parent) in order
    'walker': [('leg_%d' % k, 'collector') for k in range(1, 7)],
    'pontoon': [('paddle_l', 'collector'), ('paddle_r', 'collector')],
    'spotter': [('leg_%d' % k, 'collector') for k in range(1, 5)],
    'roller': [('wheel_big', 'collector'), ('caster', 'collector')],
    'snail': [],
    'crab': [('leg_%d' % k, 'collector') for k in range(1, 7)] + [('claw_l', 'collector'), ('claw_r', 'collector'), ('claw_l_jaw', 'claw_l'), ('claw_r_jaw', 'claw_r')],
}
PLAN_NODE_NOTES = {'leg': 'a jointed leg (hip pivot); the walk clip swings and lifts it', 'paddle': 'a paddle wheel on the outside of a float; rotate about y (the paddle_spin clip)', 'wheel_big': 'the big ball-like wheel; rotate about y (the roll clip), positive rolls forward',
                   'caster': 'the small tail wheel', 'claw': 'a sorting claw (shoulder pivot)'}
PLAN_ZOOM = {'scout': 0.96, 'walker': 0.92, 'pontoon': 0.84, 'spotter': 0.74, 'roller': 0.82, 'snail': 0.86, 'crab': 0.88}      # preview camera distance factor per plan (below 1 = further out); the sizes are real, the framing is not
def preview_view(rec):
    """(camera distance factor, height looked at) for a preview of this recipe: taller machines are framed further out and higher"""
    p = rec['plan']; z = PLAN_ZOOM[p]; t = PLAN_TARGET_Z[p]
    if p == 'spotter': z, t = (0.60, 0.62) if rec['body']['dims']['variant'] == 'mast' else (0.70, 0.50)
    return z, t


PLAN_TARGET_Z = {'scout': 0.30, 'walker': 0.34, 'pontoon': 0.24, 'spotter': 0.48, 'roller': 0.42, 'snail': 0.34, 'crab': 0.30}


# ------------------------------------------------------------------------------------------------- small helpers
def move(nd, d, pivot=True):
    """move a node's drawn geometry (and its pivot) by the vector d"""
    d = np.asarray(d, float)
    RB.shift_node(nd, d)
    if pivot: nd.pivot = nd.pivot + d


def V(*a): return np.array(a, float)


def tub(b, L, mat, c, s, e=0.22):
    """a rounded body block (hero) or a plain box"""
    if L['fine']: b.sq(mat, tuple(c), tuple(s), e1=e, e2=e, nu=3, nv=8)
    else: b.box(mat, tuple(c), tuple(s))


def ball_joint(b, L, p, d, mat='hub'):
    b.sq(mat, tuple(p), (d, d, d), e1=1.0, e2=1.0, nu=5 if L['fine'] else 3, nv=12 if L['fine'] else 8, smooth=True)


def leg(nd, L, side, hip, knee, foot, d1, d2, splint=False, accent='arm', pad=0.10):
    """one jointed leg drawn into nd: hip ball, upper rod in body paint with an accent band above the knee, knee ball, lower rod of steel with a rubber boot, a rounded foot pad"""
    b = nd.b; seg = L['rods']; hip = np.asarray(hip, float); knee = np.asarray(knee, float); foot = np.asarray(foot, float)
    ball_joint(b, L, hip, d1 * 1.55); b.rod('paint2', tuple(hip), tuple(knee), d1, d1 * 0.9, seg=seg)
    u = (knee - hip) / np.linalg.norm(knee - hip); b.rod(accent, tuple(knee - u * 0.09), tuple(knee - u * 0.012), d1 * 1.18, d1 * 1.18, seg=seg)
    ball_joint(b, L, knee, d1 * 1.45)
    w = (foot - knee) / np.linalg.norm(foot - knee); top = foot + np.array([0, 0, 0.045])
    b.rod('metal', tuple(knee + w * 0.01), tuple(top), d2, d2 * 0.82, seg=seg)
    b.rod('rubber', tuple(knee + w * 0.07), tuple(knee + w * 0.15), d2 * 1.45, d2 * 1.45, seg=seg)
    b.sq('rubber', tuple(foot + np.array([0, 0, 0.0])), (pad, pad, 0.075), e1=0.8, e2=0.8, nu=3 if L['fine'] else 2, nv=8 if L['fine'] else 6, half=True)
    if splint:
        for k in (0.30, 0.55, 0.80): b.cyl('tape', tuple(knee + (foot - knee) * k), d2 * 1.9, 0.026, r=(0, 0, 0), seg=7)
        b.rod('metal', tuple(knee + (foot - knee) * 0.22 + np.array([0.034, 0, 0])), tuple(knee + (foot - knee) * 0.88 + np.array([0.034, 0, 0])), 0.012, 0.012, seg=5)
    if L['fine']:
        ys = np.array([0, side * 1, 0]) * (d1 * 0.95)
        CM.bolts_y(b, [tuple(knee + ys)], 0.016)


def tub_details(b, L, cx, cz, sx, sy, sz, plate=True):
    """louvres, a belly skid, a plain data plate with two rivets and a row of bolts on one body"""
    b.box('grime', (cx, 0, cz - sz / 2 - 0.004), (sx * 0.82, sy * 0.72, 0.03))
    if not L['simple']:
        for sg in (-1, 1):
            for k in range(5): b.box('grime', (cx - sx * 0.30, sg * (sy / 2 + 0.002), cz - sz * 0.3 + 0.012 * k), (0.07, 0.004, 0.006))
        if plate:
            b.box('metal', (cx + sx * 0.12, -(sy / 2 + 0.002), cz), (0.075, 0.004, 0.034)); CM.bolts_y(b, [(cx + sx * 0.12 - 0.032, -(sy / 2 + 0.005), cz), (cx + sx * 0.12 + 0.032, -(sy / 2 + 0.005), cz)], 0.009, 0.006)
    if L['fine']:
        CM.bolts_y(b, [(cx + sx * f, sg * (sy / 2 + 0.004), cz + sz * 0.28) for f in (-0.40, -0.14, 0.12, 0.38) for sg in (-1, 1)], 0.012, 0.007)


def make_shell(sl, sr, L, seed, rec, xc, a, b, c, z0, y0=0.04, e2=0.95):
    """the two tip-up solar shell halves of this machine: the committed part_shell_half with a shell of this plan's size and place. nd pivots = the hinge at the front edge."""
    S = CM.SHELL; saved = dict(S); sh = rec['body']['shell']
    S.update(xc=xc, a=a, b=b, c=c, z0=z0, y0=y0, e2=e2)
    LS = L if sh['finish'] == 'solar' else dict(L, cells=(0, 0, 0))
    CM.part_shell_half(sl, 1, LS, seed, patch=False, crack=True, tape_strip=True); CM.part_shell_half(sr, -1, LS, seed, patch=True, crack=False, tape_strip=False)
    if sh['split_count'] == 4 and not L['simple']:
        RB.shell_cross_seam(sl, 1, S, 0.18 * a); RB.shell_cross_seam(sr, -1, S, -0.18 * a)
    S.clear(); S.update(saved)
    hy = y0 + 0.5 * b
    sl.pivot = V(xc + a * 0.92, hy, z0 + 0.012); sr.pivot = V(xc + a * 0.92, -hy, z0 + 0.012)


def head_at(c, d, scale_note=None):
    """draw the committed head pod (visor style of the recipe) and the lamp, then move both to the head position d (the pod centre of the committed machine is (0.425, 0, 0.306))"""
    nodes = c['nodes']; L = c['L']; hd = nodes['head']; lp = nodes['lamp']; ld = nodes['lamp_dome']; d = np.asarray(d, float)
    CM.part_head(hd, L, c['seed']); RB.head_visor_style(hd, L, c['rec']['body']['head']['visor'])
    move(hd, d, pivot=False); hd.pivot = CM.HEAD_PIVOT + d
    CM.part_lamp(lp, ld, CM.LAMP_AT + d, L); lp.pivot = CM.LAMP_AT + d
    return d


# ------------------------------------------------------------------------------------------------- the bins of each plan (the committed part_hopper at the plan's place)
def bin_dims(rec):
    """the cargo bin of the plan: x0, x1 (back and front wall), width, floor z0, rim z1"""
    D = rec['body']['dims']; p = rec['plan']
    if p == 'walker':
        zc = D['stance'] - 0.14; x1 = -D['body_len'] / 2 + 0.03
        return dict(x0=round(x1 - 0.25, 4), x1=round(x1, 4), w=0.34, z0=round(zc - 0.10, 4), z1=round(zc + 0.12, 4))
    if p == 'pontoon':
        dz = D['float_h'] + 0.08; return dict(x0=-0.52, x1=-0.20, w=0.40, z0=round(dz, 4), z1=round(dz + 0.22, 4))
    if p == 'spotter':
        if D['variant'] == 'mast': return dict(x0=0.20, x1=0.43, w=0.30, z0=0.265, z1=0.45)
        hz = D['hip_z']; return dict(x0=-0.40, x1=-0.17, w=0.26, z0=round(hz - 0.14, 4), z1=round(hz + 0.06, 4))
    if p == 'roller':
        return dict(x0=-0.84, x1=-0.58, w=0.30, z0=0.30, z1=0.50)
    if p == 'snail':
        r = D['coil_r']; xc = -D['body_len'] / 2 + 0.05; zc = 0.39 + r - 0.03
        return dict(x0=round(xc - r, 4), x1=round(xc + r, 4), w=0.30, z0=round(zc - r, 4), z1=round(zc + r, 4))
    return dict(x0=-0.48, x1=-0.22, w=0.38, z0=0.20, z1=0.40)      # crab


# ------------------------------------------------------------------------------------------------- the plans. Each takes the context c and returns dict(head_d, tape_at, qoff, shoulder, legs)
def plan_walker(c):
    L = c['L']; rec = c['rec']; D = rec['body']['dims']; nodes = c['nodes']; N = c['N']; ch = nodes['chassis'].b; bl = D['body_len']; zc = D['stance'] - 0.14; sy = 0.40; sz = 0.17; zt = zc + sz / 2
    rng = np.random.default_rng(c['seed'] + 77)
    tub(ch, L, 'paint2', (0, 0, zc), (bl, sy, sz), e=0.34); tub(ch, L, 'paint', (bl / 2 - 0.02, 0, zc), (0.07, sy * 0.76, sz * 0.78), e=0.3)
    tub(ch, L, 'paint2', (-bl / 2 + 0.02, 0, zc), (0.06, sy * 0.9, sz * 0.9), e=0.3)
    tub_details(ch, L, 0.0, zc, bl, sy, sz)
    ch.box('metal', (0.0, 0, zt + 0.004), (bl * 0.80, 0.06, 0.012))          # a collar under the shell
    ch.box('paint', (bl / 2 - 0.02, 0, zt - 0.005), (0.10, 0.22, 0.06))         # the pedestal of the head
    n = D['legs'] // 2; xs = np.linspace(-bl * 0.30, bl * 0.30, n); legs = []; k = 0
    for side in (1, -1):
        for i, x in enumerate(xs):
            k += 1; st = rng.uniform(-D['stagger'], D['stagger']); st2 = rng.uniform(-D['stagger'], D['stagger'])
            hip = V(x, side * (sy / 2 + 0.01), zc); knee = V(x + st, side * (sy / 2 + 0.19), zc + 0.09 + D['knee_up'] * 0.5); foot = V(x + st + st2 * 1.5, side * (sy / 2 + 0.20 + D['splay'] + 0.05), 0.0)
            limp = (k - 1) == D['limp']
            if limp: foot[2] = 0.035; foot[1] -= side * 0.03
            nd = N('leg_%d' % k, 'collector', hip); ch.box('metal', (x, side * (sy / 2 - 0.004), zc), (0.11, 0.05, 0.12))
            leg(nd, L, side, hip, knee, foot, 0.074, 0.054, splint=limp, pad=0.15); legs.append(dict(node=nd.name, side=side, group=(i + (0 if side > 0 else 1)) % 2, kind='walk'))
    return dict(head_d=V(bl / 2 + 0.065 - 0.425, 0, zt + 0.045 - 0.306), tape_at=V(bl / 2 + 0.017, 0.10, zc + 0.01), qoff={}, shoulder=V(0, 0, zt), legs=legs,
                shell=dict(xc=-0.02, a=bl * 0.41, b=0.27, c=0.175, z0=zt - 0.004), gait=D['gait'])


def plan_pontoon(c):
    L = c['L']; rec = c['rec']; D = rec['body']['dims']; nodes = c['nodes']; N = c['N']; ch = nodes['chassis'].b; F = D['float_len']; g = D['float_gap']; fh = D['float_h']; dz = fh + 0.08; fw = 0.25
    for sg in (-1, 1):
        ch.sq('paint', (0, sg * g, fh / 2 + 0.012), (fh, fw, F), (0, 90, 0), e1=0.72 if D['bow'] == 'round' else 1.0, e2=1.0, nu=6 if L['fine'] else 4, nv=18 if L['fine'] else 10, smooth=False)
        ch.box('arm', (0, sg * (g + fw / 2 - 0.012), fh * 0.62), (F * 0.74, 0.010, 0.026))          # an accent stripe along the float
        ch.rod('rubber', (-F * 0.30, sg * (g + fw / 2 + 0.004), fh * 0.40), (F * 0.30, sg * (g + fw / 2 + 0.004), fh * 0.40), 0.032, 0.032, seg=6)       # a rub rail
        if not L['simple']:
            ch.sq('rubber', (F / 2 - 0.045, sg * g, fh * 0.55), (0.07, 0.07, 0.07), e1=1.0, e2=1.0, nu=3, nv=8, smooth=True)       # a bow fender ball
            ch.box('metal', (-F * 0.18, sg * g, fh + 0.014), (0.08, 0.05, 0.03))      # a cleat
    for x in (-F * 0.36, -F * 0.05, F * 0.28):
        ch.rod('metal', (x, -g, fh * 0.85), (x, g, fh * 0.85), 0.045, 0.045, seg=8)
        if L['fine']: CM.bolts_y(ch, [(x, sg * (g - fw / 2 - 0.004), fh * 0.85) for sg in (-1, 1)], 0.02)
    ch.box('paint2', (0, 0, dz - 0.0175), (F * 0.86, 2 * g + 0.10, 0.035))                  # the flat deck
    ch.box('metal', (0, 0, dz - 0.04), (F * 0.80, 2 * g - 0.10, 0.02))
    if not L['simple']:
        for k in range(7): ch.box('grime', (-F * 0.38 + k * F * 0.12, 0, dz + 0.001), (0.05, 2 * g * 0.72, 0.003))      # non-slip strips
    if D['rail']:
        for sg in (-1, 1):
            ps = [(x, sg * (g + 0.02)) for x in (-F * 0.40, -F * 0.12, F * 0.14)]
            for (x, y) in ps: ch.rod('metal', (x, y, dz), (x, y, dz + 0.12), 0.018, 0.018, seg=6)
            ch.rod('metal', (ps[0][0], ps[0][1], dz + 0.12), (ps[-1][0], ps[-1][1], dz + 0.12), 0.014, 0.014, seg=6)
    xh = F * 0.37
    ch.box('paint', (xh, 0, dz + 0.04), (0.14, 0.26, 0.09)); ch.box('metal', (xh, 0, dz + 0.0885), (0.16, 0.28, 0.012))       # the pedestal of the head
    tub_details(ch, L, 0.0, dz - 0.0175, F * 0.86, 2 * g + 0.10, 0.035, plate=False)
    # the drive: a paddle wheel outside each float, or a prop behind each float
    paddles = []
    for sg, nm in ((1, 'paddle_l'), (-1, 'paddle_r')):
        if D['drive'] == 'paddle':
            hub = V(-0.06, sg * (g + fw / 2 + 0.115), 0.20); nd = N(nm, 'collector', hub); b = nd.b; R = 0.19; wd = 0.13
            ch.rod('metal', (hub[0], sg * (g + fw / 2 - 0.03), hub[2]), tuple(hub), 0.045, 0.045, seg=8)
            b.cyl_y('hub', tuple(hub), 0.095, wd + 0.04, seg=10); b.cyl_y('bolt', (hub[0], hub[1] + sg * (wd / 2 + 0.024), hub[2]), 0.04, 0.01, seg=6)
            nb = 8; rr = R * 0.86
            for k in range(nb):
                a = 2 * math.pi * k / nb; a2 = 2 * math.pi * (k + 1) / nb
                b.box('paint', (hub[0] + math.cos(a) * R * 0.94, hub[1], hub[2] + math.sin(a) * R * 0.94), (0.030, wd, 0.095), (0, 90.0 - math.degrees(a), 0))
                for sy_ in ((-1, 1) if L['fine'] else (sg,)):
                    yy = hub[1] + sy_ * wd * 0.46
                    b.rod('metal', (hub[0], yy, hub[2]), (hub[0] + math.cos(a) * rr, yy, hub[2] + math.sin(a) * rr), 0.016, 0.016, seg=4)
                    b.rod('metal', (hub[0] + math.cos(a) * rr, yy, hub[2] + math.sin(a) * rr), (hub[0] + math.cos(a2) * rr, yy, hub[2] + math.sin(a2) * rr), 0.018, 0.018, seg=4)
            paddles.append(dict(node=nm, axis='y', side=sg))
        else:
            hub = V(-F / 2 - 0.035, sg * g, fh * 0.55); nd = N(nm, 'collector', hub); b = nd.b
            ch.sq('metal', (-F / 2 + 0.03, sg * g, fh * 0.55), (0.12, 0.09, 0.09), e1=0.8, e2=0.8, nu=3, nv=8, smooth=True)
            ch.rod('metal', (-F / 2 + 0.03, sg * g, fh * 0.55), tuple(hub + V(0.012, 0, 0)), 0.032, 0.032, seg=8)
            b.sq('hub', tuple(hub), (0.07, 0.06, 0.06), e1=0.8, e2=0.8, nu=3, nv=8, smooth=True)
            for k in range(3):
                a = 2 * math.pi * k / 3 + 0.3
                b.box('paint', (hub[0] - 0.01, hub[1] + math.cos(a) * 0.085, hub[2] + math.sin(a) * 0.085), (0.016, 0.075, 0.13 * 0.55 + 0.04), (math.degrees(a) - 90.0, 28, 0))
            paddles.append(dict(node=nm, axis='x', side=sg))
    if D['drive'] == 'paddle': pass
    return dict(head_d=V(xh + 0.12 - 0.425, 0, dz + 0.0885 + 0.07 - 0.306), tape_at=V(xh + 0.072, 0.07, dz + 0.04), qoff={}, shoulder=V(0, 0, dz), legs=[], paddles=paddles,
                shell=dict(xc=0.06, a=0.25, b=0.25, c=0.135, z0=dz - 0.002))


def plan_spotter(c):
    L = c['L']; rec = c['rec']; D = rec['body']['dims']; nodes = c['nodes']; N = c['N']; ch = nodes['chassis'].b
    if D['variant'] == 'mast': return plan_mast(c)
    hz = D['hip_z']; sx, sy, sz = 0.40, 0.32, 0.15; zt = hz + sz / 2; legs = []; nl = D['legs']
    tub(ch, L, 'paint2', (0, 0, hz), (sx, sy, sz)); tub(ch, L, 'paint', (sx / 2 - 0.02, 0, hz), (0.06, sy * 0.78, sz * 0.8), e=0.3); tub_details(ch, L, 0.0, hz, sx, sy, sz)
    ch.box('metal', (0.0, 0, zt + 0.003), (sx * 0.8, 0.05, 0.010))
    ch.rod('metal', (0.13, 0, zt - 0.01), (0.19, 0, zt + 0.09), 0.075, 0.07, seg=8); ch.cyl('arm', (0.16, 0, zt + 0.045), 0.092, 0.020, r=(0, 0, 0), seg=10)       # the stalk under the pod
    angs = [45, 135, 225, 315] if nl == 4 else [0, 120, 240]
    rng = np.random.default_rng(c['seed'] + 91)
    for i, ad in enumerate(angs):
        a = math.radians(ad); ux, uy = math.cos(a), math.sin(a); st = rng.uniform(-0.03, 0.03)
        rh = 0.14 if nl == 4 else 0.13; hip = V(ux * rh * (1.05 if nl == 4 else 1.0), uy * rh, hz - 0.02); knee = V(ux * 0.30 + st, uy * 0.30, hz * 0.56); foot = V(ux * 0.47 + st, uy * 0.47, 0.0)
        nd = N('leg_%d' % (i + 1), 'collector', hip)
        leg(nd, L, 1 if uy > 0 else -1, hip, knee, foot, 0.044, 0.030, pad=0.095, accent='arm')
        legs.append(dict(node=nd.name, side=(1 if uy > 0 else -1), group=i % 2, kind='stilt'))
        ch.box('metal', (ux * rh * 0.8, uy * rh * 0.8, hz - 0.02), (0.07, 0.07, 0.10), (0, 0, ad))
    if D['brace']:
        for z_ in (hz * 0.28,):
            pts = []
            for ad in angs:
                a = math.radians(ad); f = (hz * 0.56 - z_) / (hz * 0.56); r_ = 0.30 + 0.17 * (1 - f) ; pts.append(V(math.cos(a) * r_, math.sin(a) * r_, z_))
            for i in range(len(pts)): ch.rod('metal', tuple(pts[i]), tuple(pts[(i + 1) % len(pts)]), 0.016, 0.016, seg=5)
            for p in pts: ch.cyl('tape', tuple(p), 0.034, 0.030, seg=7)
    return dict(head_d=V(0.30 - 0.425, 0, zt + 0.125 + D['pod_up'] - 0.306), tape_at=V(sx / 2 + 0.002, 0.08, hz), qoff={}, shoulder=V(0, 0, zt), legs=legs,
                shell=dict(xc=-0.06, a=0.17, b=0.15, c=0.095, z0=zt - 0.003), gait='stilt')


def plan_mast(c):
    L = c['L']; rec = c['rec']; D = rec['body']['dims']; nodes = c['nodes']; N = c['N']; ch = nodes['chassis'].b; mh = D['mast_h']; sx, sy, sz = 0.88, 0.40, 0.15; zc = 0.19; zt = zc + sz / 2
    tub(ch, L, 'paint2', (0, 0, zc), (sx, sy, sz)); tub(ch, L, 'paint', (sx / 2 - 0.02, 0, zc), (0.07, sy * 0.8, sz * 0.8), e=0.3); tub_details(ch, L, 0.0, zc, sx, sy, sz)
    ch.box('metal', (0.0, 0, zt + 0.003), (sx * 0.9, 0.2, 0.010))
    xm = 0.10
    for (z0, z1, d, m) in ((zt, 0.62, 0.105, 'paint2'), (0.57, 0.95, 0.080, 'metal'), (0.90, mh, 0.056, 'paint2')):
        ch.rod(m, (xm, 0, z0), (xm, 0, z1), d, d, seg=12 if L['fine'] else 8)
        ch.cyl('arm', (xm, 0, z1 - 0.012), d * 1.35, 0.030, seg=10)
    ch.cyl('metal', (xm, 0, mh + 0.004), 0.15, 0.016, seg=10)
    if L['fine']: CM.bolts(ch, [(xm + 0.05 * math.cos(a), 0.05 * math.sin(a), mh + 0.014) for a in (0.5, 2.6, 4.7)], 0.012)
    for (ax, ay) in ((0.38, 0.17), (0.38, -0.17), (-0.38, 0.17), (-0.38, -0.17)):
        ch.rod('twine', (xm, 0, mh * 0.80), (ax, ay, zt + 0.004), 0.007, 0.007, seg=4); ch.cyl('metal', (ax, ay, zt + 0.012), 0.03, 0.02, seg=6)
    xs = [-0.30, 0.0, 0.30]; yc = 0.265
    ntl = nodes['track_l']; ntr = nodes['track_r']
    ntl.pivot = V(0, yc, 0.12); ntr.pivot = V(0, -yc, 0.12)
    RB.part_wheels(ntl, 1, L, xs, 0.12, yc, 0.13); RB.part_wheels(ntr, -1, L, xs, 0.12, yc, 0.13, dent=L['fine'])
    return dict(head_d=V(xm + 0.115 - 0.425, 0, mh + 0.07 - 0.306 + 0.02), tape_at=V(sx / 2 + 0.002, 0.10, zc), qoff={}, shoulder=V(0, 0, zt), legs=[],
                shell=dict(xc=-0.22, a=0.19, b=0.19, c=0.09, z0=zt - 0.002), gait='none')


def plan_roller(c):
    L = c['L']; rec = c['rec']; D = rec['body']['dims']; nodes = c['nodes']; N = c['N']; ch = nodes['chassis'].b; R = D['ball_r']; W = D['ball_w']; xb = 0.30; zc = 0.36
    wb = N('wheel_big', 'collector', V(xb, 0, R)); b = wb.b; seg = 28 if L['fine'] else 14
    b.sq('paint' if D['style'] == 'banded' else 'rubber', (xb, 0, R), (2 * R, 2 * R, W), (90, 0, 0), e1=0.85, e2=1.0, nu=5 if L['fine'] else 3, nv=seg, smooth=False)
    nl = 22 if L['fine'] else 12
    if D['style'] == 'banded':
        for sgb in (-1, 1): b.cyl_y('rubber', (xb, sgb * W * 0.20, R), 2 * R * 0.968, W * 0.17, seg=28 if L['fine'] else 14)
        rows = [(-W * 0.20, math.pi / nl), (W * 0.20, 0.0)]; lw = W * 0.15
    else:                                   # a bare rubber ball covered in rows of lugs
        rows = [(-W * 0.30, 0.0), (-W * 0.10, math.pi / nl), (W * 0.10, 0.0), (W * 0.30, math.pi / nl)]; lw = W * 0.14
    if not L['simple']:
        for yy, off in rows:
            rad = R * (0.985 if D['style'] == 'banded' else 0.93 + 0.0 * abs(yy))
            for k in range(nl):
                a = 2 * math.pi * k / nl + off
                b.box('rubber' if D['style'] == 'banded' else 'link', (xb + rad * math.cos(a), yy, R + rad * math.sin(a)), (0.040, lw, 0.030), (0, -(math.degrees(a) + 90.0), 0), skip=(0,))
    for sg in (-1, 1):
        y = sg * (W / 2 - 0.005)
        b.cyl_y('hub', (xb, y, R), 2 * R * 0.40, 0.030, seg=24 if L['fine'] else 12); b.cyl_y('arm', (xb, y + sg * 0.012, R), 2 * R * 0.30, 0.030, seg=18 if L['fine'] else 10)
        if L['fine']:
            for k in range(8): a = 2 * math.pi * k / 8 + 0.2; CM.bolts_y(b, [(xb + 0.34 * R * math.cos(a), y + sg * 0.012, R + 0.34 * R * math.sin(a))], 0.018)
            b.cyl_y('bolt', (xb, y + sg * 0.036, R), 2 * R * 0.10, 0.014, seg=6)
    # axle, fork arms, cab
    ch.rod('metal', (xb, -W / 2 - 0.07, R), (xb, W / 2 + 0.07, R), 0.07, 0.07, seg=8)
    cabx = -0.30; cabz = 0.36; tub(ch, L, 'paint2', (cabx, 0, cabz), (0.46, 0.36, 0.20)); tub(ch, L, 'paint', (cabx + 0.21, 0, cabz), (0.06, 0.28, 0.16), e=0.3); tub_details(ch, L, cabx, cabz, 0.46, 0.36, 0.20)
    zt = cabz + 0.10; ch.box('metal', (cabx, 0, zt + 0.003), (0.40, 0.05, 0.010))
    for sg in (-1, 1):
        a0 = V(xb, sg * (W / 2 + 0.05), R); a1 = V(cabx + 0.22, sg * 0.19, cabz + 0.02)
        ch.rod('paint', tuple(a0), tuple(a1), 0.060, 0.050, seg=8); ball_joint(ch, L, a0, 0.085); ball_joint(ch, L, a1, 0.075)
        ch.rod('arm', tuple(a0 + (a1 - a0) * 0.08), tuple(a0 + (a1 - a0) * 0.30), 0.072, 0.072, seg=8)
        if L['fine']: CM.bolts_y(ch, [tuple(a0 + V(0, sg * 0.042, 0))], 0.022)
    # the neck: a two-part periscope with a collar, the head peering over the wheel
    nb = V(cabx + 0.16, 0, zt - 0.01); nt = V(0.02, 0, D['neck_h'] - 0.03)
    ch.rod('paint2', tuple(nb), tuple(nb + (nt - nb) * 0.55), 0.085, 0.080, seg=10 if L['fine'] else 6); ch.rod('metal', tuple(nb + (nt - nb) * 0.50), tuple(nt), 0.056, 0.050, seg=10 if L['fine'] else 6)
    ch.cyl('arm', tuple(nb + (nt - nb) * 0.55), 0.115, 0.032, r=(0, 0, 0), seg=10)
    # the tail: a boom with a caster wheel, the bin riding on it
    boom0 = V(cabx - 0.22, 0, 0.30); boom1 = V(-0.90, 0, 0.255)
    ch.rod('metal', tuple(boom0), tuple(boom1), 0.075, 0.07, seg=8); ch.rod('paint2', tuple(boom0 + (boom1 - boom0) * 0.04), tuple(boom0 + (boom1 - boom0) * 0.30), 0.092, 0.092, seg=8)
    cs = N('caster', 'collector', V(-0.90, 0, 0.085)); cb = cs.b
    cb.cyl_y('rubber', (-0.90, 0, 0.085), 0.17, 0.065, seg=16 if L['fine'] else 8); cb.cyl_y('hub', (-0.90, 0.036, 0.085), 0.07, 0.012, seg=8); cb.cyl_y('hub', (-0.90, -0.036, 0.085), 0.07, 0.012, seg=8)
    ch.rod('metal', (-0.90, 0.05, 0.255), (-0.90, 0.05, 0.085), 0.026, 0.026, seg=5); ch.rod('metal', (-0.90, -0.05, 0.255), (-0.90, -0.05, 0.085), 0.026, 0.026, seg=5)
    for xx in (-0.60, -0.82): ch.box('metal', (xx, 0, 0.275), (0.05, 0.22, 0.016))
    return dict(head_d=V(0.02 + 0.08 - 0.425, 0, D['neck_h'] + 0.035 - 0.306), tape_at=V(cabx + 0.246, 0.08, cabz), qoff={}, shoulder=V(cabx, 0, zt), legs=[], roll=True,
                shell=dict(xc=cabx - 0.04, a=0.19, b=0.16, c=0.095, z0=zt - 0.002))


def plan_snail(c):
    L = c['L']; rec = c['rec']; D = rec['body']['dims']; nodes = c['nodes']; N = c['N']; ch = nodes['chassis'].b; bl = D['body_len']; r = D['coil_r']; tw = D['track_w']; zb = 0.32
    xc = -bl / 2 + 0.05; zc = 0.39 + r - 0.03; w = 0.30
    tub(ch, L, 'paint2', (0, 0, zb), (bl, 0.42, 0.14), e=0.30); tub(ch, L, 'paint', (bl / 2 - 0.05, 0, zb + 0.005), (0.20, 0.34, 0.15), e=0.45); tub_details(ch, L, 0.0, zb, bl, 0.42, 0.14)
    for sg in (-1, 1):
        ch.box('guard', (0.0, sg * (0.215), zb - 0.045), (bl * 0.86, 0.016, 0.06))              # the fringe of the foot
        for k in range(6 if L['fine'] else 3): ch.box('metal', (-bl * 0.36 + k * bl * 0.15, sg * 0.226, zb - 0.045), (0.022, 0.012, 0.05))
    ch.box('metal', (xc + 0.0, 0, 0.405), (0.5, 0.26, 0.012))
    # the single wide belly track
    ntl = nodes['track_l']; ntr = nodes['track_r']; ntl.pivot = V(0, 0, 0.112); ntr.pivot = V(0, 0, 0.112)
    wheels = [(round(-bl * 0.36, 4), 0.112, 0.10), (round(bl * 0.36, 4), 0.127, 0.115)]
    CM.part_tracks(ntl, 1, L, wheels=wheels, yc=0.0, width=tw, dent=0.0)
    # the neck and head, raised
    hx = bl / 2 - 0.02; hzz = zb + 0.17 + D['head_up']
    ch.rod('rubber', (bl / 2 - 0.16, 0, zb + 0.02), (hx, 0, hzz - 0.03), 0.105, 0.095, seg=10 if L['fine'] else 6)
    for k in (0.3, 0.6, 0.85): p = V(bl / 2 - 0.16, 0, zb + 0.02) + (V(hx, 0, hzz - 0.03) - V(bl / 2 - 0.16, 0, zb + 0.02)) * k; ch.cyl('metal', tuple(p), 0.125, 0.014, r=(0, 90, 0), seg=10)
    # the coiled shell that is the bin: a drum with a spiral ridge on both faces, bands, a hub and a hatch
    hp = nodes['hopper']; hl = nodes['hopper_lid']; b = hp.b
    b.sq('paint2', (xc, 0, zc), (2 * r, 2 * r, w), (90, 0, 0), e1=0.28, e2=1.0, nu=4 if L['fine'] else 3, nv=28 if L['fine'] else 14, smooth=False)
    turns = D['turns']; npts = int(20 * turns) if L['fine'] else int(11 * turns); r_in = 0.05; r_out = r - 0.028
    for sg in (-1, 1):
        y = sg * (w / 2 + 0.004)
        if D['coil_style'] == 'spiral':
            pts = []
            for k in range(npts + 1):
                th = 2 * math.pi * turns * k / npts; rho = r_in + (r_out - r_in) * (k / npts); pts.append(V(xc + rho * math.cos(th + (0.0 if sg > 0 else math.pi * 0.5)), y, zc + rho * math.sin(th + (0.0 if sg > 0 else math.pi * 0.5))))
            for k in range(npts): b.rod('arm', tuple(pts[k]), tuple(pts[k + 1]), 0.026, 0.026, seg=5 if L['fine'] else 4)
        else:                                    # nested rings and spokes, a wagon-wheel face
            ns = 24 if L['fine'] else 12
            for rho in (r_out * 0.42, r_out * 0.72, r_out):
                for k in range(ns):
                    a0 = 2 * math.pi * k / ns; a1 = 2 * math.pi * (k + 1) / ns
                    b.rod('arm', (xc + rho * math.cos(a0), y, zc + rho * math.sin(a0)), (xc + rho * math.cos(a1), y, zc + rho * math.sin(a1)), 0.024, 0.024, seg=5 if L['fine'] else 4)
            for k in range(8 if L['fine'] else 6):
                a0 = 2 * math.pi * k / (8 if L['fine'] else 6) + 0.2; b.rod('metal', (xc + r_in * math.cos(a0), y, zc + r_in * math.sin(a0)), (xc + r_out * math.cos(a0), y, zc + r_out * math.sin(a0)), 0.018, 0.018, seg=4)
        b.cyl_y('hub', (xc, y + sg * 0.004, zc), 0.10, 0.016, seg=10); b.cyl_y('bolt', (xc, y + sg * 0.014, zc), 0.036, 0.012, seg=6)
        if not L['simple']: b.cyl_y('metal', (xc, sg * (w / 2 - 0.036), zc), 2 * r + 0.014, 0.014, seg=28 if L['fine'] else 14)
    if L['fine']: CM.bolts_y(b, [(xc + (r - 0.012) * math.cos(a), sg * (w / 2 + 0.006), zc + (r - 0.012) * math.sin(a)) for a in np.linspace(0.3, 6.0, 9) for sg in (-1, 1)], 0.014, 0.008)
    for sg in (-1, 1):
        a0 = V(xc, sg * 0.16, zc - 0.02); a1 = V(xc + 0.02, sg * 0.17, zb + 0.07); ch.rod('metal', tuple(a0), tuple(a1), 0.05, 0.06, seg=8)
    ch.rod('metal', (xc, -0.20, zc), (xc, 0.20, zc), 0.040, 0.040, seg=8)
    hlb = hl.b; hx0 = xc + 0.10
    hl.pivot = V(hx0, 0, zc + r + 0.008); hp.pivot = V(xc, 0, zc)
    hlb.sq('paint', (xc - 0.02, 0, zc + r - 0.004), (0.26, 0.22, 0.06), e1=0.5, e2=0.5, nu=3, nv=10, smooth=True, half=True); hlb.cyl_y('metal', (hx0, 0, zc + r + 0.008), 0.024, 0.2, seg=8)
    if L['fine']: hlb.rod('metal', (xc - 0.12, -0.05, zc + r + 0.028), (xc - 0.12, 0.05, zc + r + 0.028), 0.014, 0.014, seg=6)
    hd_d = V(hx + 0.07 - 0.425, 0, hzz + 0.03 - 0.306)
    qoff = {'trinket': V(r - 0.085 - 0.04, 0, 0.0), 'antenna': V((xc + 0.10) - (xc + r - 0.02), 0, 0.0)}
    return dict(head_d=hd_d, tape_at=V(bl / 2 + 0.048, 0.10, zb + 0.0), qoff=qoff, shoulder=V(0, 0, zb + 0.07), legs=[], head_pitch=-10.0, custom_bin=True,
                shell=dict(xc=0.16, a=0.30, b=0.19, c=0.11, z0=0.395))


def plan_crab(c):
    L = c['L']; rec = c['rec']; D = rec['body']['dims']; nodes = c['nodes']; N = c['N']; ch = nodes['chassis'].b; bw = D['body_w']; zc = 0.28; sx = 0.52; sz = 0.17; zt = zc + sz / 2; hw = bw / 2
    rng = np.random.default_rng(c['seed'] + 61)
    if L['fine']: ch.sq('paint2', (0, 0, zc), (sx, bw, sz), e1=0.40, e2=0.85, nu=4, nv=20)
    else: ch.box('paint2', (0, 0, zc), (sx, bw, sz))
    ch.box('grime', (0, 0, zc - sz / 2 - 0.004), (sx * 0.8, bw * 0.7, 0.03))
    ch.box('metal', (-0.02, 0, zt + 0.003), (sx * 0.84, 0.05, 0.010))
    if not L['simple']:
        ch.box('metal', (0.13, -(hw - 0.052), zc), (0.075, 0.004, 0.034))
    if L['fine']: CM.bolts(ch, [(sx * f, 0.0, zt - 0.002) for f in (-0.30, 0.36)], 0.012)
    # eye stalks: two short posts carrying the wide head
    for sg in (-1, 1): ch.rod('metal', (0.20, sg * 0.10, zc + 0.04), (0.27, sg * 0.10, zt + 0.10), 0.040, 0.034, seg=6)
    ch.box('paint', (0.22, 0, zc + 0.01), (0.10, 0.36, 0.10))
    # legs: two or three a side, lying across the body, lifted at the knee
    n = D['legs_per_side']; xs = np.linspace(-0.13, 0.13, n) if n == 3 else np.array([-0.09, 0.10]); legs = []; k = 0
    for side in (1, -1):
        for i, x in enumerate(xs):
            k += 1; st = rng.uniform(-0.03, 0.03); hip = V(x, side * (hw - 0.03), zc - 0.01); knee = V(x + st, side * (hw + 0.17), zc + 0.095); foot = V(x + st * 1.8 + 0.02, side * (hw + 0.31), 0.0)
            nd = N('leg_%d' % k, 'collector', hip); leg(nd, L, side, hip, knee, foot, 0.062, 0.044, pad=0.11)
            legs.append(dict(node=nd.name, side=side, group=(i + (0 if side > 0 else 1)) % 2, kind='crab'))
    # the claws: a big rounded palm and two curved fingers that close on each other, held low in front of the wide head; one claw is often raised with a bit in it
    cs = D['claw_scale']; pose = D['claw_pose']; up = {'one_up': (1, 0), 'both_down': (0, 0), 'wide': (0, 0)}[pose]; wide = pose == 'wide'
    claws = []; sm = lambda a_, b_: (a_ if L['fine'] else b_)
    for side, nm, nj, raised in ((1, 'claw_l', 'claw_l_jaw', up[0]), (-1, 'claw_r', 'claw_r_jaw', up[1])):
        sh = V(0.12, side * (hw - 0.06), zc + 0.05); nd = nodes[nm]; nd.pivot = sh; nj_ = nodes[nj]; b = nd.b
        lift = 0.26 if raised else 0.0
        el = V(0.16, side * (hw + 0.26), zc + 0.11 + lift * 0.55); wr = V(0.38, side * (hw + 0.20), zc + 0.01 + lift)
        if raised: el = V(0.12, side * (hw + 0.30), zc + 0.16 + lift * 0.5); wr = V(0.30, side * (hw + 0.34), zc + 0.04 + lift)
        if wide: el = V(0.10, side * (hw + 0.30), zc + 0.10); wr = V(0.20, side * (hw + 0.50), zc + 0.04)
        ball_joint(b, L, sh, 0.12); b.rod('paint2', tuple(sh), tuple(el), 0.080 * cs, 0.068 * cs, seg=L['rods']); ball_joint(b, L, el, 0.105)
        b.rod('arm', tuple(el + (sh - el) * 0.10), tuple(el + (sh - el) * 0.34), 0.096 * cs, 0.096 * cs, seg=L['rods'])
        b.rod('paint2', tuple(el), tuple(wr), 0.070 * cs, 0.090 * cs, seg=L['rods'])
        pc = wr + V(0.075 * cs, -side * 0.010, 0.0)
        b.sq('paint', tuple(pc), (0.20 * cs, 0.17 * cs, 0.135 * cs), e1=0.8, e2=0.8, nu=sm(4, 3), nv=sm(12, 7), smooth=True)
        b.cyl('bolt', tuple(pc + V(0.0, side * 0.087 * cs, 0.0)), 0.026, 0.012, r=(90, 0, 0), seg=6)
        # the fixed finger on the outer side: two tapered rods curving inward
        f0 = pc + V(0.07 * cs, side * 0.050 * cs, -0.012); f1 = f0 + V(0.095 * cs, side * 0.012 * cs, -0.004); f2 = f1 + V(0.075 * cs, -side * 0.034 * cs, -0.002)
        b.rod('paint', tuple(f0), tuple(f1), 0.070 * cs, 0.050 * cs, seg=sm(8, 5)); b.rod('paint', tuple(f1), tuple(f2), 0.050 * cs, 0.030 * cs, seg=sm(8, 5)); b.sq('rubber', tuple(f2), (0.035 * cs,) * 3, e1=1.0, e2=1.0, nu=2, nv=6, smooth=True)
        # the jaw (its own node): the inner finger, curving the other way; it opens about z
        nj_.pivot = pc + V(0.07 * cs, -side * 0.050 * cs, -0.012); jb = nj_.b; j0 = nj_.pivot
        j1 = j0 + V(0.095 * cs, -side * 0.012 * cs, 0.0); j2 = j1 + V(0.075 * cs, side * 0.030 * cs, 0.0)
        jb.rod('paint', tuple(j0), tuple(j1), 0.066 * cs, 0.048 * cs, seg=sm(8, 5)); jb.rod('paint', tuple(j1), tuple(j2), 0.048 * cs, 0.028 * cs, seg=sm(8, 5)); jb.sq('rubber', tuple(j2), (0.034 * cs,) * 3, e1=1.0, e2=1.0, nu=2, nv=6, smooth=True)
        jb.cyl('hub', tuple(j0), 0.050, 0.07, seg=8)
        if raised: jb.sq('lit_glass' if side > 0 else 'lit_orange', tuple((j1 + j2) / 2 + V(0.0, 0.0, 0.0)), (0.040, 0.040, 0.040), e1=1.0, e2=1.0, nu=2, nv=6, smooth=True)       # a bit being sorted
        claws.append(dict(node=nj, side=side, raised=bool(raised)))
    # sorting trays at the front corners
    if D['trays']:
        rng2 = np.random.default_rng(c['seed'] + 63)
        for side, mats in ((1, ('lit_glass', 'lit_blue')), (-1, ('lit_orange', 'lit_white'))):
            tc = V(0.58, side * (hw + 0.17), 0.10)
            ch.box('paint2', tuple(tc + V(0, 0, -0.02)), (0.15, 0.14, 0.014)); ch.box('paint2', tuple(tc + V(0.07, 0, 0.0)), (0.012, 0.14, 0.05)); ch.box('paint2', tuple(tc + V(-0.07, 0, 0.0)), (0.012, 0.14, 0.05))
            ch.box('paint2', tuple(tc + V(0, side * 0.065, 0.0)), (0.15, 0.012, 0.05)); ch.box('paint2', tuple(tc + V(0, -side * 0.065, 0.0)), (0.15, 0.012, 0.05))
            ch.rod('metal', tuple(V(0.20, side * (hw - 0.05), zc - 0.02)), tuple(tc + V(-0.07, 0, -0.02)), 0.026, 0.026, seg=5)
            for j in range(3 if L['fine'] else 2): ch.cyl(mats[j % 2], tuple(tc + V(rng2.uniform(-0.03, 0.03), rng2.uniform(-0.03, 0.03), -0.008 + 0.01 * (j // 2))), 0.028, 0.012, r=(rng2.uniform(-20, 20), rng2.uniform(-20, 20), 0), seg=7)
    return dict(head_d=V(0.30 - 0.425, 0, zt + 0.16 - 0.306), tape_at=V(0.262, 0.10, zc - 0.01), qoff={}, shoulder=V(0, 0, zt), legs=legs, claws=claws,
                shell=dict(xc=-0.02, a=0.25, b=hw - 0.02, c=0.14, z0=zt - 0.004), gait='crab')


PLAN_FN = {'walker': plan_walker, 'pontoon': plan_pontoon, 'spotter': plan_spotter, 'roller': plan_roller, 'snail': plan_snail, 'crab': plan_crab}


# ------------------------------------------------------------------------------------------------- the clips of the new nodes (gait, paddle, roll, claws), added to the committed ones
def _loop(node, fn, dur, n=8):
    times = [dur * k / n for k in range(n + 1)]; qs = []
    for k in range(n + 1):
        q = CM.rot_seq(fn(k / n))
        if qs and CM._qdot(q, qs[-1]) < 0: q = tuple(-x for x in q)
        qs.append(q)
    return (node, 'rotation', times, qs, 'LINEAR')


def extra_clips(info, plan):
    C = {}
    legs = info.get('legs') or []
    if legs:
        kind = legs[0]['kind']; A = {'walk': 14.0, 'stilt': 8.0, 'crab': 0.0}[kind]; lift = {'walk': 12.0, 'stilt': 7.0, 'crab': 16.0}[kind]; dur = {'walk': 1.6, 'stilt': 2.4, 'crab': 1.4}[kind]; ch = []
        for lg in legs:
            s = lg['side']; ph = 0.5 * lg['group']
            def fn(t, s=s, ph=ph):
                ang = 2 * math.pi * (t + ph); return [('z', s * A * math.sin(ang)), ('x', s * lift * max(0.0, math.cos(ang)))]
            ch.append(_loop(lg['node'], fn, dur))
        C['walk'] = dict(duration=dur, note={'walk': 'a tripod gait: the legs swing about the hip in two alternating groups and the free group lifts; loop it', 'stilt': 'slow, careful stilt steps: two groups of legs lift and swing a little in turn; loop it',
                                             'crab': 'a sideways shuffle: the legs of the two groups lift in turn (about the body-forward axis); loop it'}[kind], channels=ch)
    for p in info.get('paddles') or []:
        ax = p['axis']; s = p['side']
        C.setdefault('paddle_spin', dict(duration=2.0, note='the paddle wheels (or props) turn through a full turn, loop it', channels=[]))['channels'].append(_loop(p['node'], lambda t, ax=ax, s=s: [(ax, (-360.0 if ax == 'y' else 360.0) * t)], 2.0, 8))
    if info.get('roll'):
        C['roll'] = dict(duration=2.4, note='the big wheel rolls forward through one full turn (about y), loop it', channels=[_loop('wheel_big', lambda t: [('y', 360.0 * t)], 2.4, 8), _loop('caster', lambda t: [('y', 360.0 * 2.4 * t)], 2.4, 12)])
    if info.get('claws'):
        ch = []
        for cl in info['claws']:
            s = cl['side']; ph = 0.0 if s > 0 else 0.5
            ch.append(_loop(cl['node'], lambda t, s=s, ph=ph: [('z', s * -24.0 * (0.5 - 0.5 * math.cos(2 * math.pi * (t + ph))))], 1.8))
        C['claw_sort'] = dict(duration=1.8, note='the sorting claws open and close in turn (the jaw nodes), loop it', channels=ch)
    return C


# ------------------------------------------------------------------------------------------------- changing and restoring the constants of collector_model
class RadApplied(RB.applied):
    """like robot_build.applied, for a radical recipe: the paint, wear, lamp code, node list, quirk slots and head shape of the recipe, the bin of the plan, extra nodes and the extra clips."""
    def __enter__(self):
        rec = self.rec; plan = rec['plan']; shim = copy.deepcopy(RR.legacy_recipe()); shim.update(paint=rec['paint'], wear=rec['wear'], lamp=rec['lamp'], quirks=rec['quirks'], modules=rec['modules'], parts=rec['parts'], seed=rec['seed'], legacy=False)
        shim['body']['head'].update(e1=rec['body']['head']['e1'], e2=rec['body']['head']['e2']); shim['body']['shell']['split_count'] = rec['body']['shell']['split_count']
        self.rec = shim; RB.applied.__enter__(self); self.rec = rec
        self._dict(CM.HOP, bin_dims(rec))
        self.saved.append(('list', CM.NODES, list(CM.NODES))); CM.NODES[:] = CM.NODES + [n for n, _ in PLAN_NODES.get(plan, []) if n not in CM.NODES]
        self.saved.append(('dict', CM.AXES, dict(CM.AXES)))
        for n, _ in PLAN_NODES.get(plan, []):
            key = 'leg' if n.startswith('leg') else ('paddle' if n.startswith('paddle') else ('claw' if n.startswith('claw') else n)); CM.AXES[n] = dict(axis=None, optional=False, note=PLAN_NODE_NOTES.get(key, ''))
        self._attr(CM, 'EXTRA_SCENE', {'robot_recipe': rec, 'robot_note': 'built by blender/robot_radical.py from the recipe in this key (plan %s); body scale is a node scale on the root' % plan, 'plan': plan})
        self.info = {}; orig = CM.clip_table; me = self
        self.saved.append(('attr', CM, 'clip_table', orig))
        def clips(lod, orig=orig):
            C = orig(lod); C.update(extra_clips(me.info, plan)); return C
        CM.clip_table = clips
        return self


# ------------------------------------------------------------------------------------------------- the whole machine
def build_radical(rec, lod='hero', pose='rest', applied=None):
    """the node dict of one radical machine (call inside `with RadApplied(rec) as ap`; write_radical does)"""
    L = CM.LOD[lod]; plan = rec['plan']; seed = RB.dirt_seed(rec['seed']); nodes = {}; b = rec['body']; H = CM.HOP; sh = b['shell']
    def N(name, parent, pivot):
        n = CM.Node(name, parent, pivot, CM.AXES.get(name)); nodes[name] = n; return n
    root = N('collector', None, (0, 0, 0)); sc = (b['scale'],) * 3; root.scale = None if sc == (1.0, 1.0, 1.0) else sc
    N('chassis', 'collector', (0, 0, 0)); N('track_l', 'collector', (0, 0.25, 0.112)); N('track_r', 'collector', (0, -0.25, 0.112))
    N('shell_l', 'collector', CM.HINGE + np.array([0, 0.175, 0])); N('shell_r', 'collector', CM.HINGE + np.array([0, -0.175, 0]))
    N('head', 'collector', CM.HEAD_PIVOT); N('lamp', 'head', CM.LAMP_AT); N('lamp_dome', 'lamp', CM.LAMP_AT)
    N('arm_base', 'collector', CM.SHOULDER); N('arm_mid', 'arm_base', CM.ELBOW_STOW.copy()); N('arm_tip', 'arm_mid', CM.WRIST_STOW + np.array([0, -CM.ARM_DY, 0])); N('finger_l', 'arm_tip', CM.WRIST_STOW.copy()); N('finger_r', 'arm_tip', CM.WRIST_STOW.copy())
    N('hopper', 'collector', (H['x1'], 0, H['z1'])); N('hopper_lid', 'hopper', (H['x1'], 0, H['z1'] + 0.012))
    for n, par in PLAN_NODES.get(plan, []): N(n, par, (0, 0, 0))
    c = dict(nodes=nodes, N=N, L=L, seed=seed, rec=rec)
    info = PLAN_FN[plan](c)
    # shell, head, bin
    S = info['shell']; make_shell(nodes['shell_l'], nodes['shell_r'], L, seed, rec, S['xc'], S['a'], S['b'], S['c'], S['z0'])
    d = head_at(c, info['head_d'])
    # the empty arm: its nodes sit on the body top
    for nm in ('arm_base', 'arm_mid', 'arm_tip', 'finger_l', 'finger_r'): nodes[nm].pivot = np.array(info['shoulder'], float)
    L2 = dict(L, litter=0) if 'seedbed' in rec['modules'] else L
    if not info.get('custom_bin'):
        CM.part_hopper(nodes['hopper'], nodes['hopper_lid'], L2, seed); RB.hopper_lid_style(nodes['hopper_lid'], L, b['hopper']['lid'])
    cx = (H['x0'] + H['x1']) / 2; mods = rec['modules']
    if 'seedbed' in mods: RB.module_seedbed(N('module_seedbed', 'hopper', (cx, 0, H['z1'] - 0.05)), L, seed)
    if 'grow_light' in mods: RB.module_grow_light(N('module_grow_light', 'collector', (cx, 0, H['z1'] + 0.27)), L, seed)
    if 'compost_tray' in mods: RB.module_compost(N('module_compost', 'hopper', (H['x0'] - 0.07, 0, H['z0'] + 0.05)), L, seed)
    for pt in rec.get('parts', []):
        if L['simple'] and pt in ('side_bins', 'tool_rack'): continue
        if pt == 'ears': nd = N('part_ears', 'head', (0.395, 0, 0.356)); RB.part_ears(nd, L, seed); move(nd, d)
        elif pt == 'side_bins': RB.part_bins(N('part_bins', 'hopper', (H['x0'] + 0.075, 0, H['z0'] + 0.13)), L, seed)
        elif pt == 'tool_rack': RB.part_tools(N('part_tools', 'hopper', ((H['x0'] + H['x1']) / 2, -(H['w'] / 2 + 0.024), H['z1'] - 0.10)), L, seed)
    dz = (H['z0'] + H['z1']) / 2 - 0.275
    for q in rec['quirks']:
        name = 'quirk_' + q; par = RR.QUIRK_NOTES[name][0]
        piv = {'patch': (H['x0'] + 0.085, -0.1935 - (H['w'] - 0.38) / 2, 0.255 + dz), 'mirror': (0.455, 0.078, 0.368), 'trinket': (H['x0'] + 0.085, -0.075, H['z1'] + 0.0345), 'panel': (H['x0'] + 0.085, 0.1985 + (H['w'] - 0.38) / 2, 0.30 + dz),
               'tape': (0.3675, 0.095, 0.215), 'antenna': (H['x1'] - 0.02, -(H['w'] / 2 - 0.016), H['z1']), 'extra_shell': (H['x0'] - 0.06, 0, (H['z0'] + H['z1']) / 2 + 0.09), 'plant_pot': ((H['x0'] + H['x1']) / 2 + 0.03, 0.095, H['z1'] + 0.0345)}[q]
        nd = N(name, par, piv)
        if q == 'patch': CM.part_quirk_patch(nd, L, seed); RB.shift_node(nd, (0, -(H['w'] - 0.38) / 2, dz))
        elif q == 'panel': CM.part_quirk_panel(nd, L, seed); RB.shift_node(nd, (0, (H['w'] - 0.38) / 2, dz))
        elif q == 'mirror': CM.part_quirk_mirror(nd, L, seed); move(nd, d)
        elif q == 'trinket': CM.part_quirk_trinket(nd, L, seed)
        else: {'tape': RB.quirk_tape, 'antenna': RB.quirk_antenna, 'extra_shell': RB.quirk_extra_shell, 'plant_pot': RB.quirk_plant_pot}[q](nd, L, seed)
        if q == 'tape': move(nd, info['tape_at'] - V(0.3675, 0.095, 0.215))
        if q in info['qoff']: move(nd, info['qoff'][q])
    # rest tilts, the cocked head, the props of the plan
    if sh['tilt_l_deg']: nodes['shell_l'].q = CM.rot_seq([('y', sh['tilt_l_deg'])])
    if sh['tilt_r_deg']: nodes['shell_r'].q = CM.rot_seq([('y', sh['tilt_r_deg'])])
    hq = []
    if b['head']['roll_deg']: hq.append(('x', b['head']['roll_deg']))
    if info.get('head_pitch'): hq.append(('y', info['head_pitch']))
    if hq: nodes['head'].q = CM.rot_seq(hq)
    if b['hopper']['lid_prop_deg'] and not info.get('custom_bin'): nodes['hopper_lid'].q = CM.rot_seq([('y', b['hopper']['lid_prop_deg'])])
    hs = tuple(b['head']['scale']); nodes['head'].scale = None if hs == (1.0, 1.0, 1.0) else hs
    for k, seq in CM.pose_rotations(pose).items():
        if k in nodes: nodes[k].q = CM.rot_seq(seq)
    if applied is not None: applied.info = info
    return nodes


def write_radical(rec, path, lod='hero', pose='rest'):
    """build the machine of a radical recipe and write the GLB. The scout plan is the ordinary generic builder."""
    if rec['plan'] == 'scout':          # the ordinary builder, with the ears one and a half times as big (a node scale about the ear base)
        with RB.applied(rec):
            nodes = RB.build_robot(rec, lod, pose)
            if 'part_ears' in nodes: nodes['part_ears'].scale = (1.35, 1.5, 1.7)
            return CM.write_glb(path, nodes, lod, pose, RB.dirt_seed(rec['seed']))
    with RadApplied(rec) as ap:
        nodes = build_radical(rec, lod, pose, ap)
        return CM.write_glb(path, nodes, lod, pose, RB.dirt_seed(rec['seed']))


def main(argv=None):
    ap = argparse.ArgumentParser(description='Build the GLB files of a radical robot recipe (python3 + numpy, no Blender).')
    ap.add_argument('--seed', type=int, required=True); ap.add_argument('--out', required=True); ap.add_argument('--lods', default='hero,live'); ap.add_argument('--pose', default='rest')
    a = ap.parse_args(argv); os.makedirs(a.out, exist_ok=True); rec = RR.robot_recipe_for(a.seed, radical=True)
    RR.write_recipe(rec, os.path.join(a.out, 'robot_recipe_seed%d.json' % a.seed)); rep = {}
    for lod in [x.strip() for x in a.lods.split(',') if x.strip()]:
        fn = os.path.join(a.out, 'robot_seed%d_%s.glb' % (a.seed, lod)); st = write_radical(rec, fn, lod, a.pose)
        rep[lod] = dict(triangles=st['triangles'], vertices=st['vertices'], bytes=st['bytes'])
        print('GLB', fn, rec['plan'], 'triangles', st['triangles'], 'vertices', st['vertices'], 'KB', round(st['bytes'] / 1024.0, 1), flush=True)
    with open(os.path.join(a.out, 'robot_report_seed%d.json' % a.seed), 'w') as f: json.dump(rep, f, indent=1, sort_keys=True)


if __name__ == '__main__':
    main()
