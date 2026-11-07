#!/usr/bin/env python3
"""Robot check for the town view. Run before every merge.

Loads the single-file page in headless Chrome and fails if:
  - the browser console shows any error
  - the page has no jobs, or a job has no works order / status
  - the canvas is blank at any of the checked moments
Saves screenshots to shots/ so a person can look.

Usage: python3 check.py <page.html> [shots_dir] [--chrome /path/to/chrome]
"""
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

page_path = pathlib.Path(sys.argv[1]).resolve()
shots = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else "shots")
shots.mkdir(parents=True, exist_ok=True)
chrome = sys.argv[sys.argv.index("--chrome") + 1] if "--chrome" in sys.argv else None

problems = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=chrome) if chrome else p.chromium.launch()
    for name, size in (("desktop", {"width": 1400, "height": 900}), ("phone", {"width": 390, "height": 844})):
        pg = browser.new_page(viewport=size)
        errors = []
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto(page_path.as_uri())
        pg.wait_for_timeout(500)
        info = pg.evaluate("""() => { const t = window.__town; if (!t) return null; t.pause();
            return { n: t.jobs.length, bad: t.jobs.filter(j => !j.works_order || !j.status).length,
                     t0: t.tStart, t1: t.tEnd,
                     mids: t.jobs.filter(j => j.started && j.t1).slice(0, 3).map(j => j.t1 ? (j.t0 + j.t1) / 2 : j.t0 + 60) }; }""")
        if not info:
            problems.append(f"{name}: page did not start (window.__town missing)")
            continue
        if info["n"] == 0:
            problems.append(f"{name}: no jobs in the data")
        if info["bad"]:
            problems.append(f"{name}: {info['bad']} jobs missing works order or status")
        moments = {"start": info["t0"] + 1, "mid_job": info["mids"][0] if info["mids"] else info["t0"],
                   "end": info["t1"] - 1}
        for label, T in moments.items():
            pg.evaluate(f"window.__town.setTime({T})")
            pg.wait_for_timeout(150)
            blank = pg.evaluate("""() => { const c = document.getElementById('town');
                const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
                let s = new Set(); for (let i = 0; i < d.length; i += 4000) s.add(d[i] + ',' + d[i+1]);
                return s.size < 5; }""")
            if blank:
                problems.append(f"{name}/{label}: canvas looks blank")
            pg.screenshot(path=str(shots / f"{name}_{label}.png"))
        if errors:
            problems.append(f"{name}: console errors: {errors[:3]}")
        pg.close()
    browser.close()

print(json.dumps({"page": str(page_path), "problems": problems, "shots": str(shots)}, indent=1))
sys.exit(1 if problems else 0)
