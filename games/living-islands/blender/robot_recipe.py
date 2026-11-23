"""ROBOT RECIPES for the collector family: the same idea as the island recipe layer (blender/recipe.py). Pure python, no numpy, no Blender.
    robot_recipe_for(seed) -> a plain dict (JSON-able) that says what one machine is made of, chosen BEFORE anything is built, from the seed alone.
    robot_recipe_for(1) is the committed v2 tortoise (collector_model.py defaults): the legacy cross-check, a test builds it and compares it with assets/collector/collector_hero.glb.
    write_recipe(rec, path), summary(rec), name_of(rec).
What is chosen (numbers in ROBOT_RECIPES.md): a role (cleaner, scout, hauler, sorter, maintainer, planter), the body plan (overall size, shell dome height, size and shape, the number of
visible shell plates and the tilt of the halves, chassis length and width, track length and width or wide wheels, head size and shape, visor style, arm length, joint count, gripper, hopper size and lid style),
a muted invented paint palette, the wear (age in years, salt, rust, chips), the lamp colour code, 0 to 3 quirks, the repurposed modules (grow light, compost tray, seedling bed) and one part that goes with the job (floppy ears, push blade, sorting bins, tool rack).
Rails (STORY_BRIEF, COLLECTOR_QUIRKS_BRIEF): hopeful, nothing gory, no brands, no legible writing, no real places; the machines are hard-coded and have no speech or feelings, so nothing here is a mood or a name.
The build is blender/robot_build.py (it imports the part functions of collector_model.py); the batch driver is blender/robot_batch.py."""
import json
import random

VERSION = 1
LEGACY_SEED = 1
ROLES = ('cleaner', 'scout', 'hauler', 'sorter', 'maintainer', 'planter')
ROLE_NAMES = {'cleaner': 'tortoise cleaner', 'scout': 'terrier scout', 'hauler': 'wheelbarrow hauler', 'sorter': 'beetle sorter', 'maintainer': 'maintenance robot', 'planter': 'repurposed planter'}
CONCEPT = {'cleaner': 'A', 'scout': 'B', 'hauler': 'C', 'sorter': 'D', 'maintainer': 'repair machine', 'planter': 'repurposed collector'}
DRIVES = ('tracks', 'wheels')
GRIPPERS = ('pinch', 'wide_pad', 'scoop', 'brush')
VISORS = ('band', 'twin', 'trio', 'slit', 'tall')
HEAD_SHAPES = {'pod': (0.60, 0.62), 'block': (0.32, 0.34), 'egg': (0.85, 0.92)}        # superellipsoid exponents of the head pod
LID_STYLES = ('flat', 'domed', 'slatted', 'grille', 'none')
MODULES = ('seedbed', 'grow_light', 'compost_tray')
PART_OF_ROLE = {'scout': 'ears', 'hauler': 'blade', 'sorter': 'side_bins', 'maintainer': 'tool_rack'}      # a part that goes with the job (not a quirk): floppy ears, a push blade, sorting bins, a tool rack
PARTS = tuple(PART_OF_ROLE.values())
SHELL_FINISH = ('solar', 'painted')
QUIRK_NAMES = ('patch', 'mirror', 'trinket', 'panel', 'tape', 'antenna', 'extra_shell', 'plant_pot')       # the four slots of collector_model.py plus four new ones
QUIRK_NODES = {q: 'quirk_' + q for q in QUIRK_NAMES}
QUIRK_NOTES = {   # node -> (parent, category, note); the first four are the committed slots
    'quirk_patch': ('hopper', 'repair', 'a riveted repair plate in the wrong colour with sealant and crossed tape on the right wall of the bin'),
    'quirk_mirror': ('head', 'accessory', 'a small mirror taped to a bent wire on the head, turned to see behind'),
    'quirk_trinket': ('hopper_lid', 'keepsake', 'a blue glass bead and a pale spiral shell tied to the lid and kept there'),
    'quirk_panel': ('hopper', 'damage', 'a cover panel hanging by one top bolt, leaning out from the left wall of the bin'),
    'quirk_tape': ('collector', 'repair', 'two crossed strips of cloth tape over a crack in the front plate, one end curling loose'),
    'quirk_antenna': ('collector', 'accessory', 'a thin antenna bent over at a kink, taped at the bend, with a small bead at the tip'),
    'quirk_extra_shell': ('hopper', 'keepsake', 'a spare solar shell half strapped upright to the back of the bin with twine'),
    'quirk_plant_pot': ('hopper_lid', 'keepsake', 'a small clay-coloured pot with a green sprout, wedged on the lid and kept there'),
}
QUIRK_CATEGORY = {q: v[1] for q, v in QUIRK_NOTES.items()}
FORBIDDEN_WORDS = ('gore', 'blood', 'corpse', 'dead body', 'skeleton', 'skull', 'murder', 'brand', 'logo')

