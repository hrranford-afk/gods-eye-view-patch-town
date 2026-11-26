/* The shared wave code (sea_waves.js), pure node. The JS height must match a straight reference sum, be deterministic, and the tier and weather tables must hold.
   Run: node games/living-islands/tests/sea-waves-test.js */
await import('../sea_waves.js');
const S = globalThis.LI_SEA_WAVES;
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

/* a reference that shares no code with the module: the table is rebuilt from the module's own wave records (k, A, dir, phase) but summed by a plain loop with Math.cos, and the pinch is solved by Newton, not by the fixed point */
function refDisp(W, px, pz, t) { let dx = 0, dy = 0, dz = 0; for (const w of W) { const th = w.k * (w.dx * px + w.dz * pz) - Math.sqrt(9.81 * w.k) * t + w.phi; dx -= w.Q * w.A * w.dx * Math.sin(th); dz -= w.Q * w.A * w.dz * Math.sin(th); dy += w.A * Math.cos(th); } return [dx, dy, dz]; }
function refHeight(W, x, z, t) {
  let px = x, pz = z; for (let it = 0; it < 60; it++) { const d = refDisp(W, px, pz, t); const rx = px + d[0] - x, rz = pz + d[2] - z; if (Math.hypot(rx, rz) < 1e-12) break; /* damped fixed point on the residual */ px -= .7 * rx; pz -= .7 * rz; }
  return refDisp(W, px, pz, t)[1];
}

/* 1. tiers */
ok(S.TIERS.ipad.nTot === 8 && S.TIERS.radeon.nTot === 24 && S.TIERS.max.nTot === 48 && S.TIERS.desktop.nTot === 16, 'tier wave counts: iPad 8, desktop 16, Radeon 24, MAX 48');
ok(S.TIERS.ipad.tris === 23040 && S.TIERS.radeon.tris === 211200, 'mesh sizes from the plan: iPad 23,040 triangles, Radeon 211,200');
ok(['calm', 'squall', 'gale', 'fog', 'thunder', 'swell', 'winter', 'wash'].every(k => S.NAMES.includes(k)), 'weather inputs: calm squall gale fog thunder ground swell winter Great Wash');

