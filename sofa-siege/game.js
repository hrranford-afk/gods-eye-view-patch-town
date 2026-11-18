/* Sofa siege on a practice table: build step, then the fight for the middle flag.
   No AR, no sound. Needs three.js r128 and models.js (SS).
   All game state lives in the plain object SG (on window). SG.step(dt) runs the fixed-step update,
   so a test can play a whole match without drawing. The three.js objects are kept apart, in V. */
(function(){
var PI=Math.PI,STEP=1/60,PS=.88;
var KIT=['wall','wall','wall','wall','wall','wall','gate','tower','lobber','tent','workshop'];
var FOOT0={wall:[.43,.07],gate:[.48,.1],tower:[.3,.3],lobber:[.33,.4],tent:[.36,.36],workshop:[.3,.25]},FOOT={},TALL={wall:.42,gate:.62,tower:1.1,lobber:.5,tent:.42,workshop:.5},k0;
for(k0 in FOOT0){FOOT[k0]=[FOOT0[k0][0]*PS,FOOT0[k0][1]*PS];TALL[k0]*=PS;}
var ZONE={rMin:1.03,rMax:2.72,half:1.22},MAT={r0:2.78,r1:3.2,r:2.99,scale:.32,pick:2.6,step:.185},HILL=1.0;
var RULES={build:120,ready:4,round:60,rounds:3,brk:10,win:100,gain:.8,reload:4,dizzy:5,blast:.34,redBlast:.34,redDizzy:4.9,walk:1.15,buildTime:3,mendTime:3,
  corkRange:1.2,corkEvery:3,corkChance:.04,corkDaze:1.6,scrapEvery:4,scrapReach:.38};
var LEVELS={easy:{fire:10,err:.85,send:5},normal:{fire:6.5,err:.45,send:2.5},hard:{fire:4.4,err:.18,send:.6}};
var REASON={hill:'Not on the hill ring',third:'Only on your own side of the table',overlap:'Too close to another piece'};
var NAME={blue:'Blue',red:'Red'};
/* preset camps for the bot: [distance from the hill, angle, extra turn] for each kit slot, in the side's own frame */
var LAYOUTS=[
  [[1.3,-.7,PI],[1.3,.7,PI],[1.72,-.82,PI],[1.72,-.3,PI],[1.72,.3,PI],[1.72,.82,PI],[1.3,0,PI],[2.28,-.72,PI],[2.2,-.22,PI],[2.22,.26,0],[2.26,.74,0]],
  [[1.25,-.35,PI],[1.25,.35,PI],[1.42,-1.0,PI],[1.42,1.0,PI],[1.8,-.62,PI],[1.8,.62,PI],[1.75,0,PI],[2.25,.78,PI],[2.25,0,PI],[2.25,-.42,0],[2.25,-.86,0]],
  [[1.2,0,PI],[1.32,-.66,PI],[1.32,.66,PI],[1.7,-.95,PI],[1.7,.95,PI],[1.85,.3,PI],[1.85,-.3,PI],[2.3,0,PI],[2.25,.52,PI],[2.3,-.5,0],[2.25,.95,0]]
];
var SG={phase:'start',time:RULES.build,round:0,team:'blue',level:'easy',sides:[],pieces:[],mice:[],marbles:[],corks:[],kit:[],sel:-1,
  ghost:{x:0,z:1.9,rot:0,ok:false,code:''},msg:{code:'',text:'',t:0},callout:{text:'',t:0},tool:'squad',aim:{on:false,tx:0,tz:0},
  clock:0,acc:0,nextId:1,seed:12345,winner:-1,holder:-1,paused:false,lastHit:null,stats:{},opts:{}};
window.SG=SG;SG.RULES=RULES;SG.FOOT=FOOT;SG.ZONE=ZONE;SG.LEVELS=LEVELS;
var V={pieces:{},mice:[],slots:[[],[]],marbles:{},corks:{},puffs:[],on:false};
function rand(){SG.seed=(SG.seed*16807)%2147483647;return (SG.seed-1)/2147483646;}
function gauss(){return (rand()+rand()+rand()-1.5)*1.15;}
function dist(ax,az,bx,bz){var dx=ax-bx,dz=az-bz;return Math.sqrt(dx*dx+dz*dz);}
function event(type,side,extra){var st=SG.stats;st.events++;if(SG.phase==='fight'||SG.phase==='mend'){var gap=SG.clock-st.lastEvent;if(gap>st.longestGap)st.longestGap=gap;}st.lastEvent=SG.clock;st.last={type:type,side:side,t:SG.clock,extra:extra||''};}

/* ================= rules: where a piece may go ================= */
function corners(kind,x,z,rot){var f=FOOT[kind],c=Math.cos(rot),s=Math.sin(rot),o=[];
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(q){var lx=q[0]*f[0],lz=q[1]*f[1];o.push([x+lx*c+lz*s,z-lx*s+lz*c]);});return o;}
function toLocal(kind,p,x,z){var c=Math.cos(p.rot),s=Math.sin(p.rot),dx=x-p.x,dz=z-p.z;return [dx*c-dz*s,dx*s+dz*c];}
function boxDist(p,x,z){var f=FOOT[p.kind],l=toLocal(p.kind,p,x,z),dx=Math.max(0,Math.abs(l[0])-f[0]),dz=Math.max(0,Math.abs(l[1])-f[1]);return Math.sqrt(dx*dx+dz*dz);}
function overlap(a,b){
  var thin=(a.kind==='wall'||a.kind==='gate')&&(b.kind==='wall'||b.kind==='gate');
  function bx(p){var f=FOOT[p.kind],c=Math.cos(p.rot),s=Math.sin(p.rot);return {x:p.x,z:p.z,ax:[c,-s],az:[s,c],hx:f[0]-(thin?.09:.015),hz:f[1]-.015};}
  var A=bx(a),B=bx(b),axes=[A.ax,A.az,B.ax,B.az],dx=B.x-A.x,dz=B.z-A.z;
  for(var i=0;i<4;i++){var n=axes[i],ra=A.hx*Math.abs(A.ax[0]*n[0]+A.ax[1]*n[1])+A.hz*Math.abs(A.az[0]*n[0]+A.az[1]*n[1]),rb=B.hx*Math.abs(B.ax[0]*n[0]+B.ax[1]*n[1])+B.hz*Math.abs(B.az[0]*n[0]+B.az[1]*n[1]);
    if(Math.abs(dx*n[0]+dz*n[1])>ra+rb)return false;}
  return true;}
function check(side,kind,x,z,rot){
  if(boxDist({kind:kind,x:x,z:z,rot:rot},0,0)<ZONE.rMin)return {ok:false,code:'hill',text:REASON.hill};
  var cs=corners(kind,x,z,rot),i,sg=side?-1:1;
  for(i=0;i<4;i++){var r=Math.sqrt(cs[i][0]*cs[i][0]+cs[i][1]*cs[i][1]),a=Math.abs(Math.atan2(cs[i][0]*sg,cs[i][1]*sg));if(r>ZONE.rMax||a>ZONE.half)return {ok:false,code:'third',text:REASON.third};}
  for(i=0;i<SG.pieces.length;i++)if(overlap({kind:kind,x:x,z:z,rot:rot},SG.pieces[i]))return {ok:false,code:'overlap',text:REASON.overlap};
  return {ok:true,code:'',text:''};}
SG.check=function(kind,x,z,rot,side){return check(side||0,kind,x,z,rot);};
function ends(p){var hx=FOOT[p.kind][0],c=Math.cos(p.rot),s=Math.sin(p.rot);return [[p.x+hx*c,p.z-hx*s],[p.x-hx*c,p.z+hx*s]];}
function snap(side,kind,x,z,rot){
  if(kind!=='wall'&&kind!=='gate')return {x:x,z:z,snapped:false};
  var mine=ends({kind:kind,x:x,z:z,rot:rot}),best=.24,out={x:x,z:z,snapped:false};
  SG.pieces.forEach(function(p){if(p.side!==side||(p.kind!=='wall'&&p.kind!=='gate'))return;ends(p).forEach(function(e){mine.forEach(function(m){var d=dist(e[0],e[1],m[0],m[1]);
    if(d<best){best=d;out={x:x+e[0]-m[0],z:z+e[1]-m[1],snapped:true};}});});});
  return out;}
SG.snap=function(kind,x,z,rot){return snap(0,kind,x,z,rot);};
function w2(side,x,z){return side?[-x,-z]:[x,z];}

/* ================= start ================= */
function newStats(){return {events:0,lastEvent:0,longestGap:0,last:null,partsOff:0,partsMended:0,dizzies:0,hillFlips:0,shots:0,corks:0,stuck:0,fightTime:0};}
SG.start=function(team,opts){
  viewClear();opts=opts||{};SG.opts=opts;SG.team=team==='red'?'red':'blue';SG.level=LEVELS[opts.level]?opts.level:(SG.level||'easy');
  SG.phase='build';SG.time=RULES.build;SG.round=0;SG.pieces=[];SG.mice=[];SG.marbles=[];SG.corks=[];SG.sel=-1;SG.clock=0;SG.acc=0;SG.nextId=1;SG.seed=opts.seed||12345;
  SG.msg={code:'',text:'',t:0};SG.callout={text:'',t:0};SG.tool='squad';SG.aim={on:false,tx:0,tz:0};SG.winner=-1;SG.holder=-1;SG.lastHolder=null;SG.lastKnock=null;SG.obsDirty=true;SG.lastHit=null;SG.stats=newStats();SG.sec=0;
  SG.ghost={x:0,z:1.9,rot:0,ok:false,code:''};SG.sides=[];
  for(var s=0;s<2;s++){var side={team:s===0?SG.team:(SG.team==='blue'?'red':'blue'),bot:s===1,level:SG.level,kit:[],score:0,reload:0,fired:-9,order:null,lobber:0,
      bt:2+s,layout:Math.floor(rand()*LAYOUTS.length),sendT:0,fireT:0,placed:0};SG.sides.push(side);
    KIT.forEach(function(kind,i){var a=(i-(KIT.length-1)/2)*MAT.step,w=w2(s,Math.sin(a)*MAT.r,Math.cos(a)*MAT.r);side.kit.push({kind:kind,a:a,x:w[0],z:w[1],used:false,picked:false});});
    for(var i=0;i<5;i++){var h=w2(s,(i-2)*.42,2.3-Math.abs(i-2)*.1);SG.mice.push({side:s,i:i,state:'idle',x:h[0],z:h[1],rot:s?0:PI,tx:h[0],tz:h[1],hx:h[0],hz:h[1],job:0,part:-1,t:0,wait:.5+i*.4,speed:0,
      ghost:0,turn:i%2?1:-1,px:h[0],pz:h[1],pt:0,cd:1+i*.5,act:0,moved:0,goal:false});}}
  SG.kit=SG.sides[0].kit;viewStart();ui();};
SG.auto=function(side,level){var s=SG.sides[side];if(!s)return;s.bot=true;if(LEVELS[level])s.level=level;if(side===0)SG.sel=-1;};
SG.reset=function(){viewClear();SG.phase='start';SG.pieces=[];SG.mice=[];SG.marbles=[];SG.corks=[];SG.sides=[];SG.kit=[];SG.sel=-1;ui();};
function say(code,text,bad){SG.msg={code:code,text:text,t:bad?2.2:2.6,bad:!!bad};}
function shout(text){SG.callout={text:text,t:2.6};}
function mine(s){return SG.pieces.filter(function(p){return p.side===s;});}

/* ================= build step ================= */
function place(s,slotI,x,z,rot){
  var side=SG.sides[s],slot=side.kit[slotI];if(!slot||slot.used)return {ok:false,code:'none',text:''};
  var sn=snap(s,slot.kind,x,z,rot),c=check(s,slot.kind,sn.x,sn.z,rot);if(!c.ok)return c;
  var p={id:SG.nextId++,side:s,kind:slot.kind,x:sn.x,z:sn.z,rot:rot,built:false,parts:0,progress:0,slot:slotI,mouse:-1,picked:false,ps:[],total:0};
  SG.pieces.push(p);slot.used=true;side.placed++;viewSite(p);return {ok:true,code:'',text:'',piece:p};}
SG.select=function(i){if(SG.phase!=='build'||SG.sides[0].bot)return false;if(i<0||!SG.kit[i]||SG.kit[i].used){SG.sel=-1;return false;}SG.sel=i;refreshGhost();return true;};
function refreshGhost(){var g=SG.ghost;if(SG.sel<0){g.ok=false;return;}var kind=SG.kit[SG.sel].kind,s=snap(0,kind,g.x,g.z,g.rot),c=check(0,kind,s.x,s.z,g.rot);g.sx=s.x;g.sz=s.z;g.ok=c.ok;g.code=c.code;g.text=c.text;}
SG.moveGhost=function(x,z){SG.ghost.x=x;SG.ghost.z=z;refreshGhost();};
SG.turn=function(d){SG.ghost.rot+=d;refreshGhost();};
SG.tryPlace=function(x,z,rot){
  if(SG.phase!=='build'||SG.sel<0)return {ok:false,code:'none',text:'Tap a piece on the mat first'};
  if(rot!=null)SG.ghost.rot=rot;SG.moveGhost(x,z);var g=SG.ghost,kind=SG.kit[SG.sel].kind;
  if(!g.ok){say(g.code,g.text,true);return {ok:false,code:g.code,text:g.text};}
  var r=place(0,SG.sel,g.x,g.z,g.rot),p=r.piece;if(!r.ok)return r;
  SG.sel=-1;say('placed','The mice are on it',false);
  var next=-1;SG.kit.forEach(function(k,i){if(next<0&&!k.used&&k.kind===kind)next=i;});
  if(next>=0){ /* offer the next one beside the piece just placed, at its free end */
    SG.sel=next;var hx=FOOT[kind][0]*2,c=Math.cos(p.rot),s=Math.sin(p.rot),opt=[[p.x+hx*c,p.z-hx*s],[p.x-hx*c,p.z+hx*s]],pickI=-1;
    for(var i=0;i<2;i++)if(pickI<0&&check(0,kind,opt[i][0],opt[i][1],p.rot).ok)pickI=i;
    if(pickI<0)pickI=dist(opt[0][0],opt[0][1],0,2)<dist(opt[1][0],opt[1][1],0,2)?0:1;
    g.x=opt[pickI][0];g.z=opt[pickI][1];refreshGhost();}
  ui();return {ok:true,code:'',text:''};};
SG.undo=function(){
  if(SG.phase!=='build')return false;var ps=mine(0);if(!ps.length)return false;var p=ps[ps.length-1];SG.pieces.splice(SG.pieces.indexOf(p),1);viewDrop(p);
  SG.mice.forEach(function(m){if(m.job===p.id){m.job=0;m.state='idle';m.wait=.3;}});
  SG.obsDirty=true;var k=SG.kit[p.slot];k.used=false;k.picked=false;SG.sides[0].placed--;say('undo','Took the last piece back',false);refreshGhost();ui();return true;};
SG.done=function(){if(SG.phase==='build')finishBuild();};
/* a tidy camp from a preset; used by the bot, by demos and by tests */
function layoutSpot(s,L,i){var q=LAYOUTS[L][i],w=w2(s,Math.sin(q[1])*q[0],Math.cos(q[1])*q[0]);return [w[0],w[1],q[1]+q[2]+(s?PI:0)];}
function botPlace(s,i){var side=SG.sides[s],q=layoutSpot(s,side.layout,i),r=place(s,i,q[0],q[1],q[2]);
  for(var t=0;t<60&&!r.ok;t++){var a=(rand()-.5)*2*(ZONE.half-.25),d=1.3+rand()*1.2,w=w2(s,Math.sin(a)*d,Math.cos(a)*d);r=place(s,i,w[0],w[1],a+PI+(s?PI:0));}
  return r;}
SG.demo=function(n,sideI){var s=sideI||0,out=[];SG.sides[s].layout=0;for(var i=0;i<Math.min(n==null?KIT.length:n,KIT.length);i++)if(!SG.sides[s].kit[i].used)out.push(botPlace(s,i));if(!s)SG.sel=-1;return out;};
function nextSlot(s){var k=SG.sides[s].kit;for(var i=0;i<k.length;i++)if(!k[i].used)return i;return -1;}
function finishBuild(){
  for(var s=0;s<2;s++)if(SG.sides[s].bot){var i;while((i=nextSlot(s))>=0){if(!botPlace(s,i).ok)SG.sides[s].kit[i].used=true;}}
  SG.pieces.forEach(function(p){if(!p.built){startObj(p);completePiece(p,false);}});
  SG.mice.forEach(function(m){m.state='cheer';m.job=0;m.goal=false;m.rot=m.side?PI:0;});
  SG.phase='ready';SG.sel=-1;SG.time=RULES.ready;SG.readyText=mine(0).length+' of '+KIT.length+' pieces placed. Round 1 is coming.';ui();}
SG.skipBuild=function(){if(SG.phase!=='build')return;for(var s=0;s<2;s++){var i;while((i=nextSlot(s))>=0){if(!botPlace(s,i).ok)SG.sides[s].kit[i].used=true;}}finishBuild();};
function startObj(p){if(p.ps.length||p.started)return;p.started=true;var ids=viewObj(p);
  ids.forEach(function(q){p.ps.push({id:q.id,st:'on',used:false,mender:-1,wx:q.x,wy:q.y,wz:q.z,rx:0,rz:0,t0:0,dx:0,dz:0,rank:q.rank});});p.total=p.ps.length;}
function raise(p){var n=p.ps.length;if(n){p.parts=Math.min(n,Math.floor(p.progress*n+.001));}else p.parts=p.progress>=1?1:0;}
function completePiece(p,puff){p.progress=1;raise(p);p.built=true;p.parts=p.total||1;SG.sides[p.side].kit[p.slot].picked=true;if(p.kind==='lobber')SG.sides[p.side].lobber=p.id;SG.obsDirty=true;if(puff)viewPuff(p.x,p.z,2);}

/* ================= walking ================= */
function blocks(p){if(!p.built&&p.progress<=0)return false;if(p.kind==='wall'||p.kind==='gate'){var on=0,all=0;p.ps.forEach(function(q){if(/plank|door/.test(q.id)){all++;if(q.st==='on')on++;}});if(p.built&&all&&on<all/2)return false;}return true;}
function circles(p){var f=FOOT[p.kind],c=Math.cos(p.rot),s=Math.sin(p.rot),o=[];
  if(f[0]>f[1]*2){var r=f[1]+.1,d=f[0]-f[1];[-d,-d/2,0,d/2,d].forEach(function(k){o.push([p.x+k*c,p.z-k*s,r,p.id]);});}else o.push([p.x,p.z,Math.max(f[0],f[1])+.06,p.id]);return o;}
var OBS=[[],[]];
function buildObs(){for(var s=0;s<2;s++){var o=[[0,0,.07,0]];SG.pieces.forEach(function(p){if(!blocks(p))return;if(p.kind==='gate'&&p.side===s&&p.built)return;circles(p).forEach(function(c){o.push(c);});});OBS[s]=o;}SG.obsDirty=false;}
function walk(m,dt,speed){
  var dx=m.tx-m.x,dz=m.tz-m.z,d=Math.sqrt(dx*dx+dz*dz);if(d<.07){m.speed=0;return true;}
  var ux=dx/d,uz=dz/d,sx=ux,sz=uz,obs=m.ghost>0?[]:OBS[m.side],i,ox,oz,od,R;
  for(i=0;i<obs.length;i++){if(obs[i][3]===m.skip&&m.skip)continue;ox=m.x-obs[i][0];oz=m.z-obs[i][1];od=Math.sqrt(ox*ox+oz*oz)||.001;R=obs[i][2]+.07;
    if(od<R+.25&&d>.2){var w=Math.min(1.5,1-(od-R)/.25),ax=ox/od,az=oz/od,tx=-az,tz=ax,dot=tx*ux+tz*uz;if(Math.abs(dot)<.15)dot=m.turn;if(dot<0){tx=-tx;tz=-tz;}
      sx+=ax*w*1.1+tx*w*1.2;sz+=az*w*1.1+tz*w*1.2;}}
  var sl=Math.sqrt(sx*sx+sz*sz)||1;sx/=sl;sz/=sl;var stepLen=Math.min(d,speed*dt);m.x+=sx*stepLen;m.z+=sz*stepLen;
  for(i=0;i<obs.length;i++){if(obs[i][3]===m.skip&&m.skip)continue;ox=m.x-obs[i][0];oz=m.z-obs[i][1];od=Math.sqrt(ox*ox+oz*oz)||.001;R=obs[i][2]+.05;if(od<R&&d>.2){m.x=obs[i][0]+ox/od*R;m.z=obs[i][1]+oz/od*R;}}
  var rr=Math.sqrt(m.x*m.x+m.z*m.z);if(rr>3.1){m.x*=3.1/rr;m.z*=3.1/rr;}
  var want=Math.atan2(sx,sz),da=want-m.rot;while(da>PI)da-=2*PI;while(da<-PI)da+=2*PI;m.rot+=da*Math.min(1,dt*10);m.speed=speed;
  /* a mouse that makes no headway for a while squeezes straight through */
  m.pt+=dt;if(m.pt>2){if(dist(m.x,m.z,m.px,m.pz)<speed*.5)m.ghost=2.5;m.px=m.x;m.pz=m.z;m.pt=0;}
  if(m.ghost>0)m.ghost-=dt;return false;}
function workSpot(p,m){var f=FOOT[p.kind],nx=Math.sin(p.rot),nz=Math.cos(p.rot),d=f[1]+.2,a=[p.x+nx*d,p.z+nz*d],b=[p.x-nx*d,p.z-nz*d];
  function cost(q){var c=dist(q[0],q[1],m.x,m.z);if(Math.sqrt(q[0]*q[0]+q[1]*q[1])<.5)c+=5;OBS[m.side].forEach(function(o){if(o[3]!==p.id&&dist(q[0],q[1],o[0],o[1])<o[2]+.05)c+=3;});return c;}
  return cost(a)<=cost(b)?a:b;}
function pieceById(id){for(var i=0;i<SG.pieces.length;i++)if(SG.pieces[i].id===id)return SG.pieces[i];return null;}
function goTo(m,x,z){if(dist(m.tx,m.tz,x,z)>.02){m.tx=x;m.tz=z;m.pt=0;m.px=m.x;m.pz=m.z;}}
function freeSpot(s,i){for(var k=0;k<12;k++){var a=((i-2)*.3+(k%2?1:-1)*Math.ceil(k/2)*.22),r=2.45-(k>6?.5:0),w=w2(s,Math.sin(a)*r,Math.cos(a)*r),ok=true;
    OBS[s].forEach(function(o){if(dist(w[0],w[1],o[0],o[1])<o[2]+.12)ok=false;});if(ok)return w;}return w2(s,(i-2)*.3,2.5);}

function tickBuild(dt){
  SG.time-=dt;if(SG.time<=0){SG.time=0;finishBuild();return;}
  for(var s=0;s<2;s++){var side=SG.sides[s];if(!side.bot)continue;side.bt-=dt;if(side.bt<=0){var i=nextSlot(s);if(i>=0){if(!botPlace(s,i).ok)side.kit[i].used=true;}side.bt=3.6+rand()*2.2;}}
  /* hand each waiting order to the nearest free mouse of its side */
  SG.pieces.forEach(function(p){if(p.built||p.mouse>=0)return;var best=null,bd=1e9,slot=SG.sides[p.side].kit[p.slot];
    SG.mice.forEach(function(m){if(m.side!==p.side||(m.state!=='idle'&&m.state!=='wander'))return;var d=dist(m.x,m.z,slot.x,slot.z);if(d<bd){bd=d;best=m;}});
    if(best){var w=w2(p.side,Math.sin(slot.a)*MAT.pick,Math.cos(slot.a)*MAT.pick);p.mouse=best.i;best.job=p.id;best.state='toMat';best.skip=p.id;goTo(best,w[0],w[1]);best.ghost=0;}});
  SG.mice.forEach(function(m){
    var p=m.job?pieceById(m.job):null;if(m.job&&!p){m.job=0;m.state='idle';m.wait=.3;}m.goal=m.state==='toMat'||m.state==='carry';
    if(m.state==='toMat'){if(walk(m,dt,RULES.walk)){p.picked=true;SG.sides[m.side].kit[p.slot].picked=true;var w=workSpot(p,m);goTo(m,w[0],w[1]);m.state='carry';}}
    else if(m.state==='carry'){if(walk(m,dt,RULES.walk*.85)){m.state='hammer';m.t=0;m.speed=0;m.rot=Math.atan2(p.x-m.x,p.z-m.z);startObj(p);SG.obsDirty=true;}}
    else if(m.state==='hammer'){m.t+=dt;p.progress=Math.min(1,m.t/RULES.buildTime);raise(p);if(p.progress>=1){completePiece(p,true);p.mouse=-1;m.job=0;m.skip=0;m.state='idle';m.wait=.6+rand();}}
    else if(m.state==='wander'){if(walk(m,dt,.5)){m.state='idle';m.wait=1.5+rand()*2.5;}}
    else if(m.state==='idle'){m.speed=0;m.wait-=dt;if(m.wait<=0){for(var k=0;k<8;k++){var a=(rand()-.5)*1.9,r=1.25+rand()*1.25,w2p=w2(m.side,Math.sin(a)*r,Math.cos(a)*r),free=true;
        OBS[m.side].forEach(function(o){if(dist(w2p[0],w2p[1],o[0],o[1])<o[2]+.15)free=false;});if(free){goTo(m,w2p[0],w2p[1]);m.state='wander';break;}}
        if(m.state==='idle')m.wait=1;}}
  });}

/* ================= the fight ================= */
function startRound(n){SG.phase='fight';SG.round=n;SG.time=RULES.round;SG.sec=0;if(n===1){SG.stats.lastEvent=SG.clock;SG.stats.longestGap=0;}
  SG.mice.forEach(function(m){if(m.state==='cheer'||m.state==='wander'){m.state='idle';}if(n===1){var w=freeSpot(m.side,m.i);m.hx=w[0];m.hz=w[1];}});
  SG.sides.forEach(function(s){s.sendT=LEVELS[s.level].send;s.fireT=LEVELS[s.level].fire*(.5+rand()*.5);if(n===1)s.reload=RULES.reload*.5;});
  shout('Round '+n+' of '+RULES.rounds+'. Hold the hill!');ui();}
function endMatch(w){SG.phase='over';SG.winner=w;SG.aim.on=false;SG.mice.forEach(function(m){if(m.state==='dizzy'){m.state='idle';}if(m.side===w){m.state='cheer';m.rot=0;}else if(m.state!=='cheer'){m.state='idle';m.speed=0;}m.goal=false;});
  event('win',w);ui();}
function standing(m){return m.state!=='dizzy'&&m.x*m.x+m.z*m.z<HILL*HILL;}
SG.onHill=function(){var n=[0,0];SG.mice.forEach(function(m){if(standing(m))n[m.side]++;});return n;};
function scoreTick(dt){
  var n=SG.onHill(),h=n[0]>n[1]?0:(n[1]>n[0]?1:-1);
  if(h>=0&&h!==SG.lastHolder){if(SG.lastHolder!=null)SG.stats.hillFlips++;event('hill',h);shout(NAME[SG.sides[h].team]+' holds the hill!');SG.lastHolder=h;}
  SG.holder=h;SG.sec+=dt;
  while(SG.sec>=1){SG.sec-=1;if(h>=0){SG.sides[h].score=Math.min(RULES.win,SG.sides[h].score+RULES.gain*Math.abs(n[0]-n[1]));}}
  for(var s=0;s<2;s++)if(SG.sides[s].score>=RULES.win){endMatch(s);return true;}return false;}
SG.blueShare=function(){var b=SG.sides[0].team==='blue'?0:1,d=SG.sides[b].score-SG.sides[1-b].score;return Math.max(0,Math.min(1,.5+d/70+(SG.holder<0?0:(SG.holder===b?.12:-.12))));};

/* --- the lobber --- */
function lobberOf(s){var id=SG.sides[s].lobber;return id?pieceById(id):null;}
SG.arc=function(s,tx,tz){var l=lobberOf(s);if(!l)return null;var dx=tx-l.x,dz=tz-l.z,d=Math.sqrt(dx*dx+dz*dz),mx=6.2,mn=.7;
  if(d>mx){tx=l.x+dx/d*mx;tz=l.z+dz/d*mx;d=mx;}else if(d<mn&&d>0){tx=l.x+dx/d*mn;tz=l.z+dz/d*mn;d=mn;}
  var rr=Math.sqrt(tx*tx+tz*tz);if(rr>3.2){tx*=3.2/rr;tz*=3.2/rr;}
  return {x0:l.x,y0:.5,z0:l.z,x1:tx,z1:tz,h:.55+d*.2,T:.65+d*.17};};
SG.fire=function(s,tx,tz){var side=SG.sides[s];if(SG.phase!=='fight'||side.reload>0)return null;var a=SG.arc(s,tx,tz);if(!a)return null;
  a.id=SG.nextId++;a.side=s;a.t=0;a.live=true;SG.marbles.push(a);side.reload=RULES.reload;side.fired=SG.clock;SG.stats.shots++;event('shot',s);
  var l=lobberOf(s);l.aim=Math.atan2(a.x1-l.x,a.z1-l.z);return a;};
function marblePos(a,k){return [a.x0+(a.x1-a.x0)*k,a.y0*(1-k)+4*a.h*k*(1-k),a.z0+(a.z1-a.z0)*k];}
function knock(p,i,dx,dz,by){var q=p.ps[i];if(!q||q.st!=='on')return false;var l=Math.sqrt(dx*dx+dz*dz)||1,f=.28+rand()*.3,lat=(rand()-.5)*.3;
  q.st='off';q.t0=SG.clock;q.rx=q.wx+dx/l*f-dz/l*lat;q.rz=q.wz+dz/l*f+dx/l*lat;var rr=Math.sqrt(q.rx*q.rx+q.rz*q.rz);if(rr>3.05){q.rx*=3.05/rr;q.rz*=3.05/rr;}
  q.mender=-1;p.parts--;SG.stats.partsOff++;SG.obsDirty=true;event('part',p.side,q.id);SG.lastKnock={piece:p.id,part:q.id,by:by||'',t:SG.clock};return true;}
function nearestPart(p,x,y,z,flat){var best=-1,bd=1e9;p.ps.forEach(function(q,i){if(q.st!=='on')return;var d=(q.wx-x)*(q.wx-x)+(q.wz-z)*(q.wz-z)+(flat?0:(q.wy-y)*(q.wy-y));if(d<bd){bd=d;best=i;}});return best;}
function hitPiece(p,x,y,z,dx,dz){var i=nearestPart(p,x,y,z,false);if(i<0)return '';var id=p.ps[i].id;knock(p,i,dx,dz,'marble');return id;}
function dizzy(m){if(m.state==='dizzy'||SG.phase==='over')return false;dropJob(m);m.state='dizzy';m.t=SG.sides[m.side].team==='red'?RULES.redDizzy:RULES.dizzy;   /* red scrappers are tough: they shake it off sooner */m.speed=0;m.goal=false;m.daze=false;SG.stats.dizzies++;event('dizzy',m.side);return true;}
function dropJob(m){if(m.part>=0){var p=pieceById(m.job),q=p&&p.ps[m.part];if(q){if(q.st==='carried'){q.st='off';q.rx=m.x;q.rz=m.z;q.t0=SG.clock-2;}q.mender=-1;}}m.job=0;m.part=-1;m.skip=0;}
function tickMarbles(dt){
  for(var i=SG.marbles.length-1;i>=0;i--){var a=SG.marbles[i];a.t+=dt;
    if(!a.live){if(a.t>a.T+.8)SG.marbles.splice(i,1);continue;}
    var k=Math.min(1,a.t/a.T),pos=marblePos(a,k),hit=null,part='',n=0,j;
    if(k>.12)for(j=0;j<SG.pieces.length;j++){var p=SG.pieces[j];if(p.side===a.side||!p.built||pos[1]>TALL[p.kind])continue;if(p.total&&p.parts<=0)continue;
      var f=FOOT[p.kind],l=toLocal(p.kind,p,pos[0],pos[2]);if(Math.abs(l[0])<f[0]+.03&&Math.abs(l[1])<f[1]+.05){hit=p;break;}}
    var red=SG.sides[a.side].team==='red',blast=red?RULES.redBlast:RULES.blast;
    if(hit){part=hitPiece(hit,pos[0],pos[1],pos[2],a.x1-a.x0,a.z1-a.z0);if(red)hitPiece(hit,pos[0],pos[1],pos[2],a.x1-a.x0,a.z1-a.z0);} /* red's heavy scrap marble knocks two parts off and has a wider thump */
    if(hit||k>=1){SG.mice.forEach(function(m){if(m.side!==a.side&&dist(m.x,m.z,pos[0],pos[2])<blast&&dizzy(m))n++;});
      a.live=false;a.T=a.t;a.hx=pos[0];a.hy=pos[1];a.hz=pos[2];SG.lastHit={id:a.id,side:a.side,x:pos[0],y:pos[1],z:pos[2],piece:hit?hit.id:0,part:part,dizzied:n,t:SG.clock};viewPuff(pos[0],pos[2],1.2);}}
  for(i=SG.corks.length-1;i>=0;i--){SG.corks[i].t+=dt;if(SG.corks[i].t>.3)SG.corks.splice(i,1);}}

/* --- orders --- */
SG.order=function(s,x,z){var side=SG.sides[s];if(SG.phase!=='fight'&&SG.phase!=='mend')return false;var r=Math.sqrt(x*x+z*z);if(r>3.0){x*=3/r;z*=3/r;}side.order={x:x,z:z};if(!s&&!side.bot)say('order','Squad on the way',false);return true;};
function mendable(p){var o=[];p.ps.forEach(function(q,i){if(q.st==='off'&&!q.used&&q.mender<0)o.push(i);});return o;}
function isFree(m){return m.state==='idle'||m.state==='go'||m.state==='hold';}
function assignMend(m,p,i){var q=p.ps[i];q.mender=m.side*10+m.i;m.job=p.id;m.part=i;m.state='toPart';m.skip=p.id;goTo(m,q.rx,q.rz);}
SG.mend=function(s,pieceId){var p=pieceById(pieceId);if(!p||p.side!==s||(SG.phase!=='fight'&&SG.phase!=='mend'))return false;var list=mendable(p);if(!list.length)return false;
  var best=null,bd=1e9,q=p.ps[list[0]];SG.mice.forEach(function(m){if(m.side!==s||!isFree(m))return;var d=dist(m.x,m.z,q.rx,q.rz);if(d<bd){bd=d;best=m;}});if(!best)return false;assignMend(best,p,list[0]);return true;};
function autoMend(s){SG.pieces.forEach(function(p){if(p.side!==s||!p.built)return;mendable(p).forEach(function(i){var q=p.ps[i],best=null,bd=1e9;
  SG.mice.forEach(function(m){if(m.side!==s||!isFree(m))return;var d=dist(m.x,m.z,q.rx,q.rz);if(d<bd){bd=d;best=m;}});if(best)assignMend(best,p,i);});});}
SG.damaged=function(s){return SG.pieces.filter(function(p){return p.side===s&&p.built&&mendable(p).length>0;});};

/* --- mice in the fight --- */
function tickMice(dt){
  SG.mice.forEach(function(m){
    var side=SG.sides[m.side],en=1-m.side,p,q;if(m.cd>0)m.cd-=dt;if(m.act>0)m.act-=dt;
    if(m.state==='cheer')return;
    if(m.state==='dizzy'){m.t-=dt;m.goal=false;if(m.t<=0&&m.daze){m.daze=false;m.state='idle';return;}
      if(m.t<=0){var w=freeSpot(m.side,m.i);viewPuff(m.x,m.z,1);m.x=w[0];m.z=w[1];m.tx=w[0];m.tz=w[1];m.state='idle';m.rot=m.side?0:PI;m.ghost=0;viewPuff(m.x,m.z,1);event('home',m.side);}return;}
    if(m.state==='toPart'||m.state==='bring'||m.state==='fix'){p=pieceById(m.job);q=p&&p.ps[m.part];if(!q){dropJob(m);m.state='idle';return;}m.goal=m.state!=='fix';
      if(m.state==='toPart'){if(walk(m,dt,RULES.walk)){q.st='carried';var ws=workSpot(p,m);goTo(m,ws[0],ws[1]);m.state='bring';}}
      else if(m.state==='bring'){if(walk(m,dt,RULES.walk*.85)){m.state='fix';m.t=0;m.speed=0;m.rot=Math.atan2(p.x-m.x,p.z-m.z);}}
      else{m.t+=dt;if(m.t>=RULES.mendTime){q.st='on';q.used=true;q.mender=-1;p.parts++;SG.stats.partsMended++;SG.obsDirty=true;event('mend',m.side,q.id);m.job=0;m.part=-1;m.skip=0;m.state='idle';}}
      return;}
    /* free: follow the squad order, or go home */
    var tx=m.hx,tz=m.hz;
    if(side.order){var a=m.i/5*PI*2+m.side,rad=m.i===0?0:.42;tx=side.order.x+Math.cos(a)*rad;tz=side.order.z+Math.sin(a)*rad;}
    if(side.bot&&side.team==="red"&&m.i>=4&&side.raid){tx=side.raid.x;tz=side.raid.z;}
    goTo(m,tx,tz);if(walk(m,dt,RULES.walk)){m.state=side.order?'hold':'idle';m.goal=false;}else{m.state='go';m.goal=true;}
    if(SG.phase!=='fight')return;
    /* blue pops corks at range; red knocks planks off walls it can reach */
    if(side.team==='blue'&&m.cd<=0){var best=null,bd=RULES.corkRange;SG.mice.forEach(function(o){if(o.side!==en||o.state==='dizzy')return;var d=dist(m.x,m.z,o.x,o.z);if(d<bd){bd=d;best=o;}});
      if(best){m.cd=RULES.corkEvery;m.act=.6;m.rot=Math.atan2(best.x-m.x,best.z-m.z);SG.corks.push({id:SG.nextId++,x0:m.x,z0:m.z,x1:best.x,z1:best.z,t:0});SG.stats.corks++;if(rand()<RULES.corkChance&&dizzy(best)){best.t=RULES.corkDaze;best.daze=true;}}}
    else if(side.team==='red'&&m.cd<=0){for(var j=0;j<SG.pieces.length;j++){p=SG.pieces[j];if(p.side!==en||!p.built||!p.total||p.parts<=0)continue;if(boxDist(p,m.x,m.z)>RULES.scrapReach)continue;
        var i=nearestPart(p,m.x,0,m.z,true);if(i>=0){knock(p,i,p.x-m.x,p.z-m.z,'scrap');m.cd=RULES.scrapEvery;m.act=.7;m.rot=Math.atan2(p.x-m.x,p.z-m.z);break;}}}
  });}
function stuckCheck(dt){SG.mice.forEach(function(m){if(!m.goal){m.moved=0;m.sx=m.x;m.sz=m.z;return;}if(m.sx==null){m.sx=m.x;m.sz=m.z;}
  if(dist(m.x,m.z,m.sx,m.sz)>.08){m.sx=m.x;m.sz=m.z;m.moved=0;}else{m.moved+=dt;if(m.moved>20){SG.stats.stuck++;m.moved=-1e9;}}});}

/* --- the bot --- */
function botFight(s,dt){
  var side=SG.sides[s],L=LEVELS[side.level],en=1-s,w;side.sendT-=dt;side.fireT-=dt;
  if(side.sendT<=0){w=w2(s,(rand()-.5)*.5,.3+rand()*.2);side.order={x:w[0],z:w[1]};side.sendT=10+rand()*6;
    if(side.team==='red'){var best=null,bd=1e9;SG.pieces.forEach(function(p){if(p.side!==en||!p.built||!p.total||p.parts<=0||(p.kind!=='wall'&&p.kind!=='gate'))return;var d=dist(p.x,p.z,0,0);if(d<bd){bd=d;best=p;}});
      if(side.score<SG.sides[en].score+8)best=null;   /* only spare a scrapper for the walls when ahead */
      if(best){var d0=Math.sqrt(best.x*best.x+best.z*best.z)||1,k=(d0-FOOT[best.kind][1]-.3)/d0;side.raid={x:best.x*k,z:best.z*k};}else side.raid=null;}}
  if(side.reload<=0&&side.fireT<=0&&side.lobber){var tx=0,tz=0,found=false,foes=SG.mice.filter(function(m){return m.side===en&&m.state!=='dizzy';});
    if(rand()<.62&&foes.length){ /* the foe with most friends around it */
      var bestN=-1;foes.forEach(function(m){var n=0;foes.forEach(function(o){if(dist(m.x,m.z,o.x,o.z)<.6)n++;});if(n>bestN){bestN=n;tx=m.x;tz=m.z;}});found=true;}
    if(!found){var ws=SG.pieces.filter(function(p){return p.side===en&&p.built&&p.total&&p.parts>0;});if(ws.length){var p=ws[Math.floor(rand()*ws.length)];tx=p.x;tz=p.z;found=true;}}
    if(found){SG.fire(s,tx+gauss()*L.err,tz+gauss()*L.err);side.fireT=L.fire*(.8+rand()*.4);}}}

function tickFight(dt){
  SG.stats.fightTime+=dt;SG.time-=dt;
  for(var s=0;s<2;s++){var side=SG.sides[s];if(side.reload>0)side.reload=Math.max(0,side.reload-dt);if(side.bot)botFight(s,dt);}
  tickMarbles(dt);tickMice(dt);stuckCheck(dt);if(scoreTick(dt))return;
  if(SG.time<=0){
    if(SG.round<RULES.rounds){SG.phase='mend';SG.time=RULES.brk;SG.aim.on=false;shout('Mend break');ui();}
    else{var a=SG.sides[0].score,b=SG.sides[1].score,w;if(a!==b)w=a>b?0:1;else{var n=SG.onHill();w=n[0]!==n[1]?(n[0]>n[1]?0:1):(SG.lastHolder!=null?SG.lastHolder:0);}endMatch(w);}}}
function tickMend(dt){SG.time-=dt;autoMend(0);autoMend(1);tickMarbles(dt);tickMice(dt);stuckCheck(dt);if(SG.time<=0)startRound(SG.round+1);}

function tick(dt){
  SG.clock+=dt;if(SG.msg.t>0)SG.msg.t-=dt;if(SG.callout.t>0)SG.callout.t-=dt;viewTick(dt);if(SG.obsDirty!==false)buildObs();
  if(SG.phase==='build')tickBuild(dt);
  else if(SG.phase==='ready'){SG.time-=dt;if(SG.time<=0){if(SG.opts.buildOnly){SG.time=0;}else startRound(1);}}
  else if(SG.phase==='fight')tickFight(dt);
  else if(SG.phase==='mend')tickMend(dt);}
SG.step=function(dt){SG.acc+=dt;var n=0;while(SG.acc>=STEP-1e-9){tick(STEP);SG.acc-=STEP;n++;}return n;};
SG.debug={knock:function(pieceId,partId){var p=pieceById(pieceId);if(!p)return false;for(var i=0;i<p.ps.length;i++)if(p.ps[i].id===partId)return knock(p,i,p.side?1:-1,p.side?-1:1,'debug');return false;},
  dizzy:function(s,i){var m=SG.mice[s*5+i];return m?dizzy(m):false;},piece:pieceById,blocks:function(id){return blocks(pieceById(id));}};

/* ================= drawing ================= */
var R,S,C,W,H,world,hill,ghostObj=null,ghostKind='',ring,selRing,zoneMesh,GM,arcMesh,landRing,orderRing,hasDom=typeof document!=='undefined';
function E(id){return document.getElementById(id);}
function viewClear(){if(!V.on)return;while(world.children.length)world.remove(world.children[0]);V.pieces={};V.mice=[];V.slots=[[],[]];V.marbles={};V.corks={};V.puffs=[];if(ghostObj){S.remove(ghostObj);ghostObj=null;ghostKind='';}}
function viewStart(){if(!V.on)return;
  SG.sides.forEach(function(side,s){side.kit.forEach(function(k,i){var o=SS.piece(k.kind,side.team);o.scale.setScalar(MAT.scale);o.position.set(k.x,.012,k.z);o.rotation.y=k.a+(s?PI:0);world.add(o);V.slots[s].push(o);});});
  var furs=['tan','grey','cream','brown','tan'];SG.mice.forEach(function(m){var o=SS.mouse(SG.sides[m.side].team,{fur:furs[(m.i+m.side)%5]});world.add(o);V.mice.push(o);});
  V.mats[0].material.color.set(SG.sides[0].team==='red'?0x93381f:0x2a55a8);V.mats[1].material.color.set(SG.sides[1].team==='red'?0x93381f:0x2a55a8);
  hill.userData.sA.set(SS.PAL.red.main);hill.userData.sB.set(SS.PAL.blue.main);SS.setHill(hill,.5);}
function ghostOf(kind,team,m){var g=SS.piece(kind,team);g.scale.setScalar(PS);g.traverse(function(o){if(o.isMesh){o.material=m;o.castShadow=false;o.receiveShadow=false;}});return g;}
function tint(g,m){g.traverse(function(o){if(o.isMesh)o.material=m;});}
function viewSite(p){if(!V.on)return;var gh=ghostOf(p.kind,SG.sides[p.side].team,GM.site);gh.position.set(p.x,0,p.z);gh.rotation.y=p.rot;world.add(gh);V.pieces[p.id]={ghost:gh,obj:null,order:[]};}
function viewDrop(p){var v=V.pieces[p.id];if(!v)return;if(v.ghost)world.remove(v.ghost);if(v.obj)world.remove(v.obj);delete V.pieces[p.id];}
function rank(name,y){return (/post/.test(name)?0:(/brace|floor|pole/.test(name)?1:(/plank|door|wall/.test(name)?2:(/roof|flap|ridge|chimney/.test(name)?4:3))))*10+y;}
/* makes the real model of a piece; returns its parts in building order with world positions */
var _tmpPiece=null;
function viewObj(p){
  var team=SG.sides[p.side].team,o=SS.piece(p.kind,team,{solid:false,variant:p.id%3}),parts=SS.parts(o),c=Math.cos(p.rot),s=Math.sin(p.rot),out=[];
  parts.forEach(function(m){var h=m.userData.home;out.push({id:m.userData.partId,x:p.x+(h[0]*c+h[2]*s)*PS,y:h[1]*PS,z:p.z+(-h[0]*s+h[2]*c)*PS,rank:rank(m.name,h[1])});});
  if(V.on){var v=V.pieces[p.id]||(V.pieces[p.id]={ghost:null,obj:null,order:[]});if(v.ghost){world.remove(v.ghost);v.ghost=null;}
    o.scale.setScalar(PS);o.position.set(p.x,0,p.z);o.rotation.y=p.rot;world.add(o);v.obj=o;v.parts=parts;v.order=parts.map(function(m,i){return i;}).sort(function(a,b){return out[a].rank-out[b].rank;});v.shown=-1;v.solid=false;}
  return out;}
function viewPuff(x,z,sc){if(!V.on)return;var d=SS.fx.dust();d.position.set(x,0,z);d.userData.sc=sc||1;world.add(d);V.puffs.push({o:d,t:0});}
function viewTick(dt){if(!V.on)return;for(var q=V.puffs.length-1;q>=0;q--){var pf=V.puffs[q];pf.t+=dt/.7;SS.fx.dustStep(pf.o,pf.t);pf.o.scale.multiplyScalar(pf.o.userData.sc);if(pf.t>=1){world.remove(pf.o);V.puffs.splice(q,1);}}}
var POSE={idle:'idle',wander:'walk',toMat:'walk',carry:'carry',hammer:'hammer',cheer:'cheer',go:'walk',hold:'idle',dizzy:'dizzy',toPart:'walk',bring:'carry',fix:'hammer'},_v=null;
function syncPieces(){
  SG.pieces.forEach(function(p){var v=V.pieces[p.id];if(!v||!v.obj)return;var n=p.ps.length,i;
    if(p.kind==='lobber'&&p.built){var side=SG.sides[p.side],since=SG.clock-side.fired;v.obj.rotation.y=p.aim==null?p.rot:p.aim;
      SS.lobberPose(v.obj,SG.phase==='fight'||SG.phase==='mend'?(side.reload>0?Math.max(0,1-side.reload/(RULES.reload-.5)):1):0,since<.9?since/.9:0);
      var mb=v.obj.userData.loaded;if(!mb){mb=v.obj.userData.loaded=SS.fx.marble(side.team);v.obj.getObjectByName('socket_fire').add(mb);mb.position.z=-.03;}mb.visible=(SG.phase==='fight'||SG.phase==='mend')&&side.reload<=0;}
    if(!p.built){if(n){if(v.shown!==p.parts){for(i=0;i<n;i++)v.parts[v.order[i]].visible=i<p.parts;v.shown=p.parts;}}else{var k=Math.min(1,p.progress);v.obj.scale.set(PS*(.8+.2*k),PS*(.12+.88*k),PS*(.8+.2*k));}return;}
    if(!n){v.obj.scale.setScalar(PS);return;}
    var whole=p.parts>=n;
    if(whole){if(!v.solid){for(i=0;i<n;i++){v.parts[i].position.fromArray(v.parts[i].userData.home);v.parts[i].rotation.set(0,0,0);}SS.solid(v.obj,true);v.solid=true;}return;}
    if(v.solid||v.obj.userData.solid){SS.solid(v.obj,false);v.solid=false;}
    for(i=0;i<n;i++){var q=p.ps[i],m=v.parts[i],h=m.userData.home;
      if(q.st==='on'){m.visible=true;m.position.fromArray(h);m.rotation.set(0,0,0);}
      else if(q.st==='carried'){m.visible=false;}
      else{m.visible=true;var u=Math.min(1,(SG.clock-q.t0)/.75);_v.set(q.rx,.035,q.rz);v.obj.worldToLocal(_v);
        m.position.set(h[0]+(_v.x-h[0])*u,h[1]+(_v.y-h[1])*u+Math.sin(u*PI)*.55,h[2]+(_v.z-h[2])*u);m.rotation.set(u*(PI/2+((i%3)-1)*.2),u*(1.3+i),u<1?u*7:0);}}
  });}
function syncAll(){
  if(!V.on)return;var i,ph=SG.phase;
  if(!SG.sides.length){zoneMesh.visible=selRing.visible=ring.visible=arcMesh.visible=landRing.visible=orderRing.visible=false;if(ghostObj)ghostObj.visible=false;return;}
  SG.mice.forEach(function(m,i){var o=V.mice[i];if(!o)return;var st=m.state,pose=POSE[st]||'idle',r2=m.x*m.x+m.z*m.z;
    if(m.act>0&&(st==='hold'||st==='go'||st==='idle'))pose=SG.sides[m.side].team==='blue'?'aim':'hammer';
    o.position.set(m.x,r2<.62*.62?SS.hillHeight(m.x,m.z)*(st==='dizzy'?.7:1):0,m.z);o.rotation.y=m.rot;SS.pose(o,pose,SG.clock*(st==='wander'?.6:1)+i*.37);});
  for(var s=0;s<2;s++)SG.sides[s].kit.forEach(function(k,i){var o=V.slots[s][i];if(!o)return;o.visible=!k.picked&&ph==='build'||(!k.used);var sel=!s&&i===SG.sel;o.position.y=sel?.07+.02*Math.sin(SG.clock*5):.012;o.scale.setScalar(MAT.scale*(k.used&&!k.picked?.8:1));});
  syncPieces();
  var showGhost=ph==='build'&&SG.sel>=0;zoneMesh.visible=showGhost;selRing.visible=showGhost;
  if(showGhost){var kind=SG.kit[SG.sel].kind,g=SG.ghost;selRing.position.set(SG.kit[SG.sel].x,.012,SG.kit[SG.sel].z);
    if(ghostKind!==kind+SG.team){if(ghostObj)S.remove(ghostObj);ghostObj=ghostOf(kind,SG.team,GM.ok);S.add(ghostObj);ghostKind=kind+SG.team;ghostObj.userData.ok=true;}
    if(ghostObj.userData.ok!==g.ok){tint(ghostObj,g.ok?GM.ok:GM.bad);ghostObj.userData.ok=g.ok;}
    ghostObj.visible=true;ghostObj.position.set(g.sx==null?g.x:g.sx,.01,g.sz==null?g.z:g.sz);ghostObj.rotation.y=g.rot;
    var rr=Math.max(FOOT[kind][0],FOOT[kind][1])+.1;ring.visible=true;ring.scale.setScalar(rr);ring.position.set(ghostObj.position.x,.008,ghostObj.position.z);ring.material.color.set(g.ok?0x8fd0ff:0xff5a44);
  }else{if(ghostObj)ghostObj.visible=false;ring.visible=false;}
  /* marbles, corks, aim arc, order marker */
  var seen={};SG.marbles.forEach(function(a){seen[a.id]=1;var o=V.marbles[a.id];if(!o){o=V.marbles[a.id]=SS.fx.marble(SG.sides[a.side].team);world.add(o);}
    if(a.live){var p=marblePos(a,Math.min(1,a.t/a.T));o.position.set(p[0],p[1]+.03,p[2]);o.rotation.x=a.t*9;}
    else{var u=Math.min(1,(a.t-a.T)/.8),dx=a.x1-a.x0,dz=a.z1-a.z0,l=Math.sqrt(dx*dx+dz*dz)||1;o.position.set(a.hx+dx/l*.3*u,Math.max(.034,a.hy*(1-u*2))+Math.abs(Math.sin(u*PI*2))*.08*(1-u),a.hz+dz/l*.3*u);o.scale.setScalar(u>.7?1-(u-.7)/.3:1);}});
  for(var id in V.marbles)if(!seen[id]){world.remove(V.marbles[id]);delete V.marbles[id];}
  seen={};SG.corks.forEach(function(c){seen[c.id]=1;var o=V.corks[c.id];if(!o){o=V.corks[c.id]=SS.fx.cork();o.scale.setScalar(.6);world.add(o);}var u=Math.min(1,c.t/.25);o.position.set(c.x0+(c.x1-c.x0)*u,.2+Math.sin(u*PI)*.12,c.z0+(c.z1-c.z0)*u);o.rotation.y=Math.atan2(c.x1-c.x0,c.z1-c.z0);});
  for(id in V.corks)if(!seen[id]){world.remove(V.corks[id]);delete V.corks[id];}
  var aim=SG.aim.on&&ph==='fight'?SG.arc(0,SG.aim.tx,SG.aim.tz):null;arcMesh.visible=landRing.visible=!!aim;
  if(aim){SS.fx.setArc(arcMesh,new THREE.Vector3(aim.x0,aim.y0,aim.z0),new THREE.Vector3(aim.x1,0,aim.z1),aim.h,SG.clock*.8);landRing.position.set(aim.x1,.01,aim.z1);landRing.scale.setScalar(SG.sides[0].team==='red'?RULES.redBlast:RULES.blast);
    var lv=V.pieces[SG.sides[0].lobber];if(lv&&lv.obj)lv.obj.rotation.y=Math.atan2(aim.x1-aim.x0,aim.z1-aim.z0);}
  var od=SG.sides[0]&&SG.sides[0].order;orderRing.visible=!!od&&(ph==='fight'||ph==='mend')&&!SG.sides[0].bot;if(od){orderRing.position.set(od.x,(od.x*od.x+od.z*od.z<.36?SS.hillHeight(od.x,od.z):0)+.012,od.z);orderRing.scale.setScalar(1+.08*Math.sin(SG.clock*6));}
  if(SG.sides.length)SS.setHill(hill,ph==='build'||ph==='ready'||ph==='start'?.5:SG.blueShare());
}
function fmt(t){t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+('0'+(t%60)).slice(-2);}
var lastHud='';
function ui(){if(!hasDom||!E('start'))return;var ph=SG.phase,fight=ph==='fight'||ph==='mend';
  E('start').style.display=ph==='start'?'flex':'none';E('end').style.display=ph==='ready'?'flex':'none';E('win').style.display=ph==='over'?'flex':'none';
  E('hud').style.display=ph==='start'?'none':'flex';E('bar').style.display=ph==='build'&&!SG.sides[0].bot?'flex':'none';E('fbar').style.display=fight?'flex':'none';
  E('hCount').style.display=ph==='build'||ph==='ready'?'block':'none';E('mA').style.display=E('mB').style.display=fight||ph==='over'?'block':'none';
  if(ph==='ready')E('endText').textContent=SG.readyText||'';
  if(ph==='over'){var w=SG.sides[SG.winner],me=SG.winner===0;E('winTitle').textContent=NAME[w.team]+' wins!';
    E('winText').textContent=(SG.sides[0].bot?'':(me?'You held the hill. ':'The other camp held the hill. '))+NAME[SG.sides[0].team]+' '+Math.round(SG.sides[0].score)+' · '+NAME[SG.sides[1].team]+' '+Math.round(SG.sides[1].score);}
  ['squad','lobber','mend'].forEach(function(t){var b=E('b_'+t);if(b)b.className='btn'+(SG.tool===t?' on':'');});lastHud='';}
function hud(){if(!hasDom||!SG.sides.length)return;var ph=SG.phase,built=0,n=0;SG.pieces.forEach(function(p){if(p.side===0){n++;if(p.built)built++;}});
  var a=SG.sides[0],b=SG.sides[1],s=[ph,fmt(SG.time),n,built,SG.msg.text,SG.msg.t>0,SG.sel,Math.round(a.score),Math.round(b.score),SG.callout.t>0,SG.callout.text,SG.round,SG.paused,Math.ceil(a.reload),SG.tool].join('|');if(s===lastHud)return;lastHud=s;
  E('hTeam').textContent=ph==='build'?(a.team==='red'?'⚙️ Red':'🪶 Blue')+' camp · Build':(ph==='ready'?'Camp ready':(ph==='mend'?'Mend break':(ph==='over'?'Match over':'Round '+SG.round+' of '+RULES.rounds)));
  E('hTime').textContent='⏱ '+fmt(SG.time);E('hCount').textContent='Placed '+n+' of '+KIT.length+' · built '+built;
  function meter(el,side){el.firstChild.textContent=(side.team==='red'?'⚙️ Red ':'🪶 Blue ')+Math.round(side.score);el.querySelector('i').style.width=Math.min(100,side.score)+'%';el.querySelector('i').style.background=side.team==='red'?'#d9603a':'#2f6fe6';}
  meter(E('mA'),a);meter(E('mB'),b);
  var hint='';if(ph==='build'&&!a.bot)hint=SG.sel>=0?'Tap the table to place the '+SG.kit[SG.sel].kind:(n<KIT.length?'Tap a piece on the mat':'All placed. Tap Done when you like');
  else if(ph==='fight'&&!a.bot)hint=SG.tool==='lobber'?(a.lobber?(a.reload>0?'Winding the lobber…':'Drag back and let go to fire'):'You have no lobber'):(SG.tool==='mend'?'Tap a damaged piece to mend it':(a.order?'':'Tap the hill to send your squad'));
  var text=SG.callout.t>0?SG.callout.text:(SG.msg.t>0?SG.msg.text:hint),sy=E('say');sy.style.display=text&&ph!=='start'&&ph!=='over'?'block':'none';sy.textContent=text;sy.className=SG.msg.t>0&&SG.msg.bad&&SG.callout.t<=0?'bad':'';
  E('bPause').textContent=SG.paused?'▶ Go on':'⏸ Pause';}
function render(){if(!V.on)return;syncAll();SS.wave(hill,SG.clock);hud();R.render(S,C);}
SG.render=render;

function initView(){
  W=innerWidth;H=innerHeight;R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setSize(W,H);R.setPixelRatio(Math.min(2,devicePixelRatio||1));
  R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;R.outputEncoding=THREE.sRGBEncoding;document.body.insertBefore(R.domElement,document.body.firstChild);
  S=new THREE.Scene();S.background=new THREE.Color(0x3b2a1c);S.fog=new THREE.Fog(0x4a3320,9,22);C=new THREE.PerspectiveCamera(40,W/H,.1,60);placeCamera();_v=new THREE.Vector3();
  function M(c,r){return new THREE.MeshStandardMaterial({color:c,roughness:r==null?.85:r});}
  function add(g,m,x,y,z){var o=new THREE.Mesh(g,m);o.position.set(x||0,y||0,z||0);o.castShadow=true;o.receiveShadow=true;S.add(o);return o;}
  function box(w,h,d,m,x,y,z){return add(new THREE.BoxGeometry(w,h,d),m,x,y,z);}
  function cyl(a,b,h,m,x,y,z,n){return add(new THREE.CylinderGeometry(a,b,h,n||14),m,x,y,z);}
  S.add(new THREE.HemisphereLight(0xfff0dc,0x6a4a30,.62));
  var sun=new THREE.DirectionalLight(0xffd9a6,1.3);sun.position.set(-5,4.2,2.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  var sc=sun.shadow.camera;sc.left=-4.2;sc.right=4.2;sc.top=4.2;sc.bottom=-4.2;sc.near=.5;sc.far=20;sun.shadow.bias=-.0005;sun.shadow.normalBias=.012;sun.shadow.radius=4;S.add(sun);
  var rim=new THREE.DirectionalLight(0x9db8ff,.25);rim.position.set(4,3,-3);S.add(rim);
  var seed=7;function rnd(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646;}
  var floor=add(new THREE.PlaneGeometry(40,40),M(0x5b3d28),0,-1.9,0);floor.rotation.x=-PI/2;floor.castShadow=false;
  box(30,9,.3,M(0x6e5038),0,2,-7);var win=add(new THREE.PlaneGeometry(4.6,3),new THREE.MeshBasicMaterial({color:0xffdf9e}),-3.6,2.2,-6.8);win.castShadow=false;
  box(.14,3,.1,M(0xe9dcc2),-3.6,2.2,-6.7);box(4.6,.14,.1,M(0xe9dcc2),-3.6,2.2,-6.7);
  var ch=M(0x7a4a2a);box(.18,2.6,.18,ch,3.9,-.2,-2.6);box(.18,2.6,.18,ch,5.2,-.2,-1.4);for(var i=0;i<3;i++){var sl=box(1.9,.2,.1,ch,4.55,.2+i*.38,-2);sl.rotation.y=-.75;}
  var tc=document.createElement('canvas');tc.width=tc.height=1024;var g=tc.getContext('2d');
  for(i=0;i<16;i++){g.fillStyle=['#b27238','#c08347','#a96a33','#bd7d41'][i%4];g.fillRect(0,i*64,1024,62);g.fillStyle='#8a5428';g.fillRect(0,i*64+62,1024,2);}
  g.globalAlpha=.16;for(i=0;i<900;i++){g.fillStyle=rnd()<.5?'#6b3d18':'#e0a968';g.fillRect(rnd()*1024,rnd()*1024,30+rnd()*130,1.5);}g.globalAlpha=1;
  var tt=new THREE.CanvasTexture(tc);tt.encoding=THREE.sRGBEncoding;tt.anisotropy=4;
  var top=cyl(3.25,3.25,.16,[M(0x8a5428),new THREE.MeshStandardMaterial({map:tt,roughness:.8}),M(0x8a5428)],0,-.08,0,64);top.castShadow=false;
  cyl(3.32,3.2,.1,M(0x7c4a22),0,-.2,0,64);cyl(.3,.38,1.8,M(0x6b3f1e),0,-1.1,0);
  hill=SS.hill({share:.5});S.add(hill);
  /* a cloth mat along each team's edge, and the outline of your side */
  var span=MAT.step*5+.2;V.mats=[];
  for(var s=0;s<2;s++){var th=(s?PI/2:-PI/2)-span,mm=add(new THREE.RingGeometry(MAT.r0,MAT.r1,48,1,th,span*2),M(0x8f7044,1),0,.006,0);mm.rotation.x=-PI/2;mm.castShadow=false;
    var me=add(new THREE.RingGeometry(MAT.r0-.03,MAT.r0,48,1,th,span*2),M(0x2a55a8,1),0,.007,0);me.rotation.x=-PI/2;me.castShadow=false;V.mats.push(me);}
  function flat(geo,col,op){var o=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op,depthWrite:false}));o.rotation.x=-PI/2;o.visible=false;S.add(o);return o;}
  zoneMesh=flat(new THREE.RingGeometry(ZONE.rMin,ZONE.rMax,48,1,-PI/2-ZONE.half,ZONE.half*2),0x9fd0ff,.13);zoneMesh.position.y=.005;
  ring=flat(new THREE.RingGeometry(.92,1,40),0x8fd0ff,.85);ring.position.y=.008;selRing=flat(new THREE.RingGeometry(.2,.24,28),0xffd9a8,.95);
  landRing=flat(new THREE.RingGeometry(.86,1,36),0xfff3d0,.9);orderRing=flat(new THREE.RingGeometry(.16,.2,28),0xfff3d0,.9);
  arcMesh=SS.fx.arc(16);arcMesh.visible=false;S.add(arcMesh);
  world=new THREE.Group();S.add(world);
  GM={ok:new THREE.MeshBasicMaterial({color:0x8fd0ff,transparent:true,opacity:.5,depthWrite:false}),bad:new THREE.MeshBasicMaterial({color:0xff5a44,transparent:true,opacity:.55,depthWrite:false}),site:new THREE.MeshBasicMaterial({color:0xfff3d0,transparent:true,opacity:.28,depthWrite:false})};
  V.on=true;}
