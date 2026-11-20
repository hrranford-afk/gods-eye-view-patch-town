/* Round Table Kingdom on a practice table: build step, then the fight for the middle flag.
   (The folder is still called sofa-siege.) No AR, no sound. Needs three.js r128 and models.js (SS).
   All game state lives in the plain object SG (on window). SG.step(dt) runs the fixed-step update,
   so a test can play a whole match without drawing. The three.js objects are kept apart, in V. */
(function(){
/* Every number that tunes the match is here. The balance sweep changes nothing else. */
var CONFIG={
  build:120,ready:3,count:3,round:60,rounds:3,brk:10,   /* seconds: build step, bot's wait at "Camp ready", 3-2-1, a round, rounds, mend break */
  pieceScale:'small',                                   /* small, medium or large: how big everything on the table is. Large is the old size; rules 1 always uses it */
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
  /* ---- rules v2, "Break the camp" (the default; ?rules=1 plays the old rules above) ---- */
  v2:{
    reload:2.5,                                 /* lobber winding seconds */
    blast:.3,bigBlast:.33,sturdy:.55,                      /* how far a marble and a Big Marble knock parts off (at piece scale 0.88); posts and rails only come off within this share of it; a Big Marble that lands on the Keep breaks the leg nearest to where it hit, braced or not */
    throwNear:.6,throwFar:.2,                   /* how far a knocked part flies: nearest to the hit, and at the edge of the blast */
    corkCount:5,corkSpread:.42,corkHit:.2,corkCd:8,   /* cork scatter: corks, spread, how near a cork must land to make a mouse dizzy, seconds before the next scatter */
    hillSecs:22,bigMax:3,                       /* seconds holding the hill for one Big Marble; most that can be stored */
    piecePts:{tower:54,lobber:8,wall:5,gate:3.5,workshop:4,tent:5,brace:1,trap:1},collapsePts:2,hillPts:.07,        /* score: what a whole piece is worth when all of it is off at a round's end; each part off counts its share (the Keep counts most, walls least, so walls are not a gift to the other side, and blue's seven-plank walls count the same as red's five-plank ones); a collapse you caused; a second of hill for each mouse more than the other side */
    mendTime:12,redWalk:1.05,                   /* seconds to put one part back; red's mice walk this much quicker in the fight (it evens out blue's edge: with the same speed blue won about two matches in three) */
    raidEvery:3,redRaid:1,raidReach:.4,        /* seconds between a raider's pulls; red's interval times this (1: the same for both); reach */
    guardRange:1.1,blueGuard:1.5,guardEvery:2,guardChance:.45,guardRing:.55,   /* guard corks: reach, blue's reach times this, seconds between, chance to send the raider home dizzy, how far guards stand from the Keep */
    fallReach:.2,chainReach:.13,chainThrow:.42, /* a landing part makes mice this near dizzy, and knocks an attached part this near if it was thrown at least this far */
    collapseReach:.25,slowMo:.4,keepFall:2.4,   /* a collapse makes mice this near the piece dizzy; slow-motion seconds; seconds a Keep takes to fall before the win card */
    points:12,cost:{tower:0,wall:1,gate:1,brace:1,lobber:5,workshop:2,tent:1,trap:2},   /* the build budget; the first lobber is free, a second costs 5 (it was 3 before it fired on its own: at 3 a bot with two lobbers won 78 to 85% against one with one) */
    walk:.42,                                   /* mouse speed at piece scale 0.88: about 6 to 8 seconds from camp to hill at any scale */
    shopMend:.5,tentDizzy:3,trapReach:.2,trapReset:2,   /* a whole workshop halves mending time; a whole tent: dizzy for 3 s; trap reach; seconds to set a trap again. (Each lobber has its own crew, reload and aim: there is no two-lobber discount.) */
    bouncer:{cd:5,blast:.2,hop:.9,hopH:.7,hopT:.5,arc:[.3,.24],slow:1.35},   /* Bouncer: seconds before the next one; blast (no leg breaking); how far past its first touchdown it hops on; height and seconds of the hop (it clears a wall); the arc down to the first touchdown (height = a + distance x b, like the high lob) and how much slower it flies */
    glue:{cd:8,reach:.26,lock:15,slow:4,slowTo:.45,puddle:9},   /* Glue blob: seconds before the next; how far the splash reaches; seconds a glued part cannot be mended; seconds a mouse is slowed after the splash, and its speed then (share); seconds the puddle stays (it does no damage) */
    arcLow:[.1,.09],arcHigh:[.3,.24],highBlast:.5,   /* arc height = a + distance x b: the flat shot is stopped by a wall just in front of its target, the high lob clears it but has this share of the blast */
    plan:{hill:2,raid:1,guard:0,mend:1},        /* how a bot (and a player to begin with) splits the four mice that are not at the lobber */
    randomAim:1.9,botFirst:1.5,                 /* a random-fire bot's spread round the other base; seconds before a bot's first shot of a round */
    legSturdy:.5,braceSturdy:.7,                /* an unbraced Keep leg, and a Keep brace, come off only when the hit is within this share of the blast */
    aimWorth:{leg:30,lastLeg:60,brace:3,mouse:2},aimTry:[-.25,0,.2,.45],bigWorth:8,aimDeep:5,   /* the aiming bot values a shot by the points it would score, plus this much for a Keep leg (more for the leg that brings it down) and for a Keep brace; how far before and past a part it tries; a Big Marble is kept for a shot worth this much more; how many of its best shots it tries again with its wobble */
    botRetarget:4,                              /* seconds between a bot's looks at its plan */
    botGlue:3,bouncerBias:1                     /* the bot throws Glue when this many fallen parts and menders (with at least one mender among them) lie within one splash; its Bouncer shots are worth this times what the blast would take off */
  },
  /* per level: seconds between bot shots, aim error, seconds before it sends its squad, and how many points ahead the red bot must be before it spares a scrapper for the walls */
  levels:{easy:{err2:.2,fire:13,err:.5,send:5,raidLead:6,preset:'average'},normal:{err2:.12,fire:12,err:.45,send:2.5,raidLead:1.5,preset:'average'},hard:{err2:.06,fire:11,err:.2,send:.6,raidLead:2,preset:'good'}}
};
var PI=Math.PI,STEP=1/60,PS=.88,SCALES={small:.58,medium:.72,large:.88},RULES=CONFIG,LEVELS=CONFIG.levels,C2=CONFIG.v2;
function V2(){return SG.rules!==1;}
/* v2 distances are written for piece scale 0.88 and follow the pieces */
function U(){return PS/.88;}
/* ---- ammunition. One entry per kind: add an entry here (and its numbers in CONFIG.v2) and it shows up in the ammo row, the aim ring and the bots' reach.
   name, icon: the button. tint: the ball's colour ('team' = the firing team's). store: a count on the side that the hill fills (Big Marble). cd: seconds before the next, from CONFIG (none = no wait).
   flat: always the low arc (too heavy to lob). R(high): the blast or splash radius at piece scale 1. noLeg: never breaks a Keep leg. bounce: a CONFIG block; the ball hops on past its first touchdown.
   land(a,pos,hit): what happens where it comes down, if it is not an ordinary blast. fire(s,a,li): extra things it throws when it leaves the lobber. ---- */
var AMMO={
  marble:{name:'Marble',icon:'🔵',short:'Marble',tint:'team',R:function(hi){return C2.blast*(hi?C2.highBlast:1);}},
  big:{name:'Big Marble',icon:'⚫',short:'Big',tint:0x2a2a30,store:'big',flat:true,scale:2,R:function(){return C2.bigBlast;}},
  corks:{name:'Corks',icon:'🍾',short:'Corks',tint:'cork',cd:function(){return C2.corkCd;},scale:.8,R:function(){return C2.corkSpread;}},
  bouncer:{name:'Bouncer',icon:'🏀',short:'Bounce',tint:0xff7a2e,cd:function(){return C2.bouncer.cd;},flat:true,noLeg:true,bounce:function(){return C2.bouncer;},R:function(){return C2.bouncer.blast;}},
  glue:{name:'Glue blob',icon:'🍯',short:'Glue',tint:0x86d23c,cd:function(){return C2.glue.cd;},scale:1.4,R:function(){return C2.glue.reach;}}
};
var AMMO_ORDER=['marble','big','corks','bouncer','glue'];
function ammoR(id,hi){var A=AMMO[id]||AMMO.marble;return A.R(hi)*U();}
function ammoReady(side,id){var A=AMMO[id];if(!A)return false;if(A.store)return (side[A.store]||0)>0;if(A.cd)return !((side.cd[id]||0)>0);return true;}
function ammoSpend(side,id){var A=AMMO[id];if(A.store)side[A.store]--;else if(A.cd)side.cd[id]=A.cd();}
/* the words on an ammo button: "Marble ∞", "Big Marble ×2", "Corks (ready in 5 s)" */
function ammoCount(side,id){var A=AMMO[id];if(A.store)return '×'+(side[A.store]||0);if(A.cd&&(side.cd[id]||0)>0)return '(ready in '+Math.ceil(side.cd[id])+' s)';return '∞';}
function ammoLabel(side,id){return AMMO[id].name+' '+ammoCount(side,id);}
/* a short string that changes whenever any ammo count or wait changes, so the buttons are redrawn */
function ammoKey(side){return AMMO_ORDER.map(function(id){return ammoCount(side,id);}).join(',')+'|'+side.ammo+'|'+side.lsel;}
var KIT=['wall','wall','wall','wall','wall','wall','gate','tower','lobber','tent','workshop'];
/* v2: more pieces than the 12 points can buy. The first eleven slots are the old kit, so old presets still fit. */
var KIT2=KIT.concat(['wall','wall','brace','brace','brace','lobber','trap','trap']);
function KITL(){return V2()?KIT2:KIT;}
/* what a piece costs a side now: the tower and the first lobber are free */
function cost(s,kind){var c=C2.cost[kind];if(kind==='lobber'&&!SG.pieces.some(function(p){return p.side===s&&p.kind==='lobber';}))return 0;return c==null?1:c;}
var FOOT0={wall:[.43,.07],gate:[.48,.1],tower:[.3,.3],lobber:[.33,.4],tent:[.36,.36],workshop:[.3,.25],brace:[.07,.17],trap:[.15,.15]},FOOT={},TALL0={wall:.42,gate:.62,tower:1.1,lobber:.5,tent:.42,workshop:.5,brace:.42,trap:.12},TALL={};
/* one number sets how big everything on the table is: pieces, mice, the hill, blasts and reaches all follow it */
function setScale(ps){PS=ps;for(var k in FOOT0){FOOT[k]=[FOOT0[k][0]*PS,FOOT0[k][1]*PS];TALL[k]=TALL0[k]*PS;}gridDirty=true;}
function WALK(){return V2()?C2.walk*U():CONFIG.walk;}
function HILLR(){return 1.0*U();}
var ZONE={rMin:1.03,rMax:2.72,half:1.22},MAT={r0:2.78,r1:3.2,r:2.99,scale:.32,pick:2.6,step:.185},gridDirty=true;setScale(.88);
var REASON={hill:'Not on the hill ring',third:'Only on your own side of the table',overlap:'Too close to another piece'};
var NAME={blue:'Blue',red:'Red'};
/* preset camps. The bot always builds the third. The three were far from even (in hard bot matches the first won 8% and the third 69 to 78%),
   so the weaker two are kept only for demos and tests.
   Each entry: [distance from the hill, angle, extra turn] for each kit slot, in the side's own frame */
var LAYOUTS=[
  [[1.3,-.7,PI],[1.3,.7,PI],[1.72,-.82,PI],[1.72,-.3,PI],[1.72,.3,PI],[1.72,.82,PI],[1.3,0,PI],[2.28,-.72,PI],[2.2,-.22,PI],[2.22,.26,0],[2.26,.74,0]],
  [[1.25,-.35,PI],[1.25,.35,PI],[1.42,-1.0,PI],[1.42,1.0,PI],[1.8,-.62,PI],[1.8,.62,PI],[1.75,0,PI],[2.25,.78,PI],[2.25,0,PI],[2.25,-.42,0],[2.25,-.86,0]],
  [[1.2,0,PI],[1.32,-.66,PI],[1.32,.66,PI],[1.7,-.95,PI],[1.7,.95,PI],[1.85,.3,PI],[1.85,-.3,PI],[2.3,0,PI],[2.25,.52,PI],[2.3,-.5,0],[2.25,.95,0]]
];
/* v2 bot camps of three qualities, to measure whether building matters. Each entry: [kit slot, distance from the hill, angle, turn], in building order
   (a brace is [slot, x, z, turn] in the camp's own frame). Slots: 0-5, 11, 12 walls; 6 gate; 7 tower; 8 lobber; 9 tent; 10 workshop; 13-15 braces; 16 second lobber; 17, 18 traps.
   good: the Keep at the back, braced, a tight wall close in front of it, a forward screen, a trap. average: walls spread wide, nothing close to the Keep.
   bad: the Keep out in front with nothing before it, the walls behind. average2 and good2 are the same camps with a second lobber bought right after the first; the budget leaves out whatever would come last (at 5 points: average2 loses its workshop and tent, good2 its gate, two walls and its trap). */
var PRESETS={
  good:[[7,2.42,0,PI],[13,-.29,2.42,-PI/2],[14,.29,2.42,PI/2],[0,2.06,0,PI],[1,2.06,-.25,PI],[2,2.06,.25,PI],[8,1.3,.85,PI],[10,2.3,-.6,PI],[6,1.5,0,PI],[3,1.52,-.36,PI],[4,1.52,.36,PI],[17,1.3,0,0]],
  average:[[7,2.3,-.5,PI],[8,2.2,.45,PI],[6,1.75,0,PI],[0,1.2,0,PI],[1,1.32,-.66,PI],[2,1.32,.66,PI],[3,1.7,-.95,PI],[4,1.7,.95,PI],[5,1.85,.3,PI],[10,2.3,0,PI],[9,2.3,-.95,0]],
  bad:[[7,1.45,0,PI],[8,2.3,0,PI],[0,2.0,-.3,PI],[1,2.0,.3,PI],[2,2.3,-.6,PI],[3,2.3,.6,PI],[6,2.5,0,PI],[4,1.9,-.9,PI],[5,1.9,.9,PI],[10,2.45,-.9,PI],[9,2.45,.9,0]]
};
function withSecond(P,spot){var o=[];P.forEach(function(q){o.push(q);if(q[0]===8)o.push(spot);});return o;}   /* the second lobber is bought right after the first, so what the budget cannot pay for is what comes last */
PRESETS.average2=withSecond(PRESETS.average,[16,2.2,.95,PI]);
PRESETS.good2=withSecond(PRESETS.good,[16,2.3,-.6,PI]);
var SG={phase:'start',mode:'solo',time:CONFIG.build,round:0,team:'blue',level:'easy',sides:[],pieces:[],mice:[],marbles:[],corks:[],pops:[],kit:[],callout:{text:'',t:0},cam:0,
  clock:0,acc:0,nextId:1,seed:12345,winner:-1,holder:-1,paused:false,lastHit:null,stats:{},opts:{}};
window.SG=SG;
/* Each side keeps its own selection, ghost, tool, aim and message, so two people can play at once.
   SG.sel, SG.ghost, SG.tool, SG.aim and SG.msg are the front side's, kept for the one-player game and the tests. */
['sel','ghost','tool','aim','msg'].forEach(function(k){Object.defineProperty(SG,k,{enumerable:true,get:function(){return SG.sides[0]?SG.sides[0][k]:(k==='sel'?-1:{on:false,ok:false,code:'',text:'',t:0});},set:function(v){if(SG.sides[0])SG.sides[0][k]=v;}});});
SG.CONFIG=CONFIG;SG.unit=U;SG.ammo=AMMO;SG.ammoOrder=AMMO_ORDER;SG.ammoLabel=function(s,id){return ammoLabel(SG.sides[s||0],id);};SG.RULES=CONFIG;SG.FOOT=FOOT;SG.ZONE=ZONE;SG.LEVELS=LEVELS;
var V={pieces:{},mice:[],slots:[[],[]],marbles:{},corks:{},puffs:[],flashes:[],rings:[],puddles:[],on:false};
function rand(){SG.seed=(SG.seed*16807)%2147483647;return (SG.seed-1)/2147483646;}
function gauss(){return (rand()+rand()+rand()-1.5)*1.15;}
function dist(ax,az,bx,bz){var dx=ax-bx,dz=az-bz;return Math.sqrt(dx*dx+dz*dz);}
function event(type,side,extra){var st=SG.stats;st.events++;if(SG.phase==='fight'||SG.phase==='mend'||SG.phase==='count'){var gap=SG.clock-st.lastEvent;if(gap>st.longestGap)st.longestGap=gap;}st.lastEvent=SG.clock;st.last={type:type,side:side,t:SG.clock,extra:extra||''};}
function partName(id){var q=id.split('.');return q[1]==='roof'&&q[2]==='cap'?'roof cap':q[1];}
function pop(x,z,text,good,y,side){SG.pops.push({id:SG.nextId++,x:x,z:z,y:y||.3,text:text,good:!!good,t:0,side:side==null?campAt(x,z):side});}
function hy(x,z){var h=SG.layout.hill,u=U();return SS.hillHeight((x-h.x)/u,(z-h.z)/u)*u;}

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
  var hl=hillAt(),L=SG.layout,box={kind:kind,x:x,z:z,rot:rot},labFree=SG.mode==='lab'&&!!SG.lab&&!SG.lab.strict;   /* the Lab lets you build anywhere on the table unless 'match zones only' is on */
  if(!labFree&&boxDist(box,hl.x,hl.z)<ZONE.rMin*U())return {ok:false,code:'hill',text:REASON.hill};
  if(!labFree&&L.mound&&boxDist(box,L.mound.x,L.mound.z)<L.mound.r+.06)return {ok:false,code:'hill',text:'Not on the hill mound'};
  var cs=corners(kind,x,z,rot),i;
  for(i=0;i<4;i++){if(labFree){if(dist(cs[i][0],cs[i][1],0,0)>3.05)return {ok:false,code:'edge',text:'Off the table'};continue;}var lc=toCamp(side,cs[i][0],cs[i][1]),r=Math.sqrt(lc[0]*lc[0]+lc[1]*lc[1]),a=Math.abs(Math.atan2(lc[0],lc[1]));if(!L.custom&&(r>ZONE.rMax||a>ZONE.half))return {ok:false,code:'third',text:REASON.third};
    /* on a table laid out by cards a camp's zone is the ground round its own base: within 2.15 units of it, on the table, and nearer to it than to the other base */
    if(L.custom&&(dist(cs[i][0],cs[i][1],0,0)>2.78||campAt(cs[i][0],cs[i][1])!==side||dist(cs[i][0],cs[i][1],baseOf(side).x,baseOf(side).z)>2.15))return {ok:false,code:'third',text:REASON.third};}
  /* a brace must lean on your own tower or wall (and may touch it) */
  var prop=null;if(kind==='brace'){var pb=1e9;SG.pieces.forEach(function(q){if(q.side!==side||(q.kind!=='tower'&&q.kind!=='wall'))return;var d=boxDist(q,x,z);if(d<pb){pb=d;prop=q;}});if(!prop||pb>.2*U())return {ok:false,code:'prop',text:'Put a brace against your tower or a wall'};}
  for(i=0;i<SG.pieces.length;i++)if(SG.pieces[i]!==prop&&overlap({kind:kind,x:x,z:z,rot:rot},SG.pieces[i]))return {ok:false,code:'overlap',text:REASON.overlap};
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
/* ---------- the table layout ----------
   Where each camp sits and faces, where the flag hill is, and an optional extra mound. A camp's own frame is the default
   blue one (camp centre at (0, 1.9), facing -z toward the hill); w2 carries a point from that frame onto the table. */
var BASE0=1.9,TABLE_R=3.25;
function defaultLayout(){return {custom:false,bases:{blue:{x:0,z:BASE0,phi:0},red:{x:0,z:-BASE0,phi:PI}},hill:{x:0,z:0},mound:null};}
SG.layout=defaultLayout();
function baseOf(side){var L=SG.layout,sd=SG.sides[side];if(!L.custom||!sd)return side?{x:0,z:-BASE0,phi:PI}:{x:0,z:BASE0,phi:0};return L.bases[sd.team];}
function rotV(side,x,z){var f=baseOf(side).phi,c=Math.cos(f),sn=Math.sin(f);return [x*c+z*sn,-x*sn+z*c];}
function w2(side,x,z){var b=baseOf(side),v=rotV(side,x,z-BASE0);return [b.x+v[0],b.z+v[1]];}
function toCamp(side,x,z){var b=baseOf(side),c=Math.cos(b.phi),sn=Math.sin(b.phi),dx=x-b.x,dz=z-b.z;return [dx*c-dz*sn,dx*sn+dz*c+BASE0];}
function phiOf(side){return baseOf(side).phi;}
function hillAt(){return SG.layout.hill;}
function hillDist(x,z){var h=SG.layout.hill;return dist(x,z,h.x,h.z);}
/* which camp a spot belongs to: the nearer base */
function campAt(x,z){var a=baseOf(0),b=baseOf(1);return dist(x,z,a.x,a.z)<=dist(x,z,b.x,b.z)?0:1;}
/* a spot near the hill, on a camp's own side of it: lat across, fwd toward the camp */
function hillSpot(side,lat,fwd){var h=SG.layout.hill,b=baseOf(side),dx=b.x-h.x,dz=b.z-h.z,l=Math.sqrt(dx*dx+dz*dz)||1;dx/=l;dz/=l;return [h.x+dz*lat+dx*fwd,h.z-dx*lat+dz*fwd];}
/* Reads a locked placement record (schema_version 1, from the picture cards or from touch): blue_base, red_base and capture_flag are needed,
   hill is an optional extra mound. Millimetres and degrees from the anchor, which is taken as the middle of the table.
   x = x_mm / mm_per_unit, z = -y_mm / mm_per_unit, a base's turn = yaw_deg (0 for blue's usual way round, 180 for red's).
   A bad layout is refused with a plain reason and the layout in use stays. It takes effect at the next SG.start. */
SG.MM_PER_UNIT=160;SG.CARD_STORE_KEY='rtk.locked_placements.v1';
/* the layout the player locked on the cards page, if this device has one saved (the same key cards/setup.js uses) */
SG.savedCardLayout=function(){try{var t=window.localStorage.getItem(SG.CARD_STORE_KEY);if(!t)return null;var o=JSON.parse(t);return o&&o.schema_version===1&&Array.isArray(o.placements)?o:null;}catch(e){return null;}};
SG.applyLayout=function(json,opts){
  function no(reason){SG.layoutNote=reason;return {ok:false,reason:reason};}
  var o=json;if(typeof o==='string'){try{o=JSON.parse(o);}catch(e){return no('The layout is not readable JSON');}}
  if(!o||o.schema_version!==1||!Array.isArray(o.placements))return no('The layout must be schema_version 1 with a list of placements');
  var mm=+((opts&&opts.mmPerUnit)||o.mm_per_unit||SG.MM_PER_UNIT),got={},names={blue_base:'BLUE BASE',red_base:'RED BASE',capture_flag:'CAPTURE FLAG',hill:'HILL'};   /* build_camp and the anchor are read past: the game has no use for them yet */if(!(mm>20&&mm<2000))return no('mm_per_unit is not a sensible number');
  o.placements.forEach(function(p){var t=p&&p.transform_anchor_relative;if(!p||!names[p.kind]||!t)return;got[p.kind]={x:+t.x_mm/mm,z:-(+t.y_mm)/mm,phi:(+t.yaw_deg||0)*PI/180,name:names[p.kind]};});
  var miss=['blue_base','red_base','capture_flag'].filter(function(k){return !got[k];});if(miss.length)return no('Not placed yet: '+miss.map(function(k){return names[k];}).join(', '));
  var k,B=got.blue_base,Rd=got.red_base,F=got.capture_flag,M=got.hill||null;
  for(k in got)if(!isFinite(got[k].x)||!isFinite(got[k].z)||!isFinite(got[k].phi))return no(got[k].name+' has a place that is not a number');
  if(dist(F.x,F.z,0,0)>2.1)return no('CAPTURE FLAG is too near the table edge, or off it');
  var bad='';[B,Rd].forEach(function(b){if(bad)return;if(dist(b.x,b.z,0,0)>2.75)bad=b.name+' is off the table';else if(dist(b.x,b.z,F.x,F.z)<1.5)bad=b.name+' is on top of the flag hill. Move it away';
    else{var fx=-Math.sin(b.phi),fz=-Math.cos(b.phi),dx=F.x-b.x,dz=F.z-b.z,l=Math.sqrt(dx*dx+dz*dz);if((fx*dx+fz*dz)/l<-.35)bad=b.name+' faces away from the flag. Turn the card round';}});
  if(bad)return no(bad);
  if(dist(B.x,B.z,Rd.x,Rd.z)<2.4)return no('BLUE BASE and RED BASE are too close together');
  if(M){if(dist(M.x,M.z,0,0)>2.8)return no('HILL is off the table');if(dist(M.x,M.z,F.x,F.z)<1.35)return no('HILL is on top of the flag hill');if(dist(M.x,M.z,B.x,B.z)<.9||dist(M.x,M.z,Rd.x,Rd.z)<.9)return no('HILL covers a base. Move it');}
  var L={custom:true,bases:{blue:{x:B.x,z:B.z,phi:B.phi},red:{x:Rd.x,z:Rd.z,phi:Rd.phi}},hill:{x:F.x,z:F.z},mound:M?{x:M.x,z:M.z,r:.36}:null};
  /* both camps must be able to walk to the flag (the mound is the only thing in the way before anyone builds) */
  var ok=true;[B,Rd].forEach(function(b){if(!walkable(L,b.x,b.z,F.x,F.z))ok=false;});if(!ok)return no('A camp cannot reach the flag: the HILL is in the way');
  SG.layout=L;SG.layoutNote='';return {ok:true,layout:JSON.parse(JSON.stringify(L))};};
SG.clearLayout=function(){SG.layout=defaultLayout();SG.layoutNote='';};
function walkable(L,x0,z0,x1,z1){var n=60,c=6.8/n,g=new Uint8Array(n*n),i,j,q=[],seen=new Uint8Array(n*n);function ix(v){var k=Math.floor((v+3.4)/c);return k<0?0:(k>=n?n-1:k);}
  for(j=0;j<n;j++)for(i=0;i<n;i++){var x=-3.4+(i+.5)*c,z=-3.4+(j+.5)*c;if(x*x+z*z>3.16*3.16||(L.mound&&dist(x,z,L.mound.x,L.mound.z)<L.mound.r+.1))g[j*n+i]=1;}
  var a=ix(z0)*n+ix(x0),b=ix(z1)*n+ix(x1);if(g[a]||g[b])return false;q.push(a);seen[a]=1;
  while(q.length){var cur=q.pop();if(cur===b)return true;i=cur%n;j=(cur-i)/n;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var ni=i+d[0],nj=j+d[1];if(ni<0||nj<0||ni>=n||nj>=n)return;var k=nj*n+ni;if(!seen[k]&&!g[k]){seen[k]=1;q.push(k);}});}
  return false;}

/* ================= start ================= */
/* the old single-lobber names still work for the first rules and the older tests: reload is the chosen lobber's (set it and both are set), corkCd is the cork wait */
function sideCompat(side,s){Object.defineProperty(side,'reload',{enumerable:false,configurable:true,get:function(){var l=lobberOf(s);return l?(l.reload||0):0;},set:function(v){lobbersOf(s).forEach(function(l){l.reload=v;});}});
  Object.defineProperty(side,'corkCd',{enumerable:false,configurable:true,get:function(){return side.cd.corks||0;},set:function(v){side.cd.corks=v;}});}
function newStats(){return {dmg:{},ammoShots:{},glued:0,bounces:0,events:0,lastEvent:0,longestGap:0,last:null,partsOff:0,partsMended:0,dizzies:0,dazes:0,hillFlips:0,shots:0,corks:0,stuck:0,noPath:0,ownHits:0,sightBlocked:0,collapses:0,keepDown:false,raidPulls:0,guardCorks:0,trapped:0,chain:0,fightTime:0,bySide:[{shots:0,dizzied:0,partsLost:0,hillSecs:0,blocked:0},{shots:0,dizzied:0,partsLost:0,hillSecs:0,blocked:0}]};}
SG.start=function(team,opts){
  viewClear();opts=opts||{};if(opts.mode==='lab')opts.rules=2;SG.opts=opts;SG.rules=opts.rules===1||(opts.rules==null&&SG.rulesDefault===1)?1:2;SG.pieceSize=SCALES[opts.pieces]?opts.pieces:(SG.rules===1?'large':(SG.piecesDefault||CONFIG.pieceScale));setScale(SCALES[SG.pieceSize]);SG.debris=[];SG.slowT=0;SG.shake=0;SG.fallWinner=-1;SG.att=0;SG.mode=opts.mode==='table'?'table':(opts.mode==='lab'?'lab':'solo');if(SG.mode==='lab')SG.rules=2;SG.team=SG.mode==='table'||SG.mode==='lab'?'blue':(team==='red'?'red':'blue');SG.level=LEVELS[opts.level]?opts.level:(SG.level||'easy');
  SG.phase='build';SG.time=CONFIG.build;SG.round=0;SG.pieces=[];SG.mice=[];SG.marbles=[];SG.corks=[];SG.pops=[];SG.puddles=[];SG.clock=0;SG.acc=0;SG.nextId=1;SG.seed=((opts.seed||12345)*48271+11)%2147483647||7;for(var w0=0;w0<6;w0++)rand();   /* stir the seed, so near seeds do not give near first numbers */
  SG.callout={text:'',t:0};SG.winner=-1;SG.holder=-1;SG.lastHolder=null;SG.cand=-1;SG.candT=0;SG.lastKnock=null;SG.lastHit=null;SG.stats=newStats();SG.sec=0;
  SG.sides=[];gridDirty=true;
  for(var s=0;s<2;s++){var human=SG.mode==='table'||SG.mode==='lab'||s===0,side={team:s===0?SG.team:(SG.team==='blue'?'red':'blue'),human:human,bot:!human,ready:false,sel:-1,ghost:{x:0,z:0,rot:0,ok:false,code:''},tool:'squad',aim:{on:false,tx:0,tz:0},cd:{},lsel:0,msg:{code:'',text:'',t:0},level:SG.level,kit:[],score:0,bank:0,hill:0,collapses:0,holdT:0,big:0,ammo:'marble',corkCd:0,plan:{hill:C2.plan.hill,raid:C2.plan.raid,guard:C2.plan.guard,mend:C2.plan.mend},planT:0,aimMode:(opts.aim&&opts.aim[s])||'aim',preset:(opts.presets&&opts.presets[s])||'',points:C2.points,lobber2:0,tent:0,high:false,keep:0,pick:'',order:null,lobber:0,workshop:0,crew:-1,raid:null,
      bt:2+s,layout:2,sendT:0,fireT:0,placed:0};SG.sides.push(side);sideCompat(side,s);
    var g0=w2(s,0,BASE0);side.ghost.x=g0[0];side.ghost.z=g0[1];side.ghost.rot=phiOf(s);
    var KL=KITL(),mstep=Math.min(MAT.step,2.02/KL.length);KL.forEach(function(kind,i){var a=(i-(KL.length-1)/2)*mstep,w=w2(s,Math.sin(a)*MAT.r,Math.cos(a)*MAT.r),rr=dist(w[0],w[1],0,0),o=w2(s,0,0);if(rr>MAT.r){w[0]*=MAT.r/rr;w[1]*=MAT.r/rr;}   /* a tray slot never hangs off the table */
      var dl=dist(o[0],o[1],w[0],w[1])||1,pk=[w[0]+(o[0]-w[0])/dl*.39,w[1]+(o[1]-w[1])/dl*.39];side.kit.push({kind:kind,a:a,x:w[0],z:w[1],px:pk[0],pz:pk[1],used:false,picked:false});});
    for(var i=0;i<5;i++){var h=w2(s,(i-2)*.42,2.3-Math.abs(i-2)*.1);SG.mice.push({side:s,i:i,state:'idle',x:h[0],z:h[1],rot:phiOf(s)+PI,tx:h[0],tz:h[1],hx:h[0],hz:h[1],job:0,part:-1,t:0,wait:.5+i*.4,speed:0,
      slack:.3,q:0,asked:-9,path:null,pi:0,pver:-1,ptx:0,ptz:0,cd:1+i*.5,act:0,moved:0,goal:false,daze:false});}}
  SG.kit=SG.sides[0].kit;for(var bs=0;bs<2;bs++)if(V2()&&!SG.sides[bs].preset&&SG.sides[bs].bot)SG.sides[bs].preset=LEVELS[SG.sides[bs].level].preset||'average';fitPreset(0);fitPreset(1);viewStart();if(SG.mode==='solo'||SG.mode==='table')labProtosOff();if(V2())for(var hs=0;hs<2;hs++)if(SG.sides[hs].human)SG.select(towerSlot(hs),hs);   /* the Keep goes first, so it is already in hand */
  if(SG.mode==='lab')labInit();else if(opts.design)labDesignToBuild(opts.design);
  ui();};
SG.auto=function(side,level){var s=SG.sides[side];if(!s)return;s.bot=true;s.human=false;if(LEVELS[level])s.level=level;if(V2()&&!s.preset&&SG.phase==='build'&&!SG.pieces.some(function(q){return q.side===side;})){s.preset=LEVELS[s.level].preset||'average';fitPreset(side);}s.sel=-1;ui();};
SG.reset=function(){viewClear();SG.phase='start';SG.pieces=[];SG.mice=[];SG.marbles=[];SG.corks=[];SG.pops=[];SG.sides=[];SG.kit=[];ui();};
function say(code,text,bad,s){var side=SG.sides[s||0];if(side)side.msg={code:code,text:text,t:bad?2.2:2.6,bad:!!bad};}
function shout(text){SG.callout={text:text,t:2.6};}
function mine(s){return SG.pieces.filter(function(p){return p.side===s;});}

/* ================= build step ================= */
function place(s,slotI,x,z,rot){
  var side=SG.sides[s],slot=side.kit[slotI];if(!slot||slot.used)return {ok:false,code:'none',text:''};
  var sn=snap(s,slot.kind,x,z,rot),c=check(s,slot.kind,sn.x,sn.z,rot);if(!c.ok)return c;
  var pc=V2()?cost(s,slot.kind):0;if(pc>side.points)return {ok:false,code:'points',text:'Not enough points left ('+slot.kind+' costs '+pc+')'};side.points-=pc;
  var p={crew:-1,reload:0,fired:-9,cost:pc,id:SG.nextId++,side:s,kind:slot.kind,x:sn.x,z:sn.z,rot:rot,built:false,parts:0,progress:0,slot:slotI,mouse:-1,picked:false,ps:[],total:0,open:[]};
  SG.pieces.push(p);slot.used=true;side.placed++;viewSite(p);return {ok:true,code:'',text:'',piece:p};}
SG.select=function(i,s){s=s||0;var side=SG.sides[s];if(SG.phase!=='build'||!side||!side.human||side.ready)return false;
  var ts=V2()?towerSlot(s):-1;if(ts>=0&&!side.kit[ts].used&&i>=0&&i!==ts){side.sel=ts;refreshGhost(s);say('keep','Place your Keep (the tower) first',true,s);return false;}if(i<0||!side.kit[i]||side.kit[i].used){side.sel=-1;return false;}side.sel=i;refreshGhost(s);return true;};
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
  gridDirty=true;var k=side.kit[p.slot];k.used=false;k.picked=false;side.placed--;side.points+=p.cost||0;if(side.lobber===p.id)side.lobber=0;if(side.lobber2===p.id)side.lobber2=0;say('undo','Took the last piece back',false,s);refreshGhost(s);ui();return true;};
/* one player: Done ends the build step. Two players: each says ready, and the build ends when both have. */
SG.done=function(s){if(SG.phase!=='build')return;if(SG.mode!=='table'){finishBuild();return;}var side=SG.sides[s||0];side.ready=!side.ready;side.sel=-1;say('ready',side.ready?'Ready! Waiting for the other camp':'Not ready yet',false,s||0);ui();if(SG.sides[0].ready&&SG.sides[1].ready)finishBuild();};
/* a tidy camp from a preset; used by the bot, by demos and by tests */
function layoutSpot(s,L,i){var q=LAYOUTS[L][i]||[2,0,0],side0=SG.sides[s];if(V2()&&side0.preset){var P=PRESETS[side0.preset];for(var pi=0;pi<P.length;pi++)if(P[pi][0]===i){q=[P[pi][1],P[pi][2],P[pi][3]];break;}}var f=SG.sides[s].fit||{k:1,da:0,sh:0},a=q[1]+f.da,d=q[0]*f.k,w=w2(s,Math.sin(a)*d,Math.cos(a)*d-f.sh);if(KITL()[i]==='brace')w=w2(s,q[0],q[1]);   /* a brace is given as a plain spot */
  if(KITL()[i]==='brace')return [w[0],w[1],q[2]+phiOf(s)];return [w[0],w[1],a+q[2]+phiOf(s)];}
/* On an unusual table the preset camp is turned and squeezed a little until as many of its pieces as possible fit the camp's zone, so the camp keeps its shape. */
function fitPreset(s){var side=SG.sides[s],best=null,bn=-1,keep=SG.pieces;side.fit=null;if(!SG.layout.custom)return;
  [0,.2,.4,.6,.8,-.2].forEach(function(sh){[1,.9,.8].forEach(function(k){[0,.12,-.12,.24,-.24,.36,-.36,.5,-.5].forEach(function(da){side.fit={k:k,da:da,sh:sh};SG.pieces=keep.slice();var n=0;
    for(var i=0;i<KIT.length;i++){var q=layoutSpot(s,side.layout,i);if(check(s,KIT[i],q[0],q[1],q[2]).ok){n+=KIT[i]==='lobber'?2:1;SG.pieces.push({id:-1,ps:[],kind:KIT[i],x:q[0],z:q[1],rot:q[2],side:s});}}
    if(n>bn){bn=n;best={k:k,da:da,sh:sh};}});});});
  SG.pieces=keep;side.fit=best;}
function botPlace(s,i){var side=SG.sides[s],q=layoutSpot(s,side.layout,i),r=place(s,i,q[0],q[1],q[2]);
  var wide=SG.layout.custom,nt=wide?400:60;   /* on an unusual table the preset spot may not fit: look anywhere in the camp's zone */
  for(var t=0;t<nt&&!r.ok;t++){var a=(rand()-.5)*2*(ZONE.half-(wide?.05:.25)),d=wide?.5+rand()*2.2:1.3+rand()*1.2,w=w2(s,Math.sin(a)*d,Math.cos(a)*d);r=place(s,i,w[0],w[1],a+PI+phiOf(s)+(wide&&t>200?(rand()-.5)*2:0));}
  return r;}
