/* Asset contract tests (headless Chromium for one step; no Blender, no iPad, no network). Run from games/city-lab: NODE_PATH=$(npm root -g) node tests/asset-test.js
   1 the valid fixture passes all 12 checks; 2 each hostile asset is rejected by the SPECIFIC check responsible, and the verifier never throws; 3 the fixture builder is deterministic;
   4 a REAL loader (three.js r128 GLTFLoader) reads the valid GLB and agrees with the verifier on triangles, bounds and the socket position (an independent confirmation). */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
let n = 0, bad = 0; const ok = (name, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + name + (!c && x !== undefined ? '  -> ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 260) : '')); };
(async () => {
  const V = await import(path.join(ROOT, 'shared/tools/asset-verify.mjs')), MK = await import(path.join(ROOT, 'shared/tools/make-test-assets.mjs'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'assets-')), failing = (r) => r.filter((x) => !x.ok).map((x) => x.name.split(' ')[0]);
  const good = MK.make(tmp, 'valid'); let r = V.verify(good.manifest, good.request);
  ok('the valid fixture passes all 12 checks (with its request)', r.length === 12 && r.every((x) => x.ok), r.filter((x) => !x.ok));
  ok('the numbers the fixture builder computed by construction (120 and 36 triangles) equal what the verifier counts from the bytes', good.tris0 === 120 && good.tris1 === 36 && /120 triangles/.test(r[5].why), [good.tris0, good.tris1, r[5].why]);
  const CASES = [
    ['the GLB was changed after the manifest was made (sha256 mismatch)', { tamper: true }, '3'], ['a listed LOD file is missing', { missing: true }, '3'], ['a path leaves the folder (..)', { traversal: true }, '3'],
    ['the manifest links a different recipe than the request', { wrongRecipe: true }, '2'], ['an unknown key in the manifest', { unknownKey: true }, '1'],
    ['bad GLB magic', { badMagic: true }, '4'], ['a truncated GLB', { truncate: true }, '4'],
    ['a glTF extension is declared', { patch0: (j) => { j.extensionsUsed = ['KHR_draco_mesh_compression']; } }, '5'], ['a camera is inside the file', { patch0: (j) => { j.cameras = [{ type: 'perspective', perspective: { yfov: 1, znear: 0.1 } }]; } }, '5'],
    ['an animation is inside the file (v0 is static)', { patch0: (j) => { j.animations = [{ channels: [], samplers: [] }]; } }, '5'], ['an external image link', { patch0: (j) => { delete j.images[0].bufferView; j.images[0].uri = 'http://example.invalid/t.png'; } }, '5'],
    ['a code-like node name', { patch0: (j) => { j.nodes[1].name = 'x";alert(1)//'; } }, '5'], ['too many triangles for the class (prop)', { class: 'prop', manyBoxes: 200 }, '6'], ['the manifest claims the wrong triangle count', { claimTris: 12 }, '6'],
    ['LOD1 is not lighter than LOD0', { lod1Heavy: true }, '7'], ['a texture that is not a power of two', { tex: { w: 60, h: 64 } }, '8'], ['a texture too large for the class', { tex: { w: 2048, h: 2048 } }, '8'], ['too many materials for the class', { materials: 9 }, '8'],
    ['a file above the class size cap', { binPad: 5000000 }, '9'], ['geometry below the ground plane', { below: true }, '10'], ['the file is wider than the recipe footprint', { wide: true }, '10'], ['the manifest footprint differs from the file', { badFootprint: true }, '10'],
    ['no collider', { collider: null }, '11'], ['no socket on a building', { sockets: [], manifestSockets: [] }, '11'], ['a socket is not where the manifest says', { manifestSockets: [{ name: 'door', pos: [0, 0.4, 0.9] }] }, '11'],
    ['inspection counts do not add up', { inspection: { checks_total: 12, checks_passed: 10, failed: [] } }, '12'], ['the producer reports a failed check on an approved run', { inspection: { checks_total: 12, checks_passed: 11, failed: ['footprint'] } }, '12'], ['the run was not approved by the owner', { approved: false }, '12']];
  CASES.forEach(([name, o, want]) => { let rr, threw = false; try { const a = MK.make(tmp, 'case', o); rr = V.verify(a.manifest, a.request); } catch (e) { threw = true; } ok('hostile: ' + name + ' is rejected by check ' + want, !threw && failing(rr).includes(want) && failing(rr).length >= 1, threw ? 'THREW' : failing(rr)); });
  { const d = path.join(tmp, 'garbage'); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'manifest.json'), '{"schema": not json'); let rr, threw = false; try { rr = V.verify(path.join(d, 'manifest.json')); } catch (e) { threw = true; } ok('hostile: a manifest that is not JSON is a FAIL line, not a crash', !threw && rr[0] && !rr[0].ok); }
  { const a = MK.make(tmp, 'a'), b = MK.make(tmp, 'b'); const h = (d) => crypto.createHash('sha256').update(fs.readFileSync(path.join(d, 'shed_01.glb'))).digest('hex'); ok('the fixture builder is deterministic (same GLB bytes twice)', h(a.dir) === h(b.dir)); }
  ok('the valid fixture still passes after all the hostile builds (nothing shared or mutated)', V.verify(good.manifest, good.request).every((x) => x.ok));
  /* a REAL loader agrees with the verifier */
  const LOADER = ['/home/user/gods-eye-view-patch-town/.worktrees/patchtown-ios/apps/patchtown-ios/PatchTown/Games/_vendor/jsdelivr/three@0.128.0/examples/js/loaders/GLTFLoader.js'].find((p) => fs.existsSync(p));
  const THREE = ['/home/user/gods-eye-view-patch-town/.worktrees/brick-lab/games/brick-lab/vendor/three/three.min.js', '/home/user/gods-eye-view-patch-town/.worktrees/pages/brick-lab/vendor/three/three.min.js'].find((p) => fs.existsSync(p));
  if (!LOADER || !THREE) ok('SKIPPED real loader check: three.js r128 or its GLTFLoader not found locally', true);
  else {
    const { chromium } = require('playwright'); const b = await chromium.launch(), p = await b.newPage(); await p.route(/^https?:\/\//, (rt) => rt.abort());
    await p.setContent('<html><body></body></html>'); await p.addScriptTag({ content: fs.readFileSync(THREE, 'utf8') }); await p.addScriptTag({ content: fs.readFileSync(LOADER, 'utf8') });
    const bytes = Array.from(fs.readFileSync(path.join(good.dir, 'shed_01.glb')));
    const R = await p.evaluate((arr) => new Promise((res, rej) => { const ab = new Uint8Array(arr).buffer; new THREE.GLTFLoader().parse(ab, '', (g) => { let tris = 0; g.scene.traverse((o) => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); g.scene.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(g.scene), so = g.scene.getObjectByName('socket_door'), v = so ? so.getWorldPosition(new THREE.Vector3()) : null; res({ tris, min: bb.min.toArray(), max: bb.max.toArray(), socket: v ? v.toArray() : null, collider: !!g.scene.getObjectByName('collider') }); }, rej); }), bytes);
    await b.close(); const man = JSON.parse(fs.readFileSync(good.manifest, 'utf8'));
    ok('a real loader (three.js r128 GLTFLoader) reads the valid GLB without error and finds the collider', R.collider === true, R);
    ok('the real loader counts the same triangles as the verifier and the builder (120)', R.tris === 120 && R.tris === man.lods[0].triangles, R.tris);
    ok('the real loader finds the same bounds as the manifest (each side within 0.001)', R.min.every((v, i) => Math.abs(v - man.bounds.min[i]) < 1e-3) && R.max.every((v, i) => Math.abs(v - man.bounds.max[i]) < 1e-3), [R.min, R.max, man.bounds]);
    ok('the real loader finds the door socket where the manifest says', R.socket && R.socket.every((v, i) => Math.abs(v - man.sockets[0].pos[i]) < 1e-3), R.socket);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('\n' + (bad ? bad + ' FAILED of ' + n : n + ' of ' + n + ' checks passed')); process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('FAIL test crashed: ' + e.message); process.exit(1); });
