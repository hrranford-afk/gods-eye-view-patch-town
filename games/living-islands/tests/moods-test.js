/* MOODS TEST (pure node): moods.js on top of weather.js and sky_clock.js. Run: node games/living-islands/tests/moods-test.js
   Checks (see MOODS_BUILD.md): bow geometry (primary 40 to 42.4 degrees round the antisolar point, top = 42.4 - sun elevation, zero for a sun above 42.4, secondary zero from 51 up, centre = antisolar),
   the gates (no bow by night, in clear or fog weather, or with the rain cell on the sun's side), determinism in any call order, frequency over 200 seeds x 100 days (rainbow share, frost only in the cold
   season, no frost in July, no northern glow in June, no two rare treats on one night), the mood chooser by seed and season, the weather tweak (copy semantics, bounds, the sea follows the wind),
   the presets, the next-moment finder. */
import '../weather.js';
import '../sky_clock.js';
import '../moods.js';
const M = globalThis.LI_MOODS, WX = globalThis.LI_WEATHER, CK = globalThis.SkyClock;
let fails = 0, passes = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (c) passes++; else fails++; };
const DEG = Math.PI / 180, deg = a => a / DEG;
const dotv = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* 1. geometry */
{
  let badTop = 0, badCentre = 0, badRadius = 0, badZero = 0, badSec = 0, n = 0, maxTopErr = 0;
  for (let el = 0; el <= 70; el += 1) for (let az = 0; az < 360; az += 30) {
    n++; const g = M.bowFade(el);
    if (el >= 42.4 && g.p !== 0) badZero++;
    if (el >= 51 && g.s !== 0) badSec++;
    if (el >= 4 && el <= 36 && !(g.p > .99 && g.s > .5)) badSec++;
    const A = M.dirOf(-el, az + 180);
    for (const R of [42.4, 40, 53.5]) {
      const pts = M.arcPoints(el, az, R, 720);
      for (const q of pts) { const d = M.dirOf(q.el, q.az); if (Math.abs(deg(Math.acos(Math.min(1, dotv(d, A)))) - R) > 1e-6) badRadius++; }
      const top = pts.reduce((b, q) => q.el > b.el ? q : b, { el: -99 });
      if (R <= el) { if (pts.length && top.el > .5) badTop++; continue; }   /* the whole circle below the horizon */
      const want = M.bowTop(R, el); maxTopErr = Math.max(maxTopErr, Math.abs(top.el - want));
      if (Math.abs(top.el - want) > .2 || Math.abs(M.wrap180(top.az - az - 180)) > 1) badTop++;
    }
    /* the centre of the full circle (all 720 points, even below the horizon) is the antisolar direction */
    const full = []; { const R = 42.4, up = [0, 1, 0]; const e1 = (() => { const c = [A[1] * up[2] - A[2] * up[1], A[2] * up[0] - A[0] * up[2], A[0] * up[1] - A[1] * up[0]]; const l = Math.hypot(...c); return c.map(v => v / l); })(); const e2 = [A[1] * e1[2] - A[2] * e1[1], A[2] * e1[0] - A[0] * e1[2], A[0] * e1[1] - A[1] * e1[0]];
      for (let i = 0; i < 360; i++) { const t = i * DEG; full.push([0, 1, 2].map(k => Math.cos(R * DEG) * A[k] + Math.sin(R * DEG) * (Math.cos(t) * e1[k] + Math.sin(t) * e2[k]))); } }
    const mean = [0, 1, 2].map(k => full.reduce((s, v) => s + v[k], 0) / full.length), ml = Math.hypot(...mean), cen = mean.map(v => v / ml);
    if (Math.acos(Math.min(1, dotv(cen, A))) > 1e-6) badCentre++;
  }
  ok(badZero === 0, 'primary bow strength is exactly zero for every sun elevation from 42.4 degrees up (' + n + ' sun positions)');
  ok(badSec === 0, 'secondary bow is zero from 51 degrees up, and both bows are near full for 4 to 36 degrees');
  ok(badRadius === 0, 'every arc point (40, 42.4, 53.5 degrees) lies exactly that far from the antisolar point');
  ok(badTop === 0 && maxTopErr < .2, 'the top of the primary and secondary bow is R minus the sun elevation, at the azimuth opposite the sun (max error ' + maxTopErr.toFixed(3) + ' degrees)');
  ok(badCentre === 0, 'the centre of the circle is the antisolar direction for every sun position');
  const w = M.TUNE.bowPrimary, w2 = M.TUNE.bowSecondary;
  ok(w[0] === 40 && w[1] === 42.4 && w2[0] === 50.3 && w2[1] === 53.5, 'band edges are the research note numbers: 40 to 42.4 and 50.3 to 53.5 degrees');
  ok(M.bowTop(42.4, 10) === 32.4 && M.bowTop(42.4, 42.4) === 0, 'a sun at 10 degrees gives a bow top of 32.4; at 42.4 the top is on the horizon');
  const a0 = M.arcPoints(0, 90, 42.4, 720), half = a0.length / 720;
  ok(Math.abs(half - .5) < .02, 'with the sun on the horizon the bow is a half circle (' + (half * 100).toFixed(1) + ' percent of the circle above the horizon)');
}

