/* Round Table Kingdom on a practice table: build step, then the fight for the middle flag.
   (The folder is still called sofa-siege.) No AR, no sound. Needs three.js r128 and models.js (SS).
   All game state lives in the plain object SG (on window). SG.step(dt) runs the fixed-step update,
   so a test can play a whole match without drawing. The three.js objects are kept apart, in V. */
(function(){
/* Every number that tunes the match is here. The balance sweep changes nothing else. */
var CONFIG={
  build:120,ready:3,count:3,round:60,rounds:3,brk:10,   /* seconds: build step, bot's wait at "Camp ready", 3-2-1, a round, rounds, mend break */
  win:100,gain:.9,holdSecs:1.5,                                      /* points to win; points a second for each mouse more than the other side on the hill */
  walk:1.15,buildTime:3,mendTime:2.2,noShopMend:1.5,    /* mouse speed; hammer seconds per piece and per part; mending is this much slower with a broken workshop */
  reload:6,blast:.27,dizzy:5,                            /* lobber winding seconds; marble thump radius; dizzy seconds (both teams) */
  personal:.17,                                         /* mice keep this far from each other */
  squadRing:.5,                                         /* how far apart a squad stands round the spot it was sent to */
  corkRange:1.2,corkEvery:3,corkChance:.02,corkDaze:1.6,/* blue: cork reach, seconds between corks, chance to daze, daze seconds (a daze is a short sit, no trip home) */
  scrapEvery:5,scrapReach:.38,                          /* red: seconds between knocking parts off, and reach */
  redParts:1,blueParts:1,                               /* parts a marble knocks off a piece */
  botMendAt:1,                                          /* a bot mends during a round once this many of its parts lie fallen */
  wallShots:.3,                                         /* share of bot marbles aimed at pieces, not at mice */
  /* per level: seconds between bot shots, aim error, seconds before it sends its squad, and how many points ahead the red bot must be before it spares a scrapper for the walls */
  levels:{easy:{fire:8.5,err:.8,send:5,raidLead:10},normal:{fire:12,err:.45,send:2.5,raidLead:10},hard:{fire:11,err:.2,send:.6,raidLead:2}}
};
var PI=Math.PI,STEP=1/60,PS=.88,RULES=CONFIG,LEVELS=CONFIG.levels;
var KIT=['wall','wall','wall','wall','wall','wall','gate','tower','lobber','tent','workshop'];
var FOOT0={wall:[.43,.07],gate:[.48,.1],tower:[.3,.3],lobber:[.33,.4],tent:[.36,.36],workshop:[.3,.25]},FOOT={},TALL={wall:.42,gate:.62,tower:1.1,lobber:.5,tent:.42,workshop:.5},k0;
for(k0 in FOOT0){FOOT[k0]=[FOOT0[k0][0]*PS,FOOT0[k0][1]*PS];TALL[k0]*=PS;}
var ZONE={rMin:1.03,rMax:2.72,half:1.22},MAT={r0:2.78,r1:3.2,r:2.99,scale:.32,pick:2.6,step:.185},HILL=1.0;
var REASON={hill:'Not on the hill ring',third:'Only on your own side of the table',overlap:'Too close to another piece'};
var NAME={blue:'Blue',red:'Red'};
/* preset camps for the bot: [distance from the hill, angle, extra turn] for each kit slot, in the side's own frame */
var LAYOUTS=[
  [[1.3,-.7,PI],[1.3,.7,PI],[1.72,-.82,PI],[1.72,-.3,PI],[1.72,.3,PI],[1.72,.82,PI],[1.3,0,PI],[2.28,-.72,PI],[2.2,-.22,PI],[2.22,.26,0],[2.26,.74,0]],
  [[1.25,-.35,PI],[1.25,.35,PI],[1.42,-1.0,PI],[1.42,1.0,PI],[1.8,-.62,PI],[1.8,.62,PI],[1.75,0,PI],[2.25,.78,PI],[2.25,0,PI],[2.25,-.42,0],[2.25,-.86,0]],
  [[1.2,0,PI],[1.32,-.66,PI],[1.32,.66,PI],[1.7,-.95,PI],[1.7,.95,PI],[1.85,.3,PI],[1.85,-.3,PI],[2.3,0,PI],[2.25,.52,PI],[2.3,-.5,0],[2.25,.95,0]]
];
var SG={phase:'start',mode:'solo',time:CONFIG.build,round:0,team:'blue',level:'easy',sides:[],pieces:[],mice:[],marbles:[],corks:[],pops:[],kit:[],callout:{text:'',t:0},cam:0,
  clock:0,acc:0,nextId:1,seed:12345,winner:-1,holder:-1,paused:false,lastHit:null,stats:{},opts:{}};
window.SG=SG;
/* Each side keeps its own selection, ghost, tool, aim and message, so two people can play at once.
   SG.sel, SG.ghost, SG.tool, SG.aim and SG.msg are the front side's, kept for the one-player game and the tests. */
['sel','ghost','tool','aim','msg'].forEach(function(k){Object.defineProperty(SG,k,{enumerable:true,get:function(){return SG.sides[0]?SG.sides[0][k]:(k==='sel'?-1:{on:false,ok:false,code:'',text:'',t:0});},set:function(v){if(SG.sides[0])SG.sides[0][k]=v;}});});
SG.CONFIG=CONFIG;SG.RULES=CONFIG;SG.FOOT=FOOT;SG.ZONE=ZONE;SG.LEVELS=LEVELS;
var V={pieces:{},mice:[],slots:[[],[]],marbles:{},corks:{},puffs:[],flashes:[],rings:[],on:false};
function rand(){SG.seed=(SG.seed*16807)%2147483647;return (SG.seed-1)/2147483646;}
function gauss(){return (rand()+rand()+rand()-1.5)*1.15;}
function dist(ax,az,bx,bz){var dx=ax-bx,dz=az-bz;return Math.sqrt(dx*dx+dz*dz);}
function event(type,side,extra){var st=SG.stats;st.events++;if(SG.phase==='fight'||SG.phase==='mend'||SG.phase==='count'){var gap=SG.clock-st.lastEvent;if(gap>st.longestGap)st.longestGap=gap;}st.lastEvent=SG.clock;st.last={type:type,side:side,t:SG.clock,extra:extra||''};}
function partName(id){var q=id.split('.');return q[1]==='roof'&&q[2]==='cap'?'roof cap':q[1];}
function pop(x,z,text,good,y,side){SG.pops.push({id:SG.nextId++,x:x,z:z,y:y||.3,text:text,good:!!good,t:0,side:side==null?(z<0?1:0):side});}

/* ================= rules: where a piece may go ================= */
function corners(kind,x,z,rot){var f=FOOT[kind],c=Math.cos(rot),s=Math.sin(rot),o=[];
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(q){var lx=q[0]*f[0],lz=q[1]*f[1];o.push([x+lx*c+lz*s,z-lx*s+lz*c]);});return o;}
function toLocal(p,x,z){var c=Math.cos(p.rot),s=Math.sin(p.rot),dx=x-p.x,dz=z-p.z;return [dx*c-dz*s,dx*s+dz*c];}
function boxDist(p,x,z){var f=FOOT[p.kind],l=toLocal(p,x,z),dx=Math.max(0,Math.abs(l[0])-f[0]),dz=Math.max(0,Math.abs(l[1])-f[1]);return Math.sqrt(dx*dx+dz*dz);}
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
  var own=ends({kind:kind,x:x,z:z,rot:rot}),best=.24,out={x:x,z:z,snapped:false};
  SG.pieces.forEach(function(p){if(p.side!==side||(p.kind!=='wall'&&p.kind!=='gate'))return;ends(p).forEach(function(e){own.forEach(function(m){var d=dist(e[0],e[1],m[0],m[1]);
    if(d<best){best=d;out={x:x+e[0]-m[0],z:z+e[1]-m[1],snapped:true};}});});});
  return out;}
SG.snap=function(kind,x,z,rot){return snap(0,kind,x,z,rot);};
function w2(side,x,z){return side?[-x,-z]:[x,z];}

/* ================= start ================= */
function newStats(){return {events:0,lastEvent:0,longestGap:0,last:null,partsOff:0,partsMended:0,dizzies:0,dazes:0,hillFlips:0,shots:0,corks:0,stuck:0,noPath:0,ownHits:0,fightTime:0,bySide:[{shots:0,dizzied:0,partsLost:0,hillSecs:0,blocked:0},{shots:0,dizzied:0,partsLost:0,hillSecs:0,blocked:0}]};}
SG.start=function(team,opts){
  viewClear();opts=opts||{};SG.opts=opts;SG.mode=opts.mode==='table'?'table':'solo';SG.team=SG.mode==='table'?'blue':(team==='red'?'red':'blue');SG.level=LEVELS[opts.level]?opts.level:(SG.level||'easy');
  SG.phase='build';SG.time=CONFIG.build;SG.round=0;SG.pieces=[];SG.mice=[];SG.marbles=[];SG.corks=[];SG.pops=[];SG.clock=0;SG.acc=0;SG.nextId=1;SG.seed=((opts.seed||12345)*48271+11)%2147483647||7;for(var w0=0;w0<6;w0++)rand();   /* stir the seed, so near seeds do not give near first numbers */
  SG.callout={text:'',t:0};SG.winner=-1;SG.holder=-1;SG.lastHolder=null;SG.cand=-1;SG.candT=0;SG.lastKnock=null;SG.lastHit=null;SG.stats=newStats();SG.sec=0;
  SG.sides=[];gridDirty=true;
  for(var s=0;s<2;s++){var human=SG.mode==='table'||s===0,side={team:s===0?SG.team:(SG.team==='blue'?'red':'blue'),human:human,bot:!human,ready:false,sel:-1,ghost:{x:0,z:s?-1.9:1.9,rot:s?PI:0,ok:false,code:''},tool:'squad',aim:{on:false,tx:0,tz:0},msg:{code:'',text:'',t:0},level:SG.level,kit:[],score:0,reload:0,fired:-9,order:null,lobber:0,workshop:0,crew:-1,raid:null,
      bt:2+s,layout:Math.floor(rand()*LAYOUTS.length),sendT:0,fireT:0,placed:0};SG.sides.push(side);
    KIT.forEach(function(kind,i){var a=(i-(KIT.length-1)/2)*MAT.step,w=w2(s,Math.sin(a)*MAT.r,Math.cos(a)*MAT.r);side.kit.push({kind:kind,a:a,x:w[0],z:w[1],used:false,picked:false});});
    for(var i=0;i<5;i++){var h=w2(s,(i-2)*.42,2.3-Math.abs(i-2)*.1);SG.mice.push({side:s,i:i,state:'idle',x:h[0],z:h[1],rot:s?0:PI,tx:h[0],tz:h[1],hx:h[0],hz:h[1],job:0,part:-1,t:0,wait:.5+i*.4,speed:0,
      slack:.3,q:0,asked:-9,path:null,pi:0,pver:-1,ptx:0,ptz:0,cd:1+i*.5,act:0,moved:0,goal:false,daze:false});}}
  SG.kit=SG.sides[0].kit;viewStart();ui();};
SG.auto=function(side,level){var s=SG.sides[side];if(!s)return;s.bot=true;s.human=false;if(LEVELS[level])s.level=level;s.sel=-1;};
SG.reset=function(){viewClear();SG.phase='start';SG.pieces=[];SG.mice=[];SG.marbles=[];SG.corks=[];SG.pops=[];SG.sides=[];SG.kit=[];ui();};
function say(code,text,bad,s){var side=SG.sides[s||0];if(side)side.msg={code:code,text:text,t:bad?2.2:2.6,bad:!!bad};}
function shout(text){SG.callout={text:text,t:2.6};}
function mine(s){return SG.pieces.filter(function(p){return p.side===s;});}

/* ================= build step ================= */
function place(s,slotI,x,z,rot){
  var side=SG.sides[s],slot=side.kit[slotI];if(!slot||slot.used)return {ok:false,code:'none',text:''};
  var sn=snap(s,slot.kind,x,z,rot),c=check(s,slot.kind,sn.x,sn.z,rot);if(!c.ok)return c;
  var p={id:SG.nextId++,side:s,kind:slot.kind,x:sn.x,z:sn.z,rot:rot,built:false,parts:0,progress:0,slot:slotI,mouse:-1,picked:false,ps:[],total:0,open:[]};
  SG.pieces.push(p);slot.used=true;side.placed++;viewSite(p);return {ok:true,code:'',text:'',piece:p};}
SG.select=function(i,s){s=s||0;var side=SG.sides[s];if(SG.phase!=='build'||!side||!side.human||side.ready)return false;if(i<0||!side.kit[i]||side.kit[i].used){side.sel=-1;return false;}side.sel=i;refreshGhost(s);return true;};
function refreshGhost(s){var side=SG.sides[s||0],g=side.ghost;if(side.sel<0){g.ok=false;return;}var kind=side.kit[side.sel].kind,sn=snap(s||0,kind,g.x,g.z,g.rot),c=check(s||0,kind,sn.x,sn.z,g.rot);g.sx=sn.x;g.sz=sn.z;g.ok=c.ok;g.code=c.code;g.text=c.text;}
SG.moveGhost=function(x,z,s){var g=SG.sides[s||0].ghost;g.x=x;g.z=z;refreshGhost(s||0);};
SG.turn=function(d,s){SG.sides[s||0].ghost.rot+=d;refreshGhost(s||0);};
SG.tryPlace=function(x,z,rot,s){
  s=s||0;var side=SG.sides[s];if(SG.phase!=='build'||!side||side.sel<0)return {ok:false,code:'none',text:'Tap a piece on the mat first'};
  if(rot!=null)side.ghost.rot=rot;SG.moveGhost(x,z,s);var g=side.ghost,kind=side.kit[side.sel].kind;
  if(!g.ok){say(g.code,g.text,true,s);return {ok:false,code:g.code,text:g.text};}
  var r=place(s,side.sel,g.x,g.z,g.rot),p=r.piece;if(!r.ok)return r;
  side.sel=-1;say('placed','The mice are on it',false,s);
  var next=-1;side.kit.forEach(function(k,i){if(next<0&&!k.used&&k.kind===kind)next=i;});
  if(next>=0){ /* offer the next one beside the piece just placed, at its free end */
    side.sel=next;var hx=FOOT[kind][0]*2,c=Math.cos(p.rot),sn=Math.sin(p.rot),opt=[[p.x+hx*c,p.z-hx*sn],[p.x-hx*c,p.z+hx*sn]],pickI=-1,mid=w2(s,0,2);
    for(var i=0;i<2;i++)if(pickI<0&&check(s,kind,opt[i][0],opt[i][1],p.rot).ok)pickI=i;
    if(pickI<0)pickI=dist(opt[0][0],opt[0][1],mid[0],mid[1])<dist(opt[1][0],opt[1][1],mid[0],mid[1])?0:1;
    g.x=opt[pickI][0];g.z=opt[pickI][1];refreshGhost(s);}
  ui();return {ok:true,code:'',text:''};};
