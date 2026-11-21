#!/usr/bin/env node
/* C02 check: a city_evolution sidecar must (1) match its recipe by id, version and SHA-256, (2) use only known keys, (3) patch only whitelisted paths that exist and are numbers,
   (4) keep gameplay and cosmetic branches separate, (5) produce a recipe that STILL passes the real v1 validator, (6) give the same result twice (deterministic), (7) never touch parts[].stage.
   It also runs the existing simulation for 5 minutes (seed 1) on the base recipe and on each branch, so the cost and the drawback show as numbers.
   usage: node sidecar-check.mjs <recipe.json> <sidecar.json> [more sidecars...]   Exit 0 only if everything passes. Never changes any file. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const V = require('../../validate.js'), SIM = require('../../sim.js'), WL = require('../../whitelist.js');
const [recipePath, ...sidecars] = process.argv.slice(2);
const rbuf = fs.readFileSync(recipePath), rsha = crypto.createHash('sha256').update(rbuf).digest('hex'), base = JSON.parse(rbuf.toString('utf8'));
const OPS = ['mul', 'add', 'set'];
const PATH_OK = [/^systems\.production\.batch_seconds$/, /^systems\.power\.demand_kw$/, /^systems\.storage\.[a-z_]+$/, /^systems\.effects\.spoil\[\d+\]\.items\.[a-z_]+$/,
  /^systems\.effects\.demand\[\d+\]\.loss$/, /^systems\.repair\.seconds$/, /^systems\.repair\.seconds_by_tag\.[a-z_]+$/, /^systems\.sales\.(price|demand_per_minute)$/,
  /^systems\.costs\.(power_per_kwh|wage_per_worker_per_minute|repair_material_price)$/];
const TOP = ['schema', 'version', 'id', 'recipe', 'context', 'branches'], BR = ['id', 'name', 'kind', 'requires', 'cost', 'drawback', 'effects', 'cosmetic', 'pairs_with'];
let fails = 0; const F = (m) => { fails++; console.log('  FAIL ' + m); };
const clone = (o) => JSON.parse(JSON.stringify(o));
function tokens(p) { return p.replace(/\[(\d+)\]/g, '.$1').split('.'); }
function getRef(obj, p) { const t = tokens(p); let o = obj; for (let i = 0; i < t.length - 1; i++) { o = o && o[t[i]]; if (o === undefined || o === null) return null; } return { o, k: t[t.length - 1] }; }
function apply(recipe, branches) {
  const R = clone(recipe), seen = {};
  [...branches].sort((a, b) => a.id < b.id ? -1 : 1).forEach((b) => {
    (b.effects || []).forEach((e) => {
      const r = getRef(R, e.path); if (!r || typeof r.o[r.k] !== 'number') throw new Error(b.id + ': ' + e.path + ' is not a number in the recipe');
      if (e.op === 'set') { if (seen[e.path]) throw new Error('two branches both set ' + e.path); seen[e.path] = 1; }
      r.o[r.k] = e.op === 'mul' ? r.o[r.k] * e.value : e.op === 'add' ? r.o[r.k] + e.value : e.value;
      r.o[r.k] = Math.round(r.o[r.k] * 1e6) / 1e6;
    });
    (b.cosmetic || []).forEach((c) => { const p = R.parts.find((x) => x.id === c.part); if (!p) throw new Error(b.id + ': no part ' + c.part); p.material = c.material; });
  });
  return R;
}
function sim(R) { const S = SIM.create(R, { seed: 1 }); SIM.run(R, S, 300); const s = SIM.summary(R, S); return { made: s.produced, sold: s.sold, spoiled: Math.round((s.spoiled && typeof s.spoiled === 'number' ? s.spoiled : 0) * 10) / 10, inc: s.income_per_min.toFixed(1), cost: s.cost_per_min.toFixed(1), net: s.net_per_min.toFixed(1) }; }
const b0 = sim(base);
console.log('base ' + base.id + ' (' + rsha.slice(0, 12) + '): made ' + b0.made + ', sold ' + b0.sold + ', income/min ' + b0.inc + ', cost/min ' + b0.cost + ', net/min ' + b0.net);
for (const sp of sidecars) {
  console.log('\n' + sp);
  const sc = JSON.parse(fs.readFileSync(sp, 'utf8'));
  Object.keys(sc).forEach((k) => { if (!TOP.includes(k)) F('unknown top-level key ' + k); });
  if (sc.schema !== 'city_evolution' || sc.version !== 0) F('schema must be city_evolution version 0');
  if (!sc.recipe || sc.recipe.id !== base.id || sc.recipe.version !== base.version || sc.recipe.sha256 !== rsha) F('recipe link (id, version, sha256) does not match ' + recipePath);
  (sc.branches || []).forEach((b) => {
    Object.keys(b).forEach((k) => { if (!BR.includes(k)) F(b.id + ': unknown key ' + k); });
    if (b.kind === 'gameplay' && b.cosmetic) F(b.id + ': a gameplay branch may not carry cosmetic changes');
    if (b.kind === 'cosmetic' && b.effects) F(b.id + ': a cosmetic branch may not carry gameplay effects');
    if (b.kind !== 'gameplay' && b.kind !== 'cosmetic') F(b.id + ': kind must be gameplay or cosmetic');
    (b.effects || []).forEach((e) => { if (!OPS.includes(e.op)) F(b.id + ': op ' + e.op); if (!PATH_OK.some((re) => re.test(e.path))) F(b.id + ': path not allowed ' + e.path); if (!Number.isFinite(e.value)) F(b.id + ': value'); if (/stage/.test(e.path)) F(b.id + ': may not touch stage'); });
    (b.cosmetic || []).forEach((c) => { if (!WL.MATERIALS || !(WL.MATERIALS.includes ? WL.MATERIALS.includes(c.material) : c.material in WL.MATERIALS)) F(b.id + ': material not in whitelist ' + c.material); });
    if (!(b.cost && Number.isFinite(b.cost.coins))) F(b.id + ': needs a cost');
    if (b.kind === 'gameplay' && !(typeof b.drawback === 'string' && b.drawback.length > 10)) F(b.id + ': a gameplay branch needs a stated drawback');
  });
  let R1, R2;
  try { R1 = apply(base, sc.branches || []); R2 = apply(base, sc.branches || []); } catch (e) { F('apply: ' + e.message); continue; }
  if (JSON.stringify(R1) !== JSON.stringify(R2)) F('not deterministic');
  const v = V.validate(R1); if (!v.ok) F('patched recipe fails the v1 validator: ' + v.errors.slice(0, 3).join('; '));
  if (JSON.stringify(R1.parts.map((p) => p.stage)) !== JSON.stringify(base.parts.map((p) => p.stage))) F('stage values changed');
  for (const b of sc.branches || []) if (b.kind === 'gameplay') {
    const Rb = apply(base, [b]), r = sim(Rb);
    console.log('  branch ' + b.id + ' (cost ' + b.cost.coins + ' coins): made ' + r.made + ' (' + (r.made - b0.made >= 0 ? '+' : '') + (r.made - b0.made) + '), sold ' + r.sold + ', cost/min ' + r.cost + ', net/min ' + r.net + ' (base ' + b0.net + ')  | drawback: ' + b.drawback);
  }
  console.log(fails ? '  => FAIL' : '  => PASS: links to the recipe, v1 untouched, patched recipe validates, deterministic');
}
console.log('\n' + (fails ? fails + ' failure(s)' : 'all sidecars pass'));
process.exit(fails ? 1 : 0);
