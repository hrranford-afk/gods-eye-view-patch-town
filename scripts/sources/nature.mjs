/**
 * Wave-2 sources about nature and community life: OS Open Greenspace,
 * Natural England designations and habitats, the Charity Commission register.
 * Loaded automatically by `npm run planner -- stats <town> <id>`.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { geocodePostcodes, lonLatToEN, osgbToLonLat, round } from '../planner-sources.mjs';

const M_PER_DEG_LAT = 111200;

/** Flat-earth metres from a reference latitude: [lon, lat] → [x, y]. */
export const toMetres = (lon, lat, lat0) => [lon * M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180), lat * M_PER_DEG_LAT];

/** Weighted share of homes for which `test(home)` is true, per neighbourhood. */
export function homeShareByArea(homes, test) {
  const acc = {};
  for (const h of homes) {
    if (!h.area) continue;
    const a = (acc[h.area] ||= { yes: 0, all: 0 });
    const w = h.w ?? 1;
    a.all += w;
    if (test(h)) a.yes += w;
  }
  return Object.fromEntries(Object.entries(acc).map(([k, { yes, all }]) => [k, all ? round(yes / all) : null]));
}

/** Is `home` within `metres` of any point in `grid` (a Map from cell key → [x, y] list, cell size `metres`)? */
export function nearAny(grid, x, y, metres) {
  const cx = Math.floor(x / metres), cy = Math.floor(y / metres);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const [px, py] of grid.get(`${cx + dx},${cy + dy}`) || []) if ((px - x) ** 2 + (py - y) ** 2 <= metres * metres) return true;
  return false;
}

export function pointGrid(points, metres) {
  const grid = new Map();
  for (const [x, y] of points) {
    const k = `${Math.floor(x / metres)},${Math.floor(y / metres)}`;
    (grid.get(k) || grid.set(k, []).get(k)).push([x, y]);
  }
  return grid;
}

/** Python run on the OS GeoPackage: access points in an OSGB box, with their site's function and name. */
const GREENSPACE_PY = `
import sqlite3, struct, sys, json
db, e0, n0, e1, n1 = sys.argv[1], *map(float, sys.argv[2:6])
c = sqlite3.connect('file:' + db + '?mode=ro', uri=True)
sites = {}
rows = c.execute('''select p.id, p.access_type, p.geometry, p.ref_to_greenspace_site, s.function, s.distinctive_name_1
  from access_point p join rtree_access_point_geometry r on r.id = p.fid
  left join greenspace_site s on s.id = p.ref_to_greenspace_site
  where r.maxx >= ? and r.minx <= ? and r.maxy >= ? and r.miny <= ?''', (e0, e1, n0, n1)).fetchall()
out = []
for pid, kind, g, site, fn, name in rows:
    env = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}[(g[3] >> 1) & 7]
    x, y = struct.unpack('<dd', g[8 + env + 5:8 + env + 21])
    out.append([pid, kind, round(x, 1), round(y, 1), site, fn, name])
print(json.dumps(out))
`;

/** Turn the python rows into places and the list of public park/garden access points. */
export function greenspaceRows(rows) {
  return rows.map(([id, accessType, E, N, site, fn, name]) => {
    const [lon, lat] = osgbToLonLat(E, N);
    return { kind: 'greenspace:access', id: `osgs/${id}`, name: name || fn || 'greenspace entrance', lon, lat, siteId: site, function: fn || 'Unknown', accessType };
  });
}

/**
 * OS Open Greenspace: entrances to public green spaces, and how many homes are
 * within 300 m of a public park or garden entrance. Level: point.
 */
