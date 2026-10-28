/**
 * The town model: everything known about a town, loaded once, in one shape
 * the planner tools (tools.js) all work on.
 *
 *   model.homes   every home: lon, lat, w (households), area (LSOA code) and
 *                 its neighbourhood's census shares: need, noCar, over65,
 *                 deprived, badHealth
 *   model.places  every place, each with a `kind`: shop, school, gp, bus,
 *                 food:takeaway, food:smallShop, food:supermarket, food:pub,
 *                 food:restaurant, vacant
 *   model.areas   census neighbourhoods (LSOAs) with their attributes
 *   model.buses   the timetable cut, or null
 *   model.graph   the walking network (built on first use)
 *
 * Pure: give it the parsed files from public/planner/<town>/; reading them
 * from disk is the caller's job (scripts/planner.mjs loadModel).
 */
import { attachCensus, attachNeed } from './census.js';
import { buildWalkGraph, metresBetween } from './graph.js';
import { findCrossings, bankOf } from './river.js';

export const HOME_ATTRIBUTES = Object.freeze(['need', 'noCar', 'over65', 'deprived', 'badHealth']);

/**
 * Build a model from a town file plus whichever extras exist:
 * census (census.json), gps (gps.json), buses (buses.json), food (food.json).
 */
export function buildModel({ town, census = null, gps = null, buses = null, food = null }) {
  const data = { ...town, places: [...town.places], homes: town.homes.map((h) => ({ ...h })) };
  // Official GP practices replace OpenStreetMap's, which miss surgeries and
  // count hospital clinics as GPs.
  if (gps?.practices?.length) {
    data.places = data.places.filter((p) => p.kind !== 'gp');
    for (const p of gps.practices) {
      if (p.lon == null) continue;
      data.places.push({ id: `ods/${p.code}`, kind: 'gp', name: p.name, lon: p.lon, lat: p.lat, listSize: p.listSize, waitAcceptablePct: p.waitAcceptablePct, needsMetPct: p.needsMetPct });
    }
  }
  for (const b of food?.businesses || []) {
    data.places.push({ id: `fsa/${b.name}/${b.lon}`, kind: `food:${b.kind}`, name: b.name, lon: b.lon, lat: b.lat, rating: b.rating });
  }
  for (const v of town.vacant || []) data.places.push({ ...v, kind: 'vacant' });
  const areas = census?.areas ? census.areas.map((a) => ({ ...a })) : [];
  if (areas.length) {
    attachCensus(data, areas);
    attachNeed(areas);
    const byCode = new Map(areas.map((a) => [a.code, a]));
    for (const h of data.homes) {
      const a = byCode.get(h.area);
      for (const k of HOME_ATTRIBUTES) h[k] = a?.[k] ?? null;
    }
  }
  let graph = null;
  let bank = null;
  return {
    name: town.town,
    town: data,
    homes: data.homes,
    places: data.places,
    areas,
    buses: buses || null,
    get graph() {
      graph ||= buildWalkGraph(data.roads);
      return graph;
    },
    /** 'west' | 'east' | null for a point, across the town's main river. */
    bankOf(point) {
      if (!bank) {
        const lengths = new Map();
        for (const r of data.rivers || []) {
          if (!r.name) continue;
          let m = 0;
          for (let k = 1; k < r.coords.length; k++) m += metresBetween(r.coords[k - 1], r.coords[k]);
          lengths.set(r.name, (lengths.get(r.name) || 0) + m);
        }
        const [river] = [...lengths.entries()].sort((a, b) => b[1] - a[1])[0] || [];
        bank = river ? bankOf(data, findCrossings(data, { river }).segments) : () => null;
      }
      return bank(point);
    },
    /** Every kind of place in the model, with how many there are. */
    kinds() {
      const c = {};
      for (const p of data.places) c[p.kind] = (c[p.kind] || 0) + 1;
      return c;
    },
  };
}