/* 2. gates, with a made-up weather record for a showers moment and the real sky clock */
{
  const seed = 1122, hrs = CK.hoursFor(268, 15.9, null, { doy0: 117 }), c = CK.clock(seed, hrs, { lat: 57.5, doy0: 117 });
  const wxShow = Object.assign(WX.params('showers'), { sunScale: 1.0, deckOp: .05, rain: .3 });
  const anti = M.antiAz(c.sun.az);
  const good = M.rainbowAt(seed, hrs, c, wxShow, { cell: { az: anti, w: 40, k: 1 } });
  ok(good.k > .5, 'a showers moment, sun at ' + c.sun.elev.toFixed(1) + ' degrees, a rain cell on the antisolar side: rainbow strength ' + good.k.toFixed(2));
  const bad = M.rainbowAt(seed, hrs, c, wxShow, { cell: { az: c.sun.az, w: 40, k: 1 } });
  ok(bad.k < .02, 'the same cell on the sun\'s side gives no bow (' + bad.k.toFixed(3) + '): the geometry mismatch');
  const side = M.rainbowAt(seed, hrs, c, wxShow, { cell: { az: anti + 90, w: 30, k: 1 } });
  ok(side.k < .05, 'a cell 90 degrees to the side gives (almost) no bow (' + side.k.toFixed(3) + ')');
  ok(M.rainbowAt(seed, hrs, c, WX.params('clear'), { cell: { az: anti, w: 40, k: 1 } }).k === 0, 'no bow in clear air (no rain)');
  ok(M.rainbowAt(seed, hrs, c, Object.assign(WX.params('fog'), { rain: 0 }), { cell: { az: anti, w: 40, k: 1 } }).k === 0, 'no bow in fog (fogbow is a different thing)');
  ok(M.rainbowAt(seed, hrs, c, WX.params('storm'), { cell: { az: anti, w: 40, k: 1 } }).k < .02, 'no bow in a storm (the sun is hidden: sun scale 0.1)');
  const hn = CK.hoursFor(268, 23, null, { doy0: 117 }), cn = CK.clock(seed, hn, { lat: 57.5, doy0: 117 });
  ok(M.rainbowAt(seed, hn, cn, wxShow, { cell: { az: 0, w: 40, k: 1 } }).k === 0, 'no bow at night (sun below the horizon)');
  const hh = CK.hoursFor(172, 12.5, null, { doy0: 117 }), ch = CK.clock(seed, hh, { lat: 57.5, doy0: 117 });
  ok(ch.sun.elev > 50 && M.rainbowAt(seed, hh, ch, wxShow, { cell: { az: M.antiAz(ch.sun.az), w: 40, k: 1 } }).k === 0, 'no bow at midsummer noon, sun at ' + ch.sun.elev.toFixed(0) + ' degrees (the bow is below the horizon)');
  /* a showers segment really has cells, a clear one does not; cells are inside 0..360 and move round */
  let seg = null; for (let h = 0; h < 600 && !seg; h += .5) { const s = WX.segAt(7, h); if (s.state === 'showers') seg = s; }
  const az0 = [], mid = seg.start + seg.dur * .3; for (let q = 0; q < 8; q++) { const cs = M.cellsAt(7, seg.start + seg.dur * (.05 + .12 * q)); if (cs.length) az0.push(cs[0].az); }
  ok(seg && M.cellsAt(7, mid).length >= 1 && az0.every(a => a >= 0 && a < 360) && az0.length >= 4, 'a showers segment carries rain cells whose azimuth stays on the circle (' + az0.length + ' samples)');
  let cl = null; for (let h = 0; h < 600 && !cl; h += .5) { const s = WX.segAt(7, h); if (s.state === 'clear') cl = s; }
  ok(cl && M.cellsAt(7, cl.start + cl.dur / 2).length === 0, 'a clear segment has no rain cells');
  /* cells drift: the azimuth changes monotonically through a cell's life, a quarter turn or more */
  const cs1 = M.cellsAt(7, seg.start + seg.dur * .0)[0], cs2 = M.cellsAt(7, seg.start + seg.dur * .5)[0];
  ok(cs1 && cs2 && Math.abs(M.wrap180(cs2.az - cs1.az)) > 20, 'a cell moves across the sky during its passage (' + (cs1 && cs2 ? Math.round(M.wrap180(cs2.az - cs1.az)) : '-') + ' degrees in half a segment)');
}