SG.undo=function(s){
  s=s||0;var side=SG.sides[s];if(SG.phase!=='build'||!side||side.ready)return false;var ps=mine(s);if(!ps.length)return false;var p=ps[ps.length-1];SG.pieces.splice(SG.pieces.indexOf(p),1);viewDrop(p);
  SG.mice.forEach(function(m){if(m.job===p.id){m.job=0;m.state='idle';m.wait=.3;}});
  gridDirty=true;var k=side.kit[p.slot];k.used=false;k.picked=false;side.placed--;say('undo','Took the last piece back',false,s);refreshGhost(s);ui();return true;};
/* one player: Done ends the build step. Two players: each says ready, and the build ends when both have. */
SG.done=function(s){if(SG.phase!=='build')return;if(SG.mode!=='table'){finishBuild();return;}var side=SG.sides[s||0];side.ready=!side.ready;side.sel=-1;say('ready',side.ready?'Ready! Waiting for the other camp':'Not ready yet',false,s||0);ui();if(SG.sides[0].ready&&SG.sides[1].ready)finishBuild();};
/* a tidy camp from a preset; used by the bot, by demos and by tests */
function layoutSpot(s,L,i){var q=LAYOUTS[L][i],w=w2(s,Math.sin(q[1])*q[0],Math.cos(q[1])*q[0]);return [w[0],w[1],q[1]+q[2]+(s?PI:0)];}
function botPlace(s,i){var side=SG.sides[s],q=layoutSpot(s,side.layout,i),r=place(s,i,q[0],q[1],q[2]);
  for(var t=0;t<60&&!r.ok;t++){var a=(rand()-.5)*2*(ZONE.half-.25),d=1.3+rand()*1.2,w=w2(s,Math.sin(a)*d,Math.cos(a)*d);r=place(s,i,w[0],w[1],a+PI+(s?PI:0));}
  return r;}
SG.demo=function(n,sideI){var s=sideI||0,out=[];SG.sides[s].layout=0;for(var i=0;i<Math.min(n==null?KIT.length:n,KIT.length);i++)if(!SG.sides[s].kit[i].used)out.push(botPlace(s,i));SG.sides[s].sel=-1;return out;};
function nextSlot(s){var k=SG.sides[s].kit;for(var i=0;i<k.length;i++)if(!k[i].used)return i;return -1;}
function finishBuild(){
  for(var s=0;s<2;s++)if(SG.sides[s].bot){var i;while((i=nextSlot(s))>=0){if(!botPlace(s,i).ok)SG.sides[s].kit[i].used=true;}}
  SG.pieces.forEach(function(p){if(!p.built){startObj(p);completePiece(p,false);}});
  fixGrid();SG.mice.forEach(function(m){m.state='cheer';m.job=0;m.goal=false;m.rot=m.side?PI:0;});
  SG.sides[0].sel=SG.sides[1].sel=-1;SG.phase='ready';SG.time=CONFIG.ready;SG.readyText=mine(0).length+' of '+KIT.length+' pieces placed.';ui();if(SG.mode==='table')startRound(1);}
SG.skipBuild=function(){if(SG.phase!=='build')return;for(var s=0;s<2;s++){var i;while((i=nextSlot(s))>=0){if(!botPlace(s,i).ok)SG.sides[s].kit[i].used=true;}}finishBuild();};
SG.begin=function(){if(SG.phase==='ready')startRound(1);};
function startObj(p){if(p.ps.length||p.started)return;p.started=true;var ids=viewObj(p);
  ids.forEach(function(q){p.ps.push({id:q.id,st:'on',used:false,mender:-1,wx:q.x,wy:q.y,wz:q.z,rx:0,rz:0,t0:-9,rank:q.rank});});p.total=p.ps.length;gridDirty=true;}
function raise(p){var n=p.ps.length;if(n){p.parts=Math.min(n,Math.floor(p.progress*n+.001));}else p.parts=p.progress>=1?1:0;}
function completePiece(p,puff){p.progress=1;raise(p);p.built=true;p.parts=p.total||1;SG.sides[p.side].kit[p.slot].picked=true;if(p.kind==='lobber')SG.sides[p.side].lobber=p.id;if(p.kind==='workshop')SG.sides[p.side].workshop=p.id;gridDirty=true;if(puff)viewPuff(p.x,p.z,2);}

/* ================= the walking grid =================
   The table is cut into small squares. A square is shut if a standing piece covers it. Each team has its own grid,
   because a gate is open to its own team. Mice walk only along open squares, so they never pass through an intact wall. */
var GN=68,GC=.1,G0=-3.4,GROW=.1,GRID=[new Uint8Array(GN*GN),new Uint8Array(GN*GN)],GVER=0,gridDirty=true,_par=new Int32Array(GN*GN),_seen=new Int32Array(GN*GN),_q=new Int32Array(GN*GN),_mark=0;
function ci(x){var i=Math.floor((x-G0)/GC);return i<0?0:(i>=GN?GN-1:i);}
function cc(i){return G0+(i+.5)*GC;}
function blocks(p){if(!p.started)return false;if(p.kind==='wall'||p.kind==='gate'){var on=0,all=0;p.ps.forEach(function(q){if(/plank|door/.test(q.id)){all++;if(q.st==='on')on++;}});if(p.built&&all&&on<all/2)return false;}
  else if(p.built&&p.total&&p.parts<=0)return false;return true;}
/* gaps in a wall: two or more planks off in a row leave a way through, for both teams */
function openings(p){var o=[];if(p.kind!=='wall'||!p.built)return o;var pl=[];p.ps.forEach(function(q){if(/plank/.test(q.id))pl.push([toLocal(p,q.wx,q.wz)[0],q.st==='on']);});pl.sort(function(a,b){return a[0]-b[0];});
  var i=0;while(i<pl.length){if(pl[i][1]){i++;continue;}var j=i;while(j+1<pl.length&&!pl[j+1][1])j++;if(j>i)o.push([pl[i][0]-.05,pl[j][0]+.05]);i=j+1;}return o;}
function solidAt(p,side,x,z,grow){var f=FOOT[p.kind],l=toLocal(p,x,z),ax=Math.abs(l[0]);if(ax>f[0]+grow||Math.abs(l[1])>f[1]+grow)return false;
  if(p.kind==='gate'&&p.side===side&&p.built)return ax>f[0]-.13-grow;                       /* your own gate: only the posts are in the way */
  for(var i=0;i<p.open.length;i++)if(l[0]>p.open[i][0]+grow*.5&&l[0]<p.open[i][1]-grow*.5)return false;
  return true;}
function fixGrid(){
  if(!gridDirty)return;gridDirty=false;GVER++;var s,i,j;
  SG.pieces.forEach(function(p){p.open=openings(p);});
  for(s=0;s<2;s++){var g=GRID[s];g.fill(0);for(j=0;j<GN;j++)for(i=0;i<GN;i++){var x=cc(i),z=cc(j);if(x*x+z*z>3.16*3.16)g[j*GN+i]=1;}
    SG.pieces.forEach(function(p){if(!blocks(p))return;var f=FOOT[p.kind],R=Math.sqrt(f[0]*f[0]+f[1]*f[1])+GROW+GC,i0=ci(p.x-R),i1=ci(p.x+R),j0=ci(p.z-R),j1=ci(p.z+R);
      for(var jj=j0;jj<=j1;jj++)for(var ii=i0;ii<=i1;ii++)if(solidAt(p,s,cc(ii),cc(jj),GROW))g[jj*GN+ii]=1;});}
  /* a mouse caught under a new piece hops to the nearest open square */
  SG.mice.forEach(function(m){if(GRID[m.side][ci(m.z)*GN+ci(m.x)]){var w=nearFree(m.side,m.x,m.z);m.x=w[0];m.z=w[1];m.path=null;}});}
function isOpen(s,x,z){return !GRID[s][ci(z)*GN+ci(x)];}
function nearFree(s,x,z){var g=GRID[s],bi=ci(x),bj=ci(z),best=null,bd=1e9;for(var r=1;r<14&&!best;r++)for(var j=bj-r;j<=bj+r;j++)for(var i=bi-r;i<=bi+r;i++){if(i<0||j<0||i>=GN||j>=GN||g[j*GN+i])continue;var d=dist(cc(i),cc(j),x,z);if(d<bd){bd=d;best=[cc(i),cc(j)];}}return best||[x,z];}
function clearLine(s,x0,z0,x1,z1){var d=dist(x0,z0,x1,z1),n=Math.ceil(d/.04),g=GRID[s];for(var i=0;i<=n;i++){var k=n?i/n:0;if(g[ci(z0+(z1-z0)*k)*GN+ci(x0+(x1-x0)*k)])return false;}return true;}
/* flood out from the mouse over open squares; head for the reachable square nearest the target */
function plan(m){
  var g=GRID[m.side],si=ci(m.x),sj=ci(m.z),start=sj*GN+si,ti=ci(m.tx),tj=ci(m.tz),goal=tj*GN+ti,head=0,tail=0,best=start,bd=dist(m.x,m.z,m.tx,m.tz),c,i,j,k;
  m.pver=GVER;m.ptx=m.tx;m.ptz=m.tz;m.pi=0;m.path=[];
  if(bd<.05)return;
  _mark++;_q[tail++]=start;_seen[start]=_mark;_par[start]=-1;
  var DI=[1,-1,0,0,1,1,-1,-1],DJ=[0,0,1,-1,1,-1,1,-1];
  while(head<tail){c=_q[head++];if(c===goal){best=c;bd=0;break;}i=c%GN;j=(c-i)/GN;var d=dist(cc(i),cc(j),m.tx,m.tz);if(d<bd-1e-6){bd=d;best=c;}
    for(k=0;k<8;k++){var ni=i+DI[k],nj=j+DJ[k];if(ni<0||nj<0||ni>=GN||nj>=GN)continue;var nc=nj*GN+ni;if(_seen[nc]===_mark||g[nc])continue;if(k>3&&(g[j*GN+ni]||g[nj*GN+i]))continue;_seen[nc]=_mark;_par[nc]=c;_q[tail++]=nc;}}
  var pts=[];c=best;while(c!==start&&c>=0){i=c%GN;pts.push([cc(i),cc((c-i)/GN)]);c=_par[c];}pts.reverse();
  if(best===goal&&!g[goal]){if(pts.length)pts[pts.length-1]=[m.tx,m.tz];else pts.push([m.tx,m.tz]);}
  /* pull the path tight: skip to the farthest point with a clear line */
  var out=[],px=m.x,pz=m.z,a=0;while(a<pts.length){var b=pts.length-1;while(b>a&&!clearLine(m.side,px,pz,pts[b][0],pts[b][1]))b--;out.push(pts[b]);px=pts[b][0];pz=pts[b][1];a=b+1;}
  m.path=out;
  if(bd>m.slack&&SG.clock-m.asked>6){m.q=1.2;m.asked=SG.clock;SG.stats.noPath++;pop(m.x,m.z,'?',false,.42);}}
function walk(m,dt,speed){
  if(!m.path||m.pver!==GVER||m.ptx!==m.tx||m.ptz!==m.tz)plan(m);
  if(m.q>0){m.q-=dt;m.speed=0;return false;}
  var left=speed*dt;
  while(left>1e-6&&m.pi<m.path.length){var w=m.path[m.pi],dx=w[0]-m.x,dz=w[1]-m.z,d=Math.sqrt(dx*dx+dz*dz);
    if(d<=left){m.x=w[0];m.z=w[1];left-=d;m.pi++;}else{var nx=m.x+dx/d*left,nz=m.z+dz/d*left;if(!isOpen(m.side,nx,nz)){m.path=null;break;}m.x=nx;m.z=nz;left=0;}   /* pushed off its line: plan again */
    if(d>1e-4){var want=Math.atan2(dx,dz),da=want-m.rot;while(da>PI)da-=2*PI;while(da<-PI)da+=2*PI;m.rot+=da*Math.min(1,dt*12);}}
  if(!m.path){m.speed=0;return false;}if(m.pi>=m.path.length){m.speed=0;return true;}m.speed=speed;return false;}
/* mice do not stand on top of each other: any two that are too close step apart, if the square they step to is open */
function separate(){var M=SG.mice,i,j,still={dizzy:1,cheer:1,hammer:1,fix:1};
  for(i=0;i<M.length;i++){var a=M[i];if(a.state==='dizzy'||a.state==='cheer')continue;for(j=i+1;j<M.length;j++){var b=M[j];if(b.state==='dizzy'||b.state==='cheer')continue;
    var dx=b.x-a.x,dz=b.z-a.z,d=Math.sqrt(dx*dx+dz*dz);if(d>=CONFIG.personal)continue;if(d<1e-4){dx=Math.cos(i*2.4+j);dz=Math.sin(i*2.4+j);d=1;}
    var push=(CONFIG.personal-d)*.3,ux=dx/d*push,uz=dz/d*push;if(!still[a.state]&&isOpen(a.side,a.x-ux,a.z-uz)){a.x-=ux;a.z-=uz;}if(!still[b.state]&&isOpen(b.side,b.x+ux,b.z+uz)){b.x+=ux;b.z+=uz;}}}}
