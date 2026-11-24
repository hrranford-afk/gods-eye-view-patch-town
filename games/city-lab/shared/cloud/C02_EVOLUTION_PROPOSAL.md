# C02: building evolution as a SIDECAR (proposal v0, CLOUD, 21 Nov 2026)
Status: PASSED for its stated acceptance (see evidence). Owner review of the questions below is pending. Nothing here changes `rtk.building` v1.

## Principle
A recipe (`rtk.building` v1) never changes. Evolution is a separate data file, `city_evolution` version 0, linked to ONE recipe by id, version and SHA-256. Applying it makes a patched COPY of the recipe in memory. The copy must pass the real v1 validator. If it does not, the sidecar is refused.

## Shape (example: `examples/bakery.stone_deck_oven.json`)
`schema, version, id, recipe{id,version,sha256}, context{era, climate, purpose}, branches[]`.
A branch is `gameplay` or `cosmetic`, never both:
- gameplay: `requires{tech[], wealth_min}`, `cost{coins}`, `drawback` (REQUIRED text), `effects[]` of `{path, op, value}`.
- cosmetic: `pairs_with` a gameplay branch, `cosmetic[]` of `{part, material}`. It cannot change a number.
Ops are only `mul`, `add`, `set`. Paths are a short whitelist (production batch time, power demand, storage, spoilage, repair seconds by tag, price, demand, a few costs) and must already exist as numbers in the recipe. No path may touch `parts[].stage` (it means damage order, not an era). No new part kinds, no new v1 keys, no code.

## Determinism and conflicts
Branches apply in id order. Two branches that `set` the same path are refused. `mul` and `add` stack. The same recipe plus the same sidecars always give the same patched recipe (checked twice per run).

## Three bakery branches, each with a cost and a drawback (numbers measured by the existing simulation, 5 simulated minutes, seed 1)
| Branch | Cost | What it does | Drawback | Measured |
|---|---|---|---|---|
| Stone deck oven | 40 | batch time x0.75 | demands 8 of the city's 8 kW; oven repair x1.5 | loaves made 120 to 144, but sold only 91 to 94: SALES DEMAND, not baking, is the bottleneck |
| Cool store room | 30 | storage 60 to 100 | flour spoils x1.3 after roof damage; wages +1 per worker per minute | net/min 33.0 to 30.0, no gain unless deliveries are late; roof lost: flour spoiled 16.9 to 19.6 (+16%) |
| Slate roof (+ cosmetic look) | 55 | flour spoilage x0.2 | roof repair takes twice as long | undamaged: no change; roof lost at 20 s: flour spoiled 16.9 to 4.8 (-72%); money unchanged within 5 minutes |
Findings: (1) production boosts do nothing while demand caps sales, so demand must be a city-level system before production upgrades are worth buying; (2) resilience only pays when something goes wrong, which is the right shape for it; (3) every drawback shows up as a number, none is hidden.

## Save and versioning plan
A save is `{recipe_sha256, sidecar_sha256[], applied_branch_ids[], history{age_days, repairs[]}, version}`. Loading re-applies the branches to the recipe and refuses if a hash differs. `city_evolution` carries `version: 0`; a later version adds a migration function, never edits old files. Cosmetic and gameplay choices are stored separately.

## What is NOT proposed yet
Adding new parts (an extra room) needs `adds_parts` validated by the v1 support and overlap rules; left for v1 of the sidecar. Era trees, materials, climate and wealth as inputs are fields only: nothing reads them yet.

## Questions for the owner
1. Is a sidecar (separate file, patched copy) acceptable, or do you want new fields in the recipe itself?
2. Upgrades: shaped by need (weather, wealth, supply) or by a tech timeline, or both?
3. Should every drawback be visible before buying? (the check requires one in the data)
4. Where do saves live first: this iPad's storage, or an exported text?
5. Should city-level demand (a shared market) come before more upgrades, given finding (1)?

## Evidence (re-runnable)
`node games/city-lab/shared/tools/sidecar-check.mjs games/city-lab/recipes/bakery.json games/city-lab/shared/cloud/examples/*.json` (output saved in `evidence/C02_sidecar_check.txt`); `node games/city-lab/shared/tools/c02-damaged-scenario.mjs` (`evidence/C02_damaged_scenario.txt`).
