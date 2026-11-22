/* Approaches showcase checks. Run from repo root: node games/living-islands/approaches/tests/approaches-test.js
   1 the shared heightmap generator is deterministic (two fresh runs give identical bytes, and match the exported island.npy/island.json)
   2 every approach image exists, is 1200x800 and is not blank (colour spread and distinct colours measured with PIL) */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const py = code => execFileSync('python3', ['-c', code], { cwd: here, encoding: 'utf8' }).trim();
const hashRun = () => py("import heightmap as H,hashlib,json;h,js=H.build();print(hashlib.sha1(h.tobytes()).hexdigest(),hashlib.sha1(json.dumps(js,sort_keys=True).encode()).hexdigest())");
const a = hashRun(), b = hashRun();
ok(a === b, 'heightmap + props are identical across two fresh runs (' + a.split(' ')[0].slice(0, 12) + ')');
const onDisk = py("import numpy as np,hashlib,json;h=np.load('island.npy');j=json.load(open('island.json'));print(hashlib.sha1(h.tobytes()).hexdigest(),len(j['heights_cm']),j['n'])").split(' ');
ok(onDisk[0] === a.split(' ')[0], 'exported island.npy matches the generator');
ok(Number(onDisk[1]) === Number(onDisk[2]) ** 2, 'island.json holds n*n heights (' + onDisk[1] + ')');
const stats = py("import numpy as np;h=np.load('island.npy');print((h>0).mean(),h.max(),h.min())").split(' ').map(Number);
ok(stats[0] > .15 && stats[0] < .5 && stats[1] > 10 && stats[2] < -3, 'island shape sane: land fraction ' + stats[0].toFixed(2) + ', peak ' + stats[1].toFixed(1) + ' m, floor ' + stats[2].toFixed(1) + ' m');
const names = ['0 existing real-time look', '1 ray-marched heightfield (numpy)', '2 SDF raymarch (WebGL)', '3 painted illustration', '4 voxel (three.js)'];
for (let i = 0; i <= 4; i++) {
  const f = path.join(here, 'shots', `appr-${i}.png`);
  if (!fs.existsSync(f)) { ok(false, `${names[i]}: shots/appr-${i}.png missing`); continue; }
  const buf = fs.readFileSync(f); const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  ok(buf.slice(1, 4).toString() === 'PNG' && w === 1200 && h === 800, `${names[i]}: png ${w}x${h}`);
  const [sd, nc] = py(`from PIL import Image;import numpy as np;a=np.asarray(Image.open(r'${f}').convert('RGB'),float);print(a.std(axis=(0,1)).mean(),len(np.unique((a//8).reshape(-1,3),axis=0)))`).split(' ').map(Number);
  ok(sd > 20 && nc > 400, `${names[i]}: not blank (std ${sd.toFixed(1)}, ${nc} distinct colour bins)`);
}
process.exit(fails ? 1 : 0);
