/**
 * Planner tools: a small set of general operations on a town model
 * (model.js) that combine to answer big questions. Each tool does one job;
 * a question is a plan of tool calls, run by `runPlan` (or `npm run planner
 * -- ask <town> <plan.json>`), where a step can use an earlier step's
 * result by name ("$gpTimes").
 *
 * TOOLS below describes every tool for people and other AIs.
 */
import { nearestFrom } from './graph.js';
import { WALK_M_PER_MIN } from './access.js';
import { busOrWalk } from './buses.js';
import { suggestSites } from './sites.js';
import { compareScenarios } from './scenarios.js';
import { HOME_ATTRIBUTES } from './model.js';

const MAX_SNAP_M = 250;
const CAP_MIN = 120;

function matchKind(kind) {
  const kinds = Array.isArray(kind) ? kind : [kind];
  return (p) => kinds.some((k) => p.kind === k || (k.endsWith(':*') && p.kind.startsWith(k.slice(0, -1))));
}

/**
 * travel: minutes from every home to the nearest place of a kind.
 * mode 'walk' (default) or 'busOrWalk' (the quicker of walking, or walking
 * to a stop + average wait + ride + walk). Returns minutes per home, aligned
 * to model.homes (capped at 120; Infinity if unreachable).
 */
export function travel(model, { to, mode = 'walk' }) {
  const targets = model.places.filter(matchKind(to));
  if (mode === 'busOrWalk') {
    if (!model.buses) throw new Error('travel: busOrWalk needs buses.json');
    const town = { ...model.town, places: targets.map((p) => ({ ...p, kind: 'target' })) };
    const { best } = busOrWalk(town, model.buses, 'target', { graph: model.graph });
    return Array.from(best, (m) => Math.min(m, CAP_MIN));
  }
  const g = model.graph;
  const sources = [];
  for (const p of targets) {
    const s = g.snap([p.lon, p.lat]);
    if (s && s.metres <= MAX_SNAP_M) sources.push(s);
  }
  const { dist } = nearestFrom(g, sources);
  return model.homes.map((h) => {
    const s = g.snap([h.lon, h.lat]);
    if (!s || s.metres > MAX_SNAP_M) return Infinity;
    return Math.min((s.metres + dist[s.node]) / WALK_M_PER_MIN, CAP_MIN);
  });
}

/** Weight of each home: households, or households × a census share. */
function weightsOf(model, weight) {
  if (weight === 'households') return model.homes.map((h) => h.w ?? 1);
  if (!HOME_ATTRIBUTES.includes(weight)) throw new Error(`Unknown weight "${weight}". Use households or one of ${HOME_ATTRIBUTES.join(', ')}`);
  return model.homes.map((h) => (h.w ?? 1) * (h[weight] ?? 0));
}

/** Group key of each home: town, area (LSOA), bank (river side) or cell (250 m grid). */
function groupsOf(model, groupBy) {
  if (groupBy === 'town') return model.homes.map(() => model.name);
  if (groupBy === 'area') return model.homes.map((h) => h.area);
  if (groupBy === 'bank') return model.homes.map((h) => model.bankOf([h.lon, h.lat]));
  if (groupBy === 'cell') {
    const dLat = 250 / 111_320;
    const dLon = 250 / (111_320 * Math.cos(((model.homes[0]?.lat ?? 52) * Math.PI) / 180));
    return model.homes.map((h) => `${Math.floor(h.lon / dLon) * dLon},${Math.floor(h.lat / dLat) * dLat}`);
  }
  throw new Error(`Unknown groupBy "${groupBy}". Use town, area, bank or cell`);
}

/**
 * summarise: turn a per-home measure into numbers per group.
 * stat 'mean' (weighted average) or 'shareWithin' (weighted share of homes
 * with value ≤ `within`). Returns { group: value } plus households per group.
 */
