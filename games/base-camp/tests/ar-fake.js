// The fake native iOS side for the real WebXRKit polyfill: a fake room (SHED list), a moving camera, hit tests against the room, a grey camera picture.
// Used by auto-ar-test.js. window.__W = { yaw, x, z, y } turns / shifts (and lifts: y, build 26) the whole room between sessions or mid-session (an origin jump); window.__SHED is the room layout.
/* build 27: window.__MARKS = [{ id, x, y, z, ax: [3], ay: [3], size, bits }] are printed stickers in the room's own coordinates (they turn and shift with __W like the room);
   with any sticker in the room the camera picture is a 640 x 480 JPEG drawn by marker-render.js from the camera pose of that very frame, every 4th frame (as HelloXR sends
   half-resolution pictures about every 4th frame). window.__noCamera = true: no pictures at all (camera-access missing). */
/* build 28: window.__TEX = { items: [{ n, x, y, z, ax: [3], ay: [3], hw, hh, tex, seed, block }], tones: { shedName: [r, g, b] } } gives the room its own texture (posters, book
   spines, a rug, a cushion: texture-render.js), drawn into the same 640 x 480 pictures together with the plain tops of every SHED surface (nearest surface wins), stickers on top.
   items are in the room's own coordinates and turn and shift with __W. An item with block (the vertical ones: posters, spines) also stops the fake's hit tests behind it,
   as a real wall or bookcase would (ARKit then has no plane there). __TEX = { items: [] } is a texture-poor room: plain tops and grey walls only. */
/* room kit, 18 Nov: window.__WALLS = [{ x0, x1, z0, z1, y0, y1 }] are walls (upright boxes in the room's own coordinates, turned and shifted with __W like the room). They stop the
   fake's hit tests (ARKit finds no plane behind a wall) and hide a sticker behind them from the camera picture. They are not drawn (the picture stays grey there).
   house-world.js makes them, with the tops and the stickers, from the dolls' house (build 29). Without __WALLS nothing changes. */
