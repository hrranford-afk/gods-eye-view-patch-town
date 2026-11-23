"""PER-SEED RECIPE for the Blender picture scripts. Pure python + numpy: no bpy, so it runs (and is tested) without Blender.
    recipe_for(seed)  -> a plain dict (JSON-able) that says what the picture is made of, chosen BEFORE anything is built.
    legacy_recipe(seed) -> the original camp picture (two tents, fire, boat, row of conifers, golden hour, the one camera) for any seed's coastline.
    recipe_for(1122) is the legacy recipe unchanged (the cross-check; a test compares it with the constants of the old hero_render).
    plan_trees(recipe) -> species items (li_trees format) placed from the island height map.   write_recipe(recipe, path) -> recipe.json.
Fields: island type (sandbar, volcanic, cliffs, lagoon ring, archipelago, plain), rock type (A gneiss, B sandstone, C basalt, D volcanic, as in
landform/world.py), tree mix and density (li_trees species, weighted by the map), what is there (camp, wreck, lighthouse, ruins, hut, nothing) and
where, time of day and weather (sun angle, colour, cloud and haze on the existing sky), camera (low beach, high wide, from the sea).
Everything is chosen from the seed alone (numpy Generator seeded with the seed), so the same seed gives the same recipe on every machine."""
import json, math, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'landform'))
import island_common as IC
import li_trees as LT
import world as W

LEGACY_SEED = IC.LEGACY_SEED
VERSION = 1
ISLAND_TYPES = ('sandbar', 'volcanic', 'cliffs', 'lagoon', 'archipelago', 'plain')
ROCK_CODES = {'A': 'gneiss', 'B': 'sandstone', 'C': 'basalt', 'D': 'volcanic'}
CONTENTS = ('camp', 'wreck', 'lighthouse', 'ruins', 'hut', 'nothing')
CAMERAS = ('low_beach', 'high_wide', 'from_sea')
TIMES = ('dawn', 'morning', 'noon', 'golden', 'dusk')
WEATHERS = ('clear', 'hazy', 'cloudy', 'overcast')
FORBIDDEN_WORDS = ('gore', 'blood', 'corpse', 'dead body', 'skeleton', 'skull', 'murder', 'kill', 'weapon', 'gun', 'brand', 'logo')

# ----------------------------------------------------------------------------------------------- small tables (TUNING)
ROCK_RULES = {   # rock code -> (rock row names in landform/world.py ROCKS for the palette, bed normal (dipping beds), columnar, crack width, soil table value)
    'A': dict(rows=('gneiss_grey',), bed=(0.45, 0.10, 0.89), columnar=False, crack_w=0.03, soil=0.15, prov='A'),
    'B': dict(rows=('sandstone_red',), bed=(0.06, 0.12, 0.99), columnar=False, crack_w=0.03, soil=0.40, prov='B'),
    'C': dict(rows=('basalt_columnar',), bed=(0.0, 0.0, 1.0), columnar=True, crack_w=0.085, soil=0.30, prov='C'),
    'D': dict(rows=('basalt_fresh',), bed=(0.0, 0.0, 1.0), columnar=False, crack_w=0.05, soil=0.12, prov='C'),
}
GROUND = {   # linear rgb ground colours by rock (the land colour map reads them); None entries keep the original palette
    'A': dict(),
    'B': dict(sand=(0.55, 0.36, 0.22), grass=(0.09, 0.14, 0.035), grass2=(0.16, 0.17, 0.05), heather=(0.19, 0.085, 0.06)),
    'C': dict(sand=(0.22, 0.20, 0.18), grass=(0.065, 0.15, 0.04), grass2=(0.12, 0.20, 0.05), heather=(0.12, 0.06, 0.07)),
    'D': dict(sand=(0.05, 0.048, 0.052), wet=(0.02, 0.02, 0.025), grass=(0.07, 0.085, 0.035), grass2=(0.11, 0.10, 0.05), heather=(0.13, 0.05, 0.04), heather2=(0.08, 0.05, 0.045), seabed=(0.10, 0.10, 0.11)),
}
SHELL_SAND = dict(sand=(0.72, 0.66, 0.50), wet=(0.30, 0.26, 0.19), seabed=(0.82, 0.78, 0.62))   # sandbar and lagoon: pale shell sand under shallow water
TREE_MIXES = {   # name -> species multipliers on the map weights (li_trees.species_weights), cover = ground cover counts, density
    'pine_heath':   dict(w=dict(pine=1.8, wind_pine=1.6, birch=0.6, rowan=0.4, juniper=1.4), density=0.85, heather=1.3, gorse=0.6),
    'birch_rowan':  dict(w=dict(birch=2.2, rowan=2.0, pine=0.3, oak=0.2, hazel=0.8), density=0.9, bracken=1.4),
    'oak_hazel':    dict(w=dict(oak=3.0, hazel=2.6, birch=0.5, pine=0.1, willow=0.8), density=1.15, bracken=1.5, heather=0.3),
    'spruce_dark':  dict(w=dict(spruce=4.0, pine=0.6, birch=0.2, rowan=0.3), density=1.3, heather=0.3, juniper=0.5),
    'wind_scrub':   dict(w=dict(wind_thorn=3.0, wind_pine=3.0, pine=0.2, birch=0.2, rowan=0.2, oak=0.0, spruce=0.0), density=0.55, gorse=1.5, juniper=1.2),
    'willow_wet':   dict(w=dict(willow=3.2, birch=1.2, hazel=1.0, pine=0.2), density=0.8, cotton=1.0),
    'mixed':        dict(w=dict(), density=1.0),
    'dune_scrub':   dict(w=dict(wind_thorn=1.0, wind_pine=0.6, pine=0.0, spruce=0.0, oak=0.0, birch=0.1, rowan=0.0, hazel=0.0), density=0.35, gorse=1.4, heather=0.6, juniper=0.8),
    'ash_birch':    dict(w=dict(birch=1.8, rowan=1.4, pine=0.2, oak=0.0, hazel=0.3), density=0.45, heather=0.7),
    'bare':         dict(w=dict(), density=0.0, gorse=0.6),
}
MIX_BY_TYPE = {   # island type -> [(mix, weight)] (rock tweaks below)
    'sandbar':     [('dune_scrub', 5), ('bare', 3), ('willow_wet', 1)],
    'lagoon':      [('dune_scrub', 4), ('bare', 2), ('wind_scrub', 2), ('mixed', 1)],
    'volcanic':    [('ash_birch', 4), ('bare', 3), ('wind_scrub', 2)],
    'cliffs':      [('wind_scrub', 3), ('pine_heath', 3), ('spruce_dark', 1), ('birch_rowan', 1), ('mixed', 1)],
    'archipelago': [('pine_heath', 3), ('birch_rowan', 2), ('wind_scrub', 2), ('mixed', 2), ('oak_hazel', 1)],
    'plain':       [('pine_heath', 2), ('birch_rowan', 2), ('oak_hazel', 2), ('spruce_dark', 2), ('mixed', 2), ('willow_wet', 1), ('wind_scrub', 1)],
}
TIME_TABLE = {   # name -> (sun elevation range deg, sun colour, sky strength, extra exposure, weight)
    'dawn':    ((6.0, 9.0), (1.0, 0.62, 0.46), 0.22, 0.30, 0.12),
    'morning': ((20.0, 32.0), (1.0, 0.84, 0.64), 0.22, 0.00, 0.25),
    'noon':    ((46.0, 58.0), (1.0, 0.95, 0.87), 0.20, -0.15, 0.20),
    'golden':  ((12.0, 24.0), (1.0, 0.74, 0.46), 0.22, 0.00, 0.30),
    'dusk':    ((5.0, 8.0), (1.0, 0.50, 0.34), 0.22, 0.45, 0.13),
}
WEATHER_TABLE = {   # name -> (overcast 0..1, haze 0..1, weight)
    'clear': (0.0, 0.0, 0.40), 'hazy': (0.15, 0.7, 0.20), 'cloudy': (0.5, 0.15, 0.25), 'overcast': (0.85, 0.3, 0.15),
}
TENT_COLOURS = ((0.58, 0.34, 0.14), (0.30, 0.38, 0.40), (0.30, 0.33, 0.16), (0.50, 0.18, 0.12), (0.62, 0.56, 0.40), (0.12, 0.34, 0.34))

