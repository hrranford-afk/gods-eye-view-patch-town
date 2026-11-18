/* room-kit dev.js v1: the room kit's developer panel and the native world-map hook (KIT_PLAN step 2).
   Moved from Base Camp build 30 (games/base-camp/index.html, section DEVELOPER MODE and the worldMap* functions after it).
   Changes from the original text: the load-time block (function devStart() { ... })() is now a plain declaration that the game calls once at load (Base Camp calls it
   exactly where the block was), and the line comments are block comments now. Nothing else. Nothing here runs at load time. Run-time globals used: frameN, SCAN, STK, AR, G, SNAP, RELOC,
   REC, RECOG, DEPTH, HOMES, BUILD, STK_MIN_N4, stkView, stkOwner, homeName, depthSlow, store, esc, $ (Base Camp; later the kit's own files). Keys stay Base Camp's (bc-dev,
   base-camp-worldmap) and so does the copied JSON's kind.
   Source of truth: games/room-kit/dev.js (node games/room-kit/tools/kit-check.cjs --sync). No top-level names that HelloXR / gl-matrix define. Never run prettier on this file. ============ */
/* ============ DEVELOPER MODE (build 30): a small corner panel for testing on the iPad. ?dev=1, or hold the build line on the title for 3 s. Read HANDOVER "Developer mode (build 30)". ============
   One row per part of the AR stack: a tick (working), a cross (should work but does not) or a dash (not running here), and a number. Refreshed twice a second while open.
   "Copy numbers" copies the panel as JSON (numbers and short texts only, never a picture). When closed the panel does not exist: nothing on the page moves. */
