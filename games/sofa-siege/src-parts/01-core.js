/* Sofa siege model library. Plain script, one global: SS. Needs three.js r128.
   Everything is built from primitives and canvas textures. No outside assets.
   Units: a mouse is about 0.3 tall. Models face +z. Origin is at the base centre.

   SS.mouse(team, opts)            a mouse soldier; teams 'blue', 'red', 'green'
   SS.pose(mouse, name, t)         'idle','walk','carry','hammer','aim','cheer','dizzy'
   SS.piece(kind, team, opts)      a kit piece, see SS.PIECES
   SS.parts(piece)                 the separately named, knock-off-able parts of a piece
   SS.solid(piece, on)             on: draw the piece as one merged mesh (cheap);
                                   off: draw every part as its own mesh (for knocking parts off)
   SS.lobberPose(lobber, pull, recoil)
   SS.hill(opts), SS.setHill(hill, blueShare)
   SS.wave(obj, t)                 waves the cloth of a flag piece or the hill
   SS.fx.dust/dustStep/stars/arc/setArc/cork/marble
   SS.count(obj)                   {tris, meshes} of what is visible */
var SS=(function(){
'use strict';
var SS={},PI=Math.PI;
SS.TEAMS=['blue','red','green'];
SS.PIECES=['wall','gate','tower','popgun','lobber','tent','workshop','flag','planks','rope','crate','barrel'];
SS.POSES=['idle','walk','carry','hammer','aim','cheer','dizzy'];

function rng(seed){var s=(seed|0)%2147483647;if(s<=0)s+=2147483646;return function(){s=(s*16807)%2147483647;return (s-1)/2147483646;};}
function hash(str){var h=7;for(var i=0;i<str.length;i++)h=(h*31+str.charCodeAt(i))%2147483647;return h||1;}
function sstep(k){k=k<0?0:(k>1?1:k);return k*k*(3-2*k);}

/* ---------- textures: one 512 atlas of four 256 tiles, shared by everything ---------- */
function makeAtlas(){
  var c=document.createElement('canvas');c.width=c.height=512;var g=c.getContext('2d'),r=rng(41),i,j,x,y;
  function tile(px,py,fn){g.save();g.beginPath();g.rect(px,py,256,256);g.clip();g.translate(px,py);fn();g.restore();}
  /* wood: hand-brushed grain running up the tile */
  tile(0,0,function(){
    g.fillStyle='#efe6d8';g.fillRect(0,0,256,256);
    for(i=0;i<26;i++){g.fillStyle=r()<.5?'rgba(255,250,235,.35)':'rgba(150,105,60,.16)';g.fillRect(r()*256,0,6+r()*22,256);}
    for(i=0;i<120;i++){x=r()*256;y=r()*256;var len=30+r()*150;g.strokeStyle='rgba(96,58,26,'+(.08+r()*.22)+')';g.lineWidth=.6+r()*1.8;g.beginPath();g.moveTo(x,y);
      g.bezierCurveTo(x+(r()-.5)*7,y+len*.3,x+(r()-.5)*7,y+len*.7,x+(r()-.5)*5,y+len);g.stroke();}
    for(i=0;i<5;i++){x=20+r()*216;y=20+r()*216;for(j=3;j>0;j--){g.strokeStyle='rgba(88,52,24,'+(.14+.1*(3-j))+')';g.lineWidth=1.4;g.beginPath();g.ellipse(x,y,j*2.4,j*4.2,0,0,6.3);g.stroke();}
      g.fillStyle='rgba(70,40,18,.5)';g.beginPath();g.ellipse(x,y,1.6,2.6,0,0,6.3);g.fill();}
    for(i=0;i<500;i++){g.fillStyle='rgba(80,50,25,'+(r()*.12)+')';g.fillRect(r()*256,r()*256,1,2+r()*5);}
  });
  /* worn paint: brush strokes, chips down to dark wood, scratches */
  tile(256,0,function(){
    g.fillStyle='#f3efe8';g.fillRect(0,0,256,256);
    for(i=0;i<60;i++){g.fillStyle=r()<.5?'rgba(255,255,255,.3)':'rgba(120,110,100,.1)';g.fillRect(r()*256,r()*256-40,3+r()*10,60+r()*160);}
    for(i=0;i<46;i++){x=r()*256;y=r()*256;var n=3+((r()*5)|0);g.fillStyle='rgba(96,66,40,'+(.45+r()*.4)+')';g.beginPath();
      for(j=0;j<n*2;j++){var a=j/(n*2)*6.283,rr=(2+r()*7)*(1+r()*.8);g.lineTo(x+Math.cos(a)*rr*.7,y+Math.sin(a)*rr*1.5);}g.closePath();g.fill();
      g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=1;g.stroke();}
    for(i=0;i<8;i++){x=r()<.5?r()*14:242+r()*14;g.fillStyle='rgba(96,66,40,.55)';g.fillRect(x,r()*256,2+r()*7,10+r()*50);}
    for(i=0;i<50;i++){x=r()*256;y=r()*256;g.strokeStyle='rgba(70,50,35,'+(.15+r()*.3)+')';g.lineWidth=.7;g.beginPath();g.moveTo(x,y);g.lineTo(x+(r()-.5)*14,y+10+r()*40);g.stroke();}
  });
  /* rust: blotches, drips and speckles on tin */
  tile(0,256,function(){
    g.fillStyle='#ebe7e2';g.fillRect(0,0,256,256);
    for(i=0;i<70;i++){x=r()*256;y=r()*256;var rad=8+r()*34,gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,'rgba(178,84,26,'+(.3+r()*.45)+')');gr.addColorStop(.6,'rgba(190,110,40,.18)');gr.addColorStop(1,'rgba(190,110,40,0)');g.fillStyle=gr;g.fillRect(x-rad,y-rad,rad*2,rad*2);}
    for(i=0;i<24;i++){x=r()*256;y=r()*256;var gd=g.createLinearGradient(0,y,0,y+50+r()*60);gd.addColorStop(0,'rgba(140,62,20,.5)');gd.addColorStop(1,'rgba(140,62,20,0)');g.fillStyle=gd;g.fillRect(x,y,2+r()*4,110);}
    for(i=0;i<900;i++){g.fillStyle=r()<.7?'rgba(110,50,18,'+(r()*.45)+')':'rgba(255,255,255,'+(r()*.4)+')';g.fillRect(r()*256,r()*256,1+r()*2,1+r()*2);}
    for(i=0;i<14;i++){g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=.8;x=r()*256;y=r()*256;g.beginPath();g.moveTo(x,y);g.lineTo(x+(r()-.5)*60,y+(r()-.5)*20);g.stroke();}
  });
  /* cloth weave with a few slubs and stitches */
  tile(256,256,function(){
    g.fillStyle='#f2eee6';g.fillRect(0,0,256,256);
    for(i=0;i<256;i+=4){g.fillStyle='rgba(120,100,70,'+(.1+r()*.1)+')';g.fillRect(i,0,1.4,256);g.fillStyle='rgba(120,100,70,'+(.1+r()*.1)+')';g.fillRect(0,i,256,1.4);
      g.fillStyle='rgba(255,255,255,.3)';g.fillRect(i+2,0,1,256);}
    for(i=0;i<60;i++){g.fillStyle='rgba(110,90,60,'+(.1+r()*.16)+')';if(r()<.5)g.fillRect(r()*256,r()*256,10+r()*40,1.6);else g.fillRect(r()*256,r()*256,1.6,10+r()*40);}
    for(i=0;i<12;i++){x=r()*256;y=r()*256;var gr2=g.createRadialGradient(x,y,0,x,y,30);gr2.addColorStop(0,'rgba(140,110,70,.16)');gr2.addColorStop(1,'rgba(140,110,70,0)');g.fillStyle=gr2;g.fillRect(x-30,y-30,60,60);}
  });
  /* a pure white block for untextured parts */
  g.fillStyle='#ffffff';g.fillRect(256,0,24,24);
  var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t;
}
/* tile rects in uv space: [u0,v0,size] (canvas y is flipped) */
var TILE={wood:[0,.5],paint:[.5,.5],rust:[0,0],cloth:[.5,0]};
var PLAIN_UV=[(256+12)/512,1-12/512];

var _mat=null,_glow=null,_gloss=null;
function mat(){if(!_mat){SS.tex=makeAtlas();_mat=new THREE.MeshStandardMaterial({vertexColors:true,map:SS.tex,roughness:.84,metalness:0});SS.mat=_mat;}return _mat;}
function glow(){if(!_glow){_glow=new THREE.MeshBasicMaterial({vertexColors:true});SS.glow=_glow;}return _glow;}
function gloss(){if(!_gloss){_gloss=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.18,metalness:.05});SS.gloss=_gloss;}return _gloss;}

