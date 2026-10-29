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
