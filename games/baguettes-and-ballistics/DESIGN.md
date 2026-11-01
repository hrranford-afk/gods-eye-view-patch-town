# Baguettes & Ballistics: design

A toy war across a real kitchen. Tiny vehicles, real-world scale, everyday
things as terrain. Fun first on an iPad: one thumb drives, one thumb fights
and builds.

## The loop

1. **Gather.** Diggers dig loot from piles; dump trucks haul it to your toy
   box (the factory) or to bottle caps you hold (depots).
2. **Build.** Spend loot on turrets, vehicles, workers and bridges. Each
   thing has a recipe once there are several kinds of loot.
3. **Fight.** Hold caps for shorter hauls, raid enemy trucks (wrecks spill
   their load), defend your own routes.
4. **Win.** Break the enemy toy box.

The enemy plays by the same rules: it digs, hauls, builds and upgrades.

## The twist: race, then battle (Harry's idea, 31 Oct 2026)

Each level starts as a race and turns into a war.

1. **Race.** Laps around the table. Supply boxes lie on the track.
   Pick one up, carry it, and drop it anywhere you like: at home, or
   at a spot you want to hold. The box shows what it becomes (gun,
   wall, truck, digger), so every pickup is a choice. Carrying slows
   you a little: grab more, or race faster?
2. **The switch.** The kettle clicks, the table shakes, and every
   dropped box unfolds into what it holds. Your base is wherever you
   raced it to, so every game has a different map.
3. **Battle.** As now: cereal keeps the war going, and you break the
   enemy toy box to win.

- **Steal (CAIRN's add):** ram a car carrying a box and it drops it.
  The race has fights in it, and grudges carry into the battle.
- **Keep it close:** the last-place racer gets a catch-up gift (a free
  turret or an ambush spot), so losing the race never loses the game.
- **Why it works:** the race teaches driving before building, which
  fixes the hard first minutes.

## What each level adds (1 Nov 2026)

Each level brings **one new thing to collect, one new toy, one new rule of
the table, and a boss**, so every level plays differently. Three stars per
level: win, win in under 8 minutes, win without losing a truck.

| # | Level | New thing to collect | New toy | New rule of the table | Boss |
|---|---|---|---|---|---|
| 1 | Breakfast table | cereal | diggers, dump trucks | the middle bowl refills; spills slow you | none (learn the ropes) |
| 2 | Pencil case | **paperclips** (from the open pencil case): armour and tanks need them | **bulldozer**: pushes erasers into walls, and cereal into hoppers | **pushable erasers**; enemy **raids** every 90 seconds | the Stapler: slow, armoured, snaps turrets shut |
| 3 | Remote-control drawer | **batteries**: lasers and the Jet Bike need them | **laser turret**, Jet Bike | **dark drawer**: you only see what your headlights and turrets light up | the Remote Car: fast, circles and snipes |
| 4 | The sink | (all three) | **crane**: lays bridges (spaghetti snaps, lolly sticks hold, a ruler takes a tank) | **water gap** down the middle; drips from the tap knock you sideways; hover skims across | the Rubber Duck: a floating fortress |
| 5 | Hob and oven | (all three) | **toaster launcher**: fires a car over walls | **hob rings** heat up and cool on a cycle; the oven door drops as a ramp to a high ledge | the Toaster Tank |
| 6 | Baguettes & Ballistics | (all three) | everything | **night**: only the fridge light; the kettle boils as a countdown to the enemy's big push | the Baguette: a long armoured train that has to be cut in pieces |

**Between levels:** a short "day in the kitchen" card (morning, then lunch,
then dinner) and a garage where stars unlock paint jobs and horns. Unlocks are
for fun, never for power, so a new player can still win.

**Race-then-battle** (above) is the opening of every level from level 2
onwards, once the race code exists. The track runs around that level's hazards,
so the race teaches the new rule before the fight.

## Loot

| Loot | Where | Builds |
|---|---|---|
| Cereal | spilled bowls; the middle bowl refills | ammo, drones, light cars, trucks |
| Paperclips (level 2) | pencil case | armour, tanks, gun turrets |
| Batteries (level 3) | the remote-control drawer, the fridge | lasers, rockets, hover, Jet Bike |

## Vehicles

Racer, Tank (free) · Hover (floats over spills) · Mech (builds cheap) ·
Monster (rams) · Jet Bike (fastest). Later: crane (lays bridges), forklift
(carries turrets), ice-cream van (heals nearby), toaster tank.

## The campaign: Mealtime Mayhem

The campaign runs through one day in the kitchen.

| # | Level | Time | New |
|---|---|---|---|
| 1 | Breakfast table | morning | cereal, diggers, trucks, caps as depots |
| 2 | Pencil case | morning | paperclips, enemy raids |
| 3 | Remote-control drawer | midday | batteries, lasers, Jet Bike |
| 4 | The sink | lunch | first bridges; hover crossings |
| 5 | Hob and oven | afternoon | hot rings on a cycle, oven-door ramp, toaster launcher |
| 6 | Baguettes & Ballistics | dinner, night | the whole worktop U; only the fridge light |

## Kitchen hazards and set pieces

- **Sink:** water gap; build a bridge (spaghetti: cheap, snaps · lolly
  sticks: sturdy · ruler: heavy, needs a crane). Hover skims across.
- **Hob:** rings heat and cool on a cycle; hot rings hurt.
- **Oven:** door drops as a ramp to a high ledge with long sight lines.
- **Toaster:** launcher over walls.
- **Kettle:** boils on a timer; steam blocks sight.
- **Fruit bowl:** central fortress.
- **Fridge:** cold zone slows everything; batteries inside.
- **Microwave:** turntable spins whatever sits on it.
- **Zip line:** dental floss from the spice rack; trucks ride it.
- **Lift:** wind a cupboard handle to reach the microwave top.

## How it should feel

Morning sun through the window, long shadows; shiny plastic toys on real
materials (wood, steel, tile); crumbs, steam, drips; clicky toy sounds; the
kettle click as a countdown. Night levels lit by the fridge.

## Engine notes

- three.js r128, one HTML file per build, no assets (everything is built
  from shapes), keeps it light on an iPad.
- Route finding: A* on a 2-unit grid, rebuilt when blocks change; units
  steer straight when the way is clear.
- Next engine work: heights (worktop, hob, oven ledge), bridges as
  buildable walkways, a minimap and pull-back camera for the big U.

## Ideas to try

- Two players on one iPad, one at each end (Micro Machines style).
- Ramps off books, boost pads, a boss vehicle per level.
- Real Worcester streets as a bonus map (from the Town Planner data).