SG.demo=function(n,sideI){var s=sideI||0,out=[];SG.sides[s].layout=0;for(var i=0;i<Math.min(n==null?KIT.length:n,KIT.length);i++)if(!SG.sides[s].kit[i].used)out.push(botPlace(s,i));SG.sides[s].sel=-1;return out;};
function towerSlot(s){var k=SG.sides[s].kit;for(var i=0;i<k.length;i++)if(k[i].kind==='tower')return i;return -1;}
/* the next piece a bot places: in v2 the Keep (the tower) always goes first */
function nextSlot(s){var side=SG.sides[s],k=side.kit,t=towerSlot(s),i;if(V2()&&t>=0&&!k[t].used)return t;
  if(V2()&&side.preset){var P=PRESETS[side.preset];for(i=0;i<P.length;i++)if(!k[P[i][0]].used)return P[i][0];return -1;}
  for(i=0;i<Math.min(k.length,KIT.length);i++)if(!k[i].used)return i;return -1;}
function finishBuild(){
  /* every camp has its Keep: a side that never placed its tower gets it now */
  if(V2())for(var s0=0;s0<2;s0++){var ts=towerSlot(s0);if(ts>=0&&!SG.sides[s0].kit[ts].used){SG.sides[s0].layout=SG.sides[s0].layout||0;if(!botPlace(s0,ts).ok)SG.sides[s0].kit[ts].used=true;}}
  for(var s=0;s<2;s++)if(SG.sides[s].bot){var i;while((i=nextSlot(s))>=0){if(!botPlace(s,i).ok)SG.sides[s].kit[i].used=true;}}
  SG.pieces.forEach(function(p){if(!p.built){startObj(p);completePiece(p,false);}});
  fixGrid();SG.mice.forEach(function(m){m.state='cheer';m.job=0;m.goal=false;m.rot=m.side?PI:0;});
  SG.sides[0].sel=SG.sides[1].sel=-1;SG.phase='ready';SG.time=CONFIG.ready;SG.readyText=V2()?mine(0).length+' pieces built, '+SG.sides[0].points+' points left.':mine(0).length+' of '+KIT.length+' pieces placed.';ui();if(SG.mode==='table')startRound(1);}
SG.skipBuild=function(){if(SG.phase!=='build')return;for(var s=0;s<2;s++){var i;while((i=nextSlot(s))>=0){if(!botPlace(s,i).ok)SG.sides[s].kit[i].used=true;}}finishBuild();};
SG.begin=function(){if(SG.phase==='ready')startRound(1);};
function startObj(p){if(p.ps.length||p.started)return;p.started=true;var ids=viewObj(p);
  ids.forEach(function(q){p.ps.push({id:q.id,st:'on',used:false,mender:-1,wx:q.x,wy:q.y,wz:q.z,rx:0,rz:0,t0:-9,rank:q.rank,cls:/^tower\.post/.test(q.id)?1:(/^tower\.brace/.test(q.id)?2:(/post|rail/.test(q.id)?3:0))});});p.total=p.ps.length;gridDirty=true;}
function raise(p){var n=p.ps.length;if(n){p.parts=Math.min(n,Math.floor(p.progress*n+.001));}else p.parts=p.progress>=1?1:0;}
function completePiece(p,puff){p.progress=1;raise(p);p.built=true;p.parts=p.total||1;SG.sides[p.side].kit[p.slot].picked=true;if(p.kind==='lobber'){if(SG.sides[p.side].lobber&&SG.sides[p.side].lobber!==p.id)SG.sides[p.side].lobber2=p.id;else SG.sides[p.side].lobber=p.id;}if(p.kind==='tent')SG.sides[p.side].tent=p.id;if(p.kind==='brace')setProp(p);if(p.kind==='workshop')SG.sides[p.side].workshop=p.id;if(p.kind==='tower')SG.sides[p.side].keep=p.id;gridDirty=true;if(puff)viewPuff(p.x,p.z,2);}

/* ================= the walking grid =================
   The table is cut into small squares. A square is shut if a standing piece covers it. Each team has its own grid,
   because a gate is open to its own team. Mice walk only along open squares, so they never pass through an intact wall. */
var GN=68,GC=.1,G0=-3.4,GROW=.1,GRID=[new Uint8Array(GN*GN),new Uint8Array(GN*GN)],GVER=0,_par=new Int32Array(GN*GN),_seen=new Int32Array(GN*GN),_q=new Int32Array(GN*GN),_mark=0;
function ci(x){var i=Math.floor((x-G0)/GC);return i<0?0:(i>=GN?GN-1:i);}
function cc(i){return G0+(i+.5)*GC;}
function blocks(p){if(!p.started||p.kind==='trap'||p.kind==='brace')return false;if(p.kind==='wall'||p.kind==='gate'){var on=0,all=0;p.ps.forEach(function(q){if(/plank|door/.test(q.id)){all++;if(q.st==='on')on++;}});if(p.built&&all&&on<all/2)return false;}
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
  for(s=0;s<2;s++){var g=GRID[s];g.fill(0);var md=SG.layout.mound;for(j=0;j<GN;j++)for(i=0;i<GN;i++){var x=cc(i),z=cc(j);if(x*x+z*z>3.16*3.16||(md&&dist(x,z,md.x,md.z)<md.r))g[j*GN+i]=1;}
    SG.pieces.forEach(function(p){if(!blocks(p))return;var f=FOOT[p.kind],R=Math.sqrt(f[0]*f[0]+f[1]*f[1])+GROW*U()+GC,i0=ci(p.x-R),i1=ci(p.x+R),j0=ci(p.z-R),j1=ci(p.z+R);
      for(var jj=j0;jj<=j1;jj++)for(var ii=i0;ii<=i1;ii++)if(solidAt(p,s,cc(ii),cc(jj),GROW*U()))g[jj*GN+ii]=1;});}
  /* a mouse caught under a new piece hops to the nearest open square */
  SG.mice.forEach(function(m){if(GRID[m.side][ci(m.z)*GN+ci(m.x)]){var w=nearFree(m.side,m.x,m.z);m.x=w[0];m.z=w[1];m.path=null;}});}
function isOpen(s,x,z){return !GRID[s][ci(z)*GN+ci(x)];}
function nearFree(s,x,z){var g=GRID[s],bi=ci(x),bj=ci(z),best=null,bd=1e9;for(var r=1;r<14&&!best;r++)for(var j=bj-r;j<=bj+r;j++)for(var i=bi-r;i<=bi+r;i++){if(i<0||j<0||i>=GN||j>=GN||g[j*GN+i])continue;var d=dist(cc(i),cc(j),x,z);if(d<bd){bd=d;best=[cc(i),cc(j)];}}return best||[x,z];}
function clearLine(s,x0,z0,x1,z1){var d=dist(x0,z0,x1,z1),n=Math.ceil(d/.04),g=GRID[s];for(var i=0;i<=n;i++){var k=n?i/n:0;if(g[ci(z0+(z1-z0)*k)*GN+ci(x0+(x1-x0)*k)])return false;}return true;}
/* flood out from the mouse over open squares; head for the reachable square nearest the target */
function plan(m){
  var g=GRID[m.side],si=ci(m.x),sj=ci(m.z),start=sj*GN+si,ti=ci(m.tx),tj=ci(m.tz),goal=tj*GN+ti,head=0,tail=0,best=start,bd=dist(m.x,m.z,m.tx,m.tz),c,i,j,k;
  m.pver=GVER;m.ptx=m.tx;m.ptz=m.tz;m.pi=0;m.path=[];m.claim=[m.x,m.z];
  /* spots other mice stand on, or are heading for, are taken: pick a free one beside them */
  var taken=[];if(!m.crewGoal)SG.mice.forEach(function(o){if(o!==m&&o.claim&&o.state!=='cheer')taken.push(o.claim);});   /* the lobber's crew goes first */
  function crowd(x,z){for(var q=0;q<taken.length;q++)if(dist(x,z,taken[q][0],taken[q][1])<(CONFIG.personal*U()))return .45;return 0;}
  var goalTaken=crowd(m.tx,m.tz)>0;bd+=goalTaken?.45:0;
  if(bd<.05)return;
  _mark++;_q[tail++]=start;_seen[start]=_mark;_par[start]=-1;
  var DI=[1,-1,0,0,1,1,-1,-1],DJ=[0,0,1,-1,1,-1,1,-1];
  while(head<tail){c=_q[head++];if(c===goal&&!goalTaken){best=c;bd=0;break;}i=c%GN;j=(c-i)/GN;var d=dist(cc(i),cc(j),m.tx,m.tz);d+=crowd(cc(i),cc(j));if(d<bd-1e-6){bd=d;best=c;}
    for(k=0;k<8;k++){var ni=i+DI[k],nj=j+DJ[k];if(ni<0||nj<0||ni>=GN||nj>=GN)continue;var nc=nj*GN+ni;if(_seen[nc]===_mark||g[nc])continue;if(k>3&&(g[j*GN+ni]||g[nj*GN+i]))continue;_seen[nc]=_mark;_par[nc]=c;_q[tail++]=nc;}}
  var pts=[];c=best;while(c!==start&&c>=0){i=c%GN;pts.push([cc(i),cc((c-i)/GN)]);c=_par[c];}pts.reverse();
  if(best===goal&&!g[goal]&&!goalTaken){if(pts.length)pts[pts.length-1]=[m.tx,m.tz];else pts.push([m.tx,m.tz]);}
  /* pull the path tight: skip to the farthest point with a clear line */
  var out=[],px=m.x,pz=m.z,a=0;if(m.rough>0){out=pts;a=pts.length;}   /* after a bump: square by square, no corner cutting */
  while(a<pts.length){var b=pts.length-1;while(b>a&&!clearLine(m.side,px,pz,pts[b][0],pts[b][1]))b--;out.push(pts[b]);px=pts[b][0];pz=pts[b][1];a=b+1;}
  m.path=out;if(out.length)m.claim=out[out.length-1];if(goalTaken)bd-=.45;
  if(bd>m.slack&&SG.clock-m.asked>6){m.q=1.2;m.asked=SG.clock;SG.stats.noPath++;pop(m.x,m.z,'?',false,.42);}}
function walk(m,dt,speed){
  if(!m.path||m.pver!==GVER||m.ptx!==m.tx||m.ptz!==m.tz)plan(m);
  if(m.rough>0)m.rough-=dt;if(m.q>0){m.q-=dt;m.speed=0;return false;}
  var left=speed*dt;
  while(left>1e-6&&m.pi<m.path.length){var w=m.path[m.pi],dx=w[0]-m.x,dz=w[1]-m.z,d=Math.sqrt(dx*dx+dz*dz);
    if(d<=left){m.x=w[0];m.z=w[1];left-=d;m.pi++;}else{var nx=m.x+dx/d*left,nz=m.z+dz/d*left;if(!isOpen(m.side,nx,nz)){m.path=null;m.rough=1.5;break;}m.x=nx;m.z=nz;left=0;}   /* pushed off its line: plan again */
    if(d>1e-4){var want=Math.atan2(dx,dz),da=want-m.rot;while(da>PI)da-=2*PI;while(da<-PI)da+=2*PI;m.rot+=da*Math.min(1,dt*12);}}
  if(!m.path){m.speed=0;return false;}if(m.pi>=m.path.length){m.speed=0;return true;}m.speed=speed;return false;}
/* mice do not stand on top of each other: any two that are too close step apart, if the square they step to is open */
function separate(){var M=SG.mice,i,j,still={dizzy:1,cheer:1,hammer:1,fix:1};
  /* only mice that have stopped step apart; a mouse on its way is never pushed, so it always arrives */
  for(i=0;i<M.length;i++){var a=M[i];if(a.state==='dizzy'||a.state==='cheer'||a.speed>0)continue;for(j=i+1;j<M.length;j++){var b=M[j];if(b.state==='dizzy'||b.state==='cheer'||b.speed>0)continue;
    var dx=b.x-a.x,dz=b.z-a.z,d=Math.sqrt(dx*dx+dz*dz);if(d>=(CONFIG.personal*U()))continue;if(d<1e-4){dx=Math.cos(i*2.4+j);dz=Math.sin(i*2.4+j);d=1;}
    var push=((CONFIG.personal*U())-d)*.3,ux=dx/d*push,uz=dz/d*push;if(!still[a.state]&&isOpen(a.side,a.x-ux,a.z-uz)){a.x-=ux;a.z-=uz;}if(!still[b.state]&&isOpen(b.side,b.x+ux,b.z+uz)){b.x+=ux;b.z+=uz;}}}}
function goTo(m,x,z,slack){m.tx=x;m.tz=z;m.slack=slack==null?.3:slack;}
function workSpot(p,m){var f=FOOT[p.kind],nx=Math.sin(p.rot),nz=Math.cos(p.rot),d=f[1]+.22*U(),a=[p.x+nx*d,p.z+nz*d],b=[p.x-nx*d,p.z-nz*d];
  function cost(q){var c=dist(q[0],q[1],m.x,m.z);if(Math.sqrt(q[0]*q[0]+q[1]*q[1])<.5)c+=5;if(!isOpen(m.side,q[0],q[1]))c+=3;if(SG.sides[m.side].human&&(m.side?q[1]<p.z:q[1]>p.z))c-=.6;return c;}   /* a player's mice work on the side the player can see */
  return cost(a)<=cost(b)?a:b;}
function pieceById(id){for(var i=0;i<SG.pieces.length;i++)if(SG.pieces[i].id===id)return SG.pieces[i];return null;}
function freeSpot(s,i){var w=w2(s,(i-2)*.34,2.42);return isOpen(s,w[0],w[1])?w:nearFree(s,w[0],w[1]);}

function tickBuild(dt){
  SG.time-=dt;if(SG.time<=0){SG.time=0;finishBuild();return;}
  for(var s=0;s<2;s++){var side=SG.sides[s];if(!side.bot)continue;side.bt-=dt;if(side.bt<=0){var i=nextSlot(s);if(i>=0){if(!botPlace(s,i).ok)side.kit[i].used=true;}side.bt=3.6+rand()*2.2;}}
  buildMice(dt,false);}
/* The mice build: each waiting order goes to the nearest free mouse, who fetches the piece, carries it and hammers it in. The Lab calls this too (lab=true: mice not building stay where they are). */
function buildMice(dt,lab){
  /* hand each waiting order to the nearest free mouse of its side */
  SG.pieces.forEach(function(p){if(p.mouse>=0){var bm=SG.mice[p.side*5+p.mouse];if(!bm||bm.job!==p.id)p.mouse=-1;}if(p.built||p.mouse>=0)return;var best=null,bd=1e9,slot=SG.sides[p.side].kit[p.slot];
    SG.mice.forEach(function(m){if(m.side!==p.side||(m.state!=='idle'&&m.state!=='wander'))return;var d=dist(m.x,m.z,slot.x,slot.z);if(d<bd){bd=d;best=m;}});
    if(best){var w=[slot.px,slot.pz];p.mouse=best.i;best.job=p.id;best.state='toMat';goTo(best,w[0],w[1],.6);}});
  SG.mice.forEach(function(m){
    var p=m.job?pieceById(m.job):null;if(m.job&&!p){m.job=0;m.state='idle';m.wait=.3;}m.goal=m.state==='toMat'||m.state==='carry';
    if(m.state==='toMat'){if(walk(m,dt,WALK())){p.picked=true;SG.sides[m.side].kit[p.slot].picked=true;var w=workSpot(p,m);goTo(m,w[0],w[1],.7);m.state='carry';}}
    else if(m.state==='carry'){if(walk(m,dt,WALK()*.85)){m.state='hammer';m.t=0;m.speed=0;m.rot=Math.atan2(p.x-m.x,p.z-m.z);startObj(p);fixGrid();}}
    else if(m.state==='hammer'){m.t+=dt;p.progress=Math.min(1,m.t/CONFIG.buildTime);raise(p);if(p.progress>=1){completePiece(p,true);p.mouse=-1;m.job=0;m.state='idle';m.wait=.6+rand();}}
    else if(lab){}
    else if(m.state==='wander'){if(walk(m,dt,.5)){m.state='idle';m.wait=1.5+rand()*2.5;}}
    else if(m.state==='idle'){m.speed=0;m.wait-=dt;if(m.wait<=0){for(var k=0;k<8;k++){var a=(rand()-.5)*1.9,r=1.25+rand()*1.25,w2p=w2(m.side,Math.sin(a)*r,Math.cos(a)*r);
        if(isOpen(m.side,w2p[0],w2p[1])){goTo(m,w2p[0],w2p[1],.5);m.state='wander';break;}}
        if(m.state==='idle')m.wait=1;}}
  });separate();}

/* ================= the fight ================= */
function startRound(n){snd('beep');SG.phase='count';SG.round=n;SG.time=CONFIG.count;SG.sec=0;fixGrid();if(n===1){SG.stats.lastEvent=SG.clock;SG.stats.longestGap=0;}
  SG.mice.forEach(function(m){if(m.state==='cheer'||m.state==='wander'){m.state='idle';}if(n===1){var w=freeSpot(m.side,m.i);m.hx=w[0];m.hz=w[1];m.x=w[0];m.z=w[1];m.tx=w[0];m.tz=w[1];m.path=null;m.claim=[w[0],w[1]];m.rot=m.side?0:PI;}});   /* everyone lines up at home for the battle, so nobody starts walled in */
  SG.sides.forEach(function(s,si){s.sendT=LEVELS[s.level].send;s.fireT=V2()?C2.botFirst*(.6+rand()*.8):LEVELS[s.level].fire*(.4+rand()*.5);if(V2())lobbersOf(si).forEach(function(l,k){l.fireT=s.fireT+k*.5;});if(n===1)s.reload=(V2()?C2.reload:CONFIG.reload)*.5;});ui();}
function endMatch(w){if(V2())for(var fs=0;fs<2;fs++)SG.sides[fs].score=v2Score(fs,true);SG.phase='over';SG.winner=w;SG.sides[0].aim.on=SG.sides[1].aim.on=false;snd('win');SG.mice.forEach(function(m){if(m.state==='dizzy'){m.state='idle';}if(m.side===w){m.state='cheer';m.rot=0;}else if(m.state!=='cheer'){m.state='idle';m.speed=0;}m.goal=false;});
  event('win',w);ui();}
function standing(m){return m.state!=='dizzy'&&hillDist(m.x,m.z)<HILLR();}
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
function lobberWorks(p){return !!p&&p.built&&partOn(p,'lobber.crank')&&partOn(p,'lobber.bucket');}
/* A side's lobbers, the first and then the second. Each is a weapon of its own: its own crew mouse (p.crew), its own winding (p.reload), its own aim (p.aim) and its own working or broken state. */
function lobbersOf(s){var side=SG.sides[s],o=[];if(!side)return o;[side.lobber,side.lobber2].forEach(function(id){var p=id?pieceById(id):null;if(p)o.push(p);});return o;}
/* the lobber a side has chosen (side.lsel), or the first one if that one is not there */
function lobberOf(s,li){var side=SG.sides[s],a=lobbersOf(s);if(!side)return null;if(li==='gun'&&SG.lab)return SG.lab.gun;   /* the Lab's free gun: a lobber-shaped thing on the table's near edge that is not a piece */
  if(li==null)li=side.lsel||0;return a[li]||a[0]||null;}
function crewMouse(l){return l&&l.crew!=null&&l.crew>=0?SG.mice[l.side*5+l.crew]:null;}
/* the lobber a mouse crews, if any */
function crewOf(m){var a=lobbersOf(m.side);for(var i=0;i<a.length;i++)if(a[i].crew===m.i)return a[i];return null;}
SG.lobbers=function(s){return lobbersOf(s);};
SG.selectLobber=function(s,li){var side=SG.sides[s||0];if(!side)return false;var n=lobbersOf(s||0).length;if(li<0||li>=n)return false;side.lsel=li;side.aim.on=false;ui();return true;};
SG.nextLobber=function(s){var side=SG.sides[s||0],n=side?lobbersOf(s||0).length:0;if(n<2)return false;return SG.selectLobber(s||0,((side.lsel||0)+1)%n);};
function partOn(p,id){for(var i=0;i<p.ps.length;i++)if(p.ps[i].id===id)return p.ps[i].st==='on';return true;}
function crewSpot(p){var c=Math.cos(p.rot),s=Math.sin(p.rot),lx=.42*PS,lz=-.22*PS;return [p.x+lx*c+lz*s,p.z-lx*s+lz*c];}
/* the Lab can switch the crew rule off: then a lobber fires with nobody beside it */
function crewOK(s,li){return (li==='gun'||(SG.mode==='lab'&&SG.lab&&!SG.lab.crew))?true:crewReady(s,li);}
function crewReady(s,li){var l=lobberOf(s,li),m=crewMouse(l);if(!l||!m)return false;var w=crewSpot(l);return m.state!=='dizzy'&&m.crewing&&dist(m.x,m.z,w[0],w[1])<.55;}
/* why the lobber cannot fire now, or '' if it can */
SG.lobberBlock=function(s,li){var l=lobberOf(s,li),side=SG.sides[s];if(!l)return 'none';if(V2()&&!lobberWorks(l))return 'broken';if(V2()&&!ammoReady(side,side.ammo))return AMMO[side.ammo].store?'no'+side.ammo:side.ammo;if(!partOn(l,'lobber.crank')||!partOn(l,'lobber.bucket'))return 'broken';if(!crewOK(s,li))return 'crew';if((l.reload||0)>0)return 'winding';return '';};
/* which piece a point in the air would hit (any side's, but not the lobber that fired) */
function pieceAt(x,y,z,skip){for(var j=0;j<SG.pieces.length;j++){var p=SG.pieces[j];if(p.id===skip||!p.built||y>TALL[p.kind])continue;if(p.total&&p.parts<=0)continue;var qx=x-p.x,qz=z-p.z;if(qx*qx+qz*qz>.6)continue;
    var f=FOOT[p.kind],l=toLocal(p,x,z);if(Math.abs(l[0])<f[0]+.03&&Math.abs(l[1])<f[1]+.05)return p;}return null;}
function marblePos(a,k){return [a.x0+(a.x1-a.x0)*k,a.y0*(1-k)+4*a.h*k*(1-k),a.z0+(a.z1-a.z0)*k];}
/* where between two points of its flight a marble first touches a piece, so the spot shown, the spot the bot reckons with and the real landing agree */
function entryK(a,k0,k1,skip){for(var i=0;i<8;i++){var km=(k0+k1)/2,q=marblePos(a,km);if(pieceAt(q[0],q[1],q[2],skip))k1=km;else k0=km;}return k1;}
/* the arc to a spot; .hit says which piece is first in the way, if any. A Big Marble is too heavy for the high lob: it always flies low, so a wall in front of the Keep stops it */
/* the first piece a flight touches, from k0 on: {piece, side, own, x, y, z} or null */
function scanArc(a,s,skip,k0){for(var k=k0;k<=1.0001;k+=.02){var pos=marblePos(a,Math.min(1,k)),p=pieceAt(pos[0],pos[1],pos[2],skip);if(p){if(V2()){k=entryK(a,k-.02,Math.min(1,k),skip);pos=marblePos(a,k);p=pieceAt(pos[0],pos[1],pos[2],skip)||p;}return {piece:p.id,side:p.side,own:p.side===s,k:k,x:pos[0],y:pos[1],z:pos[2]};}}return null;}
/* a.fx, a.fz: where it finally comes down if nothing is in the way. A bouncing ball (a.next) lands first at a.x1,a.z1, then hops on to a.fx,a.fz. */
SG.arc=function(s,tx,tz,li){var l=lobberOf(s,li);if(!l)return null;var side=SG.sides[s],A=V2()?AMMO[side.ammo]:null,bn=A&&A.bounce?A.bounce():null,hop=bn?bn.hop*U():0,dx=tx-l.x,dz=tz-l.z,d=Math.sqrt(dx*dx+dz*dz),mx=6.2,mn=.7+hop;
  if(d>mx){tx=l.x+dx/d*mx;tz=l.z+dz/d*mx;d=mx;}else if(d<mn&&d>0){tx=l.x+dx/d*mn;tz=l.z+dz/d*mn;d=mn;}
  var rr=Math.sqrt(tx*tx+tz*tz);if(rr>3.2){tx*=3.2/rr;tz*=3.2/rr;if(bn)d=Math.sqrt((tx-l.x)*(tx-l.x)+(tz-l.z)*(tz-l.z));}
  var hi=V2()&&side.high&&!(A&&A.flat),ar=bn?bn.arc:(V2()?(hi?C2.arcHigh:C2.arcLow):[.3,.2]),fx=tx,fz=tz,ux=d>0?(tx-l.x)/d:0,uz=d>0?(tz-l.z)/d:1;
  if(bn){d-=hop;tx=fx-ux*hop;tz=fz-uz*hop;}
  var a={x0:l.x,y0:.42*U(),z0:l.z,x1:tx,z1:tz,h:ar[0]*U()+d*ar[1],T:(.65+d*.17)*(bn?bn.slow:(hi?1.35:1)),from:l.id,hit:null,high:!!hi,fx:fx,fz:fz,li:li==null?side.lsel:li};
  labProto('arc',a,s);
  a.k0=li==='gun'?.3:.12;   /* the Lab's free gun sits on the table's rim and clears the first third of its flight, so it shoots over your own camp */
  a.hit=scanArc(a,s,l.id,a.k0);
  if(bn&&!a.hit){var b2={x0:tx,y0:.02,z0:tz,x1:fx,z1:fz,h:bn.hopH*U(),T:bn.hopT,from:l.id,hit:null,high:false};b2.hit=scanArc(b2,s,l.id,.03);a.next=b2;a.hit=b2.hit;}
  return a;};
SG.fire=function(s,tx,tz,li){var side=SG.sides[s];if(li==null)li=side.lsel||0;if(SG.phase!=='fight'||SG.lobberBlock(s,li))return null;var a=SG.arc(s,tx,tz,li);if(!a)return null;var l=lobberOf(s,li);
  if(V2()){a.ammo=side.ammo;var A=AMMO[a.ammo];ammoSpend(side,a.ammo);SG.stats.ammoShots[a.ammo]=(SG.stats.ammoShots[a.ammo]||0)+1;if(A.fire)A.fire(s,a,li);
    if(a.ammo!=='marble'&&!(A.store&&side[A.store]>0))side.ammo='marble';}
  snd('twang');a.id=SG.nextId++;a.side=s;a.t=0;a.live=true;SG.marbles.push(a);l.reload=V2()?C2.reload:CONFIG.reload;l.fired=SG.clock;SG.stats.shots++;SG.stats.bySide[s].shots++;event('shot',s);
  l.aim=Math.atan2(a.x1-l.x,a.z1-l.z);return a;};
/* corks: four more corks thrown round the aimed spot, as marbles of their own */
AMMO.corks.fire=function(s,a,li){for(var ci2=1;ci2<C2.corkCount;ci2++){var an=ci2/(C2.corkCount-1)*PI*2+rand(),rd=C2.corkSpread*U()*(.45+rand()*.55),c2=SG.arc(s,a.x1+Math.cos(an)*rd,a.z1+Math.sin(an)*rd,li);c2.id=SG.nextId++;c2.side=s;c2.t=-ci2*.04;c2.live=true;c2.ammo='corks';SG.marbles.push(c2);}};
function knock(p,i,dx,dz,by,far){var q=p.ps[i];if(!q||q.st!=='on')return false;var l=Math.sqrt(dx*dx+dz*dz)||1,f=far==null?.28+rand()*.3:far*(.85+rand()*.3),lat=(rand()-.5)*.3;
  q.st=V2()&&q.used?'gone':'off';if(V2()){SG.debris.push({t:SG.clock+.72,x:0,z:0,far:f,pid:p.id,i:i});}
  q.t0=SG.clock;q.rx=q.wx+dx/l*f-dz/l*lat;q.rz=q.wz+dz/l*f+dx/l*lat;var rr=Math.sqrt(q.rx*q.rx+q.rz*q.rz);if(rr>3.05){q.rx*=3.05/rr;q.rz*=3.05/rr;}
  snd('knock');q.mender=-1;p.parts--;SG.stats.partsOff++;SG.stats.bySide[p.side].partsLost++;if(V2()&&SG.att!=null){var cz=SG.cause||'other',dd=SG.stats.dmg[cz]||(SG.stats.dmg[cz]=[0,0]);dd[SG.att?1:0]+=partWorth(p);}   /* the score value of what each kind of shot took off, by who fired it */gridDirty=true;event('part',p.side,q.id);if(!V2()||SG.clock-(SG.popT||-9)>.35){SG.popT=SG.clock;pop(q.wx,q.wz,partName(q.id)+' off!',false,q.wy+.15);}viewFlash(q.wx,q.wy,q.wz);if(V2())SG.debris[SG.debris.length-1].x=q.rx,SG.debris[SG.debris.length-1].z=q.rz;SG.lastKnock={piece:p.id,part:q.id,by:by||'',t:SG.clock};if(SG.mode==='lab')labNote('part',p,q);return true;}
