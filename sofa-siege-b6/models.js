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
  return c;
}
/* tile rects in uv space: [u0,v0,size] (canvas y is flipped) */
var TILE={wood:[0,.5],paint:[.5,.5],rust:[0,0],cloth:[.5,0]};
var PLAIN_UV=[(256+12)/512,1-12/512];

var _mat=null,_glow=null,_gloss=null,_metal=null;
function mat(){if(!_mat){SS.tex=makeBig();_mat=new THREE.MeshStandardMaterial({vertexColors:true,map:SS.tex,roughness:.84,metalness:0});SS.mat=_mat;}return _mat;}
function glow(){if(!_glow){_glow=new THREE.MeshBasicMaterial({vertexColors:true});SS.glow=_glow;}return _glow;}
function metal(){if(!_metal){mat();_metal=new THREE.MeshStandardMaterial({vertexColors:true,map:SS.tex,roughness:.42,metalness:.32});SS.metal=_metal;}return _metal;}
/* ---------- painted textures (art pack 3), loaded as real repeating textures ----------
   Until a picture arrives, or if it never does, each material shows a small procedural stand-in of the same kind and colour,
   so the game is playable at once. ?tex=0 in the page address switches the painted textures off (the old look). */
SS.texOn=!(typeof location!=='undefined'&&/[?&]tex=0(&|$)/.test(location.search||''));SS.texPath='tex/';SS.texLoaded={};
/* One big atlas, 2048 x 1024, eight cells of 512: the procedural atlas, then wood, blue, red, tin, canvas, grass and grey tin.
   Everything is drawn with one material again. A painted cell is used with a small inset so that neighbours do not bleed in. */
var TEXKEYS=['wood','blue','red','tin','canvas','grass'],CELL={base:0,wood:1,blue:2,red:3,tin:4,canvas:5,grass:6,greytin:7},PAD=10,_big=null,_bigCtx=null;
function standIn(key){var c=document.createElement('canvas');c.width=c.height=128;var g=c.getContext('2d'),r=rng(hash('tex'+key)),i,y;
  var base={wood:'#c98a48',blue:'#3f74bd',red:'#b3482c',tin:'#a8623a',canvas:'#e2cfa6',grass:'#648a40',greytin:'#8f9498'}[key];g.fillStyle=base;g.fillRect(0,0,128,128);
  if(key==='wood'||key==='blue'||key==='red'){for(i=0;i<160;i++){g.fillStyle=r()<.5?'rgba(255,240,210,.10)':'rgba(60,30,10,.12)';g.fillRect(r()*128,r()*128,10+r()*40,1.5);}
    if(key!=='wood')for(i=0;i<40;i++){g.fillStyle='rgba(214,150,70,.8)';g.fillRect(r()*128,(Math.floor(r()*4)*32)+(r()<.5?1:26)+r()*3,4+r()*14,2+r()*3);}
    for(y=0;y<4;y++){g.fillStyle='rgba(50,25,10,.75)';g.fillRect(0,y*32,128,1.6);g.fillStyle='rgba(255,235,200,.25)';g.fillRect(0,y*32+2,128,1);}}
  else if(key==='tin'||key==='greytin'){for(i=0;i<60;i++){g.fillStyle=r()<.3?'rgba(150,160,165,.5)':(r()<.5?(key==='tin'?'rgba(210,110,40,.35)':'rgba(90,95,100,.3)'):'rgba(110,50,20,.3)');g.beginPath();g.arc(r()*128,r()*128,3+r()*12,0,6.3);g.fill();}}
  else if(key==='canvas'){for(i=0;i<128;i+=3){g.fillStyle='rgba(120,100,70,.1)';g.fillRect(i,0,1,128);g.fillRect(0,i,128,1);}}
  else{for(i=0;i<260;i++){g.fillStyle=r()<.5?'rgba(120,160,70,.35)':'rgba(50,90,40,.3)';g.beginPath();g.arc(r()*128,r()*128,2+r()*6,0,6.3);g.fill();}}
  return c;}
/* draws a tile into its cell, edge colours spread into the padding, then tones it:
   wood a little less orange, red towards brick, and a greyed copy of the tin for bare metal */
function drawCell(key,img){var g=_bigCtx,ci=CELL[key],x0=(ci%4)*512,y0=Math.floor(ci/4)*512;g.save();g.beginPath();g.rect(x0,y0,512,512);g.clip();
  g.drawImage(img,x0,y0,512,512);g.drawImage(img,x0+PAD,y0+PAD,512-2*PAD,512-2*PAD);
  function tone(desat,mul){if(desat){g.globalCompositeOperation='saturation';g.globalAlpha=desat;g.fillStyle='#808080';g.fillRect(x0,y0,512,512);}g.globalAlpha=1;if(mul){g.globalCompositeOperation='multiply';g.fillStyle=mul;g.fillRect(x0,y0,512,512);}}
  if(key==='red')tone(.3,'#d6c2ba');else if(key==='wood')tone(.2,'#f0ebe6');else if(key==='greytin')tone(.82,'#e9eef2');else if(key==='blue')tone(.1,null);
  g.restore();}
function makeBig(){_big=document.createElement('canvas');_big.width=2048;_big.height=1024;_bigCtx=_big.getContext('2d');_bigCtx.fillStyle='#fff';_bigCtx.fillRect(0,0,2048,1024);_bigCtx.drawImage(makeAtlas(),0,0);
  var t=new THREE.CanvasTexture(_big);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;
  if(SS.texOn){Object.keys(CELL).forEach(function(k){if(k!=='base')drawCell(k,standIn(k));});
    TEXKEYS.forEach(function(key){SS.texLoaded[key]=false;if(typeof Image==='undefined')return;var img=new Image();
      img.onload=function(){try{drawCell(key,img);if(key==='tin')drawCell('greytin',img);_bigCtx.getImageData(0,0,1,1);t.needsUpdate=true;SS.texLoaded[key]=true;}catch(e){SS.texLoaded[key]='blocked';}};
      img.onerror=function(){SS.texLoaded[key]='missing';};img.src=SS.texPath+key+'.jpg';});}
  return t;}
/* where a cell's own u,v (0..1) sits in the atlas */
function cellU(ci,u,pad){return ((ci%4)*512+pad+u*(512-2*pad))/2048;}
function cellV(ci,v,pad){return 1-(Math.floor(ci/4)*512+pad+(1-v)*(512-2*pad))/1024;}
function matFor(key){return key==='metal'?metal():mat();}
SS.texMaterials=function(){return [mat()];};
/* true once every painted texture asked for so far has arrived or failed */
SS.texSettled=function(){mat();for(var k in SS.texLoaded)if(SS.texLoaded[k]===false)return false;return true;};
/* calls back when the textures have settled, or after maxMs at the latest */
SS.whenTextures=function(cb,maxMs){var t0=Date.now();(function wait(){if(SS.texSettled()||Date.now()-t0>(maxMs||3000))cb();else setTimeout(wait,50);})();};
function gloss(){if(!_gloss){_gloss=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.18,metalness:.05});SS.gloss=_gloss;}return _gloss;}

/* ---------- geometry builder: merges primitives into one buffer with vertex colours ---------- */
var _col={},_v=new THREE.Vector3(),_n=new THREE.Vector3(),_nm=new THREE.Matrix3(),_e=new THREE.Euler(),_q=new THREE.Quaternion(),_s=new THREE.Vector3(),_p=new THREE.Vector3();
function lin(hex){var c=_col[hex];if(!c){var k=new THREE.Color(hex).convertSRGBToLinear();c=_col[hex]=[k.r,k.g,k.b];}return c;}
function shade(hex,f){var r=(hex>>16)&255,g=(hex>>8)&255,b=hex&255;r=Math.max(0,Math.min(255,Math.round(r*f)));g=Math.max(0,Math.min(255,Math.round(g*f)));b=Math.max(0,Math.min(255,Math.round(b*f)));return (r<<16)|(g<<8)|b;}
function blend(a,b,k){var ar=(a>>16)&255,ag=(a>>8)&255,ab=a&255,br=(b>>16)&255,bg=(b>>8)&255,bb=b&255;return (Math.round(ar+(br-ar)*k)<<16)|(Math.round(ag+(bg-ag)*k)<<8)|Math.round(ab+(bb-ab)*k);}
function compose(pos,rot,scl){pos=pos||[0,0,0];rot=rot||[0,0,0];_p.set(pos[0],pos[1],pos[2]);_e.set(rot[0],rot[1],rot[2]);_q.setFromEuler(_e);
  if(scl==null)_s.set(1,1,1);else if(typeof scl==='number')_s.set(scl,scl,scl);else _s.set(scl[0],scl[1],scl[2]);return new THREE.Matrix4().compose(_p,_q,_s);}
function Bld(seed){this.P=[];this.N=[];this.U=[];this.C=[];this.M=[new THREE.Matrix4()];this.r=rng(seed||1);this.sub={};this.metalOK=false;this.key='base';}
Bld.prototype.push=function(pos,rot,scl){this.M.push(this.M[this.M.length-1].clone().multiply(compose(pos,rot,scl)));return this;};
Bld.prototype.pop=function(){this.M.pop();return this;};
/* A builder fills one buffer per material: 'base' (the procedural atlas), 'metal' (shiny tin), and one per painted texture.
   bare grey tin on the rust tile goes to 'metal' where a model asks for it. */
function isTin(col,tile){if(tile!=='rust')return false;var r=(col>>16)&255,g=(col>>8)&255,b=col&255;return r<g&&g<=b&&b-r<24;}
Bld.prototype.side=function(key){key=key||'metal';var b=this.sub[key];if(!b){b=this.sub[key]=new Bld(1);b.M=this.M;b.r=this.r;b.key=key;b.isAlt=true;}return b;};
/* which painted texture a tile and colour use, or '' for the procedural atlas */
function texKey(col,tile){if(!SS.texOn||!tile)return '';var r=(col>>16)&255,g=(col>>8)&255,b=col&255;
  if(tile==='grass')return 'grass';if(tile==='wood')return 'wood';if(tile==='rust')return r>g*1.6&&r>b*1.6?'red':(isTin(col,tile)?'greytin':'tin');   /* red paint, bare grey tin, or rust */
  if(tile==='paint')return b>r*1.25&&b>g?'blue':(r>g*1.6&&r>b*1.6?'red':'');
  if(tile==='cloth')return r>205&&g>190&&b>140&&r-b<90?'canvas':'';return '';}
/* the painted textures carry the colour, so the vertex colour is only a light tint: darker for dark woods, redder for red tin */
function texTint(key,col){var r=(col>>16)&255,g=(col>>8)&255,b=col&255,l=.3*r+.59*g+.11*b,k;
  function cl(x,a,c){return x<a?a:(x>c?c:x);}
  if(key==='wood'){k=cl(l/172,.5,1.08);k*=k;return [k,k*.98,k*.95];}
  if(key==='blue'){k=cl(l/105,.62,1.12);k*=k;return [k,k,k];}
  if(key==='red'){k=cl(l/116,.62,1.12);k*=k;return [k,k,k];}
  if(key==='tin'){k=cl(l/150,.55,1.05);k*=k;return [k,k*.92,k*.88];}
  if(key==='greytin'){k=cl(l/160,.6,1.1);k*=k;return [k,k,k];}
  if(key==='canvas'){k=cl(l/222,.7,1.04);k*=k;return [k,k,k];}
  return [1,1,1];}
/* tile: 'wood','paint','rust','cloth','grass' (add 'h' to turn the grain sideways) or falsy for plain */
Bld.prototype.add=function(geo,col,tile,pos,rot,scl,flat){
  var turn=false,tl=null;if(tile){if(tile.charAt(tile.length-1)==='h'){turn=true;tile=tile.slice(0,-1);}}
  if(this.metalOK&&!this.isAlt&&isTin(col,tile)){this.side('metal').add(geo,col,tile+(turn?'h':''),pos,rot,scl,flat);return this;}
  var key=texKey(col,tile),T=this;if(tile==='grass'&&!key)tile='cloth';if(tile)tl=TILE[tile];
  var g=geo.index?geo.toNonIndexed():geo,m=this.M[this.M.length-1].clone().multiply(compose(pos,rot,scl));
  var pa=g.attributes.position,na=g.attributes.normal,ua=g.attributes.uv,c=key?texTint(key,col):lin(col),i,P=T.P,N=T.N,U=T.U,C=T.C,r=this.r;
  var f=.42,ou=0,ov=0;if(tl){ou=tl[0]+.03+r()*(.5-.06-f*.5);ov=tl[1]+.03+r()*(.5-.06-f*.5);if(tile==='paint'){ou=tl[0]+.06+r()*(.5-.09-f*.5);ov=tl[1]+.03+r()*(.5-.12-f*.5);}}
  _nm.getNormalMatrix(m);var start=P.length,ustart=U.length;
  for(i=0;i<pa.count;i++){
    _v.fromBufferAttribute(pa,i).applyMatrix4(m);P.push(_v.x,_v.y,_v.z);
    if(na){_n.fromBufferAttribute(na,i).applyMatrix3(_nm).normalize();N.push(_n.x,_n.y,_n.z);}else N.push(0,1,0);
    var u=ua?ua.getX(i):0,v=ua?ua.getY(i):0;if(turn){var t=u;u=v;v=t;}
    if(key)U.push(u,v);else if(tl&&ua){u=u<0?0:(u>1?1:u);v=v<0?0:(v>1?1:v);U.push(ou+u*f*.5,ov+v*f*.5);}else U.push(PLAIN_UV[0],PLAIN_UV[1]);
    C.push(c[0],c[1],c[2]);
  }
  if(flat||!na){for(i=start;i<P.length;i+=9){var ax=P[i+3]-P[i],ay=P[i+4]-P[i+1],az=P[i+5]-P[i+2],bx=P[i+6]-P[i],by=P[i+7]-P[i+1],bz=P[i+8]-P[i+2];
    var nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,l=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;nx/=l;ny/=l;nz/=l;for(var k=0;k<9;k+=3){N[i+k]=nx;N[i+k+1]=ny;N[i+k+2]=nz;}}}
  if(key)realUV(P,U,start,ustart,key,r);
  var ci=key?CELL[key]:0,pd=key?PAD:0;for(i=ustart;i<U.length;i+=2){U[i]=cellU(ci,U[i],pd);U[i+1]=cellV(ci,U[i+1],pd);}
  return this;};
/* UVs for a painted texture, in real sizes. u,v (0..1 over the primitive) become texture coordinates so that the paint is the
   same size everywhere. The plank tiles hold four planks, grain along u: one piece of wood gets one plank row (more if it is broad),
   and runs along the grain as far as it is long. */