# ----------------------------------------------------------------------------------------------- the legacy recipe (hero_render.py before the recipe layer)
def _lin(rgb255):
    c = np.asarray(rgb255, float) / 255.0
    return [float(x) for x in np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)]

def _rot(theta, lx, ly):
    c, s = math.cos(theta), math.sin(theta)
    return (c * lx - s * ly, s * lx + c * ly)

def _camp_block(site, theta, tents, fire=(0.5, 0.3), boat=(-5.5, 0.0), boat_yaw_deg=70.0, seek_shore=True):
    """seek_shore=False keeps the legacy boat where it stood (the old shoreline search had an empty np.arange range, so the boat never moved off its start point).
    camp layout in the site's local frame (x, y) turned by theta, as world positions. Local frame of the legacy picture: seaward = -y."""
    def at(lx, ly):
        dx, dy = _rot(theta, lx, ly); return [round(site[0] + dx, 4), round(site[1] + dy, 4)]
    out = dict(fire=at(*fire), tents=[], boat=dict(start=at(*boat), dir=[round(math.cos(theta - math.pi / 2), 6), round(math.sin(theta - math.pi / 2), 6)],
                                                    yaw=math.radians(boat_yaw_deg) + theta, inland_m=0.9, seek_shore=seek_shore))
    for t in tents:
        out['tents'].append(dict(name=t['name'], pos=at(*t['local']), yaw=math.radians(t['yaw_deg']) + theta, length=t['length'], width=t['width'], height=t['height'],
                                 colour=list(t['colour']), seed_off=t['seed_off']))
    return out

