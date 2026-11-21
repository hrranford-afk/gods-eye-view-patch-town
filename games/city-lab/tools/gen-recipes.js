/* Writes the example recipes (recipes/*.json) from a few lines of arithmetic, so the numbers fit exactly.
   This script is a developer's tool, not part of the page: the page and the tests only ever read the JSON it writes.
   Run: node tools/gen-recipes.js */
'use strict';
const fs = require('fs');
const path = require('path');
const V = require('../validate.js');

const r3 = (v) => Math.round(v * 1000) / 1000;
function P(id, kind, pos, size, material, stage, needs, tag, o) {
  const p = { id, kind, pos: pos.map(r3), size: size.map(r3), material, stage, needs: needs || [], tag, replaceable: !!(o && o.rep) };
  if (o && o.rotY != null) p.rotY = r3(o.rotY);
  if (o && o.min != null) p.needsMin = o.min;
  if (o && o.variant != null) p.variant = o.variant;
  if (o && o.label) p.label = o.label;
  return p;
}
const PI = Math.PI;

/* ---------------- the bakery ---------------- */
function bakery() {
  const parts = [], A = (p) => parts.push(p);
  const wh = 0.95, pt = 0.05;   /* wall top y, floor top y */
  A(P('floor', 'floor', [0, 0, 0], [2.4, 0.05, 1.8], 'wood_pale', 'frame', [], 'floor'));
  const posts = { fl: [-1.1, 0.8], fr: [1.1, 0.8], bl: [-1.1, -0.8], br: [1.1, -0.8] };
  Object.keys(posts).forEach((k) => A(P('post.' + k, 'post', [posts[k][0], pt, posts[k][1]], [0.08, wh - pt, 0.08], 'wood_dark', 'frame', ['floor'], 'post')));
  A(P('beam.f', 'beam', [0, wh, 0.8], [2.12, 0.07, 0.08], 'wood_dark', 'frame', ['post.fl', 'post.fr'], 'beam'));
  A(P('beam.b', 'beam', [0, wh, -0.8], [2.12, 0.07, 0.08], 'wood_dark', 'frame', ['post.bl', 'post.br'], 'beam'));
  A(P('beam.l', 'beam', [-1.1, wh, 0], [0.08, 0.07, 1.68], 'wood_dark', 'frame', ['post.fl', 'post.bl'], 'beam'));
  A(P('beam.r', 'beam', [1.1, wh, 0], [0.08, 0.07, 1.68], 'wood_dark', 'frame', ['post.fr', 'post.br'], 'beam'));
  /* walls */
  A(P('panel.f0', 'panel', [-0.625, pt, 0.8], [0.87, 0.9, 0.05], 'paint_cream', 'walls', ['beam.f'], 'wall'));
  A(P('panel.f1', 'panel', [0.625, pt, 0.8], [0.87, 0.9, 0.05], 'paint_cream', 'walls', ['beam.f'], 'wall'));
  A(P('panel.b0', 'panel', [-0.53, pt, -0.8], [1.06, 0.9, 0.05], 'paint_cream', 'walls', ['beam.b'], 'wall'));
  A(P('panel.b1', 'panel', [0.53, pt, -0.8], [1.06, 0.9, 0.05], 'paint_cream', 'walls', ['beam.b'], 'wall'));
  [['l', -1.1, 'beam.l'], ['r', 1.1, 'beam.r']].forEach((s) => [[0, -0.38], [1, 0.38]].forEach((q) => A(P('panel.' + s[0] + q[0], 'panel', [s[1], pt, q[1]], [0.76, 0.9, 0.05], 'paint_cream', 'walls', [s[2]], 'wall', { rotY: PI / 2 }))));
  A(P('door', 'door', [0, pt, 0.8], [0.38, 0.9, 0.05], 'paint_blue', 'walls', ['beam.f'], 'door', { rep: true }));
  [['0', -0.625], ['1', 0.625]].forEach((w) => A(P('window.' + w[0], 'window', [w[1], 0.3, 0.85], [0.5, 0.38, 0.05], 'wood_dark', 'walls', ['panel.f' + w[0]], 'window', { rep: true })));
  A(P('shutter.0', 'shutter', [-0.93, 0.3, 0.87], [0.12, 0.38, 0.03], 'paint_blue', 'trim', ['window.0'], 'shutter', { rep: true }));
  A(P('shutter.1', 'shutter', [0.93, 0.3, 0.87], [0.12, 0.38, 0.03], 'paint_blue', 'trim', ['window.1'], 'shutter', { rep: true }));
  A(P('gable.l', 'gable', [-1.1, 1.02, 0], [0.05, 0.5, 1.7], 'paint_cream', 'walls', ['beam.l'], 'gable', { rotY: 0 }));
  A(P('gable.r', 'gable', [1.1, 1.02, 0], [0.05, 0.5, 1.7], 'paint_cream', 'walls', ['beam.r'], 'gable'));
  /* roof: rafters on the long beams, two rows of tiles, a ridge cap */
  const cols = [-0.7, 0, 0.7];
  cols.forEach((x, i) => {
    A(P('rafter.f' + i, 'rafter', [x, 1.02, 0.475], [0.06, 0.5, 0.95], 'wood_dark', 'frame', ['beam.f'], 'rafter'));
    A(P('rafter.b' + i, 'rafter', [x, 1.02, -0.475], [0.06, 0.5, 0.95], 'wood_dark', 'frame', ['beam.b'], 'rafter', { rotY: PI }));
  });
  cols.forEach((x, i) => {
    A(P('tile.f0' + i, 'roof_tile', [x, 1.02, 0.7125], [0.7, 0.25, 0.475], 'paint_red', 'trim', ['rafter.f' + i], 'roof', { rep: true }));
    A(P('tile.f1' + i, 'roof_tile', [x, 1.27, 0.2375], [0.7, 0.25, 0.475], 'paint_red', 'trim', ['rafter.f' + i], 'roof', { rep: true }));
    A(P('tile.b0' + i, 'roof_tile', [x, 1.02, -0.7125], [0.7, 0.25, 0.475], 'paint_red', 'trim', ['rafter.b' + i], 'roof', { rep: true, rotY: PI }));
    A(P('tile.b1' + i, 'roof_tile', [x, 1.27, -0.2375], [0.7, 0.25, 0.475], 'paint_red', 'trim', ['rafter.b' + i], 'roof', { rep: true, rotY: PI }));
  });
  A(P('ridge', 'ridge', [0, 1.52, 0], [2.1, 0.06, 0.1], 'wood_dark', 'frame', ['rafter.f0', 'rafter.f1', 'rafter.f2', 'rafter.b0', 'rafter.b1', 'rafter.b2'], 'ridge', { min: 1 }));
  A(P('chimney', 'chimney', [-0.35, 1.3, -0.24], [0.3, 0.55, 0.26], 'brick', 'trim', ['tile.b10', 'tile.b11'], 'chimney', { rep: true }));
  /* front: awning and sign */
  A(P('awning', 'awning', [0, 0.72, 1.115], [2.0, 0.3, 0.55], 'canvas', 'trim', ['beam.f'], 'awning', { rep: true, variant: 1 }));
  A(P('sign', 'sign', [0.62, 0.48, 1.34], [0.6, 0.22, 0.04], 'wood_pale', 'trim', ['awning'], 'sign', { rep: true, label: 'BAKERY' }));
  /* inside */
  A(P('oven', 'oven', [-0.55, pt, -0.5], [0.7, 0.6, 0.5], 'brick', 'walls', ['floor'], 'oven', { rep: true }));
  A(P('counter', 'counter', [0.45, pt, 0.45], [1.0, 0.4, 0.3], 'wood', 'walls', ['floor'], 'counter', { rep: true }));
  A(P('sack.a', 'sack', [0.85, pt, -0.55], [0.18, 0.22, 0.14], 'flour', 'walls', ['floor'], 'sack', { rep: true }));
  A(P('sack.b', 'sack', [0.62, pt, -0.6], [0.18, 0.22, 0.14], 'flour', 'walls', ['floor'], 'sack', { rep: true }));
  A(P('sack.c', 'sack', [0.85, pt + 0.22, -0.55], [0.18, 0.22, 0.14], 'flour', 'walls', ['sack.a'], 'sack', { rep: true }));
  A(P('barrel', 'barrel', [0.3, pt, -0.6], [0.2, 0.28, 0.2], 'wood_dark', 'walls', ['floor'], 'barrel', { rep: true }));
  A(P('meter', 'meter_box', [0.3, 0.5, -0.735], [0.14, 0.2, 0.08], 'tin', 'walls', ['panel.b1'], 'meter', { rep: true }));
  A(P('wire', 'wire', [0.04, 0.62, -0.735], [0.45, 0.03, 0.03], 'iron', 'walls', ['meter'], 'wire', { rep: true }));
  /* outside: the delivery crates */
  A(P('crate.a', 'crate', [1.0, 0, 1.05], [0.2, 0.2, 0.2], 'wood', 'walls', [], 'crate', { rep: true }));
  A(P('crate.b', 'crate', [1.0, 0.2, 1.05], [0.2, 0.2, 0.2], 'wood_pale', 'walls', ['crate.a'], 'crate', { rep: true }));
  A(P('crate.c', 'crate', [0.74, 0, 1.05], [0.2, 0.2, 0.2], 'wood', 'walls', [], 'crate', { rep: true }));
  const labels = {
    floor: 'Floor slab', 'post.fl': 'Front left post', 'post.fr': 'Front right post', 'post.bl': 'Back left post', 'post.br': 'Back right post',
    'beam.f': 'Front beam', 'beam.b': 'Back beam', 'beam.l': 'Left beam', 'beam.r': 'Right beam',
    'panel.f0': 'Front wall left', 'panel.f1': 'Front wall right', 'panel.b0': 'Back wall left', 'panel.b1': 'Back wall right',
    'panel.l0': 'Left wall back', 'panel.l1': 'Left wall front', 'panel.r0': 'Right wall back', 'panel.r1': 'Right wall front',
    door: 'Shop door', 'window.0': 'Left window', 'window.1': 'Right window', 'shutter.0': 'Left shutter', 'shutter.1': 'Right shutter',
    'gable.l': 'Left gable', 'gable.r': 'Right gable', ridge: 'Roof ridge', chimney: 'Chimney', awning: 'Awning', sign: 'Shop sign',
    oven: 'Bread oven', counter: 'Sales counter', 'sack.a': 'Flour sack 1', 'sack.b': 'Flour sack 2', 'sack.c': 'Flour sack 3', barrel: 'Water barrel',
    meter: 'Meter box', wire: 'Power cable', 'crate.a': 'Delivery crate 1', 'crate.b': 'Delivery crate 2', 'crate.c': 'Delivery crate 3'
  };
  cols.forEach((x, i) => { ['f', 'b'].forEach((s) => { labels['rafter.' + s + i] = 'Rafter ' + s.toUpperCase() + (i + 1); labels['tile.' + s + '0' + i] = 'Eave tile ' + s.toUpperCase() + (i + 1); labels['tile.' + s + '1' + i] = 'Upper tile ' + s.toUpperCase() + (i + 1); }); });
  return {
    schema: 'rtk.building', version: 1, id: 'bakery', name: 'Miniature Bakery', footprint: { w: 2.4, d: 1.8 }, parts,
    systems: {
      power: { demand_kw: 6, supply_kw: 8, wire_part: 'wire', meter_part: 'meter' },
      jobs: [{ role: 'baker', count: 2, station_part: 'oven' }, { role: 'seller', count: 1, station_part: 'counter' }],
      production: { role: 'baker', inputs: { flour: 3, water: 2, fuel: 1 }, outputs: { loaf: 12 }, batch_seconds: 28, needs_power: true, needs_parts: ['oven'] },
      storage: { flour: 60, water: 40, fuel: 30, loaf: 60 },
      start_stock: { flour: 20, water: 12, fuel: 6 },
      deliveries: [
        { item: 'flour', amount: 12, every_seconds: 70, via: 'cart', drop_part: 'crate.a' },
        { item: 'water', amount: 8, every_seconds: 70, via: 'cart', drop_part: 'crate.a' },
        { item: 'fuel', amount: 4, every_seconds: 70, via: 'cart', drop_part: 'crate.a' }
      ],
      sales: { item: 'loaf', price: 4, demand_per_minute: 20, role: 'seller', noise: 0 },
      costs: { power_per_kwh: 24, wage_per_worker_per_minute: 5, ingredient_prices: { flour: 1.5, water: 0.2, fuel: 2.5 }, repair_material_price: 3 },
      repair: { seconds: 6, material_units: 2, walk_speed: 0.35, worker_roles: ['baker', 'seller'], seconds_by_tag: { oven: 20, roof: 3, awning: 8, wire: 5, meter: 5, post: 12, beam: 12 } },
      effects: { spoil: [{ tag: 'roof', items: { flour: 0.25 } }], demand: [{ tag: 'awning', loss: 0.15 }] },
      inspect: { labels }
    }
  };
}

