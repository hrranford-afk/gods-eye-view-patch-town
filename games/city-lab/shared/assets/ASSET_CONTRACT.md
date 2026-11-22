# Asset contract v0 (job C04), by CLOUD Claude, 22 Nov 2026
Status: PASSED for what it claims: the contract is written; an independent verifier checks 12 things from a file's own bytes; 37 tests pass (a valid fixture, 31 hostile ones each caught by the right check, and a real loader, three.js r128 GLTFLoader, agreeing with the verifier). NOT done: the converter that makes assets (needs the workshop's real Blender facts first), any real Blender output, any iPad measurement. Test fixtures were made WITHOUT Blender by a hand-written writer; they are not workshop output.
Reproduce: `NODE_PATH=$(npm root -g) node tests/asset-test.js`; `node shared/tools/make-test-assets.mjs shared/assets/fixtures`; `node shared/tools/asset-verify.mjs shared/assets/fixtures/valid/manifest.json --request shared/assets/fixtures/valid/request.json`.

## 1 The pipeline and who owns what
RECIPE (data, `rtk.building` v1, validated) -> `asset_request` (CLOUD) -> the owner approves a run -> FIXED CONVERTER + INSPECTOR on the workshop (HARDWARE) -> `asset_manifest` + files -> `asset-verify` run independently (CLOUD) -> import into a game (CLOUD). Hardware owns making and its own inspection; Cloud owns the contract, the independent check and the game side. Neither duplicates the other. A later step never turns an earlier missing proof into a pass.

## 2 Safety rules (the City Lab pattern, applied to 3D)
1. Data in, data out. A model may propose a recipe (data). A model never writes code that runs on a machine.
2. The converter is ONE fixed, reviewed script, never edited by a model, whose SHA-256 is recorded in every manifest. Blender can run arbitrary code, so nothing but that script runs in it.
3. The verifier trusts nothing the producer says: sizes, triangle counts, bounds, textures and sockets are re-measured from the bytes. A pretty screenshot or "inspection passed" is not evidence.
4. No executables, extensions, scripts, external links, cameras, lights or animation in a file (v0 is static).
5. `run_approved_by_owner` must be true. A request is not a job; it goes through the town's order form and the owner's approval.
6. The public repository gets only safe summaries of hardware (no hostnames, paths, logs, weaknesses). Asset files and previews stay out of the public repository unless the owner approves.

## 3 Conventions (all assets)
Units metres; glTF 2.0 binary (.glb); y up; front is +z (as City Lab recipes); origin at the BASE CENTRE on y=0; one scene. Node names plain: letters, digits, `_`, `.`, `-` (max 48), but AVOID dots in names the game must find: three.js REMOVES dots from node names when it loads a file (found by the real-loader test). Sockets are empty nodes named `socket_<name>` (for example `socket_door`, `socket_mast`) placed where something attaches. Every asset has one node `collider` whose `extras.box = [w, h, d]` (metres, positive). LOD files are `<id>.lod1.glb`, `<id>.lod2.glb` (each strictly fewer triangles, same overall size within 5 percent). Textures are embedded PNG or JPEG, power-of-two sizes. Materials are glTF metal-roughness. File names are relative, inside the manifest's folder, ending .glb, .png or .json.

## 4 Shapes
`asset_request`: {request_id, recipe_path, recipe_sha256, validator_commit, class, wanted_outputs, machine_run_approved, notes}. Draft, NOT a runnable job.
`asset_manifest` v0 (strict keys): {schema, version, asset_id, recipe{id, version, sha256}, class, units "m", up "y", front "+z", files{glb, lods[], preview_png} each {path, sha256, bytes}, footprint{w,d}, bounds{min,max}, lods[{triangles}], materials, textures[{name,w,h,format}], sockets[{name,pos}], collider{box}, producer{machine_class, converter_id, converter_sha256, seconds}, inspection{checks_total, checks_passed, failed[]}, run_approved_by_owner, warnings[]}. `machine_class` is a category, never a hostname.

