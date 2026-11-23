# collector_econ: the beach litter collector and the tender ship loop (research/BEACH_COLLECTOR.md section 7 and EVOLUTION_TREE.md,
# "The tender ship and the rubbish economy"). Day-stepped, two tides a day, deterministic from the seed.
# The risk is the game: deliver too much and the shore is buried. Quiet stakes only: seals leave, the harbour fouls, a few people
# are unwell. Always a way back. People are counted, never tracked. All numbers below are TUNING unless a tag says otherwise.
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np

import eco_common as C
import shore_catch as S
import wildlife_place as P

# ---- the machine (BEACH_COLLECTOR.md section 2, TUNING; solar numbers PLAUSIBLE background) --------------------------------
HOPPER_KG = 4.5              # 15 L at 0.3 kg/L
PICK_S = 17.0                # approach 5 + grab 9 + check 3 seconds (BEACH_COLLECTOR section 6)
PICK_EFF = 0.65              # TUNING: share of working time that is picking, the rest is waits, double takes, swash pauses
SPEED = 0.2                  # m/s search crawl (0.15 to 0.25)
PANEL_M2, PANEL_EFF, PANEL_AGE = 0.4, 0.18, 0.7      # TUNING: aged panel at 70 percent of new
WORK_KW = 0.032              # TUNING: about 35 W electrical while driving and picking
STANDBY_KWH = 0.003
BATT_KWH, BATT_RESERVE = 0.12, 0.024   # usable aged battery, 20 percent reserve
STUCK_P = 0.01               # TUNING per working day
MISPICK = 0.03               # BEACH_COLLECTOR section 6: shells and stones fool it about 3 in 100
REFLOAT_TIDE = 0.35          # TUNING: share of uncollected litter the next tide floats off again (section 5: 30 to 60 percent by the next spring tide)
ITEM_KG = 0.04               # TUNING: average item 40 g (section 5)
MATERIALS = ('plastic', 'glass', 'metal', 'rope', 'other')
MAT_SHARE = (59.0, 6.0, 4.0, 7.0, 9.0)               # section 5 composition by count, natural wrack (15) left out
MAT_KG = (0.012, 0.150, 0.020, 0.080, 0.100)         # TUNING mean kg per item by material (section 5 mass ranges)
# ---- the tender, the village and the quiet stakes -----------------------------------------------------------------------
TENDER_INTERVAL = (8.0, 14.0)    # TUNING: nominal days between calls, seeded per world
TENDER_LATE_PER_VISIT = 0.25     # TUNING: the clock wears, each call is 0.25 day later than the one before
TENDER_SKIP_P = 0.04             # TUNING: a call that never comes
TENDER_MAX_KG = 20.0             # BEACH_COLLECTOR section 9: 20 kg max per visit reaches the stockpile
NORMAL_DELIVERY_KG = 4.0         # section 9: 2 to 8 kg per visit normal
USABLE = 0.85                    # share of collected goods that is usable after sorting
STOCK_CAP = 40.0                 # kg the landing store holds
PILE_DECAY = 0.01                # per day the sea spreads a pile
PILE_REACH_M = 300.0             # a pile at the landing fouls haul-outs within this, linearly less with distance
POP = 30                         # settlers, counted
ILL_FROM_KG_M = 1.0              # load at which people start to feel it
ILL_PER_KG_M = 0.05              # share of people unwell per kg/m above that
FOUL_FROM_KG_M = 1.5             # load at which the harbour mouth starts to foul
BUILD_GOAL_KG = 80.0             # built into the village by day 200 for "thriving"
SIGNS = dict(ill=2.0, foul=0.5)  # noticing thresholds (people unwell, fouling index)