/* ---------------- a shed ---------------- */
function shed() {
  const parts = [], A = (p) => parts.push(p);
  A(P('floor', 'floor', [0, 0, 0], [1.2, 0.05, 1.0], 'wood_pale', 'frame', [], 'floor'));
  [['fl', -0.56, 0.46], ['fr', 0.56, 0.46], ['bl', -0.56, -0.46], ['br', 0.56, -0.46]].forEach((q) => A(P('post.' + q[0], 'post', [q[1], 0.05, q[2]], [0.08, 0.75, 0.08], 'wood_dark', 'frame', ['floor'], 'post')));
  A(P('beam.f', 'beam', [0, 0.75, 0.46], [1.04, 0.07, 0.08], 'wood_dark', 'frame', ['post.fl', 'post.fr'], 'beam'));
  A(P('beam.b', 'beam', [0, 0.75, -0.46], [1.04, 0.07, 0.08], 'wood_dark', 'frame', ['post.bl', 'post.br'], 'beam'));
  A(P('beam.l', 'beam', [-0.56, 0.75, 0], [0.08, 0.07, 1.0], 'wood_dark', 'frame', ['post.fl', 'post.bl'], 'beam'));
  A(P('beam.r', 'beam', [0.56, 0.75, 0], [0.08, 0.07, 1.0], 'wood_dark', 'frame', ['post.fr', 'post.br'], 'beam'));
  A(P('panel.b', 'panel', [0, 0.05, -0.46], [1.04, 0.7, 0.05], 'wood', 'walls', ['beam.b'], 'wall'));
  A(P('panel.l', 'panel', [-0.56, 0.05, 0], [0.84, 0.7, 0.05], 'wood', 'walls', ['beam.l'], 'wall', { rotY: PI / 2 }));
  A(P('panel.r', 'panel', [0.56, 0.05, 0], [0.84, 0.7, 0.05], 'wood', 'walls', ['beam.r'], 'wall', { rotY: PI / 2 }));
  A(P('door', 'door', [0, 0.05, 0.46], [0.5, 0.7, 0.05], 'paint_red', 'walls', ['beam.f'], 'door', { rep: true }));
  A(P('panel.f0', 'panel', [-0.385, 0.05, 0.46], [0.27, 0.7, 0.05], 'wood', 'walls', ['beam.f'], 'wall'));
  A(P('panel.f1', 'panel', [0.385, 0.05, 0.46], [0.27, 0.7, 0.05], 'wood', 'walls', ['beam.f'], 'wall'));
  A(P('rafter.f', 'rafter', [0, 0.82, 0.25], [0.08, 0.2, 0.5], 'wood_dark', 'frame', ['beam.f'], 'rafter'));
  A(P('rafter.b', 'rafter', [0, 0.82, -0.25], [0.08, 0.2, 0.5], 'wood_dark', 'frame', ['beam.b'], 'rafter', { rotY: PI }));
  A(P('tile.f', 'roof_tile', [0, 0.82, 0.25], [1.1, 0.2, 0.5], 'tin', 'trim', ['rafter.f'], 'roof', { rep: true }));
  A(P('tile.b', 'roof_tile', [0, 0.82, -0.25], [1.1, 0.2, 0.5], 'tin', 'trim', ['rafter.b'], 'roof', { rep: true, rotY: PI }));
  A(P('crate.a', 'crate', [-0.3, 0.05, -0.25], [0.2, 0.2, 0.2], 'wood', 'walls', ['floor'], 'crate', { rep: true }));
  A(P('crate.b', 'crate', [-0.3, 0.25, -0.25], [0.2, 0.2, 0.2], 'wood_pale', 'walls', ['crate.a'], 'crate', { rep: true }));
  A(P('barrel', 'barrel', [0.3, 0.05, -0.25], [0.2, 0.28, 0.2], 'wood_dark', 'walls', ['floor'], 'barrel', { rep: true }));
  return {
    schema: 'rtk.building', version: 1, id: 'shed', name: 'Garden Shed', footprint: { w: 1.2, d: 1.0 }, parts,
    systems: {
      jobs: [], storage: { tool: 20 }, start_stock: { tool: 8 },
      costs: { power_per_kwh: 0, wage_per_worker_per_minute: 0, ingredient_prices: {}, repair_material_price: 2 },
      repair: { seconds: 5, material_units: 1, walk_speed: 0.3, worker_roles: [] },
      inspect: { labels: { floor: 'Floor', door: 'Shed door', 'tile.f': 'Front roof', 'tile.b': 'Back roof', barrel: 'Barrel' } }
    }
  };
}

