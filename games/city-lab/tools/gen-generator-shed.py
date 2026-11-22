# Developer tool (not part of the page). Writes recipes/generator_shed.json, the hand-made generator building of C06a, from the detailed shell of
# recipes/power_shed.json (same footprint, same style): brick walls, red door and shutters, a tin roof, an iron engine block on the floor, a second stack on the roof,
# fuel-looking drums and a bench. The kW a generator gives live in the city_infra file, NOT here: this recipe is an ordinary building (its own small control-room draw is
# in systems.power and the district does not count it, because a generator powers itself). Run: python3 -I tools/gen-generator-shed.py   Then: node tools/check-generator-shed.mjs
import json, copy, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
base = json.load(open('recipes/power_shed.json'))
R = copy.deepcopy(base)
R['id'] = 'generator_shed'; R['name'] = 'Generator Shed'
byid = {p['id']: p for p in R['parts']}
for p in R['parts']:
    if p['tag'] in ('wall', 'gable'): p['material'] = 'brick'
    elif p['tag'] == 'roof': p['material'] = 'tin'
    elif p['tag'] in ('door', 'shutter'): p['material'] = 'paint_red'
    elif p['tag'] in ('post', 'beam', 'rafter', 'ridge'): p['material'] = 'wood_dark'
def add(id, kind, pos, size, material, stage, needs, tag, label=None):
    q = {'id': id, 'kind': kind, 'pos': pos, 'size': size, 'material': material, 'stage': stage, 'needs': needs, 'tag': tag, 'replaceable': True}
    if label: q['label'] = label
    R['parts'].append(q); return q
byid['sign']['label'] = 'GEN'; byid['sign']['material'] = 'paint_cream'
# move the shed's own props out of the engine's way
byid['control']['pos'] = [-0.55, 0.05, -0.55]; byid['control']['size'] = [0.7, 0.4, 0.3]
byid['barrel']['pos'] = [0.05, 0.05, -0.6]; byid['barrel']['tag'] = 'drum'; byid['barrel']['material'] = 'iron'
byid['crate.c']['pos'] = [0.74, 0, 1.05]
# the generator itself: an engine block (iron) on a plinth, a flywheel housing, a fuel drum row and an exhaust stack
add('engine', 'oven', [0.45, 0.05, -0.1], [0.6, 0.55, 0.5], 'iron', 'walls', ['floor'], 'engine')
add('drum.a', 'barrel', [0.78, 0.05, -0.6], [0.2, 0.28, 0.2], 'iron', 'walls', ['floor'], 'drum')
add('drum.b', 'barrel', [0.55, 0.05, -0.62], [0.2, 0.28, 0.2], 'wood_dark', 'walls', ['floor'], 'drum')
add('stack', 'chimney', [0.55, 1.3, 0.18], [0.16, 0.5, 0.16], 'iron', 'trim', ['tile.f11', 'tile.f12'], 'chimney')
add('bench', 'shelf', [-0.35, 0.45, -0.72], [0.6, 0.05, 0.2], 'wood', 'walls', ['panel.b0'], 'shelf')
add('sack.a', 'sack', [-0.95, 0.05, 0.15], [0.18, 0.22, 0.14], 'canvas', 'walls', ['floor'], 'sack')
labels = R['systems']['inspect']['labels']
labels.update({'control': 'Control desk', 'meter': 'Output meter', 'cable': 'Output cable', 'engine': 'Engine block', 'drum.a': 'Fuel drum A', 'drum.b': 'Fuel drum B',
               'stack': 'Exhaust stack', 'bench': 'Spares shelf', 'sack.a': 'Sand sack A', 'barrel': 'Oil drum', 'sign': 'Sign'})
Y = R['systems']
Y['power']['demand_kw'] = 0.8   # the control room's own draw; informational only (a generator shed is self-powered in the district)
Y['jobs'][0]['station_part'] = 'control'
json.dump(R, open('recipes/generator_shed.json', 'w'), indent=1)
print('generator_shed', len(R['parts']), 'parts')
