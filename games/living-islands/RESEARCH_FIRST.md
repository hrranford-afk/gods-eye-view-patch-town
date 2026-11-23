# Research first: the gate before any build (standing rule, owner 23 Nov 2026)

Rule: before building a layer of the world, there must be a research note that explains how the real thing works well enough that the result looks and behaves correctly. We are illustrating a world, so we understand it before we draw it.

## The gate (a build may start when all are true)
1. A note exists in `research/` covering: how it forms or works (the physics or biology), the real numbers, what it looks like, how it changes with time, how it interacts with the other layers, and cheap ways to model and draw it.
2. Every number carries a confidence tag (VERIFIED / PLAUSIBLE / UNVERIFIED / TUNING), and there is a short 'could not verify' list.
3. A 'common mistakes' list and a visual or behavioural checklist exist, so the result can be judged against reality, not taste alone.
4. The note says what is faked in the game.
Exceptions: pure plumbing or UI with no real-world model behind it.
If sources are thin (many sites are blocked from the cloud), say so, and treat the numbers as TUNING until checked.

## Where each layer stands (23 Nov)
| Layer | Research note | Gate |
|---|---|---|
| Geology and landforms | GEOLOGY_AND_LANDFORMS.md | met, numbers mostly TUNING |
| Seabed and flow | SEABED_AND_ISLAND_LAYOUT.md, FLOW_TYPES.md | met |
| Sandbars and sediment | SEDIMENT_PHYSICS.md | met, engine not built |
| Wildlife | WILDLIFE.md | met for numbers; animal looks and behaviour on screen not yet |
| Weather and clouds | WEATHER_AND_SKY.md, CLOUD_PHYSICS_FOR_VISUALS.md, CLOUD_ATLAS.md | met after the atlas; build started before it |
| Sun, moon, tide clock, night | SKY_CLOCK (to write) | NOT met |
| Quality tiers and devices | none yet | NOT met (needs iPad/WebGL budgets) |
| Houses, materials, building | HOUSE_BILL_OF_MATERIALS.md | partly met |
| Vegetation and trees | partly in GEOLOGY, WILDLIFE | thin: tree growth forms, species by exposure |
| People, clothing, tools | none yet | NOT met |
| Boats and sailing | none yet | NOT met |
| Machines and relics | design note only | NOT met |
| Household economy | design note only | NOT met |
