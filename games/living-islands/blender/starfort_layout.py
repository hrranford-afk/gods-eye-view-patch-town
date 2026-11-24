"""STAR FORT LAYOUT (pure python, deterministic; imports only the constants of starfort_model.py): given n bastions (3 to 5), a radius, a ditch width and a yaw, work out the whole fort
as a list of placed parts (piece name, position x z, yaw about +Y in degrees, y offset, scale) joined by their sockets, so the ring of wall closes with no gap.
See STAR_FORT_KIT.md.

How it closes: the wall is walked piece by piece, each piece starting where the last one ended, turning by the exact angle its shape has. One unit is
  junction, flank, shoulder, face, salient, face, shoulder, flank, junction, curtain
and the sum of the turns of a unit is -360 / n degrees (the salient 90, two shoulders 180 - s, two junctions +90 with s = 135 - 180 / n), so n units come back to the start exactly.
The radius asked for picks the number k of 4 m curtain pieces; the radius you get is reported. Outer works (ditch floor, counterscarp, covered way, glacis, ravelins) follow the mitred offset of the same outline;
their pieces are stretched a little along their length (scale x, 0.8 to 1.25) so whole pieces fit each side.
Frame: x east, z south on the page ground plane as in the GLB files (glTF x, z), y up. A placed part has world = Ry(yaw) * local + (x, y, z) with Ry as in glTF: x' = x cos + z sin, z' = -x sin + z cos."""
import math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import starfort_model as SM

SEG = SM.SEG
SAL_ARM = SM.SAL_ARM
JUNC_ARM = SM.JUNC_ARM
DEPTH = SM.DEPTH
RAV_ARM = SM.RAV_ARM
SHOULDER = SM.SHOULDER


def yaw_of(dx, dz): return math.degrees(math.atan2(dx, dz))
def rot(psi_deg, x, z):
    c = math.cos(math.radians(psi_deg)); s = math.sin(math.radians(psi_deg)); return (x * c + z * s, -x * s + z * c)
def norm_deg(a): return (a + 180.0) % 360.0 - 180.0


def piece_ends(piece):
    """local (socket_a position, socket_b position, socket_b travel yaw) of a wall piece, from the constants of the model (the tests compare these with the sockets inside the GLB files)"""
    if piece in SM.STRAIGHT_LEN:
        L = SM.STRAIGHT_LEN[piece]; return (-L / 2, 0.0), (L / 2, 0.0), 90.0
    if piece in SM.CORNER_DEF:
        a1, a2, turn = SM.CORNER_DEF[piece]; d = math.radians(turn); return (-a1, 0.0), (a2 * math.cos(d), a2 * math.sin(d)), yaw_of(math.cos(d), math.sin(d))
    raise KeyError(piece)


def place_run(start, heading, pieces, scale_x=None):
    """walk a list of piece names from `start` (x, z) travelling along `heading` (yaw of the travel direction). returns the placed parts and the end pose"""
    x, z = start; phi = heading; out = []
    for i, name in enumerate(pieces):
        a, b, yb = piece_ends(name); psi = phi - 90.0
        sx = 1.0 if scale_x is None else scale_x[i]
        ox, oz = rot(psi, a[0] * sx, a[1]); px, pz = x - ox, z - oz
        out.append(dict(piece=name, x=px, z=pz, yaw=psi % 360.0, y=0.0, scale=[sx, 1.0, 1.0], socket_a=[x, z], heading=phi))
        bx, bz = rot(psi, b[0] * sx, b[1]); x, z = px + bx, pz + bz; phi = phi + (yb - 90.0)
        out[-1]['socket_b'] = [x, z]
    return out, (x, z), phi


def unit_pieces(n, k, face_pieces, flank_pieces, gate_at=None):
    cur = ['curtain'] * k
    if gate_at is not None: cur[gate_at] = 'sally_gate'
    j = SM.junction_name(n)
    return ([j] + ['bastion_flank'] * flank_pieces + [SM.shoulder_name(n)] + ['bastion_face'] * face_pieces + ['bastion_salient'] + ['bastion_face'] * face_pieces +
            [SM.shoulder_name(n)] + ['bastion_flank'] * flank_pieces + [j] + cur)


