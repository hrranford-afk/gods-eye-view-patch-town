
/* ---------- effects ---------- */
SS.fx={};
var _fx={};
function starShape(r){var sh=new THREE.Shape();for(var i=0;i<10;i++){var a=i/10*PI*2+PI/2,rr=i%2?r*.46:r;if(i)sh.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);else sh.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}return sh;}
/* dizzy stars: a ring of chunky stars; spin it with rotation.y */
SS.fx.stars=function(){
  if(!_fx.stars){var b=new Bld(2),g=new THREE.ExtrudeGeometry(starShape(.034),{depth:.012,bevelEnabled:false});g.translate(0,0,-.006);
    for(var i=0;i<4;i++){var a=i/4*PI*2;b.add(g,i%2?0xffe066:0xffc93a,null,[Math.cos(a)*.11,(i%2)*.022,Math.sin(a)*.11],[0,-a+PI/2,.3*(i%2?1:-1)],i%2?.8:1);}
    _fx.stars=b.geo();}
  var m=mesh(_fx.stars,glow(),false);m.name='fx_stars';return m;};
/* dust puff: call SS.fx.dustStep(puff, k) with k from 0 to 1 */
SS.fx.dust=function(){
  if(!_fx.dust){var b=new Bld(12),r=b.r;for(var i=0;i<7;i++){var a=i/7*PI*2+r(),d=.05+r()*.07;b.sph(.035+r()*.03,7,5,i%2?0xf0dcb8:0xe2c79c,null,[Math.cos(a)*d,.03+r()*.05,Math.sin(a)*d],null,[1,.8,1]);}_fx.dust=b.geo();}
  var m=mesh(_fx.dust,new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:.6,depthWrite:false}),false);m.receiveShadow=false;m.name='fx_dust';SS.fx.dustStep(m,.35);return m;};
SS.fx.dustStep=function(puff,k){k=k<0?0:(k>1?1:k);var s=.5+1.6*Math.sqrt(k);puff.scale.set(s,.6+k*1.2,s);puff.material.opacity=.65*(1-k)*(1-k)+.02;puff.visible=k<1;return puff;};
/* a point on a lobbed arc, k from 0 to 1 */
SS.fx.arcPoint=function(from,to,height,k,out){out=out||new THREE.Vector3();out.lerpVectors(from,to,k);out.y+=4*height*k*(1-k);return out;};
/* dotted aim arc: n dots in one mesh; move it with SS.fx.setArc */
SS.fx.arc=function(n,colour){
  n=n||14;var dot=new THREE.SphereGeometry(.022,6,4).toNonIndexed(),cnt=dot.attributes.position.count,pos=new Float32Array(cnt*3*n),g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));var m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:colour==null?0xfff3d0:colour,transparent:true,opacity:.95}));
  m.frustumCulled=false;m.name='fx_arc';m.userData={n:n,dot:dot.attributes.position.array,cnt:cnt};return m;};
SS.fx.setArc=function(arc,from,to,height,phase){
  var u=arc.userData,p=arc.geometry.attributes.position.array,v=new THREE.Vector3(),i,j,o=0;phase=((phase||0)%1+1)%1;
  for(i=0;i<u.n;i++){var k=(i+.5+phase)/(u.n+1);SS.fx.arcPoint(from,to,height,k,v);var s=.7+.5*(1-k);
    for(j=0;j<u.cnt;j++){p[o++]=v.x+u.dot[j*3]*s;p[o++]=v.y+u.dot[j*3+1]*s;p[o++]=v.z+u.dot[j*3+2]*s;}}
  arc.geometry.attributes.position.needsUpdate=true;return arc;};
/* cork projectile; flies along +z */
SS.fx.cork=function(){
  if(!_fx.cork){var b=new Bld(13);b.cyl(.03,.024,.055,10,CORK,'wood',[0,0,0],[PI/2,0,0]);b.cyl(.031,.031,.008,10,shade(CORK,.82),null,[0,0,.02],[PI/2,0,0]);
    for(var i=0;i<6;i++){var a=i*1.1;b.sph(.005,4,3,shade(CORK,.7),null,[Math.cos(a)*.026,Math.sin(a)*.026,-.02+i*.007]);}_fx.cork=b.geo();}
  var m=mesh(_fx.cork);m.name='fx_cork';return m;};
/* toy marble with a swirl; colour is a hex number or a team name */
var MARBLES=[0x2f6fe6,0xd4502c,0x4c9a3c,0xf2c230,0xf4f0e6,0x8a4fc0];
SS.fx.marble=function(colour){
  if(typeof colour==='string')colour=PAL[colour]?PAL[colour].main:MARBLES[0];if(colour==null)colour=MARBLES[0];
  var key='marble'+colour;if(!_fx[key]){var b=new Bld(14);b.sph(.034,12,9,colour,null);
    var c=b.C,p=b.P,w=lin(0xffffff);for(var i=0;i<p.length;i+=3){var a=Math.atan2(p[i+2],p[i])+p[i+1]*60;if(Math.sin(a*2)>.72){c[i]=w[0];c[i+1]=w[1];c[i+2]=w[2];}}
    _fx[key]=b.geo();}
  var m=mesh(_fx[key],gloss());m.name='projectile_marble';return m;};
