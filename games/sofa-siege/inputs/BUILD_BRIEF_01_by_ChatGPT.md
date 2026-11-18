<!-- by ChatGPT, from Harry's Round Table Kingdom Concept Pack 01 (18 Nov 2026). Words untouched. The pack's pictures stay with Harry and are not in this repo. -->
# BUILD BRIEF 01 — MARBLE LOBBER + BATTLE LOOK
**STATUS: visual concept and proposed gameplay, not implementation claims.**

## Purpose
Translate the concept image into realistic, modular tasks for the existing 3D tabletop prototype. Do not replace existing code, UI or models without first inspecting them.

## Keep from the working 3D mock-up
- The actual round tabletop stays the battlefield, visibly in a human living room.
- Blue home base at near side; red enemy base at far side; grassy stone-ringed hill and flag at centre.
- Small, chunky 3D forts, readable teams, toy-scale objects. Strongly readable at normal gameplay camera distance.

## New visual target from image 01
- Handmade, painted miniature quality: rough brush texture in wood, blue/red chipped paint, visible lashings, softly imperfect props, cozy warm light.
- A **Marble Lobber** mounted near the blue base: wide wooden carriage on wheels, an elevated launching arm / barrel-like projectile trough, visible winding drum or crank, small bucket of colourful marbles, cloth or cord bindings.
- On firing: a visible marble, a short readable ballistic arc, spring-back / recoil, satisfying wobble of the carriage; then clear hit feedback on a *specific* wall piece or joint.
- Small blue crews retrieving fallen sticks and making repairs; distant red fort and centre flag should stay readable.
- Optional dramatic close-up camera on a structural failure; overhead/default camera remains usable for touch input.
- The concept's exact prop placement is inspiration, not a collision map or validated design. Keep proportions game-readable rather than blindly copying the artwork.

## Proposed Marble Lobber gameplay (V1)
- Aim with touch drag: direction + power; simple predicted trajectory indicator if it is easy to read.
- Fire **one** heavy toy marble per action; slower than a precise bolt shooter.
- Prefer meaningful knocks against lightly attached boards, unbraced posts and roof pieces, instead of simply large area HP damage.
- Projectile contacts the structure via collision; collision returns stable `part_id`, hit strength and impact point to the damage rules.
- Damage rules evaluate supports (e.g. posts + diagonal braces), then disconnect unsupported parts and animate debris. No need for real engineering simulation in V1.
- Salvage can be reclaimed from collapsed pieces once, and used for rebuilding; do not let destruction visuals award duplicate material.
- Always distinguish **visual mock-up** from **tested gameplay**.

## Suggested kit decomposition
`lobber_mount`, `lobber_carriage`, `lobber_wheel_L`, `lobber_wheel_R`, `lobber_crank`, `lobber_arm`, `lobber_cup`, `ammo_bucket`, `projectile_marble`, `recoil_pivot`.
Use named, stable sockets for mounting, firing origin, projectile collision, and character operation. Suggested names only; adapt to existing game conventions.

## First acceptance demo for the builder
1. Show the lobber in a paused close-up and an overhead view; it matches the hand-painted toy style.
2. Let the user drag to aim and fire. Hit positions are visible and repeatable.
3. Shooting a weak joint damages **that part**, not an anonymous whole-fort health bar.
4. With no brace, a failed key support can drop roof parts; with a brace, the fort can survive. Test this in the rules separately.
5. Debris settles within a bounded object budget on the iPad-class target. Don't invent performance results: measure them on devices.
6. Original 3D scene and existing 2D mechanics prototype remain intact unless migration has been explicitly approved.

## Follow-up concept images to design individually (NOT YET IN THIS PACK)
- 02: Detailed Marble Lobber **asset sheet** — orthographic front/side/back, moving parts, firing pose.
- 03: Precision Pinbow — exposed joints as targets, aiming feedback.
- 04: Structural collapse — the same tower in intact / damaged / braced / collapsed states.
- 05: Deployable personal base — folded travel form to expanded battle form.
- 06: Salvage and repair crews — one genuinely funny post-battle moment.
These are a proposed queue, not assets that have already been made.

## Working rule
**Inspect → reuse → refine → test.** Keep all source game numbers / physics unaltered until measured or intentionally redesigned.
