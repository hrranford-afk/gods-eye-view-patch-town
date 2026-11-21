/* C02 evidence: the benefit of the weather branch only shows when the roof is damaged. Base recipe vs slate roof vs cool store room, roof tiles destroyed at 20 s, 5 minutes, seed 1. Read-only. */
import fs from 'node:fs';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);
const SIM=require('../../sim.js');const base=JSON.parse(fs.readFileSync(new URL('../../recipes/bakery.json',import.meta.url).pathname,'utf8'));
const tiles=base.parts.filter(p=>p.kind==='roof_tile').map(p=>p.id);
function patch(R,eff){const C=JSON.parse(JSON.stringify(R));eff.forEach(e=>{const t=e.path.replace(/\[(\d+)\]/g,'.$1').split('.');let o=C;for(let i=0;i<t.length-1;i++)o=o[t[i]];o[t[t.length-1]]=e.op==='mul'?o[t[t.length-1]]*e.value:o[t[t.length-1]]+e.value});return C}
function run(R,label){const S=SIM.create(R,{seed:1});SIM.run(R,S,20);SIM.destroy(R,S,tiles,'scenario');SIM.run(R,S,280);const s=SIM.summary(R,S);console.log(label.padEnd(34),'made',s.produced,'sold',s.sold,'flour spoiled',JSON.stringify(s.spoiled),'net/min',s.net_per_min.toFixed(1))}
run(base,'base, roof lost at 20 s');
run(patch(base,[{path:'systems.effects.spoil[0].items.flour',op:'mul',value:0.2}]),'slate roof, roof lost at 20 s');
run(patch(base,[{path:'systems.effects.spoil[0].items.flour',op:'mul',value:1.3},{path:'systems.storage.flour',op:'set',value:100}].filter(e=>e.op==='mul')),'cool store room (spoil only)');
