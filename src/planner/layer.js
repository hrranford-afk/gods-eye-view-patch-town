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

  function draw({ access, roads, places }) {
    const entities = _dataSource.entities;
    entities.suspendEvents();
    entities.removeAll();
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
        const [access, roads, places] = await Promise.all([
          getJson('access.geojson', signal),
          getJson('roads.geojson', signal),
          getJson('places.geojson', signal),
        ]);
        if (signal?.aborted || !_dataSource) return false;
        draw({ access, roads, places });
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
