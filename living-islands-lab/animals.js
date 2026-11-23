/* Living Islands: the first animals (seals, gannets, puffins, kelp, fish shoals) drawn from landform/worlds/seedNNNN/life.json. Loaded only with ?world=NNN&life=1 (see LIFE_VIEW.md).
   Classic script: sets window.LI_ANIMALS.create(api) -> { frame(dt, t, tide), api }. The page (islands_look.html) calls create() once per build() and frame() once per frame.
   Rules: animals are COUNTED (a haul-out holds n seals, drawn into slots), never tracked; slots have no identity. Everything animated moves in the vertex shader or by an analytic function of time
   (so a frozen clock gives a repeatable picture). Sizes are real size times an exaggeration E (research/ANIMALS_LOOK_AND_MOTION.md section 10); distances stay real metres.
   All numbers tagged TUNING in LIFE_VIEW.md. Needs THREE r128. Meshes use vertex colours in linear space (like the page's props). No brand, no gore, no speech. */
(function () {
'use strict';
const TAU = Math.PI * 2;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash3(a,b,c){let h=Math.imul(a|0,374761393)+Math.imul(b|0,668265263)+Math.imul(c|0,1442695041)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296;}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const sm=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;
const lin=c=>[Math.pow(c[0],2.2),Math.pow(c[1],2.2),Math.pow(c[2],2.2)];
const hex=h=>lin([((h>>16)&255)/255,((h>>8)&255)/255,(h&255)/255]);
const mulc=(c,k)=>[c[0]*k,c[1]*k,c[2]*k];
const mixc=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];

/* ---- tiers: caps per kind (TUNING; research note section 4.2 gives the shape, the sums are checked by tests/life-test.js against the allowances) ---- */
const ALLOWANCE = { desk: 25000, hhhi: 15000, hhlo: 9000, ar: 6000 };      /* triangles for all animals (10 percent of the 150k scene budget at desk, the research note's tier totals below) */
const TIERS = {
  desk: { det: 2, sealNear: 12, sealFar: 40, nest: 40, puff: 30, puffFly: 4, gan: 10, kelp: 30, fish: [2, 100] },
  hhhi: { det: 2, sealNear: 8, sealFar: 26, nest: 24, puff: 17, puffFly: 3, gan: 7,  kelp: 20, fish: [2, 60] },
  hhlo: { det: 1, sealNear: 5, sealFar: 16, nest: 20, puff: 14, puffFly: 2, gan: 4,  kelp: 10, fish: [1, 40] },
  ar:   { det: 1, sealNear: 4, sealFar: 12, nest: 14, puff: 10, puffFly: 2, gan: 3,  kelp: 8,  fish: [1, 30] }
};
/* exaggeration at table scale (research section 10: E 2 to 3 for animals under 3 m) */
const E = { seal: 2.0, gannet: 2.0, puffin: 2.4, fish: 3.0, nest: 2.0 };
const FLEE_M = 12, ALERT_M = 26;          /* camera or boat nearer than this (real metres) makes seals alert, then slip away (TUNING) */
const LEAVE_LEVEL = 0.5, RETURN_LEVEL = 0.4;

/* ---- geometry builder: indexed, vertex colour in linear space, aW = animation weight ---- */
class GB {
  constructor(){this.p=[];this.c=[];this.w=[];this.n=[];this.i=[];}
  v(p,c,w,n){this.p.push(p[0],p[1],p[2]);this.c.push(c[0],c[1],c[2]);this.w.push(w||0);this.n.push(n?n[0]:NaN,n?n[1]:0,n?n[2]:0);return this.p.length/3-1;}
  t(a,b,c){this.i.push(a,b,c);}
  get tris(){return this.i.length/3;}
  flat(a,b,c,ca,wa,wb,wc,cb,cc){ /* three own vertices with the face normal */
    const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;const n=[nx/l,ny/l,nz/l];
    const i0=this.v(a,ca,wa,n),i1=this.v(b,cb||ca,wb===undefined?wa:wb,n),i2=this.v(c,cc||ca,wc===undefined?wa:wc,n);this.t(i0,i1,i2);}
  build(){
    const np=this.p.length/3,N=new Float32Array(np*3);
    for(let k=0;k<np;k++)if(!isNaN(this.n[k*3])){N[k*3]=this.n[k*3];N[k*3+1]=this.n[k*3+1];N[k*3+2]=this.n[k*3+2];}
    const acc=new Float32Array(np*3);
    for(let f=0;f<this.i.length;f+=3){const a=this.i[f],b=this.i[f+1],c=this.i[f+2];
      const ux=this.p[b*3]-this.p[a*3],uy=this.p[b*3+1]-this.p[a*3+1],uz=this.p[b*3+2]-this.p[a*3+2],vx=this.p[c*3]-this.p[a*3],vy=this.p[c*3+1]-this.p[a*3+1],vz=this.p[c*3+2]-this.p[a*3+2];
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const q of[a,b,c]){acc[q*3]+=nx;acc[q*3+1]+=ny;acc[q*3+2]+=nz;}}
    for(let k=0;k<np;k++)if(isNaN(this.n[k*3])){const l=Math.hypot(acc[k*3],acc[k*3+1],acc[k*3+2])||1;N[k*3]=acc[k*3]/l;N[k*3+1]=acc[k*3+1]/l;N[k*3+2]=acc[k*3+2]/l;}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.BufferAttribute(N,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));g.setAttribute('aW',new THREE.Float32BufferAttribute(this.w,1));g.setIndex(this.i);g.computeBoundingSphere();return g;}
}
/* a lofted body along x (tail at -0.5, nose at +0.5): rings [{t,rx,ry,y,z}] with t in 0..1; cross-section is an ellipse with an optional flat belly */
function loft(gb,rings,segs,opt){
  const rows=[];
  for(let r=0;r<rings.length;r++){const R=rings[r],row=[];
    for(let s=0;s<segs;s++){const th=s/segs*TAU,cs=Math.cos(th),sn=Math.sin(th);
      let y=R.ry*sn,z=R.rx*cs;if(opt.belly&&sn<0)y*=opt.belly;
      const p=[R.t-0.5,(R.y||0)+(opt.lift||0)+y+(opt.base||0),(R.z||0)+z];
      const col=opt.col(R.t,th,r,s),w=opt.w?opt.w(R.t,th,r,s):0;row.push(gb.v(p,col,w));}
    rows.push(row);}
  for(let r=0;r<rows.length-1;r++)for(let s=0;s<segs;s++){const s2=(s+1)%segs;gb.t(rows[r][s],rows[r+1][s],rows[r+1][s2]);gb.t(rows[r][s],rows[r+1][s2],rows[r][s2]);}
  return rows;
}
function ellipsoid(gb,cx,cy,cz,rx,ry,rz,det,colFn,wFn,yawz){
  const ico=new THREE.IcosahedronGeometry(1,det).attributes.position.array;
  for(let k=0;k<ico.length;k+=9){const P=[],C=[],Wt=[],N=[];
    for(let m=0;m<3;m++){const x=ico[k+m*3],y=ico[k+m*3+1],z=ico[k+m*3+2];P.push([cx+x*rx,cy+y*ry,cz+z*rz]);const nx=x/rx,ny=y/ry,nz=z/rz,l=Math.hypot(nx,ny,nz);N.push([nx/l,ny/l,nz/l]);C.push(colFn(x,y,z));Wt.push(wFn?wFn(x,y,z):0);}
    const i0=gb.v(P[0],C[0],Wt[0],N[0]),i1=gb.v(P[1],C[1],Wt[1],N[1]),i2=gb.v(P[2],C[2],Wt[2],N[2]);gb.t(i0,i1,i2);}
}
function cone(gb,base,tip,r,segs,colB,colT,w){ /* open cone around the axis base->tip */
  const ax=[tip[0]-base[0],tip[1]-base[1],tip[2]-base[2]],l=Math.hypot(...ax);const a=[ax[0]/l,ax[1]/l,ax[2]/l];
  let u=Math.abs(a[1])<.9?[0,1,0]:[1,0,0];let s=[a[1]*u[2]-a[2]*u[1],a[2]*u[0]-a[0]*u[2],a[0]*u[1]-a[1]*u[0]];const sl=Math.hypot(...s);s=[s[0]/sl,s[1]/sl,s[2]/sl];u=[s[1]*a[2]-s[2]*a[1],s[2]*a[0]-s[0]*a[2],s[0]*a[1]-s[1]*a[0]];
  const ring=[];for(let k=0;k<segs;k++){const th=k/segs*TAU,c=Math.cos(th)*r,sn=Math.sin(th)*r;ring.push([base[0]+s[0]*c+u[0]*sn,base[1]+s[1]*c+u[1]*sn,base[2]+s[2]*c+u[2]*sn]);}
  for(let k=0;k<segs;k++){const k2=(k+1)%segs;gb.flat(ring[k],ring[k2],tip,colB,w||0,w||0,w||0,colB,colT);}
}