def legacy_recipe(seed=LEGACY_SEED):
    """the original picture. Every number below is a constant of the old hero_render.py (kept, so seed 1122 and --legacy renders do not move)."""
    site = [IC.CAMP[0], IC.CAMP[1]]
    tents = [dict(name='TentA', local=(-3.6, 3.6), yaw_deg=141, length=3.0, width=2.2, height=1.55, colour=(0.58, 0.34, 0.14), seed_off=0),
             dict(name='TentB', local=(4.6, 2.4), yaw_deg=24, length=2.8, width=2.0, height=1.4, colour=(0.30, 0.38, 0.40), seed_off=1)]
    return dict(
        version=VERSION, seed=int(seed), legacy=True,
        island=dict(type='plain', style=None, carve=[-1.5, -7.0], centre=[0.0, 0.0], radius=15.0),
        rock=dict(code='A', name='gneiss', look='legacy', palette=None, bed_normal=None, columnar=False, crack_w=0.03, scale=1.0),
        trees=dict(mix='legacy_conifers', mode='legacy_conifers', weights={}, density=1.0, max_trees=17, tree_scale=1.0, province='A', cover={}),
        tufts=dict(count=5200, heather=520),
        boulders=dict(n=16, scale=1.0, features=[[10.5, -4.0, 1.9], [-10.0, -2.5, 1.6], [13.0, 3.5, 2.3], [-12.5, 4.5, 2.0]]),
        content=dict(kind='camp', placement='beach', site=site, seaward_deg=-90.0, theta=0.0, dist_to_water=None,
                     camp=_camp_block(site, 0.0, tents, seek_shore=False), props=[]),
        time=dict(name='golden', sun_el_deg=20.0, sun_az_deg=320.0, sun_rel_deg=None, sun_colour=[1.0, 0.76, 0.5], sun_energy=12.0, sun_angle_deg=1.0, sky_strength=0.22, exposure=-0.4),
        weather=dict(name='clear', overcast=0.0, haze=0.0),
        camera=dict(kind='high_wide', pos=[-9.0, -29.0, 10.0], target=[0.0, -2.0, 1.2], lens=36.0, fstop=11.0),
        sea=dict(density=0.7))

# ----------------------------------------------------------------------------------------------- choosing
def _pick(rng, items):
    names = [i[0] for i in items]; w = np.array([i[1] for i in items], float)
    return names[int(rng.choice(len(names), p=w / w.sum()))]

class _style:
    """context: island_common with the recipe's STYLE and CAMP while the recipe is worked out (restored afterwards)."""
    def __init__(self, style, camp):
        self.style, self.camp = style, camp
    def __enter__(self):
        self.old = (IC.STYLE, IC.CAMP); IC.set_style(self.style, self.camp); return self
    def __exit__(self, *a):
        IC.STYLE, IC.CAMP = self.old

def use_island(recipe):
    """make island_common draw this recipe's island (STYLE and CAMP). Call before building terrain. Returns nothing."""
    isl = recipe['island']; IC.set_style(isl['style'], isl['carve'])

def _shape(rng, a, b):
    return dict(a=float(a), b=float(b), tilt=float(rng.uniform(-0.6, 0.9)), lobe=0.0, lob_u=0.0, lob_v=0.0, lob_r=1.0, back_ang=float(rng.uniform(0, 2 * math.pi)), rough=float(rng.uniform(0.10, 0.26)))

def _island_style(rng, kind, seed):
    if kind == 'sandbar':
        sh = _shape(rng, rng.uniform(20, 25), rng.uniform(4.6, 6.8)); return dict(type=kind, shape=sh)
    if kind == 'volcanic':
        sh = _shape(rng, rng.uniform(13.5, 17), rng.uniform(12, 15.5)); return dict(type=kind, shape=sh, peak=float(rng.uniform(8.5, 12.5)))
    if kind == 'cliffs':
        sh = _shape(rng, rng.uniform(14.5, 19), rng.uniform(9.5, 13)); sh['rough'] = float(rng.uniform(0.18, 0.32)); return dict(type=kind, shape=sh, cliff_h=float(rng.uniform(4.0, 7.0)))
    if kind == 'lagoon':
        sh = _shape(rng, rng.uniform(16, 20), rng.uniform(14.5, 18)); sh['rough'] = float(rng.uniform(0.06, 0.14)); return dict(type=kind, shape=sh, phase=float(rng.uniform(0, 6.28)))
    if kind == 'archipelago':
        sh = _shape(rng, 18, 15); n = int(rng.integers(4, 7)); blobs = []
        ang0 = rng.uniform(0, 6.28)
        for k in range(n):
            a_ = ang0 + k * 6.283 / n + rng.uniform(-0.4, 0.4); rr = rng.uniform(6, 15) if k else rng.uniform(0, 4)
            blobs.append([round(float(rr * math.cos(a_)), 3), round(float(rr * math.sin(a_)), 3), round(float(rng.uniform(5.5, 9.5) if k < 2 else rng.uniform(3.2, 6.0)), 3),
                          round(float(rng.uniform(3.8, 6.5)), 3), round(float(rng.uniform(0, 3.1)), 3)])
        sh['rough'] = float(rng.uniform(0.15, 0.3)); return dict(type=kind, shape=sh, blobs=blobs)
    return dict(type='plain')      # plain: the seed's own random shape (island_common.shape_params), as the earlier batches