export function summarise(model, values, { weight = 'households', groupBy = 'town', stat = 'mean', within } = {}) {
  if (stat === 'shareWithin' && !Number.isFinite(within)) throw new Error('summarise: shareWithin needs `within`');
  const w = weightsOf(model, weight);
  const g = groupsOf(model, groupBy);
  const acc = new Map();
  values.forEach((v, i) => {
    if (!Number.isFinite(v) || w[i] <= 0 || g[i] == null) return;
    const a = acc.get(g[i]) || { sum: 0, n: 0, hh: 0 };
    a.sum += stat === 'mean' ? v * w[i] : (v <= within ? w[i] : 0);
    a.n += w[i];
    a.hh += model.homes[i].w ?? 1;
    acc.set(g[i], a);
  });
  const value = {};
  const households = {};
  for (const [k, a] of acc) {
    value[k] = Math.round((a.sum / a.n) * (stat === 'mean' ? 10 : 1000)) / (stat === 'mean' ? 10 : 1000);
    households[k] = Math.round(a.hh);
  }
  return { value, households };
}

/** count: places of a kind per group, and per 1,000 households. */
export function count(model, { kind, groupBy = 'area' }) {
  const g = groupsOf(model, groupBy);
  const hh = {};
  model.homes.forEach((h, i) => { if (g[i] != null) hh[g[i]] = (hh[g[i]] || 0) + (h.w ?? 1); });
  // A place belongs to the group of its nearest home.
  const keyOf = nearestHomeGroup(model, g);
  const n = {};
  for (const p of model.places.filter(matchKind(kind))) {
    const k = keyOf([p.lon, p.lat]);
    if (k != null) n[k] = (n[k] || 0) + 1;
  }
  const value = {};
  for (const k of Object.keys(hh)) value[k] = Math.round(((n[k] || 0) / hh[k]) * 1000 * 100) / 100;
  return { value, count: n, households: Object.fromEntries(Object.entries(hh).map(([k, v]) => [k, Math.round(v)])) };
}

function nearestHomeGroup(model, groups) {
  const cell = 0.002;
  const index = new Map();
  model.homes.forEach((h, i) => {
    const k = `${Math.floor(h.lon / cell)}:${Math.floor(h.lat / cell)}`;
    if (!index.has(k)) index.set(k, []);
    index.get(k).push(i);
  });
  return ([lon, lat]) => {
    const cx = Math.floor(lon / cell);
    const cy = Math.floor(lat / cell);
    let best = -1;
    let bestD = Infinity;
    for (let r = 0; r <= 3 && best < 0; r++) {
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
        for (const i of index.get(`${cx + dx}:${cy + dy}`) || []) {
          const d = (model.homes[i].lon - lon) ** 2 + (model.homes[i].lat - lat) ** 2;
          if (d < bestD) { bestD = d; best = i; }
        }
      }
    }
    return best < 0 ? null : groups[best];
  };
}

/** Numeric fields the areas carry (census, need, history), for `attribute`. */
export function areaFields(model) {
  const fields = new Set();
  for (const a of model.areas) for (const [k, v] of Object.entries(a)) if (typeof v === 'number') fields.add(k);
  return [...fields].sort();
}

/**
 * attribute: any numeric figure per area: census shares (need, noCar,
 * over65, deprived, badHealth), history (newHomesShare, meanBuildYear,
 * carCommute2011, carCommute2021, …), households, residents. Use `diff` to
 * get a change: { name: 'carCommute2021', minus: 'carCommute2011' }.
 */
export function attribute(model, { name, minus = null }) {
  const fields = areaFields(model);
  for (const f of [name, minus].filter(Boolean)) {
    if (!fields.includes(f)) throw new Error(`Unknown attribute "${f}". Areas have: ${fields.join(', ')}`);
  }
  const value = {};
  for (const a of model.areas) {
    if (a[name] == null || (minus && a[minus] == null)) continue;
    value[a.code] = minus ? a[name] - a[minus] : a[name];
  }
  return { value };
}

