# food_model: a small settlement chooses how to feed itself, and we measure what that does to people, shoals and seals.
# Spec and sources: research/FOOD_AND_WILDLIFE.md. Report: ecosystem/FOOD_MODEL.md.  Headless, numpy only, deterministic.
# EVERY number marked TUNING is a design choice, not a measurement. Confidence tags are in the note, section 4.
# People are counted, never tracked. Hunger is a slow pressure: work slows first, and only a long deep hunger costs a settler
# (who then leaves by the tender, nothing is shown). The real game softens this further with rescue rations.
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np

import eco_common as C

# ---- the settlement and its day ------------------------------------------------------------------------------------
PEOPLE = 4                  # TUNING: a small starting party (shelter_ladder.py uses 6; four fits one dinghy and one small island)
KCAL_PER_PERSON = 2200.0    # PLAUSIBLE: adult mix at cool-climate light-to-moderate work; heavy work 2800 to 3300 (FAO and HK table, note 1.1)
CHORE_H = 3.0               # TUNING: hours per person per day for water, fire, camp
DAY_H_CAP = 9.0             # TUNING: working hours in a day at most
FOOD_SHARE = 0.75           # TUNING: most of the free hours that food may take, the rest goes to building
STORM_WORK = 0.4            # TUNING: work factor on a storm day
START_KIT = 24000.0         # TUNING: about two days of packs in the boat
STAGES = (0.15, 0.4, 0.7)   # hunger stages: hungry, weak, failing (the "what you need next" card shows them)
LOSS_AFTER = 20             # TUNING: days at failing before one settler leaves by the tender

