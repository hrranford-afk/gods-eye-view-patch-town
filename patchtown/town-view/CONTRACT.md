# The job contract

One job = one attempt at a works order. The view reads only these fields. `null` means the log does not hold it, and the view shows UNKNOWN.

| Field | Example | From |
|---|---|---|
| `id` | `WO-1112#31` | works order + attempt number |
| `works_order` | `WO-1112` | builds.jsonl `wo` |
| `worker` | `The Dell Builder` | builds.jsonl START `owner` |
| `machine` | `dell` | receipt `machine` (one of mini, radeon, dell, mill) |
| `model` | `devstral:24b` | receipt `model` |
| `started` / `finished` | ISO time, UTC | builds.jsonl START / DONE `ts` |
| `seconds` | `294.9` | builds.jsonl DONE `seconds` |
| `status` | `PASS`, `PARTIAL`, `FAILED`, `RUNNING` | builds.jsonl DONE `status`; no DONE yet = RUNNING |
| `files` | list of paths | builds.jsonl DONE `files` |
| `tests` | `[{name, result: PASS/FAIL/UNTESTED}]` | receipt `tests`, **only for the attempt the receipt belongs to** |
| `summary` | text | receipt `summary`, same rule |
| `receipt` | path | `offices_isle/work_receipts/<wo>.json` |

The top level holds `made`, `source`, `day`, `machines` and `jobs`.
