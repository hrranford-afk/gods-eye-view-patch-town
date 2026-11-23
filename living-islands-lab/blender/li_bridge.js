/* Living Islands: the bake-bridge pieces shared by blender/baked_bridge.html and cutaway.html (?finish=1), moved here from baked_bridge.html (see blender/BRIDGE_PILOT.md,
   CUTAWAY_FINISH.md). Classic script, sets window.LI_BRIDGE (needs THREE r128 at call time):
     installFilmicFit(tone)   replaces the body of r128's ACES tone chunk by the 65-entry table fitted from Blender's Filmic 'Medium High Contrast' (bridge.json -> tone)
     makeBridgeLandMaterial(B, albedo, lightTex, normalTex, maskTex, opts)   MeshStandardMaterial lit from the split bake: lightMap (uv2) x uSkyTint for the sky, the sun
         mask (uv2, channels weighted by uMaskW, strength uMaskAmt) on the DirectionalLight, the live shadow map where the mask does not apply (user data U holds the uniforms).
         opts: normalScale (0.45), cacheKey, onPatched(bool) */
(function () {
'use strict';
function installFilmicFit(tone) {
  const tab = tone.table.map(v => v.toFixed(6)).join(','), n = tone.table.length;
  const des = tone.desat.map(v => v.toFixed(4)).join(','), nd = tone.desat.length;
  const fn = `
const float FT_EV0 = ${tone.ev0.toFixed(2)}; const float FT_STEP = ${tone.step.toFixed(4)};
const float FT[${n}] = float[${n}](${tab});
const float FD[${nd}] = float[${nd}](${des});
float filmicCurve( float x ) {
	float e = log2( max( x, 1e-6 ) );
	float f = clamp( ( e - FT_EV0 ) / FT_STEP, 0.0, ${(n - 1.001).toFixed(3)} );
	int i = int( floor( f ) ); float t = f - float( i );
	return mix( FT[ i ], FT[ i + 1 ], t );
}
vec3 ACESFilmicToneMapping( vec3 color ) {      /* name kept so every material that includes tonemapping_fragment picks it up; the body is the Filmic fit */
	color *= toneMappingExposure;
	vec3 p = vec3( filmicCurve( color.r ), filmicCurve( color.g ), filmicCurve( color.b ) );
	${tone.use_desat ? `
	float lp = dot( p, vec3( 0.2126, 0.7152, 0.0722 ) );
	float e = log2( max( dot( color, vec3( 0.2126, 0.7152, 0.0722 ) ), 1e-6 ) );
	float f = clamp( ( e - ${tone.desat_ev0.toFixed(2)} ) / ${((tone.desat_ev1 - tone.desat_ev0) / (nd - 1)).toFixed(5)}, 0.0, ${(nd - 1.001).toFixed(3)} );
	int j = int( floor( f ) ); float s = mix( FD[ j ], FD[ j + 1 ], f - float( j ) );
	p = vec3( lp ) + s * ( p - vec3( lp ) );` : ''}
	return saturate( p );                         /* linear display values: three applies the sRGB OETF next (outputEncoding) */
}
`;
  const orig = THREE.ShaderChunk.tonemapping_pars_fragment;
  THREE.ShaderChunk.tonemapping_pars_fragment = orig.split('vec3 RRTAndODTFit')[0] + fn + 'vec3 CustomToneMapping( vec3 color ) { return color; }\n';
}

function makeBridgeLandMaterial(B, albedo, lightTex, normalTex, maskTex, opts) {
  opts = opts || {};
  const m = new THREE.MeshStandardMaterial({ map: albedo, normalMap: normalTex, roughness: 1.0, metalness: 0.0, lightMap: lightTex, lightMapIntensity: B.light_intensity });
  const ns = opts.normalScale === undefined ? 0.45 : opts.normalScale; m.normalScale.set(ns, ns);
  const U = { uSunMask: { value: maskTex }, uMaskW: { value: new THREE.Vector3(1, 0, 0) }, uMaskAmt: { value: 1 }, uSkyTint: { value: new THREE.Vector3(1, 1, 1) } };
  m.userData.U = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace('#include <lightmap_pars_fragment>', '#include <lightmap_pars_fragment>\nuniform sampler2D uSunMask; uniform vec3 uMaskW; uniform float uMaskAmt; uniform vec3 uSkyTint;');
    let begin = THREE.ShaderChunk.lights_fragment_begin;
    /* (1) the land takes its sky light from the baked light map only: no hemisphere/probe term */
    begin = begin.replace('irradiance += getLightProbeIrradiance( lightProbe, geometry );', '/* land: sky light = baked lightMap * uSkyTint */');
    /* (2) sun visibility from the baked mask (weights by sun elevation); where the mask does not apply (uMaskAmt -> 0) the live shadow map takes over */
    begin = begin.replace('IncidentLight directLight;', 'IncidentLight directLight;\n\tfloat sunVisMask = dot( texture2D( uSunMask, vUv2 ).rgb, uMaskW );');
    begin = begin.replace(/directLight\.color \*= (all\( bvec2\( directLight\.visible, receiveShadow \) \) \? getShadow\( directionalShadowMap[^;]*?: 1\.0);/, 'directLight.color *= mix( $1, 1.0, uMaskAmt );');
    begin = begin.replace('getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );', 'getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );\n\t\tdirectLight.color *= mix( 1.0, sunVisMask, uMaskAmt );');
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>', begin);
    let maps = THREE.ShaderChunk.lights_fragment_maps;
    maps = maps.replace('* lightMapIntensity;', '* lightMapIntensity * uSkyTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_maps>', maps);
    if (opts.onPatched) opts.onPatched(begin.includes('sunVisMask') && begin.includes('mix( all(') && maps.includes('uSkyTint'));
  };
  m.customProgramCacheKey = () => (opts.cacheKey || 'bridge-land-v1');
  return m;
}

window.LI_BRIDGE = { installFilmicFit, makeBridgeLandMaterial };
})();