# ---- the sea: inshore shoal index S (0 to 1) -----------------------------------------------------------------------
FISH_K_KG = 600.0           # TUNING: kg of fish that takes the inshore shoal from full to empty
FISH_R = 0.04               # TUNING: logistic regrowth per day
FISH_MIX = 0.03             # TUNING: per day pull of S towards what the open sea brings in (the table is a window on a bigger sea)
FISH_KCAL_KG = 1000.0       # PLAUSIBLE: whole fish, mixed oily and white, about 60 percent edible
LINE_KG_H = 3.5             # TUNING (LOW): kg per hour of boat line fishing at S = 1 (anglers report 0 to 6 fish a drop, no hard numbers)
NET_KG_NET = 6.0            # TUNING (LOW): kg per net per day at S = 1
NET_H = 1.5                 # TUNING: hours to set, haul and clean one net
NETS = 4                    # TUNING: four net lengths from the wreck; nets make effort cheap, which is the danger
NET_LOSS_STORM = 5.0        # nets are lost on a day with storm strength above this (chance 0.25)
BOAT_H = 6.0                # hours per day the dinghy can fish
# ---- the shore: shellfish patch B and seaweed W ----------------------------------------------------------------------
SHELL_KCAL_H = 1000.0        # TUNING (LOW): from about 1,500 kcal/h for expert foragers (De Vynck 2015) scaled down for cold, novices
SHELL_K = 1000000.0          # TUNING: kcal of harvestable shellfish on one small island's rocks
SHELL_R = 0.015             # TUNING: shellfish regrow slowly
WEED_KCAL_H = 300.0         # TUNING (LOW): fresh kelp and laver are low in kcal
WEED_K = 1.5e6
WEED_R = 0.03
TIDE_H0, TIDE_H1 = 1.0, 2.5  # hours of good low tide a day: 1.0 at neaps to 3.5 at springs (TUNING)
# ---- eggs and the common seabird colony C ------------------------------------------------------------------------------
EGG_KCAL = 100.0            # PLAUSIBLE: a gull egg is about 70 g
EGGS_SEASON = (110, 165)
EGGS_STOCK = 200.0          # TUNING: first clutches within reach of the shore
EGG_H = 40.0                # eggs per hour while there are some
EGG_SAFE = 0.25             # TUNING (LOW): share of first clutches that can go without harm (gulls re-lay)
# ---- storage: share lost per day (cool climate) ---------------------------------------------------------------------------
SPOIL = dict(fish=0.12, shell=0.08, weed=0.05, eggs=0.015, dried=0.002, staple=0.0015, packs=0.0)  # TUNING (LOW)
GULL_RACK = 0.01            # TUNING: dried fish lost to gulls per day while a rack stands
DRY_RETAIN = 0.9            # PLAUSIBLE: dried fish keeps most of its kcal, loses water
DRY_RACK_KCAL = 15000.0     # TUNING: one rack dries about 15 kg of fish a day
DRY_H_PER_KCAL = 0.2 / 1000.0
DRY_STORM_LOSS = 0.3
# ---- garden ---------------------------------------------------------------------------------------------------------------
BED_M2 = 50.0
BED_DIG_H = 20.0            # TUNING (LOW): turf and spade work, lazy-bed style
BED_TEND_H = 0.3            # per bed per day: weeds, birds
BED_HARVEST_H = 10.0
STAPLE_KCAL_M2 = 600.0      # TUNING (LOW): potato or bere on a cool island; farm fields give 1,000 to 1,300 (note 1.6)
FOUND_BEDS = 3              # TUNING: seed found in the wreck covers three beds
SEED_SAVED = 0.32           # PLAUSIBLE: a third of a potato or bere crop is kept as seed for one more bed (seed rate 0.25 kg/m2 against 0.8 kg/m2 grown)
RIPE_DAYS, EARLY_DAYS, EARLY_YIELD = 105, 80, 0.7
PLANT_WINDOW = (100, 170)
BIRD_LOSS = 0.15            # TUNING: share of a crop lost to birds when tending is skipped; with tending it is a third of that
GREENS_AFTER = 35           # days from sowing to first cut of hardy greens
# ---- trade, salvage, wreck ------------------------------------------------------------------------------------------------------
TENDER_EVERY, TENDER_JITTER, TENDER_MISS = 20, 3, 0.15
PACK_KCAL = 4000.0          # TUNING: one ration pack
PACK_COST_UNITS = 5         # salvage units the tender wants for one pack
SALVAGE_PER_H = 2.0
PACKS_MAX = 12              # per visit, TUNING
PACK_LITTER = 0.12          # kg per metre of shore per pack: wrappers and crates dropped with it (UNVERIFIED design idea)
SALVAGE_CLEAR = 0.01        # kg per metre cleared per salvage unit collected
WRECK_KCAL = 90000.0        # TUNING: stores in the wreck
WRECK_KCAL_H = 2500.0
WRECK_BAD = 0.15
# ---- seals (same shape as ecosystem/wildlife_place.py trust) ---------------------------------------------------------------------
LITTER0 = 0.3
COLLECTOR_CLEAR = 0.03      # kg/m per day cleared by the old beach machine
LEAVE_LINE, COMFORT_LINE = 2.0, 0.7
T_DOWN, T_UP = 0.04, 0.0067
SEAL_SHOAL_LOW = 0.3        # below this shoal index seals lose trust slowly (less to eat)
SEAL_NET = 0.002            # per day per net in the water: bycatch worry (real, but the rate is TUNING)
SEAL_DISTURB = 0.0004       # per forage hour: walking the haul-out rocks

# ---- water: rain catchment -------------------------------------------------------------------------------------------------------------
RAIN_MM_WET = 6.0           # TUNING: mean mm on a wet day
RAIN_P = (0.40, 0.65)       # TUNING: wet-day chance in summer, winter
CATCH_COEF = 0.8            # VERIFIED rule of thumb: litres = mm x m2 x 0.8
WATER_NEED_L = 10.0         # litres per person per day (drink 3 plus cooking and washing; Sphere 7.5 to 15)
TARP_M2 = 8.0               # camp tarp; the hut roof is bigger (see ROOF_M2)
ROOF_M2 = ((0, 8.0), (40, 25.0), (100, 45.0))   # TUNING: catchment by day as the shelter ladder climbs
TANK_L = 400.0
HAUL_H_PER_L = 0.02        # TUNING: 50 litres carried per person-hour from a seep


