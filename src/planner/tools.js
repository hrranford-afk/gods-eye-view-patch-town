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
  if (groupBy === 'ward') {
    const ward = new Map(model.areas.map((a) => [a.code, a.ward]));
    return model.homes.map((h) => ward.get(h.area) ?? null);
  }
  if (groupBy === 'bank') return model.homes.map((h) => model.bankOf([h.lon, h.lat]));
  if (groupBy === 'cell') {
    const dLat = 250 / 111_320;
    const dLon = 250 / (111_320 * Math.cos(((model.homes[0]?.lat ?? 52) * Math.PI) / 180));
    return model.homes.map((h) => `${Math.floor(h.lon / dLon) * dLon},${Math.floor(h.lat / dLat) * dLat}`);
  }
  throw new Error(`Unknown groupBy "${groupBy}". Use town, area, ward, bank or cell`);
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
    value[k] = Math.round((a.sum / a.n) * 1000) / 1000;
    households[k] = Math.round(a.hh);
  }
  return { value, households };
}

/**
 * count: places of a kind per group, per 1,000 households, or with
 * per: 'dayPopulation' per 1,000 residents + workers (areas only; fairer in
 * town centres, where few live and many work and visit).
 */
export function count(model, { kind, groupBy = 'area', per = 'households' }) {
  const g = groupsOf(model, groupBy);
  const hh = {};
  model.homes.forEach((h, i) => { if (g[i] != null) hh[g[i]] = (hh[g[i]] || 0) + (h.w ?? 1); });
  if (per === 'dayPopulation') {
    if (groupBy !== 'area') throw new Error("count: per 'dayPopulation' needs groupBy 'area'");
    for (const a of model.areas) if (a.code in hh) hh[a.code] = a.dayPopulation || 0;
  }
  // A place belongs to the group of its nearest home.
  const keyOf = nearestHomeGroup(model, g);
  const n = {};
  for (const p of model.places.filter(matchKind(kind))) {
    const k = keyOf([p.lon, p.lat]);
    if (k != null) n[k] = (n[k] || 0) + 1;
  }
  const value = {};
  for (const k of Object.keys(hh)) if (hh[k] > 0) value[k] = Math.round(((n[k] || 0) / hh[k]) * 1000 * 100) / 100;
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

/**
 * compare: score scenarios (scenarios.js shape) against the town today.
 * With flood data, any new homes a scenario adds inside Flood Zone 2 or 3
 * are flagged in `floodWarnings`.
 */
export function compare(model, { scenarios }) {
  const result = compareScenarios(model.town, scenarios, { buses: model.buses || undefined });
  if (model.hasFlood) {
    result.scenarios.forEach((r, i) => {
      const warnings = (scenarios[i].changes?.addHomes || [])
        .map((h) => ({ name: h.name, households: h.households, floodZone: model.floodZoneOf([h.lon, h.lat]) }))
        .filter((h) => h.floodZone >= 2);
      if (warnings.length) r.floodWarnings = warnings;
    });
  }
  return result;
}

/**
 * meets: for every home, 1 if each check is met (its travel minutes are at
 * most `max`), else 0. Summarise it with stat 'mean' for the share of
 * households that have everything on the list. This is how a "good day
 * within reach" is measured.
 */
export function meets(model, { checks }) {
  return model.homes.map((_, i) => (checks.every(({ values, max }) => Number.isFinite(values[i]) && values[i] <= max) ? 1 : 0));
}

/** floodZone: each home's Environment Agency flood zone (3, 2 or 0), as per-home values. */
export function floodZone(model) {
  if (!model.hasFlood) throw new Error('floodZone needs flood.json (npm run planner -- flood <town>)');
  return model.homes.map((h) => h.floodZone ?? 0);
}

/** Which family a figure belongs to, so survey skips trivial pairs (income vs income). */
function family(name) {
  if (/^(imdScore|imdDecile|need|deprived)$|Dep$/.test(name)) return 'deprivation';
  if (/^income/.test(name)) return 'income';
  if (/Per1000(Day)?$/.test(name) && /crime|violence|antisocial|burglary/.test(name)) return 'crime';
  if (/Commute(2011|2021)$/.test(name)) return name.replace(/20(11|21)$/, '');
  if (/^(medianPrice|priceChange)$/.test(name)) return name;
  if (/^newHomes/.test(name)) return 'growth';
  if (/^floodZone/.test(name)) return 'flood';
  return name;
}

function pearson(x, y) {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let s = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) { s += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; }
  return dx && dy ? s / Math.sqrt(dx * dy) : 0;
}

