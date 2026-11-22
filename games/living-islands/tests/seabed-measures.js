/* Per-seed MEASURES from seabed.js (pure, node only, no browser). Usage: node tests/seabed-measures.js [md=1] [seeds=1122,1,2,...]
   Prints a table: land %, gaps/sand links/channels, channels with a sill under 1.2 m, deepest hole, fastest stream and where, landing sites (distances from the start island, minutes per tide a work boat can land at the best one),
   seal haul-outs, skerries, kelp area, sheltered coves (near the start), dry flat at the start landing. */
import '../seabed.js';
const SB = globalThis.LI_SEABED;
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=').slice(1).join('=');
const seeds = (arg('seeds') || '1122,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20').split(',').map(Number);
export function table(seedList) {
  const rows = [];
  for (const s of seedList) { const sb = SB.create(SB.layoutForSeed(s), s), M = sb.measures(); rows.push(M); }
  return rows;
}
const rows = table(seeds);
const cols = [['seed', M => M.seed], ['isl', M => M.islands], ['land%', M => (M.landFraction * 100).toFixed(1)], ['gaps', M => M.gaps], ['links', M => M.bars], ['chan', M => M.channels], ['shoal chan', M => M.shallowSills + '/' + M.channels], ['hole m', M => M.deepestHole],
  ['fastest m/s', M => M.fastest + ' @' + M.fastestAt.map(Math.round).join(',')], ['land sites', M => M.landingCandidates], ['site dist m', M => M.landingDistances.map(Math.round).join(' ')], ['haul', M => M.haulOuts], ['skerry', M => M.skerries], ['kelp m2', M => M.kelpArea], ['coves(near)', M => M.coves + '(' + M.covesNearStart + ')'], ['dry flat m', M => M.dryFlatAtLanding], ['win row/sail/work min', M => `${M.landing.windowMin.row}/${M.landing.windowMin.sail}/${M.landing.windowMin.work}`]];
if (arg('md') === '1') { console.log('| ' + cols.map(c => c[0]).join(' | ') + ' |'); console.log('|' + cols.map(() => '---').join('|') + '|'); for (const M of rows) console.log('| ' + cols.map(c => c[1](M)).join(' | ') + ' |'); }
else { console.log(cols.map(c => c[0]).join('\t')); for (const M of rows) console.log(cols.map(c => c[1](M)).join('\t')); }