function nearestPart(p,x,y,z,flat){var best=-1,bd=1e9;p.ps.forEach(function(q,i){if(q.st!=='on')return;var d=(q.wx-x)*(q.wx-x)+(q.wz-z)*(q.wz-z)+(flat?0:(q.wy-y)*(q.wy-y));if(d<bd){bd=d;best=i;}});return best;}
function hitPiece(p,x,y,z,dx,dz){var i=nearestPart(p,x,y,z,false);if(i<0)return '';var id=p.ps[i].id;knock(p,i,dx,dz,'marble');return id;}
function dizzy(m){if(m.state==='dizzy'||SG.phase==='over')return false;dropJob(m);m.state='dizzy';m.t=V2()&&standsOK(SG.sides[m.side].tent)?C2.tentDizzy:CONFIG.dizzy;m.speed=0;m.goal=false;m.daze=false;m.crewing=false;m.path=null;snd('twinkle');SG.stats.dizzies++;SG.stats.bySide[m.side].dizzied++;event('dizzy',m.side);return true;}
function dropJob(m){if(m.part>=0){var p=pieceById(m.job),q=p&&p.ps[m.part];if(q){if(q.st==='carried'){q.st='off';q.rx=m.x;q.rz=m.z;q.t0=SG.clock-2;}q.mender=-1;}}m.job=0;m.part=-1;}
function tickMarbles(dt){
  for(var i=SG.marbles.length-1;i>=0;i--){var a=SG.marbles[i];a.t+=dt;
    if(!a.live){if(a.t>a.T+.8)SG.marbles.splice(i,1);continue;}
    if(a.t<0)continue;var k=Math.min(1,a.t/a.T),pos=marblePos(a,k),hit=k>(a.leg===2?.03:(a.k0||.12))?pieceAt(pos[0],pos[1],pos[2],a.from):null,part='',n=0,red=SG.sides[a.side].team==='red';
    if(V2()){if(hit){var ke=entryK(a,Math.max(a.leg===2?.03:(a.k0||.12),(a.t-dt)/a.T),k,a.from);pos=marblePos(a,ke);hit=pieceAt(pos[0],pos[1],pos[2],a.from)||hit;}if(hit||k>=1)landV2(a,pos,hit);continue;}
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
/* fallen parts that can go back, in support order: legs and posts first */
function mendable(p){var o=[];if(p.down)return o;p.ps.forEach(function(q,i){if(q.st==='off'&&!q.used&&q.mender<0&&!(q.glue>SG.clock))o.push(i);});if(V2())o.sort(function(a,b){return p.ps[a].rank-p.ps[b].rank;});return o;}
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
/* every lobber has its own crew mouse: the nearest free one that is not crewing the other lobber */
function pickCrew(s){var side=SG.sides[s],ls=lobbersOf(s);if(!ls.length){side.crew=-1;return;}
  ls.forEach(function(l){var cur=crewMouse(l);if(cur&&cur.state!=='dizzy'&&cur.part<0)return;if(cur)cur.crewing=false;
    var w=crewSpot(l),best=null,bd=1e9;SG.mice.forEach(function(m){if(m.side!==s||!isFree(m))return;if(side.raid&&m.i===4&&side.bot)return;if(ls.some(function(o){return o!==l&&o.crew===m.i;}))return;var d=dist(m.x,m.z,w[0],w[1]);if(d<bd){bd=d;best=m;}});l.crew=best?best.i:-1;});
  side.crew=ls[0].crew;}
/* the four orders are shared out among the mice that are not crewing a lobber: with two lobbers there are three */
function normPlan(s){var side=SG.sides[s],pl=side.plan,tot=fieldCount(s),sum=pl.hill+pl.raid+pl.guard+pl.mend;
  while(sum>tot){if(pl.hill>0)pl.hill--;else{var big='',bn=0;ORDERS.forEach(function(o){if(pl[o]>bn){bn=pl[o];big=o;}});if(!big)break;pl[big]--;}sum--;}
  if(sum<tot)pl.hill+=tot-sum;}
function slowOf(m){return V2()&&m.slowT>0?C2.glue.slowTo:1;}
function tickMice(dt){
  if(SG.mode==='lab'&&SG.lab&&!SG.lab.crew){lobbersOf(0).concat(lobbersOf(1)).forEach(function(l){l.crew=-1;});SG.sides[0].crew=SG.sides[1].crew=-1;SG.mice.forEach(function(m){m.crewing=false;});}else{pickCrew(0);pickCrew(1);}if(V2()){normPlan(0);normPlan(1);roles(0);roles(1);}
  SG.mice.forEach(function(m){
    var side=SG.sides[m.side],en=1-m.side,p,q;if(m.cd>0)m.cd-=dt;if(m.act>0)m.act-=dt;if(m.slowT>0)m.slowT-=dt;
    if(m.state==='cheer')return;
    if(SG.mode==='lab'&&(m.state==='toMat'||m.state==='carry'||m.state==='hammer'))return;   /* the Lab's builders are run by buildMice */
    if(m.state==='dizzy'){m.t-=dt;m.goal=false;if(m.t<=0&&m.daze){m.daze=false;m.state='idle';return;}
      if(m.t<=0){var w=freeSpot(m.side,m.i);viewPuff(m.x,m.z,1);m.x=w[0];m.z=w[1];m.tx=w[0];m.tz=w[1];m.path=null;m.state='idle';m.rot=phiOf(m.side)+PI;viewPuff(m.x,m.z,1);event('home',m.side);}return;}
    if(m.state==='toPart'||m.state==='bring'||m.state==='fix'){p=pieceById(m.job);q=p&&p.ps[m.part];if(!q){dropJob(m);m.state='idle';return;}m.goal=m.state!=='fix';
      if(m.state==='toPart'){if(walk(m,dt,WALK()*slowOf(m))){q.st='carried';var ws=workSpot(p,m);goTo(m,ws[0],ws[1],.7);m.state='bring';}}
      else if(m.state==='bring'){if(walk(m,dt,WALK()*.85*slowOf(m))){m.state='fix';m.t=0;m.speed=0;m.rot=Math.atan2(p.x-m.x,p.z-m.z);}}
      else{m.t+=dt;var shop=side.workshop?pieceById(side.workshop):null,slow=V2()?(shop&&shop.parts>=shop.total?C2.shopMend:1):(shop&&shop.parts<shop.total&&p!==shop?CONFIG.noShopMend:1);
        if(m.t>=(V2()?C2.mendTime:CONFIG.mendTime)*slow){q.st='on';q.used=true;q.mender=-1;p.parts++;SG.stats.partsMended++;gridDirty=true;snd('mend');event('mend',m.side,q.id);pop(q.wx,q.wz,'+1 '+partName(q.id),true,q.wy+.15);viewFlash(q.wx,q.wy,q.wz);m.job=0;m.part=-1;m.state='idle';fixGrid();}}
      return;}
    if(V2()){freeV2(m,dt);return;}
    /* free: crew the lobber, or follow the squad order, or go home */
    var cl=crewOf(m),tx=m.hx,tz=m.hz,slack=.3,crew=!!cl;
    if(crew){var cw=crewSpot(cl);tx=cw[0];tz=cw[1];slack=.4;}
    else if(side.bot&&side.team==='red'&&m.i===4&&side.raid){tx=side.raid.x;tz=side.raid.z;slack=.45;}
    else if(side.order){var a=m.i/5*PI*2+.3,rad=m.i===0?0:CONFIG.squadRing*U(),off=rotV(m.side,Math.cos(a)*rad,Math.sin(a)*rad);tx=side.order.x+off[0];tz=side.order.z+off[1];slack=.35;}   /* the same ring for both ends of the table */
    m.crewGoal=!!crew;goTo(m,tx,tz,slack);if(walk(m,dt,WALK())){m.state=side.order||crew?'hold':'idle';m.goal=false;m.crewing=!!crew;if(crew){m.rot=Math.atan2(cl.x-m.x,cl.z-m.z);}}else{m.state='go';m.goal=m.q<=0;m.crewing=false;}
    if(SG.phase!=='fight'||crew)return;
    /* blue pops corks at range, if it can see the target; red knocks parts off pieces it can reach */
    if(side.team==='blue'&&m.cd<=0){var best=null,bd=CONFIG.corkRange;SG.mice.forEach(function(o){if(o.side!==en||o.state==='dizzy')return;var d=dist(m.x,m.z,o.x,o.z);if(d<bd){if(sightClear(m.x,m.z,o.x,o.z)){bd=d;best=o;}else SG.stats.sightBlocked++;}});
      if(best){m.cd=CONFIG.corkEvery;m.act=.6;m.rot=Math.atan2(best.x-m.x,best.z-m.z);SG.corks.push({id:SG.nextId++,x0:m.x,z0:m.z,x1:best.x,z1:best.z,t:0});SG.stats.corks++;
        if(rand()<CONFIG.corkChance&&dizzy(best)){best.t=CONFIG.corkDaze;best.daze=true;SG.stats.dazes++;}}}
    else if(side.team==='red'&&m.cd<=0){for(var j=0;j<SG.pieces.length;j++){p=SG.pieces[j];if(p.side!==en||!p.built||!p.total||p.parts<=0)continue;if(boxDist(p,m.x,m.z)>CONFIG.scrapReach)continue;
        var i=nearestPart(p,m.x,0,m.z,true);if(i>=0){knock(p,i,p.x-m.x,p.z-m.z,'scrap');m.cd=CONFIG.scrapEvery;m.act=.7;m.rot=Math.atan2(p.x-m.x,p.z-m.z);break;}}}
  });separate();}
function stuckCheck(dt){SG.mice.forEach(function(m){if(!m.goal){m.moved=0;m.sx=m.x;m.sz=m.z;return;}if(m.sx==null){m.sx=m.x;m.sz=m.z;}
  if(dist(m.x,m.z,m.sx,m.sz)>.08){m.sx=m.x;m.sz=m.z;m.moved=0;}else{m.moved+=dt;if(m.moved>20){SG.stats.stuck++;SG.stats.stuckInfo={state:m.state,side:m.side,i:m.i,x:m.x,z:m.z,tx:m.tx,tz:m.tz,q:m.q,path:m.path?m.path.length:-1,pi:m.pi,rough:m.rough||0,phase:SG.phase,t:SG.clock,crew:SG.sides[m.side].crew};m.moved=-1e9;}}});}

/* ================= rules v2: blasts, supports, collapses, the Keep, orders ================= */
function onCount(p,re){var n=0;p.ps.forEach(function(q){if(q.st==='on'&&re.test(q.id))n++;});return n;}
function isOn(p,id){for(var i=0;i<p.ps.length;i++)if(p.ps[i].id===id)return p.ps[i].st==='on';return false;}
/* a tower leg holds against an ordinary marble or a raider while either of the two braces that meet it is still on */
function legBraced(p,id){var c=id.split('.')[2];return isOn(p,'tower.brace.'+c.charAt(0))||isOn(p,'tower.brace.'+c.charAt(1))||props(p).some(function(b){return b.leg===c;});}
function standsOK(id){var p=id?pieceById(id):null;return !!p&&p.built&&!p.down&&p.parts>=p.total;}
/* the brace pieces still propping a tower or wall */
function props(p){return SG.pieces.filter(function(b){return b.kind==='brace'&&b.built&&b.parts>0&&b.props===p.id;});}
function setProp(b){var best=null,bd=.3*U();SG.pieces.forEach(function(q){if(q.side!==b.side||(q.kind!=='tower'&&q.kind!=='wall'))return;var d=boxDist(q,b.x,b.z);if(d<bd){bd=d;best=q;}});b.props=best?best.id:0;b.leg='';
  if(best&&best.kind==='tower'){var ld=1e9;best.ps.forEach(function(q){if(/^tower\.post/.test(q.id)){var d=dist(q.wx,q.wz,b.x,b.z);if(d<ld){ld=d;b.leg=q.id.split('.')[2];}}});}}
/* spring traps: the first enemy mouse to step on one is flung home, and the trap must be set again by a mender */
function trapsTick(){SG.pieces.forEach(function(p){if(p.kind!=='trap'||!p.built||p.sprung||p.parts<=0)return;for(var i=0;i<SG.mice.length;i++){var m=SG.mice[i];if(m.side===p.side||m.state==='dizzy')continue;
      if(dist(m.x,m.z,p.x,p.z)<C2.trapReach*U()){p.sprung=true;p.sprungT=SG.clock;SG.stats.trapped++;dizzy(m);pop(p.x,p.z,'BOING!',true,.3,p.side);event('trap',p.side);snd('twang');break;}}});}
/* everything within reach of a hit comes off, the nearest thrown furthest. big: also breaks the nearest tower leg outright. half: a high lob, half the reach */
function blastAt(x,y,z,R,att,big,dirx,dirz,skipId,dry,hitId,kind){
  var touched=[],n=0,val=0,dl=Math.sqrt(dirx*dirx+dirz*dirz)||1,noLeg=!!(kind&&AMMO[kind]&&AMMO[kind].noLeg);if(!dry){SG.att=att;SG.cause=kind||(big?'big':'marble');}
  for(var pi=0;pi<SG.pieces.length;pi++){var p=SG.pieces[pi];if(p.id===skipId||!p.built||!p.total||p.down||Math.abs(p.x-x)>R+.75||Math.abs(p.z-z)>R+.75||boxDist(p,x,z)>R+.05)continue;var hits=[],leg=-1,ld=1e9,near=big&&p.kind==='tower'&&p.id===hitId;
    for(var i=0;i<p.ps.length;i++){var q=p.ps[i];if(q.st!=='on')continue;var d=Math.sqrt((q.wx-x)*(q.wx-x)+(q.wz-z)*(q.wz-z)+(q.wy-y)*(q.wy-y)*.45);if(noLeg&&q.cls===1)continue;if(near&&q.cls===1){if(d<ld){ld=d;leg=i;}continue;}if(d>R)continue;
      if(q.cls===1){if(d>R*C2.legSturdy||legBraced(p,q.id))continue;}else if(q.cls===3&&d>R*C2.sturdy)continue;else if(q.cls===2&&d>R*C2.braceSturdy)continue;hits.push([d,i]);}
    if(leg>=0)hits.push([Math.min(ld,R*.8),leg]);if(!hits.length)continue;
    if(dry){var A=C2.aimWorth,w=partWorth(p),sg=p.side===att?-1:1,v=0,rails=0,posts=0,legs=0;
      for(var hh=0;hh<hits.length;hh++){var qq=p.ps[hits[hh][1]];v+=w;if(qq.cls===1)legs++;else if(qq.cls===2)v+=A.brace;else if(qq.cls===3){if(/rail/.test(qq.id))rails++;else posts++;}}
      if(legs)v+=legs*(A.leg+(onCount(p,/^tower\.post/)<=3?A.lastLeg:0));
      if(p.kind==='wall'&&(rails||posts)&&((rails&&rails>=onCount(p,/rail/))||(posts&&posts>=onCount(p,/post/)&&!props(p).length)))v+=C2.collapsePts+w*Math.max(0,onCount(p,/plank/)-(hits.length-rails-posts));   /* this shot would bring the wall down */
      if(p.kind==='gate'&&posts&&onCount(p,/gate\.post/)-posts<2)v+=C2.collapsePts+w*2;
      val+=sg*v;continue;}
    hits.sort(function(a,b){return a[0]-b[0];});
    hits.forEach(function(h){var q=this.ps[h[1]],ax=q.wx-x,az=q.wz-z,al=Math.sqrt(ax*ax+az*az)||1,k=1-h[0]/R;if(knock(this,h[1],ax/al*.6+dirx/dl,az/al*.6+dirz/dl,'marble',(C2.throwFar+(C2.throwNear-C2.throwFar)*k)*U()))n++;},p);touched.push(p);}
  if(dry)return val;touched.forEach(function(p){settle(p,att);});return n;}
function dropAll(p,re,att){var n=0,sgn=p.side?1:-1;p.ps.forEach(function(q,i){if(q.st==='on'&&re.test(q.id)){var a=rand()*PI*2;if(knock(p,i,Math.cos(a),Math.sin(a),'collapse',(.12+rand()*.22)*U()))n++;}});return n;}
/* what gives way in a piece right now, if anything: '' (it stands), 'wall-all', 'wall-planks', 'gate', 'keep' (the tower comes down) or 'roof'. settle() acts on it, and the Lab asks it
   about each part in turn ("would this part alone bring it down?"), so the Lab shows the real rule. */
function holdFail(p){
  if(p.kind==='wall'){if(onCount(p,/post/)===0&&!props(p).length)return 'wall-all';if(onCount(p,/rail/)===0)return 'wall-planks';return '';}
  if(p.kind==='gate')return onCount(p,/gate\.post/)<2?'gate':'';
  if(p.kind==='tower'){var legs=[];p.ps.forEach(function(q){if(q.st==='on'&&/^tower\.post/.test(q.id))legs.push(q.id.split('.')[2]);});var stands=legs.length>=3;
    if(legs.length===2){var gone=['NE','NW','SE','SW'].filter(function(c){return legs.indexOf(c)<0;}),shared=gone[0].charAt(0)===gone[1].charAt(0)?gone[0].charAt(0):(gone[0].charAt(1)===gone[1].charAt(1)?gone[0].charAt(1):'');
      stands=(shared?isOn(p,'tower.brace.'+shared):onCount(p,/tower\.brace/)>=2)||props(p).length>0;}   /* two legs: a brace across the open side holds it; opposite corners need two braces */
    if(!stands)return 'keep';
    if(!isOn(p,'tower.floor')||onCount(p,/tower\.rail/)===0)return 'roof';}
  return '';}
/* what still holds a piece up. When the support is gone the parts that hung on it fall together. */
function settle(p,att){
  if(!V2()||!p.built||p.down)return 0;var fell=0,f=holdFail(p);
  if(f==='wall-all')fell=dropAll(p,/./,att);else if(f==='wall-planks')fell=dropAll(p,/plank/,att);else if(f==='gate')fell=dropAll(p,/lintel|door|brace/,att);
  else if(f==='keep'){keepDown(p,att);return 99;}else if(f==='roof')fell=dropAll(p,/roof/,att);
  if(fell>=2)collapse(p,att,fell);return fell;}
function collapse(p,att,n){var st=SG.stats;if(SG.mode==='lab')labNote('collapse',p);st.collapses++;if(att!==p.side)SG.sides[att].collapses++;SG.slowT=C2.slowMo;SG.shake=1;snd('crash');event('collapse',p.side,p.kind);pop(p.x,p.z,'CRASH!',false,TALL[p.kind]+.25);viewPuff(p.x,p.z,2.2);
  var f=FOOT[p.kind];SG.mice.forEach(function(m){if(boxDist(p,m.x,m.z)<C2.collapseReach*U())dizzy(m);});gridDirty=true;}
/* the Keep comes down: that side has lost. It falls slowly, then the win card. */
function keepDown(p,att){p.down=true;p.fallT=SG.clock;p.fallDir=Math.atan2(p.x-hillAt().x,p.z-hillAt().z)+(rand()-.5)*.8;p.ps.forEach(function(q){q.st='gone';q.mender=-1;});p.parts=0;SG.stats.keepDown=true;SG.stats.keepBy=SG.cause||'';SG.stats.keepAt=SG.clock;SG.stats.collapses++;if(att!==p.side)SG.sides[att].collapses++;
  SG.slowT=C2.slowMo*2;SG.shake=1.6;snd('crash');event('keep',p.side);pop(p.x,p.z,'CRASH!',false,TALL.tower+.3);viewPuff(p.x,p.z,3);SG.mice.forEach(function(m){if(boxDist(p,m.x,m.z)<C2.collapseReach*2*U())dizzy(m);});
  SG.mice.forEach(function(m){dropJob(m);});gridDirty=true;if(SG.mode==='lab'){labNote('keep',p);shout(NAME[SG.sides[p.side].team]+"'s Keep is down!");return;}   /* in the Lab nothing ends: the Keep just falls, and Reset or Heal puts it back */
  SG.fallWinner=1-p.side;SG.phase='fall';SG.time=C2.keepFall;SG.sides[0].aim.on=SG.sides[1].aim.on=false;shout(NAME[SG.sides[p.side].team]+"'s Keep is down!");ui();}
/* a marble, a Big Marble or a cork comes down */
function landV2(a,pos,hit){var A=AMMO[a.ammo]||AMMO.marble;
  /* a bouncing ball that touches down with nothing in the way hops on: the same ball, a new flight */
  if(A.bounce&&a.next&&!hit){var nx=a.next;a.x0=nx.x0;a.y0=nx.y0;a.z0=nx.z0;a.x1=nx.x1;a.z1=nx.z1;a.h=nx.h;a.T=nx.T;a.t=0;a.leg=2;a.next=null;SG.stats.bounces++;snd('tap');viewPuff(pos[0],pos[2],.7);return;}
  var n=0,R=labProto('blastR',ammoR(a.ammo,a.high),a),knocked=0;
  if(A.land)n=A.land(a,pos,hit)||0;
  else{knocked=blastAt(pos[0],pos[1],pos[2],R,a.side,a.ammo==='big',a.x1-a.x0,a.z1-a.z0,a.from,false,hit?hit.id:0,a.ammo);if(hit&&hit.side===a.side)SG.stats.ownHits++;
    SG.mice.forEach(function(m){if(m.side!==a.side&&dist(m.x,m.z,pos[0],pos[2])<R&&dizzy(m))n++;});if(knocked>=3||a.ammo==='big')SG.shake=Math.max(SG.shake,.6);}
  if(SG.mode==='lab')labNote('land',a,pos,R,hit);
  snd('thud');a.live=false;a.T=a.t;a.hx=pos[0];a.hy=pos[1];a.hz=pos[2];if(a.ammo!=='corks'||!SG.lastHit||SG.lastHit.id!==a.id)SG.lastHit={id:a.id,side:a.side,ammo:a.ammo,x:pos[0],y:pos[1],z:pos[2],piece:hit?hit.id:0,own:!!hit&&hit.side===a.side,part:'',knocked:knocked,dizzied:n,t:SG.clock};viewPuff(pos[0],pos[2],a.ammo==='big'?2:1.2);}
/* corks make mice they land near dizzy; nothing breaks */
AMMO.corks.land=function(a,pos){var n=0;SG.mice.forEach(function(m){if(m.side!==a.side&&dist(m.x,m.z,pos[0],pos[2])<C2.corkHit*U()&&dizzy(m))n++;});return n;};
/* glue: no damage. It sticks to the part it hits and to every fallen part of theirs in the splash (none of those can be mended for a while), and mice that walk through the puddle are slowed. */
AMMO.glue.land=function(a,pos,hit){var G=C2.glue,R=G.reach*U(),en=1-a.side,n=0;
  if(hit&&hit.total&&hit.side!==a.side){var hi=nearestPart(hit,pos[0],pos[1],pos[2],false);if(hi>=0){hit.ps[hi].glue=SG.clock+G.lock;n++;}}
  SG.pieces.forEach(function(p){if(p.side!==en||!p.built||!p.total)return;p.ps.forEach(function(q,i){if(q.st!=='off'||q.used||dist(q.rx,q.rz,pos[0],pos[2])>=R)return;q.glue=SG.clock+G.lock;n++;
    if(q.mender>=0)SG.mice.forEach(function(m){if(m.job===p.id&&m.part===i&&m.state==='toPart'){dropJob(m);m.state='idle';m.goal=false;}});});});
  SG.stats.glued+=n;SG.puddles.push({x:pos[0],z:pos[2],r:R,side:a.side,t0:SG.clock,life:G.puddle});SG.mice.forEach(function(m){if(m.side===en&&dist(m.x,m.z,pos[0],pos[2])<R)m.slowT=G.slow;});if(hit)pop(pos[0],pos[2],'Glued!',false,.3);return 0;};
function tickPuddles(dt){for(var i=SG.puddles.length-1;i>=0;i--){var pd=SG.puddles[i];if(SG.clock-pd.t0>pd.life){SG.puddles.splice(i,1);continue;}SG.mice.forEach(function(m){if(m.side!==pd.side&&dist(m.x,m.z,pd.x,pd.z)<pd.r&&!(m.slowT>C2.glue.slow-.3))m.slowT=C2.glue.slow;});}}
/* thrown parts land: they thump mice, and a part thrown hard knocks off an attached part it lands on */
function tickDebris(){for(var i=SG.debris.length-1;i>=0;i--){var d=SG.debris[i];if(SG.clock<d.t)continue;SG.debris.splice(i,1);
    SG.mice.forEach(function(m){if(dist(m.x,m.z,d.x,d.z)<C2.fallReach*U())dizzy(m);});
    if(d.far>=C2.chainThrow*U()&&SG.phase==='fight'){var best=null,bi=-1,bd=C2.chainReach*U();SG.pieces.forEach(function(p){if(!p.built||p.down||!p.total||p.id===d.pid||boxDist(p,d.x,d.z)>bd)return;p.ps.forEach(function(q,qi){if(q.st!=='on'||/^tower\.post/.test(q.id))return;var dd=dist(q.wx,q.wz,d.x,d.z);if(dd<bd){bd=dd;best=p;bi=qi;}});});
      if(best){SG.stats.chain++;SG.cause='debris';knock(best,bi,best.ps[bi].wx-d.x,best.ps[bi].wz-d.z,'debris',.15*U());settle(best,SG.att);}}}}
/* score: damage standing on the other camp, collapses caused, and a smaller share from the hill */
function partWorth(p){return p.total?(C2.piecePts[p.kind]||1)/p.total:0;}
function standingDamage(s){var n=0;SG.pieces.forEach(function(p){if(p.side!==s||!p.built)return;var w=partWorth(p);p.ps.forEach(function(q){if(q.st!=='on')n+=w;});});return n;}
function v2Score(s,final){var side=SG.sides[s];return Math.round((side.bank+side.hill+side.collapses*C2.collapsePts+(final?0:standingDamage(1-s)))*10)/10;}
function bankRound(){for(var s=0;s<2;s++)SG.sides[s].bank+=standingDamage(1-s);}
function scoreV2(dt){
  var n=SG.onHill(),h=n[0]>n[1]?0:(n[1]>n[0]?1:-1),s;
  if(h>=0&&h!==SG.lastHolder){if(SG.cand!==h){SG.cand=h;SG.candT=0;}SG.candT+=dt;if(SG.candT>=CONFIG.holdSecs){if(SG.lastHolder!=null)SG.stats.hillFlips++;snd('hill');event('hill',h);shout(NAME[SG.sides[h].team]+' holds the hill!');SG.lastHolder=h;}}else if(h===SG.lastHolder){SG.cand=-1;}
  SG.holder=h;SG.stats.bySide[0].hillSecs+=n[0]*dt;SG.stats.bySide[1].hillSecs+=n[1]*dt;
  if(h>=0){var side=SG.sides[h];side.hill+=C2.hillPts*Math.abs(n[0]-n[1])*dt;side.holdT+=dt;   /* the hill feeds the lobber: a Big Marble for every full 10 seconds held */
    if(side.holdT>=C2.hillSecs){side.holdT-=C2.hillSecs;if(side.big<C2.bigMax){side.big++;event('big',h);pop(hillAt().x,hillAt().z,'Big Marble for '+NAME[side.team]+'!',true,.9,h);snd('mend');}}}
  for(s=0;s<2;s++)SG.sides[s].score=v2Score(s,false);return false;}
/* ---- the four orders. The mice that are not at the lobber are split between them. ---- */
var ORDERS=['hill','raid','guard','mend'];
function fieldCount(s){return 5-lobbersOf(s).length;}
/* give an order n mice; the hill gives way first, then the largest; any left over hold the hill */
SG.setPlan=function(s,order,n){var side=SG.sides[s],pl=side.plan,tot=fieldCount(s),i;if(!side||ORDERS.indexOf(order)<0)return false;n=Math.max(0,Math.min(tot,n|0));pl[order]=n;
  function sum(){return pl.hill+pl.raid+pl.guard+pl.mend;}
  while(sum()>tot){var big='',bn=0;if(order!=='hill'&&pl.hill>0)big='hill';else ORDERS.forEach(function(o){if(o!==order&&pl[o]>bn){bn=pl[o];big=o;}});if(!big)break;pl[big]--;}   /* the hill gives its mice up first */
  if(sum()<tot){if(order!=='hill')pl.hill+=tot-sum();else{var o2=pl.raid>=pl.mend?'raid':'mend';pl[o2]+=tot-sum();}}
  if(side.human)say('plan',({hill:'Hold the hill',raid:'Raid their walls',guard:'Guard the Keep',mend:'Mend'})[order]+': '+pl[order],false,s);ui();return true;};
SG.bumpPlan=function(s,order){var pl=SG.sides[s].plan;return SG.setPlan(s,order,pl[order]>=fieldCount(s)?0:pl[order]+1);};
SG.setAmmo=function(s,a){var side=SG.sides[s];if(!side||!AMMO[a])return false;side.ammo=a;ui();return true;};
function roles(s){var side=SG.sides[s],pl=side.plan,list=[],o;ORDERS.slice().reverse().forEach(function(k){for(var i=0;i<pl[k];i++)list.push(k);});   /* mend, guard, raid, then hill */
  var k=0;SG.mice.forEach(function(m){if(m.side!==s)return;if(crewOf(m)){m.role='crew';return;}m.role=list[k++]||'hill';});}
function raidTarget(m){var en=1-m.side,best=null,bd=1e9;SG.pieces.forEach(function(p){if(p.side!==en||!p.built||p.down||!p.total||p.parts<=0)return;var d=dist(m.x,m.z,p.x,p.z)+(p.kind==='wall'||p.kind==='gate'?0:(p.kind==='tower'?6:3));   /* walls and gates first, the Keep last */
    if(p.kind==='tower'&&!raidPart(p,m,true))return;if(d<bd){bd=d;best=p;}});return best;}
/* the part a raider can pull: the nearest attached one; a tower leg only once its braces are gone */
function raidPart(p,m,any){var best=-1,bd=1e9;p.ps.forEach(function(q,i){if(q.st!=='on')return;if(/^tower\.post/.test(q.id)&&legBraced(p,q.id))return;if(/roof|floor|rail/.test(q.id)&&p.kind==='tower')return;var d=dist(q.wx,q.wz,m.x,m.z);if(d<bd){bd=d;best=i;}});return any?best>=0:best;}
function freeV2(m,dt){
  if(SG.mode==='lab'&&(m.role||'hill')!=='crew'){labMouse(m,dt);return;}   /* in the Lab mice stand at home until they are hit or put to work */
  var side=SG.sides[m.side],en=1-m.side,role=m.role||'hill',tx=m.hx,tz=m.hz,slack=.3,p,i;
  if(SG.phase==='mend')role=role==='crew'?'crew':'mend';
  if(role==='crew'&&!crewOf(m))role='hill';
  if(role==='crew'){var cw=crewSpot(crewOf(m));tx=cw[0];tz=cw[1];slack=.4;}
  else if(role==='mend'){if(SG.phase!=='count'){var done=false;for(var pi=0;pi<SG.pieces.length&&!done;pi++){p=SG.pieces[pi];if(p.side!==m.side||!p.built)continue;var ml=mendable(p);if(ml.length){assignMend(m,p,ml[0]);done=true;}}if(done)return;}
    var tr=null;SG.pieces.forEach(function(q){if(!tr&&q.kind==='trap'&&q.side===m.side&&q.sprung&&q.parts>0)tr=q;});
    if(tr&&SG.phase!=='count'){tx=tr.x;tz=tr.z+(m.side?-.2:.2)*U();slack=.5;if(dist(m.x,m.z,tx,tz)<.3){m.rt=(m.rt||0)+dt;m.act=.3;if(m.rt>=C2.trapReset){m.rt=0;tr.sprung=false;pop(tr.x,tr.z,'trap set',true,.3,m.side);}}}
    else{var sh=side.workshop?pieceById(side.workshop):null;if(sh){var ws=workSpot(sh,m);tx=ws[0];tz=ws[1];slack=.6;}}}
  else if(role==='guard'){var kp=side.keep?pieceById(side.keep):null;if(kp){var ga=m.i/5*PI*2,gd=Math.atan2(hillAt().x-kp.x,hillAt().z-kp.z)+(m.i-2)*.7;tx=kp.x+Math.sin(gd)*C2.guardRing*U();tz=kp.z+Math.cos(gd)*C2.guardRing*U();slack=.5;}}
  else if(role==='raid'&&SG.phase==='fight'){p=raidTarget(m);if(p){tx=p.x;tz=p.z;slack=.8;m.raidId=p.id;}else m.raidId=0;}
  else{var od=side.order||(function(){var w=hillSpot(m.side,0,.25);return {x:w[0],z:w[1]};})(),a=m.i/5*PI*2+.3,rad=CONFIG.squadRing*U()*.8,off=rotV(m.side,Math.cos(a)*rad,Math.sin(a)*rad);tx=od.x+off[0];tz=od.z+off[1];slack=.35;}
  m.crewGoal=role==='crew';goTo(m,tx,tz,slack);
  if(walk(m,dt,WALK()*(side.team==='red'?C2.redWalk:1)*slowOf(m))){m.state=role==='hill'||role==='crew'||role==='guard'||role==='raid'?'hold':'idle';m.goal=false;m.crewing=role==='crew';if(role==='crew'){var lb=crewOf(m);m.rot=Math.atan2(lb.x-m.x,lb.z-m.z);}}else{m.state='go';m.goal=m.q<=0;m.crewing=false;}
  if(SG.phase!=='fight'||role==='crew')return;
  if(role==='raid'&&m.cd<=0&&m.raidId){p=pieceById(m.raidId);if(p&&!p.down&&boxDist(p,m.x,m.z)<=C2.raidReach*U()){i=raidPart(p,m,false);if(i>=0){SG.att=m.side;SG.cause='raid';knock(p,i,p.x-m.x,p.z-m.z,'raid',.2*U());settle(p,m.side);SG.stats.raidPulls++;m.cd=C2.raidEvery*(side.team==='red'?C2.redRaid:1);m.act=.7;m.rot=Math.atan2(p.x-m.x,p.z-m.z);}}}
  else if(role==='guard'&&m.cd<=0){var best=null,bd=C2.guardRange*U()*(side.team==='blue'?C2.blueGuard:1);SG.mice.forEach(function(o){if(o.side!==en||o.state==='dizzy')return;var d=dist(m.x,m.z,o.x,o.z);if(d<bd&&sightClear(m.x,m.z,o.x,o.z)){bd=d;best=o;}});
    if(best){m.cd=C2.guardEvery;m.act=.6;m.rot=Math.atan2(best.x-m.x,best.z-m.z);SG.corks.push({id:SG.nextId++,x0:m.x,z0:m.z,x1:best.x,z1:best.z,t:0});SG.stats.corks++;SG.stats.guardCorks++;if(rand()<C2.guardChance)dizzy(best);}}}
/* the aiming bot looks at what each shot would knock off: the Keep's braces, then the legs they held, a wall in the way, the other lobber. It tries the low and the high lob. */
function bestShot(s,li,avoid){var side=SG.sides[s],en=1-s,l=lobberOf(s,li),was=side.high,wasA=side.ammo,e=LEVELS[side.level].err2*U(),SP=[[1.2*e,0],[-1.2*e,0],[0,1.2*e],[0,-1.2*e],[.9*e,.9*e],[-.9*e,-.9*e]],cands=[],list=[],best=null,bv=.01;if(!l)return null;
  /* what one shot of this kind at (x,z) would be worth where it really comes down; null if one of our own pieces is in the way. A Bouncer is aimed at where it finally lands. */
  function worth(x,z,hi,kind){side.high=hi;side.ammo=kind;var a=SG.arc(s,x,z,li);if(!a)return 0;if(a.hit&&a.hit.own)return null;var px=a.hit?a.hit.x:a.fx,py=a.hit?a.hit.y:0,pz=a.hit?a.hit.z:a.fz,R=ammoR(kind,hi),t=blastAt(px,py,pz,R,s,kind==='big',0,0,l.id,true,a.hit?a.hit.piece:0,kind);
    for(var j=0;j<SG.mice.length;j++){var m=SG.mice[j];if(m.side!==s&&(m.state==='hold'||m.state==='fix')&&dist(m.x,m.z,px,pz)<R)t+=C2.aimWorth.mouse;}return kind==='bouncer'?t*C2.bouncerBias:t;}
  SG.pieces.forEach(function(p){if(p.side!==en||!p.built||p.down||!p.total||p.parts<=0)return;
    if(p.kind==='tower')p.ps.forEach(function(q){if(q.st==='on'&&(q.cls===1||q.cls===2))C2.aimTry.forEach(function(o){cands.push([q.wx,q.wz,o]);});});else cands.push([p.x,p.z,0]);});
  SG.mice.forEach(function(m){if(m.side===en&&(m.state==='hold'||m.state==='fix'))cands.push([m.x,m.z,0]);});   /* only mice standing still: a walking one has gone by the time the marble lands */
  var bounce=ammoReady(side,'bouncer');
  cands.forEach(function(c){var dx=c[0]-l.x,dz=c[1]-l.z,d=Math.sqrt(dx*dx+dz*dz)||1,x=c[0]+dx/d*c[2]*U(),z=c[1]+dz/d*c[2]*U(),v;if(avoid&&dist(x,z,avoid.x,avoid.z)<avoid.r)return;
    for(var hi=0;hi<2;hi++){v=worth(x,z,!!hi,'marble');if(v>0)list.push({x:x,z:z,high:!!hi,big:false,kind:'marble',v:v});
      if(side.big>0&&!hi){v=worth(x,z,false,'big');if(v!==null)v-=side.big>=C2.bigMax?0:C2.bigWorth;if(v>0)list.push({x:x,z:z,high:false,big:true,kind:'big',v:v});}
      if(bounce&&!hi){v=worth(x,z,false,'bouncer');if(v>0)list.push({x:x,z:z,high:false,big:false,kind:'bouncer',v:v});}}});
  /* it allows for its own wobble: the few best are tried again a little off to each side, and the best average wins */
  list.sort(function(a,b){return b.v-a.v;});
  for(var i=0;i<list.length&&i<C2.aimDeep;i++){var c=list[i],t=c.v,n=1;for(var j=0;j<SP.length;j++){var w=worth(c.x+SP[j][0],c.z+SP[j][1],c.high,c.kind);n++;if(w===null)t-=1;else t+=w-(c.big&&side.big<C2.bigMax?C2.bigWorth:0);}c.m=t/n;if(c.m>bv){bv=c.m;best=c;}}
  side.high=was;side.ammo=wasA;side.pred=best?{v:Math.round(bv*10)/10}:null;return best;}
/* where a Glue blob would stop the most mending: the spot with the most fallen parts (and mice mending them) within its splash. null if fewer than CONFIG.v2.botGlue. */
function glueTarget(s){var en=1-s,R=C2.glue.reach*U(),spots=[],best=null,bn=0;
  SG.pieces.forEach(function(p){if(p.side!==en||!p.built||p.down||!p.total)return;p.ps.forEach(function(q){if(q.st==='off'&&!q.used&&!(q.glue>SG.clock))spots.push([q.rx,q.rz]);});});
  var menders=[];SG.mice.forEach(function(m){if(m.side===en&&(m.state==='toPart'||m.state==='bring'||m.state==='fix'))menders.push([m.x,m.z]);});
  spots.forEach(function(a){var n=0,sx=0,sz=0,mn=0;spots.forEach(function(b){if(dist(a[0],a[1],b[0],b[1])<R){n++;sx+=b[0];sz+=b[1];}});menders.forEach(function(b){if(dist(a[0],a[1],b[0],b[1])<R*1.6)mn++;});if(mn>0&&n+mn>bn){bn=n+mn;best={x:sx/n,z:sz/n,n:n+mn};}});   /* only where a mender is at work */
  return best&&best.n>=C2.botGlue?best:null;}
/* ---- the v2 bot: splits its mice, and fires at what holds the other Keep up ---- */
function botV2(s,dt){
  var side=SG.sides[s],L=LEVELS[side.level],en=1-s,foe=SG.sides[en];side.planT-=dt;
  if(side.planT<=0){side.planT=C2.botRetarget;var pl={hill:C2.plan.hill,raid:C2.plan.raid,guard:C2.plan.guard,mend:C2.plan.mend},own=SG.fallen(s),base=baseOf(s),raiders=0;
    SG.mice.forEach(function(m){if(m.side===en&&m.state!=='dizzy'&&dist(m.x,m.z,base.x,base.z)<1.5*U()+.4)raiders++;});
    if(raiders>=1){pl.guard=1;pl.raid=0;}if(own===0){pl.mend=0;pl.hill++;}   /* two always hold the hill; the raider comes back to guard when the other side's raiders are in the camp */
    var tot=fieldCount(s);while(pl.hill+pl.raid+pl.guard+pl.mend>tot){if(pl.hill>1)pl.hill--;else if(pl.raid)pl.raid--;else pl.mend--;}pl.hill+=tot-(pl.hill+pl.raid+pl.guard+pl.mend);side.plan=pl;
    var w=hillSpot(s,(rand()-.5)*.3,.2+rand()*.1);side.order={x:w[0],z:w[1]};}
  var ls=lobbersOf(s);ls.forEach(function(lb){if(mendable(lb).length&&(!partOn(lb,'lobber.crank')||!partOn(lb,'lobber.bucket')))mendPick(s,lb,mendable(lb)[0],true);});
  ls.forEach(function(lb,li){lb.fireT=(lb.fireT||0)-dt;if(lb.fireT<=0)botShoot(s,li,lb);});}
/* one lobber's shot: the bot works each lobber on its own, and the second does not aim where the first has just fired */
function botShoot(s,li,lb){
  var side=SG.sides[s],L=LEVELS[side.level],en=1-s,foe=SG.sides[en],was=side.ammo;side.ammo='marble';if(SG.lobberBlock(s,li)){side.ammo=was;return;}
  var keep=foe.keep?pieceById(foe.keep):null,tx=0,tz=0,ammo='marble',eb=baseOf(en),foes=SG.mice.filter(function(m){return m.side===en&&m.state!=='dizzy';}),avoid=side.lastShot&&SG.clock-side.lastShot.t<2.4&&side.lastShot.li!==li?{x:side.lastShot.x,z:side.lastShot.z,r:C2.blast*U()*1.6}:null;
  if(side.aimMode==='random'){var ra=rand()*PI*2,rr=Math.sqrt(rand())*C2.randomAim;tx=eb.x+Math.cos(ra)*rr;tz=eb.z+Math.sin(ra)*rr;ammo=side.big>0?'big':'marble';side.high=false;}   /* anywhere in the other camp's ground */
  else{ /* an aimer: glue on a camp that is mending, corks at a crowd, else the best shot (a Big Marble, a Bouncer or a marble) */
    var crowd=null,cn=1,gt=ammoReady(side,'glue')&&!(avoid&&side.lastShot.ammo==='glue')?glueTarget(s):null;foes.forEach(function(m){var n=0;foes.forEach(function(o){if(dist(m.x,m.z,o.x,o.z)<C2.corkSpread*U())n++;});if(n>cn){cn=n;crowd=m;}});
    if(gt){tx=gt.x;tz=gt.z;ammo='glue';side.high=false;}
    else if(crowd&&ammoReady(side,'corks')&&cn>=3&&rand()<.7){tx=crowd.x;tz=crowd.z;ammo='corks';}
    else{var pk=bestShot(s,li,avoid);if(!pk)pk={x:keep&&!keep.down?keep.x:eb.x,z:keep&&!keep.down?keep.z:eb.z,high:false,big:false,kind:'marble'};tx=pk.x;tz=pk.z;side.high=pk.high;ammo=pk.kind||(pk.big?'big':'marble');}
    tx+=gauss()*L.err2*U();tz+=gauss()*L.err2*U();}
  side.ammo=ammo;if(SG.lobberBlock(s,li)){side.ammo='marble';if(SG.lobberBlock(s,li))return;}
  var a=SG.arc(s,tx,tz,li);if(a&&a.hit&&a.hit.own){SG.stats.bySide[s].blocked++;lb.fireT=.5;side.ammo='marble';return;}
  var am=side.ammo;if(SG.fire(s,tx,tz,li)){lb.fireT=Math.max(C2.reload,L.fire*.3)*(.9+rand()*.3);side.lastShot={x:tx,z:tz,t:SG.clock,li:li,ammo:am};}}

/* --- the bot --- */
function botFight(s,dt){
  var side=SG.sides[s],L=LEVELS[side.level],en=1-s,w;side.sendT-=dt;side.fireT-=dt;
  if(side.sendT<=0){w=hillSpot(s,(rand()-.5)*.4,.2+rand()*.15);side.order={x:w[0],z:w[1]};side.sendT=10+rand()*6;side.raid=null;
    if(side.team==='red'&&side.score>=SG.sides[en].score+L.raidLead){var best=null,bd=1e9;SG.pieces.forEach(function(p){if(p.side!==en||!p.built||!p.total||p.parts<=0||(p.kind!=='wall'&&p.kind!=='gate'))return;var d=hillDist(p.x,p.z);if(d<bd){bd=d;best=p;}});
      if(best){var hh=hillAt(),d0=hillDist(best.x,best.z)||1,k=(d0-FOOT[best.kind][1]-.3)/d0;side.raid={x:hh.x+(best.x-hh.x)*k,z:hh.z+(best.z-hh.z)*k};}}}
  if(SG.fallen(s)>=CONFIG.botMendAt)autoMend(s,1);
  var lb=lobberOf(s);if(lb&&mendable(lb).length&&(!partOn(lb,'lobber.crank')||!partOn(lb,'lobber.bucket')))mendPick(s,lb,mendable(lb)[0],true);
  if(side.fireT<=0&&!SG.lobberBlock(s)){var foes=SG.mice.filter(function(m){return m.side===en&&m.state!=='dizzy';}),ws=SG.pieces.filter(function(p){return p.side===en&&p.built&&p.total&&p.parts>0;});
    for(var tr=0;tr<4;tr++){var tx=0,tz=0,found=false;
      if(rand()>=CONFIG.wallShots&&foes.length){var bestN=-1;foes.forEach(function(m){var n=0;foes.forEach(function(o){if(dist(m.x,m.z,o.x,o.z)<.6)n++;});if(n>bestN){bestN=n;tx=m.x;tz=m.z;}});found=true;}
      else if(ws.length){var p=ws[Math.floor(rand()*ws.length)];tx=p.x;tz=p.z;found=true;}
      if(!found)continue;tx+=gauss()*L.err;tz+=gauss()*L.err;var a=SG.arc(s,tx,tz);if(a&&a.hit&&a.hit.own){SG.stats.bySide[s].blocked++;continue;}   /* never through its own camp on purpose */
      SG.fire(s,tx,tz);side.fireT=L.fire*(.8+rand()*.4);break;}}}

function tickFight(dt){
  if(SG.mode==='lab'){tickLab(dt);return;}
  SG.stats.fightTime+=dt;SG.time-=dt;
  for(var s=0;s<2;s++){var side=SG.sides[s];lobbersOf(s).forEach(function(l,li){if((l.reload||0)>0&&crewReady(s,li))l.reload=Math.max(0,l.reload-dt);});for(var ck in side.cd)if(side.cd[ck]>0)side.cd[ck]=Math.max(0,side.cd[ck]-dt);if(side.bot){if(V2())botV2(s,dt);else botFight(s,dt);}}
  tickMarbles(dt);if(V2()){tickDebris();tickPuddles(dt);if(SG.phase!=='fight')return;trapsTick();}tickMice(dt);stuckCheck(dt);if(V2()?scoreV2(dt):scoreTick(dt))return;
  if(SG.time<=0){
    if(V2())bankRound();
    if(SG.round<CONFIG.rounds){SG.phase='mend';SG.time=CONFIG.brk;SG.sides[0].aim.on=SG.sides[1].aim.on=false;shout('Mend break');ui();}
    else{var a=V2()?v2Score(0,true):SG.sides[0].score,b=V2()?v2Score(1,true):SG.sides[1].score,w;if(a!==b)w=a>b?0:1;else{var n=SG.onHill();w=n[0]!==n[1]?(n[0]>n[1]?0:1):(SG.lastHolder!=null?SG.lastHolder:0);}endMatch(w);}}}
function tickMend(dt){SG.time-=dt;if(V2()){tickDebris();tickPuddles(dt);}autoMend(0,5);autoMend(1,5);tickMarbles(dt);tickMice(dt);stuckCheck(dt);if(SG.time<=0)startRound(SG.round+1);}

function tick(dt){
  SG.clock+=dt;SG.sides.forEach(function(sd){if(sd.msg.t>0)sd.msg.t-=dt;});if(SG.callout.t>0)SG.callout.t-=dt;viewTick(dt);fixGrid();
  for(var i=SG.pops.length-1;i>=0;i--){SG.pops[i].t+=dt;if(SG.pops[i].t>1.3)SG.pops.splice(i,1);}
  if(SG.phase==='build')tickBuild(dt);
  else if(SG.phase==='ready'){SG.time-=dt;if(SG.time<=0){SG.time=0;if(SG.sides[0].bot)startRound(1);}}
  else if(SG.phase==='count'){var c0=Math.ceil(SG.time);SG.time-=dt;if(Math.ceil(SG.time)<c0&&SG.time>0)snd('beep');tickMarbles(dt);tickMice(dt);if(SG.time<=0){snd('go');SG.phase='fight';SG.time=CONFIG.round;shout('Round '+SG.round+' of '+CONFIG.rounds+'. Hold the hill!');ui();}}
  else if(SG.phase==='fight')tickFight(dt);
  else if(SG.phase==='fall'){SG.time-=dt;tickDebris();if(SG.time<=0)endMatch(SG.fallWinner);}
  else if(SG.phase==='mend')tickMend(dt);
  fixGrid();}
SG.step=function(dt){SG.acc+=dt;var n=0;while(SG.acc>=STEP-1e-9){tick(STEP);SG.acc-=STEP;n++;}return n;};
/* true if a mouse stands inside a wall or gate that still blocks it (used by the tests) */
SG.inWall=function(){var bad=0;SG.mice.forEach(function(m){SG.pieces.forEach(function(p){if((p.kind!=='wall'&&p.kind!=='gate')||!p.built||!blocks(p))return;if(solidAt(p,m.side,m.x,m.z,0))bad++;});});return bad;};
SG.debug={knock:function(pieceId,partId){var p=pieceById(pieceId);if(!p)return false;for(var i=0;i<p.ps.length;i++)if(p.ps[i].id===partId){var r=knock(p,i,p.side?1:-1,p.side?-1:1,'debug');if(V2())settle(p,1-p.side);fixGrid();return r;}return false;},
  blast:function(x,y,z,R,att,big,hitId,kind){var n=blastAt(x,y,z,R,att,!!big,0,att?1:-1,0,false,hitId||0,kind);fixGrid();return n;},v2Score:function(s,f){return v2Score(s,f);},roles:function(){roles(0);roles(1);return SG.mice.map(function(m){return m.role;});},
  dizzy:function(s,i){var m=SG.mice[s*5+i];return m?dizzy(m):false;},matLook:function(){var o={cloth:0,outline:0};V.matG.forEach(function(g){g.children.forEach(function(m){if(m.visible){if(m.userData.ar)o.outline++;else o.cloth++;}});});return o;},piece:pieceById,layoutSpot:function(s,i){return layoutSpot(s,SG.sides[s].layout,i);},blocks:function(id){return blocks(pieceById(id));},crewSpot:function(s){var l=lobberOf(s);return l?crewSpot(l):null;},crewReady:crewReady,isOpen:isOpen,landScale:function(s){return GH[s]&&GH[s].land?GH[s].land.scale.x:0;},lring:function(s){return GH[s]&&GH[s].lring?GH[s].lring.map(function(r){return r.visible;}):[];},arc2:function(s){return !!(GH[s]&&GH[s].arc2&&GH[s].arc2.visible);}};

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
  crash:function(){noise(.35,.6,0,260);tone(90,.45,'sawtooth',.3,0,35);noise(.2,.4,.12,900);},                    /* a collapse */
  win:function(){[523,659,784,1047,784,1047].forEach(function(f,i){tone(f,i===5?.6:.16,'triangle',.24,i*.15);});}
};
function snd(name){if(!AC||SG.muted||SG.hold||(SG.speed||1)>4)return;var t=AC.currentTime;if(lastSnd[name]&&t-lastSnd[name]<.05)return;lastSnd[name]=t;try{SOUNDS[name]();}catch(e){}}
SG.setMute=function(v){SG.muted=!!v;try{window.localStorage.setItem('rtk-mute',SG.muted?'1':'0');}catch(e){}if(master)master.gain.value=SG.muted?0:.5;if(hasDom&&E('bMute'))E('bMute').textContent=SG.muted?'🔇':'🔊';};
SG.audio=function(){return {started:!!AC,muted:SG.muted};};

/* ================= drawing ================= */
var R,S,SCN,ROOMG,SUN,arCam,C,W,H,world,hill,GH=[{obj:null,kind:''},{obj:null,kind:''}],GM,camNow=null,hasDom=typeof document!=='undefined';
function E(id){return document.getElementById(id);}
function viewClear(){if(!V.on)return;if(V.lab)labViewHide();while(world.children.length)world.remove(world.children[0]);V.pieces={};V.mice=[];V.slots=[[],[]];V.marbles={};V.corks={};V.puffs=[];V.flashes=[];V.rings=[];GH.forEach(function(g){if(g.obj){S.remove(g.obj);g.obj=null;g.kind='';}});
  var pl=E('pops');if(pl)pl.innerHTML='';V.popEls={};}
function viewStart(){if(!V.on)return;
  SG.sides.forEach(function(side,s){side.kit.forEach(function(k,i){var o=SS.piece(k.kind,side.team);o.scale.setScalar(MAT.scale);o.position.set(k.x,.012,k.z);o.rotation.y=k.a+phiOf(s);world.add(o);V.slots[s].push(o);});});
  var furs=['tan','grey','cream','brown','tan'];SG.mice.forEach(function(m){var team=SG.sides[m.side].team,o=SS.mouse(team,{fur:furs[(m.i+m.side)%5]});
    var rg=new THREE.Mesh(V.ringGeo,V.ringMat[team]);rg.rotation.x=-PI/2;rg.position.y=.009;o.add(rg);var ms=U()*(SG.mode==='table'?1.3:1);o.scale.setScalar(ms);rg.scale.setScalar(Math.max(1,.8/ms));o.userData.parts.stars.scale.setScalar(1.9*Math.max(1,.75/ms));if(SG.mode==='table')o.userData.parts.head.scale.setScalar(1.15);world.add(o);V.mice.push(o);});   /* the team ring and the dizzy stars keep a readable size when the mice are small */
  hill.scale.setScalar(U());hill.visible=SG.mode!=='lab';   /* the Lab has no hill */
  V.mats[0].material.color.set(SG.sides[0].team==='red'?0x93381f:0x2a55a8);V.mats[1].material.color.set(SG.sides[1].team==='red'?0x93381f:0x2a55a8);
  hill.userData.sA.set(SS.PAL.red.main);hill.userData.sB.set(SS.PAL.blue.main);SS.setHill(hill,.5);
  var hl=hillAt(),md=SG.layout.mound;hill.position.set(hl.x,0,hl.z);V.costs=[];V.mound.visible=!!md;if(md){V.mound.position.set(md.x,0,md.z);V.mound.scale.set(md.r/.36,1,md.r/.36);}
  for(var s=0;s<2;s++){var o=w2(s,0,0),tidy=dist(o[0],o[1],0,0)<.3;V.matG[s].position.set(o[0],0,o[1]);V.matG[s].rotation.y=phiOf(s);V.matG[s].visible=tidy&&SG.mode!=='lab';GH[s].zoneG.position.set(o[0],0,o[1]);GH[s].zoneG.rotation.y=phiOf(s);GH[s].zoneG.visible=!SG.layout.custom;GH[s].disc.position.set(baseOf(s).x,.005,baseOf(s).z);
    V.pads[s].forEach(function(pd,i){var k=SG.sides[s].kit[i];pd.visible=!tidy&&!!k;if(k)pd.position.set(k.x,.006,k.z);});}}
function ghostOf(kind,team,m){var g=SS.piece(kind,team);g.scale.setScalar(PS);g.traverse(function(o){if(o.isMesh){o.material=m;o.castShadow=false;o.receiveShadow=false;}});return g;}
function tint(g,m){g.traverse(function(o){if(o.isMesh)o.material=m;});}
function viewSite(p){if(!V.on)return;var gh=ghostOf(p.kind,SG.sides[p.side].team,GM.site);gh.position.set(p.x,0,p.z);gh.rotation.y=p.rot;world.add(gh);V.pieces[p.id]={ghost:gh,obj:null,order:[]};}
function viewDrop(p){var v=V.pieces[p.id];if(!v)return;if(v.ghost)world.remove(v.ghost);if(v.obj)world.remove(v.obj);if(v.cap)world.remove(v.cap);delete V.pieces[p.id];}
function rank(name,y){return (/post/.test(name)?0:(/brace|floor|pole|bench/.test(name)?1:(/plank|door|wall/.test(name)?2:(/roof|flap|ridge|chimney/.test(name)?4:3))))*10+y;}
/* makes the real model of a piece; returns its parts in building order with world positions */
function viewObj(p){
  var team=SG.sides[p.side].team,o=SS.piece(p.kind,team,{solid:false,variant:p.vari!=null?p.vari:p.id%3}),parts=SS.parts(o),c=Math.cos(p.rot),s=Math.sin(p.rot),out=[];
  parts.forEach(function(m){var h=m.userData.home;out.push({id:m.userData.partId,x:p.x+(h[0]*c+h[2]*s)*PS,y:h[1]*PS,z:p.z+(-h[0]*s+h[2]*c)*PS,rank:rank(m.userData.partId,h[1])});});
  if(V.on){var v=V.pieces[p.id]||(V.pieces[p.id]={ghost:null,obj:null,order:[]});if(v.ghost){world.remove(v.ghost);v.ghost=null;}
    o.scale.setScalar(PS);o.position.set(p.x,0,p.z);o.rotation.y=p.rot;world.add(o);v.obj=o;
    if(V2()&&p.kind==='tower'){var kf=SS.piece('flag',team);kf.scale.setScalar(.55);kf.position.set(0,1.2,0);o.add(kf);v.flag=kf;}   /* the Keep carries the team flag */
    if(SG.mode==='table'&&(p.kind==='wall'||p.kind==='gate')){ /* seen from above a wall is a thin line, so it gets a team-colour cap along its top */
      var cap=new THREE.Mesh(new THREE.BoxGeometry(FOOT[p.kind][0]*2,.02,.1),V.capMat[team]);cap.position.set(p.x,TALL[p.kind]+.05,p.z);cap.rotation.y=p.rot;cap.visible=false;world.add(cap);v.cap=cap;}v.parts=parts;v.order=parts.map(function(m,i){return i;}).sort(function(a,b){return out[a].rank-out[b].rank;});v.shown=-1;v.solid=false;v.pst=[];}
  return out;}
function viewPuff(x,z,sc){if(!V.on)return;var d=SS.fx.dust();d.position.set(x,0,z);d.userData.sc=sc||1;world.add(d);V.puffs.push({o:d,t:0});}
function viewFlash(x,y,z){if(!V.on)return;var f=new THREE.Mesh(V.flashGeo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthWrite:false}));f.position.set(x,y,z);world.add(f);V.flashes.push({o:f,t:0});}
function viewTick(dt){if(!V.on)return;var q;for(q=V.puffs.length-1;q>=0;q--){var pf=V.puffs[q];pf.t+=dt/.7;SS.fx.dustStep(pf.o,pf.t);pf.o.scale.multiplyScalar(pf.o.userData.sc);if(pf.t>=1){world.remove(pf.o);V.puffs.splice(q,1);}}
  for(q=V.flashes.length-1;q>=0;q--){var fl=V.flashes[q];fl.t+=dt/.28;fl.o.scale.setScalar(.6+fl.t*2.2);fl.o.material.opacity=.9*(1-fl.t);if(fl.t>=1){world.remove(fl.o);V.flashes.splice(q,1);}}}