/* ---------------- a cart stall (apples) ---------------- */
function stall() {
  const parts = [], A = (p) => parts.push(p);
  A(P('bed', 'floor', [0, 0, 0], [1.4, 0.05, 0.7], 'wood', 'frame', [], 'floor'));
  A(P('post.l', 'post', [-0.6, 0.05, -0.25], [0.07, 0.7, 0.07], 'wood_dark', 'frame', ['bed'], 'post'));
  A(P('post.r', 'post', [0.6, 0.05, -0.25], [0.07, 0.7, 0.07], 'wood_dark', 'frame', ['bed'], 'post'));
  A(P('beam', 'beam', [0, 0.75, -0.25], [1.27, 0.07, 0.07], 'wood_dark', 'frame', ['post.l', 'post.r'], 'beam'));
  A(P('back', 'panel', [0, 0.05, -0.31], [1.27, 0.7, 0.04], 'paint_blue', 'walls', ['post.l', 'post.r'], 'wall', { min: 1 }));
  A(P('counter', 'counter', [0, 0.05, 0.05], [1.2, 0.3, 0.3], 'wood_pale', 'walls', ['bed'], 'counter', { rep: true }));
  A(P('awning', 'awning', [0, 0.82, 0.1], [1.5, 0.3, 0.7], 'canvas', 'trim', ['beam'], 'awning', { rep: true, variant: 2 }));
  A(P('sign', 'sign', [0, 0.6, 0.45], [0.6, 0.2, 0.04], 'wood_pale', 'trim', ['awning'], 'sign', { rep: true, label: 'APPLES' }));
  A(P('crate.a', 'crate', [-0.45, 0.35, 0.05], [0.2, 0.2, 0.2], 'wood', 'walls', ['counter'], 'crate', { rep: true }));
  A(P('crate.b', 'crate', [0.45, 0.35, 0.05], [0.2, 0.2, 0.2], 'wood', 'walls', ['counter'], 'crate', { rep: true }));
  A(P('sack', 'sack', [0.0, 0.35, 0.05], [0.18, 0.22, 0.14], 'flour', 'walls', ['counter'], 'sack', { rep: true }));
  A(P('barrel', 'barrel', [0.85, 0, 0.1], [0.2, 0.28, 0.2], 'wood_dark', 'walls', [], 'barrel', { rep: true }));
  return {
    schema: 'rtk.building', version: 1, id: 'cart_stall', name: 'Apple Cart Stall', footprint: { w: 1.4, d: 0.7 }, parts,
    systems: {
      jobs: [{ role: 'seller', count: 1, station_part: 'counter' }],
      storage: { apple: 30 }, start_stock: { apple: 12 },
      deliveries: [{ item: 'apple', amount: 10, every_seconds: 60, via: 'cart', drop_part: 'barrel' }],
      sales: { item: 'apple', price: 2, demand_per_minute: 9, role: 'seller', noise: 0 },
      costs: { power_per_kwh: 0, wage_per_worker_per_minute: 3, ingredient_prices: { apple: 0.8 }, repair_material_price: 2 },
      repair: { seconds: 5, material_units: 1, walk_speed: 0.3, worker_roles: ['seller'] },
      effects: { demand: [{ tag: 'awning', loss: 0.2 }] },
      inspect: { labels: { counter: 'Sales counter', awning: 'Awning', sign: 'Apple sign', barrel: 'Cart barrel' } }
    }
  };
}

