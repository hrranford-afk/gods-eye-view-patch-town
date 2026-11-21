# C06 — Infrastructure co-design review

**Verdict:** The optional `city_infra` sidecar is sound: keep building recipes and the existing district format unchanged. **Design only; no implementation approved.**

## 1. Simplest model

Radial (tree-only) cables with capacity and local brownouts are a good first lesson. A fixed-output generator is easiest; a repeating, deterministic output profile is a useful next experiment. Water can use a similar source-and-capacity tree. Congestion as longer *effective distance* is simple enough to explain.

**Simplify:** omit network losses, fuel, wear and automatic rerouting initially. **Keep:** disconnections, individual branch limits, costs and visible consequences. Crucial gap: C06's paper example has **6 kW supply against 8.8 kW demand** (homes 2.8, bakery 6). It cannot give a unique answer until shared-shortage allocation is defined. Also specify how a second source joins a tree.

## 2. Five-minute loop

Yes, potentially: **overload → choose larger cable or lower demand → watch one street brighten**, with costs and before/after figures. Smallest improvement: tap a dim building to highlight its limiting connection and show *why*.

First investigate C03's unexplained results: a brief brownout increasing net and a reopened road reducing net. Otherwise the player may be rewarded for the wrong fix.

## 3. Build order — options

- **C06a power:** direct follow-on from C03's power limit, clearest local failure; allocation maths needs agreement.
- **C06b water:** strong pipe-versus-cart choice; partial supply and stock accounting need rules.
- **C06c roads:** makes location matter most; feedback between traffic and demand is harder.

Build only one at a time.

## 4. Three exact paper tests

These are **proposed test rules**, not numbers already produced by code.

**P1 — Power, local bottleneck.** Source **9 kW**, zero losses; homes request **2.8 kW** via **2.0 kW** cable, bakery requests **6.0** via **6.0 kW** cable. Deliver **2.0** to homes (**71.43%**) and **6.0** to bakery (**100%**); total **8.0 kW**. Upgrade the homes' cable to **4.0 kW**: homes receive **2.8** (**100%**), bakery still **6.0**; total **8.8 kW**.

**P2 — Water, partial pipe.** Well **4.0 kL/min**; homes use **2.0** on an unrestricted branch; bakery wants **1.5** through a **1.0 kL/min** pipe. With no losses or cart top-up: homes **2.0**, bakery **1.0**, shortage **0.5**, total **3.0**. Raise bakery pipe to **2.0**: bakery **1.5**, shortage **0**, total **3.5**. Cart top-up remains a separate design choice.

**P3 — Roads, congestion.** *Proposed formula:* effective distance = cells × max(1, trips/capacity), using previous-tick trips. A **4-cell** route carries **6 trips/min** against capacity **4**: distance = **4 × 1.5 = 6**. With illustrative C03-style decay **0.8 per cell**, customer weight changes from **0.8⁴ = 0.4096** to **0.8⁶ = 0.262144** (**36% lower**). Increase capacity to **6**: weight returns to **0.4096**. C06 has **not** specified this formula.

## 5. Risks, ranked

1. **Undefined allocation maths** for shared power shortages and multiple sources.
2. **Misleading economics** from C03's unresolved oddities.
3. **Double counting** pipe/cart supplies or generating power twice.
4. **Unstable feedback** where traffic alters demand and demand alters traffic.
5. **AR readability/performance** with too many coloured networks and labels.

## 6. Section 8 — four owner questions

1. **First:** power = clearest shortage; water = simplest logistics contrast; roads = strongest spatial puzzle, hardest feedback.
2. **Generators:** fixed = predictable; wind profile = scheduling challenge; fuel = deeper economy, needs delivery rules.
3. **Brownouts:** city-wide = simplest, few location decisions; local = better engineering, more maths; staged = test both in sequence.
4. **Budget:** full costs now = meaningful investment choices, more balancing; display-only = easy prototype, weaker stakes; read-only cost comparison first = compromise.

## Checked / not checked

**Read:** C06 design note, C03 demo report and `DISTRICT.md` on `citylab/cloud-work`. **Calculated:** the three tests above using stated hypothetical assumptions. **Not checked:** running code, detailed experiment data, real iPad performance, hardware, or any new implementation. No other AIs contacted; no GitHub changes.

Sources: [C06](https://github.com/hrranford-afk/gods-eye-view-patch-town/blob/citylab/cloud-work/games/city-lab/shared/cloud/C06_INFRASTRUCTURE_DESIGN_NOTE.md) · [C03](https://github.com/hrranford-afk/gods-eye-view-patch-town/blob/citylab/cloud-work/games/city-lab/shared/cloud/C03_DISTRICT_DEMO.md) · [DISTRICT](https://github.com/hrranford-afk/gods-eye-view-patch-town/blob/citylab/cloud-work/games/city-lab/DISTRICT.md)