var _qa=typeof THREE!=='undefined'?new THREE.Quaternion():null,_qb=_qa?new THREE.Quaternion():null,_ax=_qa?new THREE.Vector3():null,_up=_qa?new THREE.Vector3(0,1,0):null;
var POSE={idle:'idle',wander:'walk',toMat:'walk',carry:'carry',hammer:'hammer',cheer:'cheer',go:'walk',hold:'idle',dizzy:'dizzy',toPart:'walk',bring:'carry',fix:'hammer'},_v=null;
function syncPieces(){
  var nr=0;
  SG.pieces.forEach(function(p){var v=V.pieces[p.id];if(!v||!v.obj)return;var n=p.ps.length,i;if(v.cap)v.cap.visible=p.built&&blocks(p);if(v.flag)SS.wave(v.flag,SG.clock);
    if(p.kind==='trap'&&v.obj.userData.flap){var fl=v.obj.userData.flap,up=p.sprung?Math.min(1,(SG.clock-p.sprungT)/.15):0;fl.rotation.x=-up*1.1;fl.position.y=.09+up*.12;}
    if(p.down){ /* the Keep tips over slowly, all in one piece */
      var fu=Math.min(1,(SG.clock-p.fallT)/(C2.keepFall*.8)),fa=fu*fu*1.48+(fu>=1?0:Math.sin(fu*30)*.01);_qa.setFromAxisAngle(_ax.set(Math.cos(p.fallDir),0,-Math.sin(p.fallDir)),fa);_qb.setFromAxisAngle(_up,p.rot);v.obj.quaternion.copy(_qa).multiply(_qb);return;}
    if(p.kind==='lobber'&&p.built){var side=SG.sides[p.side],since=SG.clock-p.fired,live=SG.phase==='fight'||SG.phase==='mend'||SG.phase==='count';v.obj.rotation.y=p.aim==null?p.rot:p.aim;
      SS.lobberPose(v.obj,live?((p.reload||0)>0?Math.max(0,1-p.reload/(CONFIG.reload-.5)):1):0,since<.9?since/.9:0);
      var mb=v.obj.userData.loaded;if(!mb){mb=v.obj.userData.loaded=SS.fx.marble(side.team);v.obj.getObjectByName('socket_fire').add(mb);mb.position.z=-.03;}mb.visible=live&&(p.reload||0)<=0;}
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
        if(u>=1&&!q.used){var rg=V.rings[nr];if(!rg){rg=V.rings[nr]=new THREE.Mesh(V.fallGeo,V.fallMat);rg.rotation.x=-PI/2;S.add(rg);}rg.visible=true;rg.material=q.glue>SG.clock?V.glueMat:V.fallMat;rg.position.set(q.rx,.012,q.rz);rg.scale.setScalar(1+.1*Math.sin(SG.clock*5+i));nr++;}}}
  });
  for(var r=nr;r<V.rings.length;r++)V.rings[r].visible=false;}
function syncPops(){var pl=E('pops');if(!pl)return;var seen={},table=SG.mode==='table';V.popEls=V.popEls||{};
  function show(id,cls,text,x,z,y,side,op){seen[id]=1;var el=V.popEls[id];if(!el){el=V.popEls[id]=document.createElement('div');el.className=cls;el.textContent=text;pl.appendChild(el);}
    var q=SG.screen(x,z,y);el.style.left=q.x+'px';el.style.top=q.y+'px';el.style.opacity=op;var eg=table&&side===1?(SG.sides[1].edge||'top'):'';el.style.transform=eg==='top'?'translate(-50%,0) rotate(180deg)':(eg==='left'?'translate(0,-50%) rotate(90deg)':(eg==='right'?'translate(-100%,-50%) rotate(-90deg)':'translate(-50%,-100%)'));}
  SG.pops.forEach(function(q){show(q.id,'pop'+(q.good?' good':'')+(q.text==='?'?' ask':'')+(q.text==='CRASH!'?' crash':''),q.text,q.x,q.z,q.y+q.t*.35,q.side,q.t>.9?Math.max(0,1-(q.t-.9)/.4):1);});
  if(SG.mode==='lab'&&SG.lab){var lw0=w2(0,0,2.98),lw1=w2(1,0,2.98);show('lab0','pop lobtag sel','My camp',lw0[0],lw0[1],.05,0,1);show('lab1','pop lobtag','Target camp',lw1[0],lw1[1],.05,1,1);}
  /* what each piece on your mat costs, while you build */
  if(V2()&&SG.phase==='build')SG.sides.forEach(function(side,s){if(!side.human)return;side.kit.forEach(function(k,i){if(k.used)return;var c=cost(s,k.kind);show('c'+s+'_'+i+'_'+c+(c>side.points?'x':''),'pop cost'+(c>side.points?' dear':''),c?String(c):'free',k.x,k.z,.02,s,1);});});
  /* with two lobbers each wears its name; a fallen part held by glue shows a honey pot */
  if(SG.phase==='fight')SG.sides.forEach(function(side,s){if(!side.human)return;var lbs=lobbersOf(s);if(lbs.length<2)return;lbs.forEach(function(l,i){var sel=i===side.lsel;show('lob'+s+'_'+i+(sel?'s':''),'pop lobtag'+(sel?' sel':''),'Lobber '+(i+1),l.x,l.z,TALL.lobber+.22,s,sel?1:.7);});});
  SG.pieces.forEach(function(p){if(!p.built||!p.total)return;p.ps.forEach(function(q,i){if(q.st==='off'&&q.glue>SG.clock)show('gl'+p.id+'_'+i,'pop icon','🍯',q.rx,q.rz,.16,p.side,1);});});
  /* a hammer over every piece that is being mended, so mending shows even when the mouse is behind it */
  SG.pieces.forEach(function(p){if(!p.built)return;var busy=false;p.ps.forEach(function(q){if(q.mender>=0&&q.st!=='on')busy=true;});if(busy)show('m'+p.id,'pop icon','🔨',p.x,p.z,TALL[p.kind]+.18+.04*Math.sin(SG.clock*6),p.side,1);});
  for(var id in V.popEls)if(!seen[id]){pl.removeChild(V.popEls[id]);delete V.popEls[id];}}
function syncAll(){
  if(!V.on)return;var i,ph=SG.phase;
  if(!SG.sides.length){GH.forEach(function(g){g.zone.visible=g.disc.visible=g.sel.visible=g.ring.visible=g.arc.visible=g.land.visible=g.order.visible=false;if(g.obj)g.obj.visible=false;});for(i=0;i<V.rings.length;i++)V.rings[i].visible=false;return;}
  SG.mice.forEach(function(m,i){var o=V.mice[i];if(!o)return;var st=m.state,pose=POSE[st]||'idle',r2=m.x*m.x+m.z*m.z;
    if(m.act>0&&(st==='hold'||st==='go'||st==='idle'))pose=SG.sides[m.side].team==='blue'?'aim':'hammer';if(m.q>0)pose='idle';
    o.position.set(m.x,hy(m.x,m.z)*(st==='dizzy'?.7:1),m.z);o.rotation.y=m.rot;SS.pose(o,pose,SG.clock*(st==='wander'?.6:1)+i*.37);
    if(pose==='hammer'){var hp=((SG.clock+i*.37)*1.7)%1;if(hp<o.userData.hp)snd('tap');o.userData.hp=hp;}});
  for(var s=0;s<2;s++)SG.sides[s].kit.forEach(function(k,i){var o=V.slots[s][i];if(!o)return;o.visible=SG.mode!=='lab'&&(!k.picked&&ph==='build'||(!k.used));var sel=i===SG.sides[s].sel;o.position.y=sel?.07+.02*Math.sin(SG.clock*5):.012;o.scale.setScalar(MAT.scale*(k.used&&!k.picked?.8:1));});
  syncPieces();syncPops();
  SG.sides.forEach(function(side,s){var G=GH[s],showGhost=ph==='build'&&side.sel>=0&&side.human;G.zone.visible=showGhost;G.disc.visible=showGhost&&SG.layout.custom;G.sel.visible=showGhost;
    if(showGhost){var kind=side.kit[side.sel].kind,g=side.ghost;G.sel.position.set(side.kit[side.sel].x,.012,side.kit[side.sel].z);
      if(G.kind!==kind+side.team){if(G.obj)S.remove(G.obj);G.obj=ghostOf(kind,side.team,GM.ok);S.add(G.obj);G.kind=kind+side.team;G.obj.userData.ok=true;}
      if(G.obj.userData.ok!==g.ok){tint(G.obj,g.ok?GM.ok:GM.bad);G.obj.userData.ok=g.ok;}
      G.obj.visible=true;G.obj.position.set(g.sx==null?g.x:g.sx,.01,g.sz==null?g.z:g.sz);G.obj.rotation.y=g.rot;
      var rr=Math.max(FOOT[kind][0],FOOT[kind][1])+.1;G.ring.visible=true;G.ring.scale.setScalar(rr);G.ring.position.set(G.obj.position.x,.008,G.obj.position.z);G.ring.material.color.set(g.ok?0x8fd0ff:0xff5a44);
    }else{if(G.obj)G.obj.visible=false;G.ring.visible=false;}});
  /* marbles, corks, aim arc, order marker */
  var seen={};SG.marbles.forEach(function(a){seen[a.id]=1;var o=V.marbles[a.id];if(!o){var AM=AMMO[a.ammo];o=V.marbles[a.id]=a.ammo==='corks'?SS.fx.cork():SS.fx.marble(AM&&AM.tint!=='team'?AM.tint:SG.sides[a.side].team);a.sc=(AM&&AM.scale)||1.25;o.scale.setScalar(a.sc);world.add(o);}o.visible=a.t>=0&&!(!a.live&&a.ammo==='glue');
    if(a.live){var p=marblePos(a,Math.min(1,a.t/a.T));o.position.set(p[0],p[1]+.03,p[2]);o.rotation.x=a.t*9;}
    else{var u=Math.min(1,(a.t-a.T)/.8),dx=a.x1-a.x0,dz=a.z1-a.z0,l=Math.sqrt(dx*dx+dz*dz)||1;o.position.set(a.hx+dx/l*.3*u,Math.max(.034,a.hy*(1-u*2))+Math.abs(Math.sin(u*PI*2))*.08*(1-u),a.hz+dz/l*.3*u);o.scale.setScalar(u>.7?1.25*(1-(u-.7)/.3):1.25);}});
  for(var id in V.marbles)if(!seen[id]){world.remove(V.marbles[id]);delete V.marbles[id];}
  seen={};SG.corks.forEach(function(c){seen[c.id]=1;var o=V.corks[c.id];if(!o){o=V.corks[c.id]=SS.fx.cork();o.scale.setScalar(.75);world.add(o);}var u=Math.min(1,c.t/.25);o.position.set(c.x0+(c.x1-c.x0)*u,.2+Math.sin(u*PI)*.12,c.z0+(c.z1-c.z0)*u);o.rotation.y=Math.atan2(c.x1-c.x0,c.z1-c.z0);});
  for(id in V.corks)if(!seen[id]){world.remove(V.corks[id]);delete V.corks[id];}
  SG.sides.forEach(function(side,s){var G=GH[s],aim=side.aim.on&&ph==='fight'?SG.arc(s,side.aim.tx,side.aim.tz,side.aim.li):null;G.arc.visible=G.land.visible=!!aim;G.arc2.visible=!!(aim&&aim.next);
    if(aim){var own=aim.hit&&aim.hit.own,ex=aim.hit?aim.hit.x:aim.fx,ez=aim.hit?aim.hit.z:aim.fz;side.aim.own=!!own;
      SS.fx.setArc(G.arc,new THREE.Vector3(aim.x0,aim.y0,aim.z0),new THREE.Vector3(aim.x1,0,aim.z1),aim.h,SG.clock*.8);G.arc.material.color.set(own?0xff4a36:0xfff3d0);
      if(aim.next){SS.fx.setArc(G.arc2,new THREE.Vector3(aim.next.x0,aim.next.y0,aim.next.z0),new THREE.Vector3(aim.next.x1,0,aim.next.z1),aim.next.h,SG.clock*.8);G.arc2.material.color.set(own?0xff4a36:0xffb066);}
      G.land.position.set(ex,.01+(aim.hit?aim.hit.y:0),ez);G.land.scale.setScalar(V2()?ammoR(side.ammo,side.high):CONFIG.blast);G.land.material.color.set(own?0xff4a36:(V2()&&side.ammo==='glue'?0x86d23c:(side.ammo==='bouncer'?0xffb066:0xfff3d0)));
      var lv=V.pieces[lobberOf(s,side.aim.li).id];if(lv&&lv.obj)lv.obj.rotation.y=Math.atan2(aim.x1-aim.x0,aim.z1-aim.z0);}
    /* with two lobbers the chosen one wears a bright ring; the other a faint one */
    var lbs=lobbersOf(s);for(var lr=0;lr<2;lr++){var rg2=G.lring[lr],lp=lbs.length>1&&ph==='fight'&&side.human?lbs[lr]:null;rg2.visible=!!lp;if(lp){rg2.position.set(lp.x,.009,lp.z);rg2.scale.setScalar(Math.max(FOOT.lobber[0],FOOT.lobber[1])*1.25*(lr===side.lsel?1+.04*Math.sin(SG.clock*6):1));rg2.material.color.set(lr===side.lsel?0xffd23a:0x9a8a6a);rg2.material.opacity=lr===side.lsel?.95:.4;}}
    var od=side.order;G.order.visible=!!od&&(ph==='fight'||ph==='mend'||ph==='count')&&side.human;if(od){G.order.position.set(od.x,hy(od.x,od.z)+.012,od.z);G.order.scale.setScalar(1+.08*Math.sin(SG.clock*6));G.order.material.color.set(SG.mode==='table'?(side.team==='red'?0xffb09a:0xa9c8ff):0xfff3d0);}});
  /* glue puddles */
  var np=0;SG.puddles.forEach(function(pd){var pm=V.puddles[np];if(!pm){pm=V.puddles[np]=new THREE.Mesh(V.puddleGeo,V.puddleMat);pm.rotation.x=-PI/2;S.add(pm);}np++;pm.visible=true;pm.position.set(pd.x,.011,pd.z);pm.scale.setScalar(pd.r*(.6+.4*Math.min(1,(SG.clock-pd.t0)/.25)));});for(var pq=np;pq<V.puddles.length;pq++)V.puddles[pq].visible=false;
  SS.setHill(hill,ph==='build'||ph==='ready'||ph==='start'?.5:SG.blueShare());
  if(SG.mode==='lab')labView();
}
function fmt(t){t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+('0'+(t%60)).slice(-2);}
var lastHud='',CAMNAME=['Whole table','My camp','The hill'];
function ui(){if(!hasDom||!E('start'))return;var ph=SG.phase,fight=ph==='fight'||ph==='mend'||ph==='count',me=SG.sides[0],table=SG.mode==='table'&&ph!=='start';
  E('start').style.display=ph==='start'?'flex':'none';E('end').style.display=ph==='ready'&&!table?'flex':'none';E('win').style.display=ph==='over'&&!table?'flex':'none';
  E('hud').style.display=ph==='start'||table?'none':'flex';E('bar').style.display=ph==='build'&&!table&&me.human?'flex':'none';E('fbar').style.display=fight&&!table?'flex':'none';E('bCam').style.display=ph==='start'||table||AR.on?'none':'block';var placing=AR.on&&AR.state!=='locked';E('arbar').style.display=placing?'flex':'none';if(placing){E('bar').style.display=E('fbar').style.display='none';E('start').style.display='none';}
  E('bReplace').style.display=AR.on&&AR.state==='locked'&&ph!=='start'&&(SG.paused||ph==='build'||ph==='ready')?'block':'none';E('bExit').style.display=AR.on?'block':'none';E('bLog').style.display=SG.dev?'block':'none';
  if(AR.on&&ph==='over')E('bAgain').onclick=function(){SG.arAgain();};else E('bAgain').onclick=function(){SG.reset();};
  E('side').style.display=ph==='start'&&!AR.on?'none':'flex';E('bPause2').style.display=E('bTilt').style.display=table?'block':'none';E('tag').style.display=table?'none':'block';
  E('pp0').style.display=E('pp1').style.display=table?'flex':'none';
  E('hCount').style.display=ph==='build'||ph==='ready'?'block':'none';E('mA').style.display=E('mB').style.display=fight||ph==='over'?'block':'none';
  if(ph==='ready'){E('endText').textContent=SG.readyText||'';E('bStart').style.display=me&&me.bot?'none':'inline-block';}
  if(ph==='over'&&!table){var w=SG.sides[SG.winner],won=SG.winner===0;E('winTitle').textContent=NAME[w.team]+' wins!';
    E('winText').textContent=(V2()?(SG.stats.keepDown?NAME[SG.sides[1-SG.winner].team]+"'s Keep is down. ":'No Keep fell: the higher score wins. '):(me.bot?'':(won?'You held the hill. ':'The other camp held the hill. ')))+NAME[me.team]+' '+Math.round(me.score)+' · '+NAME[SG.sides[1].team]+' '+Math.round(SG.sides[1].score);}
  ['squad','lobber','mend'].forEach(function(t){var b=E('b_'+t);if(b)b.className='btn'+(SG.tool===t?' on':'');});
  var v2f=V2()&&me&&(fight||ph==='fall');if(v2f&&!table){E('fbar').style.display='none';}E('fbar2').style.display=v2f&&!table&&ph!=='fall'?'flex':'none';
  if(v2f){var LAB={hill:'🚩 Hill',raid:'⚔️ Raid',guard:'🛡 Guard',mend:'🔨 Mend'};ORDERS.forEach(function(o){E('o_'+o).textContent=LAB[o]+' '+me.plan[o];E('o_'+o).className='btn'+(me.pick===o?' on':'');});
    E('nrow').style.display=me.pick&&!table&&ph!=='fall'?'flex':'none';E('b2_lobber').className='btn'+(me.tool==='lobber'?' on':'');
    /* the ammo row: every kind, with its icon, its name and what is left or when it is ready */
    var inL=me.tool==='lobber'&&!me.pick&&!table&&ph!=='fall',nL=lobbersOf(0).length;E('arow').style.display=inL?'flex':'none';
    AMMO_ORDER.forEach(function(a){var b=E('a_'+a);if(!b)return;b.className='btn ammo'+(me.ammo===a?' on':'')+(ammoReady(me,a)?'':(AMMO[a].store?' none':' wait'));b.querySelector('.ac').textContent=ammoCount(me,a);b.title=ammoLabel(me,a);});
    E('b_lsel').style.display=nL>1?'inline-block':'none';E('b_lsel').textContent='Lobber '+((me.lsel||0)+1)+' / '+nL;E('b_lsel').className='btn on';
    E('b_high').className='btn'+(me.high&&!AMMO[me.ammo].flat?' on':'');E('b_high').disabled=!!AMMO[me.ammo].flat;
    E('arow').style.bottom=(E('fbar2').offsetHeight+22)+'px';E('bPauseB').textContent=SG.paused?'▶ Go on':'⏸';}
  else{E('nrow').style.display='none';E('arow').style.display='none';}E('bCam').textContent='🎥 '+CAMNAME[SG.cam];E('bMute').textContent=SG.muted?'🔇':'🔊';lastHud='';if(SG.mode==='lab'&&ph!=='start')labUi();else if(ph==='start')labUiHide();}
/* what to tell a player about why the chosen lobber cannot fire yet (or how to fire it) */
function blockText(code,s){var n=lobbersOf(s).length,pre=n>1?'Lobber '+((SG.sides[s].lsel||0)+1)+': ':'',T={none:'You have no lobber',broken:'The lobber is broken. Mend it first',crew:'The lobber needs a mouse beside it',winding:'Winding…',nobig:'No Big Marble yet: hold the hill for '+C2.hillSecs+' seconds','':'Drag back and let go to fire'};
  return pre+(code in T?T[code]:(AMMO[code]?AMMO[code].name+' is not ready yet':''));}
function listParts(o){var k=Object.keys(o);return k.map(function(n){return o[n]+' '+n+(o[n]>1&&n!=='roof cap'?'s':'');}).join(', ');}
/* the line of help or news for one side */
function lineFor(s){var ph=SG.phase,a=SG.sides[s],n=0;SG.pieces.forEach(function(p){if(p.side===s)n++;});var hint='';
  if(ph==='build'&&a.human)hint=a.ready?'Ready! Waiting for the other camp':(a.sel>=0?(V2()&&a.kit[a.sel].kind==='tower'?'Your Keep goes first: tap the table to place it':'Tap the table to place the '+a.kit[a.sel].kind):(n<KIT.length&&!(V2()&&a.points<=0)?(V2()?(a.keep||SG.pieces.some(function(q){return q.side===s&&q.kind==='tower';})?'Tap a piece on the mat · '+a.points+' points left':'Your Keep goes first: tap the tower on the mat'):'Tap a piece on the mat'):'All placed. Tap '+(SG.mode==='table'?'Ready':'Done')+' when you like'));
  else if(ph==='mend'){var md=listParts(SG.mending(s));hint=md?'Mend break · your mice are mending: '+md:'Mend break · nothing to mend';}
  else if(ph==='fall')hint='';
  else if(ph==='fight'&&a.human&&V2()){hint=a.pick?'How many mice? Tap a number':(a.tool==='lobber'?blockText(SG.lobberBlock(s),s):'Bring down their Keep! Give orders, or use the lobber');}
  else if(ph==='fight'&&a.human){var blk=SG.lobberBlock(s);hint=a.tool==='lobber'?({none:'You have no lobber',broken:'The lobber is broken. Mend it first',crew:'The lobber needs a mouse beside it',winding:'Winding the lobber…','':'Drag back and let go to fire'})[blk]:(a.tool==='mend'?'Tap a damaged piece to mend it':(a.order?'':'Tap the hill to send your squad'));}
  var call=SG.callout.t>0&&ph!=='mend';return {text:call?SG.callout.text:(a.msg.t>0?a.msg.text:hint),bad:a.msg.t>0&&a.msg.bad&&!call};}
function meterText(side){return (side.team==='red'?'⚙️ Red ':'🪶 Blue ')+Math.round(side.score);}
function meterPct(side){if(!V2())return Math.min(100,side.score);var top=Math.max(30,SG.sides[0].score,SG.sides[1].score);return Math.min(100,side.score/top*100);}
/* which screen edge the far player's panel sits on: the one nearest their camp (blue's camp is always at the bottom) */
function farEdge(){var b=baseOf(0),r=baseOf(1),bn=Math.sqrt(b.x*b.x+b.z*b.z),ux=bn>.2?-b.x/bn:0,uz=bn>.2?-b.z/bn:-1,up=r.x*ux+r.z*uz,right=r.x*(-uz)+r.z*ux;return up>=Math.abs(right)*.8?'top':(right>0?'right':'left');}
function hudTable(){var ph=SG.phase,fight=ph==='fight'||ph==='mend'||ph==='count',eg=farEdge();if(SG.sides[1].edge!==eg){SG.sides[1].edge=eg;E('pp1').className='pp '+(eg==='top'?'flip':eg);}
  for(var s=0;s<2;s++){var side=SG.sides[s],el=E('pp'+s),ln=lineFor(s),n=0,built=0;SG.pieces.forEach(function(p){if(p.side===s){n++;if(p.built)built++;}});
    var head=ph==='build'?(side.team==='red'?'⚙️ Red':'🪶 Blue')+' · ⏱ '+fmt(SG.time)+' · '+(V2()?side.points+' pts':n+' of '+KIT.length):meterText(side)+' · '+(ph==='over'?'over':(ph==='mend'?'break ':'R'+SG.round+' ')+fmt(ph==='count'?CONFIG.round:SG.time));
    var key=[ph,head,ln.text,ln.bad,side.tool,side.ready,Math.round(side.score),Math.ceil(SG.time),SG.winner,ammoKey(side),lobbersOf(s).length,JSON.stringify(side.plan)].join('|');if(el.getAttribute('data-k')===key)continue;el.setAttribute('data-k',key);
    el.querySelector('.meter span').textContent=head;var bar=el.querySelector('.meter i');bar.style.width=(ph==='build'?0:meterPct(side))+'%';bar.style.background=side.team==='red'?'#d9603a':'#2f6fe6';
    var sy=el.querySelector('.psay');sy.textContent=ln.text;sy.style.visibility=ln.text&&ph!=='over'&&ph!=='count'?'visible':'hidden';sy.className='psay'+(ln.bad?' bad':'');
    [].forEach.call(el.querySelectorAll('.pbtns button'),function(b){var a=b.getAttribute('data-a'),isBuild=a==='L'||a==='R'||a==='undo'||a==='ready';b.style.display=(isBuild?ph==='build':fight)?'inline-block':'none';
      var v2b=a.indexOf('o_')===0||a==='lsel',v1b=a==='squad'||a==='mend';if(!isBuild&&((v2b&&!V2())||(v1b&&V2())))b.style.display='none';if(a==='lsel'&&(side.tool!=='lobber'||lobbersOf(s).length<2||ph==='mend'))b.style.display='none';
      if(a==='ready'){b.textContent=side.ready?'Ready ✓':'Ready';b.className='btn'+(side.ready?' on':' go');}else if(a.indexOf('o_')===0){b.textContent=({hill:'🚩',raid:'⚔️',guard:'🛡',mend:'🔨'})[a.slice(2)]+side.plan[a.slice(2)];b.className='btn';}
      else if(a==='lsel'){b.textContent='Lobber '+((side.lsel||0)+1)+' / '+lobbersOf(s).length;b.className='btn on';}else if(!isBuild)b.className='btn'+(side.tool===a?' on':'');});
    var pa=el.querySelector('.pammo');pa.style.display=V2()&&(ph==='fight'||ph==='count')&&side.tool==='lobber'?'flex':'none';
    [].forEach.call(pa.querySelectorAll('button'),function(b){var id=b.getAttribute('data-a').slice(3);b.className='btn ammo'+(side.ammo===id?' on':'')+(ammoReady(side,id)?'':(AMMO[id].store?' none':' wait'));b.querySelector('.ac').textContent=ammoCount(side,id);b.title=ammoLabel(side,id);});
    var big=el.querySelector('.pbig');big.style.display=ph==='count'?'block':'none';if(ph==='count')big.textContent=Math.max(1,Math.ceil(SG.time));
    var card=el.querySelector('.pcard');card.style.display=ph==='over'?'block':'none';if(ph==='over'){card.querySelector('h2').textContent=SG.winner===s?'🏆 You win!':NAME[SG.sides[SG.winner].team]+' wins';card.querySelector('p').textContent=(V2()&&SG.stats.keepDown?NAME[SG.sides[1-SG.winner].team]+"'s Keep is down · ":'')+meterText(SG.sides[0])+' · '+meterText(SG.sides[1]);}}
  E('bPause2').textContent=SG.paused?'▶':'⏸';}
