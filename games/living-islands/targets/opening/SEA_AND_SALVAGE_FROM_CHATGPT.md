# The Gift · Sea and salvage

## The first thing to build

Place one long plank between the boat and the lighthouse. As the swell passes, its near end rises before its far end. For an instant the crest hides the foot of the lighthouse. The plank settles down the back of the wave while small ripples cross its grain. A player should be able to tell which way the water is travelling with the sky reflections switched off.

The supplied Rubble page positions a plane at the tide height and animates stripes and glints in its fragment shader. Its physics uses the tide height for immersion. Tide, wet ground, buoyancy and salvage materials give the team a starting point. The animated colour alone cannot lift the silhouette of the sea or pitch a long timber. This observation concerns the supplied Rubble source; other island branches may have different water implementations.

## Build the water in layers

| View or state | What the player sees | Builder target |
|---|---|---|
| Open crossing | Long crests hide the lower shore. Along a crest, light breaks into small moving patches. | Displace the mesh with two crossing long waves plus a smaller chop. Sample the same height function at the bow, stern and sides of nearby floating objects. Vary surface normals for fine wind ripples. Fade distant detail towards the horizon. |
| Sheltered dock | Small waves pass under planks; piles stay fixed; a float taps a post. | Reduce swell behind the headland. Sample the local surface for the float and moored boat. Hang rope between fixed and moving endpoints. |
| Great Wash | The central current turns foam and timber together. A crest lifts the jetty; rope snags the first crate and a raft forms. | Keep the current between the four islands. Separate sideways drift from wave height and tide. Stage the first snag, then join nearby captured pieces into a coarse moving group. Keep a few loose ends visible. |
| Falling tide | A broken wave runs up the beach, slows, and drains around stones. Heavy salvage appears in the wet band. | Use beach slope and tide for wet sand and strand position. Refloat buoyant items on a later tide unless caught above the waterline. Heavy objects settle beneath the local surface. |

## What comes ashore and why to collect it

Proposed gameplay uses. Keep planks, rope, glass and metal as the four stock categories. Track condition or special parts only when they change a choice.

| Find | Behaviour in water and likely landing place | First use → later value |
|---|---|---|
| Salt-worn driftwood | Rolls and pitches. Branches jam against piles; long timbers tangle at the high wrack line. | Prop a shelter → tow larger batches with the driftwood boat and mill usable lengths. |
| Sawn planks and broken jetty panels | Individual boards fan apart. A rope-bound panel turns as one until it snags in a cove. | Patch the dock → sort straight lengths for good floors, sheds and boat repairs. |
| Rope, fishing net and cork floats | Cork marks the gear at the surface; wet rope sags below it and catches on rocks. | Lash two timbers → mend a tow boom, hoist or salvage net. |
| Glass floats, intact bottles and fragments | A sealed float bobs high. Flooded bottles ride low or settle. Fragments occur in shallow gravel and tide pools. | Recover glass stock → workshop glazing and replacement lamp covers. Reserve rare intact floats for marking gear. |
| Tin, brackets, hinges and pulleys | Loose hardware sinks near the wreck. A sheet can reach shore pinned to buoyant timber and remain when it floats away. | Patch a roof or fit a hinge → refit the winch or build a working crane. |
| Sealed and breached crates | A sealed crate rides high and strands above ordinary wash. A breached crate rides low and spills some contents along its path. | Dry and sort supplies → discover a recoverable catalogue part. Sheltered storage protects the next haul. |
| Kelp, shells, pebbles and birds | Kelp traces current lines; shells and tiny stones collect in runnels; birds gather near the calm side of an islet. | Visual clues to water flow and sheltered landings. Keep most as scenery so useful salvage stays legible. |

## Carry salvage through the opening

Mark one plank with a pale painted end. In frame 03 it lies in the timber bay; in 05 it wedges against the orange crate; in 06 it rests at the wrack line. On arrival the player picks it up and uses it for the first dock repair. Give each persistent item a stable ID and position. Collecting it once must remove it from the beach after a save and reload. A storm should redistribute surviving cargo; it should not duplicate everything in stock.

## Benchmark handover

Open benchmark/index.html from the extracted folder in a WebGL browser, or serve that folder with the local game server. The isolated scene uses Three.js r128, an animated wave mesh, four islands and 96 floating objects. The camera and object paths restart identically for every timed run. The demonstration samples the surface under both ends of each prop. Drift is scripted; the scene isolates water rendering and surface-following. Budget full Rapier interaction, breaking surf, debris binding, pickup and save/load in separate integrated tests.

On each physical device run both presets at the same viewport when possible. Each run warms up for 3 seconds and samples 30 seconds of frame intervals. Save result records median and p95 frame time, render dimensions, draw calls and triangle count. Record the actual device, browser, resolution and whether the Radeon VII was selected. Repeat three times. Treat 33.3 ms for 30 fps on iPad and 16.7 ms for 60 fps on Radeon as candidate budgets. A visually smoother run at fewer pixels is a quality trade-off; compare the saved resolution alongside the timings.

| Test | Keep fixed | Change one thing | Watch |
|---|---|---|---|
| Supplied sea trial | Camera, waves, seedless paths, 96 props | Grid and pixel ratio via the two presets | Frame intervals, crest stepping, horizon shimmer and floating-body contact |
| Integrated storm test to build | Camera and storm timeline, marked plank and crate | Loose debris vs grouped debris | Physics step time separately from render time, long frames at first snag, visible clumping |
| Integrated shoreline test to build | Identical tide and saved salvage IDs | Empty shore vs storm haul | Grounding, repeated pickups, refloating on flood tide and save/reload consistency |

The included trial is an independent comparison fixture. Historical device benchmarks and live device results were not supplied for this revision.