export const SOURCES = {
  async osGreenspace(ctx) {
    const zip = await ctx.cached('https://api.os.uk/downloads/v1/products/OpenGreenspace/downloads?area=GB&format=GeoPackage&redirect', 'opgrsp_gpkg_gb.zip');
    // No smaller GeoPackage is offered; the GB file is ~60 MB zipped, ~145 MB unzipped.
    const dir = path.join(path.dirname(zip), 'opgrsp-gb');
    spawnSync('unzip', ['-oq', zip, 'Data/opgrsp_gb.gpkg', '-d', dir]);
    const [s, w, n, e] = ctx.town.bbox;
    const corners = [lonLatToEN(w, s), lonLatToEN(e, s), lonLatToEN(w, n), lonLatToEN(e, n)];
    const box = [Math.min(...corners.map((c) => c[0])) - 600, Math.min(...corners.map((c) => c[1])) - 600, Math.max(...corners.map((c) => c[0])) + 600, Math.max(...corners.map((c) => c[1])) + 600];
    const run = spawnSync('python3', ['-I', '-c', GREENSPACE_PY, path.join(dir, 'Data', 'opgrsp_gb.gpkg'), ...box.map(String)], { encoding: 'utf8', maxBuffer: 1 << 28 });
    if (run.status !== 0) throw new Error(`reading the GeoPackage failed: ${run.stderr.slice(0, 300)}`);
    const places = greenspaceRows(JSON.parse(run.stdout));
    const lat0 = (s + n) / 2;
    const parkEntrances = places.filter((p) => p.function === 'Public Park Or Garden').map((p) => toMetres(p.lon, p.lat, lat0));
    const grid = pointGrid(parkEntrances, 300);
    const byShare = homeShareByArea(ctx.homes, (h) => nearAny(grid, ...toMetres(h.lon, h.lat, lat0), 300));
    const byArea = {};
    for (const a of ctx.areas) byArea[a.code] = { greenspaceAccessWithin300m: byShare[a.code] ?? null };
    const byFunction = {};
    for (const p of places) byFunction[p.function] = (byFunction[p.function] || 0) + 1;
    return {
      source: 'OS Open Greenspace (access points)', level: 'point (shares per neighbourhood)', period: 'April 2026 release',
      fields: { greenspaceAccessWithin300m: 'share of homes (0 to 1) within 300 m straight line of an entrance to a public park or garden' },
      byArea,
      council: { accessPoints: places.length, publicParkEntrances: parkEntrances.length, accessPointsByFunction: byFunction },
      places,
    };
  },
};

const ARCGIS = 'https://services.arcgis.com/JJzESW51TqeY9uat/ArcGIS/rest/services';

/** Query an ArcGIS FeatureServer layer by envelope (lon/lat), paging through all results. */
async function arcgisQuery(layer, bbox, { geometry = true, fields = '*' } = {}) {
  const [s, w, n, e] = bbox;
  const out = [];
  for (let offset = 0; ; ) {
    const q = new URLSearchParams({ where: '1=1', geometry: `${w},${s},${e},${n}`, geometryType: 'esriGeometryEnvelope', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: fields, outSR: '4326', returnGeometry: String(geometry), resultOffset: String(offset), resultRecordCount: '500', f: 'json' });
    const res = await fetch(`${ARCGIS}/${layer}/FeatureServer/0/query?${q}`);
    if (!res.ok) throw new Error(`ArcGIS ${layer} answered ${res.status}`);
    const body = await res.json();
    if (body.error) throw new Error(`ArcGIS ${layer}: ${body.error.message}`);
    out.push(...body.features);
    if (!body.exceededTransferLimit || !body.features.length) return out;
    offset += body.features.length;
  }
}

/** Area-weighted centre of a ring [[lon, lat], ...]; falls back to the vertex mean for a degenerate ring. */
export function ringCentre(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[i + 1], f = x1 * y2 - x2 * y1;
    a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
  }
  if (Math.abs(a) < 1e-18) return [ring.reduce((t, p) => t + p[0], 0) / ring.length, ring.reduce((t, p) => t + p[1], 0) / ring.length];
  return [cx / (3 * a), cy / (3 * a)];
}

/** Is [x, y] inside the ring (even-odd)? */
export function inRing(ring, [x, y]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** A point that is inside the biggest ring: its centre if it fits, else the middle of a horizontal chord through it. */
export function representativePoint(rings) {
  const ring = [...rings].sort((p, q) => q.length - p.length)[0];
  const c = ringCentre(ring);
  if (inRing(ring, c)) return c;
  const xs = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[i + 1];
    if (y1 > c[1] !== y2 > c[1]) xs.push(x1 + ((c[1] - y1) * (x2 - x1)) / (y2 - y1));
  }
  xs.sort((p, q) => p - q);
  return xs.length >= 2 ? [(xs[0] + xs[1]) / 2, c[1]] : ring[0];
}

