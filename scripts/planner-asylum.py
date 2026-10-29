#!/usr/bin/env python3
"""Home Office asylum support by local authority (Asy_D11) → asylum.json.

People seeking asylum who are housed or supported by the Home Office,
counted per council each quarter. This is the only official count that
reaches council level; nothing finer is published (and nothing finer
should be mapped). Rates use Census 2021 populations.

    pip install openpyxl
    python3 scripts/planner-asylum.py support-local-authority.xlsx E07000237 103872 public/planner/worcester/asylum.json
"""
import json
import sys
from collections import Counter, defaultdict

import openpyxl

ENGLAND_2021 = 56490048
REGIONS_2021 = {"West Midlands": 5950757}


def main(xlsx, lad, population, out):
    ws = openpyxl.load_workbook(xlsx, read_only=True).worksheets[-1]
    rows = ws.iter_rows(values_only=True)
    for r in rows:
        if r and r[0] == "Date (as at…)":
            break
    town, england, regions = defaultdict(Counter), Counter(), defaultdict(Counter)
    name = region_name = None
    for r in rows:
        date, support, reg, la, code, accommodation, people = r[:7]
        if not isinstance(people, (int, float)):
            continue
        if reg not in ("Scotland", "Wales", "Northern Ireland"):
            england[date] += people
        regions[reg][date] += people
        if code == lad:
            town[date][accommodation] += people
            name, region_name = la, reg
    region_rows = regions[region_name]
    population = int(population)
    quarters = [
        {
            "date": d,
            "people": sum(acc.values()),
            "byAccommodation": dict(acc),
            "per1000": round(sum(acc.values()) / population * 1000, 2),
            "englandPer1000": round(england[d] / ENGLAND_2021 * 1000, 2),
            "regionPer1000": round(region_rows[d] / REGIONS_2021[region_name] * 1000, 2) if region_name in REGIONS_2021 else None,
        }
        for d, acc in town.items()
    ]
    json.dump({
        "source": "Home Office, Immigration System Statistics Asy_D11 (asylum seekers in receipt of support by local authority); rates per 1,000 Census 2021 residents",
        "licence": "OGL",
        "level": "council only: no finer data is published",
        "council": name, "ladCode": lad, "region": region_name, "population2021": population,
        "quarters": quarters,
    }, open(out, "w"), indent=1)
    last = quarters[-1]
    print(f"{name}: {last['people']} people supported on {last['date']} ({last['per1000']} per 1,000; England {last['englandPer1000']}) → {out}")


if __name__ == "__main__":
    main(*sys.argv[1:])
