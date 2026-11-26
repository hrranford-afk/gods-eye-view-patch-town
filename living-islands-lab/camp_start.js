/* Living Islands: CAMP START (islands_look.html?start=camp, see CAMP_START.md). Loaded only when the switch is present.
   Classic script that also runs under node (module.exports) so the placement rules and the robot routine are tested without a browser (tests/camp-test.js).
   PART 1 (pure, no THREE): plan(env) places the day-one ladder rung on the page's own height function: the robot yard, six or seven kit pieces and the shore work sites, all by seed, on dry gentle ground,
   no overlap, with a footprint circle per piece. Sim: the hard-coded routine of the robots (work the shore, carry to the heap, sort, return when the charge is low or at dusk or in rain, one bay each).
   PART 2 (THREE): create(opts) builds the yard from simple weathered parts, loads the kit GLBs (live and far level of detail, base64 twins so file:// works, simple shapes when a file fails), the robot GLBs by recipe,
   the track prints the tide erases, and the HUD numbers. Robots are relics: no faces, no speech, no moods, behaviour only. People are counted, never tracked.
   Houses are a LATER STEP: LI_CAMP.shelterHook(rung) is the one place a rung-2 or rung-3 shelter will be drawn (no art yet). */
(function (root) {
'use strict';
const TAU = Math.PI * 2;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash2(ix,iz,s){let h=Math.imul(ix|0,374761393)+Math.imul(iz|0,668265263)+Math.imul(s|0,1442695041)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296;}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const sm=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const angLerp=(a,b,k)=>{const d=((b-a+Math.PI)%TAU+TAU)%TAU-Math.PI;return a+d*k;};

/* ---------- the kit pieces: footprint circle (centre offset in the piece frame, radius, from assets/kit/catalogue.json footprint polygons), page scale, which zone ---------- */
const PIECES = {
  lean_to:       { fc:[-.25,.60], fr:3.23, sc:.95, zone:'camp',  tier:1 },
  rain_barrel:   { fc:[ .10,.65], fr:2.10, sc:.95, zone:'camp',  tier:2 },
  drying_rack:   { fc:[ .55,.10], fr:2.78, sc:.90, zone:'camp',  tier:3 },
  cairn:         { fc:[0,0],      fr:1.10, sc:1.0, zone:'marker',tier:1 },
  crate_stack:   { fc:[ .03,.05], fr:2.42, sc:.90, zone:'shore', tier:1 },
  relic_hull:    { fc:[0,0],      fr:5.00, sc:.80, zone:'hull',  tier:2 },
  wrecked_jetty: { fc:[0,0],      fr:4.91, sc:1.0, zone:'jetty', tier:3 }
};
/* tiers: 'high' all, 'low' fewer (tier <= 2), 'ar' the first rung only (tier 1) */
const TIER_PIECES = { high: 3, low: 2, ar: 1 };
const TIER_BOTS = { high: 3, low: 2, ar: 1 };
const DRY_MIN = [1.15, .95, .75];          /* ground that the highest tide (1.1 m) does not reach, relaxed in two steps */
const TIDE_RANGE = 1.1;
const LOW_CHARGE = .28;                    /* the lamp goes dim and the robot goes home below this */
const BAY_SPACING = 2.0, YARD_BACK = 3.5, YARD_FRONT = 4.7;

/* ---------- yard frame: local x lateral (right), z toward the open front; yaw turns local +z to world (sin yaw, cos yaw) ---------- */
function toWorld(site, lx, lz) { const c = Math.cos(site.yaw), s = Math.sin(site.yaw); return [site.x + lx * c + lz * s, site.z - lx * s + lz * c]; }
function yardDims(nBays) { const half = nBays * BAY_SPACING / 2; return { half, left: half + 3.2, right: half + 3.8, back: YARD_BACK, front: YARD_FRONT }; }
function yardRadius(nBays) { const d = yardDims(nBays); return Math.hypot(Math.max(d.left, d.right) * .78, (d.back + d.front) / 2 * .8) + .6; }
/* the yard's rectangle in its own frame, and a circle against it (distance from the circle centre to the rectangle) */
function rectDist(site, cx, cz) { const c = Math.cos(site.yaw), s = Math.sin(site.yaw), dx = cx - site.x, dz = cz - site.z, lx = dx * c - dz * s, lz = dx * s + dz * c, d = yardDims(site.nBays);
  const ex = Math.max(-d.left - lx, 0, lx - d.right), ez = Math.max(-d.back - lz, 0, lz - d.front); return Math.hypot(ex, ez); }
/* the yard's named points in the world (bays, apron, heap drop points, bench) from its site (x, z, yaw, nBays) */
function yardPoints(site) {
  const n = site.nBays, d = yardDims(n), bays = [], F = (lx, lz) => toWorld(site, lx, lz);
  for (let i = 0; i < n; i++) { const lx = -d.half + BAY_SPACING * (i + .5), p = F(lx, -1.55), f = F(lx, 0.9); bays.push({ x: p[0], z: p[1], yaw: site.yaw, fx: f[0], fz: f[1] }); }
  const ap = F(0, 2.3), bench = F(-d.half - 1.9, -.7), piles = [], drops = [];
  for (let k = 0; k < 3; k++) { const lx = d.half + .85 + k * 1.15, pc = F(lx, -.55), dp = F(lx, .85);
    piles.push({ x: pc[0], z: pc[1], lx, lz: -.55, kind: ['metal', 'plastic', 'wood'][k] }); drops.push({ x: dp[0], z: dp[1], yaw: site.yaw + Math.PI, kind: ['metal', 'plastic', 'wood'][k] }); }
  const heapC = F(d.half + 2.0, -.55);
  return { bays, apron: { x: ap[0], z: ap[1], r: 2.4 }, heap: { x: heapC[0], z: heapC[1] }, piles, drops, bench: { x: bench[0], z: bench[1] }, dims: d };
}

/* ---------- ground tests (pure functions of env.H) ---------- */
function ringStats(H, x, z, r) {
  let mn = H(x, z), mx = mn;
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8, h = H(x + Math.cos(a) * r, z + Math.sin(a) * r); if (h < mn) mn = h; if (h > mx) mx = h; }
  const h2 = H(x + Math.cos(.4) * r * .5, z + Math.sin(.4) * r * .5); if (h2 < mn) mn = h2; if (h2 > mx) mx = h2;
  return { mn, mx, rel: (mx - mn) / (2 * Math.max(.5, r)) };
}
const fcWorld = (kind, x, z, yaw, sc) => { const P = PIECES[kind], c = Math.cos(yaw), s = Math.sin(yaw), ox = P.fc[0] * sc, oz = P.fc[1] * sc; return [x + ox * c + oz * s, z - ox * s + oz * c]; };

/* plan(env): env = { seed, H(x,z), tableR, tier:'high'|'low'|'ar', camp:{fire:{x,z},dir:[x,z]} , hard:[{x,z,r}] (never moved: tents, fire, boats), clear:[{x,z,r}] (trees, rocks, shrubs that may be cleared), bots:n, noJetty:bool, jettySite:{x,z,yaw}|null }
   returns { seed, tier, yard:{x,z,yaw,nBays,y,padR,...}, pieces:[{kind,x,z,yaw,sc,cx,cz,fr,y,padR,zone}], work:[{x,z,y,yaw,kind}], clearAll:[{x,z,r}], rules:{...}, notes:[] } */
function plan(env) {
  const seed = env.seed >>> 0, H = env.H, tier = TIER_PIECES[env.tier] ? env.tier : 'high', notes = [];
  const R0 = mulberry32(seed * 911 + 5), fire = env.camp.fire, dir = env.camp.dir || [0, 1];
  const nBays = clamp(env.bots || TIER_BOTS[tier], 1, 4);
  const hard = (env.hard || []).map(o => ({ x: o.x, z: o.z, r: o.r }));
  const placed = []; let yardSite;             /* circles of what is placed: {x,z,r}; the yard is a rectangle */
  const scanR = Math.min(env.tableR - 10, 105), STEP = 2;
  const free = (x, z, r, gap) => { if (yardSite && rectDist(yardSite, x, z) < r + (gap === undefined ? .8 : gap)) return false; for (const o of hard) if (Math.hypot(o.x - x, o.z - z) < o.r + r) return false; for (const o of placed) if (Math.hypot(o.x - x, o.z - z) < o.r + r + (gap === undefined ? .8 : gap)) return false; return true; };
  const clearCost = (x, z, r) => { let n = 0; for (const o of (env.clear || [])) if (Math.hypot(o.x - x, o.z - z) < o.r + r) n++; return n; };
  const jit = (x, z, k) => hash2(Math.round(x * 2), Math.round(z * 2), seed + k * 977);
  /* ---- 1. the robot yard: the most demanding piece, so it goes first ---- */
  const yR = yardRadius(nBays), dm = yardDims(nBays);
  let yard = null; const dbg = { dc: 0, tab: 0, hard: 0, placed: 0, dry: 0, span: 0, ok: 0 };
  const rectSamples = (x, z, yaw) => { const site = { x, z, yaw, nBays }, pts = []; for (let lx = -dm.left; lx <= dm.right + 1e-6; lx += 2) for (let lz = -dm.back; lz <= dm.front + 1e-6; lz += 2) pts.push(toWorld(site, lx, lz).concat([Math.abs(lx) <= .62 * (lx < 0 ? dm.left : dm.right) && lz >= -dm.back * .9 && lz <= dm.front * .75])); return pts; };
  for (let pass = 0; pass < 4 && !yard; pass++) {
    const dry = [.9, .6, .4, .3][pass], maxSpan = [1.1, 1.6, 2.6, 3.6][pass];
    let best = null;
    for (let x = fire.x - 32; x <= fire.x + 32; x += 1.5) for (let z = fire.z - 32; z <= fire.z + 32; z += 1.5) {
      const dc = Math.hypot(x - fire.x, z - fire.z); if (dc < 6 || dc > 30) { dbg.dc++; continue; }
      if (Math.hypot(x, z) > env.tableR - 14) { dbg.tab++; continue; }
      const yaw = Math.atan2(fire.x - x, fire.z - z) + (jit(x, z, 3) - .5) * .5, site = { x, z, yaw, nBays };
      let ok = true; for (const o of hard) if (rectDist(site, o.x, o.z) < o.r) { ok = false; break; } if (!ok) { dbg.hard++; continue; }
      for (const o of placed) if (rectDist(site, o.x, o.z) < o.r + .5) { ok = false; break; } if (!ok) continue;
      const sp = rectSamples(x, z, yaw), hs = sp.map(p => H(p[0], p[1])); let mn = 1e9, mx = -1e9, sum = 0, mnIn = 1e9; hs.forEach((h, i) => { if (h < mn) mn = h; if (h > mx) mx = h; sum += h; if (sp[i][2] && h < mnIn) mnIn = h; });
      if (mnIn < dry || mn < dry - .95) { dbg.dry++; continue; } if (mx - mn > maxSpan) { dbg.span++; continue; } dbg.ok++;
      const cc = clearCost(x, z, yR * .8), sc = Math.abs(dc - 13) * .09 + (mx - mn) * 1.2 + cc * .3 + jit(x, z, 1) * .5 + pass * .6;
      if (!best || sc < best.sc) best = { sc, x, z, yaw, mn, mx, mean: sum / hs.length };
    }
    if (best) { const y = Math.max(best.mean, DRY_MIN[0] + .05); yard = { x: best.x, z: best.z, yaw: best.yaw, nBays, y, fill: y - best.mn, padR: 3.7, R: yR, pass }; }
  }
  if (!yard) { const x = fire.x - dir[0] * 10, z = fire.z - dir[1] * 10; yard = { x, z, yaw: Math.atan2(fire.x - x, fire.z - z), nBays, y: Math.max(H(x, z), 1.2), fill: 0, padR: 3.7, R: yR, pass: 9 }; notes.push('yard: no site passed, fallback beside the camp'); }
  { const site = yard; yard.pads = [-dm.half - .7, 0, dm.half + 1.0].map(lx => { const p = toWorld(site, lx, .6); return { x: p[0], z: p[1], r: 3.7 }; }); yard.rect = { left: dm.left, right: dm.right, back: dm.back, front: dm.front }; }
  yardSite = { x: yard.x, z: yard.z, yaw: yard.yaw, nBays };
  /* ---- 2. kit pieces ---- */
  const pieces = [], maxTier = TIER_PIECES[tier];
  const order = ['lean_to', 'rain_barrel', 'drying_rack', 'crate_stack', 'cairn', 'relic_hull', 'wrecked_jetty'].filter(k => PIECES[k].tier <= maxTier);
  const wantJetty = order.indexOf('wrecked_jetty') >= 0;
  for (const kind of order) {
    const P = PIECES[kind]; if (kind === 'wrecked_jetty') continue;   /* the jetty takes the repair layer's own site, below */
    const fr = P.fr * P.sc; let got = null;
    {
      let best = null;
      for (let x = -scanR; x <= scanR; x += STEP) for (let z = -scanR; z <= scanR; z += STEP) {
        if (x * x + z * z > scanR * scanR) continue;
        const dc = Math.hypot(x - fire.x, z - fire.z), dy = Math.hypot(x - yard.x, z - yard.z);
        const st = ringStats(H, x, z, fr * .9); const hc = H(x, z);
        /* the strictest rung of the ground rules that this spot meets (a worse rung costs score, so a near site on poorer ground can beat a far one on good ground) */
        let pass = -1; for (let q = 0; q < 4; q++) if (st.mn >= [1.15, .95, .75, .5][q] && st.rel <= [.26, .38, .55, .72][q]) { pass = q; break; }
        let sc = 0;
        if (P.zone === 'camp') { if (pass < 0) continue; if (dc < 6.5 || dc > 70) continue; sc = Math.abs(dc - 14) * .08 + Math.max(0, dc - 30) * .1 + pass * .8; if (kind === 'rain_barrel') { const ln = pieces.find(q => q.kind === 'lean_to'); if (ln) sc += Math.abs(Math.hypot(x - ln.x, z - ln.z) - 8) * .12; } }
        else if (P.zone === 'shore') { if (st.mn < .3 || st.mx > 1.0 || st.rel > .48 || hc < .35 || hc > .8) continue; if (dc < 9) continue; sc = Math.abs(dc - 18) * .07 + Math.max(0, dc - 45) * .1; }
        else if (P.zone === 'marker') { if (pass < 0) continue; if (dc < 11) continue; sc = Math.abs(dc - 24) * .05 - hc * .4 + Math.max(0, dc - 50) * .1 + pass * .8; }
        else if (P.zone === 'hull') { if (st.mn < .05 || st.mx > 1.7 || st.rel > .53 || hc < .25) continue; if (dc < 30 || dy < 18) continue; sc = Math.abs(dc - 46) * .03 + Math.abs(hc - .7) * .6; }
        sc += st.rel * 4 + clearCost(x, z, fr) * .3 + jit(x, z, kind.length) * .6;
        if (best && sc >= best.sc) continue;
        const yaw = P.zone === 'camp' ? Math.atan2(fire.x - x, fire.z - z) + (jit(x, z, 5) - .5) * .7 : P.zone === 'hull' || P.zone === 'shore' ? Math.atan2(dir[0], dir[1]) + (jit(x, z, 6) - .5) * 2.4 : jit(x, z, 7) * TAU;
        const fc = fcWorld(kind, x, z, yaw, P.sc);
        if (!free(fc[0], fc[1], fr, .7)) continue;
        best = { sc, x, z, yaw, fc, st, pass };
      }
      if (best) got = best;
    }
    if (!got) { notes.push(kind + ': no site'); continue; }
    const y = H(got.fc[0], got.fc[1]) - (P.zone === 'hull' ? .45 : .03);
    pieces.push({ kind, x: got.x, z: got.z, yaw: got.yaw, sc: P.sc, cx: got.fc[0], cz: got.fc[1], fr, y, padR: Math.min(fr * .78, 3.2), zone: P.zone });
    placed.push({ x: got.fc[0], z: got.fc[1], r: fr, what: kind });
  }
  if (wantJetty && !env.noJetty && env.jettySite) { const J = env.jettySite; pieces.push({ kind: 'wrecked_jetty', x: J.x, z: J.z, yaw: J.yaw, sc: 1, cx: J.x, cz: J.z, fr: 4.9, y: J.y, padR: 0, zone: 'jetty', site: true }); placed.push({ x: J.x, z: J.z, r: 4.9, what: 'wrecked_jetty' }); }
  /* ---- 3. the work sites on the shore: dry now, gentle, clear, reachable in a straight line from the apron ---- */
  const YP = yardPoints(yard), ap = YP.apron, work = [], nWork = { high: 7, low: 5, ar: 3 }[tier];
  const lineOK = (x0, z0, x1, z1) => {
    for (let k = 0; k <= 12; k++) { const u = k / 12, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u; if (H(x, z) < .12) { dbg.lw = (dbg.lw || 0) + 1; return false; }
      for (const o of hard) if (Math.hypot(o.x - x, o.z - z) < o.r + .35) { dbg.lh = (dbg.lh || 0) + 1; return false; }
      for (const o of placed) if (Math.hypot(o.x - x, o.z - z) < o.r + .6) { dbg.lp = (dbg.lp || 0) + 1; return false; }
      for (const o of (env.clear || [])) if (o.r >= 1.0 && Math.hypot(o.x - x, o.z - z) < o.r * .5 + .45) { dbg.lc = (dbg.lc || 0) + 1; return false; } }
    return true; };
  /* a route from the apron to a site: the straight line, else a bend at the middle pushed sideways (the robots wear a path round trees and big stones) */
  const route = (x0, z0, x1, z1) => { if (lineOK(x0, z0, x1, z1)) return []; const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
    for (const off of [2.5, -2.5, 4.5, -4.5, 7, -7]) { const vx = mx + nx * off, vz = mz + nz * off; if (lineOK(x0, z0, vx, vz) && lineOK(vx, vz, x1, z1)) return [[vx, vz]]; } return null; };
  const cand = [];
  for (let x = ap.x - 40; x <= ap.x + 40; x += 2) for (let z = ap.z - 40; z <= ap.z + 40; z += 2) {
    const d = Math.hypot(x - ap.x, z - ap.z); if (d < 5 || d > 40) continue; const h = H(x, z); if (h < .32 || h > 1.0) continue;
    const e = .6, gx = (H(x + e, z) - H(x - e, z)) / (2 * e), gz = (H(x, z + e) - H(x, z - e)) / (2 * e); if (Math.hypot(gx, gz) > .6) continue;
    cand.push({ x, z, h, d, gx, gz, sc: Math.abs(d - 15) * .1 + jit(x, z, 11) * 1.4 }); }
  cand.sort((a, b) => a.sc - b.sc);
  const KINDS = ['plastic', 'metal', 'wood'], corridor = [];
  for (const c of cand) { if (work.length >= nWork) break;
    dbg.wc = (dbg.wc || 0) + 1; if (!free(c.x, c.z, .9, 0)) { dbg.wfree = (dbg.wfree || 0) + 1; continue; } if (work.some(w => Math.hypot(w.x - c.x, w.z - c.z) < 6)) continue;
    const via = route(ap.x, ap.z, c.x, c.z); if (!via) { dbg.wline = (dbg.wline || 0) + 1; continue; }
    { const pts = [[ap.x, ap.z]].concat(via, [[c.x, c.z]]); for (let q = 0; q + 1 < pts.length; q++) for (let k = 1; k <= 8; k++) { const u = k / 8; corridor.push({ x: pts[q][0] + (pts[q + 1][0] - pts[q][0]) * u, z: pts[q][1] + (pts[q + 1][1] - pts[q][1]) * u, r: 1.0 }); } }   /* small scrub and stones along the robots' way are cleared */
    work.push({ x: c.x, z: c.z, y: c.h, via, yaw: Math.atan2(-c.gx, -c.gz), kind: KINDS[work.length % 3], i: work.length }); }
  /* the Gift first day (env.dryKinds): the driest sites carry the finds that matter most (timber, then metal, then the rest), so a frozen tide cannot flood out an order. Absent = unchanged. */
  if (env.dryKinds && work.length) { const ord = work.map((w, i) => i).sort((a, b) => work[b].y - work[a].y), KO = ['wood', 'metal', 'plastic', 'wood', 'metal', 'plastic', 'plastic']; ord.forEach((wi, r) => { work[wi].kind = KO[r % KO.length]; }); }
  if (!work.length) { const q = toWorld(yard, 0, YARD_FRONT + 2.5); work.push({ x: q[0], z: q[1], y: H(q[0], q[1]), yaw: yard.yaw, kind: 'plastic', i: 0 }); notes.push('work: none on the shore, one beside the yard'); }
  /* clear list: what the pieces and the yard stand on (trees, rocks, shrubs inside are removed by the page) */
  const clearAll = yard.pads.map(p => ({ x: p.x, z: p.z, r: p.r + 1.1 })).concat(corridor.map(c => ({ x: c.x, z: c.z, r: c.r, corridor: 1 }))).concat(pieces.filter(p => !p.site).map(p => ({ x: p.cx, z: p.cz, r: p.fr + .3 })));
  return { seed, tier, yard, pieces, work, clearAll, placed, notes, nBays, version: 1, dbg };
}

/* ---------- the robot routine (pure) ---------- */
const KIND_V = { family: .55, scout: .55, snail: .42, walker: .5, spotter: .4, crab: .45, roller: .6 };
const ROLE_BY_KIND = { family: 'cleaner', scout: 'scout', snail: 'sorter', walker: 'hauler', spotter: 'scout', crab: 'sorter', roller: 'hauler' };
const SPEED_K = 1.5;                       /* the yard is small and the viewer is patient for seconds, not minutes (TUNING) */
const ST = { BAY: 'bay', OUT: 'out', WORK: 'work', CARRY: 'carry', DROP: 'drop', SORT: 'sort', HOME: 'home', TASK: 'task' };   /* TASK: a robot lent to the gift's physical layer (physical.js); never entered by the original routine */
const DRAIN = { move: .0046, work: .0030 }, CHARGE = { sun: .020, rain: .009, night: .004 };
function simCreate(pl, bots, opt) {
  opt = opt || {}; const YP = yardPoints(pl.yard), R = mulberry32((pl.seed >>> 0) * 31 + 7), n = Math.min(bots.length, YP.bays.length);
  const sim = { pl, YP, t: 0, robots: [], heap: { metal: 0, plastic: 0, wood: 0 }, litter: pl.work.map(w => ({ taken: false, back: 0 })), env: { night: false, rain: false, tide: 0 }, bays: YP.bays.map(() => -1), log: [] };
  for (let i = 0; i < n; i++) {
    const b = bots[i], kind = b.kind || 'family', bay = YP.bays[i];
    sim.robots.push({ id: i, kind, role: b.role || ROLE_BY_KIND[kind] || 'cleaner', v: (KIND_V[kind] || .5) * SPEED_K, bay: i, state: ST.BAY, charge: .62 + R() * .38, x: bay.x, z: bz(bay), yaw: bay.yaw, path: null, pi: 0, timer: 1.5 + i * 7 + R() * 5, load: false, siteI: -1, trips: 0, delivered: 0, since: 0, kindLoad: null, moving: false, lamp: 'green' });
    sim.bays[i] = i; }
  function bz(b) { return b.z; }
  return sim;
}
function dryNow(sim, w) { return w.y > sim.env.tide + .3; }
function pickSite(sim, r, R) {
  const pl = sim.pl, k = pl.work.length; if (!k) return -1;
  /* the next dry site that no other robot is on, starting from a seeded rotation */
  for (let pass = 0; pass < (r.want ? 2 : 1); pass++) for (let q = 0; q < k; q++) { const i = (r.siteI + 1 + q + (r.trips === 0 ? r.id * 2 : 0)) % k, w = pl.work[i];
    if (!dryNow(sim, w) || !litSite(sim, w) || sim.litter[i].taken || (pass === 0 && r.want && w.kind !== r.want)) continue; if (sim.robots.some(o => o !== r && (o.siteI === i && (o.state === ST.OUT || o.state === ST.WORK)))) continue; return i; }
  return -1;
}
function setPath(r, pts) { r.path = pts; r.pi = 0; }
function pathToSite(sim, r, i) { const w = sim.pl.work[i], bay = sim.YP.bays[r.bay], a = sim.YP.apron, ox = Math.cos(w.yaw + 1.2) * (r.id - 1) * .7, oz = -Math.sin(w.yaw + 1.2) * (r.id - 1) * .7;
  const pts = []; if (r.state === ST.BAY) { pts.push([bay.fx, bay.fz]); } pts.push([a.x, a.z]); for (const v of (w.via || [])) pts.push([v[0], v[1]]); pts.push([w.x + ox, w.z + oz]); return pts; }
function pathHome(sim, r) { const bay = sim.YP.bays[r.bay], a = sim.YP.apron, w = sim.pl.work[r.siteI], tail = [[a.x, a.z], [bay.fx, bay.fz], [bay.x, bay.z]];
  /* from the shore the robot retraces the bend of its way out (when it is still out there) */
  if (w && w.via && w.via.length && (r.state === ST.OUT || r.state === ST.WORK) && Math.hypot(r.x - w.x, r.z - w.z) < Math.hypot(r.x - a.x, r.z - a.z)) return w.via.slice().reverse().concat(tail);
  return tail; }
function pathToHeap(sim, r, kind) { const a = sim.YP.apron, d = sim.YP.drops[['metal', 'plastic', 'wood'].indexOf(kind)], w = sim.pl.work[r.siteI]; return ((w && w.via) || []).slice().reverse().concat([[a.x, a.z], [d.x, d.z]]); }
/* NIGHT SHIFTS (Job 6b, gift pages only: sim.shifts = true). At night at most half the robots charge at once (slots), the rest keep working at a night rate, within the lit shore near the yard. A charging robot stays until it is
   full (leave), then the lowest-charge worker below enter takes its place: they take turns, so charge evens out. One robot alone charges only when it is below enter. Without sim.shifts every robot goes home at night (the old routine). */
const NIGHT = { speed: .7, radius: 24, leave: .85, enter: .7, workMin: .45, floor: .16, drain: .6, intake: .008, enterOne: .4, slots: n => n >= 2 ? Math.floor(n / 2) : 1 };
const CAP_BIG = 2.5, SOLAR = { drain: .7, top: .0016 };   /* the bigger battery holds 2.5 times the charge (drains slowly in fraction, charges a little faster: a heavier lead); the solar panel slows the day drain and tops up while out in daylight */
const capOf = r => r.cap || 1;
const nightOn = sim => !!(sim.shifts && sim.env.night);
function litRadius(sim) { const a = sim.YP.apron, d = sim.pl.work.map(w => Math.hypot(w.x - a.x, w.z - a.z)).sort((p, q) => p - q); return Math.max(NIGHT.radius, d.length ? d[Math.min(2, d.length - 1)] + .5 : 0); }
function litSite(sim, w) { if (!nightOn(sim)) return true; const a = sim.YP.apron; return Math.hypot(w.x - a.x, w.z - a.z) <= (sim.nightR || (sim.nightR = litRadius(sim))); }
function shiftPlan(sim) {
  const act = sim.robots.filter(r => !r.off), slots = NIGHT.slots(act.length);
  const keep = act.filter(r => r.nc && r.charge < NIGHT.leave).sort((a, b) => a.charge - b.charge).slice(0, slots);
  act.forEach(r => { r.nc = keep.indexOf(r) >= 0; });
  const cand = act.filter(r => !r.nc && r.charge < (act.length >= 2 ? NIGHT.enter : NIGHT.enterOne) && r.state !== ST.TASK).sort((a, b) => a.charge - b.charge);
  for (const r of cand) { if (act.filter(q => q.nc).length >= slots) break; r.nc = true; }
  return act.filter(r => r.nc).map(r => r.id);
}
const lowOf = sim => nightOn(sim) ? NIGHT.floor : LOW_CHARGE;   /* at night the turn-taking sends them home; only an almost flat robot goes by itself */
const sheltered = (sim, r) => !!(sim.env.rain || (sim.env.night && (!sim.shifts || r.nc)));
function wantHome(sim, r) { return r.fit || sheltered(sim, r) || r.charge < lowOf(sim) || !sim.pl.work.some((w, i) => dryNow(sim, w) && !sim.litter[i].taken && litSite(sim, w)); }
function decide(sim, r, R) {
  if (wantHome(sim, r)) { r.state = ST.HOME; setPath(r, pathHome(sim, r)); return; }
  const i = pickSite(sim, r, R);
  if (i < 0) { r.state = ST.HOME; setPath(r, pathHome(sim, r)); return; }
  r.siteI = i; r.state = ST.OUT; setPath(r, pathToSite(sim, r, i));
}
/* advance a robot along its path by dist metres; true when it has arrived */
function advance(r, dist) {
  while (dist > 1e-6 && r.path && r.pi < r.path.length) {
    const p = r.path[r.pi], dx = p[0] - r.x, dz = p[1] - r.z, d = Math.hypot(dx, dz);
    if (d > .02) r.yaw = Math.atan2(dx, dz);
    if (d <= dist) { r.x = p[0]; r.z = p[1]; dist -= d; r.pi++; } else { r.x += dx / d * dist; r.z += dz / d * dist; dist = 0; }
  }
  return !r.path || r.pi >= r.path.length;
}
/* what a shore pile is made of, for the player: wood is planks, every second plastic pile is rope (the page's litterStock says the same), the rest is not wrack timber */
function wrackOf(w, i) { return !w ? null : w.kind === 'wood' ? 'planks' : (w.kind === 'plastic' && i % 2 === 0) ? 'rope' : null; }
function simStep(sim, dt, env) {
  if (env) { if (env.night !== undefined) sim.env.night = !!env.night; if (env.rain !== undefined) sim.env.rain = !!env.rain; if (env.tide !== undefined) sim.env.tide = env.tide; }
  const R = sim.R || (sim.R = mulberry32((sim.pl.seed >>> 0) * 53 + 3));
  sim.t += dt; if (nightOn(sim)) shiftPlan(sim); else for (const r of sim.robots) r.nc = false;
  /* Job 6d item 1: timber and rope arrive with the tide. A piece that comes back is a wash-up: counted by kind, logged, faster after a storm (sim.wrackK). The timer itself is the old one, so the economy is unchanged. */
  sim.litter.forEach((l, i) => { if (l.taken) { l.back -= dt * (sim.wrackK || 1); if (l.back <= 0) { l.taken = false; const k = wrackOf(sim.pl.work[i], i); if (k) { const W = sim.wrack || (sim.wrack = { n: 0, by: {}, log: [] }); W.n++; W.by[k] = (W.by[k] || 0) + 1; l.arr = sim.t; W.log.push({ t: sim.t, i, stock: k }); if (W.log.length > 200) W.log.shift(); } } } });
  const moving = [];
  for (const r of sim.robots) {
    r.yield = false;
    if (r.state !== r.ps) { r.ps = r.state; r.since = 0; }
    r.since += dt; r.moving = false;
    const shelter = sheltered(sim, r), nt = nightOn(sim), cap = capOf(r), dk = (nt ? NIGHT.drain : r.solar ? SOLAR.drain : 1) / cap, wk = nt ? NIGHT.speed : 1;
    if (r.solar && !nt && !sim.env.rain && r.state !== ST.BAY) r.charge = Math.min(1, r.charge + SOLAR.top * dt);
    switch (r.state) {
      case ST.BAY: {
        const bay = sim.YP.bays[r.bay]; r.x = bay.x; r.z = bay.z; r.yaw = bay.yaw;
        r.charge = Math.min(1, r.charge + (sim.env.night ? (sim.shifts ? NIGHT.intake : CHARGE.night) : sim.env.rain ? CHARGE.rain : CHARGE.sun) * (1 + .5 * (cap - 1)) / cap * dt);
        r.timer -= dt;
        if (r.timer <= 0 && !shelter && !r.fit && r.charge >= (nt ? NIGHT.workMin : .85)) { if (wantHome(sim, r)) r.timer = 4; else decide(sim, r, R); if (r.state === ST.OUT) r.since = 0; else r.timer = 4; }   /* Job 6c: a robot already in its bay with nothing to gather stays put; it used to walk to the apron and back every 14 s */
        break; }
      case ST.OUT: case ST.CARRY: case ST.HOME: {
        r.charge = Math.max(0, r.charge - DRAIN.move * dk * dt); r.moving = true;
        /* a robot out on the shore turns for home when the charge is low, at dusk or in rain; one that carries a load takes it to the heap first */
        if (r.state === ST.OUT && wantHome(sim, r) && (shelter || r.fit || r.charge < lowOf(sim))) { r.state = ST.HOME; setPath(r, pathHome(sim, r)); r.siteI = r.siteI; }
        moving.push(r); break; }
      case ST.WORK: {
        r.charge = Math.max(0, r.charge - DRAIN.work * dk * dt); r.timer -= dt * wk;
        if (shelter || r.fit || r.charge < lowOf(sim)) { r.state = ST.HOME; setPath(r, pathHome(sim, r)); break; }
        if (r.timer <= 0) { const w = sim.pl.work[r.siteI]; r.load = true; r.kindLoad = w.kind; sim.litter[r.siteI].taken = true; sim.litter[r.siteI].back = 120 + R() * 60; r.state = ST.CARRY; setPath(r, pathToHeap(sim, r, w.kind)); }
        break; }
      case ST.DROP: {
        r.charge = Math.max(0, r.charge - DRAIN.work * dk * dt); r.timer -= dt * wk;
        if (r.timer <= 0) { sim.heap[r.kindLoad] = (sim.heap[r.kindLoad] || 0) + 1; (sim.tripsBy || (sim.tripsBy = []))[r.siteI] = ((sim.tripsBy || [])[r.siteI] || 0) + 1; r.delivered++; r.trips++; r.load = false; r.kindLoad = null;
          if (r.role === 'sorter') { r.state = ST.SORT; r.timer = 6 + R() * 3; } else decide(sim, r, R); }
        break; }
      case ST.TASK: {   /* lent out: the page drives x, z, yaw and the flags tmove and twork; treturn hands it back to the routine (walks home to its bay) */
        if (r.treturn) { r.treturn = false; r.twork = false; r.tmove = false; r.state = ST.HOME; setPath(r, pathHome(sim, r)); break; }
        r.moving = !!r.tmove; r.charge = Math.max(0, r.charge - (r.tmove ? DRAIN.move : DRAIN.work) * dk * dt); break; }
      case ST.SORT: {
        r.charge = Math.max(0, r.charge - DRAIN.work * dk * dt); r.timer -= dt; if (r.timer <= 0) decide(sim, r, R); break; }
    }
  }
  /* moving: a robot gives way to a lower-numbered one that is moving and close ahead of it */
  for (const r of moving) {
    let stop = false;
    for (const o of moving) { if (o.id >= r.id) continue; const dx = o.x - r.x, dz = o.z - r.z, d = Math.hypot(dx, dz); if (d < 1.9 && dx * Math.sin(r.yaw) + dz * Math.cos(r.yaw) > 0) { stop = true; break; } }
    if (stop) { r.moving = false; r.yield = true; continue; }
    const arrived = advance(r, r.v * dt * (nightOn(sim) && r.state !== ST.HOME ? NIGHT.speed : 1));
    if (arrived) {
      if (r.state === ST.OUT) { r.state = ST.WORK; r.timer = (r.role === 'sorter' ? 6 : 9) + R() * 4; const w = sim.pl.work[r.siteI]; r.yaw = w.yaw; r.moving = false; }
      else if (r.state === ST.CARRY) { r.state = ST.DROP; r.timer = 3; r.moving = false; const d = sim.YP.drops[['metal', 'plastic', 'wood'].indexOf(r.kindLoad)]; r.yaw = d.yaw; }
      else if (r.state === ST.HOME) { r.state = ST.BAY; r.timer = 2 + R() * 3; r.moving = false; const bay = sim.YP.bays[r.bay]; r.x = bay.x; r.z = bay.z; r.yaw = bay.yaw; r.since = 0; }
    }
  }
  stopTrack(sim);
  return sim;
}

/* ROBOT STOPS (Job 6c; owner playtest 25 Nov: "the robots keep breaking down and nothing looks wrong with them"). Every robot that is not at work has ONE reason code, computed from the routine's own state, never invented:
   stopReason(sim, r) is null while it works (walking out, gathering, carrying, dropping, sorting, lent out and moving) and a code from STOPS otherwise. stopTrack(sim) runs at the end of every step and logs each CHANGE of code
   (sim.stops: when, which robot, code, place, battery, how long). The page draws the icon over the robot and says the sentence on its card; the notebook lists the last ten. The physical layer lends a robot out (state task) and says why it
   stands still in r.why and where in r.at. icon names are drawn by gift_day.js (STOP_ICONS). 'stuck' is in the table for the rock-and-rescue job (Job 4) and is never raised yet. */
const STOPS = {
  battery_low: { icon: 'battery', label: 'Battery low', say: (p, w) => 'Stopped: battery low, ' + p + ' percent. Heading to the charger.' },
  charging: { icon: 'bolt', label: 'Charging', say: p => 'Charging, ' + p + ' percent. Back to work at 85 percent.' },
  night_shift: { icon: 'moon', label: 'Night shift', say: p => 'Night shift: charging, ' + p + ' percent. Back when it is full.' },
  storm_home: { icon: 'cloud', label: 'Rain', say: () => 'Stopped: rain on the way. Heading home, then waiting under cover.' },
  wait_player: { icon: 'hand', label: 'Needs you', say: () => 'Waiting for you. Tap it to give it an order, or hold the ring to help.' },
  wait_supplies: { icon: 'box', label: 'Needs supplies', say: () => 'Waiting for supplies: planks and rope from your boat.' },
  water_in_way: { icon: 'wave', label: 'Tide in the way', say: () => 'Stopped: the tide covers the shore piles. Waiting for the water to drop.' },
  idle_nothing: { icon: 'zz', label: 'Nothing to do', say: () => 'Nothing to gather right now. Waiting for the shore to refill.' },
  stuck: { icon: 'rock', label: 'Stuck', say: () => 'Stuck on a rock. It needs a hand.' },
  fault_battery: { icon: 'off', label: 'Flat battery', say: () => 'Flat battery. It needs a battery from the spares crate.' },
  fault_track: { icon: 'off', label: 'Loose track', say: () => 'A loose track. It needs a track set from the spares crate.' },
  fault_lamp: { icon: 'off', label: 'Dark lamp', say: () => 'Dark lamp eyes. It needs a lamp unit from the spares crate.' },
  switched_off: { icon: 'off', label: 'Switched off', say: () => 'Switched off. It needs a track link to start.' },
  give_way: { icon: 'wait', label: 'Letting another pass', say: () => 'Letting another robot pass.' },
  resting: { icon: 'zz', label: 'Pausing', say: () => 'Pausing a moment at the post.' }
};
const STOP_CODES = Object.keys(STOPS);
function dryFree(sim) { return sim.pl.work.some((w, i) => dryNow(sim, w) && !sim.litter[i].taken && litSite(sim, w)); }
function stopReason(sim, r) {
  if (r.off) return r.fault ? 'fault_' + r.fault : 'switched_off';   /* the Gift's easy start: a carrier with a named fault (gift_day.js sets r.fault) says which part it needs */
  const st = r.state;
  if (st === ST.TASK) return r.tstall ? (r.why || 'wait_player') : null;
  if (st === ST.WORK || st === ST.DROP || st === ST.SORT) return null;
  if (st === ST.OUT || st === ST.CARRY) return r.yield ? 'give_way' : null;
  const night = sim.env.night && (!sim.shifts || r.nc);
  if (st === ST.HOME) {
    if (sim.env.rain) return 'storm_home'; if (r.fit) return 'wait_player'; if (night) return 'night_shift'; if (r.charge < lowOf(sim)) return 'battery_low';
    return dryFree(sim) ? 'idle_nothing' : sim.pl.work.some(w => !dryNow(sim, w)) ? 'water_in_way' : 'idle_nothing';
  }
  /* in the bay */
  if (sim.env.rain) return 'storm_home'; if (r.fit) return 'wait_player'; if (night) return 'night_shift';
  if (r.charge < (nightOn(sim) ? NIGHT.workMin : .85)) return 'charging';
  if (r.timer > 1e8) return 'wait_player';
  if (!dryFree(sim)) return sim.pl.work.some(w => !dryNow(sim, w)) ? 'water_in_way' : 'idle_nothing';
  if (pickSite(sim, r, null) < 0) return 'idle_nothing';
  return 'resting';
}
function placeOf(sim, r) {
  if (r.state === ST.TASK) return r.at || 'on a job';
  if (r.state === ST.BAY) return 'at the charging post';
  const w = sim.pl.work[r.siteI]; if (w && r.state !== ST.HOME && Math.hypot(r.x - w.x, r.z - w.z) < 6) return 'at the ' + (w.kind === 'wood' ? 'wood' : w.kind === 'metal' ? 'metal' : 'shore') + ' pile';
  if (inYard(sim, r)) return 'in the yard'; return r.state === ST.HOME ? 'on the way home' : 'on the shore';
}
function stopSay(sim, r, code) { const e = STOPS[code]; return e ? e.say(Math.round((r.charge || 0) * 100)) : null; }
function noteStop(sim, r, code, kind) {   /* an instant stop the page decides (a lent-out errand aborted): logged like any other, with its code */
  const L = sim.stops || (sim.stops = []); L.push({ t0: sim.t, id: r.id, code: STOPS[code] ? code : 'unknown', kind: kind || 'abort', place: placeOf(sim, r), pct: Math.round((r.charge || 0) * 100), dur: 0, open: false }); if (L.length > 3000) L.shift();
}
function stopTrack(sim) {
  const L = sim.stops || (sim.stops = []);
  for (const r of sim.robots) {
    const code = stopReason(sim, r) || null, was = r.pw || null; if (code === was) continue;
    if (r.pwe) { r.pwe.dur = sim.t - r.pwe.t0; r.pwe.open = false; r.pwe = null; }
    r.pw = code; if (!code) continue;
    const e = { t0: sim.t, id: r.id, code: STOPS[code] ? code : 'unknown', kind: 'stop', place: placeOf(sim, r), pct: Math.round((r.charge || 0) * 100), dur: null, open: true }; L.push(e); r.pwe = e; if (L.length > 3000) L.shift();
  }
}
/* run the routine forward by seconds in fixed steps (deterministic: a frozen picture is a function of the seed and the seconds run) */
function simRun(sim, seconds, env) { const h = .25; let t = 0; while (t < seconds - 1e-9) { const d = Math.min(h, seconds - t); simStep(sim, d, env); t += d; } return sim; }
const inYard = (sim, r) => { const p = sim.pl.yard; return Math.hypot(r.x - p.x, r.z - p.z) < p.R * .9; };

/* the shelter hook (LATER STEP): the page calls it with the rung it wants to show (2 = turf-and-stone hut, 3 = thatched cottage). Day one has no houses, so it only reports; see CAMP_START.md for how to fill it. */
function shelterHook(rung, ctx) { return { rung, drawn: false, note: 'rung ' + rung + ' shelter: art not built yet (CAMP_START.md, how to add the house step)', ctx: ctx || null }; }


/* the robots of a page that has no life.json (the default island table): recipes of assets/collector/world_robots by seed, a family tortoise first, no pontoon (it needs deep water) */
const DEFAULT_RECIPES = [
  { recipe_hash: '4dbef7cdea', kind: 'family', radical: false }, { recipe_hash: 'ef27bb5097', kind: 'family', radical: false }, { recipe_hash: 'bb1ec8a239', kind: 'crab', radical: true },
  { recipe_hash: '32f3f6f8c2', kind: 'walker', radical: true }, { recipe_hash: '4a928af14b', kind: 'roller', radical: true }, { recipe_hash: '596e2ce906', kind: 'spotter', radical: true },
  { recipe_hash: 'bf19c298c7', kind: 'scout', radical: true }, { recipe_hash: '4905097b64', kind: 'snail', radical: true }];
const recipeSite = r => Object.assign({ glb: 'assets/collector/world_robots/robot_' + r.recipe_hash + '_live.glb', role: ROLE_BY_KIND[r.kind], lamp_search: [1, .62, .08], lamp_found: [.3, .95, .32] }, r);
/* life: the page's life.json robots (or null); n: how many; returns the sites in order: the world's own robots first (family and radical, no pontoon), then default recipes by seed */
function pickBots(seed, life, n) {
  const R = mulberry32((seed >>> 0) * 7 + 3), out = [], used = {};
  for (const r of ((life && life.robots) || [])) { const kind = r.radical ? (KIND_V[r.plan] ? r.plan : 'family') : 'family'; if (r.plan === 'pontoon' || out.length >= n || used[r.recipe_hash]) continue; used[r.recipe_hash] = 1; out.push(Object.assign({}, r, { kind, role: r.role || ROLE_BY_KIND[kind] })); }
  const pool = DEFAULT_RECIPES.filter(d => !used[d.recipe_hash]); const fam = pool.filter(d => d.kind === 'family'), rad = pool.filter(d => d.kind !== 'family');
  for (let i = rad.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = rad[i]; rad[i] = rad[j]; rad[j] = t; }
  const order = (out.length ? [] : [fam[Math.floor(R() * fam.length)]]).concat(rad, fam);
  for (const d of order) { if (out.length >= n) break; if (!d || used[d.recipe_hash]) continue; used[d.recipe_hash] = 1; out.push(recipeSite(d)); }
  return out;
}
/* ================= PART 2: the THREE side ================= */
const E_ROBOT = 1.6;                       /* exaggeration of a 1 m machine at table scale (robots.js uses 1.8; the yard is built to this size; TUNING) */
const MOVE_CLIP = { walker: 'walk', spotter: 'walk', crab: 'walk', roller: 'roll' };
const ARMS = { family: 1, scout: 1 };
const PRINT = { family: 'wheel', scout: 'wheel', snail: 'belt', walker: 'foot6', spotter: 'foot4', crab: 'foot2', roller: 'roll', pontoon: 'belt' };
const kitCache = {}, botCache = {};         /* parsed GLB templates, kept across page rebuilds */
function b64buf(s) { const bin = atob(s), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8.buffer; }
/* Job 6d item 3: SOFT TRACKS. A track is a faint darker-green flattening of the grass with soft side edges that fades over about a game hour (TRACK.fadeS: a game hour is 20 s / 0.07 = about 290 s at the day's drift pace). It is never black. */
const TRACK = { col: [.17, .25, .11], amp: .2, fadeS: 280, perBot: 20, edge: .42 };
const TREAD_VS = 'attribute float aT;attribute float aS;varying float vT;varying float vS;void main(){vT=aT;vS=aS;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const TREAD_FS = 'uniform float uNow;uniform float uErase;uniform vec3 uCol;uniform float uAmp;varying float vT;varying float vS;void main(){float age=uNow-vT;float vis=step(0.0,age)*(1.0-smoothstep(0.08*uErase,uErase,age));float a=vis*uAmp*(1.0-smoothstep(0.42,1.0,abs(vS)));if(a<0.01)discard;gl_FragColor=vec4(uCol,a);}';
/* print shapes in the robot frame: [x offset, z offset, width, length] per stamp (stamp spacing .55 m) */
function printRects(kind, k) {
  const st = PRINT[kind] || 'wheel', sw = k % 2 ? 1 : -1;
  if (st === 'wheel') return [[-.46, 0, .2, .62], [.46, 0, .2, .62]];
  if (st === 'belt') return [[0, 0, .5, .62]];
  if (st === 'roll') return [[0, 0, .6, .6], [0, 0, .06, .62]];
  if (st === 'foot6') return [[-.9 * sw, -.2, .2, .26], [.9 * sw, .2, .2, .26], [-.35 * sw, .3, .14, .18]];
  if (st === 'foot4') return [[-.6 * sw, -.15, .16, .2], [.6 * sw, .15, .16, .2]];
  return [[-.8 * sw, 0, .2, .13], [.8 * sw, .2, .2, .13]];
}

function create(o) {
  const THREE = o.THREE, scene = o.scene, H = o.H, PB = o.PB, blob = o.blob, lin = o.lin, pl = o.plan;
  const tier = TIER_PIECES[o.tier] ? o.tier : 'high', LOW = tier !== 'high', cam = o.camera;
  const group = new THREE.Group(); group.name = 'camp'; scene.add(group);
  const R = mulberry32((pl.seed >>> 0) * 17 + 91);
  const stat = { glb: 'pending', kitLoaded: 0, kitFailed: 0, botsLoaded: 0, botsFallback: 0, botsSimple: 0, err: null };
  const forced = { night: null, rain: null }, st = { t: 0 };
  /* ---------------- the routine ---------------- */
  const sim = simCreate(pl, o.bots);
  const envNow = () => ({ night: forced.night !== null ? forced.night : !!(o.night && o.night()), rain: forced.rain !== null ? forced.rain : !!(o.rain && o.rain()), tide: o.tide() });
  simRun(sim, o.warm === undefined ? 14 : o.warm, { night: false, rain: false, tide: 0 });
  /* ---------------- the yard from simple weathered parts ---------------- */
  const Y = pl.yard, YP = sim.YP, D = YP.dims, n = Y.nBays;
  const colors = { steel: lin([.46, .48, .49]), steelD: lin([.28, .30, .32]), rust: lin([.56, .33, .20]), rustD: lin([.40, .23, .15]), wood: lin([.58, .53, .45]), woodD: lin([.36, .30, .24]), sand: lin([.80, .73, .56]), sandD: lin([.68, .60, .44]),
    panel: lin([.10, .15, .24]), panelB: lin([.13, .20, .22]), panelC: lin([.30, .26, .20]), frame: lin([.58, .59, .58]), cell: lin([.05, .08, .13]), tarp: lin([.52, .46, .30]), cable: lin([.06, .06, .07]), blue: lin([.18, .32, .55]), white: lin([.80, .80, .76]), orange: lin([.80, .42, .14]), green: lin([.22, .48, .28]) };
  const sY = Math.sin(Y.yaw), cY = Math.cos(Y.yaw);
  const W2 = (lx, lz) => [Y.x + lx * cY + lz * sY, Y.z - lx * sY + lz * cY];
  const gh = (lx, lz) => { const p = W2(lx, lz); return H(p[0], p[1]); };
  const mkL = (pb, base) => ({
    /* a box in the yard frame: centre (lx, ly above the ground, lz), size, yaw in the frame, colour, pitch about x */
    box(lx, ly, lz, w, h, d, ry, col, pitch) { const p = W2(lx, lz); pb.box(p[0], (base === undefined ? gh(lx, lz) : base) + ly, p[1], w, h, d, Y.yaw + (ry || 0), col, pitch); },
    blob(lx, ly, lz, sx, sy, sz, ry, seed, col, rough, facet) { const p = W2(lx, lz); blob(pb, p[0], (base === undefined ? gh(lx, lz) : base) + ly, p[1], sx, sy, sz, Y.yaw + (ry || 0), seed, () => col, rough === undefined ? .35 : rough, facet === undefined ? .6 : facet); },
    pbox(cx, cy, cz, offY, offZ, w, h, d, pitch, col) { const cp = Math.cos(pitch), sp = Math.sin(pitch); this.box(cx, cy + offY * cp - offZ * sp, cz + offY * sp + offZ * cp, w, h, d, 0, col, pitch); }
  });
  const meshes = { static: null, piles: [], litter: [] };
  const propsMat = o.propsMat;
  function addMesh(pb, castShadow) { const m = new THREE.Mesh(pb.build(), propsMat); m.castShadow = castShadow !== false; m.receiveShadow = true; group.add(m); return m; }
  {
    const pb = new PB(), L = mkL(pb);
    const S = BAY_SPACING, half = D.half, tint = (c, k) => c.map(v => v * k);
    /* the solar canopy: a lean-to roof of salvaged panels on posts, deep at the back (roof sheets, wind wall), one panel per bay */
    const postCols = [colors.woodD, colors.steelD, colors.wood];
    for (let k = 0; k <= n; k++) { const lx = -half + k * S + (R() - .5) * .08;
      L.box(lx, 1.05, -.3, .16, 2.1, .16, R() * .3, postCols[k % 3]); L.box(lx + (R() - .5) * .06, 1.45, -3.2, .18, 2.9, .18, R() * .3, postCols[(k + 1) % 3]); }
    /* a crossbar and a diagonal brace so the posts read as lashed, not standing */
    L.box(0, 2.08, -.3, n * S + .3, .1, .1, 0, colors.woodD); L.box(0, 2.88, -3.2, n * S + .3, .12, .12, 0, colors.woodD);
    L.box(-half - .05, 1.0, -1.7, .08, .08, 3.4, 0, colors.wood, .0);
    const pcols = [colors.panel, colors.panelB, colors.panelC, colors.panel];
    for (let i = 0; i < n; i++) { const lx = -half + S * (i + .5), pitch = .27 + (R() - .5) * .04, col = pcols[i % 4], cz = -1.75, cy = 2.45 + (R() - .5) * .04, w = S - .1, d = 2.95;
      L.pbox(lx, cy, cz, 0, 0, w, .07, d, pitch, col);
      for (const sx of [-1, 1]) L.pbox(lx, cy, cz, .02, 0, .06, .09, d + .04, pitch, colors.frame), L.pbox(lx + sx * (w / 2 - .02), cy, cz, .02, 0, .06, .09, d, pitch, colors.frame);
      L.pbox(lx, cy, cz, .02, d / 2, w, .09, .06, pitch, colors.frame); L.pbox(lx, cy, cz, .02, -d / 2, w, .09, .06, pitch, colors.frame);
      for (let c = 1; c < 4; c++) L.pbox(lx - w / 2 + c * w / 4, cy, cz, .045, 0, .025, .02, d - .1, pitch, colors.cell);
      for (let c = 1; c < 6; c++) L.pbox(lx, cy, cz, .045, -d / 2 + c * d / 6, w - .1, .02, .025, pitch, colors.cell);
      if (i === 1) L.pbox(lx + .28, cy, cz, .07, d / 2 - .55, .55, .03, .6, pitch, colors.tarp);   /* a taped repair where a cell cracked */
      if (i === 2) L.pbox(lx - .25, cy, cz, .08, -.4, .5, .03, .8, pitch, colors.steel);          /* a patch of salvaged steel */ }
    /* the back wall and the windward end: sheets and planks of mixed age, leaning a little (the shelter for the night and the rain) */
    const wallCols = [colors.rust, colors.steel, colors.wood, colors.rustD, colors.steelD, colors.wood];
    /* each sheet is three stacked pieces, darker toward the foot (rust and salt), nailed to two rails */
    const sheet = (lx, lz, w, h, col, side, ry) => { const segs = [[0, .36, .72], [.36, .68, .86], [.68, 1, 1.0]];
      for (const sg of segs) { const sh = (sg[1] - sg[0]) * h, cy = sg[0] * h + sh / 2, c = col.map(v => v * sg[2]);
        if (side) L.box(lx, cy, lz, .05, sh - .01, w - .03, 0, c); else L.box(lx, cy, lz, w - .03, sh - .01, .05, ry || 0, c); } };
    let x0 = -half - .05, k = 0; while (x0 < half + .05) { const w = .85 + R() * .5, h = 2.45 + R() * .5, lx = Math.min(x0 + w / 2, half + .1);
      sheet(lx, -3.38, w, h, wallCols[k % 6], false, (R() - .5) * .05); x0 += w; k++; }
    L.box(0, .55, -3.34, n * S + .5, .09, .06, 0, colors.woodD); L.box(0, 1.85, -3.34, n * S + .5, .09, .06, 0, colors.woodD);
    let z0 = -3.2; k = 0; while (z0 < -.6) { const w = .9 + R() * .4, h = 1.7 + R() * .6; sheet(half + .12, z0 + w / 2, w, h, wallCols[(k + 2) % 6], true); z0 += w; k++; }
    L.box(half + .12, 2.0, -1.9, .09, .09, 2.6, 0, colors.woodD);
    /* swept sand floor under the canopy and one charging plate per bay (a stone each side, a cable from the power box on the back post) */
    L.box(0, .02, -1.55, n * S + .2, .05, 3.25, 0, colors.sandD);
    L.box(-half - .38, 1.05, -2.9, .5, .62, .32, 0, colors.rust); L.box(-half - .38, 1.42, -2.9, .52, .06, .34, 0, colors.rustD);
    L.box(-half - .12, 1.1, -2.9, .09, .09, .09, 0, lin([.2, 1.6, .4]));
    L.box((-half - .38 + half - S / 2) / 2, .06, -2.78, half * 2 - S / 2 + .3, .07, .07, 0, colors.cable);
    for (let i = 0; i < n; i++) { const lx = -half + S * (i + .5);
      L.box(lx, .045, -1.55, 1.4, .06, 1.8, 0, colors.steelD); L.box(lx, .08, -2.35, 1.1, .04, .22, 0, colors.steel); L.box(lx, .06, -2.55, .07, .07, .5, 0, colors.cable);
      L.box(lx + .45, .11, -2.35, .12, .06, .12, 0, i % 2 ? lin([.2, 1.5, .4]) : lin([1.6, .8, .12]));
      for (const sx of [-1, 1]) L.blob(lx + sx * (S / 2 - .1), .12, -.55, .2, .14, .2, R() * 6, i * 7 + sx, lin([.5, .47, .42]), .4, .7); }
    /* the apron: swept sand in raked rings where the robots turn, a ring of stones round it with a gap toward the shore */
    {
      const ax = 0, az = 2.6, Rr = 2.9, SEG = 30, bands = [[0, .55], [.55, 1.15], [1.15, 1.7], [1.7, 2.3], [2.3, Rr]], cols = [colors.sand, tint(colors.sand, .9), colors.sand, tint(colors.sand, .88), colors.sand];
      const pt = (r, a) => { const p = W2(ax + Math.cos(a) * r, az + Math.sin(a) * r); return [p[0], H(p[0], p[1]) + .1, p[1]]; };
      bands.forEach((bd, bi) => { for (let s = 0; s < SEG; s++) { const a0 = s / SEG * TAU, a1 = (s + 1) / SEG * TAU, c = cols[bi];
        if (bd[0] === 0) pb.flat(pt(0, 0), pt(bd[1], a1), pt(bd[1], a0), c); else { pb.flat(pt(bd[0], a0), pt(bd[1], a1), pt(bd[1], a0), c); pb.flat(pt(bd[0], a0), pt(bd[0], a1), pt(bd[1], a1), c); } } });
      /* the gap faces the first work site */
      const w0 = pl.work[0], wl = (() => { const dx = w0.x - YP.apron.x, dz = w0.z - YP.apron.z; return [dx * cY - dz * sY, dx * sY + dz * cY]; })(), gap = Math.atan2(wl[1], wl[0]);
      const NS = 18; for (let s = 0; s < NS; s++) { const a = s / NS * TAU + .1; let da = Math.abs(((a - gap + Math.PI * 3) % TAU) - Math.PI); da = Math.PI - da; if (da < .32) continue;
        const rr = Rr + .12 + (R() - .5) * .22, sz = .24 + R() * .2; L.blob(ax + Math.cos(a) * rr, sz * .35, az + Math.sin(a) * rr, sz, sz * .65, sz * .85, R() * 6, 100 + s, [lin([.52, .50, .46]), lin([.40, .39, .38]), lin([.58, .52, .42])][s % 3], .4, .7); }
    }
    /* the workbench: planks on two trestles, a vice, a parts tray, tools, a battery, a spare panel against it, a bin of sorted bits underneath */
    {
      const bx = -half - 1.9, bz = -.7, by = 0, ry = -.38;
      const B = (dx, dy, dz, w, h, d, col, pitch, ryy) => { const c = Math.cos(ry), s = Math.sin(ry); L.box(bx + dx * c + dz * s, dy, bz - dx * s + dz * c, w, h, d, ry + (ryy || 0), col, pitch); };
      B(0, .93, 0, 2.1, .07, .85, colors.wood); B(0, .98, -.15, 2.0, .03, .5, colors.woodD);
      for (const sx of [-.8, .8]) { B(sx, .45, .3, .1, .9, .1, colors.woodD); B(sx, .45, -.3, .1, .9, .1, colors.woodD); B(sx, .3, 0, .08, .08, .7, colors.wood); }
      B(0, .22, 0, 1.7, .05, .62, colors.woodD);
      B(-.88, 1.1, .08, .2, .22, .22, colors.steelD); B(-.88, 1.23, .08, .12, .05, .3, colors.steel);
      B(-.2, 1.0, .0, .55, .06, .36, colors.rustD); for (let q = 0; q < 6; q++) B(-.4 + q * .08, 1.05, (q % 3 - 1) * .08, .05, .04, .05, [colors.steel, colors.rust, colors.panelC][q % 3]);
      B(.35, 1.08, .15, .5, .04, .06, colors.steel, 0, .5); B(.38, 1.0, .2, .45, .03, .05, colors.woodD, 0, -.3); B(.62, 1.04, -.18, .14, .06, .06, colors.steelD, 0, .2);
      B(.7, 1.1, .12, .34, .2, .22, colors.panelB); B(.62, 1.22, .12, .05, .05, .05, lin([1.4, .1, .1])); B(.78, 1.22, .12, .05, .05, .05, lin([.1, .1, .12]));
      B(-.1, .95, -.62, 1.0, .05, .7, colors.panel, .78);
      B(.2, .1, .02, .6, .22, .4, colors.woodD); for (let q = 0; q < 5; q++) B(.05 + q * .1, .24, 0, .08, .08, .1, [colors.steel, colors.rust, colors.wood, colors.blue, colors.steel][q]);
      /* a coil of cable and a lamp on a post */
      const cp = [bx - .95, bz + .55]; L.blob(cp[0] + 0, .08, cp[1] + 0, .2, .07, .2, 0, 77, colors.rustD, .12, .5); L.box(bx + 1.3, .6, bz + .3, .08, 1.2, .08, 0, colors.steelD); L.box(bx + 1.3, 1.28, bz + .3, .22, .18, .22, 0, lin([.8, .72, .5]));
    }
    meshes.static = addMesh(pb);
    /* three sorted piles beside the canopy: metal, plastic, wood (each its own mesh so it can grow with every delivery) */
    YP.piles.forEach((pp, i) => {
      const pbp = new PB(), Lp = { box: (lx, ly, lz, w, h, d, ry, col, pitch) => pbp.box(lx, ly, lz, w, h, d, ry || 0, col, pitch), blob: (lx, ly, lz, sx, sy, sz, ry, seed, col) => blob(pbp, lx, ly, lz, sx, sy, sz, ry || 0, seed, () => col, .4, .7) };
      Lp.box(0, .05, 0, 1.05, .08, .95, 0, colors.woodD);
      if (pp.kind === 'metal') { for (let q = 0; q < 7; q++) Lp.box((R() - .5) * .6, .18 + q * .06, (R() - .5) * .5, .55 + R() * .4, .04, .4 + R() * .3, R() * 3, [colors.rust, colors.steel, colors.rustD, colors.steelD][q % 4], (R() - .5) * .5);
        for (let q = 0; q < 3; q++) Lp.blob((R() - .5) * .5, .28, (R() - .5) * .4, .16, .12, .16, R() * 6, 200 + q, colors.steel); }
      else if (pp.kind === 'plastic') { const pc = [colors.blue, colors.white, colors.orange, colors.green, colors.blue, colors.white]; for (let q = 0; q < 8; q++) Lp.blob((R() - .5) * .6, .17 + (q % 3) * .1, (R() - .5) * .5, .2 + R() * .12, .11 + R() * .06, .16 + R() * .1, R() * 6, 220 + q, pc[q % 6], .3, .5);
        for (let q = 0; q < 3; q++) Lp.box((R() - .5) * .5, .4, (R() - .5) * .4, .09, .26, .09, R() * 3, pc[(q + 2) % 6], (R() - .5)); }
      else { for (let q = 0; q < 8; q++) { const a = q * .7 + R() * .3; Lp.box(Math.cos(a) * .15, .15 + q * .045, Math.sin(a) * .1, .9 + R() * .3, .07, .09, a, [colors.wood, colors.woodD, colors.wood][q % 3]); } }
      const m = new THREE.Mesh(pbp.build(), propsMat); m.castShadow = true; m.receiveShadow = true; m.position.set(pp.x, H(pp.x, pp.z), pp.z); m.rotation.y = Y.yaw; group.add(m); meshes.piles.push({ m, kind: pp.kind, base: 1 });
    });
  }
  /* litter on the shore sites: what the robots come for; one small mesh each, hidden while the robot has it and back after the tide */
  pl.work.forEach((w, i) => {
    const pb = new PB(), RR = mulberry32(i * 31 + pl.seed), pcs = (w.kind === 'plastic' && i % 2 === 0) ? [colors.wood, colors.woodD] : { plastic: [colors.blue, colors.white, colors.orange, colors.green].map(c => c.map(v => v * .75)), metal: [colors.steel, colors.rust, colors.steelD], wood: [colors.wood, colors.woodD] }[w.kind];
    const gy = (x, z) => H(x, z);
    for (let q = 0; q < 5; q++) { const a = RR() * TAU, d = RR() * 1.1, x = w.x + Math.cos(a) * d, z = w.z + Math.sin(a) * d, c = pcs[q % pcs.length];
      if (w.kind === 'wood') pb.box(x, gy(x, z) + .05, z, .9 + RR() * .5, .08, .1, RR() * 3, c);
      else if (w.kind === 'metal') { blob(pb, x, gy(x, z) + .06, z, .14, .1, .1, RR() * 6, 300 + q, () => c, .3, .6); }
      else if (wrackOf(w, i) === 'rope') pb.box(x, gy(x, z) + .03, z, .55 + RR() * .35, .05, .05, RR() * 3, c);   /* rope: thin tan lengths */
      else blob(pb, x, gy(x, z) + .04, z, .08 + RR() * .06, .05, .07 + RR() * .05, RR() * 6, 310 + q, () => c, .3, .5); }
    meshes.litter.push(addMesh(pb, false));
  });
  /* ---------------- the kit pieces ---------------- */
  const kit = []; const lodThr = (tier === 'high' ? 78 : tier === 'low' ? 46 : 36) * (o.lodScale || 1);   /* o.lodScale and o.hero are the ultra tier's (ULTRA_TIER.md): absent = unchanged */
  function simpleShape(kind) {
    const g = new THREE.Group(), M = (c) => new THREE.MeshLambertMaterial({ color: c }), add = (geo, c, x, y, z, ry) => { const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.rotation.y = ry || 0; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    const bx = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    if (kind === 'lean_to') { const r = add(bx(3.4, .08, 2.6), 0x9a8e70, 0, .85, 0); r.rotation.x = .75; add(bx(.12, 1.7, .12), 0x6a5a48, -1.7, .85, -.9); add(bx(.12, 1.7, .12), 0x6a5a48, 1.7, .85, -.9); }
    else if (kind === 'rain_barrel') { add(new THREE.CylinderGeometry(.55, .5, 1.1, 10), 0x6a4a2c, .2, .55, .6); add(bx(2.2, 1.7, .5), 0x8a8478, -.5, .85, -.3); }
    else if (kind === 'drying_rack') { add(bx(.1, 2, .1), 0x7a6a56, -2.2, 1, 0); add(bx(.1, 2, .1), 0x7a6a56, 2.2, 1, 0); add(bx(4.6, .1, .1), 0x7a6a56, 0, 1.9, 0); }
    else if (kind === 'cairn') { add(new THREE.ConeGeometry(.9, 2.1, 7), 0x8a867c, 0, 1.0, 0); }
    else if (kind === 'crate_stack') { add(bx(1.2, .9, 1.2), 0x9a8a68, -.5, .45, 0); add(bx(1.1, .9, 1.1), 0x5a6a78, .9, .45, .3); add(bx(1.0, .8, 1.0), 0x9a8a68, -.3, 1.3, .1); }
    else if (kind === 'relic_hull') { add(bx(9, 1.6, 3), 0x7a5a44, 0, .6, 0); add(bx(3.4, 1.2, 2.4), 0x8a6a54, 3.4, 1.5, 0); }
    else { add(bx(9, .12, 1.6), 0x7a6a56, 0, 1.4, 0); for (let i = -4; i <= 4; i += 2) add(bx(.2, 2.2, .2), 0x5a4a38, i, .6, .7); }
    return g;
  }
  function prepKit(t) { t.scene.traverse(n => { if (/^footprint/.test(n.name || '')) n.visible = false; if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; n.frustumCulled = true; } }); }
  /* a level of detail is hidden by hiding its meshes (not its parent), so the page's triangle count, which only looks at meshes, stays honest */
  function setLod(k, lod) { k.lod = lod; if (!k.F) return; k.Lm.forEach(m => { m.visible = lod === 'live'; }); k.Fm.forEach(m => { m.visible = lod === 'far'; }); if (k.Hm) k.Hm.forEach(m => { m.visible = lod === 'hero'; }); }
  /* the hero level of the kit pieces (assets/kit/kit_<kind>_hero.glb, 7 to 8 times the live triangles): only when the page asks (o.hero) and only over http(s), where a fetch can read the file; file:// keeps live */
  const heroStat = { asked: !!o.hero, loaded: 0, failed: 0, kinds: [] };
  function heroLoad() {
    if (!o.hero || !THREE.GLTFLoader || !root.fetch || !/^https?:/.test(location.protocol)) return;
    const kinds = []; kit.forEach(k => { if (!k.simple && kinds.indexOf(k.p.kind) < 0) kinds.push(k.p.kind); });
    kinds.forEach(kind => fetch(o.base + 'assets/kit/kit_' + kind + '_hero.glb').then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); }).then(buf => new Promise((res, rej) => new THREE.GLTFLoader().parse(buf, '', res, rej))).then(g => {
      prepKit(g); heroStat.loaded++; heroStat.kinds.push(kind);
      kit.forEach(k => { if (k.p.kind !== kind || k.simple || k.H) return; k.H = g.scene.clone(true); k.g.add(k.H); k.Hm = []; k.H.traverse(m => { if (m.isMesh && !/^footprint/.test(m.name || '') && m.visible) k.Hm.push(m); }); if (o.onHero) o.onHero(k.H); setLod(k, k.lod); });
    }).catch(() => { heroStat.failed++; }));
  }
  function buildKit() {
    for (const p of pl.pieces) {
      const g = new THREE.Group(); g.name = 'kit_' + p.kind; g.position.set(p.x, p.y, p.z); g.rotation.y = p.yaw; g.scale.setScalar(p.sc);
      const live = kitCache[p.kind + '_live'], far = kitCache[p.kind + '_far'];
      let L = null, F = null, simple = false;
      if (live && far) { L = live.scene.clone(true); F = far.scene.clone(true); } else { L = simpleShape(p.kind); F = null; simple = true; }
      g.add(L); if (F) g.add(F);
      const meshesOf = r => { const a = []; r.traverse(m => { if (m.isMesh && !/^footprint/.test(m.name || '') && m.visible) a.push(m); }); return a; };
      const k = { p, g, L, F, simple, lod: F ? 'far' : 'live', Lm: meshesOf(L), Fm: F ? meshesOf(F) : [] };
      setLod(k, k.lod); group.add(g); kit.push(k);
    }
    kitReady = true; heroLoad();
  }
  let kitReady = false;
  function kitLoad() {
    const need = []; for (const p of pl.pieces) for (const lod of ['live', 'far']) { const k = p.kind + '_' + lod; if (!kitCache[k] && need.indexOf(k) < 0) need.push(k); }
    const src = root.LI_KIT_GLB || {}; let left = need.length;
    if (!left) { stat.glb = 'cached'; buildKit(); return; }
    const done = () => { if (--left > 0) return; stat.glb = stat.kitFailed ? 'failed' : 'ok'; buildKit(); };
    need.forEach(k => {
      let buf = null; try { buf = o.mode.kit === 'bad' ? new Uint8Array(96).buffer : (o.mode.kit === 'fail' || !src[k] ? null : b64buf(src[k])); } catch (e) { buf = null; }
      if (!buf || !THREE.GLTFLoader) { stat.kitFailed++; done(); return; }
      try { new THREE.GLTFLoader().parse(buf, '', g => { prepKit(g); kitCache[k] = g; stat.kitLoaded++; done(); }, e => { stat.kitFailed++; stat.err = String(e && e.message || e); done(); }); } catch (e) { stat.kitFailed++; stat.err = String(e); done(); }
    });
  }
  /* ---------------- the robots ---------------- */
  const robots = [], treadMats = [];
  function getBuffer(site, cb) {
    const h = site.recipe_hash, url = site.glb || '';
    const fallback = () => {   /* the committed tortoise stands in; its base64 twin is read only now, so a normal page never pays for it */
      if (o.mode.bots === 'simple') { cb(null); return; }
      const use = () => { if (root.LI_COLLECTOR_LIVE_B64) { stat.botsFallback++; cb(b64buf(root.LI_COLLECTOR_LIVE_B64)); } else cb(null); };
      if (root.LI_COLLECTOR_LIVE_B64 || typeof document === 'undefined') { use(); return; }
      const s = document.createElement('script'); s.src = o.base + 'assets/collector/collector_live_b64.js'; s.onload = use; s.onerror = () => cb(null); document.head.appendChild(s); };
    if (o.mode.bots === 'simple') { cb(null); return; }
    if (o.mode.bots === 'fallback' || !url || !h) { fallback(); return; }
    const viaScript = () => {
      if (root.LI_ROBOT_GLB && root.LI_ROBOT_GLB[h]) { cb(b64buf(root.LI_ROBOT_GLB[h])); return; }
      const s = document.createElement('script'); s.src = o.base + url.replace(/\.glb$/, '.js');
      s.onload = () => { if (root.LI_ROBOT_GLB && root.LI_ROBOT_GLB[h]) cb(b64buf(root.LI_ROBOT_GLB[h])); else fallback(); }; s.onerror = fallback; document.head.appendChild(s); };
    if (/^https?:/.test(location.protocol) && root.fetch) fetch(o.base + url).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); }).then(cb, viaScript); else viaScript();
  }
  function loadModel(site, cb) {
    const h = site.recipe_hash || 'committed'; let c = botCache[h];
    if (c) { if (c.gltf !== undefined) cb(c.gltf); else c.wait.push(cb); return; }
    c = botCache[h] = { gltf: undefined, wait: [cb] };
    const done = g => { c.gltf = g; const w = c.wait; c.wait = []; w.forEach(f => f(g)); };
    if (!THREE.GLTFLoader) { done(null); return; }
    getBuffer(site, buf => { if (!buf) { done(null); return; } try { new THREE.GLTFLoader().parse(buf, '', done, () => done(null)); } catch (e) { done(null); } });
  }
  function simpleRobot() {
    const g = new THREE.Group(), M = c => new THREE.MeshLambertMaterial({ color: c });
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    add(new THREE.BoxGeometry(.5, .26, .8), M(0x6f7a6c), 0, .34, 0); add(new THREE.BoxGeometry(.14, .2, .9), M(0x2a2a2a), -.3, .12, 0); add(new THREE.BoxGeometry(.14, .2, .9), M(0x2a2a2a), .3, .12, 0);
    const lampM = new THREE.MeshLambertMaterial({ color: 0x222222, emissive: 0xffa010 }); lampM.name = 'Lamp'; add(new THREE.SphereGeometry(.07, 8, 6), lampM, 0, .56, .1);
    return { scene: g, animations: [] };
  }
  function prepareBot(r, gltf) {
    let simple = false; if (!gltf) { gltf = simpleRobot(); simple = true; stat.botsSimple++; } else stat.botsLoaded++;
    const clipsByName = {}; (gltf.animations || []).forEach(c => { clipsByName[c.name] = c; });
    const g = gltf.scene.clone(true); g.name = 'robot_' + r.id; const nodes = {}; g.traverse(nn => { nodes[nn.name] = nn; });
    r.nodes = nodes; r.rest = {}; for (const k in nodes) r.rest[k] = { q: nodes[k].quaternion.clone(), s: nodes[k].scale.clone(), p: nodes[k].position.clone() };
    r.clips = clipsByName; r.tracks = {}; for (const name in clipsByName) r.tracks[name] = clipsByName[name].tracks.map(tr => { const dot = tr.name.lastIndexOf('.'); return { node: tr.name.slice(0, dot), prop: tr.name.slice(dot + 1), it: tr.createInterpolant(new Float32Array(tr.getValueSize())) }; });
    r.animNodes = new Set(); for (const name in r.tracks) r.tracks[name].forEach(t => r.animNodes.add(t.node));
    g.traverse(nn => { if (!nn.isMesh) return; nn.castShadow = true; nn.receiveShadow = true; nn.frustumCulled = false;
      if (nn.material && (nn.material.name === 'Lamp' || nn.material.name === 'Glow')) { const m = nn.material.clone(); nn.material = m; if (m.name === 'Lamp') r.lampMat = m; else { r.glowMat = m; if (m.emissive) m.emissive.setRGB(0, 0, 0); m.emissiveIntensity = 0; } } });   /* the visor glow strip stays dark: a machine, not a face */
    g.scale.setScalar(E_ROBOT * (simple ? 1.2 : 1)); g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g), sz = new THREE.Vector3(); box.getSize(sz);
    r.fl = clamp(.42 * sz.z, .45, 1.4); r.fw = clamp(.4 * sz.x, .35, 1.2); r.gOff = clamp(-box.min.y, -.05, .12); r.size = [sz.x, sz.y, sz.z]; r.simple = simple;
    const s = sim.robots[r.id]; g.position.set(s.x, H(s.x, s.z), s.z); r.yawR = s.yaw; group.add(g); r.node = g; r.ready = true;
  }
  const NQ = 220;
  o.bots.slice(0, sim.robots.length).forEach((b, i) => {
    const r = { id: i, site: b, kind: sim.robots[i].kind, ready: false, node: null, yawR: 0, lampCode: 'dim', clip: null, last: null, errCount: 0 };
    const g = new THREE.BufferGeometry(), pos = new Float32Array(NQ * 4 * 3), aT = new Float32Array(NQ * 4).fill(1e9), idx = [];
    for (let q = 0; q < NQ; q++) idx.push(q * 4, q * 4 + 1, q * 4 + 2, q * 4, q * 4 + 2, q * 4 + 3);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.BufferAttribute(aT, 1)); g.setAttribute('aS', new THREE.BufferAttribute(new Float32Array(NQ * 4).map((v, k) => (k % 4 === 0 || k % 4 === 3) ? 1 : -1), 1)); g.setIndex(idx); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(Y.x, 0, Y.z), 1e4);
    const wake = new THREE.ShaderMaterial({ uniforms: { uNow: { value: 0 }, uErase: { value: TRACK.fadeS + i * TRACK.perBot }, uCol: { value: new THREE.Vector3(TRACK.col[0], TRACK.col[1], TRACK.col[2]) }, uAmp: { value: TRACK.amp } }, vertexShader: TREAD_VS, fragmentShader: TREAD_FS, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const mesh = new THREE.Mesh(g, wake); mesh.frustumCulled = false; mesh.renderOrder = 3; group.add(mesh); r.tread = { g, mesh, mat: wake, q: 0, last: null, k: 0 };
    robots.push(r);
    loadModel(b, gl => prepareBot(r, gl));
  });
  function stamp(r, x, z, yaw, T) {
    const t = r.tread; if (t.last && Math.hypot(x - t.last[0], z - t.last[1]) < .55) return;
    const rects = printRects(r.kind, t.k++), p = t.g.attributes.position.array, aT = t.g.attributes.aT.array, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = Math.cos(yaw), lz = -Math.sin(yaw);
    for (const rc of rects) { const cx = x + lx * rc[0] + fx * rc[1], cz = z + lz * rc[0] + fz * rc[1], hw = rc[2] * .75, hl = rc[3] / 2;
      const c = [[cx + lx * hw - fx * hl, cz + lz * hw - fz * hl], [cx - lx * hw - fx * hl, cz - lz * hw - fz * hl], [cx - lx * hw + fx * hl, cz - lz * hw + fz * hl], [cx + lx * hw + fx * hl, cz + lz * hw + fz * hl]];
      const q = t.q % NQ; for (let k = 0; k < 4; k++) { p[(q * 4 + k) * 3] = c[k][0]; p[(q * 4 + k) * 3 + 1] = Math.max(H(c[k][0], c[k][1]), -.2) + .045; p[(q * 4 + k) * 3 + 2] = c[k][1]; aT[q * 4 + k] = T; } t.q++; }
    t.last = [x, z]; t.g.attributes.position.needsUpdate = true; t.g.attributes.aT.needsUpdate = true;
  }
  /* WORN PATHS (Job 6d item 3): the routes the robots walk most slowly wear a pale path. One mesh, a fixed number of segments (LI_WHERE.PATH.cap), alpha rewritten twice a second and only when a trip or the fade changed it: no allocation per frame. */
  const PW = (function () {
    const Wh = root.LI_WHERE; if (!Wh || !sim.YP) return null; const ap = sim.YP.apron, routes = pl.work.map(w => [[ap.x, ap.z]].concat(w.via || []).concat([[w.x, w.z]])), segs = Wh.pathPlan(routes, Wh.PATH.cap), nS = segs.reduce((a, b) => a + b.length, 0); if (!nS) return null;
    const pos = new Float32Array(nS * 4 * 3), aA = new Float32Array(nS * 4), aS = new Float32Array(nS * 4), idx = [], own = [], base = []; let q = 0;
    segs.forEach((sg, ri) => sg.forEach(S => { const dx = S[2] - S[0], dz = S[3] - S[1], d = Math.hypot(dx, dz) || 1, nx = -dz / d * .42, nz = dx / d * .42, c = [[S[0] + nx, S[1] + nz, 1], [S[0] - nx, S[1] - nz, -1], [S[2] - nx, S[3] - nz, -1], [S[2] + nx, S[3] + nz, 1]];
      for (let k = 0; k < 4; k++) { pos[(q * 4 + k) * 3] = c[k][0]; pos[(q * 4 + k) * 3 + 1] = Math.max(H(c[k][0], c[k][1]), -.2) + .04; pos[(q * 4 + k) * 3 + 2] = c[k][1]; aS[q * 4 + k] = c[k][2]; }
      idx.push(q * 4, q * 4 + 1, q * 4 + 2, q * 4, q * 4 + 2, q * 4 + 3); own.push(ri); q++; }));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aA', new THREE.BufferAttribute(aA, 1)); g.setAttribute('aS', new THREE.BufferAttribute(aS, 1)); g.setIndex(idx); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(Y.x, 0, Y.z), 1e4);
    const m = new THREE.ShaderMaterial({ uniforms: {}, vertexShader: 'attribute float aA;attribute float aS;varying float vA;varying float vS;void main(){vA=aA;vS=aS;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'varying float vA;varying float vS;void main(){float a=vA*(1.0-smoothstep(0.35,1.0,abs(vS)));if(a<0.01)discard;gl_FragColor=vec4(0.80,0.74,0.58,a);}', transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.name = 'worn_paths'; group.add(mesh);
    return { W: Wh.wearNew(routes.length), g, mesh, own, nS, seen: [], acc: 0, tris: nS * 2, last: -1 };
  })();
  function wearSync(dt, tide) {
    if (!PW) return; const Wh = root.LI_WHERE, tb = sim.tripsBy || []; let ch = false;
    for (let i = 0; i < PW.W.w.length; i++) { const n = tb[i] || 0, was = PW.seen[i] || 0; if (n > was) { Wh.wearAdd(PW.W, i, n - was); PW.seen[i] = n; ch = true; } }
    PW.acc += dt; if (PW.acc < 2 && !ch) return; const step = PW.acc; PW.acc = 0; Wh.wearDecay(PW.W, step);
    const aA = PW.g.attributes.aA.array, p = PW.g.attributes.position.array; let any = 0;
    for (let sI = 0; sI < PW.nS; sI++) { const al = Wh.wearAlpha(PW.W, PW.own[sI]); for (let k = 0; k < 4; k++) { const v = sI * 4 + k, a = p[v * 3 + 1] < tide + .06 ? 0 : al; aA[v] = a; if (a > 0) any++; } }
    PW.g.attributes.aA.needsUpdate = true; PW.mesh.visible = any > 0;
  }
  let erased = 0;
  function eraseByTide(tide) {      /* a print under the water is gone for good */
    for (const r of robots) { const t = r.tread, p = t.g.attributes.position.array, aT = t.g.attributes.aT.array; let ch = false;
      for (let q = 0; q < NQ * 4; q += 4) { if (aT[q] > 1e8) continue; if (p[q * 3 + 1] < tide + .06 && p[q * 3 + 1] > -5) { for (let k = 0; k < 4; k++) aT[q + k] = 1e9; ch = true; erased++; } }
      if (ch) t.g.attributes.aT.needsUpdate = true; }
  }
  const LAMP = { amber: o.lampSearch || [1, .62, .08], green: o.lampFound || [.3, .95, .32] };
  function lampFor(s, T) {
    const low = s.charge < LOW_CHARGE;
    if (s.state === ST.BAY) return s.charge < .55 ? 'dim' : 'green';
    if (low || s.state === ST.HOME) return low ? 'dim' : 'amber';
    if (s.state === ST.TASK) return s.tstall ? 'amber' : 'green';
    if (s.state === ST.CARRY || s.state === ST.DROP) return 'green';
    if (s.state === ST.WORK) return s.since > 3.2 ? 'green' : 'amber';
    return 'amber';
  }
  function applyBot(r, s, T, dt) {
    const g = r.node; const tracks = r.tracks, clips = r.clips;
    for (const k of r.animNodes) { const n = r.nodes[k]; if (!n) continue; n.quaternion.copy(r.rest[k].q); n.scale.copy(r.rest[k].s); }
    const set = (name, t, loop) => { const trs = tracks[name]; if (!trs) return false; const dur = clips[name].duration || 1; const tc = loop ? ((t % dur) + dur) % dur : clamp(t, 0, dur);
      for (const tr of trs) { const n = r.nodes[tr.node]; if (!n) continue; const v = tr.it.evaluate(tc); if (tr.prop === 'quaternion') n.quaternion.set(v[0], v[1], v[2], v[3]); else if (tr.prop === 'scale') n.scale.set(v[0], v[1], v[2]); else if (tr.prop === 'position') n.position.set(v[0], v[1], v[2]); } return true; };
    let clip = null; const arms = !!ARMS[r.kind], since = s.since;
    if (s.moving) { const mv = MOVE_CLIP[r.kind]; if (mv) { const dur = clips[mv] ? clips[mv].duration : 1; set(mv, T * (mv === 'roll' ? .5 : 1) + r.id * .37 * dur, true); clip = mv; } }
    else if (s.state === ST.WORK || (s.state === ST.TASK && s.twork)) { if (arms) { set('arm_unfold', since, false); clip = 'arm_unfold'; } else if (r.kind === 'crab') { set('claw_sort', since, true); clip = 'claw_sort'; } else { set('lid_open', Math.min(since, 1.4), false); clip = 'lid_open'; } }
    else if (s.state === ST.DROP) { if (arms) { if (since < 1.4) set('arm_unfold', 3.6, false); else set('arm_stow', since - 1.4, false); clip = 'arm_unfold'; } else { set('lid_open', 1.4, false); clip = 'lid_open'; } }
    else if (s.state === ST.SORT) { if (r.kind === 'crab') { set('claw_sort', since, true); clip = 'claw_sort'; } else { set('head_tilt', since % 2.4, false); clip = 'head_tilt'; } }
    r.clip = clip;
    r.lampCode = lampFor(s, T);
    if (r.lampMat && r.lampMat.emissive) {
      const code = r.lampCode, c = code === 'green' ? LAMP.green : LAMP.amber;
      let k = 1; if (code === 'dim') k = .22 + .1 * Math.sin(T * 1.1 + r.id * 2); else if (code === 'amber') k = .55 + .45 * (Math.sin(T * 2.4 + r.id * 1.7) > 0 ? 1 : .15); else k = .9 + .1 * Math.sin(T * 3.1);
      r.lampMat.emissive.setRGB(c[0] * k, c[1] * k, c[2] * k); r.lampMat.emissiveIntensity = 2.2;
    } else if (r.lampMat && r.lampMat.color) { const c = r.lampCode === 'green' ? LAMP.green : LAMP.amber; r.lampMat.emissive && r.lampMat.emissive.setRGB(c[0], c[1], c[2]); }
  }
  function place(r, s, dt) {
    if (!r.ready) return;
    r.yawR = angLerp(r.yawR, s.yaw, dt > .5 ? 1 : Math.min(1, dt * 6));
    const n = r.node, x = s.x, z = s.z, yaw = r.yawR, fl = r.fl, fw = r.fw, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = Math.cos(yaw), lz = -Math.sin(yaw);
    const hf = H(x + fx * fl, z + fz * fl), hb = H(x - fx * fl, z - fz * fl), hl = H(x + lx * fw, z + lz * fw), hr = H(x - lx * fw, z - lz * fw), hc = H(x, z);
    const legged = r.kind === 'walker' || r.kind === 'spotter' || r.kind === 'crab';
    const y = legged ? Math.max(hc, hf, hb, hl, hr) - .03 : Math.max(hc, (hf + hb + hl + hr) / 4) - .02;
    n.rotation.order = 'YXZ'; n.position.set(x, y + (r.gOff || 0), z); n.rotation.set(-Math.atan2(hf - hb, 2 * fl), yaw, Math.atan2(hl - hr, 2 * fw));
  }
  /* ---------------- frame ---------------- */
  let hudEl = null;
  function hudInit() {
    if (!o.hud || typeof document === 'undefined') return;
    hudEl = document.getElementById('campChip');
    if (!hudEl) { hudEl = document.createElement('div'); hudEl.id = 'campChip'; hudEl.className = 'pill'; hudEl.style.cssText = 'position:fixed;left:10px;bottom:104px;z-index:5;font-weight:800;pointer-events:none;max-width:calc(100vw - 20px)'; document.body.appendChild(hudEl); }
  }
  hudInit();
  function counts() { const inY = sim.robots.filter(r => inYard(sim, r)).length; return { pieces: kit.length, robots: sim.robots.length, inYard: inY, heap: Object.assign({}, sim.heap), kitReady }; }
  function hudText() { const c = counts(); return 'Camp: day one  ·  kit pieces ' + c.pieces + '  ·  robots ' + c.robots + '  ·  in yard now ' + c.inYard; }
  let hudT = 0, camPos = new THREE.Vector3();
  function lodUpdate() {
    if (!cam) return; camPos.copy(cam.position);
    for (const k of kit) { if (!k.F) continue; const d = Math.hypot(camPos.x - k.p.cx, camPos.y - 0, camPos.z - k.p.cz), want = (k.lod === 'live' || k.lod === 'hero') ? d < lodThr + 8 : d < lodThr - 8;
      const hd = o.heroDist || 0, wantHero = k.H && hd && (k.lod === 'hero' ? d < hd * 1.12 : d < hd);
      const lod = o.forceLod ? o.forceLod : wantHero ? 'hero' : want ? 'live' : 'far'; if (lod !== k.lod) setLod(k, lod); }
  }
  let toff = 0;
  function frame(dt, T) {
    st.t = T; let rem = dt; const env = envNow();
    while (rem > 1e-6) { const d = Math.min(.25, rem); simStep(sim, d, env); rem -= d; }
    syncVisual(dt, T + toff);
  }
  let lastTide = 0;
  function syncVisual(dt, T) {
    const tide = o.tide();
    for (const r of robots) { const s = sim.robots[r.id]; r.tread.mat.uniforms.uNow.value = T; if (!r.ready) continue; place(r, s, dt); applyBot(r, s, T, dt); if (s.moving) stamp(r, s.x, s.z, r.yawR, T); }
    if (Math.abs(tide - lastTide) > .004) { eraseByTide(tide); lastTide = tide; }
    wearSync(dt, tide);
    sim.litter.forEach((l, i) => { if (meshes.litter[i]) meshes.litter[i].visible = !l.taken; });
    for (const p of meshes.piles) { const cnt = sim.heap[p.kind] || 0, k = .78 + .05 * Math.min(cnt, 9); p.m.scale.set(1, k, 1); }
    lodUpdate();
    hudT += dt; if (hudEl && hudT > .25) { hudT = 0; const tx = hudText(); if (hudEl.textContent !== tx) hudEl.textContent = tx; }
  }
  kitLoad();
  const triCount = () => { let t = 0; group.traverse(n => { if (n.isMesh && n.visible) { let vis = true, p = n; while (p && p !== group) { if (!p.visible) { vis = false; break; } p = p.parent; } if (vis) { const g = n.geometry; t += g.index ? g.index.count / 3 : g.attributes.position.count / 3; } } }); return Math.round(t); };
  const api = {
    counts, hud: hudText, plan: () => pl, sim: () => sim, group, kit: () => kit.map(k => ({ kind: k.p.kind, x: k.p.x, z: k.p.z, y: k.p.y, yaw: k.p.yaw, cx: k.p.cx, cz: k.p.cz, fr: k.p.fr, lod: k.lod, simple: k.simple, vis: true })),
    robots: () => robots.map(r => { const s = sim.robots[r.id]; return { id: r.id, kind: r.kind, role: s.role, state: s.state, charge: s.charge, x: s.x, z: s.z, yaw: s.yaw, bay: s.bay, lamp: r.lampCode, clip: r.clip, ready: r.ready, simple: !!r.simple, load: s.load, delivered: s.delivered, moving: s.moving, prints: (() => { const aT = r.tread.g.attributes.aT.array; let c = 0; for (let i = 0; i < aT.length; i += 4) if (aT[i] < 1e8) c++; return c; })(), y: r.node ? r.node.position.y : null, ground: H(s.x, s.z), size: r.size || null }; }),
    ready: () => kitReady && robots.every(r => r.ready), kitReady: () => kitReady, stat: () => Object.assign({}, stat), tris: triCount,
    heroStat: () => Object.assign({}, heroStat, { kinds: heroStat.kinds.slice() }),
    force: v => { if (v.night !== undefined) forced.night = v.night; if (v.rain !== undefined) forced.rain = v.rain; }, forceLod: l => { o.forceLod = l; for (const k of kit) if (k.F && l) setLod(k, l); },
    /* run the routine forward by seconds (tests, pictures), then put the robots where it left them */
    advance(seconds) { const env = envNow(); let t = 0; const T0 = st.t + toff;
      while (t < seconds - 1e-9) { const d = Math.min(.25, seconds - t); simStep(sim, d, env); t += d; for (const r of robots) { const s = sim.robots[r.id]; if (r.ready && s.moving) stamp(r, s.x, s.z, s.yaw, T0 + t); } }
      toff += seconds; for (const r of robots) if (r.ready) r.yawR = sim.robots[r.id].yaw; syncVisual(.6, st.t + toff); return counts(); },
    stampTrail(i, steps) { const r = robots[i]; if (!r) return 0; return r.tread.q; }, erased: () => erased, paths: () => PW ? { segments: PW.nS, tris: PW.tris, max: PW.W.w.reduce((a, b) => Math.max(a, b), 0), alphas: PW.W.w.map((v, i) => root.LI_WHERE.wearAlpha(PW.W, i)), visible: PW.mesh.visible } : null, heap: () => Object.assign({}, sim.heap), hudEl: () => hudEl,
    yard: () => ({ x: Y.x, z: Y.z, yaw: Y.yaw, y: Y.y, nBays: n, points: YP }), work: () => pl.work, litter: () => sim.litter.map(l => l.taken), lamp: LAMP, E_ROBOT
  };
  return { frame, api, group, hash: () => { let h = 2166136261 >>> 0; const mix = v => { v = Math.round(v * 100) | 0; for (let i = 0; i < 4; i++) { h ^= (v >>> (i * 8)) & 255; h = Math.imul(h, 16777619) >>> 0; } }; pl.pieces.forEach(p => { mix(p.x); mix(p.z); mix(p.yaw * 10); }); mix(Y.x); mix(Y.z); pl.work.forEach(w => { mix(w.x); mix(w.z); }); return ('00000000' + h.toString(16)).slice(-8); } };
}

/* the tier of a plan made for 'high': fewer pieces, bays and work sites for low and AR (the page plans once, so a quality change rebuilds from the same plan) */
function forTier(pl, tier) { const mt = TIER_PIECES[tier] || 3, nb = Math.min(pl.nBays, TIER_BOTS[tier] || 3);
  return Object.assign({}, pl, { tier, nBays: nb, yard: Object.assign({}, pl.yard, { nBays: nb }), pieces: pl.pieces.filter(p => PIECES[p.kind].tier <= mt), work: pl.work.slice(0, { high: 7, low: 5, ar: 3 }[tier] || 7) }); }
const API = { TRACK, wrackOf, STOPS, STOP_CODES, stopReason, stopSay, placeOf, noteStop, stopTrack, NIGHT, CAP_BIG, SOLAR, shiftPlan, litSite, litRadius, nightOn, rectDist, yardDims, PIECES, TIER_PIECES, TIER_BOTS, DRY_MIN, LOW_CHARGE, ST, KIND_V, ROLE_BY_KIND, plan, yardPoints, yardRadius, toWorld, ringStats, fcWorld, simCreate, simStep, simRun, inYard, shelterHook, forTier, create, pickBots, DEFAULT_RECIPES, E_ROBOT, mulberry32, hash2, DRAIN, CHARGE, BAY_SPACING };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
root.LI_CAMP = Object.assign(root.LI_CAMP || {}, API);
})(typeof window !== 'undefined' ? window : globalThis);
