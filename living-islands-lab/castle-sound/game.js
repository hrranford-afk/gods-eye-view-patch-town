const $=id=>document.getElementById(id);
const T=THREE, scene=window.scene=new T.Scene();
const M=window.M=(color,roughness=.8)=>new T.MeshStandardMaterial({color,roughness,flatShading:true});
const renderer=new T.WebGLRenderer({antialias:true});
renderer.outputEncoding=T.sRGBEncoding;
document.body.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(38,1,.1,120);
scene.fog=new T.FogExp2(0xdfb9b0,.031);
scene.add(new T.HemisphereLight(0xe6e3ef,0x465263,.57));
const sun=new T.DirectionalLight(0xffcf9e,.91);sun.position.set(-5,8,-6);scene.add(sun);
function solid(g,m,x,y,z,parent=scene){const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o}
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-6,right:6,top:4,bottom:-4,near:.2,far:25});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.0008;
const sky=solid(new T.SphereGeometry(65,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;void main(){vec3 n=normalize(v);float a=clamp(n.y+.18,0.,1.);float s=distance(n,normalize(vec3(-.35,.16,-1.)));gl_FragColor=vec4(mix(vec3(.99,.74,.58),vec3(.34,.44,.65),smoothstep(0.,.68,a))+vec3(1.,.72,.42)*exp(-20.*s)+vec3(.10,.07,.07)*smoothstep(.68,.98,sin(29.*n.y+2.2*sin(n.x*5.3)+n.z*5.)*.65+.35*sin(55.*n.y+n.x*8.))*smoothstep(-.15,.15,n.y),1.); }'}),0,0,0);
const seaMat=new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:'varying vec3 p;void main(){p=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}',fragmentShader:'uniform float time;varying vec3 p;void main(){float w=sin(p.z*19.+2.8*sin(p.x*3.+time*.5)+time*1.7)+.6*sin(p.z*37.+p.x*6.-time*2.);float glint=smoothstep(.82,1.52,w)*exp(-.34*abs(p.x+1.5+p.z*.18));float shoal=1.-smoothstep(1.3,2.4,min(length(p.xz-vec2(-2.55,0.)),length(p.xz-vec2(2.55,0.))));vec3 c=mix(vec3(.12,.32,.39),vec3(.25,.56,.56),shoal);c+=.035*w+glint*vec3(.75,.54,.34);gl_FragColor=vec4(c,1.); }'});
solid(new T.CylinderGeometry(9,9,.2,96),seaMat,0,-.43,0);
solid(new T.CylinderGeometry(9.08,8.95,.28,96),M(0x744a36),0,-.64,0);
const stone=M(0x849086),green=M(0x6c845d),pine=M(0x244e4e),sand=M(0xc7ad86);
function island(x,z,r,y){
 const verts=[],cols=[],layers=[[.12,0],[.68,0],[.91,-.018],[1,-.085],[1.07,-.23],[1.12,-.37]],count=36;
 function point(l,i){let a=i/count*Math.PI*2,k=1+.052*Math.sin(a*5+x)+.04*Math.cos(a*3+z),rad=r*layers[l][0]*k;return [x+rad*Math.cos(a),y+layers[l][1],z+rad*Math.sin(a)]}
 function tri(a,b,c,col){verts.push(...a,...b,...c);for(let k=0;k<3;k++)cols.push(col.r,col.g,col.b)}
 for(let i=0;i<count;i++){let j=(i+1)%count;tri([x,y,z],point(0,j),point(0,i),new T.Color(0x59764d));for(let l=1;l<layers.length;l++){
 let col=new T.Color([0,0x59764d,0x708453,0xb2a480,0x686c65,0x646865][l]);col.multiplyScalar(.84+.21*hash(i,l,23));let a=point(l-1,i),b=point(l-1,j),c=point(l,j),d=point(l,i);tri(a,c,d,col);tri(a,b,c,col)}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.computeVertexNormals();const land=solid(g,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.95}),0,0,0);land.receiveShadow=true;
 for(let i=0;i<13;i++){let a=i*.48,h=.05+hash(i,2,88)*.1;const rock=solid(new T.DodecahedronGeometry(h),stone,x+Math.cos(a)*r*1.06,y-.23,z+Math.sin(a)*r*1.06);rock.scale.set(1.8,.8,1);rock.rotation.y=a}
}
function tree(x,y,z,h){const trunk=solid(new T.CylinderGeometry(h*.025,h*.046,h*.65,5),M(0x4a3d33),x,y+h*.33,z);for(let j=0;j<3;j++){const o=solid(new T.ConeGeometry(h*(.25-j*.045),h*.57,7),pine,x,y+h*(.43+j*.17),z);o.castShadow=true}}
const centres=[-2.55,2.55];
centres.forEach((x,i)=>{island(x,0,1.54,0);for(let n=0;n<9;n++){const a=n*.27+3.65;tree(x+1.28*Math.cos(a),0,1.28*Math.sin(a),.27+hash(n,i,23)*.33)}});
for(let i=0;i<9;i++){let x=-7+i*1.7,z=-4-hash(i,2,11)*2,r=.36+hash(i,5,17)*.7;island(x,z,r,-.22);for(let n=0;n<4;n++)tree(x+(hash(n,i,83)-.5)*r,-.22,z+(hash(n,i,7)-.5)*r,r*(.4+hash(n,i,3)*.65))}
const launchers=centres.map((x,i)=>{let c=launcher();c.position.set(x,.01,.95);c.rotation.y=i?1.57:-1.57;return c});
const fittings=centres.map((x,i)=>{
 const team=i?'red':'blue';
 function fitting(kind,dx,z,scale){const o=SS.piece(kind,team,{solid:true});o.position.set(x+dx,0,z);o.scale.setScalar(scale);scene.add(o);return o}
 const lob=fitting('lobber',0,.95,1.1);lob.rotation.y=i?-Math.PI/2:Math.PI/2;
 const pop=fitting('popgun',0,.95,1.05);pop.rotation.y=lob.rotation.y;pop.visible=false;
 fitting('cottage',i?.78:-.78,-.60,.72);
 fitting('barrel',i?.66:-.66,.70,.8);
 const flag=fitting('flag',i?1.07:-1.07,-.35,1.05);
 launchers[i].visible=false;return {lob,pop,flag}
});
const mill=SS.piece('windmill','green',{});mill.position.set(-3.2,-.16,-5);mill.scale.setScalar(1.15);scene.add(mill);
const colours=[0x4398be,0xe8b055], teams=['Blue','Gold'];
let grand=false;
const kits=['Tide Gate','Needle Keep','Twin Piers'],ammo=['marble','big','acorn','big','marble'];
let sim,R,build,turn=0,phase='setup',layout=[0,0],brace=[1,1],elapsed=0,round=0,winner='',replay=[],replayAt=0,sideAim=0,power=50,gear=0;
let entities=[],bells=[],shot=null,acc=0,clock=0,previous=0,frames=0,fps=0;
const stoneTile=document.createElement('canvas');stoneTile.width=160;stoneTile.height=96;const ink=stoneTile.getContext('2d');ink.fillStyle='#bab7ad';ink.fillRect(0,0,160,96);for(let n=0;n<1800;n++){ink.fillStyle=hash(n,2,5)>.5?'#807d7338':'#e9e3cd48';ink.fillRect(hash(n,1,8)*160,hash(n,3,9)*96,1+hash(n,4,9)*5,1.4)}ink.lineWidth=5;ink.strokeStyle='#827e75';ink.strokeRect(1,1,158,94);const stoneSkin=new T.CanvasTexture(stoneTile);stoneSkin.encoding=T.sRGBEncoding;
const wood=new T.TextureLoader().load("vendor/wood.jpg");wood.encoding=T.sRGBEncoding;
const geometries={},materials={}, batches={};
const bellShape=new T.LatheGeometry([[.17,0],[.18,.027],[.15,.044],[.12,.10],[.11,.18],[.085,.216],[.04,.23],[.035,.26],[0,.26]].map(([x,y])=>new T.Vector2(x,y)),20);
function addVisual(key,geometry,material){if(!batches[key]){const b=new T.InstancedMesh(geometry,material,384);b.count=0;b.frustumCulled=false;b.castShadow=true;b.receiveShadow=true;scene.add(b);batches[key]=b}const b=batches[key];return {batch:b,index:b.count++}}
function visual(t,team,bell){const k=bell?'bell':t;if(!geometries[k]){const kit=BL.KIT[t],ball=BL.BALLS[t];geometries[k]=bell?bellShape:kit?new T.BoxGeometry(2*kit.hx,2*kit.hy,2*kit.hz):new T.SphereGeometry(ball.r,14,10);materials[k]=M(bell?0xebac47:kit?(t==='brick'?0xb9afa0:t==='post'?0x795237:0xb48755):ball.col,bell?.32:.7)}if(t==='brick'&&!materials[k].map){materials[k].map=stoneSkin}if(!bell&&['beam','plank','post'].includes(t))materials[k].map=wood;return addVisual(k,geometries[k],materials[k])}
function piece(t,x,y,z,team,bell=false){const q=BL.qy(0),p=sim.addPiece({t,x,y,z,q});entities.push({p,...visual(t,team,bell)});if(bell)bells[team]={p,home:y};return p}
function buildFort(i){const x=centres[i],style=layout[i],height=[4,6,3][style],span=[.41,.29,.48][style];
 for(const sign of [-1,1])for(let row=0;row<height;row++)for(let j=0;j<3;j++)piece('brick',x+(j-1)*.297+(row%2?.018:-.018),.061+row*.121,sign*span,i);
 // Crenellated wings frame the gallery; loose coping stones tumble independently.
 for(const side of [-1,1]){for(let layer=0;layer<3;layer++){for(let j=0;j<3;j++)piece('brick',x+side*.57,.061+layer*.121,(j-1)*.21,i)}for(let j of [-1,1])piece('brick',x+side*.57,.424,j*.21,i)}
 const y=height*.121;for(const z of [-span,span])piece('post',x,y+.351,z,i);
 // The gallery crosses the two piers. Its support can be dislodged independently.
 let p=piece('beam',x,y+.762,0,i);p.body.setRotation({x:0,y:Math.SQRT1_2,z:0,w:Math.SQRT1_2},true);
 for(const offset of [-.21,0,.21])piece('plank',x,y+.855,offset,i);
 piece('crate',x,y+1.04,0,i,true);
 if(grand){for(const sign of [-1,1])for(let k=0;k<5;k++)for(let j=0;j<4;j++)
 piece('brick',x+(j-1.5)*.3,.061+k*.121,sign*.83,i);
 for(const sign of [-1,1])for(const j of [-1.5,.5])piece('brick',x+j*.30,.667,sign*.83,i)}
 const px=x+(brace[i]-1)*.28;piece('post',px,y+.351,span-.155,i);
 // Give the repair post a stone footing that reaches the pier height.
 for(let k=0;k<height;k++)piece('brick',px,.061+k*.121,span-.201,i);
}
function reset(){if(sim)sim.dispose();sim=BL.makeSim(R,{});sim.world.removeRigidBody(sim.table);
 centres.forEach(x=>{const b=sim.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(x,-.16,0));sim.world.createCollider(R.ColliderDesc.cylinder(.16,1.54),b)});
 Object.values(batches).forEach(b=>b.count=0);entities=[];bells=[];shot=null;replay=[];turn=0;round=0;winner='';[0,1].forEach(buildFort);sim.settle(90);bells.forEach(b=>b.home=b.p.body.translation().y);phase='aim';sideAim=0;power=50;syncModels();ui()}