function goTo(m,x,z,slack){m.tx=x;m.tz=z;m.slack=slack==null?.3:slack;}
function workSpot(p,m){var f=FOOT[p.kind],nx=Math.sin(p.rot),nz=Math.cos(p.rot),d=f[1]+.22,a=[p.x+nx*d,p.z+nz*d],b=[p.x-nx*d,p.z-nz*d];
  function cost(q){var c=dist(q[0],q[1],m.x,m.z);if(Math.sqrt(q[0]*q[0]+q[1]*q[1])<.5)c+=5;if(!isOpen(m.side,q[0],q[1]))c+=3;if(SG.sides[m.side].human&&(m.side?q[1]<p.z:q[1]>p.z))c-=.6;return c;}   /* a player's mice work on the side the player can see */
  return cost(a)<=cost(b)?a:b;}
function pieceById(id){for(var i=0;i<SG.pieces.length;i++)if(SG.pieces[i].id===id)return SG.pieces[i];return null;}
function freeSpot(s,i){var w=w2(s,(i-2)*.34,2.42);return isOpen(s,w[0],w[1])?w:nearFree(s,w[0],w[1]);}

function tickBuild(dt){
  SG.time-=dt;if(SG.time<=0){SG.time=0;finishBuild();return;}
  for(var s=0;s<2;s++){var side=SG.sides[s];if(!side.bot)continue;side.bt-=dt;if(side.bt<=0){var i=nextSlot(s);if(i>=0){if(!botPlace(s,i).ok)side.kit[i].used=true;}side.bt=3.6+rand()*2.2;}}
  /* hand each waiting order to the nearest free mouse of its side */
  SG.pieces.forEach(function(p){if(p.built||p.mouse>=0)return;var best=null,bd=1e9,slot=SG.sides[p.side].kit[p.slot];
    SG.mice.forEach(function(m){if(m.side!==p.side||(m.state!=='idle'&&m.state!=='wander'))return;var d=dist(m.x,m.z,slot.x,slot.z);if(d<bd){bd=d;best=m;}});
    if(best){var w=w2(p.side,Math.sin(slot.a)*MAT.pick,Math.cos(slot.a)*MAT.pick);p.mouse=best.i;best.job=p.id;best.state='toMat';goTo(best,w[0],w[1],.6);}});
  SG.mice.forEach(function(m){
    var p=m.job?pieceById(m.job):null;if(m.job&&!p){m.job=0;m.state='idle';m.wait=.3;}m.goal=m.state==='toMat'||m.state==='carry';
    if(m.state==='toMat'){if(walk(m,dt,CONFIG.walk)){p.picked=true;SG.sides[m.side].kit[p.slot].picked=true;var w=workSpot(p,m);goTo(m,w[0],w[1],.7);m.state='carry';}}
    else if(m.state==='carry'){if(walk(m,dt,CONFIG.walk*.85)){m.state='hammer';m.t=0;m.speed=0;m.rot=Math.atan2(p.x-m.x,p.z-m.z);startObj(p);fixGrid();}}
    else if(m.state==='hammer'){m.t+=dt;p.progress=Math.min(1,m.t/CONFIG.buildTime);raise(p);if(p.progress>=1){completePiece(p,true);p.mouse=-1;m.job=0;m.state='idle';m.wait=.6+rand();}}
    else if(m.state==='wander'){if(walk(m,dt,.5)){m.state='idle';m.wait=1.5+rand()*2.5;}}
    else if(m.state==='idle'){m.speed=0;m.wait-=dt;if(m.wait<=0){for(var k=0;k<8;k++){var a=(rand()-.5)*1.9,r=1.25+rand()*1.25,w2p=w2(m.side,Math.sin(a)*r,Math.cos(a)*r);
        if(isOpen(m.side,w2p[0],w2p[1])){goTo(m,w2p[0],w2p[1],.5);m.state='wander';break;}}
        if(m.state==='idle')m.wait=1;}}
  });separate();}

/* ================= the fight ================= */
function startRound(n){snd('beep');SG.phase='count';SG.round=n;SG.time=CONFIG.count;SG.sec=0;fixGrid();if(n===1){SG.stats.lastEvent=SG.clock;SG.stats.longestGap=0;}
  SG.mice.forEach(function(m){if(m.state==='cheer'||m.state==='wander'){m.state='idle';}if(n===1){var w=freeSpot(m.side,m.i);m.hx=w[0];m.hz=w[1];}});
  SG.sides.forEach(function(s){s.sendT=LEVELS[s.level].send;s.fireT=LEVELS[s.level].fire*(.4+rand()*.5);if(n===1)s.reload=CONFIG.reload*.5;});ui();}
function endMatch(w){SG.phase='over';SG.winner=w;SG.sides[0].aim.on=SG.sides[1].aim.on=false;snd('win');SG.mice.forEach(function(m){if(m.state==='dizzy'){m.state='idle';}if(m.side===w){m.state='cheer';m.rot=0;}else if(m.state!=='cheer'){m.state='idle';m.speed=0;}m.goal=false;});
  event('win',w);ui();}
function standing(m){return m.state!=='dizzy'&&m.x*m.x+m.z*m.z<HILL*HILL;}
SG.onHill=function(){var n=[0,0];SG.mice.forEach(function(m){if(standing(m))n[m.side]++;});return n;};
function scoreTick(dt){
  var n=SG.onHill(),h=n[0]>n[1]?0:(n[1]>n[0]?1:-1);
  /* the hill changes hands only when the new side has had more mice on it for a moment */
  if(h>=0&&h!==SG.lastHolder){if(SG.cand!==h){SG.cand=h;SG.candT=0;}SG.candT+=dt;if(SG.candT>=CONFIG.holdSecs){if(SG.lastHolder!=null)SG.stats.hillFlips++;snd('hill');event('hill',h);shout(NAME[SG.sides[h].team]+' holds the hill!');SG.lastHolder=h;}}else if(h===SG.lastHolder){SG.cand=-1;}
  SG.holder=h;SG.sec+=dt;SG.stats.bySide[0].hillSecs+=n[0]*dt;SG.stats.bySide[1].hillSecs+=n[1]*dt;
  while(SG.sec>=1){SG.sec-=1;if(h>=0){SG.sides[h].score=Math.min(CONFIG.win,SG.sides[h].score+CONFIG.gain*Math.abs(n[0]-n[1]));}}
  for(var s=0;s<2;s++)if(SG.sides[s].score>=CONFIG.win){endMatch(s);return true;}return false;}
SG.blueShare=function(){var b=SG.sides[0].team==='blue'?0:1,d=SG.sides[b].score-SG.sides[1-b].score;return Math.max(0,Math.min(1,.5+d/70+(SG.holder<0?0:(SG.holder===b?.12:-.12))));};

/* --- the lobber --- */
function lobberOf(s){var id=SG.sides[s].lobber;return id?pieceById(id):null;}
function partOn(p,id){for(var i=0;i<p.ps.length;i++)if(p.ps[i].id===id)return p.ps[i].st==='on';return true;}
function crewSpot(p){var c=Math.cos(p.rot),s=Math.sin(p.rot),lx=.42*PS,lz=-.22*PS;return [p.x+lx*c+lz*s,p.z-lx*s+lz*c];}
function crewReady(s){var l=lobberOf(s),side=SG.sides[s];if(!l||side.crew<0)return false;var m=SG.mice[s*5+side.crew],w=crewSpot(l);return m.state!=='dizzy'&&m.crewing&&dist(m.x,m.z,w[0],w[1])<.42;}
/* why the lobber cannot fire now, or '' if it can */
SG.lobberBlock=function(s){var l=lobberOf(s),side=SG.sides[s];if(!l)return 'none';if(!partOn(l,'lobber.crank')||!partOn(l,'lobber.bucket'))return 'broken';if(!crewReady(s))return 'crew';if(side.reload>0)return 'winding';return '';};
/* which piece a point in the air would hit (any side's, but not the lobber that fired) */
function pieceAt(x,y,z,skip){for(var j=0;j<SG.pieces.length;j++){var p=SG.pieces[j];if(p.id===skip||!p.built||y>TALL[p.kind])continue;if(p.total&&p.parts<=0)continue;
    var f=FOOT[p.kind],l=toLocal(p,x,z);if(Math.abs(l[0])<f[0]+.03&&Math.abs(l[1])<f[1]+.05)return p;}return null;}
function marblePos(a,k){return [a.x0+(a.x1-a.x0)*k,a.y0*(1-k)+4*a.h*k*(1-k),a.z0+(a.z1-a.z0)*k];}
/* the arc to a spot; .hit says which piece is first in the way, if any */
SG.arc=function(s,tx,tz){var l=lobberOf(s);if(!l)return null;var dx=tx-l.x,dz=tz-l.z,d=Math.sqrt(dx*dx+dz*dz),mx=6.2,mn=.7;
  if(d>mx){tx=l.x+dx/d*mx;tz=l.z+dz/d*mx;d=mx;}else if(d<mn&&d>0){tx=l.x+dx/d*mn;tz=l.z+dz/d*mn;d=mn;}
  var rr=Math.sqrt(tx*tx+tz*tz);if(rr>3.2){tx*=3.2/rr;tz*=3.2/rr;}
  var a={x0:l.x,y0:.42,z0:l.z,x1:tx,z1:tz,h:.3+d*.2,T:.65+d*.17,from:l.id,hit:null};
  for(var k=.12;k<=1.0001;k+=.02){var pos=marblePos(a,Math.min(1,k)),p=pieceAt(pos[0],pos[1],pos[2],l.id);if(p){a.hit={piece:p.id,side:p.side,own:p.side===s,k:k,x:pos[0],y:pos[1],z:pos[2]};break;}}
  return a;};
SG.fire=function(s,tx,tz){var side=SG.sides[s];if(SG.phase!=='fight'||SG.lobberBlock(s))return null;var a=SG.arc(s,tx,tz);if(!a)return null;
  snd('twang');a.id=SG.nextId++;a.side=s;a.t=0;a.live=true;SG.marbles.push(a);side.reload=CONFIG.reload;side.fired=SG.clock;SG.stats.shots++;SG.stats.bySide[s].shots++;event('shot',s);
  var l=lobberOf(s);l.aim=Math.atan2(a.x1-l.x,a.z1-l.z);return a;};
function knock(p,i,dx,dz,by){var q=p.ps[i];if(!q||q.st!=='on')return false;var l=Math.sqrt(dx*dx+dz*dz)||1,f=.28+rand()*.3,lat=(rand()-.5)*.3;
  q.st='off';q.t0=SG.clock;q.rx=q.wx+dx/l*f-dz/l*lat;q.rz=q.wz+dz/l*f+dx/l*lat;var rr=Math.sqrt(q.rx*q.rx+q.rz*q.rz);if(rr>3.05){q.rx*=3.05/rr;q.rz*=3.05/rr;}
  snd('knock');q.mender=-1;p.parts--;SG.stats.partsOff++;SG.stats.bySide[p.side].partsLost++;gridDirty=true;event('part',p.side,q.id);pop(q.wx,q.wz,partName(q.id)+' off!',false,q.wy+.15);viewFlash(q.wx,q.wy,q.wz);SG.lastKnock={piece:p.id,part:q.id,by:by||'',t:SG.clock};return true;}
function nearestPart(p,x,y,z,flat){var best=-1,bd=1e9;p.ps.forEach(function(q,i){if(q.st!=='on')return;var d=(q.wx-x)*(q.wx-x)+(q.wz-z)*(q.wz-z)+(flat?0:(q.wy-y)*(q.wy-y));if(d<bd){bd=d;best=i;}});return best;}
function hitPiece(p,x,y,z,dx,dz){var i=nearestPart(p,x,y,z,false);if(i<0)return '';var id=p.ps[i].id;knock(p,i,dx,dz,'marble');return id;}
function dizzy(m){if(m.state==='dizzy'||SG.phase==='over')return false;dropJob(m);m.state='dizzy';m.t=CONFIG.dizzy;m.speed=0;m.goal=false;m.daze=false;m.crewing=false;m.path=null;snd('twinkle');SG.stats.dizzies++;SG.stats.bySide[m.side].dizzied++;event('dizzy',m.side);return true;}
function dropJob(m){if(m.part>=0){var p=pieceById(m.job),q=p&&p.ps[m.part];if(q){if(q.st==='carried'){q.st='off';q.rx=m.x;q.rz=m.z;q.t0=SG.clock-2;}q.mender=-1;}}m.job=0;m.part=-1;}
function tickMarbles(dt){
  for(var i=SG.marbles.length-1;i>=0;i--){var a=SG.marbles[i];a.t+=dt;
    if(!a.live){if(a.t>a.T+.8)SG.marbles.splice(i,1);continue;}
    var k=Math.min(1,a.t/a.T),pos=marblePos(a,k),hit=k>.12?pieceAt(pos[0],pos[1],pos[2],a.from):null,part='',n=0,red=SG.sides[a.side].team==='red';
    if(hit){part=hitPiece(hit,pos[0],pos[1],pos[2],a.x1-a.x0,a.z1-a.z0);for(var e=1;e<(red?CONFIG.redParts:CONFIG.blueParts);e++)hitPiece(hit,pos[0],pos[1],pos[2],a.x1-a.x0,a.z1-a.z0);if(hit.side===a.side)SG.stats.ownHits++;}
    if(hit||k>=1){SG.mice.forEach(function(m){if(m.side!==a.side&&dist(m.x,m.z,pos[0],pos[2])<CONFIG.blast&&dizzy(m))n++;});
      snd('thud');a.live=false;a.T=a.t;a.hx=pos[0];a.hy=pos[1];a.hz=pos[2];SG.lastHit={id:a.id,side:a.side,x:pos[0],y:pos[1],z:pos[2],piece:hit?hit.id:0,own:!!hit&&hit.side===a.side,part:part,dizzied:n,t:SG.clock};viewPuff(pos[0],pos[2],1.2);}}
  for(i=SG.corks.length-1;i>=0;i--){SG.corks[i].t+=dt;if(SG.corks[i].t>.3)SG.corks.splice(i,1);}}
