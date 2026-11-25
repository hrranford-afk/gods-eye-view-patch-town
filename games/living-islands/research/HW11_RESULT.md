# HW-11 result: sky canary on real Blender 3.6 (hardware run, 25 Nov)

Source: HW11_RESULT.zip from Hardware Claude, passed by the owner. Blender 3.6.14 on Metal, device AMD Radeon VII, 09:40 to 09:46, 6.5 minutes total (22 to 61 s per picture). Disk stayed far above the 30 GB floor. I have not re-run anything: these are the hardware's numbers. Contact sheet: hw11/results/hw11_contact_sheet.jpg.

## Verdict
All 11 pictures rendered, picture guard ok on all 11, sky smoothness check ok on 10 of 11. The one failure: wide 2009 (high camera, horizon only 18 rows from the top, a dark brown band above the horizon with a hard line where it meets the sea; biggest step 18.8 at row 18).

## What the hardware saw (its three questions)
1. The flat band with a hard lower edge is gone in 10 of 11; skies are smooth gradients.
2. Sea near the horizon is smooth and hazy in the close views; no bright line along the horizon except in the failing wide shot.
3. New things wrong: (a) close 2004 and 2029 have a large blown-out, blocky white sun-glitter patch on the sea near the horizon; (b) skies are beige-gold to muddy brown, darkest at the top (wide 2009 most); (c) the sea is a good blue, not too grey.

## CAIRN's reading
1. The sky fix works on real Blender 3.6 in 10 of 11 cases. It was only verified on 5.3 before.
2. Remaining fixes: wide high-camera shots need the sky band above the horizon smoothed (clamp the sky gradient when the horizon is near the top); tame the blocky glare patch (a sun glitter falloff or a lower sun-glint intensity); warm the sky a little less brown at the top.
3. These renders are the quality target for the live page: lit camp, soft light, fog and hazy sea. The page is not at this level yet. The bake bridge (Blender quality into the page) is the path.
4. Blender 3.6 hangs after rendering when the output folder is on an external drive until macOS removable-volume access is allowed; writing to the boot disk works.
