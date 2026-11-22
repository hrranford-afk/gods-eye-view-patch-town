/* foundry/lib/cache.mjs -- results cached by a recipe key = hash(seed, size, cell, overrides, game terrain hash, hash of the generator + metric code).
   A hit costs one small file read. The cache stores the summary, the manifest (whose own hash is inside) and a deflated thumbnail. Not committed. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { HERE, gameCore, sha } from './world.mjs';
import { cellFor } from './analyze.mjs';

export const CACHE_DIR = process.env.FOUNDRY_CACHE || path.resolve(HERE, '../.cache');
let _code = null;
export function codeHash() {
  if (_code) return _code;
  const files = ['world.mjs', 'analyze.mjs', 'metrics.mjs', 'render.mjs', 'seedrun.mjs'];
  _code = sha(files.map((f) => fs.readFileSync(path.join(HERE, f), 'utf8')).join('\n') + gameCore().sourceHash);
  return _code;
}
export function recipeKey(seed, size, opts = {}) { return sha(JSON.stringify({ seed: seed >>> 0, size, cell: opts.cell || cellFor(size), over: opts.over || null, code: codeHash() }), 20); }
export function readCache(key) {
  try { const j = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, key + '.json'), 'utf8')); const t = zlib.inflateSync(fs.readFileSync(path.join(CACHE_DIR, key + '.thumb'))); return { ...j, thumb: { w: 240, h: 240, rgb: new Uint8Array(t) } }; } catch { return null; }
}
export function writeCache(key, entry, thumb) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, key + '.thumb'), zlib.deflateSync(Buffer.from(thumb.rgb), { level: 6 }));
  fs.writeFileSync(path.join(CACHE_DIR, key + '.json'), JSON.stringify(entry));
}
