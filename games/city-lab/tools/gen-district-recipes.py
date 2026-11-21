# Developer tool (not part of the page). Writes four hand-detailed neighbourhood recipes from the bakery's own detailed shell
# (recipes/bakery.json): home_cottage, market_hall, workshop, power_shed. Their `systems` data is copied UNCHANGED from the ChatGPT
# recipes the first C03 experiments used (inputs/chatgpt-2026-11-21/recipes/ 04, 03, 05, 10), so the experiment figures do not move:
# only the looks change. Run: python3 -I tools/gen-district-recipes.py   Then: node tools/check-district-recipes.mjs
import json, copy, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
bak = json.load(open('recipes/bakery.json'))
SHELL_TAGS = {'floor', 'post', 'beam', 'wall', 'door', 'window', 'shutter', 'gable', 'rafter', 'roof', 'ridge', 'chimney'}
byid = {p['id']: p for p in bak['parts']}
def shell(wall, roof, door, shutter, trim='wood_dark', floor='wood_pale'):
    out = []
    for p in bak['parts']:
        if p['tag'] not in SHELL_TAGS: continue
        q = copy.deepcopy(p)
        if p['tag'] == 'wall' or p['tag'] == 'gable': q['material'] = wall
        elif p['tag'] == 'roof': q['material'] = roof
        elif p['tag'] == 'door': q['material'] = door
        elif p['tag'] == 'shutter': q['material'] = shutter
        elif p['tag'] in ('post', 'beam', 'rafter', 'ridge'): q['material'] = trim
        elif p['tag'] == 'floor': q['material'] = floor
        out.append(q)
    return out
def prop(src, newid=None, **kw):
    q = copy.deepcopy(byid[src])
    if newid: q['id'] = newid
    for k, v in kw.items(): q[k] = v
    return q
def labels(parts):
    names = {'floor': 'Floor slab', 'post': 'Post', 'beam': 'Beam', 'panel': 'Wall', 'door': 'Door', 'window': 'Window', 'shutter': 'Shutter', 'gable': 'Gable', 'rafter': 'Rafter',
             'roof_tile': 'Roof tile', 'ridge': 'Roof ridge', 'chimney': 'Chimney', 'awning': 'Awning', 'sign': 'Sign', 'crate': 'Crate', 'sack': 'Sack', 'oven': 'Hearth',
             'counter': 'Counter', 'wire': 'Power cable', 'meter_box': 'Meter box', 'barrel': 'Barrel', 'shelf': 'Shelf'}
    out = {}
    for p in parts:
        base = names.get(p['kind'], p['kind'])
        suffix = p['id'].split('.', 1)[1].upper() if '.' in p['id'] else ''
        out[p['id']] = (base + (' ' + suffix if suffix else '')).strip()
    return out
def systems_from(n, parts, over=None):
    s = copy.deepcopy(json.load(open('inputs/chatgpt-2026-11-21/recipes/recipe_%s.json' % n))['systems'])
    s['inspect'] = {'labels': labels(parts)}
    for k, v in (over or {}).items(): s[k] = v
    return s
def finish(id_, name, parts, n):
    return {'schema': 'rtk.building', 'version': 1, 'id': id_, 'name': name, 'footprint': {'w': 2.4, 'd': 1.8}, 'parts': parts, 'systems': systems_from(n, parts)}

# ---- home (cottage): cream walls, red roof, blue door and shutters, hearth, table, woodpile, rain barrel, grain sack
home = shell('paint_cream', 'paint_red', 'paint_blue', 'paint_blue')
home += [prop('oven', 'hearth', tag='hearth'), prop('counter', 'table', tag='table', size=[0.8, 0.35, 0.3]),
         prop('sign', 'sign', label='HOME', pos=[0.62, 0.48, 0.86], needs=['panel.f1'], material='wood_pale'),
         prop('crate.a', 'wood_box', tag='stock', pos=[1.0, 0, 1.05]), prop('crate.b', 'wood_box2', tag='stock', needs=['wood_box'], pos=[1.0, 0.2, 1.05]),
         prop('barrel', 'rain_barrel', pos=[-1.0, 0.05, 1.0], needs=['floor'], tag='barrel'),
         prop('sack.a', 'grain_sack', tag='sack', pos=[0.85, 0.05, -0.55]), prop('sack.b', 'grain_sack2', tag='sack', pos=[0.62, 0.05, -0.6])]