function realUV(P,U,start,ustart,key,r){
  var n=(P.length-start)/9,su=0,sv=0,sw=0,i,k;
  for(i=0;i<n;i++){var a=start+i*9,b=ustart+i*6,e1x=P[a+3]-P[a],e1y=P[a+4]-P[a+1],e1z=P[a+5]-P[a+2],e2x=P[a+6]-P[a],e2y=P[a+7]-P[a+1],e2z=P[a+8]-P[a+2],
      du1=U[b+2]-U[b],dv1=U[b+3]-U[b+1],du2=U[b+4]-U[b],dv2=U[b+5]-U[b+1],det=du1*dv2-du2*dv1;if(Math.abs(det)<1e-7)continue;
    var tx=(e1x*dv2-e2x*dv1)/det,ty=(e1y*dv2-e2y*dv1)/det,tz=(e1z*dv2-e2z*dv1)/det,bx=(e2x*du1-e1x*du2)/det,by=(e2y*du1-e1y*du2)/det,bz=(e2z*du1-e1z*du2)/det;
    var cx=e1y*e2z-e1z*e2y,cy=e1z*e2x-e1x*e2z,cz=e1x*e2y-e1y*e2x,w=Math.sqrt(cx*cx+cy*cy+cz*cz);su+=Math.sqrt(tx*tx+ty*ty+tz*tz)*w;sv+=Math.sqrt(bx*bx+by*by+bz*bz)*w;sw+=w;}
  var Lu=sw?su/sw:.1,Lv=sw?sv/sw:.1,o1=r(),o2=r(),o3=r();
  function fit(span){return span>.94?.94:span;}
  if(key==='grass'){for(i=0;i<n*3;i++){U[ustart+i*2]=Math.min(1,Math.max(0,P[start+i*3]/1.45+.5));U[ustart+i*2+1]=Math.min(1,Math.max(0,P[start+i*3+2]/1.45+.5));}return;}
  if(key==='tin'||key==='greytin'||key==='canvas'){var S=key==='canvas'?.85:.62,a1=fit(Lu/S),a2=fit(Lv/S),flip=o3<.5;   /* each part takes its own patch, some turned a quarter */
    for(i=0;i<n*3;i++){var x=U[ustart+i*2],y=U[ustart+i*2+1];if(flip){var t=x;x=y;y=t;}U[ustart+i*2]=o1*(1-a1)+x*a1;U[ustart+i*2+1]=o2*(1-a2)+y*a2;}return;}
  /* planks: v is along the grain (callers turn it with the 'h' tiles), u across it. A long part stretches the grain, it never leaves the cell. */
  var across=Math.max(Lu,.01),along=Lv,rows=Math.max(1,Math.min(4,Math.round(across/.13))),row=Math.floor(o1*(5-rows))%(5-rows),span=fit(along*rows*.25/across),back=o3<.5;
  for(i=0;i<n*3;i++){var uu=U[ustart+i*2],vv=U[ustart+i*2+1];if(back)vv=1-vv;U[ustart+i*2]=o2*(1-span)+vv*span;U[ustart+i*2+1]=row*.25+.014+uu*(rows*.25-.028);}}
/* append an already built geometry, moved by an offset */
Bld.prototype.raw=function(geo,off){var p=geo.attributes.position.array,n=geo.attributes.normal.array,u=geo.attributes.uv.array,c=geo.attributes.color.array,i;off=off||[0,0,0];
  var keys=geo.userData.keys||['base'],gs=geo.groups.length?geo.groups:[{start:0,count:p.length/3}],me=this;
  gs.forEach(function(gr,gi){var T=keys[gi]==='base'?me:me.side(keys[gi]);for(i=gr.start;i<gr.start+gr.count;i++){T.P.push(p[i*3]+off[0],p[i*3+1]+off[1],p[i*3+2]+off[2]);T.N.push(n[i*3],n[i*3+1],n[i*3+2]);T.U.push(u[i*2],u[i*2+1]);T.C.push(c[i*3],c[i*3+1],c[i*3+2]);}});return this;};
Bld.prototype.geo=function(centre){var g=new THREE.BufferGeometry(),c=[0,0,0],i,me=this,keys=[],parts=[];
  if(this.P.length){keys.push('base');parts.push(this);}Object.keys(this.sub).sort().forEach(function(k){if(me.sub[k].P.length){keys.push(k);parts.push(me.sub[k]);}});
  var P=[],N=[],U=[],C=[],at=0;parts.forEach(function(b,bi){var cnt=b.P.length/3;if(keys.length>1||keys[0]!=='base')g.addGroup(at,cnt,bi);at+=cnt;
    for(i=0;i<b.P.length;i++){P.push(b.P[i]);N.push(b.N[i]);C.push(b.C[i]);}for(i=0;i<b.U.length;i++)U.push(b.U[i]);});
  if(g.groups.length)g.userData.keys=keys;
  if(centre&&P.length){var lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(i=0;i<P.length;i++){var a=i%3;if(P[i]<lo[a])lo[a]=P[i];if(P[i]>hi[a])hi[a]=P[i];}
    c=[(lo[0]+hi[0])/2,(lo[1]+hi[1])/2,(lo[2]+hi[2])/2];for(i=0;i<P.length;i++)P[i]-=c[i%3];}
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
  g.computeBoundingSphere();g.userData.centre=c;return g;};
function mesh(geo,m,shadow){if((!m||m===_mat)&&geo.userData.keys)m=geo.userData.keys.map(matFor);var o=new THREE.Mesh(geo,m||mat());o.castShadow=shadow!==false;o.receiveShadow=true;return o;}
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

/* ---------- mice ---------- */
var FUR={tan:0xcf9f6e,grey:0xa7a39f,cream:0xecd9b8,brown:0x9a6a44};
SS.FUR=FUR;
var HIP=.06,_mg={};
function dentGeo(g,at,rad,depth){var p=g.attributes.position,v=new THREE.Vector3(),c=new THREE.Vector3(at[0],at[1],at[2]);
  for(var i=0;i<p.count;i++){v.fromBufferAttribute(p,i);var d=v.distanceTo(c);if(d<rad){var k=(1-d/rad);v.multiplyScalar(1-depth*k*k);p.setXYZ(i,v.x,v.y,v.z);}}g.computeVertexNormals();return g;}
