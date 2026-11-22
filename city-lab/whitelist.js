/* City Lab: the whitelist. Plain data, no THREE, runs in Node and in the browser.
   A recipe may only name part kinds and materials that are listed here. The builders for the kinds live in parts.js (normal code, never data). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CityWhitelist = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  /* size is [w, h, d] in table units (a mouse is about 0.3 tall). slope: the part is a sloped piece inside its box:
     at rotY 0 it faces +z, so it is high at the back (-z) and low at the front (+z). ground: may stand on the ground without needs. */
  var KINDS = {
    floor:      { size: [2.4, 0.05, 1.8], note: 'floor slab', ground: true },
    post:       { size: [0.08, 1.0, 0.08], note: 'frame post', ground: true },
    beam:       { size: [1.0, 0.07, 0.08], note: 'frame beam' },
    panel:      { size: [0.6, 0.9, 0.05], note: 'wall panel' },
    door:       { size: [0.34, 0.65, 0.05], note: 'door' },
    window:     { size: [0.3, 0.28, 0.05], note: 'window frame' },
    shutter:    { size: [0.14, 0.28, 0.03], note: 'shutter' },
    rafter:     { size: [0.06, 0.5, 0.9], note: 'roof rafter', slope: true },
    roof_tile:  { size: [0.3, 0.12, 0.3], note: 'roof tile', slope: true },
    ridge:      { size: [1.0, 0.06, 0.1], note: 'roof ridge cap' },
    gable:      { size: [0.05, 0.5, 1.7], note: 'gable end', slope: true },
    chimney:    { size: [0.16, 0.5, 0.16], note: 'chimney' },
    awning:     { size: [1.2, 0.25, 0.5], note: 'awning', slope: true },
    sign:       { size: [0.6, 0.2, 0.04], note: 'sign board' },
    crate:      { size: [0.2, 0.2, 0.2], note: 'crate' },
    sack:       { size: [0.18, 0.22, 0.14], note: 'sack' },
    oven:       { size: [0.6, 0.55, 0.5], note: 'oven' },
    counter:    { size: [1.0, 0.4, 0.3], note: 'counter' },
    wire:       { size: [0.8, 0.03, 0.03], note: 'power cable' },
    meter_box:  { size: [0.14, 0.2, 0.08], note: 'meter box' },
    barrel:     { size: [0.2, 0.28, 0.2], note: 'barrel' },
    shelf:      { size: [0.6, 0.05, 0.2], note: 'shelf' }
  };
  /* atlas material names: each is a tile and a colour of the toy library's texture atlas (parts.js holds the tile and colour) */
  var MATERIALS = ['wood', 'wood_dark', 'wood_pale', 'paint_cream', 'paint_blue', 'paint_red', 'tin', 'brick', 'canvas',
    'flour', 'bread', 'iron', 'glass', 'stone'];
  var STAGES = ['trim', 'walls', 'frame'];
  var LIMITS = {
    maxText: 400000, maxDepth: 12, maxParts: 120, minParts: 1, idRe: '^[a-z][a-z0-9_.-]{0,31}$', itemRe: '^[a-z][a-z_]{0,23}$',
    maxStr: 80, maxLabel: 40, maxItems: 12, maxJobs: 8, maxDeliveries: 12, maxNeeds: 12,
    footprintMin: 0.4, footprintMax: 4.0, sizeMin: 0.01, sizeMax: 4.0, posMax: 5.0, margin: 0.9,
    overlapTol: 0.02, contactTol: 0.04, groundTol: 0.03, maxRounds: 14
  };
  return { KINDS: KINDS, MATERIALS: MATERIALS, STAGES: STAGES, LIMITS: LIMITS };
});
