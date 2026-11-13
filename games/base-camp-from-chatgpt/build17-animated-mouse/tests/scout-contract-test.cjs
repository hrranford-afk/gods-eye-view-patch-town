// Lightweight no-browser check: ensure the generated Scout model supplies every animated part.
// This is a geometric interface test, not a screenshot or WebXR end-to-end test.
const fs = require('node:fs'), assert = require('node:assert/strict'), path = require('node:path');
const index = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=index.indexOf('function mkMouseScout(c) {'), stop=index.indexOf('\nfunction mkColonist(c) {',start);
assert(start>0 && stop>start, 'Scout function must exist before mkColonist');
const src=index.slice(start,stop);
class Vec { constructor(...a){this.values=a;} set(...v){this.values=v;return this;} setScalar(s){this.values=[s,s,s];return this;} }
class Geometry { translate(){return this;} rotateX(){return this;} rotateZ(){return this;} }
class Object3D { constructor(){this.children=[];this.position=new Vec();this.rotation=new Vec();this.scale=new Vec();this.userData={};} add(...children){this.children.push(...children);} }
class Mesh extends Object3D { constructor(g,m){super();this.geometry=g;this.material=m;} }
class Group extends Object3D {}
const THREE={ Group, Mesh, RingGeometry: Geometry, CircleGeometry: Geometry,
  MeshBasicMaterial: class {}, MeshStandardMaterial:class{}, DoubleSide:2, AdditiveBlending: 3, SphereGeometry: Geometry, TorusGeometry:Geometry,
  BoxGeometry:Geometry, CylinderGeometry:Geometry, CatmullRomCurve3:Geometry,
  TubeGeometry:Geometry, ConeGeometry: Geometry, PlaneGeometry:Geometry,
  Vector3:class{ constructor(...xyz){this.xyz=xyz;} },
  Line: Mesh, LineBasicMaterial:class{}, BufferGeometry:class{setFromPoints(){return this;}} };
const geo=(k,f)=>f(), M=(col)=>({col}), mesh=(shape,mat,x,y,z)=>{const o=new Mesh(shape,mat);o.position.set(x||0,y||0,z||0);return o;};
const blob=()=>new Mesh(new Geometry(),{}), glowSprite=()=>new Mesh(new Geometry(),{}), RING_MAT={},COL_S=1.25;
// Construct in an isolated scope using the exact model function text from the shipping game.
const build = new Function('THREE','geo','M','mesh','blob','glowSprite','RING_MAT','COL_S','scout16Mat','scout16Texture','scout17Attach', src+'\nreturn mkMouseScout({name:"Pip"});');
const character=build(THREE,geo,M,mesh,blob,glowSprite,RING_MAT,COL_S, (kind)=>({kind}), (kind)=>({kind}),()=>{}), u=character.userData;
for(const key of ['body','eyes','arms','legs','smile','mouthO','flag','ears','pack','tail','nose','glow']) assert(u[key], 'Missing animation contract: '+key);
assert.equal(u.eyes.length,2);assert.equal(u.arms.length,2);assert.equal(u.legs.length,2);assert.equal(u.ears.length,2);
assert(character.children.length>=3);
assert(index.includes('scout: !!c.scout'), 'Persistence field must be saved');
assert(index.includes("if (c.scout) return mkMouseScout(c);"), 'Model dispatch must use scout flag');
assert(index.includes("if (c.scout) return 'Scout'"), 'Scout personality must be selected');
console.log('PASS: mouse geometry builds; animated parts, dispatch and save contract are present.');
