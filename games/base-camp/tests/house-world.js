/* Room kit test world, 18 Nov: the dolls' house of build 29 as a world for the fake AR camera (ar-fake.js).
   houseWorld(page, opts) reads the house the page itself built (HOUSE_ROOMS, HOUSE_SURF, the Playroom's PSURF0, the walls kept as solids in HOUSE.sol, HOUSE_DOORS)
   and returns it in the fake's own terms:
     shed:     [[name, y, cx, cz, hw, hd], ...]  every flat top (floors, tables, counters, beds, sills), the list ar-fake.js understands (window.__SHED)
     walls:    [{ x0, x1, z0, z1, y0, y1, rooms }]  the house's walls with their doorways left open (window.__WALLS); opts.tall (default true) makes every wall a full
               2.4 m wall, as in a real house (the dolls' house cuts the inside walls down to 1.1 m so a desktop player can look in)
     doors:    [{ a, b, x, z, along: 'x' | 'z', w }]  one per pair of rooms a doorway joins: its centre and width
     rooms:    { key: { name, r: [x0, x1, z0, z1], c: [x, z] } }
     stickers: { key: { id, x, y, z, ax, ay, size, bits } }  one printed sticker per room on the middle of its longest wall, facing into the room (bits come from opts.bits(id))
   Frame: the house's own x and z (the Playroom's centre is 0, 0), and y = house height - opts.eye (default 1.2: the iPad is held 1.2 m above the floor where AR starts),
   so the floors are at -1.2 like the fake shed's. Run in node; the page only has to have the dolls' house (it is on unless ?house=0). */
