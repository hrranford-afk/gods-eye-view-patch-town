/**
 * OpenStreetMap → planner town data.
 *
 * The planner works on one small, plain JSON shape (a "town file") so any
 * script or AI can read or produce it without knowing OSM:
 *
 *   {
 *     town: 'worcester', fetchedAt: ISO string,
 *     roads:  [{ id, kind, walk: bool, nodes: [nodeId...], coords: [[lon,lat]...] }],
 *     places: [{ id, kind, name, lon, lat }],   // kind ∈ SERVICE_KINDS
 *     homes:  [{ id, lon, lat }],
 *   }
 */

/** Services every home is scored against, with a walking-time target. */
export const SERVICE_KINDS = Object.freeze({
  shop: Object.freeze({ label: 'Food shop', targetMin: 10 }),
  school: Object.freeze({ label: 'School', targetMin: 15 }),
  gp: Object.freeze({ label: 'GP / clinic', targetMin: 15 }),
  bus: Object.freeze({ label: 'Bus stop', targetMin: 5 }),
});

const HOME_BUILDINGS = [
  'house', 'residential', 'apartments', 'detached', 'semidetached_house',
  'terrace', 'bungalow', 'flats',
  // Most UK buildings are just `yes`; census weights (census.js) decide how
  // many households each actually holds.
  'yes',
];

/** Roads people cannot (or should not) walk along. */
const NO_WALK = new Set(['motorway', 'motorway_link', 'construction', 'proposed', 'raceway']);

/** Collapse OSM highway values into a few kinds a map can colour. */
export function roadKind(highway) {
  if (/^(motorway|trunk|primary)(_link)?$/.test(highway)) return 'major';
  if (/^(secondary|tertiary)(_link)?$/.test(highway)) return 'distributor';
  if (/^(residential|unclassified|living_street|service|road)$/.test(highway)) return 'local';
  if (/^(footway|path|pedestrian|steps|cycleway|bridleway|track|corridor)$/.test(highway)) return 'path';
  return 'other';
}

/**
 * Overpass QL for one town, split into small requests that busy public
 * servers will answer: the bbox is cut into `tiles`×`tiles` pieces and each
 * piece is asked for roads and for things (services + homes) separately.
 * Results overlap at tile edges; mergeOverpass removes the duplicates.
 */
export function overpassQueries(town, { tiles = 3, timeoutS = 180 } = {}) {
  const [s, w, n, e] = town.bbox;
  const queries = [];
  for (let i = 0; i < tiles; i++) {
    for (let j = 0; j < tiles; j++) {
      const box = [
        s + ((n - s) * i) / tiles, w + ((e - w) * j) / tiles,
        s + ((n - s) * (i + 1)) / tiles, w + ((e - w) * (j + 1)) / tiles,
      ].map((x) => x.toFixed(5));
      const b = `(${box.join(',')})`;
      queries.push(`[out:json][timeout:${timeoutS}];way["highway"]${b};out geom;`);
      queries.push(`[out:json][timeout:${timeoutS}];
(
  nwr["shop"~"^(supermarket|convenience|greengrocer|butcher|bakery)$"]${b};
  nwr["amenity"="school"]${b};
  nwr["amenity"~"^(doctors|clinic)$"]${b};
  nwr["healthcare"~"^(doctor|clinic)$"]${b};
  node["highway"="bus_stop"]${b};
  way["building"~"^(${HOME_BUILDINGS.join('|')})$"]${b};
);
out center tags;`);
    }
  }
  return queries;
}

/** Join several Overpass responses, keeping one copy of each element. */
export function mergeOverpass(responses) {
  const seen = new Map();
  for (const r of responses) {
    for (const el of r?.elements || []) seen.set(`${el.type}/${el.id}`, el);
  }
  return { elements: [...seen.values()] };
}

function placeKind(tags = {}) {
  if (tags.shop) return 'shop';
  if (tags.amenity === 'school') return 'school';
  if (tags.amenity === 'doctors' || tags.amenity === 'clinic') return 'gp';
  if (tags.healthcare === 'doctor' || tags.healthcare === 'clinic') return 'gp';
  if (tags.highway === 'bus_stop') return 'bus';
  return null;
}

function elementPoint(el) {
  if (Number.isFinite(el.lat) && Number.isFinite(el.lon)) return [el.lon, el.lat];
  if (el.center) return [el.center.lon, el.center.lat];
  return null;
}

/** Convert a raw Overpass JSON response into a town file. */
export function parseOverpass(json, townId) {
  const roads = [];
  const places = [];
  const homes = [];
  for (const el of json?.elements || []) {
    const tags = el.tags || {};
    if (el.type === 'way' && tags.highway && Array.isArray(el.geometry)) {
      if (el.nodes?.length !== el.geometry.length) continue;
      roads.push({
        id: el.id,
        kind: roadKind(tags.highway),
        walk: !NO_WALK.has(tags.highway) && tags.foot !== 'no' && tags.access !== 'private',
        name: tags.name || tags.ref || '',
        nodes: el.nodes,
        coords: el.geometry.map((g) => [g.lon, g.lat]),
      });
      continue;
    }
    const point = elementPoint(el);
    if (!point) continue;
    const kind = placeKind(tags);
    if (kind) {
      places.push({ id: `${el.type}/${el.id}`, kind, name: tags.name || '', lon: point[0], lat: point[1] });
    } else if (tags.building) {
      homes.push({ id: `${el.type}/${el.id}`, b: tags.building, lon: point[0], lat: point[1] });
    }
  }
  return { town: townId, fetchedAt: new Date().toISOString(), roads, places, homes };
}
