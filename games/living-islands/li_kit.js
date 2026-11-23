/* Living Islands: the shared construction kit of islands_look.html (PB polygon builder, icosphere blobs, conifer, broadleaf, shrub, grass tuft).
   Moved here VERBATIM from islands_look.html so that cutaway.html (?finish=1, see CUTAWAY_FINISH.md) builds its trees and rocks from the SAME functions.
   Classic script: sets window.LI_KIT. Needs THREE r128 at load time (the icosphere). The page keeps its own copies of the small numeric helpers it uses elsewhere. */
(function () {
'use strict';
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash2(ix,iz,s){let h=Math.imul(ix|0,374761393)+Math.imul(iz|0,668265263)+Math.imul(s|0,1442695041)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296;}
function fade(t){return t*t*t*(t*(t*6-15)+10);}
function vnoise(x,z,s){const ix=Math.floor(x),iz=Math.floor(z),fx=fade(x-ix),fz=fade(z-iz);
  const a=hash2(ix,iz,s),b=hash2(ix+1,iz,s),c=hash2(ix,iz+1,s),d=hash2(ix+1,iz+1,s);
  return a+(b-a)*fx+(c-a)*fz+(a-b-c+d)*fx*fz;}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
let LAND=false;   /* the landing pass tints heather and lichen differently: the page sets it once (LI_KIT.setLand) */
function setLand(v){LAND=!!v;}
function lin(c){return[Math.pow(c[0],2.2),Math.pow(c[1],2.2),Math.pow(c[2],2.2)];}
function mix3(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
function norm3(x,y,z){const l=Math.hypot(x,y,z)||1;return[x/l,y/l,z/l];}
class PB{constructor(){this.p=[];this.n=[];this.c=[];}
  v(p,n,c){this.p.push(p[0],p[1],p[2]);this.n.push(n[0],n[1],n[2]);this.c.push(c[0],c[1],c[2]);}
  tri(a,b,c,na,nb,nc,ca,cb,cc){this.v(a,na,ca);this.v(b,nb,cb);this.v(c,nc,cc);}
  flat(a,b,c,col,col2,col3){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
    let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;const n=[nx/l,ny/l,nz/l];
    this.tri(a,b,c,n,n,n,col,col2||col,col3||col);}
  quad(a,b,c,d,col){this.flat(a,b,c,col);this.flat(a,c,d,col);}
  box(cx,cy,cz,w,h,d,yaw,col,pitch){ /* centre-based box rotated by yaw (and optional pitch about x) */
    const hw=w/2,hh=h/2,hd=d/2,cs=Math.cos(yaw),sn=Math.sin(yaw),cp=Math.cos(pitch||0),sp=Math.sin(pitch||0);
    const T=(x,y,z)=>{const y2=y*cp-z*sp,z2=y*sp+z*cp;return[cx+x*cs+z2*sn,cy+y2,cz-x*sn+z2*cs];};
    const P=[T(-hw,-hh,-hd),T(hw,-hh,-hd),T(hw,hh,-hd),T(-hw,hh,-hd),T(-hw,-hh,hd),T(hw,-hh,hd),T(hw,hh,hd),T(-hw,hh,hd)];
    const top=col,side=[col[0]*.86,col[1]*.86,col[2]*.86],bot=[col[0]*.55,col[1]*.55,col[2]*.55];
    this.quad(P[4],P[5],P[6],P[7],side);this.quad(P[1],P[0],P[3],P[2],side);this.quad(P[0],P[4],P[7],P[3],side);
    this.quad(P[5],P[1],P[2],P[6],side);this.quad(P[3],P[7],P[6],P[2],top);this.quad(P[0],P[1],P[5],P[4],bot);}
  build(){const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));
    g.computeBoundingSphere();return g;}
  get tris(){return this.p.length/9;}}
const ICO=(function(){return new THREE.IcosahedronGeometry(1,1).attributes.position.array;})();
function blob(pb,cx,cy,cz,sx,sy,sz,yaw,seed,colFn,rough,facet){
  const cs=Math.cos(yaw),sn=Math.sin(yaw);
  const L=[];for(let i=0;i<ICO.length;i+=3){const x=ICO[i],y=ICO[i+1],z=ICO[i+2];
    const d=1+rough*((vnoise(x*2.1+y*1.3+seed*.01,z*2.3+y*1.7,seed|0)-.5)*2);
    L.push([x*d,y*d,z*d,x,y,z]);}
  for(let i=0;i<L.length;i+=3){const P=[],N=[];
    for(let k=0;k<3;k++){const q=L[i+k];const lx=q[0]*sx,ly=q[1]*sy,lz=q[2]*sz;
      P.push([cx+lx*cs+lz*sn,cy+ly,cz-lx*sn+lz*cs]);
      let nx=q[3]/sx,ny=q[4]/sy,nz=q[5]/sz;const l=Math.hypot(nx,ny,nz);nx/=l;ny/=l;nz/=l;N.push([nx*cs+nz*sn,ny,-nx*sn+nz*cs]);}
    if(facet){const a=P[0],b=P[1],c=P[2];let ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
      let fx=uy*vz-uz*vy,fy=uz*vx-ux*vz,fz=ux*vy-uy*vx;const fl=Math.hypot(fx,fy,fz)||1;fx/=fl;fy/=fl;fz/=fl;
      const cxm=(a[0]+b[0]+c[0])/3-cx,cym=(a[1]+b[1]+c[1])/3-cy,czm=(a[2]+b[2]+c[2])/3-cz;if(fx*cxm+fy*cym+fz*czm<0){fx=-fx;fy=-fy;fz=-fz;}
      for(let k=0;k<3;k++){let nx=N[k][0]*(1-facet)+fx*facet,ny=N[k][1]*(1-facet)+fy*facet,nz=N[k][2]*(1-facet)+fz*facet;const l=Math.hypot(nx,ny,nz)||1;N[k]=[nx/l,ny/l,nz/l];}}
    pb.tri(P[0],P[1],P[2],N[0],N[1],N[2],colFn(P[0],N[0],L[i]),colFn(P[1],N[1],L[i+1]),colFn(P[2],N[2],L[i+2]));}
}
function addConifer(pb,t,R){const x=t.x,y=t.y-.15,z=t.z,h=t.h;const tiers=h>4.6?6:5;const S=8,rb=h*(.25+.05*hash2(t.s*1e5|0,1,2));
  const off=R()*6.28;const tone=.82+R()*.36,bl=R();
  const dk=lin([.07*tone,.17*tone+.02*bl,.10*tone]),md=lin([.12*tone,.24*tone,.13*tone]),lt=lin([.22*tone,.34*tone,.16*tone]);
  const trunk=lin([.24,.15,.09]);pb.box(x,y+h*.09,z,.34,h*.18,.34,off,trunk);
  const lean=(R()-.5)*.25;
  for(let i=0;i<tiers;i++){const f=i/tiers;const yb=y+h*(.1+.66*f),ch=h*(.30+.05*(1-f)),ytip=yb+ch,rr=rb*Math.pow(1-f*.86,.95)*(.9+.2*R());
    const cxo=x+lean*f*h,czo=z+lean*f*h*.5;
    const A=[],Rd=[];for(let k=0;k<S;k++){A.push(off+i*.7+(k/S)*6.2832+(R()-.5)*.35);Rd.push(rr*(.78+.44*R()));}
    for(let k=0;k<S;k++){const k2=(k+1)%S;const a=A[k],b=k2===0?A[0]+6.2832:A[k2];
      const dr0=(R()-.5)*.14*rr;
      const P0=[cxo+Math.cos(a)*Rd[k],yb-rr*.22+(k%2?-rr*.1:0),czo+Math.sin(a)*Rd[k]],P1=[cxo+Math.cos(b)*Rd[k2],yb-rr*.22+(k2%2?-rr*.1:0),czo+Math.sin(b)*Rd[k2]];
      const M0=[cxo+Math.cos(a)*Rd[k]*.52,yb+ch*.5,czo+Math.sin(a)*Rd[k]*.52],M1=[cxo+Math.cos(b)*Rd[k2]*.52,yb+ch*.5,czo+Math.sin(b)*Rd[k2]*.52],T=[cxo,ytip,czo];
      const nl0=norm3(Math.cos(a)*.9,.55,Math.sin(a)*.9),nl1=norm3(Math.cos(b)*.9,.55,Math.sin(b)*.9),nu=norm3(Math.cos((a+b)/2)*.6,1,Math.sin((a+b)/2)*.6);
      const cB=dk.map(v=>v*(.6+.5*f)),cM=mix3(md,lt,f*.5),cT=mix3(lt,[lt[0]*1.2,lt[1]*1.2,lt[2]*1.1],.5);
      pb.tri(P0,P1,M1,nl0,nl1,nl1,cB,cB,cM);pb.tri(P0,M1,M0,nl0,nl1,nl0,cB,cM,cM);
      pb.tri(M0,M1,T,nl0,nl1,nu,cM,cM,cT);}}
}
function addBroad(pb,t,R){const x=t.x,y=t.y-.1,z=t.z,h=t.h;const tone=.85+R()*.3,hue=R();
  const c1=lin([.20*tone+hue*.07,.28*tone,.12*tone]),c2=lin([.40*tone+hue*.1,.42*tone,.19*tone]);
  pb.box(x,y+h*.2,z,.42,h*.4,.42,R()*3,lin([.3,.22,.15]));
  const n=3;for(let i=0;i<n;i++){const a=i/n*6.28+R(),d=h*.14*(i?1:0),cr=h*(.3+.06*R());
    blob(pb,x+Math.cos(a)*d,y+h*(.6+.12*i%.3)+(i?0:h*.08),z+Math.sin(a)*d,cr,cr*.85,cr,R()*6,(R()*1e5)|0,(p,nn)=>{const f=clamp((p[1]-y-h*.4)/(h*.6),0,1);return mix3(c1,c2,f*.9+.1*nn[1]);},.2,0);}}
function addTuft(pb,t,R){const col=t.col?lin(t.col):lin([.64+R()*.1,.57,.34]),dk=col.map(v=>v*.55);const n=5+((R()*3)|0);const ts=t.col?.62:1;
  for(let k=0;k<n;k++){const a=R()*6.28,l=(.35+R()*.45)*ts,lx=Math.cos(a)*.12,lz=Math.sin(a)*.12,bw=.05;const lean=.2+R()*.3;
    const b0=[t.x+lx-Math.sin(a)*bw,t.y,t.z+lz+Math.cos(a)*bw],b1=[t.x+lx+Math.sin(a)*bw,t.y,t.z+lz-Math.cos(a)*bw],tp=[t.x+lx+Math.cos(a)*lean,t.y+l,t.z+lz+Math.sin(a)*lean];
    pb.tri(b0,b1,tp,[0,1,0],[0,1,0],[0,1,0],dk,dk,col);}}
function addShrub(pb,t,R,heather){const col=heather?(LAND?lin([.38+R()*.06,.27,.37]):lin([.48+R()*.1,.25,.48])):lin([.27+R()*.1,.33,.15]);const dk=col.map(v=>v*.55);
  blob(pb,t.x,t.y+t.h*.12,t.z,t.h*.42,t.h*.26,t.h*.4,R()*6,(R()*1e5)|0,(p,n)=>mix3(dk,col,clamp(.35+n[1]*.8,0,1)),.25,0);}
window.LI_KIT = { setLand, PB, ICO, blob, addConifer, addBroad, addTuft, addShrub, mulberry32, hash2, vnoise, lin, mix3, norm3, clamp };
})();