/** Shortest distance in metres from [x, y] to a polyline of metre points. */
export function distToPath(p, path) {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i], [bx, by] = path[i + 1], dx = bx - ax, dy = by - ay;
    const t = dx || dy ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy))) : 0;
    best = Math.min(best, Math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy));
  }
  return best;
}

/** Is a home within `metres` of the boundary of, or inside, any site (rings in lon/lat)? */
export function nearSite(h, sites, metres, lat0) {
  const p = toMetres(h.lon, h.lat, lat0);
  for (const site of sites) {
    const [x0, y0, x1, y1] = site.box;
    if (h.lon < x0 - 0.02 || h.lon > x1 + 0.02 || h.lat < y0 - 0.02 || h.lat > y1 + 0.02) continue;
    for (const ring of site.rings) {
      if (inRing(ring, [h.lon, h.lat]) || distToPath(p, ring.map(([x, y]) => toMetres(x, y, lat0))) <= metres) return true;
    }
  }
  return false;
}

const siteFrom = (f, kind, idOf) => {
  const rings = f.geometry.rings;
  const flat = rings.flat();
  const [lon, lat] = representativePoint(rings);
  return {
    kind, id: idOf(f.attributes), name: String(f.attributes.NAME).replace(/\s+(SSSI|LNR)$/i, '').replace(/\b([A-Z])([A-Z]+)\b/g, (_, a, b) => a + b.toLowerCase()),
    lon: round(lon, 6), lat: round(lat, 6), hectares: round(f.attributes.MEASURE, 1),
    rings, box: [Math.min(...flat.map((p) => p[0])), Math.min(...flat.map((p) => p[1])), Math.max(...flat.map((p) => p[0])), Math.max(...flat.map((p) => p[1]))],
  };
};

/** Total hectares by main habitat from Priority Habitat Inventory features. */
export function habitatHectares(features) {
  const out = {};
  for (const { attributes: a } of features) {
    const k = a.MainHabs || 'Unknown';
    out[k] = round((out[k] || 0) + (Number(a.AreaHa) || 0), 1);
  }
  return out;
}

/**
 * Natural England: SSSIs, Local Nature Reserves and the Priority Habitat
 * Inventory touching the town. Level: polygon.
 */
SOURCES.habitats = async (ctx) => {
  // Look a little beyond the town: a reserve just outside still counts for homes at the edge.
  const [s, w, n, e] = ctx.town.bbox;
  const pad = 0.02;
  const wide = [s - pad, w - pad, n + pad, e + pad];
  const sssi = (await arcgisQuery('SSSI_England', wide)).map((f) => siteFrom(f, 'nature:sssi', (a) => `sssi/${a.REF_CODE}`));
  const lnr = (await arcgisQuery('Local_Nature_Reserves_England', wide)).map((f) => siteFrom(f, 'nature:lnr', (a) => `lnr/${a.REF_CODE}`));
  const habitats = await arcgisQuery('Priority_Habitats_Inventory_England', ctx.town.bbox, { geometry: false, fields: 'MainHabs,AreaHa' });
  const lat0 = (s + n) / 2;
  const sites = [...sssi, ...lnr];
  const byShare = homeShareByArea(ctx.homes, (h) => nearSite(h, sites, 1000, lat0));
  const byArea = {};
  for (const a of ctx.areas) byArea[a.code] = { natureReserveWithin1km: byShare[a.code] ?? null };
  const inBox = (x) => x.lon >= w && x.lon <= e && x.lat >= s && x.lat <= n;
  const places = sites.filter(inBox).map(({ rings, box, ...p }) => p);
  const sumHa = (list) => round(list.reduce((t, p) => t + (p.hectares || 0), 0), 1);
  return {
    source: 'Natural England open data (SSSI, Local Nature Reserves, Priority Habitat Inventory)', level: 'polygon (shares per neighbourhood)', period: 'current national layers',
    fields: { natureReserveWithin1km: 'share of homes (0 to 1) within 1 km of a Local Nature Reserve or SSSI (inside it, or its boundary within 1 km)' },
    byArea,
    council: { lnrHectares: sumHa(places.filter((p) => p.kind === 'nature:lnr')), sssiHectares: sumHa(places.filter((p) => p.kind === 'nature:sssi')), lnrCount: places.filter((p) => p.kind === 'nature:lnr').length, sssiCount: places.filter((p) => p.kind === 'nature:sssi').length, priorityHabitatHectaresByType: habitatHectares(habitats), note: 'whole-site hectares for sites whose centre lies in the town box; habitat hectares are whole polygons touching the box' },
    places,
  };
};

