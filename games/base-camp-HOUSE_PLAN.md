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