GREED = {'nets': 2.2, 'line': 1.1, 'eggs': 1.5, 'mixed': 1.8}   # TUNING: how much more than today's need a player pulls in (stockpiling, selling dried fish)
STRATS = {
    # name: ordered list of routes. Each route is one player choice.
    'shore':   ('shell', 'weed'),
    'line':    ('line', 'dry'),
    'nets':    ('net', 'dry'),
    'garden':  ('garden', 'shell', 'weed'),
    'eggs':    ('eggs', 'shell'),
    'trader':  ('trade', 'shell'),
    'scav':    ('scav', 'shell'),
    'mixed':   ('garden', 'eggs_safe', 'line', 'shell', 'weed', 'dry', 'trade_light'),
}
NAMES = tuple(STRATS)
SCENARIOS = {'spring': (105, 120, PEOPLE), 'autumn': (270, 120, PEOPLE), 'long': (105, 500, PEOPLE),
             'village': (105, 120, 12)}   # village: twelve people, to show what a later, bigger settlement does to the shoal


def _weather(seed, start, days):
    storm = C.storm_schedule(seed, start, days)
    r = C.rng_for(seed, 7000)
    wet = np.zeros(days)
    for d in range(days):
        doy = start + d
        p = RAIN_P[0] + (RAIN_P[1] - RAIN_P[0]) * C.season_w(doy)
        if r.random() < p or storm[d] > 0:
            wet[d] = r.exponential(RAIN_MM_WET)
    noise = np.exp(0.35 * C.rng_for(seed, 7001).standard_normal((days, 4)) - 0.06)
    tender = []
    t = int(TENDER_EVERY * 0.5)
    rr = C.rng_for(seed, 7002)
    while t < days:
        if rr.random() >= TENDER_MISS:
            tender.append(t)
        t += TENDER_EVERY + int(rr.integers(-TENDER_JITTER, TENDER_JITTER + 1))
    return storm, wet, noise, set(tender)


def fish_access(doy):
    # what the open sea brings to the inshore: summer shoals (mackerel, herring) in, winter thin. Floor 0.25 for wrasse, pollack, flatfish.
    return 0.25 + 0.75 * (0.5 + 0.5 * np.sin(2 * np.pi * (doy - 120) / 365.0)) ** 1.2


