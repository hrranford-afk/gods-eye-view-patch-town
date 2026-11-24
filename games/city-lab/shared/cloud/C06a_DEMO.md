# C06a: the power network, what was built, what works, what fails (CLOUD, 22 Nov 2026)

Status of the job: see the C06a row in `JOBS_CLOUD.md`. Nothing here was run on an iPad or in AR; everything is headless (Node, and headless Chromium with software GL). Format and rules: `INFRA.md`. Results of E4 and E5: `C06a_RESULTS.md` (figures in `evidence/C06a_experiments.json`). Open the page at `games/city-lab/power.html` (it opens `district.html?district=districts/patch_row_power.json&infra=infra/patch_row_power.infra.json`).

## What was built (one layer on the district code; no second building engine; recipes and `rtk.building` v1 unchanged)
- `city_infra` v0 file + strict validator `infra-validate.js` (44 hostile or broken files all refused, none throws; the link to the district is id, version and SHA-256).
- `infra.js`: rule A allocation on a cable TREE, exactly the paper-test definition; per-edge load and colour, the limiting cable of every building, plain-language "why" sentences. `district.js` calls it and feeds each building's factor into its existing machine through the existing `setExternal` hook. Districts without infra give the same state hashes as before (asserted).
- `recipes/generator_shed.json` (56 parts, passes the real v1 validator), `districts/patch_row_power.json` (copy of the hand-made district plus the generator), `infra/patch_row_power.infra.json` (root junction; main feeder to bakery, workshop, market and shed; a separate homes cable of 3.0 kW so that at 8 homes the homes cable overloads, 3.2 wanted, before the main feeder does, 10.5 of 12; all numbers illustrative).
- Page: cable thickness by capacity and colour by load; dark buildings grey with "NO POWER"; dim buildings ringed with "power 94%"; generator glow and kW; tap a dim or dark building (a real pointer click works) and its limiting cable lights up with one sentence ("Homes cable 3.0 kW; the homes street wants 3.2 kW; Home 3 gets 94 percent."); the "What changed and why" log explains every infrastructure change with before and after numbers, and every brownout line also gives shelf stock, energy saved and how long the shelf covers sales; a READ-ONLY cost comparison (add a generator of X kW, or upgrade a cable to X kW) and the experiments E4 and E5, all from the same deterministic code as the tests (the page equals the headless figures exactly, state hashes included).
- Tests: `tests/infra-test.js` 55, `tests/infra-paper-test.js` 9, `tests/infra-page-test.js` 41 (two layouts), `tests/infra-e2e.js` 12 (prints a table). Screenshots `shots/c06a-1..8.png`.

## What works (measured, not claimed)
- P1, P4 and P5 give the same numbers through the real code as on paper (homes 2.0 of 2.8 = 71.43 percent, bakery 6.0, total 8.0; after a 4.0 cable homes 2.8; source 6 kW: homes 1.5, bakery 4.5; a second 3 kW generator at the root equals P1).
- A local brownout leaves the other streets untouched EXACTLY (factors compared with `===`); a cut cable makes everything below it dark; two generators at the root add.
- The C03b rule holds under local brownouts (regression tests): a short bakery-line cut raises net by exactly the electricity saved and nothing else; a long one reverses it; net never rises as the cut gets deeper.
- Determinism: three runs of every experiment are byte-identical; the infra scenario hash is stable.

## What FAILS, is crude, or is surprising (blunt)
1. **Homes have no machine, so a dim or dark home street changes no money.** The visible "dim street" is cosmetic in this version. The cost comparison for a homes-cable upgrade therefore always says payback "never" in coins.
2. **Rule A can make an upgrade LOSE money.** At 10 homes widening the homes cable to 4.0 kW makes the generator the limit (14.5 kW wanted, 13.5 given) and rule A shares the shortage with the shops: the district net falls by 4.11 a minute (E5). A priority rule B (homes last) would not.
3. **E4 is NO on the shipped network, partly by construction.** The 13.5 kW generator was sized to equal the capped demand (that is what makes E5's clean local dim possible). Smaller first generators (12 and 9 kW, a sensitivity, not the shipped data) DO pay back, in 8.8 and 3.1 minutes at 10 homes.
4. **Wages stay as they are (unfilled places unpaid), and for a dark SHOP street that is NOT cheap**: a power cut does not empty the work places (only a blocked road does), so a dark bakery keeps paying 15 a minute and sells nothing (net +52.57 to -15.00). The outage that the unpaid-unfilled rule makes cheap is the road outage (C03b), and a dark homes street is free. The owner expected cheap dark streets; for shops the model says the opposite.
5. A "short brownout raises profit" effect is still there and larger than "energy saved" alone when several machines dim (the workshop also takes less wood); the log states this, but the headline figure is not decomposed per machine in the page.
6. Costs are linear in size and illustrative; the generator's upkeep replaces the shed machine's own wage and power in the district totals, which is a bookkeeping choice, not a fact.
7. Source buildings are not nodes of the tree (a generator powers itself); a source must stand in a `shed` building; a second generator needs its own shed.
8. The experiment sensitivity uses a smaller first generator by editing the source kW; it is not a layout the owner has chosen.
9. Visual: the label of a building can cover its neighbour's roof at the 1180 px layout (the homes cluster is crowded: the labels there are shortened to "power 94%"); cables are thin lines; the cable hit area for a finger is a fat invisible tube (not tested with a real touch screen).
10. Not tested: iPad, AR, real touch, GitHub Pages hosting (the page uses `crypto.subtle`, which needs a secure context; it falls back to checking id and version only and says so).

## Frame time (software GL, headless Chromium, NOT an iPad)
About 100 ms per frame at 1180x820 and about 97 ms at 834x1194 (software rasteriser, shadows on, labels, cables and rings). This is a pessimistic bound for a real GPU, not a measurement of one; a real tablet must be measured before anything is claimed. A cost comparison blocks the page for about one second (two 65-minute simulations on the main thread).

## What to test next
1. On the iPad: tap targets (cables are thin), label overlap, frame rate, the read-only comparison delay.
2. Give homes a consequence of a dim or dark street (residents spend less, or leave) so that the homes cable has a price; then re-run E4 and E5.
3. Owner decision: rule A or B (priority classes) for a short source; the 10-home upgrade result in E5 is the reason it matters.
4. Owner decision: should a dark shop keep paying wages? (Today yes, because power does not empty the work places.)
5. Wind profile and fuel generators (a repeating deterministic profile on a source is a small change in `allocate`), network losses, loops: all out of scope for v0.

## Reusable parts
`infra-validate.js` (strict, pure tree-and-link validator, reusable for water pipes in C06b: same tree, same rule A with a different unit), `infra.js` (`allocate` is unit-free: kW or kL/min), `infra-exp.js` (`compare` rebuilds a fresh deterministic world from a plain config: reusable for any read-only what-if), the tap-to-explain pattern (`INFRA.explain` + highlight) and `tools/c06a-experiments.mjs` (three byte-identical runs and a generated results file).
