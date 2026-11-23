# Ecosystem: how the world holds together (design note, no code yet)

Status: PLANNED. Written 23 Nov 2026 after the owner's point that the world is a platform and the next step is bringing the living parts together.

## Principle
Nothing is drawn on its own. Every living thing is a small seeded rule that reads shared fields (land, rock, tide, depth, flow, weather, sediment) and writes back to them and to the ledger. Counted, never tracked.

## The shared fields (already built or researched)
| Field | Source | Read by |
|---|---|---|
| Terrain, rock, soil, exposure | landform tool | plants, nesting, haul-outs, resources |
| Tide and depth | seabed pass | intertidal zones, kelp, haul-outs, boats |
| Current and eddies | flow pass | drift, fish shoals, plankton fronts, machines |
| Sediment and shore shape | sediment research (engine later) | beaches, nesting, landings, wrack |
| Weather and season | weather pass (running) | breeding, storms, visitors, wear on machines |
| Ledger | design hooks | every event, once, with an idempotent key |

## The food web, kept deliberately small
Plankton fronts (where current meets depth) feed fish shoals (sandeel, herring). Shoals feed seabirds, seals, dolphins and basking sharks, and the player's nets. Kelp and shellfish shelter the shore life; wrack feeds waders and otters. Storms and disturbance change numbers; food changes numbers more. The turtle legend sits outside the web, a rare glimpse.

## Seasons and time
One seeded calendar (month ranges in research/WILDLIFE.md) drives arrivals, breeding and leaving. Weather schedule drives storms. Game time is compressed; ecology advances per season, not per frame.

## The player is part of it
Boats, building and noise add disturbance within a radius; clearing wrack halves waders; a jetty changes sand; a net changes a shoal. Protecting is a real trade-off, never a scold.

## Machines as another species
Relics follow the same pattern: a route (territory), needs (sun, fuel, parts), seasons and slow decline; some reshape the world (a dredger moves sand, a trawler thins a shoal). Optional, era 6.

## Stability and honesty (measure before drawing)
Headless seasons run for 50 simulated years per seed: do numbers stay in band without the player, recover after a bad year, and collapse only when pushed? Check each species count against the research ranges; flag which numbers are TUNING.

## Build order
1. Weather (running). 2. Wildlife placement from the fields (haul-outs, skerries, kelp, shoals), numbers only, headless. 3. Draw them (seals, birds, fish, kelp) in the live page and Blender. 4. Player disturbance and the ledger. 5. Turtle glimpse. 6. Machines.