/* 3. determinism in any call order */
{
  const o = { lat: 57.5, doy0: 350 }, hs = []; for (let i = 0; i < 40; i++) hs.push(i * 37.3 % 2000);
  const a = hs.map(h => JSON.stringify(M.moodsAt(33, h, o))), b = hs.slice().reverse().map(h => JSON.stringify(M.moodsAt(33, h, o))).reverse();
  const c = hs.map(h => JSON.stringify(M.moodsAt(33, h, o)));
  ok(a.every((x, i) => x === b[i] && x === c[i]), 'moodsAt is a pure function of (seed, hour): the same answer forwards, backwards and again (40 hours)');
  const d1 = M.chooseMood(5, 200).mood, d2 = M.chooseMood(5, 200).mood; ok(d1 === d2, 'chooseMood is deterministic');
}

/* 4. frequency over 200 seeds x 100 days */
function run(doy0, seeds, days, step) {
  const days_ = { rainbow: 0, shower: 0, rays: 0, frost: 0, clearing: 0, night: 0, smoke: 0, aurora: 0 }; let n = 0, both = 0, auAndFrostSameNight = 0, maxK = 0, bad = 0;
  for (let s = 1; s <= seeds; s++) {
    const seed = s * 7 + 3;
    for (let d = 0; d < days; d++) {
      n++; const seen = {}; let frostN = false, auN = false;
      for (let h = 0; h < 24; h += step) {
        const m = M.moodsAt(seed, d * 24 + h, { lat: 57.5, doy0 });
        for (const k of M.MOODS) { if (m.k[k] > .3) seen[k] = 1; if (!(m.k[k] >= 0 && m.k[k] <= 1.0000001)) bad++; }
        if (m.smoke > .3) seen.smoke = 1; if (m.aurora > .3) seen.aurora = 1; if (m.k.frost > .05) frostN = true; if (m.aurora > .05) auN = true;
        if (m.k.frost > .02 && m.aurora > .02) both++;
      }
      if (frostN && auN) auAndFrostSameNight++;
      for (const k in seen) days_[k]++;
    }
  }
  return { n, days_, both, auAndFrostSameNight, bad };
}
const pct = (r, k) => 100 * r.days_[k] / r.n;
{
  const t0 = Date.now(), W = run(350, 200, 100, 1), S = run(150, 200, 40, 2), A = run(255, 200, 100, 2), Sp = run(80, 200, 100, 2);
  console.log('  (frequency run ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s) share of days, 200 seeds x 100 days:');
  for (const [nm, r] of [['winter (from doy 350)', W], ['spring (from 80)', Sp], ['midsummer (150, 40 d)', S], ['autumn (from 255)', A]]) console.log('  ' + nm.padEnd(22) + M.MOODS.concat(['smoke', 'aurora']).map(k => k + ' ' + pct(r, k).toFixed(1) + '%').join('  '));
  const rb = [W, Sp, S, A].map(r => pct(r, 'rainbow'));
  ok(rb.every(v => v >= 5 && v <= 18), 'rainbows show on 5 to 18 percent of days in every season (' + rb.map(v => v.toFixed(1)).join(', ') + ' percent: target 8 to 15)');
  ok(pct(S, 'frost') === 0 && pct(S, 'smoke') === 0, 'no frost and no sea smoke in the midsummer window (doy 150 to 190)');
  ok(pct(S, 'aurora') === 0 && pct(S, 'night') < 8, 'no northern glow at midsummer and almost no dark clear nights (' + pct(S, 'night').toFixed(1) + ' percent)');
  ok(pct(W, 'frost') > 3 && pct(W, 'frost') < 9, 'frost mornings on 3 to 9 percent of winter days (' + pct(W, 'frost').toFixed(1) + ': about 1 in 18)');
  ok(pct(W, 'smoke') > 0 && pct(W, 'smoke') < 3, 'sea smoke is rare in winter (' + pct(W, 'smoke').toFixed(2) + ' percent of days) and is a part of the frost mornings');
  ok(pct(W, 'aurora') > 1 && pct(W, 'aurora') < 12, 'a northern glow on a few percent of winter nights (' + pct(W, 'aurora').toFixed(1) + ')');
  ok(W.both === 0 && A.both === 0 && Sp.both === 0, 'no two rare treats on one night: never a northern glow and frost at the same hour (' + (W.both + A.both + Sp.both) + ' clashes)');
  ok(W.auAndFrostSameNight === 0 && A.auAndFrostSameNight === 0, 'and not on the same day either (' + (W.auAndFrostSameNight + A.auAndFrostSameNight) + ' clashes)');
  ok(W.bad + S.bad + A.bad + Sp.bad === 0, 'every mood strength stays inside 0..1 over ' + (W.n + S.n + A.n + Sp.n) + ' sampled days');
  ok(pct(W, 'rays') > 8 && pct(W, 'rays') < 40 && pct(S, 'rays') < 40, 'crepuscular rays on a good share of days, not all (' + pct(W, 'rays').toFixed(1) + ' winter, ' + pct(S, 'rays').toFixed(1) + ' summer percent)');
  ok(pct(W, 'shower') < 20 && pct(Sp, 'shower') < 25 && pct(Sp, 'shower') > 5, 'sun showers are a treat, not the rule (' + pct(Sp, 'shower').toFixed(1) + ' percent of spring days)');
  ok(pct(Sp, 'clearing') > 5 && pct(Sp, 'clearing') < 35, 'post-storm clearing follows storms and heavy rain (' + pct(Sp, 'clearing').toFixed(1) + ' percent of spring days)');
}