/**
 * survey: look across many per-area figures at once and report what the map
 * shows: the strongest links between figures from different families, and
 * the surprises, areas much better or worse on a figure than `explainBy`
 * (deprivation by default) would predict. Surprises are where to ask next.
 * `fields` are area figures (see `fields`); `extra` adds per-area results
 * from earlier steps ({ label: $result }). Only areas named with
 * `namePrefix` are used, if given.
 */
export function survey(model, { fields = [], extra = {}, namePrefix = null, exclude = [], explainBy = 'imdScore', surprisesFor = null, top = 12, minAbsR = 0.4 } = {}) {
  const skip = new Set(exclude);
  const areas = model.areas.filter((a) => (!namePrefix || a.name.startsWith(namePrefix)) && !skip.has(a.name) && !skip.has(a.code));
  const cols = {};
  for (const f of fields) cols[f] = Object.fromEntries(areas.filter((a) => Number.isFinite(a[f])).map((a) => [a.code, a[f]]));
  for (const [label, r] of Object.entries(extra)) cols[label] = r.value;
  const names = Object.keys(cols);
  const links = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const [a, b] = [names[i], names[j]];
      if (family(a) === family(b)) continue;
      const keys = areas.map((x) => x.code).filter((k) => Number.isFinite(cols[a][k]) && Number.isFinite(cols[b][k]));
      if (keys.length < 10) continue;
      const r = pearson(keys.map((k) => cols[a][k]), keys.map((k) => cols[b][k]));
      if (Math.abs(r) >= minAbsR) links.push({ a, b, r: Math.round(r * 100) / 100, areas: keys.length });
    }
  }
  links.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
  const explain = cols[explainBy] || Object.fromEntries(areas.filter((a) => Number.isFinite(a[explainBy])).map((a) => [a.code, a[explainBy]]));
  const surprises = [];
  for (const f of surprisesFor || names) {
    if (f === explainBy || family(f) === family(explainBy) || !cols[f]) continue;
    const keys = areas.map((x) => x.code).filter((k) => Number.isFinite(cols[f][k]) && Number.isFinite(explain[k]));
    if (keys.length < 10) continue;
    const xs = keys.map((k) => explain[k]);
    const ys = keys.map((k) => cols[f][k]);
    const mx = xs.reduce((p, q) => p + q, 0) / xs.length;
    const my = ys.reduce((p, q) => p + q, 0) / ys.length;
    const sxx = xs.reduce((p, q) => p + (q - mx) ** 2, 0);
    const slope = sxx ? xs.reduce((p, q, i) => p + (q - mx) * (ys[i] - my), 0) / sxx : 0;
    const resid = ys.map((y, i) => y - (my + slope * (xs[i] - mx)));
    const sd = Math.sqrt(resid.reduce((p, q) => p + q * q, 0) / (resid.length - 2)) || 1;
    keys.forEach((k, i) => {
      const z = resid[i] / sd;
      if (Math.abs(z) >= 2) surprises.push({ figure: f, area: k, value: Number(ys[i].toPrecision(4)), expected: Number((ys[i] - resid[i]).toPrecision(4)), z: Math.round(z * 10) / 10 });
    });
  }
  surprises.sort((x, y) => Math.abs(y.z) - Math.abs(x.z));
  const nameOf = new Map(model.areas.map((a) => [a.code, a.name]));
  const wardOf = new Map(model.areas.map((a) => [a.code, a.ward]));
  return {
    areas: areas.length,
    figures: names,
    links: links.slice(0, top * 2),
    surprises: surprises.slice(0, top * 2).map((x) => ({ ...x, name: nameOf.get(x.area), ward: wardOf.get(x.area) || null })),
  };
}

