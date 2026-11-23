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
