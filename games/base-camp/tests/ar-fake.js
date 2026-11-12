// The fake native iOS side for the real WebXRKit polyfill: a fake room (SHED list), a moving camera, hit tests against the room, a grey camera picture.
// Used by auto-ar-test.js. window.__W = { yaw, x, z } turns / shifts the whole room between sessions; window.__SHED is the room layout.
module.exports = function install(p, SHED) {
  return p.addInitScript((SHED) => {
    try { delete Navigator.prototype.xr; delete WebGLRenderingContext.prototype.makeXRCompatible; delete WebGL2RenderingContext.prototype.makeXRCompatible; } catch (e) {} for (const k of Object.getOwnPropertyNames(window)) if (/^XR/.test(k)) { try { delete window[k]; } catch (e) {} }
    const reply = (cb, data) => setTimeout(() => window[cb] && window[cb](data), 5);
    window.__native = { hits: 0, empty: 0, calls: 0 }; window.__W = { yaw: 0, x: 0, z: 0 }; window.__SHED = SHED;
    try { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d'); g.fillStyle = '#8a8070'; g.fillRect(0, 0, 320, 240); window.__video = c.toDataURL('image/jpeg', 0.5).split(',')[1]; } catch (e) {} // a grey camera picture: the pipeline is what is tested
    // world transform of the whole room: the real room is turned and shifted relative to where AR started this time
    const place = () => { const W = window.__W, c = Math.cos(W.yaw), s = Math.sin(W.yaw); return window.__SHED.map(([n, y, cx, cz, hw, hd]) => ({ n, y, hw, hd, cx: cx * c + cz * s + W.x, cz: -cx * s + cz * c + W.z, rot: W.yaw })); };
    window.__place = place;
    const h = (fn) => ({ postMessage: (body) => { fn && fn(body); } });
    let dataCb = null, timer = null; const asp = 1180 / 820, f = 1 / Math.tan(0.5);
    const proj = [f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (100 + 0.01) / (0.01 - 100), -1, 0, 0, (2 * 100 * 0.01) / (0.01 - 100), 0];
    window.__cam = { mode: 'sweep', t0: performance.now(), fixed: [0.2, 0.5, 0.2, 0, -0.75], path: [], speed: 1 };
    const ease = (a, b2, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b2 - a))); return t * t * (3 - 2 * t); };
    const camNow = () => {
      const C = window.__cam; let x, y, z, yaw, pitch;
      if (C.mode === 'fixed' || !C.path.length) [x, y, z, yaw, pitch] = C.fixed;
      else {
        let t = ((performance.now() - C.t0) / 1000) * C.speed, i = 0; while (i < C.path.length - 1 && t > C.path[i].dur) { t -= C.path[i].dur; i++; }
        const v = C.path[i], pr = C.path[Math.max(0, i - 1)], u = Math.min(1, t / v.dur), fr = ease(0, 0.2, u), w = u * 6.283 * 2;
        x = pr.p[0] + (v.p[0] - pr.p[0]) * fr; y = pr.p[1] + (v.p[1] - pr.p[1]) * fr; z = pr.p[2] + (v.p[2] - pr.p[2]) * fr;
        yaw = pr.yaw + (v.yaw - pr.yaw) * fr + Math.sin(w) * v.ay * fr; pitch = pr.pitch + (v.pitch - pr.pitch) * fr + Math.sin(w * 2.3 + 1) * v.ap * fr;
        if (i === C.path.length - 1 && t >= v.dur) C.done = true;
      }
      const cy = Math.cos(yaw), sy = Math.sin(yaw), c = Math.cos(pitch), s = Math.sin(pitch);
      return [cy, 0, -sy, 0, sy * s, c, cy * s, 0, sy * c, -s, cy * c, 0, x, y, z, 1];
    };
    const inv = (m) => { const r = [m[0], m[4], m[8], 0, m[1], m[5], m[9], 0, m[2], m[6], m[10], 0, 0, 0, 0, 1], t = [m[12], m[13], m[14]]; r[12] = -(r[0] * t[0] + r[4] * t[1] + r[8] * t[2]); r[13] = -(r[1] * t[0] + r[5] * t[1] + r[9] * t[2]); r[14] = -(r[2] * t[0] + r[6] * t[1] + r[10] * t[2]); return r; };
    let cam = camNow();
    window.webkit = { messageHandlers: {
      initAR: h((b2) => b2.callback && reply(b2.callback, 'ios-ar-device-id')),
      requestSession: h((b2) => {
        window.__sessionOpts = b2; dataCb = b2.data_callback; reply(b2.callback, { cameraAccess: !!b2.computer_vision_data, worldAccess: true, webXRAccess: true }); clearInterval(timer);
        timer = setInterval(() => { cam = camNow(); window.NativeARData = window.NativeARData || {}; Object.assign(window.NativeARData, { timestamp: performance.now(), light_intensity: 1000, camera_transform: cam, camera_view: inv(cam), projection_camera: proj, video_updated: !!window.__video, video_data: window.__video || null, video_width: 320, video_height: 240 }); if (dataCb && window[dataCb]) window[dataCb](); }, 33);
      }),
      stopAR: h((b2) => { clearInterval(timer); if (b2 && b2.callback) reply(b2.callback, {}); }),
      hitTest: h((b2) => {
        const nx = b2.x * 2 - 1, ny = 1 - b2.y * 2, dc = [nx * asp / f, ny / f, -1], m = cam, d = [m[0] * dc[0] + m[4] * dc[1] + m[8] * dc[2], m[1] * dc[0] + m[5] * dc[1] + m[9] * dc[2], m[2] * dc[0] + m[6] * dc[1] + m[10] * dc[2]];
        // real surfaces answer with their plane uuid; a ray that misses every real surface falls back to an ESTIMATED plane (no uuid), like WebXRKit's native performHitTest:
        // the estimate extends a surface by EXT metres beyond its real edge (spill into thin air) and is a little noisier
        const out = []; let bt = 1e9, bh = null, bu = null, et = 1e9, eh = null; const EXT = window.__native.ext === undefined ? 0.35 : window.__native.ext, est = window.__native.estimated !== false;
        if (d[1] < -1e-3) for (const S of place()) { const t = (S.y - m[13]) / d[1]; if (t <= 0) continue; const hx = m[12] + d[0] * t, hz = m[14] + d[2] * t, dx = hx - S.cx, dz = hz - S.cz, c = Math.cos(S.rot), s = Math.sin(S.rot), lx = dx * c - dz * s, lz = dx * s + dz * c;
          if (Math.abs(lx) < S.hw && Math.abs(lz) < S.hd) { if (t < bt) { bt = t; bh = [hx, S.y, hz]; bu = 'plane-' + S.n; } }
          else if (est && S.n !== 'chandelier' && Math.abs(lx) < S.hw + EXT && Math.abs(lz) < S.hd + EXT && t < et) { et = t; eh = [hx, S.y, hz]; } }
        /* build 12: a ceiling plane (a SHED entry named ceil...) answers rays that look UP at it. Its normal is plain +Y like ARKit's horizontal anchors, unless window.__native.ceilNormal is set (then it faces down: Y axis -1). */
        let up = false; if (d[1] > 1e-3) for (const S of place()) { if (!/^ceil/.test(S.n)) continue; const t = (S.y - m[13]) / d[1]; if (t <= 0 || t >= bt) continue; const hx = m[12] + d[0] * t, hz = m[14] + d[2] * t, dx = hx - S.cx, dz = hz - S.cz, c = Math.cos(S.rot), s = Math.sin(S.rot), lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) < S.hw && Math.abs(lz) < S.hd) { bt = t; bh = [hx, S.y, hz]; bu = 'plane-' + S.n; up = true; } }
        const nz = () => (Math.random() - 0.5), cn = up && window.__native.ceilNormal ? -1 : 1;
        if (bh) out.push({ world_transform: [1, 0, 0, 0, 0, cn, 0, 0, 0, 0, cn, 0, bh[0], bh[1] + nz() * 0.006, bh[2], 1], uuid: bu });
        else if (eh) out.push({ world_transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, eh[0] + nz() * 0.03, eh[1] + nz() * 0.03, eh[2] + nz() * 0.03, 1] });
        window.__native[bu ? 'anch' : eh ? 'est' : 'miss'] = (window.__native[bu ? 'anch' : eh ? 'est' : 'miss'] || 0) + 1;
        window.__native[out.length ? 'hits' : 'empty']++; reply(b2.callback, out);
      }),
      onUpdate: h(), removeAnchors: h(), setUIOptions: h(),
    } };
    // a sweep path that looks down at each thing of the shed from about a metre: [{p, yaw, pitch, ay, ap, dur}]
    window.__sweep = (speed) => {
      const targets = window.__place(), pick = (n) => targets.find((t) => t.n === n), look = (tx, ty, tz, off, hgt, ay, ap, dur) => { const p = [tx + off[0], ty + hgt, tz + off[1]], fx = tx - p[0], fy = ty - p[1], fz = tz - p[2], L = Math.hypot(fx, fy, fz); return { p, yaw: Math.atan2(-fx / L, -fz / L), pitch: Math.asin(fy / L), ay, ap, dur }; };
      const fl = pick('floor'), sa = pick('speakerA'), sb = pick('speakerB'), sh = pick('shelf');
      window.__cam.path = [look(fl.cx, -1.2, fl.cz, [0, 1.3], 1.6, 0.6, 0.25, 16), look(sa.cx, sa.y, sa.cz, [0.1, 0.5], 0.55, 0.12, 0.1, 10), look(sb.cx, sb.y, sb.cz, [-0.1, 0.5], 0.6, 0.12, 0.1, 10), look(sh.cx, sh.y, sh.cz, [0, 0.6], 0.5, 0.18, 0.1, 14), look(fl.cx, -1.2, fl.cz, [0.3, -0.4], 1.7, 0.7, 0.25, 12), look(sa.cx, sa.y, sa.cz, [0.0, 0.45], 0.5, 0.1, 0.08, 7), look(sh.cx, sh.y, sh.cz, [0, 0.55], 0.45, 0.14, 0.08, 8)];
      window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = speed || 1; window.__cam.done = false;
    };
  }, SHED);
};
