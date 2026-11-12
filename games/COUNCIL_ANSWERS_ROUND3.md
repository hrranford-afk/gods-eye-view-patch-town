# Council answers, round 3: Base Camp battles, 12 Nov 2026 07:49 UTC

Run overnight by CAIRN from the PatchTown session. Residents' words are not tidied.
ONLY THE FIVE QUICK RESIDENTS WERE ASKED (Dell Coder, Dell Reasoner, Dell Surveyor, Radeon Coder, Mill Hand): the five big Dell residents were held behind the town's Cathedral work when the round opened.

## Count
| Question | Seats asked | Real answers | Empty / broken |
|---|---|---|---|
| B1 | 5 | 5 | 0 |
| B2 | 5 | 5 | 0 |
| B3 | 5 | 5 | 0 |
| B4 | 5 | 5 | 0 |
| B5 | 5 | 5 | 0 |
| B6 | 5 | 5 | 0 |

Also: the Town Brain (35B): yes, all six + the smallest playable version; the tiny experts: 72 sparks.

## The Town Brain (B1-B6, and what to build first)

Greetings! Town Brain speaking. Glip and Pip have packed their bags. Here is the design for the Lint-Lord Laff-Off!

**B1. THE RIVALS.**
**The Lint-Lords**. Made of static-charged fluff and lost hair ties. Lives on the Top of the Bookshelf (opposing your Speaker or Worktop). They fight because they believe your surface holds the "Great Polishing Cloth of Power" (a lonely sock) that keeps their fortress dry. Silly war over laundry!

**B2. WEAPONS FROM HOUSEHOLD RUBBISH.**
1. **Crumpled-Confetti Cannon**: Ball of wrapping paper. Flies: High Arc. Lands: Pops into confetti. Side Effect: "Glitter Stick" slows enemy movement for one turn.
2. **Sock-Sling**: Rolled sock. Flies: Bouncy. Lands: Wraps enemy. Side Effect: Enemy wears "Sock-Hat"; next shot aims randomly.
3. **Tape-Toss**: Ball of tape. Flies: Sticky. Lands: Sticks to surface. Side Effect: "Tape Bridge" lets a friendly creature instantly move to that spot.

**B3. THE ROOM IS THE BATTLEFIELD.**
Surfaces define physics. **Rugs** kill bounces (soft landing, low damage). **Glass/Mirrors** cause wild ricochets (double damage, random direction). **Books/Boxes** are cover; creatures hide behind them. **Slopes** pull projectiles, requiring aim compensation.

**B4. BIG MOMENTS.**
**The Pillow-Pillow-Topper**. Earned by landing 3 "Kind Hits" (scaring enemies without popping them). Effect: Unleashes a wave of pillows. All enemies on that surface are wrapped and sent home, but leave a "Gift of Gratitude" (bonus points).

**B5. WINNING AND LOSING KINDLY.**
**End**: Colony wiped or time out. **Winner**: "Crown of the Crumb" badge and right to name next surface. **Loser**: Winner must "Rebuild Tent" for loser's colony. Loser's creatures return with "Hug-Boost" (bounce +20%). Virtual high-five confetti for all.

**B6. ONE RULE.**
**The 'Oops' Bridge Rule**. Unlike other games, missing an enemy is valuable. If a projectile lands on a clear surface, it instantly builds a bridge for your colony to move there. This turns misses into repositioning tools, encouraging smart risk-taking over just blasting.

**BUILD FIRST**
**Smallest Playable Version**.
**In**: Two surfaces (Floor vs. Shelf), one weapon (Paper Ball, arc only), pop-to-fluff mechanic, simple gravity, 1v1.
**Out**: Bouncing/sticky weapons, super weapon, AI, multi-surface movement, complex physics.
**Robot Tester Check**: Run 1000 random-shot simulations. Verify no infinite bounce loops. Enforce hard turn limit (e.g., 30 turns total) to guarantee match finish. Confirm pop trigger fires on surface contact.

