
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
    var dome=new THREE.SphereGeometry(HILL_R,22,7,0,PI*2,0,PI/2).toNonIndexed();b.add(dome,0x5a9a3a,null,null,null,[1,HILL_H/HILL_R,1],true);
    var C=b.C;for(i=0;i<C.length;i+=9){var c=lin([0x5a9a3a,0x67a843,0x4f8d34,0x74b24c][(r()*4)|0]);for(var k=0;k<9;k+=3){C[i+k]=c[0];C[i+k+1]=c[1];C[i+k+2]=c[2];}}
    b.cyl(HILL_R+.07,HILL_R+.1,.012,22,0x4f8d34,null,[0,.004,0]);
    /* stone ring */
    for(i=0;i<15;i++){a=i/15*PI*2+r()*.1;var sr=.075+r()*.04;b.add(new THREE.DodecahedronGeometry(sr),jit(b,[0xbdb7aa,0xa9a498,0xcac4b6][i%3],.06),'rust',[Math.cos(a)*(HILL_R+.02),sr*.45,Math.sin(a)*(HILL_R+.02)],[r()*3,r()*3,r()*3],[1.15,.8,1],true);}
    for(i=0;i<5;i++){a=r()*PI*2;b.add(new THREE.DodecahedronGeometry(.035+r()*.02),0xb3ad9f,null,[Math.cos(a)*(HILL_R+.16),.015,Math.sin(a)*(HILL_R+.16)],[r()*3,r()*3,0],[1,.7,1],true);}
    /* daisies and grass tufts */
    for(i=0;i<14;i++){a=r()*PI*2;d=.1+r()*.44;y=hillY(d);var x=Math.cos(a)*d,z=Math.sin(a)*d;
      b.cyl(.003,.003,.03,4,0x3f7d2e,null,[x,y+.012,z]);b.push([x,y+.03,z],[(r()-.5)*.5,r()*3,(r()-.5)*.5]);
      for(var q=0;q<6;q++){var pa=q/6*PI*2;b.sph(.011,5,3,0xffffff,null,[Math.cos(pa)*.014,0,Math.sin(pa)*.014],[0,-pa,0],[1.3,.3,.7]);}b.sph(.008,6,4,0xf7c531,null,[0,.003,0],null,[1,.7,1]);b.pop();}
    for(i=0;i<26;i++){a=r()*PI*2;d=.08+r()*.52;y=hillY(d);for(var t2=0;t2<3;t2++)b.cone(.007,.04+r()*.03,3,[0x3f8a2e,0x7cc050][t2%2],null,[Math.cos(a)*d+(t2-1)*.012,y+.018,Math.sin(a)*d+(r()-.5)*.02],[(r()-.5)*.6,0,(r()-.5)*.6]);}
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