/* a cork needs a clear line: any standing piece in between stops it */
function segHitsBox(p,x0,z0,x1,z1){var f=FOOT[p.kind],a=toLocal(p,x0,z0),b=toLocal(p,x1,z1),t0=0,t1=1,d=[b[0]-a[0],b[1]-a[1]];
  for(var i=0;i<2;i++){if(Math.abs(d[i])<1e-9){if(Math.abs(a[i])>f[i])return false;}else{var u0=(-f[i]-a[i])/d[i],u1=(f[i]-a[i])/d[i];if(u0>u1){var t=u0;u0=u1;u1=t;}if(u0>t0)t0=u0;if(u1<t1)t1=u1;if(t0>t1)return false;}}return true;}
function sightClear(x0,z0,x1,z1){for(var i=0;i<SG.pieces.length;i++){var p=SG.pieces[i];if(!p.built||!blocks(p))continue;if(segHitsBox(p,x0,z0,x1,z1))return false;}return true;}
SG.sightClear=sightClear;

/* --- orders --- */
SG.order=function(s,x,z){var side=SG.sides[s];if(SG.phase!=='fight'&&SG.phase!=='mend'&&SG.phase!=='count')return false;var r=Math.sqrt(x*x+z*z);if(r>3.0){x*=3/r;z*=3/r;}side.order={x:x,z:z};if(side.human)say('order','Squad on the way',false,s);return true;};
function mendable(p){var o=[];p.ps.forEach(function(q,i){if(q.st==='off'&&!q.used&&q.mender<0)o.push(i);});return o;}
function isFree(m){return (m.state==='idle'||m.state==='go'||m.state==='hold');}
function assignMend(m,p,i){var q=p.ps[i];q.mender=m.side*10+m.i;m.job=p.id;m.part=i;m.state='toPart';m.crewing=false;goTo(m,q.rx,q.rz,.5);}
function mendPick(s,p,i,crewToo){var q=p.ps[i],best=null,bd=1e9;SG.mice.forEach(function(m){if(m.side!==s||!isFree(m))return;if(!crewToo&&m.i===SG.sides[s].crew)return;var d=dist(m.x,m.z,q.rx,q.rz);if(d<bd){bd=d;best=m;}});if(best)assignMend(best,p,i);return !!best;}
SG.mend=function(s,pieceId){var p=pieceById(pieceId);if(!p||p.side!==s||(SG.phase!=='fight'&&SG.phase!=='mend'))return false;var list=mendable(p);if(!list.length)return false;return mendPick(s,p,list[0],true);};
function autoMend(s,limit){var busy=0;SG.mice.forEach(function(m){if(m.side===s&&m.part>=0)busy++;});
  SG.pieces.forEach(function(p){if(p.side!==s||!p.built)return;mendable(p).forEach(function(i){if(busy<limit&&mendPick(s,p,i,limit>1))busy++;});});}
SG.damaged=function(s){return SG.pieces.filter(function(p){return p.side===s&&p.built&&mendable(p).length>0;});};
SG.fallen=function(s){var n=0;SG.pieces.forEach(function(p){if(p.side===s)n+=mendable(p).length;});return n;};
SG.mending=function(s){var o={};SG.pieces.forEach(function(p){if(p.side!==s)return;p.ps.forEach(function(q){if(q.st!=='on'&&!q.used){var k=partName(q.id);o[k]=(o[k]||0)+1;}});});return o;};

/* --- mice in the fight --- */
function pickCrew(s){var side=SG.sides[s],l=lobberOf(s);if(!l){side.crew=-1;return;}var cur=side.crew>=0?SG.mice[s*5+side.crew]:null;
  if(cur&&cur.state!=='dizzy'&&cur.part<0)return;if(cur)cur.crewing=false;
  var w=crewSpot(l),best=null,bd=1e9;SG.mice.forEach(function(m){if(m.side!==s||!isFree(m))return;if(side.raid&&m.i===4&&side.bot)return;var d=dist(m.x,m.z,w[0],w[1]);if(d<bd){bd=d;best=m;}});side.crew=best?best.i:-1;}
function tickMice(dt){
  pickCrew(0);pickCrew(1);
  SG.mice.forEach(function(m){
    var side=SG.sides[m.side],en=1-m.side,p,q;if(m.cd>0)m.cd-=dt;if(m.act>0)m.act-=dt;
    if(m.state==='cheer')return;
    if(m.state==='dizzy'){m.t-=dt;m.goal=false;if(m.t<=0&&m.daze){m.daze=false;m.state='idle';return;}
      if(m.t<=0){var w=freeSpot(m.side,m.i);viewPuff(m.x,m.z,1);m.x=w[0];m.z=w[1];m.tx=w[0];m.tz=w[1];m.path=null;m.state='idle';m.rot=m.side?0:PI;viewPuff(m.x,m.z,1);event('home',m.side);}return;}
    if(m.state==='toPart'||m.state==='bring'||m.state==='fix'){p=pieceById(m.job);q=p&&p.ps[m.part];if(!q){dropJob(m);m.state='idle';return;}m.goal=m.state!=='fix';
      if(m.state==='toPart'){if(walk(m,dt,CONFIG.walk)){q.st='carried';var ws=workSpot(p,m);goTo(m,ws[0],ws[1],.7);m.state='bring';}}
      else if(m.state==='bring'){if(walk(m,dt,CONFIG.walk*.85)){m.state='fix';m.t=0;m.speed=0;m.rot=Math.atan2(p.x-m.x,p.z-m.z);}}
      else{m.t+=dt;var shop=side.workshop?pieceById(side.workshop):null,slow=shop&&shop.parts<shop.total&&p!==shop?CONFIG.noShopMend:1;
        if(m.t>=CONFIG.mendTime*slow){q.st='on';q.used=true;q.mender=-1;p.parts++;SG.stats.partsMended++;gridDirty=true;snd('mend');event('mend',m.side,q.id);pop(q.wx,q.wz,'+1 '+partName(q.id),true,q.wy+.15);viewFlash(q.wx,q.wy,q.wz);m.job=0;m.part=-1;m.state='idle';fixGrid();}}
      return;}
    /* free: crew the lobber, or follow the squad order, or go home */
    var tx=m.hx,tz=m.hz,slack=.3,crew=side.crew===m.i&&side.lobber;
    if(crew){var cw=crewSpot(lobberOf(m.side));tx=cw[0];tz=cw[1];slack=.4;}
    else if(side.bot&&side.team==='red'&&m.i===4&&side.raid){tx=side.raid.x;tz=side.raid.z;slack=.45;}
    else if(side.order){var a=m.i/5*PI*2+.3,rad=m.i===0?0:CONFIG.squadRing,off=w2(m.side,Math.cos(a)*rad,Math.sin(a)*rad);tx=side.order.x+off[0];tz=side.order.z+off[1];slack=.35;}   /* the same ring for both ends of the table */
    goTo(m,tx,tz,slack);if(walk(m,dt,CONFIG.walk)){m.state=side.order||crew?'hold':'idle';m.goal=false;m.crewing=!!crew;if(crew){var lb=lobberOf(m.side);m.rot=Math.atan2(lb.x-m.x,lb.z-m.z);}}else{m.state='go';m.goal=m.q<=0;m.crewing=false;}
    if(SG.phase!=='fight'||crew)return;
    /* blue pops corks at range, if it can see the target; red knocks parts off pieces it can reach */
    if(side.team==='blue'&&m.cd<=0){var best=null,bd=CONFIG.corkRange;SG.mice.forEach(function(o){if(o.side!==en||o.state==='dizzy')return;var d=dist(m.x,m.z,o.x,o.z);if(d<bd&&sightClear(m.x,m.z,o.x,o.z)){bd=d;best=o;}});
      if(best){m.cd=CONFIG.corkEvery;m.act=.6;m.rot=Math.atan2(best.x-m.x,best.z-m.z);SG.corks.push({id:SG.nextId++,x0:m.x,z0:m.z,x1:best.x,z1:best.z,t:0});SG.stats.corks++;
        if(rand()<CONFIG.corkChance&&dizzy(best)){best.t=CONFIG.corkDaze;best.daze=true;SG.stats.dazes++;}}}
    else if(side.team==='red'&&m.cd<=0){for(var j=0;j<SG.pieces.length;j++){p=SG.pieces[j];if(p.side!==en||!p.built||!p.total||p.parts<=0)continue;if(boxDist(p,m.x,m.z)>CONFIG.scrapReach)continue;
        var i=nearestPart(p,m.x,0,m.z,true);if(i>=0){knock(p,i,p.x-m.x,p.z-m.z,'scrap');m.cd=CONFIG.scrapEvery;m.act=.7;m.rot=Math.atan2(p.x-m.x,p.z-m.z);break;}}}
  });separate();}
function stuckCheck(dt){SG.mice.forEach(function(m){if(!m.goal){m.moved=0;m.sx=m.x;m.sz=m.z;return;}if(m.sx==null){m.sx=m.x;m.sz=m.z;}
  if(dist(m.x,m.z,m.sx,m.sz)>.08){m.sx=m.x;m.sz=m.z;m.moved=0;}else{m.moved+=dt;if(m.moved>20){SG.stats.stuck++;m.moved=-1e9;}}});}

/* --- the bot --- */
function botFight(s,dt){
  var side=SG.sides[s],L=LEVELS[side.level],en=1-s,w;side.sendT-=dt;side.fireT-=dt;
  if(side.sendT<=0){w=w2(s,(rand()-.5)*.4,.2+rand()*.15);side.order={x:w[0],z:w[1]};side.sendT=10+rand()*6;side.raid=null;
    if(side.team==='red'&&side.score>=SG.sides[en].score+L.raidLead){var best=null,bd=1e9;SG.pieces.forEach(function(p){if(p.side!==en||!p.built||!p.total||p.parts<=0||(p.kind!=='wall'&&p.kind!=='gate'))return;var d=dist(p.x,p.z,0,0);if(d<bd){bd=d;best=p;}});
      if(best){var d0=Math.sqrt(best.x*best.x+best.z*best.z)||1,k=(d0-FOOT[best.kind][1]-.3)/d0;side.raid={x:best.x*k,z:best.z*k};}}}
  if(SG.fallen(s)>=CONFIG.botMendAt)autoMend(s,1);
  var lb=lobberOf(s);if(lb&&mendable(lb).length&&(!partOn(lb,'lobber.crank')||!partOn(lb,'lobber.bucket')))mendPick(s,lb,mendable(lb)[0],true);
  if(side.fireT<=0&&!SG.lobberBlock(s)){var foes=SG.mice.filter(function(m){return m.side===en&&m.state!=='dizzy';}),ws=SG.pieces.filter(function(p){return p.side===en&&p.built&&p.total&&p.parts>0;});
    for(var tr=0;tr<4;tr++){var tx=0,tz=0,found=false;
      if(rand()>=CONFIG.wallShots&&foes.length){var bestN=-1;foes.forEach(function(m){var n=0;foes.forEach(function(o){if(dist(m.x,m.z,o.x,o.z)<.6)n++;});if(n>bestN){bestN=n;tx=m.x;tz=m.z;}});found=true;}
      else if(ws.length){var p=ws[Math.floor(rand()*ws.length)];tx=p.x;tz=p.z;found=true;}
      if(!found)continue;tx+=gauss()*L.err;tz+=gauss()*L.err;var a=SG.arc(s,tx,tz);if(a&&a.hit&&a.hit.own){SG.stats.bySide[s].blocked++;continue;}   /* never through its own camp on purpose */
      SG.fire(s,tx,tz);side.fireT=L.fire*(.8+rand()*.4);break;}}}

function tickFight(dt){
  SG.stats.fightTime+=dt;SG.time-=dt;
  for(var s=0;s<2;s++){var side=SG.sides[s];if(side.reload>0&&crewReady(s))side.reload=Math.max(0,side.reload-dt);if(side.bot)botFight(s,dt);}
  tickMarbles(dt);tickMice(dt);stuckCheck(dt);if(scoreTick(dt))return;
  if(SG.time<=0){
    if(SG.round<CONFIG.rounds){SG.phase='mend';SG.time=CONFIG.brk;SG.sides[0].aim.on=SG.sides[1].aim.on=false;shout('Mend break');ui();}
    else{var a=SG.sides[0].score,b=SG.sides[1].score,w;if(a!==b)w=a>b?0:1;else{var n=SG.onHill();w=n[0]!==n[1]?(n[0]>n[1]?0:1):(SG.lastHolder!=null?SG.lastHolder:0);}endMatch(w);}}}
function tickMend(dt){SG.time-=dt;autoMend(0,5);autoMend(1,5);tickMarbles(dt);tickMice(dt);stuckCheck(dt);if(SG.time<=0)startRound(SG.round+1);}