/* ================= the meshes (all unit size, nose to +x, up +y, wings along z) ================= */
const SEAL_COL = { back: hex(0x55504a), belly: hex(0xa39a88), dark: hex(0x1e1d1b), flip: hex(0x4c4740) };
function sealGeo(det, pose){
  const gb=new GB();
  const T=det>=2?[0,.05,.12,.22,.34,.46,.58,.68,.76,.82,.88,.93,.97,1]:det===1?[0,.12,.34,.58,.76,.88,1]:[0,.14,.4,.66,.84,1];
  const prof=t=>{const k=[[0,.1],[.05,.3],[.12,.55],[.22,.84],[.34,.99],[.46,1],[.58,.9],[.68,.68],[.76,.62],[.82,.72],[.88,.64],[.93,.45],[.97,.32],[1,.12]];
    for(let i=0;i<k.length-1;i++)if(t<=k[i+1][0]){const f=(t-k[i][0])/(k[i+1][0]-k[i][0]);return lerp(k[i][1],k[i+1][1],f);}return .02;};
  const segs=det>=2?10:det===1?6:6;
  const rings=T.map(t=>{const f=prof(t);let y=0,z=0;
    if(pose===0){y=.10*Math.pow(clamp((.3-t)/.3,0,1),2)+.13*Math.pow(clamp((t-.66)/.34,0,1),2);z=.09*Math.sin(Math.PI*t);}
    else if(pose===1){y=.19*sm(.5,.95,t)+.02*(1-t);z=.02*Math.sin(Math.PI*t);}
    else{y=0;z=.02*Math.sin(Math.PI*t);}
    return{t,rx:.15*f,ry:.115*f,y,z};});
  const rnd=mulberry32(11+pose);const noise=[];for(let i=0;i<24*24;i++)noise.push(rnd());
  loft(gb,rings,segs,{belly:.35,base:.115*.35,col:(t,th,r,s)=>{const sn=Math.sin(th);let c=mixc(SEAL_COL.belly,SEAL_COL.back,sm(-.35,.45,sn));
      const b=noise[(r*7+s*3)%576];c=mulc(c,b>.72?.5:b<.22?1.35:.88+.3*b);if(t>.9)c=mulc(c,.7);return c;},w:(t,th)=>Math.max(0,Math.sin(th))*sm(.12,.4,t)*(1-sm(.62,.78,t))});
  if(det>=1){ /* eyes (dark squares at the head sides), fore flippers (two flat triangles each side), hind flippers */
    const ey=.115*.35+.115*.5+(pose===1?.19*sm(.5,.95,.86):0),hz=.15*.5;const ex=.86-.5;
    for(const sg of[-1,1]){gb.flat([ex,ey,sg*hz],[ex+.025,ey,sg*hz*.97],[ex+.012,ey+.025,sg*hz*.99],SEAL_COL.dark);
      gb.flat([.58-.5,.03,sg*.12],[.66-.5,.025,sg*.19],[.7-.5,.02,sg*.11],SEAL_COL.flip);}
    {const ly=pose===0?.09:0;for(const sg of[-1,1]){gb.flat([-.45,.03+ly,sg*.012],[-.55,.02+ly*1.2,sg*.085],[-.57,.035+ly*1.2,sg*.015],SEAL_COL.flip);}}
  }
  return gb.build();
}
/* flying bird: body loft, bill, tail wedge, two wings as ribbons (aW = span fraction). spec: bodyR, chord, span (half), colours */
function flyerGeo(det, spec){
  const gb=new GB();const segs=det>=2?6:4;
  const T=det>=2?[0,.1,.3,.5,.7,.82,.92,1]:[0,.3,.6,.9,1];
  const body=t=>{const k=spec.body;for(let i=0;i<k.length-1;i++)if(t<=k[i+1][0]){const f=(t-k[i][0])/(k[i+1][0]-k[i][0]);return lerp(k[i][1],k[i+1][1],f);}return 0;};
  const rings=T.map(t=>({t,rx:spec.bodyR*body(t),ry:spec.bodyR*body(t)*.95}));
  loft(gb,rings,segs,{col:(t,th)=>{const sn=Math.sin(th);let c=mixc(spec.belly,spec.back,sm(-.2,.5,sn));if(t>.82&&spec.head)c=mixc(c,spec.head,sm(.8,.95,t)*.9);return c;},w:()=>0});
  const bl=spec.bill||.12;cone(gb,[.5-.02,-.005,0],[.5+bl,-.012,0],spec.bodyR*.16*1.0,3,spec.billC,spec.billC,0);
  gb.flat([-.5,0,0],[-.5-spec.tail,.01,spec.bodyR*.9],[-.5-spec.tail,.01,-spec.bodyR*.9],spec.back,0);gb.flat([-.5,0,0],[-.5-spec.tail,.01,-spec.bodyR*.9],[-.5-spec.tail,.01,spec.bodyR*.9],spec.back,0);
  const NS=det>=2?6:3;
  for(const sg of[-1,1]){const st=[];
    for(let i=0;i<=NS;i++){const s=i/NS;const le=.12-.30*s*s*spec.sweep,ch=spec.chord*(1-.62*s);
      const colTop=mixc(spec.wing,spec.tip,sm(.62,.82,s)),colBot=mixc(spec.wingU||spec.wing,spec.tip,sm(.62,.82,s));
      const a=gb.v([le,.02*(1-s),sg*(spec.bodyR*.6+s*spec.span)],colTop,s),b=gb.v([le-ch,.0,sg*(spec.bodyR*.6+s*spec.span*.985)],colBot,s);st.push([a,b]);}
    for(let i=0;i<NS;i++){const[a0,b0]=st[i],[a1,b1]=st[i+1];if(sg>0){gb.t(a0,b0,b1);gb.t(a0,b1,a1);}else{gb.t(a0,b1,b0);gb.t(a0,a1,b1);}}
  }
  return gb.build();
}
const GANNET = { bodyR:.13, chord:.2, span:.95, sweep:1.0, tail:.2, bill:.16, body:[[0,0],[.1,.35],[.3,.85],[.5,1],[.7,.82],[.85,.55],[.95,.34],[1,.08]],
  back:hex(0xf2f0ea), belly:hex(0xf4f2ec), head:hex(0xe3c582), billC:hex(0x9fb4bf), wing:hex(0xf0eee8), wingU:hex(0xe9e7e1), tip:hex(0x2a2a2e) };