/* the whole table and both mats must fit, in landscape and in portrait */
function placeCamera(){var a=W/H,t=Math.tan(20*PI/180),need=3.65,dW=need/(t*a),dH=7.1,d=Math.max(dW,dH),el=a<1?.95:.72;
  C.aspect=a;C.position.set(0,Math.sin(el)*d,.25+Math.cos(el)*d);C.lookAt(0,-.1,.25);C.updateProjectionMatrix();}

/* ================= input: touch and mouse ================= */
var ray,plane,v2,v3,ptr={},nptr=0,multi=false,twist=0,aimDown=null;
function ground(px,py){v2.set(px/W*2-1,-(py/H)*2+1);ray.setFromCamera(v2,C);return ray.ray.intersectPlane(plane,v3)?{x:v3.x,z:v3.z}:null;}
SG.screen=function(x,z,y){var p=new THREE.Vector3(x,y||0,z).project(C);return {x:(p.x*.5+.5)*W,y:(-p.y*.5+.5)*H};};
function slotAt(px,py){var best=-1,bd=38;SG.kit.forEach(function(k,i){if(k.used)return;var s=SG.screen(k.x,k.z,.07),d=Math.sqrt((s.x-px)*(s.x-px)+(s.y-py)*(s.y-py));if(d<bd){bd=d;best=i;}});return best;}
function twoAngle(){var k=Object.keys(ptr);return Math.atan2(ptr[k[1]].y-ptr[k[0]].y,ptr[k[1]].x-ptr[k[0]].x);}
function pullTarget(g){var l=lobberOf(0);if(!l||!aimDown)return null;var dx=aimDown.x-g.x,dz=aimDown.z-g.z,d=Math.sqrt(dx*dx+dz*dz);if(d<.12)return null;var pw=Math.min(6.2,d*2.6);return {x:l.x+dx/d*pw,z:l.z+dz/d*pw};}
SG.setTool=function(t){SG.tool=t;SG.aim.on=false;ui();};
function damagedAt(g){var best=null,bd=.45;SG.damaged(0).forEach(function(p){var d=boxDist(p,g.x,g.z);p.ps.forEach(function(q){if(q.st==='off')d=Math.min(d,dist(q.rx,q.rz,g.x,g.z));});if(d<bd){bd=d;best=p;}});return best;}
function initInput(){
  ray=new THREE.Raycaster();plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);v2=new THREE.Vector2();v3=new THREE.Vector3();var el=R.domElement;
  el.addEventListener('pointerdown',function(e){var ph=SG.phase;if(SG.paused||!SG.sides.length||SG.sides[0].bot)return;ptr[e.pointerId]={x:e.clientX,y:e.clientY};nptr=Object.keys(ptr).length;e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(err){}
    if(ph==='build'){if(nptr===2){multi=true;twist=twoAngle();return;}var ds=slotAt(e.clientX,e.clientY);if(ds>=0)SG.select(ds);else if(SG.sel>=0){var g=ground(e.clientX,e.clientY);if(g)SG.moveGhost(g.x,g.z);}}
    else if(ph==='fight'){var g2=ground(e.clientX,e.clientY),l=lobberOf(0);if(!g2)return;if(l&&(SG.tool==='lobber'||dist(g2.x,g2.z,l.x,l.z)<.45)){aimDown=g2;SG.aim.on=false;}}});
  el.addEventListener('pointermove',function(e){var ph=SG.phase,down=!!ptr[e.pointerId];if(down)ptr[e.pointerId]={x:e.clientX,y:e.clientY};if(SG.paused||!SG.sides.length)return;
    if(ph==='build'){if(nptr===2&&SG.sel>=0){var a=twoAngle(),d=a-twist;while(d>PI)d-=2*PI;while(d<-PI)d+=2*PI;twist=a;SG.turn(-d);return;}
      if(SG.sel>=0&&(down||e.pointerType==='mouse')&&!multi){var g=ground(e.clientX,e.clientY);if(g)SG.moveGhost(g.x,g.z);}}
    else if(ph==='fight'&&aimDown&&down){var g2=ground(e.clientX,e.clientY),t=g2&&pullTarget(g2);if(t){SG.aim.on=true;SG.aim.tx=t.x;SG.aim.tz=t.z;}else SG.aim.on=false;}});
  function up(e){if(!ptr[e.pointerId])return;delete ptr[e.pointerId];nptr=Object.keys(ptr).length;var ph=SG.phase;if(SG.paused||!SG.sides.length||SG.sides[0].bot)return;
    if(ph==='build'){if(multi){if(nptr===0)multi=false;return;}var s=slotAt(e.clientX,e.clientY);if(s>=0){SG.select(s);return;}if(SG.sel>=0){var g=ground(e.clientX,e.clientY);if(g)SG.tryPlace(g.x,g.z);}return;}
    if(ph!=='fight'&&ph!=='mend')return;var g2=ground(e.clientX,e.clientY);
    if(aimDown){var was=SG.aim.on;aimDown=null;SG.aim.on=false;if(was){if(SG.sides[0].reload>0)say('wait','Still winding…',true);else SG.fire(0,SG.aim.tx,SG.aim.tz);return;}if(SG.tool==='lobber')return;}
    if(!g2)return;var dp=damagedAt(g2);
    if(SG.tool==='mend'){if(dp){if(SG.mend(0,dp.id))say('mend','A mouse is going to mend it',false);else say('nomend','No free mouse, or nothing left to mend',true);}else say('nomend','Tap a piece with a part knocked off',true);return;}
    if(dp&&SG.mend(0,dp.id)){say('mend','A mouse is going to mend it',false);return;}
    SG.order(0,g2.x,g2.z);}
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',function(e){delete ptr[e.pointerId];nptr=Object.keys(ptr).length;if(!nptr)multi=false;aimDown=null;SG.aim.on=false;});
  addEventListener('keydown',function(e){var k=e.key.toLowerCase();if(k==='q')SG.turn(PI/12);else if(k==='e')SG.turn(-PI/12);else if(k==='z')SG.undo();else if(k==='escape')SG.select(-1);else if(k==='enter'&&SG.sel>=0)SG.tryPlace(SG.ghost.x,SG.ghost.z);
    else if(k==='1')SG.setTool('squad');else if(k==='2')SG.setTool('lobber');else if(k==='3')SG.setTool('mend');else if(k==='p')SG.paused=!SG.paused;});
  E('bL').onclick=function(){SG.turn(PI/12);};E('bR').onclick=function(){SG.turn(-PI/12);};E('bUndo').onclick=function(){SG.undo();};E('bDone').onclick=function(){SG.done();};
  E('b_squad').onclick=function(){SG.setTool('squad');};E('b_lobber').onclick=function(){SG.setTool('lobber');};E('b_mend').onclick=function(){SG.setTool('mend');};E('bPause').onclick=function(){SG.paused=!SG.paused;lastHud='';};
  var pick='blue',lvl='easy';
  function choose(ids,on){ids.forEach(function(id){E(id).className='btn'+(id===on?' on':'');});}
  E('tBlue').onclick=function(){pick='blue';choose(['tBlue','tRed'],'tBlue');};E('tRed').onclick=function(){pick='red';choose(['tBlue','tRed'],'tRed');};
  ['easy','normal','hard'].forEach(function(l){E('l_'+l).onclick=function(){lvl=l;choose(['l_easy','l_normal','l_hard'],'l_'+l);};});
  E('bPlay').onclick=function(){SG.paused=false;SG.start(pick,{level:lvl});};E('bAgain').onclick=function(){SG.reset();};
  addEventListener('resize',function(){W=innerWidth;H=innerHeight;R.setSize(W,H);placeCamera();});}

