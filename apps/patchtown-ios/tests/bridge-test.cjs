// PatchTown: checks PatchTownBridge.js against a fake native side. Run: node apps/patchtown-ios/tests/bridge-test.cjs
const fs = require('fs'); const assert = require('assert');
const posted = [];
global.window = global;
global.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o.detail; } };
const events = []; window.dispatchEvent = (e) => events.push(e);
// fake native: reply via the callback name, like replyToJS
const native = (name) => ({ postMessage(m) { posted.push([name, m]); setTimeout(() => {
  let r;
  if (name === 'ptWorldMap' && m.action === 'save') r = { saved: true, key: m.key, bytes: 10 };
  else if (name === 'ptWorldMap' && m.action === 'load') r = m.key === 'gone' ? { loaded: false, error: 'no saved map' } : { loaded: true, started: true };
  else if (name === 'setWorldMap') r = m.worldMap ? { loaded: true, started: true } : { loaded: false, error: 'no saved map' };
  else r = { ok: true };
  window[m.callback](r);
}, 1); } });
window.webkit = { messageHandlers: { ptWorldMap: native('ptWorldMap'), setWorldMap: native('setWorldMap'), ptPlanes: native('ptPlanes') } };
// fake polyfill session: like the polyfill, sends worldMap.worldMap
window.XRSession = function () {};
XRSession.prototype.nonStandard_setWorldMap = function (wm) {
  return new Promise((res) => { const cb = 'cb' + Math.random().toString(36).slice(2); window[cb] = res; window.webkit.messageHandlers.setWorldMap.postMessage({ worldMap: wm.worldMap, callback: cb }); });
};
eval(fs.readFileSync(process.argv[2] || require("path").join(__dirname, "..", "PatchTown", "Bridge", "PatchTownBridge.js"), 'utf8'));
(async () => {
  const PT = window.PatchTownNative; const s = new XRSession();
  assert.deepStrictEqual(await PT.worldMap.save('room-1'), { saved: true, key: 'room-1', bytes: 10 });
  assert.strictEqual(posted.at(-1)[1].action, 'save');
  await s.nonStandard_setWorldMap(JSON.stringify({ worldMap: 'QUJD' }));
  assert.strictEqual(posted.at(-1)[1].worldMap, 'QUJD');
  await s.nonStandard_setWorldMap('QUJD'); assert.strictEqual(posted.at(-1)[1].worldMap, 'QUJD');
  await s.nonStandard_setWorldMap({ worldMap: 'QUJD' }); assert.strictEqual(posted.at(-1)[1].worldMap, 'QUJD');
  await s.nonStandard_setWorldMap({ key: 'room-1' }); assert.strictEqual(posted.at(-1)[0], 'ptWorldMap');
  await assert.rejects(s.nonStandard_setWorldMap({ key: 'gone' }));
  await assert.rejects(s.nonStandard_setWorldMap(undefined === 1 ? 0 : {}));
  const wait = PT.worldMap.whenRelocalized(1000);
  PT._event('worldmap', { type: 'relocalizing' }); assert.strictEqual(PT.worldMap.status.relocalized, false);
  PT._event('worldmap', { type: 'mapping', mapping: 'extending' });
  PT._event('worldmap', { type: 'relocalized', relocalized: true, tracking: 'normal' });
  assert.strictEqual(await wait, true); assert.strictEqual(PT.worldMap.status.mapping, 'extending');
  PT._event('planes', { reset: true, updated: [{ id: 'a' }, { id: 'b' }], removed: [] });
  PT._event('planes', { reset: false, updated: [{ id: 'c' }], removed: ['a'] });
  assert.deepStrictEqual([...PT.planes.all.keys()].sort(), ['b', 'c']);
  assert.ok(events.some(e => e.type === 'patchtown:planes'));
  await PT.planes.start({ hz: 2 }); assert.deepStrictEqual(posted.at(-1)[1].hz, 2);
  // no leftover callbacks
  assert.deepStrictEqual(Object.keys(window).filter(k => k.startsWith('__ptcb_')), []);
  console.log('bridge tests OK');
})().catch(e => { console.error(e); process.exit(1); });