function mouseGeo(team,furName){
  var key=team+'|'+furName;if(_mg[key])return _mg[key];
  var T=PAL[team],fur=FUR[furName]||FUR.tan,furL=blend(fur,0xfff2dc,.55),G={},b,s,i;
  /* The look follows the character sheets in art/pack3/characters: a big head with big round ears and large dark eyes,
     a cream muzzle and belly, a team coat, and each team's own hat. */
  var cream=blend(fur,0xfff0d8,.72),SHOE=0x6a4634;
  /* body: torso, cream belly, coat, belt, and the team's neck wear and back pack */
  b=new Bld(hash(key));
  b.sph(.058,9,6,fur,null,[0,.054,0],null,[1,1.08,.92]);
  b.cyl(.058,.071,.086,10,T.main,'cloth',[0,.04,0]);b.cyl(.072,.074,.012,10,T.dark,'cloth',[0,.003,0]);
  b.sph(.05,10,8,cream,null,[0,.046,.03],null,[.86,1.02,.92]);                       /* belly */
  b.cyl(.066,.069,.013,8,0x7a5234,null,[0,.03,0]);b.box(.024,.02,.01,GOLD,null,[0,.03,.07]);
  if(team==='blue'){ /* tan collar, short cape, quiver of cork bolts */
    b.tor(.05,.011,0xd9a55c,null,[0,.096,.004],[PI/2,0,0],null,null,8);
    b.add(new THREE.CylinderGeometry(.07,.086,.1,8,1,true,PI*.5,PI),T.dark,'cloth',[0,.05,-.012]);b.add(new THREE.CylinderGeometry(.068,.084,.1,8,1,true,PI*.5,PI),T.main,'cloth',[0,.05,-.012],[0,0,0],[-1,1,1]);
    b.push([.048,.07,-.058],[.1,0,-.3]);b.cyl(.02,.017,.085,7,0x9a6a3e,'wood');b.tor(.021,.004,0x6e4a2a,null,[0,.03,0],[PI/2,0,0],null,null,7);
    for(i=0;i<3;i++){var bx=(i-1)*.011;b.cyl(.003,.003,.05,4,0xe6c88a,null,[bx,.06,(i%2)*.008-.004]);b.cyl(.007,.005,.012,5,CORK,null,[bx,.088,(i%2)*.008-.004]);}
    b.pop();
  }else if(team==='red'){ /* brick-red scarf with a hanging end, brown patched sack */
    b.tor(.052,.016,T.dark,'cloth',[0,.096,.004],[PI/2,0,0],null,null,8);b.box(.03,.05,.012,T.dark,'cloth',[.034,.07,.058],[.15,0,-.2]);
    b.sph(.052,8,6,0x9a7248,'cloth',[0,.07,-.066],null,[1.1,1.05,.8]);b.cyl(.014,.02,.02,6,0x8a6238,'cloth',[0,.125,-.066]);
    b.box(.034,.03,.004,T.main,'cloth',[.016,.062,-.11],[.1,0,.15]);b.rod([-.04,.11,-.09],[.045,.04,-.105],.004,0xd9b98a,null,4);
    b.tor(.064,.005,0x6e4a2a,null,[0,.075,0],[PI/2,.5,0],null,null,10);
  }else{ /* moss-green scarf, plank pack tied with rope */
    b.tor(.052,.016,T.dark,'cloth',[0,.096,.004],[PI/2,0,0],null,null,8);b.box(.03,.045,.012,T.dark,'cloth',[-.034,.07,.058],[.15,0,.2]);
    for(i=0;i<3;i++)b.box(.115,.03,.012,i===1?0xd9ab6c:0xc9955a,'woodh',[0,.045+i*.033,-.068-(i===1?.003:0)],[.05,0,(i-1)*.03]);
    b.rod([-.05,.03,-.078],[.05,.115,-.08],.005,0xd2ad6e,null,4);b.rod([.05,.03,-.078],[-.05,.115,-.08],.005,0xd2ad6e,null,4);
    b.tor(.02,.006,0xd2ad6e,null,[.066,.03,-.02],[0,PI/2,0],null,null,8);
  }
  G.body=b.geo();
  /* head: the red helmet is the one shiny tin part of a mouse */
  b=new Bld(3);b.metalOK=true;
  b.sph(.08,12,8,fur,null,[0,.062,0],null,[1.08,.95,1]);
  b.sph(.042,8,6,cream,null,[0,.04,.056],null,[1.25,.82,1.05]);
  b.sph(.015,6,4,0xd98a8e,null,[0,.054,.1],null,[1.25,.85,1]);
  b.tor(.014,.0036,0x5a3a2c,null,[-.012,.031,.094],[.3,0,PI],null,PI,6);b.tor(.014,.0036,0x5a3a2c,null,[.012,.031,.094],[.3,0,PI],null,PI,6);
  for(s=-1;s<=1;s+=2){
    b.sph(.024,7,5,0xfff4e2,null,[s*.035,.078,.058],null,[1,1.18,.7]);                                                     /* pale rim */
    b.sph(.02,7,5,0x2a1e18,null,[s*.035,.078,.064],null,[1,1.2,.75]);b.sph(.0075,5,4,0xffffff,null,[s*.035-.006,.089,.079]);  /* big dark eye with a glint */
    b.sph(.054,9,5,shade(fur,.86),null,[s*.082,.118,-.016],[0,0,-s*.22],[1,1.08,.26]);b.sph(.039,7,4,0xd9a0a0,null,[s*.082,.116,-.006],[0,0,-s*.22],[1,1.08,.24]);
    for(i=-1;i<=1;i++)b.box(.05,.0024,.0024,0x7a5a48,null,[s*.068,.044+i*.008,.066],[0,-s*.45,s*i*.13]);
  }
  if(team==='blue'){ /* rounded cap with a peak and a pale band, goggles on top, one feather */
    b.push([0,.1,-.004],[-.06,0,0]);
    b.dome(.082,12,5,T.main,'cloth',null,null,[1.05,.82,1.05]);b.tor(.084,.008,T.light,'cloth',[0,.004,0],[PI/2,0,0],null,null,12);
    b.cyl(.06,.064,.008,10,T.dark,'cloth',[0,.004,.05],[.12,0,0],[1.1,1,.9]);
    for(s=-1;s<=1;s+=2){b.cyl(.023,.023,.016,9,0x6e4a2a,null,[s*.026,.05,.052],[PI/2-.75,0,0]);b.cyl(.017,.017,.02,8,0x86b8d8,null,[s*.026,.0515,.0535],[PI/2-.75,0,0]);b.sph(.005,4,3,0xffffff,null,[s*.026-.006,.062,.058]);}
    b.box(.012,.008,.008,0x6e4a2a,null,[0,.05,.054]);b.tor(.079,.005,0x6e4a2a,null,[0,.038,0],[PI/2+.3,0,0],[1,1,.9],null,10);
    b.sph(.026,6,4,0xf4efdc,null,[-.052,.105,-.012],[-.1,0,.42],[.45,2.3,.18]);b.box(.004,.1,.004,0xbdb39a,null,[-.05,.1,-.01],[-.1,0,.42]);
    b.pop();
  }else if(team==='red'){ /* grey dome helmet with a dent, and a rivet band */
    b.push([0,.098,-.002],[-.05,0,.05]);
    b.add(dentGeo(new THREE.SphereGeometry(.084,12,5,0,PI*2,0,PI/2),[.045,.06,.03],.05,.38),TIN,'rust',null,null,[1.04,.9,1.04]);
    b.cyl(.092,.096,.022,12,shade(TIN,.72),'rust',[0,.004,0]);
    for(i=0;i<8;i++){var a=i/8*PI*2+.4;b.sph(.007,5,3,0xd8d2c0,null,[Math.cos(a)*.095,.005,Math.sin(a)*.095]);}
    b.box(.004,.03,.004,shade(TIN,.6),null,[-.02,.06,.066],[-.6,0,.3]);b.box(.004,.022,.004,shade(TIN,.6),null,[.03,.065,.058],[-.6,0,-.4]);
    b.pop();
  }else{ /* yellow miner's helmet with a brim band; the lamp lens is a separate glowing mesh */
    b.push([0,.098,-.002],[-.05,0,0]);
    b.dome(.084,12,5,T.metal,null,null,null,[1.04,.9,1.04]);b.cyl(.092,.096,.02,12,shade(T.metal,.86),null,[0,.003,0]);
    b.box(.07,.008,.02,0xffe9a0,null,[0,.05,.058],[-.7,0,0]);
    b.box(.05,.05,.03,0x8a6a34,null,[0,.058,.072],[-.35,0,0]);
    b.pop();
  }
  G.head=b.geo();
  if(team==='green'){b=new Bld(4);b.cyl(.019,.019,.008,10,0xfff2b0,null,[0,.149,.088],[PI/2-.38,0,0]);G.lamp=b.geo();}
  /* dizzy eyes: swirls that sit over the eyes */
  b=new Bld(5);for(s=-1;s<=1;s+=2){b.cyl(.024,.024,.004,10,0xffffff,null,[s*.035,.078,.081],[PI/2,0,0]);b.tor(.012,.0036,0x2a1c14,null,[s*.035,.078,.084],null,null,PI*1.6,8);b.sph(.005,4,3,0x2a1c14,null,[s*.035,.078,.084]);}
  G.dizzy=b.geo();
  /* arms hang down from the shoulder */
  b=new Bld(6);b.cyl(.017,.021,.04,7,T.main,'cloth',[0,-.016,0]);b.cyl(.013,.013,.03,6,T.main,'cloth',[0,-.05,0]);b.sph(.02,6,4,blend(fur,0xfff0d8,.72),null,[0,-.07,0]);G.arm=b.geo();
  /* legs hang down from the hip */
  b=new Bld(7);b.cyl(.021,.017,.04,7,T.dark,'cloth',[0,-.02,0]);b.sph(.026,6,4,0x6a4634,null,[0,-.046,.014],null,[1,.56,1.5]);G.leg=b.geo();
  /* tail */
  b=new Bld(8);b.tube([[0,0,.01],[0,-.012,-.035],[0,0,-.075],[0,.035,-.1],[0,.075,-.09],[0,.095,-.07]],.0065,PINK,null,7,4);b.sph(.0075,5,4,PINK,null,[0,.095,-.07]);G.tail=b.geo();
  /* the team tool, held in the right hand */
  b=new Bld(9);
  if(team==='blue'){ /* toy crossbow with a cork-tipped bolt; points along +z */
    b.box(.017,.017,.13,PAL.blue.wood2,'wood',[0,0,.03]);b.box(.014,.03,.02,PAL.blue.woodD,'wood',[0,-.018,-.01]);
    b.tor(.056,.006,T.main,'paint',[0,.006,.045],[PI/2,0,0],[1,.75,1],PI,10);b.box(.112,.003,.003,CREAM,null,[0,.008,.045]);
    b.cyl(.004,.004,.1,4,CREAM,null,[0,.014,.06],[PI/2,0,0]);b.cyl(.011,.008,.018,7,CORK,null,[0,.014,.115],[PI/2,0,0]);
    b.sph(.008,5,4,0xffffff,null,[0,.02,.014],null,[.4,1,1.6]);
  }else if(team==='red'){ /* a big cog held like a shield */
    b.push([0,-.004,.026],null,.1);mark(b,'red',1,[0,0,0]);b.pop();b.box(.012,.012,.03,0x5a4030,null,[0,0,.01]);
  }else{ /* mallet; handle runs along +y */
    b.cyl(.007,.008,.15,6,PAL.blue.wood2,'wood',[0,.05,0]);b.cyl(.03,.03,.07,10,T.end,'woodh',[0,.125,0],[0,0,PI/2]);
    b.cyl(.031,.031,.01,10,T.woodD,null,[.03,.125,0],[0,0,PI/2]);b.cyl(.031,.031,.01,10,T.woodD,null,[-.03,.125,0],[0,0,PI/2]);
  }
  G.tool=b.geo();
  /* a small hammer for the other teams' hammer pose */
  b=new Bld(10);b.cyl(.006,.007,.11,6,PAL.blue.wood2,'wood',[0,.035,0]);b.cyl(.018,.018,.05,8,TIN,null,[0,.09,0],[0,0,PI/2]);G.hammer=b.geo();
  /* the plank a mouse carries */
  b=new Bld(11);
  if(team==='red'){b.box(.3,.008,.085,TIN,'rust',[0,0,0]);for(i=0;i<5;i++)b.box(.012,.012,.085,shade(TIN,.85),'rust',[(i-2)*.06,.006,0]);}
  else if(team==='green'){b.cyl(.026,.028,.32,8,T.wood2,'wood',[0,.012,0],[0,0,PI/2]);b.cyl(.022,.022,.322,8,T.end,null,[0,.012,0],[0,0,PI/2]);}
  else{b.box(.34,.022,.062,T.wood,'woodh',[0,0,0]);b.box(.342,.023,.02,T.main,'painth',[0,0,.012]);}
  G.plank=b.geo();
  return (_mg[key]=G);
}
SS.mouse=function(team,opts){
  opts=opts||{};team=PAL[team]?team:'blue';var furName=opts.fur||'tan',G=mouseGeo(team,furName),M=mat();
  var root=new THREE.Group(),rig=new THREE.Group(),body=new THREE.Group(),head=new THREE.Group(),armL=new THREE.Group(),armR=new THREE.Group(),legL=new THREE.Group(),legR=new THREE.Group(),tail=new THREE.Group();
  root.name='mouse';rig.name='rig';body.name='body';head.name='head';armL.name='armL';armR.name='armR';legL.name='legL';legR.name='legR';tail.name='tail';
  root.add(rig);rig.add(body);rig.add(legL);rig.add(legR);body.add(head);body.add(armL);body.add(armR);body.add(tail);
  body.position.set(0,HIP,0);head.position.set(0,.108,0);armL.position.set(.064,.1,0);armR.position.set(-.064,.1,0);legL.position.set(.03,HIP,0);legR.position.set(-.03,HIP,0);tail.position.set(0,.014,-.052);
  body.add(mesh(G.body));head.add(mesh(G.head));armL.add(mesh(G.arm,M,false));armR.add(mesh(G.arm,M,false));legL.add(mesh(G.leg,M,false));legR.add(mesh(G.leg,M,false));tail.add(mesh(G.tail,M,false));
  var tool=mesh(G.tool);tool.name='tool';tool.position.set(0,-.072,0);armR.add(tool);
  var hammer=mesh(G.hammer,M,false);hammer.name='hammer';hammer.position.set(0,-.072,0);hammer.visible=false;armR.add(hammer);
  var plank=mesh(G.plank);plank.name='plank';plank.position.set(0,.082,.092);plank.visible=false;body.add(plank);
  var dz=mesh(G.dizzy,M,false);dz.name='dizzyEyes';dz.visible=false;head.add(dz);
  if(G.lamp){var lamp=mesh(G.lamp,glow(),false);lamp.name='lamp';head.add(lamp);}
  var stars=SS.fx.stars();stars.name='stars';stars.position.set(0,.4,0);stars.visible=false;rig.add(stars);
  root.userData={team:team,fur:furName,toolKind:team==='blue'?'crossbow':(team==='red'?'cog':'mallet'),
    parts:{rig:rig,body:body,head:head,armL:armL,armR:armR,legL:legL,legR:legR,tail:tail,tool:tool,hammer:hammer,plank:plank,dizzyEyes:dz,stars:stars}};
  if(opts.scale)root.scale.setScalar(opts.scale);
  SS.pose(root,opts.pose||'idle',opts.t||0);
  return root;
};
/* Poses only move the inner rig, never the mouse group itself, so the game owns position and heading. */
SS.pose=function(m,name,t){
  var P=m.userData.parts,rig=P.rig,b=P.body,h=P.head,aL=P.armL,aR=P.armR,lL=P.legL,lR=P.legR,tl=P.tail,tool=P.tool,kind=m.userData.toolKind;t=t||0;
  rig.position.set(0,0,0);rig.rotation.set(0,0,0);b.position.set(0,HIP,0);b.rotation.set(0,0,0);b.scale.set(1,1,1);h.rotation.set(0,0,0);
  aL.rotation.set(0,0,.22);aR.rotation.set(0,0,-.22);lL.rotation.set(0,0,0);lR.rotation.set(0,0,0);tl.rotation.set(0,0,0);
  tool.visible=true;tool.rotation.set(kind==='mallet'?.5:(kind==='crossbow'?.15:0),0,0);P.hammer.visible=false;P.plank.visible=false;P.dizzyEyes.visible=false;P.stars.visible=false;
  var s,w,u,j;
  if(name==='walk'){w=t*9;s=Math.sin(w);
    lL.rotation.x=.75*s;lR.rotation.x=-.75*s;aL.rotation.x=-.6*s;aR.rotation.x=.4*s;
    b.position.y=HIP+.012*Math.abs(Math.cos(w));b.rotation.z=.06*s;b.rotation.x=.12;h.rotation.x=-.08;h.rotation.z=-.05*s;tl.rotation.y=.5*s;
  }else if(name==='carry'){w=t*7;s=Math.sin(w);
    lL.rotation.x=.55*s;lR.rotation.x=-.55*s;aL.rotation.set(-1.25+.04*s,0,-.1);aR.rotation.set(-1.25-.04*s,0,.1);
    b.position.y=HIP+.008*Math.abs(Math.cos(w));b.rotation.x=-.07;b.rotation.z=.04*s;h.rotation.x=.06;tl.rotation.y=.4*s;
    tool.visible=false;P.plank.visible=true;P.plank.rotation.set(0,.06*s,.05*s);
  }else if(name==='hammer'){w=(t*1.7)%1;u=w<.62?sstep(w/.62):1-Math.pow((w-.62)/.38,2);
    aR.rotation.set(-1.3-1.4*u,0,-.1);b.rotation.x=.16*(1-u)-.05*u;b.rotation.y=.12;h.rotation.x=.12*(1-u);aL.rotation.set(-.5+.2*u,0,.5);
    lL.rotation.x=-.25;lR.rotation.x=.2;tl.rotation.x=-.3*u;
    var hm=kind==='mallet'?tool:P.hammer;if(hm!==tool){tool.visible=false;hm.visible=true;}hm.rotation.set(2.45-.3*u,0,0);
  }else if(name==='aim'){w=(t*.8)%1;u=Math.exp(-w*7);
    aR.rotation.set(-1.5-.18*u,0,.28);aL.rotation.set(-1.32,0,-.5);tool.rotation.set(kind==='mallet'?2.9:1.5,0,kind==='cog'?0:0);
    b.rotation.y=-.22;b.rotation.x=.06-.1*u;h.rotation.y=.2;h.rotation.z=-.12;h.rotation.x=-.04;lL.rotation.x=-.32;lR.rotation.x=.3;rig.position.z=-.012*u;tl.rotation.x=-.25;tl.rotation.y=.2*Math.sin(t*3);
  }else if(name==='cheer'){j=Math.abs(Math.sin(t*6));s=Math.sin(t*12);
    rig.position.y=.055*j;aL.rotation.set(0,0,2.55+.3*s);aR.rotation.set(0,0,-2.55+.3*s);h.rotation.x=-.28;b.rotation.x=-.06;
    lL.rotation.set(-.35*j,0,.25*j);lR.rotation.set(-.35*j,0,-.25*j);tl.rotation.x=-.35;tl.rotation.y=.5*s;b.scale.y=1+.04*j;
  }else if(name==='dizzy'){w=t*3;
    rig.position.y=-.046;lL.rotation.set(-1.45,0,.32);lR.rotation.set(-1.45,0,-.32);
    b.rotation.x=-.14+.08*Math.sin(w);b.rotation.z=.1*Math.cos(w);h.rotation.z=.26*Math.sin(w+1);h.rotation.x=.16*Math.cos(w+1);
    aL.rotation.set(-.35,0,.6+.08*Math.sin(w));aR.rotation.set(-.35,0,-.6);tool.rotation.set(1.2,0,0);tl.rotation.y=.9;
    P.dizzyEyes.visible=true;P.stars.visible=true;P.stars.position.y=.4+.008*Math.sin(t*5);P.stars.rotation.y=t*3.2;
  }else{ /* idle */
    s=Math.sin(t*2);b.position.y=HIP+.003*s;b.scale.y=1+.015*s;h.rotation.y=.32*Math.sin(t*.8);h.rotation.z=.06*Math.sin(t*1.3);
    tl.rotation.y=.4*Math.sin(t*1.7);aL.rotation.x=.08*s;aR.rotation.x=-.08*s;
  }
  m.userData.pose=name;return m;
};

/* ---------- effects ---------- */
SS.fx={};
var _fx={};
function starShape(r){var sh=new THREE.Shape();for(var i=0;i<10;i++){var a=i/10*PI*2+PI/2,rr=i%2?r*.46:r;if(i)sh.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);else sh.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}return sh;}
/* dizzy stars: a ring of chunky stars; spin it with rotation.y */
SS.fx.stars=function(){
  if(!_fx.stars){var b=new Bld(2),g=new THREE.ExtrudeGeometry(starShape(.034),{depth:.012,bevelEnabled:false});g.translate(0,0,-.006);
    for(var i=0;i<4;i++){var a=i/4*PI*2;b.add(g,i%2?0xffe066:0xffc93a,null,[Math.cos(a)*.11,(i%2)*.022,Math.sin(a)*.11],[0,-a+PI/2,.3*(i%2?1:-1)],i%2?.8:1);}
    _fx.stars=b.geo();}
  var m=mesh(_fx.stars,glow(),false);m.name='fx_stars';return m;};
/* dust puff: call SS.fx.dustStep(puff, k) with k from 0 to 1 */
SS.fx.dust=function(){
  if(!_fx.dust){var b=new Bld(12),r=b.r;for(var i=0;i<7;i++){var a=i/7*PI*2+r(),d=.05+r()*.07;b.sph(.035+r()*.03,7,5,i%2?0xf0dcb8:0xe2c79c,null,[Math.cos(a)*d,.03+r()*.05,Math.sin(a)*d],null,[1,.8,1]);}_fx.dust=b.geo();}
  var m=mesh(_fx.dust,new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:.6,depthWrite:false}),false);m.receiveShadow=false;m.name='fx_dust';SS.fx.dustStep(m,.35);return m;};
SS.fx.dustStep=function(puff,k){k=k<0?0:(k>1?1:k);var s=.5+1.6*Math.sqrt(k);puff.scale.set(s,.6+k*1.2,s);puff.material.opacity=.65*(1-k)*(1-k)+.02;puff.visible=k<1;return puff;};
/* a point on a lobbed arc, k from 0 to 1 */
SS.fx.arcPoint=function(from,to,height,k,out){out=out||new THREE.Vector3();out.lerpVectors(from,to,k);out.y+=4*height*k*(1-k);return out;};
/* dotted aim arc: n dots in one mesh; move it with SS.fx.setArc */
SS.fx.arc=function(n,colour){
  n=n||14;var dot=new THREE.SphereGeometry(.022,6,4).toNonIndexed(),cnt=dot.attributes.position.count,pos=new Float32Array(cnt*3*n),g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));var m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:colour==null?0xfff3d0:colour,transparent:true,opacity:.95}));
  m.frustumCulled=false;m.name='fx_arc';m.userData={n:n,dot:dot.attributes.position.array,cnt:cnt};return m;};