# ----------------------------------------------------------------------------------------------- invented muted palettes (linear rgb): paint (shell, head), paint2 (tub, bin), arm (accent), patch (the wrong-colour repair), patch2 (second repair)
PALETTES = {
    'sage': dict(paint=(0.112, 0.150, 0.100), paint2=(0.092, 0.128, 0.088), arm=(0.62, 0.34, 0.07), patch=(0.50, 0.27, 0.06), patch2=(0.14, 0.20, 0.25)),            # the committed collector
    'dune_ochre': dict(paint=(0.30, 0.20, 0.070), paint2=(0.24, 0.160, 0.060), arm=(0.10, 0.22, 0.24), patch=(0.18, 0.25, 0.14), patch2=(0.35, 0.12, 0.07)),
    'brick_dust': dict(paint=(0.27, 0.095, 0.060), paint2=(0.21, 0.080, 0.050), arm=(0.42, 0.36, 0.20), patch=(0.12, 0.22, 0.30), patch2=(0.20, 0.30, 0.20)),
    'slate_sea': dict(paint=(0.060, 0.110, 0.190), paint2=(0.045, 0.090, 0.160), arm=(0.55, 0.30, 0.08), patch=(0.40, 0.34, 0.14), patch2=(0.35, 0.12, 0.10)),
    'plum_dusk': dict(paint=(0.130, 0.055, 0.110), paint2=(0.100, 0.045, 0.090), arm=(0.50, 0.40, 0.12), patch=(0.10, 0.24, 0.22), patch2=(0.42, 0.20, 0.10)),
    'cream_salt': dict(paint=(0.46, 0.42, 0.320), paint2=(0.37, 0.33, 0.250), arm=(0.12, 0.28, 0.30), patch=(0.45, 0.15, 0.08), patch2=(0.15, 0.20, 0.28)),
    'teal_moss': dict(paint=(0.035, 0.180, 0.160), paint2=(0.028, 0.140, 0.130), arm=(0.58, 0.40, 0.10), patch=(0.40, 0.12, 0.15), patch2=(0.20, 0.30, 0.10)),
    'tin_grey': dict(paint=(0.20, 0.205, 0.205), paint2=(0.15, 0.160, 0.165), arm=(0.55, 0.14, 0.07), patch=(0.14, 0.22, 0.12), patch2=(0.45, 0.35, 0.10)),
    'mustard_clay': dict(paint=(0.44, 0.29, 0.040), paint2=(0.33, 0.21, 0.035), arm=(0.07, 0.15, 0.20), patch=(0.30, 0.10, 0.07), patch2=(0.12, 0.22, 0.14)),
    'rose_lichen': dict(paint=(0.32, 0.14, 0.12), paint2=(0.25, 0.11, 0.095), arm=(0.14, 0.30, 0.20), patch=(0.40, 0.34, 0.16), patch2=(0.12, 0.16, 0.30)),
    'harbour_navy': dict(paint=(0.030, 0.050, 0.110), paint2=(0.024, 0.040, 0.090), arm=(0.60, 0.50, 0.14), patch=(0.30, 0.09, 0.07), patch2=(0.15, 0.28, 0.22)),
}
PALETTE_BY_ROLE = {   # role -> weights over PALETTES (a family look, not a rule: every palette can occur on every role)
    'cleaner': {'sage': 1.5, 'teal_moss': 2, 'slate_sea': 1.5, 'dune_ochre': 1, 'tin_grey': 1.5, 'harbour_navy': 1},
    'scout': {'mustard_clay': 2, 'brick_dust': 2, 'rose_lichen': 2, 'dune_ochre': 1.5, 'cream_salt': 1.5, 'teal_moss': 1, 'slate_sea': 1},
    'hauler': {'brick_dust': 2, 'tin_grey': 2, 'mustard_clay': 2, 'harbour_navy': 2, 'cream_salt': 1},
    'sorter': {'slate_sea': 2, 'plum_dusk': 3, 'harbour_navy': 2, 'teal_moss': 1, 'rose_lichen': 1},
    'maintainer': {'cream_salt': 2, 'tin_grey': 2, 'dune_ochre': 2, 'mustard_clay': 2, 'rose_lichen': 1},
    'planter': {'teal_moss': 2, 'cream_salt': 2, 'sage': 1, 'rose_lichen': 2, 'dune_ochre': 1, 'plum_dusk': 1, 'brick_dust': 1},
}
# the lamp code: three colours (linear rgb) for search, found and low charge; the patterns and strengths stay those of collector_model.LAMP_CODE
LAMP_CODES = {
    'amber_green': dict(search=(1.0, 0.62, 0.08), found=(0.30, 0.95, 0.32), low_charge=(1.0, 0.45, 0.04)),        # the committed collector
    'amber_pale': dict(search=(1.0, 0.62, 0.08), found=(0.75, 0.90, 1.0), low_charge=(1.0, 0.40, 0.04)),
    'orange_teal': dict(search=(1.0, 0.36, 0.05), found=(0.10, 0.90, 0.70), low_charge=(0.80, 0.25, 0.03)),
    'yellow_blue': dict(search=(1.0, 0.85, 0.10), found=(0.20, 0.50, 1.0), low_charge=(0.85, 0.62, 0.05)),
    'lime_gold': dict(search=(0.70, 1.0, 0.10), found=(1.0, 0.80, 0.20), low_charge=(0.45, 0.70, 0.05)),
    'rose_amber': dict(search=(1.0, 0.45, 0.30), found=(0.55, 1.0, 0.55), low_charge=(0.90, 0.30, 0.15)),
}