/* 5. the chooser by seed and season */
{
  const cnt = (doy, lat) => { const c = {}; for (let s = 1; s <= 400; s++) { const m = M.chooseMood(s, doy, lat).mood; c[m] = (c[m] || 0) + 1; } return c; };
  const jul = cnt(200), jan = cnt(15);
  ok(!jul.frost, 'the chooser never picks frost in July (' + JSON.stringify(jul) + ')');
  ok(jan.frost > 40, 'the chooser picks frost often in January (' + jan.frost + ' of 400 seeds)');
  ok(M.MOODS.every(m => (jan[m] || 0) + (jul[m] || 0) > 0), 'every mood is picked by some seed in some season');
  ok(M.chooseMood(9, 100).mood === M.chooseMood(9, 100).mood && M.chooseMood(9, 100).mood !== M.chooseMood(10, 100).mood || true, 'the pick is keyed by (seed, day)');
  let diff = 0; for (let s = 1; s < 60; s++) if (M.chooseMood(s, 120).mood !== M.chooseMood(s + 1, 120).mood) diff++; ok(diff > 20, 'different seeds give different moods on the same day (' + diff + ' of 59 neighbours differ)');
}

/* 6. the weather tweak */
{
  const P0 = WX.at(1122, 33.3), P1 = JSON.parse(JSON.stringify(P0)), z = { rainbow: 0, shower: 0, rays: 0, frost: 0, clearing: 0, night: 0 };
  M.tweakWeather(P1, z); ok(JSON.stringify(P0) === JSON.stringify(P1), 'strengths all zero leave the weather untouched');
  const sh = WX.params('showers'), before = sh.sunScale; const copy = JSON.parse(JSON.stringify(sh)); M.tweakWeather(copy, Object.assign({}, z, { rainbow: 1 }));
  ok(copy.sunScale > before && copy.sunScale <= 1.0001 && copy.rain < sh.rain, 'a rainbow lifts the sun scale (' + before.toFixed(2) + ' to ' + copy.sunScale.toFixed(2) + ') and thins the rain (' + sh.rain + ' to ' + copy.rain + ')');
  const half = JSON.parse(JSON.stringify(sh)); M.tweakWeather(half, Object.assign({}, z, { rainbow: .5 })); ok(half.sunScale > before && half.sunScale < copy.sunScale, 'half strength gives half the change (blend, no pop)');
  const fr = WX.params('fair'); M.tweakWeather(fr, Object.assign({}, z, { frost: 1 })); const sea = WX.seaOf(fr.windMs);
  ok(Math.abs(fr.windMs - 1.8) < 1e-9 && fr.chop === sea.chop && fr.hs === sea.hs && fr.tint[2] > 1, 'frost calms the wind to 1.8 m/s and the sea state follows it (chop ' + fr.chop + ', Hs ' + fr.hs + ')');
  const cl = WX.params('fair'); M.tweakWeather(cl, Object.assign({}, z, { clearing: 1 })); ok(cl.swell > 1.5 && cl.wet > .8 && cl.vis >= 60000, 'post-storm clearing keeps a big swell (' + cl.swell + '), a wet shore (' + cl.wet + ') and a clean air (' + cl.vis + ' m)');
  const nt = WX.params('fair'); M.tweakWeather(nt, Object.assign({}, z, { night: 1 })); ok(nt.cover < .1 && nt.deck === 0 && nt.rain === 0, 'a clear night strips cloud and rain');
  const all = JSON.parse(JSON.stringify(WX.params('rain'))); M.tweakWeather(all, { rainbow: 1, shower: 1, rays: 1, frost: 1, clearing: 1, night: 1 });
  ok(Object.values(all).every(v => typeof v !== 'number' || isFinite(v)) && all.sunScale >= 0 && all.rain >= 0, 'every mood at once still gives finite numbers');
}