/**
 * relate: does `y` go with `x`, allowing for `controls`? Ordinary least
 * squares across the groups the inputs share. Each input is a result with
 * a `.value` map (from summarise, count or attribute). Returns, per
 * predictor, its coefficient and t value (|t| above ~2 is worth a look),
 * plus R² and the number of groups.
 */
export function relate(model, { y, x, controls = {} }) {
  const preds = { ...x, ...controls };
  const names = Object.keys(preds);
  const keys = Object.keys(y.value).filter((k) => names.every((n) => Number.isFinite(preds[n].value[k])) && Number.isFinite(y.value[k]));
  const X = keys.map((k) => [1, ...names.map((n) => preds[n].value[k])]);
  const Y = keys.map((k) => y.value[k]);
  const p = names.length + 1;
  if (keys.length <= p + 1) throw new Error(`relate: only ${keys.length} groups in common`);
  const XtX = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0)));
  const XtY = Array.from({ length: p }, (_, i) => X.reduce((s, r, k) => s + r[i] * Y[k], 0));
  const inv = invert(XtX);
  const beta = inv.map((row) => row.reduce((s, v, j) => s + v * XtY[j], 0));
  const resid = Y.map((v, k) => v - X[k].reduce((s, xv, j) => s + xv * beta[j], 0));
  const sse = resid.reduce((s, r) => s + r * r, 0);
  const mean = Y.reduce((s, v) => s + v, 0) / Y.length;
  const sst = Y.reduce((s, v) => s + (v - mean) ** 2, 0);
  const s2 = sse / (keys.length - p);
  const out = { groups: keys.length, r2: Math.round((1 - sse / sst) * 100) / 100, predictors: {} };
  names.forEach((n, i) => {
    const se = Math.sqrt(s2 * inv[i + 1][i + 1]);
    out.predictors[n] = { coefficient: Number(beta[i + 1].toPrecision(3)), t: Math.round((beta[i + 1] / se) * 10) / 10, control: n in controls };
  });
  return out;
}

function invert(m) {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[piv][c])) piv = r;
    [a[c], a[piv]] = [a[piv], a[c]];
    const d = a[c][c];
    if (Math.abs(d) < 1e-12) throw new Error('relate: predictors are too closely related to separate');
    for (let j = 0; j < 2 * n; j++) a[c][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = a[r][c];
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[c][j];
    }
  }
  return a.map((row) => row.slice(n));
}

/**
 * average: one household-weighted average across areas of a per-area
 * result (from attribute, count or summarise by area). `namePrefix` limits
 * it to areas whose name starts with it, e.g. 'Worcester ' for the city.
 */
export function average(model, { of, namePrefix = null }) {
  let s = 0;
  let n = 0;
  for (const a of model.areas) {
    const v = of.value[a.code];
    if (!Number.isFinite(v) || !a.households || (namePrefix && !a.name.startsWith(namePrefix))) continue;
    s += v * a.households;
    n += a.households;
  }
  return { value: n ? Math.round((s / n) * 10000) / 10000 : null, households: n };
}

/**
 * rank: the groups of a result, sorted (highest first by default), with
 * area names. `namePrefix` keeps only areas whose name starts with it
 * (e.g. 'Worcester ' for the city's own neighbourhoods, not edge ones).
 */
export function rank(model, { of, top = 10, ascending = false, namePrefix = null }) {
  const names = new Map(model.areas.map((a) => [a.code, a.name]));
  const rows = Object.entries(of.value)
    .filter(([k]) => !namePrefix || (names.get(k) || '').startsWith(namePrefix))
    .sort((a, b) => (ascending ? a[1] - b[1] : b[1] - a[1]))
    .slice(0, top);
  return rows.map(([group, value]) => ({ group, name: names.get(group) || group, value, households: of.households?.[group] }));
}

/** combine: weighted sum of several results' values per group (e.g. a composite index). */
export function combine(model, { parts }) {
  const keys = Object.keys(parts[0].of.value).filter((k) => parts.every((p) => Number.isFinite(p.of.value[k])));
  return { value: Object.fromEntries(keys.map((k) => [k, Math.round(parts.reduce((s, p) => s + p.weight * p.of.value[k], 0) * 100) / 100])) };
}

