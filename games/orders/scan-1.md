```
ORDER
id:        scan-1
from:      game session
date:      2026-11-16
goal:      Turn a short walk-round video of a room into a 3D room our test world can load.
done:      From one video: the camera path, a real-size 3D point map, a photo-real 3D room
           that opens in a browser, and a plain "collision" version (floor, walls, furniture
           boxes with heights in cm). First on a free sample room, then on Harry's lounge.
priority:  after the nightly almanac
budget:    6 hours of Radeon (or Mill) per room; downloads as listed in NEEDS HARRY, no more
deliver:   one paste to the game session: numbers only (no pictures of Harry's home)

STAGE 1 (canary)
talent:    3d-room-making (new; needs the downloads below)
inputs:    a freely licensed sample indoor video or image set that allows commercial use
           (the town picks one and names its licence)
canary:    20 frames -> camera path + point map
test:      the camera path is smooth (no jumps); a known length (a door, a table) comes out
           within 10% of its real size
output:    sample/path.json, sample/points.ply, sample/report.md

STAGE 2
talent:    3d-room-making
inputs:    the stage 1 path and points
canary:    500 training steps of the photo-real room
test:      opens in the Mini's robot browser; a screenshot from the camera's own position
           looks like the matching video frame
output:    sample/room.splat (or .ply), sample/shot.png, timings

STAGE 3
talent:    3d-room-making + own-answers
inputs:    the stage 1 points
test:      floor found; each big furniture piece is a box with a height; numbers make sense
           (a sofa seat 35 to 50 cm, a table 40 to 80 cm)
output:    sample/collision.json in this shape:
           {"floor_y":0,"walls":[[x1,z1,x2,z2]],"boxes":[{"label":"sofa","x":0,"z":0,
           "w":200,"d":90,"h":45,"yaw":0}]}  (cm)

STAGE 4 (only after stages 1 to 3 pass, and only with Harry's video)
talent:    3d-room-making
inputs:    Harry's lounge video, given by Harry to the Mini directly. PRIVATE: never committed.
test:      as stages 1 to 3
output:    stays on the town machines only. To the game session: report.md with numbers only
           (frames used, minutes per stage, size checks, box count and heights).

NEEDS HARRY (each must be said yes to in the town chat; sizes are the town's to confirm)
- A camera-path and real-size map maker. Suggested: MapAnything, the Apache 2.0
  checkpoint only (facebook/map-anything-apache), NOT the non-commercial one. A few GB.
- A photo-real room maker that runs on a Mac graphics card. Suggested: Brush (Apache 2.0),
  or OpenSplat (AGPL-3.0: fine for our own tools, but say so). Under 200 MB.
- Optional, for labels: SAM 2 small (Apache 2.0). About 200 MB.
- Optional fallback: COLMAP (BSD). Tens of MB.
- One free sample room (licence named by the town).
Anything research-only or non-commercial: do not use.
```

## Context (the same for every model)

Harry's games put tiny toys into real rooms through an iPad. We want a test world where bots play the games every night inside 3D copies of real rooms, so the games improve while Harry is away. This order builds the first step: turning a video of a room into a 3D room. A photo-real version is used to make fake camera pictures; a plain version (floor, walls, boxes) is what the toys stand on and bump into. The game session builds the test world that loads these files.

## Rules

- **Privacy:**
  - Harry's home stays on the town machines.
  - It is never pushed to GitHub, never used to train or tune any model, and never pasted into any chat except to Harry himself.
  - Only numbers come back to the game session.
- **Licences:** only licences that allow commercial use. Name each licence in the report.
- **Disk:** the Mini must keep 30 GB free. Put big files where there is room (the Mill has 882 GB) and say where.
- **Machine time:**
  - One heavy job per machine.
  - Stop at the budget and report how far you got.
- **Nothing is deleted.**

## Questions for the Town Brain (JSON, about 220 words)

1. Which machine should make the 3D rooms (the Radeon or the Mill), and why?
2. What is the biggest risk in this order, and how do you check for it early?

Shape: `{"machine": "", "why": "", "risk": "", "check": ""}`