SS.fx.setArc=function(arc,from,to,height,phase){
  var u=arc.userData,p=arc.geometry.attributes.position.array,v=new THREE.Vector3(),i,j,o=0;phase=((phase||0)%1+1)%1;
  for(i=0;i<u.n;i++){var k=(i+.5+phase)/(u.n+1);SS.fx.arcPoint(from,to,height,k,v);var s=.7+.5*(1-k);
    for(j=0;j<u.cnt;j++){p[o++]=v.x+u.dot[j*3]*s;p[o++]=v.y+u.dot[j*3+1]*s;p[o++]=v.z+u.dot[j*3+2]*s;}}
  arc.geometry.attributes.position.needsUpdate=true;return arc;};
/* cork projectile; flies along +z */
SS.fx.cork=function(){
  if(!_fx.cork){var b=new Bld(13);b.cyl(.03,.024,.055,10,CORK,'wood',[0,0,0],[PI/2,0,0]);b.cyl(.031,.031,.008,10,shade(CORK,.82),null,[0,0,.02],[PI/2,0,0]);
    for(var i=0;i<6;i++){var a=i*1.1;b.sph(.005,4,3,shade(CORK,.7),null,[Math.cos(a)*.026,Math.sin(a)*.026,-.02+i*.007]);}_fx.cork=b.geo();}
  var m=mesh(_fx.cork);m.name='fx_cork';return m;};
/* toy marble with a swirl; colour is a hex number or a team name */
var MARBLES=[0x2f6fe6,0xd4502c,0x4c9a3c,0xf2c230,0xf4f0e6,0x8a4fc0];
SS.fx.marble=function(colour){
  if(typeof colour==='string')colour=PAL[colour]?PAL[colour].main:MARBLES[0];if(colour==null)colour=MARBLES[0];
  var key='marble'+colour;if(!_fx[key]){var b=new Bld(14);b.sph(.034,12,9,colour,null);
    var c=b.C,p=b.P,w=lin(0xffffff);for(var i=0;i<p.length;i+=3){var a=Math.atan2(p[i+2],p[i])+p[i+1]*60;if(Math.sin(a*2)>.72){c[i]=w[0];c[i+1]=w[1];c[i+2]=w[2];}}
    _fx[key]=b.geo();}
  var m=mesh(_fx[key],gloss());m.name='projectile_marble';return m;};

/* ---------- cloth: flags that wave ---------- */
var _flagTex={};
function drawMark(g,team,x,y,s,col){g.save();g.translate(x,y);g.fillStyle=col;g.strokeStyle=col;g.lineJoin='round';
  if(team==='blue'){g.rotate(.6);g.beginPath();g.ellipse(0,0,s*.3,s*.95,0,0,6.3);g.fill();g.strokeStyle='rgba(47,111,230,.9)';g.lineWidth=s*.07;g.beginPath();g.moveTo(0,-s*.9);g.lineTo(0,s*1.25);g.stroke();
    g.lineWidth=s*.035;for(var i=-3;i<=3;i++){g.beginPath();g.moveTo(0,i*s*.22);g.lineTo(s*.26,i*s*.22-s*.16);g.moveTo(0,i*s*.22);g.lineTo(-s*.26,i*s*.22-s*.16);g.stroke();}
    g.strokeStyle=col;g.lineWidth=s*.08;g.beginPath();g.moveTo(0,s*.9);g.lineTo(0,s*1.25);g.stroke();}
  else if(team==='red'){for(var k=0;k<8;k++){g.save();g.rotate(k/8*6.283);g.fillRect(-s*.2,-s*1.02,s*.4,s*.5);g.restore();}g.beginPath();g.arc(0,0,s*.74,0,6.3);g.fill();
    g.globalCompositeOperation='destination-out';g.beginPath();g.arc(0,0,s*.3,0,6.3);g.fill();}
  else if(team==='green'){for(var j=0;j<3;j++){var yy=-s*.95+j*s*.5,w=s*(.45+j*.22);g.beginPath();g.moveTo(0,yy);g.lineTo(w,yy+s*.75);g.lineTo(-w,yy+s*.75);g.closePath();g.fill();}g.fillRect(-s*.13,s*.75,s*.26,s*.35);}
  else{g.beginPath();for(var q=0;q<10;q++){var a=q/10*6.283-1.571,rr=q%2?s*.45:s;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fill();}
  g.restore();}
function flagTex(team){
  if(_flagTex[team])return _flagTex[team];
  var c=document.createElement('canvas');c.width=256;c.height=160;var g=c.getContext('2d'),r=rng(hash('flag'+team)),i;
  var T=PAL[team],base=T?'#'+('00000'+T.main.toString(16)).slice(-6):'#f4efe4';
  /* the mark is cut on its own canvas first, so the cog hole shows cloth */
  var mc=document.createElement('canvas');mc.width=256;mc.height=160;drawMark(mc.getContext('2d'),team,128,80,T?46:34,T?'#fff6e2':'rgba(120,100,70,.55)');
  g.fillStyle=base;g.fillRect(0,0,256,160);
  for(i=0;i<40;i++){g.fillStyle=r()<.5?'rgba(255,255,255,.07)':'rgba(0,0,0,.07)';g.fillRect(0,r()*160,256,2+r()*8);}
  g.drawImage(mc,0,0);
  for(i=0;i<256;i+=3){g.fillStyle='rgba(0,0,0,.07)';g.fillRect(i,0,1,160);}for(i=0;i<160;i+=3){g.fillStyle='rgba(255,255,255,.06)';g.fillRect(0,i,256,1);}
  g.strokeStyle=T?'rgba(255,246,226,.85)':'rgba(120,100,70,.5)';g.lineWidth=3;g.setLineDash([9,6]);g.strokeRect(9,9,238,142);
  var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return (_flagTex[team]=t);}
SS.flagTexture=flagTex;
var _flagMat={};
function cloth(w,h,team,ownMat){
  var g=new THREE.PlaneGeometry(w,h,10,4);g.translate(w/2,0,0);
  var m=ownMat?new THREE.MeshStandardMaterial({map:flagTex(team),side:THREE.DoubleSide,roughness:.9}):(_flagMat[team]||(_flagMat[team]=new THREE.MeshStandardMaterial({map:flagTex(team),side:THREE.DoubleSide,roughness:.9})));
  var o=new THREE.Mesh(g,m);o.castShadow=true;o.receiveShadow=false;o.name='cloth';o.userData={w:w,base:Float32Array.from(g.attributes.position.array)};waveCloth(o,0);return o;}
function waveCloth(o,t){var p=o.geometry.attributes.position,b=o.userData.base,w=o.userData.w;
  for(var i=0;i<p.count;i++){var x=b[i*3],y=b[i*3+1],k=x/w;p.setZ(i,Math.sin(x*11-t*5)*.03*k*1.6+Math.sin(x*5+y*8-t*3.1)*.012*k);p.setY(i,y-k*k*.025+Math.sin(x*9-t*5+1)*.006*k);}
  p.needsUpdate=true;o.geometry.computeVertexNormals();}
/* wave the cloth of a flag piece, a hill, or anything that holds them */
SS.wave=function(obj,t){if(obj.userData&&obj.userData.cloth){waveCloth(obj.userData.cloth,t+(obj.userData.phase||0));return;}obj.traverse(function(o){if(o.name==='cloth'&&o.userData.base)waveCloth(o,t);});};

/* ---------- the flag hill ---------- */
var HILL_R=.62,HILL_H=.26,_hillGeo=null;
function hillY(r){var k=r/HILL_R;return k>=1?0:HILL_H*Math.sqrt(1-k*k);}
SS.hillHeight=function(x,z){return hillY(Math.sqrt(x*x+z*z));};
SS.hill=function(opts){
  opts=opts||{};var root=new THREE.Group();root.name='hill';
  if(!_hillGeo){var b=new Bld(77),r=b.r,i,a,d,y;
    /* grass dome with patchy greens */
    b.add(new THREE.SphereGeometry(HILL_R,24,8,0,PI*2,0,PI/2),0x86a84e,'grass',null,null,[1,HILL_H/HILL_R,1]);
    var hb=b.sub.grass||b,C=SS.texOn?[]:hb.C,Pp=hb.P,ca=lin(0x7fa247),cb=lin(0x9bb45a),cc=lin(0x6f9440);for(i=0;i<C.length;i+=3){var px=Pp[i],pz=Pp[i+2],w1=.5+.5*Math.sin(px*9+pz*4)*Math.cos(pz*7-px*3),w2=Math.max(0,1-Pp[i+1]/HILL_H*1.6);
      for(var k=0;k<3;k++)C[i+k]=(ca[k]*(1-w1)+cb[k]*w1)*(1-w2*.6)+cc[k]*w2*.6;}
    b.cyl(HILL_R+.06,HILL_R+.11,.012,24,0x6f9440,'grass',[0,.004,0]);
    /* stone ring */
    for(i=0;i<15;i++){a=i/15*PI*2+r()*.1;var sr=.075+r()*.04;b.add(new THREE.DodecahedronGeometry(sr),jit(b,[0xbdb7aa,0xa9a498,0xcac4b6][i%3],.06),'cloth',[Math.cos(a)*(HILL_R+.02),sr*.45,Math.sin(a)*(HILL_R+.02)],[r()*3,r()*3,r()*3],[1.15,.8,1],true);}
    for(i=0;i<9;i++){a=r()*PI*2;d=HILL_R+.14+r()*.22;b.add(new THREE.DodecahedronGeometry(.025+r()*.03),jit(b,0xb3ad9f,.08),null,[Math.cos(a)*d,.012,Math.sin(a)*d],[r()*3,r()*3,0],[1,.6,1],true);}
    for(i=0;i<5;i++){a=r()*PI*2;d=.2+r()*.3;b.add(new THREE.DodecahedronGeometry(.03+r()*.025),jit(b,0xbdb7aa,.06),null,[Math.cos(a)*d,hillY(d)+.005,Math.sin(a)*d],[r()*3,r()*3,0],[1,.6,1],true);}
    /* daisies and grass tufts */
    for(i=0;i<14;i++){a=r()*PI*2;d=.1+r()*.44;y=hillY(d);var x=Math.cos(a)*d,z=Math.sin(a)*d;
      b.cyl(.003,.003,.03,4,0x3f7d2e,null,[x,y+.012,z]);b.push([x,y+.03,z],[(r()-.5)*.5,r()*3,(r()-.5)*.5]);
      for(var q=0;q<6;q++){var pa=q/6*PI*2;b.sph(.011,5,3,0xffffff,null,[Math.cos(pa)*.014,0,Math.sin(pa)*.014],[0,-pa,0],[1.3,.3,.7]);}b.sph(.008,6,4,0xf7c531,null,[0,.003,0],null,[1,.7,1]);b.pop();}
    for(i=0;i<26;i++){a=r()*PI*2;d=.08+r()*.52;y=hillY(d);for(var t2=0;t2<3;t2++)b.cone(.007,.04+r()*.03,3,[0x5f8a38,0x9cbc5c][t2%2],null,[Math.cos(a)*d+(t2-1)*.012,y+.018,Math.sin(a)*d+(r()-.5)*.02],[(r()-.5)*.6,0,(r()-.5)*.6]);}
    /* pole on a little cairn */
    b.cyl(.021,.027,1.02,8,0x9a6a3c,'wood',[0,HILL_H+.5,0]);b.sph(.034,8,6,GOLD,null,[0,HILL_H+1.03,0]);
    for(i=0;i<5;i++){a=i/5*PI*2;b.add(new THREE.DodecahedronGeometry(.05),jit(b,0xbdb7aa,.08),'rust',[Math.cos(a)*.05,HILL_H+.01,Math.sin(a)*.05],[r()*3,r()*3,0],[1,.75,1],true);}
    lash(b,[0,HILL_H+.72,0],.026,0xd2ad6e);lash(b,[0,HILL_H+.98,0],.024,0xd2ad6e);
    _hillGeo=b.geo();}
  root.add(mesh(_hillGeo));
  var fl=cloth(.52,.3,'hill',true);fl.position.set(.02,HILL_H+.85,0);root.add(fl);
  var ring=new THREE.Mesh(new THREE.RingGeometry(1.0,1.03,48),new THREE.MeshBasicMaterial({color:0xfff3d0,transparent:true,opacity:.55,depthWrite:false}));ring.rotation.x=-PI/2;ring.position.y=.004;ring.name='ring';root.add(ring);
  root.userData={cloth:fl,ring:ring,radius:1.0,top:HILL_H,colA:new THREE.Color(PAL[opts.b||'red'].main).convertSRGBToLinear(),colB:new THREE.Color(PAL[opts.a||'blue'].main).convertSRGBToLinear(),neutral:new THREE.Color(0xf6efe0).convertSRGBToLinear(),sA:new THREE.Color(PAL[opts.b||'red'].main),sB:new THREE.Color(PAL[opts.a||'blue'].main)};
  SS.setHill(root,opts.share==null?.5:opts.share);return root;};
/* blueShare 1 = all blue, 0 = all the other team, .5 = nobody's (plain cloth) */
SS.setHill=function(hill,blueShare){
  var u=hill.userData,k=blueShare<0?0:(blueShare>1?1:blueShare),c=u.cloth.material.color;
  c.copy(u.neutral).convertLinearToSRGB();if(k>=.5)c.lerp(u.sB,Math.pow((k-.5)*2,.5));else c.lerp(u.sA,Math.pow((.5-k)*2,.5));c.convertSRGBToLinear();
  u.ring.material.color.copy(c).lerp(u.neutral,.5);u.share=k;return hill;};

/* ---------- kit pieces ----------
   A piece is a group. Structural pieces (wall, gate, tower, tent) are made of separately named
   part meshes, each with userData.partId, so the game can knock single parts off.
   While a piece is whole it is drawn as one merged mesh (SS.solid(piece,true), the default);
   call SS.solid(piece,false) to switch to the separate parts. */
var _kits={},BUILD={};
function Kit(key){this.key=key;this.parts=[];this.d=new Bld(hash(key));this.r=this.d.r;this.after=null;this.solidGeo=null;}
Kit.prototype.part=function(id,fn){var b=new Bld(hash(this.key+id));fn(b,b.r);var g=b.geo(true);this.parts.push({id:id,geo:g,pos:g.userData.centre});return this;};
Bld.prototype.tri=function(p,q,r,col,tile,thick){var g=new THREE.BufferGeometry(),n=new THREE.Vector3().subVectors(new THREE.Vector3(q[0],q[1],q[2]),new THREE.Vector3(p[0],p[1],p[2])).cross(new THREE.Vector3().subVectors(new THREE.Vector3(r[0],r[1],r[2]),new THREE.Vector3(p[0],p[1],p[2]))).normalize().multiplyScalar(thick||.012);
  var P=[p[0],p[1],p[2],q[0],q[1],q[2],r[0],r[1],r[2], p[0]-n.x,p[1]-n.y,p[2]-n.z,r[0]-n.x,r[1]-n.y,r[2]-n.z,q[0]-n.x,q[1]-n.y,q[2]-n.z];
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.5,1,0,0,.5,1,1,0],2));return this.add(g,col,tile,null,null,null,true);};
function sheet(b,w,h,col,pos,rot){b.push(pos,rot);b.box(w,h,.014,col,'rust');var n=Math.max(2,Math.round(w/.04));for(var i=0;i<n;i++)b.box(.014,h,.026,shade(col,.9),'rust',[(i-(n-1)/2)*(w/n),0,0]);b.pop();}
function logp(b,r,len,T,pos,rot,n){b.push(pos,rot);b.cyl(r,r*1.07,len,n||8,jit(b,T.wood2,.1),'wood');b.cyl(r*.86,r*.86,len+.006,n||8,T.end||0xe6c88e,null);b.tor(r*.5,r*.07,shade(T.end||0xe6c88e,.8),null,[0,len/2+.0035,0],[PI/2,0,0],null,null,8);b.pop();}
function leaves(b,n,cx,cy,cz,spread,T){for(var i=0;i<n;i++){var r=b.r;b.sph(.03+r()*.014,5,3,[T.main,T.light,T.dark][i%3],null,[cx+(r()-.5)*spread[0],cy+(r()-.5)*spread[1],cz+(r()-.5)*spread[2]],[r()*3,r()*3,r()*3],[1,.28,.62]);}}
function nails(b,list,col){for(var i=0;i<list.length;i++)b.box(.012,.012,.008,col||0x6a6460,null,list[i]);}