function hud(){if(!hasDom||!SG.sides.length)return;if(SG.mode==='lab'){labHud();return;}if(SG.mode==='table'){hudTable();return;}var ph=SG.phase,built=0,n=0;SG.pieces.forEach(function(p){if(p.side===0){n++;if(p.built)built++;}});
  var a=SG.sides[0],b=SG.sides[1],ln=lineFor(0);
  var s=[ph,fmt(SG.time),n,built,ln.text,ln.bad,Math.round(a.score),Math.round(b.score),SG.round,SG.paused,SG.tool,ammoKey(a),lobbersOf(0).length,a.pick,JSON.stringify(a.plan)].join('|');if(s===lastHud)return;lastHud=s;if(V2()&&(ph==='fight'||ph==='mend'||ph==='count'))ui();lastHud=s;
  E('hTeam').textContent=ph==='fall'?'The Keep is falling!':ph==='build'?(a.team==='red'?'⚙️ Red':'🪶 Blue')+' camp · Build':(ph==='ready'?'Camp ready':(ph==='mend'?'Mend break':(ph==='over'?'Match over':'Round '+SG.round+' of '+CONFIG.rounds)));
  E('hTime').textContent='⏱ '+fmt(ph==='count'?CONFIG.round:SG.time);E('hCount').textContent=V2()?'Points left '+a.points+' of '+C2.points+' · built '+built:'Placed '+n+' of '+KIT.length+' · built '+built;
  function meter(el,side){el.firstChild.textContent=meterText(side);el.querySelector('i').style.width=meterPct(side)+'%';el.querySelector('i').style.background=side.team==='red'?'#d9603a':'#2f6fe6';}
  meter(E('mA'),a);meter(E('mB'),b);
  var sy=E('say');sy.style.display=ln.text&&ph!=='start'&&ph!=='over'&&ph!=='count'?'block':'none';sy.textContent=ln.text;sy.className=ln.bad?'bad':'';
  var big=E('big');big.style.display=ph==='count'?'block':'none';if(ph==='count')big.textContent=Math.max(1,Math.ceil(SG.time));
  E('bPause').textContent=SG.paused?'▶ Go on':'⏸ Pause';}
/* a collapse plays in slow motion for a moment (real time only: SG.step itself never slows) */
function slowed(dt){if(SG.slowT>0&&(SG.speed||1)<=4){SG.slowT-=dt;return dt*.3;}return dt;}
function render(){if(!V.on)return;syncAll();if(!AR.on){moveCamera();if(SG.shake>.02){var sk=SG.shake*.05;C.position.x+=(Math.random()-.5)*sk;C.position.y+=(Math.random()-.5)*sk;SG.shake*=.88;}else SG.shake=0;}SS.wave(hill,SG.clock);hud();R.render(SCN,C);}
SG.render=render;

function initView(){
  W=innerWidth;H=innerHeight;R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:true});R.setSize(W,H);R.setPixelRatio(Math.min(2,devicePixelRatio||1));
  R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;R.outputEncoding=THREE.sRGBEncoding;document.body.insertBefore(R.domElement,document.body.firstChild);
  /* SCN is the scene. S holds everything that belongs to the game table, so in AR the whole game can sit on the real table at its place, turn and size.
     ROOMG is the practice room and its table top, hidden in AR. */
  SCN=new THREE.Scene();SCN.background=new THREE.Color(0x3b2a1c);SCN.fog=new THREE.Fog(0x4a3320,9,22);S=new THREE.Group();SCN.add(S);ROOMG=new THREE.Group();SCN.add(ROOMG);arCam=new THREE.PerspectiveCamera();arCam.matrixAutoUpdate=false;C=new THREE.PerspectiveCamera(40,W/H,.1,60);camNow=null;moveCamera();_v=new THREE.Vector3();
  function M(c,r){return new THREE.MeshStandardMaterial({color:c,roughness:r==null?.85:r});}
  function add(g,m,x,y,z){var o=new THREE.Mesh(g,m);o.position.set(x||0,y||0,z||0);o.castShadow=true;o.receiveShadow=true;ROOMG.add(o);return o;}
  function box(w,h,d,m,x,y,z){return add(new THREE.BoxGeometry(w,h,d),m,x,y,z);}
  function cyl(a,b,h,m,x,y,z,n){return add(new THREE.CylinderGeometry(a,b,h,n||14),m,x,y,z);}
  SCN.add(new THREE.HemisphereLight(0xfff0dc,0x6a4a30,.62));
  var sun=new THREE.DirectionalLight(0xffd9a6,1.3);sun.position.set(-5,4.2,2.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  var sc=sun.shadow.camera;sc.left=-4.2;sc.right=4.2;sc.top=4.2;sc.bottom=-4.2;sc.near=.5;sc.far=20;sun.shadow.bias=-.0005;sun.shadow.normalBias=.012;sun.shadow.radius=4;S.add(sun);S.add(sun.target);SUN=sun;
  var rim=new THREE.DirectionalLight(0x9db8ff,.25);rim.position.set(4,3,-3);SCN.add(rim);
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
  var span=MAT.step*5+.2;V.mats=[];V.matG=[];V.pads=[[],[]];
  for(var s=0;s<2;s++){var grp=new THREE.Group();S.add(grp);V.matG.push(grp);var th=-PI/2-span,mm=new THREE.Mesh(new THREE.RingGeometry(MAT.r0,MAT.r1,48,1,th,span*2),M(0x8f7044,1));mm.rotation.x=-PI/2;mm.position.y=.006;mm.receiveShadow=true;grp.add(mm);
    var me=new THREE.Mesh(new THREE.RingGeometry(MAT.r0-.03,MAT.r0,48,1,th,span*2),M(0x2a55a8,1));me.rotation.x=-PI/2;me.position.y=.007;grp.add(me);V.mats.push(me);
    /* in AR the mat is only an outline, and narrower, so the real table shows */
    [2.82,3.13].forEach(function(rr){var ol=new THREE.Mesh(new THREE.RingGeometry(rr,rr+.022,48,1,th+.05,span*2-.1),me.material);ol.rotation.x=-PI/2;ol.position.y=.004;ol.userData.ar=true;ol.visible=false;grp.add(ol);});
    for(var pi=0;pi<KIT2.length;pi++){var pd=new THREE.Mesh(V.padGeo||(V.padGeo=new THREE.CircleGeometry(.2,20)),V.padMat||(V.padMat=M(0x8f7044,1)));pd.rotation.x=-PI/2;pd.visible=false;pd.receiveShadow=true;S.add(pd);V.pads[s].push(pd);}}
  V.mound=new THREE.Mesh(new THREE.SphereGeometry(.36,16,6,0,PI*2,0,PI/2),M(0x6f9440,.95));V.mound.scale.y=.5;V.mound.castShadow=true;V.mound.receiveShadow=true;V.mound.visible=false;S.add(V.mound);
  function flat(geo,col,op){var o=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op,depthWrite:false}));o.rotation.x=-PI/2;o.visible=false;S.add(o);return o;}
  for(s=0;s<2;s++){var G=GH[s];G.zone=flat(new THREE.RingGeometry(.6,ZONE.rMax,48,1,-PI/2-ZONE.half,ZONE.half*2),s?0xffc0a8:0x9fd0ff,.13);G.zone.position.y=.005;G.zoneG=new THREE.Group();S.add(G.zoneG);S.remove(G.zone);G.zoneG.add(G.zone);G.disc=flat(new THREE.CircleGeometry(2.15,40),s?0xffc0a8:0x9fd0ff,.12);
    G.ring=flat(new THREE.RingGeometry(.92,1,40),0x8fd0ff,.85);G.ring.position.y=.008;G.sel=flat(new THREE.RingGeometry(.2,.24,28),0xffd9a8,.95);
    G.land=flat(new THREE.RingGeometry(.86,1,36),0xfff3d0,.9);G.order=flat(new THREE.RingGeometry(.16,.2,28),0xfff3d0,.9);G.arc=SS.fx.arc(16);G.arc.visible=false;S.add(G.arc);G.arc2=SS.fx.arc(8);G.arc2.visible=false;S.add(G.arc2);G.lring=[0,1].map(function(){var r=flat(new THREE.RingGeometry(.9,1,40),0xffd23a,.95);r.position.y=.009;r.visible=false;return r;});}
  V.ringGeo=new THREE.RingGeometry(.105,.128,22);V.ringMat={blue:new THREE.MeshBasicMaterial({color:0x4f8dff,transparent:true,opacity:.9,depthWrite:false}),red:new THREE.MeshBasicMaterial({color:0xff6a3c,transparent:true,opacity:.9,depthWrite:false})};
  V.capMat={blue:M(0x1c4fc0,.7),red:M(0xb5341c,.7)};
  V.glueMat=new THREE.MeshBasicMaterial({color:0x86d23c,transparent:true,opacity:.95,depthWrite:false});V.puddleGeo=new THREE.CircleGeometry(1,28);V.puddleMat=new THREE.MeshBasicMaterial({color:0x86d23c,transparent:true,opacity:.5,depthWrite:false});V.fallGeo=new THREE.RingGeometry(.13,.155,22);V.fallMat=new THREE.MeshBasicMaterial({color:0xfff6c8,transparent:true,opacity:.95,depthWrite:false});V.flashGeo=new THREE.SphereGeometry(.12,10,8);
  /* AR only: a faint ring for the table edge, a plane that only catches shadows, and the reticle that follows the hit test */
  V.edge=new THREE.Mesh(new THREE.RingGeometry(TABLE_R-.04,TABLE_R,72),new THREE.MeshBasicMaterial({color:0xfff3d0,transparent:true,opacity:.45,depthWrite:false}));V.edge.rotation.x=-PI/2;V.edge.position.y=.003;V.edge.visible=false;S.add(V.edge);
  V.catcher=new THREE.Mesh(new THREE.CircleGeometry(TABLE_R+.6,48),new THREE.ShadowMaterial({opacity:.32}));V.catcher.rotation.x=-PI/2;V.catcher.receiveShadow=true;V.catcher.visible=false;S.add(V.catcher);
  V.reticle=new THREE.Mesh(new THREE.RingGeometry(.07,.09,32),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,depthTest:false}));V.reticle.rotation.x=-PI/2;V.reticle.visible=false;SCN.add(V.reticle);
  world=new THREE.Group();S.add(world);
  GM={ok:new THREE.MeshBasicMaterial({color:0x8fd0ff,transparent:true,opacity:.5,depthWrite:false}),bad:new THREE.MeshBasicMaterial({color:0xff5a44,transparent:true,opacity:.55,depthWrite:false}),site:new THREE.MeshBasicMaterial({color:0xfff3d0,transparent:true,opacity:.28,depthWrite:false})};
  V.on=true;}
/* three views: the whole table (both mats must fit, landscape or portrait), my camp, the hill */
function camTarget(){var a=W/H,t=Math.tan(20*PI/180),v=SG.cam||0,need=[3.65,2.9,1.9][v],dH=[7.1,5.2,3.9][v],d=Math.max(need/(t*a),dH),el=v===0?(a<1?.95:.72):(v===1?.7:.62),lz=[.25,1.75,.1][v];
  /* the camera stands behind your own camp and looks across the table */
  var b=baseOf(0),bl=Math.sqrt(b.x*b.x+b.z*b.z),dx=bl>.2?b.x/bl:0,dz=bl>.2?b.z/bl:1,h=v===2?hillAt():{x:0,z:0};if(v===1)lz=Math.max(.9,bl-.15);if(v===2)lz=0;if(SG.mode==='lab'&&SG.phase!=='start'&&v===0)lz+=.45;   /* the Lab's bars cover the bottom of the screen: the table sits a little higher */
  return [h.x+dx*(lz+Math.cos(el)*d),Math.sin(el)*d,h.z+dz*(lz+Math.cos(el)*d),h.x+dx*lz,-.1,h.z+dz*lz];}
function moveCamera(){
  if(SG.mode==='table'&&SG.phase!=='start'){var t=Math.tan(10*PI/180),hh=Math.max(120,H-128),d=Math.max(3.38*H/hh/t,3.38/(t*W/H));var tl=(SG.tilt||0)*PI/180;var bb=baseOf(0),bn=Math.sqrt(bb.x*bb.x+bb.z*bb.z),ux=bn>.2?bb.x/bn:0,uz=bn>.2?bb.z/bn:1;   /* blue's camp is at the bottom edge of the screen */
    C.fov=20;C.aspect=W/H;C.up.set(-ux,0,-uz);C.position.set(ux*d*Math.sin(tl),d*Math.cos(tl),uz*d*Math.sin(tl));C.lookAt(0,0,0);C.near=1;C.far=d+12;C.updateProjectionMatrix();C.updateMatrixWorld();SCN.fog.near=d+4;SCN.fog.far=d+40;camNow=null;return;}
  if(C.fov!==40){C.fov=40;C.up.set(0,1,0);C.near=.1;C.far=60;SCN.fog.near=9;SCN.fog.far=22;}
  var q=camTarget(),i;if(!camNow||SG.camSnap){camNow=q.slice();SG.camSnap=false;}else for(i=0;i<6;i++)camNow[i]+=(q[i]-camNow[i])*.14;
  C.aspect=W/H;C.position.set(camNow[0],camNow[1],camNow[2]);C.lookAt(camNow[3],camNow[4],camNow[5]);C.updateProjectionMatrix();C.updateMatrixWorld();}
/* Table mode: 0 is straight down; a slight tilt shows the sides of things, but favours the near player */
SG.setTilt=function(deg){SG.tilt=deg||0;if(hasDom&&E('bTilt'))E('bTilt').textContent=SG.tilt?'📐 '+SG.tilt+'°':'📐 0°';};
SG.setCam=function(v){SG.cam=((v%3)+3)%3;ui();};

/* ================= AR: the game on a real table (WebXR immersive-ar, as in the HelloXR app) =================
   The practice table stays the default. Nothing here runs unless the player presses "Play on my table (AR)". */
var BUILD='rtk-ar-2 · 19 Nov';   /* bump this with every AR change: it shows in the dev line and on the title, so a tester can say which build they ran */
var AR={on:false,sceneUi:false,domInput:false,inputPath:'none',log:[],errors:[],t0:0,fN:0,fSum:0,fWorst:0,selN:0,selT:0,xrSrc:null,xrPt:null,jumped:false,sameSince:0,motionT:0,lastM:null,started:0,btnDown:null,state:'off',supported:null,session:null,ref:null,hitSrc:null,hit:null,hitResult:null,pose:{x:0,y:0,z:0,yaw:0},size:100,anchor:null,anchorKind:'none',wantAnchor:false,
  lastPose:0,lost:false,lossPaused:false,hits:0,hitT:0,hps:0,fps:0,slow:0,shadowsOff:false,note:'',last:0,ptr:{},overlay:'',error:''};
/* a plain copy for tests and the dev line */
function arPublic(){SG.ar={on:AR.on,state:AR.state,supported:AR.supported,reticle:!!AR.hit,pose:{x:AR.pose.x,y:AR.pose.y,z:AR.pose.z,yaw:AR.pose.yaw},size:AR.size,unitMetres:AR.size/100*.16,anchorKind:AR.anchorKind,lost:AR.lost,hps:AR.hps,fps:AR.fps,
  shadows:!AR.shadowsOff,overlay:AR.overlay,error:AR.error,sceneUi:AR.sceneUi,inputPath:AR.inputPath,jumped:AR.jumped,build:BUILD,buttons:AR.on&&AR.sceneUi?sceneButtons().map(function(b){return b.id;}):[]};}
function arEvent(kind){AR.log.push({t:+((performance.now()-AR.t0)/1000).toFixed(1),kind:kind});if(AR.log.length>200)AR.log.shift();}
arPublic();
/* is AR there? Never throws; where WebXR is missing (Safari) the title just says so. */
function arCheck(){
  function show(ok,why){AR.supported=ok;arPublic();if(!hasDom||!E('bAR'))return;E('bAR').style.display=ok?'inline-block':'none';E('arNote').style.display=ok?'none':'block';E('arNote').textContent=ok?'':'AR needs the HelloXR app. Practice table works here.';E('subTitle').textContent=ok?'Practice table, or your own table in AR':'Practice table';}
  try{var xr=typeof navigator!=='undefined'?navigator.xr:null;if(!xr||typeof xr.isSessionSupported!=='function'){show(false);return;}
    var p=xr.isSessionSupported('immersive-ar');if(!p||typeof p.then!=='function'){show(!!p);return;}p.then(function(ok){show(!!ok);},function(){show(false);});}catch(e){show(false);}}
SG.arCheck=arCheck;
SG.arStart=function(){
  if(AR.on||!AR.supported)return Promise.resolve(false);AR.error='';
  var init={requiredFeatures:['hit-test'],optionalFeatures:['dom-overlay','anchors'],domOverlay:{root:E('ui')}};
  return navigator.xr.requestSession('immersive-ar',init).then(function(session){
    AR.session=session;AR.overlay=session.domOverlayState?session.domOverlayState.type:'none';
    /* HelloXR quirk (from Base Camp's field notes): its polyfill can start without wiring the overlay, so the buttons vanish. Connect it ourselves. */
    if(!session.domOverlayState){try{var syms=Object.getOwnPropertySymbols(session),si;for(si=0;si<syms.length;si++){var dv=session[syms[si]]&&session[syms[si]].device;
        if(dv&&typeof dv.setDomOverlayRoot==='function'){dv.setDomOverlayRoot(E('ui'));if(typeof dv.setActiveXRSession==='function')dv.setActiveXRSession(session);AR.overlay='connected by the game';break;}}}catch(eo){}}
    document.documentElement.style.background='transparent';
    R.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));R.xr.enabled=true;R.xr.setReferenceSpaceType('local');   /* the pixel ratio cap must go in before the session presents */
    return R.xr.setSession(session).then(function(){return session.requestReferenceSpace('viewer');}).then(function(viewer){return session.requestHitTestSource({space:viewer,entityTypes:['plane']}).catch(function(){return session.requestHitTestSource({space:viewer});});}).then(function(src){
      AR.sceneUi=false;AR.domInput=false;AR.inputPath='none';AR.log=[];AR.t0=performance.now();AR.fN=0;AR.fSum=0;AR.fWorst=0;AR.selN=0;AR.xrSrc=null;AR.jumped=false;AR.sameSince=0;AR.lastM=null;AR.started=0;AR.note='';arEvent('session started, overlay '+AR.overlay);
      /* a second way in for taps and drags: the XR select events. Used when the overlay gets no touches. */
      session.addEventListener('selectstart',arSelStart);session.addEventListener('selectend',arSelEnd);
      AR.hitSrc=src;AR.on=true;AR.state='find';AR.hit=null;AR.anchor=null;AR.anchorKind='none';AR.lost=false;AR.lastPose=0;AR.last=0;AR.slow=0;AR.shadowsOff=false;AR.size=100;AR.pose={x:0,y:0,z:0,yaw:0};
      session.addEventListener('end',arEnd);arView(true);R.xr.setAnimationLoop(arFrame);arText();arPublic();ui();return true;});
  }).catch(function(e){AR.error=String(e&&e.message||e);try{R.xr.enabled=false;}catch(e2){}AR.on=false;arPublic();
    if(E('arNote')){E('arNote').style.display='block';E('arNote').textContent='AR could not start ('+AR.error+'). The practice table works here.';}return false;});};
/* switches the look between the practice room and the real table */
function arView(on){
  V.matG.forEach(function(g){g.children.forEach(function(m){m.visible=m.userData.ar?on:!on;});});V.padMat.transparent=on;V.padMat.opacity=on?.22:1;V.padMat.needsUpdate=true;
  document.body.className=on?'ar':'';if(!on)document.documentElement.style.background='';C.near=on?.01:.1;C.far=on?30:60;C.updateProjectionMatrix();ROOMG.visible=!on;V.edge.visible=on;V.catcher.visible=on;V.reticle.visible=false;SCN.background=on?null:new THREE.Color(0x3b2a1c);
  if(on){V.fogKeep=SCN.fog;SCN.fog=null;R.setClearColor(0x000000,0);SUN.shadow.mapSize.set(1024,1024);}else{SCN.fog=V.fogKeep||SCN.fog;SUN.shadow.mapSize.set(2048,2048);SUN.castShadow=true;S.position.set(0,0,0);S.rotation.set(0,0,0);S.scale.set(1,1,1);S.visible=true;arShadowBox(1);R.setPixelRatio(Math.min(2,window.devicePixelRatio||1));R.setSize(W,H);}
  if(SUN.shadow.map){SUN.shadow.map.dispose();SUN.shadow.map=null;}
}
function arShadowBox(k){var sc=SUN.shadow.camera;sc.left=-4.2*k;sc.right=4.2*k;sc.top=4.2*k;sc.bottom=-4.2*k;sc.near=.5*k;sc.far=20*k;sc.updateProjectionMatrix();SUN.shadow.bias=-.0005*k;SUN.shadow.normalBias=.012*k;}
/* the game table sits at the pose, turned by yaw, and 160 mm per unit at 100 cm across */
function arApply(){var k=AR.size/100*.16;S.position.set(AR.pose.x,AR.pose.y,AR.pose.z);S.rotation.set(0,AR.pose.yaw,0);S.scale.set(k,k,k);arShadowBox(k);S.updateMatrixWorld(true);}
function arText(){if(!hasDom||!E('arText'))return;E('arText').textContent=AR.lost?'Tracking lost. Point the iPad at the table':(AR.state==='find'?(AR.hit?'Tap to put the table centre on the ring':'Find your table: point the iPad at it'):'Drag or twist to turn, set the size, then Lock table');
  E('arSize').value=AR.size;E('arSizeText').textContent=AR.size+' cm';E('arLock').style.display=E('arL').style.display=E('arR').style.display=AR.state==='placed'?'inline-block':'none';}
SG.arPlace=function(){if(!AR.on||AR.state==='locked'||!AR.hit)return false;AR.pose.x=AR.hit.x;AR.pose.y=AR.hit.y;AR.pose.z=AR.hit.z;AR.placedHit=AR.hitResult;AR.state='placed';arApply();arText();arPublic();ui();return true;};
SG.arTurn=function(d){if(!AR.on||AR.state!=='placed')return;AR.pose.yaw+=d;arApply();arPublic();};
SG.arResize=function(cm){if(!AR.on||AR.state!=='placed')return;AR.size=Math.max(60,Math.min(140,Math.round(cm)));arApply();arText();arPublic();};
SG.arLock=function(){
  if(!AR.on||AR.state!=='placed')return false;arEvent('table locked, '+AR.size+' cm');AR.jumped=false;if(hasDom)E('arJump').style.display='none';AR.state='locked';AR.anchor=null;AR.anchorKind='fixed pose';AR.wantAnchor=true;arApply();arPublic();
  if(SG.phase==='start'){if(SG.savedCardLayout()&&!(SG.layout.custom&&SG.layoutFrom==='cards')){E('arAsk').style.display='flex';ui();return true;}arBegin();}
  else if(AR.replacePaused){SG.paused=false;AR.replacePaused=false;}
  ui();return true;};
/* in AR the pieces keep their size on the real table: under 80 cm across it is always the small ones */
function arBegin(){E('arAsk').style.display='none';var pk=SG.pick?SG.pick():{team:'blue',level:'easy'};SG.paused=false;SG.cam=0;SG.start(pk.team,{level:pk.level,mode:'solo',pieces:AR.size<80?'small':undefined});ui();}
SG.arBegin=arBegin;
/* move the table again: the match waits, and nothing in it is lost */
SG.arReplace=function(){if(!AR.on||AR.state!=='locked')return;arEvent('re-place table');AR.jumped=false;if(hasDom)E('arJump').style.display='none';AR.state='placed';AR.anchor=null;AR.anchorKind='none';if(SG.phase!=='start'&&!SG.paused){SG.paused=true;AR.replacePaused=true;}else if(SG.paused)AR.replacePaused=true;arText();arPublic();ui();};
/* Exit AR must always work: ask the session to end, and tidy up ourselves if it does not answer */
SG.arLeave=function(){var ses=AR.session;if(!ses){arEnd();return;}try{var pr=ses.end();if(pr&&pr.catch)pr.catch(function(){arEnd();});}catch(e){arEnd();}setTimeout(function(){if(AR.session===ses)arEnd();},800);};
function arEnd(){if(!AR.on&&!AR.session)return;arEvent('session ended');AR.sceneUi=false;if(V.sui)V.sui.visible=false;if(hasDom&&E('arJump')){E('arJump').style.display='none';E('logText').style.display='none';}try{R.xr.setAnimationLoop(null);R.xr.enabled=false;}catch(e){}AR.on=false;AR.state='off';AR.session=null;AR.hitSrc=null;AR.anchor=null;AR.lost=false;AR.ptr={};
  if(hasDom){E('arAsk').style.display='none';}arView(false);camNow=null;SG.paused=false;SG.reset();arPublic();ui();}
function arDown(e){AR.ptr[e.pointerId]={x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,moved:0};var k=Object.keys(AR.ptr);if(k.length===2){var a=AR.ptr[k[0]],b=AR.ptr[k[1]];AR.tw={ang:Math.atan2(b.y-a.y,b.x-a.x),d:Math.hypot(b.x-a.x,b.y-a.y),size:AR.size};a.moved=b.moved=99;}try{e.target.setPointerCapture(e.pointerId);}catch(err){}}
function arMove(e){var P=AR.ptr[e.pointerId];if(!P)return;var dx=e.clientX-P.x;P.moved+=Math.abs(dx)+Math.abs(e.clientY-P.y);P.x=e.clientX;P.y=e.clientY;var k=Object.keys(AR.ptr);if(AR.state!=='placed')return;
  if(k.length===2&&AR.tw){var a=AR.ptr[k[0]],b=AR.ptr[k[1]],ang=Math.atan2(b.y-a.y,b.x-a.x),d=ang-AR.tw.ang;while(d>PI)d-=2*PI;while(d<-PI)d+=2*PI;AR.tw.ang=ang;SG.arTurn(-d);var dd=Math.hypot(b.x-a.x,b.y-a.y);if(AR.tw.d>20)SG.arResize(AR.tw.size*dd/AR.tw.d);}
  else if(k.length===1&&P.moved>12)SG.arTurn(dx*.008);}
function arUp(e){var P=AR.ptr[e.pointerId];if(!P)return;delete AR.ptr[e.pointerId];if(!Object.keys(AR.ptr).length)AR.tw=null;if(P.moved<=12)SG.arPlace();}
function arInitUi(){
  E('bAR').onclick=function(){soundOn();SG.arStart();};E('arLock').onclick=function(){SG.arLock();};E('arL').onclick=function(){SG.arTurn(PI/12);};E('arR').onclick=function(){SG.arTurn(-PI/12);};E('arLeave').onclick=function(){SG.arLeave();};
  E('arSize').oninput=function(){SG.arResize(+E('arSize').value);};E('bReplace').onclick=function(){SG.arReplace();};E('bExit').onclick=function(){SG.arLeave();};E('bLog').onclick=function(){var ta=E('logText');if(ta.style.display==='block'){ta.style.display='none';E('bLog').textContent='📋 Copy AR log';}else SG.arCopyLog();};   /* a second press puts the log away */
  E('jFine').onclick=function(){SG.arJumpFine();};E('jReplace').onclick=function(){SG.arReplace();};
  window.addEventListener('error',function(ev){AR.errors.push(String(ev.message||ev.error||'error')+(ev.lineno?' (line '+ev.lineno+')':''));});
  /* the iPad's own motion sensors, if it lets us listen: only used to tell a frozen pose from an iPad lying still */
  try{window.addEventListener('devicemotion',function(ev){var q=ev.rotationRate,a=ev.acceleration;if((q&&Math.abs(q.alpha||0)+Math.abs(q.beta||0)+Math.abs(q.gamma||0)>25)||(a&&Math.abs(a.x||0)+Math.abs(a.y||0)+Math.abs(a.z||0)>1.2))AR.motionT=performance.now();});}catch(em){}
  addEventListener('keydown',function(ev){if(ev.key==='Escape'&&AR.on)SG.arLeave();});
  E('arCards').onclick=function(){var r=SG.applyLayout(SG.savedCardLayout());if(r.ok)SG.layoutFrom='cards';else say('layout','Card layout not used: '+r.reason,true,0);arBegin();if(!r.ok)say('layout','Card layout not used: '+r.reason,true,0);};
  E('arPlain').onclick=function(){arBegin();};}
function devLine(ms){if(!hasDom||!E('dev'))return;var inf=R.info.render;AR.fps=AR.fps?AR.fps*.9+(1000/Math.max(1,ms))*.1:1000/Math.max(1,ms);E('dev').style.display='block';
  E('dev').textContent=BUILD+' · '+(AR.on?'input '+AR.inputPath+' · ':'')+(AR.on?'AR '+AR.state+(AR.lost?' LOST':'')+' · hits/s '+AR.hps+' · anchor '+AR.anchorKind+' · overlay '+AR.overlay+' · ':'practice · ')+'fps '+AR.fps.toFixed(0)+' · calls '+inf.calls+(AR.note?' · '+AR.note:'');}
/* one XR frame: where the iPad is, where it points on the table, then the game and the picture */
function arFrame(time,frame){
  if(!AR.on||!frame)return;var raw=AR.last?time-AR.last:16;AR.last=time;var dt=Math.min(.1,raw/1000),ref=R.xr.getReferenceSpace(),vp=null,i;
  try{vp=ref?frame.getViewerPose(ref):null;}catch(e){vp=null;}
  var nowR=performance.now(),rr=AR.lastR?nowR-AR.lastR:0;AR.lastR=nowR;if(rr>0&&rr<5000){AR.fN++;AR.fSum+=rr;if(rr>AR.fWorst)AR.fWorst=rr;}if(!AR.started)AR.started=time;
  if(vp&&vp.views&&vp.views.length){var vw=vp.views[0],pm=vw.transform.matrix,same=false;
    if(AR.lastM){same=true;for(i=0;i<16;i++)if(pm[i]!==AR.lastM[i]){same=false;break;}
      /* a jump of more than a metre in one frame: the origin has moved (as after sleep). Stop, and let the player check the table. Do not snap it. */
      var jd=Math.hypot(pm[12]-AR.lastM[12],pm[13]-AR.lastM[13],pm[14]-AR.lastM[14]);if(jd>1&&AR.state==='locked'&&!AR.jumped){AR.jumped=true;arEvent('pose jumped '+jd.toFixed(1)+' m');if(SG.phase!=='start'&&!SG.paused){SG.paused=true;AR.replacePaused=true;}if(hasDom)E('arJump').style.display='flex';ui();}}
    if(!same||!AR.sameSince)AR.sameSince=time;AR.lastM=Array.prototype.slice.call(pm);
    /* HelloXR sends no tracking state. A pose that has not changed at all for 2 seconds while the iPad's own motion sensors say it is moving counts as lost. */
    var frozen=time-AR.sameSince>2000&&AR.motionT>AR.frozeFrom+1500;if(same&&!AR.frozeMark){AR.frozeMark=true;AR.frozeFrom=nowR;}if(!same)AR.frozeMark=false;
    if(frozen&&!AR.lost){AR.lost=true;AR.lostKind='frozen pose';arEvent('tracking lost (pose frozen while the iPad moves)');if(SG.phase!=='start'&&!SG.paused){SG.paused=true;AR.lossPaused=true;}say('lost','Tracking lost. Point the iPad at the table',true,0);arText();ui();}
    if(frozen){vp=null;}else{arCam.matrixWorld.fromArray(vw.transform.matrix);arCam.matrixWorldInverse.copy(arCam.matrixWorld).invert();arCam.projectionMatrix.fromArray(vw.projectionMatrix);arCam.projectionMatrixInverse.copy(arCam.projectionMatrix).invert();
    AR.lastPose=time;if(AR.lost){AR.lost=false;arEvent('tracking back');if(AR.lossPaused){SG.paused=false;AR.lossPaused=false;}arText();ui();}}}
  else if(AR.lastPose&&time-AR.lastPose>1000&&!AR.lost){AR.lost=true;AR.lostKind='no pose';arEvent('tracking lost (no pose)');if(SG.phase!=='start'&&!SG.paused){SG.paused=true;AR.lossPaused=true;}say('lost','Tracking lost. Point the iPad at the table',true,0);arText();ui();}
  AR.hit=null;AR.hitResult=null;
  if(AR.hitSrc&&vp){var res=[];try{res=frame.getHitTestResults(AR.hitSrc)||[];}catch(e2){res=[];}for(i=0;i<res.length&&!AR.hit;i++){var hp=res[i].getPose(ref);if(!hp)continue;var m=hp.transform.matrix;if(m[5]<.7)continue;   /* flat tops only */
      AR.hit={x:m[12],y:m[13],z:m[14]};AR.hitResult=res[i];AR.hits++;}}
  if(time-AR.hitT>1000){AR.hps=AR.hits;AR.hits=0;AR.hitT=time;}
  var rt=V.reticle;rt.visible=AR.state!=='locked'&&!!AR.hit;if(AR.hit){rt.position.set(AR.hit.x,AR.hit.y+.002,AR.hit.z);rt.scale.setScalar(1+.08*Math.sin(time/150));}
  if(AR.state==='find'){S.visible=false;if(AR.wasHit!==!!AR.hit){AR.wasHit=!!AR.hit;arText();}}else S.visible=true;
  /* the lock: an XR anchor if this device makes one, else the pose stays as placed */
  if(AR.state==='locked'&&AR.wantAnchor){AR.wantAnchor=false;try{var mk=null;if(typeof XRRigidTransform!=='undefined'&&typeof frame.createAnchor==='function')mk=frame.createAnchor(new XRRigidTransform({x:AR.pose.x,y:AR.pose.y,z:AR.pose.z,w:1},{x:0,y:0,z:0,w:1}),ref);
      if(mk&&mk.then)mk.then(function(a){if(AR.state==='locked'){AR.anchor=a;AR.anchorKind='xr anchor';arPublic();}},function(){});}catch(e3){}}
  if(AR.anchor&&AR.state==='locked'){try{var ap=frame.getPose(AR.anchor.anchorSpace,ref);if(ap){var am=ap.transform.matrix;AR.pose.x=am[12];AR.pose.y=am[13];AR.pose.z=am[14];arApply();}}catch(e4){}}
  if(SG.phase!=='start'&&!SG.paused&&!SG.hold)SG.step(slowed(dt)*(SG.speed||1));
  /* guard: if frames stay slow for 3 seconds, do without shadows */
  if(raw>40)AR.slow+=raw;else AR.slow=Math.max(0,AR.slow-raw*2);if(AR.slow>3000&&!AR.shadowsOff&&!SG.noGuard){AR.shadowsOff=true;SUN.castShadow=false;V.catcher.visible=false;AR.note='shadows off (slow frames)';}
  /* the second input path: follow a held select (a drag) */
  if(AR.xrSrc&&vp){var sp=arSelPoint(frame,AR.xrSrc);if(sp&&AR.xrPt&&(Math.abs(sp.x-AR.xrPt.x)>.5||Math.abs(sp.y-AR.xrPt.y)>.5)){AR.xrPt=sp;AR.h.move(synth(sp));}}
  /* no overlay 1.5 s in, or taps seen by XR that never reached the page: draw the buttons in the scene instead */
  if(!AR.sceneUi&&((AR.overlay==='none'&&time-AR.started>1500)||(AR.selN>0&&!AR.domInput&&performance.now()-AR.selT>400))){AR.sceneUi=true;AR.inputPath='xr select';arEvent('in-scene buttons on ('+(AR.overlay==='none'?'no overlay':'overlay gets no touches')+')');}
  if(AR.sceneUi){sceneUiFrame();if(document.body.className!=='ar sceneui')document.body.className='ar sceneui';}else if(V.sui)V.sui.visible=false;   /* with the buttons in the scene, the page's own bars are put away so the two never overlap */
  arPublic();render();if(SG.dev)devLine(raw);if(PERF)perfFrame(raw);}
/* ---- XR select as taps and drags ---- */
function synth(pt){return {clientX:pt.x,clientY:pt.y,pointerId:9001,pointerType:'touch',target:E('ui'),xr:true,preventDefault:function(){}};}
function arSelPoint(frame,src){try{var ref=R.xr.getReferenceSpace(),p=frame&&src&&src.targetRaySpace?frame.getPose(src.targetRaySpace,ref):null;if(!p)return null;var m=p.transform.matrix,v=new THREE.Vector3(m[12]-m[8],m[13]-m[9],m[14]-m[10]).project(arCam);return {x:(v.x*.5+.5)*W,y:(-v.y*.5+.5)*H};}catch(e){return null;}}
function arSelStart(e){AR.selN++;AR.selT=performance.now();if(AR.domInput||!AR.on)return;var pt=arSelPoint(e.frame,e.inputSource);if(!pt)return;if(AR.inputPath==='none'){AR.inputPath='xr select';arEvent('touches arrive through XR select');}AR.xrSrc=e.inputSource;AR.xrPt=pt;AR.h.down(synth(pt));}
function arSelEnd(e){if(!AR.xrSrc)return;var pt=arSelPoint(e.frame,e.inputSource)||AR.xrPt;AR.xrSrc=null;if(AR.domInput){delete ptr[9001];delete AR.ptr[9001];AR.btnDown=null;return;}AR.h.up(synth(pt));}
/* ---- buttons drawn in the scene, fixed in front of the camera along the bottom of the view ---- */
function sceneButtons(){var ph=SG.phase,o=[],me=SG.sides[0];function b(id,label,on){o.push({id:id,label:label,on:!!on});}
  if(AR.jumped){b('fine','Table is fine');b('replace','Re-place table');}
  else if(AR.state!=='locked'){if(AR.state==='placed'){b('arL','Turn <');b('arR','Turn >');b('smaller','Smaller');b('bigger','Bigger');b('lock','Lock table');}}
  else if(ph==='start'){if(hasDom&&E('arAsk').style.display==='flex'){b('cards','Card layout');b('plain','Usual table');}}
  else if(ph==='build'){b('bL','Turn <');b('bR','Turn >');b('undo','Undo');b('done','Done');b('replace','Re-place table');}
  else if(ph==='ready'){b('start','Start battle');b('replace','Re-place table');}
  else if(ph==='over'){b('again','Play again');}
  else if(V2()&&me){if(me.tool==='lobber'){   /* aiming: the lobber, its ammo (short and compact), then back to the orders */
      if(lobbersOf(0).length>1)b('lsel','Lobber '+((me.lsel||0)+1)+'/'+lobbersOf(0).length,true);AMMO_ORDER.forEach(function(id){var st=AMMO[id].store?' x'+(me[AMMO[id].store]||0):((AMMO[id].cd&&(me.cd[id]||0)>0)?' '+Math.ceil(me.cd[id])+'s':'');b('am_'+id,AMMO[id].short+st,me.ammo===id);});
      if(!AMMO[me.ammo].flat)b('high','High lob',me.high);b('lobber','Orders');}
    else{b('o_hill','Hill '+me.plan.hill);b('o_raid','Raid '+me.plan.raid);b('o_guard','Guard '+me.plan.guard);b('o_mend','Mend '+me.plan.mend);b('lobber','Lobber');}
    b('pause',SG.paused?'Go on':'Pause',SG.paused);if(SG.paused)b('replace','Re-place table');}
  else{b('squad','Squad',me&&me.tool==='squad');b('lobber','Lobber',me&&me.tool==='lobber');b('mend','Mend',me&&me.tool==='mend');b('pause',SG.paused?'Go on':'Pause',SG.paused);if(SG.paused)b('replace','Re-place table');}
  if(SG.dev)b('log','Copy log');b('exit','Exit AR');return o;}
