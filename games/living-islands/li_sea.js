/* Living Islands: the shared sea and land-shore code (shader strings, noise generators, flow encoder, intertidal land GLSL).
   Moved here VERBATIM from islands_look.html so that islands_look.html and cutaway.html (?finish=1, see CUTAWAY_FINISH.md) run the SAME sea, the same flow-map
   shader, the same grain / wet / swash-lace / caustic land pass and the same noise textures. Classic script: sets window.LI_SEA. Needs THREE r128 at call time
   (not at load time). The seed is an argument (the page passes its SEED); everything else is byte for byte what the page had. */
(function () {
'use strict';
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function hash2(ix,iz,s){let h=Math.imul(ix|0,374761393)+Math.imul(iz|0,668265263)+Math.imul(s|0,1442695041)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296;}
function fade(t){return t*t*t*(t*(t*6-15)+10);}
function tileNoise(size,oct,seed,base){const out=new Float32Array(size*size);
  for(let o=0;o<oct;o++){const f=base<<o,amp=Math.pow(.55,o);
    for(let j=0;j<size;j++)for(let i=0;i<size;i++){const x=i/size*f,z=j/size*f;const ix=Math.floor(x),iz=Math.floor(z),fx=fade(x-ix),fz=fade(z-iz);
      const h=(a,b)=>hash2(((a%f)+f)%f,((b%f)+f)%f,seed+o*31);
      const a=h(ix,iz),b=h(ix+1,iz),c=h(ix,iz+1),d=h(ix+1,iz+1);out[j*size+i]+=amp*(a+(b-a)*fx+(c-a)*fz+(a-b-c+d)*fx*fz);}}
  let mn=1e9,mx=-1e9;for(const v of out){if(v<mn)mn=v;if(v>mx)mx=v;}for(let i=0;i<out.length;i++)out[i]=(out[i]-mn)/(mx-mn);return out;}
function makeGrain(SEED){const S=256,n=tileNoise(S,6,SEED+3,4),d=new Uint8Array(S*S*4);
  for(let i=0;i<S*S;i++){const v=n[i]*255;d[i*4]=v;d[i*4+1]=v;d[i*4+2]=v;d[i*4+3]=255;}
  const t=new THREE.DataTexture(d,S,S,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}
function makeSeaNormal(SEED){const S=256,h1=tileNoise(S,4,SEED+11,5),low=tileNoise(S,3,SEED+29,2),d=new Uint8Array(S*S*4);
  const g=(i,j)=>h1[((j+S)%S)*S+((i+S)%S)];
  for(let j=0;j<S;j++)for(let i=0;i<S;i++){const gx=(g(i+1,j)-g(i-1,j))*S*.05,gz=(g(i,j+1)-g(i,j-1))*S*.05;
    d[(j*S+i)*4]=clamp(128+gx*127,0,255);d[(j*S+i)*4+1]=clamp(128+gz*127,0,255);d[(j*S+i)*4+2]=128;d[(j*S+i)*4+3]=low[j*S+i]*255;}
  const t=new THREE.DataTexture(d,S,S,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}
function makeFlowNoise(SEED){const S=256,a=tileNoise(S,8,SEED+41,4),b=tileNoise(S,6,SEED+53,4),c=tileNoise(S,5,SEED+67,3),d=new Uint8Array(S*S*4);
  for(let i=0;i<S*S;i++){d[i*4]=a[i]*255;d[i*4+1]=b[i]*255;d[i*4+2]=c[i]*255;d[i*4+3]=255;}
  const t=new THREE.DataTexture(d,S,S,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}

/* the flow texture encoder of flowTexUpdate: U is (u,v) per cell (FN x FN, cell metres), writes RGBA8 into texData: R,G velocity / VMAX, B -divergence, A vorticity (both / 0.5) */
function flowEncode(U,FN,cell,VMAX,texData){
  const enc=(v,s)=>Math.round(clamp(v/s*.5+.5,0,1)*255),d=texData;
  for(let j=0;j<FN;j++)for(let i=0;i<FN;i++){const il=Math.max(i-1,0),ir=Math.min(i+1,FN-1),jl=Math.max(j-1,0),jr=Math.min(j+1,FN-1),k=(j*FN+i)*4;
    const dudx=(U[(j*FN+ir)*2]-U[(j*FN+il)*2])/((ir-il)*cell),dvdz=(U[(jr*FN+i)*2+1]-U[(jl*FN+i)*2+1])/((jr-jl)*cell);
    const dvdx=(U[(j*FN+ir)*2+1]-U[(j*FN+il)*2+1])/((ir-il)*cell),dudz=(U[(jr*FN+i)*2]-U[(jl*FN+i)*2])/((jr-jl)*cell);
    d[k]=enc(U[(j*FN+i)*2],VMAX);d[k+1]=enc(U[(j*FN+i)*2+1],VMAX);
    d[k+2]=enc(-(dudx+dvdz),.5);d[k+3]=enc(dvdx-dudz,.5);}
}
const SEA2_FS=`precision highp float;
  uniform float uTime,uSeaT,uTide,uQ,uTideV,uLand,uPix,uDbg;uniform sampler2D uH,uN;uniform vec3 uSun,uSunCol;uniform vec4 uWake[24];uniform vec2 uWind;varying vec3 vW;
  #define TS 100.0
  vec4 hs(vec2 p){return texture2D(uH,p/(2.0*TS)+0.5);}
  float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(0.06711056,0.00583715))));}
  float h12(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  /* one directional ripple train, sharp crests, analytic slope; fades out when its wavelength nears the pixel footprint (no derivatives) */
  void rip(vec2 p,vec2 d,float wl,float steep,float t,float warp,float fp,inout vec2 g,inout float hh,inout float hf){
    float fd=1.0-smoothstep(0.3*wl,0.95*wl,fp);if(fd<0.004)return;
    float k=6.2832/wl;float ph=dot(d,p)*k+t*0.75*sqrt(wl)*k+warp;float s=sin(ph);float e=exp(1.7*(s-1.0));
    float a=steep*fd;g+=d*(a*1.7*e*cos(ph));hh+=a*e;if(wl<1.0)hf+=a*e;}
  vec3 sky(vec3 r){float y=max(r.y,0.0);vec3 hor=vec3(0.20,0.30,0.44),zen=vec3(0.02,0.075,0.26);vec3 c=mix(hor,zen,pow(y,0.55));c+=uSunCol*0.03*pow(max(dot(r,uSun),0.0),8.0);return c;}
  void main(){
    vec2 p=vW.xz;vec4 s=hs(p);float th=s.r*8.0-5.0;float depth=uTide-th;
    if(depth<-0.02)discard;
    vec3 Vv=cameraPosition-vW;float dist=length(Vv);vec3 V=Vv/dist;
    float t=uSeaT;float fp=dist*uPix;
    vec2 W=uWind,Wp=vec2(-W.y,W.x);
    /* lee slicks: land upwind within ~25 m calms the water behind it */
    float lee=0.0;
    {float a0=smoothstep(0.05,0.6,hs(p-W*3.0).r*8.0-5.0-uTide);float a1=smoothstep(0.05,0.6,hs(p-W*7.0).r*8.0-5.0-uTide);float a2=uQ>0.5?smoothstep(0.05,0.6,hs(p-W*13.0).r*8.0-5.0-uTide):0.0;
     lee=max(a0*0.95,max(a1*0.8,a2*0.55));}
    float calm=1.0-0.6*lee;
    /* slow patchy gusts and a domain warp, one tap each */
    vec4 wn=texture2D(uN,p*0.021+vec2(0.31,0.17)+W*t*0.002);
    float gust=0.55+0.9*texture2D(uN,p*0.012+0.6).a;
    vec2 pw=p+vec2(wn.a-0.5,texture2D(uN,p*0.017+vec2(0.55,0.83)).a-0.5)*(uQ>0.5?7.0:3.0);
    float w1=(wn.a-0.5)*2.2;
    vec2 g=vec2(0.0);float hh=0.0,hf=0.0;
    /* swells: a little off the wind */
    rip(p,normalize(W+0.35*Wp),19.0,0.075*gust,t,w1,fp,g,hh,hf);
    rip(p,normalize(W-0.45*Wp),9.3,0.085*gust,t,w1*1.3,fp,g,hh,hf);
    rip(pw,normalize(W+0.5*Wp),4.7,0.090*gust,t,w1*1.7,fp,g,hh,hf);
    rip(pw,normalize(W-0.7*Wp),2.45,0.095*gust,t,w1*2.1,fp,g,hh,hf);
    rip(pw,normalize(W+0.9*Wp),1.31,0.105,t,w1*2.6,fp,g,hh,hf);
    if(uQ>0.5){
    rip(pw,normalize(W-1.1*Wp),0.71,0.105,t,w1*3.1,fp,g,hh,hf);
    rip(pw,normalize(W+1.5*Wp),0.40,0.10,t,w1*3.7,fp,g,hh,hf);
    rip(pw,normalize(W-0.35*Wp),0.23,0.085,t,w1*4.3,fp,g,hh,hf);
    /* chop: wind-stretched noise, three scales, drifting downwind */
    vec2 q=vec2(dot(pw,W),dot(pw,Wp));
    vec2 c1=texture2D(uN,vec2(q.x*0.8-t*0.55,q.y*0.4)).rg-0.5;
    vec2 c2=texture2D(uN,vec2(q.x*1.75-t*0.8,q.y*0.9+0.37)).rg-0.5;
    vec2 c3=texture2D(uN,vec2(q.x*3.7-t*1.1,q.y*2.9+0.71)).rg-0.5;
    vec2 cc=c1*0.22+c2*0.26+c3*0.22;g+=(W*cc.x+Wp*cc.y)*1.9;
    }else{
    vec2 q=vec2(dot(pw,W),dot(pw,Wp));vec2 c1=texture2D(uN,vec2(q.x*0.9-t*0.6,q.y*0.3)).rg-0.5;g+=(W*c1.x+Wp*c1.y)*0.9;}
    g*=calm;hh*=calm;hf*=calm;
    g*=mix(0.25,1.0,smoothstep(0.0,0.6,depth));
    vec3 N=normalize(vec3(-g.x,1.0,-g.y));
    float ndv=max(dot(N,V),0.0);float fres=0.02+0.98*pow(1.0-ndv,5.0);
    vec3 L=uSun;vec3 R=reflect(-V,N);
    /* terrain shadow on the water (fewer taps than the default sea) */
    float shadow=1.0;vec2 ld=normalize(L.xz);float tanE=L.y/length(L.xz);float jit=ign(gl_FragCoord.xy);
    for(int i=1;i<=7;i++){float tt=(float(i)-0.5+jit)*4.0;float h2=texture2D(uH,(p+ld*tt)/(2.0*TS)+0.5).b*14.0;float ray=uTide+tt*tanE;shadow=min(shadow,1.0-smoothstep(-0.2,0.8,h2-ray));}
    shadow=mix(1.0,shadow,0.85);
    /* colour: absorption with depth, narrow uneven shallow band */
    float nz=texture2D(uN,p*0.17+vec2(t*0.012,-t*0.008)).a;
    float nz2=texture2D(uN,vec2(dot(p,W)*0.55,dot(p,Wp)*1.5)+vec2(0.2,t*0.0)).a;
    vec3 deepC=vec3(0.005,0.048,0.100),midC=vec3(0.011,0.092,0.158),shalC=vec3(0.03,0.30,0.33);
    float sh=1.0-smoothstep(0.04,0.20+0.7*nz*nz,depth+(nz2-0.5)*0.12);
    float bm=smoothstep(0.2,1.1,depth);
    vec3 body=mix(midC,deepC,bm);
    body=mix(body,shalC,sh*(0.55+0.45*nz2));
    float crest=smoothstep(0.35,1.0,hh/(0.28*gust+0.1));
    body+=vec3(0.0,0.02,0.014)*crest*(0.35+0.65*shadow)*smoothstep(0.5,2.0,depth)*calm;
    float sunl=0.22+0.7*L.y*shadow+2.8*pow(max(dot(N,L),0.0),2.5)*shadow;
    vec3 col=body*(0.4+0.85*sunl)*vec3(1.0,0.95,0.88)*(0.68+0.34*smoothstep(0.55,1.45,gust));
    vec3 sk=sky(R)*mix(1.0,0.9,lee);
    col=mix(col,sk,fres);
    /* sun glitter: specular of the rippled normal, plus sub-pixel facet jitter that grows with distance (lost ripple energy) */
    float spread=0.34*smoothstep(8.0,110.0,dist)+0.08;
    vec2 cell=floor(p/max(fp*1.6,0.05));vec2 cj=vec2(h12(cell+floor(t*1.7)),h12(cell+31.7+floor(t*1.7)))-0.5;
    vec3 Ns=normalize(N+vec3(cj.x,0.0,cj.y)*spread*calm);
    vec3 H1=normalize(L+V);vec3 Rs=reflect(-V,Ns);
    float sd=max(dot(R,L),0.0),sd2=max(dot(Rs,L),0.0);
    float glit=pow(sd,1500.0)*50.0+pow(sd2,420.0)*(40.0*uQ+14.0)+pow(sd,300.0)*0.35+pow(sd,40.0)*0.03;
    glit=min(glit,4.0)*(0.35+0.65*smoothstep(0.1,0.6,hh/(0.28*gust+0.1)+0.3));
    if(uDbg>1.5)glit=0.0;col+=vec3(2.2,1.9,1.55)*glit*shadow*calm*smoothstep(0.1,0.8,depth);
    float alpha=1.0-0.95*exp(-depth*3.2);alpha=max(alpha,fres);
    /* whitecaps: steep crests inside gust patches, many tiny; streaks along the wind; fade into a bright tint with distance */
    float gpatch=smoothstep(0.35,0.75,texture2D(uN,p*0.016+0.2).a);
    float streak=texture2D(uN,vec2(dot(p,W)*0.22,dot(p,Wp)*1.9)+vec2(0.37,0.11)).a;
    float hn=hh/(0.28*gust+0.1);
    float tiny=smoothstep(0.92,1.1,hf*3.2/gust+(nz2-0.5)*0.35)*(0.2+0.8*gpatch);
    float big=smoothstep(1.05,1.35,hn+(streak-0.5)*0.9)*gpatch;
    float cap=max(tiny*0.5,big*0.6)*calm*smoothstep(0.4,1.4,depth);if(mod(uDbg,2.0)>0.5)cap=0.0;
    /* foam: thin, broken lines hugging the rocks, calm in the lee */
    float expo=s.g;float lap=0.5+0.5*sin(t*1.25+nz*9.0);float pulse=1.0+1.4*clamp(abs(uTideV)*40.0,0.0,1.0);
    float edge=smoothstep((0.045+0.05*lap+0.10*expo)*pulse*mix(1.0,0.5,uLand),0.0,depth+(nz-0.5)*0.10);
    float ph=depth*(3.4/(0.6+expo))+t*(0.4+0.3*expo)+nz*1.6;
    float band=smoothstep(0.80,0.99,0.5+0.5*sin(ph*6.2832))*smoothstep(0.20+0.7*expo,0.08,depth)*expo*0.55;
    float wake=0.0;
    if(uQ>0.5){for(int i=0;i<24;i++){vec4 w=uWake[i];if(w.z<1.0){float d=length(p-w.xy);float wd0=0.2+w.z*0.8;wake+=(1.0-w.z)*(smoothstep(wd0,0.0,d)*0.9+smoothstep(wd0*3.0,wd0*0.6,d)*0.18*step(0.5,nz2+0.2));}}}
    float fo=max(edge,band);
    fo*=smoothstep(0.30,0.55,nz2+0.5*fo+0.1)*(1.0-0.5*lee);
    float foam=clamp(max(max(fo,cap),wake)*(0.95+0.5*expo),0.0,1.0);
    float tintD=smoothstep(60.0,260.0,dist);
    vec3 foamC=vec3(0.93,0.96,0.97)*(0.5+0.9*shadow)*vec3(1.0,0.96,0.9);
    col=mix(col,foamC,foam);alpha=max(alpha,foam*0.95);
    col+=vec3(0.010,0.016,0.020)*tintD*(gpatch*0.8+0.2)*calm;
    float r=length(p);float rimL=smoothstep(92.5,94.0,r);col=mix(col,col*1.8+vec3(0.05,0.07,0.07),rimL*0.6);
    gl_FragColor=vec4(col,alpha);
    #ifdef NOPOST
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #endif
    }`;
const SEAF_FS=`precision highp float;
  uniform float uTime,uSeaT,uTide,uQ,uTideV,uLand,uPix,uDbg;uniform sampler2D uH,uN,uFlow,uK;uniform vec3 uSun,uSunCol;uniform vec4 uWake[24];uniform vec2 uWind,uAxis;varying vec3 vW;
  #define TS 100.0
  #define VMAX 3.0
  #define FTAU 7.0
  vec4 hs(vec2 p){return texture2D(uH,p/(2.0*TS)+0.5);}
  vec4 fl(vec2 p){return texture2D(uFlow,p/(2.0*TS)+0.5);}
  float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(0.06711056,0.00583715))));}
  float h12(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  vec2 rot2(vec2 v,float a){float c=cos(a),s=sin(a);return vec2(c*v.x-s*v.y,s*v.x+c*v.y);}
  void rip(vec2 p,vec2 d,float wl,float steep,float t,float warp,float fp,inout vec2 g,inout float hh,inout float hf){
    float fd=1.0-smoothstep(0.3*wl,0.95*wl,fp);if(fd<0.004)return;
    float k=6.2832/wl;float ph=dot(d,p)*k+t*0.75*sqrt(wl)*k+warp;float s=sin(ph);float e=exp(1.7*(s-1.0));
    float a=steep*fd;g+=d*(a*1.7*e*cos(ph));hh+=a*e;if(wl<1.0)hf+=a*e;}
  /* the same train evaluated at two flow-displaced positions and cross-faded (flow map) */
  void ripA(vec2 p,vec2 D0,vec2 D1,float w0,float w1,vec2 d,float wl,float steep,float t,float warp,float fp,inout vec2 g,inout float hh,inout float hf){
    vec2 ga=vec2(0.0),gb=vec2(0.0);float ha=0.0,hb=0.0,fa=0.0,fb=0.0;
    rip(p-D0,d,wl,steep,t,warp,fp,ga,ha,fa);rip(p-D1,d,wl,steep,t,warp,fp,gb,hb,fb);
    float nr=inversesqrt(w0*w0+w1*w1);g+=(ga*w0+gb*w1)*nr;hh+=(ha*w0+hb*w1)*nr;hf+=(fa*w0+fb*w1)*nr;}
  vec3 sky(vec3 r){float y=max(r.y,0.0);vec3 hor=vec3(0.20,0.30,0.44),zen=vec3(0.02,0.075,0.26);vec3 c=mix(hor,zen,pow(y,0.55));c+=uSunCol*0.03*pow(max(dot(r,uSun),0.0),8.0);return c;}
  vec2 gW,gWp;
  vec2 chopS(vec2 pa,float tt,float hi){vec2 q=vec2(dot(pa,gW),dot(pa,gWp));
    vec2 c1=texture2D(uN,vec2(q.x*0.8-tt*0.25,q.y*0.5)).rg-0.5;vec2 c=c1*0.5;
    if(hi>0.5){vec2 c3=texture2D(uN,vec2(q.x*3.1-tt*0.5,q.y*2.4+0.71)).rg-0.5;c+=c3*0.42;}
    return (gW*c.x+gWp*c.y)*1.9;}
  vec2 chopI(vec2 pa,float hi){vec2 c=(texture2D(uN,pa*0.83+vec2(0.37,0.11)).rg-0.5)*0.5;if(hi>0.5)c+=(texture2D(uN,pa*2.3+vec2(0.52,0.83)).rg-0.5)*0.5;return c*1.3;}
  void main(){
    vec2 p=vW.xz;vec4 s=hs(p);float th=s.r*8.0-5.0;float depth=uTide-th;
    if(depth<-0.02)discard;
    vec3 Vv=cameraPosition-vW;float dist=length(Vv);vec3 V=Vv/dist;
    float t=uSeaT;float fp=dist*uPix;
    /* wind direction drifts slowly with place (regional), so the fan of trains is not parallel everywhere */
    float wa=(texture2D(uN,p*0.0071+vec2(0.43,0.77)).a-0.5)*1.1+(texture2D(uN,p*0.0043+vec2(0.11,0.31)).a-0.5)*0.7;
    vec2 W=rot2(uWind,wa),Wp=vec2(-W.y,W.x);gW=W;gWp=Wp;
    /* local current and two-phase flow map */
    vec4 f0=fl(p);vec2 uc=(f0.rg-0.5)*(2.0*VMAX);float sp=length(uc);
    float conv=f0.b-0.5,vort=f0.a-0.5;float fs=smoothstep(0.06,0.6,sp);
    float ph0=fract(t/FTAU),ph1=fract(t/FTAU+0.5);float w0=1.0-abs(1.0-2.0*ph0),w1=1.0-w0;float nrm=inversesqrt(w0*w0+w1*w1);
    vec2 D0=uc*(FTAU*ph0),D1=uc*(FTAU*ph1);
    vec2 axn=vec2(-uAxis.y,uAxis.x);
    float hi=uQ;
    /* lee slicks: land upwind of the wind, and land up-current */
    float lee=0.0;
    {float a0=smoothstep(0.05,0.6,hs(p-W*3.0).r*8.0-5.0-uTide);float a1=smoothstep(0.05,0.6,hs(p-W*7.0).r*8.0-5.0-uTide);float a2=uQ>0.5?smoothstep(0.05,0.6,hs(p-W*13.0).r*8.0-5.0-uTide):0.0;
     lee=max(a0*0.95,max(a1*0.8,a2*0.55));
     vec2 fd=uc/(sp+0.05);float c0=smoothstep(0.05,0.6,hs(p-fd*4.0).r*8.0-5.0-uTide);float c1=uQ>0.5?smoothstep(0.05,0.6,hs(p-fd*9.0).r*8.0-5.0-uTide):0.0;
     lee=max(lee,max(c0,c1*0.8)*fs*0.85);}
    float calm=1.0-0.6*lee;
    /* regional amplitude patches per train, medium and fine domain warps */
    vec4 wn=texture2D(uN,p*0.021+vec2(0.31,0.17)+W*t*0.002);
    float gust=0.55+0.9*texture2D(uN,p*0.012+0.6).a;
    vec2 pw=p+vec2(wn.a-0.5,texture2D(uN,p*0.017+vec2(0.55,0.83)).a-0.5)*(uQ>0.5?11.0:4.0);
    if(uQ>0.5)pw+=(texture2D(uN,p*0.33+vec2(0.7,0.2)).rg-0.5)*1.8;
    /* streaks and slicks: noise stretched along the tidal axis, carried by the flow, so they bend round islands and fade at slack water */
    vec2 wrp=pw-p;vec2 qa=p-D0+wrp*0.9,qb=p-D1+wrp*0.9;
    float k1=0.5*(texture2D(uK,vec2(dot(qa,uAxis)*0.030,dot(qa,axn)*0.55)+vec2(0.19,0.43)).r+texture2D(uK,vec2(dot(qa,uAxis)*0.021,dot(qa,axn)*0.83)+vec2(0.71,0.12)).g);
    float k2=0.5*(texture2D(uK,vec2(dot(qb,uAxis)*0.030,dot(qb,axn)*0.55)+vec2(0.19,0.43)).r+texture2D(uK,vec2(dot(qb,uAxis)*0.021,dot(qb,axn)*0.83)+vec2(0.71,0.12)).g);
    float strk=0.5+(k1*w0+k2*w1-0.5)*nrm*1.9;
    float b1=texture2D(uK,vec2(dot(qa,uAxis)*0.085,dot(qa,axn)*0.31)+vec2(0.37,0.81)).b,b2=texture2D(uK,vec2(dot(qb,uAxis)*0.085,dot(qb,axn)*0.31)+vec2(0.37,0.81)).b;
    float brk=smoothstep(0.34,0.62,0.5+(b1*w0+b2*w1-0.5)*nrm*1.6);
    float sl=0.5,sl1=0.5;
    if(uQ>0.5){sl=texture2D(uK,vec2(dot(qa,uAxis)*0.010,dot(qa,axn)*0.19)+vec2(0.63,0.05)).b;sl1=texture2D(uK,vec2(dot(qb,uAxis)*0.010,dot(qb,axn)*0.19)+vec2(0.63,0.05)).b;}
    float slk=0.5+(sl*w0+sl1*w1-0.5)*nrm*1.8;
    float cvs=clamp(conv/0.12,-1.0,1.0),shr=clamp(abs(vort)/0.25,0.0,1.0);
    float slick=smoothstep(0.50,0.64,slk+0.12*cvs+0.10*shr)*(0.35+0.65*fs);
    calm*=1.0-0.55*slick*smoothstep(0.2,0.9,depth);
    float pwr=(wn.a-0.5)*3.2;
    float m1=texture2D(uN,p*0.037+vec2(0.9,0.2)).a,m2=texture2D(uN,p*0.061+vec2(0.15,0.65)).a;
    float am1=0.35+0.95*smoothstep(0.36,0.64,m1),am2=0.35+0.95*smoothstep(0.36,0.64,m2),am3=0.35+0.95*smoothstep(0.36,0.64,1.0-0.5*(m1+m2));
    vec2 g=vec2(0.0);float hh=0.0,hf=0.0;
    rip(p,normalize(W+0.35*Wp),19.0,0.075*gust,t,pwr,fp,g,hh,hf);
    rip(p,normalize(W-0.45*Wp),9.3,0.085*gust*am1,t,pwr*1.3,fp,g,hh,hf);
    rip(pw,normalize(W+0.5*Wp),4.7,0.090*gust*am2,t,pwr*1.7,fp,g,hh,hf);
    rip(pw,normalize(W-0.7*Wp),2.45,0.095*gust*am3,t,pwr*2.1,fp,g,hh,hf);
    ripA(pw,D0,D1,w0,w1,normalize(W+1.4*Wp),1.31,0.105*am1,t,pwr*2.6,fp,g,hh,hf);
    vec2 pa0=pw-D0,pa1=pw-D1;
    if(uQ>0.5){
    ripA(pw,D0,D1,w0,w1,normalize(W-1.1*Wp),0.71,0.105*am2,t,pwr*3.1,fp,g,hh,hf);
    rip(pw-D0*0.5,normalize(W+2.6*Wp),0.40,0.10*am3,t,pwr*3.7,fp,g,hh,hf);
    rip(pw-D1*0.5,normalize(W-1.9*Wp),0.23,0.085*am1,t,pwr*4.3,fp,g,hh,hf);
    }
    /* chop: wind-stretched plus isotropic, both carried by the current */
    vec2 cs=(chopS(pa0,t,hi)*w0+chopS(pa1,t,hi)*w1)*nrm*(0.55+0.9*smoothstep(0.3,0.7,m2));
    vec2 ci=(chopI(pa0,hi)*w0+chopI(pa1,hi)*w1)*nrm*(0.35+1.0*smoothstep(0.3,0.7,m1));
    g+=cs+ci;
    g*=calm;hh*=calm;hf*=calm;
    g*=mix(0.25,1.0,smoothstep(0.0,0.6,depth));
    vec3 N=normalize(vec3(-g.x,1.0,-g.y));
    float ndv=max(dot(N,V),0.0);float fres=0.02+0.98*pow(1.0-ndv,5.0);
    vec3 L=uSun;vec3 R=reflect(-V,N);
    float shadow=1.0;vec2 ld=normalize(L.xz);float tanE=L.y/length(L.xz);float jit=ign(gl_FragCoord.xy);
    for(int i=1;i<=7;i++){float tt=(float(i)-0.5+jit)*4.0;float h2=texture2D(uH,(p+ld*tt)/(2.0*TS)+0.5).b*14.0;float ray=uTide+tt*tanE;shadow=min(shadow,1.0-smoothstep(-0.2,0.8,h2-ray));}
    shadow=mix(1.0,shadow,0.85);
    float nz=texture2D(uN,p*0.17+vec2(t*0.012,-t*0.008)).a;
    float nz2=0.5+(texture2D(uN,vec2(dot(qa,W)*0.55,dot(qa,Wp)*1.5)+vec2(0.2,0.0)).a*w0+texture2D(uN,vec2(dot(qb,W)*0.55,dot(qb,Wp)*1.5)+vec2(0.2,0.0)).a*w1-0.5)*nrm;
    vec3 deepC=vec3(0.005,0.048,0.100),midC=vec3(0.011,0.092,0.158),shalC=vec3(0.03,0.30,0.33);
    float sh=1.0-smoothstep(0.04,0.20+0.7*nz*nz,depth+(nz2-0.5)*0.12);
    float bm=smoothstep(0.2,1.1,depth);
    vec3 body=mix(midC,deepC,bm);
    body=mix(body,shalC,sh*(0.55+0.45*nz2));
    float crest=smoothstep(0.35,1.0,hh/(0.28*gust+0.1));
    body+=vec3(0.0,0.02,0.014)*crest*(0.35+0.65*shadow)*smoothstep(0.5,2.0,depth)*calm;
    float sunl=0.22+0.7*L.y*shadow+2.8*pow(max(dot(N,L),0.0),2.5)*shadow;
    vec3 col=body*(0.4+0.85*sunl)*vec3(1.0,0.95,0.88)*(0.68+0.34*smoothstep(0.55,1.45,gust));
    vec3 sk=sky(R)*mix(1.0,0.9,lee);
    col=mix(col,sk,fres);
    col=mix(col,col*1.15+vec3(0.004,0.010,0.016),slick*0.5*smoothstep(0.2,0.9,depth));
    /* glitter: facet jitter cells ride the current too */
    float spread=0.34*smoothstep(8.0,110.0,dist)+0.08;float cs0=max(fp*1.6,0.05);
    float tq=floor(t*1.7);
    vec2 cl0=floor(qa/cs0),cl1=floor(qb/cs0);
    vec2 cj=((vec2(h12(cl0+tq),h12(cl0+31.7+tq))-0.5)*w0+(vec2(h12(cl1+tq),h12(cl1+31.7+tq))-0.5)*w1)*nrm;
    vec3 Ns=normalize(N+vec3(cj.x,0.0,cj.y)*spread*calm);
    vec3 Rs=reflect(-V,Ns);
    float sd=max(dot(R,L),0.0),sd2=max(dot(Rs,L),0.0);
    float glit=pow(sd,1500.0)*50.0+pow(sd2,420.0)*(40.0*uQ+14.0)+pow(sd,300.0)*0.35+pow(sd,40.0)*0.03;
    glit=min(glit,4.0)*(0.35+0.65*smoothstep(0.1,0.6,hh/(0.28*gust+0.1)+0.3));
    if(uDbg>1.5)glit=0.0;col+=vec3(2.2,1.9,1.55)*glit*shadow*calm*smoothstep(0.1,0.8,depth);
    float alpha=1.0-0.95*exp(-depth*3.2);alpha=max(alpha,fres);
    float gpatch=smoothstep(0.35,0.75,texture2D(uN,p*0.016+0.2).a);
    float hn=hh/(0.28*gust+0.1);
    float tiny=smoothstep(0.92,1.1,hf*3.2/gust+(nz2-0.5)*0.35)*(0.2+0.8*gpatch);
    float big=smoothstep(1.05,1.35,hn+(strk-0.5)*0.9)*gpatch;
    float cap=max(tiny*0.5,big*0.6)*calm*smoothstep(0.4,1.4,depth);if(mod(uDbg,2.0)>0.5)cap=0.0;
    /* current foam: streaks along the stream where it is fast, collecting on convergence and shear lines and in slow eddies */
    float eddy=smoothstep(0.08,0.28,abs(vort))*(1.0-fs);
    float fstr=smoothstep(0.74,1.04,strk+0.10*cvs+0.10*shr)*brk*(0.2+0.8*fs)*(1.0-0.6*lee)*smoothstep(0.35,1.2,depth);
    float fedd=smoothstep(0.74,0.9,strk+0.06*cvs)*eddy*smoothstep(0.35,1.2,depth);
    float cfoam=max(fstr*0.34,fedd*0.5);if(mod(uDbg,2.0)>0.5)cfoam=0.0;
    float expo=s.g;float lap=0.5+0.5*sin(t*1.25+nz*9.0);float pulse=1.0+1.4*clamp(abs(uTideV)*40.0,0.0,1.0);
    float edge=smoothstep((0.045+0.05*lap+0.10*expo)*pulse*mix(1.0,0.5,uLand),0.0,depth+(nz-0.5)*0.10);
    float ph=depth*(3.4/(0.6+expo))+t*(0.4+0.3*expo)+nz*1.6;
    float band=smoothstep(0.80,0.99,0.5+0.5*sin(ph*6.2832))*smoothstep(0.20+0.7*expo,0.08,depth)*expo*0.55;
    float wake=0.0;
    if(uQ>0.5){for(int i=0;i<24;i++){vec4 w=uWake[i];if(w.z<1.0){float d=length(p-w.xy);float wd0=0.2+w.z*0.8;wake+=(1.0-w.z)*(smoothstep(wd0,0.0,d)*0.9+smoothstep(wd0*3.0,wd0*0.6,d)*0.18*step(0.5,nz2+0.2));}}}
    float fo=max(edge,band);
    fo*=smoothstep(0.30,0.55,nz2+0.5*fo+0.1)*(1.0-0.5*lee);
    float foam=clamp(max(max(max(fo,cap),wake),cfoam)*(0.95+0.5*expo),0.0,1.0);
    float tintD=smoothstep(60.0,260.0,dist);
    vec3 foamC=vec3(0.93,0.96,0.97)*(0.5+0.9*shadow)*vec3(1.0,0.96,0.9);
    col=mix(col,foamC,foam);alpha=max(alpha,foam*0.95);
    col+=vec3(0.010,0.016,0.020)*tintD*(gpatch*0.8+0.2)*calm;
    float r=length(p);float rimL=smoothstep(92.5,94.0,r);col=mix(col,col*1.8+vec3(0.05,0.07,0.07),rimL*0.6);
    gl_FragColor=vec4(col,alpha);
    #ifdef NOPOST
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #endif
    }`;
/* the land colour pass of landMat(): triplanar grain, tide wetness, swash lace, underwater caustics. Needs varyings vWP, vWN and uniforms uTide, uTime, uGrainAmt, uWet, uGrain */
const LAND_WET_GLSL=`      {vec3 nn=normalize(vWN);vec3 bw=pow(abs(nn),vec3(3.0));bw/=(bw.x+bw.y+bw.z);
       float gA=texture2D(uGrain,vWP.zy*0.42).r*bw.x+texture2D(uGrain,vWP.xz*0.42).r*bw.y+texture2D(uGrain,vWP.xy*0.42).r*bw.z;
       float gB=texture2D(uGrain,vWP.zy*1.9).r*bw.x+texture2D(uGrain,vWP.xz*1.9).r*bw.y+texture2D(uGrain,vWP.xy*1.9).r*bw.z;
       float gC=texture2D(uGrain,vWP.zy*5.3).r*bw.x+texture2D(uGrain,vWP.xz*5.3).r*bw.y+texture2D(uGrain,vWP.xy*5.3).r*bw.z;float grain=(gA-0.5)*0.9+(gB-0.5)*0.8+(gC-0.5)*0.7;
       diffuseColor.rgb*=clamp(1.0+grain*uGrainAmt,0.45,1.7);
       float ab=vWP.y-uTide;
       float sw=0.5+0.5*sin(uTime*1.05+gA*7.0+vWP.x*0.35+vWP.z*0.27);float run=0.22*sw*uWet;float ab2=ab-run;
       float wetM=1.0-smoothstep(0.0,0.6,ab2);
       diffuseColor.rgb*=mix(1.0,0.55,wetM*uWet);
       float inSheet=step(0.0,ab)*step(ab,run);
       float lace=smoothstep(0.4,0.7,gB*0.9+gA*0.4+(1.0-ab/max(run,0.01))*0.3);
       float foamL=inSheet*lace*0.8+smoothstep(0.05,0.0,abs(ab-run))*0.5*step(0.0,ab);
       diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.88,0.92,0.9),clamp(foamL,0.0,1.0)*uWet);
       if(ab<0.0){float cd=-ab;float c1=texture2D(uGrain,vWP.xz*0.33+vec2(uTime*0.035,0.0)).r;float c2=texture2D(uGrain,vWP.xz*0.27-vec2(0.0,uTime*0.03)).r;
         float cs=smoothstep(0.35,0.75,c1*c2*2.0);diffuseColor.rgb*=1.0+1.5*cs*smoothstep(3.2,0.2,cd);}
      }`;
window.LI_SEA = { tileNoise, makeGrain, makeSeaNormal, makeFlowNoise, flowEncode, SEA2_FS, SEAF_FS, LAND_WET_GLSL, hash2, fade };
})();
