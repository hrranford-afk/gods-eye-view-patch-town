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

  function draw({ access, roads, places, sites, areas, questions, river }) {
    const entities = _dataSource.entities;
    entities.suspendEvents();
    entities.removeAll();
    // Census neighbourhoods: outlines only, click for how people get to work.
    for (const f of areas?.features || []) {
      const p = f.properties;
      const rings = f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map((poly) => poly[0]);
      for (const ring of rings) {
        entities.add({
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
      entities.add({
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
      entities.add({
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
      const [lon, lat] = f.geometry.coordinates;
      entities.add({
        name: f.properties.name || SERVICE_KINDS[f.properties.kind]?.label,
        position: Cesium.Cartesian3.fromDegrees(lon, lat),
        point: {
          pixelSize: f.properties.kind === 'bus' ? 4 : 7,
          color: Cesium.Color.fromCssColorString(PLACE_COLOR[f.properties.kind] || '#ffffff'),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }
    for (const f of sites?.features || []) {
      const [lon, lat] = f.geometry.coordinates;
      const p = f.properties;
      const label = SERVICE_KINDS[p.kind]?.label || p.kind;
      entities.add({
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
    // River crossings, and the best spot for a new footbridge if one was found.
    for (const c of river?.crossings || []) {
      entities.add({
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
      entities.add({
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
    // The question loop: open questions as "?" markers, answered ones as "✓".
    for (const q of questions?.questions || []) {
      if (!q.lonLat) continue;
      const open = q.status !== 'answered';
      entities.add({
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
      _dataSource = new Cesium.CustomDataSource('planner');
      _dataSource.show = false;
      viewer.dataSources.add(_dataSource);
    },

    enable(viewer) {
      if (_dataSource) _dataSource.show = true;
      if (!_flown) {
        _flown = true;
        const [s, w, n, e] = town.bbox;
        viewer.camera.flyTo({ destination: Cesium.Rectangle.fromDegrees(w, s, e, n), duration: 2 });
      }
    },

    disable() {
      if (_dataSource) _dataSource.show = false;
    },

    async update(viewer, { signal } = {}) {
      if (_loaded || !_dataSource) return false;
      try {
        const [access, roads, places, sites, areas, questions, river] = await Promise.all([
          getJson('access.geojson', signal),
          getJson('roads.geojson', signal),
          getJson('places.geojson', signal),
          // Files from before site suggestions existed have no sites.geojson.
          getJson('sites.geojson', signal).catch(() => null),
          getJson('areas.geojson', signal).catch(() => null),
          getJson('questions.json', signal).catch(() => null),
          getJson('river.json', signal).catch(() => null),
        ]);
        if (signal?.aborted || !_dataSource) return false;
        draw({ access, roads, places, sites, areas, questions, river });
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