function sceneAct(id){arEvent('scene button '+id);
  if(id==='exit')SG.arLeave();else if(id==='lock')SG.arLock();else if(id==='arL')SG.arTurn(PI/12);else if(id==='arR')SG.arTurn(-PI/12);else if(id==='smaller')SG.arResize(AR.size-10);else if(id==='bigger')SG.arResize(AR.size+10);
  else if(id==='fine')SG.arJumpFine();else if(id==='replace')SG.arReplace();else if(id==='cards')E('arCards').onclick();else if(id==='plain')arBegin();
  else if(id==='bL')SG.turn(PI/12);else if(id==='bR')SG.turn(-PI/12);else if(id==='undo')SG.undo();else if(id==='done')SG.done();else if(id==='start')SG.begin();else if(id==='again')SG.arAgain();
  else if(id==='high')SG.sides[0].high=!SG.sides[0].high;else if(id.indexOf('o_')===0)SG.bumpPlan(0,id.slice(2));else if(id==='lsel')SG.nextLobber(0);else if(id.indexOf('am_')===0)SG.setAmmo(0,id.slice(3));else if(id==='lobber'&&V2())SG.setTool(SG.sides[0].tool==='lobber'?'squad':'lobber');
  else if(id==='squad'||id==='lobber'||id==='mend')SG.setTool(id);else if(id==='pause'){SG.paused=!SG.paused;lastHud='';}else if(id==='log')SG.arCopyLog();ui();}
SG.arJumpFine=function(){AR.jumped=false;arEvent('player says the table is fine');if(hasDom)E('arJump').style.display='none';if(AR.replacePaused){SG.paused=false;AR.replacePaused=false;}ui();};
/* after a match in AR: the table stays locked, the title choices are skipped */
SG.arAgain=function(){if(!AR.on){SG.reset();return;}arBegin();};
function sceneTex(label,on,wide){var c=document.createElement('canvas');c.width=wide?1024:320;c.height=wide?96:112;var g=c.getContext('2d'),r=22;g.fillStyle=wide?'rgba(255,248,234,.94)':(on?'#e8842c':'rgba(58,40,26,.92)');g.strokeStyle=wide?'#3a281a':'#ffd9a8';g.lineWidth=6;
  g.beginPath();g.moveTo(r,3);g.lineTo(c.width-r,3);g.quadraticCurveTo(c.width-3,3,c.width-3,r);g.lineTo(c.width-3,c.height-r);g.quadraticCurveTo(c.width-3,c.height-3,c.width-r,c.height-3);g.lineTo(r,c.height-3);g.quadraticCurveTo(3,c.height-3,3,c.height-r);g.lineTo(3,r);g.quadraticCurveTo(3,3,r,3);g.closePath();g.fill();g.stroke();
  g.fillStyle=wide?'#3a281a':'#fff3df';g.font='bold '+(wide?44:40)+'px system-ui,-apple-system,sans-serif';g.textAlign='center';g.textBaseline='middle';var t=label;while(g.measureText(t).width>c.width-30&&t.length>4)t=t.slice(0,-2);g.fillText(t,c.width/2,c.height/2+2);
  var tx=new THREE.CanvasTexture(c);tx.encoding=THREE.sRGBEncoding;return tx;}
function sceneUiFrame(){
  if(!V.sui){V.sui=new THREE.Group();V.sui.matrixAutoUpdate=false;SCN.add(V.sui);V.sbtn=[];V.stex={};V.sgeo=new THREE.PlaneGeometry(1,1);
    V.stext=new THREE.Mesh(V.sgeo,new THREE.MeshBasicMaterial({transparent:true,depthTest:false}));V.stext.renderOrder=998;V.sui.add(V.stext);}
  var list=sceneButtons(),P=arCam.projectionMatrix.elements,D=.5,hw=D/P[0],hh=D/P[5],n=list.length,bh=hh*.17,bw=Math.min(2*hw*.97/Math.max(1,n),bh*3.1),i;
  V.sui.visible=true;V.sui.matrix.copy(arCam.matrixWorld);V.sui.matrixWorld.copy(arCam.matrixWorld);
  for(i=0;i<Math.max(n,V.sbtn.length);i++){var m=V.sbtn[i];if(!m){m=V.sbtn[i]=new THREE.Mesh(V.sgeo,new THREE.MeshBasicMaterial({transparent:true,depthTest:false}));m.renderOrder=999;V.sui.add(m);}
    if(i>=n){m.visible=false;m.userData.id='';continue;}var b=list[i],key=b.label+'|'+b.on;if(m.userData.key!==key){m.material.map=V.stex[key]||(V.stex[key]=sceneTex(b.label,b.on));m.material.needsUpdate=true;m.userData.key=key;}
    m.userData.id=b.id;m.visible=true;m.position.set((i-(n-1)/2)*bw,-hh+bh*.72,-D);m.scale.set(bw*.94,bh,1);m.updateMatrix();m.matrixWorld.multiplyMatrices(V.sui.matrixWorld,m.matrix);}
  /* one line of news above the buttons: what the page's own text line would say */
  var ph=SG.phase,a=SG.sides[0],txt=AR.jumped?'The view jumped. Is the table still in place?':(AR.lost?'Tracking lost. Point the iPad at the table':(AR.state!=='locked'?(AR.state==='find'?(AR.hit?'Tap to put the table centre on the ring':'Find your table: point the iPad at it'):'Turn and size it, then Lock table ('+AR.size+' cm)'):
    (!a?'':(ph==='build'?fmt(SG.time)+' · ':(ph==='fight'||ph==='mend'||ph==='count'?NAME[a.team]+' '+Math.round(a.score)+' : '+Math.round(SG.sides[1].score)+' '+NAME[SG.sides[1].team]+' · '+(ph==='count'?Math.max(1,Math.ceil(SG.time)):fmt(SG.time))+' · ':''))+(ph==='over'?NAME[SG.sides[SG.winner].team]+' wins!':(ph==='ready'?'Camp ready':(SG.paused?'Paused':lineFor(0).text))))));
  if(V.stext.userData.key!==txt){if(V.stext.material.map)V.stext.material.map.dispose();V.stext.material.map=sceneTex(txt,false,true);V.stext.material.needsUpdate=true;V.stext.userData.key=txt;}
  V.stext.visible=!!txt;V.stext.position.set(0,-hh+bh*1.72,-D);V.stext.scale.set(Math.min(2*hw*.9,bh*.62*10.6),bh*.62,1);V.stext.updateMatrix();V.stext.matrixWorld.multiplyMatrices(V.sui.matrixWorld,V.stext.matrix);}
/* which scene button a screen point is on: the same ray as every other tap */
function sceneButtonAt(px,py){if(!V.sui||!V.sui.visible)return '';v2.set(px/W*2-1,-(py/H)*2+1);ray.setFromCamera(v2,arCam);var hit=ray.intersectObjects(V.sbtn.filter(function(m){return m.visible;}),false);return hit.length?hit[0].object.userData.id:'';}
SG.sceneButtonAt=sceneButtonAt;
/* where a scene button is on the screen (for tests) */
SG.sceneButtonXY=function(id){if(!V.sbtn)return null;for(var i=0;i<V.sbtn.length;i++){var m=V.sbtn[i];if(m.visible&&m.userData.id===id){var v=new THREE.Vector3().setFromMatrixPosition(m.matrixWorld).project(arCam);return {x:(v.x*.5+.5)*W,y:(-v.y*.5+.5)*H};}}return null;};
/* ---- the AR log: numbers and short texts only, never a camera picture or anything about the room ---- */
SG.arLogData=function(){var ses=AR.session,feat=null;try{feat=ses&&ses.enabledFeatures?Array.prototype.slice.call(ses.enabledFeatures):null;}catch(e){}
  return {kind:'round-table-kingdom-ar-log',build:BUILD,userAgent:typeof navigator!=='undefined'?navigator.userAgent:'',featuresAsked:{required:['hit-test'],optional:['dom-overlay','anchors']},featuresGranted:feat||'not reported by this device',
    overlay:AR.overlay,inSceneButtons:AR.sceneUi,inputPath:AR.inputPath,xrSelects:AR.selN,anchorKind:AR.anchorKind,state:AR.state,tableSizeCm:AR.size,fpsAverage:AR.fN?+(1000/(AR.fSum/AR.fN)).toFixed(1):0,worstFrameMs:+AR.fWorst.toFixed(0),hitTestsPerSecond:AR.hps,
    shadows:!AR.shadowsOff,drawCalls:R?R.info.render.calls:0,canvas:R?{width:R.domElement.width,height:R.domElement.height,cssWidth:W,cssHeight:H}:null,events:AR.log.slice(),pageErrors:AR.errors.slice(0,20),phase:SG.phase,error:AR.error};};
SG.arCopyLog=function(){var t=JSON.stringify(SG.arLogData(),null,1),ta=E('logText');ta.value=t;ta.style.display='block';ta.focus();ta.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}
  function said(o){E('bLog').textContent=o?'Copied · hide':'Select all, copy · hide';}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(function(){said(true);},function(){said(ok);});else said(ok);return t;};

/* ================= input: touch and mouse ================= */
var ray,plane,v2,v3,ptr={};
/* A screen point becomes a ray from the camera (the XR camera in AR) into the plane of the table; the answer is in the table's own units. */
function ground(px,py){var cam=AR.on?arCam:C;S.updateMatrixWorld();v2.set(px/W*2-1,-(py/H)*2+1);ray.setFromCamera(v2,cam);plane.constant=-S.position.y;if(!ray.ray.intersectPlane(plane,v3))return null;S.worldToLocal(v3);return {x:v3.x,z:v3.z};}
SG.screen=function(x,z,y){S.updateMatrixWorld();var p=S.localToWorld(new THREE.Vector3(x,y||0,z)).project(AR.on?arCam:C);return {x:(p.x*.5+.5)*W,y:(-p.y*.5+.5)*H};};
SG.ground=ground;
function slotAt(px,py,s){var best=-1,bd=38;SG.sides[s].kit.forEach(function(k,i){if(k.used)return;var q=SG.screen(k.x,k.z,.07),d=Math.sqrt((q.x-px)*(q.x-px)+(q.y-py)*(q.y-py));if(d<bd){bd=d;best=i;}});return best;}
/* Every touch belongs to the side whose half it started in (two players), or to the front side (one player).
   Touches are tracked one by one by pointerId, so both players can drag at the same time. */
SG.setTool=function(t,s){var side=SG.sides[s||0];if(!side)return;side.tool=t;side.aim.on=false;ui();};
function sideAt(g){return SG.mode==='table'?campAt(g.x,g.z):0;}
function mineDown(s,skip){var o=[];for(var k in ptr)if(ptr[k].s===s&&k!==String(skip))o.push(ptr[k]);return o;}
function pullTarget(s,from,g){var l=lobberOf(s);if(!l||!from)return null;var dx=from.x-g.x,dz=from.z-g.z,d=Math.sqrt(dx*dx+dz*dz);if(d<.12)return null;var pw=Math.min(6.2,d*2.6);return {x:l.x+dx/d*pw,z:l.z+dz/d*pw};}
function damagedAt(g,s){var best=null,bd=.45;SG.damaged(s).forEach(function(p){var d=boxDist(p,g.x,g.z);p.ps.forEach(function(q){if(q.st==='off')d=Math.min(d,dist(q.rx,q.rz,g.x,g.z));});if(d<bd){bd=d;best=p;}});return best;}
function initInput(){
  ray=new THREE.Raycaster();plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);v2=new THREE.Vector2();v3=new THREE.Vector3();var el=R.domElement;
  function down(e){soundOn();if(e.target!==el&&e.target!==E('ui'))return;if(AR.on&&!e.xr){if(!AR.domInput)arEvent('touches arrive through the page');AR.domInput=true;AR.inputPath='page touches';}
    if(AR.on&&AR.sceneUi){var sb=sceneButtonAt(e.clientX,e.clientY);if(sb){AR.btnDown={id:sb,ptr:e.pointerId};return;}}
    if(AR.on&&AR.jumped)return;if(AR.on&&AR.state!=='locked'){arDown(e);return;}if(SG.mode==='lab'&&SG.phase!=='start'){if(!AR.on)labDown(e);return;}var ph=SG.phase;if(SG.paused||!SG.sides.length)return;var g=ground(e.clientX,e.clientY);if(!g)return;var s=sideAt(g),side=SG.sides[s];if(!side.human)return;
    e.preventDefault();try{e.target.setPointerCapture(e.pointerId);}catch(err){}
    var P=ptr[e.pointerId]={s:s,x:e.clientX,y:e.clientY,kind:'tap',from:g},others=mineDown(s,e.pointerId);
    if(ph==='build'){if(side.ready)return;if(others.length===1){P.kind='twist';others[0].kind='twist';side.twist=Math.atan2(P.y-others[0].y,P.x-others[0].x);return;}
      var ds=slotAt(e.clientX,e.clientY,s);P.kind='ghost';if(ds>=0)SG.select(ds,s);else if(side.sel>=0)SG.moveGhost(g.x,g.z,s);}
    else if(ph==='fight'){var ls=lobbersOf(s),nr=-1,nd=.45;ls.forEach(function(q,i){var dd=dist(g.x,g.z,q.x,q.z);if(dd<nd){nd=dd;nr=i;}});
      if(ls.length>1&&nr>=0){side.lsel=nr;side.tool='lobber';P.kind='aim';side.aim.on=false;ui();}   /* two lobbers: touching one chooses it (and the lobber tool), then drag back to fire it */
      else{var l=lobberOf(s);if(l&&(side.tool==='lobber'||dist(g.x,g.z,l.x,l.z)<.45)){P.kind='aim';side.aim.on=false;}}}}
  function move(e){if(AR.on&&AR.state!=='locked'){arMove(e);return;}if(SG.mode==='lab'&&SG.phase!=='start'){labMove(e);return;}var ph=SG.phase,P=ptr[e.pointerId];if(SG.paused||!SG.sides.length)return;
    if(!P){ /* a mouse hovering, one-player game only: the ghost follows it */
      if(e.pointerType==='mouse'&&SG.mode!=='table'&&ph==='build'&&SG.sides[0].human&&SG.sides[0].sel>=0){var gh=ground(e.clientX,e.clientY);if(gh)SG.moveGhost(gh.x,gh.z,0);}return;}
    P.x=e.clientX;P.y=e.clientY;var s=P.s,side=SG.sides[s],g=ground(e.clientX,e.clientY);
    if(ph==='build'){if(P.kind==='twist'){var o=mineDown(s,e.pointerId)[0];if(o&&side.sel>=0){var a=Math.atan2(P.y-o.y,P.x-o.x),d=a-side.twist;while(d>PI)d-=2*PI;while(d<-PI)d+=2*PI;side.twist=a;SG.turn(-d,s);}return;}
      if(P.kind==='ghost'&&side.sel>=0&&g)SG.moveGhost(g.x,g.z,s);}
    else if(ph==='fight'&&P.kind==='aim'&&g){var t=pullTarget(s,P.from,g);if(t){side.aim.on=true;side.aim.tx=t.x;side.aim.tz=t.z;}else side.aim.on=false;}}
  function up(e){if(AR.btnDown&&AR.btnDown.ptr===e.pointerId){var bid=AR.btnDown.id;AR.btnDown=null;if(sceneButtonAt(e.clientX,e.clientY)===bid)sceneAct(bid);return;}
    if(AR.on&&AR.state!=='locked'){arUp(e);return;}if(SG.mode==='lab'&&SG.phase!=='start'){labUp(e);return;}var P=ptr[e.pointerId];if(!P)return;delete ptr[e.pointerId];var ph=SG.phase,s=P.s,side=SG.sides[s];if(SG.paused||!side||!side.human)return;var g=ground(e.clientX,e.clientY);
    if(ph==='build'){if(P.kind!=='ghost'||side.ready)return;var sl=slotAt(e.clientX,e.clientY,s);if(sl>=0){SG.select(sl,s);return;}if(side.sel>=0&&g)SG.tryPlace(g.x,g.z,null,s);return;}
    if(ph!=='fight'&&ph!=='mend'&&ph!=='count')return;
    if(P.kind==='aim'){var was=side.aim.on;side.aim.on=false;if(was){var blk=SG.lobberBlock(s);if(blk)say('wait',({winding:'Still winding…',crew:'No mouse at the lobber yet',broken:'The lobber is broken',none:'No lobber'})[blk]||blockText(blk,s),true,s);else SG.fire(s,side.aim.tx,side.aim.tz);return;}if(side.tool==='lobber')return;}
    if(!g)return;if(SG.mode==='table'&&sideAt(g)!==s){var lo=P.from,hi=g;for(var bi=0;bi<12;bi++){var md={x:(lo.x+hi.x)/2,z:(lo.z+hi.z)/2};if(sideAt(md)===s)lo=md;else hi=md;}g=lo;}   /* in the two-player game an order stays in your own half */
    var dp=damagedAt(g,s);
    if(side.tool==='mend'){if(dp){if(SG.mend(s,dp.id))say('mend','A mouse is going to mend it',false,s);else say('nomend','No free mouse, or nothing left to mend',true,s);}else say('nomend','Tap a piece with a part knocked off',true,s);return;}
    if(dp&&SG.mend(s,dp.id)){say('mend','A mouse is going to mend it',false,s);return;}
    SG.order(s,g.x,g.z);}
  function cancel(e){if(SG.mode==='lab'){labCancel(e);}var P=ptr[e.pointerId];if(P&&SG.sides[P.s])SG.sides[P.s].aim.on=false;delete ptr[e.pointerId];delete AR.ptr[e.pointerId];}
  AR.h={down:down,move:move,up:up};
  [el,E('ui')].forEach(function(t){t.addEventListener('pointerdown',down);t.addEventListener('pointermove',move);t.addEventListener('pointerup',up);t.addEventListener('pointercancel',cancel);});
  addEventListener('keydown',function(e){if(SG.mode==='lab'&&SG.phase!=='start'){labKey(e);return;}var k=e.key.toLowerCase();if(k==='q')SG.turn(PI/12);else if(k==='e')SG.turn(-PI/12);else if(k==='z')SG.undo();else if(k==='escape')SG.select(-1);else if(k==='enter'&&SG.sel>=0)SG.tryPlace(SG.ghost.x,SG.ghost.z);
    else if(k==='l')SG.nextLobber(0);else if(k==='1')SG.setTool('squad');else if(k==='2')SG.setTool('lobber');else if(k==='3')SG.setTool('mend');else if(k==='p')SG.paused=!SG.paused;else if(k==='c')SG.setCam(SG.cam+1);else if(k==='m')SG.setMute(!SG.muted);});
  E('bL').onclick=function(){SG.turn(PI/12);};E('bR').onclick=function(){SG.turn(-PI/12);};E('bUndo').onclick=function(){SG.undo();};E('bDone').onclick=function(){SG.done();};
  E('b_squad').onclick=function(){SG.setTool('squad');};E('b_lobber').onclick=function(){SG.setTool('lobber');};E('b_mend').onclick=function(){SG.setTool('mend');};E('bPause').onclick=function(){SG.paused=!SG.paused;lastHud='';ui();};
  E('bCam').onclick=function(){SG.setCam(SG.cam+1);};E('bStart').onclick=function(){SG.begin();};
  ORDERS.forEach(function(o){E('o_'+o).onclick=function(){var me=SG.sides[0];me.pick=me.pick===o?'':o;ui();};});
  [0,1,2,3,4,5].forEach(function(nn){E('n'+nn).onclick=function(){var me=SG.sides[0];if(me.pick){SG.setPlan(0,me.pick,nn);me.pick='';ui();}};});
  E('b_high').onclick=function(){var me=SG.sides[0];me.high=!me.high;ui();};
  E('b2_lobber').onclick=function(){SG.setTool(SG.sides[0].tool==='lobber'?'squad':'lobber');};E('b_lsel').onclick=function(){SG.nextLobber(0);};
  AMMO_ORDER.forEach(function(id){var b=document.createElement('button');b.className='btn ammo';b.id='a_'+id;b.innerHTML='<span class="ai">'+AMMO[id].icon+'</span><span class="an">'+AMMO[id].name+'</span><span class="ac"></span>';E('arow').insertBefore(b,E('b_high'));b.onclick=function(){SG.setAmmo(0,id);};});E('bPauseB').onclick=function(){SG.paused=!SG.paused;lastHud='';ui();};
  E('bMute').onclick=function(){soundOn();SG.setMute(!SG.muted);};E('bTilt').onclick=function(){SG.setTilt(SG.tilt?0:18);};E('bPause2').onclick=function(){SG.paused=!SG.paused;};
  document.addEventListener('pointerdown',soundOn,true);
  /* the two-player panels: one at each player's edge, the far one turned round. Buttons answer on touch-down, so both players can press at once. */
  for(var s2=0;s2<2;s2++)(function(s){var d=document.createElement('div');d.className='pp'+(s?' flip':'');d.id='pp'+s;
    d.innerHTML='<div class="pill meter"><span></span><div class="m"><i></i></div></div><div class="psay"></div><div class="pbtns"><button class="btn" data-a="L">⟲</button><button class="btn" data-a="R">⟳</button><button class="btn" data-a="undo">Undo</button><button class="btn go" data-a="ready">Ready</button>'+
      '<button class="btn" data-a="squad">👉 Squad</button><button class="btn" data-a="o_hill">🚩</button><button class="btn" data-a="o_raid">⚔️</button><button class="btn" data-a="o_guard">🛡</button><button class="btn" data-a="o_mend">🔨</button><button class="btn" data-a="lobber">🔮 Lobber</button><button class="btn" data-a="lsel">Lobber 1 / 2</button><button class="btn" data-a="mend">🔨 Mend</button></div><div class="pammo"></div><div class="pbig"></div><div class="pcard"><h2></h2><p></p><button class="btn go" data-a="again">Play again</button></div>';
    d.querySelector('.pammo').innerHTML=AMMO_ORDER.map(function(id){return '<button class="btn ammo" data-a="am_'+id+'"><span class="ai">'+AMMO[id].icon+'</span><span class="an">'+AMMO[id].name+'</span><span class="ac"></span></button>';}).join('');
    E('ui').appendChild(d);
    d.addEventListener('pointerdown',function(e){var b=e.target.closest?e.target.closest('button'):null;if(!b)return;e.preventDefault();e.stopPropagation();soundOn();var a=b.getAttribute('data-a');
      if(a==='L')SG.turn(PI/12,s);else if(a==='R')SG.turn(-PI/12,s);else if(a==='undo')SG.undo(s);else if(a==='ready')SG.done(s);else if(a==='again')SG.reset();
      else if(a.indexOf('o_')===0)SG.bumpPlan(s,a.slice(2));else if(a==='lsel')SG.nextLobber(s);else if(a.indexOf('am_')===0)SG.setAmmo(s,a.slice(3));
      else if(a==='lobber'&&V2())SG.setTool(SG.sides[s].tool==='lobber'?'squad':'lobber',s);else SG.setTool(a,s);});})(s2);
  var pick='blue',lvl='easy',mode='solo';SG.pick=function(){return {team:pick,level:lvl};};arInitUi();
  if(SG.savedCardLayout()){E('bCards').style.display='inline-block';E('bCards').onclick=function(){var on=SG.layout.custom&&SG.layoutFrom==='cards',n=E('layoutNote');n.style.display='block';
    if(on){SG.clearLayout();SG.layoutFrom='';E('bCards').className='btn';n.textContent='Using the usual table.';return;}
    var r=SG.applyLayout(SG.savedCardLayout());if(r.ok){SG.layoutFrom='cards';E('bCards').className='btn on';n.textContent='Using your card layout.';}else n.textContent='Your card layout cannot be used: '+r.reason+' Using the usual table.';};}
  E('m_solo').onclick=function(){mode='solo';choose(['m_solo','m_table'],'m_solo');E('soloOpts').style.display='block';E('tableNote').style.display='none';};
  E('m_table').onclick=function(){mode='table';choose(['m_solo','m_table'],'m_table');E('soloOpts').style.display='none';E('tableNote').style.display='block';};
  function choose(ids,on){ids.forEach(function(id){E(id).className='btn'+(id===on?' on':'');});}
  E('tBlue').onclick=function(){pick='blue';choose(['tBlue','tRed'],'tBlue');};E('tRed').onclick=function(){pick='red';choose(['tBlue','tRed'],'tRed');};
  ['easy','normal','hard'].forEach(function(l){E('l_'+l).onclick=function(){lvl=l;choose(['l_easy','l_normal','l_hard'],'l_'+l);};});
  ['small','medium','large'].forEach(function(z){E('z_'+z).onclick=function(){SG.piecesDefault=z;choose(['z_small','z_medium','z_large'],'z_'+z);};});if(SG.rulesDefault===1)E('zRow').style.display='none';
  E('bPlay').onclick=function(){SG.paused=false;SG.cam=0;var dn=E('designSel')?E('designSel').value:'',dz=dn?SG.labDesigns()[dn]:null;SG.start(pick,{level:lvl,mode:mode,design:dz||null});};
  E('m_lab').onclick=function(){soundOn();SG.paused=false;SG.cam=0;SG.labStart();};
  E('designSel').onchange=function(){SG.designChoice=E('designSel').value;};E('bAgain').onclick=function(){SG.reset();};
  addEventListener('resize',function(){W=innerWidth;H=innerHeight;if(!AR.on)R.setSize(W,H);});}

/* ================= THE LAB: a shooting range and building sandbox =================
   SG.mode === 'lab'. It is the same page, the same pieces, the same AMMO table and the same blast, support and collapse code as a match.
   What the Lab changes is only what a match demands and a sandbox must not: no timer, no rounds, no score, no bot, no hill, no win, free kit,
   free ammunition. Where it must reach into the real code it does so through a few marked hooks (search "lab" in this file); none of them
   changes a match. The phase stays 'fight' the whole time, so every rule that needs a fight (aiming, firing, the blast, collapses) runs as it does in a match.
   Everything the Lab adds lives in this section. LAB.md says how to use it and how to add a prototype. */
var LAB_KINDS=Object.keys(FOOT0),LAB_ICON={wall:'🧱',gate:'🚪',tower:'🏰',brace:'📐',lobber:'🔮',tent:'⛺',workshop:'🔨',trap:'🪤'},LAB_NAME={tower:'Keep',trap:'Spring trap'};
var LAB_PREFS='rtk.lab.prefs.v1',LAB_DESIGNS='rtk.lab.designs.v1',LAB_SEEN='rtk.lab.seen.v1',LAB_FLAGSKEY='rtk.lab.flags.v1',LAB_GUNR=3.15;
function labName(k){return LAB_NAME[k]||(k.charAt(0).toUpperCase()+k.slice(1));}
/* localStorage, always inside try/catch (it can be missing or full): labStore(key) reads, labStore(key,value) writes */
function labStore(k,v){try{if(v===undefined){var t=window.localStorage.getItem(k);return t?JSON.parse(t):null;}window.localStorage.setItem(k,JSON.stringify(v));}catch(e){}return null;}

/* ---- prototype slots. A prototype is an idea that can be switched on in the Lab only. See LAB.md. ---- */
var LAB_PROTOS={wind:{name:'Wind (not built)',note:'A stub: it shows where a prototype plugs in and does nothing yet.',hooks:{}}},LAB_FLAGS={};
SG.labProtos=LAB_PROTOS;SG.labFlags=LAB_FLAGS;
/* one hook point: every switched-on prototype that has this hook gets the value and may return a changed one. Outside the Lab nothing runs. */
function labProto(hook,v,a){if(SG.mode!=='lab')return v;for(var id in LAB_FLAGS){var d=LAB_PROTOS[id],h=d&&d.hooks&&d.hooks[hook];if(h){var r=h(v,a,SG);if(r!==undefined)v=r;}}return v;}
SG.setProto=function(id,on,keep){var d=LAB_PROTOS[id];if(!d)return false;on=!!on;if(!!LAB_FLAGS[id]!==on){if(on){LAB_FLAGS[id]=true;if(d.on)d.on(SG);}else{delete LAB_FLAGS[id];if(d.off)d.off(SG);}}
  if(keep!==false){var sv=labStore(LAB_FLAGSKEY)||{};sv[id]=on;labStore(LAB_FLAGSKEY,sv);}if(SG.lab)labUi();return on;};
SG.addProto=function(id,def){LAB_PROTOS[id]=def;if(SG.lab)labUi();};
/* leaving the Lab (or starting a match) puts every switched-on prototype back: a match never sees one */
function labProtosOff(){Object.keys(LAB_FLAGS).forEach(function(id){SG.setProto(id,false,false);});}
function labProtosOn(){var sv=labStore(LAB_FLAGSKEY)||{};Object.keys(sv).forEach(function(id){if(sv[id]&&LAB_PROTOS[id])SG.setProto(id,true,false);});}

/* ---- state ---- */
function labFresh(){var P=labStore(LAB_PREFS)||{};function pv(k,d){return P[k]==null?d:P[k];}
  return {instant:pv('instant',true),quick:pv('quick',true),crew:pv('crew',false),strict:pv('strict',false),supports:pv('supports',false),panel:pv('panel',true),read:pv('read',true),slow:false,
    tool:'build',kind:'wall',ammo:'marble',high:false,ghost:{on:false,x:0,z:2,rot:PI,ok:false,code:'',text:'',sx:0,sz:0,kind:'wall',side:0},carry:null,sel:0,fire:{s:0,li:0},
    gun:{id:-7,kind:'lobber',x:0,z:LAB_GUNR,rot:PI,built:true,ps:[],total:0,parts:0,side:0,reload:0,crew:-1,fired:-9,aim:null,x1:0},gunAim:null,spot:null,
    undo:[],redo:[],uid:0,target:'empty',saved:[[],[]],snap:null,last:null,cur:null,landings:[],fellLog:[],msg:{text:'',until:0,bad:false},sess:{keeps:0},base:{partsOff:0,collapses:0,dizzies:0,shots:0},rkey:'',card:false};}
function labPrefs(){var L=SG.lab;labStore(LAB_PREFS,{instant:L.instant,quick:L.quick,crew:L.crew,strict:L.strict,supports:L.supports,panel:L.panel,read:L.read});}
function labMsg(text,bad){var L=SG.lab;if(!L)return;L.msg={text:text,until:SG.clock+2.8,bad:!!bad};}
function labInit(){
  SG.lab=labFresh();var L=SG.lab;SG.clearLayout();
  SG.phase='fight';SG.time=1e6;SG.round=1;SG.cam=0;SG.hold=!!SG.hold;
  SG.sides.forEach(function(sd){sd.sel=-1;sd.big=99;sd.tool='lobber';sd.crew=-1;});
  SG.mice.forEach(function(m){m.state='idle';m.job=0;m.part=-1;});
  /* my camp starts with a Keep and two lobbers, so there is something to fire from; erase them if you like */
  labSetSide(0,labStarter(),true);
  labLoadTarget('walled',true);
  L.undo=[];L.redo=[];labProtosOn();L.base=labBase();L.card=!labStore(LAB_SEEN);
  SG.lab.onKey=function(){};ui();}
SG.labDraw=function(){return V.lab;};   /* the Lab's own three.js objects, for tests */
SG.labStart=function(){SG.start('blue',{mode:'lab',seed:777});};
SG.labBack=function(){SG.lab=null;labProtosOff();SG.speed=1;SG.paused=false;SG.reset();};
function labBase(){var st=SG.stats;return {partsOff:st.partsOff,collapses:st.collapses,dizzies:st.dizzies,shots:st.shots};}

/* ---- pieces: records, placing, removing ---- */
/* vari: which of the three looks of a piece it has (in a match it follows the piece's id). The Lab keeps it with the piece's uid, so a rebuilt camp is the same camp, plank for plank. */
function labRec(p){return {kind:p.kind,x:p.x,z:p.z,rot:p.rot,side:p.side,uid:p.uid,vari:p.vari};}
/* where a camp-frame spot is on the table: the same frame the presets use (x across, z toward the camp's back) */
function labCampRecs(s,list){return list.map(function(q){var w=w2(s,q[1],q[2]);return {kind:q[0],side:s,x:w[0],z:w[1],rot:q[3]+phiOf(s)};});}
/* a slot in the side's kit, so a piece placed in the Lab has a place the mice fetch it from while they build it */
function labSlot(s,kind){var side=SG.sides[s],L=SG.lab,w=w2(s,((L.uid%5)-2)*.34,2.72),sl={kind:kind,a:0,x:w[0],z:w[1],px:w[0],pz:w[1],used:true,picked:false};side.kit.push(sl);return side.kit.length-1;}
/* make a piece with no questions asked about where (the caller has checked); instant: the mice have already built it */
function labPutRaw(rec,instant){var s=rec.side,p={crew:-1,reload:0,fired:-9,cost:0,id:SG.nextId++,side:s,kind:rec.kind,x:rec.x,z:rec.z,rot:rec.rot,built:false,parts:0,progress:0,slot:0,mouse:-1,picked:false,ps:[],total:0,open:[],uid:rec.uid||++SG.lab.uid};
  p.vari=rec.vari!=null?rec.vari:p.uid%3;p.slot=labSlot(s,rec.kind);SG.pieces.push(p);viewSite(p);if(instant){startObj(p);completePiece(p,false);}gridDirty=true;return p;}
/* which of a side's pieces are its lobbers, tower, tent and workshop: the same assignments completePiece makes, redone after pieces come and go */
function labRepoint(){SG.sides.forEach(function(sd){sd.lobber=sd.lobber2=sd.tent=sd.workshop=sd.keep=0;});
  SG.pieces.forEach(function(p){if(!p.built)return;var sd=SG.sides[p.side];if(p.kind==='lobber'){if(sd.lobber&&sd.lobber!==p.id)sd.lobber2=p.id;else sd.lobber=p.id;}if(p.kind==='tent')sd.tent=p.id;if(p.kind==='workshop')sd.workshop=p.id;if(p.kind==='tower')sd.keep=p.id;});
  SG.pieces.forEach(function(b){if(b.kind==='brace'&&b.built)setProp(b);});
  SG.sides.forEach(function(sd){if(sd.lsel>=lobbersOf(SG.sides.indexOf(sd)).length)sd.lsel=0;});}
function labRemove(p){var i=SG.pieces.indexOf(p);if(i<0)return;SG.pieces.splice(i,1);viewDrop(p);
  SG.mice.forEach(function(m){if(m.job===p.id){m.job=0;m.part=-1;m.state='idle';m.wait=.3;}});if(SG.lab.sel===p.id)SG.lab.sel=0;gridDirty=true;}
function labRemoveSide(s){SG.pieces.filter(function(p){return p.side===s;}).forEach(labRemove);}
function labByUid(u){for(var i=0;i<SG.pieces.length;i++)if(SG.pieces[i].uid===u)return SG.pieces[i];return null;}
/* the intact layout of each side: what Reset target and Heal all rebuild to */
function labSaveSides(){var L=SG.lab;for(var s=0;s<2;s++)L.saved[s]=SG.pieces.filter(function(p){return p.side===s;}).map(labRec);}
/* mice go back to their camp's resting places, steady on their feet */
function labHomeMice(s){fixGrid();SG.mice.forEach(function(m){if(s!=null&&m.side!==s)return;var w=freeSpot(m.side,m.i);m.x=w[0];m.z=w[1];m.tx=w[0];m.tz=w[1];m.hx=w[0];m.hz=w[1];m.path=null;m.state='idle';m.job=0;m.part=-1;m.t=0;m.slowT=0;m.q=0;m.crewing=false;m.goal=false;m.speed=0;m.rot=phiOf(m.side)+PI;});}
function labSettleView(){labRepoint();fixGrid();}
/* replace one side's pieces by these records, all built at once */
function labSetSide(s,recs,instant){labRemoveSide(s);var order=recs.filter(function(r){return r.kind!=='brace';}).concat(recs.filter(function(r){return r.kind==='brace';}));
  order.forEach(function(r){r.side=s;labPutRaw(r,instant!==false);});SG.debris=[];SG.puddles=[];labRepoint();labSaveSides();labHomeMice(s);}
/* put these piece records on one side, built at once (for tests and for loading a camp from a match) */
SG.labLoadRecs=function(s,recs){labSetSide(s,recs.map(function(r){return Object.assign({},r);}),true);ui();};
SG.labReset=function(s){var L=SG.lab;labSetSide(s,L.saved[s].map(function(r){return Object.assign({},r);}),true);labMsg(s?'Target camp rebuilt':'My camp rebuilt',false);ui();};
SG.labHeal=function(){var L=SG.lab;[0,1].forEach(function(s){labSetSide(s,L.saved[s].map(function(r){return Object.assign({},r);}),true);});SG.marbles=[];labMsg('Everything mended',false);ui();};
/* a plain description of what is on the table now, for comparing */
SG.labState=function(s){return SG.pieces.filter(function(p){return s==null||p.side===s;}).map(function(p){return {kind:p.kind,side:p.side,x:+p.x.toFixed(4),z:+p.z.toFixed(4),rot:+p.rot.toFixed(4),built:p.built,parts:p.parts,total:p.total,off:p.ps.filter(function(q){return q.st!=='on';}).map(function(q){return q.id;}),down:!!p.down};}).sort(function(a,b){return a.side-b.side||(a.kind<b.kind?-1:a.kind>b.kind?1:0)||a.x-b.x||a.z-b.z;});};

