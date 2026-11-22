/* foundry/lib/metrics.mjs -- numbers per seed (no human looking): metrics, playability checks, transparent weighted score. */
import { plan, visualMetrics } from './render.mjs';
import { TUNING } from './analyze.mjs';

const q = (v, n = 3) => { const k = 10 ** n; return Math.round(v * k) / k; };
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length & 1 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const MAX_NEIGHBOUR_ROW_MIN = 20;       /* TUNING: a neighbour counts as reachable if its landing is within 20 rowing minutes */
export const MIN_HOME_AREA_M2 = 1500, MIN_HOME_WOOD_M2 = 400, MIN_HOME_ROCK_M2 = 100;

export function computeMetrics(A) {
  const m = A.manifest, isl = m.islands, S = m.size_m, home = isl.find((i) => i.is_home);
  let landCells = 0; for (const v of A.land) landCells += v;
  const areas = isl.map((i) => i.area_m2), meanA = areas.reduce((a, b) => a + b, 0) / Math.max(1, areas.length);
  const cv = areas.length > 1 ? Math.sqrt(areas.reduce((a, b) => a + (b - meanA) ** 2, 0) / areas.length) / meanA : 0;
  const others = isl.filter((i) => !i.is_home), reach = others.filter((i) => i.reachable), rms = reach.map((i) => i.row_min_to_coast).filter((v) => v != null);
  const sites = m.landing_sites, homeSites = sites.filter((s) => s.island === home?.id);
  const res = (f) => isl.filter(f).length;
  const metrics = {
    land_fraction: q(landCells * A.cell * A.cell / (S * S)), island_count: isl.length, islands_per_1e4m2: q(isl.length / (S * S / 1e4), 2),
    area_cv: q(cv, 2), area_max_share: q(Math.max(0, ...areas) / Math.max(1, areas.reduce((a, b) => a + b, 0)), 2), home_area_m2: home?.area_m2 || 0,
    coast_total_m: isl.reduce((a, i) => a + i.coast_m, 0), coast_complexity: q(isl.reduce((a, i) => a + i.complexity, 0) / Math.max(1, isl.length), 2),
    landings_total: sites.length, landings_home: homeSites.length, sheltered_landings: sites.filter((s) => s.sheltered).length, sheltered_landings_home: homeSites.filter((s) => s.sheltered).length,
    reachable_islands: reach.length, reachable_fraction: q(others.length ? reach.length / others.length : 0, 2),
    nearest_neighbour_row_min: rms.length ? q(Math.min(...rms), 2) : null, median_row_min: rms.length ? q(median(rms), 2) : null, farthest_row_min: rms.length ? q(Math.max(...rms), 2) : null,
    landing_distance_median_m: null,
    narrowest_channel_m: m.channels.length ? m.channels[0].width_m : null, hard_channels: m.channels.filter((c) => c.hard).length,
    islands_with_water: res((i) => i.resources.fresh_water), islands_with_timber: res((i) => i.resources.woodland_m2 >= MIN_HOME_WOOD_M2), islands_with_stone: res((i) => i.resources.rock_face_m2 >= MIN_HOME_ROCK_M2),
    max_height_m: Math.max(0, ...isl.map((i) => i.h_max_m))
  };
  /* distance of each other island's best landing from the start landing, straight line (m), for the median */
  const hl = sites.find((s) => s.home); if (hl) { const d = others.map((i) => { const ss = sites.filter((s) => s.island === i.id); return ss.length ? Math.min(...ss.map((s) => Math.hypot(s.x - hl.x, s.z - hl.z))) : null; }).filter((v) => v != null); metrics.landing_distance_median_m = d.length ? Math.round(median(d)) : null; }
  const img = plan(A.F, 240), vis = visualMetrics(img);
  return { metrics: { ...metrics, visual: vis }, img };
}

/* playability: hard checks on the start island and what is reachable from it */
export function playability(m, metrics) {
  const isl = m.islands, home = isl.find((i) => i.is_home), checks = [];
  const add = (id, pass, detail) => checks.push({ id, pass: !!pass, detail });
  if (!home) { add('start_island_exists', false, 'no home island'); return { ok: false, checks }; }
  const reachIsl = isl.filter((i) => !i.is_home && i.landable && i.row_min_from_home <= MAX_NEIGHBOUR_ROW_MIN);
  add('start_island_big_enough', home.area_m2 >= MIN_HOME_AREA_M2, `${home.area_m2} m2 (need ${MIN_HOME_AREA_M2})`);
  add('start_has_landing', metrics.landings_home > 0, `${metrics.landings_home} landing candidates on the start island`);
  add('start_has_fresh_water', home.resources.fresh_water, `${home.resources.springs.length} spring sites`);
  add('start_has_timber', home.resources.woodland_m2 >= MIN_HOME_WOOD_M2, `${home.resources.woodland_m2} m2 woodland (need ${MIN_HOME_WOOD_M2})`);
  add('neighbour_reachable', reachIsl.length >= 1, `${reachIsl.length} islands with a landing within ${MAX_NEIGHBOUR_ROW_MIN} rowing minutes`);
  for (const [k, ok, lab] of [['water', (i) => i.resources.fresh_water, 'fresh water'], ['timber', (i) => i.resources.woodland_m2 >= MIN_HOME_WOOD_M2, 'timber'], ['stone', (i) => i.resources.rock_face_m2 >= MIN_HOME_ROCK_M2, 'stone']]) {
    const here = ok(home), there = reachIsl.some(ok);
    add('resource_reachable_' + k, here || there, here ? `${lab} on the start island` : there ? `${lab} on a reachable island` : `no ${lab} on the start island or within reach`); }
  return { ok: checks.every((c) => c.pass), checks };
}