def _maps(style, camp, seed, res=1.0, half=26.0):
    """the height map of the island as the recipe will have it, on a res-metre grid (cheap: one numpy call)."""
    xs = np.arange(-half, half + 1e-9, res); X, Y = np.meshgrid(xs, xs)
    with _style(style, camp):
        F = IC.height_fields(X, Y, seed)
    H = F['h']; gy, gx = np.gradient(H, res)
    slope = np.hypot(gx, gy)
    water = H < 0.02
    wp = np.stack([X[water], Y[water]], 1)
    # keep only water cells that touch land (the coast), then the distance to the coast for every land cell (chunked, a few million operations)
    lp_idx = np.nonzero(~water.ravel())[0]
    Xr, Yr = X.ravel(), Y.ravel()
    near = np.zeros(len(Xr), bool); near[~water.ravel()] = False
    dw = np.full(H.shape, 99.0).ravel(); sx = np.zeros(len(Xr)); sy = np.zeros(len(Xr))
    if len(wp) and len(lp_idx):
        coast = np.zeros(H.shape, bool)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            coast |= water & np.roll(~water, (dy, dx), (0, 1))
        cp = np.stack([X[coast], Y[coast]], 1)
        for i0 in range(0, len(lp_idx), 400):
            ii = lp_idx[i0:i0 + 400]; P = np.stack([Xr[ii], Yr[ii]], 1)
            d2 = ((P[:, None, :] - cp[None, :, :]) ** 2).sum(2); k = d2.argmin(1)
            dw[ii] = np.sqrt(d2[np.arange(len(ii)), k]); sx[ii] = cp[k, 0] - P[:, 0]; sy[ii] = cp[k, 1] - P[:, 1]
    dw = dw.reshape(H.shape); sx = sx.reshape(H.shape); sy = sy.reshape(H.shape)
    return dict(X=X, Y=Y, H=H, rock=F['rock'], slope=slope, dw=dw, sx=sx, sy=sy, land=~water)

def _choose_site(rng, M, headland):
    X, Y, H, rock, slope, dw, land = M['X'], M['Y'], M['H'], M['rock'], M['slope'], M['dw'], M['land']
    jit = rng.uniform(0, 1.0, H.shape)
    inner = (np.abs(X) < 21) & (np.abs(Y) < 21)
    for relax in (0, 1, 2):
        if headland:
            ok = land & inner & (H > 0.3) & (dw < 9 + 4 * relax) & (slope < 0.55 + 0.3 * relax)
            score = np.clip(H, 0, 7.0) - 0.18 * dw - 3.0 * slope + 0.8 * jit
        else:
            ok = land & inner & (H > 0.25) & (H < 1.5 + relax) & (dw > 1.5 - 0.5 * relax) & (dw < 7.5 + 2 * relax) & (slope < 0.35 + 0.2 * relax) & (rock < 0.5 + 0.2 * relax)
            score = -0.5 * np.abs(dw - 3.5) - 4.0 * slope - 2.0 * rock + 0.3 * np.minimum(dw, 5) + 0.8 * jit
        if ok.any():
            k = int(np.where(ok, score, -1e9).argmax()); r, c = divmod(k, H.shape[1])
            return float(X[r, c]), float(Y[r, c]), float(dw[r, c]), (float(M['sx'][r, c]), float(M['sy'][r, c]))
    k = int(np.where(land, H, -1e9).argmax()); r, c = divmod(k, H.shape[1])
    return float(X[r, c]), float(Y[r, c]), float(dw[r, c]), (0.0, -1.0)