/* ---------------- a house ---------------- */
function house() {
  const parts = [], A = (p) => parts.push(p);
  A(P('floor', 'floor', [0, 0, 0], [1.6, 0.05, 1.2], 'wood_pale', 'frame', [], 'floor'));
  [['fl', -0.76, 0.56], ['fr', 0.76, 0.56], ['bl', -0.76, -0.56], ['br', 0.76, -0.56]].forEach((q) => A(P('post.' + q[0], 'post', [q[1], 0.05, q[2]], [0.08, 0.85, 0.08], 'wood_dark', 'frame', ['floor'], 'post')));
  A(P('beam.f', 'beam', [0, 0.85, 0.56], [1.44, 0.07, 0.08], 'wood_dark', 'frame', ['post.fl', 'post.fr'], 'beam'));
  A(P('beam.b', 'beam', [0, 0.85, -0.56], [1.44, 0.07, 0.08], 'wood_dark', 'frame', ['post.bl', 'post.br'], 'beam'));
  A(P('beam.l', 'beam', [-0.76, 0.85, 0], [0.08, 0.07, 1.2], 'wood_dark', 'frame', ['post.fl', 'post.bl'], 'beam'));
  A(P('beam.r', 'beam', [0.76, 0.85, 0], [0.08, 0.07, 1.2], 'wood_dark', 'frame', ['post.fr', 'post.br'], 'beam'));
  A(P('panel.b', 'panel', [0, 0.05, -0.56], [1.44, 0.8, 0.05], 'paint_cream', 'walls', ['beam.b'], 'wall'));
  A(P('panel.l', 'panel', [-0.76, 0.05, 0], [1.04, 0.8, 0.05], 'paint_cream', 'walls', ['beam.l'], 'wall', { rotY: PI / 2 }));
  A(P('panel.r', 'panel', [0.76, 0.05, 0], [1.04, 0.8, 0.05], 'paint_cream', 'walls', ['beam.r'], 'wall', { rotY: PI / 2 }));
  A(P('panel.f0', 'panel', [-0.5, 0.05, 0.56], [0.44, 0.8, 0.05], 'paint_cream', 'walls', ['beam.f'], 'wall'));
  A(P('panel.f1', 'panel', [0.5, 0.05, 0.56], [0.44, 0.8, 0.05], 'paint_cream', 'walls', ['beam.f'], 'wall'));
  A(P('door', 'door', [0, 0.05, 0.56], [0.56, 0.8, 0.05], 'paint_blue', 'walls', ['beam.f'], 'door', { rep: true }));
  A(P('window', 'window', [-0.5, 0.3, 0.61], [0.34, 0.32, 0.05], 'wood_dark', 'walls', ['panel.f0'], 'window', { rep: true }));
  A(P('shutter.a', 'shutter', [-0.72, 0.3, 0.63], [0.1, 0.32, 0.03], 'paint_red', 'trim', ['window'], 'shutter', { rep: true }));
  A(P('shutter.b', 'shutter', [-0.28, 0.3, 0.63], [0.1, 0.32, 0.03], 'paint_red', 'trim', ['window'], 'shutter', { rep: true }));
  A(P('rafter.f', 'rafter', [0, 0.92, 0.3], [0.08, 0.42, 0.6], 'wood_dark', 'frame', ['beam.f'], 'rafter'));
  A(P('rafter.b', 'rafter', [0, 0.92, -0.3], [0.08, 0.42, 0.6], 'wood_dark', 'frame', ['beam.b'], 'rafter', { rotY: PI }));
  A(P('tile.f', 'roof_tile', [0, 0.92, 0.3], [1.4, 0.42, 0.6], 'paint_blue', 'trim', ['rafter.f'], 'roof', { rep: true }));
  A(P('tile.b', 'roof_tile', [0, 0.92, -0.3], [1.4, 0.42, 0.6], 'paint_blue', 'trim', ['rafter.b'], 'roof', { rep: true, rotY: PI }));
  A(P('chimney', 'chimney', [0.5, 1.12, -0.3], [0.2, 0.5, 0.2], 'brick', 'trim', ['tile.b'], 'chimney', { rep: true }));
  A(P('meter', 'meter_box', [0.4, 0.45, -0.51], [0.14, 0.2, 0.08], 'tin', 'walls', ['panel.b'], 'meter', { rep: true }));
  A(P('wire', 'wire', [0.15, 0.55, -0.51], [0.4, 0.03, 0.03], 'iron', 'walls', ['meter'], 'wire', { rep: true }));
  return {
    schema: 'rtk.building', version: 1, id: 'house', name: 'Small House', footprint: { w: 1.6, d: 1.2 }, parts,
    systems: {
      power: { demand_kw: 0.4, supply_kw: 2, wire_part: 'wire', meter_part: 'meter' },
      jobs: [], storage: { coal: 20 }, start_stock: { coal: 10 },
      costs: { power_per_kwh: 24, wage_per_worker_per_minute: 0, ingredient_prices: { coal: 1 }, repair_material_price: 2 },
      repair: { seconds: 5, material_units: 1, walk_speed: 0.3, worker_roles: [] },
      inspect: { labels: { door: 'Front door', chimney: 'Chimney', meter: 'Meter box', wire: 'Cable' } }
    }
  };
}

const out = path.join(__dirname, '..', 'recipes');
let bad = 0;
[['bakery', bakery()], ['shed', shed()], ['cart_stall', stall()], ['house', house()]].forEach(([n, r]) => {
  const v = V.validate(r);
  if (!v.ok) { bad++; console.log('INVALID ' + n); v.errors.slice(0, 30).forEach((e) => console.log('  ' + e)); } else console.log('ok ' + n + ' (' + r.parts.length + ' parts)');
  fs.writeFileSync(path.join(out, n + '.json'), JSON.stringify(r, null, 1) + '\n');
});
process.exit(bad ? 1 : 0);