/* ---------- geometry builder: merges primitives into one buffer with vertex colours ---------- */
var _col={},_v=new THREE.Vector3(),_n=new THREE.Vector3(),_nm=new THREE.Matrix3(),_e=new THREE.Euler(),_q=new THREE.Quaternion(),_s=new THREE.Vector3(),_p=new THREE.Vector3();
function lin(hex){var c=_col[hex];if(!c){var k=new THREE.Color(hex).convertSRGBToLinear();c=_col[hex]=[k.r,k.g,k.b];}return c;}
function shade(hex,f){var r=(hex>>16)&255,g=(hex>>8)&255,b=hex&255;r=Math.max(0,Math.min(255,Math.round(r*f)));g=Math.max(0,Math.min(255,Math.round(g*f)));b=Math.max(0,Math.min(255,Math.round(b*f)));return (r<<16)|(g<<8)|b;}
function blend(a,b,k){var ar=(a>>16)&255,ag=(a>>8)&255,ab=a&255,br=(b>>16)&255,bg=(b>>8)&255,bb=b&255;return (Math.round(ar+(br-ar)*k)<<16)|(Math.round(ag+(bg-ag)*k)<<8)|Math.round(ab+(bb-ab)*k);}
function compose(pos,rot,scl){pos=pos||[0,0,0];rot=rot||[0,0,0];_p.set(pos[0],pos[1],pos[2]);_e.set(rot[0],rot[1],rot[2]);_q.setFromEuler(_e);
  if(scl==null)_s.set(1,1,1);else if(typeof scl==='number')_s.set(scl,scl,scl);else _s.set(scl[0],scl[1],scl[2]);return new THREE.Matrix4().compose(_p,_q,_s);}