def run(seed, strat, start_doy, days, people=PEOPLE):
    routes = STRATS[strat]
    storm, wet, noise, tender = _weather(seed, start_doy, days)
    st = dict(fish=0.0, shell=0.0, weed=0.0, eggs=0.0, dried=0.0, staple=0.0, packs=START_KIT)
    P = people
    S, B, W, Ccol, T = 0.8, 1.0, 1.0, 1.0, 1.0
    litter = LITTER0
    H = 0.0
    fail_streak = 0
    water = TANK_L * 0.5
    boats = max(1, people // 4)      # one dinghy per four people (TUNING)
    nets = NETS * boats if 'net' in routes else 0
    egg_avail, egg_taken_total, egg_season_done = EGGS_STOCK, 0.0, False
    beds = []                       # each is (sow_day, harvested?)
    seed_beds = FOUND_BEDS
    dig_progress = 0.0
    greens_day = None
    salvage, wreck = 0.0, WRECK_KCAL
    rack_built = False
    rack_progress = 0.0
    build_h = 0.0
    eaten_total, need_total = 0.0, 0.0
    hungry_days = thirst_days = 0
    S_min, T_min = S, T
    gone_days = 0
    lost = 0
    fish_kg_total = 0.0
    shell_h_total = 0.0
    last_greens = 0
    daily_H = []
    for d in range(days):
        doy = start_doy + d
        # ---- hours ---------------------------------------------------------------------------------
        work = 1.0 - 0.6 * min(1.0, H)
        if greens_day is None and d - last_greens > 45 and d > 45:
            work *= 0.93            # tired, no fresh greens for a long time: a gentle slow-down (UNVERIFIED size)
        if storm[d] >= 4:
            work *= STORM_WORK
        free_h = P * (min(C.daylight_hours(doy), DAY_H_CAP) * work - CHORE_H)
        free_h = max(free_h, 0.0)
        food_h = FOOD_SHARE * free_h
        used = 0.0
        sea_ok = storm[d] < 0.5
        tide_h = (TIDE_H0 + TIDE_H1 * C.springness(d + 5)) * min(P, 4)
        got = 0.0                    # kcal landed today
        # ---- rack ------------------------------------------------------------------------------------
        # ---- garden commitments (fixed work, not driven by hunger) ------------------------------------------------
        if 'garden' in routes:
            for b in beds:
                if b[1] is None and not b[2]:
                    h = min(BED_TEND_H, food_h - used)
                    used += h
            can_plant = PLANT_WINDOW[0] <= doy % 365 <= PLANT_WINDOW[1] and seed_beds > 0
            if can_plant and food_h - used > 0:
                h = min(0.4 * food_h, food_h - used, BED_DIG_H - dig_progress)
                used += h
                dig_progress += h
                if dig_progress >= BED_DIG_H - 1e-9:
                    dig_progress = 0.0
                    seed_beds -= 1
                    beds.append([d, None, False])
            for b in beds:
                age = d - b[0]
                if not b[2] and (age >= RIPE_DAYS or (age >= EARLY_DAYS and need_short(st, P) and food_h - used >= BED_HARVEST_H)):
                    if food_h - used >= BED_HARVEST_H or age >= RIPE_DAYS:
                        h = min(BED_HARVEST_H, food_h - used) if food_h - used > 0 else 0
                        if h >= BED_HARVEST_H - 1e-9:
                            used += h
                            y = BED_M2 * STAPLE_KCAL_M2 * (1.0 if age >= RIPE_DAYS else EARLY_YIELD)
                            y *= (1 - BIRD_LOSS / 3.0)
                            y *= max(0.5, 1.0 - 0.03 * float(np.sum(storm[b[0]:d + 1] >= 6)))
                            st['staple'] += y
                            got += y
                            b[2] = True
                            seed_beds += 1                 # a third of a crop is saved as seed; that sows one more bed next spring
                            st['staple'] -= SEED_SAVED * y
            if any(d - b[0] >= GREENS_AFTER for b in beds):
                greens_day = d
                last_greens = d
        if 'weed' in routes and d % 3 == 0:
            last_greens = d
        # ---- tender visit ------------------------------------------------------------------------------------
        if d in tender and ('trade' in routes or 'trade_light' in routes):
            units = int(salvage)
            packs = min(PACKS_MAX if 'trade' in routes else 3, units // PACK_COST_UNITS)
            if packs > 0:
                salvage -= packs * PACK_COST_UNITS
                st['packs'] += packs * PACK_KCAL
                got += packs * PACK_KCAL
                litter += packs * PACK_LITTER
        # ---- targets ----------------------------------------------------------------------------------------------
        need = KCAL_PER_PERSON * P
        stock_days = (st['dried'] + st['staple'] + st['packs'] + st['fish'] * 0.5 + st['shell'] * 0.6 + st['eggs']) / need
        target = need * min(2.2, max(1.0, GREED.get(strat, 1.05) + 0.25 * (6.0 - stock_days)))
        # ---- routes ------------------------------------------------------------------------------------------------------
        for rt in routes:
            if rt in ('garden', 'dry', 'trade'):
                if rt == 'trade':
                    pass
                else:
                    continue
            remaining = food_h - used
            if remaining <= 0:
                break
            need_k = target - got
            if rt == 'trade':
                # collecting salvage: hours until the next visit would be covered; steady, not hunger-driven
                if d < days - 5:
                    h = min(remaining, 0.55 * food_h)
                    salvage += h * SALVAGE_PER_H * noise[d, 3]
                    litter = max(0.0, litter - h * SALVAGE_PER_H * SALVAGE_CLEAR)
                    used += h
                continue
            if rt == 'trade_light':
                h = min(remaining, 0.12 * food_h)
                salvage += h * SALVAGE_PER_H * noise[d, 3]
                litter = max(0.0, litter - h * SALVAGE_PER_H * SALVAGE_CLEAR)
                used += h
                continue
            if need_k <= 0:
                continue
            if rt == 'line' and sea_ok:
                y = LINE_KG_H * FISH_KCAL_KG * S * noise[d, 0]
                h = min(remaining, BOAT_H * boats, need_k / max(y, 1.0))
                k = y * h
                kg = k / FISH_KCAL_KG
                st['fish'] += k
                got += k
                S -= kg / FISH_K_KG
                fish_kg_total += kg
                used += h
            elif rt == 'net' and sea_ok:
                if nets < NETS * boats and food_h - used > 6.0 and 'salvage' not in routes:
                    used += 6.0                 # make a replacement net from found cord
                    nets += 1
                    remaining = food_h - used
                k_each = NET_KG_NET * FISH_KCAL_KG * S * noise[d, 0]
                n_use = int(min(nets, remaining // NET_H))
                if n_use > 0:
                    n_use = int(min(n_use, np.ceil(need_k / max(k_each, 1.0))))
                    k = n_use * k_each
                    st['fish'] += k
                    got += k
                    S -= (k / FISH_KCAL_KG) / FISH_K_KG
                    fish_kg_total += k / FISH_KCAL_KG
                    used += n_use * NET_H
                    if storm[d] > NET_LOSS_STORM and C.rng_for(seed, 7003, d).random() < 0.25:
                        nets = max(0, nets - 1)
            elif rt == 'shell':
                y = SHELL_KCAL_H * B * noise[d, 1]
                cap_h = min(remaining, tide_h, need_k / max(y, 1.0))
                k = y * cap_h
                st['shell'] += k
                got += k
                B -= k / SHELL_K
                used += cap_h
                shell_h_total += cap_h
            elif rt == 'weed':
                y = WEED_KCAL_H * W
                cap_h = min(remaining, tide_h * 0.6, need_k / max(y, 1.0))
                k = y * cap_h
                st['weed'] += k
                got += k
                W -= k / WEED_K
                used += cap_h
                shell_h_total += 0.3 * cap_h
            elif rt in ('eggs', 'eggs_safe') and EGGS_SEASON[0] <= doy % 365 <= EGGS_SEASON[1]:
                cap_eggs = EGGS_STOCK * Ccol
                if rt == 'eggs_safe':
                    cap_eggs = EGG_SAFE * EGGS_STOCK * Ccol
                avail = max(0.0, cap_eggs - egg_taken_total)
                n = min(avail, EGG_H * remaining, need_k / EGG_KCAL)
                if rt == 'eggs_safe':
                    n = min(n, 0.5 * remaining * EGG_H)
                if n > 0:
                    st['eggs'] += n * EGG_KCAL
                    got += n * EGG_KCAL
                    egg_taken_total += n
                    used += n / EGG_H
            elif rt == 'scav' and wreck > 0:
                k = min(wreck, WRECK_KCAL_H * min(remaining, need_k / WRECK_KCAL_H))
                h = k / WRECK_KCAL_H
                st['packs'] += k * (1 - WRECK_BAD)
                got += k * (1 - WRECK_BAD)
                wreck -= k
                used += h
        # ---- drying fish ------------------------------------------------------------------------------------------------------------
        if 'dry' in routes and st['fish'] > need * 0.5:
            surplus = st['fish'] - need * 0.4
            if not rack_built:
                h = min(8.0, food_h - used)
                used += h
                rack_progress += h
                if rack_progress >= 8.0:
                    rack_built = True
            if rack_built:
                k = min(surplus, DRY_RACK_KCAL, max(0.0, (food_h - used)) / DRY_H_PER_KCAL)
                if k > 0:
                    used += k * DRY_H_PER_KCAL
                    st['fish'] -= k
                    st['dried'] += k * DRY_RETAIN * (1 - (DRY_STORM_LOSS if storm[d] > 0 else 0.0))
        build_h += max(0.0, free_h - used)
        # ---- eating -----------------------------------------------------------------------------------------------------------------
        need = KCAL_PER_PERSON * P
        eat = 0.0
        for k in ('fish', 'shell', 'weed', 'eggs', 'dried', 'staple', 'packs'):
            take = min(st[k], need - eat)
            st[k] -= take
            eat += take
        eaten_total += eat
        need_total += need
        deficit = 1.0 - eat / need
        # ---- water ------------------------------------------------------------------------------------------------------------------------
        area = [a for dd, a in ROOF_M2 if d >= dd][-1]
        water = min(TANK_L, water + wet[d] * area * CATCH_COEF)
        w_need = WATER_NEED_L * P
        if water >= w_need:
            water -= w_need
        else:
            # the tank is short: the rest is carried from a seep or stream at HAUL_H_PER_L (an island without one is a different seed, not modelled)
            thirst_days += 1
            build_h -= (w_need - water) * HAUL_H_PER_L
            water = 0.0
        # ---- hunger: a slow pressure ---------------------------------------------------------------------------------------------
        H += 0.2 * (deficit - H)
        daily_H.append(H)
        if H > STAGES[1]:
            hungry_days += 1
        fail_streak = fail_streak + 1 if H > STAGES[2] else max(0, fail_streak - 2)
        if fail_streak >= LOSS_AFTER and P > 1:
            P -= 1
            lost += 1
            fail_streak = 0
            H *= 0.6
        # ---- spoilage and gulls ----------------------------------------------------------------------------------------------------------
        for k, r in SPOIL.items():
            st[k] *= (1.0 - r)
        if rack_built:
            st['dried'] *= (1.0 - GULL_RACK)
        # ---- the sea, the shore, the colony and the seals ----------------------------------------------------------------------------
        S = min(1.0, max(0.0, S + FISH_R * S * (1 - S) + FISH_MIX * (fish_access(doy) - S)))
        B = min(1.0, max(0.0, B + SHELL_R * B * (1 - B) + 0.002 * (1 - B)))
        W = min(1.0, max(0.0, W + WEED_R * W * (1 - W) + 0.005 * (1 - W)))
        S_min = min(S_min, S)
        if EGGS_SEASON[1] < doy % 365 and not egg_season_done:
            excess = max(0.0, egg_taken_total - EGG_SAFE * EGGS_STOCK) / EGGS_STOCK
            Ccol = max(0.05, Ccol - 0.9 * excess)
            egg_season_done = True
            egg_taken_total = 0.0
        if doy % 365 == EGGS_SEASON[0] - 1:
            egg_season_done, egg_taken_total = False, 0.0
        Ccol = min(1.0, Ccol + 0.0008)
        litter = max(0.0, litter + 0.002 - COLLECTOR_CLEAR * 0.5)
        dT = 0.0
        if litter >= LEAVE_LINE:
            dT -= T_DOWN
        elif litter < COMFORT_LINE:
            dT += T_UP if T < 0.6 else T_UP / 2
        if S < SEAL_SHOAL_LOW:
            dT -= 0.01
        dT -= SEAL_NET * (nets if 'net' in routes else 0)
        dT -= SEAL_DISTURB * (shell_h_total if False else 0.0)
        T = min(1.0, max(0.2, T + dT))
        T_min = min(T_min, T)
        if T < 0.5:
            gone_days += 1
    hunger_ok = (lost == 0 and hungry_days < 10)
    seals_ok = T >= 0.5
    shoal_ok = S_min >= 0.2 and S >= 0.35
    colony_ok = Ccol >= 0.6
    reasons = []
    if not hunger_ok:
        reasons.append('hunger')
    if not shoal_ok:
        reasons.append('shoal')
    if not seals_ok:
        reasons.append('seals')
    if not colony_ok:
        reasons.append('colony')
    return dict(strat=strat, seed=seed, people=P, lost=lost, hungry_days=hungry_days, thirst_days=thirst_days,
                S_end=float(S), S_min=float(S_min), seal_T=float(T), seal_gone_days=gone_days, colony=float(Ccol),
                build_h=float(build_h), eaten_share=float(eaten_total / need_total), stock_end=float(sum(st.values())),
                litter=float(litter), beds=len(beds), fail=bool(reasons), reasons=reasons)


def need_short(st, P):
    # harvest a little early only if the stock is under two days
    return (st['dried'] + st['staple'] + st['packs'] + st['eggs']) < 2.0 * KCAL_PER_PERSON * P


def simulate(seeds=range(1, 61), scenarios=('spring', 'autumn', 'long', 'village')):
    out = {}
    for sc in scenarios:
        start, days, ppl = SCENARIOS[sc]
        out[sc] = {s: [run(seed, s, start, days, ppl) for seed in seeds] for s in NAMES}
    return out


def summarize(runs):
    n = len(runs)
    reasons = {}
    for r in runs:
        for k in r['reasons']:
            reasons[k] = reasons.get(k, 0) + 1
    return dict(n=n,
                fail_rate=sum(r['fail'] for r in runs) / n,
                people_kept=float(np.mean([r['people'] for r in runs])),
                hungry_days=float(np.mean([r['hungry_days'] for r in runs])),
                S_end=float(np.mean([r['S_end'] for r in runs])),
                S_min=float(np.mean([r['S_min'] for r in runs])),
                seal_T=float(np.mean([r['seal_T'] for r in runs])),
                seals_gone_share=sum(r['seal_T'] < 0.5 for r in runs) / n,
                colony=float(np.mean([r['colony'] for r in runs])),
                build_h=float(np.mean([r['build_h'] for r in runs])),
                reasons=reasons)


def report_table(res):
    lines = []
    for sc, per in res.items():
        lines.append('### scenario: %s (%d people, %d days from day %d)' % (sc, SCENARIOS[sc][2], SCENARIOS[sc][1], SCENARIOS[sc][0]))
        lines.append('| strategy | fail share | people kept (kept) | hungry days | shoal end | shoal min | seal trust | seals gone | colony | build hours | main failure causes |')
        lines.append('|---|---|---|---|---|---|---|---|---|---|---|')
        for s in NAMES:
            m = summarize(per[s])
            rs = ', '.join('%s %d' % (k, v) for k, v in sorted(m['reasons'].items(), key=lambda kv: -kv[1])) or 'none'
            lines.append('| %s | %.2f | %.2f | %.1f | %.2f | %.2f | %.2f | %.2f | %.2f | %.0f | %s |' % (
                s, m['fail_rate'], m['people_kept'], m['hungry_days'], m['S_end'], m['S_min'], m['seal_T'],
                m['seals_gone_share'], m['colony'], m['build_h'], rs))
        lines.append('')
    return '\n'.join(lines)


if __name__ == '__main__':
    res = simulate()
    print(report_table(res))
    outdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
    os.makedirs(outdir, exist_ok=True)
    with open(os.path.join(outdir, 'food_results.json'), 'w') as f:
        json.dump({sc: {s: summarize(v) for s, v in per.items()} for sc, per in res.items()}, f, indent=1, sort_keys=True)