function tick(dt){
  SG.clock+=dt;SG.sides.forEach(function(sd){if(sd.msg.t>0)sd.msg.t-=dt;});if(SG.callout.t>0)SG.callout.t-=dt;viewTick(dt);fixGrid();
  for(var i=SG.pops.length-1;i>=0;i--){SG.pops[i].t+=dt;if(SG.pops[i].t>1.3)SG.pops.splice(i,1);}
  if(SG.phase==='build')tickBuild(dt);
  else if(SG.phase==='ready'){SG.time-=dt;if(SG.time<=0){SG.time=0;if(SG.sides[0].bot)startRound(1);}}
  else if(SG.phase==='count'){var c0=Math.ceil(SG.time);SG.time-=dt;if(Math.ceil(SG.time)<c0&&SG.time>0)snd('beep');tickMarbles(dt);tickMice(dt);if(SG.time<=0){snd('go');SG.phase='fight';SG.time=CONFIG.round;shout('Round '+SG.round+' of '+CONFIG.rounds+'. Hold the hill!');ui();}}
  else if(SG.phase==='fight')tickFight(dt);
  else if(SG.phase==='mend')tickMend(dt);
  fixGrid();}
SG.step=function(dt){SG.acc+=dt;var n=0;while(SG.acc>=STEP-1e-9){tick(STEP);SG.acc-=STEP;n++;}return n;};
/* true if a mouse stands inside a wall or gate that still blocks it (used by the tests) */
SG.inWall=function(){var bad=0;SG.mice.forEach(function(m){SG.pieces.forEach(function(p){if((p.kind!=='wall'&&p.kind!=='gate')||!p.built||!blocks(p))return;if(solidAt(p,m.side,m.x,m.z,0))bad++;});});return bad;};
SG.debug={knock:function(pieceId,partId){var p=pieceById(pieceId);if(!p)return false;for(var i=0;i<p.ps.length;i++)if(p.ps[i].id===partId){var r=knock(p,i,p.side?1:-1,p.side?-1:1,'debug');fixGrid();return r;}return false;},
  dizzy:function(s,i){var m=SG.mice[s*5+i];return m?dizzy(m):false;},piece:pieceById,blocks:function(id){return blocks(pieceById(id));},crewSpot:function(s){var l=lobberOf(s);return l?crewSpot(l):null;},crewReady:crewReady,isOpen:isOpen};

/* ================= sound: small synthesised noises, WebAudio only =================
   Nothing plays until the first tap (iOS needs that). The game never waits for sound, and runs the same without it. */
var AC=null,master=null,lastSnd={};SG.muted=false;try{SG.muted=window.localStorage.getItem('rtk-mute')==='1';}catch(e0){}
function soundOn(){if(typeof window==='undefined')return;try{if(!AC){var A=window.AudioContext||window.webkitAudioContext;if(!A)return;AC=new A();master=AC.createGain();master.gain.value=SG.muted?0:.5;master.connect(AC.destination);}if(AC.state==='suspended')AC.resume();}catch(e){AC=null;}}
function tone(f,d,type,g,at,f2){var t=AC.currentTime+(at||0),o=AC.createOscillator(),v=AC.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
  v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(g,t+.008);v.gain.exponentialRampToValueAtTime(.0008,t+d);o.connect(v);v.connect(master);o.start(t);o.stop(t+d+.03);}
function noise(d,g,at,freq){var t=AC.currentTime+(at||0),n=Math.floor(AC.sampleRate*d),buf=AC.createBuffer(1,n,AC.sampleRate),ch=buf.getChannelData(0);for(var i=0;i<n;i++)ch[i]=(Math.random()*2-1)*(1-i/n);
  var src=AC.createBufferSource(),fl=AC.createBiquadFilter(),v=AC.createGain();src.buffer=buf;fl.type='bandpass';fl.frequency.value=freq||1200;fl.Q.value=.9;v.gain.value=g;src.connect(fl);fl.connect(v);v.connect(master);src.start(t);}
var SOUNDS={
  tap:function(){noise(.05,.5,0,1900);tone(190,.07,'triangle',.25,0,120);},                                   /* hammer */
  knock:function(){tone(520,.07,'square',.16,0,300);tone(360,.1,'square',.14,.06,200);noise(.09,.35,0,800);},   /* a plank comes off */
  twang:function(){tone(170,.34,'sawtooth',.2,0,70);tone(340,.22,'triangle',.12,0,150);},                       /* the lobber lets go */
  thud:function(){tone(120,.2,'sine',.5,0,45);noise(.07,.3,0,300);},                                           /* a marble lands */
  twinkle:function(){[1320,1760,1480,1980].forEach(function(f,i){tone(f,.12,'sine',.13,i*.07);});},             /* dizzy */
  hill:function(){tone(523,.16,'triangle',.22,0);tone(784,.3,'triangle',.22,.13);},                             /* the hill changes hands */
  mend:function(){tone(660,.1,'triangle',.18,0);tone(990,.16,'triangle',.16,.08);},
  beep:function(){tone(440,.14,'square',.14,0);},go:function(){tone(880,.4,'square',.16,0);},                    /* 3-2-1, go */
  win:function(){[523,659,784,1047,784,1047].forEach(function(f,i){tone(f,i===5?.6:.16,'triangle',.24,i*.15);});}
};
function snd(name){if(!AC||SG.muted||SG.hold||(SG.speed||1)>4)return;var t=AC.currentTime;if(lastSnd[name]&&t-lastSnd[name]<.05)return;lastSnd[name]=t;try{SOUNDS[name]();}catch(e){}}
SG.setMute=function(v){SG.muted=!!v;try{window.localStorage.setItem('rtk-mute',SG.muted?'1':'0');}catch(e){}if(master)master.gain.value=SG.muted?0:.5;if(hasDom&&E('bMute'))E('bMute').textContent=SG.muted?'🔇':'🔊';};
SG.audio=function(){return {started:!!AC,muted:SG.muted};};

/* ================= drawing ================= */
var R,S,C,W,H,world,hill,GH=[{obj:null,kind:''},{obj:null,kind:''}],GM,camNow=null,hasDom=typeof document!=='undefined';
function E(id){return document.getElementById(id);}
function viewClear(){if(!V.on)return;while(world.children.length)world.remove(world.children[0]);V.pieces={};V.mice=[];V.slots=[[],[]];V.marbles={};V.corks={};V.puffs=[];V.flashes=[];V.rings=[];GH.forEach(function(g){if(g.obj){S.remove(g.obj);g.obj=null;g.kind='';}});
  var pl=E('pops');if(pl)pl.innerHTML='';V.popEls={};}
function viewStart(){if(!V.on)return;
  SG.sides.forEach(function(side,s){side.kit.forEach(function(k,i){var o=SS.piece(k.kind,side.team);o.scale.setScalar(MAT.scale);o.position.set(k.x,.012,k.z);o.rotation.y=k.a+(s?PI:0);world.add(o);V.slots[s].push(o);});});
  var furs=['tan','grey','cream','brown','tan'];SG.mice.forEach(function(m){var team=SG.sides[m.side].team,o=SS.mouse(team,{fur:furs[(m.i+m.side)%5]});
    var rg=new THREE.Mesh(V.ringGeo,V.ringMat[team]);rg.rotation.x=-PI/2;rg.position.y=.009;o.add(rg);o.userData.parts.stars.scale.setScalar(1.9);world.add(o);V.mice.push(o);});
  V.mats[0].material.color.set(SG.sides[0].team==='red'?0x93381f:0x2a55a8);V.mats[1].material.color.set(SG.sides[1].team==='red'?0x93381f:0x2a55a8);
  hill.userData.sA.set(SS.PAL.red.main);hill.userData.sB.set(SS.PAL.blue.main);SS.setHill(hill,.5);}
function ghostOf(kind,team,m){var g=SS.piece(kind,team);g.scale.setScalar(PS);g.traverse(function(o){if(o.isMesh){o.material=m;o.castShadow=false;o.receiveShadow=false;}});return g;}
function tint(g,m){g.traverse(function(o){if(o.isMesh)o.material=m;});}
function viewSite(p){if(!V.on)return;var gh=ghostOf(p.kind,SG.sides[p.side].team,GM.site);gh.position.set(p.x,0,p.z);gh.rotation.y=p.rot;world.add(gh);V.pieces[p.id]={ghost:gh,obj:null,order:[]};}
function viewDrop(p){var v=V.pieces[p.id];if(!v)return;if(v.ghost)world.remove(v.ghost);if(v.obj)world.remove(v.obj);delete V.pieces[p.id];}
function rank(name,y){return (/post/.test(name)?0:(/brace|floor|pole|bench/.test(name)?1:(/plank|door|wall/.test(name)?2:(/roof|flap|ridge|chimney/.test(name)?4:3))))*10+y;}
/* makes the real model of a piece; returns its parts in building order with world positions */
function viewObj(p){
  var team=SG.sides[p.side].team,o=SS.piece(p.kind,team,{solid:false,variant:p.id%3}),parts=SS.parts(o),c=Math.cos(p.rot),s=Math.sin(p.rot),out=[];
  parts.forEach(function(m){var h=m.userData.home;out.push({id:m.userData.partId,x:p.x+(h[0]*c+h[2]*s)*PS,y:h[1]*PS,z:p.z+(-h[0]*s+h[2]*c)*PS,rank:rank(m.userData.partId,h[1])});});
  if(V.on){var v=V.pieces[p.id]||(V.pieces[p.id]={ghost:null,obj:null,order:[]});if(v.ghost){world.remove(v.ghost);v.ghost=null;}
    o.scale.setScalar(PS);o.position.set(p.x,0,p.z);o.rotation.y=p.rot;world.add(o);v.obj=o;v.parts=parts;v.order=parts.map(function(m,i){return i;}).sort(function(a,b){return out[a].rank-out[b].rank;});v.shown=-1;v.solid=false;v.pst=[];}
  return out;}
function viewPuff(x,z,sc){if(!V.on)return;var d=SS.fx.dust();d.position.set(x,0,z);d.userData.sc=sc||1;world.add(d);V.puffs.push({o:d,t:0});}
function viewFlash(x,y,z){if(!V.on)return;var f=new THREE.Mesh(V.flashGeo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthWrite:false}));f.position.set(x,y,z);world.add(f);V.flashes.push({o:f,t:0});}
function viewTick(dt){if(!V.on)return;var q;for(q=V.puffs.length-1;q>=0;q--){var pf=V.puffs[q];pf.t+=dt/.7;SS.fx.dustStep(pf.o,pf.t);pf.o.scale.multiplyScalar(pf.o.userData.sc);if(pf.t>=1){world.remove(pf.o);V.puffs.splice(q,1);}}
  for(q=V.flashes.length-1;q>=0;q--){var fl=V.flashes[q];fl.t+=dt/.28;fl.o.scale.setScalar(.6+fl.t*2.2);fl.o.material.opacity=.9*(1-fl.t);if(fl.t>=1){world.remove(fl.o);V.flashes.splice(q,1);}}}
var POSE={idle:'idle',wander:'walk',toMat:'walk',carry:'carry',hammer:'hammer',cheer:'cheer',go:'walk',hold:'idle',dizzy:'dizzy',toPart:'walk',bring:'carry',fix:'hammer'},_v=null;
function syncPieces(){
  var nr=0;
  SG.pieces.forEach(function(p){var v=V.pieces[p.id];if(!v||!v.obj)return;var n=p.ps.length,i;
    if(p.kind==='lobber'&&p.built){var side=SG.sides[p.side],since=SG.clock-side.fired,live=SG.phase==='fight'||SG.phase==='mend'||SG.phase==='count';v.obj.rotation.y=p.aim==null?p.rot:p.aim;
      SS.lobberPose(v.obj,live?(side.reload>0?Math.max(0,1-side.reload/(CONFIG.reload-.5)):1):0,since<.9?since/.9:0);
      var mb=v.obj.userData.loaded;if(!mb){mb=v.obj.userData.loaded=SS.fx.marble(side.team);v.obj.getObjectByName('socket_fire').add(mb);mb.position.z=-.03;}mb.visible=live&&side.reload<=0;}
    if(!p.built){if(n){if(v.shown!==p.parts){for(i=0;i<n;i++)v.parts[v.order[i]].visible=i<p.parts;v.shown=p.parts;}}else{var k=Math.min(1,p.progress);v.obj.scale.set(PS*(.8+.2*k),PS*(.12+.88*k),PS*(.8+.2*k));}return;}
    if(!n){v.obj.scale.setScalar(PS);return;}
    var whole=p.parts>=n;
    if(whole&&!v.solid){for(i=0;i<n;i++){v.parts[i].visible=true;v.parts[i].position.fromArray(v.parts[i].userData.home);if(v.pst[i]&&v.pst[i]!=='on')v.parts[i].rotation.set(0,0,0);v.pst[i]='on';}SS.solid(v.obj,true);v.solid=true;}
    if(whole)return;
    if(v.solid){SS.solid(v.obj,false);v.solid=false;}
    for(i=0;i<n;i++){var q=p.ps[i],m=v.parts[i],h=m.userData.home;
      if(q.st==='on'){if(v.pst[i]!=='on'){m.visible=true;m.position.fromArray(h);if(v.pst[i])m.rotation.set(0,0,0);v.pst[i]='on';}}
      else if(q.st==='carried'){m.visible=false;v.pst[i]='carried';}
      else{m.visible=true;v.pst[i]='off';var u=Math.min(1,(SG.clock-q.t0)/.75);_v.set(q.rx,.035,q.rz);v.obj.worldToLocal(_v);
        m.position.set(h[0]+(_v.x-h[0])*u,h[1]+(_v.y-h[1])*u+Math.sin(u*PI)*.55,h[2]+(_v.z-h[2])*u);m.rotation.set(u*(PI/2+((i%3)-1)*.2),u*(1.3+i),u<1?u*7:0);
        /* a fallen part that can still be mended gets a bright ring round it */
        if(u>=1&&!q.used){var rg=V.rings[nr];if(!rg){rg=V.rings[nr]=new THREE.Mesh(V.fallGeo,V.fallMat);rg.rotation.x=-PI/2;S.add(rg);}rg.visible=true;rg.position.set(q.rx,.012,q.rz);rg.scale.setScalar(1+.1*Math.sin(SG.clock*5+i));nr++;}}}
  });
  for(var r=nr;r<V.rings.length;r++)V.rings[r].visible=false;}
