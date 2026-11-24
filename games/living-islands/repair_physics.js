/* repair_physics.js: a small pure physics for repairable parts (see REPAIR_PILOT.md). No DOM, no three.js, no downloads.
   Rigid planks and posts are boxes with mass, drawn and collided as short rows of spheres (a plank is two rows, a post one row), which keeps contacts cheap and stable:
   gravity, sphere against a height function (the ground), sphere against sphere, sphere against static boxes (posts, deck, fitted planks), friction, small bounce,
   simple sleeping, buoyancy from a water height function, a current that pushes floating parts, a hold spring for a hand, and sockets (slot pose, snap radius, snap angle,
   kind) with joints (a lashing or a nail with a break load, fatigue, surge load from the water).
   Fixed timestep (STEP = 1/120 s); advance(dt) runs whole steps from an accumulator, so the same inputs always give the same state.
   Units: metres, seconds, kilograms, newtons. y is up. Quaternions are [x,y,z,w]. Works in node (import, then globalThis.LI_REPAIR; or module.exports) and in the page (window.LI_REPAIR). */
(function(root,factory){const api=factory();if(typeof module==='object'&&module&&module.exports)module.exports=api;if(root)root.LI_REPAIR=api;if(typeof globalThis!=='undefined')globalThis.LI_REPAIR=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const STEP=1/120,G=9.81,RHO_W=1000;
const MAX_SPEED=6.0;                 /* TUNING: speed cap so a part never crosses a 4.6 cm plank in one step (0.05 m per step) */
const ITER=6;                        /* sequential impulse passes per step */
const SLEEP_V=.045,SLEEP_W=.16,SLEEP_T=.7;   /* TUNING: below these speeds for this long a part sleeps */
/* ---------- tiny vector and quaternion helpers (arrays) ---------- */
const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
function qnorm(q){const l=Math.hypot(q[0],q[1],q[2],q[3])||1;q[0]/=l;q[1]/=l;q[2]/=l;q[3]/=l;return q;}
function qmat(q){const x=q[0],y=q[1],z=q[2],w=q[3];return[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)];}
const mv=(R,v)=>[R[0]*v[0]+R[1]*v[1]+R[2]*v[2],R[3]*v[0]+R[4]*v[1]+R[5]*v[2],R[6]*v[0]+R[7]*v[1]+R[8]*v[2]];
const mtv=(R,v)=>[R[0]*v[0]+R[3]*v[1]+R[6]*v[2],R[1]*v[0]+R[4]*v[1]+R[7]*v[2],R[2]*v[0]+R[5]*v[1]+R[8]*v[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function qaxis(ax,ang){const s=Math.sin(ang/2),l=Math.hypot(ax[0],ax[1],ax[2])||1;return[ax[0]/l*s,ax[1]/l*s,ax[2]/l*s,Math.cos(ang/2)];}
function qyaw(a){return[0,Math.sin(a/2),0,Math.cos(a/2)];}
function qangle(a,b){const d=Math.abs(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]);return 2*Math.acos(Math.min(1,d));}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
/* the plank is symmetric under a half turn about any of its own axes (and a post about its long axis): these are the quaternions that give the same fit */
const SYM_PLANK=[[0,0,0,1],[1,0,0,0],[0,1,0,0],[0,0,1,0]],SYM_POST=[[0,0,0,1],[0,1,0,0]];
/* ---------- a cached height grid (bilinear) so a costly page height function is sampled once ---------- */
function heightGrid(fn,cx,cz,half,cell){const n=Math.ceil(2*half/cell)+1,x0=cx-half,z0=cz-half,d=new Float32Array(n*n);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++)d[j*n+i]=fn(x0+i*cell,z0+j*cell);
  const at=(x,z)=>{let u=(x-x0)/cell,v=(z-z0)/cell;if(u<0||v<0||u>=n-1||v>=n-1)return fn(x,z);const i=u|0,j=v|0;u-=i;v-=j;const k=j*n+i;return d[k]*(1-u)*(1-v)+d[k+1]*u*(1-v)+d[k+n]*(1-u)*v+d[k+n+1]*u*v;};
  at.grid={n,x0,z0,cell,half};return at;}
/* ---------- the world ---------- */
function create(opt){opt=opt||{};
  const W={t:0,steps:0,acc:0,bodies:[],sockets:[],statics:[],events:[],rng:mulberry32(opt.seed||1),
    ground:opt.ground||(()=>0),water:opt.water||null,current:opt.current||null,lostR:opt.lostR||60,origin:opt.origin||[0,0],nextId:1,stats:{contacts:0,awake:0,ms:0,steps:0}};
  const groundN=(x,z)=>{const e=.12,gx=(W.ground(x+e,z)-W.ground(x-e,z))/(2*e),gz=(W.ground(x,z+e)-W.ground(x,z-e))/(2*e),l=Math.sqrt(1+gx*gx+gz*gz);return[-gx/l,1/l,-gz/l];};
  /* ---- shapes: sphere rows in the part's own frame ---- */
  function shape(kind,o){const S=[];let r,half,vol,dims;
    if(kind==='post'){const L=o.len||1.4;r=o.radius||.075;half=[r,L/2,r];dims=[2*r,L,2*r];vol=Math.PI*r*r*L;
      for(let y=-(L/2-r);y<=L/2-r+1e-6;y+=r*1.3)S.push([0,y,0]);
      if(Math.abs(S[S.length-1][1]-(L/2-r))>.02)S.push([0,L/2-r,0]);}
    else{const L=o.len||1.66,w=o.width||.19,t=o.thick||.046;r=.04;half=[w/2,t/2,L/2];dims=[w+.03,2*r,L+.06];vol=w*t*L;
      const zr=L/2-r,n=Math.max(2,Math.round(2*zr/(r*2.4)));
      for(const x of[-(w/2-r*.9),w/2-r*.9])for(let i=0;i<=n;i++)S.push([x,0,-zr+2*zr*i/n]);}
    return{S,r,half,vol,dims};}
  function addBody(kind,o){o=o||{};const sh=shape(kind,o),dens=o.density||(kind==='post'?560:520),m=sh.vol*dens,d=sh.dims;
    const b={id:W.nextId++,kind,name:o.name||kind,half:sh.half,S:sh.S,r:sh.r,vol:sh.vol,mass:m,invM:1/m,
      inv:[12/(m*(d[1]*d[1]+d[2]*d[2])),12/(m*(d[0]*d[0]+d[2]*d[2])),12/(m*(d[0]*d[0]+d[1]*d[1]))],
      p:(o.p||[0,1,0]).slice(),q:qnorm((o.q||[0,0,0,1]).slice()),v:(o.v||[0,0,0]).slice(),w:(o.w||[0,0,0]).slice(),R:null,C:null,
      state:'dyn',asleep:false,still:0,hold:null,sock:null,fitT:0,fitFrom:null,sub:0,lost:false,contacts:0,dens,visOff:[0,0,0],health:.8+.25*W.rng(),tag:o.tag||null};
    b.R=qmat(b.q);b.C=b.S.map(s=>[0,0,0]);b.rad=Math.hypot(b.half[0],b.half[1],b.half[2])+b.r;W.bodies.push(b);return b;}
  const bodyById=id=>W.bodies.find(b=>b.id===id)||null;
  function addStatic(o){const s={p:o.p.slice(),q:qnorm((o.q||[0,0,0,1]).slice()),h:o.h.slice(),name:o.name||'',body:o.body||null,on:true};s.R=qmat(s.q);s.rad=Math.hypot(s.h[0],s.h[1],s.h[2]);W.statics.push(s);return s;}
  function addSocket(o){const s={id:o.id,kind:o.kind||'plank',p:o.p.slice(),q:qnorm((o.q||[0,0,0,1]).slice()),snapR:o.snapR||.30,snapAng:o.snapAng||.5,
    joint:{type:(o.joint&&o.joint.type)||'nail',strength:(o.joint&&o.joint.strength)||700},filled:null,hits:0,tag:o.tag||null,name:o.name||o.id};W.sockets.push(s);return s;}
  const socketById=id=>W.sockets.find(s=>s.id===id)||null;
  /* ---- the contact solver ---- */
  let CT=[];
  function worldSpheres(b){const R=b.R;for(let i=0;i<b.S.length;i++){const s=b.S[i],c=b.C[i];c[0]=b.p[0]+R[0]*s[0]+R[1]*s[1]+R[2]*s[2];c[1]=b.p[1]+R[3]*s[0]+R[4]*s[1]+R[5]*s[2];c[2]=b.p[2]+R[6]*s[0]+R[7]*s[1]+R[8]*s[2];}}
  function invIw(b){const R=b.R,d=b.inv,m=new Array(9);   /* R diag(d) R^T */
    for(let i=0;i<3;i++)for(let j=0;j<3;j++)m[i*3+j]=R[i*3]*d[0]*R[j*3]+R[i*3+1]*d[1]*R[j*3+1]+R[i*3+2]*d[2]*R[j*3+2];return m;}
  function addContact(a,bb,pt,n,depth,mu,tag){if(depth<=0)return;const ra=[pt[0]-a.p[0],pt[1]-a.p[1],pt[2]-a.p[2]],rb=bb?[pt[0]-bb.p[0],pt[1]-bb.p[1],pt[2]-bb.p[2]]:null;
    CT.push({a,b:bb,ra,rb,n,depth,mu,jn:0,jt:0,m:0,tag,pt});a.contacts++;if(bb)bb.contacts++;}
  function sphereBox(c,r,s,out){   /* closest point test of a sphere against an oriented static box; out = [nx,ny,nz,depth,px,py,pz] or null */
    const d=[c[0]-s.p[0],c[1]-s.p[1],c[2]-s.p[2]];const l=mtv(s.R,d),h=s.h;
    const cx=Math.max(-h[0],Math.min(h[0],l[0])),cy=Math.max(-h[1],Math.min(h[1],l[1])),cz=Math.max(-h[2],Math.min(h[2],l[2]));
    let dx=l[0]-cx,dy=l[1]-cy,dz=l[2]-cz;const d2=dx*dx+dy*dy+dz*dz;let nl,depth;
    if(d2>1e-12){if(d2>=r*r)return null;const dd=Math.sqrt(d2);nl=[dx/dd,dy/dd,dz/dd];depth=r-dd;}
    else{const ex=h[0]-Math.abs(l[0]),ey=h[1]-Math.abs(l[1]),ez=h[2]-Math.abs(l[2]);   /* centre inside: leave by the nearest face */
      if(ey<=ex&&ey<=ez){nl=[0,l[1]>=0?1:-1,0];depth=r+ey;}else if(ex<=ez){nl=[l[0]>=0?1:-1,0,0];depth=r+ex;}else{nl=[0,0,l[2]>=0?1:-1];depth=r+ez;}}
    const nw=mv(s.R,nl),pw=mv(s.R,[cx,cy,cz]);out[0]=nw[0];out[1]=nw[1];out[2]=nw[2];out[3]=depth;out[4]=pw[0]+s.p[0];out[5]=pw[1]+s.p[1];out[6]=pw[2]+s.p[2];return out;}
  function collect(){CT=[];const bs=W.bodies,tmp=[0,0,0,0,0,0,0];
    for(const b of bs){b.contacts=0;if(b.state==='dyn'&&!b.lost)worldSpheres(b);}
    for(let i=0;i<bs.length;i++){const a=bs[i];if(a.state!=='dyn'||a.lost)continue;
      if(!a.asleep||a.hold){
        /* ground */
        for(let k=0;k<a.S.length;k++){const c=a.C[k],g=W.ground(c[0],c[2]);if(c[1]-g>=a.r+.4)continue;
          const n=groundN(c[0],c[2]),dep=a.r-(c[1]-g)*n[1];if(dep>0)addContact(a,null,[c[0]-n[0]*a.r,c[1]-n[1]*a.r,c[2]-n[2]*a.r],n,dep,.62);}
        /* static boxes (posts, deck, fitted planks) */
        if(!a.hold)for(const s of W.statics){if(!s.on)continue;   /* a part in a hand passes through the jetty frame (a hand does not snag on a post) */
const dx=a.p[0]-s.p[0],dy=a.p[1]-s.p[1],dz=a.p[2]-s.p[2],rr=s.rad+a.rad+.1;if(dx*dx+dy*dy+dz*dz>rr*rr)continue;
          for(let k=0;k<a.S.length;k++){const o=sphereBox(a.C[k],a.r,s,tmp);if(o)addContact(a,null,[o[4],o[5],o[6]],[o[0],o[1],o[2]],o[3],.5,s);}}}
      /* other loose parts: a sleeper is an immovable wall unless the other part is moving, which wakes it */
      for(let j=i+1;j<bs.length;j++){const b=bs[j];if(b.lost||b.state!=='dyn')continue;if(a.asleep&&b.asleep&&!a.hold&&!b.hold)continue;
        const dx=a.p[0]-b.p[0],dy=a.p[1]-b.p[1],dz=a.p[2]-b.p[2],rr=a.rad+b.rad+.05;if(dx*dx+dy*dy+dz*dz>rr*rr)continue;
        let x=a,y=b;if(x.asleep&&!y.asleep){x=b;y=a;}   /* x is the awake one */
        const wakeY=y.asleep&&Math.hypot(x.v[0],x.v[1],x.v[2])>.12;
        for(let k=0;k<x.S.length;k++){const ca=x.C[k];for(let l=0;l<y.S.length;l++){const cb=y.C[l],ex=ca[0]-cb[0],ey=ca[1]-cb[1],ez=ca[2]-cb[2],R=x.r+y.r,d2=ex*ex+ey*ey+ez*ez;
          if(d2>=R*R)continue;const d=Math.sqrt(d2);const n=d<1e-6?[0,1,0]:[ex/d,ey/d,ez/d];addContact(x,y.asleep&&!wakeY?null:y,[cb[0]+n[0]*y.r,cb[1]+n[1]*y.r,cb[2]+n[2]*y.r],n,R-d,.5);}}
        if(wakeY)wake(y);}}
  }
  function wake(b){b.asleep=false;b.still=0;}
  function solve(h){const n=CT.length;if(!n)return;
    for(const b of W.bodies)if(b.state==='dyn')b.Iw=invIw(b);
    const bias=c=>Math.min(1.6,.22*Math.max(0,c.depth-.004)/h);
    for(const c of CT){const a=c.a,b=c.b,N=c.n;let k=a.invM;const ra=c.ra,ia=mv(a.Iw,cross(ra,N)),ka=cross(ia,ra);k+=dot(ka,N);
      if(b){const ib=mv(b.Iw,cross(c.rb,N)),kb=cross(ib,c.rb);k+=b.invM+dot(kb,N);}c.m=1/k;c.bias=bias(c);
      const vr=relv(c);c.e=vr<-1.2?.18:0;c.vn0=vr;}
    for(let it=0;it<ITER;it++){for(const c of CT){const a=c.a,b=c.b,N=c.n;
      const vn=relv(c),dj=c.m*(-(vn*(1+c.e))+c.bias-(c.e?0:0));let nj=Math.max(0,c.jn+dj);const d=nj-c.jn;c.jn=nj;if(d)applyImp(c,[N[0]*d,N[1]*d,N[2]*d]);
      /* friction along the sliding direction */
      const va=pv(a,c.ra),vb=b?pv(b,c.rb):[0,0,0],vr=[va[0]-vb[0],va[1]-vb[1],va[2]-vb[2]],vnn=dot(vr,N),tv=[vr[0]-N[0]*vnn,vr[1]-N[1]*vnn,vr[2]-N[2]*vnn],tl=Math.hypot(tv[0],tv[1],tv[2]);
      if(tl>1e-5){const T=[tv[0]/tl,tv[1]/tl,tv[2]/tl];let k=a.invM+dot(cross(mv(a.Iw,cross(c.ra,T)),c.ra),T);if(b)k+=b.invM+dot(cross(mv(b.Iw,cross(c.rb,T)),c.rb),T);
        let jt=-tl/k;const lim=c.mu*c.jn,nt=Math.max(-lim,Math.min(lim,c.jt+jt));jt=nt-c.jt;c.jt=nt;applyImp(c,[T[0]*jt,T[1]*jt,T[2]*jt]);}}}}
  function pv(b,r){return[b.v[0]+b.w[1]*r[2]-b.w[2]*r[1],b.v[1]+b.w[2]*r[0]-b.w[0]*r[2],b.v[2]+b.w[0]*r[1]-b.w[1]*r[0]];}
  function relv(c){const va=pv(c.a,c.ra),vb=c.b?pv(c.b,c.rb):[0,0,0];return(va[0]-vb[0])*c.n[0]+(va[1]-vb[1])*c.n[1]+(va[2]-vb[2])*c.n[2];}
  function applyImp(c,J){const a=c.a,b=c.b;a.v[0]+=J[0]*a.invM;a.v[1]+=J[1]*a.invM;a.v[2]+=J[2]*a.invM;let t=mv(a.Iw,cross(c.ra,J));a.w[0]+=t[0];a.w[1]+=t[1];a.w[2]+=t[2];
    if(b){b.v[0]-=J[0]*b.invM;b.v[1]-=J[1]*b.invM;b.v[2]-=J[2]*b.invM;t=mv(b.Iw,cross(c.rb,J));b.w[0]-=t[0];b.w[1]-=t[1];b.w[2]-=t[2];}}
  /* ---- water: buoyancy, drag in water, current ---- */
  function waterForces(b,h){b.sub=0;if(!W.water)return;const tt=W.t,r=b.r,n=b.S.length,Vn=b.vol/n,Fb=RHO_W*G*Vn;let sub=0;
    let fx=0,fy=0,fz=0,tx=0,ty=0,tz=0;let ux=0,uz=0;
    for(let k=0;k<n;k++){const c=b.C[k],wl=W.water(c[0],c[2],tt);if(wl===null||wl===undefined)continue;const f=Math.max(0,Math.min(1,(wl-(c[1]-r))/(2*r)));if(f<=0)continue;sub+=f;
      const F=Fb*f,rx=c[0]-b.p[0],ry=c[1]-b.p[1],rz=c[2]-b.p[2];fy+=F;tx+=-rz*F;tz+=rx*F;}
    b.sub=sub/n;if(sub<=0)return;
    if(W.current){const u=W.current(b.p[0],b.p[2],tt);ux=u[0];uz=u[1];}
    const s=b.sub,k=h;
    /* weight is applied by the caller; here the lift, then a pull toward the water's own velocity and damping that grows with how much of the part is wet */
    const I=b.invM;b.v[1]+=fy*I*k;
    const Ia=invIw(b);const dw=mv(Ia,[tx,ty,tz]);b.w[0]+=dw[0]*k;b.w[1]+=dw[1]*k;b.w[2]+=dw[2]*k;
    const kd=Math.min(1,(2.4+3*s)*s*k);b.v[0]+=(ux-b.v[0])*kd;b.v[2]+=(uz-b.v[2])*kd;b.v[1]-=b.v[1]*Math.min(1,3.5*s*k);
    const ka=Math.min(1,4.5*s*k);b.w[0]-=b.w[0]*ka;b.w[1]-=b.w[1]*ka;b.w[2]-=b.w[2]*ka;}
  /* ---- the hold spring of a hand ---- */
  function holdForce(b,h){const H=b.hold;if(!H)return false;
    const tx=H.p[0]-b.p[0],ty=H.p[1]-b.p[1],tz=H.p[2]-b.p[2],tau=.09;let vx=tx/tau,vy=ty/tau,vz=tz/tau;const l=Math.hypot(vx,vy,vz),mx=9;if(l>mx){vx*=mx/l;vy*=mx/l;vz*=mx/l;}
    const a=1-Math.exp(-h/.035);b.v[0]+=(vx-b.v[0])*a;b.v[1]+=(vy-b.v[1])*a;b.v[2]+=(vz-b.v[2])*a;
    if(H.q){   /* rotate toward the carried pose, taking the shorter way */
      let d=qmul(H.q,[-b.q[0],-b.q[1],-b.q[2],b.q[3]]);if(d[3]<0)d=[-d[0],-d[1],-d[2],-d[3]];const ang=2*Math.acos(Math.min(1,d[3])),sn=Math.sqrt(Math.max(1e-12,1-d[3]*d[3]));
      const ax=[d[0]/sn,d[1]/sn,d[2]/sn],wv=Math.min(12,ang/.14);b.w[0]+=(ax[0]*wv-b.w[0])*a;b.w[1]+=(ax[1]*wv-b.w[1])*a;b.w[2]+=(ax[2]*wv-b.w[2])*a;}
    else{b.w[0]*=1-a*.5;b.w[1]*=1-a*.5;b.w[2]*=1-a*.5;}
    return true;}
  /* ---- one fixed step ---- */
  function step(){const h=STEP,t0=typeof performance!=='undefined'?performance.now():0;
    for(const b of W.bodies){if(b.lost)continue;
      if(b.state==='fit'){fitStep(b,h);continue;}
      if(b.state!=='dyn')continue;
      if(b.asleep&&!b.hold)continue;
      b.R=qmat(b.q);worldSpheres(b);b.rad=Math.hypot(b.half[0],b.half[1],b.half[2])+b.r;
      const held=holdForce(b,h);
      if(!held){b.v[1]-=G*h;}
      waterForces(b,h);
      const sp=Math.hypot(b.v[0],b.v[1],b.v[2]);if(sp>MAX_SPEED){const k=MAX_SPEED/sp;b.v[0]*=k;b.v[1]*=k;b.v[2]*=k;}
      b.rad=Math.hypot(b.half[0],b.half[1],b.half[2])+b.r;}
    collect();solve(h);
    let awake=0;
    for(const b of W.bodies){if(b.lost||b.state!=='dyn')continue;
      if(b.asleep&&!b.hold)continue;
      b.p[0]+=b.v[0]*h;b.p[1]+=b.v[1]*h;b.p[2]+=b.v[2]*h;
      const wq=[b.w[0],b.w[1],b.w[2],0],dq=qmul(wq,b.q);b.q[0]+=.5*h*dq[0];b.q[1]+=.5*h*dq[1];b.q[2]+=.5*h*dq[2];b.q[3]+=.5*h*dq[3];qnorm(b.q);b.R=qmat(b.q);
      /* a little damping, sleeping */
      const dmp=1-.25*h;b.v[0]*=dmp;b.v[1]*=dmp;b.v[2]*=dmp;const sv0=Math.hypot(b.v[0],b.v[1],b.v[2]),ad=Math.exp(-(.9+(b.contacts>0?(b.kind==='post'?(sv0<.3?90:26):3.2):0))*h);   /* a log on sand does not roll for ever: spin dies faster while it touches something */
      b.w[0]*=ad;b.w[1]*=ad;b.w[2]*=ad;
      const sv=Math.hypot(b.v[0],b.v[1],b.v[2]),sw=Math.hypot(b.w[0],b.w[1],b.w[2]);
      if(!b.hold&&sv<SLEEP_V&&sw<SLEEP_W+(b.kind==='post'?.4:0)&&b.sub<.02&&b.contacts>0){b.still+=h;if(b.still>SLEEP_T){b.asleep=true;b.v[0]=b.v[1]=b.v[2]=0;b.w[0]=b.w[1]=b.w[2]=0;}}else b.still=0;
      if(!b.asleep)awake++;
      /* washed away: far from the site, or fallen out of the world */
      const dx=b.p[0]-W.origin[0],dz=b.p[2]-W.origin[1];if(dx*dx+dz*dz>W.lostR*W.lostR||b.p[1]<-30){b.lost=true;W.events.push({type:'lost',id:b.id,p:b.p.slice()});}}
    jointStep(h);
    W.t+=h;W.steps++;W.stats.contacts=CT.length;W.stats.awake=awake;
    if(t0)W.stats.ms+=performance.now()-t0;W.stats.steps++;}
  function advance(dt){W.acc+=dt;let n=0;const mx=opt.maxSteps||6;if(W.acc>STEP*mx*2)W.acc=STEP*mx*2;   /* a slow frame loses time rather than spiralling */
    while(W.acc>=STEP){W.acc-=STEP;step();n++;if(n>=mx){W.acc=Math.min(W.acc,STEP);break;}}return n;}
  /* ---- sockets: fitting, the soft click, joints ---- */
  function fitReport(b,s){const d=Math.hypot(b.p[0]-s.p[0],.45*(b.p[1]-s.p[1]),b.p[2]-s.p[2]);   /* height counts for less: a part held a hand's breadth above the slot is a fit, it would fall into place */
    let ang=9;const sym=s.kind==='post'?SYM_POST:SYM_PLANK;
    for(const y of sym){ang=Math.min(ang,qangle(b.q,qmul(s.q,y)));}return{d,ang};}
  /* test a part against sockets: ok when a free socket of its kind is within the snap radius and angle; otherwise says why (the nearest socket's trouble) */
  function testFit(id,only){const b=typeof id==='object'?id:bodyById(id);if(!b)return{ok:false,reason:'none'};let good=null,why='far',near=1e9,nearS=null;
    for(const s of W.sockets){if(only&&s.id!==only)continue;const r=fitReport(b,s);
      if(r.d<near){near=r.d;nearS=s;}
      if(s.kind!==b.kind){if(r.d<s.snapR)why='kind';continue;}
      if(s.filled){if(r.d<s.snapR)why='filled';continue;}
      if(r.d>s.snapR)continue;
      if(r.ang>s.snapAng){why='angle';continue;}
      if(!good||r.d<good.d)good={ok:true,socket:s,d:r.d,ang:r.ang};}
    return good||{ok:false,reason:why,d:near,socket:nearS};}
  /* start the fit: the part eases to the slot with a small overshoot (the click), then holds */
  function beginFit(b,s){b.state='fit';b.hold=null;b.sock=s;s.filled=b;b.fitT=0;b.fitFrom={p:b.p.slice(),q:b.q.slice()};b.v=[0,0,0];b.w=[0,0,0];b.asleep=false;s.load=0;s.dmg=0;s.peak=0;}
  function fit(id,only){const r=testFit(id,only);if(!r.ok)return r;const b=typeof id==='object'?id:bodyById(id);beginFit(b,r.socket);return r;}
  /* force a part into a socket (tap to place): the kind and the free state still count, the pose does not */
  function place(id,sockId,reach){const b=typeof id==='object'?id:bodyById(id),s=socketById(sockId);if(!b||!s)return{ok:false,reason:'none'};
    if(s.kind!==b.kind)return{ok:false,reason:'kind',socket:s};if(s.filled)return{ok:false,reason:'filled',socket:s};
    const d=Math.hypot(b.p[0]-s.p[0],b.p[1]-s.p[1],b.p[2]-s.p[2]);if(reach&&d>reach)return{ok:false,reason:'far',socket:s,d};
    beginFit(b,s);return{ok:true,socket:s,d};}
  function fitStep(b,h){const s=b.sock;b.fitT+=h;const T=.22,u=Math.min(1,b.fitT/T);
    /* ease out with a small overshoot, then a tiny settle: the soft click */
    const e=1-Math.pow(1-u,3),over=Math.sin(u*Math.PI)*.018*(1-u);const ff=b.fitFrom;
    b.p[0]=ff.p[0]+(s.p[0]-ff.p[0])*e;b.p[1]=ff.p[1]+(s.p[1]-ff.p[1])*e-over;b.p[2]=ff.p[2]+(s.p[2]-ff.p[2])*e;
    const sym=s.kind==='post'?SYM_POST:SYM_PLANK;let bestq=s.q,ba=9;for(const y of sym){const q=qmul(s.q,y),a=qangle(ff.q,q);if(a<ba){ba=a;bestq=q;}}
    b.q=slerp(ff.q,bestq,e);b.R=qmat(b.q);
    if(u>=1){b.state='fitted';b.p=s.p.slice();b.q=bestq.slice();b.R=qmat(b.q);const st=addStatic({p:s.p,q:bestq,h:[b.half[0]+.012,b.half[1]+.012,b.half[2]],name:'fitted:'+s.id,body:b});b.stat=st;
      W.events.push({type:'fit',id:b.id,socket:s.id,p:s.p.slice(),kind:b.kind});}}
  function slerp(a,b,t){let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];let bb=b;if(d<0){d=-d;bb=[-b[0],-b[1],-b[2],-b[3]];}
    if(d>.9995)return qnorm([a[0]+(bb[0]-a[0])*t,a[1]+(bb[1]-a[1])*t,a[2]+(bb[2]-a[2])*t,a[3]+(bb[3]-a[3])*t]);
    const th=Math.acos(d),s=Math.sin(th),w1=Math.sin((1-t)*th)/s,w2=Math.sin(t*th)/s;return[a[0]*w1+bb[0]*w2,a[1]*w1+bb[1]*w2,a[2]*w1+bb[2]*w2,a[3]*w1+bb[3]*w2];}
  /* the load on a fitted part from the water: uplift under the slab (pressure on the underside), slam and drag. Newtons, upward positive. */
  function surgeLoad(s,b){if(!W.water)return 0;const wl=W.water(s.p[0],s.p[2],W.t);if(wl===null||wl===undefined)return 0;
    const bottom=s.p[1]-b.half[1],d=wl-bottom;if(d<=0)return 0;const area=b.half[0]*2*b.half[2]*2;
    const up=RHO_W*G*area*Math.min(d,.6)-b.mass*G;let ux=0,uz=0;if(W.current){const u=W.current(s.p[0],s.p[2],W.t);ux=u[0];uz=u[1];}
    const drag=.5*RHO_W*1.1*(ux*ux+uz*uz)*Math.min(d,b.half[1]*2)*b.half[2]*2;return Math.max(0,up)+drag;}
  /* a joint carries a load: it breaks at once above its strength (times this part's health) and wears when the load is over half of it */
  function applyLoad(sockId,F,dt){const s=socketById(sockId);if(!s||!s.filled||s.filled.state!=='fitted')return false;const b=s.filled,lim=s.joint.strength*b.health;
    s.load=F;if(F>s.peak)s.peak=F;
    if(F>lim){breakJoint(s,'overload');return true;}
    if(F>.5*lim){s.dmg+=Math.pow(F/lim,3)*dt*.35;if(s.dmg>=1){breakJoint(s,'fatigue');return true;}}else s.dmg=Math.max(0,s.dmg-dt*.02);
    return false;}
  function jointStep(h){if(!W.water)return;for(const s of W.sockets){const b=s.filled;if(!b||b.state!=='fitted')continue;applyLoad(s.id,surgeLoad(s,b),h);}}
  function breakJoint(s,why){const b=s.filled;if(!b)return;s.filled=null;s.hits++;if(b.stat){b.stat.on=false;const i=W.statics.indexOf(b.stat);if(i>=0)W.statics.splice(i,1);b.stat=null;}
    b.state='dyn';b.sock=null;b.asleep=false;b.still=0;let ux=0,uz=0;if(W.current){const u=W.current(b.p[0],b.p[2],W.t);ux=u[0];uz=u[1];}
    b.v=[ux*.6+(W.rng()-.5)*.6,.9+W.rng()*.6,uz*.6+(W.rng()-.5)*.6];b.w=[(W.rng()-.5)*2.5,(W.rng()-.5)*3,(W.rng()-.5)*2.5];
    W.events.push({type:'break',id:b.id,socket:s.id,why,p:b.p.slice()});}
  /* ---- hand ---- */
  function holdBody(id,p,q){const b=bodyById(id);if(!b||b.state!=='dyn'||b.lost)return false;if(!b.hold){b.hold={p:p.slice(),q:q?q.slice():null};}else{b.hold.p=p.slice();b.hold.q=q?q.slice():null;}wake(b);return true;}
  function release(id){const b=bodyById(id);if(!b)return;b.hold=null;wake(b);}
  /* ---- picking: a ray against a fattened box of each loose part (slab test) ---- */
  function raycast(o,d,pad){pad=pad===undefined?.1:pad;let best=null;
    for(const b of W.bodies){if(b.lost||b.state!=='dyn')continue;const R=b.R,oo=[o[0]-b.p[0],o[1]-b.p[1],o[2]-b.p[2]],lo=mtv(R,oo),ld=mtv(R,d);let t0=0,t1=1e9;
      for(let a=0;a<3;a++){const hh=b.half[a]+pad;if(Math.abs(ld[a])<1e-9){if(Math.abs(lo[a])>hh){t1=-1;break;}}else{let ta=(-hh-lo[a])/ld[a],tb=(hh-lo[a])/ld[a];if(ta>tb){const x=ta;ta=tb;tb=x;}if(ta>t0)t0=ta;if(tb<t1)t1=tb;if(t0>t1)break;}}
      if(t1>=t0&&t1>0&&(!best||t0<best.t))best={id:b.id,t:t0,body:b};}
    return best;}
  /* ---- state: hash and snapshot ---- */
  function hash(){let h=2166136261>>>0;const mix=v=>{v=Math.round(v*1000)|0;for(let k=0;k<4;k++){h^=(v>>>(8*k))&255;h=Math.imul(h,16777619)>>>0;}};
    for(const b of W.bodies){mix(b.p[0]);mix(b.p[1]);mix(b.p[2]);mix(b.q[0]*1000);mix(b.q[1]*1000);mix(b.q[2]*1000);mix(b.q[3]*1000);mix(b.state==='fitted'?1:b.asleep?2:0);}
    return('00000000'+h.toString(16)).slice(-8);}
  function count(){let fitted=0;for(const s of W.sockets)if(s.filled&&s.filled.state==='fitted')fitted++;return{fitted,total:W.sockets.length};}
  Object.assign(W,{contactsOf:id=>CT.filter(c=>c.a.id===id||(c.b&&c.b.id===id)).map(c=>({n:c.n.map(x=>+x.toFixed(2)),depth:+c.depth.toFixed(3),b:c.b?c.b.id:0,jn:+c.jn.toFixed(3),pt:c.pt.map(x=>+x.toFixed(2)),st:c.tag?[c.tag.name,c.tag.p.map(x=>+x.toFixed(2)),c.tag.h]:null})),addBody,addStatic,addSocket,bodyById,socketById,step,advance,testFit,fit,place,holdBody,release,raycast,applyLoad,surgeLoad,hash,count,wake,groundN,fitReport,breakJoint});
  return W;}
return{create,heightGrid,STEP,G,RHO_W,qyaw,qaxis,qmul,qangle,qmat,SYM_PLANK,SYM_POST,mulberry32};
});
