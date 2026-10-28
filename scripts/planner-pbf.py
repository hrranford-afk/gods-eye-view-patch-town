#!/usr/bin/env python3
"""Cut one planner town out of an OpenStreetMap .osm.pbf extract.

For when the Overpass servers are too busy. Writes Overpass-style JSON
that `npm run planner -- import <town> <file.json>` turns into a town file,
so the same rules in src/planner/osm.js decide what counts as a road,
service or home.

    pip install osmium
    python3 scripts/planner-pbf.py west_midlands.osm.pbf 52.155,-2.285,52.235,-2.155 out.json

The bbox is south,west,north,east, as in src/planner/towns.js.
"""
import json
import re
import sys

import osmium

SHOP = re.compile(r"^(supermarket|convenience|greengrocer|butcher|bakery)$")
HOME = re.compile(r"^(house|residential|apartments|detached|semidetached_house|terrace|bungalow|flats|yes)$")


def wanted_thing(tags):
    """Mirror of the services/homes part of overpassQueries in osm.js."""
    return bool(
        SHOP.match(tags.get("shop", ""))
        or tags.get("amenity") in ("school", "doctors", "clinic")
        or tags.get("healthcare") in ("doctor", "clinic")
    )


class Cutter(osmium.SimpleHandler):
    def __init__(self, bbox):
        super().__init__()
        self.s, self.w, self.n, self.e = bbox
        self.elements = []

    def inside(self, lat, lon):
        return self.s <= lat <= self.n and self.w <= lon <= self.e

    def node(self, n):
        if not n.location.valid() or not self.inside(n.location.lat, n.location.lon):
            return
        tags = dict(n.tags)
        if wanted_thing(tags) or tags.get("highway") == "bus_stop":
            self.elements.append({"type": "node", "id": n.id, "lat": n.location.lat, "lon": n.location.lon, "tags": tags})

    def way(self, w):
        tags = dict(w.tags)
        is_road = "highway" in tags
        is_thing = wanted_thing(tags) or HOME.match(tags.get("building", ""))
        if not (is_road or is_thing):
            return
        pts = [(nd.ref, nd.location) for nd in w.nodes if nd.location.valid()]
        if len(pts) != len(w.nodes) or not any(self.inside(l.lat, l.lon) for _, l in pts):
            return
        if is_road:
            self.elements.append({
                "type": "way", "id": w.id, "tags": tags,
                "nodes": [ref for ref, _ in pts],
                "geometry": [{"lat": l.lat, "lon": l.lon} for _, l in pts],
            })
        else:
            ring = pts[:-1] if len(pts) > 1 and pts[0][0] == pts[-1][0] else pts
            lat = sum(l.lat for _, l in ring) / len(ring)
            lon = sum(l.lon for _, l in ring) / len(ring)
            self.elements.append({"type": "way", "id": w.id, "center": {"lat": lat, "lon": lon}, "tags": tags})


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    pbf, bbox, out = sys.argv[1:]
    cutter = Cutter([float(x) for x in bbox.split(",")])
    cutter.apply_file(pbf, locations=True)
    with open(out, "w") as f:
        json.dump({"elements": cutter.elements}, f)
    print(f"[planner-pbf] {len(cutter.elements)} elements -> {out}")


if __name__ == "__main__":
    main()