function syncPops(){var pl=E('pops');if(!pl)return;var seen={},table=SG.mode==='table';V.popEls=V.popEls||{};
  function show(id,cls,text,x,z,y,side,op){seen[id]=1;var el=V.popEls[id];if(!el){el=V.popEls[id]=document.createElement('div');el.className=cls;el.textContent=text;pl.appendChild(el);}
    var q=SG.screen(x,z,y);el.style.left=q.x+'px';el.style.top=q.y+'px';el.style.opacity=op;el.style.transform=table&&side===1?'translate(-50%,0) rotate(180deg)':'translate(-50%,-100%)';}
  SG.pops.forEach(function(q){show(q.id,'pop'+(q.good?' good':'')+(q.text==='?'?' ask':''),q.text,q.x,q.z,q.y+q.t*.35,q.side,q.t>.9?Math.max(0,1-(q.t-.9)/.4):1);});
  /* a hammer over every piece that is being mended, so mending shows even when the mouse is behind it */
  SG.pieces.forEach(function(p){if(!p.built)return;var busy=false;p.ps.forEach(function(q){if(q.mender>=0&&q.st!=='on')busy=true;});if(busy)show('m'+p.id,'pop icon','🔨',p.x,p.z,TALL[p.kind]+.18+.04*Math.sin(SG.clock*6),p.side,1);});
  for(var id in V.popEls)if(!seen[id]){pl.removeChild(V.popEls[id]);delete V.popEls[id];}}
function syncAll(){
  if(!V.on)return;var i,ph=SG.phase;
  if(!SG.sides.length){GH.forEach(function(g){g.zone.visible=g.sel.visible=g.ring.visible=g.arc.visible=g.land.visible=g.order.visible=false;if(g.obj)g.obj.visible=false;});for(i=0;i<V.rings.length;i++)V.rings[i].visible=false;return;}
  SG.mice.forEach(function(m,i){var o=V.mice[i];if(!o)return;var st=m.state,pose=POSE[st]||'idle',r2=m.x*m.x+m.z*m.z;
    if(m.act>0&&(st==='hold'||st==='go'||st==='idle'))pose=SG.sides[m.side].team==='blue'?'aim':'hammer';if(m.q>0)pose='idle';
    o.position.set(m.x,r2<.62*.62?SS.hillHeight(m.x,m.z)*(st==='dizzy'?.7:1):0,m.z);o.rotation.y=m.rot;SS.pose(o,pose,SG.clock*(st==='wander'?.6:1)+i*.37);
    if(pose==='hammer'){var hp=((SG.clock+i*.37)*1.7)%1;if(hp<o.userData.hp)snd('tap');o.userData.hp=hp;}});
  for(var s=0;s<2;s++)SG.sides[s].kit.forEach(function(k,i){var o=V.slots[s][i];if(!o)return;o.visible=!k.picked&&ph==='build'||(!k.used);var sel=i===SG.sides[s].sel;o.position.y=sel?.07+.02*Math.sin(SG.clock*5):.012;o.scale.setScalar(MAT.scale*(k.used&&!k.picked?.8:1));});
  syncPieces();syncPops();
  SG.sides.forEach(function(side,s){var G=GH[s],showGhost=ph==='build'&&side.sel>=0&&side.human;G.zone.visible=showGhost;G.sel.visible=showGhost;
    if(showGhost){var kind=side.kit[side.sel].kind,g=side.ghost;G.sel.position.set(side.kit[side.sel].x,.012,side.kit[side.sel].z);
      if(G.kind!==kind+side.team){if(G.obj)S.remove(G.obj);G.obj=ghostOf(kind,side.team,GM.ok);S.add(G.obj);G.kind=kind+side.team;G.obj.userData.ok=true;}
      if(G.obj.userData.ok!==g.ok){tint(G.obj,g.ok?GM.ok:GM.bad);G.obj.userData.ok=g.ok;}
      G.obj.visible=true;G.obj.position.set(g.sx==null?g.x:g.sx,.01,g.sz==null?g.z:g.sz);G.obj.rotation.y=g.rot;
      var rr=Math.max(FOOT[kind][0],FOOT[kind][1])+.1;G.ring.visible=true;G.ring.scale.setScalar(rr);G.ring.position.set(G.obj.position.x,.008,G.obj.position.z);G.ring.material.color.set(g.ok?0x8fd0ff:0xff5a44);
    }else{if(G.obj)G.obj.visible=false;G.ring.visible=false;}});
  /* marbles, corks, aim arc, order marker */
  var seen={};SG.marbles.forEach(function(a){seen[a.id]=1;var o=V.marbles[a.id];if(!o){o=V.marbles[a.id]=SS.fx.marble(SG.sides[a.side].team);o.scale.setScalar(1.25);world.add(o);}
    if(a.live){var p=marblePos(a,Math.min(1,a.t/a.T));o.position.set(p[0],p[1]+.03,p[2]);o.rotation.x=a.t*9;}
    else{var u=Math.min(1,(a.t-a.T)/.8),dx=a.x1-a.x0,dz=a.z1-a.z0,l=Math.sqrt(dx*dx+dz*dz)||1;o.position.set(a.hx+dx/l*.3*u,Math.max(.034,a.hy*(1-u*2))+Math.abs(Math.sin(u*PI*2))*.08*(1-u),a.hz+dz/l*.3*u);o.scale.setScalar(u>.7?1.25*(1-(u-.7)/.3):1.25);}});
  for(var id in V.marbles)if(!seen[id]){world.remove(V.marbles[id]);delete V.marbles[id];}
  seen={};SG.corks.forEach(function(c){seen[c.id]=1;var o=V.corks[c.id];if(!o){o=V.corks[c.id]=SS.fx.cork();o.scale.setScalar(.75);world.add(o);}var u=Math.min(1,c.t/.25);o.position.set(c.x0+(c.x1-c.x0)*u,.2+Math.sin(u*PI)*.12,c.z0+(c.z1-c.z0)*u);o.rotation.y=Math.atan2(c.x1-c.x0,c.z1-c.z0);});
  for(id in V.corks)if(!seen[id]){world.remove(V.corks[id]);delete V.corks[id];}
  SG.sides.forEach(function(side,s){var G=GH[s],aim=side.aim.on&&ph==='fight'?SG.arc(s,side.aim.tx,side.aim.tz):null;G.arc.visible=G.land.visible=!!aim;
    if(aim){var own=aim.hit&&aim.hit.own,ex=aim.hit?aim.hit.x:aim.x1,ez=aim.hit?aim.hit.z:aim.z1;side.aim.own=!!own;
      SS.fx.setArc(G.arc,new THREE.Vector3(aim.x0,aim.y0,aim.z0),new THREE.Vector3(aim.x1,0,aim.z1),aim.h,SG.clock*.8);G.arc.material.color.set(own?0xff4a36:0xfff3d0);
      G.land.position.set(ex,.01+(aim.hit?aim.hit.y:0),ez);G.land.scale.setScalar(CONFIG.blast);G.land.material.color.set(own?0xff4a36:0xfff3d0);
      var lv=V.pieces[side.lobber];if(lv&&lv.obj)lv.obj.rotation.y=Math.atan2(aim.x1-aim.x0,aim.z1-aim.z0);}
    var od=side.order;G.order.visible=!!od&&(ph==='fight'||ph==='mend'||ph==='count')&&side.human;if(od){G.order.position.set(od.x,(od.x*od.x+od.z*od.z<.36?SS.hillHeight(od.x,od.z):0)+.012,od.z);G.order.scale.setScalar(1+.08*Math.sin(SG.clock*6));G.order.material.color.set(SG.mode==='table'?(side.team==='red'?0xffb09a:0xa9c8ff):0xfff3d0);}});
  SS.setHill(hill,ph==='build'||ph==='ready'||ph==='start'?.5:SG.blueShare());
}
function fmt(t){t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+('0'+(t%60)).slice(-2);}
var lastHud='',CAMNAME=['Whole table','My camp','The hill'];
function ui(){if(!hasDom||!E('start'))return;var ph=SG.phase,fight=ph==='fight'||ph==='mend'||ph==='count',me=SG.sides[0],table=SG.mode==='table'&&ph!=='start';
  E('start').style.display=ph==='start'?'flex':'none';E('end').style.display=ph==='ready'&&!table?'flex':'none';E('win').style.display=ph==='over'&&!table?'flex':'none';
  E('hud').style.display=ph==='start'||table?'none':'flex';E('bar').style.display=ph==='build'&&!table&&me.human?'flex':'none';E('fbar').style.display=fight&&!table?'flex':'none';E('bCam').style.display=ph==='start'||table?'none':'block';
  E('side').style.display=ph==='start'?'none':'flex';E('bPause2').style.display=table?'block':'none';E('tag').style.display=table?'none':'block';
  E('pp0').style.display=E('pp1').style.display=table?'flex':'none';
  E('hCount').style.display=ph==='build'||ph==='ready'?'block':'none';E('mA').style.display=E('mB').style.display=fight||ph==='over'?'block':'none';
  if(ph==='ready'){E('endText').textContent=SG.readyText||'';E('bStart').style.display=me&&me.bot?'none':'inline-block';}
  if(ph==='over'&&!table){var w=SG.sides[SG.winner],won=SG.winner===0;E('winTitle').textContent=NAME[w.team]+' wins!';
    E('winText').textContent=(me.bot?'':(won?'You held the hill. ':'The other camp held the hill. '))+NAME[me.team]+' '+Math.round(me.score)+' · '+NAME[SG.sides[1].team]+' '+Math.round(SG.sides[1].score);}
  ['squad','lobber','mend'].forEach(function(t){var b=E('b_'+t);if(b)b.className='btn'+(SG.tool===t?' on':'');});E('bCam').textContent='🎥 '+CAMNAME[SG.cam];E('bMute').textContent=SG.muted?'🔇':'🔊';lastHud='';}
function listParts(o){var k=Object.keys(o);return k.map(function(n){return o[n]+' '+n+(o[n]>1&&n!=='roof cap'?'s':'');}).join(', ');}
/* the line of help or news for one side */
function lineFor(s){var ph=SG.phase,a=SG.sides[s],n=0;SG.pieces.forEach(function(p){if(p.side===s)n++;});var hint='';
  if(ph==='build'&&a.human)hint=a.ready?'Ready! Waiting for the other camp':(a.sel>=0?'Tap the table to place the '+a.kit[a.sel].kind:(n<KIT.length?'Tap a piece on the mat':'All placed. Tap '+(SG.mode==='table'?'Ready':'Done')+' when you like'));
  else if(ph==='mend'){var md=listParts(SG.mending(s));hint=md?'Mend break · your mice are mending: '+md:'Mend break · nothing to mend';}
  else if(ph==='fight'&&a.human){var blk=SG.lobberBlock(s);hint=a.tool==='lobber'?({none:'You have no lobber',broken:'The lobber is broken. Mend it first',crew:'The lobber needs a mouse beside it',winding:'Winding the lobber…','':'Drag back and let go to fire'})[blk]:(a.tool==='mend'?'Tap a damaged piece to mend it':(a.order?'':'Tap the hill to send your squad'));}
  var call=SG.callout.t>0&&ph!=='mend';return {text:call?SG.callout.text:(a.msg.t>0?a.msg.text:hint),bad:a.msg.t>0&&a.msg.bad&&!call};}
function meterText(side){return (side.team==='red'?'⚙️ Red ':'🪶 Blue ')+Math.round(side.score);}
function hudTable(){var ph=SG.phase,fight=ph==='fight'||ph==='mend'||ph==='count';
  for(var s=0;s<2;s++){var side=SG.sides[s],el=E('pp'+s),ln=lineFor(s),n=0,built=0;SG.pieces.forEach(function(p){if(p.side===s){n++;if(p.built)built++;}});
    var head=ph==='build'?(side.team==='red'?'⚙️ Red':'🪶 Blue')+' · ⏱ '+fmt(SG.time)+' · '+n+' of '+KIT.length:meterText(side)+' · '+(ph==='over'?'over':(ph==='mend'?'break ':'R'+SG.round+' ')+fmt(ph==='count'?CONFIG.round:SG.time));
    var key=[ph,head,ln.text,ln.bad,side.tool,side.ready,Math.round(side.score),Math.ceil(SG.time),SG.winner].join('|');if(el.getAttribute('data-k')===key)continue;el.setAttribute('data-k',key);
    el.querySelector('.meter span').textContent=head;var bar=el.querySelector('.meter i');bar.style.width=(ph==='build'?0:Math.min(100,side.score))+'%';bar.style.background=side.team==='red'?'#d9603a':'#2f6fe6';
    var sy=el.querySelector('.psay');sy.textContent=ln.text;sy.style.visibility=ln.text&&ph!=='over'&&ph!=='count'?'visible':'hidden';sy.className='psay'+(ln.bad?' bad':'');
    [].forEach.call(el.querySelectorAll('.pbtns button'),function(b){var a=b.getAttribute('data-a'),isBuild=a==='L'||a==='R'||a==='undo'||a==='ready';b.style.display=(isBuild?ph==='build':fight)?'inline-block':'none';
      if(a==='ready'){b.textContent=side.ready?'Ready ✓':'Ready';b.className='btn'+(side.ready?' on':' go');}else if(!isBuild)b.className='btn'+(side.tool===a?' on':'');});
    var big=el.querySelector('.pbig');big.style.display=ph==='count'?'block':'none';if(ph==='count')big.textContent=Math.max(1,Math.ceil(SG.time));
    var card=el.querySelector('.pcard');card.style.display=ph==='over'?'block':'none';if(ph==='over'){card.querySelector('h2').textContent=SG.winner===s?'🏆 You win!':NAME[SG.sides[SG.winner].team]+' wins';card.querySelector('p').textContent=meterText(SG.sides[0])+' · '+meterText(SG.sides[1]);}}
  E('bPause2').textContent=SG.paused?'▶':'⏸';}