const STK_RENDER = require('./marker-render.js'); const TEX = require('./texture-render.js');
module.exports = function install(p, SHED) {
  p.addInitScript({ content: 'window.__stkFakeRender = ' + STK_RENDER.toString() + ';' });
  p.addInitScript({ content: 'window.__texFakeMake = ' + TEX.texFakeMake.toString() + '; window.__texFakeRender = ' + TEX.texFakeRender.toString() + ';' });
  return p.addInitScript((SHED) => {
    try { delete Navigator.prototype.xr; delete WebGLRenderingContext.prototype.makeXRCompatible; delete WebGL2RenderingContext.prototype.makeXRCompatible; } catch (e) {} for (const k of Object.getOwnPropertyNames(window)) if (/^XR/.test(k)) { try { delete window[k]; } catch (e) {} }
    const reply = (cb, data) => setTimeout(() => window[cb] && window[cb](data), 5);
    window.__native = { hits: 0, empty: 0, calls: 0, pics: 0, picMs: 0 }; window.__W = { yaw: 0, x: 0, z: 0 }; window.__SHED = SHED; window.__MARKS = window.__MARKS || [];
    try { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d'); g.fillStyle = '#8a8070'; g.fillRect(0, 0, 320, 240); window.__video = c.toDataURL('image/jpeg', 0.5).split(',')[1]; } catch (e) {} // a grey camera picture: the pipeline is what is tested
    // world transform of the whole room: the real room is turned and shifted relative to where AR started this time
    const place = () => { const W = window.__W, c = Math.cos(W.yaw), s = Math.sin(W.yaw); return window.__SHED.map(([n, y, cx, cz, hw, hd]) => ({ n, y: y + (W.y || 0), hw, hd, cx: cx * c + cz * s + W.x, cz: -cx * s + cz * c + W.z, rot: W.yaw })); };
    window.__place = place;
    const placeMarks = () => { const W = window.__W, c = Math.cos(W.yaw), s = Math.sin(W.yaw), r = (v) => [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; return (window.__MARKS || []).map((k) => { const q = r([k.x, 0, k.z]); return Object.assign({}, k, { x: q[0] + W.x, y: k.y + (W.y || 0), z: q[2] + W.z, ax: r(k.ax), ay: r(k.ay) }); }); };
    window.__placeMarks = placeMarks;
    const placeTex = () => { const W = window.__W, c = Math.cos(W.yaw), s = Math.sin(W.yaw), r = (v) => [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c], T = window.__TEX; if (!T) return []; return (T.items || []).map((k) => { const q = r([k.x, 0, k.z]); return Object.assign({}, k, { c: [q[0] + W.x, k.y + (W.y || 0), q[2] + W.z], ax: r(k.ax), ay: r(k.ay) }); }); };
    window.__placeTex = placeTex; window.__texCache = {};
    const wallHit = (o, d, tmax) => { /* nearest t in (0, tmax) where the ray o + t d enters a wall of __WALLS, else 1e9 (the test is done in the room's own frame) */
      const Wl = window.__WALLS; if (!Wl || !Wl.length) return 1e9; const W = window.__W, c = Math.cos(W.yaw), s = Math.sin(W.yaw), ox = o[0] - W.x, oz = o[2] - W.z, oy = o[1] - (W.y || 0);
      const lo = [ox * c - oz * s, oy, ox * s + oz * c], ld = [d[0] * c - d[2] * s, d[1], d[0] * s + d[2] * c]; let best = 1e9;
      for (const w of Wl) { let t0 = 1e-6, t1 = tmax; const B = [[w.x0, w.x1], [w.y0, w.y1], [w.z0, w.z1]];
        for (let a = 0; a < 3 && t0 <= t1; a++) { if (Math.abs(ld[a]) < 1e-12) { if (lo[a] < B[a][0] || lo[a] > B[a][1]) t1 = -1; continue; } let u = (B[a][0] - lo[a]) / ld[a], v = (B[a][1] - lo[a]) / ld[a]; if (u > v) { const q = u; u = v; v = q; } if (u > t0) t0 = u; if (v < t1) t1 = v; }
        if (t0 <= t1 && t0 < best) best = t0; }
      return best; };
    window.__wallHit = wallHit;
    const texOf = (k) => { const tw = k.tw || Math.max(16, Math.min(512, Math.round(k.hw * 2 * 560))), th = k.th || Math.max(16, Math.min(512, Math.round(k.hh * 2 * 560))), key = k.tex + ':' + (k.seed || 1) + ':' + tw + 'x' + th; return window.__texCache[key] || (window.__texCache[key] = window.__texFakeMake(k.tex, k.seed || 1, tw, th)); };
    const texPlanes = () => { const T = window.__TEX, tones = (T && T.tones) || {}, out = [];
      for (const S of place()) { const c = Math.cos(S.rot), s = Math.sin(S.rot); let hsh = 0; for (const ch of S.n) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0; const g = 112 + (hsh % 60); out.push({ c: [S.cx, S.y, S.cz], ax: [c, 0, -s], ay: [s, 0, c], hw: S.hw, hh: S.hd, tex: null, tone: tones[S.n] || [g, g * 0.96, g * 0.9] }); }
      for (const k of placeTex()) out.push({ c: k.c, ax: k.ax, ay: k.ay, hw: k.hw, hh: k.hh, tex: texOf(k), tone: null });
      return out; };
    let picN = 0; const picCv = document.createElement('canvas'); picCv.width = 640; picCv.height = 480;
    const picture = (camM) => { /* the camera picture of this frame: aspect fill of the screen's view (the horizontal field of view matches: 640/480 is narrower than 1180/820) */
      const t0 = performance.now(), fx = (f / asp) * 320, base = window.__TEX ? window.__texFakeRender({ W: 640, H: 480, fx, fy: fx, cx: 320, cy: 240, cam: camM, planes: texPlanes(), seed: picN + 7 }) : null, mk = placeMarks().filter((k) => { const d = [k.x - camM[12], k.y - camM[13], k.z - camM[14]]; return wallHit([camM[12], camM[13], camM[14]], d, 0.995) > 1e8; });
      const px = mk.length || !base ? window.__stkFakeRender({ W: 640, H: 480, fx, fy: fx, cx: 320, cy: 240, cam: camM, marks: mk, ss: 3, seed: ++picN, base }) : (++picN, base);
      const g = picCv.getContext('2d'); g.putImageData(new ImageData(px, 640, 480), 0, 0); const url = picCv.toDataURL('image/jpeg', 0.85).split(',')[1]; window.__native.pics++; window.__native.picMs += performance.now() - t0; return url; };
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
        window.__sessionOpts = b2; dataCb = b2.data_callback; reply(b2.callback, { cameraAccess: !!b2.computer_vision_data && !window.__noCamera, worldAccess: true, webXRAccess: true }); clearInterval(timer); let tick = 0;
        timer = setInterval(() => { cam = camNow(); tick++; let vid = window.__noCamera ? null : window.__video || null, vw = 320, vh = 240, upd = !!vid;
          if (!window.__noCamera && ((window.__MARKS || []).length || window.__TEX)) { upd = tick % 4 === 0; vw = 640; vh = 480; vid = upd ? picture(cam) : null; } /* a new picture every 4th frame */
          window.NativeARData = window.NativeARData || {}; Object.assign(window.NativeARData, { timestamp: performance.now(), light_intensity: 1000, camera_transform: cam, camera_view: inv(cam), projection_camera: proj, video_updated: upd, video_data: vid, video_width: vw, video_height: vh }); if (dataCb && window[dataCb]) window[dataCb](); }, 33);
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
        if (window.__TEX) for (const k of placeTex()) { if (!k.block) continue; const n = [k.ax[1] * k.ay[2] - k.ax[2] * k.ay[1], k.ax[2] * k.ay[0] - k.ax[0] * k.ay[2], k.ax[0] * k.ay[1] - k.ax[1] * k.ay[0]], dn = d[0] * n[0] + d[1] * n[1] + d[2] * n[2]; if (Math.abs(dn) < 1e-9) continue;
          const t = ((k.c[0] - m[12]) * n[0] + (k.c[1] - m[13]) * n[1] + (k.c[2] - m[14]) * n[2]) / dn; if (t <= 0) continue; const q = [m[12] + d[0] * t - k.c[0], m[13] + d[1] * t - k.c[1], m[14] + d[2] * t - k.c[2]];
          if (Math.abs(q[0] * k.ax[0] + q[1] * k.ax[1] + q[2] * k.ax[2]) > k.hw || Math.abs(q[0] * k.ay[0] + q[1] * k.ay[1] + q[2] * k.ay[2]) > k.hh) continue; if (t < bt) { bt = t; bh = null; bu = null; } if (t < et) { et = t; eh = null; } } /* build 28: a wall or a bookcase stops the ray */
        { const tw = wallHit([m[12], m[13], m[14]], d, 1e6); if (tw < bt) { bt = tw; bh = null; bu = null; } if (tw < et) { et = tw; eh = null; } } /* room kit 18 Nov: a wall of __WALLS stops the ray */
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
