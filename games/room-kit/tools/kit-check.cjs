/* room-kit tools/kit-check.cjs: keeps the room kit's files honest. No dependencies, runs in seconds.
   node games/room-kit/tools/kit-check.cjs          check: every game's copy equals the source, every kit file parses, runs at load time with no game around
                                                   (so it only declares things), and declares no top-level name that HelloXR / gl-matrix may define.
   node games/room-kit/tools/kit-check.cjs --sync   first copies every kit file into each game's room-kit/ folder, then checks.
   The source of truth is games/room-kit/*.js. Each game in KIT_GAMES carries a byte-identical copy in games/<game>/room-kit/ so the game folder stays complete
   on its own (the test server, a cp -r deploy, the iOS app). See KIT_PLAN.md, section 5. Exit code 0 = all good, 1 = something to fix. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const KIT = path.join(__dirname, '..'), GAMES = path.join(KIT, '..');
const KIT_GAMES = ['base-camp'];
/* names a HelloXR page may already have as non-configurable globals (gl-matrix style helpers): a top-level const / let / function / class with one of these is a SyntaxError on the iPad */
const FORBID = ['lerp', 'create', 'clone', 'copy', 'set', 'add', 'sub', 'subtract', 'mul', 'multiply', 'div', 'divide', 'scale', 'scaleAndAdd', 'length', 'len', 'sqrLen', 'squaredLength', 'distance', 'dist', 'sqrDist', 'squaredDistance', 'negate', 'inverse', 'invert', 'normalize', 'dot', 'cross', 'min', 'max', 'floor', 'ceil', 'round', 'random', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'transformMat3', 'transformMat4', 'transformQuat', 'angle', 'zero', 'str', 'equals', 'exactEquals', 'fromValues', 'identity', 'forEach', 'mix', 'clamp'];
const files = fs.readdirSync(KIT).filter((f) => f.endsWith('.js')).sort();
const bad = []; let synced = 0;
if (process.argv.includes('--sync')) for (const g of KIT_GAMES) { const dir = path.join(GAMES, g, 'room-kit'); fs.mkdirSync(dir, { recursive: true }); for (const f of files) { const src = fs.readFileSync(path.join(KIT, f)), dst = path.join(dir, f); if (!fs.existsSync(dst) || !src.equals(fs.readFileSync(dst))) { fs.writeFileSync(dst, src); synced++; } } }
for (const f of files) {
  const src = fs.readFileSync(path.join(KIT, f), 'utf8');
  try { new vm.Script(src, { filename: f }); } catch (e) { bad.push(f + ': does not parse: ' + e.message); continue; }
  /* run it alone, with every forbidden name already defined the way HelloXR does it (non-configurable, read-only): a clash throws, and so does any top-level code that needs the game or the page */
  const ctx = vm.createContext({});
  for (const n of FORBID) { const fn = function () {}; fn.rkMark = 1; Object.defineProperty(ctx, n, { value: fn, writable: false, enumerable: false, configurable: false }); }
  try { vm.runInContext(src, ctx, { filename: f, timeout: 2000 }); } catch (e) { bad.push(f + ': fails when loaded alone (a forbidden top-level name, or code that runs at load time): ' + e.message); }
  for (const n of FORBID) { let mine = false; try { mine = vm.runInContext('!(typeof ' + n + ' === "function" && ' + n + '.rkMark === 1)', ctx); } catch (e) { mine = true; } if (mine) bad.push(f + ': declares the top-level name ' + n + ' (HelloXR may define it)'); } /* a const / let / class shadows the page's own name in node, but is a SyntaxError on the iPad */
  for (const n of FORBID) if (new RegExp('^var\\s+' + n + '\\b', 'm').test(src)) bad.push(f + ': top-level var ' + n);
  for (const g of KIT_GAMES) { const dst = path.join(GAMES, g, 'room-kit', f); if (!fs.existsSync(dst)) bad.push(g + '/room-kit/' + f + ': missing (run with --sync)'); else if (fs.readFileSync(dst, 'utf8') !== src) bad.push(g + '/room-kit/' + f + ': differs from games/room-kit/' + f + ' (edit the kit source, then --sync)'); }
}
for (const g of KIT_GAMES) { const dir = path.join(GAMES, g, 'room-kit'); if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (f.endsWith('.js') && !files.includes(f)) bad.push(g + '/room-kit/' + f + ': not in games/room-kit (a stray copy)'); }
console.log('room-kit check: ' + files.length + ' kit file(s) [' + files.join(', ') + '], games: ' + KIT_GAMES.join(', ') + (synced ? ', synced ' + synced + ' file(s)' : '') + ' | ' + (bad.length ? 'PROBLEMS:\n  ' + bad.join('\n  ') : 'all good'));
process.exit(bad.length ? 1 : 0);