function hud(){if(!hasDom||!SG.sides.length)return;if(SG.mode==='table'){hudTable();return;}var ph=SG.phase,built=0,n=0;SG.pieces.forEach(function(p){if(p.side===0){n++;if(p.built)built++;}});
  var a=SG.sides[0],b=SG.sides[1],ln=lineFor(0);
  var s=[ph,fmt(SG.time),n,built,ln.text,ln.bad,Math.round(a.score),Math.round(b.score),SG.round,SG.paused,SG.tool].join('|');if(s===lastHud)return;lastHud=s;
  E('hTeam').textContent=ph==='build'?(a.team==='red'?'⚙️ Red':'🪶 Blue')+' camp · Build':(ph==='ready'?'Camp ready':(ph==='mend'?'Mend break':(ph==='over'?'Match over':'Round '+SG.round+' of '+CONFIG.rounds)));
  E('hTime').textContent='⏱ '+fmt(ph==='count'?CONFIG.round:SG.time);E('hCount').textContent='Placed '+n+' of '+KIT.length+' · built '+built;
  function meter(el,side){el.firstChild.textContent=meterText(side);el.querySelector('i').style.width=Math.min(100,side.score)+'%';el.querySelector('i').style.background=side.team==='red'?'#d9603a':'#2f6fe6';}
  meter(E('mA'),a);meter(E('mB'),b);
  var sy=E('say');sy.style.display=ln.text&&ph!=='start'&&ph!=='over'&&ph!=='count'?'block':'none';sy.textContent=ln.text;sy.className=ln.bad?'bad':'';
  var big=E('big');big.style.display=ph==='count'?'block':'none';if(ph==='count')big.textContent=Math.max(1,Math.ceil(SG.time));
  E('bPause').textContent=SG.paused?'▶ Go on':'⏸ Pause';}
function render(){if(!V.on)return;syncAll();moveCamera();SS.wave(hill,SG.clock);hud();R.render(S,C);}
SG.render=render;

function initView(){
  W=innerWidth;H=innerHeight;R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setSize(W,H);R.setPixelRatio(Math.min(2,devicePixelRatio||1));
  R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;R.outputEncoding=THREE.sRGBEncoding;document.body.insertBefore(R.domElement,document.body.firstChild);
  S=new THREE.Scene();S.background=new THREE.Color(0x3b2a1c);S.fog=new THREE.Fog(0x4a3320,9,22);C=new THREE.PerspectiveCamera(40,W/H,.1,60);camNow=null;moveCamera();_v=new THREE.Vector3();
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
  for(s=0;s<2;s++){var G=GH[s];G.zone=flat(new THREE.RingGeometry(ZONE.rMin,ZONE.rMax,48,1,(s?PI/2:-PI/2)-ZONE.half,ZONE.half*2),s?0xffc0a8:0x9fd0ff,.13);G.zone.position.y=.005;
    G.ring=flat(new THREE.RingGeometry(.92,1,40),0x8fd0ff,.85);G.ring.position.y=.008;G.sel=flat(new THREE.RingGeometry(.2,.24,28),0xffd9a8,.95);
    G.land=flat(new THREE.RingGeometry(.86,1,36),0xfff3d0,.9);G.order=flat(new THREE.RingGeometry(.16,.2,28),0xfff3d0,.9);G.arc=SS.fx.arc(16);G.arc.visible=false;S.add(G.arc);}
  V.ringGeo=new THREE.RingGeometry(.105,.128,22);V.ringMat={blue:new THREE.MeshBasicMaterial({color:0x4f8dff,transparent:true,opacity:.9,depthWrite:false}),red:new THREE.MeshBasicMaterial({color:0xff6a3c,transparent:true,opacity:.9,depthWrite:false})};
  V.fallGeo=new THREE.RingGeometry(.13,.155,22);V.fallMat=new THREE.MeshBasicMaterial({color:0xfff6c8,transparent:true,opacity:.95,depthWrite:false});V.flashGeo=new THREE.SphereGeometry(.12,10,8);
  world=new THREE.Group();S.add(world);
  GM={ok:new THREE.MeshBasicMaterial({color:0x8fd0ff,transparent:true,opacity:.5,depthWrite:false}),bad:new THREE.MeshBasicMaterial({color:0xff5a44,transparent:true,opacity:.55,depthWrite:false}),site:new THREE.MeshBasicMaterial({color:0xfff3d0,transparent:true,opacity:.28,depthWrite:false})};
  V.on=true;}
/* three views: the whole table (both mats must fit, landscape or portrait), my camp, the hill */
function camTarget(){var a=W/H,t=Math.tan(20*PI/180),v=SG.cam||0,need=[3.65,2.9,1.9][v],dH=[7.1,5.2,3.9][v],d=Math.max(need/(t*a),dH),el=v===0?(a<1?.95:.72):(v===1?.7:.62),lz=[.25,1.75,.1][v];
  return [0,Math.sin(el)*d,lz+Math.cos(el)*d,0,-.1,lz];}
function moveCamera(){
  if(SG.mode==='table'&&SG.phase!=='start'){var t=Math.tan(10*PI/180),hh=Math.max(120,H-150),d=Math.max(3.38*H/hh/t,3.38/(t*W/H));C.fov=20;C.aspect=W/H;C.up.set(0,0,-1);C.position.set(0,d,0);C.lookAt(0,0,0);C.near=1;C.far=d+12;C.updateProjectionMatrix();C.updateMatrixWorld();S.fog.near=d+4;S.fog.far=d+40;camNow=null;return;}
  if(C.fov!==40){C.fov=40;C.up.set(0,1,0);C.near=.1;C.far=60;S.fog.near=9;S.fog.far=22;}
  var q=camTarget(),i;if(!camNow||SG.camSnap){camNow=q.slice();SG.camSnap=false;}else for(i=0;i<6;i++)camNow[i]+=(q[i]-camNow[i])*.14;
  C.aspect=W/H;C.position.set(camNow[0],camNow[1],camNow[2]);C.lookAt(camNow[3],camNow[4],camNow[5]);C.updateProjectionMatrix();C.updateMatrixWorld();}
SG.setCam=function(v){SG.cam=((v%3)+3)%3;ui();};

/* ================= input: touch and mouse ================= */
var ray,plane,v2,v3,ptr={};
function ground(px,py){v2.set(px/W*2-1,-(py/H)*2+1);ray.setFromCamera(v2,C);return ray.ray.intersectPlane(plane,v3)?{x:v3.x,z:v3.z}:null;}
SG.screen=function(x,z,y){var p=new THREE.Vector3(x,y||0,z).project(C);return {x:(p.x*.5+.5)*W,y:(-p.y*.5+.5)*H};};
function slotAt(px,py,s){var best=-1,bd=38;SG.sides[s].kit.forEach(function(k,i){if(k.used)return;var q=SG.screen(k.x,k.z,.07),d=Math.sqrt((q.x-px)*(q.x-px)+(q.y-py)*(q.y-py));if(d<bd){bd=d;best=i;}});return best;}
/* Every touch belongs to the side whose half it started in (two players), or to the front side (one player).
   Touches are tracked one by one by pointerId, so both players can drag at the same time. */
SG.setTool=function(t,s){var side=SG.sides[s||0];if(!side)return;side.tool=t;side.aim.on=false;ui();};
function sideAt(g){return SG.mode==='table'?(g.z<0?1:0):0;}
function mineDown(s,skip){var o=[];for(var k in ptr)if(ptr[k].s===s&&k!==String(skip))o.push(ptr[k]);return o;}
function pullTarget(s,from,g){var l=lobberOf(s);if(!l||!from)return null;var dx=from.x-g.x,dz=from.z-g.z,d=Math.sqrt(dx*dx+dz*dz);if(d<.12)return null;var pw=Math.min(6.2,d*2.6);return {x:l.x+dx/d*pw,z:l.z+dz/d*pw};}
function damagedAt(g,s){var best=null,bd=.45;SG.damaged(s).forEach(function(p){var d=boxDist(p,g.x,g.z);p.ps.forEach(function(q){if(q.st==='off')d=Math.min(d,dist(q.rx,q.rz,g.x,g.z));});if(d<bd){bd=d;best=p;}});return best;}
function initInput(){
  ray=new THREE.Raycaster();plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);v2=new THREE.Vector2();v3=new THREE.Vector3();var el=R.domElement;
  el.addEventListener('pointerdown',function(e){soundOn();var ph=SG.phase;if(SG.paused||!SG.sides.length)return;var g=ground(e.clientX,e.clientY);if(!g)return;var s=sideAt(g),side=SG.sides[s];if(!side.human)return;
    e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(err){}
    var P=ptr[e.pointerId]={s:s,x:e.clientX,y:e.clientY,kind:'tap',from:g},others=mineDown(s,e.pointerId);
    if(ph==='build'){if(side.ready)return;if(others.length===1){P.kind='twist';others[0].kind='twist';side.twist=Math.atan2(P.y-others[0].y,P.x-others[0].x);return;}
      var ds=slotAt(e.clientX,e.clientY,s);P.kind='ghost';if(ds>=0)SG.select(ds,s);else if(side.sel>=0)SG.moveGhost(g.x,g.z,s);}
    else if(ph==='fight'){var l=lobberOf(s);if(l&&(side.tool==='lobber'||dist(g.x,g.z,l.x,l.z)<.45)){P.kind='aim';side.aim.on=false;}}});
  el.addEventListener('pointermove',function(e){var ph=SG.phase,P=ptr[e.pointerId];if(SG.paused||!SG.sides.length)return;
    if(!P){ /* a mouse hovering, one-player game only: the ghost follows it */
      if(e.pointerType==='mouse'&&SG.mode!=='table'&&ph==='build'&&SG.sides[0].human&&SG.sides[0].sel>=0){var gh=ground(e.clientX,e.clientY);if(gh)SG.moveGhost(gh.x,gh.z,0);}return;}
    P.x=e.clientX;P.y=e.clientY;var s=P.s,side=SG.sides[s],g=ground(e.clientX,e.clientY);
    if(ph==='build'){if(P.kind==='twist'){var o=mineDown(s,e.pointerId)[0];if(o&&side.sel>=0){var a=Math.atan2(P.y-o.y,P.x-o.x),d=a-side.twist;while(d>PI)d-=2*PI;while(d<-PI)d+=2*PI;side.twist=a;SG.turn(-d,s);}return;}
      if(P.kind==='ghost'&&side.sel>=0&&g)SG.moveGhost(g.x,g.z,s);}
    else if(ph==='fight'&&P.kind==='aim'&&g){var t=pullTarget(s,P.from,g);if(t){side.aim.on=true;side.aim.tx=t.x;side.aim.tz=t.z;}else side.aim.on=false;}});
  function up(e){var P=ptr[e.pointerId];if(!P)return;delete ptr[e.pointerId];var ph=SG.phase,s=P.s,side=SG.sides[s];if(SG.paused||!side||!side.human)return;var g=ground(e.clientX,e.clientY);
    if(ph==='build'){if(P.kind!=='ghost'||side.ready)return;var sl=slotAt(e.clientX,e.clientY,s);if(sl>=0){SG.select(sl,s);return;}if(side.sel>=0&&g)SG.tryPlace(g.x,g.z,null,s);return;}
    if(ph!=='fight'&&ph!=='mend'&&ph!=='count')return;
    if(P.kind==='aim'){var was=side.aim.on;side.aim.on=false;if(was){var blk=SG.lobberBlock(s);if(blk)say('wait',({winding:'Still winding…',crew:'No mouse at the lobber yet',broken:'The lobber is broken',none:'No lobber'})[blk],true,s);else SG.fire(s,side.aim.tx,side.aim.tz);return;}if(side.tool==='lobber')return;}
    if(!g)return;if(SG.mode==='table'&&sideAt(g)!==s)g={x:g.x,z:s?-.02:.02};   /* in the two-player game an order stays in your own half */
    var dp=damagedAt(g,s);
    if(side.tool==='mend'){if(dp){if(SG.mend(s,dp.id))say('mend','A mouse is going to mend it',false,s);else say('nomend','No free mouse, or nothing left to mend',true,s);}else say('nomend','Tap a piece with a part knocked off',true,s);return;}
    if(dp&&SG.mend(s,dp.id)){say('mend','A mouse is going to mend it',false,s);return;}
    SG.order(s,g.x,g.z);}
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',function(e){var P=ptr[e.pointerId];if(P&&SG.sides[P.s])SG.sides[P.s].aim.on=false;delete ptr[e.pointerId];});
  addEventListener('keydown',function(e){var k=e.key.toLowerCase();if(k==='q')SG.turn(PI/12);else if(k==='e')SG.turn(-PI/12);else if(k==='z')SG.undo();else if(k==='escape')SG.select(-1);else if(k==='enter'&&SG.sel>=0)SG.tryPlace(SG.ghost.x,SG.ghost.z);
    else if(k==='1')SG.setTool('squad');else if(k==='2')SG.setTool('lobber');else if(k==='3')SG.setTool('mend');else if(k==='p')SG.paused=!SG.paused;else if(k==='c')SG.setCam(SG.cam+1);else if(k==='m')SG.setMute(!SG.muted);});
  E('bL').onclick=function(){SG.turn(PI/12);};E('bR').onclick=function(){SG.turn(-PI/12);};E('bUndo').onclick=function(){SG.undo();};E('bDone').onclick=function(){SG.done();};
  E('b_squad').onclick=function(){SG.setTool('squad');};E('b_lobber').onclick=function(){SG.setTool('lobber');};E('b_mend').onclick=function(){SG.setTool('mend');};E('bPause').onclick=function(){SG.paused=!SG.paused;lastHud='';};
  E('bCam').onclick=function(){SG.setCam(SG.cam+1);};E('bStart').onclick=function(){SG.begin();};
  E('bMute').onclick=function(){soundOn();SG.setMute(!SG.muted);};E('bPause2').onclick=function(){SG.paused=!SG.paused;};
  document.addEventListener('pointerdown',soundOn,true);
  /* the two-player panels: one at each player's edge, the far one turned round. Buttons answer on touch-down, so both players can press at once. */
  for(var s2=0;s2<2;s2++)(function(s){var d=document.createElement('div');d.className='pp'+(s?' flip':'');d.id='pp'+s;
    d.innerHTML='<div class="pill meter"><span></span><div class="m"><i></i></div></div><div class="psay"></div><div class="pbtns"><button class="btn" data-a="L">⟲</button><button class="btn" data-a="R">⟳</button><button class="btn" data-a="undo">Undo</button><button class="btn go" data-a="ready">Ready</button>'+
      '<button class="btn" data-a="squad">👉 Squad</button><button class="btn" data-a="lobber">🔮 Lobber</button><button class="btn" data-a="mend">🔨 Mend</button></div><div class="pbig"></div><div class="pcard"><h2></h2><p></p><button class="btn go" data-a="again">Play again</button></div>';
    document.body.appendChild(d);
    d.addEventListener('pointerdown',function(e){var b=e.target.closest?e.target.closest('button'):null;if(!b)return;e.preventDefault();e.stopPropagation();soundOn();var a=b.getAttribute('data-a');
      if(a==='L')SG.turn(PI/12,s);else if(a==='R')SG.turn(-PI/12,s);else if(a==='undo')SG.undo(s);else if(a==='ready')SG.done(s);else if(a==='again')SG.reset();else SG.setTool(a,s);});})(s2);
  var pick='blue',lvl='easy',mode='solo';
  E('m_solo').onclick=function(){mode='solo';choose(['m_solo','m_table'],'m_solo');E('soloOpts').style.display='block';E('tableNote').style.display='none';};
  E('m_table').onclick=function(){mode='table';choose(['m_solo','m_table'],'m_table');E('soloOpts').style.display='none';E('tableNote').style.display='block';};
  function choose(ids,on){ids.forEach(function(id){E(id).className='btn'+(id===on?' on':'');});}
  E('tBlue').onclick=function(){pick='blue';choose(['tBlue','tRed'],'tBlue');};E('tRed').onclick=function(){pick='red';choose(['tBlue','tRed'],'tRed');};
  ['easy','normal','hard'].forEach(function(l){E('l_'+l).onclick=function(){lvl=l;choose(['l_easy','l_normal','l_hard'],'l_'+l);};});
  E('bPlay').onclick=function(){SG.paused=false;SG.cam=0;SG.start(pick,{level:lvl,mode:mode});};E('bAgain').onclick=function(){SG.reset();};
  addEventListener('resize',function(){W=innerWidth;H=innerHeight;R.setSize(W,H);});}