/* ---- checking a spot, then placing ---- */
/* is this spot good for this piece? The rules are the real ones: overlap, a brace leaning on something, a snap to a neighbouring wall end. The zone and hill rules apply only with "match zones only". */
function labSpot(kind,x,z,rot){var s=campAt(x,z),sn=snap(s,kind,x,z,rot),c=check(s,kind,sn.x,sn.z,rot);
  if(c.ok&&kind==='lobber'&&SG.pieces.filter(function(p){return p.side===s&&p.kind==='lobber';}).length>=2)c={ok:false,code:'two',text:'Two lobbers a camp, as in a match'};
  return {ok:c.ok,code:c.code,text:c.text,sx:sn.x,sz:sn.z,side:s};}
function labGhostUpdate(){var L=SG.lab,g=L.ghost;if(!g.on)return;var kind=L.carry?L.carry.rec.kind:L.kind,r=labSpot(kind,g.x,g.z,g.rot);g.sx=r.sx;g.sz=r.sz;g.ok=r.ok;g.code=r.code;g.text=r.text;g.kind=kind;g.side=r.side;}
SG.labPlace=function(kind,x,z,rot,uid){var L=SG.lab;if(!L)return {ok:false,text:'Not in the Lab'};var r=labSpot(kind,x,z,rot);if(!r.ok)return {ok:false,code:r.code,text:r.text};
  var p=labPutRaw({kind:kind,x:r.sx,z:r.sz,rot:rot,side:r.side,uid:uid},L.instant);labRepoint();fixGrid();labSaveSides();
  if(!uid){L.undo.push({t:'add',rec:labRec(p)});L.redo=[];}return {ok:true,piece:p};};
SG.labErase=function(p,quiet){var L=SG.lab;if(typeof p==='number')p=labByUid(p);if(!p)return false;if(!quiet){L.undo.push({t:'del',rec:labRec(p)});L.redo=[];}labRemove(p);labRepoint();fixGrid();labSaveSides();return true;};
function labPieceAt(g){var best=null,bd=.11;SG.pieces.forEach(function(p){var d=boxDist(p,g.x,g.z);if(d<bd){bd=d;best=p;}});return best;}
function labDoOp(op,back){var L=SG.lab;
  function put(r){var p=labPutRaw(Object.assign({},r),true);return p;}
  function drop(u){var p=labByUid(u);if(p)labRemove(p);}
  if(op.t==='add'){if(back)drop(op.rec.uid);else put(op.rec);}
  else if(op.t==='del'){if(back)put(op.rec);else drop(op.rec.uid);}
  else if(op.t==='move'){drop(op.to.uid);drop(op.from.uid);put(back?op.from:op.to);}
  else if(op.t==='set'){labSetSide(op.s,(back?op.before:op.after).map(function(r){return Object.assign({},r);}),true);}
  labRepoint();fixGrid();labSaveSides();}
SG.labUndo=function(){var L=SG.lab,op=L.undo.pop();if(!op){labMsg('Nothing to undo',true);return false;}labDoOp(op,true);L.redo.push(op);labMsg('Undone',false);ui();return true;};
SG.labRedo=function(){var L=SG.lab,op=L.redo.pop();if(!op){labMsg('Nothing to redo',true);return false;}labDoOp(op,false);L.undo.push(op);labMsg('Done again',false);ui();return true;};
/* Move tool: lift a piece (it is taken off the table and shown as a ghost), then drop it elsewhere. A lifted piece is put back whole. */
SG.labLift=function(p){var L=SG.lab;if(L.carry||!p)return false;var rec=labRec(p);labRemove(p);labRepoint();fixGrid();L.carry={rec:rec};var g=L.ghost;g.on=true;g.x=rec.x;g.z=rec.z;g.rot=rec.rot;labGhostUpdate();return true;};
SG.labDrop=function(){var L=SG.lab,c=L.carry;if(!c)return {ok:false};var g=L.ghost,r=SG.labPlace(c.rec.kind,g.x,g.z,g.rot,c.rec.uid);
  if(!r.ok){labMsg(r.text,true);return r;}L.undo.push({t:'move',from:c.rec,to:labRec(r.piece)});L.redo=[];L.carry=null;g.on=false;ui();return r;};
SG.labCancelCarry=function(){var L=SG.lab,c=L.carry;if(!c)return false;labPutRaw(Object.assign({},c.rec),true);labRepoint();fixGrid();labSaveSides();L.carry=null;L.ghost.on=false;return true;};

/* my camp's starting layout: a Keep and two lobbers */
function labStarter(){return labCampRecs(0,[['tower',0,2.42,PI],['lobber',-.95,2.05,PI],['lobber',.95,2.05,PI]]);}
/* replace one camp with a set of records, as one step that Undo can take back */
function labSetUndoable(s,recs){var L=SG.lab,before=L.saved[s].map(function(r){return Object.assign({},r);});labSetSide(s,recs,true);L.undo.push({t:'set',s:s,before:before,after:L.saved[s].map(function(r){return Object.assign({},r);})});L.redo=[];ui();}
SG.labStarter=function(){labSetUndoable(0,labStarter());labMsg('My camp: a Keep and two lobbers',false);};
SG.labClearCamp=function(s){labSetUndoable(s,[]);labMsg((s?'Target':'My')+' camp cleared',false);};
/* ---- the target camps ---- */
var LAB_TARGETS=[['empty','Empty'],['walled','Walled Keep'],['braced','Braced Keep'],['longwall','Long wall'],['workshops','Workshop cluster'],['fortress','Fortress'],['glass','Glass house'],['copy','My camp copy']];
/* each template is a list of [kind, x, z, turn] in a camp's own frame (x across, z toward the camp's back; the Keep stands at z 2.42, facing the hill is turn PI). Sizes follow the piece scale. */
function labTemplate(id,s){var F=FOOT,T=PI,out=[],i;
  if(id==='empty')return [];
  if(id==='walled'){var x=F.gate[0]+F.wall[0]+.01;return labCampRecs(s,[['tower',0,2.42,T],['gate',0,1.85,T],['wall',-x,1.85,T],['wall',x,1.85,T]]);}
  if(id==='braced'){var bx=F.tower[0]+F.brace[1]+.015;return labCampRecs(s,[['tower',0,2.42,T],['brace',-bx,2.42,-PI/2],['brace',bx,2.42,PI/2]]);}
  if(id==='longwall'){var sp=F.wall[0]*2+.004,l=[];for(i=0;i<6;i++)l.push(['wall',(i-2.5)*sp,2.0,T]);return labCampRecs(s,l);}
  if(id==='workshops'){var wx=F.workshop[0]+.05,tx=F.tent[0]+.05;return labCampRecs(s,[['workshop',-wx,2.3,T],['workshop',wx,2.3,T],['tent',-tx,1.9,T],['tent',tx,1.9,T],['workshop',0,1.5,T]]);}
  if(id==='glass')return labCampRecs(s,[['tower',0,2.3,T]]);
  if(id==='fortress'){var P=PRESETS.good,l2=[];P.forEach(function(q){var kind=KIT2[q[0]];if(kind==='brace')l2.push([kind,q[1],q[2],q[3]]);else l2.push([kind,Math.sin(q[2])*q[1],Math.cos(q[2])*q[1],q[2]+q[3]]);});return labCampRecs(s,l2);}
  if(id==='copy')return labMirror(0,s);
  return [];}
/* my camp, copied across the table onto the other camp: the same place in that camp's own frame */
function labMirror(from,to){return labFromDesign(labToDesign(from,'copy'),to);}
SG.labLoadTarget=labLoadTarget;
function labLoadTarget(id,quiet){var L=SG.lab,before=L.saved[1].map(function(r){return Object.assign({},r);});labSetSide(1,labTemplate(id,1),true);L.target=id;
  if(!quiet){L.undo.push({t:'set',s:1,before:before,after:L.saved[1].map(function(r){return Object.assign({},r);})});L.redo=[];}
  var nm=LAB_TARGETS.filter(function(t){return t[0]===id;})[0];if(!quiet)labMsg((nm?nm[1]:id)+' loaded into the target camp',false);}
/* the point to aim at by default: the target's Keep, or the middle of what is there, or the middle of the camp */
SG.labDefaultSpot=function(){var ps=SG.pieces.filter(function(p){return p.side===1&&p.built;}),k=ps.filter(function(p){return p.kind==='tower';})[0];if(k)return {x:k.x,z:k.z};
  if(ps.length){var sx=0,sz=0;ps.forEach(function(p){sx+=p.x;sz+=p.z;});return {x:sx/ps.length,z:sz/ps.length};}var w=w2(1,0,2.1);return {x:w[0],z:w[1]};};

/* ---- designs: a camp as a plain record ----
   Like the table-layout record (schema_version 1, a list of placements, each with transform_anchor_relative x_mm, y_mm, yaw_deg and mm_per_unit), but the anchor is
   the camp's own base and the placements are pieces. y_mm is toward the hill, yaw_deg is counter-clockwise from above, 0 = facing the hill (a piece placed as in a match). */
function labToDesign(s,name){var mm=SG.MM_PER_UNIT,out=[];
  SG.pieces.filter(function(p){return p.side===s;}).forEach(function(p){var c=toCamp(s,p.x,p.z),yaw=(p.rot-phiOf(s)-PI)*180/PI;while(yaw>180)yaw-=360;while(yaw<=-180)yaw+=360;
    out.push({kind:p.kind,transform_anchor_relative:{x_mm:+(c[0]*mm).toFixed(2),y_mm:+(-(c[1]-BASE0)*mm).toFixed(2),yaw_deg:+yaw.toFixed(3)}});});
  return {schema_version:1,design_name:name||'My camp',mm_per_unit:mm,frame:'camp',piece_scale:SG.pieceSize,placements:out};}
function labFromDesign(d,s){var mm=+d.mm_per_unit||SG.MM_PER_UNIT;return d.placements.map(function(q){var t=q.transform_anchor_relative,cx=t.x_mm/mm,cz=BASE0-t.y_mm/mm,w=w2(s,cx,cz);return {kind:q.kind,side:s,x:w[0],z:w[1],rot:t.yaw_deg*PI/180+PI+phiOf(s)};});}
/* is this a design we can read? returns '' or the reason */
function labDesignCheck(d){if(!d||typeof d!=='object')return 'It is not a design record';if(d.schema_version!==1)return 'The design must be schema_version 1';if(!Array.isArray(d.placements))return 'The design has no list of placements';
  for(var i=0;i<d.placements.length;i++){var q=d.placements[i],t=q&&q.transform_anchor_relative;if(!q||LAB_KINDS.indexOf(q.kind)<0)return 'Placement '+(i+1)+' is not a piece I know ('+(q&&q.kind)+')';if(!t||!isFinite(+t.x_mm)||!isFinite(+t.y_mm)||!isFinite(+(t.yaw_deg||0)))return 'Placement '+(i+1)+' has a place that is not a number';}
  var mm=+d.mm_per_unit||SG.MM_PER_UNIT;if(!(mm>20&&mm<2000))return 'mm_per_unit is not a sensible number';return '';}
SG.labToDesign=labToDesign;SG.labDesignCheck=labDesignCheck;
SG.labDesigns=function(){var o=labStore(LAB_DESIGNS);return o&&typeof o==='object'?o:{};};
SG.labSaveDesign=function(name){name=String(name||'').replace(/^\s+|\s+$/g,'').slice(0,40);if(!name)return {ok:false,text:'Give the design a name first'};var all=SG.labDesigns();all[name]=labToDesign(0,name);labStore(LAB_DESIGNS,all);return {ok:true,text:'Saved "'+name+'"'};};
SG.labDeleteDesign=function(name){var all=SG.labDesigns();delete all[name];labStore(LAB_DESIGNS,all);};
SG.labLoadDesign=function(d,s){s=s||0;var r=typeof d==='string'?null:d;if(typeof d==='string'){try{r=JSON.parse(d);}catch(e){return {ok:false,text:'That is not readable JSON'};}}
  var bad=labDesignCheck(r);if(bad)return {ok:false,text:bad};var L=SG.lab,before=L.saved[s].map(function(q){return Object.assign({},q);});labSetSide(s,labFromDesign(r,s),true);
  L.undo.push({t:'set',s:s,before:before,after:L.saved[s].map(function(q){return Object.assign({},q);})});L.redo=[];ui();return {ok:true,text:'Loaded "'+(r.design_name||'design')+'" ('+r.placements.length+' pieces)'};};
/* "Use as my camp in a match": at the start of the build step the design is placed through the real build-step rules (zone, overlap, budget). What does not fit is dropped, and the player is told. */
function labDesignToBuild(d){var bad=labDesignCheck(d),res={placed:[],dropped:[]};SG.designResult=res;if(bad||!SG.sides.length||SG.phase!=='build'){if(bad)res.dropped.push({kind:'design',why:bad});return res;}
  var recs=labFromDesign(d,0),tw=recs.filter(function(r){return r.kind==='tower';}),rest=recs.filter(function(r){return r.kind!=='tower';});
  var order=tw.slice(0,1).concat(rest.filter(function(r){return r.kind!=='brace';}),rest.filter(function(r){return r.kind==='brace';}),tw.slice(1));
  order.forEach(function(r){var side=SG.sides[0],slot=-1;side.kit.forEach(function(k,i){if(slot<0&&!k.used&&k.kind===r.kind)slot=i;});
    if(slot<0){res.dropped.push({kind:r.kind,why:'the kit has no more '+r.kind+'s'});return;}
    var out=place(0,slot,r.x,r.z,r.rot);if(out.ok)res.placed.push(r.kind);else res.dropped.push({kind:r.kind,why:out.code==='points'?'over budget':(out.text||out.code)});});
  side0Say(res);return res;}
function side0Say(res){var n=res.dropped.length,txt=n?'Your design: '+res.placed.length+' pieces placed, dropped '+res.dropped.map(function(q){return q.kind+' ('+q.why+')';}).join(', '):'Your design is placed: '+res.placed.length+' pieces';
  SG.designNote=txt;if(SG.sides[0])SG.sides[0].msg={code:'design',text:txt,t:9,bad:n>0};SG.sides[0].sel=-1;}
SG.labDesignToBuild=labDesignToBuild;

/* ---- the clock of the Lab: the same marbles, debris, puddles and mice as a fight, but nothing ends ---- */
function tickLab(dt){var L=SG.lab;if(!L)return;SG.time=1e6;SG.stats.fightTime+=dt;labProto('tick',dt);
  for(var s=0;s<2;s++){var side=SG.sides[s];side.big=99;side.ammo=L.ammo;side.high=L.high;   /* every kind of ammunition, as many as you like */
    lobbersOf(s).concat(s===0?[L.gun]:[]).forEach(function(l,li){if(L.quick&&(l.reload||0)>.3)l.reload=.3;if((l.reload||0)>0&&(l===L.gun||crewOK(s,li)))l.reload=Math.max(0,l.reload-dt);});
    for(var ck in side.cd){if(L.quick)side.cd[ck]=0;else if(side.cd[ck]>0)side.cd[ck]=Math.max(0,side.cd[ck]-dt);}}
  tickMarbles(dt);tickDebris();tickPuddles(dt);trapsTick();tickMice(dt);
  if(SG.pieces.some(function(p){return !p.built;})||SG.mice.some(function(m){return m.state==='toMat'||m.state==='carry'||m.state==='hammer';}))buildMice(dt,true);
  labTrack();}
/* a mouse in the Lab stands at its camp's resting place; a dizzy one is dealt with by tickMice as in a match */
function labMouse(m,dt){goTo(m,m.hx,m.hz,.3);if(walk(m,dt,WALK())){m.state='idle';m.goal=false;m.speed=0;}else{m.state='go';m.goal=false;}}

/* ---- what happened: the real code tells the Lab through labNote, from knock, collapse, keepDown and landV2 ---- */
function labNote(kind,a,b,c,d){var L=SG.lab,cur=L&&L.cur;if(!cur||cur.done)return;
  if(kind==='part')cur.parts.push({piece:a.id,kind:a.kind,side:a.side,part:b.id});
  else if(kind==='collapse')cur.fell.push(labName(a.kind)+(a.side?' (target)':' (mine)'));
  else if(kind==='keep'){cur.keep=true;cur.fell.push('Keep'+(a.side?' (target)':' (mine)'));L.sess.keeps++;}
  else if(kind==='land')cur.landings.push({x:b[0],y:b[1],z:b[2],r:c,ammo:a.ammo,high:!!a.high,hit:d?d.kind:'',hitSide:d?d.side:-1});}
/* a shot is over when nothing is in the air and no thrown part is still to land */
function labTrack(){var L=SG.lab,cur=L.cur;if(!cur||cur.done)return;if(SG.marbles.some(function(m){return m.live;})||SG.debris.length)return;
  var st=SG.stats;cur.done=true;cur.partsOff=st.partsOff-cur.b.partsOff;cur.collapses=st.collapses-cur.b.collapses;cur.dizzies=st.dizzies-cur.b.dizzies;cur.glued=st.glued-cur.b.glued;cur.bounces=st.bounces-cur.b.bounces;cur.secs=+(SG.clock-cur.b.t).toFixed(2);
  cur.fellOne=cur.fell.slice();L.landings=cur.landings.slice();cur.fell.forEach(function(f){L.fellLog.unshift(f);});L.fellLog=L.fellLog.slice(0,8);L.rkey='';}
function labNewCur(rec){var st=SG.stats;return {rec:rec,done:false,parts:[],fell:[],keep:false,landings:[],b:{partsOff:st.partsOff,collapses:st.collapses,dizzies:st.dizzies,glued:st.glued,bounces:st.bounces,t:SG.clock}};}

/* ---- shooting ---- */
/* the free gun: a lobber that is not a piece, on the near rim of the table, turned to its target */
function labGunAt(tx){var L=SG.lab,g=L.gun,gx=Math.max(-1.1,Math.min(1.1,tx*.35));g.x=gx;g.z=Math.sqrt(LAB_GUNR*LAB_GUNR-gx*gx);g.aim=null;return g;}
SG.labSetAmmo=function(id){var L=SG.lab;if(!AMMO[id])return false;L.ammo=id;SG.sides.forEach(function(sd){sd.ammo=id;});labUi();return true;};
SG.labSetHigh=function(on){var L=SG.lab;L.high=!!on;SG.sides.forEach(function(sd){sd.high=L.high;});labUi();};
/* fire from a lobber (li 0 or 1 of side s) or the free gun (li 'gun'). Unlimited ammunition; the winding is real or quick. Returns the shot or null. */
SG.labFire=function(s,li,tx,tz,opt){var L=SG.lab;if(!L)return null;opt=opt||{};var side=SG.sides[s],A=AMMO[L.ammo];if(!A)return null;
  if(li==='gun'){labGunAt(tx);s=0;side=SG.sides[0];}
  var l=lobberOf(s,li);if(!l){labMsg('No lobber there. Build one, or use the Free gun',true);return null;}
  side.ammo=L.ammo;side.high=L.high;side.big=99;
  if(opt.force){l.reload=0;side.cd[L.ammo]=0;}
  var blk=SG.lobberBlock(s,li);if(blk){labMsg(blockText(blk,s),true);return null;}
  var rec={s:s,li:li,ammo:L.ammo,high:L.high&&!A.flat,tx:tx,tz:tz,gx:l.x,gz:l.z,seed:SG.seed};if(opt.seed!=null)SG.seed=opt.seed;
  var cur=labNewCur(rec);L.cur=cur;
  var a=SG.fire(s,tx,tz,li);side.ammo=L.ammo;
  if(!a){L.cur=null;return null;}
  rec.seed=opt.seed!=null?opt.seed:rec.seed;L.last=rec;L.landings=[];L.rkey='';return a;};
SG.labReplay=function(){var L=SG.lab,r=L&&L.last;if(!r){labMsg('Nothing to replay yet: fire a shot first',true);return null;}
  L.ammo=r.ammo;L.high=r.high;SG.sides.forEach(function(sd){sd.ammo=r.ammo;sd.high=r.high;});
  var a=SG.labFire(r.s,r.li,r.tx,r.tz,{force:true,seed:r.seed});if(a){labMsg('Replayed: same aim, same ammunition',false);ui();}return a;};
/* run the clock until the last shot has come down and everything it threw has landed. For tests and the range report. */
SG.labSettle=function(max){var L=SG.lab,t=0;max=max||12;while(t<max&&L.cur&&!L.cur.done){SG.step(STEP);t+=STEP;}SG.step(STEP);return L.cur;};

/* ---- readouts ---- */
SG.labSession=function(){var L=SG.lab,st=SG.stats,b=L.base;return {shots:st.shots-b.shots,partsOff:st.partsOff-b.partsOff,collapses:st.collapses-b.collapses,keeps:L.sess.keeps,dizzies:st.dizzies-b.dizzies};};
SG.labResetCounters=function(){var L=SG.lab;L.base=labBase();L.sess={keeps:0};L.fellLog=[];L.rkey='';};
var LAB_WHY={keep:'brings the Keep down',roof:'drops the roof','wall-all':'brings the whole wall down','wall-planks':'drops the planks',gate:'brings the gate down'};
/* for each attached part: would losing it alone bring something down? Asked of the real rule (holdFail), one part at a time. */
function labCritical(p){var out={};if(p.down||!p.built)return out;
  p.ps.forEach(function(q){if(q.st!=='on'||!/post|rail|brace|floor/.test(q.id))return;q.st='off';var f=holdFail(p);q.st='on';if(f)out[q.id]=f;});
  props(p).forEach(function(b){var was=b.parts;b.parts=0;var f=holdFail(p);b.parts=was;if(f)out['piece:'+b.id]=f;});return out;}
SG.labSupports=function(p){if(typeof p==='number')p=pieceById(p);if(!p)return null;var cr=labCritical(p),rows=[],rule='',k=p.kind;
  function row(label,on,key){var f=cr[key];rows.push({text:label+(on?'':' (gone)'),on:on,crit:!!f,why:f?LAB_WHY[f]:''});}
  function parts(re){p.ps.forEach(function(q){if(re.test(q.id))row(partName(q.id)+' '+(q.id.split('.')[2]||''),q.st==='on',q.id);});}
  if(k==='wall'){rule='A wall stands while it has a post (or a brace is propping it). Its planks hang on the rails.';parts(/post|rail/);rows.push({text:'Planks on: '+onCount(p,/plank/)+' of '+p.ps.filter(function(q){return /plank/.test(q.id);}).length,on:true});}
  else if(k==='gate'){rule='A gate needs both its posts.';parts(/gate\.post/);}
  else if(k==='tower'){rule='A Keep stands on 3 legs, or on 2 if the brace across the open side is on (or a brace piece props it). The roof needs the floor and a rail.';parts(/^tower\.post/);parts(/^tower\.brace/);parts(/^tower\.floor|^tower\.rail/);}
  else if(k==='lobber'){rule='No support rules. A lobber needs its crank and bucket to fire.';parts(/crank|bucket/);}
  else if(k==='brace'){rule='A brace props the tower or wall it leans on. If it is knocked off, that piece loses the help.';}
  else rule='No support rules: parts come off only when a blast reaches them, and nothing falls by itself.';
  props(p).forEach(function(b){row('Brace piece',true,'piece:'+b.id);});
  if(k==='brace'){var pr=p.props?pieceById(p.props):null;rows.push({text:pr?'Props the '+labName(pr.kind)+' beside it':'Not leaning on anything',on:!!pr});}
  return {title:labName(k)+(p.side?' (target)':' (mine)'),rule:rule,rows:rows,state:p.down?'down':(holdFail(p)||'stands'),critical:cr};};
SG.labSelect=function(p){var L=SG.lab;L.sel=p?p.id:0;L.rkey='';};

/* ---- snapshot and restore of the whole table, damage and all ---- */
SG.labSnapshot=function(){var L=SG.lab;return {pieces:SG.pieces.map(function(p){return {rec:labRec(p),aim:p.aim,sprung:!!p.sprung,down:!!p.down,fallDir:p.fallDir||0,ps:p.ps.map(function(q){return {st:q.st,rx:q.rx,rz:q.rz,used:!!q.used};})};}),
  saved:[L.saved[0].slice(),L.saved[1].slice()],target:L.target,uid:L.uid};};
SG.labRestore=function(sn){var L=SG.lab;if(!sn)return false;SG.pieces.slice().forEach(labRemove);
  sn.pieces.forEach(function(e){var p=labPutRaw(Object.assign({},e.rec),true);p.aim=e.aim;p.sprung=e.sprung;
    e.ps.forEach(function(sq,i){var q=p.ps[i];if(!q||sq.st==='on')return;q.st=sq.st;q.rx=sq.rx;q.rz=sq.rz;q.t0=-99;q.used=sq.used;});
    if(p.ps.length)p.parts=p.ps.filter(function(q){return q.st==='on';}).length;if(e.down){p.down=true;p.fallT=SG.clock-99;p.fallDir=e.fallDir;p.parts=0;}});
  L.saved=[sn.saved[0].slice(),sn.saved[1].slice()];L.target=sn.target;SG.debris=[];SG.puddles=[];SG.marbles=[];labRepoint();fixGrid();labHomeMice();L.cur=null;L.landings=[];L.rkey='';return true;};
SG.labTakeSnapshot=function(){SG.lab.snap=SG.labSnapshot();labMsg('Snapshot taken',false);ui();};
SG.labRestoreSnapshot=function(){var L=SG.lab;if(!L.snap){labMsg('Take a snapshot first',true);return false;}SG.labRestore(L.snap);labMsg('Table restored',false);ui();return true;};

/* ---- the range report: every kind of ammunition, in turn, at a fresh copy of the target ---- */
var LAB_SEED=424242,LAB_CARPET=[[0,0],[.22,0],[-.22,0],[0,.22],[0,-.22],[.22,.22],[-.22,.22],[.22,-.22],[-.22,-.22],[0,0]];   /* the ten aim points of a salvo, round the spot, in units that follow the piece scale */
SG.labRange=function(o){var L=SG.lab;o=o||{};var spot=o.spot||L.spot||SG.labDefaultSpot(),keepTable=SG.labSnapshot(),keepStats=JSON.parse(JSON.stringify(SG.stats)),keepLast=L.last,keepCur=L.cur,keepSeed=SG.seed,keepAim=SG.sides[0].aim,keepUndo=[L.undo,L.redo],keepSess=L.sess,keepBase=L.base,keepFell=L.fellLog,keepLand=L.landings,quick=L.quick,keepAmmo=L.ammo,keepHigh=L.high;
  var ids=AMMO_ORDER.concat(Object.keys(AMMO).filter(function(k){return AMMO_ORDER.indexOf(k)<0;})),variants=[],rows=[];
  ids.forEach(function(id){variants.push({id:id,high:false});if(!AMMO[id].flat)variants.push({id:id,high:true});});
  variants.push({id:'glue',high:false,after:'marble',label:'Glue blob (after a Marble)'});
  /* my camp is taken off the table for the test, so nothing of mine stands in the way of the free gun */
  labRemoveSide(0);labRepoint();fixGrid();L.quick=true;SG.marbles=[];SG.debris=[];SG.puddles=[];   /* nothing still flying from before can land on the test */
  variants.forEach(function(v){SG.labReset(1);SG.acc=0;SG.step(.1);L.ammo=v.after||v.id;L.high=v.high;L.sess={keeps:0};
    if(v.after){L.ammo=v.after;L.high=false;SG.labFire(0,'gun',spot.x,spot.z,{force:true,seed:LAB_SEED});SG.labSettle(10);}
    L.ammo=v.id;L.high=v.high;SG.sides.forEach(function(sd){sd.ammo=v.id;sd.high=v.high;});
    var before=SG.stats.glued,a=SG.labFire(0,'gun',spot.x,spot.z,{force:true,seed:LAB_SEED}),cur=SG.labSettle(10),hit=cur&&cur.landings[0];
    var A=AMMO[v.id];rows.push({ammo:v.id,name:v.label||(A.name+(v.high?' (high lob)':'')),high:v.high,after:v.after||'',fired:!!a,partsOff:cur?cur.partsOff:0,collapses:cur?cur.collapses:0,keep:!!(cur&&cur.keep),dizzies:cur?cur.dizzies:0,glued:cur?cur.glued:0,bounces:cur?cur.bounces:0,
      landed:hit?(hit.hit?labName(hit.hit)+(hit.hitSide===1?'':' (mine)'):'ground'):'-',fell:cur?cur.fell.slice():[]});
    /* then a salvo: the same ammunition again and again, spread over the camp round the spot (LAB_CARPET), nothing mended in between. A single shot rarely brings anything down; a salvo shows what the ammunition can do. */
    var N=o.salvo==null?10:o.salvo;if(N>0&&!v.after){var row=rows[rows.length-1],tot={shots:N,parts:0,collapses:0,keepAt:0,firstCollapse:0,dizzies:0};SG.labReset(1);SG.acc=0;SG.step(.1);L.ammo=v.id;L.high=v.high;
      for(var i=1;i<=N;i++){var of=LAB_CARPET[(i-1)%LAB_CARPET.length],u=U();SG.labFire(0,'gun',spot.x+of[0]*u,spot.z+of[1]*u,{force:true,seed:LAB_SEED+i});var c=SG.labSettle(10);if(!c)continue;tot.parts+=c.partsOff;tot.collapses+=c.collapses;tot.dizzies+=c.dizzies;if(c.collapses&&!tot.firstCollapse)tot.firstCollapse=i;if(c.keep&&!tot.keepAt)tot.keepAt=i;}
      row.salvo=tot;}});
  var out={spot:spot,from:'free gun',seed:LAB_SEED,target:L.target,pieceScale:SG.pieceSize,rows:rows,settings:{salvo:o.salvo==null?10:o.salvo,reload:'quick (0.3 s)',crew:'not needed',aim:'free gun on the near rim, aimed at ('+spot.x.toFixed(2)+', '+spot.z.toFixed(2)+')',seed:LAB_SEED,note:'Each shot is fired at a fresh copy of the target. Only the Keep, mice and pieces of the target camp are on the table.'}};
  /* put everything back as it was */
  L.quick=quick;SG.labRestore(keepTable);SG.stats=keepStats;L.last=keepLast;L.cur=keepCur;SG.seed=keepSeed;SG.sides[0].aim=keepAim;SG.pops=[];L.undo=keepUndo[0];L.redo=keepUndo[1];L.sess=keepSess;L.base=keepBase;L.fellLog=keepFell;L.landings=keepLand;
  L.ammo=keepAmmo;L.high=keepHigh;SG.sides.forEach(function(sd){sd.ammo=L.ammo;sd.high=L.high;});L.rkey='';return out;};

/* ---- the Lab's own drawing: ghost, camp zones, free gun, aim spot, blast rings, support lines ---- */
function labFlat(geo,col,op){var o=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op,depthWrite:false}));o.rotation.x=-PI/2;o.visible=false;S.add(o);return o;}
function labViewInit(){var Lv=V.lab={rings:[],hl:[],ring1:null};var i;
  for(i=0;i<8;i++)Lv.rings.push(labFlat(new THREE.RingGeometry(.9,1,40),0xfff3d0,.9));
  for(i=0;i<6;i++)Lv.hl.push(labFlat(new THREE.RingGeometry(.11,.15,24),0xff5a44,.95));
  Lv.sel=labFlat(new THREE.RingGeometry(.92,1,40),0xffd23a,.95);Lv.spot=labFlat(new THREE.RingGeometry(.12,.16,28),0x5ad0ff,.95);Lv.spot2=labFlat(new THREE.CircleGeometry(.03,10),0x5ad0ff,.95);
  var g=new THREE.Group(),bm=new THREE.MeshStandardMaterial({color:0x3a281a,roughness:.7}),base=new THREE.Mesh(new THREE.CylinderGeometry(.13,.16,.07,18),bm),bar=new THREE.Mesh(new THREE.BoxGeometry(.09,.09,.34),new THREE.MeshStandardMaterial({color:0xe8842c,roughness:.6}));
  base.position.y=.035;bar.position.set(0,.12,.12);g.add(base);g.add(bar);g.visible=false;S.add(g);Lv.gun=g;Lv.gunRing=labFlat(new THREE.RingGeometry(.9,1,40),0xe8842c,.9);
  var geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(900*6),3));geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(900*6),3));geo.setDrawRange(0,0);
  Lv.lines=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.95,depthTest:false}));Lv.lines.renderOrder=20;Lv.lines.frustumCulled=false;Lv.lines.visible=false;S.add(Lv.lines);Lv.ckey='';Lv.crit={};}
var LAB_RAMMO={marble:0xfff3d0,big:0xcfcfd8,corks:0xe6c89a,bouncer:0xffb066,glue:0x86d23c};
function labView(){var L=SG.lab;if(!L||!V.on)return;if(!V.lab)labViewInit();var Lv=V.lab,G=GH[0],i;
  for(i=0;i<2;i++){GH[i].zone.visible=true;GH[i].zoneG.visible=true;}
  /* the ghost: the piece you are about to put down (or carrying), green or red */
  var g=L.ghost,show=g.on&&(L.tool==='build'||L.carry);
  if(show){labGhostUpdate();var kind=g.kind,team=SG.sides[g.side].team;if(G.kind!==kind+team){if(G.obj)S.remove(G.obj);G.obj=ghostOf(kind,team,GM.ok);S.add(G.obj);G.kind=kind+team;G.obj.userData.ok=true;}
    if(G.obj.userData.ok!==g.ok){tint(G.obj,g.ok?GM.ok:GM.bad);G.obj.userData.ok=g.ok;}
    G.obj.visible=true;G.obj.position.set(g.sx,.01,g.sz);G.obj.rotation.y=g.rot;var rr=Math.max(FOOT[kind][0],FOOT[kind][1])+.1;G.ring.visible=true;G.ring.scale.setScalar(rr);G.ring.position.set(g.sx,.008,g.sz);G.ring.material.color.set(g.ok?0x8fd0ff:0xff5a44);}
  else{if(G.obj)G.obj.visible=false;G.ring.visible=false;}
  /* the free gun and its aim */
  var gunOn=L.tool==='gun';Lv.gun.visible=gunOn;Lv.gunRing.visible=gunOn;
  if(gunOn){var gn=L.gun;Lv.gun.position.set(gn.x,0,gn.z);var ga=L.gunAim?Math.atan2(L.gunAim.tx-gn.x,L.gunAim.tz-gn.z):PI;Lv.gun.rotation.y=ga;Lv.gunRing.position.set(gn.x,.009,gn.z);Lv.gunRing.scale.setScalar(.3);}
  /* the aim spot for the range report */
  var sp=L.spot||(L.tool==='spot'?SG.labDefaultSpot():null);Lv.spot.visible=Lv.spot2.visible=!!sp&&(L.tool==='spot'||!!L.spot);if(sp){Lv.spot.position.set(sp.x,.013,sp.z);Lv.spot2.position.set(sp.x,.014,sp.z);Lv.spot.scale.setScalar(1+.08*Math.sin(SG.clock*5));}
  /* where the last shot came down, with the blast ring */
  for(i=0;i<Lv.rings.length;i++){var rg=Lv.rings[i],ld=L.landings[i];rg.visible=!!ld;if(ld){rg.position.set(ld.x,.012+i*.0004,ld.z);rg.scale.setScalar(Math.max(.05,ld.r));rg.material.color.set(LAB_RAMMO[ld.ammo]||0xfff3d0);}}
  /* the piece you tapped, and the parts that would bring it down */
  var sel=L.sel?pieceById(L.sel):null;Lv.sel.visible=!!sel;for(i=0;i<Lv.hl.length;i++)Lv.hl[i].visible=false;
  if(sel){Lv.sel.position.set(sel.x,.011,sel.z);Lv.sel.scale.setScalar(Math.max(FOOT[sel.kind][0],FOOT[sel.kind][1])*1.3+.05);var cr=labCritical(sel),n=0;
    sel.ps.forEach(function(q){if(cr[q.id]&&n<Lv.hl.length){var h=Lv.hl[n++];h.visible=true;h.position.set(q.wx,q.wy+.02,q.wz);h.scale.setScalar(1+.15*Math.sin(SG.clock*7));}});}
  /* the support links, thin lines: green holds, red is a part that alone would bring the piece down */
  Lv.lines.visible=!!L.supports;if(L.supports)labLines(Lv);}
/* the Lab's drawings are put away when the Lab is left, so a match never shows them */
function labViewHide(){var Lv=V.lab;if(!Lv)return;Lv.rings.concat(Lv.hl,[Lv.sel,Lv.spot,Lv.spot2,Lv.gun,Lv.gunRing,Lv.lines]).forEach(function(o){o.visible=false;});}
function labLines(Lv){var key=SG.pieces.length+'|'+SG.stats.partsOff+'|'+SG.stats.collapses+'|'+SG.clock.toFixed(1),pos=Lv.lines.geometry.attributes.position,col=Lv.lines.geometry.attributes.color,n=0;
  if(Lv.ckey!==key){Lv.ckey=key;Lv.crit={};SG.pieces.forEach(function(p){if(p.built&&!p.down&&(p.kind==='wall'||p.kind==='gate'||p.kind==='tower'))Lv.crit[p.id]=labCritical(p);});}
  function seg(a,b,red){if(n>=899)return;pos.setXYZ(n*2,a[0],a[1],a[2]);pos.setXYZ(n*2+1,b[0],b[1],b[2]);var c=red?[1,.25,.18]:[.35,.95,.4];col.setXYZ(n*2,c[0],c[1],c[2]);col.setXYZ(n*2+1,c[0],c[1],c[2]);n++;}
  SG.pieces.forEach(function(p){if(!p.built||p.down)return;var cr=Lv.crit[p.id];if(!cr&&p.kind!=='brace')return;var top=[p.x,TALL[p.kind]*.85,p.z];
    if(p.kind==='brace'){var pr=p.props?pieceById(p.props):null;if(pr)seg([p.x,TALL.brace*.7,p.z],[pr.x,TALL[pr.kind]*.5,pr.z],false);return;}
    var re=p.kind==='wall'?/post|rail/:(p.kind==='gate'?/gate\.post/:/^tower\.(post|brace|floor|rail)/);
    p.ps.forEach(function(q){if(q.st==='on'&&re.test(q.id))seg(top,[q.wx,q.wy,q.wz],!!cr[q.id]);});
    props(p).forEach(function(b){seg(top,[b.x,TALL.brace*.7,b.z],!!cr['piece:'+b.id]);});});
  Lv.lines.geometry.setDrawRange(0,n*2);pos.needsUpdate=true;col.needsUpdate=true;}

