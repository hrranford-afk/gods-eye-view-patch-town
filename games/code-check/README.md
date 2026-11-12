# Code-check practice set

For CAIRN, to run on the town's machines. Written 12 Nov 2026.

## What it is for

Last night the town's small models were asked to find bugs in the Base Camp game file and did badly:
the 14B said "no bugs" to everything, then listed 64 vague guesses; the 35B timed out in a thinking loop.
A stronger reviewer found 5 real bugs; the town found 1.

This is a practice set with **known answers**, so a model can be scored, and later trained, on finding
real bugs **without crying wolf**.

42 short JavaScript snippets (17 to 28 lines each) in the game's style:

| kind | how many | what it is |
|---|---|---|
| real | 7 | today's real bugs, the code as it was before the fix (both halves of the full-store bug included, plus the stale request button) |
| planted | 17 | realistic bugs put into game-style code: off-by-one, `indexOf` -1, `>` vs `>=`, a lost remainder, a skipped guard, state not reset on switching, a bad write order, NaN from a missing field, a timer never cleared, a list that grows forever, a shared default object, an async race, and a few more |
| clean | 18 | correct code that tempts the usual false alarms ("might be undefined" with a guard right there, "index out of bounds", "divide by zero" already handled, "mutates shared state" when it copies first...) |

Levels 1 to 3 (10 / 19 / 13 snippets): 1 is a bug you can see in one function, 3 needs you to follow state across functions or over time.
Half the score is not crying wolf, so clean snippets are 43% of the set.

## Files

- `exercises.json` the set, **with the answer key inside it**
- `PROMPT.md` the exact prompt for one exercise (short on purpose)
- `run_model.py` loops one model over the set and saves replies; sends only context and snippet
- `score.py` scores a replies file; `--self-test` checks the scorer itself
- `checks/` how the key was proved (needs Node, only for people editing the set). `node checks/build_and_verify.cjs` rebuilds `exercises.json` and re-runs every proof: each real or planted bug is shown to fail in Node and to pass once the stated fix is applied, and each clean snippet passes property checks. `checks/ids.json` maps source names to ids and is also a key.

## Run one model

Any server with an OpenAI-style chat endpoint works (Ollama, llama.cpp server, LM Studio). I tested the script only against a fake local server, not against the town's real model servers, so check the URL and model name first with `--limit 3`.

```
python3 run_model.py --url http://localhost:11434/v1/chat/completions \
    --model <model name> --out replies_<model>.jsonl --limit 3      # try 3 first
python3 run_model.py --url ... --model <model name> --out replies_<model>.jsonl   # then all 42
```

It writes one line per exercise: `{"id": "e07", "reply": "<raw text>", "seconds": 4.1, "error": ""}`.
Stopping and re-running resumes where it left off. A timeout (default 180 s per exercise) is saved as an empty reply and counts as broken, which is the honest result for a thinking loop.
If you use another runner, any JSONL with `id` and `reply` fields scores the same. Temperature 0; one fresh conversation per exercise.

## Score

```
python3 score.py replies_<model>.jsonl            # the table
python3 score.py replies_<model>.jsonl --items    # and the verdict for every exercise
python3 score.py --self-test                      # no model needed
```

The table shows precision, recall, false alarm rate, broken rate and a balanced score, then per level, real, planted and clean.
Each reply is one of: found, wrong find (said bug, but the wrong function or a different problem), missed, false alarm, correct no-bug, broken.
`--self-test` should say PASSED: the answer key scores 100%, a fake that always says "bug" gets 0% balanced score and 100% false alarms, and a fake that always says "no bug" gets recall 0 and 50% balanced.

**The matching is approximate.** "Found" needs the right function name and a quarter of the key's content words (or three of them) in the model's explanation. That is keyword overlap, not understanding. It will miss some good paraphrases and may credit some lucky ones. Read 5 or 6 of the "found" and "wrong find" replies by eye before you claim a small difference between two models.

## A good first target

1. **False alarm rate under 20%** on the 18 clean snippets, and broken rate under 10%. Ignore recall until that holds. (A model that says "no bug" to everything has 0% false alarms, so never read that number alone: recall must be above zero too.)
2. Then recall: finding a third of the level 1 and 2 bugs would already beat last night.
3. Then level 3.

Do not decide anything from one run of 42: one exercise is worth 2 to 6 points on a rate. Run twice and compare.

## Report it honestly, as with the council

- Say which model, which date, and the whole table, not just the best number.
- Say **how many replies were broken** (empty, timed out, no JSON) out of 42, and how many of the clean ones were among them. A model that only answers 25 of 42 has not "passed" the 25.
- Count the broken ones against it. `score.py` already does for recall and the balanced score; the false alarm rate is out of the clean replies that parsed, so quote the broken rate next to it.
- If the 35B times out, report the timeouts. Do not rerun until it passes and report only that run.

## Keep the answer key away from the models

`exercises.json` holds both the questions and the answers (`answer`, `source`, `trap`, `fixed_snippet`). So:

- Never paste `exercises.json`, `checks/` or `ids.json` into a model's context, and never give a model file access to this folder while it is being scored. Use `run_model.py`, which sends only `context` and `snippet`.
- The set is also meant as **future training data**. A model trained on these answers can no longer be scored on them. Before any training, split the ids: keep a held-out half (with the same mix of levels and clean/bug) that is never trained on, and keep scoring on that half.
- The real-bug snippets come from the game's own history, so a model that has read the game repository may know them. Treat the 7 real ones as the hardest honest test and the planted ones as the training pool.
- Please do not "fix up" a snippet without re-running `checks/build_and_verify.cjs`.