## 5 The 12 checks (`shared/tools/asset-verify.mjs`)
1 manifest shape (strict keys, ids, units, class). 2 it answers the request (recipe sha256, class). 3 files present, inside the folder, sha256 and size match. 4 GLB well formed. 5 static and self-contained (no extensions, cameras, lights, animation, external links, odd names). 6 triangles within the class budget and equal to the claim. 7 LODs strictly lighter, same size. 8 materials and textures within budget, power-of-two. 9 size within the class cap. 10 base on the ground, origin at the base centre, footprint equals the recipe within 2 percent. 11 sockets and collider present and where claimed. 12 the producer's inspection record is consistent and the run was approved.

## 6 Class budgets (TUNING: starting guesses for an iPad, to be replaced by measurement)
| class | triangles | materials | texture | file |
|---|---|---|---|---|
| prop | 2,000 | 2 | 1024 | 1.5 MB |
| building | 8,000 | 4 | 1024 | 4 MB |
| hero | 20,000 | 6 | 2048 | 8 MB |
| terrain_tile | 12,000 | 3 | 2048 | 6 MB |
Whole-scene budget (also a guess): about 100,000 triangles and 200 draw calls. Evidence so far: the siege game's castle is about 58,000 triangles and 140 draw calls (software-GL speed only); the iPad physics benchmark showed drawing 2,000 bodies cost under 2 ms, so physics, not drawing, was the limit there. No glTF scene has been timed on an iPad: PENDING, a bench page comes with the first real asset.

## 7 What the converter must do (a requirements list, NOT code yet)
Input: one validated recipe. Map each part kind to geometry (boxes, prisms, bevelled edges for quality), merge by material, apply the recipe's materials and variants, add `socket_*` nodes for the recipe's door, awning and wire parts, add the collider, bake ambient occlusion and a normal map into a power-of-two texture, generate LOD1 and LOD2 by decimation (targets: LOD1 at most 40 percent, LOD2 at most 15 percent of LOD0), export a static GLB, run the 12 point inspector, write the manifest. Byte-identical output is NOT required (an exporter may not be deterministic); what is required is that the VERIFIED numbers meet the contract. Quality comes from the recipe, the bevels and the baking, and is judged by the owner.

## 8 Where assets go in a game (a finding about the host)
The repository holds a native PatchTown app (`apps/patchtown-ios`): a home screen lists games in `PatchTown/App/Games.swift`; `scripts/sync-games.sh` copies each game's files from its branch into the app; a built-in server serves them at `patchtown://<game>/...` and already maps `.glb` files (`GameResourceResolver.swift`). So a game's assets live under `games/<game>/assets/` and are referenced by relative paths, and size caps matter (files are bundled). As of its own README (11 Nov) the app was written on Linux and never built; whether it has been built since is UNKNOWN. In HelloXR or a browser the same files load from the game's page URL. Registering Living Islands or City Lab in the app would be a small, separate change (a Games.swift entry and a sync-games.sh block); not done.

## 9 What is verified and what is not
Verified: the verifier's 12 checks on a valid fixture; 31 hostile fixtures each rejected by the responsible check and never crashing it; the fixture builder is deterministic; a real loader agrees on triangles, bounds and a socket position; dots in node names are stripped by three.js (so the convention changed to `socket_<name>`).
Not verified: any Blender or workshop output; the converter; frame time or memory of any GLB on an iPad; the PatchTown app building; the class budgets.

## 10 What CLOUD needs from HARDWARE (see the inventory prompt)
Which machines have Blender and which versions; whether headless export and a small render work; the existing maker and its 12 checks (map them to the 12 above or tell us the difference); GPU renderer per machine; run time per asset; how a result returns. With those answers CLOUD writes the converter specification into code (a Blender script, reviewed, hashed) and the first pilot (a boat, a rock, a person) goes through the chain.

## 11 Open questions for the owner
1. Are these class budgets the right shape? (they are guesses until the iPad is measured). 2. May asset files and previews be public, or stay private? 3. Is the PatchTown app a target for these games, or HelloXR pages only? 4. Which three pilot assets first (a boat, a rock, a person)?
