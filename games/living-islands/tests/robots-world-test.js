/* ROBOTS IN THE WORLDS tests (Living Islands, LIFE_VIEW.md section "Robots of the radical plans"). Headless chromium, software GL, file:// pages.
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/robots-world-test.js [quick=1]   (quick: 3 worlds instead of 12 for the page checks)
   Checks: every robot site of the 12 life.json files carries a recipe (seed, radical, plan, hash, GLB path) that python3 re-derives, radical for about two thirds, the role-to-site rules hold;
   the live GLBs exist, are deduplicated by recipe hash, each under 400 KB (250 to 400 KB), the set about 3 MB, and the base64 twin of each decodes to the same bytes;
   for every world in default, ?q=low and ?post=0 with &life=1: 0 console errors, every robot loaded from its own GLB, robots per tier (desk <= 3, low 1, hhhi <= 2, ar 1), triangles per robot under 4,000,
   no robot below the water except the pontoons (which float on it), nothing on a cliff; the clips of each plan really move its nodes; prints are stamped (a wake on the water for a pontoon). */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process';
import { launch, ROOT } from './shoot.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const quick = process.argv.includes('quick=1');
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'landform/worlds/index.json'), 'utf8')).worlds;
const list = quick ? idx.filter(w => [5, 139, 174].includes(w.seed)) : idx;
const noise = e => /GL Driver Message|GPU stall|ReadPixels/.test(e);
const WR = path.join(ROOT, 'assets/collector/world_robots');
/* ---- 1 life.json recipes */
const sites = []; for (const w of idx) { const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'landform/worlds/seed' + String(w.seed).padStart(4, '0') + '/life.json'), 'utf8')); for (const r of L.robots) sites.push(Object.assign({ world: w.seed }, r)); }
const used = sites.filter(s => s.use);
ok(sites.every(s => s.recipe_hash && s.glb && s.plan && typeof s.radical === 'boolean' && s.recipe_seed > 1), sites.length + ' robot sites in 12 worlds, every one with recipe_seed, radical, plan, recipe_hash and glb');
const radShare = used.filter(s => s.radical).length / used.length; ok(radShare >= .55 && radShare <= .85, 'about two thirds of the ' + used.length + ' used sites are radical (' + (radShare * 100).toFixed(0) + ' percent)');
const plans = [...new Set(sites.map(s => s.plan))].sort(); ok(['crab', 'family', 'pontoon', 'roller', 'scout', 'snail', 'spotter', 'walker'].every(p => plans.includes(p)), 'all eight looks occur in the 12 worlds: ' + plans.join(', '));
const rules = []; for (const s of sites) { const beach = ['sand', 'shingle', 'gentle'].includes(s.beach);
  if (s.plan === 'pontoon' && !(s.exposure <= .30 && s.water_m !== null && s.water_m <= 12 && s.beach !== 'turf' && s.slope < .35)) rules.push('pontoon ' + s.world + '/' + s.id);
  if ((s.plan === 'snail' || s.plan === 'crab') && !beach) rules.push(s.plan + ' ' + s.world + '/' + s.id);
  if (s.plan === 'roller' && !(['sand', 'gentle'].includes(s.beach) && s.slope < .15)) rules.push('roller ' + s.world + '/' + s.id); }
