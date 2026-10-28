/**
 * Buses from a planner timetable cut (scripts/planner-gtfs.py): how often
 * each stop is served, and door-to-door time to a service by bus, compared
 * with walking all the way.
 *
 * Bus time = walk to a stop + half the gap between buses on that route
 * (the average wait) + ride + walk from the stop to the service. One-seat
 * rides only: no changes between buses, which is how most short town trips
 * are made and keeps this honest without a full journey planner.
 */
import { SERVICE_KINDS } from './osm.js';
import { buildWalkGraph, nearestFrom } from './graph.js';
import { WALK_M_PER_MIN } from './access.js';

const MAX_SNAP_M = 250;
const DAY = Object.freeze({ from: 7 * 60, to: 19 * 60 });
const MAX_WAIT_MIN = 30;

/** Daytime buses per hour leaving each stop, aligned to buses.stops. */
export function stopFrequency(buses, { from = DAY.from, to = DAY.to } = {}) {
  const deps = new Array(buses.stops.length).fill(0);
  for (const trip of buses.trips) {
    for (let k = 0; k < trip.calls.length - 1; k++) {
      const [stop, t] = trip.calls[k];
      if (t >= from && t < to) deps[stop]++;
    }
  }
  const hours = (to - from) / 60;
  return deps.map((d) => Math.round((d / hours) * 10) / 10);
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Minutes from each stop to the nearest `kind` service by bus: the best route
 * from that stop, counting the average wait (half the daytime gap between
 * its buses), the typical ride, and the walk from where you get off.
 */
export function stopToService(town, buses, kind, { graph = buildWalkGraph(town.roads), from = DAY.from, to = DAY.to } = {}) {
  const sources = [];
  for (const p of town.places) {
    if (p.kind !== kind) continue;
    const s = graph.snap([p.lon, p.lat]);
    if (s && s.metres <= MAX_SNAP_M) sources.push(s);
  }
  const { dist } = nearestFrom(graph, sources);
  const egress = buses.stops.map((st) => {
    const s = graph.snap([st.lon, st.lat]);
    return s && s.metres <= MAX_SNAP_M ? (s.metres + dist[s.node]) / WALK_M_PER_MIN : Infinity;
  });
  // Per stop and route: the ride+egress of each daytime departure.
  const perRoute = buses.stops.map(() => new Map());
  for (const trip of buses.trips) {
    const c = trip.calls;
    let best = Infinity;
    // Walk backwards so each call knows the best later stop on this trip.
    const bestAfter = new Array(c.length).fill(Infinity);
    for (let k = c.length - 1; k >= 0; k--) {
      bestAfter[k] = best;
      best = Math.min(best, c[k][1] + egress[c[k][0]]);
    }
    for (let k = 0; k < c.length - 1; k++) {
      const [stop, t] = c[k];
      if (t < from || t >= to || !Number.isFinite(bestAfter[k])) continue;
      const m = perRoute[stop];
      if (!m.has(trip.route)) m.set(trip.route, []);
      m.get(trip.route).push(bestAfter[k] - t);
    }
  }
  const hours = (to - from) / 60;
  return perRoute.map((routes) => {
    let bestCost = Infinity;
    for (const values of routes.values()) {
      const gap = 60 / (values.length / hours);
      const cost = Math.min(gap / 2, MAX_WAIT_MIN) + median(values);
      bestCost = Math.min(bestCost, cost);
    }
    return bestCost;
  });
}

/**
 * Per home, the quicker of walking all the way or walking to a stop and
 * taking the bus, for one service. Returns { walk, best } Float64Arrays of
 * minutes aligned to town.homes (Infinity where unreachable).
 */
export function busOrWalk(town, buses, kind, { graph = buildWalkGraph(town.roads) } = {}) {
  const viaStop = stopToService(town, buses, kind, { graph });
  const busSources = [];
  buses.stops.forEach((st, i) => {
    if (!Number.isFinite(viaStop[i])) return;
    const s = graph.snap([st.lon, st.lat]);
    if (s && s.metres <= MAX_SNAP_M) busSources.push({ node: s.node, metres: s.metres + viaStop[i] * WALK_M_PER_MIN });
  });
  const bus = nearestFrom(graph, busSources).dist;
  const directSources = [];
  for (const p of town.places) {
    if (p.kind !== kind) continue;
    const s = graph.snap([p.lon, p.lat]);
    if (s && s.metres <= MAX_SNAP_M) directSources.push(s);
  }
  const direct = nearestFrom(graph, directSources).dist;
  const walk = new Float64Array(town.homes.length).fill(Infinity);
  const best = new Float64Array(town.homes.length).fill(Infinity);
  town.homes.forEach((h, i) => {
    const s = graph.snap([h.lon, h.lat]);
    if (!s || s.metres > MAX_SNAP_M) return;
    walk[i] = (s.metres + direct[s.node]) / WALK_M_PER_MIN;
    best[i] = Math.min(walk[i], (s.metres + bus[s.node]) / WALK_M_PER_MIN);
  });
  return { walk, best };
}

/**
 * Bus report: stops with their daytime frequency, the share of households
 * with a frequent stop (≥ `frequent` buses/hour) within `nearMin` minutes'
 * walk, and per census area the household-weighted walk vs bus-or-walk
 * minutes to each service.
 */
export function busReport(town, buses, { frequent = 4, nearMin = 5 } = {}) {
  const graph = buildWalkGraph(town.roads);
  const freq = stopFrequency(buses);
  const good = [];
  buses.stops.forEach((st, i) => {
    if (freq[i] < frequent) return;
    const s = graph.snap([st.lon, st.lat]);
    if (s && s.metres <= MAX_SNAP_M) good.push(s);
  });
  const toGood = nearestFrom(graph, good).dist;
  let hh = 0;
  let near = 0;
  const areas = new Map();
  const homeNear = town.homes.map((h) => {
    const w = h.w ?? 1;
    const s = graph.snap([h.lon, h.lat]);
    if (w <= 0 || !s || s.metres > MAX_SNAP_M) return null;
    const ok = (s.metres + toGood[s.node]) / WALK_M_PER_MIN <= nearMin;
    hh += w;
    if (ok) near += w;
    return ok;
  });
  const services = {};
  for (const kind of Object.keys(SERVICE_KINDS)) {
    if (kind === 'bus') continue;
    const { walk, best } = busOrWalk(town, buses, kind, { graph });
    let sw = 0;
    let sb = 0;
    let n = 0;
    town.homes.forEach((h, i) => {
      const w = h.w ?? 1;
      if (w <= 0 || !Number.isFinite(walk[i])) return;
      const wm = Math.min(walk[i], 120);
      const bm = Math.min(best[i], 120);
      sw += wm * w; sb += bm * w; n += w;
      if (!h.area) return;
      const a = areas.get(h.area) || { hh: 0, near: 0, services: {} };
      const sv = (a.services[kind] ||= { walk: 0, best: 0, hh: 0 });
      sv.walk += wm * w; sv.best += bm * w; sv.hh += w;
      areas.set(h.area, a);
    });
    services[kind] = { walkMinutes: Math.round((sw / n) * 10) / 10, busOrWalkMinutes: Math.round((sb / n) * 10) / 10 };
  }
  town.homes.forEach((h, i) => {
    if (!h.area || homeNear[i] === null) return;
    const a = areas.get(h.area) || { hh: 0, near: 0, services: {} };
    a.hh += h.w ?? 1;
    if (homeNear[i]) a.near += h.w ?? 1;
    areas.set(h.area, a);
  });
  const byArea = {};
  for (const [code, a] of areas) {
    byArea[code] = {
      frequentStopNearby: a.hh ? Math.round((a.near / a.hh) * 100) / 100 : null,
      services: Object.fromEntries(Object.entries(a.services).map(([k, v]) => [k, {
        walkMinutes: Math.round((v.walk / v.hh) * 10) / 10,
        busOrWalkMinutes: Math.round((v.best / v.hh) * 10) / 10,
      }])),
    };
  }
  return {
    date: buses.date,
    frequentMeans: `${frequent}+ buses an hour, 7am–7pm`,
    stops: buses.stops.map((st, i) => ({ name: st.name, lonLat: [st.lon, st.lat], perHour: freq[i] })),
    shareWithFrequentStopNearby: hh ? Math.round((near / hh) * 100) / 100 : 0,
    services,
    byArea,
  };
}