# ----------------------------------------------------------------------------------------------- role templates (TUNING; every value is a range or a list of choices)
TPL = {
    'cleaner': dict(p_cells=1.0, p_part=0.0, scale=(0.95, 1.05), wid=(0.94, 1.08), dome=(0.33, 0.41), tilt=(0.0, 7.0), split=[2, 2, 2, 4], p_tracks=0.9, track_axle=(0.50, 0.60), track_w=(0.12, 0.15), head=(0.95, 1.18), visor=['band', 'band', 'trio'],
                    arm1=(0.28, 0.32), joints=[3, 3, 3, 2], gripper=['pinch', 'pinch', 'wide_pad'], hop_x0=(-0.58, -0.54), hop_z1=(0.38, 0.42), lid=['flat', 'domed', 'flat'], age=(8, 30), nq=[0, 1, 1, 2, 2, 3]),
    'scout': dict(p_cells=0.5, p_part=0.9, scale=(0.76, 0.88), wid=(0.80, 0.95), dome=(0.20, 0.28), tilt=(0.0, 5.0), split=[1, 2, 2], p_tracks=0.45, track_axle=(0.52, 0.62), track_w=(0.10, 0.13), head=(1.18, 1.45), visor=['tall', 'twin', 'slit'],
                  arm1=(0.20, 0.25), joints=[3, 2, 3], gripper=['pinch', 'wide_pad'], hop_x0=(-0.50, -0.47), hop_z1=(0.31, 0.35), lid=['flat', 'flat', 'slatted'], age=(4, 14), nq=[0, 1, 1, 2, 3]),
    'hauler': dict(p_cells=0.4, p_part=0.9, scale=(1.04, 1.14), wid=(1.08, 1.25), dome=(0.15, 0.23), tilt=(0.0, 4.0), split=[1, 2, 4], p_tracks=0.8, track_axle=(0.52, 0.62), track_w=(0.15, 0.18), head=(0.78, 0.92), visor=['slit', 'band', 'slit'],
                   arm1=(0.20, 0.26), joints=[2, 2, 3], gripper=['wide_pad', 'wide_pad', 'pinch'], hop_x0=(-0.82, -0.72), hop_z1=(0.46, 0.52), lid=['none', 'slatted', 'none', 'grille'], age=(12, 38), nq=[0, 1, 1, 2, 2]),
    'sorter': dict(p_cells=0.9, p_part=0.85, scale=(0.92, 1.04), wid=(0.98, 1.12), dome=(0.42, 0.50), tilt=(6.0, 16.0), split=[2, 4, 4], p_tracks=0.85, track_axle=(0.40, 0.50), track_w=(0.14, 0.17), head=(0.95, 1.12), visor=['twin', 'trio', 'twin'],
                   arm1=(0.32, 0.38), joints=[4, 4, 3], gripper=['brush', 'pinch', 'brush'], hop_x0=(-0.60, -0.56), hop_z1=(0.38, 0.44), lid=['grille', 'slatted', 'grille'], age=(10, 30), nq=[0, 1, 2, 2, 3]),
    'maintainer': dict(p_cells=0.65, p_part=0.85, scale=(0.98, 1.08), wid=(0.94, 1.10), dome=(0.25, 0.33), tilt=(0.0, 10.0), split=[2, 4], p_tracks=0.6, track_axle=(0.46, 0.58), track_w=(0.12, 0.16), head=(0.92, 1.08), visor=['slit', 'trio', 'band'],
                       arm1=(0.33, 0.38), joints=[4, 4, 3], gripper=['pinch', 'scoop', 'wide_pad'], hop_x0=(-0.58, -0.54), hop_z1=(0.36, 0.42), lid=['domed', 'flat', 'slatted'], age=(20, 45), nq=[1, 2, 2, 3, 3]),
    'planter': dict(p_cells=1.0, p_part=0.0, scale=(0.90, 1.00), wid=(0.96, 1.10), dome=(0.14, 0.20), tilt=(12.0, 22.0), split=[2, 2], p_tracks=0.5, track_axle=(0.48, 0.58), track_w=(0.12, 0.15), head=(0.92, 1.08), visor=['band', 'twin'],
                    arm1=(0.28, 0.34), joints=[3, 3, 4], gripper=['scoop', 'scoop', 'pinch'], hop_x0=(-0.64, -0.60), hop_z1=(0.34, 0.40), lid=['none'], age=(6, 25), nq=[0, 1, 1, 2]),
}
ROLE_QUIRK_BIAS = {   # role -> weights over QUIRK_NAMES (patch, mirror, trinket, panel, tape, antenna, extra_shell, plant_pot)
    'cleaner': (2, 1, 2, 1, 2, 1, 1, 1), 'scout': (1, 3, 1, 1, 1, 3, 0.5, 1), 'hauler': (2, 1, 1, 3, 2, 1, 2, 0.5), 'sorter': (1, 2, 2, 1, 1, 2, 1, 1),
    'maintainer': (3, 1, 1, 2, 3, 2, 2, 1), 'planter': (1, 1, 1, 1, 1, 1, 1, 3),
}