function Bld(seed){this.P=[];this.N=[];this.U=[];this.C=[];this.M=[new THREE.Matrix4()];this.r=rng(seed||1);}
Bld.prototype.push=function(pos,rot,scl){this.M.push(this.M[this.M.length-1].clone().multiply(compose(pos,rot,scl)));return this;};
Bld.prototype.pop=function(){this.M.pop();return this;};
/* tile: 'wood','paint','rust','cloth' (add 'h' to turn the grain sideways) or falsy for plain */
Bld.prototype.add=function(geo,col,tile,pos,rot,scl,flat){
  var g=geo.index?geo.toNonIndexed():geo,m=this.M[this.M.length-1].clone().multiply(compose(pos,rot,scl));
  var pa=g.attributes.position,na=g.attributes.normal,ua=g.attributes.uv,c=lin(col),i,P=this.P,N=this.N,U=this.U,C=this.C,r=this.r;
  var turn=false,tl=null;if(tile){if(tile.charAt(tile.length-1)==='h'){turn=true;tile=tile.slice(0,-1);}tl=TILE[tile];}
  var f=.42,ou=0,ov=0;if(tl){ou=tl[0]+.03+r()*(.5-.06-f*.5);ov=tl[1]+.03+r()*(.5-.06-f*.5);if(tile==='paint'){ou=tl[0]+.06+r()*(.5-.09-f*.5);ov=tl[1]+.03+r()*(.5-.12-f*.5);}}
  _nm.getNormalMatrix(m);var start=P.length;
  for(i=0;i<pa.count;i++){
    _v.fromBufferAttribute(pa,i).applyMatrix4(m);P.push(_v.x,_v.y,_v.z);
    if(na){_n.fromBufferAttribute(na,i).applyMatrix3(_nm).normalize();N.push(_n.x,_n.y,_n.z);}else N.push(0,1,0);
    if(tl&&ua){var u=ua.getX(i),v=ua.getY(i);if(turn){var t=u;u=v;v=t;}u=u<0?0:(u>1?1:u);v=v<0?0:(v>1?1:v);U.push(ou+u*f*.5,ov+v*f*.5);}else U.push(PLAIN_UV[0],PLAIN_UV[1]);
    C.push(c[0],c[1],c[2]);
  }
  if(flat||!na){for(i=start;i<P.length;i+=9){var ax=P[i+3]-P[i],ay=P[i+4]-P[i+1],az=P[i+5]-P[i+2],bx=P[i+6]-P[i],by=P[i+7]-P[i+1],bz=P[i+8]-P[i+2];
    var nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,l=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;nx/=l;ny/=l;nz/=l;for(var k=0;k<9;k+=3){N[i+k]=nx;N[i+k+1]=ny;N[i+k+2]=nz;}}}
  return this;};