SS.piece=function(kind,team,opts){
  opts=opts||{};team=PAL[team]?team:'blue';var v=opts.variant|0,key=kind+'|'+team+'|'+v,K=_kits[key];
  if(!BUILD[kind])throw new Error('SS.piece: unknown kind '+kind);
  if(!K){K=new Kit(key);K.after=BUILD[kind](K,team,PAL[team],v)||null;K.decoGeo=K.d.P.length?K.d.geo():null;_kits[key]=K;}
  var root=new THREE.Group(),i,M=mat();root.name=kind;root.userData={kind:kind,team:team,variant:v,parts:[],kit:K,solid:false};
  for(i=0;i<K.parts.length;i++){var p=K.parts[i],m=mesh(p.geo,M);m.name=p.id;m.position.set(p.pos[0],p.pos[1],p.pos[2]);m.userData={partId:p.id,home:p.pos.slice()};root.add(m);root.userData.parts.push(m);}
  if(K.decoGeo){var d=mesh(K.decoGeo,M);d.name='deco';root.add(d);root.userData.deco=d;}
  if(K.after)K.after(root,opts);
  if(K.parts.length&&opts.solid!==false)SS.solid(root,true);
  return root;};
SS.parts=function(piece){return piece.userData&&piece.userData.parts?piece.userData.parts.slice():[];};
SS.solid=function(piece,on){
  var u=piece.userData,K=u.kit,i;if(!K||!K.parts.length)return piece;
  if(on&&!u.solidMesh){if(!K.solidGeo){var b=new Bld(1);for(i=0;i<K.parts.length;i++)b.raw(K.parts[i].geo,K.parts[i].pos);if(K.decoGeo)b.raw(K.decoGeo);K.solidGeo=b.geo();}
    u.solidMesh=mesh(K.solidGeo);u.solidMesh.name='solid';piece.add(u.solidMesh);}
  if(u.solidMesh)u.solidMesh.visible=!!on;for(i=0;i<u.parts.length;i++)u.parts[i].visible=!on;if(u.deco)u.deco.visible=!on;u.solid=!!on;return piece;};

/* wall: about .86 wide and .45 tall */
BUILD.wall=function(K,team,T,v){
  var r=K.r,i,n,x,h;
  if(team==='blue'){n=7;
    for(i=0;i<n;i++)(function(i){var hh=.37+r()*.1,tilt=(r()-.5)*.09,painted=(i+v)%3===1,xx=(i-(n-1)/2)*.118;
      K.part('wall.plank.'+i,function(b){var col=painted?jit(b,T.main,.06):jit(b,i%2?T.wood:T.wood2,.07);b.push([xx,0,0],[0,0,tilt]);
        b.box(.108,hh,.045,col,painted?'paint':'wood',[0,hh/2,0]);b.prism(.108,.045,.045,col,painted?'paint':'wood',[0,hh,0]);
        nails(b,[[0,.12,.024],[0,.3,.024]]);if(i===3&&v!==1)mark(b,'blue',.15,[0,.24,.03]);b.pop();});})(i);
    K.part('wall.rail.top',function(b){b.box(n*.118+.02,.04,.03,T.woodD,'woodh',[0,.3,-.036]);});
    K.part('wall.rail.low',function(b){b.box(n*.118+.02,.04,.03,T.woodD,'woodh',[0,.12,-.036]);});
    [-1,1].forEach(function(s){K.part('wall.post.'+(s<0?'L':'R'),function(b){var px=s*(n*.059+.035);b.cyl(.034,.04,.5,8,T.wood2,'wood',[px,.25,-.01]);b.dome(.034,8,4,T.main,'paint',[px,.5,-.01]);lash(b,[px,.3,-.01],.04,T.rope);lash(b,[px,.12,-.01],.042,T.rope);});});
  }else if(team==='red'){n=5;var ws=[.19,.15,.2,.14,.18],xs=-.43,cols=[T.main,TIN,T.rust,T.main,TIN];
    for(i=0;i<n;i++)(function(i){var hh=.34+r()*.13,tilt=(r()-.5)*.08,xx=xs+ws[i]/2,w=ws[i];xs+=w;
      K.part('wall.plank.'+i,function(b){var col=jit(b,cols[(i+v)%5],.06);sheet(b,w-.006,hh,col,[xx,hh/2,0],[0,0,tilt]);
        nails(b,[[xx-w*.3,.12,.016],[xx+w*.3,.12,.016],[xx-w*.3,.3,.016],[xx+w*.3,.3,.016]],0x5a4a40);
        if(i===2&&v!==1)mark(b,'red',.16,[xx,.22,.03],[0,0,.2]);if(i===1)b.box(.07,.06,.006,T.rust,'rust',[xx,.2,.02],[0,0,.2]);});})(i);
    K.part('wall.rail.top',function(b){b.cyl(.016,.016,.9,6,shade(TIN,.8),'rust',[0,.3,-.03],[0,0,PI/2]);});
    K.part('wall.rail.low',function(b){b.box(.88,.035,.025,T.wood2,'woodh',[0,.11,-.03]);});
    [-1,1].forEach(function(s){K.part('wall.post.'+(s<0?'L':'R'),function(b){var px=s*.45;b.cyl(.03,.03,.5,8,T.dark,'rust',[px,.25,-.01]);b.cyl(.038,.038,.02,8,TIN,'rust',[px,.5,-.01]);b.cyl(.04,.04,.03,8,TIN,'rust',[px,.015,-.01]);});});
  }else{n=7;
    for(i=0;i<n;i++)(function(i){var hh=.36+r()*.1,tilt=(r()-.5)*.07,xx=(i-(n-1)/2)*.118,rad=.052+r()*.008;
      K.part('wall.plank.'+i,function(b){b.push([xx,0,0],[0,0,tilt]);b.cyl(rad,rad*1.06,hh,8,jit(b,i%2?T.wood:T.wood2,.09),'wood',[0,hh/2,0]);b.cone(rad,.07,8,T.end,'wood',[0,hh+.035,0]);
        if(i===3&&v!==1)mark(b,'green',.15,[0,.24,.058]);if(i%3===0)leaves(b,2,0,hh*.8,.05,[.06,.08,.02],T);b.pop();});})(i);
    K.part('wall.rail.top',function(b){logp(b,.024,.88,T,[0,.3,-.07],[0,0,PI/2]);});
    K.part('wall.rail.low',function(b){logp(b,.024,.88,T,[0,.12,-.07],[0,0,PI/2]);b.tube([[-.4,.1,.06],[-.25,.16,.062],[-.1,.09,.065],[.08,.17,.062],[.24,.1,.064],[.4,.15,.06]],.008,T.dark,null,14,4);leaves(b,6,0,.13,.066,[.8,.08,.01],T);});
    [-1,1].forEach(function(s){K.part('wall.post.'+(s<0?'L':'R'),function(b){var px=s*(n*.059+.045);b.cyl(.04,.046,.52,8,T.woodD,'wood',[px,.26,-.01]);b.cone(.04,.06,8,T.end,'wood',[px,.55,-.01]);lash(b,[px,.3,-.01],.046,T.rope);lash(b,[px,.12,-.01],.048,T.rope);});});
  }
};

/* gate: two posts, a lintel with the team mark, double doors with the left one ajar */
BUILD.gate=function(K,team,T,v){
  var metal=team==='red';
  [-1,1].forEach(function(s){K.part('gate.post.'+(s<0?'L':'R'),function(b){var px=s*.38;
    if(team==='green'){b.cyl(.055,.065,.66,8,T.woodD,'wood',[px,.33,0]);b.cone(.055,.08,8,T.end,'wood',[px,.7,0]);lash(b,[px,.5,0],.062,T.rope);leaves(b,3,px,.6,.05,[.08,.1,.04],T);}
    else if(metal){b.cyl(.05,.05,.64,10,T.main,'rust',[px,.32,0]);b.tor(.052,.008,TIN,'rust',[px,.2,0],[PI/2,0,0]);b.tor(.052,.008,TIN,'rust',[px,.46,0],[PI/2,0,0]);b.cyl(.06,.06,.03,10,TIN,'rust',[px,.655,0]);}
    else{b.box(.1,.64,.1,T.wood2,'wood',[px,.32,0]);b.box(.12,.05,.12,T.main,'paint',[px,.665,0]);b.prism(.12,.05,.12,T.main,'paint',[px,.69,0]);lash(b,[px,.48,0],.07,T.rope);}});});
  K.part('gate.lintel',function(b){
    if(team==='green'){logp(b,.045,.96,T,[0,.6,0],[0,0,PI/2]);mark(b,'green',.2,[0,.6,.06]);b.tube([[-.4,.56,.04],[-.2,.5,.05],[0,.54,.05],[.2,.5,.05],[.4,.56,.04]],.008,T.dark,null,12,4);leaves(b,7,0,.53,.05,[.8,.06,.02],T);}
    else if(metal){b.box(.96,.07,.06,T.wood2,'woodh',[0,.6,0]);sheet(b,.5,.1,T.rust,[0,.6,.035],[0,0,.03]);mark(b,'red',.2,[0,.68,.05],[0,0,.3]);}
    else{b.box(.96,.075,.07,T.woodD,'woodh',[0,.6,0]);b.box(.3,.16,.02,T.wood,'wood',[0,.66,.04]);mark(b,'blue',.14,[0,.66,.056]);}});
  [-1,1].forEach(function(s){K.part('gate.door.'+(s<0?'L':'R'),function(b){
    b.push([s*.325,0,.01],[0,s<0?-.55:.12,0]);var dir=-s; /* door grows from its hinge toward the middle */
    for(var i=0;i<3;i++){var xx=dir*(.055+i*.105),hh=.47-(i===2?.0:.0);
      if(team==='green')b.cyl(.05,.053,hh,8,jit(b,i%2?T.wood:T.wood2,.08),'wood',[xx,hh/2+.02,0]);
      else if(metal)sheet(b,.1,hh,jit(b,i===1?TIN:T.main,.06),[xx,hh/2+.02,0]);
      else b.box(.1,hh,.035,i===1?jit(b,T.main,.05):jit(b,T.wood,.08),i===1?'paint':'wood',[xx,hh/2+.02,0]);}
    b.box(.31,.03,.016,metal?TIN:T.woodD,metal?'rust':'woodh',[dir*.16,.12,.03]);b.box(.31,.03,.016,metal?TIN:T.woodD,metal?'rust':'woodh',[dir*.16,.4,.03]);
    b.box(.03,.33,.014,metal?TIN:T.woodD,metal?'rust':'wood',[dir*.16,.26,.03],[0,0,dir*.72]);
    b.tor(.02,.005,metal?0x5a4a40:GOLD,null,[dir*.27,.26,.045]);b.pop();});});
  [-1,1].forEach(function(s){K.part('gate.brace.'+(s<0?'L':'R'),function(b){b.rod([s*.38,.42,-.04],[s*.42,0,-.3],.02,team==='red'?shade(TIN,.8):T.wood2,team==='red'?'rust':'wood',6);});});
};