const dummy=new T.Object3D();
function pose(){return entities.map(({p})=>{const a=p.body.translation(),q=p.body.rotation();return [a.x,a.y,a.z,q.x,q.y,q.z,q.w].map(v=>Math.round(v*1000)/1000)})}
function showPose(list){list.forEach((a,i)=>{let e=entities[i];if(!e)return;dummy.position.fromArray(a);dummy.quaternion.fromArray(a,3);if(e.p===bells[0]?.p||e.p===bells[1]?.p)dummy.position.y-=.14;dummy.updateMatrix();e.batch.setMatrixAt(e.index,dummy.matrix);e.batch.instanceMatrix.needsUpdate=true})}
function syncModels(){showPose(pose())}
function updateGear(){fittings.forEach((f,i)=>{if(i===turn){f.lob.visible=gear===0;f.pop.visible=gear!==0}})}
let audio;
function tone(hz,dur){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});const osc=audio.createOscillator(),g=audio.createGain();osc.frequency.value=hz;g.gain.setValueAtTime(.065,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+dur);osc.connect(g);g.connect(audio.destination);osc.start();osc.stop(audio.currentTime+dur)}catch{}}
const arc=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:0xffdd83,dashSize:.09,gapSize:.06}));scene.add(arc);
function launchData(){const dir=turn?-1:1,start={x:centres[turn]+dir*.46,y:.55,z:.92},target={x:centres[1-turn],z:sideAim/100*.9},dx=target.x-start.x,dz=target.z-start.z,time=gear===1?.60:gear===2?.75:.91;return {start,v:{x:dx/time*(.58+power*.0084),y:(.65-start.y)/time-BL.GRAV*time/2,z:dz/time}}}
function trajectory(){arc.visible=phase==='aim';if(!arc.visible)return;const {start,v}=launchData();const pts=[];for(let i=0;i<25;i++){let t=i*.026;pts.push(new T.Vector3(start.x+v.x*t,start.y+v.y*t+.5*BL.GRAV*t*t,start.z+v.z*t))}arc.geometry.setFromPoints(pts);arc.computeLineDistances()}
function fire(){if(phase!=='aim')return;const {start,v}=launchData(),t=ammo[round%ammo.length];for(const spread of (gear===2?[-.25,0,.25]:[0])){
 const kind=gear===2?'acorn':t;
 shot=sim.addBall(kind,{...start,z:start.z+spread*.65},{...v,z:v.z+spread*.6});
 entities.push({p:shot,...visual(kind,turn,false)});
 }tone(185,.10);phase='flight';elapsed=0;acc=0;replay=[pose()];launchers[turn].userData.arm.rotation.x=-.8;ui()}