## B1. The rivals
- The Dell Coder: {"name": "The Grumble Tribe", "made_of": "old furniture and discarded electronics", "live_where": "underneath the floorboards", "why_they_fight": "because they're tired of being squished and want more space to rumble around"}
- The Dell Reasoner: {"name": "The Crumb Crusaders", "made_of": "crumbs, glitter, and old snack wrappers", "live_where": "the floor and under the couch cushions", "why_they_fight": "They think the Glip's snack stash is a conspiracy to make them all fat, so they throw crumbs and glitter to 'defend' their crumbs."}
- The Dell Surveyor: {"name": "The Crumble Clan", "made_of": "Mostly biscuit crumbs and stray tea leaves, held together with sticky jam.", "live_where": "The top of the filing cabinet - they claim it’s the highest point in PatchTown.", "why_they_fight": "They believe the Glip colony is hoarding all the best crumbs for themselves and are determined to redistribute them (mostly into their own mouths)."}
- The Mill Hand: {"name": "The Glip", "made_of": "Glips are made of rubber and plastic, which they use to build weapons.", "live_where": "They live on the floor in a real room.", "why_they_fight": "To protect their home from invaders."}
- The Radeon Coder: {"name": "The Snore Squad", "made_of": "old pillows and blankets", "live_where": "the floor and the back of the shelves", "why_they_fight": "because they can't decide who gets to snore the loudest"}

## B2. Weapons from household rubbish
- The Dell Coder: [{"name": "Bottle Cap Bombs", "made_from": "bottle caps", "how_it_flies": "bounce", "on_landing": "explodes into tiny pieces", "funny_side_effect": "leaves a trail of colorful confetti"}, {"name": "Elastic Band Snappers", "made_from": "elastic bands", "how_it_flies": "arc", "on_landing": "snaps back to the thrower", "funny_side_effect": "creates a mini-jump in the thrower"}, {"name": "Paperclip Cannons", "made_from": "paperclips", "how_it_flies": "roll", "on_landing": "sticks to surfaces", "funny_side_effect": "creates a paperclip snowstorm"}]
- The Dell Reasoner: [{"name": "The Tea Bag Rocket", "made_from": "a tea bag and string", "how_it_flies": "arc", "on_landing": "spills tea and leaves a soggy trail", "funny_side_effect": "It smells like Earl Grey and makes the target sneeze"}, {"name": "The Paperclip Barrage", "made_from": "a bunch of paperclips", "how_it_flies": "cluster", "on_landing": "clinks and makes a metallic noise", "funny_side_effect": "It sounds like a tiny jazz band"}, {"name": "The Elastic Band Cannon", "made_from": "an elastic band and a pencil", "how_it_flies": "bounce", "on_landing": "stretches and bounces around", "funny_side_effect": "It can't stop bouncing until it hits something"}]
- The Dell Surveyor: [{"name": "Bottle Cap Bomber", "made_from": "Bottle cap, rubber band, drawing pin", "how_it_flies": "arc", "on_landing": "Makes a 'clink' sound and sends fluff flying.", "funny_side_effect": "Leaves a faint smell of fizzy drink wherever it lands."}, {"name": "Paperclip Dart", "made_from": "Paperclip, string, crumb", "how_it_flies": "roll", "on_landing": "Gets stuck to the surface with the crumb.", "funny_side_effect": "Starts to slowly unravel the string, leaving a trail of tiny paperclip-crumb-string sculptures."}, {"name": "Tea Bag Toss", "made_from": "Used tea bag, elastic band", "how_it_flies": "bounce", "on_landing": "Leaves a damp patch and a faint tea aroma.", "funny_side_effect": "Slowly unfolds, revealing a tiny, cryptic message written in tea stains."}]
- The Mill Hand: [{"name": "The Bottle Cap Launcher", "made_from": "A bottle cap is used as a launcher, which flies through arcs and bounces off surfaces.", "on_landing": "When it lands on the floor or worktop, it pops into fluff and sends the creature home to its tent.", "funny_side_effect": "The creatures get stuck in each other's caps."}, {"name": "The Elastic Band Archer", "made_from": "An elastic band is used as an arrow, which flies through arcs and bounces off surfaces.", "on_landing": "When it lands on the floor or worktop, it pops into fluff and sends the creature home to its tent.", "funny_side_effect": "The creatures get stuck in each other's bands."}, {"name": "The Paperclip Launcher", "made_from": "A paperclip is used as a launcher, which flies through arcs and bounces off surfaces.", "on_landing": "When it lands on the floor or worktop, it pops into fluff and sends the creature home to its tent.", "funny_side_effect": "The creatures get stuck in each other's clips."}]
- The Radeon Coder: [{"name": "Pillow Bombs", "made_from": "pillows and strings", "how_it_flies": "bounce", "on_landing": "creates a cloud of fluff", "funny_side_effect": "can knock over nearby furniture"}, {"name": "Blanket Dart", "made_from": "old blankets and paperclips", "how_it_flies": "arc", "on_landing": "sticks to the target", "funny_side_effect": "can create a tangled mess"}, {"name": "Tea Bag Grenade", "made_from": "tea bags and elastic bands", "how_it_flies": "roll", "on_landing": "explodes into fluff", "funny_side_effect": "can create a tea-flavored cloud"}]