const PUFFIN_FLY = { bodyR:.2, chord:.28, span:.9, sweep:.5, tail:.12, bill:.2, body:[[0,0],[.12,.5],[.3,.95],[.5,1],[.7,.86],[.85,.7],[.95,.5],[1,.15]],
  back:hex(0x1d1d22), belly:hex(0xe9e6df), head:hex(0xe9e6df), billC:hex(0xe4572a), wing:hex(0x1d1d22), wingU:hex(0x555558), tip:hex(0x1d1d22) };
/* a standing bird for colony slots and puffins: ellipsoid body and head, bill, tail, folded wings; face +x, 1 unit tall */
function perchedGeo(det, spec){
  const gb=new GB();const hi=det>=2;
  ellipsoid(gb,-.02,.4,0,.37,.27,.22,hi?1:0,(x,y,z)=>mixc(spec.belly,spec.back,sm(-.2,.55,y)*(spec.backFull?1:(x<.1?1:.35))),null);
  ellipsoid(gb,.2,.6,0,.15,.22,.13,0,(x,y,z)=>spec.neckCol||mixc(spec.belly,spec.back,spec.backFull?.0:.0),null);
  ellipsoid(gb,.31,.8,0,.15,.14,.13,0,(x,y,z)=>{let c=spec.headCol;if(spec.face&&Math.abs(z)>.45&&y>-.4)c=spec.face;if(spec.cap&&y>.55)c=spec.cap;return c;},null);
  cone(gb,[.4,.79,0],[.4+spec.bill,.75,0],.06,3,spec.billB,spec.billT,0);
  if(spec.billMid)cone(gb,[.4+spec.bill*.5,.775,0],[.4+spec.bill*.9,.755,0],.05,3,spec.billMid,spec.billMid,0);
  gb.flat([-.3,.5,.1],[-.5,.3,.0],[-.3,.3,-.1],spec.back);gb.flat([-.3,.5,-.1],[-.5,.3,.0],[-.3,.3,.1],spec.back);
  if(hi)for(const sg of[-1,1]){gb.flat([.12,.55,sg*.215],[-.38,.42,sg*.2],[-.1,.28,sg*.23],spec.wing||spec.back,1,1,1);}
  gb.flat([.05,.0,.08],[.26,.0,.0],[.05,.0,-.08],spec.feet||spec.billB);
  if(spec.fish){ /* sand eels in the bill: thin silver triangles hanging from it */
    const f0=[.62,.74,.0],f1=[.62+.34,.66,.09],f2=[.62+.34,.66,-.09];
    gb.flat(f0,[.5,.77,.0],f1,spec.fish,2,2,2);gb.flat(f0,f2,[.5,.77,.0],spec.fish,2,2,2);
    gb.flat([.6,.73,.03],[.95,.62,.0],[.6,.71,-.04],mulc(spec.fish,.8),2,2,2);}
  return gb.build();
}
const SEABIRD = { belly:hex(0xf4f2ec), back:hex(0xf0eee8), neckCol:hex(0xf4f2ec), headCol:hex(0xe3c582), billB:hex(0x9fb4bf), billT:hex(0x8da2ad), feet:hex(0x2b2b2b) };
const PUFFIN = { belly:hex(0xeceae4), back:hex(0x1d1d22), neckCol:hex(0xdddad2), backFull:false, headCol:hex(0x1d1d22), face:hex(0xe9e6df), cap:hex(0x1d1d22), billB:hex(0xe4572a), billT:hex(0xf0bd31), billMid:hex(0x7f9aa5), feet:hex(0xe4572a), bill:.2, fish:hex(0xc9d6da), wing:hex(0x1d1d22) };
SEABIRD.bill=.24;
function kelpGeo(det){
  const gb=new GB();const strips=det>=2?16:8,seg=3;const rnd=mulberry32(77);
  const cols=[hex(0x2a2a0c),hex(0x45400f),hex(0x6b5b18),hex(0x9a8328)];
  for(let s=0;s<strips;s++){const clump=Math.floor(s/(strips/3)),cx=(clump-1)*1.7+(rnd()-.5)*.7,cz=(rnd()-.5)*1.8+(clump%2?.5:-.5);
    const a=rnd()*TAU,lean=(rnd()-.5)*.3,w0=.38+rnd()*.25,hgt=.7+rnd()*.35;
    const dx=Math.cos(a)*w0/2,dz=Math.sin(a)*w0/2;const rows=[];
    for(let k=0;k<=seg;k++){const h=k/seg,ww=(k===0?.3:1-h*.55),px=cx+lean*h*h,pz=cz+Math.sin(h*3+s)*.12*h;
      const f=h*3.0,ci=Math.min(2,Math.floor(f));const col2=mixc(cols[ci],cols[ci+1],f-ci);
      rows.push([gb.v([px-dx*ww,h*hgt,pz-dz*ww],col2,h),gb.v([px+dx*ww,h*hgt,pz+dz*ww],col2,h)]);}
    for(let k=0;k<seg;k++){const[a0,b0]=rows[k],[a1,b1]=rows[k+1];gb.t(a0,b0,b1);gb.t(a0,b1,a1);}}
  return gb.build();
}
function fishGeo(det){
  const gb=new GB();const segs=3;const T=det>=2?[0,.3,.7,1]:[0,.55,1];const R=det>=2?[.03,.2,.14,0]:[.05,.2,0];const bk=hex(0x4f7a8c),fl=hex(0xcdd7da);
  const rings=T.map((t,i)=>({t,rx:R[i]*.55,ry:R[i]}));
  loft(gb,rings,segs,{col:(t,th)=>mixc(fl,bk,sm(-.4,.7,Math.sin(th))),w:(t)=>clamp(1-t,0,1)});
  gb.flat([-.5,0,0],[-.66,.12,0],[-.66,-.12,0],mulc(bk,1.1),1,1,1);gb.flat([-.5,0,0],[-.66,-.12,0],[-.66,.12,0],mulc(bk,1.1),1,1,1);
  return gb.build();
}
function splashGeo(){
  /* a crown of narrow spikes leaning out (the water thrown up) on a flat foam ring; one instance per plunge, scaled by the page */
  const gb=new GB();const col=[1,1,1];const n=12;
  for(let k=0;k<n;k++){const a=k/n*TAU,d=.11;
    gb.flat([Math.cos(a-d)*.42,0,Math.sin(a-d)*.42],[Math.cos(a+d)*.42,0,Math.sin(a+d)*.42],[Math.cos(a)*.64,1,Math.sin(a)*.64],col,0);
    gb.flat([Math.cos(a+d)*.42,0,Math.sin(a+d)*.42],[Math.cos(a-d)*.42,0,Math.sin(a-d)*.42],[Math.cos(a)*.64,1,Math.sin(a)*.64],col,0);}
  for(let k=0;k<n;k++){const a=k/n*TAU,b=(k+1)/n*TAU;
    gb.flat([Math.cos(a)*.8,.02,Math.sin(a)*.8],[Math.cos(b)*.8,.02,Math.sin(b)*.8],[Math.cos(b)*1.0,.02,Math.sin(b)*1.0],col,0);gb.flat([Math.cos(a)*.8,.02,Math.sin(a)*.8],[Math.cos(b)*1.0,.02,Math.sin(b)*1.0],[Math.cos(a)*1.0,.02,Math.sin(a)*1.0],col,0);}
  return gb.build();
}

/* ================= materials ================= */
const ULT={value:0},USEA={value:0},UDEEP={value:new THREE.Vector3(0.012,0.085,0.19)};
/* a lambert material with a vertex-shader animation. opts.under: drawn AFTER the sea as a transparent object that fades and blues with its depth under the surface (the page's sea is nearly opaque
   below half a metre, so things under it must be drawn over it to be seen at all); everything else is an ordinary opaque instanced mesh */