/**
 * profile: one line per figure for a whole town, so towns can be compared:
 * the resident-weighted mean over its neighbourhoods, and the lowest and
 * highest neighbourhood (how unequal it is inside). `extra` takes per-area
 * results from earlier steps ($name), like survey.
 */
export function profile(model, { fields = [], extra = {}, namePrefix = null, exclude = [] } = {}) {
  const skip = new Set(exclude);
  const areas = model.areas.filter((a) => (!namePrefix || a.name.startsWith(namePrefix)) && !skip.has(a.name) && !skip.has(a.code));
  const cols = Object.fromEntries(fields.map((f) => [f, Object.fromEntries(areas.filter((a) => Number.isFinite(a[f])).map((a) => [a.code, a[f]]))]));
  for (const [label, r] of Object.entries(extra)) cols[label] = r.value;
  const out = { areas: areas.length, residents: areas.reduce((t, a) => t + (a.residents || 0), 0), figures: {} };
  for (const [f, byCode] of Object.entries(cols)) {
    const rows = areas.filter((a) => Number.isFinite(byCode[a.code]));
    if (!rows.length) continue;
    const w = rows.reduce((t, a) => t + (a.residents || 1), 0);
    const vals = rows.map((a) => byCode[a.code]);
    const sig = (v) => Number(v.toPrecision(3));
    out.figures[f] = { mean: sig(rows.reduce((t, a) => t + byCode[a.code] * (a.residents || 1), 0) / w), min: sig(Math.min(...vals)), max: sig(Math.max(...vals)), areas: rows.length };
  }
  return out;
}

/**
 * spotlight: one place (a ward, or a list of neighbourhoods) against the
 * rest of its town, on every figure given. For each: the place's
 * resident-weighted value, the town's median, and where the place ranks as a
 * percentile (0 = lowest neighbourhood, 100 = highest). The figures most
 * unlike the town come first, so the story leads.
 */
export function spotlight(model, { ward = null, codes = null, fields = [], extra = {}, namePrefix = null, exclude = [] } = {}) {
  const skip = new Set(exclude);
  const town = model.areas.filter((a) => (!namePrefix || a.name.startsWith(namePrefix)) && !skip.has(a.name) && !skip.has(a.code));
  const inPlace = (a) => (ward ? a.ward === ward : codes?.includes(a.code) || codes?.includes(a.name));
  const place = town.filter(inPlace);
  if (!place.length) throw new Error(`spotlight: no neighbourhoods match ${ward || codes}`);
  const cols = Object.fromEntries(fields.map((f) => [f, Object.fromEntries(town.filter((a) => Number.isFinite(a[f])).map((a) => [a.code, a[f]]))]));
  for (const [label, r] of Object.entries(extra)) cols[label] = r.value;
  const sig = (v) => Number(v.toPrecision(3));
  const figures = [];
  for (const [f, byCode] of Object.entries(cols)) {
    const rows = place.filter((a) => Number.isFinite(byCode[a.code]));
    const all = town.map((a) => byCode[a.code]).filter(Number.isFinite).sort((x, y) => x - y);
    if (!rows.length || all.length < 5) continue;
    const w = rows.reduce((t, a) => t + (a.residents || 1), 0);
    const value = rows.reduce((t, a) => t + byCode[a.code] * (a.residents || 1), 0) / w;
    const below = all.filter((v) => v < value).length, equal = all.filter((v) => v === value).length;
    const percentile = Math.round(((below + equal / 2) / all.length) * 100);
    figures.push({ figure: f, value: sig(value), townMedian: sig(all[Math.floor(all.length / 2)]), percentile, areas: rows.length });
  }
  figures.sort((a, b) => Math.abs(b.percentile - 50) - Math.abs(a.percentile - 50));
  return { place: ward || codes.join(', '), neighbourhoods: place.map((a) => a.name), residents: place.reduce((t, a) => t + (a.residents || 0), 0), figures };
}

