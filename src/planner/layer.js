import * as Cesium from 'cesium';
import { SERVICE_KINDS } from './osm.js';
import { getTown } from './towns.js';

const ROAD_STYLE = Object.freeze({
  major: { color: '#ff8a3d', width: 4 },
  distributor: { color: '#ffd166', width: 3 },
  local: { color: '#ffffff', width: 1.5, alpha: 0.55 },
});
const PLACE_COLOR = Object.freeze({
  shop: '#4cc9f0', school: '#c77dff', gp: '#ff4d6d', bus: '#80ed99',
});

/**
 * Map themes, following the New Worcester compass. Each has its own switch
 * in the planner's theme panel; `on` is the default.
 */
export const THEMES = Object.freeze([
  { id: 'access', label: 'Walking access (grid)', on: true },
  { id: 'people', label: 'People: census neighbourhoods', on: false },
  { id: 'health', label: 'Health: GP surgeries', on: true },
  { id: 'meet', label: 'Meeting places', on: true },
  { id: 'food', label: 'Food and shops', on: false },
  { id: 'learning', label: 'Schools', on: false },
  { id: 'movement', label: 'Movement: roads, buses, crossings', on: true },
  { id: 'safety', label: 'Safety: serious and fatal road collisions', on: false },
  { id: 'flood', label: 'Flood zones', on: false },
  { id: 'land', label: 'Land: empty shops, brownfield', on: false },
  { id: 'heritage', label: 'Heritage: listed buildings, conservation areas', on: false },
  { id: 'ideas', label: 'Ideas: sites, scenarios, questions', on: true },
]);

/** Theme for a place kind. */
export function placeTheme(kind) {
  if (kind === 'gp') return 'health';
  if (kind.startsWith('collision:')) return 'safety';
  if (kind === 'school') return 'learning';
  if (kind === 'bus') return 'movement';
  if (kind.startsWith('meet:')) return 'meet';
  return 'food';
}

const THEME_KEY = 'gev:planner:themes';

function loadThemeState() {
  const state = Object.fromEntries(THEMES.map((t) => [t.id, t.on]));
  try {
    Object.assign(state, JSON.parse(localStorage.getItem(THEME_KEY) || '{}'));
  } catch {
    // Storage can be unavailable (private windows, blocked site data).
  }
  return state;
}

/** Red (badly served) → amber → green (everything within a short walk). */
export function scoreColor(score) {
  const t = Math.max(0, Math.min(1, score / 100));
  return Cesium.Color.fromHsl((t * 120) / 360, 0.9, 0.5, 0.62);
}

function cellDescription(p) {
  const rows = Object.entries(SERVICE_KINDS).map(([kind, { label, targetMin }]) => {
    const pct = Math.round((p.within?.[kind] ?? 0) * 100);
    return `<tr><td>${label}</td><td>${p.minutes?.[kind]} min</td><td>${pct}% ≤ ${targetMin} min</td></tr>`;
  }).join('');
  const detour = p.detour ? `<p>Walking detour: ${p.detour}× the straight line</p>` : '';
  return `<p><b>Score ${p.score}/100</b> · ${p.homes} homes</p><table>${rows}</table>${detour}`;
}

/**
 * Town Planner layer: walking-access grid, roads and services for one town,
 * read from the files `npm run planner -- analyse <town>` writes.
 */
