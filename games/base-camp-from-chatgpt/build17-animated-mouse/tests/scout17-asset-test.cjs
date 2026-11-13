const fs=require('node:fs');const assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const glb=fs.readFileSync(path.join(root,'assets','basecamp_mouse_scout_ANIMATED.glb'));
assert.equal(glb.toString('ascii',0,4),'glTF');assert.equal(glb.readUInt32LE(8),glb.length);const jlen=glb.readUInt32LE(12);const j=JSON.parse(glb.toString('utf8',20,20+jlen));
assert.deepEqual(j.animations.map(x=>x.name),['Idle','Walk','Wave','LookAround','Hop']);
for(const a of j.animations)for(const c of a.channels){assert(j.nodes[c.target.node]);assert(!('matrix' in j.nodes[c.target.node]));}
assert(html.includes('scout17Tick(c, dt);'));assert(html.includes('scout17Load();'));assert(html.includes('if (c.scout) return mkMouseScout(c);'));
assert(html.includes('SCOUT17.status = \'fallback\'') && html.includes('SCOUT17.template.clone(true)'));
console.log('PASS: Build 17 contains a valid animated binary GLB, correct clips and legacy procedural fallback.');
