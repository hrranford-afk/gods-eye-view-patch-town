Do not put real place names or brands into game code, assets or recipes.

# Salvage kit: what it looks like (CAIRN, 26 Nov 2026)

Pictures are in `sea_proto_shots/` (Chromium software GL, 1100 x 620 or 1600 x 900): `salvage_board.jpg`, `salvage_board_rep0.jpg`, `salv_open.jpg`, `open_sea_rep1.jpg` / `open_sea_rep0.jpg`, `salv_beach_close.jpg`, `beach_rep1.jpg` / `beach_rep0.jpg`, `salv_storm_raft.jpg`. Software GL shows the look only, not speed. Nothing was run on a real device. Zero console errors in every run; `test_sea.cjs all` (camera, readout, Bench ladder and report, tiers, islands) passes.

## Repetition score (same camera, same time, same seed; `sea_proto/repeat_score.cjs`)
| Scene | Variation | DATA: instances with a repeated signature | PATCH: textured 16 px patches with a near twin |
|---|---|---|---|
| Open sea, 600 objects, 107 drawn | on | 0.0 percent | 9.8 percent |
| | off | 36.8 percent | 12.8 percent |
| Beach wrack, 900 objects, about 420 drawn | on | 0.0 percent | 7.8 percent |
| | off | 58.3 percent | 11.1 percent |
DATA is exact for what is drawn. PATCH is a weak image check: headings and positions still differ with variation off, so only scale, tint, wear and variant choice move it. Both go the right way; PATCH moves by a third, DATA by a lot. The pictures agree: with variation off every plank is one grey board and every crate is the same green box.

## Honest look
Works: rafts with lashing and a crate read as rafts; crates, barrels, glass floats in netting and logs with stubs look like objects, not dots; items follow the swell; lanes and clusters make an uneven scatter; the beach has timber, kelp, pebbles and a breached crate lying on the slope.
Wrong or samey:
1. Far objects are dark specks or flat orange blobs (amber glass floats at LOD2 are a low polygon dome). The silhouette at distance needs an impostor or a bigger minimum size.
2. Planks and logs are too thin and long to read from boat height; the target frames show fat timber with rope.
3. Wood is still one family of grey-brown. Origin tints help only a little. Needs a baked wood atlas.
4. No contact with the water: no foam ring, wake, wet band or shadow under things; objects look pasted on. The sea shader would need a small foam-at-object term.
5. Storm raft (`salv_storm_raft.jpg`): the sea shader's foam streaks dominate, items are sparse and dark; the raft is hard to find. Wants more near-camera salvage in storms and a lighter material there.
6. Shells and pebbles are tiny and the island sand is flat and pale: the wrack line reads as scattered sticks, not the dense tide-line of frame 06. No birds, no tide pools.
7. Kelp ribbons are small and flat; the Bench has no salvage axis yet (models are hidden during Bench so old numbers stay comparable).
8. Pulleys and hinges sink: they only appear on the beach and on rafts.

## Numbers
Kit: 14 kinds, 51 variants, LOD0 triangles 190 to 2650 per variant (planks 320 to 1540, crates 950 to 1450, glass floats up to 2650). A JS-only timing in desktop Chromium (not a device): 2000 objects step 1.1 ms and render-prep 4.1 ms per frame, 78 draw calls and 73k triangles drawn at the default camera; 400 objects 0.6 ms in total.
