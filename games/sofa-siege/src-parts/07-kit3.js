
/* workshop bench with a tool board, a plan, a vice and a stool */
BUILD.workshop=function(K,team,T,v){
  var b=K.d,i,metal=team==='red',logs=team==='green';
  if(logs){logp(b,.2,.05,T,[0,.2,0],null,12);b.box(.5,.03,.24,T.end,'woodh',[0,.215,0]);logp(b,.06,.19,T,[-.17,.095,0]);logp(b,.06,.19,T,[.17,.095,0]);}
  else{for(i=0;i<3;i++)b.box(.52,.03,.085,jit(b,i%2?T.wood2:T.wood,.06),'woodh',[0,.21,(i-1)*.087]);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){if(metal)b.cyl(.018,.018,.2,6,shade(TIN,.8),'rust',[q[0]*.22,.1,q[1]*.1]);else b.box(.035,.2,.035,T.woodD,'wood',[q[0]*.22,.1,q[1]*.1]);});
    b.box(.46,.02,.2,T.wood2,'woodh',[0,.06,0]);b.box(.5,.04,.02,metal?T.rust:T.main,metal?'rust':'paint',[0,.185,.125]);}
  /* tool board at the back */
  b.box(.03,.5,.03,T.woodD,'wood',[-.24,.25,-.13]);b.box(.03,.5,.03,T.woodD,'wood',[.24,.25,-.13]);
  if(metal)sheet(b,.5,.22,T.main,[0,.39,-.13]);else b.box(.5,.22,.02,logs?T.wood:T.main,logs?'woodh':'paint',[0,.39,-.13]);
  b.box(.54,.03,.06,T.woodD,'woodh',[0,.51,-.12]);
  /* hanging tools: hammer, saw, spanner or cog, and the team mark */
  b.push([-.16,.39,-.112]);b.box(.012,.12,.012,T.wood,'wood',[0,-.01,0]);b.box(.06,.03,.024,TIN,null,[0,.05,0]);b.pop();
  b.push([-.04,.39,-.112],[0,0,.2]);b.box(.03,.035,.012,T.wood2,'wood',[0,.05,0]);b.tri([-.02,.035,0],[.02,.035,0],[.012,-.09,0],0xc8ccd0,null,.006);b.pop();
  b.push([.07,.39,-.11],null,.09);mark(b,'red',1,[0,0,0]);b.pop();
  mark(b,team,.11,[.18,.39,-.11]);
  /* on the bench: the plan, a vice, a pot of bolts, a candle stub */
  b.box(.2,.004,.14,0xf4e8c8,'cloth',[-.08,.228,.01],[0,.15,0]);b.box(.14,.002,.004,0x4a6ab0,null,[-.08,.231,-.02],[0,.15,0]);b.box(.1,.002,.004,0x4a6ab0,null,[-.09,.231,.02],[0,.15,0]);b.box(.004,.002,.08,0x4a6ab0,null,[-.04,.231,.01],[0,.15,0]);
  b.cyl(.016,.016,.14,6,0xf4e8c8,null,[-.2,.24,.03],[PI/2,.15,0]);
  b.box(.05,.05,.07,metal?T.rust:0x7a7e84,metal?'rust':null,[.17,.25,.03]);b.box(.012,.06,.06,0x9aa0a6,null,[.14,.26,.03]);b.cyl(.006,.006,.09,4,0x5a5a5e,null,[.17,.25,.08],[0,0,PI/2]);
  b.cyl(.026,.022,.04,8,metal?TIN:T.dark,null,[.06,.245,.06]);for(i=0;i<3;i++)b.cyl(.004,.004,.035,4,0x8a8e94,null,[.055+i*.006,.27,.058+i*.004],[.2*i-.2,0,.25-.2*i]);
  /* stool and a few shavings */
  if(logs)logp(b,.06,.11,T,[.02,.055,.3]);else{b.cyl(.065,.065,.025,10,metal?T.main:T.wood,metal?'rust':'wood',[.02,.11,.3]);for(i=0;i<3;i++){var a=i/3*PI*2;b.rod([.02+Math.cos(a)*.03,.1,.3+Math.sin(a)*.03],[.02+Math.cos(a)*.06,0,.3+Math.sin(a)*.06],.01,T.woodD,null,4);}}
  for(i=0;i<6;i++)b.box(.03,.004,.012,T.wood,null,[-.25+b.r()*.5,.003,.16+b.r()*.1],[0,b.r()*3,0]);
  if(logs)leaves(b,5,0,.52,-.12,[.5,.04,.04],T);
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
SS.materials=function(){return {mat:mat(),glow:glow(),gloss:gloss()};};
mat();glow();gloss();
return SS;
})();