def recipe_for(seed, legacy_scene=False):
    """the recipe of a seed: plain values only. legacy_scene=True gives the old camp picture on that seed's own coastline (the HW-3 look)."""
    seed = int(seed)
    if seed == LEGACY_SEED or legacy_scene:
        return legacy_recipe(seed)
    rng = np.random.default_rng([seed, 5113, VERSION])
    itype = _pick(rng, [('sandbar', 1.0), ('volcanic', 1.0), ('cliffs', 1.0), ('lagoon', 1.0), ('archipelago', 1.0), ('plain', 1.0)])
    if itype == 'volcanic':
        rock = 'D'
    else:
        rock = _pick(rng, [('A', 1.0), ('B', 1.0), ('C', 1.0), ('D', 0.18 if itype in ('cliffs', 'plain') else 0.0)])
    style = _island_style(rng, itype, seed)
    ground = dict(GROUND[rock])
    if itype in ('sandbar', 'lagoon'):
        ground.update(SHELL_SAND)
    style['ground'] = {k: [round(float(x), 4) for x in v] for k, v in ground.items()}
    content = _pick(rng, [('camp', 0.30), ('wreck', 0.16), ('lighthouse', 0.13), ('ruins', 0.15), ('hut', 0.15), ('nothing', 0.11)])
    headland = content in ('lighthouse', 'ruins')
    M = _maps(style, (999.0, 999.0), seed)
    sx_, sy_, dwater, sea_vec = _choose_site(rng, M, headland)
    n = math.hypot(*sea_vec) or 1.0; f = (sea_vec[0] / n, sea_vec[1] / n)
    seaward = math.atan2(f[1], f[0]); theta = seaward + math.pi / 2
    site = [round(sx_, 3), round(sy_, 3)]
    carve = site if not headland else [999.0, 999.0]      # camp, wreck, hut and empty beaches get the flat clearing; a lighthouse or ruin keeps the natural rock
    M = _maps(style, carve, seed)
    land = M['land']
    cen = [round(float(M['X'][land].mean()), 3), round(float(M['Y'][land].mean()), 3)] if land.any() else [0.0, 0.0]
    rad = float(np.percentile(np.hypot(M['X'][land] - cen[0], M['Y'][land] - cen[1]), 90)) if land.any() else 12.0
    island = dict(type=itype, style=style, carve=carve, centre=cen, radius=round(rad, 2), land_m2=int(land.sum()))
    # rock
    rr = ROCK_RULES[rock]
    pal = [_lin(next(r for r in W.ROCKS if r['name'] == rr['rows'][0])[k]) for k in ('colour_fresh', 'colour_weathered', 'colour_lichen')]
    rockd = dict(code=rock, name=ROCK_CODES[rock], look='province', palette=[[round(x, 4) for x in p] for p in pal], bed_normal=list(rr['bed']), columnar=rr['columnar'], crack_w=rr['crack_w'],
                 scale=1.5 if rock == 'C' else 1.0)
    # trees
    mix = _pick(rng, MIX_BY_TYPE[itype])
    if rock == 'C' and mix == 'pine_heath' and rng.random() < 0.6: mix = 'oak_hazel'
    if rock == 'B' and mix == 'wind_scrub' and rng.random() < 0.5: mix = 'oak_hazel'
    mt = TREE_MIXES[mix]
    dens = round(float(mt['density'] * rng.uniform(0.75, 1.25)), 3)
    cover = {k: round(float(mt.get(k, 1.0) * rng.uniform(0.8, 1.2)), 3) for k in ('juniper', 'gorse', 'bracken', 'heather', 'cotton')}
    trees = dict(mix=mix, mode='species', weights={k: float(v) for k, v in mt['w'].items()}, other_weight=1.0 if mix == 'mixed' else 0.25, density=dens, max_trees=int(round(10 + 38 * dens)) if dens > 0 else 0,
                 tree_scale=round(float(rng.uniform(0.5, 0.65)), 3), province=rr['prov'], cover=cover, driftwood=int(rng.integers(1, 5) + (4 if itype in ('sandbar', 'lagoon') else 0)))
    tuft_n = {'sandbar': 500, 'lagoon': 900, 'volcanic': 1800, 'cliffs': 5500, 'archipelago': 3200, 'plain': 5200}[itype]
    tufts = dict(count=int(tuft_n * rng.uniform(0.7, 1.2)), heather=int(rng.integers(0, 700)))
    nf = int(rng.integers(0, 5))
    boulders = dict(n=int(rng.integers(5, 36) + (8 if itype in ('cliffs', 'volcanic') else 0)), scale=round(float(rng.uniform(0.8, 1.25)), 3),
                    features=[[round(float(rng.uniform(-14, 14)), 2), round(float(rng.uniform(-8, 8)), 2), round(float(rng.uniform(1.3, 2.4)), 2)] for _ in range(nf)])
    # what is there
    cont = dict(kind=content, placement='headland' if headland else 'beach', site=site, seaward_deg=round(math.degrees(seaward), 2), theta=round(theta, 6), dist_to_water=round(dwater, 2), camp=None, props=[])
    if content == 'camp':
        nt = int(rng.integers(1, 4))
        base = [dict(name='TentA', local=(-3.6, 3.6), yaw_deg=141, length=3.0, width=2.2, height=1.55, seed_off=0),
                dict(name='TentB', local=(4.6, 2.4), yaw_deg=24, length=2.8, width=2.0, height=1.4, seed_off=1),
                dict(name='TentC', local=(0.6, 5.6), yaw_deg=96, length=2.5, width=1.9, height=1.3, seed_off=2)]
        order = rng.permutation(3)[:nt]; tents = []
        for i in order:
            t = dict(base[int(i)]); t['colour'] = TENT_COLOURS[int(rng.integers(0, len(TENT_COLOURS)))]
            t['yaw_deg'] = float(t['yaw_deg'] + rng.uniform(-25, 25)); tents.append(t)
        cont['camp'] = _camp_block(site, theta, tents, fire=(round(float(rng.uniform(-0.8, 1.0)), 2), round(float(rng.uniform(-0.6, 0.8)), 2)),
                                   boat=(round(float(rng.choice([-5.5, 5.5, -4.5, 6.0])), 2), 0.0), boat_yaw_deg=float(rng.uniform(40, 110)))
        if rng.random() < 0.3:
            cont['camp']['boat'] = None      # the boat is away: the camp has no boat
    elif content in ('wreck', 'hut', 'lighthouse', 'ruins'):
        prop = dict(kind=content, pos=list(site), yaw=0.0)
        if content == 'wreck':
            sp = [round(site[0] + f[0] * max(dwater - 1.4, 0.0), 3), round(site[1] + f[1] * max(dwater - 1.4, 0.0), 3)]
            prop.update(pos=sp, yaw=round(seaward + math.pi / 2 + float(rng.uniform(-0.5, 0.5)), 4), length=round(float(rng.uniform(6.0, 8.5)), 2), tilt=round(float(rng.uniform(0.18, 0.4)), 3))
        elif content == 'hut':
            prop.update(yaw=round(seaward - math.pi / 2, 4), colour=[round(c, 3) for c in TENT_COLOURS[int(rng.integers(0, len(TENT_COLOURS)))]], size=[round(float(rng.uniform(3.4, 4.4)), 2), round(float(rng.uniform(2.6, 3.2)), 2)])
        elif content == 'lighthouse':
            prop.update(yaw=round(float(rng.uniform(0, 6.28)), 3), height=round(float(rng.uniform(7.0, 9.5)), 2), bands=int(rng.integers(0, 3)))
        else:
            prop.update(yaw=round(float(rng.uniform(0, 6.28)), 3), plan=[round(float(rng.uniform(5.5, 8.0)), 2), round(float(rng.uniform(4.0, 5.5)), 2)], seed_off=int(rng.integers(0, 99)))
        cont['props'] = [prop]
    # time and weather
    tname = _pick(rng, [(k, v[4]) for k, v in TIME_TABLE.items()])
    wname = _pick(rng, [(k, v[2]) for k, v in WEATHER_TABLE.items()])
    (e0, e1), scol, sstr, xexp, _ = TIME_TABLE[tname]; oc, hz_, _ = WEATHER_TABLE[wname]
    el = round(float(rng.uniform(e0, e1)), 2)
    # camera
    cam = _camera(rng, M, cont, island, f, dwater, M_seed=seed)
    cam_az = math.degrees(math.atan2(cam['target'][0] - cam['pos'][0], cam['target'][1] - cam['pos'][1])) % 360.0
    rel = float(rng.choice([-1, 1]) * rng.uniform(25, 115)) if rng.random() < 0.8 else float(rng.choice([-1, 1]) * rng.uniform(140, 175))
    sun_energy = round(min(4.1 / math.sin(math.radians(el)), 18.0) * (1 - 0.72 * oc), 2)
    tm = dict(name=tname, sun_el_deg=el, sun_az_deg=round((cam_az + rel) % 360.0, 2), sun_rel_deg=round(rel, 2), sun_colour=[round(c, 3) for c in scol], sun_energy=sun_energy,
              sun_angle_deg=round(1.0 + 7.0 * oc, 2), sky_strength=sstr, exposure=round(-0.4 + xexp + 0.5 * oc, 3))
    return dict(version=VERSION, seed=seed, legacy=False, island=island, rock=rockd, trees=trees, tufts=tufts, boulders=boulders, content=cont,
                time=tm, weather=dict(name=wname, overcast=oc, haze=hz_), camera=cam, sea=dict(density=round(float(rng.uniform(0.55, 0.9)), 3)))