function endShot(){const fallen=bells.map(b=>b.p.body.translation().y<b.home-.32);
 winner=fallen.every(Boolean)?'Both bells fell — draw':fallen.some(Boolean)?teams[fallen[0]?1:0]+' wins':'';
 if(!winner&&round>=15)winner='Both bells held — draw';if(winner)tone(659,.9);phase=winner?'won':'pass';ui()}
function nextTurn(){if(phase!=='pass')return;turn=1-turn;round++;sideAim=0;power=50;phase='aim';ui()}
function resize(){const w=innerWidth,h=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(w,h,false);camera.aspect=w/h;const d=Math.max(8.3,12.5/camera.aspect);camera.position.set(.8,d*.52,d);camera.lookAt(0,.0,0);camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
let role='local',room='',token='',stream,netAge=0,pending=false,seq=0,remoteSeq=-1,lastUi='',connection='';
const controls=$('controls');
let drag=null;
const field=renderer.domElement;field.style.touchAction='none';
field.addEventListener('pointerdown',e=>{
 if(phase!=='aim'||!canPlay()||!e.isPrimary)return;
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,aim:sideAim,power};field.setPointerCapture(e.pointerId)
});
field.addEventListener('pointermove',e=>{
 if(!drag||drag.id!==e.pointerId)return;
 sideAim=Math.round(Math.max(-100,Math.min(100,drag.aim+(e.clientX-drag.x)*190/innerWidth)));
 power=Math.round(Math.max(0,Math.min(100,drag.power+(e.clientY-drag.y)*145/innerHeight)));
 const inputs=controls.querySelectorAll('input');if(inputs.length===2){inputs[0].value=sideAim;inputs[1].value=power}trajectory()
});
field.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const moved=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);drag=null;if(moved>18&&phase==='aim'&&canPlay())command('fire')});
field.addEventListener('pointercancel',()=>{if(drag){sideAim=drag.aim;power=drag.power;drag=null;ui()}});
function previewForts(){reset();phase='setup';ui()}

