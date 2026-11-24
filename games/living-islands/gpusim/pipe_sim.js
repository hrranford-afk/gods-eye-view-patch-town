/* Living Islands GPU sim prototype: the shared WebGL2 engine (plain WebGL2, no libraries).
   Scheme: the "virtual pipes" shallow-water model (Mei, Decaudin, Hu 2007; O'Brien and Hornus 1993).
   State per cell: depth d (m) and four outflow fluxes f (m^3/s) to the W, E, S, N neighbours. Bed height b (m) is fixed.
   Two passes per step, ping-pong float textures (RGBA32F, NEAREST, texelFetch only, so no float-linear extension is needed):
     1. flux pass : f' = max(0, f*damp + dt*g*dface*((b+d)here - (b+d)neighbour)), dface = face water depth (hydrostatic reconstruction; wave speed sqrt(g d)), then scaled so a cell never gives away more than it holds.
     2. depth pass: d' = max(0, d + dt*(inflow - outflow)/dx^2 + sources*dt).
   The walls of the grid are closed (flux out of the grid is 0), so volume is conserved except for the named sources.
   Everything here is VISUAL / FEEL simulation: float32 on the GPU, not bit-identical between machines (see research/GPU_WORLD_SIMULATION.md). */
(function (root) {
  'use strict';
  const VS = `#version 300 es
  void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }`;
  const FLUX_FS = `#version 300 es
  precision highp float; precision highp int;
  uniform sampler2D uD; uniform sampler2D uF; uniform ivec2 uN; uniform float uK, uDamp, uDt, uDx;
  out vec4 o;
  void main(){
    ivec2 p = ivec2(gl_FragCoord.xy);
    vec4 c = texelFetch(uD, p, 0);
    float h0 = c.r + c.g;
    vec4 f = texelFetch(uF, p, 0) * uDamp;
    ivec2 hi = uN - 1;
    vec4 cW = texelFetch(uD, clamp(p+ivec2(-1,0), ivec2(0), hi), 0), cE = texelFetch(uD, clamp(p+ivec2(1,0), ivec2(0), hi), 0);
    vec4 cS = texelFetch(uD, clamp(p+ivec2(0,-1), ivec2(0), hi), 0), cN = texelFetch(uD, clamp(p+ivec2(0,1), ivec2(0), hi), 0);
    vec4 nb = vec4(cW.r + cW.g, cE.r + cE.g, cS.r + cS.g, cN.r + cN.g);     // neighbour surface heights W E S N
    vec4 nbed = vec4(cW.g, cE.g, cS.g, cN.g);
    // face water depth by hydrostatic reconstruction: highest surface minus highest bed of the two cells (a still sea against a dry shore gives no flow)
    vec4 df = max(vec4(0.0), max(vec4(h0), nb) - max(vec4(c.g), nbed));
    vec4 inside = vec4(p.x > 0, p.x < uN.x-1, p.y > 0, p.y < uN.y-1);
    f = max(vec4(0.0), f + uK * df * (vec4(h0) - nb)) * inside;
    float tot = f.x + f.y + f.z + f.w;
    float sc = tot > 0.0 ? min(1.0, c.r * uDx * uDx / (tot * uDt)) : 1.0;
    o = f * sc;
  }`;
  const DEPTH_FS = `#version 300 es
  precision highp float; precision highp int;
  uniform sampler2D uD; uniform sampler2D uF; uniform ivec2 uN; uniform float uDt, uDx;
  uniform vec4 uRain;   // cx, cy (cells), sigma (cells), rate (m/s at the centre)
  uniform vec4 uBoat;   // cx, cy (cells), sigma (cells), amp (m/s); a dipole along uBoatDir
  uniform vec2 uBoatDir; uniform float uRainAll;   // uRainAll > 0: uniform rain on every cell with bed above 0 (rate uRainAll m/s)
  out vec4 o;
  void main(){
    ivec2 p = ivec2(gl_FragCoord.xy);
    vec4 c = texelFetch(uD, p, 0);
    vec4 fo = texelFetch(uF, p, 0);
    float inflow = 0.0;
    if (p.x > 0)      inflow += texelFetch(uF, p+ivec2(-1,0), 0).y;
    if (p.x < uN.x-1) inflow += texelFetch(uF, p+ivec2( 1,0), 0).x;
    if (p.y > 0)      inflow += texelFetch(uF, p+ivec2(0,-1), 0).w;
    if (p.y < uN.y-1) inflow += texelFetch(uF, p+ivec2(0, 1), 0).z;
    float outflow = fo.x + fo.y + fo.z + fo.w;
    float d = c.r + uDt * (inflow - outflow) / (uDx * uDx);
    vec2 q = vec2(p) + 0.5;
    float src = 0.0;
    if (uRain.w != 0.0) { vec2 r = q - uRain.xy; src += uRain.w * exp(-dot(r, r) / (2.0 * uRain.z * uRain.z)); }
    if (uRainAll != 0.0 && c.g > 0.0) src += uRainAll;
    if (uBoat.w != 0.0) { vec2 a = q - (uBoat.xy + uBoatDir * 1.5 * uBoat.z), b = q - (uBoat.xy - uBoatDir * 1.5 * uBoat.z);
      src += uBoat.w * (exp(-dot(a, a) / (2.0 * uBoat.z * uBoat.z)) - exp(-dot(b, b) / (2.0 * uBoat.z * uBoat.z))); }
    d = max(0.0, d + uDt * src);
    o = vec4(d, c.g, 0.0, 0.0);
  }`;

  function compile(gl, type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function program(gl, fs) { const p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); } return { p, u }; }
  function tex(gl, n, data) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, n, n, 0, gl.RGBA, gl.FLOAT, data || null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }
  function fbo(gl, t) { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('float framebuffer incomplete'); return f; }

  /* cfg: {gl, n, dx, dt, g, damp, bed:Float32Array(n*n), depth0:Float32Array(n*n), sources:(step)=>{rain:[cx,cy,sigma,rate], boat:[cx,cy,sigma,amp], boatDir:[x,y], rainAll}} ; row j = texture y */
  function createSim(cfg) {
    const gl = cfg.gl, n = cfg.n;
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float missing');
    const pf = program(gl, FLUX_FS), pd = program(gl, DEPTH_FS);
    const init = new Float32Array(n * n * 4); for (let i = 0; i < n * n; i++) { init[4 * i] = cfg.depth0[i]; init[4 * i + 1] = cfg.bed[i]; }
    const D = [tex(gl, n, init), tex(gl, n, init)], F = [tex(gl, n, new Float32Array(n * n * 4)), tex(gl, n, new Float32Array(n * n * 4))];
    const DF = [fbo(gl, D[0]), fbo(gl, D[1])], FF = [fbo(gl, F[0]), fbo(gl, F[1])];
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    let di = 0, fi = 0, steps = 0, msTotal = 0, msSteps = 0, lastMs = 0;
    const S = { n, dx: cfg.dx, dt: cfg.dt, g: cfg.g, damp: cfg.damp };
    function bindTex(unit, t, loc) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(loc, unit); }
    function one() {
      const s = cfg.sources(steps);
      gl.viewport(0, 0, n, n);
      gl.useProgram(pf.p);                         // pass 1: fluxes
      bindTex(0, D[di], pf.u.uD); bindTex(1, F[fi], pf.u.uF);
      gl.uniform2i(pf.u.uN, n, n); gl.uniform1f(pf.u.uK, S.dt * S.g); gl.uniform1f(pf.u.uDamp, S.damp); gl.uniform1f(pf.u.uDt, S.dt); gl.uniform1f(pf.u.uDx, S.dx);
      gl.bindFramebuffer(gl.FRAMEBUFFER, FF[1 - fi]); gl.drawArrays(gl.TRIANGLES, 0, 3); fi = 1 - fi;
      gl.useProgram(pd.p);                         // pass 2: depth
      bindTex(0, D[di], pd.u.uD); bindTex(1, F[fi], pd.u.uF);
      gl.uniform2i(pd.u.uN, n, n); gl.uniform1f(pd.u.uDt, S.dt); gl.uniform1f(pd.u.uDx, S.dx);
      const r = s.rain || [0, 0, 1, 0], b = s.boat || [0, 0, 1, 0], bd = s.boatDir || [1, 0];
      gl.uniform4f(pd.u.uRain, r[0], r[1], r[2], r[3]); gl.uniform4f(pd.u.uBoat, b[0], b[1], b[2], b[3]); gl.uniform2f(pd.u.uBoatDir, bd[0], bd[1]); gl.uniform1f(pd.u.uRainAll, s.rainAll || 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, DF[1 - di]); gl.drawArrays(gl.TRIANGLES, 0, 3); di = 1 - di;
      steps++;
    }
    const px = new Float32Array(4);
    function sync() { gl.bindFramebuffer(gl.FRAMEBUFFER, DF[di]); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, px); }   // a 1 pixel read forces the GPU to finish: used to time
    return {
      S, gl, get steps() { return steps; },
      step(k) { const t0 = performance.now(); for (let i = 0; i < k; i++) one(); sync(); lastMs = (performance.now() - t0) / k; msTotal += lastMs * k; msSteps += k; return steps; },
      readState() { const o = new Float32Array(n * n * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, DF[di]); gl.readPixels(0, 0, n, n, gl.RGBA, gl.FLOAT, o); return o; },
      readFlux() { const o = new Float32Array(n * n * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, FF[fi]); gl.readPixels(0, 0, n, n, gl.RGBA, gl.FLOAT, o); return o; },
      depthTex() { return D[di]; }, fluxTex() { return F[fi]; },
      reset() { gl.bindTexture(gl.TEXTURE_2D, D[di]); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, n, n, gl.RGBA, gl.FLOAT, init); gl.bindTexture(gl.TEXTURE_2D, F[fi]); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, n, n, gl.RGBA, gl.FLOAT, new Float32Array(n * n * 4)); steps = 0; msTotal = 0; msSteps = 0; },
      timing() { return { lastStepMs: lastMs, meanStepMs: msSteps ? msTotal / msSteps : 0 }; }
    };
  }
  /* the sources are plain functions of the step number (no clocks, no random), so a run is repeatable */
  function summarise(state, n) { let vol = 0, mx = 0, nan = 0, wet = 0; for (let i = 0; i < n * n; i++) { const d = state[4 * i]; if (!(d === d) || !isFinite(d)) { nan++; continue; } vol += d; if (d > mx) mx = d; if (d > 1e-4) wet++; } return { sumDepth: vol, maxDepth: mx, nan, wetCells: wet }; }
  root.PipeSim = { createSim, summarise };
}(typeof window !== 'undefined' ? window : globalThis));