/* tower: four posts, braces, a floor, rails, a four-piece roof, a ladder and a lantern */
BUILD.tower=function(K,team,T,v){
  var metal=team==='red',logs=team==='green',postCol=logs?T.woodD:(metal?T.wood2:T.wood2);
  var C={NE:[1,-1],NW:[-1,-1],SE:[1,1],SW:[-1,1]},k;
  for(k in C)(function(id,q){K.part('tower.post.'+id,function(b){b.rod([q[0]*.23,0,q[1]*.23],[q[0]*.17,.98,q[1]*.17],logs?.034:.028,postCol,'wood',logs?8:6);
    lash(b,[q[0]*.193,.6,q[1]*.193],logs?.04:.034,T.rope);if(metal)b.cyl(.04,.04,.03,8,TIN,'rust',[q[0]*.23,.015,q[1]*.23]);});})(k,C[k]);
  var S={N:[0,-1],S:[0,1],W:[-1,0],E:[1,0]};
  for(k in S)(function(id,q,idx){K.part('tower.brace.'+id,function(b){var a,c,f=idx%2?1:-1;
    if(q[0]===0){a=[-.215*f,.08,q[1]*.225];c=[.19*f,.54,q[1]*.2];}else{a=[q[0]*.225,.08,-.215*f];c=[q[0]*.2,.54,.19*f];}
    b.rod(a,c,.016,metal?shade(TIN,.8):T.woodD,metal?'rust':'wood',5);});})(k,S[k],{N:0,S:1,W:2,E:3}[k]);
  K.part('tower.floor',function(b){for(var i=0;i<4;i++)b.box(.115,.035,.47,jit(b,i%2?T.wood:T.wood2,.07),'wood',[(i-1.5)*.118,.6,0]);b.box(.5,.03,.04,T.woodD,'woodh',[0,.575,.2]);b.box(.5,.03,.04,T.woodD,'woodh',[0,.575,-.2]);});
  [['N',0,-.215,0],['S',0,.215,0],['W',-.215,0,1]].forEach(function(q){K.part('tower.rail.'+q[0],function(b){b.push([q[1],.7,q[2]],[0,q[3]?PI/2:0,0]);
    if(metal)sheet(b,.4,.15,q[0]==='S'?T.main:TIN,[0,0,0]);else if(logs){logp(b,.02,.42,T,[0,.05,0],[0,0,PI/2]);logp(b,.02,.42,T,[0,-.035,0],[0,0,PI/2]);}
    else{b.box(.4,.15,.022,q[0]==='S'?T.main:T.wood,q[0]==='S'?'paint':'woodh');b.box(.42,.022,.035,T.woodD,'woodh',[0,.08,0]);}
    if(q[0]==='S')mark(b,team,.13,[0,0,.03]);if(logs&&q[0]!=='N')leaves(b,4,0,.02,.02,[.36,.1,.02],T);b.pop();});});
  /* roof: four panels and a cap */
  var ry=.95,rh=.26,rw=.36,ap=[0,ry+rh,0],cn={N:[[rw,ry,-rw],[-rw,ry,-rw]],S:[[-rw,ry,rw],[rw,ry,rw]],E:[[rw,ry,rw],[rw,ry,-rw]],W:[[-rw,ry,-rw],[-rw,ry,rw]]};
  for(k in cn)(function(id,e,idx){K.part('tower.roof.'+id,function(b){var col=metal?(idx%2?T.rust:T.main):(logs?(idx%2?T.main:T.dark):(idx%2?T.cloth:shade(T.cloth,.93)));
    b.tri(e[0],e[1],ap,col,metal?'rust':'cloth',.016);
    var mx=(e[0][0]+e[1][0])/2,mz=(e[0][2]+e[1][2])/2;
    if(logs){for(var i=0;i<7;i++){var u=b.r()*.8,w=.08+b.r()*.84;b.sph(.045,5,3,[T.main,T.light,T.dark][i%3],null,[(e[0][0]+(e[1][0]-e[0][0])*w)*(1-u),ry+rh*u+.015,(e[0][2]+(e[1][2]-e[0][2])*w)*(1-u)],[b.r()*3,b.r()*3,0],[1,.3,.7]);}}
    else if(!metal){b.rod(e[0],e[1],.012,T.main,'cloth',5);}
    else{b.rod(e[0],e[1],.01,TIN,'rust',5);}
    b.rod([e[0][0],ry,e[0][2]],ap,.011,metal?TIN:(logs?T.woodD:T.main),null,4);});})(k,cn[k],{N:0,S:2,E:1,W:3}[k]);
  K.part('tower.roof.cap',function(b){if(metal){b.cyl(.02,.03,.1,6,TIN,'rust',[0,ry+rh+.03,0]);mark(b,'red',.11,[0,ry+rh+.12,0],[0,.5,0]);}
    else if(logs){b.cone(.05,.1,6,T.dark,null,[0,ry+rh+.03,0]);leaves(b,4,0,ry+rh,0,[.1,.05,.1],T);}
    else{b.cyl(.008,.008,.16,5,T.woodD,null,[0,ry+rh+.07,0]);b.sph(.022,7,5,GOLD,null,[0,ry+rh+.15,0]);b.tri([0,ry+rh+.13,0],[.13,ry+rh+.1,0],[0,ry+rh+.06,0],T.main,'cloth',.006);}
    /* the tie beams the roof sits on */
    b.box(.72,.03,.03,T.woodD,'woodh',[0,ry-.01,.17]);b.box(.72,.03,.03,T.woodD,'woodh',[0,ry-.01,-.17]);});
  K.part('tower.ladder',function(b){b.push([.47,0,.02],[0,0,.3]);b.box(.018,.68,.024,T.wood2,'wood',[0,.34,-.06]);b.box(.018,.68,.024,T.wood2,'wood',[0,.34,.06]);
    for(var i=0;i<6;i++)b.box(.014,.016,.13,T.wood,'wood',[0,.07+i*.105,0]);b.pop();});
  /* lantern bracket and frame; the glowing glass is its own mesh */
  var lx=-.2,ly=.83,lz=.31;
  K.d.rod([-.185,.9,.185],[lx,.92,lz],.01,T.woodD,null,4);K.d.rod([lx,.92,lz],[lx,ly+.04,lz],.003,0x4a3a2a,null,3);
  K.d.cone(.034,.025,6,metal?shade(TIN,.7):0x6a4a22,null,[lx,ly+.035,lz]);K.d.cyl(.03,.03,.008,6,metal?shade(TIN,.7):0x6a4a22,null,[lx,ly-.03,lz]);
  for(var i=0;i<4;i++){var a=i/4*PI*2+.4;K.d.cyl(.003,.003,.058,3,0x4a3a2a,null,[lx+Math.cos(a)*.027,ly,lz+Math.sin(a)*.027]);}
  var gb=new Bld(5);gb.cyl(.024,.026,.056,6,0xffc860,null,[0,0,0]);gb.cyl(.016,.018,.058,6,0xfff2c0,null,[0,0,0]);var glowGeo=gb.geo();
  return function(root,opts){var g=mesh(glowGeo,glow(),false);g.name='lantern';g.position.set(lx,ly,lz);root.add(g);root.userData.lantern=g;root.userData.stand=new THREE.Vector3(0,.618,0);
    if(opts.light){var L=new THREE.PointLight(0xffb45a,opts.light===true?.9:opts.light,2.2,2);L.position.set(lx,ly,lz);L.name='lantern_light';root.add(L);root.userData.light=L;}};
};

function wheel(b,r,team,T){ /* a wheel in the yz plane, axle along x, centred on the origin */
  if(team==='red'){b.cyl(r*.82,r*.82,.035,12,TIN,'rust',null,[0,0,PI/2]);for(var i=0;i<8;i++){var a=i/8*PI*2;b.box(.035,r*.3,r*.42,TIN,'rust',[0,Math.cos(a)*r*.9,Math.sin(a)*r*.9],[a,0,0]);}b.cyl(r*.3,r*.3,.05,8,T.main,'rust',null,[0,0,PI/2]);}
  else if(team==='green'){b.cyl(r,r,.05,12,T.wood2,'wood',null,[0,0,PI/2]);b.cyl(r*.86,r*.86,.054,12,T.end,null,null,[0,0,PI/2]);b.tor(r*.5,r*.05,shade(T.end,.8),null,[.028,0,0],[0,PI/2,0]);b.tor(r*.5,r*.05,shade(T.end,.8),null,[-.028,0,0],[0,PI/2,0]);b.cyl(r*.18,r*.18,.07,6,T.woodD,null,null,[0,0,PI/2]);}
  else{b.cyl(r*.9,r*.9,.03,14,T.wood,'wood',null,[0,0,PI/2]);b.tor(r*.9,r*.11,T.main,'paint',null,[0,PI/2,0],null,null,14);for(var j=0;j<2;j++)b.box(.036,r*1.7,r*.2,T.wood2,'wood',null,[j*PI/2,0,0]);b.cyl(r*.26,r*.26,.06,8,T.dark,'paint',null,[0,0,PI/2]);b.sph(r*.1,5,4,GOLD,null,[.032,0,0]);b.sph(r*.1,5,4,GOLD,null,[-.032,0,0]);}
}
/* popgun: a toy cannon that fires corks. The 'barrel' child group tilts; userData.muzzle is the firing socket. */
BUILD.popgun=function(K,team,T,v){
  var b=K.d,i;
  if(team==='green'){logp(b,.04,.4,T,[-.07,.1,-.02],[PI/2,0,0]);logp(b,.04,.4,T,[.07,.1,-.02],[PI/2,0,0]);}
  else{b.box(.24,.05,.4,T.wood2,'wood',[0,.1,-.02]);b.box(.2,.03,.1,team==='red'?T.rust:T.main,team==='red'?'rust':'paint',[0,.135,-.16]);}
  b.cyl(.014,.014,.4,6,T.woodD,null,[0,.1,.06],[0,0,PI/2]);
  [-1,1].forEach(function(s){b.push([s*.17,.1,.06]);wheel(b,.1,team,T);b.pop();b.box(.03,.14,.05,T.woodD,'wood',[s*.085,.18,.02]);});
  b.box(.05,.05,.05,T.woodD,'wood',[0,.03,-.2]);
  /* a box of corks beside it */
  b.push([.3,0,-.08],[0,.4,0]);b.box(.16,.07,.12,T.wood,'wood',[0,.035,0]);b.box(.165,.016,.125,team==='red'?T.rust:T.main,team==='red'?'rust':'paint',[0,.066,0]);
  for(i=0;i<5;i++)b.cyl(.024,.019,.04,7,jit(b,CORK,.08),null,[-.045+(i%3)*.045,.085+((i/3)|0)*.012,-.025+((i/3)|0)*.05+(i%2)*.01],[b.r()*.4,0,b.r()*.4]);
  b.pop();
  var g=new Bld(hash(K.key+'barrel'));g.metalOK=true;
  if(team==='green'){g.cyl(.07,.08,.4,10,T.wood2,'wood',[0,0,.06],[PI/2,0,0]);g.cyl(.058,.058,.404,10,0x3a2a1c,null,[0,0,.06],[PI/2,0,0]);g.tor(.064,.012,T.end,null,[0,0,.262]);lash(g,[0,0,.1],.078,T.rope,'z');lash(g,[0,0,-.08],.082,T.rope,'z');leaves(g,3,0,.07,.0,[.06,.02,.2],T);}
  else if(team==='red'){g.cyl(.07,.07,.36,12,TIN,'rust',[0,0,.04],[PI/2,0,0]);for(i=0;i<4;i++)g.tor(.071,.007,i%2?T.main:shade(TIN,.8),'rust',[0,0,-.1+i*.095]);g.cyl(.1,.07,.07,12,T.main,'rust',[0,0,.25],[PI/2,0,0]);g.cyl(.085,.085,.01,12,0x3a2a1c,null,[0,0,.283],[PI/2,0,0]);g.cyl(.075,.075,.02,10,T.rust,'rust',[0,0,-.15],[PI/2,0,0]);}
  else{g.cyl(.062,.078,.4,12,T.wood,'wood',[0,0,.06],[PI/2,0,0]);g.cyl(.064,.064,.05,12,T.main,'paint',[0,0,.22],[PI/2,0,0]);g.cyl(.074,.074,.05,12,T.main,'paint',[0,0,-.02],[PI/2,0,0]);g.tor(.064,.012,T.dark,'paint',[0,0,.262]);g.cyl(.05,.05,.01,10,0x3a2a1c,null,[0,0,.262],[PI/2,0,0]);lash(g,[0,0,.1],.07,T.rope,'z');}
  /* cork in the muzzle, plunger at the back, trunnions */
  g.cyl(.046,.038,.06,10,CORK,null,[0,0,.285],[PI/2,0,0]);g.cyl(.012,.012,.12,6,T.woodD,null,[0,0,-.2],[PI/2,0,0]);g.sph(.032,8,6,team==='red'?T.main:(team==='green'?T.end:T.dark),null,[0,0,-.27]);
  g.cyl(.016,.016,.2,6,T.woodD,null,[0,0,0],[0,0,PI/2]);
  var barrelGeo=g.geo();
  return function(root){var bg=new THREE.Group();bg.name='barrel';bg.position.set(0,.24,.02);bg.rotation.x=-.38;bg.add(mesh(barrelGeo));root.add(bg);
    var mz=new THREE.Object3D();mz.name='socket_fire';mz.position.set(0,0,.33);bg.add(mz);var cr=new THREE.Object3D();cr.name='socket_crew';cr.position.set(0,0,-.42);root.add(cr);
    root.userData.barrel=bg;root.userData.muzzle=mz;};
};

/* the Marble Lobber. Children: recoil_pivot > lobber_carriage, lobber_wheel_L/R, lobber_crank, lobber_arm > lobber_cup > socket_fire;
   and on the root: ammo_bucket, socket_crew. Fires toward +z. */