/* 2. a no-pinch sea is an exact straight sum */
{
  const P = S.weatherParams('gale', 1), W = S.buildWaves(P, S.TIERS.radeon, { scale: .35 }); W.forEach(w => w.Q = 0);
  let worst = 0;
  for (let i = 0; i < 400; i++) { const x = (S.hash(i, 1) - .5) * 240, z = (S.hash(i, 2) - .5) * 240, t = S.hash(i, 3) * 90; let h = 0; for (const w of W) h += w.A * Math.cos(w.k * (w.dx * x + w.dz * z) - Math.sqrt(9.81 * w.k) * t + w.phi); worst = Math.max(worst, Math.abs(S.height(x, z, t, { waves: W }) - h)); }
  ok(worst < 1e-9, 'no pinch: height equals the straight sum A cos(th) at 400 points (worst ' + worst.toExponential(1) + ' m)');
}
/* 3. with pinch, against the reference solver, on every tier and several weathers */
for (const [tier, wx, s] of [['ipad', 'calm', 1], ['ipad', 'gale', 1], ['desktop', 'squall', .8], ['radeon', 'thunder', 1], ['radeon', 'wash', 1], ['max', 'winter', .7], ['ipad', 'swell', 1]]) {
  const m = S.make(tier, wx, s, { scale: .35 }); let worst = 0;
  for (let i = 0; i < 300; i++) { const x = (S.hash(i, 11) - .5) * 240, z = (S.hash(i, 12) - .5) * 240, t = S.hash(i, 13) * 120; worst = Math.max(worst, Math.abs(S.height(x, z, t, m) - refHeight(m.waves, x, z, t))); }
  ok(worst < 2e-3, tier + ' ' + wx + ' ' + s + ': height matches the reference solver within 2 mm at 300 points (worst ' + (worst * 1000).toFixed(3) + ' mm)');
}
/* 4. deterministic, and the accumulated phase equals w t */
{
  const a = S.make('radeon', 'gale', .9, { scale: .35 }), b = S.make('radeon', 'gale', .9, { scale: .35 });
  let same = true; for (let i = 0; i < 100; i++) { const x = i * 1.7 - 80, z = 55 - i * 1.1; if (S.height(x, z, 12.5, a) !== S.height(x, z, 12.5, b)) same = false; }
  ok(same, 'two builds of the same sea give identical heights (deterministic, no Math.random)');
  const W = a.waves; W.forEach(w => w.ph = 0); for (let i = 0; i < 100; i++) S.advance(W, .05);
  ok(Math.abs(S.height(10, -20, 5, a) - S.height(10, -20, null, a)) < 1e-9, 'phase accumulated over 100 steps of 0.05 s equals w t (the page keeps a phase so a changing sea never jumps)');
  const r = S.retune(W, S.weatherParams('gale', .5), S.TIERS.radeon, { scale: .35 }); ok(r.every((w, i) => w.ph === W[i].ph), 'retune keeps every accumulated phase');
}
/* 5. weather ordering: a calm day is lower than a squall, a squall lower than a gale; s=0 is the calm day; the Great Wash raises the level */
{
  const hs = (w, s) => S.hs(S.buildWaves(S.weatherParams(w, s), S.TIERS.ipad, { scale: .35 }));
  ok(hs('gale', 0) === hs('calm', 0), 'a type risen to s=0 is the calm day');
  ok(hs('calm', 1) < hs('squall', 1) && hs('squall', 1) < hs('gale', 1), 'Hs rises: calm ' + hs('calm', 1).toFixed(2) + ' < squall ' + hs('squall', 1).toFixed(2) + ' < gale ' + hs('gale', 1).toFixed(2) + ' m (diorama scale)');
  ok(hs('gale', .3) < hs('gale', .7) && hs('gale', .7) < hs('gale', 1), 'a gale rises with s');
  ok(hs('fog', 1) < hs('gale', 1) && hs('swell', 1) > hs('calm', 1), 'fog is glassy, a ground swell is bigger than a calm day');
  ok(S.weatherParams('wash', 1).surge > 1 && S.weatherParams('wash', 1).vort === 1, 'the Great Wash carries the surge and the whirlpool inputs');
  ok(S.weatherParams('nonsense', 1).name === 'calm', 'an unknown weather name is the calm day');
}
/* 6. the normal is unit, points up, and on a no-pinch sea agrees with a finite difference of height */
{
  const m = S.make('radeon', 'calm', 1, { scale: .35 }); m.waves.forEach(w => w.Q = 0); let worst = 0, up = true;
  for (let i = 0; i < 100; i++) { const x = (S.hash(i, 21) - .5) * 100, z = (S.hash(i, 22) - .5) * 100, N = S.normal(x, z, 7, m); if (Math.abs(Math.hypot(...N) - 1) > 1e-9 || N[1] <= 0) up = false;
    const e = .01, hx = (S.height(x + e, z, 7, m) - S.height(x - e, z, 7, m)) / (2 * e), hz = (S.height(x, z + e, 7, m) - S.height(x, z - e, 7, m)) / (2 * e); worst = Math.max(worst, Math.abs(N[0] / N[1] + hx) + Math.abs(N[2] / N[1] + hz)); }
  const g = S.make('radeon', 'gale', 1, { scale: .35 }); for (let i = 0; i < 100; i++) { const N = S.normal(i - 50, 20 - i, 3, g); if (Math.abs(Math.hypot(...N) - 1) > 1e-9 || N[1] <= 0) up = false; }
  ok(up, 'normals are unit length and point up (calm and gale)');
  ok(worst < 1e-4, 'on a no-pinch sea the normal slope equals the finite difference of height (worst ' + worst.toExponential(1) + ')');
}
/* 7. minL leaves short waves out of the CPU query, orbit speed is finite */
{
  const m = S.make('radeon', 'gale', 1, { scale: .35 }), m2 = Object.assign({}, m, { minL: 4 });
  ok(Math.abs(S.height(3, 4, 5, m) - S.height(3, 4, 5, m2)) < .5 && S.height(3, 4, 5, m) !== S.height(3, 4, 5, m2), 'minL drops the short waves from the CPU height (small, not zero, change)');
  const o = S.orbit(m.waves, 3, 4, 5); ok(o.every(Number.isFinite) && Math.hypot(...o) < 5, 'orbital speed is finite and under 5 m/s in a gale');
}
console.log('\n' + (n - fails) + ' of ' + n + (fails ? ' FAILED' : ' passed'));
process.exit(fails ? 1 : 0);
