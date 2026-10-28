/**
 * The data atlas: every layer the planner has or wants, grouped by the
 * New Worcester compass, with where it comes from and how to get it.
 * `npm run planner -- atlas <town>` checks which are present and writes
 * atlas.json; missing layers are the to-do list for mapping.
 *
 * To add a layer: add an entry here first (status follows from `file`),
 * then the command that builds it.
 */

/** Compass themes, in the order NEW_WORCESTER.md gives them. */
export const COMPASS = Object.freeze([
  ['people', 'People and connection'],
  ['health', 'Health'],
  ['nature', 'Nature'],
  ['security', 'Security: homes, money, safety'],
  ['purpose', 'Purpose: work, learning, care'],
  ['movement', 'Time and movement'],
  ['land', 'Land and buildings'],
  ['voice', 'Voice: decisions and plans'],
]);

/**
 * Each layer: id, theme, name, source, licence, how to get it (`command`),
 * and `file` (in public/planner/<town>/) whose presence marks it mapped, or
 * `kinds` (place kinds in town.json) for layers that live in the town file.
 */
export const LAYERS = Object.freeze([
  // People and connection
  { id: 'census', theme: 'people', name: 'Households, residents, age, health, deprivation, cars (Census 2021, LSOA)', source: 'ONS / Nomis', licence: 'OGL', command: 'census', file: 'census.json' },
  { id: 'history', theme: 'people', name: 'Census 2011 beside 2021; new homes since 1995', source: 'ONS / Nomis; HM Land Registry', licence: 'OGL', command: 'history', file: 'history.json' },
  { id: 'meet', theme: 'people', name: 'Meeting places: cafés, pubs, libraries, community centres, places of worship', source: 'OpenStreetMap', licence: 'ODbL', command: 'import', kinds: ['meet:'] },
  { id: 'alone', theme: 'people', name: 'Households of one person aged 66+ (loneliness risk)', source: 'Census 2021 TS003', licence: 'OGL', command: 'census', file: 'census.json' },
  // Health
  { id: 'gps', theme: 'health', name: 'GP practices: list size, patient survey', source: 'Fingertips, NHS ODS, postcodes.io', licence: 'OGL', command: 'gps', file: 'gps.json' },
  { id: 'pharmacy', theme: 'health', name: 'Pharmacies and dentists', source: 'NHS ODS / NHS service search', licence: 'OGL', command: null },
  { id: 'food', theme: 'health', name: 'Food businesses: shops, takeaways, cafés, pubs (hygiene register)', source: 'Food Standards Agency', licence: 'OGL', command: 'food', file: 'food.json' },
  { id: 'air', theme: 'health', name: 'Air quality management areas', source: 'planning.data.gov.uk', licence: 'OGL', command: 'planning', file: 'planning.json' },
  // Nature
  { id: 'green', theme: 'nature', name: 'Parks, playgrounds, nature reserves (reachable from their edges)', source: 'OpenStreetMap', licence: 'ODbL', command: 'import', kinds: ['green:'] },
  { id: 'river', theme: 'nature', name: 'Rivers, crossings, banks', source: 'OpenStreetMap', licence: 'ODbL', command: 'analyse', file: 'river.json' },
  { id: 'trees', theme: 'nature', name: 'Tree cover and protected trees', source: 'planning.data.gov.uk; Forest Research', licence: 'OGL', command: null },
  // Security
  { id: 'flood', theme: 'security', name: 'Flood Zones 2 and 3', source: 'Environment Agency', licence: 'OGL', command: 'flood', file: 'flood.json' },
  { id: 'deprivation', theme: 'security', name: 'Indices of Deprivation 2025 (income, jobs, education, health, crime, barriers, living environment)', source: 'MHCLG', licence: 'OGL', command: 'deprivation', file: 'deprivation.json' },
  { id: 'prices', theme: 'security', name: 'House prices (every sale since 2015, medians per area)', source: 'HM Land Registry Price Paid', licence: 'OGL', command: 'prices', file: 'prices.json' },
  { id: 'income', theme: 'security', name: 'Household income (MSOA)', source: 'ONS', licence: 'OGL', command: null },
  { id: 'crime', theme: 'security', name: 'Street crime, last 12 months, counted per neighbourhood', source: 'data.police.uk', licence: 'OGL', command: 'crime', file: 'crime.json' },
  // Purpose
  { id: 'schools', theme: 'purpose', name: 'Schools (location)', source: 'OpenStreetMap', licence: 'ODbL', command: 'import', kinds: ['school'] },
  { id: 'schoolRegister', theme: 'purpose', name: 'Schools register: phase, places, pupils', source: 'DfE Get Information About Schools', licence: 'OGL', command: 'schools', file: 'schools.json' },
  { id: 'jobs', theme: 'purpose', name: 'Jobs by area (workplace employment)', source: 'ONS BRES via Nomis', licence: 'OGL', command: null },
  // Movement
  { id: 'streets', theme: 'movement', name: 'Streets and paths (walking network)', source: 'OpenStreetMap', licence: 'ODbL', command: 'import', file: 'town.json' },
  { id: 'buses', theme: 'movement', name: 'Bus timetable: stops, frequency', source: 'Bus Open Data Service', licence: 'OGL', command: 'planner-gtfs.py', file: 'buses.json' },
  { id: 'traffic', theme: 'movement', name: 'Traffic and cycle counts 2000–2025 (region)', source: 'DfT road traffic statistics', licence: 'OGL', command: 'traffic', regionFile: 'traffic/west-midlands.json' },
  { id: 'collisions', theme: 'movement', name: 'Road collisions, last 5 years, by severity', source: 'DfT STATS19', licence: 'OGL', command: 'collisions', file: 'collisions.json' },
  { id: 'cycleRoutes', theme: 'movement', name: 'Cycle routes and cycle parking', source: 'OpenStreetMap', licence: 'ODbL', command: null },
  // Land
  { id: 'vacant', theme: 'land', name: 'Empty shops (as mapped)', source: 'OpenStreetMap', licence: 'ODbL', command: 'analyse', file: 'vacant.geojson' },
  { id: 'brownfield', theme: 'land', name: 'Brownfield land register (current sites, homes capacity)', source: 'planning.data.gov.uk', licence: 'OGL', command: 'planning', file: 'planning.json' },
  { id: 'heritage', theme: 'land', name: 'Listed buildings and conservation areas', source: 'planning.data.gov.uk', licence: 'OGL', command: 'planning', file: 'planning.json' },
  // Voice
  { id: 'questions', theme: 'voice', name: 'Questions asked of the planner (the question loop)', source: 'This project', licence: '—', command: null, file: 'questions.json' },
  { id: 'scenarios', theme: 'voice', name: 'Scenarios for New Worcester', source: 'This project', licence: '—', command: 'scenarios', file: 'scenarios.json' },
  { id: 'wards', theme: 'voice', name: 'Wards and councillors; planning applications; local plan sites', source: 'ONS; planning.data.gov.uk', licence: 'OGL', command: null },
]);

/**
 * Status of every layer for one town: `mapped` (with a count or date where
 * known) or `missing`. `has(file)` and `kinds` describe what the town folder
 * holds; `info(file)` may return { date, count } for a present file.
 */
export function atlasStatus({ has, kinds = {}, info = () => ({}) }) {
  return LAYERS.map((l) => {
    let mapped = false;
    let count = null;
    if (l.kinds) {
      count = Object.entries(kinds).filter(([k]) => l.kinds.some((p) => k === p || (p.endsWith(':') && k.startsWith(p)))).reduce((n, [, v]) => n + v, 0);
      mapped = count > 0;
    } else if (l.file || l.regionFile) {
      mapped = has(l.file || l.regionFile);
      if (mapped) ({ count = null } = info(l.file || l.regionFile));
    }
    const { date = null } = mapped && (l.file || l.regionFile) ? info(l.file || l.regionFile) : {};
    return { id: l.id, theme: l.theme, name: l.name, source: l.source, licence: l.licence, status: mapped ? 'mapped' : 'missing', count, date, command: l.command };
  });
}