module.exports = async function houseWorld(page, opts) {
  opts = opts || {}; const eye = opts.eye === undefined ? 1.2 : opts.eye, tall = opts.tall !== false, ids = opts.ids || {};
  const W = await page.evaluate(([eye, tall, ids]) => {
    const R = __g.HOUSE_ROOMS, order = __g.HOUSE_ORDER, S = __g.HOUSE_SURF, DOORS = (typeof HOUSE_DOORS !== 'undefined' ? HOUSE_DOORS : {}), P0 = (typeof PSURF0 !== 'undefined' ? PSURF0 : []), r3 = (v) => Math.round(v * 1000) / 1000;
    const rooms = {}; for (const k of order) { const r = R[k].r; rooms[k] = { name: R[k].name, r: r.slice(), c: [(r[0] + r[1]) / 2, (r[2] + r[3]) / 2] }; }
    /* the flat tops: each room's own list; the Playroom's are the old practice room's (PSURF0) */
    const shed = []; for (const k of order) { const L = (S[k] && S[k].length ? S[k] : k === 'play' ? P0 : []); L.forEach((t, i) => shed.push([k + (i === 0 && t.y === 0 ? '-floor' : '-top' + i), r3(t.y - eye), r3((t.x0 + t.x1) / 2), r3((t.z0 + t.z1) / 2), r3((t.x1 - t.x0) / 2), r3((t.z1 - t.z0) / 2)])); }
    /* the walls: thin upright solids that lie on a room's edge (furniture, fence posts and lintels are left out) */
    const edgesX = new Set(), edgesZ = new Set(); for (const k of order) { const r = R[k].r; edgesX.add(r[0]); edgesX.add(r[1]); edgesZ.add(r[2]); edgesZ.add(r[3]); }
    const near = (v, set) => [...set].some((e) => Math.abs(v - e) < 0.05), walls = [];
    for (const b of __g.HOUSE.sol) { const dx = b.max.x - b.min.x, dy = b.max.y - b.min.y, dz = b.max.z - b.min.z, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
      if (dy < 0.3) continue; const alongZ = dx <= 0.07 && dz >= 0.1 && near(cx, edgesX), alongX = dz <= 0.07 && dx >= 0.1 && near(cz, edgesZ); if (!alongZ && !alongX) continue;
      walls.push({ x0: r3(b.min.x), x1: r3(b.max.x), z0: r3(b.min.z), z1: r3(b.max.z), y0: r3(-eye), y1: r3((tall ? 2.4 : b.max.y) - eye), along: alongZ ? 'z' : 'x' }); }
    /* an outer edge with no wall of the house's own (the Playroom's two back walls are plain meshes of the old practice room, not solids): close it, so the world is a real house */
    for (const k of order) { const r = R[k].r;
      for (const [along, line, lo, hi, out] of [['x', r[2], r[0], r[1], -1], ['x', r[3], r[0], r[1], 1], ['z', r[0], r[2], r[3], -1], ['z', r[1], r[2], r[3], 1]]) {
        const shared = order.some((q) => { if (q === k) return false; const B = R[q].r; return along === 'x' ? Math.abs((out < 0 ? B[3] : B[2]) - line) < 0.01 && Math.min(hi, B[1]) - Math.max(lo, B[0]) > 0.1 : Math.abs((out < 0 ? B[1] : B[0]) - line) < 0.01 && Math.min(hi, B[3]) - Math.max(lo, B[2]) > 0.1; });
        if (shared) continue; let cov = 0; for (const w of walls) if (w.along === along && Math.abs((along === 'z' ? (w.x0 + w.x1) / 2 : (w.z0 + w.z1) / 2) - line) < 0.05) cov += Math.max(0, Math.min(hi, along === 'z' ? w.z1 : w.x1) - Math.max(lo, along === 'z' ? w.z0 : w.x0));
        if (cov > 0.5 * (hi - lo)) continue; const t0 = out < 0 ? line - 0.04 : line, t1 = out < 0 ? line : line + 0.04;
        walls.push(along === 'x' ? { x0: r3(lo), x1: r3(hi), z0: r3(t0), z1: r3(t1), y0: r3(-eye), y1: r3(2.4 - eye), along } : { x0: r3(t0), x1: r3(t1), z0: r3(lo), z1: r3(hi), y0: r3(-eye), y1: r3(2.4 - eye), along }); } }
    /* the doorways: the open parts of the edge two joined rooms share */
    const doors = [], seen = new Set();
    for (const a of order) for (const b of DOORS[a] || []) { const key = [a, b].sort().join('|'); if (seen.has(key) || !R[b]) continue; seen.add(key); const A = R[a].r, B = R[b].r;
      let line = null, along = '', lo = 0, hi = 0;
      if (Math.abs(A[1] - B[0]) < 0.01 || Math.abs(A[0] - B[1]) < 0.01) { line = Math.abs(A[1] - B[0]) < 0.01 ? A[1] : A[0]; along = 'z'; lo = Math.max(A[2], B[2]); hi = Math.min(A[3], B[3]); }
      else if (Math.abs(A[3] - B[2]) < 0.01 || Math.abs(A[2] - B[3]) < 0.01) { line = Math.abs(A[3] - B[2]) < 0.01 ? A[3] : A[2]; along = 'x'; lo = Math.max(A[0], B[0]); hi = Math.min(A[1], B[1]); }
      if (line === null || hi <= lo) continue;
      const cover = walls.filter((w) => w.along === along && Math.abs((along === 'z' ? (w.x0 + w.x1) / 2 : (w.z0 + w.z1) / 2) - line) < 0.05).map((w) => (along === 'z' ? [w.z0, w.z1] : [w.x0, w.x1])).filter((c) => c[1] > lo && c[0] < hi).map((c) => [Math.max(lo, c[0]), Math.min(hi, c[1])]).sort((p, q) => p[0] - q[0]); /* only the part of the line the two rooms share */
      let at = lo; for (const [c0, c1] of cover.concat([[hi, hi]])) { if (c0 - at > 0.3) { const m = (at + c0) / 2; doors.push({ a, b, along, w: r3(c0 - at), x: r3(along === 'z' ? line : m), z: r3(along === 'z' ? m : line) }); } at = Math.max(at, c1); } }
    /* one sticker per room: the middle of the longest wall on its edge, 1.3 m up, facing into the room */
    const stickers = {}; let nid = 1;
    for (const k of order) { const r = R[k].r; let best = null;
      for (const w of walls) { const c = w.along === 'z' ? (w.x0 + w.x1) / 2 : (w.z0 + w.z1) / 2, a0 = Math.max(w.along === 'z' ? w.z0 : w.x0, w.along === 'z' ? r[2] : r[0]), a1 = Math.min(w.along === 'z' ? w.z1 : w.x1, w.along === 'z' ? r[3] : r[1]), len = a1 - a0, m = (a0 + a1) / 2; /* the part of the wall inside this room's edge */
        const onEdge = len > 0.2 && (w.along === 'z' ? Math.abs(c - r[0]) < 0.05 || Math.abs(c - r[1]) < 0.05 : Math.abs(c - r[2]) < 0.05 || Math.abs(c - r[3]) < 0.05);
        if (onEdge && (!best || len > best.len)) best = { w, len, c, m }; }
      if (!best) continue; const w = best.w, inward = w.along === 'z' ? (Math.abs(best.c - r[0]) < 0.05 ? 1 : -1) : (Math.abs(best.c - r[2]) < 0.05 ? 1 : -1), half = w.along === 'z' ? (w.x1 - w.x0) / 2 : (w.z1 - w.z0) / 2;
      const n = w.along === 'z' ? [inward, 0, 0] : [0, 0, inward], face = best.c + inward * (half + 0.004), id = ids[k] || nid; nid = Math.max(nid, id) + 1;
      stickers[k] = { id, x: r3(w.along === 'z' ? face : best.m), y: r3(1.3 - eye), z: r3(w.along === 'z' ? best.m : face), ax: [n[2], 0, -n[0]], ay: [0, 1, 0], size: 0.08 }; }
    return { shed, walls: walls.map(({ along, ...w }) => w), doors, rooms, stickers };
  }, [eye, tall, ids]);
  if (opts.bits) for (const k of Object.keys(W.stickers)) W.stickers[k].bits = opts.bits(W.stickers[k].id);
  return W;
};