def _ground_z(style, carve, seed, pts):
    with _style(style, carve):
        return [float(IC.height_at(x, y, seed)[0, 0]) for x, y in pts]

def _camera(rng, M, cont, island, f, dwater, M_seed):
    kinds = {'low_beach': 0.30, 'high_wide': 0.40, 'from_sea': 0.30}
    if cont['kind'] == 'lighthouse':
        kinds = {'low_beach': 0.15, 'high_wide': 0.40, 'from_sea': 0.45}
    kind = _pick(rng, list(kinds.items()))
    site = cont['site']; theta = cont['theta']; r = (f[1], -f[0])
    zs = lambda x, y: max(_ground_z(island['style'], island['carve'], M_seed, [(x, y)])[0], 0.0)
    ztar = zs(*site)
    tz = ztar + (3.5 if cont['kind'] == 'lighthouse' else 1.1)
    cen = island['centre']; rad = island['radius']
    if kind == 'high_wide':
        tgt = [0.4 * site[0] + 0.6 * cen[0], 0.4 * site[1] + 0.6 * cen[1], 1.2]
        dist = 27.0 * min(max(rad / 13.0, 0.95), 1.7)
        side = float(rng.choice([-1, 1])) * rng.uniform(5, 11)
        pos = [tgt[0] + f[0] * dist + r[0] * side, tgt[1] + f[1] * dist + r[1] * side, round(float(rng.uniform(7.5, 13.5)) * min(dist / 27.0, 1.4), 2)]
        lens = 36.0 if rad < 17 else 32.0
    elif kind == 'low_beach':
        side = float(rng.choice([-1, 1])) * rng.uniform(7, 10) * (1.5 if cont['kind'] in ('ruins', 'lighthouse') else 1.0)
        p = [site[0] + r[0] * side + f[0] * 1.5, site[1] + r[1] * side + f[1] * 1.5]
        pos = [p[0], p[1], zs(*p) + float(rng.uniform(1.4, 2.0))]
        tgt = [site[0] - r[0] * side * 0.25 - f[0] * 0.5, site[1] - r[1] * side * 0.25 - f[1] * 0.5, tz]
        lens = float(rng.choice([28.0, 32.0, 36.0]))
    else:
        dist = dwater + float(rng.uniform(10, 16)); side = float(rng.choice([-1, 1])) * rng.uniform(2, 8)
        pos = [site[0] + f[0] * dist + r[0] * side, site[1] + f[1] * dist + r[1] * side, float(rng.uniform(1.3, 2.4))]
        tgt = [site[0] - f[0] * 2.0, site[1] - f[1] * 2.0, tz]
        lens = float(rng.choice([30.0, 34.0, 40.0]))
    pos[2] = max(pos[2], zs(pos[0], pos[1]) + 1.3)      # never inside the ground (a lagoon ring or an islet can sit under a sea camera)
    return dict(kind=kind, pos=[round(float(v), 3) for v in pos], target=[round(float(v), 3) for v in tgt], lens=lens, fstop=11.0)

