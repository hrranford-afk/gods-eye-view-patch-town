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

/** Amenities that count as places people meet ("third places"). */
const MEET_AMENITIES = Object.freeze({
  cafe: 'cafe', pub: 'pub', bar: 'pub', library: 'library',
  community_centre: 'community', social_centre: 'community', arts_centre: 'community',
  place_of_worship: 'worship',
});

/** Public green space kind for a way's tags, or null. */
export function greenKind(tags = {}) {
  if (tags.access === 'private' || tags.access === 'no') return null;
  if (tags.natural === 'wood' || tags.landuse === 'forest') return 'green:wood';
  if (tags.leisure === 'playground') return 'green:playground';
  if (tags.leisure === 'nature_reserve') return 'green:nature';
  if (['park', 'common', 'recreation_ground', 'village_green'].includes(tags.leisure)) return 'green:park';
  if (['recreation_ground', 'village_green'].includes(tags.landuse)) return 'green:park';
  if (tags.leisure === 'garden' && tags['garden:type'] !== 'residential' && tags.name) return 'green:park';
  return null;
}

/**
 * Points you can reach a green space from: every corner of its outline at
 * least `spacingM` apart. A big park reached only at its middle would look
 * far from the homes along its edge.
 */
function accessPoints(coords, spacingM = 60) {
  const out = [];
  let last = null;
  for (const c of coords) {
    if (!last || Math.hypot((c[0] - last[0]) * 68_000, (c[1] - last[1]) * 111_000) >= spacingM) {
      out.push(c);
      last = c;
    }
  }
  return out;
}

/**
 * Cycle provision on a way: 'track' (a cycleway, or a path designated for
 * bikes), 'lane' (a painted or protected lane on a road), or null.
 */
export function cycleKind(tags = {}) {
  if (tags.highway === 'cycleway' || ((tags.highway === 'path' || tags.highway === 'footway') && tags.bicycle === 'designated')) return 'track';
  const sides = [tags.cycleway, tags['cycleway:both'], tags['cycleway:left'], tags['cycleway:right']];
  if (sides.some((v) => v === 'lane' || v === 'track' || v === 'share_busway')) return 'lane';
  return null;
}

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
 * Bigger areas get more pieces (about 0.01 square degrees each, never fewer
 * than 3×3), so a county doesn't time out the servers.
 */
export function overpassQueries(town, { tiles, timeoutS = 180 } = {}) {
  const [s, w, n, e] = town.bbox;
  tiles ??= Math.max(3, Math.ceil(Math.sqrt(((n - s) * (e - w)) / 0.01)));
  const queries = [];
  for (let i = 0; i < tiles; i++) {
    for (let j = 0; j < tiles; j++) {
      const box = [
        s + ((n - s) * i) / tiles, w + ((e - w) * j) / tiles,
        s + ((n - s) * (i + 1)) / tiles, w + ((e - w) * (j + 1)) / tiles,
      ].map((x) => x.toFixed(5));
      const b = `(${box.join(',')})`;
      queries.push(`[out:json][timeout:${timeoutS}];(way["highway"]${b};way["waterway"="river"]${b};way["leisure"~"^(park|playground|nature_reserve|common|recreation_ground|village_green|garden)$"]${b};way["landuse"~"^(recreation_ground|village_green|forest)$"]${b};way["natural"="wood"]${b};);out geom;`);
      queries.push(`[out:json][timeout:${timeoutS}];
(
  nwr["shop"~"^(supermarket|convenience|greengrocer|butcher|bakery)$"]${b};
  nwr["amenity"="school"]${b};
  nwr["amenity"~"^(doctors|clinic)$"]${b};
  nwr["healthcare"~"^(doctor|clinic)$"]${b};
  node["highway"="bus_stop"]${b};
  nwr["amenity"~"^(${Object.keys(MEET_AMENITIES).join('|')}|pharmacy|dentist|bicycle_parking)$"]${b};
  nwr["healthcare"~"^(pharmacy|dentist)$"]${b};
  node["natural"="tree"]${b};
  nwr["shop"="vacant"]${b};
  nwr["disused:shop"]${b};
  nwr["was:shop"]${b};
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
  if (tags.shop === 'vacant' || tags['disused:shop'] || tags['was:shop'] || tags['abandoned:shop']) return 'vacant';
  if (tags.shop) return 'shop';
  if (tags.amenity === 'school') return 'school';
  if (tags.amenity === 'doctors' || tags.amenity === 'clinic') return 'gp';
  if (tags.healthcare === 'doctor' || tags.healthcare === 'clinic') return 'gp';
  if (tags.highway === 'bus_stop') return 'bus';
  if (MEET_AMENITIES[tags.amenity]) return `meet:${MEET_AMENITIES[tags.amenity]}`;
  if (tags.amenity === 'pharmacy' || tags.healthcare === 'pharmacy') return 'health:pharmacy';
  if (tags.amenity === 'dentist' || tags.healthcare === 'dentist') return 'health:dentist';
  if (tags.amenity === 'bicycle_parking') return 'cycle:parking';
  if (tags.natural === 'tree') return 'tree';
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
  const rivers = [];
  const places = [];
  const vacant = [];
  const homes = [];
  for (const el of json?.elements || []) {
    const tags = el.tags || {};
    if (el.type === 'way' && tags.waterway === 'river' && Array.isArray(el.geometry)) {
      rivers.push({ id: el.id, name: tags.name || '', coords: el.geometry.map((g) => [g.lon, g.lat]) });
      continue;
    }
    const green = el.type === 'way' && !tags.highway && Array.isArray(el.geometry) ? greenKind(tags) : null;
    if (green) {
      accessPoints(el.geometry.map((g) => [g.lon, g.lat])).forEach(([lon, lat], k) => {
        places.push({ id: `way/${el.id}#${k}`, kind: green, name: tags.name || '', lon, lat });
      });
      continue;
    }
    if (el.type === 'way' && tags.highway && Array.isArray(el.geometry)) {
      if (el.nodes?.length !== el.geometry.length) continue;
      roads.push({
        id: el.id,
        kind: roadKind(tags.highway),
        walk: !NO_WALK.has(tags.highway) && tags.foot !== 'no' && tags.access !== 'private',
        cycle: cycleKind(tags),
        drive: !/^(footway|path|pedestrian|steps|cycleway|bridleway|track|corridor|construction|proposed)$/.test(tags.highway)
          && tags.motor_vehicle !== 'no' && tags.access !== 'no' && tags.access !== 'private',
        name: tags.name || tags.ref || '',
        nodes: el.nodes,
        coords: el.geometry.map((g) => [g.lon, g.lat]),
      });
      continue;
    }
    const point = elementPoint(el);
    if (!point) continue;
    const kind = placeKind(tags);
    if (kind === 'vacant') {
      // Empty shops are kept apart from services so they never count as one.
      vacant.push({ id: `${el.type}/${el.id}`, name: tags.name || tags['disused:name'] || tags['was:name'] || '', was: tags['disused:shop'] || tags['was:shop'] || '', checked: tags.check_date || null, lon: point[0], lat: point[1] });
    } else if (kind) {
      places.push({ id: `${el.type}/${el.id}`, kind, name: tags.name || '', lon: point[0], lat: point[1] });
    } else if (tags.building) {
      homes.push({ id: `${el.type}/${el.id}`, b: tags.building, lon: point[0], lat: point[1] });
    }
  }
  return { town: townId, fetchedAt: new Date().toISOString(), roads, rivers, places, vacant, homes };
}
