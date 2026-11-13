# Base Camp: the whole house (CAIRN, 13 Nov 2026)

Harry, 13 Nov: "is it maybe worth doing the verticals and stuff as well? Or ... a more complete map of like a house
potentially? Because bear in mind they're going to kind of be going around the whole house."

## What exists
- Each room has its own map and save (`MULTI_ROOM`, build 7). Floors, desks, shelves and the ceiling (build 13) are mapped.
- Walls are only noticed as curiosities. Rooms do not know about each other.

## The decision: house first, built as linked rooms; walls only where a route needs them
- **Why not one giant scan.** iPad AR in a web page loses its place and drifts when you walk between rooms, and it cannot
  save a map of the whole house. A native app (ARKit world maps, the parked Capacitor route) could, one day.
- **Linked rooms instead (build 20, "The House").**
  - Each room keeps its own map. A house map joins them with doorways ("the kitchen door leads to the hall").
  - While you play the kitchen, creatures set off for another room, cross the doorway and come out in the next room's
    map, carrying news, seeds or trade.
  - Expeditions are led by the Backpack Scout.
  - The title screen shows a little house plan, with rooms lit by how busy they are and travellers on the move between them.
- **Walls (verticals): only as routes.**
  - Detect a wall only where a route must climb it: a straw pipe up the cupboard front to the sink, a rope ladder from
    the floor to the worktop, or a doorframe.
  - Two hit-tests (top and bottom) set a climbing line, not a full wall map. It is cheap, and it is exactly what
    waterworks needs.

## Order
Build 18 (waterworks), then build 19 (the fix list), then build 20 (the house plus wall routes).

## Totems (Harry, 13 Nov: "surely a few totems will help, don't you think?") Yes.
- **What exists.** Build 12 has a totem photo per room (taken on the iPad, kept on the iPad only). The matcher that
  recognises the room from it is switched OFF (`HOME_TOTEM = false`), because it was never checked against real photos.
- **Room totems.** Point the iPad at the room's totem, and that room's map loads at once and lines up. This fixes
  "which room am I in?" and the drift after walking between rooms.
- **Doorway totems.** One by each door joins two rooms on the house map: "this door leads from the kitchen to the hall".
  Travellers use it, and the creatures build a little gate there.
- **Check it first, on the iPad.** A "totem check" mode counts right, wrong and unsure matches on Harry's own totems,
  and reports only the numbers. The photos never leave the iPad and never go into a model or onto GitHub. The matcher is
  switched on only if it is right at least 9 times out of 10.
- **Backup if real objects match badly.** Printable totem stickers: original bold patterns, easy for a camera to tell
  apart.

## Places, and a practice property (Harry, 13 Nov)
Harry: "build like a basic 3D house with the totems there so you can test it before I have a go. Really work on the
interface of like having different locations ... when I'm home or when it's my mum and dad's ... I've got sheds up both of
those ... the whole property, the garden, the sheds ... there's almost no limit to the size ... It's just got to be
constructed in a way."

- **The structure: Place, then Area, then Room, then Surface.**
  - Place: "Home", "Mum & Dad's".
  - Area: the house, the garden, the shed.
  - Room: the kitchen, the hall.
  - Surface: the floor, the worktop, a shelf.
  - Every room is its own small AR map, so there is no size limit. A property is a map of links, through doorways,
    garden paths and totems.
- **Which place am I at?**
  - First, the player picks it, so nothing needs location.
  - Optional later: rough location chooses it automatically. It stays on the iPad, like the weather choice already does.
  - Totems then say which room.
- **Real limits to plan for.**
  - Storage: the browser holds about 5 MB per site, and one room is held under 1.4 M characters. Move the maps to
    IndexedDB (hundreds of MB) before properties grow.
  - Outdoors, AR loses its place in open lawns. Garden areas use totems at fixed spots (the shed door, the gate, a pot).
- **The practice property (a prototype first, built separately from the game).**
  - A 3D house with a kitchen, hall, living room and bedroom, a garden with a path, and a shed.
  - Totems sit in each room and by each doorway.
  - A walking camera moves between them. Recognising a totem is simulated (the camera sees it, then that room loads).
  - The Places screen lists "Home" and "Mum & Dad's", each with its areas and rooms.
  - Robots can walk it to test the switching, and Harry can try the interface before using his real home.
  - Prototype: `games/base-camp-proto/places/` (branch game/micro-precinct), live at `base-camp/places/`.
  - It merges into the game as build 20.