def build_base(seed):
    # everything the economy needs from the world, small and picklable (the world arrays are dropped); no clock yet
    w = C.load_world(seed)
    segs = S.build_shores(w, seed)
    village = S.choose_landing(w, segs, seed)
    wl = P.place_wildlife(w, segs, village, seed)
    ctx = dict(seed=int(seed), province=w.province, segs=segs, village=village, wl=wl,
               catch=S.seed_catch_summary(segs), isl=S.island_catch(segs, w))
    col = None
    if village is not None and village['collector_seg'] is not None:
        col = segs[village['collector_seg']]
    ctx['collector'] = col
    # nearest shore segment of the landing and of each seal site decides their natural litter
    def nearest(x, y):
        return min(segs, key=lambda s: (math.hypot(s['xy'][0] - x, s['xy'][1] - y), s['id']))['id']
    ctx['landing_seg'] = nearest(*village['xy']) if village else None
    ctx['site_seg'] = [nearest(*s['xy']) for s in wl['seal_sites']]
    r = C.rng_for(seed, 51)
    ctx['tender'] = dict(interval=float(TENDER_INTERVAL[0] + (TENDER_INTERVAL[1] - TENDER_INTERVAL[0]) * r.random()), phase=float(2 + 6 * r.random()))
    return ctx


def with_clock(base, days, start_doy):
    # the same world on a given calendar: weather schedule and tide multipliers depend on the start day
    ctx = dict(base)
    ctx.update(days=int(days), start_doy=int(start_doy), storm=C.storm_schedule(base['seed'], start_doy, days), mult_cache={})
    return ctx


def build_ctx(seed, days, start_doy):
    return with_clock(build_base(seed), days, start_doy)


def mult(ctx, seg_id, day):
    key = (seg_id, day)
    mc = ctx['mult_cache']
    if key not in mc:
        st = ctx['storm'][day]
        mc[key] = (S.tide_multiplier(ctx['seed'], seg_id, day, 0, ctx['start_doy'], st), S.tide_multiplier(ctx['seed'], seg_id, day, 1, ctx['start_doy'], st))
    return mc[key]


def tender_timetable(ctx):
    # seeded old timetable that drifts late; storms push a call back; a few calls never come
    r = C.rng_for(ctx['seed'], 52)
    iv, ph = ctx['tender']['interval'], ctx['tender']['phase']
    out = []
    k = 0
    prev = -10
    while True:
        nominal = ph + k * iv
        if nominal > ctx['days'] + 30:
            break
        late = TENDER_LATE_PER_VISIT * k + 0.4 * r.standard_normal()
        skip = r.random() < TENDER_SKIP_P
        actual = int(round(nominal + max(late, -1.0)))
        actual = max(actual, prev + 3)
        j = 0
        while actual < len(ctx['storm']) and ctx['storm'][actual] >= 4.0 and j < 4:
            actual += 1
            j += 1
        if not skip:
            out.append(dict(k=k, nominal=nominal, day=actual, late=actual - nominal))
            prev = actual
        k += 1
    return out


# ---- player policies (simple on purpose) ---------------------------------------------------------------------------------
class Careful:
    name = 'careful'

    def order(self, st):
        if st['load'] > 0.5 * P.STAY_KG_PER_M * 2:           # any real pile: ask for nothing
            return 0.0
        want = 10.0 + 1.5 * st['interval'] - st['stock']
        return float(min(8.0, max(0.0, want)))

    def build(self, st):
        return 1.5

    def clear(self, st):
        return 6.0 if st['pile'] > 0 else 0.0


class Greedy:
    name = 'greedy'
    NOTICE_DELAY = 14

    def __init__(self):
        self.notice_day = None
        self.settled_since = None

    def mode(self, st):
        if self.notice_day is None and st['signs']:
            self.notice_day = st['day']
        if self.notice_day is None or st['day'] < self.notice_day + self.NOTICE_DELAY:
            return 'push'
        if self.settled_since is not None:
            return 'settled'
        if st['load'] <= P.STAY_KG_PER_M and st['pile'] < 1.0:
            self.settled_since = st['day']
            return 'settled'
        return 'recover'

    def order(self, st):
        m = self.mode(st)
        return {'push': TENDER_MAX_KG, 'recover': 0.0, 'settled': 4.0}[m]

    def build(self, st):
        return {'push': 1.2, 'recover': 0.5, 'settled': 1.0}[self.mode(st)]

    def clear(self, st):
        return {'push': 0.0, 'recover': 12.0, 'settled': 3.0}[self.mode(st)]


class Ignoring:
    name = 'ignoring'

    def order(self, st):
        return 0.0

    def build(self, st):
        return 0.0

    def clear(self, st):
        return 0.0


