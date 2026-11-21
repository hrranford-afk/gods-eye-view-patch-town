# C01: the ten supplied recipes against the real validator (CLOUD, 21 Nov 2026)
Status: PASSED for the stated check (schema validation). It does not prove good looks, balance, physics, iPad or AR.
- Source: made by ChatGPT, words untouched. Inputs: `games/city-lab/inputs/chatgpt-2026-11-21/recipes/recipe_01.json` to `recipe_10.json`, never edited.
- Validator: `games/city-lab/validate.js` at the commit recorded in `C01_RESULTS.json`.
- Result: 10 of 10 valid first time, no corrections. All ten also build and run in City Lab with no errors; the five-minute simulation ran for each (numbers in `C01_RESULTS.json`).
- Visual review (CAIRN): plain open-sided boxes with a three-part roof; five of ten produce nothing by design (shells). Windmill and lighthouse are tall boxes. See `inputs/chatgpt-2026-11-21/contact_sheet_rendered.png`.
- Reproduce: `node games/city-lab/shared/tools/c01-validate.mjs` (also checks each file's SHA-256 against the record). Saved output: `evidence/C01_validate_run.txt`.
- Failures: none in the schema check. Limits and gaps (ChatGPT's own list): `inputs/chatgpt-2026-11-21/missing_parts.md`.