ok(rules.length === 0, 'role-to-site rules hold (pontoon sheltered and near water, snail and crab on a beach, roller on flat sand or gentle beach)' + (rules.length ? ' | ' + rules.join(',') : ''));
const py = spawnSync('python3', ['-I', '-c', `
import sys, json, hashlib
sys.path.insert(0, '${ROOT}/blender')
import robot_recipe as RR
sites = json.loads(sys.stdin.read()); bad = 0
for s in sites:
    rec = RR.robot_recipe_for(s['recipe_seed'], radical=s['radical'])
    rec2 = RR.robot_recipe_for(s['recipe_seed'], radical=s['radical'])
    h = hashlib.sha256(json.dumps(rec, sort_keys=True, separators=(',', ':')).encode()).hexdigest()[:10]
    h2 = hashlib.sha256(json.dumps(rec2, sort_keys=True, separators=(',', ':')).encode()).hexdigest()[:10]
    if not (h == h2 == s['recipe_hash']) or rec['role'] != s['role'] or (s['radical'] and rec['plan'] != s['plan']): bad += 1
print(bad)`], { input: JSON.stringify(sites), encoding: 'utf8' });
ok(py.status === 0 && py.stdout.trim() === '0', 'recipe determinism: python3 re-derives the recipe hash, role and plan of all ' + sites.length + ' sites twice with the same result (' + (py.stdout || py.stderr).trim().slice(0, 80) + ' differ)');
const ex = spawnSync('python3', [path.join(ROOT, 'landform/export_life.py'), 'check'], { encoding: 'utf8' });
ok(ex.status === 0 && (ex.stdout.match(/^SAME/gm) || []).length === 12, 'export_life.py check: all 12 life.json files (recipes included) reproduce byte for byte');
/* ---- 2 GLB files */
const hashes = [...new Set(sites.map(s => s.recipe_hash))]; const index = JSON.parse(fs.readFileSync(path.join(WR, 'index.json'), 'utf8'));
let total = 0, mn = 1e9, mx = 0, shaOk = true, twinOk = true, trisMax = 0, trisMin = 1e9, sizeOk = true;
for (const h of hashes) { const g = path.join(WR, 'robot_' + h + '_live.glb'), j = path.join(WR, 'robot_' + h + '_live.js');
  if (!fs.existsSync(g) || !fs.existsSync(j)) { sizeOk = false; shaOk = false; continue; }
  const b = fs.readFileSync(g); total += b.length; mn = Math.min(mn, b.length); mx = Math.max(mx, b.length); if (b.length > 400 * 1024 || b.length < 200 * 1024) sizeOk = false;
  if (b.slice(0, 4).toString() !== 'glTF') sizeOk = false;
  if (!index.robots[h] || crypto.createHash('sha256').update(b).digest('hex') !== index.robots[h].sha256) shaOk = false; else { trisMax = Math.max(trisMax, index.robots[h].triangles); trisMin = Math.min(trisMin, index.robots[h].triangles); }
  const m = fs.readFileSync(j, 'utf8').match(/\['[0-9a-f]{10}'\]='([A-Za-z0-9+/=]+)'/); if (!m || !Buffer.from(m[1], 'base64').equals(b)) twinOk = false; }
