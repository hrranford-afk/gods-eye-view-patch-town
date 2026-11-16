# The Works ledger

`games/works/ledger.jsonl` is the town's diary in a form a computer can read. PatchTown Works
(`games/works/index.html`) reads it and plays it back as people walking around the town.

One line = one thing that happened. Each line is one JSON object. Never edit old lines; only add new ones at the end.

## The fields

| Field | Needed | What goes in it |
|---|---|---|
| `t` | yes | When, in ISO time with `Z` (UTC), e.g. `2026-11-16T17:10:00Z`. In November UK time = UTC. |
| `who` | yes | `foreman` (the main session), `builder:<name>` (a hired builder, e.g. `builder:depth`), `town` (the test yard or the machines), or `harry`. |
| `where` | yes | Which building: `hut`, `library`, `yard`, `post`, `shop`, `bridge`, `harry`, or `workshop:<branch>` (e.g. `workshop:game/bc-depth`). |
| `what` | yes | One short plain sentence. No names except "Harry". No places, no room photos, no personal details. |
| `kind` | yes | One of `hire`, `start`, `end`, `step`, `fix`, `test`, `commit`, `deploy`, `download`, `order`, `result`, `win`, `fail`. |
| `ref` | no | A commit (short hash), a branch, an order name (`scan-1`) or a page path (`base-camp/`). |
| `branch` | no | The branch a commit was on. |
| `suite`, `status`, `n` | for `kind:"test"` | The test suite name, `pass`, `fail` or `flaky`, and the count (`43/43`). The yard shows one lamp per suite: green pass, red fail, amber flaky. |

What each kind looks like in the town:

- `hire`, `start`: a walker leaves the foreman's hut for the workshop.
- `step`, `commit`, `fix`: a walker goes workshop -> yard -> post office. Commits become parcels at the post office.
  (`fix` is kept apart for the v2 hospital.)
- `end`: the builder walks home to the hut. **Every `start` needs an `end`** (same `ref`). A `start` with no `end` and
  no commit, step or fix from that builder or branch for 2 hours goes to the **lost property office** (abandoned cart,
  alarm lamp). That would have caught the build 29 builder that stopped at 16:27 on 15 Nov.
- `download`: something came in from outside (a model, an asset); put its licence in `what`. Diary only in v1
  (v2: a ship in the harbour).
- `test`: a lamp changes in the inspection yard. The weather follows the yard: sunshine when all suites are green,
  clouds when any is flaky, a storm on failures.
- `deploy`, `win`: the shop window lights up (a win also puts a star over the shop and a rainbow in the sky for 2 hours).
- `order`: a wagon waits at the bridge to go to Harry's machines. `result`: the wagon comes back.
- `fail`: the building's lamp goes red.

## How to add a line (any agent, any machine)

```sh
# usage: works_log <who> <where> <kind> "<what>" [ref]
works_log() {
  f="${WORKS_LEDGER:-games/works/ledger.jsonl}"
  t=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  what=$(printf '%s' "$4" | sed 's/\\/\\\\/g; s/"/\\"/g')
  ref=""; [ -n "$5" ] && ref=",\"ref\":\"$5\""
  printf '{"t":"%s","who":"%s","where":"%s","what":"%s","kind":"%s"%s}\n' "$t" "$1" "$2" "$what" "$3" "$ref" >> "$f"
}
works_log builder:depth workshop:game/bc-depth step "Sticker key: chooser slots done"
works_log town yard test "depth 29/29"   # add suite/status by hand, or use the test form below
```

A test line with its lamp fields, in one go:

```sh
printf '{"t":"%s","who":"town","where":"yard","what":"house 43/43","kind":"test","suite":"house","status":"pass","n":"43/43"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> games/works/ledger.jsonl
```

Then commit and push the ledger on `game/micro-precinct`. The live page reads it from
`https://raw.githubusercontent.com/hrranford-afk/gods-eye-view-patch-town/game/micro-precinct/games/works/ledger.jsonl`
(GitHub caches raw files for about 5 minutes), and falls back to the copy deployed next to the page.

Builders on other branches: append to the copy on `game/micro-precinct` (the foreman can gather lines from builders'
reports), so there is one ledger, not one per branch.

## Later: filling it automatically

Claude Code hooks (`PostToolUse` after a `git commit`, `SubagentStop`, `Stop`) could call `works_log`, and Claude
Code's OpenTelemetry events could be mapped to lines (see `SOURCES.md`). Not switched on: nothing in `.claude/`
settings or hooks was changed for this. Harry decides that.
