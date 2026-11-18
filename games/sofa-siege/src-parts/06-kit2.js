
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
  var g=new Bld(hash(K.key+'barrel'));
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
  b=new Bld(hash(K.key+'u'));
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
