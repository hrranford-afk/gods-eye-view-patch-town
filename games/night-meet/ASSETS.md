# Assets and licences

Every file in `assets/` is CC0 (public domain). No real car brands, model names, badges or logos are used anywhere:
all car names, plates, shop signs and the lorry's "NIGHT MEET LOGISTICS" text are our own, drawn in code.

## Cars: Quaternius "Car Pack" (CC0)
- Pack page and licence: https://quaternius.com/packs/cars.html ("License CC0")
- Download (Google Drive folder, FBX sub-folder): https://drive.google.com/drive/folders/1fKlbDry77iY8KlEoxzUxIAZQL_XhzWlA
- Files fetched from Drive by file id (`https://drive.usercontent.google.com/download?id=<id>&export=download`):
  `SportsCar2.fbx`, `SportsCar.fbx`, `NormalCar1.fbx`, `NormalCar2.fbx`, `SUV.fbx`, `Taxi.fbx` (the `Cop.fbx` was left out).
- Converted to `assets/cars/q_<name>.glb` in a browser with three.js r128 (FBXLoader -> GLTFExporter): turned to
  "forward = +x, up = +y", scaled to metres, ground at y = 0, smoothed normals (38 degree crease), split one mesh per
  material slot, UVs and colours dropped. The game swaps every material for its own (clearcoat paint, glass, trim,
  emissive lamps) and replaces the model's wheels with its own rims and tyres.
- In the game they are (our names): SportsCar2 = Kaze R4, SportsCar = Vento GT, NormalCar1 = Saga 4D,
  NormalCar2 = Pip Hatch, SUV = Ridge X, Taxi = Metro Cab.
- The Brute V8, Mochi Kei, Haul 2500, Route 9 bus and Box Lorry are built in code (no files).

## Poly Haven (CC0, https://polyhaven.com/license)
Downloaded through the API (`https://api.polyhaven.com/files/<id>`, the 1k glTF / 1k HDR / 1k JPG files on
dl.polyhaven.org). Model textures were resized to 512 px and re-saved as JPEG (quality 82) to keep the download small.

| File(s) | Asset | Source |
|---|---|---|
| `assets/hdri/rooftop_night_1k.hdr` | HDRI, used for reflections (darkened in code) | https://polyhaven.com/a/rooftop_night |
| `assets/textures/asphalt_02_*_1k.jpg` (diff, nor_gl, rough) | wet asphalt ground | https://polyhaven.com/a/asphalt_02 |
| `assets/models/concrete_road_barrier_02/` | concrete barriers | https://polyhaven.com/a/concrete_road_barrier_02 |
| `assets/models/covered_car/` | a car under a cover by the warehouse | https://polyhaven.com/a/covered_car |
| `assets/models/security_light/` | warehouse wall lights | https://polyhaven.com/a/security_light |
| `assets/models/utility_box_01/` | electrical cabinet | https://polyhaven.com/a/utility_box_01 |
| `assets/models/old_tyre/` | stacked tyres | https://polyhaven.com/a/old_tyre |
| `assets/models/barrel_03/` | oil drums | https://polyhaven.com/a/barrel_03 |
| `assets/models/metal_jerrycan_green/` | jerrycan | https://polyhaven.com/a/metal_jerrycan_green |
| `assets/models/cardboard_box_01/` | boxes by the loading dock | https://polyhaven.com/a/cardboard_box_01 |

## Code and libraries
- three.js r128 (MIT) from cdnjs, and its examples (GLTFLoader, RGBELoader, BufferGeometryUtils, EffectComposer,
  RenderPass, ShaderPass, UnrealBloomPass, CopyShader, LuminosityHighPassShader, GammaCorrectionShader) from
  jsDelivr `three@0.128.0`.
- Fonts: Chakra Petch and Inter from Google Fonts (SIL Open Font License).
- `webxr-polyfill.js`: see THIRD_PARTY.md (MPL-2.0 / Apache-2.0 / MIT), copied unchanged from baguettes-and-ballistics.
- Everything else (lamp poles, buildings, containers, fence, signs, number plates, smoke, sounds) is drawn in code.

Total size of `assets/`: about 7.8 MB (the whole game folder about 8.5 MB).