/* ---- the Lab's screen: a top row, a bottom toolbar, a panel on the right ---- */
var LAB_HELP='<h2>How to use the Lab</h2><ul><li><b>Build</b>: pick a piece, tap the table. Drag to slide the ghost before you let go. Turn with the turn buttons. Undo and Redo work.</li><li><b>Erase</b>: tap a piece to remove it. <b>Move</b>: tap a piece, then tap or drag to where it goes.</li><li><b>Lobber</b>: tap a lobber, then drag back and let go to fire. <b>Free gun</b>: tap the table to aim from the near edge, then press Fire.</li><li><b>Inspect</b>: tap a piece to see what holds it up. Red marks the part that alone would bring it down.</li><li>The panel on the right loads a target camp, resets it, saves designs and runs the range report. Nothing here ends: shoot as long as you like.</li></ul>';
function labDom(){if(E('lab'))return;var d=document.createElement('div');d.id='lab';
  var tg=LAB_TARGETS.map(function(t){return '<button class="btn lb" data-a="tg_'+t[0]+'">'+t[1]+'</button>';}).join('');
  d.innerHTML='<div id="labTop" class="labp"><button class="btn lb" data-a="back">⬅ Back to menu</button><span class="pill" id="labTitle">🎯 Shooting range</span><button class="btn lb" data-a="help">? How to use</button><button class="btn lb" data-a="panel" id="labPanelBtn">☰ Panel</button></div>'+
  '<div id="labReadCard" class="labp"><button class="btn lb" data-a="readtog" id="labReadBtn">Readout ▾</button><div id="labReadBody"><div id="labRead"></div><div class="lgrid"><button class="btn lb" data-a="clear">Clear counters</button></div></div></div>'+
  '<div id="labPanel" class="labp">'+
  '<details open><summary>Target camp</summary><div class="lgrid">'+tg+'</div><div class="lgrid"><button class="btn lb go big" data-a="reset">⟳ Reset target</button><button class="btn lb" data-a="heal">Heal all</button><button class="btn lb" data-a="snap">📷 Snapshot</button><button class="btn lb" data-a="restore">⏪ Restore</button></div></details>'+
  '<details><summary>My camp</summary><div class="lgrid"><button class="btn lb" data-a="mine_starter">Keep + 2 lobbers</button><button class="btn lb" data-a="mine_clear">Clear my camp</button><button class="btn lb" data-a="tgt_clear">Clear target</button></div></details>'+
  '<details open><summary>Settings</summary><div class="lgrid"><button class="btn lb" data-a="t_instant"></button><button class="btn lb" data-a="t_quick"></button><button class="btn lb" data-a="t_crew"></button><button class="btn lb" data-a="t_strict"></button><button class="btn lb" data-a="t_supports"></button><button class="btn lb" data-a="t_slow"></button><button class="btn lb" data-a="t_pause"></button></div></details>'+
    '<details><summary>Range report</summary><div class="lgrid"><button class="btn lb go" data-a="range">Test all ammo</button><button class="btn lb" data-a="t_spot">Set aim spot</button><button class="btn lb" data-a="spotclr">Aim at the Keep</button></div><div id="labSpotTxt" class="lnote"></div></details>'+
  '<details><summary>Designs</summary><div class="lgrid"><input id="labName" type="text" placeholder="Name your camp" maxlength="40"><button class="btn lb go" data-a="dsave">Save design</button></div><div id="labList"></div><div class="lgrid"><button class="btn lb" data-a="dcopy">Copy JSON</button><button class="btn lb" data-a="dpaste">Paste JSON</button></div><div class="lnote">In a match: choose "My camp in a match" on the title screen.</div></details>'+
  '<details><summary>Prototypes</summary><div id="labProtos"></div></details></div>'+
  '<div id="labBar" class="labp"><div class="labrow" id="labTools"></div><div class="labrow" id="labSub"></div></div>'+
  '<div class="labcover" id="labCard"><div class="card"><div id="labHelp"></div><div class="row"><button class="btn lb go" data-a="cardok">Got it</button></div><p class="lnote">You can bring this back with "? How to use".</p></div></div>'+
  '<div class="labcover" id="labRangeBox"><div class="card"><h2>Range report</h2><div id="labRangeTxt"></div><div class="row"><button class="btn lb go" data-a="rangeok">Close</button></div></div></div>'+
  '<div class="labcover" id="labJsonBox"><div class="card"><h2 id="labJsonTitle">Design</h2><textarea id="labJsonText" spellcheck="false"></textarea><div class="row" id="labJsonRow"></div></div></div>';
  E('ui').appendChild(d);E('labHelp').innerHTML=LAB_HELP;
  d.addEventListener('click',function(ev){var b=ev.target.closest?ev.target.closest('[data-a]'):null;if(!b)return;ev.stopPropagation();soundOn();labAct(b.getAttribute('data-a'),b);});
  d.addEventListener('pointerdown',function(ev){ev.stopPropagation();});}
function labUiHide(){var d=E('lab');if(d)d.style.display='none';var sel=E('designSel');if(!sel||!SG.labDesigns)return;var names=Object.keys(SG.labDesigns()),cur=sel.value||SG.designChoice||'';
  while(sel.options.length>1)sel.remove(1);names.forEach(function(n){var o=document.createElement('option');o.value=n;o.textContent=n;sel.appendChild(o);});sel.value=names.indexOf(cur)>=0?cur:'';E('designRow').style.display=names.length?'flex':'none';}
function labUi(){if(!hasDom||SG.mode!=='lab'||!SG.lab||SG.phase==='start')return;labDom();var L=SG.lab,d=E('lab');d.style.display='block';
  ['hud','bar','fbar','fbar2','nrow','arow','say','end','win','tag'].forEach(function(id){if(E(id))E(id).style.display='none';});E('side').style.display='flex';E('bCam').style.display='block';E('bPause2').style.display='none';
  var tools=[['build','🔨 Build'],['erase','🧽 Erase'],['move','✋ Move'],['inspect','🔍 Inspect'],['fire','🔮 Lobber'],['gun','🎯 Free gun']];
  E('labTools').innerHTML=tools.map(function(t){return '<button class="btn lb'+(L.tool===t[0]?' on':'')+'" data-a="tool_'+t[0]+'">'+t[1]+'</button>';}).join('')+'<span class="lsep"></span><button class="btn lb" data-a="turnL">⟲</button><button class="btn lb" data-a="turnR">⟳</button><button class="btn lb" data-a="undo">↶ Undo</button><button class="btn lb" data-a="redo">↷ Redo</button>';
  var sub='';
  if(L.tool==='build'||L.tool==='move'){sub=LAB_KINDS.map(function(k){return '<button class="btn lb'+(L.kind===k&&L.tool==='build'?' on':'')+'" data-a="k_'+k+'">'+(LAB_ICON[k]||'🧩')+' '+labName(k)+'</button>';}).join('');if(L.carry)sub+='<button class="btn lb go" data-a="drop">Drop here</button><button class="btn lb" data-a="cancelcarry">Put it back</button>';}
  else if(L.tool==='fire'||L.tool==='gun'){var ids=AMMO_ORDER.concat(Object.keys(AMMO).filter(function(k){return AMMO_ORDER.indexOf(k)<0;}));
    sub=ids.map(function(id){return '<button class="btn lb ammo'+(L.ammo===id?' on':'')+'" data-a="am_'+id+'" id="lab_a_'+id+'"><span class="ai">'+AMMO[id].icon+'</span><span class="an">'+AMMO[id].name+'</span><span class="ac"></span></button>';}).join('')+
      '<button class="btn lb'+(L.high?' on':'')+'" data-a="high">⤴ High lob</button>'+(L.tool==='gun'?'<button class="btn lb go big" data-a="gunfire">🔥 Fire!</button>':'')+'<button class="btn lb" data-a="replay">⟲ Replay</button>';}
  else if(L.tool==='inspect')sub='<span class="lnote">Tap a piece to see what holds it up. Turn on "Show supports" to see the links.</span>';
  else if(L.tool==='erase')sub='<span class="lnote">Tap a piece to take it away. Undo brings it back.</span>';
  else if(L.tool==='spot')sub='<span class="lnote">Tap the table where the range report should aim.</span>';
  E('labSub').innerHTML=sub;
  var T={t_instant:['Build: '+(L.instant?'instantly':'mice build it'),L.instant],t_quick:['Reload: '+(L.quick?'quick (0.3 s)':'real'),L.quick],t_crew:['Crew: '+(L.crew?'needed':'not needed'),L.crew],t_strict:['Zones: '+(L.strict?'match rules':'anywhere'),L.strict],t_supports:['Show supports: '+(L.supports?'on':'off'),L.supports],t_slow:['Slow-mo '+(L.slow?'on':'off'),L.slow],t_pause:[SG.paused?'▶ Go on':'⏸ Pause',SG.paused]};
  Object.keys(T).forEach(function(k){var b=d.querySelector('[data-a="'+k+'"]');if(b){b.textContent=T[k][0];b.className='btn lb'+(T[k][1]?' on':'');}});
  LAB_TARGETS.forEach(function(t){var b=d.querySelector('[data-a="tg_'+t[0]+'"]');if(b)b.className='btn lb'+(L.target===t[0]?' on':'');});
  var sp=L.spot||SG.labDefaultSpot();E('labSpotTxt').textContent='Aim spot: '+(L.spot?'tapped':'the target Keep')+' ('+sp.x.toFixed(2)+', '+sp.z.toFixed(2)+')';
  var dz=SG.labDesigns(),names=Object.keys(dz);E('labList').innerHTML=names.length?names.map(function(n){return '<div class="lrow"><span>'+labEsc(n)+' ('+dz[n].placements.length+')</span><button class="btn lb" data-a="dload_'+names.indexOf(n)+'">Load</button><button class="btn lb" data-a="ddel_'+names.indexOf(n)+'">✕</button></div>';}).join(''):'<div class="lnote">No saved designs yet.</div>';
  E('labProtos').innerHTML=Object.keys(LAB_PROTOS).map(function(id){var p=LAB_PROTOS[id];return '<div class="lrow"><button class="btn lb'+(LAB_FLAGS[id]?' on':'')+'" data-a="pr_'+id+'">'+(LAB_FLAGS[id]?'On':'Off')+'</button><span>'+labEsc(p.name)+'<br><small>'+labEsc(p.note||'')+'</small></span></div>';}).join('');
  E('labPanel').style.display=L.panel?'block':'none';E('labReadBody').style.display=L.read?'block':'none';E('labReadBtn').textContent=L.read?'Readout ▾':'Readout ▸';E('labCard').style.display=L.card?'flex':'none';
  E('bPause2').textContent=SG.paused?'▶':'⏸';L.rkey='';labHud();}
function labEsc(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
/* every frame: the message line, the ammo buttons' waits, and the readout when something changed */
function labHud(){var L=SG.lab;if(!L||!hasDom||!E('labRead'))return;var sy=E('say'),m=L.msg,vis=m.text&&SG.clock<m.until;sy.style.display=vis?'block':'none';sy.textContent=vis?m.text:'';sy.className=m.bad?'bad':'';sy.style.top='62px';
  var s0=SG.sides[0];AMMO_ORDER.concat(Object.keys(AMMO).filter(function(k){return AMMO_ORDER.indexOf(k)<0;})).forEach(function(id){var b=E('lab_a_'+id);if(!b)return;var ac=b.querySelector('.ac'),t=L.quick?'∞':ammoCount({big:99,cd:s0.cd},id).replace('×99','∞');if(ac&&ac.textContent!==t)ac.textContent=t;});
  var ss=SG.labSession(),cur=L.cur,sel=L.sel?pieceById(L.sel):null,key=[ss.shots,ss.partsOff,ss.collapses,ss.keeps,ss.dizzies,cur?cur.done+'|'+cur.parts.length:'-',sel?sel.id+'|'+sel.parts+'|'+(sel.down?1:0)+'|'+SG.stats.partsOff:'-',L.fellLog.join(),L.read].join('/');if(key===L.rkey)return;L.rkey=key;
  var h='',r=L.last;
  h+='<h4>Last shot</h4>';
  if(!cur&&!r)h+='<div class="lnote">No shots yet. Fire one.</div>';
  else{var c=cur||{};h+='<table class="lt"><tr><td>Ammo</td><td>'+(r?labEsc((AMMO[r.ammo]||{name:r.ammo}).name)+(r.high?' (high lob)':''):'-')+'</td></tr><tr><td>Parts off</td><td>'+(c.done?c.partsOff:(c.parts?c.parts.length+' so far':0))+'</td></tr><tr><td>Collapses</td><td>'+(c.done?c.collapses:'…')+'</td></tr><tr><td>Mice dizzy</td><td>'+(c.done?c.dizzies:'…')+'</td></tr>'+(c.done&&c.glued?'<tr><td>Parts glued</td><td>'+c.glued+'</td></tr>':'')+'<tr><td>Fell</td><td>'+(c.fell&&c.fell.length?c.fell.map(labEsc).join(', '):'nothing')+'</td></tr><tr><td>Landed on</td><td>'+(c.landings&&c.landings[0]?(c.landings[0].hit?labName(c.landings[0].hit):'the table'):'-')+'</td></tr></table>';
    if(c.done&&c.parts&&c.parts.length){var cnt={};c.parts.forEach(function(q){var k=labName(q.kind)+' '+partName(q.part);cnt[k]=(cnt[k]||0)+1;});h+='<div class="lnote">Off: '+Object.keys(cnt).map(function(k){return cnt[k]>1?cnt[k]+' × '+k:k;}).join(', ')+'</div>';}}
  h+='<div class="lnote"><b>Session:</b> '+ss.shots+' shots · '+ss.partsOff+' parts off · '+ss.collapses+' collapses · '+ss.keeps+' Keeps · '+ss.dizzies+' dizzy'+(L.fellLog.length?'<br>Fell lately: '+L.fellLog.map(labEsc).join(', '):'')+'</div>';
  if(sel){var sp=SG.labSupports(sel);h+='<h4>'+labEsc(sp.title)+(sp.state==='stands'?' · stands':(sp.state==='down'?' · down':' · '+LAB_WHY[sp.state]))+'</h4><div class="lnote">'+labEsc(sp.rule)+'</div><ul class="ls">'+sp.rows.map(function(q){return '<li class="'+(q.crit?'crit':(q.on?'ok':'gone'))+'">'+labEsc(q.text)+(q.crit?' · alone it '+q.why:'')+'</li>';}).join('')+'</ul>';}
  else h+='<h4>Tapped piece</h4><div class="lnote">Tap a piece (Inspect or Lobber tool) to see what holds it up.</div>';
  E('labRead').innerHTML=h;}
function labRangeHtml(out){var h='<div class="lnote">Target: '+labEsc(out.target)+' · '+labEsc(out.settings.aim)+' · '+labEsc(out.settings.reload)+', crew '+labEsc(out.settings.crew)+'. Each row is a fresh copy of the target.</div><table class="lt wide"><tr><th>Ammo</th><th>Parts off</th><th>Collapses</th><th>Keep fell</th><th>Mice dizzy</th><th>Glued</th><th>Landed on</th><th>After a salvo of '+out.settings.salvo+': parts off · collapses · Keep</th></tr>';
  out.rows.forEach(function(r){h+='<tr><td>'+labEsc(r.name)+'</td><td>'+r.partsOff+'</td><td>'+r.collapses+'</td><td>'+(r.keep?'yes':'no')+'</td><td>'+r.dizzies+'</td><td>'+r.glued+'</td><td>'+labEsc(r.landed)+'</td><td>'+(r.salvo?r.salvo.parts+' · '+r.salvo.collapses+' · '+(r.salvo.keepAt?'down at shot '+r.salvo.keepAt:'stands'):'-')+'</td></tr>';});return h+'</table>';}
function labShowJson(title,text,paste){E('labJsonTitle').textContent=title;E('labJsonText').value=text;E('labJsonText').readOnly=!paste;
  E('labJsonRow').innerHTML=(paste?'<button class="btn lb go" data-a="jload">Load this design</button>':'<button class="btn lb go" data-a="jcopy">Copy</button>')+'<button class="btn lb" data-a="jclose">Close</button>';E('labJsonBox').style.display='flex';}
function labAct(a,b){var L=SG.lab;if(!L)return;var x;
  if(a==='back'){SG.labBack();return;}
  if(a==='help'){L.card=true;labUi();return;}if(a==='cardok'){L.card=false;labStore(LAB_SEEN,1);labUi();return;}
  if(a==='panel'){L.panel=!L.panel;labPrefs();labUi();return;}if(a==='readtog'){L.read=!L.read;labPrefs();labUi();return;}
  if(a.indexOf('tool_')===0){SG.labTool(a.slice(5));return;}
  if(a.indexOf('k_')===0){L.kind=a.slice(2);if(L.tool!=='build')SG.labTool('build');L.ghost.on=false;labUi();return;}
  if(a.indexOf('am_')===0){SG.labSetAmmo(a.slice(3));return;}
  if(a==='high'){SG.labSetHigh(!L.high);return;}
  if(a==='turnL'||a==='turnR'){L.ghost.rot+=(a==='turnL'?1:-1)*PI/12;return;}
  if(a==='undo'){if(L.carry)SG.labCancelCarry();SG.labUndo();return;}if(a==='redo'){SG.labRedo();return;}
  if(a==='drop'){SG.labDrop();return;}if(a==='cancelcarry'){SG.labCancelCarry();labUi();return;}
  if(a.indexOf('tg_')===0){labLoadTarget(a.slice(3));ui();return;}
  if(a==='mine_starter'){SG.labStarter();return;}if(a==='mine_clear'){SG.labClearCamp(0);return;}if(a==='tgt_clear'){SG.labClearCamp(1);return;}
  if(a==='reset'){SG.labReset(1);return;}if(a==='heal'){SG.labHeal();return;}if(a==='snap'){SG.labTakeSnapshot();return;}if(a==='restore'){SG.labRestoreSnapshot();return;}
  if(a==='t_instant'){L.instant=!L.instant;labPrefs();labMsg(L.instant?'Pieces appear at once':'The mice will build what you place',false);labUi();return;}
  if(a==='t_quick'){L.quick=!L.quick;labPrefs();labUi();return;}if(a==='t_crew'){L.crew=!L.crew;labPrefs();labUi();return;}if(a==='t_strict'){L.strict=!L.strict;labPrefs();labUi();return;}
  if(a==='t_supports'){L.supports=!L.supports;labPrefs();labUi();return;}if(a==='t_slow'){L.slow=!L.slow;SG.speed=L.slow?.25:1;labUi();return;}if(a==='t_pause'){SG.paused=!SG.paused;labUi();return;}
  if(a==='t_spot'){SG.labTool('spot');return;}if(a==='spotclr'){L.spot=null;labUi();return;}
  if(a==='clear'){SG.labResetCounters();return;}
  if(a==='gunfire'){if(!L.gunAim){labMsg('Tap the table to aim first',true);return;}SG.labFire(0,'gun',L.gunAim.tx,L.gunAim.tz);return;}
  if(a==='replay'){SG.labReplay();return;}
  if(a==='range'){x=SG.labRange();L.rangeOut=x;E('labRangeTxt').innerHTML=labRangeHtml(x);E('labRangeBox').style.display='flex';return;}
  if(a==='rangeok'){E('labRangeBox').style.display='none';return;}
  if(a==='dsave'){x=SG.labSaveDesign(E('labName').value);labMsg(x.text,!x.ok);labUi();return;}
  if(a.indexOf('dload_')===0){var dn=Object.keys(SG.labDesigns())[+a.slice(6)];x=dn?SG.labDesigns()[dn]:null;if(x){x=SG.labLoadDesign(x,0);labMsg(x.text,!x.ok);}return;}
  if(a.indexOf('ddel_')===0){var dn2=Object.keys(SG.labDesigns())[+a.slice(5)];if(dn2)SG.labDeleteDesign(dn2);labUi();return;}
  if(a==='dcopy'){labShowJson('Copy this design',JSON.stringify(labToDesign(0,E('labName').value||'My camp'),null,1),false);return;}
  if(a==='dpaste'){labShowJson('Paste a design here',' ',true);E('labJsonText').value='';return;}
  if(a==='jclose'){E('labJsonBox').style.display='none';return;}
  if(a==='jcopy'){var ta=E('labJsonText');ta.focus();ta.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(ta.value).then(function(){labMsg('Copied',false);},function(){labMsg(ok?'Copied':'Select all, then copy',!ok);});}else labMsg(ok?'Copied':'Select all, then copy',!ok);return;}
  if(a==='jload'){x=SG.labLoadDesign(E('labJsonText').value,0);labMsg(x.text,!x.ok);if(x.ok)E('labJsonBox').style.display='none';return;}
  if(a.indexOf('pr_')===0){var id=a.slice(3);SG.setProto(id,!LAB_FLAGS[id]);labMsg(LAB_PROTOS[id].name+(LAB_FLAGS[id]?' is on':' is off'),false);return;}}
SG.labTool=function(t){var L=SG.lab;if(!L)return false;if(L.carry&&t!=='move')SG.labCancelCarry();L.tool=t;L.ghost.on=t==='build';SG.sides.forEach(function(sd){sd.aim.on=false;});
  if(t==='gun'&&L.gunAim){SG.sides[0].aim={on:true,tx:L.gunAim.tx,tz:L.gunAim.tz,li:'gun'};}labUi();return true;};

/* ---- touches in the Lab: one finger at a time ---- */
var LP=null;
function labPull(l,from,g){var dx=from.x-g.x,dz=from.z-g.z,d=Math.sqrt(dx*dx+dz*dz);if(d<.12)return null;var pw=Math.min(6.2,d*2.6);return {x:l.x+dx/d*pw,z:l.z+dz/d*pw};}
function labDown(e){var L=SG.lab;if(!L)return;if(LP&&LP.id!==e.pointerId)return;var g=ground(e.clientX,e.clientY);if(!g)return;e.preventDefault();try{e.target.setPointerCapture(e.pointerId);}catch(err){}
  LP={id:e.pointerId,x:e.clientX,y:e.clientY,from:g,kind:'tap',moved:0,off:{x:0,z:0}};var t=L.tool;
  if(t==='build'){L.ghost.on=true;L.ghost.x=g.x;L.ghost.z=g.z;LP.kind='ghost';}
  else if(t==='move'){if(L.carry){L.ghost.x=g.x;L.ghost.z=g.z;LP.kind='ghost';}
    else{var p=labPieceAt(g);if(p){var ox=p.x-g.x,oz=p.z-g.z;if(SG.labLift(p)){LP.kind='lift';LP.off={x:ox,z:oz};labUi();}}}}
  else if(t==='fire'){var best=null,bd=.5;[0,1].forEach(function(s){lobbersOf(s).forEach(function(l,li){var dd=dist(g.x,g.z,l.x,l.z);if(dd<bd){bd=dd;best={s:s,li:li};}});});
    if(best){L.fire=best;SG.sides[best.s].lsel=best.li;}
    if(lobberOf(L.fire.s,L.fire.li)){SG.sides.forEach(function(sd){sd.aim.on=false;});LP.kind='aim';}else labMsg('No lobber on the table. Build one, or use the Free gun',true);}
  else if(t==='gun'){LP.kind='gun';labGunSet(g);}}
function labGunSet(g){var L=SG.lab,tx=Math.max(-3.2,Math.min(3.2,g.x)),tz=Math.max(-3.2,Math.min(3.2,g.z));L.gunAim={tx:tx,tz:tz};labGunAt(tx);SG.sides[0].aim={on:true,tx:tx,tz:tz,li:'gun'};}
function labMove(e){if(!LP||LP.id!==e.pointerId||!SG.lab)return;var L=SG.lab,g=ground(e.clientX,e.clientY);LP.moved+=Math.abs(e.clientX-LP.x)+Math.abs(e.clientY-LP.y);LP.x=e.clientX;LP.y=e.clientY;if(!g)return;
  if(LP.kind==='lift'&&LP.moved>14)LP.kind='ghost';
  if(LP.kind==='ghost'){L.ghost.x=g.x+LP.off.x;L.ghost.z=g.z+LP.off.z;}
  else if(LP.kind==='aim'){var l=lobberOf(L.fire.s,L.fire.li),t=l?labPull(l,LP.from,g):null,sd=SG.sides[L.fire.s];if(t)sd.aim={on:true,tx:t.x,tz:t.z,li:L.fire.li};else sd.aim.on=false;}
  else if(LP.kind==='gun')labGunSet(g);}
function labUp(e){if(!LP||LP.id!==e.pointerId||!SG.lab)return;var L=SG.lab,P=LP;LP=null;var g=ground(e.clientX,e.clientY)||P.from,t=L.tool,tap=P.moved<12;
  if(t==='build'&&P.kind==='ghost'){var r=SG.labPlace(L.kind,L.ghost.x,L.ghost.z,L.ghost.rot);if(!r.ok)labMsg(r.text,true);else{snd('tap');L.ghost.on=false;}ui();}
  else if(t==='move'&&L.carry){if(P.kind==='lift'&&tap)return;var rr=SG.labDrop();if(rr.ok)snd('tap');}
  else if(t==='erase'){var p=labPieceAt(g);if(p){SG.labErase(p);labMsg(labName(p.kind)+' removed',false);}ui();}
  else if(t==='inspect'){SG.labSelect(labPieceAt(g));}
  else if(t==='spot'){L.spot={x:g.x,z:g.z};labUi();}
  else if(t==='fire'&&P.kind==='aim'){var sd=SG.sides[L.fire.s];if(sd.aim.on&&!tap){var ax=sd.aim.tx,az=sd.aim.tz;sd.aim.on=false;SG.labFire(L.fire.s,L.fire.li,ax,az);}else{sd.aim.on=false;SG.labSelect(labPieceAt(g));}}}
function labCancel(e){if(LP&&LP.id===e.pointerId){LP=null;if(SG.lab)SG.sides.forEach(function(sd){if(SG.lab.tool==='fire')sd.aim.on=false;});}}
function labKey(e){var L=SG.lab;if(!L||(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName||'')))return;var k=e.key.toLowerCase();
  if(k==='q')L.ghost.rot+=PI/12;else if(k==='e')L.ghost.rot-=PI/12;else if(k==='z'&&!e.shiftKey)SG.labUndo();else if(k==='y'||(k==='z'&&e.shiftKey))SG.labRedo();
  else if(k==='escape'){if(L.carry)SG.labCancelCarry();L.card=false;labUi();}else if(k==='p'){SG.paused=!SG.paused;labUi();}else if(k==='c')SG.setCam(SG.cam+1);else if(k==='r')SG.labReset(1);
  else if(k==='f'&&L.tool==='gun'&&L.gunAim)SG.labFire(0,'gun',L.gunAim.tx,L.gunAim.tz);}

/* ================= run ================= */
SG.boot=function(){
  initView();initInput();ui();
  var Q={};location.search.slice(1).split('&').forEach(function(kv){var p=kv.split('=');if(p[0]){try{Q[p[0]]=decodeURIComponent(p[1]||'');}catch(e){Q[p[0]]=p[1]||'';}}});
  if(Q.rules==='1'||window.__RULES===1)SG.rulesDefault=1;
  if(Q.shot){SG.shot(Q.shot,Q.team||'blue');ui();SG.camSnap=true;render();SS.whenTextures(function(){SG.camSnap=true;render();render();window.__done=true;},4000);return;}
  if(Q.layout){var lr;try{lr=SG.applyLayout(atob(Q.layout.replace(/-/g,'+').replace(/_/g,'/')));}catch(e){lr={ok:false,reason:'The layout in the address could not be read'};SG.layoutNote=lr.reason;}
    if(E('layoutNote')){E('layoutNote').style.display='block';E('layoutNote').textContent=lr.ok?'Table layout loaded from the address.':'Layout refused: '+lr.reason+' Using the usual table.';}}
  if(Q.auto)autoRun(Q);
  SG.rulesDefault=Q.rules==='1'||window.__RULES===1?1:2;SG.dev=Q.dev==='1';arCheck();if(Q.lab==='1'){SG.paused=false;SG.cam=0;SG.labStart();}
  var last=performance.now();(function loop(){var now=performance.now(),raw=now-last,dt=Math.min(.1,raw/1000);last=now;if(AR.on){window.__done=true;requestAnimationFrame(loop);return;}   /* in AR the XR session drives the frames */
    if(SG.phase!=='start'&&!SG.paused&&!SG.hold)SG.step(slowed(dt)*(SG.speed||1));render();if(SG.dev)devLine(raw);if(PERF)perfFrame(raw);window.__done=true;requestAnimationFrame(loop);})();};
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
    d.appendChild(b);d.appendChild(t);E('ui').appendChild(d);}}
function wallOf(s){var best=null,bd=1e9;SG.pieces.forEach(function(p){if(p.side===s&&p.kind==='wall'){var d=hillDist(p.x,p.z);if(d<bd){bd=d;best=p;}}});return best;}
function stepUntil(fn,max){for(var t=0;t<(max||30);t+=STEP){SG.step(STEP);if(fn())return true;}return false;}
SG.stepUntil=stepUntil;
/* straight to the start of round 1 with two preset camps (for tests and screenshots) */
SG.quick=function(team,opts){SG.start(team,opts||{seed:777});SG.demo(11,0);SG.sides[1].layout=0;SG.skipBuild();SG.begin();SG.step(CONFIG.count+.05);};

/* fixed scenes for the Lab's screenshots */
SG.labShot=function(name){SG.start('blue',{mode:'lab',seed:777});var L=SG.lab,sp;L.card=name==='lab-1-entry';L.panel=true;
  function mine(kind,x,z,t){return SG.labPlace(kind,w2(0,x,z)[0],w2(0,x,z)[1],t==null?PI:t);}
  if(name==='lab-1-entry'){return;}
  if(name==='lab-2-building'){labLoadTarget('fortress',true);mine('wall',-.45,1.55);mine('wall',.05,1.55);mine('gate',.62,1.55);mine('workshop',-1.0,2.5);mine('brace',-.29,2.42,-PI/2);mine('tent',.95,2.5);
    L.tool='build';L.kind='wall';L.ghost.on=true;var w=w2(0,-.95,1.55);L.ghost.x=w[0];L.ghost.z=w[1];L.ghost.rot=PI;L.msg={text:'Wall placed. Drag to slide the ghost; green is a good spot',until:99,bad:false};SG.step(.2);return;}
  if(name==='lab-3-readout'){labLoadTarget('fortress',true);L.tool='fire';L.read=true;sp=SG.labDefaultSpot();SG.labSetHigh(true);SG.labFire(0,0,sp.x,sp.z+.05);SG.labSettle(10);SG.labSetHigh(false);SG.labSetAmmo('big');SG.sides[0].big=99;
    var s2=SG.labFire(0,1,sp.x,sp.z);SG.labSettle(10);SG.step(.3);L.tool='fire';var kp=SG.pieces.filter(function(q){return q.side===1&&q.kind==='wall';})[0];SG.labSelect(kp);return;}
  if(name==='lab-4-range-report'){labLoadTarget('walled',true);labAct('range');return;}
  if(name==='lab-5-supports'){labLoadTarget('braced',true);L.supports=true;L.tool='inspect';SG.cam=1;var bx=FOOT.tower[0]+FOOT.brace[1]+.015;mine('brace',-bx,2.42,-PI/2);mine('brace',bx,2.42,PI/2);mine('wall',-.9,1.7);mine('wall',-.9+FOOT.wall[0]*2+.004,1.7);
    var kp2=SG.pieces.filter(function(q){return q.side===0&&q.kind==='tower';})[0],wl=SG.pieces.filter(function(q){return q.side===0&&q.kind==='wall';})[0];SG.debug.knock(kp2.id,'tower.brace.W');SG.debug.knock(kp2.id,'tower.post.SW');SG.debug.knock(wl.id,'wall.post.L');SG.labSelect(kp2);SG.step(.5);return;}
};
/* fixed scenes for screenshots */
SG.shot=function(name,team){
  if(name.indexOf('lab-')===0){SG.labShot(name);return;}
  if(name==='v2-4-build'){SG.start(team,{seed:777,level:'hard',rules:2});SG.sides[0].preset='good';var P0=PRESETS.good;for(var qi=0;qi<7;qi++)botPlace(0,P0[qi][0]);SG.sides[0].preset='';SG.step(26);SG.select(3,0);var gs=w2(0,Math.sin(-.3)*1.55,Math.cos(-.3)*1.55);SG.turn(PI-SG.sides[0].ghost.rot,0);SG.moveGhost(gs[0],gs[1],0);SG.sides[0].msg.t=0;return;}
  if(name.indexOf('v2b')===0){ /* two lobbers (blue's second lobber, chosen), the ammo row, a Bouncer over a wall, a Glue blob on fallen parts; the other camp is the good one, with its wall in front of the Keep */
    PRESETS.wallOnly=[[7,2.42,0,PI],[13,-.29,2.42,-PI/2],[14,.29,2.42,PI/2],[0,2.06,0,PI],[1,2.06,-.5,PI],[2,2.06,.5,PI],[8,2.2,1.2,PI]];   /* a Keep, its braces and one wall across the front: just enough to show a Bouncer or a Glue blob */
    SG.start(team,{seed:777,level:'easy',rules:2,presets:['average2',name==='v2b-3-bouncer'||name==='v2b-4-glue'?'wallOnly':'good']});SG.sides[0].bot=true;SG.skipBuild();SG.sides[0].bot=false;SG.begin();SG.step(CONFIG.count+.05);SG.sides[1].bot=false;SG.sides[1].plan={hill:4,raid:0,guard:0,mend:0};SG.sides[0].plan={hill:2,raid:1,guard:0,mend:0};
    SG.step(6);stepUntil(function(){return crewReady(0,0)&&crewReady(0,1);},14);lobbersOf(0).forEach(function(l){l.reload=0;});SG.sides[0].big=2;var s0=SG.sides[0],kp=pieceById(SG.sides[1].keep),fw=wallOf(1),Ls=lobbersOf(0);
    if(name==='v2b-1-two-lobbers'){SG.fire(0,fw.x,fw.z,0);SG.step(.45);SG.selectLobber(0,1);SG.setTool('lobber');s0.aim={on:true,tx:kp.x+.1,tz:kp.z+.5};}
    else if(name==='v2b-2-ammo-row'){s0.cd.corks=5;s0.cd.glue=3;SG.setTool('lobber');SG.selectLobber(0,1);SG.setAmmo(0,'bouncer');s0.aim={on:true,tx:0,tz:-2.36};}
    else if(name==='v2b-3-bouncer'){SG.setTool('lobber');SG.setAmmo(0,'bouncer');s0.high=false;var bf=SG.fire(0,0,-2.36,0);stepUntil(function(){return bf.leg===2&&bf.t>.18;},8);SG.selectLobber(0,1);s0.aim={on:true,tx:.08,tz:-2.4};}
    else if(name==='v2b-4-glue'){['wall.plank.1','wall.plank.2','wall.plank.4'].forEach(function(id){SG.debug.knock(fw.id,id);});SG.step(1);var gm=SG.mice.filter(function(m){return m.side===1;})[0];gm.x=fw.x+.12;gm.z=fw.z-.12;SG.setTool('lobber');SG.setAmmo(0,'glue');s0.high=true;var fp=fw.ps.filter(function(q){return q.st==='off';})[0],gf=SG.fire(0,fp.rx,fp.rz,0);stepUntil(function(){return gf.t>gf.T-.08;},8);gm.x=fp.rx;gm.z=fp.rz+.03;stepUntil(function(){return SG.lastHit&&SG.lastHit.ammo==='glue';},4);SG.step(.4);s0.aim={on:false,tx:0,tz:0};SG.selectLobber(0,1);}
    s0.msg.t=0;SG.callout.t=0;return;}
  if(name.indexOf('v2')===0){SG.start(team,{seed:777,level:'easy',rules:2,presets:['good','average']});SG.sides[0].bot=true;SG.skipBuild();SG.sides[0].bot=false;SG.begin();SG.step(CONFIG.count+.05);SG.sides[1].bot=false;SG.sides[0].plan={hill:2,raid:1,guard:0,mend:1};SG.sides[1].plan={hill:3,raid:0,guard:1,mend:0};
    SG.step(6);stepUntil(function(){return crewReady(0);},10);SG.sides[0].reload=0;SG.sides[0].big=2;var kp=pieceById(SG.sides[1].keep),fw=wallOf(1);
    if(name==='v2-1-keep-falling'){SG.cam=0;['tower.brace.S','tower.brace.E'].forEach(function(id){SG.debug.knock(kp.id,id);});SG.step(.8);SG.debug.knock(kp.id,'tower.post.SE');SG.debug.knock(kp.id,'tower.post.NE');SG.debug.knock(kp.id,'tower.post.SW');SG.step(1.25);}
    else if(name==='v2-2-wall-falling'){SG.debug.knock(fw.id,'wall.post.L');SG.step(.9);SG.debug.knock(fw.id,'wall.post.R');SG.step(.3);}
    else if(name==='v2-3-ammo'){SG.setTool('lobber');SG.setAmmo(0,'big');SG.sides[0].aim={on:true,tx:kp.x,tz:kp.z};SG.sides[0].msg.t=0;SG.callout.t=0;}
    else if(name==='v2-5-keep-win'){['tower.post.SE','tower.post.NE','tower.post.SW'].forEach(function(id){SG.debug.knock(kp.id,id);});SG.step(C2.keepFall+.4);}
    return;}
  if(name.indexOf('table')===0){SG.start('blue',{mode:'table',seed:777});
    if(name==='table-1-build'){SG.demo(5,0);SG.demo(4,1);SG.step(13);SG.select(7,0);var q0=layoutSpot(0,0,7);SG.turn(q0[2]-SG.sides[0].ghost.rot,0);SG.moveGhost(q0[0],q0[1],0);SG.select(6,1);SG.moveGhost(.2,-1.15,1);SG.sides[0].msg.t=SG.sides[1].msg.t=0;return;}
    SG.demo(11,0);SG.demo(11,1);SG.done(0);SG.done(1);SG.step(CONFIG.count+.05);SG.order(0,0,.3);SG.order(1,0,-.3);SG.step(5);stepUntil(function(){return crewReady(0)&&crewReady(1);},10);SG.sides[0].reload=SG.sides[1].reload=0;
    if(name==='table-2b-tilt'){SG.setTilt(18);name='table-2-fight';}
    if(name==='table-2-fight'){var f1=wallOf(1),f0=wallOf(0);SG.setTool('lobber',0);SG.setTool('lobber',1);SG.sides[0].aim={on:true,tx:f1.x,tz:f1.z};SG.sides[1].aim={on:true,tx:.2,tz:.45};SG.debug.knock(f0.id,'wall.plank.2');SG.step(.5);SG.sides[0].msg.t=SG.sides[1].msg.t=0;SG.callout.t=0;}
    else if(name==='table-0-count'){SG.start('blue',{mode:'table',seed:777});SG.demo(11,0);SG.demo(11,1);SG.done(0);SG.done(1);SG.step(1.2);}
    else{SG.sides[1].score=100;SG.sides[0].score=57;SG.step(.5);}
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
