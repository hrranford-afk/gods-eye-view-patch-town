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
 * town, for sources that only give an address (business rates).
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
  }),
  kidderminster: Object.freeze({
    id: 'kidderminster',
    ladCode: 'E07000239', // Wyre Forest District Council
    countyCode: 'E10000034', // Worcestershire
    name: 'Kidderminster',
    bbox: Object.freeze([52.355, -2.29, 52.415, -2.2]),
    postcodeDistricts: Object.freeze(['DY10', 'DY11']),
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