export const TOOLS = Object.freeze({
  kinds: { fn: (m) => m.kinds(), about: 'Every kind of place in the model and how many.', args: {} },
  profile: { fn: profile, about: 'A whole town in one line per figure: resident-weighted mean, lowest and highest neighbourhood. For comparing towns.', args: { fields: 'area fields', extra: 'optional {label: $result} per-area results', namePrefix: "e.g. 'Gloucester ' (the council's own neighbourhoods)", exclude: 'area names or codes to leave out' } },
  spotlight: { fn: spotlight, about: 'One place (a ward, or listed neighbourhoods) against its town on every figure: value, town median, percentile; most unusual first.', args: { ward: "e.g. 'Warndon & Elbury Park'", codes: 'or a list of neighbourhood codes or names', fields: 'area fields', extra: 'optional {label: $result} per-area results', namePrefix: "the town's own neighbourhoods, e.g. 'Worcester '", exclude: 'areas to leave out of the town' } },
  council: { fn: (m) => m.council || {}, about: 'Figures published only for the whole council (wellbeing, population, sewage spills…), by source.', args: {} },
  travel: { fn: travel, about: 'Minutes from every home to the nearest place of a kind.', args: { to: "kind, list of kinds, or 'food:*'", mode: "'walk' (default) or 'busOrWalk'" } },
  summarise: { fn: (m, a) => summarise(m, a.values, a), about: 'Per-home values → one number per group.', args: { values: 'a travel result ($name)', weight: "'households' (default), 'need', 'noCar', 'over65', 'deprived', 'badHealth'", groupBy: "'town' (default), 'area', 'ward', 'bank', 'cell'", stat: "'mean' (default) or 'shareWithin'", within: 'minutes, for shareWithin' } },
  count: { fn: count, about: 'Places of a kind per group, per 1,000 households (or residents + workers).', args: { kind: 'kind or list', groupBy: "'area' (default), 'ward', 'bank', 'cell', 'town'", per: "'households' (default) or 'dayPopulation'" } },
  attribute: { fn: attribute, about: 'Any numeric figure per area (census, need, history); `minus` for a change.', args: { name: "e.g. 'need', 'noCar', 'newHomesShare', 'carCommute2021' (see fields)", minus: "optional, e.g. 'carCommute2011'" } },
  fields: { fn: (m) => areaFields(m), about: 'Every numeric figure the areas carry, for attribute.', args: {} },
  relate: { fn: relate, about: 'Does y go with x, allowing for controls? (least squares across groups)', args: { y: 'a result ($name)', x: '{ label: result }', controls: '{ label: result }' } },
  rank: { fn: rank, about: 'Groups of a result, sorted, with names.', args: { of: 'a result ($name)', top: 'how many (10)', ascending: 'lowest first (false)', namePrefix: "keep areas whose name starts with this, e.g. 'Worcester '" } },
  average: { fn: average, about: 'Household-weighted average of a per-area result across the town.', args: { of: 'a per-area result ($name)', namePrefix: "e.g. 'Worcester '" } },
  combine: { fn: combine, about: 'Weighted sum of results per group (a composite index).', args: { parts: '[{ of: $name, weight }]' } },
  bestSites: { fn: bestSites, about: 'Where one more place of a kind would help most.', args: { kind: 'kind', count: 'how many (3)', byNeed: 'weight by need (false)' } },
  survey: { fn: survey, about: 'Across many area figures: strongest links between them, and areas far better or worse than deprivation predicts.', args: { fields: 'area figures', extra: '{ label: $perAreaResult }', namePrefix: "e.g. 'Worcester '", exclude: 'area names or codes to leave out', explainBy: "figure to explain by (default 'imdScore')", surprisesFor: 'figures to find surprises in (default all)', top: 'how many (12)' } },
  meets: { fn: meets, about: 'Per home: 1 if every check is within its limit (a "good day" checklist), else 0.', args: { checks: '[{ values: $travelResult, max: minutes }]' } },
  floodZone: { fn: floodZone, about: "Each home's flood zone (3, 2 or 0), as per-home values.", args: {} },
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
    // A step marked optional records why it couldn't run instead of stopping the plan
    // (e.g. a figure one town doesn't have yet).
    try {
      saved[step.as || `step${i + 1}`] = tool.fn(model, resolve(step.args || {}));
    } catch (e) {
      if (!step.optional) throw e;
      saved[step.as || `step${i + 1}`] = { error: e.message };
    }
  });
  return saved;
}