function button(label,fn,primary=false){const b=document.createElement('button');b.textContent=label;b.className=primary?'main':'';b.onclick=fn;controls.append(b);return b}
function select(label,options,index,fn){const l=document.createElement('label');l.append(label+' ');const s=document.createElement('select');options.forEach((v,i)=>s.add(new Option(v,i)));s.selectedIndex=index;s.onchange=()=>fn(s.selectedIndex);l.append(s);controls.append(l)}
function slider(label,val,min,max,fn){const l=document.createElement('label');l.append(label+' ');const el=document.createElement('input');el.type='range';el.min=min;el.max=max;el.value=val;el.oninput=()=>fn(+el.value);l.append(el);controls.append(l)}
function canPlay(){return role==='local'||turn===(role==='host'?0:1)}
function command(action){if(role==='guest'){post('cmd',{action,round,aim:sideAim,power,gear}).catch(netError);return}if(action==='fire')fire();if(action==='next')nextTurn()}
function ui(){updateGear();controls.replaceChildren();trajectory();let headline='',detail='';
 if(phase==='setup'){headline='Choose your forts';detail='Pick a keep and where its repair post will support the bell gallery.';
 if(role!=='guest'){select('Sound',['Tablet cove','Grand ramparts'],grand?1:0,n=>{grand=!!n;previewForts()});for(let i=0;i<2;i++){select(teams[i],kits,layout[i],n=>{layout[i]=n;previewForts()});select('Post',['Left','Centre','Right'],brace[i],n=>{brace[i]=n;previewForts()})}button('Launch match',reset,true)}}
 else if(phase==='aim'){headline=teams[turn]+' to play';detail='Hopper  ·  '+[0,1,2].map(i=>BL.BALLS[ammo[(round+i)%ammo.length]].name).join('   ›   ');
 if(canPlay()){detail+='   ·   Drag the water and release to shoot.';select('Rig',['Lobber','Flat flinger','Scatter popper'],gear,n=>{gear=n;ui()});slider('Aim',sideAim,-100,100,n=>{sideAim=n;trajectory()});slider('Pull',power,0,100,n=>{power=n;trajectory()});button('Release '+(gear===2?'acorn volley':BL.BALLS[ammo[round%ammo.length]].name),()=>command('fire'),true)}else detail+='   ·   Watching'}
 else if(phase==='flight'){headline='Watch the gallery';detail='The turn ends after the structure settles.'}
 else if(phase==='replay'){headline='Slow replay';detail='Watching the last shot.'}
 else{headline=winner||'The bells held';detail=winner?(winner.startsWith('Both bells held')?'Sixteen shots across the sound.':'The bell dropped from its perch.'):'The next round belongs to '+teams[1-turn]+'.';
 if(phase==='pass'&&(role==='local'||(role==='guest'?0:1)===turn))button(role==='local'?'Pass to '+teams[1-turn]:'Take turn',()=>command('next'),true);
 if(role!=='guest'){button('Replay shot',()=>{replayAt=0;phase='replay';ui()});if(phase==='won')button('New match',()=>{phase='setup';ui()},true)}}
 $('title').textContent=headline;$('detail').textContent=detail;
}
function packet(){return {seq:++seq,phase,turn,round,winner,layout,brace,sideAim,power,gear,build,
 types:entities.map(e=>e.p.kind==='ball'?e.p.t:e.p===bells[0]?.p||e.p===bells[1]?.p?'bell':e.p.t),
 poses:phase==='replay'?replay[Math.min(replay.length-1,Math.floor(replayAt))]:pose()}}
