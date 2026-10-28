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
import { attachCensus, attachNeed, pointInGeometry } from './census.js';
import { buildWalkGraph, metresBetween } from './graph.js';
import { findCrossings, bankOf } from './river.js';
import { attachHistory } from './history.js';
import { attachLayers } from './layers.js';

function boxOf(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const rings of polys) for (const [x, y] of rings[0]) {
    if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y;
  }
  return b;
}

export const HOME_ATTRIBUTES = Object.freeze(['need', 'noCar', 'over65', 'deprived', 'badHealth']);

/**
 * Build a model from a town file plus whichever extras exist:
 * census (census.json), gps (gps.json), buses (buses.json), food (food.json),
 * history (history.json: new homes since 1995, Census 2011), flood
 * (flood.json: Environment Agency Flood Zones 2 and 3), planning
 * (planning.json: brownfield sites, listed buildings).
 */
export function buildModel({
  town, census = null, gps = null, buses = null, food = null, history = null, flood = null, planning = null,
  deprivation = null, crime = null, prices = null, schools = null, collisions = null,
  jobs = null, income = null, wards = null,
}) {
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
  // Official schools replace OpenStreetMap's; each counts as `school` and as
  // `school:<phase>` (e.g. school:Primary) so plans can ask about either.
  if (schools?.schools?.length) {
    data.places = data.places.filter((p) => p.kind !== 'school');
    for (const x of schools.schools) {
      if (x.lon == null || !['Primary', 'Secondary', 'All-through', 'Middle deemed primary', 'Middle deemed secondary'].includes(x.phase)) continue;
      const base = { id: `urn/${x.urn}`, name: x.name, lon: x.lon, lat: x.lat, phase: x.phase, capacity: x.capacity, pupils: x.pupils };
      data.places.push({ ...base, kind: 'school' }, { ...base, id: `${base.id}/phase`, kind: `school:${x.phase.split(' ').at(-1).toLowerCase()}` });
    }
  }
  for (const c of collisions?.collisions || []) data.places.push({ id: `stats19/${c.lon},${c.lat},${c.year}`, kind: `collision:${c.severity}`, name: `${c.severity} collision ${c.year}`, lon: c.lon, lat: c.lat, year: c.year, casualties: c.casualties });
  for (const b of food?.businesses || []) {
    data.places.push({ id: `fsa/${b.name}/${b.lon}`, kind: `food:${b.kind}`, name: b.name, lon: b.lon, lat: b.lat, rating: b.rating });
  }
  for (const v of town.vacant || []) data.places.push({ ...v, kind: 'vacant' });
  for (const b of planning?.brownfield || []) data.places.push({ id: `brownfield/${b.reference}`, kind: 'land:brownfield', name: b.name, lon: b.lon, lat: b.lat, hectares: b.hectares, maxDwellings: b.maxDwellings, permission: b.permission });
  for (const l of planning?.listed || []) data.places.push({ id: `listed/${l.name}`, kind: 'heritage:listed', name: l.name, grade: l.grade, lon: l.lon, lat: l.lat });
  // Flood zone of a point: 3 (highest risk), 2, or 0.
  const zones = (flood?.features || []).map((f) => ({ zone: f.properties.flood_zone === 'FZ3' ? 3 : 2, geometry: f.geometry, box: boxOf(f.geometry) }));
  const floodZoneOf = ([lon, lat]) => {
    let z = 0;
    for (const f of zones) {
      if (f.zone <= z || lon < f.box[0] || lon > f.box[2] || lat < f.box[1] || lat > f.box[3]) continue;
      if (pointInGeometry([lon, lat], f.geometry)) z = f.zone;
    }
    return z;
  };
  if (zones.length) for (const h of data.homes) h.floodZone = floodZoneOf([h.lon, h.lat]);
  const areas = census?.areas ? census.areas.map((a) => ({ ...a })) : [];
  if (areas.length) {
    attachCensus(data, areas);
    attachNeed(areas);
    if (history) attachHistory(areas, { growth: history.growth, then: history.census2011 });
    attachLayers(areas, { deprivation, crime, prices, jobs, income, wards });
    if (zones.length) {
      const acc = new Map();
      for (const h of data.homes) {
        if (!h.area) continue;
        const a = acc.get(h.area) || { all: 0, fz2: 0, fz3: 0 };
        a.all += h.w ?? 1;
        if (h.floodZone >= 2) a.fz2 += h.w ?? 1;
        if (h.floodZone === 3) a.fz3 += h.w ?? 1;
        acc.set(h.area, a);
      }
      for (const a of areas) {
        const f = acc.get(a.code);
        a.floodZone2Share = f?.all ? Math.round((f.fz2 / f.all) * 1000) / 1000 : 0;
        a.floodZone3Share = f?.all ? Math.round((f.fz3 / f.all) * 1000) / 1000 : 0;
      }
    }
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
    hasFlood: zones.length > 0,
    floodZoneOf,
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
