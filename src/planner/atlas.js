/**
 * The data atlas: every layer the planner has or wants, grouped by the
 * New Worcester compass, with where it comes from and how to get it.
 * `npm run planner -- atlas <town>` checks which are present and writes
 * atlas.json; missing layers are the to-do list for mapping.
 *
 * To add a layer: add an entry here first (status follows from `file`),
 * then the command that builds it.
 *
 * Layers not mapped yet are the free-data inventory: each says how fine it
 * goes (`level`), how it's got (`access`: open, freeAccount — free but needs
 * a sign-up, which Harry decides — or notPublished), why it matters
 * (`value`), a `priority` (1 first) and a `url` that `atlas <town> --check`
 * probes to confirm it's reachable from here.
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
  { id: 'migration', theme: 'people', name: 'Born abroad, arrived 2011–2021, little or no English (Census 2021, LSOA)', source: 'ONS / Nomis (TS004, TS015, TS029)', licence: 'OGL', command: 'census', file: 'census.json' },
  { id: 'asylum', theme: 'people', name: 'People seeking asylum supported by the Home Office, per council per quarter since 2014 (no finer data published)', source: 'Home Office Asy_D11', licence: 'OGL', command: 'asylum', file: 'asylum.json' },
  { id: 'alone', theme: 'people', name: 'Households of one person aged 66+ (loneliness risk)', source: 'Census 2021 TS003', licence: 'OGL', command: 'census', file: 'census.json' },
  // Health
  { id: 'gps', theme: 'health', name: 'GP practices: list size, patient survey', source: 'Fingertips, NHS ODS, postcodes.io', licence: 'OGL', command: 'gps', file: 'gps.json' },
  { id: 'pharmacy', theme: 'health', name: 'Pharmacies and dentists (as mapped)', source: 'OpenStreetMap (official NHS lists not openly downloadable from here)', licence: 'ODbL', command: 'import', kinds: ['health:'] },
  { id: 'food', theme: 'health', name: 'Food businesses: shops, takeaways, cafés, pubs (hygiene register)', source: 'Food Standards Agency', licence: 'OGL', command: 'food', file: 'food.json' },
  { id: 'air', theme: 'health', name: 'Air quality management areas', source: 'planning.data.gov.uk', licence: 'OGL', command: 'planning', file: 'planning.json' },
  // Nature
  { id: 'green', theme: 'nature', name: 'Parks, playgrounds, nature reserves (reachable from their edges)', source: 'OpenStreetMap', licence: 'ODbL', command: 'import', kinds: ['green:'] },
  { id: 'river', theme: 'nature', name: 'Rivers, crossings, banks', source: 'OpenStreetMap', licence: 'ODbL', command: 'analyse', file: 'river.json' },
  { id: 'trees', theme: 'nature', name: 'Woodland and mapped trees', source: 'OpenStreetMap (no protected-tree data published for Worcester)', licence: 'ODbL', command: 'import', kinds: ['green:wood', 'tree'] },
  // Security
  { id: 'flood', theme: 'security', name: 'Flood Zones 2 and 3', source: 'Environment Agency', licence: 'OGL', command: 'flood', file: 'flood.json' },
  { id: 'deprivation', theme: 'security', name: 'Indices of Deprivation 2025 (income, jobs, education, health, crime, barriers, living environment)', source: 'MHCLG', licence: 'OGL', command: 'deprivation', file: 'deprivation.json' },
  { id: 'prices', theme: 'security', name: 'House prices (every sale since 2015, medians per area)', source: 'HM Land Registry Price Paid', licence: 'OGL', command: 'prices', file: 'prices.json' },
  { id: 'income', theme: 'security', name: 'Household income, total and after housing costs (FYE 2023, MSOA)', source: 'ONS small area income estimates', licence: 'OGL', command: 'income', file: 'income.json' },
  { id: 'crime', theme: 'security', name: 'Street crime, last 12 months, counted per neighbourhood', source: 'data.police.uk', licence: 'OGL', command: 'crime', file: 'crime.json' },
  // Purpose
  { id: 'schools', theme: 'purpose', name: 'Schools (location)', source: 'OpenStreetMap', licence: 'ODbL', command: 'import', kinds: ['school'] },
  { id: 'schoolRegister', theme: 'purpose', name: 'Schools register: phase, places, pupils', source: 'DfE Get Information About Schools', licence: 'OGL', command: 'schools', file: 'schools.json' },
  { id: 'jobs', theme: 'purpose', name: 'Jobs by neighbourhood (workplace employment, 2024)', source: 'ONS BRES via Nomis', licence: 'OGL', command: 'jobs', file: 'jobs.json' },
  // Movement
  { id: 'streets', theme: 'movement', name: 'Streets and paths (walking network)', source: 'OpenStreetMap', licence: 'ODbL', command: 'import', file: 'town.json' },
  { id: 'buses', theme: 'movement', name: 'Bus timetable: stops, frequency', source: 'Bus Open Data Service', licence: 'OGL', command: 'planner-gtfs.py', file: 'buses.json' },
  { id: 'traffic', theme: 'movement', name: 'Traffic and cycle counts 2000–2025 (region)', source: 'DfT road traffic statistics', licence: 'OGL', command: 'traffic', regionFile: 'traffic/west-midlands.json' },
  { id: 'collisions', theme: 'movement', name: 'Road collisions, last 5 years, by severity', source: 'DfT STATS19', licence: 'OGL', command: 'collisions', file: 'collisions.json' },
  { id: 'cycleRoutes', theme: 'movement', name: 'Cycle tracks, lanes and parking', source: 'OpenStreetMap', licence: 'ODbL', command: 'analyse', file: 'cycle.geojson' },
  // Land
  { id: 'vacant', theme: 'land', name: 'Empty shops (as mapped)', source: 'OpenStreetMap', licence: 'ODbL', command: 'analyse', file: 'vacant.geojson' },
  { id: 'brownfield', theme: 'land', name: 'Brownfield land register (current sites, homes capacity)', source: 'planning.data.gov.uk', licence: 'OGL', command: 'planning', file: 'planning.json' },
  { id: 'heritage', theme: 'land', name: 'Listed buildings and conservation areas', source: 'planning.data.gov.uk', licence: 'OGL', command: 'planning', file: 'planning.json' },
  // Voice
  { id: 'questions', theme: 'voice', name: 'Questions asked of the planner (the question loop)', source: 'This project', licence: '—', command: null, file: 'questions.json' },
  { id: 'scenarios', theme: 'voice', name: 'Scenarios for New Worcester', source: 'This project', licence: '—', command: 'scenarios', file: 'scenarios.json' },
  { id: 'wards', theme: 'voice', name: 'Electoral wards (May 2024)', source: 'ONS lookup', licence: 'OGL', command: 'wards', file: 'wards.json' },
  { id: 'applications', theme: 'voice', name: 'Planning applications and councillors', source: 'Not published openly for Worcester (none on planning.data.gov.uk; council portal not scraped)', licence: '—', command: null, unavailable: true },
  // Not mapped yet: the free-data inventory (see the header).
  { id: 'wellbeing', theme: 'people', name: 'Personal wellbeing: life satisfaction, happiness, anxiety (yearly)', source: 'ONS Annual Population Survey', licence: 'OGL', command: 'stats', file: 'stats/wellbeing.json', level: 'council', access: 'open', priority: 1, value: 'The happiness measure itself, to check the planner against', url: 'https://www.ons.gov.uk/peoplepopulationandcommunity/wellbeing/datasets/headlineestimatesofpersonalwellbeing' },
  { id: 'population', theme: 'people', name: 'Population by age each year, and why it changes (births, deaths, moves in and out)', source: 'ONS mid-year estimates', licence: 'OGL', command: 'stats', file: 'stats/population.json', level: 'LSOA / council', access: 'open', priority: 1, value: 'Is Worcester growing from births or arrivals (q34); homes, schools, GPs by 2035', url: 'https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates' },
  { id: 'census2021More', theme: 'people', name: 'More Census 2021: disability, unpaid carers, tenure, overcrowding, qualifications, work, ethnic group, distance to work', source: 'ONS / Nomis', licence: 'OGL', command: 'stats', file: 'stats/census2021More.json', level: 'LSOA', access: 'open', priority: 1, value: 'Carers and disabled people are the ones distance hurts most', url: 'https://www.nomisweb.co.uk/sources/census_2021_bulk' },
  { id: 'charities', theme: 'people', name: 'Charities and community groups (registered address, purpose)', source: 'Charity Commission register', licence: 'OGL', command: null, level: 'point', access: 'open', priority: 2, value: 'Where community life is organised, beyond buildings', url: 'https://register-of-charities.charitycommission.gov.uk/register/full-register-download' },
  { id: 'localHealth', theme: 'health', name: 'Life expectancy, deaths under 75, emergency admissions, child obesity', source: 'OHID Fingertips Local Health', licence: 'OGL', command: 'stats', file: 'stats/localHealth.json', level: 'MSOA', access: 'open', priority: 1, value: 'Outcomes, not just risks: how long people live, neighbourhood by neighbourhood', url: 'https://fingertips.phe.org.uk/profile/local-health' },
  { id: 'gpConditions', theme: 'health', name: 'GP disease registers: depression, diabetes, obesity, heart disease (per practice)', source: 'OHID Fingertips National GP profiles (QOF)', licence: 'OGL', command: 'stats', file: 'stats/gpConditions.json', level: 'GP practice', access: 'open', priority: 1, value: 'Depression and diabetes rates by the GP each neighbourhood uses', url: 'https://fingertips.phe.org.uk/profile/general-practice' },
  { id: 'prescribing', theme: 'health', name: 'Prescriptions per practice each month (e.g. antidepressants, painkillers)', source: 'NHSBSA English Prescribing Dataset', licence: 'OGL', command: null, level: 'GP practice', access: 'open', priority: 2, value: 'A monthly signal of mood and pain, by practice', url: 'https://opendata.nhsbsa.net/' },
  { id: 'airModel', theme: 'health', name: 'Modelled air pollution: NO2 and PM2.5 on a 1 km grid, yearly', source: 'Defra UK-AIR', licence: 'OGL', command: 'stats', file: 'stats/airModel.json', level: '1 km grid', access: 'open', priority: 1, value: 'Air quality everywhere, not only in the official management areas', url: 'https://uk-air.defra.gov.uk/data/pcm-data' },
  { id: 'noise', theme: 'health', name: 'Road and rail noise maps', source: 'Defra strategic noise mapping', licence: 'OGL', command: null, level: '10 m grid', access: 'open', priority: 2, value: 'Noise affects sleep and health; shows the cost of busy roads', url: 'https://www.data.gov.uk/search?q=strategic+noise+mapping' },
  { id: 'ahah', theme: 'health', name: 'Access to Healthy Assets and Hazards index (GPs, fast food, gambling, green space, air)', source: 'CDRC / University of Liverpool', licence: 'OGL', command: null, level: 'LSOA', access: 'open', priority: 2, value: 'A national benchmark to check our own access scores against', url: 'https://data.cdrc.ac.uk/dataset/access-healthy-assets-hazards-ahah' },
  { id: 'activity', theme: 'health', name: 'How active adults and children are', source: 'Sport England Active Lives', licence: 'OGL', command: null, level: 'council', access: 'open', priority: 3, value: 'Whether walkable places mean more active people', url: 'https://activelives.sportengland.org/' },
  { id: 'osGreenspace', theme: 'nature', name: 'Public green spaces with their entrances', source: 'OS Open Greenspace', licence: 'OGL', command: null, level: 'polygon', access: 'open', priority: 2, value: 'Better park entrances than OpenStreetMap edges', url: 'https://osdatahub.os.uk/downloads/open/OpenGreenspace' },
  { id: 'habitats', theme: 'nature', name: 'SSSIs, local nature reserves, priority habitats', source: 'Natural England', licence: 'OGL', command: null, level: 'polygon', access: 'open', priority: 2, value: 'What nature there is to protect or reach', url: 'https://naturalengland-defra.opendata.arcgis.com/' },
  { id: 'riverHealth', theme: 'nature', name: 'River health and sewage overflow spills (hours per outfall)', source: 'Environment Agency (Catchment Data Explorer, storm overflow returns)', licence: 'OGL', command: 'stats', file: 'stats/riverHealth.json', level: 'river stretch / outfall', access: 'open', priority: 1, value: 'Is the Severn swimmable; where the spills are', url: 'https://environment.data.gov.uk/catchment-planning/' },
  { id: 'heat', theme: 'nature', name: 'Surface temperature from satellite (urban heat)', source: 'USGS Landsat', licence: 'OGL', command: null, level: '30 m grid', access: 'freeAccount', priority: 3, value: 'Which streets overheat in summer; where trees would help most', url: 'https://earthexplorer.usgs.gov/' },
  { id: 'fuelPoverty', theme: 'security', name: 'Households in fuel poverty', source: 'DESNZ via OHID Fingertips Local Health', licence: 'OGL', command: 'stats', file: 'stats/localHealth.json', level: 'MSOA', access: 'open', priority: 1, value: 'Cold homes harm health; ties to deprivation and older housing', url: 'https://www.gov.uk/government/collections/fuel-poverty-sub-regional-statistics' },
  { id: 'epc', theme: 'security', name: 'Energy certificates for every rated home: insulation, heating, size', source: 'DLUHC EPC register', licence: 'OGL', command: null, level: 'address (counted per area)', access: 'freeAccount', priority: 1, value: 'Which streets need retrofit; damp and cold', url: 'https://epc.opendatacommunities.org/' },
  { id: 'childPoverty', theme: 'security', name: 'Children in low-income families', source: 'DWP', licence: 'OGL', command: 'stats', file: 'stats/childPoverty.json', level: 'ward / council', access: 'open', priority: 1, value: 'Child poverty per ward, yearly', url: 'https://www.gov.uk/government/collections/children-in-low-income-families-local-area-statistics' },
  { id: 'benefits', theme: 'security', name: 'Universal Credit, PIP and other benefits', source: 'DWP Stat-Xplore', licence: 'OGL', command: null, level: 'LSOA', access: 'freeAccount', priority: 2, value: 'Monthly, so newer than the census', url: 'https://stat-xplore.dwp.gov.uk/' },
  { id: 'claimants', theme: 'purpose', name: 'People claiming out-of-work benefits, monthly', source: 'ONS / DWP claimant count via Nomis', licence: 'OGL', command: 'stats', file: 'stats/claimants.json', level: 'LSOA', access: 'open', priority: 1, value: 'Monthly jobs pulse per neighbourhood', url: 'https://www.nomisweb.co.uk/query/select/getdatasetbytheme.asp?theme=72' },
  { id: 'homelessness', theme: 'security', name: 'Homelessness and temporary accommodation', source: 'MHCLG', licence: 'OGL', command: null, level: 'council', access: 'open', priority: 2, value: 'The sharpest housing need', url: 'https://www.gov.uk/government/collections/homelessness-statistics' },
  { id: 'foodBanks', theme: 'security', name: 'Food banks and what they need', source: 'Give Food', licence: 'OGL', command: null, level: 'point', access: 'open', priority: 2, value: 'Where food insecurity shows up', url: 'https://www.givefood.org.uk/api/' },
  { id: 'rents', theme: 'security', name: 'Private rents', source: 'ONS Price Index of Private Rents', licence: 'OGL', command: null, level: 'council', access: 'open', priority: 2, value: 'Most migrants and young people rent; prices alone miss them', url: 'https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/privaterentandhousepricesuk/latest' },
  { id: 'councilTax', theme: 'security', name: 'Homes by council tax band', source: 'VOA', licence: 'OGL', command: null, level: 'LSOA', access: 'open', priority: 3, value: 'The housing mix, street by street', url: 'https://www.gov.uk/government/collections/valuation-office-agency-council-tax-statistics' },
  { id: 'schoolResults', theme: 'purpose', name: 'School results and attendance (KS2, KS4)', source: 'DfE compare school performance (403 here); DfE statistics API has council level only', licence: 'OGL', command: null, level: 'school', access: 'open', priority: 2, value: 'How children are doing, school by school', url: 'https://www.compare-school-performance.service.gov.uk/download-data' },
  { id: 'ofsted', theme: 'purpose', name: 'Ofsted ratings: schools and childcare', source: 'Ofsted', licence: 'OGL', command: null, level: 'point', access: 'open', priority: 2, value: 'Childcare within reach matters for working parents', url: 'https://www.gov.uk/government/organisations/ofsted/about/statistics' },
  { id: 'businesses', theme: 'purpose', name: 'Businesses by size and industry', source: 'ONS UK Business Counts via Nomis', licence: 'OGL', command: null, level: 'MSOA', access: 'open', priority: 3, value: 'What work exists where', url: 'https://www.nomisweb.co.uk/query/select/getdatasetbytheme.asp?theme=93' },
  { id: 'commuteFlows', theme: 'movement', name: 'Where people commute from and to (Census 2021)', source: 'ONS origin-destination', licence: 'OGL', command: 'stats', file: 'stats/commuteFlows.json', level: 'MSOA', access: 'open', priority: 1, value: 'Real trips to test the model and the bus network against', url: 'https://www.nomisweb.co.uk/sources/census_2021_od' },
  { id: 'pct', theme: 'movement', name: 'Propensity to Cycle: how many could cycle each route', source: 'PCT (Leeds University)', licence: 'OGL', command: 'stats', file: 'stats/pct.json', level: 'route / LSOA', access: 'open', priority: 1, value: 'Which routes to make cyclist-friendly (q21)', url: 'https://www.pct.bike/' },
  { id: 'stationUse', theme: 'movement', name: 'Passengers at each railway station, yearly', source: 'ORR', licence: 'OGL', command: null, level: 'station', access: 'open', priority: 2, value: 'Foregate Street, Shrub Hill, Parkway use', url: 'https://dataportal.orr.gov.uk/statistics/usage/estimates-of-station-usage/' },
  { id: 'roadworks', theme: 'movement', name: 'Roadworks: where, when, how long', source: 'DfT Street Manager open data', licence: 'OGL', command: null, level: 'works', access: 'open', priority: 2, value: 'Confirms the diversions seen in the traffic counts', url: 'https://department-for-transport-streetmanager.github.io/street-manager-docs/open-data/' },
  { id: 'motorway', theme: 'movement', name: 'M5 speeds and flows every 15 minutes', source: 'National Highways WebTRIS', licence: 'OGL', command: null, level: 'sensor', access: 'open', priority: 3, value: 'Near-live congestion by Worcester', url: 'https://webtris.nationalhighways.co.uk/api/swagger/ui/index' },
  { id: 'evCharging', theme: 'movement', name: 'EV chargers', source: 'Open Charge Map', licence: 'OGL', command: null, level: 'point', access: 'open', priority: 3, value: 'Who can switch to electric', url: 'https://openchargemap.org/site/develop/api' },
  { id: 'movementApps', theme: 'movement', name: 'Walking and cycling trips from apps', source: 'Strava Metro (councils can apply)', licence: '—', command: null, level: 'street', access: 'notPublished', priority: 2, value: 'Real routes people choose; the council can request it free', url: null, unavailable: true },
  { id: 'footfall', theme: 'movement', name: 'High street footfall', source: 'Commercial counters; the council may hold some', licence: '—', command: null, level: 'street', access: 'notPublished', priority: 2, value: 'Visitors to the centre (q25)', url: null, unavailable: true },
  { id: 'businessRates', theme: 'land', name: 'Every shop, office and works with its rateable value', source: 'VOA rating list', licence: 'OGL', command: 'stats', file: 'stats/businessRates.json', level: 'address', access: 'open', priority: 1, value: 'Empty shops and the high street, properly counted', url: 'https://voaratinglists.blob.core.windows.net/html/rlidata.htm' },
  { id: 'landOwnership', theme: 'land', name: 'Land owned by companies and councils', source: 'HM Land Registry CCOD / OCOD', licence: 'OGL', command: null, level: 'title', access: 'freeAccount', priority: 3, value: 'Who owns empty sites like County Hall', url: 'https://use-land-property-data.service.gov.uk/datasets/ccod' },
  { id: 'titleShapes', theme: 'land', name: 'Freehold title boundaries', source: 'HM Land Registry INSPIRE', licence: 'OGL', command: null, level: 'polygon', access: 'open', priority: 3, value: 'Plot shapes for site planning', url: 'https://use-land-property-data.service.gov.uk/datasets/inspire' },
  { id: 'lidar', theme: 'land', name: 'Building heights and ground levels', source: 'Environment Agency LiDAR', licence: 'OGL', command: null, level: '1 m grid', access: 'open', priority: 3, value: 'Shade, flood paths, 3D city', url: 'https://environment.data.gov.uk/survey' },
  { id: 'localPlan', theme: 'land', name: 'South Worcestershire Development Plan site allocations', source: 'SWDP (published as PDF maps)', licence: '—', command: null, level: 'polygon', access: 'notPublished', priority: 2, value: 'What\'s already planned, to compare scenarios with', url: null, unavailable: true },
  { id: 'elections', theme: 'voice', name: 'Councillors, candidates and election results', source: 'Democracy Club', licence: 'OGL', command: null, level: 'ward', access: 'open', priority: 2, value: 'Who to take findings to, ward by ward', url: 'https://candidates.democracyclub.org.uk/api/' },
  { id: 'streetReports', theme: 'voice', name: 'Street problem reports: potholes, fly-tipping, lights', source: 'FixMyStreet (mySociety)', licence: 'OGL', command: null, level: 'point', access: 'open', priority: 2, value: 'What residents complain about, where', url: 'https://www.fixmystreet.com/' },
  { id: 'petitions', theme: 'voice', name: 'Parliament petitions, signatures by constituency', source: 'UK Parliament petitions', licence: 'OGL', command: null, level: 'constituency', access: 'open', priority: 3, value: 'What Worcester cares about nationally', url: 'https://petition.parliament.uk/' },
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
    const status = mapped ? 'mapped' : l.unavailable ? 'unavailable' : 'missing';
    return { id: l.id, theme: l.theme, name: l.name, source: l.source, licence: l.licence, status, count, date, command: l.command, level: l.level ?? null, access: l.access ?? (mapped ? 'open' : null), priority: l.priority ?? null, value: l.value ?? null, url: l.url ?? null };
  });
}