def _r(x, n=4):
    return round(float(x), n)


def _lin(rgb):
    return [_r(c) for c in rgb]


def legacy_recipe():
    """seed 1: the committed v2 tortoise. Every number is the default of collector_model.py, so a build with these values is the committed hero byte for byte."""
    pal = PALETTES['sage']; lc = LAMP_CODES['amber_green']
    return dict(version=VERSION, seed=LEGACY_SEED, legacy=True, role='cleaner', name=ROLE_NAMES['cleaner'], concept=CONCEPT['cleaner'],
                body=dict(scale=1.0, length_f=1.0, width_f=1.0,
                          shell=dict(dome_h=0.38, half_length=0.34, half_width=0.31, shape_e2=0.9, split_count=2, slot_half=0.045, tilt_l_deg=0.0, tilt_r_deg=0.0, finish='solar'),
                          chassis=dict(length_f=1.0, width_f=1.0, note='the tub itself is fixed; length and width are stretches of the whole machine'),
                          drive=dict(type='tracks', track_axle_m=0.545, track_width=0.13, track_y=0.25, wheels_per_side=2, wheel_radius=0.125),
                          head=dict(scale=[1.0, 1.0, 1.0], shape='pod', e1=0.60, e2=0.62, roll_deg=0.0, visor='band'),
                          arm=dict(upper_m=0.30, fore_m=0.28, joints=3, gripper='pinch'),
                          hopper=dict(x0=-0.55, x1=-0.385, width=0.38, z0=0.15, z1=0.40, lid='flat', lid_prop_deg=0.0)),
                paint=dict(palette='sage', **{k: _lin(v) for k, v in pal.items()}),
                wear=dict(age_years=14, age_f=1.0, salt=1.0, rust=1.0, chips=1.0),
                lamp=dict(code='amber_green', **{k: _lin(v) for k, v in lc.items()}),
                quirks=['patch', 'mirror', 'trinket', 'panel'], modules=[], parts=[])


