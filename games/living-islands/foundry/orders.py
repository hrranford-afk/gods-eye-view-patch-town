"""foundry/orders.py -- render orders for the top 24, as DATA ONLY (foundry/render_orders.json). Nothing here runs Blender or touches hardware.

Blender's landform scene builds the world at n=513 (1 m cells), but the sweep ran at n=257, and island numbering and fine shore detail can differ,
so for the 24 shortlisted worlds only the world is rebuilt at n=513 (cached under .cache/orders/, keyed by manifest hash), the start island is
re-chosen with the same rule, and the camera presets come from landform.island_camera on THAT world. Each order lists
  - the start island id (n=513), whether it matches the sweep's pick, and what blender/batch.py's own choose_island rule would pick,
  - camera presets (island_camera: from the south, and from the side of the start landing),
  - the Blender command shapes: via blender/batch.py (--phases landform --lf-provinces P --lf-samples N --hero-w/--hero-h) and the direct
    landform_scene.py call with --island forced (use that one when batch would pick another island).
hero = 1200x800 at 100 samples; hires = 2400x1600 at 256 samples for the overall top 6."""
import json
import math
import multiprocessing as mp
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
HERO = dict(w=1200, h=800, samples=100)
HIRES = dict(w=2400, h=1600, samples=256)
N_ORDER = 513


def _compute(args):
    man, snapdir = args
    import sweep
    mods = sweep.load_mods(snapdir)
    W, M = mods['W'], mods['M']
    t0 = time.perf_counter()
    w = W.make_world(man['seed'], man['province'], size_m=man['size_m'], n=man['n'])
    room = M._room(W, w)
    best, rows = M.start_island(W, w, room)
    pick = None                                         # what blender/landform_scene.choose_island would return (same rule, copied)
    for isl in w.islands:
        if isl['area_m2'] < 1500.0 or max(M.island_extent(w, isl['id'])) > 200.0 or M.touches_edge(w, isl['id']):
            continue
        L = M.pick_landing(W, w, isl['id'], room)
        if L is not None and L['score'] >= 0.85:
            pick = isl['id']
            break
    rec = dict(manifest=man, start_island=None, start_ok=False, batch_would_pick=pick, seconds=round(time.perf_counter() - t0, 2))
    if best is not None:
        iid, L = best['island'], best['landing']
        isl = w.islands[iid - 1]
        rec.update(start_island=iid, start_ok=bool(best['ok']), start_failed=best['failed'], extent_m=round(best['extent_m'], 1),
                   area_m2=round(isl['area_m2'], 1), centroid=[round(v, 1) for v in isl['centroid']], max_height_m=round(isl['max_height_m'], 2),
                   landing=None if L is None else dict(xy=[round(v, 1) for v in L['xy']], kind=L['kind'], score=round(L['score'], 3),
                                                       exposure=round(L['exposure'], 3), source=L['source']))
        bearing = 180.0
        if L is not None:
            bearing = math.degrees(math.atan2(L['normal'][0], L['normal'][1])) % 360.0     # compass bearing of the seaward normal
        cams = {}
        for name, az in (('south', 180.0), ('landing_side', bearing)):
            c = W.island_camera(w, iid, 50.0, az, 38.0)
            cams[name] = dict(position=[round(v, 1) for v in c['position']], target=[round(v, 1) for v in c['target']], lens_mm=50.0,
                              azimuth_deg=round(az, 1), elevation_deg=38.0, distance_m=round(c['distance_m'], 1), footprint_radius_m=round(c['footprint_radius_m'], 1))
        rec['cameras'] = cams
    return rec


def _cmd_batch(prov, seeds, spec, tag):
    return ('python3 blender/batch.py --blender $BLENDER --seeds %s --out $OUT/%s --phases landform --lf-provinces %s --lf-samples %d '
            '--hero-w %d --hero-h %d --device CPU') % (','.join(str(s) for s in seeds), tag, prov, spec['samples'], spec['w'], spec['h'])


def _cmd_direct(prov, seed, island, spec, tag):
    return ('$BLENDER -b --python blender/landform_scene.py -- --province %s --seed %d --island %d --view hero --w %d --h %d --samples %d '
            '--out $OUT/%s/landform_hero_%s_seed%d.png') % (prov, seed, island, spec['w'], spec['h'], spec['samples'], tag, prov, seed)


