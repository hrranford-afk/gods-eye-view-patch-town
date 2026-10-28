#!/usr/bin/env python3
"""ONS small area income estimates (MSOA) → per-neighbourhood income figures.

MSOA names are their LSOAs' names without the last letter ("Worcester 007"
holds "Worcester 007A"…"007F"), so each census neighbourhood takes its
MSOA's figures.

    pip install openpyxl
    python3 scripts/planner-income.py datasetfinal.xlsx public/planner/worcester/census.json public/planner/worcester/income.json
"""
import json
import sys

import openpyxl

SHEETS = {
    "Total annual income": "incomeTotal",
    "Net income after housing costs": "incomeAfterHousing",
}


def table(ws):
    rows = ws.iter_rows(values_only=True)
    for r in rows:
        if r and r[0] == "MSOA code":
            header = list(r)
            break
    else:
        raise SystemExit(f"No header row in {ws.title}")
    value_col = next(i for i, h in enumerate(header) if h and "(£)" in str(h) and "confidence" not in str(h).lower())
    for r in rows:
        if r and r[0]:
            yield r[1], r[value_col]


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    xlsx, census_path, out = sys.argv[1:]
    areas = json.load(open(census_path))["areas"]
    wanted = {a["name"][:-1]: [] for a in areas}
    for a in areas:
        wanted[a["name"][:-1]].append(a["code"])
    wb = openpyxl.load_workbook(xlsx, read_only=True)
    by_area = {}
    for sheet, field in SHEETS.items():
        for msoa_name, value in table(wb[sheet]):
            for code in wanted.get(msoa_name, []):
                by_area.setdefault(code, {"msoa": msoa_name})[field] = value
    json.dump({"source": "ONS income estimates for small areas, FYE 2023 (MSOA; equivalised after housing costs)", "byArea": by_area}, open(out, "w"))
    print(f"[planner-income] {len(by_area)} of {len(areas)} neighbourhoods -> {out}")


if __name__ == "__main__":
    main()