class Scripted:
    # the recovery test: a tender delivering mult x the normal amount for push_days, then the village stops and clears by hand
    def __init__(self, factor, push_days=60, crew_kg_day=12.0):
        self.factor, self.push_days, self.crew = factor, push_days, crew_kg_day
        self.name = 'stress_%gx' % factor

    def order(self, st):
        return NORMAL_DELIVERY_KG * self.factor if st['day'] < self.push_days else 0.0

    def build(self, st):
        return 0.0

    def clear(self, st):
        return self.crew if st['day'] >= self.push_days else 0.0


POLICIES = dict(careful=Careful, greedy=Greedy, ignoring=Ignoring)


# ---- the simulation ----------------------------------------------------------------------------------------------------------
def run_sim(ctx, policy, ledger=None, tender_cap=TENDER_MAX_KG, days=None, hopper_kg=HOPPER_KG):
    ledger = ledger if ledger is not None else C.Ledger()
    days = min(days or ctx['days'], ctx['days'])
    seed, sd = ctx['seed'], ctx['start_doy']
    village, col, wl = ctx['village'], ctx['collector'], ctx['wl']
    sites = wl['seal_sites']
    colony = P.SealColony(sites)
    visits = tender_timetable(ctx) if village is not None else []
    vi = 0
    frontage = village['frontage_m'] if village else 40.0
    L = col['length_m'] if col else 0.0
    rate = col['rate_items_m_tide'] if col else 0.0
    # natural litter stock (items per m) for each distinct segment that matters here
    nat = {}
    for sid in set([ctx['landing_seg']] + list(ctx['site_seg'])):
        if sid is not None:
            nat[sid] = ctx['segs'][sid]['rate_items_m_tide'] / REFLOAT_TIDE      # start at the quiet-weather balance
    r_pick = C.rng_for(seed, 61)
    S_line = rate * L / REFLOAT_TIDE if col else 0.0
    batt = BATT_KWH
    hop_kg = 0.0
    hop_items = 0
    stuck_until = -1
    stock = 5.0 if village else 0.0
    pile = 0.0
    built = 0.0
    fouling = 0.0
    unwell_now = 0.0
    ill_days = 0.0
    order_next = 0.0
    tot = dict(items=0, kg=0.0, mis=0, specials=0, specials_lost=0, work_h=0.0, fills=0, full_days=0, stuck=0, park=0, work_days=0,
               credited_items=0, credited_kg=0.0)
    mat_kg = {m: 0.0 for m in MATERIALS}
    mat_n = {m: 0 for m in MATERIALS}
    kg_by_month = np.zeros(12)
    v_stats = dict(visits=0, empty_calls=0, pickup_kg=[], delivered_kg=0.0, over_kg=0.0, ordered_kg=0.0, late=[], dup_refused=0)
    peak_load = 0.0
    harm_days = 0
    first_harm = None
    last_harm = None
    seals_series = []
    left_any_day = 0
    peak_pile = 0.0
    load_series = []
    st = dict(day=0, load=0.0, pile=0.0, stock=stock, interval=ctx['tender']['interval'], signs=False)
    for day in range(days):
        doy = sd + day
        month = C.month_of(doy)
        storm = ctx['storm'][day]
        # -- natural litter on each tracked shore (two tides)
        for sid in nat:
            m0, m1 = mult(ctx, sid, day)
            r_ = ctx['segs'][sid]['rate_items_m_tide']
            nat[sid] = (nat[sid] * (1 - REFLOAT_TIDE) + r_ * m0) * (1 - REFLOAT_TIDE) + r_ * m1
        # -- tender call (morning)
        while vi < len(visits) and visits[vi]['day'] < day:
            vi += 1
        if village is not None and vi < len(visits) and visits[vi]['day'] == day:
            v = visits[vi]
            vi += 1
            v_stats['visits'] += 1
            v_stats['late'].append(v['late'])
            pick_kg = hop_kg
            delivered = min(order_next, tender_cap)
            ok_p = ledger.claim('empty:%d:%d:%d:%d' % (seed, village['island'], day, 0))
            ok_d = ledger.claim('delivery:%d:%d' % (seed, v['k']))
            if not ok_d:
                v_stats['dup_refused'] += 1
            if ok_p and pick_kg > 0:
                stock += pick_kg * USABLE
                v_stats['pickup_kg'].append(pick_kg)
            hop_kg = 0.0
            hop_items = 0
            if ok_d and delivered > 0:
                room = max(0.0, STOCK_CAP - stock)
                into = min(delivered, room)
                stock += into
                pile += delivered - into                     # what the store cannot hold lands on the shore
                v_stats['delivered_kg'] += delivered
                v_stats['over_kg'] += delivered - into
            v_stats['ordered_kg'] += order_next
            if pick_kg < 0.05 and delivered <= 0:
                v_stats['empty_calls'] += 1
            stock = min(stock, STOCK_CAP)
            order_next = -1.0                                # ask the player again after this call
        # -- collector working day
        if col is not None:
            for t in (0, 1):
                n_arr = int(C.rng_for(seed, 43, day, t).poisson(max(0.0, rate * mult(ctx, col['id'], day)[t] * L)))
                S_line = S_line * (1 - REFLOAT_TIDE) + n_arr
            irr = 0.5 + 2.5 * (1.0 - C.season_w(doy))                       # kWh per m2 per day, 0.5 midwinter, 3.0 midsummer (PLAUSIBLE)
            cloud = 0.15 if storm >= 3 else 0.35 + 0.65 * r_pick.random()
            e_sol = PANEL_M2 * PANEL_EFF * irr * cloud * PANEL_AGE
            worked = False
            if storm >= 3.0:
                tot['park'] += 1                                              # PARK_STORM
            elif stuck_until >= day:
                pass
            elif hop_kg >= 0.98 * hopper_kg:
                tot['full_days'] += 1                                         # FULL: waits for the tender
            else:
                if r_pick.random() < STUCK_P:
                    stuck_until = day + 1
                    tot['stuck'] += 1
                else:
                    work_h = min(C.daylight_hours(doy) * 0.9, max(0.0, (batt + e_sol - BATT_RESERVE) / WORK_KW))
                    spacing = L / max(S_line, 1.0)
                    per = PICK_S / PICK_EFF + min(spacing, 60.0) / SPEED
                    cap_n = int(work_h * 3600.0 / per)
                    room_n = int((hopper_kg - hop_kg) / 0.037)
                    n = int(min(S_line, cap_n, room_n))
                    if n > 0:
                        counts = r_pick.multinomial(n, np.array(MAT_SHARE) / sum(MAT_SHARE))
                        kgs = [c * k * math.exp(0.15 * r_pick.standard_normal() / math.sqrt(max(c, 1))) for c, k in zip(counts, MAT_KG)]
                        mis = int(r_pick.binomial(n, MISPICK))
                        mass = float(sum(kgs))
                        if hop_kg + mass > hopper_kg:
                            f = (hopper_kg - hop_kg) / mass
                            mass *= f
                            kgs = [k * f for k in kgs]
                            n = int(n * f)
                        hop_kg += mass
                        hop_items += n
                        if hop_kg >= 0.98 * hopper_kg:
                            tot['fills'] += 1
                        S_line -= n
                        tot['items'] += n
                        tot['kg'] += mass
                        tot['mis'] += mis
                        kg_by_month[month] += mass
                        for m_, c_, k_ in zip(MATERIALS, counts, kgs):
                            mat_n[m_] += int(c_)
                            mat_kg[m_] += k_
                        used = work_h * WORK_KW
                        tot['work_h'] += work_h
                        tot['work_days'] += 1
                        batt = max(0.0, batt - used)
                        worked = True
                        if ledger.claim('find:%d:%d:%d:%d' % (seed, col['id'], day, 0)):
                            tot['credited_items'] += n
                            tot['credited_kg'] += mass
                        # a rare story find (a bottle with a message, a carved float): one per find key, claimed once
                        p_sp = 0.01 * min(1.0, rate * L / 50.0)
                        if C.rng_for(seed, 44, col['id'], day).random() < p_sp:
                            if ledger.claim('special:%d:%d:%d' % (seed, col['id'], day)):
                                tot['specials'] += 1
            batt = min(BATT_KWH, batt + e_sol - STANDBY_KWH)
            batt = max(batt, 0.0)
        # -- village: policy asks, builds, clears
        interval = ctx['tender']['interval']
        loadv = (pile + nat.get(ctx['landing_seg'], 0.0) * ITEM_KG * frontage) / frontage if village else 0.0
        st.update(day=day, load=loadv, pile=pile, stock=stock, interval=interval,
                  signs=(unwell_now >= SIGNS['ill'] or fouling > SIGNS['foul'] or any(f < 0.5 for f in colony.fid)))
        if order_next < 0:
            order_next = float(max(0.0, policy.order(st))) if village else 0.0
        elif day == 0:
            order_next = float(max(0.0, policy.order(st))) if village else 0.0
        b = min(float(policy.build(st)), stock) if village else 0.0
        stock -= b
        built += b
        clr = min(float(policy.clear(st)), pile) if village else 0.0
        pile -= clr
        stock += min(STOCK_CAP - min(stock, STOCK_CAP), 0.3 * clr)           # a little of what is cleared is worth keeping
        pile *= (1.0 - PILE_DECAY) * (0.97 if storm >= 4 else 1.0)
        peak_pile = max(peak_pile, pile)
        # -- load at the landing and what it does
        loadv = (pile + nat.get(ctx['landing_seg'], 0.0) * ITEM_KG * frontage) / frontage if village else 0.0
        peak_load = max(peak_load, loadv)
        unwell_now = POP * min(1.0, ILL_PER_KG_M * max(0.0, loadv - ILL_FROM_KG_M))
        ill_days += unwell_now
        if loadv > FOUL_FROM_KG_M:
            fouling = min(1.0, fouling + 0.03)
        elif loadv < 0.8:
            fouling = max(0.0, fouling - 0.02)
        # -- seals feel the pile and the natural litter near their rock
        loads = []
        for i, s in enumerate(sites):
            sid = ctx['site_seg'][i]
            nl = nat[sid] * ITEM_KG
            pw = 0.0
            if village and s['dist_landing_m'] is not None:
                pw = max(0.0, 1.0 - s['dist_landing_m'] / PILE_REACH_M)
            loads.append(nl + pw * (pile / frontage))
        colony.step(loads)
        n_left = sum(1 for f in colony.fid if f < 0.5)
        left_any_day += 1 if n_left else 0
        harm = (unwell_now >= SIGNS['ill']) or (fouling > SIGNS['foul']) or n_left > 0
        if harm:
            harm_days += 1
            first_harm = day if first_harm is None else first_harm
            last_harm = day
        if day % 5 == 0:
            seals_series.append(colony.present(month))
            load_series.append(round(loadv, 3))
        st['day'] = day
        # the player replans at the call days only
    base_seals = P.peak_seals(wl)
    seals_end = colony.present(C.month_of(sd + days - 1))
    seals_expected_end = sum(P.seal_count(x, C.month_of(sd + days - 1), 1.0) for x in sites)
    sites_back = sum(1 for i in range(len(sites)) if colony.returned[i])
    sites_ever_left = sum(1 for e in colony.ever_left if e)
    load_end = (pile + nat.get(ctx['landing_seg'], 0.0) * ITEM_KG * frontage) / frontage if village else 0.0
    harm_free_end = (unwell_now < SIGNS['ill']) and fouling <= SIGNS['foul'] and load_end < P.LEAVE_KG_PER_M
    seals_all_trust = all(f >= P.FID_BACK for f in colony.fid)
    had_harm = first_harm is not None
    res = dict(policy=policy.name, seed=seed, province=ctx['province'], days=days, start_doy=sd, has_landing=village is not None,
               has_collector=col is not None, collector_class=(col['klass'] if col else 'none'),
               collector_rate=(round(rate, 3) if col else 0.0), collector_len_m=round(L, 1),
               items=tot['items'], kg=round(tot['kg'], 2), kg_per_day=round(tot['kg'] / days, 3), items_per_tide=round(tot['items'] / (2.0 * days), 2),
               credited_items=tot['credited_items'], credited_kg=round(tot['credited_kg'], 2),
               mispick_rate=round(tot['mis'] / max(1, tot['items'] + tot['mis']), 4), specials=tot['specials'],
               work_h_per_day=round(tot['work_h'] / days, 2), work_days=tot['work_days'], fills=tot['fills'], fills_per_week=round(tot['fills'] / (days / 7.0), 3),
               full_wait_days=tot['full_days'], stuck=tot['stuck'], storm_park_days=tot['park'],
               kg_by_month={str(i): round(float(kg_by_month[i]), 2) for i in range(12)},
               mat_kg={k: round(v, 2) for k, v in mat_kg.items()}, mat_items=mat_n,
               visits=v_stats['visits'], empty_calls=v_stats['empty_calls'],
               pickup_kg_per_visit=round(float(np.mean(v_stats['pickup_kg'])) if v_stats['pickup_kg'] else 0.0, 3),
               delivered_kg=round(v_stats['delivered_kg'], 2), ordered_kg=round(v_stats['ordered_kg'], 2), overflow_kg=round(v_stats['over_kg'], 2),
               tender_lateness_days_mean=round(float(np.mean(v_stats['late'])) if v_stats['late'] else 0.0, 2),
               tender_lateness_days_last=round(float(v_stats['late'][-1]) if v_stats['late'] else 0.0, 2),
               peak_load_kg_m=round(peak_load, 3), peak_pile_kg=round(peak_pile, 2), load_end_kg_m=round(load_end, 3), pile_end_kg=round(pile, 2),
               ill_person_days=round(ill_days, 1), unwell_end=round(unwell_now, 2), fouling_end=round(fouling, 2),
               built_kg=round(built, 2), stock_end=round(stock, 2),
               seal_baseline=base_seals, seals_min=int(min(seals_series)) if seals_series else 0, seals_end=seals_end,
               seal_sites=len(sites), seals_expected_end=seals_expected_end, sites_ever_left=sites_ever_left, sites_returned=sites_back, left_days=colony.left_days,
               harm_days=harm_days, first_harm_day=first_harm, last_harm_day=last_harm, had_harm=had_harm,
               harm_free_end=bool(harm_free_end), seals_all_trusting_end=bool(seals_all_trust),
               stable=bool(harm_free_end), thriving=bool(harm_free_end and built >= BUILD_GOAL_KG),
               recovered=bool(had_harm and harm_free_end),
               stuck_in_harm=bool(had_harm and not harm_free_end),
               notice_day=getattr(policy, 'notice_day', None), ledger_events=len(ledger), ledger_refused=ledger.refused)
    return res