/* ================= run ================= */
SG.boot=function(){
  initView();initInput();ui();
  var Q={};location.search.slice(1).split('&').forEach(function(kv){var p=kv.split('=');if(p[0])Q[p[0]]=decodeURIComponent(p[1]||'');});
  if(Q.shot){SG.shot(Q.shot,Q.team||'blue');render();render();window.__done=true;return;}
  var last=performance.now();(function loop(){var now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;if(SG.phase!=='start'&&!SG.paused&&!SG.hold)SG.step(dt);render();window.__done=true;requestAnimationFrame(loop);})();};
function wallOf(s){var best=null,bd=1e9;SG.pieces.forEach(function(p){if(p.side===s&&p.kind==='wall'){var d=dist(p.x,p.z,0,0);if(d<bd){bd=d;best=p;}}});return best;}
function stepUntil(fn,max){for(var t=0;t<(max||30);t+=STEP){SG.step(STEP);if(fn())return true;}return false;}
SG.stepUntil=stepUntil;
/* fixed scenes for screenshots */
SG.shot=function(name,team){
  SG.start(team,{level:'easy',seed:777});
  if(name==='build-2-ghost'){SG.demo(4);SG.step(14);SG.select(7);var q=layoutSpot(0,0,7);SG.turn(q[2]-SG.ghost.rot);SG.moveGhost(q[0],q[1]);return;}
  if(name==='build-2b-refused'){SG.demo(4);SG.step(14);SG.select(7);SG.tryPlace(-.5,1.05,0);return;}
  if(name==='build-3-mice-carrying'){SG.demo(7);SG.step(2.3);SG.select(-1);return;}
  if(name==='build-4-camp-ready'){SG.demo(11);SG.step(45);SG.done();SG.step(.4);return;}
  if(name.indexOf('fight')!==0)return;
  SG.demo(11);SG.skipBuild();SG.step(RULES.ready+.1);SG.sides[1].bot=false;var foe=wallOf(1);
  if(name==='fight-1-aim'){SG.order(0,0,.35);SG.order(1,0,-.35);SG.step(3);SG.setTool('lobber');SG.aim={on:true,tx:foe.x,tz:foe.z};SG.msg.t=0;SG.callout.t=0;}
  else if(name==='fight-2-hit'){SG.order(0,0,.35);SG.order(1,0,-.35);SG.step(2.2);SG.fire(0,foe.x,foe.z);stepUntil(function(){return SG.lastHit;},6);SG.step(.22);}
  else if(name==='fight-3-dizzy'){SG.order(0,.2,.5);SG.order(1,0,-.4);SG.step(3.2);SG.fire(0,0,-.4);stepUntil(function(){return SG.lastHit;},6);SG.step(1.2);}
  else if(name==='fight-4-mend'){var mineW=wallOf(0);['wall.plank.1','wall.plank.2','wall.plank.4','wall.plank.5'].forEach(function(id){SG.debug.knock(mineW.id,id);});SG.step(1);SG.mend(0,mineW.id);stepUntil(function(){return SG.mice.some(function(m){return m.state==='fix';});},12);SG.step(.9);SG.setTool('mend');SG.msg.t=0;SG.callout.t=0;}
  else if(name==='fight-5-win'){SG.order(0,0,.3);SG.step(3);SG.sides[0].score=99.5;SG.sides[1].score=41;SG.step(1.6);}
};
if(hasDom&&typeof THREE!=='undefined')addEventListener('DOMContentLoaded',SG.boot);
})();
