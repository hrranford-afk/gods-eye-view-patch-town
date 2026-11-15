# PatchTown room engine: brief for designing a new game

Written 15 Nov 2026. Use this to design a new game (with shooting) that runs on the engine we have already built.
The pictures in the `img` folder are real screenshots from our games, made in a test room, not a real house.

---

## 1. What the AR technology actually is

**AR (augmented reality)** means the iPad shows its camera view of your real room, and we draw 3D toys into that view so they look like they are really there.

It works in layers:

| Layer | Who made it | What it does |
|---|---|---|
| **The iPad's own tracking** (Apple's ARKit) | Apple | 60 times a second it knows exactly where the iPad is and which way it points, using the camera plus the motion sensors. It also finds flat surfaces: floor, tables, shelves. |
| **The browser bridge** (WebXR, through the free HelloXR app) | HelloXR | Lets a normal web page use that tracking. Safari on iPad cannot do AR by itself, so the games open inside HelloXR. |
| **3D drawing** (three.js, free and open) | open source | Draws the toys, light and shadows over the camera picture. |
| **Our room engine** | us | Everything below: understanding the room, remembering it, and living in it. |

Everything runs inside a web page: no app store, no servers, nothing uploaded.

### What our room engine adds

1. **Surface scan.** You sweep the iPad round the room. The engine collects thousands of points where the camera "touches" a surface, and groups them into flat places: floor, desk, shelf, sofa seat, even the top of a can or cup. (Picture: `01-scan-zones`.)
2. **Spots.** Each surface becomes a named place with a job: "the Shelf - cliffs", "Desk - meadow". (Picture: `06-tag-spots`.)
3. **Land grid.** Every surface is cut into 5 cm squares, each marked clear or cluttered and with a height, so toys stand on the real things and walk around them.
4. **Change spotting.** Next time you scan, it notices what moved, vanished or appeared: "Did the speaker move here?" Things you remove can become gifts; things you put down can squash a camp (gently). (Picture: `moved-question`.)
5. **Room memory.** Up to 8 rooms are saved, each with its own camp. The game knows which room you are in. (Picture: `36-room-cards`.)
6. **Pattern finding (newest).** It remembers the room's own patterns (rug, books, cushions) as numbers, not photos. After the iPad sleeps, it finds its exact place again in 3 to 5 seconds, to under 1 cm. (Pictures: `104-snapshot-points`, `105-snapshot-relocked`.)
7. **Stickers (optional).** Printed black-and-white squares give an even faster lock. (Picture: `96-sticker-found`.)
8. **Object spotting.** A small on-device AI recognises everyday things (cup, bottle, sofa, plant, sink, laptop) and suggests what a spot is: "I think this is a sink! Right?" You can tap to name anything. (Picture: `11a-i-think`.)
9. **Depth (tested, going in next).** A second small AI works out from one camera picture what is near and what is far. That lets toys hide behind the real sofa and be hidden by your real hand. Orange is near, blue is far. (Picture: `depth`.)
10. **Ceiling and hooks.** Things can hang from the ceiling, and cable cars can run between hooks. (Picture: `42-ceiling-hook`.)
11. **Places and weather.** With a grown-up's permission it knows roughly where the house is (rounded to about 100 m) to use the real sunrise, sunset and weather.

### The privacy rule (a selling point)
No photos are kept. Nothing leaves the iPad. Nothing personal goes into any AI model.

---

## 2. The living world (Base Camp)

- **Colonies** of tiny creatures settle on your furniture, build, gather and grow. (Picture: `49-props-colony`.)
- **Our own characters**, for example the Backpack Scout mouse and Pip the Mapmaker. (Picture: `53-mouse-scout`.)
- **Away time**: the world keeps living while the iPad is off (up to 24 hours) and shows a diary of what happened. (Picture: `07-away-diary`.)
- **Day, night, real weather and seasons** with decorations. (Picture: `62-christmas-colony`.)
- **Jobs for spots**: tower, well, silo, forge, farm, workshop, market, hideout, lookout.
- **Economy**: corn, wood, buttons, rope, crafting, trading, market day. (Picture: `75-market-day`.)
- **Travel**: walking, cable cars, straws and bucket lines for water. (Picture: `55-waterworks`.)

