/**
 * Statistics files: one shape for every source that gives figures per area,
 * so a new source needs a fetcher and nothing else to reach every tool.
 *
 * public/planner/<town>/stats/<id>.json:
 *   { id, source, licence, level, period,
 *     fields:  { name: what it measures },
 *     byArea:  { LSOA code: { field: value } },   figures per neighbourhood
 *     council: { field: value } | null }          figures for the whole council
 *
 * Sources published for bigger areas (MSOA, ward) are spread to their
 * neighbourhoods when fetched, so each LSOA carries its MSOA's figure;
 * `level` records how fine the figure really is.
 */

/** Copy every stats file's figures onto the areas. Returns the council figures by source. */
export function attachStats(areas, stats = []) {
  const council = {};
  for (const s of stats) {
    for (const a of areas) {
      const row = s.byArea?.[a.code];
      if (row) Object.assign(a, row);
    }
    if (s.council) council[s.id] = s.council;
  }
  return council;
}

/**
 * Spread figures published per MSOA (or any area named "<council> <number>")
 * to the LSOAs inside it: LSOA "Worcester 004B" sits in MSOA "Worcester 004".
 */
export function spreadToLsoas(areas, byMsoaName) {
  const byArea = {};
  for (const a of areas) {
    const row = byMsoaName[a.name.slice(0, -1)];
    if (row) byArea[a.code] = { ...row };
  }
  return byArea;
}

/** Fields across all stats files, with what each measures and its source. */
export function statsFields(stats = []) {
  const out = {};
  for (const s of stats) for (const [f, about] of Object.entries(s.fields || {})) out[f] = { about, source: s.id, level: s.level, period: s.period };
  return out;
}