/* ================= run ================= */
SG.boot=function(){
  initView();initInput();ui();
  var Q={};location.search.slice(1).split('&').forEach(function(kv){var p=kv.split('=');if(p[0])Q[p[0]]=decodeURIComponent(p[1]||'');});
  if(Q.shot){SG.shot(Q.shot,Q.team||'blue');ui();SG.camSnap=true;render();SG.camSnap=true;render();window.__done=true;return;}
  if(Q.auto)autoRun(Q);
  var last=performance.now();(function loop(){var now=performance.now(),raw=now-last,dt=Math.min(.1,raw/1000);last=now;if(SG.phase!=='start'&&!SG.paused&&!SG.hold)SG.step(dt*(SG.speed||1));render();if(PERF)perfFrame(raw);window.__done=true;requestAnimationFrame(loop);})();};
/* ?auto=both|blue|red&level=easy|normal|hard&report=1 : bots play a match with no title screen, drawn normally, and the page
   measures itself. auto=both: bots on both sides. auto=blue or auto=red: the bot plays that team and you play the other.
   Extra, for tests: &speed=8 runs the clock faster, &skipbuild=1 starts from preset camps. Not part of the normal game. */
var PERF=null;
function autoRun(Q){
  var lvl=LEVELS[Q.level]?Q.level:'easy',both=Q.auto==='both',team=Q.auto==='blue'?'red':'blue';
  PERF={frames:[],calls:0,tris:0,errors:[],show:Q.report==='1',done:false,t0:performance.now(),auto:Q.auto,level:lvl};window.SG_REPORT=null;
  window.onerror=function(msg,src,line){PERF.errors.push(String(msg)+(line?' (line '+line+')':''));};window.addEventListener('unhandledrejection',function(e){PERF.errors.push('promise: '+String(e.reason));});
  SG.speed=Math.max(1,Math.min(40,+(Q.speed||1)));SG.start(team,{level:lvl,seed:Q.seed?+Q.seed:Math.floor(performance.now()*7919)%1000000+1});if(both)SG.auto(0,lvl);if(Q.skipbuild==='1')SG.skipBuild();}
function perfFrame(ms){
  if(PERF.done)return;if(PERF.frames.length<60000&&PERF.frames.length+1>3)PERF.frames.push(ms);else if(PERF.frames.length<=3)PERF.frames.push(-1);   /* the first frames are warm-up */
  var inf=R.info.render;if(inf.calls>PERF.calls)PERF.calls=inf.calls;if(inf.triangles>PERF.tris)PERF.tris=inf.triangles;
  if(SG.phase!=='over')return;PERF.done=true;
  var f=PERF.frames.filter(function(x){return x>0;}).sort(function(a,b){return a-b;}),sum=0,i;for(i=0;i<f.length;i++)sum+=f[i];var worst=f.slice(Math.floor(f.length*.99)),ws=0;for(i=0;i<worst.length;i++)ws+=worst[i];
  var st=SG.stats,rep={game:'Round Table Kingdom',auto:PERF.auto,level:PERF.level,speed:SG.speed,winner:SG.sides[SG.winner].team,winnerSide:SG.winner===0?'front':'far',
    scores:{front:{team:SG.sides[0].team,score:Math.round(SG.sides[0].score)},far:{team:SG.sides[1].team,score:Math.round(SG.sides[1].score)}},rounds:SG.round,matchSeconds:Math.round(st.fightTime),clockSeconds:Math.round(SG.clock),
    wallSeconds:Math.round((performance.now()-PERF.t0)/1000),frames:f.length,fpsAverage:f.length?+(1000/(sum/f.length)).toFixed(1):0,fpsWorst1pc:worst.length?+(1000/(ws/worst.length)).toFixed(1):0,longestFrameMs:f.length?+f[f.length-1].toFixed(1):0,
    pageErrors:PERF.errors.slice(0,20),peakDrawCalls:PERF.calls,peakTriangles:PERF.tris,partsKnockedOff:st.partsOff,partsMended:st.partsMended,dizzies:st.dizzies,hillChanges:st.hillFlips,marbles:st.shots,stuckMice:st.stuck,
    userAgent:navigator.userAgent,canvas:{width:R.domElement.width,height:R.domElement.height,cssWidth:W,cssHeight:H,pixelRatio:R.getPixelRatio()}};
  window.SG_REPORT=rep;
  if(PERF.show){var d=document.createElement('div');d.id='report';d.style.cssText='position:fixed;left:3%;right:3%;top:8%;bottom:8%;background:#fffdf6;color:#1e1a16;border:3px solid #3a281a;border-radius:12px;padding:12px;z-index:50;display:flex;flex-direction:column;gap:8px;-webkit-user-select:text;user-select:text';
    var b=document.createElement('button');b.id='bCopy';b.textContent='Copy';b.style.cssText='align-self:flex-start;font-size:18px;padding:8px 20px';var t=document.createElement('textarea');t.id='reportText';t.readOnly=true;t.value=JSON.stringify(rep,null,1);
    t.style.cssText='flex:1;width:100%;box-sizing:border-box;font:13px/1.35 ui-monospace,Menlo,monospace;-webkit-user-select:text;user-select:text';
    b.onclick=function(){t.focus();t.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t.value).then(function(){b.textContent='Copied';},function(){b.textContent=ok?'Copied':'Select all, then copy';});else b.textContent=ok?'Copied':'Select all, then copy';};
    d.appendChild(b);d.appendChild(t);document.body.appendChild(d);}}
function wallOf(s){var best=null,bd=1e9;SG.pieces.forEach(function(p){if(p.side===s&&p.kind==='wall'){var d=dist(p.x,p.z,0,0);if(d<bd){bd=d;best=p;}}});return best;}
function stepUntil(fn,max){for(var t=0;t<(max||30);t+=STEP){SG.step(STEP);if(fn())return true;}return false;}
SG.stepUntil=stepUntil;
/* straight to the start of round 1 with two preset camps (for tests and screenshots) */
SG.quick=function(team,opts){SG.start(team,opts||{seed:777});SG.demo(11,0);SG.sides[1].layout=0;SG.skipBuild();SG.begin();SG.step(CONFIG.count+.05);};
/* fixed scenes for screenshots */
SG.shot=function(name,team){
  if(name.indexOf('table')===0){SG.start('blue',{mode:'table',seed:777});
    if(name==='table-1-build'){SG.demo(5,0);SG.demo(4,1);SG.step(13);SG.select(7,0);var q0=layoutSpot(0,0,7);SG.turn(q0[2]-SG.sides[0].ghost.rot,0);SG.moveGhost(q0[0],q0[1],0);SG.select(6,1);SG.moveGhost(.2,-1.15,1);SG.sides[0].msg.t=SG.sides[1].msg.t=0;return;}
    SG.demo(11,0);SG.demo(11,1);SG.done(0);SG.done(1);SG.step(CONFIG.count+.05);SG.order(0,0,.3);SG.order(1,0,-.3);SG.step(5);stepUntil(function(){return crewReady(0)&&crewReady(1);},10);SG.sides[0].reload=SG.sides[1].reload=0;
    if(name==='table-2-fight'){var f1=wallOf(1),f0=wallOf(0);SG.setTool('lobber',0);SG.setTool('lobber',1);SG.sides[0].aim={on:true,tx:f1.x,tz:f1.z};SG.sides[1].aim={on:true,tx:.2,tz:.45};SG.debug.knock(f0.id,'wall.plank.2');SG.step(.5);SG.sides[0].msg.t=SG.sides[1].msg.t=0;SG.callout.t=0;}
    else if(name==='table-0-count'){SG.start('blue',{mode:'table',seed:777});SG.demo(11,0);SG.demo(11,1);SG.done(0);SG.done(1);SG.step(1.2);}
    else{SG.sides[1].score=99.5;SG.sides[0].score=57;SG.step(2);}
    return;}
  if(name.indexOf('fight')!==0){SG.start(team,{level:'easy',seed:777});
    if(name==='build-2-ghost'){SG.demo(4);SG.step(14);SG.select(7);var q=layoutSpot(0,0,7);SG.turn(q[2]-SG.ghost.rot);SG.moveGhost(q[0],q[1]);}
    else if(name==='build-2b-refused'){SG.demo(4);SG.step(14);SG.select(7);SG.tryPlace(-.5,1.05,0);}
    else if(name==='build-3-mice-carrying'){SG.demo(7);SG.step(2.3);SG.select(-1);}
    else if(name==='build-4-camp-ready'){SG.demo(11);SG.step(45);SG.done();SG.step(.4);}
    return;}
  SG.quick(team,{level:'easy',seed:777});SG.sides[1].bot=false;var foe=wallOf(1);SG.sides[0].reload=0;
  if(name==='fight-0-count'){SG.start(team,{seed:777});SG.demo(11,0);SG.sides[1].layout=0;SG.skipBuild();SG.begin();SG.step(1.2);return;}
  SG.order(0,0,.35);SG.order(1,0,-.35);SG.step(4);stepUntil(function(){return crewReady(0);},10);SG.sides[0].reload=0;
  if(name==='fight-1-aim'){SG.setTool('lobber');SG.aim={on:true,tx:foe.x,tz:foe.z};SG.msg.t=0;SG.callout.t=0;}
  else if(name==='fight-1b-own-wall'){var tw=SG.pieces.filter(function(p){return p.side===0&&p.kind==='tower';})[0],l=lobberOf(0);SG.setTool('lobber');SG.aim={on:true,tx:l.x+(tw.x-l.x)*2.2,tz:l.z+(tw.z-l.z)*2.2};SG.msg.t=0;SG.callout.t=0;}
  else if(name==='fight-2-hit'){SG.fire(0,foe.x,foe.z);stepUntil(function(){return SG.lastHit;},6);SG.step(.25);SG.cam=0;}
  else if(name==='fight-3-dizzy'){stepUntil(function(){return SG.onHill()[1]>=4&&SG.mice.every(function(m){return m.state==='hold';});},10);SG.sides[0].reload=0;var fm=SG.mice.filter(function(m){return m.side===1&&m.x*m.x+m.z*m.z<1;}).sort(function(a,b){return a.z-b.z;})[1]||{x:0,z:-.35};SG.fire(0,fm.x,fm.z);stepUntil(function(){return SG.lastHit;},6);SG.step(1.2);SG.cam=2;}
  else if(name==='fight-4-mend'){var mw=wallOf(0);['wall.plank.1','wall.plank.2','wall.plank.4','wall.plank.5'].forEach(function(id){SG.debug.knock(mw.id,id);});SG.step(1);SG.mend(0,mw.id);stepUntil(function(){return SG.mice.some(function(m){return m.state==='fix';});},12);SG.step(.9);SG.setTool('mend');SG.msg.t=0;SG.callout.t=0;SG.cam=1;}
  else if(name==='fight-5-win'){SG.sides[0].score=99.5;SG.sides[1].score=41;SG.step(1.6);}
};
if(hasDom&&typeof THREE!=='undefined')addEventListener('DOMContentLoaded',SG.boot);
})();