function receive(s){if(s.seq<=remoteSeq)return;remoteSeq=s.seq;let newTurn=turn!==s.turn||phase!==s.phase;turn=s.turn;round=s.round;winner=s.winner;phase=s.phase;if(turn===0||newTurn){sideAim=s.sideAim;power=s.power;gear=s.gear;updateGear()}
 if(entities.length!==s.types.length||newTurn){Object.values(batches).forEach(b=>b.count=0);entities=[];bells=[];s.types.forEach(t=>{const p={t};entities.push({p,...visual(t==='bell'?'crate':t,0,t==='bell')});if(t==='bell')bells.push({p})})}
 showPose(s.poses);const key=[phase,turn,round,winner].join('/');if(lastUi!==key){ui();lastUi=key}trajectory()}
async function post(path,data={}){const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room,token,...data})});if(!r.ok)throw Error(await r.text());return r.json()}
function netError(e){connection=String(e.message||e);$('roomInfo').textContent=connection}
async function connect(mode){try{const a=await post(mode,mode==='join'?{room:$('code').value.trim().toUpperCase()}:{});role=mode==='host'?'host':'guest';room=a.room;token=a.token;stream=new EventSource('/api/events?'+new URLSearchParams({room,token}));stream.onmessage=e=>{const msg=JSON.parse(e.data);
 if(msg.state&&role==='guest')receive(msg.state);
 if(msg.action&&role==='host'&&msg.round===round){if(msg.action==='fire'&&turn===1&&phase==='aim'){gear=[0,1,2].includes(msg.gear)?msg.gear:0;power=Math.max(0,Math.min(100,msg.power));sideAim=Math.max(-100,Math.min(100,msg.aim));fire()}if(msg.action==='next'&&turn===0)nextTurn()}
 };stream.onopen=()=>connection='';stream.onerror=()=>connection='Reconnecting…';$('net').textContent='Room '+room;$('host').disabled=$('join').disabled=true;$('roomInfo').textContent='Room '+room+' · Open the same address on the other device and join.';if(mode==='join')$('lobby').close();ui()}catch(e){netError(e)}}
