/**
 * Scenarios: a named set of changes to a town, scored on one scorecard
 * against the town as it is. This is how "New Worcester" ideas get tested.
 *
 * A scenario file (public/planner/<town>/scenarios/<id>.json):
 *   {
 *     id, name, description, assumptions: ["600 homes is an illustrative capacity", ...],
 *     changes: {
 *       addPlaces: [{ kind: 'gp', name, lon, lat }],      // new services
 *       addHomes:  [{ name, lon, lat, households }],        // new housing
 *       addRoads:  [ ...town-file road objects ],           // new links
 *     }
 *   }
 */
import { SERVICE_KINDS } from './osm.js';
import { analyseAccess } from './access.js';
import { busOrWalk } from './buses.js';

const NO_BUSES = Object.freeze({ stops: [], trips: [] });

/** A copy of the town with a scenario's changes applied. */
export function applyScenario(town, scenario) {
  const c = scenario.changes || {};
  return {
    ...town,
    roads: [...town.roads, ...(c.addRoads || [])],
    places: [
      ...town.places,
      ...(c.addPlaces || []).map((p, i) => ({ id: `scenario/${scenario.id}/place/${i}`, ...p })),
    ],
    homes: [
      ...town.homes,
      ...(c.addHomes || []).map((h, i) => ({
        id: `scenario/${scenario.id}/home/${i}`, lon: h.lon, lat: h.lat, w: h.households, need: h.need ?? null, added: true,
      })),
    ],
  };
}

function weightedMean(values, weights) {
  let s = 0;
  let n = 0;
  values.forEach((v, i) => {
    if (!Number.isFinite(v) || weights[i] <= 0) return;
    s += Math.min(v, 120) * weights[i];
    n += weights[i];
  });
  return n ? Math.round((s / n) * 10) / 10 : null;
}

/**
 * The scorecard for one version of the town: overall access score, share of
 * households within each walking target, and for GPs the average walk, the
 * bus-or-walk time, and the need-weighted walk (where need is highest).
 * `added` is the same set of measures for any homes the scenario added.
 */
export function scorecard(town, { buses = NO_BUSES } = {}) {
  const { summary } = analyseAccess(town);
  const card = {
    households: summary.homes,
    overallScore: Math.round(summary.overallScoreExact * 10) / 10,
    withinTarget: summary.shareOfHomesMeetingTarget,
  };
  const weights = town.homes.map((h) => h.w ?? 1);
  const needWeights = town.homes.map((h) => (h.w ?? 1) * (h.need ?? 0));
  const addedWeights = town.homes.map((h) => (h.added ? h.w ?? 1 : 0));
  const added = addedWeights.some((w) => w > 0) ? { households: addedWeights.reduce((a, b) => a + b, 0) } : null;
  const walks = {};
  for (const kind of Object.keys(SERVICE_KINDS)) {
    if (kind === 'bus') continue;
    const { walk, best } = busOrWalk(town, buses, kind);
    walks[kind] = walk;
    card[kind] = {
      walkMinutes: weightedMean(walk, weights),
      busOrWalkMinutes: weightedMean(best, weights),
      needWeightedWalkMinutes: weightedMean(walk, needWeights),
    };
    if (added) added[kind] = { walkMinutes: weightedMean(walk, addedWeights), busOrWalkMinutes: weightedMean(best, addedWeights) };
  }
  if (added) card.added = added;
  // Per-home walks, for comparing scenarios; not part of the published card.
  Object.defineProperty(card, 'walks', { value: walks, enumerable: false });
  return card;
}

/**
 * Who a change actually helps: existing households whose walk to a service
 * got at least `minMinutes` shorter, how much on average, and how many of
 * them are in households without a car (census share of their neighbourhood).
 */
function gains(town, baseCard, card, { minMinutes = 1 } = {}) {
  const out = {};
  for (const kind of Object.keys(baseCard.walks)) {
    const before = baseCard.walks[kind];
    const after = card.walks[kind];
    let hh = 0;
    let saved = 0;
    let noCar = 0;
    town.homes.forEach((h, i) => {
      const w = h.w ?? 1;
      if (w <= 0 || !Number.isFinite(before[i])) return;
      const d = Math.min(before[i], 120) - Math.min(after[i], 120);
      if (d < minMinutes) return;
      hh += w;
      saved += d * w;
      noCar += w * (h.noCar ?? 0);
    });
    if (hh) out[kind] = { households: Math.round(hh), averageMinutesSaved: Math.round((saved / hh) * 10) / 10, withoutCar: Math.round(noCar) };
  }
  return out;
}

/** Score the base town and each scenario; returns { base, scenarios: [{ id, name, card, change }] }. */
export function compareScenarios(town, scenarios, { buses = NO_BUSES } = {}) {
  const base = scorecard(town, { buses });
  const delta = (a, b) => (a == null || b == null ? null : Math.round((b - a) * 10) / 10);
  return {
    base,
    scenarios: scenarios.map((s) => {
      const card = scorecard(applyScenario(town, s), { buses });
      return {
        gains: gains(town, base, card),
        id: s.id,
        name: s.name,
        description: s.description,
        assumptions: s.assumptions || [],
        changes: s.changes || {},
        card,
        change: {
          overallScore: delta(base.overallScore, card.overallScore),
          gpWalkMinutes: delta(base.gp.walkMinutes, card.gp.walkMinutes),
          gpNeedWeightedWalkMinutes: delta(base.gp.needWeightedWalkMinutes, card.gp.needWeightedWalkMinutes),
          gpBusOrWalkMinutes: delta(base.gp.busOrWalkMinutes, card.gp.busOrWalkMinutes),
        },
      };
    }),
  };
}
