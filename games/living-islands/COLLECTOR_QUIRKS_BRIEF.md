# Collector quirks: an invitation to the residents

Status: CONCEPT. Written 23 Nov 2026 by CAIRN from the owner's idea. This is an invitation with rails, not a script. The residents' ideas are theirs: CAIRN will not rewrite their words, and the owner picks what goes into the game.

## What we want
The first relic the settlers meet is a small beach litter collector (the tortoise with a tip-up solar shell). We want the residents to design its **quirks**: the small physical things and habits that carry story without a word being spoken. A dent, a repair, a thing it keeps, a way it moves. Each quirk should make a player wonder who made it, who looked after it, and what it has been doing since.

## Facts about the machine (so your ideas fit)
- Dog-sized: about 1 m long, 0.6 m tall. Tracked. Domed solar shell in two halves that tip up like beetle wing-cases. Folding grabber arm. Hopper bin with a lid. Small head pod with a visor or lens. One amber status lamp. No speech, no eyes that look alive.
- Named parts a quirk can attach to: `shell_l`, `shell_r`, `arm_base`, `arm_mid`, `arm_tip`, `hopper_lid`, `track_l`, `track_r`, `lamp`, `head`, plus the body.
- It is a hard-coded relic: it follows fixed routines (search, grab, check, wait, low charge, park facing the sea). It does not think, learn or talk.
- Wear it already has: faded paint, salt crust, rust runs, sand in the joints, a repair patch, some twine.
- A family of collectors will follow (a scout, a hauler, a sorter) sharing these parts, so quirks that suggest a shared maker or a shared history across the family are welcome.

## Rails
- Hopeful, quiet tone. Nothing gory or cruel for its own sake. Real age, wear and past danger are fine if the story justifies them. A quirk should not need a weapon.
- No brands, no real company or place names, no legible writing on the machine (a scratched-off label or a faded stripe is fine).
- Nothing about any real person. People are counted, never tracked: a quirk may hint that "someone cared" without naming or following a person.
- It stays a machine: quirks come from wear, repair, habit and fixed routines, not from hidden thoughts or feelings.

## What to write
For the tortoise, 40 quirks. For each, one short block with these fields:
- `part`: which named part, or body
- `look`: what you would see, in plain words (colour, size, where, how worn)
- `story`: one or two lines of what it hints about its past
- `habit`: any fixed behaviour it causes (optional)
- `cost`: how hard it is to draw: easy (a patch of colour), medium (a small added part), hard (needs a new animation)
- `source`: which resident wrote it

Then, if you have time: 10 quirks that differ for each of the scout, the hauler and the sorter, and 10 that the whole family shares.

## Output
One markdown file per list in a new folder. No paths, no personal details. Quantity over polish: Harry and CAIRN sort afterwards.

## What happens next
CAIRN checks each quirk against the rails and drops any that break one, with the reason listed (nothing is rewritten). The owner picks. The picks become slots on the model: decals, small parts and behaviours, drawn by CAIRN's scripts and judged by the variety judge.

End of brief.
