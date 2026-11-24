/* Developer tool: writes infra/patch_row_power.infra.json (city_infra v0) linked to districts/patch_row_power.json by id, version and SHA-256, then checks it with the real validator.
   The kW and the capacities and the costs below are ILLUSTRATIVE (they are not measurements of anything): the owner can edit the file. Run from games/city-lab: node tools/make-infra-link.mjs */
import fs from 'node:fs'; import crypto from 'node:crypto'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const IV = require('../infra-validate.js');
const dp = new URL('../districts/patch_row_power.json', import.meta.url), buf = fs.readFileSync(dp), D = JSON.parse(buf.toString('utf8'));
const I = {
  schema: 'city_infra', version: 0, id: 'patch_row_power_net', name: 'Patch Row power network (illustrative numbers)',
  district: { id: D.id, version: D.version, sha256: crypto.createHash('sha256').update(buf).digest('hex') },
  root: 'root',
  junctions: [{ id: 'root', name: 'the generator junction', cell: [3, 2] }, { id: 'main', name: 'the workshops street', cell: [5, 2] }, { id: 'homes_j', name: 'the homes street', cell: [1, 2] }],
  sources: [{ id: 'gen_a', building: 'gen_1', kw: 13.5, build_cost: 300, upkeep_per_min: 2.7 }],
  cables: [
    { id: 'main_feeder', name: 'Main feeder', from: 'root', to: 'main', capacity_kw: 12, build_cost: 120, upkeep_per_min: 1.0 },
    { id: 'bakery_line', name: 'Bakery line', from: 'main', to: 'bakery', capacity_kw: 7, build_cost: 40, upkeep_per_min: 0.3 },
    { id: 'workshop_line', name: 'Workshop line', from: 'main', to: 'workshop', capacity_kw: 3.5, build_cost: 25, upkeep_per_min: 0.2 },
    { id: 'market_line', name: 'Market line', from: 'main', to: 'market', capacity_kw: 1, build_cost: 10, upkeep_per_min: 0.1 },
    { id: 'shed_line', name: 'Shed line', from: 'main', to: 'shed', capacity_kw: 2, build_cost: 15, upkeep_per_min: 0.1 },
    { id: 'homes_branch', name: 'Homes cable', from: 'root', to: 'homes_j', capacity_kw: 3, build_cost: 40, upkeep_per_min: 0.3 }],
  home_cable: { to: 'homes_j', capacity_kw: 0.6, build_cost: 6, upkeep_per_min: 0.05 }
};
const r = IV.validate(I, D, { districtSha: I.district.sha256 });
if (!r.ok) { console.log(r.errors.join('\n')); process.exit(1); }
fs.mkdirSync(new URL('../infra/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../infra/patch_row_power.infra.json', import.meta.url), JSON.stringify(I, null, 1) + '\n');
console.log('wrote infra/patch_row_power.infra.json (valid), district sha256 ' + I.district.sha256);
