"""Simple original props for the recipe picture: a beached wreck, a small lighthouse, a ruined stone wall, a hut. Low poly, no brands, no writing.
Tone: weathered but hopeful (a lit lamp, a lit window, a roof that still holds). bpy + numpy; reuses the camp helpers (li_camp) and the rock shader (li_scene).
Every function takes a world position, a yaw (radians) and a ground-height function hz(x, y); all are deterministic from their arguments."""
import math
import bpy
import numpy as np
from li_scene import mesh_obj, node, link, principled, pin, boulder, S
import li_camp as LC

def _glow(name, rgb, strength):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputMaterial', (300, 0)); em = node(nt, 'ShaderNodeEmission', (0, 0))
    em.inputs['Color'].default_value = (*rgb, 1); em.inputs['Strength'].default_value = strength
    link(nt, em.outputs[0], out.inputs['Surface'])
    return m

def _xf(v, yaw, base):
    ca, sa = math.cos(yaw), math.sin(yaw)
    R = np.array([[ca, -sa, 0], [sa, ca, 0], [0, 0, 1]])
    return np.asarray(v, float) @ R.T + np.array(base, float)

def _box_vf(c, size, rotz=0.0):
    sx, sy, sz = [s / 2 for s in size]
    v = np.array([(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz), (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)])
    ca, sa = math.cos(rotz), math.sin(rotz)
    v = v @ np.array([[ca, -sa, 0], [sa, ca, 0], [0, 0, 1]]).T + np.array(c)
    return v, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]

