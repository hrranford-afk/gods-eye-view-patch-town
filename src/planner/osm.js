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

/** Overpass QL for one town's roads, services and homes. */
export function overpassQuery(town, { timeoutS = 180 } = {}) {
  const b = `(${town.bbox.join(',')})`;
  return `[out:json][timeout:${timeoutS}];
(
  way["highway"]${b};
)->.roads;
(
  nwr["shop"~"^(supermarket|convenience|greengrocer|butcher|bakery)$"]${b};
  nwr["amenity"="school"]${b};
  nwr["amenity"~"^(doctors|clinic)$"]${b};
  nwr["healthcare"~"^(doctor|clinic)$"]${b};
  node["highway"="bus_stop"]${b};
  way["building"~"^(${HOME_BUILDINGS.join('|')})$"]${b};
)->.things;
.roads out geom;
.things out center tags;`;
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
      homes.push({ id: `${el.type}/${el.id}`, lon: point[0], lat: point[1] });
    }
  }
  return { town: townId, fetchedAt: new Date().toISOString(), roads, places, homes };
}
