# Proving ground: how far can the cloud push the island look?

Status: PLANNED (score card drafted for owner review, no rounds scored yet).

## The test (never changes between rounds)
One scene: the camp island (rocky coast, heather and grass, a few conifers, a beach, rowboat, tents, campfire) in a deep blue sea, warm low sun.
Four fixed cameras: (A) overview of the table, (B) camp close-up, (C) coast at the waterline, (D) low sun glitter on the sea.
Same seed every round. Reference for comparison: the owner's approved pictures (kept private, never copied into the repo).

## Score card (1 to 5 each, per camera where it applies)
1. Sea surface (waves, colour, glitter, foam)
2. Where land meets water (depth, wet band, run-up, rock shelf)
3. Rock (strata, cracks, weathering)
4. Ground (turf, moss, heather, paths)
5. Light (sun, shadow softness, colour, haze)
6. People (shape, pose, readable at game distance)
7. Buildings and props (tents, boat, fire, jetty)
8. "Feels real" (does it look like it rose out of the sea?)
9. Detail density (no flat areas: fine ripples, grain, clusters, texture everywhere)
10. Palette restraint (muted natural colours; blue against olive/moss; no primary-colour props)
Scales: 1 = looks like code, 3 = a good game, 5 = could be mistaken for the approved picture.

## Judging
- The owner scores blind (pictures shuffled, reference beside).
- A separate reviewer agent scores too and is told to find faults; it is not the agent that built the round.
- Every round records: scores, render time, triangle/draw cost, iPad/AR cost estimate, and the honest remaining gap.

## Rounds (cap: 3, then back to building the game)
1. Round 1: today's look (baseline).
2. Round 2: best mix from the lighting, people and approaches options.
3. Round 3: Blender-baked land and rock plus the live sea.
After round 3: stop, publish the gallery, decide what is left for the owner's hardware.

## Tools built as we go (improve existing, never a second script for the same job)
- Fixed-camera shoot script (extend tests/shoot.js).
- Side-by-side scorer page (blind shuffle).
- Reusable procedural kits: rock, coast band, plants, people.
- Bake pipeline (Blender, headless, seeded).

## Rules
Nothing personal goes into models. Private reference pictures stay out of the repo. No real brands or places in code. No moving the goalposts: the card stays fixed.
