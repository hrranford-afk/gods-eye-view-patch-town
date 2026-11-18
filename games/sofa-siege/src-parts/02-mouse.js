
/* ---------- mice ---------- */
var FUR={tan:0xcf9f6e,grey:0xa7a39f,cream:0xecd9b8,brown:0x9a6a44};
SS.FUR=FUR;
var HIP=.06,_mg={};
function dentGeo(g,at,rad,depth){var p=g.attributes.position,v=new THREE.Vector3(),c=new THREE.Vector3(at[0],at[1],at[2]);
  for(var i=0;i<p.count;i++){v.fromBufferAttribute(p,i);var d=v.distanceTo(c);if(d<rad){var k=(1-d/rad);v.multiplyScalar(1-depth*k*k);p.setXYZ(i,v.x,v.y,v.z);}}g.computeVertexNormals();return g;}
function mouseGeo(team,furName){
  var key=team+'|'+furName;if(_mg[key])return _mg[key];
  var T=PAL[team],fur=FUR[furName]||FUR.tan,furL=blend(fur,0xfff2dc,.55),G={},b,s,i;
  /* body: torso, tunic, belt, collar and the team's back pack */
  b=new Bld(hash(key));
  b.sph(.06,10,7,fur,null,[0,.058,0],null,[1,1.12,.92]);
  b.sph(.04,6,4,furL,null,[0,.085,.03],null,[1,1,.6]);
  b.cyl(.059,.07,.082,10,T.main,'cloth',[0,.04,0]);
  b.cyl(.071,.073,.012,10,T.dark,'cloth',[0,.004,0]);
  b.cyl(.066,.068,.014,10,0x6b4423,null,[0,.034,0]);b.box(.022,.02,.008,GOLD,null,[0,.034,.066]);
  b.tor(.047,.013,T.dark,'cloth',[0,.098,.002],[PI/2,0,0],null,null,8);
  if(team==='blue'){ /* scarf knot, quiver of cork bolts */
    b.sph(.014,6,5,T.dark,'cloth',[.03,.092,.045]);b.box(.016,.04,.008,T.dark,'cloth',[.034,.068,.054],[0,0,.25]);
    b.push([-.012,.075,-.066],[.12,0,.35]);b.cyl(.021,.017,.085,8,0x7a4a26,'wood');b.tor(.021,.004,T.main,null,[0,.03,0],[PI/2,0,0],null,null,8);
    for(i=0;i<3;i++){var bx=(i-1)*.011;b.cyl(.003,.003,.05,4,CREAM,null,[bx,.06,(i%2)*.008-.004]);b.sph(.008,5,4,0xffffff,null,[bx,.088,(i%2)*.008-.004],null,[.5,1.5,1]);}
    b.pop();
    
  }else if(team==='red'){ /* scrap sack with bits poking out */
    b.sph(.05,8,6,0xb58a58,'cloth',[0,.078,-.07],null,[1.05,1,.82]);b.cyl(.014,.02,.02,6,0x9a744a,'cloth',[0,.128,-.07]);b.tor(.016,.004,0x5a4030,null,[0,.122,-.07],[PI/2,0,0],null,null,6);
    b.box(.032,.03,.004,T.main,'cloth',[.018,.07,-.112],[.1,0,.2]);
    b.cyl(.006,.006,.06,5,TIN,'rust',[.02,.15,-.072],[0,0,-.3]);b.push([-.018,.145,-.07],[0,.3,.3],.045);mark(b,'red',1,[0,0,0]);b.pop();
    b.tor(.064,.005,0x5a4030,null,[0,.075,0],[PI/2,.5,0],null,null,10);
  }else{ /* plank pack and a rope coil */
    for(i=0;i<3;i++)b.box(.03,.17,.011,i===1?T.end:PAL.blue.wood2,'wood',[(i-1)*.033,.1,-.066-(i===1?.004:0)],[.06,0,(i-1)*.05]);
    b.box(.11,.012,.018,T.rope,null,[0,.07,-.066]);b.box(.11,.012,.018,T.rope,null,[0,.135,-.068]);
    b.tor(.02,.006,0xd2ad6e,null,[.062,.03,-.02],[0,PI/2,0],null,null,8);
    b.tor(.064,.005,0x6b4423,null,[0,.08,0],[PI/2,-.5,0],null,null,10);
  }
  G.body=b.geo();
  /* head */
  b=new Bld(3);
  b.sph(.066,12,8,fur,null,[0,.05,0],null,[1.06,.96,1]);
  b.sph(.034,8,6,furL,null,[0,.034,.05],null,[1.12,.86,1.25]);
  b.sph(.0125,6,4,PINK,null,[0,.043,.093]);
  b.tor(.011,.003,0x6a3a2a,null,[0,.03,.082],[.5,0,PI],null,PI,6);
  for(s=-1;s<=1;s+=2){
    b.sph(.013,6,5,0x1a1210,null,[s*.027,.064,.053]);b.sph(.0045,4,3,0xffffff,null,[s*.027+.004,.069,.063]);
    b.sph(.011,5,3,0xf0a090,null,[s*.043,.036,.046],null,[1,.7,.5]);
    b.sph(.037,8,5,fur,null,[s*.06,.1,-.008],[0,0,-s*.3],[1,1,.28]);b.sph(.026,6,4,PINK,null,[s*.06,.1,-.001],[0,0,-s*.3],[1,1,.26]);
    b.box(.045,.0022,.0022,0x4a342a,null,[s*.05,.04,.068],[0,-s*.5,s*.12]);b.box(.042,.0022,.0022,0x4a342a,null,[s*.05,.03,.068],[0,-s*.5,-s*.14]);
  }
  if(team==='blue'){ /* floppy hat, goggles, white feather */
    b.push([0,.094,-.004],[-.16,0,.06]);
    b.cyl(.074,.08,.008,12,T.dark,'cloth',[0,0,0]);
    b.cyl(.046,.058,.03,10,T.main,'cloth',[0,.018,0]);b.tor(.056,.007,CREAM,'cloth',[0,.008,0],[PI/2,0,0]);
    b.sph(.047,8,5,T.main,'cloth',[.004,.034,-.006],null,[1,.55,1]);
    b.cyl(.022,.04,.035,8,T.main,'cloth',[-.022,.048,-.016],[-.5,0,.9]);b.cyl(.008,.022,.034,6,T.main,'cloth',[-.05,.05,-.034],[-.9,0,1.9]);b.sph(.012,5,4,CREAM,null,[-.066,.036,-.046]);
    b.sph(.022,6,4,0xffffff,null,[.05,.062,-.004],[-.15,0,-.45],[.42,2.3,.16]);b.box(.004,.085,.004,0xe0d4b8,null,[.046,.052,-.002],[-.15,0,-.45]);
    b.pop();
    for(s=-1;s<=1;s+=2){b.cyl(.019,.019,.014,8,GOLD,null,[s*.024,.088,.056],[PI/2-.42,0,0]);b.cyl(.014,.014,.016,6,0xbfe6ff,null,[s*.024,.0885,.0575],[PI/2-.42,0,0]);}
    b.box(.012,.008,.008,GOLD,null,[0,.088,.058]);
  }else if(team==='red'){ /* dented tin helmet */
    b.push([0,.066,-.002],[-.1,0,.13]);
    b.add(dentGeo(new THREE.SphereGeometry(.07,12,5,0,PI*2,0,PI/2),[.04,.05,.03],.045,.42),TIN,'rust',null,null,[1.04,.92,1.04]);
    b.tor(.073,.006,shade(TIN,.8),'rust',[0,.002,0],[PI/2,0,0],null,null,10);
    b.cyl(.008,.01,.012,6,shade(TIN,.75),null,[0,.066,0]);
    b.box(.034,.028,.005,PAL.red.rust,'rust',[-.04,.035,.042],[-.55,-.75,0]);
    for(i=0;i<4;i++){var a=i/4*PI*2+.4;b.sph(.005,5,4,shade(TIN,.7),null,[Math.cos(a)*.068,.012,Math.sin(a)*.068]);}
    b.pop();
  }else{ /* miner's helmet; the lamp lens is a separate glowing mesh */
    b.push([0,.066,-.002],[-.08,0,0]);
    b.dome(.07,12,5,T.metal,'paint',null,null,[1.04,.92,1.04]);b.tor(.073,.006,shade(T.metal,.85),null,[0,.002,0],[PI/2,0,0],null,null,10);
    b.box(.085,.007,.04,T.metal,'paint',[0,.004,.078]);
    b.tor(.066,.008,shade(T.metal,.85),null,[0,0,0],[0,PI/2,0],[1,.93,1],PI,10);
    b.cyl(.021,.021,.022,10,0x5a5a5e,null,[0,.04,.066],[PI/2,0,0]);b.cyl(.024,.021,.008,10,0x8a8a8e,null,[0,.04,.078],[PI/2,0,0]);
    b.pop();
  }
  G.head=b.geo();
  if(team==='green'){b=new Bld(4);b.cyl(.017,.017,.006,10,0xfff2b0,null,[0,.1,.0835],[PI/2-.08,0,0]);G.lamp=b.geo();}
  /* dizzy eyes: swirls that sit over the eyes */
  b=new Bld(5);for(s=-1;s<=1;s+=2){b.cyl(.018,.018,.004,10,0xffffff,null,[s*.027,.064,.066],[PI/2,0,0]);b.tor(.009,.003,0x2a1c14,null,[s*.027,.064,.069],null,null,PI*1.6,8);b.sph(.004,4,3,0x2a1c14,null,[s*.027,.064,.069]);}
  G.dizzy=b.geo();
  /* arms hang down from the shoulder */
  b=new Bld(6);b.cyl(.017,.021,.04,7,T.main,'cloth',[0,-.016,0]);b.cyl(.013,.013,.03,6,fur,null,[0,-.052,0]);b.sph(.018,6,4,furL,null,[0,-.07,0]);G.arm=b.geo();
  /* legs hang down from the hip */
  b=new Bld(7);b.cyl(.021,.017,.04,7,T.dark,'cloth',[0,-.02,0]);b.sph(.024,6,4,PINK,null,[0,-.046,.013],null,[1,.56,1.5]);G.leg=b.geo();
  /* tail */
  b=new Bld(8);b.tube([[0,0,.01],[0,-.012,-.035],[0,0,-.075],[0,.035,-.1],[0,.075,-.09],[0,.095,-.07]],.0065,PINK,null,8,4);b.sph(.0075,5,4,PINK,null,[0,.095,-.07]);G.tail=b.geo();
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
  body.position.set(0,HIP,0);head.position.set(0,.118,0);armL.position.set(.064,.1,0);armR.position.set(-.064,.1,0);legL.position.set(.03,HIP,0);legR.position.set(-.03,HIP,0);tail.position.set(0,.014,-.052);
  body.add(mesh(G.body));head.add(mesh(G.head));armL.add(mesh(G.arm,M,false));armR.add(mesh(G.arm,M,false));legL.add(mesh(G.leg,M,false));legR.add(mesh(G.leg,M,false));tail.add(mesh(G.tail,M,false));
  var tool=mesh(G.tool);tool.name='tool';tool.position.set(0,-.072,0);armR.add(tool);
  var hammer=mesh(G.hammer,M,false);hammer.name='hammer';hammer.position.set(0,-.072,0);hammer.visible=false;armR.add(hammer);
  var plank=mesh(G.plank);plank.name='plank';plank.position.set(0,.082,.092);plank.visible=false;body.add(plank);
  var dz=mesh(G.dizzy,M,false);dz.name='dizzyEyes';dz.visible=false;head.add(dz);
  if(G.lamp){var lamp=mesh(G.lamp,glow(),false);lamp.name='lamp';head.add(lamp);}
  var stars=SS.fx.stars();stars.name='stars';stars.position.set(0,.37,0);stars.visible=false;rig.add(stars);
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
    P.dizzyEyes.visible=true;P.stars.visible=true;P.stars.position.y=.37+.008*Math.sin(t*5);P.stars.rotation.y=t*3.2;
  }else{ /* idle */
    s=Math.sin(t*2);b.position.y=HIP+.003*s;b.scale.y=1+.015*s;h.rotation.y=.32*Math.sin(t*.8);h.rotation.z=.06*Math.sin(t*1.3);
    tl.rotation.y=.4*Math.sin(t*1.7);aL.rotation.x=.08*s;aR.rotation.x=-.08*s;
  }
  m.userData.pose=name;return m;
};
