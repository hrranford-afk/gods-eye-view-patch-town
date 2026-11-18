
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