def walk_ring(n, k, face_pieces, flank_pieces, yaw=0.0, gate_curtain=0):
    parts = []; pos = (0.0, 0.0); phi = yaw
    for i in range(n):
        pcs = unit_pieces(n, k, face_pieces, flank_pieces, gate_at=(k // 2) if (gate_curtain == i) else None)
        run, pos, phi = place_run(pos, phi, pcs)
        for p in run: p['bastion'] = i
        parts += run
    return parts, pos, phi


def face_line_polygon(parts):
    """the vertices of the outer face line of the walked ring: socket positions where a piece turns, plus every piece start (a closed polygon)"""
    pts = []
    for p in parts:
        pts.append(tuple(p['socket_a']))
    return pts


def vertices_of(parts, n):
    """the corner vertices (salient, shoulders, junctions) of the ring in order, and the salient tips"""
    v = []; tips = []
    for p in parts:
        if p['piece'] in SM.CORNER_DEF:
            a1, a2, turn = SM.CORNER_DEF[p['piece']]; vx, vz = rot(p['yaw'], 0.0, 0.0); vx += p['x']; vz += p['z']; v.append((vx, vz, p['piece']))
            if p['piece'] == 'bastion_salient': tips.append((vx, vz))
    return v, tips


def polygon_points(parts):
    """all face-line vertices in order, including every straight piece end (so the polygon follows the wall)"""
    pts = [tuple(parts[0]['socket_a'])]
    for p in parts:
        if p['piece'] in SM.CORNER_DEF:
            vx, vz = rot(p['yaw'], 0.0, 0.0); pts.append((p['x'] + vx, p['z'] + vz))
        pts.append(tuple(p['socket_b']))
    out = [pts[0]]
    for q in pts[1:]:
        if math.hypot(q[0] - out[-1][0], q[1] - out[-1][1]) > 1e-6: out.append(q)
    if math.hypot(out[0][0] - out[-1][0], out[0][1] - out[-1][1]) < 1e-3: out.pop()
    return out


def centroid(pts): return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def corner_vertices(parts):
    """just the corner points of the outline (no intermediate piece ends), in order"""
    out = []
    for p in parts:
        if p['piece'] in SM.CORNER_DEF:
            vx, vz = rot(p['yaw'], 0.0, 0.0); out.append((p['x'] + vx, p['z'] + vz, p['piece']))
    return out


def offset_polygon(pts, d):
    """mitred offset of a closed polygon by d to the outside (d < 0 inside). The outline runs with the outside on its right in travel terms of the walk (outward normal = (-t_z, t_x) of the glTF frame)"""
    n = len(pts); res = []
    for i in range(n):
        p0 = pts[i - 1]; p1 = pts[i]; p2 = pts[(i + 1) % n]
        t1 = (p1[0] - p0[0], p1[1] - p0[1]); l1 = math.hypot(*t1); t1 = (t1[0] / l1, t1[1] / l1)
        t2 = (p2[0] - p1[0], p2[1] - p1[1]); l2 = math.hypot(*t2); t2 = (t2[0] / l2, t2[1] / l2)
        n1 = (-t1[1], t1[0]); n2 = (-t2[1], t2[0]); den = 1.0 + n1[0] * n2[0] + n1[1] * n2[1]
        m = ((n1[0] + n2[0]) / den, (n1[1] + n2[1]) / den); res.append((p1[0] + d * m[0], p1[1] + d * m[1]))
    return res


def simplify(pts, tol=1e-6):
    """drop collinear vertices"""
    n = len(pts); out = []
    for i in range(n):
        a = pts[i - 1]; b = pts[i]; c = pts[(i + 1) % n]
        cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
        if abs(cr) > tol: out.append(b)
    return out


def ring_run(poly, d_off, piece, skip=None, thick=0.0, min_scale=0.8, max_scale=1.25, flip=False, seg=SEG, y=0.0, extra=None):
    """pieces of a straight-run kind placed along each edge of the offset polygon, scaled in length to fit. skip(x, z) -> True drops a piece. flip=True turns the piece round (its face looks at the fort).
    thick: the thickness of the mass on the outer side; at every convex corner the two runs reach past the vertex by thick * tan(half the turn) so the wedge between them is filled by the overlap"""
    pts = simplify(offset_polygon(poly, d_off)); out = []; n = len(pts)
    def ext(i):
        p0 = pts[i - 1]; p1 = pts[i]; p2 = pts[(i + 1) % n]; t1 = (p1[0] - p0[0], p1[1] - p0[1]); t2 = (p2[0] - p1[0], p2[1] - p1[1])
        l1 = math.hypot(*t1); l2 = math.hypot(*t2); t1 = (t1[0] / l1, t1[1] / l1); t2 = (t2[0] / l2, t2[1] / l2); n1 = (-t1[1], t1[0])
        if t2[0] * n1[0] + t2[1] * n1[1] >= 0: return 0.0           # concave: the walls already overlap behind the faces
        turn = math.acos(max(-1.0, min(1.0, t1[0] * t2[0] + t1[1] * t2[1]))); return thick * math.tan(turn / 2.0)
    for i in range(n):
        a = pts[i]; b = pts[(i + 1) % n]; dx, dz = b[0] - a[0], b[1] - a[1]; E = math.hypot(dx, dz); ux, uz = dx / E, dz / E
        o0 = ext(i) if thick else 0.0; o1 = ext((i + 1) % n) if thick else 0.0; L = E + o0 + o1
        if L < 1.0: continue
        m = max(1, int(round(L / seg))); sc = L / (m * seg)
        while sc > max_scale: m += 1; sc = L / (m * seg)
        while sc < min_scale and m > 1: m -= 1; sc = L / (m * seg)
        head = yaw_of(ux, uz); sx0 = a[0] - ux * o0; sz0 = a[1] - uz * o0
        for j in range(m):
            cx = sx0 + ux * seg * sc * (j + 0.5); cz = sz0 + uz * seg * sc * (j + 0.5)
            if skip is not None and skip(cx, cz): continue
            yaw = (head - 90.0 + (180.0 if flip else 0.0)) % 360.0
            out.append(dict(piece=piece, x=cx, z=cz, yaw=yaw, y=y, scale=[sc, 1.0, 1.0], edge=i, **(extra or {})))
    return out


def tip_radius(parts):
    tips = [(p['x'], p['z']) for p in parts if p['piece'] == 'bastion_salient']; pts = polygon_points(parts); c = centroid(pts)
    return sum(math.hypot(t[0] - c[0], t[1] - c[1]) for t in tips) / len(tips), c


def flank_sep(n, k, nf, ff, yaw=0.0):
    """the distance between the two flank face lines of one bastion at the junctions (the rear slopes of the two flanks must not meet): measured between the two junction vertices"""
    parts, _, _ = walk_ring(n, k, nf, ff, yaw)
    cv = [c for c in corner_vertices(parts) if c[2].startswith('flank_junction')]
    return math.hypot(cv[1][0] - cv[0][0], cv[1][1] - cv[0][1])


def layout(n=5, radius=40.0, ditch=6.0, yaw=0.0, ravelins=True, gate=True, glacis=True, details=True, face_pieces=None, flank_pieces=0):
    """the whole fort. returns a dict with parts (list of dicts), polygons, and numbers"""
    if n not in (3, 4, 5): raise ValueError('n must be 3, 4 or 5')
    nf = 1 if face_pieces is None else face_pieces
    best = None; ok_ks = []
    for k in range(1, 25):
        parts, pos, phi = walk_ring(n, k, nf, flank_pieces, yaw, 0 if gate else -1)
        r, c = tip_radius(parts)
        for p in parts: p['role'] = 'wall'
        lay0 = dict(n=n, parts=parts, polygons={'face_line': simplify(polygon_points(parts))})
        if not property_ok(lay0): continue
        ok_ks.append(k)
        if best is None or abs(r - radius) < abs(best[1] - radius): best = (k, r, c)
    k, r_act, c = best
    parts, pos, phi = walk_ring(n, k, nf, flank_pieces, yaw, 0 if gate else -1)
    # centre the fort on the origin
    for p in parts:
        p['x'] -= c[0]; p['z'] -= c[1]; p['socket_a'] = [p['socket_a'][0] - c[0], p['socket_a'][1] - c[1]]; p['socket_b'] = [p['socket_b'][0] - c[0], p['socket_b'][1] - c[1]]
    for i, p in enumerate(parts): p['role'] = 'wall'; p['id'] = i
    poly = polygon_points(parts)
    closure = dict(end_gap_m=math.hypot(pos[0] - 0.0, pos[1] - 0.0), heading_error_deg=norm_deg(phi - (yaw - 360.0)))
    out = list(parts); polys = {}
    cv = corner_vertices(parts); tips = [(x, z) for x, z, nm in cv if nm == 'bastion_salient']
    cpoly = simplify(poly)
    # ravelins: a detached triangle in front of each curtain, standing on the line of the covered way; the outer works leave a gap in front of it
    rav_specs = []
    if ravelins:
        for i in range(n):
            cur = [p for p in parts if p['piece'] in ('curtain', 'sally_gate') and p['bastion'] == i]
            a = cur[0]['socket_a']; b = cur[-1]['socket_b']; mx, mz = 0.5 * (a[0] + b[0]), 0.5 * (a[1] + b[1]); ux, uz = b[0] - a[0], b[1] - a[1]; L = math.hypot(ux, uz); ux /= L; uz /= L
            nx, nz = -uz, ux; G = ditch + 1.3 + 4.6 + 1.5
            rav_specs.append(dict(mx=mx, mz=mz, ux=ux, uz=uz, nx=nx, nz=nz, G=G))
    def in_rav_gap(x, z):
        for r in rav_specs:
            lx = (x - r['mx']) * r['ux'] + (z - r['mz']) * r['uz']; ly = (x - r['mx']) * r['nx'] + (z - r['mz']) * r['nz']
            if abs(lx) < 8.0 and r['G'] - 2.0 < ly < r['G'] + 18.0: return True
        return False
    # the ditch floor (the ditch lies between the face line and the counterscarp)
    n0 = len(out); out += ring_run(cpoly, 0.0, 'ditch_floor', None, 0.0, 0.7, 1.35, False, 4.0, 0.0, dict(role='ditch'))
    for q in out[n0:]: q['scale'] = [q['scale'][0], 1.0, ditch / 6.0]
    out += ring_run(cpoly, ditch, 'counterscarp', in_rav_gap, 1.3, 0.8, 1.25, True, 4.0, 0.0, dict(role='ditch_wall'))
    out += ring_run(cpoly, ditch + 1.3, 'covered_way', in_rav_gap, 2.2, 0.8, 1.25, False, 4.0, 0.0, dict(role='covered_way'))
    if glacis: out += ring_run(cpoly, ditch + 1.3 + 4.6, 'glacis', in_rav_gap, 3.0, 0.8, 1.25, False, 4.0, 0.0, dict(role='glacis'))
    # ravelin pieces
    for ri, r in enumerate(rav_specs):
        tipx = r['mx'] + r['nx'] * (r['G'] + RAV_ARM * math.cos(math.radians(30.0)) + 4.0 * math.cos(math.radians(30.0)))
        tipz = r['mz'] + r['nz'] * (r['G'] + RAV_ARM * math.cos(math.radians(30.0)) + 4.0 * math.cos(math.radians(30.0)))
        head_out = yaw_of(r['nx'], r['nz'])
        # the ravelin path: gorge point, tip, gorge point. The first heading is the outward direction turned by +30 degrees (toward the tip along the first face); keep the one whose two gorge ends lie behind the tip
        pcs = ['ravelin_wall', 'ravelin_salient', 'ravelin_wall']; run = None
        for dh in (30.0, -30.0):
            cand, endp, endh = place_run((0.0, 0.0), head_out + dh, pcs)
            tp = rot(cand[1]['yaw'], 0.0, 0.0); tpx, tpz = cand[1]['x'] + tp[0], cand[1]['z'] + tp[1]
            proj = lambda px, pz: (px - tpx) * r['nx'] + (pz - tpz) * r['nz']
            if proj(*cand[0]['socket_a']) < -8.0 and proj(*endp) < -8.0: run = cand; break
        if run is None: run = cand
        tipv = rot(run[1]['yaw'], 0.0, 0.0); tvx = run[1]['x'] + tipv[0]; tvz = run[1]['z'] + tipv[1]
        dx, dz = tipx - tvx, tipz - tvz
        for q in run: q['x'] += dx; q['z'] += dz; q['role'] = 'ravelin'; q['ravelin'] = ri; q['socket_a'] = [q['socket_a'][0] + dx, q['socket_a'][1] + dz]; q['socket_b'] = [q['socket_b'][0] + dx, q['socket_b'][1] + dz]
        out += run
        r['tip'] = (tipx, tipz); r['walk'] = [(q['socket_a'], q['socket_b']) for q in run]
        # ditch floor along both ravelin faces, outside them
        for q in (run[0], run[2]):
            a = q['socket_a']; b = q['socket_b']; ddx, ddz = b[0] - a[0], b[1] - a[1]; L = math.hypot(ddx, ddz); ux_, uz_ = ddx / L, ddz / L
            for j in range(2):
                cx = a[0] + ux_ * (j + 0.5) * L / 2; cz = a[1] + uz_ * (j + 0.5) * L / 2
                out.append(dict(piece='ditch_floor', x=cx, z=cz, yaw=(yaw_of(ux_, uz_) - 90.0) % 360.0, y=0.0, scale=[L / 8.0, 1.0, 0.8], role='ditch', ravelin=ri))
    # courtyard and the rest of the details
    polys['face_line'] = cpoly
    polys['rear_toe'] = simplify(offset_polygon(cpoly, -DEPTH))
    polys['ditch_edge'] = simplify(offset_polygon(cpoly, ditch - 0.02))
    polys['glacis_edge'] = simplify(offset_polygon(cpoly, ditch + 1.3 + 4.6 + 12.5))
    polys['bed_edge'] = simplify(offset_polygon(cpoly, ditch + 1.2))
    if details:
        out += place_details(n, parts, cv, cpoly, ditch)
    return dict(n=n, radius_requested=radius, radius=r_act, ditch=ditch, yaw=yaw, curtain_pieces=k, face_pieces=nf, flank_pieces=flank_pieces, closure=closure, parts=out, polygons=polys, ravelins=rav_specs, wall_parts=len(parts))


def place_details(n, parts, cv, cpoly, ditch):
    """sentry boxes at the tips, a cannon platform on the terreplein of every face, a gate guardhouse, a powder store, a flagstaff and loose props"""
    out = []
    c = centroid(cpoly)
    for x, z, nm in cv:
        if nm == 'bastion_salient':
            dx, dz = c[0] - x, c[1] - z; L = math.hypot(dx, dz); out.append(dict(piece='sentry_box', x=x + dx / L * 3.3, z=z + dz / L * 3.3, yaw=yaw_of(-dx, -dz) % 360.0, y=4.0, scale=[1, 1, 1], role='detail'))
    for p in parts:
        if p['piece'] == 'bastion_face':
            # terreplein centre: 5.1 m behind the face line, middle of the piece; muzzle points outward (local +Z)
            lx, lz = rot(p['yaw'], 0.0, -5.1); out.append(dict(piece='gun_platform', x=p['x'] + lx, z=p['z'] + lz, yaw=p['yaw'], y=2.6, scale=[1, 1, 1], role='detail'))
            px, pz = rot(p['yaw'], 2.9, -4.6); out.append(dict(piece='loose_props', x=p['x'] + px, z=p['z'] + pz, yaw=(p['yaw'] + 20.0) % 360.0, y=2.6, scale=[0.4, 0.4, 0.4], role='detail'))
    gate = [p for p in parts if p['piece'] == 'sally_gate']
    if gate:
        g = gate[0]; lx, lz = rot(g['yaw'], 0.0, -15.0); out.append(dict(piece='guardhouse', x=g['x'] + lx, z=g['z'] + lz, yaw=g['yaw'], y=0.0, scale=[1, 1, 1], role='detail'))
        lx, lz = rot(g['yaw'], 9.0, -13.0); out.append(dict(piece='loose_props', x=g['x'] + lx, z=g['z'] + lz, yaw=(g['yaw'] + 30.0) % 360.0, y=0.0, scale=[1, 1, 1], role='detail'))
    out.append(dict(piece='flagstaff', x=c[0], z=c[1], yaw=0.0, y=0.0, scale=[1, 1, 1], role='detail'))
    sal = [(x, z) for x, z, nm in cv if nm == 'bastion_salient']
    if sal:
        x, z = sal[len(sal) // 2]; dx, dz = c[0] - x, c[1] - z; L = math.hypot(dx, dz); out.append(dict(piece='powder_store', x=c[0] - dx / L * 0.0 + (dz / L) * 7.0, z=c[1] + (-dx / L) * 7.0, yaw=yaw_of(c[0] - 0.0 - (c[0] + dz / L * 7.0), c[1] - (c[1] - dx / L * 7.0)) % 360.0, y=0.0, scale=[1, 1, 1], role='detail'))
    return out


# ------------------------------------------------------------------------------------------------- the defining property: no dead ground
def segs_cross(p, q, a, b):
    def o(a_, b_, c_): return (b_[0] - a_[0]) * (c_[1] - a_[1]) - (b_[1] - a_[1]) * (c_[0] - a_[0])
    d1 = o(p, q, a); d2 = o(p, q, b); d3 = o(a, b, p); d4 = o(a, b, q)
    return (d1 * d2 < 0) and (d3 * d4 < 0)


def clear_line(p, q, poly):
    for i in range(len(poly)):
        if segs_cross(p, q, poly[i], poly[(i + 1) % len(poly)]): return False
    return True


GUN_T = (0.15, 0.5, 0.85)     # fire points along a flank, from the shoulder end (0) to the junction end (1)


def flank_guns(lay):
    """for every flank of the star: list of (bastion, side, [fire points], outward normal, flank line (shoulder vertex, junction vertex)). A fire point is 0.5 m outside the middle of the flank's face line."""
    parts = [p for p in lay['parts'] if p.get('role') == 'wall']; n = lay['n']; out = []
    for bi in range(n):
        ws = [p for p in parts if p['bastion'] == bi]; fl = [p for p in ws if p['piece'].startswith('flank_junction')]; shs = [p for p in ws if p['piece'].startswith('bastion_shoulder')]
        jv = [(p['x'], p['z']) for p in fl]; sv = [(p['x'], p['z']) for p in shs]
        for (jx, jz), (sx, sz), side in ((jv[1], sv[1], 'forward'), (jv[0], sv[0], 'backward')):
            # the outline travels junction to shoulder on the first flank of a unit and shoulder to junction on the second; the outward normal is the right-hand side (-t_z, t_x) of the travel direction
            fdx, fdz = (jx - sx, jz - sz) if side == 'forward' else (sx - jx, sz - jz); L = math.hypot(fdx, fdz); ux, uz = fdx / L, fdz / L; nx, nz = -uz, ux
            guns = [(sx + (jx - sx) * t + nx * 0.5, sz + (jz - sz) * t + nz * 0.5) for t in GUN_T]
            out.append(dict(bastion=bi, side=side, guns=guns, normal=(nx, nz), shoulder=(sx, sz), junction=(jx, jz)))
    return out


def edge_samples(a, b, off, step=1.0):
    L = math.hypot(b[0] - a[0], b[1] - a[1]); ux, uz = (b[0] - a[0]) / L, (b[1] - a[1]) / L; nx, nz = -uz, ux; m = max(2, int(L / step))
    return [(a[0] + ux * L * t / m + nx * off, a[1] + uz * L * t / m + nz * off) for t in range(m + 1)]


def seen_by(guns, normal, T, poly, max_angle):
    for G in guns:
        vx, vz = T[0] - G[0], T[1] - G[1]; d = math.hypot(vx, vz)
        if d < 1e-6: return True
        ang = math.degrees(math.acos(max(-1.0, min(1.0, (vx * normal[0] + vz * normal[1]) / d))))
        if ang <= max_angle and clear_line(G, T, poly): return True
    return False


def fire_check(lay, max_angle=78.0, off=1.2, step=1.0):
    """The star-fort property. For every flank: from its fire points (0.5 m outside its face line), is every sample point 1.2 m in front of (a) the curtain it looks along and (b) the face of the NEIGHBOURING bastion
    that borders that curtain reachable by a straight line that does not cross the wall outline, within max_angle of the flank's outward normal? returns one dict per flank with the covered fractions."""
    poly = lay['polygons']['face_line']; parts = [p for p in lay['parts'] if p.get('role') == 'wall']; n = lay['n']; res = []
    for f in flank_guns(lay):
        bi = f['bastion']; side = f['side']
        if side == 'forward':
            cur = [p for p in parts if p['bastion'] == bi and p['piece'] in ('curtain', 'sally_gate')]; nb = (bi + 1) % n
            faces = [p for p in parts if p['bastion'] == nb and p['piece'] == 'bastion_face']; faces = faces[:len(faces) // 2]
        else:
            nb = (bi - 1) % n; cur = [p for p in parts if p['bastion'] == nb and p['piece'] in ('curtain', 'sally_gate')]
            faces = [p for p in parts if p['bastion'] == nb and p['piece'] == 'bastion_face']; faces = faces[len(faces) // 2:]
        ct = edge_samples(cur[0]['socket_a'], cur[-1]['socket_b'], off, step)
        ft = []
        for q in faces: ft += edge_samples(q['socket_a'], q['socket_b'], off, step)
        cc = sum(seen_by(f['guns'], f['normal'], T, poly, max_angle) for T in ct) / len(ct); fc = sum(seen_by(f['guns'], f['normal'], T, poly, max_angle) for T in ft) / len(ft)
        res.append(dict(bastion=bi, flank=side, neighbour=nb, curtain_samples=len(ct), curtain_covered=round(cc, 3), face_samples=len(ft), face_covered=round(fc, 3)))
    return res


def dead_ground(lay, off=1.2, step=1.0, max_angle=78.0):
    """every sample point 1.2 m in front of every curtain is seen from at least one flank fire point of the star (union over all flanks)"""
    poly = lay['polygons']['face_line']; parts = [p for p in lay['parts'] if p.get('role') == 'wall']; fg = flank_guns(lay)
    missing = 0; total = 0
    for p in parts:
        if p['piece'] not in ('curtain', 'sally_gate'): continue
        for T in edge_samples(p['socket_a'], p['socket_b'], off, step):
            total += 1
            if not any(seen_by(f['guns'], f['normal'], T, poly, max_angle) for f in fg): missing += 1
    return dict(samples=total, unseen=missing)


def property_ok(lay): 
    fc = fire_check(lay); return min(min(f['face_covered'], f['curtain_covered']) for f in fc) >= 0.999 and dead_ground(lay)['unseen'] == 0


# ------------------------------------------------------------------------------------------------- joints
def socket_world(part, local_pos, local_yaw):
    """world position and yaw of a socket given a placed part: pos = Ry(yaw) * (sx * x, y, z) + (x, z)"""
    sx = part.get('scale', [1.0, 1.0, 1.0])[0]; ox, oz = rot(part['yaw'], local_pos[0] * sx, local_pos[2]); return (part['x'] + ox, part['z'] + oz), (part['yaw'] + local_yaw) % 360.0


if __name__ == '__main__':
    import json
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 5; r = float(sys.argv[2]) if len(sys.argv) > 2 else 40.0
    L = layout(n, r); print(json.dumps({k: v for k, v in L.items() if k not in ('parts', 'polygons', 'ravelins')}, indent=1))
    print('parts', len(L['parts']), 'fire', fire_check(L)[:2], 'dead', dead_ground(L))
