/**
 * Census 2021 for a town: households, residents and how people travel to
 * work, per LSOA (a neighbourhood of roughly 650 households), from ONS.
 *
 * OpenStreetMap knows where buildings are; the census knows how many
 * households live in each neighbourhood. attachCensus shares each
 * neighbourhood's households across its residential buildings, so every
 * home gets a weight `w` (households it stands for) and totals match the
 * census instead of whatever happens to be tagged on the map.
 */

/** Census travel-to-work categories collapsed to the modes the planner uses. */
export const TRAVEL_MODES = Object.freeze({
  'Work mainly at or from home': 'home',
  'Underground, metro, light rail, tram': 'rail',
  Train: 'rail',
  'Bus, minibus or coach': 'bus',
  Taxi: 'car',
  'Motorcycle, scooter or moped': 'car',
  'Driving a car or van': 'car',
  'Passenger in a car or van': 'car',
  Bicycle: 'cycle',
  'On foot': 'walk',
  'Other method of travel to work': 'other',
});

/** Buildings tagged as flats hold several households; houses one. */
const BUILDING_WEIGHT = Object.freeze({ apartments: 6, flats: 6, residential: 2 });

/** Ray-casting point-in-polygon for a GeoJSON Polygon or MultiPolygon. */
export function pointInGeometry([x, y], geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const rings of polys) {
    let inside = false;
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
    if (inside) return true;
  }
  return false;
}

function bboxOf(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let w = Infinity; let s = Infinity; let e = -Infinity; let n = -Infinity;
  for (const rings of polys) for (const [x, y] of rings[0]) {
    if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y;
  }
  return [w, s, e, n];
}

/**
 * Build census areas from ONS boundaries (GeoJSON features with LSOA21CD /
 * LSOA21NM) and Nomis CSV rows (households, residents, travel to work).
 */
export function buildAreas(boundaries, { households, residents, travel }) {
  const byCode = new Map();
  for (const f of boundaries.features) {
    const code = f.properties.LSOA21CD;
    byCode.set(code, {
      code,
      name: f.properties.LSOA21NM,
      households: 0,
      residents: 0,
      travel: { car: 0, bus: 0, rail: 0, cycle: 0, walk: 0, home: 0, other: 0, total: 0 },
      geometry: f.geometry,
    });
  }
  for (const r of households) {
    const a = byCode.get(r.GEOGRAPHY_CODE);
    if (a) a.households = Number(r.OBS_VALUE);
  }
  for (const r of residents) {
    const a = byCode.get(r.GEOGRAPHY_CODE);
    if (a && /^Total/.test(r.C2021_RESTYPE_3_NAME)) a.residents = Number(r.OBS_VALUE);
  }
  for (const r of travel) {
    const a = byCode.get(r.GEOGRAPHY_CODE);
    if (!a) continue;
    const name = r.C2021_TTWMETH_12_NAME;
    if (/^Total/.test(name)) a.travel.total = Number(r.OBS_VALUE);
    else if (TRAVEL_MODES[name]) a.travel[TRAVEL_MODES[name]] += Number(r.OBS_VALUE);
  }
  return [...byCode.values()];
}

/**
 * Give every home a census weight. Homes inside no area keep w = 0 and drop
 * out of the scores; areas with no mapped buildings are reported, since
 * their households can't be placed.
 */
export function attachCensus(town, areas) {
  const boxes = areas.map((a) => bboxOf(a.geometry));
  const members = areas.map(() => []);
  for (const h of town.homes) {
    h.w = 0;
    h.area = null;
    for (let k = 0; k < areas.length; k++) {
      const [w, s, e, n] = boxes[k];
      if (h.lon < w || h.lon > e || h.lat < s || h.lat > n) continue;
      if (pointInGeometry([h.lon, h.lat], areas[k].geometry)) { members[k].push(h); break; }
    }
  }
  const unplaced = [];
  areas.forEach((a, k) => {
    const homes = members[k];
    const units = homes.reduce((n, h) => n + (BUILDING_WEIGHT[h.b] || 1), 0);
    if (!units) { if (a.households) unplaced.push(a.code); return; }
    for (const h of homes) {
      h.w = (a.households * (BUILDING_WEIGHT[h.b] || 1)) / units;
      h.area = a.code;
    }
  });
  return { unplaced };
}

/** Areas as GeoJSON with travel shares, for the map. */
export function areasToGeoJson(areas) {
  const pct = (x, t) => (t ? Math.round((x / t) * 100) : 0);
  return {
    type: 'FeatureCollection',
    features: areas.map((a) => {
      const t = a.travel.total - a.travel.home; // people who actually travel
      return {
        type: 'Feature',
        geometry: a.geometry,
        properties: {
          code: a.code,
          name: a.name,
          households: a.households,
          residents: a.residents,
          carPct: pct(a.travel.car, t),
          busPct: pct(a.travel.bus, t),
          cyclePct: pct(a.travel.cycle, t),
          walkPct: pct(a.travel.walk, t),
          homePct: pct(a.travel.home, a.travel.total),
        },
      };
    }),
  };
}