function animMat(key,decl,code,extra,opts){
  const under=!!(opts&&opts.under);const mo=Object.assign({},opts||{});delete mo.under;
  const m=new THREE.MeshLambertMaterial(Object.assign({vertexColors:true},mo));m.customProgramCacheKey=()=>key;
  if(under){m.transparent=true;m.depthWrite=false;}
  m.onBeforeCompile=sh=>{sh.uniforms.uLT=ULT;
    let head='#include <common>\nuniform float uLT;attribute float aW;attribute float aPhase;attribute float aParam;attribute float aAmp;'+(decl||'');
    if(under){sh.uniforms.uSea=USEA;sh.uniforms.uDeep=UDEEP;head+='\nvarying float vWY;';}
    sh.vertexShader=sh.vertexShader.replace('#include <common>',head).replace('#include <begin_vertex>','#include <begin_vertex>\n'+code);
    if(under){sh.vertexShader=sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n#ifdef USE_INSTANCING\nvWY=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).y;\n#else\nvWY=(modelMatrix*vec4(transformed,1.0)).y;\n#endif');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uSea;uniform vec3 uDeep;varying float vWY;')
        .replace('#include <tonemapping_fragment>','{float dp=max(0.0,uSea-vWY);gl_FragColor.rgb=mix(uDeep,gl_FragColor.rgb,0.3+0.7*exp(-dp*0.5));gl_FragColor.a*=0.95*exp(-dp*0.6);}\n#include <tonemapping_fragment>');}};
  return m;}