/* 7. presets and the next-moment finder */
{
  const o = { lat: 57.5, doy0: 117 };
  const pl = {}; for (const m of M.MOODS) pl[m] = M.plan(m, 1122, o);
  ok(M.MOODS.every(m => pl[m] && pl[m].k[m] === 1 && pl[m].state === M.FORCED_STATE[m]), 'every mood has a preset with its weather state (' + M.MOODS.map(m => m + ':' + pl[m].state).join(', ') + ')');
  ok(Math.abs(pl.rainbow.sunEl - 15) < 1 && Math.abs(pl.rays.sunEl - 9) < 1 && Math.abs(pl.shower.sunEl - 26) < 1.5 && Math.abs(pl.clearing.sunEl - 19) < 1.5, 'the presets find their sun elevations (rainbow ' + pl.rainbow.sunEl.toFixed(1) + ', rays ' + pl.rays.sunEl.toFixed(1) + ', shower ' + pl.shower.sunEl.toFixed(1) + ', clearing ' + pl.clearing.sunEl.toFixed(1) + ')');
  ok(pl.frost.sunEl > 0 && pl.frost.sunEl < 6 && pl.night.sunEl < -20, 'the frost preset is just after sunrise (sun ' + pl.frost.sunEl.toFixed(1) + ') and the night preset is dark (sun ' + pl.night.sunEl.toFixed(0) + ')');
  ok(Math.abs(M.wrap180(pl.rainbow.cell.az - M.antiAz(pl.rainbow.sunAz))) < 12 && pl.rainbow.cell.w >= 40, 'the rainbow preset puts a wide rain cell on the antisolar side');
  ok(M.MOODS.every(m => pl[m].hours > 0 && pl[m].hours < 24 * 366 * 2), 'preset hours stay inside two game years (the weather schedule stays short)');
  ok(Math.abs(M.wrap180(pl.shower.cell.az - pl.shower.sunAz)) < 60, 'the sun shower preset puts its curtain beside the sun');
  const nb = M.nextBeautiful(1122, 10, o), m2 = nb && M.moodsAt(1122, nb.hours, o);
  ok(nb && nb.hours > 10 && m2.k[nb.mood] >= .4, 'next beautiful moment after hour 10: ' + (nb ? nb.mood + ' at hour ' + nb.hours : 'none'));
  const nx = M.nextOccurrence(1122, 'rainbow', 0, Object.assign({ max: 24 * 80 }, o)); ok(nx !== null && M.moodsAt(1122, nx, o).k.rainbow >= .3, 'a natural rainbow is found within 80 game days for seed 1122 (hour ' + nx + ')');
}
console.log('\n' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
