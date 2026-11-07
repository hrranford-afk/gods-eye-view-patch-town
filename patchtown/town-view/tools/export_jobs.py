#!/usr/bin/env python3
"""Turn PatchTown's real job log into the town view's data file.

Reads (read-only):
  offices_isle/builds.jsonl          one line per START / DONE event
  offices_isle/work_receipts/*.json  the receipt each finished job leaves

Writes one JSON file in the shape described in ../CONTRACT.md.
Nothing is invented: a field the logs do not hold is written as null,
and the viewer shows it as UNKNOWN.

Usage:
  python3 export_jobs.py <patchtown_v2 folder> <out.json> [--day YYYY-MM-DD]
"""
import json
import pathlib
import sys
from datetime import datetime, timezone


def load_events(root, day):
    path = root / "offices_isle" / "builds.jsonl"
    events = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue
        if day and not str(e.get("ts", "")).startswith(day):
            continue
        events.append(e)
    events.sort(key=lambda e: e.get("ts", ""))
    return events


def load_receipt(root, wo):
    p = root / "offices_isle" / "work_receipts" / f"{wo}.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except json.JSONDecodeError:
        return None


def build_attempts(root, events):
    """Pair each START with the next DONE for the same works order."""
    open_starts = {}
    attempts = []
    for e in events:
        wo = e.get("wo")
        if not wo:
            continue
        if e.get("event") == "START":
            open_starts[wo] = e
        elif e.get("event") == "DONE":
            start = open_starts.pop(wo, None)
            attempts.append({"wo": wo, "start": start, "done": e})
    # Starts with no DONE yet are jobs still running (or lost).
    for wo, start in open_starts.items():
        attempts.append({"wo": wo, "start": start, "done": None})
    attempts.sort(key=lambda a: (a["start"] or a["done"])["ts"])

    receipts = {}
    jobs = []
    for i, a in enumerate(attempts, 1):
        wo = a["wo"]
        if wo not in receipts:
            receipts[wo] = load_receipt(root, wo)
        r = receipts[wo] or {}
        done = a["done"] or {}
        # The receipt describes the LATEST attempt only, so only trust it
        # for the attempt whose finish time matches the receipt's.
        r_matches = bool(done) and r.get("ts") == done.get("ts")
        tests = r.get("tests") if r_matches else None
        jobs.append({
            "id": f"{wo}#{i}",
            "works_order": wo,
            "worker": (a["start"] or {}).get("owner") or r.get("worker"),
            "machine": r.get("machine"),
            "model": r.get("model"),
            "started": (a["start"] or {}).get("ts"),
            "finished": done.get("ts"),
            "seconds": done.get("seconds"),
            "status": done.get("status") or "RUNNING",
            "files": done.get("files") or [],
            "tests": [
                {"name": t.get("name", "")[:60], "result": t.get("result")}
                for t in (tests or [])
            ] or None,
            "summary": (r.get("summary") or None) if r_matches else None,
            "receipt": f"offices_isle/work_receipts/{wo}.json" if receipts[wo] else None,
        })
    return jobs


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    root = pathlib.Path(sys.argv[1])
    out = pathlib.Path(sys.argv[2])
    day = None
    if "--day" in sys.argv:
        day = sys.argv[sys.argv.index("--day") + 1]
    jobs = build_attempts(root, load_events(root, day))
    data = {
        "made": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "offices_isle/builds.jsonl + offices_isle/work_receipts/",
        "day": day,
        "machines": ["mini", "radeon", "dell", "mill"],
        "jobs": jobs,
    }
    out.write_text(json.dumps(data, indent=1), encoding="utf-8")
    print(f"{len(jobs)} jobs -> {out}")


if __name__ == "__main__":
    main()