def recovery_test(ctx, factor, push_days=None, test_days=None):
    # BEACH_COLLECTOR section 9.4: a tender that delivers factor x the normal amount, then the village stops and clears by hand.
    # Pass: the litter load falls under the seal comfort line within 30 days of stopping, with no reset.
    test_days = test_days or ctx['days']
    push_days = push_days or min(60, test_days // 3)
    ledger = C.Ledger()
    # run with a day-by-day probe: reuse run_sim but also capture the load curve via a wrapper policy
    probe = dict(loads=[])

    class Probe(Scripted):
        def clear(self, st):
            probe['loads'].append((st['day'], st['load']))
            return Scripted.clear(self, st)
    pol = Probe(factor, push_days=push_days)
    res = run_sim(ctx, pol, ledger=ledger, tender_cap=1e9, days=test_days)
    ld = probe['loads']
    peak = max((l for d, l in ld), default=0.0)
    ok_day = None
    trust_day = None
    for d, l in ld:
        if d >= push_days and ok_day is None and l < P.LEAVE_KG_PER_M:
            ok_day = d
        if d >= push_days and trust_day is None and l <= P.STAY_KG_PER_M:
            trust_day = d
    days_to_ok = (ok_day - push_days) if ok_day is not None else None
    days_to_trust = (trust_day - push_days) if trust_day is not None else None
    # was the load ever over the line at all
    exceeded = peak > P.LEAVE_KG_PER_M
    passed = (not exceeded) or (days_to_ok is not None and days_to_ok <= 30)
    return dict(seed=ctx['seed'], factor=factor, peak_load_kg_m=round(peak, 3), exceeded_leave_line=bool(exceeded),
                days_to_below_threshold=days_to_ok, days_to_seal_comfort=days_to_trust, passed=bool(passed), seal_sites_left=res['sites_ever_left'],
                seal_sites_returned=res['sites_returned'], seals_end=res['seals_end'], seal_baseline=res['seal_baseline'],
                frontage_m=(ctx['village']['frontage_m'] if ctx['village'] else None), overflow_kg=res['overflow_kg'],
                has_landing=ctx['village'] is not None)