/** Python run on the Charity Commission JSON (one record per line, stdin): registered charities in the given postcode districts. */
const CHARITY_PY = `
import sys, json
districts = set(sys.argv[1:])
seen, out = set(), []
for line in sys.stdin:
    line = line.lstrip('\\ufeff[,').strip().rstrip(',]')
    if not line.startswith('{'):
        continue
    r = json.loads(line)
    pc = (r.get('charity_contact_postcode') or '').strip().upper()
    if r.get('charity_registration_status') != 'Registered' or not pc or pc.split(' ')[0] not in districts:
        continue
    num = r['registered_charity_number']
    if num in seen:
        continue
    seen.add(num)
    out.append([num, r['charity_name'], pc, r.get('latest_income')])
print(json.dumps(out))
`;

/** Income band of a charity's latest income (pounds a year). */
export function incomeBand(income) {
  if (income == null) return 'unknown';
  if (income < 10000) return 'under10k';
  if (income < 100000) return 'from10kTo100k';
  if (income < 1000000) return 'from100kTo1m';
  return 'over1m';
}

/** First polygon (GeoJSON, lon/lat) of `areas` that contains the point. */
export function areaAt(areas, pt) {
  for (const a of areas) {
    const g = a.geometry;
    if (!g) continue;
    const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
    for (const rings of polys) if (inRing(rings[0], pt) && !rings.slice(1).some((r) => inRing(r, pt))) return a.code;
  }
  return null;
}

/**
 * Registered charities (Charity Commission register) by registered postcode,
 * counted per 1,000 residents. Level: address (postcode centre).
 */
SOURCES.charities = async (ctx) => {
  const zip = await ctx.cached('https://ccewuksprdoneregsadata1.blob.core.windows.net/data/json/publicextract.charity.zip', 'publicextract.charity.zip');
  const districts = ctx.town.postcodeDistricts || [];
  const run = spawnSync('sh', ['-c', `unzip -p "${zip}" publicextract.charity.json | python3 -I -c "$PY" ${districts.join(' ')}`], { encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, PY: CHARITY_PY } });
  if (run.status !== 0) throw new Error(`reading the charity register failed: ${run.stderr.slice(0, 300)}`);
  const rows = JSON.parse(run.stdout);
  const where = await geocodePostcodes(rows.map((r) => r[2]));
  const census = JSON.parse(readFileSync(path.join(ctx.dir, 'census.json'), 'utf8')).areas;
  const places = [];
  const counts = {};
  const bands = {};
  for (const [num, name, pc, income] of rows) {
    const ll = where[pc];
    if (!ll) continue;
    const area = areaAt(census, ll);
    places.push({ kind: 'charity', id: `charity/${num}`, name, lon: round(ll[0], 6), lat: round(ll[1], 6), income, area });
    if (area) counts[area] = (counts[area] || 0) + 1;
    const b = incomeBand(income);
    bands[b] = (bands[b] || 0) + 1;
  }
  const byArea = {};
  for (const a of census) byArea[a.code] = { charitiesPer1000: a.residents ? round(((counts[a.code] || 0) / a.residents) * 1000, 2) : null };
  return {
    source: 'Charity Commission register of charities, by registered postcode', level: 'address (postcode centre)', period: `register extract, ${new Date().toISOString().slice(0, 10)}`,
    fields: { charitiesPer1000: 'registered, not-removed charities with a registered postcode in the neighbourhood, per 1,000 residents (registered address is not always where a charity works)' },
    byArea,
    council: { charities: places.length, incomeBands: bands, postcodeDistricts: districts, note: 'registered address is not where a charity works; a few large charities register at one office' },
    places,
  };
};
