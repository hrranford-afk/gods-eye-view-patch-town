import * as Cesium from 'cesium';

const METRES_PER_VEHICLE = 0.08; // column height: 100,000 vehicles/day ≈ 8 km
const STEP_MS = 1400; // time-lapse speed: one year per step

/**
 * Colour against the regional trend, so a year when everything grew (or, in
 * 2020, everything fell) doesn't paint the whole map one colour: red where a
 * road grew more than the region, blue where it fell further, white if it
 * moved with everyone else. Estimates are drawn faint.
 */
export function changeColor(now, before, counted, trend = 1) {
  const alpha = counted ? 0.95 : 0.3;
  if (!before || !now) return Cesium.Color.WHITE.withAlpha(alpha);
  const r = now / before / trend - 1;
  if (r > 0.1) return Cesium.Color.fromCssColorString('#ff5a4e').withAlpha(alpha);
  if (r < -0.1) return Cesium.Color.fromCssColorString('#4ea8ff').withAlpha(alpha);
  return Cesium.Color.WHITE.withAlpha(alpha * 0.8);
}

/**
 * Regional traffic time-lapse: every DfT count point as a column whose height
 * is vehicles per day, stepping through the years, with detected diversions
 * labelled in the year they happened. Reads the file
 * `npm run planner -- traffic <region>` writes.
 */
export function createTrafficHistoryLayer({ region = 'west-midlands', baseUrl = '/planner/traffic', fetchImpl = fetch } = {}) {
  let _viewer = null;
  let _lines = null;
  let _labels = null;
  let _banner = null;
  let _data = null;
  let _yearIndex = 0;
  let _timer = null;
  let _paused = false;
  let _flown = false;
  let _lastError = null;

  function drawYear() {
    const { years, points, pulse, diversions } = _data;
    const i = _yearIndex;
    const year = years[i];
    const trend = i > 0 ? pulse[i].vehicleKm / pulse[i - 1].vehicleKm : 1;
    _lines.removeAll();
    let shown = 0;
    for (const p of points) {
      const v = p.all[i];
      if (!v) continue;
      shown++;
      const base = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 0);
      const top = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, v * METRES_PER_VEHICLE);
      _lines.add({
        positions: [base, top],
        width: p.type === 'Major' ? 4 : 2,
        material: Cesium.Material.fromType('Color', { color: changeColor(v, p.all[i - 1], p.counted[i] === 1, trend) }),
      });
    }
    _labels.removeAll();
    // One label per road that lost traffic, and one per road that gained it,
    // since several closures can push traffic onto the same stretch.
    const gained = new Map();
    for (const e of diversions.filter((d) => d.year === year)) {
      _labels.add({
        position: Cesium.Cartesian3.fromDegrees(e.fell.lon, e.fell.lat, 1500),
        text: `↓ ${e.fell.road} −${e.moved.toLocaleString()}/day`,
        font: '13px monospace',
        fillColor: Cesium.Color.fromCssColorString('#9fd0ff'),
        showBackground: true,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
      gained.set(e.rose.id, e.rose);
    }
    for (const r of gained.values()) {
      _labels.add({
        position: Cesium.Cartesian3.fromDegrees(r.lon, r.lat, 1500),
        text: `↑ ${r.road} +${(r.after - r.before).toLocaleString()}/day`,
        font: '13px monospace',
        fillColor: Cesium.Color.fromCssColorString('#ffb3ad'),
        showBackground: true,
        pixelOffset: new Cesium.Cartesian2(0, -22),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
    }
    const index = pulse.find((r) => r.year === year)?.index;
    _banner.textContent = `${year} · region traffic ${index} (2000 = 100) · ${shown} roads · red: grew more than the region · blue: fell${_paused ? ' · paused, click to play' : ''}`;
    _viewer?.scene?.requestRender();
  }

  function step() {
    if (_paused || !_data) return;
    _yearIndex = (_yearIndex + 1) % _data.years.length;
    drawYear();
  }

  function makeBanner() {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'planner-traffic-banner';
    el.setAttribute('aria-label', 'Traffic time-lapse year; click to pause or play');
    Object.assign(el.style, {
      position: 'fixed', top: '96px', left: '50%', transform: 'translateX(-50%)', zIndex: 30,
      font: '600 15px monospace', letterSpacing: '0.06em', color: '#e8f6ff',
      background: 'rgba(4,16,24,0.82)', border: '1px solid rgba(120,220,255,0.5)',
      borderRadius: '6px', padding: '8px 14px', cursor: 'pointer',
    });
    el.addEventListener('click', () => { _paused = !_paused; if (_data) drawYear(); });
    return el;
  }

  return {
    id: 'traffic-history',
    name: 'Traffic Time-lapse · West Midlands',
    icon: '▥',
    source: 'DfT',
    updateInterval: 0,

    init(viewer) {
      _viewer = viewer;
      _lines = viewer.scene.primitives.add(new Cesium.PolylineCollection());
      _labels = viewer.scene.primitives.add(new Cesium.LabelCollection());
      _lines.show = false;
      _labels.show = false;
    },

    enable(viewer) {
      _lines.show = true;
      _labels.show = true;
      _banner ||= makeBanner();
      document.body.appendChild(_banner);
      _banner.textContent = 'Loading traffic history…';
      _timer = setInterval(step, STEP_MS);
      if (!_flown) {
        _flown = true;
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(-2.05, 51.9, 90_000),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-50), roll: 0 },
          duration: 2,
        });
      }
    },

    disable() {
      clearInterval(_timer);
      _timer = null;
      if (_lines) _lines.show = false;
      if (_labels) _labels.show = false;
      _banner?.remove();
    },

    async update(viewer, { signal } = {}) {
      if (_data) return false;
      try {
        const res = await fetchImpl(`${baseUrl}/${region}.json`, { signal });
        if (!res.ok) throw new Error(`No traffic history — run: npm run planner -- traffic ${region}`);
        _data = await res.json();
        if (signal?.aborted) return false;
        _yearIndex = 0;
        drawYear();
        _lastError = null;
        return true;
      } catch (e) {
        if (signal?.aborted) return false;
        _lastError = e.message;
        if (_banner) _banner.textContent = e.message;
        return false;
      }
    },

    destroy(viewer) {
      clearInterval(_timer);
      _banner?.remove();
      if (_lines) viewer?.scene.primitives.remove(_lines);
      if (_labels) viewer?.scene.primitives.remove(_labels);
      _lines = null;
      _labels = null;
      _data = null;
      _viewer = null;
    },

    getStats() {
      return { count: _data?.points.length ?? 0, lastUpdate: _data ? Date.now() : null, error: _lastError };
    },
  };
}