export function createPlannerLayer({ townId = 'worcester', baseUrl = '/planner', fetchImpl = fetch } = {}) {
  const town = getTown(townId);
  let _dataSource = null;
  let _viewer = null;
  const _themes = loadThemeState();
  const _byTheme = {};
  // Entities of switched-off themes wait here until first switched on, so a
  // heavy hidden theme (flood zones) costs nothing.
  const _pending = {};
  let _panel = null;

  function setTheme(id, on) {
    _themes[id] = on;
    if (on && _pending[id]?.length && _dataSource) {
      const entities = _dataSource.entities;
      entities.suspendEvents();
      for (const options of _pending[id]) (_byTheme[id] ||= []).push(entities.add(options));
      entities.resumeEvents();
      _pending[id] = [];
    }
    for (const e of _byTheme[id] || []) e.show = on;
    try {
      localStorage.setItem(THEME_KEY, JSON.stringify(_themes));
    } catch {
      // Remembering the choice is a convenience; the map works without it.
    }
    _viewer?.scene?.requestRender();
  }

  /** A small panel of theme switches, shown while the layer is on. */
  function makePanel() {
    const el = document.createElement('div');
    el.className = 'planner-theme-panel';
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', 'Town Planner themes');
    Object.assign(el.style, {
      position: 'fixed', right: '16px', bottom: '96px', zIndex: 30, maxWidth: '260px',
      font: '12px monospace', color: '#e8f6ff', background: 'rgba(4,16,24,0.86)',
      border: '1px solid rgba(120,220,255,0.45)', borderRadius: '6px', padding: '8px 10px',
    });
    const title = document.createElement('div');
    title.textContent = `${town.name} · themes`;
    Object.assign(title.style, { fontWeight: '600', letterSpacing: '0.06em', marginBottom: '4px' });
    el.appendChild(title);
    for (const t of THEMES) {
      const row = document.createElement('label');
      Object.assign(row.style, { display: 'flex', gap: '6px', alignItems: 'center', padding: '2px 0', cursor: 'pointer' });
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = _themes[t.id] !== false;
      box.addEventListener('change', () => setTheme(t.id, box.checked));
      row.append(box, document.createTextNode(t.label));
      el.appendChild(row);
    }
    return el;
  }
  let _loaded = false;
  let _flown = false;
  let _count = 0;
  let _lastUpdate = null;
  let _lastError = null;

  async function getJson(name, signal) {
    const res = await fetchImpl(`${baseUrl}/${town.id}/${name}`, { signal });
    if (!res.ok) {
      throw new Error(`No planner data for ${town.name} — run: npm run planner -- fetch ${town.id} && npm run planner -- analyse ${town.id}`);
    }
    return res.json();
  }

  function draw({ access, roads, places, sites, areas, questions, river, bus, scenarios, vacant, flood, planning }) {
    const entities = _dataSource.entities;
    entities.suspendEvents();
    entities.removeAll();
    for (const t of THEMES) { _byTheme[t.id] = []; _pending[t.id] = []; }
    const add = (theme, options) => {
      if (_themes[theme] === false) {
        (_pending[theme] ||= []).push(options);
        return null;
      }
      const entity = entities.add(options);
      (_byTheme[theme] ||= []).push(entity);
      return entity;
    };
    // Environment Agency flood zones: Zone 3 darker than Zone 2.
    for (const f of flood?.features || []) {
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      const z3 = f.properties.flood_zone === 'FZ3';
      for (const rings of polys) {
        add('flood', {
          name: `Flood Zone ${z3 ? 3 : 2} (Environment Agency)`,
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(
              Cesium.Cartesian3.fromDegreesArray(rings[0].flat()),
              rings.slice(1).map((h) => new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(h.flat()))),
            ),
            material: Cesium.Color.fromCssColorString(z3 ? '#1c7ed6' : '#74c0fc').withAlpha(z3 ? 0.45 : 0.3),
            classificationType: Cesium.ClassificationType.TERRAIN,
          },
        });
      }
    }
    // Brownfield register: sized by how many homes the site could take.
    for (const b of planning?.brownfield || []) {
      add('land', {
        name: `Brownfield: ${b.name}`,
        position: Cesium.Cartesian3.fromDegrees(b.lon, b.lat),
        point: {
          pixelSize: Math.min(6 + Math.sqrt(b.maxDwellings || 0), 22),
          color: Cesium.Color.fromCssColorString('#e8590c').withAlpha(0.85),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        description: `<p>${b.hectares ?? '?'} ha · up to <b>${b.maxDwellings ?? '?'} homes</b></p><p>Permission: ${b.permission || 'none recorded'}</p>`,
      });
    }
    for (const l of planning?.listed || []) {
      add('heritage', {
        name: `Listed (Grade ${l.grade || '?'}): ${l.name}`,
        position: Cesium.Cartesian3.fromDegrees(l.lon, l.lat),
        point: { pixelSize: l.grade === 'I' ? 8 : 5, color: Cesium.Color.fromCssColorString('#b08968'), heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      });
    }
    for (const f of planning?.conservationAreas?.features || []) {
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const rings of polys) {
        add('heritage', {
          name: `Conservation area: ${f.properties.name}`,
          polyline: { positions: Cesium.Cartesian3.fromDegreesArray(rings[0].flat()), width: 2, material: Cesium.Color.fromCssColorString('#b08968').withAlpha(0.8), clampToGround: true },
        });
      }
    }
    // Census neighbourhoods: outlines only, click for how people get to work.
    for (const f of areas?.features || []) {
      const p = f.properties;
      const rings = f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map((poly) => poly[0]);
      for (const ring of rings) {
        add('people', {
          name: `${p.name} (Census 2021)`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(ring.flat()),
            width: 1.5,
            material: Cesium.Color.fromCssColorString('#7fdcff').withAlpha(0.5),
            clampToGround: true,
          },
          description: `<p><b>${p.households.toLocaleString()} households</b> · ${p.residents.toLocaleString()} residents</p>`
            + `<p>Getting to work (of those who travel): car ${p.carPct}% · bus ${p.busPct}% · cycle ${p.cyclePct}% · walk ${p.walkPct}%</p>`
            + `<p>Work from home: ${p.homePct}%</p>`,
        });
      }
    }
    for (const f of access.features) {
      const ring = f.geometry.coordinates[0];
      const p = f.properties;
      add('access', {
        name: `${town.name} · access ${p.score}/100`,
        rectangle: {
          coordinates: Cesium.Rectangle.fromDegrees(ring[0][0], ring[0][1], ring[2][0], ring[2][1]),
          material: scoreColor(p.score),
        },
        description: cellDescription(p),
      });
    }
    for (const f of roads.features) {
      const style = ROAD_STYLE[f.properties.kind];
      if (!style) continue;
      add('movement', {
        name: f.properties.name || f.properties.kind,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray(f.geometry.coordinates.flat()),
          width: style.width,
          material: Cesium.Color.fromCssColorString(style.color).withAlpha(style.alpha ?? 0.9),
          clampToGround: true,
        },
      });
    }
    for (const f of places.features) {
      // With a timetable, bus stops are drawn from it instead (with frequency).
      if (bus && f.properties.kind === 'bus') continue;
      // Green space is many edge points per park, and `school:<phase>` repeats
      // `school`: neither is drawn as dots. Slight collisions are too many to show.
      const k = f.properties.kind;
      if (k.startsWith('green:') || k.startsWith('school:') || k === 'collision:slight' || k.startsWith('land:') || k.startsWith('heritage:') || k === 'vacant' || k.startsWith('food:')) continue;
      const [lon, lat] = f.geometry.coordinates;
      const pr = f.properties;
      add(placeTheme(pr.kind), {
        name: pr.name || SERVICE_KINDS[pr.kind]?.label,
        description: pr.listSize
          ? `<p><b>${pr.listSize.toLocaleString()} registered patients</b> (NHS)</p><p>Waiting time acceptable: ${pr.waitAcceptablePct}% · Needs met: ${pr.needsMetPct}% (GP Patient Survey; England 66% / 90%)</p>`
          : pr.capacity
            ? `<p>${pr.phase} school · <b>${pr.pupils ?? '?'} pupils</b> in ${pr.capacity} places (${pr.pupils && pr.capacity ? Math.round((pr.pupils / pr.capacity) * 100) : '?'}% full)</p>`
            : undefined,
        position: Cesium.Cartesian3.fromDegrees(lon, lat),
        point: {
          pixelSize: k === 'bus' ? 4 : k === 'collision:fatal' ? 10 : 7,
          color: Cesium.Color.fromCssColorString(PLACE_COLOR[k] || (k.startsWith('meet:') ? '#ffa94d' : k === 'collision:fatal' ? '#e03131' : k === 'collision:serious' ? '#f08c00' : '#ffffff')),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }
    for (const f of sites?.features || []) {
      const [lon, lat] = f.geometry.coordinates;
      const p = f.properties;
      const label = SERVICE_KINDS[p.kind]?.label || p.kind;
      add('ideas', {
        name: `Suggested ${label.toLowerCase()} #${p.rank}`,
        position: Cesium.Cartesian3.fromDegrees(lon, lat),
        point: {
          pixelSize: 14,
          color: Cesium.Color.fromCssColorString(PLACE_COLOR[p.kind] || '#ffffff'),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 3,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        // Only each service's best site is labelled, so labels don't pile up.
        label: p.rank !== 1 ? undefined : {
          text: `+${label}: ${p.homesGained} homes`,
          font: '13px monospace',
          fillColor: Cesium.Color.WHITE,
          showBackground: true,
          pixelOffset: new Cesium.Cartesian2(0, -20),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        description: `<p>A new ${label.toLowerCase()} here would bring <b>${p.homesGained}</b> more homes within a ${SERVICE_KINDS[p.kind]?.targetMin}-minute walk.</p><p>A prompt to look closer, not a planning decision.</p>`,
      });
    }
    // Bus stops sized and coloured by daytime buses per hour.
    for (const st of bus?.stops || []) {
      if (st.perHour < 1) continue;
      const frequent = st.perHour >= 4;
      add('movement', {
        name: `${st.name}: ${st.perHour} buses/hour (7am–7pm)`,
        position: Cesium.Cartesian3.fromDegrees(st.lonLat[0], st.lonLat[1]),
        point: {
          pixelSize: Math.min(4 + st.perHour / 3, 14),
          color: Cesium.Color.fromCssColorString(frequent ? '#80ed99' : '#2f7a4a').withAlpha(0.9),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }
    // River crossings, and the best spot for a new footbridge if one was found.
    for (const c of river?.crossings || []) {
      add('movement', {
        name: `${c.name || 'Unnamed crossing'} (${c.drive ? 'road' : 'foot/cycle'})`,
        position: Cesium.Cartesian3.fromDegrees(c.lonLat[0], c.lonLat[1]),
        point: {
          pixelSize: 9,
          color: Cesium.Color.fromCssColorString(c.drive ? '#ffffff' : '#7fdcff'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }
    const fb = river?.bestNewFootbridge;
    if (fb) {
      add('ideas', {
        name: 'Proposed footbridge',
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([...fb.from, ...fb.to]),
          width: 6,
          material: new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.fromCssColorString('#ffd166') }),
          clampToGround: true,
        },
        description: `<p>Best new crossing found: ${fb.spanM} m span, saves ${fb.minutesSavedPerHousehold} walking minutes per household across all services (${fb.candidatesTried} spots tried).</p>`,
      });
    }
    // Empty shops, as mapped in OpenStreetMap (a lower bound).
    for (const f of vacant?.features || []) {
      const [lon, lat] = f.geometry.coordinates;
      add('land', {
        name: `Empty shop${f.properties.name ? `: ${f.properties.name}` : ''}`,
        position: Cesium.Cartesian3.fromDegrees(lon, lat),
        point: {
          pixelSize: 7,
          color: Cesium.Color.fromCssColorString('#9aa5ad'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }
    // Scenarios: one marker per changed location, listing every scenario there.
    const spots = new Map();
    for (const sc of scenarios?.scenarios || []) {
      const c = sc.changes || {};
      for (const ch of [...(c.addPlaces || []), ...(c.addHomes || [])]) {
        const key = `${ch.lon.toFixed(4)},${ch.lat.toFixed(4)}`;
        if (!spots.has(key)) spots.set(key, { lon: ch.lon, lat: ch.lat, list: [] });
        const spot = spots.get(key);
        if (!spot.list.includes(sc)) spot.list.push(sc);
      }
    }
    for (const spot of spots.values()) {
      const rows = spot.list.map((sc) => {
        const d = sc.change;
        const added = sc.card.added ? ` New homes: GP ${sc.card.added.gp.walkMinutes} min, shop ${sc.card.added.shop.walkMinutes} min.` : '';
        const who = Object.entries(sc.gains || {}).map(([k, g]) => ` ${g.households.toLocaleString()} households save ${g.averageMinutesSaved} min to a ${k} (${g.withoutCar} without a car).`).join('');
        return `<li><b>${sc.name}</b>: score ${d.overallScore >= 0 ? '+' : ''}${d.overallScore}, GP walk ${d.gpWalkMinutes} min (need-weighted ${d.gpNeedWeightedWalkMinutes}).${who}${added}</li>`;
      }).join('');
      add('ideas', {
        name: `Scenario${spot.list.length > 1 ? 's' : ''}: ${spot.list.map((sc) => sc.name).join(' · ')}`,
        position: Cesium.Cartesian3.fromDegrees(spot.lon, spot.lat),
        point: {
          pixelSize: 16,
          color: Cesium.Color.fromCssColorString('#c77dff').withAlpha(0.9),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 3,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        description: `<p>Compared with Worcester today:</p><ul>${rows}</ul><p>${[...new Set(spot.list.flatMap((sc) => sc.assumptions))].join(' ')}</p>`,
      });
    }
    // The question loop: open questions as "?" markers, answered ones as "✓".
    for (const q of questions?.questions || []) {
      if (!q.lonLat) continue;
      if (q.status === 'withdrawn') continue; // kept in the file as a record, not drawn
      const open = q.status !== 'answered';
      add('ideas', {
        name: `${open ? 'Open question' : 'Answered'}: ${q.question}`,
        position: Cesium.Cartesian3.fromDegrees(q.lonLat[0], q.lonLat[1]),
        label: {
          text: open ? '?' : '✓',
          font: 'bold 26px sans-serif',
          fillColor: Cesium.Color.fromCssColorString(open ? '#ffd166' : '#80ed99'),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('#06141c').withAlpha(0.85),
          backgroundPadding: new Cesium.Cartesian2(9, 5),
          // Answered ticks sit off to the side so they don't cover site labels.
          pixelOffset: new Cesium.Cartesian2(open ? 0 : 34, open ? -34 : 0),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        description: `<p><b>${q.question}</b></p><p>Asked by ${q.askedBy}${q.from ? `, following ${q.from}` : ''}</p>`
          + (q.finding ? `<p>Found: ${q.finding}</p>` : '')
          + (q.unlocks ? `<p>To answer, unlock: ${q.unlocks}</p>` : ''),
      });
    }
    entities.resumeEvents();
    _count = access.features.length;
  }

  return {
    id: 'planner',
    name: `Town Planner · ${town.name}`,
    icon: '▦',
    source: 'OSM',
    updateInterval: 0,

    init(viewer) {
      _viewer = viewer;
      _dataSource = new Cesium.CustomDataSource('planner');
      _dataSource.show = false;
      viewer.dataSources.add(_dataSource);
    },

    enable(viewer) {
      if (_dataSource) _dataSource.show = true;
      _panel ||= makePanel();
      document.body.appendChild(_panel);
      if (!_flown) {
        _flown = true;
        const [s, w, n, e] = town.bbox;
        viewer.camera.flyTo({ destination: Cesium.Rectangle.fromDegrees(w, s, e, n), duration: 2 });
      }
    },

    disable() {
      if (_dataSource) _dataSource.show = false;
      _panel?.remove();
    },

    async update(viewer, { signal } = {}) {
      if (_loaded || !_dataSource) return false;
      try {
        const [access, roads, places, sites, areas, questions, river, bus, scenarios, vacant, flood, planning] = await Promise.all([
          getJson('access.geojson', signal),
          getJson('roads.geojson', signal),
          getJson('places.geojson', signal),
          // Files from before site suggestions existed have no sites.geojson.
          getJson('sites.geojson', signal).catch(() => null),
          getJson('areas.geojson', signal).catch(() => null),
          getJson('questions.json', signal).catch(() => null),
          getJson('river.json', signal).catch(() => null),
          getJson('bus.json', signal).catch(() => null),
          getJson('scenarios.json', signal).catch(() => null),
          getJson('vacant.geojson', signal).catch(() => null),
          getJson('flood.json', signal).catch(() => null),
          getJson('planning.json', signal).catch(() => null),
        ]);
        if (signal?.aborted || !_dataSource) return false;
        draw({ access, roads, places, sites, areas, questions, river, bus, scenarios, vacant, flood, planning });
        _loaded = true;
        _lastUpdate = Date.now();
        _lastError = null;
        viewer?.scene?.requestRender();
        return true;
      } catch (e) {
        if (signal?.aborted) return false;
        console.warn('[Data:Planner]', e.message);
        _lastError = e.message;
        return false;
      }
    },

    destroy(viewer) {
      _panel?.remove();
      _panel = null;
      if (_dataSource) viewer?.dataSources.remove(_dataSource, true);
      _dataSource = null;
      _loaded = false;
      _count = 0;
    },

    getStats() {
      return { count: _count, lastUpdate: _lastUpdate, error: _lastError };
    },
  };
}
