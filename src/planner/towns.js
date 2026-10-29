/**
 * Towns the planner knows about. To add one, copy an entry: `bbox` is
 * [south, west, north, east] in degrees and should cover the built-up area
 * plus a little margin so edge homes can still reach services outside it.
 * `nhsPracticePrefix` is the first letters of the area's GP practice codes
 * (ODS codes; M81 = Worcestershire), used by `npm run planner -- gps`.
 * `fsaAuthorities` are Food Standards Agency local authority ids covering the
 * town (see https://api.ratings.food.gov.uk/Authorities), for `food`.
 * `ladCode` and `countyCode` are the council and county (ONS codes), for
 * figures only published at those levels. `postcodeDistricts` cover the
 * town, for sources that only give an address (business rates). `county`
 * is the county as Land Registry writes it (town names repeat: Worcester
 * Park). `osmExtract` is the Geofabrik extract and `busRegion` the Bus Open
 * Data region, for the PBF and GTFS fallbacks.
 */
export const TOWNS = Object.freeze({
  worcester: Object.freeze({
    id: 'worcester',
    ladCode: 'E07000237', // Worcester City Council
    countyCode: 'E10000034', // Worcestershire
    name: 'Worcester',
    bbox: Object.freeze([52.155, -2.285, 52.235, -2.155]),
    nhsPracticePrefix: 'M81',
    fsaAuthorities: Object.freeze([358, 359, 356]), // Worcester City, Wychavon, Malvern Hills
    postcodeDistricts: Object.freeze(['WR1', 'WR2', 'WR3', 'WR4', 'WR5']),
    county: 'WORCESTERSHIRE',
    educationAuthority: 'Worcestershire',
    osmExtract: 'europe/united-kingdom/england/worcestershire',
    busRegion: 'west_midlands',
  }),
  gloucester: Object.freeze({
    id: 'gloucester',
    ladCode: 'E07000081', // Gloucester City Council
    countyCode: 'E10000013', // Gloucestershire
    county: 'GLOUCESTERSHIRE', // as Land Registry writes it
    educationAuthority: 'Gloucestershire',
    name: 'Gloucester',
    bbox: Object.freeze([51.81, -2.32, 51.895, -2.17]),
    nhsPracticePrefix: 'L84',
    fsaAuthorities: Object.freeze([313, 315, 314]), // Gloucester City, Tewkesbury, Stroud
    postcodeDistricts: Object.freeze(['GL1', 'GL2', 'GL3', 'GL4']),
    osmExtract: 'europe/united-kingdom/england/gloucestershire',
    busRegion: 'south_west',
  }),
  cheltenham: Object.freeze({
    id: 'cheltenham',
    ladCode: 'E07000078', // Cheltenham Borough Council
    countyCode: 'E10000013', // Gloucestershire
    county: 'GLOUCESTERSHIRE',
    educationAuthority: 'Gloucestershire',
    name: 'Cheltenham',
    bbox: Object.freeze([51.865, -2.135, 51.935, -2.02]),
    nhsPracticePrefix: 'L84',
    fsaAuthorities: Object.freeze([310, 315]), // Cheltenham, Tewkesbury
    postcodeDistricts: Object.freeze(['GL50', 'GL51', 'GL52', 'GL53']),
    osmExtract: 'europe/united-kingdom/england/gloucestershire',
    busRegion: 'south_west',
  }),
  kidderminster: Object.freeze({
    id: 'kidderminster',
    ladCode: 'E07000239', // Wyre Forest District Council
    countyCode: 'E10000034', // Worcestershire
    name: 'Kidderminster',
    bbox: Object.freeze([52.355, -2.29, 52.415, -2.2]),
    postcodeDistricts: Object.freeze(['DY10', 'DY11']),
    county: 'WORCESTERSHIRE',
    educationAuthority: 'Worcestershire',
    nhsPracticePrefix: 'M81',
  }),
});

/** Look up a town by id, throwing a readable error listing the known ids. */
export function getTown(id) {
  const town = TOWNS[String(id || '').toLowerCase()];
  if (!town) {
    throw new Error(`Unknown town "${id}". Known towns: ${Object.keys(TOWNS).join(', ')}`);
  }
  return town;
}