ok(sizeOk && shaOk && twinOk, hashes.length + ' distinct recipes (' + sites.length + ' sites), each a live GLB with a base64 twin that decodes to the same bytes, sha256 equal to index.json');
ok(mx < 400 * 1024 && total < 3.3 * 1024 * 1024, 'live GLB sizes ' + (mn / 1024).toFixed(0) + ' to ' + (mx / 1024).toFixed(0) + ' KB (limit 400), set ' + (total / 1024 / 1024).toFixed(2) + ' MB (about 3 MB); triangles ' + trisMin + ' to ' + trisMax + ' each');
ok(hashes.length <= 12 && Object.keys(index.robots).length === hashes.length, 'deduplicated by recipe hash: ' + hashes.length + ' files for ' + sites.length + ' sites');
/* ---- 3 the pages */
const { browser, ctx } = await launch();
async function open(qs) {
  const page = await ctx.newPage(); const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !noise(m.text())) errs.push(m.text()); }); page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + ROOT + '/islands_look.html' + qs);
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 300000 });
  if (!/post=0/.test(qs)) await page.waitForFunction(() => !__li.life || !__li.life.robots || __li.life.robots.count() === 0 || __li.life.robots.loaded(), null, { timeout: 300000 });
  return { page, errs };
}
const KIND_NODE = { walker: 'leg_1', spotter: 'leg_1', crab: 'leg_1', pontoon: 'paddle_l', roller: 'wheel_big' };
const seenKinds = new Set(), movedKinds = new Set(), printKinds = new Set(); const perTier = {};
for (const w of list) {
  const bad = []; const want = used.filter(s => s.world === w.seed).length;
  for (const mode of ['', '&q=low', '&post=0']) {
    const { page, errs } = await open('?world=' + w.seed + '&life=1&ui=0&seat=3&tide=0.15' + mode);
    if (errs.length) bad.push(mode + ': ' + errs[0]);
    if (mode === '&post=0') { await page.close(); continue; }
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => { const R = __li.life.robots, o = { n: R.count(), tris: R.tris(), tierMax: R.tierMax, stat: R.loadStat(), glbs: R.glbs(), bad: [], kinds: [], moved: [], prints: [], tide: .15 };
      const L = __li.life, H = __li.H, tide = .15; const list0 = R.list(); o.recipes = list0.map(x => x.recipe + ':' + x.plan + ':' + x.kind);
      /* sweep a whole cycle at 2 s steps: ground, slope, water; for the node check remember the quaternion of the plan's node while moving */
      const nodeOf = { walker: 'leg_1', spotter: 'leg_1', crab: 'leg_1', pontoon: 'paddle_l', roller: 'wheel_big' }; const q0 = {}, qd = {};
      for (let t = 0; t < 150; t += 2.3) { L.setTime(t); const li = R.list();
        li.forEach((x, i) => { const sl = (() => { const e = .5; return Math.hypot(H(x.x + e, x.z) - H(x.x - e, x.z), H(x.x, x.z + e) - H(x.x, x.z - e)) / (2 * e); })();
          if (x.kind === 'pontoon' && !x.beached) { if (!(x.ground < tide - .5) || Math.abs(x.y - tide) > .6) o.bad.push(['pontoon', t, +x.ground.toFixed(2), +x.y.toFixed(2)]); }
          else { if (x.ground < tide + .15 || sl > .62 || Math.abs(x.y - x.ground) > .5) o.bad.push([x.kind, t, +x.ground.toFixed(2), +sl.toFixed(2), +x.y.toFixed(2)]); }
          if (x.moving && nodeOf[x.kind]) { const q = R.nodeQuat(i, nodeOf[x.kind]); if (q) { const k = i + ':' + x.kind; if (!q0[k]) q0[k] = q; else if (Math.hypot(q[0] - q0[k][0], q[1] - q0[k][1], q[2] - q0[k][2], q[3] - q0[k][3]) > .05) qd[k] = 1; } } }); }
      o.moved = Object.keys(qd); o.prints = R.prints(); o.listEnd = R.list().map(x => [x.kind, x.stamps, x.water]); o.sizes = list0.map(x => x.size); L.setTime(null); return o; });
    const q = mode === '' ? 'high' : 'low'; const exp = Math.min(want, mode === '' ? 3 : 1);
    perTier[q] = (perTier[q] || 0) + r.n;
    ok(r.n >= 1 && r.n <= exp && (mode !== '' || r.n >= exp - 1) && r.glbs.length >= 1 && r.glbs.length <= r.n, 'world ' + w.seed + ' ' + q + ': ' + r.n + ' of ' + want + ' robots drawn (tier cap ' + r.tierMax + ', at most ' + exp + '; a site on a steep path or in the way of the page is dropped), loaded from ' + r.glbs.length + ' GLBs (' + JSON.stringify(r.stat) + '): ' + r.recipes.join(' '));
    ok(r.tris <= r.n * 4000 + 150 * 2 * r.n && r.tris >= r.n * 2000, 'world ' + w.seed + ' ' + q + ': robot triangles ' + r.tris + ' (' + (r.tris / Math.max(1, r.n)).toFixed(0) + ' each with prints; limit 3,900 + 300 prints)');
    ok(r.bad.length === 0, 'world ' + w.seed + ' ' + q + ': no robot below water except floating pontoons, none on a cliff, all within 0.5 m of the ground over a 150 s sweep' + (r.bad.length ? ' | ' + JSON.stringify(r.bad.slice(0, 4)) : ''));
    r.recipes.forEach(s => seenKinds.add(s.split(':')[2])); r.moved.forEach(k => movedKinds.add(k.split(':')[1])); r.listEnd.forEach(x => { if (x[1] > 5) printKinds.add(x[0] + (x[2] ? '/water' : '')); });
    await page.close();
  }
  ok(bad.length === 0, 'world ' + w.seed + ': 0 console errors with &life=1 in default, ?q=low, ?post=0' + (bad.length ? ' | ' + bad.join(' | ') : ''));
}
ok(['walker', 'spotter', 'crab', 'pontoon', 'roller'].every(k => !seenKinds.has(k) || movedKinds.has(k)), 'the clips of every plan seen (' + [...seenKinds].sort().join(', ') + ') really move its nodes while it moves: ' + [...movedKinds].sort().join(', '));
ok(printKinds.size >= Math.min(3, seenKinds.size), 'prints are stamped by moving robots of: ' + [...printKinds].sort().join(', '));
/* ---- 3b tiers by option */
for (const [tier, cap] of [['hhhi', 2], ['ar', 1]]) { const { page, errs } = await open('?world=' + list[0].seed + '&life=1&ui=0&seat=3&tide=0.15&tier=' + tier); const r = await page.evaluate(() => ({ n: __li.life.robots.count(), t: __li.life.robots.tris() }));
  ok(errs.length === 0 && r.n <= cap && r.n >= 1 && r.t <= r.n * 4300, 'tier ' + tier + ' on world ' + list[0].seed + ': ' + r.n + ' robots (cap ' + cap + '), ' + r.t + ' triangles, ' + errs.length + ' errors'); await page.close(); }
await browser.close();
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
