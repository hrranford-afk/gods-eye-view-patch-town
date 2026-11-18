/* room-kit recorder.js v1: the room kit's field recorder (KIT_PLAN step 2).
   Moved from Base Camp build 30 (games/base-camp/index.html, section FIELD RECORDER) without WONDERS / wondersTick / makeWonder, which stay in the game.
   Changes from the original text: the load-time block (function recInit() { ... })() is now a plain declaration that the game calls once at load (Base Camp calls it
   exactly where the block was), and the line comments are block comments now. Nothing else. Nothing here runs at load time. Run-time globals used: SCAN, G, DIRECT, RELOC, RECOG, STORE,
   AR, BUILD, mapKnown, recogFrame, toast, esc, $ (Base Camp; later the kit's own files). Keys stay Base Camp's (bc-rec-v1, bc-reports-v1) and so does the report's kind.
   Loads FIRST of the kit files: the game's top-level code does REC.x = [] (sticker, snapshots, bounds, depth).
   Source of truth: games/room-kit/recorder.js (node games/room-kit/tools/kit-check.cjs --sync). No top-level names that HelloXR / gl-matrix define. Never run prettier on this file. ============ */
/* Bounded ring buffers of what the game saw (surfaces, coverage, recognition, tags, things it could not classify, homing attempts, frame times, errors), kept on this */
/* device. "Report" in the menu builds ONE JSON report (optional note, up to 6 small camera snapshots of confused moments). It is only ever downloaded or copied by the */
/* player; nothing is uploaded. Unknown things also become landmarks in the game (WONDERS, which stays in the game: a data table the residents can extend). */
const REC_KEY = 'bc-rec-v1', REPORTS_KEY = 'bc-reports-v1', REC_V = 1;
const REC = { t0: Date.now(), zones: [], zoneLog: [], cover: [], recog: [], tags: [], unknown: [], reloc: [], errs: [], snaps: [], nh: new Map(), nhCount: 0, fps: { n: 0, sum: 0, max: 0, slow: 0, worst: [] }, lastCover: 0, lastZones: 0, lastSnap: {}, prev: null };
function recRing(a, item, max) { a.push(item); if (a.length > max) a.shift(); }
const recT = () => Math.round((Date.now() - REC.t0) / 100) / 10;
function recInit() { /* called once by the game at load (Base Camp: where this block was), so this file only declares */
  try { const old = JSON.parse(localStorage.getItem(REC_KEY) || 'null'); if (old && old.v === REC_V) REC.prev = { at: old.at, dur: old.dur, fps: old.fps, zones: (old.zones || []).slice(0, 12), reloc: (old.reloc || []).slice(-8), errs: (old.errs || []).slice(-8), unknown: (old.unknown || []).slice(-8) }; } catch (e) { /* none */ }
  addEventListener('error', (e) => recRing(REC.errs, { t: recT(), msg: String(e.message || e).slice(0, 300), src: String(e.filename || '').split('/').pop(), line: e.lineno || 0, col: e.colno || 0 }, 30));
  addEventListener('unhandledrejection', (e) => recRing(REC.errs, { t: recT(), msg: 'unhandled rejection: ' + String(e.reason && e.reason.message || e.reason).slice(0, 300) }, 30));
}
function recFrame(dt) { const F = REC.fps, ms = dt * 1000; F.n++; F.sum += ms; if (ms > F.max) F.max = ms; if (ms > 60) { F.slow++; recRing(F.worst, { t: recT(), ms: Math.round(ms) }, 10); } }
function recNonHoriz(p) { /* a hit on a plane that is not flat: counted per 30 cm cell (walls, slopes, chandeliers) */
  REC.nhCount++; const key = Math.floor(p.x / 0.3) + ',' + Math.floor(p.y / 0.3) + ',' + Math.floor(p.z / 0.3); let c = REC.nh.get(key);
  if (!c) { if (REC.nh.size >= 300) return; c = { n: 0, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) }; REC.nh.set(key, c); } c.n++;
}
function recZones() { /* every surface the scan has now: height, size, outline box, type guess, how densely it was hit */
  const low = SCAN.zones.reduce((m, z) => Math.min(m, z.y), 1e9); REC.zones = SCAN.zones.map((z) => ({ id: z.id, type: z.type, name: z.name, h: +(z.y - low).toFixed(2), y: +z.y.toFixed(3), area: +z.area.toFixed(3), w: +z.w.toFixed(2), d: +z.d.toFixed(2), cx: +z.cx.toFixed(2), cz: +z.cz.toFixed(2), hits: z.band ? z.band.n : 0, hitsPerM2: z.band ? Math.round(z.band.n / Math.max(0.01, z.area)) : 0 }));
  recRing(REC.zoneLog, { t: recT(), n: REC.zones.length, area: +REC.zones.reduce((a, z) => a + z.area, 0).toFixed(2) }, 60);
}
function recCover() { recRing(REC.cover, { t: recT(), hits: SCAN.hits, bands: SCAN.bands.length, zones: SCAN.zones.length, mapZones: G.zones.length, nonHoriz: REC.nhCount, weak: SCAN.weak, direct: DIRECT.on ? { hps: +DIRECT.hps.toFixed(0), anch: DIRECT.anch, est: DIRECT.est, none: DIRECT.none, lat: Math.round(DIRECT.lat), pend: DIRECT.pend, chk: DIRECT.chk } : 0, known: +(G.zones.length ? mapKnown() : 0).toFixed(2) }, 120); }
function recRecog(o) { recRing(REC.recog, Object.assign({ t: recT() }, o), 80); }
function recTag(sp) { recRing(REC.tags, { t: recT(), tag: sp.tag, name: sp.name, src: sp.src, y: +sp.y.toFixed(2), area: +(sp.area || 0).toFixed(3), on: sp.on }, 80); }
function recReloc(o) { recRing(REC.reloc, Object.assign({ t: recT(), scanSecs: +RELOC.scanSecs.toFixed(1) }, o), 60); }
function recUnknown(o) { recRing(REC.unknown, Object.assign({ t: recT() }, o), 40); }
function recSnap(reason) { /* a small camera picture of a confused moment (only when the app gives camera frames); kept in memory for the report */
  if (REC.snaps.length >= 6 || performance.now() - (REC.lastSnap[reason] || -1e9) < 20000) return false; const fr = recogFrame(); if (!fr || !fr.real || !fr.img) return false;
  try { const sc = Math.min(1, 640 / Math.max(fr.w, fr.h)), c = document.createElement('canvas'); c.width = Math.max(8, Math.round(fr.w * sc)); c.height = Math.max(8, Math.round(fr.h * sc)); c.getContext('2d').drawImage(fr.img, 0, 0, c.width, c.height);
    REC.lastSnap[reason] = performance.now(); REC.snaps.push({ reason, t: recT(), w: c.width, h: c.height, jpeg: c.toDataURL('image/jpeg', 0.6) }); return true; } catch (e) { return false; }
}
function recSave() { try { const o = { v: REC_V, at: Date.now(), dur: recT(), fps: REC.fps, zones: REC.zones, reloc: REC.reloc, errs: REC.errs, unknown: REC.unknown }; localStorage.setItem(REC_KEY, JSON.stringify(o)); } catch (e) { /* storage full: the recorder is optional */ } }
/* ---- the report ---- */
function buildReport(note) {
  const sess = { seconds: recT(), mode: G.mode, auto: !!G.auto, returning: !!G.returning, locked: !!G.locked, visits: G.visits || 0, phase: G.phase, storage: { status: STORE.status, fails: STORE.fails, err: STORE.err, usedBackup: !!STORE.usedBackup }, settlements: G.settlements.length, spots: G.spots.length, mapZones: G.zones.length, mapKnown: +(G.zones.length ? mapKnown() : 0).toFixed(2), questions: AUTO.questions || 0 };
  const nh = [...REC.nh.values()].sort((a, b) => b.n - a.n).slice(0, 30);
  const R = { kind: 'base-camp-field-report', v: REC_V, build: BUILD, at: new Date().toISOString(), note: String(note || '').slice(0, 2000), device: { ua: navigator.userAgent, w: innerWidth, h: innerHeight, dpr: devicePixelRatio, ar: !!AR.on, arOk: !!AR.ok, camera: !!(AR.on && recogFrame()), mem: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null },
    session: sess, fps: { frames: REC.fps.n, avgMs: REC.fps.n ? +(REC.fps.sum / REC.fps.n).toFixed(1) : 0, maxMs: Math.round(REC.fps.max), slow: REC.fps.slow, worst: REC.fps.worst }, zones: REC.zones, zoneLog: REC.zoneLog, coverage: REC.cover, recognition: REC.recog, recogStats: RECOG.stats, tags: REC.tags, unknown: REC.unknown, nonHorizontalHits: { total: REC.nhCount, cells: nh }, homing: REC.reloc, totem: { attempts: REC.totem, stats: TOTEM.stats }, rooms: homeSummary(), scanQuality: { trustedHits: SCAN.hits, weakHits: SCAN.weak, direct: DIRECT.on ? { hps: +DIRECT.hps.toFixed(0), anch: DIRECT.anch, est: DIRECT.est, none: DIRECT.none, err: DIRECT.err, chk: DIRECT.chk } : null }, lock: RELOC.lock || null, sticker: stkReport(), roomSnapshots: snapReport() /* build 28: numbers only, no pictures */, depth: depthReport() /* build 30: numbers only */, errors: REC.errs, previousSession: REC.prev,
    snapshots: REC.snaps.map((s) => ({ reason: s.reason, t: s.t, w: s.w, h: s.h, jpeg: s.jpeg })) };
  return JSON.stringify(R);
}
function reportsLoad() { try { const a = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function reportsAdd(json, note) {
  let list = reportsLoad(); list.push({ id: Date.now(), at: new Date().toISOString(), note: String(note || '').slice(0, 80), bytes: json.length, json }); list = list.slice(-5);
  for (let tries = 0; tries < 6; tries++) { try { localStorage.setItem(REPORTS_KEY, JSON.stringify(list)); return list; } catch (e) { const i = list.findIndex((r) => r.json && r.json.indexOf('"jpeg"') > 0 && r.id !== list[list.length - 1].id); if (i >= 0) { try { const o = JSON.parse(list[i].json); o.snapshots = []; list[i].json = JSON.stringify(o); list[i].stripped = true; continue; } catch (e2) { /* fall through */ } } list.shift(); if (!list.length) return []; } }
  return list;
}
function reportCopy(text) { /* the web view may not have the clipboard API: fall back to a hidden textarea and execCommand */
  const fb = () => { const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } t.remove(); return ok; };
  try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => true, () => fb()); } catch (e) { /* use the fallback */ }
  return Promise.resolve(fb());
}
function reportDownload(text, name) { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); return true; } catch (e) { return false; } }
function reportUi(msg) {
  const m = $('modal'); m.hidden = false; const list = reportsLoad().slice().reverse();
  m.innerHTML = '<div class="dh">Report</div><div class="sub">' + (msg || 'Builds one file about what the game saw in your room (surfaces, recognition, homing, speed, errors) and up to 6 small camera pictures of confusing moments. It stays on this device until you download or copy it yourself.') + '</div><textarea id="repNote" rows="3" maxlength="2000" placeholder="Anything to add? (what felt wrong)"></textarea><div class="mrow"><button id="repBuild" class="big alt">Build report</button><button id="repClose">Close</button></div>'
    + (list.length ? '<div class="sub">Last reports</div>' + list.map((r) => '<div class="lib"><div><b>' + esc(r.at.replace('T', ' ').slice(0, 16)) + '</b> ' + esc(r.note || '') + '<div class="sub">' + (r.bytes / 1024).toFixed(0) + ' KB' + (r.stripped ? ' (pictures dropped to save room)' : '') + '</div></div><button data-rdl="' + r.id + '">Download</button><button data-rcp="' + r.id + '">Copy</button></div>').join('') : '');
  m.onclick = async (ev) => {
    const t = ev.target.closest('button'); if (!t) return;
    if (t.id === 'repClose') { m.hidden = true; return; }
    if (t.id === 'repBuild') { const json = buildReport($('repNote').value); reportsAdd(json, $('repNote').value); reportUi('Report built: ' + (json.length / 1024).toFixed(0) + ' KB, ' + REC.snaps.length + ' picture' + (REC.snaps.length === 1 ? '' : 's') + '. Download it or copy it below.'); return; }
    const r = reportsLoad().find((q) => String(q.id) === (t.dataset.rdl || t.dataset.rcp)); if (!r) return;
    if (t.dataset.rdl) toast(reportDownload(r.json, 'base-camp-report-' + r.at.slice(0, 16).replace(/[:T]/g, '-') + '.json') ? 'Report downloaded.' : 'Download is not available here. Use Copy.');
    else toast((await reportCopy(r.json)) ? 'Report copied.' : 'Copy is not available here. Use Download.');
  };
}
