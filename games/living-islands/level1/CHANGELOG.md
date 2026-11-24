# Level 1 map: change log (for the owner; veto any line)

Format: what changed, one-line reason, what it replaced, whether it touches a FIXED rule of research/BUILDERS_OVERVIEW.md. None does.

## Brief changes (the map asked for them)
| # | Change | Reason | Replaces | FIXED rule? |
|---|---|---|---|---|
| 1 | The table is one round table, 416 m across (radius 196 m), not the 256 m window of the exported worlds. | Six islands with real gaps (24 m of water at least) do not fit a 256 m window; 416 m is still 1:416 on a 1 m AR table. | the 256 m window and table radius 122 m of world_view.js | no |
| 2 | The Hoard is reached by a drying sand bar from the home island's west skerry (a causeway about 36 m long), and is hidden from the yard and beach by the home island's own land. | The brief wants the tide table to matter and the Hoard to be found by following robots. | "one island is the robots' depot" with no place given | no |
| 3 | The robots cross the wet stretch of the bar at low water and stay on the Hoard for a tide, coming back on the next low. They do not go out and back inside one window. | A whole walk (about 200 m) is 4 minutes of play at the first-day clock (100 s per game hour); a tide window is shorter than that. Found by the validator. | out and back in one window | no |
| 4 | The woods are reached by boat first. A second, deeper sill to the woods dries only around spring lows, so robots can reach the woods on foot a few days a month. | Gives the boat a job in the first hour and gives the robots a later job (timber) without removing the boat. | woods "by a short boat trip or a low-tide sandbar" (either) | no |
| 5 | The home island has no spring (as the first-day build), the woods island carries the spring, so fresh water becomes a reason for the first boat trip after the barrel. | Honest water: hydrology.py finds only wet-weather gullies on the home island and a small perennial-looking trickle on the woods island. | water only from rain | no |
| 6 | Seal ledges are painted on the seal island. | The tool's gneiss islands are steep with no low flat rock; wildlife_place.py needs a flat shelf of at least 40 m2 that dries. | tool haul-outs | no |
| 7 | The depot on the Hoard is a levelled terrace with a short gentle foot path from the causeway (the one edited place on that island). | A tracked robot cannot climb the tool's steep shore banks (steps above 0.6 rise per metre). | untouched island | no |

## First-day flow suggestions (not applied; the page is not mine)
| # | Suggestion | Reason |
|---|---|---|
| A | Put the robot yard on the south or west side of the hut, not the north-east. The yard-to-causeway walk is about 200 m (240 s of play) from the yard in the layout; a yard on the west lobe makes it about 90 m. | The Hoard reveal needs the robots to leave and come back inside a few minutes of the player watching. |
| B | Add a "tide table" card (next two low waters) to the first evening, when the second letter arrives. | The Hoard bar and the sills are only readable if the player can see the tide. |
| C | Let the first delivery boat (minute 10 to 20) pass the reef on the far side of the table, so the reef shows as a hazard before the player owns a boat. | Free foreshadowing, no new art. |
| D | Move the lighthouse stump line of sight into the first night: the lamp should be able to show the Hoard depot as a faint speck on the second night. | The validator proves the depot is visible from the stump; use it. |

## BOLD additions (each can be dropped; core roles come first)
| # | BOLD idea | Why | Cost | How to drop |
|---|---|---|---|---|
| B1 | A line of five cairns along the Hoard causeway and the home skerry, standing on the bar's crest, visible from the home beach. They point the way before anyone says so. Data only in the layout (`cairns` in the manifest). | Gives the player a route to follow on foot or by eye, a hint with no text. | 1 small prop mesh, 5 instances, no logic. About 0.5 developer day. | Delete the `cairns` list; nothing else reads it. |
| B2 | The wreck reef shows ribs at spring low: the hulk's ribs stand on the highest reef head and are visible only when the tide is under -0.7 m. | A reason to look at the tide table, and a foreshadow of the Great Wash hulk. | 1 prop (ribs), a tide test. 0.5 day. | Delete `ribs` from the manifest. |
| B3 | A lone tree on the bare rock: one wind-bent tree, the landmark boats steer by. | A cheap memorable silhouette; every sea chart needs a mark. | 1 tree instance on a fixed spot. 0.1 day. | Delete `lone_tree` from the manifest. |
Not built (listed so the owner can ask): a hidden cove at the lowest tide (needs a bigger sill and a camera rule); a faint old path on the causeway (a decal on the bar).
