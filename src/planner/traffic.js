/**
 * Road traffic over time, from the Department for Transport's annual average
 * daily flow (AADF) counts: https://roadtraffic.dft.gov.uk
 *
 * Each count point is a stretch of road with one figure per year: vehicles on
 * an average day. Some years are real counts, the rest DfT estimates, and the
 * difference matters: only counted-to-counted changes are used to spot
 * diversions, so an estimate can never fake one.
 */
import { metresBetween } from './graph.js';

/** Minimal CSV parser for DfT's quoted, comma-separated files. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

/**
 * Group AADF rows into count points with a year series each:
 * { id, road, roadType, area, lat, lon, linkKm,
 *   years: { 2019: { all, hgv, cycles, counted } } }
 */
export function buildCountPoints(rows) {
  const points = new Map();
  for (const r of rows) {
    const id = Number(r.count_point_id);
    let p = points.get(id);
    if (!p) {
      p = {
        id,
        road: r.road_name,
        roadType: r.road_type,
        area: r.local_authority_name,
        lat: Number(r.latitude),
        lon: Number(r.longitude),
        linkKm: Number(r.link_length_km) || null,
        years: {},
      };
      points.set(id, p);
    }
    p.years[Number(r.year)] = {
      all: Number(r.all_motor_vehicles),
      hgv: Number(r.all_hgvs),
      cycles: Number(r.pedal_cycles),
      counted: r.estimation_method === 'Counted',
    };
  }
  return [...points.values()];
}

/** Every year present in the points, ascending. */
export function yearsOf(points) {
  const ys = new Set();
  for (const p of points) for (const y of Object.keys(p.years)) ys.add(Number(y));
  return [...ys].sort((a, b) => a - b);
}

/**
 * Regional pulse: total vehicle-km per day across points with a known link
 * length, per year, plus an index where the first year is 100. Uses counts
 * and estimates alike, as DfT's own totals do.
 */
export function regionalPulse(points) {
  const years = yearsOf(points);
  const totals = years.map((y) => {
    let vkm = 0;
    for (const p of points) {
      const v = p.years[y];
      if (v && p.linkKm) vkm += v.all * p.linkKm;
    }
    return vkm;
  });
  const base = totals[0] || 1;
  return years.map((year, i) => ({ year, vehicleKm: Math.round(totals[i]), index: Math.round((totals[i] / base) * 1000) / 10 }));
}

/**
 * Counted-to-counted changes: for each point, each pair of consecutive real
 * counts at most `maxGap` years apart. `change` is relative to the regional
 * trend over the same years, so growth, recessions and 2020 don't look like
 * local events.
 */
export function countedChanges(points, { maxGap = 2 } = {}) {
  const pulse = new Map(regionalPulse(points).map((r) => [r.year, r.vehicleKm]));
  const out = [];
  for (const p of points) {
    const counted = Object.entries(p.years)
      .filter(([, v]) => v.counted && v.all > 0)
      .map(([y, v]) => [Number(y), v.all])
      .sort((a, b) => a[0] - b[0]);
    for (let k = 1; k < counted.length; k++) {
      const [y0, a] = counted[k - 1];
      const [y1, b] = counted[k];
      if (y1 - y0 > maxGap) continue;
      const trend = (pulse.get(y1) || 1) / (pulse.get(y0) || 1);
      out.push({ point: p, from: y0, to: y1, before: a, after: b, change: b / a / trend - 1 });
    }
  }
  return out;
}

/**
 * Diversion detector: a road whose counted traffic fell sharply while a
 * nearby road's rose sharply over the same years, both beyond the regional
 * trend. Returns the strongest pairs first:
 * { year, from, to, fell: {...}, rose: {...}, km, moved }
 * where `moved` is roughly how many vehicles a day switched (the smaller of
 * the fall and the rise).
 */
export function findDiversions(points, { radiusKm = 8, minChange = 0.25, minFlow = 5000, minMoved = 1000, limit = 40 } = {}) {
  const changes = countedChanges(points).filter((c) => Math.max(c.before, c.after) >= minFlow);
  const falls = changes.filter((c) => c.change <= -minChange);
  const rises = changes.filter((c) => c.change >= minChange);
  const events = [];
  for (const f of falls) {
    for (const r of rises) {
      if (r.point.id === f.point.id || r.to !== f.to || r.from !== f.from) continue;
      if (r.point.road === f.point.road) continue; // same road, different stretch: not a diversion
      const km = metresBetween([f.point.lon, f.point.lat], [r.point.lon, r.point.lat]) / 1000;
      if (km > radiusKm) continue;
      const moved = Math.round(Math.min(f.before - f.after, r.after - r.before));
      if (moved < minMoved) continue;
      events.push({ year: f.to, from: f.from, to: f.to, km: Math.round(km * 10) / 10, moved, fell: brief(f), rose: brief(r) });
    }
  }
  events.sort((a, b) => b.moved - a.moved);
  // Keep the strongest partner for each fall, so one closure isn't listed ten times.
  const seen = new Set();
  return events.filter((e) => {
    const key = `${e.fell.id}:${e.year}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

function brief(c) {
  const p = c.point;
  return {
    id: p.id, road: p.road, area: p.area, lon: p.lon, lat: p.lat,
    before: c.before, after: c.after, change: Math.round(c.change * 100) / 100,
  };
}

/**
 * Compact file for the globe layer: one array per point, aligned to `years`
 * (null where there is no figure), and a parallel counted/estimated flag.
 */
export function toTrafficLayerJson(points, { region }) {
  const years = yearsOf(points);
  return {
    region,
    source: 'Department for Transport road traffic statistics (AADF)',
    years,
    pulse: regionalPulse(points),
    diversions: findDiversions(points),
    points: points.map((p) => ({
      id: p.id,
      road: p.road,
      type: p.roadType,
      area: p.area,
      lon: Math.round(p.lon * 1e5) / 1e5,
      lat: Math.round(p.lat * 1e5) / 1e5,
      all: years.map((y) => p.years[y]?.all ?? null),
      counted: years.map((y) => (p.years[y] ? (p.years[y].counted ? 1 : 0) : null)),
    })),
  };
}