/* append an already built geometry, moved by an offset */
Bld.prototype.raw=function(geo,off){var p=geo.attributes.position.array,n=geo.attributes.normal.array,u=geo.attributes.uv.array,c=geo.attributes.color.array,i;off=off||[0,0,0];
  for(i=0;i<p.length;i+=3)this.P.push(p[i]+off[0],p[i+1]+off[1],p[i+2]+off[2]);for(i=0;i<n.length;i++)this.N.push(n[i]);for(i=0;i<u.length;i++)this.U.push(u[i]);for(i=0;i<c.length;i++)this.C.push(c[i]);return this;};
Bld.prototype.geo=function(centre){var g=new THREE.BufferGeometry(),P=this.P,c=[0,0,0],i;
  if(centre&&P.length){var lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(i=0;i<P.length;i++){var a=i%3;if(P[i]<lo[a])lo[a]=P[i];if(P[i]>hi[a])hi[a]=P[i];}
    c=[(lo[0]+hi[0])/2,(lo[1]+hi[1])/2,(lo[2]+hi[2])/2];for(i=0;i<P.length;i++)P[i]-=c[i%3];}
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.N,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(this.U,2));g.setAttribute('color',new THREE.Float32BufferAttribute(this.C,3));
  g.computeBoundingSphere();g.userData.centre=c;return g;};
function mesh(geo,m,shadow){var o=new THREE.Mesh(geo,m||mat());o.castShadow=shadow!==false;o.receiveShadow=true;return o;}
/* short builders */
Bld.prototype.box=function(w,h,d,col,tile,pos,rot,scl){return this.add(new THREE.BoxGeometry(w,h,d),col,tile,pos,rot,scl);};
Bld.prototype.cyl=function(rt,rb,h,n,col,tile,pos,rot,scl,flat){return this.add(new THREE.CylinderGeometry(rt,rb,h,n||10),col,tile,pos,rot,scl,flat);};
Bld.prototype.sph=function(r,w,h,col,tile,pos,rot,scl,flat){return this.add(new THREE.SphereGeometry(r,w||10,h||8),col,tile,pos,rot,scl,flat);};
Bld.prototype.dome=function(r,w,h,col,tile,pos,rot,scl){return this.add(new THREE.SphereGeometry(r,w||12,h||6,0,PI*2,0,PI/2),col,tile,pos,rot,scl);};
Bld.prototype.cone=function(r,h,n,col,tile,pos,rot,scl,flat){return this.add(new THREE.ConeGeometry(r,h,n||8),col,tile,pos,rot,scl,flat);};
Bld.prototype.tor=function(r,t,col,tile,pos,rot,scl,arc,n){return this.add(new THREE.TorusGeometry(r,t,4,n||10,arc||PI*2),col,tile,pos,rot,scl);};
/* a rod between two points */
Bld.prototype.rod=function(a,b,r,col,tile,n){var d=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),len=d.length();var q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()),e=new THREE.Euler().setFromQuaternion(q);
  return this.add(new THREE.CylinderGeometry(r,r,len,n||6),col,tile,[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],[e.x,e.y,e.z]);};
/* a triangular prism: base w on the ground, apex at height h, depth d along z */
function prismGeo(w,h,d){var a=[-w/2,0],b=[w/2,0],c=[0,h],z0=-d/2,z1=d/2,P=[],U=[];
  function tri(p,q,r,up,uq,ur){P.push(p[0],p[1],p[2],q[0],q[1],q[2],r[0],r[1],r[2]);U.push(up[0],up[1],uq[0],uq[1],ur[0],ur[1]);}
  function quad(p,q,r,s){tri(p,q,r,[0,0],[1,0],[1,1]);tri(p,r,s,[0,0],[1,1],[0,1]);}
  tri([a[0],a[1],z1],[b[0],b[1],z1],[c[0],c[1],z1],[0,0],[1,0],[.5,1]);tri([b[0],b[1],z0],[a[0],a[1],z0],[c[0],c[1],z0],[0,0],[1,0],[.5,1]);
  quad([b[0],b[1],z1],[b[0],b[1],z0],[c[0],c[1],z0],[c[0],c[1],z1]);quad([a[0],a[1],z0],[a[0],a[1],z1],[c[0],c[1],z1],[c[0],c[1],z0]);quad([a[0],a[1],z0],[b[0],b[1],z0],[b[0],b[1],z1],[a[0],a[1],z1]);
  var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.computeVertexNormals();return g;}