var _lob={};
BUILD.lobber=function(K,team,T,v){
  var metal=team==='red',logs=team==='green',G={},b,i,trim=metal?T.rust:T.main,trimT=metal?'rust':'paint';
  /* carriage: a wide plank bed, axle, uprights with a padded stop bar, drum brackets, a tow tail */
  b=new Bld(hash(K.key+'c'));
  if(logs){for(i=0;i<3;i++)logp(b,.05,.62,T,[(i-1)*.115,.165,0],[PI/2,0,0]);}
  else{for(i=0;i<4;i++)b.box(.092,.035,.62-(i%3?0:.04),jit(b,i%2?T.wood:T.wood2,.07),'wood',[(i-1.5)*.096,.165,0]);
    b.box(.4,.03,.05,trim,trimT,[0,.185,.26]);b.box(.4,.03,.05,trim,trimT,[0,.185,-.26]);nails(b,[[-.15,.202,.26],[.15,.202,.26],[-.15,.202,-.26],[.15,.202,-.26]],metal?0x5a4a40:GOLD);}
  b.box(.42,.04,.06,T.woodD,'woodh',[0,.135,.02]);b.cyl(.016,.016,.56,6,metal?shade(TIN,.75):T.woodD,null,[0,.13,.02],[0,0,PI/2]);
  [-1,1].forEach(function(s){
    b.rod([s*.15,.18,.24],[s*.15,.46,.12],.022,T.wood2,'wood',6);b.rod([s*.15,.18,-.02],[s*.15,.4,.13],.016,T.woodD,'wood',5);
    lash(b,[s*.15,.44,.127],.027,T.rope);
    b.box(.03,.09,.05,T.woodD,'wood',[s*.14,.225,-.21]);                         /* drum brackets */
    b.box(.03,.07,.05,T.woodD,'wood',[s*.045,.215,.0]);                          /* arm pivot cheeks */
  });
  b.cyl(.028,.028,.34,8,T.cloth,'cloth',[0,.455,.122],[0,0,PI/2]);b.cyl(.016,.016,.4,6,T.woodD,null,[0,.455,.122],[0,0,PI/2]);   /* padded stop bar */
  lash(b,[-.07,.455,.122],.03,T.rope,'x');lash(b,[.07,.455,.122],.03,T.rope,'x');
  b.box(.05,.035,.2,T.wood2,'wood',[0,.14,-.38],[.25,0,0]);b.box(.07,.05,.05,T.woodD,'wood',[0,.03,-.47]);b.rod([0,.06,-.47],[0,.13,-.42],.012,T.woodD,null,5);
  /* winding drum with cord wraps, and the cord to the arm */
  b.cyl(.045,.045,.22,10,T.wood,'woodh',[0,.25,-.21],[0,0,PI/2]);b.cyl(.058,.058,.014,10,trim,trimT,[.105,.25,-.21],[0,0,PI/2]);b.cyl(.058,.058,.014,10,trim,trimT,[-.105,.25,-.21],[0,0,PI/2]);
  for(i=0;i<4;i++)b.tor(.048,.012,shade(T.rope,i%2?1:.9),null,[-.045+i*.03,.25,-.21],[0,PI/2,0],null,null,8);
  b.rod([0,.29,-.2],[0,.25,-.01],.006,T.rope,null,4);
  if(logs){b.tube([[-.17,.2,-.3],[-.18,.24,-.1],[-.17,.2,.1],[-.18,.24,.3]],.008,T.dark,null,10,4);leaves(b,6,-.18,.23,0,[.03,.05,.55],T);}
  if(metal){b.push([-.2,.3,.13],[0,PI/2,.4],.1);mark(b,'red',1,[0,0,0]);b.pop();sheet(b,.2,.1,T.main,[0,.19,.275],[-.1,0,0]);}
  if(team==='blue')mark(b,'blue',.11,[0,.2,.29]);
  G.carriage=b.geo();
  b=new Bld(hash(K.key+'w'));wheel(b,.13,team,T);G.wheel=b.geo();
  /* crank: turns about x */
  b=new Bld(hash(K.key+'k'));b.cyl(.012,.012,.07,6,metal?shade(TIN,.75):T.woodD,null,[.025,0,0],[0,0,PI/2]);b.box(.014,.1,.022,metal?TIN:T.wood2,metal?'rust':'wood',[.06,.04,0]);b.cyl(.013,.013,.07,6,trim,trimT,[.095,.085,0],[0,0,PI/2]);b.sph(.017,6,5,trim,null,[.13,.085,0]);G.crank=b.geo();
  /* arm: runs along +y from its pivot */
  b=new Bld(hash(K.key+'a'));
  if(logs)logp(b,.024,.5,T,[0,.23,0]);else{b.box(.04,.5,.034,T.wood,'wood',[0,.23,0]);b.box(.044,.1,.038,trim,trimT,[0,.36,0]);}
  b.cyl(.014,.014,.14,6,T.woodD,null,[0,0,0],[0,0,PI/2]);lash(b,[0,.03,0],.032,T.rope);lash(b,[0,.44,0],.03,T.rope);b.tor(.014,.005,GOLD,null,[0,.12,-.024],[0,PI/2,0],null,null,6);
  G.arm=b.geo();
  /* cup: opens toward +z of the arm */
  b=new Bld(hash(K.key+'u'));b.metalOK=true;
  if(metal){b.cyl(.066,.045,.06,10,TIN,'rust',[0,0,.03],[PI/2,0,0]);b.tor(.066,.007,T.main,'rust',[0,0,.06]);}
  else if(logs){b.cyl(.064,.05,.06,8,T.wood2,'wood',[0,0,.03],[PI/2,0,0]);b.tor(.062,.008,T.end,null,[0,0,.06]);}
  else{b.cyl(.064,.046,.06,10,T.wood2,'wood',[0,0,.03],[PI/2,0,0]);b.tor(.064,.008,T.main,'paint',[0,0,.06]);}
  b.cyl(.054,.054,.004,10,0x3a2a1c,null,[0,0,.059],[PI/2,0,0]);b.box(.05,.06,.012,T.woodD,'wood',[0,-.04,.006]);
  G.cup=b.geo();
  /* bucket of marbles */
  b=new Bld(hash(K.key+'b'));
  b.cyl(.085,.065,.11,12,metal?TIN:(logs?T.wood2:T.wood),metal?'rust':'wood',[0,.055,0]);b.tor(.085,.008,metal?T.main:trim,trimT,[0,.108,0],[PI/2,0,0]);b.tor(.072,.006,metal?shade(TIN,.7):T.rope,null,[0,.04,0],[PI/2,0,0]);
  b.cyl(.076,.076,.004,12,0x3a2a1c,null,[0,.1,0]);b.tor(.085,.005,0x5a4a40,null,[0,.108,0],[0,0,0],[1,1.05,1],PI,10);
  G.bucket=b.geo();
  b=new Bld(hash(K.key+'m'));var w=lin(0xffffff),mp=[[0,.118,0],[.04,.112,.02],[-.036,.112,.024],[.01,.112,-.042],[-.03,.11,-.03],[.012,.145,.004],[.13,.03,.05]];
  for(i=0;i<mp.length;i++){var st=b.P.length;b.sph(.03,7,5,MARBLES[i%MARBLES.length],null,mp[i],[i,i*2,0]);for(var q=st;q<b.P.length;q+=3){if(Math.sin((Math.atan2(b.P[q+2]-mp[i][2],b.P[q]-mp[i][0])+(b.P[q+1]-mp[i][1])*60)*2)>.72){b.C[q]=w[0];b.C[q+1]=w[1];b.C[q+2]=w[2];}}}
  G.marbles=b.geo();
  return function(root){
    function grp(name,parent,pos,geo,m){var g=new THREE.Group();g.name=name;if(pos)g.position.set(pos[0],pos[1],pos[2]);parent.add(g);if(geo)g.add(mesh(geo,m));return g;}
    var piv=grp('recoil_pivot',root),u=root.userData;
    u.pivot=piv;u.carriage=grp('lobber_carriage',piv,null,G.carriage);
    u.wheelL=grp('lobber_wheel_L',piv,[.26,.13,.02],G.wheel);u.wheelR=grp('lobber_wheel_R',piv,[-.26,.13,.02],G.wheel);u.wheelR.rotation.y=PI;
    u.crank=grp('lobber_crank',piv,[.125,.25,-.21],G.crank);
    u.arm=grp('lobber_arm',piv,[0,.215,0],G.arm);u.cup=grp('lobber_cup',u.arm,[0,.5,0],G.cup);
    var sf=new THREE.Object3D();sf.name='socket_fire';sf.position.set(0,0,.09);u.cup.add(sf);u.fire=sf;
    var sc=new THREE.Object3D();sc.name='socket_crew';sc.position.set(.42,0,-.22);sc.rotation.y=-PI/2;root.add(sc);u.crew=sc;
    var bk=grp('ammo_bucket',root,[-.4,0,.12],G.bucket);var mm=mesh(G.marbles,gloss());mm.name='marbles';bk.add(mm);u.bucket=bk;
    [[u.wheelL,'lobber.wheel.L'],[u.wheelR,'lobber.wheel.R'],[u.crank,'lobber.crank'],[bk,'lobber.bucket']].forEach(function(q){q[0].userData.partId=q[1];q[0].userData.home=q[0].position.toArray();u.parts.push(q[0]);});
    SS.lobberPose(root,0,0);};
};
/* pull 0..1 draws the arm back and winds the crank; recoil 0..1 plays the kick and wobble after a shot */
SS.lobberPose=function(l,pull,recoil){
  var u=l.userData;if(!u.arm)return l;pull=pull<0?0:(pull>1?1:pull||0);recoil=recoil<0?0:(recoil>1?1:recoil||0);
  u.arm.rotation.x=.36-1.62*pull;u.crank.rotation.x=-pull*PI*4;
  var fade=(1-recoil)*(1-recoil),kick=fade*sstep(recoil*8),wob=Math.sin(recoil*PI*6)*fade;
  u.pivot.position.set(0,.012*Math.abs(wob),-.06*kick);u.pivot.rotation.set(-.1*wob,0,.035*Math.sin(recoil*PI*9)*fade);
  u.wheelL.rotation.x=u.wheelR.rotation.x=-.06*kick/.13;
  if(recoil>0&&recoil<1)u.arm.rotation.x+=.12*wob;
  u.pull=pull;u.recoil=recoil;return l;};

/* tent: the roof pieces are separate parts */
BUILD.tent=function(K,team,T,v){
  var i,d=K.d;
  if(team==='red'){ /* a scrap tin hut with a chimney */
    for(i=0;i<4;i++)(function(i){K.part('tent.roof.'+i,function(b){var rr=.3+(i%2)*.012,col=[T.main,TIN,T.rust,T.main][i];
      b.add(new THREE.CylinderGeometry(rr,rr,.15,12,1,true,PI/2,PI),col,'rust',[0,0,-.225+i*.15],[PI/2,0,0]);
      for(var k=0;k<7;k++){var a=PI*(k+.5)/7;b.box(.02,.02,.15,shade(col,.88),'rust',[Math.cos(a)*rr,Math.sin(a)*rr,-.225+i*.15],[0,0,a]);}});})(i);
    K.part('tent.wall.F',function(b){b.add(new THREE.CircleGeometry(.3,12,0,PI),T.wood2,'wood',[0,0,.3]);b.box(.19,.26,.012,0x2e2018,null,[0,.13,.3]);b.box(.03,.28,.03,T.woodD,'wood',[-.11,.14,.31]);b.box(.03,.28,.03,T.woodD,'wood',[.11,.14,.31]);b.box(.26,.03,.03,T.woodD,'woodh',[0,.285,.31]);mark(b,'red',.12,[0,.4,.31],[0,0,.3]);
      sheet(b,.16,.22,T.main,[.19,.13,.325],[0,.9,0]);});
    K.part('tent.wall.B',function(b){b.add(new THREE.CircleGeometry(.3,12,0,PI),T.rust,'rust',[0,0,-.3],[0,PI,0]);});
    K.part('tent.chimney',function(b){b.cyl(.035,.04,.3,8,T.dark,'rust',[.13,.38,-.12]);b.cone(.06,.05,8,TIN,'rust',[.13,.56,-.12]);b.tor(.04,.006,TIN,null,[.13,.3,-.12],[PI/2,0,0]);});
  }else if(team==='green'){ /* a leafy teepee of logs */
    var q=['S','E','N','W'];for(i=0;i<4;i++)(function(i){K.part('tent.roof.'+q[i],function(b){
      b.add(new THREE.ConeGeometry(.33,.5,3,1,true,-PI/4+i*PI/2,PI/2),i%2?T.main:T.dark,'cloth',[0,.25,0]);
      var a0=i*PI/2;for(var k=0;k<9;k++){var h=.04+b.r()*.34,a=a0+(b.r()-.5)*1.2,rr=.33*(1-h/.5)+.012;if(i===0&&Math.abs(a-a0)<.42&&h<.3)continue;b.sph(.05,5,3,[T.light,T.main,T.dark][k%3],null,[Math.sin(a)*rr,h,Math.cos(a)*rr],[.9,a,0],[.8,.3,1]);}
      if(i===0){b.tri([-.1,0,.262],[.1,0,.262],[0,.3,.142],0x2e2018,null,.004);mark(b,'green',.11,[0,.36,.115],[-.58,0,0]);}});})(i);
    for(i=0;i<5;i++){var a=i/5*PI*2+.3;K.part('tent.pole.'+i,(function(a){return function(b){b.rod([Math.sin(a)*.3,0,Math.cos(a)*.3],[-Math.sin(a)*.05,.6,-Math.cos(a)*.05],.014,T.woodD,'wood',5);};})(a));}
    d.cone(.31,.47,8,0x2e2018,null,[0,.235,0]);lash(d,[0,.5,0],.03,0xd2ad6e);
  }else{ /* a canvas ridge tent */
    [-1,1].forEach(function(s){K.part('tent.roof.'+(s<0?'L':'R'),function(b){b.push([s*.155,.21,0],[0,0,-s*.935]);
      b.box(.53,.014,.6,s<0?T.cloth:shade(T.cloth,.95),'cloth');b.box(.07,.016,.602,T.main,'cloth',[s*-.215,0,0]);b.box(.02,.017,.602,T.main,'cloth',[s*-.14,0,0]);
      b.box(.09,.004,.09,blend(T.cloth,0x8a6a40,.3),'cloth',[s*.05,.009,.1],[0,.3,0]);b.pop();});});
    K.part('tent.wall.B',function(b){b.tri([.3,0,-.29],[-.3,0,-.29],[0,.41,-.29],shade(T.cloth,.9),'cloth',.01);});
    K.part('tent.ridge',function(b){b.cyl(.014,.014,.74,6,T.woodD,'wood',[0,.425,0],[PI/2,0,0]);b.sph(.02,6,5,GOLD,null,[0,.425,.37]);});
    K.part('tent.pole.F',function(b){b.cyl(.016,.018,.43,6,T.wood2,'wood',[0,.215,.3]);lash(b,[0,.4,.3],.02,T.rope);});
    K.part('tent.pole.B',function(b){b.cyl(.016,.018,.43,6,T.wood2,'wood',[0,.215,-.3]);});
    K.part('tent.flap.L',function(b){b.tri([-.3,0,.3],[-.1,0,.34],[-.02,.4,.3],T.cloth,'cloth',.008);});
    K.part('tent.flap.R',function(b){b.tri([.12,0,.36],[.3,0,.3],[.02,.4,.3],shade(T.cloth,.96),'cloth',.008);mark(b,'blue',.09,[.14,.2,.33],[-.1,.2,0]);});
    d.prism(.56,.39,.56,0x2e2018,null,[0,0,0]);
    [-1,1].forEach(function(s){[-1,1].forEach(function(z){d.rod([s*.31,.02,z*.26],[s*.44,0,z*.33],.004,T.rope,null,3);d.cyl(.008,.012,.05,4,T.woodD,null,[s*.44,.02,z*.33],[0,0,s*.4]);});});
    d.box(.2,.012,.3,0xc98a5a,'cloth',[0,.006,.42],[0,.1,0]);
  }
};

