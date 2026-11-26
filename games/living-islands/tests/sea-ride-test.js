/* BOATS ON THE WAVE SEA (pure node): Job 7 item 3. The drivable boat's rocking reads the real wave height (sea_waves.js) when the page has the wave sea: heave follows the height within 5 cm, pitch and roll follow the slope, a gale lists the boat more than a calm day, and without a wave sea the old cosmetic swell and its tame caps are unchanged.
   Run: node games/living-islands/tests/sea-ride-test.js */
await import('../sea_waves.js'); await import('../boat_drive.js');
const S = globalThis.LI_SEA_WAVES, K = globalThis.LI_BOAT_DRIVE;
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const spec = K.specOf(K.newBoat ? K.newBoat() : { kind: 'row' });
for (const [wx, s, amp] of [['calm', 0, 0], ['squall', .8, .5], ['gale', 1, 1]]) {
  const m = S.make('ipad', wx, s, { scale: .35, minL: 2.2 }); m.level = 0; let worst = 0, maxP = 0, maxR = 0, ride = 0;
  const surf = (x, z) => S.height(x, z, 11.3, m);
  for (let i = 0; i < 200; i++) {
    const b = { x: (S.hash(i, 1) - .5) * 150, z: (S.hash(i, 2) - .5) * 150, yaw: S.hash(i, 3) * 6.28, u: 0, type: 'row' };
    const r = K.rock(b, 11.3, amp, null, surf); worst = Math.max(worst, Math.abs(r.heave - surf(b.x, b.z)));
    maxP = Math.max(maxP, Math.abs(r.pitch)); maxR = Math.max(maxR, Math.abs(r.roll)); if (r.real) ride++;
  }
  ok(worst < .05 && ride === 200, wx + ': the boat heaves with the sea height at 200 places and headings, worst ' + (worst * 100).toFixed(2) + ' cm (limit 5 cm)');
  ok(maxP <= .25 + .3 * amp + 1e-9 && maxR <= .25 + .3 * amp + 1e-9, wx + ': pitch and roll stay under the storm caps (' + maxP.toFixed(3) + ', ' + maxR.toFixed(3) + ' rad)');
  ok(true, wx + ' (Hs ' + S.hs(m.waves).toFixed(2) + ' m): largest pitch ' + (maxP * 57.3).toFixed(1) + ' degrees, roll ' + (maxR * 57.3).toFixed(1));
}
{
  const calm = S.make('ipad', 'calm', 0, { scale: .35, minL: 2.2 }), gale = S.make('ipad', 'gale', 1, { scale: .35, minL: 2.2 }); const worst = m => { let w = 0; for (let i = 0; i < 100; i++) { const b = { x: i * 1.3 - 60, z: 40 - i, yaw: i * .7, u: 0, type: 'row' }; const r = K.rock(b, 5, 1, null, (x, z) => S.height(x, z, 5, m)); w = Math.max(w, Math.abs(r.pitch), Math.abs(r.roll)); } return w; };
  ok(worst(gale) > 2 * worst(calm), 'a gale lists the boat more than twice as far as a calm day (' + worst(gale).toFixed(3) + ' vs ' + worst(calm).toFixed(3) + ' rad)');
}
{ /* pitch follows the slope: a boat heading along a long wave tilts bow up on the rising face */
  const m = S.make('ipad', 'swell', 1, { scale: .35, minL: 2.2 }), surf = (x, z) => S.height(x, z, 3, m); let agree = 0, tot = 0;
  for (let i = 0; i < 200; i++) { const b = { x: (S.hash(i, 5) - .5) * 100, z: (S.hash(i, 6) - .5) * 100, yaw: 0, u: 0, type: 'row' }, r = K.rock(b, 3, 1, null, surf), L = 2.4, sl = (surf(b.x + L / 2, b.z) - surf(b.x - L / 2, b.z)); if (Math.abs(sl) > .02) { tot++; if ((sl > 0) === (r.pitch > 0)) agree++; } }
  ok(tot > 20 && agree === tot, 'the pitch is bow up on a rising slope along the hull on every one of ' + tot + ' places');
}
{ /* the old swell is unchanged when no sea is given */
  const b = { x: 3, z: 4, yaw: 1, u: 0, type: 'row' }, a = K.rock(b, 5, .5), c = K.rock(b, 5, .5, null, null);
  ok(JSON.stringify(a) === JSON.stringify(c) && Math.abs(a.heave) <= .1 && !a.real, 'with no wave sea the old cosmetic swell and its caps (heave 0.1 m) are unchanged');
}
console.log('\n' + (fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed')); process.exit(fails ? 1 : 0);
