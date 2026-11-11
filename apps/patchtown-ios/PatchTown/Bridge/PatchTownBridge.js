/* PatchTown: our own code. Injected by the app at document start, right after webxr-polyfill.js.
 * Gives the games a small promise API for the app's native extras. See NATIVE_BRIDGE.md.
 *
 *   PatchTownNative.worldMap.save(key)   -> {saved, key, bytes, mapping} | {saved:false, error}
 *   PatchTownNative.worldMap.load(key)   -> {loaded, started, pending}   | {loaded:false, error}
 *   PatchTownNative.worldMap.has(key)    -> {exists, bytes, modified}
 *   PatchTownNative.worldMap.remove(key) -> {removed}
 *   PatchTownNative.worldMap.list()      -> {keys:[...]}
 *   PatchTownNative.worldMap.status      -> {mapping, tracking, relocalized}
 *   PatchTownNative.worldMap.whenRelocalized(ms) -> resolves true when ARKit has relocalised, false on timeout
 *   PatchTownNative.planes.start({hz})   -> begins the plane stream (at most 4 Hz)
 *   PatchTownNative.planes.stop()
 *   PatchTownNative.planes.all           -> Map id -> plane
 *   PatchTownNative.on('worldmap' | 'planes', fn) / off(...)
 * Events are also dispatched on window as 'patchtown:worldmap' and 'patchtown:planes' (CustomEvent.detail).
 */
(function () {
  'use strict';
  if (window.PatchTownNative) return;
  var seq = 0;
  var listeners = { worldmap: [], planes: [] };

  function call(name, msg, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var mh = window.webkit && window.webkit.messageHandlers;
      var h = mh && mh[name];
      if (!h) { reject(new Error('PatchTown native bridge missing: ' + name)); return; }
      var cb = '__ptcb_' + (++seq) + '_' + Math.floor(Math.random() * 1e9);
      var timer = setTimeout(function () { delete window[cb]; reject(new Error('PatchTown native timeout: ' + name)); }, timeoutMs || 30000);
      window[cb] = function (data) { clearTimeout(timer); delete window[cb]; resolve(data); };
      h.postMessage(Object.assign({}, msg || {}, { callback: cb }));
    });
  }

  var status = { mapping: 'notAvailable', tracking: 'notAvailable', relocalized: false };
  var planesAll = new Map();

  var PT = {
    app: 'PatchTown',
    version: '0.1',
    inApp: true,
    worldMap: {
      available: true,
      status: status,
      save: function (key) { return call('ptWorldMap', { action: 'save', key: String(key) }, 60000); },
      load: function (key) { return call('ptWorldMap', { action: 'load', key: String(key) }, 60000); },
      has: function (key) { return call('ptWorldMap', { action: 'has', key: String(key) }); },
      remove: function (key) { return call('ptWorldMap', { action: 'remove', key: String(key) }); },
      list: function () { return call('ptWorldMap', { action: 'list' }); },
      whenRelocalized: function (ms) {
        if (status.relocalized) return Promise.resolve(true);
        return new Promise(function (resolve) {
          var done = false;
          var fn = function (d) { if (!done && d && d.relocalized) { done = true; PT.off('worldmap', fn); resolve(true); } };
          PT.on('worldmap', fn);
          setTimeout(function () { if (!done) { done = true; PT.off('worldmap', fn); resolve(false); } }, ms || 20000);
        });
      }
    },
    planes: {
      all: planesAll,
      start: function (opts) { return call('ptPlanes', { enabled: true, hz: (opts && opts.hz) || 4 }); },
      stop: function () { return call('ptPlanes', { enabled: false }); }
    },
    on: function (type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    off: function (type, fn) { var a = listeners[type] || []; var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); },
    _event: function (type, detail) {
      try {
        if (type === 'worldmap' && detail) {
          if (detail.mapping) status.mapping = detail.mapping;
          if (detail.tracking) status.tracking = detail.tracking;
          if (detail.type === 'relocalizing') status.relocalized = false;
          if (detail.relocalized) status.relocalized = true;
        } else if (type === 'planes' && detail) {
          if (detail.reset) planesAll.clear();
          (detail.removed || []).forEach(function (id) { planesAll.delete(id); });
          (detail.updated || []).forEach(function (p) { planesAll.set(p.id, p); });
        }
        (listeners[type] || []).slice().forEach(function (fn) { try { fn(detail); } catch (e) { console.error(e); } });
        window.dispatchEvent(new CustomEvent('patchtown:' + type, { detail: detail }));
      } catch (e) { console.error('PatchTownNative event', e); }
    }
  };
  Object.defineProperty(window, 'PatchTownNative', { value: PT, configurable: false, writable: false });

  // The polyfill's nonStandard_setWorldMap(map) sends map.worldMap. Accept what games actually store:
  // the object from nonStandard_getWorldMap(), its JSON string, a bare base64 string, or {key} for a native save.
  // A reply of {loaded:false} becomes a rejection, so "resolved" really means "ARKit is relocalising".
  try {
    var P = window.XRSession && window.XRSession.prototype;
    if (P && typeof P.nonStandard_setWorldMap === 'function') {
      var orig = P.nonStandard_setWorldMap;
      P.nonStandard_setWorldMap = function (wm) {
        var arg = wm;
        if (typeof wm === 'string') {
          try { var o = JSON.parse(wm); arg = (o && typeof o === 'object') ? o : { worldMap: wm }; } catch (e) { arg = { worldMap: wm }; }
        }
        if (arg && arg.key && !arg.worldMap) {
          return PT.worldMap.load(arg.key).then(function (r) { if (!r || !r.loaded) throw new Error((r && r.error) || 'world map not loaded'); return r; });
        }
        return Promise.resolve(orig.call(this, arg)).then(function (r) {
          if (r && r.loaded === false) throw new Error(r.error || 'world map not loaded');
          return r;
        });
      };
    }
  } catch (e) { /* the polyfill is not installed here */ }
})();
