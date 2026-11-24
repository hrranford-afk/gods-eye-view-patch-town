"""CATALOGUE of both kit rounds as one machine-readable file, assets/kit/catalogue.json, so the recipe layer can place pieces by seed.
Reads the GLB files (scene extras, node names) when they exist; kit round two entries that are not built yet fall back to the planned values in PLANNED (flagged "status": "planned").
Run:  python3 kit_catalogue.py [--root DIR]      (DIR = the living-islands folder; default: the folder above this script)
Pure python, no Blender. Deterministic: same files in, same bytes out."""
import os, sys, json, struct, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LODS = ('hero', 'live', 'far')
ISL = ('gneiss', 'sandstone', 'basalt', 'volcanic')
ROLES = ('shelter', 'storage', 'food', 'fire', 'marker', 'wreck', 'garden')
# name: (round, role, island types, rarity 0 common .. 1 rare, one line)
META = {
    'relic_hull': (1, 'wreck', ISL, 0.50, 'half-buried old-world hull, machines that kept working'),
    'lighthouse_stump': (1, 'marker', ('gneiss', 'basalt', 'sandstone'), 0.35, 'collapsed tower base with toppled lantern and lens'),
    'crate_stack': (1, 'storage', ISL, 0.15, 'washed-up crates, a drum, loose slats'),
    'cairn': (1, 'marker', ISL, 0.10, 'stone waymark with a rag on top'),
    'drying_rack': (1, 'food', ('gneiss', 'sandstone', 'basalt'), 0.20, 'fish-drying rack under a canvas cover'),
    'lean_to': (1, 'shelter', ISL, 0.15, 'driftwood and sailcloth shelter with a fire ring'),
    'rain_barrel': (1, 'storage', ('gneiss', 'sandstone'), 0.30, 'cottage wall corner, gutter and rain barrel'),
    'wrecked_jetty': (1, 'wreck', ('gneiss', 'sandstone', 'basalt'), 0.40, 'storm-broken landing stage'),
    'raised_beds': (2, 'garden', ('gneiss', 'sandstone'), 0.30, 'raised beds framed with salvaged boat planks'),
    'seat_garden': (2, 'garden', ('gneiss', 'sandstone', 'basalt'), 0.60, 'old vehicle seats and tubs grown over with plants'),
    'kelp_garden': (2, 'garden', ('gneiss', 'basalt', 'volcanic'), 0.35, 'seaweed drying garden on frames and stones'),
    'fish_hut': (2, 'shelter', ('sandstone', 'gneiss'), 0.60, 'fish-shaped hut of ribs and rusty tin scales with a chimney'),
    'seabird_hut': (2, 'shelter', ('basalt', 'volcanic', 'gneiss'), 0.55, 'stone hut shared with nesting seabirds'),
    'tarp_hut': (2, 'shelter', ISL, 0.25, 'double-layer tarpaulin hut with a swinging door'),
    'campfire_ring': (2, 'fire', ISL, 0.10, 'stone ring, cooking pot on a tripod, log seats'),
    'hearth_ruin': (2, 'fire', ('gneiss', 'sandstone', 'basalt'), 0.45, 'hearth with chimney in a stone ruin'),
}
# kit round two before the files exist: footprint (x, z) metres and node names the build promises
PLANNED = {
    'raised_beds': dict(foot=(4.6, 3.4), nodes=['plank_01', 'plant_01', 'crate_1', 'bucket', 'footprint']),
    'seat_garden': dict(foot=(4.2, 3.4), nodes=['seat_1', 'plant_01', 'crate_1', 'pot', 'footprint']),
    'kelp_garden': dict(foot=(4.4, 3.2), nodes=['plant_01', 'plank_01', 'crate_1', 'footprint']),
    'fish_hut': dict(foot=(5.4, 3.0), nodes=['door', 'chimney', 'plank_01', 'footprint']),
    'seabird_hut': dict(foot=(4.0, 3.4), nodes=['door', 'plank_01', 'footprint']),
    'tarp_hut': dict(foot=(4.4, 3.8), nodes=['door', 'plank_01', 'crate_1', 'footprint']),
    'campfire_ring': dict(foot=(3.8, 3.8), nodes=['pot', 'fire_emitter', 'footprint']),
    'hearth_ruin': dict(foot=(4.6, 3.6), nodes=['pot', 'fire_emitter', 'footprint']),
}


def read_glb(path):
    d = open(path, 'rb').read(); jl = struct.unpack('<I4s', d[12:20])[0]; return json.loads(d[20:20 + jl].decode()), len(d)


def entry(name, root):
    rnd, role, isl, rar, note = META[name]; sub = 'kit' if rnd == 1 else 'kit2'; files = {}; stems = {}; sizes = {}
    for lod in LODS:
        stem = 'kit_%s_%s' % (name, lod); rel = '%s/%s.glb' % (sub, stem); stems[lod] = stem
        if os.path.exists(os.path.join(root, 'assets', rel)): files[lod] = 'assets/' + rel
    e = dict(name=name, round=rnd, role=role, islands=list(isl), rarity=rar, note=note, stems=stems)
    if files.get('hero'):
        js, nb = read_glb(os.path.join(root, files['hero'])); ex = js['scenes'][0]['extras']; poly = ex['footprint_polygon_xz']
        xs = [p[0] for p in poly]; zs = [p[1] for p in poly]; lo = ex['bbox_min']; hi = ex['bbox_max']
        area = 0.5 * abs(sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly))))
        names = [n['name'] for n in js['nodes']]
        e.update(status='built', files=files, bytes={l: os.path.getsize(os.path.join(root, f)) for l, f in files.items()},
                 triangles={l: read_glb(os.path.join(root, f))[0]['scenes'][0]['extras']['triangles'] for l, f in files.items()},
                 footprint_m=dict(x=round(max(xs) - min(xs), 2), z=round(max(zs) - min(zs), 2), area=round(area, 2)), footprint_polygon_xz=poly,
                 size_m=dict(x=round(hi[0] - lo[0], 2), y=round(hi[1] - lo[1], 2), z=round(hi[2] - lo[2], 2)),
                 nodes=names, movable=sorted(ex['movable'].keys()), emitters=[n for n in names if n == 'fire_emitter'])
    else:
        pl = PLANNED[name]; e.update(status='planned', files={}, footprint_m=dict(x=pl['foot'][0], z=pl['foot'][1], area=round(pl['foot'][0] * pl['foot'][1], 2)), nodes=pl['nodes'],
                                     movable=[n for n in pl['nodes'] if n != 'footprint' and n != 'fire_emitter'], emitters=[n for n in pl['nodes'] if n == 'fire_emitter'])
    return e


def build_catalogue(root=ROOT):
    return dict(version=1, frame='glTF: +Y up, metres, y = 0 ground, centred on x = z = 0, front toward +Z; node footprint is the placement polygon',
                roles=list(ROLES), island_types=list(ISL), rarity='0 = common .. 1 = rare', lods=list(LODS), pieces=[entry(n, root) for n in META])


def main(argv=None):
    ap = argparse.ArgumentParser(); ap.add_argument('--root', default=ROOT); a = ap.parse_args(argv)
    cat = build_catalogue(a.root); out = os.path.join(a.root, 'assets', 'kit', 'catalogue.json')
    with open(out, 'w') as f: json.dump(cat, f, indent=1); f.write('\n')
    print('catalogue', out, len(cat['pieces']), 'pieces', sum(1 for p in cat['pieces'] if p['status'] == 'built'), 'built')


if __name__ == '__main__':
    main()