/* ================= the build ================= */
function create(api){
  const life=api.life,man=api.man,H=api.H,scene=api.scene,camera=api.camera,seed=api.seed;
  const tierName=ALLOWANCE[api.tier]?api.tier:(api.quality==='low'?'hhlo':'desk');
  const TR=TIERS[tierName],DET=TR.det;
  const root=new THREE.Group();root.name='life';scene.add(root);
  const stat={tier:tierName,time:0,frozen:false};
  const disturb={};           /* siteId -> level 0..1 (the ecosystem's rubbish rule hook, see api.setDisturbance) */
  let simT=0,frozen=null;
  const tideNow=()=>api.tide();
  const mk=(geo,mat,cap,opts)=>{const im=new THREE.InstancedMesh(geo,mat,Math.max(1,cap));im.frustumCulled=false;im.castShadow=!!(opts&&opts.cast);im.receiveShadow=true;
    if(opts&&opts.attrs)for(const a of opts.attrs){const arr=new Float32Array(Math.max(1,cap));im.geometry.setAttribute(a,new THREE.InstancedBufferAttribute(arr,1));}
    if(opts&&opts.color){im.setColorAt(0,new THREE.Color(1,1,1));}
    im.count=0;root.add(im);return im;};
  const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_p=new THREE.Vector3(),_s=new THREE.Vector3(),_c=new THREE.Color();
  function put(im,i,x,y,z,yaw,pitch,roll,sx,sy,sz){_e.set(roll||0,yaw||0,pitch||0,'YZX');_q.setFromEuler(_e);_p.set(x,y,z);_s.set(sx,sy===undefined?sx:sy,sz===undefined?sx:sz);_m.compose(_p,_q,_s);im.setMatrixAt(i,_m);}
  function attr(im,name,i,v){im.geometry.attributes[name].array[i]=v;}
  function tint(im,i,c){_c.setRGB(c[0],c[1],c[2]);im.setColorAt(i,_c);}
  function flush(im){im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;for(const a of['aPhase','aParam','aAmp'])if(im.geometry.attributes[a])im.geometry.attributes[a].needsUpdate=true;}
  const capTris={};   /* per group: capacity triangles (the most this group can ever draw), for the budget test */
  const reg=(name,im,cap)=>{capTris[name]=(capTris[name]||0)+Math.round((im.geometry.index.count/3)*cap);};
  const groundSlope=(x,z,e)=>{const a=H(x+e,z),b=H(x-e,z),c=H(x,z+e),d=H(x,z-e);return Math.hypot(a-b,c-d)/(2*e);};

  /* ---------- seals ---------- */
  const SEALM=animMat('li-seal','', `
    float br=sin(uLT*1.25+aPhase)*0.5+0.5;transformed.y+=aW*br*0.024;transformed.xz*=1.0+aW*br*0.012;
    float hump=sin(6.2831*(position.x*1.3-uLT*0.6)+aPhase)*aParam*0.06*(0.35+aW);transformed.y+=hump;transformed.z+=sin(6.2831*(position.x*0.9-uLT*0.6))*aParam*0.03;`);
  const sealGeos=[0,1,2].map(p=>sealGeo(DET,p)),sealFarGeo=sealGeo(0,2);
  const sealNear=sealGeos.map(g=>mk(g,SEALM,TR.sealNear,{cast:true,attrs:['aPhase','aParam'],color:true}));
  const sealFar=mk(sealFarGeo,SEALM,TR.sealFar,{cast:false,attrs:['aPhase','aParam'],color:true});
  sealNear.forEach(im=>reg('seals',im,TR.sealNear));reg('seals',sealFar,TR.sealFar);
  /* worst case for the budget: near meshes are chosen from three pose meshes but the sum of near seals is capped at sealNear, so the group cap is sealNear * the largest pose */
  capTris.seals=Math.round(TR.sealNear*Math.max(...sealGeos.map(g=>g.index.count/3))+TR.sealFar*sealFarGeo.index.count/3);
  const seals=[];            /* every slot of every site: {site, x,z, yaw, y,pitch,roll, size, pup, pose, tint, ph, away, calm, dir, dist} */
  const sites=life.seals.map(s=>({id:s.id,x:s.xy[0],z:s.xy[1],r:s.r,a1:s.a1,a2:s.a2,rot:s.rot,n:s.n,pups:s.pups,kind:s.kind,top:s.top,slots:[],level:0,gone:false,away:0}));
  const SPACE=E.seal*1.4;
  sites.forEach(S=>{
    const R=mulberry32(seed*7919+S.id*131+5),cand=[];
    const rr=S.r+4;
    const A1=(S.a1||S.r)+3,A2=(S.a2||S.r)+3,cr=Math.cos(S.rot||0),sr=Math.sin(S.rot||0);
    for(let k=0;k<520;k++){const a=R()*TAU,d=Math.sqrt(R()),u=Math.cos(a)*d*A1,v=Math.sin(a)*d*A2,x=S.x+cr*u-sr*v,z=S.z+sr*u+cr*v;const h=H(x,z);
      if(h<0.12||h>S.top+1.6)continue;if(Math.hypot(x,z)>api.tableR-12)continue;if(groundSlope(x,z,1.2)>0.5)continue;
      if(cand.some(c=>Math.hypot(c.x-x,c.z-z)<SPACE))continue;cand.push({x,z,h,rnd:R()});}
    cand.sort((a,b)=>b.h-a.h||a.x-b.x);                  /* slot 0 = the highest, driest spot (leaves last when the tide rises) */
    const want=Math.min(S.n,cand.length);
    for(let k=0;k<want;k++){const c=cand[k];const pup=k>=want-S.pups&&S.kind==='grey';
      const rr2=mulberry32(seed*31+S.id*977+k*13);
      /* heading: lying along the contour, head down-slope with a jitter (they rest facing the water) */
      let gx=H(c.x+1,c.z)-H(c.x-1,c.z),gz=H(c.x,c.z+1)-H(c.x,c.z-1);const gl=Math.hypot(gx,gz);
      const yaw=gl>.02?Math.atan2(gz,-gx)+(rr2()-.5)*1.6:rr2()*TAU;     /* forward = (cos yaw, -sin yaw) in x,z; down-slope is (-gx,-gz) so forward z = -sin(yaw) = -gz-ish */
      const size=E.seal*(pup?1.0:2.0)*(.88+.24*rr2());
      const male=rr2()<.4;const tn=pup?[2.0,1.9,1.75]:male?[.8,.79,.76]:[1.15,1.1,1.02];
      S.slots.push({x:c.x,z:c.z,h:c.h,yaw:yaw,size,pup,pose:rr2()<.55?0:rr2()<.6?2:1,tint:tn,ph:rr2()*TAU,away:0,hold:0,dir:null,slide:0});}
    S.slots.forEach(sl=>{sl.site=S;seals.push(sl);
      /* where the water is: scan 16 directions outward until the ground is under the sea level (tide 0), keep the nearest */
      let best=null;for(let k=0;k<16;k++){const a=k/16*TAU,ca=Math.cos(a),sa=Math.sin(a);for(let d=1;d<=60;d+=1){if(H(sl.x+ca*d,sl.z+sa*d)<-0.25){if(!best||d<best.d)best={d,ca,sa};break;}}}
      sl.dir=best?[best.ca,best.sa]:[1,0];sl.slide=(best?best.d:8)+2.5;
      /* ground fit: belly on the ground, tilted with it (sample four points around the body) */
      const L=sl.size*0.5,fx=Math.cos(sl.yaw),fz=-Math.sin(sl.yaw),sx2=-fz,sz2=fx;
      const hf=H(sl.x+fx*L*.7,sl.z+fz*L*.7),hb=H(sl.x-fx*L*.7,sl.z-fz*L*.7),hl=H(sl.x+sx2*L*.3,sl.z+sz2*L*.3),hr=H(sl.x-sx2*L*.3,sl.z-sz2*L*.3);
      sl.pitch=Math.atan2(hf-hb,L*1.4)*.9;sl.roll=0;sl.gy=(hf+hb+hl+hr+sl.h*2)/6-0.04*sl.size;
    });});
  const sealByDist=[];
  const slotNow=()=>0;
  function updateSeals(dt){
    const cp=camera.position,tide=tideNow();
    const boats=api.boats();
    for(const S of sites){
      const lv=disturb[S.id]||0;if(!S.gone&&lv>LEAVE_LEVEL)S.gone=true;else if(S.gone&&lv<RETURN_LEVEL)S.gone=false;}
    const act=[];
    for(const sl of seals){
      const S=sl.site;
      /* threat: camera eye or a boat within FLEE_M (alert within ALERT_M) */
      let dmin=Math.hypot(cp.x-sl.x,cp.y-sl.gy,cp.z-sl.z);
      let dBoat=1e9;for(const b of boats){const d=Math.hypot(b.x-sl.x,b.z-sl.z);if(d<dBoat)dBoat=d;}
      sl.dcam=dmin;const thr=Math.min(dmin,dBoat);
      const wet=sl.h<tide+0.12;                          /* the rock slot is under the sea: they slip off */
      const leave=S.gone||wet||thr<FLEE_M;
      sl.alert=thr<ALERT_M;
      if(leave){sl.away=Math.min(1,sl.away+dt/(S.gone?3.5:2.2));sl.hold=wet||S.gone?0:6;}
      else{sl.hold=Math.max(0,sl.hold-dt);if(sl.hold<=0)sl.away=Math.max(0,sl.away-dt/7);}
      if(sl.away<0.999)act.push(sl);
    }
    S_active=act.length;
    act.sort((a,b)=>a.dcam-b.dcam);
    let nN=[0,0,0],nF=0,total=0;const nearD=130;
    const sealsPerSite={};
    for(let k=0;k<act.length;k++){const sl=act[k];const near=k<TR.sealNear&&sl.dcam<nearD;
      const a=sl.away,e=a*a*(3-2*a);
      const x=sl.x+sl.dir[0]*sl.slide*e,z=sl.z+sl.dir[1]*sl.slide*e;
      let gy=a<0.02?sl.gy:Math.max(H(x,z)-0.04*sl.size,tide-0.45)-e*e*0.6*sl.size;
      const sc=sl.size*(1-sm(.9,1,a)*.9);
      const hv=a>0.02&&a<.98?1:0;
      const yaw=a>0.02?Math.atan2(-sl.dir[1],sl.dir[0]):sl.yaw;        /* slipping away head first */
      const pose=sl.alert&&!hv?1:sl.pose;
      if(near){const pi=pose;const im=sealNear[pi],i=nN[pi]++;put(im,i,x,gy,z,yaw,a>0.02?0:sl.pitch,0,sc,sc*(sl.pup?1:1),sc);attr(im,'aPhase',i,sl.ph);attr(im,'aParam',i,hv*(1-a*.3));tint(im,i,sl.tint);}
      else if(nF<TR.sealFar){const im=sealFar,i=nF++;put(im,i,x,gy,z,yaw,a>0.02?0:sl.pitch,0,sc,sc,sc);attr(im,'aPhase',i,sl.ph);attr(im,'aParam',i,hv);tint(im,i,sl.tint);}
      sealsPerSite[sl.site.id]=(sealsPerSite[sl.site.id]||0)+1;
    }
    for(let p=0;p<3;p++){sealNear[p].count=nN[p];flush(sealNear[p]);}sealFar.count=nF;flush(sealFar);
    sealVisible=sealsPerSite;sealDrawn=nN[0]+nN[1]+nN[2]+nF;
  }
  let S_active=0,sealVisible={},sealDrawn=0;

  /* ---------- perched birds on colony tops (gannet, tern, gull) and puffins on turf ---------- */
  const NESTM=animMat('li-perch','',`float sh=sin(uLT*(5.0+aPhase)+aPhase*9.0)*aParam;transformed.y+=aW*sh*0.012;`);
  const nestGeo=perchedGeo(DET,SEABIRD),puffGeo=perchedGeo(DET,Object.assign({},PUFFIN,{fish:null})),puffFishGeo=perchedGeo(DET,PUFFIN);
  const nestM=mk(nestGeo,NESTM,TR.nest,{cast:true,attrs:['aPhase','aParam','aAmp'],color:true});reg('colony',nestM,TR.nest);
  const puffM=mk(puffGeo,NESTM,TR.puff,{cast:true,attrs:['aPhase','aParam','aAmp'],color:true});reg('puffin',puffM,TR.puff);
  const puffFM=mk(puffFishGeo,NESTM,Math.ceil(TR.puff/2),{cast:true,attrs:['aPhase','aParam','aAmp'],color:true});capTris.puffin=Math.round(Math.max(puffGeo.index.count,puffFishGeo.index.count)/3*TR.puff);
  const birdSlots=[],puffSlots=[];
  function dartSlots(cx,cz,r,n,space,R,okFn){const out=[];for(let k=0;k<n*14&&out.length<n;k++){const a=R()*TAU,d=Math.sqrt(R())*r,x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d;if(Math.hypot(x,z)>api.tableR-10)continue;
      const h=H(x,z);if(!okFn(x,z,h))continue;if(out.some(o=>Math.hypot(o.x-x,o.z-z)<space))continue;out.push({x,z,h});}return out;}
  const colonyW=life.colonies.map(c=>c.pairs);const totalPairs=colonyW.reduce((a,b)=>a+b,0)||1;
  life.colonies.forEach((c,ci)=>{const R=mulberry32(seed*53+ci*71+3);const share=Math.max(c.pairs>=3?3:0,Math.round(TR.nest*1.0*c.pairs/totalPairs));
    const sp=(c.kind==='gannet'?E.nest:E.nest*.9)*0.9;
    const slots=dartSlots(c.xy[0],c.xy[1],c.r+3,Math.min(share,Math.max(2,Math.round(c.pairs))),sp,R,(x,z,h)=>h>1.2&&groundSlope(x,z,1)<0.55);
    slots.forEach((s,k)=>{const rr=mulberry32(seed*17+ci*1009+k);birdSlots.push({x:s.x,z:s.z,y:s.h,kind:c.kind,yaw:rr()*TAU,ph:rr()*TAU,size:(c.kind==='gannet'?.9:c.kind==='tern'?.36:.62)*E.nest*(.92+.16*rr()),
      tint:c.kind==='gull'?[.8,.82,.84]:c.kind==='tern'?[1.0,1.0,1.0]:[1,1,1],site:ci});});});
  const puffSites=life.puffins;
  puffSites.forEach((c,pi)=>{const R=mulberry32(seed*97+pi*41+9);const n=Math.min(Math.round(c.pairs*.8),Math.round(TR.puff/Math.max(1,puffSites.length))+2);
    const slots=dartSlots(c.xy[0],c.xy[1],c.r+2,Math.max(2,n),E.puffin*.7,R,(x,z,h)=>h>2.5&&groundSlope(x,z,1)<0.7);
    slots.forEach((s,k)=>{const rr=mulberry32(seed*19+pi*503+k);
      /* face the sea: the nearest water direction (scan), jittered */
      let best=null;for(let a=0;a<16;a++){const ca=Math.cos(a/16*TAU),sa=Math.sin(a/16*TAU);for(let d=2;d<=40;d+=2){if(H(s.x+ca*d,s.z+sa*d)<-0.2){if(!best||d<best.d)best={d,ca,sa};break;}}}
      const yaw=best?Math.atan2(-best.sa,best.ca)+(rr()-.5)*1.2:rr()*TAU;
      puffSlots.push({x:s.x,z:s.z,y:s.h,yaw,ph:rr()*TAU,fish:rr()<.4,size:.3*E.puffin*(.92+.16*rr()),site:pi});});});
  function updateNest(){
    let nN=0;for(const b of birdSlots){if(nN>=TR.nest)break;const i=nN++;put(nestM,i,b.x,b.y-.03,b.z,b.yaw,0,0,b.size);attr(nestM,'aPhase',i,b.ph);attr(nestM,'aParam',i,0);tint(nestM,i,b.tint);}
    nestM.count=nN;flush(nestM);
    let a=0,f=0;for(const p of puffSlots){if(a+f>=TR.puff)break;if(p.fish){if(f>=puffFM.instanceMatrix.count)continue;const i=f++;put(puffFM,i,p.x,p.y-.02,p.z,p.yaw,0,0,p.size);attr(puffFM,'aPhase',i,p.ph);attr(puffFM,'aParam',i,0.3);attr(puffFM,'aAmp',i,1);tint(puffFM,i,[1,1,1]);}
      else{const i=a++;put(puffM,i,p.x,p.y-.02,p.z,p.yaw,0,0,p.size);attr(puffM,'aPhase',i,p.ph);attr(puffM,'aParam',i,0.3);attr(puffM,'aAmp',i,1);tint(puffM,i,[1,1,1]);}}
    puffM.count=a;puffFM.count=f;flush(puffM);flush(puffFM);
  }
  updateNest();

  /* ---------- flying gannets (glide, flap bursts, periodic plunge dive and splash) and flying puffins ---------- */
  const GANM=animMat('li-flyer-g','',`float fl=sin(uLT*6.2831*2.7+aPhase);transformed.y+=aAmp*aW*aW*0.5*fl-aW*aW*0.06;transformed.y+=(1.0-aParam)*0.0;float fo=aParam*aW;transformed.z*=1.0-0.86*fo;transformed.x-=0.32*fo;transformed.y+=0.12*fo*fo*aW;`,null,{side:THREE.DoubleSide});
  const PFM=animMat('li-flyer-p','',`float fl=sin(uLT*6.2831*8.0+aPhase);transformed.y+=aAmp*aW*aW*0.55*fl-aW*aW*0.05;`,null,{side:THREE.DoubleSide});
  const ganG=flyerGeo(DET,GANNET),pfG=flyerGeo(DET,PUFFIN_FLY);
  const ganM=mk(ganG,GANM,TR.gan,{cast:false,attrs:['aPhase','aParam','aAmp']});reg('gannets',ganM,TR.gan);
  const pfM=mk(pfG,PFM,TR.puffFly*Math.max(1,puffSites.length>0?1:0),{cast:false,attrs:['aPhase','aParam','aAmp']});reg('puffin',pfM,TR.puffFly);
  const SPL=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.4,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  const splM=new THREE.InstancedMesh(splashGeo(),SPL,TR.gan+2);splM.count=0;splM.frustumCulled=false;splM.renderOrder=7;root.add(splM);reg('splash',splM,TR.gan+2);
  /* where the fish are: shoal sites from life.json, and the colony tops; gannets circle over their colony (or over the open water of the window when it has none) and dive on the shoals */
  const shoals=life.shoals.map(s=>({id:s.id,x:s.xy[0],z:s.xy[1],r:s.r,index:s.index,depth:s.depth}));
  const gcol=life.colonies.filter(c=>c.kind==='gannet');
  const nGan=Math.min(TR.gan,Math.max(3,gcol.length?Math.round(2+Math.sqrt(gcol.reduce((a,c)=>a+c.pairs,0))/3):3));
  const gannets=[];
  for(let k=0;k<nGan;k++){const R=mulberry32(seed*211+k*37+1);const c=gcol.length?gcol[k%gcol.length]:null;
    const cx=c?c.xy[0]:(R()-.5)*120,cz=c?c.xy[1]:(R()-.5)*120;
    let gx=cx+(R()-.5)*14,gz=cz+(R()-.5)*14,grad=34+R()*34;const gd=Math.hypot(gx,gz);       /* keep the whole circle over the table (radius 122 m, 118 inside the rim) */
    if(gd+grad>112){grad=Math.max(16,Math.min(grad,112-gd));if(gd+grad>112){const kk=(112-grad)/gd;gx*=kk;gz*=kk;}}
    gannets.push({cx:gx,cz:gz,rad:grad,dir:R()<.5?-1:1,ph:R()*TAU,a0:R()*TAU,alt:9+R()*12,P:34+R()*22,off:R()*50,seed:k,speed:5.2+R()*1.6});}
  const GV=(g,t)=>g.speed/g.rad;     /* angular speed */
  function circlePos(g,t,out){const a=g.a0+g.dir*GV(g,t)*t;const alt=g.alt+Math.sin(t*.21+g.ph)*1.6;out[0]=g.cx+Math.cos(a)*g.rad;out[1]=alt;out[2]=g.cz+Math.sin(a)*g.rad;out.bank=-g.dir*.28;out.flap=.07+.55*sm(.62,.9,Math.sin(t*.37+g.ph*3.0)*.5+.5);return out;}
  function diveTarget(g,cyc){
    if(shoals.length){const ns=Math.max(1,nShoal),si=Math.floor(hash3(g.seed,cyc,seed)*ns)%ns;const tref=cyc*g.P-g.off+.55*g.P+DIVE_T*.5;   /* the shoal's own centre at the middle of the dive */
      const c=shoalCentre(si,tref),a=hash3(g.seed,cyc,seed+5)*TAU,d=Math.sqrt(hash3(g.seed,cyc,seed+9))*shoals[si].r*.35;return[c[0]+Math.cos(a)*d,c[1]+Math.sin(a)*d];}
    const a=hash3(g.seed,cyc,seed+5)*TAU,d=20+hash3(g.seed,cyc,seed+9)*50;return[Math.cos(a)*d,Math.sin(a)*d];}
  const _pa=[0,0,0],_pb=[0,0,0],_pc=[0,0,0];
  const DIVE_T=7.0;
  function gannetPose(g,t,out){
    const tau=(t+g.off)%g.P,cyc=Math.floor((t+g.off)/g.P),td=0.55*g.P;
    if(tau<td||tau>td+DIVE_T){circlePos(g,t,_pa);out.x=_pa[0];out.y=_pa[1];out.z=_pa[2];out.fold=0;out.flap=_pa.flap;out.splash=-1;out.bank=_pa.bank;out.under=0;return out;}
    const u=(tau-td)/DIVE_T,tgt=diveTarget(g,cyc),wy=tideNow();circlePos(g,t,_pa);
    const ty=Math.max(wy-1.8,H(tgt[0],tgt[1])+0.5);
    const e1=sm(.14,.5,u),e2=sm(.74,1,u);
    let x=lerp(_pa[0],tgt[0],e1),z=lerp(_pa[2],tgt[1],e1);
    if(u>.74){x=lerp(tgt[0],_pa[0],e2);z=lerp(tgt[1],_pa[2],e2);}
    let y;const apex=_pa[1]+4.0;
    if(u<.26)y=lerp(_pa[1],apex,Math.sin(u/.26*Math.PI/2));
    else if(u<.5)y=lerp(apex,wy,Math.pow((u-.26)/.24,1.7));
    else if(u<.74)y=lerp(wy,ty,sm(.5,.62,u))*1.0+0*(u);
    else y=lerp(ty,_pa[1],sm(.74,1,u));
    out.x=x;out.y=y;out.z=z;out.fold=sm(.3,.42,u)*(1-sm(.5,.56,u))+(u>=.5&&u<.74?1:0)*(1-sm(.7,.74,u))+0;
    out.fold=u<.26?0:u<.5?sm(.26,.4,u):u<.74?1:1-sm(.74,.86,u);
    out.flap=u<.2?.9:u>.84?.7:0.0;out.splash=(u>=.5&&u<.78)?(u-.5)/.28:-1;out.sx=tgt[0];out.sz=tgt[1];out.bank=0;out.under=(u>=.5&&u<.74)?1:0;
    return out;}
  const _gp={},_gq={};
  function updateGannets(t){
    let ns=0;
    for(let k=0;k<gannets.length;k++){const g=gannets[k];gannetPose(g,t,_gp);gannetPose(g,t+.08,_gq);
      const vx=_gq.x-_gp.x,vy=_gq.y-_gp.y,vz=_gq.z-_gp.z;const hl=Math.hypot(vx,vz)||1e-6;
      const yaw=Math.atan2(-vz,vx),pitch=Math.atan2(vy,hl)*.9;
      put(ganM,k,_gp.x,_gp.y,_gp.z,yaw,clamp(pitch,-1.45,1.0),_gp.bank||0,E.gannet*.95);attr(ganM,'aPhase',k,g.ph+0.3*k);attr(ganM,'aParam',k,_gp.fold);attr(ganM,'aAmp',k,_gp.flap);
      if(_gp.splash>=0&&ns<splM.instanceMatrix.count){const a=_gp.splash,sc=(.9+4.4*Math.sqrt(a))*E.gannet*.5,hh=(2.2*Math.sin(Math.min(1,a*2.2)*Math.PI*.9)+.1)*E.gannet*.5*Math.pow(1-a,1.3);
        put(splM,ns,_gp.sx,tideNow()+.02,_gp.sz,0,0,0,sc,Math.max(.05,hh),sc);ns++;}}
    ganM.count=gannets.length;flush(ganM);splM.count=ns;splM.instanceMatrix.needsUpdate=true;
  }
  /* flying puffins: short racetracks from the turf out over the water and back, wings buzzing */
  const pfly=[];puffSites.forEach((c,pi)=>{for(let k=0;k<Math.min(TR.puffFly,2+(pi%2));k++){if(pfly.length>=TR.puffFly)break;const R=mulberry32(seed*313+pi*17+k);
    let best=null;for(let a=0;a<16;a++){const ca=Math.cos(a/16*TAU),sa=Math.sin(a/16*TAU);for(let d=2;d<=60;d+=2){if(H(c.xy[0]+ca*d,c.xy[1]+sa*d)<-0.5){if(!best||d<best.d)best={d,ca,sa};break;}}}
    const dd=best?best.d+16:30,ca=best?best.ca:1,sa=best?best.sa:0;pfly.push({cx:c.xy[0]+ca*dd*.7,cz:c.xy[1]+sa*dd*.7,ax:Math.max(14,dd*.6),az:7+R()*6,rot:Math.atan2(sa,ca),ph:R()*TAU,sp:.42+R()*.12,alt:5+R()*5,fph:R()*TAU});}});
  function updatePuffFly(t){let n=0;for(const p of pfly){if(n>=pfM.instanceMatrix.count)break;const th=p.ph+t*p.sp,ca=Math.cos(p.rot),sa=Math.sin(p.rot);
      const lx=Math.cos(th)*p.ax,lz=Math.sin(th)*p.az;const x=p.cx+lx*ca-lz*sa,z=p.cz+lx*sa+lz*ca;
      const th2=th+.05,lx2=Math.cos(th2)*p.ax,lz2=Math.sin(th2)*p.az;const x2=p.cx+lx2*ca-lz2*sa,z2=p.cz+lx2*sa+lz2*ca;
      const y=Math.max(tideNow()+2.5,p.alt+Math.sin(t*.9+p.ph)*1.2);
      put(pfM,n,x,y,z,Math.atan2(-(z2-z),x2-x),0,.18*(p.rot>0?1:-1),E.puffin*.3);attr(pfM,'aPhase',n,p.fph+n);attr(pfM,'aParam',n,0);attr(pfM,'aAmp',n,1);n++;}
    pfM.count=n;flush(pfM);}

  /* ---------- kelp (instanced clusters on the bed, sway in the shader, height follows the tide) ---------- */
  const KELPM=animMat('li-kelp-u','',`float h=aW;float sw=sin(uLT*0.85+aPhase+position.x*1.2+position.z*0.9);transformed.x+=(0.32*sw+0.12*sin(uLT*1.9+aPhase*2.0))*h*h;transformed.z+=0.2*cos(uLT*0.7+aPhase*1.5+position.z)*h*h;`,null,{side:THREE.DoubleSide,under:true});
  const kelpG=kelpGeo(DET);
  const kelpM=mk(kelpG,KELPM,TR.kelp,{attrs:['aPhase'],color:true});kelpM.renderOrder=6;reg('kelp',kelpM,TR.kelp);
  const kelpPatches=[];
  for(const k of life.kelp){const x=k[0],z=k[1],bed=H(x,z);if(bed>-0.9)continue;if(Math.hypot(x,z)>api.tableR-8)continue;const rr=mulberry32(Math.floor(x*131+z*977+seed));
    kelpPatches.push({x,z,bed,yaw:rr()*TAU,ph:rr()*TAU,sc:1.5+rr()*.7,tn:[.85+rr()*.3,.85+rr()*.3,.8+rr()*.2],hmax:2.0+Math.min(4.0,-bed*.7)});}
  function updateKelp(){const tide=tideNow();let n=0;for(const p of kelpPatches){if(n>=TR.kelp)break;const depth=tide-p.bed;if(depth<.35)continue;
      const hgt=Math.min(p.hmax,depth-.12);const lean=0;put(kelpM,n,p.x,p.bed-.05,p.z,p.yaw,0,0,p.sc*(.8+.2*hgt/p.hmax),hgt,p.sc*(.8+.2*hgt/p.hmax));attr(kelpM,'aPhase',n,p.ph);tint(kelpM,n,p.tn);n++;}
    kelpM.count=n;flush(kelpM);}

  /* ---------- fish shoals (instanced fish, body sine in the shader, a swirl around a drifting centre) ---------- */
  const FISHM=animMat('li-fish-u','',`float tw=aW*aW;transformed.z+=sin(uLT*6.2831*4.2-position.x*5.0+aPhase)*0.11*tw;transformed.x*=1.0;`,null,{under:true});
  const fishG=fishGeo(DET);
  const nShoal=Math.min(TR.fish[0],shoals.length),perShoal=TR.fish[1];
  const fishM=mk(fishG,FISHM,nShoal*perShoal,{attrs:['aPhase'],color:true});fishM.renderOrder=6;reg('fish',fishM,nShoal*perShoal);
  const fishList=[];
  shoals.slice(0,nShoal).forEach((s,si)=>{const nf=Math.max(8,Math.round(s.index*perShoal));for(let k=0;k<nf;k++){const R=mulberry32(seed*401+si*977+k);
    fishList.push({s:si,th:R()*TAU,rad:Math.sqrt(R())*s.r*(.5+.5*s.index),w:(.16+R()*.14)*(R()<.5?-1:1),dy:.6+R()*Math.min(2.8,s.depth*.4),ph:R()*TAU,sz:E.fish*.27*(.8+.4*R()),v:.7+R()*.6,tn:[.9+R()*.2,.95+R()*.15,1.0]});}});
  const shoalC=shoals.slice(0,nShoal).map(()=>({x:0,z:0}));
  function shoalCentre(si,t){const s=shoals[si];const a=.045*t+si*2.1,b=.031*t+si*1.3;let x=s.x+Math.cos(a)*9,z=s.z+Math.sin(b)*9;if(H(x,z)>-1.6){x=s.x;z=s.z;}return[x,z];}
  function updateFish(t){const tide=tideNow();for(let si=0;si<nShoal;si++){const c=shoalCentre(si,t);shoalC[si].x=c[0];shoalC[si].z=c[1];}
    let n=0;for(const f of fishList){const c=shoalC[f.s];const th=f.th+f.w*t;const rx=f.rad*(1+.12*Math.sin(t*.4+f.ph)),rz=f.rad*.7;
      const x=c.x+Math.cos(th)*rx,z=c.z+Math.sin(th)*rz;const dx=-Math.sin(th)*rx*f.w,dz=Math.cos(th)*rz*f.w;
      const bed=H(x,z);if(tide-bed<1.2||Math.hypot(x,z)>api.tableR-6)continue;                      /* no fish over the shallows or beyond the rim */
      let y=tide-f.dy+Math.sin(t*.5+f.ph)*.25;if(y<bed+.5)y=bed+.5;if(y>tide-.35)y=tide-.35;
      put(fishM,n,x,y,z,Math.atan2(-dz,dx),0,0,f.sz*f.v);attr(fishM,'aPhase',n,f.ph);tint(fishM,n,f.tn);n++;}
    fishM.count=n;flush(fishM);}

  /* ---------- robots (robots.js), when loaded ---------- */
  const rb=(window.LI_ROBOTS&&api.robots!==false)?window.LI_ROBOTS.create(Object.assign({},api,{root,life,tierName,ULT})):null;

  /* ---------- the frame ---------- */
  function setT(t){ULT.value=t;}
  function frame(dt,t){
    simT+=dt;const T=frozen!==null?frozen:simT;ULT.value=T;USEA.value=tideNow();stat.time=T;
    updateSeals(dt);updateGannets(T);updatePuffFly(T);updateKelp();updateFish(T);
    if(rb)rb.frame(dt,T);
  }
  frame(0.0001,0);          /* first state so the first frame already has the animals */
  /* clock-independent hash of every placement (positions are quantised to 1 cm, no time, no tier cap): the same on every machine and reload */
  function placementHash(){let h=2166136261>>>0;const mix=v=>{v=v|0;for(let i=0;i<4;i++){h^=(v>>>(i*8))&255;h=Math.imul(h,16777619)>>>0;}};const q=v=>Math.round(v*100);
    for(const S of sites){mix(S.id);mix(S.slots.length);for(const s of S.slots){mix(q(s.x));mix(q(s.z));mix(q(s.size));}}
    for(const b of birdSlots){mix(q(b.x));mix(q(b.z));}for(const p of puffSlots){mix(q(p.x));mix(q(p.z));}
    for(const k of kelpPatches){mix(q(k.x));mix(q(k.z));}for(const s of shoals){mix(q(s.x));mix(q(s.z));mix(q(s.index));}
    for(const g of gannets){mix(q(g.cx));mix(q(g.cz));mix(q(g.rad));}
    if(rb)mix(rb.hash());
    return('00000000'+h.toString(16)).slice(-8);}
  const budget=()=>{const tot=Object.values(capTris).reduce((a,b)=>a+b,0);return{tier:tierName,allowance:ALLOWANCE[tierName],capacity:Object.assign({},capTris),total:tot};};
  const drawnTris=()=>{let t=0;root.traverse(o=>{if(o.isInstancedMesh&&o.visible){const g=o.geometry;t+=(g.index?g.index.count/3:g.attributes.position.count/3)*o.count;}});return Math.round(t);};
  const apiOut={
    tier:tierName,
    setDisturbance:(id,level)=>{if(id==='all'||id===-1){sites.forEach(S=>{disturb[S.id]=level;});}else disturb[id]=level;},
    disturbance:id=>disturb[id]||0,
    sites:()=>sites.map(S=>({id:S.id,x:S.x,z:S.z,n:S.n,slots:S.slots.length,gone:S.gone,visible:sealVisible[S.id]||0,pups:S.pups,kind:S.kind})),
    sealsVisible:()=>S_active,sealsDrawn:()=>sealDrawn,
    seals:()=>seals.map(s=>({site:s.site.id,x:s.x,z:s.z,y:s.gy,away:s.away,size:s.size,pup:s.pup})),
    birds:()=>({colony:birdSlots.map(b=>({x:b.x,y:b.y,z:b.z,kind:b.kind})),puffins:puffSlots.map(b=>({x:b.x,y:b.y,z:b.z}))}),
    kelp:()=>kelpPatches.map(k=>({x:k.x,z:k.z,bed:k.bed})),
    shoals:()=>shoals.slice(0,nShoal).map((s,i)=>({id:s.id,x:shoalC[i].x,z:shoalC[i].z,index:s.index})),
    fish:()=>fishList.slice(0,2000).map((f,i)=>{const m=new THREE.Matrix4();fishM.getMatrixAt(i,m);return[m.elements[12],m.elements[13],m.elements[14]];}).slice(0,fishM.count),
    gannets:()=>gannets.map((g,k)=>{const m=new THREE.Matrix4();ganM.getMatrixAt(k,m);return{x:m.elements[12],y:m.elements[13],z:m.elements[14],fold:ganM.geometry.attributes.aParam.array[k]};}),
    gannetAt:(k,t)=>{const o={};gannetPose(gannets[k],t,o);return{x:o.x,y:o.y,z:o.z,splash:o.splash,fold:o.fold,under:o.under};},
    gannetDive:k=>({P:gannets[k].P,start:.55*gannets[k].P-gannets[k].off,len:DIVE_T}),
    setTime:t=>{frozen=(t===null||t===undefined)?null:t;if(frozen!==null)frame(0.0001,0);},
    advance:sec=>{const st=.1;for(let s=0;s<sec;s+=st)frame(Math.min(st,sec-s),0);},
    hash:placementHash,budget,drawnTris,
    counts:()=>({splash:splM.count,sealSlots:seals.length,colony:birdSlots.length,puffins:puffSlots.length,kelp:kelpPatches.length,fishDrawn:fishM.count,gannets:gannets.length,puffFly:pfly.length,sealsDrawn:sealDrawn,sealsActive:S_active,drawnTris:drawnTris()}),
    robots:rb?rb.api:null,
    fleeM:FLEE_M,alertM:ALERT_M
  };
  return { frame, api: apiOut, root };
}
window.LI_ANIMALS = { create, TIERS, ALLOWANCE, E };
})();