/** bestSites: where one more place of a kind would reach the most unserved households (or need). */
export function bestSites(model, { kind, count: n = 3, byNeed = false }) {
  const town = { ...model.town, places: model.places };
  return suggestSites(town, { kind, count: n, byNeed });
}

/** compare: score scenarios (scenarios.js shape) against the town today. */
export function compare(model, { scenarios }) {
  return compareScenarios(model.town, scenarios, { buses: model.buses || undefined });
}

export const TOOLS = Object.freeze({
  kinds: { fn: (m) => m.kinds(), about: 'Every kind of place in the model and how many.', args: {} },
  travel: { fn: travel, about: 'Minutes from every home to the nearest place of a kind.', args: { to: "kind, list of kinds, or 'food:*'", mode: "'walk' (default) or 'busOrWalk'" } },
  summarise: { fn: (m, a) => summarise(m, a.values, a), about: 'Per-home values → one number per group.', args: { values: 'a travel result ($name)', weight: "'households' (default), 'need', 'noCar', 'over65', 'deprived', 'badHealth'", groupBy: "'town' (default), 'area', 'bank', 'cell'", stat: "'mean' (default) or 'shareWithin'", within: 'minutes, for shareWithin' } },
  count: { fn: count, about: 'Places of a kind per group and per 1,000 households.', args: { kind: 'kind or list', groupBy: "'area' (default), 'bank', 'cell', 'town'" } },
  attribute: { fn: attribute, about: 'Any numeric figure per area (census, need, history); `minus` for a change.', args: { name: "e.g. 'need', 'noCar', 'newHomesShare', 'carCommute2021' (see fields)", minus: "optional, e.g. 'carCommute2011'" } },
  fields: { fn: (m) => areaFields(m), about: 'Every numeric figure the areas carry, for attribute.', args: {} },
  relate: { fn: relate, about: 'Does y go with x, allowing for controls? (least squares across groups)', args: { y: 'a result ($name)', x: '{ label: result }', controls: '{ label: result }' } },
  rank: { fn: rank, about: 'Groups of a result, sorted, with names.', args: { of: 'a result ($name)', top: 'how many (10)', ascending: 'lowest first (false)', namePrefix: "keep areas whose name starts with this, e.g. 'Worcester '" } },
  average: { fn: average, about: 'Household-weighted average of a per-area result across the town.', args: { of: 'a per-area result ($name)', namePrefix: "e.g. 'Worcester '" } },
  combine: { fn: combine, about: 'Weighted sum of results per group (a composite index).', args: { parts: '[{ of: $name, weight }]' } },
  bestSites: { fn: bestSites, about: 'Where one more place of a kind would help most.', args: { kind: 'kind', count: 'how many (3)', byNeed: 'weight by need (false)' } },
  compare: { fn: compare, about: 'Score scenarios against today, with who gains.', args: { scenarios: 'list of scenario objects (scenarios.js)' } },
});

/**
 * Run a plan: [{ tool, args, as }]. String args starting with "$" are
 * replaced by the result saved under that name, including inside objects
 * and lists. Returns every named result.
 */
export function runPlan(model, plan) {
  const saved = {};
  const resolve = (v) => {
    if (typeof v === 'string' && v.startsWith('$')) {
      if (!(v.slice(1) in saved)) throw new Error(`Plan refers to ${v} before it exists`);
      return saved[v.slice(1)];
    }
    if (Array.isArray(v)) return v.map(resolve);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x)]));
    return v;
  };
  plan.forEach((step, i) => {
    const tool = TOOLS[step.tool];
    if (!tool) throw new Error(`Step ${i + 1}: unknown tool "${step.tool}". Tools: ${Object.keys(TOOLS).join(', ')}`);
    saved[step.as || `step${i + 1}`] = tool.fn(model, resolve(step.args || {}));
  });
  return saved;
}
