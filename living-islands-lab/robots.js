/* Living Islands: the robots of the life layer (see LIFE_VIEW.md, COLLECTOR_MODEL.md, ROBOT_RECIPES.md, ROBOT_RADICAL.md). Loaded only with ?world=NNN&life=1, after animals.js.
   Classic script: sets window.LI_ROBOTS.create(opts) -> { frame(dt, T), hash(), api }. Each site of life.json carries its own recipe (family tortoise or one of the radical plans: scout, walker, pontoon, spotter, roller,
   snail, crab) and the name of its live GLB (assets/collector/world_robots/robot_<hash>_live.glb, built by landform/build_world_robots.py). The page loads the GLB of a recipe once (cache by recipe hash): by fetch when served
   over http(s), else from its base64 twin robot_<hash>_live.js (a classic script, so file:// works); if both fail the committed tortoise (collector_live_b64.js) stands in. The vendored GLTFLoader parses it.
   Every robot runs a fixed routine (no speech, no mood), a function of the clock only (a frozen clock repeats a picture): it drives or walks a leg along the shore (or, for a pontoon, on the water beside it), stops, does the
   job of its plan (arm clips for the tortoise family and the scout; claw_sort for the crab; head_tilt and lid_open for the others), goes back, and at midday opens its shell (sun_open). Clips are sampled by hand from the
   file's own tracks: walk (walker, spotter, crab), paddle_spin (pontoon), roll (roller), claw_sort (crab), plus the committed seven. Behind a moving robot a strip of prints is stamped: tracks, wheels, a belt, feet,
   a roller band, or (pontoon) a two-line foam wake on the water; each fades on a seeded timer. Tiers: desk 3 robots, handheld high 2, handheld low 1, AR 1 (all the live GLB). */