def make_orders(seeds_dir, workers=2, out_path=None):
    import sweep
    sl = json.load(open(os.path.join(seeds_dir, 'shortlist.json')))
    cat = sweep.load_catalogue(os.path.join(seeds_dir, 'catalogue.json'))
    snap = sweep.catalogue_snapshot()
    mh = sweep.metrics_hash()
    top = sl['top24']
    spare = [e for p in sorted(sl['by_province']) for e in sl['by_province'][p][8:]]       # ranks 9-12 per province: replacements, also checked at n=513
    todo, recs = [], {}
    for e in top + spare:
        man = sweep.manifest(e['province'], e['seed'], cat['run']['size_m'], N_ORDER, snap, mh, patch={'orders': 1})
        os.makedirs(os.path.join(sweep.CACHE, 'orders'), exist_ok=True)
        p = os.path.join(sweep.CACHE, 'orders', man['hash'] + '.json')
        if os.path.exists(p):
            recs[(e['province'], e['seed'])] = json.load(open(p))
        else:
            todo.append((man, snap['dir']))
    if todo:
        if workers > 1:
            with mp.get_context('fork').Pool(workers) as pool:
                res = pool.map(_compute, todo, chunksize=1)
        else:
            res = [_compute(t) for t in todo]
        for (man, _), r in zip(todo, res):
            with open(os.path.join(sweep.CACHE, 'orders', man['hash'] + '.json'), 'w') as f:
                json.dump(r, f)
            recs[(man['province'], man['seed'])] = r
    orders = []
    for e in top:
        r = recs[(e['province'], e['seed'])]
        iid = r['start_island']
        o = dict(overall_rank=e['overall_rank'], province=e['province'], seed=e['seed'], score=e['score'], manifest_hash_n257=e['hash'],
                 manifest_hash_n513=r['manifest']['hash'], world_py_hash=snap['world_hash'], start_island_n257=e['start_island'], start_island_n513=iid,
                 start_ok_n513=r['start_ok'], start_failed_n513=r.get('start_failed', []), batch_would_pick=r['batch_would_pick'],
                 island_changed_between_grids=(iid != e['start_island']), force_island_needed=(iid is not None and iid != r['batch_would_pick']),
                 extent_m=r.get('extent_m'), landing=r.get('landing'), cameras=r.get('cameras'), jobs=[])
        if iid:
            o['jobs'].append(dict(id='hero_%s_%d' % (e['province'], e['seed']), spec=dict(HERO), via_batch=_cmd_batch(e['province'], [e['seed']], HERO, 'hero'),
                                  direct=_cmd_direct(e['province'], e['seed'], iid, HERO, 'hero')))
            if e['overall_rank'] <= 6:
                o['jobs'].append(dict(id='hires_%s_%d' % (e['province'], e['seed']), spec=dict(HIRES), via_batch=_cmd_batch(e['province'], [e['seed']], HIRES, 'hires'),
                                      direct=_cmd_direct(e['province'], e['seed'], iid, HIRES, 'hires')))
        orders.append(o)
    replacements = []
    for e in spare:
        r = recs[(e['province'], e['seed'])]
        if r['start_ok']:
            replacements.append(dict(province=e['province'], seed=e['seed'], rank_in_province=e['rank'], score=e['score'], start_island_n513=r['start_island'],
                                     manifest_hash_n513=r['manifest']['hash']))
    for o in orders:
        o['replace_with'] = None if o['start_ok_n513'] else next((x for x in replacements if x['province'] == o['province']), None)
        if o['replace_with']:
            replacements.remove(o['replace_with'])
    groups = {}
    for o in orders:
        groups.setdefault(o['province'], []).append(o['seed'])
    doc = dict(note='DATA ONLY. Nothing was run. $BLENDER = a Blender 3.6+ executable, $OUT = an output folder. batch.py phase "landform" picks the island itself '
                    '(choose_island); the sweep ran at n=257 and the render builds n=513, whose worlds differ in detail: where start_ok_n513 is false the order has replace_with (the next shortlisted world that still has a start island at n=513; its commands are the same shape). Where force_island_needed is true use the direct command. batch.py runs jobs one at a time; heroes are about 4.5 min each on 4 CPU cores '
                    '(LANDFORM.md, 64 samples), so 100 samples is about 6 min and 256 samples about 15 min on that machine (estimates, not measured here).',
               n_world_for_render=N_ORDER, hero=HERO, hires=HIRES, world_py_hash=snap['world_hash'],
               replacements_unused=replacements, batch_groups_hero={p: _cmd_batch(p, s, HERO, 'hero') for p, s in groups.items()},
               orders=orders)
    out_path = out_path or os.path.join(HERE, 'render_orders.json')
    with open(out_path, 'w') as f:
        json.dump(doc, f, indent=1)
    return dict(path=out_path, orders=len(orders), hires=sum(1 for o in orders if any(j['id'].startswith('hires') for j in o['jobs'])),
                island_changed=sum(1 for o in orders if o['island_changed_between_grids']), force_needed=sum(1 for o in orders if o['force_island_needed']),
                no_start_at_513=sum(1 for o in orders if not o['start_ok_n513']), replaced=sum(1 for o in orders if o.get('replace_with')), bytes=os.path.getsize(out_path))


if __name__ == '__main__':
    print(json.dumps(make_orders(os.path.join(HERE, 'seeds'))))