def robot_recipe_for(seed):
    """the recipe of a seed: plain values only. Deterministic: the same seed gives the same recipe on every machine (python's random.Random seeded from the seed)."""
    seed = int(seed)
    if seed == LEGACY_SEED:
        return legacy_recipe()
    rng = random.Random('robot-recipe-%d-%d' % (VERSION, seed))
    u = lambda lo, hi: rng.uniform(lo, hi)
    pick = lambda items: items[rng.randrange(len(items))]
    wpick = lambda d: rng.choices(list(d.keys()), weights=list(d.values()), k=1)[0]
    role = ROLES[rng.randrange(len(ROLES))]
    t = TPL[role]
    # body plan
    scale = u(*t['scale']); wid = u(*t['wid']); lenf = u(0.95, 1.08)
    split = pick(t['split']); dome = u(*t['dome']); half_len = u(0.30, 0.35); half_wid = u(0.28, 0.33); e2 = u(0.82, 1.12)
    slot = 0.004 if split == 1 else u(0.040, 0.078)
    tilt_l = u(*t['tilt']); tilt_r = max(0.0, tilt_l + u(-3.0, 3.0))
    finish = 'solar' if rng.random() < t['p_cells'] else 'painted'
    drive = 'tracks' if rng.random() < t['p_tracks'] else 'wheels'
    axle = u(*t['track_axle']); tw = u(*t['track_w']); wheels_n = pick([2, 2, 3]); wheel_r = u(0.115, 0.135)
    hs = u(*t['head']); head_scale = [_r(hs * u(0.92, 1.08)), _r(hs * u(0.86, 1.12)), _r(hs * u(0.92, 1.08))]
    shape = pick(list(HEAD_SHAPES)); roll = u(-8.0, 8.0); visor = pick(t['visor'])
    l1 = u(*t['arm1']); l2 = l1 * u(0.84, 1.0)
    joints = pick(t['joints']); grip = pick(t['gripper'])
    x0 = u(*t['hop_x0']); z1 = u(*t['hop_z1']); hw = u(0.34, 0.38); lid = pick(t['lid']); prop = pick([0.0, 0.0, 8.0, 16.0, 26.0]) if lid not in ('none',) else 0.0
    # paint, wear, lamp
    pal = wpick(PALETTE_BY_ROLE[role]); lamp = wpick({k: (3 if k == 'amber_green' else 1.5) for k in LAMP_CODES})
    age = u(*t['age']); salt = u(0.35, 1.7); rust = u(0.35, 1.8); chips = u(0.45, 1.8)
    age_f = min(2.0, 0.4 + 0.6 * (age / 14.0))
    # modules: the planter grows things; others now and then carry a compost tray; the sorter sometimes has a seedling bed in its bin
    modules = []
    if role == 'planter': modules = ['seedbed', 'grow_light']
    elif rng.random() < (0.28 if role == 'sorter' else 0.10): modules = ['compost_tray']
    elif rng.random() < 0.05: modules = ['seedbed', 'grow_light']
    if 'seedbed' in modules or role == 'planter': lid = 'none'; prop = 0.0
    # quirks: 0 to 3 from the eight slots, weighted by role; parts that need the lid are not chosen when there is none
    nq = pick(t['nq']); w = dict(zip(QUIRK_NAMES, ROLE_QUIRK_BIAS[role])); quirks = []
    for _ in range(nq):
        for q in list(w):
            if q in quirks or (lid == 'none' and q in ('trinket', 'plant_pot')) or ('seedbed' in modules and q == 'plant_pot'): w[q] = 0
        tot = sum(w.values())
        if tot <= 0: break
        q = wpick({k: v for k, v in w.items() if v > 0}); quirks.append(q); w[q] = 0
    quirks = [q for q in QUIRK_NAMES if q in quirks]
    parts = [PART_OF_ROLE[role]] if (role in PART_OF_ROLE and rng.random() < t['p_part']) else []
    return dict(version=VERSION, seed=seed, legacy=False, role=role, name=ROLE_NAMES[role], concept=CONCEPT[role],
                body=dict(scale=_r(scale), length_f=_r(lenf), width_f=_r(wid),
                          shell=dict(dome_h=_r(dome), half_length=_r(half_len), half_width=_r(half_wid), shape_e2=_r(e2), split_count=int(split), slot_half=_r(slot), tilt_l_deg=_r(tilt_l, 2), tilt_r_deg=_r(tilt_r, 2), finish=finish),
                          chassis=dict(length_f=_r(lenf), width_f=_r(wid), note='the tub itself is fixed; length and width are stretches of the whole machine'),
                          drive=dict(type=drive, track_axle_m=_r(axle), track_width=_r(tw), track_y=_r(0.25 + (tw - 0.13) / 2.0), wheels_per_side=int(wheels_n), wheel_radius=_r(wheel_r)),
                          head=dict(scale=head_scale, shape=shape, e1=HEAD_SHAPES[shape][0], e2=HEAD_SHAPES[shape][1], roll_deg=_r(roll, 2), visor=visor),
                          arm=dict(upper_m=_r(l1), fore_m=_r(l2), joints=int(joints), gripper=grip),
                          hopper=dict(x0=_r(x0), x1=-0.385, width=_r(hw), z0=0.15, z1=_r(z1), lid=lid, lid_prop_deg=_r(prop, 1))),
                paint=dict(palette=pal, **{k: _lin(v) for k, v in PALETTES[pal].items()}),
                wear=dict(age_years=_r(age, 1), age_f=_r(age_f), salt=_r(salt), rust=_r(rust), chips=_r(chips)),
                lamp=dict(code=lamp, **{k: _lin(v) for k, v in LAMP_CODES[lamp].items()}),
                quirks=quirks, modules=modules, parts=parts)


def name_of(rec):
    return '%s (seed %d)' % (rec['name'], rec['seed'])


def summary(rec):
    b = rec['body']
    return '%s: %s, %s, shell %.2f m high in %d plate(s), head %s %s, arm %.2f/%.2f m %d joints %s, bin %s lid, %s, wear %.0f y, lamp %s, quirks %s, modules %s' % (
        name_of(rec), b['drive']['type'], 'x%.2f' % b['scale'], b['shell']['dome_h'], b['shell']['split_count'], b['head']['shape'], b['head']['visor'], b['arm']['upper_m'], b['arm']['fore_m'],
        b['arm']['joints'], b['arm']['gripper'], b['hopper']['lid'], rec['paint']['palette'], rec['wear']['age_years'], rec['lamp']['code'], ','.join(rec['quirks']) or 'none', ','.join(rec['modules']) or 'none')


def write_recipe(rec, path):
    with open(path, 'w') as f:
        json.dump(rec, f, indent=1, sort_keys=True)


if __name__ == '__main__':
    import sys
    for s in (int(x) for x in (sys.argv[1:] or ['1', '2', '3'])):
        print(summary(robot_recipe_for(s)))