def hut(pos, yaw, hz, colour=(0.33, 0.24, 0.14), size=(3.8, 2.9), seed=1):
    """a small timber hut with a turf roof, a door facing local +y (the sea side after yaw), a lit window and a chimney. Local +x long axis."""
    L, Wd = size; H = 1.9; rng = np.random.default_rng(seed)
    base = (pos[0], pos[1], hz(pos[0], pos[1]) - 0.08)
    objs = []
    wood = LC.wood_material('HutWood', colour, scale=1.0)
    v, f = _box_vf((0, 0, H / 2), (L, Wd, H)); objs.append(mesh_obj('HutWalls', _xf(v, yaw, base), f, False)); objs[-1].data.materials.append(wood)
    # gable roof (ridge along local x) with overhang
    ov = 0.35; rz = H + 0.95
    rv = np.array([(-L / 2 - ov, -Wd / 2 - ov, H - 0.05), (L / 2 + ov, -Wd / 2 - ov, H - 0.05), (L / 2 + ov, 0, rz), (-L / 2 - ov, 0, rz),
                   (-L / 2 - ov, Wd / 2 + ov, H - 0.05), (L / 2 + ov, Wd / 2 + ov, H - 0.05)])
    rf = [(0, 1, 2, 3), (3, 2, 5, 4), (0, 3, 4), (1, 5, 2)]
    roof = mesh_obj('HutRoof', _xf(rv, yaw, base), rf, False); roof.data.materials.append(LC.mat_simple('Turf', (0.09, 0.12, 0.045), 1.0)); objs.append(roof)
    v, f = _box_vf((-L * 0.28, 0.0, rz + 0.2), (0.45, 0.45, 0.9)); ch = mesh_obj('HutChimney', _xf(v, yaw, base), f, False); ch.data.materials.append(LC.mat_simple('Stone', (0.30, 0.28, 0.26), 0.95)); objs.append(ch)
    v, f = _box_vf((0.5, Wd / 2 + 0.02, 0.9), (0.9, 0.05, 1.8)); d = mesh_obj('HutDoor', _xf(v, yaw, base), f, False); d.data.materials.append(LC.mat_simple('Door', (0.07, 0.22, 0.26), 0.7)); objs.append(d)
    v, f = _box_vf((-0.9, Wd / 2 + 0.02, 1.1), (0.6, 0.05, 0.5)); w = mesh_obj('HutWindow', _xf(v, yaw, base), f, False); w.data.materials.append(_glow('WindowGlow', (1.0, 0.62, 0.22), 9.0)); objs.append(w)
    # wood pile beside the door
    for k in range(6):
        p0 = _xf([[1.5, Wd / 2 + 0.5 + 0.12 * (k % 3), 0.1 + 0.1 * (k // 3)]], yaw, base)[0]; p1 = _xf([[2.3, Wd / 2 + 0.5 + 0.12 * (k % 3), 0.1 + 0.1 * (k // 3)]], yaw, base)[0]
        c = LC.cylinder('Firewood', p0, p1, 0.06, 0.06, 6); c.data.materials.append(wood); objs.append(c)
    return objs

def lighthouse(pos, yaw, hz, height=8.0, bands=1, rock_mat=None, seed=1):
    """a small round tower on a stone plinth: whitewash with optional dark-red bands, a gallery, a lantern that is lit, a dark cap."""
    base = np.array([pos[0], pos[1], hz(pos[0], pos[1]) - 0.3]); objs = []
    r0, r1 = 1.5, 1.0
    white = LC.mat_simple('Whitewash', (0.62, 0.60, 0.55), 0.85); red = LC.mat_simple('BandRed', (0.40, 0.09, 0.07), 0.85)
    plinth = LC.cylinder('Plinth', base, base + np.array([0, 0, 0.9]), 2.1, 1.75, 14)
    plinth.data.materials.append(rock_mat or LC.mat_simple('PlinthStone', (0.25, 0.24, 0.22), 0.95)); objs.append(plinth)
    z0 = 0.8; nb = 3 + 2 * bands if bands else 1
    for k in range(nb):
        a = z0 + (height - z0) * k / nb; b = z0 + (height - z0) * (k + 1) / nb
        ra = r0 + (r1 - r0) * (a - z0) / (height - z0); rb = r0 + (r1 - r0) * (b - z0) / (height - z0)
        c = LC.cylinder('Tower%d' % k, base + np.array([0, 0, a]), base + np.array([0, 0, b]), ra, rb, 16)
        c.data.materials.append(red if (bands and k % 2 == 1) else white); objs.append(c)
    dark = LC.mat_simple('LanternIron', (0.03, 0.03, 0.035), 0.5)
    g = LC.cylinder('Gallery', base + np.array([0, 0, height]), base + np.array([0, 0, height + 0.22]), 1.35, 1.35, 16); g.data.materials.append(dark); objs.append(g)
    lamp = LC.cylinder('Lantern', base + np.array([0, 0, height + 0.22]), base + np.array([0, 0, height + 1.25]), 0.68, 0.62, 12); lamp.data.materials.append(_glow('LampGlow', (1.0, 0.72, 0.30), 14.0)); objs.append(lamp)
    cap = LC.cylinder('Cap', base + np.array([0, 0, height + 1.25]), base + np.array([0, 0, height + 2.0]), 0.85, 0.03, 12); cap.data.materials.append(dark); objs.append(cap)
    v, f = _box_vf((r0 - 0.05, 0, 1.6), (0.15, 0.8, 1.5)); d = mesh_obj('LighthouseDoor', _xf(v, yaw, base), f, False); d.data.materials.append(LC.mat_simple('Door2', (0.07, 0.22, 0.26), 0.7)); objs.append(d)
    return objs

def ruins(pos, yaw, hz, plan=(6.5, 4.8), rock_mat=None, seed=1):
    """the lower courses of a roofless stone building: four walls of rough blocks, broken down to different heights, a doorway, fallen blocks."""
    rng = np.random.default_rng(seed + 31)
    L, Wd = plan; verts = []; faces = []
    def add(c, size, rz):
        v, f = _box_vf(c, size, rz); b = len(verts); verts.extend(v.tolist()); faces.extend([tuple(i + b for i in q) for q in f])
    ca, sa = math.cos(yaw), math.sin(yaw)
    def wpos(lx, ly): return pos[0] + ca * lx - sa * ly, pos[1] + sa * lx + ca * ly
    walls = [((-L / 2, -Wd / 2), (L / 2, -Wd / 2), 2.0), ((L / 2, -Wd / 2), (L / 2, Wd / 2), 1.1), ((L / 2, Wd / 2), (-L / 2, Wd / 2), 1.6), ((-L / 2, Wd / 2), (-L / 2, -Wd / 2), 0.6)]
    for wi, (a, b, hmax) in enumerate(walls):
        n = int(math.hypot(b[0] - a[0], b[1] - a[1]) / 0.6)
        for i in range(n + 1):
            t = i / n; lx = a[0] + (b[0] - a[0]) * t; ly = a[1] + (b[1] - a[1]) * t
            if wi == 0 and 0.42 < t < 0.58:      # doorway
                continue
            courses = int(np.clip(round(hmax * (0.35 + 0.65 * rng.random()) / 0.30), 0, 7))
            wx, wy = wpos(lx, ly); gz = hz(wx, wy) - 0.15
            ang = yaw + math.atan2(b[1] - a[1], b[0] - a[0])
            for c in range(courses):
                s = (rng.uniform(0.5, 0.75), rng.uniform(0.38, 0.5), rng.uniform(0.25, 0.33))
                add((wx + rng.normal(0, 0.03), wy + rng.normal(0, 0.03), gz + 0.17 + c * 0.29), s, ang + rng.normal(0, 0.05))
    for k in range(9):       # fallen blocks inside and outside
        lx = rng.uniform(-L / 2 - 1.2, L / 2 + 1.2); ly = rng.uniform(-Wd / 2 - 1.2, Wd / 2 + 1.2); wx, wy = wpos(lx, ly)
        add((wx, wy, hz(wx, wy) + 0.12), (rng.uniform(0.4, 0.7), rng.uniform(0.3, 0.45), rng.uniform(0.22, 0.32)), rng.uniform(0, 6.28))
    ob = mesh_obj('Ruins', verts, faces, False)
    ob.data.materials.append(rock_mat or LC.mat_simple('RuinStone', (0.30, 0.28, 0.25), 0.95))
    return [ob]

def wreck(pos, yaw, hz, length=7.0, tilt=0.3, seed=1):
    """a big old hull heeled over on the shore, a broken mast and boom, and two washed-up crates. The hull is the camp rowboat lofted larger."""
    base = (pos[0], pos[1], hz(pos[0], pos[1]) + 0.10)
    objs = LC.rowboat(base, yaw, tilt, seed, length=length, beam=length * 0.36, depth=length * 0.15)
    # drop the toy-size oars that the rowboat carries
    keep = []
    for o in objs:
        if o.name.startswith('Oar') or o.name.startswith('Blade'):
            bpy.data.objects.remove(o, do_unlink=True)
        else:
            keep.append(o)
    wm = LC.wood_material('WreckWood', (0.26, 0.2, 0.13))
    ca, sa = math.cos(yaw), math.sin(yaw)
    def w(lx, ly, lz): return (base[0] + ca * lx - sa * ly, base[1] + sa * lx + ca * ly, base[2] + lz)
    m = LC.cylinder('Mast', w(-0.2, 0.2, 0.5), w(length * 0.45, 1.6, 0.9 + length * 0.12), 0.09, 0.07, 7); m.data.materials.append(wm); keep.append(m)
    bm = LC.cylinder('Boom', w(0.3, 0.3, 0.9), w(length * 0.55, -1.0, 0.7), 0.06, 0.05, 6); bm.data.materials.append(wm); keep.append(bm)
    for k, (lx, ly) in enumerate(((length * 0.2, -2.2), (length * 0.32, -2.9))):
        x, y, _ = w(lx, ly, 0)
        if hz(x, y) < 0.15:
            continue
        v, f = _box_vf((0, 0, 0.3), (0.75, 0.55, 0.6), 0.6 * k); v = v + np.array([x, y, hz(x, y) - 0.05])
        c = mesh_obj('Crate%d' % k, v, f, False); c.data.materials.append(wm); keep.append(c)
    return keep


# ------------------------------------------------------------------------------------------------- the menu items (hardware residents' request): fish hut, seabird hut, playset wreck, house in a boat
def _xft(v, yaw, base, tilt=0.0):
    """local points (x along the prop, y across, z up) -> world: a roll of `tilt` radians about the local x axis, then the yaw about z, then the base position"""
    cb, sb = math.cos(tilt), math.sin(tilt); ca, sa = math.cos(yaw), math.sin(yaw)
    R = np.array([[ca, -sa, 0], [sa, ca, 0], [0, 0, 1]]) @ np.array([[1, 0, 0], [0, cb, -sb], [0, sb, cb]])
    return np.asarray(v, float).reshape(-1, 3) @ R.T + np.array(base, float)

def _put(objs, name, verts, faces, mat, smooth=False):
    ob = mesh_obj(name, verts, faces, smooth); ob.data.materials.append(mat); objs.append(ob); return ob

def _bx(objs, name, c, size, mat, yaw, base, tilt=0.0, rotz=0.0):
    v, f = _box_vf(c, size, rotz); _put(objs, name, _xft(v, yaw, base, tilt), f, mat)

def _cyl(objs, name, p0, p1, r0, r1, mat, yaw, base, tilt=0.0, seg=8):
    w = _xft([p0, p1], yaw, base, tilt); o = LC.cylinder(name, w[0], w[1], r0, r1, seg); o.data.materials.append(mat); objs.append(o)

def _plate(objs, name, pts_xz, y, mat, yaw, base, tilt=0.0, thick=0.07):
    """a thin flat plate in the local x-z plane at height y (a fin, a flag), given as a convex or simple polygon fanned from its first point; both faces"""
    n = len(pts_xz); v = [(x, y - thick / 2, z) for x, z in pts_xz] + [(x, y + thick / 2, z) for x, z in pts_xz]
    f = [(0, i, i + 1) for i in range(1, n - 1)] + [(n, n + i + 1, n + i) for i in range(1, n - 1)] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    _put(objs, name, _xft(v, yaw, base, tilt), f, mat)

def fish_hut(pos, yaw, hz, colour=(0.18, 0.34, 0.36), length=4.8, seed=1):
    """a hut shaped like a fish: a plump lofted body with the belly on the ground, a forked tail, a dorsal fin, a door on the side and a round lit window where the eye would be. Local +x is the snout."""
    base = (pos[0], pos[1], hz(pos[0], pos[1]) - 0.06); objs = []
    Wd = length * 0.40; H = length * 0.46; ns = 17; nr = 14
    body = LC.wood_material('FishHutBody', colour, scale=0.9); fin = LC.wood_material('FishHutFin', tuple(c * 0.62 for c in colour), scale=0.9); trim = LC.mat_simple('FishHutTrim', (0.50, 0.42, 0.28), 0.8)
    verts = []; faces = []
    for i in range(ns):
        t = i / (ns - 1); s = max(math.sin(math.pi * t ** 0.72) ** 0.72, 0.13); w = Wd / 2 * s; h = H * s ** 0.85; x = (t - 0.5) * length
        for j in range(nr):
            phi = 2 * math.pi * j / nr; verts.append((x, w * math.cos(phi), h / 2 * (1 + math.sin(phi))))
    for i in range(ns - 1):
        for j in range(nr): faces.append((i * nr + j, (i + 1) * nr + j, (i + 1) * nr + (j + 1) % nr, i * nr + (j + 1) % nr))
    c0 = len(verts); verts.append((-length / 2 - 0.05, 0, H * 0.13 * 0.85 * 0.5 + 0.02)); c1 = len(verts); verts.append((length / 2 + 0.02, 0, H * 0.13 * 0.85 * 0.5 + 0.02))
    faces += [(c0, (j + 1) % nr, j) for j in range(nr)] + [(c1, (ns - 1) * nr + j, (ns - 1) * nr + (j + 1) % nr) for j in range(nr)]
    _put(objs, 'FishBody', _xft(verts, yaw, base), faces, body, True)
    tx = -length / 2
    _plate(objs, 'FishTail', [(tx + 0.1, 0.85), (tx - 1.1, 2.1), (tx - 0.7, 1.1), (tx - 1.1, 0.15)], 0.0, fin, yaw, base)
    _plate(objs, 'FishDorsal', [(-0.9, H * 0.88), (-0.4, H + 0.65), (0.8, H * 0.80)], 0.0, fin, yaw, base)
    for sg in (-1, 1): _plate(objs, 'FishPectoral', [(0.35, 0.5), (-0.35, 0.18), (0.05, 0.05)], sg * Wd * 0.42, fin, yaw, base, tilt=0.0, thick=0.05)
    ys = Wd / 2 * 0.86
    _bx(objs, 'FishDoor', (-0.2, ys, 0.82), (0.80, 0.10, 1.55), LC.mat_simple('FishDoor', (0.55, 0.40, 0.12), 0.7), yaw, base)
    _bx(objs, 'FishDoorStep', (-0.2, ys + 0.18, 0.06), (0.9, 0.5, 0.12), trim, yaw, base)
    _cyl(objs, 'FishEye', (length * 0.31, ys * 0.80, H * 0.58), (length * 0.31, ys * 0.80 + 0.22, H * 0.58), 0.26, 0.26, _glow('FishEyeGlow', (1.0, 0.64, 0.24), 9.0), yaw, base, 0.0, 12)
    _cyl(objs, 'FishEyeRing', (length * 0.31, ys * 0.80 - 0.02, H * 0.58), (length * 0.31, ys * 0.80 + 0.17, H * 0.58), 0.34, 0.34, trim, yaw, base, 0.0, 12)
    _cyl(objs, 'FishFlue', (0.9, 0.0, H * 0.94), (0.9, 0.0, H + 0.75), 0.13, 0.11, LC.mat_simple('FishFlue', (0.30, 0.28, 0.26), 0.9), yaw, base, 0.0, 7)
    for k in range(5):      # stripes of scales: thin boards across the back, a different shade each
        x = -1.2 + 0.55 * k; s = max(math.sin(math.pi * ((x / length) + 0.5) ** 0.72) ** 0.72, 0.13); hh = H * s ** 0.85
        _bx(objs, 'FishRib', (x, 0, hh + 0.005), (0.10, Wd * s * 0.55, 0.05), fin, yaw, base)
    return objs

def seabird_hut(pos, yaw, hz, colour=(0.33, 0.24, 0.14), size=(3.0, 2.5), height=1.4, seed=1):
    """a small hut on stilts above the strandline with a ladder, a lit window and a perch pole on the roof ridge where two gulls stand. Local +x long axis, door side +y."""
    L, Wd = size; objs = []
    wood = LC.wood_material('StiltWood', colour, scale=1.0); walls = LC.wood_material('StiltWalls', tuple(min(c * 1.25, 1.0) for c in colour), scale=1.1); roofm = LC.mat_simple('StiltRoof', (0.12, 0.17, 0.16), 0.9)
    z0 = hz(pos[0], pos[1]) + height
    for lx in (-L / 2 + 0.2, 0.0, L / 2 - 0.2):
        for ly in (-Wd / 2 + 0.2, Wd / 2 - 0.2):
            p = _xft([(lx, ly, 0)], yaw, (pos[0], pos[1], 0))[0]; gzp = hz(p[0], p[1])
            w0 = _xft([(lx, ly, 0)], yaw, (pos[0], pos[1], gzp - 0.25))[0]; w1 = _xft([(lx, ly, 0)], yaw, (pos[0], pos[1], z0 + 0.05))[0]
            o = LC.cylinder('Stilt', w0, w1, 0.11, 0.10, 7); o.data.materials.append(wood); objs.append(o)
    for ly in (-Wd / 2 + 0.2, Wd / 2 - 0.2):      # cross braces
        _cyl(objs, 'Brace', (-L / 2 + 0.2, ly, z0 - height * 0.8), (L / 2 - 0.2, ly, z0 - height * 0.3), 0.04, 0.04, wood, yaw, (pos[0], pos[1], 0.0), 0.0, 5)
    B = (pos[0], pos[1], 0.0)
    _bx(objs, 'StiltFloor', (0, 0, z0), (L + 0.3, Wd + 0.3, 0.14), wood, yaw, B)
    _bx(objs, 'StiltWalls', (0, 0, z0 + 0.07 + 0.95), (L, Wd, 1.9), walls, yaw, B)
    ov = 0.3; rz = z0 + 0.07 + 1.9 + 0.8
    rv = np.array([(-L / 2 - ov, -Wd / 2 - ov, z0 + 1.92), (L / 2 + ov, -Wd / 2 - ov, z0 + 1.92), (L / 2 + ov, 0, rz), (-L / 2 - ov, 0, rz), (-L / 2 - ov, Wd / 2 + ov, z0 + 1.92), (L / 2 + ov, Wd / 2 + ov, z0 + 1.92)])
    _put(objs, 'StiltRoof', _xft(rv, yaw, B), [(0, 1, 2, 3), (3, 2, 5, 4), (0, 3, 4), (1, 5, 2)], roofm)
    _bx(objs, 'StiltDoor', (0.35, Wd / 2 + 0.03, z0 + 0.07 + 0.85), (0.8, 0.06, 1.7), LC.mat_simple('StiltDoor', (0.07, 0.22, 0.26), 0.7), yaw, B)
    _cyl(objs, 'StiltWindow', (-0.75, Wd / 2 + 0.0, z0 + 1.15), (-0.75, Wd / 2 + 0.07, z0 + 1.15), 0.3, 0.3, _glow('StiltWindowGlow', (1.0, 0.62, 0.22), 9.0), yaw, B, 0.0, 4)
    for sg in (-1, 1): _cyl(objs, 'LadderRail', (0.35 + sg * 0.28, Wd / 2 + 0.55, z0 - height + 0.0), (0.35 + sg * 0.28, Wd / 2 + 0.14, z0 + 0.05), 0.04, 0.04, wood, yaw, B, 0.0, 5)
    for k in range(5): _cyl(objs, 'LadderRung', (0.07, Wd / 2 + 0.46 - 0.075 * k, z0 - height + 0.25 + (height - 0.1) * k / 4), (0.63, Wd / 2 + 0.46 - 0.075 * k, z0 - height + 0.25 + (height - 0.1) * k / 4), 0.03, 0.03, wood, yaw, B, 0.0, 5)
    # the gull perch: a pole on the ridge end with a crossbar, and two gulls
    px = L / 2 - 0.35; _cyl(objs, 'PerchPole', (px, 0, rz - 0.05), (px, 0, rz + 1.25), 0.05, 0.04, wood, yaw, B, 0.0, 6)
    _cyl(objs, 'PerchBar', (px, -0.55, rz + 1.22), (px, 0.55, rz + 1.22), 0.035, 0.035, wood, yaw, B, 0.0, 6)
    white = LC.mat_simple('GullWhite', (0.62, 0.62, 0.60), 0.8); grey = LC.mat_simple('GullGrey', (0.34, 0.36, 0.38), 0.8); beak = LC.mat_simple('GullBeak', (0.55, 0.38, 0.06), 0.7)
    for k, ly in enumerate((-0.32, 0.30)):
        c = np.array([px, ly, rz + 1.22 + 0.16]); fx = -1 if k else 1
        _cyl(objs, 'GullBody', c + np.array([-0.17 * fx, 0, 0]), c + np.array([0.15 * fx, 0, 0.03]), 0.11, 0.075, white, yaw, B, 0.0, 7)
        _cyl(objs, 'GullWing', c + np.array([-0.15 * fx, 0.06, 0.07]), c + np.array([0.12 * fx, 0.07, 0.03]), 0.035, 0.035, grey, yaw, B, 0.0, 5)
        _cyl(objs, 'GullHead', c + np.array([0.15 * fx, 0, 0.03]), c + np.array([0.19 * fx, 0, 0.12]), 0.05, 0.05, white, yaw, B, 0.0, 6)
        _cyl(objs, 'GullBeak', c + np.array([0.19 * fx, 0, 0.12]), c + np.array([0.27 * fx, 0, 0.105]), 0.022, 0.006, beak, yaw, B, 0.0, 5)
        _cyl(objs, 'GullTail', c + np.array([-0.17 * fx, 0, 0.0]), c + np.array([-0.33 * fx, 0, -0.03]), 0.07, 0.02, grey, yaw, B, 0.0, 5)
    _bx(objs, 'StiltCrate', (-L / 2 + 0.2, Wd / 2 + 0.28, z0 + 0.07 + 0.2), (0.5, 0.4, 0.4), wood, yaw, B)
    return objs

def playset_wreck(pos, yaw, hz, length=6.5, tilt=0.2, seed=1):
    """a wreck made like a child's play structure: a ship-shaped deck on posts heeled over and half sunk in the sand, a broken mast with a faded blank flag, a slide, a ladder, a rope net; muted old toy colours."""
    base = (pos[0], pos[1], hz(pos[0], pos[1]) - 0.35); objs = []
    red = LC.mat_simple('PlayRed', (0.38, 0.09, 0.06), 0.7); yel = LC.mat_simple('PlayYellow', (0.50, 0.38, 0.07), 0.7); blu = LC.mat_simple('PlayBlue', (0.08, 0.20, 0.34), 0.7); wm = LC.wood_material('PlayWood', (0.30, 0.22, 0.14), scale=1.0)
    cloth = LC.mat_simple('PlayFlag', (0.55, 0.50, 0.38), 0.95); rope = LC.mat_simple('PlayRope', (0.35, 0.27, 0.15), 0.95)
    Lh = length * 0.62; Wd = 2.3; zd = 1.25; t = tilt
    for lx in (-Lh * 0.4, Lh * 0.4):
        for ly in (-Wd * 0.4, Wd * 0.4): _cyl(objs, 'PlayPost', (lx, ly, -0.4), (lx, ly, zd), 0.09, 0.09, blu, yaw, base, t, 7)
    _bx(objs, 'PlayDeck', (0, 0, zd + 0.05), (Lh, Wd, 0.12), wm, yaw, base, t)
    for sg in (-1, 1): _bx(objs, 'PlaySide', (0, sg * Wd / 2, zd + 0.55), (Lh * 0.96, 0.10, 0.9), red, yaw, base, t)
    pv = np.array([(Lh / 2, -Wd / 2, zd), (Lh / 2 + 1.5, 0, zd + 0.55), (Lh / 2, Wd / 2, zd), (Lh / 2, Wd / 2, zd + 1.0), (Lh / 2 + 1.45, 0, zd + 0.62), (Lh / 2, -Wd / 2, zd + 1.0)])      # the prow
    _put(objs, 'PlayProw', _xft(pv, yaw, base, t), [(0, 1, 2), (5, 4, 3), (0, 5, 3, 2), (0, 1, 4, 5), (1, 2, 3, 4)], red)
    _cyl(objs, 'PlayMast', (-0.3, 0, zd + 0.1), (0.2, 0.15, zd + 2.35), 0.10, 0.07, wm, yaw, base, t, 7)
    _plate(objs, 'PlayFlag', [(0.15, zd + 2.3), (0.15, zd + 1.65), (-0.75, zd + 1.55), (-0.55, zd + 2.0)], 0.18, cloth, yaw, base, t, 0.03)
    # a slide down the back, a ladder and a rope net on one side
    sx0 = -Lh / 2
    sv = np.array([(sx0, -0.4, zd + 0.1), (sx0 - 2.9, -0.4, 0.05), (sx0 - 2.9, 0.4, 0.05), (sx0, 0.4, zd + 0.1)])
    _put(objs, 'PlaySlide', _xft(sv, yaw, base, t), [(0, 3, 2, 1), (0, 1, 2, 3)], yel)
    for sg in (-1, 1):
        rv = np.array([(sx0, sg * 0.4, zd + 0.1), (sx0 - 2.9, sg * 0.4, 0.05), (sx0 - 2.9, sg * 0.4, 0.22), (sx0, sg * 0.4, zd + 0.28)])
        _put(objs, 'PlaySlideRail', _xft(rv, yaw, base, t), [(0, 1, 2, 3), (3, 2, 1, 0)], yel)
    for lx in (0.1, 0.7): _cyl(objs, 'PlayLadderRail', (lx, Wd / 2 + 0.66, 0.05), (lx, Wd / 2 + 0.1, zd + 0.1), 0.04, 0.04, wm, yaw, base, t, 5)
    for k in range(4): _cyl(objs, 'PlayLadderRung', (0.1, Wd / 2 + 0.62 - 0.13 * k, 0.25 + (zd - 0.1) * k / 3), (0.7, Wd / 2 + 0.62 - 0.13 * k, 0.25 + (zd - 0.1) * k / 3), 0.03, 0.03, wm, yaw, base, t, 5)
    for k in range(5): _cyl(objs, 'PlayNetV', (-1.6 + 0.5 * k, -Wd / 2 - 0.55, 0.1), (-1.6 + 0.5 * k, -Wd / 2 - 0.12, zd + 0.7), 0.012, 0.012, rope, yaw, base, t, 4)
    for k in range(3): _cyl(objs, 'PlayNetH', (-1.9, -Wd / 2 - 0.5 + 0.12 * k, 0.45 + 0.4 * k), (1.9, -Wd / 2 - 0.5 + 0.12 * k, 0.45 + 0.4 * k), 0.012, 0.012, rope, yaw, base, t, 4)
    return objs

def boat_house(pos, yaw, hz, length=7.0, tilt=0.07, colour=(0.62, 0.56, 0.40), seed=1):
    """a house in a boat: a big old hull on the shore with a small house built into it (walls, a pitched roof, a door, a lit window, a stove pipe); the oars are gone."""
    base = (pos[0], pos[1], hz(pos[0], pos[1]) + 0.55); beam = length * 0.38; depth = length * 0.15
    objs = LC.rowboat(base, yaw, tilt, seed, length=length, beam=beam, depth=depth); keep = []
    for o in objs:
        if o.name.startswith('Oar') or o.name.startswith('Blade') or o.name.startswith('Thwart'): bpy.data.objects.remove(o, do_unlink=True)
        else: keep.append(o)
    wall = LC.wood_material('BoatHouseWalls', colour, scale=1.1); roofm = LC.mat_simple('BoatHouseRoof', (0.38, 0.12, 0.08), 0.85); trim = LC.mat_simple('BoatHouseTrim', (0.22, 0.17, 0.11), 0.8)
    zf = -depth * 0.5 + 0.14; hh = 1.65; hl = length * 0.34; hw = beam * 0.60; hx = -length * 0.06; B = base
    def bx(name, c, size, mat, rotz=0.0): _bx(keep, name, c, size, mat, yaw, B, tilt, rotz)
    bx('BoatHouseWalls', (hx, 0, zf + hh / 2), (hl, hw, hh), wall)
    rv = np.array([(hx - hl / 2 - 0.2, -hw / 2 - 0.2, zf + hh - 0.04), (hx + hl / 2 + 0.2, -hw / 2 - 0.2, zf + hh - 0.04), (hx + hl / 2 + 0.2, 0, zf + hh + 0.8), (hx - hl / 2 - 0.2, 0, zf + hh + 0.8), (hx - hl / 2 - 0.2, hw / 2 + 0.2, zf + hh - 0.04), (hx + hl / 2 + 0.2, hw / 2 + 0.2, zf + hh - 0.04)])
    _put(keep, 'BoatHouseRoof', _xft(rv, yaw, B, tilt), [(0, 1, 2, 3), (3, 2, 5, 4), (0, 3, 4), (1, 5, 2)], roofm)
    bx('BoatHouseDoor', (hx + hl * 0.28, hw / 2 + 0.03, zf + 0.82), (0.75, 0.06, 1.6), LC.mat_simple('BoatHouseDoor', (0.07, 0.22, 0.26), 0.7))
    _cyl(keep, 'BoatHouseWindow', (hx - hl * 0.20, hw / 2 + 0.0, zf + 1.05), (hx - hl * 0.20, hw / 2 + 0.07, zf + 1.05), 0.26, 0.26, _glow('BoatHouseGlow', (1.0, 0.62, 0.22), 9.0), yaw, B, tilt, 4)
    bx('BoatHouseSill', (hx - hl * 0.20, hw / 2 + 0.06, zf + 0.78), (0.62, 0.10, 0.06), trim)
    _cyl(keep, 'BoatHousePipe', (hx - hl * 0.30, -hw * 0.2, zf + hh), (hx - hl * 0.30, -hw * 0.2, zf + hh + 1.35), 0.09, 0.08, LC.mat_simple('BoatHousePipe', (0.25, 0.24, 0.23), 0.9), yaw, B, tilt, 7)
    _cyl(keep, 'BoatHouseMast', (length * 0.30, 0, zf), (length * 0.30, 0, zf + 2.6), 0.06, 0.045, trim, yaw, B, tilt, 6)
    return keep
