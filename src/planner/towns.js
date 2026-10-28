/**
 * Towns the planner knows about. To add one, copy an entry: `bbox` is
 * [south, west, north, east] in degrees and should cover the built-up area
 * plus a little margin so edge homes can still reach services outside it.
 * `nhsPracticePrefix` is the first letters of the area's GP practice codes
 * (ODS codes; M81 = Worcestershire), used by `npm run planner -- gps`.
 * `fsaAuthorities` are Food Standards Agency local authority ids covering the
 * town (see https://api.ratings.food.gov.uk/Authorities), for `food`.
 */
export const TOWNS = Object.freeze({
  worcester: Object.freeze({
    id: 'worcester',
    name: 'Worcester',
    bbox: Object.freeze([52.155, -2.285, 52.235, -2.155]),
    nhsPracticePrefix: 'M81',
    fsaAuthorities: Object.freeze([358, 359, 356]), // Worcester City, Wychavon, Malvern Hills
  }),
  kidderminster: Object.freeze({
    id: 'kidderminster',
    name: 'Kidderminster',
    bbox: Object.freeze([52.355, -2.29, 52.415, -2.2]),
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
