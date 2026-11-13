ORDER
id:        webkit-1
from:      game session (CAIRN)
date:      2026-11-13
goal:      Prove Base Camp starts and plays in WebKit (Safari, iPhone, iPad outside HelloXR) after the town's fix for
           "Cannot access 'TOTPH' before initialization" (check() is now deferred with setTimeout(check, 0)).
done:      a two-engine report on the live game: Chromium and WebKit, both start with 0 page errors
priority:  first, before the other Base Camp orders. Small.
budget:    30 minutes; 0 GB of downloads
deliver:   one paste to the game session

STAGE 1
talent:    two-engine-test
inputs:    the live game https://hrranford-afk.github.io/gods-eye-view-patch-town/base-camp/?v=22 (build 16 with the
           fix; build 17 follows today on the same address)
canary:    load the page in WebKit and read the status line: it must start "build 16" or later, with no page error
test:      in each engine: the page loads; the practice room opens (More, then Practice room); 10 minutes of
           __g.simulate(600, 1) run; count page errors (must be 0); record the status line and one screenshot
output:    webkit_report.md + two screenshots

NEEDS HARRY
- Nothing.