(function () {
'use strict';
const TAU = Math.PI * 2;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const sm=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const angLerp=(a,b,k)=>{let d=((b-a+Math.PI)%TAU+TAU)%TAU-Math.PI;return a+d*k;};
const E_ROBOT = 1.8;                 /* exaggeration at table scale (TUNING; the machine is about 1 m long, so it reads as 1.8 m on the table) */
const TIER_ROBOTS = { desk: 3, hhhi: 2, hhlo: 1, ar: 1 };   /* robots drawn per tier (the page's life.json has 1 to 3 use sites; TUNING) */
/* per kind: speed in page metres per second, print style, print half width (page m), print length, erase time range (s), clip played while moving */
const KINDS = {
  family:  { v: .55, arms: true,  print: 'wheel', hw: .55, erase: [80, 160] },
  scout:   { v: .55, arms: true,  print: 'wheel', hw: .50, erase: [80, 160] },
  snail:   { v: .42, arms: false, print: 'belt',  hw: .42, erase: [90, 170] },
  walker:  { v: .50, arms: false, print: 'foot6', hw: .95, erase: [60, 120], move: 'walk' },
  spotter: { v: .40, arms: false, print: 'foot4', hw: .70, erase: [60, 120], move: 'walk' },
  crab:    { v: .45, arms: false, print: 'foot2', hw: .85, erase: [60, 120], move: 'walk', side: true },
  roller:  { v: .60, arms: false, print: 'roll',  hw: .62, erase: [80, 150], move: 'roll' },
  pontoon: { v: .60, arms: false, print: 'wake',  hw: 1.05, erase: [22, 34], move: 'paddle_spin', water: true }
};
const LEG_MAX = 22;                  /* seconds of one leg at most */
const STOP_T = 14.6, SUN_T = 17.2;   /* the stop at the end of a leg, and the midday shell opening (2.6 + 12 + 2.6) */
/* ---- loading: one GLB per recipe hash, cached ---- */
const glbCache = {};                 /* hash -> { gltf, wait: [cb] } */
const loadStat = { fetched: 0, script: 0, fallback: 0 };
function b64buf(s){const bin=atob(s),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return u8.buffer;}
function getBuffer(site, cb){
  const url=site.glb||'', h=site.recipe_hash;
  const fallback=()=>{if(window.LI_COLLECTOR_LIVE_B64){loadStat.fallback++;cb(b64buf(window.LI_COLLECTOR_LIVE_B64));}else cb(null);};
  const viaScript=()=>{
    if(window.LI_ROBOT_GLB&&window.LI_ROBOT_GLB[h]){loadStat.script++;cb(b64buf(window.LI_ROBOT_GLB[h]));return;}
    const s=document.createElement('script');s.src=url.replace(/\.glb$/,'.js');
    s.onload=()=>{if(window.LI_ROBOT_GLB&&window.LI_ROBOT_GLB[h]){loadStat.script++;cb(b64buf(window.LI_ROBOT_GLB[h]));}else fallback();};
    s.onerror=fallback;document.head.appendChild(s);};
  if(!url){fallback();return;}
  if(/^https?:/.test(location.protocol)&&window.fetch)fetch(url).then(r=>{if(!r.ok)throw new Error('http '+r.status);return r.arrayBuffer();}).then(b=>{loadStat.fetched++;cb(b);},viaScript);
  else viaScript();
}
function loadModel(site, cb){
  const h=site.recipe_hash||'committed';let c=glbCache[h];
  if(c){if(c.gltf)cb(c.gltf);else c.wait.push(cb);return;}
  c=glbCache[h]={gltf:null,wait:[cb]};
  const done=g=>{c.gltf=g;const w=c.wait;c.wait=[];w.forEach(f=>f(g));};
  if(!THREE.GLTFLoader){c.wait=[];return;}
  getBuffer(site,buf=>{if(!buf){c.wait=[];return;}
    new THREE.GLTFLoader().parse(buf,'',done,e=>{c.wait=[];});});
}
/* ---- print textures (alpha masks, 64 x 64, one stamp long) ---- */
const texCache={};
function printTex(style){
  if(texCache[style])return texCache[style];
  const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d');x.clearRect(0,0,64,64);x.fillStyle='rgba(255,255,255,0.95)';
  const dot=(cx,cy,rx,ry,a)=>{x.globalAlpha=a===undefined?1:a;x.beginPath();x.ellipse(cx,cy,rx,ry,0,0,TAU);x.fill();x.globalAlpha=1;};
  if(style==='wheel'){for(const x0 of[6,44]){x.globalAlpha=.25;x.fillRect(x0,0,14,64);x.globalAlpha=1;for(let k=0;k<8;k++)x.fillRect(x0,k*8+1,14,4);}}
  else if(style==='belt'){x.globalAlpha=.3;x.fillRect(20,0,24,64);x.globalAlpha=1;for(let k=0;k<8;k++){const y=k*8;x.beginPath();x.moveTo(20,y+5);x.lineTo(32,y+1);x.lineTo(44,y+5);x.lineTo(44,y+8);x.lineTo(32,y+4);x.lineTo(20,y+8);x.closePath();x.fill();}}
  else if(style==='foot6'){for(let k=0;k<3;k++){dot(10,10+k*22+ (k%2)*4,5,6);dot(54,21+k*22-(k%2)*4,5,6);dot(22,18+k*22,3,3.4,.8);dot(42,7+k*22,3,3.4,.8);}}
  else if(style==='foot4'){for(let k=0;k<2;k++){dot(14,12+k*32,3.2,3.2);dot(50,28+k*32,3.2,3.2);dot(50,12+k*32,3.2,3.2,.7);dot(14,28+k*32,3.2,3.2,.7);}}
  else if(style==='foot2'){for(let k=0;k<4;k++){dot(10,6+k*16,4,2.6);dot(54,14+k*16,4,2.6);dot(24,10+k*16,3,2,.8);dot(40,2+k*16,3,2,.8);}}
  else if(style==='roll'){x.globalAlpha=.28;x.fillRect(12,0,40,64);x.globalAlpha=1;for(let k=0;k<8;k++){x.fillRect(12,k*8+1,40,3);}x.fillRect(30,0,4,64);}
  else{ /* wake: two soft foam lines (the two floats) and a faint stir between them */
    const g=x.createLinearGradient(0,0,64,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.12,'rgba(255,255,255,.55)');g.addColorStop(.24,'rgba(255,255,255,0)');g.addColorStop(.38,'rgba(255,255,255,.10)');g.addColorStop(.5,'rgba(255,255,255,.16)');g.addColorStop(.62,'rgba(255,255,255,.10)');g.addColorStop(.76,'rgba(255,255,255,0)');g.addColorStop(.88,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');
    x.fillStyle=g;x.fillRect(0,0,64,64);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;return texCache[style]=t;}
const TREAD_VS=`attribute float aT;varying vec2 vUv;varying float vT;void main(){vUv=uv;vT=aT;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const TREAD_FS=`uniform sampler2D uTex;uniform float uNow;uniform float uErase;uniform vec3 uCol;uniform float uAmp;uniform float uFade;varying vec2 vUv;varying float vT;
void main(){float age=uNow-vT;float vis=step(0.0,age)*(1.0-smoothstep(0.4*uErase,uErase,age));float a=texture2D(uTex,vUv).a*vis*uAmp*mix(1.0,smoothstep(0.0,0.45,vUv.y)*smoothstep(1.0,0.55,vUv.y),uFade);if(a<0.01)discard;gl_FragColor=vec4(uCol,a);}`;

function create(o){
  const H=o.H,root=o.root,life=o.life,tide=o.tide;
  const tierMax=TIER_ROBOTS[o.tierName]||3;
  const sites=(life.robots||[]).filter(r=>r.use);   /* the number wanted; if a use-site is blocked, a spare candidate takes its place */
  const group=new THREE.Group();group.name='robots';root.add(group);
  const items=o.items?o.items():null;
  const W=items||{};
  /* skip sites that collide with the page's own content (houses, tents, camp, jetty, rocks, trees) */
  const pts=[];const add=(a,r)=>(a||[]).forEach(q=>pts.push([q.x,q.z,r]));
  add(W.houses,7);add(W.tents,5);add(W.rocks,2.6);add(W.conifers,2.2);add(W.broad,2.4);if(W.camp&&W.camp.fire)pts.push([W.camp.fire.x,W.camp.fire.z,7]);if(W.jetty&&W.jetty.x!==undefined)pts.push([W.jetty.x,W.jetty.z,9]);
  /* steepest local slope along a path and along the strip of beach behind it (the robot may wait up the beach when the tide is in) */
  const SLOPE_MAX=.42,SLOPE_HARD=.58;
  const slopeAt=(x,z)=>{const e=.6;return Math.hypot(H(x+e,z)-H(x-e,z),H(x,z+e)-H(x,z-e))/(2*e);};
  const pathSlope=(a,b,n)=>{let mx=0;for(let k=0;k<=6;k++){const u=k/6;for(const d of[0,4,8,12]){mx=Math.max(mx,slopeAt(a[0]+(b[0]-a[0])*u-n[0]*d,a[1]+(b[1]-a[1])*u-n[1]*d));}}return mx;};
  /* pull the ends of a path in along the shore while the ground there (or 4 m up the beach) is steeper than SLOPE_TRIM, but keep at least 3.5 m */
  const SLOPE_TRIM=.45;
  const trimPath=(a,b,n)=>{a=a.slice();b=b.slice();const bad=p=>[0,4].some(d=>slopeAt(p[0]-n[0]*d,p[1]-n[1]*d)>SLOPE_TRIM);
    for(let g=0;g<40;g++){const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<=3.5)break;const ux=(b[0]-a[0])/L,uz=(b[1]-a[1])/L;
      const ba=bad(a),bb=bad(b);if(!ba&&!bb)break;if(ba){a[0]+=ux*.5;a[1]+=uz*.5;}if(bb){b[0]-=ux*.5;b[1]-=uz*.5;}}
    return[a,b];};
  const clash=(x,z,r)=>pts.some(p=>Math.hypot(p[0]-x,p[1]-z)<p[2]+r);
  const kindOf=s=>s.radical?(KINDS[s.plan]?s.plan:'family'):'family';
  const robots=[];
  const all=(life.robots||[]);
  const wanted=Math.min(sites.length,tierMax);
  const mk=(s,a,b,m)=>{if(kindOf(s)!=='pontoon'){const t=trimPath(a,b,s.normal);a=t[0];b=t[1];m=[(a[0]+b[0])/2,(a[1]+b[1])/2];}return{site:s,kind:kindOf(s),a,b,n:[s.normal[0],s.normal[1]],shift:0,pos:[m[0],m[1]],yaw:0,pose:null,node:null,ready:false,tapeN:0};};
  for(const s of all){if(robots.length>=wanted)break;
    /* try the exported place, then the same beach moved along the shore and up the beach, until it clears the page's own content */
    const tx=-s.normal[1],tz=s.normal[0];let hit=null;
    for(const [dt,dn] of [[0,0],[7,0],[-7,0],[14,0],[-14,0],[0,4],[7,4],[-7,4],[0,8],[21,0],[-21,0],[28,0],[-28,0],[14,4],[-14,4],[0,-4],[7,-4],[-7,-4]]){
      const a=[s.a[0]+tx*dt-s.normal[0]*dn,s.a[1]+tz*dt-s.normal[1]*dn],b=[s.b[0]+tx*dt-s.normal[0]*dn,s.b[1]+tz*dt-s.normal[1]*dn],m=[(a[0]+b[0])/2,(a[1]+b[1])/2];
      if(Math.hypot(m[0],m[1])>o.tableR-14)continue;if(H(m[0],m[1])<.3)continue;
      if(clash(a[0],a[1],1)||clash(b[0],b[1],1)||clash(m[0],m[1],1))continue;
      if(robots.some(q=>Math.hypot(q.pos[0]-m[0],q.pos[1]-m[1])<12))continue;
      const sl=pathSlope(a,b,s.normal);if(sl>SLOPE_HARD)continue;
      if(!hit||sl<hit.sl-.02){hit={a,b,m,sl};if(sl<=SLOPE_MAX)break;}}
    if(!hit)continue;
    if(kindOf(s)!=='pontoon'){const t=trimPath(hit.a,hit.b,s.normal);hit.a=t[0];hit.b=t[1];hit.m=[(t[0][0]+t[1][0])/2,(t[0][1]+t[1][1])/2];}
    robots.push(mk(s,hit.a,hit.b,hit.m));}
  /* a world must have at least one robot: when every site clashes, the first sites are used as exported (a robot beside a rock is better than none) */
  if(robots.length<wanted){for(const s of all){if(robots.length>=Math.max(1,wanted))break;if(robots.some(q=>q.site===s))continue;
      const m=[(s.a[0]+s.b[0])/2,(s.a[1]+s.b[1])/2];if(robots.some(q=>Math.hypot(q.pos[0]-m[0],q.pos[1]-m[1])<12))continue;
      if(pathSlope(s.a,s.b,s.normal)>SLOPE_HARD)continue;
      robots.push(mk(s,s.a.slice(),s.b.slice(),m));}}
  if(!robots.length&&all.length){const s=all.slice().sort((p,q)=>pathSlope(p.a,p.b,p.normal)-pathSlope(q.a,q.b,q.normal))[0];robots.push(mk(s,s.a.slice(),s.b.slice(),[(s.a[0]+s.b[0])/2,(s.a[1]+s.b[1])/2]));}   /* a world has at least one robot, on its gentlest site */
  const treadMats=[];
  const state={loaded:false,errors:0};
  const R=(i)=>mulberry32(1000+i*17+(o.seed||0));
  robots.forEach((r,i)=>{const rr=R(i),K=KINDS[r.kind];r.K=K;r.off=rr()*60;r.wph=rr();r.erase=K.erase[0]+rr()*(K.erase[1]-K.erase[0]);r.lenA=Math.hypot(r.b[0]-r.a[0],r.b[1]-r.a[1]);
    r.dir=[(r.b[0]-r.a[0])/Math.max(1e-6,r.lenA),(r.b[1]-r.a[1])/Math.max(1e-6,r.lenA)];
    r.legT=Math.min(LEG_MAX,Math.max(2,r.lenA)/K.v);r.frac=Math.min(1,K.v*r.legT/Math.max(2,r.lenA));r.cyc=2*r.legT+STOP_T+SUN_T+4;
    /* the yaw of the outward leg (the front of the model is +z); the crab shuffles sideways and keeps its face to the sea */
    r.yawF=Math.atan2(r.dir[0],r.dir[1]);r.yawSea=Math.atan2(r.n[0],r.n[1]);
    if(K.side){const yx=Math.atan2(-r.dir[1],r.dir[0]);r.yawF=(Math.sin(yx)*r.n[0]+Math.cos(yx)*r.n[1])>0?yx:Math.atan2(r.dir[1],-r.dir[0]);}
    r.yawB=K.side?r.yawF:r.yawF+Math.PI;
    r.beached=false;r.wsh=0;
    /* print ring */
    const NQ=150;const g=new THREE.BufferGeometry();const pos=new Float32Array(NQ*4*3),uv=new Float32Array(NQ*4*2),aT=new Float32Array(NQ*4).fill(1e9),idx=[];
    for(let q=0;q<NQ;q++){uv.set([0,0,1,0,1,1,0,1],q*8);idx.push(q*4,q*4+1,q*4+2,q*4,q*4+2,q*4+3);}
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setAttribute('aT',new THREE.BufferAttribute(aT,1));g.setIndex(idx);g.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,0,0),1e4);
    const wake=K.print==='wake';
    const mat=new THREE.ShaderMaterial({uniforms:{uTex:{value:printTex(K.print)},uNow:{value:0},uErase:{value:r.erase},uCol:{value:wake?new THREE.Vector3(.92,.96,.97):new THREE.Vector3(.012,.010,.008)},uAmp:{value:wake?.42:.62},uFade:{value:wake?1:0}},vertexShader:TREAD_VS,fragmentShader:TREAD_FS,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
    const mesh=new THREE.Mesh(g,mat);mesh.frustumCulled=false;mesh.renderOrder=wake?6:3;group.add(mesh);r.tread={mesh,g,mat,NQ,q:0,last:null};treadMats.push(mat);});
  /* ---- placement ---- */
  const FOOT=r=>({fl:(r.fl||.5*E_ROBOT),fw:(r.fw||.34*E_ROBOT)});
  function groundFit(r,x,z,yaw){
    const {fl,fw}=FOOT(r),fx=Math.sin(yaw),fz=Math.cos(yaw),lx=Math.cos(yaw),lz=-Math.sin(yaw);
    const hf=H(x+fx*fl,z+fz*fl),hb=H(x-fx*fl,z-fz*fl),hl=H(x+lx*fw,z+lz*fw),hr=H(x-lx*fw,z-lz*fw),hc=H(x,z);
    const legged=r.kind==='walker'||r.kind==='spotter'||r.kind==='crab';
    const y=legged?Math.max(hc,hf,hb,hl,hr)-.03:Math.max(hc,(hf+hb+hl+hr)/4)-.02;
    return{y:y+(r.gOff||0),pitch:Math.atan2(hf-hb,2*fl),roll:Math.atan2(hl-hr,2*fw)};}
  function stamp(r,x,z,yaw,T){
    const t=r.tread,K=r.K,wake=K.print==='wake',fx=Math.sin(yaw),fz=Math.cos(yaw),lx=Math.cos(yaw),lz=-Math.sin(yaw);
    if(t.last&&Math.hypot(x-t.last[0],z-t.last[1])<(wake?.9:.55))return;
    const half=K.hw,len=wake?2.4:.6;const p=t.g.attributes.position.array,aT=t.g.attributes.aT.array;
    const x0=x-fx*len*.5,z0=z-fz*len*.5,x1=x+fx*len*.5,z1=z+fz*len*.5;
    const c=[[x0+lx*half,z0+lz*half],[x0-lx*half,z0-lz*half],[x1-lx*half,z1-lz*half],[x1+lx*half,z1+lz*half]];
    const q=t.q%t.NQ;for(let k=0;k<4;k++){p[(q*4+k)*3]=c[k][0];p[(q*4+k)*3+1]=wake?tide()+.07:Math.max(H(c[k][0],c[k][1]),tide()-.2)+.045;p[(q*4+k)*3+2]=c[k][1];aT[q*4+k]=T;}
    t.q++;t.last=[x,z];t.g.attributes.position.needsUpdate=true;t.g.attributes.aT.needsUpdate=true;}
  /* ---- the routine: a function of the clock only ---- */
  function routine(r,T){
    const tt=((T+r.off)%r.cyc+r.cyc)%r.cyc,cyc=Math.floor((T+r.off)/r.cyc),legT=r.legT;
    const sun=(o.sunDir&&o.sunDir.y>.5)||o.forceSun;
    const tS=legT*2+STOP_T;
    let u=0,clip=null,tl=0,found=false,moving=false,leg=0,s=-1;
    if(tt<legT){u=sm(0,1,tt/legT)*.9+tt/legT*.1;moving=true;leg=1;}
    else if(tt<legT+STOP_T){u=1;s=tt-legT;
      if(s>=1){
        if(r.K.arms){if(s<4.6){clip='arm_unfold';tl=s-1;found=tl>2.2;}else if(s<8){clip='arm_unfold';tl=3.6;found=true;}else if(s<11.6){clip='arm_stow';tl=s-8;}else{clip='head_tilt';tl=s-11.6;}}
        else if(r.kind==='crab'){if(s<11.6){clip='claw_sort';tl=(s-1)%1.8;found=s>3;}else{clip='head_tilt';tl=s-11.6;}}
        else{if(s<4){clip='head_tilt';tl=s-1;}else if(s<5.4){clip='lid_open';tl=s-4;found=true;}else if(s<8.8){clip='lid_open';tl=1.4;found=true;}else if(s<10.2){clip='lid_open';tl=1.4-(s-8.8);found=true;}else if(s<13){clip=null;}else{clip='head_tilt';tl=s-12;}}
      }}
    else if(tt<tS){u=1-((tt-legT-STOP_T)/legT);moving=true;leg=2;}
    else if(sun&&tt<tS+2.6){u=0;clip='sun_open';tl=tt-tS;}
    else if(sun&&tt<tS+2.6+12){u=0;clip='sun_open';tl=2.6;}
    else if(sun&&tt<tS+SUN_T){u=0;clip='sun_close';tl=tt-tS-14.6;}
    else{u=0;}
    /* heading: turn round during the end of the stop and back again at the end of the cycle; face the sea under the open shell */
    const turn=r.K.side?0:sm(legT+STOP_T-2.4,legT+STOP_T,tt)*(1-sm(r.cyc-2.5,r.cyc,tt));
    const wSun=sun?sm(tS,tS+1.4,tt)*(1-sm(tS+SUN_T-1.4,tS+SUN_T,tt)):0;
    const yaw=angLerp(angLerp(r.yawF,r.yawB,turn),r.yawSea,wSun);
    return{u:clamp(u,0,1),clip,tl,found,moving,tt,cyc,leg,yaw};}
  /* tide: when the beach under the path is wet the robot waits further up the beach (shift along the inland normal) */
  function wantShift(r,tideNow){let best=0,bm=-1e9;for(let s=0;s<=14;s+=.5){let mn=1e9;for(let k=0;k<5;k++){const u=k/4,x=r.a[0]+(r.b[0]-r.a[0])*u-r.n[0]*s,z=r.a[1]+(r.b[1]-r.a[1])*u-r.n[1]*s;mn=Math.min(mn,H(x,z));}
      if(mn>=tideNow+.28)return s;if(mn>bm+.02){bm=mn;best=s;}}return best;}
  /* a pontoon: the first offset out along the shore normal where the whole path is at least 0.6 m deep (and on the table); null when there is none, and it sits beached on its site */
  function wantWater(r,tideNow){for(let s=2;s<=34;s+=.5){let ok=true;
      for(let k=0;k<7&&ok;k++){const u=k/6,x=r.a[0]+(r.b[0]-r.a[0])*u+r.n[0]*s,z=r.a[1]+(r.b[1]-r.a[1])*u+r.n[1]*s;
        if(Math.hypot(x,z)>o.tableR-8||H(x,z)>tideNow-.6||H(x+r.n[0]*1.6,z+r.n[1]*1.6)>tideNow-.5||H(x-r.n[0]*1.6,z-r.n[1]*1.6)>tideNow-.35)ok=false;}
      if(ok)return s;}
    return null;}
  /* ---- clip sampling by hand ---- */
  const clipsByName={};
  function prepare(r,gltf){
    gltf.animations.forEach(c=>{clipsByName[c.name]=c;});
    const g=gltf.scene.clone(true);g.name='robot_'+r.site.id;const nodes={};g.traverse(n=>{nodes[n.name]=n;});
    r.nodes=nodes;r.rest={};for(const k in nodes){r.rest[k]={q:nodes[k].quaternion.clone(),s:nodes[k].scale.clone(),p:nodes[k].position.clone()};}
    /* tracks bound to nodes of THIS clone; interpolants are made once per robot */
    r.tracks={};for(const name in clipsByName){r.tracks[name]=clipsByName[name].tracks.map(tr=>{const dot=tr.name.lastIndexOf('.');return{node:tr.name.slice(0,dot),prop:tr.name.slice(dot+1),it:tr.createInterpolant(new Float32Array(tr.getValueSize())),size:tr.getValueSize()};});}
    r.animNodes=new Set();for(const name in r.tracks)r.tracks[name].forEach(t=>r.animNodes.add(t.node));
    g.traverse(n=>{if(!n.isMesh)return;n.castShadow=true;n.receiveShadow=true;n.frustumCulled=false;
      if(n.material.name==='Lamp'||n.material.name==='Glow'){const m=n.material.clone();n.material=m;if(m.name==='Lamp')r.lampMat=m;else r.glowMat=m;}});
    g.scale.setScalar(E_ROBOT);g.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(g),sz=new THREE.Vector3();box.getSize(sz);
    r.fl=clamp(.42*sz.z,.45,1.5);r.fw=clamp(.4*sz.x,.35,1.3);r.gOff=clamp(-box.min.y,-.05,.12);r.sizeY=sz.y;r.size=[sz.x,sz.y,sz.z];
    const p0=r.pos;g.position.set(p0[0],H(p0[0],p0[1]),p0[1]);group.add(g);r.node=g;r.ready=true;
    if(robots.every(q=>q.ready))state.loaded=true;}
  function applyClips(r,ph,T){
    for(const k of r.animNodes){const n=r.nodes[k];if(!n)continue;n.quaternion.copy(r.rest[k].q);n.scale.copy(r.rest[k].s);}
    const set=(name,t,loop)=>{const trs=r.tracks[name];if(!trs)return;const dur=clipsByName[name].duration;const tc=loop?((t%dur)+dur)%dur:clamp(t,0,dur);
      for(const tr of trs){const n=r.nodes[tr.node];if(!n)continue;const v=tr.it.evaluate(tc);if(tr.prop==='quaternion')n.quaternion.set(v[0],v[1],v[2],v[3]);else if(tr.prop==='scale')n.scale.set(v[0],v[1],v[2]);else if(tr.prop==='position')n.position.set(v[0],v[1],v[2]);}};
    if(ph.clip)set(ph.clip,ph.tl,ph.clip==='claw_sort');
    const mv=r.K.move;
    if(mv&&ph.moving){const dur=clipsByName[mv]?clipsByName[mv].duration:1;
      let t=T+r.off+r.wph*dur; if(mv==='roll')t=(ph.tt*.4+r.wph*dur);   /* the roll clip is one turn in 2.4 s (3.7 page m of ground): 0.4 of real time matches 0.6 m/s */
      if(r.kind==='crab'&&ph.leg===2)t=-t;
      set(mv,t,true);}
    else if(mv==='paddle_spin'){set(mv,(T+r.off)*.25,true);}                       /* a pontoon at rest still turns its wheels slowly */
    if(!ph.found)set('lamp_blink',(T*1.0)%2.0,true);        /* searching: the lamp blinks (clip lamp_blink, 2 s, scales lamp_dome) */
    if(r.lampMat&&r.lampMat.emissive){const c=ph.found?r.site.lamp_found:r.site.lamp_search;const fl=ph.found?(.85+.15*Math.sin(T*3.1)):1;r.lampMat.emissive.setRGB(c[0]*fl,c[1]*fl,c[2]*fl);r.lampMat.emissiveIntensity=2.2;}
  }
  robots.forEach(r=>loadModel(r.site,g=>prepare(r,g)));
  function frame(dt,T){
    const tideNow=tide();
    for(const r of robots){
      r.tread.mat.uniforms.uNow.value=T;
      const ph=routine(r,T);
      const water=r.K.water;
      if(water){const ww=wantWater(r,tideNow);r.beached=ww===null;
        if(ww!==null){if(r.shiftInit===undefined){r.wsh=ww;r.shiftInit=1;}else r.wsh+=clamp(ww-r.wsh,-dt*1.6,dt*1.6);}
        else {const ws=wantShift(r,tideNow);r.shift+=clamp(ws-r.shift,-dt*1.6,dt*1.6);if(r.shiftInit===undefined){r.shift=ws;r.shiftInit=1;}}}
      else{const ws=wantShift(r,tideNow);r.shift+=clamp(ws-r.shift,-dt*1.6,dt*1.6);if(dt<.01&&r.shiftInit===undefined){r.shift=ws;r.shiftInit=1;}}
      let sx=-r.n[0]*r.shift,sz=-r.n[1]*r.shift;if(water&&!r.beached){sx=r.n[0]*r.wsh;sz=r.n[1]*r.wsh;}
      const fr=r.frac,uu=r.beached?.5:(1-fr)/2+fr*ph.u;
      const x=r.a[0]+(r.b[0]-r.a[0])*uu+sx,z=r.a[1]+(r.b[1]-r.a[1])*uu+sz;
      const moving=ph.moving&&!r.beached;
      r.pos=[x,z];r.yaw=ph.yaw;r.phase=ph;
      if(r.ready){
        const n=r.node;n.rotation.order='YXZ';
        if(water&&!r.beached){
          const bob=Math.sin(T*1.3+r.off)*.03,sw=Math.sin(T*.9+r.off*2)*.025;
          n.position.set(x,tideNow-.17*E_ROBOT+(r.gOff||0)+bob,z);n.rotation.set(Math.sin(T*1.1+r.off)*.02+(moving?-.015:0),ph.yaw,sw);
        }else{
          const f=groundFit(r,x,z,ph.yaw);n.position.set(x,f.y,z);
          const rock=moving?Math.sin(T*5.1+r.off)*.012:0;
          n.rotation.set(-f.pitch+rock,ph.yaw,f.roll);}
        applyClips(r,{...ph,moving},T);
        if(moving){const sg=ph.leg===2?-1:1;stamp(r,x,z,Math.atan2(r.dir[0]*sg,r.dir[1]*sg),T);}
      }
    }
  }
  function hash(){let h=2166136261>>>0;const mix=v=>{v=v|0;for(let i=0;i<4;i++){h^=(v>>>(i*8))&255;h=Math.imul(h,16777619)>>>0;}};robots.forEach(r=>{mix(Math.round(r.a[0]*100));mix(Math.round(r.a[1]*100));mix(Math.round(r.b[0]*100));mix(Math.round(r.b[1]*100));mix(r.site.recipe_seed);mix(r.site.radical?1:0);});return h|0;}
  const api={count:()=>robots.length,loaded:()=>state.loaded,tierMax,
    list:()=>robots.map(r=>({id:r.site.id,role:r.site.role,plan:r.site.plan,kind:r.kind,recipe:r.site.recipe_hash,palette:r.site.palette,x:r.pos[0],z:r.pos[1],yaw:r.yaw,a:r.a,b:r.b,y:r.node?r.node.position.y:null,ground:H(r.pos[0],r.pos[1]),shift:r.shift,clip:r.phase&&r.phase.clip,moving:r.phase&&r.phase.moving,stamps:r.tread.q,beach:r.site.beach,ready:r.ready,beached:r.beached,size:r.size||null,cyc:r.cyc,water:!!r.K.water&&!r.beached,gOff:r.gOff})),
    tris:()=>{let t=0;group.traverse(n=>{if(n.isMesh&&n.visible){const g=n.geometry;t+=g.index?g.index.count/3:g.attributes.position.count/3;}});return Math.round(t);},
    prints:()=>robots.map(r=>{const aT=r.tread.g.attributes.aT.array;let n=0;for(let i=0;i<aT.length;i+=4)if(aT[i]<1e8)n++;return n;}),
    forceSun:v=>{o.forceSun=!!v;},
    cycle:(i,n)=>{const r=robots[i];return{start:(n||1)*r.cyc-r.off,leg:r.legT,period:r.cyc,erase:r.erase};},
    view:i=>{const r=robots[i];return r?{x:r.pos[0],z:r.pos[1],yaw:r.yaw}:null;},
    loadStat:()=>Object.assign({},loadStat),glbs:()=>Object.keys(glbCache).filter(h=>glbCache[h].gltf),
    nodeQuat:(i,name)=>{const r=robots[i];return r&&r.nodes&&r.nodes[name]?r.nodes[name].quaternion.toArray():null;},
    pose:(i)=>{const r=robots[i];return r&&r.node?{x:r.node.position.x,y:r.node.position.y,z:r.node.position.z}:null;}};
  return{frame,hash,api,group};
}
window.LI_ROBOTS={create,E_ROBOT,KINDS,TIER_ROBOTS};
})();
