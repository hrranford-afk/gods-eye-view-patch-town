# Open toy city (Harry's "theme of the week", 21 Nov 2026): plan v0

Idea: an open-world driving-and-capers game on our engine, in the spirit of that kind of game, MECHANICS ONLY.
Not copied: name, characters, art, music, map, missions, look. Our rules stand: nobody dies, toy weapons only, no real brands, no real landmarks, no real town names.

## Mechanics we can use (generic ideas)
- Free-roam city you drive through, many vehicle types, missions you choose, a pursuit meter, a garage/home base, shops, collectibles.

## Our version: a table-sized toy city
- The whole city is a diorama that fits a table (AR on a real table, or on screen). Streets, a village square, a harbour, a toy railway.
- Vehicles from Baguettes & Ballistics (racer, tank, hover, monster, jet bike, boat) plus delivery vans.
- "Capers" not crimes: heists of toys, prank deliveries, rescue-the-cat runs, race-the-clock errands, smash-the-sandcastle jobs.
- The pursuit meter is a "Grumpiness" meter: the more mischief, the more the Neighbourhood Watch toys (wind-up patrol cars, a whistle-blowing bobby-bot) chase you. Nobody gets hurt; caught = sent home with a telling-off and a fine.
- Destruction uses the Building Yard (layered buildings) and, later, real physics (Brick Lab).
- Pedestrians are counted, never tracked: a crowd of toy figures, no personal data.

## Hard parts (think carefully)
1 Scale/performance on iPad: many buildings + traffic + crowd. Mitigate: instancing, sleeping physics, level-of-detail, a small map.
2 Handling: car feel on two thumbs. Reuse B&B driving, test with real hands.
3 AI traffic and chase: simple lane graph + patrol rules; budget CPU.
4 Content volume: missions need writing and testing; start with 3.
5 Tone: keep it caper-comedy, not crime glamour.

## Spike (when a builder frees up)
"Toy City Lab": one 8x8-block map from Yard buildings, one driveable van, traffic loop, a Grumpiness meter with 2 patrol cars, 3 caper missions, a timer score. Measure fps (relative), report honestly. No AR in step 1.

## Taste questions for Harry
- Caper-comedy tone (my pick) or something grittier?
- Solo free-roam first, or two-player (friends) races/chases first?

## Update 21 Nov, Harry: "make it 18 plus"
The earlier "no crime, nobody dies, toy weapons" were Harry's standing project rules for the toy/kids games, not a limit on this idea. For THIS game Harry has asked for an 18+ edition. Decisions pending with Harry:
- Scope of the loosened rules: this new game only (CAIRN's recommendation); the toy games keep the old rules.
- Tone: stylised, fictional, our own city and characters (crime caper, chases, gunplay with stylised consequences). No real people, brands, landmarks or town names (unchanged). No real-world how-to detail (real weapon or crime instructions): not needed for a game and not something CAIRN will write.
- Publishing: the repo and the gh-pages site are PUBLIC. An 18+ build should stay off the public site until Harry decides (age gate, private hosting, or a store with age rating). Harry's call (security).
- Look and name: our own. Not the look, names, characters or map of any existing game.
