/* Rubble juice: dust puffs, brick chips, ring waves and glow for the bell, confetti, score pop-ups, a screen flash and a small camera shake.
   Looks only: it reads body positions the physics already has and never touches a body, so replay codes and hashes cannot change.
   Cost: one pooled THREE.Points (dust, chips, confetti: 1 draw call, no triangles) and one InstancedMesh of 10 camera-facing quads (rings and glow: 1 draw call, at most 20 triangles),
   both hidden when idle; pop-ups and the flash are DOM elements moved by CSS animation. Nothing is allocated per frame: typed arrays are filled in place. */
(function (root) {
  'use strict';
  var NP = 640, NR = 10, NPOP = 6, DT = 1 / 60;
  function make(THREE, scene, camera, opt) {
    opt = opt || {};
    var ground = opt.ground || function () { return -99; };
    var J = { on: true, shakeOn: true, stats: { events: 0, spawned: 0, rings: 0, shakes: 0, confetti: 0, pops: 0, flashes: 0, maxLive: 0 }, last: { x: 0, y: 0, z: 0, t: -9 } };
    var i;
    /* ----- particles ----- */
    var pos = new Float32Array(NP * 3), col = new Float32Array(NP * 3), aP = new Float32Array(NP * 3), vel = new Float32Array(NP * 3);
    var life = new Float32Array(NP), maxL = new Float32Array(NP), s0 = new Float32Array(NP), s1 = new Float32Array(NP), grav = new Float32Array(NP), drag = new Float32Array(NP), flut = new Float32Array(NP), kind = new Float32Array(NP), ph = new Float32Array(NP);
    var cur = 0, live = 0, prevLive = 0, R32 = new Uint32Array(1), SS = new Float64Array(2);     /* numbers that change every frame live in typed arrays: a plain closure variable holding a double is boxed (allocated) at every write */
    R32[0] = 12345;
    function rnd() { R32[0] = R32[0] * 1664525 + 1013904223; return R32[0] / 4294967296; }       /* a private random stream: the look never draws from the physics' */
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aC', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aP', new THREE.BufferAttribute(aP, 3).setUsage(THREE.DynamicDrawUsage));
    var pMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { uScale: { value: 600 } },
      vertexShader: 'attribute vec3 aC;attribute vec3 aP;uniform float uScale;varying vec3 vC;varying vec2 vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=min(96.,aP.y*uScale/max(.1,-mv.z));vC=aC;vA=vec2(aP.x,aP.z);}',
      fragmentShader: 'varying vec3 vC;varying vec2 vA;void main(){vec2 d=gl_PointCoord-.5;float soft=smoothstep(.5,.05,length(d));float hard=step(max(abs(d.x),abs(d.y)),.42);gl_FragColor=vec4(vC,vA.x*mix(soft,hard,vA.y));}' });
    var points = new THREE.Points(geo, pMat); points.frustumCulled = false; points.visible = false; points.renderOrder = 6; scene.add(points);
    for (i = 0; i < NP; i++) { life[i] = 0; aP[i * 3] = 0; aP[i * 3 + 1] = 0; }
    function spawn(x, y, z, vx, vy, vz, r, g, b, size0, size1, lifeS, gr, dr, fl, kd) {
      var k = cur; cur = (cur + 1) % NP; var o = k * 3;
      pos[o] = x; pos[o + 1] = y; pos[o + 2] = z; vel[o] = vx; vel[o + 1] = vy; vel[o + 2] = vz; col[o] = r; col[o + 1] = g; col[o + 2] = b;
      life[k] = lifeS; maxL[k] = lifeS; s0[k] = size0; s1[k] = size1; grav[k] = gr; drag[k] = dr; flut[k] = fl; kind[k] = kd; ph[k] = rnd() * 6.28; aP[o] = 1; aP[o + 1] = size0; aP[o + 2] = kd;
      J.stats.spawned++; prevLive = 1;
    }
    /* ----- ring waves and glow: one InstancedMesh of camera-facing quads ----- */
    var rg = new THREE.PlaneGeometry(1, 1), rAR = new Float32Array(NR * 3), rAC = new Float32Array(NR * 3);
    rg.setAttribute('aR', new THREE.InstancedBufferAttribute(rAR, 3).setUsage(THREE.DynamicDrawUsage)); rg.setAttribute('aC', new THREE.InstancedBufferAttribute(rAC, 3).setUsage(THREE.DynamicDrawUsage));
    var rMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
      vertexShader: 'attribute vec3 aR;attribute vec3 aC;varying vec2 vU;varying vec3 vR;varying vec3 vC;void main(){vU=uv-.5;vR=aR;vC=aC;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec2 vU;varying vec3 vR;varying vec3 vC;void main(){float r=length(vU)*2.;float ring=smoothstep(.74,.88,r)*(1.-smoothstep(.9,1.,r));float glow=exp(-r*r*5.)*step(r,1.);gl_FragColor=vec4(vC,mix(ring,glow,vR.y)*vR.z);}' });
    var rings = new THREE.InstancedMesh(rg, rMat, NR); rings.frustumCulled = false; rings.visible = false; rings.renderOrder = 7; rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(rings);
    var rx = new Float32Array(NR), ry = new Float32Array(NR), rz = new Float32Array(NR), rage = new Float32Array(NR), rlife = new Float32Array(NR), rmax = new Float32Array(NR), rkind = new Float32Array(NR), rdelay = new Float32Array(NR), rcur = 0, rlive = 0;
    function ring(x, y, z, maxR, lifeS, kd, r, g, b, delay) {
      var k = rcur; rcur = (rcur + 1) % NR; rx[k] = x; ry[k] = y; rz[k] = z; rage[k] = 0; rlife[k] = lifeS; rmax[k] = maxR; rkind[k] = kd; rdelay[k] = delay || 0; rAC[k * 3] = r; rAC[k * 3 + 1] = g; rAC[k * 3 + 2] = b; rAR[k * 3 + 2] = 0; J.stats.rings++;
    }
    /* ----- pop-ups and the flash: DOM, moved by CSS animation (no per-frame work) ----- */
    var pops = [], popCur = 0, v3 = new THREE.Vector3(), flashEl = null, doc = root.document;
    if (doc) {
      for (i = 0; i < NPOP; i++) { var d = doc.createElement('div'); d.className = 'pop'; d.setAttribute('aria-hidden', 'true'); doc.body.appendChild(d); pops.push(d); }
      flashEl = doc.getElementById('flash');
    }
    function retrigger(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
    /* ----- effects ----- */
    J.dust = function (x, y, z, st, nearGround) {
      var n = 3 + Math.round(st * 9), k, a, sp, r = nearGround ? 0.80 : 0.84, g = nearGround ? 0.72 : 0.66, b = nearGround ? 0.55 : 0.55;
      for (k = 0; k < n; k++) { a = rnd() * 6.283; sp = 0.4 + rnd() * (0.9 + st * 1.2); spawn(x, y + 0.03, z, Math.cos(a) * sp, 0.3 + rnd() * 0.9, Math.sin(a) * sp, r + rnd() * 0.08, g + rnd() * 0.06, b + rnd() * 0.05, 0.22 + rnd() * 0.14, 0.8 + st * 0.7 + rnd() * 0.4, 0.8 + rnd() * 0.5, 0.2, 1.4, 0, 0); }
    };
    J.chips = function (x, y, z, st, r, g, b) {
      var n = 2 + Math.round(st * 6), k, a, sp;
      for (k = 0; k < n; k++) { a = rnd() * 6.283; sp = 1.2 + rnd() * (2.2 + st * 2.5); spawn(x, y, z, Math.cos(a) * sp, 1.2 + rnd() * 2.5, Math.sin(a) * sp, r * (0.8 + rnd() * 0.4), g * (0.8 + rnd() * 0.4), b * (0.8 + rnd() * 0.4), 0.07 + rnd() * 0.05, 0.04, 0.8 + rnd() * 0.5, -9.8, 0.3, 0, 1); }
    };
    J.bellRing = function (x, y, z, big) {
      ring(x, y, z, big ? 1.8 : 1.0, big ? 1.3 : 0.9, 0, 1, 0.82, 0.38, 0);
      ring(x, y, z, big ? 1.2 : 0.7, big ? 1.3 : 0.9, 0, 1, 0.93, 0.62, big ? 0.22 : 0.16);
      if (big) ring(x, y, z, 2.4, 1.5, 0, 1, 0.75, 0.3, 0.45);
      ring(x, y, z, big ? 1.4 : 0.8, 0.5, 1, 1, 0.8, 0.4, 0);
    };
    var CONF = [[0.93, 0.35, 0.25], [0.96, 0.75, 0.25], [0.35, 0.72, 0.9], [0.5, 0.8, 0.45], [0.95, 0.9, 0.8], [0.85, 0.45, 0.7]];
    J.confetti = function (x, y, z, n) {
      var k, a, sp, c; n = Math.min(n || 90, 140);
      for (k = 0; k < n; k++) { a = rnd() * 6.283; sp = 0.8 + rnd() * 3.2; c = CONF[(rnd() * CONF.length) | 0]; spawn(x + (rnd() - 0.5) * 0.4, y, z + (rnd() - 0.5) * 0.4, Math.cos(a) * sp, 3 + rnd() * 4, Math.sin(a) * sp, c[0], c[1], c[2], 0.13 + rnd() * 0.08, 0.13, 2.2 + rnd() * 1.2, -3.2, 1.2, 2.5 + rnd() * 2, 1); }
      J.stats.confetti += n;
    };
        J.shake = function (amp) { if (!J.shakeOn || !J.on) return; if (amp > SS[0]) SS[0] = amp; J.stats.shakes++; };
    J.pop = function (text, x, y, z) {
      if (!J.on || !doc) return; var el = pops[popCur]; popCur = (popCur + 1) % NPOP;
      v3.set(x, y, z).project(camera); if (v3.z > 1) return;
      var W = root.innerWidth, H = root.innerHeight, px = Math.max(40, Math.min(W - 80, (v3.x * 0.5 + 0.5) * W)), py = Math.max(90, Math.min(H - 190, (-v3.y * 0.5 + 0.5) * H));
      el.textContent = text; el.style.setProperty('--x', px.toFixed(0) + 'px'); el.style.setProperty('--y', py.toFixed(0) + 'px'); retrigger(el, 'go'); J.stats.pops++;
    };
    J.flash = function () { if (!J.on || !flashEl) return; retrigger(flashEl, 'go'); J.stats.flashes++; };
    /* a win: rings, glow, confetti, flash */
    J.win = function (x, y, z, confettiN) { if (!J.on) return; J.bellRing(x, y, z, true); J.confetti(x, y + 0.3, z, confettiN || 90); J.flash(); };
    /* ----- per-body impact probe: a sudden drop in speed between two frames is a hit ----- */
    var budget = 4, frame = 0;
    J.probe = function (rec) {
      var dx = rec.cx - rec.px, dy = rec.cy - rec.py, dz = rec.cz - rec.pz, s = Math.sqrt(dx * dx + dy * dy + dz * dz) / DT, a = rec.js || 0;
      rec.js = s;
      if (a < 3.5 || s > a * 0.55 || budget <= 0 || frame - (rec.jf || -9) < 5) return;
      rec.jf = frame; budget--; J.stats.events++;
      var st = Math.min(1, (a - s) / 14), x = rec.cx, y = rec.cy, z = rec.cz, k = rec.kind, near = y - ground(x, z) < 0.35;
      if (k === 'bell') { if (frame - (rec.jb || -99) > 20) { rec.jb = frame; J.bellRing(x, y, z, false); } return; }
      J.dust(x, y, z, st, near);
      if (a > 6 && (/^brick|^beam/.test(k) || rec.isAmmo)) J.chips(x, y, z, st, 0.78, 0.36, 0.2);
      if (st > 0.5 && rec.isAmmo && a > 11) J.shake(0.025 + 0.05 * st);
      if (st > 0.15) { J.last.x = x; J.last.y = y; J.last.z = z; J.last.t = frame; }
    };
    /* ----- per-frame step: move the particles and rings in place, then the camera shake ----- */
    J.update = function (dt, viewH, now) {
      var k, o, t, f, live2 = 0, any = false; frame++; budget = 4;
      pMat.uniforms.uScale.value = viewH * 0.5 / Math.tan(camera.fov * Math.PI / 360);
      if (!J.on) { if (prevLive) { for (k = 0; k < NP; k++) life[k] = 0; points.visible = false; prevLive = 0; } if (rlive) { rings.visible = false; rlive = 0; } SS[0] = 0; return; }
      if (prevLive) {
        for (k = 0; k < NP; k++) {
          if (life[k] <= 0) { aP[k * 3] = 0; aP[k * 3 + 1] = 0; continue; }
          o = k * 3; life[k] -= dt; if (life[k] <= 0) { aP[o] = 0; aP[o + 1] = 0; continue; }
          f = 1 - life[k] / maxL[k]; live2++;
          vel[o + 1] += grav[k] * dt; t = Math.exp(-drag[k] * dt); vel[o] *= t; vel[o + 1] *= kind[k] ? 1 : t; vel[o + 2] *= t;
          if (flut[k]) { vel[o] += Math.sin(now * 6 + ph[k]) * flut[k] * dt; vel[o + 2] += Math.cos(now * 5 + ph[k]) * flut[k] * dt; if (vel[o + 1] < -1.1) vel[o + 1] = -1.1; }
          pos[o] += vel[o] * dt; pos[o + 1] += vel[o + 1] * dt; pos[o + 2] += vel[o + 2] * dt;
          if (kind[k] && pos[o + 1] < ground(pos[o], pos[o + 2]) + 0.02) { life[k] = Math.min(life[k], 0.25); vel[o] = vel[o + 1] = vel[o + 2] = 0; }
          aP[o + 1] = s0[k] + (s1[k] - s0[k]) * f; aP[o] = kind[k] ? Math.min(1, life[k] * 3) : Math.pow(1 - f, 1.5) * 0.85;
        }
      }
      live = live2; any = live > 0 || prevLive > 0;
      if (any || J.pending) { geo.attributes.position.needsUpdate = true; geo.attributes.aC.needsUpdate = true; geo.attributes.aP.needsUpdate = true; }
      points.visible = live > 0; prevLive = live; if (live > J.stats.maxLive) J.stats.maxLive = live;
      /* rings */
      var ra = 0, m = rings.instanceMatrix.array, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, q = camera.quaternion, qx = q.x, qy = q.y, qz = q.z, qw = q.w;
      var x2 = qx + qx, y2 = qy + qy, z2 = qz + qz, xx = qx * x2, xy = qx * y2, xz = qx * z2, yy = qy * y2, yz = qy * z2, zz = qz * z2, wx = qw * x2, wy = qw * y2, wz = qw * z2;
      var r00 = 1 - (yy + zz), r01 = xy + wz, r02 = xz - wy, r10 = xy - wz, r11 = 1 - (xx + zz), r12 = yz + wx, r20 = xz + wy, r21 = yz - wx, r22 = 1 - (xx + yy);
      for (k = 0; k < NR; k++) {
        o = k * 16;
        if (rlife[k] <= 0) { m[o] = m[o + 5] = m[o + 10] = 0; m[o + 15] = 1; continue; }
        if (rdelay[k] > 0) { rdelay[k] -= dt; m[o] = m[o + 5] = m[o + 10] = 0; m[o + 15] = 1; ra++; continue; }
        rage[k] += dt; f = rage[k] / rlife[k]; if (f >= 1) { rlife[k] = 0; m[o] = m[o + 5] = m[o + 10] = 0; m[o + 15] = 1; continue; }
        ra++; var sc = rmax[k] * (rkind[k] ? 0.5 + f * 0.6 : 0.15 + 0.85 * (1 - (1 - f) * (1 - f)));
        var ddx = cx - rx[k], ddy = cy - ry[k], ddz = cz - rz[k], dl = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz) || 1, pull = 0.3 / dl;
        m[o] = r00 * sc; m[o + 1] = r01 * sc; m[o + 2] = r02 * sc; m[o + 3] = 0; m[o + 4] = r10 * sc; m[o + 5] = r11 * sc; m[o + 6] = r12 * sc; m[o + 7] = 0; m[o + 8] = r20 * sc; m[o + 9] = r21 * sc; m[o + 10] = r22 * sc; m[o + 11] = 0;
        m[o + 12] = rx[k] + ddx * pull; m[o + 13] = ry[k] + ddy * pull; m[o + 14] = rz[k] + ddz * pull; m[o + 15] = 1;
        rAR[k * 3] = f; rAR[k * 3 + 1] = rkind[k]; rAR[k * 3 + 2] = (1 - f) * (rkind[k] ? 0.6 : 0.9);
      }
      if (ra || rlive) { rings.instanceMatrix.needsUpdate = true; rg.attributes.aR.needsUpdate = true; rg.attributes.aC.needsUpdate = true; }
      rings.visible = ra > 0; rlive = ra;
      SS[1] = now;
    };
    /* the camera shake: a small offset, applied after the camera is placed each frame; it fades in about a quarter of a second */
    J.applyShake = function (dt) {
      if (SS[0] < 0.002) { SS[0] = 0; return 0; }
      var a = SS[0], t = SS[1] * 61;
      camera.position.x += Math.sin(t * 1.7) * a; camera.position.y += Math.sin(t * 2.3 + 1) * a * 0.7; camera.position.z += Math.cos(t * 1.9 + 2) * a;
      SS[0] *= Math.exp(-dt * 11); return a;
    };
    J.age = function () { return frame - J.last.t; };
    J.live = function () { return { particles: live, rings: rlive, shake: SS[0], visiblePoints: points.visible, visibleRings: rings.visible }; };
    J.reset = function () { var k; for (k = 0; k < NP; k++) { life[k] = 0; aP[k * 3] = 0; aP[k * 3 + 1] = 0; } for (k = 0; k < NR; k++) rlife[k] = 0; live = 0; prevLive = 1; SS[0] = 0; };
    J.objects = { points: points, rings: rings };
    return J;
  }
  root.RJuice = { make: make, NP: NP, NR: NR };
})(typeof window !== 'undefined' ? window : this);
