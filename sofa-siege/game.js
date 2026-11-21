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
    piecePts:{tower:54,lobber:8,wall:5,gate:3.5,workshop:4,tent:5,brace:1,trap:1,cottage:10,barn:14,lookout:12,bridge:14,windmill:12,stall:4},collapsePts:2,hillPts:.07,        /* score: what a whole piece is worth when all of it is off at a round's end; each part off counts its share (the Keep counts most, walls least, so walls are not a gift to the other side, and blue's seven-plank walls count the same as red's five-plank ones); a collapse you caused; a second of hill for each mouse more than the other side */
    mendTime:12,redWalk:1.05,                   /* seconds to put one part back; red's mice walk this much quicker in the fight (it evens out blue's edge: with the same speed blue won about two matches in three) */
    raidEvery:3,redRaid:1,raidReach:.4,        /* seconds between a raider's pulls; red's interval times this (1: the same for both); reach */
    guardRange:1.1,blueGuard:1.5,guardEvery:2,guardChance:.45,guardRing:.55,   /* guard corks: reach, blue's reach times this, seconds between, chance to send the raider home dizzy, how far guards stand from the Keep */
    frameR:.07,                                 /* a wall or gate that is only a bare frame stops a flat shot only this near a post (scale 1) */
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
  /* ---- the Lab's Weapon Workshop, carnage tools and big targets. Lab only: no match ever reads this block. ---- */
  workshop:{
    caps:{blast:[0,.6],hiMul:[.2,1],falloff:[0,2],cap:[0,12],speed:[.5,2],arcMul:[.5,2.5],bounces:[0,3],hop:[.3,1.4],hopH:[.2,1.2],hopT:[.3,.8],scatter:[1,8],spread:[0,.8],fuse:[0,2],stick:[0,20],splash:[0,.5],slowTo:[.2,1],slowSecs:[0,10],puddle:[0,12],dizzyR:[-1,.6],dizzySecs:[0,8],tether:[0,3],quake:[0,1.2],roll:[0,3],cd:[0,12]},   /* the safe range of every parameter: [least, most]. A weapon outside them is clamped, never refused. dizzyR -1 = the same as the blast */
    decay:.75,                                  /* each further bounce is this much shorter and lower */
    hookR:.1,hookY:.45,                         /* tether: how near a part the marble must pass (across, and up and down) to snag it */
    rollSpeed:1.6,rollR:.07,rollBase:.3,rollEvery:.14,rollMax:8,   /* roller: units a second, how near a part it must be, the highest part it can knock (its base), seconds between knocks, most knocks */
    price:{blast:10,blastRef:.3,leg:1,legForce:2,speed:1,arc:1.5,bounce:1,popEach:.5,scatter:.45,fuse:.4,stick:.1,slow:.5,puddle:.1,splash:4,dizzy:4,dizzySecs:.15,tether:2,tetherLen:.8,quake:3,roll:2,cd:.15,floor:.5},   /* the budget points of a weapon: see wPrice. The blast is priced by its area, so a blast twice as wide costs four times as much */
    topple:{max:8,reach:1.1,hit:3,throwFar:.12},   /* chain reactions (Lab option): most topples a shot can start; how far a falling piece reaches (times its height); parts it knocks off what it falls on; how far they fly */
    rate:{salvo:5,single:1,salvoShare:.3,parts:1,collapse:4,keep:15,dizzy:.5,little:.25,likeLo:.8,likeHi:1.25,much:1.5},   /* Rate it: shots in a salvo; how much a salvo counts beside a single shot; the points of each result; the verdict thresholds (shares of a Marble's and a Big Marble's score) */
    carnage:{part:1,collapse:5,keep:25,chain:3,dizzy:.5},   /* the carnage score: points for each part off, collapse, Keep felled, step of chain beyond the first, mouse dizzy */
    fx:{shake:.14,shakeMax:2.4,slow:.06,slowBase:.15,slowMax:1.4,slowFrom:3},   /* screen shake and slow-motion beat per part that falls at once */
    debrisMax:160,debrisSecs:3,                 /* most fallen parts left lying; seconds before they vanish when "Leave debris" is off */
    yard:{perHit:4,bigHit:9,sturdy:[1,.55,.32],deep:.4,high:.5,collapseShare:.08,delay:.2,fall:[.08,.2],reach:.22}   /* the Building Yard: parts a Marble takes off one building (a bigger blast takes more, by its area); the Big Marble's; how far a blow runs on into a building (share of the way to its middle) and how high up (share of its height, at least); how near the hit a trim, wall and frame part must be (share of the blast); the share of a building's parts that must fall in one go (at least 2) for it to count as a collapse; seconds between rounds of a collapse; how far a part falls (scale 1); how near a neighbour must be for a falling building to land on it */
  },
  /* ---- DEFENCES (Lab prototype, and a match only with ?defence=): posts with a crew mouse, hidden traps, upkeep, a mender, Test my base. Post ranges are in table units; blast, knock and trap reaches follow the piece scale. Nothing here is read unless the Defences switch is on. ---- */
  defence:{
    cost:{pop:1.5,sling:2,counter:2.5,spring:.5,glue:.5,log:.75,cord:.75,snap:.5,warden:.5},   /* build points of each item (a wall is 1, a second lobber 5) */
    restockCost:.5,restockSecs:3,fetchSecs:1.2,oilSecs:3,resetSecs:2.5,   /* points for a bought restock; seconds a mouse takes to refill a post once there; to fetch the ammo; to clear a jam; to set a trap again */
    jamOil:.3,crewReach:.3,                     /* jam meter points a second a crew mouse oils while the post has nothing to shoot at; how near its slot a crew mouse must stand */
    pop:{min:.08,max:.9,every:1.4,ammo:14,jamAfter:9,knock:.8,slow:2.5,slowTo:.5,swatEvery:.5},   /* Pop-gun post: range min and max, seconds between corks, corks in a full load, shots before it jams, how far a mouse is knocked back, seconds slowed and speed then; it swats a small rolling shot in range */
    sling:{min:.9,max:2.7,every:4.5,ammo:6,jamAfter:5,r:.3,over:.3,err:.12,intercept:.4,protect:1.1},   /* Slinger post: range, seconds between lobs, marbles in a full load, shots before it jams, blast reach (a Marble's is .3), aim wobble, chance to knock a shell out of the air (less for heavy ones), how near its landing must be to the post */
    counter:{min:1.5,max:3.7,every:9,ammo:4,jamAfter:4,r:.3,over:.3,err:.2,window:3.5,silence:6},   /* Counter-lobber: it fires at the lobber it saw fire (seen within this many seconds), in this range band only; the Lab's free gun is silenced this long by a hit */
    trap:{reach:.24,spring:{fling:1.0,daze:1.8},glue:{r:.32,secs:7,slowTo:.4,life:9},log:{len:1.7,speed:1.5,w:.1,daze:1.4},cord:{r:.22,daze:2.4},snap:{r:.17,daze:2.0}},   /* a mouse this near (to a hidden trap) springs it. spring: how far it flings a mouse back, seconds it sits dazed; glue: puddle reach, seconds slowed, seconds the puddle stays; log: how far it rolls, speed, lane half-width; cord: crate reach; snap: reach */
    repair:{every:4,calmSecs:3.5,calmR:1.1,reach:.6},   /* a mender on a wall section mends one part every this many seconds, once nothing has landed within calmR for calmSecs and no enemy mouse is near; reach: pieces this near the section count as part of it */
    test:{gunR:1.35,gap:2.5,calm:7,raid:3,raidSecs:28,pass:6,shots:5,seed:424242},   /* Test my base: where the free gun stands (it must be in range of a counter-lobber), seconds between shots, seconds of calm after each weapon, mice in the raid and its length, points above which a weapon is not survived, shots of a volley */
    plan:['counter','pop','spring','warden'],botCrew:['raid','guard','hill','mend'],   /* what a bot buys with what its camp leaves unspent, in order; which of its mice it takes for the posts first */
    drop:[17,10,4]                              /* the kit slots the fortified preset gives up to pay for them: the trap, the workshop, a wall */
  },
  /* per level: seconds between bot shots, aim error, seconds before it sends its squad, and how many points ahead the red bot must be before it spares a scrapper for the walls */
  levels:{friendly:{err2:.65,fire:18,err:.7,send:10,raidLead:8,preset:'average',reloadMul:3.5,noBig:true},easy:{err2:.2,fire:13,err:.5,send:5,raidLead:6,preset:'average'},normal:{err2:.12,fire:12,err:.45,send:2.5,raidLead:1.5,preset:'average'},hard:{err2:.06,fire:11,err:.2,send:.6,raidLead:2,preset:'good'}}
};
var PI=Math.PI,STEP=1/60,PS=.88,SCALES={small:.58,medium:.72,large:.88},RULES=CONFIG,LEVELS=CONFIG.levels,C2=CONFIG.v2,C3=CONFIG.workshop,chainDepth=0;
function V2(){return SG.rules!==1;}
/* v2 distances are written for piece scale 0.88 and follow the pieces */
function U(){return PS/.88;}
/* ---- ammunition. One entry per kind, and each entry carries a weapon record, w: a plain list of numbers. Add an entry here and it shows up in the ammo row, the aim ring and the bots' reach.
   name, icon, short, tint: the button and the ball's colour ('team' = the firing team's, 'cork' = a cork). store: a count on the side that the hill fills (Big Marble). scale: the ball's size.
   w (distances at piece scale 1, seconds): blast (radius, 0 = none) hiMul (blast share when lobbed high) falloff (1 = as in a match; 0 = every part flies as far as the nearest; 2 = the edge barely moves) cap (most parts one landing takes off, 0 = no limit)
   leg (can break a Keep leg) legForce (breaks the nearest leg outright, braced or not) flat (too heavy to lob) speed (flight speed, 1 = usual) arcMul (arc height) arc ([a,b] own arc) bounces (0 to 3) hop, hopH, hopT (each hop: distance, height, seconds)
   popEach (a blast at every touchdown) scatter (balls thrown, 1 to 8) spread (how far they scatter) fuse (seconds before it pops after landing) stick (seconds a glued part cannot be mended) splash (radius of stick, slow and puddle)
   slowTo, slowSecs (mice in the splash walk at this share of their speed, for this long) puddle (seconds the puddle stays) dizzyR (mice this near go dizzy; -1 = the blast radius) dizzySecs (0 = the usual) tether (0, or the string's length: the ball snags the first part it passes and drags it this far toward the shooter)
   quake (radius: parts held by one fastener fall) roll (distance it rolls on after landing) cd (seconds before the next of this kind). The five that matches use read their numbers from CONFIG.v2, so a prototype that changes CONFIG still works. Where they land is the code below, the same for every record. ---- */
var WDEF={blast:0,hiMul:1,falloff:1,cap:0,leg:false,legForce:false,flat:false,speed:1,arcMul:1,arc:null,bounces:0,hop:.9,hopH:.7,hopT:.5,popEach:false,scatter:1,spread:.42,fuse:0,stick:0,splash:0,slowTo:1,slowSecs:0,puddle:0,dizzyR:-1,dizzySecs:0,tether:0,quake:0,roll:0,cd:0};
/* ARSENAL numbers (Lab only; 0 or 1 = nothing new): line (1 = a straight shot, no arc), pierce (thin pieces it punches through), gust (radius of the gust it leaves), gustSecs, push (gust strength), qlvl (2 = a strong thump), mass (how hard a gust moves it) */
WDEF.line=0;WDEF.pierce=0;WDEF.gust=0;WDEF.gustSecs=5;WDEF.push=1;WDEF.qlvl=1;WDEF.mass=1;
/* a record: the defaults, then plain numbers, then numbers that follow CONFIG (a getter; setting one turns it into a plain number) */
function wRec(over,live){var w={},k;for(k in WDEF)w[k]=WDEF[k];for(k in over)w[k]=over[k];
  if(live)Object.keys(live).forEach(function(k2){Object.defineProperty(w,k2,{enumerable:true,configurable:true,get:live[k2],set:function(v){Object.defineProperty(w,k2,{value:v,writable:true,enumerable:true,configurable:true});}});});return w;}
var AMMOT={
  marble:{name:'Marble',icon:'🔵',short:'Marble',tint:'team',w:wRec({leg:true},{blast:function(){return C2.blast;},hiMul:function(){return C2.highBlast;}})},
  big:{name:'Big Marble',icon:'⚫',short:'Big',tint:0x2a2a30,store:'big',scale:2,w:wRec({flat:true,leg:true,legForce:true},{blast:function(){return C2.bigBlast;}})},
  corks:{name:'Corks',icon:'🍾',short:'Corks',tint:'cork',scale:.8,w:wRec({},{scatter:function(){return C2.corkCount;},spread:function(){return C2.corkSpread;},dizzyR:function(){return C2.corkHit;},cd:function(){return C2.corkCd;}})},
  bouncer:{name:'Bouncer',icon:'🏀',short:'Bounce',tint:0xff7a2e,w:wRec({flat:true,bounces:1,dizzyR:-1},{blast:function(){return C2.bouncer.blast;},hop:function(){return C2.bouncer.hop;},hopH:function(){return C2.bouncer.hopH;},hopT:function(){return C2.bouncer.hopT;},arc:function(){return C2.bouncer.arc;},speed:function(){return 1/C2.bouncer.slow;},cd:function(){return C2.bouncer.cd;}})},
  glue:{name:'Glue blob',icon:'🍯',short:'Glue',tint:0x86d23c,scale:1.4,w:wRec({dizzyR:0},{splash:function(){return C2.glue.reach;},stick:function(){return C2.glue.lock;},slowTo:function(){return C2.glue.slowTo;},slowSecs:function(){return C2.glue.slow;},puddle:function(){return C2.glue.puddle;},cd:function(){return C2.glue.cd;}})}
};
/* an entry added the old way (R(hi), cd(), flat, noLeg, bounce(), store as functions and flags) is turned into a record when it is put on the table; R(hi) stays as a way to read the ring radius at scale 1 */
function wNorm(A){if(!A||typeof A!=='object')return A;
  if(!A.w){var w={},hv=function(f){try{return typeof f==='function'?f():f;}catch(e){return undefined;}};
    if(A.R){var r0=+hv(function(){return A.R(false);}),r1=+hv(function(){return A.R(true);});if(isFinite(r0)){w.blast=r0;w.hiMul=r0>0&&isFinite(r1)?r1/r0:1;}}
    if(A.cd)w.cd=+hv(A.cd)||0;if(A.flat)w.flat=true;w.leg=!A.noLeg;
    if(A.bounce){var b=hv(A.bounce)||{};w.bounces=1;w.hop=b.hop;w.hopH=b.hopH;w.hopT=b.hopT;w.arc=b.arc;w.speed=b.slow?1/b.slow:1;}
    A.w=wRec(w);}
  if(!A.R)A.R=function(hi){var W=A.w;return W.blast>0?W.blast*(hi?W.hiMul:1):(W.scatter>1?W.spread:W.splash);};return A;}
Object.keys(AMMOT).forEach(function(k){wNorm(AMMOT[k]);});
var AMMO=typeof Proxy==='function'?new Proxy(AMMOT,{set:function(t,k,v){t[k]=wNorm(v);return true;}}):AMMOT;
var AMMO_ORDER=['marble','big','corks','bouncer','glue'];
/* the ring a shot is drawn with: the blast, or the scatter, or the splash */
function ammoR(id,hi){var W=(AMMO[id]||AMMO.marble).w,r=W.blast>0?W.blast*(hi?W.hiMul:1):(W.scatter>1?W.spread:W.splash);return r*U();}
function ammoReady(side,id){var A=AMMO[id];if(!A)return false;if(A.store)return (side[A.store]||0)>0;if(A.w.cd>0)return !((side.cd[id]||0)>0);return true;}
function ammoSpend(side,id){var A=AMMO[id];if(A.store)side[A.store]--;else if(A.w.cd>0)side.cd[id]=A.w.cd;}
/* how far a ball with n bounces travels after its first touchdown (scale 1) */
function bounceTotal(W){var t=0;for(var i=0;i<(W.bounces|0);i++)t+=W.hop*Math.pow(C3.decay,i);return t;}
/* the words on an ammo button: "Marble ∞", "Big Marble ×2", "Corks (ready in 5 s)" */
function ammoCount(side,id){var A=AMMO[id];if(A.store)return '×'+(side[A.store]||0);if(A.w.cd>0&&(side.cd[id]||0)>0)return '(ready in '+Math.ceil(side.cd[id])+' s)';return '∞';}
function ammoLabel(side,id){return AMMO[id].name+' '+ammoCount(side,id);}
/* a short string that changes whenever any ammo count or wait changes, so the buttons are redrawn */
function ammoKey(side){return AMMO_ORDER.map(function(id){return ammoCount(side,id);}).join(',')+'|'+side.ammo+'|'+side.lsel;}
var KIT=['wall','wall','wall','wall','wall','wall','gate','tower','lobber','tent','workshop'];
/* v2: more pieces than the 12 points can buy. The first eleven slots are the old kit, so old presets still fit. */
var KIT2=KIT.concat(['wall','wall','brace','brace','brace','lobber','trap','trap']);
function KITL(){return V2()?KIT2:KIT;}
/* what a piece costs a side now: the tower and the first lobber are free */
function cost(s,kind){var c=C2.cost[kind];if(kind==='lobber'&&!SG.pieces.some(function(p){return p.side===s&&p.kind==='lobber';}))return 0;return c==null?1:c;}
var FOOT0={wall:[.43,.07],gate:[.48,.1],tower:[.3,.3],lobber:[.33,.4],tent:[.36,.36],workshop:[.3,.25],brace:[.07,.17],trap:[.15,.15],cottage:[.42,.32],barn:[.5,.54],lookout:[.3,.3],bridge:[.74,.2],windmill:[.34,.3],stall:[.37,.2]},FOOT={},TALL0={wall:.42,gate:.62,tower:1.1,lobber:.5,tent:.42,workshop:.5,brace:.42,trap:.12,cottage:.62,barn:.7,lookout:1.45,bridge:1.0,windmill:1.3,stall:.55},TALL={};
/* the Building Yard's kinds (Lab only: they are in no kit, so a match never has one). Each is one piece with 15 to 40 parts that hang on each other (models.js, SS.bldInfo) */
var BK={cottage:1,barn:1,lookout:1,bridge:1,windmill:1,stall:1},BLDI={};
function bldInfo(k){if(BLDI[k]===undefined)BLDI[k]=BK[k]&&SS.bldInfo?SS.bldInfo(k):null;return BLDI[k];}
/* one number sets how big everything on the table is: pieces, mice, the hill, blasts and reaches all follow it */
function setScale(ps){PS=ps;for(var k in FOOT0){FOOT[k]=[FOOT0[k][0]*PS,FOOT0[k][1]*PS];TALL[k]=TALL0[k]*PS;}gridDirty=true;}
function WALK(){return V2()?C2.walk*U():CONFIG.walk;}
function HILLR(){return 1.0*U();}
var ZONE={rMin:1.03,rMax:2.72,half:1.22},MAT={r0:2.78,r1:3.2,r:2.99,scale:.32,pick:2.6,step:.185},gridDirty=true;setScale(.88);
/* ===== ARSENAL data that must exist early (Lab only; the rules are in the ARSENAL section further down) ===== */
var IGN=null,ARSF='';   /* the pieces the shot being looked at has already gone through; its family */
/* the eight counter pieces: [half length, half depth, height] at piece scale 1. They are in FOOT0, TALL0 and BK (so the Building Yard's support rule and stages hold them up) but in no kit: a match never has one. */
var CK={awning:[.34,.13,1],shield:[.34,.08,.5],ditch:[.8,.12,.04],logs:[.7,.15,.28],net:[.36,.13,1],cutter:[.1,.1,.6],heavy:[.2,.2,.34],lowwall:[.34,.07,.16]};
(function(){var k,pts={awning:2,shield:2,ditch:1,logs:2,net:1.5,cutter:1,heavy:3,lowwall:1.5},cost={awning:1,shield:1,ditch:1,logs:1,net:.5,cutter:.5,heavy:1.5,lowwall:.5};
  for(k in CK){FOOT0[k]=[CK[k][0],CK[k][1]];TALL0[k]=CK[k][2];BK[k]=1;C2.piecePts[k]=pts[k];C2.cost[k]=cost[k];}
  var cp=C3.caps;cp.line=[0,1];cp.pierce=[0,3];cp.gust=[0,1];cp.gustSecs=[0,10];cp.push=[0,2];cp.qlvl=[1,2];cp.mass=[.2,4];setScale(PS);})();
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
  viewClear();opts=opts||{};if(opts.mode==='lab')opts.rules=2;SG.opts=opts;SG.rules=opts.rules===1||(opts.rules==null&&SG.rulesDefault===1)?1:2;SG.pieceSize=SCALES[opts.pieces]?opts.pieces:(SG.rules===1?'large':(SG.piecesDefault||CONFIG.pieceScale));setScale(SCALES[SG.pieceSize]);SG.debris=[];SG.fuses=[];SG.topN=0;SG.lastDir=null;chainDepth=0;SG.slowT=0;SG.shake=0;SG.fallWinner=-1;SG.att=0;SG.mode=opts.mode==='table'?'table':(opts.mode==='lab'?'lab':'solo');if(SG.mode==='lab')SG.rules=2;SG.team=SG.mode==='table'||SG.mode==='lab'?'blue':(team==='red'?'red':'blue');SG.level=LEVELS[opts.level]?opts.level:(SG.level||'easy');
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
  SG.kit=SG.sides[0].kit;for(var bs=0;bs<2;bs++)if(V2()&&!SG.sides[bs].preset&&SG.sides[bs].bot)SG.sides[bs].preset=LEVELS[SG.sides[bs].level].preset||'average';fitPreset(0);fitPreset(1);viewStart();defOff();if(SG.mode==='solo'||SG.mode==='table'){labProtosOff();labWeaponsOff();}if(opts.defence&&SG.mode==='solo')defMatchInit(opts);if(V2())for(var hs=0;hs<2;hs++)if(SG.sides[hs].human)SG.select(towerSlot(hs),hs);   /* the Keep goes first, so it is already in hand */
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
  if(DEF.match)defBuildItems();   /* DEFENCES (flag): a fortified bot buys its posts and traps with what its camp left */
  fixGrid();SG.mice.forEach(function(m){m.state='cheer';m.job=0;m.goal=false;m.rot=m.side?PI:0;});
  SG.sides[0].sel=SG.sides[1].sel=-1;SG.phase='ready';SG.time=CONFIG.ready;SG.readyText=V2()?mine(0).length+' pieces built, '+SG.sides[0].points+' points left.':mine(0).length+' of '+KIT.length+' pieces placed.';ui();if(SG.mode==='table')startRound(1);}
SG.skipBuild=function(){if(SG.phase!=='build')return;for(var s=0;s<2;s++){var i;while((i=nextSlot(s))>=0){if(!botPlace(s,i).ok)SG.sides[s].kit[i].used=true;}}finishBuild();};
SG.begin=function(){if(SG.phase==='ready')startRound(1);};
function startObj(p){if(p.ps.length||p.started)return;p.started=true;var ids=viewObj(p);
  ids.forEach(function(q){p.ps.push({id:q.id,st:'on',used:false,mender:-1,wx:q.x,wy:q.y,wz:q.z,rx:0,rz:0,t0:-9,rank:q.rank,cls:/^tower\.post/.test(q.id)?1:(/^tower\.brace/.test(q.id)?2:(/post|rail/.test(q.id)?3:0))});});p.total=p.ps.length;gridDirty=true;
  if(BK[p.kind]){var B=bldInfo(p.kind);p.pi={};p.ps.forEach(function(e,i){p.pi[e.id]=i;var bi=B&&B.parts[e.id];if(bi){e.cls=0;e.stg=bi.stg;e.need=bi.need;e.min=bi.min;e.dly=bi.dly;e.leg=bi.leg;}});p.legs=B?B.bigLegs:2;}}
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
function pieceAt(x,y,z,skip){for(var j=0;j<SG.pieces.length;j++){var p=SG.pieces[j];if(p.id===skip||!p.built||y>TALL[p.kind]||(IGN&&IGN[p.id])||(CK[p.kind]&&arsSkip(p,y)))continue;if(p.total&&p.parts<=0)continue;var qx=x-p.x,qz=z-p.z;if(qx*qx+qz*qz>.6)continue;
    var f=FOOT[p.kind],l=toLocal(p,x,z);if(Math.abs(l[0])<f[0]+.03&&Math.abs(l[1])<f[1]+.05){if(bareFrame(p)&&!nearFrame(p,x,z))continue;return p;}}return null;}
/* A wall or gate that has lost every plank, rail, door and lintel is only a frame (posts, and a gate's braces): a flat shot passes between them and stops only where a post stands. Anything with a plank, rail, door or lintel left still stops a shot as it always did. */
function bareFrame(p){if(p.kind!=='wall'&&p.kind!=='gate')return false;var re=p.kind==='wall'?/plank|rail/:/lintel|door/;for(var i=0;i<p.ps.length;i++)if(p.ps[i].st==='on'&&re.test(p.ps[i].id))return false;return true;}
function nearFrame(p,x,z){var r=C2.frameR*U();for(var i=0;i<p.ps.length;i++){var q=p.ps[i];if(q.st==='on'&&dist(q.wx,q.wz,x,z)<r)return true;}return false;}
SG.pieceAt=pieceAt;SG.overlap=overlap;
function marblePos(a,k){return [a.x0+(a.x1-a.x0)*k,a.y0*(1-k)+4*a.h*k*(1-k),a.z0+(a.z1-a.z0)*k];}
/* where between two points of its flight a marble first touches a piece, so the spot shown, the spot the bot reckons with and the real landing agree */
function entryK(a,k0,k1,skip){for(var i=0;i<8;i++){var km=(k0+k1)/2,q=marblePos(a,km);if(pieceAt(q[0],q[1],q[2],skip))k1=km;else k0=km;}return k1;}
/* the arc to a spot; .hit says which piece is first in the way, if any. A Big Marble is too heavy for the high lob: it always flies low, so a wall in front of the Keep stops it */
/* the first piece a flight touches, from k0 on: {piece, side, own, x, y, z} or null */
function scanArc(a,s,skip,k0){for(var k=k0;k<=1.0001;k+=.02){var pos=marblePos(a,Math.min(1,k)),p=pieceAt(pos[0],pos[1],pos[2],skip);if(p){if(V2()){k=entryK(a,k-.02,Math.min(1,k),skip);pos=marblePos(a,k);p=pieceAt(pos[0],pos[1],pos[2],skip)||p;}return {piece:p.id,side:p.side,own:p.side===s,k:k,x:pos[0],y:pos[1],z:pos[2]};}}return null;}
/* a.fx, a.fz: where it finally comes down if nothing is in the way. A bouncing ball (a.next) lands first at a.x1,a.z1, then hops on to a.fx,a.fz. */
SG.arc=function(s,tx,tz,li){var l=lobberOf(s,li);if(!l)return null;var side=SG.sides[s],A=V2()?AMMO[side.ammo]:null,W=A?A.w:null,nb=W?(W.bounces|0):0,hop=nb?bounceTotal(W)*U():0,dx=tx-l.x,dz=tz-l.z,d=Math.sqrt(dx*dx+dz*dz),mx=6.2,mn=.7+hop;
  if(d>mx){tx=l.x+dx/d*mx;tz=l.z+dz/d*mx;d=mx;}else if(d<mn&&d>0){tx=l.x+dx/d*mn;tz=l.z+dz/d*mn;d=mn;}
  var rr=Math.sqrt(tx*tx+tz*tz);if(rr>3.2){tx*=3.2/rr;tz*=3.2/rr;if(nb)d=Math.sqrt((tx-l.x)*(tx-l.x)+(tz-l.z)*(tz-l.z));}
  var hi=V2()&&side.high&&!(W&&W.flat),ar=W&&W.arc?W.arc:(W&&W.line>0?[0,0]:(V2()?(hi?C2.arcHigh:C2.arcLow):[.3,.2])),fx=tx,fz=tz,ux=d>0?(tx-l.x)/d:0,uz=d>0?(tz-l.z)/d:1;
  if(nb){d-=hop;tx=fx-ux*hop;tz=fz-uz*hop;}
  var a={x0:l.x,y0:.42*U(),z0:l.z,x1:tx,z1:tz,h:(ar[0]*U()+d*ar[1])*(W?W.arcMul:1),T:(.65+d*.17)*(hi?1.35:1)/(W?W.speed:1),from:l.id,hit:null,high:!!hi,fx:fx,fz:fz,li:li==null?side.lsel:li};
  labProto('arc',a,s);ARSF=famOf(W);
  a.k0=li==='gun'?.3:.12;   /* the Lab's free gun sits on the table's rim and clears the first third of its flight, so it shoots over your own camp */
  a.hit=scanArc(a,s,l.id,a.k0);
  /* a bouncing ball: a chain of hops after the first touchdown, each shorter and lower; the chain stops at the first piece one of them meets */
  if(nb&&!a.hit){var prev=a,sx=tx,sz=tz;for(var bi=0;bi<nb;bi++){var hp=W.hop*U()*Math.pow(C3.decay,bi),ex=bi===nb-1?fx:sx+ux*hp,ez=bi===nb-1?fz:sz+uz*hp,b2={x0:sx,y0:.02,z0:sz,x1:ex,z1:ez,h:W.hopH*U()*Math.pow(C3.decay,bi),T:W.hopT*Math.pow(C3.decay,bi*.5),from:l.id,hit:null,high:false};
      b2.hit=scanArc(b2,s,l.id,.03);prev.next=b2;prev=b2;sx=ex;sz=ez;if(b2.hit){a.hit=b2.hit;break;}}}
  ARSF='';return a;};
SG.fire=function(s,tx,tz,li){var side=SG.sides[s];if(li==null)li=side.lsel||0;if(SG.phase!=='fight'||SG.lobberBlock(s,li))return null;var a=SG.arc(s,tx,tz,li);if(!a)return null;var l=lobberOf(s,li);
  if(V2()){a.ammo=side.ammo;var A=AMMO[a.ammo],W=A.w;ammoSpend(side,a.ammo);SG.stats.ammoShots[a.ammo]=(SG.stats.ammoShots[a.ammo]||0)+1;a.tw=W.tether>0?1:0;a.sx=a.x0;a.sz=a.z0;
    /* a scatter: more balls thrown round the aimed spot, each a shot of its own */
    for(var ci2=1;ci2<W.scatter;ci2++){var an=ci2/(W.scatter-1)*PI*2+rand(),rd=W.spread*U()*(.45+rand()*.55),c2=SG.arc(s,a.x1+Math.cos(an)*rd,a.z1+Math.sin(an)*rd,li);c2.id=SG.nextId++;c2.side=s;c2.t=-ci2*.04;c2.live=true;c2.ammo=a.ammo;c2.tw=a.tw;c2.sx=a.sx;c2.sz=a.sz;SG.marbles.push(c2);}
    if(a.ammo!=='marble'&&!(A.store&&side[A.store]>0))side.ammo='marble';}
  snd(V2()&&A&&A.sfx?A.sfx:'twang');a.id=SG.nextId++;a.side=s;a.t=0;a.live=true;SG.marbles.push(a);l.reload=(V2()?C2.reload:CONFIG.reload)*(side.bot&&LEVELS[side.level]&&LEVELS[side.level].reloadMul||1);l.fired=SG.clock;SG.stats.shots++;SG.stats.bySide[s].shots++;event('shot',s);
  l.aim=Math.atan2(a.x1-l.x,a.z1-l.z);if(DEF.on)defSeen(s,l,a);return a;};
function knock(p,i,dx,dz,by,far){var q=p.ps[i];if(!q||q.st!=='on')return false;var l=Math.sqrt(dx*dx+dz*dz)||1,f=far==null?.28+rand()*.3:far*(.85+rand()*.3),lat=(rand()-.5)*.3;
  q.st=V2()&&q.used?'gone':'off';if(V2()){SG.debris.push({t:SG.clock+.72,x:0,z:0,far:f,pid:p.id,i:i,dep:chainDepth+(by==='collapse'?1:0)});}
  q.t0=SG.clock;q.rx=q.wx+dx/l*f-dz/l*lat;q.rz=q.wz+dz/l*f+dx/l*lat;var rr=Math.sqrt(q.rx*q.rx+q.rz*q.rz);if(rr>3.05){q.rx*=3.05/rr;q.rz*=3.05/rr;}
  snd('knock');q.mender=-1;p.parts--;SG.stats.partsOff++;SG.stats.bySide[p.side].partsLost++;if(V2()&&SG.att!=null){var cz=SG.cause||'other',dd=SG.stats.dmg[cz]||(SG.stats.dmg[cz]=[0,0]);dd[SG.att?1:0]+=partWorth(p);}   /* the score value of what each kind of shot took off, by who fired it */gridDirty=true;event('part',p.side,q.id);if(!V2()||SG.clock-(SG.popT||-9)>.35){SG.popT=SG.clock;pop(q.wx,q.wz,partName(q.id)+' off!',false,q.wy+.15);}viewFlash(q.wx,q.wy,q.wz);if(V2())SG.debris[SG.debris.length-1].x=q.rx,SG.debris[SG.debris.length-1].z=q.rz;SG.lastKnock={piece:p.id,part:q.id,by:by||'',t:SG.clock};if(SG.mode==='lab')labNote('part',p,q);return true;}
function nearestPart(p,x,y,z,flat){var best=-1,bd=1e9;p.ps.forEach(function(q,i){if(q.st!=='on')return;var d=(q.wx-x)*(q.wx-x)+(q.wz-z)*(q.wz-z)+(flat?0:(q.wy-y)*(q.wy-y));if(d<bd){bd=d;best=i;}});return best;}
function hitPiece(p,x,y,z,dx,dz){var i=nearestPart(p,x,y,z,false);if(i<0)return '';var id=p.ps[i].id;knock(p,i,dx,dz,'marble');return id;}
function dizzy(m,secs){if(m.state==='dizzy'||SG.phase==='over')return false;dropJob(m);m.state='dizzy';m.t=secs>0?secs:(V2()&&standsOK(SG.sides[m.side].tent)?C2.tentDizzy:CONFIG.dizzy);m.speed=0;m.goal=false;m.daze=false;m.crewing=false;m.path=null;snd('twinkle');SG.stats.dizzies++;SG.stats.bySide[m.side].dizzied++;event('dizzy',m.side);return true;}
function dropJob(m){if(m.part>=0){var p=pieceById(m.job),q=p&&p.ps[m.part];if(q){if(q.st==='carried'){q.st='off';q.rx=m.x;q.rz=m.z;q.t0=SG.clock-2;}q.mender=-1;}}m.job=0;m.part=-1;}
function tickMarbles(dt){tickFuses();
  for(var i=SG.marbles.length-1;i>=0;i--){var a=SG.marbles[i];a.t+=dt;
    if(a.rolling){rollTick(a,dt);continue;}
    if(!a.live){if(a.t>a.T+.8&&!a.pend)SG.marbles.splice(i,1);continue;}
    if(a.t<0)continue;arsIn(a);var k=Math.min(1,a.t/a.T),pos=marblePos(a,k),hit=k>(a.leg===2?.03:(a.k0||.12))?pieceAt(pos[0],pos[1],pos[2],a.from):null,part='',n=0,red=SG.sides[a.side].team==='red';
    if(V2()){if(a.tw>0&&!a.snag&&k>(a.k0||.12)){var sn=tetherFind(a,pos);if(sn){a.snag=sn;landV2(a,pos,sn.p);continue;}}   /* a tether snags the first part it passes */
      if(hit&&arsMode()&&arsPierce(a,hit,pos))hit=null;
      if(hit){var ke=entryK(a,Math.max(a.leg===2?.03:(a.k0||.12),(a.t-dt)/a.T),k,a.from);pos=marblePos(a,ke);hit=pieceAt(pos[0],pos[1],pos[2],a.from)||hit;}if(hit||k>=1)landV2(a,pos,hit);continue;}
    if(hit){part=hitPiece(hit,pos[0],pos[1],pos[2],a.x1-a.x0,a.z1-a.z0);for(var e=1;e<(red?CONFIG.redParts:CONFIG.blueParts);e++)hitPiece(hit,pos[0],pos[1],pos[2],a.x1-a.x0,a.z1-a.z0);if(hit.side===a.side)SG.stats.ownHits++;}
    if(hit||k>=1){SG.mice.forEach(function(m){if(m.side!==a.side&&dist(m.x,m.z,pos[0],pos[2])<CONFIG.blast&&dizzy(m))n++;});
      snd('thud');a.live=false;a.T=a.t;a.hx=pos[0];a.hy=pos[1];a.hz=pos[2];SG.lastHit={id:a.id,side:a.side,x:pos[0],y:pos[1],z:pos[2],piece:hit?hit.id:0,own:!!hit&&hit.side===a.side,part:part,dizzied:n,t:SG.clock};viewPuff(pos[0],pos[2],1.2);}}
  ARSF='';IGN=null;for(i=SG.corks.length-1;i>=0;i--){SG.corks[i].t+=dt;if(SG.corks[i].t>.3)SG.corks.splice(i,1);}}
/* a cork needs a clear line: any standing piece in between stops it */
function segHitsBox(p,x0,z0,x1,z1){var f=FOOT[p.kind],a=toLocal(p,x0,z0),b=toLocal(p,x1,z1),t0=0,t1=1,d=[b[0]-a[0],b[1]-a[1]];
  for(var i=0;i<2;i++){if(Math.abs(d[i])<1e-9){if(Math.abs(a[i])>f[i])return false;}else{var u0=(-f[i]-a[i])/d[i],u1=(f[i]-a[i])/d[i];if(u0>u1){var t=u0;u0=u1;u1=t;}if(u0>t0)t0=u0;if(u1<t1)t1=u1;if(t0>t1)return false;}}return true;}
function sightClear(x0,z0,x1,z1){for(var i=0;i<SG.pieces.length;i++){var p=SG.pieces[i];if(!p.built||!blocks(p))continue;if(segHitsBox(p,x0,z0,x1,z1))return false;}return true;}
SG.sightClear=sightClear;

/* --- orders --- */
SG.order=function(s,x,z){var side=SG.sides[s];if(SG.phase!=='fight'&&SG.phase!=='mend'&&SG.phase!=='count')return false;var r=Math.sqrt(x*x+z*z);if(r>3.0){x*=3/r;z*=3/r;}side.order={x:x,z:z};if(side.human)say('order','Squad on the way',false,s);return true;};
/* fallen parts that can go back, in support order: legs and posts first */
function mendable(p){var o=[];if(p.down)return o;p.ps.forEach(function(q,i){if(q.st==='off'&&!q.used&&q.mender<0&&!(q.glue>SG.clock))o.push(i);});if(V2())o.sort(function(a,b){return p.ps[a].rank-p.ps[b].rank;});return o;}
function isFree(m){return !m.dj&&(m.state==='idle'||m.state==='go'||m.state==='hold');}   /* DEFENCES: a mouse with a post or trap job (m.dj) is not free */
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
function slowOf(m){return V2()&&m.slowT>0?(m.slowK||C2.glue.slowTo):1;}
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
    if(DEF.on&&defMouse(m,dt))return;   /* DEFENCES (flag): a mouse on a post, trap or wall job */
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
function blastAt(x,y,z,R,att,big,dirx,dirz,skipId,dry,hitId,kind,cap,fall){
  var touched=[],n=0,val=0,dl=Math.sqrt(dirx*dirx+dirz*dirz)||1,noLeg=!!(kind&&AMMO[kind]&&!AMMO[kind].w.leg),plan=[],defer=cap>0&&!dry;if(!dry){SG.att=att;SG.cause=kind||(big?'big':'marble');}
  for(var pi=0;pi<SG.pieces.length;pi++){var p=SG.pieces[pi];if(p.id===skipId||!p.built||!p.total||p.down||Math.abs(p.x-x)>R+.75||Math.abs(p.z-z)>R+.75||boxDist(p,x,z)>R+.05)continue;var hits=[],leg=-1,ld=1e9,near=big&&p.kind==='tower'&&p.id===hitId;
    if(BK[p.kind]){if(dry)continue;hits=bldHits(p,x,y,z,R,big,noLeg,p.id===hitId);}else for(var i=0;i<p.ps.length;i++){var q=p.ps[i];if(q.st!=='on')continue;var d=Math.sqrt((q.wx-x)*(q.wx-x)+(q.wz-z)*(q.wz-z)+(q.wy-y)*(q.wy-y)*.45);if(noLeg&&q.cls===1)continue;if(near&&q.cls===1){if(d<ld){ld=d;leg=i;}continue;}if(d>R)continue;
      if(q.cls===1){if(d>R*C2.legSturdy||legBraced(p,q.id))continue;}else if(q.cls===3&&d>R*C2.sturdy)continue;else if(q.cls===2&&d>R*C2.braceSturdy)continue;hits.push([d,i]);}
    if(leg>=0)hits.push([Math.min(ld,R*.8),leg]);if(!hits.length)continue;
    if(dry){var A=C2.aimWorth,w=partWorth(p),sg=p.side===att?-1:1,v=0,rails=0,posts=0,legs=0;
      for(var hh=0;hh<hits.length;hh++){var qq=p.ps[hits[hh][1]];v+=w;if(qq.cls===1)legs++;else if(qq.cls===2)v+=A.brace;else if(qq.cls===3){if(/rail/.test(qq.id))rails++;else posts++;}}
      if(legs)v+=legs*(A.leg+(onCount(p,/^tower\.post/)<=3?A.lastLeg:0));
      if(p.kind==='wall'&&(rails||posts)&&((rails&&rails>=onCount(p,/rail/))||(posts&&posts>=onCount(p,/post/)&&!props(p).length)))v+=C2.collapsePts+w*Math.max(0,onCount(p,/plank/)-(hits.length-rails-posts));   /* this shot would bring the wall down */
      if(p.kind==='gate'&&posts&&onCount(p,/gate\.post/)-posts<2)v+=C2.collapsePts+w*2;
      val+=sg*v;continue;}
    hits.sort(function(a,b){return a[0]-b[0];});
    if(defer){plan.push({p:p,hits:hits});continue;}   /* a capped weapon first sees every part in reach, then takes the nearest */
    hits.forEach(function(h){blastKnock(this,h,x,z,R,dirx,dirz,dl,fall)&&n++;},p);touched.push(p);}
  if(dry)return val;
  if(defer){var all=[];plan.forEach(function(e){e.hits.forEach(function(h){all.push([h[0],h]);});});all.sort(function(a,b){return a[0]-b[0];});var keepH=all.slice(0,cap).map(function(e){return e[1];});
    plan.forEach(function(e){e.hits.forEach(function(h){if(keepH.indexOf(h)>=0&&blastKnock(e.p,h,x,z,R,dirx,dirz,dl,fall))n++;});touched.push(e.p);});}
  touched.forEach(function(p){settle(p,att);});return n;}
/* one part of a blast comes off, thrown away from the centre; the nearest fly furthest (fall: 1 = as in a match) */
function blastKnock(p,h,x,z,R,dirx,dirz,dl,fall){var q=p.ps[h[1]],ax=q.wx-x,az=q.wz-z,al=Math.sqrt(ax*ax+az*az)||1,k=1-h[0]/R,
  th=fall==null||fall===1?(C2.throwFar+(C2.throwNear-C2.throwFar)*k):Math.max(.03,C2.throwNear-(C2.throwNear-C2.throwFar)*fall*(1-k));
  return knock(p,h[1],ax/al*.6+dirx/dl,az/al*.6+dirz/dl,'marble',th*U());}
function dropAll(p,re,att){var n=0,sgn=p.side?1:-1;p.ps.forEach(function(q,i){if(q.st==='on'&&re.test(q.id)){var a=rand()*PI*2;if(knock(p,i,Math.cos(a),Math.sin(a),'collapse',(.12+rand()*.22)*U()))n++;}});return n;}
/* what gives way in a piece right now, if anything: '' (it stands), 'wall-all', 'wall-planks', 'gate', 'keep' (the tower comes down) or 'roof'. settle() acts on it, and the Lab asks it
   about each part in turn ("would this part alone bring it down?"), so the Lab shows the real rule. */
function holdFail(p){
  if(BK[p.kind])return '';   /* a building has no single verdict: bSettle asks each part */
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
  if(BK[p.kind])return bSettle(p,att);
  if(!V2()||!p.built||p.down)return 0;var fell=0,f=holdFail(p);
  if(f==='wall-all')fell=dropAll(p,/./,att);else if(f==='wall-planks')fell=dropAll(p,/plank/,att);else if(f==='gate')fell=dropAll(p,/lintel|door|brace/,att);
  else if(f==='keep'){keepDown(p,att);return 99;}else if(f==='roof')fell=dropAll(p,/roof/,att);
  if(fell>=2)collapse(p,att,fell);
  else if(f&&f!=='roof'&&f!=='keep'&&SG.mode==='lab'&&SG.lab&&SG.lab.topple&&!p.fallen){p.fallen=true;collapse(p,att,fell);}   /* Lab, chain topple on: a wall or gate that has lost its frame falls even if the blast already took its planks */
  return fell;}
/* a match shakes and slows the same for every collapse; in the Lab, with "Shake by size" or "Slow-mo beat by size" on, labFx sets them from the parts that fell at once instead */
function fxShake(v){if(!(SG.mode==='lab'&&SG.lab&&SG.lab.fxShake))SG.shake=v;}
function fxSlow(v){if(!(SG.mode==='lab'&&SG.lab&&SG.lab.fxSlow))SG.slowT=v;}
function collapse(p,att,n){var st=SG.stats;if(SG.mode==='lab')labNote('collapse',p,chainDepth+1);st.collapses++;if(att!==p.side)SG.sides[att].collapses++;fxSlow(C2.slowMo);fxShake(1);snd('crash');event('collapse',p.side,p.kind);pop(p.x,p.z,'CRASH!',false,TALL[p.kind]+.25);viewPuff(p.x,p.z,2.2);
  var f=FOOT[p.kind];SG.mice.forEach(function(m){if(boxDist(p,m.x,m.z)<C2.collapseReach*U())dizzy(m);});gridDirty=true;
  if(SG.mode==='lab'&&SG.lab&&SG.lab.topple){chainDepth++;topple(p,att);chainDepth--;}}
/* the Keep comes down: that side has lost. It falls slowly, then the win card. */
function keepDown(p,att){p.down=true;p.fallT=SG.clock;p.fallDir=Math.atan2(p.x-hillAt().x,p.z-hillAt().z)+(rand()-.5)*.8;p.ps.forEach(function(q){q.st='gone';q.mender=-1;});p.parts=0;SG.stats.keepDown=true;SG.stats.keepBy=SG.cause||'';SG.stats.keepAt=SG.clock;SG.stats.collapses++;if(att!==p.side)SG.sides[att].collapses++;
  fxSlow(C2.slowMo*2);fxShake(1.6);snd('crash');event('keep',p.side);pop(p.x,p.z,'CRASH!',false,TALL.tower+.3);viewPuff(p.x,p.z,3);SG.mice.forEach(function(m){if(boxDist(p,m.x,m.z)<C2.collapseReach*2*U())dizzy(m);});
  SG.mice.forEach(function(m){dropJob(m);});gridDirty=true;if(SG.mode==='lab'){labNote('keep',p,chainDepth+1);if(SG.lab&&SG.lab.topple){chainDepth++;topple(p,att);chainDepth--;}shout(NAME[SG.sides[p.side].team]+"'s Keep is down!");return;}   /* in the Lab nothing ends: the Keep just falls, and Reset or Heal puts it back */
  SG.fallWinner=1-p.side;SG.phase='fall';SG.time=C2.keepFall;SG.sides[0].aim.on=SG.sides[1].aim.on=false;shout(NAME[SG.sides[p.side].team]+"'s Keep is down!");ui();}
/* a marble, a Big Marble, a cork or a Workshop weapon comes down. What it does follows its weapon record (AMMO[id].w). */
function landV2(a,pos,hit){var A=AMMO[a.ammo]||AMMO.marble,W=A.w,n0=SG.stats.partsOff;
  /* a bouncing ball that touches down with nothing in the way hops on: the same ball, a new flight (popEach: and goes off at every touchdown) */
  if(a.next&&!hit){var nx=a.next;a.x0=nx.x0;a.y0=nx.y0;a.z0=nx.z0;a.x1=nx.x1;a.z1=nx.z1;a.h=nx.h;a.T=nx.T;a.t=0;a.leg=2;a.next=nx.next||null;SG.stats.bounces++;snd('tap');viewPuff(pos[0],pos[2],.7);if(W.popEach){var rb=boom(a,pos,null);if(SG.mode==='lab'){labNote('land',a,pos,rb.R,null);labFx(SG.stats.partsOff-n0);}}return;}
  /* a fuse: it lies where it landed, then pops */
  if(W.fuse>0&&!a.fused){a.fused=1;a.pend=true;a.live=false;a.T=a.t;a.hx=pos[0];a.hy=pos[1];a.hz=pos[2];SG.fuses.push({a:a,pos:pos.slice(),hit:hit,t:SG.clock+W.fuse});snd('tap');viewPuff(pos[0],pos[2],.5);return;}
  if(a.tw&&!a.snag)a.snag=tetherAt(a,pos,hit);   /* a tether that has not snagged in the air snags the part it comes down on, or the nearest one on the ground */
  var r=boom(a,pos,hit);
  if(SG.mode==='lab'){labNote('land',a,pos,r.R,hit);labFx(SG.stats.partsOff-n0);}
  snd(A.sfxL||'thud');a.live=false;a.T=a.t;a.hx=pos[0];a.hy=pos[1];a.hz=pos[2];if(a.ammo!=='corks'||!SG.lastHit||SG.lastHit.id!==a.id)SG.lastHit={id:a.id,side:a.side,ammo:a.ammo,x:pos[0],y:pos[1],z:pos[2],piece:hit?hit.id:0,own:!!hit&&hit.side===a.side,part:'',knocked:r.knocked,dizzied:r.n,t:SG.clock};viewPuff(pos[0],pos[2],W.legForce?2:1.2);
  if(W.roll>0)rollStart(a,pos);else if(!hit)momentumLands(a,pos);}
/* what a landing does, in the order: a tether yanks its part, the blast, mice made dizzy, glue and slowing, a quake. Returns {R, n (mice), knocked (parts off by the blast)}. */
function boom(a,pos,hit){var A=AMMO[a.ammo]||AMMO.marble,W=A.w,u=U(),n=0,knocked=0,R=labProto('blastR',ammoR(a.ammo,a.high),a),en=1-a.side;
  if(a.rb>0)R=a.rb;   /* DEFENCES: a post's shell has a blast of its own */
  if((SG.mode==='lab'&&SG.lab)||DEF.match){R=arsBoom(a,pos,hit,R);if(a.caught)return {R:0,n:0,knocked:0};}   /* ARSENAL: a counter may cut the blast, catch the ball or cut the tether */
  if(SG.mode==='lab'&&SG.lab){var dl=Math.sqrt((a.x1-a.x0)*(a.x1-a.x0)+(a.z1-a.z0)*(a.z1-a.z0))||1;SG.lastDir={x:(a.x1-a.x0)/dl,z:(a.z1-a.z0)/dl};}
  if(a.snag){var sp=a.snag.p,sq=sp.ps[a.snag.i];if(sq&&sq.st==='on'){SG.att=a.side;SG.cause='tether';knock(sp,a.snag.i,a.sx-sq.wx,a.sz-sq.wz,'tether',W.tether*u);pop(sq.wx,sq.wz,'Snagged!',false,sq.wy+.2);settle(sp,a.side);}}
  if(W.blast>0){knocked=blastAt(pos[0],pos[1],pos[2],R,a.side,W.legForce,a.x1-a.x0,a.z1-a.z0,a.from,false,hit?hit.id:0,a.ammo,W.cap,W.falloff);if(hit&&hit.side===a.side)SG.stats.ownHits++;if(knocked>=3||W.legForce)SG.shake=Math.max(SG.shake,.6);}
  var dr=W.dizzyR<0?R:W.dizzyR*u;
  if(dr>0)SG.mice.forEach(function(m){if(m.side!==a.side&&dist(m.x,m.z,pos[0],pos[2])<dr&&dizzy(m,W.dizzySecs))n++;});
  /* glue and its kin: a splash that sticks fallen parts, slows mice and may leave a puddle */
  if(W.splash>0){var Rs=W.splash*u,ng=0;
    if(W.stick>0){if(hit&&hit.total&&hit.side!==a.side){var hi=nearestPart(hit,pos[0],pos[1],pos[2],false);if(hi>=0){hit.ps[hi].glue=SG.clock+W.stick;ng++;}}
      SG.pieces.forEach(function(p){if(p.side!==en||!p.built||!p.total)return;p.ps.forEach(function(q,i){if(q.st!=='off'||q.used||dist(q.rx,q.rz,pos[0],pos[2])>=Rs)return;q.glue=SG.clock+W.stick;ng++;
        if(q.mender>=0)SG.mice.forEach(function(m){if(m.job===p.id&&m.part===i&&m.state==='toPart'){dropJob(m);m.state='idle';m.goal=false;}});});});SG.stats.glued+=ng;}
    if(W.puddle>0)SG.puddles.push({x:pos[0],z:pos[2],r:Rs,side:a.side,t0:SG.clock,life:W.puddle,k:W.slowTo,secs:W.slowSecs});
    if(W.slowSecs>0)SG.mice.forEach(function(m){if(m.side===en&&dist(m.x,m.z,pos[0],pos[2])<Rs){m.slowT=W.slowSecs;m.slowK=W.slowTo;}});
    if(hit&&W.stick>0)pop(pos[0],pos[2],'Glued!',false,.3);}
  if(W.quake>0)knocked+=quakeAt(pos,W.quake*u,a);
  if(W.gust>0&&arsMode())arsGustAt(a,pos);   /* ARSENAL: the fan leaves a gust */
  return {R:R,n:n,knocked:knocked};}
function tickPuddles(dt){for(var i=SG.puddles.length-1;i>=0;i--){var pd=SG.puddles[i];if(SG.clock-pd.t0>pd.life){SG.puddles.splice(i,1);continue;}SG.mice.forEach(function(m){if(m.side!==pd.side&&dist(m.x,m.z,pd.x,pd.z)<pd.r&&!(m.slowT>pd.secs-.3)){m.slowT=pd.secs;m.slowK=pd.k;}});}}
/* fuses: a ball that landed with a delay pops when its time is up */
function tickFuses(){var F=SG.fuses;if(!F||!F.length)return;for(var i=F.length-1;i>=0;i--){var f=F[i];if(SG.clock<f.t)continue;F.splice(i,1);f.a.pend=false;landV2(f.a,f.pos,f.hit);}}
/* a tether: the first part of the other side's camp the ball passes */
function tetherFind(a,pos){var u=U(),best=null,bd=C3.hookR*u;
  SG.pieces.forEach(function(p){if(p.side===a.side||!p.built||p.down||!p.total||p.parts<=0||Math.abs(p.x-pos[0])>.9||Math.abs(p.z-pos[2])>.9)return;
    p.ps.forEach(function(q,i){if(q.st!=='on'||Math.abs(q.wy-pos[1])>C3.hookY*u)return;var d=dist(q.wx,q.wz,pos[0],pos[2]);if(d<bd){bd=d;best={p:p,i:i};}});});return best;}
function tetherAt(a,pos,hit){var u=U(),best=null,bd=1e9;
  if(hit&&hit.total&&hit.side!==a.side&&!hit.down){var i=nearestPart(hit,pos[0],pos[1],pos[2],false);if(i>=0)return {p:hit,i:i};}
  SG.pieces.forEach(function(p){if(p.side===a.side||!p.built||p.down||!p.total||p.parts<=0||Math.abs(p.x-pos[0])>.9||Math.abs(p.z-pos[2])>.9)return;p.ps.forEach(function(q,i){if(q.st!=='on'||q.wy>.35*u)return;var d=dist(q.wx,q.wz,pos[0],pos[2]);if(d<C3.hookR*2.5*u&&d<bd){bd=d;best={p:p,i:i};}});});return best;}
/* a roller: after landing it rolls on in the direction of travel, knocking off parts at its base and making mice dizzy */
/* ================= ROLLING SHOTS (CONFIG.v2.rolling) =================
   A Marble that comes down on open ground does not stop: it hops on 1 to 3 times (each hop shorter and lower, with dust and a tap),
   then ROLLS on along its flight line, losing distance with every part it knocks loose. The ball has an energy in table units;
   moving spends it, and each part it meets costs some (a plank a little, a rail more, a post a lot, a Keep part more than any ball has).
   A part that costs more than the ball has left stops it. A Big Marble is heavy (its cost counts less) and has more energy, so it ploughs
   through planks and light walls. A gap or a gate with no door lets it pass. Off in matches until the balance is proved; on in the Lab.
   Touching down on a piece (a hit) still works as before: only a landing on open ground rolls. */
CONFIG.v2.rolling={
  on:false,                                   /* matches: off until re-proved. (The Lab has its own switch, on by default.) */
  speed:2.4,minSpeed:.3,                      /* table units a second at full energy; the slowest it rolls (share of that) */
  reach:.06,high:.09,                         /* how near a part the ball's middle must come (across, and up and down) to touch it */
  marble:{hops:2,hopLen:.5,hopH:.16,decay:.6,roll:1.3,mass:1},           /* hops (1 to 3), the first hop's length and height, how much each next one shrinks, the roll after the hops, how much parts' cost counts */
  big:{hops:1,hopLen:.4,hopH:.1,decay:.6,roll:2.8,mass:.4},
  bouncer:{roll:.2,mass:.9},                  /* after its own hops (the Bouncer's weapon numbers) a Bouncer rolls this much more */
  cost:{plank:.35,door:.5,rail:.8,brace:.6,post:2,lintel:1.4,other:.5,tent:1,workshop:1.2,lobber:.8,trap:0,heavy:9},   /* the energy a part takes from the ball; a Keep part (heavy) is more than any ball has */
  dizzy:true,max:40                           /* mice on the other side it runs into are dizzy; most parts one ball can knock */
};
SG.rollingOn=function(){var R=CONFIG.v2.rolling;return SG.mode==='lab'?SG.labRolling!==false:!!R.on;};
SG.setRolling=function(v){if(SG.mode==='lab')SG.labRolling=!!v;else CONFIG.v2.rolling.on=!!v;if(hasDom)ui();return SG.rollingOn();};
function rollCost(p,q){var K=CONFIG.v2.rolling.cost,id=q.id||'';if(p.kind==='tower')return K.heavy;
  if(p.kind==='wall'||p.kind==='gate'){if(/plank/.test(id))return K.plank;if(/door/.test(id))return K.door;if(/rail/.test(id))return K.rail;if(/lintel/.test(id))return K.lintel;if(/post/.test(id))return K.post;return K.other;}
  if(p.kind==='brace')return K.brace;if(p.kind==='tent')return K.tent;if(p.kind==='workshop')return K.workshop;if(p.kind==='lobber')return K.lobber;if(p.kind==='trap')return K.trap;return K.other;}
/* the ball starts: from where it came down, along its flight line */
function momentumStart(a,pos,kind){var R=CONFIG.v2.rolling,c=R[kind==='big'?'big':(kind==='bouncer'?'bouncer':'marble')],u=U(),dx=a.x1-a.x0,dz=a.z1-a.z0,l=Math.sqrt(dx*dx+dz*dz)||1,hops=[],E=0,i;
  if(kind!=='bouncer'){var n=Math.max(1,Math.min(3,c.hops|0));for(i=0;i<n;i++){hops.push([c.hopLen*Math.pow(c.decay,i)*u,c.hopH*Math.pow(c.decay,i)*u]);}}
  hops.forEach(function(h){E+=h[0];});E+=c.roll*u;
  a.rolling=true;a.live=true;a.rm={x:pos[0],z:pos[2],y:.05,dx:dx/l,dz:dz/l,E:E,E0:E,hops:hops,hi:-1,hs:0,mass:c.mass,n:0,tr:0,v:R.speed*u,v0:R.speed*u,hit:0,last:null};
  a.hy=.05;a.hx=pos[0];a.hz=pos[2];momentumHop(a);}
function momentumHop(a){var r=a.rm;r.hi++;r.hs=0;if(r.hi<r.hops.length){r.cur=r.hops[r.hi];}else r.cur=null;}
function momentumEnd(a){var n0=SG.stats.partsOff;a.rolling=false;a.live=false;a.T=a.t;a.rm.done=true;a.hy=.05;viewPuff(a.rm.x,a.rm.z,.5);if(SG.mode==='lab')labFx(SG.stats.partsOff-n0);}
function momentumTick(a,dt){var r=a.rm,R=CONFIG.v2.rolling,u=U(),want=Math.max(R.minSpeed,r.E/r.E0)*r.v0,n0=SG.stats.partsOff;r.v=want;
  var dist0=r.v*dt,steps=Math.max(1,Math.ceil(dist0/(.03*u))),sd=dist0/steps;
  for(var s=0;s<steps&&r.E>0;s++){
    r.x+=r.dx*sd;r.z+=r.dz*sd;r.E-=sd;r.hs+=sd;
    if(r.cur){var k=Math.min(1,r.hs/r.cur[0]);r.y=.05+4*r.cur[1]*k*(1-k);if(r.hs>=r.cur[0]){r.y=.05;SG.stats.bounces++;snd('tap');viewPuff(r.x,r.z,.45);momentumHop(a);}}else r.y=.05;
    if(r.x*r.x+r.z*r.z>3.1*3.1){r.E=0;break;}
    /* the nearest part within reach */
    var bp=null,bi=-1,bd=1e9,rr=(R.reach)*u;
    for(var pi=0;pi<SG.pieces.length;pi++){var p=SG.pieces[pi];if(p.id===a.from||!p.built||p.down||!p.total||p.parts<=0||Math.abs(p.x-r.x)>.9||Math.abs(p.z-r.z)>.9)continue;
      for(var qi=0;qi<p.ps.length;qi++){var q=p.ps[qi];if(q.st!=='on'||Math.abs(q.wy-r.y)>R.high*u+rr*.3)continue;var d=dist(q.wx,q.wz,r.x,r.z);if(d<rr+.045*u&&d<bd){bd=d;bp=p;bi=qi;}}}
    for(var ti=0;ti<SG.pieces.length&&r.E>0;ti++){var tp=SG.pieces[ti];if(tp.kind!=='tower'||!tp.built||tp.down||tp.parts<=0||Math.abs(tp.x-r.x)>.6||Math.abs(tp.z-r.z)>.6)continue;var tl=toLocal(tp,r.x,r.z);if(Math.abs(tl[0])<FOOT.tower[0]&&Math.abs(tl[1])<FOOT.tower[1]){r.E=0;snd('tap');viewPuff(r.x,r.z,.6);}}   /* a Keep is a wall of its own: nothing rolls in between its legs */
    if(r.E<=0)break;
    if(bp){var q2=bp.ps[bi],cost=rollCost(bp,q2)*r.mass;
      if(cost>r.E+1e-9){r.E=0;snd('tap');viewPuff(r.x,r.z,.6);break;}
      r.E-=cost;r.n++;r.hit++;SG.att=a.side;SG.cause='roll';r.last={piece:bp.id,part:q2.id,cost:cost};knock(bp,bi,r.dx,r.dz,'roll',(.1+rand()*.12)*u);settle(bp,a.side);viewPuff(r.x,r.z,.5);
      if(r.n>=R.max){r.E=0;break;}}
    if(R.dizzy)SG.mice.forEach(function(m){if(m.side!==a.side&&dist(m.x,m.z,r.x,r.z)<.07*u*1.8)dizzy(m);});}
  r.tr+=dt;if(r.tr>.11){r.tr=0;viewPuff(r.x,r.z,.22);}   /* a faint trail of dust */
  a.hx=r.x;a.hz=r.z;a.hy=r.y;
  if(r.E<=0)momentumEnd(a);}
/* the Bouncer's last landing rolls on a little, as a ball would */
function momentumLands(a,pos){var A=AMMO[a.ammo]||AMMO.marble;if(!SG.rollingOn()||a.rolling||A.w.roll>0||A.w.fuse>0||A.w.scatter>1||A.w.splash>0)return;
  if(a.ammo==='marble'||a.ammo==='big')momentumStart(a,pos,a.ammo);else if(a.ammo==='bouncer'&&CONFIG.v2.rolling.bouncer.roll>0)momentumStart(a,pos,'bouncer');}
/* ================= end of rolling shots ================= */
function rollStart(a,pos){var dx=a.x1-a.x0,dz=a.z1-a.z0,l=Math.sqrt(dx*dx+dz*dz)||1;a.rolling=true;a.live=true;a.rl={x:pos[0],z:pos[2],dx:dx/l,dz:dz/l,left:AMMO[a.ammo].w.roll*U(),acc:0,n:0};}
function rollTick(a,dt){if(a.rm){momentumTick(a,dt);return;}var r=a.rl,u=U(),step=Math.min(r.left,C3.rollSpeed*u*dt),n0=SG.stats.partsOff;r.x+=r.dx*step;r.z+=r.dz*step;r.left-=step;r.acc+=dt;a.hx=r.x;a.hz=r.z;a.hy=.05;
  if(r.x*r.x+r.z*r.z>3.1*3.1)r.left=0;
  if(arsMode())arsRoll(a,r);   /* ARSENAL: a ditch or a log barrier stops it */
  SG.mice.forEach(function(m){if(m.side!==a.side&&dist(m.x,m.z,r.x,r.z)<C3.rollR*u*1.8)dizzy(m);});
  if(r.acc>=C3.rollEvery&&r.n<C3.rollMax){var bp=null,bi=-1,bd=C3.rollR*u*2;
    SG.pieces.forEach(function(p){if(p.side===a.side||!p.built||p.down||!p.total||p.parts<=0||Math.abs(p.x-r.x)>.9||Math.abs(p.z-r.z)>.9)return;p.ps.forEach(function(q,i){if(q.st!=='on'||q.wy>C3.rollBase*u)return;var d=dist(q.wx,q.wz,r.x,r.z);if(d<bd){bd=d;bp=p;bi=i;}});});
    if(bp){r.acc=0;r.n++;SG.att=a.side;SG.cause='roll';knock(bp,bi,r.dx,r.dz,'roll',(.1+rand()*.12)*u);settle(bp,a.side);}}
  if(r.left<=0||r.n>=C3.rollMax){a.rolling=false;a.live=false;a.T=a.t;if(SG.mode==='lab')labFx(SG.stats.partsOff-n0);}}
/* a quake: every part that is held by only one fastener falls (a plank on one rail, a rail on one post, a lintel on one post, a Keep brace on one leg) */
function looseParts(p){var o=[],k=p.kind;
  if(k==='wall'){var rails=onCount(p,/rail/),posts=onCount(p,/post/),pr=props(p).length;p.ps.forEach(function(q,i){if(q.st!=='on')return;if(/plank/.test(q.id)&&rails===1)o.push(i);else if(/rail/.test(q.id)&&posts===1&&!pr)o.push(i);});}
  else if(k==='gate'){var gp=onCount(p,/gate\.post/);p.ps.forEach(function(q,i){if(q.st!=='on')return;if(/lintel/.test(q.id)&&gp===1)o.push(i);else if(/door/.test(q.id)&&(isOn(p,'gate.lintel')?1:0)+(isOn(p,'gate.post.'+q.id.split('.')[2])?1:0)===1)o.push(i);});}
  else if(BK[k]){p.ps.forEach(function(q,i){if(q.st==='on'&&q.stg===0&&q.need&&q.need.length)o.push(i);});}   /* a building: the trim, which hangs on one thing (a tile on its rafter, a shutter on its window, a flag on its pole) */
  else if(k==='tower'){p.ps.forEach(function(q,i){if(q.st!=='on'||!/^tower\.brace/.test(q.id))return;var b=q.id.split('.')[2],held=['NE','NW','SE','SW'].filter(function(c){return c.indexOf(b)>=0&&isOn(p,'tower.post.'+c);}).length;if(held===1)o.push(i);});}
  return o;}
function quakeAt(pos,Rq,a){var n=0,touched=[];SG.att=a.side;SG.cause='quake';
  SG.pieces.forEach(function(p){if(!p.built||p.down||!p.total||boxDist(p,pos[0],pos[2])>Rq)return;var list=arsLoose(p,looseParts(p),pos,Rq,a);list.forEach(function(i){var an=rand()*PI*2;if(knock(p,i,Math.cos(an),Math.sin(an),'quake',(.12+rand()*.22)*U()))n++;});if(list.length)touched.push(p);});
  touched.forEach(function(p){settle(p,a.side);});SG.shake=Math.max(SG.shake,.5);viewPuff(pos[0],pos[2],1.6);return n;}
/* ---- the Building Yard (Lab only): buildings of 15 to 40 parts that come apart in stages ----
   Each part has a stage (0 trim, 1 walls, 2 frame) and the parts it hangs on (models.js). A landing takes trim first, then walls, then frame, never more than a few at once, and the frame only close to the hit;
   a part comes off only within a share of the blast (CONFIG.workshop.yard.sturdy). Then bSettle drops whatever has lost its support, round after round, the same rule for every building. */
function bldHits(p,x,y,z,R,big,noLeg,hit){var Y=C3.yard,u=U(),cand=[[],[],[]],hits=[],r0=C2.blast*u,cap=big?Y.bigHit:Math.max(1,Math.round(Y.perHit*(R*R)/(r0*r0))),i,q,d;
  if(hit){x+=(p.x-x)*Y.deep;z+=(p.z-z)*Y.deep;y=Math.max(y,TALL[p.kind]*Y.high);}   /* a marble that strikes the building does not stop at the wall: the blow runs on into it, toward the middle and up into the roof, so a wall shot shakes the trim loose first */
  for(i=0;i<p.ps.length;i++){q=p.ps[i];if(q.st!=='on'||q.stg==null)continue;d=Math.sqrt((q.wx-x)*(q.wx-x)+(q.wz-z)*(q.wz-z)+(q.wy-y)*(q.wy-y)*.45);if(d>R*Y.sturdy[q.stg]||(noLeg&&q.stg===2))continue;cand[q.stg].push([d,i]);}
  for(var s=0;s<3;s++){cand[s].sort(function(a,b){return a[0]-b[0];});cand[s].forEach(function(c){if(hits.length<cap)hits.push(c);});}
  if(big&&hit&&!noLeg){var legs=[];p.ps.forEach(function(e,j){if(e.st==='on'&&e.leg){var dd=Math.sqrt((e.wx-x)*(e.wx-x)+(e.wz-z)*(e.wz-z));legs.push([dd,j]);}});legs.sort(function(a,b){return a[0]-b[0];});
    legs.slice(0,p.legs||1).forEach(function(l){var at=-1;hits.forEach(function(h,k){if(h[1]===l[1])at=k;});if(at>=0)hits.splice(at,1);hits.push([Math.min(l[0],R*.8),l[1]]);});}   /* the Big Marble breaks the nearest frame legs outright */
  return hits;}
/* the parts of a building that stand on something that is gone: [] when everything left is held */
function bFloating(p,skip){var out=[],i,j,q,n;for(i=0;i<p.ps.length;i++){q=p.ps[i];if(q.st!=='on'||i===skip||!q.need||!q.need.length)continue;n=0;for(j=0;j<q.need.length;j++){var k=p.pi[q.need[j]];if(k!==skip&&p.ps[k].st==='on')n++;}if(n<q.min)out.push(i);}return out;}
function bSettle(p,att){if(!V2()||!p.built||p.down)return 0;var Y=C3.yard,fell=0,round=0,drop;
  while(round<14&&(drop=bFloating(p,-1)).length){
    drop.forEach(function(i){var q=p.ps[i],a=rand()*PI*2,dl=round*Y.delay+q.dly;if(knock(p,i,Math.cos(a),Math.sin(a),'collapse',(Y.fall[0]+rand()*(Y.fall[1]-Y.fall[0]))*U())){fell++;if(dl>0){q.t0=SG.clock+dl;var D=SG.debris[SG.debris.length-1];if(D)D.t+=dl;}}});   /* a part that falls later waits where it hangs */
    round++;}
  var nf=0;p.ps.forEach(function(q){if(q.stg===2&&q.st!=='on'&&q.t0>=SG.clock)nf++;});   /* frame parts that came off in this very tick, by the blast or the fall */
  if(fell>=Math.max(2,Math.round(p.total*Y.collapseShare))||nf>=2||(nf>=1&&fell>=1))collapse(p,att,fell+nf);
  return fell;}
/* a building that comes down falls the way the shot was going and lands on what stands near it on that side (a stall row touches, a yard is a little apart): it knocks parts off, and the neighbour settles by the same rule, so it may come down too */
function toppleB(p,att){var T=C3.topple,Y=C3.yard,u=U(),ld=SG.lastDir||{x:0,z:-1},reach=Math.max(Y.reach*u,TALL[p.kind]*.4),cand=[];
  SG.pieces.forEach(function(q){if(q===p||!q.built||q.down||!q.total||q.parts<=0)return;var gap=1e9;corners(q.kind,q.x,q.z,q.rot).concat([[q.x,q.z]]).forEach(function(a){gap=Math.min(gap,boxDist(p,a[0],a[1]));});if(gap>reach)return;
    var dx=q.x-p.x,dz=q.z-p.z,dl=Math.sqrt(dx*dx+dz*dz)||1,dot=(dx*ld.x+dz*ld.z)/dl;if(dot<-.35)return;cand.push({q:q,dot:dot,gap:gap,dx:dx/dl,dz:dz/dl});});
  cand.sort(function(a,b){return b.dot-a.dot||a.gap-b.gap;});
  cand.slice(0,2).forEach(function(e){var q=e.q;if(SG.topN>=T.max)return;SG.topN++;SG.att=att;SG.cause='topple';var mx=(p.x+q.x)/2,mz=(p.z+q.z)/2,k;
    for(k=0;k<T.hit;k++){var bi=-1,bd=1e9;q.ps.forEach(function(r,i){if(r.st!=='on')return;var dd=(r.wx-mx)*(r.wx-mx)+(r.wz-mz)*(r.wz-mz)+(r.wy-TALL[q.kind]*.6)*(r.wy-TALL[q.kind]*.6)+(r.stg===2?.06:0);if(dd<bd){bd=dd;bi=i;}});
      if(bi<0)break;knock(q,bi,e.dx,e.dz,'topple',(T.throwFar+rand()*.1)*u);}
    settle(q,att);});}
/* chain reactions (Lab option "Chain topple"): a piece that falls lands on its neighbours in the way it falls and knocks parts off them, which may bring them down too. At most CONFIG.workshop.topple.max a shot. */
function topple(p,att){var T=C3.topple,u=U();if(SG.topN>=T.max||(p.kind!=='wall'&&p.kind!=='gate'&&p.kind!=='tower'&&!BK[p.kind]))return;if(BK[p.kind])return toppleB(p,att);
  var f=FOOT[p.kind],dir,lat;
  if(p.kind==='tower'){var ld=SG.lastDir||{x:Math.cos(p.rot),z:Math.sin(p.rot)};dir=[ld.x,ld.z];lat=[-dir[1],dir[0]];}
  else{var nz=[Math.sin(p.rot),Math.cos(p.rot)],ld2=SG.lastDir||{x:nz[0],z:nz[1]},sg=(nz[0]*ld2.x+nz[1]*ld2.z)<0?-1:1;dir=[nz[0]*sg,nz[1]*sg];lat=[Math.cos(p.rot),-Math.sin(p.rot)];}
  var depth=p.kind==='tower'?f[0]:f[1],reach=TALL[p.kind]*T.reach,seen=[];
  for(var d=depth+.02;d<=depth+reach+.001;d+=.05)for(var o=-1;o<=1;o++){var px=p.x+dir[0]*d+lat[0]*o*f[0]*.8,pz=p.z+dir[1]*d+lat[1]*o*f[0]*.8;
    for(var j=0;j<SG.pieces.length;j++){var q=SG.pieces[j];if(q===p||!q.built||q.down||!q.total||q.parts<=0||seen.some(function(e){return e.p===q;}))continue;if(boxDist(q,px,pz)<.02)seen.push({p:q,d:d});}}
  if(!seen.length)return;
  seen.sort(function(a,b){return a.d-b.d;});
  seen.slice(0,2).forEach(function(e){var q=e.p;if(SG.topN>=T.max)return;SG.topN++;SG.att=att;SG.cause='topple';var k;
    var pref=q.kind==='wall'?/rail/:(q.kind==='gate'?/lintel/:/^tower\.(brace|rail)/);   /* what a falling weight crushes first: the frame that holds the rest */
    for(k=0;k<T.hit;k++){var bi=-1,bd=1e9;q.ps.forEach(function(r,i){if(r.st!=='on'||/^tower\.post/.test(r.id))return;var dd=(r.wx-(q.x+(p.x-q.x)*.5))*(r.wx-(q.x+(p.x-q.x)*.5))+(r.wz-(q.z+(p.z-q.z)*.5))*(r.wz-(q.z+(p.z-q.z)*.5))+(r.wy-TALL[q.kind]*.7)*(r.wy-TALL[q.kind]*.7)+(pref.test(r.id)?0:1);if(dd<bd){bd=dd;bi=i;}});
      if(bi<0)break;knock(q,bi,dir[0],dir[1],'topple',(T.throwFar+rand()*.1)*u);}
    settle(q,att);});}
/* thrown parts land: they thump mice, and a part thrown hard knocks off an attached part it lands on */
function tickDebris(){for(var i=SG.debris.length-1;i>=0;i--){var d=SG.debris[i];if(SG.clock<d.t)continue;SG.debris.splice(i,1);
    SG.mice.forEach(function(m){if(dist(m.x,m.z,d.x,d.z)<C2.fallReach*U())dizzy(m);});
    if(d.far>=C2.chainThrow*U()&&SG.phase==='fight'&&!(SG.mode==='lab'&&SG.topN>=C3.topple.max)){var best=null,bi=-1,bd=C2.chainReach*U();SG.pieces.forEach(function(p){if(!p.built||p.down||!p.total||p.id===d.pid||boxDist(p,d.x,d.z)>bd)return;p.ps.forEach(function(q,qi){if(q.st!=='on'||/^tower\.post/.test(q.id))return;var dd=dist(q.wx,q.wz,d.x,d.z);if(dd<bd){bd=dd;best=p;bi=qi;}});});
      if(best){SG.stats.chain++;SG.cause='debris';var np0=SG.stats.partsOff;if(SG.mode==='lab')SG.topN++;knock(best,bi,best.ps[bi].wx-d.x,best.ps[bi].wz-d.z,'debris',.15*U());chainDepth=d.dep||0;settle(best,SG.att);chainDepth=0;if(SG.mode==='lab'&&SG.stats.partsOff-np0>2)labFx(SG.stats.partsOff-np0);}}}}
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
      if(side.big>0&&!hi&&!LEVELS[side.level].noBig){v=worth(x,z,false,'big');if(v!==null)v-=side.big>=C2.bigMax?0:C2.bigWorth;if(v>0)list.push({x:x,z:z,high:false,big:true,kind:'big',v:v});}
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
  if(side.aimMode==='random'){var ra=rand()*PI*2,rr=Math.sqrt(rand())*C2.randomAim;tx=eb.x+Math.cos(ra)*rr;tz=eb.z+Math.sin(ra)*rr;ammo=side.big>0&&!L.noBig?'big':'marble';side.high=false;}   /* anywhere in the other camp's ground */
  else{ /* an aimer: glue on a camp that is mending, corks at a crowd, else the best shot (a Big Marble, a Bouncer or a marble) */
    var crowd=null,cn=1,gt=ammoReady(side,'glue')&&!(avoid&&side.lastShot.ammo==='glue')?glueTarget(s):null;foes.forEach(function(m){var n=0;foes.forEach(function(o){if(dist(m.x,m.z,o.x,o.z)<C2.corkSpread*U())n++;});if(n>cn){cn=n;crowd=m;}});
    if(gt){tx=gt.x;tz=gt.z;ammo='glue';side.high=false;}
    else if(crowd&&ammoReady(side,'corks')&&cn>=3&&rand()<.7){tx=crowd.x;tz=crowd.z;ammo='corks';}
    else{var pk=bestShot(s,li,avoid);if(!pk)pk={x:keep&&!keep.down?keep.x:eb.x,z:keep&&!keep.down?keep.z:eb.z,high:false,big:false,kind:'marble'};tx=pk.x;tz=pk.z;side.high=pk.high;ammo=pk.kind||(pk.big?'big':'marble');}
    tx+=gauss()*L.err2*U();tz+=gauss()*L.err2*U();}
  if(DEF.match){var dw=defBotWeapon(s,ammo);ammo=dw.ammo;side.high=dw.high;}   /* DEFENCES (flag): the seven Arsenal weapons in turn */
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
  if(DEF.on)defTick(dt);tickMarbles(dt);if(V2()){tickDebris();tickPuddles(dt);if(SG.phase!=='fight')return;trapsTick();}tickMice(dt);stuckCheck(dt);if(V2()?scoreV2(dt):scoreTick(dt))return;
  if(SG.time<=0){
    if(V2())bankRound();
    if(SG.round<CONFIG.rounds){SG.phase='mend';SG.time=CONFIG.brk;SG.sides[0].aim.on=SG.sides[1].aim.on=false;shout('Mend break');ui();}
    else{var a=V2()?v2Score(0,true):SG.sides[0].score,b=V2()?v2Score(1,true):SG.sides[1].score,w;if(a!==b)w=a>b?0:1;else{var n=SG.onHill();w=n[0]!==n[1]?(n[0]>n[1]?0:1):(SG.lastHolder!=null?SG.lastHolder:0);}endMatch(w);}}}
function tickMend(dt){SG.time-=dt;if(DEF.on)defTick(dt);if(V2()){tickDebris();tickPuddles(dt);}autoMend(0,5);autoMend(1,5);tickMarbles(dt);tickMice(dt);stuckCheck(dt);if(SG.time<=0)startRound(SG.round+1);}

function tick(dt){
  SG.clock+=dt;SG.sides.forEach(function(sd){if(sd.msg.t>0)sd.msg.t-=dt;});if(SG.callout.t>0)SG.callout.t-=dt;viewTick(dt);fixGrid();
  for(var i=SG.pops.length-1;i>=0;i--){SG.pops[i].t+=dt;if(SG.pops[i].t>1.3)SG.pops.splice(i,1);}
  if(SG.phase==='build')tickBuild(dt);
  else if(SG.phase==='ready'){SG.time-=dt;if(SG.time<=0){SG.time=0;if(SG.sides[0].bot)startRound(1);}}
  else if(SG.phase==='count'){var c0=Math.ceil(SG.time);SG.time-=dt;if(Math.ceil(SG.time)<c0&&SG.time>0)snd('beep');if(DEF.on)defTick(dt);tickMarbles(dt);tickMice(dt);if(SG.time<=0){snd('go');SG.phase='fight';SG.time=CONFIG.round;shout('Round '+SG.round+' of '+CONFIG.rounds+'. Hold the hill!');ui();}}
  else if(SG.phase==='fight')tickFight(dt);
  else if(SG.phase==='fall'){SG.time-=dt;tickDebris();if(SG.time<=0)endMatch(SG.fallWinner);}
  else if(SG.phase==='mend')tickMend(dt);
  fixGrid();}
SG.step=function(dt){SG.acc+=dt;var n=0;while(SG.acc>=STEP-1e-9){tick(STEP);SG.acc-=STEP;n++;}return n;};
/* true if a mouse stands inside a wall or gate that still blocks it (used by the tests) */
SG.inWall=function(){var bad=0;SG.mice.forEach(function(m){SG.pieces.forEach(function(p){if((p.kind!=='wall'&&p.kind!=='gate')||!p.built||!blocks(p))return;if(solidAt(p,m.side,m.x,m.z,0))bad++;});});return bad;};
SG.fallRings=function(){return S?S.children.filter(function(o){return o.geometry===V.fallGeo&&o.visible;}).length:0;};   /* cream rings lit on the table now (for the test) */
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
  snap:function(){noise(.05,.5,0,2600);tone(620,.09,'triangle',.22,0,240);tone(210,.2,'sawtooth',.14,.02,90);},   /* the band lets go */
  tick:function(){tone(1100,.05,'square',.08,0);},warn:function(){tone(260,.08,'sawtooth',.12,0);},   /* the meter enters the sweet band; over-pull */
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
function viewClear(){if(!V.on)return;if(V.lab)labViewHide();V.def=null;while(world.children.length)world.remove(world.children[0]);V.pieces={};V.mice=[];V.slots=[[],[]];V.marbles={};V.corks={};V.puffs=[];V.flashes=[];(V.rings||[]).forEach(function(r){S.remove(r);});V.rings=[];   /* the rings sit in the table group, not in world: take them out, or they stay lit on the table for ever (Harry's cream rings) */GH.forEach(function(g){if(g.obj){S.remove(g.obj);g.obj=null;g.kind='';}});
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
var VCACHE={};   /* the parts of a model by kind, team and look: a camp rebuilt while nothing is drawn (the Lab's range tests) need not build models */
function viewObj(p){
  var team=SG.sides[p.side].team,vr=p.vari!=null?p.vari:p.id%3,ck=p.kind+'|'+team+'|'+vr,cc=VCACHE[ck],o=null,parts=null,c=Math.cos(p.rot),s=Math.sin(p.rot),out=[];
  if(!V.on&&cc)cc.forEach(function(e){var h=e.h;out.push({id:e.id,x:p.x+(h[0]*c+h[2]*s)*PS,y:h[1]*PS,z:p.z+(-h[0]*s+h[2]*c)*PS,rank:e.rank});});
  else{o=SS.piece(p.kind,team,{solid:false,variant:vr});parts=SS.parts(o);
    parts.forEach(function(m){var h=m.userData.home;out.push({id:m.userData.partId,x:p.x+(h[0]*c+h[2]*s)*PS,y:h[1]*PS,z:p.z+(-h[0]*s+h[2]*c)*PS,rank:rank(m.userData.partId,h[1])});});
    if(!cc)VCACHE[ck]=parts.map(function(m){return {id:m.userData.partId,h:m.userData.home.slice?m.userData.home.slice():m.userData.home,rank:rank(m.userData.partId,m.userData.home[1])};});}
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
      else if(q.st==='carried'||q.swept){m.visible=false;v.pst[i]=q.swept?'off':'carried';}   /* swept: the Lab's "Sweep up" took it off the table */
      else{m.visible=true;v.pst[i]='off';var u=Math.max(0,Math.min(1,(SG.clock-q.t0)/.75));_v.set(q.rx,.035,q.rz);v.obj.worldToLocal(_v);
        m.position.set(h[0]+(_v.x-h[0])*u,h[1]+(_v.y-h[1])*u+Math.sin(u*PI)*.55,h[2]+(_v.z-h[2])*u);m.rotation.set(u*(PI/2+((i%3)-1)*.2),u*(1.3+i),u<1?u*7:0);
        /* a fallen part that can still be mended gets a bright ring round it */
        if(u>=1&&!q.used&&ringOK(p,q)){var rg=V.rings[nr];if(!rg){rg=V.rings[nr]=new THREE.Mesh(V.fallGeo,V.fallMat);rg.rotation.x=-PI/2;S.add(rg);}rg.visible=true;rg.material=q.glue>SG.clock?V.glueMat:V.fallMat;rg.position.set(q.rx,.012,q.rz);rg.scale.setScalar(1+.1*Math.sin(SG.clock*5+i));nr++;}}}
  });
  for(var r=nr;r<V.rings.length;r++)V.rings[r].visible=false;}
/* a ring round a fallen part: only in a fight, only on a camp a person plays, and only while no mouse is on the way to mend it (then the hammer shows) */
function ringOK(p,q){var ph=SG.phase;if(ph!=='fight'&&ph!=='mend'&&ph!=='count')return false;if(p.down||q.mender>=0||q.swept)return false;return !!SG.sides[p.side]&&SG.sides[p.side].human;}
function syncPops(){var pl=E('pops');if(!pl)return;var seen={},table=SG.mode==='table';V.popEls=V.popEls||{};
  function show(id,cls,text,x,z,y,side,op){seen[id]=1;var el=V.popEls[id];if(!el){el=V.popEls[id]=document.createElement('div');el.className=cls;el.textContent=text;pl.appendChild(el);}
    var q=SG.screen(x,z,y);el.style.left=q.x+'px';el.style.top=q.y+'px';el.style.opacity=op;var eg=table&&side===1?(SG.sides[1].edge||'top'):'';el.style.transform=eg==='top'?'translate(-50%,0) rotate(180deg)':(eg==='left'?'translate(0,-50%) rotate(90deg)':(eg==='right'?'translate(-100%,-50%) rotate(-90deg)':'translate(-50%,-100%)'));}
  SG.pops.forEach(function(q){show(q.id,'pop'+(q.good?' good':'')+(q.text==='?'?' ask':'')+(q.text==='CRASH!'?' crash':''),q.text,q.x,q.z,q.y+q.t*.35,q.side,q.t>.9?Math.max(0,1-(q.t-.9)/.4):1);});
  if(DEF.on)defLabels(show);
  if(SG.mode==='lab'&&SG.lab){var lw0=w2(0,0,2.98),lw1=w2(1,0,2.98);show('lab0','pop lobtag sel','My camp',lw0[0],lw0[1],.05,0,1);show('lab1','pop lobtag','Target camp',lw1[0],lw1[1],.05,1,1);}
  /* what each piece on your mat costs, while you build */
  if(V2()&&SG.phase==='build')SG.sides.forEach(function(side,s){if(!side.human)return;side.kit.forEach(function(k,i){if(k.used)return;var c=cost(s,k.kind);show('c'+s+'_'+i+'_'+c+(c>side.points?'x':''),'pop cost'+(c>side.points?' dear':''),c?String(c):'free',k.x,k.z,.02,s,1);});});
  /* with two lobbers each wears its name; a fallen part held by glue shows a honey pot */
  if(SG.phase==='fight')SG.sides.forEach(function(side,s){if(!side.human)return;var lbs=lobbersOf(s);if(lbs.length<2)return;lbs.forEach(function(l,i){var sel=i===side.lsel;show('lob'+s+'_'+i+(sel?'s':''),'pop lobtag'+(sel?' sel':''),'Lobber '+(i+1),l.x,l.z,TALL.lobber+.22,s,sel?1:.7);});});
  SG.pieces.forEach(function(p){if(!p.built||!p.total)return;p.ps.forEach(function(q,i){if(q.st==='off'&&q.glue>SG.clock)show('gl'+p.id+'_'+i,'pop icon','🍯',q.rx,q.rz,.16,p.side,1);});});
  /* a hammer over every piece that is being mended, so mending shows even when the mouse is behind it */
  SG.pieces.forEach(function(p){if(!p.built)return;var busy=false;p.ps.forEach(function(q){if(q.mender>=0&&q.st!=='on')busy=true;});if(busy)show('m'+p.id,'pop icon','🔨',p.x,p.z,TALL[p.kind]+.18+.04*Math.sin(SG.clock*6),p.side,1);});
  /* "Mend me": a wrench label on the first part of each person's camp that a mouse can mend now */
  if(SG.phase==='fight'||SG.phase==='mend')SG.sides.forEach(function(side,s){if(!side.human)return;var done=false;SG.pieces.forEach(function(p){if(done||p.side!==s||!p.built||p.down)return;for(var i=0;i<p.ps.length;i++){var q=p.ps[i];if(q.st==='off'&&!q.used&&q.mender<0&&!(q.glue>SG.clock)&&!q.swept&&SG.clock-q.t0>.75){show('mm'+s,'pop mendme','🔧 Mend me',q.rx,q.rz,.22,s,1);done=true;return;}}});});
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
  var seen={};SG.marbles.forEach(function(a){seen[a.id]=1;var o=V.marbles[a.id];if(!o){var AM=AMMO[a.ammo];o=V.marbles[a.id]=(AM&&AM.tint==='cork')?SS.fx.cork():SS.fx.marble(AM&&AM.tint!=='team'?AM.tint:SG.sides[a.side].team);a.sc=(AM&&AM.scale)||1.25;o.scale.setScalar(a.sc);world.add(o);}o.visible=a.t>=0&&!(!a.live&&a.ammo==='glue');
    if(a.rolling){o.position.set(a.hx,(a.rm?a.hy:.05)+.03,a.hz);o.rotation.x=a.t*14;}
    else if(a.live){var p=marblePos(a,Math.min(1,a.t/a.T));o.position.set(p[0],p[1]+.03,p[2]);o.rotation.x=a.t*9;}
    else if(a.pend){o.position.set(a.hx,Math.max(.034,a.hy*.3)+.03,a.hz);o.scale.setScalar((a.sc||1.25)*(1+.12*Math.sin(SG.clock*26)));}   /* a fused ball lies where it landed, and throbs */
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
  if(DEF.on)defView();
}
function fmt(t){t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+('0'+(t%60)).slice(-2);}
var lastHud='',CAMNAME=['Whole table','My camp','The hill','The target camp'];   /* the fourth is the Lab's only */ 
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
    E('b_easy').className='btn'+(SG.easyAim?' on':'');E('b_easy').textContent=SG.easyAim?'Easy aim: on':'Easy aim: off';E('b_high').className='btn'+(me.high&&!AMMO[me.ammo].w.flat?' on':'');E('b_high').disabled=!!AMMO[me.ammo].w.flat;
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
/* ================= FIRST-RUN HELPER and the "?" legend =================
   Three one-line captions, each shown once ever (localStorage, in try/catch), on the one-player table; and a "?" button that opens a list of every icon, ring, colour and number on the table. */
var COACH=[
  {k:'rtk.coach.1',when:function(){return SG.phase==='build';},text:'Blue mice are yours. Tap a piece, then tap the table.'},
  {k:'rtk.coach.2',when:function(){return SG.fallRings()>0;},text:'Cream ring = a fallen part. Mice can mend it.'},
  {k:'rtk.coach.3',when:function(){return SG.phase==='fight';},text:'Hill: hold it to earn a Big Marble.'}];
var coachNow=null,coachT=0,coachSeen={};
function coachGet(k){if(coachSeen[k])return true;try{return !!window.localStorage.getItem(k);}catch(e){return false;}}
function coachSet(k){coachSeen[k]=1;try{window.localStorage.setItem(k,'1');}catch(e){}}
SG.coachReset=function(){coachSeen={};coachNow=null;coachT=0;try{COACH.forEach(function(c){window.localStorage.removeItem(c.k);});}catch(e){}};
function coachTick(dt){if(!hasDom||!E('coach'))return;var el=E('coach'),want=SG.mode==='solo'&&SG.sides.length&&!AR.on&&!PERF&&SG.phase!=='start'&&SG.phase!=='over';
  if(E('bHelp'))E('bHelp').style.display=(SG.sides.length&&SG.phase!=='start'&&SG.mode!=='lab'&&!AR.on)?'block':'none';
  if(!want){el.style.display='none';coachNow=null;return;}
  if(coachNow){coachT-=dt;if(coachT<=0||!coachNow.when()&&coachT<4){el.style.display='none';coachNow=null;}return;}
  for(var i=0;i<COACH.length;i++){var c=COACH[i];if(coachGet(c.k)||!c.when())continue;coachNow=c;coachSet(c.k);coachT=6.5;el.textContent=c.text;el.style.display='block';return;}
  el.style.display='none';}
SG.coachTick=coachTick;SG.coach=function(){return {shown:coachNow?coachNow.text:'',seen:Object.keys(coachSeen)};};
var legendPaused=false;
function legendToggle(on){var el=E('legend');if(!el)return;el.style.display=on?'flex':'none';if(on){legendPaused=!SG.paused;if(legendPaused)SG.paused=true;}else if(legendPaused){SG.paused=false;legendPaused=false;lastHud='';}}
SG.legend=function(on){legendToggle(on===undefined?E('legend').style.display!=='flex':!!on);return E('legend').style.display==='flex';};
/* ================= end of first-run helper ================= */
function render(){if(!V.on)return;coachTick(1/60);syncAll();pullView();if(!AR.on){moveCamera();if(SG.shake>.02){var sk=SG.shake*.05;C.position.x+=(Math.random()-.5)*sk;C.position.y+=(Math.random()-.5)*sk;SG.shake*=.88;}else SG.shake=0;}SS.wave(hill,SG.clock);hud();R.render(SCN,C);}
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
function camTarget(){var a=W/H,t=Math.tan(20*PI/180),v=SG.cam||0,need=[3.65,2.9,1.9,2.7][v],dH=[7.1,5.2,3.9,4.5][v],d=Math.max(need/(t*a),dH),el=v===0?(a<1?.95:.72):(v===1?.7:(v===3?.58:.62)),lz=[.25,1.75,.1,-1.9][v];
  /* the camera stands behind your own camp and looks across the table */
  var b=baseOf(0),bl=Math.sqrt(b.x*b.x+b.z*b.z),dx=bl>.2?b.x/bl:0,dz=bl>.2?b.z/bl:1,h=v===2?hillAt():{x:0,z:0};if(v===1)lz=Math.max(.9,bl-.15);if(v===2)lz=0;if(SG.mode==='lab'&&SG.phase!=='start'&&v===0)lz+=.45;   /* the Lab's bars cover the bottom of the screen: the table sits a little higher */
  var F=SG.mode==='lab'&&SG.lab&&SG.lab.focus;if(F){var d2=d*F.zoom,e2=F.el||el,cx=dx*Math.cos(e2)*d2,cz=dz*Math.cos(e2)*d2,yw=F.yaw||0,c1=Math.cos(yw),s1=Math.sin(yw);return [F.x+cx*c1-cz*s1,Math.sin(e2)*d2+(F.y||0),F.z+cx*s1+cz*c1,F.x,(F.y||0)-.1,F.z];}   /* F.el (elevation) and F.yaw (turn round the spot, radians) are optional: the Arsenal's screenshots use them */   /* the Lab's close-up (screenshots, tests): look at a spot, from this share of the usual distance */
  return [h.x+dx*(lz+Math.cos(el)*d),Math.sin(el)*d,h.z+dz*(lz+Math.cos(el)*d),h.x+dx*lz,-.1,h.z+dz*lz];}
function moveCamera(){
  if(SG.mode==='table'&&SG.phase!=='start'){var t=Math.tan(10*PI/180),hh=Math.max(120,H-128),d=Math.max(3.38*H/hh/t,3.38/(t*W/H));var tl=(SG.tilt||0)*PI/180;var bb=baseOf(0),bn=Math.sqrt(bb.x*bb.x+bb.z*bb.z),ux=bn>.2?bb.x/bn:0,uz=bn>.2?bb.z/bn:1;   /* blue's camp is at the bottom edge of the screen */
    C.fov=20;C.aspect=W/H;C.up.set(-ux,0,-uz);C.position.set(ux*d*Math.sin(tl),d*Math.cos(tl),uz*d*Math.sin(tl));C.lookAt(0,0,0);C.near=1;C.far=d+12;C.updateProjectionMatrix();C.updateMatrixWorld();SCN.fog.near=d+4;SCN.fog.far=d+40;camNow=null;return;}
  if(C.fov!==40){C.fov=40;C.up.set(0,1,0);C.near=.1;C.far=60;SCN.fog.near=9;SCN.fog.far=22;}
  var q=camTarget(),i;if(!camNow||SG.camSnap){camNow=q.slice();SG.camSnap=false;}else for(i=0;i<6;i++)camNow[i]+=(q[i]-camNow[i])*.14;
  C.aspect=W/H;C.position.set(camNow[0],camNow[1],camNow[2]);C.lookAt(camNow[3],camNow[4],camNow[5]);C.updateProjectionMatrix();C.updateMatrixWorld();}
/* Table mode: 0 is straight down; a slight tilt shows the sides of things, but favours the near player */
SG.setTilt=function(deg){SG.tilt=deg||0;if(hasDom&&E('bTilt'))E('bTilt').textContent=SG.tilt?'📐 '+SG.tilt+'°':'📐 0°';};
SG.setCam=function(v){var n=SG.mode==='lab'?4:3;SG.cam=((v%n)+n)%n;ui();};

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
function arBegin(){E('arAsk').style.display='none';var pk=SG.pick?SG.pick():{team:'blue',level:'easy'};SG.paused=false;SG.cam=0;SG.setEasyAim(AR.size<CONFIG.pull.easyAr);   /* a small AR table is far away or tiny on the screen: a pull of 1.5 table units is a few pixels there, so start with Easy aim */
  SG.start(pk.team,{level:pk.level,mode:'solo',pieces:AR.size<80?'small':undefined});ui();}
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
      if(lobbersOf(0).length>1)b('lsel','Lobber '+((me.lsel||0)+1)+'/'+lobbersOf(0).length,true);AMMO_ORDER.forEach(function(id){var st=AMMO[id].store?' x'+(me[AMMO[id].store]||0):((AMMO[id].w.cd>0&&(me.cd[id]||0)>0)?' '+Math.ceil(me.cd[id])+'s':'');b('am_'+id,AMMO[id].short+st,me.ammo===id);});
      if(!AMMO[me.ammo].w.flat)b('high','High lob',me.high);b('easy','Easy aim '+(SG.easyAim?'on':'off'),SG.easyAim);b('lobber','Orders');}
    else{b('o_hill','Hill '+me.plan.hill);b('o_raid','Raid '+me.plan.raid);b('o_guard','Guard '+me.plan.guard);b('o_mend','Mend '+me.plan.mend);b('lobber','Lobber');}
    b('pause',SG.paused?'Go on':'Pause',SG.paused);if(SG.paused)b('replace','Re-place table');}
  else{b('squad','Squad',me&&me.tool==='squad');b('lobber','Lobber',me&&me.tool==='lobber');b('mend','Mend',me&&me.tool==='mend');b('pause',SG.paused?'Go on':'Pause',SG.paused);if(SG.paused)b('replace','Re-place table');}
  if(SG.dev)b('log','Copy log');b('exit','Exit AR');return o;}
function sceneAct(id){arEvent('scene button '+id);
  if(id==='exit')SG.arLeave();else if(id==='lock')SG.arLock();else if(id==='arL')SG.arTurn(PI/12);else if(id==='arR')SG.arTurn(-PI/12);else if(id==='smaller')SG.arResize(AR.size-10);else if(id==='bigger')SG.arResize(AR.size+10);
  else if(id==='fine')SG.arJumpFine();else if(id==='replace')SG.arReplace();else if(id==='cards')E('arCards').onclick();else if(id==='plain')arBegin();
  else if(id==='bL')SG.turn(PI/12);else if(id==='bR')SG.turn(-PI/12);else if(id==='undo')SG.undo();else if(id==='done')SG.done();else if(id==='start')SG.begin();else if(id==='again')SG.arAgain();
  else if(id==='high')SG.sides[0].high=!SG.sides[0].high;else if(id==='easy')SG.setEasyAim(!SG.easyAim);else if(id.indexOf('o_')===0)SG.bumpPlan(0,id.slice(2));else if(id==='lsel')SG.nextLobber(0);else if(id.indexOf('am_')===0)SG.setAmmo(0,id.slice(3));else if(id==='lobber'&&V2())SG.setTool(SG.sides[0].tool==='lobber'?'squad':'lobber');
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
function pullTarget(s,from,g){var l=lobberOf(s);if(!l||!from)return null;return pullCalc(l,from,g);}
function damagedAt(g,s){var best=null,bd=.45;SG.damaged(s).forEach(function(p){var d=boxDist(p,g.x,g.z);p.ps.forEach(function(q){if(q.st==='off')d=Math.min(d,dist(q.rx,q.rz,g.x,g.z));});if(d<bd){bd=d;best=p;}});return best;}
/* ================= PULL-BACK AIMING (slingshot) =================
   Press on a lobber, drag AWAY from where you want to hit, let go. The drag angle picks the direction; the pull LENGTH picks the power,
   and the power picks how far the marble goes. A power meter has a SWEET BAND: inside it the shot goes exactly where you aimed,
   under it the shot is short (and a little loose), over it the marble wobbles about the spot more and more.
   Drag back to the little ring where you pressed to cancel. High or flat lob is still the High lob button (a finger cannot also pick that).
   SG.fireLobber(side, x, z, power01, opts) is the plain call that tests and bots use. power01 null means: land exactly on (x, z), the old way.
   "Easy aim" (SG.easyAim) puts back the old tap-and-drag aim: exact, no sweet band. */
CONFIG.pull={
  min:.2,full:1.5,                       /* table units: the shortest pull that counts (less is a cancel); the pull that is 100% power */
  rangeMin:.7,rangeMax:5.6,              /* how far a 0% and a 100% shot goes (table units) */
  sweetLo:.65,sweetHi:.85,               /* the sweet band, as a part of full power */
  weakScatter:.25,overScatter:1.2,       /* loose shots: radius at 0% power (fading to 0 at the band) and at 100% power (growing from 0 at the band's top) */
  easyAr:80                              /* AR tables narrower than this (cm) start with Easy aim ON */
};
SG.easyAim=false;
SG.setEasyAim=function(v){SG.easyAim=!!v;if(hasDom)ui();return SG.easyAim;};
function pullZone(p){var P=CONFIG.pull;return p<P.sweetLo?'weak':(p<=P.sweetHi?'sweet':'over');}
SG.pullPower=function(len){var P=CONFIG.pull;if(!(len>=P.min))return null;var p=Math.min(1,len/P.full);return {p:p,zone:pullZone(p),range:P.rangeMin+p*(P.rangeMax-P.rangeMin),scatter:SG.pullScatter(p)};};
SG.pullScatter=function(p){var P=CONFIG.pull;if(p<P.sweetLo)return P.weakScatter*(1-p/P.sweetLo);if(p<=P.sweetHi)return 0;return P.overScatter*Math.min(1,(p-P.sweetHi)/(1-P.sweetHi));};
/* from the drag: where the shot is aimed (before any wobble), and the pull's numbers. null = no shot (too short a pull) */
function pullCalc(l,from,g){var dx=from.x-g.x,dz=from.z-g.z,len=Math.sqrt(dx*dx+dz*dz),P=CONFIG.pull;
  if(SG.easyAim){if(len<.12)return null;var pw=Math.min(6.2,len*2.6);return {x:l.x+dx/len*pw,z:l.z+dz/len*pw,len:len,p:null,zone:'easy',scatter:0,from:from,g:g};}
  var q=SG.pullPower(len);if(!q)return null;return {x:l.x+dx/len*q.range,z:l.z+dz/len*q.range,len:len,p:q.p,zone:q.zone,scatter:q.scatter,from:from,g:g};}
/* a drag step: store the aim on the side (the preview arc reads it) */
function pullSet(sd,t,P){if(t){if(sd.pull&&sd.pull.zone!==t.zone&&t.p!=null)snd(t.zone==='sweet'?'tick':(t.zone==='over'?'warn':'tick'));sd.aim.on=true;sd.aim.tx=t.x;sd.aim.tz=t.z;sd.aim.pw=t.p;sd.pull=t;if(P)P.pulled=true;}else{sd.aim.on=false;sd.pull=null;}}
SG.fireLobber=function(s,tx,tz,pw,opts){opts=opts||{};var side=SG.sides[s];if(!side)return null;var li=opts.li==null?(side.lsel||0):opts.li,l=lobberOf(s,li);if(!l)return null;
  var info=null,ax=tx,az=tz;
  if(pw!=null&&!opts.exact){var P=CONFIG.pull,p=Math.max(0,Math.min(1,pw)),dx=tx-l.x,dz=tz-l.z,d=Math.sqrt(dx*dx+dz*dz);if(d<1e-6){dx=0;dz=l.z>0?-1:1;d=1;}
    var rg=P.rangeMin+p*(P.rangeMax-P.rangeMin),sc=opts.scatter!=null?opts.scatter:SG.pullScatter(p),rf=opts.rand||rand,an=sc>0?rf()*PI*2:0,rd=sc>0?sc*Math.sqrt(rf()):0;   /* no random number is used for a shot with no scatter: the game's random stream stays as it was */
   
    ax=l.x+dx/d*rg+Math.cos(an)*rd;az=l.z+dz/d*rg+Math.sin(an)*rd;
    info={power:p,zone:pullZone(p),range:rg,scatter:sc,aimX:l.x+dx/d*rg,aimZ:l.z+dz/d*rg,missX:ax-(l.x+dx/d*rg),missZ:az-(l.z+dz/d*rg)};}
  var wasHigh=side.high;if(opts.high!=null)side.high=!!opts.high;
  var a=SG.mode==='lab'&&SG.lab?SG.labFire(s,li,ax,az,opts):SG.fire(s,ax,az,li);
  if(opts.high!=null)side.high=wasHigh;
  if(a&&info){info.miss=Math.sqrt(info.missX*info.missX+info.missZ*info.missZ);a.pull=info;snd('snap');}return a;};
/* letting go: fire from the stored aim, or nothing */
function pullRelease(s,sd,li,opts){var ax=sd.aim.tx,az=sd.aim.tz,pw=sd.aim.pw;sd.aim.on=false;sd.pull=null;return SG.fireLobber(s,ax,az,pw,Object.assign({li:li},opts||{}));}
/* --- what you see: a rubber band from the lobber to a pouch that follows the finger (set back from it), a power ring round the lobber,
   the cancel ring where you pressed, and a power meter beside the thumb (above it, to the side the screen has room on) --- */
var PV=null;
function pullViewInit(){if(PV||!S)return;var M=function(c,o){return new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,depthWrite:false});};
  PV={bands:[0,1].map(function(){var m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),M(0xffe29a,.95));m.visible=false;S.add(m);return m;}),
    pouch:new THREE.Mesh(new THREE.SphereGeometry(.07,12,8),M(0xffd23a,1)),ring:new THREE.Mesh(new THREE.RingGeometry(.9,1,40),M(0xffd23a,.9)),cancel:new THREE.Mesh(new THREE.RingGeometry(.9,1,28),M(0xff9a7a,.8)),
    q:new THREE.Quaternion(),z:new THREE.Vector3(0,0,1),d:new THREE.Vector3(),el:null,zone:''};
  PV.ring.rotation.x=PV.cancel.rotation.x=-PI/2;[PV.pouch,PV.ring,PV.cancel].forEach(function(o){o.visible=false;S.add(o);});
  if(hasDom){var el=document.createElement('div');el.id='pullMeter';el.style.cssText='position:fixed;display:none;pointer-events:none;z-index:6;width:30px;height:132px;border-radius:15px;border:3px solid #fff3df;background:#3a2a1c;box-shadow:0 3px 10px rgba(0,0,0,.5);overflow:visible;font:700 12px system-ui,sans-serif;color:#fff3df';
    var P=CONFIG.pull;el.innerHTML='<div class="pz" style="position:absolute;left:0;right:0;bottom:'+(P.sweetLo*100)+'%;height:'+((P.sweetHi-P.sweetLo)*100)+'%;background:#5fd04a;opacity:.55"></div><div class="pz" style="position:absolute;left:0;right:0;bottom:'+(P.sweetHi*100)+'%;top:0;background:#e0503a;opacity:.4"></div><div class="pf" style="position:absolute;left:3px;right:3px;bottom:0;height:0;background:#ffd23a;border-radius:10px"></div><div class="pt" style="position:absolute;left:40px;top:50%;white-space:nowrap;text-shadow:0 1px 3px #000"></div>';
    (E('ui')||document.body).appendChild(el);PV.el=el;}}
function pullBar(m,a,b,w){PV.d.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);var L=PV.d.length()||.001;m.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);m.quaternion.setFromUnitVectors(PV.z,PV.d.multiplyScalar(1/L));m.scale.set(w,w,L);m.visible=true;}
var PULLN=0;
function pullView(){if(!V.on||!S)return;var act=null,as=-1;SG.sides.forEach(function(sd,s){if(sd.pull&&sd.aim.on&&!act){act=sd;as=s;}});
  if(!act){if(PV){PV.bands.forEach(function(m){m.visible=false;});PV.pouch.visible=PV.ring.visible=PV.cancel.visible=false;if(PV.el)PV.el.style.display='none';PV.zone='';}return;}
  pullViewInit();var t=act.pull,li=act.aim.li!=null?act.aim.li:act.lsel,l=lobberOf(as,li);if(!l||!t||t.p==null){if(PV){PV.bands.forEach(function(m){m.visible=false;});PV.pouch.visible=PV.ring.visible=PV.cancel.visible=false;if(PV.el)PV.el.style.display='none';}return;}
  var P=CONFIG.pull,over=t.zone==='over'?Math.min(1,(t.p-P.sweetHi)/(1-P.sweetHi)):0,sh=over*.03*Math.sin(SG.clock*70+PULLN++*0),ux=t.g.x-t.from.x,uz=t.g.z-t.from.z,ul=Math.sqrt(ux*ux+uz*uz)||1,k=Math.min(1,P.full/ul)*.85,
    px=l.x+ux*k,pz=l.z+uz*k,y=.4*U(),nx=-uz/ul,nz=ux/ul,aw=.11;
  pullBar(PV.bands[0],[l.x+nx*aw,y,l.z+nz*aw],[px+nx*sh,y*.9,pz+nz*sh],.018+.012*t.p);pullBar(PV.bands[1],[l.x-nx*aw,y,l.z-nz*aw],[px+nx*sh,y*.9,pz+nz*sh],.018+.012*t.p);
  var col=t.zone==='sweet'?0x7fe05a:(t.zone==='over'?0xff5a3a:0xffd23a);PV.bands.forEach(function(m){m.material.color.set(t.zone==='sweet'?0xd6ff9a:(t.zone==='over'?0xff9a7a:0xffe29a));});
  PV.pouch.position.set(px+nx*sh,y*.9,pz+nz*sh);PV.pouch.visible=true;PV.pouch.material.color.set(col);
  PV.ring.position.set(l.x,.011,l.z);PV.ring.scale.setScalar((.3+.5*t.p)*(1+(over?.05*Math.sin(SG.clock*60):0)));PV.ring.material.color.set(col);PV.ring.visible=true;
  PV.cancel.position.set(t.from.x,.012,t.from.z);PV.cancel.scale.setScalar(P.min);PV.cancel.visible=true;
  /* the preview lands wobbling when over-pulled */
  var G=GH[as];if(over&&G&&G.land){G.land.position.x+=Math.sin(SG.clock*37)*P.overScatter*over*.35;G.land.position.z+=Math.cos(SG.clock*41)*P.overScatter*over*.35;}
  /* the lobber leans back while the band is drawn, and quivers when over-pulled */
  var v=V.pieces[l.id];if(v&&v.obj&&v.obj.userData.pivot){var pv=v.obj.userData.pivot;pv.rotation.x+=-.2*t.p;pv.rotation.z+=over*.04*Math.sin(SG.clock*80);pv.position.z+=.02*t.p;}
  if(PV.el&&hasDom){var sp=SG.screen(l.x,l.z,.2),fx=act.pull.sx!=null?act.pull.sx:sp.x,fy=act.pull.sy!=null?act.pull.sy:sp.y,mx=fx+70,my=fy-150;if(mx>W-60)mx=fx-100;if(my>H-150)my=H-150;if(my<10)my=10;
    PV.el.style.display='block';PV.el.style.left=mx+'px';PV.el.style.top=my+'px';PV.el.style.transform=over?'translate('+(Math.sin(SG.clock*90)*3*over)+'px,'+(Math.cos(SG.clock*77)*3*over)+'px)':'none';
    PV.el.querySelector('.pf').style.height=Math.round(t.p*100)+'%';PV.el.querySelector('.pf').style.background=t.zone==='sweet'?'#7fe05a':(t.zone==='over'?'#ff5a3a':'#ffd23a');
    PV.el.querySelector('.pt').textContent=t.zone==='sweet'?'Sweet!':(t.zone==='over'?'Too far!':'Pull more');}}
SG.pullState=function(s){var sd=SG.sides[s||0];return sd&&sd.pull&&sd.aim.on?{p:sd.pull.p,zone:sd.pull.zone,len:sd.pull.len,scatter:sd.pull.scatter,meter:!!(PV&&PV.el&&PV.el.style.display==='block'),band:!!(PV&&PV.bands[0].visible)}:null;};
/* ================= end of pull-back aiming ================= */
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
    else if(ph==='fight'&&P.kind==='aim'&&g){var t=pullTarget(s,P.from,g);if(t){t.sx=e.clientX;t.sy=e.clientY;}pullSet(side,t,P);}}
  function up(e){if(AR.btnDown&&AR.btnDown.ptr===e.pointerId){var bid=AR.btnDown.id;AR.btnDown=null;if(sceneButtonAt(e.clientX,e.clientY)===bid)sceneAct(bid);return;}
    if(AR.on&&AR.state!=='locked'){arUp(e);return;}if(SG.mode==='lab'&&SG.phase!=='start'){labUp(e);return;}var P=ptr[e.pointerId];if(!P)return;delete ptr[e.pointerId];var ph=SG.phase,s=P.s,side=SG.sides[s];if(SG.paused||!side||!side.human)return;var g=ground(e.clientX,e.clientY);
    if(ph==='build'){if(P.kind!=='ghost'||side.ready)return;var sl=slotAt(e.clientX,e.clientY,s);if(sl>=0){SG.select(sl,s);return;}if(side.sel>=0&&g)SG.tryPlace(g.x,g.z,null,s);return;}
    if(ph!=='fight'&&ph!=='mend'&&ph!=='count')return;
    if(P.kind==='aim'){var was=side.aim.on;side.aim.on=false;if(was){var blk=SG.lobberBlock(s);if(blk){side.pull=null;say('wait',({winding:'Still winding…',crew:'No mouse at the lobber yet',broken:'The lobber is broken',none:'No lobber'})[blk]||blockText(blk,s),true,s);}else pullRelease(s,side,side.lsel||0);return;}side.pull=null;if(P.pulled||side.tool==='lobber')return;}   /* a pull taken back to the ring is a cancel: no shot, no order */
    if(!g)return;if(SG.mode==='table'&&sideAt(g)!==s){var lo=P.from,hi=g;for(var bi=0;bi<12;bi++){var md={x:(lo.x+hi.x)/2,z:(lo.z+hi.z)/2};if(sideAt(md)===s)lo=md;else hi=md;}g=lo;}   /* in the two-player game an order stays in your own half */
    var dp=damagedAt(g,s);
    if(side.tool==='mend'){if(dp){if(SG.mend(s,dp.id))say('mend','A mouse is going to mend it',false,s);else say('nomend','No free mouse, or nothing left to mend',true,s);}else say('nomend','Tap a piece with a part knocked off',true,s);return;}
    if(dp&&SG.mend(s,dp.id)){say('mend','A mouse is going to mend it',false,s);return;}
    SG.order(s,g.x,g.z);}
  function cancel(e){if(SG.mode==='lab'){labCancel(e);}var P=ptr[e.pointerId];if(P&&SG.sides[P.s]){SG.sides[P.s].aim.on=false;SG.sides[P.s].pull=null;}delete ptr[e.pointerId];delete AR.ptr[e.pointerId];}
  AR.h={down:down,move:move,up:up};
  [el,E('ui')].forEach(function(t){t.addEventListener('pointerdown',down);t.addEventListener('pointermove',move);t.addEventListener('pointerup',up);t.addEventListener('pointercancel',cancel);});
  addEventListener('keydown',function(e){if(SG.mode==='lab'&&SG.phase!=='start'){labKey(e);return;}var k=e.key.toLowerCase();if(k==='q')SG.turn(PI/12);else if(k==='e')SG.turn(-PI/12);else if(k==='z')SG.undo();else if(k==='escape')SG.select(-1);else if(k==='enter'&&SG.sel>=0)SG.tryPlace(SG.ghost.x,SG.ghost.z);
    else if(k==='l')SG.nextLobber(0);else if(k==='1')SG.setTool('squad');else if(k==='2')SG.setTool('lobber');else if(k==='3')SG.setTool('mend');else if(k==='p')SG.paused=!SG.paused;else if(k==='c')SG.setCam(SG.cam+1);else if(k==='m')SG.setMute(!SG.muted);});
  E('bL').onclick=function(){SG.turn(PI/12);};E('bR').onclick=function(){SG.turn(-PI/12);};E('bUndo').onclick=function(){SG.undo();};E('bDone').onclick=function(){SG.done();};
  E('b_squad').onclick=function(){SG.setTool('squad');};E('b_lobber').onclick=function(){SG.setTool('lobber');};E('b_mend').onclick=function(){SG.setTool('mend');};E('bPause').onclick=function(){SG.paused=!SG.paused;lastHud='';ui();};
  E('bCam').onclick=function(){SG.setCam(SG.cam+1);};E('bStart').onclick=function(){SG.begin();};
  ORDERS.forEach(function(o){E('o_'+o).onclick=function(){var me=SG.sides[0];me.pick=me.pick===o?'':o;ui();};});
  [0,1,2,3,4,5].forEach(function(nn){E('n'+nn).onclick=function(){var me=SG.sides[0];if(me.pick){SG.setPlan(0,me.pick,nn);me.pick='';ui();}};});
  E('bHelp').onclick=function(){legendToggle(true);};E('bHelpOk').onclick=function(){legendToggle(false);};E('b_easy').onclick=function(){SG.setEasyAim(!SG.easyAim);};E('b_high').onclick=function(){var me=SG.sides[0];me.high=!me.high;ui();};
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
  var pick='blue',lvl=(function(){try{return window.localStorage.getItem('rtk.played')?'easy':'friendly';}catch(e){return 'friendly';}})(),mode='solo';   /* the first game is against the Friendly robot; after that Fair (the robot as it was) */
  choose(['l_friendly','l_easy','l_hard'],'l_'+lvl);SG.pick=function(){return {team:pick,level:lvl};};arInitUi();
  if(SG.savedCardLayout()){E('bCards').style.display='inline-block';E('bCards').onclick=function(){var on=SG.layout.custom&&SG.layoutFrom==='cards',n=E('layoutNote');n.style.display='block';
    if(on){SG.clearLayout();SG.layoutFrom='';E('bCards').className='btn';n.textContent='Using the usual table.';return;}
    var r=SG.applyLayout(SG.savedCardLayout());if(r.ok){SG.layoutFrom='cards';E('bCards').className='btn on';n.textContent='Using your card layout.';}else n.textContent='Your card layout cannot be used: '+r.reason+' Using the usual table.';};}
  E('m_solo').onclick=function(){mode='solo';choose(['m_solo','m_table'],'m_solo');E('soloOpts').style.display='block';E('tableNote').style.display='none';};
  E('m_table').onclick=function(){mode='table';choose(['m_solo','m_table'],'m_table');E('soloOpts').style.display='none';E('tableNote').style.display='block';};
  function choose(ids,on){ids.forEach(function(id){E(id).className='btn'+(id===on?' on':'');});}
  E('tBlue').onclick=function(){pick='blue';choose(['tBlue','tRed'],'tBlue');};E('tRed').onclick=function(){pick='red';choose(['tBlue','tRed'],'tRed');};
  ['friendly','easy','hard'].forEach(function(l){E('l_'+l).onclick=function(){lvl=l;choose(['l_friendly','l_easy','l_hard'],'l_'+l);};});
  ['small','medium','large'].forEach(function(z){E('z_'+z).onclick=function(){SG.piecesDefault=z;choose(['z_small','z_medium','z_large'],'z_'+z);};});if(SG.rulesDefault===1)E('zRow').style.display='none';
  E('bPlay').onclick=function(){try{window.localStorage.setItem('rtk.played','1');}catch(e){}SG.paused=false;SG.cam=0;var dn=E('designSel')?E('designSel').value:'',dz=dn?SG.labDesigns()[dn]:null;SG.start(pick,{level:lvl,mode:mode,design:dz||null});};
  E('m_lab').onclick=function(){soundOn();SG.paused=false;SG.cam=0;SG.labStart();};
  E('designSel').onchange=function(){SG.designChoice=E('designSel').value;};E('bAgain').onclick=function(){SG.reset();};
  addEventListener('resize',function(){W=innerWidth;H=innerHeight;if(!AR.on)R.setSize(W,H);});}

/* ================= THE LAB: a shooting range and building sandbox =================
   SG.mode === 'lab'. It is the same page, the same pieces, the same AMMO table and the same blast, support and collapse code as a match.
   What the Lab changes is only what a match demands and a sandbox must not: no timer, no rounds, no score, no bot, no hill, no win, free kit,
   free ammunition. Where it must reach into the real code it does so through a few marked hooks (search "lab" in this file); none of them
   changes a match. The phase stays 'fight' the whole time, so every rule that needs a fight (aiming, firing, the blast, collapses) runs as it does in a match.
   Everything the Lab adds lives in this section. LAB.md says how to use it and how to add a prototype. */
var LAB_KINDS=Object.keys(FOOT0),LAB_ICON={wall:'🧱',gate:'🚪',tower:'🏰',brace:'📐',lobber:'🔮',tent:'⛺',workshop:'🔨',trap:'🪤',cottage:'🏠',barn:'🌾',lookout:'🗼',bridge:'🌉',windmill:'🌀',stall:'🛒'},LAB_NAME={tower:'Keep',trap:'Spring trap',lookout:'Watch tower house',bridge:'Bridge + gatehouse',stall:'Market stall'};
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
  return {instant:pv('instant',true),quick:pv('quick',true),crew:pv('crew',false),strict:pv('strict',false),supports:pv('supports',false),panel:pv('panel',innerWidth>=1000),read:pv('read',innerWidth>=900),topple:pv('topple',true),debris:pv('debris',true),fxShake:pv('fxShake',true),fxSlow:pv('fxSlow',true),fxSound:pv('fxSound',true),lastBurst:0,wk:null,frame:{ms:0,worst:0,n:0,calls:0,tris:0,t:0},slow:false,   /* on a narrow screen the panel and the readout start folded away */
    tool:'build',kind:'wall',ammo:'marble',high:false,ghost:{on:false,x:0,z:2,rot:PI,ok:false,code:'',text:'',sx:0,sz:0,kind:'wall',side:0},carry:null,sel:0,fire:{s:0,li:0},
    gun:{id:-7,kind:'lobber',x:0,z:LAB_GUNR,rot:PI,built:true,ps:[],total:0,parts:0,side:0,reload:0,crew:-1,fired:-9,aim:null,x1:0},gunAim:null,spot:null,
    undo:[],redo:[],uid:0,target:'empty',saved:[[],[]],snap:null,last:null,cur:null,landings:[],fellLog:[],msg:{text:'',until:0,bad:false},sess:{keeps:0,score:0,chain:0},base:{partsOff:0,collapses:0,dizzies:0,shots:0},rkey:'',card:false};}
function labPrefs(){var L=SG.lab;labStore(LAB_PREFS,{instant:L.instant,quick:L.quick,crew:L.crew,strict:L.strict,supports:L.supports,panel:L.panel,read:L.read,topple:L.topple,debris:L.debris,fxShake:L.fxShake,fxSlow:L.fxSlow,fxSound:L.fxSound});}
function labMsg(text,bad){var L=SG.lab;if(!L)return;L.msg={text:text,until:SG.clock+2.8,bad:!!bad};}
function labInit(){
  SG.lab=labFresh();var L=SG.lab;SG.clearLayout();SG.gusts=[];
  SG.phase='fight';SG.time=1e6;SG.round=1;SG.cam=0;SG.hold=!!SG.hold;
  SG.sides.forEach(function(sd){sd.sel=-1;sd.big=99;sd.tool='lobber';sd.crew=-1;});
  SG.mice.forEach(function(m){m.state='idle';m.job=0;m.part=-1;});
  /* my camp starts with a Keep and two lobbers, so there is something to fire from; erase them if you like */
  labSetSide(0,labStarter(),true);
  labLoadTarget('walled',true);
  L.undo=[];L.redo=[];labProtosOn();L.base=labBase();L.card=!labStore(LAB_SEEN);
  SG.lab.onKey=function(){};ui();}
SG.labDraw=function(){return V.lab;};SG.labRefresh=function(){if(SG.lab){SG.lab.rkey='';labHud();}};   /* the Lab's own three.js objects, for tests */
SG.labStart=function(){SG.start('blue',{mode:'lab',seed:777});};
SG.labBack=function(){SG.lab=null;labProtosOff();defOff();labWeaponsOff();SG.speed=1;SG.paused=false;SG.reset();};
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
function labHomeMice(s){fixGrid();SG.mice.forEach(function(m){if(s!=null&&m.side!==s)return;var w=freeSpot(m.side,m.i);m.x=w[0];m.z=w[1];m.tx=w[0];m.tz=w[1];m.hx=w[0];m.hz=w[1];m.path=null;m.state='idle';m.job=0;m.part=-1;m.t=0;m.slowT=0;m.slowK=0;m.q=0;m.crewing=false;m.goal=false;m.speed=0;m.rot=phiOf(m.side)+PI;});}
function labSettleView(){labRepoint();fixGrid();}
/* replace one side's pieces by these records, all built at once */
function labSetSide(s,recs,instant){labRemoveSide(s);var order=recs.filter(function(r){return r.kind!=='brace';}).concat(recs.filter(function(r){return r.kind==='brace';}));
  order.forEach(function(r,i){r.side=s;if(r.vari==null)r.vari=i%3;labPutRaw(r,instant!==false);});SG.debris=[];SG.fuses=[];SG.puddles=[];   /* a camp built from a list always gets the same looks, so a shot at it always has the same result */labRepoint();labSaveSides();labHomeMice(s);if(DEF.on)defSideReset(s);}
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
var LAB_TARGETS=[['empty','Empty'],['walled','Walled Keep'],['braced','Braced Keep'],['longwall','Long wall'],['workshops','Workshop cluster'],['fortress','Fortress'],['glass','Glass house'],['copy','My camp copy'],['castle','Castle'],['village','Village'],['maze','Wall maze'],['domino','Domino row'],['stack','Tower stack'],['cottage','Cottage'],['barn','Barn'],['lookout','Watch tower house'],['bridge','Bridge + gatehouse'],['windmill','Windmill'],['market','Market row'],['yard','Building yard of 3']];
/* each template is a list of [kind, x, z, turn] in a camp's own frame (x across, z toward the camp's back; the Keep stands at z 2.42, facing the hill is turn PI). Sizes follow the piece scale. */
function labTemplate(id,s){var F=FOOT,T=PI,out=[],i;
  if(id==='empty')return [];
  if(id.indexOf('ars_')===0)return arsCamp(id.slice(4),s);
  if(id==='courtyard'||id==='rooms')return labCampRecs(s,defTemplate(id));   /* DEFENCES: walls with gates that split a camp into rooms */
  if(id==='walled'){var x=F.gate[0]+F.wall[0]+.01;return labCampRecs(s,[['tower',0,2.42,T],['gate',0,1.85,T],['wall',-x,1.85,T],['wall',x,1.85,T]]);}
  if(id==='braced'){var bx=F.tower[0]+F.brace[1]+.015;return labCampRecs(s,[['tower',0,2.42,T],['brace',-bx,2.42,-PI/2],['brace',bx,2.42,PI/2]]);}
  if(id==='longwall'){var sp=F.wall[0]*2+.004,l=[];for(i=0;i<6;i++)l.push(['wall',(i-2.5)*sp,2.0,T]);return labCampRecs(s,l);}
  if(id==='workshops'){var wx=F.workshop[0]+.05,tx=F.tent[0]+.05;return labCampRecs(s,[['workshop',-wx,2.3,T],['workshop',wx,2.3,T],['tent',-tx,1.9,T],['tent',tx,1.9,T],['workshop',0,1.5,T]]);}
  if(id==='glass')return labCampRecs(s,[['tower',0,2.3,T]]);
  if(id==='fortress'){var P=PRESETS.good,l2=[];P.forEach(function(q){var kind=KIT2[q[0]];if(kind==='brace')l2.push([kind,q[1],q[2],q[3]]);else l2.push([kind,Math.sin(q[2])*q[1],Math.cos(q[2])*q[1],q[2]+q[3]]);});return labCampRecs(s,l2);}
  if(id==='copy')return labMirror(0,s);
  if(id==='castle'||id==='village'||id==='maze'||id==='domino'||id==='stack')return labBigTemplate(id,s);
  if(id==='yard')return labYardRecs(LAB_YARD3,s);
  if(id==='cottage'||id==='barn'||id==='lookout'||id==='bridge'||id==='windmill'||id==='market')return labYardRecs([id],s);
  return [];}
/* my camp, copied across the table onto the other camp: the same place in that camp's own frame */
function labMirror(from,to){return labFromDesign(labToDesign(from,'copy'),to);}
SG.labLoadTarget=labLoadTarget;
function labLoadTarget(id,quiet){var L=SG.lab,before=L.saved[1].map(function(r){return Object.assign({},r);});if(DEF.on)DEF.saved[1]=defTemplateItems(id,1);labSetSide(1,labTemplate(id,1),true);L.target=id;
  if(!quiet){L.undo.push({t:'set',s:1,before:before,after:L.saved[1].map(function(r){return Object.assign({},r);})});L.redo=[];}
  var nm=LAB_TARGETS.filter(function(t){return t[0]===id;})[0];if(!quiet)labMsg((nm?nm[1]:id)+' loaded into the target camp',false);}
/* the point to aim at by default: the target's Keep, or the middle of what is there, or the middle of the camp */
SG.labDefaultSpot=function(){var ps=SG.pieces.filter(function(p){return p.side===1&&p.built;}),k=ps.filter(function(p){return p.kind==='tower';}).sort(function(a,b){return Math.abs(a.x)-Math.abs(b.x)||a.z-b.z;})[0];if(k)return {x:k.x,z:k.z};   /* with several Keeps (the Castle, the Tower stack) the one nearest the middle */
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
  if(DEF.on)defTick(dt);tickMarbles(dt);arsTick(dt);tickDebris();tickPuddles(dt);trapsTick();tickMice(dt);labDebris();
  if(SG.pieces.some(function(p){return !p.built;})||SG.mice.some(function(m){return m.state==='toMat'||m.state==='carry'||m.state==='hammer';}))buildMice(dt,true);
  labTrack();}
/* a mouse in the Lab stands at its camp's resting place; a dizzy one is dealt with by tickMice as in a match */
function labMouse(m,dt){goTo(m,m.hx,m.hz,.3);if(walk(m,dt,WALK())){m.state='idle';m.goal=false;m.speed=0;}else{m.state='go';m.goal=false;}}

/* ---- what happened: the real code tells the Lab through labNote, from knock, collapse, keepDown and landV2 ---- */
function labNote(kind,a,b,c,d){var L=SG.lab,cur=L&&L.cur;if(!cur||cur.done)return;
  if(kind==='part')cur.parts.push({piece:a.id,kind:a.kind,side:a.side,part:b.id,stg:b.stg});
  else if(kind==='collapse'){cur.fell.push(labName(a.kind)+(a.side?' (target)':' (mine)'));cur.chain=Math.max(cur.chain||0,b||1);if(BK[a.kind])cur.bcol=(cur.bcol||0)+1;}
  else if(kind==='keep'){cur.keep=true;cur.fell.push('Keep'+(a.side?' (target)':' (mine)'));L.sess.keeps++;cur.keeps=(cur.keeps||0)+1;cur.chain=Math.max(cur.chain||0,b||1);}
  else if(kind==='land')cur.landings.push({x:b[0],y:b[1],z:b[2],r:c,ammo:a.ammo,high:!!a.high,hit:d?d.kind:'',hitSide:d?d.side:-1});}
/* screen shake, the slow-motion beat and the sounds scale with the parts that fell at once (n), if the Lab's switches for them are on. Without them a landing shakes and slows as in a match. */
function labFx(n){var L=SG.lab,cur=L&&L.cur;if(!L||n<=0)return;var F=C3.fx;if(cur&&!cur.done)cur.burst=Math.max(cur.burst||0,n);L.lastBurst=n;
  if(L.fxShake)SG.shake=Math.min(F.shakeMax,n*F.shake);
  if(L.fxSlow)SG.slowT=n>=F.slowFrom?Math.min(F.slowMax,F.slowBase+n*F.slow):0;
  if(L.fxSound&&hasDom){var later=function(ms,nm){setTimeout(function(){snd(nm);},ms);};if(n>=3)snd('knock');if(n>=6)snd('crash');if(n>=12){later(90,'thud');later(200,'crash');}if(n>=24)later(340,'thud');}}
/* a shot is over when nothing is in the air and no thrown part is still to land */
function labTrack(){var L=SG.lab,cur=L.cur;if(!cur||cur.done)return;if(SG.marbles.some(function(m){return m.live||m.pend;})||SG.debris.length||SG.fuses.length||arsBusy())return;
  var st=SG.stats;cur.done=true;cur.partsOff=st.partsOff-cur.b.partsOff;cur.collapses=st.collapses-cur.b.collapses;cur.dizzies=st.dizzies-cur.b.dizzies;cur.glued=st.glued-cur.b.glued;cur.bounces=st.bounces-cur.b.bounces;cur.secs=+(SG.clock-cur.b.t).toFixed(2);
  L.sess.score=(L.sess.score||0)+labCarnageOf(cur);L.sess.chain=Math.max(L.sess.chain||0,cur.chain||0);cur.fellOne=cur.fell.slice();L.landings=cur.landings.slice();cur.fell.forEach(function(f){L.fellLog.unshift(f);});L.fellLog=L.fellLog.slice(0,8);L.rkey='';}
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
  if(DEF.on&&li==='gun'&&(L.gunDown||0)>SG.clock){DEF.stats.gunLost++;labMsg('The free gun was hit by counter-fire: it is out for '+Math.ceil(L.gunDown-SG.clock)+' s',true);return null;}
  side.ammo=L.ammo;side.high=L.high;side.big=99;
  if(opt.force){l.reload=0;side.cd[L.ammo]=0;}
  var blk=SG.lobberBlock(s,li);if(blk){labMsg(blockText(blk,s),true);return null;}
  var rec={s:s,li:li,ammo:L.ammo,high:L.high&&!A.w.flat,tx:tx,tz:tz,gx:l.x,gz:l.z,seed:SG.seed};if(opt.seed!=null)SG.seed=opt.seed;
  var cur=labNewCur(rec);L.cur=cur;SG.topN=0;
  var a=SG.fire(s,tx,tz,li);side.ammo=L.ammo;
  if(!a){L.cur=null;return null;}
  rec.seed=opt.seed!=null?opt.seed:rec.seed;L.last=rec;L.landings=[];L.rkey='';return a;};
SG.labReplay=function(){var L=SG.lab,r=L&&L.last;if(!r){labMsg('Nothing to replay yet: fire a shot first',true);return null;}
  L.ammo=r.ammo;L.high=r.high;SG.sides.forEach(function(sd){sd.ammo=r.ammo;sd.high=r.high;});
  var a=SG.labFire(r.s,r.li,r.tx,r.tz,{force:true,seed:r.seed});if(a){labMsg('Replayed: same aim, same ammunition',false);ui();}return a;};
/* run the clock until the last shot has come down and everything it threw has landed. For tests and the range report. */
SG.labSettle=function(max){var L=SG.lab,t=0;max=max||12;while(t<max&&L.cur&&!L.cur.done){SG.step(STEP);t+=STEP;}SG.step(STEP);return L.cur;};

/* ---- readouts ---- */
SG.labSession=function(){var L=SG.lab,st=SG.stats,b=L.base;return {shots:st.shots-b.shots,partsOff:st.partsOff-b.partsOff,collapses:st.collapses-b.collapses,keeps:L.sess.keeps,dizzies:st.dizzies-b.dizzies,score:Math.round(L.sess.score||0),chain:L.sess.chain||0};};
SG.labResetCounters=function(){var L=SG.lab;L.base=labBase();L.sess={keeps:0,score:0,chain:0};L.fellLog=[];L.rkey='';};
var LAB_WHY={keep:'brings the Keep down',roof:'drops the roof','wall-all':'brings the whole wall down','wall-planks':'drops the planks',gate:'brings the gate down'};
/* for each attached part: would losing it alone bring something down? Asked of the real rule (holdFail), one part at a time. */
function labCritical(p){var out={};if(p.down||!p.built)return out;
  if(BK[p.kind]){p.ps.forEach(function(q,i){if(q.st!=='on'||q.stg!==2)return;var n=bCascade(p,i);if(n>0)out[q.id]='bld:'+n;});return out;}   /* a building: the frame parts that alone would bring more parts down */
  p.ps.forEach(function(q){if(q.st!=='on'||!/post|rail|brace|floor/.test(q.id))return;q.st='off';var f=holdFail(p);q.st='on';if(f)out[q.id]=f;});
  props(p).forEach(function(b){var was=b.parts;b.parts=0;var f=holdFail(p);b.parts=was;if(f)out['piece:'+b.id]=f;});return out;}
SG.labSupports=function(p){if(typeof p==='number')p=pieceById(p);if(!p)return null;var cr=labCritical(p),rows=[],rule='',k=p.kind;
  function row(label,on,key){var f=cr[key];rows.push({text:label+(on?'':' (gone)'),on:on,crit:!!f,why:f?(/^bld:/.test(f)?'drops '+f.slice(4)+' more parts':LAB_WHY[f]):''});}
  function parts(re){p.ps.forEach(function(q){if(re.test(q.id))row(partName(q.id)+' '+(q.id.split('.')[2]||''),q.st==='on',q.id);});}
  if(k==='wall'){rule='A wall stands while it has a post (or a brace is propping it). Its planks hang on the rails.';parts(/post|rail/);rows.push({text:'Planks on: '+onCount(p,/plank/)+' of '+p.ps.filter(function(q){return /plank/.test(q.id);}).length,on:true});}
  else if(k==='gate'){rule='A gate needs both its posts.';parts(/gate\.post/);}
  else if(k==='tower'){rule='A Keep stands on 3 legs, or on 2 if the brace across the open side is on (or a brace piece props it). The roof needs the floor and a rail.';parts(/^tower\.post/);parts(/^tower\.brace/);parts(/^tower\.floor|^tower\.rail/);}
  else if(k==='lobber'){rule='No support rules. A lobber needs its crank and bucket to fire.';parts(/crank|bucket/);}
  else if(BK[k]){rule='A building comes apart in stages. Trim (tiles, shutters, flags, awnings) hangs on the walls and the frame, walls hang on the frame, the frame stands on the ground. Take a support and what hung on it falls.';
    p.ps.forEach(function(q){if(q.stg===2)row(partName(q.id)+' '+(q.id.split('.').slice(2).join('.')||''),q.st==='on',q.id);});
    ['trim','walls','frame'].forEach(function(nm,g){var all=p.ps.filter(function(q){return q.stg===g;});rows.push({text:'Stage '+g+', '+nm+': '+all.filter(function(q){return q.st==='on';}).length+' of '+all.length+' on',on:true});});}
  else if(k==='brace'){rule='A brace props the tower or wall it leans on. If it is knocked off, that piece loses the help.';}
  else rule='No support rules: parts come off only when a blast reaches them, and nothing falls by itself.';
  props(p).forEach(function(b){row('Brace piece',true,'piece:'+b.id);});
  if(k==='brace'){var pr=p.props?pieceById(p.props):null;rows.push({text:pr?'Props the '+labName(pr.kind)+' beside it':'Not leaning on anything',on:!!pr});}
  return {title:labName(k)+(p.side?' (target)':' (mine)'),rule:rule,rows:rows,state:p.down?'down':(holdFail(p)||'stands'),critical:cr};};
SG.labSelect=function(p){var L=SG.lab;L.sel=p?p.id:0;L.rkey='';};

/* ---- snapshot and restore of the whole table, damage and all ---- */
SG.labSnapshot=function(){var L=SG.lab;return {pieces:SG.pieces.map(function(p){return {rec:labRec(p),aim:p.aim,sprung:!!p.sprung,down:!!p.down,fallDir:p.fallDir||0,ps:p.ps.map(function(q){return {st:q.st,rx:q.rx,rz:q.rz,used:!!q.used,swept:!!q.swept};})};}),
  saved:[L.saved[0].slice(),L.saved[1].slice()],target:L.target,uid:L.uid,def:defSnap()};};
SG.labRestore=function(sn){var L=SG.lab;if(!sn)return false;SG.pieces.slice().forEach(labRemove);
  sn.pieces.forEach(function(e){var p=labPutRaw(Object.assign({},e.rec),true);p.aim=e.aim;p.sprung=e.sprung;
    e.ps.forEach(function(sq,i){var q=p.ps[i];if(!q||sq.st==='on')return;q.st=sq.st;q.rx=sq.rx;q.rz=sq.rz;q.t0=-99;q.used=sq.used;q.swept=!!sq.swept;});
    if(p.ps.length)p.parts=p.ps.filter(function(q){return q.st==='on';}).length;if(e.down){p.down=true;p.fallT=SG.clock-99;p.fallDir=e.fallDir;p.parts=0;}});
  L.saved=[sn.saved[0].slice(),sn.saved[1].slice()];L.target=sn.target;SG.debris=[];SG.fuses=[];SG.puddles=[];SG.marbles=[];labRepoint();fixGrid();labHomeMice();defRestore(sn.def);L.cur=null;L.landings=[];L.rkey='';return true;};
SG.labTakeSnapshot=function(){SG.lab.snap=SG.labSnapshot();labMsg('Snapshot taken',false);ui();};
SG.labRestoreSnapshot=function(){var L=SG.lab;if(!L.snap){labMsg('Take a snapshot first',true);return false;}SG.labRestore(L.snap);labMsg('Table restored',false);ui();return true;};

/* ---- the Weapon Workshop ----
   A weapon is a plain record of numbers (WDEF in the ammunition table above). The Workshop makes one from a base (Marble, Ball, Acorn, Cork), clamps every number to CONFIG.workshop.caps, shows a price, and puts it
   in the ammo row at once. It can be saved (localStorage), copied as JSON and pasted back, and "Rate it" fires it at every target. The six presets below are made with it; each is also a prototype, so
   switching it on in the Prototypes panel lists it in the ammo row. Ideas and their makers are named at each preset (see LAB.md). Lab only: leaving the Lab takes every one of them off the AMMO table. */
var LAB_WKEY='rtk.lab.weapons.v1',LAB_BOOLS=['leg','legForce','flat','popEach'];
function wCopy(w){var o={},k;for(k in WDEF)o[k]=w[k];if(o.arc)o.arc=o.arc.slice();return o;}
/* every number held to its range (CONFIG.workshop.caps); missing numbers take the default; notes say what was held */
function wClamp(src){var o={},notes=[],caps=C3.caps,k;src=src||{};
  for(k in WDEF){var v=src[k],d=WDEF[k];
    if(LAB_BOOLS.indexOf(k)>=0){o[k]=v==null?d:!!v;continue;}
    if(k==='arc'){o.arc=Array.isArray(v)&&v.length===2&&isFinite(+v[0])&&isFinite(+v[1])?[Math.max(0,Math.min(1,+v[0])),Math.max(0,Math.min(1,+v[1]))]:null;continue;}
    var n=+v;if(v==null||v===''||!isFinite(n)){o[k]=d;if(v!=null&&v!=='')notes.push(k+' is not a number, set to '+d);continue;}
    var c=caps[k];if(k==='bounces'||k==='scatter'||k==='cap')n=Math.round(n);
    if(c){var m=Math.max(c[0],Math.min(c[1],n));if(m!==n)notes.push(k+' '+n+' held to '+m+' (range '+c[0]+' to '+c[1]+')');n=m;}
    o[k]=n;}
  return {w:o,notes:notes};}
/* the price in budget points, from the numbers: what a weapon can do costs, what holds it back (a long wait) takes a little off */
function wPrice(w){var P=C3.price,p=w.blast*(w.blast/P.blastRef)*P.blast*(w.cap>0?Math.min(1,.5+w.cap/16):1)*(1+(w.scatter-1)*P.scatter)*(w.popEach?1+w.bounces*P.popEach:1);
  p+=(w.leg?P.leg:0)+(w.legForce?P.legForce:0)+Math.max(0,w.speed-1)*P.speed+Math.max(0,w.arcMul-1)*P.arc+w.bounces*P.bounce+w.fuse*P.fuse+w.stick*P.stick+(1-w.slowTo)*w.slowSecs*P.slow+w.puddle*P.puddle+w.splash*P.splash;
  p+=(w.dizzyR>0?w.dizzyR*P.dizzy:0)+w.dizzySecs*P.dizzySecs+(w.tether>0?P.tether+w.tether*P.tetherLen:0)+w.quake*P.quake+w.roll*P.roll-w.cd*P.cd;
  p+=arsPrice(w);
  return Math.round(Math.max(P.floor,p)*10)/10;}
SG.wPrice=wPrice;SG.wClamp=wClamp;SG.wCopy=wCopy;
var LAB_BASES={
  marble:{label:'Marble',icon:'🔵',tint:'team',scale:1.25,w:function(){return wCopy(AMMO.marble.w);}},
  ball:{label:'Ball',icon:'⚪',tint:0xd8d8e0,scale:1.7,w:function(){return {blast:.25,leg:true,flat:true,speed:.85};}},
  acorn:{label:'Acorn',icon:'🌰',tint:0x9c6b30,scale:1.1,w:function(){return {blast:.1,roll:1.6};}},
  cork:{label:'Cork',icon:'🍾',tint:'cork',scale:.8,w:function(){return wCopy(AMMO.corks.w);}}};
/* a weapon's sliders: [key, label, step]; the range of each is in CONFIG.workshop.caps */
var LAB_WPARAMS=[['blast','Blast radius',.01],['hiMul','High-lob blast (share)',.05],['falloff','Blast falloff (1 = a match)',.05],['cap','Parts per hit (0 = no limit)',1],['speed','Flight speed',.05],['arcMul','Arc height',.05],['bounces','Bounces',1],['hop','Bounce distance',.05],['hopH','Bounce height',.05],
  ['scatter','Scatter count',1],['spread','Scatter spread',.02],['fuse','Fuse (seconds)',.1],['stick','Stick (seconds)',.5],['splash','Splash radius',.01],['slowTo','Mice slowed to (share)',.05],['slowSecs','Slow for (seconds)',.5],['puddle','Puddle (seconds)',.5],['dizzyR','Dizzy radius (-1 = the blast)',.02],['dizzySecs','Dizzy for (0 = usual)',.5],
  ['tether','Tether length (0 = none)',.1],['quake','Quake radius',.05],['roll','Roll distance',.1],['cd','Cooldown (seconds)',.5]];
var LAB_WBOOLS=[['leg','Can break a Keep leg'],['legForce','Always breaks the nearest leg'],['flat','Flat shot only'],['popEach','Pops at every bounce']];
function labSlug(n){return String(n||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,24)||'weapon';}
/* put a weapon record on the AMMO table (Lab only); returns its id */
function labWkInstall(rec,id){var c=wClamp(rec.params),base=LAB_BASES[rec.base]||LAB_BASES.marble;id=id||('w_'+labSlug(rec.name));var old=AMMO[id];
  AMMO[id]={name:String(rec.name||'My weapon').slice(0,40),icon:rec.icon||base.icon,short:String(rec.name||'Mine').slice(0,9),tint:rec.tint!=null?rec.tint:base.tint,scale:rec.scale||base.scale,w:c.w,workshop:true,base:rec.base||'marble',maker:rec.maker||''};
  if(old&&old.workshop)AMMO[id].w=c.w;SG.sides.forEach(function(sd){if(sd.cd)sd.cd[id]=0;});return id;}
function labWkRemove(id){var A=AMMO[id];if(!A||!A.workshop)return;delete AMMO[id];var L=SG.lab;if(L&&L.ammo===id)SG.labSetAmmo('marble');if(L&&L.wk&&L.wk.id===id)L.wk.id='';}
function labWeaponsOff(){Object.keys(AMMO).forEach(function(k){if(AMMO[k].workshop)delete AMMO[k];});}
/* the record that is saved, copied and pasted */
SG.labWeaponRec=function(id){var A=AMMO[id];if(!A)return null;return {schema:'rtk.weapon',version:1,name:A.name,base:A.base||'marble',icon:A.icon,tint:A.tint,scale:A.scale||1.25,maker:A.maker||'',params:wCopy(A.w)};};
/* is this a weapon we can read? {ok, text, rec (clean), notes} */
SG.labWeaponCheck=function(r){if(typeof r==='string'){try{r=JSON.parse(r);}catch(e){return {ok:false,text:'That is not readable JSON'};}}
  if(!r||typeof r!=='object'||r.schema!=='rtk.weapon')return {ok:false,text:'It is not a weapon record (schema must be rtk.weapon)'};if(!r.params||typeof r.params!=='object')return {ok:false,text:'The weapon has no params'};
  var name=String(r.name||'').replace(/^\s+|\s+$/g,'').slice(0,40);if(!name)return {ok:false,text:'The weapon has no name'};var c=wClamp(r.params);
  return {ok:true,text:c.notes.length?'Loaded, with '+c.notes.length+' number'+(c.notes.length>1?'s':'')+' held to the range':'Loaded',notes:c.notes,rec:{schema:'rtk.weapon',version:1,name:name,base:LAB_BASES[r.base]?r.base:'marble',icon:typeof r.icon==='string'?r.icon.slice(0,4):'',tint:r.tint!=null?r.tint:null,scale:+r.scale>0&&+r.scale<4?+r.scale:null,maker:String(r.maker||'').slice(0,80),params:c.w}};};
SG.labWeapons=function(){var o=labStore(LAB_WKEY);return o&&typeof o==='object'?o:{};};
SG.labWeaponSave=function(rec){var k=SG.labWeaponCheck(rec);if(!k.ok)return k;var all=SG.labWeapons();all[k.rec.name]=k.rec;labStore(LAB_WKEY,all);if(SG.lab)labUi();return {ok:true,text:'Saved "'+k.rec.name+'"',rec:k.rec};};
SG.labWeaponDelete=function(name){var all=SG.labWeapons();delete all[name];labStore(LAB_WKEY,all);if(SG.lab)labUi();};
/* the editor: L.wk = {base, name, w (plain numbers), id (the ammo id once it is in the ammo row, or '')} */
function labWkState(){var L=SG.lab;if(!L.wk)L.wk={base:'marble',name:'My weapon',w:wCopy(wRec(LAB_BASES.marble.w())),id:''};return L.wk;}
function labWkPush(){var L=SG.lab,k=labWkState();if(!k.id||!AMMO[k.id])return;var c=wClamp(k.w);AMMO[k.id].w=c.w;AMMO[k.id].name=k.name||'My weapon';AMMO[k.id].short=String(k.name||'Mine').slice(0,9);}
SG.labWkBase=function(key){var k=labWkState(),b=LAB_BASES[key];if(!b)return false;k.base=key;k.w=wClamp(Object.assign(wCopy(WDEF),b.w())).w;if(k.id&&AMMO[k.id]){AMMO[k.id].base=key;AMMO[k.id].icon=b.icon;AMMO[k.id].tint=b.tint;AMMO[k.id].scale=b.scale;}labWkPush();labUi();return true;};
SG.labWkSet=function(key,v){var k=labWkState();if(typeof WDEF[key]==='undefined'||key==='arc')return false;var t={};t[key]=v;var c=wClamp(Object.assign({},k.w,t));k.w=c.w;labWkPush();labWkSync();return c.w[key];};
SG.labWkName=function(n){var k=labWkState();k.name=String(n||'').slice(0,40);labWkPush();};
/* "Use it": the weapon goes in the ammo row, chosen */
SG.labWkUse=function(){var k=labWkState(),b=LAB_BASES[k.base],nm=(k.name||'').replace(/^\s+|\s+$/g,'')||'My weapon';k.name=nm;
  var rec={name:nm,base:k.base,icon:b.icon,tint:b.tint,scale:b.scale,params:k.w},id=labWkInstall(rec,'w_'+labSlug(nm));k.id=id;SG.labSetAmmo(id);labMsg(nm+' is in the ammo row',false);return id;};
SG.labWkLoad=function(rec){var k=SG.labWeaponCheck(rec);if(!k.ok)return k;var L=SG.lab,w=labWkState();w.base=k.rec.base;w.name=k.rec.name;w.w=k.rec.params;w.id=labWkInstall(k.rec,'w_'+labSlug(k.rec.name));w.maker=k.rec.maker;SG.labSetAmmo(w.id);k.id=w.id;labUi();return k;};
SG.labWkSaveNow=function(){var k=labWkState(),b=LAB_BASES[k.base];return SG.labWeaponSave({schema:'rtk.weapon',version:1,name:k.name||'My weapon',base:k.base,icon:b.icon,tint:b.tint,scale:b.scale,params:k.w});};
/* the six presets, made with the Workshop (each also a prototype that lists it in the ammo row) */
var LAB_PRESETS=[
  {key:'tether',name:'Tether marble',icon:'🧵',tint:0xe8c070,base:'marble',maker:'ChatGPT #18, Grok #16, Gemini #13',note:'A marble on a string: it snags the first part it passes and yanks it loose toward you.',w:{blast:.05,tether:1.5,cd:3}},
  {key:'quake',name:'Pocket Earthquake',icon:'🌍',tint:0x7a6a55,base:'ball',maker:'ChatGPT #12',note:'A heavy ball that loosens things without striking: parts held by one fastener fall.',w:{blast:0,leg:false,quake:1,dizzyR:.3,cd:4}},
  {key:'roller',name:'Acorn drum',icon:'🌰',tint:0x9c6b30,base:'acorn',maker:'Gemini #11 (also Gemini #18, Grok #19, ChatGPT #19)',note:'Lands, then rolls on along the table, knocking parts off at its base.',w:{blast:.1,roll:2.4,cd:3}},
  {key:'beads',name:'Bead shot',icon:'📿',tint:0xe05fa8,base:'cork',maker:'Gemini #20',note:'Eight tiny beads scatter; mice they land near are slowed.',w:{blast:.05,scatter:8,spread:.5,dizzyR:0,splash:.12,slowTo:.5,slowSecs:3,cd:2}},
  {key:'pop',name:'Pop bomb',icon:'🎈',tint:0xf06a8a,base:'marble',maker:'the Lab (a toy "pop"; fire and powder are out)',note:'Lies a second, then goes pop: a large blast that takes parts off and only makes mice dizzy.',w:{fuse:1,blast:.42,falloff:.8,dizzyR:.35,cap:6,leg:false,hiMul:.6,cd:6}},
  {key:'triple',name:'Triple bouncer',icon:'🎾',tint:0xc8e03a,base:'ball',maker:'the Lab (from the Bouncer)',note:'Three bounces, a small blast at each.',w:{blast:.22,leg:false,flat:true,bounces:3,hop:.8,hopH:.5,popEach:true,speed:1/1.35,arc:[.3,.24],cd:4}}];
function labPresetRec(pr){var b=LAB_BASES[pr.base],w=Object.assign(wCopy(WDEF),b.w(),pr.w);return {schema:'rtk.weapon',version:1,name:pr.name,base:pr.base,icon:pr.icon,tint:pr.tint,scale:b.scale,maker:pr.maker,params:wClamp(w).w};}
SG.labPresets=LAB_PRESETS;SG.labPresetRec=function(key){var pr=LAB_PRESETS.filter(function(q){return q.key===key;})[0];return pr?labPresetRec(pr):null;};
LAB_PRESETS.forEach(function(pr){LAB_PROTOS['p_'+pr.key]={name:pr.name+' (weapon)',note:pr.note+' Made by: '+pr.maker+'.',on:function(){labWkInstall(labPresetRec(pr),'p_'+pr.key);},off:function(){labWkRemove('p_'+pr.key);}};});
SG.labWkPreset=function(key){var r=SG.labPresetRec(key);if(!r)return false;var k=labWkState();k.base=r.base;k.name=r.name;k.w=r.params;k.id='';labUi();return true;};

/* ================= ARSENAL (Lab only): seven families of weapon, and the pieces that counter them =================
   Harry, 20 Nov: "we need to build them all, make them all different, and realise how the bases need to be different to counteract them."
   Seven families, each with its own look, motion, sound and behaviour (the numbers are records on the AMMO table, like every other kind; see WDEF):
     Lobber (the Marble, high arc)   Flat flinger (line:1, fast, pierce:1)   Roller (roll)   Scatter popper (scatter)   Tether hook (tether)   Thumper (quake, qlvl 2)   Fan (gust)
   Counter pieces, all cheap, all with a support rule (the Building Yard's part table, models.js):
     Roof (awning) blunts a lob from above   Shield board stops a flat shot   Ditch and Log barrier stop a roller   Net catches beads and a hook   Cutter post cuts a hook's string
     Extra brace (the kit's brace piece) holds a wall or Keep against a strong thump   Heavy block and Low wall shelter what is near them from a gust
   Nothing here runs in a match: the weapons are on the AMMO table only while the "Arsenal" switch is on (a Lab prototype, off by default and put back when the Lab is left), the counter
   pieces are in no kit, and every hook in the old code starts with SG.mode === 'lab' or looks up a piece kind that only the Lab has. Rules are in LAB.md. */
var ARS={
  clear:.5,                       /* a roof or net hangs this high (scale 1): a shot lower than this goes under it */
  roofCover:.45,roofCut:.25,roofLoad:1.6,      /* a roof shelters a landing this near its edge; a lobbed blast there keeps this share of its radius. It wears: each blast it takes adds (radius / a Marble's radius) squared to the roof's load, and a cloth panel comes off for every roofLoad of it */
  flatCut:{shield:.2,logs:.35,lowwall:.5,heavy:.2},   /* thick pieces: the share of a flat shot's blast that gets through when it strikes them */
  pierceKeep:.85,                 /* what is left of the blast after a punch through a thin piece */
  netCover:.8,netWear:10,          /* a net catches a bead or a hook that lands this near its edge, or a string that crosses it; every netWear catches wears one strip of mesh (3 strips) */
  cutR:.3,                        /* a string that passes this near a cutter post (with a blade on) is cut, and the blade comes off */
  ditchDepth:4,logDepth:2,        /* rollers a lane of a ditch swallows before it is filled in; rollers a log stops before it is knocked off */
  strongR:.65,                    /* a strong thump (qlvl 2) works this share of its radius out from where it lands */
  gustSpeed:1,shotK:.55,pushMax:.9,ripSecs:1.2,   /* gust: units a second at strength 1; how much of it a shot in the air feels; how far a mouse is blown at most; seconds of gust that tear one panel of cloth off */
  leeHeavy:.55,leeLow:.3,         /* a Heavy block shelters this far round it from a gust, a Low wall this far (from its edge, scale 1) */
  massBy:{big:3,glue:1.2,corks:.5,bouncer:1.3},   /* how hard a gust moves a shot of these kinds (a weapon's own mass, if it has one, counts instead) */
  thin:{wall:1,gate:1,lowwall:1},  /* what a flinger can punch through */
  counters:['awning','shield','ditch','logs','net','cutter','heavy','lowwall','brace']
};
SG.ARS=ARS;SG.CK=CK;SG.TALL=TALL;
/* what a weapon is, from its numbers (so a Workshop weapon is placed too) */
function famOf(W){if(!W)return 'lob';if(W.gust>0)return 'gust';if(W.tether>0)return 'tether';if(W.roll>0)return 'roll';if(W.quake>0&&W.blast<=.05)return 'thump';if(W.line>0||W.pierce>0)return 'flat';if(W.scatter>=4)return 'scatter';return 'lob';}
SG.famOf=famOf;
function segDist(px,pz,x0,z0,x1,z1){var dx=x1-x0,dz=z1-z0,l=dx*dx+dz*dz,t=l>0?((px-x0)*dx+(pz-z0)*dz)/l:0;t=Math.max(0,Math.min(1,t));return dist(px,pz,x0+dx*t,z0+dz*t);}
/* pieceAt asks about the counter kinds only: a trench is flat, a roof or a net hangs over a low shot's head, a net lets a heavy ball through */
function arsSkip(p,y){var k=p.kind;if(k==='ditch'||k==='cutter')return true;if(k==='awning')return y<ARS.clear*PS;if(k==='net')return y<ARS.clear*PS||!(ARSF==='scatter'||ARSF==='tether');return false;}
/* tickMarbles: which shot is being looked at (its family, and the pieces it has already gone through) */
/* ARSENAL rules run in the Lab, and in a defence match (flag) */
function arsMode(){return SG.mode==='lab'||DEF.match;}
function arsIn(a){var A=AMMO[a.ammo];ARSF=A?famOf(A.w):'';IGN=a.ign||null;}
/* a flat shot with pierce punches through a thin piece (a wall, a gate): one part comes off and it flies on, a little weaker */
function arsPierce(a,hit,pos){var A=AMMO[a.ammo],W=A&&A.w;if(!W||!(W.pierce>0)||!ARS.thin[hit.kind]||hit.side===a.side)return false;a.pn=a.pn|0;if(a.pn>=W.pierce)return false;
  a.pn++;(a.ign||(a.ign={}))[hit.id]=1;IGN=a.ign;var i=nearestPart(hit,pos[0],pos[1],pos[2],false);
  if(i>=0){SG.att=a.side;SG.cause='pierce';knock(hit,i,a.x1-a.x0,a.z1-a.z0,'pierce',(.16+rand()*.1)*U());settle(hit,a.side);pop(pos[0],pos[2],'Through!',false,pos[1]+.1);}
  snd('knock');return true;}
/* wear a counter: the nearest part of it that matches comes off */
function arsWear(p,re,x,z,dx,dz,by){var bi=-1,bd=1e9,i;for(i=0;i<p.ps.length;i++){var q=p.ps[i];if(q.st!=='on'||!re.test(q.id))continue;var d=(q.wx-x)*(q.wx-x)+(q.wz-z)*(q.wz-z);if(d<bd){bd=d;bi=i;}}
  if(bi<0)return false;SG.cause=by;knock(p,bi,dx,dz,by,(.1+rand()*.08)*U());settle(p,SG.att);return true;}
function arsOn(p,re){for(var i=0;i<p.ps.length;i++)if(p.ps[i].st==='on'&&re.test(p.ps[i].id))return true;return false;}
/* the nearest piece of this kind on this side that still works (re: a part that must be on) and reaches (x,z) within d of its edge */
function arsFind(kind,side,re,x,z,d){var best=null,bd=d;for(var i=0;i<SG.pieces.length;i++){var p=SG.pieces[i];if(p.kind!==kind||p.side!==side||!p.built||p.down||p.parts<=0||!arsOn(p,re))continue;var b=boxDist(p,x,z);if(b<=bd){bd=b;best=p;}}return best;}
function arsCutter(a,x,z){var u=U();for(var i=0;i<SG.pieces.length;i++){var p=SG.pieces[i];if(p.kind!=='cutter'||p.side===a.side||!p.built||p.down||p.parts<=0||!arsOn(p,/blade/))continue;if(segDist(p.x,p.z,a.sx,a.sz,x,z)>ARS.cutR*u)continue;
    SG.att=a.side;if(arsWear(p,/blade/,p.x,p.z,a.sx-p.x,a.sz-p.z,'cut')){pop(p.x,p.z,'Snip!',false,.5);SG.stats.cuts=(SG.stats.cuts||0)+1;snd('twang');return true;}}return false;}
/* a net catches a bead that lands near it, or a string that crosses it */
function arsNet(a,pos,str){var u=U();for(var i=0;i<SG.pieces.length;i++){var p=SG.pieces[i];if(p.kind!=='net'||p.side===a.side||!p.built||p.down||p.parts<=0||!arsOn(p,/mesh/))continue;
    var near=boxDist(p,pos[0],pos[2])<=ARS.netCover*u,cross=str&&segHitsBox(p,a.sx,a.sz,pos[0],pos[2]);if(!near&&!cross)continue;
    p.catches=(p.catches|0)+1;SG.att=a.side;if(p.catches%ARS.netWear===0)arsWear(p,/mesh/,pos[0],pos[2],pos[0]-p.x,pos[2]-p.z,'caught');pop(pos[0],pos[2],'Caught!',false,.4);SG.stats.caught=(SG.stats.caught|0)+1;snd('tap');return true;}return false;}
/* a landing meets the counters: boom() calls this with the blast radius and gets one back. a.caught says the ball was caught and does nothing more. */
function arsBoom(a,pos,hit,R){var A=AMMO[a.ammo]||AMMO.marble,W=A.w,fam=famOf(W),u=U(),en=1-a.side;
  if(a.pn)R*=Math.pow(ARS.pierceKeep,a.pn);
  if(a.snag){var sp=a.snag.p,sq=sp&&sp.ps[a.snag.i];if(sq&&sq.st==='on'){if(arsCutter(a,sq.wx,sq.wz)){a.snag=null;a.cut=true;}else if(arsNet(a,[sq.wx,sq.wy,sq.wz],true)){a.snag=null;a.caught=true;return 0;}}}
  if(fam==='scatter'||fam==='tether'){if(arsNet(a,pos,false)){a.caught=true;return 0;}}
  /* a roof over the spot: a ball lobbed from above loses most of its blast, and the roof loses a panel */
  if(R>0&&(fam==='lob'||fam==='scatter')&&!(W.line>0)){var rf=arsFind('awning',en,/cloth/,pos[0],pos[2],ARS.roofCover*u);if(rf){SG.att=a.side;var r1=C2.blast*u;rf.load=(rf.load||0)+(R*R)/(r1*r1);R*=ARS.roofCut;while(rf.load>=ARS.roofLoad&&arsOn(rf,/cloth/)){rf.load-=ARS.roofLoad;arsWear(rf,/cloth/,pos[0],pos[2],a.x1-a.x0,a.z1-a.z0,'roof');}a.roofed=true;pop(pos[0],pos[2],'Roofed!',false,.5);}}
  /* a thick piece struck by a flat shot: only a little of the blast gets past, and the board wears */
  if(R>0&&fam==='flat'&&hit&&hit.side===en&&ARS.flatCut[hit.kind]!=null&&!hit.down){R*=ARS.flatCut[hit.kind];SG.att=a.side;if(hit.kind!=='heavy')arsWear(hit,/\.(plank|log|brick)\./,pos[0],pos[2],a.x1-a.x0,a.z1-a.z0,'absorbed');pop(pos[0],pos[2],'Stopped!',false,pos[1]+.1);a.stopped=true;}
  return R;}
/* a ball that rolls: a ditch lane that is still open swallows it, a log barrier stops it */
function arsStop(a,r){r.left=0;r.acc=-9;r.stopped=true;snd('thud');}
function arsRoll(a,r){if(r.stopped||r.left<=0)return;var u=U(),pad=C3.rollR*u;
  for(var i=0;i<SG.pieces.length;i++){var p=SG.pieces[i];if(p.side===a.side||!p.built||p.down||p.parts<=0||(p.kind!=='ditch'&&p.kind!=='logs'))continue;
    var f=FOOT[p.kind],l=toLocal(p,r.x,r.z);if(Math.abs(l[0])>f[0]||Math.abs(l[1])>f[1]+pad)continue;
    if(p.kind==='ditch'){var lane=Math.max(0,Math.min(2,Math.floor((l[0]+f[0])/(2*f[0]/3)))),qi=p.pi['ditch.pit.'+lane];if(qi==null||p.ps[qi].st!=='on')continue;   /* a lane that is already filled in lets it over */
      p.fill=p.fill||[0,0,0];p.fill[lane]++;pop(r.x,r.z,'Down the ditch!',false,.2);arsStop(a,r);if(p.fill[lane]>=ARS.ditchDepth){SG.att=a.side;SG.cause='roll';knock(p,qi,r.dx,r.dz,'roll',.04*u);settle(p,a.side);}return;}
    var li=-1,hy=-1;p.ps.forEach(function(q,j){if(q.st==='on'&&/\.log\./.test(q.id)&&q.wy>hy){hy=q.wy;li=j;}});if(li<0)continue;
    var lq=p.ps[li];lq.hits=(lq.hits|0)+1;pop(r.x,r.z,'Thunk!',false,.2);arsStop(a,r);if(lq.hits>=ARS.logDepth){SG.att=a.side;SG.cause='roll';knock(p,li,r.dx,r.dz,'roll',(.08+rand()*.05)*u);settle(p,a.side);}return;}}
/* a strong thump (qlvl 2) also shakes loose what only a heavy shake can: the planks of a wall with no brace, a gate's door and lintel, a Keep's braces with none to prop it. A brace piece holds all of it. */
function arsLoose(p,list,pos,Rq,a){var A=AMMO[a.ammo],W=A&&A.w;if(!W||!(W.qlvl>=2))return list;
  if(!a.qplan){   /* the strong thump takes the nearest loose parts first, across every piece, up to the weapon's cap */
    var cap=W.cap>0?W.cap:99,cand=[];
    SG.pieces.forEach(function(q){if(!q.built||q.down||!q.total||boxDist(q,pos[0],pos[2])>Rq*ARS.strongR)return;var k=q.kind,re=null;
      if(k==='wall'){if(!props(q).length)re=/plank/;}else if(k==='gate')re=/lintel|door/;else if(k==='tower'){if(!props(q).length)re=/^tower\.brace/;}
      if(re)q.ps.forEach(function(r,i){if(r.st==='on'&&re.test(r.id))cand.push({p:q.id,i:i,d:dist(r.wx,r.wz,pos[0],pos[2])});});});
    cand.sort(function(x,y){return x.d-y.d||x.p-y.p||x.i-y.i;});a.qplan={};cand.slice(0,cap).forEach(function(c){(a.qplan[c.p]||(a.qplan[c.p]=[])).push(c.i);});}
  var add=(a.qplan[p.id]||[]).filter(function(i){return list.indexOf(i)<0&&p.ps[i].st==='on';});return list.concat(add);}
/* ---- the fan's gust: a field that blows for a few seconds. It moves shots in the air, mice, loose parts and the cloth of a roof or a net, and does no damage by itself. ---- */
function arsMass(id){var A=AMMO[id],m=A&&A.w?A.w.mass:1;return m!==1?m:(ARS.massBy[id]||1);}
function arsLee(x,z,g){var u=U();for(var i=0;i<SG.pieces.length;i++){var p=SG.pieces[i];if((p.kind!=='heavy'&&p.kind!=='lowwall')||p.side===g.side||!p.built||p.down||p.parts<=0)continue;if(boxDist(p,x,z)<=(p.kind==='heavy'?ARS.leeHeavy:ARS.leeLow)*u)return true;}return false;}
function arsGustAt(a,pos){var W=AMMO[a.ammo].w,u=U(),dx=a.x1-a.x0,dz=a.z1-a.z0,l=Math.sqrt(dx*dx+dz*dz)||1;
  (SG.gusts||(SG.gusts=[])).push({x:pos[0],z:pos[2],r:W.gust*u,t0:SG.clock,age:0,life:W.gustSecs,dx:-dz/l,dz:dx/l,k:W.push,side:a.side,pm:{},blown:0,parts:0,cloth:0,shots:0});
  snd('whoosh');viewPuff(pos[0],pos[2],1.4);pop(pos[0],pos[2],'Gust!',false,.3);}
function arsBusy(){var G=SG.gusts;if(!G)return false;for(var i=0;i<G.length;i++)if(G[i].age<G[i].life)return true;return false;}
function arsTick(dt){var G=SG.gusts;if(!G||!G.length)return;var u=U();
  for(var gi=G.length-1;gi>=0;gi--){var g=G[gi],age;g.age+=dt;age=g.age;if(age>=g.life){G.splice(gi,1);continue;}   /* its age is counted in ticks, not read from the clock, so a gust lasts the same number of ticks whenever it is blown */
    var env=Math.min(1,age/.25,(g.life-age)/.5),sp=ARS.gustSpeed*u*g.k*env;
    SG.marbles.forEach(function(m){if(!m.live||m.rolling||m.t<0)return;var k=Math.min(1,m.t/m.T),pp=marblePos(m,k);if(dist(pp[0],pp[2],g.x,g.z)>=g.r||arsLee(pp[0],pp[2],g))return;
      var s=sp*dt*ARS.shotK/arsMass(m.ammo),sx=g.dx*s,sz=g.dz*s;m.x0+=sx;m.x1+=sx;m.z0+=sz;m.z1+=sz;if(m.fx!=null){m.fx+=sx;m.fz+=sz;}m.drift=(m.drift||0)+s;if(!m.gusted){m.gusted=1;g.shots++;}});
    SG.mice.forEach(function(m){if(m.side===g.side||m.state==='cheer')return;var key=m.side*10+m.i;if(dist(m.x,m.z,g.x,g.z)>=g.r||arsLee(m.x,m.z,g))return;var pm=g.pm[key]||0;if(pm>=ARS.pushMax*u)return;
      var st=sp*dt*.8;g.pm[key]=pm+st;m.x+=g.dx*st;m.z+=g.dz*st;var rr=Math.sqrt(m.x*m.x+m.z*m.z);if(rr>2.95){m.x*=2.95/rr;m.z*=2.95/rr;}m.slowT=Math.max(m.slowT||0,.8);m.slowK=.6;
      if(pm<.12*u&&g.pm[key]>=.12*u){g.blown++;SG.stats.blown=(SG.stats.blown|0)+1;}});
    SG.pieces.forEach(function(p){if(!p.built||p.down||!p.total)return;var ck=p.kind==='awning'||p.kind==='net';
      p.ps.forEach(function(q,i){if(q.st==='off'&&!q.used&&q.mender<0){if(dist(q.rx,q.rz,g.x,g.z)>=g.r||arsLee(q.rx,q.rz,g))return;var hv=/post|rail|leg|lintel|beam|block|peg|pole|base/.test(q.id);if(hv)return;var st=sp*dt*.5;q.rx+=g.dx*st;q.rz+=g.dz*st;if(!q.blown){q.blown=1;g.parts++;SG.stats.blownParts=(SG.stats.blownParts|0)+1;}}
        else if(ck&&q.st==='on'&&/cloth|mesh/.test(q.id)){if(dist(p.x,p.z,g.x,g.z)>=g.r+Math.max(FOOT[p.kind][0],FOOT[p.kind][1])||arsLee(p.x,p.z,g))return;q.rip=(q.rip||0)+dt*env*g.k;
          if(q.rip>=ARS.ripSecs){SG.att=g.side;SG.cause='gust';if(knock(p,i,g.dx,g.dz,'gust',.28*u)){g.cloth++;pop(q.wx,q.wz,'Blown off!',false,q.wy+.1);settle(p,g.side);}}}});});}}
/* ---- the price of the new numbers (wPrice adds this) ---- */
function arsPrice(w){return (w.line>0?.4:0)+(w.pierce>0?w.pierce*.8:0)+(w.gust>0?w.gust*3+w.gustSecs*.15:0)+((w.qlvl||1)>1?1.2:0);}
/* ---- sounds ---- */
SOUNDS.zip=function(){tone(900,.12,'sawtooth',.12,0,300);noise(.08,.3,0,3000);};
SOUNDS.rattle=function(){for(var i=0;i<5;i++)tone(150+i*20,.06,'square',.1,i*.05,110);noise(.3,.18,0,500);};
SOUNDS.pop=function(){tone(700,.08,'triangle',.2,0,1500);noise(.05,.25,0,2500);};
SOUNDS.thrum=function(){tone(220,.4,'triangle',.18,0,330);tone(440,.3,'sine',.1,.02,660);};
SOUNDS.boom=function(){tone(70,.5,'sine',.5,0,32);noise(.25,.45,0,160);};
SOUNDS.whoosh=function(){noise(.7,.4,0,700);tone(300,.6,'sine',.06,0,500);};
/* ---- the seven families ---- */
var ARS_W=[
  {id:'flinger',name:'Flat flinger',icon:'🥎',tint:0xffd23a,scale:.9,sfx:'zip',note:'Straight, low and fast. Punches through a thin wall or gate; stopped by a thick board. Needs a clear line.',w:{blast:.22,cap:4,falloff:.6,leg:true,flat:true,line:1,arc:[0,0],speed:2,pierce:1,dizzyR:.12,mass:1.4}},
  {id:'roller',name:'Roller (acorn drum)',icon:'🌰',tint:0x9c6b30,scale:1.5,sfx:'rattle',note:'Lands short, then rolls along the ground, knocking parts off at the base. A ditch or a log barrier stops it.',w:{blast:.08,roll:2.4,dizzyR:.1,cd:2,mass:1.5}},
  {id:'popper',name:'Scatter popper',icon:'📿',tint:0xe05fa8,scale:.55,sfx:'pop',note:'Eight beads in a wide cloud: light damage, slows mice. A net catches them; a roof blunts them.',w:{blast:.14,cap:2,scatter:8,spread:.55,dizzyR:0,splash:.2,slowTo:.5,slowSecs:4,speed:1.1,arc:[.3,.24],cd:2,mass:.4}},
  {id:'hook',name:'Tether hook',icon:'🪝',tint:0xe8c070,scale:1.1,sfx:'thrum',note:'Hooks the first part it passes and yanks it toward the gun. A cutter post cuts the string; a net catches it.',w:{blast:.05,tether:1.6,cd:3,speed:1.2,arc:[.3,.24],mass:.8}},
  {id:'thumper',name:'Thumper',icon:'🥁',tint:0x6a6f78,scale:2,sfx:'boom',note:'A heavy ball that shakes the ground: planks, doors and braces with nothing extra holding them shake loose. An extra brace holds.',w:{blast:0,leg:false,quake:.9,qlvl:2,cap:7,dizzyR:.3,cd:3,speed:.9,mass:2.2}},
  {id:'fan',name:'Fan (gust)',icon:'🌬️',tint:0xbfe8ff,scale:1.6,sfx:'whoosh',note:'No damage by itself. Leaves a gust that blows mice, loose parts and shots sideways, and tears the cloth off a roof or a net. A heavy block shelters.',w:{blast:0,gust:.9,gustSecs:5,push:1,dizzyR:0,cd:4,mass:.5}}];
function arsInstall(d){AMMO[d.id]={name:d.name,icon:d.icon,short:d.name.split(' ')[0].slice(0,9),tint:d.tint,scale:d.scale,sfx:d.sfx,w:wClamp(Object.assign(wCopy(WDEF),d.w)).w,arsenal:true,maker:'the Arsenal'};SG.sides.forEach(function(sd){if(sd.cd)sd.cd[d.id]=0;});
  if(typeof LAB_RAMMO!=='undefined')LAB_RAMMO[d.id]=d.tint;}
function arsRemove(d){delete AMMO[d.id];var L=SG.lab;if(L&&L.ammo===d.id)SG.labSetAmmo('marble');}
LAB_PROTOS.arsenal={name:'Arsenal: six more weapon families',note:'Flat flinger, Roller, Scatter popper, Tether hook, Thumper and Fan join the ammo row (the Lobber is the Marble on a high lob). Counter pieces are always in the Build bar.',on:function(){ARS_W.forEach(arsInstall);},off:function(){ARS_W.forEach(arsRemove);}};
SG.arsWeapons=ARS_W;
/* ---- the counter pieces in the Lab: icons, names, prices ---- */
(function(){var ic={awning:'⛱️',shield:'🛡️',ditch:'🕳️',logs:'🪵',net:'🥅',cutter:'✂️',heavy:'🧱',lowwall:'▭'},nm={awning:'Roof (awning)',shield:'Shield board',ditch:'Ditch',logs:'Log barrier',net:'Net',cutter:'Cutter post',heavy:'Heavy block',lowwall:'Low wall',brace:'Brace'};
  for(var k in ic)LAB_ICON[k]=ic[k];for(k in nm)LAB_NAME[k]=nm[k];})();
/* ---- the test camp, and the camps with each counter ---- */
/* Where things stand along the camp's line (z toward the back of the camp), from the Keep outward. Every camp uses the same places, so the only difference between two camps is the counter. */
function arsLayout(){var F=FOOT,g=.03,o={keep:2.55};o.awning=o.keep-F.tower[1]-g-F.awning[1];o.row=o.awning-F.awning[1]-g-F.gate[1];o.shield=o.row-F.gate[1]-g-F.shield[1];o.logs=o.shield-F.shield[1]-g-F.logs[1];o.ditch=o.logs-F.logs[1]-g-F.ditch[1];o.front=o.ditch-F.ditch[1];return o;}
SG.arsLayout=arsLayout;
var ARS_CAMPS=[['bare','No counter'],['roof','Roof'],['shield','Shield board'],['ground','Ditch + log barrier'],['net','Net'],['cutter','Cutter post'],['brace','Extra braces'],['heavy','Heavy block + low wall'],['all','Every counter']];
/* the same camp every time: a Keep behind a gate and two walls, a tent and a workshop to the sides. The mice rest in a row beside the Keep. */
function arsCamp(id,s){var F=FOOT,Y=arsLayout(),T=PI,x=F.gate[0]+F.wall[0]+.01,l=[['tower',0,Y.keep,T],['gate',0,Y.row,T],['wall',-x,Y.row,T],['wall',x,Y.row,T],['tent',F.tent[0]+1.0,Y.keep-.1,T],['workshop',-(F.workshop[0]+1.0),Y.keep-.1,T]],all=id==='all',bx=F.tower[0]+F.brace[1]+.015;
  /* id: a camp of the matrix, or one counter alone (ditch, logs, awning, ..., lowwall) */
  var has=function(k){return all||id===k||(id==='roof'&&k==='awning')||(id==='ground'&&(k==='ditch'||k==='logs'))||(id==='heavy'&&(k==='heavy'||k==='lowwall'));};
  if(has('awning'))l.push(['awning',0,Y.awning,T]);
  if(id==='net')l.push(['net',0,Y.awning,T]);else if(all)l.push(['net',-(F.awning[0]+F.net[0]+.04),Y.awning,T]);
  if(has('shield'))l.push(['shield',0,Y.shield,T]);
  if(has('logs'))l.push(['logs',0,Y.logs,T]);if(has('ditch'))l.push(['ditch',0,Y.ditch,T]);
  if(has('cutter'))l.push(['cutter',F.cutter[0]*1.2,Y.front-.22,T]);
  if(id==='brace'||all){l.push(['brace',bx,Y.keep,PI/2]);var by=Y.row+F.wall[1]+F.brace[1]+.012,bw=x+F.wall[0]-F.brace[0]-.02;l.push(['brace',-bw,by,0]);l.push(['brace',bw,by,0]);}
  if(has('heavy'))l.push(['heavy',bx+F.brace[1]+F.heavy[0]+.03,Y.keep-.03,T]);if(has('lowwall'))l.push(['lowwall',-(F.lowwall[0]+.28),Y.keep+.01,T]);
  return labCampRecs(s,l);}
SG.arsCamp=arsCamp;
(function(){ARS_CAMPS.forEach(function(c){LAB_TARGETS.push(['ars_'+c[0],'Arsenal: '+c[1]]);});})();
/* ---- the counter matrix ---- */
/* the seven families, what each fires and where it aims (camp frame: x across, z along the camp, the Keep at ARS layout .keep) */
var ARS_LANE={roller:.2};
var ARS_FAMS=[
  {id:'lobber',name:'Lobber',ammo:'marble',aim:function(Y){return [0,Y.keep];}},
  {id:'flinger',name:'Flat flinger',ammo:'flinger',aim:function(Y){return [0,Y.keep];}},
  {id:'roller',name:'Roller',ammo:'roller',aim:function(Y){return [ARS_LANE.roller,Y.front-.1];}},
  {id:'popper',name:'Scatter popper',ammo:'popper',aim:function(Y){return [0,Y.keep];}},
  {id:'hook',name:'Tether hook',ammo:'hook',aim:function(Y){return [0,Y.row];}},
  {id:'thumper',name:'Thumper',ammo:'thumper',aim:function(Y){return [0,(Y.row+Y.keep)/2];}},
  {id:'fan',name:'Fan',ammo:'fan',aim:function(Y){return [0,Y.keep-.1];}}];
var ARS_EXTRA=[{id:'lobhigh',name:'Lobber, high lob (variant)',ammo:'marble',high:true,aim:function(Y){return [0,Y.keep];}}];   /* not a family: the Marble lobbed high, which clears a wall but carries half the blast */
/* a volley: ARS_SHOTS shots at the aim spot and round it (the first of the range report's carpet), nothing mended; the same volley at ARS_SEEDS seeds, and the cell is the mean. The points: a part of the camp 1, a collapse 3, a Keep felled 10, a mouse dizzy, slowed or blown .25. What the counters lose is shown beside the points (wear) and is not counted: a counter is there to be hit. */
var ARS_COUNTERED=40,ARS_SHOTS=5,ARS_SEEDS=4,ARS_N=0,ARS_NS=0,ARS_SCORE={part:1,collapse:3,keep:10,mouse:.25};
function arsVolley(fam,recs,spotFn,seed){var L=SG.lab,u=U();labSetSide(1,recs,true);SG.marbles=[];SG.debris=[];SG.fuses=[];SG.puddles=[];SG.gusts=[];SG.acc=0;SG.step(.1);
  var st0={d:SG.stats.dizzies,c:SG.stats.collapses,b:SG.stats.blown|0,bp:SG.stats.blownParts|0,ca:SG.stats.caught|0,cu:SG.stats.cuts|0},slowed={},sp=spotFn();
  L.ammo=fam.ammo;L.high=!!fam.high;SG.sides.forEach(function(sd){sd.ammo=fam.ammo;sd.high=!!fam.high;});
  for(var i=0;i<(ARS_N||ARS_SHOTS);i++){SG.topN=0;var of=LAB_CARPET[i%LAB_CARPET.length];var sh=SG.labFire(0,'gun',sp.x+of[0]*u,sp.z+of[1]*u,{force:true,seed:seed+i});if(!sh)continue;var t=0;
    while(t<14){SG.step(STEP);t+=STEP;SG.mice.forEach(function(m){if(m.side===1&&m.slowT>0)slowed[m.i]=1;});if(L.cur&&L.cur.done&&!arsBusy())break;}}
  var camp=0,ctr=0,keep=0,i2;
  SG.pieces.forEach(function(p){if(p.side!==1||!p.total)return;if(p.down){keep++;return;}var off=p.ps.filter(function(q){return q.st!=='on';}).length;if(ARS.counters.indexOf(p.kind)>=0)ctr+=off;else camp+=off;});
  var col=SG.stats.collapses-st0.c,nsl=Object.keys(slowed).length,bl=(SG.stats.blown|0)-st0.b,dz=SG.stats.dizzies-st0.d,mice=dz+nsl+bl;
  return {camp:camp,counter:ctr,collapses:col,keep:keep,dizzy:dz,slowed:nsl,blown:bl,blownParts:(SG.stats.blownParts|0)-st0.bp,caught:(SG.stats.caught|0)-st0.ca,cut:(SG.stats.cuts|0)-st0.cu,mice:mice,
    score:camp*ARS_SCORE.part+col*ARS_SCORE.collapse+keep*ARS_SCORE.keep+mice*ARS_SCORE.mouse};}
function arsMean(list){var o={},n=list.length;Object.keys(list[0]).forEach(function(k){var t=0;list.forEach(function(r){t+=r[k];});o[k]=Math.round(t/n*100)/100;});return o;}
function arsCell(fam,campId,seed){var Y=arsLayout(),ax=fam.aim(Y),w=w2(1,ax[0],ax[1]),out=[];
  for(var k=0;k<(ARS_NS||ARS_SEEDS);k++)out.push(arsVolley(fam,arsCamp(campId,1),function(){return {x:w[0],z:w[1]};},seed+k*100));return arsMean(out);}
/* the stock camps a weapon is strong against (no counters in them) */
var ARS_STOCK=['walled','braced','longwall','workshops','glass','village'];
function arsStockCell(fam,tid,seed){var out=[],recs=labTemplate(tid,1);
  for(var k=0;k<(ARS_NS||ARS_SEEDS);k++)out.push(arsVolley(fam,recs.map(function(r){return Object.assign({},r);}),function(){labSetSide(1,recs.map(function(r){return Object.assign({},r);}),true);var sp=SG.labDefaultSpot(),front=9;
    SG.pieces.forEach(function(p){if(p.side===1&&p.built)front=Math.min(front,Math.abs(p.z));});return fam.id==='roller'?{x:sp.x-ARS_LANE.roller,z:-(Math.max(.9,front-.5))}:sp;},seed+k*100));return arsMean(out);}
/* SG.labMatrix(): every weapon at every camp. Returns the table and a verdict per weapon. */
/* one cell, for the tests: a weapon family (or the variant) at a camp or a single counter */
SG.labMatrixCell=function(famId,campId,o){var L=SG.lab;if(!L)return null;o=o||{};var wasOn=!!LAB_FLAGS.arsenal,wasTop=L.topple;if(!wasOn)SG.setProto('arsenal',true,false);var out;
  try{L.topple=false;ARS_N=o.shots||0;ARS_NS=o.seeds||0;out=labSandbox(function(){var f=ARS_FAMS.concat(ARS_EXTRA).filter(function(q){return q.id===famId;})[0];return arsCell(f,campId,LAB_SEED);});}finally{SG.gusts=[];ARS_N=ARS_NS=0;L.topple=wasTop;if(!wasOn)SG.setProto('arsenal',false,false);}
  return out;};
SG.labMatrix=function(o){var L=SG.lab;if(!L)return null;o=o||{};var wasOn=!!LAB_FLAGS.arsenal,wasTop=L.topple;if(!wasOn)SG.setProto('arsenal',true,false);
  var res;try{L.topple=false;ARS_N=o.shots||0;ARS_NS=o.seeds||0;res=labSandbox(function(){var out={shots:ARS_N||ARS_SHOTS,seeds:ARS_NS||ARS_SEEDS,seed:LAB_SEED,scale:SG.pieceSize,camps:ARS_CAMPS.map(function(c){return {id:c[0],name:c[1]};}),prices:{},weapons:[],score:ARS_SCORE,stock:ARS_STOCK.map(function(t){return {id:t,name:labTargetName(t)};})};
    ARS_CAMPS.forEach(function(c){var recs=arsCamp(c[0],1),k=0;recs.forEach(function(r){if(ARS.counters.indexOf(r.kind)>=0)k+=(C2.cost[r.kind]==null?1:C2.cost[r.kind]);});out.prices[c[0]]=k;});
    (o.fams||ARS_FAMS.concat(ARS_EXTRA)).forEach(function(fam){var A=AMMO[fam.ammo],row={id:fam.id,name:fam.name,ammo:fam.ammo,price:wPrice(A.w),cells:{},stock:{}};
      ARS_CAMPS.forEach(function(c){row.cells[c[0]]=arsCell(fam,c[0],LAB_SEED);});
      if(!o.noStock)ARS_STOCK.forEach(function(t){row.stock[t]=arsStockCell(fam,t,LAB_SEED);});
      var B=row.cells.bare.score;row.reduction={};ARS_CAMPS.forEach(function(c){if(c[0]!=='bare')row.reduction[c[0]]=B>0?Math.round((1-row.cells[c[0]].score/B)*100):0;});
      var best=null,list=[];ARS_CAMPS.forEach(function(c){if(c[0]==='bare'||c[0]==='all')return;if(!best||row.reduction[c[0]]>row.reduction[best])best=c[0];if(B>0&&row.reduction[c[0]]>=ARS_COUNTERED)list.push(c[0]);});list.sort(function(x,y){return row.reduction[y]-row.reduction[x];});row.counteredBy=list;row.bestCounter=best;
      var sb=null;Object.keys(row.stock).forEach(function(t){if(!sb||row.stock[t].score>row.stock[sb].score)sb=t;});row.strongVs=sb;
      var nm=function(id){return ARS_CAMPS.filter(function(c){return c[0]===id;})[0][1];};
      row.verdict=(list.length?'countered by '+list.map(function(id){return nm(id)+' ('+row.reduction[id]+'% less)';}).join(', '):'no single counter cuts it by '+ARS_COUNTERED+'%'+(best?' (best: '+nm(best)+', '+row.reduction[best]+'%)':''))+(sb?'; strong vs '+labTargetName(sb)+' ('+row.stock[sb].score+' points)':'')+(B<=0?' [does nothing to the bare camp]':'');
      out.weapons.push(row);});
    return out;});}finally{SG.gusts=[];ARS_N=ARS_NS=0;L.topple=wasTop;if(!wasOn)SG.setProto('arsenal',false,false);}
  return res;};

/* ================= DEFENCES (Lab prototype "Defences"; in a match only with ?defence=front|far|both) =================
   Harry, 21 Nov: defences only absorbed hits, so a fortified camp did not pay. These make the attacker pay. Everything here is behind the flag DEF.on:
   with it off nothing in this section runs (the small hooks elsewhere are all `if(DEF.on)` or `if(DEF.match)`). LAB.md says how to use it.
   Items are small things on the table, not pieces: they have no parts and cannot be knocked off (a blast makes their crew mouse dizzy, and a dizzy crew mouse does not fire).
   POSTS (a crew mouse stands at the slot behind the post; no crew, no fire): Pop-gun (fast, short range: knocks the other side's mice back, swats small rolling shots),
   Slinger (slow, long range: knocks a shell out of the air, lobs a marble at a lobber, stops a roller), Counter-lobber (lobs back at the lobber it saw fire, only between a minimum and a maximum range).
   UPKEEP: every post has ammo and a jam meter. It jams after N shots unless its crew oils it in the lulls; restock is a mouse trip (or build points). A sprung trap is set again by a mouse.
   TRAPS (the builder sees them; the attacker does not until they spring): spring plank, glue puddle, rolling log, trip cord, snap board. One use.
   WARDEN: a mender mouse on a wall section who mends one part every few seconds when it is calm.
   Post ranges are in table units (the camps do not shrink with the pieces); blast reaches, knocks and trap reaches follow the piece scale (U()). */
var DEF={on:false,match:false,fort:[false,false],items:[],saved:[[],[]],sel:0,view:'builder',next:1,logs:[],pend:[],seen:[[],[]],stats:null,spent:[0,0],t:0,at:0,crewAuto:true,arsOwn:false,kind:'',test:null};
SG.def=DEF;
function CD(){return CONFIG.defence;}
function defStats(){return {pops:0,swats:0,lobs:0,intercepts:0,stops:0,counters:0,counterHits:0,sprung:0,flung:0,stunned:0,glued:0,logged:0,crates:0,repairs:0,restocks:0,resets:0,jams:0,gunLost:0};}
DEF.stats=defStats();
var DK={pop:{name:'Pop-gun post',icon:'🔫',cat:'post',tip:'Fast, short range. Knocks the other side\'s mice back and swats small rolling shots.'},
  sling:{name:'Slinger post',icon:'🥏',cat:'post',tip:'Slow, long range. Knocks a shell out of the air, lobs a marble at a lobber, stops a roller.'},
  counter:{name:'Counter-lobber',icon:'🎯',cat:'post',tip:'Lobs back at the lobber it saw fire. Only between its minimum and maximum range.'},
  spring:{name:'Spring plank',icon:'⤴️',cat:'trap',tip:'Flings a mouse back toward its own camp.'},
  glue:{name:'Glue puddle',icon:'🍯',cat:'trap',tip:'Slows every mouse that walks in it.'},
  log:{name:'Rolling log',icon:'🪵',cat:'trap',tip:'Rolls along a lane and knocks mice dizzy.'},
  cord:{name:'Trip cord',icon:'🧵',cat:'trap',tip:'Drops a crate on the mice that trip it.'},
  snap:{name:'Snap board',icon:'🪤',cat:'trap',tip:'Stuns mice for a moment.'},
  warden:{name:'Mender (wall)',icon:'🛠️',cat:'warden',tip:'A mender mouse on a wall section. Mends one part every few seconds when it is calm.'}};
var DK_ORDER=['pop','sling','counter','spring','glue','log','cord','snap','warden'];
SG.defKinds=DK;SG.defOrder=DK_ORDER;
function defNew(kind,s,x,z){var K=DK[kind],C=CD()[kind],it={id:DEF.next++,kind:kind,cat:K.cat,side:s,x:x,z:z,crewM:-1,ammo:K.cat==='post'?C.ammo:0,jam:0,jammed:false,cd:.6,cdS:0,calm:0,manned:false,sprung:false,rst:false,fetch:false,rep:0,idle:0,n:{shots:0,hits:0,swat:0,sprung:0,restocks:0,jams:0,repairs:0}};return it;}
function defRec(it){return {kind:it.kind,side:it.side,x:+it.x.toFixed(4),z:+it.z.toFixed(4)};}
function defById(id){for(var i=0;i<DEF.items.length;i++)if(DEF.items[i].id===id)return DEF.items[i];return null;}
function defCrewMouse(it){return it.crewM>=0?SG.mice[it.side*5+it.crewM]:null;}
function defCost(kind){var c=CD().cost[kind];return c==null?1:c;}
function defCostOf(s){var t=0;DEF.items.forEach(function(it){if(it.side===s)t+=defCost(it.kind);});return Math.round(t*100)/100;}
/* the slot a crew mouse stands in: just behind the post, away from the hill */
function defSlot(it){var h=hillAt(),dx=it.x-h.x,dz=it.z-h.z,l=Math.sqrt(dx*dx+dz*dz)||1,o=.15*U();return [it.x+dx/l*o,it.z+dz/l*o];}
/* the wall or gate a warden stands by */
function defWallAt(s,x,z){var best=null,bd=.45*U();SG.pieces.forEach(function(p){if(p.side!==s||!p.built||p.down||(p.kind!=='wall'&&p.kind!=='gate'))return;var d=boxDist(p,x,z);if(d<bd){bd=d;best=p;}});return best;}
function defSideAt(x,z){var a=baseOf(0),b=baseOf(1);return dist(x,z,a.x,a.z)<=dist(x,z,b.x,b.z)?0:1;}
/* may this go here? {ok, text, x, z} (a warden snaps to its wall) */
function defCheck(kind,s,x,z){var K=DK[kind];if(!K)return {ok:false,code:'kind',text:'Not an item I know'};
  if(Math.sqrt(x*x+z*z)>3.0)return {ok:false,code:'edge',text:'Too near the edge of the table'};
  if(K.cat==='warden'){var w=defWallAt(s,x,z);if(!w)return {ok:false,code:'wall',text:'Tap a wall or a gate of this camp'};
    for(var j=0;j<DEF.items.length;j++)if(DEF.items[j].kind==='warden'&&DEF.items[j].side===s&&dist(DEF.items[j].x,DEF.items[j].z,w.x,w.z)<.05)return {ok:false,code:'dup',text:'That section has a mender already'};return {ok:true,x:w.x,z:w.z};}
  var u=U(),rr=(K.cat==='post'?.1:.04)*u;
  for(var i=0;i<SG.pieces.length;i++){var p=SG.pieces[i];if(p.built&&!p.down&&boxDist(p,x,z)<rr)return {ok:false,code:'overlap',text:'A piece is in the way'};}
  for(var k=0;k<DEF.items.length;k++){var o=DEF.items[k];if(o.kind!=='warden'&&dist(o.x,o.z,x,z)<.15*u)return {ok:false,code:'close',text:'Too close to another item'};}
  return {ok:true,x:x,z:z};}
/* add one (the Lab's Build, a bot's purchase, a test) */
function defAdd(kind,s,x,z){var c=defCheck(kind,s,x,z);if(!c.ok)return c;var it=defNew(kind,s,c.x,c.z);DEF.items.push(it);DEF.saved[s].push(defRec(it));return {ok:true,item:it};}
function defRemove(it){var i=DEF.items.indexOf(it);if(i<0)return false;DEF.items.splice(i,1);var m=defCrewMouse(it);if(m&&m.dj&&m.dj.id===it.id){m.dj=null;m.dat=false;}
  var sv=DEF.saved[it.side];for(var k=0;k<sv.length;k++)if(sv[k].kind===it.kind&&Math.abs(sv[k].x-it.x)<.001&&Math.abs(sv[k].z-it.z)<.001){sv.splice(k,1);break;}if(DEF.sel===it.id)DEF.sel=0;return true;}
/* one side's items back to the intact list (a camp rebuilt, or reset): full ammo, no jam, traps set */
function defSideReset(s){DEF.items=DEF.items.filter(function(i){return i.side!==s;}).concat(DEF.saved[s].map(function(r){return defNew(r.kind,s,r.x,r.z);}));
  SG.mice.forEach(function(m){if(m.side===s&&m.dj&&m.dj.k!=='raid'){m.dj=null;m.dat=false;}});DEF.logs=DEF.logs.filter(function(g){return g.side!==s;});DEF.seen[s]=[];DEF.sel=0;}
function defClear(){DEF.items=[];DEF.saved=[[],[]];DEF.logs=[];DEF.pend=[];DEF.seen=[[],[]];DEF.stats=defStats();DEF.spent=[0,0];DEF.sel=0;DEF.t=0;DEF.at=0;DEF.test=null;if(SG.mice)SG.mice.forEach(function(m){m.dj=null;m.dat=false;});}
function defOff(){delete LAB_FLAGS.defences;if(!DEF.on&&!DEF.match&&!DEF.arsOwn)return;if(DEF.arsOwn){ARS_W.forEach(arsRemove);DEF.arsOwn=false;}DEF.on=false;DEF.match=false;DEF.fort=[false,false];defClear();SG.gusts=[];if(SG.sides)SG.sides.forEach(function(sd){sd.defRot=0;});}
function defSnap(){if(!DEF.on)return null;return {items:DEF.items.map(function(i){return Object.assign({},i,{n:Object.assign({},i.n)});}),saved:[DEF.saved[0].slice(),DEF.saved[1].slice()],next:DEF.next,sel:DEF.sel};}
function defRestore(sn){if(!DEF.on||!sn)return;DEF.items=sn.items.map(function(i){var c=Object.assign({},i,{n:Object.assign({},i.n)});c.crewM=-1;c.manned=false;c.fetch=false;c.rst=false;return c;});DEF.saved=[sn.saved[0].slice(),sn.saved[1].slice()];DEF.next=sn.next;DEF.sel=sn.sel;DEF.logs=[];DEF.pend=[];DEF.seen=[[],[]];
  SG.mice.forEach(function(m){m.dj=null;m.dat=false;});}
/* what was lobbed, for a counter-lobber to see */
function defSeen(s,l,a){var en=1-s,list=DEF.seen[en];list.push({x:l.x,z:l.z,t:SG.clock,gun:l.id===-7,s:s,taken:false});if(list.length>8)list.shift();}

/* ---- mice: crew, upkeep and warden jobs. m.dj = {k:'crew'|'warden'|'restock'|'reset'|'raid', id, ...}. A mouse with a job is not free for anything else. ---- */
function defGo(m,dt,tx,tz,slack){goTo(m,tx,tz,slack);m.crewGoal=true;var ar=walk(m,dt,WALK()*(SG.sides[m.side].team==='red'&&SG.mode!=='lab'?C2.redWalk:1)*slowOf(m));if(ar){m.state='hold';m.goal=false;m.speed=0;}else{m.state='go';m.goal=m.q<=0;}m.crewing=false;return ar;}
function defStore(s){var w=w2(s,.3,2.45);return isOpen(s,w[0],w[1])?w:nearFree(s,w[0],w[1]);}
function defMouse(m,dt){var j=m.dj;if(!j||SG.phase==='over')return false;m.dat=false;var it=j.k==='raid'?null:defById(j.id),C=CD(),h=hillAt();
  if(j.k!=='raid'&&!it){m.dj=null;return false;}
  if(j.k==='crew'){var sl=defSlot(it),ar=defGo(m,dt,sl[0],sl[1],C.crewReach);if(ar||dist(m.x,m.z,sl[0],sl[1])<C.crewReach){m.dat=true;m.rot=Math.atan2(h.x-m.x,h.z-m.z);}return true;}
  if(j.k==='warden'){var wp=defWallAt(it.side,it.x,it.z);if(!wp){m.state='hold';return true;}var ws=workSpot(wp,m),ar2=defGo(m,dt,ws[0],ws[1],.35);if(ar2||dist(m.x,m.z,ws[0],ws[1])<.4){m.dat=true;m.rot=Math.atan2(wp.x-m.x,wp.z-m.z);}return true;}
  if(j.k==='restock'){it.fetch=true;if(!j.ph){var sp=defStore(m.side);if(defGo(m,dt,sp[0],sp[1],.3)){j.t=(j.t||0)+dt;m.act=.2;if(j.t>=C.fetchSecs){j.ph=1;j.t=0;}}else j.t=0;}
    else{var sl2=defSlot(it);if(defGo(m,dt,sl2[0],sl2[1],.3)){j.t+=dt;m.act=.3;m.rot=Math.atan2(it.x-m.x,it.z-m.z);if(j.t>=C.restockSecs){it.ammo=C[it.kind].ammo;it.fetch=false;it.n.restocks++;DEF.stats.restocks++;pop(it.x,it.z,'Restocked',true,.3,it.side);snd('mend');m.dj=j.then||null;m.dat=false;}}}
    return true;}
  if(j.k==='reset'){it.rst=true;if(defGo(m,dt,it.x,it.z,.2)){j.t=(j.t||0)+dt;m.act=.3;if(j.t>=C.resetSecs){it.sprung=false;it.rst=false;DEF.stats.resets++;pop(it.x,it.z,'trap set',true,.3,it.side);m.dj=null;}}return true;}
  if(j.k==='raid'){var p=raidTarget(m);if(!p){m.state='hold';return true;}var sp2=defGo(m,dt,p.x,p.z,.8);m.dat=sp2;
    if(m.cd<=0&&boxDist(p,m.x,m.z)<=C2.raidReach*U()){var i=raidPart(p,m,false);if(i>=0){SG.att=m.side;SG.cause='raid';knock(p,i,p.x-m.x,p.z-m.z,'raid',.2*U());settle(p,m.side);SG.stats.raidPulls++;j.pulls=(j.pulls|0)+1;m.cd=C2.raidEvery;m.act=.7;m.rot=Math.atan2(p.x-m.x,p.z-m.z);}}return true;}
  return false;}
/* every half second: crew the posts, put a mender on each wall section, and send mice to restock and to set traps */
function defAssign(s){var C=CD(),side=SG.sides[s];if(!side)return;
  SG.mice.forEach(function(m){if(m.side===s&&m.dj&&m.dj.k!=='raid'&&!defById(m.dj.id)){m.dj=null;m.dat=false;}});
  function freeMice(){return SG.mice.filter(function(m){return m.side===s&&!m.dj&&m.state!=='dizzy'&&isFree(m)&&m.part<0&&!crewOf(m)&&!(SG.mode==='lab'&&(m.state==='toMat'||m.state==='carry'||m.state==='hammer'));});}
  var lab=SG.mode==='lab';if(lab&&!DEF.crewAuto)return;
  var its=DEF.items.filter(function(i){return i.side===s;});
  its.forEach(function(it){if(it.cat==='trap')return;var cm=defCrewMouse(it);if(cm&&cm.dj&&cm.dj.id===it.id)return;it.crewM=-1;
    var fm=freeMice(),best=null,bv=1e9,sl=it.cat==='post'?defSlot(it):[it.x,it.z];
    fm.forEach(function(m){var rk=C.botCrew.indexOf(m.role||'hill');if(rk<0)rk=9;var v=(lab||SG.mode==='lab'?0:rk*10)+dist(m.x,m.z,sl[0],sl[1]);if(v<bv){bv=v;best=m;}});
    if(best){best.dj={k:it.cat==='warden'?'warden':'crew',id:it.id};best.dat=false;it.crewM=best.i;}});
  var upkeep=function(it,k,then){var fm=freeMice().filter(function(m){return SG.mode==='lab'||SG.phase==='mend'||m.role==='mend'||freeMice().length>1;}),best=null,bd=1e9;
    fm.forEach(function(m){var d=dist(m.x,m.z,it.x,it.z);if(d<bd){bd=d;best=m;}});if(best){best.dj={k:k,id:it.id,t:0};best.dat=false;return true;}return false;};
  its.forEach(function(it){if(it.cat==='post'&&it.ammo<=0&&!it.fetch){if(!upkeep(it,'restock')){var cm=defCrewMouse(it);if(cm&&cm.dat&&cm.dj&&cm.dj.k==='crew'&&it.idle>2){cm.dj={k:'restock',id:it.id,t:0,then:{k:'crew',id:it.id}};cm.dat=false;}}}
    else if(it.cat==='trap'&&it.sprung&&!it.rst)upkeep(it,'reset');});}
function defCalm(s,x,z){var C=CD().repair,u=U(),lh=SG.lastHit;if(lh&&SG.clock-lh.t<C.calmSecs&&dist(lh.x,lh.z,x,z)<C.calmR*u)return false;
  for(var i=0;i<SG.mice.length;i++){var m=SG.mice[i];if(m.side!==s&&m.state!=='dizzy'&&dist(m.x,m.z,x,z)<C.calmR*u)return false;}return true;}
function defMend(p,i){var q=p.ps[i];q.st='on';q.used=true;q.mender=-1;p.parts++;SG.stats.partsMended++;gridDirty=true;snd('mend');event('mend',p.side,q.id);pop(q.wx,q.wz,'+1 '+partName(q.id),true,q.wy+.15);viewFlash(q.wx,q.wy,q.wz);fixGrid();}

/* ---- the posts ---- */
function defCork(x0,z0,x1,z1){SG.corks.push({id:SG.nextId++,x0:x0,z0:z0,x1:x1,z1:z1,t:0});}
/* a real marble from a post: it flies, lands and blasts like any other (the same landV2) */
function defShell(it,tx,tz,r){var u=U(),C=CD()[it.kind],dx=tx-it.x,dz=tz-it.z,d=Math.max(.3,Math.sqrt(dx*dx+dz*dz));if(C.over){tx+=dx/d*C.over*u;tz+=dz/d*C.over*u;}   /* aim a little past the target so the shell comes down on it, not on its near edge */
  var a={rb:(C.r||0)*u,x0:it.x,y0:.4*u,z0:it.z,x1:tx,z1:tz,h:C2.arcHigh[0]*u+d*C2.arcHigh[1],T:.65+d*.17,from:0,hit:null,high:false,fx:tx,fz:tz,li:0,ammo:'marble',side:it.side,id:SG.nextId++,t:0,live:true,tw:0,sx:it.x,sz:it.z,k0:.3,def:it.id};SG.marbles.push(a);snd('twang');return a;}
function defFlyPos(a){return marblePos(a,Math.min(1,a.t/a.T));}
function defPostFire(it,m){var C=CD()[it.kind],u=U(),en=1-it.side,x=it.x,z=it.z,i,a,best=null,bd,mn=C.min,mx=C.max;if(it.kind!=='pop'&&it.cd>0)return false;
  function spend(){it.ammo--;it.n.shots++;it.jam+=1/C.jamAfter;if(it.jam>=1){it.jam=1;it.jammed=true;it.n.jams++;DEF.stats.jams++;pop(it.x,it.z,'Jammed!',false,.35,it.side);}it.cd=C.every;m.act=.45;}
  if(it.kind==='pop'){
    for(i=0;it.cdS<=0&&i<SG.marbles.length;i++){a=SG.marbles[i];if(!a.rolling||a.side===it.side)continue;var rp=a.rm||a.rl;if(!rp)continue;var d=dist(x,z,rp.x,rp.z);if(d>mx)continue;
      if(a.rm)a.rm.E=0;else a.rl.left=0;it.ammo--;it.n.shots++;it.n.swat++;it.n.hits++;it.jam+=1/C.jamAfter;if(it.jam>=1){it.jam=1;it.jammed=true;it.n.jams++;DEF.stats.jams++;}it.cdS=C.swatEvery;m.act=.3;DEF.stats.swats++;defCork(x,z,rp.x,rp.z);pop(rp.x,rp.z,'Swatted!',true,.2,it.side);snd('tap');viewPuff(rp.x,rp.z,.5);return true;}
    if(it.cd>0)return false;
    bd=mx;SG.mice.forEach(function(o){if(o.side!==en||o.state==='dizzy')return;var d=dist(x,z,o.x,o.z);if(d<bd&&d>=mn&&sightClear(x,z,o.x,o.z)){bd=d;best=o;}});
    if(best){var dx=best.x-x,dz=best.z-z,l=Math.sqrt(dx*dx+dz*dz)||1,nx=best.x+dx/l*C.knock*u,nz=best.z+dz/l*C.knock*u;if(isOpen(best.side,nx,nz)){best.x=nx;best.z=nz;}
      best.slowT=Math.max(best.slowT||0,C.slow);best.slowK=C.slowTo;spend();it.n.hits++;DEF.stats.pops++;defCork(x,z,best.x,best.z);m.rot=Math.atan2(dx,dz);snd('tap');viewPuff(best.x,best.z,.4);return true;}
    return false;}
  if(it.kind==='sling'){
    var fb=null;bd=1e9;SG.marbles.forEach(function(q){if(!q.live||q.rolling||q.side===it.side||q.t<.2||q.t>q.T-.2||q.def)return;var P=defFlyPos(q);if(dist(x,z,P[0],P[2])>mx)return;var dl=dist(x,z,q.x1,q.z1);if(dl<=C.protect&&dl<bd){bd=dl;fb=q;}});
    if(fb){var P2=defFlyPos(fb),mass=(AMMO[fb.ammo]&&AMMO[fb.ammo].w.mass)||1;spend();DEF.stats.lobs++;defCork(x,z,P2[0],P2[2]);m.rot=Math.atan2(P2[0]-x,P2[2]-z);
      if(rand()<C.intercept/mass){fb.live=false;fb.T=fb.t;it.n.hits++;DEF.stats.intercepts++;pop(P2[0],P2[2],'Knocked out of the air!',true,.5,it.side);viewPuff(P2[0],P2[2],1);}return true;}
    var lb=null;bd=1e9;lobbersOf(en).forEach(function(l){if(!l.built||l.down)return;var d=dist(x,z,l.x,l.z);if(d>=mn&&d<=mx&&d<bd){bd=d;lb=l;}});
    if(lb){spend();DEF.stats.lobs++;it.n.hits++;defShell(it,lb.x+gauss()*C.err*u,lb.z+gauss()*C.err*u);m.rot=Math.atan2(lb.x-x,lb.z-z);return true;}
    var rl=null;bd=1e9;SG.marbles.forEach(function(q){if(!q.rolling||q.side===it.side)return;var rp2=q.rm||q.rl;if(!rp2)return;var d=dist(x,z,rp2.x,rp2.z);if(d>=mn&&d<=mx&&d<bd){bd=d;rl=q;}});
    if(rl){var rq=rl.rm||rl.rl;spend();DEF.stats.stops++;it.n.hits++;defCork(x,z,rq.x,rq.z);if(rl.rm)rl.rm.E=0;else rl.rl.left=0;pop(rq.x,rq.z,'Stopped!',true,.2,it.side);viewPuff(rq.x,rq.z,.7);return true;}
    return false;}
  if(it.kind==='counter'){var sn=DEF.seen[it.side],pick=null;for(i=sn.length-1;i>=0;i--){var e=sn[i];if(e.taken||SG.clock-e.t>C.window)continue;var d2=dist(x,z,e.x,e.z);if(d2>=mn&&d2<=mx){pick=e;break;}}
    if(!pick)return false;pick.taken=true;spend();DEF.stats.counters++;var tx=pick.x+gauss()*C.err*u,tz=pick.z+gauss()*C.err*u,sh=defShell(it,tx,tz);m.rot=Math.atan2(pick.x-x,pick.z-z);
    if(pick.gun){var Lg=SG.lab;DEF.pend.push({t:SG.clock+sh.T,f:function(){if(Lg&&dist(tx,tz,pick.x,pick.z)<C.r*u*1.6){Lg.gunDown=SG.clock+C.silence;DEF.stats.counterHits++;it.n.hits++;pop(pick.x,pick.z,'Gun hit!',true,.4,it.side);}}});}
    else it.n.hits++;
    return true;}
  return false;}
function defPostTick(it,dt){var C=CD()[it.kind],m=defCrewMouse(it);it.cd=Math.max(0,it.cd-dt);it.cdS=Math.max(0,it.cdS-dt);
  var manned=!!m&&m.state!=='dizzy'&&m.dat&&m.dj&&m.dj.id===it.id&&m.dj.k==='crew';it.manned=manned;if(!manned){it.calm=0;return;}
  if(it.jammed){it.jam=Math.max(0,it.jam-dt/CD().oilSecs);m.act=.2;if(it.jam<=.02){it.jammed=false;it.jam=0;pop(it.x,it.z,'Cleared',true,.35,it.side);}return;}
  var shoot=SG.mode==='lab'||SG.phase==='fight',acted=false;
  if(shoot&&it.ammo>0)acted=defPostFire(it,m);
  if(acted){it.calm=0;it.idle=0;}else{it.calm+=dt;if(it.ammo<=0)it.idle+=dt;if(it.calm>C.every+1&&it.jam>0)it.jam=Math.max(0,it.jam-CD().jamOil*dt);}}   /* oiling needs a lull longer than the gap between shots */

/* ---- hidden traps ---- */
function defDaze(m,secs){if(m.state==='dizzy'||!dizzy(m,secs))return false;m.daze=true;return true;}
function defSpring(it,m){var T=CD().trap,u=U(),en=1-it.side;it.sprung=true;it.sprungT=SG.clock;it.n.sprung++;DEF.stats.sprung++;event('trap',it.side);snd('twang');viewPuff(it.x,it.z,1);
  if(it.kind==='spring'){var eb=baseOf(m.side),dx=eb.x-it.x,dz=eb.z-it.z,l=Math.sqrt(dx*dx+dz*dz)||1,f=T.spring.fling*u,k;for(k=0;k<6;k++){var nx=it.x+dx/l*f,nz=it.z+dz/l*f;if(isOpen(m.side,nx,nz)){m.x=nx;m.z=nz;break;}f*=.7;}m.path=null;defDaze(m,T.spring.daze);DEF.stats.flung++;pop(it.x,it.z,'BOING! Flung back',true,.35,it.side);}
  else if(it.kind==='glue'){var r=T.glue.r*u;SG.puddles.push({x:it.x,z:it.z,r:r,side:it.side,t0:SG.clock,life:T.glue.life,k:T.glue.slowTo,secs:T.glue.secs});SG.mice.forEach(function(o){if(o.side===en&&dist(o.x,o.z,it.x,it.z)<r){o.slowT=T.glue.secs;o.slowK=T.glue.slowTo;DEF.stats.glued++;}});pop(it.x,it.z,'Glue!',true,.3,it.side);}
  else if(it.kind==='log'){var h=hillAt(),dx2=h.x-it.x,dz2=h.z-it.z,l2=Math.sqrt(dx2*dx2+dz2*dz2)||1;DEF.logs.push({x:it.x,z:it.z,dx:dx2/l2,dz:dz2/l2,left:T.log.len*u,side:it.side,hit:{}});pop(it.x,it.z,'Log!',true,.3,it.side);}
  else if(it.kind==='cord'){var rc=T.cord.r*u,nn=0;SG.mice.forEach(function(o){if(o.side===en&&dist(o.x,o.z,it.x,it.z)<rc&&defDaze(o,T.cord.daze))nn++;});DEF.stats.crates+=nn;pop(it.x,it.z,'CRATE!',true,.35,it.side);viewPuff(it.x,it.z,1.3);}
  else if(it.kind==='snap'){var rs=T.snap.r*u,n2=0;SG.mice.forEach(function(o){if(o.side===en&&dist(o.x,o.z,it.x,it.z)<rs&&defDaze(o,T.snap.daze))n2++;});DEF.stats.stunned+=n2;pop(it.x,it.z,'SNAP!',true,.35,it.side);}}
function defTrapTick(it){if(it.sprung)return;var r=CD().trap.reach*U(),en=1-it.side;for(var i=0;i<SG.mice.length;i++){var m=SG.mice[i];if(m.side!==en||m.state==='dizzy')continue;if(dist(m.x,m.z,it.x,it.z)<r){defSpring(it,m);return;}}}
function defLogsTick(dt){var T=CD().trap.log,u=U();for(var i=DEF.logs.length-1;i>=0;i--){var g=DEF.logs[i],st=T.speed*u*dt;g.x+=g.dx*st;g.z+=g.dz*st;g.left-=st;
    SG.mice.forEach(function(m){if(m.side===g.side||m.state==='dizzy')return;var k=m.side*5+m.i;if(!g.hit[k]&&dist(m.x,m.z,g.x,g.z)<T.w*u+.03){g.hit[k]=1;if(defDaze(m,T.daze)){DEF.stats.logged++;pop(m.x,m.z,'Thump!',true,.3,g.side);}}});
    if(g.left<=0)DEF.logs.splice(i,1);}}
/* a mender on a wall: calm, and something fallen in the section: one part back */
function defWardenTick(it,dt){var m=defCrewMouse(it),C=CD().repair,wp=defWallAt(it.side,it.x,it.z);it.manned=!!m&&m.state!=='dizzy'&&m.dat&&m.dj&&m.dj.id===it.id;if(!it.manned||!wp)return;
  if(SG.phase!=='fight'&&SG.phase!=='mend'&&SG.mode!=='lab')return;
  if(!defCalm(it.side,wp.x,wp.z)){it.rep=Math.min(it.rep,C.every*.5);return;}
  it.rep+=dt;if(it.rep<C.every)return;
  var sect=[wp];SG.pieces.forEach(function(p){if(p!==wp&&p.side===it.side&&p.built&&(p.kind==='wall'||p.kind==='gate')&&dist(p.x,p.z,wp.x,wp.z)<C.reach*U()+FOOT[p.kind][0]+FOOT[wp.kind][0])sect.push(p);});
  for(var s=0;s<sect.length;s++){var p=sect[s],ml=mendable(p);if(ml.length){defMend(p,ml[0]);it.n.repairs++;DEF.stats.repairs++;it.rep=0;m.act=.7;return;}}
  it.rep=C.every*.5;}
function defTick(dt){if(!DEF.on)return;DEF.t+=dt;if(DEF.match)arsTick(dt);
  DEF.at-=dt;if(DEF.at<=0){DEF.at=.5;if(SG.phase==='fight'||SG.phase==='count'||SG.phase==='mend'||SG.mode==='lab'){defAssign(0);defAssign(1);}}
  for(var i=0;i<DEF.pend.length;){if(SG.clock>=DEF.pend[i].t){var e=DEF.pend.splice(i,1)[0];e.f();}else i++;}
  var live=SG.mode==='lab'||SG.phase==='fight';
  DEF.items.forEach(function(it){if(it.cat==='post')defPostTick(it,dt);else if(it.cat==='warden')defWardenTick(it,dt);else if(live)defTrapTick(it);});
  if(DEF.logs.length)defLogsTick(dt);}
/* the Arsenal's seven weapons, in turn, for a bot in a defence match */
var DEF_ROT=['marble','flinger','roller','popper','hook','thumper','fan'];
function defBotWeapon(s,ammo){var side=SG.sides[s],n=DEF_ROT.length;side.defRot=side.defRot|0;for(var k=0;k<n;k++){var id=DEF_ROT[(side.defRot+k)%n];if(AMMO[id]&&ammoReady(side,id)){side.defRot=(side.defRot+k+1)%n;return {ammo:id,high:id==='marble'?side.high:false};}}return {ammo:ammo,high:side.high};}

/* ---- camps with compartments: inner walls with gates split a camp into rooms (the camp frame: x across, z toward the back; the Keep near 2.5) ---- */
function defTemplate(id){var F=FOOT,T=PI,H=PI/2,g=F.gate[0]*2+.012,w=F.wall[0]*2+.012,l=[],i,kz=2.52;
  if(id==='courtyard'){var fz=1.32,hx=g/2+w,sz=fz+F.wall[1]+w/2+.01;   /* front line: wall, gate, wall; side walls turn a quarter; a back wall behind the Keep */
    l.push(['tower',0,kz,T],['gate',0,fz,T],['wall',-(g/2+w/2),fz,T],['wall',g/2+w/2,fz,T]);
    for(i=0;i<2;i++){l.push(['wall',-hx,sz+i*w,H],['wall',hx,sz+i*w,H]);}
    var bz=sz+w*1.5+.02;for(i=-1;i<=1;i++)l.push(['wall',i*w,bz,T]);
    l.push(['tent',hx-F.tent[0]-.06,fz+.62,T],['workshop',-(hx-F.workshop[0]-.08),fz+.55,T]);return l;}
  if(id==='rooms'){var fz2=1.3,tot=3*g+2*w,x0=-tot/2,xs=[],cur=x0;   /* front line: gate, wall, gate, wall, gate (three doors); two partitions, each a wall and a gate; side walls */
    var seq=[['gate',g],['wall',w],['gate',g],['wall',w],['gate',g]];seq.forEach(function(q){l.push([q[0],cur+q[1]/2,fz2,T]);xs.push(cur+q[1]/2);cur+=q[1];});
    var px=[xs[1],xs[3]],p0=fz2+F.wall[1]+.01;px.forEach(function(x){l.push(['wall',x,p0+w/2,H]);l.push(['gate',x,p0+w+g/2,H]);});
    var ox=x0+F.wall[1]*0;[-1,1].forEach(function(sg){l.push(['wall',sg*(tot/2-F.wall[1]),p0+w/2,H]);l.push(['wall',sg*(tot/2-F.wall[1]),p0+w*1.5,H]);});
    l.push(['tower',0,kz+.1,T],['tent',xs[0]+.12,p0+w*1.25,T],['workshop',xs[4]-.12,p0+w*1.25,T]);return l;}
  return [];}
/* where the posts and traps of a ready-made camp stand (camp frame) */
var DEF_TPL_ITEMS={courtyard:[['counter',.5,2.1],['sling',-.45,1.8],['pop',-.55,1.1],['pop',.55,1.1],['warden',-.54,1.32],['spring',0,1.1],['snap',.28,1.1],['glue',-.28,1.1]],
  rooms:[['counter',0,2.0],['sling',-.9,1.9],['pop',-.7,1.08],['pop',.7,1.08],['warden',-.54,1.3],['spring',0,1.08],['glue',-1.1,1.08],['snap',1.1,1.08]]};
function defTemplateItems(id,s){var o=[];(DEF_TPL_ITEMS[id]||[]).forEach(function(q){var w=w2(s,q[1],q[2]);o.push({kind:q[0],side:s,x:+w[0].toFixed(4),z:+w[1].toFixed(4)});});return o;}

/* ---- a bot's fortified camp: the 'good' camp without the trap, the workshop and one wall, and what that frees spent on posts and traps ---- */
PRESETS.goodF=PRESETS.good.filter(function(q){return CONFIG.defence.drop.indexOf(q[0])<0;});
var DEF_SPOT={counter:[-.8,2.05],pop:[0,1.15],sling:[.6,1.3],spring:[0,.95],glue:[-.3,1.0],log:[.5,1.0],cord:[.35,1.1],snap:[-.35,1.1],warden:[0,2.06]};
function defBuildItems(){for(var s=0;s<2;s++){if(!DEF.fort[s])continue;var side=SG.sides[s],C=CD();C.plan.forEach(function(k){var cost=defCost(k);if(cost>side.points+1e-9)return;var sp=DEF_SPOT[k],w=w2(s,sp[0],sp[1]),r=defAdd(k,s,w[0],w[1]);if(r.ok){side.points=Math.round((side.points-cost)*100)/100;DEF.spent[s]+=cost;}});}}
/* a match with defences: ?defence=front|far|both (or SG.start(team,{defence:{fort:[true,false]}})). Lab flags only: the seven Arsenal weapons are on the table, and the fortified side builds the 'goodF' camp. */
function defMatchInit(opts){var o=opts.defence===true?{fort:[true,false]}:opts.defence,f=o.fort||[false,false];defClear();DEF.on=true;DEF.match=true;DEF.fort=[!!f[0],!!f[1]];SG.gusts=[];
  if(!LAB_FLAGS.arsenal){ARS_W.forEach(arsInstall);DEF.arsOwn=true;}
  for(var s=0;s<2;s++)if(DEF.fort[s]){SG.sides[s].preset='goodF';fitPreset(s);}}
SG.defMatchInit=defMatchInit;

/* ---- drawing: the items, range rings when one is selected, the rolling logs ---- */
var DEF_COL={pop:0xe8b04a,sling:0x7ab0e8,counter:0xe86a5a,spring:0x8acf5a,glue:0x86d23c,log:0x9c6b30,cord:0xd8d0a0,snap:0xb08ad8};
function defMesh(it){var u=U(),g=new THREE.Group(),team=SG.sides[it.side]?SG.sides[it.side].team:'blue',col=team==='red'?0xd8604a:0x4a86d8;
  function mat(c,o){return new THREE.MeshStandardMaterial({color:c,roughness:.75,transparent:!!o,opacity:o||1});}
  if(it.cat==='post'){var base=new THREE.Mesh(new THREE.CylinderGeometry(.075*u,.09*u,.05*u,14),mat(0x6b4a2c));base.position.y=.025*u;g.add(base);
    var len={pop:.2,sling:.27,counter:.32}[it.kind]*u,bg=new THREE.Group(),bar=new THREE.Mesh(new THREE.CylinderGeometry(.02*u,.032*u,len,10),mat(DEF_COL[it.kind]));bar.rotation.x=PI/2;bar.position.set(0,0,len*.4);bg.add(bar);
    var cap=new THREE.Mesh(new THREE.SphereGeometry(.045*u,10,8),mat(col));cap.position.y=0;bg.add(cap);bg.position.y=.085*u;g.add(bg);g.userData.bar=bg;
    var stool=new THREE.Mesh(new THREE.CylinderGeometry(.05*u,.05*u,.012*u,12),mat(0xe8d8a0,.8));var sl=defSlot(it);stool.position.set(sl[0]-it.x,.008,sl[1]-it.z);g.add(stool);g.userData.stool=stool;}
  else if(it.cat==='trap'){var disc=new THREE.Mesh(new THREE.CylinderGeometry(.1*u,.1*u,.012*u,16),mat(DEF_COL[it.kind],.7));disc.position.y=.008;g.add(disc);g.userData.disc=disc;
    var mk=new THREE.Mesh(new THREE.BoxGeometry(.05*u,.02*u,.05*u),mat(0x3a281a,.8));mk.position.y=.02*u;g.add(mk);}
  else{var wp=defWallAt(it.side,it.x,it.z),hh=wp?TALL[wp.kind]:.4,fl=new THREE.Mesh(new THREE.ConeGeometry(.05*u,.1*u,8),mat(0xf0c040));fl.position.y=hh+.07*u;g.add(fl);}
  g.position.set(it.x,0,it.z);world.add(g);return g;}
function defView(){if(!V.on||!DEF.on)return;var D=V.def||(V.def={g:{},logs:[]}),u=U(),i;
  if(!V.dr){V.dr={min:labFlat(new THREE.RingGeometry(.97,1,56),0xffc27a,.85),max:labFlat(new THREE.RingGeometry(.97,1,56),0xfff3a0,.9),fill:labFlat(new THREE.CircleGeometry(1,40),0xfff3a0,.1),
    lg:[0,1,2,3].map(function(){var m=new THREE.Mesh(new THREE.CylinderGeometry(.04*u,.04*u,.14*u,10),new THREE.MeshStandardMaterial({color:0x9c6b30,roughness:.8}));m.rotation.z=PI/2;m.visible=false;S.add(m);return m;})};}
  var R=V.dr,ids={};
  DEF.items.forEach(function(it){ids[it.id]=1;var g=D.g[it.id];if(!g)g=D.g[it.id]=defMesh(it);
    var hide=it.cat==='trap'&&!it.sprung&&(DEF.view==='attacker'||(SG.mode!=='lab'&&SG.sides[0]&&SG.sides[0].human&&it.side===1));g.visible=!hide;
    if(it.cat==='trap'&&g.userData.disc){g.userData.disc.material.color.setHex(it.sprung?0x7a7a7a:DEF_COL[it.kind]);g.userData.disc.scale.y=it.sprung?.4:1;}
    if(it.cat==='post'&&g.userData.bar){var h=hillAt(),aim=it.aim!=null?it.aim:Math.atan2(h.x-it.x,h.z-it.z);g.userData.bar.rotation.y=aim;
      g.userData.bar.position.y=(.085+(it.jammed?-.02:0))*u;}
    if(it.id===DEF.sel){g.scale.setScalar(1+.06*Math.sin(SG.clock*6));}else g.scale.setScalar(1);});
  Object.keys(D.g).forEach(function(k){if(!ids[k]){world.remove(D.g[k]);delete D.g[k];}});
  var sel=DEF.sel?defById(DEF.sel):null,C=sel&&sel.cat==='post'?CD()[sel.kind]:null;
  R.max.visible=R.fill.visible=!!C;R.min.visible=!!C&&C.min>.12;
  if(C){var y=.012;R.max.position.set(sel.x,y,sel.z);R.max.scale.setScalar(C.max);R.fill.position.set(sel.x,y-.002,sel.z);R.fill.scale.setScalar(C.max);R.min.position.set(sel.x,y+.001,sel.z);R.min.scale.setScalar(Math.max(.01,C.min));}
  for(i=0;i<R.lg.length;i++){var g2=DEF.logs[i],m=R.lg[i];m.visible=!!g2;if(g2){m.position.set(g2.x,.04*u,g2.z);m.rotation.y=Math.atan2(g2.dx,g2.dz)+PI/2;m.rotation.z=PI/2;}}}
function defViewHide(){if(V.dr){V.dr.min.visible=V.dr.max.visible=V.dr.fill.visible=false;V.dr.lg.forEach(function(m){m.visible=false;});}}
/* a small tag over each post (ammo, jam), and over a sprung trap while it waits to be set again */
function defLabels(show){if(!DEF.on||!V.on)return;DEF.items.forEach(function(it){var K=DK[it.kind],txt='';
  if(it.cat==='post'){var jb=it.jammed?'JAMMED':'jam '+['....','#...','##..','###.','####'][Math.min(4,Math.round(it.jam*4))];txt=K.icon+' '+it.ammo+' · '+jb+(it.manned?'':' · no crew');show('df'+it.id+'|'+txt,'pop lobtag'+(it.id===DEF.sel?' sel':''),txt,it.x,it.z,.3,it.side,it.manned?1:.75);}
  else if(it.cat==='trap'&&it.sprung){txt=K.icon+' sprung';show('df'+it.id+'|'+txt,'pop lobtag',txt,it.x,it.z,.12,it.side,.85);}
  else if(it.cat==='trap'&&SG.mode==='lab'&&DEF.view==='builder'&&it.id===DEF.sel){txt=K.icon+' '+K.name;show('df'+it.id+'|'+txt,'pop lobtag sel',txt,it.x,it.z,.14,it.side,1);}});}

/* ---- the Lab: tap to place or select, the panel, the actions ---- */
function defItemAt(x,z){var best=null,bd=.2*U();DEF.items.forEach(function(it){var d=dist(it.x,it.z,x,z);if(d<bd){bd=d;best=it;}});return best;}
SG.defTap=function(x,z){var L=SG.lab;if(!L||!DEF.on)return null;var it=defItemAt(x,z);if(it){DEF.sel=it.id;labUi();return {sel:it};}
  if(!DEF.kind){labMsg('Pick an item from the bar first',true);return null;}
  var s=defSideAt(x,z),r=defAdd(DEF.kind,s,x,z);if(!r.ok){labMsg(r.text,true);return r;}DEF.sel=r.item.id;DEF.spent[s]+=0;snd('tap');labMsg(DK[DEF.kind].name+' placed ('+defCost(DEF.kind)+' points)'+(DK[DEF.kind].cat==='post'?'. A mouse goes to crew it':''),false);labUi();return r;};
SG.defErase=function(x,z){var it=defItemAt(x,z);if(!it)return false;defRemove(it);labMsg(DK[it.kind].name+' removed',false);labUi();return true;};
SG.defSetKind=function(k){DEF.kind=DK[k]?k:'';labUi();};
/* a bought restock: build points, at once; a mouse trip: the crew or a free mouse fetches it (the match way) */
SG.defRestock=function(it,how){it=it&&it.id?it:defById(it);if(!it||it.cat!=='post')return false;var C=CD();
  if(how==='buy'){var side=SG.sides[it.side];if(SG.mode!=='lab'){if(side.points<C.restockCost)return false;side.points=Math.round((side.points-C.restockCost)*100)/100;}DEF.spent[it.side]+=C.restockCost;it.ammo=C[it.kind].ammo;it.n.restocks++;DEF.stats.restocks++;pop(it.x,it.z,'Restocked (bought)',true,.3,it.side);return true;}
  if(it.fetch)return false;var fm=SG.mice.filter(function(m){return m.side===it.side&&!m.dj&&m.state!=='dizzy'&&isFree(m)&&!crewOf(m);}),best=null,bd=1e9;fm.forEach(function(m){var d=dist(m.x,m.z,it.x,it.z);if(d<bd){bd=d;best=m;}});
  if(!best){var cm=defCrewMouse(it);if(cm&&cm.dj&&cm.dj.id===it.id){cm.dj={k:'restock',id:it.id,t:0,then:{k:'crew',id:it.id}};cm.dat=false;return true;}return false;}best.dj={k:'restock',id:it.id,t:0};return true;};
SG.defOil=function(it){it=it&&it.id?it:defById(it);if(!it||it.cat!=='post')return false;it.jam=0;it.jammed=false;pop(it.x,it.z,'Oiled',true,.3,it.side);return true;};
SG.defReset=function(it){it=it&&it.id?it:defById(it);if(!it||it.cat!=='trap')return false;it.sprung=false;it.rst=false;return true;};
SG.defItems=function(s){return DEF.items.filter(function(i){return s==null||i.side===s;});};
SG.defAdd=function(kind,s,x,z){return defAdd(kind,s,x,z);};
LAB_PROTOS.defences={name:'Defences: posts, traps, upkeep, mender, Test my base',note:'Pop-gun, Slinger and Counter-lobber posts with a crew mouse, ammo and a jam meter; five hidden traps; a mender on a wall; two camps with rooms; the Test my base report card. Off by default. Also puts the seven Arsenal weapons on the table.',
  on:function(){if(DEF.match)return;defClear();DEF.on=true;DEF.match=false;if(!LAB_FLAGS.arsenal&&!DEF.arsOwn){ARS_W.forEach(arsInstall);DEF.arsOwn=true;}
    [['courtyard','Walled courtyard'],['rooms','Three rooms']].forEach(function(t){if(!LAB_TARGETS.some(function(q){return q[0]===t[0];}))LAB_TARGETS.push(t);});SG.gusts=SG.gusts||[];if(SG.lab){SG.lab.defKey='';labUi();}},
  off:function(){var was=DEF.arsOwn;if(was){ARS_W.forEach(arsRemove);DEF.arsOwn=false;}DEF.on=false;DEF.match=false;defClear();defViewHide();for(var i=LAB_TARGETS.length-1;i>=0;i--)if(LAB_TARGETS[i][0]==='courtyard'||LAB_TARGETS[i][0]==='rooms')LAB_TARGETS.splice(i,1);
    var L=SG.lab;if(L&&L.tool==='def')L.tool='build';if(V.def){Object.keys(V.def.g).forEach(function(k){world.remove(V.def.g[k]);});V.def=null;}}};
var DEF_BAR=function(v,n){var k=Math.round(v*n),s='';for(var i=0;i<n;i++)s+=i<k?'#':'.';return '['+s+']';};
function defUi(){if(!hasDom||!SG.lab||!E('labDef'))return;var L=SG.lab,on=DEF.on;
  if(L.tgN!==LAB_TARGETS.length){L.tgN=LAB_TARGETS.length;E('labTg').innerHTML=LAB_TARGETS.map(function(t){return '<button class="btn lb'+(L.target===t[0]?' on':'')+'" data-a="tg_'+t[0]+'">'+t[1]+'</button>';}).join('');}
  var h='<div class="lnote">Posts with a crew mouse that shoot for you, traps the attacker cannot see, a mender on a wall, and Test my base. Off by default.</div>'+
  '<div class="lgrid"><button class="btn lb'+(on?' on':'')+'" data-a="def_toggle">Defences: '+(on?'on':'off')+'</button></div>';
  if(on){var s1=DEF.items.filter(function(i){return i.side===1;}).length,s0=DEF.items.length-s1;
    h+='<h4 class="wh">Items (tap the table to place; the Defences tool)</h4><div class="lgrid">'+DK_ORDER.map(function(k){return '<button class="btn lb'+(DEF.kind===k&&L.tool==='def'?' on':'')+'" data-a="def_k_'+k+'" title="'+labEsc(DK[k].tip)+'">'+DK[k].icon+' '+labEsc(DK[k].name)+' ('+defCost(k)+')</button>';}).join('')+'</div>';
    var sel=DEF.sel?defById(DEF.sel):null;
    if(sel){var K=DK[sel.kind],C=CD()[sel.kind];h+='<div class="lnote"><b>'+K.icon+' '+labEsc(K.name)+'</b> ('+(sel.side?'target camp':'my camp')+')<br>';
      if(sel.cat==='post')h+='Range '+(C.min>.1?'min '+C.min+' to ':'up to ')+'max '+C.max+' (rings on the table). Ammo '+sel.ammo+' of '+C.ammo+'. Jam '+(sel.jammed?'JAMMED':DEF_BAR(sel.jam,8))+' (jams after '+C.jamAfter+' shots unless oiled). Crew: '+(sel.manned?'at the post':(sel.crewM>=0?'on the way or down':'none yet'))+'. Shots '+sel.n.shots+', hits '+sel.n.hits+'.';
      else if(sel.cat==='trap')h+=(sel.sprung?'SPRUNG: needs a mouse to set it again.':'Set and hidden from the attacker.')+' Sprung '+sel.n.sprung+' times.';
      else h+='Mends one part every '+CD().repair.every+' s when calm. Mended '+sel.n.repairs+'.';
      h+='</div><div class="lgrid">'+(sel.cat==='post'?'<button class="btn lb go" data-a="def_restock">🐭 Restock (mouse trip)</button><button class="btn lb" data-a="def_buy">Restock (buy, '+CD().restockCost+' pt)</button><button class="btn lb" data-a="def_oil">🛢 Oil</button>':'')+(sel.cat==='trap'?'<button class="btn lb go" data-a="def_reset">Set it again</button>':'')+'<button class="btn lb" data-a="def_remove">Remove</button></div>';}
    h+='<div class="lgrid"><button class="btn lb'+(DEF.view==='attacker'?' on':'')+'" data-a="def_view">Attacker\'s view: '+(DEF.view==='attacker'?'traps hidden':'off')+'</button><button class="btn lb'+(DEF.crewAuto?' on':'')+'" data-a="def_crew">Crew mice: '+(DEF.crewAuto?'auto':'off')+'</button></div>'+
      '<div class="lnote">Items cost, in points: my camp '+defCostOf(0)+' ('+s0+'), target camp '+defCostOf(1)+' ('+s1+'). Restocks bought: '+(DEF.spent[0]+DEF.spent[1]).toFixed(1)+'.</div>'+
      '<div class="lgrid"><button class="btn lb go big" data-a="def_test">📋 TEST MY BASE (target camp)</button><button class="btn lb go" data-a="def_testmine">Test my camp (copies it to the target)</button></div>'+
      '<div class="lgrid"><button class="btn lb" data-a="def_tpl_courtyard">Load Walled courtyard</button><button class="btn lb" data-a="def_tpl_rooms">Load Three rooms</button></div>';}
  if(L.defKey!==h){L.defKey=h;E('labDef').innerHTML=h;}}
function defAct(a){var L=SG.lab,it=DEF.sel?defById(DEF.sel):null,go;
  if(a==='def_toggle'){SG.setProto('defences',!LAB_FLAGS.defences);labMsg(LAB_FLAGS.defences?'Defences are on (and the Arsenal weapons)':'Defences are off',false);labUi();return;}
  if(a.indexOf('def_k_')===0){SG.defSetKind(a.slice(6));if(L.tool!=='def')SG.labTool('def');return;}
  if(a==='def_restock'){if(!SG.defRestock(it,'mouse'))labMsg('No mouse is free to fetch it',true);else labMsg('A mouse is fetching ammunition',false);labUi();return;}
  if(a==='def_buy'){SG.defRestock(it,'buy');labUi();return;}if(a==='def_oil'){SG.defOil(it);labUi();return;}if(a==='def_reset'){SG.defReset(it);labUi();return;}
  if(a==='def_remove'){if(it)defRemove(it);labUi();return;}
  if(a==='def_view'){DEF.view=DEF.view==='attacker'?'builder':'attacker';labUi();return;}if(a==='def_crew'){DEF.crewAuto=!DEF.crewAuto;labUi();return;}
  if(a.indexOf('def_tpl_')===0){labLoadTarget(a.slice(8));labUi();return;}
  if(a==='def_test'||a==='def_testmine'){labMsg('Firing the whole Arsenal at the camp...',false);go=function(){var r=a==='def_test'?SG.defTest():SG.defTestMine();L.defOut=r;E('labDefTxt').innerHTML=defReportHtml(r);E('labDefText').value=SG.defReportText(r);E('labDefBox').style.display='flex';labUi();};if(typeof setTimeout==='function')setTimeout(go,30);else go();return;}
  if(a==='def_ok'){E('labDefBox').style.display='none';return;}
  if(a==='def_copy'){var t=E('labDefText');t.select();try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t.value);else document.execCommand('copy');labMsg('Report copied',false);}catch(e){labMsg('Select the text and copy it',true);}return;}}

/* ---- TEST MY BASE: the whole Arsenal at the camp, then a raid, then every piece taken out in turn to see what it was worth ---- */
/* The seven weapons (the Lobber is the Marble), a volley of CONFIG.defence.test.shots each at the camp's aim spot and round it, the free gun standing where a lobber stands (so a Counter-lobber can reach it),
   one shot every test.gap seconds; a calm of test.calm seconds after (a mender gets to work); then a raid of test.raid mice. Same seeds every time, so the card is the same every time.
   What a piece or post "saved" is the points the camp loses when that one thing is taken out, minus the points with it there (a part 1, a collapse 3, a Keep 10, as the Counter matrix). */
var DEF_FAMS=['lobber','flinger','roller','popper','hook','thumper','fan'];
function defFam(id){return ARS_FAMS.filter(function(f){return f.id===id;})[0];}
function defCrewNow(s){var was=DEF.crewAuto;DEF.crewAuto=true;defAssign(s);DEF.crewAuto=was;
  DEF.items.forEach(function(it){if(it.side!==s||it.cat==='trap')return;var m=defCrewMouse(it);if(!m||!m.dj||m.dj.id!==it.id)return;var p=it.cat==='post'?defSlot(it):(function(){var wp=defWallAt(s,it.x,it.z);return wp?workSpot(wp,m):[it.x,it.z];})();
    m.x=p[0];m.z=p[1];m.tx=p[0];m.tz=p[1];m.path=null;m.state='hold';m.dat=true;m.speed=0;m.goal=false;});}
function defPKey(p){return p.kind+'@'+p.x.toFixed(3)+','+p.z.toFixed(3);}
function defScoreOf(st0){var camp=0,keep=0,per={};SG.pieces.forEach(function(p){if(p.side!==1||!p.total)return;if(p.down){keep++;per[defPKey(p)]=ARS_SCORE.keep;return;}var n=p.ps.filter(function(q){return q.st!=='on';}).length;camp+=n;per[defPKey(p)]=n;});
  var col=SG.stats.collapses-st0.c;return {parts:camp,collapses:col,keep:keep,per:per,score:camp*ARS_SCORE.part+col*ARS_SCORE.collapse+keep*ARS_SCORE.keep};}
function defAimSpot(famId){var sp=SG.labDefaultSpot(),u=U();if(famId==='roller'){var front=9;SG.pieces.forEach(function(p){if(p.side===1&&p.built)front=Math.min(front,Math.abs(p.z));});return {x:sp.x-ARS_LANE.roller,z:-(Math.max(.9,front-.5))};}return sp;}
function defVolley(famId,recs,seed){var L=SG.lab,C=CD().test,u=U(),f=defFam(famId)||ARS_EXTRA[0];labSetSide(1,recs.map(function(r){return Object.assign({},r);}),true);
  SG.marbles=[];SG.debris=[];SG.fuses=[];SG.puddles=[];SG.gusts=[];DEF.logs=[];DEF.pend=[];DEF.seen=[[],[]];DEF.stats=defStats();L.gunDown=0;defCrewNow(1);SG.acc=0;SG.step(.1);
  var st0={c:SG.stats.collapses},sp=defAimSpot(famId),lost=0,fired=0;L.ammo=f.ammo;L.high=!!f.high;SG.sides.forEach(function(sd){sd.ammo=f.ammo;sd.high=!!f.high;});
  for(var i=0;i<C.shots;i++){SG.topN=0;var of=LAB_CARPET[i%LAB_CARPET.length],sh=SG.labFire(0,'gun',sp.x+of[0]*u,sp.z+of[1]*u,{force:true,seed:seed+i}),t=0;
    if(!sh)lost++;else{fired++;while(t<14){SG.step(STEP);t+=STEP;if(L.cur&&L.cur.done&&!arsBusy())break;}}
    while(t<C.gap){SG.step(.1);t+=.1;}}
  SG.step(C.calm);var r=defScoreOf(st0);var acts=DEF.items.filter(function(it){return it.side===1;}).map(function(it){return {shots:it.n.shots,hits:it.n.hits,sprung:it.n.sprung,repairs:it.n.repairs,swat:it.n.swat};});
  r.id=famId;r.fired=fired;r.lost=lost;r.ok=!r.keep&&r.score<=C.pass;r.acts=acts;r.stats=DEF.stats;return r;}
/* a raid: mice of the other side walk in from the hill and pull at the walls */
function defRaid(recs,seed){var L=SG.lab,C=CD().test,u=U();labSetSide(1,recs.map(function(r){return Object.assign({},r);}),true);SG.marbles=[];SG.debris=[];SG.puddles=[];DEF.logs=[];DEF.pend=[];DEF.seen=[[],[]];DEF.stats=defStats();L.gunDown=0;SG.seed=seed;defCrewNow(1);SG.acc=0;SG.step(.1);
  var st0={c:SG.stats.collapses},ms=[],k;for(k=1;k<=C.raid&&k<5;k++){var m=SG.mice[k],w=hillSpot(1,(k-2)*.28,.55);m.x=w[0];m.z=w[1];m.tx=w[0];m.tz=w[1];m.path=null;m.state='go';m.cd=0;m.t=0;m.dj={k:'raid',pulls:0};ms.push(m);}
  var t=0;while(t<C.raidSecs){SG.step(.25);t+=.25;}
  var pulls=0;ms.forEach(function(m){pulls+=m.dj?m.dj.pulls|0:0;m.dj=null;});labHomeMice(0);var r=defScoreOf(st0),S=DEF.stats;
  r.pulls=pulls;r.sentBack=S.flung+S.pops+S.stunned+S.crates+S.logged+S.glued;r.acts=DEF.items.filter(function(it){return it.side===1;}).map(function(it){return {shots:it.n.shots,hits:it.n.hits,sprung:it.n.sprung,repairs:it.n.repairs,swat:it.n.swat};});r.stats=S;return r;}
function defRunAll(recs,items,skipItem,seed){DEF.saved[1]=items.filter(function(q,j){return j!==skipItem;});var o={w:[],total:0,survived:0,parts:0},acts=null;
  DEF_FAMS.forEach(function(id,i){var v=defVolley(id,recs,seed+i*1000);o.w.push(v);o.total+=v.score;o.parts+=v.parts;if(v.ok)o.survived++;});
  var rd=defRaid(recs,seed+9000);o.raid=rd;o.total+=rd.score;o.parts+=rd.parts;return o;}
function defTestRun(o){var L=SG.lab,C=CD().test,seed=o.seed||C.seed,recs=L.saved[1].map(function(r){return Object.assign({},r);}),items=DEF.saved[1].slice(),oldR=LAB_GUNR,res;
  var wasTop=L.topple;LAB_GUNR=C.gunR;L.topple=false;
  try{var full=defRunAll(recs,items,-1,seed),bare=items.length?defRunAll(recs,[],-1,seed):full,out={score:full.survived,of:DEF_FAMS.length,pass:C.pass,seed:seed,weapons:[],items:[],pieces:[],camp:null};
    DEF_FAMS.forEach(function(id,i){var v=full.w[i],f=defFam(id),A=AMMO[f.ammo];out.weapons.push({id:id,name:f.name,icon:A.icon,score:v.score,parts:v.parts,collapses:v.collapses,keep:!!v.keep,survived:v.ok,fired:v.fired,lost:v.lost,bare:bare.w[i].score,stats:v.stats,acts:v.acts});});
    var worst=out.weapons.slice().sort(function(a,b){return b.score-a.score;})[0];out.worst=worst&&worst.score>0?{id:worst.id,name:worst.name,score:worst.score}:null;
    out.raid={parts:full.raid.parts,pulls:full.raid.pulls,sentBack:full.raid.sentBack,bareParts:bare.raid.parts,bareSent:bare.raid.sentBack,held:full.raid.parts<=3};
    out.total=full.total;out.bareTotal=bare.total;
    items.forEach(function(r,j){var w=defRunAll(recs,items,j,seed),acted=0;full.w.concat([full.raid]).forEach(function(v){var a=v.acts[j];if(a)acted+=a.shots+a.sprung+a.repairs;});
      var saved=Math.round((w.total-full.total)*100)/100;out.items.push({kind:r.kind,name:DK[r.kind].name,icon:DK[r.kind].icon,x:r.x,z:r.z,saved:saved,savedParts:w.parts-full.parts,acted:acted,earned:saved>=1,verdict:saved>=1?'earned its place':(acted?'acted, saved nothing':'did nothing')});});
    var sumPer=function(o,skip){var t=0;o.w.concat([o.raid]).forEach(function(v){for(var k in v.per)if(k!==skip)t+=v.per[k];});return t;};
    recs.forEach(function(r,j){if(r.kind==='tower')return;var rr=recs.filter(function(q,i){return i!==j;}),key=r.kind+'@'+r.x.toFixed(3)+','+r.z.toFixed(3);DEF.saved[1]=items;var w=defRunAll(rr,items,-1,seed),saved=Math.round((sumPer(w,key)-sumPer(full,key))*100)/100;   /* what the others lose without it, beside what they lose with it */
      out.pieces.push({kind:r.kind,name:labName(r.kind),x:r.x,z:r.z,saved:saved,earned:saved>=1});});
    DEF.saved[1]=items;out.camp={recs:recs.map(function(r){var c=toCamp(1,r.x,r.z);return {kind:r.kind,x:c[0],z:c[1],rot:r.rot-phiOf(1)};}),items:items.map(function(r){var c=toCamp(1,r.x,r.z);return {kind:r.kind,x:c[0],z:c[1]};})};
    out.cost=defCostOf(1);out.nPieces=recs.length;out.target=labTargetName(L.target);res=out;}
  finally{LAB_GUNR=oldR;L.topple=wasTop;DEF.saved[1]=items;}
  return res;}
SG.defTest=function(o){var L=SG.lab;if(!L)return null;o=o||{};var wasOn=DEF.on,wasArs=!!LAB_FLAGS.arsenal,res;if(!wasOn)SG.setProto('defences',true,false);if(!wasArs)SG.setProto('arsenal',true,false);
  try{res=labSandbox(function(){return defTestRun(o);});}finally{if(!wasArs)SG.setProto('arsenal',false,false);if(!wasOn)SG.setProto('defences',false,false);SG.gusts=[];}
  return res;};
/* my camp (the near one), items and all, copied to the target camp and tested there */
SG.defTestMine=function(){var L=SG.lab;if(!L)return null;if(!DEF.on)SG.setProto('defences',true,false);labLoadTarget('copy');return SG.defTest();};
/* the card as plain text, to paste */
SG.defReportText=function(r){if(!r)return '';var o='TEST MY BASE  (Round Table Kingdom Lab, defences prototype)\n';
  o+='Camp: '+r.target+', '+r.nPieces+' pieces, '+r.items.length+' defences costing '+r.cost+' points\n';
  o+='SCORE: '+r.score+' of '+r.of+' weapons survived (a weapon is survived when the Keep stands and it takes '+r.pass+' points or fewer)\n\nWeapons (points taken, bare camp in brackets):\n';
  r.weapons.forEach(function(w){o+='  '+(w.survived?'[x] ':'[ ] ')+w.name+': '+w.score+' ('+w.bare+')'+(w.lost?', '+w.lost+' shots lost to counter-fire':'')+'\n';});
  o+='\nHurt most: '+(r.worst?r.worst.name+' ('+r.worst.score+' points)':'nothing got through')+'\n';
  var ea=r.items.filter(function(i){return i.earned;}),no=r.items.filter(function(i){return !i.earned;}),pn=r.pieces.filter(function(i){return !i.earned;});
  o+='Defences that earned their place: '+(ea.length?ea.map(function(i){return i.name+' (saved '+i.saved+' points, '+i.savedParts+' parts)';}).join('; '):'none')+'\n';
  o+='Defences that did nothing: '+(no.length?no.map(function(i){return i.name+' ('+i.verdict+')';}).join('; '):'none')+'\n';
  o+='Pieces that did nothing: '+(pn.length?pn.map(function(i){return i.name;}).join(', '):'none')+'\n';
  o+='Raid of 3 mice: lost '+r.raid.parts+' parts (bare camp: '+r.raid.bareParts+'), sent '+r.raid.sentBack+' mice back. '+(r.raid.held?'Held.':'Not held.')+'\n';
  o+='Total points taken: '+r.total+' (bare camp, no defences: '+r.bareTotal+')\n';return o;};
/* the card on the page: the score, a small map of the camp, a bar for each weapon, who earned their place */
SG.defReportHtml=defReportHtml;
function defReportHtml(r){if(!r)return '';var W=190,Hh=128,sx=function(x){return W/2+x*46;},sz=function(z){return 12+(z-.8)*50;},svg='<svg viewBox="0 0 '+W+' '+Hh+'" width="190" height="128" style="background:#efe3c4;border-radius:8px;flex:none">';
  r.camp.recs.forEach(function(p){var f=FOOT[p.kind]||[.2,.2],a=(p.rot||0)*180/PI,col=p.kind==='tower'?'#a8794a':(p.kind==='wall'||p.kind==='gate'?'#c9a46a':'#9aa');svg+='<rect x="'+(sx(p.x)-f[0]*46)+'" y="'+(sz(p.z)-f[1]*50)+'" width="'+(f[0]*92)+'" height="'+(f[1]*100)+'" fill="'+col+'" stroke="#5a3d20" stroke-width=".8" transform="rotate('+(-a)+' '+sx(p.x)+' '+sz(p.z)+')"/>';});
  r.camp.items.forEach(function(p){svg+='<text x="'+sx(p.x)+'" y="'+(sz(p.z)+5)+'" font-size="13" text-anchor="middle">'+DK[p.kind].icon+'</text>';});svg+='</svg>';
  var mx=1;r.weapons.forEach(function(w){mx=Math.max(mx,w.score,w.bare);});
  var h='<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start">'+svg+'<div><div style="font-size:30px;font-weight:700">'+r.score+' / '+r.of+'</div><div>weapons survived</div><small>'+labEsc(r.target)+' · '+r.nPieces+' pieces · '+r.items.length+' defences, '+r.cost+' points</small></div></div>';
  h+='<table class="lt wide"><tr><th>Weapon</th><th>Points taken (bar: this camp, thin line: bare camp)</th><th></th></tr>';
  r.weapons.forEach(function(w){h+='<tr><td>'+w.icon+' '+labEsc(w.name)+'</td><td><div style="height:10px;background:'+(w.survived?'#7ab86a':'#d8604a')+';width:'+Math.max(2,Math.round(w.score/mx*100))+'%;border-radius:3px"></div><div style="height:3px;background:#555;width:'+Math.max(1,Math.round(w.bare/mx*100))+'%;margin-top:2px"></div><small>'+w.score+' (bare '+w.bare+')'+(w.lost?' · '+w.lost+' shots silenced':'')+'</small></td><td>'+(w.survived?'✔':'✘')+'</td></tr>';});
  h+='</table><p><b>Hurt most:</b> '+(r.worst?labEsc(r.worst.name)+' ('+r.worst.score+')':'nothing got through')+'</p>';
  var ea=r.items.filter(function(i){return i.earned;}),no=r.items.filter(function(i){return !i.earned;}),pn=r.pieces.filter(function(i){return !i.earned;});
  h+='<p><b>Earned its place:</b> '+(ea.length?ea.map(function(i){return i.icon+' '+labEsc(i.name)+' <small>(saved '+i.saved+' pts, '+i.savedParts+' parts)</small>';}).join(' · '):'no defence did')+'</p>';
  h+='<p><b>Did nothing:</b> '+(no.length?no.map(function(i){return i.icon+' '+labEsc(i.name)+' <small>('+i.verdict+')</small>';}).join(' · '):'every defence did something')+(pn.length?'<br><small>Pieces whose loss changed nothing: '+pn.map(function(i){return labEsc(i.name);}).join(', ')+'</small>':'')+'</p>';
  h+='<p><b>Raid of mice:</b> lost '+r.raid.parts+' parts (bare camp '+r.raid.bareParts+'), sent '+r.raid.sentBack+' mice back. '+(r.raid.held?'Held.':'Not held.')+'</p><textarea id="labDefText" readonly style="width:100%;height:90px;font-size:12px"></textarea>';return h;}
/* ---- screenshots: defence-1 to defence-8 (made by tests/lab-shots.js) ---- */
SG.defShot=function(name){SG.start('blue',{mode:'lab',seed:777});var L=SG.lab;L.card=false;L.panel=false;L.read=false;L.topple=false;SG.setProto('defences',true,false);SG.cam=3;L.tool='def';
  function focus(cx,cz,zoom,y,el,yaw){L.focus={x:cx,z:-cz,zoom:zoom,y:y||0,el:el,yaw:yaw||0};SG.camSnap=true;}
  function sel(kind){var it=DEF.items.filter(function(i){return i.side===1&&i.kind===kind;})[0];DEF.sel=it?it.id:0;return it;}
  function run(secs){for(var i=0;i<secs*60;i++)SG.step(STEP);}
  function crew(){defCrewNow(1);}
  function raid(n,lat){var out=[];for(var k=1;k<=n;k++){var m=SG.mice[k],w=hillSpot(1,(k-(n+1)/2)*(lat||.3),.55);m.x=w[0];m.z=w[1];m.tx=w[0];m.tz=w[1];m.path=null;m.state='go';m.cd=0;m.dj={k:'raid',pulls:0};out.push(m);}return out;}
  var u=U();
  if(name==='defence-1-courtyard'){labLoadTarget('courtyard',true);SG.step(.1);crew();sel('counter');run(.5);focus(0,1.9,.5,.1,.62,0);}
  else if(name==='defence-2-popgun'){labLoadTarget('courtyard',true);SG.step(.1);crew();raid(3,.3);var it=sel('pop');for(var t=0;t<900&&!DEF.stats.pops;t++)SG.step(STEP);run(.25);focus(0,1.15,.55,.05,.6,0);}
  else if(name==='defence-3-counter'){labLoadTarget('courtyard',true);DEF.items.filter(function(i){return i.kind==='sling';}).forEach(defRemove);SG.step(.1);crew();L.gunDown=0;SG.labSetAmmo('marble');var sp=SG.labDefaultSpot();LAB_GUNR=CD().test.gunR;SG.labFire(0,'gun',sp.x,sp.z,{force:true,seed:5});LAB_GUNR=3.15;for(var t2=0;t2<600&&!SG.marbles.some(function(a){return a.def&&a.live&&a.t>.7;});t2++)SG.step(STEP);sel('counter');focus(.3,.7,.85,.25,.75,0);}
  else if(name==='defence-4-traps'){labLoadTarget('courtyard',true);SG.step(.1);crew();raid(3,.34);for(var t3=0;t3<1500&&DEF.stats.sprung<2;t3++)SG.step(STEP);run(.3);DEF.view='builder';focus(0,1.1,.55,.05,.65,0);}
  else if(name==='defence-5-upkeep'){labLoadTarget('courtyard',true);SG.step(.1);crew();var it5=sel('pop');it5.ammo=0;it5.jam=.75;var sl=DEF.items.filter(function(i){return i.kind==='sling';})[0];sl.jam=1;sl.jammed=true;run(3);focus(-.2,1.5,.5,.1,.62,0);}
  else if(name==='defence-6-rooms'){labLoadTarget('rooms',true);SG.step(.1);crew();sel('pop');run(.3);focus(0,2.0,.8,.1,.9,0);}
  else if(name==='defence-7-warden'){labLoadTarget('courtyard',true);SG.step(.1);crew();var wd=sel('warden'),wpc=defWallAt(1,wd.x,wd.z);for(var i7=0;i7<3;i7++)knock(wpc,nearestPart(wpc,wpc.x,0,wpc.z,true),0,1,'debug');fixGrid();run(8.6);focus(.54,1.35,.35,.05,.7,.4);}
  else if(name==='defence-8-report'){labLoadTarget('courtyard',true);SG.step(.1);L.panel=true;var r=SG.defTest();L.defOut=r;if(hasDom){labUi();E('labDefTxt').innerHTML=defReportHtml(r);E('labDefText').value=SG.defReportText(r);E('labDefBox').style.display='flex';}focus(0,1.9,.5,.1,.62,0);}
  SG.step(.2);if(hasDom)labUi();};
/* ================= end of DEFENCES ================= */

/* ---- the Arsenal panel, the matrix table, the report text, the drawing, the screenshots ---- */
var ARS_INFO={awning:'Stops a lob from above (the blast keeps 25%). Wears: a panel for every 1.6 Marbles it takes (3 panels).',shield:'Stops a flat shot (the blast keeps 20%). Wears: 4 planks.',ditch:'Swallows rollers: 4 to a lane, 3 lanes, then a lane is filled in.',logs:'Stops a roller (a log comes off every 2nd one, 3 logs); also stops a flat shot (35%).',net:'Catches beads and a hook, one strip per 10 caught (3 strips).',cutter:'Cuts a hook string that passes near it; the blade comes off (2).',brace:'Holds a wall or Keep against a strong thump (the kit brace).',heavy:'Does not move. Shelters near it from a gust.',lowwall:'Knee high: shelters a little from a gust, and a roller hops it.'};
var ARS_FOR={lobber:['awning'],flinger:['shield','logs'],roller:['ditch','logs'],popper:['net'],hook:['cutter','net'],thumper:['brace'],fan:['heavy','lowwall']};
SG.arsFor=ARS_FOR;SG.arsFams=ARS_FAMS;SG.arsExtra=ARS_EXTRA;SG.arsCamps=ARS_CAMPS;SG.arsStock=ARS_STOCK;
function arsUi(){if(!hasDom||!SG.lab||!E('labArs'))return;var L=SG.lab,on=!!LAB_FLAGS.arsenal,h='<div class="lnote">Seven families of weapon, and the cheap pieces that counter them. Switch the weapons on, load a test camp from Target camp ("Arsenal: ..."), and press Counter matrix to fire every weapon at every camp.</div>'+
  '<div class="lgrid"><button class="btn lb'+(on?' on':'')+'" data-a="ars_toggle">Arsenal weapons: '+(on?'on':'off')+'</button><button class="btn lb go" data-a="ars_matrix">📊 Counter matrix</button></div><h4 class="wh">Weapons</h4>';
  h+=ARS_FAMS.map(function(f){var A=AMMO[f.ammo],d=ARS_W.filter(function(q){return q.id===f.ammo;})[0];return '<div class="lrow"><button class="btn lb" data-a="ars_use_'+f.id+'">'+(A?labEsc(A.icon):'')+' '+labEsc(f.name)+'</button><span><small>'+(A?wPrice(A.w)+' pts · ':'switch on · ')+labEsc(d?d.note:'The Marble, lobbed. High lob (the button) goes over walls with half the blast.')+'</small></span></div>';}).join('');
  h+='<h4 class="wh">Counter pieces (Build bar)</h4>'+ARS_COUNTER_ORDER.map(function(k){return '<div class="lrow"><button class="btn lb" data-a="ars_kind_'+k+'">'+(LAB_ICON[k]||'')+' '+labEsc(labName(k))+'</button><span><small>'+(C2.cost[k]==null?'':C2.cost[k]+' pt · ')+labEsc(ARS_INFO[k]||'')+'</small></span></div>';}).join('');
  if(L.arsKey!==h){L.arsKey=h;E('labArs').innerHTML=h;}}
var ARS_COUNTER_ORDER=['awning','shield','ditch','logs','net','cutter','brace','heavy','lowwall'];
function arsAct(a){var L=SG.lab,x;
  if(a==='ars_toggle'){SG.setProto('arsenal',!LAB_FLAGS.arsenal);labMsg(LAB_FLAGS.arsenal?'Arsenal weapons are in the ammo row':'Arsenal weapons are off',false);labUi();return;}
  if(a.indexOf('ars_use_')===0){var f=ARS_FAMS.filter(function(q){return q.id===a.slice(8);})[0];if(!f)return;if(!LAB_FLAGS.arsenal)SG.setProto('arsenal',true);SG.labSetAmmo(f.ammo);SG.labSetHigh(false);if(L.tool!=='gun'&&L.tool!=='fire')SG.labTool('gun');labMsg(f.name+' is chosen',false);return;}
  if(a.indexOf('ars_kind_')===0){L.kind=a.slice(9);if(L.tool!=='build')SG.labTool('build');L.ghost.on=true;labUi();return;}
  if(a==='ars_matrix'){labMsg('Firing every weapon at every camp...',false);var go=function(){x=SG.labMatrix();L.matOut=x;E('labMatTxt').innerHTML=arsMatHtml(x);E('labMatBox').style.display='flex';labUi();};if(typeof setTimeout==='function')setTimeout(go,30);else go();return;}
  if(a==='ars_matok'){E('labMatBox').style.display='none';return;}}
function arsMatHtml(r){var h='<div class="lnote">'+r.weapons.length+' weapons, '+r.camps.length+' camps. Each cell: a fresh copy of the camp, '+r.shots+' shots (the aim spot and four round it), the mean of '+r.seeds+' seeds, free gun, Chain topple off. <b>Points</b>: a camp part 1, a collapse 3, a Keep felled 10, a mouse dizzied, slowed or blown .25. The counters\' own wear is not counted. Prices in budget points: '+r.camps.filter(function(c){return c.id!=='bare';}).map(function(c){return labEsc(c.name)+' '+r.prices[c.id];}).join(', ')+'.</div>';
  h+='<table class="lt wide"><tr><th>Weapon (price)</th>'+r.camps.map(function(c){return '<th>'+labEsc(c.name)+'</th>';}).join('')+'</tr>';
  r.weapons.forEach(function(w){h+='<tr><td>'+labEsc(w.name)+' ('+w.price+')</td>'+r.camps.map(function(c){var q=w.cells[c.id],red=c.id==='bare'?null:w.reduction[c.id],cls=red==null?'':(red>=ARS_COUNTERED?' class="ok"':'');return '<td'+cls+'>'+q.score.toFixed(1)+'<br><small>'+q.camp+' parts'+(q.counter?' · wear '+q.counter:'')+(q.mice?' · '+q.mice+' mice':'')+(red==null?'':' · '+(red>0?'-':'+')+Math.abs(red)+'%')+'</small></td>';}).join('')+'</tr>';});
  h+='</table><h4 class="wh">Verdicts</h4><ul class="ls">'+r.weapons.map(function(w){return '<li><b>'+labEsc(w.name)+'</b>: '+labEsc(w.verdict)+'</li>';}).join('')+'</ul>';
  h+='<h4 class="wh">Strong against (no counters in these camps)</h4><table class="lt wide"><tr><th>Weapon</th>'+r.stock.map(function(t){return '<th>'+labEsc(t.name)+'</th>';}).join('')+'</tr>'+r.weapons.map(function(w){return '<tr><td>'+labEsc(w.name)+'</td>'+r.stock.map(function(t){var q=w.stock[t.id];return '<td'+(w.strongVs===t.id?' class="ok"':'')+'>'+(q?q.score.toFixed(1):'-')+'</td>';}).join('')+'</tr>';}).join('')+'</table>';
  return h;}
/* the text of ARSENAL_REPORT.md: the matrix as a table, the verdicts, honest notes. The tests write it. */
SG.labMatrixMd=function(r){var L=[],pad=function(s,n){s=String(s);while(s.length<n)s+=' ';return s;},nm=function(id){return r.camps.filter(function(c){return c.id===id;})[0].name;};
  L.push('# Arsenal report: seven weapons against nine camps','');
  L.push('Made by `tests/lab-test.js` (`SG.labMatrix()`), written every run. Same camp every time (a Keep behind a gate and two walls, a tent and a workshop); only the counter changes. Piece scale '+r.scale+'. Free gun, fixed seed '+r.seed+', each cell a fresh copy of the camp.','');
  L.push('**How a cell is made.** '+r.shots+' shots: one at the aim spot and four round it (the first five points of the range report\'s carpet), nothing mended between them. The same volley at '+r.seeds+' seeds; the cell is the mean. Chain topple is off, so a falling piece does not knock its neighbours. **Points**: a part of the camp off 1, a collapse 3, a Keep felled 10, a mouse dizzied, slowed or blown .25. What the counters lose (their wear) is shown but not counted: a counter is there to be hit. "-80%" means 80% fewer points than the bare camp. A counter "counters" a weapon when it cuts the points by '+ARS_COUNTERED+'% or more.','');
  L.push('## Points (camp parts lost, then counter wear, then mice)','');
  L.push('| Weapon (price) | '+r.camps.map(function(c){return c.name+(c.id==='bare'?'':' ('+r.prices[c.id]+' pt)');}).join(' | ')+' |');L.push('|---|'+r.camps.map(function(){return '---:';}).join('|')+'|');
  r.weapons.forEach(function(w){L.push('| '+w.name+' ('+w.price+') | '+r.camps.map(function(c){var q=w.cells[c.id];return '**'+q.score.toFixed(1)+'** '+q.camp+'p'+(q.counter?' w'+q.counter:'')+(q.mice?' m'+q.mice:'')+(c.id==='bare'?'':' ('+(w.reduction[c.id]>0?'-':'+')+Math.abs(w.reduction[c.id])+'%)');}).join(' | ')+' |');});
  L.push('','`p` camp parts lost, `w` counter parts lost (wear), `m` mice dizzied, slowed or blown.','','## Verdicts','');
  r.weapons.forEach(function(w){L.push('- **'+w.name+'** (price '+w.price+' points): '+w.verdict+'.');});
  L.push('','## What each weapon is strong against (camps with no counter in them)','');
  L.push('| Weapon | '+r.stock.map(function(t){return t.name;}).join(' | ')+' |');L.push('|---|'+r.stock.map(function(){return '---:';}).join('|')+'|');
  r.weapons.forEach(function(w){L.push('| '+w.name+' | '+r.stock.map(function(t){var q=w.stock[t.id];return q?(w.strongVs===t.id?'**'+q.score.toFixed(1)+'**':q.score.toFixed(1)):'-';}).join(' | ')+' |');});
  L.push('','Bold is the weapon\'s best camp of the six.','','## Counter prices against weapon prices (budget points)','');
  L.push('| Counter | Price | Aimed at | Weapon price |');L.push('|---|---:|---|---:|');
  var pr={awning:C2.cost.awning,shield:C2.cost.shield,ditch:C2.cost.ditch,logs:C2.cost.logs,net:C2.cost.net,cutter:C2.cost.cutter,brace:C2.cost.brace,heavy:C2.cost.heavy,lowwall:C2.cost.lowwall};
  Object.keys(ARS_FOR).forEach(function(fid){var w=r.weapons.filter(function(q){return q.id===fid;})[0];ARS_FOR[fid].forEach(function(k){L.push('| '+labName(k)+' | '+pr[k]+' | '+(w?w.name:fid)+' | '+(w?w.price:'')+' |');});});
  L.push('','Prices of weapons are `wPrice` (my formula, not tested against play). Counters cost from half a point to a point and a half. A camp row costs: '+r.camps.filter(function(c){return c.id!=='bare';}).map(function(c){return c.name+' '+r.prices[c.id];}).join(', ')+'.','');
  return L.join('\n');};
/* ---- drawing: a gust (a ring and streaks that slide along the wind) and a hook's string ---- */
function arsViewInit(){var A=V.ars={rings:[],streaks:null,string:null,i:0};for(var i=0;i<3;i++)A.rings.push(labFlat(new THREE.RingGeometry(.9,1,40),0xbfe8ff,.5));
  function mk(n,col,op){var geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*6),3));var o=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:col,transparent:true,opacity:op,depthTest:false}));o.frustumCulled=false;o.renderOrder=21;o.visible=false;S.add(o);return o;}
  A.streaks=mk(90,0xe8f6ff,.8);A.string=mk(8,0xf5e6b0,.95);}
function arsView(){if(!V.on||SG.mode!=='lab')return;if(!V.ars)arsViewInit();var A=V.ars,G=SG.gusts||[],i,n=0,pos=A.streaks.geometry.attributes.position,gi=0;
  for(i=0;i<A.rings.length;i++)A.rings[i].visible=false;
  G.forEach(function(g){var age=g.age;if(age>=g.life||gi>=A.rings.length)return;var env=Math.min(1,age/.25,(g.life-age)/.5),rg=A.rings[gi++];rg.visible=true;rg.position.set(g.x,.014,g.z);rg.scale.setScalar(g.r*(.96+.04*Math.sin(SG.clock*9)));rg.material.opacity=.45*env;
    for(var k=0;k<14&&n<45;k++){var ph=((k*.37+age*.55)%1),pr=((k*.6180339)%1),ax=(pr-.5)*2*g.r*.9,ay=((k*.43)%1-.5)*2*g.r*.7;   /* streak k: starts upwind, slides downwind across the field */
      var cx=g.x-g.dx*g.r*.8+g.dx*ph*g.r*1.6+(-g.dz)*ax*.0+(-g.dz)*ay*.55,cz=g.z-g.dz*g.r*.8+g.dz*ph*g.r*1.6+(g.dx)*ay*.55,yy=.04+((k*.29)%1)*.34,len=g.r*.3;
      pos.setXYZ(n*2,cx,yy,cz);pos.setXYZ(n*2+1,cx+g.dx*len,yy,cz+g.dz*len);n++;}});
  A.streaks.visible=n>0;A.streaks.geometry.setDrawRange(0,n*2);pos.needsUpdate=true;
  /* a hook's string, from the gun to the ball */
  var sp=A.string.geometry.attributes.position,m=0;SG.marbles.forEach(function(a){if(!a.tw||!a.live||a.t<0||m>=3)return;var q=a.snag?[a.hx||a.x1,.1,a.hz||a.z1]:marblePos(a,Math.min(1,a.t/a.T));sp.setXYZ(m*2,a.sx,.42*U()+.04,a.sz);sp.setXYZ(m*2+1,q[0],q[1]+.03,q[2]);m++;});
  A.string.visible=m>0;A.string.geometry.setDrawRange(0,m*2);sp.needsUpdate=true;}
function arsViewHide(){var A=V.ars;if(!A)return;A.rings.forEach(function(r){r.visible=false;});A.streaks.visible=false;A.string.visible=false;}
/* ---- screenshots: arsenal-1 to arsenal-8, one weapon in action each, two of them showing a counter ---- */
SG.arsShot=function(name){SG.start('blue',{mode:'lab',seed:777});var L=SG.lab;L.card=false;L.panel=false;L.read=true;L.topple=false;SG.setProto('arsenal',true,false);SG.cam=3;L.tool='gun';
  var Y=arsLayout();function aimAt(id){var f=ARS_FAMS.concat(ARS_EXTRA).filter(function(q){return q.id===id;})[0],a=f.aim(Y),w=w2(1,a[0],a[1]);return {f:f,x:w[0],z:w[1]};}
  function focus(cz,zoom,y,el,yaw,cx){L.focus={x:cx||0,z:-cz,zoom:zoom,y:y||0,el:el,yaw:yaw||0};SG.camSnap=true;}   /* cz: how far along the target camp (its Keep is at 2.55) */
  function load(camp,id){labLoadTarget('ars_'+camp,true);var q=aimAt(id);L.ammo=q.f.ammo;L.high=!!q.f.high;SG.sides.forEach(function(sd){sd.ammo=q.f.ammo;sd.high=!!q.f.high;});L.gunAim={tx:q.x,tz:q.z};return q;}
  function fire(camp,id,seed,until,after){var q=load(camp,id),a=SG.labFire(0,'gun',q.x,q.z,{force:true,seed:seed});for(var i=0;i<900&&!until(a);i++)SG.step(STEP);for(i=0;i<(after||0);i++)SG.step(STEP);return a;}
  var landed=function(){return !!(L.cur&&L.cur.landings.length);};
  if(name==='arsenal-1-lobber'){fire('roof','lobber',5,landed,16);focus(2.25,.5,.1,.62,.55);}
  else if(name==='arsenal-2-flinger'){fire('bare','flinger',5,function(a){return a&&a.pn>0;},4);focus(2.2,.42,.05,.45,.8);}
  else if(name==='arsenal-3-roller'){fire('ground','roller',5,function(a){return a&&a.rl&&a.rl.stopped;},10);focus(1.9,.45,.05,.55,.6);}
  else if(name==='arsenal-4-popper'){fire('net','popper',5,function(a){return SG.stats.caught>=4;},6);focus(2.3,.45,.15,.6,.5);}
  else if(name==='arsenal-5-hook'){fire('bare','hook',5,function(a){return a&&a.snag;},14);focus(1.4,.55,.25,.5,.45);}
  else if(name==='arsenal-6-thumper'){fire('bare','thumper',5,landed,12);focus(2.25,.5,.1,.6,.4);}
  else if(name==='arsenal-7-fan-and-heavy'){fire('all','fan',5,landed,80);focus(2.4,.5,.15,.6,.5);}
  else if(name==='arsenal-8-shield-and-ditch'){load('all','flinger');var q2=aimAt('flinger');SG.labFire(0,'gun',q2.x,q2.z,{force:true,seed:5});SG.labSettle(10);L.ammo='roller';SG.sides.forEach(function(sd){sd.ammo='roller';});var q3=aimAt('roller');SG.labFire(0,'gun',q3.x,q3.z,{force:true,seed:6});SG.labSettle(10);SG.step(.3);focus(2.1,.62,.1,.8,.5);}
  SG.step(.2);if(hasDom)labUi();};

/* ---- the range report: every kind of ammunition, in turn, at a fresh copy of the target ---- */
var LAB_SEED=424242,LAB_CARPET=[[0,0],[.22,0],[-.22,0],[0,.22],[0,-.22],[.22,.22],[-.22,.22],[.22,-.22],[-.22,-.22],[0,0]];   /* the ten aim points of a salvo, round the spot, in units that follow the piece scale */
/* run fn with my camp off the table, nothing drawn, no sound, and everything (table, counters, ammunition, undo) put back as it was */
function labSandbox(fn){var L=SG.lab,keep={table:SG.labSnapshot(),stats:JSON.parse(JSON.stringify(SG.stats)),last:L.last,cur:L.cur,seed:SG.seed,aim:SG.sides[0].aim,undo:[L.undo,L.redo],sess:L.sess,base:L.base,fell:L.fellLog,land:L.landings,quick:L.quick,ammo:L.ammo,high:L.high,hold:SG.hold,von:V.on,burst:L.lastBurst,msg:L.msg},out;
  labRemoveSide(0);labRepoint();fixGrid();L.quick=true;SG.marbles=[];SG.debris=[];SG.fuses=[];SG.puddles=[];SG.hold=true;V.on=false;   /* nothing still flying from before can land on the test */
  try{out=fn();}finally{
    V.on=keep.von;SG.hold=keep.hold;L.quick=keep.quick;SG.labRestore(keep.table);SG.stats=keep.stats;L.last=keep.last;L.cur=keep.cur;SG.seed=keep.seed;SG.sides[0].aim=keep.aim;SG.pops=[];L.undo=keep.undo[0];L.redo=keep.undo[1];L.sess=keep.sess;L.base=keep.base;L.fellLog=keep.fell;L.landings=keep.land;L.lastBurst=keep.burst;L.msg=keep.msg;
    SG.shake=0;SG.slowT=0;SG.topN=0;SG.lastDir=null;chainDepth=0;L.ammo=keep.ammo;L.high=keep.high;SG.sides.forEach(function(sd){sd.ammo=L.ammo;sd.high=L.high;});L.rkey='';}
  return out;}
/* one shot (and a salvo of N) of one kind of ammunition at a fresh copy of the target (saved[1]); v = {id, high, after, label} */
function labVariant(v,spot,N){var L=SG.lab;SG.labReset(1);SG.acc=0;SG.step(.1);L.ammo=v.after||v.id;L.high=v.high;L.sess={keeps:0,score:0,chain:0};SG.topN=0;
  if(v.after){L.ammo=v.after;L.high=false;SG.labFire(0,'gun',spot.x,spot.z,{force:true,seed:LAB_SEED});SG.labSettle(10);SG.topN=0;}
  L.ammo=v.id;L.high=v.high;SG.sides.forEach(function(sd){sd.ammo=v.id;sd.high=v.high;});
  var a=SG.labFire(0,'gun',spot.x,spot.z,{force:true,seed:LAB_SEED}),cur=SG.labSettle(10),hit=cur&&cur.landings[0],A=AMMO[v.id];
  var row={ammo:v.id,name:v.label||(A.name+(v.high?' (high lob)':'')),high:v.high,after:v.after||'',fired:!!a,partsOff:cur?cur.partsOff:0,collapses:cur?cur.collapses:0,keep:!!(cur&&cur.keep),dizzies:cur?cur.dizzies:0,glued:cur?cur.glued:0,bounces:cur?cur.bounces:0,
    landed:hit?(hit.hit?labName(hit.hit)+(hit.hitSide===1?'':' (mine)'):'ground'):'-',fell:cur?cur.fell.slice():[]};
  /* then a salvo: the same ammunition again and again, spread over the camp round the spot (LAB_CARPET), nothing mended in between. A single shot rarely brings anything down; a salvo shows what the ammunition can do. */
  if(N>0&&(!v.after||v.salvoAfter)){var tot={shots:N,parts:0,collapses:0,keepAt:0,firstCollapse:0,dizzies:0};SG.labReset(1);SG.acc=0;SG.step(.1);L.ammo=v.id;L.high=v.high;
    for(var i=1;i<=N;i++){var of=LAB_CARPET[(i-1)%LAB_CARPET.length],u=U();SG.topN=0;
      if(v.after){L.ammo=v.after;L.high=false;SG.labFire(0,'gun',spot.x+of[0]*u,spot.z+of[1]*u,{force:true,seed:LAB_SEED+i});SG.labSettle(10);SG.topN=0;L.ammo=v.id;L.high=v.high;SG.sides.forEach(function(sd){sd.ammo=v.id;sd.high=v.high;});}   /* a weapon that needs damage to work on (a quake) follows a Marble each time */
      SG.labFire(0,'gun',spot.x+of[0]*u,spot.z+of[1]*u,{force:true,seed:LAB_SEED+i});var c=SG.labSettle(10);if(!c)continue;tot.parts+=c.partsOff;tot.collapses+=c.collapses;tot.dizzies+=c.dizzies;if(c.collapses&&!tot.firstCollapse)tot.firstCollapse=i;if(c.keep&&!tot.keepAt)tot.keepAt=i;}
    row.salvo=tot;}
  return row;}
SG.labRange=function(o){var L=SG.lab;o=o||{};var spot=o.spot||L.spot||SG.labDefaultSpot(),N=o.salvo==null?10:o.salvo;
  var ids=o.ammo||AMMO_ORDER.concat(Object.keys(AMMO).filter(function(k){return AMMO_ORDER.indexOf(k)<0;})),variants=[];
  ids.forEach(function(id){variants.push({id:id,high:false});if(!AMMO[id].w.flat)variants.push({id:id,high:true});});
  if(!o.ammo||ids.indexOf('glue')>=0)variants.push({id:'glue',high:false,after:'marble',label:'Glue blob (after a Marble)'});
  var rows=labSandbox(function(){return variants.map(function(v){return labVariant(v,spot,N);});});
  return {spot:spot,from:'free gun',seed:LAB_SEED,target:L.target,pieceScale:SG.pieceSize,rows:rows,settings:{salvo:N,reload:'quick (0.3 s)',crew:'not needed',aim:'free gun on the near rim, aimed at ('+spot.x.toFixed(2)+', '+spot.z.toFixed(2)+')',seed:LAB_SEED,topple:!!L.topple,note:'Each shot is fired at a fresh copy of the target. Only the Keep, mice and pieces of the target camp are on the table.'}};};
/* ---- Rate it: one weapon (and, for comparison, a Marble and a Big Marble) against every target, one shot and a short salvo each ---- */
var LAB_RATE_T=['walled','braced','longwall','workshops','fortress','glass','castle','village','maze','domino','stack'];
function labScore(t,R){return (t.parts*R.parts+t.collapses*R.collapse+t.keeps*R.keep+t.dizzies*R.dizzy)*R.single+(t.sParts*R.parts+t.sCollapses*R.collapse+t.sKeeps*R.keep+t.sDizzies*R.dizzy)*R.salvoShare;}
SG.labRate=function(wid,o){var L=SG.lab,R=C3.rate;o=o||{};if(!AMMO[wid])return null;var N=o.salvo==null?R.salvo:o.salvo,ids=[wid].concat(['marble','big'].filter(function(x){return x!==wid;})),tg=o.targets||LAB_RATE_T;
  return labSandbox(function(){var res={weapon:wid,name:AMMO[wid].name,price:wPrice(AMMO[wid].w),salvo:N,ids:ids,targets:[],totals:{}};
    ids.forEach(function(id){res.totals[id]={parts:0,collapses:0,keeps:0,dizzies:0,sParts:0,sCollapses:0,sKeeps:0,sDizzies:0,oneShotKeeps:0,keepTargets:0,score:0};});
    tg.forEach(function(tid){labSetSide(1,labTemplate(tid,1),true);L.target=tid;var ps=SG.pieces.filter(function(q){return q.side===1&&q.built;}),hasKeep=ps.some(function(q){return q.kind==='tower';}),spot=SG.labDefaultSpot(),item={id:tid,title:labTargetName(tid),keep:hasKeep,pieces:ps.length,rows:{}};
      ids.forEach(function(id){var r=labVariant(AMMO[id].w.quake>0?{id:id,high:false,after:'marble',salvoAfter:true}:{id:id,high:false},spot,N),t=res.totals[id];item.rows[id]={partsOff:r.partsOff,collapses:r.collapses,keep:r.keep,dizzies:r.dizzies,salvo:r.salvo};
        t.parts+=r.partsOff;t.collapses+=r.collapses;t.keeps+=r.keep?1:0;t.dizzies+=r.dizzies;if(hasKeep){t.keepTargets++;if(r.keep)t.oneShotKeeps++;}
        if(r.salvo){t.sParts+=r.salvo.parts;t.sCollapses+=r.salvo.collapses;t.sKeeps+=r.salvo.keepAt?1:0;t.sDizzies+=r.salvo.dizzies;}});res.targets.push(item);});
    ids.forEach(function(id){res.totals[id].score=Math.round(labScore(res.totals[id],R)*10)/10;});
    var t0=res.totals[wid],M=Math.max(1,res.totals.marble.score),B=Math.max(1,res.totals.big.score),sc=t0.score;
    res.tooStrong=t0.keepTargets>0&&t0.oneShotKeeps===t0.keepTargets;
    res.verdict=res.tooStrong?'too strong: it fells a Keep in one shot against every target':(sc>=R.much*B?'much stronger than Big Marble':(sc>=R.likeHi*B?'stronger than Big Marble':(sc>=R.likeLo*B?'about like a Big Marble':(sc>=R.likeHi*M?'stronger than a Marble':(sc>=R.likeLo*M?'about like a Marble':(sc>=R.little*M?'weaker than a Marble':'does little'))))));
    if(!res.tooStrong&&sc>=R.likeHi*B&&t0.sKeeps<res.totals.big.sKeeps)res.verdict+=', though it fells fewer Keeps ('+t0.sKeeps+' of '+t0.keepTargets+' salvos, a Big Marble '+res.totals.big.sKeeps+')';
    res.verdicts={};ids.forEach(function(id){var s2=res.totals[id].score;res.verdicts[id]=s2>=R.much*B?'much stronger than Big Marble':(s2>=R.likeHi*B?'stronger than Big Marble':(s2>=R.likeLo*B?'about like a Big Marble':(s2>=R.likeHi*M?'stronger than a Marble':(s2>=R.likeLo*M?'about like a Marble':(s2>=R.little*M?'weaker than a Marble':'does little')))));});
    return res;});};

/* ---- big targets (Lab only): Castle, Village, Wall maze, Domino row, Tower stack. Each is a list of [kind, x, z, turn] in the camp's frame, sized by the piece scale (laid out for small and medium pieces; large ones crowd the table). ---- */
function labBigTemplate(id,s){var F=FOOT,T=PI,l=[],i,k;
  if(id==='castle'){   /* a Keep with four corner towers, long walls, a gate, a courtyard with workshops, tents, lobbers and traps: about 38 pieces */
    var sp=F.wall[0]*2+.004,gx=F.gate[0]+F.wall[0]+.01,zf=1.15,xe=gx+sp+F.wall[0],xc=xe+F.tower[0]+.01,zs=zf+F.tower[1]+F.wall[0]+.01,zb=zs+sp+F.wall[0]+F.tower[1]+.01,bx=F.tower[0]+F.brace[1]+.015;
    l.push(['gate',0,zf,T]);for(i=0;i<2;i++)l.push(['wall',-(gx+i*sp),zf,T],['wall',gx+i*sp,zf,T]);
    [-1,1].forEach(function(sx){l.push(['tower',sx*xc,zf,T],['tower',sx*xc,zb,T]);for(var j=0;j<2;j++)l.push(['wall',sx*xc,zs+j*sp,T+sx*PI/2]);});
    for(i=0;i<5;i++)l.push(['wall',(i-2)*sp,zb,T]);
    l.push(['tower',0,2.15,T],['brace',-bx,2.15,-PI/2],['brace',bx,2.15,PI/2],['workshop',-.6,1.55,T],['workshop',.6,1.55,T],['lobber',-.2,1.6,T],['lobber',.2,1.6,T],['tent',-.8,2.2,T],['tent',.8,2.2,T],['tent',-1.05,1.6,T],['tent',1.05,1.6,T]);
    for(i=-1;i<=1;i++)l.push(['wall',i*.5,1.88,T]);
    l.push(['trap',-.3,.95,T],['trap',.3,.95,T],['trap',-1.1,1.3,T],['trap',1.1,1.3,T]);}
  else if(id==='village'){   /* many small camps across the far half: a tent with a wall, or a workshop, or a trap beside it, and a chief's hall at the back */
    var cs=[[-1.55,1.15],[-.55,1.05],[.55,1.15],[1.55,1.05],[-1.35,2.0],[-.4,1.95],[.5,2.05],[1.4,1.95],[-.85,2.7],[.9,2.65]],tx=F.tent[0];
    cs.forEach(function(c,n){var x=c[0],z=c[1];l.push(['tent',x,z,T+(n%3-1)*.35]);
      if(n%3===0)l.push(['wall',x,z+tx+.12,T]);else if(n%3===1)l.push(['workshop',x+tx+F.workshop[0]+.04,z,T]);else l.push(['trap',x+tx+.15,z,T],['wall',x,z-tx-.12,T]);});
    l.push(['tower',0,2.45,T]);}
  else if(id==='maze'){   /* three rings of walls round a Keep, a gate in each ring, the gates on opposite sides so a way in is a way round */
    var cz=1.85,rings=[[.46,Math.PI],[.78,0],[1.1,Math.PI]];l.push(['tower',0,cz,T]);
    rings.forEach(function(rg){var R=rg[0],n=Math.floor(Math.PI/Math.asin(F.wall[0]/R)),done=false;for(k=0;k<n;k++){var th=rg[1]+k*2*Math.PI/n;l.push([k===0?'gate':'wall',R*Math.sin(th),cz+R*Math.cos(th),th]);}});}
  else if(id==='domino'){   /* three lines of unbraced walls, each wall a little behind the one before: topple the first and it falls on the next */
    var pitch=F.wall[1]*2+.17;for(var c2=-1;c2<=1;c2++)for(i=0;i<8;i++)l.push(['wall',c2*1.0,1.0+i*pitch,T]);}
  else if(id==='stack'){   /* seven Keeps close together, two rows, with braces in the gaps: each leans on its neighbour */
    var pc=F.tower[0]*2+F.brace[1]*2+.03;for(i=0;i<4;i++)l.push(['tower',(i-1.5)*pc,2.45,T]);for(i=0;i<3;i++)l.push(['tower',(i-1)*pc,1.85,T]);
    for(i=0;i<3;i++)l.push(['brace',(i-1)*pc,2.45,PI/2]);for(i=0;i<2;i++)l.push(['brace',(i-.5)*pc,1.85,PI/2]);l.push(['brace',-1.5*pc-F.tower[0]-F.brace[1]-.015,2.45,PI/2],['brace',1.5*pc+F.tower[0]+F.brace[1]+.015,2.45,-PI/2]);}
  return labCampRecs(s,l);}
/* ---- the Building Yard (Lab only): the six buildings, laying them out, rebuilding one, the stage counts ----
   The six: Cottage, Barn, Watch tower house, Bridge + gatehouse, Windmill, Market row (three stalls side by side). Each is one piece with its own parts (models.js), 15 to 40, in three stages:
   trim (shutters, tiles, flags, awnings), walls, frame. A normal Marble takes a few bits of trim; a Big Marble breaks the nearest frame legs and a side comes down; a collapse may land on a neighbour (Chain topple). */
var LAB_BLD=[['cottage','Cottage'],['barn','Barn'],['lookout','Watch tower house'],['bridge','Bridge + gatehouse'],['windmill','Windmill'],['market','Market row']],LAB_YARD3=['cottage','barn','windmill'],LAB_STAGES=['trim','walls','frame'];
SG.labBuildings=LAB_BLD;
/* how many other parts would fall if this one part alone came off (the same rule as bSettle, asked without doing it) */
function bCascade(p,first){var gone={},n=0,more=true;gone[first]=1;
  while(more){more=false;for(var i=0;i<p.ps.length;i++){var q=p.ps[i];if(q.st!=='on'||gone[i]||!q.need||!q.need.length)continue;var c=0;for(var j=0;j<q.need.length;j++){var k=p.pi[q.need[j]];if(!gone[k]&&p.ps[k].st==='on')c++;}if(c<q.min){gone[i]=1;n++;more=true;}}}
  return n;}
/* one unit of a yard: a building, or the market row's three stalls; w, d the footprint, l the pieces [kind, dx, dz] round its middle */
function labUnit(id){var F=FOOT;if(id==='market'){var sw=F.stall[0]*2+.03*U();return {w:sw*3-.03*U(),d:F.stall[1]*2,l:[['stall',-sw,0],['stall',0,0],['stall',sw,0]]};}var f=F[id];return {w:f[0]*2,d:f[1]*2,l:[[id,0,0]]};}
/* up to three units side by side across a camp (two rows if they would not fit across), every piece facing the hill, as records for a camp */
function labYardRecs(list,s,rows2){var us=list.map(labUnit),gap=.16*U(),wid=function(a){return a.reduce(function(t,q){return t+q.w;},0)+gap*(a.length-1);},two=rows2||wid(us)>3.4,rows=two?[us.slice(0,Math.ceil(us.length/2)),us.slice(Math.ceil(us.length/2))]:[us],zr=two?[1.5,2.4]:[1.95],l=[];
  rows.forEach(function(row,ri){var x=-wid(row)/2;row.forEach(function(u){var cx=x+u.w/2;u.l.forEach(function(e){l.push([e[0],cx+e[1],zr[ri]+e[2],PI]);});x+=u.w+gap;});});
  return labCampRecs(s,l);}
/* are the records clear of each other and on the table? */
function labYardClear(recs){for(var i=0;i<recs.length;i++){var cs=corners(recs[i].kind,recs[i].x,recs[i].z,recs[i].rot);for(var k=0;k<4;k++)if(dist(cs[k][0],cs[k][1],0,0)>3.05)return false;for(var j=i+1;j<recs.length;j++)if(overlap(recs[i],recs[j]))return false;}return true;}
/* "Build your own yard": these buildings (up to three, by name) laid out across a camp. Undo brings back what was there. */
SG.labYard=function(list,s){var L=SG.lab;if(!L)return {ok:false,text:'Not in the Lab'};s=s==null?1:s;list=(list||[]).filter(function(id){return LAB_BLD.some(function(b){return b[0]===id;});}).slice(0,3);
  if(!list.length){labMsg('Pick a building first',true);return {ok:false,text:'Pick a building first'};}
  var recs=labYardRecs(list,s);if(!labYardClear(recs))recs=labYardRecs(list,s,true);if(!labYardClear(recs)){labMsg('Those do not fit on the table together',true);return {ok:false,text:'They do not fit'};}
  labSetUndoable(s,recs);if(s===1)L.target='yard';labMsg((list.length===1?'1 building':list.length+' buildings')+' placed in '+(s?'the target':'my')+' camp',false);return {ok:true,pieces:recs.length,list:list};};
/* Rebuild: every part of this building back on, at once (the piece's damage only: nothing else on the table is touched) */
SG.labRebuild=function(p){var L=SG.lab;if(!L)return false;if(typeof p==='number')p=pieceById(p);if(!p&&L.sel)p=pieceById(L.sel);if(!p||!p.total){labMsg('Tap a building first (Inspect tool)',true);return false;}
  if(p.down){var rec=labRec(p);labRemove(p);var np=labPutRaw(rec,true);labRepoint();fixGrid();labSaveSides();L.sel=np.id;labMsg(labName(np.kind)+' rebuilt',false);return true;}
  p.ps.forEach(function(q){q.st='on';q.used=false;q.swept=false;q.glue=0;q.mender=-1;q.rx=q.wx;q.rz=q.wz;});p.parts=p.total;p.fallen=false;SG.debris=SG.debris.filter(function(d){return d.pid!==p.id;});gridDirty=true;L.rkey='';
  labMsg(labName(p.kind)+' rebuilt',false);return true;};
/* what has come off the buildings in the last shot, by stage, and the buildings that collapsed */
SG.labStages=function(){var L=SG.lab,cur=L&&L.cur,o={trim:0,walls:0,frame:0,collapse:0,any:SG.pieces.some(function(p){return BK[p.kind];})};if(!cur)return o;
  (cur.parts||[]).forEach(function(q){if(q.stg!=null)o[LAB_STAGES[q.stg]]++;});o.collapse=cur.bcol||0;return o;};
/* the parts of every building that stand on something that is gone (there should be none), and the stage counts of one building: for tests and the range report */
SG.bldFloating=function(){var out=[];SG.pieces.forEach(function(p){if(BK[p.kind]&&p.pi)bFloating(p,-1).forEach(function(i){out.push(p.kind+':'+p.ps[i].id);});});return out;};
SG.bldStats=function(p){if(typeof p==='number')p=pieceById(p);var o={total:p.total,on:p.parts,stage:[{n:0,on:0},{n:0,on:0},{n:0,on:0}]};p.ps.forEach(function(q){var g=o.stage[q.stg];g.n++;if(q.st==='on')g.on++;});return o;};
SG.bldInfo=bldInfo;SG.BK=BK;
function labTargetName(id){var nm=LAB_TARGETS.filter(function(t){return t[0]===id;})[0];return nm?nm[1]:id;}
/* which pieces of a template overlap each other (by the real overlap rule): [] means it is laid out cleanly */
SG.labTemplateOverlaps=function(id){var recs=labTemplate(id,1),out=[];for(var i=0;i<recs.length;i++)for(var j=i+1;j<recs.length;j++)if(overlap(recs[i],recs[j]))out.push([recs[i].kind+' '+i,recs[j].kind+' '+j]);return out;};
/* ---- carnage: the counter, sweeping up, debris, the frame time ---- */
function labCarnageOf(c){var K=C3.carnage;return (c.partsOff||0)*K.part+(c.collapses||0)*K.collapse+(c.keeps||0)*K.keep+Math.max(0,(c.chain||0)-1)*K.chain+(c.dizzies||0)*K.dizzy;}
/* the counter: this shot so far (parts off, collapses, the chain, the most parts that fell at once), and the session (longest chain, carnage score) */
SG.labCarnage=function(){var L=SG.lab,cur=L.cur,st=SG.stats,live=!!cur;
  var parts=live?(cur.done?cur.partsOff:Math.max(0,st.partsOff-cur.b.partsOff)):0,col=live?(cur.done?cur.collapses:Math.max(0,st.collapses-cur.b.collapses)):0,diz=live?(cur.done?cur.dizzies:Math.max(0,st.dizzies-cur.b.dizzies)):0;
  var shot=Math.round(labCarnageOf({partsOff:parts,collapses:col,keeps:cur&&cur.keeps||0,chain:cur&&cur.chain||0,dizzies:diz}));
  return {parts:parts,collapses:col,chain:cur?(cur.chain||0):0,burst:cur?(cur.burst||0):0,shot:shot,longest:Math.max(L.sess.chain||0,cur?(cur.chain||0):0),score:Math.round((L.sess.score||0)+(cur&&!cur.done?shot:0))};};
/* "Sweep up": loose parts leave the table; the camps stay as damaged as they are (nothing is reset) */
SG.labSweep=function(){var n=0;SG.pieces.forEach(function(p){p.ps.forEach(function(q){if(q.st==='off'){q.st='gone';q.swept=true;n++;}});});if(SG.lab)labMsg(n?('Swept up '+n+' loose part'+(n>1?'s':'')):'Nothing to sweep up',!n);return n;};
/* debris must not slow the page: only so many fallen parts lie about, the oldest go first; with "Leave debris" off they go a few seconds after they land */
function labDebris(){var L=SG.lab;L.dbT=(L.dbT||0)+1;if(L.dbT<30)return;L.dbT=0;var off=[],i;SG.pieces.forEach(function(p){p.ps.forEach(function(q){if(q.st==='off')off.push(q);});});
  if(!L.debris){off.forEach(function(q){if(SG.clock-q.t0>C3.debrisSecs){q.st='gone';q.swept=true;}});}
  else if(off.length>C3.debrisMax){off.sort(function(a,b){return a.t0-b.t0;});for(i=0;i<off.length-C3.debrisMax;i++){off[i].st='gone';off[i].swept=true;}}}
SG.labDebrisCount=function(){var n=0;SG.pieces.forEach(function(p){p.ps.forEach(function(q){if(q.st==='off')n++;});});return n;};
/* the frame time of the page as drawn: the gap between frames and the time render() takes, with the draw calls and triangles of the last frame */
function labFrame(raw,rms){var L=SG.lab;if(!L||!(raw>0)||raw>1000)return;var f=L.frame;f.n++;f.ms=f.n===1?raw:f.ms*.92+raw*.08;f.rms=f.n===1?rms:(f.rms||0)*.92+rms*.08;f.worst=Math.max(f.worst*.995,raw);f.all=(f.all||0)+raw;f.rall=(f.rall||0)+rms;if(V.on&&R&&R.info){f.calls=R.info.render.calls;f.tris=R.info.render.triangles;}}
SG.labFrameStats=function(){var f=SG.lab?SG.lab.frame:null;if(!f)return null;return {frames:f.n,msAvg:f.n?+(f.all/f.n).toFixed(1):0,renderMsAvg:f.n?+(f.rall/f.n).toFixed(1):0,msSmooth:+f.ms.toFixed(1),worstMs:+f.worst.toFixed(1),calls:f.calls,triangles:f.tris,pieces:SG.pieces.length,parts:SG.pieces.reduce(function(n,p){return n+p.ps.length;},0)};};
SG.labFrameReset=function(){if(SG.lab)SG.lab.frame={ms:0,worst:0,n:0,calls:0,tris:0,rms:0,all:0,rall:0,t:0};};

/* ---- the Workshop's panel, the Rate it table, the carnage counter ---- */
function labWkDom(){var caps=C3.caps,h='<div class="lnote">Pick a base, move the sliders, name it, press Use it: it joins the ammo row at once. Every number is held to a safe range.</div><div class="lgrid">'+Object.keys(LAB_BASES).map(function(k){return '<button class="btn lb" data-a="wb_'+k+'">'+LAB_BASES[k].icon+' '+LAB_BASES[k].label+'</button>';}).join('')+'</div>'+
  '<div class="lgrid"><input id="labWkName" type="text" placeholder="Name your weapon" maxlength="40"></div><div id="labWkPrice" class="lnote"></div>';
  LAB_WPARAMS.forEach(function(q){var c=caps[q[0]];h+='<div class="wrow"><label for="wk_'+q[0]+'">'+q[1]+' <b id="wv_'+q[0]+'"></b></label><input type="range" id="wk_'+q[0]+'" data-w="'+q[0]+'" min="'+c[0]+'" max="'+c[1]+'" step="'+q[2]+'"></div>';});
  h+='<div class="lgrid">'+LAB_WBOOLS.map(function(q){return '<button class="btn lb" data-a="wt_'+q[0]+'">'+q[1]+'</button>';}).join('')+'</div>'+
  '<div class="lgrid"><button class="btn lb go" data-a="wuse">Use it</button><button class="btn lb go" data-a="wrate">📊 Rate it</button><button class="btn lb" data-a="wsave">Save</button><button class="btn lb" data-a="wcopy">Copy JSON</button><button class="btn lb" data-a="wpaste">Paste JSON</button></div>'+
  '<h4 class="wh">Presets</h4><div id="labWkPresets"></div><h4 class="wh">Saved weapons</h4><div id="labWkSaved"></div>';return h;}
function labWkFmt(v){return String(Math.round(v*100)/100);}
function labWkSync(){if(!hasDom||SG.mode!=='lab'||!SG.lab||!E('labWkPrice'))return;var k=labWkState(),w=k.w,ae=document.activeElement;
  LAB_WPARAMS.forEach(function(q){var inp=E('wk_'+q[0]),v=w[q[0]];if(inp&&inp!==ae&&+inp.value!==v)inp.value=v;var lb=E('wv_'+q[0]);if(lb){var t=labWkFmt(v);if(lb.textContent!==t)lb.textContent=t;}});
  LAB_WBOOLS.forEach(function(q){var b=E('lab').querySelector('[data-a="wt_'+q[0]+'"]');if(b)b.className='btn lb'+(w[q[0]]?' on':'');});
  Object.keys(LAB_BASES).forEach(function(bk){var b=E('lab').querySelector('[data-a="wb_'+bk+'"]');if(b)b.className='btn lb'+(k.base===bk?' on':'');});
  var nm=E('labWkName');if(nm&&nm!==ae&&nm.value!==k.name)nm.value=k.name||'';
  E('labWkPrice').textContent='Price: '+wPrice(wClamp(w).w)+' points'+(k.id?' · in the ammo row':' · not in the ammo row yet')+(k.maker?' · idea: '+k.maker:'');}
function labWkLists(){if(!E('labWkPresets'))return;
  E('labWkPresets').innerHTML=LAB_PRESETS.map(function(pr){var on=!!LAB_FLAGS['p_'+pr.key];return '<div class="lrow"><button class="btn lb" data-a="wpre_'+pr.key+'">'+pr.icon+' '+labEsc(pr.name)+'</button><span><small>'+(on?'in the ammo row · ':'')+labEsc(pr.note)+' <i>Idea: '+labEsc(pr.maker)+'</i></small></span></div>';}).join('');
  var sv=SG.labWeapons(),names=Object.keys(sv);E('labWkSaved').innerHTML=names.length?names.map(function(n,i){return '<div class="lrow"><span>'+labEsc(n)+' ('+wPrice(wClamp(sv[n].params).w)+' pts)</span><button class="btn lb" data-a="wload_'+i+'">Load</button><button class="btn lb" data-a="wdel_'+i+'">✕</button></div>';}).join(''):'<div class="lnote">No saved weapons yet.</div>';}
/* the Rate it table: this weapon beside a Marble and a Big Marble, then this weapon target by target */
function labRateHtml(r){var N=r.salvo,h='<div class="lnote">One flat shot, and a salvo of '+N+', at each of '+r.targets.length+' targets, each a fresh copy, free gun, fixed seed. Totals over all targets. Price '+r.price+' points.</div>';
  h+='<div class="verdict'+(r.tooStrong?' bad':'')+'">'+labEsc(r.name)+': '+labEsc(r.verdict)+'</div>';
  h+='<table class="lt wide"><tr><th>Ammo</th><th>Parts off</th><th>Collapses</th><th>Keeps felled</th><th>Mice dizzy</th><th>Salvos: parts · collapses · Keeps</th><th>Verdict</th></tr>';
  r.ids.forEach(function(id){var t=r.totals[id],nm=(AMMO[id]||{name:id}).name;h+='<tr><td>'+labEsc(nm)+(id===r.weapon?' (this)':'')+'</td><td>'+t.parts+'</td><td>'+t.collapses+'</td><td>'+t.keeps+' of '+t.keepTargets+'</td><td>'+t.dizzies+'</td><td>'+t.sParts+' · '+t.sCollapses+' · '+t.sKeeps+' of '+t.keepTargets+'</td><td>'+labEsc(id===r.weapon?r.verdict:r.verdicts[id])+'</td></tr>';});
  h+='</table><h4 class="wh">'+labEsc(r.name)+', target by target</h4><table class="lt wide"><tr><th>Target</th><th>Parts off</th><th>Collapses</th><th>Keep fell</th><th>Mice dizzy</th><th>Salvo: parts · collapses · Keep</th></tr>';
  r.targets.forEach(function(t){var x=t.rows[r.weapon],sv=x.salvo;h+='<tr><td>'+labEsc(t.title)+'</td><td>'+x.partsOff+'</td><td>'+x.collapses+'</td><td>'+(t.keep?(x.keep?'yes':'no'):'-')+'</td><td>'+x.dizzies+'</td><td>'+(sv?sv.parts+' · '+sv.collapses+' · '+(sv.keepAt?'down at '+sv.keepAt:'stands'):'-')+'</td></tr>';});
  return h+'</table>';}

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
  Lv.lines.visible=!!L.supports;if(L.supports)labLines(Lv);arsView();}
/* the Lab's drawings are put away when the Lab is left, so a match never shows them */
function labViewHide(){arsViewHide();defViewHide();var Lv=V.lab;if(!Lv)return;Lv.rings.concat(Lv.hl,[Lv.sel,Lv.spot,Lv.spot2,Lv.gun,Lv.gunRing,Lv.lines]).forEach(function(o){o.visible=false;});}
function labLines(Lv){var key=SG.pieces.length+'|'+SG.stats.partsOff+'|'+SG.stats.collapses+'|'+SG.clock.toFixed(1),pos=Lv.lines.geometry.attributes.position,col=Lv.lines.geometry.attributes.color,n=0;
  if(Lv.ckey!==key){Lv.ckey=key;Lv.crit={};SG.pieces.forEach(function(p){if(p.built&&!p.down&&(p.kind==='wall'||p.kind==='gate'||p.kind==='tower'||BK[p.kind]))Lv.crit[p.id]=labCritical(p);});}
  function seg(a,b,red){if(n>=899)return;pos.setXYZ(n*2,a[0],a[1],a[2]);pos.setXYZ(n*2+1,b[0],b[1],b[2]);var c=red?[1,.25,.18]:[.35,.95,.4];col.setXYZ(n*2,c[0],c[1],c[2]);col.setXYZ(n*2+1,c[0],c[1],c[2]);n++;}
  SG.pieces.forEach(function(p){if(!p.built||p.down)return;var cr=Lv.crit[p.id];if(!cr&&p.kind!=='brace')return;var top=[p.x,TALL[p.kind]*.85,p.z];
    if(p.kind==='brace'){var pr=p.props?pieceById(p.props):null;if(pr)seg([p.x,TALL.brace*.7,p.z],[pr.x,TALL[pr.kind]*.5,pr.z],false);return;}
    if(BK[p.kind]){p.ps.forEach(function(q){if(q.st!=='on'||!q.need)return;q.need.forEach(function(id){var r=p.ps[p.pi[id]];if(r&&r.st==='on')seg([q.wx,q.wy,q.wz],[r.wx,r.wy,r.wz],!!cr[id]);});});return;}   /* a building: each part to what holds it */
    var re=p.kind==='wall'?/post|rail/:(p.kind==='gate'?/gate\.post/:/^tower\.(post|brace|floor|rail)/);
    p.ps.forEach(function(q){if(q.st==='on'&&re.test(q.id))seg(top,[q.wx,q.wy,q.wz],!!cr[q.id]);});
    props(p).forEach(function(b){seg(top,[b.x,TALL.brace*.7,b.z],!!cr['piece:'+b.id]);});});
  Lv.lines.geometry.setDrawRange(0,n*2);pos.needsUpdate=true;col.needsUpdate=true;}

/* ---- the Lab's screen: a top row, a bottom toolbar, a panel on the right ---- */
var LAB_HELP='<h2>How to use the Lab</h2><ul><li><b>Build</b>: pick a piece, tap the table. Drag to slide the ghost before you let go. Turn with the turn buttons. Undo and Redo work.</li><li><b>Erase</b>: tap a piece to remove it. <b>Move</b>: tap a piece, then tap or drag to where it goes.</li><li><b>Lobber</b>: tap a lobber, then drag back and let go to fire. <b>Free gun</b>: tap the table to aim from the near edge, then press Fire.</li><li><b>Inspect</b>: tap a piece to see what holds it up. Red marks the part that alone would bring it down.</li><li>The panel on the right loads a target camp, resets it, saves designs and runs the range report. Nothing here ends: shoot as long as you like.</li><li><b>Building Yard</b>: load a Cottage, Barn, Watch tower house, Bridge, Windmill or Market row as the target, or pick three and place them. Trim comes off first, then walls, then the frame. Select one and press Rebuild to put it back.</li></ul>';
function labDom(){if(E('lab'))return;var d=document.createElement('div');d.id='lab';
  var tg=LAB_TARGETS.map(function(t){return '<button class="btn lb" data-a="tg_'+t[0]+'">'+t[1]+'</button>';}).join('');
  d.innerHTML='<div id="labTop" class="labp"><button class="btn lb" data-a="back">⬅ Back to menu</button><span class="pill" id="labTitle">🎯 Shooting range</span><button class="btn lb" data-a="help">? How to use</button><button class="btn lb" data-a="panel" id="labPanelBtn">☰ Panel</button></div>'+
  '<div id="labReadCard" class="labp"><button class="btn lb" data-a="readtog" id="labReadBtn">Readout ▾</button><div id="labReadBody"><div id="labRead"></div><div id="labFrameTxt" class="lnote"></div><div class="lgrid"><button class="btn lb" data-a="clear">Clear counters</button></div></div></div><div id="labCarn" class="labp"></div>'+
  '<div id="labPanel" class="labp">'+
  '<details open><summary>Target camp</summary><div class="lgrid" id="labTg">'+tg+'</div><div class="lgrid"><button class="btn lb go big" data-a="reset">⟳ Reset target</button><button class="btn lb" data-a="heal">Heal all</button><button class="btn lb" data-a="snap">📷 Snapshot</button><button class="btn lb" data-a="restore">⏪ Restore</button></div></details>'+
  '<details><summary>My camp</summary><div class="lgrid"><button class="btn lb" data-a="mine_starter">Keep + 2 lobbers</button><button class="btn lb" data-a="mine_clear">Clear my camp</button><button class="btn lb" data-a="tgt_clear">Clear target</button></div></details>'+
  '<details open id="labYardDet"><summary>Building Yard</summary><div class="lnote">Real little buildings. Trim comes off first, then walls, then the frame, then it all comes down.</div><div class="lgrid"><button class="btn lb go" data-a="rebuild">🔧 Rebuild selected</button></div><div class="lnote"><b>Build your own yard:</b> pick three.</div><div class="lgrid">'+labYardSel(0)+labYardSel(1)+labYardSel(2)+'</div><div class="lgrid"><button class="btn lb go" data-a="yard_t">Place in target camp</button><button class="btn lb" data-a="yard_m">Place in my camp</button></div></details>'+
  '<details open><summary>Settings</summary><div class="lgrid"><button class="btn lb" data-a="t_instant"></button><button class="btn lb" data-a="t_quick"></button><button class="btn lb" data-a="t_crew"></button><button class="btn lb" data-a="t_strict"></button><button class="btn lb" data-a="t_supports"></button><button class="btn lb" data-a="t_topple"></button><button class="btn lb" data-a="t_debris"></button><button class="btn lb" data-a="sweep">🧹 Sweep up</button><button class="btn lb" data-a="t_fxshake"></button><button class="btn lb" data-a="t_fxslow"></button><button class="btn lb" data-a="t_fxsound"></button><button class="btn lb" data-a="t_slow"></button><button class="btn lb" data-a="t_pause"></button></div></details>'+
    '<details><summary>Range report</summary><div class="lgrid"><button class="btn lb go" data-a="range">Test all ammo</button><button class="btn lb" data-a="t_spot">Set aim spot</button><button class="btn lb" data-a="spotclr">Aim at the Keep</button></div><div id="labSpotTxt" class="lnote"></div></details>'+
  '<details id="labArsDet"><summary>Arsenal: weapons and counters</summary><div id="labArs"></div></details>'+
  '<details id="labDefDet"><summary>Defences (prototype)</summary><div id="labDef"></div></details>'+
  '<details id="labWkDet"><summary>Weapon Workshop</summary><div id="labWk">'+labWkDom()+'</div></details>'+
  '<details><summary>Designs</summary><div class="lgrid"><input id="labName" type="text" placeholder="Name your camp" maxlength="40"><button class="btn lb go" data-a="dsave">Save design</button></div><div id="labList"></div><div class="lgrid"><button class="btn lb" data-a="dcopy">Copy JSON</button><button class="btn lb" data-a="dpaste">Paste JSON</button></div><div class="lnote">In a match: choose "My camp in a match" on the title screen.</div></details>'+
  '<details><summary>Prototypes</summary><div id="labProtos"></div></details></div>'+
  '<div id="labBar" class="labp"><div class="labrow" id="labTools"></div><div class="labrow" id="labSub"></div></div>'+
  '<div class="labcover" id="labCard"><div class="card"><div id="labHelp"></div><div class="row"><button class="btn lb go" data-a="cardok">Got it</button></div><p class="lnote">You can bring this back with "? How to use".</p></div></div>'+
  '<div class="labcover" id="labRangeBox"><div class="card"><h2>Range report</h2><div id="labRangeTxt"></div><div class="row"><button class="btn lb go" data-a="rangeok">Close</button></div></div></div>'+
  '<div class="labcover" id="labDefBox"><div class="card wideCard"><h2>Test my base</h2><div id="labDefTxt"></div><div class="row"><button class="btn lb" data-a="def_copy">Copy as text</button><button class="btn lb go" data-a="def_ok">Close</button></div></div></div>'+
  '<div class="labcover" id="labMatBox"><div class="card wideCard"><h2>Counter matrix</h2><div id="labMatTxt"></div><div class="row"><button class="btn lb go" data-a="ars_matok">Close</button></div></div></div>'+
  '<div class="labcover" id="labRateBox"><div class="card"><h2>Rate it</h2><div id="labRateTxt"></div><div class="row"><button class="btn lb go" data-a="rateok">Close</button></div></div></div>'+
  '<div class="labcover" id="labJsonBox"><div class="card"><h2 id="labJsonTitle">Design</h2><textarea id="labJsonText" spellcheck="false"></textarea><div class="row" id="labJsonRow"></div></div></div>';
  E('ui').appendChild(d);E('labHelp').innerHTML=LAB_HELP;
  d.addEventListener('click',function(ev){var b=ev.target.closest?ev.target.closest('[data-a]'):null;if(!b)return;ev.stopPropagation();soundOn();labAct(b.getAttribute('data-a'),b);});
  d.addEventListener('input',function(ev){var t=ev.target,wk=t&&t.getAttribute?t.getAttribute('data-w'):null;if(wk)SG.labWkSet(wk,t.value);else if(t&&t.id==='labWkName')SG.labWkName(t.value);});
  d.addEventListener('pointerdown',function(ev){ev.stopPropagation();});}
/* one of the three drop-downs of "Build your own yard" */
function labYardSel(i){return '<select class="ysel" id="labY'+i+'">'+(i?'<option value="">(none)</option>':'')+LAB_BLD.map(function(b,j){return '<option value="'+b[0]+'"'+(LAB_YARD3[i]===b[0]?' selected':'')+'>'+b[1]+'</option>';}).join('')+'</select>';}
function labUiHide(){var d=E('lab');if(d)d.style.display='none';var sel=E('designSel');if(!sel||!SG.labDesigns)return;var names=Object.keys(SG.labDesigns()),cur=sel.value||SG.designChoice||'';
  while(sel.options.length>1)sel.remove(1);names.forEach(function(n){var o=document.createElement('option');o.value=n;o.textContent=n;sel.appendChild(o);});sel.value=names.indexOf(cur)>=0?cur:'';E('designRow').style.display=names.length?'flex':'none';}
function labUi(){if(!hasDom||SG.mode!=='lab'||!SG.lab||SG.phase==='start')return;labDom();var L=SG.lab,d=E('lab');d.style.display='block';
  ['hud','bar','fbar','fbar2','nrow','arow','say','end','win','tag'].forEach(function(id){if(E(id))E(id).style.display='none';});E('side').style.display='flex';E('bCam').style.display='block';E('bPause2').style.display='none';
  var tools=[['build','🔨 Build'],['erase','🧽 Erase'],['move','✋ Move'],['inspect','🔍 Inspect'],['fire','🔮 Lobber'],['gun','🎯 Free gun']];if(DEF.on)tools.push(['def','🛡 Defences']);
  E('labTools').innerHTML=tools.map(function(t){return '<button class="btn lb'+(L.tool===t[0]?' on':'')+'" data-a="tool_'+t[0]+'">'+t[1]+'</button>';}).join('')+'<span class="lsep"></span><button class="btn lb" data-a="turnL">⟲</button><button class="btn lb" data-a="turnR">⟳</button><button class="btn lb" data-a="undo">↶ Undo</button><button class="btn lb" data-a="redo">↷ Redo</button>';
  var sub='';
  if(L.tool==='build'||L.tool==='move'){sub=LAB_KINDS.map(function(k){return '<button class="btn lb'+(L.kind===k&&L.tool==='build'?' on':'')+'" data-a="k_'+k+'">'+(LAB_ICON[k]||'🧩')+' '+labName(k)+'</button>';}).join('');if(L.carry)sub+='<button class="btn lb go" data-a="drop">Drop here</button><button class="btn lb" data-a="cancelcarry">Put it back</button>';}
  else if(L.tool==='fire'||L.tool==='gun'){var ids=AMMO_ORDER.concat(Object.keys(AMMO).filter(function(k){return AMMO_ORDER.indexOf(k)<0;}));
    sub=ids.map(function(id){return '<button class="btn lb ammo'+(L.ammo===id?' on':'')+'" data-a="am_'+id+'" id="lab_a_'+id+'"><span class="ai">'+labEsc(AMMO[id].icon)+'</span><span class="an">'+labEsc(AMMO[id].name)+'</span><span class="ac"></span></button>';}).join('')+
      '<button class="btn lb'+(L.high?' on':'')+'" data-a="high">⤴ High lob</button>'+'<button class="btn lb'+(SG.easyAim?' on':'')+'" data-a="easy">Easy aim</button>'+'<button class="btn lb'+(SG.rollingOn()?' on':'')+'" data-a="rolling">Rolling shots</button>'+(L.tool==='gun'?'<button class="btn lb go big" data-a="gunfire">🔥 Fire!</button>':'')+'<button class="btn lb" data-a="replay">⟲ Replay</button>';}
  else if(L.tool==='inspect')sub='<span class="lnote">Tap a piece to see what holds it up. Turn on "Show supports" to see the links.</span><button class="btn lb go" data-a="rebuild">🔧 Rebuild</button>';
  else if(L.tool==='def')sub=DK_ORDER.map(function(k){return '<button class="btn lb'+(DEF.kind===k?' on':'')+'" data-a="def_k_'+k+'">'+DK[k].icon+' '+labEsc(DK[k].name)+' ('+defCost(k)+')</button>';}).join('')+'<span class="lnote">Pick one, tap the table. Tap an item to select it (rings show its range).</span>';
  else if(L.tool==='erase')sub='<span class="lnote">Tap a piece to take it away. Undo brings it back.</span>';
  else if(L.tool==='spot')sub='<span class="lnote">Tap the table where the range report should aim.</span>';
  E('labSub').innerHTML=sub;
  var T={t_instant:['Build: '+(L.instant?'instantly':'mice build it'),L.instant],t_quick:['Reload: '+(L.quick?'quick (0.3 s)':'real'),L.quick],t_crew:['Crew: '+(L.crew?'needed':'not needed'),L.crew],t_strict:['Zones: '+(L.strict?'match rules':'anywhere'),L.strict],t_supports:['Show supports: '+(L.supports?'on':'off'),L.supports],t_topple:['Chain topple: '+(L.topple?'on':'off'),L.topple],t_debris:['Leave debris: '+(L.debris?'on':'off'),L.debris],t_fxshake:['Shake by size: '+(L.fxShake?'on':'off'),L.fxShake],t_fxslow:['Slow-mo beat by size: '+(L.fxSlow?'on':'off'),L.fxSlow],t_fxsound:['Sound by size: '+(L.fxSound?'on':'off'),L.fxSound],t_slow:['Slow-mo '+(L.slow?'on':'off'),L.slow],t_pause:[SG.paused?'▶ Go on':'⏸ Pause',SG.paused]};
  Object.keys(T).forEach(function(k){var b=d.querySelector('[data-a="'+k+'"]');if(b){b.textContent=T[k][0];b.className='btn lb'+(T[k][1]?' on':'');}});
  LAB_TARGETS.forEach(function(t){var b=d.querySelector('[data-a="tg_'+t[0]+'"]');if(b)b.className='btn lb'+(L.target===t[0]?' on':'');});
  var sp=L.spot||SG.labDefaultSpot();E('labSpotTxt').textContent='Aim spot: '+(L.spot?'tapped':'the target Keep')+' ('+sp.x.toFixed(2)+', '+sp.z.toFixed(2)+')';
  var dz=SG.labDesigns(),names=Object.keys(dz);E('labList').innerHTML=names.length?names.map(function(n){return '<div class="lrow"><span>'+labEsc(n)+' ('+dz[n].placements.length+')</span><button class="btn lb" data-a="dload_'+names.indexOf(n)+'">Load</button><button class="btn lb" data-a="ddel_'+names.indexOf(n)+'">✕</button></div>';}).join(''):'<div class="lnote">No saved designs yet.</div>';
  E('labProtos').innerHTML=Object.keys(LAB_PROTOS).map(function(id){var p=LAB_PROTOS[id];return '<div class="lrow"><button class="btn lb'+(LAB_FLAGS[id]?' on':'')+'" data-a="pr_'+id+'">'+(LAB_FLAGS[id]?'On':'Off')+'</button><span>'+labEsc(p.name)+'<br><small>'+labEsc(p.note||'')+'</small></span></div>';}).join('');
  E('labPanel').style.display=L.panel?'block':'none';E('labReadBody').style.display=L.read?'block':'none';E('labReadBtn').textContent=L.read?'Readout ▾':'Readout ▸';E('labCard').style.display=L.card?'flex':'none';
  E('bPause2').textContent=SG.paused?'▶':'⏸';labWkLists();labWkSync();arsUi();defUi();L.rkey='';labHud();}
function labEsc(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
/* every frame: the message line, the ammo buttons' waits, and the readout when something changed */
function labHud(){var L=SG.lab;if(!L||!hasDom||!E('labRead'))return;var sy=E('say'),m=L.msg,vis=m.text&&SG.clock<m.until;sy.style.display=vis?'block':'none';sy.textContent=vis?m.text:'';sy.className=m.bad?'bad':'';sy.style.top='62px';
  var cg=SG.labCarnage(),sg0=SG.labStages(),ck=[cg.parts,cg.collapses,cg.chain,cg.longest,cg.score,cg.burst,sg0.any,sg0.trim,sg0.walls,sg0.frame,sg0.collapse].join('/');if(ck!==L.ckey2&&E('labCarn')){L.ckey2=ck;var sg=SG.labStages();E('labCarn').innerHTML='<div class="cr"><span>Parts off <b>'+cg.parts+'</b></span><span>Collapses <b>'+cg.collapses+'</b></span><span>Chain <b>'+cg.chain+'</b> (longest <b>'+cg.longest+'</b>)</span><span class="cs">Carnage <b>'+cg.score+'</b></span></div>'+(sg.any?'<div class="cr stg"><span>Bits off / stage:</span><span>trim <b>'+sg.trim+'</b></span><span>walls <b>'+sg.walls+'</b></span><span>frame <b>'+sg.frame+'</b></span><span>collapse <b>'+sg.collapse+'</b></span></div>':'');}
  if((L.fk=(L.fk||0)+1)%20===0&&E('labFrameTxt')){var fs=SG.labFrameStats();E('labFrameTxt').textContent=fs&&fs.frames?'Frame '+fs.msSmooth+' ms (worst '+fs.worstMs+'), drawing '+fs.renderMsAvg+' ms, '+fs.calls+' draw calls, '+Math.round(fs.triangles/1000)+'k triangles, '+fs.pieces+' pieces':'';}
  var s0=SG.sides[0];AMMO_ORDER.concat(Object.keys(AMMO).filter(function(k){return AMMO_ORDER.indexOf(k)<0;})).forEach(function(id){var b=E('lab_a_'+id);if(!b)return;var ac=b.querySelector('.ac'),t=L.quick?'∞':ammoCount({big:99,cd:s0.cd},id).replace('×99','∞');if(ac&&ac.textContent!==t)ac.textContent=t;});
  var ss=SG.labSession(),cur=L.cur,sel=L.sel?pieceById(L.sel):null,key=[ss.shots,ss.partsOff,ss.collapses,ss.keeps,ss.dizzies,cur?cur.done+'|'+cur.parts.length:'-',sel?sel.id+'|'+sel.parts+'|'+(sel.down?1:0)+'|'+SG.stats.partsOff:'-',L.fellLog.join(),L.read].join('/');if(key===L.rkey)return;L.rkey=key;
  var h='',r=L.last;
  h+='<h4>Last shot</h4>';
  if(!cur&&!r)h+='<div class="lnote">No shots yet. Fire one.</div>';
  else{var c=cur||{};h+='<table class="lt"><tr><td>Ammo</td><td>'+(r?labEsc((AMMO[r.ammo]||{name:r.ammo}).name)+(r.high?' (high lob)':''):'-')+'</td></tr><tr><td>Parts off</td><td>'+(c.done?c.partsOff:(c.parts?c.parts.length+' so far':0))+'</td></tr><tr><td>Collapses</td><td>'+(c.done?c.collapses:'…')+'</td></tr><tr><td>Mice dizzy</td><td>'+(c.done?c.dizzies:'…')+'</td></tr>'+(c.done&&c.glued?'<tr><td>Parts glued</td><td>'+c.glued+'</td></tr>':'')+'<tr><td>Fell</td><td>'+(c.fell&&c.fell.length?c.fell.map(labEsc).join(', '):'nothing')+'</td></tr><tr><td>Landed on</td><td>'+(c.landings&&c.landings[0]?(c.landings[0].hit?labName(c.landings[0].hit):'the table'):'-')+'</td></tr></table>';
    if(c.done&&c.parts&&c.parts.length){var cnt={};c.parts.forEach(function(q){var k=labName(q.kind)+' '+partName(q.part);cnt[k]=(cnt[k]||0)+1;});h+='<div class="lnote">Off: '+Object.keys(cnt).map(function(k){return cnt[k]>1?cnt[k]+' × '+k:k;}).join(', ')+'</div>';}}
  h+='<div class="lnote"><b>Session:</b> '+ss.shots+' shots · '+ss.partsOff+' parts off · '+ss.collapses+' collapses · '+ss.keeps+' Keeps · '+ss.dizzies+' dizzy'+(L.fellLog.length?'<br>Fell lately: '+L.fellLog.map(labEsc).join(', '):'')+'</div>';
  if(sel){var sp=SG.labSupports(sel);h+='<h4>'+labEsc(sp.title)+(sp.state==='stands'?' · stands':(sp.state==='down'?' · down':' · '+LAB_WHY[sp.state]))+'</h4>'+(BK[sel.kind]?'<div class="lgrid"><button class="btn lb go" data-a="rebuild">🔧 Rebuild this '+labEsc(labName(sel.kind))+'</button></div>':'')+'<div class="lnote">'+labEsc(sp.rule)+'</div><ul class="ls">'+sp.rows.map(function(q){return '<li class="'+(q.crit?'crit':(q.on?'ok':'gone'))+'">'+labEsc(q.text)+(q.crit?' · alone it '+q.why:'')+'</li>';}).join('')+'</ul>';}
  else h+='<h4>Tapped piece</h4><div class="lnote">Tap a piece (Inspect or Lobber tool) to see what holds it up.</div>';
  E('labRead').innerHTML=h;}
function labRangeHtml(out){var h='<div class="lnote">Target: '+labEsc(out.target)+' · '+labEsc(out.settings.aim)+' · '+labEsc(out.settings.reload)+', crew '+labEsc(out.settings.crew)+'. Each row is a fresh copy of the target.</div><table class="lt wide"><tr><th>Ammo</th><th>Parts off</th><th>Collapses</th><th>Keep fell</th><th>Mice dizzy</th><th>Glued</th><th>Landed on</th><th>After a salvo of '+out.settings.salvo+': parts off · collapses · Keep</th></tr>';
  out.rows.forEach(function(r){h+='<tr><td>'+labEsc(r.name)+'</td><td>'+r.partsOff+'</td><td>'+r.collapses+'</td><td>'+(r.keep?'yes':'no')+'</td><td>'+r.dizzies+'</td><td>'+r.glued+'</td><td>'+labEsc(r.landed)+'</td><td>'+(r.salvo?r.salvo.parts+' · '+r.salvo.collapses+' · '+(r.salvo.keepAt?'down at shot '+r.salvo.keepAt:'stands'):'-')+'</td></tr>';});return h+'</table>';}
function labShowJson(title,text,paste,mode){SG.lab.jmode=mode||'design';E('labJsonTitle').textContent=title;E('labJsonText').value=text;E('labJsonText').readOnly=!paste;
  E('labJsonRow').innerHTML=(paste?'<button class="btn lb go" data-a="jload">Load this '+(mode==='weapon'?'weapon':'design')+'</button>':'<button class="btn lb go" data-a="jcopy">Copy</button>')+'<button class="btn lb" data-a="jclose">Close</button>';E('labJsonBox').style.display='flex';}
function labAct(a,b){var L=SG.lab;if(!L)return;var x;
  if(a==='back'){SG.labBack();return;}
  if(a.indexOf('ars_')===0){arsAct(a);return;}
  if(a.indexOf('def_')===0){defAct(a);return;}
  if(a==='help'){L.card=true;labUi();return;}if(a==='cardok'){L.card=false;labStore(LAB_SEEN,1);labUi();return;}
  if(a==='panel'){L.panel=!L.panel;labPrefs();labUi();return;}if(a==='readtog'){L.read=!L.read;labPrefs();labUi();return;}
  if(a.indexOf('tool_')===0){SG.labTool(a.slice(5));return;}
  if(a.indexOf('k_')===0){L.kind=a.slice(2);if(L.tool!=='build')SG.labTool('build');L.ghost.on=false;labUi();return;}
  if(a.indexOf('am_')===0){SG.labSetAmmo(a.slice(3));return;}
  if(a==='high'){SG.labSetHigh(!L.high);return;}if(a==='rolling'){SG.setRolling(!SG.rollingOn());labUi();return;}if(a==='easy'){SG.setEasyAim(!SG.easyAim);labUi();return;}
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
  if(a==='rebuild'){SG.labRebuild();ui();return;}
  if(a==='yard_t'||a==='yard_m'){var yl=[0,1,2].map(function(i){var e=E('labY'+i);return e?e.value:'';}).filter(function(v2){return v2;});SG.labYard(yl,a==='yard_t'?1:0);return;}
  if(a==='range'){x=SG.labRange();L.rangeOut=x;E('labRangeTxt').innerHTML=labRangeHtml(x);E('labRangeBox').style.display='flex';return;}
  if(a==='rangeok'){E('labRangeBox').style.display='none';return;}
  if(a==='dsave'){x=SG.labSaveDesign(E('labName').value);labMsg(x.text,!x.ok);labUi();return;}
  if(a.indexOf('dload_')===0){var dn=Object.keys(SG.labDesigns())[+a.slice(6)];x=dn?SG.labDesigns()[dn]:null;if(x){x=SG.labLoadDesign(x,0);labMsg(x.text,!x.ok);}return;}
  if(a.indexOf('ddel_')===0){var dn2=Object.keys(SG.labDesigns())[+a.slice(5)];if(dn2)SG.labDeleteDesign(dn2);labUi();return;}
  if(a==='dcopy'){labShowJson('Copy this design',JSON.stringify(labToDesign(0,E('labName').value||'My camp'),null,1),false);return;}
  if(a==='dpaste'){labShowJson('Paste a design here',' ',true);E('labJsonText').value='';return;}
  if(a==='jclose'){E('labJsonBox').style.display='none';return;}
  if(a==='jcopy'){var ta=E('labJsonText');ta.focus();ta.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(ta.value).then(function(){labMsg('Copied',false);},function(){labMsg(ok?'Copied':'Select all, then copy',!ok);});}else labMsg(ok?'Copied':'Select all, then copy',!ok);return;}
  if(a==='jload'&&L.jmode==='weapon'){x=SG.labWkLoad(E('labJsonText').value);labMsg(x.text,!x.ok);if(x.ok){E('labJsonBox').style.display='none';labUi();}return;}
  if(a==='jload'){x=SG.labLoadDesign(E('labJsonText').value,0);labMsg(x.text,!x.ok);if(x.ok)E('labJsonBox').style.display='none';return;}
  if(a==='t_topple'){L.topple=!L.topple;labPrefs();labUi();return;}if(a==='t_debris'){L.debris=!L.debris;labPrefs();labUi();return;}if(a==='sweep'){SG.labSweep();labUi();return;}
  if(a==='t_fxshake'){L.fxShake=!L.fxShake;labPrefs();labUi();return;}if(a==='t_fxslow'){L.fxSlow=!L.fxSlow;labPrefs();labUi();return;}if(a==='t_fxsound'){L.fxSound=!L.fxSound;labPrefs();labUi();return;}
  if(a.indexOf('wb_')===0){SG.labWkBase(a.slice(3));return;}
  if(a.indexOf('wt_')===0){var wk=labWkState(),key=a.slice(3);SG.labWkSet(key,!wk.w[key]);labWkSync();return;}
  if(a==='wuse'){SG.labWkUse();return;}
  if(a==='wrate'){var wk2=labWkState();if(!wk2.id)SG.labWkUse();x=SG.labRate(wk2.id);L.rateOut=x;E('labRateTxt').innerHTML=labRateHtml(x);E('labRateBox').style.display='flex';return;}
  if(a==='rateok'){E('labRateBox').style.display='none';return;}
  if(a==='wsave'){x=SG.labWkSaveNow();labMsg(x.text,!x.ok);labUi();return;}
  if(a==='wcopy'){var wk3=labWkState(),b3=LAB_BASES[wk3.base];labShowJson('Copy this weapon',JSON.stringify({schema:'rtk.weapon',version:1,name:wk3.name||'My weapon',base:wk3.base,icon:b3.icon,tint:b3.tint,scale:b3.scale,maker:wk3.maker||'',params:wClamp(wk3.w).w},null,1),false,'weapon');return;}
  if(a==='wpaste'){labShowJson('Paste a weapon here',' ',true,'weapon');E('labJsonText').value='';return;}
  if(a.indexOf('wpre_')===0){SG.labWkPreset(a.slice(5));return;}
  if(a.indexOf('wload_')===0){var wn=Object.keys(SG.labWeapons())[+a.slice(6)];x=wn?SG.labWkLoad(SG.labWeapons()[wn]):null;if(x)labMsg(x.text,!x.ok);return;}
  if(a.indexOf('wdel_')===0){var wn2=Object.keys(SG.labWeapons())[+a.slice(5)];if(wn2)SG.labWeaponDelete(wn2);labUi();return;}
  if(a.indexOf('pr_')===0){var id=a.slice(3);SG.setProto(id,!LAB_FLAGS[id]);labMsg(LAB_PROTOS[id].name+(LAB_FLAGS[id]?' is on':' is off'),false);return;}}
SG.labTool=function(t){var L=SG.lab;if(!L)return false;if(L.carry&&t!=='move')SG.labCancelCarry();L.tool=t;L.ghost.on=t==='build';SG.sides.forEach(function(sd){sd.aim.on=false;});
  if(t==='gun'&&L.gunAim){SG.sides[0].aim={on:true,tx:L.gunAim.tx,tz:L.gunAim.tz,li:'gun'};}labUi();return true;};

/* ---- touches in the Lab: one finger at a time ---- */
var LP=null;
function labPull(l,from,g){return pullCalc(l,from,g);}
function labDown(e){var L=SG.lab;if(!L)return;if(LP&&LP.id!==e.pointerId)return;var g=ground(e.clientX,e.clientY);if(!g)return;e.preventDefault();try{e.target.setPointerCapture(e.pointerId);}catch(err){}
  LP={id:e.pointerId,x:e.clientX,y:e.clientY,from:g,kind:'tap',moved:0,off:{x:0,z:0}};var t=L.tool;
  if(t==='build'){L.ghost.on=true;L.ghost.x=g.x;L.ghost.z=g.z;LP.kind='ghost';}
  else if(t==='move'){if(L.carry){L.ghost.x=g.x;L.ghost.z=g.z;LP.kind='ghost';}
    else{var p=labPieceAt(g);if(p){var ox=p.x-g.x,oz=p.z-g.z;if(SG.labLift(p)){LP.kind='lift';LP.off={x:ox,z:oz};labUi();}}}}
  else if(t==='fire'){var best=null,bd=.5;[0,1].forEach(function(s){lobbersOf(s).forEach(function(l,li){var dd=dist(g.x,g.z,l.x,l.z);if(dd<bd){bd=dd;best={s:s,li:li};}});});
    if(best){L.fire=best;SG.sides[best.s].lsel=best.li;}
    if(lobberOf(L.fire.s,L.fire.li)){SG.sides.forEach(function(sd){sd.aim.on=false;});LP.kind='aim';}else labMsg('No lobber on the table. Build one, or use the Free gun',true);}
  else if(t==='gun'){LP.kind='gun';labGunSet(g);}
  else if(t==='def'){LP.kind='def';}}
function labGunSet(g){var L=SG.lab,tx=Math.max(-3.2,Math.min(3.2,g.x)),tz=Math.max(-3.2,Math.min(3.2,g.z));L.gunAim={tx:tx,tz:tz};labGunAt(tx);SG.sides[0].aim={on:true,tx:tx,tz:tz,li:'gun'};}
function labMove(e){if(!LP||LP.id!==e.pointerId||!SG.lab)return;var L=SG.lab,g=ground(e.clientX,e.clientY);LP.moved+=Math.abs(e.clientX-LP.x)+Math.abs(e.clientY-LP.y);LP.x=e.clientX;LP.y=e.clientY;if(!g)return;
  if(LP.kind==='lift'&&LP.moved>14)LP.kind='ghost';
  if(LP.kind==='ghost'){L.ghost.x=g.x+LP.off.x;L.ghost.z=g.z+LP.off.z;}
  else if(LP.kind==='aim'){var l=lobberOf(L.fire.s,L.fire.li),t=l?labPull(l,LP.from,g):null,sd=SG.sides[L.fire.s];if(t){LP.pulled=true;t.sx=e.clientX;t.sy=e.clientY;sd.aim={on:true,tx:t.x,tz:t.z,li:L.fire.li,pw:t.p};sd.pull=t;}else{sd.aim.on=false;sd.pull=null;}}
  else if(LP.kind==='gun')labGunSet(g);}
function labUp(e){if(!LP||LP.id!==e.pointerId||!SG.lab)return;var L=SG.lab,P=LP;LP=null;var g=ground(e.clientX,e.clientY)||P.from,t=L.tool,tap=P.moved<12;
  if(t==='build'&&P.kind==='ghost'){var r=SG.labPlace(L.kind,L.ghost.x,L.ghost.z,L.ghost.rot);if(!r.ok)labMsg(r.text,true);else{snd('tap');L.ghost.on=false;}ui();}
  else if(t==='move'&&L.carry){if(P.kind==='lift'&&tap)return;var rr=SG.labDrop();if(rr.ok)snd('tap');}
  else if(t==='def'&&tap){SG.defTap(g.x,g.z);}
  else if(t==='erase'){if(DEF.on&&SG.defErase(g.x,g.z))return;var p=labPieceAt(g);if(p){SG.labErase(p);labMsg(labName(p.kind)+' removed',false);}ui();}
  else if(t==='inspect'){SG.labSelect(labPieceAt(g));}
  else if(t==='spot'){L.spot={x:g.x,z:g.z};labUi();}
  else if(t==='fire'&&P.kind==='aim'){var sd=SG.sides[L.fire.s];if(sd.aim.on&&!tap){pullRelease(L.fire.s,sd,L.fire.li);}else{sd.aim.on=false;sd.pull=null;if(!P.pulled)SG.labSelect(labPieceAt(g));}}}
function labCancel(e){if(LP&&LP.id===e.pointerId){LP=null;if(SG.lab)SG.sides.forEach(function(sd){if(SG.lab.tool==='fire')sd.aim.on=false;sd.pull=null;});}}
function labKey(e){var L=SG.lab;if(!L||(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName||'')))return;var k=e.key.toLowerCase();
  if(k==='q')L.ghost.rot+=PI/12;else if(k==='e')L.ghost.rot-=PI/12;else if(k==='z'&&!e.shiftKey)SG.labUndo();else if(k==='y'||(k==='z'&&e.shiftKey))SG.labRedo();
  else if(k==='escape'){if(L.carry)SG.labCancelCarry();L.card=false;labUi();}else if(k==='p'){SG.paused=!SG.paused;labUi();}else if(k==='c')SG.setCam(SG.cam+1);else if(k==='r')SG.labReset(1);
  else if(k==='f'&&L.tool==='gun'&&L.gunAim)SG.labFire(0,'gun',L.gunAim.tx,L.gunAim.tz);}

/* ================= run ================= */
SG.boot=function(){
  initView();initInput();ui();
  var Q={};location.search.slice(1).split('&').forEach(function(kv){var p=kv.split('=');if(p[0]){try{Q[p[0]]=decodeURIComponent(p[1]||'');}catch(e){Q[p[0]]=p[1]||'';}}});
  if(Q.rules==='1'||window.__RULES===1)SG.rulesDefault=1;
  if(Q.rolling==='1')CONFIG.v2.rolling.on=true;   /* rolling shots in matches (they are off until the balance is proved) */
  if(Q.shot){SG.shot(Q.shot,Q.team||'blue');ui();SG.camSnap=true;render();SS.whenTextures(function(){SG.camSnap=true;render();render();window.__done=true;},4000);return;}
  if(Q.layout){var lr;try{lr=SG.applyLayout(atob(Q.layout.replace(/-/g,'+').replace(/_/g,'/')));}catch(e){lr={ok:false,reason:'The layout in the address could not be read'};SG.layoutNote=lr.reason;}
    if(E('layoutNote')){E('layoutNote').style.display='block';E('layoutNote').textContent=lr.ok?'Table layout loaded from the address.':'Layout refused: '+lr.reason+' Using the usual table.';}}
  if(Q.auto)autoRun(Q);
  SG.rulesDefault=Q.rules==='1'||window.__RULES===1?1:2;SG.dev=Q.dev==='1';arCheck();if(Q.lab==='1'){SG.paused=false;SG.cam=0;SG.labStart();}
  var last=performance.now();(function loop(){var now=performance.now(),raw=now-last,dt=Math.min(.1,raw/1000);last=now;if(AR.on){window.__done=true;requestAnimationFrame(loop);return;}   /* in AR the XR session drives the frames */
    if(SG.phase!=='start'&&!SG.paused&&!SG.hold)SG.step(slowed(dt)*(SG.speed||1));var r0=performance.now();render();if(SG.lab&&SG.mode==='lab')labFrame(raw,performance.now()-r0);if(SG.dev)devLine(raw);if(PERF)perfFrame(raw);window.__done=true;requestAnimationFrame(loop);})();};
/* ?auto=both|blue|red&level=easy|normal|hard&report=1 : bots play a match with no title screen, drawn normally, and the page
   measures itself. auto=both: bots on both sides. auto=blue or auto=red: the bot plays that team and you play the other.
   Extra, for tests: &speed=8 runs the clock faster, &skipbuild=1 starts from preset camps, &defence=front|far|both turns the Defences flag on (Lab flag mode: the seven Arsenal weapons, and posts and traps for the side named). Not part of the normal game. */
var PERF=null;
function autoRun(Q){
  var lvl=LEVELS[Q.level]?Q.level:'easy',both=Q.auto==='both',team=Q.auto==='blue'?'red':'blue';
  PERF={frames:[],calls:0,tris:0,errors:[],show:Q.report==='1',done:false,t0:performance.now(),auto:Q.auto,level:lvl};window.SG_REPORT=null;
  window.onerror=function(msg,src,line){PERF.errors.push(String(msg)+(line?' (line '+line+')':''));};window.addEventListener('unhandledrejection',function(e){PERF.errors.push('promise: '+String(e.reason));});
  SG.speed=Math.max(1,Math.min(40,+(Q.speed||1)));var dq=Q.defence,dopt=dq?{fort:[dq==='front'||dq==='both',dq==='far'||dq==='both']}:undefined;   /* ?defence=front|far|both: the Defences flag, with those sides fortified (both camps are the 12-point 'good' camp) */
  SG.start(team,{level:lvl,seed:Q.seed?+Q.seed:Math.floor(performance.now()*7919)%1000000+1,defence:dopt,presets:dopt?['good','good']:undefined});if(both)SG.auto(0,lvl);if(Q.skipbuild==='1')SG.skipBuild();}
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
  /* the Workshop: a Pop bomb made in the editor, in the ammo row, after one shot at the Fortress */
  if(name==='lab-6-workshop'){labLoadTarget('fortress',true);SG.cam=3;SG.labWkPreset('pop');SG.labWkUse();L.tool='gun';L.read=true;sp=SG.labDefaultSpot();L.gunAim={tx:sp.x,tz:sp.z};SG.labFire(0,'gun',sp.x,sp.z);SG.labSettle(12);SG.step(.4);
    if(hasDom){labUi();[].forEach.call(document.querySelectorAll('#labPanel details'),function(d){d.open=d.id==='labWkDet';});var wd=E('labWkDet');if(wd)wd.scrollIntoView();}return;}
  /* the Castle, whole, with the frame time in the readout */
  if(name==='lab-7-castle'){labLoadTarget('castle',true);L.panel=false;L.read=true;SG.cam=3;L.tool='fire';SG.step(.3);return;}
  /* the Tether marble: a part yanked loose, in the air, on its way to the gun */
  if(name==='lab-8-tether'){labLoadTarget('walled',true);SG.cam=3;SG.setProto('p_tether',true,false);SG.labSetAmmo('p_tether');L.tool='gun';L.panel=false;L.read=true;sp=SG.labDefaultSpot();var gd=SG.pieces.filter(function(q){return q.side===1&&q.kind==='gate';})[0];L.gunAim={tx:gd.x,tz:gd.z};
    var ta=SG.labFire(0,'gun',gd.x,gd.z,{force:true,seed:5});for(var ti=0;ti<600&&!(ta&&ta.snag);ti++)SG.step(STEP);for(ti=0;ti<30;ti++)SG.step(STEP);return;}
  /* carnage: the Castle, a Pop bomb and two Big Marbles in, parts everywhere, the counter on */
  if(name==='lab-9-carnage'){labLoadTarget('domino',true);SG.cam=3;L.panel=false;L.read=true;L.tool='gun';SG.setProto('p_pop',true,false);var wl=SG.pieces.filter(function(q){return q.side===1&&q.kind==='wall'&&Math.abs(q.x)<.1;}).sort(function(a2,b2){return b2.z-a2.z;})[0];L.gunAim={tx:wl.x,tz:wl.z};
    SG.labSetAmmo('p_pop');SG.labFire(0,'gun',wl.x,wl.z,{force:true,seed:11});for(var ci=0;ci<900&&!(L.cur&&L.cur.landings.length);ci++)SG.step(STEP);for(ci=0;ci<20;ci++)SG.step(STEP);return;}
  /* Rate it: the table for a Bead shot beside a Marble and a Big Marble */
  if(name==='lab-10-rate-it'){labLoadTarget('walled',true);SG.setProto('p_pop',true,false);SG.labWkPreset('pop');SG.labWkUse();L.tool='gun';L.panel=true;if(hasDom){labUi();labAct('wrate');}return;}
  /* the Building Yard: a yard of three, a Marble's few bits of trim, a Big Marble taking a side of the barn, the windmill's sails going one after another, a market row falling into itself, and the bridge with its supports shown */
  function bFocus(zoom,y,dx){var ps=SG.pieces.filter(function(q){return q.side===1;}),fx=0,fz=0;ps.forEach(function(q){fx+=q.x;fz+=q.z;});L.focus={x:fx/ps.length+(dx||0),z:fz/ps.length,zoom:zoom,y:y||0};SG.camSnap=true;}
  function bFire(id,seed,hi){var q=SG.pieces.filter(function(e){return e.side===1;}),c=0,d=0;q.forEach(function(e){c+=e.x;d+=e.z;});L.ammo=id;L.high=!!hi;SG.sides.forEach(function(sd){sd.ammo=id;sd.high=!!hi;});L.tool='gun';L.gunAim={tx:c/q.length,tz:d/q.length};return SG.labFire(0,'gun',c/q.length,d/q.length,{force:true,seed:seed});}
  if(name==='lab-11-yard'){labLoadTarget('yard',true);SG.cam=3;L.panel=true;L.read=false;L.tool='fire';bFocus(.8,.1,.55);SG.step(.3);
    if(hasDom){labUi();[].forEach.call(document.querySelectorAll('#labPanel details'),function(d){d.open=d.id==='labYardDet';});}return;}
  if(name==='lab-12-cottage-trim'){labLoadTarget('cottage',true);SG.cam=3;L.panel=false;L.read=true;bFocus(.4,.2);bFire('marble',5,false);for(var ti=0;ti<600&&!(L.cur&&L.cur.landings.length);ti++)SG.step(STEP);for(ti=0;ti<22;ti++)SG.step(STEP);return;}
  if(name==='lab-13-barn-side'){labLoadTarget('barn',true);SG.cam=3;L.panel=false;L.read=true;bFocus(.46,.15);bFire('big',5,false);SG.labSettle(10);SG.step(1.6);return;}
  if(name==='lab-14-windmill-sails'){labLoadTarget('windmill',true);SG.cam=3;L.panel=false;L.read=true;bFocus(.52,.5);bFire('big',5,false);for(var wi=0;wi<600&&!(L.cur&&L.cur.landings.length);wi++)SG.step(STEP);for(wi=0;wi<66;wi++)SG.step(STEP);return;}
  if(name==='lab-15-market-chain'){labLoadTarget('market',true);SG.cam=3;L.panel=false;L.read=true;bFocus(.5,.1);var mk=SG.pieces.filter(function(e){return e.side===1;}).sort(function(a2,b2){return a2.x-b2.x;});L.ammo='big';L.tool='gun';SG.sides.forEach(function(sd){sd.ammo='big';});SG.labFire(0,'gun',mk[1].x,mk[1].z,{force:true,seed:5});for(var mi=0;mi<600&&!(L.cur&&L.cur.landings.length);mi++)SG.step(STEP);for(mi=0;mi<40;mi++)SG.step(STEP);return;}
  if(name==='lab-16-bridge-supports'){labLoadTarget('bridge',true);SG.cam=3;L.panel=false;L.read=true;L.supports=true;L.tool='inspect';bFocus(.5,.25);bFire('marble',5,true);SG.labSettle(10);L.tool='inspect';SG.labSelect(SG.pieces.filter(function(e){return e.side===1;})[0]);SG.step(.5);if(hasDom)labUi();return;}
  if(name==='lab-5-supports'){labLoadTarget('braced',true);L.supports=true;L.tool='inspect';SG.cam=1;var bx=FOOT.tower[0]+FOOT.brace[1]+.015;mine('brace',-bx,2.42,-PI/2);mine('brace',bx,2.42,PI/2);mine('wall',-.9,1.7);mine('wall',-.9+FOOT.wall[0]*2+.004,1.7);
    var kp2=SG.pieces.filter(function(q){return q.side===0&&q.kind==='tower';})[0],wl=SG.pieces.filter(function(q){return q.side===0&&q.kind==='wall';})[0];SG.debug.knock(kp2.id,'tower.brace.W');SG.debug.knock(kp2.id,'tower.post.SW');SG.debug.knock(wl.id,'wall.post.L');SG.labSelect(kp2);SG.step(.5);return;}
};
/* fixed scenes for screenshots */
SG.shot=function(name,team){
  if(name.indexOf('lab-')===0){SG.labShot(name);return;}
  if(name.indexOf('arsenal-')===0){SG.arsShot(name);return;}
  if(name.indexOf('defence-')===0){SG.defShot(name);return;}
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
