# Raid a base: the next mode, after the weapon workshop (plan v0, 20 Nov 2026)

Harry, 20 Nov: "I'm looking forward to building some new weapons and just creating some carnage. Just create a firing range. And take some inspiration from Clash of Clans."

**What we take from that kind of game: the mechanics only, in our own world.** A base you design, defences that work by themselves, a raid you plan and watch, and a score for how much you wrecked. **What we do not take:** its name, characters, art, layouts, music or look. Our camps are planks, rope and tin, our attackers are toy mice, and nobody dies.

## The idea in one paragraph
You design a camp in the Lab (or use a saved one). Another player, or a robot, raids it: they get a budget of mice and ammo and have 3 minutes to wreck as much as they can. Your camp's own defences fire back by themselves, so how you built it decides how the raid goes. The raid ends with a destruction score and one to three stars. A fort is just a piece of text, so you can send it to a mate to raid, and they send you their score.

## The loop
1. **Design** a camp in the Lab, with a budget. Save it.
2. **Share** it: Copy JSON (already in the Lab).
3. **Raid** someone else's camp: paste their design, pick a raid kit within the budget (for example 6 mice and 8 shots from a short list of ammo), watch the clock, deploy and fire.
4. **Score:** percent of the camp's parts knocked off or collapsed, with stars: 1 star for 40%, 2 stars for the Keep down, 3 stars for 90% and the Keep. A replay of the raid can be saved as text.
5. **Defence works while you are away:** your robot defenders mend and fire back at raiders using the same rules.

## What it needs (in order)
| Step | What | Builds on |
|---|---|---|
| 1 | **Auto-defences:** buildings that act alone: a pop-gun turret that corks raiders on a timer, an alarm bell that makes defenders run to the breach, spring traps that already exist | v2 pieces, Lab |
| 2 | **Raid kit and score:** a raid budget, the destruction percentage, stars, a 3-minute clock | the Lab and the bot code |
| 3 | **Replay:** record the raid's shots and orders as text and play them back | the Lab's replay and seeds |
| 4 | **Share:** "Raid this design" paste box, and "Copy my score" | Lab save and load |
| 5 | **A short upgrade layer** (optional, Harry's call): spend points earned in raids to unlock a new piece or ammo | later |

## Not in this mode
No real-time online play, no servers, no accounts, no purchases. Everything is text that people paste to each other.

## Needs Harry (taste)
1. Should defences fire back by themselves (a pop-gun turret), or should a camp be only walls and traps?
2. Should there be an upgrade layer, or is design and raid enough?
3. Raid a friend's fort, raid a robot's fort, or both?