---

## 3. Shooting: what already exists

### Base Camp battle (turn-based, like an artillery game)
(Picture: `27-battle-aim`.)
- Two teams on two real surfaces, for example the desk against the shelf. The engine picks the pair by size, height and distance.
- **Real physics**: gravity, wind from the real weather, bounces, and the real clutter blocks shots.
- **Aim** by dragging back like a slingshot, with a dotted arc that shows where the shot will go.
- **Our weapons**:
  - Bottle Cap Bomber (lob and boom)
  - rubber band (bounces up to 6 times)
  - tea (a sneeze cloud and a slippy patch)
  - paper clips (3 to 5 at once)
  - sock (wraps and wobbles)
  - tape (swing across)
  - the Hoover (a super weapon that sucks things up)
- **Hits**: creatures go dizzy, then "pop" home (nobody dies). Tents have 6 hearts.
- **The room changes the fight**: rugs and the sofa soak up bounces, and a speaker playing music makes the ground wobble.
- **Opponents**: an AI rival team (the Lint-Lords and others) that aims with mistakes like a person, or 2 players passing the iPad.
- **Ending**: the winner gets a crown, a ribbon, wood and tin for the colony, and a picture in the album.

### Baguettes & Ballistics (real-time cars and guns)
(Pictures: `75-split-screen-battle`, `77-kr-sill-after-whisk`.)
- Toy cars with a gun, a rocket, a truck, a digger, drones and upgrades.
- A toy-box base to defend, and an AR battle on your real table.
- **Kitchen Run**: a race track over a toy kitchen with jumps and shortcuts.
- **Two players on one screen** with PlayStation controllers (split screen).

### Vigil (board game)
(Picture: `v1-board`.)
- A turn-based squad game on a toy city board: move, shoot with dice odds, overwatch, heal, escape.
- Enemies that learn where you like to stop.

---

## 4. Controls we already support
- iPad touch (tap, drag, pinch)
- mouse and keyboard on Mac
- PlayStation or any game controller (Gamepad API)
- split screen for 2 players
- pass-the-iPad for 2 players

---

## 5. Design rules for the new game

**Use the engine's strengths:**
- Fights that **use the real furniture**: high ground on the shelf, cover behind real objects, the rug as a soft swamp.
- Things that **change over days**: build a base all week, defend it at the weekend.
- **Moving real objects matters**: put a mug down and it becomes a wall or a tower.
- Turn-based, or calm real-time with not too many things at once (the iPad gets hot).

**Harder or more expensive:**
- Fast action with lots of moving things.
- Exact real sizes under 1 cm.
- Shots passing between rooms, because each room is its own world.
- Two iPads in the same game (planned; needs a small online service).

**Always:**
- **Nobody dies.** Hits make you dizzy, pop you home, or turn you into a ghost who walks back. Funny, never gory.
- **Toy weapons from household things** (caps, bands, socks, tape, crumbs), not real guns.
- **Our own characters**: no brands, no copies of other games, no real landmarks.
- Kind to every tradition and celebration.
- Nothing personal is uploaded.

---

## 6. Please answer with this template

1. **Name**
2. **One sentence**: what you do
3. **Where it lives**: which furniture or rooms
4. **The shooting**: weapons, how you aim, what a hit does
5. **What makes you come back tomorrow**
6. **What happens when you move real things**
7. **Players**: 1, 2 on one screen, or 2 iPads
8. **iPad, Mac, or both**
9. **Concept pictures**: describe 3 to 5 screens. You can paint over our screenshots.