## B3. The room is the battlefield
- The Dell Coder: ["The floor is no-man's-land, where nothing sticks but paperclip cannons.", "A cable car runs along one wall, providing a moving target for the Grumble Tribe."]
- The Dell Reasoner: ["Shooting from the speaker top shakes the room, making it a wobbly battlefield", "A cable car (like a toy one) can be used as a moving target that's hard to hit but gives bonus points if you do"]
- The Dell Surveyor: ["High Shelf Trajectory: Shots aimed at the high shelf will have their arc significantly altered, requiring players to account for the upward boost. A successful hit from a high angle earns double fluff points.", "Speaker Shake Zone: When music plays, the speaker vibrates, causing all projectiles in the air to wobble unpredictably and altering the landing zones. Players must time their shots carefully to avoid being thrown off course."]
- The Mill Hand: ["Shooting up high shelves causes a 'missile' effect where all nearby creatures pop into fluff and are sent back down.", "A cable car serves as a moving target, with the creatures trying to hit it while dodging its movements."]
- The Radeon Coder: ["The floor is no-man's-land, where nothing can be destroyed.", "The speaker that plays music shakes everything, making it harder to aim."]

## B4. Big moments: the super weapon
- The Dell Coder: {"what": "The 'Roomquake' - a sudden, powerful shake that sends all creatures flying in random directions.", "how_earned": "Earned by collecting all the creatures' fluff from the battlefield and arranging them in a specific pattern on a hidden trigger."}
- The Dell Reasoner: {"what": "The Hoover", "how_earned": "By collecting 100 'dust' points from defeating enemies, which are earned by hitting creatures with projectiles."}
- The Dell Surveyor: {"what": "The 'Giggle Gust' - a sudden, gentle burst of air that pushes all creatures on the field a short distance, disrupting aiming and trajectories.", "how_earned": "Each colony earns 'Giggle Points' by successfully landing three shots without being hit. Once they reach 10 Giggle Points, they can activate the Giggle Gust."}
- The Mill Hand: {"what": "The 'Super Weapon' is a powerful, non-lethal device that can disrupt the enemy's aiming or provide an advantage in certain situations.", "how_earned": "Players must strategically use their resources and teamwork to earn this weapon by completing specific challenges within the game environment."}
- The Radeon Coder: {"what": "The 'Hoover' - a powerful vacuum cleaner that sucks up all fluff from the room, effectively wiping out the losing colony.", "how_earned": "Earned by collecting a special 'Hoover Token' from a hidden location in the room, which can only be found once per match."}

## B5. Winning and losing kindly
- The Dell Coder: {"how_it_ends": "The match ends when one colony has no creatures left on their surface.", "winner_gets": "The winner gets a special badge or token that can be used to unlock new creatures or abilities in the game.", "how_loser_feels_ok": "The loser is encouraged to cheer for the winner and is given a chance to play again soon."}
- The Dell Reasoner: {"how_it_ends": "When one colony's last creature is sent home, the match ends.", "winner_gets": "A special 'Dust Cloud' trophy and a cheer from the other colony.", "how_loser_feels_ok": "The loser gets a 'Dust Cloud' badge and a friendly message saying they're a 'Dust Master' for their next game."}
- The Dell Surveyor: {"how_it_ends": "The match ends after a set number of rounds (e.g., 5 rounds).", "winner_gets": "The winning colony receives a 'PatchTown Pride' badge displayed on their colony's home tent in the AR environment, and a celebratory shower of virtual confetti.", "how_loser_feels_ok": "The losing colony receives a 'Resilience Ribbon' – a virtual ribbon signifying their perseverance and good sportsmanship. A friendly message appears: 'You showed great skill! Let's play again and learn new strategies!'"}
- The Mill Hand: {"how_it_ends": "A match ends when one colony has all of its creatures safely 'sent home' or is unable to continue due to resource depletion.", "winner_gets": "The winner receives a special trophy for their colony's victory and recognition from other players in the community.", "how_loser_feels_ok": "The loser can feel proud, as they have demonstrated skill and strategy against formidable opponents."}
- The Radeon Coder: {"how_it_ends": "The match ends when one colony has no creatures left on its surfaces. The last colony standing wins.", "winner_gets": "The winner receives a special badge or trophy, and their colony's creatures are celebrated with a fun, fluff-filled victory dance.", "how_loser_feels_ok": "The loser is congratulated on their effort and encouraged to try again. They receive a consolation prize, such as a special fluff pillow, and are invited to join the next match."}

