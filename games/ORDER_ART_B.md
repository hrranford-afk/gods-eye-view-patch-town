> **Superseded on 12 Nov 2026** by `orders/art-b1.md` and `orders/art-b2.md`, written in the town's order form
> (`HOW_TO_SEND_WORK_TO_PATCHTOWN.md`). Kept for the record. The town says HOW; ignore the tool names below.

# Order: Art B, our own hardware (set by CAIRN, 12 Nov 2026)

**Harry said "yes B" on 12 Nov 2026.** That covers B1, B2 and B3 in `ART_ORDER_BASE_CAMP.md`.

Downloads are allowed only for this order, and only for open-licence tools and models named below or of the same kind.
Any other download still needs a new yes from Harry.

## The rules first
- **Preflight before every job.** The Foreman says which machine has room. A canary proves that machine can do the work:
  one small picture, or one small model, timed. Never load a busy machine while another sits idle. The Radeon's
  nightly almanac and bug-hunt jobs come first.
- **Licence check before any download.** The licence must allow commercial use, and must NOT exclude the UK.
  - Note: Tencent's Hunyuan3D licence excludes the UK and EU. Do not use it.
  - Write each model's name, version, licence and source in `games/base-camp/art/THIRD_PARTY_ART.md`.
- **No real brands, logos or text** in any picture.
- **Nothing personal.** Never feed a photo of Harry's real rooms or totems into a model, because those stay on his iPad.
  Only ChatGPT pictures that Harry chooses to share go in.
- **Count honestly.** For each job, log the jobs run, the pictures or models made, how many are usable, the time taken
  and failures, in `games/base-camp/art/ART_LOG.md`.

## B1: pictures on the Radeon
- **What:** a local picture model, run through a node graph app such as ComfyUI on ROCm. Start with an SDXL-class model
  under an open licence that allows commercial use.
- **First job:** make variations of Harry's ChatGPT pictures in the same 90s cartoon style, once he has sent them.
  - Start with A2, the seamless textures: 10 of each material.
  - Then A1, the face sheet: 3 more sheets.
- **Before that, the canary:** one 1024×1024 matchbox texture using the A2 prompt in `ART_ORDER_BASE_CAMP.md`. It must
  tile seamlessly; check by laying it 2×2.
- **Output:** `games/base-camp/art/b1/<order>/NN.png`, plus a contact sheet (a grid of all of them in one PNG).

## B2: pictures into 3D models
- **What:** an image-to-3D model with an open licence. TripoSR (MIT) is the first choice; it is small and quick.
- **Input:** single objects on a plain background, from the A6 "ceiling things" sheet and the creature line-up, cut out
  one at a time.
- **Canary:** one object, the cup-hook pulley.
- **Output:** a `.glb` under 300 KB each, with fewer than 5,000 triangles (reduce if needed), saved to
  `games/base-camp/art/b2/`. Add a picture of each model from the front and from 3/4 view.

## B3: free 3D parts
CAIRN is doing this one from the game session, so the town need not.

## Delivery
- Push to `game/micro-precinct`. If you can't, hand it over in one paste: the contact sheets, the logs, and where the
  files are.
- **CAIRN checks every picture before it goes into the game:** seamless, transparent where needed, no text or logos,
  matches the style, readable on an iPad. **Harry picks the winners**, because taste is his.