const DEV = { on: false, el: null, timer: 0, prev: null, rate: null, hold: 0, last: null, copied: '' };
function devRows() { /* the numbers behind the panel: [tick, label, text] per row, plus the raw numbers for the JSON */
  const now = performance.now(), P = DEV.prev, n = { t: now, frames: frameN, hits: SCAN.hits, pics: STK.seq || 0 };
  if (P && now - P.t >= 2000) { /* rates over at least 2 s (pictures come a few a second) */ const s = (now - P.t) / 1000; DEV.rate = { fps: (n.frames - P.frames) / s, hits: (n.hits - P.hits) / s, pics: Math.max(0, n.pics - P.pics) / s }; DEV.prev = n; } else if (!P) DEV.prev = n;
  const R = DEV.rate || { fps: NaN, hits: NaN, pics: NaN }, wait = !DEV.rate, f0 = (v, d) => (isFinite(v) ? v.toFixed(d || 0) : '...'), ar = !!AR.on, poseOk = ar && now - (AR.poseT || 0) < 1000, im = ar && STK.img && STK.img.naturalWidth ? STK.img : null, rot = im ? stkView(im.naturalWidth, im.naturalHeight, AR.projM.elements).rot : null;
  const kf = G.snap ? G.snap.kf.length : 0, pts = G.snap ? G.snap.kf.reduce((a, k) => a + k.n, 0) : 0, L = RELOC.lock, lockHow = L ? (L.stk || L.snap || 'surfaces') : '', lockSd = L && L.snap && SNAP.lastF && SNAP.lastF.sdP ? SNAP.lastF.sdP * 100 : null;
  const sk = STK.lastSeen && now - STK.lastSeen.t < 5000 ? STK.lastSeen : null, skOwn = sk ? stkOwner(sk.id) : null, skN = sk ? (STK.obs[sk.id] || []).length : 0, skWhy = sk && STK.why && now - STK.whyT < 3000 ? STK.why : ''; /* 16 Nov: the sticker row says whose it is, how many sightings toward a fix, and why a fix was refused */
  const c = RECOG.coco, g = REC.recog.length ? REC.recog[REC.recog.length - 1] : null, e = REC.errs.length ? REC.errs[REC.errs.length - 1] : null;
  let kb = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); kb += (k.length + (localStorage.getItem(k) || '').length) / 1024; } } catch (er) { kb = -1; }
  const D = DEPTH, dep = D.state === 'ready' ? (D.lastFit && D.lastFit.ok ? 'tick' : 'dash') : D.state === 'error' ? 'cross' : 'dash';
  const num = { ar: { on: ar, pose: poseOk, fps: +R.fps.toFixed(1) }, hits: { perS: +R.hits.toFixed(1), total: SCAN.hits, surfaces: G.zones.length, scanZones: SCAN.zones.length },
    camera: { perS: +R.pics.toFixed(2), w: im ? im.naturalWidth : 0, h: im ? im.naturalHeight : 0, rot }, snapshots: { keyframes: kf, points: pts, relock: L ? { how: lockHow, s: +((L.ms || 0) / 1000).toFixed(1), sdCm: lockSd === null ? null : +lockSd.toFixed(2) } : null },
    sticker: sk ? { id: sk.id, m: +sk.d.toFixed(2), agoS: +((now - sk.t) / 1000).toFixed(1), owner: skOwn, n: skN, need: STK_MIN_N4, why: skWhy, rej: STK.rej } : { rej: STK.rej }, objects: { state: c.state, runs: c.runs, ms: Math.round(c.ms || 0), last: g ? { cls: g.cls || '', score: g.score || 0 } : null },
    depth: { state: D.state, want: D.want, msRun: Math.round(D.msAvg), fitCm: D.fits ? +D.cm.toFixed(1) : null, occlusion: !!D.shown, runs: D.runs, good: D.good, poor: D.poor, why: D.why }, errors: { count: REC.errs.length, last: e ? String(e.msg).slice(0, 120) : '' }, storageKB: Math.round(kb) };
  const rows = [
    [!ar ? 'dash' : poseOk ? 'tick' : 'cross', 'AR tracking', ar ? (poseOk ? 'pose ok' : 'no pose') + ' · ' + f0(R.fps) + ' fps' : 'not in AR · ' + f0(R.fps) + ' fps'],
    [!ar || wait ? 'dash' : R.hits > 0 || G.zones.length ? 'tick' : 'cross', 'Hit points', f0(R.hits) + '/s · ' + G.zones.length + ' surfaces'],
    [!ar || wait ? 'dash' : R.pics > 0 ? 'tick' : 'cross', 'Camera pictures', ar ? f0(R.pics, 1) + '/s' + (im ? ' · ' + im.naturalWidth + 'x' + im.naturalHeight + ' · turn ' + rot + '°' : ' · none') : '-'],
    [kf ? 'tick' : 'dash', 'Room snapshots', kf + ' kf · ' + pts + ' pts' + (L ? ' · last lock ' + lockHow + ' ' + ((L.ms || 0) / 1000).toFixed(1) + ' s' + (lockSd !== null ? ' ±' + lockSd.toFixed(1) + ' cm' : '') : '')],
    [sk ? (skWhy && skWhy !== 'too few' ? 'cross' : 'tick') : 'dash', 'Sticker', sk ? 'id ' + sk.id + ' · ' + (skOwn ? (skOwn === HOMES.cur ? 'this room' : homeName(skOwn)) : 'no room') + ' · ' + sk.d.toFixed(2) + ' m · ' + (skN >= STK_MIN_N4 ? skN + ' sightings' : skN + '/' + STK_MIN_N4 + ' sightings') + (skWhy ? ' · refused: ' + skWhy : (STK.lastFix[sk.id] && now - STK.lastFix[sk.id] < 5000 ? ' · fix ok' : '')) : 'not seen' + (STK.rej.moving ? ' · ' + STK.rej.moving + ' pictures skipped (moving)' : '')],
    [c.state === 'ready' ? 'tick' : c.state === 'error' ? 'cross' : 'dash', 'Object spotting', c.state + (g ? ' · ' + (g.cls || '?') + ' ' + Math.round((g.score || 0) * 100) + '%' : '')],
    [dep, 'Depth', (depthSlow() ? (!DEPTH.slowOK && DEPTH.soft ? 'off (software GL) \u00b7 ' : 'paused (frames slow) \u00b7 ') : '') + D.state + (D.runs ? ' · ' + Math.round(D.msAvg) + ' ms' : '') + (D.fits ? ' · fit ' + (D.lastFit && D.lastFit.ok ? D.cm.toFixed(1) + ' cm' : D.why) : '') + ' · hiding ' + (D.shown ? 'on' : 'off')],
    [REC.errs.length ? 'cross' : 'tick', 'Errors', REC.errs.length + (e ? ' · ' + String(e.msg).slice(0, 60) : '')],
    [kb < 0 ? 'cross' : kb < 4000 ? 'tick' : 'cross', 'Storage', Math.round(kb) + ' KB']];
  return { rows, num };
}
function devDraw() {
  const el = DEV.el; if (!el) return; const r = devRows(), ic = { tick: '✔', cross: '✖', dash: '–' }; DEV.last = r.num;
  el.querySelector('.devRows').innerHTML = r.rows.map(([k, l, t], i) => '<div class="devRow ' + k + '"><b>' + ic[k] + '</b><span>' + (i + 1) + '. ' + esc(l) + '</span><i>' + esc(t) + '</i></div>').join('');
  const sw = el.querySelector('#devDepth'); if (sw) sw.textContent = 'Show depth: ' + (DEPTH.dbg ? 'on' : 'off');
}
function devOpen() {
  if (DEV.el) return; DEV.on = true; store.set('bc-dev', '1'); const el = document.createElement('div'); el.id = 'devPanel'; DEV.el = el;
  el.innerHTML = '<div class="devHead">Developer · ' + esc(BUILD) + '<button id="devX">×</button></div><div class="devRows"></div><div class="devBtns"><button id="devCopy">Copy numbers</button><button id="devDepth">Show depth: off</button></div><div class="devMsg"></div>';
  $('ui').appendChild(el); devDraw(); DEV.timer = setInterval(devDraw, 500);
  el.onclick = (ev) => { const b = ev.target.closest('button'); if (!b) return; ev.stopPropagation();
    if (b.id === 'devX') devClose(); else if (b.id === 'devCopy') devCopy(); else if (b.id === 'devDepth') { DEPTH.dbg = !DEPTH.dbg; if (!DEPTH.dbg) { const c = document.getElementById('depthDbg'); if (c) c.remove(); } if (DEPTH.dbgMesh) DEPTH.dbgMesh.visible = DEPTH.dbg && DEPTH.shown; devDraw(); } };
}
function devClose() { clearInterval(DEV.timer); DEV.timer = 0; if (DEV.el) DEV.el.remove(); DEV.el = null; DEV.on = false; store.set('bc-dev', '0'); }
function devJSON() { const r = devRows(); return JSON.stringify({ kind: 'base-camp-dev-numbers', build: BUILD, at: new Date().toISOString(), rows: r.rows.map((q) => [q[0], q[1], q[2]]), numbers: r.num }); }
function devCopy() { /* numbers only: the panel's rows and the numbers behind them */
  const s = devJSON(), msg = (t) => { const m = DEV.el && DEV.el.querySelector('.devMsg'); if (m) m.textContent = t; }; DEV.copied = s;
  const old = () => { try { const ta = document.createElement('textarea'); ta.value = s; ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); msg(ok ? 'Copied (' + s.length + ' characters)' : 'Could not copy'); } catch (e) { msg('Could not copy'); } };
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(() => msg('Copied (' + s.length + ' characters)'), old); else old(); } catch (e) { old(); }
}
function devStart() { /* ?dev=1 (or left on last time), or a 3 s hold on the build line on the title */ /* called once by the game at load (Base Camp: where this block was) */
  try { const q = new URLSearchParams(location.search).get('dev'); if (q === '1' || (q !== '0' && store.get('bc-dev') === '1')) setTimeout(devOpen, 0); if (q === '0') store.set('bc-dev', '0'); } catch (e) { /* no panel */ }
  const st = $('arStatus'); if (!st) return; const stop = () => { clearTimeout(DEV.hold); DEV.hold = 0; };
  st.addEventListener('pointerdown', () => { stop(); DEV.hold = setTimeout(() => { DEV.hold = 0; if (DEV.el) devClose(); else devOpen(); }, 3000); });
  for (const t of ['pointerup', 'pointerleave', 'pointercancel']) st.addEventListener(t, stop);
}