/* workshop bench with a tool board, a plan, a vice and a stool */
BUILD.workshop=function(K,team,T,v){
  var i,metal=team==='red',logs=team==='green';
  K.part('workshop.bench',function(b){
  if(logs){logp(b,.2,.05,T,[0,.2,0],null,12);b.box(.5,.03,.24,T.end,'woodh',[0,.215,0]);logp(b,.06,.19,T,[-.17,.095,0]);logp(b,.06,.19,T,[.17,.095,0]);}
  else{for(i=0;i<3;i++)b.box(.52,.03,.085,jit(b,i%2?T.wood2:T.wood,.06),'woodh',[0,.21,(i-1)*.087]);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){if(metal)b.cyl(.018,.018,.2,6,shade(TIN,.8),'rust',[q[0]*.22,.1,q[1]*.1]);else b.box(.035,.2,.035,T.woodD,'wood',[q[0]*.22,.1,q[1]*.1]);});
    b.box(.46,.02,.2,T.wood2,'woodh',[0,.06,0]);b.box(.5,.04,.02,metal?T.rust:T.main,metal?'rust':'paint',[0,.185,.125]);}
  });
  K.part('workshop.board',function(b){
  b.box(.03,.5,.03,T.woodD,'wood',[-.24,.25,-.13]);b.box(.03,.5,.03,T.woodD,'wood',[.24,.25,-.13]);
  if(metal)sheet(b,.5,.22,T.main,[0,.39,-.13]);else b.box(.5,.22,.02,logs?T.wood:T.main,logs?'woodh':'paint',[0,.39,-.13]);
  b.box(.54,.03,.06,T.woodD,'woodh',[0,.51,-.12]);
  /* hanging tools: hammer, saw, spanner or cog, and the team mark */
  b.push([-.16,.39,-.112]);b.box(.012,.12,.012,T.wood,'wood',[0,-.01,0]);b.box(.06,.03,.024,TIN,null,[0,.05,0]);b.pop();
  b.push([-.04,.39,-.112],[0,0,.2]);b.box(.03,.035,.012,T.wood2,'wood',[0,.05,0]);b.tri([-.02,.035,0],[.02,.035,0],[.012,-.09,0],0xc8ccd0,null,.006);b.pop();
  b.push([.07,.39,-.11],null,.09);mark(b,'red',1,[0,0,0]);b.pop();
  mark(b,team,.11,[.18,.39,-.11]);
  if(logs)leaves(b,5,0,.52,-.12,[.5,.04,.04],T);
  });
  K.part('workshop.plan',function(b){
  b.box(.2,.004,.14,0xf4e8c8,'cloth',[-.08,.228,.01],[0,.15,0]);b.box(.14,.002,.004,0x4a6ab0,null,[-.08,.231,-.02],[0,.15,0]);b.box(.1,.002,.004,0x4a6ab0,null,[-.09,.231,.02],[0,.15,0]);b.box(.004,.002,.08,0x4a6ab0,null,[-.04,.231,.01],[0,.15,0]);
  b.cyl(.016,.016,.14,6,0xf4e8c8,null,[-.2,.24,.03],[PI/2,.15,0]);
  b.box(.05,.05,.07,metal?T.rust:0x7a7e84,metal?'rust':null,[.17,.25,.03]);b.box(.012,.06,.06,0x9aa0a6,null,[.14,.26,.03]);b.cyl(.006,.006,.09,4,0x5a5a5e,null,[.17,.25,.08],[0,0,PI/2]);
  b.cyl(.026,.022,.04,8,metal?TIN:T.dark,null,[.06,.245,.06]);for(i=0;i<3;i++)b.cyl(.004,.004,.035,4,0x8a8e94,null,[.055+i*.006,.27,.058+i*.004],[.2*i-.2,0,.25-.2*i]);
  });
  K.part('workshop.stool',function(b){
  if(logs)logp(b,.06,.11,T,[.02,.055,.3]);else{b.cyl(.065,.065,.025,10,metal?T.main:T.wood,metal?'rust':'wood',[.02,.11,.3]);for(i=0;i<3;i++){var a=i/3*PI*2;b.rod([.02+Math.cos(a)*.03,.1,.3+Math.sin(a)*.03],[.02+Math.cos(a)*.06,0,.3+Math.sin(a)*.06],.01,T.woodD,null,4);}}
  });
  for(i=0;i<6;i++)K.d.box(.03,.004,.012,T.wood,null,[-.25+K.r()*.5,.003,.16+K.r()*.1],[0,K.r()*3,0]);
  return function(root){var s=new THREE.Object3D();s.name='socket_crew';s.position.set(0,0,.3);s.rotation.y=PI;root.add(s);};
};

/* flag: a pole with a waving cloth that carries the team mark. Call SS.wave(flag, t). */
BUILD.flag=function(K,team,T,v){
  var b=K.d,i;
  if(team==='red'){b.push([0,.03,0],[PI/2,0,0],.2);mark(b,'red',1,[0,0,0]);b.pop();b.cyl(.014,.014,1.0,6,shade(TIN,.8),'rust',[0,.5,0]);b.cyl(.03,.03,.04,8,T.main,'rust',[0,.07,0]);b.sph(.03,7,5,T.rust,'rust',[0,1.0,0]);}
  else if(team==='green'){logp(b,.1,.08,T,[0,.04,0],null,10);b.cyl(.016,.02,1.0,6,T.woodD,'wood',[0,.5,0]);leaves(b,5,0,.09,0,[.2,.02,.2],T);b.cone(.04,.09,6,T.dark,null,[0,1.03,0]);b.cone(.05,.07,6,T.main,null,[0,.99,0]);lash(b,[0,.3,0],.022,0xd2ad6e);}
  else{b.box(.2,.05,.2,T.wood2,'wood',[0,.025,0]);b.box(.13,.05,.13,T.main,'paint',[0,.075,0]);b.cyl(.015,.019,1.0,6,T.wood,'wood',[0,.5,0]);b.sph(.028,7,5,GOLD,null,[0,1.0,0]);lash(b,[0,.14,0],.024,T.rope);}
  lash(b,[.0,.94,0],.02,T.rope);lash(b,[0,.74,0],.02,T.rope);
  return function(root){var c=cloth(.36,.22,team);c.position.set(.014,.84,0);root.add(c);root.userData.cloth=c;root.userData.phase=(root.id%7)*.6;};
};

/* stack of building stuff: planks (blue), scrap (red), logs (green) */
BUILD.planks=function(K,team,T,v){
  var b=K.d,i,r=b.r;
  if(team==='red'){for(i=0;i<3;i++)sheet(b,.4,.26,[TIN,T.main,T.rust][i],[(r()-.5)*.03,.016+i*.03,(r()-.5)*.03],[PI/2,0,(r()-.5)*.3]);
    for(i=0;i<3;i++)b.cyl(.022,.022,.42,7,shade(TIN,.75+i*.1),'rust',[-.05+i*.046,.12+(i===1?.036:0),.05-(i===1?.0:0)],[0,.15,PI/2]);
    b.push([.12,.115,-.08],[PI/2,0,.4],.13);mark(b,'red',1,[0,0,0]);b.pop();b.box(.34,.012,.03,T.wood2,'woodh',[0,.1,-.02],[0,.5,0]);}
  else if(team==='green'){var rows=[[-.1,0,.1],[-.05,.05],[0]];for(var j=0;j<3;j++)for(i=0;i<rows[j].length;i++)logp(b,.048,.44+r()*.04,T,[(r()-.5)*.03,.05+j*.085,rows[j][i]],[(r()-.5)*.06,(r()-.5)*.06,PI/2]);
    b.cyl(.012,.014,.1,4,T.woodD,null,[0,.05,.165]);b.cyl(.012,.014,.1,4,T.woodD,null,[0,.05,-.165]);leaves(b,4,.1,.2,0,[.2,.03,.1],T);lash(b,[-.12,.085,0],.1,T.rope,'x');}
  else{for(var l=0;l<3;l++)for(i=0;i<3;i++){var painted=(l*3+i)%4===1;b.box(.46+r()*.03,.03,.078,painted?jit(b,T.main,.05):jit(b,i%2?T.wood:T.wood2,.08),painted?'painth':'woodh',[(r()-.5)*.03,.02+l*.05,(i-1)*.085+(r()-.5)*.01],[0,(r()-.5)*.1+(l===1?.08:0),0]);}
    b.box(.03,.016,.3,T.woodD,'wood',[-.14,.045,0]);b.box(.03,.016,.3,T.woodD,'wood',[.14,.045,0]);b.box(.03,.016,.3,T.woodD,'wood',[-.14,.095,0]);b.box(.03,.016,.3,T.woodD,'wood',[.14,.095,0]);
    b.box(.44,.03,.078,T.wood,'woodh',[.03,.045,.19],[0,.25,.2]);}
};
/* rope coil (blue: hemp, red: rusty chain and wire, green: vine) */
BUILD.rope=function(K,team,T,v){
  var b=K.d,i,col=team==='red'?0x8f8a84:(team==='green'?T.main:T.rope);
  for(i=0;i<4;i++)b.tor(.1-i*.008,.021,shade(col,1-.05*(i%2)),team==='red'?'rust':'cloth',[(b.r()-.5)*.012,.021+i*.034,(b.r()-.5)*.012],[PI/2,0,i],null,null,12);
  b.tube([[.09,.13,0],[.14,.1,.04],[.18,.02,.07],[.24,.012,.03],[.27,.012,-.04]],.017,col,team==='red'?'rust':'cloth',10,5);b.sph(.024,6,5,shade(col,.9),null,[.27,.014,-.04]);
  if(team==='green')leaves(b,6,0,.1,0,[.26,.1,.26],T);
  if(team==='red'){b.push([.02,.165,0],[PI/2,0,0],.1);mark(b,'red',1,[0,0,0]);b.pop();}
  if(team==='blue'){b.sph(.03,6,5,0xffffff,null,[-.03,.16,.02],[0,.5,1.2],[.45,2,.18]);}
};
/* crate with the team mark, lid ajar */
BUILD.crate=function(K,team,T,v){
  var b=K.d,i,s=.24,metal=team==='red',logs=team==='green';
  if(metal){b.box(s,s*.9,s,T.main,'rust',[0,s*.45,0]);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){b.box(.03,s*.92,.03,TIN,'rust',[q[0]*s/2,s*.45,q[1]*s/2]);});
    b.box(s+.03,.02,s+.03,TIN,'rust',[.01,s*.9+.02,0],[.0,.1,.12]);nails(b,[[-.08,.06,.122],[.08,.06,.122],[-.08,.17,.122],[.08,.17,.122]],0x5a4a40);mark(b,'red',.14,[0,.11,.125],[0,0,.3]);
    b.push([.05,.24,.03],[1.2,.3,0],.09);mark(b,'red',1,[0,0,0]);b.pop();}
  else{var c1=logs?T.wood:T.wood,c2=logs?T.wood2:T.wood2;
    for(i=0;i<3;i++){b.box(s*.98,s*.3,.02,jit(b,i%2?c1:c2,.06),'woodh',[0,s*(.17+i*.31),s/2-.012]);b.box(s*.98,s*.3,.02,jit(b,i%2?c2:c1,.06),'woodh',[0,s*(.17+i*.31),-s/2+.012]);
      b.box(.02,s*.3,s*.98,jit(b,i%2?c1:c2,.06),'woodh',[s/2-.012,s*(.17+i*.31),0]);b.box(.02,s*.3,s*.98,jit(b,i%2?c2:c1,.06),'woodh',[-s/2+.012,s*(.17+i*.31),0]);}
    b.box(s*.9,.01,s*.9,0x3a2a1c,null,[0,s*.8,0]);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){if(logs)b.cyl(.022,.022,s,6,T.woodD,'wood',[q[0]*s/2,s/2,q[1]*s/2]);else b.box(.034,s,.034,T.main,'paint',[q[0]*s/2,s/2,q[1]*s/2]);});
    b.box(s+.02,.022,s+.02,logs?T.wood2:T.wood,'wood',[.02,s+.03,-.03],[-.22,.15,0]);
    mark(b,team,.13,[0,s*.5,s/2+.006]);
    if(logs)leaves(b,5,0,s*.86,.04,[.18,.03,.1],T);else for(i=0;i<3;i++){b.cyl(.004,.004,.12,4,CREAM,null,[-.04+i*.04,s*.9,.06],[.3,0,(i-1)*.2]);b.cyl(.012,.009,.02,6,CORK,null,[-.04+i*.04+(i-1)*-.012,s*.9+.06,.078],[.3,0,(i-1)*.2]);}}
};
/* barrel (blue: staves and painted hoops, red: oil drum, green: hollow stump) */
BUILD.barrel=function(K,team,T,v){
  var b=K.d,i,g,p,h=.3;
  if(team==='red'){b.cyl(.115,.115,h,14,T.main,'rust',[0,h/2,0]);for(i=0;i<3;i++)b.tor(.117,.008,i===1?TIN:T.dark,'rust',[0,.02+i*.13,0],[PI/2,0,0],null,null,14);b.cyl(.105,.105,.006,14,shade(T.main,.8),'rust',[0,h-.004,0]);b.cyl(.02,.02,.02,6,TIN,null,[.05,h+.005,.02]);
    b.box(.1,.08,.006,TIN,'rust',[0,.17,.114]);mark(b,'red',.07,[0,.17,.122],[0,0,.2]);}
  else if(team==='green'){g=new THREE.CylinderGeometry(.11,.135,h,10,3);p=g.attributes.position;for(i=0;i<p.count;i++){var k=1+.07*Math.sin(p.getY(i)*40+Math.atan2(p.getZ(i),p.getX(i))*3);p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}g.computeVertexNormals();
    b.add(g,T.wood2,'wood',[0,h/2,0]);b.cyl(.098,.098,.008,10,T.end,null,[0,h,0]);b.tor(.06,.006,shade(T.end,.8),null,[0,h+.004,0],[PI/2,0,0]);b.tor(.03,.005,shade(T.end,.8),null,[0,h+.004,0],[PI/2,0,0]);
    b.tube([[.12,.03,.05],[.02,.1,.125],[-.1,.16,.07],[-.11,.22,-.05],[0,.27,-.115]],.009,T.dark,null,14,4);leaves(b,6,0,.16,.1,[.22,.2,.06],T);
    b.cyl(.008,.008,.04,5,CREAM,null,[.13,.02,-.06]);b.dome(.026,7,4,0xd4502c,null,[.13,.04,-.06]);}
  else{g=new THREE.CylinderGeometry(.1,.1,h,14,4);p=g.attributes.position;for(i=0;i<p.count;i++){var y=p.getY(i)/(h/2),kk=1+.2*(1-y*y);p.setX(i,p.getX(i)*kk);p.setZ(i,p.getZ(i)*kk);}g.computeVertexNormals();
    b.add(g,T.wood,'wood',[0,h/2,0]);for(i=0;i<3;i++){var yy=[.045,.15,.255][i],rr=.1*(1+.2*(1-Math.pow((yy-h/2)/(h/2),2)))+.002;b.tor(rr,.008,i===1?T.dark:T.main,'paint',[0,yy,0],[PI/2,0,0],null,null,14);}
    b.cyl(.092,.092,.006,14,T.wood2,'woodh',[0,h-.006,0]);b.cyl(.012,.014,.03,6,CORK,null,[0,.15,.125],[PI/2,0,0]);mark(b,'blue',.08,[0,.215,.118],[-.1,0,0]);}
};

/* ---------- counting ---------- */
SS.count=function(obj){var tris=0,meshes=0;obj.traverseVisible(function(o){if(o.isMesh){meshes++;var g=o.geometry;tris+=(g.index?g.index.count:g.attributes.position.count)/3;}});return {tris:Math.round(tris),meshes:meshes};};
SS.materials=function(){return {mat:mat(),metal:metal(),glow:glow(),gloss:gloss()};};
mat();metal();glow();gloss();
return SS;
})();
