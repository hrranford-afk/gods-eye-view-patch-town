# level1/drift_table.py -- what the sea brings to the Level 1 table, from the existing globe tools (globe/planet.py, circulation.py, drift.py, arrivals.py).
# The gift planet is seed 1 (as gift/parcels.py). The table is put on an ocean cell near 52 N (the owner's cool wet maritime home), chosen
# deterministically: of the ocean cells between 50 and 54 N the one whose total arrivals per year is the median. The answer is cached in
# level1/drift_table.json (so tests do not rerun the 1500-day drift, about 5 s) and rebuilt when the file is missing.
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
GLOBE = os.path.join(os.path.dirname(HERE), 'globe')
PATH = os.path.join(HERE, 'drift_table.json')
PLANET_SEED = 1


def build():
    sys.path.insert(0, GLOBE)
    import numpy as np
    import arrivals as A
    import planet as PL
    w = A.World(PLANET_SEED)
    cells = []
    for j in range(len(PL.LAT)):
        if 50.0 <= PL.LAT[j] <= 54.0:
            for i in range(len(PL.LON)):
                if w.planet.ocean[j, i]:
                    cells.append((float(PL.LON[i]), float(PL.LAT[j])))
    rows = []
    for lon, lat in cells:
        r = A.arrivals_for_table(w, lon, lat)
        rows.append((r['summary']['per_year_total'], lon, lat, r))
    rows.sort(key=lambda t: (t[0], t[1]))
    tot, lon, lat, r = rows[len(rows) // 2]
    kinds = {}
    for a in r['arrivals']:
        kinds.setdefault(a['kind'], {}).setdefault(a['class'], 0)
        kinds[a['kind']][a['class']] += 1
    years = w.days / 365.0
    out = dict(planet_seed=PLANET_SEED, table=r['table'], per_year=r['per_year'], per_year_total=tot, n_cells_considered=len(cells),
               classes_per_year={k: {c: round(n / years, 3) for c, n in v.items()} for k, v in kinds.items()}, n_sources=r['summary']['n_sources'],
               travel_median_days=r['summary']['travel_median'], strays_per_year=r['per_year']['strays'], table_hash=A.table_hash(r))
    return out


def load():
    if not os.path.exists(PATH):
        json.dump(build(), open(PATH, 'w'), indent=1, sort_keys=True)
    return json.load(open(PATH))


if __name__ == '__main__':
    d = load()
    print(json.dumps({k: d[k] for k in ('table', 'per_year', 'per_year_total', 'n_cells_considered', 'n_sources')}, indent=1)[:900])
