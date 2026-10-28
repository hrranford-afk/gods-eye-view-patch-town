/**
 * Old Worcester: how the town got to be the way it is, so New Worcester can
 * learn from it. Two sources, both per census neighbourhood (LSOA):
 *
 *   growth  new-build home sales since 1995 (Land Registry Price Paid, a
 *           new home's first sale): how many homes each area gained, when
 *   then    Census 2011 next to Census 2021: cars, how people got to work,
 *           health, population
 *
 * attachHistory adds the results to census areas as plain numbers, so every
 * planner tool (attribute, relate, rank, …) can use them like any other.
 */
import { pointInGeometry } from './census.js';

/** The eras new homes are counted in. */
export const ERAS = Object.freeze([
  ['1995-2004', 1995, 2004],
  ['2005-2014', 2005, 2014],
  ['2015-2025', 2015, 2025],
]);

/**
 * Count new-build sales (with lon/lat) per area and era. Returns
 * { code: { newHomes, byEra: { era: n }, meanYear } }.
 */
export function growthByArea(areas, sales) {
  const out = Object.fromEntries(areas.map((a) => [a.code, { newHomes: 0, byEra: Object.fromEntries(ERAS.map(([e]) => [e, 0])), yearSum: 0 }]));
  for (const s of sales) {
    const a = areas.find((x) => pointInGeometry([s.lon, s.lat], x.geometry));
    if (!a) continue;
    const g = out[a.code];
    g.newHomes++;
    g.yearSum += s.year;
    const era = ERAS.find(([, from, to]) => s.year >= from && s.year <= to);
    if (era) g.byEra[era[0]]++;
  }
  for (const g of Object.values(out)) {
    g.meanYear = g.newHomes ? Math.round(g.yearSum / g.newHomes) : null;
    delete g.yearSum;
  }
  return out;
}

/** 2011 travel-to-work categories (QS701EW) → planner modes. */
const TRAVEL_2011 = Object.freeze({
  'Work mainly at or from home': 'home',
  'Underground, metro, light rail, tram': 'rail',
  Train: 'rail',
  'Bus, minibus or coach': 'bus',
  Taxi: 'car',
  'Motorcycle, scooter or moped': 'car',
  'Driving a car or van': 'car',
  'Passenger in a car or van': 'car',
  Bicycle: 'cycle',
  'On foot': 'walk',
  'Other method of travel to work': 'other',
});

/**
 * Census 2011 figures per area from Nomis rows (CELL_NAME / OBS_VALUE):
 * travel (QS701EW), cars (KS404EW), health (KS301EW), population (KS101EW).
 */
export function census2011ByArea({ travel = [], cars = [], health = [], population = [] }) {
  const out = {};
  const get = (code) => (out[code] ||= { travel: { car: 0, bus: 0, rail: 0, cycle: 0, walk: 0, home: 0, other: 0, total: 0 } });
  for (const r of travel) {
    const a = get(r.GEOGRAPHY_CODE);
    const v = Number(r.OBS_VALUE);
    if (/^All categories/.test(r.CELL_NAME)) a.travel.total = v; // includes people not in work
    else if (r.CELL_NAME === 'Not in employment') a.travel.notWorking = v;
    else if (TRAVEL_2011[r.CELL_NAME]) a.travel[TRAVEL_2011[r.CELL_NAME]] += v;
  }
  for (const r of cars) {
    const a = get(r.GEOGRAPHY_CODE);
    if (/^All categories/.test(r.CELL_NAME)) a.households = Number(r.OBS_VALUE);
    else if (r.CELL_NAME === 'No cars or vans in household') a.noCarCount = Number(r.OBS_VALUE);
  }
  for (const r of health) {
    const a = get(r.GEOGRAPHY_CODE);
    if (/^All categories/.test(r.CELL_NAME)) a.healthTotal = Number(r.OBS_VALUE);
    else if (r.CELL_NAME === 'Bad health' || r.CELL_NAME === 'Very bad health') a.badCount = (a.badCount || 0) + Number(r.OBS_VALUE);
  }
  for (const r of population) {
    if (/^All usual residents/.test(r.CELL_NAME)) get(r.GEOGRAPHY_CODE).residents = Number(r.OBS_VALUE);
  }
  return out;
}

const share = (part, total) => (total ? part / total : null);

/**
 * Add history to census areas as plain numeric fields any tool can use:
 *   newHomes, newHomesShare (new homes since 1995 / households 2021),
 *   newHomes1995_2004, newHomes2005_2014, newHomes2015_2025, meanBuildYear
 *   noCar2011, carCommute2011 / carCommute2021, cycleCommute…, walkCommute…,
 *   badHealth2011, residents2011, residentsChange
 * Commute shares are of people who travel (not working from home).
 */
export function attachHistory(areas, { growth = {}, then = {} } = {}) {
  for (const a of areas) {
    const g = growth[a.code];
    if (g) {
      a.newHomes = g.newHomes;
      a.newHomesShare = a.households ? Math.round((g.newHomes / a.households) * 1000) / 1000 : null;
      for (const [era] of ERAS) a[`newHomes${era.replace('-', '_')}`] = g.byEra[era];
      a.meanBuildYear = g.meanYear;
    }
    const t = then[a.code];
    const travels2021 = a.travel ? a.travel.total - a.travel.home : 0;
    for (const mode of ['car', 'cycle', 'walk', 'bus']) {
      a[`${mode}Commute2021`] = a.travel ? share(a.travel[mode], travels2021) : null;
    }
    if (t) {
      const travels2011 = t.travel.total - (t.travel.notWorking || 0) - t.travel.home;
      for (const mode of ['car', 'cycle', 'walk', 'bus']) a[`${mode}Commute2011`] = share(t.travel[mode], travels2011);
      a.workFromHome2011 = share(t.travel.home, t.travel.total - (t.travel.notWorking || 0));
      a.noCar2011 = share(t.noCarCount, t.households);
      a.badHealth2011 = share(t.badCount, t.healthTotal);
      a.residents2011 = t.residents ?? null;
      a.residentsChange = t.residents && a.residents ? Math.round(((a.residents - t.residents) / t.residents) * 1000) / 1000 : null;
    }
  }
  return areas;
}