Bld.prototype.prism=function(w,h,d,col,tile,pos,rot,scl){return this.add(prismGeo(w,h,d),col,tile,pos,rot,scl);};
/* a tube along points */
Bld.prototype.tube=function(pts,r,col,tile,seg,rad){var v=[];for(var i=0;i<pts.length;i++)v.push(new THREE.Vector3(pts[i][0],pts[i][1],pts[i][2]));
  return this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v),seg||12,r,rad||5,false),col,tile);};

/* ---------- team palettes ---------- */
var PAL={
  blue:{main:0x2f6fe6,dark:0x1d48a8,light:0x7fb0ff,wood:0xd9ab6c,wood2:0xbf8c50,woodD:0x8a5c34,cloth:0xf3e7cc,rope:0xd2ad6e,metal:0xc9a04a},
  red:{main:0xd4502c,dark:0x93381f,light:0xf08a5a,wood:0x9a6338,wood2:0x7e4e2a,woodD:0x5c3a20,cloth:0xdc6a3e,rope:0x8a7a66,metal:0xaab0b2,rust:0xb0683a},
  green:{main:0x4c9a3c,dark:0x2f6e2c,light:0x8fcf5a,wood:0x9a6e42,wood2:0x7c5632,woodD:0x5e4026,cloth:0xe9dfae,rope:0x5f9a3a,metal:0xf2c230,end:0xe6c88e}
};
SS.PAL=PAL;
var CORK=0xd6a878,TIN=0x9aa2a6,INK=0x2a1c14,PINK=0xf2a39c,CREAM=0xfff4dc,GOLD=0xe9b53a;
function jit(b,hex,amt){return shade(hex,1+(b.r()-.5)*2*(amt||.08));}

/* team marks as small flat models in the xy plane, facing +z: feather, cog, pine tree */
function mark(b,team,s,pos,rot){b.push(pos,rot,s);
  if(team==='blue'){b.cyl(.5,.5,.06,14,PAL.blue.dark,'paint',[0,0,0],[PI/2,0,0]);b.sph(.2,8,6,0xffffff,null,[0,.02,.05],[0,0,-.5],[.5,1.9,.2]);b.box(.035,.8,.03,0xe8dcc0,null,[0,0,.07],[0,0,-.5]);}
  else if(team==='red'){b.cyl(.36,.36,.08,12,TIN,'rust',[0,0,0],[PI/2,0,0]);for(var i=0;i<8;i++){var a=i/8*PI*2;b.box(.16,.17,.08,TIN,'rust',[Math.cos(a)*.42,Math.sin(a)*.42,0],[0,0,a]);}
    b.cyl(.13,.13,.1,8,0x4a3024,null,[0,0,0],[PI/2,0,0]);}
  else{b.cyl(.5,.5,.06,14,PAL.green.cloth,'paint',[0,0,0],[PI/2,0,0]);for(var k=0;k<3;k++)b.cone(.32-k*.07,.3,3,PAL.green.dark,null,[0,-.12+k*.19,.04],[0,PI/6,0],[1,1,.2]);b.box(.08,.16,.03,0x6b4423,null,[0,-.33,.04]);}
  b.pop();}
/* a rope lashing: a few turns round a post */
function lash(b,pos,r,col,axis){for(var i=-1;i<=1;i++){var p=pos.slice();if(axis==='x')p[0]+=i*r*.42;else if(axis==='z')p[2]+=i*r*.42;else p[1]+=i*r*.42;
  b.add(new THREE.TorusGeometry(r,r*.24,3,7),shade(col,1-.06*(i+1)),null,p,axis==='x'?[0,PI/2,0]:(axis==='z'?[0,0,0]:[PI/2,0,0]));}}