/* FUTURE HOOK (native app only): when the page runs inside our own iOS app, WebXRKit's polyfill exposes ARKit's ARWorldMap through */
/* session.nonStandard_getWorldMap() / nonStandard_setWorldMap(map) (see webxr-polyfill.js around lines 5795-5815). Then returning needs no surface matching: */
/* save the map blob next to the room map (worldMapSave) and load it before the session starts (worldMapLoad); ARKit relocalises by itself and the saved frames are valid as they are. */
/* Not implemented natively here: this only detects the API and stores / returns the blob so the app side can be wired in later. Without it relocalisation is the surface matcher above. */
function worldMapAvailable() { return !!(AR.session && typeof AR.session.nonStandard_getWorldMap === 'function' && typeof AR.session.nonStandard_setWorldMap === 'function'); }
async function worldMapSave() { if (!worldMapAvailable()) return false; try { const wm = await AR.session.nonStandard_getWorldMap(); if (wm) { store.set('base-camp-worldmap', typeof wm === 'string' ? wm : JSON.stringify(wm)); return true; } } catch (e) { /* not supported by this app version */ } return false; }
async function worldMapLoad() { if (!worldMapAvailable()) return false; const raw = store.get('base-camp-worldmap'); if (!raw) return false; try { await AR.session.nonStandard_setWorldMap(raw); return true; } catch (e) { return false; } }
