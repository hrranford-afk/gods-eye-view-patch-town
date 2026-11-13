const fs=require('fs'), assert=require('node:assert/strict'), path=require('path');
const code=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const a=code.indexOf('const SCOUT16_TEX = {}'), b=code.indexOf('// ---- BUILD 16: HANDCRAFTED',a);
assert(a>=0 && b>a);
let made=0, fills=0, strokes=0;
const canvas={width:0,height:0,getContext(){return {
 fillRect(){fills++},strokeRect(){strokes++},beginPath(){},moveTo(){},lineTo(){},stroke(){strokes++},arc(){},fill(){},
 set fillStyle(c){},set strokeStyle(c){},set lineWidth(c){},set lineJoin(v){}
}}};
class CanvasTexture{constructor(c){assert.equal(c,canvas);made++}}
class MeshStandardMaterial{constructor(o){this.params=o}}
const THREE={CanvasTexture,MeshStandardMaterial,RepeatWrapping:1000};
const document={createElement(n){assert.equal(n,'canvas');return canvas}};
const out=new Function('THREE','document',code.slice(a,b)+'\nreturn {scout16Texture,scout16Mat}')(THREE,document);
const f=out.scout16Texture('felt'), p=out.scout16Texture('pack'), m=out.scout16Texture('map');
assert.equal(out.scout16Texture('felt'),f);assert.equal(out.scout16Texture('pack'),p);assert.equal(out.scout16Texture('map'),m);
assert.equal(out.scout16Mat('felt'),out.scout16Mat('felt'));
assert.equal(out.scout16Mat('cream').params.map,f);
assert.equal(out.scout16Mat('pack').params.map,p);
assert.equal(made,3);assert(fills>3 && strokes>2200);
console.log('PASS: procedural felt, woven canvas and map generated once and materials cached.');