# ----------------------------------------------------------------------------------------------- tree planning (numpy only; li_trees item format)
def plan_trees(recipe, res=1.0, half=25.0):
    """species items for the Blender scene, from the island height map: slope, rock, shelter from the wind side, wetness near the water and the
    soil of the rock type go into li_trees.species_weights (the same rules the landform scenes use), times the recipe's mix. Deterministic.
    Heights get +1 m because li_trees wants ground above 1.8 m and these islands are low (documented in RECIPE_LAYER.md)."""
    tr = recipe['trees']
    if tr['mode'] != 'species':
        return dict(items=[], counts={}, n=0)
    seed = recipe['seed']; isl = recipe['island']
    rng = np.random.default_rng([seed, 7771])
    M = _maps(isl['style'], isl['carve'], seed, res, half)
    X, Y, H, rockamt, slope, dw, land = M['X'], M['Y'], M['H'], M['rock'], M['slope'], M['dw'], M['land']
    smooth = LT.smooth
    rockamt = np.clip(rockamt - 0.5 * smooth(3.2, 4.6, H), 0, 1)      # the rock field adds a height term for the mesh shader; trees follow the slope and coast terms only
    wind_from = float(rng.uniform(0, 2 * math.pi))
    cen = isl['centre']
    wdir = np.array([math.cos(wind_from), math.sin(wind_from)])
    upwind = ((X - cen[0]) * wdir[0] + (Y - cen[1]) * wdir[1]) / max(isl['radius'], 8.0)
    wind = np.clip(0.55 * smooth(-0.2, 1.0, upwind) + 0.45 * (1 - smooth(1.0, 7.0, dw)) + 0.2 * smooth(3.0, 8.0, H), 0, 1)
    wet = np.clip(0.9 * smooth(1.6, 0.4, H) + 0.25 * IC.fbm(X * .12, Y * .12, seed + 61, 3), 0, 1)
    soil = LT.soil_depth_map(ROCK_RULES[recipe['rock']['code']]['soil'] * (1 - rockamt), slope, wet, wind)
    far = np.ones(H.shape, bool)
    cs = recipe['content']['site']
    far &= np.hypot(X - cs[0], Y - cs[1]) > 6.5
    for p in recipe['content'].get('props', []):
        far &= np.hypot(X - p['pos'][0], Y - p['pos'][1]) > 5.0
    veg_ok = land & far & (dw > 1.8)
    SW = LT.species_weights(tr['province'], soil, wind, slope, wet, H + 1.0, veg_ok, rockamt)
    for k in LT.GROUP_TREE:
        SW[k] = SW[k] * tr['weights'].get(k, tr.get('other_weight', 1.0))      # unnamed species count a quarter, so the mix has a character
    C = IC.fbm(X / 14.0, Y / 14.0, seed + 4151, 3)
    shelter = 1 - smooth(0.15, 0.45, wind)
    dens = tr['density']
    cf = C + 0.18 * shelter + 0.1 * (dens - 1.0)
    core = smooth(0.54, 0.64, cf); edge = smooth(0.45, 0.55, cf) * (1 - core)
    p_site = np.clip((0.92 * core + 0.30 * edge + 0.05 * shelter) * min(dens, 1.3) * 1.2, 0, 1)
    wsum = sum(SW[k] for k in LT.GROUP_TREE)
    pd = np.clip(p_site * np.minimum(wsum * 1.6, 1.0), 0, 1)
    items = []; grid = {}
    down_az = math.atan2(-math.sin(wind_from), -math.cos(wind_from)); ts = tr['tree_scale']
    def mk(sp, x, y, kind, age, wind_here, soil_here, sc_mult=1.0):
        spd = LT.SPECIES[sp]; vets = [i for i in range(spd['n']) if i >= spd['vet']]; nonv = [i for i in range(spd['n']) if i < spd['vet']]
        if age == 'veteran' and not vets: age = 'mature'
        vi = int(rng.choice(vets)) if age == 'veteran' else int(rng.choice(nonv))
        base = {'sapling': rng.uniform(0.34, 0.58), 'mature': rng.uniform(0.82, 1.08), 'veteran': rng.uniform(1.12, 1.32)}[age]
        hf = (0.62 + 0.55 * smooth(0.1, 0.5, soil_here)) * (1 - 0.45 * smooth(0.15, 0.6, wind_here))
        sc = base * hf * LT.HERO_SCALE * ts * sc_mult * rng.uniform(0.92, 1.1); sw = sc * rng.uniform(0.88, 1.14)
        lean = math.radians(rng.uniform(0, 5) + 9 * wind_here * (1 if kind != 'wind' else 0)); ld = down_az + rng.uniform(-0.6, 0.6) if wind_here > 0.15 else rng.uniform(0, 6.28)
        yaw = (down_az + rng.uniform(-0.35, 0.35)) if kind == 'wind' else rng.uniform(0, 6.28)
        auto = 0.0
        if kind in ('tree', 'shrub', 'wind') and sp not in ('pine', 'spruce', 'wind_pine'):
            u = rng.random(); auto = rng.uniform(0.5, 0.95) if u < 0.10 else rng.uniform(0.0, 0.15)
        return dict(kind=kind, sp=sp, vi=vi, x=float(x), y=float(y), z=0.0, sc=float(sc), sw=float(sw), yaw=float(yaw), lean=float(lean), lean_dir=float(ld), age=age,
                    col=(float(rng.normal(0, 0.45)), float(rng.uniform(0.75, 1.25)), float(auto)), rad=float(spd['r'] * sw))
    rr, cc = np.nonzero(pd > 0.004)
    lim = tr['max_trees']; ntree = 0
    for s_i in rng.permutation(len(rr))[:30000]:
        if ntree >= lim: break
        r_, c_ = rr[s_i], cc[s_i]
        if rng.random() > pd[r_, c_]: continue
        w = np.array([SW[k][r_, c_] for k in LT.GROUP_TREE]); tot = w.sum()
        if tot <= 1e-6: continue
        k = LT.GROUP_TREE[int(rng.choice(len(LT.GROUP_TREE), p=w / tot))]
        e = edge[r_, c_] > core[r_, c_]; single = p_site[r_, c_] < 0.2 and not e
        pr = np.array([0.38, 0.52, 0.10]) if e else (np.array([0.12, 0.43, 0.45]) if single else np.array([0.28, 0.54, 0.18]))
        age = ['sapling', 'mature', 'veteran'][int(rng.choice(3, p=pr))]
        x = float(X[r_, c_] + rng.uniform(-0.4, 0.4)); y = float(Y[r_, c_] + rng.uniform(-0.4, 0.4))
        it = mk(k, x, y, LT.SPECIES[k]['kind'], age, float(wind[r_, c_]), float(soil[r_, c_]))
        gx, gy = int(x // 4), int(y // 4); bad = False
        for ii in (gx - 1, gx, gx + 1):
            for jj in (gy - 1, gy, gy + 1):
                for o in grid.get((ii, jj), ()):
                    if math.hypot(o['x'] - x, o['y'] - y) < 0.62 * (o['rad'] + it['rad']) + 0.3: bad = True
        if bad: continue
        grid.setdefault((gx, gy), []).append(it); items.append(it); ntree += 1
    def cover(sp, wmap, n, kind, scale=(0.8, 1.25), jit=0.5):
        rr2, cc2 = np.nonzero(wmap > 0.01); n = int(n)
        if len(rr2) == 0 or n <= 0: return
        p = wmap[rr2, cc2]; p = p / p.sum(); k = min(n, len(rr2))
        for q in rng.choice(len(rr2), size=k, replace=False, p=p):
            r_, c_ = rr2[q], cc2[q]; x = float(X[r_, c_] + rng.uniform(-res, res) * jit); y = float(Y[r_, c_] + rng.uniform(-res, res) * jit)
            it = mk(sp, x, y, kind, 'mature', 0.0, float(soil[r_, c_]), rng.uniform(*scale) * 0.75)
            if sp == 'bracken': it['col'] = (it['col'][0], it['col'][1], float(rng.uniform(0, 1)))
            items.append(it)
    cv = tr['cover']; okc = land & far & (dw > 1.2) & (rockamt < 0.6) & (H > 0.3)
    coastal = smooth(0.12, 0.5, wind)
    cover('juniper', (1 - smooth(0.4, 0.6, wet)) * okc * (1 - smooth(0.55, 0.75, wind)) * (slope < 0.85) + 0.0, 40 * cv.get('juniper', 1), 'cover')
    cover('gorse', (0.35 + 0.65 * coastal) * smooth(0.04, 0.2, soil) * okc * (slope < 0.8), 55 * cv.get('gorse', 1), 'cover', (0.8, 1.4))
    cover('bracken', smooth(0.12, 0.3, soil) * okc * (1 - smooth(0.3, 0.6, wind)) * (slope < 0.7), 50 * cv.get('bracken', 1) * (1 if recipe['rock']['code'] != 'D' else 0.3), 'cover', (0.8, 1.5))
    cover('heather', okc * (1 - smooth(0.35, 0.6, wet)) * (1 - smooth(0.65, 0.85, wind)) * (slope < 0.9), 160 * cv.get('heather', 1), 'cover', (0.9, 1.6))
    cover('cotton', smooth(0.45, 0.7, wet) * (H > 0.35) * okc, 60 * cv.get('cotton', 0.4), 'cover', (0.9, 1.4))
    shore = land & (dw < 4.0) & (dw > 0.4) & (slope < 0.5)
    dwn = tr.get('driftwood', 3)
    cover('snag', shore * (soil > 0.04) * far * (H > 0.4), max(1, dwn // 2), 'dead', (0.8, 1.3), 0.9)
    cover('log', shore * far, dwn, 'dead', (0.8, 1.3), 0.9)
    if items:
        xs_ = np.array([[it['x'] for it in items]]); ys_ = np.array([[it['y'] for it in items]])
        with _style(isl['style'], isl['carve']):
            zz = IC.height_fields(xs_, ys_, seed)['h'][0]
        for it, z in zip(items, zz): it['z'] = float(z)
    cnt = {}
    for it in items: cnt[it['sp']] = cnt.get(it['sp'], 0) + 1
    return dict(items=items, counts=cnt, n=len(items))

def write_recipe(recipe, path):
    d = os.path.dirname(os.path.abspath(path))
    os.makedirs(d, exist_ok=True)
    with open(path, 'w') as f:
        json.dump(recipe, f, indent=1, sort_keys=False)
    return path

def summary(recipe):
    c = recipe['content']
    return '%s | rock %s | %s %.2f | %s | %s %s | cam %s' % (recipe['island']['type'], recipe['rock']['code'], recipe['trees']['mix'], recipe['trees']['density'], c['kind'],
                                                          recipe['time']['name'], recipe['weather']['name'], recipe['camera']['kind'])

if __name__ == '__main__':
    seeds = [int(x) for x in sys.argv[1:]] or [LEGACY_SEED]
    for s in seeds:
        print(s, summary(recipe_for(s)))