# ---- market hall: pale wood, striped canvas awning, fruit crates, scales counter, sign
market = shell('wood_pale', 'paint_blue', 'paint_red', 'paint_red', trim='wood_dark', floor='wood')
market += [prop('awning', 'awning', variant=2), prop('sign', 'sign', label='MARKET'), prop('counter', 'counter'),
           prop('crate.a', 'fruit_crate', tag='stock'), prop('crate.b', 'fruit_crate2', tag='stock', needs=['fruit_crate']), prop('crate.c', 'fruit_crate3', tag='stock'),
           prop('barrel', 'barrel', tag='barrel'), prop('sack.a', 'sack.a', tag='sack'), prop('sack.b', 'sack.b', tag='sack')]
# ---- workshop: timber walls, tin roof, work bench, tool crate, meter box and cable
work = shell('wood', 'tin', 'paint_red', 'wood_dark', trim='wood_dark', floor='wood')
work += [prop('counter', 'bench', tag='bench', pos=[-0.5, 0.05, -0.5], size=[1.0, 0.4, 0.35]),
         prop('crate.a', 'tool_crate', tag='stock', pos=[0.55, 0.05, 0.0], size=[0.3, 0.25, 0.25], needs=['floor']),
         prop('sign', 'sign', label='WORKS'), prop('meter', 'meter', tag='meter'), prop('wire', 'cable', tag='wire', needs=['meter']),
         prop('barrel', 'barrel', tag='barrel'), prop('crate.c', 'crate.c', tag='stock'), prop('sack.a', 'sack.a', tag='sack', material='wood_pale')]
# ---- power shed: tin walls, dark roof, control desk, meter box and cable
shed = shell('tin', 'wood_dark', 'paint_blue', 'wood_dark', trim='wood_dark', floor='wood_pale')
shed += [prop('counter', 'control', tag='control', pos=[-0.4, 0.05, -0.5], size=[0.9, 0.4, 0.3]),
         prop('meter', 'meter', tag='meter'), prop('wire', 'cable', tag='wire', needs=['meter']),
         prop('sign', 'sign', label='POWER', material='tin'), prop('barrel', 'barrel', tag='barrel'), prop('crate.c', 'crate.c', tag='stock')]
# the sign's `needs` must exist in each recipe; the bakery sign needs the awning, which only the market keeps
def fix_needs(parts):
    ids = {p['id'] for p in parts}
    for p in parts:
        p['needs'] = [n for n in p['needs'] if n in ids]
        if p['kind'] == 'sign' and not p['needs']: p['needs'] = ['panel.f1']
    return parts
for lst in (home, market, work, shed): fix_needs(lst)
# the sign sits on the front wall panel: lift it clear of the awning-less front
for lst in (home, work, shed):
    for p in lst:
        if p['id'] == 'sign': p['pos'] = [0, 0.62, 0.85]; p['size'] = [0.5, 0.2, 0.04]; p['needs'] = ['door']
for fn, rid, name, parts, n in (('home_cottage', 'home_cottage', 'Home Cottage', home, '04'), ('market_hall', 'market_hall', 'Market Hall', market, '03'),
                                ('workshop', 'workshop', 'Workshop', work, '05'), ('power_shed', 'power_shed', 'Power Shed', shed, '10')):
    r = finish(rid, name, parts, n)
    json.dump(r, open('recipes/%s.json' % fn, 'w'), indent=1)
    print(fn, len(parts), 'parts')
