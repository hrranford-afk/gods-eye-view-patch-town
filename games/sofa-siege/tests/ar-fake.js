/* A small fake WebXR for the tests: an immersive-ar session with a viewer pose the test moves, hit tests against one flat table,
   and optional anchors and dom-overlay. It is NOT HelloXR: it only proves that the game's own AR logic holds together.
   Install it before the page loads: await installFakeAR(page, { supported: true }).
   The test drives it through window.__XRF:
     cam: { pos: [x,y,z], target: [x,y,z] }   where the iPad is and what it looks at (metres, y up)
     table: { y, cx, cz, r }                  the real table top
     track: false                             no viewer pose (tracking lost)
     anchors: true / overlay: false           what the device offers */
export default function installFakeAR(page, opts) {
  return page.addInitScript((opts) => {
    const F = window.__XRF = Object.assign({ supported: true, anchors: false, overlay: true, track: true, fov: 60, cam: { pos: [0, 0, 0], target: [0, -0.45, -0.9] }, table: { y: -0.45, cx: 0, cz: -0.9, r: 0.6 }, sessions: 0, hitCalls: 0, anchorsMade: 0, ended: 0 }, opts || {});
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    const camMatrix = () => { const p = F.cam.pos, z = norm(sub(p, F.cam.target)); let x = norm(cross([0, 1, 0], z)); if (!isFinite(x[0]) || Math.hypot(x[0], x[1], x[2]) < 0.5) x = [1, 0, 0]; const y = cross(z, x); return [x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, p[0], p[1], p[2], 1]; };
    const proj = () => { const c = document.querySelector('canvas'), a = c ? c.clientWidth / c.clientHeight : 1.5, f = 1 / Math.tan(F.fov * Math.PI / 360), n = 0.01, fr = 50; return [f / a, 0, 0, 0, 0, f, 0, 0, 0, 0, (fr + n) / (n - fr), -1, 0, 0, 2 * fr * n / (n - fr), 0]; };
    F.camMatrix = camMatrix; F.proj = proj;
    /* where a world point lands on the screen, worked out here and not by the game */
    F.project = (w) => { const m = camMatrix(), d = sub(w, [m[12], m[13], m[14]]), cx = d[0] * m[0] + d[1] * m[1] + d[2] * m[2], cy = d[0] * m[4] + d[1] * m[5] + d[2] * m[6], cz = d[0] * m[8] + d[1] * m[9] + d[2] * m[10], P = proj();
      const X = P[0] * cx / -cz, Y = P[5] * cy / -cz; return { x: (X * 0.5 + 0.5) * innerWidth, y: (-Y * 0.5 + 0.5) * innerHeight, front: cz < 0 }; };
    class Space { constructor(kind) { this.kind = kind; } }
    const rigid = (matrix) => ({ matrix, position: { x: matrix[12], y: matrix[13], z: matrix[14], w: 1 }, orientation: { x: 0, y: 0, z: 0, w: 1 } });
    const at = (x, y, z) => rigid([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
    class Frame { constructor(s) { this.session = s; }
      getViewerPose() { if (!F.track) return null; const m = camMatrix(); return { transform: rigid(m), views: [{ eye: 'none', transform: rigid(m), projectionMatrix: proj() }] }; }
      getHitTestResults() { F.hitCalls++; if (!F.track) return []; const m = camMatrix(), o = [m[12], m[13], m[14]], d = [-m[8], -m[9], -m[10]]; if (d[1] > -0.05) return []; const t = (F.table.y - o[1]) / d[1], x = o[0] + d[0] * t, z = o[2] + d[2] * t;
        if (Math.hypot(x - F.table.cx, z - F.table.cz) > F.table.r) return []; const pose = { transform: at(x, F.table.y, z) }; return [{ getPose: () => pose }]; }
      getPose(space) { return space && space.pose ? { transform: space.pose } : null; }
      createAnchor(tr) { F.anchorsMade++; const sp = new Space('anchor'); sp.pose = at(tr.position.x, tr.position.y, tr.position.z); return Promise.resolve({ anchorSpace: sp, delete() {} }); } }
    if (!F.anchors) delete Frame.prototype.createAnchor;
    class Session extends EventTarget { constructor(init) { super(); this.init = init; this.renderState = { baseLayer: null }; this.inputSources = []; this.environmentBlendMode = 'alpha-blend';
        if (F.overlay && init && init.domOverlay && init.domOverlay.root) this.domOverlayState = { type: 'screen' }; F.session = this; F.sessions++; }
      updateRenderState(s) { Object.assign(this.renderState, s); }
      requestReferenceSpace(kind) { return Promise.resolve(new Space(kind)); }
      requestHitTestSource() { return Promise.resolve({ cancel() {} }); }
      requestAnimationFrame(cb) { return window.requestAnimationFrame((t) => { if (!this.over) cb(t, new Frame(this)); }); }
      cancelAnimationFrame(id) { window.cancelAnimationFrame(id); }
      end() { this.over = true; F.ended++; this.dispatchEvent(new Event('end')); return Promise.resolve(); } }
    window.XRWebGLLayer = class { constructor(session, gl) { this.gl = gl; this.framebuffer = null; this.framebufferWidth = gl.drawingBufferWidth; this.framebufferHeight = gl.drawingBufferHeight; }
      getViewport() { return { x: 0, y: 0, width: this.gl.drawingBufferWidth, height: this.gl.drawingBufferHeight }; } };
    window.XRRigidTransform = class { constructor(p, o) { this.position = p || { x: 0, y: 0, z: 0, w: 1 }; this.orientation = o || { x: 0, y: 0, z: 0, w: 1 }; } };
    [window.WebGLRenderingContext, window.WebGL2RenderingContext].forEach((C) => { if (C) C.prototype.makeXRCompatible = function () { return Promise.resolve(); }; });
    const xr = { isSessionSupported: (mode) => Promise.resolve(mode === 'immersive-ar' && F.supported), requestSession: (mode, init) => (F.failStart ? Promise.reject(new Error('fake start failure')) : Promise.resolve(new Session(init))) };
    try { Object.defineProperty(Navigator.prototype, 'xr', { configurable: true, get: () => (F.none ? undefined : xr) }); } catch (e) { navigator.xr = xr; }
  }, opts || {});
}