$('net').onclick=()=>$('lobby').showModal();$('closeLobby').onclick=()=>$('lobby').close();$('host').onclick=()=>connect('host');$('join').onclick=()=>connect('join');
function frame(now){const frameSeconds=previous?(now-previous)/1000:0,dt=Math.min(.1,frameSeconds);previous=now;clock+=dt;for(const f of fittings)SS.wave(f.flag,clock);SS.lobberPose(fittings[turn].lob,phase==='aim'?power/100:0,phase==='flight'?Math.min(1,elapsed/28):0);seaMat.uniforms.time.value=clock;frames++;fps+=frameSeconds;
 if(fps>=1){$('note').textContent=(connection||((role==='local'?'Pass & play':'Room '+room)+' · '+Math.round(frames/fps)+' fps · '+build));frames=fps=0}
 if(role!=='guest'&&phase==='flight'){acc+=dt;while(acc>=BL.DT&&phase==='flight'){sim.step();elapsed++;acc-=BL.DT;if(elapsed%4===0)replay.push(pose());if(elapsed>=240||(elapsed>80&&sim.pieces.every(e=>e.body.isSleeping())))endShot()}syncModels();launchers[turn].userData.arm.rotation.x*=.9}
 if(role!=='guest'&&phase==='replay'){replayAt+=dt*9;showPose(replay[Math.min(replay.length-1,Math.floor(replayAt))]);if(replayAt>=replay.length){syncModels();phase=winner?'won':'pass';ui()}}
 if(role==='host'&&(netAge+=dt)>.1&&!pending){pending=true;netAge=0;post('state',{state:packet()}).catch(netError).finally(()=>pending=false)}
 renderer.render(scene,camera);requestAnimationFrame(frame)}
try{let module;if(BL.simdSupported()){try{module=await import('./vendor/simd.mjs');await module.default.init();build='SIMD'}catch{module=null}}
 if(!module){module=await import('./vendor/rapier.mjs');await module.default.init();build='compat'}R=module.default;reset();phase='setup';$('note').textContent='Pass & play · '+build;ui();requestAnimationFrame(frame)}
catch(e){$('title').textContent='Could not open the physics world';$('detail').textContent=e.message;console.error(e)}