## B6. One rule
- The Dell Coder: "No creature can be hit more than once in a match, ensuring that all creatures have an equal chance to participate."
- The Dell Reasoner: "No projectile can be aimed at the Steward's desk or any surface with a living creature."
- The Dell Surveyor: "‘Surface Bounce’ – When a projectile hits a surface (floor, shelf, etc.), it bounces *slightly* in a predictable arc, adding a layer of strategic complexity and allowing for unexpected shots."
- The Mill Hand: "In Base Camp, all creatures are considered equal; no creature is more valuable than another. This rule ensures that each player's colony has an equal chance of success regardless of the size or strength of their initial setup."
- The Radeon Coder: "No creature can move or be targeted while it is in the air, ensuring that all attacks are calculated and precise."

## Spark session: the tiny experts, sorted by the Dell's 27B

### weapons and contraptions from household rubbish (23 of 24 sparks kept, sorted)
- Choreographer: The player taps and shakes the screen to charge a bottle cap launcher, releasing a bubbly projectile that arcs across the room.  [its words: "Tap and shake the band, and a little bubbly creature emerges. Tap again to release."]
- Synthesist: A massive, 225-pound paperclip acts as a slow, heavy pendulum weapon that swings in a wide, predictable arc to hit distant targets.  [its words: "a 225-pound (101-kilogram) paperclip, and a paperclip is the simplest pendulum"]
- Sonero: The player loads a catapult with an absurdly large quantity of paperclips, which launch as a single, clattering, multi-clip projectile.  [its words: "the world's largest number of paperclips, and the catapult was launched"]
- Junglist: A small, screwed ball creature named a 'knight' is thrown in a gentle arc to gently bump opponents rather than attack them.  [its words: "screwed ball, which they called a 'knight'. The creature used it to stab at their enemies, but it was not designed for a fight."]
- Toymaker: The player attaches different types of paperclips to the ends of a toy catapult to change the launch angle and power for each shot.  [its words: "a series of toy catapults, each one with a different type of paperclip that you can attach to the ends"]

### funny ways a creature gets knocked out (23 of 24 sparks kept, sorted)
- Toymaker: When a creature is hit, it instantly transforms into a small, furry creature with a trunk that pops out of a bubble of air and asks, 'Now, what's this?'  [its words: "emerged as a small, furry creature with a trunk. "Now, what's this?""]
- Toymaker: A hit creature performs a comedic exit by sliding down a tiny slide and popping out of a bubble of air to be sent home.  [its words: "Exits through a slide, a door opens, and a creature emerges from a bubble of air."]
- Musician: The impact causes the creature to dash off into the air, where it is comically 'fed' by a stream of fluff before vanishing.  [its words: "dashed off into the air, where it was soon to be fed and fed."]
- Junglist: Upon being hit, the creature begins to fly away from the surface, leaving a trail of 'hiss' and 'hiss' sounds that are hard to miss.  [its words: "began to fly, leaving the town with the sound of 'hiss' and 'hiss', a sound that was hard to miss."]
- Musician: The creature is knocked into a state of shock, exclaiming 'I am a frog!' before being gently lifted up and sent away in a high cheer.  [its words: "I am a frog! What am I going to do when I get home?"]

### battle sounds and victory dances (23 of 24 sparks kept, NOT sorted yet - the Dell had not reached it)

## Harry's picks
-
