/**
 * Towns the planner knows about. To add one, copy an entry: `bbox` is
 * [south, west, north, east] in degrees and should cover the built-up area
 * plus a little margin so edge homes can still reach services outside it.
 */
export const TOWNS = Object.freeze({
  worcester: Object.freeze({
    id: 'worcester',
    name: 'Worcester',
    bbox: Object.freeze([52.155, -2.285, 52.235, -2.155]),
  }),
  kidderminster: Object.freeze({
    id: 'kidderminster',
    name: 'Kidderminster',
    bbox: Object.freeze([52.355, -2.29, 52.415, -2.2]),
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
