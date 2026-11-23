/* Living Islands: the beach collector robots of the life layer (see LIFE_VIEW.md, COLLECTOR_MODEL.md, ROBOT_RECIPES.md). Loaded only with ?world=NNN&life=1, after animals.js.
   Classic script: sets window.LI_ROBOTS.create(opts) -> { frame(dt, T), hash(), api }. Loads assets/collector/collector_live.glb from its base64 copy (collector_live_b64.js, so file:// works) with the
   vendored GLTFLoader (vendor/GLTFLoader.r128.js). One to three robots per world sit on the beach sites of life.json and run a FIXED routine (no speech, no mood):
   drive along the shore, arm_unfold, head_tilt, drive back, and at midday sun_open; the lamp blinks (clip lamp_blink, scaling lamp_dome). Clips are sampled by hand from the file's own
   animation tracks at a time that is a function of the clock only, so a frozen clock repeats a picture. Behind a driving robot a strip of track prints is stamped on the sand and fades on a seeded timer.
   The committed model is the v2 tortoise; the recipe of each site (role, palette, lamp code) tints the sage paint cheaply in the fragment shader and sets the lamp colour; body plans are NOT rebuilt. */
(function () {
'use strict';
const TAU = Math.PI * 2;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const sm=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const E_ROBOT = 1.8;                 /* exaggeration at table scale (TUNING; the machine is 1.08 m long, so it reads as 1.9 m on the table) */
const CYCLE = 70;                    /* seconds of one routine */
const SAGE = [0.112, 0.150, 0.100];  /* the paint of the committed model (robot_recipe PALETTES.sage) */
let gltfCache = null, gltfWait = [];
function loadModel(cb){
  if(gltfCache){cb(gltfCache);return;}
  gltfWait.push(cb);if(gltfWait.length>1)return;
  if(!THREE.GLTFLoader||!window.LI_COLLECTOR_LIVE_B64){gltfWait=[];return;}
  const bin=atob(window.LI_COLLECTOR_LIVE_B64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(u8.buffer,'',g=>{gltfCache=g;const w=gltfWait;gltfWait=[];w.forEach(f=>f(g));},e=>{console.error('collector parse failed: '+(e&&e.message||e));});
}
/* track print strip: a fixed ring of quads stamped behind the robot; fade by age in the fragment shader */
function makeTread(){const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d');x.clearRect(0,0,64,64);
  for(const x0 of[4,36]){ /* two track bands, a chevron pattern of cleats (alpha) */
    for(let k=0;k<8;k++){const y=k*8;x.fillStyle='rgba(255,255,255,0.95)';x.beginPath();x.moveTo(x0,y+4);x.lineTo(x0+12,y);x.lineTo(x0+24,y+4);x.lineTo(x0+24,y+7);x.lineTo(x0+12,y+3);x.lineTo(x0,y+7);x.closePath();x.fill();}
    x.fillStyle='rgba(255,255,255,0.22)';x.fillRect(x0,0,24,64);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;return t;}
const TREAD_VS=`attribute float aT;varying vec2 vUv;varying float vT;void main(){vUv=uv;vT=aT;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const TREAD_FS=`uniform sampler2D uTex;uniform float uNow;uniform float uErase;varying vec2 vUv;varying float vT;
void main(){float age=uNow-vT;float vis=step(0.0,age)*(1.0-smoothstep(0.4*uErase,uErase,age));float a=texture2D(uTex,vUv).a*vis*0.62;if(a<0.01)discard;gl_FragColor=vec4(0.012,0.010,0.008,a);}`;

function create(o){
  const THREE_=THREE,H=o.H,scene=o.scene,root=o.root,life=o.life,tide=o.tide;
  const sites=(life.robots||[]).filter(r=>r.use);   /* the number wanted; if a use-site is blocked, a spare candidate takes its place */
  const group=new THREE.Group();group.name='robots';root.add(group);
  const items=o.items?o.items():null;
  const W=items||{};
  /* skip sites that collide with the page's own content (houses, tents, camp, jetty, rocks, trees) */
  const pts=[];const add=(a,r)=>(a||[]).forEach(q=>pts.push([q.x,q.z,r]));
  add(W.houses,7);add(W.tents,5);add(W.rocks,2.6);add(W.conifers,2.2);add(W.broad,2.4);if(W.camp&&W.camp.fire)pts.push([W.camp.fire.x,W.camp.fire.z,7]);if(W.jetty&&W.jetty.x!==undefined)pts.push([W.jetty.x,W.jetty.z,9]);
  const clash=(x,z,r)=>pts.some(p=>Math.hypot(p[0]-x,p[1]-z)<p[2]+r);
  const robots=[];
  const all=(life.robots||[]);
  const wanted=sites.length;
  for(const s of all){if(robots.length>=wanted)break;
    /* try the exported place, then the same beach moved along the shore and up the beach, until it clears the page's own content */
    const tx=-s.normal[1],tz=s.normal[0];let hit=null;
    for(const [dt,dn] of [[0,0],[7,0],[-7,0],[14,0],[-14,0],[0,4],[7,4],[-7,4],[0,8],[21,0],[-21,0]]){
      const a=[s.a[0]+tx*dt-s.normal[0]*dn,s.a[1]+tz*dt-s.normal[1]*dn],b=[s.b[0]+tx*dt-s.normal[0]*dn,s.b[1]+tz*dt-s.normal[1]*dn],m=[(a[0]+b[0])/2,(a[1]+b[1])/2];
      if(Math.hypot(m[0],m[1])>o.tableR-14)continue;if(H(m[0],m[1])<.3)continue;
      if(clash(a[0],a[1],1)||clash(b[0],b[1],1)||clash(m[0],m[1],1))continue;
      if(robots.some(q=>Math.hypot(q.pos[0]-m[0],q.pos[1]-m[1])<12))continue;
      hit={a,b,m};break;}
    if(!hit)continue;
    robots.push({site:s,a:hit.a,b:hit.b,n:[s.normal[0],s.normal[1]],shift:0,pos:[hit.m[0],hit.m[1]],yaw:0,pose:null,node:null,mixer:null,ready:false,stampAt:null,tapeN:0});}
  /* a world must have at least one robot: when every site clashes, the first sites are used as exported (a robot beside a rock is better than none) */
  if(robots.length<Math.min(1,all.length)||robots.length<wanted){for(const s of all){if(robots.length>=Math.max(1,wanted))break;if(robots.some(q=>q.site===s))continue;
      const m=[(s.a[0]+s.b[0])/2,(s.a[1]+s.b[1])/2];if(robots.some(q=>Math.hypot(q.pos[0]-m[0],q.pos[1]-m[1])<12))continue;
      robots.push({site:s,a:s.a.slice(),b:s.b.slice(),n:[s.normal[0],s.normal[1]],shift:0,pos:m,yaw:0,pose:null,node:null,mixer:null,ready:false,stampAt:null,tapeN:0});}}
  const tread=makeTread();
  const treadMats=[];
  const ctr=o.api||{};
  const state={loaded:false,errors:0};
  /* per robot: ground fit, routine, clips */
  const R=(i)=>mulberry32(1000+i*17+(o.seed||0));
  robots.forEach((r,i)=>{const rr=R(i);r.off=rr()*CYCLE;r.erase=80+rr()*80;r.lenA=Math.hypot(r.b[0]-r.a[0],r.b[1]-r.a[1]);
    r.dir=[(r.b[0]-r.a[0])/Math.max(1e-6,r.lenA),(r.b[1]-r.a[1])/Math.max(1e-6,r.lenA)];
    /* tread ring */
    const NQ=150;const g=new THREE.BufferGeometry();const pos=new Float32Array(NQ*4*3),uv=new Float32Array(NQ*4*2),aT=new Float32Array(NQ*4).fill(1e9),idx=[];
    for(let q=0;q<NQ;q++){uv.set([0,0,1,0,1,1,0,1],q*8);idx.push(q*4,q*4+1,q*4+2,q*4,q*4+2,q*4+3);}
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setAttribute('aT',new THREE.BufferAttribute(aT,1));g.setIndex(idx);g.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,0,0),1e4);
    const mat=new THREE.ShaderMaterial({uniforms:{uTex:{value:tread},uNow:{value:0},uErase:{value:r.erase}},vertexShader:TREAD_VS,fragmentShader:TREAD_FS,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
    const mesh=new THREE.Mesh(g,mat);mesh.frustumCulled=false;mesh.renderOrder=3;group.add(mesh);r.tread={mesh,g,mat,NQ,q:0,last:null};treadMats.push(mat);});
  const NSTAMP_TRIS=robots.length?robots[0].tread.NQ*2:0;
  function groundFit(r,x,z,yaw){
    const sc=E_ROBOT,fx=Math.sin(yaw),fz=Math.cos(yaw),lx=Math.cos(yaw),lz=-Math.sin(yaw);
    const hf=H(x+fx*.5*sc,z+fz*.5*sc),hb=H(x-fx*.5*sc,z-fz*.5*sc),hl=H(x+lx*.34*sc,z+lz*.34*sc),hr=H(x-lx*.34*sc,z-lz*.34*sc),hc=H(x,z);
    return{y:Math.max(hc,(hf+hb+hl+hr)/4)-.02,pitch:Math.atan2(hf-hb,sc),roll:Math.atan2(hl-hr,.68*sc)};}
  function stamp(r,x,z,yaw,T){
    const t=r.tread,fx=Math.sin(yaw),fz=Math.cos(yaw),lx=Math.cos(yaw),lz=-Math.sin(yaw);
    if(t.last&&Math.hypot(x-t.last[0],z-t.last[1])<.55)return;
    const half=.34*E_ROBOT*.95,len=.6*1.0;const p=t.g.attributes.position.array,aT=t.g.attributes.aT.array;
    const x0=x-fx*len*.5,z0=z-fz*len*.5,x1=x+fx*len*.5,z1=z+fz*len*.5;
    const c=[[x0+lx*half,z0+lz*half],[x0-lx*half,z0-lz*half],[x1-lx*half,z1-lz*half],[x1+lx*half,z1+lz*half]];
    const q=t.q%t.NQ;for(let k=0;k<4;k++){p[(q*4+k)*3]=c[k][0];p[(q*4+k)*3+1]=Math.max(H(c[k][0],c[k][1]),tide()-.2)+.045;p[(q*4+k)*3+2]=c[k][1];aT[q*4+k]=T;}
    t.q++;t.last=[x,z];t.g.attributes.position.needsUpdate=true;t.g.attributes.aT.needsUpdate=true;}
  /* routine: phase from the clock (function of T only, so a frozen clock repeats) */
  function routine(r,T){
    const tt=((T+r.off)%CYCLE+CYCLE)%CYCLE;
    const cyc=Math.floor((T+r.off)/CYCLE);
    const sun=(o.sunDir&&o.sunDir.y>.5)||o.forceSun;
    let u=0,clip=null,tl=0,found=false,moving=false;
    const L=Math.max(2,r.lenA);const legT=Math.min(18,L/.55);
    if(tt<legT){u=sm(0,1,tt/legT)*.9+tt/legT*.1;moving=true;}
    else if(tt<legT+1){u=1;}
    else if(tt<legT+4.6){u=1;clip='arm_unfold';tl=tt-legT-1;found=tl>2.2;}
    else if(tt<legT+8){u=1;clip='arm_unfold';tl=3.6;found=true;}
    else if(tt<legT+11.6){u=1;clip='arm_stow';tl=tt-legT-8;}
    else if(tt<legT+14.6){u=1;clip='head_tilt';tl=tt-legT-11.6;}
    else if(tt<legT*2+14.6){u=1-((tt-legT-14.6)/legT);moving=true;}
    else if(sun&&tt<legT*2+14.6+2.6){u=0;clip='sun_open';tl=tt-legT*2-14.6;}
    else if(sun&&tt<legT*2+14.6+2.6+12){u=0;clip='sun_open';tl=2.6;}
    else if(sun&&tt<legT*2+14.6+2.6+12+2.6){u=0;clip='sun_close';tl=tt-legT*2-14.6-14.6;}
    else{u=0;}
    return{u:clamp(u,0,1),clip,tl,found,moving,tt,cyc};}
  /* tide: when the beach under the path is wet the robot waits further up the beach (shift along the inland normal) */
  function wantShift(r,tideNow){let best=0,bm=-1e9;for(let s=0;s<=14;s+=.5){let mn=1e9;for(let k=0;k<5;k++){const u=k/4,x=r.a[0]+(r.b[0]-r.a[0])*u-r.n[0]*s,z=r.a[1]+(r.b[1]-r.a[1])*u-r.n[1]*s;mn=Math.min(mn,H(x,z));}
      if(mn>=tideNow+.28)return s;if(mn>bm+.02){bm=mn;best=s;}}return best;}
  /* clip sampling by hand */
  const clipsByName={};
  function prepare(gltf){
    gltf.animations.forEach(c=>{clipsByName[c.name]=c;});
    const base=gltf.scene;
    robots.forEach((r,i)=>{
      const g=base.clone(true);g.name='robot'+i;const nodes={};g.traverse(n=>{nodes[n.name]=n;});
      r.nodes=nodes;r.rest={};for(const k in nodes){r.rest[k]={q:nodes[k].quaternion.clone(),s:nodes[k].scale.clone(),p:nodes[k].position.clone()};}
      /* tracks bound to nodes of THIS clone; interpolants are made once per robot */
      r.tracks={};for(const name in clipsByName){r.tracks[name]=clipsByName[name].tracks.map(tr=>{const dot=tr.name.lastIndexOf('.');return{node:tr.name.slice(0,dot),prop:tr.name.slice(dot+1),it:tr.createInterpolant(new Float32Array(tr.getValueSize())),size:tr.getValueSize()};});}
      r.animNodes=new Set();for(const name in r.tracks)r.tracks[name].forEach(t=>r.animNodes.add(t.node));
      const rec=r.site,pt=rec.paint,sage=SAGE;const lum=v=>.2126*v[0]+.7152*v[1]+.0722*v[2];
      /* cheap recipe tint: sage-ish texels take the palette's paint colour (brightness kept), the orange arm takes the palette's accent */
      g.traverse(n=>{if(!n.isMesh)return;n.castShadow=true;n.receiveShadow=true;n.frustumCulled=false;
        const m=n.material.clone();n.material=m;
        if(m.name==='Collector'){m.metalness=Math.min(m.metalness,.3);
          const paint=new THREE.Vector3(pt[0],pt[1],pt[2]),arm=new THREE.Vector3(rec.arm[0],rec.arm[1],rec.arm[2]),same=rec.palette==='sage'?0:1;
          m.customProgramCacheKey=()=>'li-collector-tint';
          m.onBeforeCompile=sh=>{sh.uniforms.uPaint={value:paint};sh.uniforms.uArm={value:arm};sh.uniforms.uTintOn={value:same};
            sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 uPaint;uniform vec3 uArm;uniform float uTintOn;')
              .replace('#include <map_fragment>','#include <map_fragment>\n{float lm=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));float sg=smoothstep(0.010,0.040,diffuseColor.g-max(diffuseColor.r,diffuseColor.b)*0.96);float ar=smoothstep(0.05,0.14,diffuseColor.r-diffuseColor.g*1.35)*smoothstep(0.02,0.08,diffuseColor.g-diffuseColor.b*1.1);diffuseColor.rgb=mix(diffuseColor.rgb,uPaint*(lm/0.138),sg*uTintOn);diffuseColor.rgb=mix(diffuseColor.rgb,uArm*(lm/0.31),ar*uTintOn*0.85);}');};}
        if(m.name==='Lamp'){r.lampMat=m;r.lampBase=m.emissive?m.emissive.clone():null;}
        if(m.name==='Glow'){r.glowMat=m;}});
      g.scale.setScalar(E_ROBOT*(rec.scale||1)*.0+E_ROBOT);
      const p0=r.pos;g.position.set(p0[0],H(p0[0],p0[1]),p0[1]);group.add(g);r.node=g;r.ready=true;});
    state.loaded=true;}
  function applyClips(r,ph,T){
    for(const k of r.animNodes){const n=r.nodes[k];if(!n)continue;n.quaternion.copy(r.rest[k].q);n.scale.copy(r.rest[k].s);}
    const set=(name,t)=>{const trs=r.tracks[name];if(!trs)return;const dur=clipsByName[name].duration;const tc=clamp(t,0,dur);
      for(const tr of trs){const n=r.nodes[tr.node];if(!n)continue;const v=tr.it.evaluate(tc);if(tr.prop==='quaternion')n.quaternion.set(v[0],v[1],v[2],v[3]);else if(tr.prop==='scale')n.scale.set(v[0],v[1],v[2]);else if(tr.prop==='position')n.position.set(v[0],v[1],v[2]);}};
    if(ph.clip)set(ph.clip,ph.tl);
    if(!ph.found)set('lamp_blink',(T*1.0)%2.0);        /* searching: the lamp blinks (clip lamp_blink, 2 s, scales lamp_dome) */
    /* lamp colour: search colour while blinking, found colour steady with a slow flicker when something is in the gripper */
    if(r.lampMat&&r.lampMat.emissive){const c=ph.found?r.site.lamp_found:r.site.lamp_search;const fl=ph.found?(.85+.15*Math.sin(T*3.1)):1;r.lampMat.emissive.setRGB(c[0]*fl,c[1]*fl,c[2]*fl);r.lampMat.emissiveIntensity=2.2;}
  }
  let prepared=false;
  if(robots.length)loadModel(g=>{prepare(g);prepared=true;});
  function frame(dt,T){
    const tideNow=tide();
    for(const r of robots){
      r.tread.mat.uniforms.uNow.value=T;
      const ph=routine(r,T);
      /* retreat up the beach when the tide covers the path, smoothly */
      const ws=wantShift(r,tideNow);r.shift+=clamp(ws-r.shift,-dt*1.6,dt*1.6);if(dt<.01&&r.shiftInit===undefined){r.shift=ws;r.shiftInit=1;}
      const sx=-r.n[0]*r.shift,sz=-r.n[1]*r.shift;
      const x=r.a[0]+(r.b[0]-r.a[0])*ph.u+sx,z=r.a[1]+(r.b[1]-r.a[1])*ph.u+sz;
      const dirSign=((((T+r.off)%CYCLE)>(Math.min(18,Math.max(2,r.lenA)/.55)+14.6))?-1:1);
      let yaw=Math.atan2(r.dir[0]*dirSign,r.dir[1]*dirSign);
      if(ph.clip==='sun_open'||ph.clip==='sun_close'){const nx=-r.n[0],nz=-r.n[1];yaw=Math.atan2(nz,nx)*0+Math.atan2(r.n[0],r.n[1]);}   /* parked facing the sea to open the shell to the sun */
      r.pos=[x,z];r.yaw=yaw;r.phase=ph;
      if(r.ready){
        const f=groundFit(r,x,z,yaw);const n=r.node;n.position.set(x,f.y,z);n.rotation.order='YXZ';
        const rock=ph.moving?Math.sin(T*5.1+r.off)*.012:0;
        n.rotation.set(-f.pitch+rock,yaw,f.roll);
        applyClips(r,ph,T);
        if(ph.moving)stamp(r,x,z,yaw,T);
      }
    }
  }
  function hash(){let h=2166136261>>>0;const mix=v=>{v=v|0;for(let i=0;i<4;i++){h^=(v>>>(i*8))&255;h=Math.imul(h,16777619)>>>0;}};robots.forEach(r=>{mix(Math.round(r.a[0]*100));mix(Math.round(r.a[1]*100));mix(Math.round(r.b[0]*100));mix(Math.round(r.b[1]*100));mix(r.site.recipe_seed);});return h|0;}
  const api={count:()=>robots.length,loaded:()=>state.loaded,
    list:()=>robots.map(r=>({id:r.site.id,role:r.site.role,palette:r.site.palette,x:r.pos[0],z:r.pos[1],yaw:r.yaw,a:r.a,b:r.b,y:r.node?r.node.position.y:null,ground:H(r.pos[0],r.pos[1]),shift:r.shift,clip:r.phase&&r.phase.clip,moving:r.phase&&r.phase.moving,stamps:r.tread.q,beach:r.site.beach,ready:r.ready})),
    tris:()=>{let t=0;group.traverse(n=>{if(n.isMesh&&n.visible){const g=n.geometry;t+=g.index?g.index.count/3:g.attributes.position.count/3;}});return Math.round(t);},
    prints:()=>robots.map(r=>{const aT=r.tread.g.attributes.aT.array;let n=0;for(let i=0;i<aT.length;i+=4)if(aT[i]<1e8)n++;return n;}),
    forceSun:v=>{o.forceSun=!!v;},
    cycle:(i,n)=>{const r=robots[i];return{start:(n||1)*CYCLE-r.off,leg:Math.min(18,Math.max(2,r.lenA)/.55),period:CYCLE,erase:r.erase};},
    view:i=>{const r=robots[i];return r?{x:r.pos[0],z:r.pos[1],yaw:r.yaw}:null;}};
  return{frame,hash,api,group};
}
window.LI_ROBOTS={create,E_ROBOT};
})();
